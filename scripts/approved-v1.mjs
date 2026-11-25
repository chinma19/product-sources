// Apply exactly the owner-approved R1–R10 amendments; never overwrite source DOCX data.
import {readFile,writeFile} from 'node:fs/promises';
const path='content/workbook.json',w=JSON.parse(await readFile(path,'utf8'));
const page=n=>w.pages[n-1];
const add=(n,c)=>{if(!page(n).controls.some(x=>x.id===c.id))page(n).controls.push(c)};
const opt=(id,label,resolution,type='text',extra={})=>({id,label,type,optional:true,resolution,...extra});
w.version='draft3-approved-v1.1';
w.decisions={status:'approved',ids:Array.from({length:10},(_,i)=>'R'+(i+1)),scope:'Owner approval in originating conversation; preserve approved Draft 3 copy except the R2 option amendment.'};
w.sessions=[{name:'Your Body',start:6,end:20,time:'30–45 minutes'},{name:'Personality: inspiration & visual preferences',start:21,end:27,time:'30–45 minutes'},{name:'Personality: colour & signatures',start:28,end:34,time:'About 30 minutes'},{name:'Your Lifestyle',start:35,end:44,time:'20–30 minutes'},{name:'Connect the Dots',start:45,end:57,time:'20–30 minutes'},{name:'Build your Blueprint',start:58,end:68,time:'20–30 minutes'}];
// Remove implementation-added journaling from the flow; retain old answers in legacy storage/export.
w.legacyControls=w.legacyControls||[];
for(const p of w.pages){w.legacyControls.push(...p.controls.filter(c=>c.id.endsWith('.reflection')).map(c=>({...c,legacy:true})));p.controls=p.controls.filter(c=>!c.id.endsWith('.reflection'));for(const c of p.controls){if(c.type==='scale'){c.min=0;c.max=100;c.positions=[0,17,33,50,67,83,100];c.storageVersion=2;}}}
['What currently frustrates me about getting dressed?','What feels unclear about my style?','What do I hope becomes easier?','What do I currently think my style is?'].forEach((label,i)=>add(6,opt('baseline.'+(i+1),label,'R1')));
const dresses=page(14).controls.find(c=>c.type==='checks'&&c.label==='DRESSES / SKIRTS');dresses.options=['Mini','Knee','Midi','Maxi'];
const pi=page(14).lines.indexOf('DRESSES / SKIRTS');if(page(14).lines[pi+1]==='☐ Maxi')page(14).lines.splice(pi+1,1,'☐ Mini','☐ Knee','☐ Midi','☐ Maxi');
add(25,opt('visual.strongestThree','My three strongest visual-dial characteristics','R4','list',{count:3}));
add(30,opt('colour.behaviour','How I want colour to behave','R4'));
add(30,opt('colour.easy','The easiest way I add colour','R4'));
add(32,opt('signatures.counterfactual','If I removed this detail, would the outfit feel less like me?','R4'));
for(const p of w.pages)for(const c of p.controls)if(c.id.startsWith('dictionary.')&&c.id!=='dictionary.entries'){c.optional=true;c.resolution='R5';}
add(51,{id:'dictionary.entries',type:'dictionary',label:'My own Style Language Dictionary',resolution:'R5'});
add(46,{id:'synthesis.decisions',type:'candidates',label:'Possible repeated patterns — your decision',resolution:'R6'});
add(54,{id:'brief.assembly',type:'assembly',label:'Assemble a draft from my own words',resolution:'R6'});
add(61,{...page(30).controls.find(c=>c.id==='colour.behaviour'),source:'colour.behaviour',referenceOnly:true});
add(61,{...page(30).controls.find(c=>c.id==='colour.easy'),source:'colour.easy',referenceOnly:true});
add(67,{id:'shopping.filter',type:'table',label:'My personal shopping filter',rows:['Lifestyle','Personality','Colour','Physical','Styling potential'],columns:['What I want to check'],cellSources:{'Lifestyle::What I want to check':'lifestyle.priority','Personality::What I want to check':'personality.3','Colour::What I want to check':'colour.final','Physical::What I want to check':'body.synthesis.3','Styling potential::What I want to check':'rules.consider'}});
add(68,{id:'glance.rules',type:'text',label:'PERSONAL STYLE RULES:',source:'rules.summary',resolution:'R9'});
add(68,{id:'glance.filter',type:'text',label:'SHOPPING FILTER:',source:'shopping.filter',resolution:'R9'});
const closing=['I dress for…','I feel most like myself in…','My style is a combination of…',"I don’t need my clothes to…",'I want my wardrobe to help me…'];
closing.forEach((label,i)=>add(67,opt('closing.'+(i+1),label,'R10')));
add(66,{id:'compass.item',type:'text',label:'The item I am considering:'});
add(66,{id:'compass.decision',type:'single',label:'My decision',options:['Buy anyway — I love it enough.','Save for later.','Pass.']});
const legacyDecision=page(66).controls.filter(c=>c.type==='checks');w.legacyControls.push(...legacyDecision.map(c=>({...c,legacy:true})));page(66).controls=page(66).controls.filter(c=>c.type!=='checks');
w.legacyControls=[...new Map(w.legacyControls.map(c=>[c.id,c])).values()];
if(!w.legacyControls.some(c=>c.id==='brief.pending'))w.legacyControls.push({id:'brief.pending',type:'text',label:'Unconfirmed draft',legacy:true,internal:true});
w.optionalPolicy='v1-only additions are optional. No extra wardrobe audit, AI identity, or compulsory new journaling.';
// Owner-approved selection cardinality: preserve IDs, wording, options and array storage.
// The six contextual review groups intentionally remain multi-select.
const singleSelectionIds=new Set(['p26.choices1','p38.choices1','p45.choices1','p49.choices1','p52.choices1','p52.choices2']);
let singleSelectionCount=0;
for(const p of w.pages)for(const c of p.controls)if(singleSelectionIds.has(c.id)){
 if(c.type!=='checks')throw Error('Approved selection metadata no longer matches '+c.id);
 c.selectionMode='single';singleSelectionCount++;
}
if(singleSelectionCount!==singleSelectionIds.size)throw Error('Approved single-selection controls are missing or duplicated.');
await writeFile(path,JSON.stringify(w,null,2)+'\n');
console.log('Applied approved R1–R10 amendments; original source extraction retained.');
