// Presentation-only interleaving of approved source lines and existing controls.
import editorialLayout from '../content/editorial-layout.json' with {type:'json'};
import {escapeHTML as e} from './exports.mjs';
const indexed=new Map(editorialLayout.pages.map(page=>[page.page,page]));
const slug=value=>String(value).replace(/[^a-zA-Z0-9_-]/g,'-');
const defaultLine=(text,index,page)=>{
 if(!String(text).trim())return '';
 const heading=/^[A-Z0-9\s—–+/:?.,'’“”()\-]+$/.test(text)&&/[A-Z]/.test(text)&&text.length<115&&!text.includes('_');
 return heading?`<h3 data-source-line="${index}">${e(text)}</h3>`:`<p data-source-line="${index}">${e(text)}</p>`;
};
export function pageLayout(page){
 const metadata=indexed.get(page.page);
 if(!metadata||metadata.sourceLineCount!==page.lines.length||metadata.title!==page.title||metadata.anchors.length!==page.controls.length||metadata.anchors.some(anchor=>page.lines[anchor.line]!==anchor.sourceCue||!page.controls.some(control=>control.id===anchor.controlId)))throw Error(`Editorial layout needs review for manuscript page ${page.page}.`);
 return metadata.sections.map(section=>({...section,lines:[...section.lines],controlIds:[...section.controlIds]}));
}
export function renderExerciseSections(page,{field,guidanceLine=defaultLine,jumps=true}={}){
 if(typeof field!=='function')throw Error('Provide the existing exercise field renderer.');
 const metadata=indexed.get(page.page),sections=pageLayout(page),controls=new Map(page.controls.map(control=>[control.id,control]));
 const represented=new Map(metadata.representedLines.map(row=>[row.line,row.by])),decorative=new Set(metadata.decorativeLines),anchors=new Map();
 for(const anchor of metadata.anchors){if(!anchors.has(anchor.line))anchors.set(anchor.line,[]);anchors.get(anchor.line).push(anchor);}
 for(const rows of anchors.values())rows.sort((a,b)=>a.order-b.order);
 const titled=sections.filter(section=>section.title),showJumps=jumps&&page.controls.length>0&&titled.length>=2&&titled.length<=6;
 const jumpNav=showJumps?`<nav class="editorial-section-nav" aria-label="Exercise sections">${titled.map(section=>`<button type="button" data-action="jump-exercise-section" data-section="section-${slug(section.id)}">${e(section.title)}</button>`).join('')}</nav>`:'';
 const body=sections.map(section=>{
  const heading=section.title?`<h2 class="editorial-section-title" data-source-line="${section.headingLine}">${e(section.title)}</h2>`:'';
  const content=section.lines.map(index=>{
   const line=page.lines[index],isHeading=index===section.headingLine;
   const reading=!isHeading&&!represented.has(index)&&!decorative.has(index)?guidanceLine(line,index,page):'';
   const fields=(anchors.get(index)||[]).map(anchor=>`<div class="editorial-field-placement" data-layout-control="${e(anchor.controlId)}" data-source-anchor="${index}">${field(controls.get(anchor.controlId))}</div>`).join('');
   return reading+fields;
  }).join('');
  return `<section class="editorial-exercise-section" data-layout-section="${e(section.id)}" id="section-${slug(section.id)}" tabindex="-1">${heading}${content}</section>`;
 }).join('');
 return `<div class="editorial-exercise" data-layout-page="${page.page}">${jumpNav}${body}</div>`;
}
export function layoutMetadata(pageNumber){return indexed.get(Number(pageNumber))||null;}
