/* DoM 小文件：六步动画（SVG 加小仿真，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['d-dom'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   文字有中英两套，跟着页面的 ss-lang 事件重画。样式在 assets/anim/d-dom.css。 */
(function(){
var EN={"客户端":"Client","元数据服务器（MDS）":"Metadata server (MDS)","文件名 · 属性 · 布局":"Names · attributes · layout","MDT 闪存":"MDT flash",
  "服务器 1":"Server 1","服务器 2":"Server 2","服务器 3":"Server 3","服务器 4":"Server 4",
  "开头一小段：放在元数据层":"First chunk: on the metadata tier","后面：照常条带化到数据服务器":"The rest: striped over data servers as usual",
  "DoM：符合 read-on-open 条件":"DoM: eligible for read-on-open","普通 OST 布局":"Conventional OST layout",
  "未命中客户端缓存":"Client cache misses in both cases","未命中缓存 · 单个 OST":"Client cache miss · Single OST","未命中缓存 · 打开并读取":"Client cache miss · Open and read","小文件 · 符合 read-on-open 条件":"Small file · Eligible for read-on-open",
  "元数据服务器":"Metadata server","数据服务器":"Data server","已读文件":"Files read","示意，不代表实测数字":"Schematic, not measured",
  "数据服务器：这次不用":"Data servers: not used this time","数据服务器：不参与":"Data servers: not involved",
  "小文件读写时客户端、元数据服务器和数据服务器之间的来回":"Round trips between the client, the metadata server and the data servers when reading and writing small files"};
function lang(){return window.SS_LANG==='en'?'en':'zh'}
function T(s){return lang()==='en'&&EN[s]!==undefined?EN[s]:s}
function F(zh,en){return lang()==='en'?en:zh}
function mount(host,opts){
opts=opts||{};
/* ---------- 公共小工具：画布、数据块、沿线移动 ---------- */
const NS='http://www.w3.org/2000/svg';
host.classList.add('an-d-dom');host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','an-scene');svg.setAttribute('role','img');host.appendChild(svg);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mq=matchMedia('(max-width: 640px)');
let L,E={},step=0,TM=0,TT=0,MODES;
function el(tag,a,p){const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);(p||svg).appendChild(e);return e}
function tx(x,y,s,size,cls,anchor,p){const t=el('text',{x,y,'font-size':size,class:cls||''},p);if(anchor)t.setAttribute('text-anchor',anchor);t.textContent=T(s);return t}
function grp(show,p,extra){const g=el('g',Object.assign({class:'vis'},extra||{}),p);if(show)g.dataset.show=show;return g}
function dimOn(g,steps){g.dataset.dim=steps;return g}
function rect(r,cls,p,rx){return el('rect',{x:r.x,y:r.y,width:r.w,height:r.h,rx:rx==null?12:rx,class:cls},p)}
function line(a,b,cls,p){return el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'ln '+(cls||'')},p)}
function wires(pts,cls,p){const out=[];for(let i=1;i<pts.length;i++)out.push(line(pts[i-1],pts[i],cls,p));return out}
const C=r=>({x:r.x+r.w/2,y:r.y+r.h/2});
const P=(x,y)=>({x,y});
function plen(pts){let s=0;for(let i=1;i<pts.length;i++)s+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);return s}
function atD(pts,d){d=Math.max(0,d);for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],l=Math.hypot(b.x-a.x,b.y-a.y);if(d<=l||i===pts.length-1){const k=l?Math.min(1,d/l):0;return {x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k}}d-=l}return pts[pts.length-1]}
const atU=(pts,u)=>atD(pts,plen(pts)*Math.max(0,Math.min(1,u)));
const rev=pts=>pts.slice().reverse();
const cat=(...a)=>{const o=[];a.forEach(p=>p.forEach(q=>{const l=o[o.length-1];if(!l||l.x!==q.x||l.y!==q.y)o.push(q)}));return o};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fade=(t,t0,t1)=>clamp((t-t0)/(t1-t0),0,1);
/* 数据块精灵池：每帧 put 想画的块，没 put 到的自动删掉 */
const POOL=new Map();let SEEN=new Set();
function mk(o){
  const g=el('g',{class:'pk'},E.pk);const s={g,k:o.k||'blk'};
  if(s.k==='req'){s.r=el('circle',{r:L.rr,class:'req'},g)}
  else if(s.k==='lay'){const w=L.lw,h=L.lh;s.r=el('rect',{x:-w/2,y:-h/2,width:w,height:h,rx:3,class:'lay'},g);
    for(let i=0;i<3;i++)el('line',{x1:-w/2+5,x2:w/2-5-(i===2?8:0),y1:-h/2+6+i*((h-12)/2),y2:-h/2+6+i*((h-12)/2),class:'layl'},g)}
  else{const w=o.w||L.pw,h=o.h||L.ph;s.r=el('rect',{x:-w/2,y:-h/2,width:w,height:h,rx:4,class:'pkt'},g);
    if(o.lab!=null){s.t=tx(0,1,o.lab,L.f.pk,'pktl',null,g)}}
  return s}
