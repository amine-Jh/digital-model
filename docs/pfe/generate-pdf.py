#!/usr/bin/env python3
"""Génère RAPPORT-PFE.pdf à partir de RAPPORT-PFE.md (sans Chromium)."""
from __future__ import annotations

import re
import sys
from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[2]
MD_PATH = Path(__file__).resolve().parent / "RAPPORT-PFE.md"
PDF_PATH = Path(__file__).resolve().parent / "RAPPORT-PFE.pdf"


def strip_front_matter(text: str) -> str:
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            return text[end + 4 :].lstrip()
    return text


def md_to_html(md: str) -> str:
    """Conversion Markdown minimale → HTML pour fpdf2.write_html."""
    md = strip_front_matter(md)
    # Retirer blocs HTML de mise en page
    md = re.sub(r"<div[^>]*>.*?</div>", "", md, flags=re.DOTALL | re.IGNORECASE)
    md = re.sub(r"<br\s*/?>", "\n", md, flags=re.IGNORECASE)
    lines = md.splitlines()
    out: list[str] = []
    in_code: bool | str = False
    in_table = False
    table_rows: list[str] = []

    def flush_table():
        nonlocal table_rows, in_table
        if not table_rows:
            return
        out.append("<table border='1' cellpadding='4' cellspacing='0' width='100%'>")
        for i, row in enumerate(table_rows):
            cells = [c.strip() for c in row.strip("|").split("|")]
            tag = "th" if i == 0 else "td"
            out.append("<tr>" + "".join(f"<{tag}>{c}</{tag}>" for c in cells) + "</tr>")
        out.append("</table>")
        table_rows = []
        in_table = False

    for raw in lines:
        line = raw.rstrip()
        if line.strip().startswith("```"):
            if not in_code:
                in_code = "skip"
            else:
                in_code = False
            continue
        if in_code:
            continue
        if re.match(r"^\|.+\|$", line):
            if re.match(r"^\|[\s\-:|]+\|$", line):
                continue
            in_table = True
            table_rows.append(line)
            continue
        if in_table:
            flush_table()
        if line.startswith("# "):
            out.append(f"<h1>{line[2:].strip()}</h1>")
        elif line.startswith("## "):
            out.append(f"<h2>{line[3:].strip()}</h2>")
        elif line.startswith("### "):
            out.append(f"<h3>{line[4:].strip()}</h3>")
        elif line.startswith("- "):
            out.append(f"<li>{inline_format(line[2:].strip())}</li>")
        elif line.strip() == "":
            out.append("<br/>")
        else:
            out.append(f"<p>{inline_format(line.strip())}</p>")

    flush_table()
    body = "\n".join(out)
    # Grouper listes consécutives
    body = re.sub(r"(<li>.*?</li>\n?)+", lambda m: "<ul>" + m.group(0) + "</ul>", body)
    return f"""<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="font-family: Helvetica; font-size: 11pt; line-height: 1.4;">
{body}
</body></html>"""


def inline_format(s: str) -> str:
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"\[(.+?)\]\(.+?\)", r"\1", s)
    s = re.sub(r"`(.+?)`", r"<code>\1</code>", s)
    return s


def _unicode_font_path() -> Path | None:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/Library/Fonts/Arial Unicode.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/TTF/DejaVuSans.ttf",
    ]
    for c in candidates:
        p = Path(c)
        if p.is_file():
            return p
    return None


def build_pdf(html: str, out: Path) -> None:
    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(20, 20, 20)
    uni = _unicode_font_path()
    if uni:
        path = str(uni)
        pdf.add_font("Uni", "", path)
        pdf.add_font("Uni", "B", path)
        pdf.add_font("Uni", "I", path)
        pdf.add_font("Uni", "BI", path)
        pdf.set_font("Uni", size=11)
    else:
        pdf.set_font("Helvetica", size=11)
        html = (
            html.replace("\u2014", "-")
            .replace("\u2013", "-")
            .replace("\u2019", "'")
            .replace("\u201c", '"')
            .replace("\u201d", '"')
        )

    pdf.add_page()
    pdf.write_html(html)
    pdf.output(str(out))


def main() -> int:
    if not MD_PATH.is_file():
        print(f"Introuvable: {MD_PATH}", file=sys.stderr)
        return 1
    md = MD_PATH.read_text(encoding="utf-8")
    html = md_to_html(md)
    build_pdf(html, PDF_PATH)
    print(f"PDF créé: {PDF_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
