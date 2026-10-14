import {CATALOG,decorMarkup} from './decor.js';
import {readState,writeState,defaultState,createBackup,parseBackup,MAX_DECOR} from './storage.js';
const $=(id)=>document.getElementById(id);
const scene=$('scene'),layer=$('decor-layer'),saveEl=$('save-state');
let state=defaultState(),selectedId=null,placingType=null,saveQueue=Promise.resolve(),saveRevision=0;
let storageHealthy=false,storageProblem=false,lastFocus=null,toastTimer;
const getName=(type)=>CATALOG.find(x=>x.id===type)?.title??type;
const setStatus=(text,error=false)=>{saveEl.textContent=text;saveEl.classList.toggle('error',error);};
function toast(msg){const el=$('toast');el.textContent=msg;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.hidden=true;},3900);}
function queueSave(){
  const snapshot=structuredClone(state);const revision=++saveRevision;
  if(!storageHealthy){setStatus('Not saved · Device storage unavailable',true);return Promise.resolve(false);}
  setStatus('Saving to this device…');
  const run=saveQueue.catch(()=>{}).then(()=>writeState(snapshot));saveQueue=run;
  return run.then(()=>{if(revision===saveRevision)setStatus('Saved to this device ✓');return true;}).catch(()=>{
    storageProblem=true;storageHealthy=false;setStatus('Not saved · Device storage unavailable',true);toast('Device storage failed. Export a backup if possible.');return false;
  });
}
function updateMotion(){document.documentElement.classList.toggle('motion-off',!state.motion);$('motion-toggle').checked=state.motion;}
function render(){
  layer.replaceChildren();
  for(const item of state.decor){
    const btn=document.createElement('button');btn.type='button';btn.className='decor-object';
    btn.classList.toggle('selected',item.id===selectedId);
    btn.style.left=`${item.x}%`;btn.style.top=`${item.y}%`;
    btn.setAttribute('aria-label',`${getName(item.type)}. Tap to select, or drag to move.`);
    btn.setAttribute('aria-pressed',String(item.id===selectedId));
    btn.innerHTML=decorMarkup(item.type); // SVG generated only from fixed trusted catalog.
    let pointerStart=null,dragged=false;
    btn.addEventListener('pointerdown',(ev)=>{
      if(ev.button!==0)return;ev.stopPropagation();
      pointerStart={x:ev.clientX,y:ev.clientY};dragged=false;btn.setPointerCapture(ev.pointerId);
    });
    btn.addEventListener('pointermove',(ev)=>{
      if(!pointerStart)return;
      if(Math.hypot(ev.clientX-pointerStart.x,ev.clientY-pointerStart.y)>5)dragged=true;
      if(!dragged)return;
      const rect=scene.getBoundingClientRect();item.x=clamp(((ev.clientX-rect.left)/rect.width)*100,3,97);item.y=clamp(((ev.clientY-rect.top)/rect.height)*100,6,94);
      btn.style.left=`${item.x}%`;btn.style.top=`${item.y}%`;
    });
    btn.addEventListener('pointerup',(ev)=>{
      if(!pointerStart)return;pointerStart=null;
      if(dragged){selectedId=item.id;placingType=null;render();queueSave();openSheet('decor');}
      else{selectItem(item.id);openSheet('decor');}
      ev.stopPropagation();
    });
    btn.addEventListener('pointercancel',()=>{pointerStart=null;render();});
    btn.addEventListener('click',(ev)=>{ev.stopPropagation();});
    layer.append(btn);
  }
  $('editor').hidden=!selectedId;
  if(selectedId){const chosen=state.decor.find(x=>x.id===selectedId);if(chosen)$('selected-label').textContent=getName(chosen.type);}
  document.querySelectorAll('.decor-option').forEach(btn=>{btn.classList.toggle('active',btn.dataset.type===placingType);btn.setAttribute('aria-pressed',String(btn.dataset.type===placingType));});
  scene.classList.toggle('is-placing',Boolean(placingType));$('placement-hint').hidden=!placingType;
}
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function selectItem(id){selectedId=id;placingType=null;render();}
function addDecoration(type,x,y){
  if(state.decor.length>=MAX_DECOR){toast('Your grove is full for now (12 decorations).');return;}
  const id=globalThis.crypto?.randomUUID?.()??`decor-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  const item={id,type,x:clamp(x,3,97),y:clamp(y,6,94)};
  // Trim randomUUID to conform to backup id validator (UUID is already allowed).
  state.decor.push(item);selectedId=item.id;placingType=null;render();queueSave();toast(`${getName(type)} added to your grove`);
}
scene.addEventListener('pointerup',ev=>{
  if(!placingType||ev.target.closest('.decor-object'))return;
  const rect=scene.getBoundingClientRect();addDecoration(placingType,(ev.clientX-rect.left)*100/rect.width,(ev.clientY-rect.top)*100/rect.height);
  closeSheet();
});
scene.addEventListener('keydown',ev=>{
  if(!placingType||(ev.key!=='Enter'&&ev.key!==' '))return;
  ev.preventDefault();addDecoration(placingType,50,50);closeSheet();
});
const scrim=$('scrim');
function openSheet(name){
  const target=$(name==='decor'?'decor-sheet':'settings-sheet');
  lastFocus=document.activeElement;document.querySelectorAll('.sheet').forEach(s=>s.hidden=true);
  target.hidden=false;scrim.hidden=false;document.body.style.overflow='hidden';
  if(name==='decor'){render();}else{updateMotion();}
  target.querySelector('[data-close]').focus();
}
function closeSheet(restoreFocus=true){
  document.querySelectorAll('.sheet').forEach(s=>s.hidden=true);scrim.hidden=true;document.body.style.overflow='';
  if(restoreFocus && lastFocus instanceof HTMLElement && lastFocus.isConnected)lastFocus.focus();
}
for(const id of ['decorate-intro','nav-decorate'])$(id).addEventListener('click',()=>openSheet('decor'));
for(const id of ['settings-top','nav-settings'])$(id).addEventListener('click',()=>openSheet('settings'));
$('nav-home').addEventListener('click',()=>{closeSheet();window.scrollTo({top:0,behavior:state.motion?'smooth':'instant'});});
scrim.addEventListener('click',closeSheet);document.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',closeSheet));
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!scrim.hidden)closeSheet();});
const opts=$('decor-options');for(const type of CATALOG){const btn=document.createElement('button');btn.type='button';btn.className='decor-option';btn.dataset.type=type.id;btn.setAttribute('aria-label',`Place ${type.title}`);btn.innerHTML=`${decorMarkup(type.id)}<span>${type.short}</span>`;btn.addEventListener('click',()=>{if(state.decor.length>=MAX_DECOR){toast('Your grove is full for now (12 decorations).');return;}placingType=type.id;selectedId=null;render();closeSheet(false);scene.focus();toast(`Now tap the grove to place ${type.title.toLowerCase()}.`);});opts.append(btn);}
$('remove-decor').addEventListener('click',()=>{
  if(!selectedId)return;state.decor=state.decor.filter(x=>x.id!==selectedId);selectedId=null;render();queueSave();toast('Decoration removed');
});
for(const [dir,dx,dy] of [['left',-2,0],['right',2,0],['up',0,-2],['down',0,2]]){
  $(`nudge-${dir}`).addEventListener('click',()=>{
    const item=state.decor.find(x=>x.id===selectedId);if(!item)return;
    item.x=clamp(item.x+dx,3,97);item.y=clamp(item.y+dy,6,94);render();queueSave();
  });
}
$('motion-toggle').addEventListener('change',ev=>{state.motion=ev.target.checked;updateMotion();queueSave();});
$('export-backup').addEventListener('click',async()=>{
  await saveQueue.catch(()=>{});
  const file=new Blob([createBackup(state)],{type:'application/json'});const url=URL.createObjectURL(file);
  const a=document.createElement('a');a.href=url;a.download='moonlit-grove-backup.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  toast('Backup file prepared. Keep it somewhere safe.');
});
$('import-backup').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async ev=>{
  const file=ev.target.files?.[0];ev.target.value='';if(!file)return;
  try{
    if(file.size>50000)throw new Error('Backup exceeds the size limit');
    const imported=parseBackup(await file.text());
    // Import is atomic: preserve previous arrangement if the write fails.
    if(!storageHealthy)throw new Error('Cannot restore while device storage is unavailable');
    await saveQueue.catch(()=>{});await writeState(imported);
    ++saveRevision;state=imported;selectedId=null;placingType=null;updateMotion();render();setStatus('Saved to this device ✓');toast('Your grove has been restored.');closeSheet();
  }catch(error){toast(`Import failed: ${error?.message||'File is not valid'}`);}
});
$('reset').addEventListener('click',()=>{$('confirm-dialog').showModal();});
$('confirm-dialog').addEventListener('close',async ev=>{
  if(ev.currentTarget.returnValue!=='reset')return;
  // Preserve current state if saving the reset fails.
  if(!storageHealthy){toast('Reset unavailable while storage is blocked.');return;}
  const replacement=defaultState();
  try{await saveQueue.catch(()=>{});await writeState(replacement);++saveRevision;state=replacement;selectedId=null;placingType=null;updateMotion();render();setStatus('Saved to this device ✓');toast('Your grove has a fresh start.');closeSheet();}
  catch{storageHealthy=false;storageProblem=true;setStatus('Not saved · Device storage unavailable',true);toast('Unable to reset saved state.');}
});
async function boot(){
  try{
    const saved=await readState();state=saved??defaultState();storageHealthy=true;
    if(!saved){setStatus('Saving first visit…');await queueSave();}
    else setStatus('Saved to this device ✓');
  }catch(error){
    storageProblem=true;state=defaultState();
    if(/Invalid Moonlit Grove backup|Invalid decoration data/.test(error?.message||'')){
      // Database is writable but contains a damaged record: allow explicit recovery.
      storageHealthy=true;setStatus('Saved data invalid · Import or reset',true);
      toast('Saved data could not be read. Import a backup or reset your grove.');
    }else{
      storageHealthy=false;setStatus('Not saved · Device storage unavailable',true);
      toast('Local storage is unavailable. Your changes will not survive closing this app.');
    }
  }
  updateMotion();render();
  if('serviceWorker'in navigator && (location.protocol==='https:'||['localhost','127.0.0.1'].includes(location.hostname))){
    navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});
  }
}
boot();