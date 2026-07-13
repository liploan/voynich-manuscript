// Project Voynich Anti-Gravity Sandbox Logic
document.addEventListener('DOMContentLoaded', () => {
  // --- State Variables ---
  let statsData = null;
  let vocabularyData = [];
  let tokenSequenceData = [];
  
  let documents = {}; // folio -> word tokens list
  let docFreqs = {}; // word -> doc count
  let tfIdfVectors = {}; // folio -> tf-idf weight vector dict
  
  let activeFolio = '2r';
  let isAntiGravity = false;
  let isDiacriticsMode = true;
  let similarityGravityScale = 1.0;
  
  const vocabMorphMap = {}; // word -> { prefix, root, suffix }
  const folioTokens = {}; // folio -> list of tokens with positions
  
  // Matter.js modules
  const { Engine, World, Bodies, Body, Composite, Constraint, Mouse, MouseConstraint, Events, Vector } = Matter;
  
  let engine, world, runner;
  let canvas, ctx;
  let mouseConstraint;
  
  // Lists to track physics bodies & sync to DOM
  let wordBodies = []; // list of { prefixBody, rootBody, suffixBody, constraints, element, word }
  let sheetBodies = []; // list of { body, element, folio, stainType, edge, snapConstraint, partner }
  
  // Maps to associate DOM elements to Matter.js bodies
  const bodiesMap = {};
  
  // DOM selectors
  const folioSelector = document.getElementById('folio-selector');
  const sheetsDropdownBtn = document.getElementById('sheets-dropdown-btn');
  const sheetsDropdown = document.getElementById('sheets-dropdown');
  const sheetsCheckboxList = document.getElementById('sheets-checkbox-list');
  const spawnSheetsBtn = document.getElementById('spawn-sheets-btn');
  const similarityGravitySlider = document.getElementById('similarity-gravity-slider');
  const similarityGravityVal = document.getElementById('similarity-gravity-val');
  const antigravitySwitch = document.getElementById('antigravity-switch');
  
  const entropyActiveVal = document.getElementById('entropy-active-val');
  const entropyProgressBar = document.getElementById('entropy-progress-bar');
  
  const alignInputVms = document.getElementById('align-input-vms');
  const alignInputNat = document.getElementById('align-input-nat');
  const alignBtn = document.getElementById('align-btn');
  const diacriticsSwitch = document.getElementById('diacritics-switch');
  const alignmentOutputContainer = document.getElementById('alignment-output-container');
  const alignmentScore = document.getElementById('alignment-score');
  const alignmentVisualGrid = document.getElementById('alignment-visual-grid');
  
  const linePositionQuirks = document.getElementById('line-position-quirks');
  const burstinessList = document.getElementById('burstiness-list');
  const overlayContainer = document.getElementById('physics-overlay-container');

  // Conjunct bifolia sheets mapping (Page folds with complementary water stains)
  const bifoliaPartners = {
    '1r': '8v', '1v': '8r',
    '2r': '7v', '2v': '7r',
    '3r': '6v', '3v': '6r',
    '4r': '5v', '4v': '5r',
    '9r': '16v', '9v': '16r',
    '10r': '15v', '10v': '15r',
    '11r': '14v', '11v': '14r',
    '12r': '13v', '12v': '13r'
  };

  // Water stain procedural classes / icons mapped to partner sets
  const waterStains = {
    '1r': { type: 'wave', side: 'right' }, '8v': { type: 'wave', side: 'left' },
    '1v': { type: 'wave', side: 'left' }, '8r': { type: 'wave', side: 'right' },
    '2r': { type: 'crescent', side: 'right' }, '7v': { type: 'crescent', side: 'left' },
    '2v': { type: 'crescent', side: 'left' }, '7r': { type: 'crescent', side: 'right' },
    '3r': { type: 'jagged', side: 'right' }, '6v': { type: 'jagged', side: 'left' },
    '3v': { type: 'jagged', side: 'left' }, '6r': { type: 'jagged', side: 'right' },
    '4r': { type: 'blob', side: 'right' }, '5v': { type: 'blob', side: 'left' },
    '4v': { type: 'blob', side: 'left' }, '5r': { type: 'blob', side: 'right' }
  };

  // --- Initial Data Load ---
  Promise.all([
    fetch('voynich_stats.json').then(r => r.json()),
    fetch('voynich_vocabulary.csv').then(r => r.text()),
    fetch('voynich_token_sequence.csv').then(r => r.text())
  ]).then(([stats, vocabCsv, seqCsv]) => {
    statsData = stats;
    vocabularyData = parseCSV(vocabCsv);
    tokenSequenceData = parseCSV(seqCsv);
    
    processData();
    initPhysics();
    initUI();
  }).catch(err => {
    console.error("Error loading resources:", err);
    alert("Please run the local web server inside the workspace to access data files.");
  });

  // --- CSV Parser helper ---
  function parseCSV(text) {
    const lines = text.split('\n');
    if (lines.length === 0) return [];
    
    // Split header and clean empty quotes/carriage returns
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const results = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = [];
      let currentVal = '';
      let insideQuote = false;
      
      // Parse commas while respecting quotes
      for (let charIdx = 0; charIdx < line.length; charIdx++) {
        const c = line[charIdx];
        if (c === '"') {
          insideQuote = !insideQuote;
        } else if (c === ',' && !insideQuote) {
          cols.push(currentVal.trim().replace(/^["']|["']$/g, ''));
          currentVal = '';
        } else {
          currentVal += c;
        }
      }
      cols.push(currentVal.trim().replace(/^["']|["']$/g, ''));
      
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = cols[idx] || "";
      });
      results.push(obj);
    }
    return results;
  }

  // --- Process & Structurize Data ---
  function processData() {
    // 1. Build morphological splitter map
    vocabularyData.forEach(item => {
      const word = item.eva_word.toLowerCase();
      vocabMorphMap[word] = {
        prefix: item.morphology_prefix,
        root: item.morphological_root,
        suffix: item.morphological_suffix
      };
    });

    // 2. Build token sequences by folio
    tokenSequenceData.forEach(item => {
      const folio = item.folio.replace(/^f/, ''); // standardize to match stats keys (e.g. '2r')
      if (!folioTokens[folio]) {
        folioTokens[folio] = [];
      }
      folioTokens[folio].push(item);
    });

    // 3. Document vectors construction
    Object.keys(statsData.folios).forEach(folio => {
      const lines = statsData.folios[folio];
      const wordList = [];
      lines.forEach(line => {
        if (line.eva) {
          line.eva.replace(/,/g, ' ').replace(/\./g, ' ').split(/\s+/).forEach(w => {
            if (w) wordList.push(w.toLowerCase());
          });
        }
      });
      if (wordList.length > 0) {
        documents[folio] = wordList;
      }
    });

    // Document frequencies (DF)
    Object.values(documents).forEach(wordList => {
      const unique = new Set(wordList);
      unique.forEach(w => {
        docFreqs[w] = (docFreqs[w] || 0) + 1;
      });
    });

    // Pairwise TF-IDF vectors
    const numDocs = Object.keys(documents).length;
    Object.keys(documents).forEach(folio => {
      const wordList = documents[folio];
      const counts = {};
      wordList.forEach(w => counts[w] = (counts[w] || 0) + 1);
      
      const vector = {};
      Object.keys(counts).forEach(w => {
        const tf = counts[w] / wordList.length;
        const idf = Math.log(1 + numDocs / (docFreqs[w] || 1));
        vector[w] = tf * idf;
      });
      tfIdfVectors[folio] = vector;
    });
  }

  // --- Morphological split engine ---
  function splitWord(word) {
    const w = word.toLowerCase();
    
    // Check database first
    if (vocabMorphMap[w]) {
      return vocabMorphMap[w];
    }
    
    // Rule-based backup split if not in CSV database
    const prefixes = ['qok', 'qoc', 'qot', 'qop', 'qo', 'o', 'y', 'd', 't', 'k', 's', 'ch'];
    const suffixes = ['lky', 'rky', 'dy', 'ty', 'ny', 'ky', 'y', 'm', 'r', 'g', 'n', 'sh', 'al', 'ol'];
    
    let prefix = "";
    let suffix = "";
    let root = w;
    
    for (let p of prefixes) {
      if (root.startsWith(p) && root.length > p.length + 2) {
        prefix = p;
        root = root.substring(p.length);
        break;
      }
    }
    
    for (let s of suffixes) {
      if (root.endsWith(s) && root.length > s.length + 1) {
        suffix = s;
        root = root.substring(0, root.length - s.length);
        break;
      }
    }
    
    if (root.length === 0) {
      root = w;
      prefix = "";
      suffix = "";
    }
    
    return { prefix, root, suffix };
  }

  // --- LSA Dimension Reduction (SVD via Power Iteration) ---
  function calculateLSA(selectedFolios) {
    const d = selectedFolios.length;
    if (d < 2) return selectedFolios.map((f, i) => ({ folio: f, x: 0, y: 0 }));

    // Extract all unique words across the selected folios
    const allWords = new Set();
    selectedFolios.forEach(f => {
      if (tfIdfVectors[f]) {
        Object.keys(tfIdfVectors[f]).forEach(w => allWords.add(w));
      }
    });
    const wordList = Array.from(allWords);

    // Build normalized Term-Document Matrix
    const columns = [];
    selectedFolios.forEach(f => {
      const vec = tfIdfVectors[f] || {};
      const col = wordList.map(w => vec[w] || 0);
      // Normalize column
      const len = Math.sqrt(col.reduce((sum, val) => sum + val * val, 0));
      columns.push(col.map(val => val / (len || 1)));
    });

    // Build Similarity Matrix S = A^T A (size d x d)
    const S = Array(d).fill(0).map(() => Array(d).fill(0));
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        // Dot product of normalized document vectors (Cosine similarity)
        let dot = 0;
        for (let k = 0; k < wordList.length; k++) {
          dot += columns[i][k] * columns[j][k];
        }
        S[i][j] = dot;
      }
    }

    // Solve for top 2 eigenvectors using Power Iteration & Deflation
    const eigenvectors = [];
    const eigenvalues = [];
    let currentS = S.map(row => [...row]);

    for (let dim = 0; dim < 2; dim++) {
      let b = Array(d).fill(0).map(() => Math.random() - 0.5);
      let norm = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
      b = b.map(x => x / (norm || 1));

      for (let iter = 0; iter < 40; iter++) {
        let nextB = Array(d).fill(0);
        for (let i = 0; i < d; i++) {
          for (let j = 0; j < d; j++) {
            nextB[i] += currentS[i][j] * b[j];
          }
        }
        norm = Math.sqrt(nextB.reduce((s, v) => s + v * v, 0));
        b = nextB.map(x => x / (norm || 1));
      }

      // Eigenvalue lambda = b^T S b
      let Sb = Array(d).fill(0);
      for (let i = 0; i < d; i++) {
        for (let j = 0; j < d; j++) {
          Sb[i] += currentS[i][j] * b[j];
        }
      }
      const lambda = b.reduce((s, val, idx) => s + val * Sb[idx], 0);

      eigenvectors.push(b);
      eigenvalues.push(lambda);

      // Hotelling Deflation
      for (let i = 0; i < d; i++) {
        for (let j = 0; j < d; j++) {
          currentS[i][j] -= lambda * b[i] * b[j];
        }
      }
    }

    // Document coordinates in LSA 2D space
    return selectedFolios.map((f, idx) => {
      // Coordinate component = eigenvector coordinate * sqrt(eigenvalue)
      const x = eigenvectors[0][idx] * Math.sqrt(eigenvalues[0] || 0);
      const y = eigenvectors[1][idx] * Math.sqrt(eigenvalues[1] || 0);
      return { folio: f, x, y };
    });
  }

  // Calculate Cosine Similarity directly
  function getCosineSimilarity(f1, f2) {
    const v1 = tfIdfVectors[f1] || {};
    const v2 = tfIdfVectors[f2] || {};
    let dot = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    // Combine terms
    const terms = new Set([...Object.keys(v1), ...Object.keys(v2)]);
    terms.forEach(t => {
      const w1 = v1[t] || 0;
      const w2 = v2[t] || 0;
      dot += w1 * w2;
      norm1 += w1 * w1;
      norm2 += w2 * w2;
    });
    
    return dot / (Math.sqrt(norm1) * Math.sqrt(norm2) || 1);
  }

  // --- Matter.js Physics Engine Init ---
  function initPhysics() {
    canvas = document.getElementById('physics-canvas');
    ctx = canvas.getContext('2d');
    
    // Handle size boundaries
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create Matter engine & runner
    engine = Engine.create({
      gravity: { y: 0.8, x: 0 }
    });
    world = engine.world;
    runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    // Dynamic ground & walls
    createBoundaries();

    // Mouse control
    const mouse = Mouse.create(canvas);
    mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.1,
        render: { visible: false }
      }
    });
    World.add(world, mouseConstraint);

    // Keep Matter scroll synced with mouse
    Events.on(engine, 'afterUpdate', () => {
      syncDOM();
      applyForceFields();
    });
  }

  function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
  }

  function createBoundaries() {
    const w = canvas.width;
    const h = canvas.height;
    const thickness = 100;

    // Create boundaries slightly off-screen to act as invisible walls
    const ground = Bodies.rectangle(w/2, h + thickness/2, w, thickness, { isStatic: true });
    const leftWall = Bodies.rectangle(-thickness/2, h/2, thickness, h * 2, { isStatic: true });
    const rightWall = Bodies.rectangle(w + thickness/2, h/2, thickness, h * 2, { isStatic: true });
    const ceiling = Bodies.rectangle(w/2, -thickness/2, w, thickness, { isStatic: true });

    World.add(world, [ground, leftWall, rightWall, ceiling]);
  }

  // --- UI & Controls ---
  function initUI() {
    // Populate Folio Selector
    const sortedFolios = Object.keys(statsData.folios).sort((a,b) => {
      const numA = parseInt(a.replace(/\D/g,'')) || 0;
      const numB = parseInt(b.replace(/\D/g,'')) || 0;
      return numA - numB;
    });
    
    sortedFolios.forEach(folio => {
      const opt = document.createElement('option');
      opt.value = folio;
      opt.textContent = `Folio ${folio}`;
      if (folio === activeFolio) opt.selected = true;
      folioSelector.appendChild(opt);

      // Create checkbox in spawn drop-down
      const checkContainer = document.createElement('label');
      checkContainer.className = 'flex items-center gap-2 text-xs text-[#a79ebb] cursor-pointer hover:text-white';
      checkContainer.innerHTML = `
        <input type="checkbox" value="${folio}" class="rounded border-purple-500/30 text-purple-600 bg-[#17112b] focus:ring-purple-500">
        <span>f${folio}</span>
      `;
      sheetsCheckboxList.appendChild(checkContainer);
    });

    // Event selectors
    folioSelector.addEventListener('change', (e) => {
      activeFolio = e.target.value;
      loadActiveFolioWords();
    });

    // Dropdown toggling
    sheetsDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sheetsDropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', () => sheetsDropdown.classList.add('hidden'));
    sheetsDropdown.addEventListener('click', (e) => e.stopPropagation());

    // Spawn Sheets button
    spawnSheetsBtn.addEventListener('click', () => {
      const selected = Array.from(sheetsCheckboxList.querySelectorAll('input:checked')).map(i => i.value);
      if (selected.length === 0) return;
      spawnBifoliaSheets(selected);
      sheetsDropdown.classList.add('hidden');
    });

    // Toggle Anti-gravity switch
    antigravitySwitch.addEventListener('change', (e) => {
      isAntiGravity = e.target.checked;
      engine.gravity.y = isAntiGravity ? -0.1 : 0.8;
      
      if (isAntiGravity) {
        triggerMorphologicalSplit();
      } else {
        restoreMorphologicalBonds();
      }
    });

    // Force Scale Slider
    similarityGravitySlider.addEventListener('input', (e) => {
      similarityGravityScale = parseFloat(e.target.value);
      similarityGravityVal.textContent = similarityGravityScale.toFixed(1) + 'x';
    });

    // Word Matcher align button
    alignBtn.addEventListener('click', runSequenceAlignment);
    diacriticsSwitch.addEventListener('change', runSequenceAlignment);

    // Initial load
    loadActiveFolioWords();
    runSequenceAlignment();
  }

  // --- Load active folio words ---
  function loadActiveFolioWords() {
    // Clear old words
    wordBodies.forEach(w => {
      World.remove(world, [w.prefixBody, w.rootBody, w.suffixBody]);
      w.constraints.forEach(c => World.remove(world, c));
      w.element.remove();
    });
    wordBodies = [];

    // Clear old sheets
    sheetBodies.forEach(s => {
      World.remove(world, s.body);
      if (s.snapConstraint) World.remove(world, s.snapConstraint);
      s.element.remove();
    });
    sheetBodies = [];

    // Load lines
    const lines = statsData.folios[activeFolio] || [];
    const w = canvas.width;
    const h = canvas.height;
    
    let spawnCount = 0;
    
    // Read tokens
    lines.forEach((line, lineIdx) => {
      if (!line.eva) return;
      const words = line.eva.replace(/,/g, ' ').replace(/\./g, ' ').split(/\s+/);
      
      words.forEach((wordText, wordIdx) => {
        if (!wordText || spawnCount > 40) return; // limit count to avoid canvas lag
        spawnCount++;

        const split = splitWord(wordText);
        
        // Setup visual block elements
        const wordContainer = document.createElement('div');
        wordContainer.className = 'absolute flex gap-1 pointer-events-none select-none z-10';
        
        const prefixDiv = document.createElement('div');
        prefixDiv.className = 'px-2 py-1 rounded text-xs font-mono-code font-bold bg-purple-900/60 border border-purple-400/40 text-purple-200';
        prefixDiv.textContent = split.prefix || ' ';
        if (!split.prefix) prefixDiv.classList.add('opacity-0', 'w-1');
        
        const rootDiv = document.createElement('div');
        rootDiv.className = 'px-3 py-1 rounded text-xs font-mono-code font-bold bg-[#1c1830] border border-purple-500/20 text-[#f1ecff]';
        rootDiv.textContent = split.root;
        
        const suffixDiv = document.createElement('div');
        suffixDiv.className = 'px-2 py-1 rounded text-xs font-mono-code font-bold bg-emerald-950/60 border border-emerald-400/40 text-emerald-300';
        suffixDiv.textContent = split.suffix || ' ';
        if (!split.suffix) suffixDiv.classList.add('opacity-0', 'w-1');
        
        wordContainer.appendChild(prefixDiv);
        wordContainer.appendChild(rootDiv);
        wordContainer.appendChild(suffixDiv);
        overlayContainer.appendChild(wordContainer);

        // Compute physics sizes
        const pWidth = split.prefix ? split.prefix.length * 8 + 16 : 4;
        const rWidth = split.root.length * 8 + 24;
        const sWidth = split.suffix ? split.suffix.length * 8 + 16 : 4;
        const height = 28;

        const xPos = 100 + Math.random() * (w - 200);
        const yPos = 50 + Math.random() * 150;

        // Create separate bodies for morph units
        const prefixBody = Bodies.rectangle(xPos - rWidth/2 - pWidth/2, yPos, pWidth, height, { friction: 0.1 });
        const rootBody = Bodies.rectangle(xPos, yPos, rWidth, height, { friction: 0.1 });
        const suffixBody = Bodies.rectangle(xPos + rWidth/2 + sWidth/2, yPos, sWidth, height, { friction: 0.1 });

        // Map bodies
        bodiesMap[`prefix-${spawnCount}`] = prefixBody;
        bodiesMap[`root-${spawnCount}`] = rootBody;
        bodiesMap[`suffix-${spawnCount}`] = suffixBody;
        
        prefixDiv.id = `prefix-${spawnCount}`;
        rootDiv.id = `root-${spawnCount}`;
        suffixDiv.id = `suffix-${spawnCount}`;

        // Create virtual elastic constraints (joints) to lock them
        const constraints = [];
        if (split.prefix) {
          constraints.push(Constraint.create({
            bodyA: prefixBody,
            bodyB: rootBody,
            pointA: { x: pWidth/2, y: 0 },
            pointB: { x: -rWidth/2, y: 0 },
            stiffness: 1.0,
            length: 1,
            render: { visible: false }
          }));
        }
        if (split.suffix) {
          constraints.push(Constraint.create({
            bodyA: rootBody,
            bodyB: suffixBody,
            pointA: { x: rWidth/2, y: 0 },
            pointB: { x: -sWidth/2, y: 0 },
            stiffness: 1.0,
            length: 1,
            render: { visible: false }
          }));
        }

        World.add(world, [prefixBody, rootBody, suffixBody]);
        constraints.forEach(c => World.add(world, c));

        wordBodies.push({
          prefixBody,
          rootBody,
          suffixBody,
          constraints,
          element: wordContainer,
          word: wordText
        });
      });
    });

    // Recalculate Page stats
    updateLinguisticPanel();
  }

  // --- Morphological split triggered by Anti-Gravity ---
  function triggerMorphologicalSplit() {
    wordBodies.forEach(w => {
      // Sever bonds by removing Constraints
      w.constraints.forEach(c => {
        World.remove(world, c);
      });
      // Apply slight lateral explosive force to push them apart
      Body.applyForce(w.prefixBody, w.prefixBody.position, { x: -0.005 - Math.random()*0.005, y: -0.002 });
      Body.applyForce(w.suffixBody, w.suffixBody.position, { x: 0.005 + Math.random()*0.005, y: -0.002 });
    });
  }

  function restoreMorphologicalBonds() {
    wordBodies.forEach(w => {
      // Re-add constraints
      w.constraints.forEach(c => {
        // Reset relative positions first
        Body.setPosition(w.prefixBody, {
          x: w.rootBody.position.x - w.rootBody.bounds.max.x + w.rootBody.bounds.min.x,
          y: w.rootBody.position.y
        });
        Body.setPosition(w.suffixBody, {
          x: w.rootBody.position.x + w.rootBody.bounds.max.x - w.rootBody.bounds.min.x,
          y: w.rootBody.position.y
        });
        World.add(world, c);
      });
    });
  }

  // --- Spawning Codicological Sheets (LSA Bifolia Cards) ---
  function spawnBifoliaSheets(selectedFolios) {
    // Clear old sheets
    sheetBodies.forEach(s => {
      World.remove(world, s.body);
      if (s.snapConstraint) World.remove(world, s.snapConstraint);
      s.element.remove();
    });
    sheetBodies = [];

    // Calculate SVD coordinates
    const coords = calculateLSA(selectedFolios);
    const w = canvas.width;
    const h = canvas.height;

    coords.forEach((coord, i) => {
      const folio = coord.folio;
      const partner = bifoliaPartners[folio] || null;
      
      // Determine if a water stain applies
      const stain = waterStains[folio] || null;
      const stainType = stain ? stain.type : 'none';
      const edge = stain ? stain.side : 'none';

      // Create sheet element
      const sheetDiv = document.createElement('div');
      sheetDiv.id = `sheet-${folio}`;
      sheetDiv.className = 'physics-element absolute w-48 h-64 rounded-xl glass-panel border p-4 flex flex-col justify-between overflow-hidden shadow-2xl';
      sheetDiv.style.borderColor = 'rgba(135, 116, 255, 0.2)';
      
      // Procedural water stain renderer using styled absolute SVGs
      let stainHtml = '';
      if (stain) {
        const sideClass = edge === 'right' ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full';
        const color = stainType === 'wave' ? 'rgba(56, 189, 248, 0.15)' : 
                      stainType === 'crescent' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(168, 85, 247, 0.15)';
        stainHtml = `<div class="absolute top-1/4 ${sideClass} w-8 h-24 pointer-events-none border border-transparent" style="background-color: ${color}; filter: blur(4px);"></div>`;
      }

      sheetDiv.innerHTML = `
        ${stainHtml}
        <div class="flex justify-between items-start pointer-events-none">
          <span class="font-display font-extrabold text-sm text-purple-200">Folio ${folio}</span>
          <span class="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono-code font-bold uppercase">f${folio}</span>
        </div>
        
        <div class="my-4 pointer-events-none flex flex-col gap-1">
          <span class="text-[9px] uppercase tracking-wider text-[#a79ebb]">LSA Properties</span>
          <span class="text-[10px] text-white font-mono-code">Scribe: ${statsData.folios[folio]?.[0]?.scribe || 'Scribe 1'}</span>
          <span class="text-[10px] text-white font-mono-code">Dialect: Voynich A</span>
          <div class="flex items-center gap-1.5 mt-1">
            <div class="w-2 h-2 rounded-full bg-purple-500"></div>
            <span class="text-[9px] text-[#a79ebb] uppercase">Matched folds</span>
          </div>
        </div>

        <div class="flex justify-between items-center border-t border-purple-500/10 pt-2 pointer-events-none">
          <span class="text-[9px] text-[#6e6485]">Stain: ${stainType.toUpperCase()} (${edge.toUpperCase()})</span>
          ${partner ? `<span class="text-[8px] text-pink-400 font-bold font-mono-code">Conjunct: f${partner}</span>` : ''}
        </div>
      `;
      overlayContainer.appendChild(sheetDiv);

      // Map SVD 2D coordinate space to screen physics canvas space
      // coordinates lie in [-1, 1], map to screen center
      const screenX = w/2 + coord.x * (w/3) + (Math.random() - 0.5) * 50;
      const screenY = h/2 + coord.y * (h/3) + (Math.random() - 0.5) * 50;

      const body = Bodies.rectangle(screenX, screenY, 192, 256, {
        frictionAir: 0.05,
        restitution: 0.1,
        collisionFilter: {
          group: 0,
          category: 0x0002,
          mask: 0xFFFF // Collides with everything initially
        }
      });
      
      bodiesMap[`sheet-${folio}`] = body;
      World.add(world, body);

      sheetBodies.push({
        body,
        element: sheetDiv,
        folio,
        stainType,
        edge,
        snapConstraint: null,
        partner
      });
    });
  }

  // --- Codicological LSA Attraction Field loop ---
  function applyForceFields() {
    if (sheetBodies.length < 2) return;
    
    for (let i = 0; i < sheetBodies.length; i++) {
      for (let j = i + 1; j < sheetBodies.length; j++) {
        const s1 = sheetBodies[i];
        const s2 = sheetBodies[j];
        
        // Calculate similarity
        const similarity = getCosineSimilarity(s1.folio, s2.folio);
        if (similarity < 0.20) continue; // ignore weak relations
        
        // Calculate vector
        const pos1 = s1.body.position;
        const pos2 = s2.body.position;
        const distVec = Vector.sub(pos2, pos1);
        const dist = Vector.magnitude(distVec);
        
        if (dist === 0 || dist > 400) continue;
        
        // Apply virtual gravity proportional to similarity
        const forceMagnitude = (0.0001 * s1.body.mass * s2.body.mass * similarity * similarityGravityScale) / (dist * dist);
        const force = Vector.mult(Vector.normalise(distVec), Math.min(forceMagnitude, 0.05));
        
        // Gravitate together
        Body.applyForce(s1.body, pos1, force);
        Body.applyForce(s2.body, pos2, Vector.neg(force));
        
        // check for Snapping Constraint (water stains match symmetry check)
        const isPartner = s1.partner === s2.folio || s2.partner === s1.folio;
        const sameStain = s1.stainType !== 'none' && s1.stainType === s2.stainType;
        
        if (dist < 180 && !s1.snapConstraint && !s2.snapConstraint) {
          if (isPartner && sameStain) {
            // Lock sheets side-by-side using constraints
            const xOffset = s1.edge === 'right' ? 96 : -96;
            
            s1.snapConstraint = Constraint.create({
              bodyA: s1.body,
              bodyB: s2.body,
              pointA: { x: xOffset, y: 0 },
              pointB: { x: -xOffset, y: 0 },
              stiffness: 0.9,
              length: 5,
              render: { visible: true, strokeStyle: '#10b981', lineWidth: 2 }
            });
            s2.snapConstraint = s1.snapConstraint;
            World.add(world, s1.snapConstraint);
            
            // Visual glow notification
            s1.element.classList.add('border-emerald-500', 'shadow-emerald-500/20');
            s2.element.classList.add('border-emerald-500', 'shadow-emerald-500/20');
            
            // disable outer collisions between the paired sheets to allow them to mesh
            s1.body.collisionFilter.mask = 0x0001; // don't collide with sheets category
            s2.body.collisionFilter.mask = 0x0001;
          } else if (dist < 160) {
            // Mismatched water stains - collide & trigger error highlight
            s1.element.classList.add('border-rose-500', 'shadow-rose-500/20');
            s2.element.classList.add('border-rose-500', 'shadow-rose-500/20');
            
            setTimeout(() => {
              s1.element.classList.remove('border-rose-500', 'shadow-rose-500/20');
              s2.element.classList.remove('border-rose-500', 'shadow-rose-500/20');
            }, 800);
          }
        }
      }
    }
  }

  // --- Synchronize HTML overlays with Physics engine bodies ---
  function syncDOM() {
    // 1. Sync word chunks
    wordBodies.forEach(w => {
      // Find coordinates of root body, render prefix/suffix relative to it
      const rPos = w.rootBody.position;
      const rAngle = w.rootBody.angle;
      const height = 28;

      // Update parent absolute container position
      w.element.style.transform = `translate(${rPos.x}px, ${rPos.y}px) rotate(${rAngle}rad)`;
      w.element.style.transformOrigin = 'center';
      
      // Update relative positions of prefix/suffix elements to match physics coordinates
      const pPos = w.prefixBody.position;
      const sPos = w.suffixBody.position;
      
      const pLocal = Vector.rotate(Vector.sub(pPos, rPos), -rAngle);
      const sLocal = Vector.rotate(Vector.sub(sPos, rPos), -rAngle);
      
      const prefixEl = w.element.children[0];
      const rootEl = w.element.children[1];
      const suffixEl = w.element.children[2];
      
      prefixEl.style.transform = `translate(${pLocal.x + w.prefixBody.bounds.max.x - w.prefixBody.bounds.min.x - 20}px, ${pLocal.y}px) rotate(${w.prefixBody.angle - rAngle}rad)`;
      suffixEl.style.transform = `translate(${sLocal.x - (w.suffixBody.bounds.max.x - w.suffixBody.bounds.min.x) + 20}px, ${sLocal.y}px) rotate(${w.suffixBody.angle - rAngle}rad)`;
    });

    // 2. Sync bifolia sheets
    sheetBodies.forEach(s => {
      const pos = s.body.position;
      const angle = s.body.angle;
      s.element.style.left = `${pos.x - 96}px`;
      s.element.style.top = `${pos.y - 128}px`;
      s.element.style.transform = `rotate(${angle}rad)`;
    });
  }

  // --- Linguistic Calculation Sidebar Panels ---
  function updateLinguisticPanel() {
    // 1. h2 Conditional Entropy Calculator
    const text = documents[activeFolio] || [];
    if (text.length === 0) {
      entropyActiveVal.textContent = "0.00 bits";
      entropyProgressBar.style.width = "0%";
      return;
    }

    const charSequence = text.join(' ');
    const counts = {};
    const transitionCounts = {};
    let totalChars = charSequence.length;
    
    // Character unigram & bigram frequency counts
    for (let i = 0; i < totalChars; i++) {
      const c = charSequence[i];
      counts[c] = (counts[c] || 0) + 1;
      
      if (i < totalChars - 1) {
        const next = charSequence[i+1];
        const bigram = c + next;
        transitionCounts[bigram] = (transitionCounts[bigram] || 0) + 1;
      }
    }

    // Unigram entropy H(X)
    let h1 = 0;
    Object.values(counts).forEach(cnt => {
      const p = cnt / totalChars;
      h1 -= p * Math.log2(p);
    });

    // Joint entropy H(X, Y)
    let h12 = 0;
    const totalBigrams = totalChars - 1;
    Object.values(transitionCounts).forEach(cnt => {
      const p = cnt / totalBigrams;
      h12 -= p * Math.log2(p);
    });

    // Conditional entropy H(Y|X) = H(X, Y) - H(X)
    const h2 = Math.max(0, h12 - h1);
    entropyActiveVal.textContent = h2.toFixed(3) + ' bits';

    // Map 2.0 -> 100%, 4.5 -> 0% in progress bar representation
    const progressPct = Math.max(0, Math.min(100, (4.5 - h2) / 2.5 * 100));
    entropyProgressBar.style.width = progressPct + '%';

    // 2. Line-Position quirks calculations
    linePositionQuirks.innerHTML = '';
    const sequence = folioTokens[activeFolio] || [];
    
    const startCounts = {};
    const endCounts = {};
    const globalCounts = {};
    
    sequence.forEach(tok => {
      const word = tok.eva_token.toLowerCase();
      const pos = tok.line_position;
      
      for (let i = 0; i < word.length; i++) {
        const c = word[i];
        globalCounts[c] = (globalCounts[c] || 0) + 1;
        if (pos === 'Start') startCounts[c] = (startCounts[c] || 0) + 1;
        if (pos === 'End') endCounts[c] = (endCounts[c] || 0) + 1;
      }
    });

    // Find quirks
    Object.keys(globalCounts).forEach(c => {
      if (globalCounts[c] < 8) return; // ignore minor instances
      
      const startPct = (startCounts[c] || 0) / globalCounts[c];
      const endPct = (endCounts[c] || 0) / globalCounts[c];

      if (startPct > 0.65) {
        const span = document.createElement('span');
        span.className = 'px-2 py-0.5 rounded text-[10px] bg-purple-500/10 border border-purple-500/30 text-purple-300 font-semibold';
        span.textContent = `${c} (Start: ${Math.round(startPct*100)}%)`;
        linePositionQuirks.appendChild(span);
      }
      if (endPct > 0.65) {
        const span = document.createElement('span');
        span.className = 'px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold';
        span.textContent = `${c} (End: ${Math.round(endPct*100)}%)`;
        linePositionQuirks.appendChild(span);
      }
    });
    
    if (linePositionQuirks.children.length === 0) {
      linePositionQuirks.innerHTML = '<span class="text-[#6e6485] italic">No significant position quirks detected.</span>';
    }

    // 3. Word burstiness local finder
    burstinessList.innerHTML = '';
    const activeWords = new Set(text);
    
    const burstyWords = vocabularyData
      .filter(item => activeWords.has(item.eva_word.toLowerCase()))
      .sort((a,b) => parseFloat(b.intermittency_score) - parseFloat(a.intermittency_score))
      .slice(0, 5);

    burstyWords.forEach(item => {
      const div = document.createElement('div');
      div.className = 'flex justify-between items-center bg-purple-950/15 border border-purple-500/5 p-1.5 rounded text-[10px] hover:border-purple-500/30 transition';
      div.innerHTML = `
        <span class="font-bold text-white font-mono-code">${item.eva_word}</span>
        <span class="text-pink-400 font-mono-code font-semibold">Burstiness: ${item.intermittency_score}</span>
      `;
      div.title = item.historical_notes;
      burstinessList.appendChild(div);
    });

    if (burstyWords.length === 0) {
      burstinessList.innerHTML = '<div class="text-[#6e6485] italic text-[10px] text-center">No high-intermittency keywords in this folio.</div>';
    }
  }

  // --- Bax Proper Noun Sequence Alignment Aligner ---
  function runSequenceAlignment() {
    const vmsWord = alignInputVms.value.trim().toLowerCase();
    const natWord = alignInputNat.value.trim().toLowerCase();
    
    if (!vmsWord || !natWord) return;

    isDiacriticsMode = diacriticsSwitch.checked;
    
    // Collapse loop modifiers if diacritics mode is active
    let vmsParsed = vmsWord;
    const diacriticsNotes = [];
    
    if (isDiacriticsMode) {
      // Treat loops/bars (represented by 'h' in EVA combos like ch, sh, cth, cph) as vowel pointings
      // We compress them into the base letter, reducing the active alphabet
      vmsParsed = vmsWord
        .replace(/ch/g, 'c*')
        .replace(/sh/g, 's*')
        .replace(/ct/g, 't*')
        .replace(/cp/g, 'p*')
        .replace(/ck/g, 'k*')
        .replace(/h/g, '*'); // treat any loose 'h' as an overhead mark
      diacriticsNotes.push("Composite digraphs (ch, sh, cth) collapsed to base consonant + diacritical modifier '*'.");
    }

    // Needleman-Wunsch Sequence Alignment algorithm
    const matchScore = 2;
    const mismatchScore = -1;
    const gapScore = -2;

    const n = vmsParsed.length;
    const m = natWord.length;
    
    const dp = Array(n + 1).fill(0).map(() => Array(m + 1).fill(0));
    
    for (let i = 0; i <= n; i++) dp[i][0] = i * gapScore;
    for (let j = 0; j <= m; j++) dp[0][j] = j * gapScore;

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const vChar = vmsParsed[i-1];
        const nChar = natWord[j-1];
        
        let score = mismatchScore;
        // Phonetic equivalence score logic (Bax mappings)
        if (vChar === nChar) {
          score = matchScore;
        } else if (vChar === '*' && 'aeiouy'.includes(nChar)) {
          // Vowel loop diacritic matches candidate natural language vowel!
          score = matchScore; 
        } else if (vChar === 'c' && (nChar === 'c' || nChar === 'k' || nChar === 'q')) {
          score = matchScore - 0.5; // partial match
        } else if (vChar === 'd' && (nChar === 'd' || nChar === 't')) {
          score = matchScore - 0.5;
        } else if (vChar === 'o' && (nChar === 'a' || nChar === 'o')) {
          score = matchScore - 0.5;
        }
        
        dp[i][j] = Math.max(
          dp[i-1][j-1] + score,
          dp[i-1][j] + gapScore,
          dp[i][j-1] + gapScore
        );
      }
    }

    // Backtrack to find alignment path
    let alignVms = [];
    let alignNat = [];
    
    let i = n;
    let j = m;
    
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0) {
        const vChar = vmsParsed[i-1];
        const nChar = natWord[j-1];
        let score = mismatchScore;
        if (vChar === nChar) score = matchScore;
        else if (vChar === '*' && 'aeiouy'.includes(nChar)) score = matchScore;
        else if (vChar === 'c' && (nChar === 'c' || nChar === 'k' || nChar === 'q')) score = matchScore - 0.5;
        else if (vChar === 'd' && (nChar === 'd' || nChar === 't')) score = matchScore - 0.5;
        else if (vChar === 'o' && (nChar === 'a' || nChar === 'o')) score = matchScore - 0.5;

        if (dp[i][j] === dp[i-1][j-1] + score) {
          alignVms.unshift(vmsParsed[i-1]);
          alignNat.unshift(natWord[j-1]);
          i--; j--;
          continue;
        }
      }
      if (i > 0 && (j === 0 || dp[i][j] === dp[i-1][j] + gapScore)) {
        alignVms.unshift(vmsParsed[i-1]);
        alignNat.unshift('-');
        i--;
      } else {
        alignVms.unshift('-');
        alignNat.unshift(natWord[j-1]);
        j--;
      }
    }

    // Render alignment output
    alignmentOutputContainer.classList.remove('hidden');
    alignmentScore.textContent = dp[n][m];
    
    document.getElementById('alphabet-shrunk-badge').textContent = isDiacriticsMode ? "Alphabet: 22 (Compressed)" : "Alphabet: 36 (Full)";

    // Visual grid rendering
    alignmentVisualGrid.innerHTML = '';
    
    const row1 = document.createElement('div');
    row1.className = 'flex justify-center gap-1 mb-1';
    const row2 = document.createElement('div');
    row2.className = 'flex justify-center gap-1 mb-1';
    const row3 = document.createElement('div');
    row3.className = 'flex justify-center gap-1';

    for (let k = 0; k < alignVms.length; k++) {
      const v = alignVms[k];
      const n = alignNat[k];
      
      const vCell = document.createElement('span');
      vCell.className = 'w-6 h-6 leading-6 rounded border flex items-center justify-center font-bold text-[11px] ';
      const nCell = document.createElement('span');
      nCell.className = 'w-6 h-6 leading-6 rounded border flex items-center justify-center font-bold text-[11px] ';
      
      const connector = document.createElement('span');
      connector.className = 'w-6 text-[8px] font-bold text-center ';

      // Highlight logic
      if (v === n && v !== '-') {
        vCell.className += 'bg-emerald-950/40 border-emerald-500 text-emerald-300';
        nCell.className += 'bg-emerald-950/40 border-emerald-500 text-emerald-300';
        connector.textContent = '│';
        connector.className += 'text-emerald-400';
      } else if (v === '*' && 'aeiouy'.includes(n)) {
        // Highlight diacritical match (loop matching natural vowel)
        vCell.className += 'bg-pink-950/40 border-pink-500 text-pink-300';
        nCell.className += 'bg-pink-950/40 border-pink-500 text-pink-300';
        vCell.textContent = '◌'; // diacritic circle indicator
        vCell.title = "Diacritical Vowel Pointing";
        connector.textContent = '↕';
        connector.className += 'text-pink-400 font-bold';
      } else if (v === '-' || n === '-') {
        vCell.className += 'bg-purple-950/10 border-purple-500/10 text-[#6e6485]';
        nCell.className += 'bg-purple-950/10 border-purple-500/10 text-[#6e6485]';
        connector.textContent = ' ';
      } else {
        // partial or mismatch
        vCell.className += 'bg-purple-950/30 border-purple-500/20 text-[#a79ebb]';
        nCell.className += 'bg-purple-950/30 border-purple-500/20 text-[#a79ebb]';
        connector.textContent = '·';
        connector.className += 'text-[#6e6485]';
      }

      vCell.textContent = vCell.textContent || v;
      nCell.textContent = n;

      row1.appendChild(vCell);
      row2.appendChild(connector);
      row3.appendChild(nCell);
    }

    alignmentVisualGrid.appendChild(row1);
    alignmentVisualGrid.appendChild(row2);
    alignmentVisualGrid.appendChild(row3);
  }
});
