/* SMB：共享会话状态与持续可用共享：6 步动画（SVG，按时间写死的时间线，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-smb'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下更紧的排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-smb.css，全部限定在 .ssa-v-smb 容器之内。
   VAST 字标引用 assets/brand/vast-wordmark-black.svg 与 -white.svg 原件（浅色黑字、深色白字，由 CSS 切换），不内嵌。 */
(function(){
var ID='v-smb',NSTEPS=6;
var EN={"重连中":"Reconnecting","连接中断":"Disconnected","客户端 A":"Client A","客户端 B":"Client B","客户端 C":"Client C","DNS":"DNS","AD 域控":"AD DC","共享存储":"Shared storage","共享 \\data":"Share \\data","a.docx":"a.docx","会话状态（SCM）":"Session state (SCM)","NVMe-oF":"NVMe-oF",
"地址 1":"IP 1","地址 2":"IP 2","地址 3":"IP 3","地址 4":"IP 4","地址 5":"IP 5","地址 6":"IP 6",
"会话：客户端 A":"Session: Client A","句柄：a.docx":"Handle: a.docx","租约：a.docx":"Lease: a.docx",
"共享 \\data 映射成本机的 Z: 盘":"Share \\data is mapped as drive Z:","SMB 2.1 · SMB 3.0 · 签名与加密":"SMB 2.1 · SMB 3.0 · signing and encryption","映射为 Z:":"Mapped as Z:",
"集群 DNS：轮询分配 VIP":"Cluster DNS: VIPs in round-robin order","客户端使用 VIP 池的域名":"Clients use the VIP pool’s DNS name",
"向域控取 Kerberos 服务票据":"Get a Kerberos service ticket from AD","启用 NTLM 时可回退到 NTLMv2":"NTLMv2 fallback when enabled","已取票据":"Ticket","已登录":"Signed in",
"CNode 1 把会话、句柄、租约写进 SCM":"CNode 1 writes session, handle and lease to SCM","各 CNode 可读取共享状态":"CNodes can read the shared state","已打开 a.docx":"a.docx open","已打开":"Open",
"CNode 2 读取共享连接状态":"CNode 2 reads shared connection state","持续可用共享 · SMB 3.0 持久句柄":"CA share · SMB 3.0 persistent handle","句柄已恢复":"Handle restored",
"同一会话可使用多条连接":"Multiple connections in one session","一条连接":"One connection","多通道":"Multichannel","客户端":"Client","已送达":"Delivered","示意，不代表实测数字":"Schematic, not measured","多条连接使用同一个 VIP":"Multiple connections use the same VIP",
"VAST 上的 SMB：会话状态存在共享的 SCM 上，CNode 故障后由别的 CNode 接着服务":"SMB on VAST: session state lives on shared SCM, so another CNode takes over after a failure"};
var ENM={"句柄已恢复":"Restored","集群 DNS：轮询分配 VIP":"Cluster DNS: VIPs in round-robin order","向域控取 Kerberos 服务票据":"Get a Kerberos service ticket from AD","启用 NTLM 时可回退到 NTLMv2":"NTLMv2 fallback when enabled","CNode 1 把会话、句柄、租约写进 SCM":"CNode 1 writes session state to SCM","CNode 2 读取共享连接状态":"CNode 2 reads shared connection state","持续可用共享 · SMB 3.0 持久句柄":"CA share · SMB 3.0 persistent handle","SMB 2.1 · SMB 3.0 · 签名与加密":"SMB 2.1 · 3.0 · signing, encryption","各 CNode 可读取共享状态":"CNodes can read the shared state","同一会话可使用多条连接":"Multiple connections in one session","AD 域控":"AD"};
var ARIA="VAST 上的 SMB：会话状态存在共享的 SCM 上，CNode 故障后由别的 CNode 接着服务";
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
/* ---------- 协议站共用画面：上排客户端与侧框、网络总线、三台 CNode（带地址牌）、NVMe-oF、存储带 ---------- */
function protoLayout(mobile){
 if(!mobile)return {W:960,H:520,mobile:false,f:{lbl:20,sm:17,cap:18,chip:17,big:32},pw:22,ph:16,dr:7,sp:330,
  cl:{xs:[170,400,630],y:16,w:178,h:60},side:{x:792,y:16,w:146,h:60},busY:102,
  cn:{xs:[200,480,760],y:124,w:220,h:106},chipW:68,chipH:28,fabY:256,fabX:[70,900],
  band:{x:60,y:276,w:840,h:172},bl:{x:84,y:312,w:250,h:120},br:{x:352,y:312,w:526,h:120},fileW:132,slotX:120,slotW:220,
  cap:{x:480,y:478},note:{x:480,y:506},logoH:14,lbl1:72};
 return {W:480,H:520,mobile:true,f:{lbl:19,sm:17,cap:17,chip:17,big:28},pw:18,ph:14,dr:6,sp:230,
  cl:{xs:[70,194,318],y:10,w:114,h:60},side:{x:388,y:10,w:84,h:60},busY:92,
  cn:{xs:[85,240,395],y:112,w:146,h:106},chipW:62,chipH:28,fabY:240,fabX:[12,468],
  band:{x:12,y:262,w:456,h:170},bl:{x:24,y:300,w:152,h:120},br:{x:188,y:300,w:268,h:120},fileW:104,slotX:84,slotW:172,
  cap:{x:240,y:460},note:{x:240,y:494},logoH:11,lbl1:68};
}
function protoBuild(o){
 const f=L.f,M=L.mobile,cl=L.cl,cn=L.cn;
 const g=grp(null);E.base=g;
 /* 总线 */
 const sx=L.side.x+L.side.w/2;
 const bx0=Math.min(cl.xs[0],cn.xs[0]),bx1=Math.max(cn.xs[2],o.side?sx:cl.xs[2]);
 E.bus=line(P(bx0,L.busY),P(bx1,L.busY),'',g);
 /* 客户端 */
 E.cl=cl.xs.map((x,i)=>{const r={x:x-cl.w/2,y:cl.y,w:cl.w,h:cl.h};const gg=el('g',{},g);gg.dataset.dim=(o.dimCl&&o.dimCl[i])||'';
  line(P(x,cl.y+cl.h),P(x,L.busY),'',gg);const b=box(r,gg);
  const lb=tx(x,cl.y+20,o.clients[i],f.lbl,'lbl','middle',gg);const sb=tx(x,cl.y+44,'',f.sm,'st','middle',gg);
  return {r,x,b,lb,sb,g:gg}});
 /* 侧框（DNS / AD / 策略） */
 if(o.side){const gs=grp(o.side,g);E.sideG=gs;const r=L.side;line(P(sx,r.y+r.h),P(sx,L.busY),'',gs);E.sideB=box(r,gs);
  E.sideT=tx(sx,r.y+r.h/2,'',f.lbl,'lbl b7','middle',gs)}
 /* CNode */
 const r1=cn.y+58,r2=cn.y+88,off=L.chipW/2+4;
 E.cn=cn.xs.map((x,k)=>{const r={x:x-cn.w/2,y:cn.y,w:cn.w,h:cn.h};const gg=el('g',{},g);
  line(P(x,L.busY),P(x,cn.y),'',gg);line(P(x,cn.y+cn.h),P(x,L.fabY),'',gg);const b=box(r,gg);
  if(k===0)vpair(x,cn.y+24,'CNode 1',f.lbl,'lbl b7',gg,L.logoH,L.lbl1);else tx(x,cn.y+24,'CNode '+(k+1),f.lbl,'lbl b7','middle',gg);
  return {r,x,b,g:gg,slots:[P(x-off,r1),P(x+off,r1),P(x,r2)]}});
 E.chips=[];for(let j=0;j<6;j++){const k=j%3,s=E.cn[k].slots[j<3?0:1];const c=chip(s.x,s.y,L.chipW,L.chipH,'地址 '+(j+1),f.chip,'',E.cn[k].g);c.home=s;c.k=k;E.chips.push(c)}
 /* 叉号 */
 E.xm=E.cn.map(c=>{const gx=el('g',{},g);const a=20,b=20,cy=cn.y+72;
  [[-1,-1,1,1],[-1,1,1,-1]].forEach(([p,q,r,s])=>el('line',{x1:c.x+p*b,y1:cy+q*a,x2:c.x+r*b,y2:cy+s*a,class:'xmark'},gx));gx.style.opacity=0;return gx});
 /* NVMe-oF 与存储带 */
 E.fab=line(P(L.fabX[0],L.fabY),P(L.fabX[1],L.fabY),'',g);
 const B=L.band;box(B,g,'box soft',16);tx(B.x+(M?126:16),B.y+20,o.band,f.sm,'ttl','start',g);
 if(!M)tx(L.fabX[0]+4,L.fabY-14,'NVMe-oF',f.sm,'ink3-t','start',g);
 E.cap=tx(L.cap.x,L.cap.y,'',f.cap,'st','middle');E.note=tx(L.note.x,L.note.y,'',f.sm,'st','middle');
 /* 路线 */
 E.R={
  down:i=>[P(E.cl[i].x,cl.y+cl.h),P(E.cl[i].x,L.busY)],
  toCn:(i,k)=>cat(E.R.down(i),[P(E.cn[k].x,L.busY),P(E.cn[k].x,cn.y)]),
  toSide:i=>cat(E.R.down(i),[P(sx,L.busY),P(sx,L.side.y+L.side.h)]),
  cnTo:(k,x,y)=>[P(E.cn[k].x,cn.y+cn.h),P(E.cn[k].x,L.fabY),P(x,L.fabY),P(x,y)]
 };
}
/* 一串分段：{p:路线} 沿线走；{w:秒} 停顿（数据块藏在 CNode 里处理，或停在 at 处）。返回 段号+段内进度；走完后淡出 */
function seq(o,segs,t,t0){let tt=t-t0;if(tt<0){hide(o);return -1}
 for(let i=0;i<segs.length;i++){const s=segs[i],d=s.p?(s.d||dur(s.p)):s.w;
  if(tt<=d){if(s.p)put(o,at(s.p,d?tt/d:1),1);else if(s.at)put(o,s.at,1);else hide(o);return i+(d?tt/d:1)*0.999}tt-=d}
 const s=segs[segs.length-1];if(tt<0.3&&(s.p||s.at)){put(o,s.p?s.p[s.p.length-1]:s.at,1-tt/0.3)}else hide(o);return segs.length}
function seqLen(segs){return segs.reduce((a,s)=>a+(s.p?(s.d||dur(s.p)):s.w),0)}
/* 客户端经地址进 CNode（停顿处理）再到存储带 (x,y)；back=true 时再原路返回 */
function viaCn(i,k,x,y){return [{p:E.R.toCn(i,k)},{w:0.35,k},{p:E.R.cnTo(k,x,y)}]}
function backCn(i,k,x,y){return [{p:rev(E.R.cnTo(k,x,y))},{w:0.25,k},{p:rev(E.R.toCn(i,k))}]}
/* 段里带 k 的停顿：那台 CNode 亮 */
function cnLit(segs,r,base){E.cn.forEach(c=>c.b.classList.remove('on'));if(r<0)return;const i=Math.floor(r);const s=segs[i];if(s&&s.k!=null)E.cn[s.k].b.classList.add('on')}
function protoReset(){
 E.cn.forEach(c=>{c.b.classList.remove('on','dead','hot');c.g.classList.remove('dead')});
 E.cl.forEach(c=>{c.b.classList.remove('on','ok','hot');c.sb.textContent=''});
 E.chips.forEach(c=>{c.mv(c.home.x,c.home.y);c.g.classList.remove('on','mv');if(c.g.parentNode!==E.cn[c.k].g)E.cn[c.k].g.appendChild(c.g)});
 E.xm.forEach(x=>x.style.opacity=0);
 svg.querySelectorAll('.ln').forEach(l=>l.classList.remove('lit','ok'));
 E.cap.textContent='';E.note.textContent='';
}
function csub(i,s,c){E.cl[i].sb.textContent=T(s);E.cl[i].sb.setAttribute('class','st '+(c||'ink3-t'))}
/* CNode k 故障：调淡、打叉，它的地址牌移到别的 CNode 的第二排 */
function failCn(k,u){E.cn[k].g.classList.add('dead');E.xm[k].style.opacity=clamp(u*3,0,1);
 E.chips.filter(c=>c.k===k).forEach((c,n)=>{const tk=(k+1+n)%3,tgt=E.cn[tk].slots[2];if(c.g.parentNode!==E.base)E.base.appendChild(c.g);c.g.classList.add('mv');
  const v=sm(clamp((u-0.35)/0.5,0,1));c.mv(c.home.x+(tgt.x-c.home.x)*v,c.home.y+(tgt.y-c.home.y)*v)})}
const SCENE={
 still:[4.2,9.6,6.5,6,6,6.5],
 layout(m){const L=protoLayout(m);
  L.race=m?{T:{lbl:{x:16,y:36},cl:{x:16,y:62,w:96,h:72},ys:[98],cn:{x:286,w:116,h:72}},R:{lbl:{x:16,y:200},cl:{x:16,y:226,w:96,h:150},ys:[250,284,318,352],cn:{x:286,w:116,h:150}},cnt:{x:442},sep:172,note:{x:16,y:410}}
   :{T:{lbl:{x:60,y:40},cl:{x:60,y:66,w:140,h:84},ys:[108],cn:{x:640,w:180,h:70}},R:{lbl:{x:60,y:212},cl:{x:60,y:238,w:140,h:170},ys:[262,298,334,370],cn:{x:640,w:180,h:170}},cnt:{x:892},sep:182,note:{x:60,y:430}};
  return L},
 build(){
  const f=L.f;
  protoBuild({clients:['客户端 A','客户端 B','客户端 C'],side:'2 3',band:'共享存储',dimCl:['','1 3 4 5','1 3 4 5']});
  E.base.dataset.show='1 2 3 4 5';
  const g=E.base,bl=L.bl,br=L.br;
  box(bl,g,'box',12);tx(bl.x+14,bl.y+bl.h-18,'共享 \\data',f.sm,'ttl','start',g);
  const fx=bl.x+bl.w/2,fy=bl.y+48;E.fileTop=fy-20;E.fileX=fx;
  line(P(fx,L.fabY),P(fx,E.fileTop),'',g);E.file=chip(fx,fy,L.fileW,40,'a.docx',f.chip,'file',g);
  box(br,g,'box',12);tx(br.x+br.w-14,br.y+br.h-18,'会话状态（SCM）',f.sm,'ttl','end',g);
  const sw=L.mobile?168:250,sp=L.mobile?28:30,s0=L.mobile?20:24,sx=br.x+14+sw/2;E.stX=sx;E.stTop=br.y;
  line(P(sx,L.fabY),P(sx,br.y),'',g);
  E.st=['会话：客户端 A','句柄：a.docx','租约：a.docx'].map((s,k)=>{const c=chip(sx,br.y+s0+k*sp,sw,26,s,f.chip,'vio',g);c.g.style.opacity=0;return c});
  /* 第 6 步：比赛 */
  const gr=grp('6');const R=L.race;E.race={};
  [['T','一条连接'],['R','多通道']].forEach(([k,name])=>{const ln=R[k],o={};E.race[k]=o;
   tx(ln.lbl.x,ln.lbl.y,name,f.lbl+2,'lbl b7','start',gr);
   box(ln.cl,gr);tx(ln.cl.x+ln.cl.w/2,ln.cl.y+ln.cl.h-18,'客户端',f.sm,'ink3-t','middle',gr);
   const cr={x:ln.cn.x,y:C(ln.cl).y-ln.cn.h/2,w:ln.cn.w,h:ln.cn.h};box(cr,gr);
   if(k==='T'&&!L.mobile)vpair(cr.x+cr.w/2,cr.y+22,'CNode 1',f.lbl,'lbl b7',gr,L.logoH,L.lbl1);else tx(cr.x+cr.w/2,cr.y+22,'CNode 1',f.lbl,'lbl b7','middle',gr);
   if(k==='T'&&L.mobile)vmark(cr.x+2,cr.y-11,L.logoH,gr,'start');
   chip(cr.x+cr.w/2,cr.y+cr.h-24,L.chipW,L.chipH,'地址 1',f.chip,'on',gr);
   o.lanes=ln.ys.map(y=>{const a=P(ln.cl.x+ln.cl.w,y),b=P(cr.x,y);line(a,b,'',gr);return [a,b]});
   tx(R.cnt.x,C(ln.cl).y-20,'已送达',f.sm,'ink3-t','middle',gr);o.n=tx(R.cnt.x,C(ln.cl).y+14,'0',f.big,'num '+(k==='T'?'rose-t':'sage-t'),'middle',gr)});
  el('line',{x1:L.mobile?16:60,y1:R.sep,x2:L.W-(L.mobile?16:60),y2:R.sep,class:'sep'},gr);
  tx(R.note.x,R.note.y,'示意，不代表实测数字',f.sm,'ink3-t','start',gr);
 },
 reset(){protoReset();E.st.forEach(c=>{c.g.style.opacity=0;c.g.setAttribute('class','chip vio')});E.file.g.setAttribute('class','chip file');E.sideB&&E.sideB.classList.remove('on');E.pk&&(E.pk.style.opacity=1)},
 modes:[]
};
function lit(list){E.cn.forEach(c=>c.b.classList.remove('on'));list.forEach(([segs,r])=>{if(r<0)return;const s=segs[Math.floor(r)];if(s&&s.k!=null)E.cn[s.k].b.classList.add('on')})}
/* 第 1 步：映射共享 */
SCENE.modes[0]={enter(){cap('共享 \\data 映射成本机的 Z: 盘','slate-t');note('SMB 2.1 · SMB 3.0 · 签名与加密');
  S.v.a=viaCn(0,0,E.fileX,E.fileTop);S.v.b=backCn(0,0,E.fileX,E.fileTop);S.v.p=pk();S.v.q=pk('ok');S.v.la=seqLen(S.v.a);S.v.lb=seqLen(S.v.b)},
 frame(t){const per=S.v.la+S.v.lb+3.2,u=t%per,t1=0.3+S.v.la+0.25;
  const r1=seq(S.v.p,S.v.a,u,0.3),r2=seq(S.v.q,S.v.b,u,t1);lit([[S.v.a,r1],[S.v.b,r2]]);
  E.chips[0].g.classList.toggle('on',r1>=0&&r1<3||r2>=0&&r2<3);E.file.g.classList.toggle('on',r1>=2.8&&r2<0.5);
  const done=r2>=3;csub(0,done?'映射为 Z:':'',done?'sage-t':'');E.cl[0].b.classList.toggle('ok',done)}};
/* 第 2 步：DNS 轮询 */
SCENE.modes[1]={enter(){E.sideT.textContent=T('DNS');cap('集群 DNS：轮询分配 VIP','slate-t');note('客户端使用 VIP 池的域名');
  S.v.c=[0,1,2].map(i=>({q:dot('v'),a:dot('ok'),m:pk(),r1:[{p:E.R.toSide(i)}],r2:[{p:rev(E.R.toSide(i))}],r3:[{p:E.R.toCn(i,i)}]}))},
 frame(t){const per=10.4,u=t%per;let any=false;
  S.v.c.forEach((c,i)=>{const t0=0.3+i*2.9,d1=seqLen(c.r1),d2=seqLen(c.r2);
   const a=seq(c.q,c.r1,u,t0),b=seq(c.a,c.r2,u,t0+d1+0.15),m=seq(c.m,c.r3,u,t0+d1+d2+0.35);
   if(a>=0&&a<1||b>=0&&b<1)any=true;
   csub(i,b>=1?'地址 '+(i+1):'',b>=1?'slate-t':'');E.chips[i].g.classList.toggle('on',m>=1)});
  E.sideB.classList.toggle('on',any)}};
/* 第 3 步：Kerberos */
SCENE.modes[2]={enter(){E.sideT.textContent=T('AD 域控');cap('向域控取 Kerberos 服务票据','violet-t');note('启用 NTLM 时可回退到 NTLMv2');
  const v=S.v;v.r1=[{p:E.R.toSide(0)}];v.r2=[{p:rev(E.R.toSide(0))}];v.r3=[{p:E.R.toCn(0,0)},{w:0.35,k:0}];v.r4=[{p:rev(E.R.toCn(0,0))}];
  v.q=dot();v.tk=pk('v');v.p=pk('v');v.ok=pk('ok');v.t2=0.3+seqLen(v.r1)+0.2;v.t3=v.t2+seqLen(v.r2)+0.6;v.t4=v.t3+seqLen(v.r3)+0.25;v.per=v.t4+seqLen(v.r4)+2.4},
 frame(t){const v=S.v,u=t%v.per;
  const a=seq(v.q,v.r1,u,0.3),b=seq(v.tk,v.r2,u,v.t2),c=seq(v.p,v.r3,u,v.t3),d=seq(v.ok,v.r4,u,v.t4);lit([[v.r3,c],[v.r4,d]]);
  E.sideB.classList.toggle('on',a>=0.9&&b<0.3);E.chips[0].g.classList.toggle('on',c>=0&&c<3||d>=0&&d<3);
  csub(0,d>=1?'已登录':b>=1?'已取票据':'',d>=1?'sage-t':'violet-t');E.cl[0].b.classList.toggle('ok',d>=1)}};
/* 第 4 步：会话状态写进 SCM */
SCENE.modes[3]={enter(){cap('CNode 1 把会话、句柄、租约写进 SCM','violet-t');note('各 CNode 可读取共享状态');csub(0,'已登录','sage-t');
  const v=S.v;v.r1=[{p:E.R.toCn(0,0)},{w:0.4,k:0}];v.r2=[{p:E.R.cnTo(0,E.fileX,E.fileTop)}];v.r3=E.st.map((c,k)=>[{p:E.R.cnTo(0,E.stX,E.stTop)},{w:0.15,at:P(E.stX,E.stTop)}]);
  v.p=pk();v.d=E.st.map(()=>dot('v'));v.t1=0.3+seqLen(v.r1);v.per=v.t1+3*0.7+seqLen(v.r3[0])+3},
 frame(t){const v=S.v,u=t%v.per;const a=seq(v.p,v.r1,u,0.3);seq(v.p2||(v.p2=pk()),v.r2,u,v.t1);lit([[v.r1,a]]);E.chips[0].g.classList.toggle('on',a>=0&&a<1);
  const fr=u>=v.t1+seqLen(v.r2);E.file.g.classList.toggle('on',fr);if(u>=v.t1&&u<v.t1+2.2)E.cn[0].b.classList.add('on');
  E.st.forEach((c,k)=>{const r=seq(v.d[k],v.r3[k],u,v.t1+k*0.7);c.g.style.opacity=r>=1?1:0});
  csub(0,fr?(L.mobile?'已打开':'已打开 a.docx'):'已登录',fr?'slate-t':'sage-t')}};
/* 第 5 步：坏一台 CNode */
SCENE.modes[4]={enter(){cap('CNode 2 读取共享连接状态','sage-t');note('持续可用共享 · SMB 3.0 持久句柄');E.st.forEach(c=>c.g.style.opacity=1);E.file.g.classList.add('on');csub(0,L.mobile?'已打开':'已打开 a.docx','slate-t');
  const v=S.v;v.r1=[{p:E.R.toCn(0,1)},{w:0.3,k:1}];v.r2=[{p:rev(E.R.cnTo(1,E.stX,E.stTop))},{w:0.3,k:1}];v.r3=[{p:rev(E.R.toCn(0,1))}];
  v.p=pk();v.d=dot('v');v.ok=pk('ok');v.t2=seqLen(v.r1);v.t3=v.t2+seqLen(v.r2);v.per=v.t3+seqLen(v.r3)+2.4},
 frame(t){failCn(0,clamp(t/1.8,0,1));E.cn[0].b.classList.remove('on');
  if(t<2.4){csub(0,'连接中断','rose-t');return}const v=S.v,u=(t-2.4)%v.per;
  const a=seq(v.p,v.r1,u,0),b=seq(v.d,v.r2,u,v.t2),c=seq(v.ok,v.r3,u,v.t3);lit([[v.r1,a],[v.r2,b]]);E.cn[0].b.classList.remove('on');
  E.chips[0].g.classList.toggle('on',a>=0&&a<1||c>=0&&c<1);E.st.forEach(s=>s.g.classList.toggle('keep',b>=0&&b<2));
  const done=c>=1||t>2.4+v.per;csub(0,done?'句柄已恢复':'重连中',done?'sage-t':'slate-t')}};
/* 第 6 步：多通道，两条路同时跑 */
SCENE.modes[5]={enter(){cap('同一会话可使用多条连接','slate-t');note('多条连接使用同一个 VIP');S.v.cyc=-1},
 frame(t){const per=9,c=Math.floor(t/per),u=t-c*per,v=S.v,gap=0.75,travel=1.5,blocks=10;
  if(c!==v.cyc){S.items.forEach(o=>o.el.remove());S.items=[];v.cyc=c;v.f={T:[],R:[]};v.n={T:0,R:0}}
  ['T','R'].forEach(k=>{const o=E.race[k];
   o.lanes.forEach((ln,j)=>{const off=j*gap/o.lanes.length;
    for(let m=0;j+m*o.lanes.length<blocks;m++){const t0=0.3+off+m*gap;if(t0>u)break;const key=j+'-'+m;let it=v.f[k][key];
     if(!it){it=v.f[k][key]={o:pk(k==='T'?'':'ok'),done:false}}
     const p=(u-t0)/travel;if(p<1)put(it.o,at(ln,p),1);else{if(!it.done){it.done=true;v.n[k]++}if(p<1.2)put(it.o,ln[1],1-(p-1)/0.2);else hide(it.o)}}});
   o.n.textContent=v.n[k]});
  const fa=u>8.6?Math.max(0,(per-u)/0.4):u<0.3?u/0.3:1;E.pk.style.opacity=fa;E.race.T.n.style.opacity=fa;E.race.R.n.style.opacity=fa}};
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
