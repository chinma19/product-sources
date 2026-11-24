import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import {Window} from 'happy-dom';
import {build} from 'esbuild';
import {workbook,migrateState} from '../server/model.mjs';
import {discoveries,relevantEvidence,renderDiscoveries,sourcePreview} from '../client/discoveries.mjs';
import {UploadQueue} from '../client/evidence-library.mjs';
let mf,env;const origin='https://ux.test';
const api=async(path,{owner='ux',method='GET',body,headers={}}={})=>{const h={...(owner?{'oai-authenticated-user-id':owner}:{}),...(['GET','HEAD'].includes(method)?{}:{Origin:origin}),...headers};if(body instanceof FormData){const r=new Request(origin+path,{method,body});h['Content-Type']=r.headers.get('Content-Type');body=await r.arrayBuffer()}else if(body){h['Content-Type']='application/json';body=JSON.stringify(body)}return mf.dispatchFetch(origin+path,{method,headers:h,body})};
const png=()=>new File([Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0])],'outfit.png',{type:'image/png'});
async function create(owner,title='Outfit',kind='recent'){const f=new FormData();f.set('file',png());f.set('kind',kind);f.set('title',title);const r=await api('/api/evidence',{owner,method:'POST',body:f});assert.equal(r.status,201,await r.clone().text());return r.json()}
before(async()=>{mf=new Miniflare({modules:true,scriptPath:'dist/server/index.js',compatibilityDate:'2025-11-01',d1Databases:['DB'],r2Buckets:['BUCKET']});env=await mf.getBindings();for(const {tag}of JSON.parse(await readFile('drizzle/meta/_journal.json','utf8')).entries)await env.DB.exec(await readFile('drizzle/'+tag+'.sql','utf8'))});
after(async()=>mf?.dispose());

test('context references show relevant literal answers, scale endpoints, selected evidence and safe edit-return links',()=>{
 const p=workbook.pages[9],answers={'fit.ratings':{Relaxed:'Love it'},'fit.observe.1':'My own evidence','life.help':'Do not show an unrelated lifestyle response'};
 const before=structuredClone(answers),records=discoveries(p,answers);assert.ok(records.some(r=>r.text.includes('Relaxed: Love it')));assert.ok(!records.some(r=>r.text.includes('unrelated')));
 const items=[{id:'a',kind:'recent',title:'My outfit',url:'/api/evidence/a',annotations:{fit:'Relaxed'}},{id:'b',kind:'inspiration',title:'Unrelated inspiration',annotations:{}}];assert.deepEqual(relevantEvidence(p,items).map(x=>x.id),['a']);
 const html=renderDiscoveries(p,answers,items);assert.ok(html.includes('Your discoveries so far'));assert.ok(html.includes('return=%23%2Fstep%2F10'));assert.ok(html.includes('My outfit'));assert.ok(!html.includes('Unrelated inspiration'));assert.deepEqual(answers,before);
 answers['fit.observe.1']='New customer wording';assert.ok(renderDiscoveries(p,answers,items).includes('New customer wording'));
 const scales=renderDiscoveries(workbook.pages[26],{'dials.1':0},[]);assert.ok(scales.includes('1 of 7'));assert.ok(!scales.includes('undefined'));
 const malicious={'fit.pattern':'<script>alert(1)</script>'};assert.ok(sourcePreview({source:'fit.pattern'},malicious,'#/step/20').includes('&lt;script&gt;'));
 assert.equal(renderDiscoveries(p,{},[]),'');
});

test('batch queue previews multiple files, rejects invalid files, isolates errors and retries only failed images',async()=>{
 const revoked=[],saved=[],attempts=[],urls={createObjectURL:()=>`blob:test-${Math.random()}`,revokeObjectURL:u=>revoked.push(u)};
 const q=new UploadQueue({objectURL:urls,saved:x=>saved.push(x.id),transport:async(t,progress)=>{attempts.push(t.key);progress(50);if(t.title==='bad'&&!t.retried){t.retried=true;throw Error('offline')}return{id:t.key,url:'/api/evidence/'+t.key}}});
 q.add([new File(['a'],'good.png',{type:'image/png'}),new File(['b'],'bad.png',{type:'image/png'}),new File(['x'],'bad.heic',{type:'image/heic'})],'recent');assert.deepEqual(q.tasks.map(t=>t.status),['queued','queued','invalid']);
 await q.start();assert.deepEqual(q.tasks.map(t=>t.status),['saved','error','invalid']);assert.equal(q.tasks[0].progress,100);assert.ok(q.tasks[1].error.includes('offline'));await q.start(q.tasks[1].key);assert.deepEqual(saved,['1','2']);assert.deepEqual(attempts,['1','2','2']);assert.equal(q.pending,false);assert.equal(revoked.length,2);q.remove('3');assert.equal(q.tasks.length,2);q.dispose();
});

