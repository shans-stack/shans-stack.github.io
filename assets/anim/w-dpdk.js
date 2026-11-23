(function(){
  const id = "w-dpdk";
  const scenes = [
  ({node, link}) => {
    node('dataNic',[125,104],[100,74],['数据网卡','Data NIC']);
    node('mgmtNic',[125,267],[280,74],['管理网卡','Mgmt NIC']);
    node('dpdk',[420,104],[100,237],['DPDK 队列','DPDK queues'],{tone:'active'});
    node('linux',[420,267],[280,237],['Linux 网络栈','Linux networking'],{tone:'kernel',wide:true});
    node('fe',[733,104],[100,423],['WEKA 前端','Frontend'],{sub:['数据流量','Data traffic']});
    node('mgmt',[733,267],[280,423],['管理服务','Management'],{sub:['管理流量','Mgmt traffic'],tone:'kernel'});
    link('dataNic','dpdk',{duration:860});
    link('mgmtNic','linux',{duration:860,tone:'control'});
    link('dpdk','fe',{delay:860,duration:860});
    link('linux','mgmt',{delay:860,duration:860,tone:'control'});
  },
  ({node, link, text}) => {
    node('queue',[153,188],[190,91],['网卡接收队列','NIC RX queue'],{sub:['就绪包','Packets ready'],wide:true});
    node('poll',[455,188],[190,265],['轮询线程','Polling thread'],{tone:'active'});
    node('process',[735,188],[190,430],['用户态处理','User-space I/O']);
    text([305,137],[277,171],['批量取包','Batch receive']);
    link('queue','poll',{count:3,duration:1100});
    link('poll','process',{count:3,delay:1250,duration:1050});
  },
  ({node, link, panel}) => {
    panel([45,33,247,304],[20,27,340,139],['网卡队列','NIC queues']);
    panel([576,33,259,304],[20,299,340,165],['用户态核心','User-space cores']);
    node('qa',[166,122],[102,113],['队列 A','Queue A']);
    node('qb',[166,252],[278,113],['队列 B','Queue B']);
    node('ca',[706,122],[102,401],['处理线程 A','Worker A'],{sub:['核心 A','Core A'],tone:'active'});
    node('cb',[706,252],[278,401],['处理线程 B','Worker B'],{sub:['核心 B','Core B'],tone:'active'});
    link('qa','ca',{count:2});
    link('qb','cb',{count:2,tone:'control'});
  },
  ({node, link, panel}) => {
    panel([28,31,824,141],[20,26,340,211],['用户态网络','User-space networking']);
    panel([28,204,824,141],[20,260,340,211],['内核 UDP 模式 · 客户端','Kernel UDP · client']);
    node('dpdk',[230,115],[190,111],['DPDK','DPDK'],{tone:'active'});
    node('data',[654,115],[190,190],['经 UDP 发包','UDP on wire']);
    node('linux',[230,288],[190,345],['Linux 网络栈','Linux networking'],{tone:'kernel',wide:true});
    node('udp',[654,288],[190,424],['经 UDP 发包','UDP on wire']);
    link('dpdk','data');
    link('linux','udp',{tone:'control'});
  },
  ({node, link}) => {
    node('dpdk',[170,102],[100,99],['客户端 DPDK','Client DPDK'],{sub:['轮询或接收中断','Polling or RX IRQ'],tone:'active'});
    node('udp',[170,270],[280,99],['客户端内核 UDP','UDP client'],{sub:['Linux 网络栈','Linux networking'],tone:'kernel'});
    node('back',[658,190],[190,365],['后端 DPDK','Backend DPDK'],{sub:['后端数据网络','Backend data network'],tone:'active',wide:true});
    link('dpdk','back',{port:-13});
    link('udp','back',{port:13,tone:'control'});
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
    let flows, reveals;

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

    return {
      show,
      pause() { paused = true; cancelAnimationFrame(frame); },
      resume() { paused = false; run(); },
      destroy() {
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
