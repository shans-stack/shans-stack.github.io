/* S3：同一份数据，按文件写进去，按对象读出来：5 步动画（SVG，按时间写死的时间线，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-s3'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下更紧的排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-s3.css，全部限定在 .ssa-v-s3 容器之内。 */
(function(){
var ID='v-s3',NSTEPS=5;
var EN={"NFS 客户端":"NFS client","SMB 客户端":"SMB client","S3 客户端":"S3 client","Element Store":"Element Store","NVMe-oF":"NVMe-oF",
"地址 1":"IP 1","地址 2":"IP 2","地址 3":"IP 3","地址 4":"IP 4","地址 5":"IP 5","地址 6":"IP 6",
"src/":"src/","component":"component","src/component":"src/component","文件：/dev":"Files: /dev","S3 桶：dev":"S3 bucket: dev","桶：dev":"Bucket: dev",
"权限位 rwxr-x---":"Mode bits rwxr-x---","rwxr-x---":"rwxr-x---","身份策略 · 桶策略 · ACL":"Identity · bucket policies · ACL",
"PUT 存对象，GET 取对象：桶加键":"PUT stores an object, GET fetches it: bucket plus key","HTTP / HTTPS · 签名 v2 / v4":"HTTP(S) · signatures v2 / v4","PUT":"PUT","GET":"GET","已写入":"Stored","已读取":"Read",
"CNode 处理发往 VIP 的请求":"CNodes handle requests sent to VIPs","多协议 view 使用共享命名空间":"Multiprotocol views share a namespace",
"component 与 src/component 是同一个元素":"component and src/component are one element","一个 view 可以同时开 NFS、SMB、S3":"One view can open NFS, SMB and S3 at once",
"NFS 写文件，S3 按相对路径读取":"NFS writes; S3 reads by relative path","键首、键尾的 / 或键中的 //：仅 S3":"Leading, trailing or repeated /: S3 only","写入":"Written","读取成功":"Read OK",
"flavor = NFS：S3 请求也按权限位检查":"Flavor = NFS: S3 requests are checked against mode bits","S3 Native：优先检查身份和桶策略":"S3 Native: identity and bucket policies first",
"权限未修改":"Change ignored","不用于检查":"Not used","换成 S3 Native":"Switch to S3 Native","换成 NFS":"Switch to NFS","切换 security flavor，当前 ":"Switch security flavor, now ","NFS flavor":"NFS flavor","S3 Native flavor":"S3 Native flavor",
"VAST 上的 S3：CNode 直接处理 S3 请求，同一份数据既是目录里的文件，也是桶里的对象":"S3 on VAST: CNodes serve S3 directly, and the same data is both a file in a directory and an object in a bucket"};
var ENM={"PUT 存对象，GET 取对象：桶加键":"PUT stores, GET fetches: bucket plus key","HTTP / HTTPS · 签名 v2 / v4":"HTTP(S) · signatures v2 / v4","CNode 处理发往 VIP 的请求":"CNodes handle requests sent to VIPs","多协议 view 使用共享命名空间":"Multiprotocol views share a namespace","component 与 src/component 是同一个元素":"component = src/component: one element","一个 view 可以同时开 NFS、SMB、S3":"One view, NFS + SMB + S3","NFS 写文件，S3 按相对路径读取":"NFS writes; S3 reads by relative path","键首、键尾的 / 或键中的 //：仅 S3":"Leading, trailing or repeated /: S3 only","flavor = NFS：S3 请求也按权限位检查":"NFS flavor: S3 checked against mode bits","S3 Native：优先检查身份和桶策略":"S3 Native: identity and bucket policies first","权限未修改":"Ignored","文件：/dev":"Files: /dev","S3 桶：dev":"Bucket: dev","身份策略 · 桶策略 · ACL":"Identity · bucket policies · ACL"};
var ARIA="VAST 上的 S3：CNode 直接处理 S3 请求，同一份数据既是目录里的文件，也是桶里的对象";
function lang(){return window.SS_LANG==='en'?'en':'zh'}
var NS='http://www.w3.org/2000/svg',CLS='ssa-'+ID;
function mount(host,opts){
opts=opts||{};
host.classList.add(CLS);host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','ssa-scene');svg.setAttribute('role','img');host.appendChild(svg);
const tgl=document.createElement('button');tgl.className='tgl';tgl.type='button';tgl.hidden=true;host.appendChild(tgl);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mq=matchMedia('(max-width: 640px)');
const qs=new URLSearchParams(location.search);
/* 文字：中文原样，英文取 EN；手机版放不下的用 ENM */
function T(s){if(lang()!=='en')return s;if(L&&L.mobile&&ENM[s]!==undefined)return ENM[s];return EN[s]!==undefined?EN[s]:s}
/* ---------- 通用小工具 ---------- */
function el(tag,a,p){const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);(p||svg).appendChild(e);return e}
function tx(x,y,s,size,cls,anchor,p){const t=el('text',{x,y,'font-size':size,class:cls||''},p);if(anchor)t.setAttribute('text-anchor',anchor);t.textContent=T(s);return t}
function grp(show,p,extra){const g=el('g',Object.assign({class:'vis'},extra||{}),p);if(show)g.dataset.show=show;return g}
function box(r,p,cls,rx){return el('rect',{x:r.x,y:r.y,width:r.w,height:r.h,rx:rx==null?12:rx,class:cls||'box'},p)}
function line(a,b,cls,p){return el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'ln '+(cls||'')},p)}
function poly(pts,cls,p){return el('path',{d:'M'+pts.map(q=>q.x+' '+q.y).join(' L'),class:'ln '+(cls||'')},p)}
const C=r=>({x:r.x+r.w/2,y:r.y+r.h/2});
const P=(x,y)=>({x,y});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sm=u=>u<=0?0:u>=1?1:u*u*(3-2*u);
function plen(pts){let s=0;for(let i=1;i<pts.length;i++)s+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);return s}
function at(pts,u){u=clamp(u,0,1);let d=u*plen(pts);for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],l=Math.hypot(b.x-a.x,b.y-a.y);if(d<=l||i===pts.length-1){const k=l?Math.min(1,d/l):0;return {x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k}}d-=l}return pts[pts.length-1]}
function rev(pts){return pts.slice().reverse()}
function cat(...ps){const o=[];ps.forEach(p=>p.forEach(q=>{const l=o[o.length-1];if(!l||l.x!==q.x||l.y!==q.y)o.push(q)}));return o}
/* 数据块与小圆点 */
let L=null,E,S,step=0,T0=0,raf=0,last=0,paused=!!opts.paused,dead=false,pausedAt=0;
function pk(cls){const r=el('rect',{x:-L.pw/2,y:-L.ph/2,width:L.pw,height:L.ph,rx:4,class:'pkt '+(cls||'')},E.pk);const o={el:r,kind:'pkt'};S.items.push(o);put(o,-99,-99,0);return o}
function dot(cls){const r=el('circle',{r:L.dr,cx:0,cy:0,class:'dot '+(cls||'')},E.pk);const o={el:r,kind:'dot'};S.items.push(o);put(o,-99,-99,0);return o}
function put(o,x,y,a){if(typeof x==='object'){a=y;y=x.y;x=x.x}o.x=x;o.y=y;o.a=a==null?1:a;o.el.setAttribute('transform',`translate(${x.toFixed(1)} ${y.toFixed(1)})`);o.el.style.opacity=o.a}
function hide(o){put(o,-99,-99,0)}
/* 沿路线走：t 在 [t0, t0+dur] 内走完，之后 fo 秒淡出；返回进度（<0 未出发，0–1 在路上，>1 已到） */
function run(o,pts,t,t0,dur,fo){fo=fo==null?0.3:fo;if(t<t0||t>t0+dur+fo){hide(o);return t<t0?-1:2}const u=(t-t0)/dur;if(u<=1){put(o,at(pts,sm(u)*0.15+u*0.85),1);return u}put(o,pts[pts.length-1],1-(t-t0-dur)/fo);return 1.5}
/* 小牌子（可整体移动）：中心 (x,y)，宽 w 高 h */
function chip(x,y,w,h,s,fs,cls,p){const g=el('g',{class:'chip '+(cls||'')},p);el('rect',{x:-w/2,y:-h/2,width:w,height:h,rx:6},g);const t=tx(0,0,s,fs,'','middle',g);g.setAttribute('transform',`translate(${x} ${y})`);return {g,t,x,y,w,h,set(s2){t.textContent=T(s2)},mv(nx,ny){this.x=nx;this.y=ny;g.setAttribute('transform',`translate(${nx.toFixed(1)} ${ny.toFixed(1)})`)}}}
function cap(s,c){E.cap.textContent=T(s);E.cap.setAttribute('class','st '+(c||'ink2-t'))}
function note(s,c){E.note.textContent=T(s);E.note.setAttribute('class','st '+(c||'ink3-t'))}
const dur=pts=>plen(pts)/L.sp;
/* ---------- 协议站共用画面：上排客户端与侧框、网络总线、三台 CNode（带地址牌）、NVMe-oF、存储带 ---------- */
function protoLayout(mobile){
 if(!mobile)return {W:960,H:520,mobile:false,f:{lbl:20,sm:17,cap:18,chip:17,big:32},pw:22,ph:16,dr:7,sp:330,
  cl:{xs:[170,400,630],y:16,w:178,h:60},side:{x:792,y:16,w:146,h:60},busY:102,
  cn:{xs:[200,480,760],y:124,w:220,h:106},chipW:68,chipH:28,fabY:256,fabX:[70,900],
  band:{x:60,y:276,w:840,h:172},bl:{x:84,y:312,w:250,h:120},br:{x:352,y:312,w:526,h:120},fileW:132,slotX:120,slotW:220,
  cap:{x:480,y:478},note:{x:480,y:506}};
 return {W:480,H:520,mobile:true,f:{lbl:19,sm:17,cap:17,chip:17,big:28},pw:18,ph:14,dr:6,sp:230,
  cl:{xs:[70,194,318],y:10,w:114,h:60},side:{x:388,y:10,w:84,h:60},busY:92,
  cn:{xs:[85,240,395],y:112,w:146,h:106},chipW:62,chipH:28,fabY:240,fabX:[12,468],
  band:{x:12,y:262,w:456,h:170},bl:{x:24,y:300,w:152,h:120},br:{x:188,y:300,w:268,h:120},fileW:104,slotX:84,slotW:172,
  cap:{x:240,y:460},note:{x:240,y:504}};
}
function protoBuild(o){
 const f=L.f,M=L.mobile,cl=L.cl,cn=L.cn;
 const g=grp(null);E.base=g;
 /* 总线 */
 const sx=L.side.x+L.side.w/2;
 const bx0=Math.min(cl.xs[0],cn.xs[0]),bx1=Math.max(cn.xs[2],o.side?sx:cl.xs[2]);
 E.bus=line(P(bx0,L.busY),P(bx1,L.busY),'',g);
 /* 客户端 */
 E.cl=cl.xs.map((x,i)=>{const r={x:x-cl.w/2,y:cl.y,w:cl.w,h:cl.h};const gg=el('g',{},g);gg.dataset.dim=(o.dimCl&&o.dimCl[i])||'';
  line(P(x,cl.y+cl.h),P(x,L.busY),'',gg);const b=box(r,gg);
  const lb=tx(x,cl.y+20,o.clients[i],f.lbl,'lbl','middle',gg);const sb=tx(x,cl.y+44,'',f.sm,'st','middle',gg);
  return {r,x,b,lb,sb,g:gg}});
 /* 侧框（DNS / AD / 策略） */
 if(o.side){const gs=grp(o.side,g);E.sideG=gs;const r=L.side;line(P(sx,r.y+r.h),P(sx,L.busY),'',gs);E.sideB=box(r,gs);
  E.sideT=tx(sx,r.y+r.h/2,'',f.lbl,'lbl b7','middle',gs)}
 /* CNode */
 const r1=cn.y+58,r2=cn.y+88,off=L.chipW/2+4;
 E.cn=cn.xs.map((x,k)=>{const r={x:x-cn.w/2,y:cn.y,w:cn.w,h:cn.h};const gg=el('g',{},g);
  line(P(x,L.busY),P(x,cn.y),'',gg);line(P(x,cn.y+cn.h),P(x,L.fabY),'',gg);const b=box(r,gg);
  tx(x,cn.y+24,'CNode '+(k+1),f.lbl,'lbl b7','middle',gg);
  return {r,x,b,g:gg,slots:[P(x-off,r1),P(x+off,r1),P(x,r2)]}});
 E.chips=[];for(let j=0;j<6;j++){const k=j%3,s=E.cn[k].slots[j<3?0:1];const c=chip(s.x,s.y,L.chipW,L.chipH,'地址 '+(j+1),f.chip,'',E.cn[k].g);c.home=s;c.k=k;E.chips.push(c)}
 /* 叉号 */
 E.xm=E.cn.map(c=>{const gx=el('g',{},g);const a=cn.h*0.3,b=cn.w*0.16,cy=cn.y+cn.h/2;
  [[-1,-1,1,1],[-1,1,1,-1]].forEach(([p,q,r,s])=>el('line',{x1:c.x+p*b,y1:cy+q*a,x2:c.x+r*b,y2:cy+s*a,class:'xmark'},gx));gx.style.opacity=0;return gx});
 /* NVMe-oF 与存储带 */
 E.fab=line(P(L.fabX[0],L.fabY),P(L.fabX[1],L.fabY),'',g);
 const B=L.band;box(B,g,'box soft',16);tx(B.x+(M?160:16),B.y+20,o.band,f.sm,'ttl','start',g);
 if(!M)tx(L.fabX[0]+4,L.fabY-14,'NVMe-oF',f.sm,'ink3-t','start',g);
 E.cap=tx(L.cap.x,L.cap.y,'',f.cap,'st','middle');E.note=tx(L.note.x,L.note.y,'',f.sm,'st','middle');
 /* 路线 */
 E.R={
  down:i=>[P(E.cl[i].x,cl.y+cl.h),P(E.cl[i].x,L.busY)],
  toCn:(i,k)=>cat(E.R.down(i),[P(E.cn[k].x,L.busY),P(E.cn[k].x,cn.y)]),
  toSide:i=>cat(E.R.down(i),[P(sx,L.busY),P(sx,L.side.y+L.side.h)]),
  cnTo:(k,x,y)=>[P(E.cn[k].x,cn.y+cn.h),P(E.cn[k].x,L.fabY),P(x,L.fabY),P(x,y)]
 };
}
/* 一串分段：{p:路线} 沿线走；{w:秒} 停顿（数据块藏在 CNode 里处理，或停在 at 处）。返回 段号+段内进度；走完后淡出 */
function seq(o,segs,t,t0){let tt=t-t0;if(tt<0){hide(o);return -1}
 for(let i=0;i<segs.length;i++){const s=segs[i],d=s.p?(s.d||dur(s.p)):s.w;
  if(tt<=d){if(s.p)put(o,at(s.p,d?tt/d:1),1);else if(s.at)put(o,s.at,1);else hide(o);return i+(d?tt/d:1)*0.999}tt-=d}
 const s=segs[segs.length-1];if(tt<0.3&&(s.p||s.at)){put(o,s.p?s.p[s.p.length-1]:s.at,1-tt/0.3)}else hide(o);return segs.length}
