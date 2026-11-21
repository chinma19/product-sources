import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {Window} from 'happy-dom';
import {PDFDocument} from 'pdf-lib';
import {exampleWorkspace,PREVIEW_STORAGE} from '../prototype/fixture.mjs';
import {PreviewStore} from '../prototype/store.mjs';
import {renderChapter} from '../prototype/chapter.mjs';
import {answerProvenance} from '../prototype/provenance.mjs';
import {exercisePlan} from '../prototype/exercise-plan.mjs';
import {evidenceCollections,relevantEvidence} from '../prototype/evidence-gallery.mjs';
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
 const html=await standalone(),w=new Window({url:'https://isolated-preview.test/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true}}),blobs=[],network=[],scrolls=[];let currentScrollX=0,currentScrollY=0;Object.defineProperties(w,{scrollX:{get:()=>currentScrollX,configurable:true},scrollY:{get:()=>currentScrollY,configurable:true},pageXOffset:{get:()=>currentScrollX,configurable:true},pageYOffset:{get:()=>currentScrollY,configurable:true}});
 Object.defineProperty(w,'crypto',{value:globalThis.crypto});if(photos)Object.defineProperty(w,'indexedDB',{value:indexedDBMemory(w,photos),configurable:true});w.structuredClone=globalThis.structuredClone;w.__IHF_PREVIEW_TEST_MODE__=true;w.scrollTo=(x,y)=>{if(typeof x==='object'){currentScrollX=x.left??currentScrollX;currentScrollY=x.top??currentScrollY}else{currentScrollX=x??currentScrollX;currentScrollY=y??currentScrollY}scrolls.push({x:currentScrollX,y:currentScrollY})};w.confirm=()=>true;w.alert=message=>{throw Error('Unexpected preview alert: '+message)};
 w.URL.createObjectURL=blob=>{blobs.push(blob);return 'blob:local-preview-test'};w.URL.revokeObjectURL=()=>{};w.fetch=async(...args)=>{network.push(args);throw Error('Isolated preview must not make network requests')};
 if(saved)w.localStorage.setItem(PREVIEW_STORAGE,saved);
 w.document.write(html);const scripts=[...w.document.querySelectorAll('script')].map(script=>script.textContent);w.happyDOM.settings.disableJavaScriptEvaluation=false;for(const script of scripts)w.eval(script);await wait(()=>w.__IHF_PREVIEW_TEST__,'test hook');await new Promise(resolve=>setTimeout(resolve,20));
 return {w,hook:w.__IHF_PREVIEW_TEST__,blobs,network,scrolls,close:async()=>{w.happyDOM.abort();await w.close()}};
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
  for(const kind of ['recent','inspiration']){const kindInput=w.document.querySelector('#batch-kind');kindInput.value=kind;kindInput.dispatchEvent(new w.Event('change',{bubbles:true}));const transfer=new w.DataTransfer();for(let i=0;i<12;i++)transfer.items.add(new w.File([jpeg],`${kind}-${i+1}.jpg`,{type:'image/jpeg'}));const fileInput=w.document.querySelector('#batch-images');assert.equal(fileInput.multiple,true);fileInput.files=transfer.files;fileInput.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(hook.queue.tasks.filter(task=>task.kind===kind).length,12);w.document.querySelector('[data-action=upload-all]').click();await wait(()=>!hook.queue.running,kind+' local photo batch');assert.equal(hook.queue.tasks.filter(task=>task.kind===kind&&task.status==='error').length,12);assert.ok(hook.queue.tasks.filter(task=>task.kind===kind).every(task=>task.error.includes('storage')));}
  assert.equal(hook.store.workspace.evidence.length,3);assert.equal(hook.queue.tasks.length,24);assert.ok(w.document.body.textContent.includes('Image storage is unavailable'));assert.ok(!w.document.querySelector('#upload-queue').textContent.includes('Saved privately'));const stored=w.localStorage.getItem(PREVIEW_STORAGE);if(stored)assert.equal(JSON.parse(stored).evidence.length,3);assert.equal(session.network.length,0);
 }finally{await session.close()}
});


