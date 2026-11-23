/* NFS：标准挂载，文件锁记在共享元数据里：6 步动画（SVG，按时间写死的时间线，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-nfs'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下更紧的排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-nfs.css，全部限定在 .ssa-v-nfs 容器之内。 */
(function(){
var ID='v-nfs',NSTEPS=6;
var EN={"NFSv3 · NFSv4.1 · NFSv4.2":"NFSv3 · NFSv4.1 · NFSv4.2","客户端 A":"Client A","客户端 B":"Client B","客户端 C":"Client C","DNS":"DNS","共享存储":"Shared storage","view /data":"view /data","a.dat":"a.dat","元数据（SCM）":"Metadata (SCM)","view 策略":"View policy","客户端 A、B：读写":"Clients A, B: read-write","客户端 C：只读":"Client C: read-only","NVMe-oF":"NVMe-oF",
"地址 1":"IP 1","地址 2":"IP 2","地址 3":"IP 3","地址 4":"IP 4","地址 5":"IP 5","地址 6":"IP 6",
"/mnt/data 对应集群上的 view /data":"/mnt/data maps to view /data on the cluster","NFSv3 · NFSv4.1 · NFSv4.2 · 系统自带客户端":"NFSv3 · NFSv4.1 · NFSv4.2 · built-in client","已挂载 /mnt/data":"Mounted /mnt/data","已挂载":"Mounted",
"集群 DNS：轮询分配 VIP":"Cluster DNS: VIPs in round-robin order","每个标准挂载使用一个 VIP":"One VIP per standard mount",
"NLM 锁写入共享的 SCM 元数据":"NLM locks are stored in shared SCM metadata","NFSv3：NLM 锁 · NFSv4.1：协议自带加锁":"NFSv3: NLM locks · NFSv4.1: locking built in","锁：客户端 A":"Lock: Client A","锁：客户端 B":"Lock: Client B","已加锁":"Locked",
"CNode 2 发现冲突，客户端 B 等待":"CNode 2 finds a conflict; B waits","等待":"Waiting","已释放":"Released","NLM 锁是建议性锁":"NLM locks are advisory",
"地址 1、4 迁到 CNode 2、3，锁记录不动":"IPs 1 and 4 move to CNodes 2 and 3; the lock stays","原地址重试":"Retry at same VIP","交换机需接受无偿 ARP":"Switches must accept gratuitous ARP",
"客户端 C 只读：CNode 3 拦下它的写入":"Client C is read-only: CNode 3 blocks its write","写入成功":"Written","拒绝写入":"Write denied","读取成功":"Read OK","再检查文件和目录的权限":"Then check file and directory permissions","再检查文件权限":"Then check file permissions",
"VAST 上的 NFS：客户端经虚拟 IP 挂载到 CNode，文件锁写在共享元数据里":"NFS on VAST: clients mount through virtual IPs on CNodes, and file locks are kept in shared metadata"};
var ENM={"NLM 锁写入共享的 SCM 元数据":"NLM locks are stored in shared SCM metadata","地址 1、4 迁到 CNode 2、3，锁记录不动":"IPs 1, 4 move to CNodes 2, 3; lock stays","客户端 C 只读：CNode 3 拦下它的写入":"Client C read-only: CNode 3 blocks it","CNode 2 发现冲突，客户端 B 等待":"CNode 2 finds a conflict; B waits","交换机需接受无偿 ARP":"Switches must accept gratuitous ARP","每个标准挂载使用一个 VIP":"One VIP per standard mount","NFSv3：NLM 锁 · NFSv4.1：协议自带加锁":"NFSv3: NLM · NFSv4.1: built-in locks","集群 DNS：轮询分配 VIP":"Cluster DNS: VIPs in round-robin order"};
var ARIA="VAST 上的 NFS：客户端经虚拟 IP 挂载到 CNode，文件锁写在共享元数据里";
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
  cap:{x:240,y:460},note:{x:240,y:494}};
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
 E.xm=E.cn.map(c=>{const gx=el('g',{},g);const a=20,b=20,cy=cn.y+72;
  [[-1,-1,1,1],[-1,1,1,-1]].forEach(([p,q,r,s])=>el('line',{x1:c.x+p*b,y1:cy+q*a,x2:c.x+r*b,y2:cy+s*a,class:'xmark'},gx));gx.style.opacity=0;return gx});
 /* NVMe-oF 与存储带 */
 E.fab=line(P(L.fabX[0],L.fabY),P(L.fabX[1],L.fabY),'',g);
 const B=L.band;box(B,g,'box soft',16);tx(B.x+(M?126:16),B.y+20,o.band,f.sm,'ttl','start',g);
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
 still:[4.2,9.6,4.2,6.1,5.6,8.4],
 layout(m){return protoLayout(m)},
 build(){
  const f=L.f;
  protoBuild({clients:['客户端 A','客户端 B','客户端 C'],side:'2',band:'共享存储',dimCl:['','1 3 5 6','1 3 4 5']});
  E.sideT.textContent=T('DNS');
  const g=E.base,bl=L.bl,br=L.br;
  /* 左：view 与文件 */
  box(bl,g,'box',12);tx(bl.x+14,bl.y+bl.h-18,'view /data',f.sm,'ttl','start',g);
  const fx=bl.x+bl.w/2,fy=bl.y+48;E.fileTop=fy-20;E.fileX=fx;
  line(P(fx,L.fabY),P(fx,E.fileTop),'',g);
  E.file=chip(fx,fy,L.fileW,40,'a.dat',f.chip,'file',g);
  /* 右：元数据（第 1–5 步）与 view 策略（第 6 步） */
  box(br,g,'box',12);
  const gm=grp('1 2 3 4 5',g);tx(br.x+14,br.y+br.h-18,'元数据（SCM）',f.sm,'ttl','start',gm);
  const sy=br.y+48,sx=br.x+L.slotX+L.slotW/2;E.slotX=sx;E.slotTop=sy-19;
  line(P(sx,L.fabY),P(sx,E.slotTop),'',gm);
  tx(br.x+14,sy,'a.dat',f.sm,'ink2-t','start',gm);
  el('rect',{x:sx-L.slotW/2,y:sy-19,width:L.slotW,height:38,rx:6,class:'slot'},gm);
  E.lock=chip(sx,sy,L.slotW,38,'',f.chip,'lock',gm);E.lock.g.style.opacity=0;
  const gp=grp('6',g);tx(br.x+14,br.y+br.h-18,'view 策略',f.sm,'ttl','start',gp);
  E.rowAB=tx(br.x+14,br.y+30,'客户端 A、B：读写',f.sm,'st ink2-t','start',gp);
  E.rowC=tx(br.x+14,br.y+62,'客户端 C：只读',f.sm,'st ink2-t','start',gp);
 },
 reset(){protoReset();E.lock.g.style.opacity=0;E.lock.g.setAttribute('class','chip lock');E.file.g.setAttribute('class','chip file');
  [E.rowAB,E.rowC].forEach(r=>r.setAttribute('class','st ink2-t'))},
 modes:[]
};
function lockSet(s,c){E.lock.set(s);E.lock.g.style.opacity=s?1:0;E.lock.g.setAttribute('class','chip lock '+(c||''))}
function lit(list){E.cn.forEach(c=>c.b.classList.remove('on'));list.forEach(([segs,r])=>{if(r<0)return;const s=segs[Math.floor(r)];if(s&&s.k!=null)E.cn[s.k].b.classList.add('on')})}
const M=()=>L.mobile;
/* 第 1 步：挂载 */
SCENE.modes[0]={enter(){cap('/mnt/data 对应集群上的 view /data','slate-t');note('NFSv3 · NFSv4.1 · NFSv4.2');
  S.v.a=viaCn(0,0,E.fileX,E.fileTop);S.v.b=backCn(0,0,E.fileX,E.fileTop);S.v.p=pk();S.v.q=pk('ok');S.v.la=seqLen(S.v.a);S.v.lb=seqLen(S.v.b)},
 frame(t){const per=S.v.la+S.v.lb+3.2,u=t%per,t1=0.3+S.v.la+0.25;
  const r1=seq(S.v.p,S.v.a,u,0.3),r2=seq(S.v.q,S.v.b,u,t1);lit([[S.v.a,r1],[S.v.b,r2]]);
  E.chips[0].g.classList.toggle('on',r1>=0&&r1<3||r2>=0&&r2<3);E.file.g.classList.toggle('on',r1>=2.8&&r2<0.5);
  const done=r2>=3;csub(0,done?(M()?'已挂载':'已挂载 /mnt/data'):'',done?'sage-t':'');E.cl[0].b.classList.toggle('ok',done)}};