function seqLen(segs){return segs.reduce((a,s)=>a+(s.p?(s.d||dur(s.p)):s.w),0)}
/* 客户端经地址进 CNode（停顿处理）再到存储带 (x,y)；back=true 时再原路返回 */
function viaCn(i,k,x,y){return [{p:E.R.toCn(i,k)},{w:0.35,k},{p:E.R.cnTo(k,x,y)}]}
function backCn(i,k,x,y){return [{p:rev(E.R.cnTo(k,x,y))},{w:0.25,k},{p:rev(E.R.toCn(i,k))}]}
/* 段里带 k 的停顿：那台 CNode 亮 */
function cnLit(segs,r,base){E.cn.forEach(c=>c.b.classList.remove('on'));if(r<0)return;const i=Math.floor(r);const s=segs[i];if(s&&s.k!=null)E.cn[s.k].b.classList.add('on')}
function protoReset(){
 E.cn.forEach(c=>{c.b.classList.remove('on','dead','hot');c.g.classList.remove('dead')});
 E.cl.forEach(c=>{c.b.classList.remove('on','ok','hot');c.sb.textContent=''});
 E.chips.forEach(c=>{c.mv(c.home.x,c.home.y);c.g.classList.remove('on','mv');if(c.g.parentNode!==E.cn[c.k].g)E.cn[c.k].g.appendChild(c.g)});
 E.xm.forEach(x=>x.style.opacity=0);
 svg.querySelectorAll('.ln').forEach(l=>l.classList.remove('lit','ok'));
 E.cap.textContent='';E.note.textContent='';
}
function csub(i,s,c){E.cl[i].sb.textContent=T(s);E.cl[i].sb.setAttribute('class','st '+(c||'ink3-t'))}
/* CNode k 故障：调淡、打叉，它的地址牌移到别的 CNode 的第二排 */
function failCn(k,u){E.cn[k].g.classList.add('dead');E.xm[k].style.opacity=clamp(u*3,0,1);
 E.chips.filter(c=>c.k===k).forEach((c,n)=>{const tk=(k+1+n)%3,tgt=E.cn[tk].slots[2];if(c.g.parentNode!==E.base)E.base.appendChild(c.g);c.g.classList.add('mv');
  const v=sm(clamp((u-0.35)/0.5,0,1));c.mv(c.home.x+(tgt.x-c.home.x)*v,c.home.y+(tgt.y-c.home.y)*v)})}
