#!/usr/bin/env python3
import re
import math
import json
from collections import Counter, defaultdict

# File paths
TXT_PATH = "/Users/liploan/Documents/Voynich Manuscript/voynich_v101.txt"
JSON_OUT_PATH = "/Users/liploan/Documents/Voynich Manuscript/voynich_stats.json"

# Folio section ranges
def get_section(folio_str):
    m = re.match(r'^(\d+)', folio_str)
    if not m:
        return "Unknown"
    num = int(m.group(1))
    if 1 <= num <= 66:
        return "Herbal"
    elif 67 <= num <= 73:
        return "Astronomical"
    elif 75 <= num <= 84:
        return "Biological"
    elif 85 <= num <= 86:
        return "Cosmological"
    elif 87 <= num <= 102:
        return "Pharmaceutical"
    elif 103 <= num <= 116:
        return "Recipes"
    else:
        return "Other"

def compute_entropy(counts, total):
    entropy = 0.0
    for val in counts.values():
        p = val / total
        entropy -= p * math.log2(p)
    return entropy

def compute_ic(char_counts, total_chars):
    if total_chars <= 1:
        return 0.0
    numerator = sum(count * (count - 1) for count in char_counts.values())
    denominator = total_chars * (total_chars - 1)
    return numerator / denominator

