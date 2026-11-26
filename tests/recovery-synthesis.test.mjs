import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {candidatePatterns,assembleBrief} from '../server/synthesis.mjs';
import {RecoveryVault} from '../client/recovery.mjs';
import {ProgressStore} from '../client/store.mjs';
import {emptyState} from '../server/model.mjs';
class MemoryStorage{constructor(){this.data=new Map()}getItem(k){return this.data.get(k)??null}setItem(k,v){this.data.set(k,v)}removeItem(k){this.data.delete(k)}}
const descriptor={name:'account-a-opaque-cache-name',secret:'a1'.repeat(32)},other={name:'account-b-opaque-cache-name',secret:'b2'.repeat(32)};
test('only literal positive cross-part patterns become candidates; admiration alone is excluded',()=>{
 assert.deepEqual(candidatePatterns({'fit.ratings':{Relaxed:'Love it'},'silhouette.ratings':{Relaxed:'Yes — I love this'}}),[]);
 const answers={'fit.ratings':{Relaxed:'Love it',Oversized:'Actively avoid it'},'inspiration.top':['Relaxed','Oversized']};const candidates=candidatePatterns(answers);
 assert.deepEqual(candidates.map(c=>c.term),['Relaxed']);assert.deepEqual(candidates[0].sources,['fit.ratings','inspiration.top']);
 const inspiration={id:'inspo',kind:'inspiration',sort:'Beautiful + Not Me',annotations:{feeling:['Relaxed']}};
 assert.deepEqual(candidatePatterns({'fit.ratings':{Relaxed:'Love it'}},[inspiration]),[]);inspiration.sort='Beautiful + Me';assert.equal(candidatePatterns({'fit.ratings':{Relaxed:'Love it'}},[inspiration])[0].term,'Relaxed');
});
test('assembled draft is deterministic, exposes missing slots, and never writes a final answer',()=>{
 const answers={'qualities.core':['Easy','Intentional'],'qualities.supporting':['Soft'],'qualities.accent':['Contrast'],'direction.5':'home and work'};const before=structuredClone(answers),draft=assembleBrief(answers);
 assert.equal(draft.text,'I want to dress in a way that feels Easy, Intentional, combining Soft with Contrast, while keeping my clothes practical for home and work.');assert.deepEqual(draft.missing,[]);assert.deepEqual(answers,before);assert.equal(answers['style.brief'],undefined);
 assert.ok(assembleBrief({}).text.includes('[CORE QUALITIES]'));assert.equal(assembleBrief({}).missing.length,4);
});
test('recovery ciphertext is account-isolated, tamper-resistant, and handles large drafts',async()=>{
 const storage=new MemoryStorage(),a=new RecoveryVault(storage,descriptor,webcrypto),b=new RecoveryVault(storage,other,webcrypto);const draft={v:2,baseRevision:4,patch:{answers:{'fit.pattern':'PRIVATE RESPONSE '+'x'.repeat(160000)}}};
 await a.save(draft);const serialized=[...storage.data.values()].join('');assert.ok(!serialized.includes('PRIVATE RESPONSE'));assert.ok(!serialized.includes(descriptor.secret));assert.deepEqual(await a.read(),draft);assert.equal(await b.read(),null);
 const corrupt=JSON.parse(storage.getItem(a.name));corrupt.data=corrupt.data.slice(0,-5)+'AAAAA';storage.setItem(a.name,JSON.stringify(corrupt));const ciphertext=storage.getItem(a.name);await assert.rejects(()=>a.read());assert.equal(storage.getItem(a.name),ciphertext,'Unreadable recovery data is preserved for retry or explicit recovery');
});
test('failed save survives closing/reopening the store and clears recovery after a successful retry',async()=>{
 const storage=new MemoryStorage();const savedFetch=globalThis.fetch;try{
  globalThis.fetch=async()=>{throw Error('Offline')};const first=new ProgressStore();await first.hydrate(emptyState(),descriptor,storage);first.change('fit.pattern','My unsaved private fit');assert.equal(await first.flush(),false);clearTimeout(first.timer);await first.persistRecovery();
  const next=new ProgressStore();await next.hydrate(emptyState(),descriptor,storage);assert.equal(next.get('fit.pattern'),'My unsaved private fit');assert.equal(next.recovered,true);assert.equal(next.hasPending(),true);
  const otherStore=new ProgressStore();await otherStore.hydrate(emptyState(),other,storage);assert.equal(otherStore.get('fit.pattern'),'');
  globalThis.fetch=async()=>Response.json({...next.state,revision:1,updatedAt:'now'});assert.equal(await next.flush(),true);assert.equal(next.status,'saved');assert.equal(storage.getItem('inherfashion.recovery.'+descriptor.name),null);
 }finally{globalThis.fetch=savedFetch}
});
test('stale recovery requires an explicit choice and preserves newer unrelated server answers',async()=>{
 const storage=new MemoryStorage(),vault=new RecoveryVault(storage,descriptor,webcrypto);await vault.save({v:2,baseRevision:1,patch:{answers:{'fit.pattern':'My recovered edit'}}});
 const latest={...emptyState(),revision:2,answers:{'fit.pattern':'Newer server text','style.statement':'Unrelated saved statement'}};
 const store=new ProgressStore();await store.hydrate(latest,descriptor,storage);assert.ok(store.conflict);assert.equal(await store.flush(),false);
 const previous=globalThis.fetch;globalThis.fetch=async()=>Response.json({...store.state,revision:3});try{assert.equal(await store.keepMine(),true);assert.equal(store.get('fit.pattern'),'My recovered edit');assert.equal(store.get('style.statement'),'Unrelated saved statement')}finally{globalThis.fetch=previous}
});
