/* 快照：不复制数据，只留住那一刻的指针：7 步动画（SVG，按时间写死的时间线，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-snap'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-snap.css，全部限定在 .ssa-v-snap 容器之内。 */
(function(){
var EN={"VAST 快照：改写写进空闲空间，快照留住旧指针，按全局 snaptime 一致，按保护策略分层保留，可建克隆，可设为不可删除": "VAST snapshots: overwrites go to free space, a snapshot keeps the old pointers, snapshots are consistent by a global snaptime, kept in policy tiers, clonable and optionally indestructible", "数据块": "Chunks", "（闪存）": "(flash)", "当前版本": "Current", "写入": "Write", "管理员": "Admin", "克隆": "Clone", "快照 @ 42": "Snapshot @ 42", ".snapshot · 只读": ".snapshot · read-only", "快照 @ 42 · 不可删除": "Snapshot @ 42 · indestructible", "新数据写进空闲空间，旧块暂不覆盖": "New data goes to free space; the old chunk is not overwritten", "新数据写进空闲空间": "New data goes to free space", "指针改指新块，旧块等待回收": "The pointer moves to the new chunk; the old one awaits cleanup", "指针改指新块，旧块待回收": "Pointer moves; old chunk awaits cleanup", "打快照：复制了 0 个数据块": "Snapshot taken: 0 chunks copied", "打快照：复制 0 个数据块": "Snapshot: 0 chunks copied", "改写只影响当前版本，快照仍指旧块": "The overwrite changes only the current version; the snapshot still points to the old chunk", "快照仍指旧块": "Snapshot keeps the old chunk", "快照独占：": "Held only by the snapshot: ", " 块": " chunks", "不预留空间，不计入配额": "No reserved space, not counted against quota", "同一个 snaptime，三个路径一致": "One snaptime, three consistent paths", "三个路径各自不断写入": "Each path keeps receiving writes", "同一个 snaptime，三路径一致": "One snaptime, all consistent", "三个路径各自写入": "Each path receives writes", "每 15 分钟": "Every 15 min", "留 4 小时": "keep 4 hours", "每小时": "Hourly", "留 1 周": "keep 1 week", "每天": "Daily", "留 40 天": "keep 40 days", "每月": "Monthly", "留 1 年": "keep 1 year", "到期删除": "Expires", "现在": "Now", "四层计划同一时刻起算，到期的快照自动删除": "Four tiers start at the same moment; expired snapshots are deleted automatically", "四层计划，到期自动删除": "Four tiers, auto-expiry", "克隆与快照共用数据块": "Clone shares the snapshot's chunks", "写进克隆的新数据只属于克隆": "New data written to the clone belongs to the clone only", "新数据只属于克隆": "New data is the clone's only", "删除：拒绝": "Delete: refused", "延长保留：允许": "Extend: allowed", "可写克隆与快照共享数据块": "The writable clone shares data chunks with the snapshot.", "机制锁定时拒绝删除，允许延长保留期": "While locked: deletion blocked, retention can be extended.", "锁定时拒绝删除，允许延长": "While locked: block delete, allow extension", "延长后的保留期已到": "Extended retention ended", "延长后的保留期到期，释放快照引用": "The extended retention expires and releases snapshot references.", "保留期到期，释放引用": "Retention ends, releasing references", "示意，时间轴未按比例绘制": "Schematic timelines, not to scale"};
var ENM={"快照 @ 42 · 不可删除": "Snapshot · indestructible", "快照独占：": "Snapshot: ", "延长后的保留期已到": "Retention ended"};
var ARIA="VAST 快照：改写写进空闲空间，快照留住旧指针，按全局 snaptime 一致，按保护策略分层保留，可建克隆，可设为不可删除";
function lang(){return window.SS_LANG==='en'?'en':'zh'}
var NS='http://www.w3.org/2000/svg';
function mount(host,opts){
opts=opts||{};
host.classList.add('ssa-v-snap');host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','ssa-scene');svg.setAttribute('role','img');host.appendChild(svg);
const tgl=document.createElement('button');tgl.className='tgl';tgl.type='button';tgl.hidden=true;host.appendChild(tgl);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mq=matchMedia('(max-width: 640px)');
const qs=new URLSearchParams(location.search);
function T(s){if(lang()!=='en')return s;if(L&&L.mobile&&ENM[s]!==undefined)return ENM[s];return EN[s]!==undefined?EN[s]:s}
/* ---------- 通用小工具 ---------- */
function el(tag,a,p){const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);(p||svg).appendChild(e);return e}
function tx(x,y,s,size,cls,anchor,p){const t=el('text',{x,y,'font-size':size,class:cls||''},p);if(anchor)t.setAttribute('text-anchor',anchor);t.textContent=T(s);return t}
function setT(t,s,c){t.textContent=T(s);if(c!==undefined)t.setAttribute('class',c)}
function grp(show,p,extra){const g=el('g',Object.assign({class:'vis'},extra||{}),p);if(show)g.dataset.show=show;return g}
function box(r,p,cls,rx){return el('rect',{x:r.x,y:r.y,width:r.w,height:r.h,rx:rx==null?12:rx,class:cls||'box'},p)}
function line(a,b,cls,p){return el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'ln '+(cls||'')},p)}
function poly(pts,cls,p){return el('path',{d:'M'+pts.map(q=>q.x+' '+q.y).join(' L'),class:'ln '+(cls||'')},p)}
const C=r=>({x:r.x+r.w/2,y:r.y+r.h/2});
const P=(x,y)=>({x,y});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sm=u=>u<=0?0:u>=1?1:u*u*(3-2*u);
const fade=(t,t0,t1)=>clamp((t-t0)/(t1-t0),0,1);
function plen(pts){let s=0;for(let i=1;i<pts.length;i++)s+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);return s}
function at(pts,u){u=clamp(u,0,1);let d=u*plen(pts);for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],l=Math.hypot(b.x-a.x,b.y-a.y);if(d<=l||i===pts.length-1){const k=l?Math.min(1,d/l):0;return {x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k}}d-=l}return pts[pts.length-1]}
function rev(pts){return pts.slice().reverse()}
function cat(...ps){const o=[];ps.forEach(p=>p.forEach(q=>{const l=o[o.length-1];if(!l||l.x!==q.x||l.y!==q.y)o.push(q)}));return o}
let L=null,E,S,step=0,T0=0,raf=0,last=0,paused=!!opts.paused,dead=false,pausedAt=0;
function pk(c){const r=el('rect',{x:-L.pw/2,y:-L.ph/2,width:L.pw,height:L.ph,rx:4,class:'pkt '+(c||'')},E.pk);const o={el:r};S.items.push(o);put(o,-99,-99,0);return o}
function dot(c){const r=el('circle',{r:L.dr,cx:0,cy:0,class:'dot '+(c||'')},E.pk);const o={el:r};S.items.push(o);put(o,-99,-99,0);return o}
function put(o,x,y,a){if(typeof x==='object'){a=y;y=x.y;x=x.x}o.x=x;o.y=y;o.a=a==null?1:a;o.el.setAttribute('transform',`translate(${x.toFixed(1)} ${y.toFixed(1)})`);o.el.style.opacity=o.a}
function cls(o,c,on){(o.el||o).classList.toggle(c,!!on)}
/* 沿折线走：t0 开始，dur 秒走完，到终点后 fo 秒淡出。返回 -1 未开始，0–1 途中，>1 已到达 */
function run(o,pts,t,t0,dur,fo){fo=fo==null?0.3:fo;if(t<t0||t>t0+dur+fo){put(o,-99,-99,0);return t<t0?-1:2}const u=(t-t0)/dur;if(u<=1){put(o,at(pts,sm(u)),1);return u}put(o,pts[pts.length-1],1-(t-t0-dur)/fo);return 1.5}
const dur=pts=>plen(pts)/L.sp;
/* ---------- 场景 A（第 1、2、3、6、7 步）：上方「当前版本」指针行，中间一排闪存数据块，下方「快照」与「克隆」指针行。
   场景 B（第 4 步）：三个路径的时间线与同一个 snaptime。场景 C（第 5 步）：保护策略四层计划。 ---------- */
