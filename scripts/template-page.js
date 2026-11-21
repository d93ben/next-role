async function renderTemplatePage({ filled, pageSize }) {
  const bytes = Uint8Array.from(atob(filled), c => c.charCodeAt(0));
  const out = document.getElementById('pages');
  await docx.renderAsync(bytes, out, null, { inWrapper: false, renderAltChunks: false, renderComments: false, useBase64URL: true });
  await document.fonts.ready;
  await Promise.all([...out.querySelectorAll('img')].map(img => img.decode().catch(() => {})));
  if (!out.textContent.trim() || !out.querySelector('section')) throw new Error('The DOCX rendered without a printable page.');
  const style = document.createElement('style');
  const paper = pageSize ? pageSize.map(n => n + 'pt').join(' ') : 'letter';
  style.textContent = '@page {size:' + paper + '; margin:0} html,body{margin:0} section.docx{box-shadow:none;break-after:page} section.docx:last-of-type{break-after:auto}';
  document.head.appendChild(style);
  return true;
}
