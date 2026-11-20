// Presentation-only guidance. Never store these messages as customer responses.
import {workbook,controls,getSourceIds} from '../server/model.mjs';
import bindings from '../content/part5-bindings.json' with {type:'json'};
import {escapeHTML as e} from './exports.mjs';
const origin=id=>workbook.pages.find(page=>page.controls.some(control=>control.id===id));
const unique=values=>[...new Set(values)];
const newDecisionPage=id=>id==='outfits'?63:id.startsWith('rules.')?64:id.startsWith('permission.')?65:['compass.item','compass.scores','compass.notes','compass.decision'].includes(id)?66:['signatures.one','signatures.repeated.6'].includes(id)?62:null;
function pagesFor(id,seen=new Set()){
 if(seen.has(id))return [];seen.add(id);
 const page=origin(id);
 // A consolidated profile is itself a valid source and may have a deliberate edit.
 if(page?.page<58)return [page.page];
 const sources=getSourceIds(id),earlier=sources.flatMap(source=>pagesFor(source,new Set(seen)));
 return earlier.length?earlier:page?[page.page]:[];
}
export function guidanceDescriptor(id,{cell}={}){
 if(cell&&id==='style.language'){
  const [row,column]=cell.split('::'),spec=bindings.tables['style.language'][row];
  if(spec){const ids=column==='My preference'?spec.sources:[...spec.clothingSources,'translation','dictionary.entries'];return {kind:'discovery',message:'Missing discovery information. Not recorded yet.',pages:unique(ids.flatMap(source=>pagesFor(source))).slice(0,3)};}
 }
 const c=controls.get(id),page=origin(id),sources=getSourceIds(id);
 if(c?.optional)return {kind:'optional',message:'Optional reflection. No response recorded.',pages:unique(sources.flatMap(source=>pagesFor(source))).slice(0,3).concat(sources.length?[]:page?[page.page]:[])};
 if(['colour.new','colour.three','colour.result'].includes(id))return {kind:'optional',message:'Optional colour check. No item recorded.',pages:[30]};
 const explicitNew=newDecisionPage(id);
 const pages=unique((sources.length?sources.flatMap(source=>pagesFor(source)):pagesFor(id))).slice(0,3);
 const kind=explicitNew||pages.length&&pages.every(n=>n>=58)?'new':'discovery';
 return {kind,message:kind==='new'?'New decision in Part 5. Not recorded yet.':'Missing discovery information. Not recorded yet.',pages:explicitNew?[explicitNew]:pages.length?pages:page?[page.page]:[]};
}
export function missingGuidance(id,{cell,editHref=n=>`#/step/${n}`}={}){
 const guidance=guidanceDescriptor(id,{cell});
 const links=guidance.pages.map(n=>{const page=workbook.pages[n-1];return page?`<a href="${e(editHref(n,id))}">${e(page.title)}</a>`:''}).filter(Boolean).join(' · ');
 return `<div class="blueprint-gap-guidance" data-blueprint-guidance data-guidance-kind="${guidance.kind}"><p class="blueprint-missing">${e(guidance.message)}</p>${links?`<p class="blueprint-source-links">${guidance.kind==='discovery'?'Review earlier discoveries:':guidance.kind==='new'?'Explore this decision:':'Review if useful:'} ${links}</p>`:''}</div>`;
}
