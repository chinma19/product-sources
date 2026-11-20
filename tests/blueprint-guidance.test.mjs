import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {Window} from 'happy-dom';
import {PDFDocument} from 'pdf-lib';
import {emptyState,applyPatch,workbook} from '../server/model.mjs';
import {blueprintSections} from '../server/blueprint.mjs';
import {generateBlueprintPDF} from '../server/pdf.mjs';
import {renderBlueprint,renderPart5Page} from '../client/blueprint-view.mjs';

const repo=fileURLToPath(new URL('..',import.meta.url));
const out=resolve(repo,'test-results','partial-completion');
const execFileAsync=promisify(execFile);
const populated=answers=>applyPatch(emptyState(),{baseRevision:0,answers});
function view(state,page=null){const window=new Window({url:'https://guidance.test/'});window.document.body.innerHTML=page?renderPart5Page(workbook.pages[page-1],state.answers,state.bindingState):renderBlueprint(state.answers,state.bindingState);return {window,document:window.document,close:()=>window.close()}}
const text=el=>el?.textContent.replace(/\s+/g,' ').trim()||'';
const sourceLinks=(el,steps)=>[...el.querySelectorAll('a')].some(a=>steps.some(step=>new RegExp('#/step/'+step+'(?:[?]|$)').test(a.getAttribute('href')||'')));

// These checks inspect rendered semantic markup, not mobile geometry or browser
// native dialogs. All data are synthetic and no application API is contacted.
test('missing identity remains identifiable inside an otherwise populated Master section',async()=>{
 const state=populated({'direction.1':'Easy and deliberate'}),v=view(state);
 try{const section=v.document.querySelector('[data-result-section="identity"]');assert.ok(section);assert.ok(section.querySelector('[data-result-id="identity"].is-missing'));assert.ok(text(section).includes('Easy and deliberate'));assert.ok(text(section.querySelector('[data-result-id="identity"]')).includes('Not recorded yet'));}
 finally{await v.close()}
});

test('partial style-language guidance retains nine rows and all eighteen cells with specific sources',async()=>{
 const state=populated({'fit.pattern':'Room for everyday movement'}),v=view(state);
 try{const field=v.document.querySelector('.master-dossier [data-result-id="style.language"]');assert.ok(field);const headings=[...field.querySelectorAll('.blueprint-structured h4')].map(el=>text(el));assert.deepEqual(headings,workbook.pages[59].controls.find(c=>c.id==='style.language').rows);
 const missing=[...field.querySelectorAll('[data-missing-cell]')];assert.equal(missing.length,17);assert.equal(field.querySelectorAll('.blueprint-structured dd').length,18);assert.ok(text(field).includes('Room for everyday movement'));
 const silhouette=field.querySelector('[data-missing-cell="Silhouette::My preference"]'),fitClothing=field.querySelector('[data-missing-cell="Fit::What this looks like for me"]');assert.ok(silhouette);assert.ok(fitClothing);assert.ok(sourceLinks(silhouette,[11,12,20]));assert.ok(sourceLinks(fitClothing,[50,51,56]));
 }finally{await v.close()}
});

test('one recorded colour retains guidance for the five other formula roles and targets their original exercise',async()=>{
 const state=populated({colours:{Anchor:{name:'Espresso',hex:'#49362d'}}}),v=view(state);
 try{for(const selector of ['.master-dossier [data-result-id="colours"]','[data-result-id="glance.colours"]']){const field=v.document.querySelector(selector);assert.ok(field);const roles=[...field.querySelectorAll('.blueprint-colours dt')].map(el=>text(el));assert.deepEqual(roles,workbook.pages[60].controls.find(c=>c.id==='colours').rows);assert.equal(field.querySelectorAll('[data-missing-role]').length,5);assert.ok(text(field).includes('Espresso'));const support=field.querySelector('[data-missing-role="Support"]');assert.ok(support);assert.ok(sourceLinks(support,[29,30]));}}
 finally{await v.close()}
});

