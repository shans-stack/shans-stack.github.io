/* DASE：计算节点不存数据，盘大家共用：6 步动画（SVG，按时间写死的时间线，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-dase'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-dase.css，全部限定在 .ssa-v-dase 容器之内。 */
(function(){
var EN={"客户端": "Client", "节点 1": "Node 1", "节点 2": "Node 2", "节点 3": "Node 3", "缓存": "Cache", "下线": "Offline", "NVMe-oF 网络": "NVMe-oF network", "跑存储逻辑": "Runs storage logic", "不留数据": "Keeps no data", "DNode 只把盘接到网络上，不跑存储逻辑": "DNodes only connect drives to the network and run no storage logic", "省掉的是节点之间的协调，数据照样经网络到盘": "Only node-to-node coordination goes away; data still crosses the network to the drives", "省掉的是协调，数据照样走网络": "No coordination; data still crosses the network", "节点之间：锁、缓存同步": "Between nodes: locks, cache sync", "每台 CNode 都挂上每一块盘": "Every CNode mounts every drive", "写到盘上，才确认": "On the drive first, then the ACK", "CNode 之间：不用协调": "Between CNodes: no coordination", "坏一台节点：它的盘一起下线": "A node fails: its drives go offline too", "坏一台 CNode：盘一块不少": "A CNode fails: no drive is lost", "换成传统做法": "Switch to traditional", "换成 DASE": "Switch to DASE", "切换对比，当前 ": "Switch comparison, now showing ", "传统做法": "traditional", "DASE": "DASE", "传统各管各的存储与 VAST DASE 架构对比：CNode 不存数据，经 NVMe-oF 共用每一块盘": "Traditional shared-nothing storage versus VAST DASE: CNodes keep no data and share every drive over NVMe-oF"};
var ENM={"跑存储逻辑": "Storage logic", "下线": "Off", "DNode 只把盘接到网络上，不跑存储逻辑": "DNodes only attach drives to the network"};
var ARIA="传统各管各的存储与 VAST DASE 架构对比：CNode 不存数据，经 NVMe-oF 共用每一块盘";
function lang(){return window.SS_LANG==='en'?'en':'zh'}
var NS='http://www.w3.org/2000/svg';
function mount(host,opts){
opts=opts||{};
host.classList.add('ssa-v-dase');host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','ssa-scene');svg.setAttribute('role','img');host.appendChild(svg);
const tgl=document.createElement('button');tgl.className='tgl';tgl.type='button';tgl.hidden=true;host.appendChild(tgl);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mq=matchMedia('(max-width: 640px)');
const qs=new URLSearchParams(location.search);
/* 文字：中文原样，英文取 EN；手机版放不下的用 ENM */
function T(s){if(lang()!=='en')return s;if(L&&L.mobile&&ENM[s]!==undefined)return ENM[s];return EN[s]!==undefined?EN[s]:s}
/* ---------- 通用小工具 ---------- */
function el(tag,a,p){const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);(p||svg).appendChild(e);return e}
function tx(x,y,s,size,cls,anchor,p){const t=el('text',{x,y,'font-size':size,class:cls||''},p);if(anchor)t.setAttribute('text-anchor',anchor);t.textContent=T(s);return t}
function grp(show,p,extra){const g=el('g',Object.assign({class:'vis'},extra||{}),p);if(show)g.dataset.show=show;return g}
function box(r,p,cls,rx){return el('rect',{x:r.x,y:r.y,width:r.w,height:r.h,rx:rx==null?12:rx,class:cls||'box'},p)}
function line(a,b,cls,p){return el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'ln '+(cls||'')},p)}
function poly(pts,cls,p){return el('path',{d:'M'+pts.map(q=>q.x+' '+q.y).join(' L'),class:'ln '+(cls||'')},p)}
const C=r=>({x:r.x+r.w/2,y:r.y+r.h/2});
const P=(x,y)=>({x,y});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sm=u=>u<=0?0:u>=1?1:u*u*(3-2*u);
const fade=(t,t0,t1)=>clamp((t-t0)/(t1-t0),0,1);
function plen(pts){let s=0;for(let i=1;i<pts.length;i++)s+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);return s}
function at(pts,u){u=clamp(u,0,1);let d=u*plen(pts);for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],l=Math.hypot(b.x-a.x,b.y-a.y);if(d<=l||i===pts.length-1){const k=l?Math.min(1,d/l):0;return {x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k}}d-=l}return pts[pts.length-1]}
function rev(pts){return pts.slice().reverse()}
function cat(...ps){const o=[];ps.forEach(p=>p.forEach(q=>{const l=o[o.length-1];if(!l||l.x!==q.x||l.y!==q.y)o.push(q)}));return o}
/* 数据块与小圆点 */
let L=null,E,S,step=0,T0=0,raf=0,last=0,paused=!!opts.paused,dead=false,pausedAt=0;
function pk(cls){const r=el('rect',{x:-L.pw/2,y:-L.ph/2,width:L.pw,height:L.ph,rx:4,class:'pkt '+(cls||'')},E.pk);const o={el:r,kind:'pkt'};S.items.push(o);put(o,-99,-99,0);return o}
function dot(cls){const r=el('circle',{r:L.dr,cx:0,cy:0,class:'dot '+(cls||'')},E.pk);const o={el:r,kind:'dot'};S.items.push(o);put(o,-99,-99,0);return o}
function put(o,x,y,a){if(typeof x==='object'){a=y;y=x.y;x=x.x}o.x=x;o.y=y;o.a=a==null?1:a;o.el.setAttribute('transform',`translate(${x.toFixed(1)} ${y.toFixed(1)})`);o.el.style.opacity=o.a}
function cls(o,c,on){o.el.classList.toggle(c,!!on)}
/* ---------- 场景（画面内容与原动画稿一致） ---------- */
/* DASE：传统各管各的 vs 解耦 + 全共享 */
function run(o,pts,t,t0,dur,fo){fo=fo==null?0.3:fo;if(t<t0||t>t0+dur+fo){put(o,-99,-99,0);return -1}const u=(t-t0)/dur;if(u<=1){put(o,at(pts,u),1);return u}put(o,pts[pts.length-1],1-(t-t0-dur)/fo);return 1.5}
const SCENE={
 still:[1.4,1.6,6.6,2.2,2.0,1.3],
 layout(mobile){
  if(!mobile){
   return {W:960,H:520,mobile:false,f:{lbl:22,sm:17,cap:18},pw:24,ph:18,dr:7,sp:330,
    client:{x:400,y:14,w:160,h:46},busY:88,
    cn:{xs:[200,480,760],w:200,h:80,y:112},
    fabY:252,fabX:[60,900],fabLbl:{x:340,y:236},
    db:{xs:[290,670],w:336,h:172,y:292,dnW:108,dnH:40,dnDy:34,dnDx:72,barDy:104,drW:38,drH:44,drGap:12,drDy:118,ttl:{dx:14,dy:18}},
    trad:{dW:40,dH:50,dGap:14,barY:396,dY:410,chip:{w:60,h:34}},
    cap:{x:944,y:37},bot:{y:490},tgl:{x:480,y:494},ewLbl:true};
  }
  return {W:480,H:460,mobile:true,f:{lbl:20,sm:17,cap:17},pw:20,ph:15,dr:6,sp:210,
   client:{x:12,y:10,w:124,h:42},busY:76,
   cn:{xs:[82,240,398],w:142,h:66,y:96},
   fabY:214,fabX:[8,472],fabLbl:{x:161,y:200},
   db:{xs:[122,358],w:228,h:166,y:244,dnW:88,dnH:36,dnDy:30,dnDx:54,barDy:92,drW:28,drH:40,drGap:8,drDy:104,ttl:{dx:10,dy:15}},
   trad:{dW:34,dH:44,dGap:9,barY:330,dY:346,chip:{w:52,h:30}},
   cap:{x:470,y:31},bot:{y:436},tgl:{x:240,y:430},ewLbl:false};
 },
 build(){
  const f=L.f,cl=L.client,cc=C(cl);
  /* 客户端与前端网络（各步共用） */
  const gF=grp(null);
  E.client=box(cl,gF);tx(cc.x,cc.y,'客户端',f.lbl,'lbl','middle',gF);
  const xs=L.cn.xs,nTop=L.cn.y,nBot=L.cn.y+L.cn.h,ncy=L.cn.y+L.cn.h/2;
  line(P(cc.x,cl.y+cl.h),P(cc.x,L.busY),'',gF);
  line(P(Math.min(cc.x,xs[0]),L.busY),P(Math.max(cc.x,xs[2]),L.busY),'',gF);
  E.drop=xs.map(x=>line(P(x,L.busY),P(x,nTop),'',gF));
  E.cap=tx(L.cap.x,L.cap.y,'',f.cap,'st','end');
  /* 传统：节点 + 自己的盘 */
  const gT=grp('1 6');E.gT=gT;
  const T=L.trad;E.tn=[];E.tDisk=[];E.tLn=[];
  xs.forEach((x,i)=>{
   const r={x:x-L.cn.w/2,y:nTop,w:L.cn.w,h:L.cn.h};
   E.tn.push(box(r,gT));
   tx(r.x+(L.mobile?10:16),ncy,'节点 '+(i+1),f.lbl,'lbl','start',gT);
   const ch={x:r.x+r.w-(L.mobile?10:16)-T.chip.w,y:ncy-T.chip.h/2,w:T.chip.w,h:T.chip.h};
   box(ch,gT,'box soft',6);tx(ch.x+ch.w/2,ncy,'缓存',f.sm,'violet-t st','middle',gT);
   const dx=[-1,0,1].map(k=>x+k*(T.dW+T.dGap));
   const ln=[line(P(x,nBot),P(x,T.barY),'',gT),line(P(dx[0],T.barY),P(dx[2],T.barY),'',gT)];
   const ds=dx.map(d=>{ln.push(line(P(d,T.barY),P(d,T.dY),'',gT));return el('rect',{x:d-T.dW/2,y:T.dY,width:T.dW,height:T.dH,rx:6,class:'disk'},gT)});
   E.tDisk.push(ds);E.tLn.push(ln);
  });
  E.tOff=tx(xs[1]+(T.dW*1.5+T.dGap+(L.mobile?3:12)),T.dY+T.dH/2,'下线',f.sm,'rose-t st','start',gT);
  // 节点之间的协调线
  E.ew=[];for(let i=0;i<2;i++)E.ew.push(line(P(xs[i]+L.cn.w/2,ncy),P(xs[i+1]-L.cn.w/2,ncy),'thin vio',gT));
  /* DASE：CNode + NVMe-oF + DBox */
  const gD=grp('2 3 4 5 6');E.gD=gD;
  E.cn=[];E.cnSub=[];E.cnV=[];
  xs.forEach(x=>{
   const r={x:x-L.cn.w/2,y:nTop,w:L.cn.w,h:L.cn.h};
   E.cnV.push(line(P(x,nBot),P(x,L.fabY),'',gD));
   E.cn.push(box(r,gD));
   E.cnLbl=E.cnLbl||[];
   E.cnLbl.push(tx(x,ncy,'CNode',f.lbl,'lbl b7','middle',gD));
   E.cnSub.push(tx(x,ncy+15,'',f.sm,'st','middle',gD));
  });
  E.fab=line(P(L.fabX[0],L.fabY),P(L.fabX[1],L.fabY),'',gD);
  tx(L.fabLbl.x,L.fabLbl.y,'NVMe-oF 网络',f.sm,'ink3-t','middle',gD);
  const D=L.db;E.dn=[];E.dnV=[];E.dnB=[];E.bar=[];E.drV=[];E.dr=[];E.dbx=[];
  D.xs.forEach((c,b)=>{
   const r={x:c-D.w/2,y:D.y,w:D.w,h:D.h};E.dbx.push(box(r,gD,'box soft',14));
   tx(r.x+D.ttl.dx,r.y+D.ttl.dy,'DBox',f.sm,'ttl','start',gD);
   const drx=[];const tot=6*D.drW+5*D.drGap;for(let k=0;k<6;k++)drx.push(c-tot/2+D.drW/2+k*(D.drW+D.drGap));
   const barY=D.y+D.barDy,drY=D.y+D.drDy;
   E.bar.push(line(P(drx[0],barY),P(drx[5],barY),'',gD));
   const dn=[];[-1,1].forEach((s,j)=>{const x=c+s*D.dnDx;
    E.dnV.push(line(P(x,L.fabY),P(x,D.y+D.dnDy),'',gD));
    E.dnB.push(line(P(x,D.y+D.dnDy+D.dnH),P(x,barY),'',gD));
    const rr={x:x-D.dnW/2,y:D.y+D.dnDy,w:D.dnW,h:D.dnH};dn.push(box(rr,gD,'box',8));tx(x,rr.y+rr.h/2,'DNode',f.sm,'lbl','middle',gD)});
   E.dn.push(dn);
   const vs=[],ds=[];drx.forEach(x=>{vs.push(line(P(x,barY),P(x,drY),'',gD));ds.push(el('rect',{x:x-D.drW/2,y:drY,width:D.drW,height:D.drH,rx:5,class:'disk'},gD))});
   E.drV.push(vs);E.dr.push(ds);
   E['drx'+b]=drx;E['barY']=barY;E['drY']=drY;
  });
  /* 第 2 步底注、第 5 步虚线 */
  tx(L.W/2,L.bot.y,'DNode 只把盘接到网络上，不跑存储逻辑',f.sm,'ink2-t','middle',grp('2'));
  tx(L.W/2,L.bot.y,L.mobile?'省掉的是协调，数据照样走网络':'省掉的是节点之间的协调，数据照样经网络到盘',f.sm,'ink2-t','middle',grp('5'));
  const gE=grp('5');for(let i=0;i<2;i++)line(P(xs[i]+L.cn.w/2,ncy),P(xs[i+1]-L.cn.w/2,ncy),'dash',gE);
  /* 叉号 */
  const xm=(x,p)=>{const g=el('g',{},p);const a=L.cn.h*0.32,b=L.cn.w*0.18;line(P(x-b,ncy-a),P(x+b,ncy+a),'',g).setAttribute('class','xmark');line(P(x-b,ncy+a),P(x+b,ncy-a),'',g).setAttribute('class','xmark');g.style.opacity=0;return g};
  E.xCN=xm(xs[1],gD);E.xT=xm(xs[1],gT);
  /* 路线 */
  E.front=i=>[cc,P(cc.x,L.busY),P(xs[i],L.busY),P(xs[i],ncy)];
  E.down=(i,b,d)=>{const dnx=D.xs[b]+(d<3?-1:1)*D.dnDx,drx=E['drx'+b][d];
   return [P(xs[i],ncy),P(xs[i],L.fabY),P(dnx,L.fabY),P(dnx,D.y+D.dnDy+D.dnH/2),P(dnx,E.barY),P(drx,E.barY),P(drx,E.drY+D.drH/2)]};
  E.tdown=(i,k)=>{const dx=xs[i]+(k-1)*(T.dW+T.dGap);return [P(xs[i],ncy),P(xs[i],T.barY),P(dx,T.barY),P(dx,T.dY+T.dH/2)]};
  E.ewPath=[P(xs[0]+L.cn.w/2,ncy),P(xs[1]-L.cn.w/2,ncy),P(xs[1]+L.cn.w/2,ncy),P(xs[2]-L.cn.w/2,ncy)];
 },
 reset(){
  svg.querySelectorAll('.ln').forEach(l=>l.classList.remove('lit','ok','dead'));
  svg.querySelectorAll('.disk').forEach(d=>d.classList.remove('w','lit','off'));
  svg.querySelectorAll('.box').forEach(d=>d.classList.remove('on','ok','dead','hot'));
  sub('','');E.cap.textContent='';
  E.xCN.style.opacity=0;E.xT.style.opacity=0;E.tOff.style.opacity=0;
 },
 toggle:{step:5,param:'view',values:['dase','trad'],def:'dase',next:v=>v==='dase'?'trad':'dase',
  label:v=>v==='dase'?'换成传统做法':'换成 DASE',aria:v=>T('切换对比，当前 ')+T(v==='dase'?'DASE':'传统做法'),apply(){}},
 modes:[]
};
function cap(s,c){E.cap.textContent=T(s);E.cap.setAttribute('class','st '+c)}
function sub(s,c){const ncy=L.cn.y+L.cn.h/2;E.cnSub.forEach(t=>{t.textContent=T(s);t.setAttribute('class','st '+c)});E.cnLbl.forEach(t=>t.setAttribute('y',s?ncy-11:ncy))}
const dur=pts=>plen(pts)/L.sp;
/* 第 1 步：各管各的盘，节点之间协调 */
SCENE.modes[0]={enter(){cap('节点之间：锁、缓存同步','violet-t');S.v.c=dot('v');S.v.b=[pk(),pk()];
  S.v.r=[cat(E.front(0),E.tdown(0,0)),cat(E.front(2),E.tdown(2,2))]},
 frame(t){const u=t%4;put(S.v.c,u<2?at(E.ewPath,sm(u/2)):at(rev(E.ewPath),sm((u-2)/2)),1);
  
  [0,1].forEach(j=>{const r=S.v.r[j],d=dur(r),t0=j*2+0.1,uu=(t%4);const p=run(S.v.b[j],r,uu,t0,Math.min(d,1.5));
   E.tDisk[j?2:0][j?2:0].classList.toggle('w',p>1)})}};
