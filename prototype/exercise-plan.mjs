// Layout metadata only. The manuscript and original control labels stay authoritative.
// Only step 12 is an active discovery editor in this isolated preview.
export function exercisePlan(page){
 if(page.page===12)return [
  {id:'choose',label:'YESes',guidance:[page.lines[1]],controlIds:['p12.choices1']},
  {id:'reflect',label:'MAYBES + NOs',guidance:['Now look at your MAYBES.'],before:{'silhouette.notes.2':['And your NOs.']},controlIds:['silhouette.notes.1','silhouette.notes.2']},
  {id:'lookfor',label:'LOOK FOR',guidance:[],controlIds:['p12.choices2']},
  {id:'record',label:'RECORD',guidance:[],controlIds:['silhouette.notes.3','silhouette.notes.4','silhouette.notes.5']}
 ];
 if(page.page===8)return [
  {id:'look',label:'LOOK',guidance:page.lines.slice(5,7),controlIds:[]},
  {id:'choose',label:'CHOOSE',guidance:[],controlIds:['fit.ratings']},
  {id:'reflect',label:'REFLECT',guidance:page.lines.slice(page.lines.indexOf('REFLECT')+1,page.lines.indexOf('RECORD')),controlIds:[]},
  {id:'record',label:'RECORD',guidance:[],controlIds:['fit.notes.1','fit.notes.2','fit.notes.3']}
 ];
 // Unrepresented exercises stay one source-content block until individually designed.
 // Do not infer a mandatory four-stage sequence from the workbook's global method.
 return [{id:'content',label:page.title,guidance:page.lines,controlIds:page.controls.filter(c=>!c.internal).map(c=>c.id)}];
}
