/* 机柜与布线：一套系统在机柜里怎么摆、四张网怎么连：6 步动画（SVG，按时间写死的时间线，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-rack'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成窄版排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-rack.css，全部限定在 .ssa-v-rack 容器之内。 */
(function(){
var EN={"交换机 1":"Switch 1","交换机 2":"Switch 2","CBox":"CBox","CNode":"CNode","DBox":"DBox","U1":"U1","CNode 1":"CNode 1","CNode 2":"CNode 2","DBox 1":"DBox 1","DBox 2":"DBox 2",
"柜顶：一对交换机":"Top of rack: a switch pair","示例 CBox：2U · 4 个 CNode":"Example CBox: 2U · 4 CNodes","DBox：全闪存储箱":"DBox: all-flash enclosure","U1：最下面的位置":"U1: the lowest position",
"装机时每台设备登记机柜和 U 位":"At install, each box is assigned a rack and unit","示意，不代表实际 U 位和台数":"Schematic; not real positions or counts",
"客户网络":"Customer network","另一套客户网络":"Another client network","MLAG":"MLAG","管理网络":"Management network","IPMI 网络":"IPMI network",
"后端：CNode 与 DNode 之间的 NVMe 网络":"Back end: NVMe fabric, CNodes to DNodes","前端：客户端到 CNode":"Front end: clients to CNodes","管理网络：管理界面、DNS、认证":"Management: console, DNS, authentication","IPMI 网络：管硬件":"IPMI: hardware management",
"每台设备两条线，分别接两台交换机":"Each box has two links, one to each switch","交换机 1 离线：后端经交换机 2":"Switch 1 offline: back end via switch 2",
"CNode 链路承载两个 VLAN":"Two VLANs on a CNode link","内部网默认用 VLAN 69 与数据网隔开":"The internal network uses VLAN 69 by default to stay apart from the data network",
"CNode 加一张网卡，直连另一套网络":"Second NIC: a CNode joins another network","其余客户端仍经交换机":"Other clients still come in through the switches",
"脊 1":"Spine 1","脊 2":"Spine 2","叶 1":"Leaf 1","叶 2":"Leaf 2","机柜 1":"Rack 1","机柜 2":"Rack 2","机柜 3":"Rack 3",
"图示 3 柜；5.5 保护要求至少 7 个 DBox 机柜故障域":"3 shown · 5.5 requires ≥7 DBox rack domains",
"VAST 集群的机柜摆放与四张网络：后端 NVMe 网络、前端客户端网络、管理网络和 IPMI 网络":"How a VAST cluster sits in racks and connects four networks: back-end NVMe fabric, front-end client network, management and IPMI"};
var ENM={"后端：CNode 与 DNode 之间的 NVMe 网络":"Back end: NVMe fabric","前端：客户端到 CNode":"Front end: clients","管理网络：管理界面、DNS、认证":"Management network","IPMI 网络：管硬件":"IPMI: hardware","每台设备两条线，分别接两台交换机":"Two links per box, two switches","交换机 1 离线：后端经交换机 2":"Switch 1 offline: back end via switch 2","CNode 链路承载两个 VLAN":"Two VLANs on a CNode link","内部网默认用 VLAN 69 与数据网隔开":"Internal network: VLAN 69 by default","CNode 加一张网卡，直连另一套网络":"Second NIC: direct to another net","其余客户端仍经交换机":"Others still via the switches","图示 3 柜；5.5 保护要求至少 7 个 DBox 机柜故障域":"3 shown · 5.5 requires ≥7 DBox rack domains","装机时每台设备登记机柜和 U 位":"Each box gets a rack and unit","另一套客户网络":"Other network","客户网络":"Customer","示意，不代表实际 U 位和台数":"Schematic positions and counts","交换机 1":"Switch 1","交换机 2":"Switch 2"};
var ARIA="VAST 集群的机柜摆放与四张网络：后端 NVMe 网络、前端客户端网络、管理网络和 IPMI 网络";
function lang(){return window.SS_LANG==='en'?'en':'zh'}
var NS='http://www.w3.org/2000/svg';
function mount(host,opts){
opts=opts||{};
host.classList.add('ssa-v-rack');host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','ssa-scene');svg.setAttribute('role','img');host.appendChild(svg);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mq=matchMedia('(max-width: 640px)');
function T(s){if(lang()!=='en')return s;if(L&&L.mobile&&ENM[s]!==undefined)return ENM[s];return EN[s]!==undefined?EN[s]:s}
function el(tag,a,p){const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);(p||svg).appendChild(e);return e}
function tx(x,y,s,size,cls,anchor,p){const t=el('text',{x,y,'font-size':size,class:cls||''},p);if(anchor)t.setAttribute('text-anchor',anchor);t.textContent=T(s);return t}
function grp(show,p){const g=el('g',{class:'vis'},p);if(show)g.dataset.show=show;return g}
function box(r,p,cls,rx){return el('rect',{x:r.x,y:r.y,width:r.w,height:r.h,rx:rx==null?8:rx,class:cls||'box'},p)}
function poly(pts,cls,p){return el('path',{d:'M'+pts.map(q=>q.x+' '+q.y).join(' L'),class:'ln '+(cls||'')},p)}
const C=r=>({x:r.x+r.w/2,y:r.y+r.h/2});
const P=(x,y)=>({x,y});
const R=(x,y,w,h)=>({x,y,w,h});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function plen(pts){let s=0;for(let i=1;i<pts.length;i++)s+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);return s}
function at(pts,u){u=clamp(u,0,1);let d=u*plen(pts);for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],l=Math.hypot(b.x-a.x,b.y-a.y);if(d<=l||i===pts.length-1){const k=l?Math.min(1,d/l):0;return {x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k}}d-=l}return pts[pts.length-1]}
function rev(pts){return pts.slice().reverse()}
function cat(...ps){const o=[];ps.forEach(p=>p.forEach(q=>{const l=o[o.length-1];if(!l||l.x!==q.x||l.y!==q.y)o.push(q)}));return o}
let L=null,E,S,step=0,T0=0,raf=0,paused=!!opts.paused,dead=false,pausedAt=0;
function pk(cls){const r=el('rect',{x:-L.pw/2,y:-L.ph/2,width:L.pw,height:L.ph,rx:4,class:'pkt '+(cls||'')},E.pk);const o={el:r};S.items.push(o);put(o,-99,-99,0);return o}
function dot(cls){const r=el('circle',{r:L.dr,cx:0,cy:0,class:'dot '+(cls||'')},E.pk);const o={el:r};S.items.push(o);put(o,-99,-99,0);return o}
function put(o,x,y,a){if(typeof x==='object'){a=y;y=x.y;x=x.x}o.el.setAttribute('transform',`translate(${x.toFixed(1)} ${y.toFixed(1)})`);o.el.style.opacity=a==null?1:a}
function run(o,pts,t,t0,dur,fo){fo=fo==null?0.3:fo;if(t<t0||t>t0+dur+fo){put(o,-99,-99,0);return -1}const u=(t-t0)/dur;if(u<=1){put(o,at(pts,u),1);return u}put(o,pts[pts.length-1],1-(t-t0-dur)/fo);return 1.5}
const dur=pts=>plen(pts)/L.sp;
/* ---------- 版式 ---------- */
function layout(mobile){
  if(!mobile){
    const rk=R(330,28,300,412);
    return {W:960,H:504,mobile:false,f:{lbl:20,sm:17,cap:18},pw:18,ph:14,dr:7,sp:280,cap:{x:480,y:455},bot:{x:480,y:484},
      A:{rack:rk,sw:[R(345,44,270,26),R(345,74,270,26)],cb:[R(345,116,270,54),R(345,176,270,54)],db:[R(345,250,270,44),R(345,302,270,44),R(345,354,270,44)],u1:{x:318,y:424},
        call:[{y:72,s:'柜顶：一对交换机'},{y:173,s:'示例 CBox：2U · 4 个 CNode'},{y:324,s:'DBox：全闪存储箱'}],callX:650},
      B:{cust:R(315,16,200,40),extra:R(20,16,180,40),sw:[R(215,110,170,40),R(445,110,170,40)],upY:84,dev:[R(70,290,130,50),R(230,290,130,50),R(470,290,130,50),R(630,290,130,50)],
        port:30,att:[230,40,460],mg:384,ip:410,busX:[100,736],busLbl:780,extraX:40,legend:null},
      C:{cust:R(380,14,200,38),sp:[R(300,90,140,36),R(520,90,140,36)],racks:[60,350,640].map(x=>R(x,180,260,270)),leafY:212,leafH:28,leafW:110,leafDx:[15,135],
        dev:[{dy:92,h:40,s:'CNode'},{dy:150,h:40,s:'DBox'},{dy:200,h:40,s:'DBox'}],devDx:[34,226],rail:[18,242],lblDy:256,custY:70}};
  }
  const rk=R(100,16,280,404);
  return {W:480,H:470,mobile:true,f:{lbl:17,sm:17,cap:17},pw:16,ph:12,dr:6,sp:200,cap:{x:240,y:420},bot:{x:240,y:451},
    A:{rack:rk,sw:[R(112,34,256,24),R(112,62,256,24)],cb:[R(112,100,256,50),R(112,156,256,50)],db:[R(112,226,256,42),R(112,276,256,42),R(112,326,256,42)],u1:{x:92,y:404},call:null},
    B:{cust:R(170,12,140,36),extra:R(8,12,140,36),sw:[R(70,96,150,36),R(260,96,150,36)],upY:70,dev:[R(26,250,100,46),R(138,250,100,46),R(250,250,100,46),R(362,250,100,46)],
      port:22,att:[90,26,280],mg:330,ip:352,busX:[56,436],busLbl:null,extraX:14,legend:{y:386}},
    C:{cust:R(170,12,140,34),sp:[R(110,78,120,32),R(250,78,120,32)],racks:[8,166,324].map(x=>R(x,150,148,282)),leafY:166,leafH:26,leafW:62,leafDx:[8,78],
      dev:[{dy:72,h:34,s:'CNode'},{dy:122,h:34,s:'DBox'},{dy:172,h:34,s:'DBox'}],devDx:[22,126],rail:[12,136],lblDy:266,custY:62}};
}
/* ---------- 画面 ---------- */
function build(){
  L=layout(mq.matches);svg.innerHTML='';E={};svg.setAttribute('viewBox',`0 0 ${L.W} ${L.H}`);
  const f=L.f;
  /* 场景一：机柜正视图 */
  const A=L.A,gA=grp('1');E.A={};
  box(A.rack,gA,'box rack',6);
  E.A.sw=A.sw.map((r,i)=>{const b=box(r,gA,'box',4);tx(C(r).x,C(r).y,'交换机 '+(i+1),f.sm,'lbl','middle',gA);return b});
  E.A.cb=A.cb.map(r=>{const g=el('g',{},gA),b=box(r,g,'box',6),n=4,pad=6,w=(r.w-pad*(n+1))/n;
    for(let k=0;k<n;k++){const c=R(r.x+pad+k*(w+pad),r.y+pad,w,r.h-2*pad);box(c,g,'box cell',4);tx(C(c).x,C(c).y,'CNode',f.sm,'lbl','middle',g)}return b});
  E.A.db=A.db.map(r=>{const b=box(r,gA,'box',6);tx(C(r).x,C(r).y,'DBox',f.lbl,'lbl b7','middle',gA);return b});
  tx(A.u1.x,A.u1.y,'U1',f.sm,'ink3-t','end',gA);
  E.A.call=[];if(!A.call)tx(240,A.cb[1].y+A.cb[1].h+12,'示例 CBox：2U · 4 个 CNode',f.sm,'st slate-t','middle',grp('1',gA));
  if(A.call)A.call.forEach(c=>{const g=el('g',{class:'call'},gA);poly([P(A.rack.x+A.rack.w,c.y),P(A.callX-8,c.y)],'thin',g);tx(A.callX,c.y,c.s,f.sm,'st slate-t','start',g);E.A.call.push(g)});
  /* 场景二：一组设备的四张网 */
  const B=L.B,gB=grp('2 3 4 5');E.B={};
  const dc=B.dev.map(C);
  E.B.mg=poly([P(B.busX[0],B.mg),P(B.busX[1],B.mg)],'thin',gB);E.B.ip=poly([P(B.busX[0],B.ip),P(B.busX[1],B.ip)],'thin',gB);
  E.B.mgD=B.dev.map((r,i)=>poly([P(dc[i].x-r.w/4,r.y+r.h),P(dc[i].x-r.w/4,B.mg)],'thin',gB));
  E.B.ipD=B.dev.map((r,i)=>poly([P(dc[i].x+r.w/4,r.y+r.h),P(dc[i].x+r.w/4,B.ip)],'thin',gB));
  if(B.busLbl){tx(B.busLbl,B.mg,'管理网络',f.sm,'ink2-t','start',gB);tx(B.busLbl,B.ip,'IPMI 网络',f.sm,'ink2-t','start',gB);E.B.mgEnd=P(B.busX[1],B.mg);E.B.ipEnd=P(B.busX[1],B.ip)}
  else{const y=B.legend.y;[['管理网络','mgl',40],['IPMI 网络','ipl',250]].forEach(([s,c,x])=>{poly([P(x,y),P(x+30,y)],'thin '+c,gB);tx(x+40,y,s,f.sm,'ink2-t','start',gB)});E.B.mgEnd=P(B.busX[1],B.mg);E.B.ipEnd=P(B.busX[1],B.ip)}
  /* 交换机、上联与客户网络 */
  const swc=B.sw.map(C);
  E.B.up=B.sw.map((r,i)=>{const cx=C(r).x,ex=i?B.cust.x+B.cust.w-30:B.cust.x+30;return poly([P(cx,r.y),P(cx,B.upY),P(ex,B.upY),P(ex,B.cust.y+B.cust.h)],'',gB)});
  E.B.ipl=[-4,4].map(dy=>poly([P(B.sw[0].x+B.sw[0].w,swc[0].y+dy),P(B.sw[1].x,swc[1].y+dy)],'thin',gB));
  tx((B.sw[0].x+B.sw[0].w+B.sw[1].x)/2,B.sw[0].y-14,'MLAG',f.sm,'ink3-t','middle',gB);
  /* 设备到交换机的连线：左口接交换机 1，右口接交换机 2 */
  E.B.lk=B.dev.map((r,d)=>[0,1].map(s=>{const px=dc[d].x+(s?B.port:-B.port),ax=B.att[s?2:0]+d*B.att[1];return poly([P(px,r.y),P(ax,B.sw[s].y+B.sw[s].h)],'',gB)}));
  E.B.cust=box(B.cust,gB,'box',10);tx(C(B.cust).x,C(B.cust).y,'客户网络',f.sm,'lbl','middle',gB);
  E.B.sw=B.sw.map((r,i)=>{const b=box(r,gB,'box',6);tx(C(r).x,C(r).y,'交换机 '+(i+1),f.sm,'lbl b7','middle',gB);return b});
  /* 另一套客户网络（第 5 步） */
  const gX=grp('5',gB),ex=B.extra,c1=B.dev[0];E.B.exL=poly([P(B.extraX,ex.y+ex.h),P(B.extraX,C(c1).y),P(c1.x,C(c1).y)],'',gX);
  box(ex,gX,'box',10);tx(C(ex).x,C(ex).y,'另一套客户网络',f.sm,'lbl','middle',gX);
  E.B.dev=B.dev.map((r,d)=>{const b=box(r,gB,'box',8);tx(C(r).x,C(r).y,['CNode 1','CNode 2','DBox 1','DBox 2'][d],f.lbl,'lbl b7','middle',gB);return b});
  const xm=(c,a,p)=>{const g2=el('g',{class:'xm'},p);poly([P(c.x-a,c.y-a),P(c.x+a,c.y+a)],'xmark',g2);poly([P(c.x-a,c.y+a),P(c.x+a,c.y-a)],'xmark',g2);return g2};
  E.B.x1=xm(P(B.sw[0].x+14,swc[0].y),7,gB);
  /* 场景三：多个机柜，叶脊网络 */
  const Cc=L.C,gC=grp('6');E.C={leaf:[],dev:[],up:[]};
  E.C.cust=box(Cc.cust,gC,'box',10);tx(C(Cc.cust).x,C(Cc.cust).y,'客户网络',f.sm,'lbl','middle',gC);
  E.C.cu=Cc.sp.map((r,i)=>{const sx=C(r).x,cx=i?Cc.cust.x+Cc.cust.w-24:Cc.cust.x+24;return poly([P(cx,Cc.cust.y+Cc.cust.h),P(cx,Cc.custY),P(sx,Cc.custY),P(sx,r.y)],'',gC)});
  Cc.racks.forEach((rk,ri)=>{box(rk,gC,'box rack',8);tx(rk.x+12,rk.y+Cc.lblDy,'机柜 '+(ri+1),f.sm,'ttl','start',gC);
    const lv=Cc.leafDx.map((dx,li)=>R(rk.x+dx,Cc.leafY,Cc.leafW,Cc.leafH));
    lv.forEach((lr,li)=>Cc.sp.forEach((sr,si)=>{E.C.up.push({ri,li,si,l:poly([P(C(lr).x,lr.y),P(C(sr).x+(li?18:-18)*(L.mobile?0.6:1),sr.y+sr.h)],'thin',gC)})}));
    const devs=Cc.dev.map((d,di)=>{const r=R(rk.x+Cc.devDx[0],rk.y+d.dy,Cc.devDx[1]-Cc.devDx[0],d.h);
      [0,1].forEach(s=>{const rx=rk.x+Cc.rail[s];poly([P(s?r.x+r.w:r.x,C(r).y),P(rx,C(r).y),P(rx,lv[s].y+lv[s].h)],'thin',gC)});return r});
    lv.forEach((lr,li)=>{box(lr,gC,'box',5);tx(C(lr).x,C(lr).y,'叶 '+(li+1),f.sm,'lbl','middle',gC)});
    devs.forEach((r,di)=>{box(r,gC,'box',6);tx(C(r).x,C(r).y,Cc.dev[di].s,f.sm,'lbl b7','middle',gC)});
    E.C.leaf.push(lv);E.C.dev.push(devs)});
  E.C.sp=Cc.sp.map((r,i)=>{const b=box(r,gC,'box',6);tx(C(r).x,C(r).y,'脊 '+(i+1),f.sm,'lbl b7','middle',gC);return b});
  E.cap=tx(L.cap.x,L.cap.y,'',f.cap,'st','middle');
  E.bot=tx(L.bot.x,L.bot.y,'',f.sm,'ink2-t','middle');
  E.pk=el('g',{});
  svg.setAttribute('aria-label',T(ARIA));
  if(opts.onLayout)opts.onLayout(L.W/L.H,L.mobile);
}
function cap(s,c){E.cap.textContent=T(s);E.cap.setAttribute('class','st '+(c||''))}
function bot(s,c){E.bot.textContent=T(s);E.bot.setAttribute('class','st '+(c||'ink2-t'))}
function reset(){
  svg.querySelectorAll('.ln').forEach(l=>l.classList.remove('lit','dead','sg','mg','ip'));
  svg.querySelectorAll('.box').forEach(d=>d.classList.remove('on','ok','dead','hot','sg'));
  E.A.call.forEach(c=>c.style.opacity=0);E.B.x1.style.opacity=0;cap('');bot('');
}
/* 场景二的路径 */
function swAt(d,s){const B=L.B;return P(B.att[s?2:0]+d*B.att[1],B.sw[s].y+B.sw[s].h)}
function portAt(d,s){const B=L.B,c=C(B.dev[d]);return P(c.x+(s?B.port:-B.port),B.dev[d].y)}
/* 设备 a 经交换机 s 到设备 b */
function d2d(a,b,s){const ca=C(L.B.dev[a]),cb=C(L.B.dev[b]);return [ca,portAt(a,s),swAt(a,s),swAt(b,s),portAt(b,s),cb]}
/* 客户网络经交换机 s 到设备 d */
function c2d(s,d){const B=L.B,r=B.sw[s],cx=C(r).x,ex=s?B.cust.x+B.cust.w-30:B.cust.x+30;return [P(ex,B.cust.y+B.cust.h),P(ex,B.upY),P(cx,B.upY),P(cx,r.y),swAt(d,s),portAt(d,s),C(B.dev[d])]}
function lit(cls,on,list){list.forEach(l=>l.classList.toggle(cls,on))}
const M=[];
/* 1：机柜正视图 */
M[0]={enter(){cap('装机时每台设备登记机柜和 U 位','slate-t');bot('示意，不代表实际 U 位和台数','ink3-t')},
 frame(t){const ph=Math.floor((t%7.5)/2.5),A=E.A;
  A.sw.forEach(b=>b.classList.toggle('on',ph===0));A.cb.forEach(b=>b.classList.toggle('on',ph===1));A.db.forEach(b=>b.classList.toggle('on',ph===2));
  A.call.forEach((c,i)=>c.style.opacity=i<=ph||t>=7.5?1:0)}};