function put(id,p,o){o=o||{};let s=POOL.get(id);if(!s){s=mk(o);POOL.set(id,s)}
  s.g.setAttribute('transform',`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
  s.g.style.opacity=o.a==null?1:o.a;
  const c=(s.k==='req'?'req':s.k==='lay'?'lay':'pkt')+(o.cls?' '+o.cls:'');if(s.c!==c){s.r.setAttribute('class',c);s.c=c}
  if(s.t&&o.lab!=null&&s.t.textContent!==String(o.lab))s.t.textContent=o.lab;
  SEEN.add(id);return s}
function sweep(){for(const [id,s] of POOL)if(!SEEN.has(id)){s.g.remove();POOL.delete(id)}SEEN=new Set()}
function clearPool(){for(const s of POOL.values())s.g.remove();POOL.clear();SEEN=new Set()}
/* 沿线跑：t 在 [t0, t0+dur] 内画出来，返回 0..1 进度；之前返回 -1，之后返回 2 */
function run(id,pts,t0,dur,t,o){if(t<t0)return -1;if(t>t0+dur)return 2;put(id,atU(pts,(t-t0)/dur),o);return (t-t0)/dur}
function setCls(e,c){if(e&&e.getAttribute('class')!==c)e.setAttribute('class',c)}
function setTxt(e,s){s=T(s);if(e&&e.textContent!==s)e.textContent=s}

/* ================= DoM：版式 ================= */
function layout(m){
  let o;
  if(!m){
    const W=960,H=476;
    o={m:false,W,H,f:{ttl:20,lbl:20,sm:17,note:17,big:34,pk:16,lane:21},pw:36,ph:26,rr:8,lw:30,lh:24,
      cl:{x:24,y:170,w:170,h:100},mds:{x:360,y:30,w:560,h:132},fl:{x:690,y:48,w:212,h:98},
      oss:[0,1,2,3].map(j=>({x:360+j*140,y:300,w:120,h:110})),busX:280,trunkY:250,
      cnt:[{x:24,y:308},{x:24,y:340}],skip:{x:640,y:444,a:'middle'},lab6:{x:796,y:192,a:'middle'},lab6b:{x:640,y:444,a:'middle'}};
    const cy=C(o.cl).y,mY=C(o.mds).y;o.mY=mY;
    o.r={mds:()=>[P(o.cl.x+o.cl.w,cy),P(o.busX,cy),P(o.busX,mY),P(o.mds.x,mY)],
      oss:j=>[P(o.cl.x+o.cl.w,cy),P(o.busX,cy),P(o.busX,o.trunkY),P(C(o.oss[j]).x,o.trunkY),P(C(o.oss[j]).x,o.oss[j].y)],
      hold:P(o.cl.x+o.cl.w-34,cy),hold2:P(o.cl.x+o.cl.w-78,cy)};
    o.wire=[[P(o.cl.x+o.cl.w,cy),P(o.busX,cy)],[P(o.busX,mY),P(o.busX,o.trunkY)]];
    o.wM=[[P(o.busX,mY),P(o.mds.x,mY)]];o.wT=[[P(o.busX,o.trunkY),P(C(o.oss[3]).x,o.trunkY)]];
    o.mLab={x:380,y:58},o.mSub={x:380,y:144};   // 副标题放到框底：数据块从左边进来横穿框中部去闪存
  }else{
    const W=480,H=692;
    o={m:true,W,H,f:{ttl:20,lbl:18,sm:17,note:17,big:30,pk:17,lane:20},pw:36,ph:26,rr:8,lw:26,lh:20,
      cl:{x:140,y:20,w:200,h:64},mds:{x:16,y:164,w:428,h:196},fl:{x:236,y:232,w:192,h:112},
      oss:[0,1,2,3].map(j=>({x:16+j*116,y:446,w:100,h:110})),busY:122,busR:460,mX:120,trunkY:410,
      cnt:[{x:16,y:592},{x:16,y:622}],skip:{x:464,y:592,a:'end'},lab6:{x:16,y:388,a:'start'},lab6b:{x:16,y:592,a:'start'}};
    const cx=C(o.cl).x,bot=o.cl.y+o.cl.h;
    o.r={mds:()=>[P(cx,bot),P(cx,o.busY),P(o.mX,o.busY),P(o.mX,o.mds.y)],
      oss:j=>[P(cx,bot),P(cx,o.busY),P(o.busR,o.busY),P(o.busR,o.trunkY),P(C(o.oss[j]).x,o.trunkY),P(C(o.oss[j]).x,o.oss[j].y)],
      hold:P(cx+60,o.cl.y+o.cl.h-20),hold2:P(cx+18,o.cl.y+o.cl.h-20)};
    o.wire=[[P(cx,bot),P(cx,o.busY)],[P(o.mX,o.busY),P(cx,o.busY)]];
    o.wM=[[P(o.mX,o.busY),P(o.mX,o.mds.y)]];o.wT=[[P(cx,o.busY),P(o.busR,o.busY)],[P(o.busR,o.busY),P(o.busR,o.trunkY)],[P(o.busR,o.trunkY),P(C(o.oss[0]).x,o.trunkY)]];
    o.mLab={x:428,y:190,a:'end'},o.mSub={x:428,y:216,a:'end'};   // 标题靠右：数据块从左上角斜穿去闪存
  }
  o.ox=j=>C(o.oss[j]).x;
  o.sp=(j,c)=>P(o.ox(j)+(c||0)*26,o.oss[j].y+34);
  o.fp=k=>P(o.fl.x+30+k*44,o.fl.y+o.fl.h-30);   // MDT 闪存里的格子
  o.race=m?raceM():raceD();
  return o;
}
function raceD(){const lane=(y0)=>({t:{x:32,y:y0},cl:{x:150,y:y0+59,w:120,h:52},fx:330,
    md:{x:420,y:y0+24,w:170,h:44},os:{x:420,y:y0+102,w:170,h:44},cnt:{x:780,ly:y0+56,ny:y0+92}});
  return {L:[lane(40),lane(244)],sep:{y:214,x1:32,x2:928},note:{x:32,y:454}}}
function raceM(){const lane=(y0)=>({t:{x:16,y:y0},cl:{x:16,y:y0+96,w:104,h:48},fx:160,
    md:{x:200,y:y0+44,w:156,h:44},os:{x:200,y:y0+152,w:156,h:44},cnt:{x:420,ly:y0+102,ny:y0+138}});
  return {L:[lane(36),lane(336)],sep:{y:306,x1:16,x2:464},note:{x:16,y:664}}}

/* ================= 画面 ================= */
function build(){
  const f=L.f,net=grp('1 2 3 4 6');
  E.cl=rect(L.cl,'blk',net);
  if(L.m)tx(C(L.cl).x-40,L.cl.y+22,'客户端',f.lbl,'lblb','middle',net);else tx(L.cl.x+18,L.cl.y+22,'客户端',f.lbl,'lblb','start',net);
  L.wire.forEach(s=>wires(s,'',net));
  const gM=dimOn(grp('1 2 3 4 6',net),'');
  L.wM.forEach(s=>wires(s,'meta',gM));
  E.mds=rect(L.mds,'blk',gM);
  tx(L.mLab.x,L.mLab.y,'元数据服务器（MDS）',f.lbl,'lblb',L.mLab.a||'start',gM);
  tx(L.mSub.x,L.mSub.y,'文件名 · 属性 · 布局',f.note,'ink2-t',L.mSub.a||'start',gM);
  E.fl=rect(L.fl,'blk',gM,10);E.fl.style.strokeDasharray='6 4';
  tx(L.fl.x+14,L.fl.y+22,'MDT 闪存',f.note,'violet-t','start',gM);
  const gO=dimOn(grp('1 2 3 4 6',net),'3 4');
  L.wT.forEach(s=>wires(s,'data',gO));
  E.oss=L.oss.map((r,j)=>{wires([P(C(r).x,L.trunkY),P(C(r).x,r.y)],'data',gO);const b=rect(r,'blk',gO);
    tx(C(r).x,r.y+r.h-20,'服务器 '+(j+1),f.note,'lbl','middle',gO);return b});
  tx(L.cnt[0].x,L.m?657:447,'未命中缓存 · 单个 OST',f.note,'ink2-t','start',grp('1',net));
  tx(L.cnt[0].x,L.m?657:447,'未命中缓存 · 打开并读取',f.note,'ink2-t','start',grp('2',net));
  tx(L.cnt[0].x,L.m?657:447,'小文件 · 符合 read-on-open 条件',f.note,'ink2-t','start',grp('4',net));
  // 计数 + 标注
  E.c1=tx(L.cnt[0].x,L.cnt[0].y,'',f.sm,'st ink2-t','start',grp('1 2 4',net));
  E.c2=tx(L.cnt[1].x,L.cnt[1].y,'',f.sm,'st rose-t','start',grp('2',net));
  E.skip=tx(L.skip.x,L.skip.y,'',f.sm,'st sage-t',L.skip.a,grp('3 4',net));
  const g6=grp('6',net);
  tx(L.lab6.x,L.lab6.y,'开头一小段：放在元数据层',f.sm,'violet-t st',L.lab6.a,g6);
  tx(L.lab6b.x,L.lab6b.y,'后面：照常条带化到数据服务器',f.sm,'slate-t st',L.lab6b.a,g6);
  // 第 5 步：两条通道
  const R=L.race,g=grp('5');
  tx(R.note.x,R.note.y-29,'未命中客户端缓存',f.note,'ink2-t','start',g);
  E.rc=R.L.map((ln,k)=>{
    tx(ln.t.x,ln.t.y,k?'DoM：符合 read-on-open 条件':'普通 OST 布局',f.lane,'lblb','start',g);
    const cy=C(ln.cl).y,my=C(ln.md).y,oy=C(ln.os).y,ce=ln.cl.x+ln.cl.w;
    wires([P(ce,cy),P(ln.fx,cy)],'',g);wires([P(ln.fx,my),P(ln.fx,oy)],'',g);
    wires([P(ln.fx,my),P(ln.md.x,my)],'meta',g);
    const go=el('g',{},g);if(k)go.style.opacity=0.25;
    wires([P(ln.fx,oy),P(ln.os.x,oy)],'data',go);
    rect(ln.cl,'ep',g,10);tx(C(ln.cl).x,cy,'客户端',f.note,'lbl','middle',g);
    rect(ln.md,'ep',g,10);tx(C(ln.md).x,my,'元数据服务器',f.note,'lbl','middle',g);
    rect(ln.os,'ep',go,10);tx(C(ln.os).x,oy,'数据服务器',f.note,'lbl','middle',go);
    tx(ln.cnt.x,ln.cnt.ly,'已读文件',f.note,'ink3-t','middle',g);
    const n=tx(ln.cnt.x,ln.cnt.ny,'0',f.big,'num '+(k?'sage-t':'rose-t'),'middle',g);
    return {n,toM:[P(ce,cy),P(ln.fx,cy),P(ln.fx,my),P(ln.md.x,my)],toO:[P(ce,cy),P(ln.fx,cy),P(ln.fx,oy),P(ln.os.x,oy)]};
  });
  el('line',{x1:R.sep.x1,y1:R.sep.y,x2:R.sep.x2,y2:R.sep.y,class:'sep'},g);
  tx(R.note.x,R.note.y,'示意，不代表实测数字',f.note,'ink3-t','start',g);
}
function reset(){if(!E.mds)return;setCls(E.mds,'blk');setCls(E.cl,'blk');E.oss.forEach(b=>setCls(b,'blk'));setTxt(E.c1,'');setTxt(E.c2,'');setTxt(E.skip,'')}

/* ================= 每一步 ================= */
function modes(){
  const spd=L.m?300:340,dur=p=>plen(p)/spd;
  const toM=L.r.mds(),toMb=cat(rev(toM),[L.r.hold]);
  // 一次完整的普通读：问 MDS → 回属性 → 问服务器 j → 回内容。返回结束时间与已完成的来回次数
  function readNormal(id,j,lab,t0,tc,sp,from){const d1=plen(toM)/sp,go=L.r.oss(j),d2=plen(go)/sp,w=0.25;
    run(id+'q1',toM,t0,d1,tc,{k:'req'});
    const a1=t0+d1;setCls(E.mds,tc>=a1&&tc<a1+w?'blk on':E.mds.getAttribute('class'));
    run(id+'k',toMb,a1+w,plen(toMb)/sp,tc,{k:'lay'});
    const b1=a1+w+plen(toMb)/sp;
    run(id+'q2',go,b1,d2,tc,{k:'req'});
    const a2=b1+d2,back=cat([from||L.sp(j)],rev(go),[L.r.hold2]);
    run(id+'d',back,a2+w,plen(back)/sp,tc,{lab});
    const end=a2+w+plen(back)/sp;
    return {end,trips:(tc>=b1?1:0)+(tc>=end?1:0),a2}}
  const J2=[1,3,0,2,1,3],at2=i=>L.sp(J2[i],i<4?-1:1);
  return {
  /* 1：两次来回 */
  0:{still:L.m?9.5:6.5,frame(t){const cycle=L.m?10.5:8,tc=t%cycle;put('S',L.sp(1),{lab:'S'});setCls(E.mds,'blk');
      const r=readNormal('n',1,'S',0.3,tc,spd);
      setCls(E.oss[1],tc>=r.a2&&tc<r.a2+0.3?'blk on':'blk');
      if(tc>=r.end&&tc<cycle-0.4){const opacity=1-fade(tc,cycle-0.8,cycle-0.4);
        put('nk',L.r.hold,{k:'lay',a:opacity});put('nd',L.r.hold2,{lab:'S',a:opacity})}
      setTxt(E.c1,F('来回：'+r.trips+' 次','Round trips: '+r.trips))}},
  /* 2：一批小文件，来回是文件数的两倍 */
  1:{still:6,enter(){const sp=spd*3.4;let t0=0.3;const st=[];for(let i=0;i<6;i++){const r=readNormal('x',J2[i],'',t0,-1,sp,at2(i));st.push(t0);t0=r.end+0.12}E.s2={st,cyc:t0+1.4,sp}},
    frame(t){const S=E.s2,tc=t%S.cyc;let files=0,trips=0;
      const fa=tc>S.cyc-0.5?(S.cyc-tc)/0.5:tc<0.3?tc/0.3:1;
      setCls(E.mds,'blk');
      for(let i=0;i<6;i++)put('S'+i,at2(i),{lab:'S'+(i+1)});
      for(let i=0;i<6;i++){if(S.st[i]>tc)break;
        const r=readNormal('f'+i,J2[i],'S'+(i+1),S.st[i],tc,S.sp,at2(i));trips+=r.trips;if(tc>=r.end)files++;
        if(tc>=r.end&&tc<r.end+0.4)put('f'+i+'d',L.r.hold2,{lab:'S'+(i+1),a:1-fade(tc,r.end,r.end+0.4)})}
      setTxt(E.c1,F('已读文件 '+files,'Files read: '+files));setTxt(E.c2,F('本例往返 '+trips+' 次','Example round trips: '+trips));E.c1.style.opacity=fa;E.c2.style.opacity=fa}},
  /* 3：小文件写进 MDT 闪存 */
  2:{still:3,frame(t){const tc=t%6;setTxt(E.skip,'数据服务器：这次不用');
      put('S0',L.r.hold,{lab:'S',a:fade(tc,0,0.3)*(1-fade(tc,5.6,6))});
      const p=cat([L.r.hold],toM,[L.fp(0)]),u=run('w',p,0.6,dur(p),tc,{lab:'S'});
      if(u===2)put('w',L.fp(0),{lab:'S',a:1-fade(tc,5.6,6)});
      setCls(E.mds,u>0.85&&u<=2&&tc<1.2+0.6+dur(p)?'blk on':'blk')}},
  /* 4：一次来回，属性和内容一起回来 */
  3:{still:3,frame(t){const tc=t%6.5;setTxt(E.skip,'数据服务器：不参与');put('S',L.fp(0),{lab:'S'});
      const d1=dur(toM);run('q',toM,0.3,d1,tc,{k:'req'});const a=0.3+d1;setCls(E.mds,tc>=a&&tc<a+0.35?'blk on':'blk');
      const back=cat([L.fp(0)],rev(toM),[L.r.hold2]);
      const u=run('d',back,a+0.3,dur(back),tc,{lab:'S'});
      if(u===2){const opacity=1-fade(tc,6,6.4);put('d',L.r.hold2,{lab:'S',a:opacity});put('k',L.r.hold,{k:'lay',a:opacity})}
      setTxt(E.c1,F('来回：'+(u===2?1:0)+' 次','Round trips: '+(u===2?1:0)))}},
  /* 5：两条通道比一批小文件 */
  4:{still:6.5,frame(t){const C5=10,tc=t%C5,sp=L.m?330:380,w=0.12;
      const fa=tc>9.6?(C5-tc)/0.4:tc<0.4?tc/0.4:1;
      E.rc.forEach((ln,k)=>{let t0=0.2,n=0,i=0;const dM=plen(ln.toM)/sp,dO=plen(ln.toO)/sp;
        while(t0<tc&&t0<8.8){
          if(k===0){const a=t0+dM+w,b=a+dM,c=b+dO+w,e=c+dO;
            run(`${k}q${i}`,ln.toM,t0,dM,tc,{k:'req',a:fa});run(`${k}k${i}`,rev(ln.toM),a,dM,tc,{k:'lay',a:fa});
            run(`${k}r${i}`,ln.toO,b,dO,tc,{k:'req',a:fa});run(`${k}d${i}`,rev(ln.toO),c,dO,tc,{a:fa});
            if(tc>=e)n++;t0=e+0.08}
          else{const a=t0+dM+w,e=a+dM;
            run(`${k}q${i}`,ln.toM,t0,dM,tc,{k:'req',a:fa});run(`${k}d${i}`,rev(ln.toM),a,dM,tc,{a:fa});
            if(tc>=e)n++;t0=e+0.08}
          i++}
        setTxt(ln.n,String(n));ln.n.style.opacity=fa})}},
  /* 6：大文件开头进 MDT，后面条带化 */
  5:{still:4.5,frame(t){const tc=t%7.5,a=fade(tc,0.1,0.4)*(1-fade(tc,7,7.4));
      put('L',L.r.hold2,{lab:'L',cls:'b',a});
      const p1=cat([L.r.hold2],toM,[L.fp(0)]),u=run('l1',p1,0.6,dur(p1),tc,{lab:'L1',cls:'b'});
      if(u===2)put('l1',L.fp(0),{lab:'L1',cls:'b',a:1-fade(tc,7,7.4)});
      for(let j=0;j<4;j++){const p=cat([L.r.hold2],L.r.oss(j),[L.sp(j)]),ts=1.1+0.35*j;const v=run('l'+(j+2),p,ts,dur(p),tc,{lab:'L'+(j+2),cls:'b'});
        if(v===2)put('l'+(j+2),L.sp(j),{lab:'L'+(j+2),cls:'b',a:1-fade(tc,7,7.4)})}}}
  };
}

/* ---------- 引擎 ---------- */
const NSTEP=6;
function applyVis(){
  svg.setAttribute('data-step',step+1);
  svg.querySelectorAll('[data-show]').forEach(g=>g.classList.toggle('hid',!g.dataset.show.split(' ').includes(String(step+1))));
  svg.querySelectorAll('[data-dim]').forEach(g=>g.classList.toggle('dim',g.dataset.dim.split(' ').includes(String(step+1))));
}
let raf=0,last=0,paused=!!opts.paused,dead=false;
function frame(dt){TM+=dt;TT+=dt;const m=MODES[step];m.frame&&m.frame(TM,dt,TT);sweep()}
function loop(now){const dt=Math.max(0,Math.min(0.05,(now-last)/1000||0));last=now;frame(dt);raf=requestAnimationFrame(loop)}
function startLoop(){cancelAnimationFrame(raf);if(paused||dead||reduce)return;last=performance.now();raf=requestAnimationFrame(loop)}
function enter(i){
  step=i;cancelAnimationFrame(raf);clearPool();TM=0;TT=0;
  applyVis();reset();
  const m=MODES[i];m.enter&&m.enter();
  if(reduce){const lim=m.still==null?3:m.still;for(let t=0;t<lim;t+=1/30)frame(1/30);return}
  frame(0);startLoop();
}
function setup(){L=layout(mq.matches);svg.innerHTML='';E={};POOL.clear();SEEN=new Set();svg.setAttribute('viewBox',`0 0 ${L.W} ${L.H}`);build();E.pk=el('g',{});MODES=modes();
  svg.setAttribute('aria-label',T('小文件读写时客户端、元数据服务器和数据服务器之间的来回'));if(opts.onLayout)opts.onLayout(L.W/L.H,L.m)}
function rebuild(){setup();enter(step)}
mq.addEventListener('change',rebuild);
const onLang=()=>rebuild();document.addEventListener('ss-lang',onLang);
setup();
const ctrl={
  show(i){enter(Math.max(0,Math.min(NSTEP-1,i)))},
  pause(){paused=true;cancelAnimationFrame(raf)},
  resume(){if(!paused)return;paused=false;startLoop()},
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML=''},
  ratio(){return L.W/L.H},
  step(){return step}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['d-dom']={steps:6,mount:mount};
})();
