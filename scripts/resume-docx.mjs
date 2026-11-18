import fs from 'node:fs';
import { zipEntries } from './zip.mjs';

const word = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const relationship = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const packageNamespace = 'http://schemas.openxmlformats.org/package/2006';
const stylesFile = new URL('../templates/resume-styles.xml', import.meta.url);

function paragraph(style, value) {
  if (!value) return '';
  const clean = value.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, '');
  const escaped = clean.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const run = escaped.split(/\r\n|[\r\n]/).map(line =>
    '<w:t xml:space="preserve">' + line + '</w:t>').join('<w:br/>');
  const list = style === 'Bullet' ? '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>' : '';
  return `<w:p><w:pPr><w:pStyle w:val="${style}"/>${list}</w:pPr><w:r>${run}</w:r></w:p>`;
}

export function renderResumeDocx(snapshot) {
  const { profile, headline, summary, experiences, skills } = snapshot;
  const contact = [profile.location, profile.email, profile.phone, profile.website].filter(Boolean);
  const body = [
    paragraph('Title', profile.name), paragraph('Subtitle', headline),
    paragraph('Contact', contact.join('  ·  ')), paragraph('Normal', summary),
    paragraph('Heading1', 'Experience')
  ];
  for (const role of experiences) {
    body.push(paragraph('Role', [role.title, role.company].filter(Boolean).join('  |  ')),
      paragraph('Period', role.period));
    for (const bullet of role.bullets) body.push(paragraph('Bullet', bullet.text));
  }
  if (skills.length) body.push(paragraph('Heading1', 'Skills'), paragraph('Normal', skills.join('  ·  ')));
  if (profile.education.length) {
    body.push(paragraph('Heading1', 'Education'));
    for (const entry of profile.education) {
      body.push(paragraph('Normal', [entry.qualification, entry.institution, entry.date].filter(Boolean).join('  |  ')));
    }
  }

  const parts = {
    '[Content_Types].xml': `<Types xmlns="${packageNamespace}/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
      <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
    </Types>`,
    '_rels/.rels': `<Relationships xmlns="${packageNamespace}/relationships">
      <Relationship Id="rId1" Type="${relationship}/officeDocument" Target="word/document.xml"/>
    </Relationships>`,
    'word/_rels/document.xml.rels': `<Relationships xmlns="${packageNamespace}/relationships">
      <Relationship Id="rId1" Type="${relationship}/styles" Target="styles.xml"/>
      <Relationship Id="rId2" Type="${relationship}/numbering" Target="numbering.xml"/>
    </Relationships>`,
    'word/styles.xml': fs.readFileSync(stylesFile, 'utf8'),
    'word/numbering.xml': `<w:numbering xmlns:w="${word}">
      <w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/>
        <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/>
          <w:pPr><w:tabs><w:tab w:val="num" w:pos="275"/></w:tabs><w:ind w:left="275" w:hanging="255"/></w:pPr>
        </w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
    </w:numbering>`,
    'word/document.xml': `<w:document xmlns:w="${word}"><w:body>${body.join('')}
      <w:sectPr><w:pgSz w:w="12240" w:h="15840"/>
        <w:pgMar w:top="975" w:right="1080" w:bottom="975" w:left="1080" w:header="0" w:footer="0" w:gutter="0"/>
      </w:sectPr></w:body></w:document>`
  };
  return zipEntries(Object.entries(parts).map(([name, content]) => ({ name, bytes: Buffer.from(content) })));
}
