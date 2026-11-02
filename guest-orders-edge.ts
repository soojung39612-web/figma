const url=Deno.env.get('SUPABASE_URL')!,secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const origins=new Set(['https://kda01.kro.kr','https://figma-seven-silk.vercel.app']);
const serverHeaders={apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'};
const prices=[179000,159000,139000,139000,169000,159000,169000,149000,139000,199000,219000,219000,189000,139000,119000],extras=[39900,34900,0];
async function hash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin');const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':origin&&origins.has(origin)?origin:'https://kda01.kro.kr','Access-Control-Allow-Headers':'apikey,content-type,authorization,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
 const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!origins.has(origin))return reply(403,{error:'허용되지 않은 요청입니다.'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});if(req.method!=='POST')return reply(405,{error:'지원하지 않는 요청입니다.'});
 try{
  const text=await req.text();if(text.length>8192)return reply(413,{error:'요청이 너무 큽니다.'});const body=JSON.parse(text),creating=body.action==='create';
  if(!creating&&body.action!=='lookup')return reply(400,{error:'올바른 요청이 아닙니다.'});
  const input=creating?body.order:body;const delivery=creating?input?.delivery:body;
  const id=String(input?.id??'').trim().toUpperCase(),name=String(delivery?.name??'').trim(),phone=String(delivery?.phone??'').replace(/\D/g,'');
  if(!/^NMF-[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/.test(id)||!name||name.length>30||!/^01\d{8,9}$/.test(phone))return reply(400,{error:'주문번호·이름·전화번호를 정확히 입력해 주세요.'});
  const lookupHash=await hash(id+'|'+name+'|'+phone),endpoint=url+'/rest/v1/myfit_guest_orders';
  const find=async()=>{const response=await fetch(endpoint+'?select=data&lookup_hash=eq.'+lookupHash,{headers:serverHeaders});if(!response.ok)throw new Error('unavailable');return await response.json()};
  const found=await find();if(found.length)return reply(200,{order:found[0].data});
  if(!creating)return reply(404,{error:'일치하는 주문을 찾지 못했습니다. 주문번호·이름·전화번호를 확인해 주세요.'});
  if(!Array.isArray(input.items)||!input.items.length||input.items.length>45||!delivery.address||String(delivery.address).length>150||String(delivery.detail??'').length>100)return reply(400,{error:'상품과 배송 정보를 확인해 주세요.'});
  let total=0;const items=[];for(const item of input.items){if(!Number.isInteger(item.product)||item.product<0||item.product>=prices.length||!Number.isInteger(item.insole)||item.insole<0||item.insole>2||!Number.isInteger(item.qty)||item.qty<1||item.qty>99)return reply(400,{error:'상품 구성을 확인해 주세요.'});items.push({product:item.product,insole:item.insole,qty:item.qty});total+=(prices[item.product]+extras[item.insole])*item.qty;}
  const fingerprint=await hash(phone+'|'+secret);const limit=await fetch(endpoint+'?select=id&phone_fingerprint=eq.'+fingerprint+'&created_at=gte.'+encodeURIComponent(new Date(Date.now()-86400000).toISOString())+'&limit=10',{headers:serverHeaders});if(!limit.ok)throw new Error('limit');if((await limit.json()).length>=10)return reply(429,{error:'오늘 주문 요청이 많습니다. 나중에 다시 시도해 주세요.'});
  const data={id,items,total,guest:true,createdAt:new Date().toISOString(),paymentMethod:['신용/체크카드','간편결제','무통장 입금'].includes(input.paymentMethod)?input.paymentMethod:'신용/체크카드',delivery:{name,phone:'***-****-'+phone.slice(-4),address:String(delivery.address).trim(),detail:String(delivery.detail??'').trim()}};
  const saved=await fetch(endpoint,{method:'POST',headers:{...serverHeaders,Prefer:'return=minimal'},body:JSON.stringify({id,lookup_hash:lookupHash,phone_fingerprint:fingerprint,data})});
  if(saved.status===409){const retry=await find();if(retry.length)return reply(200,{order:retry[0].data});}
  if(!saved.ok)throw new Error('save');return reply(200,{order:data});
 }catch{return reply(503,{error:'주문 서비스를 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'});}
});
