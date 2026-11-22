/* Classic 与 DBox-HA：整台 DBox 离线时集群停不停：6 步动画（SVG，按时间写死的时间线，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-classic'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布（DBox 排成两行）；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-classic.css，全部限定在 .ssa-v-classic 容器之内。
   VAST 字标直接引用 assets/brand/vast-wordmark-black.svg 与 -white.svg（浅色用黑、深色用白），不内嵌。 */
(function(){
var EN={"CNode 1":"CNode 1","CNode 2":"CNode 2","CNode 3":"CNode 3","DBox 1":"DBox 1","DBox 2":"DBox 2","DBox 3":"DBox 3","DBox 4":"DBox 4","NVMe-oF 网络":"NVMe-oF network",
"其余 SSD 仍可访问":"Remaining SSDs stay accessible","故障域：单块 SSD":"Failure domain: one SSD",
"示例条带：每台 5 块":"Example stripe: 5 chunks per DBox","示意：20 块里 4 块是校验":"Schematic: 4 of the 20 pieces are parity",
"一台 DBox 离线：少 5 块，超过 4 块校验":"A DBox offline: 5 pieces lost, more than 4 parity","示例：Classic 集群离线":"Example: Classic cluster offline",
"DBox-HA 新条带：每台最多 2 块":"New DBox-HA stripe: 2 chunks per box","示意：画了 4 台，实际至少 8 台":"Schematic: 4 shown, at least 8 required",
"少 2 块，在 4 块校验以内":"2 pieces lost, within 4 parity","重建到其余 DBox":"Rebuilt onto the other DBoxes","集群照常服务":"The cluster keeps serving",
"数据":"Data","校验":"Parity","重建块":"Rebuilt","示例：每条条带 4 个校验块":"Example: 4 parity chunks per stripe","示例：条带变宽，校验占比降低":"Wider stripes, lower parity share",
"8 台 DBox：16 块":"8 DBoxes: 16 pieces","16 台 DBox：32 块":"16 DBoxes: 32 pieces","24 台 DBox：48 块":"24 DBoxes: 48 pieces",
"默认关闭":"Off by default","最少 8 台":"At least 8 DBoxes","启用后永久生效":"Permanent once enabled","DNode":"DNode",
"Classic 与 DBox-HA 的条带布局和整箱故障恢复":"Classic and DBox-HA stripe layouts and recovery from a DBox outage"};
var ENM={"最少 8 台":"8 DBoxes min.","启用后永久生效":"Permanent","其余 SSD 仍可访问":"Remaining SSDs stay accessible","一台 DBox 离线：少 5 块，超过 4 块校验":"DBox offline: 5 lost, only 4 parity","DBox-HA 新条带：每台最多 2 块":"New DBox-HA stripe: 2 chunks per box","示例条带：每台 5 块":"Example stripe: 5 chunks per DBox","示意：画了 4 台，实际至少 8 台":"Schematic: 4 shown, 8 minimum","示例：条带变宽，校验占比降低":"Wider stripes, lower parity share","示例：每条条带 4 个校验块":"Example: 4 parity chunks per stripe","示意：20 块里 4 块是校验":"Schematic: 4 of 20 are parity","坏一个 DNode、一块盘":"A DNode or drive fails"};
var ARIA="Classic 与 DBox-HA 的条带布局和整箱故障恢复";
function lang(){return window.SS_LANG==='en'?'en':'zh'}
var NS='http://www.w3.org/2000/svg';
function mount(host,opts){
opts=opts||{};
host.classList.add('ssa-v-classic');host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','ssa-scene');svg.setAttribute('role','img');host.appendChild(svg);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mq=matchMedia('(max-width: 640px)');
const ROOT=window.SS_ROOT||'';
function T(s){if(lang()!=='en')return s;if(L&&L.mobile&&ENM[s]!==undefined)return ENM[s];return EN[s]!==undefined?EN[s]:s}
function el(tag,a,p){const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);(p||svg).appendChild(e);return e}
function tx(x,y,s,size,cls,anchor,p){const t=el('text',{x,y,'font-size':size,class:cls||''},p);if(anchor)t.setAttribute('text-anchor',anchor);t.textContent=T(s);return t}
function grp(show,p){const g=el('g',{class:'vis'},p);if(show)g.dataset.show=show;return g}
function box(r,p,cls,rx){return el('rect',{x:r.x,y:r.y,width:r.w,height:r.h,rx:rx==null?10:rx,class:cls||'box'},p)}
function poly(pts,cls,p){return el('path',{d:'M'+pts.map(q=>q.x+' '+q.y).join(' L'),class:'ln '+(cls||'')},p)}
const C=r=>({x:r.x+r.w/2,y:r.y+r.h/2});
const P=(x,y)=>({x,y});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function plen(pts){let s=0;for(let i=1;i<pts.length;i++)s+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);return s}
function at(pts,u){u=clamp(u,0,1);let d=u*plen(pts);for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],l=Math.hypot(b.x-a.x,b.y-a.y);if(d<=l||i===pts.length-1){const k=l?Math.min(1,d/l):0;return {x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k}}d-=l}return pts[pts.length-1]}
function rev(pts){return pts.slice().reverse()}
function cat(...ps){const o=[];ps.forEach(p=>p.forEach(q=>{const l=o[o.length-1];if(!l||l.x!==q.x||l.y!==q.y)o.push(q)}));return o}
function vmark(x,y,h,p){const w=h*66/14,g=el('g',{class:'vwm'},p);
  [['l','black'],['d','white']].forEach(([k,c])=>el('image',{href:ROOT+'assets/brand/vast-wordmark-'+c+'.svg',x:x.toFixed(1),y:(y-h/2).toFixed(1),width:w.toFixed(1),height:h,class:'vwm-'+k},g));return g}
