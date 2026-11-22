/* 公共工具：语言、主题、数据索引、链接。每页先加载 data/*.js，再加载本文件。
   页面在加载前可以设置 window.SS_ROOT（从本页到站点根目录的相对路径，如 '../../'）。 */
(function(){
var SS=window.SS=window.SS||{};
SS.root=window.SS_ROOT||'';
SS.url=function(p){return SS.root+(p||'')};
/* 讲稿功能还没做完，先整体隐藏：首页讲稿区、地图上方的讲稿选择与编辑路线、导航「讲稿」、知识点页的「讲稿：」。改成 true 就放出来。 */
SS.TALKS=false;
if(!SS.TALKS)document.documentElement.classList.add('no-talks');

/* ---------- 语言与主题（沿用设计稿） ---------- */
var q=new URLSearchParams(location.search);
if(q.get('theme')==='dark'||q.get('theme')==='light')document.documentElement.setAttribute('data-theme',q.get('theme'));
/* 三种语言：zh 简体（原文）、tw 繁體（页面照简体渲染后整页转成繁体，用 OpenCC，选到才加载）、en 英文。
   SS.lang() 只回 zh 或 en（内容用哪套），繁体时也是 zh；window.SS_LANG 记实际选的那一个。 */
var LANGS=[['zh','简','简体中文'],['tw','繁','繁體中文'],['en','EN','English']];
function okLang(v){return v==='zh'||v==='tw'||v==='en'}
function getLang(){var v=q.get('lang');if(okLang(v))return v;try{v=localStorage.getItem('ss-lang');return okLang(v)?v:'zh'}catch(e){return 'zh'}}
function putLang(v){try{localStorage.setItem('ss-lang',v)}catch(e){}}
var conv=null,obs=null,loading=null;
function loadT2(){
  if(conv)return Promise.resolve(conv);
  if(loading)return loading;
  loading=new Promise(function(ok,no){var sc=document.createElement('script');
    sc.src='https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/cn2t.js';
    sc.onload=function(){try{conv=window.OpenCC.Converter({from:'cn',to:'tw'});ok(conv)}catch(e){no(e)}};sc.onerror=no;document.head.appendChild(sc)});
  return loading;
}
var SKIP={SCRIPT:1,STYLE:1,CODE:1,KBD:1,TEXTAREA:1};
function convNode(n){
  if(n.nodeType===3){var p=n.parentNode;if(p&&(SKIP[p.nodeName]||(p.closest&&p.closest('[data-noconv]'))))return;var v=n.nodeValue,t=conv(v);if(t!==v)n.nodeValue=t;return}
  if(n.nodeType!==1||SKIP[n.nodeName]||n.hasAttribute('data-noconv'))return;
  ['aria-label','title','placeholder','alt'].forEach(function(k){var v=n.getAttribute(k);if(v){var t=conv(v);if(t!==v)n.setAttribute(k,t)}});
  for(var c=n.firstChild;c;c=c.nextSibling)convNode(c);
}
function toTW(){
  loadT2().then(function(){
    if(window.SS_LANG!=='tw')return;
    convNode(document.body);document.title=conv(document.title);
    if(!obs){obs=new MutationObserver(function(ms){if(window.SS_LANG!=='tw')return;ms.forEach(function(m){
      if(m.type==='characterData')convNode(m.target);else if(m.type==='attributes')convNode(m.target);else m.addedNodes.forEach(convNode)})});
      obs.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title']})}
  }).catch(function(){});
}
function apply(lang){
  var en=lang==='en';
  document.documentElement.lang=en?'en':(lang==='tw'?'zh-Hant-TW':'zh-CN');
  document.querySelectorAll('[data-en]').forEach(function(el){
    if(el.dataset.zh===undefined)el.dataset.zh=el.innerHTML;
    el.innerHTML=en?el.dataset.en:el.dataset.zh;
  });
  document.querySelectorAll('[data-en-label]').forEach(function(el){
    if(el.dataset.zhLabel===undefined)el.dataset.zhLabel=el.getAttribute('aria-label')||'';
    el.setAttribute('aria-label',en?el.dataset.enLabel:el.dataset.zhLabel);
  });
  document.querySelectorAll('[data-lang-set]').forEach(function(b){b.setAttribute('aria-pressed',b.getAttribute('data-lang-set')===lang?'true':'false')});
  window.SS_LANG=lang;document.dispatchEvent(new CustomEvent('ss-lang',{detail:lang}));
  document.querySelectorAll('.glossary-link').forEach(function(a){a.href=SS.termHref()});
  if(lang==='tw')toTW();
}
window.ssSetLang=function(v){if(!okLang(v))return;var was=window.SS_LANG;putLang(v);
  try{var u=new URL(location.href);if(u.searchParams.has('lang')){u.searchParams.set('lang',v);history.replaceState(null,'',u)}}catch(e){}
  if(was==='tw'&&v!=='tw'){location.reload();return}/* 繁体是整页转换出来的，切回别的语言最稳是重新载入 */
  apply(v)};
window.SS_LANG=getLang();
document.addEventListener('DOMContentLoaded',function(){
  var b=document.querySelector('[data-lang-toggle]'),g;
  if(b){g=document.createElement('div');g.className='langs';g.setAttribute('role','group');g.setAttribute('aria-label','语言 / Language');g.setAttribute('data-noconv','');
    LANGS.forEach(function(o){var x=document.createElement('button');x.type='button';x.textContent=o[1];x.title=o[2];x.setAttribute('lang',o[0]==='en'?'en':(o[0]==='tw'?'zh-Hant':'zh-Hans'));
      x.setAttribute('data-lang-set',o[0]);x.addEventListener('click',function(){if(window.SS_LANG!==o[0])window.ssSetLang(o[0])});g.appendChild(x)});
    b.replaceWith(g);
  }
  g=g||document.querySelector('.nav .langs');
  if(g){
    var a=document.createElement('a');a.className='glossary-link';a.textContent='术语表';a.dataset.en='Glossary';
    if(/\/glossary\/(?:index\.html)?$/.test(location.pathname))a.setAttribute('aria-current','page');
    g.before(a);
  }
  apply(getLang());
});
SS.lang=function(){return window.SS_LANG==='en'?'en':'zh'};
SS.L=function(zh,en){return SS.lang()==='en'?en:zh};
SS.T=function(o){return o?(SS.lang()==='en'?(o.en!==undefined?o.en:o[1]):(o.zh!==undefined?o.zh:o[0])):''};

/* ---------- 数据索引 ---------- */
SS.line={};(SS.lines||[]).forEach(function(l){SS.line[l.id]=l});
/* 产品线上各站的一句话说明以知识库产品页为准（data/intro.js），覆盖 stations.js 里的默认说明 */
(function(){var I=SS.intro||{},strip=function(h){return String(h).replace(/<[^>]+>/g,'')};
  Object.keys(I).forEach(function(m){(I[m].products||[]).forEach(function(p){var s=p.st&&SS.stations[p.st];
    if(s&&p.d){s.dBy=s.dBy||{};s.dBy[m]={zh:strip(p.d[0]),en:strip(p.d[1])}}})})})();
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
SS.lineHref=function(mapId,lid){var m=SS.mapById[mapId];return SS.url(m.href)+'#ln-'+lid};
/* 一个站点进去去哪：有知识点页就去知识点页，否则去地图页下方它所在线的列表 */
SS.stationHref=function(id,mapId){
  var s=SS.stations[id];if(!s)return '#';
  if(s.page)return SS.url(s.page);
  if(!mapId||!SS.inMap(id,mapId)){mapId=SS.maps.filter(function(m){return SS.inMap(id,m.id)})[0].id}
  return SS.lineHref(mapId,SS.linesIn(id,mapId)[0]);
};
function readingHref(path){
  var p=new URLSearchParams();
  if(okLang(q.get('lang')))p.set('lang',window.SS_LANG);
  if(q.get('theme')==='dark'||q.get('theme')==='light')p.set('theme',q.get('theme'));
  return SS.url(path)+(p.size?'?'+p:'');
}
SS.termHref=function(id){return readingHref('glossary/index.html')+(id?'#'+encodeURIComponent(id):'')};
SS.termSee=function(term){var s=SS.stations[term.see];return s&&s.st==='live'&&s.page?readingHref(s.page):''};
/* 厂商 logo（data/maps.js 的 SS.brands）。id 没有对应 logo（如 generic）时返回空串。
   cls 定用在哪：tm-lg 首页专题入口、mh-lg 专题图页头、cr-lg 知识点页面包屑，尺寸在 site.css。 */
SS.brandOf=function(id){var s=SS.stations[id];return s&&SS.brands&&SS.brands[s.tag]?s.tag:''};
SS.brandMark=function(bid,cls){var b=SS.brands&&SS.brands[bid];if(!b)return '';
  return '<span class="lg lg-'+bid+(b.backing?' bk':'')+(b.dark?' dk':'')+(cls?' '+cls:'')+'" role="img" aria-label="'+SS.esc(b.name)+'">'+
    '<img class="lg-l" src="'+SS.url(b.src)+'" alt="">'+(b.dark?'<img class="lg-d" src="'+SS.url(b.dark)+'" alt="">':'')+'</span>'};
/* 按线路列知识点（首页与专题图共用）：做完的站深色、可点，后面写步数；没做完的浅灰、不可点；不挂标签、不画分隔线。
   换乘站只放进一条线：primary 表里指定的那条，没指定就放第一条。 */
SS.renderCols=function(el,mapId,primary){if(!el)return;var L=SS.L,m=SS.mapById[mapId];primary=primary||{};
  function item(id){var s=SS.stations[id];
    if(s.st==='live')return '<li><a href="'+SS.stationHref(id,mapId)+'"><span class="n">'+SS.esc(SS.title(id))+'</span>'+(s.steps?'<span class="m">'+s.steps+L(' 步',' steps')+'</span>':'')+'</a></li>';
    return '<li class="wip"><span class="n">'+SS.esc(SS.title(id))+'</span></li>'}
  el.innerHTML=m.lines.map(function(lid){
    var ids=SS.onLine(lid,mapId).filter(function(id){var ls=SS.linesIn(id,mapId);return ls.length===1||primary[id]===lid||(!primary[id]&&ls[0]===lid)});
    return '<div class="col" id="ln-'+lid+'" style="--lc:'+SS.lc(lid)+'"><h3>'+SS.sym(lid)+'<span>'+SS.esc(SS.lineName(lid))+'</span></h3><p class="d">'+SS.esc(SS.T(SS.line[lid].d))+'</p><ul>'+
      ids.map(item).join('')+'</ul></div>'}).join('')};
/* 专题图页头一行：公司 · 成立年份 · 总部（来自 data/intro.js，由知识库公司页生成），返回纯文本 */
SS.introLine=function(mapId){var it=(SS.intro||{})[mapId];if(!it)return '';
  var strip=function(h){return String(h).replace(/<[^>]+>/g,'')},out=[];
  it.rows.forEach(function(r){var k=r.k[0],v=strip(SS.L(r.v[0],r.v[1]));
    if(k==='成立')out.push(SS.L(v.replace(/\s*年$/,'')+' 年成立','Founded '+v));
    else if(k==='总部')out.push(SS.L('总部 '+v,'Headquartered in '+v));
    else out.push(v)});
  return out.join(' · ')};
SS.esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
SS.zhNum=function(n){var d='零一二三四五六七八九';if(n<10)return d[n];if(n<20)return '十'+(n%10?d[n%10]:'');return d[Math.floor(n/10)]+'十'+(n%10?d[n%10]:'')};
SS.lvName=function(lv){return lv===2?SS.L('深入','In depth'):SS.L('入门','Intro')};
SS.stName=function(st){return st==='live'?SS.L('已上线','Live'):SS.L('制作中','In progress')};
SS.store={
  get:function(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},
  set:function(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
};
})();