test('12-file batches for both sets persist in the isolated photo database and restore their images locally',async()=>{
 const photos=new Map();let session=await preview(null,photos);
 try{const {w,hook}=session;w.document.querySelector('[data-action=gallery]').click();const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jp1sAAAAASUVORK5CYII=','base64'));
  for(const kind of ['recent','inspiration']){w.document.querySelector(`[data-action=library-collection][data-collection=${kind}]`).click();assert.equal(w.document.querySelector('#batch-kind').value,kind);const selected=new w.DataTransfer();for(let i=1;i<=12;i++)selected.items.add(new w.File([png],`${kind}-sample-${i}.png`,{type:'image/png'}));const input=w.document.querySelector('#batch-images');input.files=selected.files;input.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(hook.queue.tasks.filter(task=>task.kind===kind).length,12);w.document.querySelector('[data-action=upload-all]').click();await wait(()=>!hook.queue.running,kind+' successful local image storage');assert.equal(hook.queue.tasks.filter(task=>task.kind===kind&&task.status==='saved').length,12);}
  assert.equal(photos.size,24);assert.equal(hook.store.workspace.evidence.length,27);assert.equal(hook.store.workspace.evidence.filter(item=>!item.asset&&item.kind==='recent').length,12);assert.equal(hook.store.workspace.evidence.filter(item=>!item.asset&&item.kind==='inspiration').length,12);const saved=w.localStorage.getItem(PREVIEW_STORAGE);assert.equal(session.network.length,0);await session.close();session=await preview(saved,photos);session.w.document.querySelector('[data-action=gallery]').click();for(const kind of ['recent','inspiration']){session.w.document.querySelector(`[data-action=library-collection][data-collection=${kind}]`).click();await wait(()=>[...session.w.document.querySelectorAll('.preview-photo-library img')].filter(img=>img.src.startsWith('data:image/png')).length===12,'restored '+kind+' local image bytes');assert.equal(session.w.document.querySelector('.preview-photo-library').dataset.libraryCollection,kind);}assert.equal(session.hook.store.workspace.evidence.length,27);assert.equal(session.network.length,0);
 }finally{await session.close()}
});

test('metadata storage failures do not claim saved photos or annotations and written references have no empty images',async()=>{
 const photos=new Map(),session=await preview(null,photos);
 try{const {w,hook}=session;hook.store.storage={getItem:key=>w.localStorage.getItem(key),setItem(){throw Error('Preview metadata storage denied')}};
  hook.navigate('exercise');hook.store.patch({answers:{'silhouette.notes.3':'Only retained in this tab'}});hook.render();const footer=w.document.querySelector('#exercise-save-note');assert.ok(/unavailable|stay in this tab|not saved/i.test(footer.textContent));assert.ok(!/changes are saved/i.test(footer.textContent));
  w.document.querySelector('[data-action=gallery]').click();const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jp1sAAAAASUVORK5CYII=','base64')),selected=new w.DataTransfer();selected.items.add(new w.File([png],'Tab-only photo.png',{type:'image/png'}));const input=w.document.querySelector('#batch-images');input.files=selected.files;input.dispatchEvent(new w.Event('change',{bubbles:true}));w.document.querySelector('[data-action=upload-all]').click();await wait(()=>!hook.queue.running,'metadata save failure');assert.equal(photos.size,1,'The controlled photo database accepted image bytes');assert.equal(hook.queue.tasks[0].status,'error');assert.ok(/could not be saved|unavailable|not saved/i.test(hook.queue.tasks[0].error));assert.ok(!w.document.querySelector('#upload-queue').textContent.includes('Saved privately'));assert.equal(hook.store.dirty,true);
  w.document.querySelector('[data-action=photo][data-photo=example-01]').click();const annotation=w.document.querySelector('.annotation-form'),notes=annotation.querySelector('[name=notes]');notes.value='My annotation is only in this tab';annotation.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.ok(/unavailable|stay in this tab|not saved/i.test(annotation.querySelector('[role=status]').textContent));assert.ok(!/^saved/i.test(annotation.querySelector('[role=status]').textContent));assert.ok(/unavailable|stay in this tab|not saved/i.test(w.document.querySelector('.header-tools [data-local-status]').textContent));
  w.document.querySelector('[data-action=close-overlay]').click();if(!w.document.querySelector('#evidence-form'))w.document.querySelector('[data-action=gallery]').click();const written=w.document.querySelector('#evidence-form');written.elements.title.value='My written preview reference';written.elements.reference.value='An outfit I remember wearing last week';written.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));const card=[...w.document.querySelectorAll('.preview-photo-library figure')].find(item=>item.textContent.includes('My written preview reference'));assert.ok(card);assert.equal(card.querySelectorAll('img').length,0);assert.equal(w.document.querySelectorAll('img[src=""]').length,0);assert.equal(session.network.length,0);
 }finally{await session.close()}
});


