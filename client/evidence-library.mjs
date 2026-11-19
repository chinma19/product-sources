import {escapeHTML as e} from './exports.mjs';
import {annotationForm} from './v1-ui.mjs';
export function sendImage(task,onProgress){return new Promise((resolve,reject)=>{
 const xhr=new XMLHttpRequest();xhr.open(task.replace?'PUT':'POST',task.replace?`/api/evidence/${task.replace.id}/image`:'/api/evidence');xhr.responseType='json';xhr.timeout=120000;
 xhr.upload.onprogress=event=>{if(event.lengthComputable)onProgress(Math.round(event.loaded/event.total*100))};
 xhr.onload=()=>{const data=xhr.response;if(xhr.status>=200&&xhr.status<300)resolve(data);else reject(Error(data?.error||'Upload failed. Please retry.'))};
 xhr.onerror=()=>reject(Error('Connection interrupted. Retry this image when you are online.'));xhr.ontimeout=()=>reject(Error('Upload timed out. Retry this image.'));
 const fd=new FormData();fd.set('file',task.file);if(task.replace)fd.set('baseRevision',task.replace.revision);else{fd.set('kind',task.kind);fd.set('title',task.title);fd.set('uploadId',task.uploadId)}xhr.send(fd);
})}
export class UploadQueue {
 constructor({changed=()=>{},saved=()=>{},transport=sendImage,objectURL=URL,librarySize=()=>0}={}) {
  Object.assign(this,{changed,saved,transport,objectURL,librarySize});
  this.tasks=[];this.running=false;this.counter=0;this.notice='';
 }
 add(files,kind,replace=null) {
  this.notice='';
  for(const file of Array.from(files||[])) {
   const valid=['image/jpeg','image/png','image/webp'].includes(file.type)&&file.size>0&&file.size<=8000000;
   const waiting=this.tasks.filter(t=>!t.replace&&!['saved','invalid'].includes(t.status)).length;
   const full=!replace&&Math.max(0,Number(this.librarySize())||0)+waiting>=40;
   const error=!valid?'Use JPG, PNG or WebP under 8 MB.':full?'Your library holds up to 40 items. Remove an existing item or a queued image before selecting this image again.':'';
   const preview=!error?this.objectURL.createObjectURL(file):'';
   this.tasks.push({key:String(++this.counter),uploadId:crypto.randomUUID(),name:file.name||'My outfit',file:error?null:file,kind,replace,title:(file.name||'My outfit').replace(/\.[^.]+$/,'').slice(0,250)||'My outfit',preview,progress:0,status:error?'invalid':'queued',error});
   if(full)this.notice='Some selected images exceed the 40-item library limit. Those images have not been uploaded; your existing images are unchanged.';
   if(replace)break;
  }
  this.changed();
 }
 remove(key) {
  const task=this.tasks.find(t=>t.key===key);
  if(!task||task.status==='uploading')return;
  if(task.preview?.startsWith('blob:'))this.objectURL.revokeObjectURL(task.preview);
  this.tasks=this.tasks.filter(t=>t!==task);this.changed();
 }
 async start(key=null) {
  if(this.running)return;
  // Select only the images explicitly submitted now. Removed waiting images must
  // never upload, and newly selected images wait for the customer's next action.
  const selected=this.tasks.filter(t=>(!key||t.key===key)&&(t.status==='queued'||key&&t.status==='error')).map(t=>t.key);
  this.running=true;
  try {
   for(const taskKey of selected) {
    const task=this.tasks.find(t=>t.key===taskKey);
    if(!task)continue;
    task.status='uploading';task.error='';task.progress=0;this.changed();
    try {
     const item=await this.transport(task,p=>{if(task.status!=='uploading')return;task.progress=Math.max(0,Math.min(100,Number(p)||0));this.changed()});
     task.status='saved';task.progress=100;
     if(task.preview?.startsWith('blob:'))this.objectURL.revokeObjectURL(task.preview);
     task.preview=item.url||'';
     this.saved(item,task);
     // Saved previews use the private server URL; release local file memory.
     task.file=null;
    } catch(err) {
     task.status='error';task.error=err.message||'Upload failed. Please retry this image.';
    }
    this.changed();
   }
  } finally {this.running=false;this.changed()}
 }
 get pending(){return this.tasks.some(t=>!['saved','invalid'].includes(t.status))}
 dispose(){for(const t of this.tasks)if(t.preview?.startsWith('blob:'))this.objectURL.revokeObjectURL(t.preview)}
}
export function uploadPanel(kind='both'){return `<section class="batch-upload"><div class="upload-heading"><div><p class="eyebrow">BUILD YOUR PRIVATE COLLECTION</p><h3>Add a few images at once</h3></div><label>Evidence set<select id="batch-kind"><option value="recent" ${kind==='recent'?'selected':''}>Recent outfits</option><option value="inspiration" ${kind==='inspiration'?'selected':''}>Inspiration</option></select></label></div><div class="drop-zone" data-drop-zone><label for="batch-images">Choose images <span>or drop them here</span></label><input id="batch-images" type="file" multiple accept="image/jpeg,image/png,image/webp"><p>JPG, PNG or WebP · up to 8 MB each · 40 library items in total</p></div><div id="upload-queue"></div></section><details class="reference-entry"><summary>Add a link or written reference instead</summary><form id="evidence-form" class="evidence-form"><label>Evidence set<select name="kind"><option value="recent" ${kind==='recent'?'selected':''}>Recent outfits</option><option value="inspiration" ${kind==='inspiration'?'selected':''}>Inspiration</option></select></label><label>Title<input name="title" maxlength="250" required></label><label>Link or written reference<textarea name="reference" rows="2" maxlength="1000" required></textarea></label><button class="button" type="submit">Add reference +</button><p role="status"></p></form></details>`}
export function renderQueue(queue){if(!queue.tasks.length)return '';return `${queue.notice?'<p class="upload-error" role="alert">'+e(queue.notice)+'</p>':''}<div class="queue-heading"><p>${queue.tasks.length} selected · ${queue.tasks.filter(t=>t.status==='saved').length} saved</p><button data-action="upload-all" ${queue.running||!queue.tasks.some(t=>t.status==='queued')?'disabled':''}>Upload selected images</button></div><div class="upload-preview-grid">${queue.tasks.map(t=>`<article class="upload-preview" data-task="${t.key}">${t.preview?`<img src="${e(t.preview)}" alt="Preview of ${e(t.name)}">`:'<div class="invalid-preview">Unsupported image</div>'}<label>Image title<input data-upload-title="${t.key}" value="${e(t.title)}" maxlength="250" ${t.status==='uploading'||t.status==='saved'?'disabled':''}></label><p>${t.kind==='inspiration'?'Inspiration photo':'Recent outfit'} · ${t.replace?'Replace existing image · ':''}${e(t.name)}</p><div role="status" aria-live="polite">${t.status==='uploading'?`<progress max="100" value="${t.progress}" aria-label="Upload progress for ${e(t.name)}"></progress><span>${t.progress===100?'Processing image…':t.progress+'% uploaded'}</span>`:t.status==='saved'?'✓ Saved privately':t.status==='queued'?'Ready to upload':`<span class="upload-error">${e(t.error)}</span>`}</div>${t.status==='error'?`<button data-action="retry-upload" data-task="${t.key}" ${queue.running?'disabled':''}>Retry this image</button>`:''}<button class="text-button" data-action="remove-upload" data-task="${t.key}" ${t.status==='uploading'?'disabled':''}>${t.status==='saved'?'Dismiss preview':'Remove from queue'}</button></article>`).join('')}</div>`}
export function evidenceCard(x,i){return `<article class="evidence-item" data-evidence-id="${x.id}"><figure>${x.url?`<img src="${e(x.url)}" alt="${e(x.title)}" loading="lazy" decoding="async">`:`<div class="reference-image"><span>WRITTEN REFERENCE</span><p>${e(x.reference)}</p></div>`}<figcaption><small>${String(i+1).padStart(2,'0')} / ${x.kind==='recent'?'RECENT OUTFITS':'INSPIRATION'}</small><h3>${e(x.title)}</h3></figcaption></figure><div class="evidence-caption">${x.reference&&x.url?`<p>${e(x.reference)}</p>`:''}${/^https?:\/\//i.test(x.reference)?`<a href="${e(x.reference)}" target="_blank" rel="noopener noreferrer">Open reference ↗</a>`:''}<div class="evidence-tools"><button class="text-button" data-action="move-image" data-image="${x.id}" data-direction="-1" aria-label="Move ${e(x.title)} earlier">Move earlier ↑</button><button class="text-button" data-action="move-image" data-image="${x.id}" data-direction="1" aria-label="Move ${e(x.title)} later">Move later ↓</button><label class="replace-image">Replace image<input data-replace-image="${x.id}" type="file" accept="image/jpeg,image/png,image/webp"><span class="sr-only">Replacement for ${e(x.title)}</span></label></div>${annotationForm(x)}${x.kind==='inspiration'?`<label>My response<select data-evidence-sort="${x.id}"><option value="">Not sorted yet</option>${['Beautiful + Me','Beautiful + Not Me','Interesting + Maybe Me','Not For Me'].map(o=>`<option ${x.sort===o?'selected':''}>${e(o)}</option>`).join('')}</select></label>`:''}<button class="text-button danger" data-action="remove-image" data-image="${x.id}">Delete evidence item</button></div></article>`}
