import {workbook,emptyState,applyPatch,blueprintFor} from './model.mjs';
import {assets} from './assets.generated.mjs';
export const securityHeaders={ 'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Cache-Control':'private, no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self' https://*.chatgpt.com https://chatgpt.com",'Permissions-Policy':'camera=(), microphone=(), geolocation=()'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...securityHeaders,'Content-Type':'application/json'}});
class HttpError extends Error{constructor(status,message){super(message);this.status=status}}
async function boundedRequest(req,max){const length=Number(req.headers.get('Content-Length'));if(length>max)throw new HttpError(413,'This request is too large.');if(!req.body)return req;const reader=req.body.getReader(),chunks=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new HttpError(413,'This request is too large.')}chunks.push(value)}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}return new Request(req,{body:bytes})}
async function bodyJson(req){const txt=await req.text();if(txt.length>500000)throw new HttpError(413,'Responses are too large. Export a backup and shorten long entries.');try{return JSON.parse(txt)}catch{throw new HttpError(400,'Invalid JSON body.')}}
const cleanText=(v,max=250)=>typeof v==='string'?v.trim().slice(0,max):'';
const assetPath=id=>'/api/evidence/'+id;
function safeAsset(row){return {id:row.id,title:row.title,kind:row.kind,reference:row.reference,sort:row.sort_group,url:row.object_key?assetPath(row.id):null,createdAt:row.created_at};}
async function load(env,owner){const r=await env.DB.prepare('SELECT document, revision, updated_at FROM progress WHERE owner_id = ?').bind(owner).first();return r?{...JSON.parse(r.document),revision:r.revision,updatedAt:r.updated_at}:emptyState()}
function authorized(req){const owner=req.headers.get('oai-authenticated-user-id');if(!owner||owner.length>256)throw new HttpError(401,'Sign in to keep your Blueprint private and save your progress.');return owner}
async function entitlement(env,owner){if(env.REQUIRE_ENTITLEMENT==='true'){const r=await env.DB.prepare("SELECT status FROM entitlements WHERE owner_id = ? AND status = 'active'").bind(owner).first();if(!r)throw new HttpError(403,'Your account does not yet have access. Contact In Her Fashion.')}}
function sameOrigin(req){const o=req.headers.get('Origin');if(o!==new URL(req.url).origin||req.headers.get('Sec-Fetch-Site')==='cross-site')throw new HttpError(403,'This request must come from your Blueprint.');}
async function api(req,env,path){
 const owner=authorized(req);await entitlement(env,owner);
 if(!['GET','HEAD'].includes(req.method))sameOrigin(req);
 if(path==='/api/bootstrap'&&req.method==='GET'){
  const state=await load(env,owner);const {results}=await env.DB.prepare('SELECT * FROM evidence WHERE owner_id = ? ORDER BY created_at ASC').bind(owner).all();
  const email=req.headers.get('oai-authenticated-user-email')||'';
  return json({user:{email,name:email.split('@')[0]||'Your private workbook'},state,evidence:results.map(safeAsset),content:workbook});
 }
 if(path==='/api/progress'&&req.method==='GET')return json(await load(env,owner));
 if(path==='/api/progress'&&req.method==='PATCH'){
  const body=await bodyJson(req),current=await load(env,owner);
  if(body.baseRevision!==current.revision)return json({error:'Another session saved newer answers. Review the latest version before keeping your edits.',current},409);
  let next;try{next=applyPatch(current,body)}catch(e){throw new HttpError(400,e.message)}
  const revision=current.revision+1,now=new Date().toISOString();const document=JSON.stringify({answers:next.answers,completed:next.completed,lastStep:next.lastStep});
  let result;
  if(current.revision===0)result=await env.DB.prepare('INSERT INTO progress (owner_id, document, revision, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(owner_id) DO NOTHING').bind(owner,document,revision,now).run();
  else result=await env.DB.prepare('UPDATE progress SET document = ?, revision = ?, updated_at = ? WHERE owner_id = ? AND revision = ?').bind(document,revision,now,owner,current.revision).run();
  if(!result.meta.changes)return json({error:'Another session saved first. Review the latest answers.',current:await load(env,owner)},409);
  return json({...next,revision,updatedAt:now});
 }
 if(path==='/api/export'&&req.method==='GET'){
  const state=await load(env,owner);return new Response(JSON.stringify({product:'In Her Fashion Personal Style Blueprint',formatVersion:1,exportedAt:new Date().toISOString(),state,blueprint:blueprintFor(state.answers)},null,2),{headers:{...securityHeaders,'Content-Type':'application/json','Content-Disposition':'attachment; filename="My-Personal-Style-Blueprint.json"'}});
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
  return json({id,title,kind,reference,sort:'',url:key?assetPath(id):null,createdAt:now},201);
 }
 const match=path.match(/^\/api\/evidence\/([a-f0-9-]{36})$/);
 if(match){
  const row=await env.DB.prepare('SELECT * FROM evidence WHERE id = ? AND owner_id = ?').bind(match[1],owner).first();if(!row)throw new HttpError(404,'This evidence item is not available.');
  if(req.method==='GET'){
   if(!row.object_key)throw new HttpError(404,'This item is a reference, not an uploaded image.');const obj=await env.BUCKET.get(row.object_key);if(!obj)throw new HttpError(404,'Image not found.');
   return new Response(obj.body,{headers:{...securityHeaders,'Content-Type':row.mime,'Content-Disposition':'inline','Content-Length':String(row.byte_size)}});
  }
  if(req.method==='PATCH'){
   const b=await bodyJson(req);if(!['','Beautiful + Me','Beautiful + Not Me','Interesting + Maybe Me','Not For Me'].includes(b.sort))throw new HttpError(400,'Choose an approved inspiration group.');
   await env.DB.prepare('UPDATE evidence SET sort_group = ? WHERE id = ? AND owner_id = ?').bind(b.sort,row.id,owner).run();return json({...safeAsset(row),sort:b.sort});
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
