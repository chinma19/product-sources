// Development-only runner. This file is not in the deployed Worker bundle.
// Local identity must be explicitly requested and is never accepted in production.
import {Miniflare} from 'miniflare';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['scripts/build.mjs'],{stdio:'inherit'});
const mf=new Miniflare({modules:true,scriptPath:'dist/server/index.js',host:'127.0.0.1',port:4173,compatibilityDate:'2025-11-01',d1Databases:['DB'],r2Buckets:['BUCKET'],d1Persist:'.wrangler/local/d1',r2Persist:'.wrangler/local/r2'});
const {DB}=await mf.getBindings();
await DB.exec('CREATE TABLE IF NOT EXISTS local_schema_migrations (tag TEXT PRIMARY KEY NOT NULL);');
const journal=JSON.parse(await readFile('drizzle/meta/_journal.json','utf8'));
for(const entry of journal.entries){const applied=await DB.prepare('SELECT tag FROM local_schema_migrations WHERE tag = ?').bind(entry.tag).first();if(applied)continue;const existing=await DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='progress'").first();if(!(entry.idx===0&&existing))await DB.exec(await readFile('drizzle/'+entry.tag+'.sql','utf8'));await DB.prepare('INSERT INTO local_schema_migrations(tag) VALUES (?)').bind(entry.tag).run();}
console.log('Local Worker ready:',String(await mf.ready));
console.log('Local API tests supply explicit identity headers. Hosted sign-in is owned by Sites; it is not simulated here.');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await mf.dispose();process.exit(0)});
