import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {Miniflare} from 'miniflare';
import {Window} from 'happy-dom';
import {build} from 'esbuild';
import {PDFDocument} from 'pdf-lib';
const repo=fileURLToPath(new URL('..',import.meta.url));
const out=resolve(repo,'test-results','partial-completion');
const execFileAsync=promisify(execFile);
// Structural PDF checks always run. PyMuPDF adds actual text verification when
// present; its absence is reported explicitly, never counted as a text pass.
async function pdfText(path){
 for(const command of ['python3','python']){
  try{const {stdout}=await execFileAsync(command,['-c','import sys,fitz;d=fitz.open(sys.argv[1]);print(chr(10).join(p.get_text() for p in d))',path],{maxBuffer:2000000});return stdout;}
  catch(error){if(error.code!=='ENOENT'&&!String(error.stderr||'').includes("No module named 'fitz'"))throw error;}
 }
 return null;
}

const origin='https://partial-v3.test',owner='synthetic-partial-completion-v3';
const report={version:3,source:'current-working-tree',scope:'One isolated synthetic UI/Worker/D1/R2 scenario. No live application writes.',pdfTextChecksAvailable:null,checks:[],exports:[]};
const check=(name,pass,observed)=>report.checks.push({name,pass:!!pass,...(observed?{observed}:{})});
const has=s=>String(s||'').replace(/\s+/g,' ').trim();