const SCENE={
 still:[4.5,3.2,2.5,7,7],
 layout(m){const L=protoLayout(m);L.tgl={x:L.W/2,y:L.cap.y-(m?0:5)};return L},
 build(){
  const f=L.f,M=L.mobile;
  protoBuild({clients:['NFS 客户端','SMB 客户端','S3 客户端'],side:null,band:'Element Store',dimCl:['1 3','1 3 4 5','3']});
  const g=E.base,bl=L.bl,br=L.br;
  /* 左：文件视角 */
  const gl=el('g',{},g);gl.dataset.dim='1';box(bl,gl,'box',12);
  tx(bl.x+14,bl.y+bl.h-18,'文件：/dev',f.sm,'ttl','start',grp('1 2 3 4',gl));
  tx(bl.x+16,bl.y+26,'src/',f.sm,'ink2-t','start',grp('1 2 3 4',gl));
  tx(bl.x+14,bl.y+26,'文件：/dev',f.sm,'ttl','start',grp('5',gl));
  E.ruleL=tx(bl.x+14,bl.y+bl.h-18,M?'rwxr-x---':'权限位 rwxr-x---',f.sm,'st ink2-t','start',grp('5',gl));
  const lw=M?112:150,lx=bl.x+bl.w-14-lw/2,cy=bl.y+64;E.lX=lx+lw/2-16;E.lTop=cy-19;
  line(P(E.lX,L.fabY),P(E.lX,E.lTop),'',gl);E.lf=chip(lx,cy,lw,38,'component',f.chip,'file',gl);
  /* 右：对象视角 */
  box(br,g,'box',12);
  tx(br.x+14,br.y+br.h-18,'S3 桶：dev',f.sm,'ttl','start',grp('1 2 3 4',g));
  tx(br.x+14,br.y+26,'S3 桶：dev',f.sm,'ttl','start',grp('5',g));
  E.ruleR=tx(br.x+14,br.y+br.h-18,'身份策略 · 桶策略 · ACL',f.sm,'st ink2-t','start',grp('5',g));
  const rw=M?150:190,rx=br.x+16+rw/2;E.rX=rx+rw/2-16;E.rTop=cy-19;
  line(P(E.rX,L.fabY),P(E.rX,E.rTop),'',g);E.rf=chip(rx,cy,rw,38,'src/component',f.chip,'file',g);
  /* 同一份数据：两个牌子之间的虚线 */
  const gd=grp('3 4',g);E.link=[P(lx+lw/2,cy),P(rx-rw/2,cy)];E.dash=line(E.link[0],E.link[1],'dash',gd);
 },
 reset(){protoReset();[E.lf,E.rf].forEach(c=>{c.g.setAttribute('class','chip file');c.g.style.opacity=1});  E.ruleL.setAttribute('class','st ink2-t');E.ruleR.setAttribute('class','st ink2-t');E.dash.classList.remove('lit')},
 toggle:{step:4,param:'flavor',values:['nfs','s3'],def:'nfs',next:v=>v==='nfs'?'s3':'nfs',
  label:v=>v==='nfs'?'换成 S3 Native':'换成 NFS',aria:v=>T('切换 security flavor，当前 ')+T(v==='nfs'?'NFS flavor':'S3 Native flavor')},
 modes:[]
};
function lit(list){E.cn.forEach(c=>c.b.classList.remove('on'));list.forEach(([segs,r])=>{if(r<0)return;const s=segs[Math.floor(r)];if(s&&s.k!=null)E.cn[s.k].b.classList.add('on')})}
/* 第 1 步：PUT 与 GET */
SCENE.modes[0]={enter(){cap('PUT 存对象，GET 取对象：桶加键','slate-t');note('HTTP / HTTPS · 签名 v2 / v4');
  const v=S.v;v.a=viaCn(2,2,E.rX,E.rTop);v.b=viaCn(2,2,E.rX,E.rTop);v.c=backCn(2,2,E.rX,E.rTop);v.p=pk();v.g=dot();v.q=pk('ok');
  v.t2=0.3+seqLen(v.a)+0.9;v.t3=v.t2+seqLen(v.b)+0.2;v.per=v.t3+seqLen(v.c)+2.2},
 frame(t){const v=S.v,u=t%v.per;const a=seq(v.p,v.a,u,0.3),b=seq(v.g,v.b,u,v.t2),c=seq(v.q,v.c,u,v.t3);lit([[v.a,a],[v.b,b],[v.c,c]]);
  E.chips[2].g.classList.toggle('on',a>=0&&a<1.5||b>=0&&b<1.5||c>=1.5&&c<3);
  E.rf.g.style.opacity=a>=3?1:0;E.rf.g.classList.toggle('w',a>=3&&u<v.t2+0.6);E.rf.g.classList.toggle('on',b>=2.9&&c<0.5);
  csub(2,c>=3?'GET':a>=3?'PUT':'',c>=3?'sage-t':'slate-t')}};
