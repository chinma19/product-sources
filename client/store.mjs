import {formatValue,resolveValue} from '../server/model.mjs';
export class ProgressStore{
 constructor(onStatus){this.state={answers:{},completed:[],lastStep:1,revision:0};this.pending={answers:{}};this.onStatus=onStatus;this.status='loading';this.error='';this.saving=null;this.conflict=null}
 updateStatus(status,message=''){this.status=status;this.error=message;this.onStatus?.(this)}
 hydrate(state){this.state=state}
 get(id){return resolveValue(id,this.state.answers)}
 change(id,value){this.state.answers[id]=value;this.pending.answers[id]=value;this.schedule()}
 meta(values){Object.assign(this.state,values);Object.assign(this.pending,values);this.schedule()}
 schedule(){this.updateStatus('unsaved');clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush(),650)}
 hasPending(){return Object.keys(this.pending.answers).length>0||this.pending.lastStep!==undefined||this.pending.completed!==undefined}
 async flush(){
 clearTimeout(this.timer);if(this.saving)return this.saving;if(this.conflict)return false;
 this.saving=(async()=>{while(this.hasPending()){
  const patch=this.pending;this.pending={answers:{}};this.updateStatus('saving');
  try{
   const res=await fetch('/api/progress',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...patch,baseRevision:this.state.revision})});const data=await res.json();
   if(res.status===409){this.conflict=data.current;throw new Error(data.error)}
   if(!res.ok)throw new Error(data.error||'Could not save your changes.');
   this.state.revision=data.revision;this.state.updatedAt=data.updatedAt;
  }catch(e){this.pending={...patch,...this.pending,answers:{...patch.answers,...this.pending.answers}};this.updateStatus('error',e.message||'Connection lost. Your latest edits are still in this tab. Retry before closing.');return false}
 }
 this.updateStatus('saved');return true})();
 try{return await this.saving}finally{this.saving=null}
 }
 useRemote(){if(!this.conflict)return;this.state=this.conflict;this.pending={answers:{}};this.conflict=null;this.updateStatus('saved')}
 async keepMine(){if(!this.conflict)return;const remote=this.conflict,local=this.pending;this.state={...remote,answers:{...remote.answers,...local.answers},...(local.lastStep?{lastStep:local.lastStep}:{}),...(local.completed?{completed:[...new Set([...remote.completed,...local.completed])]}:{})};this.pending={...local,completed:this.state.completed};this.conflict=null;return this.flush()}
}
