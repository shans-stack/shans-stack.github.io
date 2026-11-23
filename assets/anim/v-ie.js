/* InsightEngine：文件一写进来，就能被检索：7 步动画（SVG，按时间写死的时间线，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-ie'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-ie.css，全部限定在 .ssa-v-ie 容器之内。 */
(function(){
var ID='v-ie',NSTEP=7;
var EN={"合同.pdf":"Contract.pdf","会议.mp4":"Meeting.mp4","片段 1":"Chunk 1","片段 2":"Chunk 2","片段 3":"Chunk 3","片段 4":"Chunk 4","手册.pdf":"Manual.pdf","存储":"Storage","嵌入流水线":"Embedding pipeline","向量库":"Vector database","权限系统":"Permission system","应用":"App","复制数据":"Copy data","同步权限":"Sync permissions","定制代码":"Custom code","分置架构：通过接口连通":"Separate components connected through interfaces","InsightEngine：事件驱动的入库流水线":"InsightEngine: event-driven ingestion pipeline","换成 InsightEngine":"Switch to InsightEngine","切到分置架构":"Switch to separate components","切换对比，当前 ":"Switch comparison, now ","分置架构":"separate components","DataEngine 函数":"DataEngine functions","DataBase 表":"DataBase table","检索接口":"Search API",
"客户端":"Client","DataStore bucket":"DataStore bucket","函数实例 ":"Instance ","事件":"Event","对象创建触发异步向量化":"Object creation triggers asynchronous embedding",
"按内容类型分流":"Route by type","文本流水线":"Text pipeline","文字 · 表格 · 图":"Text · tables · figures","视频流水线":"Video pipeline","切段 · 视觉语言模型":"Segments · VLM","嵌入模型":"Embedding model","托管服务或 NVIDIA NIM":"Hosted or NVIDIA NIM","报告.pdf":"Report.pdf","按内容类型切块，再送进嵌入模型":"Chunked by content type, then sent to the embedding model",
"切块 + 向量":"Chunks + vectors","片段":"Chunk","向量":"Vector","来源":"Source","元数据":"Metadata","正文":"Text","表格":"Table","视频片段 A":"Clip A","视频片段 B":"Clip B","页 3":"Page 3","页 4":"Page 4","向量列可配置索引":"The vector column can be indexed","写入片段、向量、来源和元数据":"Store chunks, vectors, sources, and metadata",
"提问人":"Asker","研发组":"R&D","核对身份":"Check identity","问题向量化":"Embed question","检索 + 过滤":"Search + filter","重排（可选）":"Rerank","无权限":"Denied","片段 + 来源":"Chunk + source","返回符合访问策略的片段":"Return chunks permitted by the access policy","问题":"Question",
"RAG 检索接口":"RAG retrieval API","向量检索接口":"Vector search API","相似度检索（SQL）":"Similarity (SQL)","大模型生成回答":"LLM writes the answer","不调用":"Not called","回答":"Answer","耗时":"Timing","RAG 检索：返回回答与来源":"RAG retrieval returns an answer and sources","向量检索：用查询向量匹配片段":"Vector search matches chunks to a query vector","换成向量检索接口":"Switch to vector search API","换成 RAG 检索接口":"Switch to RAG retrieval API","切换接口，当前 ":"Switch API, now ",
"清理函数":"Clean-up function","定时触发器":"Schedule trigger","Catalog 对比时间":"Catalog time check","已删除":"Deleted","已修改":"Modified","等待刷新":"Awaiting refresh","过期":"Stale","已重算":"Refreshed","处理删除事件后移除对应行":"Cleanup removes rows after a deletion event","就地修改：定期核对 Catalog 并刷新":"In-place edit: scheduled Catalog check and refresh","换成就地修改":"Switch to in-place edit","换成删除":"Switch to delete","切换场景，当前 ":"Switch case, now ","删除":"delete","就地修改":"in-place edit",
"InsightEngine：写入触发切块与向量化，结果存进 DataBase 表，检索时按提问人的权限过滤":"InsightEngine: writes trigger chunking and embedding, results go to a DataBase table, and search is filtered by the asker's permissions"};
var ENM={"分置架构：通过接口连通":"Separate components","InsightEngine：事件驱动的入库流水线":"InsightEngine ingestion pipeline","换成 InsightEngine":"InsightEngine","切到分置架构":"Separate components","嵌入流水线":"Embedding","权限系统":"Permissions","对象创建触发异步向量化":"Object creation triggers async embedding","按内容类型分流":"Route by type","切段 · 视觉语言模型":"Segments · VLM","托管服务或 NVIDIA NIM":"Hosted or NVIDIA NIM","按内容类型切块，再送进嵌入模型":"Chunk by type, then embed","向量列可配置索引":"Optional vector index","写入片段、向量、来源和元数据":"Store chunks, vectors, and metadata","返回符合访问策略的片段":"Return permitted chunks","相似度检索（SQL）":"Similarity (SQL)","大模型生成回答":"LLM answer","RAG 检索：返回回答与来源":"RAG returns answer and sources","向量检索：用查询向量匹配片段":"Vector search returns matching chunks","换成向量检索接口":"Vector search API","换成 RAG 检索接口":"RAG API","处理删除事件后移除对应行":"Cleanup removes the matching rows","就地修改：定期核对 Catalog 并刷新":"Scheduled Catalog check and refresh","换成就地修改":"In-place edit","换成删除":"Delete","Catalog 对比时间":"Catalog check","重排（可选）":"Rerank","检索 + 过滤":"Search + filter","RAG 检索接口":"RAG API","向量检索接口":"Vector API","DataEngine 函数":"DataEngine fn","等待刷新":"Pending refresh"};
var ARIA="InsightEngine：写入触发切块与向量化，结果存进 DataBase 表，检索时按提问人的权限过滤";
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
 still:[2.4,3.6,4.6,5.4,6.0,4.4,6.4],
 toggles:{0:{param:'view',values:['split','native'],label:v=>v==='split'?'换成 InsightEngine':'切到分置架构',aria:'切换对比，当前 ',name:v=>v==='split'?'分置架构':'InsightEngine'},
          5:{param:'api',values:['rag','vec'],label:v=>v==='rag'?'换成向量检索接口':'换成 RAG 检索接口',aria:'切换接口，当前 ',name:v=>v==='rag'?'RAG 检索接口':'向量检索接口'},
          6:{param:'case',values:['del','mod'],label:v=>v==='del'?'换成就地修改':'换成删除',aria:'切换场景，当前 ',name:v=>v==='del'?'删除':'就地修改'}},
 layout(m){
  if(!m)return {W:960,H:500,mobile:false,f:{lbl:20,sm:17,cap:18,xs:17},pw:22,ph:16,dr:7,sp:330,cap:{x:480,y:480},tgl:{x:840,y:440}};
  return {W:480,H:660,mobile:true,f:{lbl:19,sm:17,cap:17,xs:17},pw:18,ph:14,dr:6,sp:240,cap:{x:240,y:640},tgl:{x:240,y:600}};
 },
 build(){
  const f=L.f,m=L.mobile;
  const nb=(r,t1,t2,g,cls)=>{const b=box(r,g,cls||'box');let t;if(t2){t=tx(C(r).x,C(r).y-11,t1,f.sm,'lbl','middle',g);tx(C(r).x,C(r).y+13,t2,f.xs,'ink3-t','middle',g)}else t=tx(C(r).x,C(r).y,t1,f.sm,'lbl','middle',g);b.t=t;return b};
  /* ===== 1：拼装 vs InsightEngine ===== */
  {const g=grp('1');const s={};E.s1=s;
   const A=el('g',{},g),B=el('g',{},g);s.A=A;s.B=B;const la=el('g',{},A),lb=el('g',{},B);
   s.n=m?[R(12,20,200,56),R(268,20,200,56),R(268,170,200,56),R(12,320,200,56),R(268,320,200,56)]:[R(40,60,200,64),R(380,60,200,64),R(720,60,200,64),R(380,320,200,64),R(720,320,200,64)];
   const [st,pl,vd,pm,ap]=s.n;
   s.pa=[[out_(st),in_(pl)],m?[P(C(pl).x,pl.y+pl.h),P(C(vd).x,vd.y)]:[P(pl.x+pl.w,C(pl).y),P(vd.x,C(vd).y)],
     m?[P(C(st).x,st.y+st.h),P(C(pm).x,pm.y)]:[P(C(st).x,st.y+st.h),P(C(st).x,C(pm).y),P(pm.x,C(pm).y)],
     m?[P(C(ap).x,ap.y),P(C(vd).x,vd.y+vd.h)]:[P(C(ap).x,ap.y),P(C(vd).x,vd.y+vd.h)],
     m?[P(ap.x,C(ap).y),P(pm.x+pm.w,C(pm).y)]:[P(ap.x,C(ap).y),P(pm.x+pm.w,C(pm).y)]];
   s.pa.forEach((p,i)=>poly(p,i===2?'dash vio':'',la));
   if(!m)tx(310,C(st).y-18,'复制数据',f.xs,'ink3-t st','middle',A);
   tx(C(st).x+10,m?240:250,'同步权限',f.xs,'violet-t st','start',A);tx(m?240:480,m?430:200,'定制代码',f.xs,'ink3-t st','middle',A);
   s.aB=[nb(st,'存储','',A),nb(pl,'嵌入流水线','',A),nb(vd,'向量库','',A),nb(pm,'权限系统','',A),nb(ap,'应用','',A)];
   s.fr=m?R(8,16,464,346):R(24,40,912,240);
   s.c=m?[R(140,58,200,52),R(140,130,200,52),R(140,202,200,52),R(140,274,200,52)]:[R(50,120,190,64),R(285,120,190,64),R(520,120,190,64),R(755,120,160,64)];
   s.ap=m?R(140,410,200,56):R(380,350,200,64);
   s.pb=[0,1,2].map(i=>[out_(s.c[i]),in_(s.c[i+1])]);s.pb.forEach(p=>poly(p,'',lb));
   s.pq=m?[P(C(s.ap).x,s.ap.y),P(C(s.c[3]).x,s.c[3].y+s.c[3].h)]:[P(s.ap.x+s.ap.w,C(s.ap).y),P(C(s.c[3]).x,C(s.ap).y),P(C(s.c[3]).x,s.c[3].y+s.c[3].h)];poly(s.pq,'',lb);
   box(s.fr,B,'box frame',16);tx(s.fr.x+16,s.fr.y+22,'InsightEngine',f.sm,'ttl','start',B);
   s.bB=[nb(s.c[0],'DataStore','',B),nb(s.c[1],'Event Broker','',B),nb(s.c[2],'DataEngine 函数','',B),nb(s.c[3],'DataBase 表','',B)];
   nb(s.ap,'应用','',B);tx(m?C(s.ap).x+110:C(s.ap).x+ s.ap.w/2+30,m?s.ap.y-14:C(s.ap).y-16,'检索接口',f.xs,'ink3-t st',m?'start':'start',B);
  }
  /* ===== 2：写入即事件 ===== */
  {const ln=grp('2'),g=grp('2');const s={};E.s2=s;
   s.cl=m?R(150,10,180,48):R(24,190,150,60);s.fr=m?R(8,84,464,500):R(210,40,726,390);
   s.bk=m?R(130,124,220,110):R(240,170,200,120);s.tp=m?R(150,262,180,64):R(500,190,170,80);
   s.fn=[0,1,2].map(k=>m?R([84,240,396][k]-66,400,132,56):R(740,90+k*100,170,60));
   s.p1=[out_(s.cl),in_(s.bk)];poly(s.p1,'',ln);s.p2=[out_(s.bk),in_(s.tp)];poly(s.p2,'',ln);
   s.p3=s.fn.map(r=>m?elbowV(P(C(s.tp).x,s.tp.y+s.tp.h),P(C(r).x,r.y),360):elbowH(P(s.tp.x+s.tp.w,C(s.tp).y),P(r.x,C(r).y),705));s.p3.forEach(p=>poly(p,'',ln));
   box(s.fr,g,'box frame',16);tx(s.fr.x+16,s.fr.y+22,'AI OS',f.sm,'ttl','start',g);
   nb(s.cl,'客户端','',g);s.bkB=nb(s.bk,'DataStore bucket','',g);s.bkB.t.setAttribute('y',s.bk.y+22);
   s.tpB=nb(s.tp,'Event Broker','topic',g,'box och');s.fnB=s.fn.map((r,k)=>nb(r,T('函数实例 ')+(k+1),'',g,'box'));
   s.files=['报告.pdf','会议.mp4','手册.pdf'].map((name,k)=>{
    const x=C(s.bk).x,y=s.bk.y+(m?47:50)+k*(m?20:22),row=el('g',{},g);
    el('rect',{x:x-74,y:y-9,width:148,height:18,rx:3,class:'cell ok'},row);
    tx(x,y,name,f.xs,'lbl','middle',row);row.style.opacity=0;return row;
   });
  }
  /* ===== 3：切块与向量化 ===== */
  {const ln=grp('3'),g=grp('3');const s={};E.s3=s;
   s.in=m?[R(30,10,190,44),R(260,10,190,44)]:[R(24,120,150,50),R(24,290,150,50)];
   s.rt=m?R(140,94,200,56):R(220,180,170,70);s.pp=m?[R(12,200,214,64),R(254,200,214,64)]:[R(440,90,230,72),R(440,290,230,72)];
   s.em=m?R(110,330,260,72):R(720,175,216,80);s.out=m?R(110,450,260,90):R(720,320,216,110);
   s.pIn=s.in.map(r=>m?elbowV(P(C(r).x,r.y+r.h),P(C(s.rt).x,s.rt.y),74):elbowH(P(r.x+r.w,C(r).y),P(s.rt.x,C(s.rt).y),198));
   s.pPP=s.pp.map(r=>m?elbowV(P(C(s.rt).x,s.rt.y+s.rt.h),P(C(r).x,r.y),176):elbowH(P(s.rt.x+s.rt.w,C(s.rt).y),P(r.x,C(r).y),415));
   s.pEM=s.pp.map(r=>m?elbowV(P(C(r).x,r.y+r.h),P(C(s.em).x,s.em.y),298):elbowH(P(r.x+r.w,C(r).y),P(s.em.x,C(s.em).y),695));
   s.pOut=m?[P(C(s.em).x,s.em.y+s.em.h),P(C(s.out).x,s.out.y)]:[P(C(s.em).x,s.em.y+s.em.h),P(C(s.out).x,s.out.y)];
   [...s.pIn,...s.pPP,...s.pEM,s.pOut].forEach(p=>poly(p,'',ln));
   s.inB=[nb(s.in[0],'报告.pdf','',g),nb(s.in[1],'会议.mp4','',g)];s.rtB=nb(s.rt,'按内容类型分流','',g);
   s.ppB=[nb(s.pp[0],'文本流水线','文字 · 表格 · 图',g),nb(s.pp[1],'视频流水线','切段 · 视觉语言模型',g)];
   s.emB=nb(s.em,'嵌入模型','托管服务或 NVIDIA NIM',g,'box fillv');
   box(s.out,g,'box soft',10);tx(s.out.x+12,s.out.y+18,'向量',f.xs,'ink3-t','start',g);
   s.vec=[0,1,2,3,4].map(k=>{const r=el('rect',{x:s.out.x+20+k*(m?46:40),y:s.out.y+(m?40:42),width:m?34:28,height:m?36:50,rx:3,class:'cell vio'},g);r.style.opacity=0;return r});
  }
  /* ===== 4：写成一张表 ===== */
  {const ln=grp('4'),g=grp('4');const s={};E.s4=s;
   s.in=m?R(140,10,200,48):R(24,190,160,60);s.fr=m?R(8,90,464,470):R(214,36,722,394);
   const cols=m?[{k:'片段',w:110},{k:'向量',w:86},{k:'来源',w:140},{k:'元数据',w:100}]:[{k:'片段',w:190},{k:'向量',w:170},{k:'来源',w:150},{k:'元数据',w:150}];
   const hh=34,rh=m?46:50;s.tb=m?R(22,150,436,hh+4*rh):R(240,96,660,hh+4*rh);
   s.rowY=[0,1,2,3].map(k=>s.tb.y+hh+rh/2+k*rh);
   if(!m){const bx=s.tb.x-14;line(P(s.in.x+s.in.w,C(s.in).y),P(bx,C(s.in).y),'',ln);poly([P(bx,s.rowY[0]),P(bx,s.rowY[3])],'thin',ln);s.rowY.forEach(y=>line(P(bx,y),P(s.tb.x,y),'thin',ln));
     s.ins=k=>[P(s.in.x+s.in.w,C(s.in).y),P(bx,C(s.in).y),P(bx,s.rowY[k]),P(s.tb.x+40,s.rowY[k])];}
   else{const by=s.tb.y-14,bx=14;line(P(240,s.in.y+s.in.h),P(240,by),'',ln);line(P(bx,by),P(240,by),'thin',ln);poly([P(bx,by),P(bx,s.rowY[3])],'thin',ln);s.rowY.forEach(y=>line(P(bx,y),P(s.tb.x,y),'thin',ln));
     s.ins=k=>[P(240,s.in.y+s.in.h),P(240,by),P(bx,by),P(bx,s.rowY[k]),P(s.tb.x+30,s.rowY[k])];}
   nb(s.in,'切块 + 向量','',g,'box fillv');box(s.fr,g,'box frame',16);tx(s.fr.x+16,s.fr.y+22,'DataBase 表',f.sm,'ttl','start',g);
   box(s.tb,g,'box',8);let x=s.tb.x;cols.forEach(c=>{el('rect',{x,y:s.tb.y,width:c.w,height:hh,class:'cell hd'},g);tx(x+c.w/2,s.tb.y+hh/2,c.k,f.xs,'ink2-t st','middle',g);c.x=x;x+=c.w});
   const D=[['正文','[0.21, …]','合同.pdf','页 3'],['表格','[0.64, …]','合同.pdf','页 4'],['视频片段 A','[0.08, …]','会议.mp4','02:10'],['视频片段 B','[0.77, …]','会议.mp4','05:40']];
   s.rows=D.map((d,k)=>{const y=s.rowY[k];const r=el('rect',{x:s.tb.x+3,y:y-rh/2+3,width:s.tb.w-6,height:rh-6,rx:4,class:'cell'},g);
    const ts=cols.map((c,ci)=>tx(c.x+c.w/2,y,d[ci],ci===2?(17):f.xs,ci===1?'violet-t mono':ci===2?'lbl mono':'lbl','middle',g));r.style.opacity=0;ts.forEach(t=>t.style.opacity=0);return {r,ts}});
   const vc=cols[1];s.vcol=el('rect',{x:vc.x+2,y:s.tb.y+2,width:vc.w-4,height:s.tb.h-4,rx:4,class:'cell vio'},g);s.vcol.style.fillOpacity=0.06;s.vcol.style.opacity=0;
   s.n1=tx(m?240:C(s.tb).x,s.tb.y+s.tb.h+26,'向量列可配置索引',f.xs,'violet-t st','middle',g);
  }
  /* ===== 5：检索 ===== */
  {const ln=grp('5'),g=grp('5');const s={};E.s5=s;
   if(!m){s.u=R(24,190,140,64);s.id=R(204,190,140,64);s.em=R(384,190,140,64);s.tb=R(566,100,220,244);s.rr=R(816,190,124,64)}
   else{s.u=R(150,8,180,56);s.id=R(150,92,180,52);s.em=R(150,170,180,52);s.tb=R(60,252,360,228);s.rr=R(150,510,180,52)}
   const seq=[s.u,s.id,s.em,s.tb,s.rr];s.seg=[0,1,2,3].map(i=>[out_(seq[i]),in_(seq[i+1])]);s.seg.forEach(p=>poly(p,'',ln));
   s.back=m?[P(s.rr.x+s.rr.w,C(s.rr).y),P(462,C(s.rr).y),P(462,C(s.u).y),P(s.u.x+s.u.w,C(s.u).y)]:[P(C(s.rr).x,s.rr.y+s.rr.h),P(C(s.rr).x,410),P(C(s.u).x,410),P(C(s.u).x,s.u.y+s.u.h)];
   s.backT=m?s.back.slice(0,3).concat([P(462,s.u.y+s.u.h+20)]):s.back.slice(0,3).concat([P(C(s.u).x,s.u.y+s.u.h+40)]);
   poly(s.back,'ok',ln);
   s.uB=nb(s.u,'提问人','研发组',g);s.idB=nb(s.id,'核对身份','',g);s.emB=nb(s.em,'问题向量化','',g,'box fillv');s.rrB=nb(s.rr,'重排（可选）','',g);
   box(s.tb,g,'box',10);tx(C(s.tb).x,s.tb.y+20,'检索 + 过滤',f.sm,'ttl','middle',g);
   const D=[['片段 1','rd/'],['片段 2','hr/'],['片段 3','rd/'],['片段 4','rd/']];s.D=D;const rh=m?42:46;
   s.rows=D.map((d,k)=>{const y=s.tb.y+(m?56:60)+k*rh;const r=el('rect',{x:s.tb.x+10,y:y-rh/2+4,width:s.tb.w-20,height:rh-8,rx:4,class:'cell'},g);
    tx(s.tb.x+(m?70:58),y,d[0],f.sm,'lbl','middle',g);tx(s.tb.x+(m?170:121),y,d[1],f.xs,'lbl mono','middle',g);const st=tx(s.tb.x+s.tb.w-18,y,'',f.xs,'st','end',g);return {r,st}});
   s.res=tx(m?240:C(s.u).x,m?s.u.y-0:s.u.y-18,'',f.xs,'sage-t st','middle',g);if(m)s.res.setAttribute('y',590);
  }
  /* ===== 6：两个接口 ===== */
  {const ln=grp('6'),g=grp('6');const s={};E.s6=s;
   if(!m){s.ap=R(24,190,150,64);s.api=R(230,190,190,64);s.sr=R(480,190,190,64);s.llm=R(730,90,206,64)}
   else{s.ap=R(150,8,180,52);s.api=R(140,96,200,52);s.sr=R(140,190,200,52);s.llm=R(140,300,200,52)}
   s.p1=[out_(s.ap),in_(s.api)];s.p2=[out_(s.api),in_(s.sr)];
   s.p3=m?[P(C(s.sr).x,s.sr.y+s.sr.h),P(C(s.llm).x,s.llm.y)]:[P(s.sr.x+s.sr.w,C(s.sr).y),P(700,C(s.sr).y),P(700,C(s.llm).y),P(s.llm.x,C(s.llm).y)];
   s.bR=m?[P(C(s.llm).x,s.llm.y+s.llm.h),P(C(s.llm).x,390),P(44,390),P(44,C(s.ap).y),P(s.ap.x,C(s.ap).y)]:[P(C(s.llm).x,s.llm.y+s.llm.h),P(C(s.llm).x,380),P(C(s.ap).x,380),P(C(s.ap).x,s.ap.y+s.ap.h)];
   s.bV=m?[P(s.sr.x,C(s.sr).y),P(44,C(s.sr).y),P(44,C(s.ap).y),P(s.ap.x,C(s.ap).y)]:[P(C(s.sr).x,s.sr.y+s.sr.h),P(C(s.sr).x,380),P(C(s.ap).x,380),P(C(s.ap).x,s.ap.y+s.ap.h)];
   [s.p1,s.p2].forEach(p=>poly(p,'',ln));s.l3=poly(s.p3,'',ln);s.lR=poly(s.bR,'ok',ln);s.lV=poly(s.bV,'ok',ln);
   nb(s.ap,'应用','',g);s.apiB=nb(s.api,'RAG 检索接口','',g,'box fillv');nb(s.sr,'相似度检索（SQL）','',g);s.llmB=nb(s.llm,'大模型生成回答','',g);
   s.llmN=tx(C(s.llm).x,s.llm.y+s.llm.h+20,'',f.xs,'ink3-t st','middle',g);
   s.ret=tx(m?240:C(s.ap).x,m?s.ap.y+s.ap.h+16:s.ap.y-18,'',f.xs,'sage-t st','middle',g);if(m)s.ret.setAttribute('y',430);
  }
  /* ===== 7：删除与就地修改 ===== */
  {const ln=grp('7'),g=grp('7');const s={};E.s7=s;
   if(!m){s.ds=R(24,70,200,200);s.eb=R(280,80,150,60);s.cf=R(480,80,160,60);s.tb=R(660,60,276,210);s.ti=R(280,330,150,60);s.ca=R(480,330,160,60)}
   else{s.ds=R(12,10,456,96);s.eb=R(12,146,210,56);s.cf=R(258,146,210,56);s.tb=R(40,240,400,170);s.ti=R(12,450,210,56);s.ca=R(258,450,210,56)}
   s.fl=m?[R(40,52,180,36),R(260,52,180,36)]:[R(44,120,160,40),R(44,190,160,40)];
   s.pE=m?[P(C(s.fl[0]).x,s.ds.y+s.ds.h),P(C(s.fl[0]).x,s.eb.y)]:[P(s.ds.x+s.ds.w,C(s.fl[0]).y),P(252,C(s.fl[0]).y),P(252,C(s.eb).y),P(s.eb.x,C(s.eb).y)];
   s.pEM=m?[P(C(s.fl[1]).x,s.ds.y+s.ds.h),P(C(s.fl[1]).x,124),P(C(s.eb).x+60,124),P(C(s.eb).x+60,s.eb.y)]:[P(s.ds.x+s.ds.w,C(s.fl[1]).y),P(252,C(s.fl[1]).y),P(252,C(s.eb).y+14),P(s.eb.x,C(s.eb).y+14)];
   s.pC=[out_(s.eb),in_(s.cf)];s.pT=m?[P(C(s.cf).x,s.cf.y+s.cf.h),P(C(s.cf).x,s.tb.y)]:[P(s.cf.x+s.cf.w,C(s.cf).y),P(s.tb.x,C(s.cf).y)];
   s.pK=[out_(s.ti),in_(s.ca)];s.pR=m?[P(C(s.ca).x,s.ca.y),P(C(s.ca).x,s.tb.y+s.tb.h)]:[P(s.ca.x+s.ca.w,C(s.ca).y),P(C(s.tb).x,C(s.ca).y),P(C(s.tb).x,s.tb.y+s.tb.h)];
   poly(s.pE,'',ln);s.lEM=poly(s.pEM,'dash',ln);[s.pC,s.pT,s.pK,s.pR].forEach(p=>poly(p,'',ln));
   box(s.ds,g,'box',12);tx(s.ds.x+14,s.ds.y+20,'DataStore',f.sm,'ttl','start',g);
   s.flB=s.fl.map((r,k)=>{const b=box(r,g,'box',8);tx(C(r).x,C(r).y,k?'b.docx':'a.pdf',f.sm,'lbl mono','middle',g);return b});
   s.fst=s.fl.map(r=>tx(m?r.x+r.w-6:r.x+r.w-6,m?r.y-10:r.y-10,'',f.xs,'st','end',g));
   s.ebB=nb(s.eb,'Event Broker','',g,'box och');s.cfB=nb(s.cf,'清理函数','',g);s.tiB=nb(s.ti,'定时触发器','',g);s.caB=nb(s.ca,'Catalog 对比时间','',g);
   s.nt=tx(m?C(s.eb).x+60+8:258,m?126:C(s.eb).y+38,'',f.xs,'ink3-t st','start',g);
   box(s.tb,g,'box',10);tx(s.tb.x+14,s.tb.y+20,'DataBase 表',f.sm,'ttl','start',g);
   const D=[['a.pdf','片段 1'],['a.pdf','片段 2'],['b.docx','片段 1']];const rh=m?40:46;
   s.rows=D.map((d,k)=>{const y=s.tb.y+(m?58:66)+k*rh;const r=el('rect',{x:s.tb.x+10,y:y-rh/2+4,width:s.tb.w-20,height:rh-8,rx:4,class:'cell'},g);
    const a=tx(s.tb.x+(m?70:50),y,d[0],f.xs,'lbl mono','middle',g),b=tx(s.tb.x+(m?190:128),y,d[1],f.xs,'lbl','middle',g),st=tx(s.tb.x+s.tb.w-16,y,'',f.xs,'st','end',g);return {r,a,b,st}});
  }
 },
 reset(){svg.querySelectorAll('.box').forEach(b=>b.classList.remove('on','ok','hot','off','och'));cap('','')},
 modes:[]
};
/* 1 */
SCENE.modes[0]={enter(v){const s=E.s1;S.v.v=v;const sp=v==='split';s.A.style.display=sp?'':'none';s.B.style.display=sp?'none':'';
  cap(sp?'分置架构：通过接口连通':'InsightEngine：事件驱动的入库流水线',sp?'rose-t':'sage-t');
  S.v.p=[0,1,2,3,4].map(i=>pk(i===2?'vio':''))},
 frame(t){const s=E.s1,u=t%6;
  if(S.v.v==='split'){s.pa.forEach((p,i)=>{const t0=[0.2,1.2,0.6,2.4,3.0][i];run(S.v.p[i],i===3||i===4?p:p,u,t0,dur(p)*0.8,0.3)})}
  else{s.pb.forEach((p,i)=>run(S.v.p[i],p,u,0.2+i*0.6,dur(p),0.2));run(S.v.p[3],s.pq,u,2.4,dur(s.pq)*0.8,0.2);put(S.v.p[4],-99,-99,0);
   s.bB.forEach((b,i)=>b.classList.toggle('on',u>0.2+i*0.6&&u<0.8+i*0.6))}}};
/* 2 */
const FN=['报告.pdf','会议.mp4','手册.pdf'];
SCENE.modes[1]={enter(){cap('对象创建触发异步向量化','ink2-t');S.v.f=FN.map(()=>pk('ok'));S.v.e=FN.map(()=>dot('vio'))},
 frame(t){const s=E.s2,u=t%8;
  FN.forEach((n,k)=>{const t0=0.2+k*0.5,d=dur(s.p1)*0.8;run(S.v.f[k],s.p1,u,t0,d,0.1);s.files[k].style.opacity=u>t0+d&&u<7.7?1:0;
   const te=t0+d+0.1,pe=cat(s.p2,s.p3[k]);const de=dur(pe)*0.8;const p=run(S.v.e[k],pe,u,te,de,0.2);s.fnB[k].classList.toggle('on',u>te+de&&u<te+de+2.4)});
  s.tpB.classList.toggle('on',u>1.4&&u<3.2)}};
/* 3 */
SCENE.modes[2]={enter(){cap('按内容类型切块，再送进嵌入模型','violet-t');const m=L.mobile;S.v.d=[pk(),pk('och')];
  S.v.c=[0,1,2,3,4].map(k=>pk(k<3?'':'och',m?18:20,m?14:16))},
 frame(t){const s=E.s3,u=t%9;
  [0,1].forEach(i=>{const t0=0.2+i*0.4,p=cat(s.pIn[i],s.pPP[i]);const d=dur(p)*0.8;run(S.v.d[i],p,u,t0,d,0.2);s.ppB[i].classList.toggle(i?'och':'on',u>t0+d&&u<t0+d+1.2)});
  s.rtB.classList.toggle('on',u>0.8&&u<1.6);
  [0,1,2,3,4].forEach(k=>{const i=k<3?0:1,t0=(i?1.2:0.8)+dur(cat(s.pIn[i],s.pPP[i]))*0.8+0.6+(i?k-3:k)*0.25;const p=cat(s.pEM[i],s.pOut);const d=dur(p)*0.8;
   run(S.v.c[k],p,u,t0,d,0.2);s.vec[k].style.opacity=u>t0+d&&u<8.7?1:0});
  s.emB.classList.toggle('vio',u>3&&u<5.6)}};
/* 4 */
SCENE.modes[3]={enter(){cap('写入片段、向量、来源和元数据','violet-t');S.v.r=[0,1,2,3].map(()=>{const g=el('g',{},E.pk);['','vio','slate','ok'].forEach((c,i)=>el('rect',{x:-24+i*12,y:-7,width:10,height:14,rx:2,class:'pkt '+c},g));const o={el:g};S.items.push(o);put(o,-99,-99,0);return o})},
 frame(t){const s=E.s4,u=t%9;
  for(let k=0;k<4;k++){const t0=0.3+k*1.0,p=s.ins(k),d=dur(p)*0.8;run(S.v.r[k],p,u,t0,d,0.1);const on=u>t0+d&&u<8.6;s.rows[k].r.style.opacity=on?1:0;s.rows[k].ts.forEach(x=>x.style.opacity=on?1:0)}
  s.vcol.style.opacity=u>5&&u<8.6?1:0;s.n1.style.opacity=u>5?1:0}};
/* 5 */
SCENE.modes[4]={enter(){cap('返回符合访问策略的片段','sage-t');S.v.q=pk();S.v.r=[0,1].map(()=>pk('ok'))},
 frame(t){const s=E.s5,u=t%10,seq=s.seg;let tt=0.2;const pts=cat(...seq);const L1=dur(seq[0])*0.9,L2=dur(seq[1])*0.9,L3=dur(seq[2])*0.9;
  // 问题牌沿线走，过「核对身份」后带上身份牌，过「问题向量化」后变成向量
  const tA=0.2,tB=tA+L1+0.3,tC=tB+L2+0.3,tD=tC+L3;
  let q;if(u<tA)q=null;else if(u<tA+L1)q=at(seq[0],sm((u-tA)/L1));else if(u<tB)q=C(s.id);else if(u<tB+L2)q=at(seq[1],sm((u-tB)/L2));else if(u<tC)q=C(s.em);else if(u<tD)q=at(seq[2],sm((u-tC)/L3));else q=null;
  if(q){put(S.v.q,q,1);S.v.q.el.classList.toggle('vio',u>tC)}else put(S.v.q,-99,-99,0);
  s.idB.classList.toggle('on',u>tA+L1&&u<tB+0.2);s.emB.classList.toggle('vio',u>tB+L2&&u<tC+0.2);
  const tq=tD+0.2;s.D.forEach((d,k)=>{const cand=k<3,hit=u>tq+0.3*k,deny=d[1]==='hr/'&&u>tq+1.2;
   s.rows[k].r.setAttribute('class','cell'+(hit&&cand?(deny?' off':' ok'):''));s.rows[k].st.textContent=deny&&hit?T('无权限'):'';s.rows[k].st.setAttribute('class','st ink3-t')});
  const tR=tq+1.8,dR=dur(seq[3])*0.9;s.rrB.classList.toggle('on',u>tR+dR&&u<tR+dR+0.8);
  [0,1].forEach(i=>run(S.v.r[i],s.backT,u,tR+dR+0.8+i*0.7,dur(s.backT)*0.8,0.3));
  if(!S.v.m){S.v.m=pk('ok')}run(S.v.m,seq[3],u,tR,dR,0.1);
  s.uB.classList.toggle('ok',u>tR+dR+0.8+dur(s.backT)*0.8)}};
/* 6 */
SCENE.modes[5]={enter(v){const s=E.s6,rag=v==='rag';S.v.rag=rag;s.apiB.t.textContent=T(rag?'RAG 检索接口':'向量检索接口');
  cap(rag?'RAG 检索：返回回答与来源':'向量检索：用查询向量匹配片段',rag?'violet-t':'slate-t');
  s.llmB.classList.toggle('off',!rag);s.llmN.textContent=rag?'':T('不调用');s.l3.classList.toggle('off',!rag);s.lR.style.display=rag?'':'none';s.lV.style.display=rag?'none':'';
  const m=L.mobile;S.v.q=pk(rag?'':'vio');S.v.c=pk('ok');S.v.r=[0,1].map(k=>tile(rag?['回答','来源'][k]:'片段',m?72:82,m?24:26,'ok',17))},
 frame(t){const s=E.s6,u=t%7,rag=S.v.rag;const p=cat(s.p1,s.p2);run(S.v.q,p,u,0.2,dur(p)*0.8,0.2);
  const t1=0.2+dur(p)*0.8;let tb;
  if(rag){run(S.v.c,s.p3,u,t1+0.2,dur(s.p3)*0.8,0.2);tb=t1+0.2+dur(s.p3)*0.8+0.5;s.llmB.classList.toggle('vio',u>tb-0.5&&u<tb+0.3)}else{put(S.v.c,-99,-99,0);tb=t1+0.5}
  const b0=rag?s.bR:s.bV,back=b0.slice(0,-1).concat([L.mobile?P(s.ap.x-40,C(s.ap).y):P(C(s.ap).x,s.ap.y+s.ap.h+30)]);S.v.r.forEach((o,k)=>{run(o,back,u,tb+k*0.75,dur(back)*0.8,0.3)})}};
/* 7 */
SCENE.modes[6]={enter(v){const s=E.s7;S.v.del=v==='del';
  cap(S.v.del?'处理删除事件后移除对应行':'就地修改：定期核对 Catalog 并刷新',S.v.del?'rose-t':'ochre-t');
  s.lEM.classList.toggle('off',S.v.del);S.v.e=dot('vio');S.v.k=dot('och');S.v.x=dot('och')},
 frame(t){const s=E.s7,u=t%8;
  if(S.v.del){const del=u>0.5;s.flB[0].classList.toggle('hot',del);s.flB[0].style.opacity=del?0.4:1;s.fst[0].textContent=del?T('已删除'):'';s.fst[0].setAttribute('class','st rose-t');s.fst[1].textContent='';
   const p=cat(s.pE,s.pC,s.pT);const d=dur(p)*0.8;run(S.v.e,p,u,0.7,d,0.2);s.cfB.classList.toggle('on',u>0.7+d*0.55&&u<0.7+d+0.5);
   s.rows.forEach((r,k)=>{const gone=k<2&&u>0.9+d;r.r.style.opacity=gone?0.15:1;r.a.style.opacity=gone?0.15:1;r.b.style.opacity=gone?0.15:1;r.st.textContent=gone?T('已删除'):'';r.st.setAttribute('class','st rose-t');r.r.setAttribute('class','cell')});
   put(S.v.k,-99,-99,0);put(S.v.x,-99,-99,0);s.nt.textContent='';s.flB[1].classList.remove('och');s.flB[1].style.opacity=1}
  else{s.flB[0].style.opacity=1;s.fst[0].textContent='';const md=u>0.5;s.flB[1].classList.toggle('och',md);s.fst[1].textContent=md?T('已修改'):'';s.fst[1].setAttribute('class','st ochre-t');
   s.nt.textContent=u>0.8&&u<3?T('等待刷新'):'';put(S.v.e,-99,-99,0);
   const p=cat(s.pK,s.pR);const d=dur(p)*0.8;run(S.v.k,p,u,3.0,d,0.2);s.tiB.classList.toggle('och',u>2.6&&u<3.4);s.caB.classList.toggle('on',u>3+d*0.4&&u<3+d*0.7);
   s.rows.forEach((r,k)=>{r.r.style.opacity=1;r.a.style.opacity=1;r.b.style.opacity=1;const st=k===2?(u>3+d?'已重算':u>0.8?'过期':''):'';r.st.textContent=st?T(st):'';r.st.setAttribute('class','st '+(st==='已重算'?'sage-t':'ochre-t'));r.r.setAttribute('class','cell'+(st==='过期'?' och':st==='已重算'?' ok':''))})}}};
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
