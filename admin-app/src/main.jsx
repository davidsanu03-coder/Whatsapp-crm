import React from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import './styles.css';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = url && key ? createClient(url, key) : null;
const ADMIN_URL = window.location.origin;

function Shell({children}) { return <main className="auth"><section><b>ROYEXA</b><span>SECURITY CONSOLE</span>{children}</section></main>; }
function Setup() { return <Shell><h1>Admin setup incomplete</h1><p className="error">The security console is not connected to its database yet. Check the Supabase URL and publishable key in Vercel, then redeploy.</p></Shell>; }

async function adminMfa(action, extra = {}) {
  const { data, error } = await supabase.functions.invoke('admin-email-mfa', { body: { action, ...extra } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

async function sendEmailCode(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: false }
  });
  if (error) throw error;
}

async function completeEmailMfa(email, code, mode = 'login') {
  const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'email' });
  if (error) throw error;
  return adminMfa('complete', { mode });
}

function ForgotPassword(){const [email,setEmail]=React.useState('');const [sent,setSent]=React.useState(false);const [busy,setBusy]=React.useState(false);const [error,setError]=React.useState('');const submit=async e=>{e.preventDefault();setBusy(true);setError('');try{const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:`${ADMIN_URL}/reset-password`});if(error)throw error;setSent(true);}catch(err){setError(err?.message||'Unable to send reset email.')}finally{setBusy(false)}};return <Shell><h1>Reset Admin password</h1>{sent?<><p>Check your email for the password reset link. It will return you to this Admin Console.</p><button onClick={()=>setSent(false)}>Send again</button></>:<form onSubmit={submit}><p>Enter the email used for your Admin account.</p><input type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required/><button type="submit" disabled={busy}>{busy?'Sending…':'Send reset link'}</button></form>}{error&&<div className="error">{error}</div>}</Shell>}

function ResetPassword({onDone}){const [password,setPassword]=React.useState('');const [confirm,setConfirm]=React.useState('');const [busy,setBusy]=React.useState(false);const [error,setError]=React.useState('');const submit=async e=>{e.preventDefault();setError('');if(password.length<8){setError('Password must be at least 8 characters.');return;}if(password!==confirm){setError('Passwords do not match.');return;}setBusy(true);try{const {error}=await supabase.auth.updateUser({password});if(error)throw error;await supabase.auth.signOut();onDone();}catch(err){setError(err?.message||'Unable to update password.')}finally{setBusy(false)}};return <Shell><h1>Set new Admin password</h1><form onSubmit={submit}><input type="password" placeholder="New password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" required/><input type="password" placeholder="Confirm password" value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" required/><button type="submit" disabled={busy}>{busy?'Updating…':'Update password'}</button></form>{error&&<div className="error">{error}</div>}</Shell>}

function EmailMfa({email,onDone,onBack,mode='login'}){
 const [code,setCode]=React.useState(''); const [busy,setBusy]=React.useState(false); const [error,setError]=React.useState(''); const [sent,setSent]=React.useState(false);
 React.useEffect(()=>{let mounted=true;(async()=>{try{await sendEmailCode(email);if(mounted)setSent(true);}catch(err){if(mounted)setError(err?.message||'Unable to send verification code.')}})();return()=>{mounted=false}},[email]);
 const verify=async e=>{e.preventDefault();setBusy(true);setError('');try{await completeEmailMfa(email,code,mode);onDone();}catch(err){setError(err?.message||'Invalid or expired verification code.')}finally{setBusy(false)}};
 const resend=async()=>{setBusy(true);setError('');try{await sendEmailCode(email);setSent(true);}catch(err){setError(err?.message||'Unable to resend code.')}finally{setBusy(false)}};
 return <Shell><h1>Verify Admin email</h1><p>{sent?<>A 6-digit security code was sent to <b>{email}</b>.</>:<>Sending a 6-digit security code to <b>{email}</b>…</>}</p><form onSubmit={verify}><input inputMode="numeric" autoComplete="one-time-code" maxLength="6" placeholder="000000" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} required/><button type="submit" disabled={busy||code.length!==6}>{busy?'Verifying…':'Verify email code'}</button></form><button type="button" onClick={resend} disabled={busy}>Send code again</button><button type="button" onClick={onBack} disabled={busy}>Back to sign in</button>{error&&<div className="error">{error}</div>}</Shell>;
}

function Login({onDone}){
 const [email,setEmail]=React.useState('');const [password,setPassword]=React.useState('');const [mfa,setMfa]=React.useState(false);const [forgot,setForgot]=React.useState(false);const [busy,setBusy]=React.useState(false);const [error,setError]=React.useState('');
 const signIn=async e=>{e.preventDefault();setBusy(true);setError('');try{const clean=email.trim();const {error}=await supabase.auth.signInWithPassword({email:clean,password});if(error)throw error;const {data:admin,error:adminError}=await supabase.rpc('is_security_admin');if(adminError)throw adminError;if(!admin){await supabase.auth.signOut();throw new Error('This account is not authorized for the security console.');}setMfa(true);}catch(err){setError(err?.message||'Unable to sign in.')}finally{setBusy(false)}};
 if(forgot)return <ForgotPassword/>; if(mfa)return <EmailMfa email={email.trim()} onDone={onDone} onBack={()=>setMfa(false)} mode="login"/>;
 return <Shell><h1>Administrator sign in</h1><p>Email + password, followed by a one-time code sent to your Admin email.</p><form onSubmit={signIn}><input type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" required/><input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/><button type="submit" disabled={busy}>{busy?'Signing in…':'Sign in'}</button><button type="button" onClick={()=>setForgot(true)}>Forgot password?</button></form>{error&&<div className="error">{error}</div>}</Shell>
}