/* 第 2 步：解耦 */
const T2=[[0,0,1],[1,1,4],[2,0,4],[0,1,2],[1,0,0],[2,1,5]];
SCENE.modes[1]={enter(){sub('跑存储逻辑','slate-t');S.v.b=pk();},
 frame(t){const per=3.8,k=Math.floor(t/per),u=t-k*per,[i,b,d]=T2[k%T2.length];
  const a=E.front(i),dn=E.down(i,b,d),da=dur(a),dd=dur(dn);
  let p;if(u<da){p=run(S.v.b,a,u,0,da,0)}else if(u<da+0.45){put(S.v.b,a[a.length-1],1);p=1}else p=run(S.v.b,dn,u,da+0.45,dd);
  E.cn.forEach((c,j)=>c.classList.toggle('on',j===i&&u>=da&&u<da+0.45));
  E.dr.forEach((ds,bb)=>ds.forEach((x,dd2)=>x.classList.toggle('w',bb===b&&dd2===d&&u>da+0.45+dd)))}};
/* 第 3 步：全共享，每台 CNode 挂上每一块盘 */
SCENE.modes[2]={enter(){cap('每台 CNode 都挂上每一块盘','slate-t');S.v.d=[];for(let k=0;k<4;k++)S.v.d.push(dot())},
 frame(t){const per=7.2,u=t%per,ph=Math.min(3,Math.floor(u/1.7)),tp=u-ph*1.7;
  E.cnV.forEach((l,i)=>l.classList.toggle('lit',i<ph||(i===ph&&ph<3)));
  E.cn.forEach((c,i)=>c.classList.toggle('on',i<ph||(i===ph&&ph<3&&tp>1.2)));
  const any=u>1.2;E.fab.classList.toggle('lit',any);
  [E.dnV,E.dnB,E.bar].forEach(a=>a.forEach(l=>l.classList.toggle('lit',any)));
  E.drV.forEach(a=>a.forEach(l=>l.classList.toggle('lit',any)));E.dr.forEach(a=>a.forEach(d=>d.classList.toggle('lit',any)));
  E.dn.forEach(a=>a.forEach(d=>d.classList.toggle('on',any)));
  const D=L.db;S.v.d.forEach((o,k)=>{if(ph>2){put(o,-99,-99,0);return}const b=k>>1,s=k&1?1:-1,x=D.xs[b]+s*D.dnDx;
   const pts=[P(L.cn.xs[ph],L.cn.y+L.cn.h/2),P(L.cn.xs[ph],L.fabY),P(x,L.fabY),P(x,D.y+D.dnDy)];run(o,pts,tp,0,1.2,0.3)})}};