/* 第 2 步：三种协议都由 CNode 处理 */
SCENE.modes[1]={enter(){cap('CNode 处理发往 VIP 的请求','slate-t');note('多协议 view 使用共享命名空间');
  const v=S.v;v.r=[viaCn(0,0,E.lX,E.lTop),viaCn(1,1,E.lX,E.lTop),viaCn(2,2,E.rX,E.rTop)];v.p=[pk(),pk(),pk()];v.per=Math.max(...v.r.map(seqLen))+1.6},
 frame(t){const v=S.v,u=t%v.per;const rs=v.r.map((r,i)=>seq(v.p[i],r,u,0.3+i*0.12));lit(v.r.map((r,i)=>[r,rs[i]]));
  [0,1,2].forEach(i=>E.chips[i].g.classList.toggle('on',rs[i]>=0&&rs[i]<1.5));
  E.lf.g.classList.toggle('on',rs[0]>=3||rs[1]>=3);E.rf.g.classList.toggle('on',rs[2]>=3)}};
/* 第 3 步：同一个元素，两种样子 */
SCENE.modes[2]={enter(){cap('component 与 src/component 是同一个元素','slate-t');note('一个 view 可以同时开 NFS、SMB、S3');S.v.d=dot();E.dash.classList.add('lit');E.lf.g.classList.add('on');E.rf.g.classList.add('on')},
 frame(t){const u=t%3.2,k=u<1.6?u/1.6:(3.2-u)/1.6;put(S.v.d,at(E.link,sm(k)),1)}};
