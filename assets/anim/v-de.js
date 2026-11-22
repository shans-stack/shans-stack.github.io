/* DataEngine：数据一落地就触发函数：7 步动画（SVG，按时间写死的时间线，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-de'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-de.css，全部限定在 .ssa-v-de 容器之内。
   VAST 字标用 <image> 引用 assets/brand/vast-wordmark-black.svg 与 -white.svg 原件（浅色黑字、深色白字），每个画面只标一处。 */
(function(){
var ID='v-de',NSTEP=7;
var EN={"    … return 结果":"    … return result","DataEngine 流水线":"DataEngine pipeline","触发器":"Trigger","监听事件":"Watches events","函数部署 A":"Function deployment A","函数部署 B":"Function deployment B","函数 A":"Function A","函数 B":"Function B","容器镜像仓库":"Container registry","函数资源引用镜像":"A function references a container image","事件":"Event","触发器 → 函数 → 函数：一条流水线":"Trigger → function → function: one pipeline",
"客户端":"Client","源视图":"Source view","元素触发器":"Element trigger","后缀 .jpg":"Suffix .jpg","定时触发器":"Schedule trigger","按计划":"On a schedule","不匹配":"No match","按前缀、后缀过滤，事件写进 topic":"Filtered by prefix or suffix; events go to a topic",
"分区 0":"Partition 0","分区 1":"Partition 1","函数实例 ":"Instance ","已处理 ":"Processed ","按序：每个分区一次只处理一个":"Ordered: one event per partition at a time","不按序：可以并发，不保证先后":"Unordered: concurrent, order not guaranteed","换成不按序":"Switch to unordered","换成按序":"Switch to ordered","切换投递方式，当前 ":"Switch delivery, now ","按序":"ordered","不按序":"unordered","示意，不代表实测数字":"Schematic, not measured",
"vastde 构建":"vastde build","本地 Docker":"Local Docker","镜像仓库":"Container registry","代码":"Code","镜像 v2":"Image v2","函数资源 · 版本 2":"Function · revision 2","函数资源":"Function","流水线":"Pipeline","函数资源引用仓库中的镜像":"The function references a registry image",
"计算":"Compute","集群":"cluster","存储":"Storage","保留给存储":"Kept for storage","外部 Kubernetes":"External Kubernetes","节点 1":"Node 1","节点 2":"Node 2","节点 3":"Node 3","VAST 计算集群使用选定的 CNode 资源":"VAST compute uses resources from selected CNodes","外部 Kubernetes 运行函数":"External Kubernetes runs the functions","换成外部 Kubernetes":"Switch to external Kubernetes","换成 CNode 计算集群":"Switch to CNode compute cluster","切换运行位置，当前 ":"Switch where functions run, now ","CNode 计算集群":"CNode compute cluster","Event Broker topic":"Event Broker topic",
"识别类型":"Detect type","图片处理":"Images","文档处理":"Documents","标签：图片":"Label: image","标签：文档":"Label: document","攒批":"Batch","一次处理 3 个":"3 in one call","按标签路由，按条数或超时组批":"Route by label, batch by count or timeout",
"运行追踪":"Execution traces","死信 topic":"Dead-letter topic","运行":"Run","函数":"Function","结果":"Result","成功":"OK","失败":"Failed","追踪关联函数执行与结果":"Traces show function execution and results","失败事件进入配置的死信 topic":"Failed events go to a configured dead-letter topic",
"DataEngine：触发器、函数与流水线，事件驱动的函数在 VAST 上运行":"DataEngine: triggers, functions and pipelines; event-driven functions on VAST"};
var ENM={"函数部署 A":"Deployment A","函数部署 B":"Deployment B","容器镜像仓库":"Registry","函数资源引用镜像":"Function references image","触发器 → 函数 → 函数：一条流水线":"Trigger → functions: a pipeline","按前缀、后缀过滤，事件写进 topic":"Filter by prefix/suffix, then a topic","按序：每个分区一次只处理一个":"Ordered: one per partition","不按序：可以并发，不保证先后":"Unordered: concurrent","换成不按序":"Unordered","换成按序":"Ordered","函数资源引用仓库中的镜像":"Function references an image","函数资源 · 版本 2":"Function · rev 2","VAST 计算集群使用选定的 CNode 资源":"VAST compute uses CNode resources","外部 Kubernetes 运行函数":"Functions run on external Kubernetes","换成外部 Kubernetes":"External K8s","换成 CNode 计算集群":"CNode cluster","外部 Kubernetes":"External K8s","保留给存储":"Storage only","按标签路由，按条数或超时组批":"Route by label, batch by count or timeout","运行追踪":"Execution traces","死信 topic":"Dead-letter topic","追踪关联函数执行与结果":"Traces show function results","失败事件进入配置的死信 topic":"Failures go to a dead-letter topic","一次处理 3 个":"3 per call","Event Broker topic":"topic","元素触发器":"Element","定时触发器":"Schedule"};
var ARIA="DataEngine：触发器、函数与流水线，事件驱动的函数在 VAST 上运行";
function lang(){return window.SS_LANG==='en'?'en':'zh'}
var NS='http://www.w3.org/2000/svg';
function mount(host,opts){
opts=opts||{};
host.classList.add('ssa-'+ID);host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','ssa-scene');svg.setAttribute('role','img');host.appendChild(svg);
const tgl=document.createElement('button');tgl.className='tgl';tgl.type='button';tgl.hidden=true;host.appendChild(tgl);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mq=matchMedia('(max-width: 640px)');
const qs=new URLSearchParams(location.search);
let L=null,E,S,step=0,T0=0,raf=0,last=0,paused=!!opts.paused,dead=false,pausedAt=0;
/* 文字：中文原样，英文取 EN；手机版放不下的用 ENM */
function T(s){if(lang()!=='en')return s;if(L&&L.mobile&&ENM[s]!==undefined)return ENM[s];return EN[s]!==undefined?EN[s]:s}
/* ---------- 通用小工具 ---------- */
function el(tag,a,p){const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);(p||svg).appendChild(e);return e}
function tx(x,y,s,size,cls,anchor,p){const t=el('text',{x:+x.toFixed(1),y:+y.toFixed(1),'font-size':size,class:cls||''},p);if(anchor)t.setAttribute('text-anchor',anchor);t.textContent=T(s);return t}
function grp(show,p,extra){const g=el('g',Object.assign({class:'vis'},extra||{}),p);if(show)g.dataset.show=show;return g}
function box(r,p,cls,rx){return el('rect',{x:r.x,y:r.y,width:r.w,height:r.h,rx:rx==null?12:rx,class:cls||'box'},p)}
function line(a,b,cls,p){return el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'ln '+(cls||'')},p)}
function poly(pts,cls,p){return el('path',{d:'M'+pts.map(q=>q.x.toFixed(1)+' '+q.y.toFixed(1)).join(' L'),class:'ln '+(cls||'')},p)}
const R=(x,y,w,h)=>({x,y,w,h});
const C=r=>({x:r.x+r.w/2,y:r.y+r.h/2});
const P=(x,y)=>({x,y});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sm=u=>u<=0?0:u>=1?1:u*u*(3-2*u);
const fade=(t,t0,t1)=>clamp((t-t0)/(t1-t0),0,1);
function plen(pts){let s=0;for(let i=1;i<pts.length;i++)s+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);return s}
function at(pts,u){u=clamp(u,0,1);let d=u*plen(pts);for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],l=Math.hypot(b.x-a.x,b.y-a.y);if(d<=l||i===pts.length-1){const k=l?Math.min(1,d/l):0;return {x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k}}d-=l}return pts[pts.length-1]}
function rev(pts){return pts.slice().reverse()}
function cat(...ps){const o=[];ps.forEach(p=>p.forEach(q=>{const l=o[o.length-1];if(!l||Math.abs(l.x-q.x)>0.01||Math.abs(l.y-q.y)>0.01)o.push(q)}));return o}
/* 端口与折线：桌面从左往右流（右边中点到左边中点），手机从上往下流（下边中点到上边中点）；转角处走直角 */
const out_=(r,d)=>L.mobile?P(r.x+r.w/2+(d||0),r.y+r.h):P(r.x+r.w,r.y+r.h/2+(d||0));
const in_=(r,d)=>L.mobile?P(r.x+r.w/2+(d||0),r.y):P(r.x,r.y+r.h/2+(d||0));
function elbowH(a,b,mx){if(Math.abs(a.y-b.y)<0.5)return [a,b];mx=mx==null?(a.x+b.x)/2:mx;return [a,P(mx,a.y),P(mx,b.y),b]}
function elbowV(a,b,my){if(Math.abs(a.x-b.x)<0.5)return [a,b];my=my==null?(a.y+b.y)/2:my;return [a,P(a.x,my),P(b.x,my),b]}
function link(A,B,m,da,db){const a=out_(A,da),b=in_(B,db);return L.mobile?elbowV(a,b,m):elbowH(a,b,m)}
/* 会动的东西：数据块、圆点、带字的小牌子 */
function pk(cls,w,h){const W=w||L.pw,H=h||L.ph;const r=el('rect',{x:-W/2,y:-H/2,width:W,height:H,rx:4,class:'pkt '+(cls||'')},E.pk);const o={el:r};S.items.push(o);put(o,-99,-99,0);return o}
function dot(cls,r){const c=el('circle',{r:r||L.dr,cx:0,cy:0,class:'dot '+(cls||'')},E.pk);const o={el:c};S.items.push(o);put(o,-99,-99,0);return o}
function tile(s,w,h,cls,fs){const g=el('g',{class:'tile '+(cls||'')},E.pk);el('rect',{x:-w/2,y:-h/2,width:w,height:h,rx:6},g);const t=tx(0,0,s,fs||L.f.sm,'tt','middle',g);const o={el:g,t:t};S.items.push(o);put(o,-99,-99,0);return o}
function put(o,x,y,a){if(typeof x==='object'){a=y;y=x.y;x=x.x}o.x=x;o.y=y;o.a=a==null?1:a;o.el.setAttribute('transform',`translate(${x.toFixed(1)} ${y.toFixed(1)})`);o.el.style.opacity=o.a}
function setText(o,s){const v=T(s);if(o.t.textContent!==v)o.t.textContent=v}
function run(o,pts,t,t0,dur,fo){fo=fo==null?0.3:fo;if(t<t0||t>t0+dur+fo){put(o,-99,-99,0);return -1}const u=(t-t0)/dur;if(u<=1){put(o,at(pts,sm(u)),1);return u}put(o,pts[pts.length-1],1-(t-t0-dur)/fo);return 1.5}
const dur=(pts,sp)=>plen(pts)/(sp||L.sp);
/* VAST 字标：<image> 引用 assets/brand/ 里的原件，浅色模式黑字、深色模式白字；(x,y) 为左端、竖直居中 */
function vlogo(x,y,h,p){const w=h*66/14,g=el('g',{class:'vlogo'},p),base=(window.SS_ROOT||'')+'assets/brand/';
  ['black','white'].forEach(c=>{const i=el('image',{x:x.toFixed(1),y:(y-h/2).toFixed(1),width:w.toFixed(1),height:h,class:c==='black'?'vwm-l':'vwm-d',preserveAspectRatio:'xMinYMid meet'},g);i.setAttribute('href',base+'vast-wordmark-'+c+'.svg')});
  g.w=w;return g}
