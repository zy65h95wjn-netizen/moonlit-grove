import {freshState,readPhase2,writePhase2,makePhase2Backup,loadPhase2Backup,maxRecords} from './phase2-storage.js';
const $=id=>document.getElementById(id);
const categories=[
  {key:'crochet',icon:'✿',name:'Crochet',hint:'Patterns, rows, and projects',fields:['Yarn / hook / rows','Progress notes']},
  {key:'recipes',icon:'♨',name:'Recipes',hint:'Favorite bakes and kitchen ideas',fields:['Ingredients','Steps']},
  {key:'beauty',icon:'✧',name:'Beauty',hint:'Hair, makeup, and inspiration boards',fields:['Colors / products','Look notes']},
  {key:'sports',icon:'★',name:'Sports',hint:'Volleyball and softball sessions',fields:['Sport / skills / stats','Session notes']}
];
const dailyIdeas=[
  'Make something tiny and beautiful today.', 'Try a new color combination.',
  'Celebrate a skill you have improved.', 'Write down one cozy idea to make later.',
  'Spend ten minutes on a creative project.', 'Share a kind word with someone you care about.',
  'Find a little magic in an ordinary moment.'
];
const trivia=[
  {q:'Which stitch is commonly used to start a crochet chain?',choices:['Chain stitch','Slip knot only','Backstitch'],answer:0},
  {q:'How many players are on the court for one indoor volleyball team?',choices:['Five','Six','Seven'],answer:1},
  {q:'Which ingredient helps bread dough rise?',choices:['Cocoa','Yeast','Salt alone'],answer:1},
  {q:'In softball, how many bases must a runner touch to score, including home plate?',choices:['Three','Four','Five'],answer:1},
  {q:'Which two colors make purple when mixed as paints?',choices:['Blue and red','Green and yellow','Red and green'],answer:0},
  {q:'What does a crochet stitch marker usually help you track?',choices:['Oven temperature','Stitch or round position','Shuttle speed'],answer:1},
  {q:'Which of these is a common volleyball defensive action?',choices:['Blocking','Dribbling','Icing'],answer:0}
];
const words=[['MOON','NOOM'],['MOTH','THOM'],['GROVE','VEORG'],['MAGIC','CIGAM'],['BLOOM','MOBOL'],['STAR','TSAR'],['LANTERN','NETRNAL']];
const rewards=[{stars:1,name:'First Firefly',icon:'✦'},{stars:3,name:'Moon Mushroom',icon:'☾'},{stars:7,name:'Luna Friend',icon:'✿'},{stars:14,name:'Golden Lantern',icon:'✧'}];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateKey=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const dayNumber=()=>Math.floor(new Date(dateKey()+'T12:00:00').getTime()/86400000);
let state=freshState(),healthy=false,queue=Promise.resolve(),revision=0,active='crochet',editId=null,gameFeedback='',status='Opening your studios…';
function notice(message){const node=$('phase2-notice');if(node){node.textContent=message;node.hidden=false;clearTimeout(notice.timer);notice.timer=setTimeout(()=>{node.hidden=true;},3800);}}
function setSaved(message){status=message;const node=$('phase2-save');if(node)node.textContent=message;}
function commit(){const snapshot=structuredClone(state),rev=++revision;
  if(!healthy){setSaved('Not saved · device storage unavailable');return Promise.resolve(false);}
  setSaved('Saving…');const current=queue.catch(()=>{}).then(()=>writePhase2(snapshot));queue=current;
  return current.then(()=>{if(rev===revision)setSaved('Saved to this device ✓');return true;}).catch(()=>{healthy=false;setSaved('Not saved · device storage unavailable');notice('Storage failed; export a backup before leaving.');return false;});
}
function keepUnique(arr,max){return arr.length>max?arr.slice(-max):arr;}
function renderStudio(){
 const current=categories.find(c=>c.key===active),rows=state.records[active];
 $('studio-tabs').innerHTML=categories.map(c=>`<button type="button" class="studio-tab ${active===c.key?'active':''}" data-studio="${c.key}" aria-pressed="${active===c.key}"><span>${c.icon}</span>${c.name}</button>`).join('');
 $('studio-title').textContent=current.name;$('studio-hint').textContent=current.hint;
 $('studio-extra-label').textContent=current.fields[0];$('studio-notes-label').textContent=current.fields[1];
 $('studio-counter').textContent=`${rows.length}/${maxRecords} entries`;
 const showMetrics=active==='crochet'||active==='sports';$('studio-metrics').hidden=!showMetrics;
 $('studio-count-label').textContent=active==='crochet'?'Rows completed':'Practice attempts';
 $('studio-goal-label').textContent=active==='crochet'?'Row goal (optional)':'Successful attempts';
 $('studio-color-wrap').hidden=active!=='beauty';
 $('studio-save-button').textContent=editId?'Save changes':'Add to collection';
 const list=$('studio-list');list.replaceChildren();
 if(!rows.length){list.innerHTML='<div class="phase2-empty">Nothing here yet. Your first idea belongs right here.</div>';return;}
 for(const r of [...rows].reverse()){
  const card=document.createElement('article');card.className='studio-card';
  const metric=active==='crochet'?`<div class="studio-metric"><strong>${r.count}${r.goal?' / '+r.goal:''} rows</strong><button type="button" data-action="minus" data-id="${r.id}" aria-label="Subtract one row">−</button><button type="button" data-action="plus" data-id="${r.id}" aria-label="Add one row">+</button></div>`:active==='sports'?`<div class="studio-metric"><strong>${r.goal} / ${r.count} successful attempts</strong>${r.count?`<small>(${Math.round(r.goal/r.count*100)}%)</small>`:''}</div>`:'';
  const palette=active==='beauty'?`<span class="beauty-swatch" style="background:${r.color||'#B7A7D9'}" aria-label="Chosen board color"></span>`:'';
  card.innerHTML=`<div class="studio-card-head"><h3>${esc(r.title)} ${palette}</h3><span>${esc(r.date)}</span></div><p class="studio-card-extra">${esc(r.extra)}</p><p class="studio-card-notes">${esc(r.notes)}</p>${metric}<div class="studio-card-actions"><button type="button" data-action="done" data-id="${r.id}">${r.done?'✓ Complete':'Mark complete'}</button><button type="button" data-action="edit" data-id="${r.id}">Edit</button><button type="button" data-action="delete" data-id="${r.id}">Delete</button></div>`;
  list.append(card);
 }
}
function resetEditor(){editId=null;$('studio-form').reset();$('studio-save-button').textContent='Add to collection';$('studio-cancel').hidden=true;}
function changeStudio(category){active=category;resetEditor();renderStudio();}
function onStudioSubmit(event){event.preventDefault();if(!healthy){notice('Storage unavailable; cannot save a new entry.');return;}
  const form=$('studio-form'),title=form.elements.namedItem('title').value.trim(),extra=form.elements.namedItem('extra').value.trim(),notes=form.elements.namedItem('notes').value.trim();
  const count=(active==='crochet'||active==='sports')?Number(form.elements.namedItem('count').value):0;
  const goal=(active==='crochet'||active==='sports')?Number(form.elements.namedItem('goal').value):0;
  const color=active==='beauty'?form.elements.namedItem('color').value:'';
  if(!Number.isSafeInteger(count)||!Number.isSafeInteger(goal)||count<0||goal<0||count>9999||goal>9999||(active==='sports'&&goal>count)){notice('Check your row/attempt totals. Successes cannot exceed attempts.');return;}
  if(!title||title.length>100||extra.length>600||notes.length>1000){notice('Check the text length before saving.');return;}
  const rows=state.records[active];if(!editId && rows.length>=maxRecords){notice('Collection full. Remove an old entry to make room.');return;}
  if(editId){const row=rows.find(r=>r.id===editId);if(!row)return;Object.assign(row,{title,extra,notes,count,goal,color});}
  else rows.push({id:(globalThis.crypto?.randomUUID?.()??`item-${Date.now()}-${Math.floor(Math.random()*1000000)}`),title,extra,notes,count,goal,color,date:dateKey(),done:false});
  resetEditor();renderStudio();commit();notice('Entry updated — saving…');
}
function onStudioAction(event){const button=event.target.closest('button[data-action]');if(!button||!healthy)return;
  const row=state.records[active].find(r=>r.id===button.dataset.id);if(!row)return;
  if(button.dataset.action==='edit'){
    editId=row.id;const form=$('studio-form');form.elements.namedItem('title').value=row.title;form.elements.namedItem('extra').value=row.extra;form.elements.namedItem('notes').value=row.notes;form.elements.namedItem('count').value=row.count;form.elements.namedItem('goal').value=row.goal;form.elements.namedItem('color').value=row.color||'#b7a7d9';
    $('studio-save-button').textContent='Save changes';$('studio-cancel').hidden=false;form.elements.namedItem('title').focus();return;
  }
  if(button.dataset.action==='plus'||button.dataset.action==='minus'){
    if(active!=='crochet')return;
    row.count=Math.max(0,Math.min(9999,row.count+(button.dataset.action==='plus'?1:-1)));
    renderStudio();commit();return;
  }
  if(button.dataset.action==='delete'){
    if(!confirm(`Delete “${row.title}”?`))return;
    state.records[active]=state.records[active].filter(r=>r.id!==row.id);if(editId===row.id)resetEditor();
  }else if(button.dataset.action==='done'){row.done=!row.done;}
  renderStudio();commit();
}
function award(awardKey){if(!healthy){notice('Storage is unavailable; reward cannot be saved.');return false;}
  if(awardKey.includes(':')){if(state.magic.played.includes(awardKey))return false;state.magic.played=keepUnique([...state.magic.played,awardKey],240);}
  else{if(state.magic.claimed.includes(awardKey))return false;state.magic.claimed=keepUnique([...state.magic.claimed,awardKey],120);}
  state.magic.stars=Math.min(1000,state.magic.stars+1);commit();return true;
}
function renderMagic(){const key=dateKey(),n=dayNumber();
  $('daily-prompt').textContent=dailyIdeas[n%dailyIdeas.length];
  const claimed=state.magic.claimed.includes(key),button=$('daily-claim');button.disabled=claimed||!healthy;button.textContent=claimed?'✓ Today’s magic collected':'Collect today’s moonseed';
  $('magic-stars').textContent=String(state.magic.stars);
  $('magic-rewards').innerHTML=rewards.map(r=>`<div class="magic-reward ${state.magic.stars>=r.stars?'unlocked':'locked'}"><span>${r.icon}</span><strong>${r.name}</strong><small>${state.magic.stars>=r.stars?'Unlocked':`${r.stars} moonseeds`}</small></div>`).join('');
  const t=trivia[n%trivia.length];$('trivia-question').textContent=t.q;
  const playedTrivia=state.magic.played.includes(`${key}:trivia`);
  $('trivia-options').innerHTML=t.choices.map((choice,i)=>`<button type="button" data-answer="${i}" ${playedTrivia||!healthy?'disabled':''}>${esc(choice)}</button>`).join('');
  const word=words[n%words.length];$('word-scramble').textContent=word[1];
  const playedWords=state.magic.played.includes(`${key}:words`);$('word-answer').disabled=playedWords||!healthy;$('word-submit').disabled=playedWords||!healthy;
  if(playedWords)$('word-status').textContent='Today’s word game completed. Come back tomorrow.';
  else if(!gameFeedback)$('word-status').textContent='Unscramble the letters to find a woodland word.';
  if(playedTrivia)$('trivia-status').textContent='Today’s trivia is complete. A new question comes tomorrow.';
}
function playTrivia(event){const btn=event.target.closest('button[data-answer]');if(!btn||!healthy)return;
  const key=`${dateKey()}:trivia`;if(state.magic.played.includes(key))return;
  const right=Number(btn.dataset.answer)===trivia[dayNumber()%trivia.length].answer;
  if(right){award(key);notice('Correct! You earned a moonseed.');}else{
    state.magic.played=keepUnique([...state.magic.played,key],240);commit();notice('Not quite! A fresh question arrives tomorrow.');
  }
  renderMagic();$('trivia-status').textContent=right?'Correct! +1 moonseed':'Good try! The new question arrives tomorrow.';
}
function playWord(event){event.preventDefault();if(!healthy)return;const key=`${dateKey()}:words`;if(state.magic.played.includes(key))return;
  const answer=$('word-answer').value.trim().toUpperCase();if(!answer)return;
  if(answer!==words[dayNumber()%words.length][0]){$('word-status').textContent='Not quite. Try again!';return;}
  award(key);$('word-answer').value='';gameFeedback='complete';renderMagic();$('word-status').textContent='Well done! +1 moonseed';
}
function navigate(screen){const home=$('main'),p2=$('phase2-screen');const isHome=screen==='home';home.hidden=!isHome;p2.hidden=isHome;
  for(const name of ['home','studios','magic']){const node=$(`nav-${name}`);node.classList.toggle('active',screen===name);if(screen===name)node.setAttribute('aria-current','page');else node.removeAttribute('aria-current');}
  if(!isHome){$('phase2-studios').hidden=screen!=='studios';$('phase2-magic').hidden=screen!=='magic';if(screen==='studios')renderStudio();else renderMagic();}
  window.scrollTo({top:0,behavior:'instant'});
}
function mount(){
 $('phase2-screen').innerHTML=`
   <div class="phase2-header"><p class="eyebrow">✦ A LITTLE WORLD OF YOUR OWN ✦</p><h1 id="phase2-heading">Moonlit discoveries</h1><p class="phase2-sub">Make, collect, play, and keep your ideas close.</p><div id="phase2-save" class="phase2-save" role="status" aria-live="polite">${status}</div></div>
   <div id="phase2-studios" hidden>
     <div id="studio-tabs" class="studio-tabs" role="group" aria-label="Creative studios"></div>
     <section class="phase2-panel"><h2 id="studio-title"></h2><p id="studio-hint" class="phase2-hint"></p>
       <form id="studio-form"><label>Title<input name="title" maxlength="100" required placeholder="Give your idea a name" autocomplete="off"></label>
       <label id="studio-extra-label" for="studio-extra"></label><textarea id="studio-extra" name="extra" maxlength="600" rows="2" placeholder="Details, tools or ingredients"></textarea>
       <label id="studio-notes-label" for="studio-notes"></label><textarea id="studio-notes" name="notes" maxlength="1000" rows="3" placeholder="Keep notes here"></textarea>
       <div id="studio-metrics" class="studio-metrics" hidden><label><span id="studio-count-label">Count</span><input name="count" type="number" min="0" max="9999" step="1" value="0" inputmode="numeric"></label><label><span id="studio-goal-label">Goal</span><input name="goal" type="number" min="0" max="9999" step="1" value="0" inputmode="numeric"></label></div>
       <label id="studio-color-wrap" hidden>Board color<input name="color" type="color" value="#b7a7d9"></label>
       <div class="phase2-actions"><button type="submit" class="primary-button" id="studio-save-button">Add to collection</button><button type="button" id="studio-cancel" class="minor-button" hidden>Cancel edit</button></div></form>
     </section><div class="phase2-list-head"><h2>Saved ideas</h2><span id="studio-counter"></span></div><div id="studio-list" class="studio-list"></div>
   </div>
   <div id="phase2-magic" hidden>
     <section class="phase2-panel"><p class="eyebrow">✧ TODAY’S LITTLE SPARK</p><h2>Daily magic</h2><p id="daily-prompt" class="magic-prompt"></p><button id="daily-claim" type="button" class="primary-button">Collect today’s moonseed</button></section>
     <section class="phase2-panel"><h2>Your moonseeds <span id="magic-stars">0</span></h2><div id="magic-rewards" class="magic-rewards"></div></section>
     <section class="phase2-panel"><p class="eyebrow">✿ MINI-GAME ONE</p><h2>Woodland trivia</h2><p id="trivia-question"></p><div id="trivia-options" class="trivia-options"></div><p id="trivia-status" role="status" aria-live="polite"></p></section>
     <section class="phase2-panel"><p class="eyebrow">✦ MINI-GAME TWO</p><h2>Word scramble</h2><div id="word-scramble" class="word-scramble"></div><form id="word-form" class="word-form"><label for="word-answer">Your answer</label><input id="word-answer" maxlength="15" autocomplete="off"><button id="word-submit" type="submit" class="primary-button">Try word</button></form><p id="word-status" role="status" aria-live="polite"></p></section>
   </div>
   <section class="phase2-panel phase2-backup"><h2>Keep your creations</h2><p>Saved locally on this device. Export a separate Studios & Magic backup before clearing browser data.</p><div class="phase2-actions"><button type="button" id="p2-export" class="minor-button">Export studios backup</button><button type="button" id="p2-import" class="minor-button">Import studios backup</button><input id="p2-file" type="file" accept=".json,application/json" hidden></div></section>
   <p id="phase2-notice" class="phase2-notice" role="status" aria-live="polite" hidden></p>`;
  $('studio-tabs').addEventListener('click',event=>{const b=event.target.closest('button[data-studio]');if(b)changeStudio(b.dataset.studio);});
  $('studio-form').addEventListener('submit',onStudioSubmit);$('studio-cancel').addEventListener('click',()=>{resetEditor();renderStudio();});$('studio-list').addEventListener('click',onStudioAction);
  $('daily-claim').addEventListener('click',()=>{if(award(dateKey())){renderMagic();notice('A moonseed for your day!');}});
  $('trivia-options').addEventListener('click',playTrivia);$('word-form').addEventListener('submit',playWord);
  $('nav-home').addEventListener('click',()=>navigate('home'));$('nav-studios').addEventListener('click',()=>navigate('studios'));$('nav-magic').addEventListener('click',()=>navigate('magic'));
  $('p2-export').addEventListener('click',async()=>{await queue.catch(()=>{});const blob=new Blob([makePhase2Backup(state)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='moonlit-grove-studios-backup.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);notice('Backup prepared. Keep it in Files.');});
  $('p2-import').addEventListener('click',()=>$('p2-file').click());
  $('p2-file').addEventListener('change',async event=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;
    try{if(file.size>220000)throw Error('Backup too large');const imported=loadPhase2Backup(await file.text());if(!healthy)throw Error('Device storage unavailable');await queue.catch(()=>{});await writePhase2(imported);state=imported;++revision;resetEditor();renderStudio();renderMagic();setSaved('Saved to this device ✓');notice('Studios and magic restored.');}catch(e){notice(`Import failed: ${e.message}`);}
  });
  renderStudio();renderMagic();
}
async function initialize(){mount();try{const saved=await readPhase2();state=saved??freshState();healthy=true;if(!saved)await commit();else setSaved('Saved to this device ✓');}
  catch(e){healthy=false;setSaved('Not saved · device storage unavailable');notice('Could not load studios. Keep existing data safe; do not import until storage works.');}
  renderStudio();renderMagic();
}
initialize();
