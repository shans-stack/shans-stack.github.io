/* 宽条带与本地可解码纠删码，六步 SVG 动画。 */
(function(){
const EN={"编码": "Encode", "数据块": "Data Blocks", "校验块": "Parity Blocks", "共享无：服务器失效": "Shared-Nothing: Server Failure", "Classic：单块 SSD 失效": "Classic: Single SSD Failure", "服务器": "Server", "跨盘故障范围": "Multiple Drives Affected", "单盘故障范围": "One Drive Affected", "示意，不代表实测数字": "Schematic, no measured figures", "校验占比": "Parity", "宽条带与本地可解码纠删码": "Locally decodable codes: rebuilding a failed drive reads only a small part of the surviving data", "Reed–Solomon": "Reed–Solomon", "失效盘": "Failed drive", "条带 ": "Stripe ", "目标盘 ": "Target drive ", "CNode 重建": "CNode rebuild", "重建": "Rebuild", "已读 ": "Read ", " 份": " pieces", "本地可解码": "Locally decodable", "补回 ✓": "Rebuilt ✓", "约 2.7%": "~2.7%", "读取量很高": "Reads: very high", "读取量升高": "Reads: rising", "读取量较低": "Reads: low"};
function lang(){return window.SS_LANG==='en'?'en':'zh'}
function T(s){return lang()==='en'&&EN[s]!==undefined?EN[s]:s}
function mount(host,opts){
opts=opts||{};
/* ---------- 通用小引擎：每一步的画面都是「本轮时间 t」的函数 ---------- */
const NS='http://www.w3.org/2000/svg';
host.classList.add('v-wec');host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','v-wec-scene');svg.setAttribute('role','img');host.appendChild(svg);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mq=matchMedia('(max-width: 640px)');
let L,E={},step=0,T0=0,raf=0,paused=!!opts.paused,pausedAt=0,dead=false,SCENE;
function el(tag,a,p){const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);(p||svg).appendChild(e);return e}
function tx(x,y,s,size,cls,anchor,p){if(L&&L.mobile)size=Math.max(size,17);/* 手机版画布在 400 宽页面里约缩到 0.74 倍，最小 17 才能 ≥12px */const t=el('text',{x,y,'font-size':size,class:cls||''},p);if(anchor)t.setAttribute('text-anchor',anchor);t.textContent=T(s);return t}
function grp(show,p,extra){const g=el('g',Object.assign({class:'vis'},extra||{}),p);if(show)g.dataset.show=show;return g}
function rect(r,cls,p,rx){return el('rect',{x:r.x,y:r.y,width:r.w,height:r.h,rx:rx==null?10:rx,class:cls},p)}
function line(pts,cls,p){return el('path',{d:'M'+pts.map(q=>q.x.toFixed(1)+' '+q.y.toFixed(1)).join(' L'),class:'ln '+cls},p)}
const C=r=>({x:r.x+r.w/2,y:r.y+r.h/2});
const P=(x,y)=>({x,y});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sm=u=>u<=0?0:u>=1?1:u*u*(3-2*u);
const ramp=(t,t0,t1)=>clamp((t-t0)/(t1-t0),0,1);
function plen(pts){let s=0;for(let i=1;i<pts.length;i++)s+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);return s}
function along(pts,u){u=clamp(u,0,1);let d=u*plen(pts);for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],l=Math.hypot(b.x-a.x,b.y-a.y);if(d<=l||i===pts.length-1){const k=l?Math.min(1,d/l):0;return {x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k}}d-=l}return pts[pts.length-1]}
const rev=pts=>pts.slice().reverse();
/* 数据块：pk(cls) 生成一个块；put(p,x,y,a) 放到某处 */
function pk(cls,w,h){w=w||L.pw;h=h||L.ph;const r=el('rect',{x:-w/2,y:-h/2,width:w,height:h,rx:3,class:'pkt '+(cls||'')},E.pk);r.style.opacity=0;return r}
function put(p,q,a){p.setAttribute('transform','translate('+q.x.toFixed(1)+' '+q.y.toFixed(1)+')');p.style.opacity=a==null?1:a}
/* 一个块沿 pts 从 t0 出发，速度 v（单位/秒）；返回到达时刻 */
function travel(p,pts,t,t0,v,opt){opt=opt||{};const dur=plen(pts)/v,u=(t-t0)/dur;
  if(u<0){put(p,pts[0],opt.pre==null?0:opt.pre);return t0+dur}
  const fin=opt.fadeIn?ramp(t,t0,t0+0.12):1;
  if(u<=1){put(p,along(pts,u),fin);return t0+dur}
  put(p,pts[pts.length-1],opt.post==null?1:opt.post);return t0+dur}
