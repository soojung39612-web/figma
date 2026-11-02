import {useState,useEffect,useRef} from 'react';
import {products} from './catalog';
export function chatRecommendations(text:string){
 const budgetMatches=Array.from(text.matchAll(/(\d+(?:\.\d+)?)\s*만\s*원?/g));const budgetMatch=budgetMatches[budgetMatches.length-1];const budget=budgetMatch?Number(budgetMatch[1])*10000:Infinity;
 const casual=/일상|출근|캐주얼|청바지|깔끔|스트릿|스타일/.test(text),running=/러닝|달리|런닝|조깅|마라톤/.test(text),training=/헬스|트레이닝|웨이트|운동장/.test(text),walking=/걷|워킹|산책|오래 서|장시간/.test(text);
 const wide=/발볼.{0,5}넓|넓은.{0,5}발|2e|4e|볼이.{0,3}넓/i.test(text);const dark=/검정|블랙|검은/.test(text),white=/흰색|화이트|하얀/.test(text);
 const blackIds=[0,1,2,4,5,8,14],whiteIds=[3,7,9,12,13];
 return products.map((product,index)=>{let score=0;const category=product.category??'러닝';
  if(casual&&category==='일상')score+=5;if(running&&category==='러닝')score+=6;if(training&&category==='트레이닝')score+=8;
  if(walking&&[2,3,9,14].includes(index))score+=6;if(wide&&index<3)score+=3;
  if(dark&&blackIds.includes(index))score+=3;if(white&&whiteIds.includes(index))score+=3;
  if(!casual&&!running&&!walking&&!training)score+=index<3?2:0;
  return {...product,index,score};
 }).filter(product=>product.price<=budget).sort((a,b)=>b.score-a.score||a.price-b.price).slice(0,3);
}
type Message={role:'user'|'assistant';text:string;ids?:number[]};
export function ShoeChat({onProduct}:{onProduct:(index:number)=>void}){
 const [messages,setMessages]=useState<Message[]>([{role:'assistant',text:'안녕하세요! 어떤 신발을 찾으세요? 발볼, 평소 신는 사이즈, 사용 목적, 원하는 스타일과 예산을 알려주세요. 예: “발볼이 넓고 250mm, 걷기용 검정 신발을 15만원 이하로 찾고 있어요.”'}]);
 const [input,setInput]=useState('');const log=useRef<HTMLDivElement>(null);useEffect(()=>{if(log.current)log.current.scrollTop=log.current.scrollHeight},[messages]);
 function send(value:string){const text=value.trim();if(!text)return;const context=[...messages.filter(row=>row.role==='user').map(row=>row.text),text].join(' ');const matches=chatRecommendations(context);setMessages(current=>[...current,{role:'user',text},{role:'assistant',text:matches.length?'말씀하신 용도·스타일·예산을 기준으로 골랐어요. 아래 상품을 눌러 자세히 볼 수 있습니다. 발볼과 사이즈는 상품별 옵션 및 매장 착화로 확인해 주세요.':'현재 등록된 상품 중 해당 예산에 맞는 신발을 찾지 못했어요. 예산이나 사용 목적을 조금 바꿔서 알려주세요.',ids:matches.map(row=>row.index)}]);setInput('')}
 return <div className="shoe-chat"><p className="muted">상품 조건 기반 추천 · 수업 시연용</p><div className="chat-messages" ref={log} role="log" aria-live="polite" aria-label="신발 추천 대화">{messages.map((message,index)=><section key={index} className={'chat-message '+message.role}><small>{message.role==='assistant'?'MYFIT 상담':'나'}</small><p>{message.text}</p>{message.ids?.map(id=><button className="chat-product" key={id} onClick={()=>onProduct(id)}><img src={products[id].image} alt={products[id].name}/><span><strong>{products[id].name}</strong><small>{products[id].price.toLocaleString('ko-KR')}원 · 상품 상세 보기</small></span></button>)}</section>)}</div>{messages.length===1&&<div className="chat-prompts">{['발볼이 넓어요. 러닝화를 찾고 있어요.','15만원 이하의 검정 워킹화','청바지에 어울리는 일상용 신발'].map(prompt=><button key={prompt} onClick={()=>send(prompt)}>{prompt}</button>)}</div>}<form className="chat-form" onSubmit={event=>{event.preventDefault();send(input)}}><label htmlFor="shoe-chat-input">발 정보와 원하는 스타일</label><div><input id="shoe-chat-input" value={input} onChange={event=>setInput(event.target.value)} required maxLength={500} placeholder="예: 240mm, 발볼 넓음, 일상용 15만원 이하"/><button type="submit" disabled={!input.trim()}>전송</button></div></form></div>;
}