const SCENE={
 still:[2.6,4.2,4.6,5.0,5.0,4.4,5.0],
 layout(mobile){
  if(!mobile){
   const s={x0:196,st:88,w:72};
   return {W:960,H:392,mobile:false,f:{lbl:20,sm:17,cap:18},pw:30,ph:22,dr:7,sp:260,
    s,cellH:40,live:{y:36},lab:{x:176},lane0:88,wl:140,ch:{y:152,h:46},bl0:210,bot:{y:246},botLbl:304,
    wb:{x:800,y:36,w:144,h:40},snt:{x:700,y:56,a:'middle'},adm:{x:640,y:246,w:150,h:40},cnt:{x:716,y:266},
    cap:{x:480,y:350},note:{x:480,y:377},
    B:{rows:[110,190,270],lx:40,x0:220,x1:900,axY:52,tick:136,labIn:false},
    Cc:{rows:[76,146,216,286],lx:24,now:900,sp:104,sq:26,labIn:false}};
  }
  const s={x0:30,st:56,w:46};
  return {W:480,H:368,mobile:true,f:{lbl:18,sm:18,cap:18},pw:24,ph:18,dr:6,sp:180,
   s,cellH:36,live:{y:36},lab:{x:30,y:22},lane0:84,wl:136,ch:{y:148,h:42},chLbl:{x:468,y:124},bl0:202,bot:{y:236},botLbl:290,
   wb:{x:330,y:36,w:138,h:36},snt:{x:468,y:22,a:'end'},adm:{x:300,y:236,w:168,h:36},cnt:{x:376,y:254},
   cap:{x:240,y:328},note:{x:240,y:353},
   B:{rows:[96,170,244],lx:16,x0:40,x1:448,axY:40,tick:74,labIn:true},
   Cc:{rows:[66,142,218,294],lx:16,now:448,sp:72,sq:22,labIn:true}};
 },
 build(){
  const f=L.f,s=L.s;
  const sx=j=>s.x0+j*s.st, scx=j=>s.x0+j*s.st+s.w/2;E.scx=scx;
  /* ===== 场景 A ===== */
  const gA=grp('1 2 3 6 7');E.gA=gA;
  /* 数据块 */
  E.slot=[];for(let j=0;j<8;j++){const r={x:sx(j),y:L.ch.y,w:s.w,h:L.ch.h};const b=box(r,gA,'cell free',8);const t=tx(r.x+r.w/2,r.y+r.h/2,'',f.lbl,'lbl b7','middle',gA);E.slot.push({r,b,t})}
  if(!L.mobile)tx(L.lab.x,L.ch.y+L.ch.h/2,'数据块',f.sm,'ink2-t st','end',gA);else tx(L.chLbl.x,L.chLbl.y,'数据块',f.sm,'ink2-t st','end',gA);
  if(!L.mobile)tx(L.lab.x,L.ch.y+L.ch.h/2+22,'（闪存）',f.sm-1,'ink3-t','end',gA);
  /* 指针行：live 在上，snap 与 clone 在下 */
  E.row={};
  const mkRow=(k,cols,y,cls,show)=>{const g=grp(show,gA);const cells=[],lines=[];
   const lg=el('g',{},g);
   for(let i=0;i<4;i++){const r={x:sx(cols[i]),y,w:s.w,h:L.cellH};lines.push(el('path',{d:'',class:'ln ptr '+cls},lg));
    const b=box(r,g,'box ptrc '+cls,8);const t=tx(r.x+r.w/2,r.y+r.h/2,String(i+1),f.lbl,'lbl','middle',g);cells.push({r,b,t,col:cols[i]})}
   E.row[k]={g,cells,lines,top:k==='live'};return g};
  mkRow('live',[0,1,2,3],L.live.y,'live','1 2 3 6 7');
  mkRow('snap',[0,1,2,3],L.bot.y,'snap','2 3 6 7');
  mkRow('clone',[4,5,6,7],L.bot.y,'clone','6');
  if(!L.mobile)tx(L.lab.x,L.live.y+L.cellH/2,'当前版本',f.sm,'slate-t st','end',E.row.live.g);
  else tx(L.lab.x,L.lab.y,'当前版本',f.sm,'slate-t st','start',E.row.live.g);
  E.snapLbl=tx((sx(0)+sx(3)+s.w)/2,L.botLbl,'',f.sm,'violet-t st','middle',E.row.snap.g);
  E.lock=el('g',{class:'lock'},E.row.snap.g);
  E.cloneLbl=tx((sx(4)+sx(7)+s.w)/2,L.botLbl,'克隆',f.sm,'ochre-t st','middle',E.row.clone.g);
  /* 写入入口与 snaptime */
  const gW=grp('1 2 3 6 7',gA);const wb=L.wb;box(wb,gW);tx(wb.x+wb.w/2,wb.y+wb.h/2,'写入',f.lbl,'lbl','middle',gW);
  E.wbc=P(wb.x+wb.w/2,wb.y+wb.h);line(E.wbc,P(E.wbc.x,L.wl),'',gW);E.wlane=line(P(scx(4),L.wl),P(E.wbc.x,L.wl),'',gW);
  E.snt=tx(L.snt.x,L.snt.y,'',f.sm,'ink3-t st',L.snt.a);
  /* 管理员（第 7 步） */
  const gM=grp('7',gA);E.adm={r:L.adm};box(L.adm,gM);tx(L.adm.x+L.adm.w/2,L.adm.y+L.adm.h/2,'管理员',f.lbl,'lbl','middle',gM);
  E.admPath=[P(L.adm.x,L.adm.y+L.adm.h/2),P(sx(3)+s.w,L.adm.y+L.adm.h/2)];line(E.admPath[0],E.admPath[1],'',gM);
  E.admSt=tx(L.adm.x+L.adm.w/2,L.adm.y+L.adm.h+20,'',f.sm,'st','middle',gM);
  E.cnt=tx(L.cnt.x,L.cnt.y,'',f.lbl,'st','middle',grp('3',gA));
  /* ===== 场景 B：三个路径一起打快照 ===== */
  const B=L.B,gB=grp('4');E.B={};
  line(P(B.x0,B.axY),P(B.x1,B.axY),'thin',gB);
  for(let k=0;k<6;k++){const x=B.x0+k*B.tick;if(x>B.x1+1)break;line(P(x,B.axY-6),P(x,B.axY+6),'thin',gB);tx(x,B.axY-18,String(40+k),f.sm-1,'ink3-t','middle',gB)}
  if(!L.mobile)tx(B.lx,B.axY,'snaptime',f.sm,'ink3-t st','start',gB);
  E.B.x42=B.x0+2*B.tick;
  E.B.vl=line(P(E.B.x42,B.axY+10),P(E.B.x42,B.rows[2]+24),'snapv',gB);
  E.B.rows=['/app/data','/app/log','/app/conf'].map((nm,i)=>{const y=B.rows[i];
   if(B.labIn)tx(B.lx,y-22,nm,f.sm,'ink2-t st','start',gB);else tx(B.lx,y,nm,f.lbl,'lbl','start',gB);
   line(P(B.x0,y),P(B.x1,y),'',gB);
   const mk=el('rect',{x:E.B.x42-9,y:y-9,width:18,height:18,rx:3,class:'snapmk'},gB);return {y,mk}});
  E.B.cur=line(P(B.x0,B.axY+10),P(B.x0,B.rows[2]+24),'cursor',gB);
  E.B.tag=tx(E.B.x42,B.rows[2]+44,'',f.sm,'violet-t st','middle',gB);
  /* ===== 场景 C：保护策略四层计划 ===== */
  const Cc=L.Cc,gC=grp('5');E.C={};
  const tiers=[['每 15 分钟','留 4 小时'],['每小时','留 1 周'],['每天','留 40 天'],['每月','留 1 年']];
  const left=Cc.now-5.5*Cc.sp;E.C.left=left;
  E.C.rows=tiers.map((t,i)=>{const y=Cc.rows[i];
   if(Cc.labIn)tx(Cc.lx,y-24,T(t[0])+' · '+T(t[1]),f.sm,'ink2-t st','start',gC);
   else{tx(Cc.lx,y-10,t[0],f.lbl,'lbl','start',gC);tx(Cc.lx,y+14,t[1],f.sm,'ink3-t','start',gC)}
   line(P(left-Cc.sp*0.4,y),P(Cc.now,y),'thin',gC);return {y}});
  const top=Cc.rows[0]-(Cc.labIn?44:34),bot=Cc.rows[3]+22;
  tx(left,top,'到期删除',f.sm,'rose-t st','middle',gC);tx(Cc.now,top,'现在',f.sm,'ink2-t st','middle',gC);
  E.C.rows.forEach(r=>{line(P(left,r.y-16),P(left,r.y+16),'dash',gC);line(P(Cc.now,r.y-16),P(Cc.now,r.y+16),'thin',gC)});
  E.C.sync=line(P(Cc.now,Cc.rows[0]-16),P(Cc.now,bot),'snapv',gC);
  E.C.pool=E.C.rows.map(()=>{const a=[];for(let m=0;m<8;m++){const q=el('rect',{x:-99,y:-99,width:Cc.sq,height:Cc.sq,rx:4,class:'snapmk'},gC);a.push(q)}return a});
  E.cap=tx(L.cap.x,L.cap.y,'',f.cap,'st','middle');
  E.note=tx(L.note.x,L.note.y,'',f.sm-1,'ink3-t','middle');
 },
 reset(){
  E.slot.forEach(o=>{o.b.setAttribute('class','cell free');o.t.textContent='';o.t.setAttribute('class','lbl b7')});
  for(let j=0;j<4;j++)chunk(j,String(j+1),'');
  ['live','snap','clone'].forEach(k=>{const R=E.row[k];R.g.style.opacity='';R.cells.forEach((c,i)=>{c.b.setAttribute('class','box ptrc '+k);c.t.textContent=String(i+1)})});
  aim('live',[0,1,2,3]);aim('snap',[0,1,2,3]);aim('clone',[0,1,2,3]);
  E.lock.innerHTML='';E.snapLbl.textContent='';E.admSt.textContent='';E.cnt.textContent='';
  E.cap.textContent='';E.note.textContent='';E.snt.textContent='';
  E.B.vl.style.opacity=0;E.B.rows.forEach(r=>r.mk.style.opacity=0);E.B.tag.textContent='';
  E.C.pool.forEach(a=>a.forEach(q=>q.style.opacity=0));E.C.sync.style.opacity=0;
 },
 modes:[]
};
function cap(s,c,sm){E.cap.textContent=T(L.mobile&&sm?sm:s);E.cap.setAttribute('class','st '+(c||'ink2-t'))}
function note(s){E.note.textContent=T(s)}
function snt(n){E.snt.textContent='snaptime '+n}
/* 数据块状态：'' 有数据，'ok' 新写入，'old' 待回收，'snap' 只被快照引用，'free' 空闲 */
function chunk(j,label,st){const o=E.slot[j];o.t.textContent=label;o.b.setAttribute('class','cell'+(st?' '+st:''));o.t.setAttribute('class','lbl b7'+(st==='old'?' ink3-t':''))}
function ptr(k,i,j){const R=E.row[k],c=R.cells[i],cx=c.r.x+c.r.w/2,tx_=E.scx(j);
 if(R.top){const y0=c.r.y+c.r.h,y1=L.ch.y;if(c.col===j)return [P(cx,y0),P(cx,y1)];const ly=L.lane0+i*7;return [P(cx,y0),P(cx,ly),P(tx_,ly),P(tx_,y1)]}
 const y0=c.r.y,y1=L.ch.y+L.ch.h;if(c.col===j)return [P(cx,y0),P(cx,y1)];const ly=L.bl0+i*7;return [P(cx,y0),P(cx,ly),P(tx_,ly),P(tx_,y1)]}
