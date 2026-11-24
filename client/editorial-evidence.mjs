import purpose from '../content/evidence-purpose.json' with {type:'json'};
import {escapeHTML as e} from './exports.mjs';
import {annotationForm} from './v1-ui.mjs';

const kinds=new Set(['recent','inspiration']);
const pageNumber=page=>Number(typeof page==='object'?page?.page:page);
const supportingPages=new Set([9,10,13,15,16,17,18,19,28,30,32,42,53,62]);
const preparationControls=new Set(['evidence','image-sort']);
const annotationLabels={
 fit:'Fit',fitReaction:'My response to this fit',silhouette:'Silhouette observations',
 proportion:'Proportion relationship',neckline:'Necklines / openings',comfort:'Comfort observations',
 exposure:'Skin exposure',colour:'Colour tags',texture:'Texture tags',detail:'Detail tags',
 feeling:'Feeling tags',notes:'My notes'
};
const sortOptions=['Beautiful + Me','Beautiful + Not Me','Interesting + Maybe Me','Not For Me'];

export const collectionLabel=kind=>kind==='inspiration'?'Inspiration Photos':'Recent Outfits';

/** Eligibility comes from the approved exercise purpose, never its chapter alone. */
export function evidenceCollections(page){
 return [...(purpose.pages.find(entry=>entry.page===pageNumber(page))?.collections||[])];
}

/** Preserve the customer's saved library order and never merge the two collections. */
export function filterEvidence(items=[],kind){
 return kinds.has(kind)?items.filter(item=>item.kind===kind):[];
}

export function collectionTabs({selected,allowed=['recent','inspiration'],action='library-collection',page}={}){
 const choices=[...new Set(allowed)].filter(kind=>kinds.has(kind));
 if(choices.length<2)return '';
 return `<div class="editorial-collection-tabs" role="group" aria-label="Evidence collections">${choices.map(kind=>`<button type="button" data-action="${e(action)}" data-kind="${kind}" ${pageNumber(page)?`data-page="${pageNumber(page)}"`:''} aria-pressed="${selected===kind}">${collectionLabel(kind)}</button>`).join('')}</div>`;
}

function imageURL(item){
 const url=typeof item?.url==='string'?item.url:'';
 return /^(?:\/(?!\/)|https?:\/\/|blob:)/i.test(url)?url:'';
}
function concise(value,limit=150){
 const text=String(value||'').trim();return text.length>limit?text.slice(0,limit).trimEnd()+'…':text;
}
function annotationText(value){
 if(Array.isArray(value))return value.join(', ');
 if(value&&typeof value==='object')return Object.entries(value).filter(([,entry])=>entry!==''&&entry!=null).map(([key,entry])=>`${key}: ${entry}`).join('; ');
 return value==null?'':String(value);
}
function observationSnippet(item){
 const annotations=item.annotations||{};
 if(annotations.notes?.trim())return concise(annotations.notes);
 for(const key of ['fit','silhouette','proportion','colour','texture','detail','feeling']){
  const value=annotationText(annotations[key]);if(value.trim())return concise(value);
 }
 return '';
}
function card(item,index,{chooseOne=false}={}){
 const src=imageURL(item),note=observationSnippet(item),title=item.title||`${collectionLabel(item.kind)} ${index+1}`;
 return `<figure class="editorial-evidence-card" data-evidence-card="${e(item.id)}">
  <button type="button" class="editorial-evidence-image" data-action="inspect-evidence" data-evidence-id="${e(item.id)}" aria-label="Inspect ${e(title)}">
   ${src?`<img src="${e(src)}" alt="${e(title)}" loading="lazy" decoding="async">`:`<span class="editorial-written-evidence"><span>Written reference</span><span>${e(concise(item.reference||title,220))}</span></span>`}
  </button>
  <figcaption><h3>${e(title)}</h3>${item.sort?`<p class="editorial-evidence-response">${e(item.sort)}</p>`:''}${note?`<p class="editorial-evidence-note"><span>My recorded observation</span>${e(note)}</p>`:''}${chooseOne?'<p class="editorial-evidence-caption">Inspect the outfit you want to use for this reflection.</p>':''}</figcaption>
 </figure>`;
}
function emptyCollection(kind,returnTo){
 const href='#/evidence?return='+encodeURIComponent(returnTo)+'&kind='+kind;
 return `<div class="editorial-evidence-empty"><p>No ${collectionLabel(kind).toLowerCase()} recorded yet.</p><p>Photos, links and written references all work. Nothing is selected for you.</p><a href="${e(href)}">Add or review ${collectionLabel(kind)}</a></div>`;
}
function selection(page,kind){
 const number=pageNumber(page),allowed=evidenceCollections(number);
 const selected=allowed.includes(kind)?kind:number===52?null:allowed[0];
 return {number,allowed,selected};
}
function galleryContent({page,evidence,kind,returnTo,selectedId}){
 const {number,allowed,selected}=selection(page,kind),chooseOne=number===52;
 if(!allowed.length)return '';
 const list=filterEvidence(evidence,selected),chosen=chooseOne&&selectedId?list.find(item=>item.id===selectedId):null;
 const items=chosen?[chosen]:list;
 const tabs=collectionTabs({selected,allowed,action:'evidence-collection',page:number});
 const instruction=chooseOne?'Choose one outfit from your inspiration set or your own wardrobe.':number===42?'Choose the collection relevant to the clothes you are considering.':number===23?'Your inspiration and your actual outfits stay in separate collections.':'';
 return `${instruction?`<p class="editorial-evidence-instruction">${e(instruction)}</p>`:''}${tabs}
  ${!selected?'<p class="editorial-evidence-choice-note">Choose a collection to inspect. You can also reflect on an outfit you remember.</p>':`<div class="editorial-evidence-collection-heading"><h3>${collectionLabel(selected)}</h3><span>${list.length} ${list.length===1?'reference':'references'}</span></div>${items.length?`<div class="editorial-evidence-grid">${items.map((item,index)=>card(item,index,{chooseOne})).join('')}</div>`:emptyCollection(selected,returnTo)}`}`;
}

