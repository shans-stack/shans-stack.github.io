/* 多路径：一个挂载点用上多块网卡和多台 CNode：6 步动画（SVG，按时间写死的时间线，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-mpath'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-mpath.css，全部限定在 .ssa-v-mpath 容器之内。 */
(function(){
var EN={"客户端服务器": "Client server", "应用": "App", "NFS 客户端": "NFS client", "多路径组件": "Multipath", "VAST 提供，开源": "Open source", "网卡 0": "NIC 0", "网卡 1": "NIC 1", "地址 1": "IP 1", "地址 2": "IP 2", "地址 3": "IP 3", "地址 4": "IP 4", "占用很高": "High", "占用升高": "Rising", "占用较低": "Low", "挂载时多写两项：ClientIP=本机地址列表，ServerIP=各 CNode 地址列表": "Two extra mount options: ClientIP = local addresses, ServerIP = CNode addresses", "挂载多写两项：ClientIP、ServerIP 地址列表": "Two extra mount options: ClientIP, ServerIP", "一条连接": "One connection", "多路径": "Multipath", "客户端": "Client", "已送达": "Delivered", "示意，不代表实测数字": "Schematic, not measured", "一条连接：一个地址，一台 CNode": "One connection: one IP, one CNode", "nconnect：四条连接，还是同一台 CNode": "nconnect: four connections, still one CNode", "多路径：四条连接，四台 CNode": "Multipath: four connections, four CNodes", "两块网卡一起发，按 NUMA 走就近的网卡": "Both NICs send; each CPU uses its nearest NIC (NUMA)", "协议仍是标准 NFS": "Still standard NFS", "NFS 多路径：从一条连接、nconnect 多条连接到同一台 CNode，再到多路径摊到多块网卡和多台 CNode": "NFS multipath: from one connection, to nconnect's several connections to one CNode, to multipath spreading across several NICs and CNodes"};
var ENM={"两块网卡一起发，按 NUMA 走就近的网卡": "Both NICs send; nearest NIC per CPU (NUMA)", "VAST 提供，开源": "VAST, open source"};
var ARIA="NFS 多路径：从一条连接、nconnect 多条连接到同一台 CNode，再到多路径摊到多块网卡和多台 CNode";
function lang(){return window.SS_LANG==='en'?'en':'zh'}
var NS='http://www.w3.org/2000/svg';
function mount(host,opts){
opts=opts||{};
host.classList.add('ssa-v-mpath');host.innerHTML='';
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
/* NFS 多路径：一条连接 → nconnect → 多路径（多地址、多网卡） */
function run(o,pts,t,t0,dur,fo){fo=fo==null?0.3:fo;if(t<t0||t>t0+dur+fo){put(o,-99,-99,0);return -1}const u=(t-t0)/dur;if(u<=1){put(o,at(pts,u),1);return u}put(o,pts[pts.length-1],1-(t-t0-dur)/fo);return 1.5}
function toward(o,x,y,d){const dx=x-o.x,dy=y-o.y,l=Math.hypot(dx,dy);if(l<=d){o.x=x;o.y=y;return true}o.x+=dx/l*d;o.y+=dy/l*d;return false}
const SCENE={
 still:[2.2,4.0,4.0,3.0,6.6,3.0],
 layout(mobile){
  if(!mobile)return {W:960,H:500,mobile:false,f:{lbl:19,sm:17,cap:18,big:34},pw:24,ph:18,dr:7,sp:300,
   host:{x:20,y:50,w:296,h:404},hostTtl:{x:36,y:74},
   nic:{x:216,w:90,h:50,cs:[170,330]},app:{x:44,y:223,w:120,h:54},cpu:{x:44,w:120,h:54,cs:[170,330]},
   stk:{x:30,w:170,spine:182,row:14,app:{y:92,h:40},nfs:{y:158,h:40},mp:{y:224,h:76},t1:38,t2:60},bendApp:190,bendStk:208,
   cn:{x:700,w:230,h:68,cs:[100,200,300,400]},
   cap:{x:944,y:26,a:'end'},note:{x:500,y:482},
   lanes:{1:[[0,0,0,0,500]],2:[[0,0,-18,-18,0],[0,0,-6,-6,0],[0,0,6,6,0],[0,0,18,18,0]],3:[[0,0,-18,0,600],[0,1,-6,0,540],[0,2,6,0,480],[0,3,18,0,420]],4:[[0,0,-9,0,520],[0,1,9,0,460],[1,2,-9,0,520],[1,3,9,0,460]]},bundleBase:500,
   race:{T:{lbl:{x:40,y:82},cl:{x:40,y:110,w:120,h:70},ys:[145],cn:{x:700,w:130},cnH:60,cnt:{x:890,ly:120,ny:158}},
         R:{lbl:{x:40,y:262},cl:{x:40,y:290,w:120,h:140},ys:[312,344,376,408],cn:{x:700,w:130},cnH:26,cnt:{x:890,ly:330,ny:370}},
         gap:28,cap:4,sep:228,note:{x:40,y:474}}};
  return {W:480,H:630,mobile:true,f:{lbl:17,sm:16,cap:17,big:30},pw:20,ph:15,dr:6,sp:200,
   host:{x:12,y:10,w:456,h:300},hostTtl:{x:26,y:30},
   nic:{y:240,w:110,h:48,cs:[130,350]},app:{x:180,y:120,w:120,h:48},cpu:{y:120,w:110,h:48,cs:[130,350]},
   stk:{x:150,w:180,spine:312,row:12,app:{y:40,h:38},nfs:{y:92,h:38},mp:{y:144,h:70},t1:36,t2:58},bendApp:204,
   cn:{y:470,w:104,h:92,cs:[66,182,298,414]},
   cap:{x:240,y:590,a:'middle'},note:{x:240,y:614},
   lanes:{1:[[0,0,0,0,380]],2:[[0,0,-18,-18,0],[0,0,-6,-6,0],[0,0,6,6,0],[0,0,18,18,0]],3:[[0,0,-18,0,410],[0,1,-6,0,380],[0,2,6,0,350],[0,3,18,0,320]],4:[[0,0,-9,0,400],[0,1,9,0,360],[1,2,-9,0,400],[1,3,9,0,360]]},bundleBase:380,
   race:{T:{lbl:{x:16,y:44},cl:{x:16,y:70,w:96,h:70},ys:[105],cn:{x:300,w:92},cnH:50,cnt:{x:438,ly:84,ny:118}},
         R:{lbl:{x:16,y:264},cl:{x:16,y:290,w:96,h:150},ys:[310,343,376,409],cn:{x:300,w:92},cnH:26,cnt:{x:438,ly:330,ny:366}},
         gap:26,cap:3,sep:224,note:{x:16,y:606}}};
 },
 build(){
  const f=L.f,M=L.mobile;
  const g=grp('1 2 3 4 6');E.g=g;
  box(L.host,g,'box soft',16);tx(L.hostTtl.x,L.hostTtl.y,'客户端服务器',f.sm,'ttl','start',g);
  E.nic=L.nic.cs.map(c=>M?{x:c-L.nic.w/2,y:L.nic.y,w:L.nic.w,h:L.nic.h}:{x:L.nic.x,y:c-L.nic.h/2,w:L.nic.w,h:L.nic.h});
  E.cn=L.cn.cs.map(c=>M?{x:c-L.cn.w/2,y:L.cn.y,w:L.cn.w,h:L.cn.h}:{x:L.cn.x,y:c-L.cn.h/2,w:L.cn.w,h:L.cn.h});
  /* 应用 → 网卡（第 1–3 步） */
  const ga=grp('1 2 3',g);const ar=L.app,ac=C(ar);E.appC=ac;
  const linkA=k=>{const n=C(E.nic[k]);return M?[P(ac.x,ar.y+ar.h),P(ac.x,L.bendApp),P(n.x,L.bendApp),P(n.x,E.nic[k].y)]:[P(ar.x+ar.w,ac.y),P(L.bendApp,ac.y),P(L.bendApp,n.y),P(E.nic[k].x,n.y)]};
  E.appLink=[linkA(0),linkA(1)];poly(E.appLink[0],'',ga);const d1=el('g',{},ga);d1.dataset.dim='1 2 3';poly(E.appLink[1],'',d1);
  box(ar,ga);tx(ac.x,ac.y,'应用',f.lbl,'lbl','middle',ga);
  /* CPU → 网卡（第 4 步） */
  const gc=grp('4',g);E.cpu=L.cpu.cs.map(c=>M?{x:c-L.cpu.w/2,y:L.cpu.y,w:L.cpu.w,h:L.cpu.h}:{x:L.cpu.x,y:c-L.cpu.h/2,w:L.cpu.w,h:L.cpu.h});
  E.cpuLink=E.cpu.map((r,k)=>{const n=E.nic[k];return M?[P(r.x+r.w/2,r.y+r.h),P(r.x+r.w/2,n.y)]:[P(r.x+r.w,r.y+r.h/2),P(n.x,r.y+r.h/2)]});
  E.cpuLink.forEach(p=>poly(p,'',gc));E.cpu.forEach((r,k)=>{box(r,gc);tx(C(r).x,C(r).y,'CPU '+k,f.lbl,'lbl','middle',gc)});
  /* 应用 → NFS 客户端 → 多路径组件 → 网卡（第 6 步）：数据沿每层右侧的竖线走，不压字 */
  const gs=grp('6',g),K=L.stk,sx=K.spine,tcx=K.x+(sx-12-K.x)/2;
  const R3=['app','nfs','mp'].map(k=>({x:K.x,y:K[k].y,w:K.w,h:K[k].h}));const ra=R3[0],rn=R3[1],rm=R3[2],row=rm.y+K.row;
  E.stkPath=[P(sx,ra.y+ra.h/2),P(sx,ra.y+ra.h),P(sx,rn.y),P(sx,rn.y+rn.h),P(sx,rm.y),P(sx,row)];
  line(P(sx,ra.y+ra.h),P(sx,rn.y),'',gs);line(P(sx,rn.y+rn.h),P(sx,rm.y),'',gs);
  E.mpLink=[0,1].map(k=>{const n=C(E.nic[k]);
   if(M){const side=k===0?rm.x:rm.x+rm.w,bx=n.x;return [P(sx,row),P(side,row),P(bx,row),P(bx,E.nic[k].y)]}
   return [P(sx,row),P(rm.x+rm.w,row),P(L.bendStk,row),P(L.bendStk,n.y),P(E.nic[k].x,n.y)]});
  E.mpLink.forEach(p=>poly(p.slice(1),'',gs));
  box(ra,gs);tx(tcx,ra.y+ra.h/2,'应用',f.lbl,'lbl','middle',gs);
  box(rn,gs);tx(tcx,rn.y+rn.h/2,'NFS 客户端',f.lbl,'lbl','middle',gs);
  E.mpB=box(rm,gs);E.mpB.classList.add('hl');tx(tcx,rm.y+K.t1,'多路径组件',f.lbl,'lbl b7','middle',gs);tx(tcx,rm.y+K.t2,'VAST 提供，开源',f.sm,'ochre-t st','middle',gs);
  tx(L.note.x,L.note.y,M?'挂载多写两项：ClientIP、ServerIP 地址列表':'挂载时多写两项：ClientIP=本机地址列表，ServerIP=各 CNode 地址列表',f.sm,'ink2-t','middle',gs);
  /* 网卡 */
  E.nicB=E.nic.map((r,k)=>{const gg=el('g',{},g);if(k===1)gg.dataset.dim='1 2 3';const b=box(r,gg);
   if(M)tx(k===0?r.x-6:r.x+r.w+6,C(r).y,'网卡 '+k,f.lbl,'lbl',k===0?'end':'start',gg);else tx(C(r).x,r.y-14,'网卡 '+k,f.lbl,'lbl','middle',gg);return b});
  /* 连接线图层 */
  E.cg=el('g',{},g);
  /* CNode：标签、地址、占用条 */
  E.fill=[];E.st=[];E.cnB=[];
  E.cn.forEach((r,k)=>{E.cnB.push(box(r,g));const c=C(r);
   if(M){tx(c.x,r.y+20,'CNode',f.lbl,'lbl b7','middle',g);tx(c.x,r.y+46,'地址 '+(k+1),f.sm,'ink3-t','middle',g);
    el('rect',{x:r.x+12,y:r.y+66,width:r.w-24,height:10,rx:4,class:'track'},g);E.fill.push(el('rect',{x:r.x+12,y:r.y+66,width:0,height:10,rx:4,class:'fill'},g));E.st.push(null)}
   else{tx(r.x+16,c.y-12,'CNode',f.lbl,'lbl b7','start',g);tx(r.x+r.w-14,c.y-12,'地址 '+(k+1),f.sm,'ink3-t','end',g);
    el('rect',{x:r.x+16,y:c.y+12,width:124,height:10,rx:4,class:'track'},g);E.fill.push(el('rect',{x:r.x+16,y:c.y+12,width:0,height:10,rx:4,class:'fill'},g));
    E.st.push(tx(r.x+r.w-14,c.y+17,'',f.sm,'st','end',g))}});
  E.cap=tx(L.cap.x,L.cap.y,'',f.cap,'st',L.cap.a,g);
  /* ---- 第 5 步：两条路同时跑 ---- */
  const gr=grp('5');const R=L.race;E.race={};
  ['T','R'].forEach(k=>{const ln=R[k],o={};E.race[k]=o;
   tx(ln.lbl.x,ln.lbl.y,k==='T'?'一条连接':'多路径',f.lbl+3,'lbl b7','start',gr);
   o.cl=ln.cl;box(ln.cl,gr,'box');tx(ln.cl.x+ln.cl.w/2,ln.cl.y+ln.cl.h-14,'客户端',f.sm,'ink3-t','middle',gr);
   o.exits=ln.ys.map(y=>P(ln.cl.x+ln.cl.w,y));o.ends=ln.ys.map(y=>P(ln.cn.x,y));
   ln.ys.forEach((y,j)=>{line(o.exits[j],o.ends[j],'cx',gr);const r={x:ln.cn.x,y:y-ln.cnH/2,w:ln.cn.w,h:ln.cnH};box(r,gr,'box',8);tx(r.x+r.w/2,y,'CNode',ln.cnH>40?f.lbl:f.sm,'lbl','middle',gr)});
   tx(ln.cnt.x,ln.cnt.ly,'已送达',f.sm,'ink3-t','middle',gr);o.n=tx(ln.cnt.x,ln.cnt.ny,'0',f.big,'num '+(k==='T'?'rose-t':'sage-t'),'middle',gr);
   const qy=k==='T'?ln.ys[0]:ln.cl.y+ln.cl.h/2-14;o.slot=i=>P(ln.cl.x+ln.cl.w-16-i*R.gap,qy)});
  el('line',{x1:M?16:32,y1:R.sep,x2:L.W-(M?16:32),y2:R.sep,class:'sep'},gr);
  tx(R.note.x,R.note.y,'示意，不代表实测数字',f.sm,'ink3-t','start',gr);
  /* 路线工具 */
  E.conn=(n,k,o,o2,base)=>{const s0=E.nic[n],r=E.cn[k];
   if(M){const s=P(s0.x+s0.w/2+o,s0.y+s0.h),e=P(r.x+r.w/2+o2,r.y);const by=base||(L.bundleBase+o*Math.sign(s.x-e.x||1));return [s,P(s.x,by),P(e.x,by),e]}
   const s=P(s0.x+s0.w,s0.y+s0.h/2+o),e=P(r.x,r.y+r.h/2+o2);const bx=base||(L.bundleBase+o*Math.sign(s.y-e.y||1));return [s,P(bx,s.y),P(bx,e.y),e]};
 },
 reset(){E.cg.innerHTML='';E.cap.textContent='';E.fill.forEach(x=>x.setAttribute('width',0));E.st.forEach(s=>s&&(s.textContent=''));
  svg.querySelectorAll('.box').forEach(d=>d.classList.remove('on','ok'));if(E.race){E.race.T.n.textContent='0';E.race.R.n.textContent='0'}E.pk.style.opacity=1},
 modes:[]
};
function cap(s,c){E.cap.textContent=T(s);E.cap.setAttribute('class','st '+c)}
const dur=pts=>plen(pts)/L.sp;
/* 一组连接上的数据流；src(n) 给出从源到网卡中心的路线 */
function flows(stepNo,src,capT,capC){
 cap(capT,capC);const lanes=L.lanes[stepNo];
 S.v.c=lanes.map(([n,k,o,o2,base])=>{const c=E.conn(n,k,o,o2,base);poly(c,'cx',E.cg);const nc=C(E.nic[n]);return {n,k,r:cat(src(n),[nc,c[0]],c)}});
 S.v.pool=[];for(let i=0;i<16;i++)S.v.pool.push(pk());S.v.lv=[0,0,0,0];
}
function flowFrame(t,dt,gap){
 const N=S.v.c.length,used=new Set(),busy=[0,0,0,0];
 S.v.c.forEach((c,j)=>{const d=Math.min(dur(c.r),2.6),off=j*gap/N,n1=Math.floor((t-off)/gap),n0=Math.max(0,Math.floor((t-off-d-0.3)/gap));
  for(let m=n0;m<=n1;m++){if(m<0)continue;const o=S.v.pool[(j*4+m)%16];used.add(o);run(o,c.r,t,off+m*gap,d,0.3)}
  busy[c.k]++});
 S.v.pool.forEach(o=>{if(!used.has(o))put(o,-99,-99,0)});
 /* 占用条：跟着连到这台的连接数走，慢慢涨上去 */
 busy.forEach((b,k)=>{const tg=Math.min(0.95,b*0.22),tau=tg>S.v.lv[k]?1.6:0.8;S.v.lv[k]+=(tg-S.v.lv[k])*(1-Math.exp(-dt/tau));const lv=S.v.lv[k];
  const w=L.mobile?(E.cn[k].w-24):124;E.fill[k].setAttribute('width',(w*lv).toFixed(1));E.fill[k].setAttribute('class','fill'+(lv>0.55?'':' sl'));
  if(E.st[k]){E.st[k].textContent=T(lv<0.05?'':lv>0.7?'占用很高':lv>0.4?'占用升高':'占用较低');E.st[k].setAttribute('class','st '+(lv>0.55?'rose-t':'ink3-t'))}});
}
const srcApp=n=>cat(E.appLink[n],[C(E.nic[n])]);
SCENE.modes[0]={sim:1,enter(){flows(1,srcApp,'一条连接：一个地址，一台 CNode','slate-t')},frame(t,dt){flowFrame(t,dt,0.9)}};
SCENE.modes[1]={sim:1,enter(){flows(2,srcApp,'nconnect：四条连接，还是同一台 CNode','rose-t')},frame(t,dt){flowFrame(t,dt,0.9)}};
SCENE.modes[2]={sim:1,enter(){flows(3,srcApp,'多路径：四条连接，四台 CNode','sage-t')},frame(t,dt){flowFrame(t,dt,0.9)}};
SCENE.modes[3]={sim:1,enter(){flows(4,n=>cat(E.cpuLink[n],[C(E.nic[n])]),'两块网卡一起发，按 NUMA 走就近的网卡','sage-t')},frame(t,dt){flowFrame(t,dt,0.9)}};
SCENE.modes[5]={sim:1,enter(){flows(4,n=>cat(E.stkPath,E.mpLink[n],[C(E.nic[n])]),'协议仍是标准 NFS','slate-t')},frame(t,dt){flowFrame(t,dt,0.9)}};
/* 第 5 步：一条连接 vs 多路径，同样的需求同时跑 */
SCENE.modes[4]={sim:1,enter(){S.v.lane={T:{q:[],fly:[],busy:[0],cnt:0},R:{q:[],fly:[],busy:[0,0,0,0],cnt:0}};S.v.spawn=0;S.v.cyc=-1;S.v.rr=0},
 frame(t,dt){const per=9,c=Math.floor(t/per),u=t-c*per,R=L.race;
  if(c!==S.v.cyc){if(S.v.cyc>=0){S.items.forEach(o=>o.el.remove());S.items=[]}S.v.cyc=c;S.v.lane={T:{q:[],fly:[],busy:[0],cnt:0},R:{q:[],fly:[],busy:[0,0,0,0],cnt:0}};S.v.spawn=0}
  const SVC=1.0,GAP=0.3;
  if(u<7.4){S.v.spawn-=dt;if(S.v.spawn<=0){S.v.spawn+=GAP;['T','R'].forEach(k=>{const ln=S.v.lane[k];if(ln.q.length<R.cap){const o=pk();const s=E.race[k].slot(ln.q.length);put(o,s,0);ln.q.push(o)}})}}
  ['T','R'].forEach(k=>{const ln=S.v.lane[k],G=E.race[k];
   ln.busy.forEach((b,j)=>{if(u>=b&&ln.q.length){const o=ln.q.shift();const pts=[P(o.x,o.y),G.exits[j],G.ends[j]];o.go={pts,t0:u,d:plen(pts)/L.sp*1.15};ln.busy[j]=u+SVC;ln.fly.push(o)}});
   ln.q.forEach((o,i)=>{const s=G.slot(i);toward(o,s.x,s.y,L.sp*dt);put(o,o.x,o.y,Math.min(1,o.a+dt*4))});
   ln.fly=ln.fly.filter(o=>{const v=(u-o.go.t0)/o.go.d;if(v<1){put(o,at(o.go.pts,v),1);return true}
    if(!o.done){o.done=1;ln.cnt++}const a=1-(u-o.go.t0-o.go.d)/0.3;if(a<=0){o.el.remove();o.dead=1;return false}put(o,o.go.pts[2],a);return true});
   G.n.textContent=ln.cnt});
  S.items=S.items.filter(o=>!o.dead);
  const f=u>8.6?Math.max(0,(per-u)/0.4):u<0.4?u/0.4:1;E.pk.style.opacity=f;E.race.T.n.style.opacity=f;E.race.R.n.style.opacity=f}};
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
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('ssa-v-mpath')},
  ratio(){return L.W/L.H},
  step(){return step},
  sim(){return {step,v:S.v,n:S.items.length,t:(performance.now()-T0)/1000}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['v-mpath']={steps:6,mount:mount};
})();
