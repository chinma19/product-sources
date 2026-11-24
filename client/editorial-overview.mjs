import {escapeHTML as e} from './exports.mjs';

// These components read the authenticated application's state. They never create
// responses, completion records or evidence, and do not instantiate a store.
const chapterNotes={
  1:'How clothes work on you',
  2:'Who You Are Visually',
  3:'How You Actually Live',
  4:'Body + Personality + Lifestyle',
  5:'Everything in One Place'
};
function context(workbook,state={}){
  const pages=workbook.pages;
  const completed=new Set((state.completed||[]).filter(number=>pages.some(page=>page.page===number)));
  const current=pages.find(page=>page.page===Number(state.lastStep))||pages[0];
  return {pages,completed,current,total:pages.length};
}
function photoFor(evidence=[]){
  return evidence.find(item=>item.kind==='recent'&&item.url)||evidence.find(item=>item.url);
}
function progressFor(pages,completed){
  return {done:pages.filter(page=>completed.has(page.page)).length,total:pages.length};
}
function stepLinks(pages,completed,current){
  return `<ol class="editorial-step-list">${pages.map(page=>`<li><a href="#/step/${page.page}" ${page.page===current.page?'aria-current="step"':''}><span class="editorial-step-number">${String(page.page).padStart(2,'0')}</span><span>${e(page.title)}</span><span class="editorial-step-status">${completed.has(page.page)?'Completed':page.page===current.page?'Current step':'Open step'}</span></a></li>`).join('')}</ol>`;
}
function chapter(workbook,part,pages,completed,current){
  const count=progressFor(pages,completed);
  const status=count.done===count.total?'Complete':part===current.part?'Current chapter':count.done?'Started':'To explore';
  return `<details class="index-part editorial-chapter" data-editorial-chapter="${part}">
    <summary><span class="editorial-chapter-number">${String(part).padStart(2,'0')}</span><span class="editorial-chapter-name"><span>${e(workbook.parts[part])}</span><small>${e(chapterNotes[part]||'')}</small></span><span class="editorial-chapter-progress"><span>${count.done} / ${count.total} complete</span><small>${status}</small></span><span class="editorial-chapter-toggle" aria-hidden="true">+</span></summary>
    <div class="editorial-chapter-body">${stepLinks(pages,completed,current)}</div>
  </details>`;
}
function resume(workbook,current,completed,evidence,total){
  const image=photoFor(evidence),currentPages=workbook.pages.filter(page=>page.part===current.part),count=progressFor(currentPages,completed);
  return `<section class="editorial-resume" aria-labelledby="editorial-resume-title"><div class="editorial-resume-copy"><p class="eyebrow">${completed.size?'CONTINUE YOUR DISCOVERIES':'YOUR STARTING POINT'}</p><div class="editorial-resume-meta"><span>${current.part?'Part '+current.part+' · ':''}${e(workbook.parts[current.part])}</span><span>Step ${current.page} / ${total}</span></div><h2 id="editorial-resume-title">${e(current.title)}</h2><p>${e(current.lines?.[0]||'')}</p><p class="editorial-resume-progress">${count.done} of ${count.total} steps complete in this ${current.part?'chapter':'preparation section'}</p><div class="editorial-resume-actions"><a class="button" href="#/step/${current.page}">${completed.size?'Resume my workbook':'Begin my Blueprint'}</a><a class="text-link" href="#/blueprint">View my Blueprint</a></div></div>${image?`<figure><img src="${e(image.url)}" alt="${e(image.title||'My outfit reference')}" decoding="async"><figcaption>${e(image.title||'My outfit reference')}<small>${image.kind==='inspiration'?'Inspiration Photos':'Recent Outfits'}</small></figcaption></figure>`:`<div class="editorial-resume-method" aria-label="The discovery process"><span>Observe</span><span>Choose</span><span>Interpret</span><span>Record</span><span>Synthesize</span><span>Build</span></div>`}</section>`;
}

