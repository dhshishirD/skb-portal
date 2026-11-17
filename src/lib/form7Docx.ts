import { AlignmentType, Document, Packer, type Paragraph, type Table } from 'docx';
import { money, moneyWithCurrency } from './form3Export';
import { cell, heading, labelled, para, row, spacer, sub, t, table, twoCol, W } from './form3Docx';
import type { Form7Data } from './form7Export';

/** Builds the Word file of a donor Form 7 (project feedback report, IHH layout). Runs in the browser. */
export function buildForm7Document(d: Form7Data): Document {
  const b = d.base;
  const a = b.applicant;
  const cur = b.project.currency;
  const half = W / 2;

  const children: Array<Paragraph | Table> = [
    para('FORM 7', { bold: true, size: 36, align: AlignmentType.CENTER, after: 40 }),
    para('Project Feedback Report', { bold: true, size: 28, align: AlignmentType.CENTER, after: 120 }),
    para(`Prepared for ${b.project.donorName}. Please complete what is marked, sign it and send it with the invoices and distribution lists.`, { italics: true, after: 120 }),

    heading('Section 1: Information of the Partner Foundation Preparing the Project'),
    table([3000, W - 3000], [twoCol('Official Name:', a.officialName), twoCol('Work Name (If there is one):', a.workName), twoCol('Official Address:', a.address)]),
    table([half, half], [
      row([labelled('Phone Number', a.phone, half), labelled('Fax', a.fax, half)]),
      row([labelled('E-Mail', a.email, half), labelled('Website', a.website, half)]),
    ]),

    heading('Section 2: General Content of the Project'),
    sub('2.1 General Information about the Project'),
    table([half, half], [
      row([labelled('Project Name', b.project.title, W, 2)]),
      row([labelled('Total Cost of Project', b.project.totalCostText, half), labelled(`Amount Requested From ${b.project.donorName}`, b.project.requestedText, half)]),
      row([labelled('Project manager', a.managerName, half), labelled('Phone Number', a.managerPhone, half)]),
      row([labelled('E-Mail', a.managerEmail, half), labelled('Mobile Number', a.managerMobile, half)]),
    ]),
    sub('2.2 Project Address Information'),
    table([half, half], [
      row([labelled('Country', 'Bangladesh', half), labelled('Region', b.geo.regions, half)]),
      row([labelled('City', b.geo.cities, half), labelled('Neighborhood/Village', b.geo.villages, half)]),
    ]),
    sub('2.3 Implementation Regions of the Project'),
  ];

  const aw = [500, 1900, 1900, 2300, 1400, 1600];
  const areaRows = [
    row(['', 'Region', 'City', 'Neighborhood / Village:', 'Item&Pack Quantity', 'Number of Beneficiaries'].map((h, i) => cell(t(h, true), aw[i], { fill: 'E5E7EB' })), true),
    ...b.areas.map((r, i) => row([String(i + 1), r.region, r.city, r.village, r.items, r.families ? `${r.families} Families` : ''].map((v, k) => cell(t(v), aw[k])))),
  ];
  if (b.areas.length === 0) areaRows.push(row([cell(t('(no areas entered in the portal yet)'), W, { span: 6 })]));
  else areaRows.push(row([cell(t('Total', true), aw[0] + aw[1], { span: 2 }), cell(t(b.areaTotals.text, true), W - aw[0] - aw[1], { span: 4 })]));
  children.push(table(aw, areaRows));

  children.push(heading('Section 3: General Project Summary'));
  children.push(sub('3.1 Project Detail'));
  children.push(
    table([3000, W - 3000], [
      twoCol('Brief Description of the Project:', b.details.brief),
      twoCol('Total number of Beneficiaries:', b.details.beneficiaries),
      twoCol('Overall impact of the project and benefits to beneficiaries:', ''),
      twoCol('Groups Adversely Affected by the Project (If there is any):', b.details.negative),
      twoCol('Problems and measures to be taken during the project:', b.details.problems),
    ]),
  );
  children.push(para('Each family is counted as 5 individuals. The total number of people should match "Total number of Beneficiaries".', { italics: true, before: 80 }));
  children.push(
    table([3200, 3200, 3200], [
      row([cell(t('Total Number of People', true), 3200, { fill: 'E5E7EB' }), cell(t('Number of Individuals', true), 3200, { fill: 'E5E7EB' }), cell(t('Number of Families', true), 3200, { fill: 'E5E7EB' })]),
      row([cell(t(d.individuals ? d.individuals.toLocaleString('en-US') : ''), 3200), cell(t(d.individuals ? d.individuals.toLocaleString('en-US') : ''), 3200), cell(t(d.families ? String(d.families) : ''), 3200)]),
    ]),
  );
  children.push(sub('Project Duration'));
  children.push(table([half, half], [row([labelled('Start Date', d.startDate, half), labelled('End Date', d.endDate, half)])]));
  children.push(para('The payment, invoices and distribution lists must be between the start and end dates.', { italics: true, before: 80 }));

  children.push(heading('Section 4: Feedback'));
  children.push(sub('4.1 Summarize your goals, targets, and follow-up and success in achieving those goals.'));
  children.push(table([W], [row([cell(t(b.details.objectives), W)])]));
  children.push(sub('4.2 Explain how the project supported the local people and the local economy.'));
  children.push(table([W], [row([cell(t(''), W)])]));

  children.push(heading('Section 5: Financial Summary'));
  children.push(
    table([3200, 3200, 3200], [
      row([cell(t('Total Cost of the Project', true), 3200, { fill: 'E5E7EB' }), cell(t(`Funds received from ${b.project.donorName}`, true), 3200, { fill: 'E5E7EB' }), cell(t('Local Rate on the Day of Withdrawal', true), 3200, { fill: 'E5E7EB' })]),
      row([cell(t(b.project.totalCostText), 3200), cell(t(d.fundsReceivedText), 3200), cell(t(d.rateText), 3200)]),
    ]),
  );

  const cw = [2700, 1300, 1200, 1400, 1300, 1700];
  const hdr = (title: string) => [
    row([cell(t(title, true), W, { fill: 'E5E7EB', span: 6 })]),
    row(['Definition', 'Measure', 'Quantity', 'Unit Price (Local)', `Unit Price (${cur})`, `Total Price (Local) / (${cur})`].map((h, i) => cell(t(h, true), cw[i], { fill: 'E5E7EB' })), true),
  ];
  children.push(sub('5.1 The breakdown of the project cost (planned)'));
  children.push(
    table(cw, [
      ...hdr('Main Cost Table'),
      ...b.cost.rows.map((r) => row([r.name, '', String(r.quantity), money(r.unitLocal), r.unitDonor === null ? '' : money(r.unitDonor), `${money(r.totalLocal)} / ${r.totalDonor === null ? '' : money(r.totalDonor)}`].map((v, i) => cell(t(v), cw[i])))),
      row([cell(t(`Admin Cost (${b.cost.adminPercent}%)`), cw[0] + cw[1] + cw[2] + cw[3] + cw[4], { span: 5 }), cell(t(`${money(b.cost.adminLocal)} / ${b.cost.adminDonor === null ? '' : money(b.cost.adminDonor)}`), cw[5])]),
      row([cell(t('Grand Total', true), cw[0] + cw[1] + cw[2] + cw[3] + cw[4], { span: 5 }), cell(t(`${money(b.cost.totalLocal)} / ${b.cost.totalDonor === null ? '' : money(b.cost.totalDonor)}`, true), cw[5])]),
    ]),
  );

  children.push(sub('5.2 The details of the expenditure on the implementation of the project'));
  const spendRows = d.spend.rows.length
    ? d.spend.rows.map((r) => row([r.name, '', '', '', '', `${money(r.totalLocal)} / ${r.totalDonor === null ? '' : money(r.totalDonor)}`].map((v, i) => cell(t(v), cw[i]))))
    : [row([cell(t('(nothing recorded yet)'), W, { span: 6 })])];
  children.push(
    table(cw, [
      ...hdr('Package 1'),
      ...spendRows,
      row([cell(t('Grand Total', true), cw[0] + cw[1] + cw[2] + cw[3] + cw[4], { span: 5 }), cell(t(`${money(d.spend.totalLocal)} / ${d.spend.totalDonor === null ? '' : money(d.spend.totalDonor)}`, true), cw[5])]),
    ]),
  );

  children.push(sub('5.3 The administrative cost (institutional share)'));
  children.push(
    table([6400, 3200], [
      row([cell(t('Administrative Expenses (Foundation Share)', true), 6400, { fill: 'E5E7EB' }), cell(t(`Amount (${cur})`, true), 3200, { fill: 'E5E7EB' })]),
      row([cell(t(`1. Administrative Expenses (${d.admin.percent}%)`), 6400), cell(t(d.admin.donor === null ? '' : moneyWithCurrency(d.admin.donor, cur)), 3200)]),
    ]),
  );
  children.push(spacer());
  children.push(
    table([half, half], [
      row([labelled(`Total expenditure made from ${b.project.donorName} fund`, d.totalExpenditureText, half), labelled('Unspent Amount (if any)', d.unspentText, half)]),
    ]),
  );

  children.push(sub('5.4 Invoice Declaration (write the invoice number on each invoice with a pencil)'));
  const iw = [800, 1300, 1900, 2200, 1700, 1700];
  children.push(
    table(iw, [
      row(['Invoice No', 'Invoice Date', 'Store & Company Name', 'Purchased Goods: Name', `Total Amount (Local)`, `Total Amount (${cur})`].map((h, i) => cell(t(h, true), iw[i], { fill: 'E5E7EB' })), true),
      ...(d.invoices.length
        ? d.invoices.map((r) => row([String(r.no), r.date, r.store, r.goods, money(r.totalLocal), r.totalDonor === null ? '' : moneyWithCurrency(r.totalDonor, cur)].map((v, i) => cell(t(v), iw[i]))))
        : [row([cell(t('(nothing recorded yet)'), W, { span: 6 })])]),
    ]),
  );

  children.push(heading('Section 6: Project Feedback Pledge'));
  children.push(
    para(
      `We, the signatories below, ${a.officialName}${a.workName ? ` (${a.workName})` : ''}, confirm that everything stated in this report is true and that the funds were used for the purpose of the project.`,
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
  children.push(para('Prepared from the SKB Works Portal. Amounts in the foreign currency use the exchange rate on the Budget tab.', { italics: true, size: 16, before: 160 }));

  return new Document({
    creator: 'SKB Works Portal',
    title: `Form 7 - ${b.project.title}`,
    styles: { default: { document: { run: { font: 'Arial', size: 20 } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children }],
  });
}

export async function buildForm7Docx(d: Form7Data): Promise<Blob> {
  return Packer.toBlob(buildForm7Document(d));
}
