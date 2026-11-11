import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeadingLevel,
  HeightRule,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import { TAGLINE, companyFacts, contactLine, preparedDate, toItems, toneFor } from './offeringDocument.js';

const NAVY = '242047';
const VIOLET = '5650A2';
const MUTED = '726C90';
const PAGE = { width: 11906, height: 16838 };
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };
const TABLE_BORDERS = { ...NO_BORDERS, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER };
const fill = (color) => ({ type: ShadingType.CLEAR, color: 'auto', fill: color });

/** Builds an editable brochure as a real .docx. Loaded only when a visitor asks for one. */
export async function buildWordDocument(list, { t, lang, dir, logoBytes, stats, url }) {
  const { about, clients, contact } = companyFacts;
  const rtl = dir === 'rtl';
  const run = (text, extra = {}) => new TextRun({ text, rightToLeft: rtl, ...extra });
  const para = (children, extra = {}) => new Paragraph({ bidirectional: rtl, children: [].concat(children), ...extra });
  const logo = (width) =>
    new ImageRun({
      type: 'png',
      data: logoBytes,
      transformation: { width, height: Math.round((width * 165) / 773) },
      altText: { name: 'MindSuite', title: 'MindSuite', description: 'MindSuite logo' },
    });
  const gap = (before) => para([], { spacing: { before, after: 0 } });

  /** A navy page: a table filling the sheet, so it also prints edge to edge. */
  const darkPage = (children, isLast = false) => [
    new Table({
      width: { size: PAGE.width, type: WidthType.DXA },
      columnWidths: [PAGE.width],
      borders: TABLE_BORDERS,
      rows: [
        new TableRow({
          height: { value: PAGE.height - 430, rule: HeightRule.EXACT },
          children: [
            new TableCell({
              width: { size: PAGE.width, type: WidthType.DXA },
              borders: NO_BORDERS,
              shading: fill(NAVY),
              verticalAlign: VerticalAlign.TOP,
              margins: { top: 0, bottom: 0, left: 900, right: 900 },
              children: [gap(900), ...children],
            }),
          ],
        }),
      ],
    }),
    // Word needs a paragraph after a table; the section break supplies one except at the very end.
    ...(isLast ? [new Paragraph({ spacing: { before: 0, after: 0, line: 20, lineRule: 'exact' }, children: [new TextRun({ text: '', size: 2 })] })] : []),
  ];

  const headerBand = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: NO_BORDERS,
            shading: fill(NAVY),
            margins: { top: 110, bottom: 110, left: 160, right: 160 },
            children: [para(logo(125))],
          }),
        ],
      }),
    ],
  });

  const count = list.length === 1 ? list[0].family.name : t('{count} offerings selected', { count: list.length });
  const title = list.length === 1 ? list[0].name : t('Selected offerings');
  const cover = darkPage([
    para(logo(235)),
    gap(2700),
    para(run(t('Build. Run. Protect. Transform.').toUpperCase(), { bold: true, color: 'CCBDF0', size: 20, characterSpacing: 40 }), { spacing: { after: 240 } }),
    ...TAGLINE.map(([a, b, color]) =>
      para([run(`${t(a)} `, { bold: true, color: 'F2F1F8', size: 76 }), run(t(b), { bold: true, color, size: 76 })], { spacing: { after: 40 } })
    ),
    gap(3300),
    para(run(title, { bold: true, color: 'FFFFFF', size: 38 }), { spacing: { after: 80 } }),
    para(run(`${count} · ${t('Prepared on {date}', { date: preparedDate(lang) })}`, { color: 'C7C3DB', size: 21 })),
  ]);

  const statCells = [
    [stats.offerings, t('defined offerings')],
    [stats.deliverables, t('named deliverables')],
    [stats.team, t('team members')],
    [clients.list.length, t('client businesses')],
  ].map(
    ([value, name]) =>
      new TableCell({
        borders: { ...NO_BORDERS, left: { style: BorderStyle.SINGLE, size: 24, color: 'FFFFFF' }, right: { style: BorderStyle.SINGLE, size: 24, color: 'FFFFFF' } },
        shading: fill('EFEBF8'),
        margins: { top: 130, bottom: 130, left: 140, right: 140 },
        children: [para(run(String(value), { bold: true, color: VIOLET, size: 44 })), para(run(name, { size: 17 }))],
      })
  );
  const heading = (text) => para(run(text, { bold: true, color: NAVY, size: 26 }), { spacing: { before: 280, after: 100 }, keepNext: true });
  const aboutPage = [
    para(run(t(about.title)), { heading: HeadingLevel.HEADING_1 }),
    para(run(t(about.lead), { size: 23 }), { spacing: { after: 260 } }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: TABLE_BORDERS, rows: [new TableRow({ children: statCells })] }),
    heading(t('How we work')),
    ...about.principles.flatMap((p) => [
      para(run(t(p.title), { bold: true, color: VIOLET }), { keepNext: true }),
      para(run(t(p.text), { size: 19 }), { spacing: { after: 90 } }),
    ]),
    heading(t('Our mission')),
    para(run(about.mission.map((m) => t(m.title)).join('   '), { bold: true, color: VIOLET })),
    heading(t(clients.title)),
    para(run(clients.list.map((c) => c.name).join('   ·   '))),
  ];

  const contents =
    list.length > 1
      ? [
          para(run(t('Selected offerings')), { heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
          ...list.map((o) =>
            para([run(`${o.name}  `, { bold: true, color: NAVY }), run(o.family.name, { color: MUTED, size: 17 })], {
              numbering: { reference: 'offering-numbers', level: 0 },
              spacing: { after: 70 },
            })
          ),
        ]
      : [];

  const items = (text) => {
    const parts = toItems(text);
    if (parts.length < 2) return [para(run(text, { size: 20 }))];
    return parts.map((item) => para(run(item, { size: 20 }), { numbering: { reference: 'offering-bullets', level: 0 } }));
  };
  const column = (name, text) =>
    new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      borders: { ...NO_BORDERS, left: { style: BorderStyle.SINGLE, size: 36, color: 'FFFFFF' }, right: { style: BorderStyle.SINGLE, size: 36, color: 'FFFFFF' } },
      shading: fill('F6F5FA'),
      margins: { top: 170, bottom: 170, left: 170, right: 170 },
      children: [para(run(name, { bold: true, color: NAVY, size: 22 }), { spacing: { after: 90 } }), ...items(text)],
    });

  const offerings = list.flatMap((o) => {
    const [tone, tint] = toneFor(o);
    return [
      para(run(`${o.family.name.toUpperCase()}  ›  ${o.area.name}`, { bold: true, color: tone, size: 18 }), { pageBreakBefore: true, spacing: { after: 80 }, keepNext: true }),
      para(run(o.name), { heading: HeadingLevel.HEADING_1, keepNext: true }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: TABLE_BORDERS,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: NO_BORDERS,
                shading: fill(tint),
                margins: { top: 170, bottom: 170, left: 200, right: 200 },
                children: [
                  para(run(t('Business value:').toUpperCase(), { bold: true, color: tone, size: 16, characterSpacing: 20 }), { spacing: { after: 50 } }),
                  para(run(o.value, { size: 24 })),
                ],
              }),
            ],
          }),
        ],
      }),
      para(run(o.definition, { size: 22 }), { spacing: { before: 260, after: 260 } }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: TABLE_BORDERS,
        rows: [new TableRow({ children: [column(t('Typical scope'), o.scope), column(t('What you receive'), o.deliverables)] })],
      }),
    ];
  });

  const contactBlock = (name, value) => [
    para(run(name.toUpperCase(), { color: 'ADA7C9', size: 16, characterSpacing: 20 }), { spacing: { before: 200, after: 30 } }),
    para(run(value, { color: 'FFFFFF', size: 24 })),
  ];
  const back = darkPage([
    para(logo(235)),
    gap(2500),
    para(run(t('Talk to a MindSuite expert'), { bold: true, color: 'FFFFFF', size: 66 }), { spacing: { after: 220 } }),
    para(run(t(about.lead), { color: 'D6D3E8', size: 24 }), { spacing: { after: 360 } }),
    para(
      new ExternalHyperlink({
        link: url,
        children: [run(`${t('Request a proposal')} →`, { bold: true, color: NAVY, size: 24, shading: fill('F4F2F9') })],
      })
    ),
    gap(300),
    ...contactBlock(t('Email'), contact.email),
    ...contactBlock(t('Phone'), contact.phone),
    ...contactBlock(t('Office'), contact.address.join(', ')),
    gap(900),
    para(
      run(t('Definitions and typical scope are guidance. Final deliverables, acceptance criteria and ownership are agreed in the proposal.'), {
        color: 'ADA7C9',
        size: 17,
      })
    ),
  ], true);

  // Covers have no running header or footer (sections would otherwise inherit them).
  const hairline = () => new Paragraph({ spacing: { before: 0, after: 0, line: 20, lineRule: 'exact' }, children: [new TextRun({ text: '', size: 2 })] });
  const NO_HEADER = { default: new Header({ children: [hairline()] }) };
  const NO_FOOTER = { default: new Footer({ children: [hairline()] }) };
  const fullBleed = { page: { size: PAGE, margin: { top: 0, bottom: 0, left: 0, right: 0, header: 0, footer: 0 } } };
  const doc = new Document({
    creator: 'MindSuite',
    title,
    styles: {
      default: { document: { run: { font: 'Arial', size: 21, color: '353157' }, paragraph: { spacing: { line: 288 } } } },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { font: 'Arial', size: 50, bold: true, color: NAVY },
          paragraph: { spacing: { before: 40, after: 200 }, outlineLevel: 0 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: 'offering-bullets',
          levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.START, style: { paragraph: { indent: { start: 300, hanging: 220 } } } }],
        },
        {
          reference: 'offering-numbers',
          levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START, style: { paragraph: { indent: { start: 480, hanging: 480 } } } }],
        },
      ],
    },
    sections: [
      { properties: fullBleed, headers: NO_HEADER, footers: NO_FOOTER, children: cover },
      {
        properties: {
          page: { size: PAGE, margin: { top: 1500, bottom: 1100, left: 1000, right: 1000, header: 450, footer: 450 } },
        },
        headers: { default: new Header({ children: [headerBand, new Paragraph({ children: [] })] }) },
        footers: {
          default: new Footer({
            children: [para([run(`${contactLine()}     `, { color: MUTED, size: 16 }), new TextRun({ children: [PageNumber.CURRENT], color: MUTED, size: 16 })])],
          }),
        },
        children: [...aboutPage, ...contents, ...offerings],
      },
      { properties: fullBleed, headers: NO_HEADER, footers: NO_FOOTER, children: back },
    ],
  });
  return Packer.toBlob(doc);
}
