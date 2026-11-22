/* DataEnclave：模型去找数据，谁都拿不走对方的东西。七步动画（SVG 加时间线，不依赖动画库）。
   接口与 assets/anim/rdma.js 相同：
     var a = SSAnim['v-enclave'].mount(容器元素, {paused:false, onLayout:function(宽高比, 是否手机版){}});
     a.show(i) / a.pause() / a.resume() / a.destroy() / a.ratio() / a.step()
   步骤状态归页面管，动画只保留画面里的切换按钮（第 3、5、7 步）。
   宽度 640px 以下换成上中下三层；系统开了「减少动态效果」时每步只画一帧静态结果。
   文字有中英两套，跟着页面的 ss-lang 事件重画。样式在 assets/anim/v-enclave.css。
   第 4 到 7 步：「VAST 集群」里的 VAST 用官方字标，硬件框写「CPU + [NVIDIA] GPU」（文件同 assets/brand/）。 */
(function(){
var EN={
 "企业":"Enterprise","运营者的服务器":"Operator's servers","模型厂商":"Model vendor",
 "检索与组装":"Retrieval","企业数据":"Data","主机管理员":"Host admin","证明服务器":"Attestation","钥匙（KMS）":"Keys (KMS)","模型权重":"Weights",
 "集群":"cluster","只存密文":"Ciphertext only","只出站":"Outbound","内存":"Memory",
 "普通容器":"Plain container","机密环境（CVM）":"Confidential VM","内存（加密）":"Encrypted RAM","加密内存":"Encrypted RAM","机密环境（CVM）@m":"CVM",
 "数据不能出门":"Data can't leave","权重不肯交出去":"Won't hand over weights","默认能看内存":"Can read memory",
 "拿到明文":"Gets plaintext","抓不到":"Blocked",
 "机密环境：同样的抓取被硬件挡回去，拿不到内容":"Confidential VM: the same grab is blocked by hardware",
 "普通容器：管理员能把内存里的明文复制出来":"Plain container: the admin copies plaintext out",
 "空手启动，没有钥匙":"Starts with no keys","主机改了策略":"Host changed the policy","改了策略":"Changed policy",
 "与登记值不符，不放钥匙":"No match, no keys","核验通过，放钥匙":"Verified, keys released",
 "拿不到钥匙，起不来":"No keys, won't start","钥匙到了，等权重进来":"Keys in, loading weights","在受保护内存里解密":"Decrypted in protected memory",
 "只递 prompt，拿回回答":"Prompt in, answer out","模型只看到这段 prompt":"Model sees only the prompt","模型就绪":"Model ready",
 "策略被改：报告和登记的对不上，钥匙一把都不放":"Policy changed: no match, no keys released",
 "策略原样：核验通过，钥匙放进去":"Policy intact: verified, keys released",
 "企业看得到：自己的数据、prompt 和回答":"Enterprise sees its data, prompts, answers","看不到：模型权重":"Not the model weights",
 "模型厂商看得到：自己的模型权重":"Model vendor sees only its weights","看不到：企业的数据、prompt 和回答":"Not the enterprise's data, prompts, answers",
 "运营者两样都看不到":"The operator sees neither","只能决定跑不跑，随时可以停掉负载":"It only decides whether the workload runs",
 "看不到内容":"Sees no content",
 "⇄ 换回普通容器":"⇄ Back to plain container","⇄ 换成机密环境":"⇄ Switch to confidential VM",
 "⇄ 恢复原策略":"⇄ Restore the policy","⇄ 模拟策略被改":"⇄ Simulate a policy change",
 "⇄ 换到模型厂商视角":"⇄ Switch to model vendor view","⇄ 换到运营者视角":"⇄ Switch to operator view","⇄ 换到企业视角":"⇄ Switch to enterprise view",
 "企业、运营者的服务器、模型厂商三方：机密环境如何先验证、后给钥匙":"Enterprise, operator servers and model vendor: how a confidential VM is verified before it gets keys"
};
function lang(){return window.SS_LANG==='en'?'en':'zh'}
function T(s,m){return lang()!=='en'?s:m&&EN[s+'@m']!==undefined?EN[s+'@m']:EN[s]!==undefined?EN[s]:s}
var SYM="<symbol id=\"vast-wm\" viewBox=\"0 0 66 14\"><path d=\"m11.918.916-.783-.375a.919.919 0 0 0-1.23.444l-.22.414L6.235 8.77 2.788 1.4l-.22-.414a.917.917 0 0 0-1.23-.444L.556.916c-.466.219-.69.804-.474 1.273l.195.383 4.689 10.024a1.383 1.383 0 0 0 1.248.797h.042a1.385 1.385 0 0 0 1.248-.797l4.689-10.024.195-.383c.217-.469-.007-1.054-.47-1.273ZM19.311 12.926l.784.375a.918.918 0 0 0 1.23-.444l.22-.414 3.451-7.371 3.448 7.371.22.414a.918.918 0 0 0 1.23.444l.785-.375c.462-.221.687-.804.469-1.271l-.195-.383-4.689-10.024a1.384 1.384 0 0 0-1.248-.797h-.041a1.386 1.386 0 0 0-1.25.797l-4.688 10.024-.195.383c-.219.467.006 1.05.47 1.27ZM47.275 3.212a.918.918 0 0 0 .966-.882l.03-.868c.02-.512-.393-.982-.908-1.006L46.887.45h-5.413c-.03 0-.059 0-.092.004-1.433.095-3.565 1.126-3.565 3.572 0 2.487 2.104 3.599 3.236 3.846l2.823.677c.041.009.082.017.124.023.15.022.896.176.896 1.014 0 .504-.253.801-.754.885h-5.318l-.362.005a.918.918 0 0 0-.966.883l-.03.868c-.02.512.393.982.908 1.006l.45.005h5.413c.043 0 .086 0 .128-.005 1.327-.123 3.301-1.196 3.301-3.647 0-2.539-2.051-3.547-3.195-3.742l-2.787-.668-.039-.008c-.042-.01-1.058-.235-1.058-1.142 0-.606.578-.769.953-.81h5.347l.388-.004ZM66 1.365a.916.916 0 0 0-.938-.914H55.5a.919.919 0 0 0-.938.914v.878c0 .513.427.968.942.976H58.897v9.086a.914.914 0 0 0 .56.864.919.919 0 0 0 .355.073h.879c.512 0 .968-.426.976-.94V3.217H65.06c.515-.007.943-.463.942-.975l-.003-.878Z\"/></symbol><symbol id=\"nv-logo\" viewBox=\"205 513 2090 414\"><path fill=\"#76B900\" d=\"M436.93785,640.78361v-35.49175c3.4459-.24553,6.92613-.42918,10.4726-.54024,97.07249-3.05104,160.75618,83.40761,160.75618,83.40761,0,0-68.78225,95.53503-142.53101,95.53503-10.62215,0-20.12751-1.71234-28.69777-4.58826v-107.62396c37.79122,4.56486,45.3879,21.25692,68.11388,59.12728l50.52954-42.60379s-36.88389-48.37696-99.0625-48.37696c-6.76609,0-13.23133.47815-19.58092,1.15504M436.93785,523.54106v53.0144c3.48438-.27548,6.97313-.49739,10.4726-.62333,134.99401-4.54781,222.93894,110.70911,222.93894,110.70911,0,0-101.01819,122.83652-206.25515,122.83652-9.64223,0-18.67162-.89028-27.15639-2.39142v32.76954c7.25714.92242,14.77052,1.46463,22.61492,1.46463,97.93719,0,168.75864-50.01037,237.34237-109.20595,11.3631,9.10406,57.91698,31.25152,67.49078,40.95975-65.2126,54.58595-217.17638,98.58388-303.32785,98.58388-8.30134,0-16.28653-.50177-24.12021-1.25321v46.05397h372.23407v-392.91789h-372.23407ZM436.93785,779.10599v27.98036c-90.57969-16.14985-115.72071-110.3077-115.72071-110.3077,0,0,43.48994-48.18696,115.72071-55.99504v30.69842c-.05553,0-.09183-.01487-.14102-.01487-37.90229-4.55218-67.51832,30.86283-67.51832,30.86283,0,0,16.59175,59.61825,67.65934,76.776M276.05771,692.6985s53.68509-79.21639,160.88014-87.40665v-28.7364c-118.72891,9.52895-221.54711,110.08578-221.54711,110.08578,0,0,58.23072,168.35047,221.54711,183.76373v-30.54909c-119.84569-15.0781-160.88014-147.15739-160.88014-147.15739Z\"/><path fill=\"#000000\" d=\"M1479.66576,597.78723l.02592,257.90666h72.83585v-257.90223l-72.86177-.00443ZM906.67774,597.43677v258.25712h73.48583v-196.09803l56.92818.01949c18.8585,0,32.28898,4.69251,41.37629,14.3888,11.5213,12.27737,16.22358,32.06825,16.22358,68.28803v113.4017l71.18818-.01297.01297-142.67253c0-101.83834-64.91535-115.57162-128.42042-115.57162h-130.7946M1596.94459,597.79587v257.89802h118.13971c62.94459,0,83.48829-10.46877,105.70657-33.93954,15.70652-16.47653,25.85275-52.64668,25.85275-92.1744,0-36.24991-8.58863-68.59087-23.57472-88.73-26.98413-36.0142-65.86086-43.05408-123.8987-43.05408h-102.22561ZM1669.19603,653.95164h31.31755c45.4339,0,74.81747,20.40298,74.81747,73.34165,0,52.95174-29.38356,73.35472-74.81747,73.35472h-31.31755v-146.69636ZM1374.64705,597.79587l-60.78862,204.3991-58.24896-204.38603-78.62696-.01307,83.18745,257.89802h104.97972l83.84098-257.89802h-74.3436ZM1880.53784,855.69389h72.84869v-257.88495l-72.86597-.01307.01728,257.89802ZM2084.72543,597.88892l-101.70877,257.71614h71.82122l16.09133-45.55054h120.36811l15.23266,45.55054h77.97807l-102.48525-257.73763-97.29737.02149ZM2132.0067,644.90644l44.12286,120.73556h-89.63895l45.51609-120.73556Z\"/></symbol>";
var uidN=0;
function mount(host,opts){
opts=opts||{};
const NS='http://www.w3.org/2000/svg';
const uid='ve'+(++uidN);
host.classList.add('v-enclave');host.innerHTML='';
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','v-enclave-scene');svg.setAttribute('role','img');host.appendChild(svg);
const btn=document.createElement('button');btn.className='v-enclave-tgl';btn.type='button';btn.hidden=true;host.appendChild(btn);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mq=matchMedia('(max-width: 640px)');
const qs=new URLSearchParams(location.search);
let L,E,S,step=0;
let enc=qs.get('enc')!=='0', tamper=qs.get('tamper')!=='0', view=0, viewManual=false;
const VIEWS=['ent','ven','op'];

/* ---------- 版式：桌面左中右三栏，手机上中下三层 ---------- */
const P=(x,y)=>({x,y});
function layout(mobile){
  if(!mobile){
    const L={mobile:false,W:960,H:548,f:{ttl:20,lbl:18,sm:16,cap:17,q:24},pw:30,ph:22,gr:11};
    L.fr={ent:{x:16,y:24,w:232,h:420,tx:34,ty:56,ta:'start'},op:{x:280,y:24,w:400,h:420,tx:480,ty:56,ta:'middle'},ven:{x:712,y:24,w:232,h:420,tx:926,ty:56,ta:'end'}};
    L.bx={ret:{x:60,y:104,w:144,h:56},dat:{x:52,y:300,w:160,h:64},con:{x:330,y:80,w:300,h:214},mem:{x:342,y:114,w:276,h:58},
      hw:{x:380,y:212,w:200,h:44},sto:{x:292,y:340,w:176,h:60},adm:{x:486,y:340,w:190,h:60},
      wts:{x:752,y:104,w:160,h:56},srv:{x:752,y:206,w:160,h:56},kms:{x:752,y:304,w:160,h:56}};
    L.lo={sto:76,srv:40,kms:44,wts:44};
    L.pt={datBlk:P(186,332),stoBlk:P(312,370),wtsBlk:P(774,132),kmsKey:P(774,332),
      sD:P(400,132),sK:P(560,132),sW:P(480,132),retC:P(186,132),cp1:P(624,370),cp2:P(656,370),admC:P(606,370),
      gateD:P(264,132),gateW:P(696,132),q:P(480,180),badge:P(752,206)};
    L.w={D:[P(186,300),P(186,132),P(342,132)],W:[P(618,132),P(752,132)],T:[P(580,234),P(752,234)],K:[P(774,304),P(774,262)],
      S:[P(344,340),P(344,172)],Plo:[P(606,340),P(606,294)],Phi:[P(606,294),P(606,172)],C:[P(560,212),P(560,172)]};
    const pt=L.pt;
    L.path={
      dGate:[pt.datBlk,P(186,300),P(186,132),P(234,132)],
      wGate:[pt.wtsBlk,P(752,132),P(726,132)],
      cD:[pt.sD,P(400,157),P(606,157),P(606,172),P(606,340),P(606,370),pt.cp1],
      cW:[pt.sW,P(480,157),P(606,157),P(606,172),P(606,340),P(606,370),pt.cp2],
      probe:[pt.admC,P(606,340),P(606,302)],
      tamper:[pt.admC,P(606,340),P(606,294)],
      rep:[P(560,234),P(580,234),P(752,234),P(770,234)],
      key:[pt.kmsKey,P(774,304),P(774,262),P(774,234),P(752,234),P(580,234),P(560,234),P(560,212),P(560,172),pt.sK],
      sto:[pt.stoBlk,P(344,370),P(344,340),P(344,172),P(344,157),P(480,157),pt.sW],
      toRet:[pt.datBlk,P(186,300),P(186,160),pt.retC],
      prompt:[pt.retC,P(204,132),P(342,132),pt.sD]
    };
    L.tx={conLbl:{x:346,y:98,a:'start'},memLbl:{x:614,y:98,a:'end'},conSt:{x:480,y:276,a:'middle'},
      entTxt:{x:132,y:420,a:'middle'},venTxt:{x:828,y:420,a:'middle'},stoCap:{x:380,y:422,a:'middle'},admTxt:{x:581,y:422,a:'middle'},
      outLbl:{x:671,y:204,a:'middle'},cap1:{x:480,y:466},cap2:{x:480,y:490},btn:{x:480,y:524}};
    return L;
  }
  /* 手机：小字统一 17（400 宽下约 12.5px） */
  const L={mobile:true,W:480,H:944,f:{ttl:19,lbl:17,sm:17,cap:17,q:22},pw:28,ph:20,gr:10};
  L.fr={ent:{x:12,y:12,w:456,h:128,tx:28,ty:36,ta:'start'},op:{x:12,y:168,w:456,h:444,tx:240,ty:192,ta:'middle'},ven:{x:12,y:640,w:456,h:200,tx:28,ty:664,ta:'start'}};
  L.bx={ret:{x:36,y:54,w:150,h:52},dat:{x:286,y:54,w:166,h:52},con:{x:40,y:206,w:360,h:210},mem:{x:52,y:240,w:336,h:56},
    hw:{x:120,y:318,w:200,h:44},sto:{x:28,y:448,w:170,h:56},adm:{x:206,y:448,w:190,h:56},
    srv:{x:204,y:684,w:156,h:52},kms:{x:16,y:684,w:170,h:52},wts:{x:200,y:756,w:200,h:52}};
  L.lo={dat:44,sto:56,srvDy:-12};
  L.pt={datBlk:P(306,80),stoBlk:P(56,476),wtsBlk:P(370,782),kmsKey:P(168,710),
    sD:P(160,258),sK:P(300,258),sW:P(230,258),retC:P(160,80),cp1:P(348,476),cp2:P(380,476),admC:P(360,476),
    gateD:P(160,154),gateW:P(448,626),q:P(220,330),badge:P(204,684)};
  L.w={D:[P(286,80),P(160,80),P(160,240)],W:[P(388,258),P(448,258),P(448,782),P(400,782)],T:[P(320,340),P(424,340),P(424,710),P(360,710)],
    K:[P(186,724),P(204,724)],S:[P(70,448),P(70,296)],Plo:[P(360,448),P(360,416)],Phi:[P(360,416),P(360,296)],C:[P(300,318),P(300,296)]};
  const pt=L.pt;
  L.path={
    dGate:[pt.datBlk,P(286,80),P(160,80),P(160,132)],
    wGate:[pt.wtsBlk,P(400,782),P(448,782),P(448,648)],
    cD:[pt.sD,P(160,283),P(360,283),P(360,296),P(360,448),P(360,476),pt.cp1],
    cW:[pt.sW,P(230,283),P(360,283),P(360,296),P(360,448),P(360,476),pt.cp2],
    probe:[pt.admC,P(360,448),P(360,424)],
    tamper:[pt.admC,P(360,448),P(360,416)],
    rep:[P(300,340),P(320,340),P(424,340),P(424,710),P(360,710),P(340,710)],
    key:[pt.kmsKey,P(168,724),P(186,724),P(204,724),P(360,724),P(360,710),P(424,710),P(424,340),P(320,340),P(300,340),P(300,318),P(300,296),pt.sK],
    sto:[pt.stoBlk,P(70,476),P(70,448),P(70,296),P(70,283),P(230,283),pt.sW],
    toRet:[pt.datBlk,P(286,80),P(186,80),pt.retC],
    prompt:[pt.retC,P(160,106),P(160,240),pt.sD]
  };
  L.tx={conLbl:{x:170,y:224,a:'start'},memLbl:{x:386,y:224,a:'end'},conSt:{x:220,y:390,a:'middle'},
    entTxt:{x:308,y:124,a:'middle'},venTxt:{x:240,y:824,a:'middle'},stoCap:{x:113,y:526,a:'middle'},admTxt:{x:301,y:526,a:'middle'},
    outLbl:{x:406,y:592,a:'end'},cap1:{x:240,y:864},cap2:{x:240,y:890},btn:{x:240,y:922}};
  return L;
}

/* ---------- 画布构建 ---------- */
function el(tag,a,p){const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);(p||svg).appendChild(e);return e}
function tx(x,y,s,size,cls,anchor,p){const t=el('text',{x,y,'font-size':size,class:cls||''},p);if(anchor)t.setAttribute('text-anchor',anchor);t.textContent=T(s,L.mobile);return t}
function grp(show,p,dim){const g=el('g',{class:'vis'},p);if(show)g.dataset.show=show;if(dim)g.dataset.dim=dim;return g}
const C=r=>({x:r.x+r.w/2,y:r.y+r.h/2});
const poly=(pts,cls,p)=>el('polyline',{points:pts.map(q=>q.x+','+q.y).join(' '),class:'ln '+(cls||'')},p);
const ALL='1 2 3 4 5 6 7';

function build(){
  svg.innerHTML='';E={};
  svg.setAttribute('viewBox',`0 0 ${L.W} ${L.H}`);
  const f=L.f,b=L.bx,t=L.tx;
  const defs=el('defs',{});
  defs.innerHTML=SYM.replace(/id="([^"]+)"/g,'id="$1-'+uid+'"');
  const pat=el('pattern',{id:'hatch-'+uid,width:7,height:7,patternUnits:'userSpaceOnUse',patternTransform:'rotate(45)'},defs);
  el('rect',{width:7,height:7,class:'hl1'},pat);el('line',{x1:0,y1:0,x2:0,y2:7,class:'hl2'},pat);

  /* 三栏外框 */
  E.fr={};
  [['ent','企业'],['op','运营者的服务器'],['ven','模型厂商']].forEach(([k,n])=>{const r=L.fr[k];
    E.fr[k]=el('rect',{x:r.x,y:r.y,width:r.w,height:r.h,rx:22,class:'frame'});tx(r.tx,r.ty,n,f.ttl,'ttl',r.ta)});

  /* 容器先画，连线画在它上面，其余方块盖在连线上 */
  E.con=el('rect',{x:b.con.x,y:b.con.y,width:b.con.w,height:b.con.h,rx:16,class:'cbox'});
  E.w={};
  E.w.D=poly(L.w.D,'',grp(ALL,null,'4 5'));
  E.w.W=poly(L.w.W,'',grp(ALL,null,'4 5 6 7'));
  const gT=grp('4 5 6 7',null,'6 7');E.w.T=poly(L.w.T,'',gT);E.w.K=poly(L.w.K,'',gT);
  E.w.S=poly(L.w.S,'',grp('4 5 6 7',null,'6 7'));
  E.w.Plo=poly(L.w.Plo,'',grp(ALL,null,'4 6 7'));
  E.gPhi=grp(ALL,null,'4 6 7');E.w.Phi=poly(L.w.Phi,'',E.gPhi);
  E.w.C=poly(L.w.C,'thin',grp('4 5 6 7'));

  /* 方块 */
  const box=(r,cls,p)=>el('rect',{x:r.x,y:r.y,width:r.w,height:r.h,rx:12,class:cls||'blk'},p);
  const labL=(r,s,p,dx,dy)=>tx(r.x+(dx||14),C(r).y+(dy||0),s,f.lbl,'lbl','start',p);
  const LO=L.lo||{};
  // 企业
  E.gRet=grp('6 7');E.ret=box(b.ret,'blk',E.gRet);labL(b.ret,'检索与组装',E.gRet);
  E.gDat=grp(ALL,null,'4 5');E.dat=box(b.dat,'blk',E.gDat);labL(b.dat,'企业数据',E.gDat,LO.dat);
  // 运营者
  E.conLbl=tx(t.conLbl.x,t.conLbl.y,'',f.sm,'ink2-t st',t.conLbl.a);E.conLbl.style.fontWeight=700;
  const gMem=grp('2 3 4 5 6 7');E.mem=el('rect',{x:b.mem.x,y:b.mem.y,width:b.mem.w,height:b.mem.h,rx:10,class:'mem'},gMem);
  E.memLbl=tx(t.memLbl.x,t.memLbl.y,'内存',f.sm,'ink3-t st',t.memLbl.a,gMem);
  const gHw=grp('4 5 6 7');box(b.hw,'blk',gHw);
  /* 硬件框写「CPU + [NVIDIA] GPU」：GPU 是 NVIDIA 的机密计算模式。右侧 560 / 300 处有报告和钥匙进出，文字整体靠左 */
  {const cy=C(b.hw).y,h=11,w=h*2090/414,lx=L.mobile?188:447;
   tx(lx-6,cy,'CPU +',f.lbl,'lbl','end',gHw);
   el('rect',{x:(lx-3).toFixed(1),y:(cy-h/2-2.5).toFixed(1),width:(w+6).toFixed(1),height:h+5,rx:2,class:'nvbk'},gHw);
   el('use',{href:'#nv-logo-'+uid,x:lx.toFixed(1),y:(cy-h/2).toFixed(1),width:w.toFixed(1),height:h,'aria-label':'NVIDIA'},gHw);
   tx(lx+w+6,cy,'GPU',f.lbl,'lbl','start',gHw);}
  E.conSt=tx(t.conSt.x,t.conSt.y,'',f.sm,'st',t.conSt.a);
  const gSto=grp('4 5 6 7',null,'6');E.gSto=gSto;E.sto=box(b.sto,'blk',gSto);
  /* 「VAST 集群」里的 VAST 用字标原件代替 */
  {const r=b.sto,cy=C(r).y,h=12,w=h*66/14,x=r.x+(L.mobile?62:70);
   E.stoWm=el('use',{href:'#vast-wm-'+uid,x,y:cy-h/2,width:w.toFixed(1),height:h,class:'vwm','aria-label':'VAST'},gSto);
   E.stoTx=tx(x+w+6,cy,'集群',f.lbl,'lbl','start',gSto);E.stoX={x,w,min:L.pt.stoBlk.x+L.pw/2+8,max:r.x+r.w-8}}
  tx(t.stoCap.x,t.stoCap.y,'只存密文',f.sm,'ink3-t',t.stoCap.a,gSto);
  E.gAdm=grp(ALL,null,'4 6');E.adm=box(b.adm,'blk',E.gAdm);labL(b.adm,'主机管理员',E.gAdm);
  E.admTxt=tx(t.admTxt.x,t.admTxt.y,'',f.sm,'st',t.admTxt.a,E.gAdm);
  // 模型厂商
  const gSrv=grp('4 5 6 7');E.gSrv=gSrv;E.srv=box(b.srv,'blk',gSrv);labL(b.srv,'证明服务器',gSrv,LO.srv,LO.srvDy);
  E.kms=box(b.kms,'blk',gSrv);labL(b.kms,'钥匙（KMS）',gSrv,LO.kms);
  E.gWts=grp(ALL);E.wts=box(b.wts,'blk',E.gWts);labL(b.wts,'模型权重',E.gWts,LO.wts);
  E.venTxt=tx(t.venTxt.x,t.venTxt.y,'',f.sm,'st',t.venTxt.a);
  E.entTxt=tx(t.entTxt.x,t.entTxt.y,'',f.sm,'st',t.entTxt.a);
  tx(t.outLbl.x,t.outLbl.y,'只出站',f.sm,'ochre-t',t.outLbl.a,grp('4 5')).style.fontWeight=600;

  /* 第 1 步：两道门、问号 */
  const g1=grp('1');
  [L.pt.gateD,L.pt.gateW].forEach(q=>{el('circle',{cx:q.x,cy:q.y,r:L.gr,class:'gate'},g1);tx(q.x,q.y+1,'✕',f.sm,'gatet','middle',g1)});
  el('circle',{cx:L.pt.q.x,cy:L.pt.q.y,r:22,class:'q'},g1);tx(L.pt.q.x,L.pt.q.y+1,'?',f.q,'qt','middle',g1);
  /* 墙上的「✕」（第 3 步探针被挡回） */
  const wall=L.path.probe[2];E.wallX=el('g',{class:'vis'});E.wallX.style.opacity=0;
  el('circle',{cx:wall.x+(L.mobile?-24:-26),cy:L.bx.con.y+L.bx.con.h,r:L.gr,class:'gate'},E.wallX);
  tx(wall.x+(L.mobile?-24:-26),L.bx.con.y+L.bx.con.h+1,'✕',f.sm,'gatet','middle',E.wallX);
  /* 核验结果徽标 */
  const bq=L.pt.badge;E.badge=el('g',{});E.badge.style.opacity=0;
  E.badgeC=el('circle',{cx:bq.x,cy:bq.y,r:14,class:'badge ok'},E.badge);E.badgeT=tx(bq.x,bq.y+1,'✓',f.sm,'sage-t','middle',E.badge);E.badgeT.style.fontWeight=700;

  /* 底部说明两行 */
  E.cap1=tx(t.cap1.x,t.cap1.y,'',f.cap,'st','middle');E.cap2=tx(t.cap2.x,t.cap2.y,'',f.cap,'st ink3-t','middle');
  btn.style.left=(t.btn.x/L.W*100)+'%';btn.style.top=(t.btn.y/L.H*100)+'%';

  /* 会动的东西 */
  E.pk=el('g',{});
  const M={};
  const blk=(cls)=>{const g=el('g',{class:'mv'},E.pk);el('rect',{x:-L.pw/2,y:-L.ph/2,width:L.pw,height:L.ph,rx:4,class:'body '+cls},g);return g};
  const mk=(kind)=>{let g;
    if(kind==='key'){g=el('g',{class:'mv'},E.pk);el('line',{x1:-2,y1:0,x2:13,y2:0,class:'keyb'},g);el('line',{x1:9,y1:0,x2:9,y2:6,class:'keyb'},g);el('circle',{cx:-7,cy:0,r:7,class:'keyc'},g)}
    else if(kind==='rep'){g=el('g',{class:'mv'},E.pk);el('rect',{x:-11,y:-14,width:22,height:28,rx:3,class:'repb'},g);[-6,0,6].forEach(y=>el('line',{x1:-5,y1:y,x2:5,y2:y,class:'repl'},g))}
    else if(kind==='probe'){g=el('g',{class:'mv'},E.pk);el('circle',{r:7,class:'probe'},g)}
    else if(kind==='wx'){g=blk('phatch');g.firstChild.style.fill='url(#hatch-'+uid+')';const s=el('rect',{x:-L.pw/2,y:-L.ph/2,width:L.pw,height:L.ph,rx:4,class:'pw'},g);g._solid=s}
    else g=blk({d:'pd',w:'pw',pr:'ppr',an:'pan'}[kind]);
    const m={el:g,x:0,y:0,a:0,kind,solid:0,cls:{}};return m};
  M.datO=mk('d');M.wtsO=mk('w');M.stoO=mk('wx');M.kmsO=mk('key');
  M.memD=mk('d');M.memW=mk('wx');
  M.cpD=mk('d');M.cpW=mk('w');M.probe=mk('probe');M.tam=mk('probe');M.rep=mk('rep');M.key=mk('key');M.stoC=mk('wx');
  M.dc=mk('d');M.pr=mk('pr');M.an=mk('an');
  E.M=M;
}

/* ---------- 时间线工具 ---------- */
const sm=u=>u<=0?0:u>=1?1:u*u*(3-2*u);
const ramp=(t,t0,t1)=>Math.max(0,Math.min(1,(t-t0)/(t1-t0)));
function put(m,q){m.x=q.x;m.y=q.y}
function along(m,pts,u){u=Math.max(0,Math.min(1,u));let tot=0;for(let i=1;i<pts.length;i++)tot+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);
  let d=u*tot;for(let i=1;i<pts.length;i++){const a=pts[i-1],c=pts[i],l=Math.hypot(c.x-a.x,c.y-a.y);if(d<=l||i===pts.length-1){const k=l?Math.min(1,d/l):0;m.x=a.x+(c.x-a.x)*k;m.y=a.y+(c.y-a.y)*k;return}d-=l}}