/* 带 VAST 字标的标题：字标在前，名字紧跟其后，同一行 */
function vtitle(x,y,s,fs,cls,p,h){const g=vlogo(x,y,h||L.lg,p);return tx(x+g.w+Math.round(fs*0.4),y,s,fs,cls||'ttl','start',p)}
function cap(s,c){E.cap.textContent=T(s);E.cap.setAttribute('class','st '+(c||'ink2-t'))}
function lit(els,c,on){(Array.isArray(els)?els:[els]).forEach(e=>e&&e.classList.toggle(c,!!on))}
/* ---------- 场景 ---------- */
const SCENE={
 still:[2.6,3.2,4.0,3.8,3.0,6.4,7.4],
 toggles:{2:{param:'order',values:['ordered','unordered'],label:v=>v==='ordered'?'换成不按序':'换成按序',aria:'切换投递方式，当前 ',name:v=>v==='ordered'?'按序':'不按序'},
          4:{param:'run',values:['cnode','k8s'],label:v=>v==='cnode'?'换成外部 Kubernetes':'换成 CNode 计算集群',aria:'切换运行位置，当前 ',name:v=>v==='cnode'?'CNode 计算集群':'外部 Kubernetes'}},
 layout(m){
  if(!m)return {W:960,H:500,mobile:false,f:{lbl:20,sm:17,cap:18,xs:17},pw:22,ph:16,dr:7,sp:330,lg:15,cap:{x:480,y:480},tgl:{x:840,y:40},tgls:{4:{x:788,y:410}}};
  return {W:480,H:660,mobile:true,f:{lbl:19,sm:17,cap:17,xs:17},pw:18,ph:14,dr:6,sp:240,lg:13,cap:{x:240,y:640},tgl:{x:240,y:600},tgls:{4:{x:240,y:600}}};
 },
 build(){
  const f=L.f,m=L.mobile;
  const nb=(r,t1,t2,g,cls)=>{const b=box(r,g,cls||'box');if(t2){tx(C(r).x,C(r).y-11,t1,f.sm,'lbl','middle',g);tx(C(r).x,C(r).y+13,t2,f.xs,'ink3-t','middle',g)}else tx(C(r).x,C(r).y,t1,f.sm,'lbl','middle',g);return b};
  /* ===== 1：四类资源 ===== */
  {const ln=grp('1'),g=grp('1');const s={};E.s1=s;
   s.fr=m?R(8,10,464,380):R(24,24,912,250);box(s.fr,g,'box frame',16);vtitle(s.fr.x+16,s.fr.y+22,'DataEngine 流水线',f.sm,'ttl',g);
   s.n=m?[R(140,56,200,60),R(140,166,200,60),R(140,276,200,60)]:[R(60,110,210,70),R(375,110,210,70),R(690,110,210,70)];
   s.rg=m?R(8,420,464,170):R(300,320,636,130);box(s.rg,g,'box soft',14);tx(s.rg.x+16,s.rg.y+22,'容器镜像仓库',f.sm,'ttl','start',g);
   tx(m?s.rg.x+16:s.rg.x+s.rg.w-16,m?s.rg.y+s.rg.h-20:s.rg.y+22,'函数资源引用镜像',f.xs,'ink3-t',m?'start':'end',g);
   s.img=m?[R(40,490,180,44),R(260,490,180,44)]:[R(380,374,210,44),R(695,374,210,44)];
   s.img.forEach((r,i)=>{box(r,g,'box',8);tx(C(r).x,C(r).y,i?'img-b:v1':'img-a:v3',f.sm,'lbl mono','middle',g)});
   s.ev=[[out_(s.n[0]),in_(s.n[1])],[out_(s.n[1]),in_(s.n[2])]];s.ev.forEach(p=>poly(p,'',ln));
   if(!m){[1,2].forEach(i=>poly([P(C(s.n[i]).x,s.n[i].y+s.n[i].h),P(C(s.img[i-1]).x,s.img[i-1].y)],'dash vio',ln))}
   else{poly([P(s.n[1].x,C(s.n[1]).y),P(110,C(s.n[1]).y),P(110,470),P(C(s.img[0]).x,470),P(C(s.img[0]).x,s.img[0].y)],'dash vio',ln);
     poly([P(s.n[2].x+s.n[2].w,C(s.n[2]).y),P(370,C(s.n[2]).y),P(370,470),P(C(s.img[1]).x,470),P(C(s.img[1]).x,s.img[1].y)],'dash vio',ln)}
   s.nB=[nb(s.n[0],'触发器','监听事件',g),nb(s.n[1],'函数部署 A','img-a:v3',g),nb(s.n[2],'函数部署 B','img-b:v1',g)];
  }
  /* ===== 2：触发器 ===== */
  {const ln=grp('2'),g=grp('2');const s={};E.s2=s;
   s.cl=m?R(150,10,180,48):R(24,150,150,60);s.vw=m?R(20,90,440,196):R(220,60,290,290);s.et=m?R(20,330,210,64):R(570,100,200,72);s.st=m?R(250,330,210,64):R(570,260,200,72);s.tp=m?R(150,470,180,60):R(820,176,120,80);
   s.slot=[0,1,2].map(k=>m?P(240,s.vw.y+58+k*44):P(C(s.vw).x,s.vw.y+92+k*60));
   if(!m){s.pin=k=>[P(s.cl.x+s.cl.w,C(s.cl).y),P(s.vw.x,C(s.cl).y),P(s.vw.x+30,C(s.cl).y),P(s.vw.x+30,s.slot[k].y),P(s.slot[k].x,s.slot[k].y)];
     poly([P(s.cl.x+s.cl.w,C(s.cl).y),P(s.vw.x+30,C(s.cl).y)],'',ln);poly([P(s.vw.x+30,s.slot[0].y),P(s.vw.x+30,s.slot[2].y)],'thin',ln);s.slot.forEach(q=>line(P(s.vw.x+30,q.y),P(q.x-60,q.y),'thin',ln));
     s.pe=k=>[P(s.slot[k].x+60,s.slot[k].y),P(s.vw.x+s.vw.w-24,s.slot[k].y),P(s.vw.x+s.vw.w-24,C(s.et).y),P(s.et.x,C(s.et).y)];
     poly([P(s.vw.x+s.vw.w-24,s.slot[0].y),P(s.vw.x+s.vw.w-24,s.slot[2].y)],'thin',ln);s.slot.forEach(q=>line(P(q.x+60,q.y),P(s.vw.x+s.vw.w-24,q.y),'thin',ln));line(P(s.vw.x+s.vw.w-24,C(s.et).y),P(s.et.x,C(s.et).y),'',ln);}
   else{s.pin=k=>[P(240,s.cl.y+s.cl.h),P(240,s.vw.y),P(240,s.vw.y+30),P(40,s.vw.y+30),P(40,s.slot[k].y),P(150,s.slot[k].y)];
     poly([P(240,s.cl.y+s.cl.h),P(240,s.vw.y+30),P(40,s.vw.y+30),P(40,s.slot[2].y)],'thin',ln);s.slot.forEach(q=>line(P(40,q.y),P(160,q.y),'thin',ln));
     s.pe=k=>[P(320,s.slot[k].y),P(440,s.slot[k].y),P(440,s.vw.y+s.vw.h-10),P(C(s.et).x,s.vw.y+s.vw.h-10),P(C(s.et).x,s.et.y)];
     poly([P(440,s.slot[0].y),P(440,s.vw.y+s.vw.h-10),P(C(s.et).x,s.vw.y+s.vw.h-10),P(C(s.et).x,s.et.y)],'thin',ln);s.slot.forEach(q=>line(P(320,q.y),P(440,q.y),'thin',ln));}
   s.e2=m?elbowV(P(C(s.et).x,s.et.y+s.et.h),P(C(s.tp).x-30,s.tp.y)):elbowH(P(s.et.x+s.et.w,C(s.et).y),P(s.tp.x,C(s.tp).y-14),796);
   s.s2=m?elbowV(P(C(s.st).x,s.st.y+s.st.h),P(C(s.tp).x+30,s.tp.y)):elbowH(P(s.st.x+s.st.w,C(s.st).y),P(s.tp.x,C(s.tp).y+14),806);
   poly(s.e2,'',ln);poly(s.s2,'',ln);
   nb(s.cl,'客户端','',g);box(s.vw,g,'box frame',14);vtitle(s.vw.x+16,s.vw.y+22,'源视图',f.sm,'ttl',g);tx(s.vw.x+s.vw.w-16,s.vw.y+(m?22:50),'/photos/',f.sm,'ink3-t mono','end',g);
   s.fl=[0,1,2].map(k=>{const r=el('rect',{x:s.slot[k].x-60,y:s.slot[k].y-16,width:120,height:32,rx:6,class:'cell'},g);const t=tx(s.slot[k].x,s.slot[k].y,['cat.jpg','notes.txt','dog.jpg'][k],f.sm,'lbl mono','middle',g);r.style.opacity=0;t.style.opacity=0;return {r,t}});
   s.etB=nb(s.et,'元素触发器','后缀 .jpg',g);s.stB=nb(s.st,'定时触发器','按计划',g);s.tpB=nb(s.tp,'topic','',g,'box och');
   s.nm=tx(C(s.et).x,m?s.et.y-14:s.et.y-16,'',f.xs,'ink3-t st','middle',g);
  }
  /* ===== 3：按序 / 不按序 ===== */
  {const ln=grp('3'),g=grp('3');const s={};E.s3=s;
   s.fr=m?R(12,40,456,210):R(24,70,470,280);box(s.fr,g,'box och',14);tx(s.fr.x+16,s.fr.y+22,'topic',f.sm,'ochre-t b7','start',g);
   s.ly=m?[s.fr.y+80,s.fr.y+160]:[s.fr.y+100,s.fr.y+210];s.le=m?440:470;
   s.ly.forEach((y,i)=>{tx(s.fr.x+16,m?y-28:y,i?'分区 1':'分区 0',f.xs,'ink2-t st','start',g);line(P(m?40:110,y),P(s.le,y),'thin',ln)});
   s.slotX=k=>(m?380:440)-k*(m?60:56);
   tx(m?240:24,m?20:476,'示意，不代表实测数字',f.xs,'ink3-t',m?'middle':'start',g);
   s.inst={ordered:(m?[R(26,300,200,56),R(254,300,200,56)]:[R(640,110,220,60),R(640,250,220,60)]),
     unordered:(m?[0,1,2,3].map(k=>R([66,182,298,414][k]-52,300,104,56)):[0,1,2,3].map(k=>R(640,70+k*76,220,56)))};
   s.ig={};['ordered','unordered'].forEach(md=>{const gg=el('g',{class:'vis'},g),lg=el('g',{class:'vis'},ln);s.ig[md]={g:gg,lg,b:s.inst[md].map((r,k)=>{const b=box(r,gg);tx(C(r).x+(m&&md==='unordered'?12:16),C(r).y,(m&&md==='unordered'?'#':T('函数实例 '))+(k+1),f.sm,'lbl','middle',gg);return b})};
    s.inst[md].forEach(r=>{s.ly.forEach(y=>{})})});
   s.pathTo=(md,lane,k)=>{const y=s.ly[lane],r=s.inst[md][k];
     if(!m)return [P(s.le,y),P(560,y),P(560,C(r).y),P(r.x,C(r).y)];
     return [P(s.le,y),P(456,y),P(456,276),P(C(r).x,276),P(C(r).x,r.y)]};
   ['ordered','unordered'].forEach(md=>{const lg=s.ig[md].lg;s.inst[md].forEach((r,k)=>{[0,1].forEach(l=>{if(md==='ordered'&&l!==k)return;poly(s.pathTo(md,l,k),'thin',lg)})})});
   s.cnt=tx(m?240:750,m?390:400,'',f.sm,'lbl st','middle',g);
   s.q=[0,1].map(l=>[0,1,2,3,4].map(k=>{const x=s.slotX(k),y=s.ly[l];const gg=el('g',{},g);el('rect',{x:x-18,y:y-16,width:36,height:32,rx:5,class:'cell '+(l?'och':'on')},gg);tx(x,y,String(k+1),f.sm,'lbl mono','middle',gg);return gg}));
  }
  /* ===== 4：函数打成镜像 ===== */
  {const ln=grp('4'),g=grp('4');const s={};E.s4=s;
   s.cd=m?R(12,10,456,136):R(24,50,290,180);s.bd=m?R(150,180,180,60):R(370,104,170,72);s.rg=m?R(12,274,456,118):R(600,50,336,180);s.fr=m?R(12,430,456,170):R(370,290,566,150);
   s.fn=m?R(186,480,266,64):R(640,330,270,70);s.pl=m?R(28,480,140,64):R(400,330,170,70);
   s.chip=m?[R(40,330,180,40),R(260,330,180,40)]:[R(620,100,140,40),R(780,100,140,40)];
   s.p1=m?[P(240,s.cd.y+s.cd.h),P(240,s.bd.y)]:[P(s.cd.x+s.cd.w,C(s.bd).y),P(s.bd.x,C(s.bd).y)];
   s.p2=m?[P(240,s.bd.y+s.bd.h),P(240,s.rg.y),P(240,s.rg.y+20),P(C(s.chip[1]).x,s.rg.y+20),P(C(s.chip[1]).x,s.chip[1].y)]:[P(s.bd.x+s.bd.w,C(s.bd).y),P(s.rg.x,C(s.bd).y),P(s.rg.x+20,C(s.bd).y),P(s.rg.x+20,C(s.chip[1]).y+40),P(C(s.chip[1]).x,C(s.chip[1]).y+40),P(C(s.chip[1]).x,s.chip[1].y+s.chip[1].h)];
   poly(s.p1,'',ln);poly(s.p2,'',ln);
   s.ptr=m?[P(C(s.fn).x,s.fn.y),P(C(s.fn).x,410),P(C(s.chip[1]).x,410),P(C(s.chip[1]).x,s.chip[1].y+s.chip[1].h)]:[P(C(s.fn).x+60,s.fn.y),P(C(s.fn).x+60,260),P(C(s.chip[1]).x,260),P(C(s.chip[1]).x,s.chip[1].y+s.chip[1].h)];
   s.ptrL=poly(s.ptr,'dash vio',ln);
   poly([out_(s.pl),in_(s.fn)].map(q=>q),'',ln);if(m){/* 手机：流水线在左，函数资源在右 */}
   box(s.cd,g,'box soft',10);tx(s.cd.x+16,s.cd.y+22,'main.py',f.sm,'ttl mono','start',g);
   ['def init(ctx):','    …','def handler(ctx, event):','    … return 结果'].forEach((l,i)=>tx(s.cd.x+16,s.cd.y+(m?50:56)+i*(m?22:30),l,f.xs,'mono lbl','start',g));
   s.bdB=nb(s.bd,'vastde 构建','本地 Docker',g,'box fillv');
   box(s.rg,g,'box soft',14);tx(s.rg.x+16,s.rg.y+22,'镜像仓库',f.sm,'ttl','start',g);
   s.chB=s.chip.map((r,i)=>{const b=box(r,g,'box',8);tx(C(r).x,C(r).y,i?'my-fn:v2':'my-fn:v1',f.sm,'lbl mono','middle',g);return b});s.chB[1].parentNode;
   s.v2=[s.chB[1],g.lastChild];
   box(s.fr,g,'box frame',16);vtitle(s.fr.x+16,s.fr.y+22,'DataEngine',f.sm,'ttl',g);
   nb(s.pl,'流水线','',g);s.fnB=box(s.fn,g);s.fnT=tx(C(s.fn).x,C(s.fn).y,'',f.sm,'lbl','middle',g);
  }
  /* ===== 5：在哪里跑 ===== */
  {const ln=grp('5'),g=grp('5');const s={};E.s5=s;
   s.fr=m?R(8,30,464,330):R(24,40,560,400);s.k8=m?R(8,400,464,166):R(640,90,296,250);
   s.cn=[0,1,2,3].map(k=>m?R(22+k*112,76,100,180):R(52+k*130,96,112,210));s.tp=m?R(90,288,300,52):R(150,350,300,60);
   s.kn=[0,1,2].map(k=>m?R(22+k*148,456,140,90):R(660,140+k*62,256,50));
   s.cn.forEach((r,k)=>{line(P(C(r).x,r.y+r.h),P(C(r).x,s.tp.y),'thin',ln)});
   s.kp=m?[P(C(s.tp).x,s.tp.y+s.tp.h),P(C(s.tp).x,s.k8.y)]:[P(s.tp.x+s.tp.w,C(s.tp).y),P(612,C(s.tp).y),P(612,C(s.k8).y),P(s.k8.x,C(s.k8).y)];s.kl=poly(s.kp,'',ln);
   box(s.fr,g,'box frame',16);vtitle(s.fr.x+16,s.fr.y+22,'集群',f.sm,'ttl',g);
   s.bars=s.cn.map((r,k)=>{box(r,g,'box',10);tx(C(r).x,r.y+20,'CNode',f.sm,'lbl b7','middle',g);
    const tr=R(r.x+18,r.y+38,r.w-36,r.h-(m?70:76));el('rect',{x:tr.x,y:tr.y,width:tr.w,height:tr.h,rx:6,class:'cell'},g);
    const st=el('rect',{x:tr.x,y:tr.y,width:tr.w,height:tr.h,rx:6,class:'box fills'},g);const cp=el('rect',{x:tr.x,y:tr.y,width:tr.w,height:0,rx:6,class:'box fillv'},g);
    const stT=tx(C(tr).x,tr.y+tr.h-16,'存储',f.xs,'slate-t st','middle',g);const cpT=tx(C(tr).x,tr.y+18,'计算',f.xs,'violet-t st','middle',g);
    const note=tx(C(r).x,r.y+r.h-14,'',f.xs,'ink3-t','middle',g);return {tr,st,cp,stT,cpT,note}});
   s.tpB=nb(s.tp,'Event Broker topic','',g,'box och');
   s.kg=el('g',{class:'vis'},g);box(s.k8,s.kg,'box',14);tx(s.k8.x+16,s.k8.y+22,'外部 Kubernetes',f.sm,'ttl','start',s.kg);
   s.knB=s.kn.map((r,k)=>nb(r,['节点 1','节点 2','节点 3'][k],'',s.kg));
  }
  /* ===== 6：路由与攒批 ===== */
  {const ln=grp('6'),g=grp('6');const s={};E.s6=s;
   s.tr=m?R(150,10,180,50):R(24,190,150,60);s.a=m?R(150,96,180,56):R(230,190,170,60);s.b=m?R(24,250,190,56):R(600,80,180,60);s.c=m?R(266,340,190,56):R(600,320,180,60);
   s.tray=m?R(286,228,150,58):R(440,312,110,76);
   s.pTA=[out_(s.tr),in_(s.a)];
   s.pAB=m?[P(240,s.a.y+s.a.h),P(240,190),P(C(s.b).x,190),P(C(s.b).x,s.b.y)]:[P(s.a.x+s.a.w,C(s.a).y),P(470,C(s.a).y),P(470,C(s.b).y),P(s.b.x,C(s.b).y)];
   s.pAT=m?[P(240,s.a.y+s.a.h),P(240,190),P(C(s.tray).x,190),P(C(s.tray).x,s.tray.y)]:[P(s.a.x+s.a.w,C(s.a).y),P(420,C(s.a).y),P(420,C(s.tray).y),P(s.tray.x,C(s.tray).y)];
   s.pTC=m?[P(C(s.tray).x,s.tray.y+s.tray.h),P(C(s.c).x,s.c.y)]:[P(s.tray.x+s.tray.w,C(s.tray).y),P(s.c.x,C(s.c).y)];
   [s.pTA,s.pAB,s.pAT,s.pTC].forEach(p=>poly(p,'',ln));
   tx(m?24:480,m?212:C(s.b).y-18,'标签：图片',f.xs,'slate-t st',m?'start':'middle',g);tx(m?456:330,m?212:C(s.tray).y-14,'标签：文档',f.xs,'ochre-t st',m?'end':'middle',g);
   nb(s.tr,'触发器','',g);s.aB=nb(s.a,'识别类型','',g);s.bB=nb(s.b,'图片处理','',g);s.cB=nb(s.c,'文档处理','',g);
   s.trayB=box(s.tray,g,'box och',10);s.trayB.style.strokeDasharray='6 5';tx(C(s.tray).x,s.tray.y+(m?14:16),'攒批',f.xs,'ochre-t st','middle',g);
   s.cT=tx(m?C(s.c).x:C(s.c).x,m?s.c.y+s.c.h+20:s.c.y+s.c.h+22,'',f.xs,'ochre-t st','middle',g);
  }
  /* ===== 7：可观测 ===== */
  {const ln=grp('7'),g=grp('7');const s={};E.s7=s;
   s.n=m?[R(12,16,130,52),R(175,16,130,52),R(338,16,130,52)]:[R(60,40,200,60),R(380,40,200,60),R(700,40,200,60)];
   s.tt=m?R(12,130,456,190):R(60,200,500,200);s.dl=m?R(12,390,456,150):R(620,200,280,200);
   [[0,1],[1,2]].forEach(([a,b])=>poly([out_(s.n[a]),in_(s.n[b])],'',ln));
   const bus=m?100:150;s.bus=bus;
   s.toT=(i,k)=>{const y=s.tt.y+40+k*30+15;return m?[P(C(s.n[i]).x,s.n[i].y+s.n[i].h),P(C(s.n[i]).x,bus),P(20,bus),P(20,y)]
     :[P(C(s.n[i]).x,s.n[i].y+s.n[i].h),P(C(s.n[i]).x,bus),P(80,bus),P(80,s.tt.y)]};
   [1,2].forEach(i=>poly(m?[P(C(s.n[i]).x,s.n[i].y+s.n[i].h),P(C(s.n[i]).x,bus)]:[P(C(s.n[i]).x,s.n[i].y+s.n[i].h),P(C(s.n[i]).x,bus)],'thin',ln));
   poly(m?[P(C(s.n[2]).x,bus),P(20,bus),P(20,s.tt.y+40)]:[P(C(s.n[2]).x,bus),P(80,bus),P(80,s.tt.y)],'thin',ln);
   s.toD=m?[P(s.n[2].x+s.n[2].w,C(s.n[2]).y),P(474,C(s.n[2]).y),P(474,C(s.dl).y),P(s.dl.x+s.dl.w,C(s.dl).y)]:[P(C(s.n[2]).x+60,s.n[2].y+s.n[2].h),P(C(s.n[2]).x+60,s.dl.y)];
   poly(s.toD,'thin hot',ln);
   s.nB=[nb(s.n[0],'触发器','',g),nb(s.n[1],'函数 A','',g),nb(s.n[2],'函数 B','',g)];
   const tab=(r,ttl,cols,rows,cls)=>{box(r,g,'box',10);tx(r.x+14,r.y+20,ttl,f.sm,'ttl','start',g);let x=r.x+8;const w=(r.w-16)/cols.length;
     cols.forEach((c,i)=>{el('rect',{x:x+i*w,y:r.y+36,width:w,height:28,class:'cell hd'},g);tx(x+i*w+w/2,r.y+50,c,f.xs,'ink2-t st','middle',g)});
     return rows.map((rw,k)=>{const y=r.y+66+k*30+13;const rr=el('rect',{x:r.x+8,y:y-13,width:r.w-16,height:26,rx:3,class:'cell'+(cls?' '+cls:'')},g);const ts=rw.map((v,i)=>tx(x+i*w+w/2,y,v,f.xs,'lbl','middle',g));rr.style.opacity=0;ts.forEach(t=>t.style.opacity=0);return {rr,ts}})};
   s.trw=tab(s.tt,'运行追踪',['运行','函数','结果'],[['#1','A','成功'],['#1','B','成功'],['#2','A','成功'],['#2','B','失败']]);
   s.dlw=tab(s.dl,'死信 topic',['运行','事件'],[['#2','dog.jpg']],'');
  }
 },
 reset(){svg.querySelectorAll('.box').forEach(b=>b.classList.remove('on','ok','hot','off'));cap('','')},
 modes:[]
};
/* 1 */
SCENE.modes[0]={enter(){cap('触发器 → 函数 → 函数：一条流水线','ink2-t');S.v.e=[0,1].map(()=>dot('vio'))},
 frame(t){const s=E.s1,u=t%5;run(S.v.e[0],s.ev[0],u,0.3,1.0,0.1);run(S.v.e[1],s.ev[1],u,1.9,1.0,0.3);
  s.nB[0].classList.toggle('on',u<0.6);s.nB[1].classList.toggle('on',u>1.3&&u<2.0);s.nB[2].classList.toggle('on',u>2.9&&u<4.4)}};
