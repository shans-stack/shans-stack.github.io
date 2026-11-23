/* DataBase：表直接存在 VAST 的存储里：6 步动画（SVG，按时间写死的时间线，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-db'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-db.css，全部限定在 .ssa-v-db 容器之内。 */
(function(){
var ID='v-db',NSTEP=6;
var EN={"WHERE 金额 > 500":"WHERE amount > 500","块 1":"Chunk 1","块 2":"Chunk 2","块 3":"Chunk 3","块 4":"Chunk 4","块 5":"Chunk 5","块 6":"Chunk 6","NFS 客户端":"NFS client","S3 客户端":"S3 client","SQL 客户端":"SQL client","目录":"Directory","bucket":"Bucket","数据库视图":"Database view","schema · 表":"schema · table","快照":"Snapshots","数据缩减":"Data reduction","适用表复制":"Replication","配额":"Quotas",
"表和文件、对象用同一套存储与元数据":"Tables share one store and one set of metadata with files and objects",
"应用":"App","持久写缓冲":"Persistent write buffer","容量闪存":"Capacity flash","分列暂存":"Column values","提交后可查":"Queryable at commit","列存：每列单独成块":"Columns: one per chunk","各列的值暂存于写缓冲":"Column values enter the write buffer","提交后由后台迁移到闪存":"After commit, data moves to flash","一个行组":"One row group",
"列块统计：最小值–最大值":"Chunk stats: min–max","块 ":"Chunk ","跳过":"Skip","读取":"Read","读取 ":"Read ","块":"chunks","最大值小于或等于 500 的块可以跳过":"Skip chunks with a maximum of 500 or less",
"不下推":"No pushdown","下推":"Pushdown","表":"Table","查询引擎":"Query engine","只把行读出":"Reads rows out","先按条件过滤":"Filters first","网络":"Network","经网络回传":"Rows sent back","回传":"Sent back","示意，不代表实测数字":"Schematic, not measured","下推之后，网络上只走命中的行":"With pushdown, only matching rows cross the network",
"集群":"cluster","原生查询引擎":"Native query engine","DataBase 表":"DataBase table","连接器":"Connectors","多个引擎查询同一张表":"Multiple engines query one table",
"Kafka 生产者":"Kafka producer","P0 的 leader":"Leader for P0","P1 的 leader":"Leader for P1","分区":"Partition","Kafka 消费者":"Kafka consumer","按分区读":"By partition","SQL 查询":"SQL query","读取已提交消息":"Committed",
"每个 topic 是一张表，消息作为行写入":"Each topic is a table; messages are written as rows","Kafka 消费者照常按分区读":"Kafka consumers read by partition as usual","SQL 读取符合条件的 topic 表":"SQL reads eligible topic tables",
"表直接存在 VAST 的存储里：视图、行转列、页脚跳块、过滤下推、多引擎与 topic 表":"Tables stored in VAST: views, rows to columns, footer skipping, pushdown, multiple engines and topic tables"};
var ENM={"查询引擎":"Engine","表和文件、对象用同一套存储与元数据":"Tables, files and objects share one store","数据缩减":"Reduction","适用表复制":"Replication","各列的值暂存于写缓冲":"Column values enter the buffer","提交后由后台迁移到闪存":"Committed data moves to flash","列存：每列单独成块":"Columnar","网络":"Net","最大值小于或等于 500 的块可以跳过":"Skip chunks with max ≤ 500","只把行读出":"Reads rows","先按条件过滤":"Filters first","经网络回传":"Sent back","下推之后，网络上只走命中的行":"Only matching rows cross the network","多个引擎查询同一张表":"Multiple engines, one table","每个 topic 是一张表，消息作为行写入":"Each topic is a table of messages","Kafka 消费者照常按分区读":"Kafka consumers read by partition","SQL 读取符合条件的 topic 表":"SQL reads eligible topics","读取已提交消息":"Committed","P0 的 leader":"P0 leader","P1 的 leader":"P1 leader","Kafka 生产者":"Producer","持久写缓冲":"Write buffer","列块统计：最小值–最大值":"Chunk stats: min–max"};
var ARIA="表直接存在 VAST 的存储里：视图、行转列、页脚跳块、过滤下推、多引擎与 topic 表";
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
const COLC=['slate','och','vio','ok'];
const SCENE={
 still:[1.6,5.2,4.4,6.5,2.2,8.4],
 layout(m){
  if(!m)return {W:960,H:480,mobile:false,f:{lbl:20,sm:17,cap:18,xs:17,big:30},pw:22,ph:16,dr:7,sp:330,
   cap:{x:480,y:458},tgl:{x:480,y:458}};
  return {W:480,H:640,mobile:true,f:{lbl:19,sm:17,cap:17,xs:17,big:26},pw:18,ph:14,dr:6,sp:240,
   cap:{x:240,y:618},tgl:{x:240,y:618}};
 },
 build(){
  const f=L.f,m=L.mobile;
  /* ===== 第 1 步：库是 Element Store 里的一个视图 ===== */
  {const g=grp('1');E.s1={};
   const xs=m?[84,240,396]:[200,480,760],cw=m?144:200,ew=m?144:220;
   const cl=xs.map(x=>R(x-cw/2,m?36:20,cw,m?46:50)),fr=m?R(6,124,468,330):R(60,110,840,250);
   const el_=xs.map(x=>R(x-ew/2,m?176:160,ew,m?258:170));
   box(fr,g,'box frame',16);tx(fr.x+(m?14:20),fr.y+(m?22:24),'Element Store',f.sm,'ttl','start',g);
   const names=['NFS 客户端','S3 客户端','SQL 客户端'],proto=['NFS','S3','VAST SQL'];
   E.s1.cl=[];E.s1.el=[];E.s1.path=[];
   cl.forEach((r,i)=>{E.s1.cl.push(box(r,g));tx(C(r).x,C(r).y,names[i],f.sm,'lbl','middle',g);
    const a=P(C(r).x,r.y+r.h),b=P(C(r).x,el_[i].y);line(a,b,'',g);tx(m?a.x-8:a.x+8,(a.y+fr.y)/2,proto[i],f.xs,'ink3-t',m?'end':'start',g);E.s1.path.push([a,b])});
   const tl=['目录','bucket','数据库视图'];
   el_.forEach((r,i)=>{E.s1.el.push(box(r,g,'box'));tx(C(r).x,r.y+(m?22:24),tl[i],f.sm,'ttl','middle',g)});
   // 内容：文件、对象、表格
   {const r=el_[0],cx=C(r).x,y0=r.y+(m?60:56);for(let k=0;k<4;k++){const col=k%2,row=k>>1;const x=cx-34+col*40,y=y0+row*(m?56:50);
     el('path',{d:`M${x} ${y} h22 l8 8 v30 h-30 z`,class:'cell'},g)}}
   {const r=el_[1],cx=C(r).x,y0=r.y+(m?76:72);for(let k=0;k<4;k++){const col=k%2,row=k>>1;el('circle',{cx:cx-22+col*44,cy:y0+row*(m?56:50),r:m?14:15,class:'cell'},g)}}
   {const r=el_[2],cx=C(r).x;tx(cx,r.y+(m?52:50),'schema · 表',f.xs,'ink3-t','middle',g);const cwid=m?28:34,ch=m?20:18,x0=cx-2*cwid,y0=r.y+(m?72:68);
    for(let rr=0;rr<4;rr++)for(let c=0;c<4;c++)el('rect',{x:x0+c*cwid,y:y0+rr*ch,width:cwid,height:ch,class:'cell'+(rr===0?' hd':'')},g)}
   const chipN=['快照','数据缩减','适用表复制','配额'],cxs=m?[66,182,298,414]:[240,400,560,720],chw=m?104:140;
   E.s1.chip=cxs.map((x,i)=>{const r=R(x-chw/2,m?478:388,chw,m?38:38);const b=box(r,g,'box soft',19);tx(x,C(r).y,chipN[i],f.sm,'lbl','middle',g);return b});
  }
  /* ===== 第 2 步：列值写入缓冲，提交后迁移 ===== */
  {const g=grp('2');const s={};E.s2=s;
   s.cl=m?R(150,10,180,56):R(20,200,150,60);s.cn=m?R(150,94,180,52):R(222,200,170,60);
   s.scm=m?R(30,176,420,190):R(446,90,210,280);s.qlc=m?R(30,404,420,184):R(718,90,222,280);
   box(s.cl,g);tx(C(s.cl).x,C(s.cl).y-11,'应用',f.sm,'lbl','middle',g);tx(C(s.cl).x,C(s.cl).y+12,'INSERT',f.xs,'slate-t mono st','middle',g);
   s.cnB=box(s.cn,g);
   tx(C(s.cn).x,C(s.cn).y,'CNode',f.sm,'lbl b7','middle',g);
   s.scmB=box(s.scm,g,'box',14);tx(s.scm.x+16,s.scm.y+22,'持久写缓冲',f.sm,'ttl','start',g);
   s.qlcB=box(s.qlc,g,'box',14);tx(s.qlc.x+16,s.qlc.y+22,'容量闪存',f.sm,'ttl','start',g);
   const cw=m?34:36,chh=m?24:26,gap=4;
   // 写缓冲中的列值
   s.rowX0=m?252:470;s.rowY=[0,1,2,3].map(r=>(m?s.scm.y+62:s.scm.y+72)+r*(chh+(m?6:10)));
   s.slot=s.rowY.map(y=>[0,1,2,3].map(c=>el('rect',{x:s.rowX0+c*(cw+gap),y:y-chh/2,width:cw,height:chh,rx:3,class:'cell'},g)));
   ['a','b','c','d'].forEach((t,c)=>tx(s.rowX0+c*(cw+gap)+cw/2,s.rowY[0]-chh/2-14,t,f.xs,'ink3-t mono','middle',g));
   tx(m?s.scm.x+16:s.scm.x+16,m?s.rowY[3]+chh/2+16:s.scm.y+s.scm.h-22,'分列暂存',f.xs,'ink3-t','start',g);
   s.grpLbl=tx(m?s.scm.x+s.scm.w-16:C(s.scm).x,m?s.scm.y+22:s.scm.y+s.scm.h-46,'提交后可查',f.xs,'slate-t st',m?'end':'middle',g);
   if(!m)s.grpLbl.setAttribute('x',s.scm.x+s.scm.w-16),s.grpLbl.setAttribute('text-anchor','end');
   // QLC 列块
   s.colX=[0,1,2,3].map(c=>m?s.qlc.x+130+c*(cw+20):s.qlc.x+24+c*(cw+14));
   s.colY=[0,1,2,3].map(r=>(m?s.qlc.y+64:s.qlc.y+72)+r*(chh+4));
   s.qcell=s.colX.map(x=>s.colY.map(y=>el('rect',{x,y:y-chh/2,width:cw,height:chh,rx:3,class:'cell'},g)));
   ['a','b','c','d'].forEach((t,c)=>tx(s.colX[c]+cw/2,m?s.colY[3]+chh/2+14:s.colY[0]-chh/2-14,t,f.xs,'ink3-t mono','middle',g));
   tx(m?s.qlc.x+s.qlc.w-16:s.qlc.x+16,m?s.qlc.y+22:s.qlc.y+s.qlc.h-22,'列存：每列单独成块',f.xs,'ink3-t',m?'end':'start',g);
   s.cw=cw;s.chh=chh;
   // 连线
   const a1=out_(s.cl),b1=in_(s.cn);line(a1,b1,'',g);s.p1=[a1,b1];
   const a2=out_(s.cn),b2=in_(s.scm);line(a2,b2,'',g);s.p2=[a2,b2];
   const a3=out_(s.scm),b3=in_(s.qlc);line(a3,b3,'',g);s.p3=[a3,b3];
   // 写缓冲与闪存里的内部走线
   if(!m){s.busS=s.scm.x+12;s.busQ=s.qlc.x+12;s.outS=s.scm.x+s.scm.w-12;
    line(P(s.scm.x,b2.y),P(s.busS,b2.y),'thin',g);poly([P(s.busS,s.rowY[0]),P(s.busS,s.rowY[3])],'thin',g);
    s.rowY.forEach(y=>line(P(s.busS,y),P(s.rowX0,y),'thin',g));
    s.rowY.forEach(y=>line(P(s.rowX0+4*(cw+gap)-gap,y),P(s.outS,y),'thin',g));poly([P(s.outS,s.rowY[0]),P(s.outS,s.rowY[3])],'thin',g);line(P(s.outS,a3.y),P(s.scm.x+s.scm.w,a3.y),'thin',g);
    line(P(s.qlc.x,b3.y),P(s.busQ,b3.y),'thin',g);poly([P(s.busQ,s.colY[0]),P(s.busQ,s.colY[3])],'thin',g);s.colY.forEach(y=>line(P(s.busQ,y),P(s.colX[0],y),'thin',g));}
   else{s.busS=b2.x;s.outS=s.scm.x+s.scm.w-16;
    poly([P(b2.x,s.scm.y),P(b2.x,s.rowY[3])],'thin',g);
    s.rowY.forEach(y=>line(P(s.busS,y),P(s.rowX0,y),'thin',g));
    s.rowY.forEach(y=>line(P(s.rowX0+4*(cw+gap)-gap,y),P(s.outS,y),'thin',g));poly([P(s.outS,s.rowY[0]),P(s.outS,s.scm.y+s.scm.h-8),P(a3.x,s.scm.y+s.scm.h-8),P(a3.x,s.scm.y+s.scm.h)],'thin',g);
    s.busQ=s.qlc.y+40;line(P(b3.x,s.qlc.y),P(b3.x,s.busQ),'thin',g);line(P(s.colX[0]+cw/2,s.busQ),P(s.colX[3]+cw/2,s.busQ),'thin',g);
    s.colX.forEach(x=>line(P(x+cw/2,s.busQ),P(x+cw/2,s.colY[0]-chh/2),'thin',g));}
  }
  /* ===== 第 3 步：列块小，先看页脚 ===== */
  {const g=grp('3');const s={};E.s3=s;
   s.cn=m?R(140,14,200,52):R(330,22,300,60);box(s.cn,g);
   tx(C(s.cn).x,C(s.cn).y,'CNode',f.sm,'lbl b7','middle',g);
   s.q=tx(m?240:s.cn.x-24,m?92:C(s.cn).y,'WHERE 金额 > 500',f.sm,'slate-t mono st',m?'middle':'end',g);
   s.cnt=tx(m?240:s.cn.x+s.cn.w+24,m?118:C(s.cn).y,'',f.sm,'lbl st',m?'middle':'start',g);
   const V=[[12,380],[40,620],[5,90],[510,990],[100,500],[300,700]];s.V=V;
   const cw=m?120:128,chh=m?132:150;
   s.ch=V.map((v,k)=>m?R([26,180,334][k%3],[154,330][Math.floor(k/3)],cw,chh):R(36+k*150,184,cw,chh));
   tx(m?26:36,m?488:362,'列块统计：最小值–最大值',f.xs,'ink3-t','start',g);
   s.box=[];s.ft=[];s.lb=[];s.path=[];
   const busY=m?136:126;
   s.ch.forEach((r,k)=>{
    // 连线：桌面从块顶部上到总线；手机走块之间的竖向空隙
    let pts;
    if(!m){pts=[P(C(r).x,r.y),P(C(r).x,busY),P(C(s.cn).x,busY),P(C(s.cn).x,s.cn.y+s.cn.h)]}
    else{const gx=k%3===2?317:163,ex=k%3===0?r.x+r.w:r.x;const ey=r.y+30;pts=[P(ex,ey),P(gx,ey),P(gx,busY),P(240,busY),P(240,s.cn.y+s.cn.h)]}
    s.path.push(pts);poly(pts,'thin',g);
    s.box.push(box(r,g,'box',10));
    tx(r.x+12,r.y+18,'块 '+(k+1),f.xs,'ink3-t','start',g);
    for(let j=0;j<3;j++)el('rect',{x:r.x+14,y:r.y+(m?36:40)+j*(m?14:16),width:(r.w-28)*(0.35+0.6*((k*7+j*3)%5)/4),height:m?8:9,rx:2,class:'cell'},g);
    const fr=R(r.x+6,r.y+r.h-(m?38:40),r.w-12,m?32:34);s.ft.push(el('rect',{x:fr.x,y:fr.y,width:fr.w,height:fr.h,rx:6,class:'cell hd'},g));
    tx(C(fr).x,C(fr).y,V[k][0]+'–'+V[k][1],f.sm,'lbl mono','middle',g);
    s.lb.push(tx(C(r).x,r.y+(m?83:96),'',f.xs,'st','middle',g));
   });
  }
  /* ===== 第 4 步：过滤下推，两条路同时跑 ===== */
  {const g=grp('4');const s={};E.s4=s;
   const ly=m?[220,420]:[150,330];s.ly=ly;
   s.note=tx(m?240:936,m?530:24,'示意，不代表实测数字',f.xs,'ink3-t',m?'middle':'end',g);
   s.ln=[];s.tb=[];s.cn=[];s.en=[];s.num=[];
   ly.forEach((y,i)=>{
    const tb=m?R(8,y-28,78,56):R(24,y-30,130,60),cn=m?R(112,y-28,130,56):R(210,y-30,180,60),en=m?R(300,y-28,96,56):R(610,y-30,160,60);
    tx(m?8:24,m?y-60:y-62,i?'下推':'不下推',f.lbl,'lbl b7','start',g);
    line(out_(tb),in_(cn),'',g);line(P(cn.x+cn.w,y),P(en.x,y),'',g);
    tx((cn.x+cn.w+en.x)/2,y-16,'网络',f.xs,'ink3-t','middle',g);
    s.tb.push(box(tb,g));tx(C(tb).x,y,'表',f.sm,'lbl','middle',g);
    s.cn.push(box(cn,g));
    tx(C(cn).x,y-14,'CNode',f.sm,'lbl b7','middle',g);
    tx(C(cn).x,y+14,i?'先按条件过滤':'只把行读出',f.xs,i?'sage-t st':'ink3-t','middle',g);
    s.en.push(box(en,g));tx(C(en).x,y,'查询引擎',f.sm,'lbl','middle',g);
    const cx=m?440:868;tx(cx,y-22,m?'回传':'经网络回传',f.xs,'ink3-t','middle',g);
    s.num.push(tx(cx,y+14,'0',f.big,'num '+(i?'sage-t':'rose-t'),'middle',g));
    s.ln.push({tb,cn,en});
   });
  }
  /* ===== 第 5 步：原生引擎跑在 CNode 上，外部引擎走连接器 ===== */
  {const g=grp('5');const s={};E.s5=s;
   s.fr=m?R(20,90,440,290):R(300,40,360,360);box(s.fr,g,'box frame',16);tx(s.fr.x+16,s.fr.y+24,'集群',f.sm,'ttl','start',g);
   const cxs=m?[130,240,350]:[380,480,580],cw=m?100:92;
   s.cn=cxs.map(x=>{const r=R(x-cw/2,m?130:84,cw,m?44:50);box(r,g);tx(x,C(r).y,'CNode',f.sm,'lbl','middle',g);return r});
   s.band=m?R(40,194,400,40):R(318,160,324,44);s.bandB=box(s.band,g,'box fillv',10);tx(C(s.band).x,C(s.band).y,'原生查询引擎',f.sm,'violet-t st','middle',g);
   s.cn.forEach(r=>line(P(C(r).x,r.y+r.h),P(C(r).x,s.band.y),'thin',g));
   s.tb=m?R(140,280,200,56):R(360,300,240,60);s.tbB=box(s.tb,g);tx(C(s.tb).x,C(s.tb).y,'DataBase 表',f.sm,'lbl','middle',g);
   line(P(C(s.band).x,s.band.y+s.band.h),P(C(s.tb).x,s.tb.y),'',g);
   s.cl=m?R(120,12,240,48):R(24,152,230,60);s.clB=box(s.cl,g);tx(C(s.cl).x,C(s.cl).y,'ADBC / Python SDK',f.sm,'lbl','middle',g);
   s.p1=m?[P(240,60),P(240,s.band.y)]:[P(s.cl.x+s.cl.w,C(s.cl).y),P(s.band.x,C(s.band).y)];
   if(m){s.p1=[P(240,60),P(240,s.cn[1].y)]}
   poly(s.p1,'',g);
   const en=['Trino','Spark'];
   s.en=en.map((t,i)=>{const r=m?R([146,334][i]-66,440,132,48):R(738,92+i*84,180,52);box(r,g);tx(C(r).x,C(r).y,t,f.sm,'lbl','middle',g);return r});
   s.pe=s.en.map(r=>m?[P(C(r).x,r.y),P(C(r).x,404),P(C(s.tb).x,404),P(C(s.tb).x,s.tb.y+s.tb.h)]:[P(r.x,C(r).y),P(700,C(r).y),P(700,C(s.tb).y),P(s.tb.x+s.tb.w,C(s.tb).y)]);
   s.pe.forEach(p=>poly(p,'',g));
   tx(m?240:708,m?510:398,'连接器',f.xs,'ink3-t',m?'middle':'start',g);
  }
  /* ===== 第 6 步：Event Broker，topic 即表 ===== */
  {const g=grp('6');const s={};E.s6=s;
   if(!m){s.pr=R(20,140,170,60);s.fr=R(232,36,552,386);s.cn=[0,1,2].map(i=>R(252,92+i*84,130,62));s.tb=R(420,92,340,300);
    s.kc=R(812,110,136,70);s.sq=R(812,262,136,70)}
   else{s.pr=R(150,10,180,48);s.fr=R(8,80,464,420);s.cn=[0,1,2].map(i=>R([84,240,396][i]-68,120,136,60));s.tb=R(30,226,428,262);
    s.kc=R(26,528,200,58);s.sq=R(254,528,200,58)}
   box(s.fr,g,'box frame',16);tx(s.fr.x+16,s.fr.y+24,'Event Broker',f.sm,'ttl','start',g);
   box(s.pr,g);tx(C(s.pr).x,C(s.pr).y,'Kafka 生产者',f.sm,'lbl','middle',g);
   const sub=['P0 的 leader','P1 的 leader',''];
   s.cnB=s.cn.map((r,i)=>{const b=box(r,g);tx(C(r).x,sub[i]?C(r).y-11:C(r).y,'CNode',f.sm,'lbl','middle',g);if(sub[i])tx(C(r).x,C(r).y+12,sub[i],f.xs,i?'ochre-t st':'slate-t st','middle',g);return b});
   // 表头与行
   const cols=m?[146,282]:[110,230],hh=m?30:32,rh=m?29:30;s.cols=cols;s.rh=rh;
   s.tbB=box(s.tb,g,'box',8);let x=s.tb.x;['key','value'].forEach((t,c)=>{el('rect',{x,y:s.tb.y,width:cols[c],height:hh,class:'cell hd'},g);tx(x+cols[c]/2,s.tb.y+hh/2,t,f.xs,'ink2-t st','middle',g);x+=cols[c]});
   s.rowY=[];for(let k=0;k<8;k++)s.rowY.push(s.tb.y+hh+4+rh/2+k*rh);
   s.rows=s.rowY.map((y,k)=>{const r=el('rect',{x:s.tb.x+4,y:y-rh/2+2,width:s.tb.w-8,height:rh-4,rx:4,class:'cell'},g);r.style.opacity=0;
     let xx=s.tb.x;const ts=['k'+(k+1),'{"v":'+(k*7+3)+'}'].map((v,c)=>{const t=tx(xx+cols[c]/2,y,v,f.xs,'lbl mono','middle',g);xx+=cols[c];t.style.opacity=0;return t});
     return {r,ts}});
   box(s.kc,g);tx(C(s.kc).x,C(s.kc).y-11,'Kafka 消费者',f.sm,'lbl','middle',g);tx(C(s.kc).x,C(s.kc).y+12,'按分区读',f.xs,'ink3-t','middle',g);
   box(s.sq,g);tx(C(s.sq).x,C(s.sq).y-11,'SQL 查询',f.sm,'lbl','middle',g);tx(C(s.sq).x,C(s.sq).y+12,'读取已提交消息',f.xs,'ink3-t','middle',g);
   // 走线
   if(!m){const bx=215,ib=400;line(P(s.pr.x+s.pr.w,C(s.pr).y),P(bx,C(s.pr).y),'',g);poly([P(bx,C(s.cn[0]).y),P(bx,C(s.cn[1]).y)],'',g);
     [0,1].forEach(i=>line(P(bx,C(s.cn[i]).y),P(s.cn[i].x,C(s.cn[i]).y),'',g));
     [0,1,2].forEach(i=>line(P(s.cn[i].x+s.cn[i].w,C(s.cn[i]).y),P(ib,C(s.cn[i]).y),'thin',g));poly([P(ib,s.rowY[0]),P(ib,s.rowY[7])],'thin',g);
     s.toP=i=>[P(s.pr.x+s.pr.w,C(s.pr).y),P(bx,C(s.pr).y),P(bx,C(s.cn[i]).y),P(s.cn[i].x,C(s.cn[i]).y)];
     s.toR=(i,k)=>[C(s.cn[i]),P(s.cn[i].x+s.cn[i].w,C(s.cn[i]).y),P(ib,C(s.cn[i]).y),P(ib,s.rowY[k]),P(s.tb.x+20,s.rowY[k])];
     s.toK=k=>[P(s.tb.x+s.tb.w-20,s.rowY[k]),P(798,s.rowY[k]),P(798,C(s.kc).y),P(s.kc.x,C(s.kc).y)];
     s.toS=k=>[P(s.tb.x+s.tb.w-20,s.rowY[k]),P(798,s.rowY[k]),P(798,C(s.sq).y),P(s.sq.x,C(s.sq).y)];
     poly([P(s.tb.x+s.tb.w,s.rowY[0]),P(798,s.rowY[0]),P(798,s.rowY[7]),P(s.tb.x+s.tb.w,s.rowY[7])],'thin',g);
     line(P(798,C(s.kc).y),P(s.kc.x,C(s.kc).y),'',g);line(P(798,C(s.sq).y),P(s.sq.x,C(s.sq).y),'',g);}
   else{const by=72,ib=18;line(P(240,s.pr.y+s.pr.h),P(240,by),'',g);line(P(C(s.cn[0]).x,by),P(C(s.cn[1]).x,by),'',g);[0,1].forEach(i=>line(P(C(s.cn[i]).x,by),P(C(s.cn[i]).x,s.cn[i].y),'',g));
     const yb=s.cn[0].y+s.cn[0].h+20;[0,1,2].forEach(i=>line(P(C(s.cn[i]).x,s.cn[i].y+s.cn[i].h),P(C(s.cn[i]).x,yb),'thin',g));line(P(ib,yb),P(C(s.cn[2]).x,yb),'thin',g);poly([P(ib,yb),P(ib,s.rowY[7])],'thin',g);
     s.toP=i=>[P(240,s.pr.y+s.pr.h),P(240,by),P(C(s.cn[i]).x,by),P(C(s.cn[i]).x,s.cn[i].y)];
     s.toR=(i,k)=>[C(s.cn[i]),P(C(s.cn[i]).x,s.cn[i].y+s.cn[i].h),P(C(s.cn[i]).x,yb),P(ib,yb),P(ib,s.rowY[k]),P(s.tb.x+20,s.rowY[k])];
     const ob=s.tb.y+s.tb.h;s.toK=k=>[P(C(s.kc).x,ob),P(C(s.kc).x,s.kc.y)];s.toS=k=>[P(C(s.sq).x,ob),P(C(s.sq).x,s.sq.y)];
     line(P(C(s.kc).x,ob),P(C(s.kc).x,s.kc.y),'',g);line(P(C(s.sq).x,ob),P(C(s.sq).x,s.sq.y),'',g);}
  }
 },
 reset(){svg.querySelectorAll('.box').forEach(b=>b.classList.remove('on','ok','hot','vio','och','off'));
  svg.querySelectorAll('.ln').forEach(b=>b.classList.remove('lit','ok','hot','off'));cap('','')},
 modes:[]
};
/* 小行块：4 格分别着四列的颜色 */
function rowTile(){const g=el('g',{class:'rowt'},E.pk);const w=10,h=L.mobile?12:14;for(let c=0;c<4;c++)el('rect',{x:-2*w-3+c*(w+2),y:-h/2,width:w,height:h,rx:2,class:'pkt '+COLC[c]},g);const o={el:g};S.items.push(o);put(o,-99,-99,0);return o}
/* 第 1 步 */
SCENE.modes[0]={enter(){cap('表和文件、对象用同一套存储与元数据','ink2-t');S.v.b=[0,1,2].map(()=>pk())},
 frame(t){const s=E.s1,u=t%6;
  S.v.b.forEach((o,i)=>{const p=run(o,s.path[i],u,0.2+i*0.35,0.9);s.el[i].classList.toggle('on',p>1||(u>1.4+i*0.35&&u<2.2))});
  s.chip.forEach((c,i)=>c.classList.toggle('ok',u>2.3+i*0.35&&u<5.8));
  s.el.forEach(e=>e.classList.toggle('ok',u>2.3&&u<5.8))}};
/* 第 2 步 */
SCENE.modes[1]={enter(){const s=E.s2;S.v.rows=[0,1,2,3].map(()=>rowTile());S.v.ack=dot('ok');
  S.v.cells=[];for(let r=0;r<4;r++)for(let c=0;c<4;c++){S.v.cells.push(pk(COLC[c],s.cw-6,s.chh-8))}
  // 每行的路线：应用 → CNode → SCM → 槽位
  S.v.rp=s.rowY.map(y=>L.mobile?cat(s.p1,s.p2,[P(s.busS,y),P(s.rowX0+30,y)]):cat(s.p1,s.p2,[P(s.busS,s.p2[1].y),P(s.busS,y),P(s.rowX0+30,y)]));
 },
 frame(t){const s=E.s2,u=t%12,m=L.mobile;
  const ph1=u<5.6;cap(ph1?'各列的值暂存于写缓冲':'提交后由后台迁移到闪存',ph1?'sage-t':'slate-t');
  for(let r=0;r<4;r++){const t0=0.3+r*1.25,d=dur(S.v.rp[r])*0.8;const p=run(S.v.rows[r],S.v.rp[r],u,t0,d,0.15);
   const landed=u>t0+d,moved=u>6.2+0.0;
   s.slot[r].forEach((c,ci)=>{c.setAttribute('class','cell'+(landed&&!(u>6.2+ci*0.3)?' '+COLC[ci].replace('slate','on'):''))});
  }
  const back=rev(cat(s.p1,s.p2));run(S.v.ack,back,u,5.35,dur(back)*0.7,0.12);
  s.cnB.classList.toggle('on',u<5.4);
  s.grpLbl.style.opacity=u>5.35&&u<6.6?1:0;s.scmB.classList.toggle('on',u>5.35&&u<6.6);
  // 迁移：每格沿 SCM 内部走线出来，经连线进 QLC，再落到对应列
  for(let r=0;r<4;r++)for(let c=0;c<4;c++){const o=S.v.cells[r*4+c],y=s.rowY[r],x=s.rowX0+c*(s.cw+4)+s.cw/2,ty=s.colY[r],tx_=s.colX[c]+s.cw/2;
   let pts;
   if(!m)pts=[P(x,y),P(s.outS,y),P(s.outS,s.p3[0].y),s.p3[0],s.p3[1],P(s.busQ,s.p3[1].y),P(s.busQ,ty),P(tx_,ty)];
   else pts=[P(x,y),P(s.outS,y),P(s.outS,s.scm.y+s.scm.h-8),P(s.p3[0].x,s.scm.y+s.scm.h-8),s.p3[0],s.p3[1],P(s.p3[1].x,s.busQ),P(tx_,s.busQ),P(tx_,ty)];
   const t0=6.2+c*0.3,d=1.7;const p=run(o,pts,u,t0,d,0.05);
   s.qcell[c][r].setAttribute('class','cell'+(u>t0+d&&u<11.6?' '+COLC[c].replace('slate','on'):''));}
  s.qlcB.classList.toggle('on',u>8.6&&u<11.6)}};
/* 第 3 步 */
SCENE.modes[2]={enter(){cap('最大值小于或等于 500 的块可以跳过','slate-t');S.v.p=[];E.s3.V.forEach(v=>{if(v[1]>500)S.v.p.push(pk())})},
 frame(t){const s=E.s3,u=t%8;let n=0,j=0;
  s.V.forEach((v,k)=>{const seen=u>0.4+k*0.3,hit=v[1]>500,dec=u>2.4;
   s.ft[k].setAttribute('class','cell hd'+(seen&&!dec?' och':''));
   s.box[k].setAttribute('class','box'+(dec?(hit?' on':' off'):''));
   s.lb[k].textContent=dec?T(hit?'读取':'跳过'):'';s.lb[k].setAttribute('class','st '+(hit?'slate-t':'ink3-t'));
   if(hit){const o=S.v.p[j++];const pts=s.path[k];const p=run(o,L.mobile?cat([C(s.ch[k])],pts):cat([C(s.ch[k]),P(C(s.ch[k]).x,s.ch[k].y)],pts),u,2.8+j*0.25,1.6,0.3);if(p>1)n++}});
  s.cnt.textContent=u>2.4?T('读取 ')+'3 / 6 '+T('块'):''}};
/* 第 4 步：两条路同时跑，计数经网络回传的行 */
SCENE.modes[3]={enter(){cap('下推之后，网络上只走命中的行','sage-t');S.v.a=[];S.v.b=[];for(let k=0;k<22;k++){const hit=k%4===1;S.v.a.push(pk(hit?'ok':''));S.v.b.push(pk(hit?'ok':''))}},
 frame(t){const s=E.s4,cyc=10,u=t%cyc;let na=0,nb=0;
  const fo=u>9.4?Math.max(0,(cyc-u)/0.6):u<0.3?u/0.3:1;
  for(let k=0;k<22;k++){const hit=k%4===1,t0=0.3+k*0.36;
   [0,1].forEach(i=>{const o=(i?S.v.b:S.v.a)[k],l=s.ln[i],y=s.ly[i];
    const a=P(l.tb.x+l.tb.w-12,y),c1=P(l.cn.x,y),c2=P(l.cn.x+l.cn.w,y),e=P(l.en.x+10,y);
    const d1=(c1.x-a.x)/L.sp,d2=(e.x-c1.x)/L.sp;
    let p;if(i===0||hit){p=run(o,[a,c1,c2,e],u,t0,d1+d2,0.3);if(p>1){if(i)nb++;else na++}}
    else p=run(o,[a,c1],u,t0,d1,0.3);
    if(p>=0){const inside=o.x>c1.x+4&&o.x<c2.x-4;o.el.style.opacity=(inside?0:o.a)*fo}
   });}
  s.num[0].textContent=na;s.num[1].textContent=nb;s.num[0].style.opacity=fo;s.num[1].style.opacity=fo}};
/* 第 5 步 */
SCENE.modes[4]={enter(){cap('多个引擎查询同一张表','ink2-t');S.v.q=pk('vio');S.v.r=pk('ok');S.v.e=[0,1,2].map(()=>pk());S.v.er=[0,1,2].map(()=>pk('ok'))},
 frame(t){const s=E.s5,u=t%6.5,m=L.mobile;
  const pq=m?cat(s.p1,[P(240,C(s.band).y),P(240,s.tb.y)]):cat(s.p1,[P(C(s.band).x,C(s.band).y),P(C(s.tb).x,s.tb.y)]);
  run(S.v.q,pq,u,0.2,1.4,0.1);run(S.v.r,rev(pq),u,1.9,1.4);
  s.bandB.classList.toggle('vio',u>0.9&&u<3.2);
  s.pe.forEach((p,i)=>{run(S.v.e[i],p,u,0.5+i*0.4,1.2,0.1);run(S.v.er[i],rev(p),u,1.9+i*0.4,1.2)});
  s.tbB.classList.toggle('on',u>1.4&&u<4.2)}};
/* 第 6 步 */
SCENE.modes[5]={enter(){S.v.m=[];for(let k=0;k<8;k++)S.v.m.push(pk(k%2?'och':''));S.v.k=[0,1,2,3].map(()=>pk());S.v.s=[0,1,2,3,4,5,6,7].map(()=>pk('ok'))},
 frame(t){const s=E.s6,u=t%12;
  const ph=u<5.8?0:u<8.4?1:2;
  cap(['每个 topic 是一张表，消息作为行写入','Kafka 消费者照常按分区读','SQL 读取符合条件的 topic 表'][ph],['ink2-t','slate-t','sage-t'][ph]);
  for(let k=0;k<8;k++){const i=k%2,t0=0.2+k*0.6,p1=s.toP(i),p2=s.toR(i,k);const d1=dur(p1)*0.7,d2=dur(p2)*0.7;
   const o=S.v.m[k];if(u<t0+d1)run(o,p1,u,t0,d1,0);else run(o,p2,u,t0+d1,d2,0.15);
   const on=u>t0+d1+d2&&u<11.6;const row=s.rows[k];row.r.style.opacity=on?1:0;row.ts.forEach(x=>x.style.opacity=on?1:0);
   row.r.setAttribute('class','cell'+(ph===1&&i===0&&on?' on':ph===2&&on?' ok':''));
   s.cnB[i].classList.toggle(i?'och':'on',u>t0+d1-0.1&&u<t0+d1+0.4);}
  [0,2,4,6].forEach((k,j)=>run(S.v.k[j],s.toK(k),u,5.9+j*0.4,0.9));
  for(let k=0;k<8;k++)run(S.v.s[k],s.toS(k),u,8.5+k*0.08,1.0)}};
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
