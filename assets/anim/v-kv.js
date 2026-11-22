/* KV Cache 卸载：推理的 KV Cache 放到 VAST 上共用：6 步动画（SVG，按时间写死的时间线，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-kv'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下更紧的排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-kv.css，全部限定在 .ssa-v-kv 容器之内。
   VAST 字标引用 assets/brand/vast-wordmark-black.svg 与 -white.svg 原件（浅色黑字、深色白字，由 CSS 切换），不内嵌。 */
(function(){
var ID='v-kv',NSTEPS=6;
var EN={"GPU 服务器 A":"GPU server A","GPU 服务器 B":"GPU server B","G1 GPU 显存":"G1 GPU memory","G2 主机内存":"G2 host memory","G3 本地 NVMe":"G3 local NVMe","G1 显存":"G1 VRAM","G2 内存":"G2 Host","G3 本地盘":"G3 NVMe","网卡":"NIC","共享存储":"Shared storage",
"将 KV 块复制到已配置的层":"Copy KV blocks to configured tiers","示例路径：显存 → 内存 → 本地盘":"Example: GPU → host → local drive",
"将命中的前缀块读回显存":"Reload cached prefix blocks into GPU memory","复用已缓存的前缀":"Reuse the cached prefix","前缀复用":"Cache hit",
"B 未命中并重新计算前缀":"B misses and recomputes the prefix","本例仅使用本地缓存":"Local cache only in this example","重算":"Recompute",
"A 写入共享 NFS，B 命中后读回":"A writes to shared NFS; B gets a hit","G3 池化 SSD 缓存示例":"G3 pooled SSD cache example","直接读":"Read directly","已写入":"Written",
"GDS 直传路径：网卡 → 显存":"GDS direct data path: NIC → GPU memory","NFS 经 RDMA 挂载":"NFS mounted over RDMA","NFS · RDMA · GDS":"NFS · RDMA · GDS",
"预热写入，命中后重复读取":"Populate the cache, then read on hits","S3 · TCP":"S3 · TCP","写入":"Writes","读取":"Reads","示意，不代表实测数字":"Schematic, not measured",
"KV Cache 分层：GPU 服务器的显存、内存、本地盘，加上 VAST 上的共享层":"KV cache tiers: GPU memory, host memory and local drives on each server, plus a shared tier on VAST"};
var ENM={"将 KV 块复制到已配置的层":"Copy KV blocks to configured tiers","示例路径：显存 → 内存 → 本地盘":"Example: GPU → host → local drive","将命中的前缀块读回显存":"Reload cached prefix blocks into GPU memory","B 未命中并重新计算前缀":"B misses and recomputes the prefix","本例仅使用本地缓存":"Local cache only in this example","G3 池化 SSD 缓存示例":"G3 pooled SSD cache example","GDS 直传路径：网卡 → 显存":"GDS direct data path: NIC → GPU memory","NFS 经 RDMA 挂载":"NFS mounted over RDMA","直接读":"Read","前缀复用":"Cache hit","共享存储":"Shared storage"};
var ARIA="KV Cache 分层：GPU 服务器的显存、内存、本地盘，加上 VAST 上的共享层";
function lang(){return window.SS_LANG==='en'?'en':'zh'}
var NS='http://www.w3.org/2000/svg',ROOT=window.SS_ROOT||'',CLS='ssa-'+ID;
function mount(host,opts){
opts=opts||{};
host.classList.add(CLS);host.innerHTML='';
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
function plen(pts){let s=0;for(let i=1;i<pts.length;i++)s+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);return s}
function at(pts,u){u=clamp(u,0,1);let d=u*plen(pts);for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],l=Math.hypot(b.x-a.x,b.y-a.y);if(d<=l||i===pts.length-1){const k=l?Math.min(1,d/l):0;return {x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k}}d-=l}return pts[pts.length-1]}
function rev(pts){return pts.slice().reverse()}
function cat(...ps){const o=[];ps.forEach(p=>p.forEach(q=>{const l=o[o.length-1];if(!l||l.x!==q.x||l.y!==q.y)o.push(q)}));return o}
/* 数据块与小圆点 */
let L=null,E,S,step=0,T0=0,raf=0,last=0,paused=!!opts.paused,dead=false,pausedAt=0;
function pk(cls){const r=el('rect',{x:-L.pw/2,y:-L.ph/2,width:L.pw,height:L.ph,rx:4,class:'pkt '+(cls||'')},E.pk);const o={el:r,kind:'pkt'};S.items.push(o);put(o,-99,-99,0);return o}
function dot(cls){const r=el('circle',{r:L.dr,cx:0,cy:0,class:'dot '+(cls||'')},E.pk);const o={el:r,kind:'dot'};S.items.push(o);put(o,-99,-99,0);return o}
function put(o,x,y,a){if(typeof x==='object'){a=y;y=x.y;x=x.x}o.x=x;o.y=y;o.a=a==null?1:a;o.el.setAttribute('transform',`translate(${x.toFixed(1)} ${y.toFixed(1)})`);o.el.style.opacity=o.a}
function hide(o){put(o,-99,-99,0)}
/* 沿路线走：t 在 [t0, t0+dur] 内走完，之后 fo 秒淡出；返回进度（<0 未出发，0–1 在路上，>1 已到） */
function run(o,pts,t,t0,dur,fo){fo=fo==null?0.3:fo;if(t<t0||t>t0+dur+fo){hide(o);return t<t0?-1:2}const u=(t-t0)/dur;if(u<=1){put(o,at(pts,sm(u)*0.15+u*0.85),1);return u}put(o,pts[pts.length-1],1-(t-t0-dur)/fo);return 1.5}
/* 厂商 logo：VAST 字标引用 assets/brand 里的原件（浅色用黑字版、深色用白字版，由 CSS 切换）。(x,y) 为字标竖直中线上的锚点，h 为高度 */
function vmark(x,y,h,p,anchor){const w=h*66/14;if(anchor==='end')x-=w;else if(anchor==='middle')x-=w/2;const g=el('g',{class:'vwm'},p);
 [['black','wm-l'],['white','wm-d']].forEach(([c,k])=>{const im=el('image',{x:x.toFixed(1),y:(y-h/2).toFixed(1),width:w.toFixed(1),height:h,class:k},g);im.setAttribute('href',ROOT+'assets/brand/vast-wordmark-'+c+'.svg')});return g}
