/* NVMe-oF：远端的盘当本地用：动画模块（由 anim.html 改写，画面、配色、动效不变）。
   接口与 assets/anim/rdma.js 相同：
     var a = SSAnim['nvmeof'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) / a.pause() / a.resume() / a.destroy() / a.ratio() / a.step()
   动画自己不带翻页控件，页面翻到哪一步就调 show(i)。宽度 640px 以下换成上下排布；
   系统开了「减少动态效果」时每步只画一帧静态结果。文字有中英两套（EN 表 + T()），跟着 ss-lang 事件重画。
   样式在 assets/anim/nvmeof.css，类名都在 .an-nvmeof 之内。 */
(function(){
var EN={"CPU 核心":"CPU Core","内存控制器":"Memory Controller","PCIe 根复合体":"PCIe Root Complex","已注册":"Registered","I/O 缓冲区":"I/O buffer","目标控制器":"Controller","命名空间":"Namespace","后端 I/O":"Back-end I/O","软件栈示例 · 占用很高":"Example stack: high load","软件栈示例 · 占用升高":"Example stack: rising load","软件栈示例 · 占用较低":"Example stack: low load","远端命名空间":"Remote namespace","服务器 A": "Server A", "服务器 B": "Server B", "内存": "Memory", "NVMe 盘": "NVMe SSD", "网卡": "NIC", "远端盘": "Remote", "在 B 看来：本地盘": "To B: a local drive", "看起来像本地盘": "Looks local", "交换机": "Switch", "普通以太网": "Ethernet", "存储箱": "Storage box", "转发": "Forward", "盘 1": "SSD 1", "盘 2": "SSD 2", "盘 3": "SSD 3", "盘 4": "SSD 4", "只转发": "Forwards only", "文件系统、数据保护在服务器上": "Servers run file system, protection", "文件系统、数据保护": "Servers run the", "在服务器上": "file system, protection", "示意，不代表实测数字": "Schematic, not measured", "CPU：发命令": "CPU: sends a command", "数据进了内存": "Data is in memory", "CPU：替 B 转交": "CPU: relaying for B", "CPU：请 A 帮忙": "CPU: asks A", "收到": "Received", "CPU：发 NVMe 命令": "CPU: sends an NVMe command", "CPU：不参与": "CPU: not involved", "CPU：只发起": "CPU: starts it only", "CPU：不搬数据": "CPU: moves no data", "服务器 A 停机": "Server A is down", "写入": "Writing", "照样读到": "Still readable", "CPU：复制数据 · 占用较低": "CPU: copying · light load", "CPU：复制数据 · 占用升高": "CPU: copying · getting busy", "CPU：复制数据 · 占用很高": "CPU: copying · very busy", "⇄ 换成 TCP": "⇄ To TCP", "⇄ 换成 RDMA": "⇄ To RDMA", "切换传输方式，当前 RDMA": "Switch transport, now RDMA", "切换传输方式，当前 TCP": "Switch transport, now TCP"};
var ARIA=["服务器、交换机和存储箱：NVMe 命令怎样经网络直达远端的盘", "Servers, a switch and a storage box: how NVMe commands reach remote drives over the network"];
function lang(){return window.SS_LANG==='en'?'en':'zh'}
function T(s){return lang()==='en'&&typeof s==='string'&&EN[s]!==undefined?EN[s]:s}
function F(zh,en){return lang()==='en'?en:zh}
function mount(host,opts){
opts=opts||{};
/* ---------- 通用小引擎：SVG 构建、沿线移动、排队仿真、负载条平滑 ---------- */
const NS='http://www.w3.org/2000/svg';
host.classList.add('an-nvmeof');host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','an-nvmeof-scene');svg.setAttribute('role','img');host.appendChild(svg);
const btn=document.createElement('button');btn.className='netbtn';btn.type='button';btn.hidden=true;host.appendChild(btn);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mq=matchMedia('(max-width: 640px)');
const qs=new URLSearchParams(location.search);
let L,E={},S,step=0;

function el(tag,a,p){const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);(p||svg).appendChild(e);return e}
function tx(x,y,s,size,cls,anchor,p){const t=el('text',{x,y,'font-size':size,class:cls||''},p);if(anchor)t.setAttribute('text-anchor',anchor);t.textContent=T(s);return t}
function grp(show,p,dim){const g=el('g',{class:'vis'},p);if(show)g.dataset.show=show;if(dim)g.dataset.dim=dim;return g}
function rect(r,cls,p,rx){return el('rect',{x:r.x,y:r.y,width:r.w,height:r.h,rx:rx==null?12:rx,class:cls},p)}
const C=r=>({x:r.x+r.w/2,y:r.y+r.h/2});
const P=(x,y,st)=>({x,y,st});
function line(a,b,cls,p){return el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'ln '+cls},p)}
function wire(pts,cls,p){const out=[];for(let i=1;i<pts.length;i++)out.push(line(pts[i-1],pts[i],cls,p));return out}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sm=u=>u<=0?0:u>=1?1:u*u*(3-2*u);
const fade=(t,t0,t1)=>clamp((t-t0)/(t1-t0),0,1);
function plen(pts){let s=0;for(let i=1;i<pts.length;i++)s+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);return s}
function along(o,pts,u){u=clamp(u,0,1);let d=u*plen(pts);
  for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],l=Math.hypot(b.x-a.x,b.y-a.y);
    if(d<=l||i===pts.length-1){const k=l?Math.min(1,d/l):0;o.x=a.x+(b.x-a.x)*k;o.y=a.y+(b.y-a.y)*k;return o}d-=l}return o}
