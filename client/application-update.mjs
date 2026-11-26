import {clientReleaseId} from '../shared/release.mjs';

// Detect a newer release without replacing an active workbook or its drafts.
export class ApplicationUpdate {
 constructor({releaseId=clientReleaseId,fetchImpl=(...args)=>globalThis.fetch(...args),changed=()=>{},reload=()=>globalThis.location.reload()}={}) {
  Object.assign(this,{releaseId,fetchImpl,changed,reload,available:false,latest:null,message:'',checking:null,updating:false});
 }
 async check() {
  if(this.releaseId==='development')return false;
  if(this.checking)return this.checking;
  this.checking=(async()=>{
   try{
    const response=await this.fetchImpl('/api/version',{cache:'no-store'});
    if(!response.ok)return false;
    const version=await response.json();
    if(typeof version.releaseId!=='string'||!version.releaseId)return false;
    this.latest=version;this.available=version.releaseId!==this.releaseId;this.changed();return this.available;
   }catch{return false;}
  })();
  try{return await this.checking;}finally{this.checking=null;}
 }
 async apply({persistRecovery,flush,hasUnsavedWork}) {
  if(!this.available||this.updating)return false;
  this.updating=true;this.message='Saving your workbook before updating…';this.changed();
  try{
   await persistRecovery();
   if(!await flush()){
    this.message='Your entries are still pending. Keep this workbook open and retry saving before updating.';return false;
   }
   if(hasUnsavedWork()){
    this.message='Finish saving your uploads, photo notes and evidence references before updating. Your workbook will stay open.';return false;
   }
   this.reload();return true;
  }catch{
   this.message='Your workbook has stayed open. Save your latest entries before trying the update again.';return false;
  }finally{this.updating=false;this.changed();}
 }
}
