/* NCP 参考设计：GPU 云的高性能存储怎么配：6 步动画（SVG，按时间写死的时间线，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-ncp'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-ncp.css，全部限定在 .ssa-v-ncp 容器之内。 */
(function(){
var EN={"扩容": "Expand", "VAST 的 NVIDIA NCP 高性能存储参考设计：NVL72 机柜、SN5600 / SN5610 叶交换机、CNode 与 DBox，按 GPU 规模配带宽，三个 VLAN，多租户网络隔离，NVIDIA 验证": "VAST's NVIDIA NCP high-performance storage reference design: NVL72 racks, SN5600 / SN5610 leaf switches, CNodes and DBoxes, bandwidth by GPU count, three VLANs, multi-tenant network isolation and NVIDIA validation", "GPU 机柜": "GPU racks", "NVL72": "NVL72", "SN5600 / SN5610 叶交换机": "SN5600 / SN5610 leaf switches", "CNode": "CNode", "DBox": "DBox", "新设备": "New node", "读带宽": "Read", "写带宽": "Write", "GPU 数": "GPUs", "读 ": "Read ", "写 ": "Write ", "写带宽是读带宽的一半": "Write is half of read", "6 台 CNode、4 台 DBox，占叶交换机 14 个 400GbE 端口": "6 CNodes and 4 DBoxes use 14 leaf-switch 400GbE ports", "6 台 CNode、4 台 DBox": "6 CNodes, 4 DBoxes", "CNode 占 6 个端口（12 条 200GbE），DBox 占 8 个（16 条 200GbE）": "CNodes use 6 ports (12 × 200GbE); DBoxes use 8 (16 × 200GbE)", "客户端访问、集群内部、发现与扩容各走一个 VLAN": "Client access, internal traffic, and discovery and expansion each use their own VLAN", "三类流量，三个 VLAN": "Three kinds of traffic, three VLANs", "VLAN 号均为参考设计中的默认值": "VLAN numbers are the reference design's defaults", "VLAN 号为默认值": "Default VLAN numbers", "VLAN 100 · 客户端访问 VIP": "VLAN 100 · client VIPs", "VLAN 69 · CNode 到 DBox": "VLAN 69 · CNode to DBox", "VLAN 10 · 发现与扩容": "VLAN 10 · discovery, expansion", "租户 A · GPU 主机": "Tenant A · GPU hosts", "租户 B · GPU 主机": "Tenant B · GPU hosts", "集群": "Cluster", "密钥 A · 配额 · QoS": "Key A · quota · QoS", "密钥 B · 配额 · QoS": "Key B · quota · QoS", "VIP 池（共享）": "Shared VIP pool", "按来源 IP 放行": "Gated by source IP", "VIP 池 A": "VIP pool A", "VIP 池 B": "VIP pool B", "VLAN / VRF": "VLAN / VRF", "换成共享 VIP 池": "Switch to a shared pool", "共享 VIP 池": "shared VIP pool", "切换对比，当前 ": "Switch comparison, now showing ", "共享 VIP 池：按来源 IP 区分租户，适合大规模": "Shared VIP pool: tenants told apart by source IP, suited to large scale", "共享 VIP 池，按来源 IP 区分": "Shared pool, by source IP", "示意，不代表实测数字": "Schematic, not measured", "VAST 存储经叶交换机接入 NVL72 系统": "The leaf fabric connects VAST storage to NVL72 systems.", "叶交换机连接 NVL72 与 VAST 存储": "Leaf fabric connects NVL72 to storage", "表列各档的写带宽为读带宽的一半": "At each listed scale, write bandwidth is half of read.", "VAST NCP HPS 参考设计 · 表 1 · 2026 年 6 月": "VAST NCP HPS reference design · Table 1 · June 2026", "VAST NCP 参考设计 · 表 1 · 2026 年 6 月": "VAST NCP design · Table 1 · June 2026", "400GbE 端口 · CNode 6 · DBox 8": "400GbE ports · CNodes 6 · DBoxes 8", "专用 VIP 池可配合 VRF 或 VLAN 隔离": "Dedicated VIP pools can use VRF or VLAN isolation.", "专用 VIP 池 · VRF / VLAN 隔离": "Dedicated VIP pools · VRF / VLAN", "专用 VIP 池": "dedicated VIP pools", "换成专用 VIP 池": "Switch to dedicated pools", "验证项目：部件失效": "Validation: component failure", "验证项目：在线扩容": "Validation: online expansion", "NVIDIA 基准套件 · VAST 5.4": "NVIDIA benchmarks · VAST 5.4"};
var ENM={"新设备": "Node", "SN5600 / SN5610 叶交换机": "SN5600 / SN5610 leaf", "VLAN 10 · 发现与扩容": "VLAN 10 · expansion", "按来源 IP 放行": "By source IP"};
var ARIA="VAST 的 NVIDIA NCP 高性能存储参考设计：NVL72 机柜、SN5600 / SN5610 叶交换机、CNode 与 DBox，按 GPU 规模配带宽，三个 VLAN，多租户网络隔离，NVIDIA 验证";
function lang(){return window.SS_LANG==='en'?'en':'zh'}
var NS='http://www.w3.org/2000/svg';
function mount(host,opts){
opts=opts||{};
host.classList.add('ssa-v-ncp');host.innerHTML='';
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
/* ---------- 场景 A（第 1、3、4、6 步）：上方 NVL72 机柜，中间一排 6 台 CNode，SN5600 / SN5610 叶交换机，下方 4 台 DBox。
   机柜的连线穿过 CNode 之间的空隙接到交换机。场景 B（第 2 步）：七档 GPU 规模的读写带宽柱。场景 C（第 5 步）：多租户两种网络隔离。 ---------- */
const BW=[[1152,180,90],[2304,360,180],[4608,720,360],[8064,1260,630],[16128,2520,1260],[29952,4680,2340],[41472,6480,3240]];
const SCENE={
 still:[2.4,9.6,2.6,3.0,2.6,7.6],
 toggles:[{step:4,param:'vip',values:['shared','tenant'],def:'shared',next:v=>v==='shared'?'tenant':'shared',
  label:v=>v==='shared'?'换成专用 VIP 池':'换成共享 VIP 池',name:v=>v==='shared'?'共享 VIP 池':'专用 VIP 池',aria:'切换对比，当前 ',pos:()=>L.C5.tgl}],
 layout(mobile){
  if(!mobile){
   return {W:960,H:396,mobile:false,f:{lbl:20,sm:17,cap:18},pw:22,ph:16,dr:7,sp:300,
    rowLbl:{x:16,y:52},rack:{w:96,y:30,h:46,gi:[0,1,2,3,4]},cn:{x0:170,w:84,st:108,y:110,h:42,lk:[28,56]},
    sw:{x:170,w:760,y:194,h:34},db:{x0:170,w:140,st:160,y:270,h:44,lk:[22,54,86,118]},nw:{x:810,w:120},
    cap:{x:480,y:358},note:{x:480,y:383},
    B5:{x0:180,st:114,bw:28,base:290,hmax:196,lab:314,leg:{x:180,y:36},ax:{x:150,y:314}},
    C5:{tA:{x:40,y:60},tB:{x:40,y:236},tw:200,th:56,pS:{x:390,y:148},pA:{x:390,y:60},pB:{x:390,y:236},pw:180,ph:56,
     cl:{x:660,y:24,w:280,h:290},fA:{x:690,y:66},fB:{x:690,y:206},fw:220,fh:70,tgl:{x:480,y:322}}};
  }
  return {W:480,H:470,mobile:true,f:{lbl:18,sm:18,cap:18},pw:18,ph:14,dr:6,sp:200,
   rowLbl:{x:32,y:14},rack:{w:120,y:28,h:44,gi:[0,2,4]},cn:{x0:23,w:64,st:74,y:110,h:40,lk:[20,44]},
   sw:{x:12,w:456,y:190,h:32},db:{x0:12,w:86,st:96,y:262,h:44,lk:[12,32,54,74]},nw:{x:398,w:70},
   cap:{x:240,y:432},note:{x:240,y:456},
   B5:{x0:46,st:64,bw:18,base:330,hmax:220,lab:352,leg:{x:24,y:30},ax:null},
   C5:{tA:{x:12,y:20},tB:{x:252,y:20},tw:216,th:52,pS:{x:150,y:130},pA:{x:12,y:130},pB:{x:252,y:130},pw:180,ph:56,
    cl:{x:12,y:236,w:456,h:136},fA:{x:24,y:270},fB:{x:264,y:270},fw:192,fh:62,tgl:{x:240,y:396}}};
 },
 build(){
  const f=L.f;
  /* ===== 场景 A ===== */
  const gA=grp('1 3 4 6');
  const cn=L.cn,db=L.db,sw=L.sw,swc=sw.y+sw.h/2;E.swc=swc;
  const gc=[];for(let i=0;i<5;i++)gc.push(cn.x0+i*cn.st+cn.w+(cn.st-cn.w)/2);E.gc=gc;
  tx(L.rowLbl.x,L.mobile?L.rowLbl.y:L.rack.y+L.rack.h/2,'GPU 机柜',f.lbl,'lbl b7','start',gA);
  const rack={x:gc[0]-L.rack.w/2,y:L.rack.y,w:gc[4]-gc[0]+L.rack.w,h:L.rack.h};
  E.rack=L.rack.gi.map(i=>{line(P(gc[i],rack.y+rack.h),P(gc[i],sw.y),'',gA);return {cx:gc[i],r:rack}});
  E.gpu=box(rack,gA,'box',8);
  tx(rack.x+rack.w/2,rack.y+rack.h/2,'NVL72',f.sm,'ink2-t st','middle',gA);
  /* 交换机 */
  E.sw=box(sw,gA,'box sw',8);E.swT=tx(sw.x+sw.w/2,swc,'SN5600 / SN5610 叶交换机',f.sm,'ink2-t st','middle',gA);
  /* CNode */
  const gLk=grp(null,gA);
  E.cn=[];for(let i=0;i<6;i++){const r={x:cn.x0+i*cn.st,y:cn.y,w:cn.w,h:cn.h};
   const lk=cn.lk.map(dx=>line(P(r.x+dx,r.y+r.h),P(r.x+dx,sw.y),'',gLk));
   const b=box(r,gA,'box',8);tx(r.x+r.w/2,r.y+r.h/2,'CNode',f.sm,'lbl b7','middle',gA);
   const x=el('g',{},gA);const a=r.h*0.36,cx=r.x+r.w/2,cy=r.y+r.h/2;line(P(cx-a,cy-a),P(cx+a,cy+a),'',x).setAttribute('class','xmark');line(P(cx-a,cy+a),P(cx+a,cy-a),'',x).setAttribute('class','xmark');x.style.opacity=0;
   E.cn.push({r,b,lk,x})}
  /* DBox */
  E.db=[];for(let j=0;j<4;j++){const r={x:db.x0+j*db.st,y:db.y,w:db.w,h:db.h};
   const lk=db.lk.map(dx=>line(P(r.x+dx,sw.y+sw.h),P(r.x+dx,r.y),'',gLk));
   const b=box(r,gA,'box soft',8);tx(r.x+r.w/2,r.y+r.h/2,'DBox',f.sm,'lbl b7','middle',gA);E.db.push({r,b,lk})}
  /* 新加入的设备位（第 4 步新设备，第 6 步新 DBox） */
  const nw={x:L.nw.x,y:db.y,w:L.nw.w,h:db.h};E.nw={r:nw,g:grp('4 6',gA)};
  E.nw.ln=line(P(nw.x+nw.w/2,sw.y+sw.h),P(nw.x+nw.w/2,nw.y),'',E.nw.g);E.nw.b=box(nw,E.nw.g,'box dash',8);E.nw.t=tx(nw.x+nw.w/2,nw.y+nw.h/2,'',f.sm,'ink2-t st','middle',E.nw.g);
  /* ===== 场景 B：七档 GPU 规模 ===== */
  const B5=L.B5,gB=grp('2');E.bars=[];
  line(P(B5.x0-24,B5.base),P(B5.x0+6*B5.st+30,B5.base),'thin',gB);
  [['读带宽','bar'],['写带宽','bar w']].forEach(([s,c],k)=>{const x=B5.leg.x+k*(L.mobile?110:130);el('rect',{x,y:B5.leg.y-8,width:16,height:16,rx:3,class:c},gB);tx(x+24,B5.leg.y,s,f.sm,'ink2-t st','start',gB)});
  if(B5.ax)tx(B5.ax.x,B5.ax.y,'GPU 数',f.sm,'ink3-t','end',gB);
  BW.forEach((r,k)=>{const cx=B5.x0+k*B5.st,hr=B5.hmax*r[1]/6480,hw=B5.hmax*r[2]/6480;
   const br=el('rect',{x:cx-B5.bw-2,y:B5.base-hr,width:B5.bw,height:hr,rx:3,class:'bar'},gB);
   const bw=el('rect',{x:cx+2,y:B5.base-hw,width:B5.bw,height:hw,rx:3,class:'bar w'},gB);
   const lb=tx(cx,B5.lab,r[0].toLocaleString('en-US'),f.sm,'ink2-t st','middle',gB);
   E.bars.push({cx,br,bw,lb,hr,hw,r})});
  E.v1=tx(0,0,'',f.sm,'st slate-t','middle',gB);E.v2=tx(0,0,'',f.sm,'st sage-t','middle',gB);
  if(L.mobile)tx(L.W/2,B5.lab+26,'GPU 数',f.sm-1,'ink3-t','middle',gB);
  /* ===== 场景 C：多租户 ===== */
  const Q=L.C5,gC=grp('5');E.Q={};
  const bx=(p,w,h,t1,t2,c,g)=>{const r={x:p.x,y:p.y,w,h};const b=box(r,g,'box '+(c||''),10);const a=tx(r.x+r.w/2,r.y+r.h/2-(t2?10:0),t1,f.sm,'lbl b7','middle',g);const s=t2?tx(r.x+r.w/2,r.y+r.h/2+12,t2,f.sm-1,'ink3-t','middle',g):null;return {r,b,a,s}};
  E.Q.tA=bx(Q.tA,Q.tw,Q.th,'租户 A · GPU 主机','','tA',gC);E.Q.tB=bx(Q.tB,Q.tw,Q.th,'租户 B · GPU 主机','','tB',gC);
  box(Q.cl,gC,'box soft',16);
  const ct=L.mobile?[Q.cl.x+14,Q.cl.y+Q.cl.h-16]:[Q.cl.x+16,Q.cl.y+24];tx(ct[0],ct[1],'集群',f.lbl,'lbl b7','start',gC);
  E.Q.fA=bx(Q.fA,Q.fw,Q.fh,'/tenant-a','密钥 A · 配额 · QoS','tA',gC);E.Q.fB=bx(Q.fB,Q.fw,Q.fh,'/tenant-b','密钥 B · 配额 · QoS','tB',gC);
  const gS=grp('5',gC),gT=grp('5',gC);E.Q.gS=gS;E.Q.gT=gT;
  E.Q.pS=bx(Q.pS,Q.pw,Q.ph,'VIP 池（共享）','按来源 IP 放行','',gS);
  E.Q.pA=bx(Q.pA,Q.pw,Q.ph,'VIP 池 A','VLAN / VRF','tA',gT);E.Q.pB=bx(Q.pB,Q.pw,Q.ph,'VIP 池 B','VLAN / VRF','tB',gT);
  const R=o=>o.r,cy=o=>o.r.y+o.r.h/2,cx=o=>o.r.x+o.r.w/2;
  if(!L.mobile){const mx1=(Q.tA.x+Q.tw+Q.pS.x)/2,mx2=(Q.pS.x+Q.pw+Q.fA.x)/2,pS=E.Q.pS;
   E.Q.sA=[P(Q.tA.x+Q.tw,cy(E.Q.tA)),P(mx1,cy(E.Q.tA)),P(mx1,cy(pS)-10),P(pS.r.x,cy(pS)-10),P(pS.r.x+pS.r.w,cy(pS)-10),P(mx2,cy(pS)-10),P(mx2,cy(E.Q.fA)),P(Q.fA.x,cy(E.Q.fA))];
   E.Q.sB=[P(Q.tB.x+Q.tw,cy(E.Q.tB)),P(mx1,cy(E.Q.tB)),P(mx1,cy(pS)+10),P(pS.r.x,cy(pS)+10),P(pS.r.x+pS.r.w,cy(pS)+10),P(mx2,cy(pS)+10),P(mx2,cy(E.Q.fB)),P(Q.fB.x,cy(E.Q.fB))];
   const pa=E.Q.pA,pb=E.Q.pB;
   E.Q.uA=[P(Q.tA.x+Q.tw,cy(E.Q.tA)),P(pa.r.x,cy(pa)),P(pa.r.x+pa.r.w,cy(pa)),P(mx2,cy(pa)),P(mx2,cy(E.Q.fA)),P(Q.fA.x,cy(E.Q.fA))];
   E.Q.uB=[P(Q.tB.x+Q.tw,cy(E.Q.tB)),P(pb.r.x,cy(pb)),P(pb.r.x+pb.r.w,cy(pb)),P(mx2,cy(pb)),P(mx2,cy(E.Q.fB)),P(Q.fB.x,cy(E.Q.fB))];
  }else{const my1=(Q.tA.y+Q.th+Q.pS.y)/2,my2=(Q.pS.y+Q.ph+Q.fA.y)/2+4,pS=E.Q.pS,ax=cx(E.Q.tA),bx_=cx(E.Q.tB),fa=cx(E.Q.fA),fb=cx(E.Q.fB);
   E.Q.sA=[P(ax,Q.tA.y+Q.th),P(ax,my1),P(cx(pS)-20,my1),P(cx(pS)-20,pS.r.y),P(cx(pS)-20,pS.r.y+pS.r.h),P(cx(pS)-20,my2),P(fa,my2),P(fa,Q.fA.y)];
   E.Q.sB=[P(bx_,Q.tB.y+Q.th),P(bx_,my1),P(cx(pS)+20,my1),P(cx(pS)+20,pS.r.y),P(cx(pS)+20,pS.r.y+pS.r.h),P(cx(pS)+20,my2),P(fb,my2),P(fb,Q.fB.y)];
   const pa=E.Q.pA,pb=E.Q.pB;
   E.Q.uA=[P(ax,Q.tA.y+Q.th),P(ax,pa.r.y),P(ax,pa.r.y+pa.r.h),P(ax,Q.fA.y)];E.Q.uB=[P(bx_,Q.tB.y+Q.th),P(bx_,pb.r.y),P(bx_,pb.r.y+pb.r.h),P(bx_,Q.fB.y)];
  }
  const seg=(pts,a,b,g)=>poly(pts.slice(a,b),'',g);
  seg(E.Q.sA,0,4,gS);seg(E.Q.sA,4,8,gS);seg(E.Q.sB,0,4,gS);seg(E.Q.sB,4,8,gS);
  if(!L.mobile){seg(E.Q.uA,0,2,gT);seg(E.Q.uA,2,6,gT);seg(E.Q.uB,0,2,gT);seg(E.Q.uB,2,6,gT)}else{seg(E.Q.uA,0,2,gT);seg(E.Q.uA,2,4,gT);seg(E.Q.uB,0,2,gT);seg(E.Q.uB,2,4,gT)}
  E.cap=tx(L.cap.x,L.cap.y,'',f.cap,'st','middle');
  E.note=tx(L.note.x,L.note.y,'',f.sm-(L.mobile?0:1),'ink3-t','middle');
 },
 reset(){
  svg.querySelectorAll('.box').forEach(d=>d.classList.remove('on','ok','dead','hot','vio'));
  svg.querySelectorAll('.ln').forEach(d=>d.classList.remove('lit','dead','ok','vio','ochre'));
  E.cn.forEach(o=>o.x.style.opacity=0);E.nw.g.style.opacity='';E.nw.t.textContent='';
  E.v1.textContent='';E.v2.textContent='';E.cap.textContent='';E.note.textContent='';setT(E.swT,'SN5600 / SN5610 叶交换机','ink2-t st');
 },
 modes:[]
};
function cap(s,c,sm){E.cap.textContent=T(L.mobile&&sm?sm:s);E.cap.setAttribute('class','st '+(c||'ink2-t'))}
function note(s,sm){E.note.textContent=T(L.mobile&&sm?sm:s)}
/* 路线：经交换机内部横向走 */
function viaSw(x1,y1,x2,y2,up1,up2){const sy=E.swc;return [P(x1,y1),P(x1,sy),P(x2,sy),P(x2,y2)]}
function gpuToCn(r,i,k){const R=E.rack[r],c=E.cn[i].r,x=c.x+L.cn.lk[k||0];return viaSw(R.cx,R.r.y+R.r.h,x,c.y+c.h)}
function cnToDb(i,j,k,m){const c=E.cn[i].r,d=E.db[j].r;return viaSw(c.x+L.cn.lk[k||1],c.y+c.h,d.x+L.db.lk[m||0],d.y)}
/* 第 1 步：三层：GPU、存储网络、高性能存储 */
SCENE.modes[0]={enter(){S.v.b=[0,1,2].map(()=>pk());cap('VAST 存储经叶交换机接入 NVL72 系统','slate-t','叶交换机连接 NVL72 与 VAST 存储')},
 frame(t){const per=3.2,u=t%per,lit=Math.floor(t/1.1)%3;
  E.gpu.classList.toggle('on',lit===0);E.sw.classList.toggle('on',lit===1);E.cn.forEach(o=>o.b.classList.toggle('on',lit===2));E.db.forEach(o=>o.b.classList.toggle('on',lit===2));
  S.v.b.forEach((o,j)=>{const r=rev(gpuToCn(j%E.rack.length,[1,3,5][j],0));run(o,r,(u+j*per/3)%per,0,Math.min(dur(r),2.2),0.3)})}};
/* 第 2 步：七档 GPU 规模的读写带宽 */
SCENE.modes[1]={enter(){cap('表列各档的写带宽为读带宽的一半','slate-t','写带宽是读带宽的一半');note('VAST NCP HPS 参考设计 · 表 1 · 2026 年 6 月','VAST NCP 参考设计 · 表 1 · 2026 年 6 月')},
 frame(t){const k=Math.min(6,Math.floor(t/1.3)),B5=L.B5;
  E.bars.forEach((o,i)=>{const s=i===k?1:(i<k?0.55:0.15);o.br.style.opacity=s;o.bw.style.opacity=s;o.lb.setAttribute('class','st '+(i===k?'ink-t':'ink3-t'))});
  const o=E.bars[k],x=clamp(o.cx,L.mobile?86:110,L.W-(L.mobile?86:110));
  const y1=B5.base-o.hr-(L.mobile?40:44);E.v1.setAttribute('x',x);E.v1.setAttribute('y',y1);E.v2.setAttribute('x',x);E.v2.setAttribute('y',y1+20);
  E.v1.textContent=T('读 ')+o.r[1].toLocaleString('en-US')+' GB/s';E.v2.textContent=T('写 ')+o.r[2].toLocaleString('en-US')+' GB/s'}};
/* 第 3 步：1,152 GPU 一档：6 台 CNode、4 台 DBox */
SCENE.modes[2]={enter(){S.v.a=[0,1,2,3].map(()=>pk());S.v.b=[0,1,2,3].map(()=>pk('vio'));
  cap('6 台 CNode、4 台 DBox，占叶交换机 14 个 400GbE 端口','slate-t','6 台 CNode、4 台 DBox');note('CNode 占 6 个端口（12 条 200GbE），DBox 占 8 个（16 条 200GbE）','400GbE 端口 · CNode 6 · DBox 8')},
 frame(t){const per=3.6;E.cn.forEach(o=>o.lk.forEach(l=>l.classList.add('lit')));E.db.forEach(o=>o.lk.forEach(l=>l.classList.add('lit')));
  S.v.a.forEach((o,j)=>{const r=gpuToCn(j%E.rack.length,[0,2,3,5][j],0);run(o,r,(t+j*0.9)%per,0,Math.min(dur(r),2.0),0.25)});
  S.v.b.forEach((o,j)=>{const r=cnToDb([1,2,4,5][j],j,1,j%4);run(o,r,(t+0.45+j*0.9)%per,0,Math.min(dur(r),2.0),0.25)})}};
/* 第 4 步：一张网，三个 VLAN：交换机上依次标出当前这类流量走的 VLAN */
SCENE.modes[3]={enter(){S.v.a=pk();S.v.b=pk('vio');S.v.n=pk('ochre');E.nw.t.textContent=T('新设备');
  cap('客户端访问、集群内部、发现与扩容各走一个 VLAN','slate-t','三类流量，三个 VLAN');note('VLAN 号均为参考设计中的默认值','VLAN 号为默认值')},
 frame(t){const per=4.2,u=t%per,k=Math.floor(u/1.4),uu=u-k*1.4;
  const ra=gpuToCn(1,2,0),rb=cnToDb(2,1,1,1),rn=[P(E.nw.r.x+E.nw.r.w/2,E.nw.r.y),P(E.nw.r.x+E.nw.r.w/2,E.swc)];
  run(S.v.a,ra,k===0?uu:-1,0.05,1.1,0.2);run(S.v.b,rb,k===1?uu:-1,0.05,1.1,0.2);run(S.v.n,rn,k===2?uu:-1,0.05,0.8,0.3);
  E.nw.b.classList.toggle('on',k===2);
  setT(E.swT,['VLAN 100 · 客户端访问 VIP','VLAN 69 · CNode 到 DBox','VLAN 10 · 发现与扩容'][k],'st '+['slate-t','violet-t','ochre-t'][k])}};
/* 第 5 步：多租户 */
SCENE.modes[4]={enter(){const sh=SCENE.toggles[0].state==='shared';S.v.sh=sh;E.Q.gS.classList.toggle('hid',!sh);E.Q.gT.classList.toggle('hid',sh);
  S.v.a=pk();S.v.b=pk('ochre');
  cap(sh?'共享 VIP 池：按来源 IP 区分租户，适合大规模':'专用 VIP 池可配合 VRF 或 VLAN 隔离','slate-t',sh?'共享 VIP 池，按来源 IP 区分':'专用 VIP 池 · VRF / VLAN 隔离')},
 frame(t){const per=3.2,u=t%per,rA=S.v.sh?E.Q.sA:E.Q.uA,rB=S.v.sh?E.Q.sB:E.Q.uB;
  const pa=run(S.v.a,rA,u,0.1,Math.min(dur(rA),2.2),0.25),pb=run(S.v.b,rB,(t+1.6)%per,0,Math.min(dur(rB),2.2),0.25);
  E.Q.fA.b.classList.toggle('on',pa>1);E.Q.fB.b.classList.toggle('on',pb>1)}};
/* 第 6 步：NVIDIA 验证：在线扩容、故障按比例影响 */
SCENE.modes[5]={enter(){S.v.a=[0,1,2,3].map(()=>pk());note('示意，不代表实测数字')},
 frame(t){const per=11,u=t%per;
  const add=u>2.4,fail=u>6.2;E.nw.g.style.opacity=fade(u,2.4,3.0);E.nw.t.textContent=T('扩容');E.nw.b.classList.toggle('ok',add&&u<5.4);
  E.cn[3].x.style.opacity=fade(u,6.2,6.5);E.cn[3].b.classList.toggle('dead',fail);E.cn[3].lk.forEach(l=>l.classList.toggle('dead',fail));
  const cnUse=[0,2,3,5];S.v.a.forEach((o,j)=>{const i=cnUse[j];if(fail&&i===3){put(o,-99,-99,0);return}const r=gpuToCn(j%E.rack.length,i,0);run(o,r,(t+j*0.8)%3.2,0,Math.min(dur(r),2.0),0.25)});
  cap(fail?'验证项目：部件失效':add?'验证项目：在线扩容':'NVIDIA 基准套件 · VAST 5.4',fail?'ochre-t':'slate-t')}};

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
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('ssa-v-ncp')},
  ratio(){return L.W/L.H},
  step(){return step},
  sim(){return {step,v:S.v,n:S.items.length,t:(performance.now()-T0)/1000}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['v-ncp']={steps:6,mount:mount};
})();