function aim(k,arr){const R=E.row[k];arr.forEach((j,i)=>{const ln=R.lines[i];if(j==null){ln.setAttribute('d','');return}ln.setAttribute('d','M'+ptr(k,i,j).map(q=>q.x+' '+q.y).join(' L'))})}
function wpath(j){return [E.wbc,P(E.wbc.x,L.wl),P(E.scx(j),L.wl),P(E.scx(j),L.ch.y+L.ch.h/2)]}
function lockIcon(on){E.lock.innerHTML='';if(!on)return;const R=E.row.snap.cells[0].r,x=R.x-(L.mobile?0:26),y=R.y+R.h/2;if(L.mobile)return;
 el('rect',{x:x-8,y:y-3,width:16,height:12,rx:2,class:'lockb'},E.lock);el('path',{d:`M${x-5} ${y-3} V${y-7} a5 5 0 0 1 10 0 V${y-3}`,class:'lockh'},E.lock)}
/* 写入一个新块：t0 出发，到达后把块 j 标成 label，并把指针 k 行第 i 格改指 j */
function write(o,t,t0,j,label,after){const r=wpath(j),d=Math.min(dur(r),1.4);const p=run(o,r,t,t0,d,0.15);if(p>1){chunk(j,label,'ok');after&&after()}return p}
/* 第 1 步：改写写进空闲空间，旧块留在原处 */
SCENE.modes[0]={enter(){S.v.w=pk('ok')},
 frame(t){const per=6.5,u=t%per;snt(40+Math.floor(u/1.6));
  chunk(1,'2','');chunk(4,'','free');aim('live',[0,1,2,3]);cap('新数据写进空闲空间，旧块暂不覆盖','slate-t','新数据写进空闲空间');
  write(S.v.w,u,0.6,4,'2′',()=>{aim('live',[0,4,2,3]);chunk(1,'2','old')});
  if(u>2.4)cap('指针改指新块，旧块等待回收','slate-t','指针改指新块，旧块待回收')}};
