import JSZip from './vendor/jszip.min.js';
import { DOMParser, XMLSerializer } from './vendor/xmldom/index.js';

export async function fillTemplate({ input, mode, edits = [], requiredText = [] }) {
  const word = new Set([
    'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'http://purl.oclc.org/ooxml/wordprocessingml/main'
  ]);
  const zip = await JSZip.loadAsync(input, { base64: true });
  if (!zip.file('word/document.xml')) throw new Error('The selected file is not a DOCX document.');
  const members = Object.values(zip.files);
  let total = 0;
  for (const member of members) {
    total += member._data?.uncompressedSize || 0;
    if (total > 96 * 1024 * 1024 || members.length > 4096) throw new Error('The template exceeds the rendering size limit.');
  }
  if (zip.file('word/vbaProject.bin')) throw new Error('Use a macro-free DOCX template.');
  const parts = members.filter(p => /^word\/(document|header\d*|footer\d*)\.xml$/.test(p.name));
  if (mode === 'render' && edits.length && members.some(p => /^word\/comments[^/]*\.xml$/.test(p.name))) {
    throw new Error('Remove review comments from a working copy before using paragraph edits.');
  }
  const paragraphs = [];
  const byId = new Map();
  const documents = new Map();
  const elements = (node, tag) => [...node.getElementsByTagNameNS('*', tag)].filter(el => word.has(el.namespaceURI));
  const runs = p => elements(p, 't').filter(t => {
    let parent = t.parentNode;
    while (parent && parent !== p && !(word.has(parent.namespaceURI) && parent.localName === 'p')) parent = parent.parentNode;
    return parent === p;
  });
  let pageSize;
  for (const part of parts) {
    const xml = new DOMParser().parseFromString(await part.async('string'), 'application/xml');
    if (xml.doctype || xml.getElementsByTagName('parsererror').length) throw new Error('Invalid template XML.');
    if (mode === 'render' && edits.length && ['ins','del','moveFrom','moveTo'].some(tag => elements(xml,tag).length)) {
      throw new Error('Resolve tracked edits in a working copy before using paragraph edits.');
    }
    documents.set(part.name, xml);
    if (part.name === 'word/document.xml') {
      const size = elements(xml, 'pgSz')[0];
      if (size) {
        const dimension = name => Number(size.getAttributeNS(size.namespaceURI, name)) / 20;
        const width = dimension('w'), height = dimension('h');
        if ([width, height].every(x => x >= 72 && x <= 2880)) pageSize = [width, height];
      }
    }
    elements(xml, 'p').forEach((p, index) => {
      const value = runs(p).map(t => t.textContent).join('');
      if (!value.trim()) return;
      const id = part.name.slice(5, -4) + ':' + index;
      paragraphs.push({ id, text: value });
      byId.set(id, { p, part: part.name, value });
    });
  }
  if (mode === 'inspect') return { paragraphs };

  // Keep formatting on unchanged runs. New text inherits the run it replaces.
  function changeText(p, original, replacement) {
    if (original === replacement) return;
    let first = 0, end = original.length, newEnd = replacement.length;
    while (first < end && first < newEnd && original[first] === replacement[first]) first++;
    while (end > first && newEnd > first && original[end - 1] === replacement[newEnd - 1]) { end--; newEnd--; }
    let offset = 0, inserted = false;
    for (const t of runs(p)) {
      const old = t.textContent, next = offset + old.length;
      if (next > first && offset < end || !inserted && first === end && offset <= first && next >= first) {
        const prefix = old.slice(0, Math.max(0, first - offset));
        const suffix = old.slice(Math.max(0, end - offset));
        t.textContent = prefix + (inserted ? '' : replacement.slice(first, newEnd)) + suffix;
        t.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
        inserted = true;
      }
      offset = next;
    }
  }
  const modified = new Set();
  const seen = new Set();
  for (const edit of edits) {
    const row = byId.get(edit.id);
    if (!row || seen.has(edit.id) || edit.from !== row.value) throw new Error('Template paragraph changed or repeated: ' + edit.id);
    seen.add(edit.id);
    const values = Array.isArray(edit.to) ? edit.to : [edit.to];
    if (!values.every(v => typeof v === 'string' && !/[\r\n\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))) throw new Error('Use one string per template paragraph.');
    const p = row.p;
    if (['hyperlink','fldSimple','fldChar','instrText'].some(tag => elements(p,tag).length)) {
      throw new Error('Use a filled DOCX to edit a paragraph with links or fields so their targets can be updated too.');
    }
    if (values.length !== 1 && ['sectPr','drawing','pict','bookmarkStart','bookmarkEnd','fldChar'].some(tag => elements(p,tag).length)) {
      throw new Error('This paragraph contains layout objects. Supply a filled DOCX for this edit.');
    }
    if (values.length) {
      const extra = values.slice(1).map(value => {
        const clone = p.cloneNode(true);
        const ids = 'http://schemas.microsoft.com/office/word/2010/wordml';
        clone.removeAttributeNS(ids,'paraId');
        clone.removeAttributeNS(ids,'textId');
        changeText(clone, row.value, value);
        return clone;
      });
      changeText(p, row.value, values[0]);
      const next = p.nextSibling;
      for (const clone of extra) p.parentNode.insertBefore(clone,next);
    } else {
      // Word requires a trailing paragraph in a table cell.
      if (p.parentNode.localName === 'tc' && !p.nextElementSibling) {
        const empty = p.ownerDocument.createElementNS(p.namespaceURI, p.nodeName);
        p.parentNode.insertBefore(empty, p);
      }
      p.parentNode.removeChild(p);
    }
    modified.add(row.part);
  }
  for (const part of modified) zip.file(part, new XMLSerializer().serializeToString(documents.get(part)));
  const normalize = s => s.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
  const content = normalize([...documents.values()].flatMap(xml => elements(xml,'p')
    .map(p => runs(p).map(t => t.textContent).join(''))).join(' '));
  if (requiredText.some(text => !content.includes(normalize(text)))) {
    throw new Error('The filled template is missing the candidate name or a verified bullet from the resume payload. Check the paragraph edits.');
  }
  const filled = modified.size ? await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' }) : input;
  return { filled, pageSize };
}
