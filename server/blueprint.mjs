import {resolveValue,formatValue,workbook} from './model.mjs';
export function blueprintSections(answers,{glance=false}={}){
 const val=id=>resolveValue(id,answers),txt=id=>formatValue(val(id));
 const section=(id,title,fields)=>({id,title,entries:fields.map(([label,key])=>({label,value:txt(key),key,...(key==='colours'?{colours:val('colours')}:{} )})).filter(e=>e.value.trim())});
 if(glance)return [section('glance','My One-Glance Blueprint',workbook.pages[67].controls.filter(c=>!c.optional).map(c=>[c.label,c.id]))].filter(s=>s.entries.length);
 const sections=[
 section('identity','My Style in One Sentence',[['My style identity','identity'],['How I want to feel','identity.notes.1'],['What I want to communicate','identity.notes.2'],['When I feel like myself','identity.notes.3']]),
 section('qualities','My Core Qualities',[['Core qualities','qualities.final'],['Supporting qualities','qualities.supporting'],['Accent qualities','qualities.accent'],['What these qualities mean to me','identity.notes.4'],['How I recognise them in clothing','identity.notes.5']]),
 section('language','My Style Language',[['My preferences and clothing translation','style.language'],['My personal dictionary','dictionary.entries'],...Array.from({length:7},(_,i)=>[workbook.pages[50].controls.find(c=>c.id==='dictionary.'+(i+1))?.label||'My own definition','dictionary.'+(i+1)]),['When I want to look like me','language.notes.1'],['What I want my outfits to communicate','language.notes.2'],['The visual qualities I want to repeat','language.notes.3']]),
 section('colours','My Six-Colour Formula',[['My colour roles','colours'],['Why my formula works for me','colour.reason'],['My colour direction','colour.final'],['How I want colour to behave','colour.behaviour'],['The easiest way I add colour','colour.easy'],["Colours I love but don’t necessarily need",'colour.direction.2']]),
 section('signatures','My Style Signatures',[['My top three signatures','signatures.top'],['My non-negotiable signature','signatures.one'],['Automatic','signatures.auto'],['Deliberate','signatures.intent']]),
 section('outfits','My Personal Outfit Directions',[['My three flexible outfit directions','outfits']]),
 section('rules','My Personal Style Rules',[['My own summary','rules.summary'],...['I prefer…','I feel most comfortable when…',"I don’t enjoy clothes that…",'I like outfits to…',"I don’t want my style to become…",'When choosing between two things I like…'].map((l,i)=>[l,'rules.'+(i+1)]),['More of this','rules.more'],['Less of this','rules.less'],['I always consider','rules.consider']]),
 section('permission',"What I Don’t Need to Become",[...Array.from({length:6},(_,i)=>[workbook.pages[64].controls.find(c=>c.id==='permission.'+(i+1))?.label||'My style permission','permission.'+(i+1)])]),
 section('lifestyle','My Lifestyle Priorities',[['The situations I dress for most','lifestyle.contexts'],['My life requires clothes that','lifestyle.help'],['The practical qualities I value most','lifestyle.practical'],['What my life asks of my style','lifestyle.priority'],['My environmental needs','master.environment']]),
 section('filter','My Shopping Filter',[['My personal decision criteria','shopping.filter'],['Before buying, I want to remember','compass.reminder']]),
 section('compass','My Personal Style Compass',[['The item I am considering','compass.item'],['My scores out of five for each criterion','compass.scores'],['What influenced my decision','compass.notes'],['My decision','compass.decision']]),
 section('statement','My Personal Style Statement',[['My final statement','style.statement'],...['I dress for…','I feel most like myself in…','My style is a combination of…',"I don’t need my clothes to…",'I want my wardrobe to help me…'].map((l,i)=>[l,'closing.'+(i+1)])])
 ];
 return sections.filter(s=>s.entries.length);
}
export function profileObjects(answers){const pick=ids=>Object.fromEntries(ids.map(id=>[id,resolveValue(id,answers)]));return {body:pick(['body.fit','body.silhouette','body.proportion','body.length','body.neckline','body.exposure','body.comfort','body.synthesis.3']),personality:pick(['personality.1','personality.2','personality.3','personality.4','personality.5','personality.6','personality.7','personality.sentence']),lifestyle:pick(['lifestyle.time','lifestyle.contexts','lifestyle.help','lifestyle.practical','lifestyle.mismatch','lifestyle.priority'])};}