/* 第 4 步：文件写进去，对象读出来 */
SCENE.modes[3]={enter(){cap('NFS 写文件，S3 按相对路径读取','sage-t');note('键首、键尾的 / 或键中的 //：仅 S3');
  const v=S.v;v.a=viaCn(0,0,E.lX,E.lTop);v.b=viaCn(2,2,E.rX,E.rTop);v.c=backCn(2,2,E.rX,E.rTop);v.p=pk();v.g=dot();v.q=pk('ok');v.d=dot('ok');
  v.t2=0.3+seqLen(v.a)+1.2;v.t3=v.t2+seqLen(v.b)+0.2;v.per=v.t3+seqLen(v.c)+2.2},
 frame(t){const v=S.v,u=t%v.per;const a=seq(v.p,v.a,u,0.3),b=seq(v.g,v.b,u,v.t2),c=seq(v.q,v.c,u,v.t3);lit([[v.a,a],[v.b,b],[v.c,c]]);
  E.chips[0].g.classList.toggle('on',a>=0&&a<1.5);E.chips[2].g.classList.toggle('on',b>=0&&b<1.5||c>=1.5&&c<3);
  const w=a>=3;E.lf.g.classList.toggle('w',w);E.rf.g.classList.toggle('w',w&&u>=v.t2-0.6);E.dash.classList.toggle('lit',w);
  if(w&&u<v.t2)put(v.d,at(E.link,clamp((u-(0.3+seqLen(v.a)))/0.6,0,1)),1);else hide(v.d);
  csub(0,w?'写入':'',w?'sage-t':'');csub(2,c>=3?'读取成功':'',c>=3?'sage-t':'')}};
