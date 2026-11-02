import {products} from './catalog.ts';
const selections=[[0,1,2,11],[3,9,14,2],[7,6,13,4,5],[2,8,9]];
export function purposeProducts(purpose:number){return (selections[purpose]??selections[0]).filter(index=>index<products.length).map(index=>({...products[index],index}));}