test('continuous discovery follows the source-defined sequence and flow comparison retains the same saved answers',async()=>{
 const session=await preview();
 try{const {w,hook}=session;hook.navigate('exercise');assert.equal(hook.getFlow(),'continuous');assert.deepEqual([...w.document.querySelectorAll('.exercise-stage[id^="stage-"]')].map(section=>section.id),exercisePlan(workbook.pages[11]).map(stage=>'stage-'+stage.id));assert.deepEqual([...new Set([...w.document.querySelectorAll('.exercise-stage [data-answer]')].map(input=>input.dataset.answer))].sort(),workbook.pages[11].controls.map(control=>control.id).sort(),'The continuous layout must retain every original exercise control without adding a question');
  const notes=w.document.querySelector('[data-answer="silhouette.notes.2"]');notes.value='My comparison observation stays with both flow views';notes.dispatchEvent(new w.Event('input',{bubbles:true}));const choice=w.document.querySelector('[data-answer="p12.choices1"][data-option="Defined"]');choice.checked=true;choice.dispatchEvent(new w.Event('change',{bubbles:true}));
  w.document.querySelector('[data-action=exercise-flow][data-flow=separate]').click();assert.equal(hook.getFlow(),'separate');w.document.querySelector('[data-action=phase][data-phase=reflect]').click();assert.equal(w.document.querySelector('[data-answer="silhouette.notes.2"]').value,'My comparison observation stays with both flow views');w.document.querySelector('[data-action=phase][data-phase=choose]').click();assert.equal(w.document.querySelector('[data-answer="p12.choices1"][data-option="Defined"]').checked,true);
  w.document.querySelector('[data-action=exercise-flow][data-flow=continuous]').click();assert.equal(hook.getFlow(),'continuous');assert.ok(w.document.querySelector('#stage-reflect'));assert.equal(w.document.querySelector('[data-answer="silhouette.notes.2"]').value,'My comparison observation stays with both flow views');w.document.querySelector('[data-action=phase][data-phase=record]').click();assert.equal(w.document.querySelector('[data-answer="p12.choices1"][data-option="Defined"]').checked,true);assert.equal(session.network.length,0);
 }finally{await session.close()}
});

test('the exercise renders all 40 recent references and excludes inspiration from the relevant gallery',async()=>{
 const session=await preview();
 try{const {w,hook}=session,base=exampleWorkspace().evidence[0];hook.store.workspace.evidence=Array.from({length:40},(_,index)=>({...base,id:'forty-recent-'+index,title:'Recent reference '+index,annotations:{notes:'Literal saved observation '+index}}));hook.navigate('exercise');let buttons=[...w.document.querySelectorAll('.exercise-evidence-gallery [data-action=photo][data-photo]')];assert.equal(buttons.length,40);assert.deepEqual(buttons.map(button=>button.dataset.photo),hook.store.workspace.evidence.map(item=>item.id));
  hook.store.workspace.evidence=hook.store.workspace.evidence.map((item,index)=>index<5?{...item,kind:'inspiration'}:item);hook.render();buttons=[...w.document.querySelectorAll('.exercise-evidence-gallery [data-action=photo][data-photo]')];assert.equal(buttons.length,35);assert.ok(buttons.every(button=>hook.store.workspace.evidence.find(item=>item.id===button.dataset.photo).kind==='recent'));assert.equal(session.network.length,0);
 }finally{await session.close()}
});

