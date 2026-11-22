/* 闪存几何对齐：6 步动画（SVG，按时间写死的时间线，不依赖动画库）。按闪存的页和擦除块整块写、整块擦：页与擦除块、盘内回收与写放大、1 MB 写入、1 GB 条带、按寿命分组、全系统磨损均衡。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-flash'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-flash.css，全部限定在 .ssa-v-flash 容器之内。
   VAST 字标引用 assets/brand/vast-wordmark-black.svg 与 vast-wordmark-white.svg 原件（浅色、深色各一）。 */
(function(){
var ID='v-flash';
var EN={"擦除块 1":"Erase block 1","擦除块 2":"Erase block 2","擦除块 3":"Erase block 3","页：最小写入单位":"Page: smallest write unit","擦除块：最小擦除单位":"Smallest erase unit","写入空页":"Writing empty pages","改写：写到新的空页，旧页作废":"Overwrite: new page, old page stale","整块擦除":"Whole block erased","有效页":"Valid","作废页":"Stale","空页":"Empty","示意，不代表实测数字":"Schematic, not measured",
"把有效页搬到新块":"Copying valid pages to a new block","擦掉旧块":"Erasing old blocks","盘内多搬":"Moved inside drive","页":"pages","这些写入不来自用户":"None of these writes came from a user",
"迁移至容量层":"Migration to capacity tier","1 MB 写入覆盖多个整页":"1 MB write spans full pages","SSD":"SSD","芯片":"Chip","多颗芯片同时写":"Chips written in parallel","长短不一的块紧挨着装":"Chunks packed tightly",
"每盘 1 GB 条带段":"1 GB strip per drive","由 1 MB 写入组成":"Built from 1 MB writes","对齐一组擦除块":"Aligned with erase blocks","回收时释放整段":"Release the entire strip","整段对齐，减少盘内搬移":"Less internal copying","写入":"Writing",
"按写入顺序":"In write order","按预期寿命分组":"By expected life","临时文件":"Temporary","长期数据":"Long-lived","临时文件删除":"Temporary files deleted","回收时要搬的块":"Chunks to move when reclaiming","整条为空，直接回收":"Empty stripe, reclaimed directly",
"新条带":"New stripe","每块盘的磨损":"Wear per drive","新加入的盘":"New drive","空闲空间":"Free space","下限":"Low-water","低于下限才回收":"Reclaim only below the mark","条带放置考虑空间和耐久度":"Placement uses space and endurance",
"闪存几何对齐：页与擦除块、盘内回收、1 MB 写入、1 GB 条带、按寿命分组与全系统磨损均衡":"Flash-aligned writes: pages and erase blocks, garbage collection, 1 MB writes, 1 GB strips, life-based grouping and system-wide wear levelling"};
var ENM={"页：最小写入单位":"Page: write unit","改写：写到新的空页，旧页作废":"Overwrite: new page, old one stale","擦除块：最小擦除单位":"Block: erase unit","1 MB 写入覆盖多个整页":"1 MB spans full pages","这些写入不来自用户":"Not written by any user","长短不一的块紧挨着装":"Chunks packed tightly","对齐一组擦除块":"Erase-block aligned","整条为空，直接回收":"Empty: reclaimed","低于下限才回收":"Reclaim below the mark"};
var ARIA="闪存几何对齐：页与擦除块、盘内回收、1 MB 写入、1 GB 条带、按寿命分组与全系统磨损均衡";
function makeScene(H){
const {el,tx,settx,grp,rect,line,C,P,clamp,sm,ramp,pk,dot,put,hide,run,loopFade,vlabel}=H;
const L_=()=>H.L(),E_=()=>H.E();
/* 3 个擦除块 × 8 页的网格 */
function grid(g,o,cls){const rows=[];for(let r=0;r<3;r++){const row=[];for(let c=0;c<8;c++){const x=o.x+c*(o.pw+o.gx),y=o.y+r*(o.ph+o.gy);row.push({e:rect({x,y,w:o.pw,h:o.ph},'cel',g,4),x,y,c:P(x+o.pw/2,y+o.ph/2)})}
  rows.push({row,fr:rect({x:o.x-5,y:o.y+r*(o.ph+o.gy)-5,w:8*(o.pw+o.gx)-o.gx+10,h:o.ph+10},'box soft',g,6)})}
  rows.forEach(r=>{r.fr.parentNode.insertBefore(r.fr,r.row[0].e);r.fr.style.fill='none'});return rows}
function setp(p,c){p.e.setAttribute('class','cel'+(c?' '+c:''))}
const SCENE={
 still:[4,6,5,7,7,9],
 layout(m){
  if(!m)return {mobile:false,W:960,H:480,pw:22,ph:22,dr:6,f:{lbl:19,sm:17,note:16},
   g1:{x:200,y:90,pw:56,ph:50,gx:8,gy:40,lab:true},msg:P(456,372),
   s3:{scm:{x:40,y:110,w:440,h:180},sub:{x:60,y:190,w:380,h:44},ssd:{x:560,y:60,w:360,h:330}},
   s4:{ssd:{x:300,y:40,w:260,h:380},strip:{x:360,y:80,w:120,h:320},br:600},
   s5:{lanes:[120,320],x0:320,cw:19,gx:4,sg:22,lx:40},
   s6:{src:{x:40,y:190,w:110,h:56},bus:200,x0:240,dw:58,gx:16,y0:110,dh:200,gauge:{x:240,y:400,w:520}},
   note:P(40,456)};
  return {mobile:true,W:480,H:560,pw:18,ph:18,dr:5,f:{lbl:18,sm:17,note:17},
   g1:{x:44,y:110,pw:42,ph:44,gx:9,gy:56,lab:false},msg:P(240,440),
   s3:{scm:{x:16,y:40,w:448,h:150},sub:{x:40,y:100,w:400,h:40},ssd:{x:16,y:240,w:448,h:240}},
   s4:{ssd:{x:100,y:30,w:200,h:400},strip:{x:140,y:70,w:100,h:340},br:280},
   s5:{lanes:[110,330],x0:16,cw:14,gx:3,sg:10,lx:16,stack:true},
   s6:{src:{x:16,y:40,w:110,h:52},bus:130,x0:24,dw:40,gx:8,y0:170,dh:200,gauge:{x:16,y:470,w:448}},
   note:P(16,536)};
 },
 build(L,E){
  const f=L.f,M=L.mobile;
  /* 第 1、2 步：擦除块与页 */
  {const g=grp('1 2'),o=L.g1;E.g=grid(g,o);
   E.g.forEach((r,i)=>{const y=o.y+i*(o.ph+o.gy);if(o.lab)tx(o.x-20,y+o.ph/2,'擦除块 '+(i+1),f.sm,'ink2-t','end',g);else tx(o.x-5,y-18,'擦除块 '+(i+1),f.sm,'ink2-t','start',g)});
   const lg=grp('1');const p0=E.g[0].row[0];
   if(!M){el('path',{d:`M${p0.x} ${p0.y-12} V${p0.y-20} H${p0.x+o.pw} V${p0.y-12}`,class:'ln thin'},lg);tx(p0.x,p0.y-38,'页：最小写入单位',f.sm,'slate-t st','start',lg);
     const rx=o.x+8*(o.pw+o.gx)+8,ry=o.y+o.ph+o.gy-5;el('path',{d:`M${rx} ${ry} H${rx+10} V${ry+o.ph+10} H${rx}`,class:'ln thin'},lg);tx(rx+20,ry+o.ph/2+5,'擦除块：最小擦除单位',f.sm,'rose-t st','start',lg)}
   else{tx(o.x-5,o.y-56,'页：最小写入单位',f.sm,'slate-t st','start',lg);tx(L.W-16,o.y-56,'擦除块：最小擦除单位',f.sm,'rose-t st','end',lg)}
   E.msg=tx(L.msg.x,L.msg.y,'',f.sm,'st','middle',g);
   /* 图例 */
   const lgd=grp('1 2'),ly=M?L.msg.y+40:L.note.y,lx0=M?L.note.x:L.W-40;
   if(!M){let x=lx0;[['空页',''],['作废页','x'],['有效页','s']].forEach(([n,c])=>{const t=tx(x,ly,n,f.sm,'ink2-t','end',lgd);const w=H.estW(H.T(n),f.sm);el('rect',{x:x-w-26,y:ly-9,width:18,height:18,rx:3,class:'cel'+(c?' '+c:'')},lgd);x-=w+50})}
   E.c2=tx(M?L.W/2:L.W/2,M?L.msg.y+30:L.msg.y+30,'',f.sm,'num ink-t','middle',grp('2'));
   tx(L.note.x,L.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',g);}
  /* 第 3 步：迁移时组织 1 MB 写入，并行写多个芯片 */
  {const s=L.s3,g=grp('3');rect(s.scm,'box on',g,12);vlabel(s.scm.x+14,s.scm.y+22,'迁移至容量层',f.sm,'lbl b7',g,M?11:13);
   const sb=s.sub;
   tx(sb.x,sb.y-13,'长短不一的块紧挨着装',f.sm,'ink2-t','start',g);E.sub=rect(sb,'box',g,4);E.sub.style.fill='none';for(let i=1;i<4;i++)el('line',{x1:sb.x+i*sb.w/4,y1:sb.y,x2:sb.x+i*sb.w/4,y2:sb.y+sb.h,class:'sep'},g);
   tx(sb.x,sb.y+sb.h+22,'1 MB 写入覆盖多个整页',f.sm,'ink2-t','start',g);
   const W=[0.14,0.22,0.1,0.18,0.12,0.24];let x=sb.x;E.ch3=W.map((w,i)=>{const r={x,w:w*sb.w};x+=w*sb.w;return {r,e:el('rect',{x:r.x+1,y:sb.y+4,width:0,height:sb.h-8,rx:2,class:'fill '+['','violet','ochre','sage','','violet'][i]},g)}});
   rect(s.ssd,'box',g,14);tx(s.ssd.x+14,s.ssd.y+22,'SSD',f.sm,'lbl b7','start',g);
   E.chip=[];const cw=M?92:140,ch=M?66:100;const cx0=M?s.ssd.x+20:s.ssd.x+30,cy0=M?s.ssd.y+130:s.ssd.y+70;
   for(let i=0;i<4;i++){const r={x:M?cx0+i*(cw+14):cx0+(i%2)*(cw+20),y:M?cy0:cy0+Math.floor(i/2)*(ch+30),w:cw,h:ch};
    rect(r,'box soft',g,8);tx(r.x+8,r.y+14,H.T('芯片')+' '+(i+1),f.sm,'ink3-t','start',g);const pg={x:r.x+12,y:r.y+r.h-38,w:r.w-24,h:26};E.chip.push({r,pg:rect(pg,'cel',g,3),c:P(pg.x+pg.w/2,pg.y+pg.h/2)})}
   const hub=M?P(L.W/2,s.ssd.y+70):P(s.ssd.x+s.ssd.w/2,s.ssd.y+s.ssd.h-30);E.hub=hub;
   if(!M){line([P(sb.x+sb.w,C(sb).y),P(s.ssd.x+10,C(sb).y),P(s.ssd.x+10,hub.y),P(hub.x,hub.y)],'',g);
     E.chip.forEach(o=>line([hub,P(o.c.x,hub.y),P(o.c.x,o.r.y+o.r.h)],'thin',g));}
   else{const lx=sb.x+sb.w-30;line([P(lx,sb.y+sb.h),P(lx,hub.y)],'',g);line([P(E.chip[0].c.x,hub.y),P(Math.max(E.chip[3].c.x,sb.x+sb.w-30),hub.y)],'',g);E.chip.forEach(o=>line([P(o.c.x,hub.y),P(o.c.x,o.r.y)],'thin',g))}
   E.par3=tx(M?L.W-16:s.ssd.x+s.ssd.w-14,M?s.ssd.y+s.ssd.h+26:s.ssd.y+22,'多颗芯片同时写',f.sm,'st sage-t','end',g);
   tx(L.note.x,L.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',g);}
  /* 第 4 步：1 GB 条带 */
  {const s=L.s4,g=grp('4'),st=s.strip;rect(s.ssd,'box',g,14);tx(s.ssd.x+14,s.ssd.y+22,'每盘 1 GB 条带段',f.sm,'lbl b7','start',g);
   E.lay=[];const n=8,lh=st.h/n;for(let i=0;i<n;i++){const y=st.y+st.h-(i+1)*lh;E.lay.push(rect({x:st.x,y:y+2,w:st.w,h:lh-4},'cel',g,3))}
   if(M)tx(st.x+st.w/2,st.y+st.h+12,'由 1 MB 写入组成',f.sm,'ink3-t','middle',g);else tx(st.x+st.w+12,st.y+st.h-lh/2,'由 1 MB 写入组成',f.sm,'ink3-t','start',g);
   E.eb=[];for(let k=0;k<2;k++){const y=st.y+k*st.h/2;E.eb.push(el('path',{d:`M${s.br} ${y+4} H${s.br+12} V${y+st.h/2-4} H${s.br}`,class:'ln thin'},g))}
   tx(s.br+(M?18:24),st.y+st.h/2,'对齐一组擦除块',f.sm,'st rose-t','start',g);
   E.m4=tx(M?L.W/2:C(s.ssd).x,s.ssd.y+s.ssd.h+28,'',f.sm,'st','middle',g);
   E.c4=tx(M?L.W/2:830,M?s.ssd.y+s.ssd.h+58:C(s.ssd).y+40,'',f.lbl,'num ink-t','middle',g);
   tx(L.note.x,L.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',g);}
  /* 第 5 步：按写入顺序 vs 按寿命 */
  {const s=L.s5,g=grp('5');E.s5=[];
   const seqA=[];for(let i=0;i<24;i++)seqA.push(i%3===1?'o':'s');// 8 个临时（赭黄）、16 个长期
   const seqB=[];for(let i=0;i<24;i++)seqB.push(i<8?'o':'s');
   [['按写入顺序',seqA],['按预期寿命分组',seqB]].forEach(([nm,seq],k)=>{const y=s.lanes[k];
    if(s.stack){if(k)vlabel(s.lx,y-60,nm,f.lbl,'lbl b7',g,11);else tx(s.lx,y-60,nm,f.lbl,'lbl b7','start',g)}else{if(k)vlabel(s.lx,y,nm,f.lbl,'lbl b7',g,13);else tx(s.lx,y,nm,f.lbl,'lbl b7','start',g)}
    const cells=[],fr=[];for(let st=0;st<3;st++){const x0=s.x0+st*(8*(s.cw+s.gx)+s.sg);fr.push(rect({x:x0-4,y:y-20,w:8*(s.cw+s.gx)-s.gx+8,h:40},'box soft',g,6));
     for(let c=0;c<8;c++)cells.push(el('rect',{x:x0+c*(s.cw+s.gx),y:y-14,width:s.cw,height:28,rx:3,class:'cel'},g))}
    fr.forEach(r=>r.style.fill='none');
    const cn=tx(s.stack?L.W-16:s.x0+3*(8*(s.cw+s.gx)+s.sg)-s.sg,y+44,'',f.sm,'st','end',g);
    E.s5.push({seq,cells,fr,cn,y})});
   const lg=grp('5');[['临时文件','o'],['长期数据','s']].forEach(([n,c],i)=>{const x=(M?16:40)+i*(M?130:150),y=M?L.note.y-34:L.note.y-34;el('rect',{x,y:y-9,width:18,height:18,rx:3,class:'cel '+c},lg);tx(x+26,y,n,f.sm,'ink2-t','start',lg)});
   E.m5=tx(M?L.W-16:L.W-40,L.note.y,'',f.sm,'st','end',g);
   tx(L.note.x,L.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',g);}
  /* 第 6 步：全系统磨损均衡 */
  {const s=L.s6,g=grp('6');rect(s.src,'box',g);tx(C(s.src).x,C(s.src).y,'新条带',f.sm,'lbl b7','middle',g);
   tx(s.x0,s.y0-(M?40:34),'每块盘的磨损',f.sm,'ttl','start',g);
   E.d6=[];const busY=s.y0-(M?14:14);
   for(let i=0;i<9;i++){const r={x:s.x0+i*(s.dw+s.gx),y:s.y0,w:s.dw,h:s.dh};const gg=el('g',{},g);rect(r,'box',gg,8);el('rect',{x:r.x+r.w/2-8,y:r.y+12,width:16,height:r.h-24,rx:4,class:'track'},gg);
    const fl=el('rect',{x:r.x+r.w/2-8,y:r.y+r.h-12,width:16,height:0,rx:4,class:'fill'},gg);
    const path=!M?[P(s.src.x+s.src.w,C(s.src).y),P(s.bus,C(s.src).y),P(s.bus,busY),P(r.x+r.w/2,busY),P(r.x+r.w/2,r.y)]:[P(C(s.src).x,s.src.y+s.src.h),P(C(s.src).x,busY),P(r.x+r.w/2,busY),P(r.x+r.w/2,r.y)];
    E.d6.push({r,gg,fl,path,top:r.y+12,hh:r.h-24})}
   const lastX=E.d6[8].r.x+s.dw/2;
   if(!M){line([P(s.src.x+s.src.w,C(s.src).y),P(s.bus,C(s.src).y),P(s.bus,busY),P(lastX,busY)],'',g)}else line([P(C(s.src).x,s.src.y+s.src.h),P(C(s.src).x,busY),P(lastX,busY)],'',g);
   E.d6.forEach((o,i)=>{const dl=line([P(o.r.x+o.r.w/2,busY),P(o.r.x+o.r.w/2,o.r.y)],'thin',g);if(i===8)o.dl=dl});
   E.new6=tx(E.d6[8].r.x+s.dw,s.y0+s.dh+24,'新加入的盘',f.sm,'st sage-t','end',g);
   const ga=s.gauge;tx(ga.x,ga.y-24,'空闲空间',f.sm,'ink2-t','start',g);el('rect',{x:ga.x,y:ga.y-9,width:ga.w,height:18,rx:4,class:'track'},g);
   E.gf=el('rect',{x:ga.x,y:ga.y-9,width:ga.w,height:18,rx:4,class:'fill sage'},g);
   const lw=ga.x+ga.w*0.25;el('line',{x1:lw,y1:ga.y-16,x2:lw,y2:ga.y+16,class:'ln hot'},g);tx(lw+6,ga.y-24,'下限',f.sm,'rose-t','start',g);
   E.gm=tx(ga.x+ga.w,ga.y-24,'',f.sm,'st','end',g);
   E.pick=tx(M?L.W-16:C(s.src).x,M?s.src.y+s.src.h/2:s.src.y+s.src.h+24,'条带放置考虑空间和耐久度',f.sm,'st slate-t',M?'end':'middle',g);
   if(!M){E.pick.setAttribute('x',s.src.x);E.pick.setAttribute('text-anchor','start')}
   tx(L.note.x,L.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',g);}
 },
 modes:[]
};
const rowsOf=()=>E_().g;
function clearGrid(){rowsOf().forEach(r=>{r.fr.setAttribute('class','box soft');r.fr.style.fill='none';r.row.forEach(p=>setp(p,''))})}
/* 第 1 步：写空页 → 改写（新页、旧页作废）→ 擦除块 2 整块擦掉 */
SCENE.modes[0]={frame(t){const per=9,u=t%per,R=rowsOf();clearGrid();
  for(let c=0;c<8;c++)setp(R[1].row[c],'x');
  for(let c=0;c<6;c++)if(u>0.3+c*0.35)setp(R[0].row[c],'s');
  if(u>3.0){setp(R[0].row[6],'s');setp(R[0].row[2],'x')}
  if(u>3.8){setp(R[0].row[7],'s');setp(R[0].row[4],'x')}
  if(u>2.9&&u<3.1||u>3.7&&u<3.9){}
  const er=u>5.2&&u<6.0;if(er)R[1].fr.setAttribute('class','box hot');R[1].fr.style.fill='none';
  if(u>5.6)R[1].row.forEach(p=>setp(p,''));
  const E=E_();if(u<2.6)settx(E.msg,'写入空页','st slate-t');else if(u<5)settx(E.msg,'改写：写到新的空页，旧页作废','st ink2-t');else settx(E.msg,'整块擦除','st rose-t');E.msg.style.opacity=loopFade(u,per)}};
/* 第 2 步：块 1、2 混着有效页和作废页；有效页复制成分身搬到块 3，旧块整块擦除 */
const V2=[[0,1],[0,3],[0,6],[1,0],[1,4],[1,5],[1,7]];
SCENE.modes[1]={enter(S){S.v.c=V2.map(()=>pk('cp',L_().g1.pw-10,L_().g1.ph-10))},
 frame(t,S){const E=E_(),L=L_(),o=L.g1,per=10,u=t%per,fa=loopFade(u,per),R=rowsOf();clearGrid();
  const stale=(r,c)=>!V2.some(v=>v[0]===r&&v[1]===c);
  for(let r=0;r<2;r++)for(let c=0;c<8;c++)setp(R[r].row[c],stale(r,c)?'x':'s');
  let moved=0;const rx=o.x+8*(o.pw+o.gx)+(L.mobile?-2:14);
  V2.forEach(([r,c],i)=>{const src=R[r].row[c],dst=R[2].row[i],ts=0.8+i*0.55;const gy=src.y+o.ph+o.gy/2,gy3=dst.y-o.gy/2;
   const path=[src.c,P(src.c.x,gy),P(rx,gy),P(rx,gy3),P(dst.c.x,gy3),dst.c];
   const q=run(S.v.c[i],path,u,ts,0.9,{post:0});if(q>=0&&q<=1)S.v.c[i].style.opacity=fa;if(q>1){moved++;setp(dst,'s')}});
  const er=u>5.3&&u<6.1;[0,1].forEach(r=>{if(er){R[r].fr.setAttribute('class','box hot');R[r].fr.style.fill='none'}if(u>5.7)R[r].row.forEach(p=>setp(p,''))});
  if(u<5.2)settx(E.msg,'把有效页搬到新块','st slate-t');else settx(E.msg,'擦掉旧块','st rose-t');E.msg.style.opacity=fa;
  E.c2.textContent=H.T('盘内多搬')+' '+moved+' '+H.T('页')+(u>6.3?' · '+H.T('这些写入不来自用户'):'');E.c2.style.opacity=fa}};
/* 第 3 步：块紧挨着装满 1 MB，然后由 SSD 并行写入多颗芯片 */
SCENE.modes[2]={enter(S){S.v.p=[0,1,2,3].map(()=>pk('',L_().mobile?60:80,L_().mobile?16:18))},
 frame(t,S){const E=E_(),L=L_(),s=L.s3,sb=s.sub,M=L.mobile,per=8,u=t%per,fa=loopFade(u,per);
  E.ch3.forEach((c,i)=>{const v=sm(ramp(u,0.3+i*0.35,0.6+i*0.35));c.e.setAttribute('width',Math.max(0,(c.r.w-2)*v).toFixed(1));c.e.style.opacity=u>3.2?fa*(1-ramp(u,3.2,3.5)):fa});
  E.sub.setAttribute('class','box '+(u>2.5&&u<3.4?'ok':''));E.sub.style.fill='none';
  S.v.p.forEach((p,i)=>{const o=E.chip[i];const path=!M?[P(sb.x+sb.w,C(sb).y),P(s.ssd.x+10,C(sb).y),P(s.ssd.x+10,E.hub.y),E.hub,P(o.c.x,E.hub.y),P(o.c.x,o.r.y+o.r.h),o.c]:[P(sb.x+sb.w-30,sb.y+sb.h),P(sb.x+sb.w-30,E.hub.y),P(o.c.x,E.hub.y),o.c];
   const q=run(p,path,u,3.4,1.6,{post:0});if(q>=0&&q<=1)p.style.opacity=fa;o.pg.setAttribute('class','cel'+(q>1?' s':''));});
  E.par3.style.opacity=u>5.0?fa:0}};
/* 第 4 步：1 MB 一层层叠满 1 GB；回收时整条一起删 */
SCENE.modes[3]={frame(t){const E=E_(),per=9,u=t%per,fa=loopFade(u,per);
  E.lay.forEach((r,i)=>{const on=u>0.3+i*0.4&&!(u>5.8);r.setAttribute('class','cel'+(on?' s':''))});
  E.eb.forEach(p=>p.setAttribute('class','ln '+(u>5.2&&u<6.4?'hot thick':'thin')));
  if(u<3.6)settx(E.m4,'写入','st slate-t');else if(u<5.2)settx(E.m4,'','st');else settx(E.m4,'回收时释放整段','st rose-t');E.m4.style.opacity=fa;
  E.c4.textContent=u>6?H.T('整段对齐，减少盘内搬移'):'';E.c4.style.opacity=fa}};
/* 第 5 步：写满三条 → 临时文件删除 → 回收：上路要搬、下路整条为空 */
SCENE.modes[4]={frame(t){const E=E_(),per=10,u=t%per,fa=loopFade(u,per);const del=u>4.0;
  E.s5.forEach((o,k)=>{o.cells.forEach((c,i)=>{const w=u>0.2+i*0.13;const kind=o.seq[i];c.setAttribute('class','cel'+(w&&!(del&&kind==='o')?' '+kind:''));c.style.opacity=fa});
   const gc=u>5.4;o.fr.forEach((f,j)=>{let cls='box soft';if(gc){if(k===0)cls='box hot';else if(j===0)cls='box ok'}f.setAttribute('class',cls);f.style.fill='none'});
   const n=k===0?Math.round(16*sm(ramp(u,5.6,7))):0;o.cn.textContent=gc?H.T('回收时要搬的块')+' '+n:'';o.cn.setAttribute('class','st '+(k?'sage-t':'rose-t'));o.cn.style.opacity=fa});
  if(u>4&&u<5.4)settx(E.m5,'临时文件删除','st ochre-t');else if(u>=5.4)settx(E.m5,'整条为空，直接回收','st sage-t');else settx(E.m5,'');E.m5.style.opacity=fa}};
/* 第 6 步：示意优先使用磨损较少且空间较多的盘；新盘加入后先多分到条带；空闲空间低于下限才回收 */
SCENE.modes[5]={enter(S){S.v.p=[];for(let i=0;i<22;i++)S.v.p.push(pk('',L_().mobile?16:20,L_().mobile?14:16))},
 frame(t,S){const E=E_(),L=L_(),per=14,u=t%per,fa=loopFade(u,per);
  const wear=[3.2,2.8,3.1,2.9,3.0,3.3,2.7,3.0,0];
  const used=[3,2,3,1,4,3,1,2,0];
  const newOn=u>3.5;E.d6[8].gg.style.opacity=newOn?fa*ramp(u,3.5,4):0;if(E.d6[8].dl)E.d6[8].dl.style.opacity=newOn?fa:0;E.new6.style.opacity=newOn?fa:0;
  let free=1;S.v.p.forEach((p,j)=>{const ts=0.6+j*0.55;let k=-1;for(let q=0;q<9;q++){if(q===8&&ts<4.2)continue;if(k<0||wear[q]+used[q]<wear[k]+used[k])k=q}
   const o=E.d6[k];const r=run(p,o.path,u,ts,0.7,{post:0});if(r>=0&&r<=1)p.style.opacity=fa;if(r>1){wear[k]+=0.5;used[k]+=1;free-=0.045}});
  /* 空闲空间：降到下限就回收一次 */
  let fr=free;let gc=false;if(fr<0.25){gc=true;fr=fr+0.45}
  E.gf.setAttribute('width',(L.s6.gauge.w*clamp(fr,0,1)).toFixed(1));E.gf.setAttribute('class','fill '+(fr<0.35?'ochre':'sage'));
  settx(E.gm,gc?'低于下限才回收':'','st rose-t');E.gm.style.opacity=fa;
  E.d6.forEach((o,i)=>{const h=o.hh*Math.min(1,wear[i]/8)*fa;o.fl.setAttribute('y',(o.top+o.hh-h).toFixed(1));o.fl.setAttribute('height',h.toFixed(1))})}};
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
