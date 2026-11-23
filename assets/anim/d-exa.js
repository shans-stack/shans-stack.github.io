/* EXAScaler：成千上万台节点怎么同时读写同一份数据。七步动画（SVG 加时间线，不依赖动画库）。
   接口与 assets/anim/rdma.js 相同：
     var a = SSAnim['d-exa'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) / a.pause() / a.resume() / a.destroy() / a.ratio() / a.step()
   步骤状态归页面管，动画只保留第 6 步画面里的「加一台数据服务器」按钮。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步快进到预设时刻定格。
   数据块由精灵池逐帧绘制，位置一律由路线折线插值，只落在画出来的线上或方块里。
   文字有中英两套，跟着页面的 ss-lang 事件重画。样式在 assets/anim/d-exa.css。 */
(function(){
var EN={"服务器 ": "Server ", "客户端": "Client", "示意，不代表实测数字": "Schematic, not measured", "计算节点": "Compute nodes", "节点 ": "Node ", "一台文件服务器": "One file server", "门口一次只放一块": "Serves one block at a time", "排队": "Queue", "元数据服务器（MDS）": "Metadata server (MDS)", "目录 · 文件名 · 布局": "Directories · names · layouts", "文件 A 的布局": "Layout of file A", "这一步不参与": "Not involved here", "数据服务器（OSS）": "Data servers (OSS)", "总容量 = 各台容量之和": "Total capacity = sum of all servers", "文件 A 原地不动，新文件 B 用上了第 5 台": "File A stays put; new file B uses server 5", "文件 A 写在 4 台上；新文件 B 也分到 4 台": "File A is on 4 servers; new file B also uses 4", "只有一台": "One server", "四台一起": "Four servers", "服务器": "Server", "已送达": "Delivered", "EXAScaler 加的功能": "What EXAScaler adds", "开源 Lustre（前面几步讲的就是它）": "Open-source Lustre (the previous steps)", "存储硬件：预装、调好，上架就能用": "Storage hardware: preinstalled, tuned, ready to rack", "存储硬件：预装、调好": "Hardware: preinstalled", "DNE3 元数据扩展": "DNE3 metadata", "DoM 小文件": "DoM small files", "PFL 渐进布局": "PFL layouts", "Hot Pools 冷热分层": "Hot Pools tiering", "多租户隔离": "Multi-tenancy", "NFS / SMB 网关": "NFS / SMB gateway", "S3 数据服务": "S3 data service", "Insight 监控": "Insight monitoring", "＋ 加一台数据服务器": "+ Add a data server", "− 回到 4 台": "− Back to 4 servers", "计算节点、元数据服务器和数据服务器之间的数据怎么走": "How data moves between compute nodes, the metadata server and the data servers"};
/* 画面里的切换按钮：第几步（0 起）有按钮，两种状态各写什么 */
var TG={"5": ["＋ 加一台数据服务器", "− 回到 4 台"]};
function lang(){return window.SS_LANG==='en'?'en':'zh'}
function T(s){return lang()==='en'&&EN[s]!==undefined?EN[s]:s}
function Z(zh,en){return lang()==='en'?en:zh}
function mount(host,opts){
opts=opts||{};
/* ---------- 公共小工具：画布、数据块、沿线移动 ---------- */
const NS='http://www.w3.org/2000/svg';
host.classList.add('d-exa');host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','d-exa-scene');svg.setAttribute('role','img');host.appendChild(svg);
const tgl=document.createElement('button');tgl.className='d-exa-tgl';tgl.type='button';tgl.hidden=true;host.appendChild(tgl);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mq=matchMedia('(max-width: 640px)');
let L,E={},step=0,T0=0,TT=0,tog=false,MODES;
function el(tag,a,p){const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);(p||svg).appendChild(e);return e}
function tx(x,y,s,size,cls,anchor,p){const t=el('text',{x,y,'font-size':size,class:cls||''},p);if(anchor)t.setAttribute('text-anchor',anchor);t.textContent=T(s);return t}
function grp(show,p,extra){const g=el('g',Object.assign({class:'vis'},extra||{}),p);if(show)g.dataset.show=show;return g}
function dimOn(g,steps){g.dataset.dim=steps;return g}
function rect(r,cls,p,rx){return el('rect',{x:r.x,y:r.y,width:r.w,height:r.h,rx:rx==null?12:rx,class:cls},p)}
function line(a,b,cls,p){return el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'ln '+(cls||'')},p)}
function wires(pts,cls,p){const out=[];for(let i=1;i<pts.length;i++)out.push(line(pts[i-1],pts[i],cls,p));return out}
const C=r=>({x:r.x+r.w/2,y:r.y+r.h/2});
const P=(x,y)=>({x,y});
function plen(pts){let s=0;for(let i=1;i<pts.length;i++)s+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);return s}
function atD(pts,d){d=Math.max(0,d);for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],l=Math.hypot(b.x-a.x,b.y-a.y);if(d<=l||i===pts.length-1){const k=l?Math.min(1,d/l):0;return {x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k}}d-=l}return pts[pts.length-1]}
const atU=(pts,u)=>atD(pts,plen(pts)*Math.max(0,Math.min(1,u)));
const rev=pts=>pts.slice().reverse();
const cat=(...a)=>{const o=[];a.forEach(p=>p.forEach(q=>{const l=o[o.length-1];if(!l||l.x!==q.x||l.y!==q.y)o.push(q)}));return o};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fade=(t,t0,t1)=>clamp((t-t0)/(t1-t0),0,1);
const sm=u=>u<=0?0:u>=1?1:u*u*(3-2*u);
/* 数据块精灵池：每帧 put 想画的块，没 put 到的自动删掉 */
const POOL=new Map();let SEEN=new Set();
function mk(o){
  const g=el('g',{class:'pk'},E.pk);const s={g,k:o.k||'blk'};
  if(s.k==='req'){s.r=el('circle',{r:L.rr,class:'req'},g)}
  else if(s.k==='lay'){const w=L.lw,h=L.lh;s.r=el('rect',{x:-w/2,y:-h/2,width:w,height:h,rx:3,class:'lay'},g);
    for(let i=0;i<3;i++)el('line',{x1:-w/2+5,x2:w/2-5-(i===2?8:0),y1:-h/2+6+i*((h-12)/2),y2:-h/2+6+i*((h-12)/2),class:'layl'},g)}
  else{const w=o.w||L.pw,h=o.h||L.ph;s.r=el('rect',{x:-w/2,y:-h/2,width:w,height:h,rx:4,class:'pkt'},g);
    if(o.lab!=null){s.t=el('text',{x:0,y:1,'font-size':L.f.pk,class:'pktl'},g);s.t.textContent=o.lab}}
  return s}
