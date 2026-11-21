import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { zipEntries } from './zip.mjs';
export { crc32, zipEntries } from './zip.mjs';
import { ROOT, init, build, lock } from './lib.mjs';

export function packageApp(outputRoot = path.join(ROOT,'release')) {
  fs.mkdirSync(outputRoot,{recursive:true});
  const stage=path.join(outputRoot,`stage-${crypto.randomUUID().slice(0,8)}`,'next-role');fs.mkdirSync(stage,{recursive:true});
  const allowed=['package.json','.gitignore','LICENSE','README.md','START-HERE.md','AGENTS.md','MEMORY.md','CLAUDE.md','Start Next Role.cmd','start.sh','.github','desktop','scripts','ui','workflows','templates','docs','tests'];
  for(const entry of allowed){const src=path.join(ROOT,entry);if(!fs.existsSync(src))throw new Error(`Missing release source: ${entry}`);fs.cpSync(src,path.join(stage,entry),{recursive:true,filter:source=>!source.endsWith('.png')&&!source.endsWith('.tmp')});}
  lock(path.join(stage,'workspace'),()=>{init(path.join(stage,'workspace'));build(path.join(stage,'workspace'));});
  const entries=[];
  function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['.backups','.write.lock'].includes(entry.name))continue;const file=path.join(dir,entry.name);const name='next-role/'+path.relative(stage,file).split(path.sep).join('/');if(entry.isDirectory()){entries.push({name:name+'/',bytes:Buffer.alloc(0)});walk(file);}else if(entry.isFile())entries.push({name,bytes:fs.readFileSync(file)});}}
  walk(stage);
  const version=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8')).version;
  const dest=path.join(outputRoot,`next-role-v${version}.zip`);fs.writeFileSync(dest,zipEntries(entries));
  const sha256=crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex');fs.writeFileSync(dest+'.sha256',`${sha256}  ${path.basename(dest)}\n`);
  return{archive:dest,sha256,files:entries.length,bytes:fs.statSync(dest).size,staging:stage};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.join(ROOT,'scripts','package.mjs')) console.log(JSON.stringify(packageApp(),null,2));
