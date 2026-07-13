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

## 📚 Academic Context & References
* **Scans:** Courtesy of the Yale University Beinecke Rare Book & Manuscript Library (MS 408).
* **Edith Sherwood, Ph.D.:** Anagram analysis of botanical labels from [edithsherwood.com](https://www.edithsherwood.com/voynich-botanical-plant-anagrams/index.php).
* **Stephen Bax:** Phonetic decipherment methodologies from *A Proposed Partial Decipherment of the Voynich Manuscript*.
