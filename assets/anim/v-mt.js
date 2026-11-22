/* 多租户：一套集群分给几家用户，数据路径、入口、上限和密钥各管各的：6 步动画（SVG，按时间写死的时间线，不依赖动画库）。
   接口同 assets/anim/rdma.js：
     var a = SSAnim['v-mt'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) 切到第 i 步（0 起）并从头播放；a.pause() / a.resume()；a.destroy()；a.ratio()；a.step()
   动画自己不带翻页控件和步骤说明，页面翻到哪一步就调 show(i)。
   宽度 640px 以下换成窄版排布；系统开了「减少动态效果」时每步只画一帧静态结果。
   画面文字有中英两套（EN 表，手机版放不下时用 ENM 表的短写法），跟着页面的 ss-lang 事件重画。
   样式在 assets/anim/v-mt.css，全部限定在 .ssa-v-mt 容器之内。
   VAST 字标直接引用 assets/brand/vast-wordmark-black.svg 与 -white.svg（浅色用黑、深色用白），不内嵌。 */
(function(){
var EN={"租户 A 客户端":"Tenant A clients","租户 B 客户端":"Tenant B clients","其他网段":"Other subnet","租户 A 管理员":"Tenant A admin","VIP 池 A":"VIP pool A","VIP 池 B":"VIP pool B",
"CNode 1":"CNode 1","CNode 2":"CNode 2","CNode 3":"CNode 3","CNode 4":"CNode 4","共享的 DBox":"Shared DBoxes","租户 A":"Tenant A","租户 B":"Tenant B","默认租户":"Default tenant","/data":"/data","/logs":"/logs","审计记录":"Audit log",
"同名路径 /data，互不相通":"Same path /data, kept apart","每个租户有自己隔离的数据路径":"Each tenant has its own isolated data path",
"IP 在租户 A 的网段内：放行":"IP in tenant A's range: allowed","不在租户 A 的网段内：拒绝":"Not in tenant A's range: rejected","示例：VIP 池与来源 IP":"Example: VIP pool and source IP",
"VIP 池绑定指定 CNode 组":"VIP pools bind to CNode groups","数据仍在共享的 DBox 上":"The data stays on the shared DBoxes",
"租户 A 带宽限流":"Tenant A bandwidth throttling","上限":"Limit","示意，不代表实际限额":"Schematic; not a real limit",
"外部密钥管理（EKM）":"Key manager (EKM)","A 与 B 使用不同加密组":"A and B use distinct encryption groups","吊销 A 组密钥：A 的路径不可访问":"A group keys revoked: A paths blocked","内部密钥":"Internal key",
"租户 A 管理范围":"Tenant A admin scope","审计记录都存在默认租户":"All audit records go to the default tenant","VIP":"VIP",
"VAST 租户的数据路径、VIP 池、资源上限、加密组与审计":"VAST tenants: data paths, VIP pools, resource limits, encryption groups and audit"};
var ENM={"A 与 B 使用不同加密组":"Distinct encryption groups","租户 A 客户端":"Tenant A","租户 B 客户端":"Tenant B","租户 A 管理员":"A admin","外部密钥管理（EKM）":"EKM","IP 在租户 A 的网段内：放行":"In A's range: allowed","不在租户 A 的网段内：拒绝":"Not in A's range: rejected","示例：VIP 池与来源 IP":"Example: VIP pool and source IP","VIP 池绑定指定 CNode 组":"VIP pools bind to CNode groups","租户 A 带宽限流":"Tenant A bandwidth throttling","吊销 A 组密钥：A 的路径不可访问":"A group keys revoked: A paths blocked","租户 A 管理范围":"Tenant A admin scope","审计记录都存在默认租户":"Audit goes to default tenant","每个租户有自己隔离的数据路径":"Each tenant has its own data path","同名路径 /data，互不相通":"Same /data, kept apart","示意，不代表实际限额":"Schematic, not a real limit","数据仍在共享的 DBox 上":"Data stays on shared DBoxes","默认租户":"Default"};
var ARIA="VAST 租户的数据路径、VIP 池、资源上限、加密组与审计";
function lang(){return window.SS_LANG==='en'?'en':'zh'}
var NS='http://www.w3.org/2000/svg';
function mount(host,opts){
opts=opts||{};
host.classList.add('ssa-v-mt');host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','ssa-scene');svg.setAttribute('role','img');host.appendChild(svg);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mq=matchMedia('(max-width: 640px)');
const ROOT=window.SS_ROOT||'';
function T(s){if(lang()!=='en')return s;if(L&&L.mobile&&ENM[s]!==undefined)return ENM[s];return EN[s]!==undefined?EN[s]:s}
function el(tag,a,p){const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);(p||svg).appendChild(e);return e}
function tx(x,y,s,size,cls,anchor,p){const t=el('text',{x,y,'font-size':size,class:cls||''},p);if(anchor)t.setAttribute('text-anchor',anchor);t.textContent=T(s);return t}
function grp(show,p){const g=el('g',{class:'vis'},p);if(show)g.dataset.show=show;return g}
function box(r,p,cls,rx){return el('rect',{x:r.x,y:r.y,width:r.w,height:r.h,rx:rx==null?10:rx,class:cls||'box'},p)}
function poly(pts,cls,p){return el('path',{d:'M'+pts.map(q=>q.x+' '+q.y).join(' L'),class:'ln '+(cls||'')},p)}
const C=r=>({x:r.x+r.w/2,y:r.y+r.h/2});
const P=(x,y)=>({x,y});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function plen(pts){let s=0;for(let i=1;i<pts.length;i++)s+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);return s}
function at(pts,u){u=clamp(u,0,1);let d=u*plen(pts);for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],l=Math.hypot(b.x-a.x,b.y-a.y);if(d<=l||i===pts.length-1){const k=l?Math.min(1,d/l):0;return {x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k}}d-=l}return pts[pts.length-1]}
function cat(...ps){const o=[];ps.forEach(p=>p.forEach(q=>{const l=o[o.length-1];if(!l||l.x!==q.x||l.y!==q.y)o.push(q)}));return o}
function vmark(x,y,h,p){const w=h*66/14,g=el('g',{class:'vwm'},p);
  [['l','black'],['d','white']].forEach(([k,c])=>el('image',{href:ROOT+'assets/brand/vast-wordmark-'+c+'.svg',x:x.toFixed(1),y:(y-h/2).toFixed(1),width:w.toFixed(1),height:h,class:'vwm-'+k},g));return g}