/* 第 2 步：DNS 轮询 */
SCENE.modes[1]={enter(){cap('集群 DNS：轮询分配 VIP','slate-t');note('每个标准挂载使用一个 VIP');
  S.v.c=[0,1,2].map(i=>({q:dot('v'),a:dot('ok'),m:pk(),r1:[{p:E.R.toSide(i)}],r2:[{p:rev(E.R.toSide(i))}],r3:[{p:E.R.toCn(i,i)}]}))},
 frame(t){const per=10.4,u=t%per;let any=false;
  S.v.c.forEach((c,i)=>{const t0=0.3+i*2.9,d1=seqLen(c.r1),d2=seqLen(c.r2);
   const a=seq(c.q,c.r1,u,t0),b=seq(c.a,c.r2,u,t0+d1+0.15),m=seq(c.m,c.r3,u,t0+d1+d2+0.35);
   if(a>=0&&a<1||b>=0&&b<1)any=true;
   csub(i,b>=1?'地址 '+(i+1):'',b>=1?'slate-t':'');E.chips[i].g.classList.toggle('on',m>=1)});
  E.sideB.classList.toggle('on',any)}};
/* 第 3 步：加锁 */
SCENE.modes[2]={enter(){cap('NLM 锁写入共享的 SCM 元数据','violet-t');note('NFSv3：NLM 锁 · NFSv4.1：协议自带加锁');
  S.v.a=viaCn(0,0,E.slotX,E.slotTop);S.v.b=backCn(0,0,E.slotX,E.slotTop);S.v.p=pk('v');S.v.q=pk('ok');S.v.la=seqLen(S.v.a);S.v.lb=seqLen(S.v.b)},
 frame(t){const per=S.v.la+S.v.lb+3.4,u=t%per,t1=0.3+S.v.la+0.3;
  const r1=seq(S.v.p,S.v.a,u,0.3),r2=seq(S.v.q,S.v.b,u,t1);lit([[S.v.a,r1],[S.v.b,r2]]);E.chips[0].g.classList.toggle('on',r1>=0||r2>=0&&r2<3);
  lockSet(r1>=3?'锁：客户端 A':'', 'vio');const done=r2>=3;csub(0,done?'已加锁':'',done?'violet-t':'')}};
