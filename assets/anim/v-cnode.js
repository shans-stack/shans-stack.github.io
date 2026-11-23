/* CNode：跑全部存储逻辑、自己不存数据的计算节点：6 步动画（SVG，按时间写死的时间线，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-cnode'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-cnode.css，全部限定在 .ssa-v-cnode 容器之内。 */
(function(){
var EN={"Classic 双镜像示例：数据与元数据持久化后确认":"Classic mirroring: persist data and metadata before ACK","写入持久化":"Durable write","从共享 SCM 恢复 SMB 会话":"Restore SMB state from shared SCM","NFS 客户端": "NFS client", "SMB 客户端": "SMB client", "S3 客户端": "S3 client", "NVMe-oF 网络": "NVMe-oF network", "协议": "Protocols", "纠删码": "EC", "数据缩减": "Reduce", "启动盘": "Boot drive only", "没有数据盘": "", "不在内存攒写入": "No RAM write buffer", "不缓存": "No cache", "地址 1": "IP 1", "地址 2": "IP 2", "地址 3": "IP 3", "协议、纠删码、数据缩减都在 CNode 上算": "Protocols, erasure coding and data reduction all run on the CNode", "数据都在 DBox 的盘上": "All data lives on the DBox drives", "两块 SCM 都写好，才回确认": "Both SCM drives written, then the ACK", "第 1 次读": "1st read", "第 2 次读：照样去盘上取": "2nd read: still goes to the drive", "三台 CNode 读到同一个文件": "Three CNodes read the same file", "SMB 客户端连着地址 2": "SMB client is on IP 2", "第 2 台坏了，地址 2 漂走": "CNode 2 fails; IP 2 moves", "地址 2 由第 3 台接手": "CNode 3 takes over IP 2", "VAST CNode：处理全部协议与存储逻辑，自己不存数据，写入落到两块 SCM 盘才确认，任何一台都能接任何请求": "VAST CNode: runs all protocol and storage logic, keeps no data, acknowledges a write only once it is on two SCM drives, and any CNode can take any request"};
var ENM={"启动盘": "Boot drive", "没有数据盘": "No data drive", "不在内存攒写入": "No RAM buffer", "协议、纠删码、数据缩减都在 CNode 上算": "Protocols, EC and reduction run on CNodes"};
var ARIA="VAST CNode：处理全部协议与存储逻辑，自己不存数据，写入落到两块 SCM 盘才确认，任何一台都能接任何请求";
function lang(){return window.SS_LANG==='en'?'en':'zh'}
var NS='http://www.w3.org/2000/svg';
function mount(host,opts){
opts=opts||{};
host.classList.add('ssa-v-cnode');host.innerHTML='';
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
/* CNode：跑全部逻辑、自己不存数据 */
function run(o,pts,t,t0,dur,fo){fo=fo==null?0.3:fo;if(t<t0||t>t0+dur+fo){put(o,-99,-99,0);return -1}const u=(t-t0)/dur;if(u<=1){put(o,at(pts,u),1);return u}put(o,pts[pts.length-1],1-(t-t0-dur)/fo);return 1.5}
const tw=(s,fs)=>[...s].reduce((a,c)=>a+(c.charCodeAt(0)>0x2e80?fs:fs*0.58),0);
const SCENE={
 still:[1.6,1.6,4.2,2.0,2.4,6.0],
 layout(mobile){
  if(!mobile)return {W:960,H:470,mobile:false,f:{lbl:19,sm:17,cap:18,cn:21,chip:17},pw:24,ph:18,dr:7,sp:300,
   cl:{x:20,w:140,h:56,cs:[120,240,360]},busX:204,
   cn:{x:248,w:280,h:104,cs:[120,240,360]},fabX:588,
   db:{x:632,w:308,h:172,cs:[146,334],dnW:96,dnH:34,dnDx:70,dnDy:-34,barDy:2,drW:36,drGap:12,drDy:14,drH:42,lblDy:72,ttl:{dx:14,dy:20}},
   cap:{x:944,y:30,a:'end'},note:{x:480,y:450}};
  return {W:480,H:476,mobile:true,f:{lbl:17,sm:17,cap:17,cn:19,chip:17},pw:20,ph:15,dr:6,sp:200,
   cl:{y:10,w:142,h:48,cs:[82,240,398]},busY:80,
   cn:{y:100,w:150,h:112,cs:[82,240,398]},fabY:238,
   db:{y:260,w:226,h:160,cs:[121,359],dnW:88,dnH:32,dnDx:30,dnDy:24,barDy:72,drW:28,drGap:8,drDy:84,drH:40,lblDy:140,ttl:{dx:10,dy:16}},
   cap:{x:240,y:448,a:'middle'},note:{x:240,y:448}};
 },
 build(){
  const f=L.f,M=L.mobile;
  const rC=(c,o)=>M?{x:c-o.w/2,y:o.y,w:o.w,h:o.h}:{x:o.x,y:c-o.h/2,w:o.w,h:o.h};
  const inPt=r=>M?P(r.x+r.w/2,r.y):P(r.x,r.y+r.h/2), outPt=r=>M?P(r.x+r.w/2,r.y+r.h):P(r.x+r.w,r.y+r.h/2);
  const busPt=r=>M?P(r.x+r.w/2,L.busY):P(L.busX,r.y+r.h/2), fabPt=r=>M?P(r.x+r.w/2,L.fabY):P(L.fabX,r.y+r.h/2);
  E.inPt=inPt;E.busPt=busPt;
  const core=r=>M?P(r.x+r.w-12,r.y+20):C(r);E.core=core;
  const outCN=r=>M?P(r.x+r.w-12,r.y+r.h):outPt(r), fabOf=q=>M?P(q.x,L.fabY):P(L.fabX,q.y);
  const g=grp(null);
  /* 客户端 */
  E.cl=L.cl.cs.map((c,i)=>{const r=rC(c,L.cl);E['clB'+i]=box(r,g);tx(r.x+r.w/2,r.y+r.h/2,['NFS','SMB','S3'][i]+' 客户端',f.lbl,'lbl','middle',g);return r});
  /* CNode */
  E.cn=L.cn.cs.map(c=>rC(c,L.cn));
  E.cl.forEach(r=>line(outPt(r),busPt(r),'',g));
  const bp=[...E.cl,...E.cn].map(busPt);
  line(M?P(Math.min(...bp.map(p=>p.x)),L.busY):P(L.busX,Math.min(...bp.map(p=>p.y))),M?P(Math.max(...bp.map(p=>p.x)),L.busY):P(L.busX,Math.max(...bp.map(p=>p.y))),'',g);
  E.cnIn=E.cn.map(r=>line(busPt(r),inPt(r),'',g));
  E.cnOut=E.cn.map(r=>line(outCN(r),fabOf(outCN(r)),'',g));
  E.cnB=E.cn.map(r=>box(r,g));
  E.cnT=E.cn.map(r=>tx(0,0,'CNode',f.cn,'lbl b7','start',g));
  E.chipG=el('g',{},g);
  /* DBox */
  const D=L.db;E.dn=[];E.drx=[];E.dbr=[];E.drs=[];
  D.cs.forEach((c,b)=>{
   const r=M?{x:c-D.w/2,y:D.y,w:D.w,h:D.h}:{x:D.x,y:c-D.h/2,w:D.w,h:D.h};E.dbr.push(r);
   box(r,g,'box soft',14);tx(r.x+D.ttl.dx,r.y+D.ttl.dy,'DBox',f.sm,'ttl','start',g);
   const base=M?r.y:c;
   const dnc=M?P(c+D.dnDx,r.y+D.dnDy+D.dnH/2):P(r.x+D.dnDx,c+D.dnDy);
   const dr={x:dnc.x-D.dnW/2,y:dnc.y-D.dnH/2,w:D.dnW,h:D.dnH};E.dn.push(dr);
   line(fabPt(dr),inPt(dr),'',g);
   const barY=(M?r.y:c)+D.barDy,drY=(M?r.y:c)+D.drDy;
   line(P(dnc.x,dr.y+dr.h),P(dnc.x,barY),'',g);
   const tot=6*D.drW+5*D.drGap,xs=[];for(let k=0;k<6;k++)xs.push(r.x+(r.w-tot)/2+D.drW/2+k*(D.drW+D.drGap));
   line(P(xs[0],barY),P(xs[5],barY),'',g);
   E.drs.push(xs.map((x,k)=>{line(P(x,barY),P(x,drY),'',g);return el('rect',{x:x-D.drW/2,y:drY,width:D.drW,height:D.drH,rx:5,class:'disk'+(k<2?' scm':'')},g)}));
   box(dr,g,'box',8);tx(dnc.x,dnc.y,'DNode',f.sm,'lbl','middle',g);
   const ly=(M?r.y:c)+D.lblDy;
   tx((xs[0]+xs[1])/2,ly,'SCM',f.sm,'st','middle',g).style.fill='var(--ochre)';
   tx((xs[2]+xs[5])/2,ly,'QLC',f.sm,'ink3-t st','middle',g);
   E.drx.push({xs,barY,drY});
  });
  const fp=[...E.cn.map(r=>fabOf(outCN(r))),...E.dn.map(fabPt)];
  line(M?P(8,L.fabY):P(L.fabX,Math.min(...fp.map(p=>p.y))),M?P(L.W-8,L.fabY):P(L.fabX,Math.max(...fp.map(p=>p.y))),'',g);
  if(!M)tx(L.fabX,Math.max(...fp.map(p=>p.y))+22,'NVMe-oF',f.sm,'ink3-t','middle',g);
  else tx(161,L.fabY-12,'NVMe-oF 网络',f.sm,'ink3-t','middle',g);
  E.cap=tx(L.cap.x,L.cap.y,'',f.cap,'st',L.cap.a);
  /* 叉号与漂移标签 */
  const r1=E.cn[1],xg=el('g',{},g),a=r1.h*0.3,bb=r1.w*0.16,c1=C(r1);
  [[-1,-1,1,1],[-1,1,1,-1]].forEach(([p,q,s,t])=>el('line',{x1:c1.x+p*bb,y1:c1.y+q*a,x2:c1.x+s*bb,y2:c1.y+t*a,class:'xmark'},xg));E.x=xg;
  E.tagG=el('g',{},g);
  /* 路线 */
  E.toCN=(ci,k)=>{const a=E.cl[ci],r=E.cn[k];return [C(a),outPt(a),busPt(a),busPt(r),inPt(r),core(r)]};
  E.toDr=(k,b,d)=>{const r=E.cn[k],dn=E.dn[b],X=E.drx[b],x=X.xs[d];
   return [core(r),outCN(r),fabOf(outCN(r)),fabPt(dn),inPt(dn),C(dn),P(C(dn).x,X.barY),P(x,X.barY),P(x,X.drY+L.db.drH/2)]};
 },
 reset(){
  svg.querySelectorAll('.ln').forEach(l=>l.classList.remove('lit','ok','dead'));
  svg.querySelectorAll('.disk').forEach(d=>d.classList.remove('w','lit','off'));
  svg.querySelectorAll('.box').forEach(d=>d.classList.remove('on','ok','dead','hot'));
  E.cap.textContent='';E.x.style.opacity=0;E.cnT.forEach(t=>t.style.opacity=1);E.tagG.innerHTML='';chips(null);
 },
 modes:[]
};
function cap(s,c){E.cap.textContent=T(s);E.cap.setAttribute('class','st '+c)}
/* CNode 里的小块：list 为 [[文字, 样式]]，样式 'txt' 表示只写字不画框 */
function chips(list){
 E.chipG.innerHTML='';const f=L.f,M=L.mobile,out=[];
 E.cn.forEach((r,k)=>{
  const items=list?(typeof list==='function'?list(k):list):[];
  const t=E.cnT[k];
  if(!items.length){t.setAttribute('x',r.x+r.w/2);t.setAttribute('y',r.y+r.h/2);t.setAttribute('text-anchor','middle');out.push([]);return}
  if(M){t.setAttribute('x',r.x+10);t.setAttribute('y',r.y+20);t.setAttribute('text-anchor','start')}
  else{t.setAttribute("x",r.x+16);t.setAttribute("y",r.y+20);t.setAttribute('text-anchor','start')}
  const h=M?28:32,pad=M?12:20,gap=M?5:8,maxW=r.w-(M?32:32);
  let x0=r.x+(M?8:16),x=x0,y=r.y+(M?38:64),row=[],rows=[row];const cs=[];
  items.forEach(([s,c])=>{const w=tw(T(s),f.chip)+pad;if(x+w>x0+maxW+0.5&&row.length){row=[];rows.push(row);x=x0;y+=h+8}
   row.push({s,c,x,y,w});x+=w+gap});
  rows.forEach(rw=>{const tot=rw.reduce((a,o)=>a+o.w,0)+gap*(rw.length-1);const off=0;
   rw.forEach(o=>{o.x+=off;let R=null;if(o.c!=='txt')R=el('rect',{x:o.x,y:o.y,width:o.w,height:h,rx:7,class:'chip '+(o.c||'')},E.chipG);
    const T=tx(o.x+o.w/2,o.y+h/2,o.s,f.chip,o.c==='txt'?'ink3-t st':'lbl','middle',E.chipG);cs.push({r:R,t:T,x:o.x,y:o.y,w:o.w,h})})});
  out.push(cs)});
 E.chips=out;return out;
}
const dur=pts=>plen(pts)/L.sp;
/* 第 1 步：三种协议进 CNode，逻辑在这里算 */
SCENE.modes[0]={enter(){cap('协议、纠删码、数据缩减都在 CNode 上算','slate-t');chips([['协议'],['纠删码'],['数据缩减']]);S.v.b=[0,1,2].map(()=>pk())},
 frame(t){const per=4.2,u=t%per;
  [0,1,2].forEach(k=>{const r=E.toCN(k,k),t0=0.1+k*0.3,d=dur(r),arr=t0+d;
   if(u<arr)run(S.v.b[k],r,u,t0,d,0);else if(u<arr+1.6)put(S.v.b[k],E.core(E.cn[k]),1);else put(S.v.b[k],E.core(E.cn[k]),Math.max(0,1-(u-arr-1.6)/0.3));
   E.chips[k].forEach((c,j)=>c.r.classList.toggle('on',u>=arr+j*0.45&&u<arr+1.6));
   E.cnB[k].classList.toggle('on',u>=arr&&u<arr+1.6)})}};
/* 第 2 步：自己不存数据，读要去 DBox 取 */
const T2=[[0,0,3],[1,1,4],[2,0,5],[0,1,2],[1,0,4],[2,1,3]];
SCENE.modes[1]={enter(){cap('数据都在 DBox 的盘上','slate-t');chips([['启动盘'],['没有数据盘','txt']]);S.v.b=pk()},
 frame(t){const per=3.2,k=Math.floor(t/per),u=t-k*per,[i,b,d]=T2[k%T2.length];
  const r=rev(cat(E.toCN(i,i),E.toDr(i,b,d))),p=run(S.v.b,r,u,0.2,Math.min(dur(r),2.5));
  E.drs.forEach((a,bb)=>a.forEach((x,dd)=>x.classList.toggle('lit',bb===b&&dd===d&&u<0.9)));
  E['clB'+i].classList.toggle('ok',p>1)}};
/* 第 3 步：写入落到两块 SCM，才确认 */
SCENE.modes[2]={enter(){cap('Classic 双镜像示例：数据与元数据持久化后确认','sage-t');chips([['写入持久化']]);S.v.b=pk();S.v.c=[pk(),pk()];S.v.a=[dot('ok'),dot('ok'),dot('ok')]},
 frame(t){const r0=E.toCN(1,1),d0=dur(r0)*1.2,r=[E.toDr(1,0,0),E.toDr(1,1,1)],d1=Math.max(dur(r[0]),dur(r[1]))*1.2;
  const t1=0.2+d0+0.35,t2=t1+d1,t3=t2+0.5,t4=t3+d1*0.8,t5=t4+0.2,per=t5+d0+1.6,u=t%per;
  if(u<0.2+d0)run(S.v.b,r0,u,0.2,d0,0);else put(S.v.b,E.core(E.cn[1]),u<t1?1:Math.max(0,1-(u-t1)/0.25));
  r.forEach((rr,j)=>{run(S.v.c[j],rr,u,t1,d1,0.3);E.drs[j][j].classList.toggle('w',u>t2&&u<per-0.8)});
  r.forEach((rr,j)=>run(S.v.a[j],rev(rr),u,t3,d1*0.8,0.2));
  run(S.v.a[2],rev(r0),u,t5,d0,0.3);
  E.cnB[1].classList.toggle('on',u>0.2+d0&&u<t5);E.clB1.classList.toggle('ok',u>t5+d0&&u<per-0.3)}};
/* 第 4 步：不缓存，读两遍都去盘上取 */
SCENE.modes[3]={enter(){chips([['不缓存']]);S.v.q=dot();S.v.b=pk()},
 frame(t){const r=cat(E.toCN(0,0),E.toDr(0,0,3)),d=dur(r),ph=0.3+d+0.25+d+0.7,per=2*ph+0.5,u=t%per,n=u<ph?0:1,v=u-n*ph;
  cap(n?'第 2 次读：照样去盘上取':'第 1 次读',n?'rose-t':'slate-t');
  run(S.v.q,r,v,0.3,d,0.15);run(S.v.b,rev(r),v,0.3+d+0.25,d,0.3);
  E.drs[0][3].classList.toggle('lit',v>0.3+d&&v<0.3+d+0.6);E.clB0.classList.toggle('ok',v>0.3+2*d+0.25&&v<ph)}};
/* 第 5 步：任何一台都能接任何请求 */
const T5=[[0,2],[1,0],[2,1]];
SCENE.modes[4]={enter(){cap('三台 CNode 读到同一个文件','sage-t');chips(null);S.v.b=T5.map(()=>pk());E.drs[1][3].classList.add('lit')},
 frame(t){const per=5.2,u=t%per;
  T5.forEach(([c,k],j)=>{const r=cat(E.toCN(c,k),E.toDr(k,1,3)),t0=0.1+j*0.9,p=run(S.v.b[j],r,u,t0,Math.min(dur(r),2.6));
   const o=S.v.b[j],R=E.cn[k];E.cnB[k].classList.toggle('on',o.a>0.5&&o.x>=R.x&&o.x<=R.x+R.w&&o.y>=R.y&&o.y<=R.y+R.h)});
  E.drs[1][3].classList.toggle('w',u>2.6&&u<per-0.4)}};
/* 第 6 步：坏了一台，地址漂走 */
SCENE.modes[5]={enter(){S.v.cs=chips(k=>[['地址 '+(k+1)]]);S.v.b=pk();S.v.state=dot('ok');
  const c=S.v.cs[1][0],g=el('g',{},E.tagG);el('rect',{x:-c.w/2,y:-c.h/2,width:c.w,height:c.h,rx:7,class:'chip tag'},g);tx(0,0,'地址 2',L.f.chip,'lbl','middle',g);S.v.tag=g;
  const c3=S.v.cs[2][0],src=P(c.x+c.w/2,c.y+c.h/2),dst=L.mobile?P(c3.x+c3.w/2,c3.y+c3.h+8+c3.h/2):P(c3.x+c3.w+8+c.w/2,c3.y+c3.h/2);
  S.v.tp=[src,C(E.cn[1]),E.inPt(E.cn[1]),E.busPt(E.cn[1]),E.busPt(E.cn[2]),E.inPt(E.cn[2]),C(E.cn[2]),dst]},
 frame(t){const per=11.6,u=t%per,dead=u>1.9,moved=u>2.4,ff=u>11?Math.max(0,(per-u)/0.6):u<0.3?u/0.3:1;
  E.cnB[1].classList.toggle('dead',dead);E.cnT[1].style.opacity=dead?0.35:1;E.x.style.opacity=dead?ff:0;
  E.cnIn[1].classList.toggle('dead',dead);E.cnOut[1].classList.toggle('dead',dead);
  const c=S.v.cs[1][0];c.r.style.opacity=moved?0:1;c.t.style.opacity=moved?0:1;
  const tp=S.v.tp,q=u<2.4?tp[0]:at(tp,sm((u-2.4)/1.8));S.v.tag.setAttribute('transform',`translate(${q.x} ${q.y})`);S.v.tag.style.opacity=moved?ff:0;
  cap(u<1.9?'SMB 客户端连着地址 2':u<4.2?'第 2 台坏了，地址 2 漂走':u<6.4?'从共享 SCM 恢复 SMB 会话':'地址 2 由第 3 台接手',u<1.9?'slate-t':u<4.2?'rose-t':'sage-t');
  const r=u<4?cat(E.toCN(1,1),E.toDr(1,0,3)):cat(E.toCN(1,2),E.toDr(2,0,3));
  if(u<4)run(S.v.b,E.toCN(1,1),u,0.1,dur(E.toCN(1,1)),0.4);else run(S.v.b,r,u,6.6,Math.min(dur(r),2.6));
  run(S.v.state,rev(E.toDr(2,0,0)),u,4.25,1.9,0.35);
  E.drs[0][0].classList.toggle('lit',u>=4.25&&u<6.4);
  S.v.b.el.style.opacity*=ff;
  E.drs[0][3].classList.toggle('w',u>6.6+Math.min(dur(r),2.6)&&u<11)}};
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
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('ssa-v-cnode')},
  ratio(){return L.W/L.H},
  step(){return step},
  sim(){return {step,v:S.v,n:S.items.length,t:(performance.now()-T0)/1000}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['v-cnode']={steps:7,mount:mount, figures: {
 "gen6": [
  [
   [
    "机箱",
    "Chassis"
   ],
   [
    "1U · 单节点",
    "1U · one node"
   ]
  ],
  [
   [
    "处理器",
    "Processor"
   ],
   [
    "EPYC 9555P · Turin",
    "EPYC 9555P · Turin"
   ]
  ],
  [
   [
    "内存",
    "Memory"
   ],
   [
    "384 GB DDR5-6400",
    "384 GB DDR5-6400"
   ]
  ],
  [
   [
    "网络",
    "Network"
   ],
   [
    "1 或 2 块 ConnectX-7",
    "1 or 2 ConnectX-7 NICs"
   ]
  ]
 ],
 "gen5": [
  [
   [
    "机箱",
    "Chassis"
   ],
   [
    "1U · 单节点",
    "1U · one node"
   ]
  ],
  [
   [
    "处理器",
    "Processor"
   ],
   [
    "EPYC 9454P · Genoa",
    "EPYC 9454P · Genoa"
   ]
  ],
  [
   [
    "内存",
    "Memory"
   ],
   [
    "384 GB DDR5-4800",
    "384 GB DDR5-4800"
   ]
  ],
  [
   [
    "网络",
    "Network"
   ],
   [
    "1 或 2 块 ConnectX-7",
    "1 or 2 ConnectX-7 NICs"
   ]
  ]
 ],
 "ice-lake": [
  [
   [
    "机箱",
    "Chassis"
   ],
   [
    "2U · 四节点",
    "2U · four nodes"
   ]
  ],
  [
   [
    "每节点处理器",
    "CPU per Node"
   ],
   [
    "2 × Xeon Gold 6326",
    "2 × Xeon Gold 6326"
   ]
  ],
  [
   [
    "每节点内存",
    "Memory per Node"
   ],
   [
    "256 GB DDR4-3200",
    "256 GB DDR4-3200"
   ]
  ],
  [
   [
    "网卡组合",
    "Network Options"
   ],
   [
    "ConnectX-6 / CX-7",
    "ConnectX-6 / CX-7"
   ]
  ]
 ],
 "cascade-lake": [
  [
   [
    "机箱",
    "Chassis"
   ],
   [
    "四个 CNode",
    "Four CNodes"
   ]
  ],
  [
   [
    "统一网络",
    "Unified Network"
   ],
   [
    "1 × ConnectX-5",
    "1 × ConnectX-5"
   ]
  ],
  [
   [
    "拆分网络",
    "Split Networks"
   ],
   [
    "2 × CX-5 / CX-5 + CX-6",
    "2 × CX-5 / CX-5 + CX-6"
   ]
  ]
 ],
 "broadwell": [
  [
   [
    "处理器平台",
    "Processor Platform"
   ],
   [
    "Intel Broadwell",
    "Intel Broadwell"
   ]
  ],
  [
   [
    "网卡",
    "Network Adapter"
   ],
   [
    "1 块双端口卡",
    "1 dual-port adapter"
   ]
  ]
 ]
}};
})();