let L=null,E,S,step=0,T0=0,raf=0,paused=!!opts.paused,dead=false,pausedAt=0;
function pk(cls){const r=el('rect',{x:-L.pw/2,y:-L.ph/2,width:L.pw,height:L.ph,rx:4,class:'pkt '+(cls||'')},E.pk);const o={el:r};S.items.push(o);put(o,-99,-99,0);return o}
function dot(cls){const r=el('circle',{r:L.dr,cx:0,cy:0,class:'dot '+(cls||'')},E.pk);const o={el:r};S.items.push(o);put(o,-99,-99,0);return o}
function put(o,x,y,a){if(typeof x==='object'){a=y;y=x.y;x=x.x}o.el.setAttribute('transform',`translate(${x.toFixed(1)} ${y.toFixed(1)})`);o.el.style.opacity=a==null?1:a}
function run(o,pts,t,t0,dur,fo){fo=fo==null?0.3:fo;if(t<t0||t>t0+dur+fo){put(o,-99,-99,0);return -1}const u=(t-t0)/dur;if(u<=1){put(o,at(pts,u),1);return u}put(o,pts[pts.length-1],1-(t-t0-dur)/fo);return 1.5}
const dur=pts=>plen(pts)/L.sp;
/* ---------- 版式 ---------- */
function layout(mobile){
  if(!mobile)return {W:960,H:506,mobile:false,f:{lbl:20,sm:17,cap:18},pw:20,ph:15,dr:7,sp:300,cap:{x:944,y:14},bot:{x:480,y:482},
    cl:{A:{x:40,y:24,w:210,h:44},O:{x:375,y:24,w:210,h:44},B:{x:710,y:24,w:210,h:44}},
    vip:{A:{x:80,y:100,w:130,h:32},B:{x:750,y:100,w:130,h:32}},busY:154,
    cn:[110,280,680,850].map(x=>({x:x-75,y:176,w:150,h:42})),grpPad:10,logoDy:22,
    fabY:262,fab:[35,925],store:{x:30,y:290,w:900,h:154},storeLbl:{x:46,y:306},audY:322,
    fold:{A:{x:60,y:334,w:270,h:96},D:{x:380,y:334,w:200,h:96},B:{x:630,y:334,w:270,h:96}},hdDy:18,ibDy:30,item:{dy:40,h:40},
    ekm:{x:370,y:456,w:220,h:40},ekmY:476};
  return {W:480,H:480,mobile:true,f:{lbl:17,sm:17,cap:17},pw:16,ph:12,dr:6,sp:220,cap:{x:470,y:12},bot:{x:240,y:452},
    cl:{A:{x:8,y:26,w:148,h:38},O:{x:166,y:26,w:148,h:38},B:{x:324,y:26,w:148,h:38}},
    vip:{A:{x:27,y:94,w:110,h:28},B:{x:343,y:94,w:110,h:28}},busY:138,
    cn:[62,174,306,418].map(x=>({x:x-50,y:152,w:100,h:36})),grpPad:6,logoDy:16,
    fabY:226,fab:[8,472],store:{x:8,y:244,w:464,h:164},storeLbl:{x:20,y:258},audY:272,
    fold:{A:{x:16,y:284,w:148,h:110},D:{x:174,y:284,w:132,h:110},B:{x:316,y:284,w:148,h:110}},hdDy:16,ibDy:30,item:{dy:42,h:38},
    ekm:{x:150,y:422,w:180,h:34},ekmY:439};
}
const FX=f=>f.x+f.w/2;
/* 文件夹里的两个条目（默认租户只有一个） */
function items(k){const f=L.fold[k],n=k==='D'?1:2,pad=8,w=(f.w-pad*(n+1))/n;return Array.from({length:n},(_,i)=>({x:f.x+pad+i*(w+pad),y:f.y+L.item.dy,w,h:L.item.h}))}
function toFolder(k,j){const f=L.fold[k],it=items(k)[j],ib=f.y+L.ibDy;return [P(FX(f),f.y),P(FX(f),ib),P(C(it).x,ib),C(it)]}
function cnPath(i){const c=C(L.cn[i]);return [P(c.x,L.busY),P(c.x,c.y),P(c.x,L.fabY)]}
/* 客户端 k 经 VIP 池 v、CNode i 到文件夹 fk 的条目 j */
function route(k,v,i,fk,j){const c=L.cl[k],vp=L.vip[v],vx=C(vp).x;
  const head=k===v?[P(C(c).x,c.y+c.h),P(vx,vp.y)]:[P(C(c).x,c.y+c.h),P(C(c).x,(c.y+c.h+vp.y)/2),P(vx,(c.y+c.h+vp.y)/2),P(vx,vp.y)];
  return cat(head,[P(vx,vp.y+vp.h),P(vx,L.busY)],cnPath(i),[P(FX(L.fold[fk]),L.fabY)],toFolder(fk,j))}
