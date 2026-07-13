import pypdf

reader = pypdf.PdfReader("/Users/liploan/Documents/Voynich Manuscript/Voynich_Bax_Decipherment.pdf")

pages = [14, 15, 20, 21, 23, 24, 26, 27, 32, 34, 35, 42]

for p in pages:
    if p <= len(reader.pages):
        print(f"\n=================== PAGE {p} ===================")
        text = reader.pages[p - 1].extract_text()
        print(text)
