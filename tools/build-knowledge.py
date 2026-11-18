"""
Builds the guide's document library (server/knowledge.json) from the PDFs in knowledge-src/.

Each PDF is cut into passages (one per section: overview, challenges, how MindSuite helps,
why MindSuite, what you receive). The guide server searches these passages for every
question and gives the best ones to Claude, so answers can draw on the documents.

    python tools/build-knowledge.py            (needs PyMuPDF: pip install pymupdf)

Run it again whenever documents are added to, changed in or removed from knowledge-src/.
"""
import json
import re
import sys
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "knowledge-src"
OUT = ROOT / "server" / "knowledge.json"

# Lines that start a new section in the MindSuite offering brochures.
SECTION = re.compile(r"^(0\d)\s+(.+)$|^(What you receive|Aligned with|Talk to a MindSuite expert)\b")
FOOTER = re.compile(r"^(EMAIL|PHONE|OFFICE|info@mindsuite\.in|\+91|8-1-299|Request a proposal|www\.mindsuite\.in)")


def clean(text):
    text = text.replace("�", "·").replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    return re.sub(r"\s*\n\s*", " ", text).strip()


def passages(path):
    doc = pymupdf.open(path)
    blocks = [clean(b[4]) for page in doc for b in page.get_text("blocks", sort=False) if b[6] == 0]
    blocks = [b for b in blocks if b]
    title = re.sub(r"^\d+-MindSuite-", "", path.stem).replace("-", " ")
    title = title.replace("OT ICS", "OT/ICS").replace("Planning BCP", "Planning (BCP)")
    category = blocks[0].replace("mindsuite", "", 1).strip() if blocks else ""

    sections = [["Overview", []]]
    for b in blocks[1:]:
        m = SECTION.match(b)
        if m:
            if m.group(3) == "Talk to a MindSuite expert":
                sections.append(["How it works and notes", []])
                continue
            name = m.group(2) or m.group(3)
            sections.append([name, [] if m.group(2) else [b]])
            continue
        if sections[-1][0] == "How it works and notes" and not FOOTER.match(b):
            sections[-1][1].append(b)  # the closing note ("Pairs with ...") is worth keeping
        elif sections[-1][0] != "How it works and notes":
            sections[-1][1].append(b)

    # "What you receive" and "Aligned with" are short: keep them together.
    merged = []
    for name, parts in sections:
        if name == "Aligned with" and merged and merged[-1][0] == "What you receive":
            merged[-1][1].extend(parts)
        else:
            merged.append([name, parts])

    out = []
    for name, parts in merged:
        text = " ".join(p for p in parts if not FOOTER.match(p)).replace("www.mindsuite.in", "").strip()
        text = re.sub(r"\s{2,}", " ", text)
        if len(text) > 40:
            out.append({"section": name, "text": text})
    return {"file": path.name, "title": title, "category": category}, out


def main():
    pdfs = sorted(SRC.glob("*.pdf"))
    if not pdfs:
        sys.exit(f"No PDFs in {SRC}")
    docs, chunks = [], []
    for i, pdf in enumerate(pdfs):
        info, parts = passages(pdf)
        docs.append({"id": f"doc-{i + 1:02d}", **info})
        for p in parts:
            chunks.append({"doc": f"doc-{i + 1:02d}", **p})
    OUT.write_text(json.dumps({"docs": docs, "chunks": chunks}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    words = sum(len(c["text"].split()) for c in chunks)
    print(f"{len(docs)} documents, {len(chunks)} passages, {words} words -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