export function renderEditorialJourney({workbook,state={},evidence=[]}){
  const {pages,completed,current,total}=context(workbook,state);
  const preparation=pages.filter(page=>page.part===0);
  return `<main id="main" class="index-main editorial-journey">
    <header class="editorial-journey-heading"><div><p class="eyebrow">BODY + PERSONALITY + LIFESTYLE</p><h1>The journey</h1><p>You do not need to complete this in one sitting.</p></div><div class="editorial-overall-progress"><p><span>Overall progress</span><strong>${completed.size} / ${total}</strong></p><progress value="${completed.size}" max="${total}" aria-label="${completed.size} of ${total} workbook steps complete"></progress><p>You can revisit and revise any step.</p></div></header>
    ${resume(workbook,current,completed,evidence,total)}
    <section class="editorial-chapter-map" aria-labelledby="editorial-chapter-map-title"><div class="editorial-section-heading"><h2 id="editorial-chapter-map-title">Five parts. One personal Blueprint.</h2><p>Open a chapter to see its steps.</p></div>${workbook.parts.slice(1).map((_,index)=>chapter(workbook,index+1,pages.filter(page=>page.part===index+1),completed,current)).join('')}</section>
    <details class="editorial-preparation"><summary><span>Preparation</span><span>${progressFor(preparation,completed).done} / ${preparation.length} complete</span><span aria-hidden="true">+</span></summary>${stepLinks(preparation,completed,current)}</details>
    ${workbook.sessions?.length?`<details class="session-plan editorial-session-plan"><summary>Six sessions, at your own pace</summary><div class="editorial-session-links">${workbook.sessions.map((session,index)=>`<a href="#/step/${session.start}"><span>Session ${index+1}</span><strong>${e(session.name)}</strong><small>${e(session.time)}</small></a>`).join('')}</div></details>`:''}
    <div class="editorial-journey-endnote"><p>Your observations. Your own direction.</p><a class="text-link" href="#/evidence">Open my evidence library</a></div>
  </main>`;
}

export function renderEditorialWelcome({workbook,state={},evidence=[]}){
  const {completed,current}=context(workbook,state),image=photoFor(evidence);
  return `<main id="main" class="home editorial-home"><section class="hero"><div class="hero-copy"><p class="eyebrow">PERSONAL STYLE, FROM THE INSIDE OUT</p><h1>Personal style.<br><em>Understood.</em></h1><p class="hero-lead">A guided workbook for understanding your style, your clothes, and the way you want to get dressed.</p><a class="button" href="#/step/${current.page}">${completed.size?'Continue my Blueprint':'Begin my Blueprint'}</a><p class="hero-meta">BODY + PERSONALITY + LIFESTYLE</p></div><div class="editorial-home-evidence">${image?`<figure><img src="${e(image.url)}" alt="${e(image.title||'My outfit reference')}"><figcaption>${e(image.title||'My outfit reference')}</figcaption></figure>`:`<div class="editorial-home-principle"><p>You are not here to find the “right” style.</p><p>You are here to understand your own.</p></div>`}</div></section><section class="editorial-home-journey"><p class="eyebrow">FIVE PARTS. ONE PERSONAL BLUEPRINT.</p><h2>Your observations.<br>Your own direction.</h2><p>There are no perfect answers here. There are only patterns worth noticing.</p><div class="editorial-home-chapters">${workbook.parts.slice(1).map((name,index)=>{const pages=workbook.pages.filter(page=>page.part===index+1),progress=progressFor(pages,completed);return `<a href="#/step/${pages[0].page}"><span>${String(index+1).padStart(2,'0')}</span><strong>${e(name)}</strong><small>${progress.done} / ${progress.total} complete</small></a>`;}).join('')}</div><a class="text-link" href="#/journey">View the full journey</a></section><section class="editorial-home-evidence-note"><p class="eyebrow">COLLECT FIRST. INTERPRET LATER.</p><h2>Your own life is the evidence.</h2><p>8–12 recent outfits. 10–15 inspiration images. The life you actually live.</p><a class="text-link" href="#/evidence">Prepare my evidence</a></section></main>`;
}
