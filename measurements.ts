export type Measurement = {
  id:string; measuredAt:string|null; store:string; example:boolean;
  leftLength:number; rightLength:number; widthLabel:string; archLabel:string;
};
export const exampleMeasurement:Measurement={id:'example-gangnam',measuredAt:'2026-10-28T14:00:00+09:00',store:'나이키 강남 플래그십',example:true,leftLength:230,rightLength:232,widthLabel:'2E / 넓음',archLabel:'낮은 아치'};
export function measurementDate(value:string|null|undefined){
  if(!value||!Number.isFinite(new Date(value).getTime()))return '날짜 미등록';
  return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value));
}
export function normalizeMeasurements(value:unknown):Measurement[]{
  return (Array.isArray(value)?value:[]).filter((row):row is Measurement=>Boolean(row)&&typeof row==='object'&&typeof row.id==='string'&&typeof row.store==='string'&&typeof row.example==='boolean'&&Number.isFinite(row.leftLength)&&Number.isFinite(row.rightLength)&&typeof row.widthLabel==='string'&&typeof row.archLabel==='string').sort((a,b)=>(Date.parse(b.measuredAt??'')||0)-(Date.parse(a.measuredAt??'')||0));
}
