// Isolated, presentation-only prototype. All completion counts come from state.
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const e=escapeHTML;
const chapterNotes={
  1:'How clothes work on you',
  2:'Who You Are Visually',
  3:'How You Actually Live',
  4:'Body + Personality + Lifestyle',
  5:'Everything in One Place'
};
function imageSource(item,photo){try{const source=photo?.(item);return typeof source==='string'?source:''}catch{return ''}}
function stepAction(page){return `data-action="${page===12?'open-exercise':'inspect-step'}" data-step="${page}"`}
function chapterState(pages,completed,currentPart,part){const done=pages.filter(page=>completed.has(page.page)).length;return {done,total:pages.length,status:done===pages.length&&pages.length?'Complete':part===currentPart?'Current chapter':done?'Started':'To explore'}}
function stepList(pages,completed,currentPage){return `<ol class="chapter-step-list">${pages.map(page=>`<li><button type="button" ${stepAction(page.page)} ${page.page===currentPage?'aria-current="step"':''}><span class="chapter-step-number">${String(page.page).padStart(2,'0')}</span><span class="chapter-step-title">${e(page.title)}</span><span class="chapter-step-status">${completed.has(page.page)?'Completed':page.page===currentPage?'Current exercise':'View guidance'}</span></button></li>`).join('')}</ol>`}
function chapterSection(part,name,pages,completed,currentPart,currentPage){const progress=chapterState(pages,completed,currentPart,part);return `<details class="chapter-outline" data-preview-chapter="${part}"><summary><span class="chapter-outline-number">${String(part).padStart(2,'0')}</span><span class="chapter-outline-name"><span class="chapter-outline-title">${e(name)}</span><span class="chapter-outline-note">${e(chapterNotes[part]||'')}</span></span><span class="chapter-outline-progress"><span>${progress.done} / ${progress.total} complete</span><span class="chapter-outline-state ${part===currentPart?'is-current':''}">${e(progress.status)}</span></span><span class="chapter-outline-toggle" aria-hidden="true">+</span></summary><div class="chapter-outline-expanded"><p class="chapter-outline-intro">Choose a step to review its original guidance. Your completed steps remain marked.</p>${stepList(pages,completed,currentPage)}</div></details>`}

