/* 纠删码怎么省空间：动画模块（由 anim.html 改写，画面、配色、动效不变）。
   接口与 assets/anim/rdma.js 相同：
     var a = SSAnim['ec'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) / a.pause() / a.resume() / a.destroy() / a.ratio() / a.step()
   动画自己不带翻页控件，页面翻到哪一步就调 show(i)。宽度 640px 以下换成上下排布；
   系统开了「减少动态效果」时每步只画一帧静态结果。文字有中英两套（EN 表 + T()），跟着 ss-lang 事件重画。
   样式在 assets/anim/ec.css，类名都在 .an-ec 之内。 */
(function(){
var EN={"数据": "Data", "数据块": "Data block", "校验块": "Parity block", "三副本": "3 copies", "纠删码 8+2": "EC 8+2", "复制三份": "Copy ×3", "算校验": "Compute parity", "算回来": "Recompute", "盘": "Drives", "已写入": "Written", "示意，不代表实测数字": "Schematic, not measured", "盘 1": "Drive 1", "盘 2": "Drive 2", "盘 3": "Drive 3", "盘 4": "Drive 4", "盘 5": "Drive 5", "盘 6": "Drive 6", "盘 7": "Drive 7", "盘 8": "Drive 8", "盘 9": "Drive 9", "盘 10": "Drive 10", "盘 11": "Drive 11", "盘 12": "Drive 12", "盘 13": "Drive 13", "盘 14": "Drive 14", "盘 15": "Drive 15", "盘 16": "Drive 16", "3 块盘装 1 份数据": "3 drives hold 1 drive of data", "10 块盘装 8 份数据": "10 drives hold 8 drives of data", "数据丢了": "Data lost", "还有一份": "A copy survives", "坏了": "Failed", "新盘": "New drive", "盘 · 占用较低": "Drives · light use", "盘 · 占用升高": "Drives · filling up", "盘 · 占用很高": "Drives · heavy use", "⇄ 换成 14+2": "⇄ Switch to 14+2", "⇄ 换成 8+2": "⇄ Switch to 8+2", "切换条带宽度，当前 8+2": "Switch stripe width, now 8+2", "切换条带宽度，当前 14+2": "Switch stripe width, now 14+2"};
var ARIA=["一排硬盘：副本与纠删码怎样扛住坏盘、各占多少空间", "A row of drives: what copies and erasure coding cost, and how lost blocks are recomputed"];
function lang(){return window.SS_LANG==='en'?'en':'zh'}
function T(s){return lang()==='en'&&typeof s==='string'&&EN[s]!==undefined?EN[s]:s}
function F(zh,en){return lang()==='en'?en:zh}
function mount(host,opts){
opts=opts||{};
/* ---------- 通用小引擎：SVG 构建、沿线移动、排队仿真、负载条平滑 ---------- */
const NS='http://www.w3.org/2000/svg';
host.classList.add('an-ec');host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','an-ec-scene');svg.setAttribute('role','img');host.appendChild(svg);
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


/* ---------- 纠删码：一排盘 + 数据框 + 中间处理框；第 5 步两条线对比 ---------- */
let wide=qs.get('w')==='14';
const SC={
layout(mobile){
  if(!mobile){
    const W=960,H=476;
    return {mobile,W,H,pw:24,ph:18,dr:7,gap:26,f:{ttl:22,lbl:20,st:18,sm:17,note:16,big:34,lane:22},
      cx:480,src:{x:300,y:20,w:360,h:60},srcLab:{x:288,y:50,a:'end'},bx:34,
      mid:{x:350,y:126,w:260,h:56},midLab:{x:366},rb:{x:622,y:154,a:'start'},
      busY:232,disk:{y:268,h:80},labY:370,stY:396,cap:{x:48,y:432},note:{x:912,y:432,a:'end'},
      legend:{x:760,y:36},
      row(n){const w=n>10?48:72,g=n>10?8:16,x0=(960-(n*w+(n-1)*g))/2;return [...Array(n)].map((_,i)=>({x:x0+i*(w+g),w,row:0}))},
      race:{lab:{x:32},src:{x:170,w:64,h:48},st:{x:440,w:150,h:48},pool:{x:640,w:184,h:76},cnt:{x:892},lanes:[150,346],sep:248,note:{x:32,y:452}},
      btn(n){return {x:480,y:440}}};
  }
  const W=480,H=540;
  return {mobile,W,H,pw:22,ph:16,dr:6,gap:24,f:{ttl:19,lbl:17,st:16,sm:16,note:16,big:26,lane:19},
    cx:240,src:{x:20,y:14,w:440,h:56},srcLab:{x:32,y:42,a:'start'},bx:30,
    mid:{x:110,y:110,w:260,h:52},midLab:{x:124},rb:{x:358,y:136,a:'end'},
    busY:206,disk:{y:236,h:64},labY:318,stY:340,cap:{x:16,y:372},note:{x:16,y:396,a:'start'},
    legend:null,
    row(n){if(n<=10){const w=40,g=6,x0=(480-(n*w+(n-1)*g))/2;return [...Array(n)].map((_,i)=>({x:x0+i*(w+g),w,row:0}))}
      const w=48,g=8,x0=(480-(8*w+7*g))/2;return [...Array(n)].map((_,i)=>({x:x0+(i%8)*(w+g),w,row:i<8?0:1}))},
    row2:{busY:344,diskY:374,labY:456,stY:476},
    race:{lab:{x:16},src:{x:16,w:52,h:40},st:{x:176,w:110,h:40},pool:{x:288,w:178,h:64},lanes:[150,394],sep:276,note:{x:16,y:510}},
    btn(n){return n>10?{x:372,y:516}:{x:372,y:384}}};
},
build(){
  const f=L.f,cx=L.cx;
  const top=grp('2 3 4 6');
  E.src=rect(L.src,'blk',top);tx(L.srcLab.x,L.srcLab.y,'数据',f.lbl,'lbl',L.srcLab.a,top);
  line({x:cx,y:L.src.y+L.src.h},{x:cx,y:L.mid.y},'wire',top);
  line({x:cx,y:L.mid.y+L.mid.h},{x:cx,y:L.busY},'wire',top);
  E.mid=rect(L.mid,'blk',top);
  E.midT=tx(L.midLab.x,L.mid.y+L.mid.h/2,'',f.lbl,'lbl','start',top);
  E.rb=tx(L.rb.x,L.rb.y,'',f.st,'st rose-t',L.rb.a,grp('6'));
  E.rowG=grp('1 2 3 4 6');
  if(L.legend){const g=grp('3 4 6'),lg=L.legend;
    el('rect',{x:lg.x,y:lg.y-9,width:L.pw,height:L.ph,rx:4,class:'pkt'},g);tx(lg.x+36,lg.y,'数据块',f.sm,'ink2-t','start',g);
    el('rect',{x:lg.x,y:lg.y+23,width:L.pw,height:L.ph,rx:4,class:'pkt par'},g);tx(lg.x+36,lg.y+32,'校验块',f.sm,'ink2-t','start',g);}
  E.cap=tx(L.cap.x,L.cap.y,'',f.lbl,'lbl','start',grp('2 3 6'));
  E.note=tx(L.note.x,L.note.y,'示意，不代表实测数字',f.note,'ink3-t',L.note.a,grp('6'));
  /* 第 5 步：两条线 */
  const R=L.race,race=grp('5');E.race={};
  [['R','三副本','复制三份'],['E','纠删码 8+2','算校验']].forEach(([k,name,stn],j)=>{
    const y=R.lanes[j],o={};E.race[k]=o;
    const labY=L.mobile?y-78:y;
    tx(R.lab.x,labY,name,f.lane,'lbl','start',race).style.fontWeight=700;
    const sx=R.src.x,ex=R.pool.x;
    line({x:sx+R.src.w,y},{x:R.st.x-R.st.w/2,y},'wire',race);line({x:R.st.x+R.st.w/2,y},{x:ex,y},'wire',race);
    rect({x:sx,y:y-R.src.h/2,w:R.src.w,h:R.src.h},'ep',race,10);tx(sx+R.src.w/2,y,'数据',f.sm,'lbl','middle',race);
    o.st=rect({x:R.st.x-R.st.w/2,y:y-R.st.h/2,w:R.st.w,h:R.st.h},'blk',race,10);
    tx(R.st.x,y-R.st.h/2-(L.mobile?14:18),stn,f.sm,'ink2-t','middle',race);
    const pl={x:ex,y:y-R.pool.h/2,w:R.pool.w,h:R.pool.h};o.pool=rect(pl,'blk',race);
    o.word=tx(ex+12,y-R.pool.h/2+(L.mobile?16:20),'盘',f.sm,'st ink2-t','start',race);
    o.bar=bar(ex+12,y+R.pool.h/2-(L.mobile?18:22),R.pool.w-24,L.mobile?10:12,race,j?'sage':'');
    if(!L.mobile){tx(R.cnt.x,y-18,'已写入',f.note,'ink3-t','middle',race);o.n=tx(R.cnt.x,y+20,'0',f.big,'num '+(j?'sage-t':'rose-t'),'middle',race)}
    else{tx(ex+12,y+R.pool.h/2+22,'已写入',f.note,'ink3-t','start',race);o.n=tx(ex+76,y+R.pool.h/2+22,'0',f.big,'num '+(j?'sage-t':'rose-t'),'start',race)}
    o.y=y;o.in={x:sx+R.src.w,y};o.stp={x:R.st.x,y};o.out={x:ex+R.pool.w*0.62,y};
    o.p1=[{x:sx+R.src.w-2,y},{x:R.st.x,y}];o.p2=[{x:R.st.x,y},{x:ex,y},{x:ex+R.pool.w*0.62,y}];
  });
  line({x:L.mobile?16:32,y:R.sep},{x:L.W-(L.mobile?16:32),y:R.sep},'sep',race);
  tx(R.note.x,R.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',race);
  E.pk=el('g',{});
  E.xg=grp('1 2 3 4 6');
},
/* 画一排 n 块盘（每步进入时重画） */
makeRow(n){
  E.rowG.innerHTML='';const g=E.rowG,f=L.f,cx=L.cx,pos=L.row(n);E.disks=[];
  const r2=L.row2;
  const rows=[0,1].map(r=>pos.filter(p=>p.row===r));
  rows.forEach((ps,r)=>{if(!ps.length)return;const by=r?r2.busY:L.busY,dy=r?r2.diskY:L.disk.y;
    const xs=ps.map(p=>p.x+p.w/2);line({x:Math.min(...xs,cx),y:by},{x:Math.max(...xs,cx),y:by},'wire',g);
    if(r)line({x:cx,y:L.busY},{x:cx,y:by},'wire',g);
    ps.forEach(p=>line({x:p.x+p.w/2,y:by},{x:p.x+p.w/2,y:dy},'wire',g))});
  pos.forEach((p,i)=>{const r=p.row,dy=r?r2.diskY:L.disk.y,ly=r?r2.labY:L.labY,sy=r?r2.stY:L.stY;
    const rc={x:p.x,y:dy,w:p.w,h:L.disk.h},c=C(rc);
    const el2=rect(rc,'blk',g,L.mobile?8:12);
    const lab=tx(c.x,ly,(n>10||L.mobile)?String(i+1):'盘 '+(i+1),L.mobile?f.note:f.sm,'ink2-t','middle',g);
    const st=tx(c.x,sy,'',f.sm,'st','middle',g);
    const by=r?r2.busY:L.busY;
    const to=r?[{x:cx,y:L.busY},{x:cx,y:by},{x:c.x,y:by},{x:c.x,y:dy},c]:[{x:cx,y:L.busY},{x:c.x,y:by},{x:c.x,y:dy},c];
    E.disks.push({r:el2,c,lab,st,to,rc})});
  E.n=n;
},
mark(i,on){const d=E.disks[i];if(!d.x){d.x=[line({x:d.rc.x+6,y:d.rc.y+6},{x:d.rc.x+d.rc.w-6,y:d.rc.y+d.rc.h-6},'xmark',E.xg),line({x:d.rc.x+d.rc.w-6,y:d.rc.y+6},{x:d.rc.x+6,y:d.rc.y+d.rc.h-6},'xmark',E.xg)]}
  d.x.forEach(l=>l.style.opacity=on?1:0)},
reset(){E.xg.innerHTML='';E.cap.setAttribute('y',L.cap.y);E.note.setAttribute('y',L.note.y);E.mid.setAttribute('class','blk');E.midT.textContent='';E.rb.textContent='';E.cap.textContent='';
  if(E.race)['R','E'].forEach(k=>{E.race[k].n.textContent='0';setBar(E.race[k].bar,0)})},
vb(i){/* 画布高度各步一致，内容少的步骤居中，避免按钮跳动 */
  if(!L.mobile)return i===0?[0,78,960,476]:null;
  if(i===0)return [0,3,480,540];if(i===4)return [0,21,480,540];if(i===5&&wide)return null;return [0,-65,480,540]},
btn(i){if(i!==5)return null;const p=L.btn(wide?16:10);return {label:wide?'⇄ 换成 8+2':'⇄ 换成 14+2',aria:'切换条带宽度，当前 '+(wide?'14+2':'8+2'),x:p.x,y:p.y}},
onBtn(){wide=!wide;enter(5)},
reduceAt:[2,5,5.6,6,6.9,5.4],
modes:[]
};
const cx=()=>L.cx;
function srcPt(i,k){return {x:L.cx+(i-(k-1)/2)*L.bx,y:L.src.y+L.src.h/2}}
function downFrom(p,j){const cxx=L.cx,mc={x:cxx,y:L.mid.y+L.mid.h/2};
  return cat([p,{x:cxx,y:p.y},{x:cxx,y:L.src.y+L.src.h},{x:cxx,y:L.mid.y},mc,{x:cxx,y:L.mid.y+L.mid.h}],E.disks[j].to)}
function midDown(j){const cxx=L.cx;return cat([{x:cxx,y:L.mid.y+L.mid.h/2},{x:cxx,y:L.mid.y+L.mid.h}],E.disks[j].to)}
function diskSt(i,s,cls){const t=E.disks[i].st;t.textContent=T(s);t.setAttribute('class','st '+(cls||''))}
function diskCls(i,c){E.disks[i].r.setAttribute('class','blk'+(c?' '+c:''))}
function fill(n,k){/* 盘里放好块：前 k 块数据，其余校验 */const a=[];for(let i=0;i<n;i++){const p=pk(i<k?'':'par');put(p,E.disks[i].c);p.a=1;a.push(p)}return a}
const cycF=(t,T)=>t>T-0.6?Math.max(0,(T-t)/0.5):t<0.3?t/0.3:1;
/* 1：盘坏了，数据丢了 */
SC.modes[0]={enter(){SC.makeRow(10);S.v.b=fill(10,10)},
  pre(){const T=6,t=S.t%T,v=S.v,f=cycF(t,T);E.pk.style.opacity=f;E.xg.style.opacity=f;
    const bad=t>1.2;SC.mark(3,bad);diskCls(3,bad?'bad':'');v.b[3].a=1-fade(t,1.4,2.0);diskSt(3,t>2?'数据丢了':'','rose-t')}};
/* 2：三副本 */
SC.modes[1]={enter(){SC.makeRow(10);E.midT.textContent=T('复制三份');E.cap.textContent=T('3 块盘装 1 份数据');
    const v=S.v;v.o=pk();put(v.o,srcPt(0,1));v.c=[1,4,7].map(j=>({p:pk(),j,path:downFrom(srcPt(0,1),j)}))},
  pre(){const T=8,t=S.t%T,v=S.v,f=cycF(t,T);E.pk.style.opacity=f;E.xg.style.opacity=f;
    const tb={1:3.6,4:4.2};
    v.o.a=1;v.c.forEach((c,k)=>{const t0=0.5+k*0.35;c.p.a=(t<t0?0:1)*(tb[c.j]?1-fade(t,tb[c.j],tb[c.j]+0.4):1);mv(c.p,c.path,t,t0,t0+1.9)});
    const busy=t>0.5&&t<1.6;E.mid.setAttribute('class','blk'+(busy?' ask':''));
    [1,4].forEach(j=>{const b=t>tb[j];SC.mark(j,b);diskCls(j,b?'bad':'')});
    const ok=t>4.8;diskCls(7,ok?'ok':'');diskSt(7,ok?'还有一份':'','sage-t')}};
/* 3：切 8 块 + 算 2 块校验 */
SC.modes[2]={enter(){SC.makeRow(10);E.midT.textContent=T('算校验');E.cap.textContent=T('10 块盘装 8 份数据');
    const v=S.v,order=[3,4,2,5,1,6,0,7];
    v.d=[...Array(8)].map((_,i)=>{const p=pk();put(p,srcPt(i,8));return {p,i,t0:0.4+order.indexOf(i)*0.32,path:downFrom(srcPt(i,8),i)}});
    v.par=[8,9].map((j,k)=>({p:pk('par'),j,t0:3.3+k*0.3,path:midDown(j)}))},
  pre(){const T=9,t=S.t%T,v=S.v,f=cycF(t,T);E.pk.style.opacity=f;
    v.d.forEach(d=>{d.p.a=1;mv(d.p,d.path,t,d.t0,d.t0+2.0)});
    v.par.forEach(d=>{d.p.a=t<d.t0?0:1;mv(d.p,d.path,t,d.t0,d.t0+1.5)});
    const gen=t>3.0&&t<3.9;E.mid.setAttribute('class','blk'+(gen?' par':''))}};
/* 4：坏两块，算回来 */
SC.modes[3]={enter(){SC.makeRow(10);E.midT.textContent=T('算回来');const v=S.v;v.b=fill(10,8);
    const alive=[0,1,3,4,5,7,8,9];v.up=alive.map((j,k)=>({p:pk(j<8?'':'par'),j,t0:1.7+k*0.12,path:rev(midDown(j))}));
    v.nw=[2,6].map((j,k)=>({p:pk('nw'),j,t0:4.2+k*0.25,path:midDown(j)}))},
  pre(){const T=10,t=S.t%T,v=S.v,f=cycF(t,T);E.pk.style.opacity=f;E.xg.style.opacity=f;
    [2,6].forEach(j=>{const bad=t>0.7&&t<4.4;SC.mark(j,bad);diskCls(j,bad?'bad':t>=4.4?'ok':'');v.b[j].a=1-fade(t,0.9,1.4);
      diskSt(j,bad?'坏了':t>=4.4?'新盘':'',bad?'rose-t':'sage-t')});
    v.up.forEach(u=>{u.p.a=t<u.t0?0:t<u.t0+1.5?1:1-fade(t,u.t0+1.5,u.t0+1.8);mv(u.p,u.path,t,u.t0,u.t0+1.5)});
    v.nw.forEach(u=>{u.p.a=t<u.t0?0:1;mv(u.p,u.path,t,u.t0,u.t0+1.4)});
    const calc=t>3.2&&t<4.4;E.mid.setAttribute('class','blk'+(calc?' ok':''))}};
/* 5：同样多的数据，占多少盘 */
SC.modes[4]={enter(){S.v.cyc=-1;S.tau.up=0.35;S.tau.dn=0.3},
  pre(dt){const v=S.v,T=9.4,c=Math.floor(S.t/T),t=S.t-c*T;
    if(c!==v.cyc){S.pk.forEach(kill);S.pk=[];v.cyc=c;v.j=[];v.next=0.3;v.k=0;S.cnt={R:0,E:0};v.store={R:0,E:0};S.lv.R=0;S.lv.E=0}
    if(t<7.3){v.next-=dt;if(v.next<=0){v.next+=0.5;v.k++;
      ['R','E'].forEach(k=>{const o=E.race[k],d=pk();v.j.push({p:d,k,t0:t,a:o.p1,b:o.p2,data:true,n:k==='R'?3:(v.k%4===0?2:1)})})}}
    const born=[];v.j=v.j.filter(j=>{const u=t-j.t0;
      if(u<0.7){j.p.a=1;mv(j.p,j.a,u,0,0.7);return true}
      if(j.data&&!j.split){j.split=true;for(let m=1;m<j.n;m++){const cp=pk(j.k==='E'?'par':'');born.push({p:cp,k:j.k,t0:t-0.7+m*0.16,a:[j.a[1],j.a[1]],b:j.b,clone:true})}}
      const w=u-0.7;if(w<0){j.p.a=1;put(j.p,j.a[1]);return true}
      if(w<0.9){j.p.a=1;mv(j.p,j.b,w,0,0.9);return true}
      if(!j.done){j.done=true;v.store[j.k]++;if(j.data)S.cnt[j.k]++}
      j.p.a=1-fade(w,0.9,1.2);if(w>1.2){kill(j.p);return false}return true});
    v.j=v.j.concat(born);
    const cap=45;S.tg.R=v.store.R/cap;S.tg.E=v.store.E/cap;
    v.f=t>T-0.5?Math.max(0,(T-t)/0.4):t<0.3?t/0.3:1},
  render(){const v=S.v;E.pk.style.opacity=v.f==null?1:v.f;
    ['R','E'].forEach(k=>{const o=E.race[k],x=lv(k);setBar(o.bar,x);o.n.textContent=S.cnt[k]||0;o.n.style.opacity=v.f==null?1:v.f;
      o.word.textContent=T('盘 · '+loadWord(x));o.word.setAttribute('class','st '+(x>0.42?'rose-t':'ink2-t'));
      o.pool.setAttribute('class','blk'+(x>0.75?' on':''))})}};
/* 6：条带宽度 */
SC.modes[5]={enter(){const n=wide?16:10,k=n-2;SC.makeRow(n);if(L.mobile&&wide){E.cap.setAttribute('y',500);E.note.setAttribute('y',524)}/* 手机上 14+2 换两排，说明文字挪到第二排下面，免得压住盘 */E.midT.textContent=T('算回来');
    E.cap.textContent=F(n+' 块盘里 2 块是校验','2 of '+n+' drives are parity');const v=S.v;v.b=fill(n,k);v.k=k;
    const alive=[...Array(n).keys()].filter(j=>j!==2).slice(0,k);
    v.up=alive.map((j,m)=>({p:pk(j<k?'':'par'),j,t0:1.4+m*(wide?0.07:0.12),path:rev(midDown(j))}));
    v.nw={p:pk('nw'),t0:4.0,path:midDown(2)}},
  pre(){const T=8,t=S.t%T,v=S.v,f=cycF(t,T);E.pk.style.opacity=f;E.xg.style.opacity=f;
    const bad=t>0.6&&t<4.1;SC.mark(2,bad);diskCls(2,bad?'bad':t>=4.1?'ok':'');v.b[2].a=1-fade(t,0.8,1.2);
    v.up.forEach(u=>{u.p.a=t<u.t0?0:t<u.t0+1.4?1:1-fade(t,u.t0+1.4,u.t0+1.7);mv(u.p,u.path,t,u.t0,u.t0+1.4)});
    v.nw.p.a=t<v.nw.t0?0:1;mv(v.nw.p,v.nw.path,t,v.nw.t0,v.nw.t0+1.3);
    E.rb.textContent=t>1.3?F((L.mobile?'读 ':'重建要读 ')+v.k+' 块',(L.mobile?'Reads ':'Rebuild reads ')+v.k+' blocks'):'';E.rb.style.opacity=f;
    E.mid.setAttribute('class','blk'+(t>2.6&&t<4.1?' ok':''))}};

mq.addEventListener('change',rebuild);
const onLang=()=>rebuild();document.addEventListener('ss-lang',onLang);
build();newSim();
const N=SC.modes.length;
const ctrl={
  show(i){enter(Math.max(0,Math.min(N-1,i)))},
  pause(){paused=true;cancelAnimationFrame(raf)},
  resume(){if(!paused)return;paused=false;run()},
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('an-ec')},
  ratio(){return L.W/L.H},
  step(){return step},
  sim(){return {step,t:S.t,lv:S.lv,cnt:S.cnt,n:S.pk.length,q:Object.fromEntries(Object.entries(S.st).map(([k,s])=>[k,s.q.length+(s.cur?1:0)]))}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['ec']={steps:6,mount:mount};
})();
