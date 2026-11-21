import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {Window} from 'happy-dom';
import {PDFDocument} from 'pdf-lib';
import {exampleWorkspace,PREVIEW_STORAGE} from '../prototype/fixture.mjs';
import {PreviewStore} from '../prototype/store.mjs';
import {renderChapter} from '../prototype/chapter.mjs';
import {workbook,controls,validateValue,resolveValue} from '../server/model.mjs';

class MemoryStorage {
 constructor(){this.values=new Map()}
 getItem(key){return this.values.get(key)??null}
 setItem(key,value){this.values.set(key,value)}
 removeItem(key){this.values.delete(key)}
}

test('isolated sample answers validate against the approved schema and chapter counts derive from saved completion',async()=>{
 const sample=exampleWorkspace();for(const [id,value]of Object.entries(sample.state.answers))assert.equal(validateValue(controls.get(id),value),true,'Fixture response must match '+id);assert.equal(sample.state.lastStep,12);assert.equal(new Set(sample.state.completed).size,sample.state.completed.length);assert.ok(sample.state.completed.every(n=>n>=1&&n<=68));
 const changed={...sample.state,completed:[1,8,9,12,21,35,45,58]},window=new Window();
 try{window.document.body.innerHTML=renderChapter({workbook,state:changed,evidence:sample.evidence,photo:()=>''});const progress=window.document.querySelector('.chapter-rail-progress progress');assert.equal(Number(progress.value),8);assert.equal(Number(progress.max),68);for(const panel of window.document.querySelectorAll('[data-preview-chapter]')){const part=Number(panel.dataset.previewChapter),pages=workbook.pages.filter(p=>p.part===part),done=pages.filter(p=>changed.completed.includes(p.page)).length;assert.ok(panel.querySelector('.chapter-outline-progress').textContent.includes(`${done} / ${pages.length} complete`));assert.equal(panel.open,false)}assert.equal(window.document.querySelectorAll('[data-preview-chapter]').length,5);
 }finally{await window.close()}
});

test('preview persistence is isolated from production keys and supports saving and returning to exact responses',()=>{
 const storage=new MemoryStorage();storage.setItem('inherfashion.recovery.production',{private:'leave unchanged'});const before=storage.getItem('inherfashion.recovery.production'),store=new PreviewStore(storage);store.patch({answers:{'silhouette.notes.3':'My prototype silhouette observation'}});assert.equal(store.saved,true);assert.ok(storage.getItem(PREVIEW_STORAGE));assert.equal(storage.getItem('inherfashion.recovery.production'),before);const resumed=new PreviewStore(storage);assert.equal(resumed.workspace.state.answers['silhouette.notes.3'],'My prototype silhouette observation');assert.equal(resolveValue('body.silhouette',resumed.workspace.state.answers,new Set(),resumed.workspace.state.bindingState),'My prototype silhouette observation');assert.deepEqual(resumed.workspace.state.completed,store.workspace.state.completed);
});

test('preview reports unavailable browser storage instead of claiming a successful save',()=>{
 const blocked={getItem(){throw Error('Storage denied')},setItem(){throw Error('Storage denied')}};const store=new PreviewStore(blocked);assert.ok(store.error.includes('unavailable'));store.patch({answers:{'silhouette.notes.3':'My tab-only observation'}});assert.equal(store.saved,false);assert.ok(store.error.includes('stay in this tab'));assert.equal(store.workspace.state.answers['silhouette.notes.3'],'My tab-only observation');
});

