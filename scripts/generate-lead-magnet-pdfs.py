from __future__ import annotations

import re
import textwrap
import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
CONTENT_DIR = ROOT / "content" / "lead-magnets"
OUTPUT_DIR = ROOT / "drafts" / "lead-magnet-pdfs"
LOGO_MARK_PATH = ROOT / "public" / "logo-mark.png"
PUBLIC_KNOWLEDGE_PATH = ROOT / "src" / "site" / "generated" / "public-knowledge.json"


def load_pdf_boilerplate() -> dict[str, str]:
    with PUBLIC_KNOWLEDGE_PATH.open(encoding="utf-8") as file:
        return json.load(file)["pdfBoilerplate"]


PDF_BOILERPLATE = load_pdf_boilerplate()

MOJIBAKE = {
    "â€”": "-",
    "â€“": "-",
    "â†’": "->",
    "â€™": "'",
    "â€œ": '"',
    "â€�": '"',
    "â€˜": "'",
    "â€¦": "...",
}


def clean_text(value: str) -> str:
    for needle, replacement in MOJIBAKE.items():
        value = value.replace(needle, replacement)
    value = value.replace("—", "-").replace("–", "-").replace("→", "->")
    value = value.replace("’", "'").replace("“", '"').replace("”", '"')
    return value.strip()


def parse_frontmatter(source: str) -> tuple[dict[str, str], str]:
    if not source.startswith("---"):
        return {}, source
    _, frontmatter, body = source.split("---", 2)
    data: dict[str, str] = {}
    for line in frontmatter.splitlines():
        if ":" not in line or line.startswith(" "):
            continue
        key, value = line.split(":", 1)
        data[key.strip()] = clean_text(value.strip().strip('"'))
    return data, body


def markdown_to_flowables(markdown: str, styles) -> list:
    flowables = []
    in_list = False

    for raw_block in re.split(r"\n\s*\n", markdown):
        block = clean_text(raw_block)
        if not block or block.startswith("|"):
            continue

        if block.startswith("## "):
            flowables.append(Spacer(1, 0.12 * inch))
            flowables.append(Paragraph(clean_text(block[3:]), styles["FlorivaH2"]))
            in_list = False
            continue

        if block.startswith("### "):
            flowables.append(Paragraph(clean_text(block[4:]), styles["FlorivaH3"]))
            in_list = False
            continue

        if re.match(r"^[-*] \[[ xX]\]", block) or block.startswith("- "):
            items = []
            for line in block.splitlines():
                line = re.sub(r"^[-*] \[[ xX]\]\s*", "[ ] ", line)
                line = re.sub(r"^[-*]\s*", "• ", line)
                items.append(clean_text(line))
            flowables.append(Paragraph("<br/>".join(items), styles["FlorivaList"]))
            in_list = True
            continue

        if re.match(r"^\d+\.\s", block):
            lines = [clean_text(line) for line in block.splitlines()]
            flowables.append(Paragraph("<br/>".join(lines), styles["FlorivaList"]))
            in_list = True
            continue

        if block.startswith("**") and block.endswith("**") and len(block) < 90:
            flowables.append(Paragraph(clean_text(block.strip("*")), styles["FlorivaH3"]))
            in_list = False
            continue

        normalized = re.sub(r"\*\*(.*?)\*\*", r"<b>\1</b>", block)
        normalized = re.sub(r"\[(.*?)\]\((.*?)\)", r"\1", normalized)
        if in_list:
            flowables.append(Spacer(1, 0.04 * inch))
        flowables.append(Paragraph(normalized.replace("\n", " "), styles["FlorivaBody"]))
        in_list = False

    return flowables


def build_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            "FlorivaTitle",
            parent=styles["Title"],
            fontName="Times-Bold",
            fontSize=28,
            leading=32,
            textColor=colors.HexColor("#36553d"),
            spaceAfter=14,
        )
    )
    styles.add(
        ParagraphStyle(
            "FlorivaDek",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=12.5,
            leading=18,
            textColor=colors.HexColor("#5f544c"),
            spaceAfter=18,
        )
    )
    styles.add(
        ParagraphStyle(
            "FlorivaBody",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=colors.HexColor("#3f332b"),
            spaceAfter=9,
        )
    )
    styles.add(
        ParagraphStyle(
            "FlorivaH2",
            parent=styles["Heading2"],
            fontName="Times-Bold",
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#496f50"),
            spaceBefore=8,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            "FlorivaH3",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=15,
            textColor=colors.HexColor("#62413b"),
            spaceBefore=6,
            spaceAfter=5,
        )
    )
    styles.add(
        ParagraphStyle(
            "FlorivaList",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=15,
            leftIndent=12,
            textColor=colors.HexColor("#3f332b"),
            spaceAfter=9,
        )
    )
    styles.add(
        ParagraphStyle(
            "FlorivaEyebrow",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=11,
            textColor=colors.HexColor("#6f8f70"),
            uppercase=True,
            spaceAfter=12,
        )
    )
    return styles


