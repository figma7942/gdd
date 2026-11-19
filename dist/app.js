import * as game from "./engine.js";
const $=id=>document.getElementById(id);
const numbers=new Intl.NumberFormat("ko-KR",{maximumFractionDigits:2});
const money=n=>{const w=Math.round(Math.abs(n)*100),e=Math.floor(w/10000),m=w%10000;return (n<0?"−":"")+(e?e+"억 ":"")+(m?numbers.format(m)+"만":e?"":"0")+" 원";};
const signed=n=>(n>0?"+":"")+money(n);
const percent=n=>(n*100).toFixed(2)+"%";
const key="cheongun-prototype-v1";
let observed={...game.fixture};
let state=game.createState();
try{const saved=JSON.parse(localStorage.getItem(key));if(saved?.assets&&[12,20,40].includes(saved.length))state=saved;}catch{}
let district=0,tab="market",toastTimer;
const tabs=[["market","매물"],["hold","보유 자산"],["bank","금융"],["pf","프로젝트 PF"]];
const row=(k,v)=>'<p class="row"><span>'+k+'</span><strong>'+v+'</strong></p>';
const btn=(title,action,kind="ghost",disabled=false)=>'<button class="'+kind+'" data-action="'+action+'" '+(disabled?"disabled":"")+'>'+title+'</button>';
const card=(body,extra="")=>'<article class="card '+extra+'">'+body+'</article>';
const actionBar=(...buttons)=>'<div class="actions">'+buttons.join("")+'</div>';
const heading=(label,title,desc)=>'<span class="eyebrow">'+label+'</span><h2>'+title+'</h2><p class="hint">'+desc+'</p>';
const blocked=()=>state.done||state.actions>=2;
function toast(message){$("toast").textContent=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").textContent="",3300);}
function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{}}
function modal(title,body){$("modal-title").textContent=title;$("modal-body").innerHTML=body;if(!$("modal").open)$("modal").showModal();}
function switchTab(value,scroll=false){tab=value;render();if(scroll&&matchMedia("(max-width: 780px)").matches)$("panel").scrollIntoView({block:"start",behavior:"smooth"});}
function run(error,message){if(error){toast(error);return;}save();render();if($("modal").open)$("modal").close();toast(message);}
function render(){
  $("metrics").innerHTML=[["가용 현금",money(state.cash),"accent"],["세후 순자산",money(game.netWorth(state)),""],["기준금리",percent(game.rate(state)),""],["원/달러",numbers.format(game.fx(state))+" 원",""]].map(([k,v,c])=>'<div class="metric"><small>'+k+'</small><strong class="'+c+'">'+v+'</strong></div>').join("");
  $("markers").innerHTML=game.districts.map((d,i)=>'<button class="pin '+(district===i?"active":"")+'" style="--x:'+d.x+'%;--y:'+d.y+'%" data-action="district:'+i+'" aria-pressed="'+(district===i)+'"><span class="symbol" aria-hidden="true">'+d.icon+'</span><span><strong>'+d.name+'</strong><small>'+d.type+' · '+state.assets.filter(a=>a.d===i&&a.listed).length+'건</small></span></button>').join("");
  $("modes").innerHTML=[12,20,40].map(n=>'<button class="'+(state.length===n?"active":"")+'" aria-pressed="'+(state.length===n)+'" data-action="mode:'+n+'">'+n+'분기</button>').join("");
  $("tabs").innerHTML=tabs.map(([k,v])=>'<button class="'+(tab===k?"active":"")+'" aria-pressed="'+(tab===k)+'" data-action="tab:'+k+'">'+v+'</button>').join("");
  const e=game.currentEvent(state);
  $("news").innerHTML='<small class="accent">청운일보 · '+(e?e[0]:"시장 브리핑")+'</small><p>'+state.last+'</p>';
  $("turn-title").textContent=state.done?"투자 결산":game.yearOf(state.q)+"년차 "+game.quarterOf(state.q)+"분기";
  $("progress-label").textContent=state.q+" / "+state.length+"분기 · 계약 "+state.actions+" / 2";
  $("progress").style.width=(state.done?100:state.q/state.length*100)+"%";
  $("advance").innerHTML=state.done?'결과 보기 <span aria-hidden="true">◈</span>':(state.length===40?'1~2분기 진행':'분기 마감')+' <span aria-hidden="true">◷</span>';
  $("panel").innerHTML=({market,hold,bank,pf})[tab]();
}
function market(){
  const d=game.districts[district], assets=state.assets.filter(a=>a.d===district&&a.listed);
  return heading("PROPERTY MARKET",d.name,d.type+" 매물 "+assets.length+"건 · 실사 후 계약할 수 있습니다.")+
    '<div class="stack">'+assets.slice().reverse().map(a=>{
      const v=game.valuation(state,a);
      return card('<div class="row"><h3>'+a.name+'</h3><span class="type">'+(a.distress?"급매":d.type)+'</span></div>'+row("매도 호가",money(game.offer(state,a)))+row("추정 적정가",money(v.value))+actionBar(btn("매물 상세","detail:"+a.id),btn("매입 견적","buy:"+a.id,"gold",blocked())));
    }).join("")+(assets.length?"":'<p class="hint">현재 등록 매물이 없습니다. 다른 생활권을 보거나 새해까지 기다리세요.</p>')+
    card('<div class="row"><h3>'+d.npc+'</h3><small>현장 NPC</small></div><p>“'+d.line+'”</p>'+btn("대화하기","npc"),"npc")+'</div>';
}
function hold(){
  const owned=state.assets.filter(a=>a.owned),h=game.holding(state);
  return heading("PORTFOLIO","보유 자산","매각 예상액은 중개보수·대출잔액·양도세를 반영합니다.")+'<div class="stack">'+
    card(row("예상 재산세",money(h.property))+row("예상 종부세·농특세",money(h.surtax))+row("납부 예정 보유세",money(state.holdTax+(state.propertyTax??0))))+
    owned.map(a=>card('<h3>'+a.name+'</h3>'+row("추정 적정가",money(game.valuation(state,a).value))+row("대출 잔액",money(a.debt))+row("급매 순유입액",money(game.sellQuote(state,a).net))+actionBar(btn("가격 근거","detail:"+a.id),btn("매각 견적","sell:"+a.id,"gold",blocked())))).join("")+
    (owned.length?"":'<p class="hint">보유 자산이 없습니다. 지도에서 첫 매물을 찾아보세요.</p>')+'</div>';
}
function bank(){
  return heading("CHEONGUN CREDIT UNION","청운신협","예금과 담보대출을 관리합니다. 연 이율과 만기를 함께 확인하세요.")+'<div class="stack">'+
    card('<h3>정기예금</h3>'+row("현재 잔액",money(state.deposit))+row("신규 예금 연 이율",percent(game.rate(state)-.002))+actionBar(btn("5천만 원 예치","deposit","gold",blocked()||state.cash<50),btn("전액 해지","withdraw","ghost",blocked()||!state.deposit)))+
    state.assets.filter(a=>a.owned&&a.debt).map(a=>card('<h3>'+a.name+'</h3>'+row(a.fixed?"고정금리":"변동금리",percent(game.loanRate(state,a)))+row("만기",a.maturity+"분기")+row("대출 잔액",money(a.debt))+actionBar(btn("원금 전액 상환","pay:"+a.id,"ghost",blocked()||state.cash<a.debt)))).join("")+
    card('<h3>시장 지표</h3><p>게임 분기 지표는 실제 관측값을 기준으로 움직입니다.</p>'+actionBar(btn("실제 관측값 보기","macro")))+'</div>';
}
function pf(){
  const p=state.pf;
  return heading("PROJECT FINANCE","냉동물류센터","철교산단 · 사전임대와 공정률에 따라 사업 대출을 인출합니다.")+'<div class="stack">'+
  card('<div class="row"><h3>프로젝트 장부</h3><span class="type">'+(p?.stage??"투자 모집")+'</span></div>'+row("총사업비 예산",money(800))+row("초기 자기자본",money(300))+row("선순위 대출 한도",money(500))+(p?row("대출잔액",money(p.drawn))+row("예상 출자 지분 회수",money(game.pfequity(state)*(1-(p.dilution??0)))):""))+
  (!p?card('<p>출자 후 기본 4분기 동안 브리지 대출, 본PF, 공사, 준공을 진행합니다. 미결제 설비비는 환율에 영향을 받습니다.</p>'+actionBar(btn("출자 검토","pfintro","gold",blocked()||state.q>state.length-4))):
   p.stage==="추가출자"?card('<h3>수입 설비비 초과</h3>'+row("추가 출자 요청",money(p.overrun))+'<p>외부 자본으로 보충하면 지분이 30% 희석되고 준공이 한 분기 지연됩니다.</p>'+actionBar(btn("추가 출자","project:fund","gold",blocked()),btn("외부 자본 유치","project:dilute","ghost",blocked()))):
   p.stage==="준공"?card(row("매각 순유입액",money(p.value))+'<p>선순위 잔액을 상환하고 남은 금액을 지분비율로 배분합니다.</p>'+actionBar(btn("매각 후 회수","project:exit","gold",blocked()))):
   p.stage==="회수 완료"?card(row("출자자 회수액",money(p.proceeds))):card('<p>사업이 진행 중입니다. 분기 마감에서 공정과 대출 인출 내역을 확인하세요.</p>'))+'</div>';
}
function assetDetail(a){
  const v=game.valuation(state,a),d=game.districts[a.d];
  modal(a.name,card(row("추정 적정가",money(v.value))+row("연 순영업소득",money(v.noi))+(a.d!==0?row("예상 공실률",percent(v.vacancy)):"")+(a.d===1||a.d===2?row("자본환원율",percent(v.cap)):""))+
    '<p>'+ (a.distress?"급매 할인 15%. 전력 증설과 임차인 교체 위험이 있는 매물입니다. ": "")+d.detail+'</p>'+actionBar(a.listed?btn("매입 견적","buy:"+a.id,"gold",blocked()):btn("매각 견적","sell:"+a.id,"gold",blocked())));
}
function buyDialog(a){
  const p=game.offer(state,a);
  modal(a.name+" 매입",card(row("계약 금액",money(p))+row("예상 취득세",money(game.buyTax(state,a,p)))+row("중개보수",money(game.round(p*.005))))+
  '<p><label for="loan-kind">결제 방식</label> <select id="loan-kind"><option value="cash">현금 매입</option><option value="variable">50% 변동금리 · '+percent(game.rate(state)+.02)+'</option><option value="fixed">50% 고정금리 · '+percent(game.rate(state)+.025)+'</option></select></p><div id="buy-total"></div>'+actionBar(btn("계약 체결","confirmbuy:"+a.id,"gold",blocked())));
  const update=()=>{$("buy-total").innerHTML=row("필요 자기자본",money(p+game.buyTax(state,a,p)+game.round(p*.005)-($("loan-kind").value==="cash"?0:game.round(p*.50))));};
  $("loan-kind").onchange=update;update();
}
function sellDialog(a){
  const q=game.sellQuote(state,a);
  modal(a.name+" 매각",card(row("즉시 매각가",money(q.p))+row("중개보수",money(q.p*.005))+row("대출 상환",money(a.debt))+row("예상 추가 양도세",money(q.tax))+row("예상 순유입",money(q.net)))+
    '<p class="hint">즉시 매각에는 유동성 할인 4%가 적용됩니다.</p>'+actionBar(btn("급매 계약 체결","confirmsell:"+a.id,"gold",blocked())));
}
function showLog(){
  modal("거래 기록",state.log.length?'<div class="stack">'+state.log.map(e=>card('<small>'+e.q+'분기</small>'+row(e.label,'<span class="'+(e.amount<0?"negative":"positive")+'">'+(e.amount?signed(e.amount):"")+'</span>'))).join("")+'</div>':'<p>첫 계약이 체결되면 이곳에 기록됩니다.</p>');
}
function news(){
  const e=game.currentEvent(state);
  let actions="";
  if(state.q===8&&!state.option)actions+=btn("매수선택권 계약","event:option","gold",blocked()||state.eventDone[state.q]);
  if(state.option)actions+=btn("폐역 부지 매수권 행사","exercise","gold",blocked());
  if(e?.[0]==="수출기업 긴급 증설")actions+=btn("3천만 원 투입 · 입찰","event:export","gold",blocked()||state.eventDone[state.q]);
  if(state.q===3)actions+=btn("산단 급매 보기","district:2","gold");
  const election=[6,7].includes(state.q%16)&&state.winner ? '<p>당선 · '+state.winner+(state.q%16===7?" · 예산 가결":"")+'</p>':"";
  modal(e?.[0]??"청운일보 시장 브리핑",'<p>'+state.last+'</p>'+election+(state.option?'<p>매수권 행사는 '+state.option.expiry+'분기까지 가능합니다.</p>':"")+(actions?actionBar(actions):""));
}
function macro(){
  modal("실제 시장 관측값",card(row("한국은행 기준금리",percent(observed.rate))+row("ECOS 관측월",observed.rateDate)+row("USD/KRW 일별 기준 환율",numbers.format(observed.fx)+" 원")+row("관측일",observed.fxDate))+
  '<p class="hint">'+observed.fxSource+' · 환율은 일별 공표값입니다. 수업 모드는 시작 기준값을 고정합니다.</p><p><a href="https://ecos.bok.or.kr/" target="_blank" rel="noreferrer">한국은행 ECOS</a> · <a href="https://frankfurter.dev/" target="_blank" rel="noreferrer">Frankfurter</a></p>');
}
function result(){
  const final=game.netWorth(state),benchmark=500*Math.pow(1+(state.macro.rate-.002)*.846/4,state.q);
  modal(state.insolvent?"지급불능 · 최종 결산":"청운시 투자 결산",card(row("세후 청산 추정액",money(final))+row("시작 대비 손익",signed(final-500))+row("동일 기간 예금 기준",money(benchmark)))+
  '<p>가장 큰 결정 한 가지를 골라 당시 알 수 있었던 가격 근거, 확보한 현금, 예상 세금을 설명해 보세요.</p>'+actionBar(btn("거래 기록","log"),btn("새 게임","settings","gold")));
}
function settings(){
  modal("게임 설정",'<p>한 판 약 20분. 분기 길이를 선택하고 청운시 투자를 시작하세요.</p><p><label for="new-length">게임 분량</label> <select id="new-length">'+[12,20,40].map(n=>'<option '+(state.length===n?"selected ":"")+'value="'+n+'">'+n+'분기</option>').join("")+'</select></p><p><label for="new-live">시장 지표</label> <select id="new-live"><option value="class">수업 · 시작 기준값 고정</option><option value="live">라이브 · 최신 일별 환율 반영</option></select></p><p class="hint">새 게임을 시작하면 이 브라우저에 저장된 현재 진행 상황이 교체됩니다. 세금은 개인 투자자용 교육 모형입니다.</p>'+actionBar(btn("새 게임 시작","restart","gold")));
}
document.addEventListener("click",event=>{
  const button=event.target.closest("[data-action]");if(!button)return;
  const [act,arg]=button.dataset.action.split(":");
  const asset=state.assets.find(a=>a.id===Number(arg));
  if(act==="district"){district=Number(arg);if($("modal").open)$("modal").close();switchTab("market",true);}
  if(act==="tab")switchTab(arg);
  if(act==="mode"){
    if(!state.started){state=game.createState(Number(arg),observed,state.live);save();render();}
    else if(Number(arg)!==state.length){settings();$("new-length").value=arg;}
  }
  if(act==="detail")assetDetail(asset);
  if(act==="npc"){
    const d=game.districts[district];
    modal(d.npc,'<p>“'+d.line+'”</p>'+actionBar(btn("판단 근거 묻기","ask")));
  }
  if(act==="ask"){
    const d=game.districts[district];
    modal(d.npc,'<p>'+d.detail+'</p>'+actionBar(btn("매물로 돌아가기","district:"+district,"gold")));
  }
  if(act==="buy")buyDialog(asset);
  if(act==="confirmbuy")run(game.buy(state,asset,$("loan-kind").value),"매입 계약을 체결했습니다.");
  if(act==="sell")sellDialog(asset);
  if(act==="confirmsell")run(game.sell(state,asset),"매각을 정산했습니다.");
  if(act==="pay")run(game.payDown(state,asset),"원금을 상환했습니다.");
  if(act==="deposit"||act==="withdraw")run(game.deposit(state,act==="withdraw"),act==="withdraw"?"예금을 해지했습니다.":"정기예금에 가입했습니다.");
  if(act==="event")run(game.eventChoice(state,arg),"이벤트 선택을 기록했습니다.");
  if(act==="exercise")run(game.exercise(state),"폐역 부지를 취득했습니다.");
  if(act==="pfintro")modal("자기자본 출자",'<p>3억 원을 프로젝트 회사에 출자합니다. 허가·임대·공사 결과에 따라 원금 손실이 발생할 수 있습니다.</p>'+actionBar(btn("3억 원 출자","project:start","gold")));
  if(act==="project")run(game.project(state,arg),"프로젝트 장부를 갱신했습니다.");
  if(act==="macro")macro();
  if(act==="log")showLog();
  if(act==="settings")settings();
  if(act==="restart"){
    state=game.createState(Number($("new-length").value),observed,$("new-live").value==="live");
    district=0;tab="market";run("","새 투자 게임을 시작했습니다.");
  }
});
$("close").onclick=()=>$("modal").close();
$("show-news").onclick=news;
$("settings").onclick=settings;
$("log").onclick=showLog;
$("advance").onclick=()=>{
  if(state.done){result();return;}
  if(state.live&&observed.fxDate>=state.macro.fxDate)state.macro={...observed};
  game.advance(state);
  if(state.length===40&&!state.done&&!game.currentEvent(state)&&game.quarterOf(state.q)!==1&&state.pf?.stage!=="추가출자"&&state.pf?.stage!=="준공"&&!state.assets.some(a=>a.owned&&a.debt&&a.maturity===state.q)&&!(state.option&&state.q===state.option.expiry))game.advance(state);
  save();render();
  if(state.done)result();
  else if(game.currentEvent(state))news();
  else if(state.pf?.stage==="추가출자"){switchTab("pf");toast("PF 사업에 추가출자 결정이 필요합니다.");}
  else toast(state.q+"분기 · 정산을 완료했습니다.");
};
async function refresh(){
  try{
    const response=await fetch("https://api.frankfurter.dev/v2/rates?base=USD&quotes=KRW",{signal:AbortSignal.timeout(6500)});
    if(!response.ok)return;
    const [record]=await response.json();
    if(record?.quote!=="KRW"||!Number.isFinite(record.rate)||!/^\d{4}-\d{2}-\d{2}$/.test(record.date))return;
    observed={...observed,fx:record.rate,fxDate:record.date,fxSource:"Frankfurter 일별 고시"};
    if(!state.started){state.macro={...observed};render();save();}
  }catch{}
}
render();
refresh();
setInterval(refresh,120000);
