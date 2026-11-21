import {escapeHTML as e} from '../client/exports.mjs';

import purpose from './evidence-purpose.json' with {type:'json'};
export const collectionLabel=kind=>kind==='inspiration'?'Inspiration Photos':'Recent Outfits';
export function evidenceCollections(step=12){
 return [...(purpose.pages.find(page=>page.page===Number(step))?.collections||[])];
}
export function relevantEvidence(evidence=[],step=12,collection){
 const allowed=evidenceCollections(step),selected=allowed.includes(collection)?collection:allowed[0];
 return selected?evidence.filter(item=>item.kind===selected):[];
}
export function collectionTabs(step,selected){
 const allowed=evidenceCollections(step);
 return allowed.length>1?`<div class="evidence-collection-tabs" role="group" aria-label="Evidence collections for this exercise">${allowed.map(kind=>`<button type="button" data-action="evidence-collection" data-step="${Number(step)}" data-collection="${kind}" aria-pressed="${selected===kind}">${collectionLabel(kind)}</button>`).join('')}</div>`:'';
}
function photoSource(item,photo){
 try{const source=photo?.(item);return typeof source==='string'?source:''}catch{return ''}
}
function excerpt(value,limit=185){
 const text=String(value||'').trim();return text.length>limit?text.slice(0,limit).trimEnd()+'…':text;
}
function observation(item){
 if(item.annotations?.notes)return excerpt(item.annotations.notes);
 const silhouettes=item.annotations?.silhouette;
 return Array.isArray(silhouettes)&&silhouettes.length?silhouettes.join(', '):'';
}
export function renderEvidenceGallery({evidence=[],photo,compact=false,galleryOpen=true,step=12,collection}={}){
 const allowed=evidenceCollections(step),selected=allowed.includes(collection)?collection:allowed[0];
 if(!selected)return '';
 const items=relevantEvidence(evidence,step,selected),photos=items.filter(item=>photoSource(item,photo)).length,references=items.length-photos;
 return `<details class="exercise-evidence-gallery ${compact?'is-compact':''}" data-evidence-gallery data-evidence-step="${Number(step)}" data-evidence-collection="${selected}" ${galleryOpen?'open':''}>
  <summary><span class="exercise-evidence-gallery-title">${collectionLabel(selected)}</span><span class="exercise-evidence-gallery-count">${items.length} ${items.length===1?'reference':'references'}<span>${photos} ${photos===1?'photo':'photos'}${references?' · '+references+' written '+(references===1?'reference':'references'):''}</span></span><span class="exercise-evidence-gallery-toggle" aria-hidden="true">+</span></summary>
  ${collectionTabs(step,selected)}<div class="exercise-evidence-gallery-body"><div class="exercise-evidence-gallery-intro"><p>All ${collectionLabel(selected).toLowerCase()} in this preview are shown here. The two evidence collections stay separate. Select a reference to look more closely or review its observations.</p><button type="button" class="prototype-text-button" data-action="gallery" data-collection="${selected}">Add or manage references</button></div>
  ${items.length?`<div class="exercise-evidence-grid">${items.map((item,index)=>{
   const source=photoSource(item,photo),note=observation(item),stock=!!item.asset;
   return `<figure class="exercise-evidence-card" data-evidence-card="${e(item.id)}"><button type="button" class="exercise-evidence-photo" data-action="photo" data-photo="${e(item.id)}" aria-label="Open ${e(item.title||'outfit reference '+(index+1))}">${source?`<img src="${e(source)}" alt="${e((stock?'Sample outfit: ':'Outfit reference: ')+(item.title||'Recent outfit'))}" loading="lazy" decoding="async">`:`<span class="exercise-written-reference"><span>WRITTEN REFERENCE</span><span>${e(excerpt(item.reference||item.title||'My outfit reference',210))}</span></span>`}</button><figcaption><div class="exercise-evidence-card-title"><span>${String(index+1).padStart(2,'0')}</span><h3>${e(item.title||'Outfit reference')}</h3></div><p class="exercise-evidence-origin">${source?(stock?'Stock photo · sample outfit':'Image added to this preview'):'Written outfit reference'}</p>${note?`<p class="exercise-evidence-observation"><span>Recorded observation</span>${e(note)}</p>`:''}</figcaption></figure>`;
  }).join('')}</div>`:`<div class="exercise-evidence-empty"><h3>No ${collectionLabel(selected).toLowerCase()} yet.</h3><p>Add images or a written reference to this collection to use alongside this exercise.</p><button type="button" class="prototype-primary" data-action="gallery" data-collection="${selected}">Add outfit references</button></div>`}
  </div>
 </details>`;
}
