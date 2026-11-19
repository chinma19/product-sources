import {workbook,controls,resolveValue,formatValue} from '../server/model.mjs';
import {escapeHTML as e} from './exports.mjs';
// Presentation dependencies only: approved content and answer keys remain untouched.
const extra={9:[8],11:[10],13:[12],14:[13],15:[14],16:[15],17:[16],18:[17],19:[18],25:[23,24],26:[23,25],27:[25,26],28:[23],29:[28],30:[28,29],31:[23,27],32:[31],36:[],37:[36],39:[36,38],40:[39],41:[39,40],42:[38,39,41],50:[49,20],51:[49,50],52:[33,49,51],53:[20,52],55:[54],56:[47,49,54],57:[54,55,56],58:[57],64:[57,43],65:[48,53],66:[64,61],68:[67]};
const profileFields={20:['body.fit','body.silhouette','body.proportion','body.length','body.neckline','body.exposure','body.comfort'],33:['personality.1','personality.2','personality.3','personality.4','personality.5','personality.6','personality.7','personality.sentence'],43:['lifestyle.contexts','lifestyle.help','lifestyle.practical','lifestyle.priority'],67:['identity','qualities.final','style.language','colours','signatures.top','outfits','rules.summary','lifestyle.priority','shopping.filter']};
export const editHref=(source,current)=>`#/step/${source}?return=${encodeURIComponent(current)}`;
export function referenceTargets(page){
 const ids=new Set();const add=id=>{if(id&&id!=='brief.pending'&&!['evidence','image-sort','assembly','candidates'].includes(controls.get(id)?.type))ids.add(id)};
 for(const n of [...(extra[page.page]||[]),...(page.references||[])]){const p=workbook.pages[n-1];for(const id of profileFields[n]||p?.controls.map(c=>c.id)||[])add(id)}
 for(const c of page.controls){add(c.source);for(const id of Object.values(c.cellSources||{}))add(id)}
 return [...ids].filter(id=>{const origin=workbook.pages.find(p=>p.controls.some(c=>c.id===id));return origin&&origin.page<page.page});
}
export function displayAnswer(id,answers,bindingState={}){const c=controls.get(id),v=resolveValue(id,answers,new Set(),bindingState);if(c?.type==='scale'&&typeof v==='number'){const position=c.positions.indexOf(v);return `${c.ends[0]} ↔ ${c.ends[1]}: ${position>=0?position+1:v} ${position>=0?'of 7':'on the recorded scale'}`;}return formatValue(v)}
export function discoveries(page,answers,bindingState={}){return referenceTargets(page).map(id=>({id,label:controls.get(id)?.label||id,text:displayAnswer(id,answers,bindingState),page:workbook.pages.find(p=>p.controls.some(c=>c.id===id))?.page})).filter(x=>x.text.trim());}
export function relevantEvidence(page,items){
 if(page.page<8)return [];
 const kind=page.part===1?'recent':page.part===2?'inspiration':null;
 let selected=items.filter(x=>!kind||x.kind===kind);
 const topic=page.page<=10?'fit':page.page<=12?'silhouette':page.page<=14?'proportion':page.page<=16?'neckline':page.page<=18?'exposure':page.page===19?'comfort':page.page>=28&&page.page<=30?'colour':null;
 if(topic){const tagged=selected.filter(x=>{const v=x.annotations?.[topic];return Array.isArray(v)?v.length:typeof v==='object'?Object.values(v).some(Boolean):!!v});if(tagged.length)selected=tagged;}
 if(page.part===3)selected=selected.filter(x=>x.kind==='recent'&&(x.annotations?.comfort?.length||x.annotations?.notes));
 return selected;
}
const short=text=>text.length>210?text.slice(0,210)+'…':text;
function record(r,current){return `<article class="discovery-record" data-reference-id="${e(r.id)}"><h3>${e(r.label.replace(/_{2,}/g,'…'))}</h3>${r.text.length>210?`<details class="answer-expansion"><summary>${e(short(r.text))} <span>Read full answer</span></summary><p class="recorded-answer">${e(r.text)}</p></details>`:`<p class="recorded-answer">${e(r.text)}</p>`}<a class="edit-discovery" href="${e(editHref(r.page,current))}">Edit step ${r.page} & return ↗</a></article>`}
export function renderDiscoveries(page,answers,items,current=`#/step/${page.page}`,bindingState={}){
 const records=discoveries(page,answers,bindingState),images=relevantEvidence(page,items);if(!records.length&&!images.length)return '';
 const thumbnails=images.slice(0,4).map(x=>`<figure>${x.url?`<img src="${e(x.url)}" alt="${e(x.title)}" loading="lazy" decoding="async">`:`<div class="reference-placeholder">${e(short(x.reference||x.title))}</div>`}<figcaption>${e(x.title)}${x.sort?`<small>${e(x.sort)}</small>`:''}${x.annotations?.notes?`<details><summary>My notes</summary><p>${e(x.annotations.notes)}</p></details>`:''}</figcaption></figure>`).join('');
 return `<details class="reference-panel discoveries-panel" open><summary>Your discoveries so far <span>${records.length?records.length+' answers':''}${images.length?' · '+images.length+' references':''}</span></summary><p class="context-note">Your recorded words and selections. Use what is relevant to this exercise.</p>${records.length?`<div class="discoveries-grid">${records.slice(0,3).map(r=>record(r,current)).join('')}</div>${records.length>3?`<details class="more-discoveries"><summary>See ${records.length-3} more relevant answers</summary><div class="discoveries-grid">${records.slice(3).map(r=>record(r,current)).join('')}</div></details>`:''}`:''}${images.length?`<div class="context-images">${thumbnails}</div><a class="edit-discovery" href="${e('#/evidence?return='+encodeURIComponent(current))}">Review ${images.length>4?'all '+images.length+' references':'my evidence'} & return ↗</a>`:''}</details>`;
}
export function sourcePreview(c,answers,current,bindingState={}){if(!c.source||c.source===c.id)return '';const text=displayAnswer(c.source,answers,bindingState);if(!text)return '';const p=workbook.pages.find(p=>p.controls.some(x=>x.id===c.source));return `<aside class="source-preview"><span>Earlier · ${e(controls.get(c.source)?.label||'My answer')}</span><p>${e(short(text))}</p>${p?`<a href="${e(editHref(p.page,current))}">Edit earlier answer & return ↗</a>`:''}</aside>`}
