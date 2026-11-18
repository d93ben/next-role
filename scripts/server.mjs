import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { APP_VERSION, init, lock, mutate, build } from './lib.mjs';
import { resolveRequest } from './server-paths.mjs';

const types = { '.html':'text/html; charset=utf-8', '.txt':'text/plain; charset=utf-8', '.md':'text/plain; charset=utf-8', '.json':'application/json', '.pdf':'application/pdf', '.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
const scopes = ['workspace', 'demo'];
export function createAppServer(projectRoot) {
  const token = crypto.randomBytes(32).toString('hex');
  const instance = crypto.createHash('sha256').update(path.resolve(projectRoot)).digest('hex').slice(0,16);
  const reply = (res, code, data) => { res.writeHead(code, { 'Content-Type':'application/json', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' }); res.end(JSON.stringify(data)); };
  return http.createServer(async (req, res) => {
    const host = req.headers.host || '';
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) { reply(res,403,{error:'Local access only.'}); return; }
    const url = new URL(req.url, `http://${host}`);
    if (url.pathname === '/__next-role/action' && req.method === 'POST') {
      if (req.headers.origin !== `http://${host}` || req.headers['x-next-role-token'] !== token || req.headers['content-type']?.split(';')[0] !== 'application/json') { reply(res,403,{error:'This action must come from the open local workspace.'}); return; }
      try {
        const chunks=[]; let size=0;
        for await (const chunk of req) { size+=chunk.length; if(size>256000) { reply(res,413,{error:'This note is too large. Please split it into smaller notes.'}); return; } chunks.push(chunk); }
        const p=JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!scopes.includes(p.workspace)) { reply(res,400,{error:'Unknown workspace.'}); return; }
        if (!['favorite','brain-dump'].includes(p.action)) { reply(res,400,{error:'Only favorites and personal notes can be saved here.'}); return; }
        const root=path.join(projectRoot,p.workspace);
        const value=lock(root,()=>{
          let result;
          if(p.action==='favorite') result=mutate(root,'favorite set',{favorite:p.favorite},p.job_id);
          else result=mutate(root,'brain-dump add',{title:p.title,text:p.text,request_id:p.request_id});
          const snapshot=build(root); return { result, built_at:snapshot.built_at };
        });
        reply(res,200,value);
      } catch(error) { reply(res,error.message.includes('in progress')?409:400,{error:error.message}); }
      return;
    }
    if (!['GET','HEAD'].includes(req.method)) { reply(res,405,{error:'Method not allowed.'}); return; }
    if (url.pathname === '/__next-role/session') { reply(res,200,{token,instance,version:APP_VERSION}); return; }
    if (url.pathname === '/__next-role/version') {
      const scope=url.searchParams.get('workspace'); if(!scopes.includes(scope)) { reply(res,400,{error:'Unknown workspace.'}); return; }
      const file=path.join(projectRoot,scope,'dashboard-version.json'); if(!fs.existsSync(file)){reply(res,404,{error:'Not built.'});return;}
      reply(res,200,JSON.parse(fs.readFileSync(file,'utf8'))); return;
    }
    const file=resolveRequest(projectRoot,req.url);
    if(!file){reply(res,403,{error:'Not available.'});return;}
    if(!fs.existsSync(file)||!fs.statSync(file).isFile()){reply(res,404,{error:'File not found. Rebuild the dashboard.'});return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
    if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
  });
}
export function prepareServerWorkspace(projectRoot) {
  for (const scope of scopes) {
    const root=path.join(projectRoot,scope);
    if(scope==='demo' && !fs.existsSync(path.join(root,'workspace.json')))continue;
    lock(root,()=>{init(root,scope==='demo');build(root);});
  }
}
