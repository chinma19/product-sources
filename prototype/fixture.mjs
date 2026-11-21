import {emptyState,applyPatch} from '../server/model.mjs';
export const PREVIEW_STORAGE='inherfashion.editorial-preview.v1';
export function exampleWorkspace(){
 const answers={
  'fit.ratings':{Relaxed:'Love it','Body-skimming':'Like it',Oversized:'Neutral'},'fit.pattern':'Room to move, with a little definition.',
  'fit.observe.1':'Feel easy to move in without losing their shape.','p9.choices1':['Relaxed with some room'],'p9.choices2':['Feel restrictive'],
  'silhouette.ratings':{Straight:'Yes — I love this',Relaxed:'Yes — I love this','Fitted + relaxed':'Maybe — I like something about it'},
  'p12.choices1':['Relaxed','Straight'],'p12.choices2':['A combination of fitted and relaxed'],
  'silhouette.notes.1':'I like volume, but I want to feel comfortable moving in it.','silhouette.notes.2':'Too much stiffness or fabric that needs adjusting.',
  'silhouette.notes.3':'Relaxed lines with a little structure.','silhouette.notes.4':'An easy shirt with straight trousers.','silhouette.notes.5':'Anything that makes me feel restricted.',
  'proportion.notes.1':'A shorter top with a longer lower half.','length.notes.1':'Ankle-length trousers and longer skirts.','neckline.notes.1':'An open neckline that feels comfortable.',
  'comfort.notes.1':'Let me walk, sit and move easily.','body.synthesis.3':'I have room to move and a sense of shape.',
  'qualities.core':['Ease','Intention','Softness'],'qualities.supporting':['Polish','',''],'qualities.accent':['Contrast','',''],
  'direction.1':'Comfortable and considered.','direction.5':'work, walking and slower weekends',
  'style.brief':'I want to dress in a way that feels easy and intentional, combining softness with a little polish, while keeping my clothes practical for work, walking and slower weekends.',
  'personality.3':'Quiet detail, soft texture and clean lines.','visual.qualities':['Soft texture','Clean lines','Quiet detail','',''],
  'synthesis.language.1':'An easy line with some definition.','synthesis.language.2':'Room to move.','synthesis.language.3':'A shorter top with a longer lower half.','synthesis.language.4':'One considered finishing detail.','synthesis.language.5':'Linen, soft knits and crisp cotton.','synthesis.language.6':'Small gold jewellery and a practical bag.',
  'dictionary.entries':[{quality:'Ease',meaning:'I can move and feel comfortable.',clothing:'Soft fabrics and relaxed shapes.'},{quality:'Intention',meaning:'A few choices that feel considered.',clothing:'Clean lines and a finishing detail.'}],
  colours:{Anchor:{name:'Espresso',hex:'#4a3b32'},Support:{name:'Olive',hex:'#747554'},'Soft Neutral':{name:'Ivory',hex:'#f5eddf'},'Strong Neutral':{name:'Charcoal',hex:'#393b3b'},Wildcard:{name:'Clay',hex:'#b4684b'},'Signature Accent':{name:'Gold',hex:'#bf9d5b'}},
  'colour.reason':'Warm, grounded colours with space for a little contrast.','colour.direction.1':'Warm and grounded.',
  'signatures.top':['Small gold hoops','A turned-back sleeve','Polished flats'],'signatures.automatic':['Small gold hoops.','','','',''],'signatures.deliberate':['A considered finishing detail.','','','',''],
  'signatures.one':'Small gold hoops.',
  'life.top':['Work','Home','Walking and errands'],'life.help':['Move comfortably','Keep everyday care simple','Support work and walking'],'practical.notes.3':'Comfort, breathable fabrics and easy care.','life.mismatch.3':'Clothes for my everyday life before occasional events.','environment.1':'Warm weather and air-conditioned rooms.',
  'life.time':{'Home / everyday life':40,'Work / business':30,'Errands / practical activities':15,'Social life':10,'Exercise':5},
  outfits:{'1::BASE':'An easy shirt and straight trousers','1::SHAPE':'Relaxed with definition','1::BALANCE':'Soft with crisp','1::FINISH':'Gold hoops and flats','2::BASE':'A knit and longer skirt','2::SHAPE':'An easy, long line','2::BALANCE':'Texture with simplicity','2::FINISH':'A small bag and watch','3::BASE':'A cotton top and jeans','3::SHAPE':'Straight and comfortable','3::BALANCE':'Casual with polish','3::FINISH':'A turned-back sleeve'},
  'rules.1':'Ease over restriction.','rules.2':'I can move comfortably.','rules.3':'Clothes that need constant adjusting.','rules.4':'Considered, with room to breathe.','rules.consider':'My real routines, comfort and different ways to wear it.',
  'permission.6':'Follow my own preferences, without forcing an aesthetic.',
  'glance.outfits':'Easy shirt + straight trousers + hoops; knit + longer skirt + watch; cotton top + jeans + polished flats.'
 };
 let state=applyPatch(emptyState(),{baseRevision:0,answers,completed:[1,2,3,4,5,6,7,8,9,10,11,21,22,23,24,28,29,30,31,32,35,36,37,38,39,40,41,42,43,45,46,49,50,51,54,56,57],lastStep:12});
 state=applyPatch(state,{baseRevision:0,confirmFields:[{id:'style.brief',sourceIds:['qualities.core','qualities.supporting','qualities.accent','direction.5','lifestyle.priority']}]});
 return {format:'ihf-editorial-preview/1',state,phase:'choose',evidence:[
  {id:'example-01',kind:'recent',title:'A little structure',asset:'look-01',annotations:{silhouette:['Defined'],notes:'I notice the belt creates definition.'},revision:0},
  {id:'example-02',kind:'recent',title:'An easy line',asset:'look-02',annotations:{silhouette:['Relaxed'],notes:'I like room to move.'},revision:0},
  {id:'example-03',kind:'recent',title:'A considered contrast',asset:'look-03',annotations:{silhouette:['Straight'],notes:'The overall line caught my eye.'},revision:0}
 ]};
}
