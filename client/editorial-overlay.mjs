// A presentation controller only: persistence and account authorization remain in v4.
const keyFor=element=>{
 if(!element)return null;
 if(element.matches?.('a[href]'))return {href:element.getAttribute('href')};
 const key=Object.fromEntries(['action','field','id','key','index','dictionary','property','evidenceId','kind','page','uploadTitle'].filter(key=>element.dataset?.[key]!==undefined).map(key=>[key,element.dataset[key]]));
 const result=element.closest?.('[data-result-id]');if(result)key.resultId=result.dataset.resultId;
 return key;
};
const focusable=dialog=>[...dialog.querySelectorAll('button,a[href],input,select,textarea,summary,[tabindex="0"]')].filter(node=>{
 const closed=node.closest('details:not([open])');return !node.disabled&&(!closed||closed.querySelector('summary')?.contains(node));
});
export class EditorialOverlay{
 constructor(root,{closed=()=>{},mounted=()=>{}}={}){
  this.root=root;this.closed=closed;this.mounted=mounted;this.current=null;this.stack=[];this.inertNodes=new Set();this.bodyStyle=null;this.returnTo=null;
  this.keydown=event=>{
   const dialog=this.host?.querySelector('[role=dialog]');if(!dialog)return;
   if(event.key==='Escape'){event.preventDefault();this.requestClose?.();return;}
   if(event.key!=='Tab')return;
   const items=focusable(dialog),first=items[0],last=items.at(-1),active=document.activeElement;
   if(!first){event.preventDefault();dialog.focus();return;}
   if(event.shiftKey&&(active===first||active===dialog)){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&(active===last||active===dialog)){event.preventDefault();first.focus();}
  };
  document.addEventListener('keydown',this.keydown);
  root.addEventListener('focusin',event=>{if(event.target.matches?.('[data-id],[data-dictionary]')&&!event.target.closest('#editorial-overlay-root'))this.lastQuestion=event.target;});
 }
 get isOpen(){return !!this.current;}
 get type(){return this.current?.type;}
 capture(){const element=document.activeElement,rect=this.lastQuestion?.isConnected?this.lastQuestion.getBoundingClientRect():null,anchor=rect&&rect.top>=0&&rect.top<(window.innerHeight||800)?this.lastQuestion:null;return {element,key:keyFor(element),x:window.scrollX||0,y:window.scrollY||0,anchor,anchorTop:anchor?.getBoundingClientRect().top,scrollTop:this.host?.querySelector('[role=dialog]')?.scrollTop||0};}
 restore(record){
  const scope=this.current?this.host:this.root;
  let target=record?.element?.isConnected&&scope?.contains(record.element)?record.element:null;
  if(!target&&record?.key){const entries=Object.entries(record.key);target=[...(scope?.querySelectorAll('[data-action],[data-id],a[href]')||[])].find(el=>entries.every(([key,value])=>key==='href'?el.getAttribute('href')===value:key==='resultId'?el.closest('[data-result-id]')?.dataset.resultId===value:el.dataset[key]===value));}
  target?.focus({preventScroll:true});
 }
 open(value){
  if(this.current)this.stack.push({current:this.current,returnTo:this.capture()});else this.returnTo=this.capture();
  this.current=value;this.mount();
 }
 mount({focus=true}={}){
  this.host=this.root.querySelector('#editorial-overlay-root');
  if(!this.host){this.host=document.createElement('div');this.host.id='editorial-overlay-root';this.root.append(this.host);}
  for(const node of this.inertNodes)node.inert=false;this.inertNodes.clear();
  if(!this.current){this.host.innerHTML='';this.unlock();return;}
  const content=this.current.render();
  this.host.innerHTML=this.current.fullDialog?content:`<div class="editorial-overlay-backdrop"><section class="editorial-dialog" role="dialog" aria-modal="true" aria-labelledby="editorial-dialog-title" tabindex="-1"><header class="editorial-dialog-heading"><h2 id="editorial-dialog-title">${this.current.title}</h2><button type="button" data-action="close-editorial-overlay">${this.stack.length?'Back':'Close'}</button></header><div class="editorial-dialog-body">${content}</div></section></div>`;
  const dialog=this.host.querySelector('[role=dialog]');if(!dialog)return;
  this.mounted();
  for(let node=dialog;node&&node!==this.root;node=node.parentElement)for(const sibling of node.parentElement?.children||[])if(sibling!==node){sibling.inert=true;this.inertNodes.add(sibling);}
  if(!this.bodyStyle){this.bodyStyle={position:document.body.style.position,top:document.body.style.top,width:document.body.style.width,overflow:document.body.style.overflow};Object.assign(document.body.style,{position:'fixed',top:`-${this.returnTo?.y||0}px`,width:'100%',overflow:'hidden'});}
  if(focus)(this.current.type==='blueprint'?dialog.querySelector('textarea,input,select')||dialog:dialog).focus({preventScroll:true});
 }
 refresh(){const record=this.capture();this.mount({focus:false});const dialog=this.host.querySelector('[role=dialog]');if(dialog)dialog.scrollTop=record.scrollTop;this.restore(record);}
 close(){
  const previous=this.stack.pop();
  if(previous){this.current=previous.current;this.mount({focus:false});const dialog=this.host.querySelector('[role=dialog]');if(dialog)dialog.scrollTop=previous.returnTo.scrollTop;this.restore(previous.returnTo);return;}
  const record=this.returnTo;this.current=null;this.mount({focus:false});this.returnTo=null;this.closed();
  if(record){window.scrollTo?.(record.x,record.y);this.restore(record);if(record.anchor?.isConnected){const difference=record.anchor.getBoundingClientRect().top-record.anchorTop;if(difference)window.scrollTo?.(record.x,record.y+difference);}}
 }
 closeAll(){this.stack=[];if(this.current)this.close();}
 unlock(){if(this.bodyStyle){Object.assign(document.body.style,this.bodyStyle);this.bodyStyle=null;}}
}
