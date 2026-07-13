# Voynich Manuscript Cryptographic & Linguistic Dashboard

An interactive, client-side research dashboard and translation workbench for analyzing the Voynich Manuscript (MS 408). This application provides tools for folios exploration, transcription search, comparative linguistic analytics, and botanical shape-matching.

🔗 **Live Deployment:** [https://liploan.github.io/voynich-manuscript/](https://liploan.github.io/voynich-manuscript/)

---

## 🌟 Key Features

### 1. Folio Explorer & Transcription Panel
* View high-resolution Yale Beinecke library scans side-by-side with transcripts in **European Voynich Alphabet (EVA)**.
* Read-aloud feature utilizing text-to-speech for phonetically-reconstructed phonetic translations.

### 2. Search & Concordance
* Search through all 37,919 words in the manuscript.
* Real-time concordance index matching character collocations, positional token occurrences, and context lines.

### 3. Visual Cryptographic Statistics
* Real-time visual plots of unigram/digram letter frequencies, word length distributions, and Zipf's Law validation.
* Live calculation of **Unigram Entropy** and the **Index of Coincidence (IC)** to analyze linguistic vs. ciphered structure.

### 4. Cross-Section Analytics
* Comparative graphs comparing word lengths, character entropy, and vocabulary size across the five thematic manuscript sections (Herbal, Astrological, Balneological, Pharmaceutical, Recipes).

### 5. Decipherment Workspace & Phonetics
* Interactive translation cards based on **Stephen Bax's linguistic decipherment** (translating phonemes into 15th-century Tuscan-Italian/Semitic models).
* Needleman-Wunsch sequence alignments highlighting phonetic transformations.

### 6. Botanical Matcher & Computer Vision Workbench
* **Dual-Proposal Database:** Compiles visual plant identifications (Bax, Tucker, O'Neill) alongside all **122 Tuscan-Italian plant anagram decodings proposed by Edith Sherwood, Ph.D.**
* **Reference Photo Library:** Features 76 local high-resolution modern plant photographs scraped from the Wikipedia Pageimage API.
* **Sobel Edge Detection Filter:** Custom client-side Canvas convolution filters that downscale and apply Sobel edge-extraction algorithms to compare Voynich plant drawings against user-uploaded candidate plant images.
* **Mathematical Similarity Index:** Outputs resemblance scores based on Edge Cosine Similarity and spatial Density Profiles to evaluate botanical correlation objectively and eliminate pareidolia/bias.

---

## 📁 Repository Structure

```bash
.
├── index.html                   # Main Landing Page / Analytics Dashboard
├── app.js                       # Logic for index.html (Charts, Stats, Explorer)
├── decipherer.html              # Decipherment Workspace & Botanical CV Matcher
├── decipherer.js                # Logic for decipherer.html (Sobel CV, Proposals)
├── styles.css                   # Global stylesheet (Glassmorphic dark design)
├── .gitignore                   # Excludes system and swap files
├── voynich_image_mapping.json   # Maps folios to Yale Beinecke High-Res scan URLs
├── voynich_stats.json           # Word frequency and character statistics database
├── voynich_token_sequence.csv   # Linear sequence of all words in the manuscript
├── voynich_vocabulary.csv       # Dictionary of unique words and frequencies
│
├── docs/                        # Offline references and transcripts
│   ├── Voynich_Bax_Decipherment.pdf
│   ├── voynich_v101.txt         # Curated v101 transcript
│   └── voynich_zl.txt           # Zandbergen-Landini transcript
│
├── images/                      # Locally served media assets
│   └── modern/                  # 76 scraped high-res modern plant photos
│
└── scripts/                     # Python utilities and data processors
    ├── download_all_sherwood_images.py
    ├── bax_transcriber.py
    ├── comparative_language_analyzer.py
    └── voynich_analyzer.py
```

---

## 🚀 Running Locally

Since the application is serverless and executes client-side in the browser, you only need to run a local HTTP server to handle JSON/CSV fetches (to avoid CORS policies):

1. Clone the repository:
   ```bash
   git clone https://github.com/liploan/voynich-manuscript.git
   cd voynich-manuscript
   ```

2. Start a Python HTTP server in the project directory:
   ```bash
   python3 -m http.server 8000
   ```

3. Open your browser and navigate to:
   👉 **[http://localhost:8000](http://localhost:8000)**

---

## 🔍 Voynich Researchers & Methodological Debates

This dashboard integrates data and theories from major research streams. The table below outlines their approaches, contributions, arguments, and typical academic criticisms:

| Researcher | Approach / Thesis | Key Contributions | Arguments & Merits | Primary Criticisms & Counterarguments |
| :--- | :--- | :--- | :--- | :--- |
| **Stephen Bax** <br>*(Linguist)* | **Semitic / Caucasian Phonetic Script:** Analyzed the manuscript as a natural language written in a phonetic script (not a code), using Arabic, Hebrew, and Caucasian scripts to map sound values. | Proposed phonetic sound-values for ~10 key words adjacent to illustrations (e.g. *kaur* for Coriander, *taurus* for Taurus). | • Targets proper nouns with high semantic stability.<br>• Avoids arbitrary monoalphabetic substitutions.<br>• Grounded in historical Semitic script structures. | • Extremely small sample size.<br>• Mappings do not scale to translate coherent paragraphs without introducing arbitrary filler phonemes or grammatical jumps. |
| **Edith Sherwood, Ph.D.** <br>*(Chemist / Independent)* | **Tuscan-Italian Anagrams:** Argues the labels are single-word anagrams written in 15th-century Tuscan Italian, using Dante's 21-letter alphabet (omitting J, K, W, X, Y). | Scraped and mapped 122 botanical anagram decodings matching historical Tuscan herbals (e.g. Materia Medica). | • Systematic, repeatable process spanning the entire botanical section.<br>• Matches linguistic timeframes (Tuscany, c. 1400s). | • **The Anagram Flexibility Trap:** Given short character strings and archaic spelling variations, a wide range of anagrams can be formulated, risking subjective selection bias. |
| **Arthur Tucker & Hugh O'Neill** <br>*(Botanists)* | **Mesoamerican & Sunflower Identification:** Visual botanical matching of illustration morphology to physical plant species, arguing for New World origins. | Identified New World species like *Helianthus annuus* (sunflower, f93r) and *Capsicum* (red pepper, f101v). | • Provides objective physical visual markers (seed-patterns, leaf shape) matching specific real-world plants. | • Post-Columbus dating (post-1492) contradicts the solid radiocarbon dating of the manuscript's vellum (1404–1438).<br>• Stylized drawings could be composite medieval fantasy illustrations. |
| **Leonell Strong / William Newbold** <br>*(Historical Cryptologists)* | **Micrography / Double-Cipher Systems:** Proposed the letters are composed of tiny shorthand strokes or micro-characters representing a complex polyalphabetic cipher. | Early 20th-century transcription databases and cipher grids. | • Intricate decryption frameworks attempting to explain anomalous stroke-level details. | • Criticized as structurally subjective; the "microscopic strokes" were later shown to be cracks in the aging ink and vellum, not deliberate writing. |
| **Lisa Fagin Davis** <br>*(Paleographer / Medievalist)* | **Codicological & Scribal Hands:** Analyzes the physical manuscript as a genuine 15th-century European artifact created by a team of multiple scribes in a scriptorium. | Identified 5 distinct scribal hands (Scribes 1-5); debunked amateur "translations" (e.g. Cheshire, Gibbs). | • Empirically rigorous, based on standard medieval manuscript scholarship.<br>• Explains structural and layout shifts without cryptographic assumptions. | • Focuses on paleography and scriptorium structure; does not attempt a translation or decipherment of the text itself. |

---

## 📚 Academic Context & References
* **Scans:** Courtesy of the Yale University Beinecke Rare Book & Manuscript Library (MS 408).
* **Edith Sherwood, Ph.D.:** Anagram analysis of botanical labels from [edithsherwood.com](https://www.edithsherwood.com/voynich-botanical-plant-anagrams/index.php).
* **Stephen Bax:** Phonetic decipherment methodologies from *A Proposed Partial Decipherment of the Voynich Manuscript*.