test('version3 exact partial discovery → final references → later missing exercises → preserved decisions → PDF',async()=>{
 await mkdir(out,{recursive:true});
 let mf,w;const blobs=[];let expectedPDFWords=[];let forbiddenPDFWords=['Not recorded yet.'];
 try{
  const worker=await build({absWorkingDir:repo,entryPoints:['server/worker.mjs'],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
  mf=new Miniflare({modules:true,script:worker.outputFiles[0].text,compatibilityDate:'2025-11-01',d1Databases:['DB'],r2Buckets:['BUCKET']});
  const {DB}=await mf.getBindings();for(const {tag}of JSON.parse(await readFile(repo+'/drizzle/meta/_journal.json','utf8')).entries)await DB.exec(await readFile(repo+'/drizzle/'+tag+'.sql','utf8'));
  const api=(path,method='GET',body)=>mf.dispatchFetch(origin+path,{method,headers:{'oai-authenticated-user-id':owner,...(body?{Origin:origin,'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const script=await build({absWorkingDir:repo,entryPoints:['client/app.mjs'],bundle:true,write:false,format:'iife',target:'es2022',loader:{'.css':'empty'}});
  w=new Window({url:origin+'/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});w.document.body.innerHTML='<div id="app"></div><div id="announcements"></div>';w.structuredClone=structuredClone;Object.defineProperty(w,'crypto',{value:globalThis.crypto});w.scrollTo=()=>{};w.confirm=()=>true;w.alert=text=>{throw Error('Unexpected alert: '+text)};w.URL.createObjectURL=blob=>{blobs.push(blob);return 'blob:synthetic-pdf'};w.URL.revokeObjectURL=()=>{};const anchorClick=w.HTMLAnchorElement.prototype.click;w.HTMLAnchorElement.prototype.click=function(){if(this.hasAttribute('download'))return;return anchorClick.call(this)};
  w.fetch=(url,init={})=>api(new URL(url,origin).pathname+new URL(url,origin).search,init.method||'GET',init.body?JSON.parse(init.body):undefined);
  const wait=async(fn,label)=>{for(let i=0;i<600;i++){if(await fn())return;await new Promise(r=>setTimeout(r,15))}throw Error('Timed out: '+label)};
  w.eval(script.outputFiles[0].text);await wait(()=>w.document.querySelector('.hero'),'boot');
  const go=async n=>{w.location.hash=typeof n==='number'?'#/step/'+n:n;await wait(()=>typeof n==='number'?w.document.querySelector('.step-topline')?.textContent.includes('Step '+String(n).padStart(2,'0')+' /'):n==='#/blueprint'?w.document.querySelector('.blueprint-main'):true,'navigate '+n)};
  const input=(selector,value,event='input')=>{const el=w.document.querySelector(selector);assert.ok(el,'Missing test control '+selector);el.focus();el.value=value;el.dispatchEvent(new w.Event(event,{bubbles:true}));};
  const save=async()=>{w.document.querySelector('[data-action="save"]')?.click();await wait(()=>w.document.querySelector('#save-status')?.dataset.status==='saved','save')};
  const card=id=>w.document.querySelector(`[data-result-id="${id}"]`);
  const state=async()=>await(await api('/api/progress')).json();
  const download=async(action,name)=>{const count=blobs.length;const button=w.document.querySelector(`[data-action="${action}"]`);assert.ok(button,'Missing export button '+action);button.click();await wait(()=>blobs.length>count,'download '+name);const bytes=new Uint8Array(await blobs[count].arrayBuffer());const doc=await PDFDocument.load(bytes);await writeFile(out+'/'+name+'.pdf',bytes);report.exports.push({name,pages:doc.getPageCount(),bytes:bytes.length});check(name+' actual downloadable PDF generated',bytes.length>0&&new TextDecoder().decode(bytes.slice(0,5))==='%PDF-');if(action==='pdf-glance')check(name+' fits one page',doc.getPageCount()===1);
   const text=await pdfText(resolve(out,name+'.pdf'));report.pdfTextChecksAvailable=text!==null;
   if(text!==null){const normal=has(text);check(name+' retains supplied customer wording',expectedPDFWords.every(word=>normal.includes(has(word))));check(name+' excludes display-only missing-answer guidance',forbiddenPDFWords.every(word=>!normal.includes(has(word))));}
  };

  // Start with a genuinely partial set: one fit response; one of six colours;
  // one of three signatures; one lifestyle response; selected synthesis answers.
  await go(10);input('[data-id="fit.pattern"]','Room for everyday movement');await save();w.document.querySelector('[data-action="complete"]').click();await wait(()=>w.location.hash==='#/step/11','complete fit');
  await go(29);input('[data-id="colours"][data-key="Anchor"][data-property="name"]','Espresso');input('[data-id="colours"][data-key="Anchor"][data-property="hex"]','#49362d');await save();
  await go(32);input('[data-id="signatures.top"][data-index="0"]','Small gold hoops');await save();
  await go(39);input('[data-id="life.help"]','Comfortable movement for everyday activities');await save();w.document.querySelector('[data-action="complete"]').click();await wait(()=>w.location.hash==='#/step/40','complete one lifestyle exercise');
  await go(49);for(const [id,values]of Object.entries({'qualities.core':['Ease','Intention','Comfort'],'qualities.supporting':['Softness'],'qualities.accent':['Contrast']}))for(let i=0;i<values.length;i++)input(`[data-id="${id}"][data-index="${i}"]`,values[i]);await save();
  await go(54);input('[data-id="direction.5"]','work and home');w.document.querySelector('[data-action="assemble"]').click();await wait(()=>w.document.querySelector('#brief-preview'),'brief preview');w.document.querySelector('[data-action="confirm-brief"]').click();await save();
  const initial=await state(),confirmedBrief=initial.answers['style.brief'];report.initial={answeredKeys:Object.keys(initial.answers).length,completed:initial.completed,lastStep:initial.lastStep};
  check('Some questions in every Part1–4 are answered and other questions remain absent',!!initial.answers['fit.pattern']&&!!initial.answers.colours&&!!initial.answers['life.help']&&!!initial.answers['qualities.core']&&!Object.hasOwn(initial.answers,'silhouette.notes.3')&&!Object.hasOwn(initial.answers,'life.mismatch.3')&&!Object.hasOwn(initial.answers,'dictionary.entries'));
  await go('#/blueprint');
  check('Available fit, colour, signature and confirmed wording appear in Master',card('style.language')?.textContent.includes('Room for everyday movement')&&card('colours')?.textContent.includes('Espresso')&&card('signatures.top')?.textContent.includes('Small gold hoops')&&card('identity')?.textContent.includes(confirmedBrief));
  check('One-Glance automatically shows available discoveries',card('glance.language')?.textContent.includes('Room for everyday movement')&&card('glance.colours')?.textContent.includes('Espresso')&&card('glance.signatures')?.textContent.includes('Small gold hoops')&&card('glance.style')?.textContent.includes(confirmedBrief));
  check('Final results open without asking customer to retype answers',w.document.querySelectorAll('.blueprint-output textarea,.blueprint-output input').length===0);
  check('Completely absent One-Glance lifestyle is identified with an earlier Part3 link',card('glance.life')?.classList.contains('is-missing')&&card('glance.life').textContent.includes('Not recorded yet')&&[...card('glance.life').querySelectorAll('a')].some(a=>/#\/step\/(3[5-9]|4[0-4])(?:\?|$)/.test(a.getAttribute('href'))));
  const lifestyle=w.document.querySelector('[data-result-section="lifestyle"]');
  check('Missing lifestyle priorities remain visible inside an otherwise populated Master section',!!lifestyle?.querySelector('[data-result-id="lifestyle.priority"].is-missing'),has(lifestyle?.textContent));
  const language=card('style.language');
  check('Missing silhouette and clothing-translation components are identified inside the partial style-language table',!!language?.querySelector('.blueprint-missing,.is-missing,[data-missing-cell]'),has(language?.textContent));
  const colours=card('colours');
  check('Five missing colour roles are identified alongside the one recorded colour',colours?.textContent.includes('Support')&&colours?.textContent.includes('Soft Neutral')&&!!colours?.querySelector('.blueprint-missing,.is-missing,[data-missing-cell]'),has(colours?.textContent));
  const outfit=card('glance.outfits'),permission=card('glance.permission');
  check('New outfit and permission decisions link to their Part5 exercises',!!outfit?.querySelector('a[href*="step/63"]')&&!!permission?.querySelector('a[href*="step/65"]'));
  const missingSilhouette=language?.querySelector('[data-missing-cell="Silhouette::My preference"]');
  const missingFitClothing=language?.querySelector('[data-missing-cell="Fit::What this looks like for me"]');
  const missingSupport=colours?.querySelector('[data-missing-role="Support"]');
  const linkedStep=(element,steps)=>[...element?.querySelectorAll('a')||[]].some(a=>steps.some(step=>new RegExp('#/step/'+step+'(?:[?]|$)').test(a.getAttribute('href')||'')));
  check('Missing silhouette guidance points to its specific earlier Body exercise',!!missingSilhouette&&linkedStep(missingSilhouette,[11,12,20]));
  check('Missing fit clothing guidance points to its specific earlier translation exercise',!!missingFitClothing&&linkedStep(missingFitClothing,[50,51,56]));
  check('Missing Support colour guidance points to the original colour-formula exercise',!!missingSupport&&linkedStep(missingSupport,[29,30]));
  const displayedGuidance=[...w.document.querySelectorAll('[data-blueprint-guidance]')].map(el=>has(el.textContent)).filter(text=>text.length>20);
  forbiddenPDFWords=[...new Set([...forbiddenPDFWords,...displayedGuidance])];

  check('New Part5 decisions are explicitly distinguished from missing discovery answers',/new (?:decision|exercise)|create|build your/i.test(outfit?.textContent||'')&&/earlier|missing.*discover/i.test(card('glance.life')?.textContent||''),{newDecision:has(outfit?.textContent),missingEarlier:has(card('glance.life')?.textContent)});
  expectedPDFWords=['Room for everyday movement','Espresso','Small gold hoops'];
  await download('pdf','initial-partial-master');await download('pdf-glance','initial-partial-one-glance');
  const afterExports=await state();check('Display-only guidance never enters saved customer answers',JSON.stringify(afterExports.answers)===JSON.stringify(initial.answers));check('Opening and exporting partial results does not falsely complete journey',afterExports.status==='IN_PROGRESS'&&JSON.stringify(afterExports.completed)===JSON.stringify(initial.completed));

  // Make deliberate final edits, and confirm a concise rules decision.
  card('identity').querySelector('[data-action="edit-blueprint"]').click();input('[data-id="identity"]','My deliberate personal identity');w.document.querySelector('#editorial-overlay-root [data-action="finish-blueprint-edit"][data-field="identity"]').click();await save();await wait(()=>!w.document.querySelector('#editorial-overlay-root [role=dialog]'),'finish identity edit');
  card('style.language').querySelector('[data-action="edit-blueprint"]').click();input('[data-id="style.language"][data-key="Fit::What this looks like for me"]','My deliberately chosen fit translation');w.document.querySelector('#editorial-overlay-root [data-action="finish-blueprint-edit"][data-field="style.language"]').click();await save();await wait(()=>!w.document.querySelector('#editorial-overlay-root [role=dialog]'),'finish language edit');
  await go(64);input('[data-id="rules.1"]','Ease over restriction');input('[data-id="rules.2"]','Comfortable movement');await save();await go('#/blueprint');w.document.querySelector('[data-action="preview-summary"][data-kind="rules"]').click();input('[data-summary-kind="rules"]','Comfort and easy care');w.document.querySelector('[data-action="confirm-summary"][data-kind="rules"]').click();await save();

  // Complete previously skipped discovery answers through the actual UI.
  await go(12);input('[data-id="silhouette.notes.3"]','Straight shapes with an easy line');await save();
  await go(30);const formula={Support:['Olive','#747554'],'Soft Neutral':['Ivory','#f5eddc'],'Strong Neutral':['Charcoal','#393b3b'],Wildcard:['Terracotta','#b4684b'],'Signature Accent':['Gold','#c49c48']};for(const [role,[name,hex]]of Object.entries(formula)){input(`[data-id="colours"][data-key="${role}"][data-property="name"]`,name);input(`[data-id="colours"][data-key="${role}"][data-property="hex"]`,hex)}input('[data-id="colour.direction.1"]','Warm and grounded');await save();
  await go(36);input('[data-id="life.top"][data-index="0"]','Work and home');await save();
  await go(42);input('[data-id="life.mismatch.3"]','Daily routines before occasional events');await save();
  await go(51);w.document.querySelector('[data-action="dictionary-add"]').click();input('[data-dictionary="0"][data-property="quality"]','Fit');input('[data-dictionary="0"][data-property="meaning"]','Room to move');input('[data-dictionary="0"][data-property="clothing"]','Soft linen and relaxed seams');await save();
  await go(49);input('[data-id="qualities.core"][data-index="0"]','Freedom');await save();
  await go('#/blueprint');
  check('Later silhouette completion updates Master and One-Glance automatically',card('style.language')?.textContent.includes('Straight shapes with an easy line')&&card('glance.language')?.textContent.includes('Straight shapes with an easy line'));
  check('Later colour completion updates all six recorded roles and One-Glance',Object.keys(formula).every(role=>card('colours')?.textContent.includes(role))&&card('glance.colours')?.textContent.includes('Terracotta'));
  check('Later lifestyle completion fills previously absent Master and One-Glance priorities',card('lifestyle.priority')?.textContent.includes('Daily routines before occasional events')&&card('glance.life')?.textContent.includes('Daily routines before occasional events'));
  check('Later chosen core-quality edit updates final qualities',card('qualities.final')?.textContent.includes('Freedom')&&card('glance.qualities')?.textContent.includes('Freedom'));
  check('Deliberate final identity and table-cell edits are preserved',card('identity')?.textContent.includes('My deliberate personal identity')&&card('style.language')?.textContent.includes('My deliberately chosen fit translation'));
  let current=await state();check('Previously confirmed Style Brief and concise wording are not rewritten',current.answers['style.brief']===confirmedBrief&&current.answers['glance.rules']==='Comfort and easy care');
  await go(54);check('Changed sources show a review notice for kept confirmed wording',w.document.querySelector('[data-binding-review="style.brief"]')?.textContent.includes('Your earlier answers changed')&&w.document.querySelector('[data-id="style.brief"]')?.value===confirmedBrief);
  await go('#/blueprint');expectedPDFWords=['Straight shapes with an easy line','Terracotta','My deliberate personal identity','My deliberately chosen fit translation'];await download('pdf','updated-partial-master');await download('pdf-glance','updated-partial-one-glance');
  const beforeClose=await state();await w.close();w=null;
  const reopened=await(await api('/api/bootstrap')).json();check('Saved updates and decisions survive a later bootstrap/resume',reopened.state.answers.identity==='My deliberate personal identity'&&reopened.state.answers['style.brief']===confirmedBrief&&reopened.state.answers['glance.rules']==='Comfort and easy care'&&reopened.state.answers['life.mismatch.3']==='Daily routines before occasional events');
  check('Skipped exercises remain skipped; no automatic blanket completion',reopened.state.status==='IN_PROGRESS'&&JSON.stringify(reopened.state.completed)===JSON.stringify(initial.completed));
  report.final={answeredKeys:Object.keys(beforeClose.answers).length,completed:beforeClose.completed,status:beforeClose.status};
 }catch(error){report.fatal={name:error.name,message:error.message,stack:error.stack};throw error}
 finally{if(w){w.happyDOM.abort();await w.close()}await mf?.dispose();report.passed=report.checks.filter(x=>x.pass).length;report.failed=report.checks.filter(x=>!x.pass).length;await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(`Partial-completion checkpoints: ${report.passed} passed, ${report.failed} failed; PDF text checks ${report.pdfTextChecksAvailable?'available':'unavailable (PyMuPDF not installed)'}.`);for(const item of report.checks.filter(item=>!item.pass))console.log('FAILED: '+item.name);}
 assert.equal(report.failed,0,report.failed+' partial-completion acceptance checks failed');
});
