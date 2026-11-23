(function(){
  const id = "w-nm";
  const scenes = [
  ({node, link}) => {
    node('a', [160,110], [100,100], ['应用 A','App A']);
    node('b', [160,270], [280,100], ['应用 B','App B']);
    node('fs', [520,190], [190,300], ['WekaFS','WekaFS'], {sub:['/shared/train.bin','/shared/train.bin'], tone:'active', wide:true});
    link('a','fs');
    link('b','fs',{delay:400});
  },
  ({node, link}) => {
    node('front', [110,190], [190,78], ['前端服务','Frontend'], {sub:['接收文件请求','Client access']});
    node('compute', [330,190], [190,193], ['计算服务','Compute'], {sub:['布局与元数据','Metadata & layout']});
    node('drive', [550,190], [190,308], ['盘服务','Drive service'], {sub:['盘 I/O','Physical I/O']});
    node('ssd', [770,190], [190,423], ['NVMe SSD','NVMe SSD'], {tone:'active'});
    link('front','compute',{duration:760});
    link('compute','drive',{delay:760,duration:760});
    link('drive','ssd',{delay:1520,duration:760});
  },
  ({node, link}) => {
    node('front', [120,190], [190,70], ['前端服务','Frontend'], {sub:['一次读请求','One read request']});
    node('ca', [440,105], [100,215], ['计算服务 A','Compute A'], {sub:['文件范围 A','File range A']});
    node('cb', [440,275], [280,215], ['计算服务 B','Compute B'], {sub:['文件范围 B','File range B']});
    node('da', [745,105], [100,393], ['盘服务 A','Drive A'], {tone:'active'});
    node('db', [745,275], [280,393], ['盘服务 B','Drive B'], {tone:'active'});
    for (const [compute, drive, port] of [
      ['ca','da',-13], ['cb','db',13],
    ]) {
      link('front',compute,{port,duration:850,bounce:true,backAt:2420});
      link(compute,drive,{delay:850,duration:760,bounce:true,backAt:1660});
    }
  },
  ({node, link}) => {
    node('lost', [130,100], [100,85], ['故障域 A','Domain A'], {sub:['数据块不可用','Chunk unavailable'], tone:'off'});
    node('data', [130,190], [100,208], ['故障域 B','Domain B'], {sub:['原数据块','Data chunk']});
    node('parity', [130,280], [280,208], ['故障域 C','Domain C'], {sub:['原校验块','Parity chunk']});
    node('result', [600,235], [190,388], ['重建节点','Rebuild node'], {sub:['恢复的数据块','Recovered chunk'], tone:'active', reveal:1550, wide:true});
    link('data','result',{port:-12,duration:1300});
    link('parity','result',{port:12,delay:250,duration:1300,tone:'control'});
  },
  ({node, link, panel}) => {
    panel([40,55,380,265],[20,23,340,210],['独立部署 · 两台主机','Dedicated · separate hosts']);
    panel([460,55,380,265],[20,254,340,210],['融合部署 · 同一主机','Converged · one host']);
    node('separateApp', [137,192], [106,134], ['应用客户端','App client'], {sub:['应用主机','App host']});
    node('separateStorage', [324,192], [274,134], ['存储后端','Backend'], {sub:['存储主机','Storage host'], tone:'active'});
    node('localApp', [557,192], [106,365], ['应用客户端','App client']);
    node('localStorage', [744,192], [274,365], ['存储后端','Backend'], {tone:'active'});
    link('separateApp','separateStorage');
    link('localApp','localStorage');
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
