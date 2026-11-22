/* 知识点页共用脚本（所有 topics/<站>/index.html 引用）。
   页面先定义 window.SS_TOPIC_CFG = {anim:'动画模块名', steps:[...], ar:[桌面宽高比, 手机宽高比]}，再引用本文件。
   steps 每项：t 标题 [中, 英]；d 一句话说明 [中, 英]（演示模式也用）；b 正文段落 [[中段...], [英段...]]。
   文档模式：单栏，每一步依次是编号与标题、一句话说明、这一步的动画、正文；动画滚到才装上，看不见的停住。
   演示模式（?mode=present、按 P 或点「演示」）：一步一屏，← → 翻步，Esc 回到文档模式。
   ?step=N 两种模式都能用；从 present.html 连播进来时直接进演示模式。 */
(function(){
  var SS=window.SS,L=SS.L,CFG=window.SS_TOPIC_CFG,STEPS=CFG.steps,MOD=window.SSAnim[CFG.anim];
  var main=document.querySelector('main'),id=main.getAttribute('data-station'),st=SS.stations[id];
  var N=STEPS.length,cur=0,present=false;
  var P=new URLSearchParams(location.search);
  var T=function(p){return SS.lang()==='en'?p[1]:p[0]};
  var art=document.getElementById('art'),prog=document.getElementById('prog');
  var animPres=null,mfigs=[],io=null,lastPres=-1;
  var ar=CFG.ar||[960/476,480/692];
  document.body.style.setProperty('--ar',ar[0]);document.body.style.setProperty('--arm',ar[1]);

  /* ---------- 站在哪张图、哪几条线 ---------- */
  var HOME='home',MAP=SS.inMap(id,HOME)?HOME:SS.maps.filter(function(m){return SS.inMap(id,m.id)})[0].id;
  var LS=SS.linesIn(id,MAP);
  document.body.style.setProperty('--lc',SS.lc(LS[0]));
  function li(x){var mid=SS.inMap(x,HOME)?HOME:SS.maps.filter(function(m){return SS.inMap(x,m.id)})[0].id,l=SS.linesIn(x,mid)[0];
    return '<li><a href="'+SS.stationHref(x,mid)+'">'+SS.sym(l)+'<span>'+SS.esc(SS.title(x))+'</span>'+(SS.stations[x].st==='live'?'':' <span class="tag">'+SS.stName(SS.stations[x].st)+'</span>')+'</a></li>'}
  function fillMeta(){
    var m=SS.mapById[MAP],mapName=MAP===HOME?L('总图','Main map'):SS.L(m.zh,m.en);
    document.getElementById('crumb').innerHTML='<a href="'+SS.url(m.href)+(LS.length>1?'?hl='+id:'')+'#map">'+SS.esc(mapName)+'</a><span class="sep">/</span>'+
      LS.map(function(l){return '<a href="'+SS.lineHref(MAP,l,id)+'">'+SS.esc(SS.lineName(l))+'</a>'}).join('<span class="sep">·</span>')+
      SS.brandMark(SS.brandOf(id),'lg');
    var t=SS.talksWith(id),el=document.getElementById('intalks');
    if(el)el.innerHTML=t.length?L('讲稿：','Talks: ')+t.map(function(r){var tm=SS.mapById[r.talk.map];
      return '<a href="'+SS.url(tm.href)+'?talk='+r.talk.id+'#map">'+SS.esc(SS.L(r.talk.zh,r.talk.en))+'</a>'}).join(L('、',', ')):'';
    document.getElementById('relprev').innerHTML=(st.prev||[]).map(li).join('');
    document.getElementById('relnext').innerHTML=(st.next||[]).map(li).join('');
    document.title=SS.title(id)+' · Shan\'s Stack';
  }

  /* ---------- 讲稿连播（present.html 带进来的参数） ---------- */
  var inDeck=P.has('i')&&(P.has('stops')||P.has('talk'));
  function deckLen(){if(P.get('stops'))return P.get('stops').split(',').length;var t=SS.talkById[P.get('talk')];return t?t.stops.length:0}
  function deckHas(d){var j=+P.get('i')+d;return inDeck&&j>=0&&j<deckLen()}
  function deckGo(d){var u=new URLSearchParams(P);u.set('i',+P.get('i')+d);['step','present','mode'].forEach(function(k){u.delete(k)});if(d<0)u.set('step','last');location.replace(SS.url('present.html')+'?'+u.toString())}

  /* ---------- 文档模式 ---------- */
  function pad(n){return (n<10?'0':'')+n}
  function buildDoc(){
    art.innerHTML=STEPS.map(function(s,i){
      return '<section class="sec" id="step-'+(i+1)+'" data-i="'+i+'"><div class="hd2"><h2>'+SS.esc(T(s.t))+'</h2></div><p class="lead">'+SS.esc(T(s.d))+'</p>'+
        '<div class="figbox"><div class="mhost" data-i="'+i+'"></div></div><div class="bd">'+T(s.b).join('')+'</div></section>';
    }).join('');
    prog.innerHTML=STEPS.map(function(s,i){return '<button type="button" data-go="'+i+'" aria-label="'+(i+1)+'"></button>'}).join('');
    mountDocAnims();
  }
  function mountDocAnims(){
    if(io){io.disconnect();io=null}
    mfigs.forEach(function(a){a.destroy()});mfigs=[];
    io=new IntersectionObserver(function(es){es.forEach(function(e){
      var h=e.target,a=h.__anim;
      if(e.isIntersecting&&!present){if(!a){a=MOD.mount(h,{});a.show(+h.dataset.i);mfigs.push(a)}else a.resume()}
      else if(a)a.pause();
    })},{threshold:0.25});
    art.querySelectorAll('.mhost').forEach(function(h){io.observe(h)});
  }
  function activeFromScroll(){
    var a=0,line=innerHeight*0.42;
    art.querySelectorAll('.sec').forEach(function(s,i){if(s.getBoundingClientRect().top<line)a=i});
    return a;
  }
  var ticking=false;
  addEventListener('scroll',function(){if(present||ticking)return;ticking=true;requestAnimationFrame(function(){ticking=false;var a=activeFromScroll();if(a!==cur){cur=a;writeURL()}})},{passive:true});
  function scrollToStep(i,smooth){var s=document.getElementById('step-'+(i+1));if(!s)return;cur=i;writeURL();
    var top=s.getBoundingClientRect().top+scrollY-16;window.scrollTo({top:top,behavior:smooth&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'auto'})}

  /* ---------- 演示模式 ---------- */
  var ratio=ar[0];
  function fit(){
    var h=document.getElementById('animPres');if(!present){h.style.width='';return}
    var b=document.getElementById('pfig').getBoundingClientRect();h.style.width=Math.floor(Math.min(b.width,b.height*ratio))+'px';
  }
  addEventListener('resize',fit);
  function renderPres(){
    var s=STEPS[cur],n=cur+1;
    document.getElementById('ptitle').textContent=T(s.t);document.getElementById('pdesc').textContent=T(s.d);
    var c=n+' / '+N;
    if(inDeck)c+=L('　讲稿第 '+(+P.get('i')+1)+' 站，共 '+deckLen()+' 站','　Talk stop '+(+P.get('i')+1)+' of '+deckLen());
    document.getElementById('pcnt').textContent=c;
    prog.querySelectorAll('button').forEach(function(b){var i=+b.dataset.go;b.setAttribute('aria-current',i===cur?'step':'false');b.classList.toggle('done',i<cur)});
    prog.style.setProperty('--pv',N>1?cur/(N-1):1);
    document.getElementById('pprev').disabled=cur===0&&!deckHas(-1);
    document.getElementById('pnext').disabled=cur===N-1&&!deckHas(1);
    fit();
    if(animPres&&lastPres!==cur){lastPres=cur;animPres.show(cur)}
  }
  function setPresent(on,fs){
    present=on;document.body.classList.toggle('present',on);
    document.querySelectorAll('[data-mode]').forEach(function(b){b.setAttribute('aria-pressed',(b.dataset.mode==='present')===on?'true':'false')});
    if(on){
      mfigs.forEach(function(a){a.pause()});
      if(!animPres){animPres=MOD.mount(document.getElementById('animPres'),{onLayout:function(r){ratio=r;fit()}});ratio=animPres.ratio();lastPres=-1}
      else{animPres.resume();lastPres=-1}
      if(fs&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(function(){});
      renderPres();
    }else{
      if(animPres)animPres.pause();
      if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(function(){});
      fit();scrollToStep(cur,false);
    }
    writeURL();
  }
  function go(i){
    if(present){if(i>N-1&&deckHas(1))return deckGo(1);if(i<0&&deckHas(-1))return deckGo(-1);cur=Math.max(0,Math.min(N-1,i));renderPres();writeURL()}
    else scrollToStep(Math.max(0,Math.min(N-1,i)),true);
  }
  function writeURL(){try{var u=new URL(location.href);u.searchParams.set('step',cur+1);if(present)u.searchParams.set('mode','present');else u.searchParams.delete('mode');u.searchParams.delete('present');u.hash='';history.replaceState(null,'',u)}catch(e){}}

  /* ---------- 事件 ---------- */
  document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-mode],[data-go],#pprev,#pnext,#pexit');if(!t)return;
    if(t.dataset.mode){if((t.dataset.mode==='present')!==present)setPresent(t.dataset.mode==='present',t.dataset.mode==='present');return}
    if(t.id==='pprev')return go(cur-1);if(t.id==='pnext')return go(cur+1);if(t.id==='pexit')return setPresent(false,false);
    go(+t.dataset.go);
  });
  document.addEventListener('fullscreenchange',function(){if(!document.fullscreenElement&&present)setPresent(false,false)});
  document.addEventListener('keydown',function(e){
    if(e.metaKey||e.ctrlKey||e.altKey)return;if(e.target&&/INPUT|TEXTAREA/.test(e.target.tagName))return;var k=e.key;
    if(k==='p'||k==='P'){setPresent(!present,!present);return}
    if(present){
      if(k==='ArrowRight'||k==='PageDown'||k===' '){e.preventDefault();go(cur+1)}
      else if(k==='ArrowLeft'||k==='PageUp'){e.preventDefault();go(cur-1)}
      else if(k==='Escape'){setPresent(false,false)}
      else if(k==='Home')go(0);else if(k==='End')go(N-1);
    }
  });
  document.addEventListener('ss-lang',function(){fillMeta();buildDoc();if(present)renderPres()});

  /* ---------- 起始状态：?step=N（或 last）、?mode=present、#present（旧链接） ---------- */
  var qs=P.get('step'),hm=location.hash.match(/^#step-(\d)$/);
  cur=qs==='last'?N-1:(qs?Math.max(0,Math.min(N-1,(parseInt(qs,10)||1)-1)):(hm?Math.max(0,Math.min(N-1,+hm[1]-1)):0));
  var startPresent=P.get('mode')==='present'||P.has('present')||location.hash==='#present';
  function start(){
    if(!art.children.length){fillMeta();buildDoc()}
    if(startPresent)setPresent(true,false);
    else if(qs||hm)scrollToStep(cur,false);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(start,0)});else setTimeout(start,0);
  window.SS_TOPIC={go:go,present:function(){return present},cur:function(){return cur}};
})();
