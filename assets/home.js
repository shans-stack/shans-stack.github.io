/* 首页（总图）其余区块：专题入口、讲稿、按线路找知识点、换乘站、最近新增。全部从 data/ 生成。 */
(function(){
var SS=window.SS,L=SS.L,$=function(id){return document.getElementById(id)};
var HOME='home',map=SS.mapById[HOME];
function lead(){
  var n=SS.stationsOf(HOME).length,x=SS.stationsOf(HOME).filter(function(id){return SS.linesIn(id,HOME).length>1}).length;
  var el=$('lead');if(!el)return;
  el.textContent=L('六条线、'+SS.zhNum(n)+'个站，每站五到七步讲完。',
    'Six lines, '+n+' stops, each told in 5 to 7 steps.');
}
function topics(){
  $('topicmaps').innerHTML=SS.maps.filter(function(m){return m.kind==='topic'}).map(function(m){
    var live=m.st==='live',n=live?SS.stationsOf(m.id).length:0;
    var syms=m.lines.map(function(l){return SS.sym(l)}).join('');
    var inner='<div class="tm-s">'+(syms||'<i class="tm-e"></i>')+SS.brandMark(m.brand,'tm-lg')+'</div><h3>'+SS.esc(SS.L(m.zh,m.en))+(live?'':' <span class="tag">'+L('整理中','In preparation')+'</span>')+'</h3><p>'+SS.esc(SS.T(m.d))+'</p>'+
      (live?'<p class="meta">'+L(m.lines.length+' 条线，'+n+' 个站',m.lines.length+' lines, '+n+' stops')+'</p>':'');
    return live?'<a class="tm" href="'+SS.url(m.href)+'">'+inner+'</a>':'<div class="tm off" aria-disabled="true">'+inner+'</div>';
  }).join('');
}
function talks(){
  var ts=SS.talks.filter(function(t){return t.map===HOME});
  $('talklist').innerHTML=ts.map(function(t){
    var first=t.stops.filter(function(id){return SS.stations[id].page})[0];
    return '<div class="talk" data-talkcard="'+t.id+'"><h3>'+SS.esc(SS.L(t.zh,t.en))+'</h3><p class="meta">'+L(t.stops.length+' 个知识点，'+t.min+' 分钟',t.stops.length+' topics, '+t.min+' min')+'</p><ol>'+
      t.stops.map(function(id){return '<li><a href="'+SS.stationHref(id,HOME)+'">'+SS.esc(SS.title(id))+'</a><span>'+SS.linesIn(id,HOME).map(function(l){return SS.sym(l)}).join('')+'</span></li>'}).join('')+
      '</ol><div class="acts"><button class="btn" type="button" data-pick="'+t.id+'" aria-pressed="false">'+L('在线路图上看','Show on the map')+'</button>'+
      '<a class="btn dark" href="'+SS.url('present.html')+'?map=home&talk='+t.id+'&i=0">'+L('开始讲','Present')+'</a>'+
      (first?'<a class="btn" href="'+SS.url(SS.stations[first].page)+'">'+L('网页看','Read on the web')+'</a>':'')+'</div></div>';
  }).join('');
}
/* 做完的站深色、可点，后面写步数；还没做的站浅灰、不可点。不挂标签、不分级、不画分隔线。 */
function item(id,extra){var s=SS.stations[id];
  if(s.st==='live')return '<li><a href="'+SS.stationHref(id,HOME)+'"><span class="n">'+SS.esc(SS.title(id))+'</span>'+(s.steps?'<span class="m">'+s.steps+L(' 步',' steps')+'</span>':'')+(extra||'')+'</a></li>';
  return '<li class="wip"><span class="n">'+SS.esc(SS.title(id))+'</span>'+(extra||'')+'</li>'}
/* 换乘站不单独列，按这张表放进最相关的那条线（地图上的胶囊照旧）。 */
var HOMELINE={rdma:'n',nvmeof:'n',gds:'s',dist:'c',ckpt:'d',vec:'a'};
function cols(){
  $('cols').innerHTML=map.lines.map(function(lid){
    var ids=SS.onLine(lid,HOME).filter(function(id){var ls=SS.linesIn(id,HOME);return ls.length===1||HOMELINE[id]===lid||(ls.length>1&&!HOMELINE[id]&&ls[0]===lid)});
    return '<div class="col" style="--lc:'+SS.lc(lid)+'"><h3>'+SS.sym(lid)+'<span>'+SS.esc(SS.lineName(lid))+'</span></h3><p class="d">'+SS.esc(SS.T(SS.line[lid].d))+'</p><ul>'+
      ids.map(function(id){return item(id)}).join('')+'</ul></div>';
  }).join('');
}
function news(){
  var ids=Object.keys(SS.stations).filter(function(id){return SS.stations[id].added&&SS.stations[id].st==='live'}).sort(function(a,b){return SS.stations[a].added<SS.stations[b].added?1:-1}).slice(0,4);
  $('news').innerHTML=ids.map(function(id){var s=SS.stations[id],mid=SS.inMap(id,HOME)?HOME:SS.maps.filter(function(m){return SS.inMap(id,m.id)})[0].id,ls=SS.linesIn(id,mid);
    var where=ls.length>1?L(ls.map(SS.lineName).join('、')+'线换乘站。',ls.map(SS.lineName).join(', ')+' transfer stop. '):L(SS.lineName(ls[0])+'线。',SS.lineName(ls[0])+' line. ');
    return '<a href="'+SS.stationHref(id,mid)+'"><svg style="fill:'+SS.lc(ls[ls.length>1?1:0])+'"><use href="#'+SS.line[ls[ls.length>1?1:0]].sym+'"/></svg><div><b>'+SS.esc(SS.title(id))+'</b><span>'+SS.esc(where+SS.desc(id,mid))+'</span></div></a>'}).join('');
}
function sync(){var p=SS.mapState&&SS.mapState.pinned;document.querySelectorAll('[data-pick]').forEach(function(b){b.setAttribute('aria-pressed',b.getAttribute('data-pick')===p?'true':'false')});
  document.querySelectorAll('[data-talkcard]').forEach(function(c){c.classList.toggle('lit',c.getAttribute('data-talkcard')===p)})}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-pick]');if(!b)return;SS.mapPick(b.getAttribute('data-pick'));sync()});
document.addEventListener('mouseover',function(e){var c=e.target.closest&&e.target.closest('[data-talkcard]');if(c&&SS.mapPreview)SS.mapPreview(c.getAttribute('data-talkcard'))});
document.addEventListener('mouseout',function(e){var c=e.target.closest&&e.target.closest('[data-talkcard]');if(c&&!c.contains(e.relatedTarget)&&SS.mapPreview)SS.mapPreview(null)});
document.addEventListener('ss-map',sync);
document.addEventListener('ss-lang',function(){lead();topics();talks();cols();news();sync()});
})();
