/* 向量检索：向量和原数据存在同一张表里：6 步动画（SVG，按时间写死的时间线，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-vec'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-vec.css，全部限定在 .ssa-v-vec 容器之内。
   VAST 字标用 <image> 引用 assets/brand/vast-wordmark-black.svg 与 -white.svg 原件（浅色黑字、深色白字），每个画面只标一处。 */
(function(){
var ID='v-vec',NSTEP=6;
var EN={"小猫":"Kitten","小狗":"Puppy","轿车":"Sedan","卡车":"Truck","提问：小猫咪":"Query: kitty","嵌入模型":"Embedding model","维度 1":"Dim 1","维度 2":"Dim 2","示意：实际向量有几百到上千维":"Schematic: real vectors have many more dimensions","提问":"Query","意思相近，向量也相近":"Similar meaning, nearby vectors","最近的 2 个：小猫、小狗":"Nearest 2: kitten, puppy",
"应用":"App","向量库":"Vector database","向量 + 原文的引用":"Vectors + references","存储":"Storage","原文":"Source content","同步：改动、删除、权限":"Sync: edits, deletes, permissions","第 1 次往返":"Round trip 1","第 2 次往返":"Round trip 2","检索要先查向量库，再去存储取原文":"Search queries the vector store, then fetches from storage","两处数据要一直保持同步":"Two copies must be kept in sync",
"写入":"Write","ID":"ID","片段":"Chunk","来源路径":"Source path","来源":"Source","时间":"Time","向量":"Vector","一次事务":"One transaction","向量和它的元数据在同一行，一次事务写入":"A vector and its metadata share a row, written in one transaction",
"向量检索的定义…":"What vector search…","距离函数的用法…":"Using distance fns…","建索引的限制…":"Index limits…","权限过滤规则…":"Permission rules…","距离":"Distance","结果：前 2 行":"Result: top 2 rows","被过滤":"Filtered out","先按 WHERE 筛，再按距离排序取前 2":"WHERE first, then sort by distance and take 2",
"研发组用户":"R&D user","人事组用户":"HR user","对象路径":"Object path","行级过滤：按对象路径核对读权限":"Row filter: read permission on the object path","同一条检索，按提问人的权限返回不同的行":"One search, different rows for different users","返回 2 行":"2 rows back",
"无索引：逐个算距离":"No index: score every row","有索引：只看相近的一组":"Index: nearby group only","已算距离":"Scored","建表时指定 · 每表一列 · 欧氏或余弦（负）内积":"Set at table creation · one column · Euclidean or cosine (negative) inner product","示意，不代表实测数字":"Schematic, not measured","找到最近的 2 个":"Nearest 2 found","索引让检索不必算遍每一行":"The index spares the search from scoring every row",
"向量检索：向量和原数据存在同一张表里，用 SQL 找最近邻并按权限过滤":"Vector search: vectors in the same table as the data, nearest neighbours in SQL, filtered by permission"};
var ENM={"示意：实际向量有几百到上千维":"Schematic: real vectors have far more dimensions","向量 + 原文的引用":"Vectors + refs","同步：改动、删除、权限":"Sync edits, deletes, permissions","检索要先查向量库，再去存储取原文":"Vector store first, then storage","向量和它的元数据在同一行，一次事务写入":"Vector and metadata in one row, one write","先按 WHERE 筛，再按距离排序取前 2":"WHERE, then nearest 2","行级过滤：按对象路径核对读权限":"Row filter on object path","同一条检索，按提问人的权限返回不同的行":"Same search, different rows per user","建表时指定 · 每表一列 · 欧氏或余弦（负）内积":"At table creation · one column","无索引：逐个算距离":"No index: score every row","有索引：只看相近的一组":"Index: nearby group only","索引让检索不必算遍每一行":"No need to score every row","提问：小猫咪":"Query: kitty","嵌入模型":"Embedding model","结果：前 2 行":"Top 2 rows","两处数据要一直保持同步":"Keep both in sync","最近的 2 个：小猫、小狗":"Nearest: kitten, puppy","向量检索的定义…":"What vector…","距离函数的用法…":"Distance fns…","权限过滤规则…":"Permissions…"};
var ARIA="向量检索：向量和原数据存在同一张表里，用 SQL 找最近邻并按权限过滤";
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
/* VAST 字标：<image> 引用 assets/brand/ 里的原件，浅色模式黑字、深色模式白字；(x,y) 为左端、竖直居中 */
function vlogo(x,y,h,p){const w=h*66/14,g=el('g',{class:'vlogo'},p),base=(window.SS_ROOT||'')+'assets/brand/';
  ['black','white'].forEach(c=>{const i=el('image',{x:x.toFixed(1),y:(y-h/2).toFixed(1),width:w.toFixed(1),height:h,class:c==='black'?'vwm-l':'vwm-d',preserveAspectRatio:'xMinYMid meet'},g);i.setAttribute('href',base+'vast-wordmark-'+c+'.svg')});
  g.w=w;return g}
/* 带 VAST 字标的标题：字标在前，名字紧跟其后，同一行 */
function vtitle(x,y,s,fs,cls,p,h){const g=vlogo(x,y,h||L.lg,p);return tx(x+g.w+Math.round(fs*0.4),y,s,fs,cls||'ttl','start',p)}
function cap(s,c){E.cap.textContent=T(s);E.cap.setAttribute('class','st '+(c||'ink2-t'))}
function lit(els,c,on){(Array.isArray(els)?els:[els]).forEach(e=>e&&e.classList.toggle(c,!!on))}
/* ---------- 场景 ---------- */
const SCENE={
 still:[7.2,6.5,5.6,6.2,2.6,3.2],
 layout(m){
  if(!m)return {W:960,H:500,mobile:false,f:{lbl:20,sm:17,cap:18,xs:16,big:28},pw:22,ph:16,dr:7,sp:330,lg:15,cap:{x:480,y:478},tgl:{x:480,y:478}};
  return {W:480,H:660,mobile:true,f:{lbl:19,sm:17,cap:17,xs:17,big:24},pw:18,ph:14,dr:6,sp:240,lg:13,cap:{x:240,y:640},tgl:{x:240,y:640}};
 },
 build(){
  const f=L.f,m=L.mobile;
  /* ===== 第 1 步：向量与最近邻 ===== */
  {const g=grp('1');const s={};E.s1=s;
   const names=['小猫','小狗','轿车','卡车'];
   s.tile=names.map((n,k)=>m?R([66,182,298,414][k]-50,12,100,40):R(24,62+k*62,160,44));
   s.qt=m?R(10,135,124,40):R(24,350,160,44);
   s.md=m?R(150,128,180,54):R(250,180,170,80);
   s.pl=m?R(16,222,448,340):R(500,40,436,370);
   box(s.pl,g,'box soft',12);
   tx(s.pl.x+s.pl.w-12,s.pl.y+s.pl.h-16,'维度 1',f.xs,'ink3-t','end',g);tx(s.pl.x+12,s.pl.y+18,'维度 2',f.xs,'ink3-t','start',g);
   tx(m?240:C(s.pl).x,m?584:438,'示意：实际向量有几百到上千维',f.xs,'ink3-t','middle',g);
   const UV=[[0.24,0.26],[0.46,0.16],[0.72,0.76],[0.88,0.56]],QV=[0.32,0.48];
   const map=uv=>P(s.pl.x+40+uv[0]*(s.pl.w-80),s.pl.y+40+uv[1]*(s.pl.h-80));
   s.pt=UV.map(map);s.qp=map(QV);
   s.tB=s.tile.map((r,k)=>{const b=box(r,g);tx(C(r).x,C(r).y,names[k],f.sm,'lbl','middle',g);return b});
   s.qB=box(s.qt,g,'box och');tx(C(s.qt).x,C(s.qt).y,'提问：小猫咪',f.sm,'ochre-t st','middle',g);
   box(s.md,g,'box fillv',12);tx(C(s.md).x,C(s.md).y,'嵌入模型',f.sm,'violet-t st','middle',g);
   // 连线
   s.pin=s.tile.map(r=>m?elbowV(P(C(r).x,r.y+r.h),P(C(s.md).x,s.md.y),112):elbowH(P(r.x+r.w,C(r).y),P(s.md.x,C(s.md).y),218));
   s.qin=m?[P(s.qt.x+s.qt.w,C(s.qt).y),P(s.md.x,C(s.qt).y)]:elbowH(P(s.qt.x+s.qt.w,C(s.qt).y),P(s.md.x,C(s.md).y),218);
   s.pin.forEach(p=>poly(p,'thin',g));poly(s.qin,'thin',g);
   const mo=m?P(240,s.md.y+s.md.h):P(s.md.x+s.md.w,C(s.md).y);
   s.pout=s.pt.concat([s.qp]).map(q=>m?[mo,P(240,204),P(q.x,204),P(q.x,q.y)]:[mo,P(462,mo.y),P(462,q.y),P(q.x,q.y)]);
   s.pout.forEach(p=>poly(p,'thin',g));
   s.dot=s.pt.map((q,k)=>{const c=el('circle',{cx:q.x,cy:q.y,r:m?8:9,class:'cell on'},g);c.style.opacity=0;const lf=k===0;const t=tx(lf?q.x-(m?12:14):q.x+(m?12:14),q.y-(m?14:16),names[k],f.sm,'lbl',lf?'end':'start',g);t.style.opacity=0;return {c,t}});
   s.qd=el('circle',{cx:s.qp.x,cy:s.qp.y,r:m?8:9,class:'cell och'},g);s.qd.style.opacity=0;s.qtx=tx(s.qp.x+(m?12:14),s.qp.y+(m?16:18),'提问',f.sm,'ochre-t st','start',g);s.qtx.style.opacity=0;
   s.nl=[0,1].map(k=>{const l=line(s.qp,s.pt[k],'ok',g);l.style.opacity=0;return l});
  }
  /* ===== 第 2 步：常见做法，两处存 ===== */
  {const g=grp('2');const s={};E.s2=s;
   s.app=m?R(150,20,180,56):R(390,28,180,58);s.vd=m?R(12,200,212,104):R(110,250,280,110);s.st=m?R(256,200,212,104):R(570,250,280,110);
   box(s.app,g);tx(C(s.app).x,C(s.app).y,'应用',f.sm,'lbl','middle',g);
   s.vdB=box(s.vd,g);tx(C(s.vd).x,C(s.vd).y-12,'向量库',f.sm,'lbl b7','middle',g);tx(C(s.vd).x,C(s.vd).y+14,'向量 + 原文的引用',f.xs,'ink3-t','middle',g);
   s.stB=box(s.st,g);tx(C(s.st).x,C(s.st).y-12,'存储',f.sm,'lbl b7','middle',g);tx(C(s.st).x,C(s.st).y+14,'原文',f.xs,'ink3-t','middle',g);
   const by=m?140:160,ab=P(C(s.app).x,s.app.y+s.app.h);
   s.p1=[ab,P(ab.x,by),P(C(s.vd).x,by),P(C(s.vd).x,s.vd.y)];s.p2=[ab,P(ab.x,by),P(C(s.st).x,by),P(C(s.st).x,s.st.y)];
   poly(s.p1,'',g);poly(s.p2,'',g);
   s.sy=[P(s.st.x,C(s.st).y),P(s.vd.x+s.vd.w,C(s.vd).y)];poly(s.sy,'dash vio',g);
   tx(m?240:480,m?336:s.vd.y+s.vd.h+30,'同步：改动、删除、权限',f.xs,'violet-t st','middle',g);
   s.cnt=tx(m?240:C(s.app).x+s.app.w/2+24,m?104:C(s.app).y,'',f.sm,'lbl st',m?'middle':'start',g);
   if(!m)s.cnt.setAttribute('x',s.app.x+s.app.w+24);
  }
  /* ===== 第 3 步：VAST，向量是表里的一列 ===== */
  {const g=grp('3');const s={};E.s3=s;
   s.wr=m?R(150,12,180,48):R(20,190,150,60);s.fr=m?R(8,88,464,432):R(216,40,724,330);
   box(s.fr,g,'box frame',16);vtitle(s.fr.x+16,s.fr.y+24,'Element Store',f.sm,'ttl',g);
   box(s.wr,g);tx(C(s.wr).x,C(s.wr).y,'写入',f.sm,'lbl','middle',g);
   const cols=m?[{k:'ID',w:40},{k:'片段',w:156},{k:'来源',w:90},{k:'向量',w:150}]:[{k:'ID',w:48},{k:'片段',w:176},{k:'来源路径',w:104},{k:'时间',w:80},{k:'向量',w:118}];
   s.tb=m?R(22,140,436,34+4*46):R(244,92,526,34+4*48);const rh=m?46:48,hh=34;s.rh=rh;
   box(s.tb,g,'box',8);let x=s.tb.x;s.colX=[];cols.forEach(c=>{el('rect',{x,y:s.tb.y,width:c.w,height:hh,class:'cell hd'},g);tx(x+c.w/2,s.tb.y+hh/2,c.k,f.xs,'ink2-t st','middle',g);s.colX.push(x);x+=c.w});
   const D=[['1','向量检索的定义…','a.pdf','09-01','[0.12, …]'],['2','距离函数的用法…','a.pdf','09-01','[0.48, …]'],['3','建索引的限制…','b.pdf','09-03','[0.07, …]'],['4','权限过滤规则…','c.pdf','09-05','[0.91, …]']];
   s.rowY=D.map((_,k)=>s.tb.y+hh+rh/2+k*rh);
   s.rows=D.map((d,k)=>{const y=s.rowY[k];const r=el('rect',{x:s.tb.x+3,y:y-rh/2+3,width:s.tb.w-6,height:rh-6,rx:4,class:'cell'},g);
    const ts=cols.map((c,ci)=>{const v=m?[d[0],d[1],d[2],d[4]][ci]:d[ci];const t=tx(s.colX[ci]+c.w/2,y,v,f.xs,ci===cols.length-1?'slate-t mono':'lbl','middle',g);return t});
    r.style.opacity=0;ts.forEach(t=>t.style.opacity=0);return {r,ts}});
   // 原文文件
   const files=['a.pdf','b.pdf','c.pdf'];
   s.files=files.map((n,i)=>m?R([92,240,388][i]-54,420,108,46):R(808,104+i*84,110,48));
   s.files.forEach((r,i)=>{box(r,g,'box soft',8);tx(C(r).x,C(r).y,n=files[i],f.sm,'lbl','middle',g)});
   tx(m?240:C(s.files[0]).x,m?494:s.files[0].y-18,'原文',f.xs,'ink3-t','middle',g);
   const fi={'a.pdf':0,'b.pdf':1,'c.pdf':2};
   s.links=D.map((d,k)=>{const fr=s.files[fi[d[2]]];let pts;
    if(!m)pts=[P(s.tb.x+s.tb.w,s.rowY[k]),P(790,s.rowY[k]),P(790,C(fr).y),P(fr.x,C(fr).y)];
    else{const cx=s.colX[2]+cols[2].w/2;pts=[P(cx,s.tb.y+s.tb.h),P(cx,400),P(C(fr).x,400),P(C(fr).x,fr.y)]}
    const l=poly(pts,'dash',g);l.style.opacity=0;return l});
   // 插入走线
   if(!m){const bx=s.tb.x-12;line(P(s.wr.x+s.wr.w,C(s.wr).y),P(bx,C(s.wr).y),'',g);poly([P(bx,s.rowY[0]),P(bx,s.rowY[3])],'thin',g);s.rowY.forEach(y=>line(P(bx,y),P(s.tb.x,y),'thin',g));
     s.ins=k=>[P(s.wr.x+s.wr.w,C(s.wr).y),P(bx,C(s.wr).y),P(bx,s.rowY[k]),P(s.tb.x+40,s.rowY[k])];}
   else{const by=s.tb.y-16,bx=14;line(P(240,s.wr.y+s.wr.h),P(240,by),'',g);line(P(bx,by),P(240,by),'thin',g);poly([P(bx,by),P(bx,s.rowY[3])],'thin',g);s.rowY.forEach(y=>line(P(bx,y),P(s.tb.x,y),'thin',g));
     s.ins=k=>[P(240,s.wr.y+s.wr.h),P(240,by),P(bx,by),P(bx,s.rowY[k]),P(s.tb.x+30,s.rowY[k])];}
   s.tx=tx(m?240:C(s.tb).x,m?s.tb.y+s.tb.h+22:s.tb.y+s.tb.h+26,'',f.xs,'sage-t st','middle',g);
  }
  /* ===== 第 4 步：SQL 找最近邻 + 过滤 ===== */
  {const g=grp('4');const s={};E.s4=s;
   s.sq=m?R(12,10,456,112):R(24,18,912,58);box(s.sq,g,'box soft',10);
   const sql=m?["SELECT 片段 FROM t","WHERE 时间 >= '2026-09'","ORDER BY array_distance(向量, 提问)","LIMIT 2"]:["SELECT 片段 FROM t WHERE 时间 >= '2026-09' ORDER BY array_distance(向量, 提问) LIMIT 2"];
   sql.forEach((l,i)=>{const t=tx(s.sq.x+14,s.sq.y+(m?20+i*24:29),l,m?17:16,'mono lbl','start',g);t.classList.add('sqlt')});
   const R6=[['片段 A','2026-07',0.12],['片段 B','2026-09',0.35],['片段 C','2026-10',0.18],['片段 D','2026-08',0.09],['片段 E','2026-09',0.61],['片段 F','2026-11',0.27]];s.R6=R6;
   const cols=m?[150,140,166]:[200,150,190],hh=34,rh=m?44:46;
   s.tb=m?R(12,136,456,hh+6*rh):R(24,100,540,hh+6*rh);box(s.tb,g,'box',8);
   let x=s.tb.x;s.cx=[];['片段','时间','距离'].forEach((k,c)=>{el('rect',{x,y:s.tb.y,width:cols[c],height:hh,class:'cell hd'},g);tx(x+cols[c]/2,s.tb.y+hh/2,k,f.xs,'ink2-t st','middle',g);s.cx.push(x+cols[c]/2);x+=cols[c]});
   s.rowY=R6.map((_,k)=>s.tb.y+hh+rh/2+k*rh);
   s.rows=R6.map((d,k)=>{const y=s.rowY[k];const r=el('rect',{x:s.tb.x+3,y:y-rh/2+3,width:s.tb.w-6,height:rh-6,rx:4,class:'cell'},g);
    tx(s.cx[0],y,d[0],f.sm,'lbl','middle',g);tx(s.cx[1],y,d[1],f.sm,'lbl mono','middle',g);const dt=tx(s.cx[2],y,'',f.sm,'mono st','middle',g);
    const rk=tx(s.tb.x+s.tb.w-12,y,'',f.sm,'sage-t st','end',g);return {r,dt,rk}});
   s.res=m?R(110,470,260,104):R(640,190,296,140);s.resB=box(s.res,g);tx(C(s.res).x,s.res.y+24,'结果：前 2 行',f.sm,'ttl','middle',g);
   s.rl=[0,1].map(i=>tx(C(s.res).x,s.res.y+(m?56:64)+i*(m?28:34),'',f.sm,'sage-t st','middle',g));
   const ex=m?null:s.tb.x+s.tb.w;
   s.out=k=>m?[P(s.tb.x+s.tb.w-30,s.rowY[k]),P(s.tb.x+s.tb.w+6,s.rowY[k]),P(s.tb.x+s.tb.w+6,s.tb.y+s.tb.h+12),P(C(s.res).x,s.tb.y+s.tb.h+12),P(C(s.res).x,s.res.y)]
                 :[P(ex-30,s.rowY[k]),P(600,s.rowY[k]),P(600,C(s.res).y),P(s.res.x,C(s.res).y)];
   [2,5].forEach(k=>poly(s.out(k),'thin',g));
  }
  /* ===== 第 5 步：按提问人的权限过滤 ===== */
  {const g=grp('5');const s={};E.s5=s;
   s.u=m?[R(26,14,200,54),R(254,14,200,54)]:[R(24,118,190,62),R(24,300,190,62)];
   const un=['研发组用户','人事组用户'];s.uB=s.u.map((r,i)=>{const b=box(r,g,'box '+(i?'och':'on'));tx(C(r).x,C(r).y,un[i],f.sm,'lbl','middle',g);return b});
   const cols=m?[130,190,116]:[120,150,110],hh=34,rh=m?48:50;
   s.tb=m?R(12,150,436,hh+4*rh):R(330,96,380,hh+4*rh);s.tb.w=cols.reduce((a,b)=>a+b,0);if(m)s.tb.x=(480-s.tb.w)/2;
   box(s.tb,g,'box',8);let x=s.tb.x;s.cx=[];['片段','对象路径','向量'].forEach((k,c)=>{el('rect',{x,y:s.tb.y,width:cols[c],height:hh,class:'cell hd'},g);tx(x+cols[c]/2,s.tb.y+hh/2,k,f.xs,'ink2-t st','middle',g);s.cx.push(x+cols[c]/2);x+=cols[c]});
   const D=[['片段 1','rd/设计.pdf'],['片段 2','hr/制度.pdf'],['片段 3','rd/接口.pdf'],['片段 4','hr/假期.pdf']];s.D=D;
   s.rowY=D.map((_,k)=>s.tb.y+hh+rh/2+k*rh);
   s.rows=D.map((d,k)=>{const y=s.rowY[k];const r=el('rect',{x:s.tb.x+3,y:y-rh/2+3,width:s.tb.w-6,height:rh-6,rx:4,class:'cell'},g);
    tx(s.cx[0],y,d[0],f.sm,'lbl','middle',g);tx(s.cx[1],y,d[1],f.xs,'lbl mono','middle',g);tx(s.cx[2],y,'[…]',f.xs,'slate-t mono','middle',g);return r});
   tx(m?240:C(s.tb).x,s.tb.y+s.tb.h+24,'行级过滤：按对象路径核对读权限',f.xs,'ink3-t','middle',g);
   // 走线：用户 → 表
   if(m){s.p=s.u.map(r=>[P(C(r).x,r.y+r.h),P(C(r).x,s.tb.y)]);s.p.forEach(p=>poly(p,'',g));
     s.back=(i,k)=>[P(C(s.u[i]).x,s.tb.y),P(C(s.u[i]).x,s.u[i].y+s.u[i].h)];}
   else{const bx=270;s.p=s.u.map((r,i)=>[P(r.x+r.w,C(r).y),P(bx,C(r).y),P(bx,s.rowY[i?2:1]),P(s.tb.x,s.rowY[i?2:1])]);
     s.u.forEach(r=>line(P(r.x+r.w,C(r).y),P(bx,C(r).y),'',g));poly([P(bx,C(s.u[0]).y),P(bx,C(s.u[1]).y)],'',g);s.rowY.forEach(y=>line(P(bx,y),P(s.tb.x,y),'thin',g));
     s.back=(i,k)=>[P(s.tb.x+30,s.rowY[k]),P(bx,s.rowY[k]),P(bx,C(s.u[i]).y),P(s.u[i].x+s.u[i].w,C(s.u[i]).y)];}
   s.ret=s.u.map((r,i)=>tx(m?C(r).x:r.x,m?r.y+r.h+18:r.y+r.h+22,'',f.xs,'st','middle',g));
   if(!m)s.ret.forEach((t,i)=>{t.setAttribute('x',C(s.u[i]).x)});
  }
  /* ===== 第 6 步：向量索引，两边同时跑 ===== */
  {const g=grp('6');const s={};E.s6=s;
   tx(m?240:24,m?20:30,'建表时指定 · 每表一列 · 欧氏或余弦（负）内积',f.xs,'ink2-t st',m?'middle':'start',g);
   tx(m?240:936,m?606:30,'示意，不代表实测数字',f.xs,'ink3-t',m?'middle':'end',g);
   s.pl=m?[R(12,44,456,262),R(12,330,456,262)]:[R(24,60,440,350),R(496,60,440,350)];
   const ttl=['无索引：逐个算距离','有索引：只看相近的一组'];
   // 32 个点，按四个象限各 8 个（种子固定）
   let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
   const UV=[];for(let qd=0;qd<4;qd++)for(let k=0;k<8;k++){const ux=(qd%2)*0.5+0.06+rnd()*0.38,uy=(qd>>1)*0.5+0.08+rnd()*0.36;UV.push([ux,uy,qd])}
   const QV=[0.31,0.27];s.UV=UV;
   const d2=UV.map(u=>Math.hypot(u[0]-QV[0],u[1]-QV[1]));const ord=d2.map((d,i)=>i).sort((a,b)=>d2[a]-d2[b]);s.near=ord.slice(0,2);
   s.order=[];for(let i=0;i<32;i++)s.order.push(i);
   s.qorder=UV.map((u,i)=>i).filter(i=>UV[i][2]===0);
   s.P=[];s.cnt=[];s.pts=[];s.ql=[];
   s.pl.forEach((pl,j)=>{box(pl,g,'box soft',12);tx(pl.x+14,pl.y+20,ttl[j],f.sm,'ttl','start',g);
    const ar=R(pl.x+16,pl.y+40,pl.w-32,pl.h-56);const map=u=>P(ar.x+u[0]*ar.w,ar.y+u[1]*ar.h);
    if(j===1){for(let qd=0;qd<4;qd++){const r=R(ar.x+(qd%2)*ar.w/2+3,ar.y+(qd>>1)*ar.h/2+3,ar.w/2-6,ar.h/2-6);const b=el('rect',{x:r.x,y:r.y,width:r.w,height:r.h,rx:8,class:'cell'},g);b.style.fillOpacity=0;if(qd===0)s.cell0=b}}
    s.pts.push(UV.map(u=>{const q=map(u);return el('circle',{cx:q.x,cy:q.y,r:m?5:6,class:'cell'},g)}));
    const qp=map(QV);el('circle',{cx:qp.x,cy:qp.y,r:m?7:8,class:'cell och'},g);tx(qp.x+12,qp.y-12,'提问',f.xs,'ochre-t st','start',g);
    s.ql.push(s.near.map(i=>{const l=line(qp,map(UV[i]),'ok thin',g);l.style.opacity=0;return l}));
    s.cnt.push(tx(pl.x+pl.w-14,pl.y+20,'',f.sm,'lbl st','end',g));
   });
  }
 },
 reset(){svg.querySelectorAll('.box').forEach(b=>b.classList.remove('on','ok','hot','off'));cap('','')},
 modes:[]
};
/* 第 1 步 */
SCENE.modes[0]={enter(){cap('意思相近，向量也相近','ink2-t');S.v.t=[0,1,2,3].map(k=>tile(['小猫','小狗','轿车','卡车'][k],L.mobile?60:70,L.mobile?26:28,''));S.v.v=[0,1,2,3].map(()=>dot());S.v.qt=tile('提问',L.mobile?60:70,L.mobile?26:28,'och');S.v.qv=dot('och')},
 frame(t){const s=E.s1,u=t%10;
  for(let k=0;k<4;k++){const t0=0.2+k*0.7;run(S.v.t[k],s.pin[k],u,t0,0.8,0.15);const p=run(S.v.v[k],s.pout[k],u,t0+0.95,0.9,0.1);
   const on=u>t0+1.85&&u<9.6;s.dot[k].c.style.opacity=on?1:0;s.dot[k].t.style.opacity=on?1:0}
  run(S.v.qt,s.qin,u,3.4,0.8,0.15);run(S.v.qv,s.pout[4],u,4.35,0.9,0.1);
  const qon=u>5.25&&u<9.6;s.qd.style.opacity=qon?1:0;s.qtx.style.opacity=qon?1:0;
  const nn=u>5.8&&u<9.6;s.nl.forEach(l=>l.style.opacity=nn?1:0);
  [0,1].forEach(k=>s.dot[k].c.setAttribute('class','cell '+(nn?'ok':'on')));
  cap(nn?'最近的 2 个：小猫、小狗':'意思相近，向量也相近',nn?'sage-t':'ink2-t')}};
/* 第 2 步 */
SCENE.modes[1]={enter(){S.v.q=pk();S.v.ids=[0,1,2].map(()=>pk('',12,12));S.v.rq=pk();S.v.or=[0,1,2].map(()=>pk('ok'));S.v.sy=pk('vio')},
 frame(t){const s=E.s2,u=t%8.5;
  run(S.v.q,s.p1,u,0.3,1.0,0.1);S.v.ids.forEach((o,i)=>run(o,rev(s.p1),u,1.5+i*0.12,1.0,0.1));
  run(S.v.rq,s.p2,u,2.9,1.0,0.1);S.v.or.forEach((o,i)=>run(o,rev(s.p2),u,4.1+i*0.12,1.0,0.1));
  s.vdB.classList.toggle('on',u>1.2&&u<1.8);s.stB.classList.toggle('on',u>3.8&&u<4.4);
  s.cnt.textContent=u>0.3&&u<2.8?T('第 1 次往返'):u>=2.8&&u<5.6?T('第 2 次往返'):'';
  run(S.v.sy,s.sy,u,5.8,1.2,0.3);s.vdB.classList.toggle('vio',u>6.9&&u<7.8);
  cap(u<5.6?'检索要先查向量库，再去存储取原文':'两处数据要一直保持同步',u<5.6?'ink2-t':'violet-t')}};
/* 第 3 步 */
SCENE.modes[2]={enter(){cap('向量和它的元数据在同一行，一次事务写入','sage-t');S.v.r=[0,1,2,3].map(()=>{const g=el('g',{class:'rowt'},E.pk);['','och','vio','ok','slate'].forEach((c,i)=>el('rect',{x:-30+i*12,y:-7,width:10,height:14,rx:2,class:'pkt '+c},g));const o={el:g};S.items.push(o);put(o,-99,-99,0);return o})},
 frame(t){const s=E.s3,u=t%9;
  for(let k=0;k<4;k++){const t0=0.3+k*1.3,p=s.ins(k),d=dur(p)*0.8;run(S.v.r[k],p,u,t0,d,0.1);const on=u>t0+d&&u<8.6;
   s.rows[k].r.style.opacity=on?1:0;s.rows[k].ts.forEach(x=>x.style.opacity=on?1:0);s.links[k].style.opacity=on?1:0;
   s.rows[k].r.setAttribute('class','cell'+(on&&u<t0+d+0.7?' ok':''))}
  s.tx.textContent=u>0.8&&u<8.6?T('一次事务'):''}};
/* 第 4 步 */
SCENE.modes[3]={enter(){cap('先按 WHERE 筛，再按距离排序取前 2','slate-t');S.v.o=[0,1].map(()=>pk('ok'))},
 frame(t){const s=E.s4,u=t%10;const pass=d=>d[1]>='2026-09';const keep=[2,5];
  s.R6.forEach((d,k)=>{const ok=pass(d),fil=u>0.6,cal=u>1.2+k*0.3;
   s.rows[k].r.setAttribute('class','cell'+(fil&&!ok?' off':'')+(u>3.4&&keep.includes(k)?' ok':''));
   s.rows[k].dt.textContent=fil&&!ok?T('被过滤'):(fil&&cal?d[2].toFixed(2):'');s.rows[k].dt.setAttribute('class','st '+(fil&&!ok?'ink3-t':'mono lbl'));
   s.rows[k].rk.textContent=u>3.4&&keep.includes(k)?String(keep.indexOf(k)+1):''});
  keep.forEach((k,i)=>run(S.v.o[i],s.out(k),u,3.9+i*0.3,1.1,0.2));
  s.rl.forEach((t2,i)=>t2.textContent=u>5.0+i*0.3&&u<9.6?T(s.R6[keep[i]][0])+'  '+s.R6[keep[i]][2].toFixed(2):'');
  s.resB.classList.toggle('ok',u>5&&u<9.6)}};
/* 第 5 步 */
SCENE.modes[4]={enter(){cap('同一条检索，按提问人的权限返回不同的行','ink2-t');S.v.q=[pk(),pk('och')];S.v.b=[[pk(),pk()],[pk('och'),pk('och')]]},
 frame(t){const s=E.s5,u=t%9,ph=u<4.5?0:1,v=u-ph*4.5;
  [0,1].forEach(i=>{const o=S.v.q[i];if(i===ph)run(o,s.p[i],v,0.2,1.0,0.1);else put(o,-99,-99,0)});
  s.D.forEach((d,k)=>{const mine=(ph===0?'rd/':'hr/'),vis=d[1].startsWith(mine),on=v>1.3;
   s.rows[k].setAttribute('class','cell'+(on?(vis?(ph?' och':' on'):' off'):''))});
  [0,1].forEach(i=>[0,1].forEach(j=>{const o=S.v.b[i][j];if(i!==ph){put(o,-99,-99,0);return}
   const k=ph===0?[0,2][j]:[1,3][j];run(o,s.back(ph,k),v,2.0+j*0.35,1.1,0.2)}));
  s.uB.forEach((b,i)=>b.setAttribute('class','box '+(i?'och':'on')+(i===ph?'':' off')));
  s.ret.forEach((r,i)=>{r.textContent=i===ph&&v>3.2?T('返回 2 行'):'';r.setAttribute('class','st '+(i?'ochre-t':'slate-t'))})}};
/* 第 6 步：左边逐个算，右边只算相近的一组 */
SCENE.modes[5]={enter(){cap('索引让检索不必算遍每一行','sage-t')},
 frame(t){const s=E.s6,u=t%7,dt=0.07,fo=u>6.5?0:1;
  const nL=Math.min(32,Math.floor(Math.max(0,u-0.4)/dt)),nR=Math.min(8,Math.floor(Math.max(0,u-0.7)/dt));
  s.pts[0].forEach((c,i)=>c.setAttribute('class','cell'+(i<nL&&fo?' on':'')+(nL>=32&&fo&&s.near.includes(i)?' ok':'')));
  s.pts[1].forEach((c,i)=>{const k=s.qorder.indexOf(i);c.setAttribute('class','cell'+(k>-1&&k<nR&&fo?' on':'')+(nR>=8&&fo&&s.near.includes(i)?' ok':''))});
  s.cell0.setAttribute('class','cell'+(u>0.4&&fo?' och':''));s.cell0.style.fillOpacity=u>0.4&&fo?0.08:0;
  s.ql[0].forEach(l=>l.style.opacity=nL>=32&&fo?1:0);s.ql[1].forEach(l=>l.style.opacity=nR>=8&&fo?1:0);
  s.cnt[0].textContent=fo?T('已算距离')+' '+nL:'';s.cnt[1].textContent=fo?T('已算距离')+' '+nR:''}};
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
