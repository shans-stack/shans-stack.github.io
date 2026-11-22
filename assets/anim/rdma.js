/* RDMA 为什么快：六步动画（SVG 加小仿真，不依赖动画库）。
   接口（别的知识点照这个结构加动画）：
     var a = SSAnim.rdma.mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i)      切到第 i 步（0 起）并从头播放这一步
     a.pause() / a.resume()   停住 / 继续（看不见时停住省电）
     a.destroy()    移除
     a.ratio()      当前画布宽高比
   步骤状态归页面管：动画自己不带翻页控件，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   文字有中英两套，跟着页面的 ss-lang 事件重画。样式在 assets/anim/rdma.css。 */
(function(){
var EN={"服务器 ": "Server ", "应用内存": "App RAM", "内核缓冲区": "Kernel buffer", "网卡": "NIC", "直接读": "reads", "直接写": "writes", "CPU": "CPU", "不经过": "bypassed", "排队": "queued", "网络": "Network", "已送达": "Delivered", "忙着搬数据": "busy moving data", "空出来做计算": "free for compute", "内核": "Kernel", "CPU 复制": "CPU copy", "内核 · ": "Kernel · ", "不经过内核": "skips the kernel", "示意，不代表实测数字": "Schematic, not measured", "InfiniBand": "InfiniBand", "以太网 RoCE": "Ethernet RoCE", "IB 交换机": "IB switch", "以太网交换机": "Ethernet switch", "专用网络": "Dedicated network", "普通以太网": "Standard Ethernet", "⇄ 换成": "⇄ Switch to ", " InfiniBand": "InfiniBand", "切换网络，当前 ": "Switch network, now ", "复制数据": "copying", "占用很高": "very busy", "占用升高": "getting busy", "占用较低": "light load", "只发起一次": "starts it once", "不参与": "not involved", "": "", "两台服务器之间传数据：TCP 与 RDMA 的路径和 CPU 负担": "Moving data between two servers: the TCP and RDMA paths and the CPU cost", "?": "?", "A": "A", "B": "B", "0": "0", "TCP": "TCP", "RDMA": "RDMA"};
function lang(){return window.SS_LANG==='en'?'en':'zh'}
function T(s){return lang()==='en'&&EN[s]!==undefined?EN[s]:s}
function mount(host,opts){
opts=opts||{};
const NS='http://www.w3.org/2000/svg';
host.classList.add('ra');host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','ra-scene');svg.setAttribute('role','img');host.appendChild(svg);
const btn=document.createElement('button');btn.className='netbtn';btn.type='button';btn.hidden=true;host.appendChild(btn);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mq=matchMedia('(max-width: 640px)');
const qs=new URLSearchParams(location.search);
let L,E,S,step=0,net=qs.get('net')==='roce'?'roce':'ib';

/* ---------- 版式：桌面左右并排，手机上下排布 ---------- */
function layout(mobile){
  if(!mobile){
    const W=960,H=476,y0=24;
    const A={frame:{x:16,y:y0,w:384,h:410},title:{x:34,y:y0+34,a:'start'},
      blk:{app:{x:166,y:y0+62,w:184,h:60},ker:{x:166,y:y0+190,w:184,h:60},nic:{x:166,y:y0+318,w:184,h:60}},
      cpu:{x:30,y:y0+174,w:110,h:92},tcpX:368,rdX:386,lblA:'start',subA:'end',stA:'start',qA:'end'};
    const mx=x=>W-x, mr=r=>({x:W-r.x-r.w,y:r.y,w:r.w,h:r.h});
    const B={frame:mr(A.frame),title:{x:W-34,y:A.title.y,a:'end'},
      blk:{app:mr(A.blk.app),ker:mr(A.blk.ker),nic:mr(A.blk.nic)},cpu:mr(A.cpu),tcpX:mx(368),rdX:mx(386),lblA:'end',subA:'start',stA:'end',qA:'start'};
    return {mobile:false,W,H,A,B,f:{ttl:22,lbl:22,cpu:22,st:18,sm:17,note:16,big:34,lane:26},
      pw:26,ph:20,gap:30,cap:4,trackH:16,
      net:{x:480,y:A.blk.nic.y+30-28,a:'middle'},q:{x:480,y:300,r:20},
      sw:{x:480,y:A.blk.nic.y+30,w:124,h:52,tx:480,ty:A.blk.nic.y+30-50,ta:'middle',nx:480,ny:A.blk.nic.y+30+44,na:'middle',bx:480,by:453},
      race:raceDesk(W)};
  }
  const W=480,H=692;
  const A={frame:{x:12,y:12,w:456,h:288},title:{x:28,y:42,a:'start'},
    blk:{app:{x:150,y:64,w:220,h:52},ker:{x:150,y:144,w:220,h:52},nic:{x:150,y:224,w:220,h:52}},
    cpu:{x:26,y:130,w:104,h:80},tcpX:404,rdX:430,lblA:'start',subA:'end',stA:'start',qA:'end'};
  const my=r=>({x:r.x,y:692-r.y-r.h,w:r.w,h:r.h});
  const B={frame:{x:12,y:392,w:456,h:288},title:{x:28,y:422,a:'start'},
    blk:{app:my(A.blk.app),ker:my(A.blk.ker),nic:my(A.blk.nic)},cpu:my(A.cpu),tcpX:404,rdX:430,lblA:'start',subA:'end',stA:'start',qA:'end'};
  return {mobile:true,W,H,A,B,f:{ttl:20,lbl:20,cpu:20,st:17,sm:17,note:16,big:28,lane:22},
    pw:24,ph:18,gap:26,cap:3,trackH:14,
    net:{x:392,y:346,a:'end'},q:{x:300,y:346,r:18},
    sw:{x:404,y:346,w:112,h:44,tx:334,ty:334,ta:'end',nx:334,ny:358,na:'end',bx:112,by:346},
    race:raceMob(W)};
}
function raceDesk(W){
  const lane=(y)=>({y,src:{x:130,w:60,h:48},dst:{x:736,w:60,h:48},cnt:{x:850,ly:y-14,ny:y+22},
    cpu:{lx:130,y:y+56,tx:200,tw:270,sx:486}});
  return {T:lane(130),R:lane(330),lab:{x:32},
    st:[{x:330},{x:560}],stW:64,stH:44,stLbl:{dy:-38,two:false},
    bypass:{x:460,y:330-22},note:{x:32,y:452},sep:240,capT:4};
}
function raceMob(W){
  const lane=(y)=>({y,src:{x:16,w:44,h:40},dst:{x:404,w:48,h:40},cnt:{x:428,ly:y+44,ny:y+76},
    cpu:{lx:16,y:y+60,tx:60,tw:250,sx:60,sy:y+92}});
  return {T:lane(170),R:lane(470),lab:{x:16},labDy:-90,
    st:[{x:170},{x:300}],stW:56,stH:40,stLbl:{dy:-38,two:true},
    bypass:{x:235,y:470-24},note:{x:16,y:652},sep:330,capT:3};
}

/* ---------- 画布构建 ---------- */
function el(tag,a,p){const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);(p||svg).appendChild(e);return e}
function tx(x,y,s,size,cls,anchor,p){const t=el('text',{x,y,'font-size':size,class:cls||''},p);if(anchor)t.setAttribute('text-anchor',anchor);t.textContent=T(s);return t}
function grp(show,p,extra){const g=el('g',Object.assign({class:'vis'},extra||{}),p);if(show)g.dataset.show=show;return g}
const C=r=>({x:r.x+r.w/2,y:r.y+r.h/2});

function build(){
  svg.innerHTML='';E={};
  svg.setAttribute('viewBox',`0 0 ${L.W} ${L.H}`);
  const f=L.f;
  /* 场景 1-4、6：两台服务器 */
  const hosts=grp('1 2 3 4 6');
  const lanesTcp=grp('1 2 3',hosts), lanesRd=grp('4 6',hosts);
  const P={};
  ['A','B'].forEach(sd=>{
    const s=L[sd],g=grp(null,hosts);
    el('rect',{x:s.frame.x,y:s.frame.y,width:s.frame.w,height:s.frame.h,rx:22,class:'frame'},g);
    tx(s.title.x,s.title.y,T('服务器 ')+sd,f.ttl,'ttl',s.title.a,g);
    const app=C(s.blk.app),ker=C(s.blk.ker),nic=C(s.blk.nic);
    const edge=s.lblA==='start'||L.mobile?s.blk.app.x+s.blk.app.w:s.blk.app.x; // 朝向网络的一侧
    P[sd]={app,ker,nic,edge,s};
    // 方块
    const lab=(r,t,g2)=>tx(s.lblA==='start'?r.x+16:r.x+r.w-16,C(r).y,t,f.lbl,'lbl',s.lblA,g2);
    const gApp=grp(null,g);el('rect',{x:s.blk.app.x,y:s.blk.app.y,width:s.blk.app.w,height:s.blk.app.h,rx:12,class:'blk'},gApp);lab(s.blk.app,'应用内存',gApp);
    const gKer=grp(null,g,{});gKer.dataset.dim='4 6';
    el('rect',{x:s.blk.ker.x,y:s.blk.ker.y,width:s.blk.ker.w,height:s.blk.ker.h,rx:12,class:'blk'},gKer);lab(s.blk.ker,'内核缓冲区',gKer);
    const gNic=grp(null,g);el('rect',{x:s.blk.nic.x,y:s.blk.nic.y,width:s.blk.nic.w,height:s.blk.nic.h,rx:12,class:'blk'},gNic);lab(s.blk.nic,'网卡',gNic);
    const subX=s.subA==='end'?s.blk.nic.x+s.blk.nic.w-14:s.blk.nic.x+14;
    E['sub'+sd]=tx(subX,nic.y,sd==='A'?'直接读':'直接写',f.sm,'sage-t st',s.subA,grp('4 6',gNic));
    // CPU，连在内核缓冲区旁边
    const cg=grp(null,g);cg.dataset.dim='6';
    const cpuR=s.cpu, cpuIn=s.cpu.x+s.cpu.w; const kerSide=L.mobile||sd==='A'?s.blk.ker.x:s.blk.ker.x+s.blk.ker.w;
    const conX1=L.mobile||sd==='A'?cpuIn:cpuR.x;
    E['con'+sd]=el('line',{x1:conX1,y1:ker.y,x2:kerSide,y2:ker.y,class:'ln con'},cg);
    E['con'+sd].dataset.dim='4';
    E['cpu'+sd]=el('rect',{x:cpuR.x,y:cpuR.y,width:cpuR.w,height:cpuR.h,rx:12,class:'cpubox'},cg);
    tx(cpuR.x+14,cpuR.y+28,'CPU',f.cpu,'cpul','start',cg);
    const tw=cpuR.w-28;
    el('rect',{x:cpuR.x+14,y:cpuR.y+cpuR.h-14-L.trackH,width:tw,height:L.trackH,rx:4,class:'track'},cg);
    E['fill'+sd]=el('rect',{x:cpuR.x+14,y:cpuR.y+cpuR.h-14-L.trackH,width:0,height:L.trackH,rx:4,class:'fill'},cg);
    E['tw'+sd]=tw;
    const stY=cpuR.y+cpuR.h+26, stX=s.stA==='start'?cpuR.x:cpuR.x+cpuR.w;
    E['st'+sd]=tx(stX,stY,'',f.st,'st',s.stA,cg);
    // 「不经过」与「排队」
    const midKN=(Math.min(s.blk.ker.y,s.blk.nic.y)===s.blk.ker.y)?(s.blk.ker.y+s.blk.ker.h+s.blk.nic.y)/2:(s.blk.nic.y+s.blk.nic.h+s.blk.ker.y)/2;
    tx(ker.x,midKN,'不经过',f.sm,'ink3-t',  'middle',grp('4',g));
    // 排队标签放在「数据从哪来」那一侧的缝里
    const from=sd==='A'?s.blk.app:s.blk.nic;
    const qy=from.y<s.blk.ker.y?(from.y+from.h+s.blk.ker.y)/2:(s.blk.ker.y+s.blk.ker.h+from.y)/2;
    const qx=s.qA==='end'?s.tcpX-18:s.tcpX+18;
    E['qlab'+sd]=tx(qx,qy,'排队',f.sm,'rose-t st',s.qA,grp('3',g));
    E['qlab'+sd].style.opacity=0;
    // TCP 车道（含进出内核的接口）
    const stub=(y,cls,par)=>el('line',{x1:edge,y1:y,x2:s.tcpX,y2:y,class:'ln '+cls},par);
    stub(app.y,'tcp tcpl',lanesTcp);stub(nic.y,'tcp tcpl',lanesTcp);
    E['kst'+sd]=stub(ker.y,'con',lanesTcp);
    el('line',{x1:s.tcpX,y1:app.y,x2:s.tcpX,y2:nic.y,class:'ln tcp tcpl'},lanesTcp);
    // RDMA 车道（只接应用内存和网卡）
    el('line',{x1:edge,y1:app.y,x2:s.rdX,y2:app.y,class:'ln rdma'},lanesRd);
    el('line',{x1:edge,y1:nic.y,x2:s.rdX,y2:nic.y,class:'ln rdma'},lanesRd);
    el('line',{x1:s.rdX,y1:app.y,x2:s.rdX,y2:nic.y,class:'ln rdma'},lanesRd);
  });
  // 网线
  const A=P.A,B=P.B;
  el('line',{x1:L.A.tcpX,y1:A.nic.y,x2:L.B.tcpX,y2:B.nic.y,class:'ln tcp tcpl'},lanesTcp);
  el('line',{x1:L.A.rdX,y1:A.nic.y,x2:L.B.rdX,y2:B.nic.y,class:'ln rdma'},lanesRd);
  tx(L.net.x,L.net.y,'网络',f.sm+1,'ink2-t','middle'===L.net.a?'middle':L.net.a,grp('1 2 3 4',hosts));
  // 「只发起一次」：CPU A 给网卡下一条命令
  const cR=L.A.cpu, cx=cR.x+cR.w-12;
  const cmdG=grp('4',hosts);
  E.cmdPath=el('path',{d:`M${cx} ${cR.y+cR.h} V${A.nic.y} H${L.A.blk.nic.x}`,class:'cmdl'},cmdG);
  E.cmdDot=el('circle',{r:L.mobile?6:7,cx:cx,cy:cR.y+cR.h,class:'cmddot'},cmdG);E.cmdDot.style.opacity=0;

  /* 场景 5：上下两条管线同时跑 */
  const R=L.race, race=grp('5');
  E.race={};
  [['T','TCP','tcp'],['R','RDMA','rdma']].forEach(([k,name,cls])=>{
    const ln=R[k];
    const labY=L.mobile?ln.y+R.labDy:ln.y;
    tx(R.lab.x,labY,name,f.lane,'lbl','start',race).style.fontWeight=700;
    el('line',{x1:ln.src.x+ln.src.w,y1:ln.y,x2:ln.dst.x,y2:ln.y,class:'ln '+cls},race);
    el('rect',{x:ln.src.x,y:ln.y-ln.src.h/2,width:ln.src.w,height:ln.src.h,rx:10,class:'ep'},race);
    tx(ln.src.x+ln.src.w/2,ln.y,'A',f.lbl,'lbl','middle',race);
    el('rect',{x:ln.dst.x,y:ln.y-ln.dst.h/2,width:ln.dst.w,height:ln.dst.h,rx:10,class:'ep'},race);
    tx(ln.dst.x+ln.dst.w/2,ln.y,'B',f.lbl,'lbl','middle',race);
    tx(ln.cnt.x,ln.cnt.ly,'已送达',f.note,'ink3-t','middle',race);
    E.race['n'+k]=tx(ln.cnt.x,ln.cnt.ny,'0',f.big,'num '+(k==='T'?'rose-t':'sage-t'),'middle',race);
    const cp=ln.cpu;
    tx(cp.lx,cp.y,'CPU',f.sm,'ink3-t','start',race);
    el('rect',{x:cp.tx,y:cp.y-L.trackH/2,width:cp.tw,height:L.trackH,rx:4,class:'track'},race);
    E.race['f'+k]=el('rect',{x:cp.tx,y:cp.y-L.trackH/2,width:0,height:L.trackH,rx:4,class:'fill'+(k==='R'?' sage':'')},race);
    E.race['s'+k]=tx(cp.sx,cp.sy||cp.y,k==='T'?'忙着搬数据':'空出来做计算',f.sm,'st '+(k==='T'?'rose-t':'sage-t'),'start',race);
  });
  E.race.stn=R.st.map(s=>{
    const y=R.T.y;
    const r=el('rect',{x:s.x-R.stW/2,y:y-R.stH/2,width:R.stW,height:R.stH,rx:10,class:'stn'},race);
    if(R.stLbl.two){tx(s.x,y+R.stLbl.dy-18,'内核',f.sm,'ink2-t','middle',race);tx(s.x,y+R.stLbl.dy+2,'CPU 复制',f.note,'rose-t','middle',race);}
    else{const t=tx(s.x,y+R.stLbl.dy,'内核 · ',f.sm,'ink2-t','middle',race);const sp=el('tspan',{class:'rose-t'},t);sp.textContent=T('CPU 复制');}
    return r;
  });
  tx(R.bypass.x,R.bypass.y,'不经过内核',f.sm,'ink3-t','middle',race);
  el('line',{x1:L.mobile?16:32,y1:R.sep,x2:L.W-(L.mobile?16:32),y2:R.sep,class:'sep'},race);
  tx(R.note.x,R.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',race);

  /* 数据块图层 */
  E.pk=el('g',{});
  /* 覆盖层：问号、交换机 */
  const q=grp('1');
  {const gx=L.mobile?L.B.blk.app.x+L.B.blk.app.w-28:L.B.blk.app.x+28,gy=C(L.B.blk.app).y; // 目的地空位
   el('rect',{x:gx-L.pw/2,y:gy-L.ph/2,width:L.pw,height:L.ph,rx:4,class:'ghost'},q);}
  el('circle',{cx:L.q.x,cy:L.q.y,r:L.q.r,class:'q'},q);tx(L.q.x,L.q.y+1,'?',f.lbl,'qt','middle',q);
  const g6=grp('6');const sw=L.sw;
  E.sw=el('rect',{x:sw.x-sw.w/2,y:sw.y-sw.h/2,width:sw.w,height:sw.h,rx:12,class:'sw'},g6);
  E.swIn=tx(sw.x,sw.y,'',f.sm,'swt','middle',g6);
  E.swT=tx(sw.tx,sw.ty,'',f.ttl,'lbl',sw.ta,g6);E.swT.style.fontWeight=700;
  E.swN=tx(sw.nx,sw.ny,'',f.note,'ink3-t',sw.na,g6);
  btn.style.left=(sw.bx/L.W*100)+'%';btn.style.top=(sw.by/L.H*100)+'%';

  /* 路线 */
  const pt=(x,y,st)=>({x,y,st});
  E.routeTcp=[pt(L.A.blk.app.x+L.A.blk.app.w-28,A.app.y),pt(L.A.tcpX,A.app.y),pt(L.A.tcpX,A.ker.y,'A'),pt(L.A.tcpX,A.nic.y),
    pt(L.B.tcpX,B.nic.y),pt(L.B.tcpX,B.ker.y,'B'),pt(L.B.tcpX,B.app.y),pt(L.mobile?L.B.blk.app.x+L.B.blk.app.w-28:L.B.blk.app.x+28,B.app.y)];
  E.routeRd=[E.routeTcp[0],pt(L.A.rdX,A.app.y),pt(L.A.rdX,A.nic.y),pt(L.B.rdX,B.nic.y),pt(L.B.rdX,B.app.y),E.routeTcp[7]];
  const rt=R.T,rr=R.R;
  E.routeRaceT=[pt(rt.src.x+rt.src.w+L.pw/2-2,rt.y),pt(R.st[0].x,rt.y,'T1'),pt(R.st[1].x,rt.y,'T2'),pt(rt.dst.x+4,rt.y)];
  E.routeRaceR=[pt(rr.src.x+rr.src.w+L.pw/2-2,rr.y),pt(rr.dst.x+4,rr.y)];
  E.lastPos={A:A,B:B};
  setNet(net,false);
}

/* ---------- 仿真：数据块沿路线走，在内核处由 CPU 处理、排队 ---------- */
function newSim(){S={t:0,pk:[],st:{},spawnT:0,lv:{A:0,B:0,T:0,R:0},tg:{A:0,B:0,T:0,R:0},cnt:{T:0,R:0},cyc:-1,cmdT:-1,fired:false};}
function station(id,route,svc,cap,next){
  const i=route.findIndex(p=>p.st===id),p=route[i],q=route[i-1];const d=Math.hypot(p.x-q.x,p.y-q.y);
  S.st[id]={id,p,dir:[(p.x-q.x)/d,(p.y-q.y)/d],svc,cap,cur:null,left:0,q:[],next};
}
function spawn(route,speed,lane,hold){
  const r=el('rect',{x:-L.pw/2,y:-L.ph/2,width:L.pw,height:L.ph,rx:4,class:'pkt'},E.pk);
  const p={el:r,pts:route,i:1,x:route[0].x,y:route[0].y,mode:'move',speed,lane,hold:hold||0,a:1};
  S.pk.push(p);return p;
}
const nextSt=p=>{for(let j=p.i;j<p.pts.length;j++)if(p.pts[j].st)return p.pts[j].st;return null};
function load(id){const s=S.st[id];return S.pk.filter(p=>p.mode==='move'&&nextSt(p)===id).length+s.q.length}
function canSpawn(route){const f=route.find(p=>p.st);return !f||load(f.st)<S.st[f.st].cap}
function canRelease(s){return !s.next||load(s.next)<S.st[s.next].cap}
function toward(p,x,y,d){const dx=x-p.x,dy=y-p.y,dist=Math.hypot(dx,dy);if(dist<=d){p.x=x;p.y=y;return true}p.x+=dx/dist*d;p.y+=dy/dist*d;return false}
function along(p,pts,u){u=Math.max(0,Math.min(1,u));let tot=0;for(let i=1;i<pts.length;i++)tot+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);
  let d=u*tot;for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],l=Math.hypot(b.x-a.x,b.y-a.y);if(d<=l||i===pts.length-1){const k=l?Math.min(1,d/l):0;p.x=a.x+(b.x-a.x)*k;p.y=a.y+(b.y-a.y)*k;return}d-=l}}
