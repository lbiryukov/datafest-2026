(function(){
"use strict";
// ---- where the plan lives ----
// Firestore of the trips project (trips-250e3): document datafest/2026 = {picks:[id...], updated: ISO}.
// Access: only Google accounts allowed in trips/firestore.rules.
var FB={apiKey:"AIzaSyDN2euV2QuU-l1JWv7bwukrEufuO58T-PA",authDomain:"trips-250e3.firebaseapp.com",projectId:"trips-250e3",
  storageBucket:"trips-250e3.firebasestorage.app",messagingSenderId:"147477428046",appId:"1:147477428046:web:408ee46217e2de082b501f"};
var SDK="https://www.gstatic.com/firebasejs/10.12.2/", DOC=["datafest","2026"];
var K={plan:"datafest2026-plan",ui:"datafest2026-ui"};

var DAYS={26:"Чт 26 ноября",27:"Пт 27 ноября",28:"Сб 28 ноября"};
var A=null,S=[],byId={},TRru={},REC={},SVC={};
var picks={}, ui={view:"prog",day:26,tr:"",rec:false,q:""};
// localTs: last edit in this browser; remoteTs: time of the plan in the cloud
var sync={localTs:0,remoteTs:0,state:"init",msg:"",at:null,timer:null,user:null};
var FA=null,FS=null,auth=null,db=null,ref=null,unsub=null;

function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function lsSet(k,v){try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch(e){}}
function mins(t){var p=t.split(":");return +p[0]*60+ +p[1];}
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function pickList(){return Object.keys(picks).map(Number).filter(function(id){return byId[id];}).sort(function(a,b){return a-b;});}
function hhmm(d){return d?d.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Tbilisi"}):"";}

// ---- local cache (works offline and before sign-in) ----
function loadLocal(){
  try{var o=JSON.parse(lsGet(K.plan));if(o){sync.localTs=o.ts||0;sync.remoteTs=o.remoteTs||0;(o.picks||[]).forEach(function(id){picks[id]=1;});}}catch(e){}
  try{var u=JSON.parse(sessionStorage.getItem(K.ui));if(u)ui=u;}catch(e){}
  var n=new Date();if(!ui._set&&n.getFullYear()===2026&&n.getMonth()===10&&DAYS[n.getDate()])ui.day=n.getDate();
}
function saveLocal(){lsSet(K.plan,JSON.stringify({ts:sync.localTs,remoteTs:sync.remoteTs,picks:pickList()}));}
function saveUi(){ui._set=1;try{sessionStorage.setItem(K.ui,JSON.stringify(ui));}catch(e){}}
function dirty(){return sync.localTs>sync.remoteTs;}
function setStatus(state,msg){sync.state=state;sync.msg=msg||"";renderStatus();}
function errText(e){
  var c=(e&&(e.code||e.message))||String(e);
  if(/permission-denied/.test(c))return"У "+(sync.user?sync.user.email:"этого аккаунта")+" нет доступа к плану";
  if(/unavailable/.test(c)||!navigator.onLine)return"Нет связи, план сохранён в этом браузере";
  return"Облако недоступно ("+c+")";
}

// ---- Firebase ----
function initFirebase(){
  return Promise.all(["firebase-app.js","firebase-auth.js","firebase-firestore.js"].map(function(f){return import(SDK+f);})).then(function(m){
    var app=m[0];FA=m[1];FS=m[2];
    var a=app.getApps().length?app.getApp():app.initializeApp(FB);auth=FA.getAuth(a);
    try{db=FS.initializeFirestore(a,{localCache:FS.persistentLocalCache()});}catch(e){db=FS.getFirestore(a);}
    ref=FS.doc(db,DOC[0],DOC[1]);
    FA.onAuthStateChanged(auth,function(u){
      sync.user=u||null;if(unsub){unsub();unsub=null;}
      if(!u){setStatus("signedout");render();return;}
      setStatus("busy","Загружаю план…");render();
      unsub=FS.onSnapshot(ref,onRemote,function(e){setStatus("err",errText(e));});
    });
  },function(){setStatus("err","Не удалось подключиться к Firebase, нужен интернет");});
}
function onRemote(snap){
  if(snap.metadata.hasPendingWrites)return;
  var d=snap.exists()?snap.data():{}, ts=Date.parse(d.updated)||0;
  // keep this browser's newer edits (made offline or before sign-in) and send them up
  if(dirty()&&sync.localTs>ts){sync.remoteTs=ts;saveLocal();push();return;}
  if(ts!==sync.remoteTs||!dirty()){picks={};(d.picks||[]).forEach(function(id){picks[id]=1;});}
  sync.remoteTs=ts;sync.localTs=ts;sync.at=ts?new Date(ts):null;saveLocal();render();setStatus("ok");
}
function schedule(){clearTimeout(sync.timer);if(!sync.user){setStatus(sync.state==="init"?"init":"signedout");return;}setStatus("busy","Сохраняю…");sync.timer=setTimeout(push,800);}
function push(){
  if(!sync.user||!ref)return;
  var sentTs=sync.localTs||Date.now();
  setStatus("busy","Сохраняю…");
  FS.setDoc(ref,{picks:pickList(),updated:new Date(sentTs).toISOString()}).then(function(){
    sync.remoteTs=Math.max(sync.remoteTs,sentTs);sync.at=new Date();saveLocal();
    if(dirty())push();else setStatus("ok");
  },function(e){setStatus("err",errText(e));});
}
function signIn(){
  if(!FA){toast("Firebase ещё загружается, попробуйте через секунду");return;}
  var p=new FA.GoogleAuthProvider();
  FA.signInWithPopup(auth,p).catch(function(e){var c=(e&&e.code)||"";
    if(/popup-blocked|operation-not-supported|cancelled-popup/.test(c))FA.signInWithRedirect(auth,p);
    else if(c==="auth/unauthorized-domain")setStatus("err","Домен "+location.hostname+" не добавлен в Firebase");
    else if(c!=="auth/popup-closed-by-user")setStatus("err","Вход не удался ("+c+")");});
}
function signOut(){if(FA&&auth)FA.signOut(auth).then(function(){toast("Вы вышли, план остаётся в этом браузере");});}

// ---- schedule logic ----
function clashes(x){var out=[];if(!picks[x.id])return out;S.forEach(function(y){if(y.id!==x.id&&picks[y.id]&&y.day===x.day&&mins(y.start)<mins(x.end)&&mins(x.start)<mins(y.end))out.push(y);});return out;}
function change(fn){fn();sync.localTs=Date.now();saveLocal();render();schedule();}

// ---- render ----
var app=document.getElementById("app");
function card(x){
  var on=!!picks[x.id], h='<article class="card'+(x.rec?" r-"+x.rec:"")+(on?" picked":"")+'"><div>';
  h+='<div class="meta"><b>'+x.start+"–"+x.end+"</b><span>"+esc(x.room)+"</span><span>"+(mins(x.end)-mins(x.start))+" мин</span></div>";
  h+='<div class="title">'+esc(x.title)+"</div>";
  if(x.speakers)h+='<div class="sp">'+esc(x.speakers)+"</div>";
  h+='<p class="ru">'+esc(x.summary_ru)+"</p>";
  h+='<div class="tags"><span class="tag fmt">'+esc(x.format)+"</span>";
  (x.tracks||[]).forEach(function(t){h+='<span class="tag">'+esc(TRru[t])+"</span>";});
  if(x.language)h+='<span class="tag">на грузинском</span>';
  if(x.audience)h+='<span class="tag">'+(x.audience==="Kids"?"для детей":"для старшего поколения")+"</span>";
  if(x.invite_only)h+='<span class="tag">по приглашениям</span>';
  h+="</div>";
  if(x.registration&&/^https:\/\//.test(x.registration))h+='<div class="reg">'+(x.invite_only?"Заявка на участие: ":"Нужна регистрация: ")+'<a href="'+esc(x.registration)+'" target="_blank" rel="noopener">форма организаторов</a></div>';
  h+='</div><button class="pick" data-pick="'+x.id+'" aria-pressed="'+on+'">'+(on?"✓ В плане":"В план")+"</button>";
  if(x.rec)h+='<div class="why '+esc(x.rec)+'"><b>'+esc(REC[x.rec])+"</b><span>"+esc(x.why)+"</span></div>";
  var c=clashes(x);
  if(c.length)h+='<div class="clash">Пересекается с выбранным: '+c.map(function(y){return esc(y.title)+" ("+y.start+"–"+y.end+", "+esc(y.room)+")";}).join("; ")+"</div>";
  return h+"</article>";
}
function slots(list,day){
  var h="",bySlot={},times=[],svc=(SVC[day]||[]);
  list.forEach(function(x){if(!bySlot[x.start]){bySlot[x.start]=[];times.push(x.start);}bySlot[x.start].push(x);});
  svc.forEach(function(v){if(times.indexOf(v.start)<0)times.push(v.start);});
  times.sort(function(a,b){return mins(a)-mins(b);});
  times.forEach(function(t){
    h+='<div class="slot"><div class="t">'+t+'</div><div class="cards">';
    svc.forEach(function(v){if(v.start===t)h+='<div class="svc">'+esc(v.label)+"</div>";});
    (bySlot[t]||[]).forEach(function(x){h+=card(x);});
    h+="</div></div>";
  });
  return h;
}
function routeBlock(){
  var h='<section class="reco"><h2>Маршрут от Claude для руководителя аналитики</h2><p>Отобрано по трём темам: надёжность данных под ИИ, агенты поверх хранилища, качество дашбордов. Тринадцать сессий на три дня; в программе они помечены оранжевым и зелёным.</p><div class="route">';
  [26,27,28].forEach(function(d){h+="<div><h3>"+DAYS[d]+"</h3><ol>";S.filter(function(x){return x.day===d&&x.route;}).forEach(function(x){h+="<li><time>"+x.start+"</time><span>"+esc(x.title)+"</span></li>";});h+="</ol></div>";});
  var all=S.filter(function(x){return x.route;}).every(function(x){return picks[x.id];});
  h+='</div><div class="row"><button class="btn" data-act="route"'+(all?" disabled":"")+">"+(all?"Маршрут уже в плане":"Добавить маршрут в мой план")+'</button><span class="note">Субботний воркшоп EPAM требует регистрации. Если хочется соревноваться, вместо субботы подойдёт хакатон DataMind.</span></div></section>';
  return h;
}
function statusHtml(){
  var s=sync.state,cls=s==="ok"?"ok":s==="busy"?"busy":s==="err"?"err":"",t,act="signin";
  if(s==="ok"){t="Сохранено в облаке"+(sync.at?" в "+hhmm(sync.at):"");act="";}
  else if(s==="busy"){t=sync.msg;act="";}
  else if(s==="err"){t=sync.msg+" · повторить";act=sync.user?"retry":"signin";}
  else if(s==="signedout")t="Войти через Google";
  else{t="Подключаюсь…";act="";}
  return '<button class="status '+cls+'"'+(act?' data-act="'+act+'"':"")+' title="Сохранение плана"><i aria-hidden="true"></i><span>'+esc(t)+"</span></button>";
}
function renderStatus(){var el=document.getElementById("status");if(el)el.innerHTML=statusHtml();}
function render(){
  if(!A){app.innerHTML='<div class="wrap"><p class="empty">Загружаю программу…</p></div>';return;}
  var n=pickList().length, h='<div class="wrap"><header class="hero"><div class="eyebrow">26–28 ноября 2026 · '+esc(A.venue)+'</div><h1>DataFest Tbilisi 2026: программа и мой план</h1><p class="sub">'+S.length+' сессий десятого фестиваля, время тбилисское. Отмечайте, куда пойдёте; пересечения подсветятся. После входа через Google план одинаковый на всех устройствах.</p></header>';
  h+='<div class="bar"><div class="row"><div class="seg" role="group" aria-label="Раздел"><button data-view="prog" aria-pressed="'+(ui.view==="prog")+'">Программа</button><button data-view="plan" aria-pressed="'+(ui.view==="plan")+'">Мой план<span class="count">'+n+"</span></button></div>";
  if(ui.view==="prog"){h+='<div class="seg" role="group" aria-label="День">';[26,27,28].forEach(function(d){h+='<button data-day="'+d+'" aria-pressed="'+(ui.day===d)+'">'+DAYS[d].replace(" ноября","")+"</button>";});h+="</div>";}
  h+='<span class="spacer"></span><span id="status">'+statusHtml()+"</span></div>";
  if(ui.view==="prog"){
    h+='<div class="row"><button class="chip" data-rec="1" aria-pressed="'+ui.rec+'">Только рекомендации</button>';
    ["T","B","S","D"].forEach(function(t){h+='<button class="chip" data-tr="'+t+'" aria-pressed="'+(ui.tr===t)+'">'+esc(TRru[t])+"</button>";});
    h+='<input class="search" id="q" type="search" placeholder="Поиск: тема, спикер, компания" value="'+esc(ui.q)+'" aria-label="Поиск по программе"></div>';
  }
  h+="</div>";
  if(sync.state==="signedout")h+='<section class="reco connect"><h2>Войдите, чтобы план сохранялся</h2><p>Сейчас отметки остаются только в этом браузере. После входа через Google план хранится в облаке и одинаковый на телефоне и компьютере.</p><div class="row"><button class="btn" data-act="signin">Войти через Google</button></div></section>';
  if(ui.view==="prog"){
    h+=routeBlock();
    h+='<div class="legend"><span class="why top"><b>Обязательно</b></span><span class="why good"><b>Стоит зайти</b></span><span class="why int"><b>Вне работы</b></span><span>Остальное без пометки.</span></div>';
    var q=ui.q.trim().toLowerCase();
    var list=S.filter(function(x){return x.day===ui.day&&(!ui.rec||x.rec)&&(!ui.tr||(x.tracks||[]).indexOf(ui.tr)>=0)&&(!q||(x.title+" "+x.speakers+" "+x.summary_ru+" "+x.room).toLowerCase().indexOf(q)>=0);});
    h+='<h2 class="day">'+DAYS[ui.day]+' <span class="note">· '+list.length+" сессий</span></h2>";
    h+=list.length?slots(list,(ui.rec||ui.tr||q)?0:ui.day):'<p class="empty">Под эти фильтры в этот день ничего не подходит. Снимите фильтр или выберите другой день.</p>';
  }else{
    if(!n){h+='<p class="empty">План пока пуст. Откройте программу и нажмите «В план» у нужных сессий или добавьте готовый маршрут одним нажатием.</p><button class="btn" data-act="route">Добавить маршрут Claude</button>';}
    else{
      h+='<div class="row" style="margin-top:14px"><button class="btn ghost" data-act="copy">Скопировать план текстом</button><button class="btn ghost" data-act="clear">Очистить план</button></div>';
      [26,27,28].forEach(function(d){
        var l=S.filter(function(x){return x.day===d&&picks[x.id];}).sort(function(a,b){return mins(a.start)-mins(b.start);});
        if(!l.length)return;
        h+='<h2 class="day">'+DAYS[d]+"</h2>";
        l.forEach(function(x,i){
          if(i>0){var g=mins(x.start)-mins(l[i-1].end);if(g>=30)h+='<div class="gap">Свободно '+l[i-1].end+"–"+x.start+"</div>";}
          h+='<div class="slot"><div class="t">'+x.start+'</div><div class="cards">'+card(x)+"</div></div>";
        });
      });
    }
  }
  h+='<footer>Источник: официальная программа на <a href="'+esc(A.source)+'" target="_blank" rel="noopener">datafest.ge/agenda</a>, состояние на 25/11/2026. Организаторы могут менять время и залы, перед выходом сверяйтесь с сайтом. Рекомендации составлены Claude.'+(sync.user?' Вы вошли как '+esc(sync.user.email)+'. <button class="linkbtn" data-act="signout">Выйти</button>':'')+'</footer></div>';
  var sy=window.scrollY, qFocus=document.activeElement&&document.activeElement.id==="q", pos=qFocus?document.activeElement.selectionStart:0;
  app.innerHTML=h;
  if(qFocus){var el=document.getElementById("q");el.focus();try{el.setSelectionRange(pos,pos);}catch(e){}}
  window.scrollTo(0,sy);
}
function toast(m){document.querySelectorAll(".toast").forEach(function(o){o.remove();});var t=document.createElement("div");t.className="toast";t.setAttribute("role","status");t.textContent=m;document.body.appendChild(t);setTimeout(function(){t.remove();},3200);}
function planText(){var o=["DataFest Tbilisi 2026, мой план"];[26,27,28].forEach(function(d){var l=S.filter(function(x){return x.day===d&&picks[x.id];}).sort(function(a,b){return mins(a.start)-mins(b.start);});if(!l.length)return;o.push("",DAYS[d]);l.forEach(function(x){o.push(x.start+"–"+x.end+" · "+x.room+" · "+x.title+(x.speakers?" ("+x.speakers+")":""));});});return o.join("\n");}

// ---- events ----
app.addEventListener("click",function(ev){
  var b=ev.target.closest("button");if(!b)return;var d=b.dataset;
  if(d.pick){var id=+d.pick;change(function(){if(picks[id])delete picks[id];else picks[id]=1;});return;}
  if(d.view){ui.view=d.view;saveUi();render();window.scrollTo(0,0);return;}
  if(d.day){ui.day=+d.day;saveUi();render();return;}
  if(d.tr){ui.tr=ui.tr===d.tr?"":d.tr;saveUi();render();return;}
  if(d.rec){ui.rec=!ui.rec;saveUi();render();return;}
  if(d.act==="signin"){signIn();return;}
  if(d.act==="signout"){signOut();return;}
  if(d.act==="retry"){if(dirty())push();else if(unsub){unsub();unsub=FS.onSnapshot(ref,onRemote,function(e){setStatus("err",errText(e));});}return;}
  if(d.act==="route"){change(function(){S.forEach(function(x){if(x.route)picks[x.id]=1;});});toast("Маршрут добавлен в план");return;}
  if(d.act==="clear"){if(b.dataset.sure){change(function(){picks={};});}else{b.dataset.sure="1";b.textContent="Точно очистить?";}return;}
  if(d.act==="copy"){var txt=planText();try{navigator.clipboard.writeText(txt).then(function(){toast("План скопирован");},function(){toast("Браузер не дал доступ к буферу обмена");});}catch(e){toast("Браузер не дал доступ к буферу обмена");}return;}
});
app.addEventListener("input",function(ev){if(ev.target.id==="q"){ui.q=ev.target.value;saveUi();render();}});
window.addEventListener("online",function(){if(dirty()&&sync.user)push();});

// ---- start ----
loadLocal();render();
fetch("data/agenda.json",{cache:"no-cache"}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();}).then(function(a){
  A=a;S=a.sessions;S.forEach(function(x){byId[x.id]=x;});TRru=a.tracks;REC=a.recommendation_levels;SVC=a.breaks;
  render();initFirebase();
},function(){app.innerHTML='<div class="wrap"><p class="empty">Не загрузилась программа (data/agenda.json). Обновите страницу.</p></div>';});
})();