/* ---------- 画面 ---------- */
function build(){
  L=layout(mq.matches);svg.innerHTML='';E={};svg.setAttribute('viewBox',`0 0 ${L.W} ${L.H}`);
  const f=L.f,g=grp(null);
  /* 存储区 */
  E.store=box(L.store,g,'box soft',14);tx(L.storeLbl.x,L.storeLbl.y,'共享的 DBox',f.sm,'ttl','start',g);
  E.aud=['A','B'].map(k=>poly([P(FX(L.fold[k]),L.fold[k].y),P(FX(L.fold[k]),L.audY),P(FX(L.fold.D),L.audY),P(FX(L.fold.D),L.fold.D.y)],'thin dash',grp('6',g)));
  E.fab=poly([P(L.fab[0],L.fabY),P(L.fab[1],L.fabY)],'',g);
  E.drop={};['A','D','B'].forEach(k=>{E.drop[k]=poly([P(FX(L.fold[k]),L.fabY),P(FX(L.fold[k]),L.fold[k].y)],'',g)});
  E.fold={};E.items={};
  [['A','租户 A'],['D','默认租户'],['B','租户 B']].forEach(([k,s])=>{const fr=L.fold[k],o={};o.g=el('g',{class:'fold'},g);
    o.ib=poly([P(Math.min(FX(fr),...items(k).map(r=>C(r).x)),fr.y+L.ibDy),P(Math.max(FX(fr),...items(k).map(r=>C(r).x)),fr.y+L.ibDy)],'thin',o.g);
    items(k).forEach(r=>poly([P(C(r).x,fr.y+L.ibDy),P(C(r).x,r.y)],'thin',o.g));
    o.r=box(fr,o.g,'box',10);tx(fr.x+12,fr.y+L.hdDy,s,f.sm,'ttl','start',o.g);
    o.it=items(k).map((r,j)=>{const b=box(r,o.g,'box item',6);tx(C(r).x,C(r).y,k==='D'?'审计记录':(j?'/logs':'/data'),f.sm,'lbl','middle',o.g);return b});
    E.fold[k]=o});
  E.keyD=tx(FX(L.fold.D)+10,L.audY,'',f.sm,'violet-t','start',g);
  /* CNode 与总线 */
  E.cnV=L.cn.map((r,i)=>poly(cnPath(i),'',g));
  const cx=L.cn.map(r=>C(r).x);
  E.busA=poly([P(cx[0],L.busY),P(cx[1],L.busY)],'',g);E.busM=poly([P(cx[1],L.busY),P(cx[2],L.busY)],'',g);E.busB=poly([P(cx[2],L.busY),P(cx[3],L.busY)],'',g);
  E.grp=[[0,1],[2,3]].map(([a,b])=>{const p=L.grpPad,r={x:L.cn[a].x-p,y:L.cn[a].y-p,w:L.cn[b].x+L.cn[b].w-L.cn[a].x+2*p,h:L.cn[a].h+2*p};return box(r,grp('3 4',g),'box grpf',12)});
  /* 字标：桌面版紧跟第一台 CNode 的名字；手机版放不下，放在它下方左侧做小铭牌 */
  E.cn=L.cn.map((r,i)=>{const b=box(r,g,'box',8);
    if(i===0&&!L.mobile){const lw=T('CNode 1').length*f.lbl*0.6,h=12,w=h*66/14,gap=7,x0=C(r).x-(lw+gap+w)/2;tx(x0+lw,C(r).y,'CNode 1',f.lbl,'lbl b7','end',g);vmark(x0+lw+gap,C(r).y,h,g)}
    else tx(C(r).x,C(r).y,'CNode '+(i+1),f.lbl,'lbl b7','middle',g);return b});
  if(L.mobile)vmark(L.cn[0].x+2,L.cn[0].y+L.cn[0].h+L.logoDy,11,grp(null,g));
  /* VIP 池与客户端 */
  E.vip={};['A','B'].forEach(k=>{const r=L.vip[k];poly([P(C(L.cl[k]).x,L.cl[k].y+L.cl[k].h),P(C(r).x,r.y)],'',g);poly([P(C(r).x,r.y+r.h),P(C(r).x,L.busY)],'',g);
    E.vip[k]=box(r,g,'box vipc',r.h/2);tx(C(r).x,C(r).y,'VIP 池 '+k,f.sm,'st slate-t','middle',g)});
  const gO=grp('2',g);const cO=L.cl.O,vA=L.vip.A,my=(cO.y+cO.h+vA.y)/2;poly([P(C(cO).x,cO.y+cO.h),P(C(cO).x,my),P(C(vA).x,my)],'',gO);
  E.cl={};[['A','租户 A 客户端'],['O','其他网段'],['B','租户 B 客户端']].forEach(([k,s])=>{const r=L.cl[k],gg=k==='O'?gO:g;E.cl[k]={b:box(r,gg,'box',10),t:tx(C(r).x,C(r).y,s,f.lbl,'lbl','middle',gg)}});
  E.lim=tx(L.vip.A.x+L.vip.A.w+9,C(L.vip.A).y,'上限',f.sm,'st rose-t','start',grp('4',g));
  /* 叉号 */
  const xm=(c,a)=>{const g2=el('g',{class:'xm'},g);poly([P(c.x-a,c.y-a),P(c.x+a,c.y+a)],'xmark',g2);poly([P(c.x-a,c.y+a),P(c.x+a,c.y-a)],'xmark',g2);return g2};
  E.xVip=xm(P(L.vip.A.x+L.vip.A.w+12,C(L.vip.A).y),7);E.xFa=xm(C(L.fold.A),L.fold.A.h*0.3);
  /* 密钥（第 5 步） */
  const gK=grp('5',g);const ek=L.ekm;E.ekmL=['A','B'].map(k=>{const x=FX(L.fold[k]);return poly([P(k==='A'?ek.x:ek.x+ek.w,L.ekmY),P(x,L.ekmY),P(x,L.fold[k].y+L.fold[k].h)],'thin',gK)});
  box(ek,gK,'box',10);tx(C(ek).x,C(ek).y,'外部密钥管理（EKM）',f.sm,'lbl','middle',gK);
  E.cap=tx(L.cap.x,L.cap.y+(L.mobile?0:0),'',f.cap,'st','end');
  E.bot=tx(L.bot.x,L.bot.y,'',f.sm,'ink2-t','middle');
  E.pk=el('g',{});
  svg.setAttribute('aria-label',T(ARIA));
  if(opts.onLayout)opts.onLayout(L.W/L.H,L.mobile);
}
function cap(s,c){E.cap.textContent=T(s);E.cap.setAttribute('class','st '+(c||''))}
function bot(s,c){E.bot.textContent=T(s);E.bot.setAttribute('class','st '+(c||'ink2-t'))}
function reset(){
  svg.querySelectorAll('.ln').forEach(l=>l.classList.remove('lit','dead','hot','vio'));
  svg.querySelectorAll('.box').forEach(d=>d.classList.remove('on','ok','dead','hot','key','w'));
  Object.values(E.fold).forEach(o=>o.g.classList.remove('dim'));
  [E.xVip,E.xFa].forEach(x=>x.style.opacity=0);
  E.busM.style.opacity=1;E.keyD.textContent='';E.cl.A.t.textContent=T('租户 A 客户端');cap('');bot('');
}
const M=[];
/* 1：数据路径隔离 */
M[0]={enter(){cap('同名路径 /data，互不相通','slate-t');bot('每个租户有自己隔离的数据路径');S.v.a=pk();S.v.b=pk('b')},
 frame(t){const u=t%4.4,ra=route('A','A',1,'A',0),rb=route('B','B',2,'B',0);
  const pa=run(S.v.a,ra,u,0.2,Math.min(dur(ra),3)),pb=run(S.v.b,rb,u,0.5,Math.min(dur(rb),3));
  E.fold.A.it[0].classList.toggle('w',pa>1);E.fold.B.it[0].classList.toggle('w',pb>1)}};