/* 第 4 步：另一台 CNode 读到同一把锁 */
SCENE.modes[3]={enter(){cap('CNode 2 发现冲突，客户端 B 等待','violet-t');note('NLM 锁是建议性锁');
  const v=S.v;v.b1=viaCn(1,1,E.slotX,E.slotTop);v.b1r=backCn(1,1,E.slotX,E.slotTop);v.a1=viaCn(0,0,E.slotX,E.slotTop);
  v.p=pk('v');v.pr=pk('bad');v.ar=pk('v');v.p2=pk('v');v.p2r=pk('ok');
  v.t0=0.4;v.t1=v.t0+seqLen(v.b1)+0.35;v.t2=v.t1+seqLen(v.b1r)+0.6;v.t3=v.t2+seqLen(v.a1)+0.5;v.t4=v.t3+seqLen(v.b1)+0.3;v.per=v.t4+seqLen(v.b1r)+2.4},
 frame(t){const v=S.v,u=t%v.per;
  const r1=seq(v.p,v.b1,u,v.t0),r1b=seq(v.pr,v.b1r,u,v.t1),ra=seq(v.ar,v.a1,u,v.t2),r2=seq(v.p2,v.b1,u,v.t3),r2b=seq(v.p2r,v.b1r,u,v.t4);
  lit([[v.b1,r1],[v.b1r,r1b],[v.a1,ra],[v.b1,r2],[v.b1r,r2b]]);
  E.chips[0].g.classList.toggle('on',ra>=0&&ra<1.5);E.chips[1].g.classList.toggle('on',r1>=0&&r1<1.5||r1b>=1.5&&r1b<3||r2>=0&&r2<1.5||r2b>=1.5&&r2b<3);
  if(u<v.t2+seqLen(v.a1))lockSet('锁：客户端 A','vio'+(r1>=3&&r1b<1?' hot':''));else if(r2<3)lockSet('','');else lockSet('锁：客户端 B','vio');
  csub(0,ra>=3?'已释放':'已加锁',ra>=3?'ink3-t':'violet-t');
  csub(1,r2b>=3?'已加锁':r1b>=3?'等待':'',r2b>=3?'violet-t':'rose-t')}};
