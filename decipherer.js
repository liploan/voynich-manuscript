// Voynich Manuscript Decipherment & Reordering Workspace Controller
document.addEventListener('DOMContentLoaded', () => {
  // --- State Variables ---
  let statsData = null;
  let vocabularyData = [];
  let tokenSequenceData = [];
  let imageMapData = {};
  
  let documents = {}; // folio -> word tokens list
  let docFreqs = {}; // word -> doc count
  let tfIdfVectors = {}; // folio -> tf-idf weight vector dict
  
  // Active state
  let currentFolio = '2r';
  let activeSequence = []; // List of active folios being reordered
  let voices = [];
  
  // Vocabulary morphological mapping
  const vocabMorphMap = {}; // word -> { prefix, root, suffix, frequency, notes }

  // DOM Elements
  const presetSelector = document.getElementById('preset-selector');
  const overallScoreEl = document.getElementById('overall-score');
  const scoreFill = document.getElementById('score-fill');
  
  const lsaScoreVal = document.getElementById('lsa-score-val');
  const stainScoreVal = document.getElementById('stain-score-val');
  const scribeScoreVal = document.getElementById('scribe-score-val');
  
  const stainMatchesCount = document.getElementById('stain-matches-count');
  const folioDragList = document.getElementById('folio-drag-list');
  
  const viewerFolioTitle = document.getElementById('viewer-folio-title');
  const viewerSectionTag = document.getElementById('viewer-section-tag');
  const viewerScribeTag = document.getElementById('viewer-scribe-tag');
  const viewerDialectTag = document.getElementById('viewer-dialect-tag');
  const transcriptionViewer = document.getElementById('transcription-viewer-container');
  
  // Word Detail Panel Elements
  const wordDetailPanel = document.getElementById('word-detail-panel');
  const detailWord = document.getElementById('detail-word');
  const detailFreq = document.getElementById('detail-freq');
  const detailSpeakBtn = document.getElementById('detail-speak-btn');
  const detailPrefix = document.getElementById('detail-prefix');
  const detailRoot = document.getElementById('detail-root');
  const detailSuffix = document.getElementById('detail-suffix');
  const detailBax = document.getElementById('detail-bax');
  const detailNotes = document.getElementById('detail-notes');
  
  // Vocalizer Sandbox Elements
  const vocalizerInput = document.getElementById('vocalizer-input');
  const vocalizerSpeakBtn = document.getElementById('vocalizer-speak-btn');
  const voiceSelect = document.getElementById('vocalizer-voice-select');
  const rateSlider = document.getElementById('vocalizer-rate');
  const pitchSlider = document.getElementById('vocalizer-pitch');
  const rateVal = document.getElementById('rate-val');
  const pitchVal = document.getElementById('pitch-val');
  
  // Alignment Sandbox Elements
  const alignVmsInput = document.getElementById('align-vms');
  const alignNatInput = document.getElementById('align-nat');
  const alignmentBtn = document.getElementById('alignment-btn');
  const alignmentOutput = document.getElementById('alignment-output');
  const alignScoreEl = document.getElementById('align-score');
  const alignVisualGrid = document.getElementById('align-visual-grid');

  // Conjunct bifolia partners across all sections (representing nested folds)
  const conjunctPartners = {
    // Quire 1
    '1r': '8v', '1v': '8r', '2r': '7v', '2v': '7r', '3r': '6v', '3v': '6r', '4r': '5v', '4v': '5r',
    // Quire 2
    '9r': '16v', '9v': '16r', '10r': '15v', '10v': '15r', '11r': '14v', '11v': '14r', '12r': '13v', '12v': '13r',
    // Quire 9 (Astro)
    '67r1': '68v1', '67r2': '68v2', '67v2': '68r2', '67v1': '68r1',
    // Quire 10 (Cosmo)
    '69r': '73v', '69v': '73r', '70r1': '72v1', '70r2': '72v2',
    // Quire 13 (Balneo)
    '75r': '80v', '75v': '80r', '76r': '79v', '76v': '79r',
    // Quire 15 (Pharma)
    '87r': '96v', '87v': '96r', '88r': '95v', '88v': '95r',
    // Quire 20 (Recipes)
    '103r': '116v', '103v': '116r', '104r': '115v', '104v': '115r'
  };

  // Water stain profiles associated with folios across quires
  const waterStainProfiles = {
    // Quire 1
    '1r': { type: 'wave', side: 'right' }, '8v': { type: 'wave', side: 'left' },
    '1v': { type: 'wave', side: 'left' }, '8r': { type: 'wave', side: 'right' },
    '2r': { type: 'crescent', side: 'right' }, '7v': { type: 'crescent', side: 'left' },
    '2v': { type: 'crescent', side: 'left' }, '7r': { type: 'crescent', side: 'right' },
    '3r': { type: 'jagged', side: 'right' }, '6v': { type: 'jagged', side: 'left' },
    '3v': { type: 'jagged', side: 'left' }, '6r': { type: 'jagged', side: 'right' },
    '4r': { type: 'blob', side: 'right' }, '5v': { type: 'blob', side: 'left' },
    '4v': { type: 'blob', side: 'left' }, '5r': { type: 'blob', side: 'right' },
    // Quire 2
    '9r': { type: 'wave-b', side: 'right' }, '16v': { type: 'wave-b', side: 'left' },
    '9v': { type: 'wave-b', side: 'left' }, '16r': { type: 'wave-b', side: 'right' },
    '10r': { type: 'notch', side: 'right' }, '15v': { type: 'notch', side: 'left' },
    '10v': { type: 'notch', side: 'left' }, '15r': { type: 'notch', side: 'right' },
    // Quire 9
    '67r1': { type: 'wave', side: 'right' }, '68v1': { type: 'wave', side: 'left' },
    '67r2': { type: 'wave-b', side: 'right' }, '68v2': { type: 'wave-b', side: 'left' },
    // Quire 10
    '69r': { type: 'blob', side: 'right' }, '73v': { type: 'blob', side: 'left' },
    '69v': { type: 'blob', side: 'left' }, '73r': { type: 'blob', side: 'right' },
    // Quire 13
    '75r': { type: 'crescent', side: 'right' }, '80v': { type: 'crescent', side: 'left' },
    '75v': { type: 'crescent', side: 'left' }, '80r': { type: 'crescent', side: 'right' },
    // Quire 15
    '87r': { type: 'notch', side: 'right' }, '96v': { type: 'notch', side: 'left' },
    '87v': { type: 'notch', side: 'left' }, '96r': { type: 'notch', side: 'right' },
    // Quire 20
    '103r': { type: 'blob-b', side: 'right' }, '116v': { type: 'blob-b', side: 'left' },
    '103v': { type: 'blob-b', side: 'left' }, '116r': { type: 'blob-b', side: 'right' }
  };

  // Section and Quire mapping sequences (standard, optimized LSA, and scribe orders)
  const quireSequences = {
    'herbal-q1': {
      standard: ['1r', '1v', '2r', '2v', '3r', '3v', '4r', '4v', '5r', '5v', '6r', '6v', '7r', '7v', '8r', '8v'],
      optimized: ['1r', '1v', '8r', '8v', '2r', '2v', '7r', '7v', '3r', '3v', '6r', '6v', '4r', '4v', '5r', '5v'],
      scribe: ['1r', '1v', '2r', '2v', '5r', '5v', '8r', '8v', '3r', '3v', '4r', '4v', '6r', '6v', '7r', '7v']
    },
    'herbal-q2': {
      standard: ['9r', '9v', '10r', '10v', '11r', '11v', '13r', '13v', '14r', '14v', '15r', '15v', '16r', '16v'],
      optimized: ['9r', '9v', '16r', '16v', '10r', '10v', '15r', '15v', '11r', '11v', '13r', '13v', '14r', '14v'],
      scribe: ['9r', '9v', '10r', '10v', '11r', '11v', '13r', '13v', '14r', '14v', '15r', '15v', '16r', '16v']
    },
    'astro-q9': {
      standard: ['67r1', '67r2', '67v2', '67v1', '68r1', '68r2', '68r3', '68v3', '68v2', '68v1'],
      optimized: ['67r1', '67r2', '68r1', '68r2', '68r3', '67v1', '67v2', '68v1', '68v2', '68v3'],
      scribe: ['67r1', '67r2', '67v2', '67v1', '68r1', '68r2', '68r3', '68v3', '68v2', '68v1']
    },
    'cosmo-q10': {
      standard: ['69r', '69v', '70r1', '70r2', '70v2', '70v1', '72r1', '72r2', '72v2', '72v1', '73r', '73v'],
      optimized: ['69r', '69v', '73r', '73v', '70r1', '70r2', '72r1', '72r2', '70v1', '70v2', '72v1', '72v2'],
      scribe: ['69r', '69v', '70r1', '70r2', '70v2', '70v1', '72r1', '72r2', '72v2', '72v1', '73r', '73v']
    },
    'balneo-q13': {
      standard: ['75r', '75v', '76r', '76v', '77r', '77v', '78r', '78v', '79r', '79v', '80r', '80v'],
      optimized: ['75r', '75v', '80r', '80v', '76r', '76v', '79r', '79v', '77r', '77v', '78r', '78v'],
      scribe: ['75r', '75v', '76r', '76v', '77r', '77v', '78r', '78v', '79r', '79v', '80r', '80v']
    },
    'pharma-q15': {
      standard: ['87r', '87v', '88r', '88v', '89r', '89v', '90r1', '90r2', '90v2', '90v1', '93r', '93v', '94r', '94v', '95r', '95v', '96r', '96v'],
      optimized: ['87r', '87v', '96r', '96v', '88r', '88v', '95r', '95v', '89r', '89v', '94r', '94v', '90r1', '90r2', '93r', '93v', '90v1', '90v2'],
      scribe: ['87r', '87v', '88r', '88v', '89r', '89v', '90r1', '90r2', '90v2', '90v1', '93r', '93v', '94r', '94v', '95r', '95v', '96r', '96v']
    },
    'recipes-q20': {
      standard: ['103r', '103v', '104r', '104v', '105r', '105v', '106r', '106v', '107r', '107v', '108r', '108v', '111r', '111v', '112r', '112v', '113r', '113v', '114r', '114v', '115r', '115v', '116r', '116v'],
      optimized: ['103r', '103v', '116r', '116v', '104r', '104v', '115r', '115v', '105r', '105v', '114r', '114v', '106r', '106v', '113r', '113v', '107r', '107v', '112r', '112v', '108r', '108v', '111r', '111v'],
      scribe: ['103r', '103v', '104r', '104v', '105r', '105v', '106r', '106v', '107r', '107v', '108r', '108v', '111r', '111v', '112r', '112v', '113r', '113v', '114r', '114v', '115r', '115v', '116r', '116v']
    }
  };

  // --- Initial Data Load ---
  Promise.all([
    fetch('voynich_stats.json').then(r => r.json()),
    fetch('voynich_vocabulary.csv').then(r => r.text()),
    fetch('voynich_token_sequence.csv').then(r => r.text()),
    fetch('voynich_image_mapping.json').then(r => r.json())
  ]).then(([stats, vocabCsv, seqCsv, imageMap]) => {
    statsData = stats;
    vocabularyData = parseCSV(vocabCsv);
    tokenSequenceData = parseCSV(seqCsv);
    imageMapData = imageMap;
    
    processData();
    initBotanicalDatabase();
    initSpeech();
    initUI();
    
    // Set initial preset
    loadPreset('standard');
    loadFolio(activeSequence[0]);
    runSequenceAlignment();
  }).catch(err => {
    console.error("Error loading resources:", err);
    alert("Could not load data. Make sure you run python3 -m http.server 8000 and view the dashboard via localhost.");
  });

  // --- CSV Parser Helper ---
  function parseCSV(text) {
    const lines = text.split('\n');
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const results = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = [];
      let currentVal = '';
      let insideQuote = false;
      
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
    // 1. Build morphological map
    vocabularyData.forEach(item => {
      const word = item.eva_word.toLowerCase();
      vocabMorphMap[word] = {
        prefix: item.morphology_prefix,
        root: item.morphological_root,
        suffix: item.morphological_suffix,
        frequency: item.frequency,
        notes: item.historical_notes
      };
    });

    // 2. Document vectors for all pages
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

    // Compute Doc Frequencies
    Object.values(documents).forEach(wordList => {
      const unique = new Set(wordList);
      unique.forEach(w => {
        docFreqs[w] = (docFreqs[w] || 0) + 1;
      });
    });

    // Compute TF-IDF vectors
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

  // --- Morphological split backup ---
  function splitWord(word) {
    const w = word.toLowerCase();
    if (vocabMorphMap[w]) return vocabMorphMap[w];

    // Regex backup rules
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
    return { prefix, root, suffix, frequency: "-", notes: "Analyzed via morphological suffix rules." };
  }

  // --- Phonetic Sound Converter ---
  function translateEvaToBaxSpelling(evaWord) {
    let phon = evaWord.toLowerCase();
    
    // Replacements ordered by match length to avoid sub-string collisions
    const rules = [
      { vms: 'qok', phon: 'k' },
      { vms: 'qoc', phon: 'kh' },
      { vms: 'qot', phon: 't' },
      { vms: 'qop', phon: 'p' },
      { vms: 'qo', phon: 'o' },
      { vms: 'ch', phon: 'kh' },
      { vms: 'sh', phon: 'sh' },
      { vms: 'cfh', phon: 'f' },
      { vms: 'ckh', phon: 'k' },
      { vms: 'cth', phon: 't' },
      { vms: 'cph', phon: 'p' },
      { vms: 'iin', phon: 'oor' },
      { vms: 'in', phon: 'eer' },
      { vms: 'ii', phon: 'ee' },
      { vms: 'ee', phon: 'oh' },
      { vms: 'ol', phon: 'ol' },
      { vms: 'al', phon: 'al' },
      { vms: 'or', phon: 'or' },
      { vms: 'ar', phon: 'ar' },
      { vms: 'y', phon: 'ee' },
      { vms: 'c', phon: 'k' },
      { vms: 'o', phon: 'o' },
      { vms: 'a', phon: 'a' },
      { vms: 'd', phon: 'd' },
      { vms: 't', phon: 't' },
      { vms: 'r', phon: 'r' }
    ];

    rules.forEach(rule => {
      phon = phon.split(rule.vms).join(rule.phon);
    });

    return phon;
  }

  // --- Voice Synthesis API ---
  function initSpeech() {
    if (!('speechSynthesis' in window)) return;
    
    const populateVoices = () => {
      voices = window.speechSynthesis.getVoices();
      voiceSelect.innerHTML = '';
      
      // Look for Italian, Greek, Arabic, or generic foreign accents which pronunciations of phonemes match better
      const preferredLocales = ['it-IT', 'el-GR', 'ar-EG', 'la', 'es-ES', 'en-US'];
      const sortedVoices = [...voices].sort((a, b) => {
        const indexA = preferredLocales.findIndex(l => a.lang.startsWith(l));
        const indexB = preferredLocales.findIndex(l => b.lang.startsWith(l));
        const scoreA = indexA === -1 ? 99 : indexA;
        const scoreB = indexB === -1 ? 99 : indexB;
        return scoreA - scoreB;
      });

      sortedVoices.forEach(voice => {
        const opt = document.createElement('option');
        opt.value = voice.name;
        opt.textContent = `${voice.name} (${voice.lang})`;
        voiceSelect.appendChild(opt);
      });
    };

    populateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = populateVoices;
    }
  }

  function speakWord(wordText) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // Stop active voices

    const phon = translateEvaToBaxSpelling(wordText);
    const utterance = new SpeechSynthesisUtterance(phon);
    
    // Settings
    const selectedVoiceName = voiceSelect.value;
    const selectedVoice = voices.find(v => v.name === selectedVoiceName);
    if (selectedVoice) utterance.voice = selectedVoice;
    
    utterance.rate = parseFloat(rateSlider.value);
    utterance.pitch = parseFloat(pitchSlider.value);

    window.speechSynthesis.speak(utterance);
  }

  // --- LSA Cosine Similarity ---
  function getCosineSimilarity(f1, f2) {
    const v1 = tfIdfVectors[f1] || {};
    const v2 = tfIdfVectors[f2] || {};
    let dot = 0;
    let norm1 = 0;
    let norm2 = 0;
    
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

  // --- Codicological Metrics Solver ---
  function calculateReorderingConsistency() {
    if (activeSequence.length < 2) return;

    let totalLsa = 0;
    let stainMatches = 0;
    let scribeContinuity = 0;
    let totalWaterStainEligible = 0;

    // Iterate through adjacent pages in sequence
    for (let i = 0; i < activeSequence.length - 1; i++) {
      const f1 = activeSequence[i];
      const f2 = activeSequence[i+1];

      // 1. LSA similarity
      totalLsa += getCosineSimilarity(f1, f2);

      // 2. Scribe continuity
      const scribe1 = statsData.folios[f1]?.[0]?.scribe || '1';
      const scribe2 = statsData.folios[f2]?.[0]?.scribe || '2';
      if (scribe1 === scribe2) {
        scribeContinuity++;
      }

      // 3. Water-Stain edge matching
      // Water stains match if the pages sitting adjacently in the binding sequence
      // are folded correctly relative to their nested conjunct sheets.
      // In a quire layout, conjuncts sit at opposite ends (index i and n - i - 1).
      // We check if the water stain profile type matches on their contiguous borders.
      const stain1 = waterStainProfiles[f1];
      const stain2 = waterStainProfiles[f2];
      
      if (stain1 && stain2) {
        totalWaterStainEligible++;
        // Symmetrical profiles match (same type, opposite folding edges)
        if (stain1.type === stain2.type && stain1.side !== stain2.side) {
          stainMatches++;
        }
      }
    }

    const n = activeSequence.length;
    const avgLsa = totalLsa / (n - 1);
    const scribePct = scribeContinuity / (n - 1);
    const stainPct = totalWaterStainEligible > 0 ? (stainMatches / totalWaterStainEligible) : 0;

    // Display sub-metrics
    lsaScoreVal.textContent = Math.round(avgLsa * 100) + '%';
    stainScoreVal.textContent = Math.round(stainPct * 100) + '%';
    scribeScoreVal.textContent = Math.round(scribePct * 100) + '%';
    
    stainMatchesCount.textContent = `${stainMatches} Stain Matches`;

    // Weighted Overall Score: 40% LSA, 40% Water Stains, 20% Scribe Continuity
    const overallScore = Math.round((avgLsa * 40) + (stainPct * 40) + (scribePct * 20));
    overallScoreEl.textContent = overallScore + '%';
    scoreFill.style.width = overallScore + '%';

    // Visual score color shift
    if (overallScore > 80) {
      overallScoreEl.className = 'text-lg font-extrabold text-emerald-400 font-mono-code';
      scoreFill.className = 'bg-gradient-to-r from-purple-500 to-emerald-400 h-full rounded-full transition-all duration-300';
    } else if (overallScore > 65) {
      overallScoreEl.className = 'text-lg font-extrabold text-amber-400 font-mono-code';
      scoreFill.className = 'bg-gradient-to-r from-purple-500 to-amber-400 h-full rounded-full transition-all duration-300';
    } else {
      overallScoreEl.className = 'text-lg font-extrabold text-purple-400 font-mono-code';
      scoreFill.className = 'bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-300';
    }
  }

  // --- Load Preset Order ---
  function loadPreset(presetName) {
    const activeQuireKey = document.getElementById('section-quire-selector').value;
    const sequences = quireSequences[activeQuireKey];
    if (!sequences || !sequences[presetName]) return;
    activeSequence = [...sequences[presetName]];
    renderDragList();
    calculateReorderingConsistency();
  }

  // --- Render Drag and Drop Card List ---
  function renderDragList() {
    folioDragList.innerHTML = '';
    const n = activeSequence.length;
    
    activeSequence.forEach((folio, idx) => {
      const card = document.createElement('div');
      card.draggable = true;
      card.dataset.folio = folio;
      card.dataset.index = idx;
      
      const scribe = statsData.folios[folio]?.[0]?.scribe || '1';
      const section = statsData.folios[folio]?.[0]?.section || 'Herbal';
      const stain = waterStainProfiles[folio];
      
      const imgUrl = imageMapData[folio] || '';
      const thumbHtml = imgUrl ? `<img src="${imgUrl}" class="w-8 h-11 object-cover rounded border border-purple-500/20 mr-2 shrink-0 bg-black/40" alt="${folio}">` : '';

      // Active state highlight style
      const activeClass = folio === currentFolio ? 'border-purple-500/70 bg-[#211942]/60' : 'border-purple-500/10 bg-[#16102f]/40';

      // Visual indicator for water stain profile
      let stainBadge = '';
      if (stain) {
        const sideColor = stain.side === 'right' ? 'border-r-pink-500' : 'border-l-pink-500';
        stainBadge = `<span class="w-2.5 h-4 border-2 ${sideColor} rounded-sm opacity-60" title="Water stain profile: ${stain.type} (${stain.side})"></span>`;
      }

      // Check if page fits its physical singulion partner symmetrically
      const partnerFolio = activeSequence[n - idx - 1];
      const isSymmetricMatch = conjunctPartners[folio] === partnerFolio || conjunctPartners[partnerFolio] === folio;
      const linkBadge = isSymmetricMatch ? 
        `<span class="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/20 shadow-sm" title="Bifolio Intact (Linked Symmetrically)">Intact</span>` : 
        `<span class="text-[8px] px-1.5 py-0.5 rounded bg-purple-500/5 text-purple-400/40 font-semibold border border-purple-500/5" title="Bifolio Split (Singulion Fractured)">Split</span>`;

      card.className = `drag-card p-2.5 rounded-xl border flex items-center justify-between transition-all hover:bg-[#1a1338]/40 ${activeClass}`;
      card.innerHTML = `
        <div class="flex items-center gap-2 pointer-events-none min-w-0 flex-grow">
          <div class="flex flex-col gap-0.5 items-center justify-center shrink-0 w-6">
            <span class="text-[10px] text-[#a79ebb] font-semibold font-mono-code">#${idx + 1}</span>
            <svg class="w-3 h-3 text-[#6e6485]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </div>
          ${thumbHtml}
          <div class="flex flex-col min-w-0">
            <span class="font-display font-extrabold text-sm text-white truncate">Folio ${folio}</span>
            <span class="text-[9px] text-[#6e6485] font-mono-code truncate">${section} | Scribe ${scribe}</span>
          </div>
        </div>

        <div class="flex items-center gap-2 pointer-events-none shrink-0">
          ${linkBadge}
          ${stainBadge}
          <span class="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono-code font-bold uppercase">f${folio}</span>
        </div>
      `;

      // Drag events
      card.addEventListener('dragstart', handleDragStart);
      card.addEventListener('dragover', handleDragOver);
      card.addEventListener('dragleave', handleDragLeave);
      card.addEventListener('drop', handleDrop);
      card.addEventListener('dragend', handleDragEnd);
      
      // Select click
      card.addEventListener('click', () => {
        loadFolio(folio);
      });

      folioDragList.appendChild(card);
    });

    // Update nesting diagram
    updateNestingMap();
  }

  // --- Render Singulion Nesting Map Folds ---
  function updateNestingMap() {
    const nestingMapEl = document.getElementById('nesting-map');
    if (!nestingMapEl) return;
    nestingMapEl.innerHTML = '';

    const n = activeSequence.length;
    const totalFolds = Math.floor(n / 2);
    
    for (let k = 0; k < totalFolds; k++) {
      const pageA = activeSequence[k];
      const pageB = activeSequence[n - k - 1];
      
      const isMatch = conjunctPartners[pageA] === pageB || conjunctPartners[pageB] === pageA;
      
      const foldRow = document.createElement('div');
      foldRow.className = 'flex justify-between items-center bg-black/25 px-2.5 py-1.5 rounded border transition-colors ';
      
      if (isMatch) {
        foldRow.className += 'border-emerald-500/20 text-emerald-400 shadow-sm shadow-emerald-500/5';
        foldRow.innerHTML = `
          <span class="font-bold flex items-center gap-1.5">
            <span class="text-[8px] bg-emerald-500/20 px-1 py-0.5 rounded text-emerald-300 font-bold uppercase tracking-wider">Intact</span>
            f${pageA}
          </span>
          <span class="text-emerald-500/25 font-mono-code font-bold">═════════════</span>
          <span class="font-bold">f${pageB}</span>
        `;
      } else {
        foldRow.className += 'border-purple-500/10 text-purple-400/40';
        foldRow.innerHTML = `
          <span class="flex items-center gap-1.5 font-semibold text-purple-400/50">
            <span class="text-[8px] bg-purple-500/10 px-1 py-0.5 rounded text-purple-400/30 uppercase tracking-wider">Split</span>
            f${pageA}
          </span>
          <span class="text-purple-500/10 font-mono-code">. . . . . . . .</span>
          <span class="font-semibold text-purple-400/50">f${pageB}</span>
        `;
      }
      nestingMapEl.appendChild(foldRow);
    }
  }

  // --- HTML5 Drag-and-Drop Handlers ---
  let dragSrcEl = null;

  function handleDragStart(e) {
    this.classList.add('dragging');
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.index);
  }

  function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    this.classList.add('bg-purple-950/20', 'border-purple-500/40');
    return false;
  }

  function handleDragLeave() {
    this.classList.remove('bg-purple-950/20', 'border-purple-500/40');
  }

  function handleDrop(e) {
    e.stopPropagation();
    if (dragSrcEl !== this) {
      const srcIdx = parseInt(e.dataTransfer.getData('text/plain'));
      const destIdx = parseInt(this.dataset.index);
      
      // Swap positions in active sequence array
      const dragged = activeSequence.splice(srcIdx, 1)[0];
      activeSequence.splice(destIdx, 0, dragged);
      
      // Render and update metrics
      renderDragList();
      calculateReorderingConsistency();
    }
    return false;
  }

  function handleDragEnd() {
    this.classList.remove('dragging');
    document.querySelectorAll('.drag-card').forEach(c => {
      c.classList.remove('bg-purple-950/20', 'border-purple-500/40');
    });
  }

  // --- Load and Display Selected Folio ---
  function loadFolio(folio) {
    currentFolio = folio;
    
    // Highlight selected card in sidebar
    document.querySelectorAll('.drag-card').forEach(card => {
      if (card.dataset.folio === folio) {
        card.className = card.className.replace('border-purple-500/10 bg-[#16102f]/40', 'border-purple-500/70 bg-[#211942]/60');
      } else {
        card.className = card.className.replace('border-purple-500/70 bg-[#211942]/60', 'border-purple-500/10 bg-[#16102f]/40');
      }
    });

    // Update folio scan image
    let imgUrl = imageMapData[folio] || '';
    if (!imgUrl) {
      // Fallback for foldout panels like 67r1 -> 67r
      const baseFolio = folio.replace(/[1-4]$/, '');
      imgUrl = imageMapData[baseFolio] || '';
    }
    
    // Scale up from thumbnail resolution (300,450) to crisp mid-resolution (1000,)
    const midResUrl = imgUrl ? imgUrl.replace('/!300,450/', '/1000,/') : '';

    const scanImgEl = document.getElementById('viewer-scan-img');
    if (scanImgEl) {
      if (midResUrl) {
        scanImgEl.src = midResUrl;
        scanImgEl.classList.remove('opacity-0');
      } else {
        scanImgEl.src = '';
        scanImgEl.classList.add('opacity-0');
      }
    }

    const lines = statsData.folios[folio] || [];
    const firstLine = lines[0] || {};
    
    // Update headers
    viewerFolioTitle.textContent = `Folio ${folio}`;
    viewerSectionTag.textContent = firstLine.section || 'Herbal';
    viewerScribeTag.textContent = firstLine.scribe || 'Scribe 1';
    
    // Clear transcription panel
    transcriptionViewer.innerHTML = '';

    // Render line stacks
    lines.forEach((line, lineIdx) => {
      const lineBlock = document.createElement('div');
      lineBlock.className = 'mb-6 flex flex-col gap-1.5 border-b border-purple-500/5 pb-4 last:border-b-0';

      const lineNum = document.createElement('span');
      lineNum.className = 'text-[9px] uppercase tracking-wider text-[#6e6485] font-mono-code block mb-1';
      lineNum.textContent = `Line ${lineIdx + 1}`;
      lineBlock.appendChild(lineNum);

      // Stacks wrapper
      const stacks = document.createElement('div');
      stacks.className = 'flex flex-col gap-1';

      // 1. EVA Transcription (Interactive word-by-word)
      if (line.eva) {
        const evaRow = document.createElement('div');
        evaRow.className = 'flex flex-wrap gap-2 items-center';
        
        line.eva.replace(/,/g, ' ').replace(/\./g, ' ').split(/\s+/).forEach(wordText => {
          if (!wordText) return;
          
          const wordSpan = document.createElement('span');
          wordSpan.className = 'word-capsule bg-[#1c1737] border border-purple-500/20 text-[#f1ecff] rounded-md px-2 py-0.5 font-mono-code font-bold text-sm shadow-sm';
          wordSpan.textContent = wordText;
          
          // Hover detail
          wordSpan.addEventListener('mouseenter', () => {
            showWordDetails(wordText);
          });
          
          // Click to Speak vocalization
          wordSpan.addEventListener('click', () => {
            speakWord(wordText);
            // Flash color animation
            wordSpan.classList.add('bg-purple-600', 'border-purple-400');
            setTimeout(() => {
              wordSpan.classList.remove('bg-purple-600', 'border-purple-400');
            }, 300);
          });

          evaRow.appendChild(wordSpan);
        });
        
        stacks.appendChild(evaRow);
      }

      // 2. Phonetic Transliteration (Bax Sounds)
      if (line.bax) {
        const phonRow = document.createElement('div');
        phonRow.className = 'text-xs font-mono-code text-pink-400 font-medium pl-1';
        phonRow.textContent = `[Phonetic: ${line.bax}]`;
        stacks.appendChild(phonRow);
      }

      // 3. Claston v101 representation
      if (line.v101) {
        const v101Row = document.createElement('div');
        v101Row.className = 'text-xs font-mono-code text-[#6e6485] pl-1';
        v101Row.textContent = `[v101: ${line.v101}]`;
        stacks.appendChild(v101Row);
      }

      lineBlock.appendChild(stacks);
      transcriptionViewer.appendChild(lineBlock);
    });
  }

  // --- Display Word Details on Hover ---
  function showWordDetails(word) {
    const cleanWord = word.toLowerCase();
    const split = splitWord(cleanWord);
    const phon = translateEvaToBaxSpelling(cleanWord);

    wordDetailPanel.classList.remove('hidden');
    wordDetailPanel.classList.add('flex');

    detailWord.textContent = cleanWord;
    detailFreq.textContent = `Freq: ${split.frequency || '-'}`;
    
    detailPrefix.textContent = split.prefix || '[none]';
    detailRoot.textContent = split.root;
    detailSuffix.textContent = split.suffix || '[none]';
    
    // Display phonetics
    detailBax.textContent = `/${phon}/`;
    detailNotes.textContent = split.notes || 'Spelled according to typical morphological configurations.';

    // Speak details setup
    detailSpeakBtn.onclick = () => {
      speakWord(cleanWord);
    };
  }

  // --- UI Sandbox Wiring ---
  function initUI() {
    // Presets select
    presetSelector.addEventListener('change', (e) => {
      loadPreset(e.target.value);
    });

    // Section / Quire Selector
    const sectionQuireSelector = document.getElementById('section-quire-selector');
    sectionQuireSelector.addEventListener('change', () => {
      presetSelector.value = 'standard';
      loadPreset('standard');
      if (activeSequence.length > 0) {
        loadFolio(activeSequence[0]);
      }
    });

    // Rate & Pitch sliders updates
    rateSlider.addEventListener('input', (e) => {
      rateVal.textContent = parseFloat(e.target.value).toFixed(1) + 'x';
    });
    pitchSlider.addEventListener('input', (e) => {
      pitchVal.textContent = parseFloat(e.target.value).toFixed(1);
    });

    // Vocalizer test button
    vocalizerSpeakBtn.addEventListener('click', () => {
      const text = vocalizerInput.value.trim();
      if (text) speakWord(text);
    });

    // Alignment test button
    alignmentBtn.addEventListener('click', runSequenceAlignment);

    // --- High-Resolution Scan Lightbox Zoom/Pan Handlers ---
    const scanImgEl = document.getElementById('viewer-scan-img');
    const zoomModal = document.getElementById('scan-zoom-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalScanImg = document.getElementById('modal-scan-img');
    const modalImgContainer = document.getElementById('modal-img-container');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const zoomResetBtn = document.getElementById('zoom-reset-btn');
    const zoomLevelText = document.getElementById('zoom-level-text');

    let scale = 1.0;
    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let startX = 0;
    let startY = 0;

    function updateModalTransform() {
      modalScanImg.style.transform = `scale(${scale}) translate(${panX}px, ${panY}px)`;
      zoomLevelText.textContent = Math.round(scale * 100) + '%';
    }

    // Open Modal
    scanImgEl.addEventListener('click', () => {
      const currentSrc = scanImgEl.src;
      if (!currentSrc) return;
      
      // Upgrade from mid-resolution (1000,) to high-resolution (1600,) for the zoom lightbox
      const highResUrl = currentSrc.replace('/1000,/', '/1600,/');
      modalScanImg.src = highResUrl;
      
      // Remove hidden and animate opacity in
      zoomModal.classList.remove('hidden');
      zoomModal.classList.add('flex');
      
      // Delay slightly for transition
      setTimeout(() => {
        zoomModal.classList.remove('opacity-0');
        zoomModal.classList.add('opacity-100');
      }, 50);
      
      // Reset zoom
      scale = 1.0;
      panX = 0;
      panY = 0;
      updateModalTransform();
    });

    // Close Modal
    function closeModal() {
      zoomModal.classList.remove('opacity-100');
      zoomModal.classList.add('opacity-0');
      
      setTimeout(() => {
        zoomModal.classList.remove('flex');
        zoomModal.classList.add('hidden');
      }, 300);
    }

    modalCloseBtn.addEventListener('click', closeModal);
    zoomModal.addEventListener('click', (e) => {
      // Close if clicking outside the image and controls
      if (e.target === zoomModal || e.target === modalImgContainer) {
        closeModal();
      }
    });

    // Zoom Controls
    zoomInBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (scale < 4.0) {
        scale += 0.25;
        updateModalTransform();
      }
    });

    zoomOutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (scale > 0.5) {
        scale -= 0.25;
        updateModalTransform();
      }
    });

    zoomResetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      scale = 1.0;
      panX = 0;
      panY = 0;
      updateModalTransform();
    });

    // Grab-to-Pan Event Listeners
    modalImgContainer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (scale <= 1.0 && panX === 0 && panY === 0) return; // Only pan if zoomed or already panned
      isPanning = true;
      startX = e.clientX - panX * scale;
      startY = e.clientY - panY * scale;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      panX = (e.clientX - startX) / scale;
      panY = (e.clientY - startY) / scale;
      updateModalTransform();
    });

    window.addEventListener('mouseup', () => {
      isPanning = false;
    });
  }

  // --- Needleman-Wunsch Sequence Alignment Solver ---
  function runSequenceAlignment() {
    const vmsWord = alignVmsInput.value.trim().toLowerCase();
    const natWord = alignNatInput.value.trim().toLowerCase();
    
    if (!vmsWord || !natWord) return;

    // Treat loop overhead modifier 'h' as diacritic vowel pointing
    // We collapse composite sequences into base glyphs to align phonetically
    const vmsParsed = vmsWord
      .replace(/ch/g, 'c*')
      .replace(/sh/g, 's*')
      .replace(/ct/g, 't*')
      .replace(/cp/g, 'p*')
      .replace(/ck/g, 'k*')
      .replace(/h/g, '*'); 

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
        if (vChar === nChar) {
          score = matchScore;
        } else if (vChar === '*' && 'aeiouy'.includes(nChar)) {
          // loop diacritic aligns with candidate vowel pointing!
          score = matchScore; 
        } else if (vChar === 'c' && (nChar === 'c' || nChar === 'k' || nChar === 'q')) {
          score = matchScore - 0.5; // partial sound match
        } else if (vChar === 'd' && (nChar === 'd' || nChar === 't')) {
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
    alignmentOutput.classList.remove('hidden');
    alignmentOutput.classList.add('flex');
    alignScoreEl.textContent = dp[n][m];

    // Visual grid
    alignVisualGrid.innerHTML = '';
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

      if (v === n && v !== '-') {
        vCell.className += 'bg-emerald-950/40 border-emerald-500 text-emerald-300';
        nCell.className += 'bg-emerald-950/40 border-emerald-500 text-emerald-300';
        connector.textContent = '│';
        connector.className += 'text-emerald-400';
      } else if (v === '*' && 'aeiouy'.includes(n)) {
        vCell.className += 'bg-pink-950/40 border-pink-500 text-pink-300';
        nCell.className += 'bg-pink-950/40 border-pink-500 text-pink-300';
        vCell.textContent = '◌';
        connector.textContent = '↕';
        connector.className += 'text-pink-400 font-bold';
      } else if (v === '-' || n === '-') {
        vCell.className += 'bg-purple-950/10 border-purple-500/10 text-[#6e6485]';
        nCell.className += 'bg-purple-950/10 border-purple-500/10 text-[#6e6485]';
        connector.textContent = ' ';
      } else {
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

    alignVisualGrid.appendChild(row1);
    alignVisualGrid.appendChild(row2);
    alignVisualGrid.appendChild(row3);
  }

  // --- Edith Sherwood Decoded Anagrams Mapping ---
  const sherwoodIdentifications = {
  "2v": "Nenufar, waterlily",
  "3r": "Salvia officinalis; sage",
  "3v": "Bird\u2019s foot trefoil",
  "4r": "Sumac",
  "4v": "Campanula rotundifolia, rampion",
  "5v": "Mallow, malva",
  "6r": "Acanthus",
  "7r": "Plantago media",
  "7v": "Laurus nobilis, bay laurel",
  "8v": "Alkanet, bugloss",
  "9r": "Wolfsbane",
  "9v": "Viola tricolor",
  "11r": "Sedum dasyphyllum, stonewort",
  "13r": "Petasites ovatus, butterbur",
  "13v": "European tree nettle",
  "15v": "Aconitum pardalianches, herb Paris",
  "18r": "Wallflower",
  "19v": "Armeria maritime, thrift",
  "22v": "Turnip",
  "23r": "Cranebill, geranium",
  "23v": "Borage",
  "26v": "Lentil bean",
  "27r": "Spinach",
  "28r": "Mertensia maritima, oyster plant",
  "28v": "Calendula",
  "29r": "Lettuce",
  "31v": "Caraway",
  "33v": "Crowfoot",
  "34r": "Laureola, laurel",
  "34v": "Nasturtium officinale, watercress",
  "35v": "Flowering kale",
  "36r": "Sanicula europaea, sanicle",
  "36v": "Lamium amplexicaule, dead nettle",
  "37v": "Angallis coerculea, pimpernel",
  "39r": "Garlic",
  "41v": "Apium graveolenso, celery",
  "43v": "Millet",
  "44v": "Rhubarb",
  "46v": "Geum ubanum, wood avens, coleworts",
  "47r": "Houseleek",
  "47v": "Lungwort",
  "48v": "Chelidonium majus, celandine",
  "49r": "Egyptian bean, Nelumbo nucifera, lotus",
  "49v": "Duckweed, Eichhornia crassipes",
  "51v": "Reseda luteola, weld",
  "52r": "Levisticum officinale, garden lovage",
  "54r": "Thistle",
  "54v": "Rumex acetosa, dock weed",
  "55v": "Sicilian purple broccoli",
  "65r": "Coriander/cilantro, Chinese parsley",
  "66v": "Totally Vet",
  "87r": "Synphytum officale, comfrey",
  "87v left": "Cowslip",
  "87v right": "Tanacetum vulgare, tansy",
  "90v1": "Crambe maritima, sea kale",
  "93r": "Rhodiola rosea",
  "94r": "Pedicularis, lousewort",
  "94v": "Crow garlic",
  "95r1": "liquorice",
  "95r2": "leek",
  "96r": "Helebore",
  "1v": "Euphrasia rostkoviana",
  "2r": "Centaurea jacea",
  "5r": "Caper",
  "6v": "Caster oil tree",
  "8r": "pea plant",
  "10r": "Chicory",
  "11v": "Artichoke",
  "14r": "Sage",
  "14v": "Betony",
  "15r": "Sonchus, sow thistle",
  "16r": "Bedstraw, Galium",
  "16v": "Dracontea, taragon",
  "17v": "Chickpea",
  "20r": "Polygala vulgare",
  "20v": "Carduus thistle",
  "21r": "Pepperwort",
  "21v": "Anthriscus cerefolium, chervil",
  "24r": "Cucumber",
  "24v": "Lunaria annua",
  "25r": "Ruta graveolens",
  "25v": "Woad",
  "26r": "Radish",
  "27v": "Marigold",
  "29v": "Nigella",
  "30r": "Diospyros, lotus date plum, purple persimmon",
  "30v": "Urtica dioeca, nettle",
  "31r": "Arbutus unedo, Strawberry tree",
  "32v": "Galium odorata, crosswort",
  "35r": "Flowering kale",
  "37r": "Euphorbia, spurge",
  "38r": "Bracken frond",
  "38v": "Sedum vulgare, wall pepper",
  "39v": "Senecio jacobaea, ragwort",
  "40r": "Primula minima, cowslip",
  "40v": "Orobach, broomrape",
  "41r": "Oregano",
  "42r bottom": "Red leaf sorrel, clover",
  "42r top": "Sorrel",
  "43r": "Sneezewort",
  "44r": "Madragola, mandrake",
  "45r": "Orach",
  "45v": "Polygala vulgare, milkwort",
  "48r": "Adonis Varnalis, cranebill",
  "50r": "Astragalus glycyphyllus, great masterwort",
  "50v": "Soldanella pulsatilla",
  "51r": "Cakile maritima, European sea rocket",
  "52v": "Heliotrope, Pseudo Antonio Musa",
  "53r": "Bramble",
  "55r": "Sicilian purple broccoli",
  "57r": "Madder",
  "65v": "Linum, flax",
  "90r1": "Black henbane",
  "90r2": "Balm, Melissa officinalis",
  "90v2": "dictone, fleabane",
  "95v1": "Aconitum, wolfbane",
  "95v2": "Rosa, rose",
  "96v": "soya bean vine",
  "88v top left": "Pigweed",
  "88v 2nd row left": "Bay laurel leaves",
  "88v 2nd row right": "Humulus lupulus, hops",
  "89v1 top": "Clary, sage"
};

  // --- Proposed Botanical Identifications Database ---
  const botanicalDatabase = [
    {
      folio: '2r',
      latinName: 'Coriandrum sativum',
      commonName: 'Coriander',
      attribution: 'Stephen Bax',
      modernImg: 'images/modern/coriander.jpg',
      flowers: 'Multiple white umbel inflorescence clusters, small five-petaled structure.',
      leaves: 'Finely dissected compound segments, pinnate/lobate towards stem base.',
      roots: 'Stylized two-pronged vertical root base in manuscript, corresponding to single taproot in modern plants.'
    },
    {
      folio: '9v',
      latinName: 'Viola tricolor',
      commonName: 'Wild Pansy / Heartsease',
      attribution: 'Stephen Bax',
      modernImg: 'images/modern/pansy.jpg',
      flowers: 'Five-petaled asymmetrical flowers, tri-colored violet, yellow, and white petals.',
      leaves: 'Ovate/oblong leaves with crenate margins and large pinnately-lobed stipules.',
      roots: 'Manuscript shows clustered primary root stems, whereas modern pansies have a fibrous taproot system.'
    },
    {
      folio: '15v',
      latinName: 'Ricinus communis',
      commonName: 'Castor Oil Plant',
      attribution: 'Arthur Tucker',
      modernImg: 'images/modern/castor_oil.jpg',
      flowers: 'Spiny capsule-like seed pods, clustered red/green inflorescence structures.',
      leaves: 'Large, palmate leaves with 5–12 deep lobes and serrate margins.',
      roots: 'Thick, tuber-like geometric roots in Voynich, symbolizing its high seed oil and toxic ricin content.'
    },
    {
      folio: '25v',
      latinName: 'Cannabis sativa',
      commonName: 'Hemp / Cannabis',
      attribution: 'Hugh O\'Neill',
      modernImg: 'images/modern/hemp.jpg',
      flowers: 'Small greenish clusters in axils, typical of wind-pollinated flowers.',
      leaves: 'Palmate leaves with 3–9 serrated leaflets.',
      roots: 'Clustered fibrous root system depicted geometrically as interlocking fibers.'
    },
    {
      folio: '33v',
      latinName: 'Nymphaea alba',
      commonName: 'White Water Lily',
      attribution: 'Arthur Tucker',
      modernImg: 'images/modern/water_lily.jpg',
      flowers: 'Large multi-petaled white cup-like flowers floating on water.',
      leaves: 'Wide, round, cordate floating lily pads with smooth margins.',
      roots: 'Manuscript shows thick horizontal rhizomes (roots), matching water-lily bottom-dwelling biology.'
    },
    {
      folio: '35r',
      latinName: 'Centauria',
      commonName: 'Centaury',
      attribution: 'Stephen Bax',
      modernImg: 'images/modern/centaury.jpg',
      flowers: 'Dense head of small pinkish-purple star-shaped flowers.',
      leaves: 'Ovate opposite lanceolate leaf patterns along a slender vertical stem.',
      roots: 'Delicate branching roots matched with slender vertical taproot in modern centaury.'
    },
    {
      folio: '41r',
      latinName: 'Atropa belladonna',
      commonName: 'Belladonna',
      attribution: 'Arthur Tucker',
      modernImg: 'images/modern/belladonna.jpg',
      flowers: 'Dull-purple bell-shaped flowers hanging singly in axils.',
      leaves: 'Ovate leaves, unequal in pairs, with smooth margins.',
      roots: 'Stylized zoomorphic or animal-shaped roots in manuscript, hinting at its legendary toxic powers.'
    },
    {
      folio: '49v',
      latinName: 'Artemisia',
      commonName: 'Wormwood / Mugwort',
      attribution: 'Stephen Bax',
      modernImg: 'images/modern/wormwood.jpg',
      flowers: 'Tiny, inconspicuous wind-pollinated flower heads (capitula).',
      leaves: 'Deeply lobed pinnatisect leaves with silver-white hairs underneath.',
      roots: 'Interlocking woody rhizome system in manuscript drawings.'
    },
    {
      folio: '55v',
      latinName: 'Punica granatum',
      commonName: 'Pomegranate',
      attribution: 'Arthur Tucker',
      modernImg: 'images/modern/pomegranate.jpg',
      flowers: 'Bright red, bell-shaped flowers leading to leathery red round fruit.',
      leaves: 'Glossy, narrow oblong leaves, opposite or in clusters.',
      roots: 'Stylized branch-like vertical root base in manuscript.'
    },
    {
      folio: '65r',
      latinName: 'Dracunculus vulgaris',
      commonName: 'Dragon Arum',
      attribution: 'Stephen Bax',
      modernImg: 'images/modern/dragon_arum.jpg',
      flowers: 'Large dark-purple spathe surrounding a slender black spadix (carrion flower).',
      leaves: 'Palmate leaves with white-mottled spots along the leaf lobes.',
      roots: 'Manuscript depicts a snake-like root matching the "dragon/snake arum" nickname.'
    },
    {
      folio: '16r',
      latinName: 'Juniperus communis',
      commonName: 'Juniper',
      attribution: 'Arthur Tucker',
      modernImg: 'images/modern/juniper.jpg',
      flowers: 'Small cone-like flowers; female cones ripen into berry-like blue seeds.',
      leaves: 'Needle-like evergreen leaves arranged in whorls of three.',
      roots: 'Thin, sprawling root fibers reflecting sandy/rocky dry soil juniper adaptation.'
    },
    {
      folio: '93r',
      latinName: 'Papaver somniferum',
      commonName: 'Opium Poppy',
      attribution: 'Stephen Bax',
      modernImg: 'images/modern/poppy.jpg',
      flowers: 'Large four-petaled white or violet flowers with center capsule.',
      leaves: 'Glaucous, clasping, serrated leaves along a thick milky stem.',
      roots: 'Manuscript shows detailed, sprawling fibrous root networks.'
    }
  ];

  let currentBotanicalItem = null;
  let uploadedImageElement = null;

  // Dynamic Botanical List Generator
  let fullBotanicalDatabase = [];

  function initBotanicalDatabase() {
    // Helper to determine if a key is in the herbal sections
    function isHerbalKey(key) {
      const matches = key.match(/\d+/g);
      if (!matches) return false;
      return matches.some(numStr => {
        const num = parseInt(numStr, 10);
        return (num >= 1 && num <= 66) || (num >= 87 && num <= 102);
      });
    }

    // Helper to parse Sherwood names
    function parseSherwoodName(nameStr) {
      if (!nameStr) return null;
      let latin = "Botanical species";
      let common = nameStr;
      if (nameStr.includes(";")) {
        const parts = nameStr.split(";");
        latin = parts[0].trim();
        common = parts[1].trim();
      } else if (nameStr.includes(",")) {
        const parts = nameStr.split(",");
        latin = parts[0].trim();
        common = parts[1].trim();
      }
      return { latin, common };
    }

    fullBotanicalDatabase = [];

    Object.keys(imageMapData).forEach(key => {
      if (isHerbalKey(key)) {
        // Find static match (visual proposal)
        const staticEntry = botanicalDatabase.find(x => x.folio === key);
        
        // Find Sherwood match (anagram proposal)
        let sherwoodName = sherwoodIdentifications[key];
        if (!sherwoodName) {
          // Fallback for compound keys like "88v and 89r"
          const parts = key.split(/and|\+/g);
          for (let p of parts) {
            const cleanP = p.trim().replace(/\(part\)/g, '').trim();
            if (sherwoodIdentifications[cleanP]) {
              sherwoodName = sherwoodIdentifications[cleanP];
              break;
            }
          }
        }

        const sherwoodInfo = parseSherwoodName(sherwoodName);
        
        // Only include if there is a proposed plant correspondence
        if (staticEntry || sherwoodInfo) {
          // Build proposals array
          const proposals = [];
          if (staticEntry) {
            proposals.push({
              type: 'visual',
              commonName: staticEntry.commonName,
              latinName: staticEntry.latinName,
              attribution: staticEntry.attribution,
              flowers: staticEntry.flowers,
              leaves: staticEntry.leaves,
              roots: staticEntry.roots
            });
          }
          if (sherwoodInfo) {
            proposals.push({
              type: 'anagram',
              commonName: sherwoodInfo.common.replace(/\b\w/g, c => c.toUpperCase()),
              latinName: sherwoodInfo.latin,
              attribution: 'Edith Sherwood',
              flowers: 'Proposed by Edith Sherwood based on anagram decipherment of the folio\'s Italian text labels.',
              leaves: 'Foliage and leaves are aligned with the identified species under her medieval Florence/Tuscany linguistic model.',
              roots: 'Roots are matched with historical 15th-century herbal illustrations like the Materia Medica.'
            });
          }

          // Determine main display names (sidebar)
          let mainCommon = proposals[0].commonName;
          let mainLatin = proposals[0].latinName;
          if (proposals.length > 1) {
            mainCommon = `${proposals[0].commonName} / ${proposals[1].commonName}`;
            mainLatin = `${proposals[0].latinName} / ${proposals[1].latinName}`;
          }

          fullBotanicalDatabase.push({
            folio: key,
            latinName: mainLatin,
            commonName: mainCommon,
            proposals: proposals
          });
        }
      }
    });

    // Sort the full database in order of folio numbers
    function parseFolioNum(folioStr) {
      const num = parseInt(folioStr);
      const suffix = folioStr.includes('v') ? 'v' : 'r';
      return num * 2 + (suffix === 'v' ? 1 : 0);
    }
    
    fullBotanicalDatabase.sort((a, b) => parseFolioNum(a.folio) - parseFolioNum(b.folio));
  }

  // Tab Elements
  const tabCollation = document.getElementById('tab-collation');
  const tabBotanical = document.getElementById('tab-botanical');
  const collationWorkspace = document.getElementById('collation-workspace');
  const botanicalWorkspace = document.getElementById('botanical-workspace');

  // Wire Tab Switching
  if (tabCollation && tabBotanical) {
    tabCollation.addEventListener('click', () => {
      tabCollation.className = 'px-3 py-1 rounded-md text-[11px] font-semibold font-display transition duration-200 bg-purple-600 text-white shadow-sm';
      tabBotanical.className = 'px-3 py-1 rounded-md text-[11px] font-semibold font-display transition duration-200 text-[#a79ebb] hover:text-white hover:bg-white/5';
      collationWorkspace.classList.remove('hidden');
      botanicalWorkspace.classList.add('hidden');
    });

    tabBotanical.addEventListener('click', () => {
      tabBotanical.className = 'px-3 py-1 rounded-md text-[11px] font-semibold font-display transition duration-200 bg-purple-600 text-white shadow-sm';
      tabCollation.className = 'px-3 py-1 rounded-md text-[11px] font-semibold font-display transition duration-200 text-[#a79ebb] hover:text-white hover:bg-white/5';
      collationWorkspace.classList.add('hidden');
      botanicalWorkspace.classList.remove('hidden');
      
      // Load first card if none active
      if (!currentBotanicalItem) {
        loadBotanicalItem(fullBotanicalDatabase[0].folio);
      }
    });
  }

  // Botanical Search Filter
  const botSearchInput = document.getElementById('botanical-search');
  if (botSearchInput) {
    botSearchInput.addEventListener('input', renderBotanicalList);
  }

  // Render Botanical grid list
  function renderBotanicalList() {
    const listEl = document.getElementById('herbal-cards-list');
    if (!listEl) return;
    const searchVal = botSearchInput ? botSearchInput.value.toLowerCase() : '';
    listEl.innerHTML = '';

    fullBotanicalDatabase.forEach(item => {
      if (searchVal && 
          !item.commonName.toLowerCase().includes(searchVal) && 
          !item.latinName.toLowerCase().includes(searchVal) && 
          !item.folio.toLowerCase().includes(searchVal)) {
        return;
      }

      const card = document.createElement('div');
      const isActive = currentBotanicalItem && currentBotanicalItem.folio === item.folio;
      const activeClass = isActive ? 'border-emerald-500/70 bg-[#162722]/60' : 'border-purple-500/10 bg-[#16102f]/40';
      
      const imgUrl = imageMapData[item.folio] || '';
      const thumbHtml = imgUrl ? `<img src="${imgUrl}" class="w-8 h-11 object-cover rounded border border-purple-500/20 mr-2 shrink-0 bg-black/40" alt="${item.folio}">` : '';

      card.className = `drag-card p-2.5 rounded-xl border flex items-center justify-between transition-all hover:bg-[#1a1338]/40 cursor-pointer ${activeClass}`;
      card.innerHTML = `
        <div class="flex items-center gap-2 min-w-0 flex-grow pointer-events-none">
          ${thumbHtml}
          <div class="flex flex-col min-w-0">
            <span class="font-display font-extrabold text-sm text-white truncate">${item.commonName}</span>
            <span class="text-[9px] text-[#6e6485] font-mono-code truncate italic">${item.latinName}</span>
          </div>
        </div>
        <div class="flex items-center shrink-0 ml-2 pointer-events-none">
          <span class="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono-code font-bold uppercase font-display">f${item.folio}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        loadBotanicalItem(item.folio);
      });

      listEl.appendChild(card);
    });
  }

  // Load a botanical item details
  // Mapping of common/latin plant names to local high-res modern assets
  const plantImages = {
    "coriander": "images/modern/coriander.jpg",
    "coriandrum sativum": "images/modern/coriander.jpg",
    "pansy": "images/modern/pansy.jpg",
    "viola tricolor": "images/modern/pansy.jpg",
    "castor oil": "images/modern/castor_oil.jpg",
    "ricinus communis": "images/modern/castor_oil.jpg",
    "hemp": "images/modern/hemp.jpg",
    "cannabis sativa": "images/modern/hemp.jpg",
    "water lily": "images/modern/water_lily.jpg",
    "waterlily": "images/modern/water_lily.jpg",
    "nymphaea alba": "images/modern/water_lily.jpg",
    "nenufar": "images/modern/water_lily.jpg",
    "centaury": "images/modern/centaury.jpg",
    "centaurium erythraea": "images/modern/centaury.jpg",
    "belladonna": "images/modern/belladonna.jpg",
    "atropa belladonna": "images/modern/belladonna.jpg",
    "wormwood": "images/modern/wormwood.jpg",
    "artemisia": "images/modern/wormwood.jpg",
    "artemisia vulgaris": "images/modern/wormwood.jpg",
    "pomegranate": "images/modern/pomegranate.jpg",
    "punica granatum": "images/modern/pomegranate.jpg",
    "dragon arum": "images/modern/dragon_arum.jpg",
    "dracunculus vulgaris": "images/modern/dragon_arum.jpg",
    "juniper": "images/modern/juniper.jpg",
    "juniperus communis": "images/modern/juniper.jpg",
    "poppy": "images/modern/poppy.jpg",
    "papaver somniferum": "images/modern/poppy.jpg"
  };

  function getModernImage(commonName, latinName, type) {
    // 1. If it's an anagram type, try loading its custom scraped image first!
    if (type === 'anagram') {
      const rawName = (latinName === 'Botanical species' || !latinName) ? commonName : `${latinName}, ${commonName}`;
      let safeName = rawName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      safeName = safeName.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
      return `images/modern/${safeName}.jpg`;
    }

    // 2. Otherwise fall back to the 12 core plants mapping
    const nameLower = ((commonName || '') + ' ' + (latinName || '')).toLowerCase();
    for (const key of Object.keys(plantImages)) {
      if (nameLower.includes(key)) {
        return plantImages[key];
      }
    }
    return '';
  }

  let activeProposalIdx = 0;

  function loadBotanicalItem(folio, proposalIndex = 0) {
    const item = fullBotanicalDatabase.find(x => x.folio === folio);
    if (!item) return;

    currentBotanicalItem = item;
    renderBotanicalList();

    if (proposalIndex >= item.proposals.length) {
      proposalIndex = 0;
    }
    activeProposalIdx = proposalIndex;

    const prop = item.proposals[proposalIndex];

    // Map tags
    document.getElementById('botanical-folio-title').textContent = `Folio ${item.folio}`;
    document.getElementById('botanical-proposed-tag').textContent = `${prop.commonName}`;
    document.getElementById('botanical-latin-title').textContent = prop.latinName;
    document.getElementById('botanical-attribution-tag').textContent = prop.attribution;

    // Set styling for proposed tags
    const proposedTag = document.getElementById('botanical-proposed-tag');
    if (prop.latinName === 'Incertae sedis') {
      proposedTag.className = 'px-2 py-0.5 rounded text-[10px] bg-purple-500/15 border border-purple-500/30 text-purple-300 font-semibold uppercase';
    } else if (prop.type === 'visual') {
      proposedTag.className = 'px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold uppercase';
    } else {
      proposedTag.className = 'px-2 py-0.5 rounded text-[10px] bg-[#6366f1]/20 border border-[#6366f1]/40 text-[#a5b4fc] font-semibold uppercase';
    }

    // Render interactive proposal tabs if there are multiple proposals
    const tabsContainer = document.getElementById('botanical-proposals-tabs');
    if (tabsContainer) {
      if (item.proposals.length > 1) {
        tabsContainer.classList.remove('hidden');
        tabsContainer.innerHTML = '';
        item.proposals.forEach((p, idx) => {
          const btn = document.createElement('button');
          const isSel = idx === proposalIndex;
          btn.className = `px-2.5 py-1 text-[9px] rounded font-semibold font-mono-code transition duration-200 ${
            isSel 
              ? 'bg-purple-600/30 border border-purple-500/50 text-purple-200' 
              : 'bg-black/20 hover:bg-black/40 border border-purple-500/10 text-[#a79ebb] hover:text-white'
          }`;
          const label = p.type === 'visual' ? `Visual: ${p.commonName}` : `Anagram: ${p.commonName}`;
          btn.textContent = label;
          btn.addEventListener('click', () => {
            loadBotanicalItem(folio, idx);
          });
          tabsContainer.appendChild(btn);
        });
      } else {
        tabsContainer.classList.add('hidden');
        tabsContainer.innerHTML = '';
      }
    }

    // Map morphological details
    document.getElementById('morph-flowers').textContent = prop.flowers;
    document.getElementById('morph-leaves').textContent = prop.leaves;
    document.getElementById('morph-roots').textContent = prop.roots;

    // Load scans
    const lowResUrl = imageMapData[item.folio] || '';
    const midResUrl = lowResUrl ? lowResUrl.replace('/!300,450/', '/1000,/') : '';
    
    const scanImg = document.getElementById('botanical-scan-img');
    const modernImg = document.getElementById('botanical-modern-img');
    const placeholderEl = document.getElementById('botanical-modern-placeholder');

    if (scanImg) {
      scanImg.crossOrigin = "anonymous";
      if (midResUrl) {
        scanImg.src = midResUrl;
        scanImg.classList.remove('opacity-0');
      } else {
        scanImg.src = '';
        scanImg.classList.add('opacity-0');
      }
    }

    // Determine modern image path based on active proposal
    const activeModernImg = getModernImage(prop.commonName, prop.latinName, prop.type);

    if (modernImg) {
      modernImg.onerror = () => {
        modernImg.classList.add('opacity-0');
        modernImg.classList.add('hidden');
        if (placeholderEl) {
          // If we show placeholder, update its text to inform about offline/fallback status
          placeholderEl.querySelector('span').textContent = 'Reference Photo Offline';
          placeholderEl.querySelector('p').innerHTML = `Modern image for <b>${prop.commonName}</b> is currently downloading from Wikipedia in the background. Refresh in a moment, or upload a candidate photo in the CV Panel!`;
          placeholderEl.classList.remove('hidden');
        }
      };

      if (activeModernImg) {
        if (placeholderEl) placeholderEl.classList.add('hidden');
        modernImg.src = activeModernImg;
        modernImg.classList.remove('opacity-0');
        modernImg.classList.remove('hidden');
      } else {
        modernImg.src = '';
        modernImg.classList.add('opacity-0');
        modernImg.classList.add('hidden');

        // Create or show custom placeholder
        const isIdentified = prop.latinName !== 'Incertae sedis';
        const titleText = isIdentified ? 'Proposed Modern Counterpart' : 'Unidentified Plant Specimen';
        const descText = isIdentified 
          ? `Edith Sherwood proposed that this drawing represents: <b>${prop.commonName}</b> (<i>${prop.latinName}</i>). Upload a candidate photo in the CV Panel to align contours.`
          : 'No agreed modern botanical counterpart has been proposed for this page. Upload a candidate photo in the CV Panel to test alignment.';

        if (!placeholderEl) {
          const placeholder = document.createElement('div');
          placeholder.id = 'botanical-modern-placeholder';
          placeholder.className = 'absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#090515] border border-dashed border-purple-500/20 m-4 rounded-xl';
          placeholder.innerHTML = `
            <svg class="w-10 h-10 text-purple-500/30 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
            </svg>
            <span class="text-xs font-bold text-purple-300 font-display">${titleText}</span>
            <p class="text-[10px] text-[#6e6485] leading-relaxed max-w-[240px] mt-2 font-sans">
              ${descText}
            </p>
          `;
          modernImg.parentElement.appendChild(placeholder);
        } else {
          placeholderEl.querySelector('span').textContent = titleText;
          placeholderEl.querySelector('p').innerHTML = descText;
          placeholderEl.classList.remove('hidden');
        }
      }
    }

    // Refresh similarity if image is present
    if (uploadedImageElement) {
      setTimeout(runCVSimilarity, 200);
    } else {
      clearCVOverlay();
    }
  }

  // --- Computer Vision Similarity Analysis Engine ---
  const dropzone = document.getElementById('plant-upload-dropzone');
  const fileInput = document.getElementById('plant-file-input');
  const previewBox = document.getElementById('candidate-preview-box');
  const previewThumb = document.getElementById('candidate-thumb');
  const previewFilename = document.getElementById('candidate-filename');
  const previewFilesize = document.getElementById('candidate-filesize');
  const removeBtn = document.getElementById('candidate-remove-btn');

  // Trigger file selection
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    
    // Drag-over highlights
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('bg-[#1a1338]/60', 'border-purple-500/60');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('bg-[#1a1338]/60', 'border-purple-500/60');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('bg-[#1a1338]/60', 'border-purple-500/60');
      if (e.dataTransfer.files.length > 0) {
        handleImageUpload(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleImageUpload(e.target.files[0]);
      }
    });
  }

  // Remove uploaded image
  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      uploadedImageElement = null;
      fileInput.value = '';
      
      previewBox.classList.remove('flex');
      previewBox.classList.add('hidden');
      dropzone.classList.remove('hidden');
      dropzone.classList.add('flex');
      
      clearCVOverlay();
    });
  }

  // Handle uploaded file
  function handleImageUpload(file) {
    if (!file.type.startsWith('image/')) {
      alert("Please upload a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        uploadedImageElement = img;
        
        // Show preview info
        previewThumb.src = e.target.result;
        previewFilename.textContent = file.name;
        previewFilesize.textContent = Math.round(file.size / 1024) + ' KB';
        
        dropzone.classList.remove('flex');
        dropzone.classList.add('hidden');
        previewBox.classList.remove('hidden');
        previewBox.classList.add('flex');
        
        // Run comparison
        runCVSimilarity();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function clearCVOverlay() {
    const canvas = document.getElementById('alignment-overlay-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const placeholder = document.getElementById('canvas-placeholder-text');
    if (placeholder) placeholder.classList.remove('hidden');
    
    document.getElementById('botanical-similarity-score').textContent = '-';
    document.getElementById('botanical-score-fill').style.width = '0%';
    document.getElementById('score-edge-contour').textContent = '-';
    document.getElementById('score-aspect-ratio').textContent = '-';
    document.getElementById('score-density-profile').textContent = '-';
  }

  // Canvas Grayscale Downscaling
  function getImageGrayscaleData(imgEl, size = 128) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    try {
      ctx.drawImage(imgEl, 0, 0, size, size);
    } catch (e) {
      console.warn("Cross-origin or empty image drawing failed:", e);
      return new Float32Array(size * size);
    }
    
    let imgData;
    try {
      imgData = ctx.getImageData(0, 0, size, size);
    } catch (e) {
      console.error("Canvas pixel reading failed (CORS restriction):", e);
      return new Float32Array(size * size);
    }
    
    const data = imgData.data;
    const grayscale = new Float32Array(size * size);
    
    for (let i = 0; i < data.length; i += 4) {
      grayscale[i / 4] = (0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]) / 255.0;
    }
    
    return grayscale;
  }

  // Sobel Edge Gradient
  function computeSobelEdges(grayData, size = 128) {
    const edges = new Float32Array(size * size);
    
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const idx00 = (y - 1) * size + (x - 1);
        const idx01 = (y - 1) * size + x;
        const idx02 = (y - 1) * size + (x + 1);
        
        const idx10 = y * size + (x - 1);
        const idx12 = y * size + (x + 1);
        
        const idx20 = (y + 1) * size + (x - 1);
        const idx21 = (y + 1) * size + x;
        const idx22 = (y + 1) * size + (x + 1);
        
        const gx = 
          (-1 * grayData[idx00]) + (1 * grayData[idx02]) +
          (-2 * grayData[idx10]) + (2 * grayData[idx12]) +
          (-1 * grayData[idx20]) + (1 * grayData[idx22]);
          
        const gy = 
          (-1 * grayData[idx00]) + (-2 * grayData[idx01]) + (-1 * grayData[idx02]) +
          (1 * grayData[idx20]) + (2 * grayData[idx21]) + (1 * grayData[idx22]);
          
        edges[y * size + x] = Math.sqrt(gx * gx + gy * gy);
      }
    }
    
    return edges;
  }

  // run computer vision matching
  function runCVSimilarity() {
    if (!currentBotanicalItem || !uploadedImageElement) return;

    const scanImgEl = document.getElementById('botanical-scan-img');
    const placeholder = document.getElementById('canvas-placeholder-text');
    if (placeholder) placeholder.classList.add('hidden');

    const size = 128;
    const vmsGray = getImageGrayscaleData(scanImgEl, size);
    const candGray = getImageGrayscaleData(uploadedImageElement, size);

    const vmsEdges = computeSobelEdges(vmsGray, size);
    const candEdges = computeSobelEdges(candGray, size);

    // 1. Edge Cosine Similarity
    let dot = 0;
    let normVms = 0;
    let normCand = 0;
    
    for (let i = 0; i < size * size; i++) {
      dot += vmsEdges[i] * candEdges[i];
      normVms += vmsEdges[i] * vmsEdges[i];
      normCand += candEdges[i] * candEdges[i];
    }
    
    const edgeSimilarity = dot / (Math.sqrt(normVms) * Math.sqrt(normCand) || 1);

    // 2. Aspect Ratio Match
    const arVms = scanImgEl.naturalWidth / (scanImgEl.naturalHeight || 1);
    const arCand = uploadedImageElement.naturalWidth / (uploadedImageElement.naturalHeight || 1);
    const aspectSimilarity = 1.0 - Math.min(Math.abs(arVms - arCand) / Math.max(arVms, arCand, 0.1), 1.0);

    // 3. Density Curve Profiler
    const projV1 = new Float32Array(size);
    const projH1 = new Float32Array(size);
    const projV2 = new Float32Array(size);
    const projH2 = new Float32Array(size);
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const val1 = vmsEdges[y * size + x];
        const val2 = candEdges[y * size + x];
        
        projH1[y] += val1;
        projV1[x] += val1;
        
        projH2[y] += val2;
        projV2[x] += val2;
      }
    }

    function getArraySimilarity(arr1, arr2) {
      let d = 0;
      let n1 = 0;
      let n2 = 0;
      for (let i = 0; i < arr1.length; i++) {
        d += arr1[i] * arr2[i];
        n1 += arr1[i] * arr1[i];
        n2 += arr2[i] * arr2[i];
      }
      return d / (Math.sqrt(n1) * Math.sqrt(n2) || 1);
    }

    const simH = getArraySimilarity(projH1, projH2);
    const simV = getArraySimilarity(projV1, projV2);
    const densitySimilarity = (simH + simV) / 2;

    // Normalize similarity values for humans
    const edgeScore = Math.min(Math.max((edgeSimilarity - 0.05) / 0.35, 0), 1.0);
    const densityScore = Math.min(Math.max((densitySimilarity - 0.3) / 0.6, 0), 1.0);
    const aspectScore = aspectSimilarity;

    const overallScore = Math.round((edgeScore * 45 + densityScore * 35 + aspectScore * 20) * 100);

    // Render scores
    document.getElementById('botanical-similarity-score').textContent = overallScore + '%';
    document.getElementById('botanical-score-fill').style.width = overallScore + '%';
    document.getElementById('score-edge-contour').textContent = Math.round(edgeScore * 100) + '%';
    document.getElementById('score-aspect-ratio').textContent = Math.round(aspectScore * 100) + '%';
    document.getElementById('score-density-profile').textContent = Math.round(densityScore * 100) + '%';

    // Color progress shift
    const scoreFill = document.getElementById('botanical-score-fill');
    const scoreVal = document.getElementById('botanical-similarity-score');
    if (overallScore > 75) {
      scoreVal.className = 'text-lg font-extrabold text-emerald-400 font-mono-code';
      scoreFill.className = 'bg-gradient-to-r from-purple-500 to-emerald-400 h-full rounded-full transition-all duration-300';
    } else if (overallScore > 50) {
      scoreVal.className = 'text-lg font-extrabold text-amber-400 font-mono-code';
      scoreFill.className = 'bg-gradient-to-r from-purple-500 to-amber-400 h-full rounded-full transition-all duration-300';
    } else {
      scoreVal.className = 'text-lg font-extrabold text-purple-400 font-mono-code';
      scoreFill.className = 'bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-300';
    }

    // 5. Render Contour Alignment Overlay Canvas
    const canvas = document.getElementById('alignment-overlay-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = size;
    canvas.height = size;
    
    ctx.fillStyle = '#080512';
    ctx.fillRect(0, 0, size, size);

    const canvasData = ctx.getImageData(0, 0, size, size);
    const pixels = canvasData.data;

    const threshold = 0.15;

    for (let i = 0; i < size * size; i++) {
      const vmsEdge = vmsEdges[i] > threshold;
      const candEdge = candEdges[i] > threshold;
      const pIdx = i * 4;

      if (vmsEdge && candEdge) {
        // Overlap (White)
        pixels[pIdx] = 255;
        pixels[pIdx+1] = 255;
        pixels[pIdx+2] = 255;
      } else if (vmsEdge) {
        // VMS (Neon Purple: 168, 85, 247)
        pixels[pIdx] = 168;
        pixels[pIdx+1] = 85;
        pixels[pIdx+2] = 247;
      } else if (candEdge) {
        // Candidate (Neon Pink: 236, 72, 153)
        pixels[pIdx] = 236;
        pixels[pIdx+1] = 72;
        pixels[pIdx+2] = 153;
      }
    }
    
    ctx.putImageData(canvasData, 0, 0);
  }
});
