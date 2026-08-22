import React from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import './styles.css';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = url && key ? createClient(url, key) : null;

function Shell({children}) { return <main className="auth"><section><b>ROYEXA</b><span>SECURITY CONSOLE</span>{children}</section></main>; }
function Setup() { return <Shell><h1>Admin setup incomplete</h1><p className="error">The security console is not connected to its database yet. Check the Supabase URL and publishable key in Vercel, then redeploy.</p></Shell>; }

function Login({onDone}) {
  const [email,setEmail]=React.useState(''); const [password,setPassword]=React.useState(''); const [code,setCode]=React.useState('');
  const [factor,setFactor]=React.useState(null); const [mfa,setMfa]=React.useState(false); const [busy,setBusy]=React.useState(false); const [error,setError]=React.useState('');
  const signIn=async e=>{e.preventDefault();setBusy(true);setError('');try{
    const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password}); if(error) throw error;
    const {data:admin,error:adminError}=await supabase.rpc('is_security_admin'); if(adminError) throw adminError;
    if(!admin){await supabase.auth.signOut();throw new Error('This account is not authorized for the security console.');}
    const {data:factors,error:factorError}=await supabase.auth.mfa.listFactors(); if(factorError) throw factorError;
    const verified=(factors?.totp||[]).find(f=>f.status==='verified');
    if(!verified) throw new Error('Two-step verification is not enrolled for this admin account.');
    const {data:aal,error:aalError}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel(); if(aalError) throw aalError;
    if(aal.currentLevel==='aal2'){onDone();return;}
    const {error:challengeError}=await supabase.auth.mfa.challenge({factorId:verified.id}); if(challengeError) throw challengeError;
    setFactor(verified.id);setMfa(true);
  }catch(err){setError(err?.message||'Unable to sign in.')}finally{setBusy(false)}};
  const verify=async e=>{e.preventDefault();setBusy(true);setError('');try{const {error}=await supabase.auth.mfa.challengeAndVerify({factorId:factor,code});if(error)throw error;onDone();}catch(err){setError(err?.message||'Invalid verification code.')}finally{setBusy(false)}};
  return <Shell><h1>Administrator sign in</h1>{!mfa?<form onSubmit={signIn}><input type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" required/><input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/><button type="submit" disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form>:<form onSubmit={verify}><p>Enter the 6-digit code from your authenticator.</p><input inputMode="numeric" autoComplete="one-time-code" maxLength="6" placeholder="000000" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} required/><button type="submit" disabled={busy}>{busy?'Verifying…':'Verify'}</button></form>}{error&&<div className="error">{error}</div>}</Shell>;
}

function Dashboard({onSignOut}) {
  const [tab,setTab]=React.useState('overview'); const [data,setData]=React.useState({alerts:[],blocks:[],enforcements:[],teams:[],violations:[],members:[]}); const [error,setError]=React.useState('');
  React.useEffect(()=>{(async()=>{try{const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Session expired. Please sign in again.');const r=await fetch(`${url}/functions/v1/admin-control-center`,{method:'GET',headers:{Authorization:`Bearer ${session.access_token}`}});const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body.error||`Security service returned ${r.status}`);setData(body);}catch(e){setError(e.message);}})();},[]);
  return <main className="dash"><header><div><b>ROYEXA SECURITY</b><h1>Control Center</h1></div><button onClick={onSignOut}>Sign out</button></header>{error&&<div className="error">{error}</div>}<nav>{['overview','incidents','enforcement','teams'].map(x=><button key={x} className={tab===x?'active':''} onClick={()=>setTab(x)}>{x}</button>)}</nav>{tab==='overview'&&<section className="cards"><article><small>INTRUSIONS</small><strong>{data.alerts?.length||0}</strong></article><article><small>BLOCKS</small><strong>{data.blocks?.length||0}</strong></article><article><small>ENFORCEMENTS</small><strong>{data.enforcements?.length||0}</strong></article><article><small>TEAMS</small><strong>{data.teams?.length||0}</strong></article></section>}{tab==='incidents'&&<section className="panel"><h2>Intrusion alerts</h2>{(data.alerts||[]).map(a=><div className="row" key={a.id}><b>{a.event_type}</b><span>{a.endpoint||'unknown'} · {a.risk_score}/100</span></div>)}</section>}{tab==='enforcement'&&<section className="panel"><h2>Enforcement</h2>{(data.enforcements||[]).map(a=><div className="row" key={a.id}><b>{a.action}</b><span>{a.reason} · {a.user_id}</span></div>)}</section>}{tab==='teams'&&<section className="panel"><h2>Teams</h2>{(data.teams||[]).map(t=><div className="row" key={t.id}><b>{t.name}</b><span>{t.description||''}</span></div>)}</section>}</main>;
}

function App(){const [ready,setReady]=React.useState(false);const [authorized,setAuthorized]=React.useState(false);React.useEffect(()=>{if(!supabase){setReady(true);return;}let mounted=true;(async()=>{try{const {data:{session}}=await supabase.auth.getSession();if(!session){if(mounted)setReady(true);return;}const {data:admin,error:adminError}=await supabase.rpc('is_security_admin');if(adminError)throw adminError;const {data:aal,error:aalError}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();if(aalError)throw aalError;if(admin&&aal.currentLevel==='aal2'&&mounted)setAuthorized(true);}catch(e){if(mounted)setAuthorized(false);}finally{if(mounted)setReady(true);}})();const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{});return()=>{mounted=false;subscription.unsubscribe();};},[]);if(!supabase)return <Setup/>;if(!ready)return <Shell><h1>Security console</h1><p>Checking your access…</p></Shell>;if(!authorized)return <Login onDone={()=>setAuthorized(true)}/>;return <Dashboard onSignOut={async()=>{await supabase.auth.signOut();setAuthorized(false)}}/>;}
createRoot(document.getElementById('root')).render(<App/>);