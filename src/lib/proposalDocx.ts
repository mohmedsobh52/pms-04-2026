import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  ImageRun, PageBreak, LevelFormat,
} from "docx";

export interface ProposalDocxOptions {
  title: string;
  client?: string;
  companyName?: string;
  logoDataUrl?: string;
  proposalNumber?: string;
  signName?: string;
  signTitle?: string;
  signDate?: string;
  language: "ar" | "en";
  markdown: string;
}

const PRIMARY = "0F4F4A";

function dataUrlToUint8(dataUrl: string): { bytes: Uint8Array; type: "png" | "jpg" | "gif" | "bmp" } | null {
  const m = dataUrl.match(/^data:image\/(png|jpe?g|gif|bmp);base64,(.+)$/i);
  if (!m) return null;
  const type = (m[1].toLowerCase() === "jpeg" ? "jpg" : m[1].toLowerCase()) as any;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, type };
}

function inlineRuns(text: string, base: { bold?: boolean; size?: number } = {}): TextRun[] {
  // Handle **bold** and *italic* inline
  const runs: TextRun[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const tok = m[0];
    if (tok.startsWith("**")) runs.push(new TextRun({ text: tok.slice(2, -2), bold: true, ...base }));
    else if (tok.startsWith("`")) runs.push(new TextRun({ text: tok.slice(1, -1), font: "Consolas", ...base }));
    else runs.push(new TextRun({ text: tok.slice(1, -1), italics: true, ...base }));
    last = m.index + tok.length;
  }
  if (last < text.length) runs.push(new TextRun({ text: text.slice(last), ...base }));
  return runs.length ? runs : [new TextRun({ text, ...base })];
}

function parseMarkdown(md: string): (Paragraph | Table)[] {
  const lines = md.split(/\r?\n/);
  const out: (Paragraph | Table)[] = [];
  let i = 0;

  const flushTable = (start: number): number => {
    // Collect contiguous | ... | lines
    const rows: string[] = [];
    let j = start;
    while (j < lines.length && /^\s*\|.*\|\s*$/.test(lines[j])) { rows.push(lines[j].trim()); j++; }
    if (rows.length < 2) return start;
    const split = (l: string) => l.split("|").slice(1, -1).map((c) => c.trim());
    const headers = split(rows[0]);
    const bodyRows = rows.slice(2).map(split);
    const colCount = headers.length;
    const tableWidth = 9000;
    const colW = Math.floor(tableWidth / colCount);
    const border = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
    const borders = { top: border, bottom: border, left: border, right: border };
    const headerCells = headers.map((h) => new TableCell({
      width: { size: colW, type: WidthType.DXA }, borders,
      shading: { fill: "EAF2F1", type: ShadingType.CLEAR, color: "auto" },
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
    }));
    const trHeader = new TableRow({ children: headerCells, tableHeader: true });
    const trBody = bodyRows.map((r) => new TableRow({
      children: r.map((c) => new TableCell({
        width: { size: colW, type: WidthType.DXA }, borders,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [new Paragraph({ children: inlineRuns(c) })],
      })),
    }));
    out.push(new Table({
      width: { size: tableWidth, type: WidthType.DXA },
      columnWidths: Array(colCount).fill(colW),
      rows: [trHeader, ...trBody],
    }));
    return j;
  };

  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-+/.test(lines[i + 1])) {
      const next = flushTable(i);
      if (next !== i) { i = next; continue; }
    }
    if (/^###\s+/.test(line)) {
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: inlineRuns(line.replace(/^###\s+/, ""), { bold: true }) }));
    } else if (/^##\s+/.test(line)) {
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: inlineRuns(line.replace(/^##\s+/, ""), { bold: true }) }));
    } else if (/^#\s+/.test(line)) {
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: inlineRuns(line.replace(/^#\s+/, ""), { bold: true }) }));
    } else if (/^\s*[-*]\s+/.test(line)) {
      out.push(new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: inlineRuns(line.replace(/^\s*[-*]\s+/, "")) }));
    } else if (/^\s*\d+\.\s+/.test(line)) {
      out.push(new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: inlineRuns(line.replace(/^\s*\d+\.\s+/, "")) }));
    } else if (line.trim() === "") {
      out.push(new Paragraph({ children: [new TextRun("")] }));
    } else {
      out.push(new Paragraph({ children: inlineRuns(line) }));
    }
    i++;
  }
  return out;
}

