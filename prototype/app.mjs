import {workbook,controls,resolveValue,formatValue} from '../server/model.mjs';
import {renderPart5Page} from '../client/blueprint-view.mjs';
import {reviewControls,summaryControls,summaryPreview,confirmationSources} from '../client/blueprint-controls.mjs';
import {UploadQueue,uploadPanel,renderQueue} from '../client/evidence-library.mjs';
import {annotationForm,readAnnotations} from '../client/v1-ui.mjs';
import {imageData} from '../server/evidence.mjs';
import {generateBlueprintPDF} from '../server/pdf.mjs';
import {escapeHTML as e,downloadBlob} from '../client/exports.mjs';
import {renderChapter} from './chapter.mjs';
import {renderExercise} from './exercise.mjs';
import {relevantEvidence,renderEvidenceGallery} from './evidence-gallery.mjs';
import {renderReference} from './reference.mjs';
import {provenanceMarkup,decorateProvenance} from './provenance.mjs';
import {field,readField} from './fields.mjs';
import {PreviewStore,savePhoto,readPhotos,removePhoto,clearPhotos} from './store.mjs';
import {assets} from './assets.generated.mjs';
import './preview.css';
import './chapter.css';
import '../client/blueprint-view.css';
import './reference.css';
import './exercise.css';
import './revision.css';

const root=document.querySelector('#preview-app');
const store=new PreviewStore();
const photoURLs=new Map();
const stages=['look','choose','reflect','record'];
let view=['journey','exercise','blueprint'].includes(location.hash.slice(2))?location.hash.slice(2):'journey';
let mode='glance',editorId=null,overlay=null,notice='',busy=false,lastQuestion=null,editorReturn=null;
let pageReturn=null,overlayHistory=[],lockedBody=null;
let evidenceDirty=false,sourceDirty=false;
const inertNodes=new Set();
const state=()=>store.workspace.state;
const evidence=()=>store.workspace.evidence;
const photo=item=>photoURLs.get(item.id)||assets[item.asset]||'';
const phase=()=>stages.includes(store.workspace.phase)?store.workspace.phase:'choose';
const flow=()=>store.workspace.exerciseFlow==='separate'?'separate':'continuous';
const sourceLink=n=>`#/source/${n}`;

function announce(text){document.querySelector('#preview-announcements').textContent=text;}
function status(){
 for(const node of document.querySelectorAll('[data-local-status]'))node.textContent=store.error||(store.saved?'Saved in this browser':'Sample customer answers');
}
function patch(value){store.patch(value);status();}
function bytes(url){return Uint8Array.from(atob(url.split(',')[1]),c=>c.charCodeAt(0));}
const fileURL=file=>new Promise((resolve,reject)=>{
 const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);
});
function queueChanged(){
 const host=document.querySelector('#upload-queue');
 if(host)host.innerHTML=renderQueue(queue).replaceAll('Saved privately','Saved in this browser');
}
const queue=new UploadQueue({
 librarySize:()=>evidence().length,changed:queueChanged,
 transport:async(task,progress)=>{
  await imageData(task.file);progress(35);
  const id=task.replace?.id||task.uploadId;
  const item={id,kind:task.kind,title:task.title,annotations:task.replace?evidence().find(x=>x.id===id)?.annotations||{}:{},revision:0};
  const url=await fileURL(task.file);progress(75);
  try{await savePhoto({...item,blob:task.file});}
  catch{throw Error('This browser cannot store preview images. Enable local image storage or use another current browser. Existing photos are unchanged.');}
  photoURLs.set(id,url);return {...item,url,persisted:true};
 },
 saved:item=>{
  const existing=evidence().findIndex(x=>x.id===item.id),metadata={...item};delete metadata.url;
  if(existing>=0)store.workspace.evidence[existing]=metadata;else store.workspace.evidence.push(metadata);
  const saved=store.persist();evidenceDirty=true;status();refreshLibrary();
  if(!saved)throw Error('Image details could not be saved in this browser. Keep this tab open and retry this image when browser storage is available.');
  announce('Image added to this isolated preview.');
 }
});

