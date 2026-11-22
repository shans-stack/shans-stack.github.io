/* 相似性压缩：6 步动画（SVG，不依赖动画库）。由 out/v-sim/anim.html 改写成和 rdma.js 同样的接口。
   接口：
     var a = SSAnim['v-sim'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i)  切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件，页面翻到哪一步就调 show(i)。每一步的画面是「本轮时间 t」的函数。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   文字有中英两套（EN 表 + T()），跟着页面的 ss-lang 事件重画。样式在 assets/anim/v-sim.css。 */
(function(){
var EN={"新写入": "New write", "切块": "Chunk", "算指纹": "Fingerprint", "压缩": "Compress", "已存数据": "Stored data", "指纹表": "Fingerprint table", "示意：一格代表一段字节": "Schematic: each cell is a run of bytes", "最近省下的空间": "Recent space saved", "示意，不代表实测数字": "Schematic, not measured", "内存里的表 1": "RAM table 1", "内存里的表 2": "RAM table 2", "SCM 上的共享表": "Shared SCM table", "内存表 2": "RAM table 2", "SCM 共享表": "Shared SCM table", "示意": "Schematic", "强指纹：没找到": "Strong: no match", "强指纹：找到": "Strong: match", "差一格，也要整块再存": "Differs: stored in full", "一样的块：只记一个指针": "Same block: pointer only", "相似指纹：找到 A": "Similar: match A", "这块就是 A": "This one is A", "示意：B 是一块全新的数据": "Schematic: B is brand-new data", "示意：A′ 和 A 只差一格": "Schematic: A′ differs from A by one cell", "用 A 的字典压": "Using A's dictionary", "A′ 只多存一小段差异": "A′ adds only a small delta", "相似指纹：没找到": "Similar: no match", "ZSTD 单独压缩": "ZSTD on its own", "B 压短一些后存下": "B stored a bit smaller", "整套系统一个缩减域": "One realm for the whole system", "去重域 1": "Dedupe domain 1", "去重域 2": "Dedupe domain 2", "找到：CNode 1 存过": "Found: stored by CNode 1", "没找到": "Not found", "CNode 2 的写入只记一个指针": "CNode 2's write: pointer only", "相似性压缩：": "Similarity: ", "开": "on", "关": "off", "收益低，自动关掉": "Low gain, switched off", "换成共享 SCM 上的表": "Switch to the shared SCM table", "换成全新块": "Switch to a new block", "换成各自内存里的表": "Switch to per-node RAM tables", "换成相似块": "Switch to a similar block", "相似性压缩：找到只差几个字节的块，用同一本字典只存差异": "Similarity reduction: find blocks that differ by a few bytes and store only the difference with a shared dictionary"};
function lang(){return window.SS_LANG==='en'?'en':'zh'}
function T(s){return lang()==='en'&&EN[s]!==undefined?EN[s]:s}
/* VAST 字标（官方黑白两版同一路径，颜色由 CSS 按深浅色切换），全页只放一份 */
function sprite(){if(document.getElementById('ss-vast-wm'))return;
  var d=document.createElement('div');d.setAttribute('aria-hidden','true');d.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
  d.innerHTML='<svg width="0" height="0" focusable="false"><symbol id="ss-vast-wm" viewBox="0 0 66 14"><path d="m11.918.916-.783-.375a.919.919 0 0 0-1.23.444l-.22.414L6.235 8.77 2.788 1.4l-.22-.414a.917.917 0 0 0-1.23-.444L.556.916c-.466.219-.69.804-.474 1.273l.195.383 4.689 10.024a1.383 1.383 0 0 0 1.248.797h.042a1.385 1.385 0 0 0 1.248-.797l4.689-10.024.195-.383c.217-.469-.007-1.054-.47-1.273ZM19.311 12.926l.784.375a.918.918 0 0 0 1.23-.444l.22-.414 3.451-7.371 3.448 7.371.22.414a.918.918 0 0 0 1.23.444l.785-.375c.462-.221.687-.804.469-1.271l-.195-.383-4.689-10.024a1.384 1.384 0 0 0-1.248-.797h-.041a1.386 1.386 0 0 0-1.25.797l-4.688 10.024-.195.383c-.219.467.006 1.05.47 1.27ZM47.275 3.212a.918.918 0 0 0 .966-.882l.03-.868c.02-.512-.393-.982-.908-1.006L46.887.45h-5.413c-.03 0-.059 0-.092.004-1.433.095-3.565 1.126-3.565 3.572 0 2.487 2.104 3.599 3.236 3.846l2.823.677c.041.009.082.017.124.023.15.022.896.176.896 1.014 0 .504-.253.801-.754.885h-5.318l-.362.005a.918.918 0 0 0-.966.883l-.03.868c-.02.512.393.982.908 1.006l.45.005h5.413c.043 0 .086 0 .128-.005 1.327-.123 3.301-1.196 3.301-3.647 0-2.539-2.051-3.547-3.195-3.742l-2.787-.668-.039-.008c-.042-.01-1.058-.235-1.058-1.142 0-.606.578-.769.953-.81h5.347l.388-.004ZM66 1.365a.916.916 0 0 0-.938-.914H55.5a.919.919 0 0 0-.938.914v.878c0 .513.427.968.942.976H58.897v9.086a.914.914 0 0 0 .56.864.919.919 0 0 0 .355.073h.879c.512 0 .968-.426.976-.94V3.217H65.06c.515-.007.943-.463.942-.975l-.003-.878Z"/></symbol></svg>';
  document.body.appendChild(d)}
function mount(host,opts){
opts=opts||{};sprite();
/* ---------- 通用小引擎：每一步的画面都是「本轮时间 t」的函数 ---------- */
const NS='http://www.w3.org/2000/svg';
host.classList.add('v-sim');host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','v-sim-scene');svg.setAttribute('role','img');host.appendChild(svg);
const btn=document.createElement('button');btn.className='v-sim-btn';btn.type='button';btn.hidden=true;host.appendChild(btn);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mq=matchMedia('(max-width: 640px)');
let L,E={},step=0,T0=0,raf=0,tgl=false,lastTg=-1,paused=!!opts.paused,pausedAt=0,dead=false,SCENE;
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
const H={el,tx,grp,rect,line,C,P,clamp,sm,ramp,plen,along,rev,pk,put,travel,loopFade,alt:()=>tgl};
/* 厂商 logo：VAST 字标放在部件角上。(x,y) 为字标竖直中线上的锚点，h 为高度 */
function vmark(x,y,h,p,anchor){const w=h*66/14;if(anchor==='end')x-=w;else if(anchor==='middle')x-=w/2;return el('use',{href:'#ss-vast-wm',x:x.toFixed(1),y:(y-h/2).toFixed(1),width:w.toFixed(1),height:h,class:'vwm brand-part'},p)}
/* 部件名 + VAST 字标排成一行，整体居中于 (cx,cy)；lw 为部件名估计宽度 */
function vpair(cx,cy,s,fs,cls,p,h,lw){lw=lw||fs*0.63*s.length;const w=h*66/14,gap=Math.round(fs*0.4),x0=cx-(lw+gap+w)/2;const t=tx(x0+lw,cy,s,fs,cls,'end',p);const m=vmark(x0+lw+gap,cy,h,p,'start');return {t,m}}
/* 相似性压缩：新写入 → 切块 → 算指纹 → 压缩 → 已存数据；指纹表在「算指纹」旁，取参考块的线从存储绕回「压缩」 */

function makeScene(){
const SCENE={
layout(mobile){
  const P=H.P;
  if(!mobile){
    const y=250;
    return {mobile,W:960,H:476,vert:false,cw:12,ch:18,cp:13,f:{lbl:18,sm:16,note:16,t:17},
      src:{x:20,y:y-24,w:100,h:48},st:[250,420,590].map(x=>({x:x-50,y:y-22,w:100,h:44,cx:x,cy:y})),stLab:{dx:0,dy:44,a:'middle'},
      store:{x:720,y:170,w:220,h:170},storeLab:{x:830,y:362},storeNote:{x:830,y:324},
      slots:[P(830,206),P(830,250),P(830,290)],entry:P(720,y),
      tbl:{x:320,y:64,w:200,h:86},tblRows:[110,134],tblT:84,look:[P(420,y),P(420,150)],
      ref:[P(800,170),P(800,160),P(590,160),P(590,228)],refFrom:(s)=>[s,P(800,s.y),P(800,160),P(590,160),P(590,y)],
      main:[P(120,y),P(720,y)],srcPt:P(70,y),
      cmpNote:{x:590,y:316},
      sw:{x:590,y:190},gauge:{x:320,y:96,w:200,ly:72,sy:124},
      R:{c1:{x:240,y:110,w:140,h:50},c2:{x:240,y:300,w:140,h:50},t1:{x:40,y:110,w:150,h:50},t2:{x:40,y:300,w:150,h:50},ts:{x:40,y:205,w:150,h:50},
         store:{x:600,y:100,w:320,h:260},jx:215,dom:[P(760,150),P(760,325)],lineY:[135,325]},
      note:{x:32,y:456},btn:{x:760,y:420}};
  }
  const x=240;
  return {mobile,W:480,H:720,vert:true,cw:16,ch:9,cp:10,f:{lbl:17,sm:16,note:16,t:16},
    src:{x:x-60,y:16,w:120,h:40},st:[140,250,360].map(y=>({x:x-50,y:y-22,w:100,h:44,cx:x,cy:y})),stLab:{dx:-60,dy:0,a:'end'},
    store:{x:150,y:450,w:310,h:170},storeLab:{x:305,y:640},storeNote:{x:305,y:600},
    slots:[P(400,520),P(340,520),P(280,520)],entry:P(x,450),
    tbl:{x:316,y:206,w:154,h:88},tblRows:[254,278],tblT:228,look:[P(x,250),P(316,250)],
    ref:[P(400,450),P(400,360),P(290,360)],refFrom:(s)=>[s,P(400,450),P(400,360),P(x,360)],
    main:[P(x,56),P(x,450)],srcPt:P(x,36),
    cmpNote:{x:180,y:396,a:'end'},
    sw:{x:300,y:330,a:'start'},gauge:{x:316,y:250,w:150,ly:226,sy:276},
    R:{c1:{x:30,y:60,w:160,h:50},c2:{x:290,y:60,w:160,h:50},t1:{x:30,y:150,w:160,h:56},t2:{x:290,y:150,w:130,h:56},ts:{x:160,y:150,w:160,h:56},
       store:{x:30,y:300,w:420,h:200},mob:true},
    note:{x:16,y:706},btn:{x:240,y:670}};
},
build(){
  const {el,tx,grp,rect,line,P}=H,f=L.f;
  /* 第 1-4、6 步：处理线 */
  const g=grp('1 2 3 4 6');
  line(L.main,'base',g);
  rect(L.src,'blk',g,10);tx(L.src.x+L.src.w/2,L.src.y+L.src.h/2,T('新写入'),f.lbl,'lbl b7','middle',g);
  E.st=L.st.map((s,k)=>{const R=rect(s,'blk',g,10);const nm=[T('切块'),T('算指纹'),T('压缩')][k];
    tx(s.cx+L.stLab.dx,s.cy+L.stLab.dy,nm,f.lbl,'lbl b7',L.stLab.a,g);return R});
  E.store=rect(L.store,'blk',g,12);/* VAST 字标：存数据的地方是 VAST 集群，紧跟「已存数据」 */vpair(L.storeLab.x,L.storeLab.y,T('已存数据'),f.lbl,'lbl b7',g,L.mobile?12:13,(lang()==='en'?f.lbl*5.6:f.lbl*4));
  E.sNote=tx(L.storeNote.x,L.storeNote.y,'',f.sm,'st','middle',g);
  /* 指纹表 */
  const gt=grp('1 3 4');line(L.look,'base',gt);
  rect(L.tbl,'blk',gt,10);tx(L.tbl.x+L.tbl.w/2,L.tblT,T('指纹表'),f.sm,'ink2-t b7','middle',gt);
  E.rows=L.tblRows.map(y=>tx(L.tbl.x+12,y,'',f.sm,'st','start',gt));
  /* 取参考块的线 */
  const gr=grp('4');line(L.ref,'base',gr);
  E.cNote=tx(L.cmpNote.x,L.cmpNote.y,'',f.sm,'st',L.cmpNote.a||'middle',gr);
  E.tglNote=tx(L.note.x,L.note.y,T('示意：一格代表一段字节'),f.note,'ink3-t','start',grp('1 2 3 4'));
  /* 第 6 步：开关与收益条 */
  const g6=grp('6'),G=L.gauge;
  tx(G.x,G.ly,T('最近省下的空间'),f.sm,'ink2-t','start',g6);
  el('rect',{x:G.x,y:G.y-7,width:G.w,height:14,rx:4,class:'track'},g6);
  E.gf=el('rect',{x:G.x,y:G.y-7,width:0,height:14,rx:4,class:'fill sage'},g6);
  E.th=line([P(G.x+G.w*0.4,G.y-12),P(G.x+G.w*0.4,G.y+12)],'thr',g6);
  E.sw=tx(L.sw.x,L.sw.y,'',f.sm,'st',L.sw.a||'middle',g6);E.sw2=tx(L.sw.x,L.sw.y+22,'',f.sm,'st ink3-t',L.sw.a||'middle',g6);
  tx(L.note.x,L.note.y,T('示意，不代表实测数字'),f.note,'ink3-t','start',g6);
  /* 第 5 步：缩减域 */
  this.realm(grp('5'));
},
realm(g){
  const {el,tx,grp,rect,line,P}=H,f=L.f,R=L.R;
  E.r={};
  const box=(r,t,cls)=>{const b=rect(r,cls||'blk',g,10);tx(r.x+r.w/2,r.y+r.h/2,t,f.sm,'lbl b7','middle',g);return b};
  box(R.c1,'CNode 1');box(R.c2,'CNode 2');
  const gA=grp(null,g),gB=grp(null,g);E.r.gA=gA;E.r.gB=gB;
  const cy1=R.c1.y+R.c1.h/2,cy2=R.c2.y+R.c2.h/2;
  if(!R.mob){
    // 各自内存：表在 CNode 左边
    line([P(R.t1.x+R.t1.w,cy1),P(R.c1.x,cy1)],'base',gA);line([P(R.t2.x+R.t2.w,cy2),P(R.c2.x,cy2)],'base',gA);
    rect(R.t1,'blk',gA,10);tx(R.t1.x+R.t1.w/2,cy1,T('内存里的表 1'),f.sm,'ink2-t','middle',gA);
    rect(R.t2,'blk',gA,10);tx(R.t2.x+R.t2.w/2,cy2,T('内存里的表 2'),f.sm,'ink2-t','middle',gA);
    const sy=R.ts.y+R.ts.h/2;line([P(R.c1.x,cy1),P(R.jx,cy1),P(R.jx,cy2),P(R.c2.x,cy2)],'base',gB);line([P(R.jx,sy),P(R.ts.x+R.ts.w,sy)],'base',gB);
    rect(R.ts,'blk',gB,10);tx(R.ts.x+R.ts.w/2,sy,T('SCM 上的共享表'),f.sm,'ink2-t','middle',gB);
    E.r.look={A:[P(R.c2.x,cy2),P(R.t2.x+R.t2.w,cy2)],B:[P(R.c2.x,cy2),P(R.jx,cy2),P(R.jx,sy),P(R.ts.x+R.ts.w,sy)]};
    E.r.res={x:R.t2.x+R.t2.w/2,y:R.t2.y+R.t2.h+22,yB:R.ts.y+R.ts.h+22,xB:R.ts.x+R.ts.w/2};
    line([P(R.c1.x+R.c1.w,cy1),P(R.store.x,cy1)],'base',g);line([P(R.c2.x+R.c2.w,cy2),P(R.store.x,cy2)],'base',g);
    E.r.wr=[P(R.c2.x+R.c2.w/2,cy2),P(R.c2.x+R.c2.w,cy2),P(R.store.x,cy2),R.dom[1]];
  }else{
    line([P(R.c1.x+R.c1.w/2,R.c1.y+R.c1.h),P(R.c1.x+R.c1.w/2,R.t1.y)],'base',gA);line([P(R.c2.x+65,R.c2.y+R.c2.h),P(R.c2.x+65,R.t2.y)],'base',gA);
    rect(R.t1,'blk',gA,10);tx(R.t1.x+R.t1.w/2,R.t1.y+R.t1.h/2,T('内存里的表 1'),f.sm,'ink2-t','middle',gA);
    rect(R.t2,'blk',gA,10);tx(R.t2.x+R.t2.w/2,R.t2.y+R.t2.h/2,T('内存表 2'),f.sm,'ink2-t','middle',gA);
    line([P(R.c1.x+R.c1.w,cy1),P(240,cy1),P(R.c2.x,cy2)],'base',gB);line([P(240,cy1),P(240,R.ts.y)],'base',gB);
    rect(R.ts,'blk',gB,10);tx(R.ts.x+R.ts.w/2,R.ts.y+R.ts.h/2,T('SCM 共享表'),f.sm,'ink2-t','middle',gB);
    E.r.look={A:[P(R.c2.x+65,R.c2.y+R.c2.h),P(R.c2.x+65,R.t2.y)],B:[P(R.c2.x,cy2),P(240,cy2),P(240,R.ts.y)]};
    E.r.res={x:R.t2.x+R.t2.w/2,y:R.t2.y+R.t2.h+20,yB:R.ts.y+R.ts.h+20,xB:R.ts.x+R.ts.w/2};
    const lx=440;line([P(lx,R.c2.y+R.c2.h),P(lx,R.store.y)],'base',g);
    E.r.wr=[P(lx,R.c2.y+R.c2.h/2),P(lx,R.c2.y+R.c2.h),P(lx,R.store.y),P(lx-60,R.store.y+150)];
    R.dom=[P(150,R.store.y+52),P(300,R.store.y+160)];E.r.wr[3]=R.dom[1];
  }
  E.r.store=rect(R.store,'blk',g,12);
  /* 第 5 步存储框没有标题：字标放在框外左上角（铭牌） */vmark(R.store.x+2,R.store.y-11,L.mobile?12:11,g,'start');
  E.r.div=line(R.mob?[P(R.store.x+12,R.store.y+105),P(R.store.x+R.store.w-12,R.store.y+105)]:[P(R.store.x+12,R.store.y+R.store.h/2),P(R.store.x+R.store.w-12,R.store.y+R.store.h/2)],'base thin dash',g);
  const sx=R.store.x+16;
  E.r.d1=tx(sx,R.mob?R.store.y+22:R.store.y+24,'',f.sm,'st ink3-t','start',g);E.r.d2=tx(sx,R.mob?R.store.y+128:R.store.y+R.store.h/2+24,'',f.sm,'st ink3-t','start',g);
  E.r.res1=tx(0,0,'',f.sm,'st','middle',g);
  E.r.ptr=tx(R.mob?R.store.x+R.store.w/2:R.store.x+R.store.w/2,R.mob?R.store.y+140:R.store.y+R.store.h/2+10,'',f.sm,'st sage-t','middle',g);
  tx(L.note.x,L.note.y,T('示意'),f.note,'ink3-t','start',g);
},
/* 一块数据：一排小格；kinds 每格的类名 */
blk(kinds,hz){const g=H.el('g',{},E.pk);const n=kinds.length,vt=L.vert&&!hz,cw=L.vert&&hz?L.ch:L.cw,ch=L.vert&&hz?L.cw:L.ch,cp=L.cp;
  kinds.forEach((k,i)=>{const o=(i-(n-1)/2)*cp;H.el('rect',vt?{x:-cw/2,y:o-ch/2,width:cw,height:ch,rx:2,class:'cel '+k}:{x:o-cw/2,y:-ch/2,width:cw,height:ch,rx:2,class:'cel '+k},g)});
  g.style.opacity=0;return g},
dot(){const d=H.el('circle',{r:L.mobile?6:7,class:'qdot'},E.pk);d.style.opacity=0;return d},
mv(g,pts,t,t0,v,o){return H.travel(g,pts,t,t0,v,o)},
ping(d,pts,t,t0,dur){const u=(t-t0)/dur;if(u<0||u>1){d.style.opacity=0;return}const q=H.along(pts.concat(H.rev(pts).slice(1)),u);d.setAttribute('cx',q.x);d.setAttribute('cy',q.y);d.style.opacity=1},
hl(g,on){g.querySelectorAll('rect').forEach(r=>r.classList.toggle('hlc',on))},
row(k,s,cls){E.rows[k].textContent=s;E.rows[k].setAttribute('class','st '+(cls||''))},
pt(k){return L.st[k].vert?null:H.P(L.st[k].cx,L.st[k].cy)},
seg(a,b){return [a,b]},
K8:['','','','','','','',''],KA2:['','','','','d','','',''],
toggle:{steps:[3,4],on:'',off:'',set(){}},
modes:[
 /* 1：去重只认一模一样的 */
 {period:9.5,enter(){SCENE.row(0,'');SCENE.row(1,'');E.sNote.textContent='';
   E.A=SCENE.blk(SCENE.K8);H.put(E.A,L.slots[0]);
   E.b0=SCENE.blk(SCENE.K8);E.b1=SCENE.blk(SCENE.KA2);E.d=SCENE.dot();E.d2=SCENE.dot();E.tglNote.textContent=T('示意：一格代表一段字节')},
  draw(t){const fp=H.P(L.st[1].cx,L.st[1].cy),v=300;
   const a0=SCENE.mv(E.b0,[L.srcPt,fp],t,0.4,v,{post:1});
   if(t>a0+1.0)E.b0.style.opacity=1-H.ramp(t,a0+1.0,a0+1.4);
   SCENE.ping(E.d,L.look,t,a0+0.1,0.8);
   const a1s=a0+1.8,a1=SCENE.mv(E.b1,[L.srcPt,fp],t,a1s,v);SCENE.ping(E.d2,L.look,t,a1+0.1,0.8);
   const a2=a1+1.1;if(t>=a2)SCENE.mv(E.b1,[fp,L.entry,L.slots[1]],t,a2,v);
   if(t>=a1+0.9)SCENE.row(0,T('强指纹：没找到'),'rose-t');else if(t>=a0+0.9&&t<a1s)SCENE.row(0,T('强指纹：找到'),'sage-t');else SCENE.row(0,'');
   if(t>=a1+0.9){E.sNote.textContent=T('差一格，也要整块再存');E.sNote.setAttribute('class','st rose-t')}
   else if(t>=a0+1.0){E.sNote.textContent=T('一样的块：只记一个指针');E.sNote.setAttribute('class','st sage-t')}else E.sNote.textContent='';
   const fd=H.loopFade(t,9.5);E.sNote.style.opacity=fd;E.rows[0].style.opacity=fd;E.A.style.opacity=1}},
 /* 2：按内容切块 */
 {period:7,enter(){SCENE.row(0,'');SCENE.row(1,'');E.sNote.textContent='';
   const lens=[5,3,6,2];let s=0;const tot=16;E.tglNote.textContent=T('示意：一格代表一段字节');E.ch=lens.map((n,i)=>{const c={g:SCENE.blk(Array(n).fill('')),off:(s+n/2-tot/2)*L.cp,i};s+=n;return c})},
  draw(t){const cut=H.P(L.st[0].cx,L.st[0].cy),fp=H.P(L.st[1].cx,L.st[1].cy),v=260,vx=!L.vert;
   const s0=L.vert?H.P(L.srcPt.x,76):H.P(120,L.srcPt.y),tIn=0.4,dIn=H.plen([s0,cut])/v,arr=tIn+dIn;
   E.ch.forEach(c=>{const gap=(c.i-1.5)*(L.vert?7:10)*H.sm(H.ramp(t,arr+0.4+c.i*0.0,arr+1.2)),o=c.off+gap;
     const sh=(p)=>vx?H.P(p.x+o,p.y):H.P(p.x,p.y+o);
     const t2=arr+1.8+c.i*0.6;
     if(t<t2){const u=H.clamp((t-tIn)/dIn,0,1),q=H.along([s0,cut],u);H.put(c.g,sh(q),t<tIn?0:H.ramp(t,tIn,tIn+0.15))}
     else{const from=sh(cut);const a=H.travel(c.g,[from,fp],t,t2,v);if(t>=a)c.g.style.opacity=1-H.ramp(t,a,a+0.3)}});
   E.sNote.textContent='';E.st[0].setAttribute('class',t>arr&&t<arr+1.4?'blk on':'blk')}},
 /* 3：两种指纹 */
 {freeze:5,enter(){SCENE.row(0,'');SCENE.row(1,'');E.sNote.textContent='';
   E.A=SCENE.blk(SCENE.K8);H.put(E.A,L.slots[0]);E.b1=SCENE.blk(SCENE.KA2);E.d=SCENE.dot();E.d2=SCENE.dot();E.tglNote.textContent=T('示意：一格代表一段字节')},
  draw(t){const fp=H.P(L.st[1].cx,L.st[1].cy),a=SCENE.mv(E.b1,[L.srcPt,fp],t,0.4,300);
   SCENE.ping(E.d,L.look,t,a+0.2,0.8);SCENE.ping(E.d2,L.look,t,a+1.2,0.8);
   if(t>=a+1.0)SCENE.row(0,T('强指纹：没找到'),'rose-t');else SCENE.row(0,'');
   if(t>=a+2.0)SCENE.row(1,T('相似指纹：找到 A'),'sage-t');else SCENE.row(1,'');
   SCENE.hl(E.A,t>=a+2.1);E.sNote.textContent=t>=a+2.1?T('这块就是 A'):'';E.sNote.setAttribute('class','st sage-t')}},
 /* 4：撞上用参考块的字典压 / 没撞上 ZSTD（一个按钮切换） */
 {period:6.5,enter(){SCENE.row(0,'');SCENE.row(1,'');E.sNote.textContent='';E.cNote.textContent='';
   E.A=SCENE.blk(SCENE.K8);H.put(E.A,L.slots[0]);
   E.b1=SCENE.blk(SCENE.KA2);E.ref=SCENE.blk(SCENE.K8);E.ref.querySelectorAll('rect').forEach(r=>r.classList.add('cpc'));
   E.dl=SCENE.blk(['s','s']);E.nb=SCENE.blk(['n','n','n','n','n','n','n','n']);E.nz=SCENE.blk(['n','n','n','n','n'])},
  draw(t){const alt=H.alt(),cmp=H.P(L.st[2].cx,L.st[2].cy),fp=H.P(L.st[1].cx,L.st[1].cy),v=300;
   E.tglNote.textContent=alt?T('示意：B 是一块全新的数据'):T('示意：A′ 和 A 只差一格');
   if(!alt){[E.nb,E.nz].forEach(g=>g.style.opacity=0);
     const a=SCENE.mv(E.b1,[L.srcPt,cmp],t,0.4,v);const tf=0.4+H.plen([L.srcPt,fp])/v;
     SCENE.row(0,t>=tf?T('强指纹：没找到'):'',t>=tf?'rose-t':'');SCENE.row(1,t>=tf+0.1?T('相似指纹：找到 A'):'','sage-t');
     const r0=a-H.plen(L.refFrom(L.slots[0]))/260;const ra=SCENE.mv(E.ref,L.refFrom(L.slots[0]),t,r0,260,{post:1});
     const tm=Math.max(a,ra)+0.5;if(t>=tm){E.b1.style.opacity=1-H.ramp(t,tm,tm+0.2);E.ref.style.opacity=1-H.ramp(t,tm,tm+0.2)}
     const da=t>=tm?SCENE.mv(E.dl,[cmp,L.entry,L.slots[1]],t,tm+0.1,v,{fadeIn:1}):(E.dl.style.opacity=0,0);
     E.cNote.textContent=t>=a?T('用 A 的字典压'):'';E.cNote.setAttribute('class','st sage-t');
     E.sNote.textContent=t>=tm+0.1+H.plen([cmp,L.entry,L.slots[1]])/v?T('A′ 只多存一小段差异'):'';E.sNote.setAttribute('class','st sage-t');
     SCENE.hl(E.A,t>=r0&&t<tm+0.5)}
   else{[E.b1,E.ref,E.dl].forEach(g=>g.style.opacity=0);SCENE.hl(E.A,false);
     const a=SCENE.mv(E.nb,[L.srcPt,cmp],t,0.4,v);const tf=0.4+H.plen([L.srcPt,fp])/v;
     SCENE.row(0,t>=tf?T('强指纹：没找到'):'',t>=tf?'rose-t':'');SCENE.row(1,t>=tf+0.1?T('相似指纹：没找到'):'',t>=tf+0.1?'rose-t':'');
     const tm=a+0.8;if(t>=tm)E.nb.style.opacity=1-H.ramp(t,tm,tm+0.2);
     if(t>=tm)SCENE.mv(E.nz,[cmp,L.entry,L.slots[1]],t,tm+0.1,v,{fadeIn:1});else E.nz.style.opacity=0;
     E.cNote.textContent=t>=a?T('ZSTD 单独压缩'):'';E.cNote.setAttribute('class','st ink2-t');
     E.sNote.textContent=t>=tm+0.1+H.plen([cmp,L.entry,L.slots[1]])/v?T('B 压短一些后存下'):'';E.sNote.setAttribute('class','st ink2-t')}
   const fd=H.loopFade(t,6.5);[E.sNote,E.cNote,E.rows[0],E.rows[1]].forEach(e=>e.style.opacity=fd)}},
 /* 5：一个缩减域（一个按钮切换） */
 {period:6,enter(){const R=L.R;E.rA=SCENE.blk(SCENE.K8,1);H.put(E.rA,R.dom[0]);E.rB=SCENE.blk(SCENE.K8,1);E.rd=SCENE.dot()},
  draw(t){const alt=H.alt(),R=L.R,r=E.r;r.gA.style.opacity=alt?0:1;r.gB.style.opacity=alt?1:0;r.div.style.opacity=alt?0:1;
   r.d1.textContent=alt?T('整套系统一个缩减域'):T('去重域 1');r.d2.textContent=alt?'':T('去重域 2');
   SCENE.ping(E.rd,alt?r.look.B:r.look.A,t,0.5,1.0);
   const res=t>=1.5;r.res1.setAttribute('x',alt?r.res.xB:r.res.x);r.res1.setAttribute('y',alt?r.res.yB:r.res.y);
   r.res1.textContent=res?(alt?T('找到：CNode 1 存过'):T('没找到')):'';r.res1.setAttribute('class','st '+(alt?'sage-t':'rose-t'));
   E.rB.querySelectorAll('rect').forEach(x=>x.classList.toggle('dup',!alt));
   if(!alt){const a=SCENE.mv(E.rB,r.wr,t,1.8,240,{fadeIn:1});r.ptr.textContent=''}
   else{E.rB.style.opacity=0;r.ptr.textContent=t>=1.8?T('CNode 2 的写入只记一个指针'):''}
   SCENE.hl(E.rA,alt&&t>=1.8);
   const fd=H.loopFade(t,6);[r.res1,r.ptr].forEach(e=>e.style.opacity=fd)}},
 /* 6：按收益自动开关 */
 {period:12,enter(){E.sNote.textContent='';E.cNote&&(E.cNote.textContent='');
   const cmp=H.P(L.st[2].cx,L.st[2].cy),v=320;E.flow=[];let ema=0.75,off=null;E.ev=[];
   for(let i=0;i<20;i++){const t0=0.3+i*0.5,sim=i<7,pre=SCENE.blk(sim?SCENE.KA2:['n','n','n','n','n','n','n','n']);
     const ta=t0+H.plen([L.srcPt,cmp])/v,on=off==null||ta<off;
     const small=sim&&on;const post=SCENE.blk(small?['s','s']:(sim?['','','','','d','']:['n','n','n','n','n','n']));
     ema=ema*0.6+(small?0.8:0.15)*0.4;E.ev.push([ta,ema]);if(off==null&&ema<0.4)off=ta+0.1;
     E.flow.push({pre,post,t0,ta})}
   E.off=off},
  draw(t){const cmp=H.P(L.st[2].cx,L.st[2].cy),v=320;
   E.flow.forEach(o=>{if(t<o.ta+0.15){SCENE.mv(o.pre,[L.srcPt,cmp],t,o.t0,v);o.post.style.opacity=0}
     else{o.pre.style.opacity=0;const a=SCENE.mv(o.post,[cmp,L.entry],t,o.ta+0.15,v);if(t>=a)o.post.style.opacity=1-H.ramp(t,a,a+0.2)}});
   let g=0.75;for(const [ta,e] of E.ev){if(t>=ta)g=e}
   E.gf.setAttribute('width',(L.gauge.w*g).toFixed(1));E.gf.setAttribute('class','fill '+(g<0.4?'rose':'sage'));
   const on=E.off==null||t<E.off;E.sw.textContent=T('相似性压缩：')+(on?T('开'):T('关'));E.sw.setAttribute('class','st '+(on?'sage-t':'ink3-t'));
   E.sw2.textContent=on?'':T('收益低，自动关掉');
   const fd=H.loopFade(t,12);[E.gf,E.sw,E.sw2].forEach(e=>e.style.opacity=fd)}}
]};
SCENE.toggle={steps:[3,4],get on(){return step===4?T('换成共享 SCM 上的表'):T('换成全新块')},get off(){return step===4?T('换成各自内存里的表'):T('换成相似块')},set(){}};

return SCENE}
/* ---------- 驱动 ---------- */
function applyVis(){
  svg.setAttribute('data-step',step+1);
  svg.querySelectorAll('[data-show]').forEach(g=>g.classList.toggle('hid',!g.dataset.show.split(' ').includes(String(step+1))));
  svg.querySelectorAll('[data-dim]').forEach(g=>g.classList.toggle('dim',g.dataset.dim.split(' ').includes(String(step+1))));
  const ts=SCENE.toggle;btn.hidden=!(ts&&ts.steps.includes(step));
}
function setToggle(v,flash){tgl=v;const ts=SCENE.toggle;if(!ts)return;btn.textContent='⇄ '+T(v?ts.off:ts.on);btn.setAttribute('aria-label',btn.textContent);
  if(L){const b=L.btn;btn.style.left=(b.x/L.W*100)+'%';btn.style.top=(b.y/L.H*100)+'%'}
  ts.set&&ts.set(v,flash);T0=performance.now();pausedAt=T0;}
btn.addEventListener('click',()=>{setToggle(!tgl,true);if(!paused&&!reduce&&!dead){cancelAnimationFrame(raf);raf=requestAnimationFrame(frame)}else still()});
function frame(now){const M=SCENE.modes[step],t=Math.max(0,(now-T0)/1000),per=M.period||1e9;const tc=per<1e8?t%per:t;
  E.pk.style.opacity=M.period&&!M.noFade?loopFade(tc,per):1;M.draw&&M.draw(tc,t);raf=requestAnimationFrame(frame)}
function still(){const M=SCENE.modes[step],tt=M.freeze!=null?M.freeze:(M.period||4)*0.7;E.pk.style.opacity=1;M.draw&&M.draw(tt,tt)}
function enter(i){
  step=i;cancelAnimationFrame(raf);E.pk.innerHTML='';
  applyVis();const M=SCENE.modes[i];M.enter&&M.enter();
  if(SCENE.toggle&&SCENE.toggle.steps.includes(i)){if(lastTg!==-1&&lastTg!==i)tgl=false;lastTg=i;setToggle(tgl,false);}
  T0=performance.now();pausedAt=T0;
  if(reduce||paused||dead){still();return}
  raf=requestAnimationFrame(frame);
}
function rebuild(){cancelAnimationFrame(raf);SCENE=makeScene();L=SCENE.layout(mq.matches);svg.innerHTML='';E={};svg.setAttribute('viewBox','0 0 '+L.W+' '+L.H);
  svg.setAttribute('aria-label',T("相似性压缩：找到只差几个字节的块，用同一本字典只存差异"));SCENE.build();E.pk=el('g',{});SCENE.overlay&&SCENE.overlay();setToggle(tgl,false);
  if(opts.onLayout)opts.onLayout(L.W/L.H,L.mobile);enter(step)}
mq.addEventListener('change',rebuild);
const onLang=()=>rebuild();document.addEventListener('ss-lang',onLang);
rebuild();
const ctrl={
  show(i){enter(Math.max(0,Math.min(SCENE.modes.length-1,i)))},
  pause(){if(paused)return;paused=true;pausedAt=performance.now();cancelAnimationFrame(raf)},
  resume(){if(!paused)return;paused=false;if(reduce||dead)return;T0+=performance.now()-pausedAt;cancelAnimationFrame(raf);raf=requestAnimationFrame(frame)},
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('v-sim')},
  ratio(){return L.W/L.H},
  step(){return step},
  at(t){cancelAnimationFrame(raf);E.pk.style.opacity=1;SCENE.modes[step].draw(t,t)},
  toggle(v){setToggle(!!v,false)}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['v-sim']={steps:6,mount:mount};
})();
