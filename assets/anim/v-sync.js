/* SyncEngine：把外部的数据搬进 VAST：6 步动画（SVG，按时间写死的时间线，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-sync'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-sync.css，全部限定在 .ssa-v-sync 容器之内。 */
(function(){
var ID='v-sync',NSTEP=6;
var EN={"对象存储":"Object store","NFS 文件系统":"NFS file system","协作平台":"Collaboration","S3 · GCS":"S3 · GCS","导出目录":"Export","Confluence 等":"Confluence etc.","SyncEngine":"SyncEngine","控制平面":"Control plane","调度 · 监控":"Schedules","标签 A":"Label A","VAST 集群":"VAST cluster","S3 bucket":"S3 bucket","NFS 导出目录":"NFS export","DataBase 表":"DataBase table","连接器":"Connector",
"常见迁移目标：VAST S3 或 NFS":"Common migration targets: VAST S3 or NFS","worker 从控制平面领任务":"Workers take tasks from the control plane",
"NFS 源端":"NFS source","目录 A":"Dir A","目录 B":"Dir B","目录 C":"Dir C","批":"Batch","逐层并行遍历，攒成批分给多个 worker":"Walk level by level in parallel, hand batches to several workers",
"SQS 队列":"SQS queue","S3 事件通知":"S3 event notices","新对象":"New object","扫描":"Scan","定期：按间隔整体重扫一遍":"Scheduled: rescan the whole source at each interval","事件驱动：变更通知进 SQS，只同步变化的对象":"Event-driven: change notices go to SQS; only changed objects sync","换成事件驱动":"Switch to event-driven","换成定期重同步":"Switch to scheduled resync","切换同步方式，当前 ":"Switch sync mode, now ","定期重同步":"scheduled resync","事件驱动":"event-driven",
"页面":"Page","页面.md":"Page.md","表格.xlsx":"Sheet.xlsx","表格.md":"Sheet.md","报告.pdf":"Report.pdf","A 组":"Group A","ACL：A 组":"ACL: Group A","格式转换与权限映射":"Format conversion and permission mapping",
"路径":"Path","大小":"Size","修改时间":"Modified","元数据":"Metadata","POSIX 元数据写入 DataBase":"POSIX metadata goes to DataBase","SQL：找出多年没改过的大文件":"SQL: find large files untouched for years",
"SyncEngine：迁移、重新同步与元数据索引":"SyncEngine: migration, resynchronization, and metadata indexing","迁移配置：源与目标连接器及路径":"Migration configuration: source and destination connectors and paths","POSIX 路径":"POSIX path","AWS S3 源":"AWS S3 source"};
var ENM={"对象存储":"Objects","NFS 文件系统":"NFS","协作平台":"SaaS","Confluence 等":"Confluence…","控制平面":"Control","调度 · 监控":"plane","常见迁移目标：VAST S3 或 NFS":"Targets: VAST S3 or NFS","逐层并行遍历，攒成批分给多个 worker":"Parallel walk, batches to workers","定期：按间隔整体重扫一遍":"Scheduled: full rescan","事件驱动：变更通知进 SQS，只同步变化的对象":"Event-driven: sync changed objects","换成事件驱动":"Event-driven","换成定期重同步":"Scheduled","格式转换与权限映射":"Format and ACL mapping","POSIX 元数据写入 DataBase":"POSIX metadata to DataBase","SQL：找出多年没改过的大文件":"SQL: old large files","S3 事件通知":"S3 events","NFS 导出目录":"NFS export","DataBase 表":"DB table","ACL：A 组":"ACL: A","A 组":"Group A","迁移配置：源与目标连接器及路径":"Connectors and paths"};
var ARIA="SyncEngine：迁移、重新同步与元数据索引";
function lang(){return window.SS_LANG==='en'?'en':'zh'}
var NS='http://www.w3.org/2000/svg';
function mount(host,opts){
opts=opts||{};
host.classList.add('ssa-'+ID);host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','ssa-scene');svg.setAttribute('role','img');host.appendChild(svg);
const tgl=document.createElement('button');tgl.className='tgl';tgl.type='button';tgl.hidden=true;host.appendChild(tgl);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mq=matchMedia('(max-width: 640px)');
const qs=new URLSearchParams(location.search);
let L=null,E,S,step=0,T0=0,raf=0,last=0,paused=!!opts.paused,dead=false,pausedAt=0;
/* 文字：中文原样，英文取 EN；手机版放不下的用 ENM */
function T(s){if(lang()!=='en')return s;if(L&&L.mobile&&ENM[s]!==undefined)return ENM[s];return EN[s]!==undefined?EN[s]:s}
/* ---------- 通用小工具 ---------- */
function el(tag,a,p){const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);(p||svg).appendChild(e);return e}
function tx(x,y,s,size,cls,anchor,p){const t=el('text',{x:+x.toFixed(1),y:+y.toFixed(1),'font-size':size,class:cls||''},p);if(anchor)t.setAttribute('text-anchor',anchor);t.textContent=T(s);return t}
function grp(show,p,extra){const g=el('g',Object.assign({class:'vis'},extra||{}),p);if(show)g.dataset.show=show;return g}
function box(r,p,cls,rx){return el('rect',{x:r.x,y:r.y,width:r.w,height:r.h,rx:rx==null?12:rx,class:cls||'box'},p)}
function line(a,b,cls,p){return el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'ln '+(cls||'')},p)}
function poly(pts,cls,p){return el('path',{d:'M'+pts.map(q=>q.x.toFixed(1)+' '+q.y.toFixed(1)).join(' L'),class:'ln '+(cls||'')},p)}
const R=(x,y,w,h)=>({x,y,w,h});
const C=r=>({x:r.x+r.w/2,y:r.y+r.h/2});
const P=(x,y)=>({x,y});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sm=u=>u<=0?0:u>=1?1:u*u*(3-2*u);
const fade=(t,t0,t1)=>clamp((t-t0)/(t1-t0),0,1);
function plen(pts){let s=0;for(let i=1;i<pts.length;i++)s+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);return s}
function at(pts,u){u=clamp(u,0,1);let d=u*plen(pts);for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],l=Math.hypot(b.x-a.x,b.y-a.y);if(d<=l||i===pts.length-1){const k=l?Math.min(1,d/l):0;return {x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k}}d-=l}return pts[pts.length-1]}
function rev(pts){return pts.slice().reverse()}
function cat(...ps){const o=[];ps.forEach(p=>p.forEach(q=>{const l=o[o.length-1];if(!l||Math.abs(l.x-q.x)>0.01||Math.abs(l.y-q.y)>0.01)o.push(q)}));return o}
/* 端口与折线：桌面从左往右流（右边中点到左边中点），手机从上往下流（下边中点到上边中点）；转角处走直角 */
const out_=(r,d)=>L.mobile?P(r.x+r.w/2+(d||0),r.y+r.h):P(r.x+r.w,r.y+r.h/2+(d||0));
const in_=(r,d)=>L.mobile?P(r.x+r.w/2+(d||0),r.y):P(r.x,r.y+r.h/2+(d||0));
function elbowH(a,b,mx){if(Math.abs(a.y-b.y)<0.5)return [a,b];mx=mx==null?(a.x+b.x)/2:mx;return [a,P(mx,a.y),P(mx,b.y),b]}
function elbowV(a,b,my){if(Math.abs(a.x-b.x)<0.5)return [a,b];my=my==null?(a.y+b.y)/2:my;return [a,P(a.x,my),P(b.x,my),b]}
function link(A,B,m,da,db){const a=out_(A,da),b=in_(B,db);return L.mobile?elbowV(a,b,m):elbowH(a,b,m)}
/* 会动的东西：数据块、圆点、带字的小牌子 */
function pk(cls,w,h){const W=w||L.pw,H=h||L.ph;const r=el('rect',{x:-W/2,y:-H/2,width:W,height:H,rx:4,class:'pkt '+(cls||'')},E.pk);const o={el:r};S.items.push(o);put(o,-99,-99,0);return o}
function dot(cls,r){const c=el('circle',{r:r||L.dr,cx:0,cy:0,class:'dot '+(cls||'')},E.pk);const o={el:c};S.items.push(o);put(o,-99,-99,0);return o}
function tile(s,w,h,cls,fs){const g=el('g',{class:'tile '+(cls||'')},E.pk);el('rect',{x:-w/2,y:-h/2,width:w,height:h,rx:6},g);const t=tx(0,0,s,fs||L.f.sm,'tt','middle',g);const o={el:g,t:t};S.items.push(o);put(o,-99,-99,0);return o}
function put(o,x,y,a){if(typeof x==='object'){a=y;y=x.y;x=x.x}o.x=x;o.y=y;o.a=a==null?1:a;o.el.setAttribute('transform',`translate(${x.toFixed(1)} ${y.toFixed(1)})`);o.el.style.opacity=o.a}
function setText(o,s){const v=T(s);if(o.t.textContent!==v)o.t.textContent=v}
function run(o,pts,t,t0,dur,fo){fo=fo==null?0.3:fo;if(t<t0||t>t0+dur+fo){put(o,-99,-99,0);return -1}const u=(t-t0)/dur;if(u<=1){put(o,at(pts,sm(u)),1);return u}put(o,pts[pts.length-1],1-(t-t0-dur)/fo);return 1.5}
const dur=(pts,sp)=>plen(pts)/(sp||L.sp);
function cap(s,c){E.cap.textContent=T(s);E.cap.setAttribute('class','st '+(c||'ink2-t'))}
function lit(els,c,on){(Array.isArray(els)?els:[els]).forEach(e=>e&&e.classList.toggle(c,!!on))}
/* ---------- 场景 ---------- */
const SCENE={
 still:[2.4,3.8,4.4,6.0,2.6,6.2],
 toggles:{3:{param:'sync',values:['sched','event'],label:v=>v==='sched'?'换成事件驱动':'换成定期重同步',aria:'切换同步方式，当前 ',name:v=>v==='sched'?'定期重同步':'事件驱动'}},
 layout(m){
  if(!m)return {W:960,H:520,mobile:false,f:{lbl:20,sm:17,cap:18,xs:17},pw:22,ph:16,dr:7,sp:330,cap:{x:480,y:506},tgl:{x:795,y:59},
   src:[R(40,24,250,70),R(355,24,250,70),R(670,24,250,70)],ctl:R(20,190,150,84),wc:[330,570,810],wy:200,ww:180,wh:64,se:R(220,190,720,84),
   fr:R(200,330,740,156),tg:[R(300,384,180,60),R(540,384,180,60)],tb:R(600,360,320,112),midA:147,midB:300,bus:176};
  return {W:480,H:620,mobile:true,f:{lbl:19,sm:17,cap:17,xs:17},pw:18,ph:14,dr:6,sp:240,cap:{x:240,y:600},tgl:{x:396,y:48},
   src:[R(12,16,144,64),R(168,16,144,64),R(324,16,144,64)],ctl:R(8,170,110,98),wc:[192,304,416],wy:196,ww:104,wh:64,se:R(8,176,464,84),
   fr:R(8,296,464,170),tg:[R(60,350,170,60),R(270,350,170,60)],tb:R(24,342,432,112),midA:128,midB:276,bus:158};
 },
 build(){
  const f=L.f,m=L.mobile,s={};E.s=s;
  /* 连线层先画，框画在上面，连线从框后面穿过 */
  s.ln={};['1','2','3','4','5','6','2 3 4 5 6'].forEach(k=>s.ln[k]=grp(k));
  s.wk=L.wc.map(x=>R(x-L.ww/2,L.wy,L.ww,L.wh));
  const sb=i=>P(C(L.src[i]).x,L.src[i].y+L.src[i].h),wt=j=>P(L.wc[j],L.wy),wb=j=>P(L.wc[j],L.wy+L.wh),tt=r=>P(C(r).x,r.y);
  s.path=(a,j,b)=>cat(elbowV(a,wt(j),L.midA),[wb(j)],elbowV(wb(j),b,L.midB));
  s.sb=sb;
  /* VAST 框与目标 */
  {const g=grp(null);box(L.fr,g,'box frame',16);tx(L.fr.x+16,L.fr.y+22,'VAST 集群',f.sm,'ttl','start',g);}
  {s.tgB=L.tg.map((r,i)=>{const b=box(r,grp(i?'1 3':'1 2 4 5'));tx(C(r).x,C(r).y,i?'NFS 导出目录':'S3 bucket',f.sm,'lbl','middle',grp(i?'1 3':'1 2 4 5'));return b})}
  /* 源端三个框（第 3 步换成目录树） */
  const sn=[['对象存储','S3 · GCS','1 2'],['NFS 文件系统','导出目录','1'],['协作平台','Confluence 等','1 5']];
  s.srcB=L.src.map((r,i)=>{const g=grp(sn[i][2]);const b=box(r,g);tx(r.x+(m?10:16),r.y+(m?22:24),sn[i][0],f.sm,'lbl b7','start',g);tx(r.x+(m?10:16),r.y+(m?46:50),sn[i][1],f.xs,'ink3-t','start',g);return b});
  /* 第 1 步：一个 SyncEngine 框 */
  {const g=grp('1');[0,1,2].forEach(i=>poly(cat(elbowV(sb(i),P([0,1,0][i]?C(L.tg[1]).x:C(L.tg[0]).x,L.se.y),L.midA),[tt(L.tg[[0,1,0][i]])]),'',s.ln['1']));
   box(L.se,g,'box fillv',14);tx(C(L.se).x,C(L.se).y,'SyncEngine',f.lbl,'violet-t st','middle',g);
   s.p1=[0,1,2].map(i=>{const t=L.tg[[0,1,0][i]];return cat(elbowV(sb(i),P(C(t).x,L.se.y),L.midA),[tt(t)])});}
  /* 第 2 步起：控制平面 + worker */
  {const g=grp('2 3 4 5 6');
   const c=L.ctl;const bus=L.bus,cx=C(c).x,lg=s.ln['2 3 4 5 6'];poly([P(cx,c.y),P(cx,bus),P(L.wc[2]-(m?30:50),bus)],'thin vio',lg);
   s.task=L.wc.map(x=>{const dx=x-(m?30:50);line(P(dx,bus),P(dx,L.wy),'thin vio',lg);return [P(cx,c.y),P(cx,bus),P(dx,bus),P(dx,L.wy)]});
   s.ctlB=box(c,g,'box fillv',12);tx(C(c).x,C(c).y-12,'控制平面',f.sm,'violet-t st','middle',g);tx(C(c).x,C(c).y+13,'调度 · 监控',f.xs,'ink3-t','middle',g);
   s.wB=s.wk.map((r,j)=>{const b=box(r,g);tx(C(r).x,C(r).y-11,'worker '+(j+1),f.sm,'lbl','middle',g);tx(C(r).x,C(r).y+13,'标签 A',f.xs,'ink3-t','middle',g);return b});}
  /* 第 2 步：连接器，三个 worker 一起搬 S3 */
  {const g=grp('2');s.p2=[0,1,2].map(j=>s.path(sb(0),j,tt(L.tg[0])));s.p2.forEach(p=>poly(p,'',s.ln['2']));
   const chip=(x,y)=>{const w=m?92:102,h=24;box(R(x-w/2,y-h/2,w,h),g,'box fillv',12);tx(x,y,'连接器',f.xs,'violet-t st','middle',g)};
   chip(L.src[0].x+L.src[0].w-(m?40:56),L.src[0].y+L.src[0].h);chip(L.tg[0].x+L.tg[0].w-(m?40:56),L.tg[0].y);}
  /* 第 3 步：目录树 + 分批 */
  {const g=grp('3');const top=m?10:8,fr=m?R(8,top,464,124):R(120,top,720,150);box(fr,g,'box soft',12);tx(fr.x+12,fr.y+18,'NFS 源端',f.xs,'ink3-t','start',g);
   const rootC=P(m?300:480,fr.y+(m?22:26)),dy=m?66:80,dxs=L.wc.map((x,i)=>m?[84,240,396][i]:[220,480,740][i]);
   s.root=box(R(rootC.x-26,rootC.y-14,52,28),g,'box',6);tx(rootC.x,rootC.y,'/',f.sm,'lbl mono','middle',g);
   poly([P(rootC.x,rootC.y+14),P(rootC.x,rootC.y+26)],'thin',g);line(P(dxs[0],rootC.y+26),P(dxs[2],rootC.y+26),'thin',g);
   s.dir=dxs.map((x,i)=>{line(P(x,rootC.y+26),P(x,dy-14+ (m?8:0)),'thin',g);const r=R(x-(m?40:46),dy-14+(m?8:0),m?80:92,28);const b=box(r,g,'box',6);tx(x,C(r).y,['目录 A','目录 B','目录 C'][i],f.xs,'lbl','middle',g);return {b,r}});
   s.files=s.dir.map(d=>[0,1,2,3].map(k=>el('rect',{x:C(d.r).x-40+k*21,y:d.r.y+(m?34:38),width:16,height:m?14:18,rx:3,class:'cell'},g)));
   s.p3=s.dir.map((d,i)=>{const a=P(C(d.r).x,fr.y+fr.h);return cat([P(C(d.r).x,d.r.y+(m?44:50))],s.path(a,i,tt(L.tg[1])))});
   s.p3.forEach(p=>poly(p.slice(1),'',s.ln['3']));
  }
  /* 第 4 步：定期重扫 / 事件驱动 */
  {const g=grp('4');const q=L.src[1],qg=el('g',{class:'vis'},g);s.qg=qg;s.qB=box(q,qg,'box och');tx(q.x+(m?10:16),q.y+(m?22:24),'SQS 队列',f.sm,'ochre-t b7','start',qg);tx(q.x+(m?10:16),q.y+(m?46:50),'S3 事件通知',f.xs,'ink3-t','start',qg);
   const s3=L.src[0];box(s3,g);tx(s3.x+12,s3.y+23,'AWS S3 源',f.sm,'lbl b7','start',g);s.ev1=[P(s3.x+s3.w,C(s3).y),P(q.x,C(q).y)];poly(s.ev1,'thin dash',qg);
   s.ev2=cat([P(C(q).x,q.y+q.h)],elbowV(P(C(q).x,q.y+q.h),wt(1),L.midA).slice(1));poly(s.ev2,'thin dash',qg);
   s.p4a=s.path(sb(0),0,tt(L.tg[0]));s.p4b=s.path(sb(0),1,tt(L.tg[0]));poly(s.p4a,'',s.ln['4']);poly(s.p4b,'',s.ln['4']);
   s.obj=el('rect',{x:s3.x+s3.w-(m?24:34),y:s3.y+(m?38:43),width:m?16:20,height:m?16:20,rx:3,class:'cell ok'},g);
   s.objT=tx(s3.x+12,s3.y+48,'新对象',f.xs,'sage-t st','start',g);
   s.scan=line(P(s3.x+8,s3.y+6),P(s3.x+8,s3.y+s3.h-6),'och',g);
   const b=L.tg[0];s.copy=el('rect',{x:b.x+b.w-(m?24:34),y:b.y+(m?8:10),width:m?16:20,height:m?16:20,rx:3,class:'cell ok'},g);}
  /* 第 5 步：协作平台 */
  {const g=grp('5');s.p5=s.path(sb(2),2,tt(L.tg[0]));poly(s.p5,'',s.ln['5'])}
  /* 第 6 步：元数据进 DataBase 表 */
  {const g=grp('6');box(L.src[1],g);tx(L.src[1].x+12,L.src[1].y+23,'POSIX 路径',f.sm,'lbl b7','start',g);s.p6=s.path(sb(1),1,P(C(L.tb).x,L.tb.y));poly(s.p6,'',s.ln['6']);
   const tb=L.tb;s.tbB=box(tb,g,'box',8);const cols=m?[180,110,142]:[150,70,100],hh=30,rh=26;let x=tb.x;
   ['路径','大小','修改时间'].forEach((k,c)=>{el('rect',{x,y:tb.y,width:cols[c],height:hh,class:'cell hd'},g);tx(x+cols[c]/2,tb.y+hh/2,k,f.xs,'ink2-t st','middle',g);x+=cols[c]});
   const D=[['/proj/a.dat','12 GB','2019'],['/proj/b.log','3 MB','2026'],['/arch/c.tar','80 GB','2018']];
   s.rows=D.map((d,k)=>{const y=tb.y+hh+rh/2+3+k*rh;const r=el('rect',{x:tb.x+3,y:y-rh/2+2,width:tb.w-6,height:rh-4,rx:3,class:'cell'},g);let xx=tb.x;
     const ts=d.map((v,c)=>{const t=tx(xx+cols[c]/2,y,v,17,'lbl mono','middle',g);xx+=cols[c];return t});r.style.opacity=0;ts.forEach(t=>t.style.opacity=0);return {r,ts,old:+d[2]<2020}});
   s.fileC=[0,1,2].map(k=>el('rect',{x:L.src[1].x+L.src[1].w-(m?60:96)+k*(m?18:28),y:L.src[1].y+(m?40:36),width:m?14:20,height:m?16:22,rx:3,class:'cell on'},g));
  }
 },
 reset(){svg.querySelectorAll('.box').forEach(b=>b.classList.remove('on','ok','hot','off'));cap('','')},
 modes:[]
};
/* 第 1 步 */
SCENE.modes[0]={enter(){cap('常见迁移目标：VAST S3 或 NFS','ink2-t');S.v.b=[pk(),pk(),pk('och')]},
 frame(t){const s=E.s,u=t%5;s.p1.forEach((p,i)=>{const r=run(S.v.b[i],p,u,0.2+i*0.6,dur(p),0.3);});
  s.tgB.forEach((b,i)=>b.classList.toggle('on',(i===0&&((u>0.2+dur(s.p1[0])&&u<0.2+dur(s.p1[0])+0.5)||(u>1.4+dur(s.p1[2])&&u<1.4+dur(s.p1[2])+0.5)))||(i===1&&u>0.8+dur(s.p1[1])&&u<1.3+dur(s.p1[1]))))}};