/* 第 2 步：打快照，留住那一刻的指针 */
SCENE.modes[1]={enter(){S.v.w=pk('ok')},
 frame(t){const per=7.5,u=t%per;snt(u<0.6?41:42);
  E.row.snap.g.style.opacity=fade(u,0.6,1.1);setT(E.snapLbl,'快照 @ 42');
  chunk(2,'3','');chunk(4,'','free');aim('live',[0,1,2,3]);
  cap(u<2.4?'打快照：复制了 0 个数据块':'改写只影响当前版本，快照仍指旧块','violet-t',u<2.4?'打快照：复制 0 个数据块':'快照仍指旧块');
  write(S.v.w,u,2.4,4,'3′',()=>{aim('live',[0,1,4,3]);chunk(2,'3','snap')})}};
/* 第 3 步：只有改写和删除才占空间 */
SCENE.modes[2]={enter(){S.v.w=pk('ok')},
 frame(t){const per=7.5,u=t%per;snt(42);setT(E.snapLbl,'快照 @ 42');
  chunk(1,'2','');chunk(3,'4','');chunk(4,'','free');aim('live',[0,1,2,3]);
  const lc=E.row.live.cells[3];lc.b.setAttribute('class','box ptrc live');lc.t.textContent='4';
  let n=0;write(S.v.w,u,0.5,4,'2′',()=>{aim('live',[0,4,2,3]);chunk(1,'2','snap');n=1});
  if(u>3.6){aim('live',[0,4,2,null]);lc.b.setAttribute('class','box ptrc live gone');lc.t.textContent='';chunk(3,'4','snap');n=2}
  E.cnt.textContent=T('快照独占：')+n+(lang()==='en'&&n===1?' chunk':T(' 块'));E.cnt.setAttribute('class','st '+(n?'violet-t':'ink3-t'));
  cap('不预留空间，不计入配额','slate-t')}};
