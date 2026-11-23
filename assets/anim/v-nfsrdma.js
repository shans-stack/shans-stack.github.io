/* NFSoRDMA：NFS 换成 RDMA 传输，数据由网卡直接搬：7 步动画（SVG，按时间写死的时间线，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-nfsrdma'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-nfsrdma.css，全部限定在 .ssa-v-nfsrdma 容器之内。 */
(function(){
var EN={"客户端":"Client","应用内存":"App memory","内核缓冲区":"Kernel","网卡":"NIC","CPU":"CPU","CPU 复制":"CPU copy","不经过":"Bypassed","复制数据":"Copying data","处理请求":"Handles RPCs","占用很高":"Very busy","占用较低":"Light load","TCP":"TCP","RDMA":"RDMA",
"TCP 数据经过两端内核网络栈":"TCP data passes through the kernel stack at both ends",
"挂载：TCP":"Mount: TCP","TCP 挂载":"TCP mount","RDMA 读写":"RDMA I/O","读写：RDMA · 端口 20049":"Reads and writes: RDMA · port 20049","NFSv3 示例：TCP 挂载，RDMA 读写":"NFSv3 example: TCP mount, RDMA I/O",
"RDMA 网卡负责内存间传输":"The RDMA NIC transfers data between memory buffers",
"内核 · 复制":"Kernel copy","已送达":"Delivered","CPU 负载：很高":"CPU load: very high","CPU 负载：较低":"CPU load: low","示意，不代表实测数字":"Schematic, not measured","TCP 与 RDMA 的数据路径示意":"Illustrative TCP and RDMA data paths",
"交换机":"Switch","暂停（PFC）":"Pause (PFC)","丢帧":"Dropped","无损示例：PFC 暂停发送":"Lossless example: PFC pauses the sender","有损示例：队列溢出后传输停顿":"Lossy example: queue overflow stalls the transfer",
"连接卡住":"Stalled","丢帧：":"Drops: ","换成有损网络":"Switch to lossy network","换成无损网络":"Switch to lossless network","切换网络，当前 ":"Switch network, now showing ","无损网络":"lossless network","有损网络":"lossy network","RoCE 要配成无损网络":"RoCE needs a lossless network",
"应用":"Application","NFS 客户端":"NFS client","RPC-over-RDMA":"RPC-over-RDMA","RDMA 网卡":"RDMA NIC","标准 NFS":"Standard NFS","客户端使用 NFS 与 RDMA 支持":"The client needs NFS and RDMA support",
"1 条 RDMA 连接，1 台 CNode":"One RDMA connection, one CNode","nconnect=4：4 条连接，还是同一台 CNode":"nconnect=4: four connections, still one CNode","多路径示例：连接分布到不同 CNode":"Multipath example: connections across CNodes","RDMA 可以和 nconnect、多路径叠加":"RDMA stacks with nconnect and multipath",
"NFS 走 TCP 与走 RDMA：数据路径和 CPU 负担":"NFS over TCP versus over RDMA: the data path and the CPU cost"};
var ENM={"TCP 数据经过两端内核网络栈":"TCP data uses the kernel stack","NFSv3 示例：TCP 挂载，RDMA 读写":"NFSv3: TCP mount, RDMA I/O","RDMA 网卡负责内存间传输":"RDMA: the NIC writes memory directly",
"读写：RDMA · 端口 20049":"I/O: RDMA · 20049","无损示例：PFC 暂停发送":"Lossless example: PFC pauses the sender","有损示例：队列溢出后传输停顿":"Lossy example: overflow stalls I/O","客户端使用 NFS 与 RDMA 支持":"Client NFS and RDMA support",
"nconnect=4：4 条连接，还是同一台 CNode":"nconnect=4: 4 links, one CNode","多路径示例：连接分布到不同 CNode":"Multipath across CNodes","1 条 RDMA 连接，1 台 CNode":"1 RDMA link, 1 CNode","RDMA 可以和 nconnect、多路径叠加":"RDMA with nconnect and multipath",
"TCP 与 RDMA 的数据路径示意":"TCP and RDMA data paths","CPU 负载：很高":"CPU: very high","CPU 负载：较低":"CPU: low","换成有损网络":"Switch to lossy","换成无损网络":"Switch to lossless","示意，不代表实测数字":"Schematic only"};
var ARIA="NFS 走 TCP 与走 RDMA：数据路径和 CPU 负担";
function lang(){return window.SS_LANG==='en'?'en':'zh'}
var NS='http://www.w3.org/2000/svg';
function mount(host,opts){
opts=opts||{};
host.classList.add('ssa-v-nfsrdma');host.innerHTML='';
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
function xmark(c,a,b,p){const g=el('g',{class:'xm'},p);line(P(c.x-b,c.y-a),P(c.x+b,c.y+a),'xmark',g);line(P(c.x-b,c.y+a),P(c.x+b,c.y-a),'xmark',g);return g}
const dur=pts=>plen(pts)/L.sp;
const SCENE={
 still:[2.6,4.6,2.0,8.0,6.0,3.0,9.0],
 layout(mobile){
  if(!mobile)return {W:960,H:520,mobile:false,f:{lbl:20,sm:17,cap:18,big:34},pw:22,ph:16,dr:7,sp:340,
   FL:{x:20,y:24,w:330,h:396},FR:{x:610,y:24,w:330,h:396},
   s:{L:{app:{x:40,y:80,w:190,h:56},kern:{x:96,y:188,w:134,h:56},nic:{x:40,y:312,w:190,h:72},cpu:{x:254,y:150,w:82,h:60},tcpX:214,byX:64,kAnchor:'start'},
      R:{app:{x:730,y:80,w:190,h:56},kern:{x:730,y:188,w:134,h:56},nic:{x:730,y:312,w:190,h:72},cpu:{x:624,y:150,w:82,h:60},tcpX:746,byX:896,kAnchor:'end'},
      tY:330,rY:366,horiz:true,lblT:{x:480,y:314},lblR:{x:480,y:388},ttlL:{x:40,y:52},ttlR:{x:630,y:52}},
   race:{lanes:[{cy:130},{cy:332}],lbl:{x:40,dy:-74},cl:{x:40,w:130,h:80},cn:{x:690,w:150,h:80},cnt:{x:898},chips:[300,560],chipW:56,chipH:34,sep:232,note:{x:40,y:450}},
   net:{cl:{x:40,y:200,w:160,h:80},sw:{x:390,y:180,w:180,h:120},cn:{x:760,y:200,w:160,h:80},y:240,pause:{x:295,y:206},drop:{x:600,y:330},st:{x:480,y:372},cnt:{x:480,y:404}},
   stk:{fr:{x:40,y:30,w:460,h:390},ttl:{x:60,y:58},x:70,w:380,h:56,ys:[84,160,236,312],spX:478,cn:{x:650,y:304,w:250,h:72},cmd:{x:480,y:452}},
   mp:{cl:{x:40,y:180,w:180,h:120},cn:{x:700,w:200,h:60,cys:[80,180,280,380]},bx:[440,460,480,500],lbl:{x:480,y:452}},
   tgl:{x:480,y:440},cap:{x:480,y:494}};
  return {W:480,H:620,mobile:true,f:{lbl:18,sm:17,cap:17,big:30},pw:18,ph:14,dr:6,sp:230,
   FL:{x:10,y:10,w:460,h:244},FR:{x:10,y:340,w:460,h:244},
   s:{L:{app:{x:30,y:54,w:240,h:44},kern:{x:84,y:118,w:170,h:52},nic:{x:30,y:190,w:240,h:50},cpu:{x:296,y:58,w:150,h:54},tcpX:228,byX:52,kAnchor:'start'},
      R:{nic:{x:30,y:352,w:240,h:50},kern:{x:84,y:422,w:170,h:52},app:{x:30,y:494,w:240,h:44},cpu:{x:296,y:430,w:150,h:54},tcpX:228,byX:52,kAnchor:'start'},
      horiz:false,lblT:{x:242,y:280},lblR:{x:66,y:312},ttlL:{x:296,y:36},ttlR:{x:296,y:378}},
   race:{lanes:[{cy:110},{cy:380}],lbl:{x:16,dy:-80},cl:{x:16,w:96,h:80},cn:{x:340,w:112,h:80},cnt:{x:396,dy:78},chips:[166,272],chipW:44,chipH:30,sep:250,note:{x:16,y:556}},
   net:{cl:{x:160,y:20,w:160,h:70},sw:{x:120,y:200,w:240,h:120},cn:{x:160,y:430,w:160,h:70},x:240,pause:{x:254,y:150},drop:{x:400,y:300},st:{x:240,y:526},cnt:{x:336,y:465,a:'start'}},
   stk:{fr:{x:10,y:10,w:460,h:390},ttl:{x:26,y:36},x:26,w:390,h:60,ys:[56,134,212,290],spX:446,cn:{x:140,y:456,w:200,h:64},cmd:{x:240,y:560}},
   mp:{cl:{x:140,y:20,w:200,h:96},cn:{y:420,w:104,h:70,cxs:[64,180,296,412]},by:[250,270,290,310],lbl:{x:240,y:548}},
   tgl:{x:240,y:566},cap:{x:240,y:604}};
 },
 build(){
  const f=L.f,M=L.mobile,SS=L.s;
  /* ===== 第 1–3 步：客户端与 CNode 两侧的内存、内核、网卡 ===== */
  const g=grp('1 2 3');E.side={};
  box(L.FL,g,'box soft',16);box(L.FR,g,'box soft',16);
  tx(SS.ttlL.x,SS.ttlL.y,'客户端',f.sm,'ttl','start',g);tx(SS.ttlR.x,SS.ttlR.y,'CNode',f.sm,'ttl','start',g);
  ['L','R'].forEach(sd=>{const Z=SS[sd],o={};E.side[sd]=o;const ac=C(Z.app),kc=C(Z.kern),nc=C(Z.nic);
   /* 竖线：TCP 经内核、RDMA 绕过内核 */
   const up=!M||sd==='L';
   o.tcpLn=[line(P(Z.tcpX,up?Z.app.y+Z.app.h:Z.app.y),P(Z.tcpX,up?Z.kern.y:Z.kern.y+Z.kern.h),'',g),line(P(Z.tcpX,up?Z.kern.y+Z.kern.h:Z.kern.y),P(Z.tcpX,up?Z.nic.y:Z.nic.y+Z.nic.h),'',g)];
   o.byLn=line(P(Z.byX,up?Z.app.y+Z.app.h:Z.app.y),P(Z.byX,up?Z.nic.y:Z.nic.y+Z.nic.h),'',g);
   o.app=box(Z.app,g);tx(M?Z.app.x+14:ac.x,ac.y,'应用内存',f.lbl,'lbl',M?'start':'middle',g);
   o.kern=box(Z.kern,g);const kx=Z.kAnchor==='start'?Z.kern.x+10:Z.kern.x+Z.kern.w-10;
   tx(kx,kc.y-10,'内核缓冲区',f.sm,'lbl b7',Z.kAnchor,g);o.kSub=tx(kx,kc.y+13,'',f.sm,'st',Z.kAnchor,g);
   o.nic=box(Z.nic,g);tx(M?Z.nic.x+90:nc.x,nc.y,'网卡',f.lbl,'lbl','middle',g);
   o.cpu=box(Z.cpu,g,'box',10);tx(C(Z.cpu).x,C(Z.cpu).y,'CPU',f.lbl,'lbl b7','middle',g);
   const by=Z.cpu.y+Z.cpu.h+12;el('rect',{x:Z.cpu.x,y:by,width:Z.cpu.w,height:10,rx:4,class:'track'},g);o.fill=el('rect',{x:Z.cpu.x,y:by,width:0,height:10,rx:4,class:'fill'},g);
   o.st=tx(C(Z.cpu).x,by+30,'',f.sm,'st','middle',g);o.ld=tx(C(Z.cpu).x,by+54,'',f.sm,'st','middle',g);
   o.ac=P(Z.tcpX,ac.y);o.kc=P(Z.tcpX,kc.y);o.bc=P(Z.byX,ac.y)});
  const A=SS.L,B=SS.R;
  if(SS.horiz){E.netT=line(P(A.nic.x+A.nic.w,SS.tY),P(B.nic.x,SS.tY),'',g);E.netR=line(P(A.nic.x+A.nic.w,SS.rY),P(B.nic.x,SS.rY),'',g);
   E.rTcp=[P(A.tcpX,C(A.app).y),P(A.tcpX,C(A.kern).y)];E.rTcp2=[P(A.tcpX,C(A.kern).y),P(A.tcpX,SS.tY),P(B.tcpX,SS.tY),P(B.tcpX,C(B.kern).y)];E.rTcp3=[P(B.tcpX,C(B.kern).y),P(B.tcpX,C(B.app).y)];
   E.rRd=[P(A.byX,C(A.app).y),P(A.byX,SS.rY),P(B.byX,SS.rY),P(B.byX,C(B.app).y)];
   E.mountT=[P(A.tcpX,SS.tY),P(B.tcpX,SS.tY)]}
  else{E.netT=line(P(A.tcpX,A.nic.y+A.nic.h),P(B.tcpX,B.nic.y),'',g);E.netR=line(P(A.byX,A.nic.y+A.nic.h),P(B.byX,B.nic.y),'',g);
   E.rTcp=[P(A.tcpX,C(A.app).y),P(A.tcpX,C(A.kern).y)];E.rTcp2=[P(A.tcpX,C(A.kern).y),P(B.tcpX,C(B.kern).y)];E.rTcp3=[P(B.tcpX,C(B.kern).y),P(B.tcpX,C(B.app).y)];
   E.rRd=[P(A.byX,C(A.app).y),P(B.byX,C(B.app).y)];E.mountT=[P(A.tcpX,A.nic.y+A.nic.h),P(B.tcpX,B.nic.y)]}
  E.lT=tx(SS.lblT.x,SS.lblT.y,'',f.sm,'st',SS.horiz?'middle':'start',g);E.lR=tx(SS.lblR.x,SS.lblR.y,'',f.sm,'st',SS.horiz?'middle':'start',g);
  /* ===== 第 4 步：两条路同时跑 ===== */
  const g4=grp('4');const R=L.race;E.race=[];
  R.lanes.forEach((ln,j)=>{const o={},cy=ln.cy;E.race.push(o);const top=cy-40;
   tx(R.lbl.x,cy+R.lbl.dy,j?'RDMA':'TCP',f.lbl+2,(j?'sage-t':'rose-t')+' b7','start',g4);
   tx(R.lbl.x+(M?66:76),cy+R.lbl.dy,j?'CPU 负载：较低':'CPU 负载：很高',f.sm,j?'sage-t':'rose-t','start',g4);
   const cl={x:R.cl.x,y:top,w:R.cl.w,h:R.cl.h},cn={x:R.cn.x,y:top,w:R.cn.w,h:R.cn.h};o.cl=cl;o.cn=cn;
   line(P(cl.x+cl.w,cy),P(cn.x,cy),j?'ok':'',g4);
   if(!j)o.chips=R.chips.map(x=>{const r={x:x-R.chipW/2,y:cy-R.chipH/2,w:R.chipW,h:R.chipH};const b=box(r,g4,'box hot',8);tx(x,cy-R.chipH/2-16,'内核 · 复制',f.sm,'rose-t','middle',g4);return {x,b}});
   box(cl,g4);tx(C(cl).x,cl.y+cl.h-16,'客户端',f.sm,'ink3-t','middle',g4);
   box(cn,g4);tx(C(cn).x,cy,'CNode',f.lbl,'lbl','middle',g4);
   const cx=M?R.cnt.x:R.cnt.x,ly=M?cy+R.cnt.dy:cy-20,ny=M?cy+R.cnt.dy+30:cy+18;
   tx(cx,ly,'已送达',f.sm,'ink3-t','middle',g4);o.n=tx(cx,ny,'0',f.big,'num '+(j?'sage-t':'rose-t'),'middle',g4);
   o.qy=cy;o.slot=i=>P(cl.x+cl.w-18-i*(M?18:24),cy+(M?-14:-14));o.exit=P(cl.x+cl.w,cy);o.end=P(cn.x,cy)});
  el('line',{x1:M?16:32,y1:R.sep,x2:L.W-(M?16:32),y2:R.sep,class:'sep'},g4);
  tx(R.note.x,R.note.y,'示意，不代表实测数字',f.sm,'ink3-t','start',g4);
  /* ===== 第 5 步：无损 / 有损 ===== */
  const g5=grp('5');const N=L.net;E.net={};
  const clc=C(N.cl),swc=C(N.sw),cnc=C(N.cn);
  if(!M){line(P(N.cl.x+N.cl.w,N.y),P(N.sw.x,N.y),'',g5);line(P(N.sw.x+N.sw.w,N.y),P(N.cn.x,N.y),'',g5);E.net.in=[P(N.cl.x+N.cl.w,N.y),P(N.sw.x,N.y)];E.net.out=[P(N.sw.x+N.sw.w,N.y),P(N.cn.x,N.y)];E.net.back=[P(N.sw.x,N.y-16),P(N.cl.x+N.cl.w,N.y-16)]}
  else{line(P(N.x,N.cl.y+N.cl.h),P(N.x,N.sw.y),'',g5);line(P(N.x,N.sw.y+N.sw.h),P(N.x,N.cn.y),'',g5);E.net.in=[P(N.x,N.cl.y+N.cl.h),P(N.x,N.sw.y)];E.net.out=[P(N.x,N.sw.y+N.sw.h),P(N.x,N.cn.y)];E.net.back=[P(N.x-16,N.sw.y),P(N.x-16,N.cl.y+N.cl.h)]}
  E.net.cl=box(N.cl,g5);tx(clc.x,clc.y,'客户端',f.lbl,'lbl','middle',g5);
  E.net.sw=box(N.sw,g5,'box',10);tx(swc.x,N.sw.y+26,'交换机',f.lbl,'lbl b7','middle',g5);
  const sw4=M?40:32,sg=M?10:8,tot=4*sw4+3*sg;E.net.slots=[0,1,2,3].map(i=>{const x=swc.x-tot/2+i*(sw4+sg);el('rect',{x,y:N.sw.y+N.sw.h-44,width:sw4,height:28,rx:4,class:'chip'},g5);return P(x+sw4/2,N.sw.y+N.sw.h-30)});
  E.net.cn=box(N.cn,g5);tx(cnc.x,cnc.y,'CNode',f.lbl,'lbl','middle',g5);
  E.net.pl=tx(N.pause.x,N.pause.y,'',f.sm,'violet-t st',M?'start':'middle',g5);
  E.net.dx=xmark(P(N.drop.x,N.drop.y),12,12,g5);E.net.dx.style.opacity=0;E.net.dl=tx(N.drop.x+(M?0:22),N.drop.y+(M?30:0),'丢帧',f.sm,'rose-t st',M?'middle':'start',g5);
  E.net.st=tx(N.st.x,N.st.y,'',f.sm+1,'st','middle',g5);E.net.cnt=tx(N.cnt.x,N.cnt.y,'',f.sm,'st num',N.cnt.a||'middle',g5);
  E.net.dropPath=M?[P(N.x,N.sw.y-8),P(N.drop.x,N.sw.y-8),P(N.drop.x,N.drop.y)]:[P(N.sw.x-6,N.y),P(N.sw.x-6,N.drop.y),P(N.drop.x,N.drop.y)];
  /* ===== 第 6 步：客户端组件 ===== */
  const g6=grp('6');const K=L.stk;box(K.fr,g6,'box soft',16);tx(K.ttl.x,K.ttl.y,'客户端',f.sm,'ttl','start',g6);
  const nm=[['应用',''],['NFS 客户端','标准 NFS'],['RPC-over-RDMA',''],['RDMA 网卡','']];
  E.stk=K.ys.map((y,i)=>{const r={x:K.x,y,w:K.w,h:K.h};const b=box(r,g6,'box',10);tx(r.x+18,y+K.h/2,nm[i][0],f.lbl,'lbl b7','start',g6);
   if(nm[i][1])tx(r.x+r.w-18,y+K.h/2,nm[i][1],f.sm,i===2?'sage-t st':'ink3-t','end',g6);line(P(r.x+r.w,y+K.h/2),P(K.spX,y+K.h/2),'thin',g6);return {b,y:y+K.h/2}});
  const sp0=E.stk[0].y,sp3=E.stk[3].y,kc6=C(K.cn);line(P(K.spX,sp0),P(K.spX,sp3),'thin',g6);
  E.stkPath=M?[P(K.spX,sp0),P(K.spX,kc6.y),P(K.cn.x+K.cn.w,kc6.y)]:[P(K.spX,sp0),P(K.spX,kc6.y),P(K.cn.x,kc6.y)];
  E.stkNet=poly(E.stkPath.slice(1),'',g6);if(M)line(P(K.spX,sp3),P(K.spX,kc6.y),'',g6);
  E.cn6=box(K.cn,g6);tx(kc6.x,kc6.y,'CNode',f.lbl,'lbl b7','middle',g6);
  tx(M?K.spX-8:(K.spX+K.cn.x)/2,M?kc6.y-14:kc6.y-14,'RDMA',f.sm,'sage-t b7',M?'end':'middle',g6);
  tx(K.cmd.x,K.cmd.y,'mount -o proto=rdma server:/ /mnt',f.sm,'mono ink2-t','middle',g6);
  /* ===== 第 7 步：nconnect 与多路径 ===== */
  const g7=grp('7');const Q=L.mp;E.mpCl=box(Q.cl,g7);const qc=C(Q.cl);tx(qc.x,M?Q.cl.y+30:qc.y-16,'客户端',f.lbl,'lbl b7','middle',g7);tx(qc.x,M?Q.cl.y+60:qc.y+16,'网卡',f.sm,'ink3-t','middle',g7);
  E.mpCn=(M?Q.cn.cxs:Q.cn.cys).map(c=>{const r=M?{x:c-Q.cn.w/2,y:Q.cn.y,w:Q.cn.w,h:Q.cn.h}:{x:Q.cn.x,y:c-Q.cn.h/2,w:Q.cn.w,h:Q.cn.h};const b=box(r,g7);
   tx(C(r).x,C(r).y,'CNode',f.lbl,'lbl b7','middle',g7);return {r,b}});
  E.mpG=el('g',{},g7);E.mpL=tx(Q.lbl.x,Q.lbl.y,'',f.sm+1,'st','middle',g7);
  E.conn=(o,k,o2,bx)=>{const r=E.mpCn[k].r;if(!M){const sy=qc.y+o,ey=C(r).y+o2;return [P(Q.cl.x+Q.cl.w,sy),P(bx,sy),P(bx,ey),P(r.x,ey)]}
   const sx=qc.x+o,ex=C(r).x+o2,by=bx;return [P(sx,Q.cl.y+Q.cl.h),P(sx,by),P(ex,by),P(ex,r.y)]};
  E.cap=tx(L.cap.x,L.cap.y,'',f.cap,'st','middle');
 },
 reset(){
  svg.querySelectorAll('.ln').forEach(l=>l.classList.remove('lit','ok','dead','hot','dash','skip'));
  svg.querySelectorAll('.box').forEach(d=>d.classList.remove('on','ok','dead','skip'));
  ['L','R'].forEach(sd=>{const o=E.side[sd];o.kSub.textContent='';o.st.textContent='';o.ld.textContent='';o.fill.setAttribute('width',0)});
  E.lT.textContent='';E.lR.textContent='';E.cap.textContent='';E.mpG.innerHTML='';E.mpL.textContent='';
  E.net.pl.textContent='';E.net.dx.style.opacity=0;E.net.dl.style.opacity=0;E.net.st.textContent='';E.net.cnt.textContent='';
  E.race.forEach(o=>o.n.textContent='0');E.pk.style.opacity=1;
 },
 toggle:{step:4,param:'net',values:['lossless','lossy'],def:'lossless',next:v=>v==='lossless'?'lossy':'lossless',label:v=>v==='lossless'?'换成有损网络':'换成无损网络',aria:'切换网络，当前 ',name:v=>v==='lossless'?'无损网络':'有损网络'},
 modes:[]
};
function cap(s,c){E.cap.textContent=T(s);E.cap.setAttribute('class','st '+c)}
function setT(t,s,c){t.textContent=T(s);t.setAttribute('class','st '+c)}
/* CPU 负载：tg 为目标（0–1），慢慢涨落；只写较低 / 很高 */
function cpu(sd,tg,dt,stTxt){const o=E.side[sd];o.lv=o.lv==null?0:o.lv;const tau=tg>o.lv?0.9:0.6;o.lv+=(tg-o.lv)*(1-Math.exp(-Math.max(0,dt)/tau));
 const w=L.s[sd].cpu.w;o.fill.setAttribute('width',(w*o.lv).toFixed(1));o.fill.setAttribute('class','fill'+(o.lv>0.5?'':' sage'));
 setT(o.st,stTxt,o.lv>0.5?'rose-t':'sage-t');setT(o.ld,o.lv<0.06?'':o.lv>0.5?'占用很高':'占用较低',o.lv>0.5?'rose-t':'ink3-t');o.cpu.classList.toggle('hot',o.lv>0.5)}
/* 第 1 步：TCP：应用内存 → 复制进内核 → 网卡 → 对方内核 → 复制进应用内存 */
SCENE.modes[0]={sim:1,enter(){cap('TCP 数据经过两端内核网络栈','rose-t');
  ['L','R'].forEach(sd=>{E.side[sd].lv=0;setT(E.side[sd].kSub,'CPU 复制','rose-t');E.side[sd].byLn.classList.add('dead')});E.netR.classList.add('dead');E.netT.classList.add('hot');setT(E.lT,'TCP','rose-t');
  S.v.a=pk();S.v.b=pk('rose');S.v.c=pk('rose')},
 frame(t,dt){const per=4.4,u=t%per,d2=Math.min(dur(E.rTcp2),1.8);
  /* 原块留在应用内存 */
  put(S.v.a,E.rTcp[0],u<3.9?Math.min(1,u/0.3):Math.max(0,(per-u)/0.5));
  const p1=run(S.v.b,E.rTcp,u,0.4,0.6,0);if(u>=1.0)run(S.v.b,E.rTcp2,u,1.25,d2,0);if(u>=1.0&&u<1.25)put(S.v.b,E.rTcp[1],1);
  const t3=1.25+d2;if(u>=t3&&u<t3+0.25)put(S.v.b,E.rTcp3[0],1);else if(u>=t3+0.25)put(S.v.b,-99,-99,0);
  run(S.v.c,E.rTcp3,u,t3+0.25,0.6,0.6);
  E.side.L.kern.classList.toggle('hot',u>0.4&&u<1.6);E.side.R.kern.classList.toggle('hot',u>t3-0.1&&u<t3+1.0);
  cpu('L',(u>0.3&&u<1.6)?1:0.85,dt,'复制数据');cpu('R',(u>t3-0.2&&u<t3+1.0)?1:0.85,dt,'复制数据')}};
/* 第 2 步：先用 TCP 挂载，再建立 RDMA 连接 */
SCENE.modes[1]={enter(){cap('NFSv3 示例：TCP 挂载，RDMA 读写','slate-t');S.v.d=dot();S.v.p=pk('ok')},
 frame(t){const per=6.2,u=t%per,dm=Math.min(dur(E.mountT),1.2),dr=Math.min(dur(E.rRd),2.0);
  run(S.v.d,u<0.3+dm?E.mountT:rev(E.mountT),u,u<0.3+dm?0.3:0.3+dm,dm,0.2);
  E.netT.classList.toggle('dash',true);E.netT.classList.toggle('lit',u<0.3+2*dm+0.2);
  setT(E.lT,L.mobile?'TCP 挂载':'挂载：TCP',u<0.3+2*dm+0.4?'slate-t':'ink3-t');
  const on=u>0.3+2*dm+0.4;E.netR.classList.toggle('ok',on);E.side.L.byLn.classList.toggle('ok',on);E.side.R.byLn.classList.toggle('ok',on);setT(E.lR,on?(L.mobile?'RDMA 读写':'读写：RDMA · 端口 20049'):'',on?'sage-t':'ink3-t');
  run(S.v.p,E.rRd,u,0.3+2*dm+0.8,dr,0.3);
  E.side.L.nic.classList.toggle('on',u<0.3+2*dm+0.3);E.side.R.nic.classList.toggle('on',u>0.3+dm&&u<0.3+2*dm+0.3)}};
/* 第 3 步：RDMA：网卡直接放进对方内存，内核不经过 */
SCENE.modes[2]={sim:1,enter(){cap('RDMA 网卡负责内存间传输','sage-t');
  ['L','R'].forEach(sd=>{const o=E.side[sd];o.lv=0;o.kern.classList.add('skip');o.tcpLn.forEach(l=>l.classList.add('skip'));setT(o.kSub,'不经过','ink3-t');o.byLn.classList.add('ok')});
  E.netT.classList.add('skip');E.netR.classList.add('ok');setT(E.lR,'RDMA','sage-t');S.v.o=[pk('ok'),pk('ok')]},
 frame(t,dt){const per=1.6,d=Math.min(dur(E.rRd),2.4);
  S.v.o.forEach((o,j)=>{const k=Math.floor((t-j*per)/(2*per)),u=t-j*per-k*2*per;run(o,E.rRd,u,0,d,0.3)});
  const st=(t%per)<0.25;E.side.L.cpu.classList.toggle('on',st);cpu('L',0.18,dt,'处理请求');cpu('R',0.12,dt,'处理请求')}};
/* 第 4 步：TCP 与 RDMA 同时跑：TCP 一次只在路上一块，还要在两端内核停一下 */
SCENE.modes[3]={sim:1,enter(){cap('TCP 与 RDMA 的数据路径示意','slate-t');S.v.cyc=-1},
 frame(t,dt){const per=10,c=Math.floor(t/per),u=t-c*per,R=L.race;
  if(c!==S.v.cyc){S.items.forEach(o=>o.el.remove());S.items=[];S.v.cyc=c;E.race.forEach(lane=>lane.n.textContent='0');S.v.l=[{q:[],fly:null,cnt:0,next:0},{q:[],fly:[],cnt:0,next:0}]}
  const T0_=E.race[0],T1_=E.race[1],l0=S.v.l[0],l1=S.v.l[1];
  /* 排队 */
  [0,1].forEach(j=>{const ln=S.v.l[j],G=E.race[j];if(u<8.6&&ln.q.length<3){const o=pk(j?'ok':'rose');put(o,G.slot(ln.q.length),0);ln.q.push(o)}
   ln.q.forEach((o,i)=>{const s=G.slot(i);put(o,o.x+(s.x-o.x)*Math.min(1,dt*8),o.y+(s.y-o.y)*Math.min(1,dt*8),Math.min(1,o.a+dt*4))})});
  /* TCP：一次一块，经过两个内核停一下 */
  if(!l0.fly&&l0.q.length&&u<8.6){const o=l0.q.shift();const xs=[T0_.exit.x,T0_.chips[0].x,T0_.chips[1].x,T0_.end.x];o.go={t0:u,xs};l0.fly=o}
  if(l0.fly){const o=l0.fly,g=o.go,v=R.chips?L.sp*0.8:300,seg=i=>Math.abs(g.xs[i+1]-g.xs[i])/v,stop=0.45;let tt=u-g.t0,x=g.xs[0],done=false;
   T0_.chips.forEach(c=>c.b.classList.remove('on'));
   for(let i=0;i<3;i++){const s=seg(i);if(tt<=s){x=g.xs[i]+(g.xs[i+1]-g.xs[i])*tt/s;break}tt-=s;x=g.xs[i+1];if(i<2){if(tt<=stop){T0_.chips[i].b.classList.add('on');break}tt-=stop}else done=true}
   if(done){if(!o.dd){o.dd=1;l0.cnt++;T0_.n.textContent=l0.cnt}const a=1-(tt)/0.3;if(a<=0){o.el.remove();o.dead=1;l0.fly=null}else put(o,x,T0_.qy,a)}else put(o,x,T0_.qy,1)}
  /* RDMA：前一块出发 0.42 秒后就能发下一块，不停 */
  if(u>=l1.next&&l1.q.length&&u<8.6){const o=l1.q.shift();o.go={t0:u,pts:[T1_.exit,T1_.end]};o.go.d=plen(o.go.pts)/(L.sp*0.9);l1.fly.push(o);l1.next=u+0.42}
  l1.fly=l1.fly.filter(o=>{const v=(u-o.go.t0)/o.go.d;if(v<1){put(o,at(o.go.pts,v),1);return true}if(!o.dd){o.dd=1;l1.cnt++;T1_.n.textContent=l1.cnt}const a=1-(u-o.go.t0-o.go.d)/0.3;if(a<=0){o.el.remove();o.dead=1;return false}put(o,T1_.end,a);return true});
  S.items=S.items.filter(o=>!o.dead);
  const fa=u>9.5?Math.max(0,(per-u)/0.5):u<0.3?u/0.3:1;E.pk.style.opacity=fa;T0_.n.style.opacity=fa;T1_.n.style.opacity=fa}};
/* 第 5 步：无损网络靠暂停，有损网络会丢帧（切换） */
SCENE.modes[4]={sim:1,enter(){const ly=SCENE.toggle.state==='lossy';S.v.ly=ly;S.v.cyc=-1;
  cap(ly?'有损示例：队列溢出后传输停顿':'无损示例：PFC 暂停发送',ly?'rose-t':'sage-t')},
 frame(t,dt){const per=10,c=Math.floor(t/per),u=t-c*per,NN=E.net;
  if(c!==S.v.cyc){S.items.forEach(o=>o.el.remove());S.items=[];S.v.cyc=c;S.v.s={q:[],fly:[],out:[],next:0.2,serve:1.0,hold:0,drops:0,stall:-1,sig:null}}
  const s=S.v.s,din=plen(NN.in)/L.sp,dout=plen(NN.out)/L.sp;
  /* 客户端发送 */
  const stalled=s.stall>=0&&u<s.stall+2.6;
  if(u>=s.next&&u<9&&u>=s.hold&&!stalled){const o=pk();o.go={t0:u};s.fly.push(o);s.next=u+0.32}
  s.fly=s.fly.filter(o=>{const v=(u-o.go.t0)/din;if(v<1){put(o,at(NN.in,v),1);return true}
   if(s.q.length>=4){if(S.v.ly&&!o.drop){o.drop={t0:u};s.drops++;s.stall=u}}
   if(o.drop){const w=(u-o.drop.t0)/0.7;if(w<1){put(o,at(NN.dropPath,w),1);return true}put(o,NN.dropPath[2],Math.max(0,1-(w-1)*1.5));if(w>2.2){o.el.remove();o.dead=1;return false}return true}
   s.q.push(o);return false});
  /* 无损：队列到 2 块就发暂停 */
  if(!S.v.ly&&s.q.length>=2&&!s.sig&&u>=s.hold){const d=dot('v');s.sig={o:d,t0:u}}
  if(s.sig){const w=(u-s.sig.t0)/0.6;if(w<1)put(s.sig.o,at(NN.back,w),1);else{s.hold=s.sig.t0+0.6+1.6;s.sig.o.el.remove();s.sig.o.dead=1;s.sig=null}}
  setT(NN.pl,(s.sig||u<s.hold)&&!S.v.ly?'暂停（PFC）':'','violet-t');
  /* 交换机按较慢的速度往外送 */
  if(u>=s.serve&&s.q.length&&!(S.v.ly&&stalled)){const o=s.q.shift();o.go={t0:u};s.out.push(o);s.serve=u+0.8}
  s.q.forEach((o,i)=>put(o,NN.slots[Math.min(3,i)],1));
  s.out=s.out.filter(o=>{const v=(u-o.go.t0)/dout;if(v<1){put(o,at(NN.out,v),1);return true}const a=1-(v-1)*dout/0.3;if(a<=0){o.el.remove();o.dead=1;return false}put(o,NN.out[1],a);return true});
  S.items=S.items.filter(o=>!o.dead);
  const dropped=s.drops>0;NN.dx.style.opacity=dropped?1:0;NN.dl.style.opacity=dropped?1:0;
  NN.sw.classList.toggle('hot',s.q.length>=4);NN.cn.classList.toggle('dead',S.v.ly&&stalled);
  setT(NN.st,S.v.ly&&stalled?'连接卡住':'',S.v.ly?'rose-t':'sage-t');
  NN.cnt.textContent=T('丢帧：')+s.drops;NN.cnt.setAttribute('class','st num '+(s.drops?'rose-t':'sage-t'));
  const fa=u>9.5?Math.max(0,(per-u)/0.5):1;E.pk.style.opacity=fa}};
/* 第 6 步：客户端的 NFS 与 RDMA 协议层 */
SCENE.modes[5]={enter(){cap('客户端使用 NFS 与 RDMA 支持','slate-t');S.v.p=pk('ok')},
 frame(t){const per=4.4,u=t%per,ys=E.stk.map(s=>s.y),K=L.stk;
  const pts=[P(K.spX,ys[0]),P(K.spX,ys[3])].concat(E.stkPath.slice(1)),d=Math.min(dur(pts),2.6);
  const p=run(S.v.p,pts,u,0.2,d,0.3);const y=S.v.p.y;
  E.stk.forEach((s,i)=>s.b.classList.toggle(i===2?'ok':'on',p>=0&&p<=1&&y>=s.y-4));E.stkNet.classList.toggle('ok',p>0.6);E.cn6.classList.toggle('ok',p>1)}};
/* 第 7 步：1 条连接 → nconnect=4 → 多路径 */
SCENE.modes[6]={enter(){cap('RDMA 可以和 nconnect、多路径叠加','slate-t');S.v.ph=-1;S.v.o=[];for(let i=0;i<8;i++)S.v.o.push(pk('ok'))},
 frame(t){const per=12,u=t%per,ph=u<3.4?0:u<7.4?1:2,t0=[0,3.4,7.4][ph],M=L.mobile;
  if(ph!==S.v.ph){S.v.ph=ph;E.mpG.innerHTML='';const offs=M?[-18,-6,6,18]:[-18,-6,6,18];
   const b1=M?[250,270,290,310]:[440,460,480,500],b2=M?[250,270,270,250]:[440,460,500,480];S.v.c=ph===0?[E.conn(0,0,0,b1[0])]:ph===1?offs.map((o,j)=>E.conn(o,0,o,b1[j])):offs.map((o,j)=>E.conn(o,j,0,b2[j]));
   S.v.c.forEach(p=>poly(p,'ok',E.mpG));
   setT(E.mpL,['1 条 RDMA 连接，1 台 CNode','nconnect=4：4 条连接，还是同一台 CNode','多路径示例：连接分布到不同 CNode'][ph],ph===2?'sage-t':'slate-t');
   E.mpCn.forEach((c,k)=>c.b.classList.toggle('on',ph<2?k===0:true))}
  const v=u-t0,N=S.v.c.length;S.v.o.forEach(o=>put(o,-99,-99,0));
  S.v.c.forEach((p,j)=>{const d=Math.min(dur(p),1.6),gap=1.1;for(let m=0;m<2;m++){const o=S.v.o[j*2+m],st=j*0.22+m*gap;const k=Math.floor((v-st)/(2*gap));run(o,p,v-k*2*gap,st,d,0.2)}})}};
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
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('ssa-v-nfsrdma')},
  ratio(){return L.W/L.H},
  step(){return step},
  sim(){return {step,v:S.v,n:S.items.length,t:(performance.now()-T0)/1000}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['v-nfsrdma']={steps:7,mount:mount};
})();
