/* 双语 SVG 动画。页面管理步进，移动设备重新排布，减少动态效果时保留结果帧。 */
(function(){
const id='d-insight';
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
    "server": "M1 0H77V11H1Z M1 15H77V26H1Z M7 5.5H11 M7 20.5H11 M51 5.5H71 M51 20.5H71",
    "file": "M1 2H20L28 10V25H1Z M20 2V10H28 M37 2H56L64 10V25H37Z M56 2V10H64 M7 15H21 M7 20H18 M43 15H57 M43 20H54",
    "chart": "M1 1V24H65 M7 21L19 15L29 17L39 6L47 10L59 3",
    "status": "M1 8L6 13L15 3 M1 22L6 27L15 17 M22 8H64 M22 22H64",
    "bars": "M1 0V25H70 M9 14H22V25 M31 9H44V25 M53 3H66V25",
    "alert": "M1 22H34 M6 22V12A11.5 11.5 0 0 1 29 12V22 M14 26H21 M44 4H77V23H44Z M44 4L60.5 16L77 4"
  };
  function healthAndCapacity(){
    const [x1,y1]=xy([92,72],[48,53]);
    const [x2,y2]=xy([492,72],[48,239]);
    label(parts,x1,y1+18,['组件健康','Component Health'],'name');
    label(parts,x2,y2+18,['容量用量','Capacity Usage'],'name');
    const items=[[['物理盘','Physical Drives'],['正常','Healthy']],[['电源','Power Supplies'],['正常','Healthy']]];
    items.forEach(([name,status],i)=>{
      const y=y1+66+i*43;
      label(parts,x1,y,name);
      el('circle',{cx:x1+192,cy:y,r:4,class:'health-dot'},parts);
      label(parts,x1+208,y,status,'muted');
    });
    [[['数据','Data'],.65],['inode',.38]].forEach(([name,fraction],i)=>{
      const y=y2+66+i*43;
      label(parts,x2,y,name);
      rect(parts,x2+96,y-5,220,10,'chart-track');
      const fill=rect(parts,x2+96,y-5,220*fraction,10,'chart-fill');
      effects.push((t,still)=>fill.setAttribute('width',220*fraction*(still?1:.3+.7*clamp(t/1.4,0,1))));
    });
  }
  function incidentTimeline(){
    const [x,y,w]=xy([360,38,474],[172,52,240]);
    const offset=xy(0,15);
    const start=x+w*.42,end=x+w*.63;
    rect(wires,start,y+22,end-start,xy(196,282),'time-window',0);
    label(parts,(start+end)/2,y+14,['异常时段','Incident Window'],'muted','middle');
    label(parts,xy(66,20),y+65,['文件系统吞吐','FS Throughput'],'name');
    label(parts,xy(66,20),y+128+offset,['作业 A','Job A'],'name');
    label(parts,xy(66,20),y+185+offset*3,['作业 B','Job B'],'name');
    for(const lineY of [y+103+offset,y+128+offset,y+185+offset*3]){
      el('path',{d:`M${x} ${lineY} H${x+w}`,class:'chart-axis'},wires);
    }
    const points=[.33,.38,.34,.4,.32,.36,.71,.89,.76,.54,.45,.42,.38,.36,.4];
    el('polyline',{points:points.map((p,i)=>[x+i*w/(points.length-1),y+94-p*67]).join(' '),class:'chart-curve'},parts);
    rect(parts,x+w*.32,y+123+offset,w*.42,10,'chart-fill',3);
    rect(parts,x+w*.05,y+180+offset*3,w*.26,10,'secondary-fill',3);
    const cursor=el('path',{d:`M0 ${y+25} V${y+218+offset*4}`,class:'chart-cursor'},overlay);
    label(parts,x+w,y+233+offset*4,['时间','Time'],'muted','end');
    effects.push((t,still)=>cursor.setAttribute('transform',`translate(${still?(start+end)/2:x+w*clamp(t/4.4,0,1)} 0)`));
  }
  const scenes=[
    [['文件数据走客户端链路，监控指标走 Insight 链路','File data takes the client path and metrics take the Insight path'],()=>{
      const exa=node(xy([193,158],[220,78]),'EXAScaler',{sub:['文件系统','File System'],art:'server',w:xy(248,250),tone:'accent'});
      const app=node(xy([720,84],[115,324]),['客户端','Client'],{sub:['文件数据','File Data'],art:'file',w:xy(218,187)});
      const insight=node(xy([720,235],[325,324]),'Insight',{sub:['监控指标','Metrics'],art:'chart',w:xy(218,187),tone:'focus'});
      const port=side=>({...exa,x:exa.x+(mobile?side*32:0),y:exa.y+(mobile?0:side*21)});
      link(port(-1),app,{duration:1.55});
      link(port(1),insight,{duration:1.55,delay:.45,tone:'signal',packet:9});
    }],
    [['健康面板和容量面板观察不同资源','The health and capacity views track different resources'],healthAndCapacity],
    [['作业统计区分吞吐量和元数据活动','Job statistics distinguish throughput and metadata activity'],()=>{
      const fs=node(xy([201,158],[220,82]),'Insight',{sub:['文件系统总量','File System Totals'],art:'chart',w:xy(262,250),tone:'focus'});
      const data=node(xy([697,88],[113,323]),['作业 A','Job A'],{sub:['数据吞吐很高','High Throughput'],art:'bars',w:xy(243,195),tone:'accent'});
      const meta=node(xy([697,235],[327,323]),['作业 B','Job B'],{sub:['元数据活动升高','More Metadata I/O'],art:'status',w:xy(243,195)});
      link(fs,data,{tone:'signal',delay:.15,duration:1.55});
      link(fs,meta,{tone:'signal',delay:.52,duration:1.55});
    }],
    [['聚合性能曲线与作业活动按时间对齐','Aggregate throughput and job activity aligned by time'],incidentTimeline],
    [['Insight 筛选监控事件，将符合条件的告警送交运维','Insight filters monitoring events and sends matching alerts to operations'],()=>{
      const event=node(xy([148,109],[159,66]),['监控事件','Monitoring Events'],{sub:['容量与健康','Capacity and Health'],w:xy(216,217)});
      const insight=node(xy([450,109],[159,211]),'Insight',{sub:['事件过滤','Event Filter'],w:xy(222,217),tone:'focus'});
      const ops=node(xy([743,109],[159,360]),['运维端','Operations'],{sub:['告警通知','Alert Notification'],art:'alert',w:xy(221,217),tone:'accent'});
      const filtered=node(xy([450,241],[358,211]),['未触发','Filtered'],{w:xy(208,117),h:60});
      link(event,insight,{tone:'signal',packet:10,rest:false});
      link(event,insight,{tone:'signal',packet:10,delay:2.42});
      link(insight,filtered,{axis:xy('y','x'),tone:'idle',packet:9,delay:1.22,rest:false});
      link(insight,ops,{tone:'signal',packet:11,delay:3.66});
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