/* 2 */
SCENE.modes[1]={enter(){cap('按前缀、后缀过滤，事件写进 topic','ink2-t');S.v.f=[0,1,2].map(()=>pk());S.v.e=[0,1].map(()=>dot('vio'));S.v.s=[0,1].map(()=>dot('och'))},
 frame(t){const s=E.s2,u=t%9;const ev=[[0,0.3],[2,4.6]];
  [0,1,2].forEach(k=>{const t0=[0.3,2.4,4.6][k],p=s.pin(k),d=dur(p)*0.7;run(S.v.f[k],p,u,t0,d,0.1);const on=u>t0+d&&u<8.7;s.fl[k].r.style.opacity=on?1:0;s.fl[k].t.style.opacity=on?1:0});
  ev.forEach(([k,t0],j)=>{const p=s.pin(k),d=dur(p)*0.7,t1=t0+d+0.2,p2=cat(s.pe(k),s.e2),d2=dur(p2)*0.8;run(S.v.e[j],p2,u,t1,d2,0.2)});
  const tn=2.4+dur(s.pin(1))*0.7;s.etB.classList.toggle('on',ev.some(([k,t0])=>{const tt=t0+dur(s.pin(k))*0.7+0.2+dur(s.pe(k))*0.8;return u>tt&&u<tt+0.6}));
  s.nm.textContent=u>tn&&u<tn+1.6?T('不匹配'):'';
  [1.6,6.4].forEach((t0,j)=>run(S.v.s[j],s.s2,u,t0,0.9,0.2));s.stB.classList.toggle('och',[1.6,6.4].some(a=>u>a-0.3&&u<a+0.2))}};