/* 第 4 步：同一个 snaptime，三个路径一致 */
const WR=[[0.05,0.2,0.34,0.5,0.68,0.86],[0.12,0.4,0.6,0.78,0.95],[0.08,0.27,0.46,0.63,0.9]];
SCENE.modes[3]={enter(){S.v.d=WR.map(r=>r.map(()=>dot()))},
 frame(t){const per=9,u=t%per,B=L.B,x=B.x0+(B.x1-B.x0)*clamp((u-0.3)/7,0,1);
  E.B.cur.setAttribute('x1',x);E.B.cur.setAttribute('x2',x);E.B.cur.style.opacity=u<8.6?1:0;
  WR.forEach((r,i)=>r.forEach((f0,k)=>{const xx=B.x0+(B.x1-B.x0)*f0,o=S.v.d[i][k];put(o,xx,E.B.rows[i].y,x>=xx&&u<8.8?1:0)}));
  const hit=x>=E.B.x42&&u<8.8;E.B.vl.style.opacity=hit?1:0;E.B.rows.forEach(r=>r.mk.style.opacity=hit?1:0);
  setT(E.B.tag,hit?'快照 @ 42':'');
  cap(hit?'同一个 snaptime，三个路径一致':'三个路径各自不断写入','violet-t',hit?'同一个 snaptime，三路径一致':'三个路径各自写入')}};
