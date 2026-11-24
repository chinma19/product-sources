import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {Window} from 'happy-dom';
import {UploadQueue,uploadPanel,renderQueue} from '../client/evidence-library.mjs';

let mf;
const origin='https://batch.test';
const imageBytes=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jp1sAAAAASUVORK5CYII=','base64'));
const files=(count,prefix='Outfit')=>Array.from({length:count},(_,i)=>new File([imageBytes],`${prefix} ${i+1}.png`,{type:'image/png'}));
const urls=()=>{let n=0;return{createObjectURL:()=>`blob:batch-${++n}`,revokeObjectURL:()=>{}}};
async function api(path,{owner,method='GET',body}={}){
 const headers={...(owner?{'oai-authenticated-user-id':owner}:{}),...(['GET','HEAD'].includes(method)?{}:{Origin:origin})};
 if(body instanceof FormData){const request=new Request(origin+path,{method,body});headers['Content-Type']=request.headers.get('Content-Type');body=await request.arrayBuffer()}
 else if(body!==undefined){headers['Content-Type']='application/json';body=JSON.stringify(body)}
 return mf.dispatchFetch(origin+path,{method,headers,body});
}
async function upload(task,owner,progress=()=>{}){
 const body=new FormData();body.set('file',task.file);body.set('kind',task.kind);body.set('title',task.title);body.set('uploadId',task.uploadId);
 progress(25);const response=await api('/api/evidence',{owner,method:'POST',body});const item=await response.json();if(!response.ok)throw Error(item.error);progress(100);return item;
}
before(async()=>{
 const built=await build({entryPoints:['server/worker.mjs'],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
 mf=new Miniflare({modules:true,script:built.outputFiles[0].text,compatibilityDate:'2025-11-01',d1Databases:['DB'],r2Buckets:['BUCKET']});
 const {DB}=await mf.getBindings();for(const {tag}of JSON.parse(await readFile('drizzle/meta/_journal.json','utf8')).entries)await DB.exec(await readFile(`drizzle/${tag}.sql`,'utf8'));
});
after(async()=>mf?.dispose());

for(const kind of ['recent','inspiration'])for(const count of [10,12]){
 test(`${count} ${kind} images selected together are previewed, uploaded and privately persisted`,async()=>{
  const owner=`batch-${kind}-${count}`,saved=[];
  const q=new UploadQueue({objectURL:urls(),saved:item=>saved.push(item),transport:(task,p)=>upload(task,owner,p)});
  q.add(files(count,kind),kind);
  assert.equal(q.tasks.length,count);assert.ok(q.tasks.every(t=>t.kind===kind&&t.status==='queued'));
  const view=new Window();view.document.body.innerHTML=uploadPanel(kind)+renderQueue(q);
  assert.equal(view.document.querySelector('#batch-images').multiple,true);assert.equal(view.document.querySelector('#batch-kind').value,kind);
  assert.equal(view.document.querySelectorAll('.upload-preview').length,count);assert.equal(view.document.querySelectorAll('.upload-preview img').length,count);
  await q.start();assert.equal(saved.length,count);assert.ok(q.tasks.every(t=>t.status==='saved'&&t.progress===100));assert.ok(q.tasks.every(t=>t.file===null),'Saved queues release local photo bytes');
  const boot=await (await api('/api/bootstrap',{owner})).json();assert.equal(boot.evidence.length,count);assert.ok(boot.evidence.every(x=>x.kind===kind));
  for(const item of boot.evidence){const response=await api(item.url,{owner});assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'image/png');assert.equal((await response.arrayBuffer()).byteLength,imageBytes.length);assert.equal((await api(item.url,{owner:'another-customer'})).status,404)}
  q.dispose();await view.close();
 });
}

test('12 recent plus 12 inspiration photos retain their selected sets and existing observations',async()=>{
 const owner='mixed-batch';
 const old=await (await api('/api/evidence',{owner,method:'POST',body:{kind:'recent',title:'Existing outfit',reference:'My saved reference'}})).json();
 const annotated=await (await api('/api/evidence/'+old.id,{owner,method:'PATCH',body:{baseRevision:old.revision,annotations:{notes:'Preserve this original note',fit:'Relaxed'}}})).json();
 const initialLibrary=await (await api('/api/bootstrap',{owner})).json();let library=initialLibrary.evidence;
 const q=new UploadQueue({objectURL:urls(),librarySize:()=>library.length,saved:item=>library.push(item),transport:(t,p)=>upload(t,owner,p)});
 q.add(files(12,'Recent'),'recent');q.add(files(12,'Inspiration'),'inspiration');await q.start();
 const boot=await (await api('/api/bootstrap',{owner})).json();assert.equal(boot.evidence.length,25);assert.equal(boot.evidence.filter(x=>x.kind==='recent').length,13);assert.equal(boot.evidence.filter(x=>x.kind==='inspiration').length,12);assert.deepEqual(boot.evidence.find(x=>x.id===old.id),annotated);
 q.dispose();
});

for(const kind of ['recent','inspiration'])test(`12-image ${kind} batch continues after a lost response and retry creates no duplicate`,async()=>{
 const owner=`retry-${kind}`,attempts=new Map();
 const q=new UploadQueue({objectURL:urls(),transport:async(task,p)=>{const n=(attempts.get(task.key)||0)+1;attempts.set(task.key,n);const item=await upload(task,owner,p);if(task.key==='4'&&n===1)throw Error('Connection interrupted after transfer');return item}});
 q.add(files(12,kind),kind);const id=q.tasks[3].uploadId;await q.start();assert.equal(q.tasks.filter(t=>t.status==='saved').length,11);assert.equal(q.tasks[3].status,'error');assert.ok(renderQueue(q).includes('Retry this image'));
 await q.start(q.tasks[3].key);assert.ok(q.tasks.every(t=>t.status==='saved'));assert.equal(q.tasks[3].uploadId,id);assert.equal(attempts.get('4'),2);assert.equal([...attempts.values()].reduce((a,b)=>a+b,0),13);
 const boot=await (await api('/api/bootstrap',{owner})).json();assert.equal(boot.evidence.length,12);assert.equal(boot.evidence.filter(x=>x.id===id).length,1);q.dispose();
});

test('removing a waiting image prevents its upload and newly selected photos await their own upload action',async()=>{
 const sent=[];let release;const gate=new Promise(resolve=>release=resolve);
 const q=new UploadQueue({objectURL:urls(),transport:async task=>{sent.push(task.key);if(task.key==='1')await gate;return{id:task.uploadId,url:'/api/evidence/'+task.uploadId}}});
 q.add(files(3),'recent');const started=q.start();q.remove('2');q.add(files(1,'Later'),'inspiration');release();await started;assert.deepEqual(sent,['1','3']);assert.equal(q.tasks.find(t=>t.key==='4').status,'queued');await q.start();assert.deepEqual(sent,['1','3','4']);q.dispose();
});

test('capacity failures are explicit for each image without discarding existing or queued photos',()=>{
 const q=new UploadQueue({objectURL:urls(),librarySize:()=>38});q.add(files(12),'inspiration');assert.equal(q.tasks.length,12);assert.equal(q.tasks.filter(t=>t.status==='queued').length,2);assert.equal(q.tasks.filter(t=>t.status==='invalid').length,10);assert.ok(q.tasks.filter(t=>t.status==='invalid').every(t=>t.error.includes('40 items')));assert.ok(renderQueue(q).includes('existing images are unchanged'));q.dispose();
});

test('the application accepts one 12-file picker selection for each evidence set and saves all 24 privately',async()=>{
 const owner='picker-twelve-each';const built=await build({entryPoints:['client/app.mjs'],bundle:true,write:false,format:'iife',target:'es2022',loader:{'.css':'empty'}});
 const w=new Window({url:origin+'/#/evidence',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});w.document.body.innerHTML='<div id="app"></div><div id="announcements"></div>';Object.defineProperty(w,'crypto',{value:globalThis.crypto});w.structuredClone=globalThis.structuredClone;w.URL.createObjectURL=()=> 'blob:picker-photo';w.URL.revokeObjectURL=()=>{};w.scrollTo=()=>{};w.confirm=()=>true;w.alert=message=>{throw Error('Unexpected upload alert: '+message)};
 const convert=async fd=>{const body=new FormData();for(const [key,value]of fd){body.set(key,typeof value==='string'?value:new File([await value.arrayBuffer()],value.name,{type:value.type}))}return body};
 w.fetch=async(url,init={})=>api(new URL(url,origin).pathname+new URL(url,origin).search,{owner,method:init.method||'GET',body:init.body?(typeof init.body==='string'?JSON.parse(init.body):await convert(init.body)):undefined});
 w.XMLHttpRequest=class{upload={};open(method,path){Object.assign(this,{method,path})}async send(fd){try{this.upload.onprogress?.({lengthComputable:true,loaded:50,total:100});const response=await api(this.path,{owner,method:this.method,body:await convert(fd)});this.status=response.status;this.response=await response.json();this.onload()}catch(error){this.onerror?.(error)}}};
 const wait=async(check,label)=>{for(let i=0;i<800;i++){if(await check())return;await new Promise(resolve=>setTimeout(resolve,15))}throw Error('Timed out during '+label)};
 try{w.eval(built.outputFiles[0].text);await wait(()=>w.document.querySelector('#batch-images'),'evidence bootstrap');
  for(const [kind,total]of [['recent',12],['inspiration',24]]){
   const selector=w.document.querySelector('#batch-kind');selector.value=kind;selector.dispatchEvent(new w.Event('change',{bubbles:true}));const selected=new w.DataTransfer();for(let i=1;i<=12;i++)selected.items.add(new w.File([imageBytes],`${kind}-${i}.png`,{type:'image/png'}));const picker=w.document.querySelector('#batch-images');picker.files=selected.files;picker.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(w.document.querySelectorAll('.upload-preview').length,total);assert.equal(w.document.querySelector('#batch-images').files.length,0,'Picker resets so later selection can use the same files');
   w.document.querySelector('[data-action=upload-all]').click();await wait(()=>w.document.querySelector(`.evidence-grid[data-library-kind="${kind}"]`)?.querySelectorAll('[data-evidence-id]').length===12,kind+' batch persistence');assert.equal(w.document.querySelector('.evidence-grid').dataset.libraryKind,kind);await wait(()=>!w.document.querySelector('.upload-preview progress'),kind+' queue completed');
  }
  const boot=await (await api('/api/bootstrap',{owner})).json();assert.equal(boot.evidence.filter(x=>x.kind==='recent').length,12);assert.equal(boot.evidence.filter(x=>x.kind==='inspiration').length,12);assert.equal(boot.evidence.length,24);
 }finally{w.happyDOM.abort();await w.close()}
});
