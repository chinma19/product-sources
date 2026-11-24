import {resolveValue,formatValue} from '../server/model.mjs';
import {escapeHTML as e} from './exports.mjs';
import {provenanceMarkup} from './answer-provenance.mjs';

const valueOf=(id,state)=>resolveValue(id,state?.answers||{},new Set(),state?.bindingState||{});
const words=value=>Array.isArray(value)?value.filter(word=>typeof word==='string'&&word.trim()):[];
const photoURL=item=>typeof item?.url==='string'&&item.url.startsWith('/api/evidence/')&&!item.url.includes('\\')?item.url:'';
const currentPage=page=>typeof page==='number'?page:page?.page||null;

/** Frame the existing, source-linked result. No response or persistence writes. */
export function renderEditorialBlueprint({page=null,state,evidence=[],renderOutput,mode='glance'}){
 const number=currentPage(page),fullRoute=!number;
 const selectedMode=number===67?'master':number===68?'glance':mode==='master'?'master':'glance';
 const composed=fullRoute||[58,67,68].includes(number);
 const portrait=evidence.find(item=>item.kind==='recent'&&photoURL(item))||evidence.find(item=>photoURL(item));
 const image=photoURL(portrait),identity=formatValue(valueOf('identity',state)).trim(),qualities=words(valueOf('qualities.final',state));
 const output=typeof renderOutput==='function'?renderOutput(selectedMode,page):'';
 const tabs=fullRoute?`<button data-action="blueprint-mode" data-mode="glance" aria-pressed="${selectedMode==='glance'}">My One-Glance Blueprint</button><button data-action="blueprint-mode" data-mode="master" aria-pressed="${selectedMode==='master'}">My Master Blueprint</button>`:`<a href="#/step/68" ${number===68?'aria-current="page"':''}>My One-Glance Blueprint</a><a href="#/step/67" ${number===67?'aria-current="page"':''}>My Master Blueprint</a>`;
 return `<section class="editorial-blueprint editorial-blueprint--${composed?selectedMode:'step'} ${image?'has-evidence-photo':''}" data-editorial-blueprint data-blueprint-mode="${selectedMode}" aria-label="${composed?'My Personal Style Blueprint':'My saved discoveries'}">
  ${composed?`<div class="editorial-reference-topline"><span>IN HER FASHION</span><span>BODY + PERSONALITY + LIFESTYLE</span></div><div class="editorial-reference-cover"><div class="editorial-reference-cover-copy">${fullRoute?'<p class="editorial-reference-kicker">YOUR PERSONAL STYLE BLUEPRINT</p><h2 class="editorial-reference-title">My Personal<br>Style Blueprint</h2>':''}${identity?`<div class="editorial-reference-cover-identity"><p class="editorial-reference-small-label">MY STYLE IDENTITY</p><p class="editorial-reference-identity">${e(identity)}</p>${provenanceMarkup('identity',state,{compact:true,includeSources:false})}<button class="text-button editorial-reference-text-action" data-action="edit-blueprint" data-field="identity">Edit my style identity</button></div>`:''}${qualities.length?`<ul class="editorial-reference-quality-line" aria-label="My core qualities">${qualities.map(word=>`<li>${e(word)}</li>`).join('')}</ul>`:''}</div>${image?`<figure class="editorial-reference-portrait"><img src="${e(image)}" alt="${e(portrait.title||'My outfit reference')}" loading="lazy" decoding="async"><figcaption><span>MY EVIDENCE</span><span>${e(portrait.title||'')}</span></figcaption></figure>`:''}</div><div class="editorial-reference-toolbar"><nav class="editorial-reference-tabs" aria-label="Blueprint views">${tabs}</nav><button class="editorial-reference-download" data-action="${selectedMode==='glance'?'pdf-glance':'pdf'}">${selectedMode==='glance'?'Save One-Glance PDF':'Save full Blueprint PDF'}</button></div>`:''}
  <div class="editorial-reference-publication">${output}</div>
  ${composed?'<footer class="editorial-reference-endnote"><p>Your observations. Your own direction.</p><span>IN HER FASHION</span></footer>':''}
 </section>`;
}

/** Separate portal: the controller owns focus, validation and explicit closing. */
export function renderBlueprintEditor({control,field}){
 if(!control)return '';
 const contents=typeof field==='function'?field(control):field||'';
 return `<div class="editorial-blueprint-editor-backdrop" data-editorial-blueprint-editor data-editorial-editor-field="${e(control.id)}"><section class="editorial-blueprint-editor" role="dialog" aria-modal="true" aria-labelledby="editorial-blueprint-editor-title" tabindex="-1"><header class="editorial-blueprint-editor-heading"><div><p class="editorial-reference-kicker">MY BLUEPRINT</p><h2 id="editorial-blueprint-editor-title">${e(control.label)}</h2></div><button class="editorial-blueprint-editor-close" data-action="finish-blueprint-edit" data-field="${e(control.id)}" aria-label="Close Blueprint editor">Close</button></header><div class="editorial-blueprint-editor-body">${contents}</div><footer><button class="editorial-blueprint-editor-done" data-action="finish-blueprint-edit" data-field="${e(control.id)}">Done editing</button></footer></section></div>`;
}