const rev=a=>a.slice().reverse();
function hideAll(){for(const k in E.M){E.M[k].a=0;E.M[k].cls={};E.M[k].solid=0}}

/* 场景状态：每帧由时间线写入，render 统一画 */
function newSim(){S={t:0,conLbl:'',conCls:'',memEnc:false,memLbl:'内存',conSt:['',''],adm:['',''],ven:['',''],ent:['',''],cap:['',''],
  srv:'',kms:'',badge:null,wall:0,wire:{},view:null}}
function cyc(T){const t=S.t%T;S.fade=t>T-0.4?Math.max(0,(T-t)/0.4):t<0.35?t/0.35:1;return t}

/* 第 2 步（以及第 3 步切回普通容器）：管理员把内存里的明文复制走 */
function copyScene(t){const M=E.M,p=L.path;
  S.conLbl='普通容器';S.memLbl='内存';
  put(M.memD,L.pt.sD);M.memD.a=1;put(M.memW,L.pt.sW);M.memW.a=1;M.memW.solid=1;
  // 数据分身 0.6–2.4；权重分身 2.8–4.6
  const c1=M.cpD,c2=M.cpW;
  if(t<0.6){put(c1,L.pt.sD);c1.a=0}else if(t<2.4){along(c1,p.cD,sm((t-0.6)/1.8));c1.a=ramp(t,0.6,0.75);c1.cls.cp=1}else{put(c1,L.pt.cp1);c1.a=1;c1.cls.cp=1}
  if(t<2.8){put(c2,L.pt.sW);c2.a=0}else if(t<4.6){along(c2,p.cW,sm((t-2.8)/1.8));c2.a=ramp(t,2.8,2.95);c2.cls.cp=1}else{put(c2,L.pt.cp2);c2.a=1;c2.cls.cp=1}
  const moving=(t>0.6&&t<2.4)||(t>2.8&&t<4.6);S.wire.Plo=S.wire.Phi=moving?'rose':'';
  S.adm=t>2.4?['拿到明文','rose-t']:['',''];
}
/* 第 3 步：机密环境，探针被挡回 */
function bounceScene(t){const M=E.M,p=L.path;
  S.conLbl='机密环境（CVM）';S.conCls='enc';S.memEnc=true;S.memLbl=L.mobile?'加密内存':'内存（加密）';
  put(M.memD,L.pt.sD);M.memD.a=1;put(M.memW,L.pt.sW);M.memW.a=1;M.memW.solid=1;
  const pr=M.probe,T=4.2,u=t%T;
  if(u<0.5){put(pr,L.pt.admC);pr.a=0}
  else if(u<1.5){along(pr,p.probe,sm((u-0.5)/1.0));pr.a=ramp(u,0.5,0.62)}
  else if(u<2.5){along(pr,p.probe,1-sm((u-1.5)/1.0));pr.a=1}
  else{put(pr,L.pt.admC);pr.a=1-ramp(u,2.5,2.8)}
  S.wall=u>1.4&&u<2.6?1:0;S.wire.Plo=u>0.5&&u<2.5?'rose':'';
  S.adm=t>1.5?['抓不到','sage-t']:['',''];
}
/* 第 4、5 步：先验证、后给钥匙 */
function attestScene(t,bad){const M=E.M,p=L.path;
  S.conLbl='机密环境（CVM）';S.conCls='enc';S.memEnc=true;S.memLbl=L.mobile?'加密内存':'内存（加密）';
  put(M.stoO,L.pt.stoBlk);M.stoO.a=1;put(M.kmsO,L.pt.kmsKey);M.kmsO.a=1;
  S.conSt=['空手启动，没有钥匙','ink3-t'];
  let t0=0;
  if(bad){ // 管理员先改了策略
    const d=M.tam;if(t<0.3){put(d,L.pt.admC);d.a=0}else if(t<1.4){along(d,p.tamper,sm((t-0.3)/1.1));d.a=ramp(t,0.3,0.45)}else{put(d,p.tamper[2]);d.a=1-ramp(t,1.4,1.7)}
    S.wire.Plo=t>0.3&&t<1.5?'rose':'';
    if(t>1.4){S.conCls='bad';S.conSt=['主机改了策略','rose-t'];S.adm=['改了策略','rose-t']}
    t0=1.6;
  }
  const r=M.rep;r.cls.bad=bad?1:0;
  const a=t0+0.5,b=t0+2.3;
  if(t<a){put(r,p.rep[0]);r.a=0}else if(t<b){along(r,p.rep,sm((t-a)/1.8));r.a=ramp(t,a,a+0.15)}else{put(r,p.rep[p.rep.length-1]);r.a=1-ramp(t,b+0.6,b+0.9)}
  if(t>a&&t<b)S.wire.T='ochre';
  if(t>=b&&t<b+0.8)S.srv='chk';
  if(t>=b+0.8){S.srv=bad?'bad':'ok';S.badge=bad?'bad':'ok';
    S.ven=bad?['与登记值不符，不放钥匙','rose-t']:['核验通过，放钥匙','sage-t']}
  const k=M.key,ka=b+0.9,kb=ka+2.2;
  if(bad){k.a=0;put(M.stoC,L.pt.stoBlk);M.stoC.a=0;
    if(t>=b+0.8)S.conSt=['拿不到钥匙，起不来','rose-t'];return}
  if(t<ka){put(k,L.pt.kmsKey);k.a=0}else if(t<kb){along(k,p.key,sm((t-ka)/2.2));k.a=ramp(t,ka,ka+0.15)}else{put(k,L.pt.sK);k.a=1-ramp(t,kb+1.9,kb+2.3)}
  if(t>ka&&t<kb){S.wire.T='ochre';S.wire.K='ochre'}
  const s=M.stoC,sa=kb+0.2,sb=sa+1.8;
  if(t<sa){put(s,L.pt.stoBlk);s.a=0}else if(t<sb){along(s,p.sto,sm((t-sa)/1.8));s.a=ramp(t,sa,sa+0.15)}else{put(s,L.pt.sW);s.a=1}
  s.solid=ramp(t,sb,sb+0.6);
  if(t>sa&&t<sb)S.wire.S='slate';
  if(t>=kb)S.conSt=['钥匙到了，等权重进来','ochre-t'];
  if(t>=sb)S.conSt=['在受保护内存里解密','sage-t'];
}
/* 第 6、7 步：模型来找数据 */
function serveScene(t,T){const M=E.M,p=L.path;
  S.conLbl='机密环境（CVM）';S.conCls='enc';S.memEnc=true;S.memLbl=L.mobile?'加密内存':'内存（加密）';
  put(M.memW,L.pt.sW);M.memW.a=1;M.memW.solid=1;put(M.stoO,L.pt.stoBlk);M.stoO.a=1;put(M.kmsO,L.pt.kmsKey);M.kmsO.a=1;
  const k=T/8;
  const dc=M.dc,pr=M.pr,an=M.an;
  if(t<0.4*k){put(dc,L.pt.datBlk);dc.a=0}else if(t<1.6*k){along(dc,p.toRet,sm((t-0.4*k)/(1.2*k)));dc.a=ramp(t,0.4*k,0.55*k)}else{put(dc,L.pt.retC);dc.a=1-ramp(t,1.6*k,1.9*k)}
  if(t<1.8*k){put(pr,L.pt.retC);pr.a=0}else if(t<3.3*k){along(pr,p.prompt,sm((t-1.8*k)/(1.5*k)));pr.a=ramp(t,1.8*k,2.0*k)}else{put(pr,L.pt.sD);pr.a=1-ramp(t,4.2*k,4.5*k)}
  M.memW.cls.think=t>3.3*k&&t<4.4*k?1:0;
  if(t<4.4*k){put(an,L.pt.sD);an.a=0}else if(t<5.9*k){along(an,rev(p.prompt),sm((t-4.4*k)/(1.5*k)));an.a=ramp(t,4.4*k,4.6*k)}else{put(an,L.pt.retC);an.a=1-ramp(t,7.0*k,7.5*k)}
  if((t>0.4*k&&t<1.6*k)||(t>1.8*k&&t<3.3*k)||(t>4.4*k&&t<5.9*k))S.wire.D='slate';
  S.ent=['只递 prompt，拿回回答','slate-t'];
  S.conSt=t>3.3*k&&t<4.6*k?['模型只看到这段 prompt','sage-t']:['模型就绪','sage-t'];
}

