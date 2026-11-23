(function(){
  const id = "w-cores";
  const scenes = [
  ({node, link, panel}) => {
    panel([26,30,405,308],[18,18,344,215],['独占分配','Dedicated allocation']);
    panel([449,30,405,308],[18,248,344,221],['共享分配','Shared allocation']);
    node('da',[126,116],[102,94],['WEKA 客户端','WEKA client']);
    node('db',[331,116],[278,94],['应用任务','App task']);
    node('ca',[126,252],[102,181],['独占核心','Dedicated core'],{tone:'active'});
    node('cb',[331,252],[278,181],['应用核心','App core']);
    node('sa',[551,116],[102,324],['WEKA 客户端','WEKA client']);
    node('sb',[752,116],[278,324],['应用任务','App task']);
    node('shared',[652,259],[190,426],['共享核心','Shared core'],{tone:'active'});
    link('da','ca');
    link('db','cb',{tone:'control'});
    link('sa','shared',{port:-12,duration:920});
    link('sb','shared',{port:12,delay:1060,duration:920,tone:'control'});
  },
  ({node, link, panel}) => {
    panel([32,28,816,145],[20,25,340,224],['独占核心 · 持续轮询','Dedicated core · continuous polling']);
    panel([32,203,816,145],[20,269,340,198],['其他核心 · 应用调度','Other cores · app scheduling']);
    node('nic',[180,112],[190,111],['网卡接收队列','NIC RX queue'],{wide:true});
    node('poll',[696,112],[190,199],['DPDK 轮询线程','DPDK poll thread'],{tone:'active',wide:true});
    node('app',[180,287],[190,351],['应用任务','App task']);
    node('cpu',[696,287],[190,423],['应用核心','App core']);
    link('nic','poll',{duration:1060,delay:700});
    link('poll','nic',{tone:'signal',offset:16,duration:670,repeat:930,open:true});
    link('app','cpu',{tone:'control',delay:360});
  },
  ({node, link, text}) => {
    node('nic',[111,100],[190,61],['网卡','NIC']);
    node('dpdk',[401,100],[100,211],['DPDK 前端','DPDK frontend'],{tone:'active'});
    node('app',[401,277],[280,211],['应用任务','App task']);
    node('shared',[735,193],[190,407],['共享核心','Shared core']);
    text([250,59],[94,117],['接收中断','RX interrupt']);
    link('nic','dpdk',{tone:'signal',duration:630,offset:-12,via:[240,138]});
    link('nic','dpdk',{delay:680,duration:840,offset:12,via:[250,164]});
    link('dpdk','shared',{delay:1520,duration:830,port:-14});
    link('app','shared',{delay:2490,duration:830,port:14,tone:'control'});
  },
  ({node, link}) => {
    node('nic',[125,112],[190,69],['网卡','NIC']);
    node('linux',[439,112],[190,196],['Linux UDP','Linux UDP'],{tone:'kernel'});
    node('client',[755,112],[190,327],['WEKA 客户端','WEKA client'],{sub:['共享核心','Shared CPU'],wide:true});
    node('dpdk',[439,267],[190,443],['DPDK','DPDK'],{tone:'off'});
    link('nic','linux',{duration:930});
    link('linux','client',{delay:930,duration:930});
  },
  ({node, link, panel}) => {
    panel([46,42,483,256],[20,25,340,166],['预留 CPU','Reserved CPUs']);
    panel([557,42,277,256],[20,216,340,250],['Pod 可调度 CPU','CPUs available to pods']);
    node('os',[172,167],[102,119],['系统核心','System cores'],{tone:'kernel'});
    node('client',[402,167],[278,119],['客户端','WEKA client'],{sub:['预留核心','Reserved cores'],tone:'active'});
    node('pod',[696,125],[190,310],['Pod 任务','Pod work']);
    node('avail',[696,243],[190,418],['可调度核心','Pod cores'],{tone:'active'});
    link('pod','avail',{tone:'control'});
  },
];

  const NS = 'http://www.w3.org/2000/svg';
  const cycle = 4200;
  const bilingual = pair => pair[window.SS_LANG === 'en' ? 1 : 0];

  function mount(host, {paused = false, onLayout} = {}) {
    const narrow = matchMedia('(max-width: 640px)');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(NS, 'svg');
    svg.classList.add(id + '-scene');
    svg.setAttribute('role', 'img');
    host.replaceChildren(svg);

    let width, height, step = 0, frame, previous, elapsed = 0;
    let flows, reveals, destroyed = false;

    function add(parent, tag, attrs, kind) {
      const el = document.createElementNS(NS, tag);
      Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
      if (kind) el.classList.add(id + '-' + kind);
      parent.append(el);
      return el;
    }

    function size() {
      return narrow.matches ? [380, 520] : [880, 390];
    }

    function ratio() {
      const [w, h] = size();
      return w / h;
    }

    function rebuild() {
      const mobile = narrow.matches;
      [width, height] = size();
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.replaceChildren();
      const description = bilingual(window.SS_TOPIC_CFG.steps[step].d);
      add(svg, 'title', {}).textContent = description;
      svg.setAttribute('aria-label', description);
      const panels = add(svg, 'g', {'aria-hidden': 'true'});
      const tracks = add(svg, 'g', {'aria-hidden': 'true'});
      const cards = add(svg, 'g', {'aria-hidden': 'true'});
      const packets = add(svg, 'g', {'aria-hidden': 'true'});
      const nodes = {};
      flows = [];
      reveals = [];

      function label(parent, x, y, pair, kind, anchor = 'middle') {
        const t = add(parent, 'text', {x, y, 'text-anchor': anchor}, kind);
        t.textContent = bilingual(pair);
        return t;
      }

      function node(key, desk, phone, labelPair, options = {}) {
        const {tone = 'neutral', sub, wide, reveal} = options;
        const [x, y] = mobile ? phone : desk;
        const w = wide ? (mobile ? 191 : 202) : (mobile ? 148 : 165);
        const h = sub ? 78 : 54;
        nodes[key] = {x, y, w, h};
        const group = add(cards, 'g', {'data-tone': tone}, 'node');
        add(group, 'rect', {x:x-w/2, y:y-h/2, width:w, height:h, rx:8}, 'box');
        label(group, x, sub ? y-12 : y, labelPair, 'label');
        if (sub) label(group, x, y+20, sub, 'sub');
        if (reveal) reveals.push({group, reveal});
      }

      function panel(desk, phone, pair) {
        const [x, y, w, h] = mobile ? phone : desk;
        add(panels, 'rect', {x,y,width:w,height:h,rx:12}, 'panel');
        label(panels, x+15, y+21, pair, 'panel-label', 'start');
      }

      function edge(box, side, offset) {
        if (side === 'left') return [box.x-box.w/2, box.y+offset];
        if (side === 'right') return [box.x+box.w/2, box.y+offset];
        if (side === 'top') return [box.x+offset, box.y-box.h/2];
        return [box.x+offset, box.y+box.h/2];
      }

      function link(from, to, options = {}) {
        const {tone = 'data', delay = 0, count = 1, duration = 1350, repeat,
          offset = 0, port = 0, quiet, bounce, backAt, open, via, mobilePath, mobileSides} = options;
        const a = nodes[from], b = nodes[to];
        const dx = b.x-a.x;
        const dy = b.y-a.y;
        const horizontal = Math.abs(dx) > Math.abs(dy);
        const [start, end] = mobile && mobileSides ? mobileSides :
          horizontal ? (dx > 0 ? ['right','left'] : ['left','right']) :
          (dy > 0 ? ['bottom','top'] : ['top','bottom']);
        const p = edge(a,start,port+offset);
        const q = edge(b,end,port+offset);
        const bend = via ? via[mobile ? 1 : 0] : horizontal ? (p[0]+q[0])/2 : (p[1]+q[1])/2;
        const route = mobile && mobilePath ? [p, ...mobilePath, q] :
          horizontal ? [p,[bend,p[1]],[bend,q[1]],q] : [p,[p[0],bend],[q[0],bend],q];
        const path = add(tracks, 'path', {
          d: route.map(([x,y], i) => (i ? 'L' : 'M') + x + ' ' + y).join(' '),
          'data-tone': quiet ? 'quiet' : tone,
        }, 'track');
        if (quiet) return;

        const length = path.getTotalLength();
        function arrow(tip, near) {
          const angle = Math.atan2(tip[1]-near.y,tip[0]-near.x)*180/Math.PI;
          add(tracks, 'path', {
            d:'M-9 -4 L-2 0 L-9 4', transform:`translate(${tip.join(' ')}) rotate(${angle})`, 'data-tone':tone,
          }, 'track');
        }
        arrow(q,path.getPointAtLength(length-10));
        if (bounce) arrow(p,path.getPointAtLength(10));

        function makePoints(direction, at) {
          for (let i = 0; i < count; i++) {
            const packet = add(packets, 'rect', {
              x:-5,y:-4,width:10,height:8,rx:2,'data-tone':tone,
            }, 'packet');
            flows.push({path,length,packet,start:at+i*100,duration,repeat,direction,open,pos:i});
          }
        }
        makePoints(1,delay);
        if (bounce) makePoints(-1,backAt);
      }

      scenes[step]({node, link, panel, text(desk, phone, pair) {
        const [x,y] = mobile ? phone : desk;
        label(cards,x,y,pair,'sub');
      }});
      label(svg, mobile ? 20 : 28, height-18,
        ['示意，不代表实测数字','Schematic, not measured'], 'note', 'start');
      onLayout?.(width/height, mobile);
      render(elapsed % cycle);
    }

    function render(t) {
      for (const flow of flows) {
        const {packet,path,length,start,duration,repeat,direction,open,pos} = flow;
        const local = t-start;
        const progress = (repeat && local >= 0 ? local % repeat : local) / duration;
        const fraction = reduce.matches ? 0.82 - pos*0.14 : progress;
        const visible = reduce.matches || (fraction >= 0 && fraction <= 1);
        packet.style.visibility = visible ? 'visible' : 'hidden';
        if (!visible) continue;
        const at = path.getPointAtLength((direction === 1 ? fraction : 1-fraction)*length);
        packet.setAttribute('transform', `translate(${at.x} ${at.y})`);
        packet.style.opacity = reduce.matches ? 1 :
          Math.min(1, fraction*12, (1-fraction)*(open ? 8 : 13));
      }
      for (const {group,reveal} of reveals) {
        group.style.opacity = reduce.matches ? 1 : Math.max(.32, Math.min(1, (t-reveal)/220));
      }
    }

    function tick(now) {
      elapsed += Math.max(0, now-previous);
      previous = now;
      render(elapsed % cycle);
      frame = requestAnimationFrame(tick);
    }

    function run() {
      cancelAnimationFrame(frame);
      if (paused || reduce.matches) return;
      previous = performance.now();
      frame = requestAnimationFrame(tick);
    }

    function show(index) {
      step = Math.max(0, Math.min(scenes.length-1,index));
      elapsed = 0;
      rebuild();
      run();
    }

    function motionChanged() {
      render(elapsed % cycle);
      run();
    }

    narrow.addEventListener('change', rebuild);
    reduce.addEventListener('change', motionChanged);
    document.addEventListener('ss-lang', rebuild);
    rebuild();
    run();
    document.fonts.ready.then(() => { if (!destroyed) rebuild(); });

    return {
      show,
      pause() { paused = true; cancelAnimationFrame(frame); },
      resume() { paused = false; run(); },
      destroy() {
        destroyed = true;
        cancelAnimationFrame(frame);
        narrow.removeEventListener('change', rebuild);
        reduce.removeEventListener('change', motionChanged);
        document.removeEventListener('ss-lang', rebuild);
        svg.remove();
      },
      ratio,
      step: () => step,
    };
  }

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = {steps: 5, mount};
})();
