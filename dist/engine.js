export const districts = [
  {name:"구름역세권",type:"토지",icon:"◈",x:27,y:37,npc:"한미라 중개사",line:"역이 들어선다는 말은 들으셨죠? 시청 예산안에는 설계비만 올라가 있어요.",detail:"교통 공약은 예산 의결과 착공을 거쳐야 땅값에 반영됩니다. 허가가 불확실한 땅은 개발에 실패했을 때의 가치도 함께 보세요."},
  {name:"중앙업무지구",type:"오피스",icon:"▥",x:70,y:32,npc:"민도윤 은행원",line:"임대료로 이자는 낼 수 있겠군요. 만기가 오면 원금은 어떻게 마련하실 건가요?",detail:"변동 대출은 기준금리 변화가 이자에 반영됩니다. 차환 심사에는 새 담보가치가 적용되므로, 건물값이 하락하면 추가 현금이 필요합니다."},
  {name:"철교산단",type:"공장",icon:"⚙",x:24,y:72,npc:"박서진 현장소장",line:"냉동기 대금 절반이 달러로 남아 있어요. 공사비에 여유를 두세요.",detail:"산단 공장에는 장기 임차인이 붙는 경우가 많습니다. 수출·전력 수요는 임대에 도움이 되지만 수입 장비 가격이나 전력 증설비가 수익을 줄일 수 있습니다."},
  {name:"솔빛주거지",type:"아파트",icon:"▤",x:76,y:74,npc:"유다은 세무사",line:"6월 1일에 누가 소유했는지에 따라 올해의 보유세가 달라져요.",detail:"2분기 마감에 보유세를 확정합니다. 종부세는 시장 호가가 아니라 공시가격을 용도별로 합산해 계산합니다. 매각 견적에는 양도세가 표시됩니다."}
];
const templates = [
  ["구름역 앞 나대지",0,265,0,0,.08], ["청운천 건너 필지",0,190,0,0,.08],
  ["중앙로 오피스",1,480,42,9.6,.20], ["청운타워 별관",1,680,56,9,.12],
  ["철교 제1공장",2,360,34,7,.19], ["산단 남문 작업장",2,540,47,8,.14],
  ["솔빛 리버뷰 84㎡",3,690,22,3,.08], ["솔빛초 앞 59㎡",3,410,16,2.5,.08]
];
// Currency is stored in millions of KRW. Rates are decimal annual rates.
export const fixture = {rate:.03,rateDate:"2026-10",fx:1333.28,fxDate:"2026-11-19",fxSource:"Frankfurter 저장값"};
const addAssets = (s,year) => {
  (year===1 ? templates : templates.filter((_,i)=>i%2===(year%2))).forEach(([name,d,p,r,c,v],i)=>{
    s.assets.push({id:year*10+i,name:year===1?name:name+" · "+year+"년차",d,p:p*(1+.035*(year-1)),r:r*(1+.025*(year-1)),c,v,listed:true,basis:0,debt:0});
  });
};
export function createState(length=20, macro=fixture, live=false) {
  const s={length,q:1,cash:500,assets:[],actions:0,log:[],macro:{...macro},live,shock:0,policies:{},book:{},holdTax:0,pf:null,deposit:0,option:null,done:false,started:false,eventDone:{},last:"구름역세권과 중앙업무지구에서 투자 매물을 공개했습니다."};
  addAssets(s,1);return s;
}
export const yearOf=q=>Math.ceil(q/4);
export const quarterOf=q=>(q-1)%4+1;
export const round=n=>Math.round(n*100)/100;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export const rate=s=>clamp(s.macro.rate+s.shock+(s.q>12?.005:0)-(s.q>27?.01:0),.005,.10);
export const fx=s=>s.macro.fx*(1+.04*Math.sin((s.q-1)*.5));
export const yearLedger=s=>s.book[yearOf(s.q)]??{gain:0,tax:0};
export function valuation(s,a) {
  const wave=(Math.sin((s.q-1)*.62+a.d)-Math.sin(a.d))*.025;
  const place=s.policies.rail&&a.d===0?.17:s.policies.housing&&a.d===3?-.09:0;
  const vacancy=clamp(a.v+wave+(s.q>=5&&a.d===1?.07:0)+(s.policies.housing&&a.d===3?.07:0),.02,.65);
  const noi=a.r*(1-vacancy)-a.c;
  const cap=Math.max(.025,(a.r*(1-a.v)-a.c)/a.p+(rate(s)-.03)*.65);
  const currency=a.d===2?(fx(s)/1333.28-1)*.5:0;
  const value=a.d===0||a.d===3 ? a.p*(1+wave+place-(rate(s)-.03)*(a.d===3?9:5)+.011*(s.q-1)) : noi/cap*(1+currency);
  return {value:round(Math.max(a.p*.25,value)),vacancy,noi:a.d===0?0:noi,cap};
}
export const offer=(s,a)=>round(valuation(s,a).value*(a.distress?.85:1.015));
export const buyTax=(s,a,p)=>round(p*(a.d===3?(s.assets.filter(x=>x.owned&&x.d===3).length>=3?.12:s.assets.filter(x=>x.owned&&x.d===3).length===2?.08:p<=600?.011:p>=900?.033:(p/150-3)*.011):.046));
const progressive=(n,steps)=>{
  let total=0,last=0;
  for(const [cap,percent] of steps){total+=Math.max(0,Math.min(n,cap)-last)*percent;last=cap;if(n<=cap)break;}
  return total;
};
const brackets=[[14,.06],[50,.15],[88,.24],[150,.35],[300,.38],[500,.40],[1000,.42],[Infinity,.45]];
function capitalGain(s,a,p) {
  const raw=p*.995-a.basis;
  const years=Math.floor((s.q-a.bought)/4);
  return raw>0&&years>=3 ? raw*(1-Math.min(.30,years*.02)) : raw;
}
function transferTax(gain) {return progressive(Math.max(0,gain-2.5),brackets)*1.1;}
export function sellQuote(s,a,urgent=true) {
  const p=round(valuation(s,a).value*(urgent?.96:.995));
  const gain=capitalGain(s,a,p);
  const bk=yearLedger(s);
  const tax=round(transferTax(bk.gain+gain)-bk.tax);
  return {p,gain,tax,net:round(p*.995-a.debt-tax)};
}
export function holding(s) {
  let house=0,land=0,attached=0,count=0,total=0;
  for(const a of s.assets.filter(x=>x.owned)){
    const publicValue=valuation(s,a).value*.7;
    if(a.d===3){house+=publicValue;count++;total+=publicValue*.6*.0025;}
    else if(a.d===0){land+=publicValue;total+=publicValue*.7*.003;}
    else{attached+=publicValue*.4;total+=publicValue*.7*.0025;}
  }
  const houseBase=Math.max(0,house-(count===1?1200:900))*.60;
  const housingRates=count<3 ? [[300,.005],[600,.007],[1200,.01],[2500,.013],[5000,.015],[9400,.02],[Infinity,.027]] : [[300,.005],[600,.007],[1200,.01],[2500,.02],[5000,.03],[9400,.04],[Infinity,.05]];
  const landBase=Math.max(0,land-500), attachedBase=Math.max(0,attached-8000);
  const gross=progressive(houseBase,housingRates)+progressive(landBase,[[1500,.01],[4500,.02],[Infinity,.03]])+progressive(attachedBase,[[20000,.005],[40000,.006],[Infinity,.007]]);
  const credit=houseBase*.0025+landBase*.003+attachedBase*.0025;
  return {property:round(total),surtax:round(Math.max(0,gross-credit)*1.2)};
}
export const loanRate=(s,a)=>a.fixed?a.loanRate:rate(s)+.02;
export const pfequity=s=>s.pf&&s.pf.stage!=="회수 완료"?Math.max(0,pfValue(s)-s.pf.drawn-s.pf.remaining):0;
const pfValue=s=>s.pf.stage==="준공"?s.pf.value:Math.max(0,9.2*100-(s.pf.delay??0)*45);
export function netWorth(s){
  let value=s.cash+s.deposit+pfequity(s)*(1-(s.pf?.dilution??0))-s.holdTax-(s.propertyTax??0);
  let gain=0;
  for(const a of s.assets.filter(x=>x.owned)){const q=sellQuote(s,a);value+=q.p*.995-a.debt;gain+=q.gain;}
  const bk=yearLedger(s);
  return round(value+bk.tax-transferTax(bk.gain+gain));
}
export function note(s,label,amount=0){
  s.log.unshift({q:s.q,label,amount:round(amount)});
}
export function buy(s,a,kind){
  if(s.done||s.actions>=2||!a.listed)return "계약할 수 없습니다.";
  const p=offer(s,a), tax=buyTax(s,a,p), fee=round(p*.005), debt=kind==="cash"?0:round(p*.50);
  if(debt>valuation(s,a).value*.60)return "담보가치의 60%를 넘는 대출입니다.";
  if(s.cash<p+tax+fee-debt)return "취득세와 중개보수를 포함한 잔금이 부족합니다.";
  s.cash=round(s.cash-p-tax-fee+debt);
  Object.assign(a,{listed:false,owned:true,bought:s.q,basis:p+tax+fee,debt,fixed:kind==="fixed",loanRate:rate(s)+.025,maturity:s.q+8});
  s.actions++;s.started=true; note(s,a.name+" 매입",-(p+tax+fee-debt));return "";
}
export function sell(s,a,urgent=true,forced=false){
  if(s.done||!a.owned||(!forced&&s.actions>=2))return "계약할 수 없습니다.";
  const {net,gain,tax}=sellQuote(s,a,urgent),bk=yearLedger(s);
  s.book[yearOf(s.q)]={gain:bk.gain+gain,tax:bk.tax+tax};
  s.cash=round(s.cash+net);
  Object.assign(a,{owned:false,listed:true,debt:0,fixed:false,distress:false});
  s.actions+=forced?0:1;s.started=true;note(s,a.name+(forced?" 담보 처분":" 매각"),net);return "";
}
export function payDown(s,a){
  if(s.actions>=2||!a.owned||!a.debt||s.cash<a.debt)return "현금 또는 계약 횟수가 부족합니다.";
  s.cash=round(s.cash-a.debt);note(s,a.name+" 대출 상환",-a.debt);a.debt=0;s.actions++;return "";
}
const events={3:["48시간 공장 급매","급매 공장이 이번 분기에만 공개됩니다. 매물의 상세 정보에서 전력 위험을 확인하세요."],5:["청운시장 선거 예고","서하진 후보는 환승센터, 오윤서 후보는 공공주택을 공약했습니다."],6:["청운시장 개표","당선 결과가 발표됐습니다. 예산 표결은 다음 분기입니다."],7:["시의회 예산 표결","예산 의결로 투자 전망이 달라집니다."],8:["폐역 부지 매수선택권","1천만 원으로 두 분기 동안 폐역 필지를 2억 원에 매수할 권리를 얻을 수 있습니다."],10:["수출기업 긴급 증설","보유 공장에 개조비 3천만 원을 투자하면 신규 임대 입찰에 참여합니다."]};
export function currentEvent(s){
  const q=s.q; return events[q]??(q>16&&q%16>=5&&q%16<=7?events[q%16]:q>12&&q%8===2?events[10]:null);
}
export function eventChoice(s,key){
  if(s.done||s.actions>=2||s.eventDone[s.q])return "이번 분기에 이미 처리했거나 계약 횟수가 부족합니다.";
  if(key==="option"&&s.q===8&&!s.option&&s.cash>=10){s.cash-=10;s.option={expiry:10};note(s,"폐역 매수선택권",-10);}
  else if(key==="export"&&currentEvent(s)===events[10]&&s.cash>=30&&s.assets.some(a=>a.owned&&a.d===2)){
    const a=s.assets.find(a=>a.owned&&a.d===2);s.cash-=30;
    if(fx(s)<s.macro.fx*1.025){a.r+=12;note(s,"수출기업 장기 임대 수주",-30);}
    else {s.cash+=8;note(s,"입찰 탈락 · 설비 일부 회수",-22);}
  }else return "현금 또는 보유 자산 요건을 확인하세요.";
  s.eventDone[s.q]=true;s.actions++;s.started=true;return "";
}
export function exercise(s){
  if(!s.option||s.q>s.option.expiry||s.actions>=2||s.cash<210.2)return "행사 기한, 계약 횟수와 잔금을 확인하세요.";
  const a={id:999,name:"폐역 부지",d:0,p:240,r:0,c:0,v:.08,listed:false,owned:true,basis:210.2,bought:s.q,debt:0};
  s.assets.push(a);s.option=null;s.cash-=210.2;s.actions++;note(s,"폐역 부지 매수권 행사",-210.2);return "";
}
export function deposit(s,withdraw=false){
  if(s.done||s.actions>=2)return "이번 분기에는 더 계약할 수 없습니다.";
  if(withdraw?s.deposit<=0:s.cash<50)return "예금 잔액 또는 현금을 확인하세요.";
  const n=withdraw?-s.deposit:50;s.cash=round(s.cash-n);s.deposit=round(s.deposit+n);s.actions++;s.started=true;note(s,withdraw?"예금 해지":"정기예금 가입",-n);return "";
}
export function project(s,action){
  if(s.done||s.actions>=2)return "이번 분기에는 더 계약할 수 없습니다.";
  if(action==="start"&&!s.pf&&s.q<=s.length-4&&s.cash>=300){
    s.cash-=300;s.pf={stage:"브리지",start:s.q,drawn:120,remaining:380,delay:0};note(s,"냉동물류센터 자기자본 출자",-300);
  }else if(action==="fund"&&s.pf?.stage==="추가출자"&&s.cash>=s.pf.overrun){
    s.cash=round(s.cash-s.pf.overrun);note(s,"PF 추가출자",-s.pf.overrun);s.pf.stage="공사 중";
  }else if(action==="dilute"&&s.pf?.stage==="추가출자"){
    s.pf.dilution=.3;s.pf.delay++;s.pf.stage="공사 중";note(s,"PF 추가출자 대신 지분 희석");
  }else if(action==="exit"&&s.pf?.stage==="준공"){
    const proceeds=round(pfequity(s)*(1-(s.pf.dilution??0)));s.cash+=proceeds;s.pf.stage="회수 완료";s.pf.proceeds=proceeds;note(s,"준공 자산 매각 · 선순위 상환 후 회수",proceeds);
  }else return "사업 단계, 남은 분기 및 자금 요건을 확인하세요.";
  s.actions++;s.started=true;return "";
}
export function advance(s){
  if(s.done)return;
  s.started=true;
  let flow=0;
  for(const a of s.assets.filter(x=>x.owned)){
    flow+=valuation(s,a).noi/4-a.debt*loanRate(s,a)/4;
    if(a.debt&&s.q>=a.maturity){
      const limit=round(valuation(s,a).value*.60),difference=Math.max(0,a.debt-limit);
      if(s.cash+flow>=difference){s.cash=round(s.cash-difference);a.debt=round(a.debt-difference);a.maturity+=8;note(s,a.name+" 만기 차환",-difference);}
      else sell(s,a,true,true);
    }
  }
  if(s.deposit) s.deposit=round(s.deposit*(1+Math.max(0,rate(s)-.002)*.846/4));
  s.cash=round(s.cash+flow);
  if(flow)note(s,"순임대수익에서 대출이자 차감",flow);
  if(quarterOf(s.q)===2){const h=holding(s);s.propertyTax=h.property;s.holdTax=h.surtax;note(s,"6월 1일 기준 보유세 확정");if(h.surtax)note(s,"종부세 확정 · 4분기 납부");}
  if(quarterOf(s.q)===3&&s.propertyTax){note(s,"재산세 납부",-s.propertyTax);s.cash=round(s.cash-s.propertyTax);s.propertyTax=0;}
  if(quarterOf(s.q)===4&&s.holdTax){note(s,"종합부동산세 납부",-s.holdTax);s.cash=round(s.cash-s.holdTax);s.holdTax=0;}
  if(s.cash<0&&s.deposit){s.cash=round(s.cash+s.deposit);note(s,"납부 자금 확보 · 예금 해지",s.deposit);s.deposit=0;}
  if(s.cash<0) for(const a of s.assets.filter(x=>x.owned).sort((a,b)=>sellQuote(s,b).net-sellQuote(s,a).net)){sell(s,a,true,true);if(s.cash>=0)break;}
  if(s.cash<0){s.done=true;s.insolvent=true;note(s,"지급불능으로 결산");return;}
  if(s.q===s.length){s.done=true;note(s,"최종 결산");return;}
  s.q++;s.actions=0;
  s.last="임대료와 이자를 정산했습니다. 시장과 보유 자산을 확인하세요.";
  if(quarterOf(s.q)===1){addAssets(s,yearOf(s.q));s.last="새해 신규 매물이 네 생활권에 추가됐습니다.";}
  if(s.q===3){s.assets.push({id:91,name:"철교산단 긴급 처분 공장",d:2,p:310,r:29,c:8,v:.24,listed:true,distress:true,debt:0});}
  if(s.q===4){const a=s.assets.find(x=>x.id===91);if(a&&!a.owned)a.listed=false;if(a)a.distress=false;}
  if((s.q-6)%16===0)s.winner=((s.q-6)/16)%2===0?"서하진":"오윤서";
  if((s.q-7)%16===0){if(s.winner==="서하진")s.policies.rail=true;else s.policies.housing=true;}
  if(s.option&&s.q>s.option.expiry){s.option=null;note(s,"폐역 매수선택권 만료");}
  const pf=s.pf;
  if(pf&&pf.stage!=="회수 완료"&&pf.stage!=="준공"){
    const age=s.q-pf.start;
    if(age===1){pf.stage="공사 중";pf.drawn=250;pf.remaining=250;note(s,"인허가·사전임대 50% 확인 · 본PF 전환");}
    if(age===2){pf.drawn=370;pf.remaining=130;pf.overrun=round(20+Math.max(0,fx(s)-s.macro.fx)*.2);pf.stage="추가출자";note(s,"PF 수입설비 비용 증가 · 자본 보충 요청");}
    if(age>2&&pf.stage==="추가출자"){pf.dilution=.3;pf.delay++;pf.stage="공사 중";note(s,"PF 외부 자본 유치 · 지분 희석");}
    if(age>=4+pf.delay){pf.stage="준공";pf.drawn=500;pf.remaining=0;pf.value=round(920-(pf.delay??0)*45-(rate(s)-.03)*1000);note(s,"냉동물류센터 준공 · 매각 가능");}
  }
  if(currentEvent(s))s.last=currentEvent(s)[1];
}
