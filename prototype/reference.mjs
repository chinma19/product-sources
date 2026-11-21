import {resolveValue,formatValue} from '../server/model.mjs';
import {escapeHTML as e} from '../client/exports.mjs';

const imageSource=value=>typeof value==='string'&&/^(data:image\/(?:png|jpeg|webp|gif|svg\+xml)[;,]|blob:)/i.test(value)?value:'';
const safeMode=mode=>mode==='master'?'master':'glance';
const valueOf=(id,state)=>resolveValue(id,state?.answers||{},new Set(),state?.bindingState||{});
const words=value=>Array.isArray(value)?value.filter(item=>typeof item==='string'&&item.trim()):[];

/**
 * Isolated editorial preview only. The result and editor callbacks retain the
 * application's source bindings, missing-answer guidance and existing controls.
 * This module never writes responses, builds a style identity or calls an API.
 */
export function renderReference({state,workbook,evidence=[],photo,mode='glance',renderOutput,renderEditor,editorId}){
 const selectedMode=safeMode(mode);
 const portrait=evidence.find(item=>item.kind==='recent'&&imageSource(photo?.(item)))||evidence.find(item=>imageSource(photo?.(item)));
 const photoURL=portrait&&photo?imageSource(photo(portrait)):'';
 const identity=formatValue(valueOf('identity',state)).trim();
 const qualities=words(valueOf('qualities.final',state));
 const control=editorId?workbook?.pages.flatMap(page=>page.controls).find(field=>field.id===editorId):null;
 const output=typeof renderOutput==='function'?renderOutput(selectedMode):'';
 return `<main class="preview-reference reference-${selectedMode}" aria-labelledby="reference-title">
  <div class="reference-topline"><span>IN HER FASHION</span><span>BODY + PERSONALITY + LIFESTYLE</span></div>
  <section class="reference-cover" aria-label="My personal style reference">
   <div class="reference-cover-copy">
    <p class="reference-kicker">YOUR PERSONAL STYLE BLUEPRINT</p>
    <h1 id="reference-title">My Personal<br>Style Blueprint</h1>
    ${identity?`<div class="reference-cover-identity"><p class="reference-small-label">MY STYLE IDENTITY</p><p class="reference-identity">${e(identity)}</p><button class="reference-text-action" data-action="edit-field" data-id="identity">Edit my style identity</button></div>`:''}
    ${qualities.length?`<ul class="reference-quality-line" aria-label="My core qualities">${qualities.map(word=>`<li>${e(word)}</li>`).join('')}</ul>`:''}
   </div>
   <figure class="reference-portrait">${photoURL?`<img src="${e(photoURL)}" alt="${e(portrait.title||'My outfit reference')}" loading="eager" decoding="async">`:`<div class="reference-photo-placeholder"><span>IN HER FASHION</span><p>My personal<br>style reference</p></div>`}<figcaption><span>MY EVIDENCE</span>${portrait?.title?`<span>${e(portrait.title)}</span>`:''}</figcaption></figure>
  </section>
  <div class="reference-toolbar">
   <nav class="reference-tabs" aria-label="Blueprint views">
    <button data-action="reference-mode" data-mode="glance" aria-pressed="${selectedMode==='glance'}">My One-Glance Blueprint</button>
    <button data-action="reference-mode" data-mode="master" aria-pressed="${selectedMode==='master'}">My Master Blueprint</button>
   </nav>
   <button class="reference-download" data-action="export-pdf" data-mode="${selectedMode}">${selectedMode==='glance'?'Save One-Glance PDF':'Save full Blueprint PDF'}</button>
  </div>
  <section class="reference-publication" aria-label="${selectedMode==='glance'?'My One-Glance Blueprint':'My Master Blueprint'}">${output}</section>
  <footer class="reference-endnote"><p>Your observations. Your own direction.</p><span>IN HER FASHION</span></footer>
  ${editorId?`<div class="reference-editor-backdrop"><section class="reference-editor" role="dialog" aria-modal="true" aria-labelledby="reference-editor-title" tabindex="-1"><div class="reference-editor-heading"><div><p class="reference-kicker">MY BLUEPRINT</p><h2 id="reference-editor-title">${e(control?.label||'Edit my reference')}</h2></div><button class="reference-editor-close" data-action="close-editor" aria-label="Close Blueprint editor">Close</button></div><div class="reference-editor-body">${typeof renderEditor==='function'?renderEditor(editorId):''}</div><footer><button class="reference-editor-done" data-action="close-editor">Done editing</button></footer></section></div>`:''}
 </main>`;
}
