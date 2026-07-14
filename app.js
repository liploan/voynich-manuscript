document.addEventListener('DOMContentLoaded', () => {
  // Application State
  let statsData = null;
  let activeTab = 'explorer-tab';
  let currentFolio = '1r';
  let charts = {};

  // DOM Elements
  const tabs = document.querySelectorAll('.nav-tab');
  const panels = document.querySelectorAll('.tab-panel');
  
  // Header Elements
  const hdrTotalFolios = document.getElementById('hdr-total-folios');
  const hdrTotalWords = document.getElementById('hdr-total-words');
  const hdrUnigramEntropy = document.getElementById('hdr-unigram-entropy');
  const hdrIc = document.getElementById('hdr-ic');

  // Explorer Tab Elements
  const folioFilterInput = document.getElementById('folio-filter');
  const folioSelectorContainer = document.getElementById('folio-selector-container');
  const currentFolioTitle = document.getElementById('current-folio-title');
  const currentFolioSection = document.getElementById('current-folio-section');
  const currentFolioLinesCount = document.getElementById('current-folio-lines-count');
  const folioTextDisplay = document.getElementById('folio-text-display');
  const interlinearToggle = document.getElementById('interlinear-toggle');

  // Search Tab Elements
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  const searchExactCheckbox = document.getElementById('search-exact');
  const searchStatus = document.getElementById('search-status');
  const searchResultsBody = document.getElementById('search-results-body');

  // Compare Tab Elements
  const sectionCardsContainer = document.getElementById('section-cards-container');

  // Bax Tab Elements
  const baxAlphabetGrid = document.getElementById('bax-alphabet-grid');
  const baxProofsGrid = document.getElementById('bax-proofs-grid');

  // Fetch JSON stats data
  fetch('voynich_stats.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load statistics JSON file.');
      }
      return response.json();
    })
    .then(data => {
      statsData = data;
      initApp();
    })
    .catch(error => {
      console.error('Error loading Voynich stats:', error);
      searchStatus.textContent = 'Error loading manuscript data. Please ensure voynich_stats.json is present.';
    });

  // Initialize Application
  function initApp() {
    // Populate header stats
    const totalFolios = Object.keys(statsData.folios).length;
    hdrTotalFolios.textContent = totalFolios;
    hdrTotalWords.textContent = statsData.global.total_words.toLocaleString();
    hdrUnigramEntropy.textContent = statsData.global.unigram_entropy.toFixed(3) + ' bits';
    hdrIc.textContent = statsData.global.index_of_coincidence.toFixed(4);

    // Setup tabs navigation
    setupTabs();

    // Explorer Section Setup
    renderFolioList();
    loadFolio(currentFolio);
    
    // Toggle interlinear view
    if (interlinearToggle) {
      interlinearToggle.addEventListener('change', () => {
        loadFolio(currentFolio);
      });
    }

    // Search Section Setup
    searchButton.addEventListener('click', runSearch);
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') runSearch();
    });

    // Setup filters
    folioFilterInput.addEventListener('input', filterFolioList);

    // Populate compare tab card grid
    populateCompareGrid();

    // Populate Bax Decipherment tab grids
    renderBaxDecipherment();

    // Lazy load charts when charts tab is selected
    setupChartTabListener();
  }

  // Setup Tab Navigation
  function setupTabs() {
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');
        
        // Update active tab buttons
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update active panels
        panels.forEach(p => p.classList.remove('active'));
        const activePanel = document.getElementById(targetTab);
        activePanel.classList.add('active');

        activeTab = targetTab;

        // Initialize or resize charts if charts tab is active
        if (targetTab === 'charts-tab') {
          renderCharts();
        } else if (targetTab === 'compare-tab') {
          renderCompareChart();
        }
      });
    });
  }

  // Helper: map folio name to section class
  function getSectionTagClass(section) {
    switch(section) {
      case 'Herbal': return 'tag-herbal';
      case 'Astronomical': return 'tag-astronomical';
      case 'Biological': return 'tag-biological';
      case 'Cosmological': return 'tag-cosmological';
      case 'Pharmaceutical': return 'tag-pharmaceutical';
      case 'Recipes': return 'tag-recipes';
      default: return 'tag-other';
    }
  }

  // Helper: determine section name from folio string
  function getSectionName(folioStr) {
    const m = folioStr.match(/^(\d+)/);
    if (!m) return 'Unknown';
    const num = parseInt(m[1], 10);
    if (num >= 1 && num <= 66) return 'Herbal';
    if (num >= 67 && num <= 73) return 'Astronomical';
    if (num >= 75 && num <= 84) return 'Biological';
    if (num >= 85 && num <= 86) return 'Cosmological';
    if (num >= 87 && num <= 102) return 'Pharmaceutical';
    if (num >= 103 && num <= 116) return 'Recipes';
    return 'Other';
  }

  // Render Folio selector sidebar
  function renderFolioList() {
    folioSelectorContainer.innerHTML = '';
    const sortedFolios = Object.keys(statsData.folios);
    
    sortedFolios.forEach(folio => {
      const section = getSectionName(folio);
      const tagClass = getSectionTagClass(section);
      
      const item = document.createElement('div');
      item.className = 'folio-item';
      if (folio === currentFolio) item.classList.add('active');
      item.setAttribute('data-folio', folio);

      item.innerHTML = `
        <span class="folio-name">f${folio}</span>
        <span class="folio-sec-tag ${tagClass}">${section}</span>
      `;

      item.addEventListener('click', () => {
        document.querySelectorAll('.folio-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        loadFolio(folio);
      });

      folioSelectorContainer.appendChild(item);
    });
  }

  // Filter folio sidebar list
  function filterFolioList() {
    const filterText = folioFilterInput.value.toLowerCase().trim();
    const items = folioSelectorContainer.querySelectorAll('.folio-item');
    
    items.forEach(item => {
      const folio = item.getAttribute('data-folio').toLowerCase();
      if (folio.includes(filterText) || getSectionName(folio).toLowerCase().includes(filterText)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  }

  const baxMapping = {
    "k": "k",
    "y": "n",
    "d": "t",
    "t": "t",
    "r": "r",
    "m": "r",
    "n": "r",
    "sh": "x",
    "s": "s",
    "o": "a",
    "a": "a",
    "e": "o",
    "iin": "ur",
    "in": "ir",
    "ee": "o:",
  };

  const alphabetData = [
    { eva: "k", sound: "/k/", desc: "as in Coriander, Centaurea, Cotton, Hellebore" },
    { eva: "y", sound: "/n/", desc: "as in Centaurea, Cotton, Chiron" },
    { eva: "d", sound: "/t/ /d/", desc: "as in Taurus, Coriander, Centaurea" },
    { eva: "t", sound: "/t/ /d/", desc: "as in Taurus, Coriander, Centaurea" },
    { eva: "r", sound: "/r/", desc: "as in Juniper (arar), Taurus, Coriander" },
    { eva: "m", sound: "/r/", desc: "in word-final or isolate positions (e.g. orom)" },
    { eva: "n", sound: "/r/", desc: "alternative representation of /r/" },
    { eva: "sh", sound: "/x/ /ch/", desc: "aspirated ch (as in loch) in Chiron, Nigella" },
    { eva: "s", sound: "/s/", desc: "as in crocus (Kesar)" },
    { eva: "o", sound: "/a/", desc: "as in Juniper (arar), Taurus, Coriander" },
    { eva: "a", sound: "/a/ /ə/ /u/", desc: "representing broad vowels or semivowels like /wa/" },
    { eva: "iin", sound: "/ur/", desc: "cluster as in Hellebore (kaur), Nigella" },
    { eva: "in", sound: "/ir/", desc: "cluster as in Centaurea, Chiron" },
    { eva: "ee", sound: "/o:/", desc: "long vowel as in Coriander, Cotton" },
    { eva: "e", sound: "/o/", desc: "vowel as in Cotton" }
  ];

  const proofsData = [
    {
      index: 1,
      folio: "15v",
      name: "Juniper ('arar')",
      scientific: "Juniperus oxycedrus",
      eva: "poror (first word on f15v)",
      phonetic: "parar (contains /arar/)",
      desc: "Stephen Bax identified the plant on f16r as Prickly Juniper. The word 'poror' is the first word on f15v and starts the last paragraph on f16r (as 'toror'), matching the Arabic/Hebrew word 'arar' for juniper."
    },
    {
      index: 2,
      folio: "68r",
      name: "Taurus ('thaur')",
      scientific: "Constellation Taurus",
      eva: "dary (label on f68r)",
      phonetic: "tarn (sounds like /taurn/ or /thaur/)",
      desc: "Located next to the drawing of the Pleiades (seven stars) on folio 68r. Bax analyzed it as starting with 'd' (/t/ or /th/) followed by 'a', 'r', and 'y' (/n/), representing the constellation Taurus, closely matching the Arabic 'thaur'."
    },
    {
      index: 3,
      folio: "41v",
      name: "Coriander",
      scientific: "Coriandrum sativum",
      eva: "keerodal (marginal note)",
      phonetic: "ko:ratal (sounds like /kooratal/ or /kooriad/)",
      desc: "On folio 41v, a marginal addition above the text was proposed by Bax to be related to 'Coriander'. Using letters K, R, A, and T, he reconstructed a reading resembling the Linear B Greek 'ko-ri-ja-da-na'."
    },
    {
      index: 4,
      folio: "2r",
      name: "Centaury",
      scientific: "Centaurea diffusa / major",
      eva: "kydainy (first word)",
      phonetic: "kntairn (sounds like /centaur/)",
      desc: "Folio 2r depicts a plant uncontroversially identified as Centaurea. The first word of the page starts with letters mapping to K-N-T-R, matching the classical name of the plant derived from the Centaur Chiron."
    },
    {
      index: 5,
      folio: "2r",
      name: "Chiron ('ch-ur')",
      scientific: "Centaur Mythological Figure",
      eva: "shaiin (second word on line 8)",
      phonetic: "xaur (sounds like /chiron/)",
      desc: "In the second paragraph of the Centaurea page (f2r), the text begins with a phrase reading KNT/ə/IR CH/ə/UR, signifying 'The Centaur Chiron'. Greek name endings were frequently dropped when borrowed."
    },
    {
      index: 6,
      folio: "3v",
      name: "Hellebore ('kaur')",
      scientific: "Helleborus niger / foetidus",
      eva: "koaiin (first word)",
      phonetic: "kaaur (sounds like /kaur/)",
      desc: "Folio 3v shows a Hellebore. The first word is transcribed as k-o-a-iin, which Bax transcribed phonetically as /kaaur/ (using the iin->/ur/ rule), matching the Persian/Arabic term 'kaur' for hellebore root."
    },
    {
      index: 7,
      folio: "29v",
      name: "Nigella Sativa ('kaur char')",
      scientific: "Nigella sativa (Black Cumin)",
      eva: "kooiin.shor (first words)",
      phonetic: "kaaur.xar (meaning Black Cumin / black root)",
      desc: "Depicts Nigella Sativa, recognizable by its seed pods. The text begins with 'kooiin.shor', combining 'kaaur' (cumin/root) and 'xar' (meaning black in Hindi/Persian/Romani: 'kalo/char'), indicating 'black cumin'."
    },
    {
      index: 8,
      folio: "31r",
      name: "Cotton ('kooton')",
      scientific: "Gossypium herbaceum",
      eva: "keedey (first word)",
      phonetic: "ko:ton (sounds like /kooton/)",
      desc: "Folio 31r displays a cotton plant. The first word is written with characters that map to K-EE-D-E-Y which sounds out to K-O:-T-O-N, which matches the English 'cotton', French 'coton', and ultimately Arabic 'qutn' representing the plant."
    },
    {
      index: 9,
      folio: "27r",
      name: "Crocus ('kesar')",
      scientific: "Colchicum autumnale / Crocus",
      eva: "ksor (first word)",
      phonetic: "ksar (sounds like /kesar/)",
      desc: "The plant on f27r is identified as autumn crocus. The first word is written as k-s-o-r, matching the Hindi/Persian name for saffron crocus 'Kesar' (derived from Sanskrit)."
    },
    {
      index: 10,
      folio: "68r",
      name: "Pleiades ('the seven stars')",
      scientific: "Star Cluster",
      eva: "dary (and other label lines)",
      phonetic: "tarn (associated with Taurus)",
      desc: "The central diagram on f68r depicts a circular array of stars identified as the Pleiades. Surrounding labels include the words 'dary' (Taurus) and other astronomical names analyzed by Bax to build his phonetic key."
    }
  ];

  // Tokenize EVA text into glyph tokens
  function tokenizeEva(text) {
    if (!text) return [];
    const words = text.replace(/,/g, ' ').replace(/\./g, ' ').split(/\s+/);
    return words.map(w => {
      const tokens = [];
      let i = 0;
      const lower = w.toLowerCase();
      while (i < lower.length) {
        if (lower.startsWith('iin', i)) {
          tokens.push({ raw: w.substring(i, i+3), val: 'iin' });
          i += 3;
        } else if (lower.startsWith('in', i)) {
          tokens.push({ raw: w.substring(i, i+2), val: 'in' });
          i += 2;
        } else if (lower.startsWith('ee', i)) {
          tokens.push({ raw: w.substring(i, i+2), val: 'ee' });
          i += 2;
        } else if (lower.startsWith('sh', i)) {
          tokens.push({ raw: w.substring(i, i+2), val: 'sh' });
          i += 2;
        } else {
          tokens.push({ raw: w.charAt(i), val: lower.charAt(i) });
          i += 1;
        }
      }
      return tokens;
    });
  }

  // Set up hover highlighting for interlinear lines
  function setupHoverListeners() {
    const evaTokens = folioTextDisplay.querySelectorAll('.eva-token');
    const baxTokens = folioTextDisplay.querySelectorAll('.bax-token');
    
    const tokenMap = {};
    
    evaTokens.forEach(el => {
      const id = el.getAttribute('data-token-id');
      if (!tokenMap[id]) tokenMap[id] = [];
      tokenMap[id].push(el);
    });
    
    baxTokens.forEach(el => {
      const id = el.getAttribute('data-token-id');
      if (!tokenMap[id]) tokenMap[id] = [];
      tokenMap[id].push(el);
    });
    
    Object.keys(tokenMap).forEach(id => {
      const elements = tokenMap[id];
      elements.forEach(el => {
        el.addEventListener('mouseenter', () => {
          elements.forEach(item => item.classList.add('highlight-token'));
        });
        el.addEventListener('mouseleave', () => {
          elements.forEach(item => item.classList.remove('highlight-token'));
        });
      });
    });
  }

  // Populate Bax Decipherment grids
  function renderBaxDecipherment() {
    if (!baxAlphabetGrid || !baxProofsGrid) return;
    
    // Render Alphabet Key
    baxAlphabetGrid.innerHTML = '';
    alphabetData.forEach(item => {
      const el = document.createElement('div');
      el.className = 'alphabet-item';
      el.innerHTML = `
        <span class="glyph-eva">${item.eva}</span>
        <span class="glyph-arrow">➔</span>
        <span class="glyph-sound">${item.sound}</span>
        <span class="glyph-desc">${item.desc}</span>
      `;
      baxAlphabetGrid.appendChild(el);
    });

    // Render Proof Cards
    baxProofsGrid.innerHTML = '';
    proofsData.forEach(item => {
      const card = document.createElement('div');
      card.className = 'proof-card';
      card.innerHTML = `
        <div class="proof-header">
          <span class="proof-folio-tag">f${item.folio}</span>
          <span class="proof-index-tag">Proof #${item.index}</span>
        </div>
        <div class="proof-title-area">
          <h4>${item.name}</h4>
          <span class="proof-scientific">${item.scientific}</span>
        </div>
        <div class="proof-transliteration-box">
          <div class="translit-row">
            <span class="translit-label">EVA spelling:</span>
            <span class="translit-val-eva">${item.eva}</span>
          </div>
          <div class="translit-row">
            <span class="translit-label">Phonetic:</span>
            <span class="translit-val-phon">${item.phonetic}</span>
          </div>
        </div>
        <p class="proof-desc">${item.desc}</p>
        <button class="btn-view-explorer" data-folio="${item.folio}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
          View in Explorer
        </button>
      `;
      
      // Bind navigation click
      card.querySelector('.btn-view-explorer').addEventListener('click', () => {
        // Switch to explorer tab
        activeTab = 'explorer-tab';
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('[data-tab="explorer-tab"]').classList.add('active');
        panels.forEach(p => p.classList.remove('active'));
        document.getElementById('explorer-tab').classList.add('active');
        
        // Select sidebar item
        document.querySelectorAll('.folio-item').forEach(sideItem => {
          if (sideItem.getAttribute('data-folio') === item.folio) {
            sideItem.classList.add('active');
            sideItem.scrollIntoView({ block: 'nearest' });
          } else {
            sideItem.classList.remove('active');
          }
        });
        
        // Turn on interlinear toggle so they can see phonetic alignment
        if (interlinearToggle) {
          interlinearToggle.checked = true;
        }
        loadFolio(item.folio);
      });

      baxProofsGrid.appendChild(card);
    });
  }

  // Load selected folio into viewer
  function loadFolio(folio) {
    currentFolio = folio;
    const lines = statsData.folios[folio];
    const section = getSectionName(folio);
    
    currentFolioTitle.textContent = `Folio ${folio}`;
    currentFolioSection.textContent = section;
    
    // Set appropriate section color tag
    currentFolioSection.className = 'section-tag ' + getSectionTagClass(section);
    currentFolioLinesCount.textContent = `${lines.length} lines`;

    // Render lines
    folioTextDisplay.innerHTML = '';
    
    const isInterlinear = interlinearToggle && interlinearToggle.checked;
    
    lines.forEach((line, lineIdx) => {
      const lineDiv = document.createElement('div');
      
      if (!isInterlinear) {
        lineDiv.className = 'text-line';
        const displayText = line.eva || line.v101 || "[Empty]";
        lineDiv.innerHTML = `
          <span class="line-indicator">f${folio}.${line.line_num}</span>
          <span class="line-content">${displayText}</span>
        `;
      } else {
        lineDiv.className = 'text-line interlinear-row';
        
        // Tokenize the EVA text
        const tokenizedWords = tokenizeEva(line.eva);
        
        // Construct EVA HTML & Bax HTML
        let evaHtml = '';
        let baxHtml = '';
        
        tokenizedWords.forEach((wordTokens, wordIdx) => {
          wordTokens.forEach((tok, tokIdx) => {
            const sound = baxMapping[tok.val.toLowerCase()] || tok.raw;
            const uniqueId = `l${lineIdx}-w${wordIdx}-t${tokIdx}`;
            
            evaHtml += `<span class="eva-token" data-token-id="${uniqueId}">${tok.raw}</span>`;
            baxHtml += `<span class="bax-token" data-token-id="${uniqueId}">${sound}</span>`;
          });
          
          if (wordIdx < tokenizedWords.length - 1) {
            evaHtml += `<span class="word-delimiter">.</span>`;
            baxHtml += `<span class="word-delimiter">.</span>`;
          }
        });
        
        const v101Row = line.v101 ? `
          <div class="tier tier-v101">
            <span class="tier-label">v101</span>
            <span class="tier-content">${line.v101}</span>
          </div>
        ` : '';
        
        const evaRow = line.eva ? `
          <div class="tier tier-eva">
            <span class="tier-label">eva</span>
            <span class="tier-content">${evaHtml}</span>
          </div>
        ` : '';
        
        const baxRow = line.bax ? `
          <div class="tier tier-bax">
            <span class="tier-label">phon</span>
            <span class="tier-content">${baxHtml}</span>
          </div>
        ` : '';
        
        lineDiv.innerHTML = `
          <div class="interlinear-header">
            <span class="interlinear-indicator">f${folio}.${line.line_num}</span>
          </div>
          <div class="interlinear-content">
            ${v101Row}
            ${evaRow}
            ${baxRow}
          </div>
        `;
      }
      
      folioTextDisplay.appendChild(lineDiv);
    });
    
    // Add hover highlighting listeners if interlinear is active
    if (isInterlinear) {
      setupHoverListeners();
    }
  }

  // Escape special regex characters
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Search transcription
  function runSearch() {
    const query = searchInput.value.trim();
    if (!query) {
      searchStatus.textContent = 'Please enter a search term.';
      searchResultsBody.innerHTML = '';
      return;
    }

    const exactMatch = searchExactCheckbox.checked;
    const escapedQuery = escapeRegExp(query);
    
    // Get search tier (v101, eva, or bax)
    const selectedRadio = document.querySelector('input[name="search-tier"]:checked');
    const searchTier = selectedRadio ? selectedRadio.value : 'v101';

    // Define matching logic
    let searchRegex;
    if (exactMatch) {
      searchRegex = new RegExp(`(^|[.\\s])(${escapedQuery})($|[.\\s])`, 'i');
    } else {
      searchRegex = new RegExp(escapedQuery, 'i');
    }

    const results = [];
    let matchCount = 0;

    Object.keys(statsData.folios).forEach(folio => {
      const section = getSectionName(folio);
      const lines = statsData.folios[folio];
      
      lines.forEach(line => {
        const text = line[searchTier] || "";
        if (!text) return;
        
        searchRegex.lastIndex = 0;
        if (searchRegex.test(text)) {
          matchCount++;
          
          // Format text with highlights
          let highlightedText;
          if (exactMatch) {
            highlightedText = text.replace(searchRegex, (match, p1, p2, p3) => {
              return `${p1}<span class="search-highlight">${p2}</span>${p3}`;
            });
          } else {
            highlightedText = text.replace(searchRegex, `<span class="search-highlight">$&</span>`);
          }

          results.push({
            folio,
            section,
            line_num: line.line_num,
            highlightedText
          });
        }
      });
    });

    // Update Status
    searchStatus.textContent = `Found ${matchCount} match${matchCount === 1 ? '' : 'es'} across the manuscript in ${searchTier.toUpperCase()} tier.`;

    // Render table rows
    searchResultsBody.innerHTML = '';
    
    // Limit to 500 rows to prevent browser freeze
    const maxResults = results.slice(0, 500);
    maxResults.forEach(res => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>f${res.folio}</strong></td>
        <td><span class="folio-sec-tag ${getSectionTagClass(res.section)}">${res.section}</span></td>
        <td>${res.line_num}</td>
        <td class="text-td">${res.highlightedText}</td>
      `;
      
      // Let user click folio in search results to view it in the explorer
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => {
        activeTab = 'explorer-tab';
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('[data-tab="explorer-tab"]').classList.add('active');
        panels.forEach(p => p.classList.remove('active'));
        document.getElementById('explorer-tab').classList.add('active');
        
        // Select sidebar item
        document.querySelectorAll('.folio-item').forEach(item => {
          if (item.getAttribute('data-folio') === res.folio) {
            item.classList.add('active');
            item.scrollIntoView({ block: 'nearest' });
          } else {
            item.classList.remove('active');
          }
        });
        
        // Auto-enable interlinear toggle if they searched EVA or Bax, so they can see it stacked!
        if ((searchTier === 'bax' || searchTier === 'eva') && interlinearToggle) {
          interlinearToggle.checked = true;
        }
        loadFolio(res.folio);
      });

      searchResultsBody.appendChild(tr);
    });

    if (results.length > 500) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td colspan="4" style="text-align: center; color: var(--text-secondary); font-style: italic;">
          Showing first 500 matches. Please narrow your query to see others.
        </td>
      `;
      searchResultsBody.appendChild(tr);
    }
  }

  // Populate Section Comparison Grid
  function populateCompareGrid() {
    sectionCardsContainer.innerHTML = '';
    const sections = ["Herbal", "Astronomical", "Biological", "Cosmological", "Pharmaceutical", "Recipes"];
    
    sections.forEach(sect => {
      const s = statsData.sections[sect];
      const tagClass = getSectionTagClass(sect);
      
      const card = document.createElement('div');
      card.className = 'section-stat-card glass-panel';
      
      // Get word chips
      const chipsHTML = s.top_words.map(w => `<span class="word-chip">${w.word} (${w.count})</span>`).join('');

      card.innerHTML = `
        <div class="card-top">
          <h3>${sect}</h3>
          <span class="card-indicator" style="color: var(--color-${sect.toLowerCase()})"></span>
        </div>
        <div class="card-stats">
          <div class="card-stat-item">
            <span class="stat-label-item">Words</span>
            <span class="stat-value-item">${s.words.toLocaleString()}</span>
          </div>
          <div class="card-stat-item">
            <span class="stat-label-item">Vocabulary</span>
            <span class="stat-value-item">${s.vocab_size.toLocaleString()}</span>
          </div>
          <div class="card-stat-item">
            <span class="stat-label-item">Unigram H</span>
            <span class="stat-value-item">${s.unigram_entropy.toFixed(3)} bits</span>
          </div>
          <div class="card-stat-item">
            <span class="stat-label-item">Conditional H</span>
            <span class="stat-value-item">${s.conditional_entropy.toFixed(3)} bits</span>
          </div>
          <div class="card-stat-item">
            <span class="stat-label-item">Index of Coinc.</span>
            <span class="stat-value-item">${s.index_of_coincidence.toFixed(4)}</span>
          </div>
          <div class="card-stat-item">
            <span class="stat-label-item">Avg Word Len</span>
            <span class="stat-value-item">${s.avg_word_length} glyphs</span>
          </div>
        </div>
        <div class="card-vocab-preview">
          <div class="vocab-preview-title">Frequent Vocabulary</div>
          <div class="vocab-preview-chips">
            ${chipsHTML || '<span class="text-muted" style="font-size: 11px;">None</span>'}
          </div>
        </div>
      `;
      sectionCardsContainer.appendChild(card);
    });
  }

  // Setup Listener to render charts lazily
  function setupChartTabListener() {
    // Initial check in case window is loaded on chart tab
    if (activeTab === 'charts-tab') renderCharts();
  }

  // Render Charts using Chart.js
  function renderCharts() {
    // 1. Character Frequency Chart
    if (!charts.charFreq) {
      const topChars = statsData.global.top_chars;
      const ctx = document.getElementById('char-freq-chart').getContext('2d');
      charts.charFreq = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: topChars.map(item => item.char),
          datasets: [{
            label: 'Frequency %',
            data: topChars.map(item => item.percentage),
            backgroundColor: 'rgba(170, 61, 44, 0.65)',
            borderColor: '#aa3d2c',
            borderWidth: 1,
            hoverBackgroundColor: 'rgba(170, 61, 44, 0.85)',
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            y: {
              grid: { color: 'rgba(139, 115, 85, 0.12)' },
              ticks: { color: '#5c4e40' }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#5c4e40', font: { family: 'Courier New', size: 14 } }
            }
          }
        }
      });
    }

    // 2. Word Length Chart
    if (!charts.wordLen) {
      const dist = statsData.global.word_length_dist;
      const ctx = document.getElementById('word-len-chart').getContext('2d');
      charts.wordLen = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: Object.keys(dist),
          datasets: [{
            label: 'Word Count',
            data: Object.values(dist),
            backgroundColor: 'rgba(45, 90, 125, 0.6)',
            borderColor: '#2d5a7d',
            borderWidth: 1,
            hoverBackgroundColor: 'rgba(45, 90, 125, 0.85)',
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              grid: { color: 'rgba(139, 115, 85, 0.12)' },
              ticks: { color: '#5c4e40' }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#5c4e40' }
            }
          }
        }
      });
    }

    // 3. Zipf's Law Chart
    if (!charts.zipf) {
      const topWords = statsData.global.top_words;
      const ranks = topWords.map((_, i) => i + 1);
      const frequencies = topWords.map(item => item.count);
      
      // Calculate ideal Zipf frequencies
      const C = frequencies[0];
      const zipfIdeal = ranks.map(r => C / r);
 
      const ctx = document.getElementById('zipf-chart').getContext('2d');
      charts.zipf = new Chart(ctx, {
        type: 'line',
        data: {
          labels: topWords.map(item => item.word),
          datasets: [
            {
              label: 'Observed Frequency',
              data: frequencies,
              borderColor: '#aa3d2c',
              backgroundColor: 'rgba(170, 61, 44, 0.08)',
              borderWidth: 2,
              tension: 0.3,
              fill: true
            },
            {
              label: 'Ideal Zipfian Curve',
              data: zipfIdeal,
              borderColor: 'rgba(92, 78, 64, 0.45)',
              borderDash: [5, 5],
              borderWidth: 1.5,
              pointStyle: 'none',
              pointRadius: 0,
              tension: 0.2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#2b231d' }
            }
          },
          scales: {
            y: {
              grid: { color: 'rgba(139, 115, 85, 0.12)' },
              ticks: { color: '#5c4e40' }
            },
            x: {
              grid: { display: false },
              ticks: {
                color: '#5c4e40',
                font: { family: 'Courier New' },
                maxRotation: 45,
                minRotation: 45
              }
            }
          }
        }
      });
    }
  }
 
  // Render Comparative Section Chart
  function renderCompareChart() {
    if (!charts.compare) {
      const sections = ["Herbal", "Astronomical", "Biological", "Cosmological", "Pharmaceutical", "Recipes"];
      const unigramEntropy = sections.map(sect => statsData.sections[sect].unigram_entropy);
      const condEntropy = sections.map(sect => statsData.sections[sect].conditional_entropy);
 
      const ctx = document.getElementById('section-compare-chart').getContext('2d');
      charts.compare = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: sections,
          datasets: [
            {
              label: 'Unigram Entropy (Glyph Variety)',
              data: unigramEntropy,
              backgroundColor: 'rgba(45, 90, 125, 0.65)',
              borderColor: '#2d5a7d',
              borderWidth: 1
            },
            {
              label: 'Conditional Bigram Entropy (Predictability)',
              data: condEntropy,
              backgroundColor: 'rgba(170, 61, 44, 0.65)',
              borderColor: '#aa3d2c',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#2b231d' }
            }
          },
          scales: {
            y: {
              grid: { color: 'rgba(139, 115, 85, 0.12)' },
              ticks: { color: '#5c4e40' },
              min: 0,
              max: 5
            },
            x: {
              grid: { display: false },
              ticks: { color: '#5c4e40' }
            }
          }
        }
      });
    }
  }

});
