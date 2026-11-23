/* 去重：6 步动画（SVG，按时间写死的时间线，不依赖动画库）。一样的块只存一份：指纹与指针、块大小的取舍、内存表限住去重范围、VAST 把表放在共享 SCM、确认之后再去重、去重后的读取。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-dedup'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-dedup.css，全部限定在 .ssa-v-dedup 容器之内。 */
(function(){
var ID='v-dedup';
var EN={"写入":"Writes","算指纹":"Fingerprint","指纹表":"Fingerprint table","已存数据":"Stored data","只记指针":"Pointers only","新指纹：存下":"New: stored","见过：只记指针":"Seen: pointer only","写入":"Writes","实际存":"Stored","块":"blocks","示意，不代表实测数字":"Schematic, not measured",
"大块":"Large blocks","小块":"Small blocks","已存的版本":"Stored","新版本":"New","要再存":"Stored again","格":"cells","指纹表":"Fingerprint table","行":"rows","只有一格不同":"One cell differs",
"客户端":"Client","设备 1":"Appliance 1","设备 2":"Appliance 2","内存里的表":"Table in RAM","去重域 1":"Domain 1","去重域 2":"Domain 2","查不到：再存一份":"Not found: stored again","同一块存了两份":"Same block stored twice","存下":"stored",
"NVMe-oF 网络":"NVMe-oF network","SCM：指纹表":"SCM: fingerprint table","QLC：数据":"QLC: data","CNode 1 写入：表里没有，存下":"CNode 1 writes: not in table, stored","CNode 3 写入：查到了，只记指针":"CNode 3 writes: found, pointer only","整套系统一个缩减范围":"One reduction realm for the whole system",
"确认":"ACK","去重":"Dedupe","压缩":"Compress","按固定块边界填充":"Padded to fixed block boundaries","变长块紧密装入":"Variable-length chunks packed tightly","凑整浪费":"padding","先确认，之后再缩减":"ACK first, reduce afterwards",
"硬盘":"Hard drive","闪存":"Flash","逻辑数据块分布在不同位置":"Chunks at different locations","已读回":"Read back","磁头来回寻道":"Head seeks back and forth","无机械寻道":"No mechanical seeks",
"去重：指纹与指针、块大小、去重范围、共享 SCM 上的指纹表与去重后的读取":"Deduplication: fingerprints and pointers, block size, dedupe domains, a shared SCM table and reading deduplicated data"};
var ENM={"指纹表":"Fingerprints","CNode 1 写入：表里没有，存下":"CNode 1: new, stored","CNode 3 写入：查到了，只记指针":"CNode 3: found, pointer","整套系统一个缩减范围":"One realm for the system","逻辑数据块分布在不同位置":"Chunks at different locations","无机械寻道":"No mechanical seeks","磁头来回寻道":"Head seeks","先确认，之后再缩减":"ACK first, reduce later","查不到：再存一份":"Not found: stored again","压缩":"Compress"};
var ARIA="去重：指纹与指针、块大小、去重范围、共享 SCM 上的指纹表与去重后的读取";
function makeScene(H){
const {el,tx,settx,grp,rect,line,C,P,clamp,sm,ramp,pk,dot,put,hide,run,loopFade}=H;
const L_=()=>H.L(),E_=()=>H.E();
const COL=['','ochre','violet']; // A、B、C 三种内容
const SEQ1=[0,1,0,2,0,1];
const SCENE={
 still:[9,5,6,7.5,7,6],
 layout(m){
  if(!m)return {mobile:false,W:960,H:480,pw:26,ph:22,dr:7,f:{lbl:19,sm:17,note:16},
   s1:{src:{x:40,y:150,w:130,h:180},fp:{x:300,y:197,w:150,h:86},tbl:{x:300,y:50,w:150,h:110},store:{x:640,y:140,w:280,h:90},ptr:{x:640,y:290,w:280,h:80},bus:560,cnt:P(40,420)},
   s2:{lanes:[130,330],cx:220,cw:40,gap:6,lx:40,out:{x:640},tbl:P(920,0)},
   s3:{cli:{x:40,y:200,w:120,h:60},dev:[{x:330,y:40,w:300,h:160},{x:330,y:270,w:300,h:160}],bus:250},
   s4:{cn:[170,480,790],cnw:200,cnh:60,cny:40,fab:180,db:{x:150,y:230,w:660,h:180}},
   s5:{cli:{x:40,y:70,w:120,h:56},scm:{x:220,y:70,w:130,h:56},dd:{x:410,y:70,w:120,h:56},cp:{x:590,y:70,w:200,h:56},q:{x:840,y:70,w:80,h:56},strips:[290,380],sx:280,sw:600},
   s6:{pa:{x:40,y:60,w:420,h:330},pb:{x:500,y:60,w:420,h:330}},
   note:P(40,456)};
  return {mobile:true,W:480,H:600,pw:22,ph:18,dr:6,f:{lbl:18,sm:17,note:17},
   s1:{src:{x:16,y:60,w:120,h:160},fp:{x:180,y:97,w:120,h:86},tbl:{x:336,y:40,w:128,h:110},store:{x:16,y:300,w:448,h:76},ptr:{x:16,y:420,w:448,h:70},bus:250,cnt:P(16,520),vert:true},
   s2:{lanes:[120,350],cx:16,cw:40,gap:6,lx:16,out:{x:16},vert:true},
   s3:{cli:{x:16,y:30,w:120,h:52},dev:[{x:16,y:130,w:448,h:170},{x:16,y:340,w:448,h:170}],bus:110,vert:true},
   s4:{cn:[88,240,392],cnw:136,cnh:56,cny:30,fab:150,db:{x:16,y:210,w:448,h:260}},
   s5:{cli:{x:16,y:40,w:100,h:52},scm:{x:180,y:40,w:120,h:52},dd:{x:16,y:150,w:120,h:52},cp:{x:170,y:150,w:170,h:52},q:{x:380,y:150,w:84,h:52},strips:[330,450],sx:16,sw:448},
   s6:{pa:{x:16,y:40,w:448,h:240},pb:{x:16,y:300,w:448,h:240}},
   note:P(16,576)};
 },
 build(L,E){
  const f=L.f,M=L.mobile;
  /* 第 1 步 */
  {const s=L.s1,g=grp('1');
   rect(s.src,'box soft',g,12);tx(s.src.x,s.src.y-18,'写入',f.sm,'ttl','start',g);
   rect(s.fp,'box on',g,10);tx(C(s.fp).x,s.fp.y+18,'算指纹',f.sm,'lbl b7','middle',g);
   rect(s.tbl,'box',g,10);tx(s.tbl.x+12,s.tbl.y+22,'指纹表',f.sm,'ttl','start',g);
   E.t1=[0,1,2].map(i=>el('rect',{x:s.tbl.x+16+i*40,y:s.tbl.y+50,width:28,height:28,rx:4,class:'pkt '+COL[i]},g));
   rect(s.store,'box',g,10);tx(s.store.x,s.store.y-18,'已存数据',f.sm,'ttl','start',g);
   rect(s.ptr,'box soft',g,10);tx(s.ptr.x,s.ptr.y-18,'只记指针',f.sm,'ttl','start',g);
   const cy=C(s.fp).y,srcY=M?C(s.src).y:cy;
   if(!M){line([P(s.src.x+s.src.w,cy),P(s.fp.x,cy)],'',g);line([P(s.fp.x+s.fp.w,cy),P(s.bus,cy)],'',g);
     line([P(s.bus,C(s.store).y),P(s.bus,C(s.ptr).y)],'',g);line([P(s.bus,C(s.store).y),P(s.store.x,C(s.store).y)],'',g);line([P(s.bus,C(s.ptr).y),P(s.ptr.x,C(s.ptr).y)],'',g);
     line([P(C(s.fp).x,s.fp.y),P(C(s.fp).x,s.tbl.y+s.tbl.h)],'dash thin',g)}
   else{line([P(s.src.x+s.src.w,cy),P(s.fp.x,cy)],'',g);line([P(s.fp.x+s.fp.w,cy),P(s.tbl.x,cy)],'dash thin',g);
     line([P(C(s.fp).x,s.fp.y+s.fp.h),P(C(s.fp).x,s.store.y)],'',g);line([P(C(s.fp).x,s.bus),P(472,s.bus),P(472,C(s.ptr).y),P(s.ptr.x+s.ptr.w,C(s.ptr).y)],'',g)}
   E.r1=M?tx(C(s.fp).x+12,s.fp.y+s.fp.h+22,'',f.sm,'st','start',g):tx(C(s.fp).x,s.fp.y+s.fp.h+24,'',f.sm,'st','middle',g);
   E.c1=tx(s.cnt.x,s.cnt.y,'',f.lbl,'num ink-t','start',g);
   E.st1=[];for(let i=0;i<3;i++)E.st1.push(P(s.store.x+40+i*(M?60:70),C(s.store).y));
   E.pt1=[];for(let i=0;i<3;i++)E.pt1.push(P(s.ptr.x+40+i*(M?60:70),C(s.ptr).y));
   E.in1=SEQ1.map((k,i)=>P(s.src.x+(M?36:38)+(i%2)*(M?48:54),s.src.y+(M?36:40)+Math.floor(i/2)*(M?46:50)));
   tx(L.note.x,L.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',g);}
  /* 第 2 步：大块与小块 */
  {const s=L.s2,g=grp('2');E.s2=[];
   [['大块',4],['小块',1]].forEach(([nm,gs],k)=>{const y=s.lanes[k],cw=M?32:s.cw,gp=s.gap,x0=M?s.cx+70:s.cx;
    tx(s.lx,y-(M?78:70),nm,f.lbl,'lbl b7','start',g);
    tx(s.lx,y-26,'已存的版本',f.sm,'ink3-t','start',g);tx(s.lx,y+22,'新版本',f.sm,'ink3-t','start',g);
    if(M){/* 手机：标签在左，格子在右，靠 x0 */}
    const oldC=[],newC=[];
    for(let i=0;i<8;i++){const x=x0+(M?40:120)+i*(cw+gp);oldC.push(el('rect',{x,y:y-38,width:cw,height:24,rx:3,class:'cel s'},g));newC.push(el('rect',{x,y:y+10,width:cw,height:24,rx:3,class:'cel '+(i===5?'r':'s')},g))}
    /* 块边框 */
    const bx=[];for(let j=0;j<8/gs;j++){const x=x0+(M?40:120)+j*gs*(cw+gp)-3,w=gs*(cw+gp)-gp+6;bx.push(el('rect',{x,y:y+6,width:w,height:32,rx:5,class:'box',fill:'none'},g))}
    bx.forEach(b=>b.style.fill='none');
    const ox=M?L.W-16:x0+(M?40:120)+8*(cw+gp)+40;
    const res=tx(M?L.W-16:ox,M?y+66:y-26,'',f.sm,'st','end'===(M?'end':'start')?'end':'start',g);if(M)res.setAttribute('text-anchor','end');
    const tb=tx(M?L.W-16:ox,M?y+92:y+22,'',f.sm,'st ink2-t',M?'end':'start',g);
    E.s2.push({gs,oldC,newC,bx,res,tb,y,x0:x0+(M?40:120),cw,gp})});
   tx(L.note.x,L.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',g);}
  /* 第 3 步：两台设备各自一张表 */
  {const s=L.s3,g=grp('3');E.s3=[];
   rect(s.cli,'box',g);tx(C(s.cli).x,C(s.cli).y,'客户端',f.sm,'lbl','middle',g);
   const cy=C(s.cli).y;
   s.dev.forEach((d,k)=>{rect(d,'box',g,12);tx(d.x+14,d.y+22,k?'设备 2':'设备 1',f.sm,'lbl b7','start',g);
    tx(d.x+d.w-14,d.y+22,k?'去重域 2':'去重域 1',f.sm,'ink3-t','end',g);
    const tb={x:d.x+14,y:d.y+48,w:M?150:130,h:M?88:92};rect(tb,'box soft',g,8);tx(tb.x+10,tb.y+18,'内存里的表',f.sm,'ink2-t','start',g);
    const tslot=P(tb.x+28,tb.y+60);const st={x:tb.x+tb.w+20,y:tb.y,w:d.x+d.w-14-(tb.x+tb.w+20),h:tb.h};rect(st,'box soft',g,8);tx(st.x+10,st.y+18,'存下',f.sm,'ink2-t','start',g);
    const sslot=P(st.x+34,st.y+60);
    let path;
    if(!M){path=[P(s.cli.x+s.cli.w,cy),P(s.bus,cy),P(s.bus,C(d).y),P(d.x,C(d).y)]}else{const cb=P(C(s.cli).x,s.cli.y+s.cli.h);path=k?[cb,P(cb.x,s.bus),P(472,s.bus),P(472,C(d).y),P(d.x+d.w,C(d).y)]:[cb,P(cb.x,s.bus),P(360,s.bus),P(360,d.y)]}
    E.s3.push({d,tslot,sslot,path,msg:tx(M?d.x+d.w-14:d.x+d.w+20,M?d.y+d.h-18:C(d).y,'',f.sm,'st',M?'end':'start',g),tr:null,sr:null})});
   if(!M){line([P(s.cli.x+s.cli.w,cy),P(s.bus,cy)],'',g);line([P(s.bus,C(s.dev[0]).y),P(s.bus,C(s.dev[1]).y)],'',g);s.dev.forEach(d=>line([P(s.bus,C(d).y),P(d.x,C(d).y)],'',g))}
   else{E.s3.forEach(o=>line(o.path,'',g))}
   E.s3msg=tx(M?L.W-16:L.W-40,L.note.y,'同一块存了两份',f.sm,'st rose-t','end',g);
   tx(L.note.x,L.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',g);}
  /* 第 4 步：共享 SCM 上的一张表 */
  {const s=L.s4,g=grp('4'),db=s.db;E.cn4=[];
   el('line',{x1:M?16:60,y1:s.fab,x2:M?464:900,y2:s.fab,class:'ln'},g);
   tx(M?16:60,s.fab+18,'NVMe-oF 网络',f.sm,'ink3-t','start',g);
   s.cn.forEach((x,i)=>{const r={x:x-s.cnw/2,y:s.cny,w:s.cnw,h:s.cnh};line([P(x,r.y+r.h),P(x,s.fab)],'',g);E.cn4.push(rect(r,'box',g,10));
    tx(C(r).x,C(r).y,'CNode '+(i+1),f.sm,'lbl b7','middle',g)});
   rect(db,'box soft',g,14);tx(db.x+14,db.y+22,'DBox',f.sm,'ttl','start',g);
   const half=M?{a:{x:db.x+14,y:db.y+44,w:300,h:96},b:{x:db.x+14,y:db.y+154,w:db.w-28,h:90}}:{a:{x:db.x+20,y:db.y+44,w:300,h:116},b:{x:db.x+340,y:db.y+44,w:300,h:116}};
   E.tbl4=rect(half.a,'box on',g,10);tx(half.a.x+12,half.a.y+20,'SCM：指纹表',f.sm,'lbl b7','start',g);
   rect(half.b,'box',g,10);tx(half.b.x+12,half.b.y+20,'QLC：数据',f.sm,'lbl b7','start',g);
   const ax=C(half.a).x,bx2=M?db.x+db.w-40:C(half.b).x;half.bx=bx2;
   line([P(ax,s.fab),P(ax,half.a.y)],'',g);line([P(bx2,s.fab),P(bx2,half.b.y)],'',g);
   E.h4=half;E.row4=el('rect',{x:half.a.x+20,y:half.a.y+44,width:34,height:30,rx:4,class:'pkt'},g);
   E.m4=tx(M?16:L.W/2,M?L.note.y-30:db.y+db.h+20,'',f.sm,'st',M?'start':'middle',g);
   E.realm=tx(M?L.W-16:L.W-40,L.note.y,'整套系统一个缩减范围',f.sm,'st sage-t','end',g);
   if(M)E.realm.setAttribute('y',L.note.y-58);
   tx(L.note.x,L.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',g);}
  /* 第 5 步：确认之后再缩减；变长块紧密装入存 */
  {const s=L.s5,g=grp('5');
   const B=[['cli','客户端'],['scm','SCM'],['dd','去重'],['cp','压缩'],['q','QLC']];E.b5={};
   B.forEach(([k,nm])=>{const r=s[k];E.b5[k]=rect(r,k==='scm'?'box on':'box',g,10);tx(C(r).x,C(r).y,nm,f.sm,'lbl b7','middle',g)});
   const y1=C(s.cli).y;line([P(s.cli.x+s.cli.w,y1),P(s.scm.x,y1)],'',g);
   if(!M){line([P(s.scm.x+s.scm.w,y1),P(s.dd.x,y1)],'',g);line([P(s.dd.x+s.dd.w,y1),P(s.cp.x,y1)],'',g);line([P(s.cp.x+s.cp.w,y1),P(s.q.x,y1)],'',g)}
   else{const y2=C(s.dd).y;line([P(C(s.scm).x,s.scm.y+s.scm.h),P(C(s.scm).x,s.scm.y+s.scm.h+24),P(C(s.dd).x,s.scm.y+s.scm.h+24),P(C(s.dd).x,s.dd.y)],'',g);line([P(s.dd.x+s.dd.w,y2),P(s.cp.x,y2)],'',g);line([P(s.cp.x+s.cp.w,y2),P(s.q.x,y2)],'',g)}
   E.ack5=tx(C(s.cli).x,M?s.cli.y-16:s.cli.y+s.cli.h+22,'',f.sm,'st sage-t','middle',g);
   tx(M?L.W-16:C(s.cp).x,M?s.cp.y+s.cp.h+26:s.cli.y+s.cli.h+56,'先确认，之后再缩减',f.sm,'st ink2-t',M?'end':'middle',g);
   /* 两条存放带：同样 3 段缩减后的数据 */
   const segs=[0.72,0.45,0.9];E.st5=[];
   ['按固定块边界填充','变长块紧密装入'].forEach((nm,k)=>{const y=s.strips[k];tx(s.sx,y-34,nm,f.sm,'lbl b7','start',g);
    el('rect',{x:s.sx,y:y-16,width:s.sw,height:32,rx:4,class:'track'},g);
    const cell=s.sw/8;/* 每格为同样大小的示意块 */
    for(let i=1;i<8;i++)if(!k)el('line',{x1:s.sx+i*cell,y1:y-16,x2:s.sx+i*cell,y2:y+16,class:'sep'},g);
    let x=s.sx;const parts=[];segs.forEach((w,i)=>{const len=w*cell*2;const r=el('rect',{x,y:y-14,width:0,height:28,rx:3,class:'fill '+['','violet','ochre'][i]},g);let pad=null;
      if(!k){const used=Math.ceil(len/cell)*cell;pad=el('rect',{x:x+len,y:y-14,width:0,height:28,rx:0,class:'fill rose',opacity:0.35},g);parts.push({r,len,pad,padw:used-len,x});x+=used}else{parts.push({r,len,x});x+=len}});
    const end=tx(Math.min(x+10,s.sx+s.sw-8),y+34,k?'':'凑整浪费',f.sm,'st rose-t','start',g);E.st5.push({parts,end})});
   tx(L.note.x,L.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',g);}
  /* 第 6 步：硬盘与闪存读回散开的块 */
  {const s=L.s6,g=grp('6');E.s6={};
   [['a','硬盘'],['b','闪存']].forEach(([k,nm])=>{const r=s['p'+k];rect(r,'box soft',g,12);tx(r.x+14,r.y+22,nm,f.lbl,'lbl b7','start',g);
    E.s6[k]={r,cnt:tx(r.x+r.w-14,r.y+22,'',f.sm,'num ink-t','end',g),note:tx(r.x+14,r.y+r.h-20,k==='a'?'磁头来回寻道':'无机械寻道',f.sm,'st '+(k==='a'?'rose-t':'sage-t'),'start',g)}});
   /* 硬盘：盘片和磁头 */
   const pa=s.pa,c=P(pa.x+(M?150:180),pa.y+pa.h/2+(M?4:0)),R=M?92:120;E.hd={c,R};
   [1,0.75,0.5,0.25].forEach(k=>el('circle',{cx:c.x,cy:c.y,r:R*k,class:'ln thin'},g));
   E.hdArm=el('line',{x1:c.x+R+60,y1:c.y+R,x2:c.x,y2:c.y,class:'ln lit thick'},g);
   const ang=[0.3,2.4,4.1,1.2,3.3,5.4],rad=[0.9,0.4,0.75,0.3,0.6,0.85];
   E.hdPts=ang.map((a,i)=>P(c.x+R*rad[i]*Math.cos(a),c.y+R*rad[i]*Math.sin(a)));
   E.hdDots=E.hdPts.map((p,i)=>el('circle',{cx:p.x,cy:p.y,r:L.dr+1,class:'dot'},g));
   /* 闪存：芯片格子 */
   const pb=s.pb,cols=6,rows=4,cw=M?50:46,ch=M?28:38,x0=pb.x+(M?40:60),y0=pb.y+(M?52:80);E.fl=[];const pick=[3,8,13,17,20,10];
   for(let i=0;i<cols*rows;i++){const r={x:x0+(i%cols)*(cw+12),y:y0+Math.floor(i/cols)*(ch+10),w:cw,h:ch};const e=rect(r,'cel',g,4);const j=pick.indexOf(i);if(j>=0)E.fl[j]=e}
   E.fl.forEach(e=>e.setAttribute('class','cel s'));
   tx(M?L.W-16:L.W/2,M?L.note.y-15:L.note.y,'逻辑数据块分布在不同位置',f.sm,'ink2-t',M?'end':'middle',g);
   tx(L.note.x,L.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',g);}
 },
 modes:[]
};
/* 第 1 步：6 块依次走过「算指纹」，查表后去「已存数据」或「只记指针」 */
SCENE.modes[0]={enter(S){S.v.b=SEQ1.map(k=>pk(COL[k]));S.v.q=dot('',6)},
 frame(t,S){const E=E_(),L=L_(),s=L.s1,M=L.mobile,per=10,u=t%per,fa=loopFade(u,per);const fp=C(s.fp);let seen=[0,0,0],stored=0,written=0,msg=null;
  E.t1.forEach(r=>r.style.opacity=0.12);
  SEQ1.forEach((k,i)=>{const b=S.v.b[i],ts=0.4+i*1.4,src=E.in1[i];const isNew=!seen[k];const fp=C(s.fp);
   const toFp=M?[src,P(src.x,fp.y),fp]:[src,P(s.src.x+s.src.w,fp.y),fp];
   if(u<ts){put(b,src,fa);return}
   if(u<ts+0.5){put(b,H.along(toFp,sm((u-ts)/0.5)),fa);return}
   written++;
   if(u<ts+0.9){put(b,fp,fa);msg=isNew?'新指纹：存下':'见过：只记指针';if(!isNew)E.t1[k].style.opacity=1;seen[k]=1;if(isNew)stored++;return}
   seen[k]=1;if(isNew)stored++;
   const dst=isNew?E.st1[k]:E.pt1[[0,0,1,0,2,0][i]];
   let path;if(!M)path=[fp,P(s.bus,fp.y),P(s.bus,dst.y),dst];else{path=isNew?[fp,P(fp.x,C(s.store).y),dst]:[fp,P(fp.x,s.bus),P(472,s.bus),P(472,C(s.ptr).y),dst]}
   const r=run(b,path,u,ts+0.9,0.6);b.style.opacity=fa;
   if(!isNew&&r>1){b.setAttribute('transform',`translate(${dst.x} ${dst.y}) scale(0.4)`)}});
  E.t1.forEach((r,k)=>{if(seen[k])r.style.opacity=Math.max(+r.style.opacity,0.85)});
  if(msg){settx(E.r1,msg,'st '+(msg[0]==='新'?'slate-t':'sage-t'));E.r1.style.opacity=fa}else E.r1.style.opacity=0;
  E.c1.textContent=H.T('写入')+' '+written+' '+H.T('块')+'  ·  '+H.T('实际存')+' '+stored+' '+H.T('块');E.c1.style.opacity=fa}};
/* 第 2 步：逐块比对；相同的变绿，不同的那块整块再存 */
SCENE.modes[1]={frame(t){const E=E_(),per=7,u=t%per,fa=loopFade(u,per);
  E.s2.forEach(o=>{const nb=8/o.gs;let again=0;
   o.bx.forEach((b,j)=>{const on=u>0.5+j*(3/nb);const bad=j*o.gs<=5&&5<j*o.gs+o.gs;
    b.setAttribute('class','box '+(on?(bad?'hot':'ok'):''));b.style.fill='none';b.style.opacity=fa;
    for(let c=j*o.gs;c<j*o.gs+o.gs;c++)o.newC[c].setAttribute('class','cel '+(c===5?'r':'s')+(on&&!bad?'':''));
    if(on&&bad)again=o.gs});
   if(u>3.8){const en=window.SS_LANG==='en';settx(o.res,'','st rose-t');o.res.textContent=en?'Stored again: '+again+(again===1?' cell':' cells'):'要再存 '+again+' 格';o.res.style.opacity=fa;
     o.tb.textContent=en?'Fingerprint table: '+nb+' rows':'指纹表 '+nb+' 行';o.tb.style.opacity=fa}else{o.res.style.opacity=0;o.tb.style.opacity=0}})}};
/* 第 3 步 */
SCENE.modes[2]={enter(S){S.v.a=[pk(),pk()];S.v.tr=E_().s3.map(o=>{const r=el('rect',{x:o.tslot.x-13,y:o.tslot.y-11,width:26,height:22,rx:3,class:'pkt'},E_().pk);S.items.push(r);return r});
  S.v.sr=E_().s3.map(o=>{const r=el('rect',{x:o.sslot.x-13,y:o.sslot.y-11,width:26,height:22,rx:3,class:'pkt'},E_().pk);S.items.push(r);return r})},
 frame(t,S){const E=E_(),per=8,u=t%per,fa=loopFade(u,per);
  E.s3.forEach((o,k)=>{const ts=0.4+k*2.6;const r=run(S.v.a[k],o.path.concat([o.sslot]),u,ts,1.2,{post:0});if(r>=0&&r<=1)S.v.a[k].style.opacity=fa;
   const done=u>ts+1.2;S.v.tr[k].style.opacity=done?fa:0;S.v.sr[k].style.opacity=done?fa:0;
   settx(o.msg,k&&done?'查不到：再存一份':'','st rose-t');o.msg.style.opacity=fa});
  E.s3msg.style.opacity=u>5.6?fa:0}};
/* 第 4 步：CNode 1 写 A（表里没有，存下），CNode 3 写 A（查到，只记指针） */
SCENE.modes[3]={enter(S){S.v.a=pk();S.v.b=pk();S.v.q=dot('ok',7)},
 frame(t,S){const E=E_(),L=L_(),s=L.s4,h=E.h4,per=9,u=t%per,fa=loopFade(u,per);const ax=C(h.a).x,bx=h.bx,cy=s.cny+s.cnh/2,dx=s.cnw/2-(L.mobile?16:26);
  const p1=[P(s.cn[0],s.cny+s.cnh),P(s.cn[0],s.fab),P(ax,s.fab),P(ax,h.a.y+60)],p1b=[P(ax,h.a.y+60),P(ax,s.fab),P(bx,s.fab),P(bx,h.b.y+h.b.h*0.65)];
  E.cn4.forEach(c=>c.setAttribute('class','box'));
  const r1=run(S.v.a,p1,u,0.3,1.3,{post:1});
  if(r1>1){if(u<2.4)put(S.v.a,P(ax,h.a.y+60),fa);else run(S.v.a,p1b,u,2.4,1.0,{post:1})}
  if(S.v.a.style.opacity>0)S.v.a.style.opacity=fa;
  E.row4.style.opacity=u>1.6?fa:0;
  if(u>0.3&&u<1.2)E.cn4[0].setAttribute('class','box on');
  const ts=4.2,p2=[P(s.cn[2]+dx,s.cny-12),P(s.cn[2]+dx,cy)];
  run(S.v.b,p2,u,ts,0.5,{post:1});if(u>ts)S.v.b.style.opacity=fa;
  if(u>ts&&u<ts+2.4)E.cn4[2].setAttribute('class','box on');
  const q=[P(s.cn[2],s.cny+s.cnh),P(s.cn[2],s.fab),P(ax,s.fab),P(ax,h.a.y+44)];
  if(u>ts+0.6&&u<ts+1.6)put(S.v.q,H.along(q,sm((u-ts-0.6)/1.0)),fa);else if(u>ts+1.6&&u<ts+2.6)put(S.v.q,H.along(H.rev(q),sm((u-ts-1.6)/1.0)),fa);else hide(S.v.q);
  E.tbl4.setAttribute('class','box '+(u>ts+1.5&&u<ts+2.2?'ok':'on'));
  if(u>ts+2.6)S.v.b.setAttribute('transform',`translate(${s.cn[2]+dx} ${cy}) scale(0.4)`);
  if(u<4)settx(E.m4,u>0.3?'CNode 1 写入：表里没有，存下':'','st slate-t');else settx(E.m4,u>ts+2.6?'CNode 3 写入：查到了，只记指针':'','st sage-t');E.m4.style.opacity=fa;
  E.realm.style.opacity=u>ts+2.8?fa:0}};
/* 第 5 步 */
SCENE.modes[4]={enter(S){S.v.p=pk();S.v.a=dot('ok',7)},
 frame(t,S){const E=E_(),L=L_(),s=L.s5,M=L.mobile,per=9.5,u=t%per,fa=loopFade(u,per);const y1=C(s.cli).y;
  const a=[P(s.cli.x+s.cli.w,y1),P(s.scm.x+20,y1)];
  let rest;if(!M)rest=[P(s.scm.x+s.scm.w,y1),C(s.dd),C(s.cp),P(s.q.x+20,y1)];else{const y2=C(s.dd).y;rest=[P(C(s.scm).x,s.scm.y+s.scm.h),P(C(s.scm).x,s.scm.y+s.scm.h+24),P(C(s.dd).x,s.scm.y+s.scm.h+24),C(s.dd),C(s.cp),P(s.q.x+20,y2)]}
  if(u<1.6)run(S.v.p,a,u,0.2,0.6,{post:1});else run(S.v.p,[P(s.scm.x+20,y1)].concat(rest),u,1.9,2.2,{post:0});
  if(S.v.p.style.opacity>0)S.v.p.style.opacity=fa;
  const r=run(S.v.a,[P(s.scm.x,y1),P(s.cli.x+s.cli.w,y1)],u,0.9,0.5,{post:0});
  settx(E.ack5,u>1.4?'确认':'','st sage-t');E.ack5.style.opacity=fa;
  E.b5.dd.setAttribute('class','box '+(u>2.4&&u<3.1?'on':''));E.b5.cp.setAttribute('class','box '+(u>3.1&&u<3.7?'on':''));
  E.st5.forEach((o,k)=>{o.parts.forEach((p,i)=>{const v=sm(ramp(u,4.4+i*0.5,4.8+i*0.5));p.r.setAttribute('width',(p.len*v).toFixed(1));if(p.pad){p.pad.setAttribute('width',(p.padw*ramp(u,4.8+i*0.5,5.0+i*0.5)).toFixed(1))}});o.end.style.opacity=ramp(u,5.8,6.1)*fa;o.parts.forEach(p=>{p.r.style.opacity=fa;if(p.pad)p.pad.style.opacity=fa*0.35})})}};
/* 第 6 步：硬盘磁头逐个寻道，闪存一口气读回 */
SCENE.modes[5]={frame(t){const E=E_(),per=9,u=t%per,fa=loopFade(u,per),c=E.hd.c,R=E.hd.R;
  let nA=0;const seek=1.2;const idx=Math.min(5,Math.floor(Math.max(0,u-0.4)/seek));
  E.hdDots.forEach((d,i)=>{const got=u>0.4+(i+1)*seek-0.2;if(got&&i<6)nA++;d.setAttribute('class','dot '+(got?'ok':''))});
  nA=Math.min(6,nA);
  const tgt=E.hdPts[idx],prev=E.hdPts[Math.max(0,idx-1)],k=sm(ramp(u-0.4-idx*seek,0,0.7));const p=P(prev.x+(tgt.x-prev.x)*k,prev.y+(tgt.y-prev.y)*k);
  E.hdArm.setAttribute('x2',p.x.toFixed(1));E.hdArm.setAttribute('y2',p.y.toFixed(1));
  let nB=0;E.fl.forEach((e,i)=>{const got=u>0.5+i*0.18;if(got)nB++;e.setAttribute('class','cel '+(got?'g':'s'))});
  E.s6.a.cnt.textContent=H.T('已读回')+' '+nA+' / 6';E.s6.b.cnt.textContent=H.T('已读回')+' '+nB+' / 6';E.s6.a.cnt.style.opacity=fa;E.s6.b.cnt.style.opacity=fa}};
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