/* 2：按 VIP 池和客户端 IP 认出租户 */
M[1]={enter(){S.v.a=pk();S.v.o=pk('rej')},
 frame(t){const u=t%7,ra=route('A','A',0,'A',0);const pa=run(S.v.a,ra,u,0.2,Math.min(dur(ra),3));E.fold.A.it[0].classList.toggle('w',pa>1);
  const cO=L.cl.O,vA=L.vip.A,my=(cO.y+cO.h+vA.y)/2,ro=[P(C(cO).x,cO.y+cO.h),P(C(cO).x,my),P(C(vA).x,my),P(C(vA).x,vA.y)];
  run(S.v.o,ro,u,3.8,Math.min(dur(ro),1.6),0.6);
  const ok=u<3.6,rej=u>=3.8+Math.min(dur(ro),1.6);
  E.vip.A.classList.toggle('ok',ok&&u>0.5);E.vip.A.classList.toggle('hot',rej);E.xVip.style.opacity=rej?1:0;
  cap(u<3.6?'IP 在租户 A 的网段内：放行':'不在租户 A 的网段内：拒绝',u<3.6?'sage-t':'rose-t');bot('示例：VIP 池与来源 IP')}};
/* 3：VIP 池绑定 CNode 组 */
M[2]={enter(){E.busM.style.opacity=0;E.grp.forEach(g=>g.classList.add('on'));
  cap('VIP 池绑定指定 CNode 组','slate-t');bot('数据仍在共享的 DBox 上');S.v.a=pk();S.v.b=pk('b')},
 frame(t){const u=t%3.6,k=Math.floor(t/3.6)%2;
  const ra=route('A','A',k,'A',k),rb=route('B','B',2+k,'B',k);
  const pa=run(S.v.a,ra,u,0.15,Math.min(dur(ra),2.8));
  const pb=run(S.v.b,rb,u,0.4,Math.min(dur(rb),2.8));
  E.fold.A.it.forEach((item,j)=>item.classList.toggle('w',j===k&&pa>1));
  E.fold.B.it.forEach((item,j)=>item.classList.toggle('w',j===k&&pb>1))}};
