const baseUrl=Deno.env.get('SUPABASE_URL')!;
const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const origins=new Set(['https://kda01.kro.kr','https://figma-seven-silk.vercel.app']);
async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin');
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':origin&&origins.has(origin)?origin:'https://kda01.kro.kr','Access-Control-Allow-Headers':'apikey,content-type,authorization,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
 const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!origins.has(origin))return reply(403,{error:'허용되지 않은 요청입니다.'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{error:'지원하지 않는 요청입니다.'});
 try{
  const text=await req.text();if(text.length>1024)return reply(413,{error:'요청이 너무 큽니다.'});
  const body=JSON.parse(text);const name=String(body.name??'').trim(),phone=String(body.phone??'').replace(/\D/g,'');
  if(!name||name.length>30||!/^01\d{8,9}$/.test(phone))return reply(400,{error:'이름과 가입한 휴대전화 번호를 정확히 입력해 주세요.'});
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0].trim()??'unknown';
  const response=await fetch(baseUrl+'/rest/v1/rpc/myfit_find_email',{method:'POST',headers:{apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify({lookup_name:name,lookup_phone:phone,request_fingerprint:await digest(ip+'|'+secret)})});
  if(!response.ok)throw new Error('unavailable');const result=await response.json();
  if(result.error==='rate_limit')return reply(429,{error:'조회 요청이 많습니다. 15분 후 다시 시도해 주세요.'});
  if(result.error)throw new Error('invalid');
  return reply(200,{emails:result.emails??[]});
 }catch{return reply(503,{error:'아이디를 조회하지 못했습니다. 잠시 후 다시 시도해 주세요.'});}
});