export async function generateProposalDocx(opts: ProposalDocxOptions): Promise<Blob> {
  const isRtl = opts.language === "ar";
  const coverChildren: Paragraph[] = [];

  if (opts.logoDataUrl) {
    const img = dataUrlToUint8(opts.logoDataUrl);
    if (img) {
      coverChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new ImageRun({
          type: img.type,
          data: img.bytes,
          transformation: { width: 140, height: 80 },
          altText: { title: "logo", description: "Company logo", name: "logo" },
        } as any)],
      }));
    }
  }
  if (opts.companyName) {
    coverChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER, bidirectional: isRtl,
      children: [new TextRun({ text: opts.companyName, bold: true, size: 28, color: "555555" })],
    }));
  }
  coverChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER, bidirectional: isRtl,
    spacing: { before: 300, after: 200 },
    children: [new TextRun({ text: opts.title, bold: true, size: 48, color: PRIMARY })],
  }));
  if (opts.proposalNumber) {
    coverChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER, bidirectional: isRtl,
      children: [new TextRun({ text: opts.proposalNumber, size: 22, color: "888888" })],
    }));
  }
  if (opts.client) {
    coverChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER, bidirectional: isRtl, spacing: { before: 200 },
      children: [
        new TextRun({ text: isRtl ? "مُقدَّم إلى: " : "Prepared for: ", size: 22 }),
        new TextRun({ text: opts.client, bold: true, size: 22 }),
      ],
    }));
  }
  if (opts.signDate) {
    coverChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER, bidirectional: isRtl, spacing: { before: 100 },
      children: [new TextRun({ text: opts.signDate, size: 20, color: "888888" })],
    }));
  }
  coverChildren.push(new Paragraph({ children: [new PageBreak()] }));

  const body = parseMarkdown(opts.markdown).map((p) => {
    if (p instanceof Paragraph && isRtl) {
      // mark paragraphs as bidi where possible (set via constructor not feasible here)
    }
    return p;
  });

  const signatureBlock: (Paragraph | Table)[] = [];
  if (opts.signName || opts.signTitle) {
    signatureBlock.push(new Paragraph({
      heading: HeadingLevel.HEADING_3, bidirectional: isRtl,
      spacing: { before: 600 },
      children: [new TextRun({ text: isRtl ? "المُقدِّم" : "Submitted by", bold: true, color: PRIMARY })],
    }));
    const cell = (text: string) => new TableCell({
      width: { size: 4500, type: WidthType.DXA },
      borders: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" } },
      margins: { top: 100, bottom: 100, left: 100, right: 100 },
      children: [new Paragraph({ bidirectional: isRtl, children: inlineRuns(text) })],
    });
    signatureBlock.push(new Table({
      width: { size: 9000, type: WidthType.DXA },
      columnWidths: [4500, 4500],
      rows: [
        new TableRow({ children: [cell(`**${isRtl ? "الاسم" : "Name"}:** ${opts.signName ?? ""}`), cell(`**${isRtl ? "المنصب" : "Position"}:** ${opts.signTitle ?? ""}`)] }),
        new TableRow({ children: [cell(`**${isRtl ? "التاريخ" : "Date"}:** ${opts.signDate ?? ""}`), cell(`**${isRtl ? "التوقيع" : "Signature"}:** ____________________`)] }),
      ],
    }));
  }

  const doc = new Document({
    creator: opts.companyName || "Lovable",
    title: opts.title,
    styles: {
      default: { document: { run: { font: isRtl ? "Cairo" : "Tajawal", size: 22 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 36, bold: true, color: PRIMARY }, paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 28, bold: true, color: PRIMARY }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 24, bold: true, color: PRIMARY }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
      ],
    },
    numbering: {
      config: [
        { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ],
    },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children: [...coverChildren, ...body, ...signatureBlock],
    }],
  });

  return await Packer.toBlob(doc);
}
