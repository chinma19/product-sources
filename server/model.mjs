import workbook from '../content/workbook.json' with {type:'json'};
import part5Bindings from '../content/part5-bindings.json' with {type:'json'};
export {workbook};
const internalControls=['summary.pending.rules','summary.pending.filter'].map(id=>({id,type:'text',label:'Unconfirmed summary',internal:true}));
export const controls = new Map([...internalControls.map(c=>[c.id,c]),...(workbook.legacyControls||[]).map(c=>[c.id,c]),...workbook.pages.flatMap(p=>p.controls.map(c=>[c.id,c]))]);
export const emptyState = () => ({schemaVersion:3,assessmentId:null,status:'NOT_STARTED',createdAt:null,completedAt:null,answerUpdatedAt:{},answers:{},bindingState:{},completed:[],lastStep:1,revision:0,updatedAt:null});
export function migrateState(state){
 const next={...emptyState(),...state,answers:{...state.answers},answerUpdatedAt:{...state.answerUpdatedAt},bindingState:structuredClone(state.bindingState||{})};
 if((state.schemaVersion||1)<2){for(const [id,value]of Object.entries(next.answers)){if((/^dials\.\d+$/.test(id)||['balance.femininity','balance.polish','balance.edge'].includes(id))&&typeof value==='number'&&value>=1&&value<=7)next.answers[id]=Math.round((value-1)*100/6);}const decision=next.answers['p66.choices1'];if(!next.answers['compass.decision']&&Array.isArray(decision)&&decision.length===1)next.answers['compass.decision']=decision[0];}
 if((state.schemaVersion||1)<3)for(const [id,value]of Object.entries(next.answers)){if(next.bindingState[id])continue;next.bindingState[id]={mode:'legacy',...(controls.get(id)?.type==='table'?{cells:Object.fromEntries(Object.keys(value||{}).map(cell=>[cell,'legacy']))}:{})};}
 next.schemaVersion=3;return next;
}
export function formatValue(v) {
 if(v==null)return '';
 if(typeof v==='string'||typeof v==='number')return String(v);
 if(Array.isArray(v))return v.map(x=>x&&typeof x==='object'&&'quality'in x?[x.quality,x.meaning,x.clothing].filter(Boolean).join(' — '):formatValue(x)).filter(Boolean).join('\n');
 if(typeof v==='object'&&('name'in v||'hex'in v))return [v.name,v.hex].filter(Boolean).join(' ');
 return Object.entries(v).map(([k,val])=> {const s=formatValue(val);return s?`${k.replaceAll('::',' — ')}: ${s}`:''}).filter(Boolean).join('\n');
}
const hasText=v=>formatValue(v).trim().length>0;
const unique=values=>[...new Set(values.filter(Boolean))];
const tableCells=c=>c?.type==='table'?c.rows.flatMap(row=>c.columns.map(col=>row+'::'+col)):[];
const normalize=s=>String(s||'').trim().toLocaleLowerCase().replace(/\s+/g,' ');
const bindingFor=id=>part5Bindings.fields[id]||(controls.get(id)?.source&&controls.get(id).source!==id?{sources:[controls.get(id).source]}:null);
export function summarySources(kind){return kind==='rules'?[...part5Bindings.fields['rules.summary'].sources]:kind==='filter'?unique(Object.values(controls.get('shopping.filter')?.cellSources||{})):[];}
export function getSourceIds(id){
 const c=controls.get(id),table=part5Bindings.tables[id];
 if(table)return unique([...Object.values(table).flatMap(row=>[...row.sources,...row.clothingSources]),'translation','dictionary.entries']);
 if(c?.cellSources)return unique(Object.values(c.cellSources));
 if(id==='style.brief')return ['qualities.core','qualities.supporting','qualities.accent','direction.5','lifestyle.priority'];
 return [...(bindingFor(id)?.sources||[])];
}
function dictionaries(answers,bindingState,resolve){
 const entries=resolve('dictionary.entries');const table=resolve('translation')||{};
 const dict=Array.isArray(entries)?entries.map(x=>({quality:x.quality||'',meaning:x.meaning||'',clothing:x.clothing||''})):[];
 for(const n of ['01','02','03']){const quality=table[n+'::Style quality']||'',meaning=table[n+'::What it means to me']||'',clothing=table[n+'::How it may show up in clothing']||'';if(quality||meaning||clothing)dict.push({quality,meaning,clothing});}
 return dict;
}
function inheritedValue(id,answers,seen,bindingState){
 const c=controls.get(id),resolve=source=>resolveValue(source,answers,new Set(seen),bindingState),binding=bindingFor(id),table=part5Bindings.tables[id];
 if(table){const dict=dictionaries(answers,bindingState,resolve);return Object.fromEntries(Object.entries(table).flatMap(([row,spec])=>{
  const preference=spec.sources.map(resolve).find(hasText)||'';
  const exact=dict.filter(x=>spec.terms.includes(normalize(x.quality))).map(x=>x.clothing).filter(hasText);
  const clothing=unique([...exact,...spec.clothingSources.map(resolve).filter(hasText).map(formatValue)]).join('\n');
  return [[row+'::My preference',formatValue(preference)],[row+'::What this looks like for me',clothing]];
 }));}
 if(c?.cellSources)return Object.fromEntries(Object.entries(c.cellSources).map(([cell,source])=>[cell,formatValue(resolve(source))]));
 if(binding?.strategy==='meanings'||binding?.strategy==='clothing'){const key=binding.strategy==='meanings'?'meaning':'clothing';return unique(dictionaries(answers,bindingState,resolve).filter(x=>hasText(x[key])).map(x=>x.quality?x.quality+': '+x[key]:x[key])).join('\n');}
 if(binding?.strategy==='labelled')return binding.sources.map(source=>{const v=formatValue(resolve(source));if(!v)return '';return /^rules\.[1-6]$/.test(source)?v:`${controls.get(source)?.label||source} ${v}`}).filter(Boolean).join('\n');
 const inherited=binding?.sources.map(resolve).find(hasText)||'';
 if(id.startsWith('glance.')&&typeof inherited==='object'){
  if(id==='glance.language'){const tableValue=inherited;return controls.get('style.language').rows.map(row=>{const pref=formatValue(tableValue[row+'::My preference']),clothing=formatValue(tableValue[row+'::What this looks like for me']);return pref||clothing?`${row}: ${unique([pref,clothing]).join(' — ')}`:''}).filter(Boolean).join('; ');}
  if(id==='glance.outfits')return formatOutfitDirections(inherited).replaceAll('\n','; ');
  if(id==='glance.filter')return controls.get('shopping.filter').rows.map(row=>{const text=formatValue(inherited[row+'::What I want to check']);return text?`${row}: ${text}`:''}).filter(Boolean).join('; ');
  if(Array.isArray(inherited))return inherited.map(formatValue).filter(Boolean).join(' · ');
  return formatValue(inherited).replaceAll('\n','; ');
 }
 return c?.type==='text'&&typeof inherited==='object'?formatValue(inherited):inherited;
}
export function resolveSource(id,answers,bindingState={}){return inheritedValue(id,answers,new Set([id]),bindingState);}
function cellMode(id,cell,answers,bindingState){const meta=bindingState[id];if(meta?.cells?.[cell])return meta.cells[cell];if(meta?.mode==='linked')return 'linked';if(Object.hasOwn(answers[id]||{},cell))return meta?.mode==='legacy'?'legacy':'override';return 'linked';}
export function resolveValue(id,answers,seen=new Set(),bindingState={}){
 if(seen.has(id))return '';seen.add(id);const c=controls.get(id),meta=bindingState[id],inherited=()=>inheritedValue(id,answers,seen,bindingState);
 if(c?.type==='table'&&(c.cellSources||part5Bindings.tables[id])){const defaults=inherited(),stored=answers[id]||{};return Object.fromEntries(tableCells(c).map(cell=>[cell,cellMode(id,cell,answers,bindingState)==='linked'?(defaults[cell]||''):(stored[cell]??defaults[cell]??'')]));}
 if(meta?.mode!=='linked'&&Object.hasOwn(answers,id))return answers[id];
 return inherited();
}
export function formatOutfitDirections(value){if(!value||typeof value!=='object')return formatValue(value);return [1,2,3].map(n=>{const parts=['BASE','SHAPE','BALANCE','FINISH','Why this feels like me'].map(k=>value[n+'::'+k]?`${k==='Why this feels like me'?k:k[0]+k.slice(1).toLowerCase()}: ${value[n+'::'+k]}`:'').filter(Boolean);return parts.length?`Outfit ${n} — ${parts.join(' · ')}`:''}).filter(Boolean).join('\n');}
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export function sourceSnapshot(sourceIds,answers,bindingState={}){return Object.fromEntries(sourceIds.map(id=>[id,structuredClone(resolveValue(id,answers,new Set(),bindingState))]));}
export function confirmedChanges(id,answers,bindingState={},seen=new Set()){
 if(seen.has(id))return {tracked:false,changed:false,changedSourceIds:[],confirmedAt:null};seen.add(id);const meta=bindingState[id];
 if(meta?.sourceSnapshot){const changedSourceIds=Object.keys(meta.sourceSnapshot).filter(source=>!same(meta.sourceSnapshot[source],resolveValue(source,answers,new Set(),bindingState)));return {tracked:true,changed:changedSourceIds.length>0,changedSourceIds,confirmedAt:meta.confirmedAt||null};}
 if((meta?.mode||(!Object.hasOwn(answers,id)?'linked':'override'))==='linked'){for(const source of getSourceIds(id)){const result=confirmedChanges(source,answers,bindingState,new Set(seen));if(result.tracked)return result;}}
 return {tracked:false,changed:false,changedSourceIds:[],confirmedAt:null};
}
export function bindingInfo(id,answers,bindingState={}){
 const c=controls.get(id),meta=bindingState[id],mode=meta?.mode||(Object.hasOwn(answers,id)?'override':'linked');
 const cells=c?.type==='table'?Object.fromEntries(tableCells(c).map(cell=>[cell,cellMode(id,cell,answers,bindingState)])):undefined;
 const confirmation=confirmedChanges(id,answers,bindingState);
 return {mode,legacy:mode==='legacy'||Object.values(cells||{}).includes('legacy'),...(cells?{cells}:{}),sourceIds:getSourceIds(id),sourceChanged:confirmation.changed,confirmation};
}
export function summaryDraft(kind,answers,bindingState={}){const id=kind==='rules'?'rules.summary':'shopping.filter',sourceIds=summarySources(kind);return {text:formatValue(resolveSource(id,answers,bindingState)),sourceIds,sourceSnapshot:sourceSnapshot(sourceIds,answers,bindingState)};}
export function blueprintFor(answers,bindingState={}){
 return Object.fromEntries(workbook.pages.filter(p=>p.page>=59).map(p=>[p.title,Object.fromEntries(p.controls.filter(c=>!c.id.endsWith('.reflection')).map(c=>[c.label,resolveValue(c.id,answers,new Set(),bindingState)]))]));
}
export function timeTotal(value){return Object.values(value||{}).reduce((n,v)=>n+(v===''?0:Number(v)||0),0)}
export function compassResult(value){
 const vals=Object.values(value||{});if(vals.length!==5||vals.some(v=>v===''||v==null))return {total:null,band:'Choose a score for each criterion.'};
 const total=vals.reduce((a,b)=>a+Number(b),0);
 return {total,band:total>=21?'STRONG YES':total>=17?'LIKELY YES':total>=13?'PAUSE & THINK':total>=5?'PROBABLY NOT WORTH BUYING':'DEFINITELY NOT FOR THIS WARDROBE'};
}
export function validateValue(c,v,{allowLegacySelections=false}={}){
 const str=x=>typeof x==='string'&&x.length<=8000;
 if(['evidence','image-sort','assembly'].includes(c.type))return false;
 if(c.type==='single')return v===''||c.options.includes(v);
 if(c.type==='dictionary')return Array.isArray(v)&&v.length<=20&&v.every(x=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).every(k=>['quality','meaning','clothing'].includes(k))&&['quality','meaning','clothing'].every(k=>str(x[k]||'')));
 if(c.type==='candidates')return Array.isArray(v)&&v.length<=100&&v.every(x=>x&&typeof x.term==='string'&&x.term.length<=100&&['accepted','rejected'].includes(x.decision)&&Object.keys(x).every(k=>['term','decision'].includes(k)));
 if(c.type==='text')return str(v);
 if(c.type==='checks')return Array.isArray(v)&&v.length<=c.options.length&&v.every(x=>c.options.includes(x))&&(allowLegacySelections||(new Set(v).size===v.length&&(c.selectionMode!=='single'||v.length<=1)));
 if(c.type==='scale')return v===''||(Number.isInteger(v)&&v>=c.min&&v<=c.max);
 if(c.type==='list')return Array.isArray(v)&&v.length===c.count&&v.every(str);
 if(!v||typeof v!=='object'||Array.isArray(v))return false;
 if(c.type==='matrix')return Object.entries(v).every(([k,x])=>c.rows.includes(k)&&(x===''||c.options.includes(x)));
 if(c.type==='time'||c.type==='compass')return Object.entries(v).every(([k,x])=>c.rows.includes(k)&&(x===''||(typeof x==='number'&&Number.isFinite(x)&&Number.isInteger(x)&&x>=0&&x<=(c.type==='time'?100:5))));
 if(c.type==='colours')return Object.keys(v).every(k=>c.rows.includes(k))&&Object.values(v).every(x=>x&&Object.keys(x).every(k=>['name','hex'].includes(k))&&str(x.name||'')&&(!x.hex||/^#[0-9a-f]{6}$/i.test(x.hex)));
 if(c.type==='table')return Object.entries(v).every(([k,x])=>{const [r,col]=k.split('::');return c.rows.includes(r)&&c.columns.includes(col)&&str(x)});
 if(c.type==='patterns'||c.type==='outfits')return Object.entries(v).every(([k,x])=>{const [n,field]=k.split('::');return Number(n)>=1&&Number(n)<=c.count&&(c.type==='patterns'?['Pattern','Evidence','Meaning']:['BASE','SHAPE','BALANCE','FINISH','Why this feels like me']).includes(field)&&str(x)});
 return false;
}
// Restoration is explicit: keep older valid arrays intact until the customer chooses a replacement.
// This marker belongs to a patch, never the saved answer schema or the resolved customer response.
const legacySelectionConflict=(c,value)=>c?.type==='checks'&&validateValue(c,value,{allowLegacySelections:true})&&!validateValue(c,value);
export function selectionRestorePatch(patch){
 const next={...patch},ids=Object.entries(patch.answers||{}).filter(([id,value])=>legacySelectionConflict(controls.get(id),value)).map(([id])=>id);
 if(ids.length)next.restoreSelectionConflicts=ids;else delete next.restoreSelectionConflicts;
 return next;
}
function boundedJSON(value,depth=0){
 if(depth>7)return false;if(value===null||typeof value==='boolean')return true;if(typeof value==='number')return Number.isFinite(value);if(typeof value==='string')return value.length<=8000;
 if(Array.isArray(value))return value.length<=200&&value.every(v=>boundedJSON(v,depth+1));
 if(value&&typeof value==='object')return Object.keys(value).length<=200&&Object.entries(value).every(([k,v])=>!['__proto__','constructor','prototype','owner_id','ownerId','user_id','userId','token'].includes(k)&&k.length<=500&&boundedJSON(v,depth+1));
 return false;
}
function validSnapshot(snapshot,id,sourceIds=null){
 if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot)||Object.keys(snapshot).length>100||JSON.stringify(snapshot).length>300000)return false;
 if(sourceIds&&(Object.keys(snapshot).length!==sourceIds.length||!sourceIds.every(source=>Object.hasOwn(snapshot,source))))return false;
 return Object.entries(snapshot).every(([source,value])=>controls.has(source)&&source!==id&&boundedJSON(value));
}
const validConfirmedAt=v=>typeof v==='string'&&v.length<=40&&Number.isFinite(Date.parse(v));
export function validateBindingState(bindings,answers){
 if(!bindings||typeof bindings!=='object'||Array.isArray(bindings)||Object.keys(bindings).length>controls.size)return false;
 const modes=['linked','override','legacy'];
 return Object.entries(bindings).every(([id,meta])=>{
  if(!controls.has(id)||(!Object.hasOwn(answers,id)&&meta?.mode!=='linked')||!meta||typeof meta!=='object'||Array.isArray(meta)||!modes.includes(meta.mode)||!Object.keys(meta).every(k=>['mode','cells','sourceSnapshot','confirmedAt'].includes(k)))return false;
  if(meta.cells){const cells=tableCells(controls.get(id));if(!cells.length||typeof meta.cells!=='object'||Array.isArray(meta.cells)||!Object.entries(meta.cells).every(([cell,mode])=>cells.includes(cell)&&modes.includes(mode)))return false;}
  if(meta.sourceSnapshot&&!validSnapshot(meta.sourceSnapshot,id))return false;
  if(meta.confirmedAt!==undefined&&!validConfirmedAt(meta.confirmedAt))return false;
  return true;
 });
}
export function validatePatch(body){
 if(!body||!Number.isInteger(body.baseRevision)||body.baseRevision<0)throw new Error('A valid saved revision is required.');
 const restored=body.restoreSelectionConflicts===undefined?[]:body.restoreSelectionConflicts;
 if(body.restoreSelectionConflicts!==undefined&&(!Array.isArray(restored)||restored.length>controls.size||new Set(restored).size!==restored.length||!restored.every(id=>typeof id==='string'&&Object.hasOwn(body.answers||{},id)&&legacySelectionConflict(controls.get(id),body.answers[id]))))throw new Error('Invalid restored selection conflicts.');
 if(body.answers){if(typeof body.answers!=='object'||Array.isArray(body.answers))throw new Error('Answers must be an object.');for(const [k,v]of Object.entries(body.answers)){if(!controls.has(k)||!validateValue(controls.get(k),v,{allowLegacySelections:restored.includes(k)}))throw new Error('Invalid response for '+k);}}
 if(body.linkFields!==undefined&&(!Array.isArray(body.linkFields)||body.linkFields.length>200||!body.linkFields.every(id=>controls.has(id)&&getSourceIds(id).length&&id!=='style.brief')))throw new Error('Choose a valid earlier-answer link.');
 if(body.resetCells!==undefined){if(!body.resetCells||typeof body.resetCells!=='object'||Array.isArray(body.resetCells))throw new Error('Invalid cell links.');for(const [id,cells]of Object.entries(body.resetCells)){const valid=tableCells(controls.get(id));if(!valid.length||!getSourceIds(id).length||!Array.isArray(cells)||cells.length>valid.length||!cells.every(cell=>valid.includes(cell)))throw new Error('Invalid linked cell for '+id);}}
 if(body.confirmFields!==undefined&&(!Array.isArray(body.confirmFields)||body.confirmFields.length>30||!body.confirmFields.every(x=>x&&controls.has(x.id)&&Array.isArray(x.sourceIds)&&x.sourceIds.length<=100&&new Set(x.sourceIds).size===x.sourceIds.length&&x.sourceIds.every(id=>controls.has(id)&&id!==x.id)&&Object.keys(x).every(k=>['id','sourceIds','sourceSnapshot','confirmedAt'].includes(k))&&(x.sourceSnapshot===undefined||validSnapshot(x.sourceSnapshot,x.id,x.sourceIds))&&(x.confirmedAt===undefined||validConfirmedAt(x.confirmedAt)))))throw new Error('Invalid confirmation sources.');
 if(body.restoreBindings!==undefined&&!validateBindingState(body.restoreBindings,body.answers||{}))throw new Error('Invalid saved binding metadata.');
 if(body.reviewFields!==undefined&&(!Array.isArray(body.reviewFields)||body.reviewFields.length>200||!body.reviewFields.every(id=>controls.has(id))))throw new Error('Invalid reviewed fields.');
 if(body.bindingState!==undefined)throw new Error('Binding metadata must be created from explicit edit, link or confirmation actions.');
 if(body.completed&&!Array.isArray(body.completed))throw new Error('Invalid completion record.');
 if(body.completed&&(!body.completed.every(v=>Number.isInteger(v)&&v>=1&&v<=68)||body.completed.length>68))throw new Error('Invalid completion record.');
 if(body.lastStep!==undefined&&(!Number.isInteger(body.lastStep)||body.lastStep<1||body.lastStep>68))throw new Error('Invalid step.');
}
export function applyPatch(current,body){
 validatePatch(body);const next={...current,schemaVersion:3,answers:{...current.answers},bindingState:structuredClone(current.bindingState||{}),completed:body.completed?[...new Set(body.completed)]:current.completed,lastStep:body.lastStep??current.lastStep};
 for(const [id,value]of Object.entries(body.answers||{})){
  const c=controls.get(id),old=next.bindingState[id];
  if(c?.type==='table'){
   const existing=next.answers[id]||{},cells=Object.fromEntries(tableCells(c).map(cell=>[cell,cellMode(id,cell,next.answers,next.bindingState)]));
   for(const cell of Object.keys(value))cells[cell]='override';next.answers[id]={...existing,...value};next.bindingState[id]={mode:'override',cells};
  }else{next.answers[id]=structuredClone(value);next.bindingState[id]={...(old?.sourceSnapshot?{sourceSnapshot:old.sourceSnapshot,confirmedAt:old.confirmedAt}:{}),mode:'override'};}
 }
 if(body.restoreBindings)Object.assign(next.bindingState,structuredClone(body.restoreBindings));
 for(const id of body.reviewFields||[]){if(!Object.hasOwn(next.answers,id))continue;const c=controls.get(id);next.bindingState[id]={...(next.bindingState[id]||{}),mode:'override',...(c?.type==='table'?{cells:Object.fromEntries(tableCells(c).map(cell=>{const mode=cellMode(id,cell,next.answers,next.bindingState);return [cell,mode==='legacy'?'override':mode]}))}:{})};}
 for(const id of body.linkFields||[]){next.bindingState[id]={mode:'linked',...(controls.get(id)?.type==='table'?{cells:Object.fromEntries(tableCells(controls.get(id)).map(cell=>[cell,'linked']))}:{})};}
 for(const [id,cellsToReset]of Object.entries(body.resetCells||{})){const meta=next.bindingState[id],cells=Object.fromEntries(tableCells(controls.get(id)).map(cell=>[cell,cellMode(id,cell,next.answers,next.bindingState)]));for(const cell of cellsToReset)cells[cell]='linked';next.bindingState[id]={...meta,mode:'override',cells};}
 for(const confirmation of body.confirmFields||[]){const id=confirmation.id;next.bindingState[id]={...(next.bindingState[id]||{mode:Object.hasOwn(next.answers,id)?'override':'linked'}),sourceSnapshot:confirmation.sourceSnapshot?structuredClone(confirmation.sourceSnapshot):sourceSnapshot(confirmation.sourceIds,next.answers,next.bindingState),confirmedAt:confirmation.confirmedAt||new Date().toISOString()};}
 if(body.completed?.includes(37)&&timeTotal(next.answers['life.time'])!==100)throw new Error('Your Real-Life Time Map must total 100 before completing this step.');
 return next;
}