export function renderChapter({workbook,state={},evidence=[],photo}={}){
 if(!workbook?.pages?.length)return '<section class="chapter-unavailable"><h1>The journey</h1><p>The workbook preview is unavailable.</p></section>';
 const pages=workbook.pages,completed=new Set((state.completed||[]).filter(n=>pages.some(page=>page.page===n))),currentPage=12,current=pages.find(page=>page.page===currentPage)||pages[0],currentPart=current.part||1;
 const chapters=workbook.parts.slice(1).map((name,index)=>({part:index+1,name,pages:pages.filter(page=>page.part===index+1)}));
 const preparation=pages.filter(page=>page.part===0),firstImage=evidence.find(item=>imageSource(item,photo)),imageURL=firstImage?imageSource(firstImage,photo):'';
 const currentPages=pages.filter(page=>page.part===currentPart),currentProgress=chapterState(currentPages,completed,currentPart,currentPart);
 const overallDone=completed.size,total=pages.length;
 const visibleEvidence=evidence.map(item=>({item,url:imageSource(item,photo)})).filter(x=>x.url).slice(0,4);
 return `<div class="chapter-preview-layout">
  <aside class="chapter-rail" aria-label="Workbook navigation">
   <div class="chapter-rail-heading"><p class="prototype-kicker">YOUR WORKBOOK</p><h2>The journey</h2></div>
   <nav class="chapter-view-nav" aria-label="Preview views"><button type="button" data-action="navigate" data-view="journey" aria-current="page">The journey</button><button type="button" data-action="navigate" data-view="exercise">Current exercise</button><button type="button" data-action="navigate" data-view="blueprint">My Blueprint</button></nav>
   <div class="chapter-rail-progress"><p><span>Overall progress</span><strong>${overallDone} / ${total}</strong></p><progress value="${overallDone}" max="${total}" aria-label="${overallDone} of ${total} workbook steps complete"></progress></div>
   <div class="chapter-rail-index"><p class="prototype-kicker">FIVE CHAPTERS</p><ol>${chapters.map(chapter=>{const count=chapterState(chapter.pages,completed,currentPart,chapter.part);return `<li ${chapter.part===currentPart?'class="is-current"':''}><span class="chapter-rail-number">${String(chapter.part).padStart(2,'0')}</span><div><span>${e(chapter.name)}</span><small>${count.done} / ${count.total} complete</small></div></li>`}).join('')}</ol></div>
   <p class="chapter-rail-note">Your observations.<br>Your own direction.</p>
  </aside>
  <main class="chapter-main" id="prototype-main">
   <header class="chapter-page-heading"><p class="prototype-kicker">BODY + PERSONALITY + LIFESTYLE</p><h1>The journey</h1><p>You do not need to complete this in one sitting.</p></header>
   <section class="chapter-resume" aria-labelledby="chapter-resume-title"><div class="chapter-resume-copy"><p class="prototype-kicker">CONTINUE YOUR DISCOVERIES</p><div class="chapter-resume-meta"><span>Part ${currentPart} · ${e(workbook.parts[currentPart])}</span><span>Step ${currentPage} / ${total}</span></div><h2 id="chapter-resume-title">${e(current.title)}</h2><p class="chapter-resume-excerpt">${e(current.lines?.find(line=>line==='Look at the silhouettes you marked YES.')||current.lines?.[0]||'')}</p><p class="chapter-resume-progress">${currentProgress.done} of ${currentProgress.total} steps complete in this chapter</p><div class="chapter-resume-actions"><button type="button" class="prototype-primary" data-action="open-exercise" data-step="12">Resume exercise</button><button type="button" class="prototype-text-button" data-action="navigate" data-view="blueprint">View my Blueprint</button></div></div>${imageURL?`<figure class="chapter-resume-image"><img src="${e(imageURL)}" alt="${e(firstImage.title||'Outfit reference from the preview evidence set')}" decoding="async"><figcaption>${e(firstImage.title||'My outfit reference')}</figcaption></figure>`:`<div class="chapter-resume-words" aria-label="Discovery process"><span>Observe</span><span>Choose</span><span>Interpret</span><span>Record</span><span>Synthesize</span><span>Build</span></div>`}</section>
   <section class="chapter-map" aria-labelledby="chapter-map-title"><div class="chapter-section-heading"><h2 id="chapter-map-title">Five parts. One personal Blueprint.</h2><p>Open a chapter to see its steps.</p></div>${chapters.map(chapter=>chapterSection(chapter.part,chapter.name,chapter.pages,completed,currentPart,currentPage)).join('')}</section>
   <details class="chapter-preparation"><summary><span>Preparation</span><span>${preparation.filter(page=>completed.has(page.page)).length} / ${preparation.length} complete</span><span aria-hidden="true">+</span></summary>${stepList(preparation,completed,currentPage)}</details>
   ${visibleEvidence.length?`<section class="chapter-evidence" aria-labelledby="chapter-evidence-title"><div class="chapter-section-heading"><div><p class="prototype-kicker">YOUR EVIDENCE SET</p><h2 id="chapter-evidence-title">Your own life is the evidence.</h2></div><p>${evidence.length} ${evidence.length===1?'reference':'references'} in this preview</p></div><div class="chapter-evidence-strip">${visibleEvidence.map(({item,url})=>`<figure><img src="${e(url)}" alt="${e(item.title||'Preview outfit reference')}" loading="lazy" decoding="async"><figcaption>${e(item.title||'Outfit reference')}<small>${item.kind==='inspiration'?'Inspiration':'Recent outfit'}</small></figcaption></figure>`).join('')}</div></section>`:''}
  </main>
 </div>`;
}