/* 第 5 步：坏一台 CNode */
SCENE.modes[4]={enter(){cap('地址 1、4 迁到 CNode 2、3，锁记录不动','sage-t');note('交换机需接受无偿 ARP');lockSet('锁：客户端 A','vio');csub(0,'已加锁','violet-t');
  S.v.a=viaCn(0,1,E.slotX,E.slotTop);S.v.b=backCn(0,1,E.slotX,E.slotTop);S.v.p=pk();S.v.q=pk('ok');S.v.la=seqLen(S.v.a);S.v.lb=seqLen(S.v.b)},
 frame(t){failCn(0,clamp(t/1.8,0,1));E.cn[0].b.classList.remove('on');
  lockSet('锁：客户端 A','vio'+(t>1.6&&t<3.2?' keep':''));
  if(t<2.4)return;const per=S.v.la+S.v.lb+2.6,u=(t-2.4)%per;
  const r1=seq(S.v.p,S.v.a,u,0),r2=seq(S.v.q,S.v.b,u,S.v.la+0.25);lit([[S.v.a,r1],[S.v.b,r2]]);E.cn[0].b.classList.remove('on');
  E.chips[0].g.classList.toggle('on',r1>=0&&r1<1.5||r2>=1.5&&r2<3);csub(0,r2>=3||t>2.4+per?'原地址重试':'已加锁',r2>=3||t>2.4+per?'sage-t':'violet-t')}};
/* 第 6 步：view 策略 */
SCENE.modes[5]={enter(){cap('客户端 C 只读：CNode 3 拦下它的写入','slate-t');note(M()?'再检查文件权限':'再检查文件和目录的权限');
  const v=S.v;v.aw=viaCn(0,0,E.fileX,E.fileTop);v.cw=[{p:E.R.toCn(2,2)},{w:0.6,k:2,at:P(E.cn[2].x,L.cn.y)}];
  v.read=viaCn(2,2,E.fileX,E.fileTop);v.crs=backCn(2,2,E.fileX,E.fileTop);
  v.p1=pk();v.p2=pk();v.p3=pk('ok');v.get=dot();v.t1=0.3+seqLen(v.aw)+0.8;v.t2=v.t1+seqLen(v.cw)+0.6;v.per=v.t2+seqLen(v.read)+seqLen(v.crs)+2.2},
 frame(t){const v=S.v,u=t%v.per;
  const r1=seq(v.p1,v.aw,u,0.3),r2=seq(v.p2,v.cw,u,v.t1),get=seq(v.get,v.read,u,v.t2),r3=seq(v.p3,v.crs,u,v.t2+seqLen(v.read));lit([[v.aw,r1],[v.read,get],[v.crs,r3]]);
  const rej=r2>=1&&r2<2;E.cn[2].b.classList.toggle('hot',rej);v.p2.el.classList.toggle('bad',r2>=1);
  E.file.g.classList.toggle('w',r1>=3&&u<v.t2);E.chips[0].g.classList.toggle('on',r1>=0&&r1<1.5);E.chips[2].g.classList.toggle('on',r2>=0&&r2<2||get>=0&&get<1.5||r3>=1.5&&r3<3);
  csub(0,r1>=3?'写入成功':'',r1>=3?'sage-t':'');
  csub(2,r3>=3?'读取成功':r2>=1?'拒绝写入':'',r3>=3?'sage-t':'rose-t');
  E.rowAB.setAttribute('class','st '+(r1>=0&&r1<3.5?'slate-t b7':'ink2-t'));E.rowC.setAttribute('class','st '+(r2>=0&&u<v.t2+seqLen(v.crs)+0.3?'slate-t b7':'ink2-t'))}};
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
