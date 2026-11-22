/* KV Cache 共享层：六步动画（SVG 加小仿真，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['d-kv'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件，页面翻到哪一步就调 show(i)。第 6 步画面里有一个切换按钮（EXAScaler / Infinia），?prod=infinia 直接打开 Infinia。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   文字有中英两套，跟着页面的 ss-lang 事件重画。样式在 assets/anim/d-kv.css。 */
(function(){
var EN={"节点 A":"Node A","节点 B":"Node B","请求":"Request","GPU 显存":"GPU HBM","主机内存 / 本地盘":"Host RAM / local disk","不经过":"Bypassed",
  "共享存储":"Shared storage","网卡":"NIC","推理框架":"Framework","前缀 → 位置":"Prefix → where","在共享层":"Shared tier",
  "前缀 1":"Prefix 1","前缀 2":"Prefix 2","前缀 3":"Prefix 3","忙着算":"Busy","空闲":"Idle",
  "预填充：计算中":"Prefill: computing","解码：每生成一个字都读这些块":"Decode: every new token reads these blocks","显存满了":"GPU memory full",
  "前缀 1 被挤掉":"Prefix 1 evicted","前缀 3 算完":"Prefix 3 done","预填充：算前缀 3":"Prefill: prefix 3",
  "前缀 1 又来了，只能重算":"Prefix 1 again: must recompute","前缀 1 重算了一遍":"Prefix 1 recomputed","前缀 1 只能重算":"Recomputing prefix 1",
  "前缀 1 挪到下一层":"Prefix 1 moved down a tier","前缀 1 又来了：读回，不重算":"Prefix 1 again: read back, no recompute","读回了，没有重算":"Read back, not recomputed",
  "写进共享层":"Written to the shared tier","同一前缀：从共享层读":"Same prefix: read from shared tier","不用重算":"No recompute",
  "先问框架：前缀 1 在哪":"Ask the framework: where is prefix 1?","去共享层读":"Read from the shared tier",
  "推理框架只管索引和调度，不经手数据":"Framework: index only, no data","经网卡直连：GPU 显存 ↔ 存储":"Direct via NIC: GPU memory ↔ storage",
  "共享文件系统，按文件读写":"Shared file system, by file","键值存储，按键读写":"Key-value store, by key",
  "可走 GPUDirect Storage":"Can use GPUDirect Storage","经 NIXL 插件接入 Dynamo":"Joins Dynamo via NIXL plugin",
  "⇄ 换成 ":"⇄ Switch to ","切换产品，当前 ":"Switch product, now ",
  "KV Cache：显存装不下时挪到下一层，放进共享存储后别的节点直接读回，不用重算":"KV cache: moved down a tier when GPU memory is full, and read back by other nodes from shared storage instead of recomputed"};
function lang(){return window.SS_LANG==='en'?'en':'zh'}
function T(s){return lang()==='en'&&EN[s]!==undefined?EN[s]:s}
var LOGO={ddn:'assets/brand/ddn-logo-primary-color.svg',nv:'assets/brand/nvidia-logo-horz-trim.svg'};
function mount(host,opts){
opts=opts||{};
const NS='http://www.w3.org/2000/svg';
host.classList.add('an-d-kv');host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','an-scene');svg.setAttribute('role','img');host.appendChild(svg);
const btn=document.createElement('button');btn.className='netbtn';btn.type='button';btn.hidden=true;host.appendChild(btn);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mq=matchMedia('(max-width: 640px)');
const qs=new URLSearchParams(location.search);
let L,E,S,step=0,prod=qs.get('prod')==='infinia'?'inf':'exa';
const P=(x,y)=>({x,y});
const GC=['', 'slate','v','o'];   // 前缀 1/2/3 的颜色

/* 在 SVG 里放一个官方 logo（站内 assets/brand 的原件）：h 是高度，宽按原件比例；返回 {g,w,h} */
function brandLogo(key,x,y,h,p){const A={ddn:280/93,nv:2090/414}[key],w=h*A,px=h*0.22,py=h*0.16;
  const g=document.createElementNS(NS,'g');(p||svg).appendChild(g);
  const bk=document.createElementNS(NS,'rect');
  for(const [k,v] of Object.entries({x:x-px,y:y-py,width:w+2*px,height:h+2*py,rx:2,class:'lgbk'}))bk.setAttribute(k,v);g.appendChild(bk);
  const im=document.createElementNS(NS,'image');
  for(const [k,v] of Object.entries({x,y,width:w,height:h,href:(window.SS_ROOT||'')+LOGO[key]}))im.setAttribute(k,v);
  im.setAttribute('aria-label',key==='ddn'?'DDN':'NVIDIA');g.appendChild(im);return {g,w,h,bk,im,x}}
/* NVIDIA logo 让开「GPU 显存」：英文更长时往外让，中文版位置不变 */
function placeLogos(){['A','B'].forEach(sd=>{const o=E[sd]&&E[sd].nv;if(!o)return;let r;try{r=o.t.getComputedTextLength()}catch(e){return}
  const x0=+o.t.getAttribute('x');let dx=0;
  if(o.mir){const start=x0-r;dx=Math.min(0,start-10-(o.lg.x+o.lg.w))}else{dx=Math.max(0,x0+r+10-o.lg.x)}
  o.lg.g.setAttribute('transform',dx?`translate(${dx.toFixed(1)} 0)`:'')});
  setProd(prod,false)}

/* ---------- 版式 ---------- */
function layout(m){
  if(!m){
    const W=960,H=490;
    const xsA=[70,116,162,208,254,300],xsB=xsA.map(x=>W-x).reverse();
    const A={frame:{x:16,y:40,w:376,h:260},title:{x:34,y:64,a:'start'},gpu:{x:36,y:86,w:336,h:84},host:{x:36,y:214,w:336,h:72},
      cx:204,req:{x:300,y0:40},gs:xsA.map(x=>P(x,146)),hs:xsA.map(x=>P(x,240)),gLbl:110,hLbl:270,
      link:[P(372,128),P(420,128),P(420,360)],note:{x:34,y:322,a:'start'}};
    const B={frame:{x:568,y:40,w:376,h:260},title:{x:926,y:64,a:'end'},gpu:{x:588,y:86,w:336,h:84},host:{x:588,y:214,w:336,h:72},
      cx:756,req:{x:660,y0:40},gs:xsB.map(x=>P(x,146)),hs:xsB.map(x=>P(x,240)),gLbl:110,hLbl:270,
      link:[P(588,128),P(540,128),P(540,360)],note:{x:926,y:322,a:'end'}};
    return {m,W,H,A,B,f:{lbl:20,sm:17,note:16},pw:30,ph:22,
      sto:{x:340,y:360,w:280,h:90,ny:434,rail:374,s:[375,417,459,501,543,585].map(x=>P(x,404))},leg:{x:480,y:18,a:'middle'},
      fw:{x:404,y:40,w:152,h:72},cmd:'M640 86 V76 H556',
      desc:{x:34,y:392,a:'start',dy:24},side:{x:944,y:404,a:'end'},btn:{x:480,y:470},sp:280,
      nic:{A:230,B:230,w:24,h:40,lab:[{x:480,y:230,a:'middle'}]},nvH:15,ddnH:20};
  }
  const W=480,H=764;
  const xs=[64,120,176,232,288,344];
  const A={frame:{x:10,y:10,w:438,h:226},title:{x:26,y:34,a:'start'},gpu:{x:24,y:56,w:410,h:80},host:{x:24,y:168,w:410,h:58},
    cx:240,req:{x:380,y0:10},gs:xs.map(x=>P(x,112)),hs:xs.map(x=>P(x,190)),gLbl:76,hLbl:211,
    link:[P(434,96),P(460,96),P(460,296)],note:{x:26,y:262,a:'start'}};
  const B={frame:{x:10,y:426,w:438,h:228},title:{x:26,y:446,a:'start'},gpu:{x:24,y:462,w:410,h:80},host:{x:24,y:574,w:410,h:60},
    cx:240,req:{x:380,y0:426},gs:xs.map(x=>P(x,518)),hs:xs.map(x=>P(x,598)),gLbl:482,hLbl:619,
    link:[P(434,502),P(460,502),P(460,380)],note:{x:26,y:676,a:'start'}};
  return {m,W,H,A,B,f:{lbl:18,sm:17,note:17},pw:28,ph:20,
    sto:{x:150,y:296,w:320,h:84,ny:366,rail:310,s:[190,234,278,322,366,410].map(x=>P(x,338))},
    leg:{x:26,y:284,a:'start'},fw:{x:10,y:300,w:130,h:72},cmd:'M200 462 V404 H75 V372',
    desc:{x:26,y:704,a:'start',dy:22},side:{x:26,y:750,a:'start'},btn:{x:310,y:400},sp:240,
    nic:{A:262,B:404,w:18,h:34,lab:[{x:440,y:262,a:'end'},{x:440,y:404,a:'end'}]},nvH:14,ddnH:17};
}

/* ---------- 画布 ---------- */
function el(tag,a,p){const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);(p||svg).appendChild(e);return e}
function tx(x,y,s,size,cls,anchor,p){const t=el('text',{x,y,'font-size':size,class:cls||''},p);if(anchor)t.setAttribute('text-anchor',anchor);t.textContent=T(s);return t}
function grp(show,p){const g=el('g',{class:'vis'},p);if(show)g.dataset.show=show;return g}
const ln=(x1,y1,x2,y2,cls,p)=>el('line',{x1,y1,x2,y2,class:'ln '+cls},p);
const pl=(pts,cls,p)=>el('path',{d:'M'+pts.map(q=>q.x+' '+q.y).join(' L'),class:'ln '+cls},p);

function build(){
  svg.innerHTML='';E={};
  svg.setAttribute('viewBox',`0 0 ${L.W} ${L.H}`);
  const f=L.f,en=lang()==='en';
  ['A','B'].forEach(sd=>{
    const n=L[sd],g=el('g',{});E[sd]={};
    el('rect',{x:n.frame.x,y:n.frame.y,width:n.frame.w,height:n.frame.h,rx:20,class:'frame'},g);
    tx(n.title.x,n.title.y,'节点 '+sd,f.lbl,'ttl',n.title.a,g);
    // 请求入口（手机版英文字较长，放到入口线左边）
    ln(n.req.x,n.req.y0,n.req.x,n.gpu.y,'base',g);
    if(en&&L.m)tx(n.req.x-20,(n.req.y0+n.gpu.y)/2,'请求',f.note,'ink3-t','end',g);
    else tx(n.req.x+20,(n.req.y0+n.gpu.y)/2,'请求',f.note,'ink3-t','start',g);
    // 显存与主机内存之间的线
    E[sd].hl=ln(n.cx,n.gpu.y+n.gpu.h,n.cx,n.host.y,'base',g);
    // 到共享存储的线
    E[sd].link=pl(n.link,'base',g);
    // 显存
    el('rect',{x:n.gpu.x,y:n.gpu.y,width:n.gpu.w,height:n.gpu.h,rx:12,class:'blk'},g);
    // 桌面版节点 B 的线从显存框左边进出：B 的标题行左右镜像（状态条在左、「GPU 显存」在右），数据块不再擦过字
    const mir=!L.m&&sd==='B';
    const gt=tx(mir?n.gpu.x+n.gpu.w-16:n.gpu.x+16,n.gLbl,'GPU 显存',f.lbl,'lbl',mir?'end':'start',g);
    const bx=mir?n.gpu.x+16:n.gpu.x+n.gpu.w-68;
    // GPU 是 NVIDIA 的：每一步都标 NVIDIA logo（让开忙闲状态字）
    {const h=L.nvH,w=h*2090/414;E[sd].nv={t:gt,mir,lg:brandLogo('nv',mir?bx+127:bx-72-w,n.gLbl-h/2,h,g)}}
    el('rect',{x:bx,y:n.gLbl-6,width:52,height:12,rx:3,class:'track'},g);
    E[sd].bar=el('rect',{x:bx,y:n.gLbl-6,width:0,height:12,rx:3,class:'fill rose'},g);
    E[sd].st=mir?tx(bx+60,n.gLbl,'',f.sm,'st','start',g):tx(bx-8,n.gLbl,'',f.sm,'st','end',g);
    n.gs.forEach(s=>el('rect',{x:s.x-L.pw/2,y:s.y-L.ph/2,width:L.pw,height:L.ph,rx:4,class:'ghost'},g));
    // 主机内存 / 本地盘
    E[sd].host=el('g',{class:'vis'},g);
    el('rect',{x:n.host.x,y:n.host.y,width:n.host.w,height:n.host.h,rx:12,class:'blk'},E[sd].host);
    tx(n.host.x+16,n.hLbl,'主机内存 / 本地盘',f.lbl,'lbl','start',E[sd].host);
    n.hs.forEach(s=>el('rect',{x:s.x-L.pw/2,y:s.y-L.ph/2,width:L.pw,height:L.ph,rx:4,class:'ghost'},E[sd].host));
    E[sd].nob=tx(n.host.x+n.host.w-16,n.hLbl,'不经过',f.sm,'ink3-t st','end',grp('6',g));
    E[sd].note=tx(n.note.x,n.note.y,'',f.sm,'st',n.note.a,g);
  });
  // 共享存储
  const s=L.sto;
  E.sto=el('rect',{x:s.x,y:s.y,width:s.w,height:s.h,rx:12,class:'blk sto'});
  E.stoN=tx(s.x+s.w/2,s.ny,'共享存储',f.lbl,'lbl b7','middle');
  s.s.forEach(q=>el('rect',{x:q.x-L.pw/2,y:q.y-L.ph/2,width:L.pw,height:L.ph,rx:4,class:'ghost'}));
  // 共享存储是 DDN 的（第 6 步点名 EXAScaler / Infinia）：每一步名字左边都放 DDN logo，位置在 setProd 里按名字宽度算
  E.stoLg=brandLogo('ddn',0,0,L.ddnH);
  // 第 6 步：两条线上画出网卡，数据块从网卡穿过
  {const ng=grp('6'),k=L.nic;['A','B'].forEach(sd=>{const x=L[sd].link[1].x,y=k[sd];
     el('rect',{x:x-k.w/2,y:y-k.h/2,width:k.w,height:k.h,rx:4,class:'nic'},ng);
     for(let i=0;i<2;i++)el('rect',{x:x-k.w*0.22,y:y-k.h*0.32+i*k.h*0.36,width:k.w*0.44,height:k.h*0.26,rx:1.5,class:'nicp'},ng)});
   k.lab.forEach(q=>tx(q.x,q.y,'网卡',f.note,'sage-t b7',q.a,ng))}
  {const dg=grp('6');E.desc=tx(L.desc.x,L.desc.y,'',f.sm,'slate-t st',L.desc.a,dg);E.desc2=tx(L.desc.x,L.desc.y+L.desc.dy,'',f.sm,'slate-t st',L.desc.a,dg)}
  E.side=tx(L.side.x,L.side.y,'',f.sm,'st',L.side.a,grp('5 6'));
  // 推理框架（第 5 步）
  const fg=grp('5'),w=L.fw;
  E.fw=el('rect',{x:w.x,y:w.y,width:w.w,height:w.h,rx:12,class:'fw'},fg);
  tx(w.x+w.w/2,w.y+22,'推理框架',f.lbl,'violet-t b7','middle',fg);
  tx(w.x+w.w/2,w.y+50,'前缀 → 位置',f.note,'ink2-t','middle',fg);
  E.cmd=el('path',{d:L.cmd,class:'cmdl'},fg);
  E.cdot=el('circle',{r:L.m?6:7,class:'cmddot'},fg);E.cdot.style.opacity=0;
  E.fwT=tx(w.x+w.w/2,L.m?w.y+w.h+18:w.y+w.h+18,'在共享层',f.sm,'violet-t st','middle',fg);E.fwT.style.opacity=0;
  if(L.m)E.fwT.setAttribute('x',w.x+w.w+60);
  {const lg=L.leg,g=el('g',{}),items=[['前缀 1','slate'],['前缀 2','v'],['前缀 3','o']],w=en?(L.m?108:104):86;
   const x0=lg.a==='middle'?lg.x-w*1.5:lg.x;
   items.forEach(([t,c],i)=>{const x=x0+i*w;el('rect',{x,y:lg.y-8,width:20,height:16,rx:3,class:'pkt '+c},g);tx(x+26,lg.y,t,f.note,'ink2-t','start',g)})}
  E.pk=el('g',{});
  btn.style.left=(L.btn.x/L.W*100)+'%';btn.style.top=(L.btn.y/L.H*100)+'%';
  placeLogos();
}

/* ---------- 块 ---------- */
function newSim(){S={t:0,ct:0,cyc:-1,bl:[],G:{A:Array(6).fill(null),B:Array(6).fill(null)},H:{A:Array(6).fill(null),B:Array(6).fill(null)},T:Array(6).fill(null),
  bz:{A:0,B:0},bv:{A:0,B:0},ev:[],note:{A:'',B:''},cmdT:-1,ans:-1,flow:0}}
function blk(p,cls){const g=el('g',{},E.pk);const r=el('rect',{x:-L.pw/2,y:-L.ph/2,width:L.pw,height:L.ph,rx:4,class:'pkt '+(cls||'')},g);
  const b={g,r,x:p.x,y:p.y,a:1,mv:null,fa:null,fin:false};S.bl.push(b);return b}
function go(b,pts,done,sp){b.mv={pts:pts.slice(1),i:0,sp:sp||L.sp,done}}
function kill(b,d){b.fa={t:0,d:d||0.45}}
function at(t,fn){S.ev.push({t,fn})}
const N=sd=>L[sd];
/* 一组 = 3 块，占连续三格 */
function grpSlots(arr,gi){return arr.map((v,i)=>v&&v.gi===gi?i:-1).filter(i=>i>=0)}
function freeSlots(arr,n){const o=[];arr.forEach((v,i)=>{if(!v&&o.length<n)o.push(i)});return o.length===n?o:null}
function putG(sd,gi,slots){slots.forEach(i=>{const b=blk(N(sd).gs[i],GC[gi]);S.G[sd][i]={gi,b}})}
function putT(gi,slots){slots.forEach(i=>{const b=blk(L.sto.s[i],GC[gi]);S.T[i]={gi,b}})}
function request(sd,then){const n=N(sd),b=blk(P(n.req.x,n.req.y0),'q');b.a=0;go(b,[P(n.req.x,n.req.y0),P(n.req.x,n.gpu.y)],()=>{kill(b,0.3);then&&then()})}
/* 预填充：在显存里一格一格算出来，GPU 忙 */
function compute(sd,gi,slots,done,note){S.bz[sd]=0.85;S.note[sd]=note||'预填充：计算中';
  slots.forEach((i,k)=>at(S.ct+0.55*(k+1),()=>{const b=blk(N(sd).gs[i],GC[gi]);b.a=0;b.fin=true;S.G[sd][i]={gi,b};
    if(k===slots.length-1){S.bz[sd]=0;done&&done()}}))}
function evict(sd,gi){grpSlots(S.G[sd],gi).forEach(i=>{kill(S.G[sd][i].b,0.6);S.G[sd][i]=null})}
/* 显存 ↔ 主机内存：搬过去，不是复制 */
function down(sd,gi,done){const n=N(sd),fr=grpSlots(S.G[sd],gi),to=freeSlots(S.H[sd],fr.length);let c=0;
  fr.forEach((i,k)=>{const v=S.G[sd][i];S.G[sd][i]=null;S.H[sd][to[k]]={gi,b:v.b,moving:true};
    at(S.ct+k*0.25,()=>go(v.b,[n.gs[i],P(n.cx,n.gpu.y+n.gpu.h),P(n.cx,n.host.y),n.hs[to[k]]],()=>{S.H[sd][to[k]].moving=false;if(++c===fr.length&&done)done()}))})}
function up(sd,gi,done){const n=N(sd),fr=grpSlots(S.H[sd],gi),to=freeSlots(S.G[sd],fr.length);let c=0;
  fr.forEach((i,k)=>{const v=S.H[sd][i];S.H[sd][i]=null;S.G[sd][to[k]]={gi,b:v.b};
    at(S.ct+k*0.25,()=>go(v.b,[n.hs[i],P(n.cx,n.host.y),P(n.cx,n.gpu.y+n.gpu.h),n.gs[to[k]]],()=>{if(++c===fr.length&&done)done()}))})}
/* 显存 → 共享存储：分身 */
function toStore(sd,gi,done){const n=N(sd),fr=grpSlots(S.G[sd],gi);let to=freeSlots(S.T,fr.length);
  if(!to){const old=S.T.find(v=>v);if(old){const og=old.gi;S.T.forEach((v,i)=>{if(v&&v.gi===og){kill(v.b,0.5);S.T[i]=null}})}to=freeSlots(S.T,fr.length)}
  let c=0;S.flow++;
  fr.forEach((i,k)=>{S.T[to[k]]={gi,b:null};at(S.ct+k*0.55,()=>{const b=blk(n.gs[i],GC[gi]);S.T[to[k]].b=b;
    const e=n.link[n.link.length-1],q=L.sto.s[to[k]],ry=L.sto.rail;go(b,[n.gs[i],...n.link,P(e.x,ry),P(q.x,ry),q],()=>{if(++c===fr.length){S.flow--;done&&done()}})})})}
/* 共享存储 → 显存：分身 */
function fromStore(sd,gi,done){const n=N(sd),fr=grpSlots(S.T,gi),to=freeSlots(S.G[sd],fr.length);let c=0;S.flow++;
  fr.forEach((i,k)=>{S.G[sd][to[k]]={gi,b:null};at(S.ct+k*0.55,()=>{const b=blk(L.sto.s[i],GC[gi]);S.G[sd][to[k]].b=b;
    const e=n.link[n.link.length-1],q=L.sto.s[i],ry=L.sto.rail;go(b,[q,P(q.x,ry),P(e.x,ry),...n.link.slice().reverse(),n.gs[to[k]]],()=>{if(++c===fr.length){S.flow--;done&&done()}})})})}

/* ---------- 每一步 ---------- */
const MODES=[
  /* 1 先算出 KV */
  {P:9,setup(){S.note.A='';
     at(0.4,()=>request('A',()=>compute('A',1,[0,1,2],()=>{S.note.A='解码：每生成一个字都读这些块'})))}},
  /* 2 装不下要重算 */
  {P:13,setup(){putG('A',1,[0,1,2]);putG('A',2,[3,4,5]);S.note.A='显存满了';
     at(0.6,()=>request('A',()=>{evict('A',1);S.note.A='前缀 1 被挤掉';
       at(S.ct+0.8,()=>compute('A',3,[0,1,2],()=>{S.note.A='前缀 3 算完'},'预填充：算前缀 3'))}));
     at(5.4,()=>request('A',()=>{evict('A',2);S.note.A='前缀 1 又来了，只能重算';
       at(S.ct+0.8,()=>compute('A',1,[3,4,5],()=>{S.note.A='前缀 1 重算了一遍'},'前缀 1 只能重算'))}))}},
  /* 3 往下放一层 */
  {P:14,setup(){putG('A',1,[0,1,2]);putG('A',2,[3,4,5]);S.note.A='显存满了';
     at(0.6,()=>request('A',()=>{S.note.A='前缀 1 挪到下一层';down('A',1,()=>compute('A',3,[0,1,2],()=>{S.note.A='前缀 3 算完'}))}));
     at(6.6,()=>request('A',()=>{S.note.A='前缀 1 又来了：读回，不重算';down('A',2,()=>{up('A',1,()=>{S.note.A='读回了，没有重算'})});S.bz.A=0.12;at(S.ct+1.2,()=>S.bz.A=0)}))}},
  /* 4 共享层 */
  {P:12,setup(){putG('A',1,[0,1,2]);
     at(0.5,()=>{S.note.A='写进共享层';toStore('A',1,()=>{})});
     at(4.2,()=>request('B',()=>{S.note.B='同一前缀：从共享层读';fromStore('B',1,()=>{S.note.B='不用重算'})}))}},
  /* 5 谁管什么 */
  {P:12,setup(){putG('A',1,[0,1,2]);putT(1,[0,1,2]);S.note.A='';
     at(0.5,()=>request('B',()=>{S.note.B='先问框架：前缀 1 在哪';S.cmdT=S.ct}));
     at(3.4,()=>{S.note.B='去共享层读';fromStore('B',1,()=>{S.note.B='不用重算'})})}},
  /* 6 数据怎么走 */
  {P:12,setup(){putT(2,[3,4,5]);putG('A',1,[0,1,2]);
     at(0.4,()=>toStore('A',1));at(3.0,()=>fromStore('B',1));
     at(5.4,()=>{evict('A',1);});at(5.8,()=>compute('A',3,[3,4,5]));
     at(7.8,()=>toStore('A',3));at(10.0,()=>{})}}
];

/* ---------- 主循环 ---------- */
function clear(){if(S)S.bl.forEach(b=>b.g.remove())}
function tick(dt){
  S.t+=dt;const M=MODES[step];
  const c=Math.floor(S.t/M.P);if(c!==S.cyc){if(S.cyc>=0){const keep=S.t;clear();newSim();S.t=keep;M.setup()}S.cyc=c}
  S.ct=S.t-c*M.P;
  S.ev.sort((a,b)=>a.t-b.t);while(S.ev.length&&S.ev[0].t<=S.ct){S.ev.shift().fn()}
  for(const b of S.bl){
    if(b.mv){let d=b.mv.sp*dt;
      while(d>0&&b.mv){const tg=b.mv.pts[b.mv.i],dx=tg.x-b.x,dy=tg.y-b.y,ds=Math.hypot(dx,dy);
        if(ds<=d){b.x=tg.x;b.y=tg.y;d-=ds;b.mv.i++;if(b.mv.i>=b.mv.pts.length){const fn=b.mv.done;b.mv=null;fn&&fn()}}
        else{b.x+=dx/ds*d;b.y+=dy/ds*d;d=0}}}
    if(b.a<1&&!b.fa)b.a=Math.min(1,b.a+dt/(b.fin?0.4:0.2));
    if(b.fa){b.fa.t+=dt;b.a=Math.max(0,1-b.fa.t/b.fa.d);if(b.a<=0){b.g.remove();b.dead=true}}
  }
  S.bl=S.bl.filter(b=>!b.dead);
  ['A','B'].forEach(sd=>{const tg=S.bz[sd]+(S.bz[sd]>0.5?0.06*Math.sin(S.t*8):0);S.bv[sd]+=(tg-S.bv[sd])*(1-Math.exp(-dt/(tg>S.bv[sd]?0.3:0.5)))});
}
function render(){
  for(const b of S.bl){b.g.setAttribute('transform',`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)})`);b.g.style.opacity=b.a.toFixed(2)}
  const M=MODES[step],ct=S.ct;const fa=ct>M.P-0.4?Math.max(0,(M.P-ct)/0.4):(S.cyc>0&&ct<0.4?ct/0.4:1);
  E.pk.style.opacity=fa;
  ['A','B'].forEach(sd=>{const v=Math.max(0,Math.min(1,S.bv[sd]));
    E[sd].bar.setAttribute('width',(52*v).toFixed(1));
    E[sd].st.textContent=T(v>0.4?'忙着算':'空闲');E[sd].st.setAttribute('class','st '+(v>0.4?'rose-t':'ink3-t'));
    E[sd].note.textContent=T(S.note[sd]);E[sd].note.style.opacity=fa;
    const nc=/重算|挤掉|计算中/.test(S.note[sd])&&!/没有|不用/.test(S.note[sd])?'rose-t':/不用|没有|读回|共享/.test(S.note[sd])?'sage-t':'ink2-t';
    E[sd].note.setAttribute('class','st '+nc);
    E[sd].host.style.opacity=step>=3?0.3:1;E[sd].hl.style.opacity=step>=3?0.3:1;
    E[sd].link.setAttribute('class','ln base'+(step===5?' sg':''));E[sd].link.style.opacity=step<3?0.3:1;
  });
  // 命令点：B → 框架 → B
  if(step===4){const c=S.ct-S.cmdT,Lp=E.cmd.getTotalLength();let on=S.cmdT>=0&&c>=0&&c<2.0;E.cdot.style.opacity=on?1:0;
    if(on){const u=c<0.9?c/0.9:c<1.1?1:1-(c-1.1)/0.9;const q=E.cmd.getPointAtLength(Lp*Math.max(0,Math.min(1,u)));E.cdot.setAttribute('cx',q.x);E.cdot.setAttribute('cy',q.y)}
    E.fwT.style.opacity=S.cmdT>=0&&c>=0.9&&c<4?1:0;
    E.side.textContent=T('推理框架只管索引和调度，不经手数据');E.side.setAttribute('class','st violet-t')}
  if(step===5){E.side.textContent=T('经网卡直连：GPU 显存 ↔ 存储');E.side.setAttribute('class','st sage-t')}
}
function setProd(p,flash){
  prod=p;const ex=p==='exa';
  if(!E.stoN)return;
  E.stoN.textContent=step===5?(ex?'EXAScaler':'Infinia'):T('共享存储');
  {let w=0;try{w=E.stoN.getComputedTextLength()}catch(e){}
   const cx=L.sto.x+L.sto.w/2,lw=E.stoLg.w,x0=cx-w/2-12-lw,sh=Math.max(0,L.sto.x+12-x0);   // 英文名字太宽时整组往右挪，不让 logo 出框
   E.stoN.setAttribute('x',(cx+sh).toFixed(1));
   E.stoLg.g.setAttribute('transform',`translate(${(x0+sh).toFixed(1)} ${(L.sto.ny-L.ddnH/2).toFixed(1)})`)}
  E.desc.textContent=T(ex?'共享文件系统，按文件读写':'键值存储，按键读写');E.desc2.textContent=T(ex?'可走 GPUDirect Storage':'经 NIXL 插件接入 Dynamo');
  btn.textContent=T('⇄ 换成 ')+(ex?'Infinia':'EXAScaler');
  btn.setAttribute('aria-label',T('切换产品，当前 ')+(ex?'EXAScaler':'Infinia'));
  if(flash){E.sto.classList.remove('flip');void E.sto.getBBox();E.sto.classList.add('flip')}
}
btn.addEventListener('click',()=>setProd(prod==='exa'?'inf':'exa',true));
function applyVis(){
  svg.setAttribute('data-step',step+1);
  svg.querySelectorAll('[data-show]').forEach(g=>g.classList.toggle('hid',!g.dataset.show.split(' ').includes(String(step+1))));
  btn.hidden=step!==5;
}
const NSTEP=6;
let raf=0,last=0,paused=!!opts.paused,dead=false;
function loop(now){const dt=Math.max(0,Math.min(0.05,(now-last)/1000||0));last=now;tick(dt);render();raf=requestAnimationFrame(loop)}
function startLoop(){cancelAnimationFrame(raf);if(paused||dead||reduce)return;last=performance.now();raf=requestAnimationFrame(loop)}
function enter(i){
  step=i;cancelAnimationFrame(raf);clear();newSim();applyVis();setProd(prod,false);MODES[i].setup();
  if(reduce){const lim=[3,10,10,8,7,6][i];for(let t=0;t<lim;t+=1/60)tick(1/60);render();return}
  render();startLoop();
}
function setup(){L=layout(mq.matches);build();svg.setAttribute('aria-label',T('KV Cache：显存装不下时挪到下一层，放进共享存储后别的节点直接读回，不用重算'));if(opts.onLayout)opts.onLayout(L.W/L.H,L.m)}
function rebuild(){setup();enter(step)}
mq.addEventListener('change',rebuild);
const onLang=()=>rebuild();document.addEventListener('ss-lang',onLang);
setup();
if(document.fonts&&document.fonts.status!=='loaded')document.fonts.ready.then(()=>{if(!dead)placeLogos()});
const ctrl={
  show(i){enter(Math.max(0,Math.min(NSTEP-1,i)))},
  pause(){paused=true;cancelAnimationFrame(raf)},
  resume(){if(!paused)return;paused=false;startLoop()},
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML=''},
  ratio(){return L.W/L.H},
  step(){return step}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['d-kv']={steps:6,mount:mount};
})();
