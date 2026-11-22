/* 四种存储范式：盘归谁管，状态放在哪：6 步动画（SVG，按时间写死的时间线，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-paradigm'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-paradigm.css，全部限定在 .ssa-v-paradigm 容器之内。
   VAST 字标直接引用 assets/brand/vast-wordmark-black.svg（浅色）与 vast-wordmark-white.svg（深色），不内嵌。 */
(function(){
var EN={"直接访问：一对控制器":"Reach: 2 controllers","直接访问：1 台节点":"Reach: 1 node","直接访问：1 台服务器":"Reach: 1 server","直接访问：全部 CNode":"Reach: every CNode","共享介质":"Shared media","无共享":"Shared nothing","并行文件系统":"Parallel file system","解耦全共享（DASE）":"DASE","解耦全共享":"DASE",
"方框：处理请求的控制器或节点 · 小格：盘 · 连线：能直接访问":"Boxes: controllers or nodes that handle requests · cells: drives · lines: direct access","方框：处理请求的部件 · 小格：盘":"Boxes: request handlers · cells: drives",
"四种搭法：看盘归谁管、状态放在哪":"Four models: who owns the drives, where state lives",
"客户端":"Client","控制器 A":"Controller A","控制器 B":"Controller B","盘框":"Drive shelf","工作中":"Active","备用":"Standby","接管":"Took over","共享盘组与控制器故障接管":"Shared drives and controller failover",
"节点 1":"Node 1","节点 2":"Node 2","节点 3":"Node 3","跨节点转发示例":"Example of forwarding between nodes","请求转给保存目标数据的节点":"The request is forwarded to the node that holds the data",
"专用驱动":"Dedicated driver","元数据服务器":"Metadata server","数据服务器":"Data server","布局":"Layout","按文件布局并行访问数据服务器":"Use the file layout to access the data servers in parallel",
"NVMe-oF 网络":"NVMe-oF network","DBox":"DBox","哪台 CNode 都能直接访问每一块盘":"Any CNode reaches every drive directly",
"能直接访问这块盘：一对控制器":"Reached directly by: two controllers","能直接访问这块盘：1 台节点":"Reached directly by: one node","能直接访问这块盘：1 台数据服务器":"Reached directly by: one data server","能直接访问这块盘：全部 CNode":"Reached directly by: every CNode",
"一块盘能被几台直接访问：一对、一台、全部":"How many machines reach a drive: two, one, all",
"存储架构示例：共享介质、无共享、并行文件系统、DASE":"Four storage models: shared media, shared nothing, parallel file system, and DASE"};
var ENM={"直接访问：一对控制器":"Reach: 2 controllers","直接访问：1 台节点":"Reach: 1 node","直接访问：1 台服务器":"Reach: 1 server","直接访问：全部 CNode":"Reach: every CNode","方框：处理请求的部件 · 小格：盘":"Boxes: handlers · cells: drives","四种搭法：看盘归谁管、状态放在哪":"Who owns drives, where state lives","共享盘组与控制器故障接管":"Shared drives and controller failover",
"跨节点转发示例":"Forwarding between nodes","请求转给保存目标数据的节点":"Forwarded to the node with the data","按文件布局并行访问数据服务器":"Layout first, then parallel I/O",
"哪台 CNode 都能直接访问每一块盘":"Any CNode reaches every drive","能直接访问这块盘：一对控制器":"Reached by: 2 controllers","能直接访问这块盘：1 台节点":"Reached by: 1 node","能直接访问这块盘：1 台数据服务器":"Reached by: 1 data server","能直接访问这块盘：全部 CNode":"Reached by: every CNode",
"一块盘能被几台直接访问：一对、一台、全部":"Drive reach: two, one, all","元数据服务器":"Metadata","Dedicated driver":"Own driver","并行文件系统":"Parallel FS"};
var ARIA="存储架构示例：共享介质、无共享、并行文件系统、DASE";
function lang(){return window.SS_LANG==='en'?'en':'zh'}
var NS='http://www.w3.org/2000/svg';
function mount(host,opts){
opts=opts||{};
host.classList.add('ssa-v-paradigm');host.innerHTML='';
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
 still:[1.0,6.0,2.2,3.2,1.5,0.5],
 layout(mobile){
  if(!mobile)return {W:960,H:520,mobile:false,f:{lbl:20,sm:17,cap:18,ttl:18},pw:22,ph:16,dr:7,sp:330,
   cards:[{x:24,y:20,w:444,h:204},{x:492,y:20,w:444,h:204},{x:24,y:238,w:444,h:204},{x:492,y:238,w:444,h:204}],
   mini:{uh:32,dh:30,dw:24,dg:10,uw:88,cnw:84},legend:{x:480,y:466},
   sm:{client:{x:400,y:18,w:160,h:44},busY:96,ctl:[{x:240,y:126,w:210,h:66},{x:510,y:126,w:210,h:66}],shelf:{x:220,y:262,w:520,h:162},barDy:54,drW:40,drH:56,drGap:14,drDy:76},
   sn:{client:{x:400,y:18,w:160,h:44},busY:86,xs:[200,480,760],w:200,h:64,y:110,tr:{dW:40,dH:50,dGap:14,barY:240,dY:258},note:{x:480,y:372}},
   pf:{cl:{x:30,y:180,w:200,h:96},mds:{x:380,y:30,w:260,h:64},mY:212,dY:248,xs:[420,610,800],sv:{y:290,w:170,h:58},dsk:{dw:40,dh:44,gap:12,barY:372,y:386}},
   da:{client:{x:400,y:18,w:160,h:44},busY:86,xs:[200,480,760],w:200,h:64,y:110,fabY:226,db:{xs:[250,710],w:400,h:150,y:258,barDy:50,drW:44,drH:52,drGap:16,drDy:70}},
   cap:{x:480,y:500}};
  return {W:480,H:580,mobile:true,f:{lbl:18,sm:17,cap:17,ttl:17},pw:18,ph:14,dr:6,sp:210,
   cards:[{x:8,y:8,w:228,h:250},{x:244,y:8,w:228,h:250},{x:8,y:268,w:228,h:250},{x:244,y:268,w:228,h:250}],
   mini:{uh:28,dh:28,dw:17,dg:6,uw:50,cnw:48},legend:{x:240,y:536},
   sm:{client:{x:160,y:12,w:160,h:44},busY:88,ctl:[{x:24,y:112,w:200,h:66},{x:256,y:112,w:200,h:66}],shelf:{x:16,y:262,w:448,h:170},barDy:54,drW:36,drH:56,drGap:12,drDy:76},
   sn:{client:{x:160,y:12,w:160,h:44},busY:80,xs:[82,240,398],w:142,h:62,y:100,tr:{dW:34,dH:46,dGap:9,barY:232,dY:250},note:{x:240,y:350}},
   pf:{cl:{x:14,y:14,w:206,h:90},mds:{x:262,y:14,w:204,h:90},vert:true,busY:172,xs:[82,240,398],sv:{y:204,w:142,h:56},dsk:{dw:34,dh:44,gap:10,barY:290,y:304}},
   da:{client:{x:160,y:12,w:160,h:44},busY:80,xs:[82,240,398],w:142,h:58,y:100,fabY:204,db:{xs:[122,358],w:228,h:150,y:232,barDy:48,drW:24,drH:48,drGap:8,drDy:66}},
   cap:{x:240,y:562}};
 },
 build(){
  const f=L.f,M=L.mobile,m=L.mini;
  /* ===== 第 1、6 步：四张小卡片 ===== */
  const gC=grp('1 6');E.cards=[];
  const ttl=[M?'共享介质':'共享介质','无共享','并行文件系统',M?'解耦全共享':'解耦全共享（DASE）'];
  const own=M?['直接访问：一对控制器','直接访问：1 台节点','直接访问：1 台服务器','直接访问：全部 CNode']:['能直接访问这块盘：一对控制器','能直接访问这块盘：1 台节点','能直接访问这块盘：1 台数据服务器','能直接访问这块盘：全部 CNode'];
  L.cards.forEach((r,ci)=>{const c={r,units:[],disks:[],own:[]};E.cards.push(c);
   c.box=box(r,gC,'box soft',14);tx(r.x+16,r.y+24,ttl[ci],f.ttl,'lbl b7','start',gC);if(ci===3)vmark(r.x+r.w-14,r.y+24,M?11:13,gC,'end');
   const x0=r.x+16,x1=r.x+r.w-16,cx=(x0+x1)/2,top=r.y+48,uy=top,dy=r.y+r.h-44-m.dh,barY=dy-14,ucy=uy+m.uh/2;
   c.ln=el('g',{},gC);c.hl=el('g',{},gC);
   const U=(ux,w,cls)=>{const rr={x:ux-w/2,y:uy,w,h:m.uh};c.units.push(rr);return rr};
   const Dk=(dx)=>{const rr={x:dx-m.dw/2,y:dy,w:m.dw,h:m.dh};c.disks.push(rr);return rr};
   const row=(cxx,n)=>{const tot=n*m.dw+(n-1)*m.dg,a=[];for(let k=0;k<n;k++)a.push(cxx-tot/2+m.dw/2+k*(m.dw+m.dg));return a};
   if(ci===0){[cx-(M?48:76),cx+(M?48:76)].forEach(u=>U(u,M?72:m.uw));const xs=row(cx,M?6:6);xs.forEach(Dk);
    box({x:xs[0]-m.dw/2-8,y:barY-10,w:(xs[5]-xs[0])+m.dw+16,h:dy+m.dh+8-(barY-10)},c.ln,'box soft',8);
    line(P(xs[0],barY),P(xs[5],barY),'thin',c.ln);xs.forEach(x=>line(P(x,barY),P(x,dy),'thin',c.ln));
    c.units.forEach(u=>line(P(C(u).x,uy+m.uh),P(C(u).x,barY),'thin',c.ln));
    c.path=(k,d)=>{const u=C(c.units[k]).x,x=C(c.disks[d]).x;return [P(u,uy+m.uh),P(u,barY),P(x,barY),P(x,dy)]};c.owners=d=>[0,1]}
   else if(ci===1||ci===2){const us=ci===1?[cx-(M?66:136),cx,cx+(M?66:136)]:(M?[x0+20,x0+72,x0+124,x0+174]:[x0+44,x0+156,x0+268,x0+380]);
    us.forEach((u,k)=>U(u,ci===2&&k===0?(M?36:72):(M?(ci===2?44:50):m.uw)));
    const ds=ci===1?[0,1,2]:[1,2,3];ds.forEach(k=>{const u=C(c.units[k]).x;row(u,2).forEach(x=>{Dk(x);c.own.push(k)});
     const xs=row(u,2);line(P(xs[0],barY),P(xs[1],barY),'thin',c.ln);xs.forEach(x=>line(P(x,barY),P(x,dy),'thin',c.ln));line(P(u,uy+m.uh),P(u,barY),'thin',c.ln)});
    if(ci===1)for(let k=0;k<2;k++)line(P(C(c.units[k]).x+c.units[k].w/2,ucy),P(C(c.units[k+1]).x-c.units[k+1].w/2,ucy),'thin vio',c.ln);
    c.path=(k,d)=>{const u=C(c.units[k]).x,x=C(c.disks[d]).x;return [P(u,uy+m.uh),P(u,barY),P(x,barY),P(x,dy)]};c.owners=d=>[c.own[d]]}
   else{const us=M?[x0+30,x0+96,x0+162]:[x0+70,x0+206,x0+342];us.forEach(u=>U(u,M?m.cnw:m.cnw));const fy=uy+m.uh+(M?16:14);
    line(P(x0,fy),P(x1,fy),'thin',c.ln);us.forEach(u=>line(P(u,uy+m.uh),P(u,fy),'thin',c.ln));
    const dbx=M?[x0+46,x0+146]:[x0+103,x0+309];c.dbx=dbx;dbx.forEach(bx=>{const xs=row(bx,3);xs.forEach(Dk);
     box({x:xs[0]-m.dw/2-8,y:barY-10,w:(xs[2]-xs[0])+m.dw+16,h:dy+m.dh+8-(barY-10)},c.ln,'box soft',8);
     line(P(bx,fy),P(bx,barY),'thin',c.ln);line(P(xs[0],barY),P(xs[2],barY),'thin',c.ln);xs.forEach(x=>line(P(x,barY),P(x,dy),'thin',c.ln))});
    c.path=(k,d)=>{const u=C(c.units[k]).x,x=C(c.disks[d]).x,bx=dbx[d<3?0:1];return [P(u,uy+m.uh),P(u,fy),P(bx,fy),P(bx,barY),P(x,barY),P(x,dy)]};c.owners=d=>[0,1,2]}
   c.uB=c.units.map((u,k)=>box(u,gC,ci===2&&k===0?'box ochre':'box',6));c.dB=c.disks.map(d=>el('rect',{x:d.x,y:d.y,width:d.w,height:d.h,rx:4,class:'disk'},gC));
   c.ownKey=own[ci];c.own6=tx(r.x+16,r.y+r.h-18,own[ci],f.sm,'st','start',grp('6',gC))});
  tx(L.legend.x,L.legend.y,M?'方框：处理请求的部件 · 小格：盘':'方框：处理请求的控制器或节点 · 小格：盘 · 连线：能直接访问',f.sm,'ink3-t','middle',grp('1'));
  /* ===== 第 2 步：共享介质 ===== */
  const g2=grp('2');const A=L.sm,ac=C(A.client);E.sm={};
  box(A.client,g2);tx(ac.x,ac.y,'客户端',f.lbl,'lbl','middle',g2);
  const cxs=A.ctl.map(r=>C(r).x);line(P(ac.x,A.client.y+A.client.h),P(ac.x,A.busY),'',g2);line(P(cxs[0],A.busY),P(cxs[1],A.busY),'',g2);
  E.sm.up=cxs.map(x=>line(P(x,A.busY),P(x,A.ctl[0].y),'',g2));
  const sh=A.shelf,barY=sh.y+A.barDy,drY=sh.y+A.drDy,tot=8*A.drW+7*A.drGap,drx=[];for(let k=0;k<8;k++)drx.push(C(sh).x-tot/2+A.drW/2+k*(A.drW+A.drGap));
  box(sh,g2,'box soft',14);tx(sh.x+14,sh.y+22,'盘框',f.sm,'ttl','start',g2);
  E.sm.dn=cxs.map((x,i)=>line(P(x,A.ctl[i].y+A.ctl[i].h),P(x,barY),'',g2));line(P(drx[0],barY),P(drx[7],barY),'',g2);
  E.sm.dk=drx.map(x=>{line(P(x,barY),P(x,drY),'',g2);return el('rect',{x:x-A.drW/2,y:drY,width:A.drW,height:A.drH,rx:5,class:'disk'},g2)});
  E.sm.cb=A.ctl.map((r,i)=>box(r,g2));E.sm.cl=A.ctl.map((r,i)=>tx(C(r).x,C(r).y-11,i?'控制器 B':'控制器 A',f.lbl,'lbl b7','middle',g2));
  E.sm.sub=A.ctl.map(r=>tx(C(r).x,C(r).y+15,'',f.sm,'st','middle',g2));
  E.sm.x=xmark(C(A.ctl[0]),A.ctl[0].h*0.3,A.ctl[0].w*0.14,g2);E.sm.x.style.opacity=0;
  E.sm.path=(i,d)=>[P(ac.x,A.client.y+A.client.h),P(ac.x,A.busY),P(cxs[i],A.busY),P(cxs[i],C(A.ctl[i]).y),P(cxs[i],barY),P(drx[d],barY),P(drx[d],drY+A.drH/2)];
  /* ===== 第 3 步：无共享 ===== */
  const g3=grp('3');const B=L.sn,bc=C(B.client),ncy=B.y+B.h*0.76,TR=B.tr;E.sn={};
  box(B.client,g3);tx(bc.x,bc.y,'客户端',f.lbl,'lbl','middle',g3);
  line(P(bc.x,B.client.y+B.client.h),P(bc.x,B.busY),'',g3);line(P(B.xs[0],B.busY),P(B.xs[2],B.busY),'',g3);B.xs.forEach(x=>line(P(x,B.busY),P(x,B.y),'',g3));
  E.sn.dk=B.xs.map((x,i)=>{line(P(x,B.y+B.h),P(x,TR.barY),'',g3);const dx=[-1,0,1].map(k=>x+k*(TR.dW+TR.dGap));line(P(dx[0],TR.barY),P(dx[2],TR.barY),'',g3);
   return dx.map(d=>{line(P(d,TR.barY),P(d,TR.dY),'',g3);return el('rect',{x:d-TR.dW/2,y:TR.dY,width:TR.dW,height:TR.dH,rx:6,class:'disk'},g3)})});
  E.sn.nb=B.xs.map((x,i)=>{const r={x:x-B.w/2,y:B.y,w:B.w,h:B.h};const b=box(r,g3);tx(x,B.y+B.h*0.36,'节点 '+(i+1),f.lbl,'lbl b7','middle',g3);return b});
  E.sn.ew=[0,1].map(i=>line(P(B.xs[i]+B.w/2,ncy),P(B.xs[i+1]-B.w/2,ncy),'thin vio',g3));
  E.sn.ewP=[P(B.xs[0]+B.w/2,ncy),P(B.xs[1]-B.w/2,ncy),P(B.xs[1]+B.w/2,ncy),P(B.xs[2]-B.w/2,ncy)];
  tx(B.note.x,B.note.y,'跨节点转发示例',f.sm,'violet-t','middle',g3);
  E.sn.front=i=>[P(bc.x,B.client.y+B.client.h),P(bc.x,B.busY),P(B.xs[i],B.busY),P(B.xs[i],B.y)];
  E.sn.down=(i,k)=>{const d=B.xs[i]+(k-1)*(TR.dW+TR.dGap);return [P(B.xs[i],ncy),P(B.xs[i],TR.barY),P(d,TR.barY),P(d,TR.dY+TR.dH/2)]};
  /* ===== 第 4 步：并行文件系统 ===== */
  const g4=grp('4');const Q=L.pf,qc=C(Q.cl),mc=C(Q.mds);E.pf={};
  E.pf.cl=box(Q.cl,g4);tx(qc.x,qc.y-14,'客户端',f.lbl,'lbl b7','middle',g4);E.pf.clSub=tx(qc.x,qc.y+16,'专用驱动',f.sm,'ochre-t st','middle',g4);
  E.pf.mds=box(Q.mds,g4,'box ochre');tx(mc.x,mc.y,'元数据服务器',f.lbl,'lbl b7','middle',g4);
  const svs=Q.xs.map(x=>({x:x-Q.sv.w/2,y:Q.sv.y,w:Q.sv.w,h:Q.sv.h}));
  if(!Q.vert){E.pf.mP=[P(Q.cl.x+Q.cl.w,Q.mY),P(300,Q.mY),P(300,mc.y),P(Q.mds.x,mc.y)];poly(E.pf.mP,'',g4);
   line(P(Q.cl.x+Q.cl.w,Q.dY),P(Q.xs[2],Q.dY),'',g4);Q.xs.forEach(x=>line(P(x,Q.dY),P(x,Q.sv.y),'',g4));
   E.pf.dP=k=>[P(Q.cl.x+Q.cl.w,Q.dY),P(Q.xs[k],Q.dY),P(Q.xs[k],Q.sv.y+4)]}
  else{E.pf.mP=[P(Q.cl.x+Q.cl.w,qc.y),P(Q.mds.x,qc.y)];poly(E.pf.mP,'',g4);
   line(P(qc.x,Q.cl.y+Q.cl.h),P(qc.x,Q.busY),'',g4);line(P(Q.xs[0],Q.busY),P(Q.xs[2],Q.busY),'',g4);Q.xs.forEach(x=>line(P(x,Q.busY),P(x,Q.sv.y),'',g4));
   E.pf.dP=k=>[P(qc.x,Q.cl.y+Q.cl.h),P(qc.x,Q.busY),P(Q.xs[k],Q.busY),P(Q.xs[k],Q.sv.y+4)]}
  const K=Q.dsk;E.pf.dk=Q.xs.map((x,k)=>{const xs=[x-(K.dw+K.gap)/2,x+(K.dw+K.gap)/2];line(P(x,Q.sv.y+Q.sv.h),P(x,K.barY),'',g4);line(P(xs[0],K.barY),P(xs[1],K.barY),'',g4);
   return xs.map(d=>{line(P(d,K.barY),P(d,K.y),'',g4);return el('rect',{x:d-K.dw/2,y:K.y,width:K.dw,height:K.dh,rx:5,class:'disk'},g4)})});
  E.pf.sv=svs.map(r=>{const b=box(r,g4);tx(C(r).x,C(r).y,'数据服务器',f.sm,'lbl b7','middle',g4);return b});
  E.pf.lay=tx(M?(Q.cl.x+Q.cl.w+Q.mds.x)/2:300+14,M?qc.y-16:(Q.mY+mc.y)/2,'',f.sm,'ochre-t st',M?'middle':'start',g4);
  /* ===== 第 5 步：DASE ===== */
  const g5=grp('5');const Dd=L.da,dc=C(Dd.client),dcy=Dd.y+Dd.h/2;E.da={};
  box(Dd.client,g5);tx(dc.x,dc.y,'客户端',f.lbl,'lbl','middle',g5);
  line(P(dc.x,Dd.client.y+Dd.client.h),P(dc.x,Dd.busY),'',g5);line(P(Dd.xs[0],Dd.busY),P(Dd.xs[2],Dd.busY),'',g5);Dd.xs.forEach(x=>line(P(x,Dd.busY),P(x,Dd.y),'',g5));
  Dd.xs.forEach(x=>line(P(x,Dd.y+Dd.h),P(x,Dd.fabY),'',g5));E.da.fab=line(P(M?8:40,Dd.fabY),P(M?472:920,Dd.fabY),'',g5);
  tx(M?161:340,Dd.fabY-16,'NVMe-oF 网络',f.sm,'ink3-t','middle',g5);
  E.da.cn=Dd.xs.map((x,i)=>{const r={x:x-Dd.w/2,y:Dd.y,w:Dd.w,h:Dd.h};const b=box(r,g5);
   if(i===0){const w0=f.lbl*3.1,mh=M?11:14,w1=mh*66/14,gap=M?6:8;vlabel(x-(w0+gap+w1)/2,dcy,'CNode',f.lbl,'lbl b7',g5,mh)}else tx(x,dcy,'CNode',f.lbl,'lbl b7','middle',g5);return b});
  const DB=Dd.db;E.da.drx=[];E.da.dk=[];
  DB.xs.forEach((c,b)=>{const r={x:c-DB.w/2,y:DB.y,w:DB.w,h:DB.h};box(r,g5,'box soft',14);tx(r.x+12,r.y+20,'DBox',f.sm,'ttl','start',g5);
   const by=DB.y+DB.barDy,dy=DB.y+DB.drDy,tot=6*DB.drW+5*DB.drGap,xs=[];for(let k=0;k<6;k++)xs.push(c-tot/2+DB.drW/2+k*(DB.drW+DB.drGap));
   line(P(c,Dd.fabY),P(c,by),'',g5);line(P(xs[0],by),P(xs[5],by),'',g5);E.da.drx.push(xs);E.da.by=by;E.da.dy=dy;
   E.da.dk.push(xs.map(x=>{line(P(x,by),P(x,dy),'',g5);return el('rect',{x:x-DB.drW/2,y:dy,width:DB.drW,height:DB.drH,rx:5,class:'disk'},g5)}))});
  E.da.path=(i,b,d)=>{const c=DB.xs[b],x=E.da.drx[b][d];return [P(dc.x,Dd.client.y+Dd.client.h),P(dc.x,Dd.busY),P(Dd.xs[i],Dd.busY),P(Dd.xs[i],dcy),P(Dd.xs[i],Dd.fabY),P(c,Dd.fabY),P(c,E.da.by),P(x,E.da.by),P(x,E.da.dy+DB.drH/2)]};
  E.cap=tx(L.cap.x,L.cap.y,'',f.cap,'st','middle');
 },
 reset(){
  svg.querySelectorAll('.ln').forEach(l=>l.classList.remove('lit','ok','dead','hot'));
  svg.querySelectorAll('.disk').forEach(d=>d.classList.remove('w','lit','off'));
  svg.querySelectorAll('.box').forEach(d=>d.classList.remove('on','ok','dead','hot'));
  E.cards.forEach(c=>{c.hl.innerHTML=''});E.cap.textContent='';
  E.sm.sub.forEach(s=>s.textContent='');E.sm.x.style.opacity=0;E.pf.lay.textContent='';
 },
 modes:[]
};
function cap(s,c){E.cap.textContent=T(s);E.cap.setAttribute('class','st '+c)}
function setT(t,s,c){t.textContent=T(s);t.setAttribute('class','st '+c)}
/* 第 1 步：四张卡依次亮起 */
SCENE.modes[0]={enter(){cap('四种搭法：看盘归谁管、状态放在哪','slate-t')},
 frame(t){const k=Math.floor(t/1.6)%5;E.cards.forEach((c,i)=>{const on=i===k;c.box.classList.toggle('on',on);c.ln.querySelectorAll('.ln').forEach(l=>l.classList.toggle('lit',on&&!l.classList.contains('vio')));c.uB.forEach(b=>b.classList.toggle('on',on))})}};
/* 第 2 步：共享介质：A 工作，A 坏了 B 接管 */
SCENE.modes[1]={enter(){cap('共享盘组与控制器故障接管','slate-t');S.v.o=pk()},
 frame(t){const per=9.6,u=t%per,fail=4.4,i=u<fail?0:1,k=Math.floor(u/1.45),v=u-k*1.45,d=[1,5,3,6,2,4,0][k%7];
  const r=E.sm.path(i,d),p=(i===1&&u-fail<0.6)?(put(S.v.o,-99,-99,0),-1):run(S.v.o,r,v,0,Math.min(dur(r),1.2),0.2);
  E.sm.dk.forEach((x,j)=>x.classList.toggle('w',j===d&&p>1));
  const dead=u>=fail;E.sm.x.style.opacity=dead?1:0;E.sm.cb[0].classList.toggle('dead',dead);E.sm.up[0].classList.toggle('dead',dead);E.sm.dn[0].classList.toggle('dead',dead);
  E.sm.cb[i].classList.add('on');if(dead)E.sm.cb[0].classList.remove('on');E.sm.cb[1].classList.toggle('ok',dead);
  setT(E.sm.sub[0],dead?'':'工作中','slate-t');setT(E.sm.sub[1],dead?'接管':'备用',dead?'sage-t':'ink3-t')}};
/* 第 3 步：无共享：请求到了节点 1，数据在节点 3 */
SCENE.modes[2]={enter(){cap('请求转给保存目标数据的节点','rose-t');S.v.a=pk();S.v.b=pk('vio');S.v.c=pk()},
 frame(t){const per=3.2,k=Math.floor(t/per),u=t-k*per,i=[0,1,2][k%3];
  const a=E.sn.front(i),da=dur(a);const fw=i!==2?(i===0?E.sn.ewP:E.sn.ewP.slice(2)):null,df=fw?Math.min(dur(fw),1.1):0,t1=da+df,dd=E.sn.down(2,1);
  run(S.v.a,a,u,0,da,0);if(fw)run(S.v.b,fw,u,da,df,0);else put(S.v.b,-99,-99,0);
  E.sn.ew.forEach((l,j)=>l.classList.toggle('hot',!!fw&&u>da&&u<t1&&(i===0||j===1)));
  const p=run(S.v.c,dd,u,t1,dur(dd));E.sn.dk[2][1].classList.toggle('w',p>1);
 }};
/* 第 4 步：并行文件系统：先拿布局，再三路同时读写 */
SCENE.modes[3]={enter(){cap('按文件布局并行访问数据服务器','slate-t');S.v.d=dot('ochre');S.v.o=[pk(),pk(),pk()]},
 frame(t){const per=6,u=t%per,mP=E.pf.mP,dm=Math.min(dur(mP),1.0),t1=0.3+dm,t2=t1+0.3+dm;
  if(u<t2+0.2)run(S.v.d,u<t1+0.3?mP:rev(mP),u,u<t1+0.3?0.3:t1+0.3,dm,0.2);else put(S.v.d,-99,-99,0);
  E.pf.mds.classList.toggle('on',u>t1&&u<t1+0.4);setT(E.pf.lay,u>t1&&u<t2+2.6?'布局':'','ochre-t');
  const t3=t2+0.2;S.v.o.forEach((o,k)=>{const r=E.pf.dP(k),p=run(o,r,u,t3,Math.min(dur(r),1.3),0.3);E.pf.dk[k].forEach((x,j)=>x.classList.toggle('w',p>1&&j===(k%2)));E.pf.sv[k].classList.toggle('on',u>t3&&u<t3+2.4)})}};
/* 第 5 步：DASE：哪台 CNode 都能直接访问每一块盘 */
const D5=[[0,1,4],[1,0,1],[2,1,2],[0,0,5],[1,1,0],[2,0,3]];
SCENE.modes[4]={enter(){cap('哪台 CNode 都能直接访问每一块盘','sage-t');S.v.o=pk()},
 frame(t){const per=2.4,k=Math.floor(t/per),u=t-k*per,[i,b,d]=D5[k%D5.length],r=E.da.path(i,b,d),p=run(S.v.o,r,u,0,Math.min(dur(r),2.0),0.2);
  E.da.cn.forEach((c,j)=>c.classList.toggle('on',j===i&&u>0.4));E.da.fab.classList.add('lit');
  E.da.dk.forEach((a,bb)=>a.forEach((x,dd)=>x.classList.toggle('w',bb===b&&dd===d&&p>1)))}};
/* 第 6 步：每张卡里轮流点亮一块盘，和能直接访问它的部件 */
SCENE.modes[5]={enter(){cap('一块盘能被几台直接访问：一对、一台、全部','slate-t');S.v.k=-1;E.cards.forEach((c,i)=>setT(c.own6,c.ownKey,i===3?'sage-t':'ink2-t'))},
 frame(t){const k=Math.floor(t/1.7);if(k===S.v.k)return;S.v.k=k;
  E.cards.forEach((c,ci)=>{const d=[2,4,1,5,0,3][k%6]%c.disks.length,ow=c.owners(d);c.hl.innerHTML='';
   ow.forEach(o=>poly(c.path(o,d),'ok',c.hl));c.dB.forEach((x,j)=>x.classList.toggle('w',j===d));c.uB.forEach((b,j)=>b.classList.toggle('ok',ow.includes(j)))})}};
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
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('ssa-v-paradigm')},
  ratio(){return L.W/L.H},
  step(){return step},
  sim(){return {step,v:S.v,n:S.items.length,t:(performance.now()-T0)/1000}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['v-paradigm']={steps:6,mount:mount};
})();