def analyze_text():
    # Regular expression for line format: <folio.line>text
    line_pattern = re.compile(r'^<([^>]+)>\s*(.*)$')
    
    global_words = []
    global_chars = []
    
    # Store data per section
    # section -> list of words
    section_words = defaultdict(list)
    # section -> list of chars
    section_chars = defaultdict(list)
    # section -> count of lines
    section_line_counts = defaultdict(int)
    
    # Folio text storage for dashboard browser
    folios_data = defaultdict(list)
    
    with open(TXT_PATH, "r", encoding="utf-8") as f:
        for raw_line in f:
            raw_line = raw_line.strip()
            if not raw_line:
                continue
            
            match = line_pattern.match(raw_line)
            if not match:
                continue
                
            folio_full, text = match.groups()
            # Split folio and line number
            folio_parts = folio_full.split('.')
            folio = folio_parts[0]
            
            # Save raw line for dashboard
            folios_data[folio].append({
                "line_num": folio_parts[1] if len(folio_parts) > 1 else "?",
                "text": text
            })
            
            # Map folio to section
            sect = get_section(folio)
            section_line_counts[sect] += 1
            
            # Tokenize words. 
            # In Claston v101, '.' is the word separator, and spaces might also exist.
            # We strip trailing line connectors like '-' or '=' for word counting.
            cleaned_text = text.replace('=', '').replace('-', '')
            words = [w for w in cleaned_text.replace('.', ' ').split() if w]
            
            for w in words:
                global_words.append(w)
                section_words[sect].append(w)
                
                # Characters (we ignore punctuation and digits that act as formatting,
                # but in Voynich transcriptions, numbers and symbols are actual glyph codes.
                # So we count all non-space characters.)
                for char in w:
                    global_chars.append(char)
                    section_chars[sect].append(char)

    # Global Calculations
    total_lines = sum(section_line_counts.values())
    total_words = len(global_words)
    total_chars = len(global_chars)
    
    word_counts = Counter(global_words)
    char_counts = Counter(global_chars)
    
    vocab_size = len(word_counts)
    hapax_count = sum(1 for count in word_counts.values() if count == 1)
    
    # Word lengths
    word_lengths = [len(w) for w in global_words]
    avg_word_length = sum(word_lengths) / max(total_words, 1)
    word_length_dist = Counter(word_lengths)
    
    # Entropy: Unigram, Bigram, Trigram
    unigram_entropy = compute_entropy(char_counts, total_chars)
    
    # Bigrams
    bigrams = [global_chars[i] + global_chars[i+1] for i in range(len(global_chars)-1)]
    bigram_counts = Counter(bigrams)
    joint_bigram_entropy = compute_entropy(bigram_counts, len(bigrams))
    conditional_bigram_entropy = joint_bigram_entropy - unigram_entropy
    
    # Trigrams
    trigrams = [global_chars[i] + global_chars[i+1] + global_chars[i+2] for i in range(len(global_chars)-2)]
    trigram_counts = Counter(trigrams)
    joint_trigram_entropy = compute_entropy(trigram_counts, len(trigrams))
    conditional_trigram_entropy = joint_trigram_entropy - joint_bigram_entropy
    
    # Index of Coincidence
    ic_value = compute_ic(char_counts, total_chars)
    
    # Top 50 words (Zipf's Law)
    top_words = [{"word": w, "count": c} for w, c in word_counts.most_common(50)]
    
    # Top characters
    top_chars = [{"char": c, "count": cnt, "percentage": (cnt / total_chars) * 100} for c, cnt in char_counts.most_common(30)]

    # Section-based stats
    sections_stats = {}
    for sect in ["Herbal", "Astronomical", "Biological", "Cosmological", "Pharmaceutical", "Recipes"]:
        s_words = section_words[sect]
        s_chars = section_chars[sect]
        s_lines = section_line_counts[sect]
        
        s_word_counts = Counter(s_words)
        s_char_counts = Counter(s_chars)
        
        s_total_words = len(s_words)
        s_total_chars = len(s_chars)
        
        s_word_lengths = [len(w) for w in s_words]
        s_avg_word_len = sum(s_word_lengths) / max(s_total_words, 1)
        
        s_unigram_entropy = compute_entropy(s_char_counts, s_total_chars) if s_total_chars > 0 else 0.0
        
        # Bigrams for section
        s_bigrams = [s_chars[i] + s_chars[i+1] for i in range(len(s_chars)-1)]
        s_bigram_counts = Counter(s_bigrams)
        s_joint_entropy = compute_entropy(s_bigram_counts, len(s_bigrams)) if len(s_bigrams) > 0 else 0.0
        s_conditional_entropy = s_joint_entropy - s_unigram_entropy
        
        s_ic = compute_ic(s_char_counts, s_total_chars)
        
        sections_stats[sect] = {
            "lines": s_lines,
            "words": s_total_words,
            "chars": s_total_chars,
            "vocab_size": len(s_word_counts),
            "hapax_count": sum(1 for c in s_word_counts.values() if c == 1),
            "avg_word_length": round(s_avg_word_len, 2),
            "unigram_entropy": round(s_unigram_entropy, 4),
            "conditional_entropy": round(s_conditional_entropy, 4),
            "index_of_coincidence": round(s_ic, 5),
            "top_words": [{"word": w, "count": c} for w, c in s_word_counts.most_common(10)]
        }

    # Combined stats structure
    stats = {
        "global": {
            "total_lines": total_lines,
            "total_words": total_words,
            "total_chars": total_chars,
            "vocab_size": vocab_size,
            "hapax_count": hapax_count,
            "avg_word_length": round(avg_word_length, 2),
            "unigram_entropy": round(unigram_entropy, 4),
            "conditional_entropy": round(conditional_bigram_entropy, 4),
            "trigram_conditional_entropy": round(conditional_trigram_entropy, 4),
            "index_of_coincidence": round(ic_value, 5),
            "top_words": top_words,
            "top_chars": top_chars,
            "word_length_dist": {str(k): v for k, v in sorted(word_length_dist.items())}
        },
        "sections": sections_stats,
        "folios": {folio: lines for folio, lines in sorted(folios_data.items(), key=lambda x: (int(re.match(r'^(\d+)', x[0]).group(1)) if re.match(r'^(\d+)', x[0]) else 999, x[0]))}
    }
    
    with open(JSON_OUT_PATH, "w", encoding="utf-8") as f_out:
        json.dump(stats, f_out, indent=2)
    print(f"Stats successfully written to {JSON_OUT_PATH}")

if __name__ == "__main__":
    analyze_text()
