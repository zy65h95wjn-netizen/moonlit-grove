import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {webcrypto} from 'node:crypto';
const ROOT=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,ROOT),'utf8');
const sql=read('supabase/migrations/001_phase3_security.sql');
const html=read('index.html'),sw=read('sw.js'),ui=read('src/account-ui.js'),p2=read('src/phase2.js');
assert.match(html,/id="nav-account"/);assert.match(html,/id="account-screen" hidden/);
assert.match(p2,/navigate\(screen\)\{\$\('account-screen'\)\.hidden=true/);
for(const path of ['src/account-ui.js','src/account-api.js','src/account-config.js','src/account.css'])assert.ok(sw.includes(path));
assert.match(sw,/moonlit-grove-shell-v4/);
assert.match(sql,/enable row level security/g);
assert.equal((sql.match(/enable row level security/g)||[]).length,6);
assert.match(sql,/mg_private\.accept_invite/);assert.match(sql,/mg_members_visibility/);
assert.match(sql,/security definer set search_path = ''/);
assert.match(sql,/revoke all on table/);assert.match(sql,/from public,anon,authenticated/);
assert.match(sql,/provided_code !~ '\^\[a-f0-9\]\{48\}\$'/);
assert.match(sql,/confirms_age_13 is distinct from true/);
assert.match(sql,/email_confirmed_at is not null/);
assert.match(sql,/where id=caller/);
assert.match(ui,/Not open yet/);
assert.ok(!/sb_secret_[A-Za-z0-9]+/.test(read('src/account-config.js')),'client config file must have zero real secret keys');
// Exercise OAuth PKCE, callback state, token rotation, resource requests, and logout via mock auth server.
const mockUrl='https://test-only.supabase.co',mockKey='sb_publishable_testonly1234';
const source=read('src/account-api.js').replace("import {ACCOUNT_CONFIG} from './account-config.js';",`const ACCOUNT_CONFIG={url:${JSON.stringify(mockUrl)},publishableKey:${JSON.stringify(mockKey)}};`);
const moduleUrl='data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const memory=new Map();const store={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.sessionStorage=store;
globalThis.location={origin:'https://example.org',pathname:'/grove/',href:'https://example.org/grove/',assign(s){this.target=s;}};
globalThis.history={replaceState(_x,_y,url){globalThis.location.href=url;}};
const calls=[];
globalThis.fetch=async (url,opts)=>{
 calls.push({url,opts});
 let status=200,body={};
 if(url.includes('grant_type=pkce')){assert.equal(opts.body.includes('code_verifier'),true);body={access_token:'tokenA',refresh_token:'refreshA',expires_in:3600};}
 else if(url.includes('/auth/v1/user'))body={id:'a8351308-7941-40b7-859d-b06efc0d22a9'};
 else if(url.includes('/rest/v1/rpc/mg_create_invite'))body=[{code:'ab'.repeat(24),expires_at:'2026-10-21'}];
 else if(url.includes('grant_type=refresh_token'))body={access_token:'tokenB',refresh_token:'refreshB',expires_in:3600};
 else if(url.includes('/auth/v1/logout'))body={};
 else {status=404;body={message:'not mocked'};}
 return {ok:status===200,status,async json(){return body}};
};
const api=await import(moduleUrl);
assert.equal(api.configured(),true);
await api.beginSignIn();
const u=new URL(location.target);
assert.equal(u.pathname,'/auth/v1/authorize');assert.equal(u.searchParams.get('provider'),'google');
assert.equal(u.searchParams.get('code_challenge_method'),'s256');
assert.equal(u.searchParams.get('code_challenge').length,43);
const challengeState=new URL(u.searchParams.get('redirect_to')).searchParams.get('mg_auth_state');
location.href=`https://example.org/grove/?code=code-123&mg_auth_state=${challengeState}`;
await api.receiveSignIn();assert.equal(new URL(location.href).searchParams.has('code'),false);
assert.equal(api.restoreSession(),true);
assert.equal((await api.getIdentity()).id,'a8351308-7941-40b7-859d-b06efc0d22a9');
assert.equal((await api.rpc('mg_create_invite'))[0].code.length,48);
let denied=false;try{await api.rpc('arbitrary_admin_rpc')}catch{denied=true;}assert.equal(denied,true);
const raw=JSON.parse(store.getItem('mg_phase3_session_v1'));raw.expires_at=Date.now()-1000;store.setItem('mg_phase3_session_v1',JSON.stringify(raw));
// Reimport as new browser session to exercise token rotation.
const api2=await import(moduleUrl+'#refresh');api2.restoreSession();await api2.getIdentity();
assert.equal(JSON.parse(store.getItem('mg_phase3_session_v1')).access_token,'tokenB');
await api2.signOut();assert.equal(store.getItem('mg_phase3_session_v1'),null);
// Bad callback state must not authenticate.
await api2.beginSignIn();location.href='https://example.org/grove/?code=bad&mg_auth_state=wrong';
denied=false;try{await api2.receiveSignIn()}catch{denied=true};assert.equal(denied,true);
assert.equal(new URL(location.href).searchParams.has('code'),false);
assert.equal(store.getItem('mg_phase3_session_v1'),null);
console.log('Phase 3 static safeguards + PKCE/refresh/REST mock checks: PASS');
console.log('NOTE: no real Supabase RLS, invite or iPhone OAuth test has been executed.');
