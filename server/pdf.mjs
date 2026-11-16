import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {blueprintSections} from './blueprint.mjs';
const color=hex=>rgb(...hex.replace('#','').match(/../g).map(x=>parseInt(x,16)/255));
const BROWN=color('#4A3B32'),INK=color('#514D49'),STONE=color('#D8D0C6'),IVORY=color('#F8F5EF');
export async function generateBlueprintPDF(answers,fontBytes,{glance=false}={}){
 const sections=blueprintSections(answers,{glance});if(!sections.length){const e=Error('Record some Blueprint information before exporting.');e.status=400;throw e}
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const body=await doc.embedFont(fontBytes.body,{subset:true}),display=await doc.embedFont(fontBytes.display,{subset:false});
 doc.setTitle(glance?'My One-Glance Blueprint':'My Personal Style Blueprint');doc.setAuthor('In Her Fashion');doc.setSubject('A personal reference built from my own discoveries');
 let page,y;const W=612,H=792,L=48,R=564,BOTTOM=66;const bodySize=glance?10.5:11,leading=glance?14:16;
 const wrap=(text,font,size,width)=>{const lines=[];for(const para of String(text).replace(/\r/g,'').split('\n')){let line='';for(const word of para.split(/\s+/)){if(!word)continue;if(font.widthOfTextAtSize(word,size)>width){if(line){lines.push(line);line=''}let piece='';for(const ch of word){if(font.widthOfTextAtSize(piece+ch,size)>width){lines.push(piece);piece=''}piece+=ch}line=piece}else if(line&&font.widthOfTextAtSize(line+' '+word,size)>width){lines.push(line);line=word}else line=(line+' '+word).trim()}if(line)lines.push(line)}return lines};
 const newPage=()=>{if(glance&&doc.getPageCount()){const e=Error('Your one-glance summaries need to be shorter to fit one page. Edit those summaries or export the complete Blueprint.');e.status=422;throw e}page=doc.addPage([W,H]);page.drawRectangle({x:0,y:0,width:W,height:H,color:IVORY});page.drawText('IN HER FASHION  /  PERSONAL STYLE BLUEPRINT',{x:L,y:H-34,font:body,size:8,color:BROWN});y=H-67};
 const ensure=h=>{if(y-h<BOTTOM)newPage()};
 const drawLines=(lines,font,size,lineHeight,col=INK)=>{for(const line of lines){ensure(lineHeight);page.drawText(line,{x:L,y:y-size,font,size,color:col});y-=lineHeight}};
 newPage();drawLines(wrap(glance?'My One-Glance Blueprint':'My Personal Style Blueprint',display,glance?29:38,R-L),display,glance?29:38,glance?34:43,BROWN);y-=glance?12:25;
 for(const sec of sections){
  if(!glance){ensure(120);drawLines(wrap(sec.title,display,25,R-L),display,25,30,BROWN);y-=12;}
  for(const entry of sec.entries){
   const label=wrap(entry.label.replace(/…|_{2,}/g,'').replace(/:$/,''),body,9.5,R-L);
   const lines=wrap(entry.value,body,bodySize,R-L);
   ensure(label.length*12+Math.min(lines.length,2)*leading+15);
   drawLines(label,body,9.5,12,BROWN);y-=5;
   if(!entry.colours)drawLines(lines,body,bodySize,leading);y-=glance?9:16;
   if(entry.colours){for(const [role,c]of Object.entries(entry.colours)){if(!c.hex)continue;ensure(22);page.drawRectangle({x:L,y:y-13,width:15,height:15,color:color(c.hex),borderWidth:.5,borderColor:STONE});page.drawText(`${role}: ${c.name||''}${c.hex?' ('+c.hex.toUpperCase()+')':''}`,{x:L+24,y:y-10,font:body,size:9.5,color:INK});y-=22;}y-=8;}
  }
  if(!glance){y-=8;if(y>BOTTOM){page.drawLine({start:{x:L,y},end:{x:R,y},color:STONE,thickness:.6});y-=24;}}
 }
 const count=doc.getPageCount();doc.getPages().forEach((p,i)=>{p.drawLine({start:{x:L,y:49},end:{x:R,y:49},color:STONE,thickness:.5});p.drawText(`${String(i+1).padStart(2,'0')} / ${String(count).padStart(2,'0')}`,{x:R-40,y:33,font:body,size:8,color:BROWN});});
 return doc.save();
}
