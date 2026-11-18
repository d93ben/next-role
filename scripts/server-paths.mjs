import fs from 'node:fs';
import path from 'node:path';

export function resolveRequest(root, url) {
  let pathname;
  try { pathname = decodeURIComponent(url.split('?')[0]); } catch { return null; }
  if (!pathname.startsWith('/') || pathname.split('/').some(segment => segment === '.' || segment === '..')) return null;
  if (pathname === '/') return path.join(root, 'workspace', 'dashboard.html');
  if (pathname === '/README.md' || pathname === '/START-HERE.md') return path.join(root, pathname.slice(1));
  if (pathname.includes('\\') || pathname.includes('\0') || pathname.includes(':')) return null;
  const segments = pathname.split('/').filter(Boolean);
  if (!['workspace', 'demo'].includes(segments[0]) || segments.some(s => s.startsWith('.'))) return null;
  const file = path.resolve(root, ...segments); const base = path.join(root, segments[0]);
  if (!file.startsWith(base + path.sep)) return null;
  if (!fs.existsSync(file)) return file;
  const real = fs.realpathSync(file); if (!real.startsWith(fs.realpathSync(base) + path.sep)) return null;
  return file;
}
