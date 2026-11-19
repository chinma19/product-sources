import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import {Window} from 'happy-dom';
import {renderBlueprint,renderPart5Page} from '../client/blueprint-view.mjs';
import {blueprintSections,profileObjects} from '../server/blueprint.mjs';
import {generateBlueprintPDF} from '../server/pdf.mjs';
import {workbook} from '../server/model.mjs';
const colours={Anchor:{name:'Espresso',hex:'#49362D'},Support:{name:'Olive',hex:'#747554'},'Soft Neutral':{name:'Ivory',hex:'#F5EDDC'},'Strong Neutral':{name:'Charcoal',hex:'#393B3B'},Wildcard:{name:'Terracotta',hex:'#B4684B'},'Signature Accent':{name:'Gold',hex:'#C49C48'}};
const words={
 'style.brief':'I want to dress with ease and intention.','qualities.core':['Ease','Intention','Softness'],'qualities.supporting':['Polish','',''],'qualities.accent':['Colour','',''],
 'fit.pattern':'Room to move','silhouette.notes.1':'A defined waist','proportion.notes.1':'Shorter top, longer trousers','length.notes.1':'Ankle-length trousers','neckline.notes.1':'Open necklines','colours':colours,'signatures.top':['Small gold hoops','Rolled sleeves','Polished flats'],'signatures.automatic':'Small gold hoops','signatures.deliberate':'Polished flats',
 'life.help':'Comfortable everyday movement','life.top':['Home','Work','Errands'],'practical.notes.3':'Comfort, washable fabrics','life.mismatch.3':'Clothes for my actual everyday life',
 'outfits':{'1::BASE':'T-shirt and trousers','1::SHAPE':'Defined waist','1::BALANCE':'Soft with tailored','1::FINISH':'Gold hoops','2::BASE':'Shirt and jeans','2::SHAPE':'Relaxed','2::BALANCE':'Crisp with easy','2::FINISH':'Polished flats','3::BASE':'Knit dress','3::SHAPE':'Skimming','3::BALANCE':'Simple with texture','3::FINISH':'Watch'},
 'rules.1':'Ease over restriction','rules.2':'I can move comfortably','rules.3':'Fussy care','rules.4':'Intentional','permission.6':'My own preferences matter',
 'dictionary.entries':[{quality:'Ease',meaning:'Room to move',clothing:'Soft fabrics and relaxed fits'}],
 'glance.style':'Easy, soft and intentional','glance.qualities':'Ease · Intention · Softness','glance.language':'Room to move; defined waist; open necklines; soft fabrics; polished shoes.',
 'glance.signatures':'Gold hoops · rolled sleeves · polished flats',
 'glance.outfits':'T-shirt + trousers + gold hoops; shirt + jeans + polished flats; knit dress + watch.',
 'glance.life':'Home, work and errands. Comfortable movement and washable fabrics.',
 'glance.permission':'My own preferences matter.',
 'glance.rules':'Ease over restriction; comfortable movement; intentional finishing.',
 'glance.filter':'Does it fit my real life, reflect my qualities, work with my colours and feel comfortable?'
};
const fonts=async()=>({body:await readFile('public/assets/DM-Sans.ttf'),display:await readFile('public/assets/Cormorant-Garamond.ttf')});

test('final output is a populated readable reference, with controls only after explicit edit',async()=>{
 const w=new Window();try{w.document.body.innerHTML=renderBlueprint(words,{},{});assert.ok(w.document.querySelector('.glance-dossier'));assert.ok(w.document.querySelector('.master-dossier'));assert.equal(w.document.querySelectorAll('textarea,input').length,0);assert.equal(w.document.querySelectorAll('.glance-dossier [data-result-id]').length,10);assert.ok(w.document.querySelector('[data-result-id="identity"]').textContent.includes('ease and intention'));assert.ok(w.document.querySelector('[data-result-id="glance.colours"] svg'));
 assert.ok(w.document.querySelector('[data-result-id="outfits"] .blueprint-structured'));assert.ok(!w.document.body.textContent.includes('1::BASE'));assert.ok(w.document.querySelector('[data-result-id="rules.1"]'));assert.ok(w.document.querySelector('[data-result-id="permission.6"]'));
 let calls=0;w.document.body.innerHTML=renderBlueprint(words,{}, {editing:new Set(['identity']),field:c=>{calls++;return `<textarea data-test-editor="${c.id}"></textarea>`},notice:c=>c.id==='identity'?'<p data-test-notice>Review earlier wording</p>':''});assert.equal(calls,1);assert.equal(w.document.querySelectorAll('textarea').length,1);assert.ok(w.document.querySelector('[data-result-id="identity"] [data-test-notice]'));assert.ok(w.document.querySelector('[data-result-id="identity"] [data-action="finish-blueprint-edit"]'));
 }finally{await w.close()}
});