/* 第 5 步：security flavor（一个按钮切换） */
SCENE.modes[4]={enter(){const s3=SCENE.toggle.state==='s3';
  E.cap.textContent='';note(s3?'S3 Native：优先检查身份和桶策略':'flavor = NFS：S3 请求也按权限位检查','slate-t');
  E.ruleL.setAttribute('class','st '+(s3?'ink3-t off':'slate-t b7'));E.ruleR.setAttribute('class','st '+(s3?'slate-t b7':'ink3-t off'));
  const v=S.v;v.s3=s3;
  v.a=viaCn(2,2,E.rX,E.rTop);v.b=backCn(2,2,E.rX,E.rTop);
  v.ci=s3?0:2;v.c=s3?viaCn(0,0,E.lX,E.lTop):viaCn(2,2,E.rX,E.rTop);
  v.p=pk();v.q=pk('ok');v.x=pk('v');v.t2=0.3+seqLen(v.a)+0.3;v.t3=v.t2+seqLen(v.b)+0.8;v.per=v.t3+seqLen(v.c)+2.6},
 frame(t){const v=S.v,u=t%v.per;const a=seq(v.p,v.a,u,0.3),b=seq(v.q,v.b,u,v.t2),c=seq(v.x,v.c,u,v.t3);lit([[v.a,a],[v.b,b],[v.c,c]]);
  E.rf.g.classList.toggle('on',a>=2.8&&b<0.6);
  E.chips[2].g.classList.toggle('on',a>=0&&a<1.5||b>=1.5&&b<3||!v.s3&&c>=0&&c<1.5);E.chips[0].g.classList.toggle('on',v.s3&&c>=0&&c<1.5);
  (v.s3?E.lf:E.rf).g.classList.toggle('hot',c>=3);
  if(v.s3){csub(2,b>=3?'读取成功':'',b>=3?'sage-t':'');csub(0,c>=3?'权限未修改':'',c>=3?'rose-t':'')}
  else csub(2,c>=3?'权限未修改':b>=3?'读取成功':'',c>=3?'rose-t':'sage-t')}};
