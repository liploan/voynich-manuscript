import pypdf

reader = pypdf.PdfReader("/Users/liploan/Documents/Voynich Manuscript/Voynich_Bax_Decipherment.pdf")

# Print pages 29 and 30 in full
for p_num in [29, 30]:
    print(f"\n--- PAGE {p_num} ---")
    print(reader.pages[p_num - 1].extract_text())


