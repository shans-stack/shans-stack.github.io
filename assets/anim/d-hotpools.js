/* Hot Pools：七步动画（SVG 加小仿真，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['d-hotpools'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   文字有中英两套，跟着页面的 ss-lang 事件重画。样式在 assets/anim/d-hotpools.css。 */
(function(){
var EN={"客户端":"Client","同一个目录":"One directory","闪存池":"Flash pool","快 · 容量小":"Fast · small","硬盘池":"Disk pool","容量大 · 便宜":"Large · cheap",
  "硬盘上也有一份":"Also on disk","后台副本":"Background copy","这次不搬":"Not moved","临时跳过":"Skipped for now","改写到硬盘池":"Written to disk pool",
  "下水位":"Low mark","上水位":"High mark","溢出线":"Overflow","热度":"Heat",
  "占用很高":"Nearly full","占用升高":"Filling up","占用较低":"Usage low","过了门槛":"Past threshold","还没过门槛":"Below threshold",
  "这份来自闪存":"Served from flash","这份来自硬盘":"Served from disk",
  "闪存池和硬盘池在同一个目录里：新写入先落闪存，后台建硬盘副本、清理闪存，冷文件变热后回到闪存":"A flash pool and a disk pool in one directory: new writes land on flash, disk copies are made and flash is cleaned in the background, and cold files that turn hot return to flash"};
function lang(){return window.SS_LANG==='en'?'en':'zh'}
function T(s){return lang()==='en'&&EN[s]!==undefined?EN[s]:s}
function mount(host,opts){
opts=opts||{};
const NS='http://www.w3.org/2000/svg';
host.classList.add('an-d-hotpools');host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','an-scene');svg.setAttribute('role','img');host.appendChild(svg);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mq=matchMedia('(max-width: 640px)');
let L,E,S,step=0;
const LOW=0.5,HIGH=0.8,SPILL=0.9,HEATG=0.75;

/* ---------- 版式：桌面左右两个池，手机上下两个池 ---------- */
function layout(m){
  if(!m){
    const W=960,H=476;
    const fl={x:90,y:214,w:320,h:204},hd={x:550,y:214,w:320,h:204};
    return {m,W,H,f:{lbl:21,ttl:22,sm:17,note:16},pw:34,ph:24,
      cli:{x:400,y:18,w:160,h:48},ns:{x:230,y:104,w:500,h:44},fl,hd,
      C:{x:480,y:66},J:480,jy:182,lx:220,rx:710,
      fs:grid([130,190,250,310,370],[268,340]),hs:grid([584,632,680,728,776,824],[268,340,382]),
      mir:{fy:304,hy:304,x1:fl.x+fl.w,x2:hd.x,y:304,vert:false},
      gauge:{x:106,y:380,w:194,h:14,sx:312,ly:404},
      heat:{lx:hd.x,x:hd.x+56,y:448,w:200,h:14,sx:hd.x+270},
      lab:{leg:{x:106,y:444},mir:{x:480,y:280,a:'middle'},nomv:{x:480,y:328,a:'middle'},src:{x:572,y:42,a:'start'},skip:{x:232,y:198,a:'start'},spill:{x:734,y:198,a:'start'}},
      sp:{w:300,m:220,rh:240,rf:480}};
  }
  const W=480,H=752;
  const fl={x:24,y:190,w:316,h:210},hd={x:24,y:486,w:432,h:214};
  return {m,W,H,f:{lbl:19,ttl:20,sm:17,note:17},pw:30,ph:22,
    cli:{x:170,y:14,w:140,h:44},ns:{x:24,y:86,w:432,h:44},fl,hd,
    C:{x:240,y:58},J:240,jy:156,lx:145,rx:410,
    fs:grid([58,116,174,232,290],[248,312]),hs:grid([58,112,178,232,286,340],[546,612,652]),
    mir:{fy:280,hy:579,x:145,y1:fl.y+fl.h,y2:hd.y,vert:true},
    gauge:{x:40,y:354,w:160,h:14,sx:212,ly:380},
    heat:{lx:24,x:78,y:726,w:200,h:14,sx:290},
    lab:{leg:{x:196,y:416},mir:{x:166,y:446,a:'start'},nomv:{x:166,y:468,a:'start'},src:{x:322,y:36,a:'start'},skip:{x:157,y:173,a:'start'},spill:{x:388,y:470,a:'end'}},
    sp:{w:260,m:190,rh:210,rf:420}};
}
function grid(xs,ys){const o=[];ys.forEach(y=>xs.forEach(x=>o.push({x,y})));return o}

/* ---------- 画布 ---------- */
function el(tag,a,p){const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);(p||svg).appendChild(e);return e}
function tx(x,y,s,size,cls,anchor,p){const t=el('text',{x,y,'font-size':size,class:cls||''},p);if(anchor)t.setAttribute('text-anchor',anchor);t.textContent=T(s);return t}
function grp(show,p){const g=el('g',{class:'vis'},p);if(show)g.dataset.show=show;return g}
const ln=(x1,y1,x2,y2,cls,p)=>el('line',{x1,y1,x2,y2,class:'ln '+cls},p);

function build(){
  svg.innerHTML='';E={};
  svg.setAttribute('viewBox',`0 0 ${L.W} ${L.H}`);
  const f=L.f,c=L.cli,n=L.ns,fl=L.fl,hd=L.hd;
  // 连线
  ln(L.J,c.y+c.h,L.J,n.y,'base');
  ln(L.J,n.y+n.h,L.J,L.jy,'base');
  ln(L.lx,L.jy,L.rx,L.jy,'base');
  E.lb=ln(L.lx,L.jy,L.lx,fl.y,'base');
  E.rb=ln(L.rx,L.jy,L.rx,hd.y,'base');
  const mr=L.mir;
  E.mir=mr.vert?ln(mr.x,mr.y1,mr.x,mr.y2,'base'):ln(mr.x1,mr.y,mr.x2,mr.y,'base');
  // 方块
  el('rect',{x:c.x,y:c.y,width:c.w,height:c.h,rx:12,class:'blk'});
  tx(c.x+c.w/2,c.y+c.h/2,'客户端',f.lbl,'lbl','middle');
  el('rect',{x:n.x,y:n.y,width:n.w,height:n.h,rx:12,class:'blk'});
  tx(n.x+16,n.y+n.h/2,'同一个目录',f.lbl,'lbl','start');
  tx(n.x+n.w-16,n.y+n.h/2,'/data',f.lbl,'ink2-t b7','end');
  E.fbox=el('rect',{x:fl.x,y:fl.y,width:fl.w,height:fl.h,rx:16,class:'blk sage'});
  tx(fl.x+16,fl.y+24,'闪存池',f.ttl,'lbl b7','start');
  tx(fl.x+fl.w-16,fl.y+24,'快 · 容量小',f.sm,'sage-t st','end');
  E.hbox=el('rect',{x:hd.x,y:hd.y,width:hd.w,height:hd.h,rx:16,class:'blk ochre'});
  tx(hd.x+16,hd.y+24,'硬盘池',f.ttl,'lbl b7','start');
  tx(L.m?L.rx-22:hd.x+hd.w-16,hd.y+24,'容量大 · 便宜',f.sm,'ochre-t st','end');   // 手机版右侧有竖线穿过，停在线左边
  // 空格子
  L.fs.forEach(s=>el('rect',{x:s.x-L.pw/2,y:s.y-L.ph/2,width:L.pw,height:L.ph,rx:4,class:'ghost'}));
  L.hs.forEach(s=>el('rect',{x:s.x-L.pw/2,y:s.y-L.ph/2,width:L.pw,height:L.ph,rx:4,class:'ghost'}));
  // 标签
  const lb=(k,s,cls,show)=>{const p=L.lab[k];return tx(p.x,p.y,s,f.sm,cls,p.a,grp(show))};
  {const p=L.lab.leg,g=grp('3 4 5 6 7');el('circle',{cx:p.x+6,cy:p.y,r:L.m?5:6,fill:'var(--ochre)'},g);tx(p.x+18,p.y,'硬盘上也有一份',f.note,'ink2-t','start',g)}
  lb('mir','后台副本','slate-t st','3 4 6');
  lb('nomv','这次不搬','ink3-t st','5');
  E.src=lb('src','','st','5 6');
  lb('skip','临时跳过','ink3-t st','7');
  lb('spill','改写到硬盘池','ochre-t st','7');
  // 闪存占用条
  const g=L.gauge;
  el('rect',{x:g.x,y:g.y-g.h/2,width:g.w,height:g.h,rx:4,class:'track'});
  E.gf=el('rect',{x:g.x,y:g.y-g.h/2,width:0,height:g.h,rx:4,class:'fill'});
  E.gs=tx(g.sx,g.y,'',f.sm,'st','start');
  const tick=(v,s,anc,show)=>{const gg=grp(show),x=g.x+g.w*v;ln(x,g.y-12,x,g.y+12,'tick',gg);tx(anc==='end'?x+4:x-4,g.ly,s,f.note,'ink3-t',anc,gg)};
  tick(LOW,'下水位','end','4');tick(HIGH,'上水位','start','4');tick(SPILL,'溢出线','start','7');
  // 热度条（第 6 步）
  const h=L.heat,hg=grp('6');
  tx(h.lx,h.y,'热度',f.sm,'ink2-t b7','start',hg);
  el('rect',{x:h.x,y:h.y-h.h/2,width:h.w,height:h.h,rx:4,class:'track'},hg);
  E.hf=el('rect',{x:h.x,y:h.y-h.h/2,width:0,height:h.h,rx:4,class:'fill ochre'},hg);
  const hx=h.x+h.w*HEATG;ln(hx,h.y-12,hx,h.y+12,'tick',hg);
  E.hs=tx(h.sx,h.y,'',f.sm,'st','start',hg);
  E.pk=el('g',{});
}

/* ---------- 路线 ---------- */
const P=(x,y)=>({x,y});
function rtF(i){const s=L.fs[i],gy=L.mir.fy;return [L.C,P(L.J,L.jy),P(L.lx,L.jy),P(L.lx,L.fl.y),P(L.lx,gy),P(s.x,gy),s]}
function rtH(j){const s=L.hs[j],gy=L.mir.hy;return [L.C,P(L.J,L.jy),P(L.rx,L.jy),P(L.rx,L.hd.y),P(L.rx,gy),P(s.x,gy),s]}
function rtFH(i,j){const a=L.fs[i],b=L.hs[j],m=L.mir;
  return m.vert?[a,P(a.x,m.fy),P(m.x,m.fy),P(m.x,m.y1),P(m.x,m.y2),P(m.x,m.hy),P(b.x,m.hy),b]
               :[a,P(a.x,m.y),P(m.x1,m.y),P(m.x2,m.y),P(b.x,m.y),b]}
const rev=a=>a.slice().reverse();

/* ---------- 文件块 ---------- */
function newSim(){S={t:0,ct:0,cyc:-1,bl:[],F:Array(L.fs.length).fill(null),H:Array(L.hs.length).fill(null),gv:0,heat:0,hv:0,mirN:0,tm:{},src:''}}
function blk(p,cls){const g=el('g',{},E.pk);el('rect',{x:-L.pw/2,y:-L.ph/2,width:L.pw,height:L.ph,rx:4,class:'pkt'+(cls?' '+cls:'')},g);
  const dot=el('circle',{cx:L.pw/2-1,cy:-L.ph/2+1,r:L.m?5:6,fill:'var(--ochre)',stroke:'var(--card)','stroke-width':2},g);dot.style.opacity=0;
  const b={g,dot,x:p.x,y:p.y,a:1,fa:null,mv:null};S.bl.push(b);return b}
function go(b,pts,sp,done){b.mv={pts:pts.slice(1),i:0,sp,done}}
function kill(b,dur){b.fa={d:dur||0.5,t:0}}
const freeIdx=a=>a.findIndex(v=>v===null);
const cnt=a=>a.filter(v=>v&&v.here).length;
function putF(i,mk){const b=blk(L.fs[i]);S.F[i]={b,here:true,mk:!!mk,t0:S.ct};b.dot.style.opacity=mk?1:0;return S.F[i]}
function putH(j,cls){const b=blk(L.hs[j],cls);S.H[j]={b,here:true};return S.H[j]}
function write(to){
  if(to==='F'){const i=freeIdx(S.F);if(i<0)return;const b=blk(L.C);S.F[i]={b,here:false,mk:false,t0:0};b.a=0;
    go(b,rtF(i),L.sp.w,()=>{S.F[i].here=true;S.F[i].t0=S.ct})}
  else{const j=freeIdx(S.H);if(j<0)return;const b=blk(L.C);S.H[j]={b,here:false};b.a=0;go(b,rtH(j),L.sp.w,()=>{S.H[j].here=true})}
}
function mirrorFH(i){const j=freeIdx(S.H);if(j<0)return false;const src=S.F[i];src.busy=true;
  const b=blk(L.fs[i]);S.H[j]={b,here:false};S.mirN++;
  go(b,rtFH(i,j),L.sp.m,()=>{S.H[j].here=true;src.mk=true;src.busy=false;src.b.dot.style.opacity=1;S.mirN--});return true}
function mirrorHF(j,done,cls){const i=freeIdx(S.F);if(i<0)return;const b=blk(L.hs[j],cls);S.F[i]={b,here:false,mk:true,t0:0};S.mirN++;
  go(b,rev(rtFH(i,j)),L.sp.m,()=>{S.F[i].here=true;S.F[i].t0=S.ct;b.dot.style.opacity=1;S.mirN--;done&&done(i)})}
function read(from,k,done,cls){const s=from==='F'?L.fs[k]:L.hs[k];const b=blk(s,cls);
  go(b,rev(from==='F'?rtF(k):rtH(k)),from==='F'?L.sp.rf:L.sp.rh,()=>{kill(b,0.35);S.src=from;S.srcT=S.t;done&&done()})}
function purgeOldest(){let bi=-1,bt=1e9;S.F.forEach((v,i)=>{if(v&&v.here&&v.mk&&!v.busy&&v.t0<bt){bt=v.t0;bi=i}});
  if(bi<0)return false;kill(S.F[bi].b,0.6);S.F[bi]=null;return true}
function every(key,dt,fn,start){const TMR=S.tm;if(TMR[key]===undefined)TMR[key]=start||0;while(S.ct>=TMR[key]){TMR[key]+=dt;fn()}}

/* ---------- 每一步 ---------- */
const MODES=[
  /* 1 两个池，一个目录 */
  {P:0,setup(){[0,1,2].forEach(i=>putF(i));[0,1,2,3,4,5,6].forEach(j=>putH(j))}},
  /* 2 新写入先落闪存 */
  {P:9.5,setup(){putF(0)},tick(){if(S.ct<8.2)every('w',0.85,()=>{if(S.F.filter(Boolean).length<8)write('F')},0.3)}},
  /* 3 后台建副本 */
  {P:9.5,setup(){[0,1,2,3,4].forEach(i=>putF(i));[0,1,2].forEach(j=>putH(j))},
   tick(){if(S.ct<8)every('m',1.35,()=>{const i=S.F.findIndex(v=>v&&v.here&&!v.mk&&!v.busy);if(i>=0)mirrorFH(i)},0.6)}},
  /* 4 闪存满了就清理 */
  {P:13,setup(){[0,1,2,3,4].forEach((i,k)=>{const v=putF(i,true);v.t0=-5+k});[0,1,2,3,4,5,6,7].forEach(j=>putH(j))},
   tick(){
     if(S.ct<11.2)every('w',0.95,()=>write('F'),0.4);
     S.F.forEach((v,i)=>{if(v&&v.here&&!v.mk&&!v.busy&&S.ct-v.t0>2.4)mirrorFH(i)});
     const n=cnt(S.F);if(n>=HIGH*10)S.purge=true;if(n<=LOW*10)S.purge=false;
     if(S.purge)every('p',0.45,()=>{if(S.purge)purgeOldest()},S.ct);else delete S.tm.p}},
  /* 5 直接从硬盘读 */
  {P:0,setup(){[0,1,2,3].forEach(i=>putF(i,true));[0,1,2,3,4,5,6].forEach(j=>putH(j));putH(7,'v');S.hot=7},
   tick(){every('r',2.4,()=>read('H',S.hot,null,'v'),0.4)}},
  /* 6 反复读，回到闪存 */
  {P:15,setup(){[0,1,2,3].forEach(i=>putF(i,true));[0,1,2,3,4,5,6].forEach(j=>putH(j));putH(7,'v');S.hot=7;S.fi=-1},
   tick(){
     if(S.ct<13.6)every('r',1.7,()=>{if(S.fi>=0&&S.F[S.fi]&&S.F[S.fi].here)read('F',S.fi,null,'v');
       else read('H',S.hot,()=>{S.heat=Math.min(1,S.heat+0.3);
         if(S.heat>=HEATG&&!S.prom){S.prom=true;mirrorHF(S.hot,i=>{S.fi=i},'v')}},'v')},0.4)}},
  /* 7 快满时改去硬盘 */
  {P:10,setup(){[0,1,2,3,4,5,6,7,8].forEach(i=>putF(i,i<5));[0,1,2,3,4].forEach(j=>putH(j))},
   tick(){if(S.ct<8.6)every('w',0.9,()=>write('H'),0.4)}}
];

/* ---------- 仿真 ---------- */
function clear(){if(S)S.bl.forEach(b=>b.g.remove())}
function tick(dt){
  S.t+=dt;const M=MODES[step];
  if(M.P){const c=Math.floor(S.t/M.P);if(c!==S.cyc){if(S.cyc>=0){clear();const keepT=S.t;newSim();S.t=keepT;M.setup()}S.cyc=c}S.ct=S.t-c*M.P}
  else S.ct=S.t;
  M.tick&&M.tick(dt);
  for(const b of S.bl){
    if(b.mv){let d=b.mv.sp*dt;
      while(d>0&&b.mv){const tg=b.mv.pts[b.mv.i],dx=tg.x-b.x,dy=tg.y-b.y,ds=Math.hypot(dx,dy);
        if(ds<=d){b.x=tg.x;b.y=tg.y;d-=ds;b.mv.i++;if(b.mv.i>=b.mv.pts.length){const fn=b.mv.done;b.mv=null;fn&&fn()}}
        else{b.x+=dx/ds*d;b.y+=dy/ds*d;d=0}}
      if(b.a<1&&!b.fa)b.a=Math.min(1,b.a+dt/0.2)}
    if(b.fa){b.fa.t+=dt;b.a=Math.max(0,1-b.fa.t/b.fa.d);if(b.a<=0){b.g.remove();b.dead=true}}
  }
  S.bl=S.bl.filter(b=>!b.dead);
  const tg=cnt(S.F)/L.fs.length;S.gv+=(tg-S.gv)*(1-Math.exp(-dt/0.35));
  S.hv+=(S.heat-S.hv)*(1-Math.exp(-dt/0.3));
}
function render(){
  for(const b of S.bl){b.g.setAttribute('transform',`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)})`);b.g.style.opacity=b.a.toFixed(2)}
  const M=MODES[step];let fa=1;
  if(M.P){const ct=S.ct;fa=ct>M.P-0.4?Math.max(0,(M.P-ct)/0.4):(S.cyc>0&&ct<0.4?ct/0.4:1)}
  E.pk.style.opacity=fa;
  const g=L.gauge,v=Math.max(0,Math.min(1,S.gv));
  E.gf.setAttribute('width',(g.w*v).toFixed(1));E.gf.style.opacity=fa;E.gs.style.opacity=fa;
  E.gf.setAttribute('class','fill'+(v>=SPILL-0.02?' rose':v>0.45?' ochre':' sage'));
  E.gs.textContent=T(v>=0.78?'占用很高':v>0.45?'占用升高':'占用较低');
  E.gs.setAttribute('class','st '+(v>=0.78?'rose-t':v>0.45?'ochre-t':'ink3-t'));
  E.mir.setAttribute('class','ln base'+(S.mirN>0?' on':''));
  E.hf.setAttribute('width',(L.heat.w*Math.max(0,Math.min(1,S.hv))).toFixed(1));E.hf.style.opacity=fa;
  E.hs.textContent=T(S.hv>=HEATG-0.01?'过了门槛':'还没过门槛');E.hs.setAttribute('class','st '+(S.hv>=HEATG-0.01?'sage-t':'ink3-t'));E.hs.style.opacity=fa;
  const show=S.src&&S.t-S.srcT<1.6;
  E.src.textContent=T(S.src==='F'?'这份来自闪存':'这份来自硬盘');
  E.src.setAttribute('class','st '+(S.src==='F'?'sage-t':'ochre-t'));E.src.style.opacity=show?fa:0;
  E.lb.setAttribute('class','ln base'+(step===6?' dim':''));E.lb.style.opacity=step===6?0.25:1;
  E.rb.setAttribute('class','ln base'+(step===6?' oc':''));
}
function applyVis(){
  svg.setAttribute('data-step',step+1);
  svg.querySelectorAll('[data-show]').forEach(g=>g.classList.toggle('hid',!g.dataset.show.split(' ').includes(String(step+1))));
  E.mir.style.opacity=step===4?0.25:1;
}
const NSTEP=7;
let raf=0,last=0,paused=!!opts.paused,dead=false;
function loop(now){const dt=Math.max(0,Math.min(0.05,(now-last)/1000||0));last=now;tick(dt);render();raf=requestAnimationFrame(loop)}
function startLoop(){cancelAnimationFrame(raf);if(paused||dead||reduce)return;last=performance.now();raf=requestAnimationFrame(loop)}
function enter(i){
  step=i;cancelAnimationFrame(raf);clear();newSim();applyVis();MODES[i].setup();
  S.gv=cnt(S.F)/L.fs.length;
  if(reduce){const lim=[0.5,6,6.5,8,1.5,12,5][i];for(let t=0;t<lim;t+=1/60)tick(1/60);render();return}
  render();startLoop();
}
function setup(){L=layout(mq.matches);build();svg.setAttribute('aria-label',T('闪存池和硬盘池在同一个目录里：新写入先落闪存，后台建硬盘副本、清理闪存，冷文件变热后回到闪存'));if(opts.onLayout)opts.onLayout(L.W/L.H,L.m)}
function rebuild(){setup();enter(step)}
mq.addEventListener('change',rebuild);
const onLang=()=>rebuild();document.addEventListener('ss-lang',onLang);
setup();
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
window.SSAnim['d-hotpools']={steps:7,mount:mount};
})();
