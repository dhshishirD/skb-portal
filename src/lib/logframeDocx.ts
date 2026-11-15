import { AlignmentType, BorderStyle, Document, Packer, PageOrientation, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import type { CompactRow } from './logframe';
import type { LogframeKind } from './logframe';

/** Builds the Word file of the compact logframe (landscape A4, four columns). Runs in the browser. */

const HEADERS = [
  { text: 'Narrative summary', fill: 'F87171' },
  { text: 'Indicators', fill: 'FB923C' },
  { text: 'Means of verification', fill: 'FBBF24' },
  { text: 'Assumptions', fill: '84CC16' },
];
const BAND: Record<LogframeKind, string> = { goal: '6B21A8', outcome: '4F46E5', output: '0891B2', activity: '16A34A' };
const border = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
const borders = { top: border, bottom: border, left: border, right: border };

const lines = (items: string[]) =>
  items.length === 0
    ? [new Paragraph({ children: [new TextRun({ text: '-', color: '999999', size: 18 })] })]
    : items.map((t) => new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: t, size: 18 })] }));

export async function buildLogframeDocx(title: string, rows: CompactRow[]): Promise<Blob> {
  const widths = [1500, 4300, 4300, 3300, 3300]; // twips, total 16700 of the usable landscape width
  const headRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({ width: { size: widths[0], type: WidthType.DXA }, borders, children: [new Paragraph('')] }),
      ...HEADERS.map(
        (h, i) =>
          new TableCell({
            width: { size: widths[i + 1], type: WidthType.DXA },
            borders,
            shading: { type: ShadingType.CLEAR, fill: h.fill, color: 'auto' },
            children: [new Paragraph({ children: [new TextRun({ text: h.text, bold: true, color: 'FFFFFF', size: 20 })] })],
          }),
      ),
    ],
  });
  const bodyRows = rows.map(
    (r) =>
      new TableRow({
        cantSplit: false,
        children: [
          new TableCell({
            width: { size: widths[0], type: WidthType.DXA },
            borders,
            shading: { type: ShadingType.CLEAR, fill: BAND[r.kind], color: 'auto' },
            children: [new Paragraph({ children: [new TextRun({ text: r.label, bold: true, color: 'FFFFFF', size: 20 })] })],
          }),
          ...[r.narrative, r.indicators, r.verification, r.assumptions].map(
            (items, i) => new TableCell({ width: { size: widths[i + 1], type: WidthType.DXA }, borders, children: lines(items) }),
          ),
        ],
      }),
  );

  const doc = new Document({
    creator: 'SKB Works Portal',
    title: `Logframe - ${title}`,
    sections: [
      {
        properties: { page: { size: { orientation: PageOrientation.LANDSCAPE, width: 11906, height: 16838 }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
        children: [
          new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: `Logical framework: ${title}`, bold: true, size: 28 })] }),
          new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, rows: [headRow, ...bodyRows] }),
          new Paragraph({ alignment: AlignmentType.LEFT, spacing: { before: 160 }, children: [new TextRun({ text: 'Numbers in front of each line are the item numbers in the portal.', italics: true, size: 16, color: '666666' })] }),
        ],
      },
    ],
  });
  return Packer.toBlob(doc);
}
