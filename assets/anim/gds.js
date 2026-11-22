/* GPUDirect Storage：GPU 直接读存储：动画模块（由 anim.html 改写，画面、配色、动效不变）。
   接口与 assets/anim/rdma.js 相同：
     var a = SSAnim['gds'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) / a.pause() / a.resume() / a.destroy() / a.ratio() / a.step()
   动画自己不带翻页控件，页面翻到哪一步就调 show(i)。宽度 640px 以下换成上下排布；
   系统开了「减少动态效果」时每步只画一帧静态结果。文字有中英两套（EN 表 + T()），跟着 ss-lang 事件重画。
   样式在 assets/anim/gds.css，类名都在 .an-gds 之内。 */
(function(){
var EN={"服务器": "Server", "主机内存": "Host memory", "中转区": "Staging", "PCIe 交换": "PCIe switch", "NVMe 盘": "NVMe SSD", "GPU 显存": "GPU memory", "网卡": "NIC", "远端存储": "Remote storage", "这段走两趟": "This link is used twice", "不经过": "Skipped", "经主机内存中转": "Via host memory", "盘": "Drive", "已送达": "Delivered", "负责复制": "copies data", "不参与复制": "not copying", "主机内存 · ": "Host memory · ", "CPU 拷贝": "CPU copy", "不经过主机内存": "Skips host memory", "示意，不代表实测数字": "Schematic, not measured", "CPU：拷贝数据": "CPU: copying data", "先进主机内存": "Lands in host memory first", "第二次才到 GPU": "Reaches the GPU on the second copy", "CPU：只发起": "CPU: starts it only", "CPU：拷贝 · 占用较低": "CPU: copying · light load", "CPU：拷贝 · 占用升高": "CPU: copying · getting busy", "CPU：拷贝 · 占用很高": "CPU: copying · very busy", "⇄ 换成本地 NVMe": "⇄ To local NVMe", "⇄ 换成远端存储": "⇄ To remote storage", "切换数据来源，当前 远端存储": "Switch data source, now remote storage", "切换数据来源，当前 本地 NVMe": "Switch data source, now local NVMe"};
var ARIA=["一台服务器里的数据路径：经主机内存中转与 GPUDirect Storage 直通", "Inside a server: the bounce-buffer path and the GPUDirect Storage path from storage to GPU memory"];
function lang(){return window.SS_LANG==='en'?'en':'zh'}
function T(s){return lang()==='en'&&typeof s==='string'&&EN[s]!==undefined?EN[s]:s}
function F(zh,en){return lang()==='en'?en:zh}
function mount(host,opts){
opts=opts||{};
/* ---------- 通用小引擎：SVG 构建、沿线移动、排队仿真、负载条平滑 ---------- */
const NS='http://www.w3.org/2000/svg';
host.classList.add('an-gds');host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','an-gds-scene');svg.setAttribute('role','img');host.appendChild(svg);
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
function build(){L=SC.layout(mq.matches);if(L.mobile)for(const k in L.f)if(L.f[k]<16.5)L.f[k]=16.5;/* 400 宽下最小字不低于 12px */svg.innerHTML='';E={};svg.setAttribute('viewBox',`0 0 ${L.W} ${L.H}`);SC.build();if(!E.pk)E.pk=el('g',{});
  svg.setAttribute('aria-label',ARIA[lang()==='en'?1:0]);if(opts.onLayout)opts.onLayout(L.W/L.H,L.mobile)}
function rebuild(){build();enter(step)}


/* ---------- GPUDirect Storage：一台服务器（CPU、主机内存、PCIe 交换、NVMe、GPU、网卡）+ 远端存储 ---------- */
let srcMode=qs.get('src')==='local'?'local':'remote';
const SC={
layout(mobile){
  if(!mobile){
    const W=960,H=476;
    return {mobile,W,H,pw:24,ph:18,gap:26,dr:7,qmax:4,f:{ttl:22,lbl:20,st:18,sm:17,note:16,big:34,lane:22},
      fr:{x:16,y:16,w:704,h:444},title:{x:36,y:46},cst:{x:132,y:46},
      cpu:{x:48,y:76,w:150,h:96},mem:{x:300,y:76,w:250,h:96},bnc:{x:440,y:92,w:96,h:64},
      py:132,ux:123,sw:{x:48,y:220,w:200,h:76},nv:{x:48,y:364,w:150,h:64},
      gx:470,gpu:{x:300,y:340,w:220,h:100},nic:{x:600,y:222,w:100,h:72},rem:{x:776,y:198,w:168,h:120},
      two:{x:140,y:200,a:'start'},memSt:{x:425,y:192},nicSt:{x:650,y:308},
      race:{lanes:[150,350],sep:250,lab:{x:32,dy:-56},src:{x:60,w:64,h:48},dst:{x:700,w:76,h:48},st:{x:390,w:80,h:48},
        stLbl:{dy:-40},cnt:{x:880,ly:-16,ny:22},cpu:{lx:60,dy:56,tx:130,tw:300,sx:450},note:{x:32,y:458}},
      btn:{x:860,y:362}};
  }
  const W=480,H=506;
  return {mobile,W,H,pw:22,ph:16,gap:24,dr:6,qmax:3,f:{ttl:19,lbl:17,st:16,sm:16,note:16,big:26,lane:19},
    fr:{x:12,y:12,w:456,h:390},title:{x:26,y:36},cst:{x:96,y:36},
    cpu:{x:28,y:56,w:130,h:84},mem:{x:190,y:56,w:262,h:84},bnc:{x:350,y:66,w:94,h:62},
    py:104,ux:93,sw:{x:28,y:190,w:150,h:68},nv:{x:28,y:316,w:130,h:60},
    gx:304,gpu:{x:186,y:300,w:150,h:84},nic:{x:360,y:192,w:96,h:64},rem:{x:290,y:424,w:184,h:70},
    two:{x:104,y:168,a:'start'},memSt:{x:321,y:158},nicSt:{x:398,y:300,a:'end'},
    race:{lanes:[150,372],sep:262,lab:{x:16,dy:-84},src:{x:16,w:48,h:40},dst:{x:398,w:60,h:40},st:{x:206,w:64,h:40},
      stLbl:{dy:-38,two:true},cnt:{x:428,ly:44,ny:74},cpu:{lx:16,dy:60,tx:60,tw:240,sx:60,sdy:90},note:{x:16,y:494}},
    btn:{x:170,y:458}};
},
build(){
  const f=L.f,g=grp('1 2 3 5'),Y=L.py,ux=L.ux;E.w={};
  rect(L.fr,'frame',g,22);tx(L.title.x,L.title.y,'服务器',f.ttl,'ttl','start',g);
  const sc=C(L.sw),nc=C(L.nv),ic=C(L.nic),rc=C(L.rem);
  const remG=grp(null,null,'1 2 3');remG.dataset.show='1 2 3 5';
  // 连线
  E.w.cm=line({x:L.cpu.x+L.cpu.w,y:Y},{x:L.mem.x,y:Y},'wire',g);
  E.w.up=line({x:ux,y:L.cpu.y+L.cpu.h},{x:ux,y:L.sw.y},'wire',g);
  E.w.sn=line({x:ux,y:L.sw.y+L.sw.h},{x:ux,y:L.nv.y},'wire',g);
  E.w.t1=line({x:L.sw.x+L.sw.w,y:sc.y},{x:L.gx,y:sc.y},'wire',g);
  E.w.tg=line({x:L.gx,y:sc.y},{x:L.gx,y:L.gpu.y},'wire',g);
  E.w.t2=line({x:L.gx,y:sc.y},{x:L.nic.x,y:sc.y},'wire',remG);
  if(!L.mobile)E.w.nr=line({x:L.nic.x+L.nic.w,y:ic.y},{x:L.rem.x,y:ic.y},'wire',remG);
  else E.w.nr=line({x:ic.x,y:L.nic.y+L.nic.h},{x:ic.x,y:L.rem.y},'wire',remG);
  // 部件
  E.cpu=rect(L.cpu,'blk',g);tx(L.cpu.x+14,L.cpu.y+(L.mobile?20:24),'CPU',f.lbl,'cpul','start',g);
  E.bar=bar(L.cpu.x+14,L.cpu.y+L.cpu.h-(L.mobile?18:22),L.cpu.w-28,L.mobile?10:12,g);
  const mg=grp(null,g,'3 5');E.memG=mg;
  rect(L.mem,'blk',mg);tx(L.mem.x+14,L.mem.y+(L.mobile?20:24),'主机内存',f.lbl,'lbl','start',mg);
  el('rect',{x:L.bnc.x,y:L.bnc.y,width:L.bnc.w,height:L.bnc.h,rx:8,class:'ghost'},mg);
  tx(L.bnc.x+L.bnc.w/2,L.bnc.y+(L.mobile?13:15),'中转区',f.note,'ink3-t','middle',mg);
  E.sw=rect(L.sw,'blk',g);tx(ux+(L.mobile?12:14),L.sw.y+(L.mobile?15:16),'PCIe 交换',f.sm,'lbl','start',g);
  rect(L.nv,'blk',g);tx(nc.x,L.nv.y+(L.mobile?18:22),'NVMe 盘',f.lbl,'lbl','middle',g);
  E.gpu=rect(L.gpu,'blk',g);tx(L.gpu.x+14,L.gpu.y+(L.mobile?22:28),'GPU 显存',f.lbl,'lbl','start',g);
  E.nic=rect(L.nic,'blk',remG);tx(ic.x,L.nic.y+16,'网卡',f.lbl,'lbl','middle',remG);
  rect(L.rem,'blk',remG);if(L.mobile)tx(L.rem.x+12,L.rem.y+22,'远端存储',f.lbl,'lbl','start',remG);else tx(rc.x,L.rem.y+30,'远端存储',f.lbl,'lbl','middle',remG);
  E.two=tx(L.two.x,L.two.y,'这段走两趟',f.st,'st rose-t',L.two.a,grp('2'));
  tx(L.memSt.x,L.memSt.y,'不经过',f.st,'st ink3-t','middle',grp('3 5'));
  E.nicSt=tx(L.nicSt.x,L.nicSt.y,'RDMA',f.st,'st sage-t',L.nicSt.a||'middle',grp('5'));
  E.cst=tx(L.cst.x,L.cst.y,'',f.st,'st','start',g);
  /* 第 4 步：两条线 */
  const R=L.race,race=grp('4');E.race={};
  [['T','经主机内存中转','tcp'],['G','GPUDirect Storage','rdma']].forEach(([k,name,cls],j)=>{
    const y=R.lanes[j],o={};E.race[k]=o;
    tx(R.lab.x,y+R.lab.dy,name,f.lane,'lbl','start',race).style.fontWeight=700;
    line({x:R.src.x+R.src.w,y},{x:R.dst.x,y},'ln '+cls,race);
    rect({x:R.src.x,y:y-R.src.h/2,w:R.src.w,h:R.src.h},'ep',race,10);tx(R.src.x+R.src.w/2,y,'盘',f.lbl,'lbl','middle',race);
    rect({x:R.dst.x,y:y-R.dst.h/2,w:R.dst.w,h:R.dst.h},'ep',race,10);tx(R.dst.x+R.dst.w/2,y,'GPU',f.sm,'lbl','middle',race);
    tx(R.cnt.x,y+R.cnt.ly,'已送达',f.note,'ink3-t','middle',race);
    o.n=tx(R.cnt.x,y+R.cnt.ny,'0',f.big,'num '+(j?'sage-t':'rose-t'),'middle',race);
    const cp=R.cpu;tx(cp.lx,y+cp.dy,'CPU',f.sm,'ink3-t','start',race);
    o.bar=bar(cp.tx,y+cp.dy-(L.mobile?6:7),cp.tw,L.mobile?12:14,race,j?'sage':'');
    o.st=tx(cp.sx,y+(cp.sdy||cp.dy),j?'不参与复制':'负责复制',f.sm,'st '+(j?'sage-t':'rose-t'),'start',race);
    o.route=j?[P(R.src.x+R.src.w+L.pw/2-2,y),P(R.dst.x+4,y)]:[P(R.src.x+R.src.w+L.pw/2-2,y),P(R.st.x,y,'B'),P(R.dst.x+4,y)];
  });
  {const y=R.lanes[0];E.race.stn=rect({x:R.st.x-R.st.w/2,y:y-R.st.h/2,w:R.st.w,h:R.st.h},'stn',race,10);
   if(R.stLbl.two){tx(R.st.x,y+R.stLbl.dy-18,'主机内存',f.sm,'ink2-t','middle',race);tx(R.st.x,y+R.stLbl.dy+2,'CPU 拷贝',f.note,'rose-t','middle',race)}
   else{const t=tx(R.st.x,y+R.stLbl.dy,'主机内存 · ',f.sm,'ink2-t','middle',race);const sp=el('tspan',{class:'rose-t'},t);sp.textContent=T('CPU 拷贝')}
   const y2=R.lanes[1];tx((R.src.x+R.src.w+R.dst.x)/2,y2+R.stLbl.dy+(R.stLbl.two?2:0),'不经过主机内存',f.sm,'ink3-t','middle',race);}
  line({x:L.mobile?16:32,y:R.sep},{x:L.W-(L.mobile?16:32),y:R.sep},'sep',race);
  tx(R.note.x,R.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',race);
  E.pk=el('g',{});
  // 路线
  const cpuP={x:ux,y:Y},bn={x:L.bnc.x+L.bnc.w/2,y:Y},gIn={x:L.gx,y:L.gpu.y+L.gpu.h-(L.mobile?20:24)};
  const nIn={x:ux,y:L.nv.y+L.nv.h-(L.mobile?16:18)},rIn={x:L.mobile?ic.x:rc.x,y:L.rem.y+L.rem.h-(L.mobile?18:24)};
  const jn={x:ux,y:sc.y};
  const up=[{x:ux,y:L.nv.y},{x:ux,y:L.sw.y+L.sw.h},jn,{x:ux,y:L.sw.y},{x:ux,y:L.cpu.y+L.cpu.h},cpuP];
  const toMem=[cpuP,{x:L.cpu.x+L.cpu.w,y:Y},{x:L.mem.x,y:Y},bn];
  const swToGpu=[jn,{x:L.sw.x+L.sw.w,y:sc.y},{x:L.gx,y:sc.y},{x:L.gx,y:L.gpu.y},gIn];
  const remToT=L.mobile?[rIn,{x:ic.x,y:L.rem.y},{x:ic.x,y:L.nic.y+L.nic.h},ic,{x:L.nic.x,y:sc.y},{x:L.gx,y:sc.y}]
                       :[rIn,rc,{x:L.rem.x,y:ic.y},{x:L.nic.x+L.nic.w,y:ic.y},ic,{x:L.nic.x,y:sc.y},{x:L.gx,y:sc.y}];
  E.R={
    nvToBnc:cat([nIn],up,toMem),
    bncToGpu:cat(rev(toMem),rev(up).slice(0,4),swToGpu),
    nvToGpu:cat([nIn,{x:ux,y:L.nv.y},{x:ux,y:L.sw.y+L.sw.h}],swToGpu),
    cmdNv:cat([cpuP],rev(up),[nIn]),
    remToGpu:cat(remToT,[{x:L.gx,y:L.gpu.y},gIn]),
    bnc:bn,
  };
  E.R.cmdRem=cat([cpuP,{x:ux,y:L.cpu.y+L.cpu.h},{x:ux,y:L.sw.y},jn,{x:L.sw.x+L.sw.w,y:sc.y}],rev(remToT));
},
reset(){Object.values(E.w).forEach(l=>l.setAttribute('class','ln wire'));E.cpu.setAttribute('class','blk');E.cst.textContent='';
  E.nic.setAttribute('class','blk');setBar(E.bar,0);['T','G'].forEach(k=>{E.race[k].n.textContent='0';setBar(E.race[k].bar,0)})},
btn(i){return i===4?{label:srcMode==='remote'?'⇄ 换成本地 NVMe':'⇄ 换成远端存储',aria:'切换数据来源，当前 '+(srcMode==='remote'?'远端存储':'本地 NVMe'),x:L.btn.x,y:L.btn.y}:null},
onBtn(){srcMode=srcMode==='remote'?'local':'remote';enter(4)},
vb(i){return i===3?(L.mobile?[0,40,480,506]:[0,30,960,476]):null},
reduceAt:[4.8,7,3,6,3],
modes:[]
};
function cst(s,cls){E.cst.textContent=T(s);E.cst.setAttribute('class','st '+(cls||''))}
function cpuC(c){E.cpu.setAttribute('class','blk'+(c?' '+c:''))}
/* 1：一块数据，先进中转区，再由 CPU 拷给 GPU */
SC.modes[0]={enter(){const v=S.v;v.o=pk();v.c=pk()},
  pre(){const T=8,t=S.t%T,v=S.v,f=t>7.4?Math.max(0,(T-t)/0.5):t<0.3?t/0.3:1;E.pk.style.opacity=f;
    v.o.a=1;mv(v.o,E.R.nvToBnc,t,0.3,2.3);
    v.c.a=t<2.6?0:1;v.c.cp=t>=2.6&&t<3.7;if(t<2.6)put(v.c,E.R.bnc);else mv(v.c,E.R.bncToGpu,t,2.6,4.8);
    const cp=t>=2.6&&t<3.7;S.tg.A=cp?0.17+0.02*Math.sin(S.t*9):0;cpuC(cp?'on':'');
    [E.w.cm,E.w.up].forEach(l=>wi(l,cp?'on':''));
    cst(cp?'CPU：拷贝数据':t>0.3&&t<2.3?'先进主机内存':t>4.8&&t<7.4?'第二次才到 GPU':'',cp?'rose-t':'ink3-t')},
  render(){setBar(E.bar,lv('A'))}};
/* 2：数据多了，中转成瓶颈 */
SC.modes[1]={enter(){const r=cat(E.R.nvToBnc.slice(0,-1),[P(E.R.bnc.x,E.R.bnc.y,'B')],E.R.bncToGpu.slice(1));S.v.r=r;
    station('B',r,0.42,5,null);S.v.spawnT=0;S.tau.up=0.8;S.tau.dn=1.2;[E.w.cm,E.w.up].forEach(l=>wi(l,'on'))},
  pre(dt){const v=S.v;v.spawnT-=dt;if(v.spawnT<=0){if(canSpawn(v.r)){flow(v.r,320,'',0.05);v.spawnT+=Math.max(0.36,1.1-0.12*S.t)}else v.spawnT=0.05}
    const rate=clamp(S.t/6.5,0,1),st=S.st.B,act=st.cur||st.q.length;S.tg.A=act?Math.min(0.96,0.14+0.8*rate+0.03*Math.sin(S.t*8)):0.1+0.4*rate},
  render(){const x=lv('A');setBar(E.bar,x);cpuC(x>0.42||S.st.B.cur?'on':'');cst('CPU：拷贝 · '+loadWord(x),x>0.42?'rose-t':'ink3-t')}};
/* 3：GDS，CPU 只发起 */
SC.modes[2]={enter(){S.v.cmd=dot();S.v.sent=0;S.v.cyc=-1;[E.w.sn,E.w.t1,E.w.tg].forEach(l=>wi(l,'ok'));wi(E.w.up,'ask')},
  pre(){const T=6.4,c=Math.floor(S.t/T),t=S.t-c*T,v=S.v;if(c!==v.cyc){v.cyc=c;v.sent=0}
    v.cmd.a=t>0.2&&t<1.15?1:0;mv(v.cmd,E.R.cmdNv,t,0.2,1.1);
    while(v.sent<6&&t>=1.3+v.sent*0.45){flow(E.R.nvToGpu,320,'',0.3);v.sent++}
    S.tg.A=t>0.2&&t<0.9?0.14:0.02},
  render(){setBar(E.bar,lv('A'),lv('A')>0.05?'slate':'');cpuC(lv('A')>0.05?'ask':'ok');cst('CPU：只发起',lv('A')>0.05?'slate-t':'sage-t')}};
/* 4：两条路一起跑 */
SC.modes[3]={enter(){station('B',E.race.T.route,0.5,L.mobile?3:4,null,Math.max(0,L.race.st.w/2+L.pw/2+4-L.gap));S.tau.up=0.7;S.tau.dn=0.9;S.v.cyc=-1},
  pre(dt){const v=S.v,T=9,c=Math.floor(S.t/T),t=S.t-c*T;
    if(c!==v.cyc){if(v.cyc>=0){S.pk.forEach(kill);S.pk=[];S.st.B.cur=null;S.st.B.q=[]}v.cyc=c;S.cnt={T:0,G:0};v.spawnT=0;v.t0=S.t}
    if(t<7.4){v.spawnT-=dt;if(v.spawnT<=0){v.spawnT+=0.25;flow(E.race.G.route,400,'',0.05);if(canSpawn(E.race.T.route))flow(E.race.T.route,400,'',0.05)}}
    const b=S.st.B.cur||S.st.B.q.length;S.tg.T=b?Math.min(0.96,0.88+0.04*Math.sin(S.t*8)):0.1;S.tg.G=t<0.6?0.08:0.03;
    v.f=t>8.6?Math.max(0,(9-t)/0.4):t<0.4?t/0.4:1},
  arrive(p){S.cnt[p.pts===E.race.T.route?'T':'G']++},
  render(){const v=S.v;E.pk.style.opacity=v.f;['T','G'].forEach(k=>{const o=E.race[k];o.n.textContent=S.cnt[k]||0;o.n.style.opacity=v.f;setBar(o.bar,lv(k))});
    E.race.T.st.style.opacity=lv('T')>0.45?1:0;E.race.stn.classList.toggle('on',!!S.st.B.cur)}};
/* 5：远端存储也能直达 */
SC.modes[4]={enter(){const v=S.v;v.cmd=dot();v.sent=0;v.cyc=-1;
    if(srcMode==='remote'){[E.w.nr,E.w.t2,E.w.tg].forEach(l=>wi(l,'ok'));E.nic.setAttribute('class','blk ok');E.nicSt.style.opacity=1}
    else{[E.w.sn,E.w.t1,E.w.tg].forEach(l=>wi(l,'ok'));E.nicSt.style.opacity=0}
    wi(E.w.up,'ask')},
  pre(){const T=7,c=Math.floor(S.t/T),t=S.t-c*T,v=S.v;if(c!==v.cyc){v.cyc=c;v.sent=0}
    const rem=srcMode==='remote',cp=rem?E.R.cmdRem:E.R.cmdNv,dp=rem?E.R.remToGpu:E.R.nvToGpu,te=rem?1.6:1.1;
    v.cmd.a=t>0.2&&t<te+0.05?1:0;mv(v.cmd,cp,t,0.2,te);
    while(v.sent<6&&t>=te+0.2+v.sent*0.45){flow(dp,330,'',0.3);v.sent++}
    S.tg.A=t>0.2&&t<0.9?0.14:0.02},
  render(){setBar(E.bar,lv('A'),lv('A')>0.05?'slate':'');cpuC(lv('A')>0.05?'ask':'ok');cst('CPU：只发起',lv('A')>0.05?'slate-t':'sage-t')}};
const wi=(l,c)=>l.setAttribute('class','ln wire'+(c?' '+c:''));

mq.addEventListener('change',rebuild);
const onLang=()=>rebuild();document.addEventListener('ss-lang',onLang);
build();newSim();
const N=SC.modes.length;
const ctrl={
  show(i){enter(Math.max(0,Math.min(N-1,i)))},
  pause(){paused=true;cancelAnimationFrame(raf)},
  resume(){if(!paused)return;paused=false;run()},
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('an-gds')},
  ratio(){return L.W/L.H},
  step(){return step},
  sim(){return {step,t:S.t,lv:S.lv,cnt:S.cnt,n:S.pk.length,q:Object.fromEntries(Object.entries(S.st).map(([k,s])=>[k,s.q.length+(s.cur?1:0)]))}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['gds']={steps:5,mount:mount};
})();