const loopFade=(t,per)=>t>per-0.4?clamp((per-t)/0.4,0,1):t<0.35?clamp(t/0.35,0,1):1;
const H={el,tx,grp,rect,line,C,P,clamp,sm,ramp,plen,along,rev,pk,put,travel,loopFade};
/* 本地可解码纠删码：一条宽条带画成四组盘格，盘下横线 → 汇集线 → 重建框 */

function makeScene(){
const SCENE={
layout(mobile){
  if(!mobile){
    const big={x0:40,cw:22,ch:22,colP:26,rowP:30,bandP:70,y0:62,lo:12,px:560,collX:600,
      box:{x:510,y:342,w:180,h:50},cb:{x:600,y:342},be:{x:600,y:342},boxT:T('CNode 重建'),
      cnt:{x:495,y:367,a:'end'},meter:{x:712,y:360,w:170,sy:384},lab:{x:620}};
    const lane=(lx)=>{const x0=lx+14,px=x0+337,collX=x0+362;return {x0,cw:14,ch:14,colP:17,rowP:21,bandP:52,y0:96,lo:8.5,px,collX,
      box:{x:collX-70,y:310,w:140,h:46},cb:{x:collX,y:310},be:{x:collX,y:310},boxT:T('CNode 重建'),
      cnt:{x:collX-82,y:333,a:'end'},title:{x:x0,y:56},done:{x:collX,y:382}}};
    return {mobile,W:960,H:476,pw:14,ph:12,spw:10,sph:9,f:{lbl:18,sm:16,big:22,note:16,box:19,hd:34},big,
      lanes:[lane(20),lane(490)],sep:{x1:480,y1:40,x2:480,y2:420},
      bars:{tx:480,ty:70,lx:180,bx:180,bw:560,bh:40,vx:760,va:'start',rows:[{ly:140,y:180},{ly:250,y:290}]},
      note:{x:32,y:456},btn:{x:480,y:392},legend:{x:32,y:420}};
  }
  const big={x0:16,cw:16,ch:20,colP:20,rowP:30,bandP:74,y0:66,lo:11,px:410,collX:446,
    box:{x:286,y:372,w:150,h:46},cb:{x:446,y:395},be:{x:436,y:395},boxT:T('CNode 重建'),
    cnt:{x:276,y:395,a:'end'},meter:{x:286,y:434,w:150,sy:458},lab:null};
  const lane=(off)=>({x0:16,cw:12,ch:12,colP:15,rowP:18,bandP:44,y0:off+55,lo:7.5,px:313,collX:338,
    box:{x:350,y:off+218,w:118,h:44},cb:{x:338,y:off+240},be:{x:350,y:off+240},boxT:T('重建'),
    cnt:{x:16,y:off+240,a:'start'},title:{x:16,y:off+29},done:{x:409,y:off+276}});
  return {mobile,W:480,H:610,pw:12,ph:10,spw:9,sph:8,f:{lbl:17,sm:16,big:20,note:16,box:17,hd:30},big,
    lanes:[lane(0),lane(292)],sep:{x1:16,y1:300,x2:464,y2:300},
    bars:{tx:240,ty:70,lx:16,bx:16,bw:448,bh:40,vx:464,va:'end',rows:[{ly:150,y:190},{ly:270,y:310}]},
    note:{x:16,y:593},btn:{x:240,y:420},legend:{x:16,y:520}};
},
SIZES:[37,37,36,36],BAD:{band:3,i:20},
grid(G,g,small){
  const {el,tx,rect,line,P}=H,out={cells:[],par:[],G};
  const cy=(k,r)=>G.y0+k*G.bandP+r*G.rowP, cxx=c=>G.x0+G.cw/2+c*G.colP;
  // 盘下横线与汇集线（先画线，盘格压在上面）
  const lys=[];
  for(let k=0;k<4;k++)for(let r=0;r<2;r++){const ly=cy(k,r)+G.lo;lys.push(ly);line([P(cxx(0),ly),P(G.collX,ly)],'base thin',g)}
  line([P(G.collX,lys[0]),P(G.collX,G.cb.y)],'base',g);
  if(G.be.x!==G.cb.x)line([P(G.cb.x,G.cb.y),P(G.be.x,G.be.y)],'base',g);
  out.ext=[];
  this.SIZES.forEach((n,k)=>{for(let i=0;i<n;i++){const r=Math.floor(i/19),c=i%19,x=cxx(c),y=cy(k,r);
    const R=rect({x:x-G.cw/2,y:y-G.ch/2,w:G.cw,h:G.ch},'cell',g,3);
    out.cells.push({x,y,ly:y+G.lo,k,i,R,bad:k===this.BAD.band&&i===this.BAD.i});}});
  for(let k=0;k<4;k++){const y=cy(k,0),R=rect({x:G.px-G.cw/2,y:y-G.ch/2,w:G.cw,h:G.ch},'cell p',g,3);
    out.par.push({x:G.px,y,ly:y+G.lo,k,R,p:1});
    out.ext.push(line([P(cxx(18)+G.cw/2,y+G.lo),P(G.px,y+G.lo)],'ochreL',g));out.ext[k].style.opacity=0;}
  // 坏盘
  const b=out.cells.find(c=>c.bad);b.R.setAttribute('class','cell bad');out.bad=b;
  const w=G.cw*0.36;out.x=el('g',{},g);line([P(b.x-w,b.y-w),P(b.x+w,b.y+w)],'xmark',out.x);line([P(b.x-w,b.y+w),P(b.x+w,b.y-w)],'xmark',out.x);
  // 重建框
  out.box=rect(G.box,'blk',g,10);
  out.boxT=tx(G.box.x+G.box.w/2-(small?0:14),G.box.y+G.box.h/2,G.boxT,small?L.f.sm:L.f.box,'lbl b7','middle',g);
  if(!small){const gx=G.box.x+G.box.w-24,gy=G.box.y+G.box.h/2;out.ghost=rect({x:gx-L.pw/2-1,y:gy-L.ph/2-1,w:L.pw+2,h:L.ph+2},'ghost',g,3);}
  out.path=c=>[P(c.x,c.y),P(c.x,c.ly),P(G.collX,c.ly),P(G.cb.x,G.cb.y),P(G.be.x,G.be.y)];
  out.all=out.cells.concat(out.par);
  return out;
},
intro(stripe, domains, fractions){
  const {el,tx,rect,line,P}=H, m=L.mobile, mid=L.W/2;
  const source={x:mid-69,y:35,w:138,h:46};
  rect(source,'blk',stripe);
  tx(mid,58,'编码',22,'lbl b7','middle',stripe);
  const rowY=m?240:220, gap=m?61:88, bus=m?143:132;
  const xs=Array.from({length:6},(_,i)=>mid+(i-2.5)*gap);
  line([P(xs[0],bus),P(xs[5],bus)],'base',stripe);
  line([P(mid,81),P(mid,bus)],'base',stripe);
  E.stripe=xs.map((x,i)=>{
    line([P(x,bus),P(x,rowY)],'base',stripe);
    rect({x:x-20,y:rowY-16,w:40,h:32},'ghost',stripe,5);
    return {par:i>=4, path:[P(mid,81),P(mid,bus),P(x,bus),P(x,rowY)]};
  });
  tx((xs[0]+xs[3])/2,rowY+55,'数据块',20,'slate-t','middle',stripe);
  tx((xs[4]+xs[5])/2,rowY+55,'校验块',20,'ochre-t','middle',stripe);

  E.domains=[false,true].map((classic,i)=>{
    const x=m?mid:mid+(i-.5)*450,y=m?134+i*245:230;
    tx(x,y-94,classic?'Classic：单块 SSD 失效':'共享无：服务器失效',22,'lbl b7','middle',domains);
    const frame=rect({x:x-157,y:y-60,w:314,h:120},'frame',domains);
    tx(x,y-36,classic?'DBox':'服务器',19,'lbl','middle',domains);
    const drives=Array.from({length:4},(_,j)=>rect({x:x-108+j*61,y:y-12,w:34,h:47},'drive',domains,5));
    const status=tx(x,y+88,classic?'单盘故障范围':'跨盘故障范围',18,'rose-t','middle',domains);
    return {classic,frame,drives,status};
  });

  const left=m?36:190, width=m?408:550;
  rect({x:left,y:41,w:22,h:15},'pkt',fractions,3);
  tx(left+32,49,'数据块',19,'lbl','start',fractions);
  rect({x:left+158,y:41,w:22,h:15},'pkt par',fractions,3);
  tx(left+190,49,'校验块',19,'lbl','start',fractions);
  E.fractions=[[8,2,'20%'],[14,2,'12.5%'],[146,4,'约 2.7%']].map(([data,parity,value],i)=>{
    const y=(m?149:139)+i*(m?135:110);
    tx(left,y,data+'+'+parity,22,'lbl b7','start',fractions);
    tx(left+width,y,T('校验占比')+' '+T(value),20,'ochre-t b7','end',fractions);
    rect({x:left,y:y+19,w:width,h:32},'track',fractions,5);
    const d=rect({x:left,y:y+19,w:0,h:32},'fill slate',fractions,4);
    const p=rect({x:left+width*data/(data+parity),y:y+19,w:0,h:32},'fill ochre',fractions,4);
    return {d,p,width,split:width*data/(data+parity)};
  });
},
counter(c,g,size){const {el,tx}=H;const t=tx(c.x,c.y,'',size,'ink2-t',c.a,g);t.appendChild(document.createTextNode(T('已读 ')));
  const n=el('tspan',{class:'num rose-t'},t);n.textContent='0';t.appendChild(document.createTextNode(T(' 份')));return {t,n}},
build(){
  const {el,tx,grp,rect,line,P}=H,f=L.f,G=L.big;
  this.intro(grp('1'), grp('2'), grp('3'));
  const solo=grp('4');
  E.g=this.grid(G,solo,false);
  E.c2=this.counter(G.cnt,solo,L.mobile?18:20);
  const meter=G.meter;
  el('rect',{x:meter.x,y:meter.y-7,width:meter.w,height:14,rx:4,class:'track'},solo);
  E.mf=el('rect',{x:meter.x,y:meter.y-7,width:0,height:14,rx:4,class:'fill'},solo);
  E.ms=tx(meter.x,meter.sy,'',f.sm,'st ink3-t','start',solo);
  const g6=grp('6'), m=L.mobile;
  const x0=m?20:120, engine=m?193:446, dst=m?345:728;
  tx(x0,m?73:89,'失效盘',f.lbl,'rose-t b7','start',g6);
  rect({x:engine-12,y:m?106:118,w:m?115:148,h:244},'blk',g6,8);
  tx(engine+(m?45:62),m?92:98,'CNode 重建',f.lbl,'lbl b7','middle',g6);
  E.targets=[0,1,2].map(i=>{
   const y=(m?147:161)+i*79;
   rect({x:x0,y:y-22,w:m?123:180,h:44},'cell bad',g6,5);
   tx(x0+(m?61:90),y,T('条带 ')+String.fromCharCode(65+i)+' ×',f.lbl,'rose-t','middle',g6);
   const r=rect({x:dst,y:y-22,w:m?112:155,h:44},'ghost',g6,6);
   tx(dst+(m?56:77),y-39,T('目标盘 ')+(i+1),f.lbl,'lbl','middle',g6);
   const p=[P(engine+(m?103:136),y),P(dst+(m?56:77),y)];
   line(p,'base',g6);return {r,p};
  });
  /* 第 5 步：两条重建同时跑 */
  const g5=grp('5');E.ln=L.lanes.map((G2,j)=>{const o=this.grid(G2,g5,true);
    tx(G2.title.x,G2.title.y,j?T('本地可解码'):T('Reed–Solomon'),f.big,'lbl b7','start',g5);
    o.c=this.counter(G2.cnt,g5,L.mobile?16:18);
    o.done=tx(G2.done.x,G2.done.y,T('补回 ✓'),f.lbl,'st sage-t','middle',g5);return o});
  line([P(L.sep.x1,L.sep.y1),P(L.sep.x2,L.sep.y2)],'sep',g5);
  tx(L.note.x,L.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',grp('1 2 3 4 5 6'));
},
reset(o){o.all.forEach(c=>{c.R.setAttribute('class',c.bad?'cell bad':(c.p?'cell p':'cell'))});o.ext&&o.ext.forEach(l=>l.style.opacity=0)},
modes:[
 {period:6,freeze:4,enter(){
   E.stripe.forEach(o=>o.block=H.pk(o.par?'par':''));
  },draw(t){
   E.stripe.forEach((o,i)=>H.travel(o.block,o.path,t,0.45+i*0.45,310,{fadeIn:1}));
  }},
 {freeze:3,draw(t){
   const a=H.ramp(t,0.6,1.8);
   for(const {classic,frame,drives,status} of E.domains){
     frame.classList.toggle('bad',!classic&&a>0.5);
     drives.forEach((d,i)=>d.classList.toggle('bad',a>0.5&&(!classic||i===2)));
     status.style.opacity=a;
   }
  }},
 {freeze:4,draw(t){
   E.fractions.forEach(({d,p,width,split},i)=>{
     const w=width*H.sm(H.ramp(t,0.3+i*0.7,1.05+i*0.7));
     d.setAttribute('width',Math.min(w,split));
     p.setAttribute('width',Math.max(0,w-split));
   });
  }},
 /* Reed–Solomon：145 个数据块和一个校验块。 */
 {period:11,freeze:9.9,enter(){SCENE.reset(E.g);E.g.x.style.opacity=1;E.g.ghost.style.opacity=1;
   const src=E.g.cells.filter(c=>!c.bad).concat([E.g.par[0]]);
   E.cp=src.map((c,j)=>({p:H.pk((c.p?'par':'')+' cp'),c,t0:0.5+j*0.045}))},
  draw(t){let n=0,lv=0;E.cp.forEach(o=>{const arr=H.travel(o.p,E.g.path(o.c),t,o.t0,620,{post:0});
     if(t>=arr){n++;o.p.style.opacity=1-H.ramp(t,arr,arr+0.2)}lv+=H.ramp(t,arr,arr+0.5)});
   lv/=E.cp.length;E.c2.n.textContent=n;E.mf.setAttribute('width',(L.big.meter.w*Math.max(lv,0.02)).toFixed(1));
   E.ms.textContent=lv>0.66?T('读取量很高'):lv>0.3?T('读取量升高'):T('读取量较低');E.ms.setAttribute('class','st '+(lv>0.3?'rose-t':'ink3-t'));
   const fd=H.loopFade(t,11);[E.c2.t,E.mf,E.ms].forEach(e=>e.style.opacity=fd)}},
 /* 5：两条重建同时跑 */
 {period:10.5,freeze:9.8,enter(){E.ln.forEach(o=>SCENE.reset(o));
   const [A,Bq]=E.ln;
   const sA=A.cells.filter(c=>!c.bad).concat([A.par[0]]);
   const sB=Bq.cells.filter(c=>!c.bad&&c.k===SCENE.BAD.band).concat(Bq.par.slice(0,3));
   for(const [sources, cls] of [[sA,'read-rs'],[sB,'read-local']]){
     for(const cell of sources) cell.R.classList.add(cls);
   }
   E.rc=[sA,sB].map((src,j)=>src.map((c,i)=>({p:H.pk((c.p?'par':'')+' cp',L.spw,L.sph),c,t0:0.4+i*0.05,o:E.ln[j]})))},
  draw(t){E.rc.forEach((arr,j)=>{let n=0,last=0;arr.forEach(q=>{const a=H.travel(q.p,q.o.path(q.c),t,q.t0,520,{post:0});last=Math.max(last,a);
      if(t>=a){n++;q.p.style.opacity=1-H.ramp(t,a,a+0.2)}});
     const o=E.ln[j],done=t>=last;o.c.n.textContent=n;o.c.n.setAttribute('class','num '+(j?'sage-t':'rose-t'));
     o.box.setAttribute('class',done?'blk ok':'blk');const fd=H.loopFade(t,10.5);o.done.style.opacity=done?fd:0;o.c.t.style.opacity=fd})}},
 /* 6：补回的份分散写到许多盘 */
 {period:8,enter(){E.rb=E.targets.map(()=>H.pk('sage'))},
  draw(t){E.targets.forEach((o,i)=>{
    const a=H.travel(E.rb[i],o.p,t,1+i*1.1,85,{fadeIn:1,post:1});
    o.r.setAttribute('class',t>=a?'ghost ok':'ghost');
  })}}
]};

return SCENE}
/* ---------- 驱动 ---------- */
function applyVis(){
  svg.setAttribute('data-step',step+1);
  svg.querySelectorAll('[data-show]').forEach(g=>g.classList.toggle('hid',!g.dataset.show.split(' ').includes(String(step+1))));
  svg.querySelectorAll('[data-dim]').forEach(g=>g.classList.toggle('dim',g.dataset.dim.split(' ').includes(String(step+1))));
}
function frame(now){const M=SCENE.modes[step],t=Math.max(0,(now-T0)/1000),per=M.period||1e9;const tc=per<1e8?t%per:t;
  E.pk.style.opacity=M.period&&!M.noFade?loopFade(tc,per):1;M.draw&&M.draw(tc,t);raf=requestAnimationFrame(frame)}
function still(){const M=SCENE.modes[step],tt=M.freeze!=null?M.freeze:(M.period||4)*0.7;E.pk.style.opacity=1;M.draw&&M.draw(tt,tt)}
function enter(i){
  step=i;cancelAnimationFrame(raf);E.pk.innerHTML='';
  applyVis();const M=SCENE.modes[i];M.enter&&M.enter();
  T0=performance.now();pausedAt=T0;
  if(reduce||paused||dead){still();return}
  raf=requestAnimationFrame(frame);
}
function rebuild(){cancelAnimationFrame(raf);SCENE=makeScene();L=SCENE.layout(mq.matches);svg.innerHTML='';E={};svg.setAttribute('viewBox','0 0 '+L.W+' '+L.H);
  svg.setAttribute('aria-label',T("宽条带与本地可解码纠删码"));SCENE.build();E.pk=el('g',{});
  if(opts.onLayout)opts.onLayout(L.W/L.H,L.mobile);enter(step)}
mq.addEventListener('change',rebuild);
const onLang=()=>rebuild();document.addEventListener('ss-lang',onLang);
rebuild();
const ctrl={
  show(i){enter(Math.max(0,Math.min(SCENE.modes.length-1,i)))},
  pause(){if(paused)return;paused=true;pausedAt=performance.now();cancelAnimationFrame(raf)},
  resume(){if(!paused)return;paused=false;if(reduce||dead)return;T0+=performance.now()-pausedAt;cancelAnimationFrame(raf);raf=requestAnimationFrame(frame)},
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('v-wec')},
  ratio(){return L.W/L.H},
  step(){return step},

};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['v-wec']={steps:6,mount:mount};
})();