function Reauth({email,onDone,onCancel}){
 const [password,setPassword]=React.useState('');const [step,setStep]=React.useState('password');const [code,setCode]=React.useState('');const [busy,setBusy]=React.useState(false);const [error,setError]=React.useState('');
 const start=async e=>{e.preventDefault();setBusy(true);setError('');try{await adminMfa('start_reauth',{password});await sendEmailCode(email);setStep('otp');}catch(err){setError(err?.message||'Reauthentication failed.')}finally{setBusy(false)}};
 const verify=async e=>{e.preventDefault();setBusy(true);setError('');try{await completeEmailMfa(email,code,'reauth');onDone();}catch(err){setError(err?.message||'Invalid or expired verification code.')}finally{setBusy(false)}};
 return <Shell><h1>Confirm high-risk action</h1>{step==='password'?<form onSubmit={start}><p>Enter your current Admin password. We will then send a one-time code to your Admin email.</p><input type="password" placeholder="Current password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/><button type="submit" disabled={busy}>{busy?'Checking…':'Continue'}</button></form>:<form onSubmit={verify}><p>Enter the 6-digit code sent to <b>{email}</b>.</p><input inputMode="numeric" autoComplete="one-time-code" maxLength="6" placeholder="000000" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} required/><button type="submit" disabled={busy||code.length!==6}>{busy?'Verifying…':'Confirm reauthentication'}</button></form>}<button type="button" onClick={onCancel} disabled={busy}>Cancel</button>{error&&<div className="error">{error}</div>}</Shell>;
}

function Dashboard({onSignOut}){
 const [tab,setTab]=React.useState('overview');const [data,setData]=React.useState({alerts:[],blocks:[],enforcements:[],teams:[]});const [error,setError]=React.useState('');const [reauth,setReauth]=React.useState(false);const [email,setEmail]=React.useState('');
 const load=React.useCallback(async()=>{try{const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Session expired. Please sign in again.');setEmail(session.user?.email||'');const r=await fetch(`${url}/functions/v1/admin-control-center`,{method:'GET',headers:{Authorization:`Bearer ${session.access_token}`}});const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body.error||`Security service returned ${r.status}`);setData(body);}catch(e){setError(e.message);}},[]);
 React.useEffect(()=>{load()},[load]);
 return <main className="dash"><header><div><b>ROYEXA SECURITY</b><h1>Control Center</h1></div><div><button onClick={()=>setReauth(true)}>Re-authenticate</button><button onClick={onSignOut}>Sign out</button></div></header>{error&&<div className="error">{error}</div>}<nav>{['overview','incidents','enforcement','teams'].map(x=><button key={x} className={tab===x?'active':''} onClick={()=>setTab(x)}>{x}</button>)}</nav>{tab==='overview'&&<section className="cards"><article><small>INTRUSIONS</small><strong>{data.alerts?.length||0}</strong></article><article><small>BLOCKS</small><strong>{data.blocks?.length||0}</strong></article><article><small>ENFORCEMENTS</small><strong>{data.enforcements?.length||0}</strong></article><article><small>TEAMS</small><strong>{data.teams?.length||0}</strong></article></section>}{tab==='incidents'&&<section className="panel"><h2>Intrusion alerts</h2>{(data.alerts||[]).map(a=><div className="row" key={a.id}><b>{a.event_type}</b><span>{a.endpoint||'unknown'} · {a.risk_score}/100</span></div>)}</section>}{tab==='enforcement'&&<section className="panel"><h2>Enforcement</h2>{(data.enforcements||[]).map(a=><div className="row" key={a.id}><b>{a.action}</b><span>{a.reason} · {a.user_id}</span></div>)}</section>}{tab==='teams'&&<section className="panel"><h2>Teams</h2>{(data.teams||[]).map(t=><div className="row" key={t.id}><b>{t.name}</b><span>{t.description||''}</span></div>)}</section>}{reauth&&<Reauth email={email} onDone={()=>{setReauth(false);setError('Reauthentication complete. High-risk actions are unlocked for 5 minutes.')}} onCancel={()=>setReauth(false)}/>}</main>;
}

function App(){const [ready,setReady]=React.useState(false);const [authorized,setAuthorized]=React.useState(false);const [reset,setReset]=React.useState(window.location.pathname==='/reset-password');React.useEffect(()=>{if(!supabase){setReady(true);return;}let mounted=true;(async()=>{try{const {data:{session}}=await supabase.auth.getSession();if(!session){if(mounted)setReady(true);return;}const {data:admin,error:adminError}=await supabase.rpc('is_security_admin');if(adminError)throw adminError;if(!admin)throw new Error('Not an admin');const r=await fetch(`${url}/functions/v1/admin-control-center`,{headers:{Authorization:`Bearer ${session.access_token}`}});if(r.ok&&mounted)setAuthorized(true);}catch(e){if(mounted)setAuthorized(false);}finally{if(mounted)setReady(true);}})();const {data:{subscription}}=supabase.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY'&&mounted)setReset(true);});return()=>{mounted=false;subscription.unsubscribe();};},[]);if(!supabase)return <Setup/>;if(reset)return <ResetPassword onDone={()=>{window.history.replaceState({},'', '/');setReset(false)}}/>;if(!ready)return <Shell><h1>Security console</h1><p>Checking your access…</p></Shell>;if(!authorized)return <Login onDone={()=>setAuthorized(true)}/>;return <Dashboard onSignOut={async()=>{await supabase.auth.signOut();setAuthorized(false)}}/>;}

createRoot(document.getElementById('root')).render(<App/>);