/* 第 2 步 */
SCENE.modes[1]={enter(){cap('迁移配置：源与目标连接器及路径','ink2-t');S.v.t=[0,1,2].map(()=>pk('vio',L.mobile?14:16,L.mobile?14:16));S.v.b=[0,1,2].map(()=>pk())},
 frame(t){const s=E.s,u=t%6.5;
  s.task.forEach((p,j)=>run(S.v.t[j],p,u,0.2+j*0.2,0.9,0.2));
  s.wB.forEach((b,j)=>b.classList.toggle('vio',u>1.1+j*0.2&&u<1.6+j*0.2));
  s.p2.forEach((p,j)=>{const d=dur(p);run(S.v.b[j],p,u,1.6+j*0.15,d,0.3);s.wB[j].classList.toggle('on',u>1.6+j*0.15+d*0.4&&u<1.6+j*0.15+d*0.62)});
  s.tgB[0].classList.toggle('on',u>4.0&&u<5.4)}};
/* 第 3 步 */
SCENE.modes[2]={enter(){cap('逐层并行遍历，攒成批分给多个 worker','slate-t');S.v.b=[0,1,2].map(()=>pk('',L.mobile?40:48,L.mobile?18:20))},
 frame(t){const s=E.s,u=t%8;
  s.root.classList.toggle('on',u>0.2&&u<7.6);s.dir.forEach((d,i)=>d.b.classList.toggle('on',u>0.8+i*0.15&&u<7.6));
  s.files.forEach((fs,i)=>fs.forEach((c,k)=>{c.setAttribute('class','cell'+(u>1.4+i*0.15+k*0.08&&u<2.4?' on':''));c.style.opacity=u>=2.4&&u<7.6?0.25:1}));
  s.p3.forEach((p,i)=>{const d=dur(p);run(S.v.b[i],p,u,2.4,d,0.3);s.wB[i].classList.toggle('on',u>2.4+d*0.4&&u<2.4+d*0.64)});
  s.tgB[1].classList.toggle('on',u>2.4+dur(s.p3[1])-0.3&&u<7.4)}};
