import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,migrateState,applyPatch,resolveValue,resolveSource,bindingInfo,confirmedChanges,getSourceIds,summarySources,summaryDraft,validateBindingState,controls} from '../server/model.mjs';
import {assembleBrief} from '../server/synthesis.mjs';
const read=(id,state)=>resolveValue(id,state.answers,new Set(),state.bindingState);
const patch=(state,body)=>applyPatch(state,{baseRevision:state.revision,...body});

test('new Part5 reflections reuse exact saved words with deterministic ordered fallbacks',()=>{
 const s=patch(emptyState(),{answers:{'direction.1':'Easy and deliberate','brief.1':'At home in myself','specific.2':'Intention, without stiffness','fit.observe.1':'Room to move','visual.qualities':['Softness','Contrast','','',''],'p31.choices1':['Earrings','Watch'],'p31.choices2':['Bag'],'p31.choices3':['Flats']}});
 assert.equal(read('identity.notes.1',s),'At home in myself');assert.equal(read('identity.notes.2',s),'Intention, without stiffness');assert.equal(read('identity.notes.3',s),'Room to move');assert.equal(read('language.notes.3',s),'Softness\nContrast');assert.equal(read('signatures.repeated.1',s),'Earrings\nWatch');assert.equal(read('signatures.repeated.2',s),'Bag');assert.equal(read('signatures.repeated.3',s),'Flats');assert.equal(read('signatures.repeated.6',s),'');
 const revised=patch(s,{answers:{'brief.1':'Ease in my actual life'}});assert.equal(read('identity.notes.1',revised),'Ease in my actual life');
});

test('Part4 dictionary and translation wording reaches meaning and clothing references without assigning an aesthetic',()=>{
 const s=patch(emptyState(),{answers:{'dictionary.entries':[{quality:'Ease',meaning:'Room to breathe',clothing:'Soft linen'},{quality:'Fit',meaning:'Skims without clinging',clothing:'A relaxed shoulder'}],'translation':{'01::Style quality':'Silhouette','01::What it means to me':'A long line','01::How it may show up in clothing':'Straight trousers'},'synthesis.language.2':'Room at the waist'}});
 assert.ok(read('identity.notes.4',s).includes('Ease: Room to breathe'));assert.ok(read('identity.notes.5',s).includes('Ease: Soft linen'));
 const language=read('style.language',s);assert.equal(language['Fit::What this looks like for me'],'A relaxed shoulder\nRoom at the waist');assert.equal(language['Silhouette::What this looks like for me'],'Straight trousers');assert.ok(!language['Length::What this looks like for me'].includes('Soft linen'),'An arbitrary style quality must not be assigned to a dimension by inference');
});

test('editing one cell leaves every unedited derived cell live',()=>{
 let s=patch(emptyState(),{answers:{'fit.pattern':'Room at the waist','silhouette.notes.1':'Straight lines'}});
 // Use profile values explicitly to isolate sparse table semantics from profile fallback choices.
 s=patch(s,{answers:{'body.fit':'Room at the waist','body.silhouette':'Straight lines'}});
 s=patch(s,{answers:{'style.language':{'Fit::My preference':'My deliberate fit override'}}});
 assert.deepEqual(Object.keys(s.answers['style.language']),['Fit::My preference']);assert.equal(bindingInfo('style.language',s.answers,s.bindingState).cells['Silhouette::My preference'],'linked');
 s=patch(s,{answers:{'body.fit':'A changed upstream fit','body.silhouette':'Softly shaped'}});
 assert.equal(read('style.language',s)['Fit::My preference'],'My deliberate fit override');assert.equal(read('style.language',s)['Silhouette::My preference'],'Softly shaped');
 assert.ok(read('glance.language',s).includes('Softly shaped'));
});