/* 4：上限——多出的请求排队 */
const NA=7,GAP=0.95;
M[3]={enter(){E.busM.style.opacity=0;cap('租户 A 带宽限流','ochre-t');bot('示意，不代表实际限额','ink3-t');S.v.a=[];for(let k=0;k<NA;k++)S.v.a.push(pk());S.v.b=[pk('b'),pk('b'),pk('b')]},
 frame(t){const per=9.5,u=t%per,c=L.cl.A,vA=L.vip.A,x=C(vA).x,y0=c.y+c.h,top=vA.y-L.ph/2-2;
  const e=[],a=[],r=[];for(let k=0;k<NA;k++){e[k]=0.3+k*0.28;a[k]=e[k]+(top-y0)/L.sp;r[k]=Math.max(a[k],k?r[k-1]+GAP:a[k])}
  for(let k=0;k<NA;k++){const o=S.v.a[k];if(u<e[k]){put(o,-99,-99,0);continue}
    if(u<r[k]){let ahead=0;for(let j=0;j<k;j++)if(r[j]>u)ahead++;const slot=top-ahead*(L.ph+3);put(o,x,Math.max(y0+L.ph/2,Math.min(y0+(u-e[k])*L.sp,slot)),1);continue}
    const rt=cat([P(x,vA.y)],route('A','A',k%2,'A',k%2).slice(2)),d=Math.min(dur(rt),2.4),p=run(o,rt,u,r[k],d);if(p>1)E.fold.A.it[k%2].classList.add('w');}
  for(let k=0;k<3;k++){const rb=route('B','B',2+(k%2),'B',k%2);run(S.v.b[k],rb,u,0.3+k*GAP*2.2,Math.min(dur(rb),2.6))}
  E.grp.forEach(g=>g.classList.add('on'));E.vip.A.classList.toggle('hot',u>0.6&&u<r[NA-1])}};