const MODES={
  0:{pre(){const M=E.M,T=6.4,t=cyc(T);
      S.conLbl='';
      put(M.datO,L.pt.datBlk);put(M.wtsO,L.pt.wtsBlk);
      // 两块资产各自沿线走到门口，停住，退回
      const go=(m,path,o)=>{const u=t-o;if(u<0.4)along(m,path,0);else if(u<1.8)along(m,path,sm((u-0.4)/1.4));else if(u<2.8)along(m,path,1);else if(u<4.2)along(m,path,1-sm((u-2.8)/1.4));else along(m,path,0)};
      go(M.datO,L.path.dGate,0);go(M.wtsO,L.path.wGate,0.7);
      S.ent=['数据不能出门','rose-t'];S.ven=['权重不肯交出去','rose-t'];S.adm=['默认能看内存','rose-t'];S.wire.Plo=S.wire.Phi='rose';S.fade=1}},
  1:{pre(){const t=cyc(7.4);copyScene(t)}},
  2:{pre(){if(enc){const t=cyc(8.4);bounceScene(t);S.cap=['机密环境：同样的抓取被硬件挡回去，拿不到内容','sage-t']}
      else{const t=cyc(7.4);copyScene(t);S.cap=['普通容器：管理员能把内存里的明文复制出来','rose-t']}}},
  3:{pre(){const t=cyc(10.6);attestScene(t,false)}},
  4:{pre(){if(tamper){const t=cyc(8.4);attestScene(t,true);S.cap=['策略被改：报告和登记的对不上，钥匙一把都不放','rose-t']}
      else{const t=cyc(10.6);attestScene(t,false);S.cap=['策略原样：核验通过，钥匙放进去','sage-t']}}},
  5:{pre(){const t=cyc(8.4);serveScene(t,8.4)}},
  6:{pre(){const T=11,t=cyc(T);serveScene(t,T);S.ent=['',''];
      if(!viewManual)view=Math.floor(Math.max(0,S.t)/3.8)%3;
      S.view=VIEWS[view];
      S.cap=({ent:['企业看得到：自己的数据、prompt 和回答','sage-t','看不到：模型权重'],
        ven:['模型厂商看得到：自己的模型权重','sage-t','看不到：企业的数据、prompt 和回答'],
        op:['运营者两样都看不到','sage-t','只能决定跑不跑，随时可以停掉负载']})[S.view];
      S.conSt=['',''];
      if(S.view==='op')S.adm=['看不到内容','ink2-t']}}
};