let L=null,E,S,step=0,T0=0,raf=0,paused=!!opts.paused,dead=false,pausedAt=0;
function pk(cls){const r=el('rect',{x:-L.pw/2,y:-L.ph/2,width:L.pw,height:L.ph,rx:4,class:'pkt '+(cls||'')},E.pk);const o={el:r};S.items.push(o);put(o,-99,-99,0);return o}
function put(o,x,y,a){if(typeof x==='object'){a=y;y=x.y;x=x.x}o.el.setAttribute('transform',`translate(${x.toFixed(1)} ${y.toFixed(1)})`);o.el.style.opacity=a==null?1:a}
function run(o,pts,t,t0,dur,fo){fo=fo==null?0.3:fo;if(t<t0||t>t0+dur+fo){put(o,-99,-99,0);return -1}const u=(t-t0)/dur;if(u<=1){put(o,at(pts,u),1);return u}put(o,pts[pts.length-1],1-(t-t0-dur)/fo);return 1.5}
const dur=pts=>plen(pts)/L.sp;
/* ---------- 版式 ---------- */
const NB=4,ND=5;
function layout(mobile){
  let L0;
  if(!mobile){
    L0={W:960,H:470,mobile:false,f:{lbl:20,sm:17,cap:18,ttl:17},pw:18,ph:14,sp:320,cap:{x:944,y:20},bot:{x:480,y:410},leg:{y:444},stop:{x:480,y:104},trunk:null,fabLbl:{x:40,y:104}};
    L0.cn=[240,480,720].map(x=>({x:x-85,y:38,w:170,h:44}));
    L0.fab=[{y:124,x1:40,x2:920}];
    L0.db=[];for(let b=0;b<NB;b++){const x=40+b*224,y=152,w=208;L0.db.push(dbox(x,y,w,124,{dnY:34,dnH:36,dnW:84,dnGap:12,barDy:92,drDy:106,drH:50,drW:28,drGap:10,ttl:18}))}
    L0.panel={x:40,y:60,w:880,lab:200,bw:11,bg:3,rowH:84,chip:{y:400}};
  }else{
    L0={W:480,H:560,mobile:true,f:{lbl:18,sm:17,cap:17,ttl:17},pw:16,ph:12,sp:240,cap:{x:468,y:18},bot:{x:240,y:500},leg:{y:532},stop:{x:240,y:96},trunk:6,fabLbl:{x:468,y:96,a:'end'}};
    L0.cn=[86,240,394].map(x=>({x:x-70,y:34,w:140,h:40}));
    L0.fab=[{y:110,x1:6,x2:470},{y:306,x1:6,x2:470}];
    L0.db=[];for(let b=0;b<NB;b++){const x=14+(b%2)*232,y=b<2?130:326,w=220;L0.db.push(dbox(x,y,w,b<2?110:306,{dnY:28,dnH:30,dnW:94,dnGap:10,barDy:76,drDy:86,drH:44,drW:30,drGap:12,ttl:15}))}
    L0.panel={x:12,y:56,w:456,lab:0,bw:7,bg:2,rowH:96,chip:{y:420}};
  }
  return L0;
}
function dbox(x,y,w,fabY,o){const b={frame:{x,y,w,h:o.drDy+o.drH+14},title:P(x+12,y+o.ttl),fabY};
  const dx0=x+(w-2*o.dnW-o.dnGap)/2;b.dn=[{x:dx0,y:y+o.dnY,w:o.dnW,h:o.dnH},{x:dx0+o.dnW+o.dnGap,y:y+o.dnY,w:o.dnW,h:o.dnH}];
  b.barY=y+o.barDy;const tot=ND*o.drW+(ND-1)*o.drGap,x0=x+(w-tot)/2;b.dr=[];for(let k=0;k<ND;k++)b.dr.push({x:x0+k*(o.drW+o.drGap),y:y+o.drDy,w:o.drW,h:o.drH});
  return b}
