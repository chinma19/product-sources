import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,rm} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import {Window} from 'happy-dom';
import {build} from 'esbuild';
import {workbook,controls,emptyState,resolveValue,blueprintFor,formatValue,validateValue,timeTotal,compassResult} from '../server/model.mjs';
let mf,env;const persistence='test-results/runtime';const options={modules:true,scriptPath:'dist/server/index.js',compatibilityDate:'2025-11-01',d1Databases:['DB'],r2Buckets:['BUCKET'],d1Persist:persistence+'/d1',r2Persist:persistence+'/r2'};
const origin='https://blueprint.test';
const api=async(path,{owner='alice',method='GET',body,headers={}}={})=>{
 const h={...(owner?{'oai-authenticated-user-id':owner,'oai-authenticated-user-email':owner+'@example.com'}:{}),...(['GET','HEAD'].includes(method)?{}:{Origin:origin}),...headers};
 if(body instanceof FormData){const encoded=new Request(origin+path,{method,body});h['Content-Type']=encoded.headers.get('Content-Type');body=await encoded.arrayBuffer()}else if(body){h['Content-Type']='application/json';body=JSON.stringify(body)}
 return mf.dispatchFetch(origin+path,{method,headers:h,body});
};
before(async()=>{await rm(persistence,{recursive:true,force:true});mf=new Miniflare(options);env=await mf.getBindings();await env.DB.exec(await readFile('drizzle/0000_private_workbook.sql','utf8'))});
after(async()=>{await mf?.dispose()});
function sample(c){
 if(c.type==='text')return 'My own observed preference';
 if(c.type==='checks')return [c.options[0]];
 if(c.type==='scale')return 4;
 if(c.type==='list')return Array(c.count).fill('Comfortable and intentional');
 if(c.type==='matrix')return Object.fromEntries(c.rows.map(row=>[row,c.options[0]]));
 if(c.type==='time')return Object.fromEntries(c.rows.map((row,i)=>[row,i===0?100:0]));
 if(c.type==='compass')return Object.fromEntries(c.rows.map(row=>[row,4]));
 if(c.type==='colours')return Object.fromEntries(c.rows.map(row=>[row,{name:'Warm brown',hex:'#4a3b32'}]));
 if(c.type==='table')return Object.fromEntries(c.rows.flatMap(row=>c.columns.map(col=>[row+'::'+col,'My recorded answer'])));
 if(['patterns','outfits'].includes(c.type))return Object.fromEntries(Array.from({length:c.count},(_,i)=>(c.type==='patterns'?['Pattern','Evidence','Meaning']:['BASE','SHAPE','BALANCE','FINISH','Why this feels like me']).map(f=>[`${i+1}::${f}`,'My own evidence'])).flat());
 return null;
}
test('all 68 approved pages and source wording are accounted for',async()=>{
 const source=JSON.parse(await readFile('sources/manuscript-pages.json','utf8'));
 assert.deepEqual(workbook.pages.map(p=>p.page),Array.from({length:68},(_,i)=>i+1));
 for(const p of workbook.pages){assert.equal(p.title,source[p.page-1].title);assert.deepEqual(p.lines,source[p.page-1].lines);for(const c of p.controls){if(c.source)assert.ok(controls.has(c.source),'Missing source '+c.source);if(!['evidence','image-sort'].includes(c.type))assert.ok(validateValue(c,sample(c)),`Invalid sample: ${c.id}`)}}
 const map=await readFile('docs/SOURCE_MAP.md','utf8');for(let i=1;i<=68;i++)assert.ok(map.includes(`| ${String(i).padStart(2,'0')} |`));
});
test('anonymous API requests are rejected; identity is never stored in browser data',async()=>{assert.equal((await api('/api/bootstrap',{owner:null})).status,401);const r=await api('/api/bootstrap');assert.equal(r.headers.get('Cache-Control'),'private, no-store');const b=await r.json();assert.equal(b.state.revision,0);assert.equal(b.user.email,'alice@example.com');assert.equal(b.state.owner,undefined)});
test('all 68 source steps complete, persist, reopen, and remain editable',async()=>{
 let s=emptyState();
 for(const p of workbook.pages){const answers=Object.fromEntries(p.controls.filter(c=>!['evidence','image-sort'].includes(c.type)).map(c=>[c.id,sample(c)]));const r=await api('/api/progress',{owner:'journey',method:'PATCH',body:{baseRevision:s.revision,answers,completed:[...s.completed,p.page],lastStep:p.page}});assert.equal(r.status,200,await r.clone().text());s=await r.json();}
 assert.equal(s.completed.length,68);assert.equal(s.revision,68);
 const reopened=await (await api('/api/progress',{owner:'journey'})).json();assert.deepEqual(reopened,s);
 const revision=s.revision;const edit=await api('/api/progress',{owner:'journey',method:'PATCH',body:{baseRevision:revision,answers:{'fit.pattern':'I prefer room to move'},lastStep:10}});assert.equal(edit.status,200);const after=await edit.json();assert.equal(after.answers['fit.pattern'],'I prefer room to move');assert.equal(after.completed.length,68);
 const exported=await (await api('/api/export',{owner:'journey'})).json();assert.equal(exported.formatVersion,1);assert.equal(exported.state.answers['fit.pattern'],'I prefer room to move');assert.ok(exported.blueprint['My Style Identity']);assert.ok(exported.blueprint['One-Glance Blueprint and How to Use Your Blueprint']);
});
test('recorded answers carry forward without generated style claims; overrides stay deliberate',()=>{
 const a={'fit.pattern':'Room at the waist','style.brief':'Relaxed shapes for my real days','qualities.core':['Ease','Softness','Contrast'],'signatures.top':['Hoops','Rolled sleeves','Flat shoes']};
 assert.equal(resolveValue('body.fit',a),'Room at the waist');assert.equal(resolveValue('identity',a),'Relaxed shapes for my real days');assert.deepEqual(resolveValue('glance.qualities',a),['Ease','Softness','Contrast']);
 assert.equal(resolveValue('style.language',a)['Fit::My preference'],'Room at the waist');
 a['fit.pattern']='A closer fit at the waist';assert.equal(resolveValue('body.fit',a),'A closer fit at the waist');a['body.fit']='My own summary';a['fit.pattern']='Changed again';assert.equal(resolveValue('body.fit',a),'My own summary');assert.equal(resolveValue('glance.style',a),'Relaxed shapes for my real days');assert.equal(blueprintFor({})['My Style Identity']['My one-sentence style identity'],'');
});
test('private responses, exports, and optimistic concurrency isolate accounts',async()=>{
 const one=await (await api('/api/progress',{owner:'isolation-a',method:'PATCH',body:{baseRevision:0,answers:{'fit.pattern':'Private A'}}})).json();
 assert.equal((await (await api('/api/progress',{owner:'isolation-b'})).json()).answers['fit.pattern'],undefined);
 const stale=await api('/api/progress',{owner:'isolation-a',method:'PATCH',body:{baseRevision:0,answers:{'fit.pattern':'Stale edit'}}});assert.equal(stale.status,409);
 assert.equal((await (await api('/api/progress',{owner:'isolation-a'})).json()).answers['fit.pattern'],'Private A');
 assert.equal((await api('/api/progress',{owner:'isolation-b',method:'PATCH',headers:{Origin:'https://evil.test'},body:{baseRevision:0,answers:{'fit.pattern':'cross-site'}}})).status,403);
 assert.equal((await api('/api/progress',{owner:'isolation-b',method:'PATCH',body:{baseRevision:0,answers:{'unknown.owner':'alice'}}})).status,400);
 assert.equal((await api('/api/progress',{owner:'isolation-b',method:'PATCH',body:{baseRevision:0,answers:{'dials.1':99}}})).status,400);
});
test('time map totals and Compass bands follow the manuscript',async()=>{
 for(const [score,band]of [[0,'DEFINITELY NOT FOR THIS WARDROBE'],[2,'PROBABLY NOT WORTH BUYING'],[3,'PAUSE & THINK'],[4,'LIKELY YES'],[5,'STRONG YES']]){
  const c=controls.get('compass.scores');const v=Object.fromEntries(c.rows.map(r=>[r,score]));const r=compassResult(v);assert.equal(r.band,band);assert.equal(r.total,score*5);
 }
 assert.equal(compassResult({}).total,null);assert.equal(timeTotal({a:50,b:50}),100);
 const bad=await api('/api/progress',{owner:'time',method:'PATCH',body:{baseRevision:0,answers:{'life.time':{'Home / everyday life':90}},completed:[37]}});assert.equal(bad.status,400);
 const good=await api('/api/progress',{owner:'time',method:'PATCH',body:{baseRevision:0,answers:{'life.time':{'Home / everyday life':100}},completed:[37]}});assert.equal(good.status,200);
});
test('private evidence upload, image retrieval, sorting, deletion, and validation',async()=>{
 const form=new FormData();form.set('title','My private outfit');form.set('kind','inspiration');form.set('file',new File([Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0])],'outfit.png',{type:'image/png'}));
 const response=await api('/api/evidence',{owner:'images-a',method:'POST',body:form});assert.equal(response.status,201,await response.clone().text());const item=await response.json();
 assert.equal((await api(item.url,{owner:'images-b'})).status,404);assert.equal((await api(item.url,{owner:null})).status,401);
 const image=await api(item.url,{owner:'images-a'});assert.equal(image.status,200);assert.equal(image.headers.get('Content-Type'),'image/png');assert.equal((await image.arrayBuffer()).byteLength,12);
 const sorted=await api('/api/evidence/'+item.id,{owner:'images-a',method:'PATCH',body:{sort:'Beautiful + Not Me'}});assert.equal((await sorted.json()).sort,'Beautiful + Not Me');
 assert.equal((await api('/api/evidence/'+item.id,{owner:'images-b',method:'DELETE'})).status,404);
 assert.equal((await api('/api/evidence/'+item.id,{owner:'images-a',method:'DELETE'})).status,200);assert.equal((await api(item.url,{owner:'images-a'})).status,404);
 const ref=await api('/api/evidence',{owner:'images-a',method:'POST',body:{kind:'recent',title:'Remembered outfit',reference:'The linen outfit I wore on Tuesday'}});assert.equal(ref.status,201);
 const bad=new FormData();bad.set('kind','recent');bad.set('title','Bad');bad.set('file',new File(['<svg onload=alert(1)>'],'fake.png',{type:'image/png'}));assert.equal((await api('/api/evidence',{owner:'images-a',method:'POST',body:bad})).status,400);
 assert.equal((await api('/api/evidence',{owner:'images-a',method:'POST',body:{kind:'recent'}})).status,400);
});
test('every client route renders, saves an entry, returns to it, and shows final transfers',async()=>{
 const script=await build({entryPoints:['client/app.mjs'],bundle:true,write:false,format:'iife',target:'es2022',loader:{'.css':'empty'}});
 let printed=0;
 const w=new Window({url:origin+'/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 w.document.body.innerHTML='<div id="app"></div><div id="print-content"></div><div id="announcements"></div>';
 w.print=()=>printed++;w.scrollTo=()=>{};w.confirm=()=>true;w.alert=msg=>{throw Error('Unexpected alert: '+msg)};
 w.fetch=async(input,init={})=>{const url=typeof input==='string'?input:input.url;const path=new URL(url,origin).pathname;return api(path,{owner:'dom-user',method:init.method||'GET',headers:init.headers||{},body:init.body?JSON.parse(init.body):undefined})};
 const eventually=async(check)=>{for(let i=0;i<500;i++){if(await check())return;await new Promise(r=>setTimeout(r,20))}throw Error('DOM timed out: '+w.document.body.textContent.slice(0,500))};
 w.eval(script.outputFiles[0].text);await eventually(()=>w.document.querySelector('.hero'));
 assert.ok(w.document.querySelector('.hero'));
 for(let n=1;n<=68;n++){
  w.location.hash='#/step/'+n;await eventually(()=>w.document.querySelector('.step-main h1')?.textContent===pageBy(n).title);await w.happyDOM.whenAsyncComplete();
  assert.equal(w.document.querySelector('.step-main h1')?.textContent,pageBy(n).title);assert.ok(w.document.querySelector('.original-guidance'));assert.ok(w.document.querySelector('[data-action=complete]'));
  for(const label of w.document.querySelectorAll('label[for]'))assert.ok(w.document.getElementById(label.htmlFor));
 }
 w.location.hash='#/step/10';await w.happyDOM.whenAsyncComplete();let field=w.document.querySelector('[data-id="fit.pattern"]');field.value='I like room to move';field.dispatchEvent(new w.Event('input',{bubbles:true}));w.document.querySelector('[data-action=save]').click();await eventually(()=>w.document.querySelector('#save-status')?.dataset.status==='saved');
 w.location.hash='#/step/20';await w.happyDOM.whenAsyncComplete();assert.equal(w.document.querySelector('[data-id="body.fit"]').value,'I like room to move');
 w.location.hash='#/step/10';await w.happyDOM.whenAsyncComplete();assert.equal(w.document.querySelector('[data-id="fit.pattern"]').value,'I like room to move');
 w.location.hash='#/blueprint';await w.happyDOM.whenAsyncComplete();assert.ok(w.document.querySelector('.glance-dossier'));assert.ok(w.document.querySelector('[data-action=png]'));assert.ok(w.document.querySelector('[data-action=print]'));w.document.querySelector('[data-action=print]').click();await eventually(()=>printed===1);assert.ok(w.document.querySelector('#print-content').textContent.includes('My Personal Style Blueprint'));
 const state=await (await api('/api/progress',{owner:'dom-user'})).json();assert.equal(state.answers['fit.pattern'],'I like room to move');
 w.happyDOM.abort();await w.close();
 function pageBy(n){return workbook.pages[n-1]}
});

test('durable progress survives a Worker restart and export stays complete',async()=>{
 const prior=await (await api('/api/progress',{owner:'journey'})).json();assert.equal(prior.completed.length,68);
 await mf.dispose();mf=new Miniflare(options);env=await mf.getBindings();
 const restored=await (await api('/api/progress',{owner:'journey'})).json();assert.deepEqual(restored,prior);
 const exported=await (await api('/api/export',{owner:'journey'})).json();assert.ok(exported.blueprint['My Personal Outfit Directions']);assert.ok(exported.blueprint['Personal Style Compass']);
});
test('future purchase-verification boundary blocks accounts without explicit entitlement',async()=>{
 const secured=new Miniflare({...options,bindings:{REQUIRE_ENTITLEMENT:'true'}});
 try{
  let r=await secured.dispatchFetch(origin+'/api/bootstrap',{headers:{'oai-authenticated-user-id':'buyer'}});assert.equal(r.status,403);
  const b=await secured.getBindings();await b.DB.prepare('INSERT INTO entitlements(owner_id,status,source,updated_at) VALUES (?, ?, ?, ?)').bind('buyer','active','manual-test',new Date().toISOString()).run();
  r=await secured.dispatchFetch(origin+'/api/bootstrap',{headers:{'oai-authenticated-user-id':'buyer'}});assert.equal(r.status,200);
 }finally{await secured.dispose()}
});
