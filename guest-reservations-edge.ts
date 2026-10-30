// Public guest flow: a high-entropy reservation code plus phone number authorizes lookup.
// Server-only key remains in the Edge Function environment. No browser gets table access.
const baseUrl=Deno.env.get('SUPABASE_URL')!;
const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const allowedOrigins=new Set(['https://kda01.kro.kr','https://figma-seven-silk.vercel.app']);
const baseHeaders={apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'};
const selection='id,guest_name,phone_last4,store_id,visit_date,visit_time,created_at';
async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
function reservation(row:Record<string,any>,code:string){const [year,month,day]=row.visit_date.split('-').map(Number);return {id:row.id,code,createdAt:row.created_at,year,month,day,store:row.store_id,time:row.visit_time,name:row.guest_name,phoneLast4:row.phone_last4,guest:true};}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin');
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':origin&&allowedOrigins.has(origin)?origin:'https://kda01.kro.kr','Access-Control-Allow-Headers':'apikey,content-type,authorization,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
 const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!allowedOrigins.has(origin))return reply(403,{error:'이 사이트에서는 예약을 요청할 수 없습니다.'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{error:'지원하지 않는 요청입니다.'});
 if(Number(req.headers.get('content-length')??0)>4096)return reply(413,{error:'요청이 너무 큽니다.'});
 try{
  const text=await req.text();if(text.length>4096)return reply(413,{error:'요청이 너무 큽니다.'});
  const body=JSON.parse(text);const action=body.action;const phone=String(body.phone??'').replace(/\D/g,'');const code=String(body.code??'').trim().toUpperCase();
  if(!/^01\d{8,9}$/.test(phone)||!/^MG-[A-F0-9]{24}$/.test(code))return reply(400,{error:'예약번호와 연락처를 정확히 입력해 주세요.'});
  const lookupHash=await digest(code+'|'+phone);
  const lookup=await fetch(baseUrl+'/rest/v1/myfit_guest_reservations?select='+selection+'&lookup_hash=eq.'+lookupHash,{headers:baseHeaders});
  if(!lookup.ok)throw new Error('lookup unavailable');const existing=await lookup.json();
  if(existing.length)return reply(200,{reservation:reservation(existing[0],code)});
  if(action==='lookup')return reply(404,{error:'예약번호 또는 연락처가 일치하지 않습니다.'});
  if(action!=='create')return reply(400,{error:'올바른 예약 요청이 아닙니다.'});
  const name=String(body.name??'').trim();const slot=body.slot??{};const year=Number(slot.year),month=Number(slot.month),day=Number(slot.day),store=Number(slot.store),time=String(slot.time??'');
  const date=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;const parsed=new Date(date+'T00:00:00Z');
  if(body.consent!==true||name.length<1||name.length>30||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(String(body.id??''))||year!==2027||month<4||month>12||day<12||day>15||!Number.isInteger(store)||store<0||store>2||!['10:00','11:00','14:00','16:00'].includes(time)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)return reply(400,{error:'예약자 정보와 예약 일정을 확인해 주세요.'});
  const fingerprint=await digest(phone+'|'+secret);
  const since=new Date(Date.now()-86400000).toISOString();
  const recent=await fetch(baseUrl+'/rest/v1/myfit_guest_reservations?select=id&phone_fingerprint=eq.'+fingerprint+'&created_at=gte.'+encodeURIComponent(since)+'&limit=3',{headers:baseHeaders});
  if(!recent.ok)throw new Error('rate limit unavailable');if((await recent.json()).length>=3)return reply(429,{error:'같은 연락처로는 하루에 최대 3건까지 예약할 수 있습니다.'});
  const saved=await fetch(baseUrl+'/rest/v1/myfit_guest_reservations?select='+selection,{method:'POST',headers:{...baseHeaders,Prefer:'return=representation'},body:JSON.stringify({id:body.id,lookup_hash:lookupHash,phone_fingerprint:fingerprint,guest_name:name,phone_last4:phone.slice(-4),store_id:store,visit_date:date,visit_time:time})});
  if(saved.status===409){const retry=await fetch(baseUrl+'/rest/v1/myfit_guest_reservations?select='+selection+'&lookup_hash=eq.'+lookupHash,{headers:baseHeaders});if(retry.ok){const found=await retry.json();if(found.length)return reply(200,{reservation:reservation(found[0],code)});}return reply(409,{error:'예약 요청 정보가 변경됐습니다. 예약 화면을 새로 열어 다시 시도해 주세요.'});}
  if(!saved.ok)throw new Error('save unavailable');const rows=await saved.json();
  return reply(201,{reservation:reservation(rows[0],code)});
 }catch{return reply(503,{error:'예약 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'});}
});
