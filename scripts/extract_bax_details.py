import pypdf

reader = pypdf.PdfReader("/Users/liploan/Documents/Voynich Manuscript/Voynich_Bax_Decipherment.pdf")

pages_to_extract = [13, 19, 22, 25, 31, 33, 41, 46]

for page_num in pages_to_extract:
    # 1-indexed page number maps to page_num - 1 in the list
    if page_num <= len(reader.pages):
        print(f"\n=================== PAGE {page_num} ===================")
        text = reader.pages[page_num - 1].extract_text()
        print(text)