test('guidance distinguishes genuinely new final decisions, missing discovery responses and optional reflections',async()=>{
 const state=emptyState(),v=view(state),optional=view(state,67);
 try{const newOutfits=v.document.querySelector('[data-result-id="glance.outfits"]'),newPermission=v.document.querySelector('[data-result-id="glance.permission"]'),missingLife=v.document.querySelector('[data-result-id="glance.life"]');
 assert.match(text(newOutfits),/new (?:decision|exercise)|create|build your/i);assert.match(text(newPermission),/new (?:decision|exercise)|create|build your/i);assert.ok(sourceLinks(newOutfits,[63]));assert.ok(sourceLinks(newPermission,[65]));assert.match(text(missingLife),/earlier|missing.*discover/i);assert.ok(sourceLinks(missingLife,[35,36,37,38,39,40,41,42,43,44]));
 const reminder=v.document.querySelector('[data-result-id="compass.reminder"]');assert.ok(reminder);assert.ok(sourceLinks(reminder,[64]));assert.ok(!sourceLinks(reminder,[66]));
 const optionalReflection=optional.document.querySelector('[data-result-id="closing.4"]');assert.ok(optionalReflection);assert.match(text(optionalReflection.closest('details')||optionalReflection),/optional/i);
 }finally{await v.close();await optional.close()}
});

test('rendered completion help never mutates answers, response metadata or PDF section values',async()=>{
 const state=populated({'fit.pattern':'Customer literal fit','direction.1':'Customer literal feeling',colours:{Anchor:{name:'Customer brown',hex:'#49362d'}}}),before=JSON.stringify(state),v=view(state);
 try{assert.equal(JSON.stringify(state),before);const sections=blueprintSections(state.answers,{bindingState:state.bindingState}),serialized=JSON.stringify(sections);assert.ok(serialized.includes('Customer literal fit'));assert.ok(!serialized.includes('Not recorded yet'));assert.ok(!serialized.includes('data-missing-cell'));assert.ok(!serialized.includes('data-missing-role'));for(const helper of v.document.querySelectorAll('[data-blueprint-guidance]')){const copy=text(helper);if(copy.length>20)assert.ok(!serialized.includes(copy),`Guidance must stay outside result data: ${copy}`);}assert.equal(JSON.stringify(state),before);}
 finally{await v.close()}
});

test('partial PDF keeps exact supplied words while excluding display-only completion guidance',async t=>{
 const state=populated({'fit.pattern':'Customer literal fit','direction.1':'Customer literal feeling',colours:{Anchor:{name:'Customer brown',hex:'#49362d'}}}),before=JSON.stringify(state),v=view(state);
 try{await mkdir(out,{recursive:true});const bytes=await generateBlueprintPDF(state.answers,{body:new Uint8Array(await readFile(resolve(repo,'public/assets/DM-Sans.ttf'))),display:new Uint8Array(await readFile(resolve(repo,'public/assets/Cormorant-Garamond.ttf')))},{bindingState:state.bindingState});assert.ok((await PDFDocument.load(bytes)).getPageCount()>0);const path=resolve(out,'guidance-separation.pdf');await writeFile(path,bytes);
 let extracted;for(const python of ['python3','python']){try{extracted=(await execFileAsync(python,['-c','import sys,fitz;d=fitz.open(sys.argv[1]);print(chr(10).join(p.get_text() for p in d))',path],{maxBuffer:2000000})).stdout;break;}catch(error){if(error.code!=='ENOENT'&&!String(error.stderr||'').includes("No module named 'fitz'"))throw error;}}
 if(extracted===undefined){t.diagnostic('PDF text checks unavailable: optional PyMuPDF is not installed. Structural generation passed.');return;}
 const normalized=extracted.replace(/\s+/g,' ');for(const own of ['Customer literal fit','Customer literal feeling','Customer brown'])assert.ok(normalized.includes(own));assert.ok(!normalized.includes('Not recorded yet'));for(const helper of v.document.querySelectorAll('[data-blueprint-guidance]')){const copy=text(helper);if(copy.length>20)assert.ok(!normalized.includes(copy));}assert.equal(JSON.stringify(state),before);
 }finally{await v.close()}
});


test('a completely absent colour formula exposes all six missing roles in Master and One-glance',async()=>{
 const state=emptyState(),v=view(state);
 try{for(const selector of ['.master-dossier [data-result-id="colours"]','[data-result-id="glance.colours"]']){const field=v.document.querySelector(selector);assert.ok(field);assert.equal(field.querySelectorAll('[data-missing-role]').length,6);assert.deepEqual([...field.querySelectorAll('.blueprint-colours dt')].map(el=>text(el)),workbook.pages[60].controls.find(c=>c.id==='colours').rows);for(const role of field.querySelectorAll('[data-missing-role]'))assert.ok(sourceLinks(role,[29,30]));}assert.deepEqual(state.answers,{});}
 finally{await v.close()}
});