/* ---------- 渲染 ---------- */
function render(){
  const M=E.M,fade=S.fade==null?1:S.fade;
  // 第 7 步：按视角调暗
  const v=S.view;
  const dimOf={datO:v&&v!=='ent',memD:0,dc:v&&v!=='ent',pr:v&&v!=='ent',an:v&&v!=='ent',memW:v&&v!=='ven',wtsO:v&&v!=='ven',stoO:!!v,kmsO:v&&v!=='ven'};
  for(const k in M){const m=M[k];m.el.setAttribute('transform',`translate(${m.x.toFixed(1)} ${m.y.toFixed(1)})`);
    const keep=k==='datO'||k==='wtsO'||k==='stoO'||k==='kmsO'||(k==='memW'&&step>=5);
    let a=keep?m.a:m.a*fade;if(dimOf[k])a*=0.16;if(k==='datO'&&(step===3||step===4))a*=0.22;
    m.el.style.opacity=a;
    m.el.classList.toggle('cp',!!m.cls.cp);m.el.classList.toggle('bad',!!m.cls.bad);m.el.classList.toggle('think',!!m.cls.think);
    if(m.el._solid)m.el._solid.style.opacity=m.solid}
  E.con.setAttribute('class','cbox'+(S.conCls?' '+S.conCls:''));
  E.mem.setAttribute('class','mem'+(S.memEnc?' enc':''));
  E.conLbl.textContent=T(S.conLbl,L.mobile);E.conLbl.setAttribute('class','st '+(S.conCls==='enc'?'sage-t':S.conCls==='bad'?'rose-t':'ink2-t'));
  E.memLbl.textContent=T(S.memLbl,L.mobile);
  const txt=(e,v,f)=>{e.textContent=T(v[0],L.mobile);e.setAttribute('class','st '+(v[1]||''));e.style.opacity=f==null?1:f};
  txt(E.conSt,S.conSt,fade);txt(E.admTxt,S.adm,fade);txt(E.venTxt,S.ven,fade);txt(E.entTxt,S.ent);
  txt(E.cap1,S.cap);E.cap2.textContent=T(S.cap[2]||'',L.mobile);
  E.srv.setAttribute('class','blk'+(S.srv?' '+S.srv:''));
  E.badge.style.opacity=S.badge?fade:0;
  if(S.badge){E.badgeC.setAttribute('class','badge '+S.badge);E.badgeT.textContent=S.badge==='ok'?'✓':'✕';E.badgeT.setAttribute('class',S.badge==='ok'?'sage-t':'rose-t')}
  E.wallX.style.opacity=S.wall;
  ['D','W','T','K','S','Plo','Phi'].forEach(k=>E.w[k].setAttribute('class','ln '+(S.wire[k]||'')));
  E.w.D.classList.toggle('vdim',!!v&&v!=='ent');
  // 机密环境里，管理员到内存的那一段不通
  E.gPhi.classList.toggle('dim',step>=3||(step===2&&enc));
  // 视角高亮
  E.fr.ent.classList.toggle('view',v==='ent');E.fr.ven.classList.toggle('view',v==='ven');E.fr.op.classList.toggle('view',v==='op');
  E.adm.setAttribute('class','blk'+(v==='op'?' view':''));E.gAdm.classList.toggle('vdim',!!v&&v!=='op');
  [[E.gDat,'ent'],[E.gRet,'ent'],[E.gWts,'ven'],[E.gSrv,'ven']].forEach(([e,who])=>e.classList.toggle('vdim',!!v&&v!==who));
  E.gSto.classList.toggle('vdim',!!v);
  if(step===6)setBtn();
}
function applyVis(){
  svg.setAttribute('data-step',step+1);
  svg.querySelectorAll('[data-show]').forEach(g=>g.classList.toggle('hid',!g.dataset.show.split(' ').includes(String(step+1))));
  svg.querySelectorAll('[data-dim]').forEach(g=>g.classList.toggle('dim',g.dataset.dim.split(' ').includes(String(step+1))));
  btn.hidden=!(step===2||step===4||step===6);
  setBtn();
}
function setBtn(){
  let s='';
  if(step===2)s=enc?'⇄ 换回普通容器':'⇄ 换成机密环境';
  else if(step===4)s=tamper?'⇄ 恢复原策略':'⇄ 模拟策略被改';
  else if(step===6)s='⇄ 换到'+{ent:'模型厂商',ven:'运营者',op:'企业'}[VIEWS[view]]+'视角';
  s=T(s);if(btn.textContent!==s){btn.textContent=s;btn.setAttribute('aria-label',s.replace('⇄ ',''))}
}
btn.addEventListener('click',()=>{
  if(step===2){enc=!enc;restart()}
  else if(step===4){tamper=!tamper;restart()}
  else if(step===6){viewManual=true;view=(view+1)%3;setBtn()}
});

