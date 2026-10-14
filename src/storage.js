const DB='moonlit-grove-local-v1';
const STORE='grove';
const RECORD='current';
export const MAX_DECOR=12;
export const TYPES=['mushroom','moth','butterflies','shelf','vines'];
const defaultDecor=[
  {id:'starter-moth',type:'moth',x:33,y:31},
  {id:'starter-mushroom',type:'mushroom',x:82,y:82}
];
export function defaultState(){return {version:1,motion:true,decor:defaultDecor.map(x=>({...x}))};}
export function validateState(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==1||typeof raw.motion!=='boolean'||!Array.isArray(raw.decor)||raw.decor.length>MAX_DECOR)throw new Error('Invalid Moonlit Grove backup');
  const ids=new Set();const decor=raw.decor.map(item=>{
    if(!item||typeof item!=='object'||typeof item.id!=='string'||!/^[-a-zA-Z0-9]{1,64}$/.test(item.id)||ids.has(item.id)||!TYPES.includes(item.type)||!Number.isFinite(item.x)||!Number.isFinite(item.y)||item.x<3||item.x>97||item.y<6||item.y>94)throw new Error('Invalid decoration data');
    ids.add(item.id);return {id:item.id,type:item.type,x:item.x,y:item.y};
  });
  return {version:1,motion:raw.motion,decor};
}
function open(){return new Promise((resolve,reject)=>{
  if(!('indexedDB'in window)){reject(new Error('IndexedDB unavailable'));return;}
  let request;try{request=indexedDB.open(DB,1);}catch(err){reject(err);return;}
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||new Error('Cannot open device storage'));
  request.onblocked=()=>reject(new Error('Device storage is blocked'));
});}
export async function readState(){const db=await open();try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get(RECORD);
  req.onsuccess=()=>resolve(req.result===undefined?null:validateState(req.result));req.onerror=()=>reject(req.error||new Error('Read failed'));tx.onabort=()=>reject(tx.error||new Error('Read cancelled'));
});}finally{db.close();}}
export async function writeState(state){const safe=validateState(state);const db=await open();try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(safe,RECORD);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('Save failed'));tx.onabort=()=>reject(tx.error||new Error('Save cancelled'));
});}finally{db.close();}}
export function createBackup(state){return JSON.stringify({app:'moonlit-grove',schemaVersion:1,exportedAt:new Date().toISOString(),state:validateState(state)},null,2);}
export function parseBackup(content){if(content.length>50000)throw new Error('Backup is too large');const payload=JSON.parse(content);if(payload?.app!=='moonlit-grove'||payload.schemaVersion!==1)throw new Error('Not a Moonlit Grove v1 backup');return validateState(payload.state);}
