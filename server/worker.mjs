import {workbook,controls,emptyState,migrateState,applyPatch,blueprintFor,validatePatch,selectionRestorePatch} from './model.mjs';
import {candidatePatterns,validateAnnotations,evidenceSummary} from './synthesis.mjs';
import {generateBlueprintPDF} from './pdf.mjs';
import {blueprintSections,profileObjects} from './blueprint.mjs';
import {imageData,evidenceOrder} from './evidence.mjs';
import {assets} from './assets.generated.mjs';
import {buildInfo,selectionProtocol} from '../shared/release.mjs';
export const securityHeaders={ 'X-IHF-Release':buildInfo.releaseId, 'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Cache-Control':'private, no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self' https://*.chatgpt.com https://chatgpt.com",'Permissions-Policy':'camera=(), microphone=(), geolocation=()'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...securityHeaders,'Content-Type':'application/json'}});
class HttpError extends Error{constructor(status,message){super(message);this.status=status}}
async function boundedRequest(req,max){const length=Number(req.headers.get('Content-Length'));if(length>max)throw new HttpError(413,'This request is too large.');if(!req.body)return req;const reader=req.body.getReader(),chunks=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new HttpError(413,'This request is too large.')}chunks.push(value)}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}return new Request(req,{body:bytes})}
async function bodyJson(req){const txt=await req.text();if(txt.length>500000)throw new HttpError(413,'Responses are too large. Export a backup and shorten long entries.');try{return JSON.parse(txt)}catch{throw new HttpError(400,'Invalid JSON body.')}}
const cleanText=(v,max=250)=>typeof v==='string'?v.trim().slice(0,max):'';
const assetPath=id=>'/api/evidence/'+id;
function safeAsset(row){return {id:row.id,title:row.title,kind:row.kind,reference:row.reference,sort:row.sort_group,position:row.display_order||0,url:row.object_key?assetPath(row.id)+'?v='+(row.revision||0):null,createdAt:row.created_at,annotations:JSON.parse(row.annotations||'{}'),revision:row.revision||0,updatedAt:row.updated_at||row.created_at};}
async function load(env,owner){const r=await env.DB.prepare('SELECT * FROM progress WHERE owner_id = ?').bind(owner).first();return r?migrateState({...JSON.parse(r.document),assessmentId:r.assessment_id||null,status:r.status||'IN_PROGRESS',createdAt:r.created_at||null,completedAt:r.completed_at||null,revision:r.revision,updatedAt:r.updated_at}):emptyState()}
async function recoveryDescriptor(owner){const digest=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(v=>v.toString(16).padStart(2,'0')).join('');return {name:await digest('inherfashion-cache-v2:'+owner),secret:await digest('inherfashion-recovery-key-v2:'+owner)}}
async function saveState(env,owner,current,body){
 let next;try{next=applyPatch(current,body)}catch(e){throw new HttpError(400,e.message)}
 const revision=current.revision+1,now=new Date().toISOString(),assessmentId=current.assessmentId||crypto.randomUUID(),createdAt=current.createdAt||now;
 const status=next.completed.length===68?'COMPLETED':'IN_PROGRESS',completedAt=status==='COMPLETED'?(current.completedAt||now):null;
 const answerUpdatedAt={...current.answerUpdatedAt,...Object.fromEntries(Object.keys(body.answers||{}).map(k=>[k,now]))};
 next={...next,schemaVersion:3,assessmentId,createdAt,completedAt,status,answerUpdatedAt};
 const document=JSON.stringify({schemaVersion:3,bindingState:next.bindingState,answers:next.answers,completed:next.completed,lastStep:next.lastStep,answerUpdatedAt});
 if(new TextEncoder().encode(document).length>1500000)throw new HttpError(413,'Your written responses are too large to save together. Export your backup and shorten longer entries.');
 let result;
 if(current.revision===0)result=await env.DB.prepare('INSERT INTO progress (owner_id, document, revision, updated_at, assessment_id, created_at, completed_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(owner_id) DO NOTHING').bind(owner,document,revision,now,assessmentId,createdAt,completedAt,status).run();
 else result=await env.DB.prepare('UPDATE progress SET document = ?, revision = ?, updated_at = ?, assessment_id = ?, created_at = ?, completed_at = ?, status = ? WHERE owner_id = ? AND revision = ?').bind(document,revision,now,assessmentId,createdAt,completedAt,status,owner,current.revision).run();
 return result.meta.changes?{...next,revision,updatedAt:now}:null;
}
function authorized(req){const owner=req.headers.get('oai-authenticated-user-id');if(!owner||owner.length>256)throw new HttpError(401,'Sign in to keep your Blueprint private and save your progress.');return owner}
async function entitlement(env,owner){if(env.REQUIRE_ENTITLEMENT==='true'){const r=await env.DB.prepare("SELECT status FROM entitlements WHERE owner_id = ? AND status = 'active'").bind(owner).first();if(!r)throw new HttpError(403,'Your account does not yet have access. Contact In Her Fashion.')}}
function sameOrigin(req){const o=req.headers.get('Origin');if(o!==new URL(req.url).origin||req.headers.get('Sec-Fetch-Site')==='cross-site')throw new HttpError(403,'This request must come from your Blueprint.');}
async function api(req,env,path){
 const owner=authorized(req);await entitlement(env,owner);
 if(!['GET','HEAD'].includes(req.method))sameOrigin(req);
 if(path==='/api/bootstrap'&&req.method==='GET'){
  const state=await load(env,owner);const {results}=await env.DB.prepare('SELECT * FROM evidence WHERE owner_id = ? ORDER BY '+evidenceOrder).bind(owner).all();
  const email=req.headers.get('oai-authenticated-user-email')||'';
  const items=results.map(safeAsset);return json({user:{email,name:email.split('@')[0]||'Your private workbook'},state,evidence:items,evidenceSummary:evidenceSummary(items),recovery:await recoveryDescriptor(owner),content:workbook});
 }
 if(path==='/api/progress'&&req.method==='GET')return json(await load(env,owner));
 if(path==='/api/progress'&&req.method==='PATCH'){
  const protocol=req.headers.get('X-IHF-Selection-Protocol')||'';
  if(protocol&&protocol!==String(selectionProtocol))throw new HttpError(426,'This workbook version needs an update. Your changes are still in this tab; keep it open and try saving again after the update is available.');
  let body=await bodyJson(req);const current=await load(env,owner);
  if(body.baseRevision!==current.revision)return json({error:'Another session saved newer answers. Review the latest version before keeping your edits.',current},409);
  if(!protocol){
   // An already-open older workbook cannot label its historical arrays. Preserve its whole atomic
   // save, including unrelated entries, while the updated interface offers conflicting choices for review.
   try{
    if(body.restoreSelectionConflicts!==undefined){const ids=body.restoreSelectionConflicts,answers=Array.isArray(ids)?Object.fromEntries(ids.filter(id=>Object.hasOwn(body.answers||{},id)).map(id=>[id,body.answers[id]])):{};validatePatch({baseRevision:body.baseRevision,answers,restoreSelectionConflicts:ids});}
    body=selectionRestorePatch(body);
   }catch(e){throw new HttpError(400,e.message)}
  }
  if(body.answers?.['synthesis.decisions']){const {results}=await env.DB.prepare('SELECT * FROM evidence WHERE owner_id = ?').bind(owner).all();const candidates=candidatePatterns({...current.answers,...body.answers},results.map(safeAsset));const valid=new Set(candidates.map(c=>c.term));if(body.answers['synthesis.decisions'].some(d=>!valid.has(d.term)))throw new HttpError(400,'Your evidence has changed. Refresh the suggested patterns before confirming them.');}
  const next=await saveState(env,owner,current,body);
  if(!next)return json({error:'Another session saved first. Review the latest answers.',current:await load(env,owner)},409);
  const response=json(next);response.headers.set('X-IHF-Selection-Protocol',String(selectionProtocol));return response;
 }
 if(path==='/api/blueprint.pdf'&&req.method==='GET'){
  const state=await load(env,owner);const bytes=p=>Uint8Array.from(atob(assets[p].data),c=>c.charCodeAt(0));let pdf;try{pdf=await generateBlueprintPDF(state.answers,{body:bytes('/assets/DM-Sans.ttf'),display:bytes('/assets/Cormorant-Garamond.ttf')},{glance:new URL(req.url).searchParams.get('view')==='glance',bindingState:state.bindingState})}catch(e){throw new HttpError(e.status||500,e.message)}
  return new Response(pdf,{headers:{...securityHeaders,'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="My-Personal-Style-Blueprint.pdf"'}});
 }
 if(path==='/api/blueprint'&&req.method==='GET'){const s=await load(env,owner);return json({sections:blueprintSections(s.answers,{bindingState:s.bindingState}),profiles:profileObjects(s.answers,s.bindingState),revision:s.revision})}
 if(path==='/api/export'&&req.method==='GET'){
  const state=await load(env,owner);return new Response(JSON.stringify({product:'In Her Fashion Personal Style Blueprint',formatVersion:1,exportedAt:new Date().toISOString(),state,blueprint:blueprintFor(state.answers,state.bindingState),sections:blueprintSections(state.answers,{bindingState:state.bindingState}),profiles:profileObjects(state.answers,state.bindingState),responses:Object.entries(state.answers).map(([field,value])=>({assessmentId:state.assessmentId,exerciseId:workbook.pages.find(p=>p.controls.some(c=>c.id===field))?.page||null,field,value,updatedAt:state.answerUpdatedAt?.[field]||null})),evidence:(await env.DB.prepare('SELECT * FROM evidence WHERE owner_id = ? ORDER BY '+evidenceOrder).bind(owner).all()).results.map(safeAsset)},null,2),{headers:{...securityHeaders,'Content-Type':'application/json','Content-Disposition':'attachment; filename="My-Personal-Style-Blueprint.json"'}});
 }
 if(path==='/api/evidence'&&req.method==='POST'){
  const contentType=req.headers.get('Content-Type')||'';let file=null,data;
  if(contentType.includes('multipart/form-data')){if(Number(req.headers.get('Content-Length'))>8500000)throw new HttpError(413,'Please choose an image under 8 MB.');const form=await req.formData();file=form.get('file');data={title:form.get('title'),kind:form.get('kind'),reference:form.get('reference'),uploadId:form.get('uploadId')};}
  else data=await bodyJson(req);
  if(data.uploadId!=null&&!/^[a-f0-9-]{36}$/.test(data.uploadId))throw new HttpError(400,'Invalid upload identifier.');
  if(data.uploadId){const existing=await env.DB.prepare('SELECT * FROM evidence WHERE id = ? AND owner_id = ?').bind(data.uploadId,owner).first();if(existing)return json(safeAsset(existing),201)}
  const count=await env.DB.prepare('SELECT count(*) AS n FROM evidence WHERE owner_id = ?').bind(owner).first();if(count.n>=40)throw new HttpError(400,'Your evidence library holds up to 40 items. Remove an item before adding another.');
  const kind=data.kind;if(!['recent','inspiration'].includes(kind))throw new HttpError(400,'Choose Recent Outfits or Inspiration.');
  const title=cleanText(data.title)||'Untitled evidence';let reference=cleanText(data.reference,1500);
  if(reference&&!/^https?:\/\//i.test(reference)&&reference.length>1000)throw new HttpError(400,'Keep written references under 1,000 characters.');
  const id=data.uploadId||crypto.randomUUID();let key=null,mime=null,size=0;
  if(file){
   let image;try{image=await imageData(file)}catch(e){throw new HttpError(400,e.message)}
   key='private/'+crypto.randomUUID();mime=image.mime;size=image.size;await env.BUCKET.put(key,image.bytes,{httpMetadata:{contentType:mime}});
  }else if(!reference)throw new HttpError(400,'Add an image or a written/link reference.');
  const position=(await env.DB.prepare('SELECT COALESCE(MAX(display_order), -1) + 1 AS n FROM evidence WHERE owner_id = ?').bind(owner).first()).n;
  const now=new Date().toISOString();try{await env.DB.prepare('INSERT INTO evidence (id, owner_id, object_key, mime, byte_size, title, kind, reference, sort_group, created_at, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id,owner,key,mime,size,title,kind,reference,'',now,position).run()}catch(e){if(key)await env.BUCKET.delete(key);if(data.uploadId){const existing=await env.DB.prepare('SELECT * FROM evidence WHERE id = ? AND owner_id = ?').bind(id,owner).first();if(existing)return json(safeAsset(existing),201)}throw e}
  return json({id,title,kind,reference,sort:'',position,url:key?assetPath(id)+'?v=0':null,createdAt:now,annotations:{},revision:0,updatedAt:now},201);
 }
 if(path==='/api/evidence/order'&&req.method==='PATCH'){
  const b=await bodyJson(req);const items=b.items;
  if(!Array.isArray(items)||items.length===0||items.length>40||new Set(items.map(x=>x?.id)).size!==items.length||!items.every(x=>x&&/^[a-f0-9-]{36}$/.test(x.id)&&Number.isInteger(x.revision)&&x.revision>=0))throw new HttpError(400,'Choose a valid evidence order.');
  // One guarded statement: all positions change together, or none do, even across tabs.
  const payload=JSON.stringify(items),now=new Date().toISOString();
  const result=await env.DB.prepare(`UPDATE evidence SET display_order = (SELECT CAST(j.key AS INTEGER) FROM json_each(?) j WHERE json_extract(j.value, '$.id') = evidence.id), revision = revision + 1, updated_at = ? WHERE owner_id = ? AND (SELECT COUNT(*) FROM evidence WHERE owner_id = ?) = ? AND NOT EXISTS (SELECT 1 FROM json_each(?) j LEFT JOIN evidence e ON e.id = json_extract(j.value, '$.id') AND e.owner_id = ? WHERE e.id IS NULL OR e.revision != json_extract(j.value, '$.revision'))`).bind(payload,now,owner,owner,items.length,payload,owner).run();
  if(result.meta.changes!==items.length)throw new HttpError(409,'Your library changed in another session. Reload it before rearranging.');
  return json({evidence:(await env.DB.prepare('SELECT * FROM evidence WHERE owner_id = ? ORDER BY '+evidenceOrder).bind(owner).all()).results.map(safeAsset)});
 }
 const replacement=path.match(/^\/api\/evidence\/([a-f0-9-]{36})\/image$/);
 if(replacement&&req.method==='PUT'){
  const row=await env.DB.prepare('SELECT * FROM evidence WHERE id = ? AND owner_id = ?').bind(replacement[1],owner).first();if(!row)throw new HttpError(404,'This evidence item is not available.');
  if(!(req.headers.get('Content-Type')||'').includes('multipart/form-data'))throw new HttpError(400,'Choose an image file to replace this image.');
  const form=await req.formData();if(!/^\d+$/.test(String(form.get('baseRevision')))||Number(form.get('baseRevision'))!==row.revision)throw new HttpError(409,'This image changed in another session. Reload before replacing it.');
  let image;try{image=await imageData(form.get('file'))}catch(e){throw new HttpError(400,e.message)}
  const key='private/'+crypto.randomUUID(),now=new Date().toISOString();await env.BUCKET.put(key,image.bytes,{httpMetadata:{contentType:image.mime}});
  try{const result=await env.DB.prepare('UPDATE evidence SET object_key = ?, mime = ?, byte_size = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND owner_id = ? AND revision = ?').bind(key,image.mime,image.size,now,row.id,owner,row.revision).run();if(!result.meta.changes)throw new HttpError(409,'This image changed. Reload before replacing it.');}catch(e){await env.BUCKET.delete(key);throw e}
  if(row.object_key)await env.BUCKET.delete(row.object_key);
  return json(safeAsset({...row,object_key:key,mime:image.mime,byte_size:image.size,revision:row.revision+1,updated_at:now}));
 }
 const match=path.match(/^\/api\/evidence\/([a-f0-9-]{36})$/);
 if(match){
  const row=await env.DB.prepare('SELECT * FROM evidence WHERE id = ? AND owner_id = ?').bind(match[1],owner).first();if(!row)throw new HttpError(404,'This evidence item is not available.');
  if(req.method==='GET'){
   if(!row.object_key)throw new HttpError(404,'This item is a reference, not an uploaded image.');const obj=await env.BUCKET.get(row.object_key);if(!obj)throw new HttpError(404,'Image not found.');
   return new Response(obj.body,{headers:{...securityHeaders,'Content-Type':row.mime,'Content-Disposition':'inline','Content-Length':String(row.byte_size)}});
  }
  if(req.method==='PATCH'){
   const b=await bodyJson(req);if(b.sort!==undefined&&!['','Beautiful + Me','Beautiful + Not Me','Interesting + Maybe Me','Not For Me'].includes(b.sort))throw new HttpError(400,'Choose an approved inspiration group.');
   if(b.annotations!==undefined&&!validateAnnotations(row.kind,b.annotations))throw new HttpError(400,'Check the evidence annotations and their field limits.');
   if(b.baseRevision!==undefined&&b.baseRevision!==row.revision)return json({error:'This evidence item changed in another session. Reload before editing.',current:safeAsset(row)},409);
   const now=new Date().toISOString(),annotation=b.annotations??JSON.parse(row.annotations||'{}'),sort=b.sort??row.sort_group;
   const result=await env.DB.prepare('UPDATE evidence SET sort_group = ?, annotations = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND owner_id = ? AND revision = ?').bind(sort,JSON.stringify(annotation),now,row.id,owner,row.revision).run();
   if(!result.meta.changes)throw new HttpError(409,'This evidence item changed. Reload and try again.');
   return json(safeAsset({...row,sort_group:sort,annotations:JSON.stringify(annotation),revision:row.revision+1,updated_at:now}));
  }
  if(req.method==='DELETE'){if(row.object_key)await env.BUCKET.delete(row.object_key);await env.DB.prepare('DELETE FROM evidence WHERE id = ? AND owner_id = ?').bind(row.id,owner).run();return json({deleted:true})}
 }
 throw new HttpError(404,'That page is not available.');
}
export default {async fetch(req,env){
 try{
  const path=new URL(req.url).pathname;
  if(path==='/api/version'&&['GET','HEAD'].includes(req.method))return req.method==='HEAD'?new Response(null,{headers:{...securityHeaders,'Content-Type':'application/json','X-IHF-Release':buildInfo.releaseId}}):json(buildInfo);
  if(path.startsWith('/api/')){if(['POST','PATCH','PUT'].includes(req.method))req=await boundedRequest(req,path==='/api/evidence'||path.endsWith('/image')?8500000:500000);return await api(req,env,path);}
  const file=assets[path==='/'?'/index.html':path];
  if(!file){
   // A document fetched just before publication can request its old asset afterward.
   // Redirect without caching the old URL; never label new bytes with an old hash.
   const previous=/^\/assets\/app-[A-Za-z0-9_-]+\.(js|css)$/.exec(path);
   const current=previous?buildInfo.assets?.[previous[1]==='js'?'script':'stylesheet']?.path:null;
   if(current&&current!==path)return new Response(null,{status:307,headers:{...securityHeaders,Location:current}});
   return new Response('Not found',{status:404,headers:securityHeaders});
  }
  const versioned=Object.values(buildInfo.assets||{}).some(asset=>asset?.path===path);
  const legacyApp=path==='/assets/app.js'||path==='/assets/app.css';
  const cache=versioned?'private, max-age=31536000, immutable':legacyApp?'private, no-store':path.startsWith('/assets/')?'public, max-age=86400':'private, no-store';
  const bytes=Uint8Array.from(atob(file.data),c=>c.charCodeAt(0));return new Response(req.method==='HEAD'?null:bytes,{headers:{...securityHeaders,'Content-Type':file.type,'Cache-Control':cache,'X-IHF-Release':buildInfo.releaseId}});
 }catch(e){if(e instanceof HttpError)return json({error:e.message},e.status);console.error('Blueprint request failed',e.name);return json({error:'We could not complete that request. Your saved progress is safe. Please try again.'},500)}
}};
