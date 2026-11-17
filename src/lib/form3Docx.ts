import { AlignmentType, BorderStyle, Document, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { money, type Form3Data } from './form3Export';

/** Builds the Word file of a donor Form 3 (IHH layout) from Form3Data. Runs in the browser. */

export const FONT = 'Arial';
export const border = { style: BorderStyle.SINGLE, size: 4, color: '808080' };
export const borders = { top: border, bottom: border, left: border, right: border };
export const W = 9600; // usable width in twips on A4 with 2 cm margins

export const run = (text: string, o: { bold?: boolean; size?: number; italics?: boolean; color?: string } = {}) =>
  new TextRun({ text, font: FONT, size: o.size ?? 20, bold: o.bold, italics: o.italics, color: o.color });

export const para = (text: string, o: { bold?: boolean; size?: number; italics?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number; before?: number } = {}) =>
  new Paragraph({ alignment: o.align, spacing: { after: o.after ?? 80, before: o.before ?? 0 }, children: [run(text, o)] });

export const multi = (text: string, o: { bold?: boolean } = {}): Paragraph[] => {
  const lines = text.split('\n');
  return (lines.length ? lines : ['']).map((l) => new Paragraph({ spacing: { after: 60 }, children: [run(l, o)] }));
};

export const heading = (text: string) => para(text, { bold: true, size: 24, before: 200, after: 100 });
export const sub = (text: string) => para(text, { bold: true, size: 21, before: 120, after: 80 });

export function cell(children: Paragraph[], width: number, o: { fill?: string; span?: number } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    columnSpan: o.span,
    borders,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined,
    children,
  });
}
export const t = (text: string, bold = false) => multi(text, { bold });
export const table = (widths: number[], rows: TableRow[]) => new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, rows });
export const row = (cells: TableCell[], header = false) => new TableRow({ tableHeader: header, cantSplit: true, children: cells });
export const spacer = () => new Paragraph({ spacing: { after: 80 }, children: [] });

/** "Label: value" in one cell, the label in bold. */
export const labelled = (label: string, value: string, width: number, span?: number) =>
  cell([new Paragraph({ spacing: { after: 40 }, children: [run(`${label}: `, { bold: true }), run(value)] })], width, { span });

/** Two columns: the label cell ends with a colon, the answer sits in the next cell. */
export const twoCol = (label: string, value: string) => row([cell(t(label, true), 3000, { fill: 'F2F2F2' }), cell(t(value), W - 3000)]);