function output(selected){
 const shell=document.createElement('div');
 shell.innerHTML=renderPart5Page(workbook.pages[selected==='glance'?67:66],state().answers,state().bindingState,{notice:c=>reviewControls(c,state()),editHref:sourceLink});
 decorateProvenance(shell,state(),{sourceLink});
 for(const link of shell.querySelectorAll('a[href^="#/step/"]'))link.setAttribute('href',sourceLink(Number(link.getAttribute('href').split('/')[2])));
 if(selected==='master'){
  for(const section of shell.querySelectorAll('[data-result-section]')){
   const heading=section.querySelector('.result-section-title'),details=document.createElement('details'),summary=document.createElement('summary');
   details.className='master-spread';details.open=['identity','qualities','language'].includes(section.dataset.resultSection);
   summary.textContent=heading.textContent;heading.remove();details.append(summary);
   while(section.firstChild)details.append(section.firstChild);section.append(details);
  }
 }
 return shell.innerHTML;
}
function header(){return `
 <div class="preview-notice"><strong>DESIGN PREVIEW</strong><span>Sample customer answers · edits stay in this browser · your account is not connected</span><button data-action="reset-example">Reset example</button></div>
 <header class="preview-header"><a href="#/journey" class="preview-brand">In Her Fashion<span>PERSONAL STYLE BLUEPRINT</span></a>
 <nav aria-label="Design preview">${[['journey','The journey'],['exercise','Discover'],['blueprint','My Blueprint']].map(([key,label])=>`<button data-action="navigate" data-view="${key}" ${view===key?'aria-current="page"':''}>${label}</button>`).join('')}</nav>
 <div class="header-tools"><span data-local-status></span><button data-action="gallery">My photos</button></div></header>`;}
function libraryMarkup(){return evidence().map(item=>`<figure>
 <button class="photo-button" data-action="photo" data-photo="${e(item.id)}">${photo(item)?`<img src="${e(photo(item))}" alt="${e(item.title)}" loading="lazy">`:`<span class="written-ref">${e(item.reference||item.title)}</span>`}</button>
 <figcaption>${e(item.title)}<small>${item.asset?'Stock sample photo · ':''}${item.kind==='recent'?'Recent outfit':'Inspiration'}</small></figcaption>
 <div class="photo-actions"><button data-action="move-photo" data-photo="${e(item.id)}" data-direction="-1">Move earlier</button><button data-action="move-photo" data-photo="${e(item.id)}" data-direction="1">Move later</button>
 <label>Replace image<input type="file" data-replace="${e(item.id)}" accept="image/jpeg,image/png,image/webp"></label><button data-action="delete-photo" data-photo="${e(item.id)}">Remove</button></div></figure>`).join('');}