let standalonePromise;
const guardedFiles=['client/app.mjs','client/store.mjs','server/model.mjs','server/worker.mjs','content/workbook.json','.openai/hosting.json','drizzle/meta/_journal.json'];
async function standalone(){
 if(!standalonePromise)standalonePromise=(async()=>{
  const hashes=await Promise.all(guardedFiles.map(async name=>createHash('sha256').update(await readFile(name)).digest('hex')));
  execFileSync(process.execPath,['scripts/design/build.mjs'],{stdio:'pipe',maxBuffer:20*1024*1024});
  const after=await Promise.all(guardedFiles.map(async name=>createHash('sha256').update(await readFile(name)).digest('hex')));assert.deepEqual(after,hashes,'Standalone build must not change production source or configuration');
  return readFile('design-preview/index.html','utf8');
 })();
 return standalonePromise;
}
const wait=async(check,label='preview')=>{for(let i=0;i<800;i++){if(await check())return;await new Promise(resolve=>setTimeout(resolve,10))}throw Error('Timed out waiting for '+label)};
function indexedDBMemory(window,records){
 return {open(name){
  assert.equal(name,'ihf-editorial-preview-photos');const request={};
  setTimeout(()=>{
   const db={createObjectStore(){},close(){},transaction(){
    const tx={};tx.objectStore=()=>({
     put(record){records.set(record.id,record);setTimeout(()=>tx.oncomplete?.(),0)},
     delete(id){records.delete(id);setTimeout(()=>tx.oncomplete?.(),0)},
     clear(){records.clear();setTimeout(()=>tx.oncomplete?.(),0)},
     getAll(){const get={};setTimeout(async()=>{get.result=await Promise.all([...records.values()].map(async record=>({...record,blob:new window.File([await record.blob.arrayBuffer()],record.blob.name||'preview.png',{type:record.blob.type})})));get.onsuccess?.()},0);return get}
    });return tx;
   }};
   request.result=db;request.onupgradeneeded?.();request.onsuccess?.();
  },0);return request;
 }};
}
async function preview(saved=null,photos=null){
 const html=await standalone(),w=new Window({url:'https://isolated-preview.test/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true}}),blobs=[],network=[];
 Object.defineProperty(w,'crypto',{value:globalThis.crypto});if(photos)Object.defineProperty(w,'indexedDB',{value:indexedDBMemory(w,photos),configurable:true});w.structuredClone=globalThis.structuredClone;w.__IHF_PREVIEW_TEST_MODE__=true;w.scrollTo=()=>{};w.confirm=()=>true;w.alert=message=>{throw Error('Unexpected preview alert: '+message)};
 w.URL.createObjectURL=blob=>{blobs.push(blob);return 'blob:local-preview-test'};w.URL.revokeObjectURL=()=>{};w.fetch=async(...args)=>{network.push(args);throw Error('Isolated preview must not make network requests')};
 if(saved)w.localStorage.setItem(PREVIEW_STORAGE,saved);
 w.document.write(html);const scripts=[...w.document.querySelectorAll('script')].map(script=>script.textContent);w.happyDOM.settings.disableJavaScriptEvaluation=false;for(const script of scripts)w.eval(script);await wait(()=>w.__IHF_PREVIEW_TEST__,'test hook');await new Promise(resolve=>setTimeout(resolve,20));
 return {w,hook:w.__IHF_PREVIEW_TEST__,blobs,network,close:async()=>{w.happyDOM.abort();await w.close()}};
}

test('standalone build embeds scripts, styles, fonts and images without altering production files',async()=>{
 const html=await standalone(),w=new Window({settings:{disableJavaScriptEvaluation:true,disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 try{w.document.write(html);assert.ok(w.document.querySelector('script:not([src])'));assert.equal(w.document.querySelectorAll('script[src],link[rel=stylesheet]').length,0);for(const style of w.document.querySelectorAll('style')){assert.ok(!/@import\b/.test(style.textContent));for(const match of style.textContent.matchAll(/url\(([^)]+)\)/g)){const url=match[1].trim().replace(/^['"]|['"]$/g,'');assert.ok(/^(data:|blob:|#)/.test(url),'Styles must embed '+url.slice(0,50))}}assert.ok(html.includes('data:image/jpeg;base64,'));assert.ok(html.includes('data:font/'));
 }finally{await w.close()}
});

test('the three preview screens retain approved step12 choices, local answers and source-derived Blueprint content',async()=>{
 let session=await preview();
 try{const {w,hook}=session;assert.equal(hook.getView(),'journey');assert.equal(Number(w.document.querySelector('.chapter-rail-progress progress').value),hook.store.workspace.state.completed.length);hook.navigate('exercise');assert.equal(w.document.querySelector('h1').textContent,workbook.pages[11].title);
  for(const id of ['p12.choices1','p12.choices2']){const c=controls.get(id),inputs=[...w.document.querySelectorAll(`[data-answer="${id}"]`)];assert.equal(inputs.length,c.options.length);assert.deepEqual(inputs.map(input=>input.dataset.option),c.options)}
  const checkbox=w.document.querySelector('[data-answer="p12.choices1"][data-option="Defined"]');checkbox.checked=true;checkbox.dispatchEvent(new w.Event('change',{bubbles:true}));assert.ok(hook.store.workspace.state.answers['p12.choices1'].includes('Defined'));
  w.document.querySelector('[data-action=phase][data-phase=record]').click();const observation=w.document.querySelector('[data-answer="silhouette.notes.3"]');observation.value='My own saved prototype silhouette';observation.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(w.document.querySelectorAll('.original-copy').length,1);for(const line of workbook.pages[11].lines)assert.ok(w.document.querySelector('.original-copy').textContent.includes(line));
  w.document.querySelector('[data-action=complete-exercise]').click();assert.equal(hook.getView(),'blueprint');assert.ok(hook.store.workspace.state.completed.includes(12));assert.ok(w.document.querySelector('.reference-publication').textContent.includes('My own saved prototype silhouette'));assert.equal(session.network.length,0);
  for(let visit=0;visit<2;visit++){const source=w.document.querySelector('.reference-publication a[href^="#/source/"]');assert.ok(source,'The final reference exposes earlier answers');source.click();await wait(()=>w.document.querySelector('.preview-modal'),'source panel');w.document.querySelector('.preview-modal [data-action=close-overlay]').click();assert.equal(hook.getView(),'blueprint');assert.equal(w.location.hash,'#/blueprint','Closing a source returns to the current screen and lets the same link open again')}
  const saved=w.localStorage.getItem(PREVIEW_STORAGE);await session.close();session=await preview(saved);session.hook.navigate('exercise');session.w.document.querySelector('[data-action=phase][data-phase=choose]').click();assert.equal(session.w.document.querySelector('[data-answer="p12.choices1"][data-option="Defined"]').checked,true);assert.equal(session.hook.store.workspace.state.answers['silhouette.notes.3'],'My own saved prototype silhouette');assert.ok(session.hook.store.workspace.state.completed.includes(12));assert.equal(session.network.length,0);
 }finally{await session.close()}
});

test('deliberate final identity edits survive an earlier source change and a local reload',async()=>{
 let session=await preview();
 try{session.hook.navigate('blueprint');session.w.document.querySelector('[data-action=edit-field][data-id=identity]').click();const editor=session.w.document.querySelector('.reference-editor [data-answer=identity]');assert.ok(editor);editor.value='My deliberate preview identity';editor.dispatchEvent(new session.w.Event('input',{bubbles:true}));session.w.document.querySelector('[data-action=close-editor]').click();session.hook.store.patch({answers:{'style.brief':'A newly edited earlier brief'}});session.hook.render();assert.equal(resolveValue('identity',session.hook.store.workspace.state.answers,new Set(),session.hook.store.workspace.state.bindingState),'My deliberate preview identity');assert.ok(session.w.document.querySelector('.reference-identity').textContent.includes('My deliberate preview identity'));const saved=session.w.localStorage.getItem(PREVIEW_STORAGE);await session.close();session=await preview(saved);session.hook.navigate('blueprint');assert.equal(session.w.document.querySelector('.reference-identity').textContent,'My deliberate preview identity');assert.equal(session.network.length,0);
 }finally{await session.close()}
});

test('the isolated Blueprint downloads a real one-page PDF and a full PDF using embedded fonts',async()=>{
 const session=await preview();
 try{session.hook.navigate('blueprint');session.w.document.querySelector('[data-action=export-pdf][data-mode=glance]').click();await wait(()=>session.blobs.length===1,'One-glance PDF');const bytes=new Uint8Array(await session.blobs[0].arrayBuffer());assert.equal(new TextDecoder().decode(bytes.slice(0,5)),'%PDF-');const pdf=await PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),1);assert.ok(pdf.getTitle().includes('Blueprint'));session.w.document.querySelector('[data-action=reference-mode][data-mode=master]').click();session.w.document.querySelector('[data-action=export-pdf][data-mode=master]').click();await wait(()=>session.blobs.length===2,'full PDF');assert.ok((await PDFDocument.load(new Uint8Array(await session.blobs[1].arrayBuffer()))).getPageCount()>=1);assert.equal(session.network.length,0);
 }finally{await session.close()}
});

test('12 photos per evidence set can be selected together and storage failure stays explicit in this local preview',async()=>{
 const session=await preview();
 try{const {w,hook}=session;Object.defineProperty(w,'indexedDB',{value:undefined,configurable:true});w.document.querySelector('[data-action=gallery]').click();
  const jpeg=Uint8Array.from([255,216,255,224,0,16,74,70,73,70]);
  for(const kind of ['recent','inspiration']){const kindInput=w.document.querySelector('#batch-kind');kindInput.value=kind;const transfer=new w.DataTransfer();for(let i=0;i<12;i++)transfer.items.add(new w.File([jpeg],`${kind}-${i+1}.jpg`,{type:'image/jpeg'}));const fileInput=w.document.querySelector('#batch-images');assert.equal(fileInput.multiple,true);fileInput.files=transfer.files;fileInput.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(hook.queue.tasks.filter(task=>task.kind===kind).length,12);w.document.querySelector('[data-action=upload-all]').click();await wait(()=>!hook.queue.running,kind+' local photo batch');assert.equal(hook.queue.tasks.filter(task=>task.kind===kind&&task.status==='error').length,12);assert.ok(hook.queue.tasks.filter(task=>task.kind===kind).every(task=>task.error.includes('storage')));}
  assert.equal(hook.store.workspace.evidence.length,3);assert.equal(hook.queue.tasks.length,24);assert.ok(w.document.body.textContent.includes('Image storage is unavailable'));assert.ok(!w.document.querySelector('#upload-queue').textContent.includes('Saved privately'));const stored=w.localStorage.getItem(PREVIEW_STORAGE);if(stored)assert.equal(JSON.parse(stored).evidence.length,3);assert.equal(session.network.length,0);
 }finally{await session.close()}
});


test('12-file batches for both sets persist in the isolated photo database and restore their images locally',async()=>{
 const photos=new Map();let session=await preview(null,photos);
 try{const {w,hook}=session;w.document.querySelector('[data-action=gallery]').click();const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jp1sAAAAASUVORK5CYII=','base64'));
  for(const kind of ['recent','inspiration']){w.document.querySelector('#batch-kind').value=kind;const selected=new w.DataTransfer();for(let i=1;i<=12;i++)selected.items.add(new w.File([png],`${kind}-sample-${i}.png`,{type:'image/png'}));const input=w.document.querySelector('#batch-images');input.files=selected.files;input.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(hook.queue.tasks.filter(task=>task.kind===kind).length,12);w.document.querySelector('[data-action=upload-all]').click();await wait(()=>!hook.queue.running,kind+' successful local image storage');assert.equal(hook.queue.tasks.filter(task=>task.kind===kind&&task.status==='saved').length,12);}
  assert.equal(photos.size,24);assert.equal(hook.store.workspace.evidence.length,27);assert.equal(hook.store.workspace.evidence.filter(item=>!item.asset&&item.kind==='recent').length,12);assert.equal(hook.store.workspace.evidence.filter(item=>!item.asset&&item.kind==='inspiration').length,12);const saved=w.localStorage.getItem(PREVIEW_STORAGE);assert.equal(session.network.length,0);await session.close();session=await preview(saved,photos);session.w.document.querySelector('[data-action=gallery]').click();await wait(()=>[...session.w.document.querySelectorAll('.preview-photo-library img')].filter(img=>img.src.startsWith('data:image/png')).length===24,'restored local image bytes');assert.equal(session.hook.store.workspace.evidence.length,27);assert.equal(session.network.length,0);
 }finally{await session.close()}
});

test('metadata storage failures do not claim saved photos or annotations and written references have no empty images',async()=>{
 const photos=new Map(),session=await preview(null,photos);
 try{const {w,hook}=session;hook.store.storage={getItem:key=>w.localStorage.getItem(key),setItem(){throw Error('Preview metadata storage denied')}};
  hook.navigate('exercise');hook.store.patch({answers:{'silhouette.notes.3':'Only retained in this tab'}});hook.render();const footer=w.document.querySelector('#exercise-save-note');assert.ok(/unavailable|stay in this tab|not saved/i.test(footer.textContent));assert.ok(!/changes are saved/i.test(footer.textContent));
  w.document.querySelector('[data-action=gallery]').click();const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jp1sAAAAASUVORK5CYII=','base64')),selected=new w.DataTransfer();selected.items.add(new w.File([png],'Tab-only photo.png',{type:'image/png'}));const input=w.document.querySelector('#batch-images');input.files=selected.files;input.dispatchEvent(new w.Event('change',{bubbles:true}));w.document.querySelector('[data-action=upload-all]').click();await wait(()=>!hook.queue.running,'metadata save failure');assert.equal(photos.size,1,'The controlled photo database accepted image bytes');assert.equal(hook.queue.tasks[0].status,'error');assert.ok(/could not be saved|unavailable|not saved/i.test(hook.queue.tasks[0].error));assert.ok(!w.document.querySelector('#upload-queue').textContent.includes('Saved privately'));assert.equal(hook.store.dirty,true);
  w.document.querySelector('[data-action=photo][data-photo=example-01]').click();const annotation=w.document.querySelector('.annotation-form'),notes=annotation.querySelector('[name=notes]');notes.value='My annotation is only in this tab';annotation.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.ok(/unavailable|stay in this tab|not saved/i.test(annotation.querySelector('[role=status]').textContent));assert.ok(!/^saved/i.test(annotation.querySelector('[role=status]').textContent));assert.ok(/unavailable|stay in this tab|not saved/i.test(w.document.querySelector('.header-tools [data-local-status]').textContent));
  w.document.querySelector('[data-action=close-overlay]').click();w.document.querySelector('[data-action=gallery]').click();const written=w.document.querySelector('#evidence-form');written.elements.title.value='My written preview reference';written.elements.reference.value='An outfit I remember wearing last week';written.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));const card=[...w.document.querySelectorAll('.preview-photo-library figure')].find(item=>item.textContent.includes('My written preview reference'));assert.ok(card);assert.equal(card.querySelectorAll('img').length,0);assert.equal(w.document.querySelectorAll('img[src=""]').length,0);assert.equal(session.network.length,0);
 }finally{await session.close()}
});
