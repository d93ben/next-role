import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { ROOT, APP_VERSION, init, lock, build } from './lib.mjs';
import { createDemo } from './demo.mjs';

const port = Number(process.env.PORT || 4317);
const base = `http://127.0.0.1:${port}`;
const expected = crypto.createHash('sha256').update(path.resolve(ROOT)).digest('hex').slice(0,16);
async function session() {
  try { const response=await fetch(`${base}/__next-role/session`,{signal:AbortSignal.timeout(800)}); return response.ok ? await response.json() : null; }
  catch { return null; }
}
try {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT must be between 1024 and 65535.');
  let current=await session();
  if (current && (current.instance !== expected || current.version !== APP_VERSION)) throw new Error(`Another workspace or app version is open on port ${port}. Close its server, or set PORT to a different local port.`);
  if (!current) {
    await new Promise((resolve,reject)=>{const probe=net.createServer();probe.once('error',()=>reject(new Error(`Port ${port} is already in use. Set PORT to a different local port.`)));probe.listen(port,'127.0.0.1',()=>probe.close(resolve));});
    lock(path.join(ROOT,'workspace'),()=>{init(path.join(ROOT,'workspace'));build(path.join(ROOT,'workspace'));});
    createDemo(path.join(ROOT,'demo'));
    const logPath=path.join(ROOT,'workspace','.server.log');
    const fd=fs.openSync(logPath,'a');
    const child=spawn(process.execPath,[path.join(ROOT,'scripts','serve.mjs')],{cwd:ROOT,env:{...process.env,PORT:String(port)},detached:true,windowsHide:true,stdio:['ignore',fd,fd]});
    let launchError; child.on('error',error=>{launchError=error;}); child.unref(); fs.closeSync(fd);
    for(let attempt=0;attempt<60;attempt++) { if(launchError) throw launchError; current=await session(); if(current?.instance===expected)break; await new Promise(resolve=>setTimeout(resolve,250)); }
    if(current?.instance!==expected)throw new Error(`Could not open the local app. See ${logPath}.`);
  }
  const url=`${base}/workspace/dashboard.html#applications`;
  console.log(`Next Role: ${url}\nDemo: ${base}/demo/dashboard.html#applications`);
  if(!process.argv.includes('--no-open')) {
    const [command,args]=process.platform==='win32' ? ['rundll32.exe',['url.dll,FileProtocolHandler',url]] : process.platform==='darwin' ? ['open',[url]] : ['xdg-open',[url]];
    const browser=spawn(command,args,{detached:true,windowsHide:true,stdio:'ignore'});browser.on('error',()=>console.log(`Open ${url} in your browser.`));browser.unref();
  }
} catch(error) { console.error(`Next Role: ${error.message}`); process.exitCode=1; }
