/* 双语 SVG 动画。页面管理步进，移动设备重新排布，减少动态效果时保留结果帧。 */
(function(){
const id='d-se2420';
const ns='http://www.w3.org/2000/svg';
const note=['示意，不代表实测数字','Schematic, not measured'];
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));

function mount(host,{paused=false,onLayout}={}){
  const viewport=matchMedia('(max-width: 640px)');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const svg=document.createElementNS(ns,'svg');
  svg.setAttribute('role','img');
  host.classList.add(id+'-figure');
  host.replaceChildren(svg);
  let mobile,W,H,step=0,elapsed,previous,raf,tracks,effects,wires,parts,overlay;

  const T=value=>Array.isArray(value)?value[window.SS_LANG==='en'?1:0]:value;
  const xy=(desktop,phone)=>mobile?phone:desktop;
  function el(tag,attrs,parent){
    const item=document.createElementNS(ns,tag);
    for(const [key,value] of Object.entries(attrs))item.setAttribute(key,value);
    parent.appendChild(item);
    return item;
  }
  function label(parent,x,y,value,style='',align='start'){
    const item=el('text',{x,y,class:style,'text-anchor':align},parent);
    item.textContent=T(value);
    return item;
  }
  function rect(parent,x,y,width,height,style,rx=4){
    return el('rect',{x,y,width,height,rx,class:style},parent);
  }
  function chassis(x,y,w,h,title){
    const group=el('g',{},wires);
    rect(group,x,y,w,h,'chassis');
    label(group,x+18,y+31,title,'name');
  }
  function node([x,y],title,{sub,art,w=xy(200,204),h=art?108:76,tone=''}={}){
    const group=el('g',{class:'node '+tone},parts);
    const left=x-w/2,top=y-h/2;
    rect(group,left,top,w,h,'body');
    const tx=left+16;
    if(art)el('path',{d:glyphs[art],transform:'translate('+tx+' '+(top+17)+')',class:'glyph'},group);
    label(group,tx,y+(art?9:0)-(sub&&!art?11:0),title,'name');
    if(sub)label(group,tx,y+(art?34:16),sub,'muted');
    return {x,y,w,h,group};
  }
  function link(a,b,{axis=xy('x','y'),tone='data',tag,at,delay=0,duration=1.2,packet=14,back=0,rest=true,offAt=Infinity}={}){
    const sign=Math.sign(b[axis]-a[axis]);
    const horizontal=axis==='x';
    const start=horizontal?[a.x+sign*a.w/2,a.y]:[a.x,a.y+sign*a.h/2];
    const end=horizontal?[b.x-sign*b.w/2,b.y]:[b.x,b.y-sign*b.h/2];
    const mid=(start[horizontal?0:1]+end[horizontal?0:1])/2;
    const via=horizontal?`H${mid} V${end[1]}`:`V${mid} H${end[0]}`;
    const group=el('g',{class:'link '+tone},wires);
    const path=el('path',{d:`M${start.join(' ')} ${via} L${end.join(' ')}`,class:'wire'},group);
    const length=path.getTotalLength();
    function tip(reverse){
      const head=path.getPointAtLength(reverse?3:length-3);
      const tail=path.getPointAtLength(reverse?11:length-11);
      const angle=Math.atan2(head.y-tail.y,head.x-tail.x)*180/Math.PI;
      el('path',{d:'M-7 -4 L0 0 L-7 4',transform:`translate(${head.x} ${head.y}) rotate(${angle})`,class:'wire'},group);
    }
    if(length>=12){tip(false);if(back)tip(true)}
    if(tag)label(group,at[0],at[1],tag,'muted',at[2]);
    const token=packet?rect(overlay,-packet/2,-5,packet,10,'packet '+tone,2):null;
    tracks.push({group,path,length,token,delay,duration,back,rest,offAt});
  }
  function draw(t,still){
    for(const {group,path,length,token,delay,duration,back,rest,offAt} of tracks){
      const off=t>=offAt;
      group.classList.toggle('down',off);
      if(!token)continue;
      const outbound=t-delay;
      const reverse=back>0&&t>=back;
      const phase=reverse?t-back:outbound;
      const p=still?.83:clamp(phase/duration,0,1);
      const point=path.getPointAtLength(length*(reverse?1-p:p));
      const fade=phase<=duration?clamp(phase/.18,0,1):clamp(1-(phase-duration)/.26,0,1);
      token.setAttribute('opacity',off?0:still?Number(rest):fade);
      token.setAttribute('transform',`translate(${point.x} ${point.y})`);
    }
    effects.forEach(effect=>effect(t,still));
  }
  function frame(now){
    elapsed+=Math.min(.08,Math.max(0,now-previous)/1000);
    previous=now;
    draw(elapsed%5.8,false);
    raf=requestAnimationFrame(frame);
  }
  function play(){
    cancelAnimationFrame(raf);
    if(paused||motion.matches)return;
    previous=performance.now();
    raf=requestAnimationFrame(frame);
  }

  const glyphs={
    "shelf": "M1 0H77V25H1Z M10 5V20 M17 5V20 M24 5V20 M31 5V20 M38 5V20 M45 5V20 M52 5V20 M59 5V20 M66 5V20",
    "disk": "M1 1H31V25H1Z M9 13A7 7 0 1 0 23 13A7 7 0 1 0 9 13 M16 13L23 8 M45 1H76V25H45Z M52 8H69 M52 17H69",
    "server": "M1 0H77V11H1Z M1 15H77V26H1Z M7 5.5H11 M7 20.5H11 M51 5.5H71 M51 20.5H71",
    "file": "M1 2H20L28 10V25H1Z M20 2V10H28 M37 2H56L64 10V25H37Z M56 2V10H64 M7 15H21 M7 20H18 M43 15H57 M43 20H54"
  };
  function endpoints(){
    const client=node(xy([140,153],[220,66]),['文件客户端','File Client'],{sub:['文件 I/O','File I/O'],w:xy(194,236)});
    const es=node(xy([450,153],[220,211]),'ES400NVX2',{sub:'EXAScaler',art:'server',w:xy(220,236),tone:'focus'});
    const shelf=node(xy([760,153],[220,378]),'SE2420',{sub:['QLC 固态盘','QLC SSDs'],art:'shelf',w:xy(208,236),tone:'accent'});
    return {client,es,shelf};
  }
  const scenes=[
    [['客户端通过 ES400NVX2 访问 SE2420','The client reaches the SE2420 through the ES400NVX2'],()=>{
      const {client,es,shelf}=endpoints();
      link(client,es,{tone:'signal',packet:9,rest:false});
      link(es,shelf,{tone:'signal',delay:1.2,packet:9});
      const returnPort=part=>({...part,x:part.x+(mobile?14:0),y:part.y+(mobile?0:14)});
      link(returnPort(shelf),returnPort(es),{delay:2.4});
      link(returnPort(es),returnPort(client),{delay:3.6});
    }],
    [['SE2420 的两块输入输出模块与 U.2 盘位','The two SE2420 I/O modules and its U.2 bays'],()=>{
      chassis(...xy([76,42,748,250],[18,28,404,395]),'SE2420');
      const a=node(xy([254,122],[117,143]),['I/O 模块 A','I/O Module A'],{w:xy(211,166),h:68,tone:'focus'});
      const b=node(xy([646,122],[323,143]),['I/O 模块 B','I/O Module B'],{w:xy(211,166),h:68,tone:'focus'});
      const drive=node(xy([450,226],[220,331]),['24 个 U.2 盘位','24 U.2 Bays'],{sub:['QLC 固态盘','QLC SSDs'],art:'shelf',w:xy(244,242),tone:'accent'});
      const port=side=>({...drive,x:drive.x+side*36});
      link(a,port(-1),{axis:'y',tone:'signal',delay:.15});
      link(b,port(1),{axis:'y',tone:'signal',delay:.35});
    }],
    [['前端是文件 I/O，后端是以太网上的 NVMe-oF','Front-end file I/O and back-end NVMe-oF on Ethernet'],()=>{
      const {client,es,shelf}=endpoints();
      link(client,es,{tone:'idle',packet:0});
      link(es,shelf,{tone:'data',duration:1.45,back:2.05,
        tag:xy('NVMe-oF',['NVMe-oF · 以太网','NVMe-oF · Ethernet']),at:xy([610,117,'middle'],[236,296,'start'])});
      if(!mobile)label(overlay,610,189,['以太网','Ethernet'],'muted','middle');
    }],
    [['EXAScaler 压缩文件数据再写入扩展柜','EXAScaler compresses file data before writing to the shelf'],()=>{
      const client=node(xy([140,153],[220,62]),['EXAScaler 客户端','EXAScaler Client'],{sub:['数据压缩','Data Compression'],w:xy(228,260),h:94,tone:'focus'});
      const controller=node(xy([450,153],[220,209]),['存储控制器','Storage Controller'],{sub:'ES400NVX2',w:xy(218,260)});
      const shelf=node(xy([760,153],[220,353]),'SE2420',{sub:['QLC 固态盘','QLC SSDs'],art:'shelf',w:xy(208,236),tone:'accent'});
      link(client,controller,{packet:15,delay:1.05,rest:false,
        tag:['存储网络','Storage Network'],at:xy([298,85,'middle'],[236,139,'start'])});
      link(controller,shelf,{packet:15,delay:2.27,rest:false,
        tag:'NVMe-oF',at:xy([603,85,'middle'],[236,279,'start'])});
      const block=rect(overlay,client.x-16,client.y+30,32,10,'packet',2);
      const written=rect(overlay,shelf.x+shelf.w/2-35,shelf.y+21,15,10,'packet',2);
      effects.push((t,still)=>{
        block.setAttribute('width',still?15:32-17*clamp((t-.25)/.65,0,1));
        block.setAttribute('visibility',still||t<1.06?'visible':'hidden');
        written.setAttribute('visibility',still||t>=3.47?'visible':'hidden');
      });
    }],
    [['NVMe-oF 和 SAS 的后端适配关系','Back-end attachment for NVMe-oF and SAS'],()=>{
      const es=node(xy([210,94],[108,100]),'ES400NVX2',{sub:['文件系统端','File System'],w:xy(230,169)});
      const flash=node(xy([699,94],[333,100]),'SE2420',{sub:['QLC 固态盘','QLC SSDs'],art:'shelf',w:xy(218,166),tone:'accent'});
      const sas=node(xy([210,233],[108,310]),['兼容控制器','SAS Host'],{sub:'SAS-4',w:xy(230,169)});
      const disk=node(xy([699,233],[333,310]),'SS9024',{sub:['SAS 盘','SAS Drives'],art:'disk',w:xy(218,166)});
      link(es,flash,{axis:'x',tag:'NVMe-oF',at:xy([460,66,'middle'],[222,29,'middle']),packet:0});
      link(sas,disk,{axis:'x',tag:'SAS',at:xy([460,205,'middle'],[222,239,'middle']),tone:'signal',packet:0});
    }]
  ];

  function render(){
    mobile=viewport.matches;
    W=xy(900,440);
    H=xy(332,470);
    svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
    svg.replaceChildren();
    wires=el('g',{},svg);
    parts=el('g',{},svg);
    overlay=el('g',{},svg);
    tracks=[];
    effects=[];
    const scene=scenes[step];
    svg.setAttribute('aria-label',T(scene[0]));
    scene[1]();
    label(svg,xy(36,20),H-18,note,'muted');
    elapsed=0;
    draw(motion.matches?4.45:0,motion.matches);
    play();
    onLayout?.(W/H,mobile);
  }
  viewport.addEventListener('change',render);
  motion.addEventListener('change',render);
  document.addEventListener('ss-lang',render);
  const control={
    show(i){step=clamp(i,0,scenes.length-1);render()},
    pause(){paused=true;cancelAnimationFrame(raf)},
    resume(){if(paused){paused=false;play()}},
    destroy(){
      this.pause();
      viewport.removeEventListener('change',render);
      motion.removeEventListener('change',render);
      document.removeEventListener('ss-lang',render);
      host.replaceChildren();
      host.classList.remove(id+'-figure');
      delete host.__anim;
    },
    ratio(){return W/H},
    step(){return step}
  };
  host.__anim=control;
  render();
  return control;
}
window.SSAnim=window.SSAnim||{};
window.SSAnim[id]={steps:5,mount};
})();