function tick(dt){
  S.t+=dt;
  MODES[step].pre&&MODES[step].pre(dt);
  for(const id in S.st){const s=S.st[id];
    if(s.cur){s.left-=dt;if(s.left<=0&&canRelease(s)){const p=s.cur;p.mode='move';p.i++;s.cur=null}}
    if(!s.cur&&s.q.length){const p=s.q.shift();s.cur=p;p.mode='svc';s.left=s.svc}
  }
  for(const p of S.pk){
    const d=p.speed*dt;
    if(p.mode==='move'){
      const tg=p.pts[p.i];
      if(!tg){p.mode='done';p.t0=S.t;MODES[step].arrive&&MODES[step].arrive(p);continue}
      if(tg.st){const s=S.st[tg.st];if(s.cur||s.q.length){const k=s.q.length+1,sx=s.p.x-s.dir[0]*k*L.gap,sy=s.p.y-s.dir[1]*k*L.gap;
        if((p.x-sx)*s.dir[0]+(p.y-sy)*s.dir[1]>=-d){p.x=sx;p.y=sy;s.q.push(p);p.mode='q';p.sid=s.id;continue}}}
      if(toward(p,tg.x,tg.y,d)){
        if(tg.st){const s=S.st[tg.st];p.sid=s.id;if(!s.cur&&!s.q.length){s.cur=p;p.mode='svc';s.left=s.svc}else{s.q.push(p);p.mode='q'}}
        else p.i++;
      }
    }else if(p.mode==='q'){const s=S.st[p.sid],k=s.q.indexOf(p)+1;toward(p,s.p.x-s.dir[0]*k*L.gap,s.p.y-s.dir[1]*k*L.gap,d)}
    else if(p.mode==='svc'){const s=S.st[p.sid];toward(p,s.p.x,s.p.y,d)}
    else if(p.mode==='done'){const age=S.t-p.t0-p.hold;p.a=age<0?1:Math.max(0,1-age/0.35);if(p.a<=0){p.el.remove();p.dead=true}}
  }
  S.pk=S.pk.filter(p=>!p.dead);
  // CPU 负载条：跟着「此刻有没有在复制」实时起伏，不是一次涨到某个值
  const busy=id=>S.st[id]&&S.st[id].cur?1:0;
  MODES[step].cpu&&MODES[step].cpu(busy);
  for(const k in S.lv){const tgt=S.tg[k],tau=tgt>S.lv[k]?(S.tauUp||0.22):(S.tauDn||0.45);S.lv[k]+=(tgt-S.lv[k])*(1-Math.exp(-dt/tau))}
}
const wob=(k)=>0.06*Math.sin(S.t*8.3+k)+0.03*Math.sin(S.t*3.1+2*k);
const MODES={
  0:{enter(){const p=spawn(E.routeTcp,0,'');p.mode='still'}},
  /* 第 2 步：CPU 复制出分身。原块留在 A 的应用内存，分身进内核缓冲区；
     到了 B，内核缓冲区里的块再被复制一份进应用内存。一个块只让负载条轻轻抬一点。 */
  1:{enter(){const r=E.routeTcp,a=r[0],b=r[7],ka={x:a.x,y:r[2].y},kb={x:b.x,y:r[5].y};
       const la={x:r[1].x},lb={x:r[6].x}; // 两侧 TCP 竖线的 x
       const mk=()=>{const p=spawn(r,0,'');p.mode='script';p.a=0;return p};
       // 所有移动都贴着画面上的线：应用内存接口 → 竖线 → 内核接口，转角处沿线拐弯
       S.s2={a,b,ka,kb,
         p1:[a,{x:la.x,y:a.y},{x:la.x,y:ka.y},ka],                                  // A：应用内存 → 内核缓冲区（复制）
         p2:[ka,{x:la.x,y:ka.y},r[3],r[4],{x:lb.x,y:kb.y},kb],                      // A 内核 → 网卡 → 网线 → B 网卡 → B 内核
         p3:[kb,{x:lb.x,y:kb.y},{x:lb.x,y:b.y},b],                                  // B：内核缓冲区 → 应用内存（复制）
         o:mk(),c1:mk(),c2:mk()};
       S.busyOv={A:false,B:false}},
     pre(){const T=7.0,t=S.t%T,Q=S.s2,sm=u=>u<=0?0:u>=1?1:u*u*(3-2*u),fade=(t0,t1)=>Math.max(0,Math.min(1,(t-t0)/(t1-t0)));
       const put=(p,q)=>{p.x=q.x;p.y=q.y};
       put(Q.o,Q.a);Q.o.a=fade(0,0.25)*(1-fade(6.2,6.6));
       // 发送端复制：0.5–1.7 秒；之后 2.0–3.7 秒走到 B 的内核缓冲区
       const c1=Q.c1;c1.cp=t>=0.5&&t<1.7;
       if(t<0.5){put(c1,Q.a);c1.a=0}else if(t<1.7){along(c1,Q.p1,sm((t-0.5)/1.2));c1.a=fade(0.5,0.62)}
       else if(t<2.0){put(c1,Q.ka);c1.a=1}else if(t<3.7){along(c1,Q.p2,sm((t-2.0)/1.7));c1.a=1}
       else{put(c1,Q.kb);c1.a=1-fade(5.2,5.6)}
       // 接收端复制：3.8–5.0 秒
       const c2=Q.c2;c2.cp=t>=3.8&&t<5.0;
       if(t<3.8){put(c2,Q.kb);c2.a=0}else if(t<5.0){along(c2,Q.p3,sm((t-3.8)/1.2));c2.a=fade(3.8,3.92)}
       else{put(c2,Q.b);c2.a=1-fade(6.2,6.6)}
       S.busyOv.A=c1.cp;S.busyOv.B=c2.cp},
     cpu(){S.tg.A=S.busyOv.A?0.17+0.02*Math.sin(S.t*9):0;S.tg.B=S.busyOv.B?0.17+0.02*Math.sin(S.t*9+1):0}},
  2:{enter(){station('A',E.routeTcp,0.5,L.cap,'B');station('B',E.routeTcp,0.6,L.cap,null)},
     pre(dt){S.spawnT-=dt;if(S.spawnT<=0){if(canSpawn(E.routeTcp)){spawn(E.routeTcp,300,'',0.05);S.spawnT+=Math.max(0.34,1.05-0.17*S.t)}else S.spawnT=0.05}},
     // 负载跟着数据量走：流量越大越高，最后停在接近顶满
     cpu(b){S.tauUp=0.7;S.tauDn=1.2;const v=Math.min(1,S.t/6.5),base=0.12+0.83*v;
       const one=(id,k)=>{const st=S.st[id],act=st.cur||st.q.length;return act?Math.min(0.97,base+wob(k)*0.3):base*0.6};
       S.tg.A=one('A',1);S.tg.B=one('B',2)}},
  3:{enter(){S.cmdT=0},
     pre(dt){const c=Math.floor(S.t/7.5),tau=S.t-c*7.5;
       if(c!==S.cyc){S.cyc=c;S.cmdT=S.t;S.sent=0;S.fired=true}
       while(S.sent<6&&tau>=1.0+S.sent*0.45){spawn(E.routeRd,330,'',0.3);S.sent++}},
     cpu(){const c=S.t-S.cmdT;S.tg.A=c>=0&&c<0.8?0.35:0;S.tg.B=0}},
  4:{enter(){station('T1',E.routeRaceT,0.45,L.race.capT,'T2');station('T2',E.routeRaceT,0.55,L.race.capT,null)},
     pre(dt){const c=Math.floor(S.t/9),tau=S.t-c*9;
       if(c!==S.cyc){if(S.cyc>=0){S.pk.forEach(p=>p.el.remove());S.pk=[];for(const id in S.st){S.st[id].cur=null;S.st[id].q=[]}}
         S.cyc=c;S.cnt={T:0,R:0};S.spawnT=0;S.cmdT=S.t}
       if(tau<7.4){S.spawnT-=dt;if(S.spawnT<=0){S.spawnT+=0.25;spawn(E.routeRaceR,400,'R',0.05);if(canSpawn(E.routeRaceT))spawn(E.routeRaceT,400,'T',0.05)}}},
     arrive(p){S.cnt[p.lane]++},
     cpu(b){S.tauUp=0.7;S.tauDn=0.9;S.tg.T=(b('T1')||b('T2'))?Math.min(0.96,0.9+wob(3)*0.5):0.1;const c=S.t-S.cmdT;S.tg.R=c<0.6?0.08:0.03}},
  5:{enter(){S.spawnT=0},
     pre(dt){S.spawnT-=dt;if(S.spawnT<=0){S.spawnT+=0.55;spawn(E.routeRd,300,'',0.3)}}}
};

