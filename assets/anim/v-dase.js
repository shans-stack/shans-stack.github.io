/* DASE：解耦与全共享，七步 SVG 动画。 */
(function(){
var EN={"离线":"Offline","本地盘随节点失效而不可访问":"A Node Failure Removes Access to Its Drives","存储逻辑":"Storage Logic","共享 SSD 已挂载":"Shared SSDs Mounted","CNode 失效，共享盘仍在线":"CNode Offline, Shared Drives Available","写入尚未确认":"Write Pending","示意，不代表实测数字":"Schematic, no measured figures","DASE：解耦与全共享":"DASE: Disaggregated Shared Everything","查询共享 SCM 元数据":"Read shared SCM metadata","读取容量盘并返回客户端":"Read capacity flash and reply","CNode 沿树查元数据":"CNode follows metadata tree","客户端":"Client","NVMe-oF 网络":"NVMe-oF network","SCM":"SCM","大容量闪存":"High-capacity flash","每台 CNode 开机都挂上每一块盘":"Every CNode mounts every drive at start-up","哈希 → DBox 2":"Hash → DBox 2","哈希 → DBox 1":"Hash → DBox 1","读取一份 V-Tree 根":"Read one copy of the V-Tree root","顺着树找到数据":"Tree leads to the data","一致性哈希定位 V-Tree 根":"Consistent hashing locates the V-Tree root","锁：空闲":"Lock: free","锁：CNode 1 持有":"Lock: held by CNode 1","锁：CNode 3 持有":"Lock: held by CNode 3","持有锁，写入中":"Holds lock, writing","已上锁，等待":"Locked, waiting","锁签着 CNode 的 ID，不需要中心锁管理器":"Locks carry the CNode's ID; no central lock manager","令牌 CNode 2：进行中":"Token CNode 2: ongoing","令牌 CNode 2：已取消":"Token CNode 2: canceled","读到令牌":"Reads the token","无响应":"No response","按旧元数据读":"Reads old metadata","事务未提交：读取先前的元数据":"Uncommitted transaction: read previous metadata","节点 ":"Node "};
var ENM={"共享 SSD 已挂载":"SSD Mounted","本地盘随节点失效而不可访问":"Node Offline, Local Drives Unreachable","离线":"Offline","大容量闪存":"Flash","哈希 → DBox 2":"→ DBox 2","哈希 → DBox 1":"→ DBox 1","持有锁，写入中":"Holds lock","已上锁，等待":"Waiting","读到令牌":"Token seen","按旧元数据读":"Old metadata","令牌 CNode 2：进行中":"Token: ongoing","令牌 CNode 2：已取消":"Token: canceled","锁：CNode 1 持有":"Lock: CNode 1","锁：CNode 3 持有":"Lock: CNode 3","读取一份 V-Tree 根":"V-Tree root","顺着树找到数据":"Then the data","一致性哈希定位 V-Tree 根":"Hash lookup for the V-Tree root","锁签着 CNode 的 ID，不需要中心锁管理器":"Locks carry a CNode ID; no lock manager","事务未提交：读取先前的元数据":"Read previous metadata","每台 CNode 开机都挂上每一块盘":"Every CNode mounts every drive"};
var ARIA="DASE：解耦与全共享";
function lang(){return window.SS_LANG==='en'?'en':'zh'}
var NS='http://www.w3.org/2000/svg';
function mount(host,opts){
opts=opts||{};
host.classList.add('ssa-v-dase');host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','ssa-scene');svg.setAttribute('role','img');host.appendChild(svg);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mq=matchMedia('(max-width: 640px)');
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
let L=null,E,S,step=0,T0=0,raf=0,last=0,paused=!!opts.paused,dead=false,pausedAt=0;
/* 数据块与小圆点 */
function pk(cls){const r=el('rect',{x:-L.pw/2,y:-L.ph/2,width:L.pw,height:L.ph,rx:4,class:'pkt '+(cls||'')},E.pk);const o={el:r,kind:'pkt'};S.items.push(o);put(o,-99,-99,0);return o}
function dot(cls){const r=el('circle',{r:L.dr,cx:0,cy:0,class:'dot '+(cls||'')},E.pk);const o={el:r,kind:'dot'};S.items.push(o);put(o,-99,-99,0);return o}
function put(o,x,y,a){if(typeof x==='object'){a=y;y=x.y;x=x.x}o.x=x;o.y=y;o.a=a==null?1:a;o.el.setAttribute('transform',`translate(${x.toFixed(1)} ${y.toFixed(1)})`);o.el.style.opacity=o.a}
/* 沿线走：t 在 [t0, t0+dur] 内沿 pts 走，之后 fo 秒内淡出；返回进度（之前 -1，淡出时 1.5） */
function run(o,pts,t,t0,dur,fo){fo=fo==null?0.3:fo;if(t<t0||t>t0+dur+fo){put(o,-99,-99,0);return -1}const u=(t-t0)/dur;if(u<=1){put(o,at(pts,u),1);return u}put(o,pts[pts.length-1],1-(t-t0-dur)/fo);return 1.5}
function xmark(c,a,b,p){const g=el('g',{class:'xm'},p);line(P(c.x-b,c.y-a),P(c.x+b,c.y+a),'xmark',g);line(P(c.x-b,c.y+a),P(c.x+b,c.y-a),'xmark',g);return g}
const dur=pts=>plen(pts)/L.sp;
const SCENE={
 still:[3.4,6.0,4.85,4.8,6.0,6.9,4.5],
 layout(mobile){
  if(!mobile)return {W:960,H:520,mobile:false,f:{lbl:20,sm:17,cap:18},pw:22,ph:16,dr:7,sp:340,
   client:{x:400,y:10,w:160,h:42},busY:70,topY:72,
   cn:{xs:[200,480,760],w:200,h:64,y:88},fabY:196,fabX:[40,920],fabLbl:{x:340,y:180},
   db:{xs:[250,710],w:400,h:170,y:226,barDy:62,drW:36,drH:48,drGap:10,drDy:84,lblDy:152,ttl:{dx:14,dy:20},vm:13},
   stat:{dx:-14,dy:20,a:'end',below:false},
   tr:{dW:40,dH:50,dGap:14,barY:250,dY:268},
   cnt:{x:480,y:420},tgl:{x:480,y:458},cap:{x:480,y:462},note:{x:480,y:420}};
  return {W:480,H:500,mobile:true,f:{lbl:18,sm:17,cap:17},pw:18,ph:14,dr:6,sp:220,
   client:{x:12,y:8,w:120,h:40},busY:62,topY:66,
   cn:{xs:[82,240,398],w:142,h:58,y:76},fabY:168,fabX:[8,472],fabLbl:{x:161,y:154},
   db:{xs:[122,358],w:228,h:146,y:192,barDy:52,drW:20,drH:40,drGap:6,drDy:70,lblDy:128,ttl:{dx:10,dy:18},vm:11},
   stat:{dx:0,dy:18,a:'middle',below:true},
   tr:{dW:34,dH:42,dGap:9,barY:206,dY:222},
   cnt:{x:240,y:384},tgl:{x:240,y:426},cap:{x:240,y:444},note:{x:240,y:384}};
 },
 build(){
  const f=L.f,M=L.mobile,xs=L.cn.xs,nTop=L.cn.y,nBot=L.cn.y+L.cn.h,ncy=L.cn.y+L.cn.h/2;E.ncy=ncy;
  /* 客户端请求入口。 */
  const gC=grp('3 7');const cl=L.client,cc=C(cl);E.cc=cc;
  box(cl,gC);tx(cc.x,cc.y,'客户端',f.lbl,'lbl','middle',gC);
  line(P(cc.x,cl.y+cl.h),P(cc.x,L.busY),'',gC);line(P(Math.min(cc.x,xs[0]),L.busY),P(Math.max(cc.x,xs[2]),L.busY),'',gC);
  xs.forEach(x=>line(P(x,L.busY),P(x,nTop),'',gC));
  E.front=i=>[P(cc.x,cl.y+cl.h),P(cc.x,L.busY),P(xs[i],L.busY),P(xs[i],ncy)];
  /* 节点本地盘。 */
  const gT=grp('1');E.gT=gT;const TR=L.tr;E.tDisk=[];
  xs.forEach((x,i)=>{const r={x:x-L.cn.w/2,y:nTop,w:L.cn.w,h:L.cn.h};
   line(P(x,nBot),P(x,TR.barY),'',gT);const dx=[-1,0,1].map(k=>x+k*(TR.dW+TR.dGap));line(P(dx[0],TR.barY),P(dx[2],TR.barY),'',gT);
   E.tDisk.push(dx.map(d=>{line(P(d,TR.barY),P(d,TR.dY),'',gT);return el('rect',{x:d-TR.dW/2,y:TR.dY,width:TR.dW,height:TR.dH,rx:6,class:'disk'},gT)}));
   box(r,gT);tx(x,ncy,T('节点 ')+(i+1),f.lbl,'lbl b7','middle',gT)});
  E.ew=[0,1].map(i=>line(P(xs[i]+L.cn.w/2,ncy),P(xs[i+1]-L.cn.w/2,ncy),'thin vio',gT));
  E.tradFailure=tx(xs[1],TR.dY+TR.dH+35,'离线',f.sm,'rose-t st','middle',gT);
  E.tNodes=[...gT.querySelectorAll('.box')];
  /* 全共享：CNode + NVMe-oF + 两台 DBox */
  const gD=grp('2 3 4 5 6 7');E.gD=gD;
  E.cnV=xs.map(x=>line(P(x,nBot),P(x,L.fabY),'',gD));
  E.fab=line(P(L.fabX[0],L.fabY),P(L.fabX[1],L.fabY),'',gD);
  tx(L.fabLbl.x,L.fabLbl.y,'NVMe-oF 网络',f.sm,'ink3-t','middle',gD);
  const D=L.db;E.dbx=[];E.dbV=[];E.bar=[];E.drV=[];E.dr=[];E.drx=[];E.stat=[];
  D.xs.forEach((c,b)=>{const r={x:c-D.w/2,y:D.y,w:D.w,h:D.h};E.dbx.push(box(r,gD,'box soft',14));
   tx(r.x+D.ttl.dx,r.y+D.ttl.dy,'DBox '+(b+1),f.sm,'ttl','start',gD);
   const barY=D.y+D.barDy,drY=D.y+D.drDy,tot=8*D.drW+7*D.drGap,drx=[];for(let k=0;k<8;k++)drx.push(c-tot/2+D.drW/2+k*(D.drW+D.drGap));
   E.drx.push(drx);E.barY=barY;E.drY=drY;
   E.dbV.push(line(P(c,L.fabY),P(c,barY),'',gD));E.bar.push(line(P(drx[0],barY),P(drx[7],barY),'',gD));
   const vs=[],ds=[];drx.forEach((x,k)=>{vs.push(line(P(x,barY),P(x,drY),'',gD));ds.push(el('rect',{x:x-D.drW/2,y:drY,width:D.drW,height:D.drH,rx:5,class:'disk'+(k<2?' scm':'')},gD))});
   E.drV.push(vs);E.dr.push(ds);
   const roles=grp('2',gD);
   box({x:c-38,y:D.y+18,w:76,h:30},roles,'box',6);
   tx(c,D.y+33,'DNode',f.sm,'lbl','middle',roles);
   const ly=D.y+D.lblDy;tx((drx[0]+drx[1])/2,ly,'SCM',f.sm,'ochre-t b7','middle',gD);tx((drx[2]+drx[7])/2,ly,'大容量闪存',f.sm,'ink3-t','middle',gD);
   const S0=L.stat;E.stat.push(S0.below?tx(c,D.y+D.h+S0.dy,'',f.sm,'st','middle',gD):tx(r.x+r.w+S0.dx,r.y+S0.dy,'',f.sm,'st','end',gD));
  });
  /* CNode 可加一行小字 */
  E.cn=[];E.cnG=[];E.cnSub=[];
  xs.forEach(x=>{const r={x:x-L.cn.w/2,y:nTop,w:L.cn.w,h:L.cn.h};E.cn.push(box(r,gD));
   const g=el('g',{},gD);E.cnG.push(g);
   tx(x,ncy,'CNode',f.lbl,'lbl b7','middle',g);
   E.cnSub.push(tx(x,ncy+14,'',f.sm,'st','middle',gD))});
  E.xCN=xs.map(x=>{const g=xmark(P(x+L.cn.w/2-19,nTop+16),7,7,gD);g.style.opacity=0;return g});
  /* 直接向对方 CNode 查询锁或事务状态。 */
  E.top=(a,b)=>[P(xs[a],nTop),P(xs[a],L.topY),P(xs[b],L.topY),P(xs[b],nTop)];
  E.q4=poly(E.top(2,0),'dash vio',grp('5'));E.q5=poly(E.top(2,1),'dash vio',grp('6'));
  /* 路线 */
  E.down=(i,b,d)=>{const c=D.xs[b],x=E.drx[b][d];return [P(xs[i],ncy),P(xs[i],L.fabY),P(c,L.fabY),P(c,E.barY),P(x,E.barY),P(x,E.drY+D.drH/2)]};
  E.toBox=(i,b)=>{const c=D.xs[b];return [P(xs[i],ncy),P(xs[i],L.fabY),P(c,L.fabY),P(c,D.y+D.barDy*0.45)]};
  /* 底部 */
  tx(L.W/2,L.H-20,'示意，不代表实测数字',f.sm,'ink3-t','middle');
  E.cap=tx(L.cap.x,L.cap.y,'',f.cap,'st','middle');
 },
 reset(){
  svg.querySelectorAll('.ln').forEach(l=>l.classList.remove('lit','ok','dead','hot'));
  svg.querySelectorAll('.disk').forEach(d=>d.classList.remove('w','lit','off','parity'));
  svg.querySelectorAll('.box').forEach(d=>d.classList.remove('on','ok','dead','hot','vio','ochre'));
  E.cnSub.forEach((s,i)=>sub(i,''));E.stat.forEach(s=>{s.textContent=''});E.cap.textContent='';
  E.xCN.forEach(g=>g.style.opacity=0);
  E.tradFailure.style.opacity=0;
 },
 modes:[]
};
function cap(s,c){E.cap.textContent=T(s);E.cap.setAttribute('class','st '+c)}
function sub(i,s,c){E.cnSub[i].textContent=T(s);E.cnSub[i].setAttribute('class','st '+(c||'ink3-t'));E.cnG[i].setAttribute('transform',s?'translate(0 -12)':'')}
function stat(b,s,c){E.stat[b].textContent=T(s);E.stat[b].setAttribute('class','st '+(c||'ink3-t'))}
/* 节点本地盘随节点一起失去访问路径。 */
SCENE.modes[0]={enter(){cap('本地盘随节点失效而不可访问','rose-t')},
 frame(t){
  const offline=t%6>=1.4;
  E.tNodes[1].classList.toggle('dead',offline);
  E.tDisk[1].forEach(d=>d.classList.toggle('off',offline));
  E.ew.forEach(route=>route.classList.toggle('dead',offline));
  E.tradFailure.style.opacity=Number(offline);
 }};
/* 第 2 步：每台 CNode 依次挂上全部盘 */
SCENE.modes[1]={enter(){cap('每台 CNode 开机都挂上每一块盘','slate-t');S.v.d=[pk(),pk()]},
 frame(t){const per=6.6,u=t%per,ph=Math.min(3,Math.floor(u/1.8)),tp=u-ph*1.8;
  const done=i=>i<ph||(i===ph&&ph<3&&tp>1.05);
  E.cn.forEach((c,i)=>c.classList.toggle('on',done(i)));E.cnV.forEach((l,i)=>l.classList.toggle('lit',done(i)||(i===ph&&ph<3)));
  E.cnSub.forEach((s,i)=>{const on=done(i);sub(i,on?'共享 SSD 已挂载':'存储逻辑',on?'sage-t':'ink3-t')});
  const any=u>1.05;E.fab.classList.toggle('lit',any);[E.dbV,E.bar].forEach(a=>a.forEach(l=>l.classList.toggle('lit',any)));
  E.drV.forEach(a=>a.forEach(l=>l.classList.toggle('lit',any)));E.dr.forEach(a=>a.forEach(d=>d.classList.toggle('lit',any)));
  S.v.d.forEach((o,b)=>{if(ph>2){put(o,-99,-99,0);return}run(o,E.toBox(ph,b),tp,0,1.05,0.25)})}};
/* 同一台 CNode 查询共享 SCM、读取数据，再回复客户端。 */
SCENE.modes[2]={enter(){S.v.a=pk();S.v.b=pk('vio');S.v.c=pk()},
 frame(t){
  const per=5.5,k=Math.floor(t/per),u=t-k*per,i=k%3;
  const req=E.front(i),meta=E.down(i,0,0),data=E.down(i,1,5);
  run(S.v.a,req,u,0.1,0.7,0);
  run(S.v.b,cat(meta,rev(meta)),u,0.85,1.55,0.1);
  const p=run(S.v.c,cat(data,rev(data),rev(req)),u,2.55,2.15,0.35);
  cap(u<2.5?'查询共享 SCM 元数据':'读取容量盘并返回客户端','sage-t');
  E.cn.forEach((c,j)=>c.classList.toggle('on',j===i&&u>0.5));
  E.dr[0][0].classList.toggle('lit',u>=1.55&&u<2.55);
  E.dr[1][5].classList.toggle('w',p>0.35);
 }};
/* 第 4 步：算哈希找到树根，再顺着树找到数据 */
SCENE.modes[3]={enter(){cap('一致性哈希定位 V-Tree 根','slate-t');S.v.a=dot('ochre');S.v.b=dot('ok')},
 frame(t){const per=6,k=Math.floor(t/per),u=t-k*per,[i,b,d]=k%2===0?[0,1,4]:[2,0,6],o=1-b;
  const root=E.down(i,b,0),meta=E.down(i,b,1),data=E.down(i,b,d);
  sub(i,u>0.15?(b?'哈希 → DBox 2':'哈希 → DBox 1'):'','slate-t');sub(2-i,'');
  E.cn.forEach((c,j)=>c.classList.toggle('on',j===i));
  run(S.v.a,cat(root,rev(root),meta,rev(meta)),u,0.6,2.7,0.2);const arr=u>1.25;
  E.dr[b][0].classList.toggle('lit',arr);E.dr[o][0].classList.remove('lit');
  const p2=run(S.v.b,cat(data,rev(data)),u,3.45,1.5,0.3);
  E.dr[b][d].classList.toggle('w',p2>1);E.dr[o].forEach(x=>x.classList.remove('w'));
  stat(b,arr?(u>=3.45?'顺着树找到数据':u>=1.95?'CNode 沿树查元数据':'读取一份 V-Tree 根'):'',p2>1?'sage-t':'ochre-t');stat(o,'')}};
/* 第 5 步：两台 CNode 写同一处，锁签着 CNode 的 ID */
SCENE.modes[4]={enter(){cap('锁签着 CNode 的 ID，不需要中心锁管理器','slate-t');
  const lk=i=>E.toBox(i,0),dl=Math.min(dur(lk(0)),1.3),w=i=>cat(E.toBox(i,0).slice(0,3),[P(L.db.xs[0],E.barY),P(E.drx[0][1],E.barY),P(E.drx[0][1],E.drY+L.db.drH/2)]),dw=Math.min(dur(w(0)),1.5),q=E.top(2,0),dq=Math.min(dur(q),1.2);
  const a0=0.3,a1=a0+dl,b0=0.75,b1=b0+dl,q1=b1+dq,w0=a1+0.3,w1=w0+dw,rel=Math.max(w1+0.4,q1+dq+0.1),c0=rel+0.2,c1=c0+dl,x0=c1+0.3,x1=x0+dw,rel2=x1+0.5;
  S.v.tl={dl,dw,dq,a0,a1,b0,b1,q1,w0,w1,rel,c0,c1,x0,x1,rel2,per:rel2+1.2};S.v.lk=[lk(0),lk(2)];S.v.w=[w(0),w(2)];S.v.q=q;
  S.v.o={a:dot('rose'),b:dot(),c:dot('v'),w:pk(),x:pk()}},
 frame(t){const T_=S.v.tl,u=t%T_.per,O=S.v.o;
  run(O.a,S.v.lk[0],u,T_.a0,T_.dl,0.2);
  if(u<T_.b1+0.4)run(O.b,S.v.lk[1],u,T_.b0,T_.dl,0.3);else if(u>=T_.c0)run(O.b,S.v.lk[1],u,T_.c0,T_.dl,0.2);else put(O.b,-99,-99,0);
  if(u>=T_.b1&&u<T_.q1+T_.dq)run(O.c,u<T_.q1?S.v.q:rev(S.v.q),u,u<T_.q1?T_.b1:T_.q1,T_.dq,0);else put(O.c,-99,-99,0);
  run(O.w,S.v.w[0],u,T_.w0,T_.dw,0.3);run(O.x,S.v.w[1],u,T_.x0,T_.dw,0.3);
  const h1=u>=T_.a1&&u<T_.rel,h3=u>=T_.c1&&u<T_.rel2;
  stat(0,h1?'锁：CNode 1 持有':h3?'锁：CNode 3 持有':'锁：空闲',h1||h3?'rose-t':'sage-t');
  sub(0,h1?'持有锁，写入中':'','rose-t');
  sub(2,h3?'持有锁，写入中':(u>=T_.b1&&u<T_.c1?'已上锁，等待':''),h3?'rose-t':'violet-t');
  E.cn[0].classList.toggle('hot',h1);E.cn[2].classList.toggle('hot',h3);E.cn[2].classList.toggle('vio',u>=T_.b1&&u<T_.c1);
  E.dr[0][1].classList.toggle('w',(u>T_.w1&&u<T_.rel+0.6)||(u>T_.x1&&u<T_.per-0.3))}};
/* 第 6 步：CNode 中途掉线，别的 CNode 看令牌接手 */
SCENE.modes[5]={enter(){cap('事务未提交：读取先前的元数据','slate-t');
  const wr=i=>cat(E.toBox(i,1).slice(0,3),[P(L.db.xs[1],E.barY),P(E.drx[1][0],E.barY),P(E.drx[1][0],E.drY+L.db.drH/2)]),dw=Math.min(dur(wr(1)),1.4),q=E.top(2,1),dq=Math.min(dur(q),1.0);
  const a0=0.3,a1=a0+dw,die=a1+0.6,b0=die+0.5,b1=b0+Math.min(dur(wr(2)),1.4),q1=b1+0.2+dq,can=q1+0.7,r1=can+0.2+Math.min(dur(wr(2)),1.4);
  S.v.tl={a0,a1,die,b0,b1,q1,can,r1,dw,dq,per:r1+1.5};S.v.r=[wr(1),wr(2)];S.v.q=q;S.v.o={a:pk('ochre'),b:dot(),c:dot('v'),d:pk('ok')}},
 frame(t){const T_=S.v.tl,u=t%T_.per,O=S.v.o;
  run(O.a,S.v.r[0],u,T_.a0,T_.dw,0.2);
  run(O.b,S.v.r[1],u,T_.b0,T_.b1-T_.b0,0.2);
  if(u>=T_.b1+0.2&&u<T_.q1+0.4)run(O.c,S.v.q,u,T_.b1+0.2,T_.dq,0.4);else put(O.c,-99,-99,0);
  run(O.d,rev(S.v.r[1]),u,T_.can+0.2,T_.r1-T_.can-0.2,0.3);
  const dead=u>=T_.die;E.cn[1].classList.toggle('dead',dead);E.xCN[1].style.opacity=dead?1:0;E.cnV[1].classList.toggle('dead',dead);
  E.dr[1][0].classList.toggle('lit',u>=T_.a1);
  stat(1,u<T_.a1?'写入尚未确认':u<T_.can?'令牌 CNode 2：进行中':'令牌 CNode 2：已取消',u<T_.can?'ochre-t':'rose-t');
  sub(1,u>=T_.q1?'无响应':'','rose-t');
  sub(2,u>=T_.can?'按旧元数据读':u>=T_.b1?'读到令牌':'',u>=T_.can?'sage-t':'ochre-t');
  E.cn[2].classList.toggle('on',u>=T_.b0)}};
/* 客户端请求转到存活 CNode，仍走原来的共享介质。 */
SCENE.modes[6]={enter(){
  cap('CNode 失效，共享盘仍在线','sage-t');
  E.cn[1].classList.add('dead');E.cnV[1].classList.add('dead');E.xCN[1].style.opacity=1;
  const i=2;
  S.v.req=E.front(i);S.v.disk=E.down(i,0,4);S.v.a=dot();S.v.b=pk('ok');
  sub(i,'存储逻辑','sage-t');
 },frame(t){
  const u=t%6;
  run(S.v.a,S.v.req,u,0.2,0.8,0.2);
  run(S.v.b,cat(S.v.disk,rev(S.v.disk),rev(S.v.req)),u,1.2,2.75,0.3);
  E.cn[2].classList.toggle('on',u>=0.7);
  E.dr[0][4].classList.toggle('w',u>=2&&u<5.65);
 }};
/* ---------- 引擎 ---------- */
function applyVis(){
  svg.setAttribute('data-step',step+1);
  svg.querySelectorAll('[data-show]').forEach(g=>g.classList.toggle('hid',!g.dataset.show.split(' ').includes(String(step+1))));
  svg.querySelectorAll('[data-dim]').forEach(g=>g.classList.toggle('dim',g.dataset.dim.split(' ').includes(String(step+1))));
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
function build(){L=SCENE.layout(mq.matches);svg.innerHTML='';E={};svg.setAttribute('viewBox',`0 0 ${L.W} ${L.H}`);SCENE.build();E.pk=el('g',{});
  svg.setAttribute('aria-label',T(ARIA));if(opts.onLayout)opts.onLayout(L.W/L.H,L.mobile)}
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
window.SSAnim['v-dase']={steps:7,mount:mount};
})();