function put(id,p,o){o=o||{};let s=POOL.get(id);if(!s){s=mk(o);POOL.set(id,s)}
  s.g.setAttribute('transform',`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
  s.g.style.opacity=o.a==null?1:o.a;
  const c=(s.k==='req'?'req':s.k==='lay'?'lay':'pkt')+(o.cls?' '+o.cls:'');if(s.c!==c){s.r.setAttribute('class',c);s.c=c}
  if(s.t&&o.lab!=null&&s.t.textContent!==String(o.lab))s.t.textContent=o.lab;
  SEEN.add(id);return s}
function sweep(){for(const [id,s] of POOL)if(!SEEN.has(id)){s.g.remove();POOL.delete(id)}SEEN=new Set()}
function clearPool(){for(const s of POOL.values())s.g.remove();POOL.clear();SEEN=new Set()}
/* 沿线跑：t 在 [t0, t0+dur] 内画出来，返回 0..1 进度；之前返回 -1，之后返回 2 */
function run(id,pts,t0,dur,t,o){if(t<t0)return -1;if(t>t0+dur)return 2;put(id,atU(pts,(t-t0)/dur),o);return (t-t0)/dur}
function setCls(e,c){if(e&&e.getAttribute('class')!==c)e.setAttribute('class',c)}
function setTxt(e,s){s=T(s);if(e&&e.textContent!==s)e.textContent=s}
/* 框里放不下的字（多是英文）：按可用宽度压一点字距，不出框 */
function fit(t,max){try{t.removeAttribute('textLength');t.removeAttribute('lengthAdjust');const w=t.getComputedTextLength();if(w>max){t.setAttribute('textLength',max.toFixed(1));t.setAttribute('lengthAdjust','spacingAndGlyphs')}}catch(e){}}

const ARIA='计算节点、元数据服务器和数据服务器之间的数据怎么走';
/* ================= EXAScaler：版式 ================= */
function layout(m){
  let o;
  if(!m){
    const W=960,H=476;
    const cl=[0,1,2,3].map(i=>({x:24,y:82+i*90,w:150,h:56}));
    const oss=[0,1,2,3,4].map(j=>({x:420+j*92,y:240,w:80,h:110}));
    o={m:false,W,H,f:{ttl:20,lbl:20,sm:17,note:16,big:34,pk:16,lane:22,chip:18},pw:34,ph:24,rr:8,lw:30,lh:24,gap:30,
      cl,clT:{x:24,y:52},oss,ossT:{x:420,y:162},mds:{x:420,y:36,w:460,h:84},srv:{x:520,y:225,w:260,h:100},
      busX:300,trunkY:190};
    const cy=i=>C(cl[i]).y, mY=C(o.mds).y, sY=C(o.srv).y;
    o.mdsY=mY;
    o.r={
      mds:i=>[P(174,cy(i)),P(o.busX,cy(i)),P(o.busX,mY),P(o.mds.x,mY)],
      oss:(i,j)=>[P(174,cy(i)),P(o.busX,cy(i)),P(o.busX,o.trunkY),P(C(oss[j]).x,o.trunkY),P(C(oss[j]).x,oss[j].y)],
      srv:i=>[P(174,cy(i)),P(o.busX,cy(i)),P(o.busX,sY),P(o.srv.x,sY)],
      hold:i=>P(146,cy(i))};
    o.wire={stubs:cl.map((c,i)=>[P(174,cy(i)),P(o.busX,cy(i))]),bus:[P(o.busX,cy(0)),P(o.busX,cy(3))],
      mds:[[P(o.busX,mY),P(o.busX,cy(0))],[P(o.busX,mY),P(o.mds.x,mY)]],srv:[[P(o.busX,sY),P(o.srv.x,sY)]],
      trunk:[[P(o.busX,o.trunkY),P(C(oss[3]).x,o.trunkY)]],ext:[[P(C(oss[3]).x,o.trunkY),P(C(oss[4]).x,o.trunkY)]]};
    o.card={tx:720,ty:58,cx:720,cy:94,cw:30,ch:24,dx:36};
    o.mdsLab={x:440,y:60},o.mdsSub={x:440,y:96};
    o.skip={x:C(o.mds).x+120,y:o.mds.y+o.mds.h+20,a:'middle'};
    o.qlab={x:o.srv.x-24,y:sY-24,a:'end'};
    o.cap={y:362,h:14};o.capT={x:420,y:394};o.note6={x:420,y:422};o.btn={x:700,y:454};
    o.race=raceD();o.stack=stackD();
  }else{
    /* 手机：小字统一 17（400 宽下约 12.5px） */
    const W=480,H=692;
    const cl=[0,1,2,3].map(i=>({x:16+i*116,y:52,w:100,h:62}));
    const oss=[0,1,2,3,4].map(j=>({x:16+j*92,y:386,w:80,h:110}));
    o={m:true,W,H,f:{ttl:20,lbl:18,sm:17,note:17,big:30,pk:17,lane:21,chip:17},pw:34,ph:24,rr:8,lw:26,lh:20,gap:28,
      cl,clT:{x:16,y:30},oss,ossT:{x:16,y:316},mds:{x:16,y:190,w:420,h:90},srv:{x:90,y:300,w:300,h:100},
      busY:150,busR:460,trunkY:352,mdsX:240,srvX:240};
    const cx=i=>C(cl[i]).x, bot=cl[0].y+cl[0].h;
    o.r={
      mds:i=>[P(cx(i),bot),P(cx(i),o.busY),P(o.mdsX,o.busY),P(o.mdsX,o.mds.y)],
      oss:(i,j)=>[P(cx(i),bot),P(cx(i),o.busY),P(o.busR,o.busY),P(o.busR,o.trunkY),P(C(oss[j]).x,o.trunkY),P(C(oss[j]).x,oss[j].y)],
      srv:i=>[P(cx(i),bot),P(cx(i),o.busY),P(o.srvX,o.busY),P(o.srvX,o.srv.y)],
      hold:i=>P(cx(i),bot-16)};
    o.wire={stubs:cl.map((c,i)=>[P(cx(i),bot),P(cx(i),o.busY)]),bus:[P(cx(0),o.busY),P(o.busR,o.busY)],
      mds:[[P(o.mdsX,o.busY),P(o.mdsX,o.mds.y)]],srv:[[P(o.srvX,o.busY),P(o.srvX,o.srv.y)]],
      trunk:[[P(o.busR,o.busY),P(o.busR,o.trunkY)],[P(o.busR,o.trunkY),P(C(oss[0]).x,o.trunkY)]],ext:[]};
    o.card={tx:296,ty:212,cx:296,cy:248,cw:28,ch:24,dx:34};
    o.mdsLab={x:32,y:214},o.mdsSub={x:32,y:254};
    o.skip={x:436,y:298,a:'end'};
    o.qlab={x:o.srvX+16,y:o.srv.y-40,a:'start'};
    o.cap={y:508,h:14};o.capT={x:16,y:544};o.note6={x:16,y:572};o.btn={x:240,y:628};
    o.race=raceM();o.stack=stackM();
  }
  return o;
}
function raceD(){return {title:[{x:32,y:54},{x:32,y:222}],
  top:{src:{x:150,y:96,w:120,h:52},dst:{x:640,y:96,w:130,h:52}},
  bot:{src:[262,310,358,406].map(y=>({x:150,y:y-20,w:120,h:40})),dst:{x:640,y:242,w:130,h:184}},
  cnt:[{x:860,ly:104,ny:140},{x:860,ly:316,ny:352}],sep:{y:190,x1:32,x2:928},note:{x:32,y:452}}}
function raceM(){return {title:[{x:16,y:40},{x:16,y:290}],
  top:{src:{x:16,y:80,w:100,h:48},dst:{x:352,y:80,w:112,h:48}},
  bot:{src:[340,392,444,496].map(y=>({x:16,y:y-20,w:100,h:40})),dst:{x:352,y:318,w:112,h:200}},
  cnt:[{x:408,ly:160,ny:196},{x:408,ly:556,ny:592}],sep:{y:250,x1:16,x2:464},note:{x:16,y:660}}}
const ADD=['DNE3 元数据扩展','DoM 小文件','PFL 渐进布局','Hot Pools 冷热分层','多租户隔离','NFS / SMB 网关','S3 数据服务','Insight 监控'];
const BASE=['客户端','MGS','MDS','OSS','LNet'];
function stackD(){return {top:{x:24,y:18,w:912,h:200,t:{x:44,y:44}},add:ADD.map((s,k)=>({x:44+(k%4)*222,y:70+Math.floor(k/4)*68,w:206,h:52})),
  mid:{x:24,y:234,w:912,h:124,t:{x:44,y:260}},base:BASE.map((s,k)=>({x:44+k*178,y:284,w:160,h:52})),
  hw:{x:24,y:376,w:912,h:60},hwT:'存储硬件：预装、调好，上架就能用',bay:{x0:662,n:10,w:16,gap:10,h:36}}}
function stackM(){return {top:{x:16,y:16,w:448,h:300,t:{x:32,y:42}},add:ADD.map((s,k)=>({x:32+(k%2)*212,y:68+Math.floor(k/2)*58,w:204,h:48})),
  mid:{x:16,y:334,w:448,h:182,t:{x:32,y:360}},base:BASE.map((s,k)=>({x:32+(k%3)*140,y:386+Math.floor(k/3)*58,w:132,h:48})),
  hw:{x:16,y:536,w:448,h:64},hwT:'存储硬件：预装、调好',bay:{x0:333,n:6,w:12,gap:9,h:36}}}

/* ================= 画面 ================= */
function build(){
  const f=L.f;
  const net=grp('1 2 3 4 6');
  // 计算节点
  tx(L.clT.x,L.clT.y,'计算节点',f.ttl,'ttl','start',net);
  E.cl=L.cl.map((r,i)=>{const b=rect(r,'blk',net);
    if(L.m)tx(C(r).x,r.y+18,T('节点 ')+(i+1),f.lbl,'lbl','middle',net);else tx(r.x+16,C(r).y,T('节点 ')+(i+1),f.lbl,'lbl','start',net);return b});
  L.wire.stubs.forEach(s=>wires(s,'',net));wires(L.wire.bus,'',net);
  // 单台文件服务器（第 1 步）
  const g1=grp('1',net);
  L.wire.srv.forEach(s=>wires(s,'',g1));
  E.srv=rect(L.srv,'blk',g1);
  tx(C(L.srv).x,C(L.srv).y-16,'一台文件服务器',f.lbl,'lblb','middle',g1);
  tx(C(L.srv).x,C(L.srv).y+18,'门口一次只放一块',f.note,'ink3-t','middle',g1);
  E.qlab=tx(L.qlab.x,L.qlab.y,'排队',f.sm,'rose-t st',L.qlab.a,g1);
  // 元数据服务器
  const gM=dimOn(grp('2 3 4 6',net),'4 6');
  L.wire.mds.forEach(s=>wires(s,'meta',gM));
  E.mds=rect(L.mds,'blk',gM);
  tx(L.mdsLab.x,L.mdsLab.y,'元数据服务器（MDS）',f.lbl,'lblb','start',gM);
  tx(L.mdsSub.x,L.mdsSub.y,'目录 · 文件名 · 布局',f.note,'ink2-t','start',gM);
  const k=L.card;tx(k.tx,k.ty,'文件 A 的布局',f.note,'violet-t','start',gM);
  E.cells=[0,1,2,3].map(j=>{const r=el('rect',{x:k.cx+j*k.dx,y:k.cy-k.ch/2,width:k.cw,height:k.ch,rx:4,class:'cell'},gM);
    tx(k.cx+j*k.dx+k.cw/2,k.cy+1,String(j+1),f.note,'celll',null,gM);return r});
  E.skip=tx(L.skip.x,L.skip.y,'这一步不参与',f.sm,'sage-t st',L.skip.a,grp('4',net));
  // 数据服务器
  const gO=dimOn(grp('2 3 4 6',net),'3');
  tx(L.ossT.x,L.ossT.y,'数据服务器（OSS）',f.ttl,'ttl','start',gO);
  L.wire.trunk.forEach(s=>wires(s,'data',gO));
  E.oss=L.oss.slice(0,4).map((r,j)=>{wires([P(C(r).x,L.trunkY),P(C(r).x,r.y)],'data',gO);const b=rect(r,'blk',gO);
    tx(C(r).x,r.y+r.h-20,T('服务器 ')+(j+1),f.note,'lbl','middle',gO);return b});
  // 第 5 台（第 6 步按钮加进来）
  const g5=grp('6',net);E.g5=el('g',{},g5);
  L.wire.ext.forEach(s=>wires(s,'data',E.g5));
  {const r=L.oss[4];wires([P(C(r).x,L.trunkY),P(C(r).x,r.y)],'data',E.g5);E.oss5=rect(r,'blk new',E.g5);tx(C(r).x,r.y+r.h-20,T('服务器 ')+5,f.note,'lbl','middle',E.g5)}
  // 总容量条（第 6 步）
  const g6=grp('6',net);
  L.oss.slice(0,4).forEach(r=>el('rect',{x:r.x,y:L.cap.y,width:r.w,height:L.cap.h,rx:3,class:'capseg'},g6));
  E.cap5=el('rect',{x:L.oss[4].x,y:L.cap.y,width:L.oss[4].w,height:L.cap.h,rx:3,class:'capseg new'},E.g5);
  tx(L.capT.x,L.capT.y,'总容量 = 各台容量之和',f.sm,'ink2-t','start',g6);
  E.note6=tx(L.note6.x,L.note6.y,'',f.note,'ink3-t','start',g6);
  // 第 5 步：两条通道
  const R=L.race,g=grp('5');
  tx(R.title[0].x,R.title[0].y,'只有一台',f.lane,'lblb','start',g);
  tx(R.title[1].x,R.title[1].y,'四台一起',f.lane,'lblb','start',g);
  // 服务器名放在框里偏左：数据块从框右端出发，不压字
  E.fits=[];const ep=(r,s,right)=>{rect(r,'ep',g,10);if(right)tx(r.x+r.w-12,C(r).y,s,f.note,'lbl','end',g);else E.fits.push([tx(r.x+(r.w-L.pw)/2,C(r).y,s,f.note,'lbl','middle',g),r.w-L.pw-6])};
  wires([P(R.top.src.x+R.top.src.w,C(R.top.src).y),P(R.top.dst.x,C(R.top.src).y)],'data',g);
  ep(R.top.src,'服务器');ep(R.top.dst,'客户端',1);
  R.bot.src.forEach((r,j)=>{wires([P(r.x+r.w,C(r).y),P(R.bot.dst.x,C(r).y)],'data',g);ep(r,T('服务器 ')+(j+1))});
  ep(R.bot.dst,'客户端',1);
  E.cnt=R.cnt.map((c,k)=>{tx(c.x,c.ly,'已送达',f.note,'ink3-t','middle',g);return tx(c.x,c.ny,'0',f.big,'num '+(k?'sage-t':'rose-t'),'middle',g)});
  el('line',{x1:R.sep.x1,y1:R.sep.y,x2:R.sep.x2,y2:R.sep.y,class:'sep'},g);
  tx(R.note.x,R.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',g);
  // 第 7 步：三层
  const S=L.stack,g7=grp('7');
  rect(S.top,'frame',g7,18);tx(S.top.t.x,S.top.t.y,'EXAScaler 加的功能',f.ttl,'slate-t','start',g7).style.fontWeight=700;
  E.add=S.add.map((r,k)=>{const gg=el('g',{},g7);rect(r,'chip add',gg,10);tx(C(r).x,C(r).y,ADD[k],f.chip,'lbl','middle',gg);return gg});
  rect(S.mid,'frame',g7,18);tx(S.mid.t.x,S.mid.t.y,'开源 Lustre（前面几步讲的就是它）',f.ttl,'ttl','start',g7);
  S.base.forEach((r,k)=>{rect(r,'chip',g7,10);tx(C(r).x,C(r).y,BASE[k],f.chip,'lbl','middle',g7)});
  rect(S.hw,'chip hw',g7,12);
  {const cy=C(S.hw).y,b=S.bay;
   tx(S.top.t.x,cy,S.hwT,f.chip,'lblb','start',g7);
   for(let i=0;i<b.n;i++)el('rect',{x:b.x0+i*(b.w+b.gap),y:cy-b.h/2,width:b.w,height:b.h,rx:2,class:'bay'},g7)}
}

/* ================= 每一步 ================= */
function modes(){
  const spd=L.m?280:320;
  const pieceA=j=>P(C(L.oss[j]).x,L.oss[j].y+60), pieceB=j=>P(C(L.oss[j]).x,L.oss[j].y+28);
  const dur=pts=>plen(pts)/spd;
  const showA=(a)=>{for(let j=0;j<4;j++)put('A'+j,pieceA(j),{lab:'A'+(j+1),a:a==null?1:a})};
  return {
  /* 1：大家挤一台服务器，门口排队 */
  0:{still:8,enter(){const S=E.s1={k:0,next:0.3,reqs:[],q:[],cur:null,left:0,blks:[],seen:false};E.qlab.style.opacity=0;setCls(E.srv,'blk')},
    frame(t,dt){const S=E.s1,C1=11,tc=t%C1;
      if(t-(S.cyc||0)>=C1){S.cyc=(S.cyc||0)+C1;S.k=0;S.next=0.3;S.reqs=[];S.q=[];S.cur=null;S.blks=[];S.seen=false}
      const order=[0,2,1,3];
      while(tc>=S.next&&S.next<8.6){const i=order[S.k%4],pts=L.r.srv(i);S.reqs.push({id:'r'+S.k,i,pts,len:plen(pts),d:0,mode:'move'});S.k++;S.next+=Math.max(0.3,0.95-0.085*S.next)}
      const ds=spd*dt;
      for(const r of S.reqs){
        if(r.mode==='move'){const tgt=S.cur?r.len-(S.q.length+1)*L.gap:r.len;r.d=Math.min(r.d+ds,tgt);
          if(r.d>=tgt-0.01){if(!S.cur){S.cur=r;r.mode='svc';S.left=0.62}else{S.q.push(r);r.mode='q'}}}
        else if(r.mode==='q'){const tgt=r.len-(S.q.indexOf(r)+1)*L.gap;r.d=Math.min(r.d+ds,tgt)}
        else if(r.mode==='svc'){r.d=Math.min(r.d+ds,r.len)}
      }
      if(S.cur){S.left-=dt;if(S.left<=0&&S.cur.d>=S.cur.len-0.01){const r=S.cur;r.mode='gone';const pts=rev(r.pts);S.blks.push({id:'b'+r.id,pts,len:plen(pts),d:0,a:1});
        S.cur=S.q.shift()||null;if(S.cur){S.cur.mode='svc';S.left=0.62}}}
      for(const b of S.blks){if(b.d<b.len)b.d=Math.min(b.len,b.d+ds);else b.a-=dt/0.3}
      S.blks=S.blks.filter(b=>b.a>0);S.reqs=S.reqs.filter(r=>r.mode!=='gone');
      const fa=tc>10.5?(C1-tc)/0.5:tc<0.3?tc/0.3:1;
      for(const r of S.reqs)put(r.id,atD(r.pts,r.d),{k:'req',cls:r.mode==='svc'?'wait':'',a:fa});
      for(const b of S.blks)put(b.id,atD(b.pts,b.d),{a:Math.max(0,b.a)*fa});
      if(S.q.length>=2)S.seen=true;
      E.qlab.style.opacity=S.seen?fa:0;setCls(E.srv,S.q.length>=3?'blk busy':'blk')}},
  /* 2：认角色 */
  1:{still:4,frame(t){for(let j=0;j<4;j++){const a=fade(t,0.5+0.45*j,0.8+0.45*j);if(a>0)put('A'+j,pieceA(j),{lab:'A'+(j+1),a});E.cells[j].classList.toggle('on',a>0.5)}}},
  /* 3：先问元数据服务器 */
  2:{still:4.2,frame(t){const tc=t%6.2,go=L.r.mds(0),d=dur(go),back=cat(rev(go),[L.r.hold(0)]);
      showA(1);
      run('req',go,0.3,d,tc,{k:'req'});
      const t1=0.3+d,on=tc>=t1&&tc<t1+0.6;setCls(E.mds,on?'blk on':'blk');E.cells.forEach(c=>c.classList.toggle('on',on));
      const p=run('lay',back,t1+0.6,dur(back),tc,{k:'lay'});
      if(p===2)put('lay',L.r.hold(0),{k:'lay',a:1-fade(tc,5.7,6.1)});
      setCls(E.cl[0],p===2&&tc<5.7?'blk ok':'blk')}},
  /* 4：几台数据服务器一起送，元数据服务器不参与 */
  3:{still:2.6,frame(t){const tc=t%6.6;showA(1);put('lay',L.r.hold(0),{k:'lay'});
      let got=0;
      for(let j=0;j<4;j++){const go=L.r.oss(0,j),d=dur(go),t0=0.2+0.12*j;
        run('q'+j,go,t0,d,tc,{k:'req'});
        const ta=t0+d;setCls(E.oss[j],tc>=ta&&tc<ta+0.35?'blk on':'blk');
        const back=cat([pieceA(j)],rev(go),[L.r.hold(0)]),db=dur(back);
        const p=run('c'+j,back,ta+0.3,db,tc,{lab:'A'+(j+1)});
        if(p===2){got++;if(tc<ta+0.3+db+0.35)put('c'+j,L.r.hold(0),{lab:'A'+(j+1),a:1-fade(tc,ta+0.3+db,ta+0.3+db+0.35)})}}
      setCls(E.cl[0],got===4&&tc<6.2?'blk ok':'blk')}},
  /* 5：一台对四台，同时跑 */
  4:{still:6.5,frame(t){const R=L.race,C5=9,tc=t%C5,Ts=0.5,speed=L.m?300:330;
      const fa=tc>8.6?(C5-tc)/0.4:tc<0.4?tc/0.4:1;
      const lanes=[[R.top.src],R.bot.src],dsts=[R.top.dst,R.bot.dst];let cnt=[0,0];
      lanes.forEach((srcs,k)=>srcs.forEach((s,j)=>{const y=C(s).y,pts=[P(s.x+s.w-L.pw/2,y),P(dsts[k].x+L.pw/2,y)],d=plen(pts)/speed;
        for(let n=0;n*Ts<7.6;n++){const t0=n*Ts+j*0.11;if(t0>tc)break;const u=(tc-t0)/d;
          if(u<=1)put(`${k}-${j}-${n}`,atU(pts,u),{a:fa});else if(u<=1+0.3/d)put(`${k}-${j}-${n}`,pts[1],{a:fa*(1-(u-1)*d/0.3)});
          if(u>=1)cnt[k]++}}));
      E.cnt.forEach((e,k)=>{setTxt(e,String(cnt[k]));e.style.opacity=fa})}},
  /* 6：加一台数据服务器 */
  5:{still:3.5,enter(){E.g5.style.opacity=0},
    frame(t,dt,tt){const n=tog?5:4;showA(1);
      E.g5.style.opacity=tog?fade(tt,0,0.4):0;
      setTxt(E.note6,tog?'文件 A 原地不动，新文件 B 用上了第 5 台':'文件 A 写在 4 台上；新文件 B 也分到 4 台');
      const tc=tt%6.4;
      for(let j=0;j<n;j++){const go=cat([L.r.hold(0)],L.r.oss(0,j),[pieceB(j)]),d=dur(go),t0=0.4+0.18*j;
        const p=run('B'+j,go,t0,d,tc,{lab:'B'+(j+1),cls:'b'});
        if(p===2)put('B'+j,pieceB(j),{lab:'B'+(j+1),cls:'b',a:1-fade(tc,5.8,6.3)})}}},
  /* 7：EXAScaler = Lustre + 功能 + 硬件 */
  6:{still:5,frame(t){E.add.forEach((g,k)=>g.style.opacity=fade(t,0.3+k*0.3,0.6+k*0.3))}}
  };
}
function reset(){if(!E.mds)return;setCls(E.mds,'blk');setCls(E.srv,'blk');E.cl.forEach(b=>setCls(b,'blk'));E.oss.forEach(b=>setCls(b,'blk'));E.cells.forEach(c=>c.classList.remove('on'));E.g5.style.opacity=0}


/* ---------- 引擎 ---------- */
function applyVis(){
  svg.setAttribute('data-step',step+1);
  svg.querySelectorAll('[data-show]').forEach(g=>g.classList.toggle('hid',!g.dataset.show.split(' ').includes(String(step+1))));
  svg.querySelectorAll('[data-dim]').forEach(g=>g.classList.toggle('dim',g.dataset.dim.split(' ').includes(String(step+1))));
  const tg=TG[step];tgl.hidden=!tg;if(tg){const s=T(tg[tog?1:0]);tgl.textContent=s;tgl.setAttribute('aria-label',s.replace(/^[⇄＋−] ?/,''))}
  if(L.btn){tgl.style.left=(L.btn.x/L.W*100)+'%';tgl.style.top=(L.btn.y/L.H*100)+'%'}
}
let raf=0,last=0,paused=!!opts.paused,dead=false;
function frame(dt){T0+=dt;TT+=dt;const m=MODES[step];m.frame&&m.frame(T0,dt,TT);sweep()}
function loop(now){const dt=Math.max(0,Math.min(0.05,(now-last)/1000||0));last=now;frame(dt);raf=requestAnimationFrame(loop)}
function go(){cancelAnimationFrame(raf);if(paused||dead||reduce)return;last=performance.now();raf=requestAnimationFrame(loop)}
function enter(i){
  step=i;cancelAnimationFrame(raf);clearPool();T0=0;TT=0;tog=false;
  applyVis();reset();(E.fits||[]).forEach(a=>fit(a[0],a[1]));
  const m=MODES[i];m.enter&&m.enter();
  if(reduce){const lim=m.still==null?3:m.still;for(let t=0;t<lim;t+=1/30)frame(1/30);return}
  frame(0);go();
}
tgl.addEventListener('click',()=>{tog=!tog;TT=0;const m=MODES[step];m.toggle&&m.toggle(tog);applyVis();if(reduce){const lim=m.still==null?3:m.still;clearPool();for(let t=0;t<lim;t+=1/30)frame(1/30)}});
function label(){svg.setAttribute('aria-label',T(ARIA))}
function setup(){L=layout(mq.matches);svg.innerHTML='';E={};POOL.clear();SEEN=new Set();svg.setAttribute('viewBox',`0 0 ${L.W} ${L.H}`);build();E.pk=el('g',{});MODES=modes();label();if(opts.onLayout)opts.onLayout(L.W/L.H,L.m)}
function rebuild(){setup();enter(step)}
mq.addEventListener('change',rebuild);
const onLang=()=>rebuild();document.addEventListener('ss-lang',onLang);
setup();
const ctrl={
  show(i){enter(Math.max(0,Math.min(7-1,i)))},
  pause(){paused=true;cancelAnimationFrame(raf)},
  resume(){if(!paused)return;paused=false;go()},
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('d-exa')},
  ratio(){return L.W/L.H},
  step(){return step},
  sim(){return {step,t:T0,tog,n:POOL.size}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['d-exa']={steps:7,mount:mount};
})();