/* 第 4 步：定期重扫或事件驱动（一个按钮切换） */
SCENE.modes[3]={enter(v){S.v.ev=v==='event';cap(S.v.ev?'事件驱动：变更通知进 SQS，只同步变化的对象':'定期：按间隔整体重扫一遍',S.v.ev?'ochre-t':'slate-t');
  S.v.b=pk('ok');S.v.e=dot('och');E.s.qg.style.display=S.v.ev?'':'none'},
 frame(t){const s=E.s,u=t%8,ev=S.v.ev,s3=L.src[0];
  s.obj.style.opacity=u>0.6?1:0;s.objT.style.opacity=u>0.6&&u<2?1:0;
  let t0;
  if(!ev){const sw=[0,4].map(a=>u>=a&&u<a+0.9?(u-a)/0.9:-1).find(x=>x>=0);s.scan.style.opacity=sw!=null?1:0;
    if(sw!=null){const x=s3.x+8+sw*(s3.w-16);s.scan.setAttribute('x1',x);s.scan.setAttribute('x2',x)}
    t0=4.6;run(S.v.b,s.p4a,u,t0,dur(s.p4a),0.3);put(S.v.e,-99,-99,0);s.wB[0].classList.toggle('on',u>t0+dur(s.p4a)*0.4&&u<t0+dur(s.p4a)*0.64);s.wB[1].classList.remove('on')}
  else{s.scan.style.opacity=0;const e=cat(s.ev1,s.ev2.slice(0));
    if(u<1.6)run(S.v.e,s.ev1,u,0.7,0.6,0);else run(S.v.e,s.ev2,u,1.4,0.8,0.2);
    s.qB.classList.toggle('on',u>1.25&&u<1.7);
    t0=2.4;run(S.v.b,s.p4b,u,t0,dur(s.p4b),0.3);s.wB[1].classList.toggle('on',u>t0+dur(s.p4b)*0.4&&u<t0+dur(s.p4b)*0.64);s.wB[0].classList.remove('on')}
  const arr=t0+dur(ev?s.p4b:s.p4a);s.copy.style.opacity=u>arr?1:0;s.tgB[0].classList.toggle('on',u>arr&&u<arr+0.8)}};
