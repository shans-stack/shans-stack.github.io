/* 为什么全闪存算得过来：6 步动画（SVG，按时间写死的时间线，不依赖动画库）。展示全闪存的有效容量、写入磨损和两种成本口径。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-econ'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-econ.css，全部限定在 .ssa-v-econ 容器之内。
   VAST 字标引用 assets/brand/vast-wordmark-black.svg 与 vast-wordmark-white.svg 原件（浅色、深色各一）。 */
(function(){
var ID='v-econ';
var EN={
  "裸容量":"Raw capacity","可用容量":"Usable capacity","有效容量":"Effective capacity",
  "保护开销":"Protection overhead","数据缩减":"Data reduction","示意，不代表实测数字":"Schematic, not measured",
  "企业级 SSD":"Enterprise SSD","超大规模 SSD":"Hyperscale SSD","双端口":"Dual ports","单端口":"Single port",
  "DRAM 缓存":"DRAM cache","无 DRAM 缓存":"No DRAM cache","预留空间":"Overprovisioning",
  "较少的预留空间":"Less overprovisioning","NAND 闪存":"NAND flash","QLC · 每单元 4 比特":"QLC · 4 bits per cell",
  "写入":"Writes","直接写：4 KB 小写入":"Direct: 4 KB writes","经 SCM：整页写入":"Via SCM: full pages",
  "QLC 盘":"QLC drive","磨损":"Wear","较低":"Low","升高":"Rising","很高":"High",
  "两条路写入相同数据量（非比例图）":"Equal data volume (not to scale)",
  "数据":"Data","校验":"Parity","8+2 纠删码":"8+2 erasure code","146+4 条带":"146+4 stripe",
  "8 份数据 + 2 份校验":"8 data + 2 parity","146 份数据 + 4 份校验":"146 data + 4 parity",
  "校验占 20%":"20% parity","校验约占 2.7%":"~2.7% parity",
  "写入的数据":"Data written","闪存实际占用":"Flash used","相同的块：只记指针":"Identical: pointer only",
  "相似的块：相似性压缩":"Similar: similarity reduction","其他的块：压缩":"Others: compressed",
  "能省多少取决于数据本身（示意）":"Savings depend on the data (schematic)",
  "系统购置成本 ÷ 有效容量":"System purchase cost ÷ effective capacity",
  "每 TB 有效容量的购置成本":"Acquisition cost per effective TB",
  "再除以预计使用年限":"Divide by the expected service life",
  "每 TB 有效容量的年度化购置成本":"Annualized acquisition cost per effective TB",
  "全闪存：有效容量、写入磨损和成本口径":"All-flash economics: effective capacity, write wear and cost measures"
};
var ENM={};
var ARIA="全闪存：有效容量、写入磨损和成本口径";
function makeScene(H){
const {el,tx,settx,grp,rect,line,C,P,clamp,sm,ramp,pk,put,hide,run,loopFade,vlabel,vmark}=H;
const SCENE={
 still:[4,4,8.5,5,8,8.2],
 layout(m){
  if(!m)return {mobile:false,W:960,H:480,pw:14,ph:14,f:{lbl:19,sm:17,note:16,big:20},
   s2:{cards:[{x:40,y:24,w:420,h:356},{x:500,y:24,w:420,h:356}],cost:404},
   s3:{lanes:[150,350],src:{x:40,w:110,h:56},scm:{x:330,w:130,h:56},ssd:{x:620,w:300,h:110},mid:P(920,456),midA:'end'},
   s4:{lx:40,bx:300,bw:470,bh:46,ys:[170,326],leg:62},
   s5:{src:{x:40,y:110,w:160,h:150},box:{x:390,y:130,w:180,h:110},dst:{x:740,y:110,w:180,h:150},bars:[352,412],bx:40,bw:600},
   note:P(40,456)};
  return {mobile:true,W:480,H:580,pw:12,ph:12,f:{lbl:18,sm:17,note:17,big:19},
   s2:{cards:[{x:12,y:12,w:456,h:268},{x:12,y:296,w:456,h:268}],cost:null},
   s3:{lanes:[140,400],src:{x:12,w:84,h:52},scm:{x:126,w:96,h:52},ssd:{x:236,w:232,h:100},mid:P(240,268),midA:'middle'},
   s4:{lx:16,bx:16,bw:448,bh:40,ys:[230,426],leg:40,stack:true},
   s5:{src:{x:16,y:70,w:140,h:150},box:{x:170,y:250,w:140,h:96},dst:{x:324,y:70,w:140,h:150},bars:[440,500],bx:16,bw:448},
   note:P(16,556)};
 },
 build(L,E){
  const f=L.f,M=L.mobile;
  /* 第 1 步：容量口径 */
  {const g=grp('1'),w=M?380:246,h=74,x=M?50:52,y=M?55:178;
   const boxes=['裸容量','可用容量','有效容量'].map((label,i)=>{
    const box={x:x+(M?0:i*304),y:y+(M?i*167:0),w,h};
    const group=el('g',{},g);rect(box,'box '+(i===2?'ok':'soft'),group);
    tx(C(box).x,C(box).y,label,f.lbl,'ttl','middle',group);
    return {box,group};
   });
   E.s1=boxes.map(({box,group},i)=>{
    if(i===0)return group;
    const prev=boxes[i-1].box;
    const path=M?[P(C(prev).x,prev.y+h),P(C(box).x,box.y)]:[P(prev.x+w,C(prev).y),P(box.x,C(box).y)];
    line(path,'lit',group);
    tx(M?C(box).x+16:box.x-29,M?(prev.y+h+box.y)/2:box.y-22,i===1?'保护开销':'数据缩减',f.sm,'lbl',M?'start':'middle',group);
    return group;
   });}
  /* 第 2 步：企业级 SSD 与超大规模 SSD */
  {const g=grp('2');E.s2=[];
   const parts=[['双端口','DRAM 缓存','预留空间'],['单端口','无 DRAM 缓存','较少的预留空间']];
   L.s2.cards.forEach((c,k)=>{rect(c,'box',g,14);const pad=M?18:28;
    tx(c.x+pad,c.y+34,k?'超大规模 SSD':'企业级 SSD',f.lbl,'ttl','start',g);
    const top=c.y+(M?66:82),rh=M?36:46,rows=parts[k].map((name,i)=>{
      const r={x:c.x+pad,y:top+i*rh,w:c.w-2*pad,h:rh-6},group=el('g',{},g);
      rect(r,'box soft',group,6);tx(r.x+12,C(r).y,name,f.sm,'lbl','start',group);return group;
    });
    const chips=el('g',{},g),cy=c.y+c.h-(M?72:104);
    tx(c.x+pad,cy,k?'QLC · 每单元 4 比特':'NAND 闪存',f.sm,'lbl','start',chips);
    for(let i=0;i<4;i++)rect({x:c.x+pad+i*58,y:cy+20,w:46,h:27},'cel '+(k?'s':'v'),chips,4);
    E.s2.push([...rows,chips]);
   });}
  /* 第 3 步：同样的数据，两种写法的磨损 */
  {const s=L.s3,g=grp('3');E.s3=[];
   s.lanes.forEach((y,k)=>{const src={x:s.src.x,y:y-s.src.h/2,w:s.src.w,h:s.src.h},ssd={x:s.ssd.x,y:y-s.ssd.h/2,w:s.ssd.w,h:s.ssd.h};
    const ly=y-s.ssd.h/2-(M?30:30);
    if(k)vlabel(s.src.x,ly,'经 SCM：整页写入',f.lbl,'lbl b7',g,M?12:14);else tx(s.src.x,ly,'直接写：4 KB 小写入',f.lbl,'lbl b7','start',g);
    rect(src,'box',g);tx(C(src).x,y,'写入',f.sm,'lbl','middle',g);
    let scm=null;
    if(k){scm={x:s.scm.x,y:y-s.scm.h/2,w:s.scm.w,h:s.scm.h};line([P(src.x+src.w,y),P(scm.x,y)],'',g);line([P(scm.x+scm.w,y),P(ssd.x,y)],'',g);rect(scm,'box on',g);tx(C(scm).x,scm.y-14,'SCM',f.sm,'lbl b7','middle',g)}
    else line([P(src.x+src.w,y),P(ssd.x,y)],'',g);
    rect(ssd,'box',g,12);tx(ssd.x+12,ssd.y+(M?16:18),'QLC 盘',f.sm,'ttl','start',g);
    /* 页：2 行 × 10 列 */
    const pw=M?17:22,ph=M?24:28,gx=M?3:5,cols=10,gx0=ssd.x+ssd.w-12-cols*pw-(cols-1)*gx,gy0=ssd.y+ssd.h-12-2*ph-6;
    const pages=[];for(let i=0;i<20;i++){const r={x:gx0+(i%cols)*(pw+gx),y:gy0+Math.floor(i/cols)*(ph+6),w:pw,h:ph};pages.push({bg:rect(r,'cel',g,3),r})}
    /* 磨损条 */
    const wy=ssd.y+ssd.h+(M?24:26),wx=ssd.x+(M?52:64),ww=M?92:130;
    tx(ssd.x,wy,'磨损',f.sm,'ink2-t','start',g);el('rect',{x:wx,y:wy-7,width:ww,height:14,rx:4,class:'track'},g);
    const wf=el('rect',{x:wx,y:wy-7,width:0,height:14,rx:4,class:'fill'},g);const wt=tx(wx+ww+10,wy,'',f.sm,'st','start',g);
    E.s3.push({src,scm,ssd,pages,wf,ww,wt,y,ent:P(ssd.x,y)})});
   tx(s.mid.x,s.mid.y,'两条路写入相同数据量（非比例图）',f.note,'ink3-t',s.midA,g);
   tx(L.note.x,L.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',g);}
  /* 第 4 步：保护开销 */
  {const s=L.s4,g=grp('4');E.s4=[];
   const lx=s.lx,lg=s.leg;el('rect',{x:lx,y:lg-8,width:16,height:16,rx:3,class:'fill'},g);tx(lx+24,lg,'数据',f.sm,'ink2-t','start',g);
   const lx2=lx+(M?150:170);el('rect',{x:lx2,y:lg-8,width:16,height:16,rx:3,class:'fill ochre'},g);tx(lx2+24,lg,'校验',f.sm,'ink2-t','start',g);
   const rows=[['8+2 纠删码','8 份数据 + 2 份校验',0.2,'校验占 20%'],['146+4 条带','146 份数据 + 4 份校验',4/150,'校验约占 2.7%']];
   rows.forEach((r,i)=>{const y=s.ys[i];
    const ty=s.stack?y-s.bh/2-38:y-12,sy=s.stack?y-s.bh/2-14:y+14;
    if(i===1)vlabel(lx,ty,r[0],f.lbl,'lbl b7',g,M?12:14);else tx(lx,ty,r[0],f.lbl,'lbl b7','start',g);
    tx(lx,sy,r[1],f.sm,'ink3-t','start',g);
    el('rect',{x:s.bx,y:y-s.bh/2,width:s.bw,height:s.bh,rx:4,class:'track'},g);
    const u=el('rect',{x:s.bx,y:y-s.bh/2,width:0,height:s.bh,rx:4,class:'fill'},g);
    const p=el('rect',{x:s.bx,y:y-s.bh/2,width:0,height:s.bh,rx:0,class:'fill ochre'},g);
    const t=s.stack?tx(s.bx+s.bw,ty,r[3],f.sm,'st ochre-t','end',g):tx(s.bx+s.bw+14,y,r[3],f.sm,'st ochre-t','start',g);
    E.s4.push({u,p,t,frac:r[2],y})});}
  /* 第 5 步：数据缩减 */
  {const s=L.s5,g=grp('5');
   rect(s.src,'box soft',g,12);tx(s.src.x+12,s.src.y-16,'写入的数据',f.sm,'ttl','start',g);
   rect(s.dst,'box soft',g,12);tx(s.dst.x+12,s.dst.y-16,'闪存实际占用',f.sm,'ttl','start',g);
   rect(s.box,'box on',g,12);
   if(M)vlabel(s.box.x+10,s.box.y-16,'数据缩减',f.sm,'ttl',g,12);else vlabel(s.box.x,s.box.y-16,'数据缩减',f.sm,'ttl',g,13);
   const cy=C(s.box).y;
   if(!M){line([P(s.src.x+s.src.w,cy),P(s.box.x,cy)],'',g);line([P(s.box.x+s.box.w,cy),P(s.dst.x,cy)],'',g)}
   else{line([P(C(s.src).x,s.src.y+s.src.h),P(C(s.src).x,cy),P(s.box.x,cy)],'',g);line([P(s.box.x+s.box.w,cy),P(C(s.dst).x,cy),P(C(s.dst).x,s.dst.y+s.dst.h)],'',g)}
   E.s5act=tx(C(s.box).x,s.box.y+s.box.h+(M?22:26),'',f.sm,'st','middle',g);
   /* 底部两根条 */
   E.s5b=s.bars.map((y,i)=>{tx(s.bx,y-24,i?'闪存实际占用':'写入的数据',f.sm,'ink2-t','start',g);el('rect',{x:s.bx,y:y-8,width:s.bw,height:16,rx:4,class:'track'},g);
     return el('rect',{x:s.bx,y:y-8,width:0,height:16,rx:4,class:'fill'+(i?' sage':'')},g)});
   tx(L.note.x,L.note.y,'能省多少取决于数据本身（示意）',f.note,'ink3-t','start',g);
   /* 输入、输出槽位 */
   E.s5in=[];for(let i=0;i<8;i++)E.s5in.push(P(s.src.x+30+(i%4)*(M?28:33),s.src.y+40+Math.floor(i/4)*(M?50:56)));
   E.s5out=[];for(let i=0;i<8;i++)E.s5out.push(P(s.dst.x+30+(i%4)*(M?28:38),s.dst.y+40+Math.floor(i/4)*(M?50:56)));}
  /* 第 6 步：购置成本与年度化购置成本 */
  {const g=grp('6'),x=L.W/2,y=M?70:68,dy=M?130:108,w=M?444:760;
   E.s6=['系统购置成本 ÷ 有效容量','每 TB 有效容量的购置成本','再除以预计使用年限','每 TB 有效容量的年度化购置成本'].map((label,i)=>{
    const yy=y+i*dy,group=el('g',{},g);
    if(i%2)rect({x:x-w/2,y:yy-30,w,h:60},'box '+(i===3?'ok':'soft'),group);
    tx(x,yy,label,f.lbl,i%2?'ttl':'lbl','middle',group);
    if(i)line([P(x,yy-dy+38),P(x,yy-39)],'lit thin',group);
    return group;
   });}
 },
 modes:[]
};
const L_=()=>H.L(),E_=()=>H.E();
/* 第 1、2 步 */
SCENE.modes[0]={frame(t){E_().s1.forEach((group,i)=>group.style.opacity=ramp(t,i*0.75,i*0.75+0.4))}};
SCENE.modes[1]={frame(t){E_().s2.forEach(rows=>rows.forEach((group,i)=>group.style.opacity=ramp(t,i*0.6,i*0.6+0.4)))}};
/* 第 3 步：两条路同时写；左边小写入分别用页，右侧示意整页写入 */
SCENE.modes[2]={enter(S){const E=E_();S.v.A=[];S.v.B=[];S.v.Bp=[];for(let i=0;i<20;i++){S.v.A.push(pk('',L_().pw,L_().ph));S.v.B.push(pk('',L_().pw,L_().ph))}for(let i=0;i<4;i++)S.v.Bp.push(pk('',L_().pw*2.2,L_().ph*1.6))},
 frame(t,S){const E=E_(),L=L_(),M=L.mobile,per=9.6,u=t%per,fa=loopFade(u,per);const dt=0.34,t0=0.4;
  const A=E.s3[0],B=E.s3[1];let usedA=0,usedB=0;
  A.pages.forEach(p=>p.bg.setAttribute('class','cel'));B.pages.forEach(p=>p.bg.setAttribute('class','cel'));
  for(let i=0;i<20;i++){const ts=t0+i*dt;
   /* 直接写：沿线走进盘，落到第 i 页 */
   const pg=A.pages[i].r,pa=[P(A.src.x+A.src.w,A.y),A.ent,P(pg.x+pg.w/2,A.y),P(pg.x+pg.w/2,pg.y+pg.h/2)];
   const r=run(S.v.A[i],pa,u,ts,1.2,{post:0});if(r>1){usedA++;A.pages[i].bg.setAttribute('class','cel s')}
   if(r>=0&&r<=1)S.v.A[i].style.opacity=fa;
   /* 经 SCM：先进 SCM 停住 */
   const sc=C(B.scm),sx=B.scm.x+(M?18:24)+(i%5)*(M?14:20),pb=[P(B.src.x+B.src.w,B.y),P(sx,B.y)];
   const grpEnd=t0+(Math.floor(i/5)*5+4)*dt+0.9; // 这一组最后一块到达 SCM 的时刻
   const r2=run(S.v.B[i],pb,u,ts,0.9,{post:1});if(r2>1&&u>grpEnd)hide(S.v.B[i]);else if(r2>=0)S.v.B[i].style.opacity=fa}
  for(let j=0;j<4;j++){const pg=B.pages[j].r,ts=t0+(j*5+4)*dt+0.9;const pb=[C(B.scm),P(B.scm.x+B.scm.w,B.y),B.ent,P(pg.x+pg.w/2,B.y),P(pg.x+pg.w/2,pg.y+pg.h/2)];
   const r=run(S.v.Bp[j],pb,u,ts,1.1,{post:0});if(r>1){usedB++;B.pages[j].bg.setAttribute('class','cel s')}else if(r>=0)S.v.Bp[j].style.opacity=fa}
  const wear=(o,n)=>{const lv=Math.min(1,n/20);o.wf.setAttribute('width',(o.ww*lv*fa).toFixed(1));o.wf.setAttribute('class','fill '+(lv>0.6?'rose':lv>0.3?'ochre':'sage'));
   settx(o.wt,lv>0.6?'很高':lv>0.3?'升高':'较低','st '+(lv>0.6?'rose-t':lv>0.3?'ochre-t':'sage-t'));o.wt.style.opacity=n?fa:0};
  wear(A,usedA);wear(B,usedB)}};
/* 第 4 步 */
SCENE.modes[3]={frame(t){const E=E_(),s=L_().s4;E.s4.forEach((r,i)=>{const t0=0.3+i*1.1,u=sm(ramp(t,t0,t0+0.8));const uw=s.bw*(1-r.frac),pw=s.bw*r.frac;
  r.u.setAttribute('width',(uw*u).toFixed(1));const v=sm(ramp(t,t0+0.8,t0+1.2));r.p.setAttribute('x',(s.bx+uw).toFixed(1));r.p.setAttribute('width',(pw*v).toFixed(1));r.t.style.opacity=v})}};
/* 第 5 步：8 块数据依次经过缩减，相同的只剩一个指针，相似的只剩差异，其余压短 */
const K5=['u','u','d','s','u','d','s','u'];
SCENE.modes[4]={enter(S){S.v.b=K5.map((k,i)=>pk(i%2?'violet':'',L_().mobile?22:26,L_().mobile?30:34))},
 frame(t,S){const E=E_(),L=L_(),s=L.s5,per=11,u=t%per,fa=loopFade(u,per),M=L.mobile;let lw=0,pw=0,act=null;
  const bc=C(s.box),inA=M?[P(C(s.src).x,s.src.y+s.src.h),P(C(s.src).x,bc.y),bc]:[P(s.src.x+s.src.w,bc.y),bc],outA=M?[bc,P(C(s.dst).x,bc.y),P(C(s.dst).x,s.dst.y+s.dst.h)]:[bc,P(s.dst.x,bc.y)];
  K5.forEach((k,i)=>{const b=S.v.b[i],ts=0.5+i*1.1,src=E.s5in[i],dst=E.s5out[i];
   const sc=k==='u'?0.65:k==='s'?0.3:0.0;
   if(u<ts){put(b,src,fa);b.setAttribute('transform',`translate(${src.x} ${src.y})`);return}
   const a=[src].concat(inA),dur1=0.55;
   if(u<ts+dur1){put(b,H.along(a,sm((u-ts)/dur1)),fa);return}
   if(u<ts+dur1+0.35){put(b,bc,fa);act=k;const v=1-(1-Math.max(sc,0.12))*ramp(u,ts+dur1,ts+dur1+0.3);b.setAttribute('transform',`translate(${bc.x} ${bc.y}) scale(${v.toFixed(2)})`);lw+=1;return}
   lw+=1;
   if(k==='d'){if(u<ts+dur1+0.6){act=k;b.setAttribute('transform',`translate(${bc.x} ${bc.y}) scale(0.12)`);b.style.opacity=fa*(1-ramp(u,ts+dur1+0.35,ts+dur1+0.6))}else hide(b);return}
   const c=outA.concat([dst]),dur2=0.6;let q;if(u<ts+dur1+0.35+dur2){q=H.along(c,sm((u-ts-dur1-0.35)/dur2))}else q=dst;
   b.setAttribute('transform',`translate(${q.x.toFixed(1)} ${q.y.toFixed(1)}) scale(${sc})`);b.style.opacity=fa;pw+=sc});
  const N=K5.length;E.s5b[0].setAttribute('width',(s.bw*lw/N*fa).toFixed(1));E.s5b[1].setAttribute('width',(s.bw*pw/N*fa).toFixed(1));
  const AT={d:['相同的块：只记指针','st violet-t'],s:['相似的块：相似性压缩','st sage-t'],u:['其他的块：压缩','st slate-t']};
  if(act){settx(E.s5act,AT[act][0],AT[act][1]);E.s5act.style.opacity=fa}else E.s5act.style.opacity=0}};
/* 第 6 步 */
SCENE.modes[5]={frame(t){E_().s6.forEach((group,i)=>group.style.opacity=ramp(t,i*0.85,i*0.85+0.4))}};
return SCENE;
}

function lang(){return window.SS_LANG==='en'?'en':'zh'}
var NS='http://www.w3.org/2000/svg';
function asset(p){return window.SS&&window.SS.url?window.SS.url(p):(window.SS_ROOT||'')+p}
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
/* VAST 字标：引用 assets/brand 原件，浅色用黑字版、深色用白字版（CSS 切换）。(x,y) 为字标竖直中线上的锚点，h 为高度 */
function vmark(x,y,h,p,anchor){const w=h*66/14;if(anchor==='end')x-=w;else if(anchor==='middle')x-=w/2;
  const g=el('g',{class:'vwm'},p);
  el('image',{x:x.toFixed(1),y:(y-h/2).toFixed(1),width:w.toFixed(1),height:h,href:asset('assets/brand/vast-wordmark-black.svg'),class:'vwm-l','aria-label':'VAST'},g);
  el('image',{x:x.toFixed(1),y:(y-h/2).toFixed(1),width:w.toFixed(1),height:h,href:asset('assets/brand/vast-wordmark-white.svg'),class:'vwm-d','aria-hidden':'true'},g);
  return g}
/* 部件名 + VAST 字标排成一行：名字右端在 x（anchor end），字标紧跟其后；返回 {t,m} */
function vlabel(x,y,s,fs,cls,p,h,anchor){const t=tx(x,y,s,fs,cls,anchor||'start',p);let w=0;try{w=t.getComputedTextLength()}catch(e){}
  if(!w)w=estW(T(s),fs);const a=anchor||'start';const x1=a==='start'?x+w:a==='middle'?x+w/2:x;const m=vmark(x1+Math.round(fs*0.4),y,h||Math.round(fs*0.72),p,'start');return {t,m}}
function estW(s,fs){let w=0;for(const ch of s)w+=/[\u2e80-\uffff]/.test(ch)?fs:fs*0.56;return w}
const H={estW,el,tx,settx,grp,rect,line,C,P,clamp,sm,ramp,plen,along,rev,pk,dot,put,hide,run,loopFade,vmark,vlabel,T,alt:()=>tgl,E:()=>E,S:()=>S,L:()=>L};
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
