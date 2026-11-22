/* 条带化：一个文件怎么分到多台服务器上。六步动画（SVG 加时间线，不依赖动画库）。
   接口与 assets/anim/rdma.js 相同：
     var a = SSAnim['d-stripe'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) / a.pause() / a.resume() / a.destroy() / a.ratio() / a.step()
   步骤状态归页面管，动画只保留第 4、5 步画面里的切换按钮（条带数 4 / 2、错位 / 对齐）。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步快进到预设时刻定格。
   数据块由精灵池逐帧绘制，位置一律由路线折线插值，只落在画出来的线上或方块里。
   文字有中英两套，跟着页面的 ss-lang 事件重画。样式在 assets/anim/d-stripe.css。
   四台数据服务器是 EXAScaler，服务器组上方放 DDN 官方 logo（assets/brand/ddn-logo-primary-color.svg）。 */
(function(){
var EN={"服务器 ": "Server ", "客户端": "Client", "示意，不代表实测数字": "Schematic, not measured", "文件 A": "File A", "在出数": "Sending", "空闲": "Idle", "条带大小：一块多大才换下一台": "Stripe size: chunk size before the next server", "应用要读的一条记录": "One record the app reads", "对齐：只找 1 台": "Aligned: only 1 server", "错位：要找 2 台，每块只用到一部分": "Misaligned: 2 servers, part of each chunk used", "大文件目录：条带数 4": "Big-file dir: count 4", "小文件目录：条带数 1": "Small-file dir: count 1", "布局在建文件时定好，之后改目录设置只影响新文件": "Layout is fixed when a file is created; later directory changes affect new files only", "布局建文件时定好，改设置只影响新文件": "Set at creation; changes affect new files only", "条带数 1：一台出数": "Stripe count 1: one server", "条带数 4：四台一起出数": "Stripe count 4: four servers", "已读回": "Read back", "⇄ 条带数换成 2": "⇄ Stripe count to 2", "⇄ 条带数换成 4": "⇄ Stripe count to 4", "⇄ 换成对齐": "⇄ Align it", "⇄ 换成错位": "⇄ Misalign it", "一个文件切成条带块，轮流放到多台数据服务器上": "A file is cut into stripe chunks placed in turn across data servers"};
/* 画面里的切换按钮：第几步（0 起）有按钮，两种状态各写什么 */
var TG={"3": ["⇄ 条带数换成 2", "⇄ 条带数换成 4"], "4": ["⇄ 换成对齐", "⇄ 换成错位"]};
function lang(){return window.SS_LANG==='en'?'en':'zh'}
function T(s){return lang()==='en'&&EN[s]!==undefined?EN[s]:s}
function Z(zh,en){return lang()==='en'?en:zh}
function asset(p){return window.SS&&SS.url?SS.url(p):(window.SS_ROOT||'')+p}
function mount(host,opts){
opts=opts||{};
/* ---------- 公共小工具：画布、数据块、沿线移动 ---------- */
const NS='http://www.w3.org/2000/svg';
host.classList.add('d-stripe');host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','d-stripe-scene');svg.setAttribute('role','img');host.appendChild(svg);
const tgl=document.createElement('button');tgl.className='d-stripe-tgl';tgl.type='button';tgl.hidden=true;host.appendChild(tgl);
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
/* 在 SVG 里放一个 DDN 官方 logo（assets/brand/ddn-logo-primary-color.svg）：h 是高度，宽按原件比例；深色模式垫浅灰底 */
function brandLogo(key,x,y,h,p){const A=280/93,w=h*A,px=h*0.22,py=h*0.16;
  const g=el('g',{},p);
  el('rect',{x:x-px,y:y-py,width:w+2*px,height:h+2*py,rx:2,class:'lgbk'},g);
  el('image',{x,y,width:w,height:h,href:asset('assets/brand/ddn-logo-primary-color.svg'),'aria-label':'DDN'},g);
  return {g,x,w,h}}
/* 框里放不下的字（多是英文）：按可用宽度压一点字距，不出框 */
function fit(t,max){try{t.removeAttribute('textLength');t.removeAttribute('lengthAdjust');const w=t.getComputedTextLength();if(w>max){t.setAttribute('textLength',max.toFixed(1));t.setAttribute('lengthAdjust','spacingAndGlyphs')}}catch(e){}}
/* logo 紧跟某行字：字变长（英文）时把 logo 往右推，不压字 */
function after(lg,t,gap){try{const need=(+t.getAttribute('x'))+t.getComputedTextLength()+gap;lg.g.setAttribute('transform',need>lg.x?`translate(${(need-lg.x).toFixed(1)} 0)`:'')}catch(e){}}

const ARIA='一个文件切成条带块，轮流放到多台数据服务器上';
/* ================= 条带化：版式 ================= */
function layout(m){
  let o;
  if(!m){
    const W=960,H=476;
    o={m:false,W,H,f:{ttl:20,lbl:20,sm:17,note:16,big:34,pk:16,lane:22},pw:36,ph:26,rr:8,lw:30,lh:24,
      cf:{x:24,y:20,w:912,h:116},cT:{x:44,y:52},cS:{x:44,y:96},
      rowY:96,sx:k=>300+k*80,Dy:178,
      oss:[0,1,2,3].map(j=>({x:105+j*200,y:236,w:150,h:190})),
      slot:(j,s)=>({dx:(s%2?22:-22),y:276+Math.floor(s/2)*32}),labDy:-20,stY:450,
      brS:{y:62,ly:40},cnt:{x:480,y:458},note:{x:105,y:450},btn:{x:842,y:50},rec:{y:60,ly:40}};
  }else{
    /* 手机：小字统一 17（400 宽下约 12.5px） */
    const W=480,H=692;
    o={m:true,W,H,f:{ttl:20,lbl:18,sm:17,note:17,big:30,pk:17,lane:21},pw:36,ph:26,rr:8,lw:26,lh:20,
      cf:{x:16,y:16,w:448,h:142},cT:{x:32,y:40},cS:{x:-1},
      rowY:124,sx:k=>72+k*48,Dy:208,
      oss:[0,1,2,3].map(j=>({x:16+j*116,y:266,w:100,h:206})),
      slot:(j,s)=>({dx:(s%2?22:-22),y:306+Math.floor(s/2)*34}),labDy:-20,stY:496,
      brS:{y:94,ly:74},cnt:{x:240,y:510},note:{x:16,y:510},btn:{x:240,y:600},rec:{y:94,ly:74}};
  }
  o.ox=j=>C(o.oss[j]).x;
  o.sp=(j,s)=>{const q=o.slot(j,s);return P(o.ox(j)+q.dx,q.y)};
  // 路线：客户端第 k 格 ↔ 服务器 j 的第 s 格
  o.down=(k,j,s)=>[P(o.sx(k),o.rowY),P(o.sx(k),o.Dy),P(o.ox(j),o.Dy),P(o.ox(j),o.oss[j].y),o.sp(j,s)];
  // DDN logo：服务器组上方、服务器 1 和 2 的连线之间（避开数据块路线）；第 3 步放在「条带数 4」那条标题后
  o.lgh=m?16:18;o.lgO={x:o.ox(0)+o.pw/2+12,y:o.oss[0].y-10-o.lgh};o.lgR=m?{x:256,y:282}:{x:284,y:213};
  o.race=m?raceM():raceD();
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

/* ================= 画面 ================= */
function build(){
  const f=L.f,net=grp('1 2 4 5 6');
  rect(L.cf,'blk',net,14);
  tx(L.cT.x,L.cT.y,'客户端',f.ttl,'ttl','start',net);
  E.cSub=L.cS.x>0?tx(L.cS.x,L.cS.y,'文件 A',f.lbl,'lbl','start',net):null;
  E.ghost=[];for(let k=0;k<8;k++)E.ghost.push(el('rect',{x:L.sx(k)-L.pw/2,y:L.rowY-L.ph/2,width:L.pw,height:L.ph,rx:4,class:'pkt ghost'},net));
  // 每格下方的短竖线 + 分发横线 + 服务器竖线
  E.ticks=[];for(let k=0;k<8;k++)E.ticks.push(line(P(L.sx(k),L.rowY+L.ph/2),P(L.sx(k),L.Dy),'thin',net));
  line(P(Math.min(L.sx(0),L.ox(0)),L.Dy),P(Math.max(L.sx(7),L.ox(3)),L.Dy),'data',net);
  E.oG=L.oss.map((r,j)=>{const g=el('g',{},net);line(P(L.ox(j),L.Dy),P(L.ox(j),r.y),'data',g);E['o'+j]=rect(r,'blk',g);
    tx(C(r).x,r.y+r.h+L.labDy,T('服务器 ')+(j+1),f.note,'lbl','middle',g);return g});
  E.st=L.oss.map((r,j)=>tx(C(r).x,L.stY,'',f.sm,'st','middle',net));
  brandLogo('ddn',L.lgO.x,L.lgO.y,L.lgh,net);
  // 第 4 步：两个括号
  const g4=grp('4',net);
  const bx=L.sx(0);E.brS=el('path',{d:`M${bx-L.pw/2} ${L.brS.y+8} V${L.brS.y} H${bx+L.pw/2} V${L.brS.y+8}`,class:'brk'},g4);
  tx(bx-L.pw/2,L.brS.ly,'条带大小：一块多大才换下一台',f.note,'ink2-t','start',g4);
  E.brC=el('path',{d:'',class:'brk'},g4);
  E.cntT=tx(L.cnt.x,L.cnt.y,'',f.sm,'slate-t st','middle',g4);E.cntT.style.fontWeight=700;
  // 第 5 步：应用记录括号
  const g5=grp('5',net);E.rec=el('path',{d:'',class:'brk rose'},g5);E.recT=tx(0,L.rec.ly,'应用要读的一条记录',f.note,'rose-t','start',g5);
  E.res5=tx(L.note.x,L.note.y,'',f.sm,'st','start',g5);
  // 第 6 步：两个目录
  const g6=grp('6',net);
  E.d6=[tx(L.sx(0)-L.pw/2,L.rec.ly,'大文件目录：条带数 4',f.note,'ochre-t','start',g6),
        tx(L.sx(5)-L.pw/2,L.rec.ly,'小文件目录：条带数 1',f.note,'slate-t','start',g6)];
  E.n6=tx(L.note.x,L.note.y,L.m?'布局建文件时定好，改设置只影响新文件':'布局在建文件时定好，之后改目录设置只影响新文件',f.sm,'ink2-t','start',g6);
  if(E.cSub){E.cSub.dataset.show='1 2 3 4 5';E.cSub.classList.add('vis')}
  // 第 3 步：两条通道
  const R=L.race,g=grp('3');
  tx(R.title[0].x,R.title[0].y,'条带数 1：一台出数',f.lane,'lblb','start',g);
  E.raceT=tx(R.title[1].x,R.title[1].y,'条带数 4：四台一起出数',f.lane,'lblb','start',g);
  E.lgR=brandLogo('ddn',L.lgR.x,L.lgR.y,L.lgh,g);
  // 服务器名放在框里偏左：数据块从框右端出发，不压字
  E.fits=[];const ep=(r,s,right)=>{rect(r,'ep',g,10);if(right)tx(r.x+r.w-12,C(r).y,s,f.note,'lbl','end',g);else E.fits.push([tx(r.x+(r.w-L.pw)/2,C(r).y,s,f.note,'lbl','middle',g),r.w-L.pw-6])};
  wires([P(R.top.src.x+R.top.src.w,C(R.top.src).y),P(R.top.dst.x,C(R.top.src).y)],'data',g);
  ep(R.top.src,T('服务器 ')+1);ep(R.top.dst,'客户端',1);
  R.bot.src.forEach((r,j)=>{wires([P(r.x+r.w,C(r).y),P(R.bot.dst.x,C(r).y)],'data',g);ep(r,T('服务器 ')+(j+1))});
  ep(R.bot.dst,'客户端',1);
  E.cnt=R.cnt.map((c,k)=>{tx(c.x,c.ly,'已读回',f.note,'ink3-t','middle',g);return tx(c.x,c.ny,'0',f.big,'num '+(k?'sage-t':'rose-t'),'middle',g)});
  el('line',{x1:R.sep.x1,y1:R.sep.y,x2:R.sep.x2,y2:R.sep.y,class:'sep'},g);
  tx(R.note.x,R.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',g);
}
function fixLogos(){after(E.lgR,E.raceT,14)}
function reset(){if(!E.o0)return;for(let j=0;j<4;j++){setCls(E['o'+j],'blk');E.oG[j].style.opacity=1;setTxt(E.st[j],'')}
  E.ghost.forEach(g=>g.style.opacity=1);E.ticks.forEach(t=>t.style.opacity=1)}

/* ================= 每一步 ================= */
function modes(){
  const spd=L.m?300:340,dur=p=>plen(p)/spd;
  const row=k=>P(L.sx(k),L.rowY);
  // 条带数 c 时：第 k 块去服务器 k%c 的第 floor(k/c) 格
  const home=(k,c)=>[k%c,Math.floor(k/c)];
  const putRow=(a,lab)=>{for(let k=0;k<8;k++)put('o'+k,row(k),{lab:(lab||'')+(k+1),a})};
  const putOss=(c,a)=>{for(let k=0;k<8;k++){const [j,s]=home(k,c);put('h'+k,L.sp(j,s),{lab:String(k+1),a})}};
  const deal=(c,tc,t0,gap)=>{for(let k=0;k<8;k++){const [j,s]=home(k,c),p=L.down(k,j,s),d=dur(p),ts=t0+gap*k;
      const u=run('w'+k,p,ts,d,tc,{lab:String(k+1)});if(u===2)put('w'+k,L.sp(j,s),{lab:String(k+1),a:1-fade(tc,6.3,6.8)})}};
  return {
  /* 1：整个文件在服务器 1，一块接一块读回来 */
  0:{still:4,frame(t){const tc=t%8;putOss(1,1);
      setCls(E.o0,'blk busy');setTxt(E.st[0],'在出数');setCls(E.st[0],'st rose-t');
      for(let j=1;j<4;j++){setTxt(E.st[j],'空闲');setCls(E.st[j],'st ink3-t')}
      for(let k=0;k<8;k++){const p=rev(L.down(k,0,k)),d=dur(p),ts=0.3+0.62*k;
        const u=run('r'+k,p,ts,d,tc,{lab:String(k+1)});if(u===2)put('r'+k,row(k),{lab:String(k+1),a:1-fade(tc,7.4,7.9)})}}},
  /* 2：切块，轮流落到 4 台 */
  1:{still:5,frame(t){const tc=t%7;putRow(1);deal(4,tc,0.4,0.42)}},
  /* 3：一台对四台 */
  2:{still:6.5,frame(t){const R=L.race,C5=9,tc=t%C5,Ts=0.5,speed=L.m?300:330;
      const fa=tc>8.6?(C5-tc)/0.4:tc<0.4?tc/0.4:1;
      const lanes=[[R.top.src],R.bot.src],dsts=[R.top.dst,R.bot.dst];let cnt=[0,0];
      lanes.forEach((srcs,k)=>srcs.forEach((s,j)=>{const y=C(s).y,pts=[P(s.x+s.w-L.pw/2,y),P(dsts[k].x+L.pw/2,y)],d=plen(pts)/speed;
        for(let n=0;n*Ts<7.6;n++){const t0=n*Ts+j*0.11;if(t0>tc)break;const u=(tc-t0)/d;
          if(u<=1)put(`${k}-${j}-${n}`,atU(pts,u),{a:fa});else if(u<=1+0.3/d)put(`${k}-${j}-${n}`,pts[1],{a:fa*(1-(u-1)*d/0.3)});
          if(u>=1)cnt[k]++}}));
      E.cnt.forEach((e,k)=>{setTxt(e,String(cnt[k]));e.style.opacity=fa})}},
  /* 4：条带大小 + 条带数，按钮切 4 / 2 */
  3:{still:5,frame(t,dt,tt){const c=tog?2:4,tc=tt%7;putRow(1);deal(c,tc,0.4,0.36);
      for(let j=0;j<4;j++)E.oG[j].style.opacity=j<c?1:0.25;
      setTxt(E.cntT,Z('条带数 = '+c+'：这个文件铺 '+c+' 台','Stripe count = '+c+': the file spans '+c+' servers'));
      const a=L.oss[0],b=L.oss[c-1],by=a.y+a.h+8;E.brC.setAttribute('d',`M${a.x} ${by-8} V${by} H${b.x+b.w} V${by-8}`);
      let cw=0;try{cw=E.cntT.getComputedTextLength()}catch(e){}E.cntT.setAttribute('x',clamp((a.x+b.x+b.w)/2,8+cw/2,L.W-8-cw/2))}},
  /* 5：对不齐要找两台 */
  4:{still:1.6,frame(t,dt,tt){const al=tog,tc=tt%4.4,dur=p=>plen(p)/(L.m?200:230);putRow(1);putOss(4,1);
      const ks=al?[2]:[1,2];
      const x0=al?L.sx(2)-L.pw/2:L.sx(1),x1=al?L.sx(2)+L.pw/2:L.sx(2),y=L.rec.y;
      E.rec.setAttribute('d',`M${x0} ${y+8} V${y} H${x1} V${y+8}`);E.recT.setAttribute('x',x0);
      setTxt(E.res5,al?'对齐：只找 1 台':'错位：要找 2 台，每块只用到一部分');setCls(E.res5,'st '+(al?'sage-t':'rose-t'));
      ks.forEach((k,i)=>{const [j,s]=home(k,4),go=L.down(k,j,s).slice(0,4),d=dur(go),t0=0.3+0.1*i;
        run('q'+k,go,t0,d,tc,{k:'req'});const ta=t0+d;setCls(E['o'+j],tc>=ta&&tc<ta+0.4?'blk on':'blk');
        const back=rev(L.down(k,j,s)),db=dur(back);const u=run('c'+k,back,ta+0.3,db,tc,{lab:String(k+1),cls:al?'':'cp'});
        if(u===2)put('c'+k,row(k),{lab:String(k+1),cls:al?'':'cp',a:1-fade(tc,ta+0.3+db,ta+0.3+db+0.5)})});
      for(let j=0;j<4;j++)if(!ks.some(k=>home(k,4)[0]===j))setCls(E['o'+j],'blk')}},
  /* 6：两个目录，各按自己的条带数落盘 */
  5:{still:5,enter(){E.ghost.forEach((g,k)=>g.style.opacity=(k<4||k===5)?1:0);E.ticks.forEach((g,k)=>g.style.opacity=(k<4||k===5)?1:0.25)},
    frame(t){const tc=t%7.5;
      const a=fade(tc,0.2,0.6)*(1-fade(tc,7,7.4));
      for(let k=0;k<4;k++)put('B'+k,row(k),{lab:'B'+(k+1),cls:'b',a});put('C0',row(5),{lab:'C1',a});
      for(let k=0;k<4;k++){const p=L.down(k,k,0),d=dur(p),ts=0.9+0.3*k;const u=run('wb'+k,p,ts,d,tc,{lab:'B'+(k+1),cls:'b'});
        if(u===2)put('wb'+k,L.sp(k,0),{lab:'B'+(k+1),cls:'b',a:1-fade(tc,7,7.4)})}
      {const p=L.down(5,1,1),d=dur(p),ts=2.4;const u=run('wc',p,ts,d,tc,{lab:'C1'});if(u===2)put('wc',L.sp(1,1),{lab:'C1',a:1-fade(tc,7,7.4)})}}}
  };
}


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
  applyVis();reset();fixLogos();(E.fits||[]).forEach(a=>fit(a[0],a[1]));
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
  show(i){enter(Math.max(0,Math.min(6-1,i)))},
  pause(){paused=true;cancelAnimationFrame(raf)},
  resume(){if(!paused)return;paused=false;go()},
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('d-stripe')},
  ratio(){return L.W/L.H},
  step(){return step},
  sim(){return {step,t:T0,tog,n:POOL.size}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['d-stripe']={steps:6,mount:mount};
})();
