/* SCM 写缓冲：5 步动画（SVG，不依赖动画库）。由 out/v-scm/anim.html 改写成和 rdma.js 同样的接口。
   接口：
     var a = SSAnim['v-scm'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i)  切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件，页面翻到哪一步就调 show(i)。每一步的画面是「本轮时间 t」的函数。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   文字有中英两套（EN 表 + T()），跟着页面的 ss-lang 事件重画。样式在 assets/anim/v-scm.css。 */
(function(){
var EN={"客户端": "Client", "SCM 盘 ": "SCM drive ", "两块盘在不同 DBox": "In two DBoxes", "切块 · 缩减": "Reduce", "组宽条带": "Wide stripe", "对齐闪存": "Flash align", "相似性压缩": "Similarity reduction", "攒超宽条带": "Very wide stripes", "按页对齐": "Page-aligned", "做相似性压缩": "Similarity", "攒成超宽条带": "Very wide EC", "按闪存页对齐": "Page-aligned", "回话之后，CNode 在后台做": "After the ACK, CNodes do it in the background", "QLC 闪存": "QLC flash", "保留区": "Reserved", "示意：假如重活在回话之前做": "Schematic: if the heavy work came before the ACK", "示意：假如重活都在回话之前做": "Schematic: if all the heavy work came before the ACK", "示意，不代表实测速度": "Schematic, not measured speed", "换成大块写": "Switch to large writes", "换成小块写": "Switch to small writes", "等待回话": "Waiting for ACK", "已回话": "ACK received", "SCM 占用很高": "SCM usage very high", "SCM 占用升高": "SCM usage rising", "SCM 占用较低": "SCM usage low", "SCM 写缓冲：写入先落 SCM 就回话，重活放到回话之后": "SCM write buffer: a write is acknowledged once it lands on SCM, and the heavy work happens after the ACK"};
function lang(){return window.SS_LANG==='en'?'en':'zh'}
function T(s){return lang()==='en'&&EN[s]!==undefined?EN[s]:s}
function mount(host,opts){
opts=opts||{};
/* ---------- 通用小引擎：每一步的画面都是「本轮时间 t」的函数 ---------- */
const NS='http://www.w3.org/2000/svg';
host.classList.add('v-scm');host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','v-scm-scene');svg.setAttribute('role','img');host.appendChild(svg);
const btn=document.createElement('button');btn.className='v-scm-btn';btn.type='button';btn.hidden=true;host.appendChild(btn);
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
/* SCM 写缓冲：上方 客户端 → CNode → 分叉 → 两块 SCM；下方 后台处理线 三个站 → QLC；CNode 正下方竖线直通 QLC 保留区 */

function makeScene(){
const SCENE={
layout(mobile){
  const P=H.P;
  if(!mobile){
    const C={x:30,y:92,w:120,h:56},N={x:220,y:92,w:120,h:56};
    const S1={x:520,y:64,w:300,h:48},S2={x:520,y:128,w:300,h:48};
    const st=[560,690,820].map(x=>({x:x-55,y:262,w:110,h:56,cx:x,cy:300,lx:x,ly:280}));
    const Q={x:230,y:380,w:670,h:52},res={x:230,w:110};
    const cout=P(150,120),n=P(280,120),J=P(440,120),J1=P(440,88),J2=P(440,152),s1=P(548,88),s2=P(548,152);
    const tail=[P(820,300),P(920,300),P(920,406),P(870,406)];
    return {mobile,W:960,H:476,pw:16,ph:14,f:{lbl:18,sm:16,st:17,note:16},C,N,S1,S2,st,Q,res,
      scmLab:{dx:84},lvl:{dx:184,w:104},
      wr:[cout,n,J,J1,P(520,88),s1],cp:[J,J2,P(520,152),s2],ack:[P(520,88),J1,J,n,cout],
      sync:[cout,n,P(280,300),P(560,300),P(690,300),...tail],
      drain:[s1,P(520,88),J1,P(440,300),P(560,300),P(690,300),...tail],
      big:[cout,n,P(280,406)],
      lines:[[cout,n,J],[J1,J2],[J1,P(520,88)],[J2,P(520,152)],[P(280,148),P(280,380)],[P(280,300),P(920,300),P(920,406),P(900,406)],[J2,P(440,300)]],
      dwell:[3,4,5],dwellD:[4,5,6],
      wait:{x:30,y:166,w:120,sy:192},cap:{dy:46},capT:{x:690,y:250},
      qLab:{x:640,y:406},resLab:{x:285,y:446},note:{x:32,y:456},btn:{x:760,y:456},
      lvlLab:{x:830,a:'start'}};
  }
  const C={x:16,y:76,w:110,h:48},N={x:150,y:76,w:100,h:48};
  const S1={x:316,y:48,w:148,h:44},S2={x:316,y:108,w:148,h:44};
  const st=[248,318,388].map(y=>({x:300,y:y-22,w:156,h:44,cx:430,cy:y,lx:364,ly:y}));
  const Q={x:16,y:470,w:448,h:50},res={x:150,w:100};
  const cout=P(126,100),n=P(200,100),J=P(290,100),J1=P(290,70),J2=P(290,130),s1=P(334,70),s2=P(334,130);
  const tail=[P(430,388),P(430,495)];
  return {mobile,W:480,H:650,pw:14,ph:12,f:{lbl:17,sm:16,st:16,note:16},C,N,S1,S2,st,Q,res,
    scmLab:{dx:30},lvl:{dx:92,w:48},
    wr:[cout,n,J,J1,P(316,70),s1],cp:[J,J2,P(316,130),s2],ack:[P(316,70),J1,J,n,cout],
    sync:[cout,n,P(200,200),P(430,200),P(430,248),P(430,318),...tail],
    drain:[s1,P(316,70),J1,P(290,200),P(430,200),P(430,248),P(430,318),...tail],
    big:[cout,n,P(200,495)],
    lines:[[cout,n,J],[J1,J2],[J1,P(316,70)],[J2,P(316,130)],[P(200,124),P(200,470)],[P(200,200),P(430,200),P(430,470)],[J2,P(290,200)]],
    dwell:[4,5,6],dwellD:[5,6,7],
    wait:{x:16,y:140,w:110,sy:164},cap:{dx:-82},capT:null,
    qLab:{x:24,y:495},resLab:{x:200,y:540},note:{x:16,y:630},btn:{x:300,y:584},
    lvlLab:null};
},
build(){
  const {el,tx,grp,rect,line,P}=H,f=L.f;
  const g=grp('1 2 3 4 5');
  L.lines.forEach(p=>line(p,'base',g));
  E.C=rect(L.C,'blk',g,10);tx(L.C.x+L.C.w/2,L.C.y+L.C.h/2,T('客户端'),f.lbl,'lbl b7','middle',g);
  E.N=rect(L.N,'blk',g,10);tx(L.N.x+L.N.w/2,L.N.y+L.N.h/2,'CNode',f.lbl,'lbl b7','middle',g);
  E.lv=[L.S1,L.S2].map((S,k)=>{const R=rect(S,'blk',g,10);
    tx(S.x+L.scmLab.dx,S.y+S.h/2,L.mobile?'SCM '+(k+1):T('SCM 盘 ')+(k+1),f.sm,'lbl b7','start',g);
    const lx=S.x+L.lvl.dx;el('rect',{x:lx,y:S.y+S.h/2-6,width:L.lvl.w,height:12,rx:4,class:'track'},g);
    const fl=el('rect',{x:lx,y:S.y+S.h/2-6,width:0,height:12,rx:4,class:'fill slate'},g);
    if(L.lvlLab)tx(L.lvlLab.x,S.y+S.h/2,'DBox '+(k+1),f.sm,'ink3-t',L.lvlLab.a,g);
    return {R,fl,lx}});
  if(!L.lvlLab)tx(L.S2.x,L.S2.y+L.S2.h+18,T('两块盘在不同 DBox'),f.sm,'ink3-t','start',g);
  E.st=L.st.map((s,k)=>{const R=rect(s,'blk',g,10);tx(s.lx,s.ly,[T('切块 · 缩减'),T('组宽条带'),T('对齐闪存')][k],f.st,'lbl','middle',g);
    const c=L.mobile?tx(s.x-8,s.cy,[T('相似性压缩'),T('攒超宽条带'),T('按页对齐')][k],f.sm,'st slate-t','end',g):tx(s.cx,s.y+s.h+22,[T('做相似性压缩'),T('攒成超宽条带'),T('按闪存页对齐')][k],f.sm,'st slate-t','middle',g);
    c.style.opacity=0;return {R,c}});
  if(L.capT)E.capT=tx(L.capT.x,L.capT.y,T('回话之后，CNode 在后台做'),f.sm,'st ink3-t','middle',g);
  E.Q=rect(L.Q,'blk',g,10);
  const rs=L.res;el('line',{x1:rs.x+rs.w,y1:L.Q.y+8,x2:rs.x+rs.w,y2:L.Q.y+L.Q.h-8,class:'ln base thin dash'},g);
  if(L.mobile)el('line',{x1:rs.x,y1:L.Q.y+8,x2:rs.x,y2:L.Q.y+L.Q.h-8,class:'ln base thin dash'},g);
  tx(L.qLab.x,L.qLab.y,T('QLC 闪存'),f.lbl,'lbl b7','start',g);
  E.resT=tx(L.resLab.x,L.resLab.y,T('保留区'),f.sm,'st ink3-t','middle',g);
  /* 等待回话 */
  const w=L.wait;el('rect',{x:w.x,y:w.y-6,width:w.w,height:12,rx:4,class:'track'},g);
  E.wf=el('rect',{x:w.x,y:w.y-6,width:0,height:12,rx:4,class:'fill'},g);
  E.ws=tx(w.x,w.sy,'',f.sm,'st','start',g);
  E.n1=tx(L.note.x,L.note.y,L.mobile?T('示意：假如重活在回话之前做'):T('示意：假如重活都在回话之前做'),f.note,'ink3-t','start',grp('1'));
  tx(L.note.x,L.note.y,T('示意，不代表实测速度'),f.note,'ink3-t','start',grp('2 3 4'));
  E.lvS=tx(L.mobile?16:L.S2.x,L.mobile?204:L.S2.y+L.S2.h+22,'',f.sm,'st','start',grp('4'));
},
toggle:{steps:[4],on:T('换成大块写'),off:T('换成小块写'),set(){}},
/* 关键帧：沿 pts 走，速度 v，在 dw 列出的点停 d 秒 */
kf(pts,t0,v,dw,d){const seg=[];let t=t0;for(let i=1;i<pts.length;i++){const l=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);seg.push({a:pts[i-1],b:pts[i],t0:t,t1:t+l/v});t+=l/v;
   if(dw&&dw.includes(i)){seg.push({a:pts[i],b:pts[i],t0:t,t1:t+d,st:dw.indexOf(i)});t+=d}}return {seg,t0,t1:t}},
at(k,t){if(t<k.t0)return null;if(t>=k.t1){const s=k.seg[k.seg.length-1];return {x:s.b.x,y:s.b.y,done:true}}
  for(const s of k.seg)if(t<s.t1){const u=(t-s.t0)/(s.t1-s.t0||1);return {x:s.a.x+(s.b.x-s.a.x)*u,y:s.a.y+(s.b.y-s.a.y)*u,st:s.st}}},
/* 一次小块写：块到 SCM1，分身到 SCM2，回话点回客户端 */
smallWrite(t0){const v=L.mobile?260:340;const a=this.kf(L.wr,t0,v),jt=t0+H.plen(L.wr.slice(0,3))/v;const c=this.kf(L.cp,jt,v);
  const tAck=Math.max(a.t1,c.t1)+0.1,k=this.kf(L.ack,tAck,v*1.6);return {a,c,k,p:H.pk(''),q:H.pk('cp'),d:this.dot(),t0,tAck,end:k.t1}},
dot(){const d=H.el('circle',{r:L.mobile?6:7,class:'ackdot'},E.pk);d.style.opacity=0;return d},
putDot(d,q,a){if(!q){d.style.opacity=0;return}d.setAttribute('cx',q.x.toFixed(1));d.setAttribute('cy',q.y.toFixed(1));d.style.opacity=a==null?1:a},
drawSmall(o,t){const pa=this.at(o.a,t),pc=this.at(o.c,t),pd=this.at(o.k,t);
  if(pa){H.put(o.p,pa,pa.done?1-H.ramp(t,o.a.t1+0.3,o.a.t1+0.6):1)}else o.p.style.opacity=0;
  if(pc){H.put(o.q,pc,pc.done?1-H.ramp(t,o.c.t1+0.3,o.c.t1+0.6):1)}else o.q.style.opacity=0;
  this.putDot(o.d,pd&&!pd.done?pd:null);},
waitBar(t,t0,t1,scale,ok){const w=L.wait;if(t<t0){E.wf.setAttribute('width',0);E.ws.textContent='';return}
  const el=Math.min(t,t1)-t0;E.wf.setAttribute('width',(w.w*Math.min(1,el/scale)).toFixed(1));
  E.wf.setAttribute('class','fill '+(ok?'sage':''));
  if(t<t1){E.ws.textContent=T('等待回话');E.ws.setAttribute('class','st rose-t')}else{E.ws.textContent=T('已回话');E.ws.setAttribute('class','st '+(ok?'sage-t':'ink3-t'))}},
level(k,v){E.lv[k].fl.setAttribute('width',(L.lvl.w*H.clamp(v,0,1)).toFixed(1))},
stOn(on){E.st.forEach((s,i)=>s.R.setAttribute('class',on[i]?'blk bad':'blk'))},
resetAll(){E.wf.setAttribute('width',0);E.ws.textContent='';this.level(0,0);this.level(1,0);this.stOn([0,0,0]);E.st.forEach(s=>s.c.style.opacity=0);if(E.capT)E.capT.style.opacity=0;E.resT.style.opacity=0;E.Q.setAttribute('class','blk')},
modes:[
 /* 1：同步做重活 */
 {period:10,enter(){SCENE.resetAll();const v=L.mobile?240:300;
   E.s=SCENE.kf(L.sync,0.5,v,L.dwell,0.9);E.k=SCENE.kf(H.rev(L.sync),E.s.t1+0.15,v*1.8);E.p=H.pk('');E.d=SCENE.dot()},
  draw(t){const q=SCENE.at(E.s,t);if(q){H.put(E.p,q,q.done?1-H.ramp(t,E.s.t1+0.4,E.s.t1+0.8):1);E.p.classList.toggle('cp',q.st!=null)}else E.p.style.opacity=0;
   const on=[0,0,0];if(q&&q.st!=null)on[q.st]=1;SCENE.stOn(on);
   const d=SCENE.at(E.k,t);SCENE.putDot(E.d,d&&!d.done?d:null);
   SCENE.waitBar(t,0.5,E.k.t1,9,false);const fd=H.loopFade(t,10);E.wf.style.opacity=fd;E.ws.style.opacity=fd}},
 /* 2：先落 SCM 就回话 */
 {period:7,enter(){SCENE.resetAll();E.w=[0.5,2.5,4.5].map(t0=>SCENE.smallWrite(t0))},
  draw(t){let cur=E.w[0],n=0;E.w.forEach(o=>{SCENE.drawSmall(o,t);if(t>=o.t0)cur=o;if(t>=o.a.t1)n++});
   SCENE.level(0,n/12+0.04);SCENE.level(1,n/12+0.04);
   SCENE.waitBar(t,cur.t0,cur.k.t1,9,true)}},
 /* 3：回话之后在后台做 */
 {period:10,enter(){SCENE.resetAll();const v=L.mobile?250:320;
   E.dr=[0,1,2,3,4,5].map(i=>{const k=SCENE.kf(L.drain,0.6+i*1.05,v,L.dwellD,0.4);return {k,p:H.pk('')}})},
  draw(t){const on=[0,0,0];let left=6;E.dr.forEach((o,i)=>{const q=SCENE.at(o.k,t);if(q){left--;H.put(o.p,q,q.done?1-H.ramp(t,o.k.t1+0.3,o.k.t1+0.7):H.ramp(t,o.k.t0,o.k.t0+0.12));
       o.p.classList.toggle('cp',q.st!=null);if(q.st!=null)on[q.st]=1}else o.p.style.opacity=0});
   SCENE.stOn(on);SCENE.level(0,left/12+0.02);SCENE.level(1,left/12+0.02);
   const first=E.dr[0].k;E.st.forEach((s,i)=>{const ts=first.seg.find(x=>x.st===i).t0;s.c.style.opacity=H.ramp(t,ts,ts+0.4)});
   if(E.capT)E.capT.style.opacity=H.ramp(t,0.2,0.6);E.ws.textContent=T('已回话');E.ws.setAttribute('class','st ink3-t');
   E.wf.setAttribute('width',(L.wait.w*0.12).toFixed(1));E.wf.setAttribute('class','fill sage')}},
 /* 4：写入与排空同时进行 */
 {period:11,enter(){SCENE.resetAll();const v=L.mobile?250:320;
   E.w=[];for(let t0=0.4;t0<9.6;t0+=0.75)E.w.push(SCENE.smallWrite(t0));
   // 排空：缓冲里至少有 2 份、离上次排空超过 0.6 秒就排一份
   let lv=3,last=-9,wi=0;E.dr=[];E.lvT=[];
   for(let t=0;t<11;t+=0.05){while(wi<E.w.length&&E.w[wi].a.t1<=t){lv++;wi++}
     if(lv>=2&&t-last>=0.6&&t>0.6&&t<9.8){lv--;last=t;E.dr.push({k:SCENE.kf(L.drain,t,v,L.dwellD,0.25),p:H.pk('')})}
     E.lvT.push(lv)}},
  draw(t){let cur=E.w[0];E.w.forEach(o=>{SCENE.drawSmall(o,t);if(t>=o.t0)cur=o});
   const on=[0,0,0];E.dr.forEach(o=>{const q=SCENE.at(o.k,t);if(q){H.put(o.p,q,q.done?1-H.ramp(t,o.k.t1+0.2,o.k.t1+0.5):H.ramp(t,o.k.t0,o.k.t0+0.12));if(q.st!=null)on[q.st]=1}else o.p.style.opacity=0});
   SCENE.stOn(on);const lv=E.lvT[Math.min(E.lvT.length-1,Math.floor(t/0.05))];SCENE.level(0,lv/12);SCENE.level(1,lv/12);
   E.lvS.textContent=lv/12>0.6?T('SCM 占用很高'):lv/12>0.35?T('SCM 占用升高'):T('SCM 占用较低');E.lvS.setAttribute('class','st '+(lv/12>0.35?'rose-t':'sage-t'));
   SCENE.waitBar(t,cur.t0,cur.k.t1,9,true)}},
 /* 5：大块写直接进 QLC 保留区（一个按钮切换） */
 {period:5,enter(){SCENE.resetAll();E.resT.style.opacity=1;const v=L.mobile?260:340;
   E.sw=SCENE.smallWrite(0.5);E.bg=SCENE.kf(L.big,0.5,v);E.bk=SCENE.kf(H.rev(L.big),E.bg.t1+0.15,v*1.6);
   E.bp=H.pk('big',L.pw*2.4,L.ph+4);E.bd=SCENE.dot()},
  draw(t,tt){const big=H.alt();
   if(!big){SCENE.drawSmall(E.sw,t);E.bp.style.opacity=0;SCENE.putDot(E.bd,null);SCENE.level(0,0.12);SCENE.level(1,0.12);SCENE.waitBar(t,0.5,E.sw.k.t1,9,true)}
   else{[E.sw.p,E.sw.q].forEach(p=>p.style.opacity=0);SCENE.putDot(E.sw.d,null);SCENE.level(0,0.04);SCENE.level(1,0.04);
     const q=SCENE.at(E.bg,t);if(q)H.put(E.bp,q,q.done?1-H.ramp(t,E.bg.t1+0.5,E.bg.t1+0.9):1);else E.bp.style.opacity=0;
     const d=SCENE.at(E.bk,t);SCENE.putDot(E.bd,d&&!d.done?d:null);SCENE.waitBar(t,0.5,E.bk.t1,9,true)}}}
]};

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
  svg.setAttribute('aria-label',T("SCM 写缓冲：写入先落 SCM 就回话，重活放到回话之后"));SCENE.build();E.pk=el('g',{});SCENE.overlay&&SCENE.overlay();setToggle(tgl,false);
  if(opts.onLayout)opts.onLayout(L.W/L.H,L.mobile);enter(step)}
mq.addEventListener('change',rebuild);
const onLang=()=>rebuild();document.addEventListener('ss-lang',onLang);
rebuild();
const ctrl={
  show(i){enter(Math.max(0,Math.min(SCENE.modes.length-1,i)))},
  pause(){if(paused)return;paused=true;pausedAt=performance.now();cancelAnimationFrame(raf)},
  resume(){if(!paused)return;paused=false;if(reduce||dead)return;T0+=performance.now()-pausedAt;cancelAnimationFrame(raf);raf=requestAnimationFrame(frame)},
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('v-scm')},
  ratio(){return L.W/L.H},
  step(){return step},
  at(t){cancelAnimationFrame(raf);E.pk.style.opacity=1;SCENE.modes[step].draw(t,t)},
  toggle(v){setToggle(!!v,false)}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['v-scm']={steps:5,mount:mount};
})();