test('migration retains ambiguous stored tables and marks them for legacy review',()=>{
 const original={schemaVersion:2,answers:{'body.fit':'New upstream wording','style.language':{'Fit::My preference':'An ambiguous saved value','Shoes::My preference':'Existing shoe words'},'glance.style':'My kept summary'},completed:[1,2],lastStep:2,revision:4};
 const migrated=migrateState(original);assert.equal(migrated.schemaVersion,3);assert.deepEqual(migrated.answers,original.answers);assert.deepEqual(migrated.completed,original.completed);assert.equal(read('style.language',migrated)['Fit::My preference'],'An ambiguous saved value');assert.equal(bindingInfo('style.language',migrated.answers,migrated.bindingState).cells['Fit::My preference'],'legacy');assert.equal(bindingInfo('glance.style',migrated.answers,migrated.bindingState).legacy,true);
 const kept=patch(migrated,{reviewFields:['style.language','glance.style']});assert.equal(bindingInfo('glance.style',kept.answers,kept.bindingState).mode,'override');assert.deepEqual(kept.answers,original.answers);
});

test('relinking fields or individual cells preserves raw kept values and restores future updates',()=>{
 let s=migrateState({schemaVersion:2,answers:{'style.brief':'First brief','identity':'Kept identity','body.fit':'First fit','body.silhouette':'Straight','style.language':{'Fit::My preference':'Kept fit','Silhouette::My preference':'Kept silhouette'}},completed:[]});
 s=patch(s,{linkFields:['identity'],resetCells:{'style.language':['Fit::My preference']}});
 assert.equal(s.answers.identity,'Kept identity');assert.equal(s.answers['style.language']['Fit::My preference'],'Kept fit');assert.equal(read('identity',s),'First brief');assert.equal(read('style.language',s)['Fit::My preference'],'First fit');assert.equal(read('style.language',s)['Silhouette::My preference'],'Kept silhouette');
 s=patch(s,{answers:{'style.brief':'Updated brief','body.fit':'Updated fit'}});assert.equal(read('identity',s),'Updated brief');assert.equal(read('style.language',s)['Fit::My preference'],'Updated fit');
});

test('full table relinking then editing one cell never revives old cached sibling values',()=>{
 let s=migrateState({schemaVersion:2,answers:{'body.fit':'New fit','body.silhouette':'New silhouette','style.language':{'Fit::My preference':'Old fit','Silhouette::My preference':'Old silhouette'}},completed:[]});
 s=patch(s,{linkFields:['style.language']});s=patch(s,{answers:{'style.language':{'Fit::My preference':'One deliberate override'}}});assert.equal(read('style.language',s)['Silhouette::My preference'],'New silhouette');assert.equal(s.answers['style.language']['Silhouette::My preference'],'Old silhouette');
});

test('confirmed brief uses resolved lifestyle and exposes exact source snapshots',()=>{
 const s=patch(emptyState(),{answers:{'qualities.core':['Ease','Intention','Contrast'],'qualities.supporting':['Softness','',''],'qualities.accent':['Edge','',''],'life.mismatch.3':'Home, work and school runs'}});
 const draft=assembleBrief(s.answers,s.bindingState);assert.deepEqual(draft.missing,[]);assert.ok(draft.text.endsWith('Home, work and school runs.'));assert.equal(draft.sourceSnapshot['lifestyle.priority'],'Home, work and school runs');assert.equal(s.answers['style.brief'],undefined);
});

test('upstream edits flag confirmed wording without changing it or losing a deliberate final identity',()=>{
 let s=patch(emptyState(),{answers:{'qualities.core':['Ease','Intention','Contrast'],'qualities.supporting':['Softness','',''],'qualities.accent':['Edge','',''],'life.mismatch.3':'Home and work'}});const draft=assembleBrief(s.answers,s.bindingState);
 s=patch(s,{answers:{'style.brief':draft.text},confirmFields:[{id:'style.brief',sourceIds:draft.sourceIds}]});assert.equal(confirmedChanges('style.brief',s.answers,s.bindingState).changed,false);
 s=patch(s,{answers:{'life.mismatch.3':'A changed routine'}});assert.equal(read('style.brief',s),draft.text);assert.equal(read('identity',s),draft.text);assert.equal(bindingInfo('glance.style',s.answers,s.bindingState).sourceChanged,true);assert.ok(confirmedChanges('style.brief',s.answers,s.bindingState).changedSourceIds.includes('lifestyle.priority'));
 s=patch(s,{answers:{identity:'My deliberately separate identity'}});assert.equal(read('glance.style',s),'My deliberately separate identity');assert.equal(bindingInfo('identity',s.answers,s.bindingState).mode,'override');
});