function fabRoute(a,c){if(a.y===c.y)return [a,c];return [a,P(L.trunk,a.y),P(L.trunk,c.y),c]}
/* CNode i 到 DBox b 的第 j 块盘，经第 k 个 DNode */
function path(i,b,j,k){const cn=C(L.cn[i]),B=L.db[b],dn=C(B.dn[k]),d=C(B.dr[j]);
  return cat([cn,P(cn.x,L.fab[0].y)],fabRoute(P(cn.x,L.fab[0].y),P(dn.x,B.fabY)),[dn,P(dn.x,B.barY),P(d.x,B.barY),d])}
/* ---------- 画面 ---------- */
function build(){
  L=layout(mq.matches);svg.innerHTML='';E={};svg.setAttribute('viewBox',`0 0 ${L.W} ${L.H}`);
  const f=L.f,gS=grp('1 2 3 4 5');E.gS=gS;
  E.fab=L.fab.map(s=>poly([P(s.x1,s.y),P(s.x2,s.y)],'',gS));
  if(L.trunk!=null)E.fab.push(poly([P(L.trunk,L.fab[0].y),P(L.trunk,L.fab[1].y)],'',gS));
  tx(L.fabLbl.x,L.fabLbl.y,'NVMe-oF 网络',f.sm,'ink3-t',L.fabLbl.a||'start',gS);
  E.cnV=L.cn.map(r=>poly([C(r),P(C(r).x,L.fab[0].y)],'',gS));
  E.cn=L.cn.map((r,i)=>{const b=box(r,gS,'box',8);tx(C(r).x,C(r).y,'CNode '+(i+1),f.lbl,'lbl b7','middle',gS);return b});
  E.db=L.db.map((B,b)=>{const g=el('g',{class:'dbx'},gS),o={g};
    o.frame=box(B.frame,g,'box soft',14);
    tx(B.title.x,B.title.y,'DBox '+(b+1),f.ttl,'ttl','start',g);
    if(b===0)vmark(B.title.x+f.ttl*0.58*6+6,B.title.y,L.mobile?10:12,g);
    o.up=B.dn.map(d=>poly([C(d),P(C(d).x,B.fabY)],'',g));
    o.down=B.dn.map(d=>poly([P(C(d).x,d.y+d.h),P(C(d).x,B.barY)],'thin',g));
    const xs=B.dr.map(d=>C(d).x).concat(B.dn.map(d=>C(d).x));
    o.bar=poly([P(Math.min(...xs),B.barY),P(Math.max(...xs),B.barY)],'thin',g);
    o.drL=B.dr.map(d=>poly([P(C(d).x,B.barY),P(C(d).x,d.y)],'thin',g));
    o.dn=B.dn.map(d=>{const r=box(d,g,'box',8);tx(C(d).x,C(d).y,'DNode',f.sm,'lbl','middle',g);return r});
    o.dr=B.dr.map(d=>el('rect',{x:d.x,y:d.y,width:d.w,height:d.h,rx:4,class:'disk'},g));
    const xm=(c,a)=>{const g2=el('g',{class:'xm'},g);poly([P(c.x-a,c.y-a),P(c.x+a,c.y+a)],'xmark',g2);poly([P(c.x-a,c.y+a),P(c.x+a,c.y-a)],'xmark',g2);return g2};
    o.xBox=xm(C(B.frame),B.frame.h*0.3);o.xDn=B.dn.map(d=>xm(C(d),d.h*0.42));
    return o});
  E.cap=tx(L.cap.x,L.cap.y,'',f.cap,'st','end');
  E.bot=tx(L.bot.x,L.bot.y,'',f.sm,'ink2-t','middle');
  /* 图例 */
  const lx0=L.mobile?40:300,st=L.mobile?140:170;
  [['数据','pkt','2 3 4 5'],['校验','pkt par','2 3 4 5'],['重建块','pkt rb','5']].forEach(([s,c,sh],i)=>{const lg=grp(sh),x=lx0+i*st;el('rect',{x,y:L.leg.y-L.ph/2,width:L.pw,height:L.ph,rx:4,class:c},lg);tx(x+L.pw+8,L.leg.y,s,f.sm,'ink2-t','start',lg)});
  /* 第 6 步：条带宽度随 DBox 数变宽 */
  const gP=grp('6');E.rows=[];const Pn=L.panel;
  tx(L.mobile?Pn.x:Pn.x,Pn.y-10,'示例：每条条带 4 个校验块',f.cap,'st slate-t','start',gP);
  [8,16,24].forEach((n,r)=>{const y=Pn.y+34+r*Pn.rowH,row={blocks:[],n};
    const ly=L.mobile?y:y+16;tx(Pn.x,ly,n+' 台 DBox：'+(2*n)+' 块',f.sm,'ink2-t','start',gP);
    const by=L.mobile?y+20:y+4,bx0=Pn.x+Pn.lab;for(let k=0;k<2*n;k++){row.blocks.push(el('rect',{x:bx0+k*(Pn.bw+Pn.bg),y:by,width:Pn.bw,height:L.mobile?22:24,rx:2,class:'blk'+(k>=2*n-4?' par':'')},gP))}
    E.rows.push(row)});
  E.chips=['默认关闭','最少 8 台','启用后永久生效'].map((s,i)=>{const cw=L.mobile?140:200,gap=L.mobile?12:30,x=L.W/2+(i-1)*(cw+gap)-cw/2,g=el('g',{class:'chip'},gP);
    el('rect',{x,y:Pn.chip.y-18,width:cw,height:36,rx:18,class:'chipb'},g);tx(x+cw/2,Pn.chip.y,s,f.sm,'st ink2-t','middle',g);return g});
  E.pk=el('g',{});
  svg.setAttribute('aria-label',T(ARIA));
  if(opts.onLayout)opts.onLayout(L.W/L.H,L.mobile);
}
function cap(s,c){E.cap.textContent=T(s);E.cap.setAttribute('class','st '+(c||''))}
function bot(s,c){E.bot.textContent=T(s);E.bot.setAttribute('class','st '+(c||'ink2-t'))}
function reset(){
  svg.querySelectorAll('.ln').forEach(l=>l.classList.remove('lit','dead'));
  svg.querySelectorAll('.disk').forEach(d=>d.classList.remove('w','par','rb','off','bad'));
  svg.querySelectorAll('.box').forEach(d=>d.classList.remove('on','ok','dead','hot'));
  E.db.forEach(o=>{o.g.classList.remove('off');o.xBox.style.opacity=0;o.xDn.forEach(x=>x.style.opacity=0)});
  E.rows.forEach(r=>r.blocks.forEach(b=>b.style.opacity=0));E.chips.forEach(c=>c.style.opacity=0);
  cap('');bot('');
}
function dboxOff(b){const o=E.db[b];o.g.classList.add('off');o.xBox.style.opacity=1;o.frame.classList.add('hot')}
/* 条带：Classic 每台 5 块（20 块，最后 4 块校验）；HA 每台 2 块（8 块，后 4 块校验） */
const CL=[];for(let b=0;b<NB;b++)for(let j=0;j<ND;j++)CL.push([b,j]);
const HA=[[0,0],[1,0],[2,0],[3,0],[0,2],[1,2],[2,2],[3,2]];
const isPar=(arr,q)=>q>=arr.length-4;
const M=[];
/* 1：DBox 内部没有单点 */
M[0]={enter(){cap('其余 SSD 仍可访问','sage-t');bot('故障域：单块 SSD');
  const o=E.db[0];o.dn[0].classList.add('dead');o.xDn[0].style.opacity=1;o.up[0].classList.add('dead');o.down[0].classList.add('dead');o.dr[3].classList.add('bad');
  [1,2,3].forEach(b=>E.db[b].g.classList.add('dim'));S.v.p=[pk(),pk()]},
 frame(t){const per=3,k=Math.floor(t/per),u=t-k*per,o=E.db[0];
  o.up[1].classList.add('lit');o.down[1].classList.add('lit');o.bar.classList.add('lit');E.fab[0].classList.add('lit');
  const js=[[0,1],[2,4],[1,0],[4,2]][k%4];
  js.forEach((j,s)=>{const r=path(s?2:1,0,j,1);const p=run(S.v.p[s],r,u,0.15+s*0.3,Math.min(dur(r),2.1));o.dr[j].classList.toggle('w',p>1)})}};
