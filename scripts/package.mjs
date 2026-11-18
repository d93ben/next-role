import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import { ROOT, init, build, lock } from './lib.mjs';
import { createDemo } from './demo.mjs';

// A small standards-compliant ZIP writer keeps distribution dependency-free.
const crcTable = Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
export function crc32(bytes){let c=0xffffffff;for(const byte of bytes)c=crcTable[(c^byte)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
export function zipEntries(entries) {
  const local=[], central=[]; let offset=0;
  for(const entry of entries){
    const name=Buffer.from(entry.name.replaceAll('\\','/'));const bytes=entry.bytes;const packed=deflateRawSync(bytes);const crc=crc32(bytes);
    const head=Buffer.alloc(30);head.writeUInt32LE(0x04034b50);head.writeUInt16LE(20,4);head.writeUInt16LE(0x800,6);head.writeUInt16LE(8,8);head.writeUInt16LE(33,12);head.writeUInt32LE(crc,14);head.writeUInt32LE(packed.length,18);head.writeUInt32LE(bytes.length,22);head.writeUInt16LE(name.length,26);
    local.push(head,name,packed);
    const record=Buffer.alloc(46);record.writeUInt32LE(0x02014b50);record.writeUInt16LE(20,4);record.writeUInt16LE(20,6);record.writeUInt16LE(0x800,8);record.writeUInt16LE(8,10);record.writeUInt16LE(33,14);record.writeUInt32LE(crc,16);record.writeUInt32LE(packed.length,20);record.writeUInt32LE(bytes.length,24);record.writeUInt16LE(name.length,28);record.writeUInt32LE(offset,42);central.push(record,name);offset+=head.length+name.length+packed.length;
  }
  const cd=Buffer.concat(central);const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(cd.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...local,cd,end]);
}
export function packageApp(outputRoot = path.join(ROOT,'release')) {
  fs.mkdirSync(outputRoot,{recursive:true});
  const stage=path.join(outputRoot,`stage-${crypto.randomUUID().slice(0,8)}`,'next-role');fs.mkdirSync(stage,{recursive:true});
  const allowed=['package.json','.gitignore','LICENSE','README.md','START-HERE.md','AGENTS.md','MEMORY.md','CLAUDE.md','Start Next Role.cmd','start.sh','.github','scripts','ui','workflows','templates','docs','tests'];
  for(const entry of allowed){const src=path.join(ROOT,entry);if(!fs.existsSync(src))throw new Error(`Missing release source: ${entry}`);fs.cpSync(src,path.join(stage,entry),{recursive:true,filter:source=>!source.endsWith('.png')&&!source.endsWith('.tmp')});}
  lock(path.join(stage,'workspace'),()=>{init(path.join(stage,'workspace'));build(path.join(stage,'workspace'));});
  createDemo(path.join(stage,'demo'));
  const entries=[];
  function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['.backups','.write.lock'].includes(entry.name))continue;const file=path.join(dir,entry.name);const name='next-role/'+path.relative(stage,file).split(path.sep).join('/');if(entry.isDirectory()){entries.push({name:name+'/',bytes:Buffer.alloc(0)});walk(file);}else if(entry.isFile())entries.push({name,bytes:fs.readFileSync(file)});}}
  walk(stage);
  const version=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8')).version;
  const dest=path.join(outputRoot,`next-role-v${version}.zip`);fs.writeFileSync(dest,zipEntries(entries));
  const sha256=crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex');fs.writeFileSync(dest+'.sha256',`${sha256}  ${path.basename(dest)}\n`);
  return{archive:dest,sha256,files:entries.length,bytes:fs.statSync(dest).size,staging:stage};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.join(ROOT,'scripts','package.mjs')) console.log(JSON.stringify(packageApp(),null,2));