def draw_page(canvas, doc):
    canvas.saveState()
    width, height = letter
    canvas.setFillColor(colors.HexColor("#fbf6ea"))
    canvas.rect(0, 0, width, height, stroke=0, fill=1)
    canvas.setStrokeColor(colors.HexColor("#d9d0bf"))
    canvas.setLineWidth(0.6)
    canvas.line(0.72 * inch, height - 0.58 * inch, width - 0.72 * inch, height - 0.58 * inch)
    canvas.line(0.72 * inch, 0.55 * inch, width - 0.72 * inch, 0.55 * inch)
    if LOGO_MARK_PATH.exists():
        canvas.drawImage(
            str(LOGO_MARK_PATH),
            0.75 * inch,
            height - 0.52 * inch,
            width=0.22 * inch,
            height=0.22 * inch,
            mask="auto",
            preserveAspectRatio=True,
        )
    canvas.setFillColor(colors.HexColor("#496f50"))
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(1.03 * inch, height - 0.43 * inch, clean_text(PDF_BOILERPLATE["brandEyebrow"]))
    canvas.setFillColor(colors.HexColor("#7a7066"))
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(width - 0.75 * inch, 0.34 * inch, f"floriva.app  |  page {doc.page}")
    canvas.restoreState()


def build_pdf(source_path: Path):
    data, body = parse_frontmatter(source_path.read_text(encoding="utf-8"))
    title = data.get("title", source_path.stem.replace("-", " ").title())
    description = data.get("description", "")
    output_path = OUTPUT_DIR / f"{source_path.stem}.pdf"
    styles = build_styles()
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=letter,
        rightMargin=0.76 * inch,
        leftMargin=0.76 * inch,
        topMargin=0.78 * inch,
        bottomMargin=0.74 * inch,
        title=title,
        author=PDF_BOILERPLATE["author"],
    )

    brand_row = Table(
        [
            [
                Image(str(LOGO_MARK_PATH), width=0.46 * inch, height=0.46 * inch)
                if LOGO_MARK_PATH.exists()
                else "",
                Paragraph("Floriva", styles["FlorivaEyebrow"]),
            ]
        ],
        colWidths=[0.56 * inch, doc.width - 0.56 * inch],
        style=TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        ),
    )

    flowables = [
        brand_row,
        Paragraph(clean_text(title), styles["FlorivaTitle"]),
        Paragraph(clean_text(description), styles["FlorivaDek"]),
        Table(
            [[Paragraph(clean_text(PDF_BOILERPLATE["disclaimer"]), styles["FlorivaBody"])]],
            colWidths=[doc.width],
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#eef3e8")),
                    ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#c7d6bd")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 12),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                    ("TOPPADDING", (0, 0), (-1, -1), 9),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ]
            ),
        ),
        Spacer(1, 0.18 * inch),
    ]
    flowables.extend(markdown_to_flowables(body, styles))
    flowables.append(PageBreak())
    flowables.append(Paragraph(clean_text(PDF_BOILERPLATE["aboutHeading"]), styles["FlorivaH2"]))
    flowables.append(
        Paragraph(
            clean_text(textwrap.dedent(PDF_BOILERPLATE["aboutBody"]).strip()),
            styles["FlorivaBody"],
        )
    )
    flowables.append(Paragraph(clean_text(PDF_BOILERPLATE["learnMoreLabel"]), styles["FlorivaBody"]))
    doc.build(flowables, onFirstPage=draw_page, onLaterPages=draw_page)
    return output_path


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for source_path in sorted(CONTENT_DIR.glob("*.mdx")):
        if source_path.name.startswith("."):
            continue
        output_path = build_pdf(source_path)
        print(output_path.relative_to(ROOT))


if __name__ == "__main__":
    main()