test('opening and annotating an exercise photo preserves the question node, typed response, selection and return position',async()=>{
 const session=await preview();
 try{const {w,hook}=session;hook.navigate('exercise');const main=w.document.querySelector('.exercise-main'),question=w.document.querySelector('[data-answer="silhouette.notes.1"]');question.value='My unblurred thought must remain while I inspect an outfit';question.focus();question.setSelectionRange(3,17);const photo=w.document.querySelector('.exercise-evidence-gallery [data-action=photo][data-photo]'),photoId=photo.dataset.photo,item=hook.store.workspace.evidence.find(record=>record.id===photoId);w.scrollTo(0,642);photo.focus();photo.click();await wait(()=>w.document.querySelector('.preview-modal'),'exercise photo modal');
  assert.equal(w.document.querySelector('.exercise-main'),main);assert.equal(w.document.querySelector('[data-answer="silhouette.notes.1"]'),question);assert.equal(question.value,'My unblurred thought must remain while I inspect an outfit');const form=w.document.querySelector('.annotation-form');assert.equal(form.querySelector('[name=notes]').value,item.annotations.notes);form.querySelector('[name=notes]').value='My own revised literal annotation';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));w.document.querySelector('[data-action=close-overlay]').click();
  assert.equal(w.document.querySelector('.exercise-main'),main);assert.equal(question.value,'My unblurred thought must remain while I inspect an outfit');assert.equal(question.selectionStart,3);assert.equal(question.selectionEnd,17);assert.equal(w.document.activeElement,w.document.querySelector(`.exercise-evidence-gallery [data-action=photo][data-photo="${photoId}"]`));assert.equal(w.scrollY,642);assert.equal(hook.store.workspace.evidence.find(record=>record.id===photoId).annotations.notes,'My own revised literal annotation');assert.equal(session.network.length,0);
 }finally{await session.close()}
});

test('two 12-file batches fill the 40-item library without changing existing references and a 41st file is rejected',async()=>{
 const photos=new Map(),session=await preview(null,photos);
 try{const {w,hook}=session,base=exampleWorkspace().evidence[0];hook.store.workspace.evidence=Array.from({length:16},(_,index)=>({...base,id:'existing-capacity-'+index,title:'Existing reference '+index,annotations:{notes:'Keep exact note '+index}}));const original=structuredClone(hook.store.workspace.evidence);hook.store.persist();hook.render();w.document.querySelector('[data-action=gallery]').click();const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jp1sAAAAASUVORK5CYII=','base64'));
  for(const kind of ['recent','inspiration']){w.document.querySelector(`[data-action=library-collection][data-collection=${kind}]`).click();assert.equal(w.document.querySelector('#batch-kind').value,kind);const chosen=new w.DataTransfer();for(let index=0;index<12;index++)chosen.items.add(new w.File([png],`${kind}-capacity-${index}.png`,{type:'image/png'}));const picker=w.document.querySelector('#batch-images');picker.files=chosen.files;picker.dispatchEvent(new w.Event('change',{bubbles:true}));w.document.querySelector('[data-action=upload-all]').click();await wait(()=>!hook.queue.running,kind+' capacity batch');assert.equal(hook.queue.tasks.filter(task=>task.kind===kind&&task.status==='saved').length,12);}
  assert.equal(hook.store.workspace.evidence.length,40);assert.deepEqual(hook.store.workspace.evidence.slice(0,16),original);const extra=new w.DataTransfer();extra.items.add(new w.File([png],'The forty-first.png',{type:'image/png'}));const picker=w.document.querySelector('#batch-images');picker.files=extra.files;picker.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(hook.queue.tasks.at(-1).status,'invalid');assert.ok(hook.queue.tasks.at(-1).error.includes('40 items'));assert.equal(hook.store.workspace.evidence.length,40);assert.equal(photos.size,24);hook.navigate('exercise');assert.equal(w.document.querySelectorAll('.exercise-evidence-gallery [data-action=photo][data-photo]').length,28);assert.equal(session.network.length,0);
 }finally{await session.close()}
});