/* 2：四张网轮流亮 */
const ALLK=()=>E.B.lk.flat();
M[1]={enter(){S.v.p=pk();S.v.q=pk('sg');S.v.m=dot('mg');S.v.i=dot('ip')},
 frame(t){const per=10.4,u=t%per,ph=Math.floor(u/2.6),tt=u-ph*2.6,B=E.B;
  lit('lit',ph===0,ALLK());B.sw.forEach(b=>b.classList.toggle('on',ph===0));
  lit('sg',ph===1,B.up);B.cust.classList.toggle('sg',ph===1);lit('sg',ph===1,[B.lk[1][1]]);
  lit('mg',ph===2,[B.mg,...B.mgD]);lit('ip',ph===3,[B.ip,...B.ipD]);
  const r0=d2d(0,3,0);run(S.v.p,r0,ph===0?tt:-1,0.1,Math.min(dur(r0),2.1),0.25);
  const r1=c2d(1,1);run(S.v.q,r1,ph===1?tt:-1,0.1,Math.min(dur(r1),2.1),0.25);
  const L0=L.B,r2=[E.B.mgEnd,P(C(L0.dev[0]).x-L0.dev[0].w/4,L0.mg),P(C(L0.dev[0]).x-L0.dev[0].w/4,L0.dev[0].y+L0.dev[0].h)];run(S.v.m,r2,ph===2?tt:-1,0.1,Math.min(dur(r2),2),0.25);
  const r3=[E.B.ipEnd,P(C(L0.dev[2]).x+L0.dev[2].w/4,L0.ip),P(C(L0.dev[2]).x+L0.dev[2].w/4,L0.dev[2].y+L0.dev[2].h)];run(S.v.i,r3,ph===3?tt:-1,0.1,Math.min(dur(r3),2),0.25);
  cap(['后端：CNode 与 DNode 之间的 NVMe 网络','前端：客户端到 CNode','管理网络：管理界面、DNS、认证','IPMI 网络：管硬件'][ph],['slate-t','sage-t','ochre-t','violet-t'][ph])}};