/* 部件名 + VAST 字标排成一行，整体居中于 (cx,cy)；lw 为部件名估计宽度 */
function vpair(cx,cy,s,fs,cls,p,h,lw){lw=lw||fs*0.6*T(s).length;const w=h*66/14,gap=Math.round(fs*0.45),x0=cx-(lw+gap+w)/2;const t=tx(x0+lw,cy,s,fs,cls,'end',p);const m=vmark(x0+lw+gap,cy,h,p,'start');return {t,m}}
/* 小牌子（可整体移动）：中心 (x,y)，宽 w 高 h */
function chip(x,y,w,h,s,fs,cls,p){const g=el('g',{class:'chip '+(cls||'')},p);el('rect',{x:-w/2,y:-h/2,width:w,height:h,rx:6},g);const t=tx(0,0,s,fs,'','middle',g);g.setAttribute('transform',`translate(${x} ${y})`);return {g,t,x,y,w,h,set(s2){t.textContent=T(s2)},mv(nx,ny){this.x=nx;this.y=ny;g.setAttribute('transform',`translate(${nx.toFixed(1)} ${ny.toFixed(1)})`)}}}
function cap(s,c){E.cap.textContent=T(s);E.cap.setAttribute('class','st '+(c||'ink2-t'))}
function note(s,c){E.note.textContent=T(s);E.note.setAttribute('class','st '+(c||'ink3-t'))}
const dur=pts=>plen(pts)/L.sp;
const SCENE={
 still:[5.2,2.6,3.6,6.5,2.8,6],
 layout(m){
  if(!m)return {W:960,H:520,mobile:false,f:{lbl:20,sm:17,cap:18,big:30,tier:17},pw:20,ph:14,dr:7,sp:320,
   sv:{xs:[30,510],y:14,w:420,h:308,tx:18,ty:26,tier:{x:30,r:18,ys:[46,120,194],h:54},slot:{n:4,w:40,h:32,g:8,pad:14},spine:192,rail:9,
    nic:{x:282,y:272,w:120,h:36},lblX:46,tnames:['G1 GPU 显存','G2 主机内存','G3 本地 NVMe']},
   busY:350,vast:{x:300,y:372,w:360,h:84,conn:620,slot:{n:6,w:34,h:30,g:10},ldy:22,sdy:58},logoH:15,
   cap:{x:480,y:484},note:{x:480,y:508},plbl:{x:736,y:336},cnt:{w:{x:180},r:{x:780},y:414}};
  return {W:480,H:478,mobile:true,f:{lbl:18,sm:17,cap:17,big:26,tier:17},pw:16,ph:12,dr:6,sp:200,
   sv:{xs:[12,246],y:10,w:222,h:260,tx:14,ty:16,tier:{x:16,r:10,ys:[30,90,150],h:44},slot:{n:3,w:26,h:26,g:6,pad:10},spine:112,rail:5,
    nic:{x:132,y:208,w:80,h:32},lblX:26,tnames:['G1 显存','G2 内存','G3 本地盘']},
   busY:292,vast:{x:120,y:310,w:240,h:84,conn:346,slot:{n:6,w:26,h:26,g:6},ldy:22,sdy:58},logoH:12,
   cap:{x:240,y:428},note:{x:240,y:458},plbl:{x:265,y:281},cnt:{w:{x:60},r:{x:420},y:352}};
 },
 build(){
  const f=L.f,V=L.vast,SV=L.sv;
  E.sv=SV.xs.map((x0,s)=>{const o={x0};const g=el('g',{});o.g=g;g.dataset.dim=s===0?'5':'1 2 6';
   o.frame=box({x:x0,y:SV.y,w:SV.w,h:SV.h},g,'box soft',16);tx(x0+SV.tx,SV.y+SV.ty,s?'GPU 服务器 B':'GPU 服务器 A',f.sm,'ttl','start',g);
   o.st=L.mobile?tx(x0+12,SV.y+SV.nic.y+SV.nic.h/2,'',f.sm,'st','start',g):tx(x0+SV.w-SV.tx,SV.y+SV.ty,'',f.sm,'st','end',g);
   const tr=SV.tier,tw=SV.w-tr.x-tr.r;o.spX=x0+SV.spine;o.railX=x0+SV.w-SV.rail;
   o.tiers=tr.ys.map((dy,k)=>{const r={x:x0+tr.x,y:SV.y+dy,w:tw,h:tr.h};const gg=el('g',{},g);const b=box(r,gg,'box',10);
    tx(x0+SV.lblX,r.y+r.h/2,SV.tnames[k],f.tier,'lbl','start',gg);
    const sl=SV.slot,sx0=r.x+r.w-sl.pad-(sl.n*sl.w+(sl.n-1)*sl.g)+sl.w/2;
    const slots=[];for(let j=0;j<sl.n;j++){const c=P(sx0+j*(sl.w+sl.g),r.y+r.h/2);slots.push(c);el('rect',{x:c.x-sl.w/2,y:c.y-sl.h/2,width:sl.w,height:sl.h,rx:5,class:'slot'},gg)}
    line(P(o.spX,r.y+r.h/2),P(slots[0].x-sl.w/2,r.y+r.h/2),'thin',gg);
    return {r,b,g:gg,cy:r.y+r.h/2,slots}});
   /* 层间竖线接到网卡。 */
   const T=o.tiers,N=SV.nic;o.nic={x:x0+N.x,y:SV.y+N.y,w:N.w,h:N.h};o.nicC=C(o.nic);
   poly([P(o.spX,T[0].cy),P(o.spX,o.nicC.y),o.nicC],'thin',g);
   line(P(o.nicC.x,o.nic.y+o.nic.h),P(o.nicC.x,L.busY),'',g);
   o.nicB=box(o.nic,g,'box',8);tx(o.nicC.x,o.nicC.y,'网卡',f.sm,'lbl','middle',g);
   /* 第 5 步：绕过主机内存的直通线 */
   const gr=grp('5',g);poly([P(o.nic.x+o.nic.w,o.nicC.y),P(o.railX,o.nicC.y),P(o.railX,T[0].cy),P(T[0].r.x+T[0].r.w,T[0].cy)],'ok',gr);
   return o});
  /* 网络总线与 VAST */
  const gv=grp('4 5 6');
  E.bus=line(P(E.sv[0].nicC.x,L.busY),P(Math.max(E.sv[1].nicC.x,V.conn),L.busY),'',gv);
  line(P(V.conn,L.busY),P(V.conn,V.y),'',gv);
  E.vb=box(V,gv,'box',14);
  vpair(V.x+V.w/2,V.y+V.ldy,'共享存储',f.lbl,'lbl b7',gv,L.logoH);
  const n=V.slot.n,sy=V.y+V.sdy,sx0=V.x+V.w/2-(n*V.slot.w+(n-1)*V.slot.g)/2+V.slot.w/2;
  E.vs=[];for(let j=0;j<n;j++){const c=P(sx0+j*(V.slot.w+V.slot.g),sy);E.vs.push(c);el('rect',{x:c.x-V.slot.w/2,y:sy-V.slot.h/2,width:V.slot.w,height:V.slot.h,rx:5,class:'slot'},gv)}
  E.plbl=tx(L.plbl.x,L.plbl.y,'',f.sm,'st slate-t','middle');
  const gc=grp('6');E.cw=tx(L.cnt.w.x,L.cnt.y-18,'写入',f.sm,'ink3-t','middle',gc);E.nw=tx(L.cnt.w.x,L.cnt.y+14,'0',f.big,'num violet-t','middle',gc);
  tx(L.cnt.r.x,L.cnt.y-18,'读取',f.sm,'ink3-t','middle',gc);E.nr=tx(L.cnt.r.x,L.cnt.y+14,'0',f.big,'num sage-t','middle',gc);
  E.cap=tx(L.cap.x,L.cap.y,'',f.cap,'st','middle');E.note=tx(L.note.x,L.note.y,'',f.sm,'st','middle');
 },
 reset(){E.sv.forEach(o=>{o.st.textContent='';o.tiers.forEach(t=>{t.b.classList.remove('hot','ok','on');t.g.classList.remove('dim')});o.nicB.classList.remove('on')});
  E.plbl.textContent='';E.cap.textContent='';E.note.textContent='';E.vb.classList.remove('on');E.nw.textContent='0';E.nr.textContent='0';E.pk&&(E.pk.style.opacity=1)},
 modes:[]
};
/* 块：和槽一样大的小方块 */
function blk(cls){const sl=L.sv.slot;const r=el('rect',{x:-(sl.w-8)/2,y:-(sl.h-8)/2,width:sl.w-8,height:sl.h-8,rx:3,class:'kb '+(cls||'')},E.pk);const o={el:r};S.items.push(o);hide(o);return o}
const SL=(s,k,j)=>E.sv[s].tiers[k].slots[j];
function place(s,k,j,cls){const b=blk(cls);put(b,SL(s,k,j),1);return b}
function vplace(j,cls){const b=blk(cls);put(b,E.vs[j],1);return b}
/* 路线 */
function tierDown(s,k,j,k2,j2){const o=E.sv[s],a=o.tiers[k],b=o.tiers[k2];return [SL(s,k,j),P(o.spX,a.cy),P(o.spX,b.cy),SL(s,k2,j2)]}
function toVast(s,k,j,vj){const o=E.sv[s],V=L.vast,sy=E.vs[0].y;return [SL(s,k,j),P(o.spX,o.tiers[k].cy),P(o.spX,o.nicC.y),o.nicC,P(o.nicC.x,L.busY),P(V.conn,L.busY),P(V.conn,sy),E.vs[vj]]}
function fromVastNic(vj,s){const o=E.sv[s],V=L.vast,sy=E.vs[0].y;return [E.vs[vj],P(V.conn,sy),P(V.conn,L.busY),P(o.nicC.x,L.busY),o.nicC]}
function nicRail(s,j){const o=E.sv[s],t=o.tiers[0];return [o.nicC,P(o.nic.x+o.nic.w,o.nicC.y),P(o.railX,o.nicC.y),P(o.railX,t.cy),P(t.r.x+t.r.w,t.cy),SL(s,0,j)]}
function mv(b,pts,t,t0,d){d=d||dur(pts);if(t<t0){hide(b);return -1}const u=(t-t0)/d;put(b,at(pts,sm(clamp(u,0,1))),1);return u}
function st(s,txt,c){E.sv[s].st.textContent=T(txt);E.sv[s].st.setAttribute('class','st '+(c||'ink3-t'))}
/* 第 1 步：示例本地卸载路径 */
SCENE.modes[0]={enter(){cap('将 KV 块复制到已配置的层','slate-t');note('示例路径：显存 → 内存 → 本地盘');
  const v=S.v,j=L.sv.slot.n-1;place(0,0,j,'match');
  v.copies=[blk('match'),blk('match')];
  v.routes=[tierDown(0,0,j,1,j),tierDown(0,1,j,2,j)]},
 frame(t){const v=S.v,u=t%6;
  v.routes.forEach((path,k)=>{
    const progress=mv(v.copies[k],path,u,0.65+k*1.55,1.25);
    E.sv[0].tiers[k+1].b.classList.toggle('on',progress>=1);
  });
  E.pk.style.opacity=u>5.6?(6-u)/0.4:1}};