/* 第 5 步：保护策略四层计划，到期自动删除 */
SCENE.modes[4]={enter(){cap('四层计划同一时刻起算，到期的快照自动删除','violet-t','四层计划，到期自动删除');note('示意，时间轴未按比例绘制')},
 frame(t){const Cc=L.Cc;
  E.C.rows.forEach((r,i)=>{const I=0.9*Math.pow(2,i),k=Math.floor(t/I),pool=E.C.pool[i];
   pool.forEach((q,n)=>{const m=k-n,age=(t-m*I)/I,x=Cc.now-age*Cc.sp;
    if(m<0||x<E.C.left-Cc.sp*0.4){q.style.opacity=0;return}
    q.setAttribute('x',(x-Cc.sq/2).toFixed(1));q.setAttribute('y',r.y-Cc.sq/2);q.setAttribute('class','snapmk'+(x<E.C.left?' exp':''));
    q.style.opacity=x<E.C.left?clamp((x-(E.C.left-Cc.sp*0.4))/(Cc.sp*0.4),0,1):1})});
  const ph=t%7.2;E.C.sync.style.opacity=ph<0.5?1-ph/0.5:0}};
/* 第 6 步：.snapshot 只读，克隆几秒可读写 */
SCENE.modes[5]={enter(){S.v.w=pk('ochre')},
 frame(t){const per=7.5,u=t%per;snt(43);setT(E.snapLbl,'.snapshot · 只读');
  E.row.clone.g.style.opacity=fade(u,0.5,1.0);chunk(6,'','free');aim('clone',[0,1,2,3]);
  const cc=E.row.clone.cells[2];cc.b.setAttribute('class','box ptrc clone');
  cap(u<2.6?'可写克隆与快照共享数据块':'写进克隆的新数据只属于克隆','ochre-t',u<2.6?'克隆与快照共用数据块':'新数据只属于克隆');
  write(S.v.w,u,2.6,6,'3*',()=>{aim('clone',[0,1,6,3]);cc.b.setAttribute('class','box ptrc clone on')})}};
