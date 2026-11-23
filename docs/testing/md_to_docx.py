"""Minimal, dependency-free Markdown -> .docx converter.

Supports the subset used by the testing documents in this folder:
ATX headings (#..####), paragraphs, bullet lists (-, *), numbered lists (1.),
pipe tables, fenced code blocks, horizontal rules and **bold** inline spans.

A .docx is an OOXML zip; this writes it with the standard library only.

Usage:  python md_to_docx.py input.md output.docx "Document title"
"""

from __future__ import annotations

import os
import re
import sys
import zipfile
from xml.sax.saxutils import escape

NS = (
    'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
)

CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>"""

RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

DOC_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>"""

STYLES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles %s>
<w:docDefaults><w:rPrDefault><w:rPr>
<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault>
</w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/>
<w:pPr><w:spacing w:before="320" w:after="160"/><w:outlineLvl w:val="0"/></w:pPr>
<w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="1F3864"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/>
<w:pPr><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr>
<w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="2E5496"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/>
<w:pPr><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="2"/></w:pPr>
<w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="44546A"/></w:rPr></w:style>
<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders>
<w:top w:val="single" w:sz="4" w:color="A6A6A6"/><w:left w:val="single" w:sz="4" w:color="A6A6A6"/>
<w:bottom w:val="single" w:sz="4" w:color="A6A6A6"/><w:right w:val="single" w:sz="4" w:color="A6A6A6"/>
<w:insideH w:val="single" w:sz="4" w:color="A6A6A6"/><w:insideV w:val="single" w:sz="4" w:color="A6A6A6"/>
</w:tblBorders></w:tblPr></w:style>
</w:styles>""" % NS


def runs(text: str) -> str:
    """Convert **bold** spans into runs."""
    out = []
    for i, chunk in enumerate(re.split(r"(\*\*.+?\*\*)", text)):
        if not chunk:
            continue
        bold = chunk.startswith("**") and chunk.endswith("**") and len(chunk) > 4
        body = chunk[2:-2] if bold else chunk
        rpr = "<w:rPr><w:b/></w:rPr>" if bold else ""
        out.append(f'<w:r>{rpr}<w:t xml:space="preserve">{escape(body)}</w:t></w:r>')
    return "".join(out)


def para(text: str, style: str | None = None, size: int | None = None,
         indent: int | None = None, align: str | None = None) -> str:
    ppr = ["<w:pPr>"]
    if style:
        ppr.append(f'<w:pStyle w:val="{style}"/>')
    if indent is not None:
        ppr.append(f'<w:ind w:left="{indent}"/>')
    if align:
        ppr.append(f'<w:jc w:val="{align}"/>')
    if size:
        ppr.append(f'<w:rPr><w:sz w:val="{size}"/></w:rPr>')
    ppr.append("</w:pPr>")
    return f"<w:p>{''.join(ppr)}{runs(text)}</w:p>"


def table(rows: list[list[str]]) -> str:
    width = max(len(r) for r in rows)
    col = 9000 // width
    out = ['<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="9000" w:type="dxa"/>'
           '<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>']
    out.append("".join(f'<w:gridCol w:w="{col}"/>' for _ in range(width)))
    out.append("</w:tblGrid>")
    for r_i, row in enumerate(rows):
        cells = row + [""] * (width - len(row))
        out.append("<w:tr>")
        for cell in cells:
            shade = '<w:shd w:val="clear" w:fill="DCE6F1"/>' if r_i == 0 else ""
            bold = "<w:b/>" if r_i == 0 else ""
            out.append(
                f'<w:tc><w:tcPr><w:tcW w:w="{col}" w:type="dxa"/>{shade}</w:tcPr>'
                f'<w:p><w:pPr><w:spacing w:after="40"/></w:pPr>'
                f'<w:r><w:rPr>{bold}<w:sz w:val="20"/></w:rPr>'
                f'<w:t xml:space="preserve">{escape(cell)}</w:t></w:r></w:p></w:tc>'
            )
        out.append("</w:tr>")
    out.append("</w:tbl>")
    return "".join(out)


def convert(md: str) -> str:
    body: list[str] = []
    lines = md.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        # fenced code block
        if stripped.startswith("```"):
            i += 1
            code: list[str] = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code.append(lines[i])
                i += 1
            i += 1
            for c in code:
                body.append(
                    '<w:p><w:pPr><w:spacing w:after="0"/><w:ind w:left="360"/></w:pPr>'
                    '<w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>'
                    f'<w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">{escape(c)}</w:t></w:r></w:p>'
                )
            continue

        # table
        if stripped.startswith("|") and i + 1 < len(lines) and set(lines[i + 1].strip()) <= set("|-: "):
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                if not set("".join(cells)) <= set("-: "):
                    rows.append(cells)
                i += 1
            if rows:
                body.append(table(rows))
                body.append('<w:p><w:pPr><w:spacing w:after="60"/></w:pPr></w:p>')
            continue

        # horizontal rule
        if stripped in ("---", "***", "___"):
            body.append('<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:color="A6A6A6"/>'
                        '</w:pBdr><w:spacing w:after="120"/></w:pPr></w:p>')
            i += 1
            continue

        # headings
        m = re.match(r"^(#{1,4})\s+(.*)$", stripped)
        if m:
            level = len(m.group(1))
            text = m.group(2).strip()
            if level == 1 and not body:
                body.append(para(text, size=44, align="center"))
                body.append('<w:p><w:pPr><w:spacing w:after="200"/></w:pPr></w:p>')
            else:
                style = "Heading1" if level == 1 else f"Heading{min(level, 3)}"
                body.append(para(text, style=style))
            i += 1
            continue

        # bullets
        m = re.match(r"^[-*]\s+(.*)$", stripped)
        if m:
            indent = 360 + (len(line) - len(line.lstrip())) * 90
            body.append(para("\u2022  " + m.group(1), indent=indent))
            i += 1
            continue

        # numbered
        m = re.match(r"^(\d+)[.)]\s+(.*)$", stripped)
        if m:
            body.append(para(f"{m.group(1)}.  {m.group(2)}", indent=360))
            i += 1
            continue

        # words to fill in (____) rendered as-is
        body.append(para(stripped))
        i += 1

    sect = ('<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
            '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" '
            'w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>')
    return ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            f"<w:document {NS}><w:body>{''.join(body)}{sect}</w:body></w:document>")


def build(md_path: str, docx_path: str) -> None:
    with open(md_path, encoding="utf-8") as fh:
        xml = convert(fh.read())
    os.makedirs(os.path.dirname(os.path.abspath(docx_path)), exist_ok=True)
    with zipfile.ZipFile(docx_path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CONTENT_TYPES)
        z.writestr("_rels/.rels", RELS)
        z.writestr("word/_rels/document.xml.rels", DOC_RELS)
        z.writestr("word/styles.xml", STYLES)
        z.writestr("word/document.xml", xml)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        raise SystemExit(2)
    build(sys.argv[1], sys.argv[2])
    print(f"wrote {sys.argv[2]} ({os.path.getsize(sys.argv[2])} bytes)")