/* 3：按序与不按序，事件编号显示处理顺序 */
const DUR=[1.2,0.9,1.5,1.0,1.3,0.8,1.4,1.1,0.9,1.2];
function sched(md){const ev=[];for(let k=0;k<5;k++)for(let l=0;l<2;l++)ev.push({l,k});
  if(md==='ordered'){const tl=[0.4,0.4];ev.forEach((e,i)=>{e.inst=e.l;e.t0=tl[e.l];e.d=1.25;tl[e.l]+=e.d+0.45})}
  else{const free=[0.4,0.4,0.4,0.4];ev.forEach((e,i)=>{let j=0;for(let q=1;q<4;q++)if(free[q]<free[j])j=q;e.inst=j;e.t0=free[j];e.d=DUR[i];free[j]+=e.d+0.45})}
  return ev}
SCENE.modes[2]={enter(v){const s=E.s3;S.v.md=v;S.v.ev=sched(v);S.v.p=S.v.ev.map(e=>pk(e.l?'och':'',L.mobile?22:26,L.mobile?18:20));
  ['ordered','unordered'].forEach(md=>{s.ig[md].g.style.display=md===v?'':'none';s.ig[md].lg.style.display=md===v?'':'none'});
  cap(v==='ordered'?'按序：每个分区一次只处理一个':'不按序：可以并发，不保证先后',v==='ordered'?'slate-t':'ochre-t')},
 frame(t){const s=E.s3,u=t%11,md=S.v.md;let n=0;const busy=[0,0,0,0];
  S.v.ev.forEach((e,i)=>{const travel=0.45,ts=e.t0-travel;const q=s.q[e.l][e.k];q.style.opacity=u<ts?1:0;
   const ri=s.inst[md][e.inst],park=L.mobile?P(ri.x+20,C(ri).y):P(ri.x+28,C(ri).y);const pts=cat([P(s.slotX(e.k),s.ly[e.l]),P(s.le,s.ly[e.l])],s.pathTo(md,e.l,e.inst).slice(1),L.mobile?[P(park.x,ri.y),park]:[park]);
   const o=S.v.p[i];
   if(u<ts)put(o,-99,-99,0);else if(u<e.t0)put(o,at(pts,sm((u-ts)/travel)),1);else if(u<e.t0+e.d){put(o,park,1);busy[e.inst]=1}else{put(o,-99,-99,0);n++}});
  s.ig[md].b.forEach((b,k)=>b.classList.toggle('on',!!busy[k]));
  s.cnt.textContent=T('已处理 ')+n+' / 10'}};