/* 第 7 步：不可删除快照 */
SCENE.modes[6]={enter(){S.v.q=dot('rose');S.v.e=dot('ok');chunk(4,'2′','');chunk(5,'3′','');aim('live',[0,4,5,3])},
 frame(t){const per=10,u=t%per;snt(42);lockIcon(u<6.6);
  E.row.snap.g.style.opacity=1-fade(u,6.6,7.4);
  chunk(1,'2',u<7.0?'snap':'old');chunk(2,'3',u<7.0?'snap':'old');
  setT(E.snapLbl,u<6.6?'快照 @ 42 · 不可删除':'延长后的保留期已到',u<6.6?'violet-t st':'ink3-t st');
  const r=E.admPath,d=dur(r);let st='',sc='st';
  const p1=run(S.v.q,u<0.4+d?r:rev(r),u,u<0.4+d?0.4:0.4+d,d,0.2);if(u>0.4+d&&u<3.4){st='删除：拒绝';sc='st rose-t'}
  const p2=run(S.v.e,u<3.6+d?r:rev(r),u,u<3.6+d?3.6:3.6+d,d,0.2);if(u>3.6+d&&u<6.4){st='延长保留：允许';sc='st sage-t'}
  setT(E.admSt,st,sc);
  cap(u<6.6?'机制锁定时拒绝删除，允许延长保留期':'延长后的保留期到期，释放快照引用',u<6.6?'violet-t':'ink2-t',u<6.6?'锁定时拒绝删除，允许延长':'保留期到期，释放引用')}};

