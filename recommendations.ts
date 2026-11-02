import {products} from './catalog.ts';
import type {Measurement} from './measurements.ts';
const selections=[[0,1,2,11],[3,9,14,2],[7,6,13,4,5],[2,8,9]];
export function purposeProducts(purpose:number){return (selections[purpose]??selections[0]).filter(index=>index<products.length).map(index=>({...products[index],index}));}
export function memberRecommendations(purpose:number,measurement:Measurement|undefined){
 if(!measurement||(measurement.example&&!measurement.demo))return [];
 const wide=/넓|2E|4E/i.test(measurement.widthLabel),low=/낮/.test(measurement.archLabel);
 const length=Math.max(measurement.leftLength,measurement.rightLength);
 return purposeProducts(purpose).map((product,position)=>({...product,rank:(wide&&product.index===0?6:0)+(low&&product.index===1?8:0)+(length>=280&&product.index===2?3:0)-position,profileReason:`${measurement.demo?'시연값':'실측'} ${length}mm · ${measurement.widthLabel} · ${measurement.archLabel} 정보를 참고한 용도별 후보입니다. 상품별 사이즈와 발볼 옵션을 확인해 주세요.`})).sort((a,b)=>b.rank-a.rank);
}
