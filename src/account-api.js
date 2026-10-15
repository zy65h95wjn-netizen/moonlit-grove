// Small, dependency-free Supabase client for Google OAuth PKCE and REST RPC.
// Sign-in is separate from *membership*; database invitation approval is authoritative.
import {ACCOUNT_CONFIG} from './account-config.js';
const AUTH_SESSION = 'mg_phase3_session_v1';
const PKCE_VERIFIER = 'mg_phase3_pkce_verifier_v1';
const PKCE_STATE = 'mg_phase3_pkce_state_v1';
const homeUrl = () => `${location.origin}${location.pathname}`;
const encoder = new TextEncoder();
const base64url = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
function config(){
  const url=ACCOUNT_CONFIG.url.trim().replace(/\/$/,'');
  const key=ACCOUNT_CONFIG.publishableKey.trim();
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)|| !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))
    throw new Error('Private accounts are not configured yet. Your local clubhouse still works.');
  return {url,key};
}
export const configured=()=>{try{config();return true;}catch{return false;}};
let current=null,refreshPending=null;
function persist(session){
  current=session;
  if(session)sessionStorage.setItem(AUTH_SESSION,JSON.stringify(session));
  else sessionStorage.removeItem(AUTH_SESSION);
}
function sessionFromReply(payload){
  if(!payload?.access_token || !payload?.refresh_token || !Number.isFinite(Number(payload.expires_in)))
    throw new Error('Login reply incomplete');
  return {access_token:payload.access_token,refresh_token:payload.refresh_token,expires_at:Date.now()+Number(payload.expires_in)*1000};
}
async function callAuth(endpoint,data){
  const {url,key}=config();
  const res=await fetch(url+endpoint,{method:'POST',headers:{'apikey':key,'Content-Type':'application/json'},body:JSON.stringify(data),cache:'no-store'});
  const answer=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(answer.msg||answer.error_description||answer.message||`Authentication failed (${res.status})`);
  return answer;
}
export async function beginSignIn(){
  const {url}=config();
  const verifier=base64url(crypto.getRandomValues(new Uint8Array(32)));
  const state=base64url(crypto.getRandomValues(new Uint8Array(18)));
  const hash=await crypto.subtle.digest('SHA-256',encoder.encode(verifier));
  sessionStorage.setItem(PKCE_VERIFIER,verifier);
  sessionStorage.setItem(PKCE_STATE,state);
  const redirect=new URL(homeUrl());redirect.searchParams.set('mg_auth_state',state);
  const authorize=new URL(url+'/auth/v1/authorize');
  authorize.searchParams.set('provider','google');
  authorize.searchParams.set('redirect_to',redirect.href);
  authorize.searchParams.set('code_challenge',base64url(new Uint8Array(hash)));
  authorize.searchParams.set('code_challenge_method','s256');
  location.assign(authorize.href);
}
export async function receiveSignIn(){
  const currentUrl=new URL(location.href);
  const code=currentUrl.searchParams.get('code'),returnedState=currentUrl.searchParams.get('mg_auth_state');
  const error=currentUrl.searchParams.get('error_description')||currentUrl.searchParams.get('error');
  if(!code && !error)return;
  // Remove code and error from history BEFORE any async requests or telemetry.
  for(const field of ['code','error','error_description','mg_auth_state'])currentUrl.searchParams.delete(field);
  history.replaceState(null,'',currentUrl.href);
  const expected=sessionStorage.getItem(PKCE_STATE),verifier=sessionStorage.getItem(PKCE_VERIFIER);
  sessionStorage.removeItem(PKCE_STATE);sessionStorage.removeItem(PKCE_VERIFIER);
  if(error)throw new Error('Sign-in was cancelled or unavailable.');
  if(!expected || returnedState!==expected || !verifier)throw new Error('Sign-in could not be verified. Start again on this device.');
  persist(sessionFromReply(await callAuth('/auth/v1/token?grant_type=pkce',{auth_code:code,code_verifier:verifier})));
}
export function restoreSession(){
  try{
    const parsed=JSON.parse(sessionStorage.getItem(AUTH_SESSION)||'null');
    if(parsed && typeof parsed.access_token==='string' && typeof parsed.refresh_token==='string' && Number.isFinite(parsed.expires_at))
      current=parsed;
  }catch{sessionStorage.removeItem(AUTH_SESSION)}
  return Boolean(current);
}
async function refreshSession(){
  if(!current?.refresh_token)throw new Error('Please sign in again.');
  if(refreshPending)return refreshPending;
  refreshPending=callAuth('/auth/v1/token?grant_type=refresh_token',{refresh_token:current.refresh_token})
    .then(payload=>{persist(sessionFromReply(payload));return current;})
    .catch(err=>{persist(null);throw err;})
    .finally(()=>{refreshPending=null;});
  return refreshPending;
}
async function token(){
  if(!current)throw new Error('Please sign in first.');
  if(Date.now()>current.expires_at-60_000)await refreshSession();
  return current.access_token;
}
async function authorized(path,options={}){
  const {url,key}=config();
  const make=async()=>fetch(url+path,{...options,headers:{'apikey':key,'Authorization':`Bearer ${await token()}`,...options.headers},cache:'no-store'});
  let res=await make();
  if(res.status===401 && current){await refreshSession();res=await make();}
  const body=await res.json().catch(()=>null);
  if(!res.ok)throw new Error(body?.message||body?.error||`Request denied (${res.status})`);
  return body;
}
export async function getIdentity(){return authorized('/auth/v1/user');}
export async function table(name,query){
  if(!['mg_members','mg_friendships','mg_blocks'].includes(name))throw new Error('Table not available');
  return authorized(`/rest/v1/${name}?${query}`);
}
export async function rpc(name,args={}){
  if(!['mg_create_invite','mg_accept_invite','mg_rename_member','mg_remove_friend','mg_block_member','mg_unblock_member','mg_report_member'].includes(name))throw new Error('RPC not allowed');
  return authorized(`/rest/v1/rpc/${name}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(args)});
}
export async function signOut(){
  if(current){try{await authorized('/auth/v1/logout',{method:'POST'});}catch{/* local logout always happens */}}
  persist(null);sessionStorage.removeItem(PKCE_VERIFIER);sessionStorage.removeItem(PKCE_STATE);
}
