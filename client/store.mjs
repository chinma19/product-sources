import {resolveValue,validatePatch,applyPatch,migrateState,sourceSnapshot,controls,selectionRestorePatch} from '../server/model.mjs';
import {RecoveryVault} from './recovery.mjs';
import {selectionProtocol} from '../shared/release.mjs';
const operations=['linkFields','resetCells','confirmFields','reviewFields'];
function mergePatch(a,b){
 const next={...a,...b,answers:{...a.answers,...b.answers}};
 for(const key of Object.keys(b.answers||{})){const value=b.answers[key];if(value&&typeof value==='object'&&!Array.isArray(value)&&a.answers?.[key]&&typeof a.answers[key]==='object'&&!Array.isArray(a.answers[key]))next.answers[key]={...a.answers[key],...value};}
 for(const key of ['linkFields','reviewFields'])if(a[key]||b[key])next[key]=[...new Set([...(a[key]||[]).filter(id=>(!Object.hasOwn(b.answers||{},id)||(key==='reviewFields'&&controls.get(id)?.type==='table'))),...(b[key]||[])])];
 if(a.resetCells||b.resetCells){next.resetCells=Object.fromEntries(Object.entries(a.resetCells||{}).map(([id,cells])=>[id,cells.filter(cell=>!Object.hasOwn(b.answers?.[id]||{},cell))]));for(const [id,cells]of Object.entries(b.resetCells||{}))next.resetCells[id]=[...new Set([...(next.resetCells[id]||[]),...cells])];}
 for(const id of a.linkFields||[]){const c=controls.get(id);if(c?.type==='table'&&b.answers?.[id]&&!b.reviewFields?.includes(id)){next.resetCells??={};const untouched=c.rows.flatMap(row=>c.columns.map(col=>row+'::'+col)).filter(cell=>!Object.hasOwn(b.answers[id],cell));next.resetCells[id]=[...new Set([...(next.resetCells[id]||[]),...untouched])];}}
 if(a.confirmFields||b.confirmFields)next.confirmFields=[...new Map([...(a.confirmFields||[]),...(b.confirmFields||[])].map(x=>[x.id,x])).values()];
 if(a.restoreBindings||b.restoreBindings){next.restoreBindings=structuredClone(a.restoreBindings||{});for(const [id,value]of Object.entries(b.answers||{})){const meta=next.restoreBindings[id];if(!meta)continue;meta.mode='override';if(controls.get(id)?.type==='table'){meta.cells??={};for(const cell of Object.keys(value))meta.cells[cell]='override';}}Object.assign(next.restoreBindings,b.restoreBindings||{});}
 if(a.restoreSelectionConflicts||b.restoreSelectionConflicts){const restored=[...new Set([...(a.restoreSelectionConflicts||[]).filter(id=>!Object.hasOwn(b.answers||{},id)),...(b.restoreSelectionConflicts||[])])];if(restored.length)next.restoreSelectionConflicts=restored;else delete next.restoreSelectionConflicts;}
 return next;
}
export class ProgressStore{
 constructor(onStatus){this.state=migrateState({answers:{},completed:[],lastStep:1,revision:0,schemaVersion:3});this.pending={answers:{}};this.onStatus=onStatus;this.status='loading';this.error='';this.saving=null;this.conflict=null;this.inFlight=null;this.vault=null;this.recovered=false;this.recoveryAvailable=false;this.recoveryBaseRevision=null;this.recoveryWarning='';this.recoveryProtected=false}
 updateStatus(status,message=''){this.status=status;this.error=message;this.onStatus?.(this)}
 async hydrate(state,descriptor,storage){const previousState=this.state;this.state=migrateState(state);this.recoveryWarning='';this.recoveryProtected=false;if(descriptor){try{const recoveryStorage=storage===undefined?globalThis.localStorage:storage;if(!recoveryStorage)return;this.vault=new RecoveryVault(recoveryStorage,descriptor);const record=await this.vault.read();this.recoveryAvailable=true;if(record){const patch=mergePatch(selectionRestorePatch(record.patch),this.pending);validatePatch({...patch,baseRevision:record.baseRevision});const recoveredState=applyPatch(this.state,{...patch,baseRevision:this.state.revision});this.pending=patch;this.recovered=true;if(record.baseRevision!==state.revision){this.conflict=structuredClone(this.state);this.recoveryBaseRevision=record.baseRevision;}this.state=recoveredState;await this.persistRecovery();this.updateStatus(this.conflict?'error':'unsaved',this.conflict?'Recovered local edits differ from newer saved answers. Choose which to keep.':'Recovered unsaved entries from this browser. Save them when ready.')}}catch{this.recoveryAvailable=false;this.recoveryProtected=true;this.recoveryWarning='Local recovery could not be opened safely. Any stored recovery copy has been kept unchanged. Keep this tab open while saving your current entries.';if(this.vault)this.vault.writeProtected=true;this.vault=null;if(this.hasPending()){try{this.state=applyPatch(this.state,{...this.pending,baseRevision:this.state.revision})}catch{this.state=previousState}}}}
 }
 get(id){return resolveValue(id,this.state.answers,new Set(),this.state.bindingState)}
 recoveryRecord(){const patch=mergePatch(this.inFlight||{},this.pending);return this.hasPatch(patch)?{v:3,baseRevision:this.recoveryBaseRevision??this.state.revision,patch}:null}
 async persistRecovery(){if(!this.vault)return;try{await this.vault.save(this.recoveryRecord());this.recoveryAvailable=true}catch{this.recoveryAvailable=false}}
 stage(patch){this.state=applyPatch(this.state,{...patch,baseRevision:this.state.revision});this.pending=mergePatch(this.pending,patch);this.schedule()}
 change(id,value){this.stage({answers:{[id]:value}})}
 changeCell(id,key,value){this.change(id,{[key]:value})}
 link(id){this.stage({linkFields:[id]})}
 linkCell(id,key){this.stage({resetCells:{[id]:[key]}})}
 confirm(id,sourceIds){this.stage({confirmFields:[{id,sourceIds,sourceSnapshot:sourceSnapshot(sourceIds,this.state.answers,this.state.bindingState),confirmedAt:new Date().toISOString()}]})}
 review(id){this.stage({reviewFields:[id]})}
 meta(values){this.stage(values)}
 schedule(){this.updateStatus(this.conflict?'error':'unsaved',this.conflict?'Recovered or local edits differ from the server. Choose which to keep.':'');this.persistRecovery();clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush(),650)}
 hasPatch(patch){return Object.keys(patch.answers||{}).length>0||patch.lastStep!==undefined||patch.completed!==undefined||operations.some(k=>Array.isArray(patch[k])?patch[k].length:patch[k]&&Object.values(patch[k]).some(v=>v.length))}
 hasPending(){return this.hasPatch(this.pending)}
 async flush(){clearTimeout(this.timer);if(this.saving)return this.saving;if(this.conflict)return false;
 this.saving=(async()=>{while(this.hasPending()){
  const patch=this.pending;this.pending={answers:{}};this.inFlight=patch;await this.persistRecovery();this.updateStatus('saving');
  try{const res=await fetch('/api/progress',{method:'PATCH',headers:{'Content-Type':'application/json','X-IHF-Selection-Protocol':String(selectionProtocol)},body:JSON.stringify({...patch,baseRevision:this.state.revision})});const data=await res.json();if(res.status===409){this.conflict=data.current;throw new Error(data.error)}if(!res.ok)throw new Error(data.error||'Could not save your changes.');const saved=migrateState(data);this.state=this.hasPending()?applyPatch(saved,{...this.pending,baseRevision:saved.revision}):saved;this.inFlight=null;await this.persistRecovery();
  }catch(err){this.pending=mergePatch(patch,this.pending);this.inFlight=null;await this.persistRecovery();this.updateStatus('error',(err.message||'Connection lost.')+(this.recoveryAvailable?' Your latest edits have an encrypted recovery copy in this browser.':' Keep this tab open and retry; local recovery is unavailable.'));return false}
 }this.recovered=false;this.updateStatus('saved');return true})();try{return await this.saving}finally{this.saving=null}}
 async useRemote(){if(!this.conflict)return;this.state=migrateState(this.conflict);this.pending={answers:{}};this.conflict=null;this.recovered=false;this.recoveryBaseRevision=null;await this.persistRecovery();this.updateStatus('saved')}
 async keepMine(){if(!this.conflict)return;const remote=migrateState(this.conflict),local=this.pending;const patch={...local,...(local.completed?{completed:[...new Set([...remote.completed,...local.completed])]}:{})};this.state=applyPatch(remote,{...patch,baseRevision:remote.revision});this.pending=patch;this.conflict=null;this.recoveryBaseRevision=null;return this.flush()}
 async clearRecovery(){await this.vault?.clear()}
}
