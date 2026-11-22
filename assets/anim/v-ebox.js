/* EBox：一台标准服务器里同时跑 CNode 和 DNode：6 步动画（SVG，按时间写死的时间线，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-ebox'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布（每台 EBox 一行）；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-ebox.css，全部限定在 .ssa-v-ebox 容器之内。
   VAST 字标直接引用 assets/brand/vast-wordmark-black.svg 与 -white.svg（浅色用黑、深色用白），不内嵌。 */
(function(){
var EN={"EBox 1":"EBox 1","EBox 2":"EBox 2","EBox 3":"EBox 3","EBox 4":"EBox 4","EBox 5":"EBox 5","DNode A":"DNode A","DNode B":"DNode B",
"NVMe-oF 网络":"NVMe-oF network","CNode 容器：跑存储逻辑":"CNode container: storage logic","DNode A：接一半盘":"DNode A: half the drives","DNode B：接另一半盘":"DNode B: the other half",
"一台标准服务器，三个容器":"One standard server, three containers","每个 CNode 都能读写每一台的盘":"Every CNode reaches every EBox's drives",
"主板故障可使整机离线":"Motherboard failure can take an EBox offline","故障域：整台 EBox":"Failure domain: one EBox",
"数据条带：每台放一块":"Data stripe: one piece per EBox","元数据：写三份到三台":"Metadata: three copies on three boxes","写入完成，确认请求":"Writes complete, request confirmed",
"数据":"Data","校验":"Parity","元数据":"Metadata","两台离线，读取时重构":"Two EBoxes offline: reconstruct on read","从剩余条带块恢复数据":"Recover data from surviving chunks",
"示意，台数与条带宽度不代表实际配置":"Schematic; box count and stripe width are not real configurations",
"CNode 升级：先迁出 VIP":"CNode upgrade: move VIPs first","DNode A 升级：盘交给 DNode B":"DNode A upgrades: B takes its drives","DNode B 升级：盘交给 DNode A":"DNode B upgrades: A takes its drives","DNode 升级完成":"DNode upgrade complete",
"升级中":"Upgrading","新容器":"New","VIP":"VIP","已确认":"ACK",
"EBox 的 CNode 与 DNode 容器、共享 SSD、数据保护和滚动升级":"EBox CNode and DNode containers, shared SSDs, data protection and rolling upgrades"};
var ENM={"主板故障可使整机离线":"Motherboard failure can take an EBox offline","每个 CNode 都能读写每一台的盘":"Every CNode reaches every drive","DNode A 升级：盘交给 DNode B":"DNode A upgrades; B takes over","DNode B 升级：盘交给 DNode A":"DNode B upgrades; A takes over","CNode 升级：先迁出 VIP":"CNode upgrade: move VIPs first","示意，台数与条带宽度不代表实际配置":"Schematic, not a real configuration","两台离线，读取时重构":"Two EBoxes offline: reconstruct on read","元数据：写三份到三台":"Metadata: three copies, three boxes"};
var ARIA="EBox 的 CNode 与 DNode 容器、共享 SSD、数据保护和滚动升级";
function lang(){return window.SS_LANG==='en'?'en':'zh'}
var NS='http://www.w3.org/2000/svg';
function mount(host,opts){
opts=opts||{};
host.classList.add('ssa-v-ebox');host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','ssa-scene');svg.setAttribute('role','img');host.appendChild(svg);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mq=matchMedia('(max-width: 640px)');
const ROOT=window.SS_ROOT||'';
function T(s){if(lang()!=='en')return s;if(L&&L.mobile&&ENM[s]!==undefined)return ENM[s];return EN[s]!==undefined?EN[s]:s}
/* ---------- 通用小工具 ---------- */
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
/* VAST 字标：引用品牌原件，浅色用黑、深色用白（CSS 切换）。(x,y) 为字标竖直中线上的起点，h 为高度 */
function vmark(x,y,h,p){const w=h*66/14,g=el('g',{class:'vwm'},p);
  [['l','black'],['d','white']].forEach(([k,c])=>el('image',{href:ROOT+'assets/brand/vast-wordmark-'+c+'.svg',x:x.toFixed(1),y:(y-h/2).toFixed(1),width:w.toFixed(1),height:h,class:'vwm-'+k},g));return g}
let L=null,E,S,step=0,T0=0,raf=0,last=0,paused=!!opts.paused,dead=false,pausedAt=0;
function pk(cls){const r=el('rect',{x:-L.pw/2,y:-L.ph/2,width:L.pw,height:L.ph,rx:4,class:'pkt '+(cls||'')},E.pk);const o={el:r};S.items.push(o);put(o,-99,-99,0);return o}
function dot(cls){const r=el('circle',{r:L.dr,cx:0,cy:0,class:'dot '+(cls||'')},E.pk);const o={el:r};S.items.push(o);put(o,-99,-99,0);return o}
function put(o,x,y,a){if(typeof x==='object'){a=y;y=x.y;x=x.x}o.el.setAttribute('transform',`translate(${x.toFixed(1)} ${y.toFixed(1)})`);o.el.style.opacity=a==null?1:a}
function run(o,pts,t,t0,dur,fo){fo=fo==null?0.3:fo;if(t<t0||t>t0+dur+fo){put(o,-99,-99,0);return -1}const u=(t-t0)/dur;if(u<=1){put(o,at(pts,u),1);return u}put(o,pts[pts.length-1],1-(t-t0-dur)/fo);return 1.5}
const dur=pts=>plen(pts)/L.sp;
/* ---------- 版式 ---------- */
const N=5;
function layout(mobile){
  if(!mobile){
    const L0={W:960,H:430,mobile:false,f:{lbl:20,sm:17,cap:18,ttl:17},pw:20,ph:15,dr:7,sp:300,cap:{x:944,y:20},bot:{x:480,y:404},leg:{y:366},fabLbl:{x:16,y:330,a:'start'}};
    const fabY=302;L0.fab=[{y:fabY,x1:16,x2:944}];L0.trunk=null;
    L0.box=[];for(let i=0;i<N;i++){const x=16+i*188,y=44,w=176;
      const b={i,frame:{x,y,w,h:222},title:P(x+12,y+20),cn:{x:x+12,y:y+36,w:w-24,h:44},fabY};
      const cc=C(b.cn);b.cnPath=[cc,P(x+22,cc.y),P(x+22,fabY)];
      b.dn=[{x:x+14,y:y+172,w:76,h:36},{x:x+94,y:y+172,w:76,h:36}];
      b.barY=y+158;b.dr=[];b.dnPath=[];
      b.dn.forEach((d,k)=>{const dc=C(d);b.dnPath.push([dc,P(dc.x,fabY)]);[-14,14].forEach(o=>b.dr.push({k,r:{x:dc.x+o-11,y:y+104,w:22,h:42}}))});
      L0.box.push(b)}
    return L0;
  }
  const L0={W:480,H:676,mobile:true,f:{lbl:18,sm:17,cap:17,ttl:17},pw:18,ph:14,dr:6,sp:230,cap:{x:468,y:18},bot:{x:240,y:652},leg:{y:622},fabLbl:{x:468,y:602,a:'end'}};
  L0.fab=[];L0.trunk=6;L0.box=[];
  for(let i=0;i<N;i++){const x=16,y=40+i*112,w=452,fabY=y+100;
    const b={i,frame:{x,y,w,h:86},title:P(x+12,y+15),cn:{x:x+12,y:y+28,w:110,h:48},fabY};
    const cc=C(b.cn);b.cnPath=[cc,P(cc.x,fabY)];
    b.dn=[{x:x+150,y:y+48,w:136,h:28},{x:x+302,y:y+48,w:136,h:28}];
    b.barY=y+40;b.dr=[];b.dnPath=[];
    b.dn.forEach((d,k)=>{const dc=C(d);b.dnPath.push([dc,P(dc.x,fabY)]);[-34,34].forEach(o=>b.dr.push({k,r:{x:dc.x+o-18,y:y+10,w:36,h:22}}))});
    L0.box.push(b);L0.fab.push({y:fabY,x1:6,x2:b.dn[1].x+b.dn[1].w/2})}
  return L0;
}
/* 驱动器路径：从 DNode 中心上到总线再到盘；hand=true 时改由另一个 DNode 接管 */
function drPath(b,j,via){const d=b.dr[j],k=via==null?d.k:via,dn=C(b.dn[k]),dc=C(d.r);return [dn,P(dn.x,b.barY),P(dc.x,b.barY),dc]}
function fabRoute(a,c){if(a.y===c.y)return [a,c];return [a,P(L.trunk,a.y),P(L.trunk,c.y),c]}
/* 从第 i 台的 CNode 到第 b 台的第 j 块盘 */
function cn2dr(i,b,j,via){const A=L.box[i],B=L.box[b],k=via==null?B.dr[j].k:via;return cat(A.cnPath,fabRoute(A.cnPath[A.cnPath.length-1],B.dnPath[k][1]),rev(B.dnPath[k]),drPath(B,j,k).slice(1))}
/* ---------- 画面 ---------- */
function build(){
  L=layout(mq.matches);svg.innerHTML='';E={};svg.setAttribute('viewBox',`0 0 ${L.W} ${L.H}`);
  const f=L.f;
  const gN=grp(null);
  L.fab.forEach(s=>{E.fabL=(E.fabL||[]);E.fabL.push(poly([P(s.x1,s.y),P(s.x2,s.y)],'',gN))});
  if(L.trunk!=null)E.fabL.push(poly([P(L.trunk,L.fab[0].y),P(L.trunk,L.fab[L.fab.length-1].y)],'',gN));
  tx(L.fabLbl.x,L.fabLbl.y,'NVMe-oF 网络',f.sm,'ink3-t',L.fabLbl.a,gN);
  E.b=L.box.map(b=>{
    const g=el('g',{class:'ebx'},gN),o={g};
    o.frame=box(b.frame,g,'box soft',14);
    o.ttl=tx(b.title.x,b.title.y,'EBox '+(b.i+1),f.ttl,'ttl','start',g);
    if(b.i===0){const lw=f.ttl*0.58*6+4;E.mark=vmark(b.title.x+lw,b.title.y,L.mobile?11:12,g)}
    o.cnL=poly(b.cnPath,'',g);
    o.dnL=b.dnPath.map(p=>poly(p,'',g));
    o.bar=[0,1].map(k=>{const xs=b.dr.filter(d=>d.k===k).map(d=>C(d.r).x),dc=C(b.dn[k]).x;return poly([P(Math.min(dc,...xs),b.barY),P(Math.max(dc,...xs),b.barY)],'thin',g)});
    o.drL=b.dr.map(d=>{const dc=C(d.r);return poly([P(dc.x,b.barY),P(dc.x,d.r.y+d.r.h)],'thin',g)});
    o.upL=b.dn.map(d=>poly([P(C(d).x,d.y),P(C(d).x,b.barY)],'thin',g));
    /* 换手：另一侧 DNode 接管时用的连线（只在第 6 步出现） */
    o.hand=[0,1].map(k=>{const xs=b.dr.filter(d=>d.k!==k).map(d=>C(d.r).x),dc=C(b.dn[k]).x;return poly([P(dc,b.barY),P(xs[k?0:1],b.barY)],'thin hand',g)});
    o.cn=box(b.cn,g,'box',8);o.cnT=tx(C(b.cn).x,C(b.cn).y,'CNode',f.lbl,'lbl b7','middle',g);
    o.dn=b.dn.map((d,k)=>{const r=box(d,g,'box',8);tx(C(d).x,C(d).y,k?'DNode B':'DNode A',f.sm,'lbl','middle',g);return r});
    o.dr=b.dr.map(d=>el('rect',{x:d.r.x,y:d.r.y,width:d.r.w,height:d.r.h,rx:4,class:'disk'},g));
    const fc=C(b.frame),a=Math.min(b.frame.h,b.frame.w)*0.28;
    o.x=el('g',{class:'xm'},g);poly([P(fc.x-a,fc.y-a),P(fc.x+a,fc.y+a)],'xmark',o.x);poly([P(fc.x-a,fc.y+a),P(fc.x+a,fc.y-a)],'xmark',o.x);
    return o});
  E.cap=tx(L.cap.x,L.cap.y,'',f.cap,'st','end');
  E.bot=tx(L.bot.x,L.bot.y,'',f.sm,'ink2-t','middle');
  /* 图例（第 4、5 步） */
  const lg=grp('4 5');const ly=L.leg.y,lx0=L.mobile?24:250,step=L.mobile?140:160;
  [['数据','pkt'],['校验','pkt par'],['元数据','dot v']].forEach(([s,c],i)=>{const x=lx0+i*step;
    if(c.startsWith('dot'))el('circle',{cx:x+10,cy:ly,r:L.dr,class:c},lg);else el('rect',{x:x,y:ly-L.ph/2,width:L.pw,height:L.ph,rx:4,class:c},lg);
    tx(x+28,ly,s,f.sm,'ink2-t','start',lg)});
  E.vip=el('g',{class:'vip'});const vr=el('rect',{x:-26,y:-13,width:52,height:26,rx:13,class:'viptag'},E.vip);tx(0,1,'VIP',f.sm,'vipt','middle',E.vip);E.vip.style.opacity=0;
  E.pk=el('g',{});
  svg.setAttribute('aria-label',T(ARIA));
  if(opts.onLayout)opts.onLayout(L.W/L.H,L.mobile);
}
function cap(s,c){E.cap.textContent=T(s);E.cap.setAttribute('class','st '+(c||''))}
function bot(s,c){E.bot.textContent=T(s);E.bot.setAttribute('class','st '+(c||'ink2-t'))}
function reset(){
  svg.querySelectorAll('.ln').forEach(l=>l.classList.remove('lit','dead','on'));
  svg.querySelectorAll('.disk').forEach(d=>d.classList.remove('w','lit','off','par','meta'));
  svg.querySelectorAll('.box').forEach(d=>d.classList.remove('on','ok','dead','hot','upg'));
  E.b.forEach(o=>{o.g.classList.remove('dim','off');o.x.style.opacity=0;o.hand.forEach(h=>h.style.opacity=0)});
  E.vip.style.opacity=0;cap('');bot('');
}
function offline(i){const o=E.b[i];o.g.classList.add('off');o.x.style.opacity=1;o.frame.classList.add('hot')}
function flash(b,j,on,c){E.b[b].dr[j].classList.toggle(c||'w',!!on)}
/* ---------- 各步 ---------- */
const M=[];
/* 1：一台服务器里三个容器 */
M[0]={enter(){for(let i=1;i<N;i++)E.b[i].g.classList.add('dim');bot('一台标准服务器，三个容器')},
 frame(t){const ph=Math.floor((t%7.5)/2.5),o=E.b[0];
  o.cn.classList.toggle('on',ph===0);o.cnL.classList.toggle('lit',ph===0);
  [0,1].forEach(k=>{const on=ph===k+1;o.dn[k].classList.toggle('on',on);o.dnL[k].classList.toggle('lit',on);o.bar[k].classList.toggle('lit',on);o.upL[k].classList.toggle('lit',on);
    L.box[0].dr.forEach((d,j)=>{if(d.k===k){o.dr[j].classList.toggle('lit',on);o.drL[j].classList.toggle('lit',on)}})});
  cap(['CNode 容器：跑存储逻辑','DNode A：接一半盘','DNode B：接另一半盘'][ph],'slate-t')}};
/* 2：盘对整个集群共享 */
const R2=[[0,3,1],[2,0,2],[4,1,0],[1,4,3],[3,2,1],[0,2,3]];
M[1]={enter(){cap('每个 CNode 都能读写每一台的盘','slate-t');E.fabL.forEach(l=>l.classList.add('lit'));S.v.p=[pk(),pk(),pk()]},
 frame(t){const per=3.4,k=Math.floor(t/per),u=t-k*per;
  for(let s=0;s<3;s++){const [i,b,j]=R2[(k*3+s)%R2.length],r=cn2dr(i,b,j);const p=run(S.v.p[s],r,u,0.15+s*0.25,Math.min(dur(r),2.4));
    flash(b,j,p>1)}}};
/* 3：坏一个部件，整台离线 */
const R3=[[0,3,1],[4,1,2],[1,4,0],[3,0,3]];
M[2]={enter(){cap('主板故障可使整机离线','rose-t');offline(2);bot('故障域：整台 EBox','rose-t');E.fabL.forEach(l=>l.classList.add('lit'));S.v.p=[pk(),pk()]},
 frame(t){const per=3.2,k=Math.floor(t/per),u=t-k*per;
  for(let s=0;s<2;s++){const [i,b,j]=R3[(k*2+s)%R3.length],r=cn2dr(i,b,j);const p=run(S.v.p[s],r,u,0.15+s*0.3,Math.min(dur(r),2.3));flash(b,j,p>1)}}};
/* 4：写入——数据条带每台一块、元数据三份、都到了才确认 */
const ST=[[0,0],[1,2],[2,1],[3,3],[4,0]],PAR=[3,4],MD=[[1,1],[2,3],[4,2]];
M[3]={enter(){S.v.c=ST.map((s,q)=>pk(PAR.indexOf(q)>-1?'par':''));S.v.m=MD.map(()=>dot('v'));bot('示意，台数与条带宽度不代表实际配置','ink3-t')},
 frame(t){const per=9,u=t%per;
  const rs=ST.map(([b,j])=>cn2dr(0,b,j)),rm=MD.map(([b,j])=>cn2dr(0,b,j));
  let all=true;
  rs.forEach((r,q)=>{const p=run(S.v.c[q],r,u,0.3+q*0.12,Math.min(dur(r),2.4),0);const [b,j]=ST[q];
    const done=u>0.3+q*0.12+Math.min(dur(r),2.4);E.b[b].dr[j].classList.toggle(PAR.indexOf(q)>-1?'par':'w',done);if(!done)all=false});
  rm.forEach((r,q)=>{const t0=3.3+q*0.15,p=run(S.v.m[q],r,u,t0,Math.min(dur(r),2.4),0);const [b,j]=MD[q];
    const done=u>t0+Math.min(dur(r),2.4);E.b[b].dr[j].classList.toggle('meta',done);if(!done)all=false});
  E.fabL.forEach(l=>l.classList.toggle('lit',u>0.3&&u<6.2));
  E.b[0].cn.classList.toggle('ok',all&&u<per-0.4);
  cap(u<3.3?'数据条带：每台放一块':(all?'写入完成，确认请求':'元数据：写三份到三台'),all?'sage-t':(u<3.3?'slate-t':'violet-t'))}};
/* 5：两台同时离线，照样能读 */
const RD=[[0,0],[2,1],[4,0]];
M[4]={enter(){offline(1);offline(3);cap('两台离线，读取时重构','sage-t');bot('从剩余条带块恢复数据','ink2-t');
  ST.forEach(([b,j],q)=>E.b[b].dr[j].classList.add(PAR.indexOf(q)>-1?'par':'w'));MD.forEach(([b,j])=>E.b[b].dr[j].classList.add('meta'));
  S.v.c=RD.map((x,q)=>pk(q===2?'par':''));S.v.m=dot('v')},
 frame(t){const per=5.2,u=t%per;
  const rs=RD.map(([b,j])=>rev(cn2dr(0,b,j)));
  let n=0;rs.forEach((r,q)=>{const p=run(S.v.c[q],r,u,0.3+q*0.15,Math.min(dur(r),2.4),0.25);if(p>1)n++});
  const rm=rev(cn2dr(0,2,3));run(S.v.m,rm,u,0.2,Math.min(dur(rm),2.4),0.25);
  E.fabL.forEach(l=>l.classList.toggle('lit',u>0.2&&u<3.2));
  E.b[0].cn.classList.toggle('ok',u>3.0&&u<per-0.5)}};
/* 6：滚动升级：先 CNode，再两个 DNode 轮流把盘交给对方 */
M[5]={enter(){for(let i=0;i<N;i++)if(i!==1&&i!==3)E.b[i].g.classList.add('dim');S.v.p=pk();E.vip.style.opacity=1},
 frame(t){const per=12,u=t%per,ph=Math.floor(u/3),o=E.b[1];
  o.cn.classList.toggle('upg',ph===0&&u<2);o.cn.classList.toggle('ok',ph===0&&u>=2);
  /* VIP 先迁到其他在线节点，更新后回到本节点。 */
  const target=L.box[ph===0&&u<2.5?3:1].title;
  E.vip.setAttribute('transform',`translate(${target.x+(L.mobile?88:98)} ${target.y})`);
  const off=ph===1?0:(ph===2?1:-1);
  [0,1].forEach(k=>{o.dn[k].classList.toggle('upg',off===k);o.dn[k].classList.toggle('ok',ph===3);o.dnL[k].classList.toggle('dead',off===k);o.upL[k].classList.toggle('dead',off===k);o.bar[k].classList.toggle('dead',off===k);
    o.hand[k].style.opacity=off===(1-k)?1:0;o.hand[k].classList.toggle('lit',off===(1-k))});
  cap(['CNode 升级：先迁出 VIP','DNode A 升级：盘交给 DNode B','DNode B 升级：盘交给 DNode A','DNode 升级完成'][ph],ph===3?'sage-t':'ochre-t');
  /* 期间别的 CNode 照样读写这台的盘 */
  const tt=u%3,j=[1,0,3,2][ph],via=off>-1?1-off:null,r=cn2dr(3,1,j,via);const p=run(S.v.p,r,tt,0.2,Math.min(dur(r),2.2));
  o.dr.forEach((d,jj)=>d.classList.toggle('w',jj===j&&p>1))}};
/* ---------- 引擎 ---------- */
function applyVis(){svg.setAttribute('data-step',step+1);svg.querySelectorAll('[data-show]').forEach(g=>g.classList.toggle('hid',!g.dataset.show.split(' ').includes(String(step+1))))}
function newSim(){if(S)S.items.forEach(o=>o.el.remove());S={items:[],v:{}}}
function loop(now){last=now;const t=Math.max(0,(now-T0)/1000);M[step].frame(t);raf=requestAnimationFrame(loop)}
function go(){cancelAnimationFrame(raf);if(paused||dead||reduce)return;last=performance.now();raf=requestAnimationFrame(loop)}
const STILL=[5.5,2.6,2.6,7.6,3.6,4.2];
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
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('ssa-v-ebox')},
  ratio(){return L.W/L.H},
  step(){return step}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['v-ebox']={steps:6,mount:mount};
})();
