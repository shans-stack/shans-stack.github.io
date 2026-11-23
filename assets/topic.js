/* 知识点页共用脚本（所有 topics/<站>/index.html 引用）。
   页面先定义 window.SS_TOPIC_CFG = {anim:'动画模块名', steps:[...], ar:[桌面宽高比, 手机宽高比]}，再引用本文件。
   steps 每项：t 标题 [中, 英]；d 一句话说明 [中, 英]（演示模式也用）；b 正文段落 [[中段...], [英段...]]。
   tabs 可覆盖本步 d、b，首项是最新一代、默认打开，显示时排在最右；动画可按 tab key 提供 figures 示意图，或用 show(i, key) 绘制。
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
  var tabSteps=STEPS.map(function(s,i){return s.tabs&&s.tabs.length?i:-1}).filter(function(i){return i>=0});
  var selected={};
  tabSteps.forEach(function(i){
    var tabs=STEPS[i].tabs,key=P.get('gen-'+(i+1))||P.get('gen');
    selected[i]=tabs.find(function(t){return t.key===key})||tabs[0];
  });
  document.body.style.setProperty('--ar',ar[0]);document.body.style.setProperty('--arm',ar[1]);
  var termData=document.createElement('script'),termsLoaded=false;
  var termsReady=new Promise(function(done){termData.onload=termData.onerror=function(){termsLoaded=true;done()}});
  termData.src=SS.url('data/terms.js');document.head.appendChild(termData);

  /* ---------- 站在哪张图、哪几条线 ---------- */
  var HOME='home',MAP=SS.inMap(id,HOME)?HOME:SS.maps.filter(function(m){return SS.inMap(id,m.id)})[0].id;
  var LS=SS.linesIn(id,MAP);
  document.body.style.setProperty('--lc',SS.lc(LS[0]));
  function li(x){var mid=SS.inMap(x,HOME)?HOME:SS.maps.filter(function(m){return SS.inMap(x,m.id)})[0].id,l=SS.linesIn(x,mid)[0];
    if(SS.stations[x].st!=='live')return '<li class="wip"><span class="w">'+SS.sym(l)+'<span>'+SS.esc(SS.title(x))+'</span></span></li>';
    return '<li><a href="'+SS.stationHref(x,mid)+'">'+SS.sym(l)+'<span>'+SS.esc(SS.title(x))+'</span></a></li>'}
  function fillMeta(){
    var m=SS.mapById[MAP],mapName=MAP===HOME?L('总图','Main Map'):SS.L(m.zh,m.en);
    document.getElementById('crumb').innerHTML='<a href="'+SS.url(m.href)+(LS.length>1?'?hl='+id:'')+'#map">'+SS.esc(mapName)+'</a><span class="sep">/</span>'+
      LS.map(function(l){return '<a href="'+SS.lineHref(MAP,l)+'">'+SS.esc(SS.lineName(l))+'</a>'}).join('<span class="sep">·</span>')+
      SS.brandMark(SS.brandOf(id),'lg');
    var t=SS.talksWith(id),el=document.getElementById('intalks');
    if(el)el.innerHTML=t.length?L('讲稿：','Talks: ')+t.map(function(r){var tm=SS.mapById[r.talk.map];
      return '<a href="'+SS.url(tm.href)+'?talk='+r.talk.id+'#map">'+SS.esc(SS.L(r.talk.zh,r.talk.en))+'</a>'}).join(L('、',', ')):'';
    var srcBox=document.querySelector('.src');if(srcBox&&!srcBox.querySelector('li'))srcBox.hidden=true;  /* 没有出处时不显示空标题 */
    if(tabSteps.length){
      var langs=document.querySelector('.nav .langs');
      if(langs){
        langs.setAttribute('aria-label',L('语言','Language'));
        langs.querySelectorAll('button').forEach(function(b,i){
          b.textContent=T([['简','繁','EN'],['ZH-CN','ZH-TW','EN']])[i];
          b.title=T([['简体中文','繁體中文','English'],['Simplified Chinese','Traditional Chinese','English']])[i];
          b.setAttribute('aria-label',b.title);
          b.lang=T([['zh-Hans','zh-Hant','en'],['en','en','en']])[i];
        });
      }
    }
    document.getElementById('relprev').innerHTML=(st.prev||[]).map(li).join('');
    document.getElementById('relnext').innerHTML=(st.next||[]).map(li).join('');
    document.title=SS.title(id)+' · Shan\'s Stack';
  }

  /* ---------- 讲稿连播（present.html 带进来的参数） ---------- */
  var inDeck=P.has('i')&&(P.has('stops')||P.has('talk'));
  function deckLen(){if(P.get('stops'))return P.get('stops').split(',').length;var t=SS.talkById[P.get('talk')];return t?t.stops.length:0}
  function deckHas(d){var j=+P.get('i')+d;return inDeck&&j>=0&&j<deckLen()}
  function deckGo(d){var u=new URLSearchParams(P);u.set('i',+P.get('i')+d);['step','present','mode'].forEach(function(k){u.delete(k)});if(tabSteps.length){u.delete('gen');tabSteps.forEach(function(i){u.delete('gen-'+(i+1))})}if(d<0)u.set('step','last');location.replace(SS.url('present.html')+'?'+u.toString())}

  function tabId(panel,i){return panel+'-tab-'+i}
  function activeTabId(panel,i){return tabId(panel,STEPS[i].tabs.indexOf(selected[i]))}
  function tabList(i,panel,title){
    return '<div class="gen-tabs" role="tablist" aria-labelledby="'+title+'" data-step="'+i+'">'+STEPS[i].tabs.map(function(t,j){
      var active=t===selected[i];
      return '<button type="button" role="tab" id="'+tabId(panel,j)+'" data-tab="'+j+'" aria-selected="'+active+'" aria-controls="'+panel+'" tabindex="'+(active?0:-1)+'">'+SS.esc(T(t.t))+'</button>';
    }).reverse().join('')+'</div>';   /* 数据里首项是最新一代（默认）；显示时最老在左、最新在右 */
  }
  function figure(v){
    var rows=MOD.figures&&MOD.figures[v.fig||v.key];
    if(!rows)return '';
    return '<figure class="gen-figure"><ul>'+rows.map(function(row){
      return '<li><b>'+SS.esc(T(row[0]))+'</b><span>'+SS.esc(T(row[1]))+'</span></li>';
    }).join('')+'</ul><figcaption>'+SS.esc(T(v.figNote||['示意，不代表实测数字','Schematic, no measured figures']))+'</figcaption></figure>';
  }
  function showAnim(a,i){
    var scene=STEPS[i].scene;
    if(selected[i])a.show(scene===undefined?i:scene,selected[i].key);
    else a.show(scene===undefined?i:scene);
  }

  /* ---------- 文档模式 ---------- */
  function pad(n){return (n<10?'0':'')+n}
  function buildDoc(){
    closeCard();
    art.innerHTML=STEPS.map(function(s,i){
      var v=selected[i]||s,panel='gen-doc-'+i,title=panel+'-title';
      var visual=figure(v);
      return '<section class="sec" id="step-'+(i+1)+'" data-i="'+i+'"><div class="hd2"><h2'+(selected[i]?' id="'+title+'"':'')+'>'+SS.esc(T(s.t))+'</h2></div>'+
        (selected[i]?tabList(i,panel,title)+'<div id="'+panel+'" role="tabpanel" tabindex="0" aria-labelledby="'+activeTabId(panel,i)+'">':'')+
        '<p class="lead">'+SS.esc(T(v.d))+'</p><div class="figbox">'+(visual||'<div class="mhost" data-i="'+i+'"></div>')+'</div><div class="bd">'+T(v.b).join('')+'</div>'+
        (selected[i]?'</div>':'')+'</section>';
    }).join('')+viewSec();
    wikify();
    prog.innerHTML=STEPS.map(function(s,i){return '<button type="button" data-go="'+i+'" aria-label="'+(i+1)+'"></button>'}).join('');
    mountDocAnims();
  }
  /* 维基式站内链接：正文里出现别的已上线站的名字，自动链过去，每一步只链第一次；
     同名站先取当前专题图上的，再取总图上的，仍分不清就不链。鼠标悬停弹出那一站的标题和一句话说明。 */
  function wikify(scope){
    var cand=Object.create(null);
    // 不带厂商名的同名或通用标题只在该专题使用。
    var localNames=new Set(['v-catalog','v-vec','v-nfs','v-smb','v-s3','v-block','v-mt','v-mgmt','v-repl','v-snap','v-ncp','v-dedup','d-mds','d-oss','d-insight','d-horizon','w-nfssmb','w-s3','w-snap','w-ncp','n-ncp','v-kvp','d-kvp']);
    Object.keys(SS.stations).forEach(function(k){var s=SS.stations[k];if(s.st!=='live')return;
      var ns=[],labels=localNames.has(k)&&!SS.inMap(k,MAP)?[]:[s.zh,s.en];
      labels.concat(s.kw||[]).forEach(function(n){if((k==='v-repl'&&n==='复制')||(k==='v-mgmt'&&n==='Management'))return;
        ns.push(n.replace(/\n/g,''),n.replace(/\n/g,' '))});
      ns.forEach(function(n){n=n.trim();if(n.length<2)return;cand[n]=cand[n]||[];if(cand[n].indexOf(k)<0)cand[n].push(k)})});
    function pick(ids){if(ids.length===1)return ids[0];var m=ids.filter(function(x){return SS.inMap(x,MAP)});if(m.length===1)return m[0];
      var h=ids.filter(function(x){return SS.inMap(x,HOME)});return h.length===1?h[0]:null}
    function esc(t){return t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
    var al=/[A-Za-z0-9]/,ascii=/^[\x00-\x7f]+$/;
    function pattern(n){return ascii.test(n)?'(?<![A-Za-z0-9])'+esc(n)+'(?![A-Za-z0-9])':esc(n)}
    var aliases=Object.create(null);
    Object.keys(SS.terms||{}).forEach(function(x){var t=SS.terms[x];
      [t.zh,t.en].concat(t.alias||[]).forEach(function(n){aliases[n.toLowerCase()]=x})});
    var names=Object.keys(aliases).sort(function(a,b){return b.length-a.length});
    var glossary=names.length?new RegExp(names.map(pattern).join('|'),'gi'):null;
    names=Object.keys(cand).sort(function(a,b){return b.length-a.length});
    if(names.length)mark(new RegExp(names.map(pattern).join('|'),'g'),function(n){var x=pick(cand[n]);return x===id?null:x},'wl','a,code,b',function(x){return SS.url(SS.stations[x].page)});
    if(glossary)mark(glossary,function(n){return aliases[n.toLowerCase()]},'wt','a,code',SS.termHref);
    function mark(re,lookup,cls,skip,href){
      var termPass=cls==='wt';
      (scope?[scope]:art.querySelectorAll('.sec')).forEach(function(sec){
        var used=new Set();
        sec.querySelectorAll('.lead,.bd p,.bd li,.cmp td').forEach(function(el){
          var w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),nodes=[],full=el.textContent,offset=0;
          while(w.nextNode())nodes.push(w.currentNode);
          // 短站名不能从更具体的术语中截出一段，例如「对象存储目标」。
          var terms=[];
          if(!termPass&&glossary){glossary.lastIndex=0;terms=Array.from(full.matchAll(glossary))}
          nodes.forEach(function(tn){
            var t=tn.nodeValue,m,last=0,frag=null,start=offset;offset+=t.length;
            if(tn.parentNode.closest(skip))return;
            re.lastIndex=0;
            while((m=re.exec(t))){
              var term=m[0],b=m.index,e=b+term.length;
              if(ascii.test(term)&&(al.test(full.charAt(start+b-1))||al.test(full.charAt(start+e))))continue;
              if(terms.some(function(hit){return hit[0].length>term.length&&hit.index<=start+b&&hit.index+hit[0].length>=start+e}))continue;
              var x=lookup(term);if(!x||used.has(x))continue;used.add(x);
              frag=frag||document.createDocumentFragment();frag.appendChild(document.createTextNode(t.slice(last,b)));
              var a=document.createElement('a');a.className=cls;a.href=href(x);a.setAttribute('data-'+cls,x);a.textContent=term;
              if(termPass){a.setAttribute('aria-controls','term-card');a.setAttribute('aria-expanded','false')}
              frag.appendChild(a);last=e;
            }
            if(frag){frag.appendChild(document.createTextNode(t.slice(last)));tn.parentNode.replaceChild(frag,tn)}
          });
        });
      });
    }
  }
  var card=document.createElement('div'),anchor=null,hideTimer,activated=false;
  card.id='term-card';card.className='wlcard';card.hidden=true;document.body.appendChild(card);
  function closeCard(){
    clearTimeout(hideTimer);
    if(anchor&&anchor.dataset.wt)anchor.setAttribute('aria-expanded','false');
    card.hidden=true;anchor=null;activated=false;
  }
  function showCard(a,tap){
    closeCard();anchor=a;activated=tap;
    var t=SS.terms&&SS.terms[a.dataset.wt],esc=SS.esc;
    card.classList.toggle('term-card',!!t);
    card.classList.toggle('term-tap',tap);
    if(t){
      var see=SS.termSee(t);
      card.innerHTML='<b>'+esc(SS.T(t))+'</b><span>'+esc(SS.T(t.d))+'</span>'+
        (see?'<a href="'+esc(see)+'">'+esc(L('详见：','See: ')+SS.title(t.see))+'</a>':'')+
        '<a href="'+esc(a.getAttribute('href'))+'">'+L('术语表','Glossary')+'</a>';
      a.setAttribute('aria-expanded','true');
    }else{
      var x=a.dataset.wl,mid=SS.inMap(x,HOME)?HOME:SS.maps.filter(function(m){return SS.inMap(x,m.id)})[0].id;
      card.innerHTML='<b>'+esc(SS.title(x))+'</b><span>'+esc(SS.desc(x,mid))+'</span>';
    }
    var r=a.getBoundingClientRect(),cw=Math.min(340,innerWidth-32);
    card.style.width=cw+'px';card.hidden=false;
    card.style.left=Math.max(16,Math.min(r.left,innerWidth-cw-16))+scrollX+'px';
    var above=t&&r.bottom+8+card.offsetHeight>innerHeight&&r.top>=card.offsetHeight+16;
    card.style.top=(above?r.top-card.offsetHeight-8:r.bottom+8)+scrollY+'px';
    if(tap)card.querySelector('a').focus({preventScroll:true});
  }
  function leaveCard(e){
    if(!anchor||activated||anchor.contains(e.relatedTarget)||card.contains(e.relatedTarget)||card.contains(document.activeElement))return;
    if(anchor.dataset.wt)hideTimer=setTimeout(closeCard,220);else closeCard();
  }
  art.addEventListener('pointerover',function(e){
    var a=e.target.closest('a.wl,a.wt');
    if(!a||e.pointerType!=='mouse')return;
    if(a!==anchor)showCard(a,false);else clearTimeout(hideTimer);
  });
  art.addEventListener('pointerout',function(e){if(anchor&&anchor.contains(e.target))leaveCard(e)});
  card.addEventListener('pointerenter',function(){clearTimeout(hideTimer)});
  card.addEventListener('pointerleave',leaveCard);
  card.addEventListener('focusout',function(e){if(!card.contains(e.relatedTarget)&&e.relatedTarget!==anchor)closeCard()});
  document.addEventListener('click',function(e){
    var a=e.target.closest('a.wt');
    if(a&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey&&(e.detail===0||!matchMedia('(hover:hover)').matches||e.pointerType==='touch')){
      e.preventDefault();showCard(a,true);
    }else if(!card.contains(e.target))closeCard();
  });
  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape'||!anchor)return;
    var a=anchor,restore=card.contains(document.activeElement);closeCard();
    if(restore)a.focus({preventScroll:true});
  });
  /* 通用知识点页末尾：有哪家厂商的说明就列哪家（data/vendors.js），依次排列、不比高低，只在文档模式出现 */
  function compareSec(){
    var c=SS.vendorCompare&&SS.vendorCompare[id];if(!c)return '';
    var head='<tr><th></th>'+c.cols.map(function(v){var x=SS.vendorById[v];return '<th scope="col">'+SS.brandMark(v,'lg')+'</th>'}).join('')+'</tr>';
    var body=c.rows.map(function(r){return '<tr><th scope="row">'+SS.esc(T(r.h))+'</th>'+r.v.map(function(x){return '<td>'+SS.esc(T(x))+'</td>'}).join('')+'</tr>'}).join('');
    return '<section class="sec vw cmp" id="compare"><div class="hd2"><h2>'+SS.esc(L('各厂商的实现','Vendor Implementations'))+'</h2></div><div class="bd"><p>'+SS.esc(T(c.note))+'</p></div><div class="tw"><table>'+head+body+'</table></div></section>';
  }
  function viewSec(){
    return compareSec()+(SS.vendors||[]).map(function(v){var n=v.notes&&v.notes[id];if(!n)return '';
      var see=(n.see||[]).filter(function(x){return SS.stations[x]}).map(function(x){var s2=SS.stations[x];
        return s2.st==='live'?'<li><a href="'+SS.url(s2.page)+'">'+SS.esc(SS.title(x))+'</a></li>':'<li class="wip">'+SS.esc(SS.title(x))+'</li>'}).join('');
      return '<section class="sec vw" id="vendor-'+v.id+'"><div class="hd2"><h2>'+SS.esc(L(v.zh+' 怎么做','How '+v.en+' Does It'))+SS.brandMark(v.id,'lg')+'</h2></div><div class="bd">'+
        T([n.zh,n.en]).map(function(t){return '<p>'+SS.esc(t)+'</p>'}).join('')+(see?'<ul class="see">'+see+'</ul>':'')+'</div></section>'}).join('');
  }
  function mountDocAnims(){
    if(io){io.disconnect();io=null}
    mfigs.forEach(function(a){a.destroy()});mfigs=[];
    io=new IntersectionObserver(function(es){es.forEach(function(e){
      var h=e.target,a=h.__anim;
      if(e.isIntersecting&&!present){if(!a){a=MOD.mount(h,{});showAnim(a,+h.dataset.i);mfigs.push(a)}else a.resume()}
      else if(a)a.pause();
    })},{threshold:0.25});
    art.querySelectorAll('.mhost').forEach(function(h){io.observe(h)});
  }
  function activeFromScroll(){
    var a=0,line=innerHeight*0.42;
    art.querySelectorAll('.sec[data-i]').forEach(function(s,i){if(s.getBoundingClientRect().top<line)a=i});
    return a;
  }
  var ticking=false;
  addEventListener('scroll',function(){if(present||ticking)return;ticking=true;requestAnimationFrame(function(){ticking=false;var a=activeFromScroll();if(a!==cur){cur=a;writeURL()}})},{passive:true});
  function scrollToStep(i,smooth){var s=document.getElementById('step-'+(i+1));if(!s)return;cur=i;writeURL();
    var top=s.getBoundingClientRect().top+scrollY-16;window.scrollTo({top:top,behavior:smooth&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'auto'})}

  /* ---------- 演示模式 ---------- */
  var ratio=ar[0];
  var pdesc=document.getElementById('pdesc'),pfig=document.getElementById('pfig');
  var presTabs=null,presFigure=null;
  if(tabSteps.length||STEPS.some(function(s){return s.fig})){
    presFigure=document.createElement('div');presFigure.className='gen-present';presFigure.hidden=true;pfig.appendChild(presFigure);
  }
  function fit(){
    var h=document.getElementById('animPres');if(!present){h.style.width='';return}
    var b=document.getElementById('pfig').getBoundingClientRect();h.style.width=Math.floor(Math.min(b.width,b.height*ratio))+'px';
  }
  addEventListener('resize',fit);
  function renderPres(){
    var s=STEPS[cur],v=selected[cur]||s,n=cur+1;
    document.getElementById('ptitle').textContent=T(s.t);pdesc.textContent=T(v.d);
    if(presTabs){presTabs.remove();presTabs=null}
    if(selected[cur]){
      pdesc.insertAdjacentHTML('beforebegin',tabList(cur,'pdesc','ptitle'));presTabs=pdesc.previousElementSibling;
      pdesc.setAttribute('role','tabpanel');pdesc.setAttribute('tabindex','0');pdesc.setAttribute('aria-labelledby',activeTabId('pdesc',cur));
    }else if(tabSteps.length){
      ['role','tabindex','aria-labelledby'].forEach(function(k){pdesc.removeAttribute(k)});
    }
    var c=n+' / '+N;
    if(inDeck)c+=L('　讲稿第 '+(+P.get('i')+1)+' 站，共 '+deckLen()+' 站','　Talk stop '+(+P.get('i')+1)+' of '+deckLen());
    document.getElementById('pcnt').textContent=c;
    prog.querySelectorAll('button').forEach(function(b){var i=+b.dataset.go;b.setAttribute('aria-current',i===cur?'step':'false');b.classList.toggle('done',i<cur)});
    prog.style.setProperty('--pv',N>1?cur/(N-1):1);
    document.getElementById('pprev').disabled=cur===0&&!deckHas(-1);
    document.getElementById('pnext').disabled=cur===N-1&&!deckHas(1);
    if(presFigure){
      var html=figure(v);
      presFigure.hidden=!html;presFigure.innerHTML=html;
      document.getElementById('animPres').hidden=!!html;
      if(html){animPres.pause();lastPres=-1;return}
      animPres.resume();
    }
    fit();
    if(animPres&&lastPres!==cur){lastPres=cur;showAnim(animPres,cur)}
  }
  function setPresent(on,fs){
    closeCard();
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
  function selectTab(b,focus){
    var i=+b.parentElement.dataset.step,v=STEPS[i].tabs[+b.dataset.tab];
    if(v===selected[i])return;
    selected[i]=v;closeCard();
    try{
      var u=new URL(location.href);u.searchParams.set('gen',v.key);
      if(tabSteps.length>1)tabSteps.forEach(function(j){u.searchParams.set('gen-'+(j+1),selected[j].key)});
      history.replaceState(null,'',u);
    }catch(e){}
    var panel=document.getElementById('gen-doc-'+i),activeId=activeTabId(panel.id,i);
    panel.previousElementSibling.querySelectorAll('button').forEach(function(t){
      t.setAttribute('aria-selected',t.id===activeId);t.tabIndex=t.id===activeId?0:-1;
    });
    panel.setAttribute('aria-labelledby',activeId);
    panel.querySelector('.lead').textContent=T(v.d);
    panel.querySelector('.bd').innerHTML=T(v.b).join('');
    var visual=panel.querySelector('.gen-figure'),h=panel.querySelector('.mhost');
    if(visual)visual.outerHTML=figure(v);
    else if(h&&h.__anim)showAnim(h.__anim,i);
    wikify(panel);
    if(present){lastPres=-1;renderPres();b=document.getElementById(b.id)}
    if(focus)b.focus({preventScroll:true});
  }
  if(tabSteps.length){
    document.addEventListener('click',function(e){var b=e.target.closest('.gen-tabs [role=tab]');if(b)selectTab(b,true)});
    document.addEventListener('keydown',function(e){
      var b=e.target.closest('.gen-tabs [role=tab]');if(!b||e.metaKey||e.ctrlKey||e.altKey)return;
      var tabs=b.parentElement.children,n=tabs.length,i=Array.prototype.indexOf.call(tabs,b),k=e.key;   /* 按显示顺序左右移动 */
      if(k==='ArrowLeft')i=(i+n-1)%n;else if(k==='ArrowRight')i=(i+1)%n;
      else if(k==='Home')i=0;else if(k==='End')i=n-1;
      else if(k!==' ')return;
      e.stopImmediatePropagation();
      if(k!==' '){e.preventDefault();selectTab(tabs[i],true)}
    });
  }
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
  document.addEventListener('ss-lang',function(){
    fillMeta();
    function render(){buildDoc();if(present)renderPres()}
    if(termsLoaded)render();else termsReady.then(render);
  });

  /* ---------- 起始状态：?step=N（或 last）、?mode=present、#present（旧链接） ---------- */
  var qs=P.get('step'),hm=location.hash.match(/^#step-(\d)$/);
  cur=qs==='last'?N-1:(qs?Math.max(0,Math.min(N-1,(parseInt(qs,10)||1)-1)):(hm?Math.max(0,Math.min(N-1,+hm[1]-1)):0));
  var startPresent=P.get('mode')==='present'||P.has('present')||location.hash==='#present';
  function start(){
    if(!art.children.length){fillMeta();buildDoc()}
    if(startPresent)setPresent(true,false);
    else if(qs||hm)scrollToStep(cur,false);
  }
  function queueStart(){termsReady.then(function(){setTimeout(start,0)})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queueStart);else queueStart();
  window.SS_TOPIC={go:go,present:function(){return present},cur:function(){return cur}};
})();
