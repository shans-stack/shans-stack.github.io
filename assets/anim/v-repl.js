/* 复制：把快照送到另一套集群，出事时切过去：6 步动画（SVG，按时间写死的时间线，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-repl'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-repl.css，全部限定在 .ssa-v-repl 容器之内。 */
(function(){
var EN={"复制暂停": "Replication paused", "VAST 复制：受保护路径与复制对端，异步复制只送改动，RPO 与跳过，一对多，计划内与计划外切换，同步复制两边写盘才确认": "VAST replication: protected paths and peers, async replication of changes only, RPO and skipped snapshots, one-to-many, planned and unplanned failover, and sync replication that waits for both sides", "集群 A": "Cluster A", "集群 B": "Cluster B", "集群 C": "Cluster C", "集群 D": "Cluster D", "集群 E": "Cluster E", "/proj": "/proj", "快照": "Snapshots", "恢复点": "Restore points", "客户端": "Client", "受保护路径": "Protected path", "复制对端": "Replication peer", "复制链路": "Replication link", "源": "Source", "只读 · 最近一次完整复制": "Read-only · last complete copy", "只送改动": "Changes only", "启用后先做一次初始同步": "An initial sync runs as soon as it is enabled", "初始同步完成，生成第一个恢复点": "Initial sync done; the first restore point exists", "带宽充足": "High bandwidth", "带宽不足": "Low bandwidth", "已完成": "Completed", "已完成 ": "Completed ", "跳过": "Skipped", "示意，不代表实测数字": "Schematic, not measured", "一个路径送到多套集群，一套集群也能接收多个路径": "One path goes to several clusters, and one cluster can receive several paths", "一对多，也能多对一": "One-to-many and many-to-one", "2 个来源": "2 sources", "换成计划外切换": "Switch to unplanned", "换成计划内切换": "Switch to planned", "计划内切换": "planned failover", "计划外切换": "unplanned failover", "切换对比，当前 ": "Switch comparison, now showing ", "计划内切换：先同步剩余改动，再反转方向": "Planned failover: sync what remains, then reverse direction", "计划内：同步完再反转": "Planned: sync, then reverse", "源 · 可读写": "Source · read-write", "只读": "Read-only", "复制方向 →": "Direction →", "同步剩余改动": "Syncing the rest", "只读 · 新的对端": "Read-only · new peer", "新的源 · 可读写": "New source · read-write", "← 复制方向": "← Direction", "失联": "Unreachable", "换成两地距离较远": "Switch to distant sites", "换成两地距离较近": "Switch to nearby sites", "距离较近": "nearby sites", "距离较远": "distant sites", "主": "Primary", "从": "Secondary", "两地距离较远": "Sites far apart", "两地距离较近": "Sites close together", "距离越远，等待对端确认越久": "The farther apart, the longer the wait for the peer", "两套集群都写进 SSD，才向客户端确认": "The client gets its ACK only after both clusters write to SSD", "距离越远，确认越慢": "Farther apart, slower ACK", "两边都写进盘才确认": "ACK after both sides write", "只传输快照增量": "Only the snapshot delta is transferred", "传输超出间隔时可能跳过计划快照": "An overrun can skip a scheduled snapshot", "超出间隔时可跳过计划快照": "An overrun can skip a snapshot", "计划外切换：从最近完成的恢复点继续": "Unplanned failover resumes at the latest restore point", "计划外：从最近完成的恢复点继续": "Unplanned: resume from the last restore point", "独立 · 可读写": "Standalone · read-write", "对端缺少尚未复制的写入": "Unreplicated write is absent at the peer", "等待确认": "ACK pending", "延迟较高": "Higher latency", "延迟较低": "Lower latency", "复制方向 ↓": "Direction ↓", "复制方向 ↑": "Direction ↑"};
var ENM={"两地距离较远": "Far", "两地距离较近": "Near", "复制暂停": "Paused", "只读 · 最近一次完整复制": "Read-only copy", "新的源 · 可读写": "New source", "只读 · 新的对端": "New peer", "独立 · 可读写": "Standalone", "对端缺少尚未复制的写入": "Write absent at peer", "等待确认": "Await ACK", "延迟较高": "Slow ACK", "延迟较低": "Fast ACK"};
var ARIA="VAST 复制：受保护路径与复制对端，异步复制只送改动，RPO 与跳过，一对多，计划内与计划外切换，同步复制两边写盘才确认";
function lang(){return window.SS_LANG==='en'?'en':'zh'}
var NS='http://www.w3.org/2000/svg';
function mount(host,opts){
opts=opts||{};
host.classList.add('ssa-v-repl');host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','ssa-scene');svg.setAttribute('role','img');host.appendChild(svg);
const tgl=document.createElement('button');tgl.className='tgl';tgl.type='button';tgl.hidden=true;host.appendChild(tgl);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mq=matchMedia('(max-width: 640px)');
const qs=new URLSearchParams(location.search);
function T(s){if(lang()!=='en')return s;if(L&&L.mobile&&ENM[s]!==undefined)return ENM[s];return EN[s]!==undefined?EN[s]:s}
/* ---------- 通用小工具 ---------- */
function el(tag,a,p){const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);(p||svg).appendChild(e);return e}
function tx(x,y,s,size,cls,anchor,p){const t=el('text',{x,y,'font-size':size,class:cls||''},p);if(anchor)t.setAttribute('text-anchor',anchor);t.textContent=T(s);return t}
function setT(t,s,c){t.textContent=T(s);if(c!==undefined)t.setAttribute('class',c)}
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
function pk(c){const r=el('rect',{x:-L.pw/2,y:-L.ph/2,width:L.pw,height:L.ph,rx:4,class:'pkt '+(c||'')},E.pk);const o={el:r};S.items.push(o);put(o,-99,-99,0);return o}
function dot(c){const r=el('circle',{r:L.dr,cx:0,cy:0,class:'dot '+(c||'')},E.pk);const o={el:r};S.items.push(o);put(o,-99,-99,0);return o}
function put(o,x,y,a){if(typeof x==='object'){a=y;y=x.y;x=x.x}o.x=x;o.y=y;o.a=a==null?1:a;o.el.setAttribute('transform',`translate(${x.toFixed(1)} ${y.toFixed(1)})`);o.el.style.opacity=o.a}
function cls(o,c,on){(o.el||o).classList.toggle(c,!!on)}
/* 沿折线走：t0 开始，dur 秒走完，到终点后 fo 秒淡出。返回 -1 未开始，0–1 途中，>1 已到达 */
function run(o,pts,t,t0,dur,fo){fo=fo==null?0.3:fo;if(t<t0||t>t0+dur+fo){put(o,-99,-99,0);return t<t0?-1:2}const u=(t-t0)/dur;if(u<=1){put(o,at(pts,sm(u)),1);return u}put(o,pts[pts.length-1],1-(t-t0-dur)/fo);return 1.5}
const dur=pts=>plen(pts)/L.sp;
/* ---------- 场景 A（第 1、2、5、6 步）：集群 A、集群 B 各有受保护路径 /proj（4 个数据块）与一排快照，中间一条复制链路。
   场景 B（第 3 步）：带宽充足与带宽不足两条跑道。场景 C（第 4 步）：一对多与多对一。 ---------- */
const SCENE={
 still:[5.4,3.0,8.6,2.6,3.2,2.6],
 toggles:[
  {step:4,param:'failover',values:['planned','unplanned'],def:'planned',next:v=>v==='planned'?'unplanned':'planned',
   label:v=>v==='planned'?'换成计划外切换':'换成计划内切换',name:v=>v==='planned'?'计划内切换':'计划外切换',aria:'切换对比，当前 '},
  {step:5,param:'dist',values:['near','far'],def:'near',next:v=>v==='near'?'far':'near',
   label:v=>v==='near'?'换成两地距离较远':'换成两地距离较近',name:v=>v==='near'?'距离较近':'距离较远',aria:'切换对比，当前 '}],
 layout(mobile){
  if(!mobile){
   const fr=(x)=>({x,y:36,w:280,h:204});
   return {W:960,H:374,mobile:false,f:{lbl:20,sm:17,cap:18},pw:28,ph:22,dr:7,sp:280,
    A:fr(110),B:fr(570),cell:{dx:33,dy:66,w:46,h:40,st:56},laneDy:128,snap:{dy:150,lx:20,x0:148,st:25,w:20},hd:{dy:26},lblDy:52,stBelow:true,
    link:'h',client:{x:10,w:90,h:44},lnkLbl:{x:480,y:152},tgl:{x:480,y:290},lossY:288,cap:{x:480,y:334},note:{x:480,y:360},
    B2:{lanes:[118,256],x0:196,x1:820,iv:114,t1:76,t2:162,lx:20,cx:892},
    C3:{src:[{x:60,y:124},{x:60,y:228}],dst:[{x:660,y:20},{x:660,y:124},{x:660,y:228}],w:220,h:56,bus:440}};
  }
  const fr=(y)=>({x:116,y,w:338,h:168});
  return {W:480,H:530,mobile:true,f:{lbl:18,sm:18,cap:18},pw:24,ph:18,dr:6,sp:220,
   A:fr(36),B:fr(292),cell:{dx:30,dy:60,w:54,h:38,st:76},laneDy:118,snap:{dy:136,lx:14,x0:155,st:30,w:20},hd:{dy:22},lblDy:46,stBelow:false,
   link:'v',client:{x:8,w:100,h:40},lnkLbl:{x:460,y:250},tgl:{x:210,y:262},lossY:222,cap:{x:240,y:494},note:{x:240,y:518},
   B2:{lanes:[130,330],x0:24,x1:456,iv:70,t1:45,t2:105,lx:20,cy:56},
   C3:{src:[{x:8,y:170},{x:8,y:300}],dst:[{x:318,y:40},{x:318,y:170},{x:318,y:300}],w:154,h:56,bus:240}};
 },
 build(){
  const f=L.f;
  /* ===== 场景 A ===== */
  const gA=grp('1 2 5 6');E.cl={};
  ['A','B'].forEach(k=>{const F=L[k],c={F};
   c.frame=box(F,gA,'box',16);
   const hx=F.x+16,hy=F.y+L.hd.dy;c.title=tx(hx,hy,k==='A'?'集群 A':'集群 B',f.lbl,'lbl b7','start',gA);
   c.st=L.stBelow?tx(F.x+F.w/2,F.y+F.h+22,'',f.sm,'st','middle',gA):tx(F.x+F.w-16,F.y+L.lblDy,'',f.sm,'st','end',gA);
   tx(hx,F.y+L.lblDy,'/proj',f.sm,'ink3-t','start',grp('1 2 5',gA));
   tx(hx,F.y+L.lblDy,'S3',f.sm,'ink3-t','start',grp('6',gA));
   c.cells=[];const ly=F.y+L.laneDy;c.ly=ly;
   for(let i=0;i<4;i++){const r={x:F.x+L.cell.dx+i*L.cell.st,y:F.y+L.cell.dy,w:L.cell.w,h:L.cell.h};
    line(P(r.x+r.w/2,r.y+r.h),P(r.x+r.w/2,ly),'thin',gA);c.cells.push({r,b:box(r,gA,'cell',6),cx:r.x+r.w/2})}
   const gSn=grp('1 2 5',gA);
   c.snLbl=tx(F.x+L.snap.lx,F.y+L.snap.dy+L.snap.w/2,k==='A'?'快照':'恢复点',f.sm,'ink3-t','start',gSn);
   c.sn=[];for(let m=0;m<5;m++){const r={x:F.x+L.snap.x0+m*L.snap.st,y:F.y+L.snap.dy,w:L.snap.w,h:L.snap.w};c.sn.push(box(r,gSn,'cell free',4))}
   c.x=el('g',{},gA);const a=F.h*0.2,cx=F.x+F.w/2,cy=F.y+F.h/2;line(P(cx-a,cy-a),P(cx+a,cy+a),'',c.x).setAttribute('class','xmark');line(P(cx-a,cy+a),P(cx+a,cy-a),'',c.x).setAttribute('class','xmark');c.x.style.opacity=0;
   E.cl[k]=c});
  const A=E.cl.A,B=E.cl.B;
  if(L.link==='h'){E.link=line(P(A.cells[0].cx,A.ly),P(B.cells[3].cx,B.ly),'',gA);E.trunk=null}
  else{const tx_=L.W-9;E.trunkX=tx_;line(P(A.cells[0].cx,A.ly),P(tx_,A.ly),'',gA);line(P(B.cells[0].cx,B.ly),P(tx_,B.ly),'',gA);E.link=line(P(tx_,A.ly),P(tx_,B.ly),'',gA)}
  E.lnk=tx(L.lnkLbl.x,L.lnkLbl.y,'',f.sm,'ink3-t st',L.link==='h'?'middle':'end',gA);
  /* 客户端（第 6 步） */
  const gCl=grp('6',gA),cy0=L.A.y+L.cell.dy+L.cell.h/2;E.cli={x:L.client.x,y:cy0-L.client.h/2,w:L.client.w,h:L.client.h};
  box(E.cli,gCl);tx(E.cli.x+E.cli.w/2,cy0,'客户端',f.lbl,'lbl','middle',gCl);line(P(E.cli.x+E.cli.w,cy0),P(A.cells[0].r.x,cy0),'',gCl);
  E.cliSt=tx(E.cli.x,E.cli.y+E.cli.h+20,'',f.sm,'st','start',gCl);
  E.loss=tx(L.A.x+L.A.w/2,L.lossY,'',f.sm,'rose-t st','middle',gA);
  /* ===== 场景 B：两条跑道 ===== */
  const R=L.B2,gB=grp('3');E.R=[];
  [['带宽充足',R.t1],['带宽不足',R.t2]].forEach(([nm,tl],j)=>{const y=R.lanes[j],o={y,tl};
   if(!L.mobile)tx(R.lx,y,nm,f.sm,'lbl b7','start',gB);else tx(R.lx,y-46,nm,f.lbl,'lbl b7','start',gB);
   line(P(R.x0,y),P(R.x1,y),'thin',gB);
   o.mk=[];o.bar=[];o.sk=[];
   for(let k=0;R.x0+10+k*R.iv<R.x1-20;k++){const x=R.x0+10+k*R.iv;
    o.bar.push(el('rect',{x,y:y-7,width:0,height:14,rx:3,class:'xfer'+(j?' slow':'')},gB));
    o.mk.push(el('rect',{x:x-9,y:y-22,width:18,height:18,rx:3,class:'snapmk off'},gB));
    o.sk.push(tx(x,y+28,'',f.sm-1,'rose-t st','middle',gB))}
   o.cur=line(P(R.x0,y-30),P(R.x0,y+18),'cursor',gB);
   if(!L.mobile){tx(R.cx,y-18,'已完成',f.sm,'ink3-t','middle',gB);o.n=tx(R.cx,y+14,'0',30,'num '+(j?'rose-t':'sage-t'),'middle',gB)}
   else{o.n=tx(R.x1,y-46,'',f.sm,'st '+(j?'rose-t':'sage-t'),'end',gB)}
   E.R.push(o)});
  /* ===== 场景 C：一对多、多对一 ===== */
  const Q=L.C3,gC=grp('4');E.Q={src:[],dst:[]};
  const bx=(p,nm,g)=>{const r={x:p.x,y:p.y,w:Q.w,h:Q.h};box(r,g);const t=tx(r.x+16,r.y+r.h/2,nm,f.lbl,'lbl b7','start',g);return {r,t}};
  E.Q.src.push(bx(Q.src[0],'集群 A',gC));
  E.Q.src.push(bx(Q.src[1],'集群 E',gC));
  ['集群 B','集群 C','集群 D'].forEach((nm,i)=>{const o=bx(Q.dst[i],nm,gC);o.n=L.mobile?tx(o.r.x+o.r.w/2,o.r.y+o.r.h+20,'',f.sm,'st sage-t','middle',gC):tx(o.r.x+o.r.w-14,o.r.y+o.r.h/2,'',f.sm,'st sage-t','end',gC);E.Q.dst.push(o)});
  const a=E.Q.src[0].r,ay=a.y+a.h/2,dy=E.Q.dst.map(o=>o.r.y+o.r.h/2);
  const dA=[dy[0],dy[1],E.Q.dst[2].r.y+Q.h*0.32];E.Q.pA=dA.map((yy,i)=>[P(a.x+a.w,ay),P(Q.bus,ay),P(Q.bus,yy),P(E.Q.dst[i].r.x,yy)]);
  E.Q.pA.forEach(p=>poly(p,'',gC));
  const e=E.Q.src[1].r,ey=E.Q.dst[2].r.y+Q.h*0.72;E.Q.pE=[P(e.x+e.w,ey),P(E.Q.dst[2].r.x,ey)];poly(E.Q.pE,'',gC);
  E.cap=tx(L.cap.x,L.cap.y,'',f.cap,'st','middle');
  E.note=tx(L.note.x,L.note.y,'',f.sm-1,'ink3-t','middle');
 },
 reset(){
  ['A','B'].forEach(k=>{const c=E.cl[k];c.frame.setAttribute('class','box');c.x.style.opacity=0;setT(c.st,'','st');
   c.cells.forEach(x=>x.b.setAttribute('class','cell'));c.sn.forEach(x=>x.setAttribute('class','cell free'))});
  E.lnk.textContent='';E.loss.textContent='';E.cliSt.textContent='';E.cap.textContent='';E.note.textContent='';E.link.setAttribute('class','ln');
  E.Q.dst.forEach(o=>o.n.textContent='');
 },
 modes:[]
};
function cap(s,c,sm){E.cap.textContent=T(L.mobile&&sm?sm:s);E.cap.setAttribute('class','st '+(c||'ink2-t'))}
function note(s){E.note.textContent=T(s)}
function status(k,s,c){setT(E.cl[k].st,s,'st '+(c||'ink3-t'))}
/* 从 A 第 i 块到 B 第 j 块（沿块下方的线与复制链路走） */
function xpath(i,j){const A=E.cl.A,B=E.cl.B,a=A.cells[i],b=B.cells[j];
 const s=[P(a.cx,a.r.y+a.r.h/2),P(a.cx,A.ly)],e=[P(b.cx,B.ly),P(b.cx,b.r.y+b.r.h/2)];
 return L.link==='h'?cat(s,e):cat(s,[P(E.trunkX,A.ly),P(E.trunkX,B.ly)],e)}
function cells(k,st){E.cl[k].cells.forEach((x,i)=>x.b.setAttribute('class','cell'+(st[i]?' '+st[i]:'')))}
function snaps(k,n,c){E.cl[k].sn.forEach((x,m)=>x.setAttribute('class',m<n?'cell '+(c||'on'):'cell free'))}
/* 第 1 步：受保护路径与复制对端，初始同步 */
SCENE.modes[0]={enter(){S.v.b=[0,1,2,3].map(()=>pk());status('A','受保护路径','slate-t');status('B','复制对端','ink3-t');setT(E.lnk,'复制链路')},
 frame(t){const per=8,u=t%per;cells('A',['on','on','on','on']);let n=0;
  S.v.b.forEach((o,i)=>{const r=xpath(i,i),t0=0.4+i*0.9;const p=run(o,r,u,t0,Math.min(dur(r),1.8),0.15);if(p>1)n++});
  cells('B',[0,1,2,3].map(i=>i<n?'on':'free'));snaps('A',1,'on');snaps('B',n===4&&u>0.4+3*0.9+2.2?1:0,'ok');
  cap(n<4?'启用后先做一次初始同步':'初始同步完成，生成第一个恢复点','slate-t')}};
/* 第 2 步：异步复制，每次只送改动 */
SCENE.modes[1]={enter(){S.v.b=pk('ochre');status('A','源','slate-t');status('B','只读 · 最近一次完整复制','ink3-t');setT(E.lnk,'只送改动');cap('只传输快照增量','slate-t')},
 frame(t){const per=2.8,k=Math.floor(t/per),u=t-k*per,i=(k*3+1)%4;
  const st=['on','on','on','on'];st[i]=u>0.1?'chg':'on';cells('A',st);
  snaps('A',Math.min(5,2+(k%4)+(u>0.25?1:0)),'on');
  const r=xpath(i,i),p=run(S.v.b,r,u,0.35,Math.min(dur(r),1.6),0.15);
  const sb=['on','on','on','on'];sb[i]=p>1?'chg':'on';cells('B',sb);snaps('B',Math.min(5,1+(k%4)+(p>1?1:0)),'ok')}};
/* 第 3 步：带宽充足与不足，RPO 与跳过 */
SCENE.modes[2]={enter(){cap('传输超出间隔时可能跳过计划快照','rose-t','超出间隔时可跳过计划快照');note('示意，不代表实测数字')},
 frame(t){const R=L.B2,per=9.6,u=t%per,x=R.x0+(R.x1-R.x0)*clamp((u-0.2)/8.2,0,1),fa=u>9.2?Math.max(0,1-(u-9.2)/0.4):1;
  E.R.forEach((o,j)=>{o.cur.setAttribute('x1',x);o.cur.setAttribute('x2',x);o.cur.style.opacity=fa;
   let busy=-1,done=0;
   o.mk.forEach((m,k)=>{const mx=R.x0+10+k*R.iv,b=o.bar[k];
    if(x<mx){m.setAttribute('class','snapmk off');b.setAttribute('width',0);setT(o.sk[k],'');return}
    const skip=busy>mx;m.setAttribute('class','snapmk'+(skip?' exp':''));setT(o.sk[k],skip?'跳过':'');
    if(skip){b.setAttribute('width',0);return}
    busy=mx+o.tl;b.setAttribute('width',Math.max(0,Math.min(o.tl,x-mx,R.x1-mx)));if(x>=mx+o.tl)done++});
   o.mk.forEach(m=>m.style.opacity=fa);o.bar.forEach(m=>m.style.opacity=fa);
   if(!L.mobile)o.n.textContent=done;else o.n.textContent=T('已完成 ')+done;})}};
/* 第 4 步：一对多、多对一 */
SCENE.modes[3]={enter(){S.v.a=[0,1,2].map(()=>pk());S.v.e=pk('ochre');cap('一个路径送到多套集群，一套集群也能接收多个路径','slate-t','一对多，也能多对一')},
 frame(t){const per=3.4,u=t%per,k=Math.floor(t/per);
  S.v.a.forEach((o,i)=>{const p=E.Q.pA[i];run(o,p,u,0.2,Math.min(dur(p),2.0),0.2)});
  const pe=E.Q.pE;run(S.v.e,pe,(t+1.6)%per,0,Math.min(dur(pe),1.6),0.2);
  E.Q.dst.forEach((o,i)=>setT(o.n,i===2?'2 个来源':''))}};
/* 第 5 步：故障切换（计划内 / 计划外） */
SCENE.modes[4]={enter(){const tg=SCENE.toggles[0].state;S.v.un=tg==='unplanned';S.v.b=pk('ochre');
  cap(S.v.un?'计划外切换：从最近完成的恢复点继续':'计划内切换：先同步剩余改动，再反转方向',S.v.un?'rose-t':'sage-t',S.v.un?'计划外：从最近完成的恢复点继续':'计划内：同步完再反转')},
 frame(t){const per=6.4,u=t%per,A=E.cl.A,B=E.cl.B;snaps('A',4,'on');snaps('B',3,'ok');
  if(!S.v.un){
   cells('A',['on','on','on','chg']);
   const r=xpath(3,3),p=run(S.v.b,r,u,1.0,Math.min(dur(r),1.6),0.15);cells('B',['on','on','on',p>1?'chg':'on']);
   if(u<0.6){status('A','源 · 可读写','slate-t');status('B','只读','ink3-t');setT(E.lnk,L.mobile?'复制方向 ↓':'复制方向 →')}
   else if(u<2.9){status('A','只读','ochre-t');status('B','只读','ochre-t');setT(E.lnk,'同步剩余改动')}
   else{status('A','只读 · 新的对端','ink3-t');status('B','新的源 · 可读写','sage-t');setT(E.lnk,L.mobile?'复制方向 ↑':'← 复制方向')}
   A.frame.setAttribute('class','box');B.frame.setAttribute('class','box'+(u>2.9?' ok':''))}
  else{
   cells('A',['on','on','on','lost']);cells('B',['on','on','on','on']);put(S.v.b,-99,-99,0);
   const dead=u>0.5;A.x.style.opacity=fade(u,0.5,0.8);A.frame.setAttribute('class','box'+(dead?' dead':''));E.link.setAttribute('class','ln'+(dead?' dead':''));
   status('A',dead?'失联':'源 · 可读写',dead?'rose-t':'slate-t');
   status('B',u>1.6?'独立 · 可读写':'只读',u>1.6?'sage-t':'ink3-t');B.frame.setAttribute('class','box'+(u>1.6?' ok':''));
   setT(E.lnk,u>1.6?'复制暂停':'');setT(E.loss,u>2.2?'对端缺少尚未复制的写入':'')}}};
/* 第 6 步：同步复制，两边都写进盘才回话 */
SCENE.modes[5]={enter(){const far=SCENE.toggles[1].state==='far';S.v.far=far;S.v.w=pk();S.v.c=pk();S.v.a1=dot('ok');S.v.a2=dot('ok');
  status('A','主','slate-t');status('B','从','ink3-t');setT(E.lnk,far?'两地距离较远':'两地距离较近');
  cap(far?'距离越远，等待对端确认越久':'两套集群都写进 SSD，才向客户端确认',far?'rose-t':'sage-t',far?'距离越远，确认越慢':'两边都写进盘才确认');note('示意，不代表实测数字')},
 frame(t){const far=S.v.far,A=E.cl.A,cy=A.cells[0].r.y+A.cells[0].r.h/2,c0=P(E.cli.x+E.cli.w,cy),a0=P(A.cells[0].cx,cy);
  const tin=0.7,tl=far?2.6:0.9,per=tin*2+tl*2+(far?1.6:2.2),u=t%per;
  run(S.v.w,[c0,a0],u,0.2,tin,0.1);
  const r=xpath(0,0);run(S.v.c,r,u,0.2+tin,tl,0.1);
  const t1=0.2+tin+tl;cells('A',[u>0.2+tin?'chg':'on','on','on','on']);cells('B',[u>t1?'chg':'on','on','on','on']);
  run(S.v.a1,rev(r),u,t1+0.15,tl,0.1);const t2=t1+0.15+tl;
  const q=run(S.v.a2,[a0,c0],u,t2,tin,0.2);
  setT(E.cliSt,q>1?(far?'延迟较高':'延迟较低'):'等待确认',q>1?(far?'st rose-t':'st sage-t'):'st ink3-t')}};

/* ---------- 引擎 ---------- */
function applyVis(){
  svg.setAttribute('data-step',step+1);
  svg.querySelectorAll('[data-show]').forEach(g=>g.classList.toggle('hid',!g.dataset.show.split(' ').includes(String(step+1))));
  svg.querySelectorAll('[data-dim]').forEach(g=>g.classList.toggle('dim',g.dataset.dim.split(' ').includes(String(step+1))));
  const TG=curTG();tgl.hidden=!TG;
  if(TG){const q=(TG.pos&&TG.pos())||L.tgl;tgl.style.left=(q.x/L.W*100)+'%';tgl.style.top=(q.y/L.H*100)+'%';setToggle(TG,TG.state)}
}
function newSim(){if(S)S.items.forEach(o=>o.el.remove());S={items:[],v:{}}}
function loop(now){last=now;const t=Math.max(0,(now-T0)/1000);SCENE.modes[step].frame(t);raf=requestAnimationFrame(loop)}
function run_(){cancelAnimationFrame(raf);if(paused||dead||reduce)return;last=performance.now();raf=requestAnimationFrame(loop)}
function enter(i){
  step=i;cancelAnimationFrame(raf);newSim();
  SCENE.reset&&SCENE.reset();
  applyVis();
  const m=SCENE.modes[i];m.enter&&m.enter();
  if(reduce){m.frame((SCENE.still||[])[i]||1.5);return}
  m.frame(0);T0=pausedAt=performance.now();run_();
}
const TGS=SCENE.toggles||[];
function curTG(){return TGS.find(g=>g.step===step)}
function setToggle(TG,v){TG.state=v;tgl.textContent='⇄ '+T(TG.label(v));tgl.setAttribute('aria-label',T(TG.aria)+T(TG.name(v)))}
TGS.forEach(TG=>{const v=qs.get(TG.param);TG.state=(TG.values||[]).indexOf(v)>-1?v:TG.def});
tgl.addEventListener('click',()=>{const TG=curTG();if(!TG)return;setToggle(TG,TG.next(TG.state));enter(step)});
function build(){L=SCENE.layout(mq.matches);svg.innerHTML='';E={};svg.setAttribute('viewBox',`0 0 ${L.W} ${L.H}`);SCENE.build();E.pk=el('g',{});
  svg.setAttribute('aria-label',T(ARIA));if(opts.onLayout)opts.onLayout(L.W/L.H,L.mobile)}
function rebuild(){build();enter(step)}
mq.addEventListener('change',rebuild);
const onLang=()=>rebuild();document.addEventListener('ss-lang',onLang);
build();enter(0);
const ctrl={
  show(i){enter(Math.max(0,Math.min(SCENE.modes.length-1,i)))},
  pause(){if(paused)return;paused=true;cancelAnimationFrame(raf);pausedAt=performance.now()},
  resume(){if(!paused)return;paused=false;T0+=Math.max(0,performance.now()-pausedAt);run_()},
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('ssa-v-repl')},
  ratio(){return L.W/L.H},
  step(){return step},
  sim(){return {step,v:S.v,n:S.items.length,t:(performance.now()-T0)/1000}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['v-repl']={steps:6,mount:mount};
})();