test('the local viewport review exposes five widths around one iframe and keeps its resource policy offline',async()=>{
 await standalone();const html=await readFile('design-preview/review.html','utf8'),w=new Window({url:'https://isolated-preview.test/review.html',settings:{disableJavaScriptEvaluation:true,disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableIframePageLoading:true}});
 try{w.document.write(html);assert.equal(w.document.querySelectorAll('iframe').length,1);const frame=w.document.querySelector('iframe');assert.ok(frame.getAttribute('src').startsWith('index.html'));const buttons=[...w.document.querySelectorAll('[data-review-width]')];assert.deepEqual(buttons.map(button=>Number(button.dataset.reviewWidth)),[360,390,430,768,1280]);const policy=w.document.querySelector('meta[http-equiv="Content-Security-Policy"]').content;assert.ok(policy.includes("connect-src 'none'"));assert.ok(policy.includes('frame-src'));assert.equal(w.document.querySelectorAll('script[src],link[rel=stylesheet]').length,0);const scripts=[...w.document.querySelectorAll('script')].map(script=>script.textContent);w.happyDOM.settings.disableJavaScriptEvaluation=false;for(const script of scripts)w.eval(script);for(const button of buttons){button.click();assert.equal(w.document.querySelector('iframe'),frame,'Changing width must keep the same preview session');assert.ok(frame.style.width.includes(button.dataset.reviewWidth)||frame.parentElement.style.width.includes(button.dataset.reviewWidth),'Selected width must be applied explicitly')}
 }finally{await w.close()}
});


test('provenance distinguishes inherited, selected, written, edited, confirmed and optional draft wording',async()=>{
 const sample=exampleWorkspace().state;assert.equal(answerProvenance('identity',sample).kind,'inherited');assert.equal(answerProvenance('p12.choices1',sample).kind,'selected');assert.equal(answerProvenance('silhouette.notes.1',sample).kind,'written');assert.equal(answerProvenance('style.brief',sample).kind,'confirmed');assert.equal(answerProvenance('summary.pending.rules',sample).kind,'draft');
 const session=await preview();
 try{const {w,hook}=session;hook.navigate('blueprint');w.document.querySelector('[data-action=edit-field][data-id=identity]').click();let label=w.document.querySelector('.reference-editor [data-provenance-id="identity"]');assert.equal(label.dataset.provenanceKind,'inherited');const editor=w.document.querySelector('.reference-editor [data-answer=identity]');editor.focus();editor.value='My own edited final wording';editor.dispatchEvent(new w.Event('input',{bubbles:true}));label=w.document.querySelector('.reference-editor [data-provenance-id="identity"]');assert.equal(label.dataset.provenanceKind,'edited');assert.ok(label.textContent.includes('Deliberately edited'));assert.equal(w.document.activeElement,editor,'Updating provenance must not replace the active response control');w.document.querySelector('[data-action=close-editor]').click();hook.store.patch({confirmFields:[{id:'identity',sourceIds:['style.statement']}]});hook.render();assert.equal(answerProvenance('identity',hook.store.workspace.state).kind,'confirmed');hook.store.patch({answers:{'style.statement':'A changed earlier statement'}});hook.render();assert.equal(resolveValue('identity',hook.store.workspace.state.answers,new Set(),hook.store.workspace.state.bindingState),'My own edited final wording');const finalLabel=w.document.querySelector('[data-provenance-id="identity"]');assert.equal(finalLabel.dataset.provenanceKind,'confirmed');assert.ok(finalLabel.textContent.includes('confirmed wording is kept for review'));assert.equal(session.network.length,0);
 }finally{await session.close()}
});


