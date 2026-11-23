/* QLC 闪存：6 步动画（SVG，按时间写死的时间线，不依赖动画库）。QLC 每个单元存 4 个比特：档位、擦写寿命、写入慢、寿命随写入大小变化、规格书口径，以及软件怎样让它用得久。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-qlc'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-qlc.css，全部限定在 .ssa-v-qlc 容器之内。 */
(function(){
var ID='v-qlc';
var EN={"SLC · 2 档 · 1 比特":"SLC · 2 levels · 1 bit","QLC · 16 档 · 4 比特":"QLC · 16 levels · 4 bits","约 3 V":"~3 V","约 0 V":"~0 V","读出":"Reads","读对":"Correct","读错":"Misread","擦除":"Erase","电子漏出":"Electrons leak","早期 SLC 约 10 万次擦写":"Early SLC: ~100,000 cycles","约为早期 SLC 的百分之一":"~1/100 of early SLC","示意，不代表实测数字":"Schematic, not measured",
"客户端":"Client","直接写 QLC":"Straight to QLC","先写 SCM，之后迁往 QLC":"SCM first, QLC later","QLC 盘":"QLC drive","写入中":"writing","已确认":"ACKs","后台迁移":"background",
"一页（以 128 KB 为例）":"One page (128 KB here)","4 KB 写入也用掉整页":"A 4 KB write uses the whole page","4 KB 随机":"4 KB random","128 KB 顺序":"128 KB sequential","整盘耐久度（相对值）":"Relative drive endurance","依据：VAST 白皮书第 56–57 页":"Source: VAST white paper, pp. 56–57",
"JEDEC 测试负载":"JEDEC test workload","约 77% 的写入 ≤ 4 KB":"~77% of writes ≤ 4 KB","整页对齐写入":"Page-aligned writes","标称耐久度对应测试负载":"Rated endurance belongs to the test workload","实际磨损随写入负载变化":"Actual wear depends on the write workload",
"写入":"Writes","SCM 吸收短期更新":"SCM buffers transient updates","整页大块":"Full pages","在集群内分散磨损":"Distribute wear across the cluster","QLC 盘磨损（示意）":"QLC drive wear (schematic)",
"QLC 闪存：电压档位、擦写寿命、写入路径与写入大小":"QLC flash: voltage levels, erase endurance, write path and write size"};
var ENM={"先写 SCM，之后迁往 QLC":"SCM first, QLC later","SCM 吸收短期更新":"SCM buffers transient updates","在集群内分散磨损":"Wear spread across SSDs","4 KB 写入也用掉整页":"4 KB uses a whole page"};
var ARIA="QLC 闪存：电压档位、擦写寿命、写入路径与写入大小";
function makeScene(H){
const {el,tx,settx,grp,rect,line,C,P,clamp,sm,ramp,pk,dot,put,hide,run,loopFade}=H;
const L_=()=>H.L(),E_=()=>H.E();
const SCENE={
 still:[2,4.5,8,6,5,8],
 layout(m){
  if(!m)return {mobile:false,W:960,H:480,pw:16,ph:16,dr:6,f:{lbl:19,sm:17,note:16},
   lad:{xs:[240,600],y:66,w:170,h:320,vx:24,top:46},
   s3:{lanes:[140,340],cli:{x:40,w:120,h:56},scm:{x:340,w:150,h:56},q:{x:660,w:200,h:64},cnt:28},
   s4:{page:{x:300,y:74,w:340,h:46},lab:P(40,97),rows:[244,362],lx:40,bx:250,bw:515,valOut:true},
   s5:{a:{x:40,y:60,w:420,h:200},b:{x:500,y:60,w:420,h:200},bars:[322,396],bx:40,bw:700},
   s6:{src:{x:40,y:210,w:110,h:56},scm:{x:240,y:200,w:200,h:76},dr:{x0:560,y0:90,cols:4,dw:82,dh:120,gx:16,gy:44}},
   note:P(40,456)};
  return {mobile:true,W:480,H:560,pw:14,ph:14,dr:5,f:{lbl:18,sm:17,note:17},
   lad:{xs:[140,350],y:70,w:120,h:320,vx:18,top:40,bottom:true},
   s3:{lanes:[110,350],cli:{x:12,w:92,h:52},scm:{x:150,w:110,h:52},q:{x:300,w:168,h:60},cnt:24},
   s4:{page:{x:16,y:84,w:448,h:44},lab:P(16,56),rows:[272,411],lx:16,bx:16,bw:410,valOut:false,stack:true},
   s5:{a:{x:16,y:40,w:448,h:150},b:{x:16,y:236,w:448,h:110},bars:[410,478],bx:16,bw:448},
   s6:{src:{x:12,y:72,w:92,h:52},scm:{x:150,y:60,w:200,h:76},dr:{x0:20,y0:280,cols:8,dw:48,dh:160,gx:8,gy:44}},
   note:P(16,536)};
 },
 build(L,E){
  const f=L.f,M=L.mobile;
  /* 第 1、2 步：两个单元的电压刻度 */
  {const g=grp('1 2'),d=L.lad;E.lad=[];
   [[2,'SLC · 2 档 · 1 比特'],[16,'QLC · 16 档 · 4 比特']].forEach(([n,lab],k)=>{const x=d.xs[k]-d.w/2,bh=d.h/n;
    tx(d.xs[k],d.y-(M?22:22),lab,f.lbl,'lbl b7','middle',g);
    const fr=rect({x,y:d.y,w:d.w,h:d.h},'box',g,6);
    for(let i=1;i<n;i++)el('line',{x1:x,y1:d.y+i*bh,x2:x+d.w,y2:d.y+i*bh,class:'sep'},g);
    const fill=el('rect',{x:x+3,y:d.y+d.h,width:d.w-6,height:0,class:'fill',opacity:0.35},g);
    const lvl=el('line',{x1:x,y1:d.y+d.h,x2:x+d.w,y2:d.y+d.h,class:'ln lit thick'},g);
    const vx=M?d.xs[k]:x+d.w+d.vx,vy=M?d.y+d.h+26:d.y+d.h/2;
    const val=tx(vx,vy,'',f.lbl,'num ink-t',M?'middle':'start',g);
    const st=tx(vx,M?vy+26:vy+30,'',f.sm,'st',M?'middle':'start',g);
    E.lad.push({x,n,bh,fr,fill,lvl,val,st,k})});
   const x0=d.xs[0]-d.w/2;tx(x0-10,d.y+8,'约 3 V',f.sm,'ink3-t','end',g);tx(x0-10,d.y+d.h-8,'约 0 V',f.sm,'ink3-t','end',g);
   const g2=grp('2');E.endur=[tx(d.xs[0],M?d.y+d.h+82:d.y+d.h+30,'早期 SLC 约 10 万次擦写',f.sm,'ink2-t','middle',g2),tx(d.xs[1],M?d.y+d.h+82:d.y+d.h+30,'约为早期 SLC 的百分之一',f.sm,'rose-t st','middle',g2)];
   tx(L.note.x,L.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',g);}
  /* 第 3 步：两条写路径 */
  {const s=L.s3,g=grp('3');E.s3=[];
   s.lanes.forEach((y,k)=>{const cli={x:s.cli.x,y:y-s.cli.h/2,w:s.cli.w,h:s.cli.h},q={x:s.q.x,y:y-s.q.h/2,w:s.q.w,h:s.q.h};
    const ly=y-s.q.h/2-26;
    tx(s.cli.x,ly,k?'先写 SCM，之后迁往 QLC':'直接写 QLC',f.lbl,'lbl b7','start',g);
    let scm=null;
    if(k){scm={x:s.scm.x,y:y-s.scm.h/2,w:s.scm.w,h:s.scm.h};line([P(cli.x+cli.w,y),P(scm.x,y)],'',g);line([P(scm.x+scm.w,y),P(q.x,y)],'dash',g)}
    else line([P(cli.x+cli.w,y),P(q.x,y)],'',g);
    const cb=rect(cli,'box',g);tx(C(cli).x,y,'客户端',f.sm,'lbl','middle',g);
    let sb=null;if(scm){sb=rect(scm,'box',g);tx(C(scm).x,y,'SCM',f.sm,'lbl b7','middle',g)}
    const qb=rect(q,'box',g,10);tx(C(q).x,y-(M?10:12),'QLC 盘',f.sm,'lbl b7','middle',g);const qs=tx(C(q).x,y+(M?14:16),'',f.sm,'st rose-t','middle',g);
    const cn=tx(cli.x,cli.y+cli.h+s.cnt,'',f.sm,'st','start',g);
    E.s3.push({y,cli,q,scm,cb,qb,sb,qs,cn,bg:k?tx(C(q).x,q.y+q.h+s.cnt,'',f.sm,'ink3-t','middle',g):null})});
   tx(L.note.x,L.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',g);}
  /* 第 4 步：小写入用掉整页 + 寿命柱 */
  {const s=L.s4,g=grp('4');
   tx(s.lab.x,s.lab.y,'一页（以 128 KB 为例）',f.sm,'ink2-t','start',g);
   E.page=rect(s.page,'cel',g,4);E.pageFill=el('rect',{x:s.page.x,y:s.page.y,width:0,height:s.page.h,rx:4,class:'fill ink3',opacity:0.35},g);
   E.pageMsg=tx(M?s.page.x:s.page.x+s.page.w+16,M?s.page.y+s.page.h+22:s.page.y+s.page.h/2,'4 KB 写入也用掉整页',f.sm,'st rose-t','start',g);
   const rows=[['4 KB 随机',1],['128 KB 顺序',20]];
   E.bars=rows.map(([lab,v],i)=>{const y=s.rows[i];
    if(s.stack){tx(s.lx,y-26,lab,f.sm,'lbl','start',g)}else tx(s.lx,y,lab,f.sm,'lbl','start',g);
    const w=s.bw*v/20*0.83;const b=el('rect',{x:s.bx,y:y-14,width:0,height:28,rx:4,class:'fill'+(i===1?' sage':'')},g);
    const t=tx(s.bx+w+10,y,i===1?'≈20×':'',f.sm,'num ink-t','start',g);return {b,t,w}});
   tx(M?L.note.x:s.bx,M?L.note.y-28:s.rows[0]-38,'整盘耐久度（相对值）',f.sm,'ink3-t','start',g);
   tx(L.note.x,L.note.y,'依据：VAST 白皮书第 56–57 页',f.note,'ink3-t','start',g);}
  /* 第 5 步：JEDEC 负载与大块写入 */
  {const s=L.s5,g=grp('5');
   [s.a,s.b].forEach((r,k)=>{rect(r,'box soft',g,12);tx(r.x+14,r.y+22,k?'整页对齐写入':'JEDEC 测试负载',f.sm,'ttl','start',g)});
   tx(s.a.x+s.a.w-14,s.a.y+22,'约 77% 的写入 ≤ 4 KB',f.sm,'st ochre-t','end',g);
   E.s5a=[];const n=M?18:20;for(let i=0;i<n;i++){const big=i%5===4||(i===n-1),cols=M?9:10;const w=big?(M?34:30):(M?14:16),h=big?22:16;
    const x=s.a.x+20+(i%cols)*(M?47:40),y=s.a.y+(M?62:70)+Math.floor(i/cols)*(M?44:56);E.s5a.push(el('rect',{x,y,width:w,height:h,rx:3,class:'pkt '+(big?'':'ochre')},g))}
   E.s5b=[];for(let i=0;i<(M?4:5);i++){const w=M?84:64;E.s5b.push(el('rect',{x:s.b.x+20+i*(w+14),y:s.b.y+(M?48:80),width:w,height:M?40:48,rx:4,class:'pkt sage'},g))}
   tx(s.bx,s.bars[0],'标称耐久度对应测试负载',f.lbl,'ttl','start',g);
   tx(s.bx,s.bars[1],'实际磨损随写入负载变化',f.lbl,'lbl','start',g);
   tx(L.note.x,L.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',g);}
  /* 第 6 步：SCM 吸收零碎更新，大块写到磨损最低的盘 */
  {const s=L.s6,g=grp('6'),d=s.dr;
   rect(s.src,'box',g);tx(C(s.src).x,C(s.src).y,'写入',f.sm,'lbl','middle',g);
   E.scm6=rect(s.scm,'box on',g,12);
   tx(s.scm.x,s.scm.y-18,'SCM',f.sm,'lbl b7','start',g);
   tx(C(s.scm).x,s.scm.y+s.scm.h+22,'SCM 吸收短期更新',f.sm,'ochre-t st','middle',g);
   const sy=C(s.src).y;line([P(s.src.x+s.src.w,sy),P(s.scm.x,sy)],'',g);
   E.dr6=[];const bus=M?d.y0-26:d.x0-40;
   tx(d.x0,d.y0-(M?54:46),'QLC 盘磨损（示意）',f.sm,'ttl','start',g);
   for(let i=0;i<8;i++){const r={x:d.x0+(i%d.cols)*(d.dw+d.gx),y:d.y0+Math.floor(i/d.cols)*(d.dh+d.gy),w:d.dw,h:d.dh};
    rect(r,'box',g,8);const tr=el('rect',{x:r.x+r.w/2-9,y:r.y+12,width:18,height:r.h-24,rx:4,class:'track'},g);
    const fl=el('rect',{x:r.x+r.w/2-9,y:r.y+r.h-12,width:18,height:0,rx:4,class:'fill sage'},g);
    const rb=r.y-d.gy/2,cx=r.x+r.w/2;let path;
    if(!M){const ex=s.scm.x+s.scm.w,ey=C(s.scm).y;path=[P(ex,ey),P(bus,ey),P(bus,rb),P(cx,rb),P(cx,r.y)]}
    else{const ex=C(s.scm).x,ey=s.scm.y+s.scm.h;path=[P(ex,ey),P(ex,bus),P(cx,bus),P(cx,r.y)]}
    E.dr6.push({r,fl,path,top:r.y+12,hh:r.h-24,rb,cx})}
   if(!M){const ey=C(s.scm).y,rbs=[...new Set(E.dr6.map(o=>o.rb))];line([P(s.scm.x+s.scm.w,ey),P(bus,ey)],'',g);line([P(bus,Math.min(ey,rbs[0])),P(bus,Math.max(ey,...rbs))],'',g);
     rbs.forEach(y=>line([P(bus,y),P(Math.max(...E.dr6.filter(o=>o.rb===y).map(o=>o.cx)),y)],'',g));E.dr6.forEach(o=>line([P(o.cx,o.rb),P(o.cx,o.r.y)],'thin',g))}
   else{const ex=C(s.scm).x;line([P(ex,s.scm.y+s.scm.h),P(ex,bus)],'',g);line([P(E.dr6[0].cx,bus),P(E.dr6[7].cx,bus)],'',g);E.dr6.forEach(o=>line([P(o.cx,bus),P(o.cx,o.r.y)],'thin',g))}
   tx(M?L.W-16:L.W-40,M?L.note.y-28:L.note.y,'在集群内分散磨损',f.sm,'st sage-t','end',g);
   tx(L.note.x,M?L.note.y:L.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',g);}
 },
 modes:[]
};
/* 电压刻度：level 为档号（0 起，从下往上），h 为水位高度 */
function setLevel(o,yv,cls){const d=L_().lad;const top=clamp(yv,d.y,d.y+d.h);o.fill.setAttribute('y',top.toFixed(1));o.fill.setAttribute('height',(d.y+d.h-top).toFixed(1));o.lvl.setAttribute('y1',top.toFixed(1));o.lvl.setAttribute('y2',top.toFixed(1));if(cls)o.lvl.setAttribute('class','ln thick '+cls)}
const bandY=(o,k)=>{const d=L_().lad;return d.y+d.h-(k+0.5)*o.bh};
const bits=(o,k)=>o.n===2?(k?'0':'1'):k.toString(2).padStart(4,'0');
const SEQ=[[1,11],[0,4],[1,14],[0,7],[1,2],[0,9]];
SCENE.modes[0]={frame(t){const E=E_(),per=1.8,i=Math.floor(t/per),u=t-i*per,a=SEQ[i%SEQ.length],p=SEQ[(i+SEQ.length-1)%SEQ.length];
  E.lad.forEach((o,k)=>{const y0=i?bandY(o,p[k]):bandY(o,0),y1=bandY(o,a[k]),v=sm(ramp(u,0.1,0.7));setLevel(o,y0+(y1-y0)*v,'lit');
   settx(o.val,(u>0.7?'读出 ':'')+(u>0.7?bits(o,a[k]):''),'num ink-t');if(u>0.7)o.val.textContent=H.T('读出')+' '+bits(o,a[k]);settx(o.st,'')})}};
SCENE.modes[1]={frame(t){const E=E_(),per=6,u=t%per,d=L_().lad,drop=d.h/16*1.15;
  E.lad.forEach(o=>{const k=o.n===2?1:9,yb=bandY(o,k);
   o.fr.setAttribute('class','box '+(u<0.6?'hot':''));
   if(u<0.6){setLevel(o,d.y+d.h,'hot');settx(o.val,'擦除','st rose-t');settx(o.st,'');return}
   const prog=sm(ramp(u,0.6,1.3)),leak=sm(ramp(u,1.8,4.2));const y=d.y+d.h+(yb-d.y-d.h)*prog+drop*leak;
   setLevel(o,y,leak>0?(o.n===2?'ok':'hot'):'lit');
   const now=Math.floor((d.y+d.h-y)/o.bh);
   if(u<1.8){o.val.textContent=H.T('读出')+' '+bits(o,k);o.val.setAttribute('class','num ink-t');settx(o.st,'')}
   else if(u<4.2)settx(o.st,'电子漏出','st ink3-t'),o.val.textContent=H.T('读出')+' '+bits(o,clamp(now,0,o.n-1));
   else{o.val.textContent=H.T('读出')+' '+bits(o,clamp(now,0,o.n-1));settx(o.st,now===k?'读对':'读错','st '+(now===k?'sage-t':'rose-t'))}})}};
/* 第 3 步：同步写，客户端等回话才发下一块 */
SCENE.modes[2]={enter(S){S.v.p=[pk(),pk()];S.v.a=[dot('ok'),dot('ok')];S.v.m=[];for(let i=0;i<12;i++)S.v.m.push(pk())},
 frame(t,S){const E=E_(),per=12,u=t%per,fa=loopFade(u,per);
  E.s3.forEach((o,k)=>{const cyc=k?1.4:3.2,i=Math.floor(u/cyc),w=u-i*cyc,cx=o.cli.x+o.cli.w,tgt=k?o.scm:o.q;
   const to=[P(cx,o.y),P(tgt.x,o.y)],back=[P(tgt.x,o.y),P(cx,o.y)];const tr=0.5,dw=k?0.15:1.9;const done=u>0.3?Math.floor((u-0)/cyc)+(w>tr+dw+tr?1:0):0;
   if(w<tr)run(S.v.p[k],to,w,0,tr);else if(w<tr+dw){put(S.v.p[k],P(tgt.x+(k?20:24),o.y),fa)}else hide(S.v.p[k]);
   if(w>tr+dw&&w<tr+dw+tr){run(S.v.a[k],back,w,tr+dw,tr)}else hide(S.v.a[k]);
   (k?o.sb:o.qb).setAttribute('class','box '+(w>tr&&w<tr+dw?(k?'on':'hot'):''));
   if(!k)settx(o.qs,w>tr&&w<tr+dw?'写入中':'','st rose-t');
   settx(o.cn,H.T('已确认')+' '+done,'st '+(k?'sage-t':'rose-t'));o.cn.textContent=H.T('已确认')+' '+done;o.cn.style.opacity=fa;
   if(k){/* 回话之后，块再在后台迁往 QLC */
    for(let j=0;j<S.v.m.length;j++){const t0=j*cyc+tr+dw+tr+0.1,m=S.v.m[j];const pth=[P(o.scm.x+o.scm.w,o.y),P(o.q.x,o.y)];const r=run(m,pth,u,t0,1.2,{post:0});if(r>=0&&r<=1)m.style.opacity=fa}
    settx(o.bg,'后台迁移','ink3-t')}})}};
/* 第 4 步 */
SCENE.modes[3]={enter(S){S.v.b=pk('rose',10,L_().s4.page.h-8,2)},
 frame(t,S){const E=E_(),s=L_().s4,pg=s.page,cy=pg.y+pg.h/2;
  const r=run(S.v.b,[P(pg.x-60,cy),P(pg.x+10,cy)],t,0.2,0.6,{post:1});if(t<0.2)hide(S.v.b);else if(t<0.4)S.v.b.style.opacity=ramp(t,0.2,0.4);
  E.pageFill.setAttribute('width',(pg.w*sm(ramp(t,0.9,1.4))).toFixed(1));E.pageMsg.style.opacity=ramp(t,1.3,1.7);
  E.bars.forEach((o,i)=>{const v=sm(ramp(t,1.8+i*0.7,2.6+i*0.7));o.b.setAttribute('width',(o.w*v).toFixed(1));o.t.setAttribute('x',(s.bx+o.w*v+10).toFixed(1));o.t.style.opacity=ramp(t,2.4+i*0.7,2.7+i*0.7)})}};
/* 第 5 步 */
SCENE.modes[4]={frame(t){const E=E_();E.s5a.forEach((r,i)=>r.style.opacity=ramp(t,0.1+i*0.06,0.3+i*0.06));E.s5b.forEach((r,i)=>r.style.opacity=ramp(t,1.4+i*0.15,1.6+i*0.15));}};
/* 第 6 步：每 0.45 秒来一个零碎更新进 SCM；整页写入在盘间分散 */
SCENE.modes[5]={enter(S){S.v.u=[];for(let i=0;i<24;i++)S.v.u.push(dot('ochre',L_().dr));S.v.b=[];for(let i=0;i<16;i++)S.v.b.push(pk('',L_().mobile?24:26,L_().mobile?18:20))},
 frame(t,S){const E=E_(),L=L_(),s=L.s6,per=12.5,u=t%per,fa=loopFade(u,per),sy=C(s.src).y;
  S.v.u.forEach((d,i)=>{const ts=0.2+i*0.45,inn=P(s.scm.x+20+(i%6)*((s.scm.w-40)/5),C(s.scm).y+((i>>1)%2?10:-10));
   const r=run(d,[P(s.src.x+s.src.w,sy),P(s.scm.x,sy),inn],u,ts,0.8,{post:1});if(r>1)d.style.opacity=fa*(1-ramp(u,ts+0.8,ts+1.6));else if(r>=0)d.style.opacity=fa});
  const wear=[0,0,0,0,0,0,0,0];
  S.v.b.forEach((b,j)=>{const ts=1.4+j*0.62;const k=j%E.dr6.length;
   const o=E.dr6[k];const r=run(b,o.path,u,ts,0.9,{post:0});if(r>1)wear[k]+=1;else if(r>=0)b.style.opacity=fa});
  E.dr6.forEach((o,i)=>{const h=o.hh*Math.min(1,wear[i]*0.42)*fa;o.fl.setAttribute('y',(o.top+o.hh-h).toFixed(1));o.fl.setAttribute('height',h.toFixed(1))})}};
return SCENE;
}

function lang(){return window.SS_LANG==='en'?'en':'zh'}
var NS='http://www.w3.org/2000/svg';
function mount(host,opts){
opts=opts||{};
host.classList.add('ssa-'+ID);host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class',ID+'-scene');svg.setAttribute('role','img');host.appendChild(svg);
const btn=document.createElement('button');btn.className='ssa-tgl';btn.type='button';btn.hidden=true;host.appendChild(btn);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mq=matchMedia('(max-width: 640px)');
const qs=new URLSearchParams(location.search);
let L=null,E={},S={items:[],v:{}},step=0,T0=0,raf=0,paused=!!opts.paused,pausedAt=0,dead=false,tgl=false;
/* 文字：中文原样，英文取 EN；手机版放不下时取 ENM 的短写法 */
function T(s){if(lang()!=='en')return s;if(L&&L.mobile&&ENM[s]!==undefined)return ENM[s];return EN[s]!==undefined?EN[s]:s}
/* ---------- 画图小工具 ---------- */
function el(tag,a,p){const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);(p||svg).appendChild(e);return e}
/* 字号下限：桌面 16（文档模式约缩到 0.97 倍，仍 ≥15px），手机 17（400 宽页面约缩到 0.77 倍，仍 ≥12px） */
function tx(x,y,s,size,cls,anchor,p){size=Math.max(size,L&&L.mobile?17:16);const t=el('text',{x,y,'font-size':size,class:cls||''},p);if(anchor)t.setAttribute('text-anchor',anchor);t.textContent=T(s);return t}
function settx(t,s,cls){t.textContent=T(s);if(cls!=null)t.setAttribute('class',cls)}
function grp(show,p,extra){const g=el('g',Object.assign({class:'vis'},extra||{}),p);if(show)g.dataset.show=show;return g}
function rect(r,cls,p,rx){return el('rect',{x:r.x,y:r.y,width:r.w,height:r.h,rx:rx==null?10:rx,class:cls||'box'},p)}
function line(pts,cls,p){return el('path',{d:'M'+pts.map(q=>(+q.x).toFixed(1)+' '+(+q.y).toFixed(1)).join(' L'),class:'ln '+(cls||'')},p)}
const C=r=>({x:r.x+r.w/2,y:r.y+r.h/2});
const P=(x,y)=>({x,y});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sm=u=>u<=0?0:u>=1?1:u*u*(3-2*u);
const ramp=(t,t0,t1)=>clamp((t-t0)/(t1-t0),0,1);
function plen(pts){let s=0;for(let i=1;i<pts.length;i++)s+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);return s}
function along(pts,u){u=clamp(u,0,1);let d=u*plen(pts);for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],l=Math.hypot(b.x-a.x,b.y-a.y);if(d<=l||i===pts.length-1){const k=l?Math.min(1,d/l):0;return {x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k}}d-=l}return pts[pts.length-1]}
const rev=pts=>pts.slice().reverse();
/* 数据块：pk(cls,w,h) 生成一个块（每步重进时自动清掉）；put(块,点,透明度) 放到某处 */
function pk(cls,w,h,rx){w=w||L.pw;h=h||L.ph;const r=el('rect',{x:-w/2,y:-h/2,width:w,height:h,rx:rx==null?3:rx,class:'pkt '+(cls||'')},E.pk);r.style.opacity=0;S.items.push(r);return r}
function dot(cls,r){const c=el('circle',{cx:0,cy:0,r:r||L.dr||7,class:'dot '+(cls||'')},E.pk);c.style.opacity=0;S.items.push(c);return c}
function put(p,q,a){p.setAttribute('transform','translate('+q.x.toFixed(1)+' '+q.y.toFixed(1)+')');p.style.opacity=a==null?1:a}
function hide(p){p.style.opacity=0}
/* 一个块沿 pts 在 [t0, t0+dur] 内走完；之前不显示（pre），之后停在终点（post 透明度） */
function run(p,pts,t,t0,dur,opt){opt=opt||{};const u=(t-t0)/dur;
  if(u<0){if(opt.pre!=null)put(p,pts[0],opt.pre);else hide(p);return -1}
  if(u<=1){put(p,along(pts,sm(u)),1);return u}
  put(p,pts[pts.length-1],opt.post==null?1:opt.post);return 1.5}
const loopFade=(u,per)=>u>per-0.45?clamp((per-u)/0.45,0,1):u<0.35?clamp(u/0.35,0,1):1;
const H={el,tx,settx,grp,rect,line,C,P,clamp,sm,ramp,plen,along,rev,pk,dot,put,hide,run,loopFade,T,alt:()=>tgl,E:()=>E,S:()=>S,L:()=>L};
const SCENE=makeScene(H);
/* ---------- 引擎 ---------- */
function applyVis(){
  svg.setAttribute('data-step',step+1);
  svg.querySelectorAll('[data-show]').forEach(g=>g.classList.toggle('hid',!g.dataset.show.split(' ').includes(String(step+1))));
  const TG=SCENE.toggle;btn.hidden=!(TG&&TG.step===step);
  if(TG&&L.btn){btn.style.left=(L.btn.x/L.W*100)+'%';btn.style.top=(L.btn.y/L.H*100)+'%'}
}
function setBtn(){const TG=SCENE.toggle;if(!TG)return;btn.textContent='⇄ '+T(TG.label[tgl?1:0]);btn.setAttribute('aria-label',T(TG.aria)+T(TG.now[tgl?1:0]))}
function newSim(){S.items.forEach(o=>o.remove());S={items:[],v:{}}}
function loop(now){const t=Math.max(0,(now-T0)/1000);SCENE.modes[step].frame(t,S);raf=requestAnimationFrame(loop)}
function go(){cancelAnimationFrame(raf);if(paused||dead||reduce)return;raf=requestAnimationFrame(loop)}
function enter(i){
  step=i;cancelAnimationFrame(raf);newSim();
  SCENE.reset&&SCENE.reset(S);
  applyVis();
  const m=SCENE.modes[i];m.enter&&m.enter(S);
  if(reduce){m.frame((SCENE.still||[])[i]||2,S);return}
  m.frame(0,S);T0=pausedAt=performance.now();go();
}
if(SCENE.toggle){const TG=SCENE.toggle;tgl=qs.get(TG.param)===TG.on;
  btn.addEventListener('click',()=>{tgl=!tgl;setBtn();if(step===TG.step)enter(step)})}
function build(){L=SCENE.layout(mq.matches);svg.innerHTML='';E={};svg.setAttribute('viewBox',`0 0 ${L.W} ${L.H}`);
  SCENE.build(L,E);E.pk=el('g',{class:'pklayer'});SCENE.over&&SCENE.over(L,E);
  setBtn();svg.setAttribute('aria-label',T(ARIA));if(opts.onLayout)opts.onLayout(L.W/L.H,L.mobile)}
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
  sim(){return {step,t:(performance.now()-T0)/1000,v:S.v,n:S.items.length,tgl}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim[ID]={steps:6,mount:mount};
})();
