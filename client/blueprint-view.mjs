import {workbook,controls,resolveValue,formatValue,bindingInfo} from '../server/model.mjs';
import {blueprintSections} from '../server/blueprint.mjs';
import {escapeHTML as e} from './exports.mjs';
const hasText=value=>formatValue(value).trim().length>0;
const defaultLink=n=>`#/step/${n}`;
const origin=id=>workbook.pages.find(p=>p.controls.some(c=>c.id===id));
const active=(editing,id)=>editing===true||editing?.has?.(id);
const hex=value=>/^#[a-f0-9]{6}$/i.test(value||'')?value:null;
const controlFor=id=>controls.get(id);

function colourMarkup(value){return `<dl class="blueprint-colours">${Object.entries(value||{}).filter(([,v])=>v&&(v.name||v.hex)).map(([role,v])=>`<div><dt>${e(role)}</dt><dd>${hex(v.hex)?`<svg class="result-swatch" width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect x="1" y="1" width="26" height="26" rx="1" fill="${hex(v.hex)}" stroke="currentColor" stroke-width=".5"/></svg>`:''}<span>${e(v.name||'')}${v.hex?`<small>${e(v.hex.toUpperCase())}</small>`:''}</span></dd></div>`).join('')}</dl>`}
function structuredMarkup(value,type){
 const rows=new Map();for(const [key,text]of Object.entries(value||{})){if(!hasText(text))continue;const [row,column]=key.split('::');if(!rows.has(row))rows.set(row,[]);rows.get(row).push({label:column||'',text:formatValue(text)});}
 return `<div class="blueprint-structured">${[...rows].map(([row,cells])=>`<section><h4>${e(type==='outfits'?'Outfit direction '+row:row)}</h4><dl>${cells.map(cell=>`<div>${cell.label?`<dt>${e(cell.label)}</dt>`:''}<dd>${e(cell.text)}</dd></div>`).join('')}</dl></section>`).join('')}</div>`;
}
export function resultValue(entry){
 const value=entry.raw;
 if(entry.colours)return colourMarkup(entry.colours);
 if(entry.type==='colours'&&value&&typeof value==='object')return colourMarkup(value);
 if(['table','outfits','patterns'].includes(entry.type)&&value&&typeof value==='object')return structuredMarkup(value,entry.type);
 if(Array.isArray(value))return `<ul class="blueprint-word-list">${value.filter(hasText).map(x=>`<li>${x&&typeof x==='object'&&'quality'in x?`<strong>${e(x.quality)}</strong>${x.meaning?`<p>${e(x.meaning)}</p>`:''}${x.clothing?`<p>${e(x.clothing)}</p>`:''}`:e(formatValue(x))}</li>`).join('')}</ul>`;
 return `<p class="blueprint-answer">${e(entry.value)}</p>`;
}
function sourceLinks(entry,editHref){const ids=entry.provenance?.sourceIds||[],seen=new Set();return ids.map(id=>{const page=origin(id);if(!page||seen.has(page.page))return '';seen.add(page.page);return `<a href="${e(editHref(page.page,id))}">${e(page.title)} ↗</a>`}).filter(Boolean).join(' · ')}
export function renderResultEntry(entry,answers,bindingState,{editing,field,editHref=defaultLink,notice}={}){
 const c=entry.control||controlFor(entry.key),edited=active(editing,entry.key),sources=sourceLinks(entry,editHref),p=entry.provenance||bindingInfo(entry.key,answers,bindingState);
 const label=entry.label||c?.label;
 const status=p.legacy?'Saved answer · review available':p.mode==='override'&&p.sourceIds?.length?'Edited for my Blueprint':p.sourceIds?.length?'From my discoveries':'My recorded answer';
 const populated=hasText(entry.raw??entry.value);
 return `<article class="blueprint-result-field ${populated?'is-recorded':'is-missing'}" data-result-id="${e(entry.key)}" data-field="${e(entry.key)}"><div class="result-field-heading"><h3>${e(label)}</h3>${c?`<button class="text-button" data-action="${edited?'finish-blueprint-edit':'edit-blueprint'}" data-field="${e(entry.key)}">${edited?'Done editing':populated?'Edit':'Add my answer'}</button>`:''}</div>${!edited&&populated?resultValue(entry):edited?'':`<p class="blueprint-missing">Not recorded yet.</p>${sources?`<p class="blueprint-source-links">Review ${sources}</p>`:origin(entry.key)?`<a class="blueprint-source-links" href="${e(editHref(origin(entry.key).page,entry.key))}">Open ${e(origin(entry.key).title)} ↗</a>`:''}`}${c&&notice?notice(c):''}${edited&&field&&c?`<div class="blueprint-inline-editor">${field(c)}</div>`:''}${populated?`<div class="result-provenance" data-provenance="${e(p.mode||'linked')}"><span aria-hidden="true">${p.mode==='override'?'✎':'↗'}</span> ${e(status)}${p.sourceChanged?' · Earlier answers changed':''}${sources?`<details><summary>View source</summary><p>${sources}</p></details>`:''}</div>`:''}</article>`;
}
function entryFor(c,answers,bindingState){const raw=resolveValue(c.id,answers,new Set(),bindingState);return {key:c.id,label:c.label,type:c.type,control:c,raw,value:formatValue(raw),provenance:bindingInfo(c.id,answers,bindingState),...(c.id==='glance.colours'&&bindingInfo(c.id,answers,bindingState).mode==='linked'?{colours:resolveValue('colours',answers,new Set(),bindingState)}:{})}}
function renderGlance(answers,bindingState,options){const entries=workbook.pages[67].controls.filter(c=>!c.optional).map(c=>entryFor(c,answers,bindingState));return `<section class="glance-dossier blueprint-result-glance"><p class="eyebrow">KEEP THIS CLOSE</p><h2>My One-Glance Blueprint</h2><div class="blueprint-glance-grid">${entries.map(entry=>renderResultEntry(entry,answers,bindingState,options)).join('')}</div></section>`}
function renderMaster(answers,bindingState,options){const sections=blueprintSections(answers,{bindingState,includeEmpty:true});return `<section class="master-dossier blueprint-result-master"><h2>My Master Blueprint</h2>${sections.map(section=>`<section class="blueprint-result-section" data-result-section="${e(section.id)}"><h3 class="result-section-title">${e(section.title)}</h3>${section.entries.some(entry=>hasText(entry.raw)||active(options.editing,entry.key))?section.entries.filter(entry=>hasText(entry.raw)||active(options.editing,entry.key)).map(entry=>renderResultEntry(entry,answers,bindingState,options)).join(''):`<p class="blueprint-missing">Not recorded yet.</p><a class="blueprint-source-links" href="${e((options.editHref||defaultLink)(origin(section.entries[0]?.key)?.page||67,section.entries[0]?.key))}">Review ${e(origin(section.entries[0]?.key)?.title||'my discoveries')} ↗</a>`}</section>`).join('')}</section>`}
export function renderBlueprint(answers,bindingState={},options={}){return `<div class="blueprint-output" data-blueprint-output>${renderGlance(answers,bindingState,options)}${renderMaster(answers,bindingState,options)}</div>`}
export function renderPart5Page(page,answers,bindingState={},options={}){
 if(page.page===68)return `<div class="blueprint-output" data-blueprint-output>${renderGlance(answers,bindingState,options)}</div>`;
 if(page.page===67)return `<div class="blueprint-output" data-blueprint-output>${renderMaster(answers,bindingState,options)}</div>`;
 return `<div class="blueprint-output blueprint-step-output" data-blueprint-output>${page.controls.filter(c=>!c.optional&&(hasText(resolveValue(c.id,answers,new Set(),bindingState))||active(options.editing,c.id))).map(c=>renderResultEntry(entryFor(c,answers,bindingState),answers,bindingState,options)).join('')}${page.controls.some(c=>!c.optional&&!hasText(resolveValue(c.id,answers,new Set(),bindingState))&&!active(options.editing,c.id))?`<details class="blueprint-missing-fields"><summary>Review information not yet recorded</summary>${page.controls.filter(c=>!c.optional&&!hasText(resolveValue(c.id,answers,new Set(),bindingState))&&!active(options.editing,c.id)).map(c=>renderResultEntry(entryFor(c,answers,bindingState),answers,bindingState,options)).join('')}</details>`:''}${page.controls.filter(c=>c.optional).map(c=>`<details class="blueprint-optional"><summary>Optional: ${e(c.label)}</summary>${renderResultEntry(entryFor(c,answers,bindingState),answers,bindingState,options)}</details>`).join('')}</div>`;
}