/* ---------- 引擎 ---------- */
function applyVis(){
  svg.setAttribute('data-step',step+1);
  svg.querySelectorAll('[data-show]').forEach(g=>g.classList.toggle('hid',!g.dataset.show.split(' ').includes(String(step+1))));
  svg.querySelectorAll('[data-dim]').forEach(g=>g.classList.toggle('dim',g.dataset.dim.split(' ').includes(String(step+1))));
  const TG=SCENE.toggle;tgl.hidden=!(TG&&TG.step===step);
  if(TG&&L.tgl){tgl.style.left=(L.tgl.x/L.W*100)+'%';tgl.style.top=(L.tgl.y/L.H*100)+'%'}
}
function newSim(){if(S)S.items.forEach(o=>o.el.remove());S={items:[],v:{}}}
function loop(now){const dt=Math.min(0.05,Math.max(0,(now-last)/1000||0));last=now;const t=Math.max(0,(now-T0)/1000);SCENE.modes[step].frame(t,dt);raf=requestAnimationFrame(loop)}
function run_(){cancelAnimationFrame(raf);if(paused||dead||reduce)return;last=performance.now();raf=requestAnimationFrame(loop)}
function enter(i){
  step=i;cancelAnimationFrame(raf);newSim();
  SCENE.reset&&SCENE.reset();
  applyVis();
  const m=SCENE.modes[i];m.enter&&m.enter();
  if(reduce){const tt=(SCENE.still||[])[i]||1.5;if(m.sim){for(let t=0;t<tt;t+=1/60)m.frame(t,1/60)}else m.frame(tt,0);return}
  m.frame(0,0);T0=pausedAt=performance.now();run_();
}
function setToggle(v){const TG=SCENE.toggle;TG.state=v;tgl.textContent='⇄ '+T(TG.label(v));tgl.setAttribute('aria-label',TG.aria(v))}
if(SCENE.toggle){const TG=SCENE.toggle,v=qs.get(TG.param);TG.state=(TG.values||[]).indexOf(v)>-1?v:TG.def;
  tgl.addEventListener('click',()=>{setToggle(TG.next(TG.state));if(step===TG.step)enter(step)})}
function build(){L=SCENE.layout(mq.matches);svg.innerHTML='';E={};svg.setAttribute('viewBox',`0 0 ${L.W} ${L.H}`);SCENE.build();E.pk=el('g',{});
  if(SCENE.toggle)setToggle(SCENE.toggle.state);svg.setAttribute('aria-label',T(ARIA));if(opts.onLayout)opts.onLayout(L.W/L.H,L.mobile)}
function rebuild(){build();enter(step)}
mq.addEventListener('change',rebuild);
const onLang=()=>rebuild();document.addEventListener('ss-lang',onLang);
build();enter(0);
const ctrl={
  show(i){enter(Math.max(0,Math.min(SCENE.modes.length-1,i)))},
  pause(){if(paused)return;paused=true;cancelAnimationFrame(raf);pausedAt=performance.now()},
  resume(){if(!paused)return;paused=false;T0+=performance.now()-pausedAt;run_()},
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove(CLS)},
  ratio(){return L.W/L.H},
  step(){return step},
  sim(){return {step,v:S.v,n:S.items.length,t:(performance.now()-T0)/1000}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim[ID]={steps:NSTEPS,mount:mount};
})();