/* 4 */
SCENE.modes[3]={enter(){cap('函数资源引用仓库中的镜像','violet-t');S.v.c=pk();S.v.i=pk('vio')},
 frame(t){const s=E.s4,u=t%7.5;run(S.v.c,s.p1,u,0.3,0.8,0.1);s.bdB.classList.toggle('vio',u>1.0&&u<1.9);
  run(S.v.i,s.p2,u,1.9,1.4,0.2);const v2=u>3.4;s.v2.forEach(e=>e.style.opacity=v2?1:0.15);s.chB[1].classList.toggle('on',v2&&u<7.2);
  s.ptrL.style.opacity=u>3.8?1:0.15;s.fnT.textContent=T(u>3.8?'函数资源 · 版本 2':'函数资源');s.fnB.classList.toggle('on',u>3.8&&u<7.2)}};
/* 5：计算集群或外部 K8s */
SCENE.modes[4]={enter(v){const s=E.s5;S.v.v=v;const cn=v==='cnode';
  cap(cn?'VAST 计算集群使用选定的 CNode 资源':'外部 Kubernetes 运行函数',cn?'violet-t':'slate-t');
  s.kg.style.display=cn?'none':'';s.kl.style.display=cn?'none':'';
  s.bars.forEach((b,k)=>{const share=cn&&k<3?0.5:0;const h=b.tr.h*share;b.cp.setAttribute('height',h);b.st.setAttribute('y',b.tr.y+h);b.st.setAttribute('height',b.tr.h-h);
   b.cpT.style.opacity=share?1:0;b.note.textContent=cn&&k===3?T('保留给存储'):''});
  S.v.f=[0,1,2].map(()=>pk('ok',L.mobile?16:18,L.mobile?16:18));S.v.e=[0,1,2].map(()=>dot('och'))},
 frame(t){const s=E.s5,u=t%6,cn=S.v.v==='cnode';
  [0,1,2].forEach(k=>{let dest,p;
   if(cn){const b=s.bars[k];dest=P(C(b.tr).x,b.tr.y+b.tr.h*0.25+6);p=[P(C(s.tp).x,s.tp.y),P(C(s.tp).x,s.tp.y-14),P(C(s.cn[k]).x,s.tp.y-14),P(C(s.cn[k]).x,s.cn[k].y+s.cn[k].h),dest]}
   else{const r=s.kn[k];dest=C(r);p=cat(s.kp,L.mobile?[P(C(s.k8).x,s.k8.y+20),P(C(r).x,s.k8.y+20),P(C(r).x,r.y)]:[P(s.k8.x+10,C(s.k8).y),P(s.k8.x+10,C(r).y),P(r.x,C(r).y)])}
   run(S.v.e[k],p,u,0.3+k*0.5,1.1,0.1);if(u>1.4+k*0.5)put(S.v.f[k],cn?dest:P(dest.x+(L.mobile?40:90),dest.y),1);else put(S.v.f[k],-99,-99,0)});
  s.knB.forEach((b,k)=>b.classList.toggle('on',!cn&&u>1.4+k*0.5))}};
