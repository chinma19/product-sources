import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../..',import.meta.url));
const output=process.argv[2];
if(!output||!isAbsolute(output))throw Error('Provide an absolute directory for the separate private preview.');
const target=resolve(output),inside=relative(root,target);
if(!inside.startsWith('..')&&!isAbsolute(inside))throw Error('The private preview must be outside the production checkout.');
const original=JSON.parse(await readFile(resolve(root,'.openai/hosting.json'),'utf8'));
let manifest;
try{manifest=JSON.parse(await readFile(resolve(target,'.openai/hosting.json'),'utf8'));}
catch(error){if(error.code!=='ENOENT')throw error;manifest={};}
if(manifest.project_id===original.project_id)throw Error('Refusing to reuse the version 4 Site.');
await mkdir(resolve(target,'dist'),{recursive:true});await mkdir(resolve(target,'.openai'),{recursive:true});
const hashes={};
for(const name of ['index.html','review.html','DESIGN-COMPARISON.md','LICENSES.txt']){
 const source=resolve(root,'design-preview',name),bytes=await readFile(source);
 await copyFile(source,resolve(target,'dist',name));hashes[name]=createHash('sha256').update(bytes).digest('hex');
}
await writeFile(resolve(target,'.openai/hosting.json'),JSON.stringify({...manifest,static:{directory:'dist'},d1:null,r2:null},null,2)+'\n');
await writeFile(resolve(target,'.gitignore'),'.env*\n.dev.vars*\nnode_modules/\n');
await writeFile(resolve(target,'PREVIEW-SOURCE.json'),JSON.stringify({purpose:'Owner-private synthetic-data design review',sourceRepository:'https://github.com/chinma19/product-sources',sourceBranch:'codex/editorial-design-preview',staticOnly:true,customerDatabase:false,customerObjectStorage:false,files:hashes},null,2)+'\n');
await writeFile(resolve(target,'README.md'),'# In Her Fashion — private phone design preview\n\nThis is a separate, static synthetic-data review site. It contains no database or object-storage bindings and never connects to the version 4 workbook. Responses and optional test photographs stay in this browser on this separate origin.\n\nOpen the Site on your phone using the owner ChatGPT account. Start with Discover, then My Blueprint. Use synthetic test answers and disposable sample photos. No purchases, invitations or production account setup are needed.\n\nThe development source remains on the product repository editorial-design-preview branch. PREVIEW-SOURCE.json records the exact static asset checksums. This review Site can be unpublished after review; it has no automatic expiry.\n');
console.log(JSON.stringify({directory:target,staticOnly:true,files:Object.keys(hashes)}));
