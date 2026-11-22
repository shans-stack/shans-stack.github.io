/* 推理里的 KV Cache：动画模块（由 anim.html 改写，画面、配色、动效不变）。
   接口与 assets/anim/rdma.js 相同：
     var a = SSAnim['kv'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) / a.pause() / a.resume() / a.destroy() / a.ratio() / a.step()
   动画自己不带翻页控件，页面翻到哪一步就调 show(i)。宽度 640px 以下换成上下排布；
   系统开了「减少动态效果」时每步只画一帧静态结果。文字有中英两套（EN 表 + T()），跟着 ss-lang 事件重画。
   样式在 assets/anim/kv.css，类名都在 .an-kv 之内。 */
(function(){
var EN={"提示词": "Prompt", "输出": "Output", "计算": "Compute", "模型权重": "Model weights", "首字前要等多久": "Wait for first token", "开头不同：整段预填充": "Different start: full prefill", "开头相同：读缓存": "Same start: read the cache", "请求": "Prompt", "首字": "Token 1", "预填充": "Prefill", "已出首字": "Token 1 out", "示意，不代表实测数字": "Schematic, not measured", "4 个词": "4 tokens", "8 个词": "8 tokens", "12 个词": "12 tokens", "16 个词": "16 tokens", "预填充：整段读入": "Prefill: all at once", "解码：一个字一个字": "Decode: one by one", "解码：逐字生成": "Decode: one by one", "每个词一份 K、V": "One K, V per token", "只算新字，旧的读缓存": "Reuse old, compute new", "放不下，挤掉 A": "Full: evict A", "A 查不到，只能重算": "A missing: recompute", "又放不下，挤掉 B": "Full again: evict B", "A 只能重算": "A must recompute"};
var ARIA=["提示词进 GPU 计算，KV Cache 存进显存、被复用、被挤掉的过程", "A prompt, the GPU with its KV cache and model weights, and the output: how KV cache is built and reused"];
function lang(){return window.SS_LANG==='en'?'en':'zh'}
function T(s){return lang()==='en'&&typeof s==='string'&&EN[s]!==undefined?EN[s]:s}
function F(zh,en){return lang()==='en'?en:zh}
function mount(host,opts){
opts=opts||{};
/* ---------- 通用小引擎：SVG 构建、沿线移动、排队仿真、负载条平滑 ---------- */
const NS='http://www.w3.org/2000/svg';
host.classList.add('an-kv');host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','an-kv-scene');svg.setAttribute('role','img');host.appendChild(svg);
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


/* ---------- KV Cache：提示词 → GPU（计算、显存里的 KV Cache 区与模型权重）→ 输出 ---------- */
const SC={
layout(mobile){
  if(!mobile){
    const W=960,H=476;
    return {mobile,W,H,pw:24,ph:18,gap:26,dr:7,qmax:4,f:{ttl:22,lbl:20,st:18,sm:17,note:16,big:34,lane:22},
      P:{x:24,y:64,w:264,h:76},Pt:{x:24,y:44},tok:{x0:46,dx:30,rows:[84,120],lane:100,exit:[{x:288,y:100}]},
      O:{x:756,y:64,w:184,h:76},Ot:{x:756,y:44},out:{x0:778,dx:32,per:5,rows:[84,120],lane:100},
      gpu:{x:324,y:20,w:392,h:436},gt:{x:344,y:48},K:{x:440,y:64,w:176,h:72},kl:{x:456},phase:{x:540,y:172,a:'start'},
      kv:{x:344,y:236,w:352,h:128},kvl:{x:360,y:250},lane1:266,lane2:312,rows:[288,336],sx0:410,sdx:36,trunk:384,rl:358,kvNote:{x:520,y:250},
      wt:{x:344,y:380,w:352,h:56},
      toK:[{x:288,y:100},{x:440,y:100}],kToO:[{x:616,y:100},{x:756,y:100}],
      chart:{x:756,ty:188,rows:[226,266,306,346],bx:828,bw:112,bh:14},
      race:{lanes:[150,346],sep:248,lab:{x:32,dy:-58},src:{x:40,w:76,h:48},st:{x:400,w:96,h:48},stDy:-40,dst:{x:690,w:80,h:48},
        kvb:{w:110,h:40,dy:58},cnt:{x:870,ly:-16,ny:22},note:{x:32,y:458}}};
  }
  const W=480,H=560;
  return {mobile,W,H,pw:22,ph:16,gap:24,dr:6,qmax:3,f:{ttl:19,lbl:17,st:16,sm:16,note:16,big:26,lane:19},
    P:{x:16,y:44,w:300,h:76},Pt:{x:16,y:28},tok:{x0:36,dx:28,rows:[64,100],lane:82,exit:[{x:290,y:82},{x:290,y:120}]},
    O:{x:332,y:44,w:132,h:76},Ot:{x:332,y:28},out:{x0:350,dx:30,per:4,rows:[64,100],lane:82},
    gpu:{x:16,y:132,w:448,h:300},gt:{x:30,y:156},K:{x:200,y:150,w:180,h:60},kl:{x:214},phase:{x:190,y:192,a:'end'},
    kv:{x:28,y:236,w:424,h:128},kvl:{x:44,y:250},lane1:266,lane2:312,rows:[288,336],sx0:104,sdx:40,trunk:72,rl:52,kvNote:{x:300,y:250},
    wt:{x:28,y:376,w:424,h:44},
    toK:[{x:290,y:120},{x:290,y:150}],kToO:[{x:380,y:180},{x:398,y:180},{x:398,y:120}],
    chart:{x:16,ty:456,rows:[480,502,524,546],bx:90,bw:360,bh:10},
    race:{lanes:[150,380],sep:268,lab:{x:16,dy:-84},src:{x:16,w:56,h:40},st:{x:200,w:72,h:40},stDy:-36,dst:{x:398,w:60,h:40},
      kvb:{w:96,h:36,dy:44},cnt:{x:428,ly:44,ny:76},note:{x:16,y:516}}};
},
build(){
  const f=L.f,Kc=C(L.K);
  const main=grp('1 2 3 5 6');
  // 提示词与输出
  rect(L.P,'blk',main);E.Pt=tx(L.Pt.x,L.Pt.y,'提示词',f.lbl,'ttl','start',main);
  rect(L.O,'blk',main);tx(L.Ot.x,L.Ot.y,'输出',f.lbl,'ttl','start',main);
  // GPU
  rect(L.gpu,'frame',main,22);tx(L.gt.x,L.gt.y,'GPU',f.ttl,'ttl','start',main);
  wire(L.toK,'wire',main);wire(L.kToO,'wire',main);
  line({x:Kc.x,y:L.K.y+L.K.h},{x:Kc.x,y:L.kv.y},'wire',main);
  E.K=rect(L.K,'blk',main);tx(L.kl.x,Kc.y,'计算',f.lbl,'lbl','start',main);
  E.phase=tx(L.phase.x,L.phase.y,'',f.st,'st',L.phase.a,main);
  // KV Cache 区：两条横向小道 + 左侧竖道 + 两排格子
  const kg=grp(null,main,'1');E.kvG=kg;
  E.kv=rect(L.kv,'blk',kg);tx(L.kvl.x,L.kvl.y,'KV Cache',f.sm,'violet-t st','start',kg);
  const sx=c=>L.sx0+c*L.sdx,last=sx(7);
  const thin=(a,b)=>line(a,b,'thin',kg);
  thin({x:L.trunk,y:L.lane1},{x:last,y:L.lane1});thin({x:L.trunk,y:L.lane1},{x:L.trunk,y:L.lane2});thin({x:L.trunk,y:L.lane2},{x:last,y:L.lane2});
  for(let r=0;r<2;r++)for(let c=0;c<8;c++){thin({x:sx(c),y:r?L.lane2:L.lane1},{x:sx(c),y:L.rows[r]});
    el('rect',{x:sx(c)-L.pw/2-3,y:L.rows[r]-L.ph/2-3,width:L.pw+6,height:L.ph+6,rx:5,class:'ghost'},kg)}
  E.rowLab=[0,1].map(r=>tx(L.rl,L.rows[r],'',f.sm,'st violet-t','middle',kg));
  E.kvNote=tx(L.kvNote.x,L.kvNote.y,'',f.sm,'st rose-t',L.mobile?'start':'start',kg);
  rect(L.wt,'blk',main);tx(L.wt.x+L.wt.w/2,L.wt.y+L.wt.h/2,'模型权重',f.lbl,'ink2-t st','middle',main);
  // 第 5 步小图
  const ch=L.chart,cg=grp('5');tx(ch.x,ch.ty,'首字前要等多久',f.sm,'lbl','start',cg);
  E.chart=[4,8,12,16].map((n,i)=>{tx(ch.x,ch.rows[i],n+' 个词',f.note,'ink3-t','start',cg);
    return bar(ch.bx,ch.rows[i]-ch.bh/2,ch.bw,ch.bh,cg)});
  /* 第 4 步：两条线 */
  const R=L.race,race=grp('4');E.race={};
  [['M','开头不同：整段预填充'],['H','开头相同：读缓存']].forEach(([k,name],j)=>{
    const y=R.lanes[j],o={};E.race[k]=o;
    tx(R.lab.x,y+R.lab.dy,name,f.lane,'lbl','start',race).style.fontWeight=700;
    line({x:R.src.x+R.src.w,y},{x:R.dst.x,y},'ln '+(j?'rdma':'tcp'),race);
    rect({x:R.src.x,y:y-R.src.h/2,w:R.src.w,h:R.src.h},'ep',race,10);tx(R.src.x+R.src.w/2,y,'请求',f.sm,'lbl','middle',race);
    rect({x:R.dst.x,y:y-R.dst.h/2,w:R.dst.w,h:R.dst.h},'ep',race,10);tx(R.dst.x+R.dst.w/2,y,'首字',f.sm,'lbl','middle',race);
    o.stn=rect({x:R.st.x-R.st.w/2,y:y-R.st.h/2,w:R.st.w,h:R.st.h},'stn',race,10);
    tx(R.st.x,y+R.stDy,'预填充',f.sm,'ink2-t','middle',race);
    tx(R.cnt.x,y+R.cnt.ly,'已出首字',f.note,'ink3-t','middle',race);
    o.n=tx(R.cnt.x,y+R.cnt.ny,'0',f.big,'num '+(j?'sage-t':'rose-t'),'middle',race);
    o.route=[P(R.src.x+R.src.w+L.pw/2-2,y),P(R.st.x,y,k),P(R.dst.x+4,y)];o.y=y;
  });
  {const y=R.lanes[1],kb={x:R.st.x-R.kvb.w/2,y:y+R.kvb.dy,w:R.kvb.w,h:R.kvb.h};
   line({x:R.st.x,y:kb.y},{x:R.st.x,y:y+R.st.h/2},'ln wire',race);rect(kb,'blk kvon',race,10);
   tx(R.st.x,kb.y+kb.h/2,'KV Cache',f.note,'violet-t st','middle',race);
   E.race.kvPath=[{x:R.st.x,y:kb.y+kb.h/2},{x:R.st.x,y:kb.y},{x:R.st.x,y}];}
  line({x:L.mobile?16:32,y:R.sep},{x:L.W-(L.mobile?16:32),y:R.sep},'sep',race);
  tx(R.note.x,R.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',race);
  E.pk=el('g',{});
  // 路线
  const Kin={x:Kc.x,y:Kc.y};
  E.tokPt=i=>({x:L.tok.x0+(i%8)*L.tok.dx,y:L.tok.rows[i<8?0:1]});
  E.tokPath=i=>{const p=E.tokPt(i);return cat([p,{x:p.x,y:L.tok.lane}],L.tok.exit,L.toK,[Kin])};
  E.slot=(r,c)=>({x:sx(c),y:L.rows[r]});
  E.kvPath=(r,c)=>cat([Kin,{x:Kc.x,y:L.K.y+L.K.h},{x:Kc.x,y:L.kv.y},{x:Kc.x,y:L.lane1}],r?[{x:L.trunk,y:L.lane1},{x:L.trunk,y:L.lane2},{x:sx(c),y:L.lane2}]:[{x:sx(c),y:L.lane1}],[E.slot(r,c)]);
  E.outPt=k=>({x:L.out.x0+(k%L.out.per)*L.out.dx,y:L.out.rows[k<L.out.per?0:1]});
  E.outPath=k=>{const p=E.outPt(k);return cat([Kin],L.kToO,[{x:L.mobile?398:L.O.x,y:L.out.lane},{x:p.x,y:L.out.lane},p])};
},
reset(){E.K.setAttribute('class','blk');E.kv.setAttribute('class','blk');E.phase.textContent='';E.kvNote.textContent='';
  E.rowLab.forEach(t=>t.textContent='');E.Pt.textContent=T('提示词');E.chart.forEach(b=>setBar(b,0));
  ['M','H'].forEach(k=>{E.race[k].n.textContent='0'})},
vb(i){if(!L.mobile)return null;if(i===4)return null;if(i===3)return [0,9,480,560];return [0,-50,480,560]},
reduceAt:[5,4,6.2,7,14,10],
modes:[]
};
function phase(s,cls){E.phase.textContent=T(s);E.phase.setAttribute('class','st '+(cls||''))}
function kCls(c){E.K.setAttribute('class','blk'+(c?' '+c:''))}
const cyc=(t,T)=>t>T-0.6?Math.max(0,(T-t)/0.5):t<0.3?t/0.3:1;
/* 提示词的 n 个词块，沿线进计算框；到达后淡出（被读进去了） */
function tokens(n,t0,v){return [...Array(n)].map((_,i)=>{const p=pk();return {p,i,t0:t0+(n-1-i)*0.05,path:E.tokPath(i)}})}
function runTok(list,t,dur,from){list.forEach(o=>{const u=t-o.t0;o.p.a=(from!=null&&t<from)?0:u<dur?1:1-fade(u,dur,dur+0.25);if(t<o.t0)put(o.p,o.path[0]);else mv(o.p,o.path,t,o.t0,o.t0+dur)})}
/* 1：预填充 + 解码 */
SC.modes[0]={enter(){const v=S.v;v.tk=tokens(8,0.3);v.out=[...Array(5)].map((_,k)=>({p:pk('out'),k,t0:2.5+k*0.9,path:E.outPath(k)}))},
  pre(){const T=8,t=S.t%T,v=S.v;E.pk.style.opacity=cyc(t,T);runTok(v.tk,t,1.0);
    v.out.forEach(o=>{o.p.a=t<o.t0?0:1;mv(o.p,o.path,t,o.t0,o.t0+0.8)});
    const pre=t>0.3&&t<2.2,dec=t>=2.4&&t<7.4;kCls(pre?'ask':dec?'ok':'');
    phase(pre?(L.mobile?'预填充：整段读入':'预填充：整段读入'):dec?(L.mobile?'解码：逐字生成':'解码：一个字一个字'):'',pre?'slate-t':'sage-t')}};
/* 2：每个词一份 K、V */
SC.modes[1]={enter(){const v=S.v;v.tk=tokens(8,0.3);v.kv=v.tk.map(o=>({p:pk('kv'),c:o.i,t0:o.t0+1.0,path:E.kvPath(0,o.i)}));E.kv.setAttribute('class','blk kvon')},
  pre(){const T=8,t=S.t%T,v=S.v;E.pk.style.opacity=cyc(t,T);runTok(v.tk,t,1.0);
    v.kv.forEach(o=>{o.p.a=t<o.t0?0:1;mv(o.p,o.path,t,o.t0,o.t0+1.1)});
    const pre=t>0.3&&t<2.6;kCls(pre?'ask':'');phase(pre||t<7.4?'每个词一份 K、V':'', 'violet-t')}};
/* 3：只算新字，旧的读缓存 */
SC.modes[2]={enter(){const v=S.v;E.kv.setAttribute('class','blk kvon');
    v.base=[...Array(8)].map((_,c)=>{const p=pk('kv');put(p,E.slot(0,c));p.a=1;return p});
    v.steps=[0,1,2,3].map(k=>{const t0=0.4+k*2.2,n=8+k;
      return {t0,reads:[...Array(n)].map((_,j)=>({p:pk('kv'),t0:t0+j*0.03,path:rev(E.kvPath(j<8?0:1,j%8))})),
        out:{p:pk('out'),t0:t0+1.1,path:E.outPath(k)},nk:{p:pk('kv'),t0:t0+1.1,path:E.kvPath(1,k)}}})},
  pre(){const T=9.8,t=S.t%T,v=S.v;E.pk.style.opacity=cyc(t,T);
    v.steps.forEach(s=>{s.reads.forEach(o=>{const u=t-o.t0;o.p.a=u<0?0:u<0.9?1:1-fade(u,0.9,1.1);mv(o.p,o.path,t,o.t0,o.t0+0.9)});
      [s.out,s.nk].forEach(o=>{o.p.a=t<o.t0?0:1;mv(o.p,o.path,t,o.t0,o.t0+0.9)})});
    const busy=v.steps.some(s=>t>s.t0&&t<s.t0+1.2);kCls(busy?'ask':'');phase('只算新字，旧的读缓存','violet-t')}};
/* 4：开头相同就复用 */
SC.modes[3]={enter(){station('M',E.race.M.route,1.4,L.mobile?4:5,null,Math.max(0,L.race.st.w/2+L.pw/2+4-L.gap));station('H',E.race.H.route,0.45,L.mobile?4:5,null,Math.max(0,L.race.st.w/2+L.pw/2+4-L.gap));S.v.cyc=-1;S.v.kvs=[]},
  pre(dt){const v=S.v,T=10,c=Math.floor(S.t/T),t=S.t-c*T;
    if(c!==v.cyc){if(v.cyc>=0){S.pk.forEach(kill);S.pk=[];['M','H'].forEach(k=>{S.st[k].cur=null;S.st[k].q=[]})}v.cyc=c;S.cnt={M:0,H:0};v.spawnT=0;v.kvs=[];v.seen=new Set()}
    if(t<8.4){v.spawnT-=dt;if(v.spawnT<=0){v.spawnT+=0.8;['M','H'].forEach(k=>{if(canSpawn(E.race[k].route))flow(E.race[k].route,380,'',0.05)})}}
    const cur=S.st.H.cur;if(cur&&!v.seen.has(cur)){v.seen.add(cur);const p=pk('kv');v.kvs.push({p,t0:t})}
    v.kvs=v.kvs.filter(o=>{const u=t-o.t0;o.p.a=u<0.35?1:1-fade(u,0.35,0.45);mv(o.p,E.race.kvPath,u,0,0.35);if(u>0.45){kill(o.p);return false}return true});
    v.f=t>9.6?Math.max(0,(10-t)/0.4):t<0.4?t/0.4:1},
  arrive(p){S.cnt[p.pts===E.race.M.route?'M':'H']++},
  render(){const v=S.v;E.pk.style.opacity=v.f;['M','H'].forEach(k=>{const o=E.race[k];o.n.textContent=S.cnt[k]||0;o.n.style.opacity=v.f;o.stn.classList.toggle('on',k==='M'&&!!S.st.M.cur)})}};
/* 5：越长越大、越久 */
SC.modes[4]={enter(){const v=S.v;v.r=-1;v.t0=0;v.items=[];v.done=[];E.kv.setAttribute('class','blk kvon')},
  pre(){const v=S.v,N=[4,8,12,16];
    const dur=n=>0.25+n*n*0.0105,len=n=>0.3+0.95+dur(n)+0.8+0.7;
    let t=S.t,acc=0,r=0;const total=N.reduce((a,n)=>a+len(n),0)+1.6;t=t%total;
    while(r<4&&t>=acc+len(N[r])){acc+=len(N[r]);r++}
    E.pk.style.opacity=cyc(t,total);
    if(r>=4){for(let i=0;i<4;i++)setBar(E.chart[i],N[i]*N[i]/256);v.items.forEach(o=>o.p.a=0);phase('','');kCls('');return}
    const n=N[r],u=t-acc;
    if(r!==v.r){v.items.forEach(o=>kill(o.p));v.items=[];v.r=r;
      const tk=tokens(n,0.3);tk.forEach(o=>v.items.push(Object.assign(o,{kind:'tok'})));
      tk.forEach(o=>v.items.push({kind:'kv',p:pk('kv'),t0:o.t0+0.95,path:E.kvPath(o.i<8?0:1,o.i%8)}));
      v.items.push({kind:'out',p:pk('out'),t0:0.3+0.95+dur(n),path:E.outPath(0)})}
    v.items.forEach(o=>{if(o.kind==='tok'){const w=u-o.t0;o.p.a=w<0.95?1:1-fade(w,0.95,1.2);mv(o.p,o.path,u,o.t0,o.t0+0.95)}
      else{o.p.a=u<o.t0?0:1;mv(o.p,o.path,u,o.t0,o.t0+(o.kind==='kv'?0.9:0.8))}});
    const busy=u>0.3+0.5&&u<0.3+0.95+dur(n);kCls(busy?'ask':'');phase(busy?F(L.mobile?n+' 个词，预填充中':n+' 个词：预填充中',n+' tokens: prefilling'):'',busy?'slate-t':'');
    for(let i=0;i<4;i++){const doneAt=0.3+0.95+dur(N[i]);setBar(E.chart[i],i<r?N[i]*N[i]/256:i===r&&u>doneAt?N[i]*N[i]/256*fade(u,doneAt,doneAt+0.4):0)}}};
/* 6：显存放不下，最早的被挤掉，回来重算 */
SC.modes[5]={enter(){const v=S.v;E.kv.setAttribute('class','blk kvon');
    const req=(name,t0,row)=>{const tk=tokens(8,t0);return {name,t0,row,tk,kv:tk.map(o=>({p:pk('kv'),t0:o.t0+0.95,path:E.kvPath(row,o.i)}))}};
    v.R=[req('A',0.3,0),req('B',2.7,1),req('C',5.1,0),req('A',8.0,1)]},
  pre(){const T=11.6,t=S.t%T,v=S.v;E.pk.style.opacity=cyc(t,T);E.kvNote.style.opacity=cyc(t,T);
    const cur=[...v.R].reverse().find(r=>t>=r.t0-0.2)||v.R[0];E.Pt.textContent=F('提示词 '+cur.name,'Prompt '+cur.name);
    v.R.forEach((r,ri)=>{runTok(r.tk,t,0.95,r.t0-0.25);
      const evictAt=ri===0?5.7:ri===1?8.9:99;
      r.kv.forEach(o=>{o.p.a=t<o.t0?0:1-fade(t,evictAt,evictAt+0.5);mv(o.p,o.path,t,o.t0,o.t0+0.9)})});
    E.rowLab[0].textContent=t>6.0?'C':t>1.2?'A':'';E.rowLab[1].textContent=t>9.2?'A':t>3.6?'B':'';
    const ev1=t>5.4&&t<7.4,ev2=t>8.6&&t<10.6;
    const re=t>7.9&&t<8.6;kCls(t>7.9&&t<10.2?'on':(t>0.3&&t<2.4)||(t>2.7&&t<4.8)||(t>5.1&&t<7.2)?'ask':'');
    phase(ev1?'放不下，挤掉 A':re?'A 查不到，只能重算':ev2?'又放不下，挤掉 B':t>7.9&&t<10.2?'A 只能重算':'',ev1||ev2||t>7.9&&t<10.2?'rose-t':'')}};

mq.addEventListener('change',rebuild);
const onLang=()=>rebuild();document.addEventListener('ss-lang',onLang);
build();newSim();
const N=SC.modes.length;
const ctrl={
  show(i){enter(Math.max(0,Math.min(N-1,i)))},
  pause(){paused=true;cancelAnimationFrame(raf)},
  resume(){if(!paused)return;paused=false;run()},
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('an-kv')},
  ratio(){return L.W/L.H},
  step(){return step},
  sim(){return {step,t:S.t,lv:S.lv,cnt:S.cnt,n:S.pk.length,q:Object.fromEntries(Object.entries(S.st).map(([k,s])=>[k,s.q.length+(s.cur?1:0)]))}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['kv']={steps:6,mount:mount};
})();
