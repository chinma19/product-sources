import {resolveValue,sourceSnapshot} from './model.mjs';
// Evidence-backed literal repetition only. No NLP, body diagnosis, or inferred aesthetic.
const positive=new Set(['Love it','Like it','Yes — I love this','Must have','Nice to have','Non-negotiable','Important']);
export function candidatePatterns(answers,evidence=[]){
 const terms=new Map();
 const record=(text,source,part)=>{if(typeof text!=='string'||!text.trim()||text.length>100)return;const term=text.trim(),key=term.toLocaleLowerCase().replace(/\s+/g,' ');if(!terms.has(key))terms.set(key,{term,sources:[],parts:new Set()});const entry=terms.get(key);entry.parts.add(part);if(!entry.sources.includes(source))entry.sources.push(source)};
 for(const [id,part]of [['fit.ratings',1],['silhouette.ratings',1],['proportion.ratings',1],['life.needs',3],['practical.sort',3]])for(const [term,reaction]of Object.entries(answers[id]||{}))if(positive.has(reaction))record(term,id,part);
 for(const [id,part]of [['inspiration.top',2],['visual.qualities',2]])for(const term of answers[id]||[])record(term,id,part);
 for(const [id,arr]of Object.entries(answers))if(/^p(9|12|14|16|19|23|31|36|40)\.choices/.test(id)&&Array.isArray(arr))for(const term of arr)record(term,id,Number(id.match(/^p(\d+)/)[1])<=20?1:Number(id.match(/^p(\d+)/)[1])<=34?2:3);
 for(const item of evidence){const a=item.annotations||{};if(item.kind==='recent'&&['Love it','Like it'].includes(a.fitReaction)){record(a.fit,'evidence:'+item.id,1);for(const t of a.silhouette||[])record(t,'evidence:'+item.id,1)}if(item.kind==='inspiration'&&item.sort==='Beautiful + Me')for(const key of ['silhouette','colour','texture','detail','feeling'])for(const t of a[key]||[])record(t,'evidence:'+item.id,2)}
 return [...terms.values()].filter(x=>x.parts.size>=2).map(({term,sources})=>({term,sources})).sort((a,b)=>a.term.localeCompare(b.term));
}
export function assembleBrief(answers,bindingState={}){
 const value=id=>resolveValue(id,answers,new Set(),bindingState),list=k=>Array.isArray(value(k))?value(k).filter(s=>typeof s==='string'&&s.trim()):[];
 const core=list('qualities.core'),support=list('qualities.supporting'),accent=list('qualities.accent');
 const life=[value('direction.5'),value('lifestyle.priority')].find(v=>typeof v==='string'&&v.trim())?.trim()||'';
 const missing=[];if(!core.length)missing.push('core qualities');if(!support.length)missing.push('one supporting quality');if(!accent.length)missing.push('one accent quality');if(!life)missing.push('lifestyle');
 const sourceIds=['qualities.core','qualities.supporting','qualities.accent','direction.5','lifestyle.priority'];
 return {text:`I want to dress in a way that feels ${core.join(', ')||'[CORE QUALITIES]'}, combining ${support[0]||'[QUALITY]'} with ${accent[0]||'[QUALITY]'}, while keeping my clothes practical for ${life||'[LIFESTYLE]'}.`,missing,sourceIds,sourceSnapshot:sourceSnapshot(sourceIds,answers,bindingState)};
}
export function validateAnnotations(kind,a){
 if(!a||typeof a!=='object'||Array.isArray(a))return false;
 const allowed=kind==='recent'?['fit','fitReaction','silhouette','proportion','neckline','exposure','comfort','notes']:['silhouette','colour','texture','detail','feeling','notes'];
 const list=x=>Array.isArray(x)&&x.length<=20&&x.every(t=>typeof t==='string'&&t.length<=100);
 return Object.entries(a).every(([k,v])=>allowed.includes(k)&&(k==='exposure'?v&&typeof v==='object'&&!Array.isArray(v)&&Object.entries(v).every(([area,level])=>['Arms','Shoulders','Legs','Cleavage','Back','Midriff','Thighs'].includes(area)&&['Covered','Slightly visible','Moderate','Noticeable',''].includes(level)):['silhouette','neckline','comfort','colour','texture','detail','feeling'].includes(k)?list(v):typeof v==='string'&&v.length<=(k==='notes'?2000:250)));
}
export function evidenceSummary(items){
 const recent=items.filter(x=>x.kind==='recent'),inspiration=items.filter(x=>x.kind==='inspiration');
 const counts=(list,key)=>{const result={};for(const x of list){const val=x.annotations?.[key];for(const t of Array.isArray(val)?val:val?[val]:[])result[t]=(result[t]||0)+1}return result};
 return {recent:{count:recent.length,fit:counts(recent,'fit'),silhouette:counts(recent,'silhouette')},inspiration:{count:inspiration.length,groups:Object.fromEntries(['Beautiful + Me','Beautiful + Not Me','Interesting + Maybe Me','Not For Me'].map(group=>[group,inspiration.filter(x=>x.sort===group).length])),feeling:counts(inspiration,'feeling')}};
}
