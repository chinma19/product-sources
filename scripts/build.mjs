import {build} from 'esbuild';
import {readFile,mkdir,writeFile,cp,readdir,rm} from 'node:fs/promises';
import path from 'node:path';
await rm('dist',{recursive:true,force:true});await mkdir('dist/server',{recursive:true});await mkdir('dist/public/assets',{recursive:true});
await cp('public','dist/public',{recursive:true});
await build({entryPoints:['client/app.mjs'],bundle:true,minify:true,sourcemap:false,target:'es2022',outdir:'dist/public/assets',entryNames:'app',loader:{'.ttf':'file'},external:['/assets/*']});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.ttf':'font/ttf','.txt':'text/plain'};
const assets={};async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())await walk(p);else assets['/'+path.relative('dist/public',p).split(path.sep).join('/')]={type:types[path.extname(p)]||'application/octet-stream',data:(await readFile(p)).toString('base64')}}}
await walk('dist/public');await writeFile('server/assets.generated.mjs','export const assets='+JSON.stringify(assets)+';\n');
await build({entryPoints:['server/worker.mjs'],bundle:true,minify:false,target:'es2022',format:'esm',platform:'browser',outfile:'dist/server/index.js'});
await mkdir('dist/.openai',{recursive:true});await cp('.openai/hosting.json','dist/.openai/hosting.json');await cp('drizzle','dist/drizzle',{recursive:true});
console.log('Built live application, embedded static assets, and Worker. No preview server started.');