/* 3：两台交换机，坏一台照常 */
const T3=[[0,2],[1,3],[0,3],[1,2]];
M[2]={enter(){S.v.p=[pk(),pk()]},
 frame(t){const u=t%9,down=u>4;E.B.x1.style.opacity=down?1:0;E.B.sw[0].classList.toggle('hot',down);
  E.B.lk.forEach(pair=>{pair[0].classList.toggle('dead',down);pair[1].classList.add('lit');pair[0].classList.toggle('lit',!down)});lit('dead',down,E.B.ipl);
  const k=Math.floor(u/2),tt=u-k*2;for(let s=0;s<2;s++){const [a,b]=T3[(k+s)%4],sw=down?1:s,r=d2d(a,b,sw);run(S.v.p[s],r,tt,0.05+s*0.2,Math.min(dur(r),1.6),0.15)}
  cap(down?'交换机 1 离线：后端经交换机 2':'每台设备两条线，分别接两台交换机',down?'rose-t':'slate-t')}};
/* 4：Connect via Switch：同一根线上的前端与后端 */
M[3]={enter(){cap('CNode 链路承载两个 VLAN','slate-t');bot('内部网默认用 VLAN 69 与数据网隔开');S.v.f=[pk('sg'),pk('sg')];S.v.b=[pk(),pk()];
  lit('lit',true,ALLK());lit('sg',true,E.B.up);E.B.cust.classList.add('sg')},
 frame(t){const per=4.4,u=t%per;
  [[0,0],[1,1]].forEach(([s,d],i)=>{const r=c2d(s,d);run(S.v.f[i],r,u,0.1+i*1.1,Math.min(dur(r),2.2),0.2)});
  [[0,2,0],[1,3,1]].forEach(([a,b,s],i)=>{const r=d2d(a,b,s);run(S.v.b[i],r,u,0.7+i*1.1,Math.min(dur(r),2.2),0.2)})}};
