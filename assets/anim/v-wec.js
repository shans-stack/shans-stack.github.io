/* 宽条带纠删码：6 步动画（SVG，不依赖动画库）。由 out/v-wec/anim.html 改写成和 rdma.js 同样的接口。
   接口：
     var a = SSAnim['v-wec'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i)  切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件，页面翻到哪一步就调 show(i)。每一步的画面是「本轮时间 t」的函数。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   文字有中英两套（EN 表 + T()），跟着页面的 ss-lang 事件重画。样式在 assets/anim/v-wec.css。 */
(function(){
var EN={"示意：4 份数据（蓝）+ 2 份校验（黄）": "Schematic: 4 data (blue) + 2 parity (yellow)", "示意：4 份数据（蓝）+ 2 份校验（黄），每台服务器放一份": "Schematic: 4 data pieces (blue) + 2 parity (yellow), one per server", "所以一条带在一台服务器上只能放一份": "So a stripe can put only one piece on each server", "示意：只画 32 块盘，实际最宽 146+4": "Schematic: 32 drives shown; widest is 146+4", "示意：图中只画 32 块盘，黄色为校验份；实际条带最宽 146 份数据 + 4 份校验": "Schematic: only 32 drives shown, parity in yellow; the widest real stripe is 146 data + 4 parity", "示意：实际要读剩下的 146 份": "Schematic: a real stripe reads the other 146", "示意：图中读 31 份；实际 146+4 的条带要读剩下的 146 份": "Schematic: 31 pieces read here; a real 146+4 stripe reads the other 146", "已读 ": "Read ", " 份": " pieces", "服务器 ": "Server ", "4 块盘一起下线": "4 drives offline", "数据份": "Data", "校验份": "Parity", "约 2.7%": "~2.7%", "校验 ": "Parity ", "按份数比例画": "Drawn to scale by piece count", "客户端写入": "Client write", "DNode 掉线，盘仍在线": "DNode down, drives online", "改由另一个 DNode 接管": "Other DNode takes over", "只坏这一块盘": "Only this drive fails", "CNode 重建": "CNode rebuild", "读取量很高": "Reads: very high", "读取量升高": "Reads: rising", "读取量较低": "Reads: low", "宽条带纠删码：故障域缩到一块盘后，条带铺满所有盘，校验占比变小": "Wide-stripe erasure coding: once the failure domain is one drive, stripes span every drive and parity takes less space"};
function lang(){return window.SS_LANG==='en'?'en':'zh'}
function T(s){return lang()==='en'&&EN[s]!==undefined?EN[s]:s}
function mount(host,opts){
opts=opts||{};
/* ---------- 通用小引擎：每一步的画面都是「本轮时间 t」的函数 ---------- */
const NS='http://www.w3.org/2000/svg';
host.classList.add('v-wec');host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','v-wec-scene');svg.setAttribute('role','img');host.appendChild(svg);
const btn=document.createElement('button');btn.className='v-wec-btn';btn.type='button';btn.hidden=true;host.appendChild(btn);
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
/* 宽条带纠删码：服务器 / DBox 两套机箱，块沿 干线 → 总线 → 机箱接口 → 内部连线 → 盘 走 */

function makeScene(){
const SCENE={
layout(mobile){
  if(!mobile){
    const W=960,H=476,tb={x:400,y:14,w:160,h:46};
    const srv=[0,1,2,3,4,5].map(i=>({x:42+i*148,y:120,w:136,h:310,busY:96}));
    const dbx=[0,1,2,3].map(i=>({x:36+i*226,y:120,w:210,h:310,busY:96}));
    return {mobile,W,H,tb,trunkX:480,srv,dbx,pw:16,ph:14,f:{lbl:18,sm:16,big:24,note:16,tb:19},
      S:{hub:70,dy:100,dh:120,dw:22,dg:8,lab:280,st:255},
      D:{sw:18,nY:32,nH:40,nW:84,nDx:50,gY:108,dY:128,dh:92,dw:20,dg:5,lab:292,st1:240,st2:262},
      bars:{lx:60,bx:180,bw:560,bh:46,px:770,ys:[150,250,350],lab:'side',leg:{x:180,y:66},note:{x:180,y:430}},
      cnt:{x:385,y:37,a:'end'},meter:{x:600,y:22,w:170,sy:48},
      note:{x:32,y:456},btn:{x:480,y:456}};
  }
  const W=480,H=716,tb={x:170,y:12,w:140,h:42};
  const cx=[16,248];
  const srv=[0,1,2,3,4,5].map(i=>{const r=Math.floor(i/2);return {x:cx[i%2],y:92+r*204,w:216,h:180,busY:92+r*204-18}});
  const dbx=[0,1,2,3].map(i=>{const r=Math.floor(i/2);return {x:cx[i%2],y:92+r*310,w:216,h:270,busY:92+r*310-18}});
  return {mobile,W,H,tb,trunkX:240,srv,dbx,pw:16,ph:14,f:{lbl:17,sm:16,big:22,note:16,tb:17},
    S:{hub:42,dy:66,dh:64,dw:26,dg:16,lab:158,st:140},
    D:{sw:26,nY:38,nH:36,nW:80,nDx:52,gY:98,dY:116,dh:76,dw:20,dg:6,lab:252,st1:210,st2:230},
    bars:{lx:16,bx:16,bw:448,bh:40,px:464,ys:[200,360,520],lab:'top',leg:{x:16,y:96},note:{x:16,y:620}},
    cnt:{x:160,y:33,a:'end'},meter:{x:326,y:20,w:138,sy:44},
    note:{x:16,y:700},btn:{x:240,y:700}};
},
build(){
  const {el,tx,grp,rect,line,C,P}=H,f=L.f,tb=L.tb,X=L.trunkX;
  /* 上方的来源框 */
  const top=grp('1 2 3 4 6');
  rect(tb,'blk',top,10);
  E.tbT=tx(tb.x+tb.w/2,tb.y+tb.h/2,'',f.tb,'lbl b7','middle',top);
  /* 两套机箱 */
  E.srv=this.encl(L.srv,'srv',grp('1 2'));
  E.dbx=this.encl(L.dbx,'dbx',grp('3 4 6'));
  /* 第 1-2 步说明 */
  E.n1=tx(L.note.x,L.note.y,L.mobile?T('示意：4 份数据（蓝）+ 2 份校验（黄）'):T('示意：4 份数据（蓝）+ 2 份校验（黄），每台服务器放一份'),f.note,'ink3-t','start',grp('1'));
  E.n2=tx(L.note.x,L.note.y,T('所以一条带在一台服务器上只能放一份'),f.note,'rose-t st','start',grp('2'));
  tx(L.note.x,L.note.y,L.mobile?T('示意：只画 32 块盘，实际最宽 146+4'):T('示意：图中只画 32 块盘，黄色为校验份；实际条带最宽 146 份数据 + 4 份校验'),f.note,'ink3-t','start',grp('4'));
  tx(L.note.x,L.note.y,L.mobile?T('示意：实际要读剩下的 146 份'):T('示意：图中读 31 份；实际 146+4 的条带要读剩下的 146 份'),f.note,'ink3-t','start',grp('6'));
  /* 第 6 步：已读计数和读取量 */
  const g6=grp('6');
  const c=L.cnt;const ct=tx(c.x,c.y,'',L.mobile?17:20,'ink2-t',c.a,g6);ct.appendChild(document.createTextNode(T('已读 ')));
  E.cnt=el('tspan',{class:'num rose-t'},ct);E.cnt.textContent='0';ct.appendChild(document.createTextNode(T(' 份')));
  const m=L.meter;el('rect',{x:m.x,y:m.y,width:m.w,height:14,rx:4,class:'track'},g6);
  E.mf=el('rect',{x:m.x,y:m.y,width:0,height:14,rx:4,class:'fill'},g6);
  E.ms=tx(m.x,m.sy,'',f.sm,'st ink3-t','start',g6);
  /* 第 5 步：校验占比 */
  this.bars(grp('5'));
},
/* 画一组机箱，返回每块盘的路径 */
encl(list,kind,g){
  const {el,tx,grp,rect,line,P}=H,f=L.f,X=L.trunkX,tb=L.tb;
  const out={boxes:[],drives:[]};
  const rows=[...new Set(list.map(b=>b.busY))];
  // 干线：来源框底部 → 最后一排总线
  line([P(X,tb.y+tb.h),P(X,Math.max(...rows))],'base',g);
  rows.forEach(y=>{const xs=list.filter(b=>b.busY===y).map(b=>b.x+b.w/2);line([P(Math.min(X,...xs),y),P(Math.max(X,...xs),y)],'base',g)});
  list.forEach((b,i)=>{
    const cx=b.x+b.w/2,bg=grp(null,g),box={g:bg,drv:[]};
    box.frame=rect(b,'frame',bg,18);
    if(kind==='srv'){
      const S=L.S,hubY=b.y+S.hub,dy=b.y+S.dy,tot=4*S.dw+3*S.dg,x0=cx-tot/2;
      const dcx=[0,1,2,3].map(k=>x0+S.dw/2+k*(S.dw+S.dg));
      line([P(cx,b.busY),P(cx,hubY)],'base',bg);
      line([P(dcx[0],hubY),P(dcx[3],hubY)],'base',bg);
      dcx.forEach((x,k)=>{line([P(x,hubY),P(x,dy)],'base thin',bg);
        const r=rect({x:x-S.dw/2,y:dy,w:S.dw,h:S.dh},'drive',bg,4);
        const path=[P(X,tb.y+tb.h),P(X,b.busY),P(cx,b.busY),P(cx,hubY),P(x,hubY),P(x,dy+S.dh/2)];
        box.drv.push({r,path,x,y:dy+S.dh/2});});
      tx(cx,b.y+S.lab,T('服务器 ')+(i+1),f.lbl,'lbl','middle',bg);
      box.st=tx(cx,b.y+S.st,T('4 块盘一起下线'),f.sm,'rose-t st','middle',bg);box.st.style.opacity=0;
    }else{
      const D=L.D,sw=b.y+D.sw,nY=b.y+D.nY,gY=b.y+D.gY,dy=b.y+D.dY,tot=8*D.dw+7*D.dg,x0=cx-tot/2;
      const dcx=[...Array(8)].map((_,k)=>x0+D.dw/2+k*(D.dw+D.dg));
      line([P(cx,b.busY),P(cx,sw)],'base',bg);
      line([P(cx-D.nDx,sw),P(cx+D.nDx,sw)],'base',bg);
      box.dn=[];box.gl=[];box.dd=[];
      [0,1].forEach(h=>{const nx=cx+(h?D.nDx:-D.nDx);
        line([P(nx,sw),P(nx,nY)],'base',bg);
        const nb=rect({x:nx-D.nW/2,y:nY,w:D.nW,h:D.nH},'blk',bg,8);
        tx(nx,nY+D.nH/2,'DNode',f.sm,'lbl','middle',bg);
        box.dd.push(line([P(nx,nY+D.nH),P(nx,gY)],'base',bg));
        box.gl.push(line([P(dcx[h*4],gY),P(dcx[h*4+3],gY)],'base',bg));
        box.dn.push(nb);});
      box.bridge=line([P(dcx[3],gY),P(dcx[4],gY)],'sageL',bg);box.bridge.style.opacity=0;
      dcx.forEach((x,k)=>{line([P(x,gY),P(x,dy)],'base thin',bg);
        const r=rect({x:x-D.dw/2,y:dy,w:D.dw,h:D.dh},'drive',bg,4);
        const h=k<4?0:1,nx=cx+(h?D.nDx:-D.nDx);
        const path=[P(X,tb.y+tb.h),P(X,b.busY),P(cx,b.busY),P(cx,sw),P(nx,sw),P(nx,nY+D.nH),P(nx,gY),P(x,gY),P(x,dy+D.dh/2)];
        box.drv.push({r,path,x,y:dy+D.dh/2});});
      tx(cx,b.y+D.lab,'DBox '+(i+1),f.lbl,'lbl','middle',bg);
      box.st1=tx(cx,b.y+D.st1,'',f.sm,'st','middle',bg);box.st2=tx(cx,b.y+D.st2,'',f.sm,'st','middle',bg);
    }
    box.drv.forEach(d=>{out.drives.push(d);d.box=box;});
    out.boxes.push(box);
  });
  return out;
},
bars(g){
  const {el,tx,rect}=H,B=L.bars,f=L.f;
  const lg=B.leg;
  el('rect',{x:lg.x,y:lg.y-9,width:26,height:18,rx:3,class:'pkt'},g);tx(lg.x+36,lg.y,T('数据份'),f.sm,'ink2-t','start',g);
  el('rect',{x:lg.x+130,y:lg.y-9,width:26,height:18,rx:3,class:'pkt par'},g);tx(lg.x+166,lg.y,T('校验份'),f.sm,'ink2-t','start',g);
  E.bars=[[8,2,'20%'],[14,2,'12.5%'],[146,4,T('约 2.7%')]].map(([d,p,s],k)=>{
    const y=B.ys[k];
    if(B.lab==='side')tx(B.lx,y,d+'+'+p,f.big,'lbl b7','start',g);
    else tx(B.lx,y-B.bh/2-18,d+'+'+p,f.big,'lbl b7','start',g);
    el('rect',{x:B.bx,y:y-B.bh/2,width:B.bw,height:B.bh,rx:6,class:'track'},g);
    const rd=el('rect',{x:B.bx,y:y-B.bh/2,width:0,height:B.bh,rx:4,class:'fill slate'},g);
    const rp=el('rect',{x:B.bx,y:y-B.bh/2,width:0,height:B.bh,rx:4,class:'fill ochre'},g);
    const pt=B.lab==='side'?tx(B.px,y,T('校验 ')+s,f.big,'ochre-t b7','start',g):tx(B.px,y-B.bh/2-18,T('校验 ')+s,f.big,'ochre-t b7','end',g);
    return {rd,rp,pt,fd:d/(d+p)};});
  tx(B.note.x,B.note.y,T('按份数比例画'),f.note,'ink3-t','start',g);
},
/* 本步要用的块：每块盘一个位置 */
resetDrives(set){set.drives.forEach(d=>{d.r.setAttribute('class','drive');d.x2&&d.x2.remove();d.x2=null});set.boxes.forEach(b=>{b.frame.setAttribute('class','frame');if(b.st)b.st.style.opacity=0;
  if(b.dn){b.dn.forEach(n=>n.setAttribute('class','blk'));b.dd.forEach(l=>{l.setAttribute('class','ln base');l.style.opacity=1});b.gl.forEach(l=>{l.style.opacity=1;l.setAttribute('class','ln base')});b.bridge.style.opacity=0;b.st1.textContent='';b.st2.textContent='';}})},
cross(d,on){const {line,P}=H;if(!d.x2){const w=L.mobile?10:9;d.x2=H.el('g',{},d.r.parentNode);line([P(d.x-w,d.y-w),P(d.x+w,d.y+w)],'xmark',d.x2);line([P(d.x-w,d.y+w),P(d.x+w,d.y-w)],'xmark',d.x2)}d.x2.style.opacity=on;d.r.classList.toggle('bad',on>0.5)},
modes:[
 /* 1：切成 4+2，每台服务器一份 */
 {period:7.5,enter(){E.tbT.textContent=T('客户端写入');SCENE.resetDrives(E.srv);
   E.p=E.srv.boxes.map((b,i)=>({p:H.pk(i>=4?'par':''),d:b.drv[i%4]}))},
  draw(t){E.p.forEach((o,i)=>H.travel(o.p,o.d.path,t,0.5+i*0.45,420,{fadeIn:1}))}},
 /* 2：一台服务器挂掉 */
 {freeze:3,enter(){E.tbT.textContent=T('客户端写入');SCENE.resetDrives(E.srv);
   E.p=E.srv.boxes.map((b,i)=>{const p=H.pk(i>=4?'par':'');H.put(p,b.drv[i%4]);return {p,d:b.drv[i%4],b}})},
  draw(t){const a=H.ramp(t,0.8,1.3),bad=E.srv.boxes[2];
   bad.frame.setAttribute('class',a>0.5?'frame bad':'frame');bad.st.style.opacity=a;
   bad.drv.forEach(d=>d.r.classList.toggle('off',a>0.5));
   SCENE.cross(E.p[2].d,a);E.p[2].p.style.opacity=1-0.7*a;E.n2.style.opacity=H.ramp(t,1.4,1.9)}},
 /* 3：DNode 掉线，盘由另一个 DNode 接管；之后只坏一块盘 */
 {period:10,noFade:true,enter(){E.tbT.textContent='CNode';SCENE.resetDrives(E.dbx)},
  draw(t){const per=10,out=1-H.ramp(t,per-0.5,per),b=E.dbx.boxes[1],c=E.dbx.boxes[2];
   const a=H.ramp(t,1.0,1.4)*out,br=H.ramp(t,2.0,2.5)*out;
   b.dn[0].setAttribute('class',a>0.5?'blk bad':'blk');
   b.dd[0].setAttribute('class',a>0.5?'ln roseL':'ln base');b.dd[0].style.opacity=a>0.5?0.5:1;
   b.bridge.style.opacity=br;
   [b.gl[0],b.gl[1],b.dd[1]].forEach(l=>l.setAttribute('class',br>0.3?'ln sageL':'ln base'));
   b.st1.textContent=a>0.5?T('DNode 掉线，盘仍在线'):'';b.st1.setAttribute('class','st rose-t');
   b.st2.textContent=br>0.05?T('改由另一个 DNode 接管'):'';b.st2.setAttribute('class','st sage-t');b.st2.style.opacity=br;
   const d=c.drv[5],x=H.ramp(t,5.0,5.4)*out;SCENE.cross(d,x);
   c.st1.textContent=x>0.05?T('只坏这一块盘'):'';c.st1.setAttribute('class','st rose-t');c.st1.style.opacity=x}},
 /* 4：条带铺满所有盘 */
 {period:8,enter(){E.tbT.textContent='CNode';SCENE.resetDrives(E.dbx);
   E.p=E.dbx.drives.map((d,i)=>({p:H.pk(i%8===7?'par':''),d}))},
  draw(t){E.p.forEach((o,i)=>H.travel(o.p,o.d.path,t,0.4+i*0.11,520,{fadeIn:1}))}},
 /* 5：校验占比 */
 {freeze:4,enter(){},
  draw(t){const B=L.bars;E.bars.forEach((o,k)=>{const u=H.sm(H.ramp(t,0.3+k*0.8,1.1+k*0.8)),w=u*B.bw,wd=o.fd*B.bw;
   o.rd.setAttribute('width',Math.min(w,wd).toFixed(1));o.rp.setAttribute('x',(B.bx+wd).toFixed(1));o.rp.setAttribute('width',Math.max(0,w-wd).toFixed(1));
   o.pt.style.opacity=H.ramp(t,1.0+k*0.8,1.3+k*0.8)})}},
 /* 6：坏一块盘，其余每块盘分身出一份送去重建 */
 {period:9,enter(){E.tbT.textContent=T('CNode 重建');SCENE.resetDrives(E.dbx);
   const bad=E.dbx.boxes[1].drv[2];E.bad=bad;
   E.p=[];E.cp=[];let j=0;
   E.dbx.drives.forEach((d,i)=>{const p=H.pk(i%8===7?'par':'');H.put(p,d);E.p.push(p);
     if(d===bad){p.style.opacity=0.3;return}
     E.cp.push({p:H.pk((i%8===7?'par':'')+' cp'),d,t0:0.7+j*0.13});j++});},
  draw(t){SCENE.cross(E.bad,1);let n=0,lv=0;
   E.cp.forEach(o=>{const path=H.rev(o.d.path),arr=H.travel(o.p,path,t,o.t0,560,{post:0});
     if(t>=arr){n++;o.p.style.opacity=1-H.ramp(t,arr,arr+0.25);}
     lv+=H.ramp(t,arr,arr+0.6)});
   lv/=E.cp.length;E.cnt.textContent=n;
   const fd=H.loopFade(t,9);E.cnt.parentNode.style.opacity=fd;E.mf.style.opacity=fd;E.ms.style.opacity=fd;
   E.mf.setAttribute('width',(L.meter.w*Math.max(lv,0.02)).toFixed(1));
   E.ms.textContent=lv>0.66?T('读取量很高'):lv>0.3?T('读取量升高'):T('读取量较低');E.ms.setAttribute('class','st '+(lv>0.3?'rose-t':'ink3-t'))}}
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
  svg.setAttribute('aria-label',T("宽条带纠删码：故障域缩到一块盘后，条带铺满所有盘，校验占比变小"));SCENE.build();E.pk=el('g',{});SCENE.overlay&&SCENE.overlay();setToggle(tgl,false);
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
  at(t){cancelAnimationFrame(raf);E.pk.style.opacity=1;SCENE.modes[step].draw(t,t)},
  toggle(v){setToggle(!!v,false)}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['v-wec']={steps:6,mount:mount};
})();
