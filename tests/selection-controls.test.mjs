import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import {Miniflare} from 'miniflare';
import {PDFDocument} from 'pdf-lib';
import {workbook,controls,emptyState,validateValue,selectionRestorePatch,confirmedChanges} from '../server/model.mjs';
import {ProgressStore} from '../client/store.mjs';
import {RecoveryVault} from '../client/recovery.mjs';
import {blueprintSections} from '../server/blueprint.mjs';

// These identities, databases and buckets exist only in this in-memory runtime.
// The trusted-gateway test header never leaves Miniflare; no live account is used.
const repo=fileURLToPath(new URL('..',import.meta.url));
const origin='https://selection-controls.test';let mf,db,clientScript;
const exclusive=[
 {id:'p26.choices1',page:26,reference:27},
 {id:'p38.choices1',page:38,reference:39},
 {id:'p45.choices1',page:45,reference:null},
 {id:'p49.choices1',page:49,reference:50},
 {id:'p52.choices1',page:52,reference:53},
 {id:'p52.choices2',page:52,reference:53}
];
const multiIds=['p6.choices1','p9.choices1','p9.choices2','p12.choices1','p12.choices2','p14.choices1','p14.choices2','p14.choices3','p14.choices4','p16.choices1','p19.choices1','p19.choices2','p23.choices1','p23.choices2','p23.choices3','p23.choices4','p23.choices5','p26.choices2','colour.practical','p31.choices1','p31.choices2','p31.choices3','p31.choices4','p31.choices5','p36.choices1','p40.choices1','p40.choices2','p40.choices3','p40.choices4','p42.choices1','colour.result'];
const ambiguousIds=['colour.practical','colour.result','p19.choices2','p26.choices2','p40.choices3','p40.choices4'];
const pageFor=id=>workbook.pages.find(page=>page.controls.some(control=>control.id===id)).page;
const legacySelections=()=>Object.fromEntries(exclusive.map(({id})=>[id,controls.get(id).options.slice(0,2)]));
async function api(owner,path,method='GET',body){return mf.dispatchFetch(origin+path,{method,headers:{'oai-authenticated-user-id':owner,'X-IHF-Selection-Protocol':'2',...(body===undefined?{}:{Origin:origin,'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});}
async function progress(owner){const response=await api(owner,'/api/progress');assert.equal(response.status,200);return response.json();}
async function patch(owner,body){const response=await api(owner,'/api/progress','PATCH',body);assert.equal(response.status,200,await response.clone().text());return response.json();}
async function wait(check,label='selection interaction'){for(let i=0;i<700;i++){if(await check())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('Timed out: '+label);}
async function open(owner,page=1){
 const w=new Window({url:origin+'/#/step/'+page,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}}),downloads=[],calls=[],alerts=[];
 w.document.body.innerHTML='<div id="app"></div><div id="announcements" aria-live="polite"></div>';
 Object.defineProperty(w,'crypto',{value:globalThis.crypto});w.structuredClone=structuredClone;w.scrollTo=()=>{};w.confirm=()=>true;w.alert=message=>alerts.push(String(message));
 w.URL.createObjectURL=blob=>{downloads.push(blob);return 'blob:selection-test'};w.URL.revokeObjectURL=()=>{};
 const click=w.HTMLAnchorElement.prototype.click;w.HTMLAnchorElement.prototype.click=function(){if(!this.hasAttribute('download'))return click.call(this);};
 w.fetch=(url,init={})=>{const path=new URL(url,origin).pathname+new URL(url,origin).search;calls.push({path,method:init.method||'GET',body:init.body?JSON.parse(init.body):undefined});return api(owner,path,init.method||'GET',init.body?JSON.parse(init.body):undefined);};
 w.eval(clientScript);await wait(()=>w.document.querySelector('.step-topline')?.textContent.includes('Step '+String(page).padStart(2,'0')+' /'),'authenticated step '+page);
 return {w,downloads,calls,alerts,close:async()=>{w.happyDOM.abort();await w.close();}};
}
async function go(w,page){w.location.hash=typeof page==='number'?'#/step/'+page:page;await wait(()=>typeof page==='number'?w.document.querySelector('.step-topline')?.textContent.includes('Step '+String(page).padStart(2,'0')+' /'):!!w.document.querySelector('.blueprint-main'),'navigate '+page);}
async function save(w){w.document.querySelector('[data-action=save]')?.click();await wait(()=>w.document.querySelector('#save-status')?.dataset.status==='saved','saved progress');}
async function inputs(w,id){
 let found=[...w.document.querySelectorAll('[data-id][data-option]')].filter(input=>input.dataset.id===id);
 if(!found.length){const edit=[...w.document.querySelectorAll('[data-action=edit-blueprint]')].find(button=>button.dataset.field===id);assert.ok(edit,'A current response or explicit editor must exist for '+id);edit.click();await wait(()=>w.document.querySelector('#editorial-overlay-root [role=dialog]'),'focused response editor');found=[...w.document.querySelectorAll('[data-id][data-option]')].filter(input=>input.dataset.id===id);}
 assert.equal(found.length,controls.get(id).options.length,'Every approved option remains available for '+id);return found;
}
async function finishEditor(w){const done=w.document.querySelector('#editorial-overlay-root [data-action=finish-blueprint-edit]');if(done){done.click();await wait(()=>!w.document.querySelector('#editorial-overlay-root [role=dialog]'),'finish response editor');}await save(w);}
const checked=elements=>elements.filter(input=>input.checked).map(input=>input.dataset.option);
async function seedLegacy(owner,answers=legacySelections()){
 const now='2026-01-01T00:00:00.000Z',state={...emptyState(),answers,revision:7,lastStep:26,completed:[10,20],status:'IN_PROGRESS'};
 await db.prepare('INSERT INTO progress (owner_id,document,revision,updated_at,assessment_id,created_at,status) VALUES (?,?,?,?,?,?,?)').bind(owner,JSON.stringify(state),7,now,'synthetic-'+owner,now,'IN_PROGRESS').run();return state;
}
before(async()=>{
 const worker=await build({absWorkingDir:repo,entryPoints:['server/worker.mjs'],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
 mf=new Miniflare({modules:true,script:worker.outputFiles[0].text,compatibilityDate:'2025-11-01',d1Databases:['DB'],r2Buckets:['BUCKET']});({DB:db}=await mf.getBindings());
 for(const {tag}of JSON.parse(await readFile(repo+'/drizzle/meta/_journal.json','utf8')).entries)await db.exec(await readFile(repo+'/drizzle/'+tag+'.sql','utf8'));
 clientScript=(await build({absWorkingDir:repo,entryPoints:['client/app.mjs'],bundle:true,write:false,format:'iife',target:'es2022',loader:{'.css':'empty'}})).outputFiles[0].text;
});
after(async()=>mf?.dispose());

test('selection metadata changes only the six approved cardinalities and preserves every original question and option',()=>{
 const checks=workbook.pages.flatMap(page=>page.controls.filter(control=>control.type==='checks'));
 assert.deepEqual(checks.filter(control=>control.selectionMode==='single').map(control=>control.id),exclusive.map(({id})=>id));
 assert.deepEqual(checks.filter(control=>control.selectionMode!=='single'&&control.id!=='p23.choices6').map(control=>control.id),multiIds);
 assert.equal(createHash('sha256').update(JSON.stringify(checks.map(control=>({id:control.id,question:control.label,options:control.options})))).digest('hex'),'539f52a83a2d3c8c0e373768b050f44b0a4abc386ebf01954d46f915c7c4f54e');
 for(const id of ambiguousIds)assert.notEqual(controls.get(id).selectionMode,'single',id+' remains unresolved multi-select');
 assert.deepEqual(controls.get('p52.choices2').options,['Sometimes','Not really'],'No unapproved Yes option is invented');
});

for(const {id,page,reference}of exclusive)test(id+' replaces A with B immediately, saves one array value, resumes, and updates contextual references',async()=>{
 const owner='single-'+id.replaceAll('.','-');let session=await open(owner,page);
 try{
  let elements=await inputs(session.w,id);assert.ok(elements.every(input=>input.type==='radio'));assert.equal(new Set(elements.map(input=>input.name)).size,1);
  const [a,b]=controls.get(id).options;elements[0].click();assert.deepEqual(checked(elements),[a]);elements[1].click();assert.deepEqual(checked(elements),[b]);await save(session.w);
  assert.deepEqual((await progress(owner)).answers[id],[b]);await session.close();session=await open(owner,page);elements=await inputs(session.w,id);assert.deepEqual(checked(elements),[b]);
  if(reference){
   await go(session.w,reference);let record=session.w.document.querySelector(`[data-reference-id="${id}"]`);assert.ok(record);assert.equal(record.querySelector('.recorded-answer').textContent,b);
   const link=record.querySelector('a.edit-discovery');assert.ok(link.getAttribute('href').includes('return='));link.click();await wait(()=>session.w.document.querySelector('.step-topline')?.textContent.includes('Step '+page+' /'),'edit earlier selection');
   elements=await inputs(session.w,id);elements[0].click();await save(session.w);const back=session.w.document.querySelector('[data-action=return-exercise]');assert.ok(back,'Editing a reference preserves the return route');back.click();await wait(()=>session.w.location.hash==='#/step/'+reference,'return to current exercise');
   record=session.w.document.querySelector(`[data-reference-id="${id}"]`);assert.equal(record.querySelector('.recorded-answer').textContent,a);assert.deepEqual((await progress(owner)).answers[id],[a]);
  }
  assert.deepEqual(session.alerts,[]);
 }finally{await session.close();}
});

test('all 31 retained multi-select groups, including the six ambiguous groups, still save and reopen A plus B',async()=>{
 const owner='all-approved-multi';let session=await open(owner,6);
 try{
  for(const id of multiIds){await go(session.w,pageFor(id));const elements=await inputs(session.w,id);assert.ok(elements.every(input=>input.type==='checkbox'),id+' stays multiple');elements[0].click();elements[1].click();assert.deepEqual(checked(elements),controls.get(id).options.slice(0,2),id);await finishEditor(session.w);}
  const saved=await progress(owner);for(const id of multiIds)assert.deepEqual(saved.answers[id],controls.get(id).options.slice(0,2),id+' persisted');await session.close();session=await open(owner,6);
  for(const id of multiIds){await go(session.w,pageFor(id));assert.deepEqual(checked(await inputs(session.w,id)),controls.get(id).options.slice(0,2),id+' resumed');await finishEditor(session.w);}
  assert.deepEqual(session.alerts,[]);
 }finally{await session.close();}
});

test('the API rejects new conflicting or duplicate selections but accepts intentional empty and one-answer arrays',async()=>{
 for(const {id}of exclusive){
  const owner='strict-'+id.replaceAll('.','-'),[a,b]=controls.get(id).options;
  for(const value of [[a,b],[a,a]]){assert.equal(validateValue(controls.get(id),value),false);assert.equal((await api(owner,'/api/progress','PATCH',{baseRevision:0,answers:{[id]:value}})).status,400);assert.deepEqual((await progress(owner)).answers,{});}
  let saved=await patch(owner,{baseRevision:0,answers:{[id]:[b]}});saved=await patch(owner,{baseRevision:saved.revision,answers:{[id]:[]}});assert.deepEqual(saved.answers[id],[]);
 }
 const id='p36.choices1',a=controls.get(id).options[0];assert.equal(validateValue(controls.get(id),[a,a]),false);assert.equal((await api('duplicate-multi','/api/progress','PATCH',{baseRevision:0,answers:{[id]:[a,a]}})).status,400);
});

test('restore compatibility markers are minimal and cannot authorize unknown, redundant or malformed answers',async()=>{
 const single='p26.choices1',other='p38.choices1',multi='p36.choices1',a=controls.get(multi).options[0];
 const original={answers:{[single]:controls.get(single).options.slice(0,2),[other]:[controls.get(other).options[0]],[multi]:[a,a]}},snapshot=structuredClone(original),restored=selectionRestorePatch(original);
 assert.deepEqual(original,snapshot,'Preparing a restore must not mutate the backup');assert.notEqual(restored,original);assert.deepEqual(restored.restoreSelectionConflicts,[single,multi]);
 for(const id of [single,multi]){assert.equal(validateValue(controls.get(id),original.answers[id]),false);assert.equal(validateValue(controls.get(id),original.answers[id],{allowLegacySelections:true}),true);}
 const saved=await patch('explicit-restoration-marker',{...restored,baseRevision:0});assert.deepEqual(saved.answers,original.answers);
 const strict=selectionRestorePatch({answers:{[other]:[controls.get(other).options[0]]},restoreSelectionConflicts:[other]});assert.equal(Object.hasOwn(strict,'restoreSelectionConflicts'),false,'A valid normal response needs no restore exemption');
 const invalid=[null,single,[single,single],['unknown.field'],[other],['fit.pattern']];
 for(const [n,markers]of invalid.entries()){const owner='invalid-restoration-marker-'+n,response=await api(owner,'/api/progress','PATCH',{baseRevision:0,answers:original.answers,restoreSelectionConflicts:markers});assert.equal(response.status,400,'Invalid restoration marker '+JSON.stringify(markers));assert.deepEqual((await progress(owner)).answers,{});}
 assert.equal((await api('invalid-restored-option','/api/progress','PATCH',{baseRevision:0,answers:{[single]:['Unapproved option']},restoreSelectionConflicts:[single]})).status,400,'Restoration never permits options absent from the source');
});

test('existing conflicting arrays remain literal through unrelated saves and resolve only after an explicit choice or clear',async()=>{
 const owner='existing-selection-conflicts',original=legacySelections();await seedLegacy(owner,original);const session=await open(owner,26);
 try{
  await go(session.w,10);const note=session.w.document.querySelector('[data-id="fit.pattern"]');note.value='My unrelated fit observation';note.dispatchEvent(new session.w.Event('input',{bubbles:true}));await save(session.w);
  let saved=await progress(owner);for(const {id}of exclusive)assert.deepEqual(saved.answers[id],original[id]);assert.deepEqual(saved.completed,[10,20]);
  for(const {id,page}of exclusive){
   await go(session.w,page);const elements=await inputs(session.w,id),panel=session.w.document.querySelector(`[data-selection-conflict="${id}"]`);assert.ok(panel,'Older conflicting answers are visible for '+id);for(const answer of original[id])assert.ok(panel.textContent.includes(answer));assert.deepEqual(checked(elements),[],'The app must not pick a prior answer for the customer');
   elements[1].click();assert.deepEqual(checked(elements),[original[id][1]]);assert.equal(session.w.document.querySelector(`[data-selection-conflict="${id}"]`),null);await save(session.w);saved=await progress(owner);assert.deepEqual(saved.answers[id],[original[id][1]]);
  }
  const {id,page}=exclusive[0];await go(session.w,page);const clear=session.w.document.querySelector(`[data-action=clear-selection][data-id="${id}"]`);assert.ok(clear);clear.click();assert.deepEqual(checked(await inputs(session.w,id)),[]);await save(session.w);assert.deepEqual((await progress(owner)).answers[id],[]);assert.deepEqual(session.alerts,[]);
 }finally{await session.close();}
});

test('an explicitly confirmed answer-backup restore retains legacy conflicts and duplicate arrays until customer review',async()=>{
 const original=legacySelections(),multi='p36.choices1',a=controls.get(multi).options[0];original[multi]=[a,a];await seedLegacy('legacy-backup-source',original);
 const exported=await(await api('legacy-backup-source','/api/export')).json(),session=await open('restored-legacy-backup',68);
 try{
  await go(session.w,'#/blueprint');const picker=session.w.document.querySelector('#backup-import');assert.ok(picker);const files=new session.w.DataTransfer();files.items.add(new session.w.File([JSON.stringify(exported)],'synthetic-legacy-backup.json',{type:'application/json'}));picker.files=files.files;picker.dispatchEvent(new session.w.Event('change',{bubbles:true}));
  await wait(async()=>Object.hasOwn((await progress('restored-legacy-backup')).answers,'p26.choices1'),'restore legacy backup');const restored=await progress('restored-legacy-backup');for(const [id,value]of Object.entries(original))assert.deepEqual(restored.answers[id],value);assert.deepEqual(restored.completed,[10,20]);
  const requests=session.calls.filter(call=>call.method==='PATCH');assert.ok(requests.some(call=>exclusive.every(({id})=>call.body.restoreSelectionConflicts?.includes(id))&&call.body.restoreSelectionConflicts.includes(multi)),'Only an explicit restoration carries compatibility markers');
  await go(session.w,38);assert.ok(session.w.document.querySelector('[data-selection-conflict="p38.choices1"]'));assert.deepEqual(checked(await inputs(session.w,'p38.choices1')),[]);assert.deepEqual(session.alerts,[]);
 }finally{await session.close();}
});

class MemoryStorage{constructor(){this.values=new Map();}getItem(key){return this.values.get(key)??null;}setItem(key,value){this.values.set(key,value);}removeItem(key){this.values.delete(key);}}
test('old encrypted recovery preserves conflicting arrays, revision choice and later explicit selection on retry',async()=>{
 const previousFetch=globalThis.fetch,storage=new MemoryStorage(),descriptor={name:'synthetic-selection-recovery',secret:'a7'.repeat(32)},initial=emptyState(),first=new ProgressStore(),resumed=new ProgressStore(),again=new ProgressStore();
 try{
  const oldPatch={answers:legacySelections()};await new RecoveryVault(storage,descriptor).save({v:3,baseRevision:0,patch:oldPatch});await first.hydrate(initial,descriptor,storage);assert.equal(first.recovered,true);for(const [id,value]of Object.entries(oldPatch.answers))assert.deepEqual(first.get(id),value);assert.deepEqual(first.pending.restoreSelectionConflicts,exclusive.map(({id})=>id));
  first.change('fit.pattern','Unrelated recovered observation');globalThis.fetch=async()=>{throw Error('Synthetic offline');};assert.equal(await first.flush(),false);await first.persistRecovery();assert.ok(![...storage.values.values()].join('').includes('Unrelated recovered observation'));
  const newer={...emptyState(),revision:1,answers:{'silhouette.notes.3':'A newer unrelated answer'}};await resumed.hydrate(newer,descriptor,storage);assert.ok(resumed.conflict);await resumed.persistRecovery();await again.hydrate(newer,descriptor,storage);assert.ok(again.conflict,'Persisting a stale recovery record must not make it look current');
  const id=exclusive[0].id,b=controls.get(id).options[1];again.change(id,[b]);assert.ok(!again.pending.restoreSelectionConflicts.includes(id),'An explicit replacement removes only its old compatibility marker');for(const {id:other}of exclusive.slice(1))assert.ok(again.pending.restoreSelectionConflicts.includes(other));
  let server={...newer};globalThis.fetch=async(_url,init)=>{const body=JSON.parse(init.body);const response=await api('recovered-selection-owner','/api/progress','PATCH',body);if(response.ok)server=await response.clone().json();return response;};
  await patch('recovered-selection-owner',{baseRevision:0,answers:newer.answers});assert.equal(await again.keepMine(),true);assert.deepEqual(server.answers[id],[b]);for(const {id:other}of exclusive.slice(1))assert.deepEqual(server.answers[other],oldPatch.answers[other]);assert.equal(server.answers['silhouette.notes.3'],'A newer unrelated answer');assert.equal(storage.values.size,0);
 }finally{for(const store of [first,resumed,again])clearTimeout(store.timer);globalThis.fetch=previousFetch;}
});

test('a failed in-flight legacy restore cannot resurrect conflicting answers after a later deliberate selection',async()=>{
 const previousFetch=globalThis.fetch,storage=new MemoryStorage(),descriptor={name:'synthetic-selection-race',secret:'b8'.repeat(32)},initial=emptyState(),first=new ProgressStore(),recovered=new ProgressStore();
 const id='p26.choices1',other='p38.choices1',legacy={[id]:controls.get(id).options.slice(0,2),[other]:controls.get(other).options.slice(0,2)},b=controls.get(id).options[1];let rejectRequest;const sent=[];
 globalThis.fetch=async(_url,init)=>{sent.push(JSON.parse(init.body));return new Promise((_resolve,reject)=>rejectRequest=reject);};
 try{
  await first.hydrate(initial,descriptor,storage);first.stage(selectionRestorePatch({answers:legacy}));const saving=first.flush();await wait(()=>sent.length===1,'first restoration request');assert.deepEqual(sent[0].restoreSelectionConflicts,[id,other]);
  first.change(id,[b]);rejectRequest(Error('Synthetic lost restoration response'));assert.equal(await saving,false);await first.persistRecovery();assert.deepEqual(first.pending.answers[id],[b]);assert.deepEqual(first.pending.answers[other],legacy[other]);assert.deepEqual(first.pending.restoreSelectionConflicts,[other]);
  await recovered.hydrate(initial,descriptor,storage);assert.equal(recovered.recovered,true);assert.deepEqual(recovered.get(id),[b]);assert.deepEqual(recovered.get(other),legacy[other]);assert.deepEqual(recovered.pending.restoreSelectionConflicts,[other]);
  globalThis.fetch=(_url,init)=>api('selection-restore-race','/api/progress','PATCH',JSON.parse(init.body));assert.equal(await first.flush(),true);const saved=await progress('selection-restore-race');assert.deepEqual(saved.answers[id],[b]);assert.deepEqual(saved.answers[other],legacy[other]);assert.equal(storage.values.size,0);
 }finally{rejectRequest?.(Error('Test cleanup'));for(const store of [first,recovered])clearTimeout(store.timer);globalThis.fetch=previousFetch;}
});

test('correcting selections preserves final overrides, confirmed wording and real Master/One-Glance PDF exports',async()=>{
 const owner='selection-final-compatibility',answers={...Object.fromEntries(exclusive.map(({id})=>[id,[controls.get(id).options[0]]])),'qualities.core':['Ease','Contrast','Intention'],'style.brief':'My confirmed exact wording',identity:'My deliberately edited identity','glance.style':'My concise confirmed summary','body.fit':'Room to move','style.language':{'Fit::My preference':'My deliberate fit wording'},'colour.result':controls.get('colour.result').options.slice(0,2)};
 const initial=await patch(owner,{baseRevision:0,answers,confirmFields:[{id:'style.brief',sourceIds:['qualities.core']},{id:'glance.style',sourceIds:['qualities.core']}]});const expectedSections=blueprintSections(initial.answers,{bindingState:initial.bindingState});const session=await open(owner,26);
 try{
  for(const {id,page}of exclusive){await go(session.w,page);(await inputs(session.w,id))[1].click();await save(session.w);}
  const saved=await progress(owner);for(const id of ['style.brief','identity','glance.style','style.language','colour.result'])assert.deepEqual(saved.answers[id],initial.answers[id]);for(const id of ['style.brief','glance.style'])assert.deepEqual(saved.bindingState[id],initial.bindingState[id]);assert.deepEqual(blueprintSections(saved.answers,{bindingState:saved.bindingState}),expectedSections);
  await go(session.w,'#/blueprint');assert.ok(session.w.document.querySelector('[data-result-id=identity]').textContent.includes(answers.identity));assert.ok(session.w.document.querySelector('[data-result-id="glance.style"]').textContent.includes(answers['glance.style']));
  for(const [action,onePage]of [['pdf',false],['pdf-glance',true]]){const count=session.downloads.length;session.w.document.querySelector(`[data-action="${action}"]`).click();await wait(()=>session.downloads.length>count,'direct '+action+' download');const blob=session.downloads[count];assert.equal(blob.type,'application/pdf');const document=await PDFDocument.load(await blob.arrayBuffer());assert.ok(document.getPageCount()>=1);if(onePage)assert.equal(document.getPageCount(),1);}
  const edited=await patch(owner,{baseRevision:(await progress(owner)).revision,answers:{'qualities.core':['Freedom','Contrast','Intention']}});assert.equal(confirmedChanges('style.brief',edited.answers,edited.bindingState).changed,true);assert.equal(edited.answers['style.brief'],answers['style.brief']);assert.equal(edited.answers['glance.style'],answers['glance.style']);assert.equal(edited.answers.identity,answers.identity);assert.deepEqual(session.alerts,[]);
 }finally{await session.close();}
});