/* ---------- 渲染 ---------- */
function render(){
  for(const p of S.pk){p.el.setAttribute('transform',`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
    p.el.classList.toggle('cp',p.mode==='svc'||!!p.cp);p.el.style.opacity=p.a}
  const s=step;
  ['A','B'].forEach(sd=>{
    const lv=Math.max(0,Math.min(1,S.lv[sd]));
    E['fill'+sd].setAttribute('width',(E['tw'+sd]*lv).toFixed(1));
    E['fill'+sd].setAttribute('class','fill'+(s===3&&sd==='A'?' slate':''));
    const busy=S.busyOv?!!S.busyOv[sd]:!!(S.st[sd]&&S.st[sd].cur);
    const on=(s===1||s===2)&&busy;
    E['con'+sd].classList.toggle('on',on);E['kst'+sd].classList.toggle('on',s===1||on);
    let box='',txt='',cls='';
    if(s===1){if(busy){box='on';txt='复制数据';cls='rose-t'}}
    else if(s===2){box=lv>0.3?'on':'';txt=lv>0.8?'占用很高':lv>0.45?'占用升高':'占用较低';cls=lv>0.45?'rose-t':'ink3-t'}
    else if(s===3){if(sd==='A'){txt='只发起一次';cls='slate-t';box=S.lv.A>0.05?'ask':''}else{txt='不参与';cls='sage-t';box='idle'}}
    E['cpu'+sd].setAttribute('class','cpubox'+(box?' '+box:''));
    E['st'+sd].textContent=T(txt);E['st'+sd].setAttribute('class','st '+cls);
    if(s===2&&S.st[sd]&&S.st[sd].q.length>=2)(S.qSeen=S.qSeen||{})[sd]=1; // 出现过排队就一直显示，避免闪烁
    E['qlab'+sd].style.opacity=(s===2&&S.qSeen&&S.qSeen[sd])?1:0;
  });
  // 命令点：只在每轮开头走一次
  if(s===3){const c=S.t-S.cmdT,on=c>=0&&c<0.85;E.cmdDot.style.opacity=on?1:0;
    if(on){const Lp=E.cmdPath.getTotalLength(),q=E.cmdPath.getPointAtLength(Lp*Math.min(1,c/0.75));E.cmdDot.setAttribute('cx',q.x);E.cmdDot.setAttribute('cy',q.y)}}
  if(s===4){const tc=S.t-Math.floor(S.t/9)*9,f=tc>8.6?Math.max(0,(9-tc)/0.4):tc<0.4?tc/0.4:1; // 重置时淡出淡入
    E.pk.style.opacity=f;E.race.nT.style.opacity=f;E.race.nR.style.opacity=f;
    E.race.nT.textContent=S.cnt.T;E.race.nR.textContent=S.cnt.R;
    E.race.fT.setAttribute('width',(L.race.T.cpu.tw*Math.max(0,Math.min(1,S.lv.T))).toFixed(1));
    E.race.fR.setAttribute('width',(L.race.R.cpu.tw*Math.max(0,Math.min(1,S.lv.R))).toFixed(1));
    E.race.sT.style.opacity=S.lv.T>0.45?1:0;
    E.race.stn.forEach((r,i)=>r.classList.toggle('on',!!S.st['T'+(i+1)].cur));}
}
function applyVis(){
  svg.setAttribute('data-step',step+1);
  svg.querySelectorAll('[data-show]').forEach(g=>g.classList.toggle('hid',!g.dataset.show.split(' ').includes(String(step+1))));
  svg.querySelectorAll('[data-dim]').forEach(g=>g.classList.toggle('dim',g.dataset.dim.split(' ').includes(String(step+1))));
  btn.hidden=step!==5;
}
function setNet(n,flash){
  net=n;const ib=n==='ib';
  if(!E.swT)return;
  E.swT.textContent=T(ib?'InfiniBand':'以太网 RoCE');
  E.swIn.textContent=T(ib?'IB 交换机':'以太网交换机');
  E.swN.textContent=T(ib?'专用网络':'普通以太网');
  if(step===5){E.subA.textContent=ib?'IB':'RoCE';E.subB.textContent=E.subA.textContent}
  btn.textContent=T('⇄ 换成')+T(ib?'以太网 RoCE':' InfiniBand');
  btn.setAttribute('aria-label',T('切换网络，当前 ')+T(ib?'InfiniBand':'以太网 RoCE'));
  if(flash){E.sw.classList.remove('flip');void E.sw.getBBox();E.sw.classList.add('flip')}
}
btn.addEventListener('click',()=>setNet(net==='ib'?'roce':'ib',true));

let raf=0,last=0,paused=!!opts.paused,dead=false;
function loop(now){const dt=Math.min(0.05,Math.max(0,(now-last)/1000||0));last=now;tick(dt);render();raf=requestAnimationFrame(loop)}
function run(){cancelAnimationFrame(raf);if(paused||dead||reduce)return;last=performance.now();raf=requestAnimationFrame(loop)}
function enter(i){
  step=i;cancelAnimationFrame(raf);
  if(S)S.pk.forEach(p=>p.el.remove());
  newSim();E.pk.style.opacity=1;
  E.subA.textContent=T('直接读');E.subB.textContent=T('直接写');
  if(i===5)setNet(net,false);
  applyVis();
  MODES[i].enter&&MODES[i].enter();
  if(reduce){const lim=[0,1.0,8,2.6,6,1.6][i];for(let t=0;t<lim;t+=1/60)tick(1/60);render();return}
  render();run();
}
function rebuild(){L=layout(mq.matches);build();svg.setAttribute('aria-label',T('两台服务器之间传数据：TCP 与 RDMA 的路径和 CPU 负担'));if(opts.onLayout)opts.onLayout(L.W/L.H,L.mobile);enter(step)}
mq.addEventListener('change',rebuild);
const onLang=()=>rebuild();document.addEventListener('ss-lang',onLang);
L=layout(mq.matches);build();svg.setAttribute('aria-label',T('两台服务器之间传数据：TCP 与 RDMA 的路径和 CPU 负担'));if(opts.onLayout)opts.onLayout(L.W/L.H,L.mobile);
const ctrl={
  show(i){enter(Math.max(0,Math.min(5,i)))},
  pause(){paused=true;cancelAnimationFrame(raf)},
  resume(){if(!paused)return;paused=false;run()},
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML=''},
  ratio(){return L.W/L.H},
  step(){return step},
  sim(){return {step,t:S.t,q:Object.fromEntries(Object.entries(S.st).map(([k,s])=>[k,s.q.length])),lv:S.lv,cnt:S.cnt,n:S.pk.length}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim.rdma={steps:6,mount:mount};
})();
