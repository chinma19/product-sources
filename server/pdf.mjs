import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {blueprintSections} from './blueprint.mjs';
const color=hex=>rgb(...hex.replace('#','').match(/../g).map(x=>parseInt(x,16)/255));
const BROWN=color('#4A3B32'),INK=color('#514D49'),STONE=color('#D8D0C6'),IVORY=color('#F8F5EF');
const W=612,H=792,L=44,R=W-L,BOTTOM=62;
const error=(message,status)=>Object.assign(Error(message),{status});
const validHex=value=>/^#[a-f0-9]{6}$/i.test(value||'');
function wrapText(text,font,size,width){
 const lines=[];
 for(const para of String(text).replace(/\r/g,'').split('\n')){
  if(!para.trim()){if(lines.length)lines.push('');continue}
  let line='';for(const word of para.split(/\s+/).filter(Boolean)){
   if(font.widthOfTextAtSize(word,size)>width){if(line){lines.push(line);line=''}let piece='';for(const ch of word){if(piece&&font.widthOfTextAtSize(piece+ch,size)>width){lines.push(piece);piece=''}piece+=ch}line=piece;
   }else if(line&&font.widthOfTextAtSize(line+' '+word,size)>width){lines.push(line);line=word}else line=(line+' '+word).trim();
  }if(line)lines.push(line);
 }return lines;
}
const labelText=entry=>entry.label.replace(/…|_{2,}/g,'').replace(/:$/,'');
const colourRows=entry=>Object.entries(entry.colours||{}).filter(([,c])=>c&&(c.name||c.hex));
function colourText(role,c){return `${role}: ${c.name||''}${c.hex?' ('+c.hex.toUpperCase()+')':''}`.trim()}
function drawTextLines(page,lines,{x,y,font,size,leading,color:ink=INK}){for(const line of lines){if(line)page.drawText(line,{x,y:y-size,font,size,color:ink});y-=leading}return y}
function paintPage(doc,body){const page=doc.addPage([W,H]);page.drawRectangle({x:0,y:0,width:W,height:H,color:IVORY});page.drawText('IN HER FASHION  /  PERSONAL STYLE BLUEPRINT',{x:L,y:H-31,font:body,size:8,color:BROWN});return page}
function pageFooters(doc,body){const count=doc.getPageCount();doc.getPages().forEach((page,index)=>{page.drawLine({start:{x:L,y:45},end:{x:R,y:45},color:STONE,thickness:.5});page.drawText(`${String(index+1).padStart(2,'0')} / ${String(count).padStart(2,'0')}`,{x:R-39,y:29,font:body,size:8,color:BROWN})})}
function measureCard(entry,font,size,width){
 const leading=size+3.25,labelLines=wrapText(labelText(entry),font,9.5,width);
 const rows=colourRows(entry);const colourLines=rows.map(([role,c])=>({role,c,lines:wrapText(colourText(role,c),font,size,width-22)}));
 const lines=rows.length?[]:wrapText(entry.value,font,size,width);
 return {entry,size,leading,labelLines,lines,colourLines,height:labelLines.length*12+6+(rows.length?colourLines.reduce((h,row)=>h+Math.max(17,row.lines.length*leading)+4,0):lines.length*leading)+17};
}
function drawCard(page,card,x,y,width,body){
 y=drawTextLines(page,card.labelLines,{x,y,font:body,size:9.5,leading:12,color:BROWN});y-=6;
 if(card.colourLines.length){for(const row of card.colourLines){if(validHex(row.c.hex))page.drawRectangle({x,y:y-12,width:13,height:13,color:color(row.c.hex),borderColor:STONE,borderWidth:.5});drawTextLines(page,row.lines,{x:x+22,y,font:body,size:card.size,leading:card.leading});y-=Math.max(17,row.lines.length*card.leading)+4;}}
 else y=drawTextLines(page,card.lines,{x,y,font:body,size:card.size,leading:card.leading});
 y-=9;page.drawLine({start:{x,y},end:{x:x+width,y},color:STONE,thickness:.45});return y-8;
}
function oneGlance(doc,entries,body,display){
 const width=R-L,gap=25,columnWidth=(width-gap)/2;
 const first=entries.find(entry=>entry.key==='glance.style'),others=entries.filter(entry=>entry!==first);
 // Preserve logical order down the left column, then down the right. Measure every
 // character before drawing; never crop, ellipsise, or quietly make a second page.
 let layout;
 for(const size of [10,9.5]){
  const titleLines=wrapText('My One-Glance Blueprint',display,30,width),titleHeight=titleLines.length*35;
  const firstCard=first?measureCard(first,body,10.5,width):null;
  const top=H-61-titleHeight-17-(firstCard?firstCard.height+7:0),capacity=top-BOTTOM;
  const cards=others.map(entry=>measureCard(entry,body,size,columnWidth));
  let best=null;for(let split=0;split<=cards.length;split++){const left=cards.slice(0,split),right=cards.slice(split),leftHeight=left.reduce((h,c)=>h+c.height,0),rightHeight=right.reduce((h,c)=>h+c.height,0),height=Math.max(leftHeight,rightHeight);if(!best||height<best.height)best={left,right,height};}
  if((firstCard?firstCard.height:0)<H-180&&best.height<=capacity){layout={titleLines,firstCard,top,best};break}
 }
 if(!layout)throw error('Your One-Glance Blueprint contains more detail than fits legibly on one page. Review and confirm shorter One-Glance summaries, or export the complete Blueprint. Your full answers have not been shortened or removed.',422);
 const page=paintPage(doc,body);let y=H-61;y=drawTextLines(page,layout.titleLines,{x:L,y,font:display,size:30,leading:35,color:BROWN});y-=17;if(layout.firstCard)y=drawCard(page,layout.firstCard,L,y,width,body)-7;
 let leftY=y,rightY=y;for(const card of layout.best.left)leftY=drawCard(page,card,L,leftY,columnWidth,body);for(const card of layout.best.right)rightY=drawCard(page,card,L+columnWidth+gap,rightY,columnWidth,body);
}
function fullBlueprint(doc,sections,body,display){
 let page,y;const width=R-L;
 const newPage=()=>{page=paintPage(doc,body);y=H-63};
 const ensure=height=>{if(y-height<BOTTOM)newPage()};
 const lines=(text,font,size,leading,ink=INK)=>{for(const line of wrapText(text,font,size,width)){ensure(leading);if(line)page.drawText(line,{x:L,y:y-size,font,size,color:ink});y-=leading}};
 newPage();lines('My Personal Style Blueprint',display,36,42,BROWN);y-=23;
 for(const section of sections){
  ensure(102);lines(section.title,display,24,29,BROWN);y-=11;
  for(const entry of section.entries){
   const labelLines=wrapText(labelText(entry),body,9.5,width),textLines=wrapText(entry.value,body,11,width);ensure(labelLines.length*12+Math.min(2,textLines.length)*15.5+12);
   lines(labelText(entry),body,9.5,12,BROWN);y-=5;
   const colours=colourRows(entry);
   if(colours.length){for(const [role,c]of colours){const rowLines=wrapText(colourText(role,c),body,10.5,width-25),rowHeight=Math.max(18,rowLines.length*14.5);ensure(rowHeight+7);if(validHex(c.hex))page.drawRectangle({x:L,y:y-13,width:15,height:15,color:color(c.hex),borderWidth:.5,borderColor:STONE});drawTextLines(page,rowLines,{x:L+25,y,font:body,size:10.5,leading:14.5});y-=rowHeight+7;}}
   else lines(entry.value,body,11,15.5);
   y-=11;
  }
  y-=2;if(y>BOTTOM+12){page.drawLine({start:{x:L,y},end:{x:R,y},color:STONE,thickness:.55});y-=20;}
 }
}
export async function generateBlueprintPDF(answers,fontBytes,{glance=false,bindingState={}}={}){
 const sections=blueprintSections(answers,{glance,bindingState});if(!sections.length)throw error('Record some Blueprint information before exporting.',400);
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 // Cormorant must be embedded whole: subsetting this font drops visible glyphs.
 const body=await doc.embedFont(fontBytes.body,{subset:true}),display=await doc.embedFont(fontBytes.display,{subset:false,features:{liga:false,clig:false}});
 doc.setTitle(glance?'My One-Glance Blueprint':'My Personal Style Blueprint');doc.setAuthor('In Her Fashion');doc.setSubject('A personal reference built from my own discoveries');
 if(glance)oneGlance(doc,sections.flatMap(section=>section.entries),body,display);else fullBlueprint(doc,sections,body,display);
 pageFooters(doc,body);return doc.save();
}
