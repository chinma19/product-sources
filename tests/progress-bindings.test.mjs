import test from 'node:test';
import assert from 'node:assert/strict';
import {ProgressStore} from '../client/store.mjs';
import {emptyState,migrateState,applyPatch,bindingInfo,confirmedChanges} from '../server/model.mjs';

class MemoryStorage {
 constructor(){this.data=new Map()}
 getItem(key){return this.data.get(key)??null}
 setItem(key,value){this.data.set(key,value)}
 removeItem(key){this.data.delete(key)}
}
const descriptor=name=>({name:'binding-recovery-'+name,secret:'ab'.repeat(32)});
const cleanup=(...stores)=>stores.forEach(store=>clearTimeout(store?.timer));
const wait=async check=>{for(let i=0;i<200;i++){if(check())return;await new Promise(resolve=>setTimeout(resolve,5))}throw Error('Timed out waiting for mocked save')};
function memoryServer(initial){
 let state=migrateState(initial);const calls=[];
 return {get state(){return structuredClone(state)},calls,fetch:async(_url,init)=>{const patch=JSON.parse(init.body);calls.push(patch);assert.equal(patch.baseRevision,state.revision);state={...applyPatch(state,patch),revision:state.revision+1,updatedAt:new Date().toISOString()};return Response.json(state)}};
}

test('binding and confirmation metadata save and resume without silently rewriting confirmed wording',async()=>{
 const oldFetch=globalThis.fetch,storage=new MemoryStorage(),initial={...emptyState(),answers:{'style.brief':'My original brief'}};
 const server=memoryServer(initial);globalThis.fetch=server.fetch;const first=new ProgressStore(),resumed=new ProgressStore();
 try{await first.hydrate(initial,descriptor('confirmed'),storage);first.change('identity','My deliberate final identity');first.confirm('identity',['style.statement']);assert.equal(await first.flush(),true);assert.equal(storage.data.size,0);
  await resumed.hydrate(server.state,descriptor('confirmed'),storage);assert.equal(resumed.get('identity'),'My deliberate final identity');assert.ok(resumed.state.bindingState.identity.sourceSnapshot);assert.equal(confirmedChanges('identity',resumed.state.answers,resumed.state.bindingState).changed,false);
  resumed.change('style.brief','My newer source wording');assert.equal(resumed.get('identity'),'My deliberate final identity');assert.equal(confirmedChanges('identity',resumed.state.answers,resumed.state.bindingState).changed,true);assert.equal(await resumed.flush(),true);assert.equal(server.state.answers.identity,'My deliberate final identity');assert.equal(server.state.bindingState.identity.sourceSnapshot['style.statement'],'My original brief');
 }finally{cleanup(first,resumed);globalThis.fetch=oldFetch}
});

test('legacy review preserves stored values and explicit relinking survives save/resume and later upstream edits',async()=>{
 const previous=globalThis.fetch,storage=new MemoryStorage(),initial={schemaVersion:2,revision:5,completed:[10,20],lastStep:60,answers:{identity:'My older final identity','style.statement':'My earlier statement','fit.pattern':'Original fit','silhouette.notes.3':'Original silhouette','style.language':{'Fit::My preference':'Ambiguous old fit','Silhouette::My preference':'My intentional old silhouette'}}};
 const server=memoryServer(initial);globalThis.fetch=server.fetch;const first=new ProgressStore(),resumed=new ProgressStore();
 try{await first.hydrate(initial,descriptor('legacy'),storage);assert.equal(bindingInfo('style.language',first.state.answers,first.state.bindingState).legacy,true);first.review('style.language');first.linkCell('style.language','Fit::My preference');first.link('identity');assert.equal(first.get('identity'),'My earlier statement');assert.equal(first.state.answers.identity,'My older final identity','Relinking retains the old value for safety');assert.equal(first.get('style.language')['Fit::My preference'],'Original fit');assert.equal(first.get('style.language')['Silhouette::My preference'],'My intentional old silhouette');assert.equal(await first.flush(),true);
  await resumed.hydrate(server.state,descriptor('legacy'),storage);resumed.change('style.statement','My changed earlier statement');resumed.change('fit.pattern','Updated fit');assert.equal(resumed.get('identity'),'My changed earlier statement');assert.equal(resumed.get('style.language')['Fit::My preference'],'Updated fit');assert.equal(resumed.get('style.language')['Silhouette::My preference'],'My intentional old silhouette');assert.deepEqual(resumed.state.completed,[10,20]);assert.equal(await resumed.flush(),true);
 }finally{cleanup(first,resumed);globalThis.fetch=previous}
});

