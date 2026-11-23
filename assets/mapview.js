/* 地图页控制器：总图和专题图共用。
   页面里放 <div id="map" data-map="地图 id">（结构见 index.html），加载本文件即可。
   地址参数：
     ?talk=<讲稿 id>        载入某场讲稿
     ?stops=a,b,c&name=…   载入一套自定义站序（「保存为讲稿」生成的链接）
     ?edit=1               打开路线编辑器
     ?hl=<站 id>           高亮某站（从专题图过来时用）
   点线名跳到页面下方「按线路找知识点」里那条线的列表。 */
(function(){
var SS=window.SS,M=SS.Metro,L=SS.L;
var root=document.getElementById('map');if(!root)return;
var mapId=root.dataset.map,map=SS.mapById[mapId],topic=map.kind!=='main';
var $=function(id){return document.getElementById(id)};
var svg=$('metro'),box=$('mapbox'),mlist=$('mlist'),pop=$('pop'),pnl=$('pnl'),cap=$('cap'),key=$('key'),pick=$('pick'),warnEl=$('warn');
var q=new URLSearchParams(location.search);
var talks=SS.talks.filter(function(t){return t.map===mapId});
var st={talk:null,stops:null,name:'',custom:false,panel:false,mode:'browse',showAll:false,
  hl:q.get('hl'),preview:null,pinned:null,popId:null,msg:''};

function loadTalk(t){if(!t)return;st.talk=t.id;st.stops=t.stops.slice();st.name='';st.custom=false}
function talkName(){if(st.custom||!st.talk)return st.name;var t=SS.talkById[st.talk];return SS.L(t.zh,t.en)}
if(q.get('stops')){st.stops=q.get('stops').split(',').filter(function(id){return SS.stations[id]&&SS.inMap(id,mapId)});st.name=q.get('name')||'';st.custom=true;st.panel=true}
else if(q.get('talk')&&SS.talkById[q.get('talk')]&&SS.talkById[q.get('talk')].map===mapId)loadTalk(SS.talkById[q.get('talk')]);
else if(q.get('route')!==null&&talks[+q.get('route')])loadTalk(talks[+q.get('route')]);
else if(SS.TALKS&&topic&&map.talk)loadTalk(SS.talkById[map.talk]);
if(!topic&&st.talk)st.pinned=st.talk;
if(q.get('edit')){st.panel=true;st.mode='edit';if(!st.stops)loadTalk(SS.talkById[map.talk])}
if(st.hl&&!SS.inMap(st.hl,mapId))st.hl=null;

/* ---------- 当前要显示什么 ---------- */
function current(){
  var stops=st.preview?SS.talkById[st.preview].stops:(st.stops&&(st.panel||st.pinned||topic)?st.stops:null);
  var rt=stops&&stops.length?M.route(mapId,stops):null;
  var base=SS.stationsOf(mapId),fade={},show,sel={};
  (st.stops||[]).forEach(function(id){sel[id]=1});
  var only=st.panel&&st.mode==='edit'&&!st.showAll&&!st.preview;
  var extra=(stops||[]).concat(rt?Object.keys(rt.via):[]);
  if(only)show=uniq(extra);
  else{show=uniq(base.concat(extra));if(st.panel&&st.mode==='edit')base.forEach(function(id){if(!sel[id]&&!(rt&&rt.via[id]))fade[id]=1})}
  var lines=only?map.lines.filter(function(l){return show.some(function(id){return SS.stations[id].lines.indexOf(l)>-1})}):map.lines;
  return {rt:rt,show:show,fade:fade,lines:lines,sel:sel,edit:st.panel&&st.mode==='edit'};
}
function uniq(a){var o=[];a.forEach(function(x){if(o.indexOf(x)<0)o.push(x)});return o}

/* ---------- 画图 ---------- */
var lastModel=null;
function draw(){
  var c=current();
  if(!c.lines.length){
    svg.innerHTML='';svg.removeAttribute('viewBox');svg.style.display='none';
    box.querySelector('.empty')||box.insertAdjacentHTML('afterbegin','<p class="empty"></p>');
    box.querySelector('.empty').textContent=L('还没有选站。在清单里加站，或打开「显示全图」再点站加入。','No stops yet. Add some from the list, or turn on “Show full map” and click stops.');
    mlist.innerHTML='';showWarn('');lastModel=null;return;
  }
  var e=box.querySelector('.empty');if(e)e.remove();svg.style.display='';
  var m=M.layout(mapId,{show:c.show,lines:c.lines});lastModel=m;
  M.render(svg,m,{route:c.rt,fade:c.fade,hl:st.hl,sel:c.edit?c.sel:null,
    label:L(map.zh+'线路图：','Line map, '+map.en+': ')+c.lines.map(SS.lineName).join(L('、',', ')),
    stationHref:function(id){return SS.stationHref(id,mapId)},lineHref:function(l){return SS.lineHref(mapId,l)}});
  m.warn.filter(function(w){return w!=='TOOFULL'}).forEach(function(w){console.warn('[地铁图 '+mapId+'] '+w)});
  if(m.tooFull){console.warn('[地铁图 '+mapId+'] 这张图太满，建议拆图（需要列距 '+m.pNeed+'px，标准宽度下只有 '+Math.round(954/(m.K-1))+'px）');
    /* 这条是给作者的提示，只留在控制台，不显示给读者 */}
  else showWarn('');
  drawList(c);
}
function showWarn(t){warnEl.hidden=!t;warnEl.textContent=t}

/* 手机：按线竖排 */
function drawList(c){
  var stops=c.rt?c.rt.stops:[],h='';
  /* 虚线支线不单列：它的站排在分出它的那一站后面，归进那一站所在的线 */
  function on(lid,id){return SS.stations[id].lines.indexOf(lid)>-1}
  var kidsOf={};c.lines.forEach(function(l){var b=SS.line[l].branch;if(b)(kidsOf[b]=kidsOf[b]||[]).push(l)});
  c.lines.filter(function(l){return !SS.line[l].branch}).forEach(function(lid){
    var base=c.show.filter(function(id){return on(lid,id)}).sort(function(a,b){return SS.posOf(a,mapId)-SS.posOf(b,mapId)}),ids=[];
    base.forEach(function(id){ids.push(id);(kidsOf[id]||[]).forEach(function(bl){c.show.filter(function(k){return on(bl,k)}).sort(function(a,b){return SS.posOf(a,mapId)-SS.posOf(b,mapId)}).forEach(function(k){if(ids.indexOf(k)<0)ids.push(k)})})});
    h+='<div class="mline" style="--lc:'+SS.lc(lid)+'"><h3><a href="'+SS.lineHref(mapId,lid)+'" data-line="'+lid+'">'+SS.sym(lid)+SS.esc(SS.lineName(lid))+'</a><small>'+ids.length+L(' 站',' stops')+'</small></h3><ol>';
    ids.forEach(function(id){
      var s=SS.stations[id],ls=SS.linesIn(id,mapId),x=ls.length>1,n=stops.indexOf(id);
      var here=n>-1&&c.rt.at[n].line===lid,mark=topic&&SS.inMap(id,'home');
      var tr=x?'<span class="tr">'+ls.filter(function(l){return l!==lid}).map(function(l){return SS.sym(l)}).join('')+'</span>':'';
      if(s.pair&&SS.inMap(s.pair,mapId))tr+='<span class="tr">'+L('另见','see also')+' '+SS.esc(SS.name(s.pair))+'</span>';
      if(mark)tr+='<span class="tr">↗ '+L('总图','main map')+'</span>';
      h+='<li class="'+(x?'x ':'')+(s.pair?'p ':'')+(here?'stop ':'')+(c.fade[id]?'fd ':'')+(c.sel[id]&&c.edit?'sel ':'')+'"><a href="'+SS.stationHref(id,mapId)+'" data-id="'+id+'"><span class="mk"><i>'+(here?n+1:'')+'</i></span><span class="nm">'+SS.esc(SS.name(id))+tr+'</span></a></li>';
    });
    h+='</ol></div>';
  });
  mlist.innerHTML=h;mlist.classList.toggle('on',!!c.rt);
}

/* ---------- 说明、图例、讲稿选择 ---------- */
function caption(){
  cap.hidden=false;
  var c=current();
  if(!c.rt){
    cap.hidden=true;return;/* 地图说明已在页首，不再重复 */
    return;
  }
  var r=c.rt,n=r.stops.length,t=st.preview?SS.talkById[st.preview]:(!st.custom&&st.talk?SS.talkById[st.talk]:null);
  var nm=t?SS.L(t.zh,t.en):(st.name||L('自定义讲解','Custom talk'));
  var meta=L(n+' 站'+(t?'，'+t.min+' 分钟':'')+'，换乘 '+r.transfers+' 次',n+' stops'+(t?', '+t.min+' min':'')+', '+r.transfers+(r.transfers===1?' transfer':' transfers'));
  if(r.jumps.length)meta+=L('；有 '+r.jumps.length+' 段之间没有换乘，用虚线跳过','; '+r.jumps.length+' leg(s) have no transfer and are drawn as a dashed jump');
  var go=!st.preview&&!st.panel&&st.stops&&st.stops.length?'<p class="cacts"><a class="btn sm dark" href="'+presentHref()+'">'+L('开始讲','Present')+'</a><button class="btn sm" type="button" data-edit>'+L('编辑这条路线','Edit this route')+'</button></p>':'';
  cap.innerHTML='<p><b>'+SS.esc(nm)+'</b>　'+meta+'</p>'+go+'<ol>'+r.stops.map(function(id,i){return '<li style="--lc:'+SS.lc(r.at[i].line)+'"><i>'+(i+1)+'</i>'+SS.esc(SS.name(id))+'</li>'}).join('')+'</ol>';
}
function legend(){
  key.innerHTML=map.lines.filter(function(l){return !SS.line[l].branch}).map(function(l){return '<span>'+SS.sym(l)+'<i class="bar" style="background:'+SS.lc(l)+'"></i>'+SS.esc(SS.lineName(l))+'</span>'}).join('')+
    '<span><i class="cap-k"></i>'+L('换乘站','Transfer stop')+'</span><span><i class="pr-k"></i>'+L('同一主题，另一站在不相邻的线上','Same topic, other stop on a non-adjacent line')+'</span>'+
    (topic?'<span><i class="gn-k"></i>'+L('粗圈：总图上也有的通识站','Bold ring: a general stop that is also on the main map')+'</span>':'');
}
function chips(){
  var h='<span>'+L('讲稿','Talks')+'</span>';
  talks.forEach(function(t){h+='<button class="chip" type="button" data-talk="'+t.id+'" aria-pressed="'+((st.pinned===t.id||(topic||st.panel)&&st.talk===t.id&&!st.custom)?'true':'false')+'"><span>'+SS.esc(SS.L(t.zh,t.en))+'</span><small>'+L(t.stops.length+' 站 '+t.min+' 分钟',t.stops.length+' stops · '+t.min+' min')+'</small></button>'});
  h+='<button class="chip" type="button" data-edit aria-pressed="'+(st.panel?'true':'false')+'"><span>'+L('编辑路线','Edit a route')+'</span></button>';
  pick.innerHTML=h;
}

/* ---------- 编辑器 ---------- */
function panel(){
  pnl.hidden=!st.panel;root.classList.toggle('withpnl',st.panel);
  if(!st.panel){pnl.innerHTML='';return}
  var stops=st.stops||[],c=current(),rt=c.rt,open={};
  pnl.querySelectorAll('details').forEach(function(d){open[d.dataset.k]=d.open});
  var h='<div class="pnl-hd"><h3>'+L('本次讲解','This talk')+'</h3><div class="seg" role="group" aria-label="'+L('模式','Mode')+'">'+
    '<button type="button" data-mode="browse" aria-pressed="'+(st.mode==='browse')+'">'+L('浏览','Browse')+'</button><button type="button" data-mode="edit" aria-pressed="'+(st.mode==='edit')+'">'+L('编辑','Edit')+'</button></div></div>'+
    '<p class="hint">'+(st.mode==='edit'?L('点站加入或移出。图上只显示选中的站。','Click a stop to add or remove it. Only chosen stops are shown.'):L('点站看一句话说明。要改路线，切到「编辑」。','Click a stop for its one-line summary. Switch to Edit to change the route.'))+'</p>';
  if(st.mode==='edit')h+='<label class="sw"><input type="checkbox" data-showall'+(st.showAll?' checked':'')+'> '+L('显示全图（未选的站淡成底图）','Show full map (unchosen stops faded)')+'</label>';
  h+='<label class="tn"><span>'+L('讲稿名','Talk name')+'</span><input type="text" data-tname maxlength="60" value="'+SS.esc(talkName()||'')+'" placeholder="'+L('给这次讲解起个名字','Name this talk')+'"></label>';
  if(stops.length){
    h+='<ol class="tl">'+stops.map(function(id,i){var lid=rt&&rt.at[i]?rt.at[i].line:SS.linesIn(id,mapId)[0];
      return '<li draggable="true" data-i="'+i+'" style="--lc:'+SS.lc(lid)+'"><span class="grip" aria-hidden="true">⋮⋮</span><i>'+(i+1)+'</i><span class="n">'+SS.esc(SS.name(id))+'</span><span class="b">'+
        '<button type="button" data-up="'+i+'" aria-label="'+L('上移','Move up')+'"'+(i===0?' disabled':'')+'>↑</button><button type="button" data-down="'+i+'" aria-label="'+L('下移','Move down')+'"'+(i===stops.length-1?' disabled':'')+'>↓</button><button type="button" data-rm="'+i+'" aria-label="'+L('移出','Remove')+'">✕</button></span></li>'}).join('')+'</ol>'+
      '<p class="meta">'+L(stops.length+' 站，换乘 '+(rt?rt.transfers:0)+' 次',stops.length+' stops, '+(rt?rt.transfers:0)+' transfers')+'</p>';
  }else h+='<p class="meta">'+L('还没有站。','No stops yet.')+'</p>';
  h+='<div class="acts"><a class="btn dark'+(stops.length?'':' off')+'" href="'+presentHref()+'"'+(stops.length?'':' aria-disabled="true" tabindex="-1"')+'>'+L('开始讲','Present')+'</a>'+
    '<button class="btn" type="button" data-save>'+L('保存为讲稿','Save as talk')+'</button><button class="btn" type="button" data-link>'+L('复制链接','Copy link')+'</button></div>'+
    '<p class="msg" aria-live="polite">'+st.msg+'</p>';
  /* 线路开关 */
  h+='<details data-k="lines"'+(open.lines?' open':'')+'><summary>'+L('整条线加入或移出','Whole lines')+'</summary><ul class="lsw">'+map.lines.map(function(lid){
    var ids=SS.onLine(lid,mapId),n=ids.filter(function(id){return stops.indexOf(id)>-1}).length,s=n===0?'false':(n===ids.length?'true':'mixed');
    return '<li><button type="button" role="switch" aria-checked="'+s+'" data-line-sw="'+lid+'"><i class="tg"></i>'+SS.sym(lid)+'<span>'+SS.esc(SS.lineName(lid))+'</span><small>'+n+'/'+ids.length+'</small></button></li>'}).join('')+'</ul></details>';
  /* 加站 */
  h+='<details data-k="add"'+(open.add?' open':'')+'><summary>'+L('加站','Add stops')+'</summary>'+map.lines.map(function(lid){
    var ids=SS.onLine(lid,mapId,{all:true}).filter(function(id){return stops.indexOf(id)<0});if(!ids.length)return '';
    return '<p class="al">'+SS.sym(lid,'mini')+SS.esc(SS.lineName(lid))+'</p><p class="ad">'+ids.map(function(id){var hd=SS.stations[id].hidden;
      return '<button type="button" data-add="'+id+'"'+(hd?' class="hd" title="'+L('默认不显示','Not shown by default')+'"':'')+'>+ '+SS.esc(SS.name(id))+'</button>'}).join('')+'</p>'}).join('')+'</details>';
  /* 已保存 */
  var saved=SS.store.get('ss-talks',[]).filter(function(t){return t.map===mapId});
  h+='<details data-k="saved"'+(open.saved?' open':'')+'><summary>'+L('已保存的讲稿','Saved talks')+'（'+saved.length+'）</summary>'+(saved.length?'<ul class="sv">'+saved.map(function(t){
    return '<li><span>'+SS.esc(t.name)+' <small>'+t.stops.length+L(' 站',' stops')+'</small></span><button type="button" data-load="'+t.id+'">'+L('载入','Load')+'</button><button type="button" data-del="'+t.id+'">'+L('删除','Delete')+'</button></li>'}).join('')+'</ul>':
    '<p class="meta">'+L('还没有。保存在这台设备的浏览器里。','None yet. Saved in this browser only.')+'</p>')+'</details>';
  pnl.innerHTML=h;
}
function presentHref(){var s=st.stops||[];if(!s.length)return '#';
  if(!st.custom&&st.talk)return SS.url('present.html')+'?map='+mapId+'&talk='+st.talk+'&i=0';
  return SS.url('present.html')+'?map='+mapId+'&stops='+encodeURIComponent(s.join(','))+(talkName()?'&name='+encodeURIComponent(talkName()):'')+'&i=0'}
function shareLink(){var base=location.href.split('#')[0].split('?')[0],s=st.stops||[];
  return base+'?stops='+encodeURIComponent(s.join(','))+(talkName()?'&name='+encodeURIComponent(talkName()):'')+'#map'}
function changed(){st.custom=true;if(st.talk&&!st.name){var t=SS.talkById[st.talk];st.name=SS.L(t.zh,t.en)+L('（改）',' (edited)')}st.pinned=null;st.msg='';all()}
function toggle(id){st.stops=st.stops||[];var i=st.stops.indexOf(id);if(i>-1)st.stops.splice(i,1);else st.stops.push(id);changed()}
function copy(text){try{if(navigator.clipboard)return navigator.clipboard.writeText(text).then(function(){return true},function(){return false})}catch(e){}return Promise.resolve(false)}

/* ---------- 点站：浏览时弹出一句话，编辑时加入或移出 ---------- */
function openPop(id,anchor,note){
  st.popId=id;var s=SS.stations[id],ls=SS.linesIn(id,mapId),home=topic&&SS.homeOf(id);
  var acts='';
  if(s.page)acts+='<a class="btn sm dark" href="'+SS.url(s.page)+'">'+L('打开知识点','Open topic')+'</a>';
  if(home)acts+='<a class="btn sm" href="'+SS.url('index.html')+'?hl='+home+'#map">'+L('在总图中查看 ↗','See on the main map ↗')+'</a>';
  if(st.panel)acts+='<button class="btn sm" type="button" data-toggle="'+id+'">'+((st.stops||[]).indexOf(id)>-1?L('移出讲解','Remove from talk'):L('加入讲解','Add to talk'))+'</button>';
  pop.innerHTML='<div class="pop-hd"><span class="pop-s">'+ls.map(function(l){return SS.sym(l)}).join('')+'</span><b>'+SS.esc(SS.title(id))+'</b><button type="button" class="x" data-close aria-label="'+L('关闭','Close')+'">✕</button></div>'+
    (note?'<p class="pop-n">'+SS.esc(note)+'</p>':'')+
    '<p class="pop-l">'+ls.map(function(l){return SS.esc(SS.lineName(l))+L('线','')}).join(L('、',', '))+' · '+SS.lvName(s.lv)+(s.st==='live'?'':' · '+L('整理中','In progress'))+'</p>'+
    '<p class="pop-d">'+SS.esc(SS.desc(id,mapId))+'</p>'+(SS.links||[]).filter(function(k){return k.map===mapId&&(k.a===id||k.b===id)}).map(function(k){var o=k.a===id?k.b:k.a;
      return '<p class="pop-k">'+L('连接：','Linked: ')+'<b>'+SS.esc(SS.title(o))+'</b>　'+SS.esc(SS.T(k.d))+'</p>'}).join('')+'<p class="acts">'+acts+'</p>';
  pop.hidden=false;
  var b=box.getBoundingClientRect(),r=anchor?anchor.getBoundingClientRect():{left:b.left+b.width/2,width:0,bottom:b.top+40,top:b.top};
  var w=pop.offsetWidth,left=Math.max(4,Math.min(b.width-w-4,r.left-b.left+r.width/2-w/2)),top=r.bottom-b.top+8;
  if(top+pop.offsetHeight>b.height+60&&r.top-b.top-pop.offsetHeight-8>0)top=r.top-b.top-pop.offsetHeight-8;
  pop.style.left=left+'px';pop.style.top=top+'px';
  var f=pop.querySelector('[data-close]');if(f)f.focus({preventScroll:true});
}
function closePop(){pop.hidden=true;st.popId=null}


root.addEventListener('click',function(e){
  var t=e.target.closest?e.target:null;if(!t)return;
  var a;
  if((a=t.closest('[data-close]'))){closePop();return}
  if((a=t.closest('[data-toggle]'))){toggle(a.getAttribute('data-toggle'));if(st.popId){var an=svg.querySelector('[data-id="'+st.popId+'"]');openPop(st.popId,an)}return}
  if((a=t.closest('a.stn, .mlist a[data-id]'))){e.preventDefault();var id=a.getAttribute('data-id');
    if(st.panel&&st.mode==='edit'){toggle(id);return}
    if(st.popId===id&&!pop.hidden){closePop();return}openPop(id,a);return}
  if((a=t.closest('[data-talk]'))){var id2=a.getAttribute('data-talk');
    if(topic||st.panel){loadTalk(SS.talkById[id2]);st.msg=''}else{st.pinned=st.pinned===id2?null:id2;if(st.pinned)loadTalk(SS.talkById[id2]);else st.stops=null}
    st.preview=null;all();return}
  if(t.closest('[data-edit]')){st.panel=!st.panel;if(st.panel){st.mode='edit';st.showAll=false;if(!st.stops)loadTalk(SS.talkById[st.pinned||map.talk])}all();return}
  if((a=t.closest('[data-mode]'))){st.mode=a.getAttribute('data-mode');closePop();all();return}
  if((a=t.closest('[data-up]'))){var i=+a.getAttribute('data-up');move(i,i-1);return}
  if((a=t.closest('[data-down]'))){var j=+a.getAttribute('data-down');move(j,j+1);return}
  if((a=t.closest('[data-rm]'))){st.stops.splice(+a.getAttribute('data-rm'),1);changed();return}
  if((a=t.closest('[data-add]'))){st.stops=st.stops||[];st.stops.push(a.getAttribute('data-add'));changed();return}
  if((a=t.closest('[data-line-sw]'))){var lid=a.getAttribute('data-line-sw'),ids=SS.onLine(lid,mapId);st.stops=st.stops||[];
    var all1=ids.every(function(id){return st.stops.indexOf(id)>-1});
    if(all1)st.stops=st.stops.filter(function(id){return ids.indexOf(id)<0});else ids.forEach(function(id){if(st.stops.indexOf(id)<0)st.stops.push(id)});changed();return}
  if(t.closest('[data-save]')){var nm=(talkName()||'').trim();if(!nm){st.msg=L('先起个名字。','Give it a name first.');panel();var inp=pnl.querySelector('[data-tname]');if(inp)inp.focus();return}
    if(!(st.stops||[]).length){st.msg=L('还没有站。','No stops yet.');panel();return}
    var saved=SS.store.get('ss-talks',[]);saved.push({id:'u'+Date.now(),map:mapId,name:nm,stops:st.stops.slice()});
    var ok=SS.store.set('ss-talks',saved),link=shareLink();
    try{history.replaceState({},'',link)}catch(x){}
    st.msg=(ok?L('已保存在这台设备的浏览器里。','Saved in this browser.'):L('这个浏览器不让存，链接照样能用：','This browser will not store it, but the link still works: '))+' <a href="'+SS.esc(link)+'">'+L('讲稿链接','Talk link')+'</a>';
    copy(link).then(function(c){if(c){st.msg+=L('（已复制）',' (copied)');panel()}});panel();return}
  if(t.closest('[data-link]')){var lk=shareLink();try{history.replaceState({},'',lk)}catch(x){}
    copy(lk).then(function(c){st.msg=(c?L('链接已复制：','Link copied: '):L('链接：','Link: '))+'<a href="'+SS.esc(lk)+'">'+SS.esc(lk.length>60?lk.slice(0,57)+'…':lk)+'</a>';panel()});return}
  if((a=t.closest('[data-load]'))){var sv=SS.store.get('ss-talks',[]).filter(function(x){return x.id===a.getAttribute('data-load')})[0];
    if(sv){st.stops=sv.stops.filter(function(id){return SS.stations[id]});st.name=sv.name;st.custom=true;st.talk=null;st.msg=''}all();return}
  if((a=t.closest('[data-del]'))){SS.store.set('ss-talks',SS.store.get('ss-talks',[]).filter(function(x){return x.id!==a.getAttribute('data-del')}));panel();return}
  if(t.closest('a.off')){e.preventDefault();return}
  if(!t.closest('.pop')&&!pop.hidden)closePop();
});
root.addEventListener('change',function(e){if(e.target.matches('[data-showall]')){st.showAll=e.target.checked;all()}});
root.addEventListener('input',function(e){if(e.target.matches('[data-tname]')){st.name=e.target.value;st.custom=true;var p=pnl.querySelector('a.btn.dark');if(p)p.href=presentHref()}});
function move(i,j){var s=st.stops;if(j<0||j>=s.length)return;var x=s.splice(i,1)[0];s.splice(j,0,x);changed()}
/* 拖动排序（桌面）；手机上用上下按钮 */
var dragI=null;
pnl.addEventListener('dragstart',function(e){var li=e.target.closest&&e.target.closest('li[data-i]');if(!li)return;dragI=+li.dataset.i;li.classList.add('drag');try{e.dataTransfer.setData('text/plain',String(dragI));e.dataTransfer.effectAllowed='move'}catch(x){}});
pnl.addEventListener('dragover',function(e){if(dragI===null)return;var li=e.target.closest&&e.target.closest('li[data-i]');if(li){e.preventDefault();pnl.querySelectorAll('.over').forEach(function(x){x.classList.remove('over')});li.classList.add('over')}});
pnl.addEventListener('drop',function(e){var li=e.target.closest&&e.target.closest('li[data-i]');if(dragI===null||!li)return;e.preventDefault();var to=+li.dataset.i,from=dragI;dragI=null;move(from,to)});
pnl.addEventListener('dragend',function(){dragI=null;pnl.querySelectorAll('.drag,.over').forEach(function(x){x.classList.remove('drag','over')})});
/* 讲稿卡片、选择按钮悬停时预览路线（总图） */
root.addEventListener('mouseover',function(e){var b=e.target.closest&&e.target.closest('.chip[data-talk]');if(!b||topic||st.panel)return;var id=b.getAttribute('data-talk');if(st.preview!==id){st.preview=id;draw();caption()}});
root.addEventListener('mouseout',function(e){var b=e.target.closest&&e.target.closest('.chip[data-talk]');if(!b||!st.preview)return;if(b.contains(e.relatedTarget))return;st.preview=null;draw();caption()});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!pop.hidden)closePop()});
SS.mapPick=function(id){if(topic||st.panel){loadTalk(SS.talkById[id])}else{st.pinned=st.pinned===id?null:id;if(st.pinned)loadTalk(SS.talkById[id]);else st.stops=null}st.preview=null;all();
  if(st.pinned||st.panel){var r=root.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)root.scrollIntoView({behavior:'smooth',block:'start'})}return st.pinned};
SS.mapPreview=function(id){if(topic||st.panel)return;st.preview=id;draw();caption()};

function all(){chips();draw();caption();legend();panel();document.dispatchEvent(new CustomEvent('ss-map',{detail:{map:mapId,talk:st.pinned}}))}
document.addEventListener('ss-lang',function(){all();if(st.hl){var a=svg.querySelector('[data-id="'+st.hl+'"]');if(a&&!SS._hlDone){SS._hlDone=1;root.scrollIntoView({block:'start'});setTimeout(function(){openPop(st.hl,svg.querySelector('[data-id="'+st.hl+'"]'),L('从专题图打开。','Opened from a topic map.'))},60)}}});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){if(window.SS_LANG)all()});
SS.mapState=st;SS.mapModel=function(){return lastModel};
})();
