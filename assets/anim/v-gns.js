/* 全局命名空间：6 步动画（SVG，按时间写死的时间线，不依赖动画库）。几套 VAST 集群看到同一个文件夹：源站与卫星站、读缓存、定期同步的问题、读写租约、写入转发。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-gns'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-gns.css，全部限定在 .ssa-v-gns 容器之内。 */
(function(){
var ID='v-gns';
var EN={"已缓存":"Cached","申请读租约":"Request read lease","源站集群":"Origin cluster","一套集群":"One cluster","卫星站 1":"Satellite 1","卫星站 2":"Satellite 2","客户端":"Client","本地客户端":"Local client","远处客户端":"Remote client","广域网":"WAN","已读完":"Reads done","示意，不代表实测数字":"Schematic, not measured",
"保存全量":"Full copy","呈现全局文件夹，按需取数":"Global folder, fetched on demand","没缓存：去源站取":"Not cached: fetch from origin","缓存命中，本地返回":"Cache hit, served locally","本地命中":"Local hits","读租约 有效":"Read lease valid",
"中心副本":"Central copy","站点 A":"Site A","站点 B":"Site B","同步时刻":"Sync","A 改了这个文件":"A edits the file","B 也改了这个文件":"B edits it too","B 成为当前版本":"B becomes the current version","A 留作历史版本":"A stays in version history",
"读租约":"Read lease","写租约":"Write lease","已收回":"Revoked","源站处理写请求":"Origin handles the write request","源站收回卫星站的读租约":"Origin revokes satellite read leases","卫星站 2 再读：先核对，再交数据":"Satellite 2 reads again: check first, then serve",
"转发到源站":"Forward to origin","源站确认后再确认客户端":"ACK only after the origin confirms",
"全局命名空间：源站与卫星站、读缓存、定期同步的问题、读写租约与写入转发":"Global namespace: origin and satellites, read caching, the periodic-sync problem, read and write leases, and write forwarding"};
var ENM={"呈现全局文件夹，按需取数":"Global folder, fetched on demand","源站收回卫星站的读租约":"Origin revokes read leases","卫星站 2 再读：先核对，再交数据":"Satellite 2: check, then serve","源站处理写请求":"Origin handles the write","没缓存：去源站取":"Miss: fetch from origin","缓存命中，本地返回":"Hit: served locally"};
var ARIA="全局命名空间：源站与卫星站、读缓存、定期同步的问题、读写租约与写入转发";
function makeScene(H){
const {el,tx,settx,grp,rect,line,C,P,clamp,sm,ramp,pk,dot,put,hide,run,loopFade}=H;
const L_=()=>H.L(),E_=()=>H.E();
const SCENE={
 still:[5,3,9.7,6.5,8.8,4],
 layout(m){
  if(!m){const O={x:190,y:170,w:220,h:120},S1={x:560,y:40,w:210,h:120},S2={x:560,y:300,w:210,h:120},bus=490;
   return {mobile:false,W:960,H:480,pw:18,ph:18,dr:7,f:{lbl:19,sm:17,note:16},O,S1,S2,
    CO:{x:30,y:202,w:130,h:56},C1:{x:800,y:72,w:130,h:56},C2:{x:800,y:332,w:130,h:56},RC:{x:800,y:202,w:130,h:56},
    wan:{O:[P(O.x+O.w,C(O).y),P(bus,C(O).y)],S1:[P(bus,C(O).y),P(bus,C(S1).y),P(S1.x,C(S1).y)],S2:[P(bus,C(O).y),P(bus,C(S2).y),P(S2.x,C(S2).y)],RC:[P(O.x+O.w,C(O).y),P(800,C(O).y)],lab:P(bus+10,C(O).y-16)},
    cl:{S1:[P(S1.x+S1.w,C(S1).y),P(800,C(S1).y)],S2:[P(S2.x+S2.w,C(S2).y),P(800,C(S2).y)],O:[P(160,C(O).y),P(O.x,C(O).y)]},
    s4:{ctr:{x:120,y:160,w:240,h:110},A:{x:600,y:60,w:300,h:100},B:{x:600,y:280,w:300,h:100},bus:480},
    msg:P(480,441),note:P(40,456)}}
  const O={x:150,y:36,w:200,h:110},S1={x:16,y:260,w:208,h:110},S2={x:256,y:260,w:208,h:110},bus=210;
  return {mobile:true,W:480,H:600,pw:16,ph:16,dr:6,f:{lbl:18,sm:17,note:17},O,S1,S2,
   CO:{x:16,y:66,w:100,h:50},C1:{x:50,y:420,w:140,h:50},C2:{x:290,y:420,w:140,h:50},RC:{x:290,y:420,w:140,h:50},
   wan:{O:[P(C(O).x,O.y+O.h),P(C(O).x,bus)],S1:[P(C(O).x,bus),P(C(S1).x,bus),P(C(S1).x,S1.y)],S2:[P(C(O).x,bus),P(C(S2).x,bus),P(C(S2).x,S2.y)],RC:[P(C(O).x,O.y+O.h),P(C(O).x,bus),P(360,bus),P(360,420)],lab:P(C(O).x+10,bus-16)},
   cl:{S1:[P(C(S1).x,S1.y+S1.h),P(C(S1).x,420)],S2:[P(C(S2).x,S2.y+S2.h),P(C(S2).x,420)],O:[P(116,91),P(O.x,91)]},
   s4:{ctr:{x:120,y:40,w:240,h:110},A:{x:16,y:260,w:208,h:100},B:{x:256,y:260,w:208,h:100},bus:210},
   msg:P(240,516),note:P(16,576)};
 },
 build(L,E){
  const f=L.f,M=L.mobile;
  /* 集群框：名字 + 文件夹格子 */
  function cluster(g,r,name,full){rect(r,'box',g,12);tx(r.x+14,r.y+22,name,f.sm,'lbl b7','start',g);
   const cells=[];const cw=M?24:24,x0=r.x+14,y0=r.y+48;for(let i=0;i<6;i++)cells.push(el('rect',{x:x0+i*(cw+6),y:y0,width:cw,height:24,rx:3,class:'cel'+(full?' s':'')},g));
   const tag=tx(r.x+14,r.y+r.h-18,'',f.sm,'st','start',g);return {cells,tag,r}}
  function client(g,r,name){rect(r,'box',g,10);return tx(C(r).x,C(r).y,name||'客户端',f.sm,'lbl','middle',g)}
  /* 第 1 步：一套集群，远处客户端隔着广域网 */
  {const g=grp('1');E.o1=cluster(g,L.O,'一套集群',true);line(L.cl.O,'',g);client(g,L.CO,M?'客户端':'本地客户端');
   line(L.wan.RC,'dash',g);client(g,L.RC,'远处客户端');tx(L.wan.lab.x,L.wan.lab.y,'广域网',f.sm,'ink3-t','start',g);
   E.n1=[tx(L.CO.x,L.CO.y+L.CO.h+22,'',f.sm,'st sage-t','start',g),tx(M?L.RC.x:L.RC.x,L.RC.y+L.RC.h+22,'',f.sm,'st rose-t','start',g)];
   tx(L.note.x,L.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',g);}
  /* 第 2、3、5、6 步：源站与两个卫星站 */
  {const g=grp('2 3 5 6');E.O=cluster(g,L.O,'源站集群',true);E.S1=cluster(g,L.S1,'卫星站 1',false);E.S2=cluster(g,L.S2,'卫星站 2',false);
   line(L.wan.O,'dash',g);line(L.wan.S1,'dash',g);line(L.wan.S2,'dash',g);tx(L.wan.lab.x,L.wan.lab.y,'广域网',f.sm,'ink3-t','start',g);
   line(L.cl.S1,'',g);line(L.cl.S2,'',g);client(g,L.C1);client(g,L.C2);
   E.full=tx(L.O.x+L.O.w-14,L.O.y+L.O.h-18,'保存全量',f.sm,'st slate-t','end',g);
   [E.S1,E.S2].forEach(s=>s.cells.forEach(c=>c.style.strokeDasharray='3 3'));
   E.m2=tx(L.msg.x,L.msg.y,'',f.sm,'st','middle',g);
   tx(L.note.x,L.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',g);}
  /* 第 4 步：定期同步与最后写入者赢 */
  {const s=L.s4,g=grp('4');rect(s.ctr,'box',g,12);tx(s.ctr.x+14,s.ctr.y+22,'中心副本',f.sm,'lbl b7','start',g);
   E.f4={ctr:el('rect',{x:s.ctr.x+14,y:s.ctr.y+48,width:60,height:36,rx:4,class:'cel s'},g),
    history:el('rect',{x:s.ctr.x+88,y:s.ctr.y+48,width:60,height:36,rx:4,class:'cel o'},g)};
   [['A','站点 A'],['B','站点 B']].forEach(([k,n])=>{const r=s[k];rect(r,'box',g,12);tx(r.x+14,r.y+22,n,f.sm,'lbl b7','start',g);E.f4[k]=el('rect',{x:r.x+14,y:r.y+48,width:60,height:36,rx:4,class:'cel s'},g)});
   const cp=!M?P(s.ctr.x+s.ctr.w,C(s.ctr).y):P(C(s.ctr).x,s.ctr.y+s.ctr.h);
   E.p4={A:!M?[P(s.A.x,C(s.A).y),P(s.bus,C(s.A).y),P(s.bus,cp.y),cp]:[P(C(s.A).x,s.A.y),P(C(s.A).x,s.bus),P(cp.x,s.bus),cp],
         B:!M?[P(s.B.x,C(s.B).y),P(s.bus,C(s.B).y),P(s.bus,cp.y),cp]:[P(C(s.B).x,s.B.y),P(C(s.B).x,s.bus),P(cp.x,s.bus),cp]};
   line(E.p4.A,'dash',g);line(E.p4.B,'dash',g);
   E.t4=M?[tx(s.A.x,s.A.y+s.A.h+22,'',f.sm,'st','start',g),tx(s.B.x,s.B.y+s.B.h+22,'',f.sm,'st','start',g)]:[tx(s.A.x+90,s.A.y+66,'',f.sm,'st','start',g),tx(s.B.x+90,s.B.y+66,'',f.sm,'st','start',g)];
   /* 同步周期时间条 */
   const tb=M?{x:16,y:460,w:448}:{x:120,y:330,w:300};E.tb4=tb;el('rect',{x:tb.x,y:tb.y-5,width:tb.w,height:10,rx:4,class:'track'},g);
   E.tf4=el('rect',{x:tb.x,y:tb.y-5,width:0,height:10,rx:4,class:'fill ink3'},g);el('line',{x1:tb.x+tb.w,y1:tb.y-14,x2:tb.x+tb.w,y2:tb.y+14,class:'ln hot'},g);
   tx(tb.x+tb.w,tb.y+(M?-26:28),'同步时刻',f.sm,'rose-t','end',g);
   E.m4=tx(L.msg.x,L.msg.y,'',f.sm,'st','middle',g);
   tx(L.note.x,L.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',g);}
 },
 modes:[]
};
const wanTo=k=>{const L=L_();return L.wan.O.concat(L.wan[k].slice(1))};
function cells(s,n,cls){s.cells.forEach((c,i)=>{c.setAttribute('class','cel'+(i<n?' '+(cls||'s'):''));c.style.strokeDasharray=i<n?'':'3 3'})}
function reset2(){const E=E_();settx(E.O.tag,'');cells(E.S1,0);cells(E.S2,0);settx(E.S1.tag,'');settx(E.S2.tag,'');settx(E.m2,'');E.full.style.opacity=1}
/* 第 1 步：本地读很快往返；远处读要走完整条广域网 */
SCENE.modes[0]={enter(S){S.v.a=pk();S.v.b=pk()},
 frame(t,S){const E=E_(),L=L_(),per=10,u=t%per,fa=loopFade(u,per);
  const loc=[P(L.CO.x+L.CO.w,C(L.CO).y)].concat(L.mobile?[P(L.O.x,C(L.CO).y)]:[P(L.O.x,C(L.O).y)]);
  const ca=1.0,na=Math.floor(u/ca),wa=u-na*ca;const pa=wa<0.5?H.along(loc,sm(wa/0.5)):H.along(H.rev(loc),sm((wa-0.5)/0.5));put(S.v.a,pa,fa);
  const rc=H.rev(L.wan.RC).concat([]),cb=4.0,nb=Math.floor(u/cb),wb=u-nb*cb;const pb=wb<2?H.along(rc,sm(wb/2)):H.along(H.rev(rc),sm((wb-2)/2));put(S.v.b,pb,fa);
  E.n1[0].textContent=H.T('已读完')+' '+na;E.n1[1].textContent=H.T('已读完')+' '+nb;E.n1.forEach(x=>x.style.opacity=fa)}};
/* 第 2 步：源站保存全量，卫星站依次出现，格子是空的 */
SCENE.modes[1]={frame(t){const E=E_();reset2();[E.S1,E.S2].forEach((s,i)=>{const a=ramp(t,0.5+i*0.8,1.0+i*0.8);s.cells.forEach(c=>c.style.opacity=a)});
  settx(E.m2,'呈现全局文件夹，按需取数','st ink2-t');E.m2.style.opacity=ramp(t,1.6,2)}};
/* 第 3 步：第一次读跨广域网到源站取，之后本地缓存命中 */
SCENE.modes[2]={enter(S){S.v.p=pk();S.v.q=pk()},
 frame(t,S){const E=E_(),L=L_(),per=13,u=t%per,fa=loopFade(u,per);reset2();
  const cl=H.rev(L.cl.S1),toS=cl.concat([C(L.S1)]),far=[C(L.S1)].concat(H.rev(wanTo('S1'))).concat([C(L.O)]);
  /* 第一次：客户端→卫星站（没缓存）→源站→卫星站（存进缓存）→客户端 */
  let hits=0;
  if(u<0.8)put(S.v.p,H.along(toS,sm(u/0.8)),fa);
  else if(u<2.6)put(S.v.p,H.along(far,sm((u-0.8)/1.8)),fa);
  else if(u<4.4)put(S.v.p,H.along(H.rev(far),sm((u-2.6)/1.8)),fa);
  else if(u<5.2)put(S.v.p,H.along(H.rev(toS),sm((u-4.4)/0.8)),fa);else hide(S.v.p);
  if(u>4.4){cells(E.S1,3);settx(E.S1.tag,u>=8.4?'读租约 有效':'已缓存','st sage-t')}
  const leaseAt=8.4;
  if(u>=5.5&&u<6.1)put(S.v.q,H.along(toS,sm((u-5.5)/0.6)),fa);
  else if(u>=6.1&&u<leaseAt){
   const route=u<7.25?far:H.rev(far);
   put(S.v.q,H.along(route,sm((u-(u<7.25?6.1:7.25))/1.15)),fa);
  }
  else if(u>=leaseAt){
   const c=1.2,k=Math.floor((u-leaseAt)/c),w=u-leaseAt-k*c;
   hits=k+(w>1?1:0);
   put(S.v.q,w<0.5?H.along(toS,sm(w/0.5)):H.along(H.rev(toS),sm((w-0.5)/0.5)),fa);
  }else hide(S.v.q);
  settx(E.m2,u<4.4?'没缓存：去源站取':u<6.1?'已缓存':u<leaseAt?'申请读租约':'缓存命中，本地返回',u<leaseAt?'st slate-t':'st sage-t');
  E.m2.style.opacity=fa;
  if(u>leaseAt)E.m2.textContent=H.T('本地命中')+' '+hits}};
/* 第 4 步：同一个同步周期里两地都改，同步时时间戳晚的胜出 */
SCENE.modes[3]={enter(S){S.v.a=pk('ochre',30,22);S.v.b=pk('violet',30,22)},
 frame(t,S){const E=E_(),per=9,u=t%per,fa=loopFade(u,per),tb=E.tb4;
  E.tf4.setAttribute('width',(tb.w*clamp(u/4,0,1)).toFixed(1));
  E.f4.A.setAttribute('class','cel '+(u>1?'o':'s'));E.f4.B.setAttribute('class','cel '+(u>2?'v':'s'));
  settx(E.t4[0],u>1?'A 改了这个文件':'','st ochre-t');settx(E.t4[1],u>2?'B 也改了这个文件':'','st violet-t');E.t4.forEach(x=>x.style.opacity=fa);
  const ra=run(S.v.a,E.p4.A,u,4,1.4,{post:0}),rb=run(S.v.b,E.p4.B,u,4.4,1.4,{post:0});if(ra>=0&&ra<=1)S.v.a.style.opacity=fa;if(rb>=0&&rb<=1)S.v.b.style.opacity=fa;
  E.f4.history.style.opacity=u>5.8?fa:0;
  E.f4.ctr.setAttribute('class','cel '+(u>5.8?'v':'s'));
  if(u>6)settx(E.m4,'A 留作历史版本','st rose-t');else if(u>5.8)settx(E.m4,'B 成为当前版本','st violet-t');else settx(E.m4,'');E.m4.style.opacity=fa}};
/* 第 5 步：源站处理写请求；源站批准并收回卫星站 2 的读租约；卫星站 2 再读时先核对 */
SCENE.modes[4]={enter(S){S.v.r=dot('',7);S.v.g=dot('rose',7);S.v.x=dot('rose',7);S.v.v=dot('vio',7);S.v.d=pk()},
 frame(t,S){const E=E_(),L=L_(),per=12,u=t%per,fa=loopFade(u,per);reset2();cells(E.S1,3);cells(E.S2,3);
  const s1=H.rev(wanTo('S1')).concat([C(L.O)]),s2=wanTo('S2');
  settx(E.S1.tag,u>3.4?'已收回':'读租约','st '+(u>3.4?'ink3-t':'sage-t'));
  settx(E.S2.tag,u>3.4?'已收回':'读租约','st '+(u>3.4?'ink3-t':'sage-t'));
  settx(E.O.tag,u>1.9?'写租约':'','st slate-t');
  if(u>3.4){for(const satellite of [E.S1,E.S2])cells(satellite,3,'x');}
  const r1=run(S.v.r,s1,u,0.6,1.2,{post:0});if(r1>=0&&r1<=1)S.v.r.style.opacity=fa;
  const r2=run(S.v.g,H.rev(s1),u,1.9,1.0,{post:0});if(r2>=0&&r2<=1)S.v.g.style.opacity=fa;
  const r3=run(S.v.x,[C(L.O)].concat(s2.slice(0)),u,1.9,1.4,{post:0});if(r3>=0&&r3<=1)S.v.x.style.opacity=fa;
  /* 卫星站 2 再读：先向源站核对，再交给客户端 */
  const chk=H.rev(wanTo('S2')).concat([C(L.O)]);
  const r4=run(S.v.v,chk,u,5.6,1.4,{post:0});if(r4>=0&&r4<=1)S.v.v.style.opacity=fa;
  if(u>=7.1){const r5=run(S.v.v,H.rev(chk),u,7.1,1.4,{post:0});if(r5>=0&&r5<=1)S.v.v.style.opacity=fa;}
  if(u>8.5){cells(E.S2,3,'s');settx(E.S2.tag,'读租约','st sage-t')}
  const to2=H.rev(L.cl.S2);const r6=run(S.v.d,[C(L.S2)].concat(L.cl.S2),u,8.6,0.7,{post:0});if(r6>=0&&r6<=1)S.v.d.style.opacity=fa;
  let m='';let c='';if(u>0.5&&u<1.9){m='源站处理写请求';c='slate-t'}else if(u>=1.9&&u<5.4){m='源站收回卫星站的读租约';c='rose-t'}else if(u>=5.4){m='卫星站 2 再读：先核对，再交数据';c='violet-t'}
  settx(E.m2,m,'st '+c);E.m2.style.opacity=fa}};
/* 第 6 步：请求转发至源站，确认按原路返回 */
SCENE.modes[5]={enter(S){S.v.p=pk();S.v.a=dot('ok',7)},
 frame(t,S){const E=E_(),L=L_(),per=8,u=t%per,fa=loopFade(u,per);reset2();
  const path=H.rev(L.cl.S1).concat([C(L.S1)],H.rev(wanTo('S1')),[C(L.O)]);
  const r=run(S.v.p,path,u,0.2,2.3,{post:0});
  if(r>=0&&r<=1)S.v.p.style.opacity=fa;
  const a=run(S.v.a,H.rev(path),u,2.6,2.4,{post:0});
  if(a>=0&&a<=1)S.v.a.style.opacity=fa;
  settx(E.m2,u<2.6?'转发到源站':'源站确认后再确认客户端','st '+(u<2.6?'slate-t':'sage-t'));
  E.m2.style.opacity=fa}};
return SCENE;
}

function lang(){return window.SS_LANG==='en'?'en':'zh'}
var NS='http://www.w3.org/2000/svg';
function mount(host,opts){
opts=opts||{};
host.classList.add('ssa-'+ID);host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class',ID+'-scene');svg.setAttribute('role','img');host.appendChild(svg);
const btn=document.createElement('button');btn.className='ssa-tgl';btn.type='button';btn.hidden=true;host.appendChild(btn);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mq=matchMedia('(max-width: 640px)');
const qs=new URLSearchParams(location.search);
let L=null,E={},S={items:[],v:{}},step=0,T0=0,raf=0,paused=!!opts.paused,pausedAt=0,dead=false,tgl=false;
/* 文字：中文原样，英文取 EN；手机版放不下时取 ENM 的短写法 */
function T(s){if(lang()!=='en')return s;if(L&&L.mobile&&ENM[s]!==undefined)return ENM[s];return EN[s]!==undefined?EN[s]:s}
/* ---------- 画图小工具 ---------- */
function el(tag,a,p){const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);(p||svg).appendChild(e);return e}
/* 字号下限：桌面 16（文档模式约缩到 0.97 倍，仍 ≥15px），手机 17（400 宽页面约缩到 0.77 倍，仍 ≥12px） */
function tx(x,y,s,size,cls,anchor,p){size=Math.max(size,L&&L.mobile?17:16);const t=el('text',{x,y,'font-size':size,class:cls||''},p);if(anchor)t.setAttribute('text-anchor',anchor);t.textContent=T(s);return t}
function settx(t,s,cls){t.textContent=T(s);if(cls!=null)t.setAttribute('class',cls)}
function grp(show,p,extra){const g=el('g',Object.assign({class:'vis'},extra||{}),p);if(show)g.dataset.show=show;return g}
function rect(r,cls,p,rx){return el('rect',{x:r.x,y:r.y,width:r.w,height:r.h,rx:rx==null?10:rx,class:cls||'box'},p)}
function line(pts,cls,p){return el('path',{d:'M'+pts.map(q=>(+q.x).toFixed(1)+' '+(+q.y).toFixed(1)).join(' L'),class:'ln '+(cls||'')},p)}
const C=r=>({x:r.x+r.w/2,y:r.y+r.h/2});
const P=(x,y)=>({x,y});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sm=u=>u<=0?0:u>=1?1:u*u*(3-2*u);
const ramp=(t,t0,t1)=>clamp((t-t0)/(t1-t0),0,1);
function plen(pts){let s=0;for(let i=1;i<pts.length;i++)s+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);return s}
function along(pts,u){u=clamp(u,0,1);let d=u*plen(pts);for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],l=Math.hypot(b.x-a.x,b.y-a.y);if(d<=l||i===pts.length-1){const k=l?Math.min(1,d/l):0;return {x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k}}d-=l}return pts[pts.length-1]}
const rev=pts=>pts.slice().reverse();
/* 数据块：pk(cls,w,h) 生成一个块（每步重进时自动清掉）；put(块,点,透明度) 放到某处 */
function pk(cls,w,h,rx){w=w||L.pw;h=h||L.ph;const r=el('rect',{x:-w/2,y:-h/2,width:w,height:h,rx:rx==null?3:rx,class:'pkt '+(cls||'')},E.pk);r.style.opacity=0;S.items.push(r);return r}
function dot(cls,r){const c=el('circle',{cx:0,cy:0,r:r||L.dr||7,class:'dot '+(cls||'')},E.pk);c.style.opacity=0;S.items.push(c);return c}
function put(p,q,a){p.setAttribute('transform','translate('+q.x.toFixed(1)+' '+q.y.toFixed(1)+')');p.style.opacity=a==null?1:a}
function hide(p){p.style.opacity=0}
/* 一个块沿 pts 在 [t0, t0+dur] 内走完；之前不显示（pre），之后停在终点（post 透明度） */
function run(p,pts,t,t0,dur,opt){opt=opt||{};const u=(t-t0)/dur;
  if(u<0){if(opt.pre!=null)put(p,pts[0],opt.pre);else hide(p);return -1}
  if(u<=1){put(p,along(pts,sm(u)),1);return u}
  put(p,pts[pts.length-1],opt.post==null?1:opt.post);return 1.5}
const loopFade=(u,per)=>u>per-0.45?clamp((per-u)/0.45,0,1):u<0.35?clamp(u/0.35,0,1):1;
const H={el,tx,settx,grp,rect,line,C,P,clamp,sm,ramp,plen,along,rev,pk,dot,put,hide,run,loopFade,T,alt:()=>tgl,E:()=>E,S:()=>S,L:()=>L};
const SCENE=makeScene(H);
/* ---------- 引擎 ---------- */
function applyVis(){
  svg.setAttribute('data-step',step+1);
  svg.querySelectorAll('[data-show]').forEach(g=>g.classList.toggle('hid',!g.dataset.show.split(' ').includes(String(step+1))));
  const TG=SCENE.toggle;btn.hidden=!(TG&&TG.step===step);
  if(TG&&L.btn){btn.style.left=(L.btn.x/L.W*100)+'%';btn.style.top=(L.btn.y/L.H*100)+'%'}
}
function setBtn(){const TG=SCENE.toggle;if(!TG)return;btn.textContent='⇄ '+T(TG.label[tgl?1:0]);btn.setAttribute('aria-label',T(TG.aria)+T(TG.now[tgl?1:0]))}
function newSim(){S.items.forEach(o=>o.remove());S={items:[],v:{}}}
function loop(now){const t=Math.max(0,(now-T0)/1000);SCENE.modes[step].frame(t,S);raf=requestAnimationFrame(loop)}
function go(){cancelAnimationFrame(raf);if(paused||dead||reduce)return;raf=requestAnimationFrame(loop)}
function enter(i){
  step=i;cancelAnimationFrame(raf);newSim();
  SCENE.reset&&SCENE.reset(S);
  applyVis();
  const m=SCENE.modes[i];m.enter&&m.enter(S);
  if(reduce){m.frame((SCENE.still||[])[i]||2,S);return}
  m.frame(0,S);T0=pausedAt=performance.now();go();
}
if(SCENE.toggle){const TG=SCENE.toggle;tgl=qs.get(TG.param)===TG.on;
  btn.addEventListener('click',()=>{tgl=!tgl;setBtn();if(step===TG.step)enter(step)})}
function build(){L=SCENE.layout(mq.matches);svg.innerHTML='';E={};svg.setAttribute('viewBox',`0 0 ${L.W} ${L.H}`);
  SCENE.build(L,E);E.pk=el('g',{class:'pklayer'});SCENE.over&&SCENE.over(L,E);
  setBtn();svg.setAttribute('aria-label',T(ARIA));if(opts.onLayout)opts.onLayout(L.W/L.H,L.mobile)}
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
  sim(){return {step,t:(performance.now()-T0)/1000,v:S.v,n:S.items.length,tgl}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim[ID]={steps:6,mount:mount};
})();