function savedAnnotations(item){
 const labels={fit:'Fit',fitReaction:'My response to this fit',silhouette:'Silhouette observations',proportion:'Proportion relationship',neckline:'Necklines / openings',comfort:'Comfort observations',exposure:'Skin exposure',colour:'Colour tags',texture:'Texture tags',detail:'Detail tags',feeling:'Feeling tags',notes:'My notes'};
 const rows=Object.entries(item.annotations||{}).map(([key,value])=>{
  const text=Array.isArray(value)?value.join(', '):value&&typeof value==='object'?Object.entries(value).filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join('; '):String(value||'');
  return text.trim()?`<div><dt>${e(labels[key]||key)}</dt><dd>${e(text)}</dd></div>`:'';
 }).join('');
 return `<section class="saved-observations" aria-label="Saved annotations"><h3>Saved observations</h3><p class="provenance-label">Customer-written annotations${item.asset?' · sample customer answers':''}</p>${rows?`<dl>${rows}</dl>`:'<p>No observations recorded for this image. You can add your own below.</p>'}</section>`;
}
function sourcePanel(step){
 const page=workbook.pages[step-1];
 return `<p class="prototype-kicker">ORIGINAL WORKBOOK · STEP ${page.page}</p><h2>${e(page.title)}</h2>
 <p class="preview-boundary">Sample customer answers. Only step 12 and its step-11 source ratings have working discovery editors in this design preview. Other original exercises are available here for reference.</p>
 <details><summary>Original guidance</summary>${page.lines.map(line=>`<p>${e(line)}</p>`).join('')}</details>
 ${page.controls.filter(c=>c.type!=='assembly'&&!c.internal).map(c=>{
  const value=formatValue(resolveValue(c.id,state().answers,new Set(),state().bindingState));
  return value?`<section class="source-record"><h3>${e(c.label)}</h3>${provenanceMarkup(c.id,state(),{includeSources:false})}<p>${e(value)}</p></section>`:'';
 }).join('')}
 ${page.page===11?`<h3>For each silhouette, mark:</h3>${controls.get('silhouette.ratings').rows.map(row=>`<label class="source-rating">${e(row)}<select data-rating="${e(row)}"><option value="">Not recorded</option>${controls.get('silhouette.ratings').options.map(option=>`<option ${state().answers['silhouette.ratings']?.[row]===option?'selected':''}>${e(option)}</option>`).join('')}</select></label>`).join('')}`:''}
 <button class="prototype-primary" data-action="close-overlay">${view==='blueprint'?'Return to my Blueprint':view==='journey'?'Return to the journey':'Return to the discovery screen'}</button>`;
}
function overlayHTML(){
 if(!overlay)return '';
 let content='',title='My earlier discoveries';
 if(overlay.type==='source')content=sourcePanel(overlay.step);
 if(overlay.type==='gallery'){
  title='My photos';content=`<p class="prototype-kicker">YOUR EVIDENCE</p><h2>A collection to return to.</h2><p class="preview-boundary">Stock sample photos and images you add to this isolated preview. Your account's evidence is not accessed. The existing 40-item library limit is retained.</p>${uploadPanel('recent')}<div class="preview-photo-library">${libraryMarkup()}</div>`;
 }
 if(overlay.type==='exercise-evidence'){
  title='Recent outfit evidence';content=`<p class="preview-boundary">All recent outfits for this exercise. Select a photograph to enlarge it and read the annotations you saved.</p>${renderEvidenceGallery({evidence:relevantEvidence(evidence()),photo,compact:true,galleryOpen:true})}`;
 }
 if(overlay.type==='photo'){
  const item=evidence().find(x=>x.id===overlay.id);if(!item)return '';
  title='My observation';content=`<p class="prototype-kicker">${item.asset?'STOCK SAMPLE PHOTO':'MY PREVIEW PHOTO'}</p><h2>${e(item.title)}</h2>
  ${photo(item)?`<a class="photo-original" href="${e(photo(item))}" target="_blank" rel="noopener" aria-label="Open full-size ${e(item.title)} in a new tab"><img class="photo-large" src="${e(photo(item))}" alt="${e(item.title)}"></a><p class="photo-hint">Select the image to open its full size. Your question stays here when you return.</p>`:`<div class="written-ref">${e(item.reference||item.title)}</div>`}
  ${savedAnnotations(item)}${annotationForm(item)}`;
 }
 if(overlay.type==='summary'){
  title='Review my wording';content=`<p class="preview-boundary">Optional draft wording · customer review required. Drafts use only recorded responses and enter the Blueprint only when you confirm them.</p>${summaryControls(state())}`;
 }
 return `<div class="preview-modal-backdrop"><section class="preview-modal" role="dialog" aria-modal="true" aria-labelledby="preview-dialog-title" tabindex="-1"><div class="modal-top"><span id="preview-dialog-title">${title}</span><button data-action="close-overlay">${overlayHistory.length?'Back':'Close'}</button></div>${content}<p class="overlay-notice" role="status">${e(notice)}</p></section></div>`;
}
function render(){
 const x=window.scrollX||0,y=window.scrollY||0;
 root.innerHTML=header()+`<div class="preview-content">${view==='journey'?renderChapter({workbook,state:state(),evidence:evidence(),photo}):view==='exercise'?renderExercise({state:state(),evidence:evidence(),photo,phase:phase(),flow:flow(),galleryOpen:store.workspace.galleryOpen!==false}):renderReference({state:state(),workbook,evidence:evidence(),photo,mode,editorId,renderOutput:output,renderEditor:id=>field(controls.get(id),state())})}</div>
 ${view==='blueprint'?'<div class="reference-utilities"><button data-action="review-summary">Review concise wording</button><button data-action="export-backup">Save preview answers</button></div>':''}
 <nav class="preview-mobile-nav" aria-label="Preview screens">${[['journey','The journey'],['exercise','Discover'],['blueprint','My Blueprint']].map(([key,label])=>`<button data-action="navigate" data-view="${key}" ${view===key?'aria-current="page"':''}>${label}</button>`).join('')}</nav><div id="preview-overlay-root"></div><div class="preview-toast" role="status">${e(notice)}</div>`;
 renderOverlay(false);status();window.scrollTo?.(x,y);
}
function refreshLibrary(){
 const library=document.querySelector('.preview-photo-library');if(library)library.innerHTML=libraryMarkup();
}
function refreshExerciseGallery(){
 const host=document.querySelector('.preview-content [data-evidence-gallery]');
 if(host)host.outerHTML=renderEvidenceGallery({evidence:relevantEvidence(evidence()),photo,galleryOpen:host.open});
 for(const button of document.querySelectorAll('[data-action="exercise-evidence"]'))button.textContent=`View outfits (${relevantEvidence(evidence()).length})`;
}
function refreshSourceContext(){
 if(view==='exercise'){
  const shell=document.createElement('div');shell.innerHTML=renderExercise({state:state(),evidence:evidence(),photo,phase:phase(),flow:flow()});
  const current=document.querySelector('.preview-content .exercise-earlier-selections');
  const fresh=shell.querySelector('.exercise-earlier-selections');
  if(current&&fresh){const expanded=current.querySelector('details')?.open;current.replaceWith(fresh);fresh.querySelector('details').open=!!expanded;}
 }
 if(view==='blueprint'){
  const shell=document.createElement('div');shell.innerHTML=renderReference({state:state(),workbook,evidence:evidence(),photo,mode,renderOutput:output});
  for(const selector of ['.reference-cover','.reference-publication']){
   const current=document.querySelector('.preview-content '+selector),fresh=shell.querySelector(selector);
   if(current&&fresh)current.replaceWith(fresh);
  }
 }
}
function focusKey(element){
 if(!element)return null;
 if(element.matches?.('a[href]'))return {href:element.getAttribute('href')};
 return {action:element.dataset.action,id:element.dataset.id,field:element.dataset.field,photo:element.dataset.photo,answer:element.dataset.answer,index:element.dataset.index,key:element.dataset.key};
}
function restoreFocus(record){
 let target=record?.element?.isConnected?record.element:null;
 if(!target&&record?.key){
  const key=record.key;
  target=[...document.querySelectorAll('[data-action],a[href],[data-answer]')].find(el=>key.href?el.getAttribute('href')===key.href:Object.entries(key).filter(([,value])=>value!==undefined).every(([name,value])=>el.dataset[name]===value));
 }
 (target||document.querySelector('.preview-header button'))?.focus({preventScroll:true});
}
function pageRecord(){
 const element=document.activeElement;
 const rect=lastQuestion?.isConnected?lastQuestion.getBoundingClientRect():null;
 const anchor=rect&&rect.top>=0&&rect.top<(window.innerHeight||800)?lastQuestion:null;
 return {element,key:focusKey(element),x:window.scrollX||0,y:window.scrollY||0,anchor,anchorTop:anchor?.getBoundingClientRect().top};
}
function lockPage(){
 if(lockedBody)return;
 lockedBody={position:document.body.style.position,top:document.body.style.top,width:document.body.style.width,overflow:document.body.style.overflow};
 Object.assign(document.body.style,{position:'fixed',top:`-${pageReturn?.y??editorReturn?.y??window.scrollY??0}px`,width:'100%',overflow:'hidden'});
}
function unlockPage(){if(lockedBody){Object.assign(document.body.style,lockedBody);lockedBody=null;}}
function renderOverlay(focus=true){
 const host=document.querySelector('#preview-overlay-root');host.innerHTML=overlayHTML();
 for(const node of inertNodes)node.inert=false;inertNodes.clear();
 const dialog=overlay?host.querySelector('[role="dialog"]'):root.querySelector('.reference-editor');
 if(dialog){
  for(let node=dialog;node&&node!==root;node=node.parentElement){
   for(const sibling of node.parentElement?.children||[])if(sibling!==node){sibling.inert=true;inertNodes.add(sibling);}
  }
  lockPage();
 }else unlockPage();
 queueChanged();status();
 if(focus)host.querySelector('[role="dialog"]')?.focus({preventScroll:true});
}
function openOverlay(value){
 if(overlay)overlayHistory.push({overlay,element:document.activeElement,key:focusKey(document.activeElement),scrollTop:document.querySelector('.preview-modal')?.scrollTop||0});
 else pageReturn=pageRecord();
 overlay=value;notice='';renderOverlay();
}
function closeOverlay(){
 const parent=overlayHistory.pop();
 if(parent){overlay=parent.overlay;renderOverlay(false);const modal=document.querySelector('.preview-modal');if(modal)modal.scrollTop=parent.scrollTop;restoreFocus(parent);return;}
 overlay=null;renderOverlay(false);
 if(evidenceDirty){refreshExerciseGallery();evidenceDirty=false;}
 if(sourceDirty){refreshSourceContext();sourceDirty=false;}
 if(location.hash.startsWith('#/source/'))history.replaceState(null,'','#/'+view);
 if(pageReturn){
  window.scrollTo?.(pageReturn.x,pageReturn.y);restoreFocus(pageReturn);
  if(pageReturn.anchor?.isConnected){const delta=pageReturn.anchor.getBoundingClientRect().top-pageReturn.anchorTop;if(delta)window.scrollTo?.(pageReturn.x,pageReturn.y+delta);}
 }
 pageReturn=null;
}
function navigate(next){
 overlay=null;overlayHistory=[];pageReturn=null;editorId=null;unlockPage();
 view=['journey','exercise','blueprint'].includes(next)?next:'journey';location.hash='#/'+view;render();window.scrollTo?.(0,0);
}
function jumpStage(selected){
 store.workspace.phase=stages.includes(selected)?selected:'look';store.persist();status();
 if(flow()==='separate'){render();document.querySelector('.exercise-main h1')?.focus({preventScroll:true});return;}
 for(const button of document.querySelectorAll('[data-action="phase"]')){
  if(button.dataset.phase===selected)button.setAttribute('aria-current','location');else button.removeAttribute('aria-current');
 }
 const section=document.querySelector('#stage-'+selected);section?.scrollIntoView?.({block:'start'});section?.focus({preventScroll:true});
}
function refreshProvenance(el){
 const wrapper=el.closest('[data-preview-field]'),label=wrapper?.querySelector('.field-provenance');
 if(label)label.outerHTML=provenanceMarkup(el.dataset.answer,state(),{compact:true,sourceLink});
 if(el.dataset.key)for(const cell of wrapper?.querySelectorAll('[data-provenance-cell]')||[]){
  if(cell.dataset.provenanceCell===el.dataset.key)cell.outerHTML=provenanceMarkup(el.dataset.answer,state(),{cell:el.dataset.key,compact:true,includeSources:false});
 }
}

