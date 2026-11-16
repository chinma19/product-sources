import workbook from '../content/workbook.json' with {type:'json'};
export {workbook};
export const controls = new Map([...(workbook.legacyControls||[]).map(c=>[c.id,c]),...workbook.pages.flatMap(p=>p.controls.map(c=>[c.id,c]))]);
export const emptyState = () => ({schemaVersion:2,assessmentId:null,status:'NOT_STARTED',createdAt:null,completedAt:null,answerUpdatedAt:{},answers:{},completed:[],lastStep:1,revision:0,updatedAt:null});
export function migrateState(state){const next={...emptyState(),...state,answers:{...state.answers},answerUpdatedAt:{...state.answerUpdatedAt}};if((state.schemaVersion||1)<2){for(const [id,value]of Object.entries(next.answers)){if((/^dials\.\d+$/.test(id)||['balance.femininity','balance.polish','balance.edge'].includes(id))&&typeof value==='number'&&value>=1&&value<=7)next.answers[id]=Math.round((value-1)*100/6);}const decision=next.answers['p66.choices1'];if(!next.answers['compass.decision']&&Array.isArray(decision)&&decision.length===1)next.answers['compass.decision']=decision[0];}next.schemaVersion=2;return next;}
export function formatValue(v) {
 if(v==null)return '';
 if(typeof v==='string'||typeof v==='number')return String(v);
 if(Array.isArray(v))return v.map(x=>x&&typeof x==='object'&&'quality'in x?[x.quality,x.meaning,x.clothing].filter(Boolean).join(' — '):formatValue(x)).filter(Boolean).join('\n');
 if(typeof v==='object'&&('name'in v||'hex'in v))return [v.name,v.hex].filter(Boolean).join(' ');
 return Object.entries(v).map(([k,val])=> {const s=formatValue(val);return s?`${k.replaceAll('::',' — ')}: ${s}`:''}).filter(Boolean).join('\n');
}
export function resolveValue(id,answers,seen=new Set()){
 if(seen.has(id))return '';seen.add(id);
 const c=controls.get(id);
 if(c?.cellSources){const defaults=Object.fromEntries(Object.entries(c.cellSources).map(([cell,source])=>[cell,formatValue(resolveValue(source,answers,new Set(seen)))]));return {...defaults,...(answers[id]||{})};}
 if(Object.hasOwn(answers,id))return answers[id];
 const inherited=c?.source?resolveValue(c.source,answers,seen):'';
 if(id.startsWith('glance.')&&typeof inherited==='object'){if(id==='glance.language')return Object.entries(inherited).filter(([k,v])=>k.endsWith('::My preference')&&v).map(([k,v])=>k.split('::')[0]+': '+formatValue(v)).join('; ');if(Array.isArray(inherited))return inherited.map(formatValue).filter(Boolean).join(' · ');return formatValue(inherited).replaceAll('\n','; ');}
 return inherited;
}
export function blueprintFor(answers){
 return Object.fromEntries(workbook.pages.filter(p=>p.page>=59).map(p=>[p.title,Object.fromEntries(p.controls.filter(c=>!c.id.endsWith('.reflection')).map(c=>[c.label,resolveValue(c.id,answers)]))]));
}
export function timeTotal(value){return Object.values(value||{}).reduce((n,v)=>n+(v===''?0:Number(v)||0),0)}
export function compassResult(value){
 const vals=Object.values(value||{});if(vals.length!==5||vals.some(v=>v===''||v==null))return {total:null,band:'Choose a score for each criterion.'};
 const total=vals.reduce((a,b)=>a+Number(b),0);
 return {total,band:total>=21?'STRONG YES':total>=17?'LIKELY YES':total>=13?'PAUSE & THINK':total>=5?'PROBABLY NOT WORTH BUYING':'DEFINITELY NOT FOR THIS WARDROBE'};
}
export function validateValue(c,v){
 const str=x=>typeof x==='string'&&x.length<=8000;
 if(['evidence','image-sort','assembly'].includes(c.type))return false;
 if(c.type==='single')return v===''||c.options.includes(v);
 if(c.type==='dictionary')return Array.isArray(v)&&v.length<=20&&v.every(x=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).every(k=>['quality','meaning','clothing'].includes(k))&&['quality','meaning','clothing'].every(k=>str(x[k]||'')));
 if(c.type==='candidates')return Array.isArray(v)&&v.length<=100&&v.every(x=>x&&typeof x.term==='string'&&x.term.length<=100&&['accepted','rejected'].includes(x.decision)&&Object.keys(x).every(k=>['term','decision'].includes(k)));
 if(c.type==='text')return str(v);
 if(c.type==='checks')return Array.isArray(v)&&v.length<=c.options.length&&v.every(x=>c.options.includes(x));
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
export function validatePatch(body){
 if(!body||!Number.isInteger(body.baseRevision)||body.baseRevision<0)throw new Error('A valid saved revision is required.');
 if(body.answers){if(typeof body.answers!=='object'||Array.isArray(body.answers))throw new Error('Answers must be an object.');for(const [k,v]of Object.entries(body.answers)){if(!controls.has(k)||!validateValue(controls.get(k),v))throw new Error('Invalid response for '+k);}}
 if(body.completed&&!Array.isArray(body.completed))throw new Error('Invalid completion record.');
 if(body.completed&&(!body.completed.every(v=>Number.isInteger(v)&&v>=1&&v<=68)||body.completed.length>68))throw new Error('Invalid completion record.');
 if(body.lastStep!==undefined&&(!Number.isInteger(body.lastStep)||body.lastStep<1||body.lastStep>68))throw new Error('Invalid step.');
}
export function applyPatch(current,body){
 validatePatch(body);const next={...current,answers:{...current.answers,...body.answers},completed:body.completed?[...new Set(body.completed)]:current.completed,lastStep:body.lastStep??current.lastStep};
 if(body.completed?.includes(37)&&timeTotal(next.answers['life.time'])!==100)throw new Error('Your Real-Life Time Map must total 100 before completing this step.');
 return next;
}