const put=(o,q)=>{o.x=q.x;o.y=q.y};
/* 在 [t0,t1] 内沿 pts 平滑移动；之前停在起点，之后停在终点 */
function mv(o,pts,t,t0,t1){if(t<=t0)put(o,pts[0]);else if(t>=t1)put(o,pts[pts.length-1]);else along(o,pts,sm((t-t0)/(t1-t0)))}
const rev=pts=>pts.slice().reverse();
const cat=(...a)=>{const o=[];a.forEach(p=>p.forEach(q=>{const l=o[o.length-1];if(!l||l.x!==q.x||l.y!==q.y)o.push(q)}));return o};

/* 数据块与命令点 */
function pk(cls){const r=el('rect',{x:-L.pw/2,y:-L.ph/2,width:L.pw,height:L.ph,rx:4,class:'pkt '+(cls||'')},E.pk);
  const p={el:r,x:-99,y:-99,a:0,cp:false,base:'pkt '+(cls||'')};S.pk.push(p);return p}
function dot(){const r=el('circle',{r:L.dr||7,cx:0,cy:0,class:'cmddot'},E.pk);const p={el:r,x:-99,y:-99,a:0,dot:true};S.pk.push(p);return p}
function kill(p){p.el.remove();p.dead=true}

/* 负载条 */
function bar(x,y,w,h,p,cls){el('rect',{x,y,width:w,height:h,rx:Math.min(4,h/2),class:'track'},p);
  const f=el('rect',{x,y,width:0,height:h,rx:Math.min(4,h/2),class:'fill '+(cls||'')},p);return {f,w}}
function setBar(b,v,cls){b.f.setAttribute('width',(b.w*clamp(v,0,1)).toFixed(1));if(cls!=null)b.f.setAttribute('class','fill '+cls)}
function loadWord(v){return v>0.75?'占用很高':v>0.42?'占用升高':'占用较低'}

/* 排队仿真：数据块沿路线走，到站点由某个处理者一块一块处理 */
function station(id,route,svc,cap,next,q0){
  const i=route.findIndex(p=>p.st===id),p=route[i],q=route[i-1];const d=Math.hypot(p.x-q.x,p.y-q.y)||1;
  S.st[id]={id,p,dir:[(p.x-q.x)/d,(p.y-q.y)/d],svc,cap,cur:null,left:0,q:[],next,q0:q0||0};
}
function flow(route,speed,cls,hold){const p=pk(cls);p.pts=route;p.i=1;put(p,route[0]);p.mode='move';p.speed=speed;p.hold=hold||0.05;p.a=1;p.flow=true;return p}
const nextSt=p=>{for(let j=p.i;j<p.pts.length;j++)if(p.pts[j].st)return p.pts[j].st;return null};
function stLoad(id){const s=S.st[id];return S.pk.filter(p=>p.flow&&p.mode==='move'&&nextSt(p)===id).length+s.q.length+(s.cur?1:0)}
function canSpawn(route){const f=route.find(p=>p.st);return !f||stLoad(f.st)<S.st[f.st].cap}
function canRelease(s){return !s.next||stLoad(s.next)<S.st[s.next].cap}
function toward(p,x,y,d){const dx=x-p.x,dy=y-p.y,dist=Math.hypot(dx,dy);if(dist<=d){p.x=x;p.y=y;return true}p.x+=dx/dist*d;p.y+=dy/dist*d;return false}
function tickFlow(dt,arrive){
  for(const id in S.st){const s=S.st[id];
    if(s.cur){s.left-=dt;if(s.left<=0&&canRelease(s)){const p=s.cur;p.mode='move';p.i++;s.cur=null}}
    if(!s.cur&&s.q.length){const p=s.q.shift();s.cur=p;p.mode='svc';s.left=s.svc}}
  for(const p of S.pk){if(!p.flow||p.dead)continue;const d=p.speed*dt;
    if(p.mode==='move'){const tg=p.pts[p.i];
      if(!tg){p.mode='done';p.t0=S.t;arrive&&arrive(p);continue}
      if(tg.st){const s=S.st[tg.st];if(s.cur||s.q.length){const k=Math.min(s.q.length+1,L.qmax||99),sx=s.p.x-s.dir[0]*(s.q0+k*L.gap),sy=s.p.y-s.dir[1]*(s.q0+k*L.gap);
        if((p.x-sx)*s.dir[0]+(p.y-sy)*s.dir[1]>=-d){p.x=sx;p.y=sy;s.q.push(p);p.mode='q';p.sid=s.id;continue}}}
      if(toward(p,tg.x,tg.y,d)){if(tg.st){const s=S.st[tg.st];p.sid=s.id;if(!s.cur&&!s.q.length){s.cur=p;p.mode='svc';s.left=s.svc}else{s.q.push(p);p.mode='q'}}else p.i++}}
    else if(p.mode==='q'){const s=S.st[p.sid],k=Math.min(s.q.indexOf(p)+1,L.qmax||99);toward(p,s.p.x-s.dir[0]*(s.q0+k*L.gap),s.p.y-s.dir[1]*(s.q0+k*L.gap),d)}
    else if(p.mode==='svc'){const s=S.st[p.sid];toward(p,s.p.x,s.p.y,d);p.cp=true}
    else if(p.mode==='done'){p.cp=false;const age=S.t-p.t0-p.hold;p.a=age<0?1:Math.max(0,1-age/0.35);if(p.a<=0)kill(p)}
    if(p.mode==='move')p.cp=false}
}