test('rules draft retains all rules and consideration wording; saved legacy summaries are not overwritten',()=>{
 const original={'rules.1':'Ease over polish','rules.2':'Room to move','rules.3':'Scratchy fabrics','rules.4':'A clear line','rules.5':'A costume','rules.6':'The one I will wear','rules.more':['Linen','','','',''],'rules.less':['Stiff fabrics','','','',''],'rules.consider':'My actual week'};
 const s=migrateState({schemaVersion:2,answers:{...original,'rules.summary':'My existing short version'},completed:[]});assert.equal(read('rules.summary',s),'My existing short version');const draft=summaryDraft('rules',s.answers,s.bindingState);for(const text of ['Ease over polish','Room to move','Scratchy fabrics','My actual week','Linen','Stiff fabrics'])assert.ok(draft.text.includes(text));assert.equal(draft.sourceIds.length,9);assert.ok(!draft.text.includes('_'));assert.ok(draft.text.split('\n').includes('Ease over polish'));assert.ok(draft.text.split('\n').includes('The one I will wear'));assert.equal(resolveSource('rules.summary',s.answers,s.bindingState),draft.text);assert.ok(summarySources('filter').includes('body.synthesis.3'));
});

test('One-glance clothing and outfit directions use readable labels rather than serialized cell keys',()=>{
 const s=patch(emptyState(),{answers:{'body.fit':'Skimming','style.language':{'Fit::What this looks like for me':'A shirt with room at the shoulder'},'outfits':{'1::BASE':'Wide trousers','1::SHAPE':'Straight','1::BALANCE':'Long and short','1::FINISH':'Gold hoops','1::Why this feels like me':'Easy movement'}}});
 assert.ok(read('glance.language',s).includes('A shirt with room at the shoulder'));assert.ok(read('glance.outfits',s).includes('Base: Wide trousers'));assert.ok(!read('glance.outfits',s).includes('::'));
});

test('backup binding metadata restores linked and confirmed states after explicit validated import',()=>{
 let s=patch(emptyState(),{answers:{'style.brief':'Confirmed words','identity':'Old kept identity','rules.consider':'My routine'}});s=patch(s,{linkFields:['identity'],confirmFields:[{id:'style.brief',sourceIds:['rules.consider']}]});
 const serialized=JSON.parse(JSON.stringify(s));assert.equal(validateBindingState(serialized.bindingState,serialized.answers),true);const restored=patch(emptyState(),{answers:serialized.answers,restoreBindings:serialized.bindingState});assert.equal(read('identity',restored),'Confirmed words');assert.equal(restored.answers.identity,'Old kept identity');assert.equal(confirmedChanges('style.brief',restored.answers,restored.bindingState).tracked,true);
 assert.throws(()=>patch(restored,{answers:{identity:'x'},restoreBindings:{identity:{mode:'override',owner_id:'forbidden'}}}));assert.throws(()=>patch(restored,{bindingState:{identity:{mode:'linked'}}}));assert.throws(()=>patch(restored,{resetCells:{'style.language':['Not a cell']}}));assert.throws(()=>patch(restored,{linkFields:['style.brief']}));
});

test('pending summaries are valid saved controls but never implicitly resolve into final content',()=>{
 const s=patch(emptyState(),{answers:{'summary.pending.rules':'A draft awaiting review','summary.pending.filter':'My tentative shopping filter'}});assert.ok(controls.get('summary.pending.rules').internal);assert.equal(read('glance.rules',s),'');assert.equal(read('glance.filter',s),'');assert.ok(getSourceIds('style.language').includes('translation'));
});


