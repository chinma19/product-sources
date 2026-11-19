import {resolveValue,formatValue} from '../server/model.mjs';
export const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
export function exportPrint(pages,answers,mode='master',bindingState={}){
 const target=document.getElementById('print-content');
 const chosen=mode==='glance'?pages.filter(p=>p.page===68):pages.filter(p=>[59,60,61,62,63,64,65,66,67,68].includes(p.page));
 target.innerHTML='<header><small>IN HER FASHION</small><h1>My Personal Style Blueprint</h1><p>My discoveries. My decisions. My own direction.</p></header>'+chosen.map(p=>'<section class="print-section"><h2>'+escapeHTML(p.title)+'</h2>'+p.controls.filter(c=>!c.id.endsWith('.reflection')).map(c=>'<div class="print-answer"><h3>'+escapeHTML(c.label)+'</h3><p>'+escapeHTML(formatValue(resolveValue(c.id,answers,new Set(),bindingState))||'Not recorded yet.').replace(/\n/g,'<br>')+'</p></div>').join('')+'</section>').join('');
 window.print();
}
export async function exportGlance(page,answers,bindingState={}){
 await document.fonts.ready;
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.width=1170;
 const wrap=(s,max,font)=>{ctx.font=font;const out=[];for(const para of s.split('\n')){let line='';for(const word of para.split(/\s+/)){if(ctx.measureText(word).width>max){if(line){out.push(line);line=''}let piece='';for(const ch of word){if(ctx.measureText(piece+ch).width>max){out.push(piece);piece=''}piece+=ch}line=piece}else if(ctx.measureText(line+' '+word).width>max&&line){out.push(line);line=word}else line=(line+' '+word).trim()}out.push(line)}return out};
 const fields=page.controls.filter(c=>!c.id.endsWith('.reflection')).map(c=>({label:c.label,value:wrap(formatValue(resolveValue(c.id,answers,new Set(),bindingState))||'Not recorded yet',1010,'28px BlueprintBody')}));
 const height=380+fields.reduce((h,f)=>h+95+f.value.length*39,0);if(height>30000)throw new Error('Your one-glance reference is too long for one image. Shorten its summaries or use Print / Save PDF.');canvas.height=height;
 ctx.fillStyle='#F8F5EF';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#4A3B32';ctx.font='20px BlueprintBody';ctx.fillText('IN HER FASHION  /  MY ONE-GLANCE BLUEPRINT',80,90);ctx.font='70px BlueprintDisplay';ctx.fillText('A style that feels like me.',80,190);
 let y=280;for(const f of fields){ctx.font='20px BlueprintBody';ctx.fillStyle='#75665B';ctx.fillText(f.label.replace(/:$/,''),80,y);y+=48;ctx.font='28px BlueprintBody';ctx.fillStyle='#4A3B32';for(const line of f.value){ctx.fillText(line,80,y);y+=39}ctx.strokeStyle='#D8D0C6';ctx.beginPath();ctx.moveTo(80,y+12);ctx.lineTo(1090,y+12);ctx.stroke();y+=47}
 const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));if(!blob)throw new Error('Image export was unavailable. Please try Print / Save PDF.');downloadBlob(blob,'My-One-Glance-Blueprint.png');
}
