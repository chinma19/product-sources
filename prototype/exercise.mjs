import {workbook,resolveValue} from '../server/model.mjs';
import {escapeHTML as e} from '../client/exports.mjs';
import {field} from './fields.mjs';
import {relevantEvidence,renderEvidenceGallery} from './evidence-gallery.mjs';
import {exercisePlan} from './exercise-plan.mjs';

function earlierSelections(ratings){
 const yes=Object.entries(ratings).filter(([,reaction])=>reaction==='Yes — I love this').map(([name])=>name);
 return `<section class="exercise-earlier-selections" aria-label="Earlier customer-selected silhouettes"><div class="exercise-selected-inline"><span>Customer-selected in step 11</span><strong>Marked YES</strong>${yes.length?yes.map(name=>`<span class="exercise-selected-word">${e(name)}</span>`).join(''):'<span>No YES selections recorded.</span>'}</div><details class="exercise-earlier-details"><summary><span>Your discoveries so far</span><span>${Object.keys(ratings).length} recorded ${Object.keys(ratings).length===1?'selection':'selections'}</span></summary><ul>${Object.entries(ratings).map(([name,reaction])=>`<li><span>${e(name)}</span><span>${e(reaction)}</span></li>`).join('')}</ul><button type="button" class="prototype-text-button" data-action="inspect-step" data-step="11">Review earlier response</button></details></section>`;
}
function renderStage(block,page,state){
 const controls=block.controlIds.map(id=>page.controls.find(control=>control.id===id)).filter(Boolean);
 return `<section class="exercise-stage" id="stage-${e(block.id)}" data-exercise-stage="${e(block.id)}" tabindex="-1" aria-labelledby="stage-title-${e(block.id)}"><header class="exercise-stage-heading"><h2 id="stage-title-${e(block.id)}">${e(block.label)}</h2></header>${block.guidance.length?`<div class="exercise-look-guidance">${block.guidance.map(line=>`<p>${e(line)}</p>`).join('')}</div>`:''}<div class="exercise-questions">${controls.map(control=>`${(block.before?.[control.id]||[]).map(line=>`<p class="exercise-source-cue">${e(line)}</p>`).join('')}${field(control,state)}`).join('')}</div></section>`;
}
export function renderExercise({state,evidence=[],photo,phase='choose',flow='continuous',galleryOpen=true}){
 const page=workbook.pages[11],plan=exercisePlan(page),selectedPhase=plan.some(block=>block.id===phase)?phase:plan[0].id,selectedFlow=flow==='separate'?'separate':'continuous';
 const ratings=resolveValue('silhouette.ratings',state.answers,new Set(),state.bindingState)||{},items=relevantEvidence(evidence,12),shownPhases=selectedFlow==='continuous'?plan:plan.filter(block=>block.id===selectedPhase);
 return `<div class="exercise-layout exercise-flow-layout" data-exercise-flow="${selectedFlow}"><main class="exercise-main" id="prototype-main">
  <div class="exercise-topline"><span>Part 1 · Your Body</span><span>Step 12 / 68</span></div>
  <header class="exercise-page-heading"><p class="prototype-kicker">YOUR DISCOVERIES</p><h1>${e(page.title)}</h1><p class="exercise-deck">${e(page.lines[0])}</p></header>
  <div class="exercise-flow-choice"><div><span>Exercise layout</span><p>Your answers stay the same in either view.</p></div><div class="exercise-flow-toggle" role="group" aria-label="Exercise layout"><button type="button" data-action="exercise-flow" data-flow="continuous" aria-pressed="${selectedFlow==='continuous'}">Continuous exercise</button><button type="button" data-action="exercise-flow" data-flow="separate" aria-pressed="${selectedFlow==='separate'}">Separate stages</button></div></div>
  <nav class="exercise-stage-nav" aria-label="Exercise sections"><div class="exercise-stage-links" style="--stage-count:${plan.length}">${plan.map(({id:key,label})=>`<button type="button" data-action="phase" data-phase="${key}" ${selectedFlow==='continuous'?`aria-controls="stage-${key}"`:''} ${selectedPhase===key?'aria-current="step"':''}>${label}</button>`).join('')}</div><button type="button" class="exercise-evidence-trigger" data-action="exercise-evidence">Recent Outfits <span>${items.length}</span></button></nav>
  ${renderEvidenceGallery({evidence:items,photo,galleryOpen})}
  <aside class="exercise-sample-answers"><strong>Sample customer answers</strong><p>This isolated preview starts with example selections and written responses. You can edit them; your actual workbook is not connected.</p></aside>
  ${earlierSelections(ratings)}
  <div class="exercise-stage-stack">${shownPhases.map(block=>renderStage(block,page,state)).join('')}</div>
  <details class="original-copy exercise-original-copy"><summary>Read the original guidance</summary>${page.lines.map(line=>`<p>${e(line)}</p>`).join('')}</details>
  <footer class="exercise-footer"><div><span id="exercise-save-note" data-local-status>Example session</span><p>You can return and revise any answer.</p></div><div class="exercise-footer-actions"><button type="button" class="prototype-text-button" data-action="navigate" data-view="journey">Back to the journey</button><button type="button" class="prototype-primary" data-action="complete-exercise">Save this discovery</button></div></footer>
 </main></div>`;
}
