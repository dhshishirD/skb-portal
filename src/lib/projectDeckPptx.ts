import type { DeckPlan, Slide } from './projectDeck';

/** Draws a DeckPlan as a 16:9 PowerPoint file. Runs in the browser (pptxgenjs is loaded only when needed). */

const GREEN = '0B9A55';
const DARK = '0F172A';
const MID = '475569';
const SOFT = 'F1F5F9';
const FONT = 'Calibri';
const W = 13.33;

export async function buildDeckPptx(plan: DeckPlan, meta: { code: string; title: string }): Promise<Uint8Array> {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Small Kindness Bangladesh';
  pptx.company = 'Small Kindness Bangladesh';
  pptx.title = meta.title;
  pptx.defineSlideMaster({
    title: 'CONTENT',
    background: { color: 'FFFFFF' },
    objects: [
      { rect: { x: 0, y: 0, w: W, h: 0.12, fill: { color: GREEN } } },
      { text: { text: `Small Kindness Bangladesh  |  ${meta.code}`, options: { x: 0.6, y: 7.05, w: 8, h: 0.3, fontFace: FONT, fontSize: 10, color: MID } } },
    ],
    slideNumber: { x: 12.3, y: 7.05, w: 0.5, h: 0.3, fontFace: FONT, fontSize: 10, color: MID },
  });

  const heading = (slide: ReturnType<typeof pptx.addSlide>, text: string) => {
    slide.addText(text, { x: 0.6, y: 0.4, w: 12.1, h: 0.8, fontFace: FONT, fontSize: 30, bold: true, color: DARK, valign: 'middle', fit: 'shrink' });
    slide.addShape('rect', { x: 0.6, y: 1.25, w: 1.2, h: 0.06, fill: { color: GREEN }, line: { color: GREEN, width: 0 } });
  };

  const draw = (s: Slide) => {
    if (s.type === 'title') {
      const slide = pptx.addSlide();
      slide.background = { color: GREEN };
      slide.addText(s.title, { x: 0.8, y: 1.6, w: 11.7, h: 2.4, fontFace: FONT, fontSize: 44, bold: true, color: 'FFFFFF', valign: 'middle', fit: 'shrink' });
      slide.addText(s.subtitle, { x: 0.8, y: 4.1, w: 11.7, h: 0.6, fontFace: FONT, fontSize: 24, color: 'FFFFFF' });
      slide.addText(s.meta.join('   |   '), { x: 0.8, y: 4.8, w: 11.7, h: 0.5, fontFace: FONT, fontSize: 16, color: 'E8F7EE' });
      return;
    }
    if (s.type === 'closing') {
      const slide = pptx.addSlide();
      slide.background = { color: GREEN };
      slide.addText(s.title, { x: 0.8, y: 2.0, w: 11.7, h: 1.2, fontFace: FONT, fontSize: 48, bold: true, color: 'FFFFFF' });
      slide.addText(s.lines.join('\n'), { x: 0.8, y: 3.5, w: 11.7, h: 2, fontFace: FONT, fontSize: 18, color: 'FFFFFF', paraSpaceAfter: 6 });
      return;
    }
    const slide = pptx.addSlide({ masterName: 'CONTENT' });
    heading(slide, s.title);
    if (s.type === 'stats') {
      const cols = 2;
      const cardW = 5.9;
      const cardH = 1.25;
      s.stats.forEach((st, i) => {
        const x = 0.6 + (i % cols) * (cardW + 0.3);
        const y = 1.7 + Math.floor(i / cols) * (cardH + 0.25);
        slide.addShape('roundRect', { x, y, w: cardW, h: cardH, fill: { color: SOFT }, line: { color: SOFT, width: 0 }, rectRadius: 0.08 });
        slide.addText(st.label.toUpperCase(), { x: x + 0.25, y: y + 0.1, w: cardW - 0.5, h: 0.35, fontFace: FONT, fontSize: 12, bold: true, color: GREEN });
        slide.addText(st.value, { x: x + 0.25, y: y + 0.45, w: cardW - 0.5, h: 0.7, fontFace: FONT, fontSize: 20, bold: true, color: DARK, valign: 'top', fit: 'shrink' });
      });
    } else if (s.type === 'text') {
      slide.addText(s.paragraphs.map((t) => ({ text: t, options: { breakLine: true, paraSpaceAfter: 12 } })), { x: 0.6, y: 1.6, w: 12.1, h: 5.2, fontFace: FONT, fontSize: 20, color: DARK, valign: 'top' });
    } else if (s.type === 'bullets') {
      slide.addText(
        s.items.map((t) => ({ text: t, options: { bullet: { code: '25CF' }, breakLine: true, paraSpaceAfter: 10 } })),
        { x: 0.7, y: 1.6, w: 11.9, h: 5.2, fontFace: FONT, fontSize: 22, color: DARK, valign: 'top' },
      );
    } else if (s.type === 'table') {
      const head = s.head.map((h) => ({ text: h, options: { bold: true, color: 'FFFFFF', fill: { color: GREEN }, fontFace: FONT, fontSize: 16 } }));
      const body = s.rows.map((r) => r.map((c) => ({ text: c, options: { fontFace: FONT, fontSize: 15, color: DARK, valign: 'top' as const } })));
      slide.addTable([head, ...body], { x: 0.6, y: 1.6, w: s.widths.reduce((a, b) => a + b, 0), colW: s.widths, border: { type: 'solid', color: 'CBD5E1', pt: 0.75 }, margin: 0.08 });
      if (s.note) slide.addText(s.note, { x: 0.6, y: 6.5, w: 12, h: 0.4, fontFace: FONT, fontSize: 13, italic: true, color: MID });
    } else if (s.type === 'people') {
      slide.addText(s.total.toLocaleString('en-US'), { x: 0.6, y: 1.6, w: 4, h: 1.2, fontFace: FONT, fontSize: 60, bold: true, color: GREEN });
      slide.addText('people registered', { x: 0.6, y: 2.8, w: 4, h: 0.5, fontFace: FONT, fontSize: 18, color: MID });
      slide.addChart(pptx.ChartType.bar, [{ name: 'People', labels: s.groups.map((g) => g.label), values: s.groups.map((g) => g.value) }], {
        x: 4.9, y: 1.5, w: 7.9, h: 4.9, barDir: 'col', chartColors: [GREEN], showValue: true, catAxisLabelFontSize: 13, valAxisLabelFontSize: 11, dataLabelFontSize: 13, valGridLine: { color: 'E2E8F0', size: 0.5 }, showLegend: false,
      });
      slide.addText(s.note, { x: 0.6, y: 6.5, w: 12, h: 0.4, fontFace: FONT, fontSize: 12, italic: true, color: MID });
    } else if (s.type === 'budget') {
      slide.addChart(pptx.ChartType.bar, [{ name: 'BDT', labels: [...s.bars].reverse().map((b) => b.label), values: [...s.bars].reverse().map((b) => Math.round(b.value)) }], {
        x: 0.5, y: 1.5, w: 7.6, h: 5.0, barDir: 'bar', chartColors: [GREEN], showValue: true, dataLabelFormatCode: '#,##0', catAxisLabelFontSize: 12, valAxisLabelFontSize: 10, dataLabelFontSize: 11, valAxisLabelFormatCode: '#,##0', valGridLine: { color: 'E2E8F0', size: 0.5 }, showLegend: false, showTitle: true, title: 'Cost by group (BDT)', titleFontSize: 14,
      });
      s.facts.forEach((f, i) => {
        const y = 1.6 + i * 1.05;
        slide.addShape('roundRect', { x: 8.4, y, w: 4.4, h: 0.9, fill: { color: SOFT }, line: { color: SOFT, width: 0 }, rectRadius: 0.08 });
        slide.addText(f.label.toUpperCase(), { x: 8.6, y: y + 0.05, w: 4.0, h: 0.3, fontFace: FONT, fontSize: 11, bold: true, color: GREEN });
        slide.addText(f.value, { x: 8.6, y: y + 0.35, w: 4.0, h: 0.5, fontFace: FONT, fontSize: 17, bold: true, color: DARK, fit: 'shrink' });
      });
      if (s.note) slide.addText(s.note, { x: 0.6, y: 6.6, w: 12, h: 0.35, fontFace: FONT, fontSize: 12, italic: true, color: MID });
    }
  };

  for (const s of plan.slides) draw(s);
  const out = await pptx.write({ outputType: 'uint8array' });
  return out as Uint8Array;
}