/** Place this in the root's sticky section navigation, outside the gallery container. */
export function renderEvidenceShortcut({page,evidence=[],kind}={}){
 const {number,allowed,selected}=selection(page,kind);if(!allowed.length)return '';
 const count=filterEvidence(evidence,selected).length;
 return `<button type="button" class="editorial-evidence-shortcut" data-action="open-exercise-evidence" data-page="${number}" ${selected?`data-kind="${selected}"`:''}>${number===52?'Inspect an outfit':`${collectionLabel(selected)} (${count})`}</button>`;
}

/** Full relevant evidence above an exercise, once, with optional supporting sets collapsed. */
export function renderExerciseEvidence({page,evidence=[],kind,returnTo,open,selectedId}={}){
 const {number,allowed,selected}=selection(page,kind);
 if(!allowed.length||page?.controls?.some(control=>preparationControls.has(control.type)))return '';
 const target=returnTo||`#/step/${number}`,chooseOne=number===52;
 const items=filterEvidence(evidence,selected),initiallyOpen=open??(!supportingPages.has(number)&&!chooseOne);
 const title=chooseOne?'One outfit to reflect on':collectionLabel(selected);
 return `<section class="editorial-exercise-evidence" data-evidence-page="${number}">
  <div class="editorial-evidence-toolbar"><p>YOUR EVIDENCE</p><button type="button" data-action="open-exercise-evidence" data-page="${number}" ${selected?`data-kind="${selected}"`:''}>${chooseOne?'Inspect an outfit':`Open ${collectionLabel(selected)}`}</button></div>
  <details class="editorial-evidence-gallery" data-evidence-kind="${selected||''}" data-evidence-page="${number}" ${initiallyOpen?'open':''}>
   <summary><span>${e(title)}</span><small>${selected?`${items.length} ${items.length===1?'reference':'references'}`:'Choose a collection'}</small></summary>
   <div class="editorial-evidence-gallery-body">${galleryContent({page,evidence,kind,returnTo:target,selectedId})}</div>
  </details>
 </section>`;
}

/** Drawer keeps the relevant collection in reach during longer written reflections. */
export function renderEvidenceDrawer({page,evidence=[],kind,returnTo,selectedId}={}){
 const {number,allowed,selected}=selection(page,kind);if(!allowed.length)return '';
 return `<section class="editorial-reference-drawer editorial-evidence-gallery" data-evidence-kind="${selected||''}" data-evidence-page="${number}" aria-label="${number===52?'Choose one outfit reference':collectionLabel(selected)}"><p class="editorial-evidence-eyebrow">YOUR RECORDED EVIDENCE</p><h2>${number===52?'One outfit to reflect on':collectionLabel(selected)}</h2>${galleryContent({page,evidence,kind,returnTo:returnTo||`#/step/${number}`,selectedId})}</section>`;
}

/** Literal saved annotations only. No image analysis or style conclusions are produced. */
export function renderEvidenceViewer(item){
 if(!item)return '<p>This evidence item is not available.</p>';
 const src=imageURL(item),title=item.title||'My outfit reference';
 return `<section class="editorial-evidence-viewer" data-viewing-evidence="${e(item.id)}">
  <p class="editorial-evidence-eyebrow">${collectionLabel(item.kind)}</p><h2>${e(title)}</h2>
  ${src?`<a class="editorial-fullsize-photo" href="${e(src)}" target="_blank" rel="noopener noreferrer" aria-label="Open full-size ${e(title)}"><img src="${e(src)}" alt="${e(title)}" decoding="async"></a><p class="editorial-photo-hint">Open the photograph for its full size. Your exercise stays in place when you return.</p>`:`<div class="editorial-fullsize-reference"><p>${e(item.reference||title)}</p></div>`}
  ${item.reference&&src?`<p class="editorial-photo-reference">${e(item.reference)}</p>`:''}
  ${renderSavedAnnotations(item)}
  ${annotationForm(item)}
  ${item.kind==='inspiration'?`<label class="editorial-inspiration-response">My response<select data-evidence-sort="${e(item.id)}"><option value="">Not sorted yet</option>${sortOptions.map(option=>`<option ${item.sort===option?'selected':''}>${e(option)}</option>`).join('')}</select></label>`:''}
 </section>`;
}

export function renderSavedAnnotations(item){
 const rows=Object.entries(item.annotations||{}).map(([key,value])=>({label:annotationLabels[key]||key,text:annotationText(value)})).filter(row=>row.text.trim());
 return `<section class="editorial-saved-annotations" aria-label="Saved annotations"><h3>My saved observations</h3>${rows.length?`<dl>${rows.map(row=>`<div><dt>${e(row.label)}</dt><dd>${e(row.text)}</dd></div>`).join('')}</dl>`:'<p>No observations recorded for this reference yet.</p>'}</section>`;
}
