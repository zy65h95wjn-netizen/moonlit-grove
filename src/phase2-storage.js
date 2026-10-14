// Phase 2 data occupies a separate key in the EXISTING Phase 1 IndexedDB store.
// No schema upgrade; the clubhouse's `current` record is never overwritten here.
const DB='moonlit-grove-local-v1', STORE='grove', RECORD='phase2-v1';
export const TYPES=['crochet','recipes','beauty','sports'];
const MAX_RECORDS=40;
const asString=(value,max)=>typeof value==='string' && value.length<=max ? value : null;
const validId=id=>typeof id==='string' && /^[A-Za-z0-9-]{1,80}$/.test(id);
export const freshState=()=>({version:1,records:{crochet:[],recipes:[],beauty:[],sports:[]},magic:{claimed:[],played:[],stars:0}});
export function validatePhase2(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==1||!raw.records||typeof raw.records!=='object'||!raw.magic||typeof raw.magic!=='object')throw Error('Invalid Phase 2 backup');
  const state=freshState(),allIds=new Set();
  for(const type of TYPES){
    const rows=raw.records[type];if(!Array.isArray(rows)||rows.length>MAX_RECORDS)throw Error('Invalid studio collection');
    state.records[type]=rows.map(r=>{
      if(!r||!validId(r.id)||allIds.has(r.id)||(asString(r.title,100)===null)||!r.title.trim()||(asString(r.notes,1000)===null)||typeof r.done!=='boolean'||(asString(r.extra,600)===null)||(asString(r.date,32)===null)||!Number.isSafeInteger(r.count)||r.count<0||r.count>9999||!Number.isSafeInteger(r.goal)||r.goal<0||r.goal>9999||typeof r.color!=='string'||!/^$|^#[0-9A-Fa-f]{6}$/.test(r.color))throw Error('Invalid studio entry');
      allIds.add(r.id);return {id:r.id,title:r.title,notes:r.notes,extra:r.extra,date:r.date,done:r.done,count:r.count,goal:r.goal,color:r.color};
    });
  }
  const {claimed,played,stars}=raw.magic;
  if(!Array.isArray(claimed)||!Array.isArray(played)||claimed.length>120||played.length>240||!Number.isSafeInteger(stars)||stars<0||stars>1000)throw Error('Invalid daily magic');
  const keyPattern=/^\d{4}-\d\d-\d\d(?::(?:trivia|words))?$/;
  if(claimed.some(d=>typeof d!=='string'||!/^\d{4}-\d\d-\d\d$/.test(d))||new Set(claimed).size!==claimed.length||played.some(k=>typeof k!=='string'||!keyPattern.test(k))||new Set(played).size!==played.length)throw Error('Invalid magic history');
  state.magic={claimed:[...claimed],played:[...played],stars};return state;
}
function database(){return new Promise((resolve,reject)=>{
  if(!('indexedDB' in globalThis)){reject(Error('Local storage unavailable'));return;}
  const request=indexedDB.open(DB,1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);};
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||Error('Cannot open local storage'));
  request.onblocked=()=>reject(Error('Local storage blocked'));
});}
export async function readPhase2(){const db=await database();try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(RECORD);
  req.onsuccess=()=>{try{resolve(req.result==null?null:validatePhase2(req.result));}catch(error){reject(error);}};
  req.onerror=()=>reject(req.error||Error('Read failed'));tx.onabort=()=>reject(tx.error||Error('Read cancelled'));
});}finally{db.close();}}
export async function writePhase2(state){const clean=validatePhase2(state),db=await database();try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(clean,RECORD);
  tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||Error('Write failed'));tx.onabort=()=>reject(tx.error||Error('Write cancelled'));
});}finally{db.close();}}
export function makePhase2Backup(state){return JSON.stringify({app:'moonlit-grove-phase2',schema:1,date:new Date().toISOString(),state:validatePhase2(state)},null,2);}
export function loadPhase2Backup(text){if(typeof text!=='string'||text.length>220000)throw Error('Backup too large');const payload=JSON.parse(text);if(payload?.app!=='moonlit-grove-phase2'||payload.schema!==1)throw Error('Not a Moonlit Grove Phase 2 backup');return validatePhase2(payload.state);}
export const maxRecords=MAX_RECORDS;