/* 第 2 步：读回显存 */
SCENE.modes[1]={enter(){cap('将命中的前缀块读回显存','sage-t');note('复用已缓存的前缀');
  const n=L.sv.slot.n,v=S.v;for(let j=0;j<n-1;j++)place(0,0,j);for(let j=0;j<n;j++)place(0,1,j);for(let j=0;j<n;j++)if(j!==1)place(0,2,j);place(0,2,1,'match');v.k=blk('match');v.n=n},
 frame(t){const v=S.v,per=5.2,u=t%per;const r=tierDown(0,2,1,0,v.n-1);
  mv(v.k,r,u,0.6,1.4);
  const done=u>2.0;st(0,done?'前缀复用':'',done?'sage-t':'');E.sv[0].tiers[0].b.classList.toggle('ok',done&&u<4.8);
  E.pk.style.opacity=u>4.8?Math.max(0,(per-u)/0.4):1}};
/* 第 3 步：本地盘只有本机看得见 */
SCENE.modes[2]={enter(){cap('B 未命中并重新计算前缀','rose-t');note('本例仅使用本地缓存');
  const n=L.sv.slot.n,v=S.v;place(0,0,0);place(0,0,1);place(0,1,0);place(0,2,0,'match');
  place(1,0,0);place(1,1,0);place(1,1,1);place(1,2,0);v.re=blk('re');v.n=n},
 frame(t){const v=S.v,per=6.4,u=t%per,B=E.sv[1];
  B.tiers.forEach((tt,k)=>tt.b.classList.toggle('hot',u>0.5+k*0.45&&u<0.95+k*0.45));
  const g=clamp((u-1.9)/2.4,0,1);if(u>1.9){put(v.re,SL(1,0,v.n-1),1);v.re.el.setAttribute('transform',v.re.el.getAttribute('transform')+` scale(${Math.max(0.05,g).toFixed(2)} 1)`)}else hide(v.re);
  st(1,u>1.9?'重算':'','rose-t');E.pk.style.opacity=u>6.0?Math.max(0,(per-u)/0.4):1}};
