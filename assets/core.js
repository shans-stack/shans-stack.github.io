/* 公共工具：语言、主题、数据索引、链接。每页先加载 data/*.js，再加载本文件。
   页面在加载前可以设置 window.SS_ROOT（从本页到站点根目录的相对路径，如 '../../'）。 */
(function(){
var SS=window.SS=window.SS||{};
SS.root=window.SS_ROOT||'';
SS.url=function(p){return SS.root+(p||'')};

/* ---------- 语言与主题（沿用设计稿） ---------- */
var q=new URLSearchParams(location.search);
if(q.get('theme')==='dark'||q.get('theme')==='light')document.documentElement.setAttribute('data-theme',q.get('theme'));
function getLang(){if(q.get('lang')==='en'||q.get('lang')==='zh')return q.get('lang');try{return localStorage.getItem('ss-lang')||'zh'}catch(e){return 'zh'}}
function putLang(v){try{localStorage.setItem('ss-lang',v)}catch(e){}}
function apply(lang){
  document.documentElement.lang=lang==='en'?'en':'zh-CN';
  document.querySelectorAll('[data-en]').forEach(function(el){
    if(el.dataset.zh===undefined)el.dataset.zh=el.innerHTML;
    el.innerHTML=lang==='en'?el.dataset.en:el.dataset.zh;
  });
  document.querySelectorAll('[data-en-label]').forEach(function(el){
    if(el.dataset.zhLabel===undefined)el.dataset.zhLabel=el.getAttribute('aria-label')||'';
    el.setAttribute('aria-label',lang==='en'?el.dataset.enLabel:el.dataset.zhLabel);
  });
  var b=document.querySelector('[data-lang-toggle]');
  if(b){b.textContent=lang==='en'?'中文':'EN';b.setAttribute('aria-label',lang==='en'?'切换到中文':'Switch to English')}
  window.SS_LANG=lang;document.dispatchEvent(new CustomEvent('ss-lang',{detail:lang}));
}
window.ssToggleLang=function(){var n=window.SS_LANG==='en'?'zh':'en';putLang(n);apply(n)};
window.SS_LANG=getLang();
document.addEventListener('DOMContentLoaded',function(){
  var b=document.querySelector('[data-lang-toggle]');if(b)b.addEventListener('click',window.ssToggleLang);
  apply(getLang());
});
SS.lang=function(){return window.SS_LANG==='en'?'en':'zh'};
SS.L=function(zh,en){return SS.lang()==='en'?en:zh};
SS.T=function(o){return o?(SS.lang()==='en'?(o.en!==undefined?o.en:o[1]):(o.zh!==undefined?o.zh:o[0])):''};

/* ---------- 数据索引 ---------- */
SS.line={};(SS.lines||[]).forEach(function(l){SS.line[l.id]=l});
SS.mapById={};(SS.maps||[]).forEach(function(m){SS.mapById[m.id]=m});
SS.talkById={};(SS.talks||[]).forEach(function(t){SS.talkById[t.id]=t});
SS.mapOfLine=function(lid){return SS.line[lid]?SS.line[lid].map:null};
SS.rawName=function(id){var s=SS.stations[id];return s?(SS.lang()==='en'?s.en:s.zh):id};
/* 折行符：两边有英文字母或数字时换成空格，否则直接去掉 */
SS.flat=function(raw){return String(raw).replace(/(.)?\n(.)?/g,function(m,a,b){a=a||'';b=b||'';return a+(/[\x21-\x7e]/.test(a)||/[\x21-\x7e]/.test(b)?' ':'')+b})};
SS.name=function(id){return SS.flat(SS.rawName(id))};
SS.title=function(id){var s=SS.stations[id];return s&&s.t?SS.T(s.t):SS.name(id)};
SS.desc=function(id,mapId){var s=SS.stations[id];if(!s)return '';var d=(mapId&&s.dBy&&s.dBy[mapId])||s.d;return d?SS.T(d):SS.L('（说明待补）','(Description to come)')};
SS.posOf=function(id,mapId){var p=SS.stations[id].pos;return typeof p==='number'?p:(p&&p[mapId]!==undefined?p[mapId]:0)};
SS.inMap=function(id,mapId){var s=SS.stations[id],m=SS.mapById[mapId];return !!(s&&m&&s.lines.some(function(l){return m.lines.indexOf(l)>-1}))};
SS.linesIn=function(id,mapId){var m=SS.mapById[mapId];return SS.stations[id].lines.filter(function(l){return m.lines.indexOf(l)>-1}).sort(function(a,b){return m.lines.indexOf(a)-m.lines.indexOf(b)})};
SS.stationsOf=function(mapId,o){
  return Object.keys(SS.stations).filter(function(id){return SS.inMap(id,mapId)&&((o&&o.all)||!SS.stations[id].hidden)});
};
SS.onLine=function(lid,mapId,o){
  return SS.stationsOf(mapId,o).filter(function(id){return SS.stations[id].lines.indexOf(lid)>-1}).sort(function(a,b){return SS.posOf(a,mapId)-SS.posOf(b,mapId)});
};
SS.lineName=function(lid){var l=SS.line[lid];return l?SS.L(l.zh,l.en):lid};
SS.gutName=function(lid){var l=SS.line[lid];return l.gut&&SS.T(l.gut)?SS.T(l.gut):SS.lineName(lid)};
SS.lc=function(lid){return 'var(--'+SS.line[lid].slot+')'};
SS.sym=function(lid,cls){var l=SS.line[lid];return '<svg'+(cls?' class="'+cls+'"':'')+' style="fill:'+SS.lc(lid)+'" aria-hidden="true"><use href="#'+l.sym+'"/></svg>'};
/* 专题图里的站对应总图上哪一站：自己就在总图上，或者写了 generic */
SS.homeOf=function(id){var s=SS.stations[id];if(!s)return null;if(SS.inMap(id,'home'))return id;return s.generic&&SS.stations[s.generic]?s.generic:null};
SS.talksWith=function(id){var r=[];(SS.talks||[]).forEach(function(t){var i=t.stops.indexOf(id);if(i>-1)r.push({talk:t,n:i+1})});return r};
SS.lineHref=function(mapId,lid,sid){var m=SS.mapById[mapId];return SS.url(m.href)+'?line='+encodeURIComponent(lid)+(sid?'&st='+encodeURIComponent(sid):'')+'#map'};
/* 一个站点进去去哪：有知识点页就去知识点页，否则去它所在线的单线图 */
SS.stationHref=function(id,mapId){
  var s=SS.stations[id];if(!s)return '#';
  if(s.page)return SS.url(s.page);
  if(!mapId||!SS.inMap(id,mapId)){mapId=SS.maps.filter(function(m){return SS.inMap(id,m.id)})[0].id}
  return SS.lineHref(mapId,SS.linesIn(id,mapId)[0],id);
};
/* 厂商 logo（data/maps.js 的 SS.brands）。id 没有对应 logo（如 generic）时返回空串。
   cls 定用在哪：tm-lg 首页专题入口、mh-lg 专题图页头、cr-lg 知识点页面包屑，尺寸在 site.css。 */
SS.brandOf=function(id){var s=SS.stations[id];return s&&SS.brands&&SS.brands[s.tag]?s.tag:''};
SS.brandMark=function(bid,cls){var b=SS.brands&&SS.brands[bid];if(!b)return '';
  return '<span class="lg lg-'+bid+(b.backing?' bk':'')+(b.dark?' dk':'')+(cls?' '+cls:'')+'" role="img" aria-label="'+SS.esc(b.name)+'">'+
    '<img class="lg-l" src="'+SS.url(b.src)+'" alt="">'+(b.dark?'<img class="lg-d" src="'+SS.url(b.dark)+'" alt="">':'')+'</span>'};
SS.esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
SS.zhNum=function(n){var d='零一二三四五六七八九';if(n<10)return d[n];if(n<20)return '十'+(n%10?d[n%10]:'');return d[Math.floor(n/10)]+'十'+(n%10?d[n%10]:'')};
SS.lvName=function(lv){return lv===2?SS.L('深入','In depth'):SS.L('入门','Intro')};
SS.stName=function(st){return st==='live'?SS.L('已上线','Live'):SS.L('制作中','In progress')};
SS.store={
  get:function(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},
  set:function(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
};
})();