/* 2：Classic 条带铺满 */
M[1]={enter(){cap('示例条带：每台 5 块','slate-t');bot('示意：20 块里 4 块是校验','ink3-t');S.v.c=CL.map((x,q)=>pk(isPar(CL,q)?'par':''))},
 frame(t){const per=6.5,u=t%per;E.fab.forEach(l=>l.classList.toggle('lit',u<4.4));E.cn[1].classList.toggle('on',u<4.4);
  CL.forEach(([b,j],q)=>{const r=path(1,b,j,j<3?0:1),t0=0.2+q*0.08,d=Math.min(dur(r),2.2);run(S.v.c[q],r,u,t0,d,0);E.db[b].dr[j].classList.toggle(isPar(CL,q)?'par':'w',u>t0+d)})}};
/* 3：一台 DBox 离线，Classic 停 */
M[2]={enter(){CL.forEach(([b,j],q)=>E.db[b].dr[j].classList.add(isPar(CL,q)?'par':'w'))},
 frame(t){const u=t%6,off=u>1.2;
  E.db[1].g.classList.toggle('off',off);E.db[1].xBox.style.opacity=off?1:0;E.db[1].frame.classList.toggle('hot',off);
  E.cn.forEach(c=>c.classList.toggle('hot',u>2.2));bot(u>2.2?'示例：Classic 集群离线':'','rose-t');
  cap(off?'一台 DBox 离线：少 5 块，超过 4 块校验':'','rose-t')}};