/* 第 4 步：写到盘上才确认 */
SCENE.modes[3]={enter(){cap('写到盘上，才确认','sage-t');sub('不留数据','ink3-t');S.v.b=pk();S.v.a=dot('ok');
  S.v.r=cat(E.front(1),E.down(1,0,4))},
 frame(t){const r=S.v.r,d=dur(r)*1.5,per=2*d+2.6,u=t%per;
  const p=run(S.v.b,r,u,0.2,d,0.35);const arr=u>0.2+d;
  E.dr[0][4].classList.toggle('w',arr&&u<0.2+d+1.4);
  const q=run(S.v.a,rev(r),u,0.2+d+0.6,d,0.3);
  E.client.classList.toggle('ok',u>0.2+2*d+0.6&&u<0.2+2*d+1.8)}};
/* 第 5 步：三台同时处理，彼此不协调 */
const T5=[[0,1,3],[1,0,1],[2,0,4]];
SCENE.modes[4]={enter(){cap('CNode 之间：不用协调','sage-t');S.v.b=T5.map(()=>pk());S.v.r=T5.map(([i,b,d])=>cat(E.front(i),E.down(i,b,d)))},
 frame(t){const per=4.2,u=t%per;E.fab.classList.add('lit');
  T5.forEach(([i,b,d],j)=>{const r=S.v.r[j],p=run(S.v.b[j],r,u,0.1+j*0.18,Math.min(dur(r),3.0));E.dr[b][d].classList.toggle('w',p>1)})}};
