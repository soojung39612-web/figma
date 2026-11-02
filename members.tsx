import {GuestReservationLookup} from './reservation-lookup';
import {createDemoMeasurement,normalizeMeasurements} from './measurements';
import {createContext,useCallback,useContext,useEffect,useRef,useState,type Dispatch,type ReactNode,type SetStateAction} from 'react';
import {createClient,type User} from '@supabase/supabase-js';
import {authConfig} from './auth-config';
import {addCartItem,normalizeCart} from './cart';

import {mergeMemberChanges,type MemberData} from './member-sync';
import {GuestOrderLookup} from './guest-orders';
type SyncStatus='saved'|'saving'|'error';
const tabIdentity=sessionStorage.getItem('myfit-tab-id')??crypto.randomUUID();sessionStorage.setItem('myfit-tab-id',tabIdentity);
const authStorageKey='myfit-auth-v3:'+tabIdentity;
async function timedFetch(input:RequestInfo|URL,init?:RequestInit){
 const controller=new AbortController();const abort=()=>controller.abort();
 if(init?.signal?.aborted)controller.abort();else init?.signal?.addEventListener('abort',abort,{once:true});
 const timeout=setTimeout(abort,12000);
 try{return await fetch(input,{...init,signal:controller.signal})}finally{clearTimeout(timeout);init?.signal?.removeEventListener('abort',abort)}
}
const client=authConfig.url&&authConfig.publishableKey?createClient(authConfig.url,authConfig.publishableKey,{global:{fetch:timedFetch},auth:{storage:sessionStorage,storageKey:authStorageKey,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
const guestKey='myfit-guest-v3';
const pendingKey=(id:string)=>'myfit-pending-v3:'+id;
export function readGuest():MemberData {
 try{const raw=sessionStorage.getItem(guestKey);return raw?JSON.parse(raw):{cart:[],orders:[],order:null,booking:null,reservations:[],address:{name:'',phone:'',address:''}}}catch{return {cart:[],orders:[]}}
}

function initialMember(user:User):MemberData {
  return {cart:[],orders:[],order:null,booking:null,scan:false,measurements:[],favorite:false,address:{name:String(user.user_metadata.full_name??''),phone:String(user.user_metadata.phone??''),address:String(user.user_metadata.address??'')}};
}

type MemberContext={
  user:User|null; configured:boolean; recovery:boolean; changePassword:(password:string)=>Promise<void>; data:MemberData; status:SyncStatus; error:string;
  update:(key:string,value:unknown|((old:unknown)=>unknown))=>void;
  signIn:(email:string,password:string,keepCart:boolean)=>Promise<void>;
  signUp:(email:string,password:string,name:string,phone:string,address:string,keepCart:boolean)=>Promise<boolean>;
  signOut:()=>Promise<void>; retry:()=>Promise<void>; flush:()=>Promise<void>;
};
const Context=createContext<MemberContext|null>(null);

export function MemberProvider({children}:{children:ReactNode}){
  const [user,setUser]=useState<User|null>(null);const [recovery,setRecovery]=useState(false);const [data,setData]=useState<MemberData>({});
  const [loading,setLoading]=useState(Boolean(client));const [status,setStatus]=useState<SyncStatus>('saved');const [error,setError]=useState('');
  const owner=useRef<User|null>(null);const latest=useRef<MemberData>({});const confirmed=useRef<MemberData>({});const revision=useRef(0);const exists=useRef(false);const dirty=useRef(false);const ready=useRef(!client);const pendingMerge=useRef(false);const saving=useRef<Promise<void>|null>(null);const generation=useRef(0);
  const flush=useCallback(async()=>{
    while(saving.current){await saving.current;}
    if(!client||!owner.current||!ready.current||!dirty.current)return;
    const identity=owner.current.id;const currentGeneration=generation.current;
    const task=(async()=>{
      try{
        setStatus('saving');setError('');let conflicts=0;
        while(dirty.current&&owner.current?.id===identity&&generation.current===currentGeneration){
          const snapshot=latest.current;
          const query=exists.current
            ?client.from('myfit_members').update({data:snapshot,revision:revision.current+1}).eq('user_id',identity).eq('revision',revision.current).select('revision')
            :client.from('myfit_members').insert({user_id:identity,data:snapshot,revision:1}).select('revision');
          const {data:rows,error:failure}=await query;
          if(owner.current?.id!==identity||generation.current!==currentGeneration)return;
          if((!failure&&!rows?.length)||failure?.code==='23505'){
            if(++conflicts>3)throw new Error('저장 요청이 겹쳤습니다. 잠시 후 다시 시도해 주세요.');
            const {data:remote,error:readError}=await client.from('myfit_members').select('data,revision').eq('user_id',identity).maybeSingle();
            if(readError||!remote)throw readError??new Error('회원 데이터를 다시 확인해 주세요.');
            if(owner.current?.id!==identity||generation.current!==currentGeneration)return;
            latest.current=mergeMemberChanges(confirmed.current,latest.current,remote.data);confirmed.current=remote.data;
            revision.current=remote.revision;exists.current=true;setData(latest.current);continue;
          }
          if(failure)throw failure;
          revision.current=rows![0].revision;exists.current=true;confirmed.current=snapshot;
          if(snapshot===latest.current)dirty.current=false;
        }
        if(owner.current?.id===identity&&generation.current===currentGeneration){sessionStorage.removeItem(pendingKey(identity));setStatus('saved');}
      }catch(e){
        if(owner.current?.id===identity){sessionStorage.setItem(pendingKey(identity),JSON.stringify({base:confirmed.current,data:latest.current}));setStatus('error');setError('계정 저장에 실패했습니다. 다시 시도해 주세요. 미저장 내용은 이 탭의 해당 계정에만 임시 보관됩니다.');}
        throw e;
      }
    })();saving.current=task;
    try{await task}finally{if(saving.current===task)saving.current=null;}
  },[]);

  useEffect(()=>{
    if(!client){const guest=readGuest();latest.current=guest;setData(guest);return;}
    let active=true;
    const {data:{subscription}}=client.auth.onAuthStateChange((event,session)=>{
      if(event==='PASSWORD_RECOVERY')setRecovery(true);
      if(!active)return;
      const next=session?.user??null;
      if(owner.current?.id!==next?.id){ready.current=false;setLoading(true);}
      owner.current=next;setUser(next);
    });
    client.auth.getSession().then(({data:{session},error:failure})=>{
      if(!active)return;
      if(failure)setError('로그인 상태를 확인하지 못했습니다.');
      owner.current=session?.user??null;setUser(session?.user??null);
      if(!session?.user){const guest=readGuest();latest.current=guest;setData(guest);ready.current=true;setLoading(false);}
    });
    return()=>{active=false;subscription.unsubscribe();};
  },[]);

  useEffect(()=>{
    const current=++generation.current;
    dirty.current=false;exists.current=false;revision.current=0;setError('');setStatus('saved');
    if(!user){const guest=readGuest();latest.current=guest;setData(guest);ready.current=true;setLoading(false);return;}
    ready.current=false;setLoading(true);
    (async()=>{
      try{
        const {data:record,error:failure}=await client!.from('myfit_members').select('data,revision').eq('user_id',user.id).maybeSingle();
        if(failure)throw failure;
        if(current!==generation.current)return;
        const loaded:MemberData={...initialMember(user),...(record?.data??{})};
        revision.current=record?.revision??0;exists.current=Boolean(record);confirmed.current={...loaded};
        try{const pending=JSON.parse(sessionStorage.getItem(pendingKey(user.id))??'null');if(pending){Object.assign(loaded,mergeMemberChanges(pending.base,pending.data,loaded));dirty.current=true;}}catch{/* Ignore a malformed cache, never another account's cache. */}
        // Seed a completed visit once for the presentation; preserve actual measurements.
        if(loaded.scanPresentationVersion!==2){
          const actual=normalizeMeasurements(loaded.measurements).filter(row=>!row.example);
          loaded.measurements=actual.length?actual:[createDemoMeasurement(user.id)];
          loaded.scanPresentationVersion=2;loaded.scanDemoDismissed=false;dirty.current=true;
        }
        let mergedGuestCart=false;
        if(pendingMerge.current){
          const guest=readGuest();
          loaded.cart=normalizeCart(guest.cart).reduce((items,item)=>addCartItem(items,item),normalizeCart(loaded.cart));
          // Only the explicitly selected guest basket is transferred, never another visitor's profile/order data.
          pendingMerge.current=false;dirty.current=true;mergedGuestCart=true;
        }
        latest.current=loaded;setData(loaded);ready.current=true;
        if(dirty.current){await flush();if(mergedGuestCart){const guest=readGuest();guest.cart=[];sessionStorage.setItem(guestKey,JSON.stringify(guest));}}
        setLoading(false);
      }catch{
        if(current!==generation.current)return;
        ready.current=false;setStatus('error');setError('회원 데이터를 불러오지 못했습니다. 기존 데이터는 그대로 보관되어 있습니다.');setLoading(false);
      }
    })();
  },[user?.id,flush]);

  useEffect(()=>{
    if(!dirty.current||!user||!ready.current)return;
    const timer=setTimeout(()=>{void flush().catch(()=>{});},350);
    return()=>clearTimeout(timer);
  },[data,user?.id,flush]);
  useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(owner.current&&dirty.current){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[]);

  function update(key:string,value:unknown|((old:unknown)=>unknown)){
    if(!ready.current)throw new Error('회원 데이터를 불러온 후 다시 시도해 주세요.');
    const old=latest.current;const next=typeof value==='function'?(value as (old:unknown)=>unknown)(old[key]):value;
    latest.current={...old,[key]:next};setData(latest.current);
    if(owner.current){dirty.current=true;setStatus('saving');}
    else{try{sessionStorage.setItem(guestKey,JSON.stringify(latest.current));}catch{setError('이 기기에 정보를 저장할 공간이 부족합니다.');}}
  }
  async function signIn(email:string,password:string,keepCart:boolean){
    if(!client)throw new Error('로그인 서비스를 준비하고 있습니다. 잠시 후 다시 이용해 주세요.');
    pendingMerge.current=keepCart;
    const {error:failure}=await client.auth.signInWithPassword({email,password});
    if(failure){pendingMerge.current=false;throw failure;}
  }
  async function signUp(email:string,password:string,name:string,phone:string,address:string,keepCart:boolean){
    if(!client)throw new Error('회원가입 서비스를 준비하고 있습니다. 잠시 후 다시 이용해 주세요.');
    pendingMerge.current=keepCart;
    const {data:result,error:failure}=await client.auth.signUp({email,password,options:{data:{full_name:name,phone,address},emailRedirectTo:location.origin+'/#account'}});
    if(failure){pendingMerge.current=false;throw failure;}
    if(!result.session)pendingMerge.current=false;
    return Boolean(result.session);
  }
  async function changePassword(password:string){if(!client)throw new Error('로그인을 확인해 주세요.');const {error:failure}=await client.auth.updateUser({password});if(failure)throw failure;setRecovery(false);}
  async function signOut(){
    if(!client)return;
    const identity=owner.current?.id;
    try{await flush()}catch{/* The unsaved draft is already keyed to this account, so logout remains available. */}
    if(identity&&dirty.current)sessionStorage.setItem(pendingKey(identity),JSON.stringify({base:confirmed.current,data:latest.current}));
    try{const {error:failure}=await client.auth.signOut({scope:'local'});if(failure)throw failure;}
    catch{sessionStorage.removeItem(authStorageKey);sessionStorage.removeItem(authStorageKey+'-code-verifier');location.replace(location.pathname+location.search+'#home');location.reload();return;}
    pendingMerge.current=false;sessionStorage.removeItem(guestKey);owner.current=null;latest.current=readGuest();confirmed.current={};dirty.current=false;ready.current=true;setData(latest.current);setUser(null);
  }
  async function retry(){if(ready.current){await flush();return;}location.reload();}
  const context:MemberContext={user,configured:Boolean(client),recovery,changePassword,data,status,error,update,signIn,signUp,signOut,retry,flush};
  if(loading)return <div className="app-shell member-loading" role="status"><strong>MYFIT</strong><span>회원 정보를 불러오고 있어요…</span></div>;
  if(user&&!ready.current)return <div className="app-shell member-loading"><strong>MYFIT</strong><p role="alert">{error}</p><button className="pill primary" onClick={()=>location.reload()}>다시 불러오기</button><button className="pill secondary" onClick={()=>void signOut()}>로그아웃</button></div>;
  return <Context.Provider value={context}><div key={user?.id??'guest'}>{children}</div></Context.Provider>;
}

export function useMember(){const context=useContext(Context);if(!context)throw new Error('MemberProvider is missing');return context;}
export function useMemberField<T,>(key:string,initial:T,migrate?:(value:unknown)=>T):readonly[T,Dispatch<SetStateAction<T>>]{
  const {data,update}=useMember();const current=Object.prototype.hasOwnProperty.call(data,key)?data[key]:initial;
  const value=migrate?migrate(current):current as T;
  const set:Dispatch<SetStateAction<T>>=next=>update(key,(old:unknown)=>{
    const base=old===undefined?initial:migrate?migrate(old):old as T;
    return typeof next==='function'?(next as (previous:T)=>T)(base):next;
  });
  return [value,set] as const;
}

export function AuthPanel({onDone,beforeLogin,allowGuestLookup=true,guestKind='orders'}:{onDone:()=>void;beforeLogin?:()=>void;allowGuestLookup?:boolean;guestKind?:'orders'|'reservations'}){
  const auth=useMember();const [tab,setTab]=useState<'login'|'signup'|'reset'|'find'|'help'|'guest'>('login');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('');const [keepCart,setKeepCart]=useState(false);
  const guestCount=normalizeCart(auth.data.cart).reduce((sum,item)=>sum+item.qty,0);
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy)return;const form=new FormData(event.currentTarget);const email=String(form.get('email')).trim();const password=String(form.get('password')??'');setBusy(true);setError('');setMessage('');
    try{
      if(auth.recovery){if(password!==String(form.get('confirmPassword')))throw new Error('비밀번호 확인이 일치하지 않습니다.');await auth.changePassword(password);onDone();
      }else if(tab==='find'){
        const response=await fetch(authConfig.url+'/functions/v1/myfit-account-lookup',{method:'POST',headers:{'Content-Type':'application/json',apikey:authConfig.publishableKey},body:JSON.stringify({name:String(form.get('name')).trim(),phone:String(form.get('phone')).trim()})});
        const result=await response.json();if(!response.ok)throw new Error(result.error||'아이디를 조회하지 못했습니다.');
        setMessage(result.emails?.length?'가입한 아이디(이메일): '+result.emails.join(', '):'일치하는 가입 정보를 찾지 못했습니다. 이름과 가입한 연락처를 확인해 주세요.');
      }else if(tab==='reset'){
        const {error:failure}=await client!.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/#account'});if(failure)throw failure;setMessage('가입된 이메일이라면 비밀번호 재설정 안내를 보냈습니다.');
      }else if(tab==='signup'){
        if(password!==String(form.get('confirmPassword')))throw new Error('비밀번호 확인이 일치하지 않습니다.');
        if(!form.get('consent'))throw new Error('회원정보 저장 동의가 필요합니다.');
        beforeLogin?.();const signedIn=await auth.signUp(email,password,String(form.get('name')).trim(),String(form.get('phone')).trim(),[form.get('address'),form.get('detail')].filter(Boolean).join(' ').trim(),keepCart);
        if(signedIn)onDone();else setMessage('이메일을 확인해 가입을 완료한 다음 로그인해 주세요.');
      }else{beforeLogin?.();await auth.signIn(email,password,keepCart);onDone();}
    }catch(e){const code=(e as {code?:string}).code;setError(tab==='find'&&e instanceof Error?e.message:code==='invalid_credentials'?'이메일 또는 비밀번호를 확인해 주세요.':code==='email_not_confirmed'?'이메일 인증을 완료한 후 로그인해 주세요.':code==='over_email_send_rate_limit'?'이메일 전송 요청이 많습니다. 잠시 후 다시 시도해 주세요.':e instanceof Error&&/비밀번호 확인|회원정보 저장/.test(e.message)?e.message:'요청을 처리하지 못했습니다. 입력 내용을 확인하고 다시 시도해 주세요.');}finally{setBusy(false);}
  }
  if(auth.recovery)return <form onSubmit={submit}><p className="muted">새 비밀번호를 설정해 주세요.</p><label>새 비밀번호<input type="password" name="password" autoComplete="new-password" minLength={8} maxLength={128} required/></label><label>비밀번호 확인<input type="password" name="confirmPassword" autoComplete="new-password" minLength={8} maxLength={128} required/></label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="pill primary" type="submit" disabled={busy}>{busy?'저장 중…':'비밀번호 변경'}</button></form>;
  if(auth.user)return <div className="auth-signed-in"><p>{auth.user.email}</p><button className="pill primary" onClick={onDone}>마이페이지로 이동</button></div>;
  const changeTab=(next:typeof tab)=>{setTab(next);setError('');setMessage('')};
  if(tab==='help')return <div className="account-help"><p className="muted">찾으려는 정보를 선택해 주세요.</p><button className="pill secondary" onClick={()=>changeTab('find')}>아이디(이메일) 찾기</button><button className="pill secondary" onClick={()=>changeTab('reset')}>비밀번호 찾기</button><button className="auth-reset" onClick={()=>changeTab('login')}>로그인으로 돌아가기</button></div>;
  if(tab==='guest')return <><div className="auth-tabs"><button onClick={()=>changeTab('login')}>로그인</button><button className="selected">비회원</button></div>{guestKind==='reservations'?<GuestReservationLookup/>:<GuestOrderLookup/>}</>;
  return <div className="auth-panel"><p className="muted auth-intro">내 발에 맞춘 쇼핑을 이어가세요.<br/>장바구니와 주문 내역을 계정에 보관합니다.</p>{allowGuestLookup&&tab==='login'&&<div className="auth-tabs"><button className="selected">로그인</button><button onClick={()=>changeTab('guest')}>비회원</button></div>}
  {!auth.configured&&<p className="auth-notice" role="status">로그인 서비스를 준비하고 있어요. 연결이 완료되면 회원가입과 계정 저장을 이용할 수 있습니다.</p>}<form onSubmit={submit}>
    {tab==='find'&&<><h3>아이디(이메일) 찾기</h3><p className="muted">가입한 이름과 연락처를 입력해 주세요. 개인정보 보호를 위해 이메일 일부만 표시합니다.</p></>}
    {tab==='signup'&&<h3 className="signup-title">회원가입</h3>}{(tab==='signup'||tab==='find')&&<><label>이름<input name="name" autoComplete="name" required maxLength={30}/></label><label>연락처<input name="phone" autoComplete="tel" type="tel" required pattern="[0-9+() -]{8,20}"/></label></>}
    {tab==='signup'&&<><label>주소<input name="address" autoComplete="street-address" required maxLength={150} placeholder="도로명 또는 지번 주소"/></label><label>상세주소<input name="detail" autoComplete="address-line2" maxLength={100} placeholder="동·호수 등"/></label></>}{tab!=='find'&&<label>이메일<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="name@example.com"/></label>}
    {(tab==='login'||tab==='signup')&&<label>비밀번호<input name="password" type="password" autoComplete={tab==='signup'?'new-password':'current-password'} required minLength={8} maxLength={128} placeholder={tab==='signup'?'8자 이상 입력하세요':'비밀번호를 입력하세요'} disabled={!auth.configured}/></label>}
    {tab==='signup'&&<><label>비밀번호 확인<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} disabled={!auth.configured}/></label><label className="check-label"><input type="checkbox" name="consent" required/>이름·연락처·쇼핑 정보를 계정에 저장하는 데 동의합니다.</label></>}
    {guestCount>0&&(tab==='login'||tab==='signup')&&<label className="check-label"><input type="checkbox" checked={keepCart} onChange={e=>setKeepCart(e.target.checked)}/>현재 장바구니 {guestCount}개를 내 계정에 함께 저장</label>}
    {error&&<p role="alert" className="form-error">{error}</p>}{message&&<p role="status" className="form-success">{message}</p>}
    <button type="submit" className="pill primary" disabled={busy||!auth.configured}>{busy?'처리 중…':tab==='signup'?'회원가입':tab==='reset'?'재설정 이메일 보내기':tab==='find'?'아이디 찾기':'로그인'}</button>
    {tab==='login'&&<><button type="button" className="pill secondary" onClick={()=>changeTab('signup')}>회원가입</button><button type="button" className="auth-reset" onClick={()=>changeTab('help')}>아이디 또는 비밀번호를 잊으셨나요?</button></>}
    {tab!=='login'&&<button type="button" className="auth-reset" onClick={()=>changeTab('login')}>로그인으로 돌아가기</button>}

  </form></div>;
}
