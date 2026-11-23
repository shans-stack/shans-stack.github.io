/* 双语 SVG 动画。页面管理步进，移动设备重新排布，减少动态效果时保留结果帧。 */
(function(){
const id='d-ai2x00';
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
    "server": "M1 0H77V11H1Z M1 15H77V26H1Z M7 5.5H11 M7 20.5H11 M51 5.5H71 M51 20.5H71",
    "chip": "M11 2H37V24H11Z M17 7H31V19H17Z M4 6H11 M4 13H11 M4 20H11 M37 6H44 M37 13H44 M37 20H44 M53 2H77V24H53Z M59 7V19 M65 7V19 M71 7V19",
    "file": "M1 2H20L28 10V25H1Z M20 2V10H28 M37 2H56L64 10V25H37Z M56 2V10H64 M7 15H21 M7 20H18 M43 15H57 M43 20H54",
    "network": "M1 2H77V24H1Z M8 8H19V18H8Z M25 8H36V18H25Z M42 8H53V18H42Z M59 8H70V18H59Z"
  };
  const scenes=[
    [['Infinia 存储设备经网络向推理服务器提供模型数据','Infinia serves model data to inference servers over the network'],()=>{
      const storage=node(xy([146,154],[220,73]),'AI2000 / AI2200',{sub:'Infinia',art:'shelf',w:xy(218,248),tone:'accent'});
      const net=node(xy([450,154],[220,215]),['存储网络','Storage Network'],{w:xy(204,248)});
      const compute=node(xy([751,154],[220,352]),['推理服务器','Inference Server'],{sub:['运行模型','Runs the Model'],art:'chip',w:xy(220,248)});
      link(storage,net,{duration:1.4});
      link(net,compute,{delay:1.4,duration:1.4});
    }],
    [['节点内的数据经过网卡、处理器与固态盘','Data flows through the node’s network adapter, processor, and SSDs'],()=>{
      chassis(...xy([55,43,790,228],[18,28,404,407]),'AI2000 / AI2200');
      const nic=node(xy([189,165],[220,134]),['网络适配器','Network Adapter'],{art:'network',w:xy(204,264)});
      const cpu=node(xy([450,165],[220,251]),['处理器和内存','CPU and Memory'],{art:'chip',sub:'Infinia',w:xy(220,264),tone:'focus'});
      const drives=node(xy([710,165],[220,371]),['U.2 固态盘','U.2 SSDs'],{art:'shelf',w:xy(205,264),tone:'accent'});
      link(drives,cpu);
      link(cpu,nic,{delay:1.2});
    }],
    [['AI2000 与 AI2200 延续同一部署角色，硬件配置更新','AI2000 and AI2200 serve the same deployment role with updated hardware'],()=>{
      const earlier=node(xy([249,143],[220,111]),'AI2000',{sub:['Infinia 一体机','Infinia Appliance'],art:'server',w:xy(328,324)});
      const later=node(xy([650,143],[220,293]),'AI2200',{sub:['Infinia 一体机','Infinia Appliance'],art:'chip',w:xy(328,324),tone:'focus'});
      label(overlay,earlier.x-earlier.w/2+16,earlier.y+89,['U.2 固态盘','U.2 SSDs'],'muted');
      const updates=label(overlay,later.x-later.w/2+16,later.y+89,['Turin · DDR5 · Gen5 NVMe','Turin · DDR5 · Gen5 NVMe'],'muted');
      effects.push((t,still)=>updates.setAttribute('opacity',still?1:.73+.27*clamp(t/.9,0,1)));
    }],
    [['分布式存储节点通过一个集群接口提供对象数据','Distributed storage nodes serve object data through one cluster interface'],()=>{
      const app=node(xy([142,158],[220,57]),['对象客户端','Object Client'],{w:xy(196,228)});
      const inf=node(xy([449,158],[220,190]),'Infinia',{sub:['S3 兼容接口','S3-Compatible API'],art:'network',w:xy(224,234),tone:'focus'});
      const a=node(xy([753,81],[113,347]),['存储节点 A','Storage Node A'],{art:'shelf',w:xy(226,193),tone:'accent'});
      const b=node(xy([753,233],[327,347]),['存储节点 B','Storage Node B'],{art:'shelf',w:xy(226,193),tone:'accent'});
      link(a,inf,{delay:.1});
      link(b,inf,{delay:.72});
      link(inf,app,{delay:1.23});
      link({...inf,x:inf.x-(mobile?14:0),y:inf.y+(mobile?0:14)},
        {...app,x:app.x-(mobile?14:0),y:app.y+(mobile?0:14)},{delay:1.86,rest:false});
    }],
    [['Infinia 存放向量索引，检索服务将上下文交给生成模型','Infinia stores the vector index and retrieval passes context to the model'],()=>{
      const inf=node(xy([145,154],[220,73]),'Infinia',{sub:['向量索引','Vector Index'],art:'file',w:xy(218,232),tone:'accent'});
      const search=node(xy([450,154],[220,216]),['检索服务','Retrieval Service'],{w:xy(215,232),tone:'focus'});
      const model=node(xy([758,154],[220,360]),['生成模型','Generative Model'],{art:'chip',w:xy(208,232)});
      link(inf,search,{tag:'S3',at:xy([302,125,'middle'],[240,155,'start']),duration:1.4});
      link(search,model,{tag:['上下文','Context'],at:xy([607,125,'middle'],[240,284,'start']),delay:1.6,duration:1.4,packet:17,tone:'signal'});
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
window.SSAnim[id]={steps:6,mount, figures: {
 "ai2200": [
  [
   [
    "处理器",
    "Processor"
   ],
   [
    "EPYC 9005 · Turin",
    "EPYC 9005 · Turin"
   ]
  ],
  [
   [
    "内存",
    "Memory"
   ],
   [
    "384 GB DDR5",
    "384 GB DDR5"
   ]
  ],
  [
   [
    "介质",
    "Media"
   ],
   [
    "12 × U.2 · PCIe Gen5",
    "12 × U.2 · PCIe Gen5"
   ]
  ],
  [
   [
    "数据网卡",
    "Data NICs"
   ],
   [
    "≤2 × 2-port 200GbE",
    "≤2 × 2-port 200GbE"
   ]
  ]
 ],
 "ai2000": [
  [
   [
    "机箱",
    "Chassis"
   ],
   [
    "43 毫米",
    "43 mm"
   ]
  ],
  [
   [
    "盘位",
    "Drive Bays"
   ],
   [
    "12 × U.2",
    "12 × U.2"
   ]
  ],
  [
   [
    "数据网卡",
    "Data NICs"
   ],
   [
    "2 块 PCIe 双端口卡",
    "2 dual-port PCIe adapters"
   ]
  ],
  [
   [
    "电源",
    "Power"
   ],
   [
    "2 路冗余电源",
    "2 redundant PSUs"
   ]
  ]
 ],
 "choice": [
  [
   [
    "AI2000",
    "AI2000"
   ],
   [
    "模型准备、加载与推理",
    "Model prep, loading, and inference"
   ]
  ],
  [
   [
    "AI2200",
    "AI2200"
   ],
   [
    "推理与 RAG · PCIe Gen5",
    "Inference and RAG · PCIe Gen5"
   ]
  ]
 ]
}};
})();
