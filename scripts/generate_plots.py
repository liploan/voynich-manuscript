#!/usr/bin/env python3
import os
import json
import matplotlib.pyplot as plt
import numpy as np

# File paths
JSON_PATH = "/Users/liploan/Documents/Voynich Manuscript/voynich_stats.json"
PLOTS_DIR = "/Users/liploan/Documents/Voynich Manuscript/plots"

def generate_plots():
    os.makedirs(PLOTS_DIR, exist_ok=True)
    
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        stats = json.load(f)
        
    # Set styling parameters for premium dark-themed plots
    plt.rcParams['figure.facecolor'] = '#0b0718'
    plt.rcParams['axes.facecolor'] = '#17112b'
    plt.rcParams['text.color'] = '#f1ecff'
    plt.rcParams['axes.labelcolor'] = '#a79ebb'
    plt.rcParams['xtick.color'] = '#a79ebb'
    plt.rcParams['ytick.color'] = '#a79ebb'
    plt.rcParams['axes.edgecolor'] = '#4a3f68'
    plt.rcParams['grid.color'] = '#29203c'
    plt.rcParams['grid.linestyle'] = '--'
    plt.rcParams['grid.alpha'] = 0.5
    plt.rcParams['font.family'] = 'sans-serif'
    
    # --- Plot 1: Character Frequencies ---
    print("Generating Character Frequencies plot...")
    fig, ax = plt.subplots(figsize=(12, 6))
    top_chars = stats["global"]["top_chars"]
    chars = [item["char"] for item in top_chars]
    percentages = [item["percentage"] for item in top_chars]
    
    bars = ax.bar(chars, percentages, color='#7b59ff', edgecolor='#a78bfa', alpha=0.8)
    ax.set_title("Top 30 Character Frequencies", fontsize=16, fontweight='bold', pad=15)
    ax.set_xlabel("Glyph Code (v101 System)", fontsize=12, labelpad=10)
    ax.set_ylabel("Frequency Percentage (%)", fontsize=12, labelpad=10)
    ax.grid(True, axis='y')
    
    # Add values on top of bars
    for bar in bars:
        yval = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2.0, yval + 0.2, f"{yval:.1f}%", ha='center', va='bottom', fontsize=8, color='#f1ecff')
        
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "char_frequencies.png"), dpi=150, facecolor=fig.get_facecolor())
    plt.close()

    # --- Plot 2: Word Length Distribution ---
    print("Generating Word Length Distribution plot...")
    fig, ax = plt.subplots(figsize=(8, 5))
    dist = stats["global"]["word_length_dist"]
    lengths = [int(k) for k in dist.keys()]
    counts = list(dist.values())
    
    ax.bar(lengths, counts, color='#00e5ff', edgecolor='#e0f7fa', alpha=0.7)
    ax.set_title("Word Length Distribution", fontsize=16, fontweight='bold', pad=15)
    ax.set_xlabel("Word Length (Characters)", fontsize=12, labelpad=10)
    ax.set_ylabel("Occurrences", fontsize=12, labelpad=10)
    ax.set_xticks(lengths)
    ax.grid(True, axis='y')
    
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "word_lengths.png"), dpi=150, facecolor=fig.get_facecolor())
    plt.close()

    # --- Plot 3: Zipf's Law ---
    print("Generating Zipf's Law plot...")
    fig, ax = plt.subplots(figsize=(10, 5))
    top_words = stats["global"]["top_words"]
    words = [item["word"] for item in top_words]
    observed = [item["count"] for item in top_words]
    
    ranks = np.arange(1, len(words) + 1)
    C = observed[0]
    ideal = C / ranks
    
    ax.plot(words, observed, marker='o', color='#7b59ff', linewidth=2, label="Observed Frequency")
    ax.plot(words, ideal, linestyle='--', color='#a79ebb', alpha=0.7, label="Ideal Zipfian Distribution")
    ax.set_title("Word Rank-Frequency Distribution (Zipf's Law)", fontsize=16, fontweight='bold', pad=15)
    ax.set_xlabel("Word Token (Ranked)", fontsize=12, labelpad=10)
    ax.set_ylabel("Frequency Count", fontsize=12, labelpad=10)
    plt.xticks(rotation=45, ha='right', fontsize=9)
    ax.grid(True)
    ax.legend(facecolor='#17112b', edgecolor='#4a3f68')
    
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "zipf_law.png"), dpi=150, facecolor=fig.get_facecolor())
    plt.close()

    # --- Plot 4: Section Entropy Comparison ---
    print("Generating Section Comparison plot...")
    fig, ax = plt.subplots(figsize=(10, 6))
    sections = ["Herbal", "Astronomical", "Biological", "Cosmological", "Pharmaceutical", "Recipes"]
    unigram = [stats["sections"][s]["unigram_entropy"] for s in sections]
    conditional = [stats["sections"][s]["conditional_entropy"] for s in sections]
    
    x = np.arange(len(sections))
    width = 0.35
    
    rects1 = ax.bar(x - width/2, unigram, width, label='Unigram Entropy (Glyph Variety)', color='#8774ff', alpha=0.8)
    rects2 = ax.bar(x + width/2, conditional, width, label='Conditional Bigram Entropy (Predictability)', color='#ec4899', alpha=0.8)
    
    ax.set_title("Sectional Entropy Comparison", fontsize=16, fontweight='bold', pad=15)
    ax.set_ylabel("Entropy (Bits)", fontsize=12, labelpad=10)
    ax.set_xticks(x)
    ax.set_xticklabels(sections, fontsize=11)
    ax.set_ylim(0, 5)
    ax.grid(True, axis='y')
    ax.legend(loc='lower left', facecolor='#17112b', edgecolor='#4a3f68')
    
    # Add values on top of bars
    for rect in rects1:
        h = rect.get_height()
        ax.text(rect.get_x() + rect.get_width()/2., h + 0.1, f"{h:.2f}", ha='center', va='bottom', fontsize=9, color='#f1ecff')
    for rect in rects2:
        h = rect.get_height()
        if h > 0:
            ax.text(rect.get_x() + rect.get_width()/2., h + 0.1, f"{h:.2f}", ha='center', va='bottom', fontsize=9, color='#f1ecff')
            
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, "section_comparison.png"), dpi=150, facecolor=fig.get_facecolor())
    plt.close()
    
    print(f"All plots successfully generated in {PLOTS_DIR}")

if __name__ == "__main__":
    generate_plots()