/* ---------- 主循环 ---------- */
function newSim(){S={t:0,pk:[],st:{},lv:{},tg:{},tau:{up:0.25,dn:0.45},cnt:{},v:{}}}
function lv(k){return S.lv[k]||0}
function tick(dt){
  S.t+=dt;const M=SC.modes[step];
  M.pre&&M.pre(dt);
  if(S.pk.some(p=>p.flow))tickFlow(dt,M.arrive);
  M.post&&M.post(dt);
  for(const k in S.tg){const tg=S.tg[k],cur=S.lv[k]||0,tau=tg>cur?S.tau.up:S.tau.dn;S.lv[k]=cur+(tg-cur)*(1-Math.exp(-dt/tau))}
  S.pk=S.pk.filter(p=>!p.dead);
}
function render(){
  for(const p of S.pk){if(p.dot){p.el.setAttribute('cx',p.x.toFixed(1));p.el.setAttribute('cy',p.y.toFixed(1))}
    else{p.el.setAttribute('transform',`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);p.el.setAttribute('class',p.base+(p.cp?' cp':''))}
    p.el.style.opacity=p.a}
  const M=SC.modes[step];M.render&&M.render();
}
function applyVis(){
  svg.setAttribute('data-step',step+1);
  const vb=(SC.vb&&SC.vb(step))||[0,0,L.W,L.H];svg.setAttribute('viewBox',vb.join(' '));
  svg.querySelectorAll('[data-show]').forEach(g=>g.classList.toggle('hid',!g.dataset.show.split(' ').includes(String(step+1))));
  svg.querySelectorAll('[data-dim]').forEach(g=>g.classList.toggle('dim',g.dataset.dim.split(' ').includes(String(step+1))));
  const b=SC.btn&&SC.btn(step);btn.hidden=!b;
  if(b){btn.textContent=T(b.label);btn.setAttribute('aria-label',T(b.aria||b.label));btn.style.left=((b.x-vb[0])/vb[2]*100)+'%';btn.style.top=((b.y-vb[1])/vb[3]*100)+'%'}
}
btn.addEventListener('click',()=>{SC.onBtn&&SC.onBtn(step);applyVis()});
let raf=0,last=0,paused=!!opts.paused,dead=false;
function loop(now){const dt=Math.max(0,Math.min(0.05,(now-last)/1000||0));last=now;tick(dt);render();raf=requestAnimationFrame(loop)}
function run(){cancelAnimationFrame(raf);if(paused||dead||reduce)return;last=performance.now();raf=requestAnimationFrame(loop)}
function enter(i){
  step=i;cancelAnimationFrame(raf);
  if(S)S.pk.forEach(p=>p.el.remove());
  newSim();E.pk.style.opacity=1;
  SC.reset&&SC.reset();
  applyVis();
  SC.modes[i].enter&&SC.modes[i].enter();
  if(reduce){const lim=(SC.reduceAt||[])[i]||2;for(let t=0;t<lim;t+=1/60)tick(1/60);render();return}
  render();run();
}
function build(){L=SC.layout(mq.matches);if(L.mobile)for(const k in L.f)if(L.f[k]<18.3)L.f[k]=18.3;svg.innerHTML='';E={};svg.setAttribute('viewBox',`0 0 ${L.W} ${L.H}`);SC.build();if(!E.pk)E.pk=el('g',{});
  svg.setAttribute('aria-label',ARIA[lang()==='en'?1:0]);if(opts.onLayout)opts.onLayout(L.W/L.H,L.mobile)}
function rebuild(){build();enter(step)}


/* ---------- NVMe-oF：两台服务器 + 交换机 + 存储箱 ---------- */
let mode='rdma';
if(qs.get('tr')==='tcp')mode='tcp';
const SC={
layout(mobile){
  if(!mobile){
    const W=960,H=476;
    const mk=oy=>{const by=oy+52,bh=64;return {fr:{x:16,y:oy,w:440,h:200},title:{x:36,y:oy+30},st:{x:150,y:oy+30},cap:{x:440,y:oy+30},
      cpu:{x:36,y:by,w:100,h:bh},mem:{x:152,y:by,w:96,h:bh},disk:{x:264,y:by,w:96,h:bh},nic:{x:372,y:by,w:76,h:bh},root:{x:52,y:oy+142,w:384,h:45}}};
    const A=mk(16),B=mk(256);
    const sw={x:496,y:72,w:120,h:330},swc={x:516,y:236};
    const box={x:640,y:16,w:304,h:440},fwd={x:650,y:196,w:112,h:80};
    const drv=[76,166,256,346].map(y=>({x:800,y,w:124,h:64}));
    return {mobile,W,H,A,B,sw,swc,box,fwd,drv,pw:24,ph:18,gap:26,qmax:2,dr:7,f:{ttl:22,lbl:20,st:18,sm:17,note:16},
      boxTitle:{x:660,y:46},trunk:{x:780},
      net:{A:[{x:448,y:117},{x:496,y:117},{x:516,y:117},swc],B:[{x:448,y:357},{x:496,y:357},{x:516,y:357},swc]},
      swToFwd:[swc,{x:616,y:236},{x:650,y:236},{x:706,y:236}],
      fwdOut:[{x:706,y:236},{x:762,y:236},{x:780,y:236}],
      swLbl:{x:566,y:184},swType:{x:566,y:296},
      fwdNote:{x:707,y:298,a:'middle'},boxNote:[{x:792,y:436,a:'middle'}],
      btn:{x:556,y:438}};
  }
  const W=480,H=748;
  const mk=oy=>{const by=oy+46,bh=60;return {fr:{x:12,y:oy,w:428,h:196},title:{x:26,y:oy+26},st:{x:112,y:oy+26},cap:{x:428,y:oy+26},
    cpu:{x:24,y:by,w:96,h:bh},mem:{x:128,y:by,w:88,h:bh},disk:{x:224,y:by,w:88,h:bh},nic:{x:328,y:by,w:96,h:bh},root:{x:38,y:oy+129,w:382,h:49}}};
  const A=mk(12),B=mk(224);
  const sw={x:290,y:436,w:178,h:56},swc={x:378,y:464};
  const box={x:12,y:520,w:456,h:216},fwd={x:300,y:540,w:124,h:64};
  const drv=[28,136,244,352].map(x=>({x,y:656,w:96,h:60}));
  return {mobile,W,H,A,B,sw,swc,box,fwd,drv,pw:22,ph:16,gap:24,qmax:2,dr:6,f:{ttl:19,lbl:17,st:16,sm:16,note:16},
    boxTitle:{x:28,y:548},bus2:{y:632},
    net:{A:[{x:424,y:105},{x:458,y:105},{x:458,y:436},{x:458,y:464},swc],B:[{x:424,y:317},{x:458,y:317},{x:458,y:436},{x:458,y:464},swc]},
    swToFwd:[swc,{x:378,y:492},{x:378,y:540},{x:378,y:572}],
    fwdOut:[{x:378,y:572},{x:378,y:604},{x:378,y:632}],
    swLbl:{x:332,y:464},swType:{x:276,y:464,a:'end'},
    fwdNote:{x:288,y:566,a:'end'},boxNote:[{x:28,y:586,a:'start'},{x:28,y:608,a:'start'}],
    btn:{x:85,y:465}};
},
build(){
  const f=L.f;
  const hosts=grp(null);
  E.h={};
  ['A','B'].forEach(k=>{
    const h=L[k],g=grp(null,hosts,k==='B'?'1':null),o={};E.h[k]=o;o.g=g;
    rect(h.fr,'frame',g,22);
    tx(h.title.x,h.title.y,'服务器 '+k,f.ttl,'ttl','start',g);
    const at=b=>({x:b.x+b.w/2,y:b.y+b.h});
    const dg=grp(k==='A'?'1 2':'0',g);
    const pcie=grp(k==='A'?'1 2':'0',g);
    o.at={cpu:at(h.cpu),mem:at(h.mem),disk:at(h.disk),nic:at(h.nic)};
    o.stub={};
    for (const n of ['cpu','mem','disk','nic']) {
      o.stub[n]=line(o.at[n],{x:o.at[n].x,y:h.root.y},n==='cpu'?'cmdl':'wire',n==='disk'?dg:g);
    }
    tx(o.at.disk.x+9,h.root.y-9,'PCIe',f.note,'ink3-t','start',pcie);
    tx(o.at.nic.x+9,h.root.y-9,'PCIe',f.note,'ink3-t','start',g);
    rect(h.root,'blk',g,8);
    const split=o.at.mem.x+h.mem.w/2+8;
    line({x:split,y:h.root.y+16},{x:split,y:h.root.y+h.root.h},'wire',g);
    tx((h.root.x+split)/2,h.root.y+31,'内存控制器',f.note,'lbl','middle',g);
    tx((split+h.root.x+h.root.w)/2,h.root.y+31,'PCIe 根复合体',f.note,'lbl','middle',g);
    const lab=(b,s,parent)=>tx(b.x+b.w/2,b.y+(L.mobile?21:24),s,f.lbl,'lbl','middle',parent);
    o.cpu=rect(h.cpu,'blk',g);lab(h.cpu,'CPU 核心',g);
    o.bar=bar(h.cpu.x+12,h.cpu.y+h.cpu.h-(L.mobile?20:22),h.cpu.w-24,L.mobile?10:12,g);
    o.mem=rect(h.mem,'blk',g);
    o.memText=lab(h.mem,'内存',g);
    o.memFlag=tx(C(h.mem).x,h.mem.y+35,'',f.note,'ink2-t','middle',g);
    rect(h.disk,'blk',dg);lab(h.disk,'NVMe 盘',dg);
    o.nic=rect(h.nic,'blk',g);lab(h.nic,'网卡',g);
    o.in=n=>n==='cpu'?at(h.cpu):({x:o.at[n].x,y:h[n].y+h[n].h-(L.mobile?13:15)});
  });
  // B 的「远端盘」（第 3 步）
  {const h=L.B,g=grp('3',hosts);el('rect',{x:h.disk.x,y:h.disk.y,width:h.disk.w,height:h.disk.h,rx:12,class:'ghost sage'},g);
   tx(h.disk.x+h.disk.w/2,h.disk.y+h.disk.h/2,'命名空间',f.note,'sage-t','middle',g);
   tx(h.cap.x,h.cap.y,'远端命名空间',f.st,'sage-t st','end',g);}
  // 网络与交换机
  const net=grp(null,null,'1');
  E.netA=wire(L.net.A.slice(0,-1),'wire',net);E.netB=wire(L.net.B.slice(0,-1),'wire',net);
  const boxG=grp('3 4 5 6');
  E.swFwd=wire(L.swToFwd.slice(1,-1),'wire',boxG);
  E.sw=rect(L.sw,'sw',net);
  tx(L.swLbl.x,L.swLbl.y,'交换机',f.sm,'swt','middle',net);
  E.swType=tx(L.swType.x,L.swType.y,'',f.note,'ink3-t',L.swType.a||'middle',grp('4',net));
  // 存储箱
  rect(L.box,'frame',boxG,22);
  tx(L.boxTitle.x,L.boxTitle.y,'存储箱',f.ttl,'ttl','start',boxG);
  E.fwd=rect(L.fwd,'blk',boxG);
  const target=C(L.fwd);
  tx(target.x,L.fwd.y+15,'NVMe-oF',f.lbl,'lbl','middle',boxG);
  tx(target.x,L.fwd.y+37,'目标控制器',f.note,'lbl','middle',boxG);
  E.fbar=bar(L.fwd.x+14,L.fwd.y+L.fwd.h-16,L.fwd.w-28,7,boxG,'sage');
  tx(L.fwdNote.x,L.fwdNote.y,'命名空间',f.note,'sage-t st',L.fwdNote.a,boxG);
  tx(L.mobile?226:863,L.mobile?548:56,'后端 I/O',f.note,'ink3-t','middle',boxG);
  // 目标控制器终止 fabric 命令，并访问后端介质。
  E.dpt=[];
  if(!L.mobile){
    const tx0=L.trunk.x,ys=L.drv.map(d=>d.y+d.h/2);
    wire(L.fwdOut,'wire',boxG);line({x:tx0,y:ys[0]},{x:tx0,y:ys[3]},'wire',boxG);
    L.drv.forEach((d,i)=>{line({x:tx0,y:ys[i]},{x:d.x,y:ys[i]},'wire',boxG);
      E.dpt[i]=cat(L.fwdOut,[{x:tx0,y:ys[i]},{x:d.x,y:ys[i]},{x:d.x+d.w-30,y:ys[i]}])});
  }else{
    const by=L.bus2.y,xs=L.drv.map(d=>d.x+d.w/2);
    wire(L.fwdOut,'wire',boxG);line({x:xs[0],y:by},{x:xs[3],y:by},'wire',boxG);
    L.drv.forEach((d,i)=>{line({x:xs[i],y:by},{x:xs[i],y:d.y},'wire',boxG);
      E.dpt[i]=cat(L.fwdOut,[{x:xs[i],y:by},{x:xs[i],y:d.y},{x:xs[i],y:d.y+d.h-14}])});
  }
  L.drv.forEach((d,i)=>{rect(d,'blk',boxG);
    if(L.mobile)tx(d.x+d.w/2,d.y+20,'盘 '+(i+1),f.lbl,'lbl','middle',boxG);
    else tx(d.x+16,d.y+d.h/2,'盘 '+(i+1),f.lbl,'lbl','start',boxG)});
  // 注释
  const n5=grp('5');
  if(L.boxNote.length===1)tx(L.boxNote[0].x,L.boxNote[0].y,'文件系统、数据保护在服务器上',f.note,'ink3-t',L.boxNote[0].a,n5);
  else{tx(L.boxNote[0].x,L.boxNote[0].y,'文件系统、数据保护',f.note,'ink3-t','start',n5);tx(L.boxNote[1].x,L.boxNote[1].y,'在服务器上',f.note,'ink3-t','start',n5)}
  const n4=grp('4');
  if(L.boxNote.length===1)tx(L.boxNote[0].x,L.boxNote[0].y,'示意，不代表实测数字',f.note,'ink3-t',L.boxNote[0].a,n4);
  else tx(L.boxNote[0].x,L.boxNote[0].y,'示意，不代表实测数字',f.note,'ink3-t','start',n4);
  // 状态文字（不放进主机组，停机时也看得清）
  E.stA=tx(L.A.st.x,L.A.st.y,'',f.st,'st','start');E.stB=tx(L.B.st.x,L.B.st.y,'',f.st,'st','start');
  E.pk=el('g',{});
  // 路线
  const R={};E.R=R;
  ['A','B'].forEach(k=>{const o=E.h[k],h=L[k];
    const down=n=>[o.in(n),o.at[n],{x:o.at[n].x,y:h.root.y},{x:o.at[n].x,y:h.root.y+8}];
    const hostPath=(a,b)=>cat(down(a),rev(down(b)));
    const toSw=cat([o.in('nic')],L.net[k]);
    R[k]={hostPath,toSw,memToSw:cat(hostPath('mem','nic'),toSw)};
  });
  R.swToDrv=i=>cat(L.swToFwd,E.dpt[i]);
},
reset(){
  ['A','B'].forEach(k=>{const o=E.h[k];o.g.classList.remove('down');o.cpu.setAttribute('class','blk');
    for (const [n,l] of Object.entries(o.stub)) l.setAttribute('class',n==='cpu'?'ln cmdl':'ln wire');
    o.memText.textContent=T('内存');o.memText.setAttribute('y',L[k].mem.y+(L.mobile?21:24));
    o.memFlag.textContent='';});
  E.stA.textContent='';E.stB.textContent='';E.swType.textContent='';
  E.fwd.setAttribute('class','blk');setBar(E.fbar,0);
},
btn(i){return i===3?{label:mode==='rdma'?'⇄ 换成 TCP':'⇄ 换成 RDMA',aria:'切换传输方式，当前 '+(mode==='rdma'?'RDMA':'TCP'),x:L.btn.x,y:L.btn.y}:null},
onBtn(){mode=mode==='rdma'?'tcp':'rdma';E.sw.classList.remove('flip');void E.sw.getBBox();E.sw.classList.add('flip');enter(3)},
vb(i){if(i>1)return null;return L.mobile?[0,-122,L.W,L.H]:[-164,0,L.W,L.H]},
reduceAt:[1.9,4.4,3.6,6,2.6,7.8],
modes:[]
};
function setSt(k,s,cls){const t=k==='A'?E.stA:E.stB;t.textContent=T(s);t.setAttribute('class','st '+(cls||''))}
function cpuBox(k,c){E.h[k].cpu.setAttribute('class','blk'+(c?' '+c:''))}
function barSync(){setBar(E.h.A.bar,lv('A'));setBar(E.h.B.bar,lv('B'))}
const wi=(l,c)=>l.setAttribute('class','ln wire'+(c?' '+c:''));
/* 1：本机 CPU → 盘，盘 → 内存 */
SC.modes[0]={enter(){const o=E.h.A,R=E.R.A;S.v.cmd=dot();S.v.d=pk();S.v.c1=R.hostPath('cpu','disk');S.v.c2=R.hostPath('disk','mem')},
  pre(){const T=4.4,t=S.t%T,v=S.v;
    v.cmd.a=t>0.2&&t<1.15?1:0;mv(v.cmd,v.c1,t,0.25,1.1);
    v.d.a=fade(t,1.15,1.3)*(1-fade(t,3.7,4.1));mv(v.d,v.c2,t,1.3,2.5);
    const busy=t>0.2&&t<1.1;S.tg.A=busy?0.14:0;cpuBox('A',busy?'ask':'');setSt('A',busy?'CPU：发命令':t>2.5&&t<3.9?'数据进了内存':'',busy?'slate-t':'sage-t')},
  render:barSync};
/* 2：B 要数据，A 的 CPU 转交 */
SC.modes[1]={enter(){const RA=E.R.A,RB=E.R.B,v=S.v;
    v.req=dot();v.cmd=dot();v.o=pk();v.c=pk();
    v.p1=cat(RB.hostPath('cpu','nic'),RB.toSw,rev(RA.toSw),RA.hostPath('nic','cpu'));
    v.p2=RA.hostPath('cpu','disk');v.p3=RA.hostPath('disk','mem');v.p4=cat(RA.memToSw,rev(RB.memToSw))},
  pre(){const T=8.6,t=S.t%T,v=S.v;
    v.req.a=t>0.2&&t<2.1?1:0;mv(v.req,v.p1,t,0.25,2.05);
    v.cmd.a=t>2.2&&t<2.95?1:0;mv(v.cmd,v.p2,t,2.25,2.9);
    v.o.a=fade(t,2.95,3.1)*(1-fade(t,7.9,8.3));mv(v.o,v.p3,t,3.0,3.8);
    v.c.a=t<3.9?0:fade(t,3.9,4.0)*(1-fade(t,7.9,8.3));v.c.cp=t>=3.9&&t<5.0;
    if(t<3.9)put(v.c,v.p3[v.p3.length-1]);else mv(v.c,v.p4,t,3.9,7.0);
    const handling=(t>2.05&&t<2.95)||(t>=3.9&&t<5.0);
    S.tg.A=handling?0.18+0.02*Math.sin(S.t*9):0;cpuBox('A',handling?'on':'');
    setSt('A',handling?'CPU：替 B 转交':'',handling?'rose-t':'');
    const bwait=t>0.2&&t<0.9;S.tg.B=bwait?0.1:0;cpuBox('B',bwait?'ask':'');setSt('B',bwait?'CPU：请 A 帮忙':t>7&&t<8.2?'收到':'',bwait?'slate-t':'sage-t')},
  render:barSync};
/* 3：存储箱，B 直接发 NVMe 命令 */
SC.modes[2]={enter(){const RB=E.R.B,v=S.v;v.cmd=dot();v.d=pk();
    v.back=dot();v.back.el.classList.add('backend');
    v.p1=cat(RB.hostPath('cpu','nic'),RB.toSw,L.swToFwd);
    v.p2=cat(rev(E.R.swToDrv(1)),rev(RB.toSw),RB.hostPath('nic','mem'))},
  pre(){const T=6.4,t=S.t%T,v=S.v;
    v.cmd.a=t>0.2&&t<1.85?1:0;mv(v.cmd,v.p1,t,0.25,1.85);
    v.back.a=t>=1.9&&t<2.43?1:0;mv(v.back,E.dpt[1],t,1.9,2.43);
    v.d.a=fade(t,2.48,2.63)*(1-fade(t,5.6,6.0));mv(v.d,v.p2,t,2.48,4.75);
    const b=t>0.2&&t<0.9;S.tg.B=b?0.12:0;cpuBox('B',b?'ask':'');
    setSt('B',b?'CPU：发 NVMe 命令':'',b?'slate-t':'');setSt('A','CPU：不参与','sage-t');cpuBox('A','ok')},
  render:barSync};
/* 4：RDMA / TCP，持续的数据流，CPU 负载跟着数据量走 */
SC.modes[3]={enter(){const RB=E.R.B,v=S.v;v.cyc=-1;v.k=0;
    E.swType.textContent=T(mode==='rdma'?'IB / RoCE':'普通以太网');
    const o=E.h.B;
    const rdma=mode==='rdma';
    [o.stub.nic,o.stub.mem].forEach(l=>wi(l,rdma?'ok':'on'));
    o.memText.textContent=T('I/O 缓冲区');
    if(rdma){o.memText.setAttribute('y',L.B.mem.y+15);o.memFlag.textContent=T('已注册');}
    const memPath=RB.hostPath('nic','mem');
    if (!rdma) {
      const port=memPath.findLast(p=>p.x===o.at.nic.x);
      port.st='CPU';
    }
    v.route=i=>cat(rev(E.R.swToDrv(i)),rev(RB.toSw),memPath);
    v.cmdP=cat(RB.hostPath('cpu','nic'),RB.toSw,L.swToFwd);
    S.tau.up=0.7;S.tau.dn=0.9},
  pre(dt){const v=S.v,T=9,c=Math.floor(S.t/T),t=S.t-c*T;
    if(c!==v.cyc){S.pk.forEach(p=>kill(p));S.pk=[];S.st={};v.cyc=c;v.spawnT=1.0;v.t0=S.t;v.cmd=dot();
      if(mode==='tcp')station('CPU',v.route(0),0.24,8,null)}
    mv(v.cmd,v.cmdP,t,0.1,1.0);v.cmd.a=t<1.0?1:0;
    if(t<7.6){v.spawnT-=dt;if(v.spawnT<=0){const iv=Math.max(0.36,1.1-0.13*(t-1));v.spawnT+=iv;
      const r=v.route(v.k++%4);if(mode==='rdma'||canSpawn(r))flow(r,330,'',0.05)}}
    const rate=t<1?0:clamp((1.1-Math.max(0.36,1.1-0.13*(t-1)))/0.74,0,1);
    if(mode==='rdma'){S.tg.B=t<0.7?0.12:0.03;S.v.word=t<0.7?'CPU：只发起':'CPU：不搬数据'}
    else{const busy=S.st.CPU&&(S.st.CPU.cur||S.st.CPU.q.length);S.tg.B=t<0.7?0.12:busy?0.22+0.72*rate:0.12+0.6*rate;S.v.word=null}
    v.f=t>8.6?Math.max(0,(9-t)/0.4):t<0.3?t/0.3:1},
  render(){const v=S.v;E.pk.style.opacity=v.f==null?1:v.f;barSync();
    if(mode==='rdma'){cpuBox('B',lv('B')>0.06?'ask':'ok');setSt('B',v.word,v.word==='CPU：只发起'?'slate-t':'sage-t')}
    else{const x=lv('B'),busy=S.st.CPU&&S.st.CPU.cur;cpuBox('B',x>0.42||busy?'on':'');setSt('B','软件栈示例 · '+loadWord(x),x>0.42?'rose-t':'ink3-t')}}};
/* 5：目标控制器提供命名空间 */
SC.modes[4]={enter(){S.v.next=0.2;S.v.k=0;S.v.j=[]},
  pre(dt){const v=S.v;v.next-=dt;
    if(v.next<=0){v.next+=0.9;const k=v.k%2?'A':'B',i=(v.k*3+1)%4,R=E.R[k];v.k++;
      const cmd=dot(),back=dot(),d=pk();
      back.el.classList.add('backend');
      v.j.push({t0:S.t,cmd,back,d,i,p1:cat(R.hostPath('cpu','nic'),R.toSw,L.swToFwd),
        p2:cat(rev(E.R.swToDrv(i)),rev(R.toSw),R.hostPath('nic','mem'))})}
    v.j=v.j.filter(j=>{const t=S.t-j.t0;j.cmd.a=t<1.17?1:0;mv(j.cmd,j.p1,t,0,1.17);
      j.back.a=t>=1.2&&t<1.55?1:0;mv(j.back,E.dpt[j.i],t,1.2,1.55);
      j.d.a=t<1.6?0:1-fade(t,3.6,3.9);mv(j.d,j.p2,t,1.6,3.5);
      if(t>3.95){kill(j.cmd);kill(j.back);kill(j.d);return false}return true});
    const inFwd=S.pk.some(p=>p.a>0.5&&Math.abs(p.x-(L.fwd.x+L.fwd.w/2))<L.fwd.w/2&&Math.abs(p.y-(L.fwd.y+L.fwd.h/2))<L.fwd.h/2);
    S.tg.F=inFwd?0.12:0.05},
  render(){setBar(E.fbar,lv('F'));E.fwd.setAttribute('class','blk ok');barSync()}};
/* 6：A 停机，B 照样读 A 写的数据 */
SC.modes[5]={enter(){const RA=E.R.A,RB=E.R.B,v=S.v;v.w=pk();v.cmd=dot();v.c=pk();
    v.p1=cat(RA.memToSw,E.R.swToDrv(1));v.p2=cat(RB.hostPath('cpu','nic'),RB.toSw,E.R.swToDrv(1));v.p3=cat(rev(E.R.swToDrv(1)),rev(RB.toSw),RB.hostPath('nic','mem'))},
  pre(){const T=9.4,t=S.t%T,v=S.v,f=t>8.9?Math.max(0,(9.4-t)/0.4):t<0.3?t/0.3:1;
    v.w.a=f;mv(v.w,v.p1,t,0.4,2.4);
    const down=t>2.9;E.h.A.g.classList.toggle('down',down);
    setSt('A',down?'服务器 A 停机':t<2.4&&t>0.3?'写入':'',down?'rose-t':'slate-t');
    v.cmd.a=t>3.6&&t<5.15?1:0;mv(v.cmd,v.p2,t,3.6,5.1);
    v.c.a=t<5.2?0:f;mv(v.c,v.p3,t,5.2,7.3);
    const b=t>3.6&&t<4.2;S.tg.B=b?0.12:0;cpuBox('B',b?'ask':'');setSt('B',t>7.3&&t<8.9?'照样读到':b?'CPU：发 NVMe 命令':'',t>7.3?'sage-t':'slate-t')},
  render:barSync};

mq.addEventListener('change',rebuild);
const onLang=()=>rebuild();document.addEventListener('ss-lang',onLang);
build();newSim();
const N=SC.modes.length;
const ctrl={
  show(i){enter(Math.max(0,Math.min(N-1,i)))},
  pause(){paused=true;cancelAnimationFrame(raf)},
  resume(){if(!paused)return;paused=false;run()},
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('an-nvmeof')},
  ratio(){return L.W/L.H},
  step(){return step},
  sim(){return {step,t:S.t,lv:S.lv,cnt:S.cnt,n:S.pk.length,q:Object.fromEntries(Object.entries(S.st).map(([k,s])=>[k,s.q.length+(s.cur?1:0)]))}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['nvmeof']={steps:6,mount:mount};
})();
