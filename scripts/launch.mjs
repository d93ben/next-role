import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { ROOT, init, build, lock } from './lib.mjs';
import { createDemo } from './demo.mjs';

const workspace = path.join(ROOT, 'workspace');
const dashboard = path.join(workspace, 'dashboard.html');
const demo = path.join(ROOT, 'demo');

try {
  if (!fs.existsSync(dashboard)) {
    lock(workspace, () => {
      init(workspace);
      build(workspace);
    });
  }
  if (!fs.existsSync(path.join(demo, 'dashboard.html'))) createDemo(demo);
  const url = pathToFileURL(dashboard).href;
  console.log(url);
  if (!process.argv.includes('--no-open')) {
    const command = { win32: 'rundll32.exe', darwin: 'open' }[process.platform] || 'xdg-open';
    const args = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', url] : [dashboard];
    const browser = spawn(command, args, { detached: true, windowsHide: true, stdio: 'ignore' });
    browser.on('error', () => console.error(`Open ${dashboard} in your browser.`));
    browser.unref();
  }
} catch (error) {
  console.error(`Next Role: ${error.message}`);
  process.exitCode = 1;
}
