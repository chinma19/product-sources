import {workbook,controls,emptyState,migrateState,applyPatch,blueprintFor} from './model.mjs';
import {candidatePatterns,validateAnnotations,evidenceSummary} from './synthesis.mjs';
import {generateBlueprintPDF} from './pdf.mjs';
import {blueprintSections,profileObjects} from './blueprint.mjs';
import {assets} from './assets.generated.mjs';
export const securityHeaders={ 'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Cache-Control':'private, no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self' https://*.chatgpt.com https://chatgpt.com",'Permissions-Policy':'camera=(), microphone=(), geolocation=()'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...securityHeaders,'Content-Type':'application/json'}});
class HttpError extends Error{constructor(status,message){super(message);this.status=status}}
async function boundedRequest(req,max){const length=Number(req.headers.get('Content-Length'));if(length>max)throw new HttpError(413,'This request is too large.');if(!req.body)return req;const reader=req.body.getReader(),chunks=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new HttpError(413,'This request is too large.')}chunks.push(value)}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}return new Request(req,{body:bytes})}
async function bodyJson(req){const txt=await req.text();if(txt.length>500000)throw new HttpError(413,'Responses are too large. Export a backup and shorten long entries.');try{return JSON.parse(txt)}catch{throw new HttpError(400,'Invalid JSON body.')}}
const cleanText=(v,max=250)=>typeof v==='string'?v.trim().slice(0,max):'';
const assetPath=id=>'/api/evidence/'+id;
function safeAsset(row){return {id:row.id,title:row.title,kind:row.kind,reference:row.reference,sort:row.sort_group,url:row.object_key?assetPath(row.id):null,createdAt:row.created_at,annotations:JSON.parse(row.annotations||'{}'),revision:row.revision||0,updatedAt:row.updated_at||row.created_at};}
async function load(env,owner){const r=await env.DB.prepare('SELECT * FROM progress WHERE owner_id = ?').bind(owner).first();return r?migrateState({...JSON.parse(r.document),assessmentId:r.assessment_id||null,status:r.status||'IN_PROGRESS',createdAt:r.created_at||null,completedAt:r.completed_at||null,revision:r.revision,updatedAt:r.updated_at}):emptyState()}
async function recoveryDescriptor(owner){const digest=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(v=>v.toString(16).padStart(2,'0')).join('');return {name:await digest('inherfashion-cache-v2:'+owner),secret:await digest('inherfashion-recovery-key-v2:'+owner)}}
async function saveState(env,owner,current,body){
 let next;try{next=applyPatch(current,body)}catch(e){throw new HttpError(400,e.message)}
 const revision=current.revision+1,now=new Date().toISOString(),assessmentId=current.assessmentId||crypto.randomUUID(),createdAt=current.createdAt||now;
 const status=next.completed.length===68?'COMPLETED':'IN_PROGRESS',completedAt=status==='COMPLETED'?(current.completedAt||now):null;
 const answerUpdatedAt={...current.answerUpdatedAt,...Object.fromEntries(Object.keys(body.answers||{}).map(k=>[k,now]))};
 next={...next,schemaVersion:2,assessmentId,createdAt,completedAt,status,answerUpdatedAt};
 const document=JSON.stringify({schemaVersion:2,answers:next.answers,completed:next.completed,lastStep:next.lastStep,answerUpdatedAt});
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
  const state=await load(env,owner);const {results}=await env.DB.prepare('SELECT * FROM evidence WHERE owner_id = ? ORDER BY created_at ASC').bind(owner).all();
  const email=req.headers.get('oai-authenticated-user-email')||'';
  const items=results.map(safeAsset);return json({user:{email,name:email.split('@')[0]||'Your private workbook'},state,evidence:items,evidenceSummary:evidenceSummary(items),recovery:await recoveryDescriptor(owner),content:workbook});
 }
 if(path==='/api/progress'&&req.method==='GET')return json(await load(env,owner));
 if(path==='/api/progress'&&req.method==='PATCH'){
  const body=await bodyJson(req),current=await load(env,owner);
  if(body.baseRevision!==current.revision)return json({error:'Another session saved newer answers. Review the latest version before keeping your edits.',current},409);
  if(body.answers?.['synthesis.decisions']){const {results}=await env.DB.prepare('SELECT * FROM evidence WHERE owner_id = ?').bind(owner).all();const candidates=candidatePatterns({...current.answers,...body.answers},results.map(safeAsset));const valid=new Set(candidates.map(c=>c.term));if(body.answers['synthesis.decisions'].some(d=>!valid.has(d.term)))throw new HttpError(400,'Your evidence has changed. Refresh the suggested patterns before confirming them.');}
  const next=await saveState(env,owner,current,body);
  if(!next)return json({error:'Another session saved first. Review the latest answers.',current:await load(env,owner)},409);
  return json(next);
 }
 if(path==='/api/blueprint.pdf'&&req.method==='GET'){
  const state=await load(env,owner);const bytes=p=>Uint8Array.from(atob(assets[p].data),c=>c.charCodeAt(0));let pdf;try{pdf=await generateBlueprintPDF(state.answers,{body:bytes('/assets/DM-Sans.ttf'),display:bytes('/assets/Cormorant-Garamond.ttf')},{glance:new URL(req.url).searchParams.get('view')==='glance'})}catch(e){throw new HttpError(e.status||500,e.message)}
  return new Response(pdf,{headers:{...securityHeaders,'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="My-Personal-Style-Blueprint.pdf"'}});
 }
 if(path==='/api/blueprint'&&req.method==='GET'){const s=await load(env,owner);return json({sections:blueprintSections(s.answers),profiles:profileObjects(s.answers),revision:s.revision})}
 if(path==='/api/export'&&req.method==='GET'){
  const state=await load(env,owner);return new Response(JSON.stringify({product:'In Her Fashion Personal Style Blueprint',formatVersion:1,exportedAt:new Date().toISOString(),state,blueprint:blueprintFor(state.answers),sections:blueprintSections(state.answers),profiles:profileObjects(state.answers),responses:Object.entries(state.answers).map(([field,value])=>({assessmentId:state.assessmentId,exerciseId:workbook.pages.find(p=>p.controls.some(c=>c.id===field))?.page||null,field,value,updatedAt:state.answerUpdatedAt?.[field]||null})),evidence:(await env.DB.prepare('SELECT * FROM evidence WHERE owner_id = ? ORDER BY created_at ASC').bind(owner).all()).results.map(safeAsset)},null,2),{headers:{...securityHeaders,'Content-Type':'application/json','Content-Disposition':'attachment; filename="My-Personal-Style-Blueprint.json"'}});
 }
 if(path==='/api/evidence'&&req.method==='POST'){
  const count=await env.DB.prepare('SELECT count(*) AS n FROM evidence WHERE owner_id = ?').bind(owner).first();if(count.n>=40)throw new HttpError(400,'Your evidence library holds up to 40 items. Remove an item before adding another.');
  const contentType=req.headers.get('Content-Type')||'';let file=null,data;
  if(contentType.includes('multipart/form-data')){if(Number(req.headers.get('Content-Length'))>8500000)throw new HttpError(413,'Please choose an image under 8 MB.');const form=await req.formData();file=form.get('file');data={title:form.get('title'),kind:form.get('kind'),reference:form.get('reference')};}
  else data=await bodyJson(req);
  const kind=data.kind;if(!['recent','inspiration'].includes(kind))throw new HttpError(400,'Choose Recent Outfits or Inspiration.');
  const title=cleanText(data.title)||'Untitled evidence';let reference=cleanText(data.reference,1500);
  if(reference&&!/^https?:\/\//i.test(reference)&&reference.length>1000)throw new HttpError(400,'Keep written references under 1,000 characters.');
  const id=crypto.randomUUID();let key=null,mime=null,size=0;
  if(file){
   if(!(file instanceof File)||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8000000||file.size===0)throw new HttpError(400,'Use a JPG, PNG or WebP image under 8 MB.');
   const bytes=new Uint8Array(await file.arrayBuffer());const valid=file.type==='image/png'?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:file.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216:bytes[0]===82&&bytes[1]===73&&bytes[2]===70&&bytes[3]===70&&bytes[8]===87&&bytes[9]===69&&bytes[10]===66&&bytes[11]===80;
   if(!valid)throw new HttpError(400,'This file does not match its image format.');
   key='private/'+id;mime=file.type;size=file.size;await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:mime}});
  }else if(!reference)throw new HttpError(400,'Add an image or a written/link reference.');
  const now=new Date().toISOString();try{await env.DB.prepare('INSERT INTO evidence (id, owner_id, object_key, mime, byte_size, title, kind, reference, sort_group, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id,owner,key,mime,size,title,kind,reference,'',now).run()}catch(e){if(key)await env.BUCKET.delete(key);throw e}
  return json({id,title,kind,reference,sort:'',url:key?assetPath(id):null,createdAt:now,annotations:{},revision:0,updatedAt:now},201);
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
   return json({...safeAsset(row),sort,annotations:annotation,revision:row.revision+1,updatedAt:now});
  }
  if(req.method==='DELETE'){if(row.object_key)await env.BUCKET.delete(row.object_key);await env.DB.prepare('DELETE FROM evidence WHERE id = ? AND owner_id = ?').bind(row.id,owner).run();return json({deleted:true})}
 }
 throw new HttpError(404,'That page is not available.');
}
export default {async fetch(req,env){
 try{
  const path=new URL(req.url).pathname;
  if(path.startsWith('/api/')){if(['POST','PATCH'].includes(req.method))req=await boundedRequest(req,path==='/api/evidence'?8500000:500000);return await api(req,env,path);}
  const file=assets[path==='/'?'/index.html':path];if(!file)return new Response('Not found',{status:404,headers:securityHeaders});
  const bytes=Uint8Array.from(atob(file.data),c=>c.charCodeAt(0));return new Response(req.method==='HEAD'?null:bytes,{headers:{...securityHeaders,'Content-Type':file.type,...(path.startsWith('/assets/')?{'Cache-Control':'public, max-age=86400'}:{})}});
 }catch(e){if(e instanceof HttpError)return json({error:e.message},e.status);console.error('Blueprint request failed',e.name);return json({error:'We could not complete that request. Your saved progress is safe. Please try again.'},500)}
}};