/* 4：DBox-HA 每台最多 2 块 */
M[3]={enter(){cap('DBox-HA 新条带：每台最多 2 块','slate-t');bot('示意：画了 4 台，实际至少 8 台','ink3-t');S.v.c=HA.map((x,q)=>pk(isPar(HA,q)?'par':''))},
 frame(t){const per=5.5,u=t%per;E.fab.forEach(l=>l.classList.toggle('lit',u<3.6));E.cn[1].classList.toggle('on',u<3.6);
  HA.forEach(([b,j],q)=>{const r=path(1,b,j,b%2),t0=0.2+q*0.14,d=Math.min(dur(r),2.2);run(S.v.c[q],r,u,t0,d,0);E.db[b].dr[j].classList.toggle(isPar(HA,q)?'par':'w',u>t0+d)})}};
/* 5：一台 DBox 离线，照常服务并重建 */
const RB=[[0,4],[3,4]];
M[4]={enter(){HA.forEach(([b,j],q)=>E.db[b].dr[j].classList.add(isPar(HA,q)?'par':'w'));dboxOff(1);
  S.v.r=HA.filter(([b])=>b!==1).slice(0,4).map((x,q)=>pk(isPar(HA,HA.indexOf(x))?'par':''));S.v.b=RB.map(()=>pk('rb'))},
 frame(t){const per=7.5,u=t%per;const src=HA.filter(([b])=>b!==1).slice(0,4);
  E.fab.forEach(l=>l.classList.toggle('lit',u<6.4));
  src.forEach(([b,j],q)=>{const r=rev(path(1,b,j,b%2));run(S.v.r[q],r,u,0.2+q*0.12,Math.min(dur(r),2.2),0.2)});
  const back=u>2.9;E.cn[1].classList.toggle('ok',back);
  RB.forEach(([b,j],q)=>{const r=path(1,b,j,b%2),t0=3.6+q*0.2,d=Math.min(dur(r),2.2);run(S.v.b[q],r,u,t0,d,0);E.db[b].dr[j].classList.toggle('rb',u>t0+d)});
  cap(u<3.6?'少 2 块，在 4 块校验以内':'重建到其余 DBox',u<3.6?'sage-t':'slate-t');bot('集群照常服务','sage-t')}};