test('an earlier-source dialog above a Blueprint editor owns focus and returns to the same editor',async()=>{
 const session=await preview();
 try{const {w,hook}=session;hook.navigate('blueprint');w.document.querySelector('[data-action=edit-field][data-id=identity]').click();const editor=w.document.querySelector('.reference-editor'),details=editor.querySelector('.provenance-sources');assert.ok(details);details.open=true;const source=details.querySelector('a[href^="#/source/"]');assert.ok(source);source.focus();source.click();await wait(()=>w.document.querySelector('#preview-overlay-root .preview-modal'),'nested source dialog');const dialog=w.document.querySelector('#preview-overlay-root .preview-modal');assert.equal(w.document.querySelector('.reference-editor'),editor);assert.ok([...function*(){for(let node=editor;node;node=node.parentElement)yield node}()].some(node=>node.inert),'The lower editor must be inert while its source dialog is active');assert.equal(w.document.activeElement,dialog);
  const closeButtons=[...dialog.querySelectorAll('[data-action=close-overlay]')],first=closeButtons[0],last=closeButtons.at(-1);assert.notEqual(first,last);first.focus();const backwards=new w.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true});first.dispatchEvent(backwards);assert.equal(backwards.defaultPrevented,true);assert.equal(w.document.activeElement,last,'Shift-Tab stays in the topmost dialog');const forwards=new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true});last.dispatchEvent(forwards);assert.equal(forwards.defaultPrevented,true);assert.equal(w.document.activeElement,first,'Tab stays in the topmost dialog');first.click();assert.equal(w.document.querySelector('.preview-modal'),null);assert.equal(w.document.querySelector('.reference-editor'),editor);assert.equal(w.document.activeElement,source);assert.ok(![...function*(){for(let node=editor;node;node=node.parentElement)yield node}()].some(node=>node.inert),'Closing the upper dialog reactivates its editor');const escape=new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});source.dispatchEvent(escape);assert.equal(w.document.querySelector('.reference-editor'),null);assert.equal(hook.getView(),'blueprint');assert.equal(session.network.length,0);
 }finally{await session.close()}
});


test('exercise plans preserve approved control order and do not force silhouette stages onto other exercises',()=>{
 const step12=exercisePlan(workbook.pages[11]);assert.deepEqual(step12.map(stage=>stage.id),['choose','reflect','lookfor','record']);assert.deepEqual(step12.flatMap(stage=>stage.controlIds),['p12.choices1','silhouette.notes.1','silhouette.notes.2','p12.choices2','silhouette.notes.3','silhouette.notes.4','silhouette.notes.5']);assert.ok(step12.find(stage=>stage.id==='record').controlIds.includes('silhouette.notes.5'));assert.ok(!step12.find(stage=>stage.id==='reflect').controlIds.includes('silhouette.notes.5'));assert.deepEqual([...new Set(step12.flatMap(stage=>stage.controlIds))].sort(),workbook.pages[11].controls.map(control=>control.id).sort());
 const step8=exercisePlan(workbook.pages[7]);assert.deepEqual(step8.map(stage=>stage.id),['look','choose','reflect','record']);assert.deepEqual([...new Set(step8.flatMap(stage=>stage.controlIds))].sort(),workbook.pages[7].controls.map(control=>control.id).sort());
 for(const page of [workbook.pages[2],workbook.pages[36]]){const plan=exercisePlan(page);assert.equal(plan.length,1,'An unrepresented exercise uses its own content block');assert.deepEqual(plan.flatMap(stage=>stage.controlIds),page.controls.map(control=>control.id));assert.ok(!['lookfor','reflect','choose'].includes(plan[0].id),'Do not invent the comparison exercise stages for another page')}
});


