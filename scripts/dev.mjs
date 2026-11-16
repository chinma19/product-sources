// Development-only runner. This file is not in the deployed Worker bundle.
// Local identity must be explicitly requested and is never accepted in production.
import {Miniflare} from 'miniflare';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['scripts/build.mjs'],{stdio:'inherit'});
const mf=new Miniflare({modules:true,scriptPath:'dist/server/index.js',host:'127.0.0.1',port:4173,compatibilityDate:'2025-11-01',d1Databases:['DB'],r2Buckets:['BUCKET'],d1Persist:'.wrangler/local/d1',r2Persist:'.wrangler/local/r2'});
const {DB}=await mf.getBindings();
const tables=await DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='progress'").all();
if(!tables.results.length)await DB.exec(await readFile('drizzle/0000_private_workbook.sql','utf8'));
console.log('Local Worker ready:',String(await mf.ready));
console.log('Local API tests supply explicit identity headers. Hosted sign-in is owned by Sites; it is not simulated here.');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await mf.dispose();process.exit(0)});