/* 6：条带宽度与 DBox 数 */
M[5]={enter(){cap('示例：条带变宽，校验占比降低','slate-t')},
 frame(t){const u=t%9;E.rows.forEach((r,ri)=>r.blocks.forEach((b,k)=>{const t0=0.3+ri*1.5+k*0.025;b.style.opacity=u>t0?1:0}));
  E.chips.forEach((c,i)=>c.style.opacity=u>5.2+i*0.5?1:0)}};
/* ---------- 引擎 ---------- */
function applyVis(){svg.setAttribute('data-step',step+1);svg.querySelectorAll('[data-show]').forEach(g=>g.classList.toggle('hid',!g.dataset.show.split(' ').includes(String(step+1))))}
function newSim(){if(S)S.items.forEach(o=>o.el.remove());S={items:[],v:{}}}
function loop(now){const t=Math.max(0,(now-T0)/1000);M[step].frame(t);raf=requestAnimationFrame(loop)}
function go(){cancelAnimationFrame(raf);if(paused||dead||reduce)return;raf=requestAnimationFrame(loop)}
const STILL=[2.6,5.0,3.0,5.0,6.8,8.5];
function enter(i){step=i;cancelAnimationFrame(raf);newSim();reset();E.db.forEach(o=>o.g.classList.remove('dim'));applyVis();M[i].enter();
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
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('ssa-v-classic')},
  ratio(){return L.W/L.H},
  step(){return step}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['v-classic']={steps:6,mount:mount};
})();