test('editing one table cell saves sparse overrides while unedited cells continue to inherit',async()=>{
 const previous=globalThis.fetch,initial={...emptyState(),answers:{'fit.pattern':'Old fit','silhouette.notes.3':'Old silhouette'}},server=memoryServer(initial),store=new ProgressStore();globalThis.fetch=server.fetch;
 try{await store.hydrate(initial);store.changeCell('style.language','Fit::What this looks like for me','My clothing description');assert.deepEqual(Object.keys(store.state.answers['style.language']),['Fit::What this looks like for me']);store.change('fit.pattern','New fit');store.change('silhouette.notes.3','New silhouette');assert.equal(store.get('style.language')['Fit::My preference'],'New fit');assert.equal(store.get('style.language')['Silhouette::My preference'],'New silhouette');assert.equal(await store.flush(),true);assert.deepEqual(Object.keys(server.state.answers['style.language']),['Fit::What this looks like for me']);assert.equal(server.state.bindingState['style.language'].cells['Fit::My preference'],'linked');
 }finally{cleanup(store);globalThis.fetch=previous}
});

test('encrypted recovery restores link, per-cell review and confirmation operations after a failed save',async()=>{
 const previous=globalThis.fetch,storage=new MemoryStorage(),initial={schemaVersion:2,revision:0,completed:[],lastStep:20,answers:{identity:'Retain my private identity','style.statement':'Earlier statement','style.brief':'Confirmed private brief','qualities.core':['Ease','',''],'fit.pattern':'My source fit','style.language':{'Fit::My preference':'Ambiguous prior fit','Silhouette::My preference':'Keep this deliberate value'}}};
 const first=new ProgressStore(),resumed=new ProgressStore();globalThis.fetch=async()=>{throw Error('Offline')};
 try{await first.hydrate(initial,descriptor('operations'),storage);first.review('style.language');first.linkCell('style.language','Fit::My preference');first.link('identity');first.confirm('style.brief',['qualities.core']);assert.equal(await first.flush(),false);await first.persistRecovery();assert.ok(storage.data.size>0);assert.ok(![...storage.data.values()].join('').includes('private'));
  await resumed.hydrate(initial,descriptor('operations'),storage);assert.equal(resumed.recovered,true);assert.equal(resumed.get('identity'),'Earlier statement');assert.equal(resumed.state.answers.identity,'Retain my private identity');assert.equal(resumed.get('style.language')['Fit::My preference'],'My source fit');assert.equal(resumed.get('style.language')['Silhouette::My preference'],'Keep this deliberate value');assert.ok(resumed.state.bindingState['style.brief'].sourceSnapshot);const server=memoryServer(initial);globalThis.fetch=server.fetch;assert.equal(await resumed.flush(),true);assert.equal(storage.data.size,0);assert.equal(server.state.bindingState.identity.mode,'linked');
 }finally{cleanup(first,resumed);globalThis.fetch=previous}
});

test('answers edited during an in-flight save survive its older response and receive their own revision',async()=>{
 const previous=globalThis.fetch,initial={...emptyState(),answers:{'fit.pattern':'Initial fit','silhouette.notes.3':'Initial silhouette'}},server=memoryServer(initial),store=new ProgressStore();let release;const gate=new Promise(resolve=>release=resolve),sent=[];
 globalThis.fetch=async(url,init)=>{sent.push(JSON.parse(init.body));if(sent.length===1)await gate;return server.fetch(url,init)};
 try{await store.hydrate(initial);store.change('fit.pattern','First edit');const saving=store.flush();await wait(()=>sent.length===1);store.change('silhouette.notes.3','Later edit');release();assert.equal(await saving,true);assert.equal(server.state.answers['fit.pattern'],'First edit');assert.equal(server.state.answers['silhouette.notes.3'],'Later edit');assert.equal(store.get('silhouette.notes.3'),'Later edit');assert.equal(server.state.revision,2);assert.equal(sent[1].baseRevision,1);
 }finally{release?.();cleanup(store);globalThis.fetch=previous}
});

