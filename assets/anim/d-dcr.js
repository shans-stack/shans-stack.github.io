/* 分簇 RAID：六步动画（SVG 加小仿真，不依赖动画库）。接口同 assets/anim/rdma.js：
     var a = SSAnim['d-dcr'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) / a.pause() / a.resume() / a.destroy() / a.ratio() / a.step()
   步骤状态归页面管：动画自己不带翻页控件和步骤说明。
   宽度 640px 以下换成手机版式；系统开了「减少动态效果」时每步只画一帧静态结果。
   文字有中英两套，跟着页面的 ss-lang 事件重画。样式在 assets/anim/d-dcr.css，只作用于 .ddcr 容器之内。
   画面里的盘数、条带宽度、速度都是示意。 */
(function(){
var EN={
  "A 组":"Group A","B 组":"Group B","热备盘":"Hot spares","= 备用空间":"= spare","字母 = 条带":"Letter = stripe",
  "快速重建额度":"Rebuild allowance","重建进度":"Rebuild","回拷进度":"Copyback",
  "传统 RAID":"Traditional RAID","分簇 RAID":"Declustered RAID","备":"Spare","已重建":"Rebuilt",
  "示意，不代表实测数字":"Schematic, not measured",
  "传统：全部写进同一块热备盘 · 分簇：分给很多块盘":"Traditional: every write goes to one spare · Declustered: spread over many drives",
  "闲着":"Idle","存数据":"Data","坏了":"Failed","新盘":"New","不参与":"Not used","做完了":"Done","等待":"Waiting",
  "很高":"Very high","升高":"Rising","较低":"Low",
  "冗余已恢复":"Restored","回拷完成":"Done","回拷中":"Copying back","重建中":"Rebuilding",
  "校验重建":"Parity rebuild","* = 校验":"* = parity",
  "坏盘上每一段属于不同条带，各找一块盘的备用格":"Each lost piece goes to a spare cell on another drive",
  "回拷比重建慢，但冗余已经恢复，不急":"Copyback is slower, but redundancy is already back",
  "传统 RAID 与分簇 RAID 坏盘重建：一块热备盘承担全部写入，与很多块盘一起重建":"Rebuilding a failed drive in traditional and declustered RAID: one hot spare takes every write, versus many drives sharing the work"
};
function lang(){return window.SS_LANG==='en'?'en':'zh'}
function T(s){return lang()==='en'&&EN[s]!==undefined?EN[s]:s}
function Lz(zh,en){return lang()==='en'?en:zh}
/* 估算文字宽度（SVG 单位）：中文按 1 个字号宽，其余按 0.56 个 */
function tw(s,size){let w=0;for(const ch of String(s))w+=/[⺀-￿]/.test(ch)?1:0.56;return w*size}

const ND=10,NR=6,FAIL=1,SPARE=8,LET='ABCDEFGHIJ';
/* 条带布局（固定种子，满足：一个条带的成员在不同盘上） */
function rng(seed){let s=seed;return()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff}}
function makeStripes(){
  const R=rng(7),cap=Array(ND).fill(NR-1),cells=Array.from({length:ND},()=>[]);
  for(let s=0;s<10;s++){const ds=[...Array(ND).keys()].sort((a,b)=>cap[b]-cap[a]||R()-0.5).slice(0,5);ds.forEach(d=>{cap[d]--;cells[d].push(s)})}
  cells.forEach(c=>c.sort(()=>R()-0.5));
  return cells; // cells[d][r] = 条带号（r=0..4），第 5 行是备用
}
const CELLS=makeStripes();

function mount(host,opts){
opts=opts||{};
const NS='http://www.w3.org/2000/svg';
host.classList.add('ddcr');host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','ddcr-scene');svg.setAttribute('role','img');host.appendChild(svg);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mq=matchMedia('(max-width: 640px)');
let L,E,S,step=0;

/* ---------- 版式 ---------- */
function layout(m){
  if(!m){
    const W=960,H=476,pitch=90,dw=64,x0=(W-(9*pitch+dw))/2;
    return {m,W,H,f:{lbl:20,sm:17,note:16,cell:16,big:34},
      dx:i=>x0+i*pitch+dw/2,dw,dtop:96,dbot:316,row:r=>122+r*34,cw:44,ch:26,stubY:352,
      bar:{y:398,w:52,h:10},stY:422,sum:{x:W-x0,y:452,a:'end'},grpY:74,leg:{x:x0,y:34},quota:{x:W-x0,y:34},
      prog:{lx:x0,x:x0+96,y:452,w:300,sx:x0+410},pw:30,ph:22,
      race:{T:{ly:66,top:92,h:62,bp:192},R:{ly:262,top:288,h:62,bp:388},note:{y:452},cnt:W-x0,pw:18,ph:14},
      sp:{t:300,d:300,c:170,race:430}};
  }
  const W=480,H=420,pitch=46,dw=38,x0=(W-(9*pitch+dw))/2;
  return {m,W,H,f:{lbl:18,sm:17,note:17,cell:17,big:28},
    dx:i=>x0+i*pitch+dw/2,dw,dtop:92,dbot:272,row:r=>110+r*28,cw:30,ch:22,stubY:300,
    bar:{y:320,w:32,h:8},stY:null,sum:{x:x0,y:350,a:'start'},grpY:72,leg:{x:x0,y:30},quota:{x:W-x0,y:30},
    prog:{lx:x0,x:x0+96,y:388,w:198,sx:x0+306},pw:24,ph:18,
    race:{T:{ly:62,top:84,h:52,bp:170},R:{ly:226,top:248,h:52,bp:334},note:{y:390},cnt:W-x0,pw:16,ph:12},
    sp:{t:260,d:260,c:150,race:380}};
}

/* ---------- 画布 ---------- */
function el(tag,a,p){const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);(p||svg).appendChild(e);return e}
function tx(x,y,s,size,cls,anchor,p){const t=el('text',{x,y,'font-size':size,class:cls||''},p);if(anchor)t.setAttribute('text-anchor',anchor);t.textContent=T(s);return t}
function grp(show,p){const g=el('g',{class:'vis'},p);if(show)g.dataset.show=show;return g}
const ln=(x1,y1,x2,y2,cls,p)=>el('line',{x1,y1,x2,y2,class:'ln '+cls},p);

function build(){
  svg.innerHTML='';E={};
  svg.setAttribute('viewBox',`0 0 ${L.W} ${L.H}`);
  svg.setAttribute('aria-label',T('传统 RAID 与分簇 RAID 坏盘重建：一块热备盘承担全部写入，与很多块盘一起重建'));
  const f=L.f;
  /* 场景 1-4、6：一排盘 */
  const host2=grp('1 2 3 4 6');
  E.bp=ln(L.dx(0),L.stubY,L.dx(ND-1),L.stubY,'base',host2);
  E.disk=[];E.cell=[];E.stub=[];E.bar=[];E.st=[];E.xm=[];
  for(let d=0;d<ND;d++){
    const x=L.dx(d);
    E.stub[d]=ln(x,L.dbot,x,L.stubY,'base',host2);
    E.disk[d]=el('rect',{x:x-L.dw/2,y:L.dtop,width:L.dw,height:L.dbot-L.dtop,rx:8,class:'disk'},host2);
    E.cell[d]=[];
    for(let r=0;r<NR;r++){const y=L.row(r);
      const c=el('rect',{x:x-L.cw/2,y:y-L.ch/2,width:L.cw,height:L.ch,rx:4,class:'cell'},host2);
      const t=tx(x,y+1,'',f.cell,'ct','middle',host2);E.cell[d][r]={c,t}}
    const xg=el('g',{},host2);const k=L.dw*0.34,cy=(L.dtop+L.dbot)/2;
    ln(x-k,cy-k,x+k,cy+k,'xm',xg);ln(x-k,cy+k,x+k,cy-k,'xm',xg);E.xm[d]=xg;
    el('rect',{x:x-L.bar.w/2,y:L.bar.y-L.bar.h/2,width:L.bar.w,height:L.bar.h,rx:3,class:'track'},host2);
    E.bar[d]=el('rect',{x:x-L.bar.w/2,y:L.bar.y-L.bar.h/2,width:0,height:L.bar.h,rx:3,class:'fill'},host2);
    if(L.stY)E.st[d]=tx(x,L.stY,'',f.note,'st','middle',host2);
  }
  // 组标签（1、2 步）
  const gl=grp('1 2',host2);
  const span=(a,b,s,cls)=>{const x1=L.dx(a)-L.dw/2,x2=L.dx(b)+L.dw/2;ln(x1,L.grpY+12,x2,L.grpY+12,'base q1',gl);tx((x1+x2)/2,L.grpY-4,s,f.lbl,cls,'middle',gl)};
  span(0,3,'A 组','slate-t b7');span(4,7,'B 组','violet-t b7');span(8,9,L.m&&lang()==='en'?'':'热备盘','ink2-t b7');
  if(L.m&&lang()==='en')tx((L.dx(8)+L.dx(9))/2,L.grpY-4,'Spares',f.lbl,'ink2-t b7','middle',gl);
  // 图例（3、4、6 步）
  const lg=grp('3 4 6',host2);
  {const p=L.leg,x1=p.x+L.cw*0.8+8;el('rect',{x:p.x,y:p.y-L.ch/2+2,width:L.cw*0.8,height:L.ch-4,rx:3,class:'cell s'},lg);
   tx(x1,p.y,'= 备用空间',f.note,'ink2-t','start',lg);
   tx(x1+Math.max(L.m?92:100,tw(T('= 备用空间'),f.note)+14),p.y,'字母 = 条带',f.note,'ink2-t','start',lg)}
  E.hlT=tx(L.W/2,L.grpY,'',f.sm,'ochre-t st','middle',grp('3',host2));
  tx(L.W-L.leg.x,L.leg.y,'* = 校验',f.note,'ink2-t','end',grp('3 4',host2));
  E.top4=tx(L.W/2,L.grpY,'',f.sm,'st','middle',grp('4 6',host2));
  const compute=grp('2 4',host2),cx=L.W/2,cy=L.stubY;
  el('rect',{x:cx-76,y:cy-15,width:152,height:30,rx:5,class:'disk'},compute);
  tx(cx,cy,'校验重建',f.note,'ink2-t b7','middle',compute);
  // 额度（6 步）
  const qg=grp('6',host2);E.quota=[];
  {const p=L.quota,s=L.m?14:16;for(let i=0;i<2;i++)E.quota[i]=el('rect',{x:p.x-(2-i)*(s+6)+6,y:p.y-s/2,width:s,height:s,rx:3,class:'quota free'},qg);
   tx(p.x-2*(s+6)-4,p.y,L.m&&lang()==='en'?'Allowance':'快速重建额度',f.note,'ink2-t','end',qg)}
  // 汇总与进度
  E.sum=tx(L.sum.x,L.sum.y,'',f.sm,'st',L.sum.a,grp('2 4 6',host2));
  const pg=grp('2 4 6',host2),P=L.prog;
  E.pl=tx(P.lx,P.y,'重建进度',f.sm,'ink2-t b7','start',pg);
  el('rect',{x:P.x,y:P.y-7,width:P.w,height:14,rx:4,class:'track'},pg);
  E.pf=el('rect',{x:P.x,y:P.y-7,width:0,height:14,rx:4,class:'fill'},pg);
  E.ps=tx(P.sx,P.y,'',f.sm,'st','start',pg);

  /* 场景 5：上下两行同时跑 */
  const race=grp('5');E.race={};
  [['T','传统 RAID','rose-t'],['R','分簇 RAID','sage-t']].forEach(([k,name,cls])=>{
    const ly=L.race[k],nx=L.dx(0)-L.dw/2;
    tx(nx,ly.ly,name,f.lbl,'lbl b7','start',race);
    ln(L.dx(0),ly.bp,L.dx(ND-1),ly.bp,'base',race);
    E.race['d'+k]=[];
    for(let d=0;d<ND;d++){const x=L.dx(d);ln(x,ly.top+ly.h,x,ly.bp,'base',race);
      const r=el('rect',{x:x-L.dw/2,y:ly.top,width:L.dw,height:ly.h,rx:8,class:'disk'+(d===FAIL?' fail':'')},race);E.race['d'+k][d]=r;
      if(d===FAIL){const kk=L.dw*0.3,cy=ly.top+ly.h/2;ln(x-kk,cy-kk,x+kk,cy+kk,'xm',race);ln(x-kk,cy+kk,x+kk,cy-kk,'xm',race)}
      if(k==='T'&&d===SPARE)tx(x,ly.top+(L.m?10:12),'备',f.note,'ink2-t b7','middle',race)}   // 「备」放到盘顶，写进来的块落在盘中间
    const cx=L.race.cnt;
    tx(cx-(L.m?44:56),ly.ly,'已重建',f.note,'ink3-t','end',race);
    E.race['n'+k]=tx(cx,ly.ly,'0',f.big,'num '+cls,'end',race);
  });
  tx(L.dx(0)-L.dw/2,L.race.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',race);
  if(!L.m)tx(L.dx(ND-1)+L.dw/2,L.race.note.y,'传统：全部写进同一块热备盘 · 分簇：分给很多块盘',f.note,'ink3-t','end',race);
  E.pk=el('g',{});
}

/* ---------- 仿真：块沿路线走，可在「站」排队 ---------- */
function newSim(){S={t:0,ct:0,cyc:-1,pk:[],st:{},lv:Array(ND).fill(0),tg:Array(ND).fill(0),role:Array(ND).fill(''),prog:0,pv:0,cnt:{T:0,R:0},hl:-1,quota:[1,1]}}
const P=(x,y,st)=>({x,y,st});
function station(id,p,dir,svc){S.st[id]={id,p,dir,svc,cur:null,left:0,q:[]}}
function spawn(route,speed,o){o=o||{};
  const g=el('g',{},E.pk),pw=o.pw||L.pw,ph=o.ph||L.ph;
  const r=el('rect',{x:-pw/2,y:-ph/2,width:pw,height:ph,rx:4,class:'pkt'+(o.cls?' '+o.cls:'')},g);
  if(o.letter)tx(0,1,o.letter,L.f.cell,'ct','middle',g);
  const p={g,r,pts:route,i:1,x:route[0].x,y:route[0].y,mode:'move',speed,a:o.fadeIn?0:1,done:o.done,onSt:o.onSt,gap:o.gap||(L.ph+8)};
  S.pk.push(p);return p}
function load(id){const s=S.st[id];return S.pk.filter(p=>p.mode==='move'&&p.pts.slice(p.i).some(q=>q.st===id)).length+s.q.length+(s.cur?1:0)}
function toward(p,x,y,d){const dx=x-p.x,dy=y-p.y,dist=Math.hypot(dx,dy);if(dist<=d){p.x=x;p.y=y;return true}p.x+=dx/dist*d;p.y+=dy/dist*d;return false}
function stepPk(dt){
  for(const id in S.st){const s=S.st[id];
    if(s.cur){s.left-=dt;if(s.left<=0){const p=s.cur;p.mode='move';p.i++;s.cur=null}}
    if(!s.cur&&s.q.length){const p=s.q.shift();s.cur=p;p.mode='svc';s.left=s.svc}}
  for(const p of S.pk){
    const d=p.speed*dt;
    if(p.a<1&&p.mode!=='done')p.a=Math.min(1,p.a+dt/0.25);
    if(p.mode==='move'){
      const tg=p.pts[p.i];
      if(!tg){p.mode='done';p.t0=S.t;p.done&&p.done(p);continue}
      if(tg.st){const s=S.st[tg.st],pv=p.pts[p.i-1],dl=Math.hypot(tg.x-pv.x,tg.y-pv.y)||1;p.qd=[(tg.x-pv.x)/dl,(tg.y-pv.y)/dl];
        if(s.cur||s.q.length){const k=s.q.length+1,sx=s.p.x-p.qd[0]*k*p.gap,sy=s.p.y-p.qd[1]*k*p.gap;
        if((p.x-sx)*p.qd[0]+(p.y-sy)*p.qd[1]>=-d){p.x=sx;p.y=sy;s.q.push(p);p.mode='q';p.sid=s.id;p.onSt&&p.onSt(p);continue}}}
      if(toward(p,tg.x,tg.y,d)){
        if(tg.st){const s=S.st[tg.st];p.sid=s.id;p.onSt&&p.onSt(p);if(!s.cur&&!s.q.length){s.cur=p;p.mode='svc';s.left=s.svc}else{s.q.push(p);p.mode='q'}}
        else p.i++;
      }
    }else if(p.mode==='q'){const s=S.st[p.sid],k=s.q.filter(o=>o.qd[0]===p.qd[0]).indexOf(p)+1;toward(p,s.p.x-p.qd[0]*k*p.gap,s.p.y-p.qd[1]*k*p.gap,d)}
    else if(p.mode==='svc'){const s=S.st[p.sid];toward(p,s.p.x,s.p.y,d)}
    else if(p.mode==='done'){if(p.keep)continue;const age=S.t-p.t0;p.a=Math.max(0,1-age/0.3);if(p.a<=0){p.g.remove();p.dead=true}}
  }
  S.pk=S.pk.filter(p=>!p.dead);
}
/* 盘内某格 → 盘底 → 背板 → 另一块盘 → 某格 */
function route(d1,y1,d2,y2,stId,lane){
  const bot=lane?lane.top+lane.h:L.dbot,bp=lane?lane.bp:L.stubY,x1=L.dx(d1),x2=L.dx(d2);
  return [P(x1,y1),P(x1,bot),P(x1,bp),P(x2,bp,stId),P(x2,bot),P(x2,y2)]}

/* ---------- 盘面状态 ---------- */
function setCell(d,r,cls,letter){const c=E.cell[d][r];c.c.setAttribute('class','cell '+cls);c.t.textContent=letter||''}
function paintTrad(){for(let d=0;d<ND;d++)for(let r=0;r<NR;r++)setCell(d,r,d<4?'a':d<8?'b':'s')}
const members=s=>CELLS.flatMap((rows,d)=>rows.includes(s)?[d]:[]);
const parityDrive=s=>members(s)[s%5];
const piece=(s,d)=>LET[s]+(d===parityDrive(s)?'*':'');
function paintDcr(){for(let d=0;d<ND;d++){for(let r=0;r<NR-1;r++)setCell(d,r,'d',piece(S.cells[d][r],d));setCell(d,NR-1,'s')}}
function failDisk(d){for(let r=0;r<NR;r++)setCell(d,r,'dead');S.failed=d}
function rebuildPieces(sources,target,row,stationId,speed,done){
  const cy=L.stubY,cx=L.W/2,tx=L.dx(target);
  let remaining=sources.length;
  for(const [drive,r] of sources){
    const x=L.dx(drive),input=cx+(x<cx?-76:76);
    const path=[P(x,L.row(r)),P(x,L.dbot)];
    if(Math.abs(x-cx)<76)path.push(P(x,cy-15));
    else path.push(P(x,cy),P(input,cy));
    spawn(path,speed,{fadeIn:true,pw:L.pw*.7,ph:L.ph*.7,done:p=>{
      p.g.remove();p.dead=true;
      if(--remaining) return;
      const out=cx+(tx<cx?-76:76);
      const write=Math.abs(tx-cx)<76?[P(tx,cy-15)]:[P(out,cy),P(tx,cy,stationId)];
      write.push(P(tx,L.dbot),P(tx,L.row(row)));
      spawn(write,speed,{fadeIn:true,done:packet=>{
        packet.g.remove();packet.dead=true;done();S.prog++;
      }});
    }});
  }
}
/* 坏盘上每一段：找来源盘（该条带的其他成员）和目标盘（没有该条带、有空备用格） */
function planDcr(){
  const used=new Set(),out=[];
  for(let r=0;r<NR-1;r++){const s=S.cells[FAIL][r];
    const stripe=members(s);
    const srcs=stripe.filter(d=>d!==FAIL).map(d=>[d,S.cells[d].indexOf(s)]);
    const tgs=[...Array(ND).keys()].filter(d=>!stripe.includes(d)&&!used.has(d));
    const tg=tgs[(r*3)%tgs.length];used.add(tg);
    out.push({r,s,srcs,tg})}
  return out}

/* ---------- 每一步 ---------- */
const MODES=[
  /* 1 传统 RAID */
  {P:0,setup(){paintTrad();for(let d=0;d<ND;d++)S.role[d]=d>=SPARE?'idle':'data'}},
  /* 2 传统重建：一块热备盘承担全部写入 */
  {P:11,setup(){paintTrad();failDisk(FAIL);for(let r=0;r<NR;r++)setCell(SPARE,r,'s');
     const x=L.dx(SPARE);station('spare',P(x,L.stubY),[1,0],0.65);S.total=NR;S.next=0;
     for(let d=0;d<ND;d++)S.role[d]=d===FAIL?'fail':(d<4||d===SPARE)?'part':'no'},
   tick(){if(S.next<NR&&S.ct>0.5+S.next*0.61){const r=S.next++;
       rebuildPieces([[0,r],[2,r],[3,r]],SPARE,r,'spare',L.sp.t,()=>setCell(SPARE,r,'a'))}
     const qn=load('spare'),fly=d=>S.pk.some(p=>p.mode!=='done'&&p.pts[0].x===L.dx(d));S.tg=S.tg.map((v,d)=>d===SPARE?(qn>0?0.92:0):([0,2,3].includes(d)&&fly(d)?0.3:0))}},
  /* 3 分簇布局：依次高亮一个条带 */
  {P:0,setup(){paintDcr();for(let d=0;d<ND;d++)S.role[d]='data'},
   tick(){const k=Math.floor(S.ct/2.2)%4,s=[0,3,6,8][k];if(s!==S.hl){S.hl=s;
     for(let d=0;d<ND;d++)for(let r=0;r<NR-1;r++){const on=S.cells[d][r]===s;E.cell[d][r].c.setAttribute('class','cell d'+(on?' hl':' fade'))}
     E.hlT.textContent=Lz('条带 '+LET[s]+' · RAID 5（4+1）示意','Stripe '+LET[s]+' · RAID 5 (4+1) example')}}},
  /* 4 分簇重建：很多盘一起 */
  {P:9,setup(){paintDcr();failDisk(FAIL);S.plan=planDcr();S.total=S.plan.length;
     for(let d=0;d<ND;d++)S.role[d]=d===FAIL?'fail':'no';
     S.plan.forEach(u=>{u.srcs.forEach(([drive])=>S.role[drive]='part');S.role[u.tg]='part';const x=L.dx(u.tg);station('t'+u.tg,P(x,L.stubY),[1,0],0.65)});
     S.next=0},
   tick(){
     while(S.next<S.plan.length&&S.ct>0.6+S.next*0.38){const u=S.plan[S.next++],mark=piece(u.s,FAIL);
       rebuildPieces(u.srcs,u.tg,NR-1,'t'+u.tg,L.sp.d,()=>setCell(u.tg,NR-1,'d',mark))}
     const busy=d=>S.pk.some(p=>p.mode!=='done'&&p.pts&&(p.pts[0].x===L.dx(d)||p.pts[p.pts.length-1].x===L.dx(d)));
     S.tg=S.tg.map((v,d)=>S.role[d]==='part'&&busy(d)?0.22:0)}},
  /* 5 同时跑 */
  {P:9,setup(){const T2=L.race.T,R=L.race.R;
     station('rT',P(L.dx(SPARE),T2.bp),[1,0],0.42);
     for(let d=0;d<ND;d++)if(d!==FAIL)station('r'+d,P(L.dx(d),R.bp),[1,0],0.42);
     S.k=0},
   tick(dt){if(S.ct<7.3){S.sp=(S.sp||0)-dt;if(S.sp<=0){S.sp+=0.13;const T2=L.race.T,R=L.race.R,k=S.k++;
       const o={pw:L.race.pw,ph:L.race.ph,gap:L.race.pw+6};
       if(load('rT')<5){const src=[0,2,3][k%3];spawn(route(src,T2.top+T2.h/2,SPARE,T2.top+T2.h/2,'rT',T2),L.sp.race,Object.assign({done:p=>S.cnt.T++},o))}
       const others=[0,2,3,4,5,6,7,8,9],src=others[(k*7)%9];let tg=others[(k*3+4)%9];if(tg===src)tg=others[(k*3+5)%9];
       if(load('r'+tg)<3)spawn(route(src,R.top+R.h/2,tg,R.top+R.h/2,'r'+tg,R),L.sp.race,Object.assign({done:p=>S.cnt.R++},o))}}}},
  /* 6 换新盘、回拷 */
  {P:13,setup(){paintDcr();S.plan=planDcr();for(let r=0;r<NR;r++)setCell(FAIL,r,'s');
     S.plan.forEach(u=>setCell(u.tg,NR-1,'d',piece(u.s,FAIL)));S.newDisk=true;S.quota=[1,0];S.total=S.plan.length;
     for(let d=0;d<ND;d++)S.role[d]='no';S.plan.forEach(u=>S.role[u.tg]='part');S.role[FAIL]='part';
     station('nd',P(L.dx(FAIL),L.stubY),[-1,0],1.4);S.next=0},
   tick(){
     while(S.next<S.plan.length&&S.ct>1.0+S.next*0.25){const u=S.plan[S.next++];
       spawn(route(u.tg,L.row(NR-1),FAIL,L.row(u.r),'nd'),L.sp.c,{fadeIn:true,letter:piece(u.s,FAIL),done:p=>{p.g.remove();p.dead=true;setCell(FAIL,u.r,'d',piece(u.s,FAIL));setCell(u.tg,NR-1,'s');S.prog++;
         if(S.prog>=S.total)S.quota=[1,1]}})}
     const qn=load('nd');S.tg=S.tg.map((v,d)=>d===FAIL?(qn>0?0.6:0):(S.role[d]==='part'&&S.pk.some(p=>p.mode!=='done'&&p.pts[0].x===L.dx(d))?0.18:0))}}
];

/* ---------- 主循环 ---------- */
function clear(){if(S)S.pk.forEach(p=>p.g.remove())}
function resetCycle(){const keep=S.t;clear();newSim();S.t=keep;S.cells=CELLS;MODES[step].setup()}
function tick(dt){
  S.t+=dt;const M=MODES[step];
  if(M.P){const c=Math.floor(S.t/M.P);if(c!==S.cyc){if(S.cyc>=0){resetCycle();S.cyc=c}else S.cyc=c}S.ct=S.t-c*M.P}else S.ct=S.t;
  M.tick&&M.tick(dt);
  stepPk(dt);
  for(let d=0;d<ND;d++){const tgt=S.tg[d],tau=tgt>S.lv[d]?0.35:0.6;S.lv[d]+=(tgt-S.lv[d])*(1-Math.exp(-dt/tau))}
  S.pv+=((S.total?S.prog/S.total:0)-S.pv)*(1-Math.exp(-dt/0.3));
}
function render(){
  for(const p of S.pk){p.g.setAttribute('transform',`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);p.g.style.opacity=p.a.toFixed(2);
    p.r.classList.toggle('cp',p.mode==='svc')}
  const M=MODES[step];let fa=1;
  if(M.P){const ct=S.ct;fa=ct>M.P-0.4?Math.max(0,(M.P-ct)/0.4):(S.cyc>0&&ct<0.4?ct/0.4:1)}
  E.pk.style.opacity=fa;
  for(let d=0;d<ND;d++){
    const lv=Math.max(0,Math.min(1,S.lv[d])),role=S.role[d];
    E.bar[d].setAttribute('width',(L.bar.w*lv).toFixed(1));
    E.bar[d].setAttribute('class','fill'+(lv>0.75?' rose':lv>0.3?' ochre':' sage'));
    const failed=S.failed===d&&step!==5;
    E.xm[d].style.opacity=failed?1:0;
    E.disk[d].setAttribute('class','disk'+(failed?' fail':'')+(step===5&&d===FAIL?' new':'')+((step===1||step===3||step===5)&&role==='no'?' off':''));
    if(E.st[d]){let s='',c='ink3-t';
      if(step===0){s=role==='idle'?'闲着':'存数据';c=role==='idle'?'ink3-t':'ink2-t'}
      else if(step===2){s='存数据';c='ink2-t'}
      else if(failed){s='坏了';c='rose-t'}
      else if(step===5&&d===FAIL){s='新盘';c='sage-t'}
      else if(role==='no'){s='不参与';c='ink3-t'}
      else if(lv<=0.02){s=S.prog>0?'做完了':'等待';c='ink3-t'}
      else{s=lv>0.75?'很高':lv>0.3?'升高':'较低';c=lv>0.75?'rose-t':lv>0.3?'ochre-t':'sage-t'}
      E.st[d].textContent=T(s);E.st[d].setAttribute('class','st '+c)}
  }
  // 汇总、进度
  if(step===1||step===3||step===5){
    const part=S.role.filter(r=>r==='part').length;
    E.sum.textContent=step===1?Lz('参与：'+part+' 块盘，写全压在 1 块上',part+' drives involved; all writes hit 1')
      :step===3?Lz('参与：'+part+' 块盘，每块只多一点',part+' drives involved, each does a little')
      :Lz('回拷：写进新盘，慢一些','Copyback writes to one new drive: slower');
    E.sum.setAttribute('class','st '+(step===1?'rose-t':step===3?'sage-t':'ink2-t'));
    const v=Math.max(0,Math.min(1,S.pv));E.pf.setAttribute('width',(L.prog.w*v).toFixed(1));
    E.pf.setAttribute('class','fill '+(step===1?'rose':'sage'));
    E.ps.textContent=T(v>0.98?(step===5?'回拷完成':'冗余已恢复'):(step===5?'回拷中':'重建中'));
    E.ps.setAttribute('class','st '+(v>0.98?'sage-t':'ink3-t'));
    E.pl.textContent=T(step===5?'回拷进度':'重建进度');
    [E.pf,E.ps,E.sum].forEach(e=>e.style.opacity=fa);
  }
  if(step===3)E.top4.textContent=T('坏盘上每一段属于不同条带，各找一块盘的备用格');
  if(step===5){E.top4.textContent=T('回拷比重建慢，但冗余已经恢复，不急');
    E.quota.forEach((q,i)=>q.setAttribute('class','quota '+(S.quota[i]?'free':'used')))}
  E.top4.setAttribute('class','st '+(step===5?'ink2-t':'sage-t'));
  if(step===4){E.race.nT.textContent=S.cnt.T;E.race.nR.textContent=S.cnt.R;E.race.nT.style.opacity=fa;E.race.nR.style.opacity=fa}
}
function applyVis(){
  svg.setAttribute('data-step',step+1);
  svg.querySelectorAll('[data-show]').forEach(g=>g.classList.toggle('hid',!g.dataset.show.split(' ').includes(String(step+1))));
}
let raf=0,last=0,paused=!!opts.paused,dead=false;
function loop(now){const dt=Math.max(0,Math.min(0.05,(now-last)/1000||0));last=now;tick(dt);render();raf=requestAnimationFrame(loop)}
function run(){cancelAnimationFrame(raf);if(paused||dead||reduce)return;last=performance.now();raf=requestAnimationFrame(loop)}
function enter(i){
  step=i;cancelAnimationFrame(raf);clear();newSim();S.cells=CELLS;applyVis();MODES[i].setup();
  if(reduce){const lim=[0.2,10.5,0.5,8.4,6,9][i];for(let t=0;t<lim;t+=1/60)tick(1/60);render();return}
  render();run();
}
function rebuild(){L=layout(mq.matches);build();if(opts.onLayout)opts.onLayout(L.W/L.H,L.m);enter(step)}
mq.addEventListener('change',rebuild);
const onLang=()=>rebuild();document.addEventListener('ss-lang',onLang);
L=layout(mq.matches);build();if(opts.onLayout)opts.onLayout(L.W/L.H,L.m);
newSim();S.cells=CELLS;
const ctrl={
  show(i){enter(Math.max(0,Math.min(5,i)))},
  pause(){paused=true;cancelAnimationFrame(raf)},
  resume(){if(!paused)return;paused=false;run()},
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('ddcr')},
  ratio(){return L.W/L.H},
  step(){return step},
  sim(){return {step,t:S.t,ct:S.ct,prog:S.prog,cnt:S.cnt,lv:S.lv.map(v=>+v.toFixed(2)),n:S.pk.length}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['d-dcr']={steps:6,mount:mount};
})();