test('photo management and exercise evidence expose the relevant collections separately without mixing records',async()=>{
 const data=[{id:'recent-source-1',kind:'recent',title:'Existing recent one',asset:'look-01',annotations:{notes:'My exact recent observation'}},{id:'recent-source-2',kind:'recent',title:'Existing recent two',asset:'look-02',annotations:{notes:'My second recent observation'}},{id:'inspiration-source-1',kind:'inspiration',title:'Existing inspiration one',asset:'look-03',annotations:{notes:'My exact inspiration observation'}},{id:'inspiration-source-2',kind:'inspiration',title:'Existing inspiration two',asset:'look-01',annotations:{notes:'My second inspiration observation'}}];
 assert.deepEqual(evidenceCollections(12),['recent']);assert.deepEqual(new Set(evidenceCollections(23)),new Set(['recent','inspiration']));assert.deepEqual(relevantEvidence(data,12).map(item=>item.id),data.filter(item=>item.kind==='recent').map(item=>item.id));for(const kind of evidenceCollections(23))assert.ok(relevantEvidence(data,23,kind).every(item=>item.kind===kind));assert.ok(relevantEvidence(data,23).every(item=>item.kind===evidenceCollections(23)[0]));assert.deepEqual(relevantEvidence(data,3),[]);
 const session=await preview();
 try{const {w,hook}=session;hook.store.workspace.evidence=structuredClone(data);hook.store.persist();hook.navigate('exercise');const answers=JSON.stringify(hook.store.workspace.state.answers);assert.equal(w.document.querySelectorAll('.exercise-evidence-gallery [data-evidence-card]').length,2);assert.ok([...w.document.querySelectorAll('.exercise-evidence-gallery [data-evidence-card]')].every(card=>card.dataset.evidenceCard.startsWith('recent-')));w.document.querySelector('[data-action=gallery]').click();for(const kind of ['recent','inspiration']){w.document.querySelector(`[data-action=library-collection][data-collection=${kind}]`).click();const library=w.document.querySelector('.preview-photo-library');assert.equal(library.dataset.libraryCollection,kind);assert.equal(w.document.querySelector('#batch-kind').value,kind);assert.deepEqual([...library.querySelectorAll('[data-action=photo]')].map(button=>button.dataset.photo),data.filter(item=>item.kind===kind).map(item=>item.id));}
  w.document.querySelector('.preview-modal .modal-top [data-action=close-overlay]').click();w.location.hash='#/source/23';await wait(()=>w.document.querySelector('.preview-modal [data-evidence-step="23"]'),'source evidence access');for(const kind of evidenceCollections(23)){w.document.querySelector(`[data-action=evidence-collection][data-step="23"][data-collection=${kind}]`).click();const gallery=w.document.querySelector('.preview-modal [data-evidence-step="23"]');assert.equal(gallery.dataset.evidenceCollection,kind);assert.deepEqual([...gallery.querySelectorAll('[data-evidence-card]')].map(card=>card.dataset.evidenceCard),data.filter(item=>item.kind===kind).map(item=>item.id));}
  assert.equal(JSON.stringify(hook.store.workspace.state.answers),answers);assert.deepEqual(hook.store.workspace.evidence,data);assert.equal(session.network.length,0);
 }finally{await session.close()}
});

test('the separate static phone package contains only the synthetic offline preview and rejects the production Site identity',async()=>{
 await standalone();const folder=await mkdtemp('/tmp/ihf-static-phone-review-');
 try{const result=JSON.parse(execFileSync(process.execPath,['scripts/design/prepare-phone.mjs',folder],{encoding:'utf8',maxBuffer:1024*1024}));assert.equal(result.staticOnly,true);assert.deepEqual(result.files,['index.html','review.html','DESIGN-COMPARISON.md','LICENSES.txt']);const manifest=JSON.parse(await readFile(folder+'/.openai/hosting.json','utf8')),production=JSON.parse(await readFile('.openai/hosting.json','utf8'));assert.deepEqual(manifest.static,{directory:'dist'});assert.equal(manifest.d1,null);assert.equal(manifest.r2,null);assert.equal(manifest.project_id,undefined);const trace=JSON.parse(await readFile(folder+'/PREVIEW-SOURCE.json','utf8'));assert.equal(trace.staticOnly,true);assert.equal(trace.customerDatabase,false);assert.equal(trace.customerObjectStorage,false);for(const name of result.files){const original=await readFile('design-preview/'+name),copy=await readFile(folder+'/dist/'+name);assert.deepEqual(copy,original);assert.equal(createHash('sha256').update(copy).digest('hex'),trace.files[name]);}
  const html=await readFile(folder+'/dist/index.html','utf8');assert.ok(!html.includes(production.project_id));assert.ok(html.includes("connect-src 'none'"));assert.ok(html.includes('Sample customer answers'));assert.ok(html.includes(PREVIEW_STORAGE));await writeFile(folder+'/.openai/hosting.json',JSON.stringify({project_id:production.project_id,static:{directory:'dist'}}));assert.throws(()=>execFileSync(process.execPath,['scripts/design/prepare-phone.mjs',folder],{stdio:'pipe'}),/Command failed/,'The packaging helper must refuse the existing production Site');assert.equal(JSON.parse(await readFile('.openai/hosting.json','utf8')).project_id,production.project_id);
 }finally{await rm(folder,{recursive:true,force:true})}
});
