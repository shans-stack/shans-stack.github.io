/* DBox：内部没有单点的全闪存储箱：6 步动画（SVG，按时间写死的时间线，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-dbox'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-dbox.css，全部限定在 .ssa-v-dbox 容器之内。 */
(function(){
var EN={"NVMe-oF 网络": "NVMe-oF network", "PCIe 交换芯片": "PCIe switch", "PCIe 交换": "PCIe switch", "只转发": "Forward only", "归 DNode A": "Owned by DNode A", "归 DNode B": "Owned by DNode B", "改归 DNode A": "Moved to DNode A", "改归 DNode B": "Moved to DNode B", "改接中": "Remapping", "一条条带：每一片落在不同的盘上": "One stripe: every piece on a different drive", "少量 SCM 盘做写缓冲，大量 QLC 盘长期存数据": "A few SCM drives buffer writes; many QLC drives hold the data long term", "CNode 里计算，DNode 只转发": "CNodes compute; DNodes only forward", "两个 DNode 同时在线": "Both DNodes online", "DNode B 在线": "DNode B online", "DNode B 下线，通道改接到 DNode A": "DNode B offline; its lanes move to DNode A", "全部盘经 DNode A 照常读写": "Every drive still served through DNode A", "DNode 坏：盘一块不少": "A DNode fails: no drive is lost", "盘坏：只少这一块": "A drive fails: only that drive is lost", "CNode 切片、算校验（赭黄边），每片放一块盘": "The CNode slices the data and adds parity (ochre edge), one piece per drive", "八片落在八块不同的盘上": "Eight pieces on eight different drives", "坏一块盘：这条条带只少一片": "One drive fails: the stripe loses one piece", "VAST DBox：两个 DNode 经 PCIe 交换芯片各管一半盘，一个坏了另一个接管，一次故障最多带走一块盘": "VAST DBox: two DNodes each serve half the drives through a PCIe switch; if one fails the other takes over, and one fault takes out at most one drive"};
var ENM={"少量 SCM 盘做写缓冲，大量 QLC 盘长期存数据": "Few SCM drives buffer writes; QLC holds the data", "CNode 切片、算校验（赭黄边），每片放一块盘": "Slices + parity (ochre), one per drive"};
var ARIA="VAST DBox：两个 DNode 经 PCIe 交换芯片各管一半盘，一个坏了另一个接管，一次故障最多带走一块盘";
function lang(){return window.SS_LANG==='en'?'en':'zh'}
var NS='http://www.w3.org/2000/svg';
function mount(host,opts){
opts=opts||{};
host.classList.add('ssa-v-dbox');host.innerHTML='';
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
/* DBox：两个 DNode、PCIe 交换芯片、一次故障最多带走一块盘 */
function run(o,pts,t,t0,dur,fo){fo=fo==null?0.3:fo;if(t<t0||t>t0+dur+fo){put(o,-99,-99,0);return -1}const u=(t-t0)/dur;if(u<=1){put(o,at(pts,u),1);return u}put(o,pts[pts.length-1],1-(t-t0-dur)/fo);return 1.5}
const SCENE={
 still:[1.8,1.8,2.6,5.0,2.2,6.0],
 layout(mobile){
  if(!mobile)return {W:960,H:494,mobile:false,f:{lbl:20,sm:17,cap:18},pw:24,ph:18,dr:7,sp:320,
   cn:{cxs:[240,480,720],w:150,h:50,y:16},netY:98,netX:[100,860],netLbl:{x:860,y:82,a:'end'},
   db:{x:100,y:124,w:760,h:324},ttl:{x:118,y:146},
   dn:{cxs:[285,565],w:160,h:52,y:160},
   sw:{x:140,y:250,w:570,h:40},swLbl:{x:722,y:270,a:'start',s:'PCIe 交换芯片'},
   dr:{x0:150,w:46,gap:10,y:336,h:64},halfY:424,cap:{x:480,y:474},
   ov:{cn:{cx:480,y:16,w:200,h:56},netY:110,boxes:[100,500],bw:360,by:150,bh:200,dnW:120,dnH:38,dnDy:24,barDy:92,drW:34,drGap:10,drDy:110,drH:62,lblY:406}};
  return {W:480,H:466,mobile:true,f:{lbl:18,sm:17,cap:17},pw:20,ph:15,dr:6,sp:210,
   cn:{cxs:[82,240,398],w:130,h:44,y:10},netY:80,netX:[8,472],netLbl:{x:161,y:67,a:'middle'},
   db:{x:8,y:100,w:464,h:296},ttl:{x:20,y:118},
   dn:{cxs:[135,345],w:130,h:46,y:132},
   sw:{x:26,y:220,w:428,h:36},swLbl:{x:240,y:200,a:'middle',s:'PCIe 交换'},
   dr:{x0:33,w:36,gap:6,y:290,h:56},halfY:370,cap:{x:240,y:438},
   ov:{cn:{cx:240,y:10,w:160,h:44},netY:80,boxes:[8,246],bw:226,by:104,bh:176,dnW:90,dnH:32,dnDy:26,barDy:70,drW:22,drGap:6,drDy:84,drH:52,lblY:304}};
 },
 build(){
  const f=L.f;
  const xm=(c,a,b,p)=>{const g=el('g',{},p);[[-1,-1,1,1],[-1,1,1,-1]].forEach(([q,r,s,t])=>el('line',{x1:c.x+q*b,y1:c.y+r*a,x2:c.x+s*b,y2:c.y+t*a,class:'xmark'},g));g.style.opacity=0;return g};
  /* ---- 放大的一台 DBox（第 1–5 步） ---- */
  const g=grp('1 2 3 4 5');
  E.cn=L.cn.cxs.map(x=>({x:x-L.cn.w/2,y:L.cn.y,w:L.cn.w,h:L.cn.h}));
  E.cn.forEach(r=>line(P(r.x+r.w/2,r.y+r.h),P(r.x+r.w/2,L.netY),'',g));
  line(P(L.netX[0],L.netY),P(L.netX[1],L.netY),'',g);
  tx(L.netLbl.x,L.netLbl.y,'NVMe-oF 网络',f.sm,'ink3-t',L.netLbl.a,g);
  E.cnB=E.cn.map(r=>{const b=box(r,g);tx(r.x+r.w/2,r.y+r.h/2,'CNode',f.lbl,'lbl b7','middle',g);return b});
  box({x:L.db.x,y:L.db.y,w:L.db.w,h:L.db.h},g,'box soft',16);tx(L.ttl.x,L.ttl.y,'DBox',f.sm,'ttl','start',g);
  const sw=L.sw;E.sw=box({x:sw.x,y:sw.y,w:sw.w,h:sw.h},g,'box',8);tx(L.swLbl.x,L.swLbl.y,L.swLbl.s,f.sm,'ink2-t',L.swLbl.a,g);
  E.dn=L.dn.cxs.map(x=>({x:x-L.dn.w/2,y:L.dn.y,w:L.dn.w,h:L.dn.h}));
  E.dnV=[];E.dnS=[];E.dnB=[];E.dnT=[];E.dnSub=[];E.dnX=[];
  E.dn.forEach((r,j)=>{const x=r.x+r.w/2;E.dnV.push(line(P(x,L.netY),P(x,r.y),'',g));E.dnS.push(line(P(x,r.y+r.h),P(x,sw.y),'',g))});
  const D=L.dr;E.drx=[];for(let k=0;k<10;k++)E.drx.push(D.x0+D.w/2+k*(D.w+D.gap));
  E.drop=E.drx.map(x=>line(P(x,sw.y+sw.h),P(x,D.y),'',g));
  E.drs=E.drx.map((x,k)=>el('rect',{x:x-D.w/2,y:D.y,width:D.w,height:D.h,rx:6,class:'disk'+(k%5===0?' scm':'')},g));
  E.dn.forEach((r,j)=>{const c=C(r);E.dnB.push(box(r,g,'box',10));E.dnT.push(tx(c.x,c.y,'DNode '+'AB'[j],f.lbl,'lbl','middle',g));E.dnSub.push(tx(c.x,c.y+12,'只转发',f.sm,'slate-t st','middle',grp('2',g)));E.dnX.push(xm(c,r.h*0.32,r.w*0.2,g))});
  E.drX=xm(P(E.drx[7],D.y+D.h/2),D.h*0.3,D.w*0.34,g);
  /* 第 1 步盘的类型标签 */
  const g1=grp('1',g);[0,5].forEach(k=>tx(E.drx[k],L.halfY,'SCM',f.sm,'ochre-t st','middle',g1));
  [[1,4],[6,9]].forEach(([a,b])=>tx((E.drx[a]+E.drx[b])/2,L.halfY,'QLC',f.sm,'ink3-t st','middle',g1));
  /* 第 3–5 步归属标签 */
  const g3=grp('3 4 5',g);E.half=[0,1].map(j=>tx(L.dn.cxs[j],L.halfY,'',f.sm,'st','middle',g3));
  /* ---- 全景：一台 CNode、两台 DBox（第 6 步） ---- */
  const O=L.ov,go=grp('6');E.go=go;
  const oc={x:O.cn.cx-O.cn.w/2,y:O.cn.y,w:O.cn.w,h:O.cn.h};E.ocn=oc;
  line(P(O.cn.cx,oc.y+oc.h),P(O.cn.cx,O.netY),'',go);line(P(L.netX[0],O.netY),P(L.netX[1],O.netY),'',go);
  box(oc,go);tx(O.cn.cx,oc.y+oc.h/2,'CNode',f.lbl,'lbl b7','middle',go);
  E.oDn=[];E.oDr=[];E.oDrx=[];E.oBar=[];
  O.boxes.forEach((bx,b)=>{const r={x:bx,y:O.by,w:O.bw,h:O.bh};box(r,go,'box soft',14);tx(r.x+(L.mobile?10:14),r.y+(L.mobile?15:20),'DBox',f.sm,'ttl','start',go);
   const cx=r.x+r.w/2+(L.mobile?20:0),dn={x:cx-O.dnW/2,y:r.y+O.dnDy,w:O.dnW,h:O.dnH};E.oDn.push(dn);
   line(P(cx,O.netY),P(cx,dn.y),'',go);const barY=r.y+O.barDy;line(P(cx,dn.y+dn.h),P(cx,barY),'',go);
   const tot=8*O.drW+7*O.drGap,xs=[];for(let k=0;k<8;k++)xs.push(r.x+(r.w-tot)/2+O.drW/2+k*(O.drW+O.drGap));
   line(P(xs[0],barY),P(xs[7],barY),'',go);
   E.oDr.push(xs.map(x=>{line(P(x,barY),P(x,r.y+O.drDy),'',go);return el('rect',{x:x-O.drW/2,y:r.y+O.drDy,width:O.drW,height:O.drH,rx:5,class:'disk'},go)}));
   E.oDrx.push(xs);E.oBar.push(barY);
   box(dn,go,'box',8);tx(cx,dn.y+dn.h/2,'DNode',f.sm,'lbl','middle',go)});
  tx(L.W/2,O.lblY,'一条条带：每一片落在不同的盘上',f.sm,'ink2-t','middle',go);
  E.oX=xm(P(E.oDrx[1][3],O.by+O.drDy+O.drH/2),O.drH*0.3,O.drW*0.4,go);
  E.cap=tx(L.cap.x,L.cap.y,'',f.cap,'st','middle');
  /* 路线 */
  E.route=(i,d,j)=>{const c=C(E.cn[i]),dn=E.dn[j],x=dn.x+dn.w/2,sy=sw.y+sw.h/2,dx=E.drx[d];
   return [c,P(c.x,E.cn[i].y+E.cn[i].h),P(c.x,L.netY),P(x,L.netY),P(x,dn.y),C(dn),P(x,sw.y),P(x,sy),P(dx,sy),P(dx,sw.y+sw.h),P(dx,D.y+D.h/2)]};
  E.oRoute=(b,d)=>{const c=P(O.cn.cx,oc.y+oc.h/2),dn=E.oDn[b],x=dn.x+dn.w/2,dx=E.oDrx[b][d];
   return [c,P(c.x,oc.y+oc.h),P(c.x,O.netY),P(x,O.netY),P(x,dn.y),C(dn),P(x,E.oBar[b]),P(dx,E.oBar[b]),P(dx,O.by+O.drDy+O.drH/2)]};
 },
 reset(){
  svg.querySelectorAll('.ln').forEach(l=>l.classList.remove('lit','ok','dead','lA','lB'));
  svg.querySelectorAll('.disk').forEach(d=>{d.classList.remove('w','lit','off','bad');d.style.opacity=''});
  svg.querySelectorAll('.box').forEach(d=>d.classList.remove('on','ok','dead','hot'));
  E.dnX.forEach(x=>x.style.opacity=0);E.drX.style.opacity=0;E.oX.style.opacity=0;E.cap.textContent='';E.cap.style.opacity=1;E.pk.style.opacity=1;
  E.dnT.forEach((t,j)=>{t.setAttribute('y',C(E.dn[j]).y);t.style.opacity=1});E.half.forEach(h=>h.textContent='');
 },
 modes:[]
};
function cap(s,c){E.cap.textContent=T(s);E.cap.setAttribute('class','st '+c)}
const dur=pts=>plen(pts)/L.sp;
function own(a){/* a: 每块盘归哪个 DNode（0/1） */E.drop.forEach((l,k)=>{l.classList.toggle('lA',a[k]===0);l.classList.toggle('lB',a[k]===1)})}
function owner(j,dead){/* 设置 DNode j 死活 */E.dnB[j].classList.toggle('dead',dead);E.dnX[j].style.opacity=dead?1:0;E.dnT[j].style.opacity=dead?0.35:1;E.dnV[j].classList.toggle('dead',dead);E.dnS[j].classList.toggle('dead',dead)}
/* 连续数据流：每隔 gap 秒发一块；pick(n) 给出 [CNode, 盘, DNode] 或 null */
function stream(t,gap,pick,lifetime){
 if(!S.v.pool){S.v.pool=[];for(let k=0;k<14;k++)S.v.pool.push(pk())}
 const hot=new Set(),n1=Math.floor(t/gap),n0=Math.max(0,Math.floor((t-lifetime)/gap));
 const used=new Set();
 for(let n=n0;n<=n1;n++){const q=pick(n);if(!q)continue;const [i,d,j]=q,r=E.route(i,d,j),o=S.v.pool[n%14];used.add(o);
  const p=run(o,r,t,n*gap,Math.min(dur(r),2.2),0.3);cls(o,'v',j===1&&S.v.cb);if(p>1)hot.add(d)}
 S.v.pool.forEach(o=>{if(!used.has(o))put(o,-99,-99,0)});
 E.drs.forEach((x,k)=>x.classList.toggle('w',hot.has(k)));
}
/* 第 1 步：数据都落进 DBox */
const T1=[[0,0],[1,6],[2,3],[1,5],[0,8],[2,1]];
SCENE.modes[0]={enter(){cap('少量 SCM 盘做写缓冲，大量 QLC 盘长期存数据','ink2-t')},
 frame(t){stream(t,1.3,n=>{const [i,d]=T1[n%T1.length];return [i,d,d<5?0:1]},2.6)}};
/* 第 2 步：CNode 算，DNode 只转发 */
SCENE.modes[1]={enter(){cap('CNode 里计算，DNode 只转发','slate-t');E.dnT.forEach((t,j)=>t.setAttribute('y',C(E.dn[j]).y-11));S.v.b=pk()},
 frame(t){const per=3.4,k=Math.floor(t/per),u=t-k*per,[i,d]=T1[k%T1.length],r=E.route(i,d,d<5?0:1),dd=Math.min(dur(r),2.2);
  E.cnB.forEach((b,j)=>b.classList.toggle('on',j===i&&u<0.6));
  if(u<0.6)put(S.v.b,r[0],Math.min(1,u/0.15));else{const p=run(S.v.b,r,u,0.6,dd);E.drs.forEach((x,kk)=>x.classList.toggle('w',kk===d&&p>1))}}};
/* 第 3 步：两个 DNode 各管一半 */
const A3=[0,0,0,0,0,1,1,1,1,1];
function half(a,b){E.half[0].textContent=T(a[0]);E.half[0].setAttribute('class','st '+a[1]);E.half[1].textContent=T(b[0]);E.half[1].setAttribute('class','st '+b[1])}
SCENE.modes[2]={enter(){S.v.cb=1;cap('两个 DNode 同时在线','slate-t');own(A3);half(['归 DNode A','slate-t'],['归 DNode B','violet-t'])},
 frame(t){stream(t,0.45,n=>n%2?[(n>>1)%3,5+((n>>1)*3)%5,1]:[((n>>1)+1)%3,((n>>1)*2)%5,0],2.6)}};
/* 第 4 步：DNode B 下线，PCIe 交换芯片改接 */
SCENE.modes[3]={enter(){S.v.cb=1;cap('DNode B 在线','slate-t');own(A3);half(['归 DNode A','slate-t'],['归 DNode B','violet-t'])},
 frame(t){const per=10,u=t%per,fail=2.4;
  owner(1,u>=fail);
  const a=A3.map((o,k)=>o===1&&u>=fail+0.3+(k-5)*0.2?0:o);own(a);
  const moved=u>=fail+0.3+4*0.2+0.2;
  if(u<fail)cap('两个 DNode 同时在线','slate-t');else if(!moved)cap('DNode B 下线，通道改接到 DNode A','rose-t');else cap('全部盘经 DNode A 照常读写','sage-t');
  half(['归 DNode A','slate-t'],moved?['改归 DNode A','slate-t']:u>=fail?['改接中','rose-t']:['归 DNode B','violet-t']);
  E.pk.style.opacity=u>per-0.5?Math.max(0,(per-u)/0.5):u<0.3?u/0.3:1;
  stream(u,0.45,n=>{const tt=n*0.45;if(n%2){if(tt<1.2)return [(n>>1)%3,5+((n>>1)*3)%5,1];if(tt>moved_t())return [(n>>1)%3,5+((n>>1)*3)%5,0];return null}
   return [((n>>1)+1)%3,((n>>1)*2)%5,0]},2.6)}};
function moved_t(){return 2.4+0.3+4*0.2+0.2}
/* 第 5 步：两种故障轮流 */
SCENE.modes[4]={enter(){S.v.cb=1},
 frame(t){const per=9,u=t%per,ph=u<4.5?0:1,v=u-ph*4.5;
  owner(0,ph===0);owner(1,false);
  own(ph===0?A3.map(()=>1):A3);
  half(ph===0?['改归 DNode B','violet-t']:['归 DNode A','slate-t'],['归 DNode B','violet-t']);
  E.drX.style.opacity=ph===1?1:0;E.drop[7].classList.toggle('dead',ph===1);E.drs[7].classList.toggle('bad',ph===1);E.drs[7].style.opacity=ph===1?0.45:'';
  cap(ph===0?'DNode 坏：盘一块不少':'盘坏：只少这一块',ph===0?'sage-t':'rose-t');
  E.pk.style.opacity=v>4.1?Math.max(0,(4.5-v)/0.4):v<0.3?v/0.3:1;
  stream(v,0.42,n=>{const i=n%3,d=ph===0?(n*3)%10:[0,5,1,6,2,8,3,9,4,5][n%10];if(ph===1&&d===7)return null;return [i,d,ph===0?1:(d<5?0:1)]},2.6)}};
/* 第 6 步：条带按盘来铺 */
const P6=[[0,0],[1,1],[0,2],[1,3],[0,4],[1,5],[0,6],[1,7]];
SCENE.modes[5]={enter(){S.v.p=P6.map((q,j)=>pk(j>=6?'par':''))},
 frame(t){const per=9,u=t%per,bad=u>5.6,ff=u>8.4?Math.max(0,(per-u)/0.6):1;
  P6.forEach(([b,d],j)=>{const r=E.oRoute(b,d),t0=0.3+j*0.45,dd=Math.min(dur(r),1.8);const o=S.v.p[j];
   if(u<t0+dd)run(o,r,u,t0,dd,0);else put(o,r[r.length-1],(bad&&b===1&&d===3?0.3:1)*ff);
   E.oDr[b][d].classList.toggle('lit',u>t0+dd&&!(bad&&b===1&&d===3))});
  E.oX.style.opacity=bad?ff:0;E.oDr[1][3].classList.toggle('bad',bad);
  cap(u<0.3+7*0.45+1.8?'CNode 切片、算校验（赭黄边），每片放一块盘':bad?'坏一块盘：这条条带只少一片':'八片落在八块不同的盘上',bad?'rose-t':'slate-t');
  E.cap.style.opacity=ff}};
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
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('ssa-v-dbox')},
  ratio(){return L.W/L.H},
  step(){return step},
  sim(){return {step,v:S.v,n:S.items.length,t:(performance.now()-T0)/1000}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['v-dbox']={steps:7,mount:mount, figures: {
 "ceres-v2": [
  [
   [
    "机箱",
    "Chassis"
   ],
   [
    "1U · 2 × DTray",
    "1U · 2 × DTray"
   ]
  ],
  [
   [
    "每托盘",
    "Per Tray"
   ],
   [
    "1 × BlueField-3",
    "1 × BlueField-3"
   ]
  ],
  [
   [
    "数据盘位",
    "Drive Positions"
   ],
   [
    "22 × E1.L + 8 × U.2 SCM",
    "22 × E1.L + 8 × U.2 SCM"
   ]
  ],
  [
   [
    "对外端口",
    "Fabric Ports"
   ],
   [
    "4 × 200GbE / IB",
    "4 × 200GbE / IB"
   ]
  ]
 ],
 "ceres-v1": [
  [
   [
    "机箱",
    "Chassis"
   ],
   [
    "1U · 2 × DTray",
    "1U · 2 × DTray"
   ]
  ],
  [
   [
    "每托盘",
    "Per Tray"
   ],
   [
    "2 × BlueField BF1600",
    "2 × BlueField BF1600"
   ]
  ],
  [
   [
    "数据盘位",
    "Drive Positions"
   ],
   [
    "22 × E1.L + 8 × U.2 SCM",
    "22 × E1.L + 8 × U.2 SCM"
   ]
  ],
  [
   [
    "对外端口",
    "Fabric Ports"
   ],
   [
    "8 × 100GbE / EDR",
    "8 × 100GbE / EDR"
   ]
  ]
 ],
 "mavericks-mlk": [
  [
   [
    "机箱",
    "Chassis"
   ],
   [
    "2U · 2 × DNode",
    "2U · 2 × DNode"
   ]
  ],
  [
   [
    "每节点",
    "Per Node"
   ],
   [
    "EPYC 7313P · ConnectX-6",
    "EPYC 7313P · ConnectX-6"
   ]
  ],
  [
   [
    "数据盘位",
    "Drive Positions"
   ],
   [
    "44 × U.2 SSD + 12 × SCM",
    "44 × U.2 SSD + 12 × SCM"
   ]
  ]
 ],
 "mavericks": [
  [
   [
    "机箱",
    "Chassis"
   ],
   [
    "2U · 2 × DNode",
    "2U · 2 × DNode"
   ]
  ],
  [
   [
    "每节点",
    "Per Node"
   ],
   [
    "2 × Broadwell · ConnectX-5",
    "2 × Broadwell · ConnectX-5"
   ]
  ],
  [
   [
    "数据盘位",
    "Drive Positions"
   ],
   [
    "44 × U.2 SSD + 12 × SCM",
    "44 × U.2 SSD + 12 × SCM"
   ]
  ]
 ]
}};
})();