/* 第 5 步 */
const DOCS=[['页面','页面.md'],['表格.xlsx','表格.md'],['报告.pdf','报告.pdf']];
SCENE.modes[4]={enter(){cap('格式转换与权限映射','ink2-t');const m=L.mobile;S.v.p=pk();S.v.d=tile('',m?128:156,m?28:30,'');S.v.c=tile('',m?128:156,m?24:26,'vio',17)},
 frame(t){const s=E.s,u=t%10.8,k=Math.floor(u/3.6),v=u-k*3.6,p=s.p5,d=dur(p)*1.05;
  const pr=run(S.v.p,p,v,0.2,d,0.3);
  const conv=v>=0.2+d || (pr>=0 && S.v.p.y>=L.wy+L.wh/2);setText(S.v.d,conv?DOCS[k][1]:DOCS[k][0]);setText(S.v.c,conv?'ACL：A 组':'A 组');
  S.v.d.el.querySelector('rect').setAttribute('class',conv&&DOCS[k][0]!==DOCS[k][1]?'ok':'');
  const x=L.mobile?350:786,y=L.mobile?375:389;put(S.v.d,x,y,1);put(S.v.c,x,y+33,1);
  s.wB[2].classList.toggle('on',pr>0.35&&pr<0.62);s.tgB[0].classList.toggle('on',v>0.2+d&&v<0.2+d+0.6)}};