let raf=0,last=0,paused=!!opts.paused,dead=false;
function tick(dt){S.t+=dt;S.conCls='';S.memEnc=false;S.conSt=['',''];S.adm=['',''];S.ven=['',''];S.ent=['',''];S.cap=['',''];S.srv='';S.badge=null;S.wall=0;S.wire={};S.view=null;
  hideAll();const M=E.M;put(M.datO,L.pt.datBlk);M.datO.a=1;put(M.wtsO,L.pt.wtsBlk);M.wtsO.a=1;S.fade=1;MODES[step].pre(dt)}
function loop(now){const dt=Math.max(0,Math.min(0.05,(now-last)/1000||0));last=now;tick(dt);render();raf=requestAnimationFrame(loop)}
function run(){cancelAnimationFrame(raf);if(paused||dead||reduce)return;last=performance.now();raf=requestAnimationFrame(loop)}
function restart(){cancelAnimationFrame(raf);newSim();applyVis();
  if(reduce){const lim=[2.2,4.8,2.0,9.0,4.6,4.0,4.0][step];for(let t=0;t<lim;t+=1/60)tick(1/60);render();return}
  tick(0);render();run()}
/* 「VAST 集群」一行：英文「cluster」比「集群」长，放不下时整行往左挪，不出框也不压密文块 */
function placeSto(){const o=E.stoX;if(!o)return;try{const tw=E.stoTx.getComputedTextLength(),x=Math.max(o.min,Math.min(o.x,o.max-tw-6-o.w));
  E.stoWm.setAttribute('x',x.toFixed(1));E.stoTx.setAttribute('x',(x+o.w+6).toFixed(1))}catch(e){}}
