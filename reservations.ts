import {authConfig} from './auth-config.ts';
export type Reservation={id?:string;code?:string;createdAt?:string;year?:number;store:number;day:number;month:number;time:string;name?:string;phoneLast4?:string;guest?:boolean};
export const reservationKey=(r:Reservation)=>r.id??`legacy-${r.year??2027}-${r.month}-${r.day}-${r.store}-${r.time}`;
export function normalizeReservations(value:unknown):Reservation[]{
  return (Array.isArray(value)?value:value?[value]:[]).filter((r):r is Reservation=>Boolean(r)&&typeof r==='object'&&Number.isInteger(r.store)&&r.store>=0&&r.store<3&&Number.isInteger(r.month)&&r.month>=1&&r.month<=12&&Number.isInteger(r.day)&&r.day>=1&&r.day<=31&&typeof r.time==='string').sort((a,b)=>(Date.parse(b.createdAt??'')||0)-(Date.parse(a.createdAt??'')||0));
}
export const normalizedPhone=(phone:string)=>phone.replace(/\D/g,'');
export const validPhone=(phone:string)=>/^01\d{8,9}$/.test(normalizedPhone(phone));
export function createGuestReference(){return {id:crypto.randomUUID(),code:'MG-'+Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('').toUpperCase()};}
export async function guestReservationRequest(body:Record<string,unknown>):Promise<Reservation>{
  const response=await fetch(authConfig.url+'/functions/v1/myfit-guest-reservations',{method:'POST',headers:{'Content-Type':'application/json',apikey:authConfig.publishableKey},body:JSON.stringify(body)});
  const result=await response.json().catch(()=>({error:'예약 서버에 연결하지 못했습니다.'}));
  if(!response.ok)throw new Error(typeof result.error==='string'?result.error:'예약 정보를 확인해 주세요.');
  const normalized=normalizeReservations(result.reservation);
  if(!normalized.length)throw new Error('예약 정보를 확인하지 못했습니다. 다시 조회해 주세요.');
  return normalized[0];
}