export function buildForm3Document(d: Form3Data): Document {
  const a = d.applicant;
  const cur = d.project.currency;
  const half = W / 2;

  const children: Array<Paragraph | Table> = [
    para('FORM 3', { bold: true, size: 36, align: AlignmentType.CENTER, after: 40 }),
    para('Project Proposal Form', { bold: true, size: 28, align: AlignmentType.CENTER, after: 120 }),
    para(`Prepared for ${d.project.donorName}. Please read it carefully, complete what is marked, sign it and send it with the supporting documents.`, { italics: true, after: 120 }),

    heading('Section 1: Information of the Partner Organization Preparing the Project'),
    table([3000, W - 3000], [
      twoCol('Official Name:', a.officialName),
      twoCol('Work Name (if there is any):', a.workName),
      twoCol('Official Address:', a.address),
    ]),
    table([half, half], [
      row([labelled('Phone Number', a.phone, half), labelled('Fax', a.fax, half)]),
      row([labelled('E-Mail', a.email, half), labelled('Website', a.website, half)]),
    ]),

    heading('Section 2: General Content of the Project'),
    sub('2.1 General Information about the Project'),
    table([half, half], [
      row([labelled('Project name', d.project.title, W, 2)]),
      row([labelled('Total Cost of Project', d.project.totalCostText, half), labelled(`Amount Requested From ${d.project.donorName}`, d.project.requestedText, half)]),
      row([labelled('Project Duration', d.project.duration, W, 2)]),
      row([labelled('Project manager', a.managerName, half), labelled('Phone Number', a.managerPhone, half)]),
      row([labelled('E-Mail', a.managerEmail, half), labelled('Mobile Number', a.managerMobile, half)]),
    ]),

    sub('2.2 Project Address Information'),
    table([half, half], [
      row([labelled('Country', 'Bangladesh', half), labelled('Region', d.geo.regions, half)]),
      row([labelled('City', d.geo.cities, half), labelled('Neighborhood/Village', d.geo.villages, half)]),
      row([labelled('Coordinates', '', half), labelled('Distance from the Capital', '', half)]),
    ]),

    sub('2.3 If the project will be implemented in more than one place, fill in the table below.'),
  ];

  const aw = [500, 1900, 1900, 2300, 1400, 1600];
  const areaRows: TableRow[] = [
    row(['', 'Region', 'City', 'Neighborhood/ Village', 'Item & Pack Quantity', 'Number of Beneficiaries (Family Qty)'].map((h, i) => cell(t(h, true), aw[i], { fill: 'E5E7EB' })), true),
    ...d.areas.map((r, i) => row([String(i + 1), r.region, r.city, r.village, r.items, r.families].map((v, k) => cell(t(v), aw[k])))),
  ];
  if (d.areas.length === 0) areaRows.push(row([cell(t('(no areas entered in the portal yet)'), W, { span: 6 })]));
  else areaRows.push(row([cell(t('Total', true), aw[0] + aw[1], { span: 2 }), cell(t(d.areaTotals.text, true), W - aw[0] - aw[1], { span: 4 })]));
  children.push(table(aw, areaRows));

  children.push(sub('2.5 Project Details'));
  children.push(
    table([3000, W - 3000], [
      twoCol('Brief Description of the Project:', d.details.brief),
      twoCol('Project Rationale:', d.details.rationale),
      twoCol('Project Objectives:', d.details.objectives),
      twoCol('Target group:', d.details.targetGroup),
      twoCol('Total Number of Beneficiaries:', d.details.beneficiaries),
      twoCol('Groups that may be negatively affected by the project (if there is any):', d.details.negative),
      twoCol('Problems that may arise as a result of the project and measures that can be taken:', d.details.problems),
    ]),
  );

  children.push(heading('Section 3: Project Implementation and Internal Audit'));
  children.push(sub('3.1 Explain step by step how your foundation will implement the project, mentioning all the details.'));
  children.push(table([W], [row([cell(t(d.implementation), W)])]));
  children.push(sub("3.2 Please state the experience and ability of your foundation to successfully carry out this project."));
  children.push(table([W], [row([cell(t(d.texts.experience), W)])]));
  children.push(sub("3.3 Provide detailed information about your foundation's internal control mechanism for the implementation of this project."));
  children.push(table([W], [row([cell(t(d.texts.internalControl), W)])]));

  children.push(heading('Section 4: Project Cost and Sustainability'));
  children.push(sub('4.1 Write the cost items of the project.'));
  const cw = [2700, 1300, 1400, 1200, 1500, 1500];
  const dh = `Unit Price-${cur}`;
  const costRows: TableRow[] = [
    row([cell(t('PROJECT COST', true), cw[0], { fill: 'E5E7EB' }), cell(t('TOTAL', true), W - cw[0], { fill: 'E5E7EB', span: 5 })]),
    row([`Items to be Purchased`, dh, 'Unit Price- Local', 'Quantity', `Total Price in ${cur}`, 'Total Price in Local'].map((h, i) => cell(t(h, true), cw[i], { fill: 'E5E7EB' })), true),
    ...d.cost.rows.map((r) =>
      row([r.name, r.unitDonor === null ? '' : money(r.unitDonor), money(r.unitLocal), String(r.quantity), r.totalDonor === null ? '' : money(r.totalDonor), money(r.totalLocal)].map((v, i) => cell(t(v), cw[i]))),
    ),
  ];
  const sumRow = (label: string, donor: number | null, local: number, bold = false) =>
    row([cell(t(label, bold), cw[0] + cw[1] + cw[2] + cw[3], { span: 4 }), cell(t(donor === null ? '' : money(donor), bold), cw[4]), cell(t(money(local), bold), cw[5])]);
  costRows.push(sumRow('Total Purchased Cost', d.cost.purchasedDonor, d.cost.purchasedLocal, true));
  costRows.push(sumRow(`Admin Cost (${d.cost.adminPercent}%)`, d.cost.adminDonor, d.cost.adminLocal));
  costRows.push(sumRow('TOTAL:', d.cost.totalDonor, d.cost.totalLocal, true));
  costRows.push(row([cell(t(`FUND REQUESTED FROM ${d.project.donorName.toUpperCase()}: ${d.cost.fundRequestedText}`, true), W, { span: 6 })]));
  children.push(table(cw, costRows));
  children.push(para(d.cost.rate ? `Conversion Rate: ${cur} 1 = ${d.cost.rate} BDT.` : 'Conversion Rate: (not set)', { before: 80 }));
  for (const n of d.cost.notes) children.push(para(`Note: ${n}`, { italics: true }));

  children.push(sub('4.2 Is this proposal to fund an existing project?   Yes  /  No'));
  children.push(table([W], [row([cell(t('If your answer is Yes, write your evaluations of the current project.'), W)])]));
  children.push(sub('4.3 Provide details on other institutions where you submitted this project and the funds obtained.'));
  children.push(table([W], [row([cell(t(d.texts.otherFunding), W)])]));
  children.push(sub('4.4 Sustainability of the Project (For Permanent Projects)'));
  children.push(table([W], [row([cell(t(d.texts.sustainability), W)])]));

  children.push(heading('Section 5: Control List'));
  for (const x of ['At least 3 offers that indicate market prices', 'Region Map', 'Detailed Case Studies / Social-Economic Evaluations', 'Others']) children.push(para(`☐  ${x}`));

  children.push(heading('Section 6: Pledge'));
  children.push(
    para(
      `We, who have the signatures below, ${a.officialName}${a.workName ? ` (${a.workName})` : ''}, undertake that everything stated in this form is true, that all requested documents are included in the annex, and that the funds will be used in line with the purpose if ${d.project.donorName} supports this project.`,
      { after: 160 },
    ),
  );
  children.push(
    table([half, half], [
      row([
        cell([...t(a.chairmanTitle, true), ...t('Full Name:'), ...t('Signature:'), ...t('Date:'), spacer()], half),
        cell([...t('General Manager / G. Secretary', true), ...t(`Full Name: ${a.generalManagerName}`), ...t('Signature:'), ...t('Date:'), spacer()], half),
      ]),
    ]),
  );
  children.push(para(`Prepared from the SKB Works Portal. Amounts in ${cur} use the exchange rate on the Budget tab.`, { italics: true, size: 16, before: 160 }));

  return new Document({
    creator: 'SKB Works Portal',
    title: `Form 3 - ${d.project.title}`,
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children }],
  });
}

export async function buildForm3Docx(d: Form3Data): Promise<Blob> {
  return Packer.toBlob(buildForm3Document(d));
}


