#!/usr/bin/env python3
"""Generate scripts/pdf/reference.docx — the Word style template used for the
Google-Docs-ready build. Times New Roman 12 pt, 1.5 spacing, black headings, A4
with 1 inch margins."""
import zipfile, re, subprocess, os, sys

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reference.docx")
base = subprocess.run(["pandoc", "--print-default-data-file", "reference.docx"],
                      capture_output=True).stdout
tmp = OUT + ".base"
open(tmp, "wb").write(base)

zin = zipfile.ZipFile(tmp)
styles = zin.read("word/styles.xml").decode("utf8")
document = zin.read("word/document.xml").decode("utf8")

# Times New Roman throughout
styles = re.sub(r'<w:rFonts[^/>]*/>',
                '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>',
                styles)
# NB: the stock file writes tags as `<w:sz w:val="32" />` -- with a space before
# the slash, and sometimes with extra attributes -- so the patterns must tolerate both.
# 12 pt body everywhere the template sets a size
styles = re.sub(r'<w:sz w:val="\d+"\s*/>', '<w:sz w:val="24"/>', styles)
styles = re.sub(r'<w:szCs w:val="\d+"\s*/>', '<w:szCs w:val="24"/>', styles)
# black headings: the blue is a theme colour, carried as an extra attribute
styles = re.sub(r'<w:color w:val="[0-9A-Fa-f]{6}"[^/>]*\s*/>', '<w:color w:val="000000"/>', styles)

# headings at 14 pt (sz 28), body stays 12 pt
def _heading_size(m):
    block = m.group(0)
    block = re.sub(r'<w:sz w:val="\d+"\s*/>', '<w:sz w:val="28"/>', block)
    block = re.sub(r'<w:szCs w:val="\d+"\s*/>', '<w:szCs w:val="28"/>', block)
    return block
styles = re.sub(r'<w:style [^>]*w:styleId="Heading[1-6]".*?</w:style>',
                _heading_size, styles, flags=re.S)
# 1.5 line spacing as the document default
styles = styles.replace('<w:pPrDefault/>',
    '<w:pPrDefault><w:pPr><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr></w:pPrDefault>')
styles = styles.replace('<w:pPrDefault>',
    '<w:pPrDefault><w:pPr><w:spacing w:line="360" w:lineRule="auto" w:after="160"/></w:pPr>', 1) \
    if '<w:pPrDefault>' in styles and '<w:pPrDefault/>' not in styles else styles

# Table cells use the Compact style. Leave them single-spaced -- inheriting the
# document's 1.5 spacing makes tables tall enough to split across pages, which
# pushed the title page's details table onto page 2.
def _single_space(m):
    block = m.group(0)
    if "<w:pPr>" in block:
        block = block.replace("<w:pPr>",
            '<w:pPr><w:spacing w:line="240" w:lineRule="auto" w:before="20" w:after="20"/>', 1)
    else:
        block = block.replace("</w:name>",
            '</w:name><w:pPr><w:spacing w:line="240" w:lineRule="auto" '
            'w:before="20" w:after="20"/></w:pPr>', 1)
    return block
for sid in ("Compact", "Table", "TableCaption"):
    styles = re.sub(r'<w:style [^>]*w:styleId="%s".*?</w:style>' % sid,
                    _single_space, styles, flags=re.S)

# A4 with 1 inch (1440 twip) margins. The stock reference.docx carries no
# sectPr at all, so the page size falls back to whatever the reader defaults to
# (Letter, usually). Insert one at the end of the body.
SECTPR = ('<w:sectPr>'
          '<w:pgSz w:w="11906" w:h="16838"/>'
          '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" '
          'w:header="708" w:footer="708" w:gutter="0"/>'
          '<w:cols w:space="708"/><w:docGrid w:linePitch="360"/>'
          '</w:sectPr>')
if re.search(r"<w:sectPr\s*/>", document):          # stock file has an empty, self-closing one
    document = re.sub(r"<w:sectPr\s*/>", SECTPR, document)
elif "<w:sectPr" in document:
    document = re.sub(r"<w:sectPr.*?</w:sectPr>", SECTPR, document, flags=re.S)
else:
    document = document.replace("</w:body>", SECTPR + "</w:body>", 1)

zout = zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED)
for it in zin.infolist():
    if it.filename == "word/styles.xml":
        zout.writestr(it, styles.encode("utf8"))
    elif it.filename == "word/document.xml":
        zout.writestr(it, document.encode("utf8"))
    else:
        zout.writestr(it, zin.read(it.filename))
zout.close(); zin.close(); os.remove(tmp)
print(f"wrote {OUT} ({os.path.getsize(OUT)//1024} KB)")