root.addEventListener('focusin',event=>{if(event.target.dataset.answer)lastQuestion=event.target;});
root.addEventListener('toggle',event=>{
 if(event.target.matches?.('.preview-content [data-evidence-gallery]')){store.workspace.galleryOpen=event.target.open;}
},true);
root.addEventListener('input',event=>{
 const el=event.target;
 if(el.dataset.answer){
  try{patch({answers:{[el.dataset.answer]:readField(el,state())}});el.setCustomValidity('');refreshProvenance(el);}catch(error){el.setCustomValidity(error.message);}return;
 }
 if(el.dataset.summaryKind){patch({answers:{['summary.pending.'+el.dataset.summaryKind]:el.value}});return;}
 if(el.dataset.uploadTitle){const task=queue.tasks.find(x=>x.key===el.dataset.uploadTitle);if(task)task.title=el.value;}
});
root.addEventListener('change',event=>{
 const el=event.target;
 if(el.dataset.answer&&(['checkbox','radio'].includes(el.type)||el.tagName==='SELECT')){patch({answers:{[el.dataset.answer]:readField(el,state())}});refreshProvenance(el);}
 if(el.dataset.rating){patch({answers:{'silhouette.ratings':{...state().answers['silhouette.ratings'],[el.dataset.rating]:el.value}}});sourceDirty=true;}
 if(el.id==='batch-images'){queue.add([...el.files],document.querySelector('#batch-kind').value);el.value='';}
 if(el.dataset.replace){const item=evidence().find(x=>x.id===el.dataset.replace);queue.add([...el.files],item.kind,{id:item.id,revision:item.revision});el.value='';}
});
root.addEventListener('submit',event=>{
 event.preventDefault();
 if(event.target.matches('.annotation-form')){
  const form=event.target,item=evidence().find(x=>x.id===form.dataset.image);
  item.annotations=readAnnotations(form,item.kind);item.revision++;
  const saved=store.persist();evidenceDirty=true;status();form.querySelector('[role=status]').textContent=saved?'Saved in this browser.':store.error;
  const summary=document.querySelector('.saved-observations');if(summary)summary.outerHTML=savedAnnotations(item);return;
 }
 if(event.target.id==='evidence-form'){
  if(evidence().length>=40){notice='Your library holds up to 40 items. Existing evidence is unchanged.';renderOverlay(false);return;}
  const fd=new FormData(event.target);
  store.workspace.evidence.push({id:crypto.randomUUID(),kind:fd.get('kind'),title:fd.get('title'),reference:fd.get('reference'),annotations:{},revision:0});
  store.persist();evidenceDirty=true;notice=store.saved?'Written reference added to this preview.':store.error;event.target.reset();refreshLibrary();status();
 }
});
root.addEventListener('click',async event=>{
 const source=event.target.closest('a[href^="#/source/"]');
 if(source){event.preventDefault();openOverlay({type:'source',step:Math.max(1,Math.min(68,Number(source.getAttribute('href').split('/')[2])||12))});return;}
 const button=event.target.closest('[data-action]');if(!button)return;
 const action=button.dataset.action;
 if(action==='navigate'){navigate(button.dataset.view);return;}
 if(action==='open-exercise'){navigate('exercise');return;}
 if(action==='inspect-step'){openOverlay({type:'source',step:Number(button.dataset.step)});return;}
 if(action==='exercise-flow'){
  store.workspace.exerciseFlow=button.dataset.flow==='separate'?'separate':'continuous';store.persist();render();
  document.querySelector(`[data-action="exercise-flow"][data-flow="${flow()}"]`)?.focus({preventScroll:true});return;
 }
 if(action==='phase'){jumpStage(button.dataset.phase);return;}
 if(action==='next-phase'){jumpStage(stages[Math.min(3,stages.indexOf(phase())+1)]);return;}
 if(action==='exercise-evidence'){openOverlay({type:'exercise-evidence'});return;}
 if(action==='complete-exercise'){
  patch({completed:[...new Set([...state().completed,12])],lastStep:12});notice=store.saved?'Your discovery is saved. Your Blueprint uses this recorded direction.':store.error;navigate('blueprint');return;
 }
 if(action==='reference-mode'){mode=button.dataset.mode;editorId=null;render();return;}
 if(action==='edit-field'||action==='edit-blueprint'){
  editorReturn={element:document.activeElement,key:focusKey(document.activeElement),x:window.scrollX||0,y:window.scrollY||0};
  editorId=button.dataset.id||button.dataset.field;render();
  document.querySelector('.reference-editor textarea,.reference-editor input,.reference-editor')?.focus({preventScroll:true});return;
 }
 if(action==='close-editor'||action==='finish-blueprint-edit'){
  editorId=null;render();restoreFocus(editorReturn);if(editorReturn)window.scrollTo?.(editorReturn.x,editorReturn.y);return;
 }
 if(['use-source','link-field','link-binding','keep-binding','restore-saved-binding','confirm-current-wording'].includes(action)){
  const id=button.dataset.id||button.dataset.field;
  if(['use-source','link-field','link-binding'].includes(action))patch({linkFields:[id]});
  if(action==='keep-binding')patch({reviewFields:[id]});
  if(action==='restore-saved-binding')patch({answers:{[id]:state().answers[id]}});
  if(action==='confirm-current-wording')patch({confirmFields:[{id,sourceIds:confirmationSources(id,state())}]});
  if(overlay){sourceDirty=true;renderOverlay(false);}else render();return;
 }
 if(action==='gallery'){openOverlay({type:'gallery'});return;}
 if(action==='photo'){openOverlay({type:'photo',id:button.dataset.photo});return;}
 if(action==='close-overlay'){closeOverlay();return;}
 if(action==='upload-all'){await queue.start();return;}
 if(action==='retry-upload'){await queue.start(button.dataset.task);return;}
 if(action==='remove-upload'){queue.remove(button.dataset.task);return;}
 if(action==='move-photo'){
  const index=evidence().findIndex(x=>x.id===button.dataset.photo),next=index+Number(button.dataset.direction);
  if(next>=0&&next<evidence().length){[store.workspace.evidence[index],store.workspace.evidence[next]]=[store.workspace.evidence[next],store.workspace.evidence[index]];store.persist();evidenceDirty=true;refreshLibrary();status();}return;
 }
 if(action==='delete-photo'){
  if(!confirm('Remove this photo from the isolated preview?'))return;
  await removePhoto(button.dataset.photo);photoURLs.delete(button.dataset.photo);store.workspace.evidence=evidence().filter(x=>x.id!==button.dataset.photo);store.persist();evidenceDirty=true;refreshLibrary();status();return;
 }
 if(action==='review-summary'){openOverlay({type:'summary'});return;}
 if(action==='preview-summary'){const draft=summaryPreview(button.dataset.kind,state());patch({answers:{['summary.pending.'+button.dataset.kind]:draft.text}});renderOverlay(false);return;}
 if(action==='discard-summary'){patch({answers:{['summary.pending.'+button.dataset.kind]:''}});renderOverlay(false);return;}
 if(action==='confirm-summary'){
  const id=button.dataset.field,text=state().answers['summary.pending.'+button.dataset.kind]?.trim();if(!text)return;
  patch({answers:{[id]:text,['summary.pending.'+button.dataset.kind]:''},confirmFields:[{id,sourceIds:confirmationSources(id,state())}]});sourceDirty=true;notice='Your wording is confirmed in this example.';renderOverlay(false);return;
 }
 if(action==='dictionary-add'){patch({answers:{'dictionary.entries':[...(state().answers['dictionary.entries']||[]),{quality:'',meaning:'',clothing:''}]}});render();return;}
 if(action==='export-pdf'){
  if(busy)return;busy=true;button.disabled=true;
  try{const pdf=await generateBlueprintPDF(state().answers,{body:bytes(assets.bodyFont),display:bytes(assets.displayFont)},{glance:button.dataset.mode==='glance',bindingState:state().bindingState});downloadBlob(new Blob([pdf],{type:'application/pdf'}),button.dataset.mode==='glance'?'Sample-One-Glance-Blueprint.pdf':'Sample-Master-Blueprint.pdf');notice='Your example PDF is ready.';}
  catch(error){notice=error.message;}finally{busy=false;button.disabled=false;const toast=document.querySelector('.preview-toast');toast.textContent=notice;announce(notice);}return;
 }
 if(action==='export-backup'){downloadBlob(new Blob([JSON.stringify(store.workspace,null,2)],{type:'application/json'}),'Editorial-Preview-Answers.json');return;}
 if(action==='reset-example'){
  if(!confirm('Reset only this isolated example? Your account and workbook are not connected.'))return;
  await clearPhotos();store.reset();queue.dispose();queue.tasks=[];photoURLs.clear();overlay=null;overlayHistory=[];editorId=null;unlockPage();notice='Example reset. Your actual workbook has not been accessed.';render();
 }
});
root.addEventListener('dragover',event=>{if(event.target.closest('[data-drop-zone]'))event.preventDefault();});
root.addEventListener('drop',event=>{if(!event.target.closest('[data-drop-zone]'))return;event.preventDefault();queue.add([...event.dataTransfer.files],document.querySelector('#batch-kind').value);});
document.addEventListener('keydown',event=>{
 const dialog=overlay?document.querySelector('#preview-overlay-root [role=dialog]'):document.querySelector('.reference-editor');if(!dialog)return;
 if(event.key==='Escape'){if(overlay)closeOverlay();else{editorId=null;render();restoreFocus(editorReturn);}return;}
 if(event.key==='Tab'){
  const items=[...dialog.querySelectorAll('button,a[href],input,select,textarea,summary,[tabindex="0"]')].filter(node=>{
   const closed=node.closest('details:not([open])');return !node.disabled&&(!closed||closed.querySelector('summary')?.contains(node));
  });
  if(!items.length){event.preventDefault();dialog.focus();return;}
  const first=items[0],last=items.at(-1);
  if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===dialog)){event.preventDefault();first.focus();}
 }
});
window.addEventListener('hashchange',()=>{
 const hash=location.hash;
 if(hash.startsWith('#/source/')){openOverlay({type:'source',step:Math.max(1,Math.min(68,Number(hash.split('/')[2])||12))});return;}
 const next=hash.slice(2);if(['journey','exercise','blueprint'].includes(next)&&next!==view)navigate(next);
});
window.addEventListener('beforeunload',event=>{if(queue.pending||queue.running||store.dirty){event.preventDefault();event.returnValue='';}});
render();
readPhotos().then(async records=>{
 for(const record of records)if(evidence().some(item=>item.id===record.id))photoURLs.set(record.id,await fileURL(record.blob));
 refreshExerciseGallery();refreshLibrary();if(view==='blueprint')refreshSourceContext();
}).catch(()=>{});
function resizeEditingViewport(){
 const height=window.visualViewport?.height||window.innerHeight;
 if(height)root.style.setProperty('--preview-viewport-height',height+'px');
}
window.visualViewport?.addEventListener('resize',resizeEditingViewport);
window.addEventListener('resize',resizeEditingViewport);resizeEditingViewport();
if(globalThis.__IHF_PREVIEW_TEST_MODE__)globalThis.__IHF_PREVIEW_TEST__={store,render,navigate,getView:()=>view,getFlow:flow,queue};
