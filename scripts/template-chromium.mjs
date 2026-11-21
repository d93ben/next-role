import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { offlinePage, prepareTemplateFiles, runTemplatePage } from './template-render.mjs';

// The source/HTML edition prints through a private headless Chromium process over anonymous pipes.
const dir = process.argv[2];
function browserPath() {
  const names = ['chromium','chromium-browser','google-chrome','microsoft-edge'];
  const candidates = [
    process.env.NEXT_ROLE_BROWSER,
    ...[process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA].filter(Boolean)
      .flatMap(base => ['Microsoft/Edge/Application/msedge.exe','Google/Chrome/Application/chrome.exe'].map(app => path.join(base,app))),
    ...['/Applications',path.join(os.homedir(),'Applications')].flatMap(base =>
      ['Google Chrome','Microsoft Edge','Chromium'].map(app => path.join(base, app+'.app','Contents/MacOS',app))),
    ...(process.env.PATH || '').split(path.delimiter).flatMap(base => names.map(name => path.join(base,name)))
  ];
  const found = candidates.find(p => p && fs.existsSync(p) && fs.statSync(p).isFile());
  if (!found) throw new Error('Use the Next Role desktop app for built-in DOCX rendering, or set NEXT_ROLE_BROWSER to a local Chromium browser.');
  return found;
}

async function render() {
  const browser = spawn(browserPath(), ['--headless','--remote-debugging-pipe','--disable-background-networking','--no-first-run',
    '--disable-extensions','--no-default-browser-check','--disable-sync','--user-data-dir='+path.join(dir,'browser-profile'),'about:blank'],
    { windowsHide:true, stdio:['ignore','ignore','ignore','pipe','pipe'] });
  const input = browser.stdio[3], output = browser.stdio[4];
  let sequence = 0, buffer = '', failure;
  const pending = new Map();
  function stop(error) {
    failure = error;
    for (const task of pending.values()) task.reject(error);
    pending.clear();
  }
  browser.on('error', stop);
  browser.on('exit', () => stop(new Error('Headless Chromium exited before finishing the template.')));
  input.on('error', stop);
  output.on('error', stop);
  output.setEncoding('utf8');
  output.on('data', chunk => {
    buffer += chunk;
    let end;
    while ((end = buffer.indexOf('\0')) >= 0) {
      const message = JSON.parse(buffer.slice(0,end));
      buffer = buffer.slice(end + 1);
      const task = pending.get(message.id);
      if (!task) continue;
      pending.delete(message.id);
      if (message.error) task.reject(new Error(message.error.message));
      else task.resolve(message.result);
    }
  });
  function call(method, params = {}, sessionId) {
    if (failure) return Promise.reject(failure);
    const id = ++sequence;
    return new Promise((resolve,reject) => {
      pending.set(id,{resolve,reject});
      input.write(JSON.stringify({id,method,params,sessionId})+'\0');
    });
  }
  const timeout = setTimeout(() => { stop(new Error('DOCX rendering timed out.')); browser.kill(); }, 60000);
  try {
    const {targetId} = await call('Target.createTarget',{url:'about:blank'});
    const {sessionId} = await call('Target.attachToTarget',{targetId,flatten:true});
    const page = (method, params) => call(method,params,sessionId);
    await page('Network.enable');
    await page('Network.setBlockedURLs',{urls:['http://*','https://*','file://*']});
    const {frameTree} = await page('Page.getFrameTree');
    await page('Page.setDocumentContent',{frameId:frameTree.frame.id,html:offlinePage});
    const evaluate = async expression => {
      const answer = await page('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
      if (answer.exceptionDetails) throw new Error(answer.exceptionDetails.exception?.description || answer.exceptionDetails.text);
      return answer.result.value;
    };
    await runTemplatePage(dir, evaluate, async () => {
      const pdf = await page('Page.printToPDF',{printBackground:true,preferCSSPageSize:true,displayHeaderFooter:false});
      return Buffer.from(pdf.data,'base64');
    });
  } finally {
    clearTimeout(timeout);
    if (!failure) await call('Browser.close').catch(() => {});
    browser.kill();
  }
}

try { if (await prepareTemplateFiles(dir)) await render(); }
catch (error) { fs.writeFileSync(path.join(dir,'error.txt'),error.message); process.exitCode = 1; }
