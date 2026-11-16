import {resolveValue,validatePatch} from '../server/model.mjs';
import {RecoveryVault} from './recovery.mjs';
export class ProgressStore{
 constructor(onStatus){this.state={answers:{},completed:[],lastStep:1,revision:0};this.pending={answers:{}};this.onStatus=onStatus;this.status='loading';this.error='';this.saving=null;this.conflict=null;this.inFlight=null;this.vault=null;this.recovered=false;this.recoveryAvailable=false}
 updateStatus(status,message=''){this.status=status;this.error=message;this.onStatus?.(this)}
 async hydrate(state,descriptor,storage=globalThis.localStorage){this.state=state;if(descriptor&&storage){try{this.vault=new RecoveryVault(storage,descriptor);const record=await this.vault.read();this.recoveryAvailable=true;if(record){validatePatch({...record.patch,baseRevision:record.baseRevision});this.pending=record.patch;this.recovered=true;if(record.baseRevision!==state.revision)this.conflict=structuredClone(state);this.state={...state,...(record.patch.completed?{completed:record.patch.completed}:{}),...(record.patch.lastStep?{lastStep:record.patch.lastStep}:{}),answers:{...state.answers,...record.patch.answers}};this.updateStatus(this.conflict?'error':'unsaved',this.conflict?'Recovered local edits differ from newer saved answers. Choose which to keep.':'Recovered unsaved entries from this browser. Save them when ready.')}}catch{this.recoveryAvailable=false;this.vault=null;this.pending={answers:{}}}}
 }
 get(id){return resolveValue(id,this.state.answers)}
 recoveryRecord(){const merged={...(this.inFlight||{}),...this.pending,answers:{...(this.inFlight?.answers||{}),...this.pending.answers}};return Object.keys(merged.answers).length||merged.lastStep!==undefined||merged.completed!==undefined?{v:2,baseRevision:this.state.revision,patch:merged}:null}
 async persistRecovery(){if(!this.vault)return;try{await this.vault.save(this.recoveryRecord());this.recoveryAvailable=true}catch{this.recoveryAvailable=false}}
 change(id,value){this.state.answers[id]=value;this.pending.answers[id]=value;this.schedule()}
 meta(values){Object.assign(this.state,values);Object.assign(this.pending,values);this.schedule()}
 schedule(){this.updateStatus(this.conflict?'error':'unsaved',this.conflict?'Recovered or local edits differ from the server. Choose which to keep.':'');this.persistRecovery();clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush(),650)}
 hasPending(){return Object.keys(this.pending.answers).length>0||this.pending.lastStep!==undefined||this.pending.completed!==undefined}
 async flush(){clearTimeout(this.timer);if(this.saving)return this.saving;if(this.conflict)return false;
 this.saving=(async()=>{while(this.hasPending()){
  const patch=this.pending;this.pending={answers:{}};this.inFlight=patch;await this.persistRecovery();this.updateStatus('saving');
  try{const res=await fetch('/api/progress',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...patch,baseRevision:this.state.revision})});const data=await res.json();if(res.status===409){this.conflict=data.current;throw new Error(data.error)}if(!res.ok)throw new Error(data.error||'Could not save your changes.');for(const k of ['revision','updatedAt','assessmentId','status','createdAt','completedAt','answerUpdatedAt'])if(data[k]!==undefined)this.state[k]=data[k];this.inFlight=null;await this.persistRecovery();
  }catch(e){this.pending={...patch,...this.pending,answers:{...patch.answers,...this.pending.answers}};this.inFlight=null;await this.persistRecovery();this.updateStatus('error',(e.message||'Connection lost.')+(this.recoveryAvailable?' Your latest edits have an encrypted recovery copy in this browser.':' Keep this tab open and retry; local recovery is unavailable.'));return false}
 }this.recovered=false;this.updateStatus('saved');return true})();try{return await this.saving}finally{this.saving=null}}
 async useRemote(){if(!this.conflict)return;this.state=this.conflict;this.pending={answers:{}};this.conflict=null;this.recovered=false;await this.persistRecovery();this.updateStatus('saved')}
 async keepMine(){if(!this.conflict)return;const remote=this.conflict,local=this.pending;this.state={...remote,answers:{...remote.answers,...local.answers},...(local.lastStep?{lastStep:local.lastStep}:{}),...(local.completed?{completed:[...new Set([...remote.completed,...local.completed])]}:{})};this.pending={...local,completed:this.state.completed};this.conflict=null;return this.flush()}
 async clearRecovery(){await this.vault?.clear()}
}