function enter(i){step=i;viewManual=false;view=0;placeSto();restart()}
function label(){svg.setAttribute('aria-label',T('企业、运营者的服务器、模型厂商三方：机密环境如何先验证、后给钥匙'))}
function rebuild(){L=layout(mq.matches);build();label();if(opts.onLayout)opts.onLayout(L.W/L.H,L.mobile);enter(step)}
mq.addEventListener('change',rebuild);
const onLang=()=>rebuild();document.addEventListener('ss-lang',onLang);
L=layout(mq.matches);build();label();newSim();if(opts.onLayout)opts.onLayout(L.W/L.H,L.mobile);
const ctrl={
  show(i){enter(Math.max(0,Math.min(6,i)))},
  pause(){paused=true;cancelAnimationFrame(raf)},
  resume(){if(!paused)return;paused=false;run()},
  destroy(){dead=true;cancelAnimationFrame(raf);mq.removeEventListener('change',rebuild);document.removeEventListener('ss-lang',onLang);host.innerHTML='';host.classList.remove('v-enclave')},
  ratio(){return L.W/L.H},
  step(){return step},
  sim(){return {step,t:+S.t.toFixed(2),enc,tamper,view:VIEWS[view],conSt:S.conSt[0],ven:S.ven[0],adm:S.adm[0]}}
};
host.__anim=ctrl;
return ctrl;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim['v-enclave']={steps:7,mount:mount};
})();
