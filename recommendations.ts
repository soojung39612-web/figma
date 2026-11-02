import {products} from './catalog.ts';
import type {Measurement} from './measurements.ts';
const selections=[[0,1,2,11],[3,9,14,2],[7,6,13,4,5],[2,8,9]];
export function purposeProducts(purpose:number){return (selections[purpose]??selections[0]).filter(index=>index<products.length).map(index=>({...products[index],index}));}
// Classroom classifications, not Nike-certified fit or live size inventory.
type FitRule={widths:string[];arches:string[];min:number;max:number;purposes:number[];reason:string;cushion:number};
const rules:Record<number,FitRule>={
 0:{widths:['regular','wide'],arches:['normal','high'],min:220,max:300,purposes:[0,1,3],reason:'쿠셔닝 중심 러닝 분류',cushion:3},
 1:{widths:['regular','wide'],arches:['low','normal'],min:230,max:300,purposes:[0,1,2,3],reason:'지지력 중심 분류',cushion:2},
 2:{widths:['regular','wide'],arches:['normal','high'],min:220,max:305,purposes:[0,1,3],reason:'부드러운 쿠셔닝 중심 분류',cushion:3},
 3:{widths:['regular'],arches:['normal'],min:220,max:290,purposes:[1,2],reason:'워킹·일상 스타일 분류',cushion:2},
 4:{widths:['regular'],arches:['normal'],min:225,max:295,purposes:[1,2],reason:'일상 쿠셔닝 분류',cushion:2},
 5:{widths:['narrow','regular'],arches:['normal'],min:225,max:290,purposes:[2],reason:'슬림한 일상 스타일 분류',cushion:1},
 6:{widths:['regular'],arches:['normal'],min:220,max:290,purposes:[2],reason:'클래식 일상 스타일 분류',cushion:1},
 7:{widths:['regular'],arches:['normal'],min:220,max:300,purposes:[2],reason:'데일리 스니커즈 분류',cushion:1},
 8:{widths:['regular','wide'],arches:['normal'],min:230,max:300,purposes:[2],reason:'슬립온 스타일 분류',cushion:1},
 9:{widths:['regular'],arches:['normal'],min:225,max:300,purposes:[1,2,3],reason:'장시간 일상 착화 분류',cushion:3},
 10:{widths:['regular'],arches:['normal'],min:230,max:300,purposes:[2],reason:'생활 방수 일상 스타일 분류',cushion:1},
 11:{widths:['narrow','regular'],arches:['normal','high'],min:230,max:305,purposes:[0,1],reason:'반응성 중심 러닝 분류',cushion:3},
 13:{widths:['narrow','regular'],arches:['normal'],min:220,max:285,purposes:[2],reason:'가벼운 일상 스타일 분류',cushion:1},
 14:{widths:['regular'],arches:['normal'],min:220,max:290,purposes:[1,2],reason:'워킹·데일리 분류',cushion:2}
};
export function memberRecommendations(purpose:number|null,measurement:Measurement|undefined){
 if(!measurement||(measurement.example&&!measurement.demo))return [];
 const width=/넓|2E|4E/i.test(measurement.widthLabel)?'wide':/좁|슬림/.test(measurement.widthLabel)?'narrow':/보통|표준|normal|regular/i.test(measurement.widthLabel)?'regular':null;
 const arch=/낮|평발/.test(measurement.archLabel)?'low':/높|요족/.test(measurement.archLabel)?'high':/보통|표준|normal/i.test(measurement.archLabel)?'normal':null;
 const length=Math.max(measurement.leftLength,measurement.rightLength);
 if(!width||!arch||!Number.isFinite(length)||length<=0||(purpose!==null&&(purpose<0||purpose>3)))return [];
 return products.flatMap((product,index)=>{
  const rule=rules[index];if(!rule||!rule.widths.includes(width)||length<rule.min||length>rule.max)return [];
  const archMatch=rule.arches.includes(arch);
  if(purpose!==null&&(!archMatch||!rule.purposes.includes(purpose)))return [];
  const rank=(purpose===3||arch==='high'?rule.cushion*4:rule.cushion)+(arch==='low'&&index===1?10:0)+(width==='wide'&&index===0?4:0);
  return [{...product,index,rank:rank+(archMatch?100:0),profileReason:`${measurement.demo?'시연값':'실측'} ${length}mm · ${measurement.widthLabel} · ${measurement.archLabel}. ${archMatch?rule.reason+' 기준으로 우선 추천합니다.':'발 길이·발볼 기준 비교 추천입니다. 아치 지지력은 매장 착화 확인이 필요합니다.'}`}];
 }).sort((a,b)=>b.rank-a.rank||a.index-b.index).slice(0,3);
}
