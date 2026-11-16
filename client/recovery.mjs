// Only pending changes are retained. The encryption secret is returned after account authentication,
// kept in memory, and never stored beside the ciphertext. Different users have different keys.
export class RecoveryVault{
 constructor(storage,descriptor,cryptoImpl=globalThis.crypto){this.storage=storage;this.descriptor=descriptor;this.crypto=cryptoImpl;this.queue=Promise.resolve();this.name='inherfashion.recovery.'+descriptor.name;this.key=null;}
 async getKey(){if(!this.key)this.key=await this.crypto.subtle.importKey('raw',Uint8Array.from(this.descriptor.secret.match(/../g).map(s=>parseInt(s,16))),{name:'AES-GCM'},false,['encrypt','decrypt']);return this.key}
 save(record){const snapshot=record?JSON.stringify(record):null;this.queue=this.queue.catch(()=>{}).then(async()=>{if(snapshot===null){this.storage.removeItem(this.name);return}const iv=this.crypto.getRandomValues(new Uint8Array(12));const encrypted=new Uint8Array(await this.crypto.subtle.encrypt({name:'AES-GCM',iv},await this.getKey(),new TextEncoder().encode(snapshot)));const b64=a=>{let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(s)};this.storage.setItem(this.name,JSON.stringify({v:2,iv:b64(iv),data:b64(encrypted)}));});return this.queue}
 async read(){const raw=this.storage.getItem(this.name);if(!raw)return null;try{const c=JSON.parse(raw),bytes=s=>Uint8Array.from(atob(s),v=>v.charCodeAt(0));if(c.v!==2)throw Error('Unsupported recovery data');const plain=await this.crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(c.iv)},await this.getKey(),bytes(c.data));return JSON.parse(new TextDecoder().decode(plain))}catch{this.storage.removeItem(this.name);return null}}
 clear(){return this.save(null)}
}