/* 6 */
const LAB=[0,1,1,0,1,1,0];
SCENE.modes[5]={enter(){cap('按标签路由，按条数或超时组批','ink2-t');S.v.e=LAB.map(l=>pk(l?'och':''))},
 frame(t){const s=E.s6,u=t%10;let inTray=0,callC=-1;const docs=[];LAB.forEach((l,i)=>{if(l)docs.push(i)});
  LAB.forEach((l,i)=>{const t0=0.3+i*0.75,d1=dur(s.pTA)*0.8,o=S.v.e[i];
   if(u<t0+d1){run(o,s.pTA,u,t0,d1,0);return}
   if(!l){run(o,s.pAB,u,t0+d1+0.15,dur(s.pAB)*0.8,0.3);return}
   const j=docs.indexOf(i),grpN=Math.floor(j/3),last=docs[Math.min(docs.length-1,grpN*3+2)],tl=0.3+last*0.75+d1+0.15+dur(s.pAT)*0.8,rel=grpN*3+2<docs.length?tl+0.3:tl+2.0;
   const pA=s.pAT,da=dur(pA)*0.8,ta=t0+d1+0.15;const slot=P(s.tray.x+(L.mobile?40:28)+(j%3)*(L.mobile?34:27),C(s.tray).y+(L.mobile?8:10));
   if(u<ta+da)run(o,cat(pA,[slot]),u,ta,da,0);else if(u<rel){put(o,slot,1);inTray++}
   else{run(o,[slot,...s.pTC],u,rel,0.7,0.3);if(u>rel+0.6&&u<rel+1.6)callC=grpN}});
  s.aB.classList.toggle('on',LAB.some((l,i)=>{const a=0.3+i*0.75+dur(s.pTA)*0.8;return u>a&&u<a+0.15+0.1}));
  s.cB.classList.toggle('och',callC>=0);s.cT.textContent=callC===0?T('一次处理 3 个'):'';s.trayB.classList.toggle('on',inTray>=3)}};
