(() => {
  'use strict';

  const dialog = document.querySelector('#document-preview');
  const body = dialog.querySelector('.preview-body');
  const status = dialog.querySelector('.preview-status');
  const picker = dialog.querySelector('input[type="file"]');
  const maxDocumentSize = 32 * 1024 * 1024;
  const maxPartSize = 4 * 1024 * 1024;
  const wordNamespaces = [
    'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'http://purl.oclc.org/ooxml/wordprocessingml/main'
  ];
  const headingTags = new Map([['Title','h1'], ['Heading1','h2'], ['Heading2','h3'], ['Heading3','h4']]);
  let request;

  async function readLimited(stream, limit) {
    const reader = stream.getReader();
    const chunks = [];
    let size = 0;
    try {
      for (;;) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) throw new Error('Document preview exceeds the size limit.');
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    return new Blob(chunks).arrayBuffer();
  }

  // Locate Word's XML parts in the ZIP central directory. Nothing is extracted to disk.
  function wordParts(buffer) {
    const data = new DataView(buffer);
    const decoder = new TextDecoder();
    const names = new Set(['word/document.xml', 'word/styles.xml', 'word/numbering.xml']);
    let end = data.byteLength - 22;
    const earliest = Math.max(0, end - 65535);
    while (end >= earliest &&
      (data.getUint32(end, true) !== 0x06054b50 || end + 22 + data.getUint16(end + 20, true) !== data.byteLength)) end--;
    if (end < earliest || data.getUint16(end + 4, true) || data.getUint16(end + 6, true)) {
      throw new Error('Invalid Word file.');
    }
    const entries = new Map();
    let offset = data.getUint32(end + 16, true);
    const count = data.getUint16(end + 10, true);
    for (let index = 0; index < count; index++) {
      if (offset + 46 > end || data.getUint32(offset, true) !== 0x02014b50) throw new Error('Invalid Word file.');
      const nameSize = data.getUint16(offset + 28, true);
      const next = offset + 46 + nameSize + data.getUint16(offset + 30, true) + data.getUint16(offset + 32, true);
      if (next > end) throw new Error('Invalid Word file.');
      const name = decoder.decode(new Uint8Array(buffer, offset + 46, nameSize));
      if (names.has(name)) entries.set(name, offset);
      offset = next;
    }
    return async name => {
      const entry = entries.get(name);
      if (entry === undefined) return null;
      const method = data.getUint16(entry + 10, true);
      const compressedSize = data.getUint32(entry + 20, true);
      const size = data.getUint32(entry + 24, true);
      const local = data.getUint32(entry + 42, true);
      if (size > maxPartSize || local + 30 > end || data.getUint32(local, true) !== 0x04034b50 ||
          data.getUint16(entry + 8, true) & 1 || ![0, 8].includes(method)) throw new Error('Unsupported Word file.');
      const start = local + 30 + data.getUint16(local + 26, true) + data.getUint16(local + 28, true);
      if (start + compressedSize > end) throw new Error('Invalid Word file.');
      const bytes = new Uint8Array(buffer, start, compressedSize);
      const xml = method === 0 ? bytes : await readLimited(
        new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')), maxPartSize);
      if (xml.byteLength !== size) throw new Error('Invalid Word file.');
      const parsed = new DOMParser().parseFromString(decoder.decode(xml), 'application/xml').documentElement;
      if (!wordNamespaces.includes(parsed.namespaceURI)) throw new Error('Invalid Word markup.');
      return parsed;
    };
  }

  const wordChildren = node => [...(node?.children ?? [])].filter(child => wordNamespaces.includes(child.namespaceURI));
  const child = (node, name) => wordChildren(node).find(item => item.localName === name);
  const attr = (node, name = 'val') => node?.getAttributeNS(node.namespaceURI, name);
  const value = (node, name) => attr(child(node, name));

  function applyRunStyle(element, properties) {
    const color = value(properties, 'color');
    const font = attr(child(properties, 'rFonts'), 'ascii');
    const size = Number(value(properties, 'sz')) / 2;
    if (/^[\da-f]{6}$/i.test(color ?? '')) element.style.color = '#' + color;
    if (/^[a-z\d -]{1,40}$/i.test(font ?? '')) element.style.fontFamily = '"' + font + '"';
    if (size >= 6 && size <= 72) element.style.fontSize = size + 'pt';
    for (const [name, property, enabled, disabled] of [
      ['b', 'fontWeight', 'bold', 'normal'], ['i', 'fontStyle', 'italic', 'normal'],
      ['u', 'textDecoration', 'underline', 'none'], ['caps', 'textTransform', 'uppercase', 'none']
    ]) {
      const setting = child(properties, name);
      if (setting) element.style[property] = ['0', 'false', 'off', 'none'].includes(attr(setting)) ? disabled : enabled;
    }
  }

  async function renderWord(buffer) {
    const read = wordParts(buffer);
    const [doc, styleDoc, numbering] = await Promise.all([
      read('word/document.xml'), read('word/styles.xml'), read('word/numbering.xml')
    ]);
    const source = child(doc, 'body');
    if (!source) throw new Error('Word body not found.');
    const styles = new Map(wordChildren(styleDoc).map(item => [attr(item, 'styleId'), item]));
    const listKinds = new Map(wordChildren(numbering).filter(item => item.localName === 'abstractNum')
      .map(item => [attr(item, 'abstractNumId'), value(child(item, 'lvl'), 'numFmt')]));
    const lists = new Map(wordChildren(numbering).filter(item => item.localName === 'num')
      .map(item => [attr(item, 'numId'), listKinds.get(value(item, 'abstractNumId'))]));
    const paper = document.createElement('article');
    paper.className = 'preview-paper';

    function applyStyle(element, name, seen = new Set()) {
      if (!styles.has(name) || seen.has(name) || seen.size >= 12) return;
      seen.add(name);
      const style = styles.get(name);
      applyStyle(element, value(style, 'basedOn'), seen);
      applyRunStyle(element, child(style, 'rPr'));
    }

    function appendInline(parent, node) {
      for (const item of wordChildren(node)) {
        switch (item.localName) {
          case 't': parent.append(item.textContent); break;
          case 'br':
          case 'cr': parent.append(document.createElement('br')); break;
          case 'tab': parent.append('    '); break;
          case 'r': {
            const run = document.createElement('span');
            const properties = child(item, 'rPr');
            applyStyle(run, value(properties, 'rStyle'));
            applyRunStyle(run, properties);
            appendInline(run, item);
            parent.append(run);
            break;
          }
          case 'hyperlink':
          case 'ins':
          case 'sdt':
          case 'sdtContent': appendInline(parent, item); break;
        }
      }
    }

    function appendBlocks(parent, container) {
      let list;
      let previousList;
      for (const item of wordChildren(container)) {
        const properties = child(item, 'pPr');
        const number = value(child(properties, 'numPr'), 'numId');
        if (!number || number === '0') {
          list = null;
          previousList = null;
        }
        if (item.localName === 'p') {
          const style = value(properties, 'pStyle') || 'Normal';
          const heading = headingTags.get(style);
          let target = parent;
          if (number && number !== '0') {
            if (!list || previousList !== number) {
              list = document.createElement(lists.has(number) && lists.get(number) !== 'bullet' ? 'ol' : 'ul');
              parent.append(list);
              previousList = number;
            }
            target = list;
          }
          const paragraph = document.createElement(target === list ? 'li' : heading || 'p');
          if (['Subtitle', 'Contact', 'Role', 'Period'].includes(style)) paragraph.className = 'word-' + style.toLowerCase();
          const align = value(properties, 'jc');
          if (['left', 'right', 'center'].includes(align)) paragraph.style.textAlign = align;
          if (align === 'both') paragraph.style.textAlign = 'justify';
          applyStyle(paragraph, style);
          appendInline(paragraph, item);
          if (!paragraph.textContent && !paragraph.querySelector('br')) paragraph.append(document.createElement('br'));
          target.append(paragraph);
        } else if (item.localName === 'tbl') {
          const table = document.createElement('table');
          for (const row of wordChildren(item).filter(part => part.localName === 'tr')) {
            const tr = table.insertRow();
            for (const cell of wordChildren(row).filter(part => part.localName === 'tc')) {
              const td = tr.insertCell();
              const span = Number(value(child(cell, 'tcPr'), 'gridSpan'));
              if (span > 1 && span <= 32) td.colSpan = span;
              appendBlocks(td, cell);
            }
          }
          parent.append(table);
        } else if (['sdt', 'sdtContent'].includes(item.localName)) {
          appendBlocks(parent, item);
        }
      }
    }
    appendBlocks(paper, source);
    if (!paper.textContent.trim()) throw new Error('No readable text found in this Word file.');
    return paper;
  }

  async function showWord(readFile) {
    const active = request;
    body.replaceChildren();
    status.textContent = 'Loading Word preview…';
    try {
      const preview = await renderWord(await readFile());
      if (request !== active || active.signal.aborted) return;
      body.replaceChildren(preview);
      status.textContent = 'Word preview · layout may vary in the downloaded file';
    } catch {
      if (request !== active || active.signal.aborted) return;
      status.textContent = 'This document could not be previewed. Download the original to open it.';
    }
  }

  function open({url, format, title, fallback}) {
    request?.abort();
    request = new AbortController();
    dialog.querySelector('h2').textContent = title;
    const download = dialog.querySelector('a[download]');
    download.href = url;
    download.textContent = 'Download ' + format.toUpperCase();
    body.replaceChildren();
    picker.value = '';
    picker.parentElement.hidden = true;
    if (!dialog.open) dialog.showModal();
    if (format === 'docx' && location.protocol !== 'file:') {
      const {signal} = request;
      showWord(async () => {
        const response = await fetch(url, {signal, mode: 'same-origin'});
        if (!response.ok) throw new Error('File unavailable.');
        return readLimited(response.body, maxDocumentSize);
      });
    } else if (format === 'docx' && !fallback) {
      status.textContent = 'Choose the Word file to preview it here.';
      picker.parentElement.hidden = false;
    } else {
      status.textContent = format === 'docx' ? 'Browser copy of the résumé' : '';
      const frame = document.createElement('iframe');
      frame.title = title + ' preview';
      if (format !== 'pdf') frame.setAttribute('sandbox', '');
      frame.src = fallback || url;
      body.replaceChildren(frame);
    }
  }

  picker.addEventListener('change', () => {
    const file = picker.files[0];
    if (file) {
      request?.abort();
      request = new AbortController();
      showWord(() => readLimited(file.stream(), maxDocumentSize));
    }
  });
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    request?.abort();
    body.replaceChildren();
  });
  window.nextRoleDocumentPreview = {
    open,
    close() { if (dialog.open) dialog.close(); },
    get active() { return dialog.open; }
  };
})();