/* 第 4 步：放到 VAST 上，B 直接读 */
SCENE.modes[3]={enter(){cap('A 写入共享 NFS，B 命中后读回','sage-t');note('G3 池化 SSD 缓存示例');
  const n=L.sv.slot.n,v=S.v;place(0,0,0);place(0,0,1);place(0,1,1,'match');
  place(1,0,0);place(1,1,0);place(1,1,1);place(1,2,0);vplace(0);v.c=blk('match');v.read=blk('match');v.n=n},
 frame(t){const v=S.v,per=8.4,u=t%per;
  const a=mv(v.c,toVast(0,1,1,2),u,0.4,2.2);
  const j=v.n-1,rd=cat(rev(toVast(1,1,j,2)),tierDown(1,1,j,0,j));
  const r=mv(v.read,rd,u,3.2,2.4);
  st(0,a>=1?'已写入':'',a>=1?'violet-t':'');st(1,r>=1?'直接读':'','sage-t');E.sv[1].tiers[0].b.classList.toggle('ok',r>=1);
  E.vb.classList.toggle('on',a>=1&&u<3.4);E.pk.style.opacity=u>8.0?Math.max(0,(per-u)/0.4):1}};
/* 第 5 步：NFS + RDMA + GDS 直接进显存 */
SCENE.modes[4]={enter(){cap('GDS 直传路径：网卡 → 显存','sage-t');note('NFS 经 RDMA 挂载');E.plbl.textContent=T('NFS · RDMA · GDS');
  E.sv[1].tiers[1].g.classList.add('dim');
  const n=L.sv.slot.n,v=S.v;place(1,2,0);vplace(0);vplace(1);vplace(2);v.b=[blk('match'),blk('match')];v.n=n},
 frame(t){const v=S.v,per=6,u=t%per,B=E.sv[1];
  const r=cat(fromVastNic(1,1),nicRail(1,v.n-1));const r2=cat(fromVastNic(2,1),nicRail(1,v.n-2));
  const a=mv(v.b[0],r,u,0.3,2.4),b=u>1.3?mv(v.b[1],r2,u,1.3,2.4):-1;if(u<1.3)hide(v.b[1]);
  B.nicB.classList.toggle('on',a>0.45&&a<0.75||b>0.45&&b<0.75);B.tiers[0].b.classList.toggle('ok',a>=1);
  E.pk.style.opacity=u>5.6?Math.max(0,(per-u)/0.4):1}};