/* 5：示例中两个租户选用不同加密组 */
M[4]={enter(){E.keyD.textContent=T('内部密钥');S.v.k=[dot('v'),dot('v')];S.v.a=pk();S.v.b=pk('b')},
 frame(t){const u=t%9.5,rv=u>4.5;
  E.ekmL.forEach((l,i)=>{l.classList.toggle('vio',!(rv&&i===0));l.classList.toggle('hot',rv&&i===0)});
  ['A','B'].forEach((k,i)=>{const pts=[P(i?L.ekm.x+L.ekm.w:L.ekm.x,L.ekmY),P(FX(L.fold[k]),L.ekmY),P(FX(L.fold[k]),L.fold[k].y+L.fold[k].h)];run(S.v.k[i],pts,u,0.3+i*0.2,1.2,0.3);
    E.fold[k].r.classList.toggle('key',u>1.6&&!(rv&&k==='A'))});
  E.fold.A.r.classList.toggle('hot',rv);E.fold.A.g.classList.toggle('dim',rv);E.xFa.style.opacity=rv?1:0;
  const ra=route('A','A',1,'A',0),rb=route('B','B',2,'B',1);
  if(!rv){const pa=run(S.v.a,ra,u,1.8,Math.min(dur(ra),2.4));E.fold.A.it[0].classList.toggle('w',pa>1)}
  else{const cut=ra.slice(0,ra.length-3);run(S.v.a,cut,u,5.2,Math.min(dur(cut),2.2),0.5)}
  const pb=run(S.v.b,rb,u,rv?5.5:2.1,Math.min(dur(rb),2.4));E.fold.B.it[1].classList.toggle('w',pb>1);
  cap(rv?'吊销 A 组密钥：A 的路径不可访问':'A 与 B 使用不同加密组',rv?'rose-t':'violet-t')}};