test('linked fields without stored answers and resolved snapshot shapes survive a full JSON backup round trip',()=>{
 let s=patch(emptyState(),{answers:{'inspiration.top':['Softness','Contrast','','','']}});s=patch(s,{linkFields:['identity'],confirmFields:[{id:'glance.style',sourceIds:['personality.1']}]});
 const backup=JSON.parse(JSON.stringify(s));assert.equal(Object.hasOwn(backup.answers,'identity'),false);assert.equal(validateBindingState(backup.bindingState,backup.answers),true);const restored=patch(emptyState(),{answers:backup.answers,restoreBindings:backup.bindingState});assert.equal(restored.bindingState.identity.mode,'linked');assert.equal(confirmedChanges('glance.style',restored.answers,restored.bindingState).tracked,true);
});

test('the confirmation-click snapshot is preserved across queued source edits and later manual wording edits',()=>{
 let s=patch(emptyState(),{answers:{'rules.1':'Ease over polish'}});const draft=summaryDraft('rules',s.answers,s.bindingState),confirmedAt='2026-11-19T08:00:00.000Z';
 s=patch(s,{answers:{'glance.rules':draft.text,'rules.1':'A newer source edit'},confirmFields:[{id:'glance.rules',sourceIds:draft.sourceIds,sourceSnapshot:draft.sourceSnapshot,confirmedAt}]});assert.equal(confirmedChanges('glance.rules',s.answers,s.bindingState).changed,true);assert.equal(s.bindingState['glance.rules'].confirmedAt,confirmedAt);
 s=patch(s,{answers:{'glance.rules':'My revised concise wording'}});assert.equal(confirmedChanges('glance.rules',s.answers,s.bindingState).changed,true);assert.equal(read('glance.rules',s),'My revised concise wording');
 assert.throws(()=>patch(s,{confirmFields:[{id:'glance.rules',sourceIds:['rules.1'],sourceSnapshot:{'rules.2':'Mismatched'}}]}));
});


test('negative goals and admired inspiration are not relabelled as final permissions or wanted repeats',()=>{
 const s=patch(emptyState(),{answers:{'direction.4':'Fussy','specific.4':'A costume','inspiration.top':['Drama','Contrast','','',''],'direction.2':'Professional'}});
 assert.equal(read('closing.4',s),'');assert.equal(read('language.notes.3',s),'');assert.equal(read('identity.notes.2',s),'');assert.equal(read('closing.5',s),'');
});


test('reviewing remaining legacy cells preserves earlier explicit links and deliberate overrides',()=>{
 let s=migrateState({schemaVersion:2,answers:{'body.fit':'Current fit source','body.silhouette':'Current silhouette source','style.language':{'Fit::My preference':'Older fit wording','Silhouette::My preference':'Older silhouette wording','Length::My preference':'Older length wording'}},completed:[]});
 s=patch(s,{resetCells:{'style.language':['Fit::My preference']}});s=patch(s,{answers:{'style.language':{'Silhouette::My preference':'My deliberate silhouette'}}});s=patch(s,{reviewFields:['style.language']});
 const info=bindingInfo('style.language',s.answers,s.bindingState);assert.equal(info.cells['Fit::My preference'],'linked');assert.equal(info.cells['Silhouette::My preference'],'override');assert.equal(info.cells['Length::My preference'],'override');assert.equal(info.legacy,false);assert.equal(read('style.language',s)['Fit::My preference'],'Current fit source');assert.equal(read('style.language',s)['Silhouette::My preference'],'My deliberate silhouette');assert.equal(read('style.language',s)['Length::My preference'],'Older length wording');assert.equal(s.answers['style.language']['Fit::My preference'],'Older fit wording');
});


test('One-glance shopping filter keeps row labels and exact responses without repeated column metadata',()=>{
 const s=patch(emptyState(),{answers:{'lifestyle.priority':'My actual week','personality.3':'Quiet contrast','colour.final':'Warm neutrals','body.synthesis.3':'Room to move','rules.consider':'I can style it my way'}});const text=read('glance.filter',s);assert.ok(text.includes('Lifestyle: My actual week'));assert.ok(text.includes('Personality: Quiet contrast'));assert.ok(text.includes('Styling potential: I can style it my way'));assert.ok(!text.includes('What I want to check'));
});