/* 5：Connect via CNode */
M[4]={enter(){cap('CNode 加一张网卡，直连另一套网络','sage-t');bot('其余客户端仍经交换机');S.v.x=[pk('sg'),pk('sg')];S.v.f=pk('sg');lit('sg',true,[E.B.exL,...E.B.up]);E.B.cust.classList.add('sg')},
 frame(t){const per=4.2,u=t%per,B=L.B,ex=B.extra,c1=B.dev[0];const rx=[P(B.extraX,ex.y+ex.h),P(B.extraX,C(c1).y),P(c1.x,C(c1).y),C(c1)];
  S.v.x.forEach((o,i)=>run(o,rx,u,0.1+i*1.6,Math.min(dur(rx),1.8),0.2));
  const r=c2d(1,1);run(S.v.f,r,u,0.6,Math.min(dur(r),2.2),0.2);lit('sg',true,[E.B.lk[1][1]])}};
/* 6：叶脊 */
M[5]={enter(){bot('图示 3 柜；5.5 保护要求至少 7 个 DBox 机柜故障域');S.v.p=pk();S.v.q=pk('sg')},
 frame(t){const u=t%5,Cc=L.C;
  /* 机柜 1 的 CNode 经叶 1、脊 1、机柜 3 的叶 1 到机柜 3 的第二台 DBox */
  const a=E.C.dev[0][0],b=E.C.dev[2][2],la=E.C.leaf[0][0],lb=E.C.leaf[2][0],sp=Cc.sp[0],rx0=Cc.racks[0].x+Cc.rail[0],rx2=Cc.racks[2].x+Cc.rail[0];
  const sx=C(sp).x-18*(L.mobile?0.6:1);
  /* 叶的中心到上下口：用叶框内部连接 */
  const rr=[C(a),P(a.x,C(a).y),P(rx0,C(a).y),P(rx0,la.y+la.h),C(la),P(C(la).x,la.y),P(sx,sp.y+sp.h),P(C(lb).x,lb.y),C(lb),P(rx2,lb.y+lb.h),P(rx2,C(b).y),P(b.x,C(b).y),C(b)];
  run(S.v.p,rr,u,0.2,Math.min(dur(rr),3.6),0.3);
  E.C.up.forEach(o=>o.l.classList.toggle('lit',(o.ri===0||o.ri===2)&&o.li===0&&o.si===0));
  /* 客户端经脊 2 到机柜 2 的 CNode */
  const cs=Cc.sp[1],l2=E.C.leaf[1][1],c2=E.C.dev[1][0],rx1=Cc.racks[1].x+Cc.rail[1],cx=Cc.cust.x+Cc.cust.w-24,sx2=C(cs).x+18*(L.mobile?0.6:1);
  const rq=[P(cx,Cc.cust.y+Cc.cust.h),P(cx,Cc.custY),P(C(cs).x,Cc.custY),P(C(cs).x,cs.y),C(cs),P(sx2,cs.y+cs.h),P(C(l2).x,l2.y),C(l2),P(rx1,l2.y+l2.h),P(rx1,C(c2).y),P(c2.x+c2.w,C(c2).y),C(c2)];
  run(S.v.q,rq,u,0.6,Math.min(dur(rq),3.4),0.3);lit('sg',true,[E.C.cu[1]])}};