/* 6：租户管理员只看自己的；审计记录统一存在默认租户 */
M[5]={enter(){E.cl.A.t.textContent=T('租户 A 管理员');E.fold.B.g.classList.add('dim');S.v.d=[dot('v'),dot('o'),dot('v'),dot('o')]},
 frame(t){const u=t%7;E.aud.forEach(l=>l.classList.add('lit'));
  const auA=cat([C(items('A')[0]),P(C(items('A')[0]).x,L.fold.A.y+L.ibDy),P(FX(L.fold.A),L.fold.A.y+L.ibDy)],[P(FX(L.fold.A),L.fold.A.y),P(FX(L.fold.A),L.audY),P(FX(L.fold.D),L.audY)],toFolder('D',0));
  const auB=cat([C(items('B')[1]),P(C(items('B')[1]).x,L.fold.B.y+L.ibDy),P(FX(L.fold.B),L.fold.B.y+L.ibDy)],[P(FX(L.fold.B),L.fold.B.y),P(FX(L.fold.B),L.audY),P(FX(L.fold.D),L.audY)],toFolder('D',0));
  let n=0;S.v.d.forEach((o,i)=>{const p=run(o,i%2?auB:auA,u,0.4+i*0.9,Math.min(dur(i%2?auB:auA),2),0.2);if(p>1)n++});
  E.fold.D.it[0].classList.toggle('w',n>0);
  cap(u<3.5?'租户 A 管理范围':'审计记录都存在默认租户',u<3.5?'slate-t':'violet-t')}};
/* ---------- 引擎 ---------- */
function applyVis(){svg.setAttribute('data-step',step+1);svg.querySelectorAll('[data-show]').forEach(g=>g.classList.toggle('hid',!g.dataset.show.split(' ').includes(String(step+1))))}
function newSim(){if(S)S.items.forEach(o=>o.el.remove());S={items:[],v:{}}}
function loop(now){const t=Math.max(0,(now-T0)/1000);M[step].frame(t);raf=requestAnimationFrame(loop)}
function go(){cancelAnimationFrame(raf);if(paused||dead||reduce)return;raf=requestAnimationFrame(loop)}
const STILL=[3.4,5.6,2.4,4.2,6.2,4.2];
function enter(i){step=i;cancelAnimationFrame(raf);newSim();reset();applyVis();M[i].enter();
  if(reduce){M[i].frame(STILL[i]);return}
  M[i].frame(0);T0=pausedAt=performance.now();go()}
function rebuild(){build();enter(step)}
mq.addEventListener('change',rebuild);
const onLang=()=>rebuild();document.addEventListener('ss-lang',onLang);
build();enter(0);
const ctrl={
  show(i){enter(Math.max(0,Math.min(M.length-1,i)))},
  pause(){if(paused)return;paused=true;cancelAnimationFrame(raf);pausedAt=performance.now()},
  resume(){if(!paused)return;paused=false;T0+=performance.now()-pausedAt;go()},
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('ssa-v-mt')},
  ratio(){return L.W/L.H},
  step(){return step}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['v-mt']={steps:6,mount:mount};
})();
