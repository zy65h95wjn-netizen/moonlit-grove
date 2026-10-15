// Phase 3 account controls; never used to authorize data. Supabase RLS + RPC own authorization.
import {configured,beginSignIn,receiveSignIn,restoreSession,getIdentity,table,rpc,signOut} from './account-api.js';
const $=id=>document.getElementById(id);
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let identity=null,member=null,friends=[],blocks=[];
let currentToken='';
const uuidRE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function notify(msg,isError=false){const el=$('account-status');if(!el)return;el.textContent=msg;el.classList.toggle('error',isError);}
const action=async (promise,msg)=>{try{const result=await promise;notify(msg);return result;}catch(e){notify(e.message||'Something went wrong',true);return null;}};
function showPanel(){
  $('main').hidden=true;
  $('phase2-screen').hidden=true;
  $('account-screen').hidden=false;
  for(const id of ['home','studios','magic','account']){const el=$(`nav-${id}`);el.classList.toggle('active',id==='account');if(id==='account')el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');}
  window.scrollTo(0,0);
}
function render(){
  const active=configured(),signed=Boolean(identity);
  $('account-unconfigured').hidden=active;
  $('account-sign-in').hidden=!active||signed;
  $('account-admission').hidden=!signed||Boolean(member);
  $('account-active').hidden=!signed||!member;
  $('account-signed-out').hidden=!signed;
  if(member){
    $('member-name').textContent=member.display_name;
    $('friends-list').replaceChildren();
    if(!friends.length)$('friends-list').textContent='No friends yet. Share a one-use invitation with someone you know.';
    for(const friend of friends){
      const li=document.createElement('li');li.className='friend-row';
      li.innerHTML=`<strong>${escapeHTML(friend.display_name)}</strong><div class="friend-actions"><button type="button" data-action="report">Report</button><button type="button" data-action="block">Block</button><button type="button" data-action="remove">Remove</button></div>`;
      li.dataset.userId=friend.id;$('friends-list').append(li);
    }
    $('blocked-list').replaceChildren();
    if(!blocks.length)$('blocked-list').textContent='Nobody blocked.';
    for(const record of blocks){
      const li=document.createElement('li');li.className='friend-row';
      const label=document.createElement('span');label.textContent='Blocked account';
      const btn=document.createElement('button');btn.textContent='Unblock';btn.type='button';btn.dataset.action='unblock';
      li.dataset.userId=record.blocked_id;li.append(label,btn);$('blocked-list').append(li);
    }
  }
}
async function refresh(){
  if(!identity){member=null;friends=[];blocks=[];render();return;}
  const [my,related,blockList]=await Promise.all([
    table('mg_members',`select=id,display_name&id=eq.${encodeURIComponent(identity.id)}`),
    table('mg_friendships','select=first_id,second_id'),
    table('mg_blocks','select=blocked_id')
  ]);
  member=my?.[0]??null;
  if(!member){friends=[];blocks=[];render();return;}
  const ids=[...new Set(related.map(x=>x.first_id===identity.id?x.second_id:x.first_id))];
  const named=ids.length?await table('mg_members',`select=id,display_name&id=in.(${ids.join(',')})`):[];
  friends=named||[];blocks=blockList||[];
  render();
}
function getFriendFromTarget(target){const li=target.closest('[data-user-id]');if(!li||!uuidRE.test(li.dataset.userId))return null;return li.dataset.userId;}
async function boot(){
  if(!configured()){render();return;}
  try{
    await receiveSignIn();
    if(!restoreSession()){render();return;}
    identity=await getIdentity();await refresh();
  }catch(e){notify(e.message||'Authentication unavailable',true);identity=null;member=null;render();}
}
function mount(){
  $('account-screen').innerHTML=`
    <div class="account-heading"><p class="eyebrow">✦ PRIVATE BY INVITATION ✦</p><h1>Friends in the grove</h1><p>Solo creativity always works without signing in.</p></div>
    <p id="account-status" role="status" aria-live="polite"></p>
    <div id="account-unconfigured" class="account-box"><h2>Not open yet</h2><p>Private accounts are being tested. Your clubhouse, studios, and games are still available locally.</p></div>
    <div id="account-sign-in" class="account-box" hidden><h2>Sign in to friends</h2><p>13+ only. Access requires a one-use invitation from an approved member. No public profiles.</p><label class="age-agreement"><input type="checkbox" id="account-age"> I confirm I am at least 13 years old.</label><button class="primary-button" id="google-sign-in" type="button">Continue with Google</button></div>
    <div id="account-admission" class="account-box" hidden><h2>Join a trusted friend</h2><p>Enter the private invitation code they sent you. It expires after seven days and works once.</p><form id="account-join"><label>Display name<input id="join-name" maxlength="40" minlength="2" required autocomplete="nickname"></label><label>Invitation code<input id="join-code" minlength="48" maxlength="48" required autocomplete="off" autocapitalize="none" spellcheck="false"></label><label class="age-agreement"><input id="join-age" type="checkbox" required> I confirm I am at least 13 years old.</label><button type="submit" class="primary-button">Accept invitation</button></form><p>Already signed in, but no invitation? Your private information is not available to anyone.</p></div>
    <div id="account-active" hidden>
      <section class="account-box"><p class="eyebrow">✦ YOUR PRIVATE PROFILE</p><h2 id="member-name"></h2><p>Only directly connected friends can see your display name. You can remove or block friends at any time.</p><form id="name-form"><label>Change display name<input id="rename-input" minlength="2" maxlength="40" autocomplete="nickname" required></label><button class="minor-button" type="submit">Save name</button></form></section>
      <section class="account-box"><h2>Invite a friend</h2><p>Create one invitation code, then share it privately. One use, seven-day expiry. Five active codes maximum.</p><button class="primary-button" id="create-invite" type="button">Make invitation</button><div id="invite-result" hidden><label>One-time invitation<input id="new-invite" readonly></label><button id="copy-invite" class="minor-button" type="button">Copy code</button><p>The code is shown once; keep it private.</p></div></section>
      <section class="account-box"><h2>Your friends</h2><ul id="friends-list" class="friend-list"></ul></section>
      <section class="account-box"><h2>Blocked accounts</h2><ul id="blocked-list" class="friend-list"></ul></section>
      <section class="account-box"><h2>Safety reports</h2><p>Reporting records a concern for authorized project-owner review. It is <strong>not</strong> an emergency service or continuously monitored.</p></section>
    </div>
    <div id="account-signed-out" hidden><button type="button" id="account-logout" class="minor-button">Sign out of friends</button><p>Your locally saved clubhouse and studios won't be deleted.</p></div>`;
  $('nav-account').addEventListener('click',()=>{showPanel();render();});
  $('google-sign-in').addEventListener('click',async()=>{
    if(!$('account-age').checked){notify('Accounts are for ages 13 and older.',true);return;}
    await action(beginSignIn(),'Redirecting to Google…');
  });
  $('account-join').addEventListener('submit',async ev=>{
    ev.preventDefault();
    const name=$('join-name').value.trim(),code=$('join-code').value.trim().toLowerCase();
    if(!$('join-age').checked){notify('Accounts are for ages 13 and older.',true);return;}
    const result=await action(rpc('mg_accept_invite',{provided_code:code,chosen_name:name,confirms_age_13:true}),'Invitation accepted. Welcome!');
    if(result){$('join-code').value='';await action(refresh(),'Connected to your friend.');}
  });
  $('name-form').addEventListener('submit',async ev=>{ev.preventDefault();const n=$('rename-input').value.trim();const result=await action(rpc('mg_rename_member',{chosen_name:n}),'Name updated');if(result)await refresh();});
  $('create-invite').addEventListener('click',async()=>{
    $('invite-result').hidden=true;$('new-invite').value='';
    const result=await action(rpc('mg_create_invite'),'Invitation created. Share it privately.');
    if(result?.[0]?.code){currentToken=result[0].code;$('new-invite').value=currentToken;$('invite-result').hidden=false;}
  });
  $('copy-invite').addEventListener('click',async()=>{
    if(!currentToken)return;try{await navigator.clipboard.writeText(currentToken);notify('Code copied. Send it only to your friend.');}catch{notify('Copy unavailable. Select the code manually.',true);}
  });
  $('friends-list').addEventListener('click',async ev=>{
    const btn=ev.target.closest('button[data-action]'),other=getFriendFromTarget(ev.target);if(!btn||!other)return;
    if(btn.dataset.action==='report'){
      const reason=prompt('Report reason: harassment, spam, safety, or other','safety');
      if(reason===null)return;
      if(!['harassment','spam','safety','other'].includes(reason.trim().toLowerCase())){notify('Choose a listed report category.',true);return;}
      const detail=prompt('Optional details (500 characters max):','');if(detail===null)return;
      await action(rpc('mg_report_member',{other_id:other,reason:reason.trim().toLowerCase(),details_text:detail.slice(0,500)}),'Report recorded for project-owner review.');
    }else if(btn.dataset.action==='remove'){
      if(confirm('Remove this friend?')){const ok=await action(rpc('mg_remove_friend',{other_id:other}),'Friend removed.');if(ok!==null)await refresh();}
    }else if(btn.dataset.action==='block'){
      if(confirm('Block this member? They will be removed from your friends.')){const ok=await action(rpc('mg_block_member',{other_id:other}),'Member blocked.');if(ok!==null)await refresh();}
    }
  });
  $('blocked-list').addEventListener('click',async ev=>{
    const btn=ev.target.closest('button[data-action]'),other=getFriendFromTarget(ev.target);
    if(btn?.dataset.action==='unblock'&&other&&confirm('Unblock this member? This does not restore friendship.')){
      const ok=await action(rpc('mg_unblock_member',{other_id:other}),'Member unblocked.');if(ok!==null)await refresh();
    }
  });
  $('account-logout').addEventListener('click',async()=>{await signOut();identity=null;member=null;friends=[];blocks=[];currentToken='';render();notify('Signed out. Your local projects remain saved.');});
  render();boot();
}
mount();