/* ---------- 引擎 ---------- */
function applyVis(){svg.setAttribute('data-step',step+1);svg.querySelectorAll('[data-show]').forEach(g=>g.classList.toggle('hid',!g.dataset.show.split(' ').includes(String(step+1))))}
function newSim(){if(S)S.items.forEach(o=>o.el.remove());S={items:[],v:{}}}
function loop(now){const t=Math.max(0,(now-T0)/1000);M[step].frame(t);raf=requestAnimationFrame(loop)}
function go(){cancelAnimationFrame(raf);if(paused||dead||reduce)return;raf=requestAnimationFrame(loop)}
const STILL=[7.6,1.4,5.2,1.6,1.5,2.4];
function enter(i){step=i;cancelAnimationFrame(raf);newSim();reset();applyVis();M[i].enter();
  if(reduce){M[i].frame(STILL[i]);return}
  M[i].frame(0);T0=pausedAt=performance.now();go()}
function rebuild(){build();enter(step)}
mq.addEventListener('change',rebuild);
const onLang=()=>rebuild();document.addEventListener('ss-lang',onLang);
build();enter(0);
const ctrl={
  show(i){enter(Math.max(0,Math.min(M.length-1,i)))},
  pause(){if(paused)return;paused=true;cancelAnimationFrame(raf);pausedAt=performance.now()},
  resume(){if(!paused)return;paused=false;T0+=performance.now()-pausedAt;go()},
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('ssa-v-rack')},
  ratio(){return L.W/L.H},
  step(){return step}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['v-rack']={steps:6,mount:mount};
})();