/* 第 6 步：坏一台（可切换传统做法） */
const T6D=[[0,0,1],[2,1,4],[0,1,2],[2,0,3],[0,0,5],[2,1,0]],T6T=[[0,0],[2,2],[0,2],[2,0],[0,1],[2,1]];
SCENE.modes[5]={enter(){const tr=SCENE.toggle.state==='trad';
  E.gT.classList.toggle('hid',!tr);E.gD.classList.toggle('hid',tr);
  if(tr){cap('坏一台节点：它的盘一起下线','rose-t');E.tn[1].classList.add('dead');E.xT.style.opacity=1;E.tOff.style.opacity=1;
   E.tDisk[1].forEach(d=>d.classList.add('off'));E.tLn[1].forEach(l=>l.classList.add('dead'));E.drop[1].classList.add('dead')}
  else{cap('坏一台 CNode：盘一块不少','sage-t');E.cn[1].classList.add('dead');E.xCN.style.opacity=1;E.cnV[1].classList.add('dead');E.drop[1].classList.add('dead')}
  S.v.tr=tr;S.v.b=pk()},
 frame(t){const per=2.6,k=Math.floor(t/per),u=t-k*per;
  if(S.v.tr){const [i,d]=T6T[k%T6T.length],r=cat(E.front(i),E.tdown(i,d));const p=run(S.v.b,r,u,0.05,Math.min(dur(r),2.0));
   E.tDisk.forEach((a,ii)=>a.forEach((x,dd)=>x.classList.toggle('w',ii===i&&dd===d&&p>1)))}
  else{const [i,b,d]=T6D[k%T6D.length],r=cat(E.front(i),E.down(i,b,d));const p=run(S.v.b,r,u,0.05,Math.min(dur(r),2.1));
   E.dr.forEach((a,bb)=>a.forEach((x,dd)=>x.classList.toggle('w',bb===b&&dd===d&&p>1)))}}};
