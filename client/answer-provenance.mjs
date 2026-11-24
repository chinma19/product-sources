// Presentation-only provenance labels around the existing response/binding model.
// They never become answers, rewrite wording, or claim an inferred style.
import {workbook,controls,bindingInfo,resolveValue,formatValue} from '../server/model.mjs';
import bindings from '../content/part5-bindings.json' with {type:'json'};
import {escapeHTML as e} from './exports.mjs';
const selectedTypes=new Set(['checks','single','matrix','scale','time','compass','colours','image-sort']);
const origin=id=>workbook.pages.find(page=>page.controls.some(control=>control.id===id));
const unique=items=>[...new Set(items.filter(Boolean))];
export const defaultSourceLink=n=>{const current=globalThis.location?.hash?.split('?')[0]||'#/blueprint';return `#/step/${n}?return=${encodeURIComponent(current)}`;};
const pending=id=>id==='brief.pending'||id.startsWith('summary.pending.');
function cellSources(id,cell,fallback){
 if(id==='style.language'&&cell){const [row,column]=cell.split('::'),spec=bindings.tables['style.language'][row];if(spec)return column==='My preference'?spec.sources:unique([...spec.clothingSources,'translation','dictionary.entries']);}
 const source=controls.get(id)?.cellSources?.[cell];return source?[source]:fallback;
}
export function answerProvenance(id,state,{cell}={}){
 const answers=state?.answers||{},bindingState=state?.bindingState||{},c=controls.get(id),info=bindingInfo(id,answers,bindingState);
 const value=resolveValue(id,answers,new Set(),bindingState),recorded=formatValue(cell?value?.[cell]:value).trim().length>0;
 const mode=cell?(info.cells?.[cell]||'linked'):info.mode;
 const sourceIds=cell?cellSources(id,cell,info.sourceIds):info.sourceIds;
 const ownConfirmation=!!bindingState[id]?.sourceSnapshot;
 let kind,label;
 if(pending(id)){kind='draft';label='Optional draft · review required';}
 else if(mode==='linked'&&sourceIds.length){kind='inherited';label='Inherited from earlier responses';}
 else if(ownConfirmation){kind='confirmed';label='Confirmed customer wording';}
 else if(mode==='override'&&sourceIds.length){kind='edited';label='Deliberately edited';}
 else if(selectedTypes.has(c?.type)){kind='selected';label='Customer-selected options';}
 else{kind='written';label='Customer-written reflection';}
 const sources=unique(sourceIds).map(source=>{const page=origin(source);return page?{id:source,page:page.page,title:page.title,label:controls.get(source)?.label||source}:null}).filter(Boolean);
 const first=origin(id),shared=first?.page<58&&workbook.pages.some(page=>page.page>=58&&page.controls.some(control=>control.id===id))?{page:first.page,title:first.title}:null;
 return {id,cell,kind,label,mode,recorded,confirmed:!pending(id)&&info.confirmation.tracked,stale:info.sourceChanged,legacy:mode==='legacy'||!cell&&info.legacy,optional:!!c?.optional||pending(id),sourceIds:[...sourceIds],sources,shared};
}
export function provenanceMarkup(id,state,{cell,compact=false,includeSources=true,sourceLink=defaultSourceLink}={}){
 const info=answerProvenance(id,state,{cell});
 const secondary=[];
 if(info.confirmed&&info.kind!=='confirmed')secondary.push('Confirmed customer wording');
 if(info.legacy)secondary.push('Saved wording · connection not yet reviewed');
 if(info.optional&&info.kind!=='draft')secondary.push('Optional');
 if(!info.recorded&&info.kind!=='draft')secondary.push('No response recorded');
 const seen=new Set(),sources=info.sources.filter(source=>{if(seen.has(source.page))return false;seen.add(source.page);return true});
 return `<div class="answer-provenance ${cell?'cell-provenance':'field-provenance'} ${compact?'is-compact':''}" data-provenance-id="${e(id)}" ${cell?`data-provenance-cell="${e(cell)}"`:''} data-provenance-kind="${info.kind}" data-binding-mode="${info.mode}"><p class="provenance-label"><span class="provenance-type">${e(info.label)}</span>${secondary.length?`<span class="provenance-status">${secondary.map(e).join(' · ')}</span>`:''}</p>${info.stale?'<p class="provenance-changed">Earlier responses changed; confirmed wording is kept for review.</p>':''}${includeSources&&(sources.length||info.shared)?`<details class="provenance-sources"><summary>${info.kind==='edited'||info.legacy?'Earlier response sources':'View response sources'}</summary><ul>${sources.map(source=>`<li><a href="${e(sourceLink(source.page,source.id))}">${e(source.title)}</a><span>${e(source.label.replace(/_{2,}/g,'…'))}</span></li>`).join('')}${info.shared?`<li><a href="${e(sourceLink(info.shared.page,id))}">${e(info.shared.title)}</a><span>The same saved response is used here and in this earlier exercise.</span></li>`:''}</ul></details>`:''}</div>`;
}
/** Decorate a detached core result/source container without altering its content. */
export function decorateProvenance(container,state,options={}){
 for(const entry of container.querySelectorAll('[data-result-id]')){
  const id=entry.dataset.resultId;if(!controls.has(id))continue;
  const old=[...entry.children].find(child=>child.classList.contains('result-provenance')||child.classList.contains('field-provenance'));
  const holder=container.ownerDocument.createElement('div');holder.innerHTML=provenanceMarkup(id,state,options);const label=holder.firstElementChild;
  if(old)old.replaceWith(label);else entry.append(label);
 }
 for(const entry of container.querySelectorAll('[data-provenance-field],[data-source-id]')){
  const id=entry.dataset.provenanceField||entry.dataset.sourceId;if(!controls.has(id))continue;
  const old=[...entry.children].find(child=>child.classList.contains('field-provenance'));
  const holder=container.ownerDocument.createElement('div');holder.innerHTML=provenanceMarkup(id,state,options);const label=holder.firstElementChild;
  if(old)old.replaceWith(label);else entry.append(label);
 }
 return container;
}