test('retrying an upload after a lost response returns the same private evidence item',async()=>{
 const id=crypto.randomUUID(),form=new FormData();form.set('file',png());form.set('title','Retry safely');form.set('kind','recent');form.set('uploadId',id);
 const first=await (await api('/api/evidence',{owner:'retry-safe',method:'POST',body:form})).json();const second=await (await api('/api/evidence',{owner:'retry-safe',method:'POST',body:form})).json();assert.equal(first.id,second.id);assert.equal((await (await api('/api/bootstrap',{owner:'retry-safe'})).json()).evidence.length,1);assert.equal((await api(second.url,{owner:'retry-safe'})).status,200);
});

test('evidence ordering persists atomically, isolates customers, rejects stale/duplicate orders and leaves annotations unchanged',async()=>{
 const a=await create('order','First'),b=await create('order','Second');
 const annotated=await (await api('/api/evidence/'+a.id,{owner:'order',method:'PATCH',body:{baseRevision:0,annotations:{notes:'Keep this exact note',fit:'Relaxed'}}})).json();
 const payload={items:[b,annotated].map(x=>({id:x.id,revision:x.revision}))};let r=await api('/api/evidence/order',{owner:'order',method:'PATCH',body:payload});assert.equal(r.status,200,await r.clone().text());const ordered=await r.json();assert.deepEqual(ordered.evidence.map(x=>x.title),['Second','First']);assert.equal(ordered.evidence[1].annotations.notes,'Keep this exact note');
 r=await api('/api/evidence/order',{owner:'order',method:'PATCH',body:payload});assert.equal(r.status,409);
 const bootstrap=await (await api('/api/bootstrap',{owner:'order'})).json();assert.deepEqual(bootstrap.evidence.map(x=>x.title),['Second','First']);assert.equal((await api('/api/evidence/order',{owner:'different',method:'PATCH',body:payload})).status,409);
 assert.equal((await api('/api/evidence/order',{owner:'order',method:'PATCH',body:{items:[payload.items[0],payload.items[0]]}})).status,400);
});

test('replacing an image keeps its ID, annotations, group, order and other customer records',async()=>{
 const first=await create('replace','Original','inspiration'),other=await create('replace','Other');const edited=await (await api('/api/evidence/'+first.id,{owner:'replace',method:'PATCH',body:{baseRevision:0,annotations:{feeling:['Ease'],notes:'Do not erase me'},sort:'Beautiful + Me'}})).json();
 const old=await env.DB.prepare('SELECT * FROM evidence WHERE id = ?').bind(first.id).first();const replacement=new FormData();replacement.set('file',png());replacement.set('baseRevision',edited.revision);
 assert.equal((await api('/api/evidence/'+first.id+'/image',{owner:'wrong',method:'PUT',body:replacement})).status,404);
 const r=await api('/api/evidence/'+first.id+'/image',{owner:'replace',method:'PUT',body:replacement});assert.equal(r.status,200,await r.clone().text());const next=await r.json();assert.equal(next.id,first.id);assert.equal(next.title,'Original');assert.deepEqual(next.annotations,edited.annotations);assert.equal(next.sort,edited.sort);assert.equal(next.position,edited.position);assert.notEqual(next.url,edited.url);assert.equal((await api(next.url,{owner:'replace'})).status,200);assert.equal(await env.BUCKET.get(old.object_key),null);
 assert.equal((await api('/api/evidence/'+first.id+'/image',{owner:'replace',method:'PUT',body:replacement})).status,409);assert.equal((await api(other.url,{owner:'replace'})).status,200);
 const invalid=new FormData();invalid.set('file',new File(['bad'],'fake.png',{type:'image/png'}));invalid.set('baseRevision',next.revision);assert.equal((await api('/api/evidence/'+first.id+'/image',{owner:'replace',method:'PUT',body:invalid})).status,400);const fresh=await (await api('/api/bootstrap',{owner:'replace'})).json();assert.equal(fresh.evidence.find(x=>x.id===first.id).revision,next.revision);
});

