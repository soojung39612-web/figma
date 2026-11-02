import {useState} from 'react';
import {authConfig} from './auth-config';
import {products} from './catalog';
import {normalizeOrder,type Order} from './cart';
async function request(body:unknown):Promise<Order>{
 const response=await fetch(authConfig.url+'/functions/v1/myfit-guest-orders',{method:'POST',headers:{'Content-Type':'application/json',apikey:authConfig.publishableKey},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 const result=await response.json();if(!response.ok)throw new Error(result.error??'주문 정보를 확인하지 못했습니다.');
 const order=normalizeOrder(result.order);if(!order)throw new Error('주문 정보를 확인하지 못했습니다.');return order;
}
export const saveGuestOrder=(order:Order)=>request({action:'create',order});
export function GuestOrderLookup(){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[order,setOrder]=useState<Order|null>(null);
 return <><h3>비회원 주문 조회</h3><p className="muted">주문할 때 받은 주문번호와 이름·전화번호를 입력해 주세요.</p><form onSubmit={async event=>{event.preventDefault();if(busy)return;const data=new FormData(event.currentTarget);setBusy(true);setError('');setOrder(null);try{setOrder(await request({action:'lookup',id:String(data.get('id')).trim().toUpperCase(),name:String(data.get('name')).trim(),phone:String(data.get('phone'))}))}catch(e){setError(e instanceof Error?e.message:'조회하지 못했습니다.')}finally{setBusy(false)}}}><label>주문번호<input name="id" required maxLength={50} placeholder="NMF-로 시작하는 주문번호"/></label><label>주문자 이름<input name="name" autoComplete="name" required maxLength={30}/></label><label>휴대전화 번호<input name="phone" type="tel" required placeholder="010-1234-5678"/></label>{error&&<p role="alert" className="form-error">{error}</p>}<button className="pill primary" disabled={busy} type="submit">{busy?'조회 중…':'구매 내역 조회'}</button></form>{order&&<section className="guest-order-result" role="status"><h3>구매 내역</h3><dl><dt>주문번호</dt><dd>{order.id}</dd><dt>주문일</dt><dd>{order.createdAt?new Date(order.createdAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'—'}</dd><dt>받는 분</dt><dd>{order.delivery?.name} · {order.delivery?.phone}</dd><dt>배송 주소</dt><dd>{order.delivery?.address} {order.delivery?.detail}</dd></dl>{order.items.map(item=><div className="guest-order-line" key={item.product+':'+item.insole}>{products[item.product].name} · 수량 {item.qty}</div>)}<p>총 {order.total.toLocaleString('ko-KR')}원</p><p className="demo-note">수업 시연용 주문 · 실제 청구 및 배송 없음</p></section>}</>;
}
