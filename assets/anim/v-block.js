/* Block：把存储当成磁盘卷，经 NVMe/TCP 交给服务器：6 步动画（SVG，按时间写死的时间线，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-block'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-block.css，全部限定在 .ssa-v-block 容器之内。
   VAST 字标直接引用 assets/brand/vast-wordmark-black.svg（浅色）与 vast-wordmark-white.svg（深色），不内嵌。 */
(function(){
var EN={"文件视图":"File view","块":"Block","主机":"Host","共享目录":"Shared directory","同一批数据":"Same data","卷":"Volume","映射到主机":"Mapped to host",
"文件视图提供目录，块卷呈现为设备":"A file view exposes directories. A block volume appears as a device.",
"以太网交换机":"Ethernet switch","NVMe/TCP":"NVMe/TCP","普通以太网":"Standard Ethernet","nvme-cli":"nvme-cli","Linux 客户端":"Linux client","NVMe/TCP 经以太网连接":"NVMe/TCP over Ethernet",
"主机 A":"Host A","主机 B":"Host B","host NQN":"host NQN","子系统":"Subsystem","只开 Block 的 view · 带 NQN":"Block-only view · has an NQN","卷 1":"Volume 1","卷 2":"Volume 2","卷 3":"Volume 3","卷映射给主机：一对多、多对一都可以":"Volumes map to hosts: one-to-many and many-to-one",
"发现 · 8009":"Discover · 8009","多条路径":"Multiple paths","路径示意":"Illustrative paths","发现后连接路径，示例采用轮询":"Discover paths and connect. This example uses round-robin I/O.",
"一台 CNode 下线，I/O 走其余路径":"A CNode goes offline; I/O uses the other paths","剩余路径":"Surviving paths","下线":"Offline",
"同一个集群 · 同一个租户":"One cluster · one tenant","NFS view":"NFS view","S3 view":"S3 view","Block 子系统":"Block subsystem","文件":"File","对象":"Object","快照":"Snapshot","同一集群的 CNode 与 DBox":"CNodes and DBoxes in the same cluster","快照当作卷，映射给主机":"The snapshot is mapped to a host as a volume",
"块、文件、对象在同一套系统里；快照也能当作卷交给主机":"Block, file and object on one system; snapshots can be mapped as volumes",
"VAST 块存储：卷经 NVMe/TCP 交给主机，多条路径分到多台 CNode":"VAST block storage: volumes reach hosts over NVMe/TCP, with paths spread over several CNodes"};
var ENM={"文件视图提供目录，块卷呈现为设备":"File directory and block device","NVMe/TCP 经以太网连接":"NVMe/TCP over standard Ethernet","只开 Block 的 view · 带 NQN":"Block-only view, NQN",
"卷映射给主机：一对多、多对一都可以":"Volumes map to hosts freely","发现后连接路径，示例采用轮询":"Discovery, connection, round-robin I/O","一台 CNode 下线，I/O 走其余路径":"CNode offline: other paths carry I/O",
"块、文件、对象在同一套系统里；快照也能当作卷交给主机":"One system; snapshots map as volumes","同一集群的 CNode 与 DBox":"Cluster CNodes and DBoxes","路径示意":"Illustrative paths","映射到主机":"Mapped to host","Block 子系统":"Block"};
var ARIA="VAST 块存储：卷经 NVMe/TCP 交给主机，多条路径分到多台 CNode";
function lang(){return window.SS_LANG==='en'?'en':'zh'}
var NS='http://www.w3.org/2000/svg';
function mount(host,opts){
opts=opts||{};
host.classList.add('ssa-v-block');host.innerHTML='';
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
let L=null,E,S,step=0,T0=0,raf=0,last=0,paused=!!opts.paused,dead=false,pausedAt=0;
/* 数据块与小圆点 */
function pk(cls){const r=el('rect',{x:-L.pw/2,y:-L.ph/2,width:L.pw,height:L.ph,rx:4,class:'pkt '+(cls||'')},E.pk);const o={el:r,kind:'pkt'};S.items.push(o);put(o,-99,-99,0);return o}
function dot(cls){const r=el('circle',{r:L.dr,cx:0,cy:0,class:'dot '+(cls||'')},E.pk);const o={el:r,kind:'dot'};S.items.push(o);put(o,-99,-99,0);return o}
function put(o,x,y,a){if(typeof x==='object'){a=y;y=x.y;x=x.x}o.x=x;o.y=y;o.a=a==null?1:a;o.el.setAttribute('transform',`translate(${x.toFixed(1)} ${y.toFixed(1)})`);o.el.style.opacity=o.a}
/* 沿线走：t 在 [t0, t0+dur] 内沿 pts 走，之后 fo 秒内淡出；返回进度（之前 -1，淡出时 1.5） */
function run(o,pts,t,t0,dur,fo){fo=fo==null?0.3:fo;if(t<t0||t>t0+dur+fo){put(o,-99,-99,0);return -1}const u=(t-t0)/dur;if(u<=1){put(o,at(pts,u),1);return u}put(o,pts[pts.length-1],1-(t-t0-dur)/fo);return 1.5}
/* VAST 字标：引用 assets/brand 原件。(x,y) 为字标竖直中线上的锚点，h 为高度 */
function vmark(x,y,h,p,anchor){const w=h*66/14;if(anchor==='end')x-=w;else if(anchor==='middle')x-=w/2;const R=window.SS_ROOT||'';
  const g=el('g',{class:'vwm','aria-label':'VAST'},p),a={x:x.toFixed(1),y:(y-h/2).toFixed(1),width:w.toFixed(1),height:h};
  el('image',Object.assign({href:R+'assets/brand/vast-wordmark-black.svg',class:'vwm-l'},a),g);
  el('image',Object.assign({href:R+'assets/brand/vast-wordmark-white.svg',class:'vwm-d'},a),g);return g}
/* 部件名 + VAST 字标排成一行：文字从 x 起（左对齐），字标紧跟在文字后面。返回 {t,m} */
function vlabel(x,y,s,fs,cls,p,h){const t=tx(x,y,s,fs,cls,'start',p);let w;try{w=t.getComputedTextLength()}catch(e){w=0}if(!w)w=fs*0.62*T(s).length;const m=vmark(x+w+Math.round(fs*0.35),y,h,p,'start');return {t,m}}
function xmark(c,a,b,p){const g=el('g',{class:'xm'},p);line(P(c.x-b,c.y-a),P(c.x+b,c.y+a),'xmark',g);line(P(c.x-b,c.y+a),P(c.x+b,c.y-a),'xmark',g);return g}
const dur=pts=>plen(pts)/L.sp;
const SCENE={
 still:[2.2,2.0,6.0,5.5,6.0,4.0],
 layout(mobile){
  if(!mobile)return {W:960,H:520,mobile:false,f:{lbl:20,sm:17,cap:18},pw:22,ph:16,dr:7,sp:320,
   p1:{L:{x:20,y:20,w:440,h:420,ttl:{x:40,y:48},hosts:[100,240,380],hy:80,hw:116,hh:52,busY:200,st:{x:120,y:290,w:240,h:90}},
       R:{x:500,y:20,w:440,h:420,ttl:{x:520,y:48},host:{x:630,y:80,w:180,h:70},vol:{x:630,y:290,w:180,h:90}}},
   host:{x:24,y:170,w:184,h:150},sw:{x:262,y:215,w:150,h:60},netLbl:{x:337,y:308},busX:432,
   cn:{x:500,w:210,h:58,cys:[90,180,270,360],pathDy:12,lblDy:-9},fabX:750,fabLbl:{x:750,y:40},
   db:{x:790,y:130,w:150,h:230},note:{x:480,y:448},
   p3:{hosts:[{x:40,y:105,w:210,h:84},{x:40,y:295,w:210,h:84}],ss:{x:560,y:60,w:360,h:380},vols:[{x:610,y:150,w:260,h:64},{x:610,y:240,w:260,h:64},{x:610,y:330,w:260,h:64}]},
   p6:{cl:{x:20,y:30,w:640,h:410},views:[{x:44,y:90,w:180,h:200},{x:252,y:90,w:180,h:200},{x:460,y:90,w:180,h:200}],vol:{x:480,y:148,w:140,h:48},snap:{x:480,y:222,w:140,h:48},strip:{x:44,y:340,w:596,h:72},host:{x:760,y:212,w:170,h:70}},
   cap:{x:480,y:494}};
  return {W:480,H:600,mobile:true,f:{lbl:18,sm:17,cap:17},pw:18,ph:14,dr:6,sp:220,
   p1:{L:{x:10,y:10,w:460,h:252,ttl:{x:26,y:36},hosts:[96,240,384],hy:56,hw:120,hh:46,busY:150,st:{x:140,y:178,w:200,h:76}},
       R:{x:10,y:278,w:460,h:250,ttl:{x:26,y:304},host:{x:140,y:322,w:200,h:64},vol:{x:140,y:440,w:200,h:72}}},
   host:{x:130,y:10,w:220,h:104},sw:{x:170,y:150,w:140,h:50},netLbl:{x:322,y:164,a:'start'},busY:240,
   cn:{y:290,h:76,w:104,cxs:[64,180,296,412],pathDx:28},fabY:410,fabLbl:{x:24,y:396},
   db:{x:50,y:444,w:380,h:90},note:{x:240,y:556},
   p3:{hosts:[{x:16,y:20,w:212,h:84},{x:252,y:20,w:212,h:84}],ss:{x:16,y:200,w:448,h:220,ttlB:true},vols:[{x:34,y:236,w:128,h:64},{x:176,y:236,w:128,h:64},{x:318,y:236,w:128,h:64}]},
   p6:{cl:{x:10,y:10,w:460,h:400},views:[{x:22,y:56,w:140,h:204},{x:170,y:56,w:140,h:204},{x:318,y:56,w:140,h:204}],vol:{x:330,y:112,w:116,h:44},snap:{x:330,y:178,w:116,h:44},strip:{x:22,y:300,w:436,h:72},host:{x:280,y:470,w:170,h:64}},
   cap:{x:240,y:584}};
 },
 build(){
  const f=L.f,M=L.mobile;
  /* ---- 第 1 步：文件 / 对象 对比 块 ---- */
  const g1=grp('1');const A=L.p1.L,B=L.p1.R;
  box(A,g1,'box soft',16);tx(A.ttl.x,A.ttl.y,'文件视图',f.sm,'ttl','start',g1);
  E.p1h=A.hosts.map(cx=>{const r={x:cx-A.hw/2,y:A.hy,w:A.hw,h:A.hh};line(P(cx,r.y+r.h),P(cx,A.busY),'',g1);return r});
  line(P(A.hosts[0],A.busY),P(A.hosts[2],A.busY),'',g1);const sc=C(A.st);line(P(sc.x,A.busY),P(sc.x,A.st.y),'',g1);
  E.p1h.forEach(r=>{box(r,g1);tx(C(r).x,C(r).y,'主机',f.lbl,'lbl','middle',g1)});
  E.p1st=box(A.st,g1);tx(sc.x,sc.y-12,'共享目录',f.lbl,'lbl b7','middle',g1);tx(sc.x,sc.y+16,'同一批数据',f.sm,'ink3-t','middle',g1);
  E.p1path=i=>[P(A.hosts[i],A.hy+A.hh),P(A.hosts[i],A.busY),P(sc.x,A.busY),P(sc.x,A.st.y+8)];
  box(B,g1,'box soft',16);tx(B.ttl.x,B.ttl.y,'块',f.sm,'ttl','start',g1);
  const hc=C(B.host),vc=C(B.vol);line(P(hc.x,B.host.y+B.host.h),P(vc.x,B.vol.y),'',g1);
  E.p1bh=box(B.host,g1);tx(hc.x,hc.y-12,'主机',f.lbl,'lbl b7','middle',g1);tx(hc.x,hc.y+15,'/dev/nvmeXnY',f.sm,'mono ink3-t','middle',g1);
  E.p1v=box(B.vol,g1);tx(vc.x,vc.y-12,'卷',f.lbl,'lbl b7','middle',g1);tx(vc.x,vc.y+16,'映射到主机',f.sm,'ink3-t','middle',g1);
  E.p1b=[P(hc.x,B.host.y+B.host.h),P(vc.x,B.vol.y+8)];
  /* ---- 第 2、4、5 步：主机 → 以太网 → CNode → NVMe-oF → DBox ---- */
  const g2=grp('2 4 5');E.g2=g2;const H=L.host,hcx=C(H),SW=L.sw,swc=C(SW),CN=L.cn;
  E.cnR=[];E.py=[];E.vipLn=[];E.cnOut=[];E.cnB=[];
  if(!M){
   const hy=hcx.y;line(P(H.x+H.w,hy),P(SW.x,hy),'',g2);line(P(SW.x+SW.w,hy),P(L.busX,hy),'',g2);
   line(P(L.busX,CN.cys[0]+CN.pathDy),P(L.busX,CN.cys[3]+CN.pathDy),'',g2);
   CN.cys.forEach((cy,k)=>{const r={x:CN.x,y:cy-CN.h/2,w:CN.w,h:CN.h},py=cy+CN.pathDy;E.cnR.push(r);E.py.push(py);
    E.vipLn.push(line(P(L.busX,py),P(r.x,py),'',g2));E.cnOut.push(line(P(r.x+r.w,py),P(L.fabX,py),'',g2));
    tx((L.busX+r.x)/2,py-15,'VIP '+(k+1),f.sm,'ink3-t','middle',g2)});
   E.fab=line(P(L.fabX,CN.cys[0]-36),P(L.fabX,CN.cys[3]+36),'',g2);tx(L.fabLbl.x,L.fabLbl.y,'NVMe-oF',f.sm,'ink3-t','middle',g2);
   const D=L.db;line(P(L.fabX,C(D).y),P(D.x,C(D).y),'',g2);
  }else{
   line(P(hcx.x,H.y+H.h),P(swc.x,SW.y),'',g2);line(P(swc.x,SW.y+SW.h),P(swc.x,L.busY),'',g2);
   CN.cxs.forEach((cx,k)=>{const r={x:cx-CN.w/2,y:CN.y,w:CN.w,h:CN.h},px=cx+CN.pathDx;E.cnR.push(r);E.py.push(px);
    E.vipLn.push(line(P(px,L.busY),P(px,r.y),'',g2));E.cnOut.push(line(P(px,r.y+r.h),P(px,L.fabY),'',g2));
    tx(px-6,L.busY+18,'VIP '+(k+1),f.sm,'ink3-t','end',g2)});
   line(P(CN.cxs[0]+CN.pathDx,L.busY),P(CN.cxs[3]+CN.pathDx,L.busY),'',g2);
   E.fab=line(P(16,L.fabY),P(464,L.fabY),'',g2);tx(L.fabLbl.x,L.fabLbl.y,'NVMe-oF',f.sm,'ink3-t','start',g2);
   const D=L.db;line(P(C(D).x,L.fabY),P(C(D).x,D.y),'',g2);
  }
  E.host=box(H,g2);tx(hcx.x,H.y+(M?24:30),'主机',f.lbl,'lbl b7','middle',g2);
  E.hs1=tx(hcx.x,H.y+(M?56:74),'',f.sm,'mono','middle',g2);E.hs2=tx(hcx.x,H.y+(M?80:102),'',f.sm,'ink3-t','middle',g2);
  E.sw=box(SW,g2,'box',8);tx(swc.x,swc.y,'以太网交换机',f.sm,'lbl','middle',g2);
  const gN=grp('2');if(!M){tx(L.netLbl.x,L.netLbl.y,'NVMe/TCP',f.sm,'slate-t b7','middle',gN);tx(L.netLbl.x,L.netLbl.y+24,'普通以太网',f.sm,'ink3-t','middle',gN)}
  else{tx(L.netLbl.x,L.netLbl.y,'NVMe/TCP',f.sm,'slate-t b7','start',gN);tx(L.netLbl.x,L.netLbl.y+24,'普通以太网',f.sm,'ink3-t','start',gN)}
  E.cnR.forEach((r,k)=>{E.cnB.push(box(r,g2));
   if(!M){const ly=r.y+r.h/2+CN.lblDy;if(k===0)vlabel(r.x+14,ly,'CNode',f.lbl,'lbl b7',g2,13);else tx(r.x+14,ly,'CNode',f.lbl,'lbl b7','start',g2)}
   else{tx(r.x+8,r.y+22,'CNode',f.lbl,'lbl b7','start',g2);if(k===0)vmark(r.x+2,r.y-12,11,g2,'start')}});
  E.xCN=E.cnR.map(r=>{const g=xmark(C(r),r.h*0.3,M?r.w*0.2:r.w*0.12,g2);g.style.opacity=0;return g});
  E.cnOff=E.cnR.map(r=>tx(M?C(r).x:r.x+r.w-14,M?r.y+r.h+16:r.y+r.h/2+CN.lblDy,'',f.sm,'rose-t st',M?'middle':'end',g2));
  const D=L.db;E.dbx=box(D,g2,'box soft',12);tx(D.x+12,D.y+20,'DBox',f.sm,'ttl','start',g2);
  E.dk=[];if(!M){for(let rr=0;rr<4;rr++)for(let cc=0;cc<2;cc++)E.dk.push(el('rect',{x:D.x+24+cc*56,y:D.y+44+rr*44,width:46,height:34,rx:5,class:'disk'},g2))}
  else{for(let k=0;k<8;k++)E.dk.push(el('rect',{x:D.x+20+k*44,y:D.y+38,width:32,height:40,rx:5,class:'disk'},g2))}
  E.note=tx(L.note.x,L.note.y,'',f.sm,'ink3-t','middle',g2);
  /* 路线 */
  E.pathTo=k=>{const r=E.cnR[k],py=E.py[k];
   if(!M){const hy=hcx.y;return [P(H.x+H.w,hy),P(SW.x,hy),P(SW.x+SW.w,hy),P(L.busX,hy),P(L.busX,py),P(r.x,py),P(r.x+r.w,py),P(L.fabX,py),P(L.fabX,C(D).y),P(D.x+4,C(D).y)]}
   return [P(hcx.x,H.y+H.h),P(swc.x,SW.y),P(swc.x,SW.y+SW.h),P(swc.x,L.busY),P(py,L.busY),P(py,r.y),P(py,r.y+r.h),P(py,L.fabY),P(C(D).x,L.fabY),P(C(D).x,D.y+4)]};
  E.disc=M?[P(hcx.x,H.y+H.h),P(swc.x,SW.y),P(swc.x,SW.y+SW.h),P(swc.x,L.busY),P(E.py[0],L.busY),P(E.py[0],E.cnR[0].y)]:[P(H.x+H.w,hcx.y),P(SW.x,hcx.y),P(SW.x+SW.w,hcx.y),P(L.busX,hcx.y),P(L.busX,E.py[0]),P(E.cnR[0].x,E.py[0])];
  /* ---- 第 3 步：子系统、卷、主机 ---- */
  const g3=grp('3');const Q=L.p3;
  const ty=Q.ss.ttlB?Q.ss.y+Q.ss.h-70:Q.ss.y+30;box(Q.ss,g3,'box soft',16);tx(Q.ss.x+18,ty,'子系统',f.lbl,'lbl b7','start',g3);tx(Q.ss.x+18,ty+28,'只开 Block 的 view · 带 NQN',f.sm,'ink3-t','start',g3);
  vmark(Q.ss.x+Q.ss.w-(M?14:18),ty,M?11:13,g3,'end');
  E.vol3=Q.vols.map((r,i)=>{const b=box(r,g3,'box',10);tx(C(r).x,C(r).y,'卷 '+(i+1),f.lbl,'lbl','middle',g3);return b});
  E.h3=Q.hosts.map((r,i)=>{const b=box(r,g3);tx(C(r).x,C(r).y-14,i?'主机 B':'主机 A',f.lbl,'lbl b7','middle',g3);tx(C(r).x,C(r).y+16,'host NQN',f.sm,'mono ink3-t','middle',g3);return b});
  /* 映射线：[卷, 主机] */
  E.maps=[[0,0],[1,0],[1,1],[2,1]];E.mapG=el('g',{},g3);
  E.mapPath=([v,h],j)=>{const V=Q.vols[v],Hh=Q.hosts[h];
   if(!M){const vy=C(V).y+(v===1?(h?10:-10):0),hy=C(Hh).y+(j%2?14:-14),mx=[470,430,390,350][j];return [P(V.x,vy),P(mx,vy),P(mx,hy),P(Hh.x+Hh.w,hy)]}
   const vx=C(V).x+(v===1?(h?14:-14):0),hx=C(Hh).x+(j%2?24:-24),my=[150,170,190,130][j];return [P(vx,V.y),P(vx,my),P(hx,my),P(hx,Hh.y+Hh.h)]};
  E.mapLn=E.maps.map((m,j)=>{const p=E.mapPath(m,j);const ln=poly(p,'',E.mapG);ln.style.opacity=0;return ln});
  /* ---- 第 6 步：同一个集群里块、文件、对象并存 ---- */
  const g6=grp('6');const Z=L.p6;
  box(Z.cl,g6,'box soft',16);tx(Z.cl.x+18,Z.cl.y+26,'同一个集群 · 同一个租户',f.sm,'ttl','start',g6);
  const nm=[['NFS view','文件'],['S3 view','对象'],['Block 子系统','']];
  Z.views.forEach((r,i)=>{box(r,g6,i===2?'box hl':'box',12);const c=C(r);tx(c.x,r.y+26,nm[i][0],f.lbl,'lbl b7','middle',g6);if(nm[i][1])tx(c.x,c.y+10,nm[i][1],f.sm,'ink3-t','middle',g6);
   line(P(c.x,r.y+r.h),P(c.x,Z.strip.y),'',g6)});
  box(Z.strip,g6,'box soft',12);tx(C(Z.strip).x,C(Z.strip).y,'同一集群的 CNode 与 DBox',f.sm,'lbl','middle',g6);
  E.v6=box(Z.vol,g6,'box',8);tx(C(Z.vol).x,C(Z.vol).y,'卷 1',f.sm,'lbl','middle',g6);
  E.snapG=el('g',{},g6);E.snapB=box(Z.vol,E.snapG,'box ok',8);E.snapT=tx(C(Z.vol).x,C(Z.vol).y,'快照',f.sm,'sage-t b7','middle',E.snapG);
  const sh=Z.host,shc=C(sh);E.h6=box(sh,g6);tx(shc.x,shc.y,'主机',f.lbl,'lbl b7','middle',g6);
  E.snapPath=M?[P(Z.snap.x+Z.snap.w,C(Z.snap).y),P(464,C(Z.snap).y),P(464,440),P(shc.x,440),P(shc.x,sh.y)]:[P(Z.snap.x+Z.snap.w,C(Z.snap).y),P(sh.x,C(Z.snap).y)];
  E.snapLn=poly(E.snapPath,'',g6);
  E.cap=tx(L.cap.x,L.cap.y,'',f.cap,'st','middle');
 },
 reset(){
  svg.querySelectorAll('.ln').forEach(l=>l.classList.remove('lit','ok','dead','hot'));
  svg.querySelectorAll('.disk').forEach(d=>d.classList.remove('w','lit','off'));
  svg.querySelectorAll('.box').forEach(d=>{if(!d.classList.contains('keep'))d.classList.remove('on','ok','dead','hot')});
  E.cap.textContent='';E.note.textContent='';E.hs1.textContent='';E.hs2.textContent='';
  E.xCN.forEach(g=>g.style.opacity=0);E.cnOff.forEach(t=>t.textContent='');
  E.mapLn.forEach(l=>l.style.opacity=0);E.snapG.setAttribute('transform','');E.snapG.style.opacity=0;
  E.snapB.classList.add('ok');
 },
 modes:[]
};
function cap(s,c){E.cap.textContent=T(s);E.cap.setAttribute('class','st '+c)}
function hs(a,b,c){E.hs1.textContent=T(a);E.hs2.textContent=T(b);if(c)E.hs1.setAttribute('class','st mono '+c)}
const rnd=k=>(k*5+3)%8;
/* 第 1 步：左边三台主机共用一个目录，右边一台主机一块卷 */
SCENE.modes[0]={enter(){cap('文件视图提供目录，块卷呈现为设备','slate-t');S.v.a=[pk(),pk(),pk()];S.v.b=pk()},
 frame(t){const per=3.6,u=t%per;
  S.v.a.forEach((o,i)=>run(o,E.p1path(i),u,i*0.9,1.2,0.25));
  E.p1st.classList.toggle('ok',u>1.2&&u<3.4);
  const v=(t%2.4),down=v<1.2;run(S.v.b,down?E.p1b:rev(E.p1b),v%1.2,0,0.9,0.25);
  E.p1v.classList.toggle('ok',v>0.9&&v<1.6);E.p1bh.classList.toggle('on',v>2.1||v<0.15)}};
/* 第 2 步：NVMe/TCP 走普通以太网 */
SCENE.modes[1]={enter(){cap('NVMe/TCP 经以太网连接','slate-t');hs('nvme-cli','Linux 客户端','slate-t');S.v.o=[pk(),pk()];
  E.cnB.forEach((b,k)=>{if(k)b.classList.add('dead')});E.vipLn.forEach((l,k)=>{if(k)l.classList.add('dead')});E.cnOut.forEach((l,k)=>{if(k)l.classList.add('dead')})},
 frame(t){const r=E.pathTo(0),d=Math.min(dur(r),2.6),per=1.5;
  const lit=new Set();S.v.o.forEach((o,j)=>{const k=Math.floor((t-j*per)/(2*per)),u=t-j*per-k*2*per;const p=run(o,r,u,0,d,0.25);if(k>=0&&(p>1||(p<0&&u>d)))lit.add(rnd(k*2+j))});
  E.dk.forEach((x,i)=>x.classList.toggle('w',lit.has(i)));
  E.vipLn[0].classList.add('lit');E.cnOut[0].classList.add('lit');E.fab.classList.add('lit');E.cnB[0].classList.add('on')}};
/* 第 4 步：发现，然后连上全部路径，I/O 轮询 */
SCENE.modes[3]={enter(){cap('发现后连接路径，示例采用轮询','slate-t');E.note.textContent=T('路径示意');S.v.d=dot('ochre');S.v.o=[];for(let i=0;i<6;i++)S.v.o.push(pk())},
 frame(t){const dd=Math.min(dur(E.disc),1.4),t1=0.2+dd,t2=t1+dd,con=t2+0.3;
  if(t<t2+0.3)run(S.v.d,t<t1?E.disc:rev(E.disc),t,t<t1?0.2:t1,dd,0.3);else put(S.v.d,-99,-99,0);
  E.cnB[0].classList.toggle('ochre',t>t1&&t<t2);
  E.vipLn.forEach((l,k)=>l.classList.toggle('lit',t>con+k*0.35));E.cnOut.forEach((l,k)=>l.classList.toggle('lit',t>con+k*0.35));E.fab.classList.toggle('lit',t>con);
  E.cnB.forEach((b,k)=>b.classList.toggle('on',t>con+k*0.35));
  const t3=con+1.6;hs(t<t3?'nvme discover':'/dev/nvmeXnY',t<t3?'':'多条路径','slate-t');if(t<t3){S.v.o.forEach(o=>put(o,-99,-99,0));return}
  const gap=0.55,u=t-t3,n1=Math.floor(u/gap);S.v.o.forEach(o=>put(o,-99,-99,0));
  for(let m=Math.max(0,n1-5);m<=n1;m++){const k=m%4,r=E.pathTo(k),p=run(S.v.o[m%6],r,u,m*gap,Math.min(dur(r),2.4),0.25);if(p>1)E.dk[rnd(m)].classList.add('w')}
  if(Math.floor(u/4)!==S.v.cl){S.v.cl=Math.floor(u/4);E.dk.forEach(x=>x.classList.remove('w'))}}};
/* 第 5 步：一台 CNode 下线，I/O 走其余三条 */
SCENE.modes[4]={enter(){cap('一台 CNode 下线，I/O 走其余路径','slate-t');hs('/dev/nvmeXnY','多条路径','slate-t');S.v.o=[];for(let i=0;i<6;i++)S.v.o.push(pk());
  E.vipLn.forEach(l=>l.classList.add('lit'));E.cnOut.forEach(l=>l.classList.add('lit'));E.fab.classList.add('lit');E.cnB.forEach(b=>b.classList.add('on'))},
 frame(t){const per=9,u=t%per,off=2.4,gap=0.55;const dead=u>=off;
  E.cnB[2].classList.toggle('dead',dead);E.cnB[2].classList.toggle('on',!dead);E.xCN[2].style.opacity=dead?1:0;E.vipLn[2].classList.toggle('dead',dead);E.cnOut[2].classList.toggle('dead',dead);
  E.cnOff[2].textContent=dead?T('下线'):'';hs('/dev/nvmeXnY',dead?'剩余路径':'多条路径',dead?'sage-t':'slate-t');
  S.v.o.forEach(o=>put(o,-99,-99,0));const n1=Math.floor(u/gap);
  for(let m=Math.max(0,n1-5);m<=n1;m++){const t0=m*gap;const seq=t0<off?[0,1,2,3]:[0,1,3];const k=seq[m%seq.length];if(k===2&&t0+2.6>off&&t0<off)continue;
   const r=E.pathTo(k),p=run(S.v.o[m%6],r,u,t0,Math.min(dur(r),2.4),0.25);if(p>1)E.dk[rnd(m)].classList.add('w')}
  if(u<0.1)E.dk.forEach(x=>x.classList.remove('w'))}};
/* 第 3 步：映射线依次画出 */
SCENE.modes[2]={enter(){cap('卷映射给主机：一对多、多对一都可以','slate-t');S.v.d=E.maps.map(()=>dot('ok'))},
 frame(t){const per=7,u=t%per;
  E.maps.forEach(([v,h],j)=>{const t0=0.4+j*1.2,p=E.mapPath([v,h],j),pr=run(S.v.d[j],p,u,t0,0.9,0.2);
   const on=u>t0+0.9;E.mapLn[j].style.opacity=u>t0?1:0;E.mapLn[j].classList.toggle('ok',on);E.mapLn[j].classList.toggle('lit',!on&&u>t0)});
  E.vol3.forEach((b,i)=>b.classList.toggle('on',E.maps.some(([v],j)=>v===i&&u>0.4+j*1.2)));
  E.h3.forEach((b,i)=>b.classList.toggle('ok',E.maps.some(([v,h],j)=>h===i&&u>1.3+j*1.2)))}};
/* 第 6 步：快照是分身，原卷留在原处，快照映射给主机 */
SCENE.modes[5]={enter(){cap('块、文件、对象在同一套系统里；快照也能当作卷交给主机','slate-t');S.v.p=pk('ok')},
 frame(t){const per=5.2,u=t%per,Z=L.p6,dy=Z.snap.y-Z.vol.y,k=sm(fade(u,0.5,1.4));
  E.snapG.style.opacity=u<0.5?0:Math.min(1,(u-0.5)/0.3);E.snapG.setAttribute('transform',`translate(0 ${(dy*k).toFixed(1)})`);
  E.snapT.style.opacity = fade(dy*k, 22, 34);
  E.v6.classList.toggle('on',u>0.4&&u<1.5);
  E.snapLn.classList.toggle('ok',u>1.7);const p=run(S.v.p,E.snapPath,u,1.8,Math.min(dur(E.snapPath),1.4),0.3);E.h6.classList.toggle('ok',u>1.8+Math.min(dur(E.snapPath),1.4))}};
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
function setToggle(v){const TG=SCENE.toggle;TG.state=v;tgl.textContent='⇄ '+T(TG.label(v));tgl.setAttribute('aria-label',T(TG.aria)+T(TG.name(v)))}
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
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('ssa-v-block')},
  ratio(){return L.W/L.H},
  step(){return step},
  sim(){return {step,v:S.v,n:S.items.length,t:(performance.now()-T0)/1000}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['v-block']={steps:6,mount:mount};
})();