/* 7 */
SCENE.modes[6]={enter(){S.v.e=[0,1,2,3].map(()=>dot('vio'));S.v.r=[0,1,2,3].map(()=>pk('',L.mobile?20:24,L.mobile?12:14));S.v.d=pk('rose')},
 frame(t){const s=E.s7,u=t%11;const ph=u<7.2?0:1;
  // 两次运行：#1 A、B 成功；#2 A 成功、B 失败
  const runs=[[0.3,'A',0],[1.4,'B',1],[3.4,'A',2],[4.5,'B',3]];
  runs.forEach(([t0,f,k],i)=>{const pth=f==='A'?[out_(s.n[0]),in_(s.n[1])]:[out_(s.n[1]),in_(s.n[2])];run(S.v.e[i],pth,u,t0-0.6,0.55,0.05)});
  runs.forEach(([t0,f,k],i)=>{const ni=f==='A'?1:2;s.nB[ni].classList.toggle(k===3?'hot':'on',u>t0&&u<t0+0.9);
   const p=s.toT(ni,k);const d=dur(p)*0.7;run(S.v.r[i],p,u,t0+0.5,d,0.2);const on=u>t0+0.5+d&&u<10.6;s.trw[k].rr.style.opacity=on?1:0;s.trw[k].ts.forEach(x=>x.style.opacity=on?1:0);
   s.trw[k].rr.setAttribute('class','cell'+(k===3?' och':'')+(ph&&on?'':''))});
  const dd=dur(s.toD)*0.7;run(S.v.d,s.toD,u,5.3,dd,0.2);const don=u>5.3+dd&&u<10.6;s.dlw[0].rr.style.opacity=don?1:0;s.dlw[0].ts.forEach(x=>x.style.opacity=don?1:0);s.dlw[0].rr.setAttribute('class','cell'+(don?' och':''));
  cap(u<5.2?'追踪关联函数执行与结果':'失败事件进入配置的死信 topic',u<5.2?'ink2-t':'rose-t')}};
