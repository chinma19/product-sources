import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,relative,dirname,extname} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash,webcrypto} from 'node:crypto';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import {Miniflare} from 'miniflare';
import {RecoveryVault} from '../client/recovery.mjs';
import {ProgressStore} from '../client/store.mjs';
import {emptyState,controls} from '../server/model.mjs';

// Upgrade tests deliberately combine different releases. The historical client
// is read from immutable Git objects, never checked out over the working tree.
// Optional paths exercise downloaded published JavaScript against LOCAL writes:
// IHF_PREVIOUS_PUBLISHED_CLIENT: the cached previous-release bundle.
// IHF_PUBLISHED_SELECTION_CLIENT: the newly published bundle under verification.
const repo=fileURLToPath(new URL('..',import.meta.url)),run=promisify(execFile);
const origin='https://selection-upgrade.test',protocol={'X-IHF-Selection-Protocol':'2'};
const exclusive=[['p26.choices1',26],['p38.choices1',38],['p45.choices1',45],['p49.choices1',49],['p52.choices1',52],['p52.choices2',52]];
let mf,currentScript,oldScript,cachedScript,manifest;
const sha=text=>createHash('sha256').update(text).digest('hex');
class Storage{constructor(){this.values=new Map()}getItem(k){return this.values.get(k)??null}setItem(k,v){this.values.set(k,String(v))}removeItem(k){this.values.delete(k)}}
const descriptor=name=>({name:'upgrade-fixture-'+name,secret:'c9'.repeat(32)});
async function pinnedClient(ref){
 return (await build({absWorkingDir:repo,entryPoints:[resolve(repo,'client/app.mjs')],bundle:true,write:false,format:'iife',target:'es2022',plugins:[{
  name:'immutable-historical-client',setup(builder){
   builder.onResolve({filter:/.*/},args=>{if(!args.importer)return {path:args.path,namespace:'historical'};if(args.namespace==='historical'&&args.path.startsWith('.'))return {path:resolve(dirname(args.importer),args.path),namespace:'historical'};});
   builder.onLoad({filter:/.*/,namespace:'historical'},async args=>{if(extname(args.path)==='.css')return {contents:'',loader:'js'};const path=relative(repo,args.path).split('\\').join('/');const {stdout}=await run('git',['show',ref+':'+path],{cwd:repo,maxBuffer:8000000});return {contents:stdout,loader:extname(args.path)==='.json'?'json':'js',resolveDir:dirname(args.path)};});
  }
 }]})).outputFiles[0].text;
}
async function api(owner,path,method='GET',body,headers=protocol){return mf.dispatchFetch(origin+path,{method,headers:{'oai-authenticated-user-id':owner,...headers,...(body===undefined?{}:{Origin:origin,'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});}
async function state(owner){return (await api(owner,'/api/progress')).json();}
async function wait(check,label='upgrade interaction'){for(let i=0;i<800;i++){if(await check())return;await new Promise(r=>setTimeout(r,10))}throw Error('Timed out: '+label);}
async function open(script,owner,{storage=new Storage(),page=38,offline=false}={}){
 const w=new Window({url:origin+'/#/step/'+page,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}}),calls=[],alerts=[];
 w.document.body.innerHTML='<div id="app"></div><div id="announcements"></div>';Object.defineProperty(w,'crypto',{value:globalThis.crypto});Object.defineProperty(w,'localStorage',{value:storage});w.structuredClone=structuredClone;w.scrollTo=()=>{};w.confirm=()=>true;w.alert=message=>alerts.push(String(message));w.URL.createObjectURL=()=> 'blob:upgrade-test';w.URL.revokeObjectURL=()=>{};
 const session={w,calls,alerts,storage,offline,close:async()=>{w.happyDOM.abort();await w.close()}};
 w.fetch=async(url,init={})=>{const path=new URL(url,origin).pathname+new URL(url,origin).search,body=init.body?JSON.parse(init.body):undefined;const supplied=Object.fromEntries(new Headers(init.headers||{})),entry={path,method:init.method||'GET',headers:supplied,body};calls.push(entry);if(session.offline&&init.method==='PATCH')throw Error('Synthetic connection interrupted');const response=await api(owner,path,init.method||'GET',body,supplied);entry.status=response.status;return response;};
 w.eval(script);await wait(()=>w.document.querySelector('.step-topline')?.textContent.includes('Step '+String(page).padStart(2,'0')+' /'),'bootstrap artifact');return session;
}
async function go(w,page){w.location.hash=typeof page==='number'?'#/step/'+page:page;await wait(()=>typeof page==='number'?w.document.querySelector('.step-topline')?.textContent.includes('Step '+String(page).padStart(2,'0')+' /'):!!w.document.querySelector('.compass-main'),'go '+page);}
const inputs=(w,id)=>[...w.document.querySelectorAll('[data-id][data-option]')].filter(input=>input.dataset.id===id);
const selected=(w,id)=>inputs(w,id).filter(input=>input.checked).map(input=>input.dataset.option);
function enter(w,selector,value,event='input'){const input=w.document.querySelector(selector);assert.ok(input,'Missing '+selector);input.value=value;input.dispatchEvent(new w.Event(event,{bubbles:true}));}
async function save(session,status='saved'){session.w.document.querySelector('[data-action=save]').click();await wait(()=>session.w.document.querySelector('#save-status')?.dataset.status===status,'save '+status);}
async function compass(session){await go(session.w,'#/compass');enter(session.w,'[data-id="compass.item"]','My carried-forward cotton shirt');enter(session.w,'[data-id="compass.notes"]','Keep my exact earlier Compass observation');for(const input of session.w.document.querySelectorAll('[data-id="compass.scores"]')){input.value='4';input.dispatchEvent(new session.w.Event('change',{bubbles:true}));}}
function assertCompass(answers){assert.equal(answers['compass.item'],'My carried-forward cotton shirt');assert.equal(answers['compass.notes'],'Keep my exact earlier Compass observation');assert.equal(Object.keys(answers['compass.scores']).length,5);assert.ok(Object.values(answers['compass.scores']).every(value=>value===4));}
before(async()=>{
 // These are the actual deployable artifacts, not freshly rebundled source.
 const worker=await readFile(resolve(repo,'dist/server/index.js'),'utf8');mf=new Miniflare({modules:true,script:worker,compatibilityDate:'2025-11-01',d1Databases:['DB'],r2Buckets:['BUCKET']});const {DB}=await mf.getBindings();for(const {tag}of JSON.parse(await readFile(resolve(repo,'dist/drizzle/meta/_journal.json'),'utf8')).entries)await DB.exec(await readFile(resolve(repo,'dist/drizzle',tag+'.sql'),'utf8'));
 const html=await readFile(resolve(repo,'dist/public/index.html'),'utf8'),scriptPath=html.match(/<script[^>]+src="([^"]+)"/)?.[1];assert.ok(scriptPath,'The built document identifies its script');currentScript=await readFile(process.env.IHF_PUBLISHED_SELECTION_CLIENT||resolve(repo,'dist/public',scriptPath.replace(/^\//,'')),'utf8');
 manifest=JSON.parse(await readFile(resolve(repo,'dist/release.json'),'utf8'));
 oldScript=await pinnedClient('8295e87');cachedScript=process.env.IHF_PREVIOUS_PUBLISHED_CLIENT?await readFile(process.env.IHF_PREVIOUS_PUBLISHED_CLIENT,'utf8'):await pinnedClient('0f76764');
});
after(async()=>mf?.dispose());

test('an already-open pre-fix client can save conflicting p38 plus Compass atomically to the upgraded Worker',async()=>{
 const owner='open-pre-fix-release';const session=await open(oldScript,owner);
 try{
  assert.ok(inputs(session.w,'p38.choices1').every(input=>input.type==='checkbox'));inputs(session.w,'p38.choices1')[0].click();inputs(session.w,'p38.choices1')[1].click();assert.deepEqual(selected(session.w,'p38.choices1'),['Yes','Mostly']);await compass(session);await save(session);
  const mixed=session.calls.find(call=>call.method==='PATCH'&&call.body?.answers?.['compass.item']);assert.ok(mixed);assert.equal(mixed.headers['x-ihf-selection-protocol'],undefined,'This is a real old, unversioned client');assert.equal(mixed.status,200);const saved=await state(owner);assert.deepEqual(saved.answers['p38.choices1'],['Yes','Mostly']);assertCompass(saved.answers);assert.deepEqual(session.alerts,[]);
 }finally{await session.close()}
 const resumed=await open(currentScript,owner);try{assert.ok(inputs(resumed.w,'p38.choices1').every(input=>input.type==='radio'));assert.deepEqual(selected(resumed.w,'p38.choices1'),[]);const panel=resumed.w.document.querySelector('[data-selection-conflict="p38.choices1"]');assert.ok(panel?.textContent.includes('Yes')&&panel.textContent.includes('Mostly'));await go(resumed.w,'#/compass');assert.equal(resumed.w.document.querySelector('[data-id="compass.item"]').value,'My carried-forward cotton shirt');await save(resumed);assertCompass((await state(owner)).answers);}finally{await resumed.close()}
});

test('offline v1 → cached v2 → current artifact preserves mixed encrypted p38 and Compass recovery without choosing an answer',async t=>{
 const owner='three-release-recovery',storage=new Storage();let session=await open(oldScript,owner,{storage});
 try{
  session.offline=true;inputs(session.w,'p38.choices1')[0].click();inputs(session.w,'p38.choices1')[1].click();await compass(session);await save(session,'error');const bootstrap=await(await api(owner,'/api/bootstrap')).json();let record=await new RecoveryVault(storage,bootstrap.recovery).read();assert.deepEqual(record.patch.answers['p38.choices1'],['Yes','Mostly']);assertCompass(record.patch.answers);assert.ok(![...storage.values.values()].join('').includes('cotton shirt'));
  await session.close();session=await open(cachedScript,owner,{storage,offline:true});assert.deepEqual(selected(session.w,'p38.choices1'),[]);assert.ok(session.w.document.querySelector('[data-selection-conflict="p38.choices1"]'));await save(session,'error');record=await new RecoveryVault(storage,bootstrap.recovery).read();assert.deepEqual(record.patch.answers['p38.choices1'],['Yes','Mostly']);assertCompass(record.patch.answers);
  await session.close();session=await open(currentScript,owner,{storage});assert.deepEqual(selected(session.w,'p38.choices1'),[]);assert.ok(session.w.document.querySelector('[data-selection-conflict="p38.choices1"]'));await save(session);const saved=await state(owner);assert.deepEqual(saved.answers['p38.choices1'],['Yes','Mostly']);assertCompass(saved.answers);assert.ok(session.calls.some(call=>call.method==='PATCH'&&call.headers['x-ihf-selection-protocol']==='2'&&call.body.restoreSelectionConflicts?.includes('p38.choices1')));assert.equal(storage.values.size,0);
  await go(session.w,'#/compass');assert.equal(session.w.document.querySelector('[data-id="compass.notes"]').value,'Keep my exact earlier Compass observation');assert.deepEqual(session.alerts,[]);t.diagnostic('Cached previous published bundle SHA-256: '+sha(cachedScript));
 }finally{await session.close()}
});

test('the actual current or supplied published script enforces all six single answers through save and reopen',async t=>{
 for(const [id,page]of exclusive){const owner='published-six-'+id.replaceAll('.','-');let session=await open(currentScript,owner,{page});try{let options=inputs(session.w,id);assert.equal(options.length,controls.get(id).options.length);assert.ok(options.every(input=>input.type==='radio'),id+' uses the downloaded artifact UI');options[0].click();options[1].click();assert.deepEqual(selected(session.w,id),[controls.get(id).options[1]]);await save(session);assert.deepEqual((await state(owner)).answers[id],[controls.get(id).options[1]]);assert.ok(session.calls.some(call=>call.method==='PATCH'&&call.headers['x-ihf-selection-protocol']==='2'));await session.close();session=await open(currentScript,owner,{page});assert.deepEqual(selected(session.w,id),[controls.get(id).options[1]]);assert.deepEqual(session.alerts,[]);}finally{await session.close()}}
 if(manifest?.assets?.script?.sha256)assert.equal(sha(currentScript),manifest.assets.script.sha256,'Supplied published bytes must match the built release manifest');t.diagnostic('Verified current/published script SHA-256: '+sha(currentScript));
});

test('the built document uses content-addressed assets and older unversioned requests cannot weaken protocol2 validation',async()=>{
 const html=await(await api('asset-fixture','/')).text(),script=html.match(/<script[^>]+src="([^"]+)"/)?.[1],stylesheet=html.match(/<link[^>]+href="([^"]+\.css)"/)?.[1];assert.ok(script&&script!=='/assets/app.js','A reload must request a different script URL than the prior release');assert.ok(stylesheet&&stylesheet!=='/assets/app.css','Stylesheet caching also follows the release');
 assert.equal(script,manifest.assets.script.path);assert.equal(stylesheet,manifest.assets.stylesheet.path);for(const path of [script,'/assets/app.js']){const response=await api('asset-fixture',path);assert.equal(response.status,200);assert.equal(sha(await response.text()),manifest.assets.script.sha256,'Old cached HTML receives the exact current script too');if(path==='/assets/app.js')assert.match(response.headers.get('Cache-Control'),/no-store/);}
 for(const [previous,current]of [['/assets/app-PREVIOUS.js',manifest.assets.script],['/assets/app-PREVIOUS.css',manifest.assets.stylesheet]]){const response=await mf.dispatchFetch(origin+previous,{redirect:'manual',headers:{'oai-authenticated-user-id':'asset-fixture'}});assert.equal(response.status,307,'An old HTML/new deployment asset race redirects '+previous);assert.equal(response.headers.get('Location'),current.path);assert.match(response.headers.get('Cache-Control'),/private/);assert.match(response.headers.get('Cache-Control'),/no-store/);const target=await api('asset-fixture',response.headers.get('Location'));assert.equal(target.status,200);assert.equal(sha(await target.text()),current.sha256,'The redirected request reaches the current complete asset');}
 const version=await(await api('asset-fixture','/api/version')).json();assert.equal(version.releaseId,manifest.releaseId);assert.equal(version.selectionProtocol,2);assert.deepEqual(version.assets,manifest.assets);
 const answers={'p38.choices1':['Yes','Mostly'],'compass.item':'Keep the valid part too'},owner='strict-release-protocol';let response=await api(owner,'/api/progress','PATCH',{baseRevision:0,answers});assert.equal(response.status,400);assert.deepEqual((await state(owner)).answers,{});
 response=await api(owner,'/api/progress','PATCH',{baseRevision:0,answers},{});assert.equal(response.status,200);assert.deepEqual((await state(owner)).answers,answers);const before=await state(owner);response=await api(owner,'/api/progress','PATCH',{baseRevision:before.revision,answers:{'compass.item':'Unsupported version must retain this locally'}},{'X-IHF-Selection-Protocol':'99'});assert.equal(response.status,426);assert.deepEqual(await state(owner),before);
 response=await api('invalid-legacy-structure','/api/progress','PATCH',{baseRevision:0,answers:{'p38.choices1':['Invented option'],'compass.item':'This must remain atomic'}},{});assert.equal(response.status,400);assert.deepEqual((await state('invalid-legacy-structure')).answers,{});
});

test('unreadable and temporarily unavailable encrypted recovery remains intact for a later retry',async()=>{
 const storage=new Storage(),key=descriptor('read-failure'),vault=new RecoveryVault(storage,key),record={v:3,baseRevision:0,patch:{answers:{'p38.choices1':['Yes','Mostly'],'compass.item':'Keep my mixed recovery'}}};await vault.save(record);const original=storage.getItem(vault.name);
 const unavailable={getRandomValues:array=>webcrypto.getRandomValues(array),subtle:{importKey:(...args)=>webcrypto.subtle.importKey(...args),decrypt:async()=>{throw Error('Synthetic temporary crypto failure')}}};await assert.rejects(()=>new RecoveryVault(storage,key,unavailable).read());assert.equal(storage.getItem(vault.name),original);assert.deepEqual(await new RecoveryVault(storage,key).read(),record,'Retrying with working crypto recovers every answer');
 const unsupported=JSON.stringify({...JSON.parse(original),v:99});storage.setItem(vault.name,unsupported);await assert.rejects(()=>new RecoveryVault(storage,key).read());assert.equal(storage.getItem(vault.name),unsupported);const store=new ProgressStore();try{store.change('compass.item','An existing in-memory item must remain');await store.hydrate(emptyState(),key,storage);assert.ok(store.recoveryWarning,'The customer receives a recovery warning');assert.equal(store.get('compass.item'),'An existing in-memory item must remain');assert.equal(store.pending.answers['compass.item'],'An existing in-memory item must remain');store.change('fit.pattern','A new unsaved observation');await store.persistRecovery();assert.equal(storage.getItem(vault.name),unsupported,'New edits cannot overwrite the protected unreadable record');}finally{clearTimeout(store.timer)}
});

test('an unsupported protocol response keeps the pending edit and encrypted recovery instead of clearing either',async()=>{
 const previous=globalThis.fetch,store=new ProgressStore(),storage=new Storage(),key=descriptor('unsupported-protocol');
 try{await store.hydrate(emptyState(),key,storage);globalThis.fetch=(_url,init)=>api('unsupported-store','/api/progress','PATCH',JSON.parse(init.body),{'X-IHF-Selection-Protocol':'99'});store.change('compass.item','My unsaved item survives a release mismatch');assert.equal(await store.flush(),false);assert.equal(store.get('compass.item'),'My unsaved item survives a release mismatch');assert.equal(store.pending.answers['compass.item'],'My unsaved item survives a release mismatch');assert.equal((await new RecoveryVault(storage,key).read()).patch.answers['compass.item'],'My unsaved item survives a release mismatch');assert.deepEqual((await state('unsupported-store')).answers,{});}finally{clearTimeout(store.timer);globalThis.fetch=previous}
});

test('release checks never force a reload and an explicit update waits for saves and unsaved customer drafts',async()=>{
 const {ApplicationUpdate}=await import('../client/application-update.mjs');let reloads=0,persisted=0,saves=0;const updates=[];
 const update=new ApplicationUpdate({releaseId:'previous-release',fetchImpl:async()=>Response.json({releaseId:'new-release',selectionProtocol:2}),changed:value=>updates.push(value),reload:()=>reloads++});await update.check();assert.equal(reloads,0,'Merely detecting another release cannot navigate or reload');assert.ok(updates.length>0);
 const options={persistRecovery:async()=>persisted++,flush:async()=>{saves++;return false},hasUnsavedWork:()=>false};assert.equal(await update.apply(options),false);assert.equal(reloads,0);assert.ok(persisted>0&&saves>0);assert.equal(await update.apply({...options,flush:async()=>true,hasUnsavedWork:()=>true}),false);assert.equal(reloads,0,'Image uploads or annotation/reference drafts prevent a disruptive update');assert.equal(await update.apply({...options,flush:async()=>true,hasUnsavedWork:()=>false}),true);assert.equal(reloads,1);
});