/* 第 6 步 */
SCENE.modes[5]={enter(){S.v.m=[0,1,2].map(()=>pk('vio'))},
 frame(t){const s=E.s,u=t%9.5,p=s.p6,d=dur(p)*0.8;
  for(let k=0;k<3;k++){const t0=0.3+k*0.9;const pr=run(S.v.m[k],p,u,t0,d,0.25);const on=u>t0+d&&u<9.2;const row=s.rows[k];
   row.r.style.opacity=on?1:0;row.ts.forEach(x=>x.style.opacity=on?1:0);row.r.setAttribute('class','cell'+(u>6.3&&row.old?' och':''));
   if(k===0)s.wB[1].classList.toggle('on',pr>0.35&&pr<0.65)}
  s.fileC.forEach(c=>c.setAttribute('class','cell on'));
  const q=u>6.3;cap(q?'SQL：找出多年没改过的大文件':'POSIX 元数据写入 DataBase',q?'ochre-t':'violet-t')}};
/* ---------- 引擎 ---------- */
const TG=SCENE.toggles||{};
const tstate={};Object.keys(TG).forEach(k=>{const g=TG[k],v=qs.get(g.param);tstate[k]=g.values.indexOf(v)>-1?v:g.values[0]});
function tog(){return tstate[step]}
function setToggleUI(){
  const g=TG[step];tgl.hidden=!g;if(!g)return;
  const v=tstate[step];tgl.textContent='⇄ '+T(g.label(v));tgl.setAttribute('aria-label',T(g.aria)+T(g.name(v)));
  const p=(L.tgls&&L.tgls[step])||L.tgl;tgl.style.left=(p.x/L.W*100)+'%';tgl.style.top=(p.y/L.H*100)+'%';
}
tgl.addEventListener('click',()=>{const g=TG[step];if(!g)return;const i=g.values.indexOf(tstate[step]);tstate[step]=g.values[(i+1)%g.values.length];enter(step)});
function applyVis(){
  svg.setAttribute('data-step',step+1);
  svg.querySelectorAll('[data-show]').forEach(g=>g.classList.toggle('hid',!g.dataset.show.split(' ').includes(String(step+1))));
  svg.querySelectorAll('[data-dim]').forEach(g=>g.classList.toggle('dim',g.dataset.dim.split(' ').includes(String(step+1))));
}
function newSim(){if(S)S.items.forEach(o=>o.el.remove());S={items:[],v:{}}}
function loop(now){last=now;const t=Math.max(0,(now-T0)/1000);SCENE.modes[step].frame(t);raf=requestAnimationFrame(loop)}
function go(){cancelAnimationFrame(raf);if(paused||dead||reduce)return;last=performance.now();raf=requestAnimationFrame(loop)}
function enter(i){
  step=i;cancelAnimationFrame(raf);newSim();
  SCENE.reset&&SCENE.reset();
  applyVis();setToggleUI();
  const m=SCENE.modes[i];m.enter&&m.enter(tog());
  if(reduce){m.frame((SCENE.still||[])[i]||1.5);return}
  m.frame(0);T0=pausedAt=performance.now();go();
}
function build(){
  L=SCENE.layout(mq.matches);svg.innerHTML='';E={};svg.setAttribute('viewBox',`0 0 ${L.W} ${L.H}`);
  SCENE.build();
  E.cap=tx(L.cap.x,L.cap.y,'',L.f.cap,'st',L.cap.a||'middle');
  E.pk=el('g',{class:'pkl'});
  svg.setAttribute('aria-label',T(ARIA));if(opts.onLayout)opts.onLayout(L.W/L.H,L.mobile);
}
function rebuild(){build();enter(step)}
mq.addEventListener('change',rebuild);
const onLang=()=>rebuild();document.addEventListener('ss-lang',onLang);
build();enter(0);
const ctrl={
  show(i){enter(Math.max(0,Math.min(SCENE.modes.length-1,i)))},
  pause(){if(paused)return;paused=true;cancelAnimationFrame(raf);pausedAt=performance.now()},
  resume(){if(!paused)return;paused=false;T0+=performance.now()-pausedAt;go()},
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('ssa-'+ID)},
  ratio(){return L.W/L.H},
  step(){return step},
  sim(){return {step,n:S.items.length,t:(performance.now()-T0)/1000,tog:tstate[step]}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim[ID]={steps:NSTEP,mount:mount};
})();