/* ---------- 引擎 ---------- */
const TG=SCENE.toggles||{};
const tstate={};Object.keys(TG).forEach(k=>{const g=TG[k],v=qs.get(g.param);tstate[k]=g.values.indexOf(v)>-1?v:g.values[0]});
function tog(){return tstate[step]}
function setToggleUI(){
  const g=TG[step];tgl.hidden=!g;if(!g)return;
  const v=tstate[step];tgl.textContent='⇄ '+T(g.label(v));tgl.setAttribute('aria-label',T(g.aria)+T(g.name(v)));
  const p=(L.tgls&&L.tgls[step])||L.tgl;tgl.style.left=(p.x/L.W*100)+'%';tgl.style.top=(p.y/L.H*100)+'%';
}
tgl.addEventListener('click',()=>{const g=TG[step];if(!g)return;const i=g.values.indexOf(tstate[step]);tstate[step]=g.values[(i+1)%g.values.length];enter(step)});
function applyVis(){
  svg.setAttribute('data-step',step+1);
  svg.querySelectorAll('[data-show]').forEach(g=>g.classList.toggle('hid',!g.dataset.show.split(' ').includes(String(step+1))));
  svg.querySelectorAll('[data-dim]').forEach(g=>g.classList.toggle('dim',g.dataset.dim.split(' ').includes(String(step+1))));
}
function newSim(){if(S)S.items.forEach(o=>o.el.remove());S={items:[],v:{}}}
function loop(now){last=now;const t=Math.max(0,(now-T0)/1000);SCENE.modes[step].frame(t);raf=requestAnimationFrame(loop)}
function go(){cancelAnimationFrame(raf);if(paused||dead||reduce)return;last=performance.now();raf=requestAnimationFrame(loop)}
function enter(i){
  step=i;cancelAnimationFrame(raf);newSim();
  SCENE.reset&&SCENE.reset();
  applyVis();setToggleUI();
  const m=SCENE.modes[i];m.enter&&m.enter(tog());
  if(reduce){m.frame((SCENE.still||[])[i]||1.5);return}
  m.frame(0);T0=pausedAt=performance.now();go();
}
function build(){
  L=SCENE.layout(mq.matches);svg.innerHTML='';E={};svg.setAttribute('viewBox',`0 0 ${L.W} ${L.H}`);
  SCENE.build();
  E.cap=tx(L.cap.x,L.cap.y,'',L.f.cap,'st',L.cap.a||'middle');
  E.pk=el('g',{class:'pkl'});
  svg.setAttribute('aria-label',T(ARIA));if(opts.onLayout)opts.onLayout(L.W/L.H,L.mobile);
}
function rebuild(){build();enter(step)}
mq.addEventListener('change',rebuild);
const onLang=()=>rebuild();document.addEventListener('ss-lang',onLang);
build();enter(0);
const ctrl={
  show(i){enter(Math.max(0,Math.min(SCENE.modes.length-1,i)))},
  pause(){if(paused)return;paused=true;cancelAnimationFrame(raf);pausedAt=performance.now()},
  resume(){if(!paused)return;paused=false;T0+=performance.now()-pausedAt;go()},
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('ssa-'+ID)},
  ratio(){return L.W/L.H},
  step(){return step},
  sim(){return {step,n:S.items.length,t:(performance.now()-T0)/1000,tog:tstate[step]}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim[ID]={steps:NSTEP,mount:mount};
})();