/* ---------- 引擎 ---------- */
function applyVis(){
  svg.setAttribute('data-step',step+1);
  svg.querySelectorAll('[data-show]').forEach(g=>g.classList.toggle('hid',!g.dataset.show.split(' ').includes(String(step+1))));
  svg.querySelectorAll('[data-dim]').forEach(g=>g.classList.toggle('dim',g.dataset.dim.split(' ').includes(String(step+1))));
  const TG=curTG();tgl.hidden=!TG;
  if(TG){const q=(TG.pos&&TG.pos())||L.tgl;tgl.style.left=(q.x/L.W*100)+'%';tgl.style.top=(q.y/L.H*100)+'%';setToggle(TG,TG.state)}
}
function newSim(){if(S)S.items.forEach(o=>o.el.remove());S={items:[],v:{}}}
function loop(now){last=now;const t=Math.max(0,(now-T0)/1000);SCENE.modes[step].frame(t);raf=requestAnimationFrame(loop)}
function run_(){cancelAnimationFrame(raf);if(paused||dead||reduce)return;last=performance.now();raf=requestAnimationFrame(loop)}
function enter(i){
  step=i;cancelAnimationFrame(raf);newSim();
  SCENE.reset&&SCENE.reset();
  applyVis();
  const m=SCENE.modes[i];m.enter&&m.enter();
  if(reduce){m.frame((SCENE.still||[])[i]||1.5);return}
  m.frame(0);T0=pausedAt=performance.now();run_();
}
const TGS=SCENE.toggles||[];
function curTG(){return TGS.find(g=>g.step===step)}
function setToggle(TG,v){TG.state=v;tgl.textContent='⇄ '+T(TG.label(v));tgl.setAttribute('aria-label',T(TG.aria)+T(TG.name(v)))}
TGS.forEach(TG=>{const v=qs.get(TG.param);TG.state=(TG.values||[]).indexOf(v)>-1?v:TG.def});
tgl.addEventListener('click',()=>{const TG=curTG();if(!TG)return;setToggle(TG,TG.next(TG.state));enter(step)});
function build(){L=SCENE.layout(mq.matches);svg.innerHTML='';E={};svg.setAttribute('viewBox',`0 0 ${L.W} ${L.H}`);SCENE.build();E.pk=el('g',{});
  svg.setAttribute('aria-label',T(ARIA));if(opts.onLayout)opts.onLayout(L.W/L.H,L.mobile)}
function rebuild(){build();enter(step)}
mq.addEventListener('change',rebuild);
const onLang=()=>rebuild();document.addEventListener('ss-lang',onLang);
build();enter(0);
const ctrl={
  show(i){enter(Math.max(0,Math.min(SCENE.modes.length-1,i)))},
  pause(){if(paused)return;paused=true;cancelAnimationFrame(raf);pausedAt=performance.now()},
  resume(){if(!paused)return;paused=false;T0+=Math.max(0,performance.now()-pausedAt);run_()},
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('ssa-v-snap')},
  ratio(){return L.W/L.H},
  step(){return step},
  sim(){return {step,v:S.v,n:S.items.length,t:(performance.now()-T0)/1000}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['v-snap']={steps:7,mount:mount};
})();
