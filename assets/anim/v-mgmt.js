/* 管理与监控：一个 VMS，网页、CLI 和 API 共用一套接口：6 步动画（SVG，按时间写死的时间线，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-mgmt'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-mgmt.css，全部限定在 .ssa-v-mgmt 容器之内。 */
(function(){
var EN={"VAST 管理服务 VMS：独立容器，网页、CLI 与脚本共用 REST API，收集指标、送出告警，宿主故障时换一台 CNode 接着运行": "VAST Management Service: a separate container whose REST API serves the web UI, CLI and scripts, collects metrics, sends alarms and moves to another CNode if its host fails", "网页控制台": "Web UI", "VAST CLI": "VAST CLI", "脚本 / 自动化": "Scripts", "客户端 1": "Client 1", "客户端 2": "Client 2", "客户端 3": "Client 3", "邮件": "Email", "Webhook": "Webhook", "Syslog": "Syslog", "Prometheus": "Prometheus", "CNode": "CNode", "数据服务": "Data service", "VMS": "VMS", "NVMe-oF 网络": "NVMe-oF network", "DBox": "DBox", "三个入口，同一套 REST API": "Three entry points, one REST API", "示意，不代表实测数字": "Schematic, not measured", "配置告警通知，Prometheus 定时抓取指标": "Configured alarm notifications and Prometheus scraping", "告警通知与 Prometheus 抓取": "Alarm notifications and metrics", "管理容器": "Management", "REST API": "REST API", "指标数据库": "Metrics DB", "无流量": "No traffic", "严重告警": "Critical alarm", "确认失联 · 选举": "Confirm down · elect", "新宿主": "New host", "10 秒一点": "Every 10 s", "留 24 小时": "24 hours", "5 分钟一点": "5 min", "留 1 周": "1 week", "1 小时一点": "Hourly", "留 1 个月": "1 month", "1 天一点": "Daily", "留 1 年": "1 year", "VMS 管理集群，协议服务处理读写": "VMS manages the cluster. Protocol services handle I/O.", "历史指标按时间粒度分级保留": "Historical metrics are retained at several resolutions", "历史指标分级保留": "Metrics retention tiers", "Data Flow：客户端经 VIP 访问 CNode": "Data Flow: client access to CNodes through VIPs", "客户端经 VIP 访问 CNode": "Clients reach CNodes through VIPs", "VIP A · 较低": "VIP A · Light", "VIP B · 很高": "VIP B · High", "VMS 切换宿主，存活节点继续提供数据服务": "VMS moves. Surviving nodes continue serving I/O.", "VMS 恢复 · 存活节点继续提供数据服务": "VMS moves. Surviving nodes serve I/O."};
var ENM={"管理容器": "Mgmt", "确认失联 · 选举": "Electing", "VMS 管理集群，协议服务处理读写": "VMS management and client I/O"};
var ARIA="VAST 管理服务 VMS：独立容器，网页、CLI 与脚本共用 REST API，收集指标、送出告警，宿主故障时换一台 CNode 接着运行";
function lang(){return window.SS_LANG==='en'?'en':'zh'}
var NS='http://www.w3.org/2000/svg';
function mount(host,opts){
opts=opts||{};
host.classList.add('ssa-v-mgmt');host.innerHTML='';
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
/* ---------- 场景：左侧操作方（3 或 4 个），右侧 3 台 CNode（数据服务容器 + VMS 位），下方 NVMe-oF 网络与 2 台 DBox ---------- */
const SCENE={
 still:[2.6,4.2,2.4,3.4,3.2,5.2],
 layout(mobile){
  if(!mobile){
   const cn={xs:[262,488,714],w:214,h:160,y:40};
   return {W:960,H:420,mobile:false,f:{lbl:20,sm:17,cap:18},pw:22,ph:16,dr:7,sp:300,
    act:{x:16,w:178,h:50,ys3:[62,142,222],ys4:[52,120,188,256]},BX:226,TY:22,
    cn,hd:{dx:16,dy:22},data:{dy:40,h:40},vms:{dy:96,h:48,rw:52},chx:22,
    FY:236,db:{xs:[400,790],w:270,h:56,y:272},fabLbl:{x:595,y:254},
    st:{dy:16},lad:{xs:[16,16,16,16],ys:[32,100,168,236],w:178,h:58},cap:{x:480,y:372},note:{x:480,y:399}};
  }
  const cn={xs:[8,166,324],w:148,h:150,y:96};
  return {W:480,H:452,mobile:true,f:{lbl:18,sm:18,cap:18},pw:18,ph:14,dr:6,sp:220,
   act:{y:10,h:46,xs3:[12,168,324],w3:144,xs4:[12,128,244,360],w4:108},LX:4,TY:76,
   cn,hd:{dx:10,dy:20},data:{dy:34,h:36},vms:{dy:80,h:52,rw:44},chx:18,
   FY:284,db:{xs:[122,358],w:220,h:56,y:318},fabLbl:{x:240,y:301},
   st:{dy:15},lad:{xs:[12,128,244,360],ys:[4,4,4,4],w:108,h:58},cap:{x:240,y:412},note:{x:240,y:438}};
 },
 build(){
  const f=L.f,c=L.cn;
  /* 操作方：两套（3 个、4 个） */
  E.act={};
  [3,4].forEach(n=>{
   const g=grp(n===3?'1 2 4 6':'5');const A=[];
   for(let i=0;i<n;i++){let r;
    if(!L.mobile)r={x:L.act.x,y:(n===3?L.act.ys3:L.act.ys4)[i]-L.act.h/2,w:L.act.w,h:L.act.h};
    else r={x:(n===3?L.act.xs3:L.act.xs4)[i],y:L.act.y,w:n===3?L.act.w3:L.act.w4,h:L.act.h};
    const b=box(r,g),t=tx(r.x+r.w/2,r.y+r.h/2,'',L.mobile&&n===4?f.sm:f.lbl,'lbl','middle',g);
    if(!L.mobile)line(P(r.x+r.w,r.y+r.h/2),P(L.BX,r.y+r.h/2),'',g);else line(P(r.x+r.w/2,r.y+r.h),P(r.x+r.w/2,L.TY),'',g);
    A.push({r,b,t,c:C(r)});}
   E.act[n]=A;});
  /* CNode */
  E.cn=[];E.cnSt=[];E.vms=[];E.dataB=[];E.chLn=[];E.drop=[];
  const gC=grp(null);
  c.xs.forEach((x,i)=>{
   const r={x,y:c.y,w:c.w,h:c.h},chx=x+c.w-L.chx;
   const o={r,chx,data:{x:x+12,y:c.y+L.data.dy,w:c.w-24,h:L.data.h},vms:{x:x+12,y:c.y+L.vms.dy,w:c.w-L.vms.rw,h:L.vms.h}};
   o.b=box(r,gC);
   const hx=x+L.hd.dx,hy=c.y+L.hd.dy;tx(hx,hy,'CNode',f.lbl,'lbl b7','start',gC);
   o.dataB=box(o.data,gC,'box soft',8);tx(o.data.x+o.data.w/2,o.data.y+o.data.h/2,'数据服务',f.sm,'ink2-t st','middle',gC);
   o.ch=[line(P(chx,o.data.y+o.data.h),P(chx,c.y+c.h),'thin',gC),line(P(chx,c.y+c.h),P(chx,L.FY),'',gC)];
   o.top=line(P(chx,L.TY),P(chx,c.y),'',grp('3 4',gC));
   o.st=tx(x+(L.mobile?8:12),c.y+c.h+L.st.dy,'',f.sm,'st','start',gC);
   o.x=el('g',{},gC);const a=L.vms.h*0.5,b=a*1.15,cx=x+(c.w-L.vms.rw)/2+12,cy=c.y+L.vms.dy+L.vms.h/2;
   line(P(cx-b,cy-a),P(cx+b,cy+a),'',o.x).setAttribute('class','xmark');line(P(cx-b,cy+a),P(cx+b,cy-a),'',o.x).setAttribute('class','xmark');o.x.style.opacity=0;
   E.cn.push(o);
  });
  /* VMS 容器：CNode 1 与 CNode 2 各一个位置（第 6 步换宿主） */
  [0,1].forEach(i=>{const o=E.cn[i],v=o.vms,g=el('g',{class:'vmsg'},gC);
   const b=box(v,g,'box vio',8);const t=tx(v.x+v.w/2,v.y+v.h/2,'VMS',f.lbl,'violet-t b7','middle',g);
   const s=tx(v.x+v.w/2,v.y+v.h/2+11,'',f.sm,'ink3-t st','middle',g);E.vms.push({g,b,t,s,r:v});});
  /* 总线：电脑版左侧竖线 + 顶部横线；手机版顶部横线 + 左侧细竖线 */
  const gB=grp(null);const vc=E.cn[0].vms.y+L.vms.h/2,ch3=E.cn[2].chx;E.vc=vc;
  const g1=c.xs[0]+c.w+(c.xs[1]-c.xs[0]-c.w)/2;E.gap=g1;
  if(!L.mobile){
   line(P(L.BX,L.TY),P(L.BX,Math.max(L.act.ys4[3],vc)),'',gB);
   E.admLn=line(P(L.BX,vc),P(c.xs[0],vc),'',gB);
   line(P(L.BX,L.TY),P(ch3,L.TY),'',grp('3 4',gB));line(P(L.BX,L.TY),P(g1,L.TY),'',grp('6',gB));
  }else{
   line(P(L.LX,L.TY),P(L.W-8,L.TY),'',gB);
   E.admLn=poly([P(L.LX,L.TY),P(L.LX,vc),P(c.xs[0],vc)],'',gB);
  }
  const gF=grp('6',gB);poly([P(g1,L.TY),P(g1,vc),P(c.xs[1],vc)],'',gF);
  /* NVMe-oF 网络与 DBox */
  E.fab=line(P(c.xs[0],L.FY),P(c.xs[2]+c.w,L.FY),'');
  tx(L.fabLbl.x,L.fabLbl.y,'NVMe-oF 网络',f.sm,'ink3-t','middle');
  E.db=L.db.xs.map(cx=>{const r={x:cx-L.db.w/2,y:L.db.y,w:L.db.w,h:L.db.h};line(P(cx,L.FY),P(cx,r.y),'');const b=box(r,null,'box soft',12);
   tx(cx,r.y+r.h/2,'DBox',f.lbl,'lbl b7','middle');return {r,b,cx}});
  /* 第 3 步：保留阶梯 */
  const gL=grp('3');const lad=[['10 秒一点','留 24 小时'],['5 分钟一点','留 1 周'],['1 小时一点','留 1 个月'],['1 天一点','留 1 年']];
  E.lad=lad.map((s,i)=>{const r={x:L.lad.xs[i],y:L.lad.ys[i],w:L.lad.w,h:L.lad.h};const b=box(r,gL,'cell',10);
   tx(r.x+r.w/2,r.y+r.h*0.32,s[0],f.sm,'ink-t st','middle',gL);tx(r.x+r.w/2,r.y+r.h*0.7,s[1],f.sm,'ink3-t','middle',gL);return b});
  E.cap=tx(L.cap.x,L.cap.y,'',f.cap,'st','middle');
  E.note=tx(L.note.x,L.note.y,'',f.sm-1,'ink3-t','middle');
 },
 reset(){
  svg.querySelectorAll('.box,.cell').forEach(d=>d.classList.remove('on','ok','dead','hot'));
  svg.querySelectorAll('.ln').forEach(d=>d.classList.remove('lit','dead','hot'));
  E.cn.forEach(o=>{o.x.style.opacity=0;setT(o.st,'','st')});
  E.vms.forEach((v,i)=>{v.g.style.opacity=i===0?1:0;vsub(i,'')});
  E.cap.textContent='';E.note.textContent='';
 },
 modes:[]
};
function cap(s,c,sm){E.cap.textContent=T(L.mobile&&sm?sm:s);E.cap.setAttribute('class','st '+(c||'ink2-t'))}
function note(s){E.note.textContent=T(s)}
function vsub(i,s,c){const v=E.vms[i];v.s.textContent=T(s);v.s.setAttribute('class','st '+(c||'ink3-t'));const cy=v.r.y+v.r.h/2;
 v.t.setAttribute('y',s?cy-10:cy);v.s.setAttribute('y',cy+12)}
function labels(n,arr){E.act[n].forEach((a,i)=>setT(a.t,arr[i]))}
/* 路线 */
function actOut(n,i){const a=E.act[n][i];return L.mobile?[P(a.c.x,a.r.y+a.r.h),P(a.c.x,L.TY)]:[P(a.r.x+a.r.w,a.c.y),P(L.BX,a.c.y)]}
function toVms(n,i,slot){const v=E.cn[slot].vms;
 if(slot===0)return cat(actOut(n,i),L.mobile?[P(L.LX,L.TY),P(L.LX,E.vc)]:[P(L.BX,E.vc)],[P(v.x,E.vc)]);
 return cat(actOut(n,i),L.mobile?[]:[P(L.BX,L.TY)],[P(E.gap,L.TY),P(E.gap,E.vc),P(v.x,E.vc)]);}
function toData(n,i,k){const o=E.cn[k];return cat(actOut(n,i),L.mobile?[]:[P(L.BX,L.TY)],[P(o.chx,L.TY),P(o.chx,o.data.y)])}
function dataDown(k,d){const o=E.cn[k],b=E.db[d];return [P(o.chx,o.data.y+o.data.h),P(o.chx,L.FY),P(b.cx,L.FY),P(b.cx,b.r.y)]}
function metric(k){
 const o=E.cn[k],x=L.mobile?L.LX:L.BX;
 return [P(o.chx,o.r.y),P(o.chx,L.TY),P(x,L.TY),P(x,E.vc),P(E.cn[0].vms.x,E.vc)];
}
const ADMIN=['网页控制台','VAST CLI','脚本 / 自动化'];
/* 数据块在 CNode 与 DBox 之间往返（读写不停） */
function dataLoop(t,list,per){list.forEach(([k,d,o],j)=>{const r=j%2?rev(dataDown(k,d)):dataDown(k,d);run(o,r,(t+j*per/list.length)%per,0,Math.min(dur(r),per-0.4),0.3)})}
/* 第 1 步：VMS 是独立容器，VMS 管理集群，协议服务处理读写 */
SCENE.modes[0]={enter(){labels(3,ADMIN);vsub(0,'管理容器');cap('VMS 管理集群，协议服务处理读写','slate-t');
  S.v.d=[[0,0],[1,1],[2,0],[1,0]].map(([k,d])=>[k,d,pk()]);S.v.m=dot('v')},
 frame(t){dataLoop(t,S.v.d,2.6);const per=3.2,k=Math.floor(t/per)%3,u=t%per,r=toVms(3,k,0);
  const p=run(S.v.m,r,u,0.3,dur(r),0.25);E.vms[0].b.classList.toggle('on',p>1&&u<0.3+dur(r)+0.9);
  E.act[3].forEach((a,i)=>a.b.classList.toggle('on',i===k&&u<1.2))}};
/* 第 2 步：三个入口，同一套 REST API */
SCENE.modes[1]={enter(){labels(3,ADMIN);vsub(0,'REST API','slate-t');cap('三个入口，同一套 REST API','slate-t');S.v.m=[dot('v'),dot('v'),dot('v')]},
 frame(t){const per=4.8,u=t%per;let lit=false;
  S.v.m.forEach((o,i)=>{const r=toVms(3,i,0),t0=0.2+i*1.1,d=dur(r);const p=run(o,r,u,t0,d,0.25);if(p>1&&u<t0+d+0.6)lit=true;
   E.act[3][i].b.classList.toggle('on',u>=t0&&u<t0+0.6)});
  E.vms[0].b.classList.toggle('on',lit);E.admLn.classList.toggle('lit',u<4)}};
/* 第 3 步：每 10 秒收一次指标，逐级合并 */
SCENE.modes[2]={enter(){labels(3,ADMIN);vsub(0,'指标数据库');cap('历史指标按时间粒度分级保留','slate-t','历史指标分级保留');
  S.v.c=[0,1,2].map(()=>dot('v'))},
 frame(t){const per=3.0,u=t%per;let lit=false;
  S.v.c.forEach((o,k)=>{const r=metric(k);if(run(o,r,u,0.15,Math.min(dur(r),1.8),0.2)>1&&u<2.4)lit=true});
  E.vms[0].b.classList.toggle('on',lit);
  const k=Math.floor(t/1.4)%5;E.lad.forEach((b,i)=>b.classList.toggle('on',i===k))}};
/* 第 4 步：看清客户端经 VIP 访问 CNode */
SCENE.modes[3]={enter(){labels(3,['客户端 1','客户端 2','客户端 3']);
  cap('Data Flow：客户端经 VIP 访问 CNode','slate-t','客户端经 VIP 访问 CNode');note('示意，不代表实测数字');
  E.vms[0].g.style.opacity=1;S.v.f=[[0,1],[1,1],[2,0]].map(([i,k])=>[i,k,pk(),pk()])},
 frame(t){S.v.f.forEach(([i,k,a,b],j)=>{const r=toData(3,i,k),d=dur(r),per=d+0.5;
   [a,b].forEach((o,m)=>run(o,r,(t+j*0.37+m*per/2)%per,0,d,0.2))});
  const on=t>1.6;
  [['VIP A · 较低','ink3-t'],['VIP B · 很高','rose-t'],['无流量','ink3-t']].forEach(([s,c],k)=>setT(E.cn[k].st,on?s:'','st '+c));
  E.cn[1].b.classList.toggle('hot',on);E.cn[1].dataB.classList.toggle('hot',on);E.cn[0].dataB.classList.toggle('on',on);
  [0,1].forEach(k=>E.cn[k].top.classList.toggle('lit',on))}};
/* 第 5 步：告警送出去，Prometheus 抓指标 */
SCENE.modes[4]={enter(){labels(4,['邮件','Webhook','Syslog','Prometheus']);vsub(0,'REST API');
  cap('配置告警通知，Prometheus 定时抓取指标','slate-t','告警通知与 Prometheus 抓取');
  S.v.n=[0,1,2].map(()=>dot('rose'));S.v.q=dot('v');S.v.a=dot('ok')},
 frame(t){const per=7.6,u=t%per,o3=E.cn[2];
  const dead=u>0.3;o3.x.style.opacity=fade(u,0.3,0.6);o3.b.classList.toggle('dead',dead);o3.dataB.classList.toggle('dead',dead);
  const al=u>2.3;E.vms[0].b.classList.toggle('hot',al&&u<per-0.4);setT(E.cn[0].st,al?'严重告警':'','st rose-t');
  S.v.n.forEach((o,i)=>{const rr=rev(toVms(4,i,0)),dd=dur(rr);const q=run(o,rr,u,2.8,dd,0.2);E.act[4][i].b.classList.toggle('hot',q>1&&u<per-0.4)});
  const rq=toVms(4,3,0),dq=dur(rq);run(S.v.q,rq,u,4.6,dq,0.1);const pa=run(S.v.a,rev(rq),u,4.6+dq+0.3,dq,0.25);
  E.act[4][3].b.classList.toggle('ok',pa>1&&u<per-0.3)}};
/* 第 6 步：VMS 宿主坏了，换一台接着跑 */
SCENE.modes[5]={enter(){labels(3,ADMIN);cap('VMS 切换宿主，存活节点继续提供数据服务','sage-t','VMS 恢复 · 存活节点继续提供数据服务');
  S.v.d=[[1,1],[2,0],[1,0],[2,1]].map(([k,d])=>[k,d,pk()]);S.v.m=dot('v')},
 frame(t){const per=10,u=t%per,o1=E.cn[0];
  dataLoop(t,S.v.d,2.6);
  o1.x.style.opacity=fade(u,0.4,0.7);const dead=u>0.4;o1.b.classList.toggle('dead',dead);o1.dataB.classList.toggle('dead',dead);o1.ch.forEach(l=>l.classList.toggle('dead',dead));E.admLn.classList.toggle('dead',dead);
  E.vms[0].g.style.opacity=1-fade(u,0.5,1.1);
  setT(E.cn[1].st,u>1.1&&u<2.6?'确认失联 · 选举':'',u<2.6?'st ink2-t':'st');
  E.vms[1].g.style.opacity=fade(u,2.6,3.1);vsub(1,u>2.6?'新宿主':'','sage-t');
  const k=Math.floor(Math.max(0,u-3.2)/2.2)%3,uu=Math.max(0,u-3.2)%2.2,r=toVms(3,k,1);
  const p=u>3.2?run(S.v.m,r,uu,0,Math.min(dur(r),1.5),0.25):(put(S.v.m,-99,-99,0),-1);
  E.vms[1].b.classList.toggle('on',p>1);E.act[3].forEach((a,i)=>a.b.classList.toggle('on',u>3.2&&i===k&&uu<0.8))}};

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
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('ssa-v-mgmt')},
  ratio(){return L.W/L.H},
  step(){return step},
  sim(){return {step,v:S.v,n:S.items.length,t:(performance.now()-T0)/1000}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['v-mgmt']={steps:6,mount:mount};
})();