test('the additive order migration preserves an isolated copy of existing saved customer data',async t=>{
 let snapshot;try{snapshot=JSON.parse(await readFile('/workspace/scratch/blueprint-ux-snapshot.json','utf8'))}catch{t.skip('Private read-only snapshot is not present; never substitute synthetic data for this check.');return}
 const db=new Miniflare({modules:true,script:'export default { fetch(){return new Response("test")} }',compatibilityDate:'2025-11-01',d1Databases:['DB']});
 try{const {DB}=await db.getBindings();for(const n of ['0000_private_workbook','0001_assessment_and_annotations'])await DB.exec(await readFile('drizzle/'+n+'.sql','utf8'));
 for(const row of snapshot.progress){const keys=Object.keys(row);await DB.prepare(`INSERT INTO progress (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).bind(...Object.values(row)).run()}
 for(const row of snapshot.evidence){const keys=Object.keys(row);await DB.prepare(`INSERT INTO evidence (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).bind(...Object.values(row)).run()}
 const beforeProgress=(await DB.prepare('SELECT * FROM progress').all()).results,beforeEvidence=(await DB.prepare('SELECT * FROM evidence ORDER BY id').all()).results;
 await DB.exec(await readFile('drizzle/0002_evidence_display_order.sql','utf8'));
 assert.deepEqual((await DB.prepare('SELECT * FROM progress').all()).results,beforeProgress);const after=(await DB.prepare('SELECT * FROM evidence ORDER BY id').all()).results;assert.deepEqual(after.map(({display_order,...rest})=>rest),beforeEvidence);assert.ok(after.every(x=>x.display_order===0));
 for(const row of beforeProgress){const state=migrateState({...JSON.parse(row.document),revision:row.revision});const saved=JSON.stringify(state.answers);for(const p of workbook.pages){const view=renderDiscoveries(p,state.answers,after.map(x=>({id:x.id,kind:x.kind,title:x.title,reference:x.reference,annotations:JSON.parse(x.annotations||'{}'),url:x.object_key?'/api/evidence/'+x.id:null,sort:x.sort_group})));assert.ok(!view.includes('undefined'));}assert.equal(JSON.stringify(state.answers),saved);}
 // Exercise the actual Worker against another isolated copy, never the live database.
 for(const row of snapshot.progress){const keys=Object.keys(row);await env.DB.prepare(`INSERT INTO progress (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).bind(...Object.values(row)).run()}
 for(const row of snapshot.evidence){const keys=Object.keys(row);await env.DB.prepare(`INSERT INTO evidence (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).bind(...Object.values(row)).run()}
 for(const row of snapshot.progress){const owner=row.owner_id,old=migrateState({...JSON.parse(row.document),revision:row.revision});const boot=await (await api('/api/bootstrap',{owner})).json();assert.deepEqual(boot.state.answers,old.answers);assert.deepEqual(boot.state.completed,old.completed);assert.equal(boot.evidence.length,snapshot.evidence.filter(x=>x.owner_id===owner).length);assert.ok(boot.evidence.every(x=>x.url===null||x.url.startsWith('/api/evidence/')));
 const updated=await api('/api/progress',{owner,method:'PATCH',body:{baseRevision:boot.state.revision,answers:{'fit.pattern':'Isolated regression edit'}}});assert.equal(updated.status,200);const resumed=await (await api('/api/bootstrap',{owner})).json();assert.deepEqual(resumed.state.answers,{...old.answers,'fit.pattern':'Isolated regression edit'});assert.deepEqual(resumed.state.completed,old.completed);assert.equal(resumed.evidence.length,boot.evidence.length);const pdf=await api('/api/blueprint.pdf',{owner});assert.equal(pdf.status,200);assert.equal(new TextDecoder().decode(new Uint8Array(await pdf.arrayBuffer()).slice(0,5)),'%PDF-');}
 await mkdir('test-results',{recursive:true});await writeFile('test-results/existing-data-check.json',JSON.stringify({workbooks:beforeProgress.length,evidenceRecords:beforeEvidence.length,unchangedAfterMigration:true,contextScreensChecked:68},null,2));
 }finally{await db.dispose()}
});

// This is a DOM/API exercise, not browser layout or native picker verification.
test('customer selects multiple images, saves annotations, reorders, replaces and revisits contextual answers in the UI',async()=>{
 const owner='ux-dom';await api('/api/progress',{owner,method:'PATCH',body:{baseRevision:0,answers:{'fit.pattern':'Earlier saved words','dials.1':0},completed:[8,9],lastStep:10}});
 const script=await build({entryPoints:['client/app.mjs'],bundle:true,write:false,format:'iife',target:'es2022',loader:{'.css':'empty'}});
 const w=new Window({url:origin+'/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});w.document.body.innerHTML='<div id="app"></div><div id="announcements"></div>';w.structuredClone=globalThis.structuredClone;Object.defineProperty(w,'crypto',{value:globalThis.crypto});w.URL.createObjectURL=()=> 'blob:test-image';w.URL.revokeObjectURL=()=>{};w.scrollTo=()=>{};w.confirm=()=>true;w.alert=msg=>{throw Error('Unexpected alert: '+msg)};
 async function convert(fd){const out=new FormData();for(const [key,v]of fd){if(typeof v==='string')out.set(key,v);else out.set(key,new File([await v.arrayBuffer()],v.name,{type:v.type}))}return out}
 w.fetch=async(url,init={})=>api(new URL(url,origin).pathname+new URL(url,origin).search,{owner,method:init.method||'GET',body:init.body?(typeof init.body==='string'?JSON.parse(init.body):await convert(init.body)):undefined});
 w.XMLHttpRequest=class{upload={};open(method,path){this.method=method;this.path=path}async send(fd){try{this.upload.onprogress?.({lengthComputable:true,loaded:50,total:100});const r=await api(this.path,{owner,method:this.method,body:await convert(fd)});this.status=r.status;this.response=await r.json();this.onload()}catch(e){this.onerror(e)}}};
 const wait=async(check,label='UI')=>{for(let i=0;i<600;i++){if(await check())return;await new Promise(r=>setTimeout(r,15))}throw Error('Timed out: '+label)};const go=async hash=>{w.location.hash=hash;await new Promise(r=>setTimeout(r,30))};
 try{w.eval(script.outputFiles[0].text);await wait(()=>w.document.querySelector('.hero'));
 await go('#/step/25');assert.equal(w.document.querySelector('[data-id="dials.1"][value="0"]').checked,true,'First spectrum position remains selected');assert.equal(w.document.querySelectorAll('.chapter-nav[open]').length,0);
 await go('#/evidence');const picker=w.document.querySelector('#batch-images');assert.equal(picker.multiple,true);const dt=new w.DataTransfer();for(const name of ['One.png','Two.png'])dt.items.add(new w.File([await png().arrayBuffer()],name,{type:'image/png'}));picker.files=dt.files;picker.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(w.document.querySelectorAll('.upload-preview').length,2);w.document.querySelector('[data-action=upload-all]').click();await wait(()=>w.document.querySelectorAll('[data-evidence-id]').length===2,'batch saved');
 const form=w.document.querySelector('.annotation-form');form.closest('details').open=true;const note=form.querySelector('[name=notes]');note.value='Keep my unsaved observation';note.dispatchEvent(new w.Event('input',{bubbles:true}));await go('#/step/10');await go('#/evidence');assert.equal(w.document.querySelector('.annotation-form [name=notes]').value,'Keep my unsaved observation');w.document.querySelector('.annotation-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait(()=>w.document.querySelector('.annotation-status').textContent==='Observations saved privately.');
 const firstId=w.document.querySelector('[data-evidence-id]').dataset.evidenceId;w.document.querySelector('[data-action=move-image][data-direction="1"]').click();await wait(()=>w.document.querySelector('[data-evidence-id]').dataset.evidenceId!==firstId,'order saved');
 const replacement=w.document.querySelector(`[data-replace-image="${firstId}"]`);const rep=new w.DataTransfer();rep.items.add(new w.File([await png().arrayBuffer()],'Replace.png',{type:'image/png'}));replacement.files=rep.files;replacement.dispatchEvent(new w.Event('change',{bubbles:true}));w.document.querySelector('[data-action=upload-all]').click();await wait(()=>w.document.querySelectorAll('.upload-preview [role=status]').length===3&&[...w.document.querySelectorAll('.upload-preview [role=status]')].every(x=>x.textContent.includes('Saved')),'replacement saved');const boot=await (await api('/api/bootstrap',{owner})).json();assert.equal(boot.evidence.length,2);assert.equal(boot.evidence.find(x=>x.id===firstId).annotations.notes,'Keep my unsaved observation');
 await go('#/step/20');const link=w.document.querySelector('[data-reference-id="fit.pattern"] .edit-discovery');assert.ok(link);await go(link.getAttribute('href'));await wait(()=>w.document.querySelector('[data-id="fit.pattern"]'),'edit earlier');const field=w.document.querySelector('[data-id="fit.pattern"]');field.value='Revised without losing my place';field.dispatchEvent(new w.Event('input',{bubbles:true}));w.document.querySelector('[data-action=return-exercise]').click();await wait(()=>w.location.hash==='#/step/20'&&w.document.querySelector('[data-id="body.fit"]'),'return');assert.equal(w.document.querySelector('[data-id="body.fit"]').value,'Revised without losing my place');assert.ok(w.document.querySelector('[data-reference-id="fit.pattern"]').textContent.includes('Revised without losing my place'));
 const state=await (await api('/api/progress',{owner})).json();assert.equal(state.answers['fit.pattern'],'Revised without losing my place');assert.deepEqual(state.completed,[8,9]);await go('#/journey');assert.equal(w.document.querySelectorAll('.index-part').length,5);assert.equal(w.document.querySelectorAll('.editorial-preparation').length,1);assert.equal(w.document.querySelectorAll('.index-part[open],.editorial-preparation[open]').length,0);await go('#/evidence');w.document.querySelector('#evidence-form [name=reference]').value='A pending written reference';const closing=new w.Event('beforeunload',{cancelable:true});w.dispatchEvent(closing);assert.equal(closing.defaultPrevented,true);
 }finally{w.happyDOM.abort();await w.close()}
});
