import {normalizeCart,itemKey} from './cart.ts';
export type MemberData=Record<string,unknown>;
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function mergeMemberChanges(base:MemberData,local:MemberData,remote:MemberData):MemberData{
 const result={...remote};
 for(const key of Object.keys(local)){
  if(equal(base[key],local[key]))continue;
  if(key==='cart'){
   const before=normalizeCart(base.cart),after=normalizeCart(local.cart),current=normalizeCart(remote.cart);
   const keys=new Set([...before,...after].map(itemKey));
   for(const id of keys){
    const old=before.find(row=>itemKey(row)===id),next=after.find(row=>itemKey(row)===id);
    const delta=(next?.qty??0)-(old?.qty??0);if(!delta)continue;
    const index=current.findIndex(row=>itemKey(row)===id),quantity=(index<0?0:current[index].qty)+delta;
    if(quantity<=0){if(index>=0)current.splice(index,1);}
    else if(index>=0)current[index]={...current[index],qty:Math.min(99,quantity)};
    else if(next)current.push({...next,qty:Math.min(99,quantity)});
   }
   result.cart=current;
  }else if((key==='reservations'||key==='orders')&&Array.isArray(local[key])){
   const rows=(value:unknown)=>Array.isArray(value)?value.filter(row=>row&&typeof row==='object'):[];
   const id=(row:Record<string,unknown>)=>String(row.id??JSON.stringify(row));
   const before=rows(base[key]),after=rows(local[key]),removed=new Set(before.filter(row=>!after.some(next=>id(next)===id(row))).map(id));
   const merged=new Map(rows(remote[key]).filter(row=>!removed.has(id(row))).map(row=>[id(row),row]));
   for(const row of after)if(!before.some(old=>id(old)===id(row)&&equal(old,row)))merged.set(id(row),row);
   result[key]=[...merged.values()].sort((a,b)=>String(b.createdAt??'').localeCompare(String(a.createdAt??'')));
  }else result[key]=local[key];
 }
 return result;
}