test('page labels remain approved, missing information has source links and no blank response inputs',async()=>{
 const w=new Window();try{const p=workbook.pages[58];w.document.body.innerHTML=renderPart5Page(p,{'style.brief':'<script>my own words</script>'},{},{editHref:n=>`#/step/${n}?return=%23%2Fstep%2F59`});assert.ok(w.document.body.textContent.includes(p.controls[0].label));assert.ok(w.document.body.innerHTML.includes('&lt;script&gt;'));assert.ok(!w.document.querySelector('script'));assert.equal(w.document.querySelectorAll('textarea,input').length,0);assert.ok(w.document.querySelector('.blueprint-missing-fields'));assert.ok(w.document.querySelector('.blueprint-source-links a'));}
 finally{await w.close()}
});

test('website sections and profile outputs respect linked and overridden binding metadata',()=>{
 const answers={'identity':'Old explicit identity','style.brief':'Confirmed style brief','body.fit':'Old fit copy','fit.pattern':'New fit response'};
 const linked={identity:{mode:'linked'},'body.fit':{mode:'linked'}};
 assert.equal(blueprintSections(answers,{bindingState:linked}).find(s=>s.id==='identity').entries[0].value,'Confirmed style brief');assert.equal(profileObjects(answers,linked).body['body.fit'],'New fit response');
 assert.equal(blueprintSections(answers,{bindingState:{identity:{mode:'override'}}}).find(s=>s.id==='identity').entries[0].value,'Old explicit identity');assert.equal(blueprintSections({}).length,0);
});

test('the complete ten-field One-Glance PDF is measured into one readable page and full output paginates',async()=>{
 const f=await fonts(),one=await generateBlueprintPDF(words,f,{glance:true}),full=await generateBlueprintPDF(words,f);assert.equal((await PDFDocument.load(one)).getPageCount(),1);assert.ok((await PDFDocument.load(full)).getPageCount()>1);await mkdir('test-results/pdf',{recursive:true});await writeFile('test-results/pdf/one-glance-complete.pdf',one);await writeFile('test-results/pdf/full-blueprint-complete.pdf',full);
 assert.equal((await PDFDocument.load(one)).getTitle(),'My One-Glance Blueprint');
});

test('moderate complete source responses populate all ten One-Glance fields and fit without summary overrides',async()=>{
 const sourceAnswers=Object.fromEntries(Object.entries(words).filter(([key])=>!key.startsWith('glance.')));
 Object.assign(sourceAnswers,{'synthesis.language.1':'Defined waist','synthesis.language.5':'Soft fabrics','synthesis.language.4':'Quiet detail','synthesis.language.6':'Gold jewellery','p31.choices3':['Polished flats'],'personality.3':'Quiet detail','body.synthesis.3':'Room to move','rules.consider':'Outfits for real life','colour.direction.1':'Warm and grounded'});
 const entries=blueprintSections(sourceAnswers,{glance:true}).flatMap(section=>section.entries);assert.equal(entries.length,10);assert.ok(entries.every(entry=>entry.value.trim()));
 const pdf=await generateBlueprintPDF(sourceAnswers,await fonts(),{glance:true});assert.equal((await PDFDocument.load(pdf)).getPageCount(),1);await writeFile('test-results/pdf/one-glance-linked-complete.pdf',pdf);
});

test('overlong One-Glance content is never silently truncated or shrunk below legible type',async()=>{
 const f=await fonts();await assert.rejects(generateBlueprintPDF({'glance.style':'My full own words '.repeat(400)},f,{glance:true}),e=>e.status===422&&e.message.includes('Review and confirm shorter One-Glance summaries'));
 await assert.rejects(generateBlueprintPDF({},f),e=>e.status===400);const long=await generateBlueprintPDF({'style.statement':'My full own words '.repeat(400)},f);assert.ok((await PDFDocument.load(long)).getPageCount()>1);
});
