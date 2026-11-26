import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile,cp,readdir,rm} from 'node:fs/promises';
import path from 'node:path';

const publicOutput='dist/public';
const normalized=file=>file.split(path.sep).join('/');

// Fingerprint only application inputs, independent of checkout, timestamps and Site identity.
// Generated embedded assets are excluded to keep repeat builds reproducible.
async function releaseFingerprint(){
 const files=[];
 async function collect(directory){
  for(const entry of await readdir(directory,{withFileTypes:true})){
   const file=path.join(directory,entry.name);
   if(normalized(file)==='server/assets.generated.mjs')continue;
   if(entry.isDirectory())await collect(file);
   else if(entry.isFile())files.push(file);
  }
 }
 for(const directory of ['client','server','content','public','shared'])await collect(directory);
 files.push('package.json','package-lock.json','scripts/build.mjs');
 const hash=createHash('sha256').update('inherfashion-runtime-release-v1\0');
 for(const file of files.sort()){
  const bytes=await readFile(file);
  hash.update(normalized(file)+'\0'+bytes.length+'\0').update(bytes);
 }
 return hash.digest('hex');
}

const releaseId=await releaseFingerprint();
await rm('dist',{recursive:true,force:true});
await mkdir('dist/server',{recursive:true});
await mkdir(path.join(publicOutput,'assets'),{recursive:true});
await cp('public',publicOutput,{recursive:true});

const client=await build({
 entryPoints:['client/app.mjs'],bundle:true,minify:true,sourcemap:false,
 target:'es2022',outdir:path.join(publicOutput,'assets'),entryNames:'app-[hash]',
 loader:{'.ttf':'file'},external:['/assets/*'],metafile:true,
 define:{__IHF_RELEASE_ID__:JSON.stringify(releaseId)}
});
const scriptOutput=Object.entries(client.metafile.outputs).find(([file,info])=>info.entryPoint==='client/app.mjs'&&file.endsWith('.js'));
if(!scriptOutput?.[1].cssBundle)throw Error('The application script and stylesheet must both be built.');
async function assetIdentity(file){
 return {path:'/'+normalized(path.relative(publicOutput,file)),sha256:createHash('sha256').update(await readFile(file)).digest('hex')};
}
const release={
 releaseId,selectionProtocol:2,
 assets:{script:await assetIdentity(scriptOutput[0]),stylesheet:await assetIdentity(scriptOutput[1].cssBundle)}
};

const template=await readFile('public/index.html','utf8');
if(!template.includes('src="/assets/app.js"')||!template.includes('href="/assets/app.css"'))throw Error('The HTML template must reference the application script and stylesheet.');
const html=template.replace('src="/assets/app.js"',`src="${release.assets.script.path}"`).replace('href="/assets/app.css"',`href="${release.assets.stylesheet.path}"`);
await writeFile(path.join(publicOutput,'index.html'),html);
await writeFile('dist/release.json',JSON.stringify(release,null,2)+'\n');

const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.ttf':'font/ttf','.txt':'text/plain'};
const assets={};
async function walk(directory){
 for(const entry of (await readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)){
  const file=path.join(directory,entry.name);
  if(entry.isDirectory())await walk(file);
  else assets['/'+normalized(path.relative(publicOutput,file))]={type:types[path.extname(file)]||'application/octet-stream',data:(await readFile(file)).toString('base64')};
 }
}
await walk(publicOutput);
// Older cached HTML can still request these aliases. The Worker serves them without caching.
assets['/assets/app.js']=assets[release.assets.script.path];
assets['/assets/app.css']=assets[release.assets.stylesheet.path];
await writeFile('server/assets.generated.mjs','export const assets='+JSON.stringify(assets)+';\n');
await build({
 entryPoints:['server/worker.mjs'],bundle:true,minify:false,target:'es2022',
 format:'esm',platform:'browser',outfile:'dist/server/index.js',
 define:{__IHF_RELEASE_ID__:JSON.stringify(releaseId),__IHF_RELEASE_INFO__:JSON.stringify(release)}
});
await mkdir('dist/.openai',{recursive:true});
await cp('.openai/hosting.json','dist/.openai/hosting.json');
await cp('drizzle','dist/drizzle',{recursive:true});
console.log('Built application release '+releaseId+' with fingerprinted assets and Worker. No preview server started.');