/* ---------- 引擎 ---------- */
function applyVis(){
  svg.setAttribute('data-step',step+1);
  svg.querySelectorAll('[data-show]').forEach(g=>g.classList.toggle('hid',!g.dataset.show.split(' ').includes(String(step+1))));
  svg.querySelectorAll('[data-dim]').forEach(g=>g.classList.toggle('dim',g.dataset.dim.split(' ').includes(String(step+1))));
  const TG=SCENE.toggle;tgl.hidden=!(TG&&TG.step===step);
  if(TG&&L.tgl){tgl.style.left=(L.tgl.x/L.W*100)+'%';tgl.style.top=(L.tgl.y/L.H*100)+'%'}
}
function newSim(){if(S)S.items.forEach(o=>o.el.remove());S={items:[],v:{}}}
function loop(now){const dt=Math.min(0.05,Math.max(0,(now-last)/1000||0));last=now;const t=Math.max(0,(now-T0)/1000);SCENE.modes[step].frame(t,dt);raf=requestAnimationFrame(loop)}
function run_(){cancelAnimationFrame(raf);if(paused||dead||reduce)return;last=performance.now();raf=requestAnimationFrame(loop)}
function enter(i){
  step=i;cancelAnimationFrame(raf);newSim();
  SCENE.reset&&SCENE.reset();
  applyVis();
  const m=SCENE.modes[i];m.enter&&m.enter();
  if(reduce){const tt=(SCENE.still||[])[i]||1.5;if(m.sim){for(let t=0;t<tt;t+=1/60)m.frame(t,1/60)}else m.frame(tt,0);return}
  m.frame(0,0);T0=pausedAt=performance.now();run_();
}
function setToggle(v){const TG=SCENE.toggle;TG.state=v;TG.apply(v);tgl.textContent='⇄ '+T(TG.label(v));tgl.setAttribute('aria-label',TG.aria(v))}
if(SCENE.toggle){const TG=SCENE.toggle,v=qs.get(TG.param);TG.state=(TG.values||[]).indexOf(v)>-1?v:TG.def;
  tgl.addEventListener('click',()=>{setToggle(TG.next(TG.state));if(step===TG.step)enter(step)})}
function build(){L=SCENE.layout(mq.matches);svg.innerHTML='';E={};svg.setAttribute('viewBox',`0 0 ${L.W} ${L.H}`);SCENE.build();E.pk=el('g',{});
  if(SCENE.toggle)setToggle(SCENE.toggle.state);svg.setAttribute('aria-label',T(ARIA));if(opts.onLayout)opts.onLayout(L.W/L.H,L.mobile)}
function rebuild(){build();enter(step)}
mq.addEventListener('change',rebuild);
const onLang=()=>rebuild();document.addEventListener('ss-lang',onLang);
build();enter(0);
const ctrl={
  show(i){enter(Math.max(0,Math.min(SCENE.modes.length-1,i)))},
  pause(){if(paused)return;paused=true;cancelAnimationFrame(raf);pausedAt=performance.now()},
  resume(){if(!paused)return;paused=false;T0+=performance.now()-pausedAt;run_()},
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('ssa-v-dase')},
  ratio(){return L.W/L.H},
  step(){return step},
  sim(){return {step,v:S.v,n:S.items.length,t:(performance.now()-T0)/1000}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['v-dase']={steps:6,mount:mount};
})();