for(const variant of ['field','cell'])test(`a failed in-flight ${variant} relink cannot override a later deliberate edit on retry or recovery`,async()=>{
 const previous=globalThis.fetch,storage=new MemoryStorage(),initial={...emptyState(),answers:{identity:'Old explicit identity','style.statement':'Source identity','fit.pattern':'Source fit','style.language':{'Fit::My preference':'Old explicit fit'}}};
 const first=new ProgressStore(),recovered=new ProgressStore();let rejectRequest;const sent=[];
 globalThis.fetch=async(_url,init)=>{sent.push(JSON.parse(init.body));return new Promise((_resolve,reject)=>rejectRequest=reject)};
 try{await first.hydrate(initial,descriptor('failed-'+variant),storage);if(variant==='field')first.link('identity');else first.linkCell('style.language','Fit::My preference');const saving=first.flush();await wait(()=>sent.length===1);if(variant==='field')first.change('identity','My later deliberate value');else first.changeCell('style.language','Fit::My preference','My later deliberate value');rejectRequest(Error('Network lost'));assert.equal(await saving,false);await first.persistRecovery();
  await recovered.hydrate(initial,descriptor('failed-'+variant),storage);assert.equal(variant==='field'?recovered.get('identity'):recovered.get('style.language')['Fit::My preference'],'My later deliberate value');const server=memoryServer(initial);globalThis.fetch=server.fetch;assert.equal(await first.flush(),true);assert.equal(variant==='field'?first.get('identity'):first.get('style.language')['Fit::My preference'],'My later deliberate value');
 }finally{rejectRequest?.(Error('Test cleanup'));cleanup(first,recovered);globalThis.fetch=previous}
});

test('recovery preserves the confirmation-time sources when a source changes before a failed save',async()=>{
 const previous=globalThis.fetch,storage=new MemoryStorage(),initial={...emptyState(),answers:{'style.brief':'My confirmed words','qualities.core':['Original','','']}},store=new ProgressStore(),recovered=new ProgressStore();let rejectRequest;let requested=false;
 globalThis.fetch=async()=>{requested=true;return new Promise((_resolve,reject)=>rejectRequest=reject)};
 try{await store.hydrate(initial,descriptor('confirmation-snapshot'),storage);store.confirm('style.brief',['qualities.core']);const saving=store.flush();await wait(()=>requested);store.change('qualities.core',['Changed after confirmation','','']);assert.equal(confirmedChanges('style.brief',store.state.answers,store.state.bindingState).changed,true);rejectRequest(Error('Offline'));assert.equal(await saving,false);await store.persistRecovery();
  await recovered.hydrate(initial,descriptor('confirmation-snapshot'),storage);assert.equal(recovered.get('style.brief'),'My confirmed words');assert.deepEqual(recovered.state.bindingState['style.brief'].sourceSnapshot['qualities.core'],['Original','','']);assert.equal(confirmedChanges('style.brief',recovered.state.answers,recovered.state.bindingState).changed,true);
 }finally{rejectRequest?.(Error('Test cleanup'));cleanup(store,recovered);globalThis.fetch=previous}
});

test('saving a confirmation with a later unsaved source edit retains the original confirmation snapshot',async()=>{
 const previous=globalThis.fetch,initial={...emptyState(),answers:{'style.brief':'My confirmed words','qualities.core':['Original','','']}},server=memoryServer(initial),store=new ProgressStore();globalThis.fetch=server.fetch;
 try{await store.hydrate(initial);store.confirm('style.brief',['qualities.core']);const confirmedAt=store.state.bindingState['style.brief'].confirmedAt;store.change('qualities.core',['Changed after confirmation','','']);assert.equal(confirmedChanges('style.brief',store.state.answers,store.state.bindingState).changed,true);assert.equal(await store.flush(),true);assert.deepEqual(server.state.bindingState['style.brief'].sourceSnapshot['qualities.core'],['Original','','']);assert.equal(server.state.bindingState['style.brief'].confirmedAt,confirmedAt);assert.equal(confirmedChanges('style.brief',store.state.answers,store.state.bindingState).changed,true);
 }finally{cleanup(store);globalThis.fetch=previous}
});

test('failed whole-table relinking retains live inheritance for unedited cells when a later cell is overridden',async()=>{
 const previous=globalThis.fetch,storage=new MemoryStorage(),initial={schemaVersion:2,revision:0,completed:[],lastStep:60,answers:{'fit.pattern':'Current source fit','silhouette.notes.3':'Current source silhouette','style.language':{'Fit::My preference':'Ambiguous old fit','Silhouette::My preference':'Ambiguous old silhouette'}}},store=new ProgressStore(),recovered=new ProgressStore();let rejectRequest;let requested=false;
 globalThis.fetch=async()=>{requested=true;return new Promise((_resolve,reject)=>rejectRequest=reject)};
 try{await store.hydrate(initial,descriptor('whole-table-link'),storage);store.link('style.language');const saving=store.flush();await wait(()=>requested);store.changeCell('style.language','Fit::What this looks like for me','My later clothing refinement');rejectRequest(Error('Offline'));assert.equal(await saving,false);await store.persistRecovery();await recovered.hydrate(initial,descriptor('whole-table-link'),storage);assert.equal(recovered.get('style.language')['Fit::What this looks like for me'],'My later clothing refinement');assert.equal(recovered.get('style.language')['Silhouette::My preference'],'Current source silhouette');assert.equal(recovered.get('style.language')['Fit::My preference'],'Current source fit');
 }finally{rejectRequest?.(Error('Test cleanup'));cleanup(store,recovered);globalThis.fetch=previous}
});

