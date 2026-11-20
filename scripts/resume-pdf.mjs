import fs from 'node:fs';

// PDF's standard Helvetica fonts use WinAnsi encoding and 1000-unit glyph widths.
const widths = [
  [
    278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
    1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
    667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
    333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
    556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584, 761,
    556, 761, 222, 556, 333, 1000, 556, 556, 333, 1000, 667, 333, 1000, 761, 611, 761,
    761, 222, 222, 333, 333, 350, 556, 1000, 333, 1000, 500, 333, 944, 761, 500, 667,
    278, 333, 556, 556, 556, 556, 260, 556, 333, 737, 370, 556, 584, 333, 737, 333,
    400, 584, 333, 333, 333, 556, 537, 278, 333, 333, 365, 556, 834, 834, 834, 611,
    667, 667, 667, 667, 667, 667, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278,
    722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611,
    556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556, 278, 278, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 584, 611, 556, 556, 556, 556, 500, 556, 500
  ],
  [
    278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
    975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
    667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
    333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
    611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584, 761,
    556, 761, 278, 556, 500, 1000, 556, 556, 333, 1000, 667, 333, 1000, 761, 611, 761,
    761, 278, 278, 500, 500, 350, 556, 1000, 333, 1000, 556, 333, 944, 761, 500, 667,
    278, 333, 556, 556, 556, 556, 280, 556, 333, 737, 370, 556, 584, 333, 737, 333,
    400, 584, 333, 333, 333, 611, 556, 278, 333, 333, 365, 556, 834, 834, 834, 611,
    722, 722, 722, 722, 722, 722, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278,
    722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611,
    556, 556, 556, 556, 556, 556, 889, 556, 556, 556, 556, 556, 278, 278, 278, 278,
    611, 611, 611, 611, 611, 611, 611, 584, 611, 611, 611, 611, 611, 556, 611, 556
  ]
];
const encoding = new Map();
const decoder = new TextDecoder('windows-1252');
for (let code = 32; code < 256; code++) {
  encoding.set(decoder.decode(Uint8Array.of(code)), code);
}

export function resumeFilename(profile, company) {
  const parts = profile.name.trim().split(/\s+/);
  const given = profile.given_name || parts[0];
  const family = profile.family_name || (parts.length > 1 ? parts.at(-1) : '');
  const clean = value => value.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '');
  const stem = [given, family, company].map(clean).filter(Boolean).join('_');
  if (!stem || Buffer.byteLength(stem) > 240) throw new Error('Use a shorter candidate or company name for the PDF filename.');
  return stem + '.pdf';
}

export function readPdf(file) {
  const bytes = fs.readFileSync(file);
  if (!/^%PDF-(?:1\.\d|2\.0)/.test(bytes.subarray(0, 10).toString('ascii')) ||
      !bytes.subarray(-1024).includes('%%EOF')) throw new Error('Provide the complete, rendered PDF file.');
  return bytes;
}

function encoded(text) {
  return Array.from(text.normalize('NFC'), character => {
    const code = encoding.get(character);
    if (code === undefined || code < 32) {
      throw new Error('This text needs an embedded font. Render the verified resume with a Unicode-capable document tool and pass its pdf_path to resume create.');
    }
    return code;
  });
}

function wrap(text, font, size, available) {
  const lines = [];
  let line = [];
  let width = 0;
  const advance = code => widths[font][code - 32] * size / 1000;
  for (const word of text.trim().split(/\s+/)) {
    const codes = encoded(word);
    const wordWidth = codes.reduce((total, code) => total + advance(code), 0);
    if (line.length && width + advance(32) + wordWidth > available) {
      lines.push(line); line = []; width = 0;
    }
    if (line.length) { line.push(32); width += advance(32); }
    for (const code of codes) {
      if (line.length && width + advance(code) > available) {
        lines.push(line); line = []; width = 0;
      }
      line.push(code); width += advance(code);
    }
  }
  if (line.length) lines.push(line);
  return lines;
}

export function renderResumePdf({profile, headline, summary, experiences, skills}) {
  const pages = [[]];
  let y = 736;
  function room(points) {
    if (y - points < 46) { pages.push([]); y = 736; }
  }
  function paragraph(value, {bold = false, size = 11, inset = 0, after = 4, keep = 0} = {}) {
    if (!value) return;
    const leading = size * 1.35;
    const font = bold ? 1 : 0;
    const lines = wrap(value, font, size, 508 - inset);
    room(Math.min(lines.length, 2) * leading + keep);
    for (const line of lines) {
      room(leading);
      pages.at(-1).push('BT /F' + font + ' ' + size + ' Tf 1 0 0 1 ' + (52 + inset) + ' ' + y.toFixed(2) +
        ' Tm <' + Buffer.from(line).toString('hex') + '> Tj ET');
      y -= leading;
    }
    y -= after;
  }
  function section(title) {
    y -= 7;
    paragraph(title, {bold: true, size: 13, keep: 50});
  }
  paragraph(profile.name, {bold: true, size: 25, after: 2, keep: 28});
  paragraph(headline, {size: 14});
  paragraph([profile.location, profile.email, profile.phone, profile.website].filter(Boolean).join(' | '), {size: 10});
  paragraph(summary);
  section('Experience');
  for (const role of experiences) {
    paragraph([role.title, role.company].filter(Boolean).join(' | '), {bold: true, keep: 33});
    paragraph(role.period, {size: 10, keep: 16});
    for (const bullet of role.bullets) paragraph('• ' + bullet.text, {inset: 8});
    y -= 4;
  }
  if (skills.length) { section('Skills'); paragraph(skills.join(' · ')); }
  if (profile.education.length) {
    section('Education');
    for (const item of profile.education) paragraph([item.qualification,item.institution,item.date].filter(Boolean).join(' | '));
  }

  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'];
  const kids = [];
  for (const page of pages) {
    const pageId = objects.length + 1;
    kids.push(pageId + ' 0 R');
    const stream = page.join('\n') + '\n';
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F0 3 0 R /F1 4 0 R >> >> /Contents ' + (pageId + 1) + ' 0 R >>',
      '<< /Length ' + stream.length + ' >>\nstream\n' + stream + 'endstream');
  }
  objects[1] = '<< /Type /Pages /Count ' + kids.length + ' /Kids [' + kids.join(' ') + '] >>';
  const offsets = [0];
  let pdf = '%PDF-1.4\n';
  for (const [index, object] of objects.entries()) {
    offsets.push(pdf.length);
    pdf += (index + 1) + ' 0 obj\n' + object + '\nendobj\n';
  }
  const xref = pdf.length;
  pdf += 'xref\n0 ' + offsets.length + '\n0000000000 65535 f \n';
  for (const offset of offsets.slice(1)) pdf += String(offset).padStart(10,'0') + ' 00000 n \n';
  return Buffer.from(pdf + 'trailer\n<< /Size ' + offsets.length + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n', 'ascii');
}
