/* 双语 SVG 动画。页面管理步进，移动设备重新排布，减少动态效果时保留结果帧。 */
(function(){
const id='d-ss9024';
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
    "disk": "M1 1H31V25H1Z M9 13A7 7 0 1 0 23 13A7 7 0 1 0 9 13 M16 13L23 8 M45 1H76V25H45Z M52 8H69 M52 17H69",
    "server": "M1 0H77V11H1Z M1 15H77V26H1Z M7 5.5H11 M7 20.5H11 M51 5.5H71 M51 20.5H71",
    "network": "M1 2H77V24H1Z M8 8H19V18H8Z M25 8H36V18H25Z M42 8H53V18H42Z M59 8H70V18H59Z",
    "power": "M1 1H31V25H1Z M18 4L10 14H19L13 22 M54 13A12 12 0 1 0 78 13A12 12 0 1 0 54 13 M66 13L66 5 M66 13L73 17 M66 13L59 17"
  };
  const scenes=[
    [['客户端经文件服务和 SAS 控制器访问盘柜','The client reaches the shelf through file services and the SAS controller'],()=>{
      const client=node(xy([138,152],[220,64]),['文件客户端','File Client'],{sub:['文件 I/O','File I/O'],w:xy(206,238)});
      const es=node(xy([448,152],[220,211]),'ES400NVX2',{sub:['存储控制器','Storage Controllers'],art:'server',w:xy(225,238),tone:'focus'});
      const shelf=node(xy([758,152],[220,361]),'SS9024',{sub:['SAS 盘','SAS Drives'],art:'disk',w:xy(221,238),tone:'accent'});
      link(shelf,es,{tag:'SAS-4',at:xy([604,122,'middle'],[242,288,'start']),delay:.2,duration:1.3});
      link(es,client,{delay:1.5,duration:1.3});
    }],
    [['SS9024 内的 SAS 介质、输入输出模块和供电散热','SAS media, I/O modules, power, and cooling inside the SS9024'],()=>{
      chassis(...xy([55,43,790,230],[18,28,404,407]),'SS9024');
      const io=node(xy([196,170],[220,129]),['两块 SAS-4 模块','Dual SAS-4 Modules'],{art:'network',w:xy(223,263),tone:'focus'});
      const drives=node(xy([455,170],[220,254]),['90 个盘位','90 Drive Bays'],{sub:['SAS 硬盘或固态盘','SAS HDDs or SSDs'],art:'disk',w:xy(220,263),tone:'accent'});
      const power=node(xy([712,170],[220,371]),['冗余电源和风扇','Power and Cooling'],{sub:['冗余设计','Redundant'],art:'power',w:xy(241,263)});
      effects.push((t,still)=>{
        io.group.classList.toggle('focus',still||t>=.3);
        drives.group.classList.toggle('accent',still||t>=.85);
        power.group.classList.toggle('focus',still||t>=1.4);
      });
    }],
    [['两路 SAS 连接，单路中断后仍有后端路径','Two SAS paths leave a back-end route when one is interrupted'],()=>{
      const es=node(xy([145,158],[220,61]),['存储控制器','Storage Controllers'],{w:xy(218,244)});
      const a=node(xy([450,79],[113,204]),['I/O 模块 A','I/O Module A'],{sub:['路径中断','Path Unavailable'],w:xy(213,187)});
      const b=node(xy([450,238],[327,204]),['I/O 模块 B','I/O Module B'],{w:xy(213,187),tone:'accent'});
      const disk=node(xy([752,158],[220,356]),'SS9024',{sub:['同一组 SAS 盘','Same SAS Drives'],art:'disk',w:xy(222,250)});
      const port=(n,side)=>({...n,x:n.x+(mobile?side*34:0),y:n.y+(mobile?0:side*23)});
      const offAt=1.55;
      link(port(disk,-1),a,{tone:'signal',delay:.18,duration:1.2,offAt});
      link(a,port(es,-1),{tone:'signal',delay:1.38,offAt});
      link(port(disk,1),b,{delay:1.72});
      link(b,port(es,1),{delay:2.92});
      const offline=a.group.querySelector('.muted');
      effects.push(t=>{
        a.group.classList.toggle('failure',t>=offAt);
        offline.setAttribute('visibility',t>=offAt?'visible':'hidden');
      });
    }],
    [['Hot Pools 先复制到硬盘池，再清理闪存副本','Hot Pools copies the file to the disk pool before removing the flash copy'],()=>{
      const flash=node(xy([180,214],[168,107]),['闪存池','Flash Pool'],{sub:['访问热度较低','Lower Activity'],w:xy(223,230)});
      const policy=node(xy([450,76],[317,219]),'Hot Pools',{sub:['EXAScaler 策略','EXAScaler Policy'],w:xy(230,196),tone:'focus'});
      const disk=node(xy([720,214],[168,337]),['SAS 硬盘池','SAS Disk Pool'],{sub:'SS9024',w:xy(223,230),tone:'accent'});
      link(policy,{x:xy(450,168),y:xy(214,221),w:0,h:0},{axis:xy('y','x'),tone:'signal',packet:0});
      link(flash,disk,{delay:.65,duration:1.9,rest:false});
      const copy=n=>rect(overlay,n.x+n.w/2-35,n.y-7,17,12,'packet',2);
      const original=copy(flash),replica=copy(disk);
      effects.push(t=>{
        original.setAttribute('visibility',t<3.8?'visible':'hidden');
        replica.setAttribute('visibility',t>=2.55?'visible':'hidden');
      });
    }],
    [['SS9024 与 SS9012 各接适配的 SAS 控制器','SS9024 and SS9012 attach to compatible SAS controllers'],()=>{
      const first=node(xy([213,94],[108,106]),'ES400NVX2',{sub:'SAS-4',w:xy(226,169)});
      const shelf=node(xy([695,94],[331,106]),'SS9024',{sub:['SAS-4 盘柜','SAS-4 Shelf'],art:'disk',w:xy(222,169),tone:'accent'});
      const other=node(xy([213,236],[108,305]),['兼容控制器','SAS Host'],{sub:['SAS 后端','SAS Back End'],w:xy(226,169)});
      const second=node(xy([695,236],[331,305]),'SS9012',{sub:['SAS 盘柜','SAS Shelf'],art:'disk',w:xy(222,169)});
      link(first,shelf,{axis:'x',tag:'SAS-4',at:xy([456,64,'middle'],[220,33,'middle']),packet:0});
      link(other,second,{axis:'x',tag:'SAS',at:xy([456,206,'middle'],[220,232,'middle']),tone:'signal',packet:0});
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