test('failed legacy review followed by one cell edit preserves the review decision for the remaining cells',async()=>{
 const previous=globalThis.fetch,storage=new MemoryStorage(),initial={schemaVersion:2,revision:0,completed:[],lastStep:60,answers:{'fit.pattern':'Source fit','style.language':{'Fit::My preference':'My reviewed fit','Silhouette::My preference':'My reviewed silhouette'}}},store=new ProgressStore(),recovered=new ProgressStore();let rejectRequest;let requested=false;
 globalThis.fetch=async()=>{requested=true;return new Promise((_resolve,reject)=>rejectRequest=reject)};
 try{await store.hydrate(initial,descriptor('review-then-cell-edit'),storage);store.review('style.language');const saving=store.flush();await wait(()=>requested);store.changeCell('style.language','Fit::What this looks like for me','My later clothing refinement');rejectRequest(Error('Offline'));assert.equal(await saving,false);await store.persistRecovery();await recovered.hydrate(initial,descriptor('review-then-cell-edit'),storage);assert.equal(recovered.get('style.language')['Silhouette::My preference'],'My reviewed silhouette');assert.equal(bindingInfo('style.language',recovered.state.answers,recovered.state.bindingState).cells['Silhouette::My preference'],'override');assert.equal(bindingInfo('style.language',recovered.state.answers,recovered.state.bindingState).legacy,false);
 }finally{rejectRequest?.(Error('Test cleanup'));cleanup(store,recovered);globalThis.fetch=previous}
});

for(const operation of ['whole-table link','individual reset','legacy review'])test(`same-pending ${operation} then cell edit saves and resumes without losing other values or binding decisions`,async()=>{
 const previous=globalThis.fetch,storage=new MemoryStorage(),initial={schemaVersion:2,revision:3,completed:[10,20],lastStep:60,answers:{'fit.pattern':'Current fit source','silhouette.notes.3':'Current silhouette source','style.language':{'Fit::My preference':'Keep prior raw fit','Silhouette::My preference':'Keep prior raw silhouette'}}},server=memoryServer(initial),store=new ProgressStore(),resumed=new ProgressStore();globalThis.fetch=server.fetch;
 try{await store.hydrate(initial,descriptor('same-pending-'+operation),storage);
  if(operation==='whole-table link')store.link('style.language');
  if(operation==='individual reset')store.linkCell('style.language','Fit::My preference');
  if(operation==='legacy review')store.review('style.language');
  const changedCell=operation==='individual reset'?'Fit::My preference':'Fit::What this looks like for me';store.changeCell('style.language',changedCell,'My newest deliberate refinement');assert.equal(store.get('style.language')[changedCell],'My newest deliberate refinement');assert.equal(await store.flush(),true);
  assert.equal(server.state.answers['style.language']['Silhouette::My preference'],'Keep prior raw silhouette');
  if(operation!=='individual reset')assert.equal(server.state.answers['style.language']['Fit::My preference'],'Keep prior raw fit');
  await resumed.hydrate(server.state,descriptor('same-pending-'+operation),storage);assert.equal(resumed.get('style.language')[changedCell],'My newest deliberate refinement');assert.deepEqual(resumed.state.completed,[10,20]);resumed.change('fit.pattern','Still newer source fit');resumed.change('silhouette.notes.3','Still newer source silhouette');
  if(operation==='whole-table link'){assert.equal(resumed.get('style.language')['Fit::My preference'],'Still newer source fit');assert.equal(resumed.get('style.language')['Silhouette::My preference'],'Still newer source silhouette');assert.equal(bindingInfo('style.language',resumed.state.answers,resumed.state.bindingState).cells['Silhouette::My preference'],'linked')}
  else {assert.equal(resumed.get('style.language')['Silhouette::My preference'],'Keep prior raw silhouette');assert.equal(resumed.get('style.language')['Fit::My preference'],operation==='individual reset'?'My newest deliberate refinement':'Keep prior raw fit');}
  if(operation==='legacy review')assert.equal(bindingInfo('style.language',resumed.state.answers,resumed.state.bindingState).legacy,false);
  assert.equal(await resumed.flush(),true);
 }finally{cleanup(store,resumed);globalThis.fetch=previous}
});