/* 第 6 步：S3 over TCP，写一次读多次 */
SCENE.modes[5]={sim:1,enter(){cap('预热写入，命中后重复读取','slate-t');note('示意，不代表实测数字');E.plbl.textContent=T('S3 · TCP');
  const v=S.v;v.n=L.sv.slot.n;v.cyc=-1;place(0,0,0,'match')},
 frame(t){const v=S.v,per=9.6,c=Math.floor(t/per),u=t-c*per,n=v.n;
  if(c!==v.cyc){S.items.splice(1).forEach(o=>o.el.remove());v.cyc=c;v.w=blk('match');v.nr=0;v.done={}}
  const w=cat(tierDown(0,0,0,1,0),toVast(0,1,0,2));
  const a=mv(v.w,w,u,0.3,2.0);
  E.nw.textContent=a>=1?'1':'0';
  for(let m=0;m<7;m++){const t0=2.7+m*0.8;if(u<t0)break;const j=1+m%(n-1);
   let o=v.done[m];if(!o)o=v.done[m]={b:blk('match'),c:false};
   const r=cat(rev(toVast(0,1,0,2)),tierDown(0,1,0,0,j));const p=mv(o.b,r,u,t0,2.0);
   if(p>=1){if(!o.c){o.c=true;v.nr++}const fo=clamp((p-1)*2/0.6,0,1);put(o.b,SL(0,0,j),1-fo)}}
  E.nr.textContent=v.nr;const fa=u>9.2?Math.max(0,(per-u)/0.4):u<0.3?u/0.3:1;E.pk.style.opacity=fa;E.nw.style.opacity=fa;E.nr.style.opacity=fa}};
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
function setToggle(v){const TG=SCENE.toggle;TG.state=v;tgl.textContent='⇄ '+T(TG.label(v));tgl.setAttribute('aria-label',TG.aria(v))}
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
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove(CLS)},
  ratio(){return L.W/L.H},
  step(){return step},
  sim(){return {step,v:S.v,n:S.items.length,t:(performance.now()-T0)/1000}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim[ID]={steps:NSTEPS,mount:mount};
})();
