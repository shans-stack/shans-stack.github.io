(function(){
  const id = "w-meta";
  const scenes = [
  ({node, link}) => {
    node('call',[155,195],[190,84],['查询文件属性','Query attributes'],{sub:['/shared/train.bin','/shared/train.bin'],wide:true});
    node('attrs',[600,112],[190,245],['元数据','Metadata'],{sub:['文件大小、时间戳','Size, timestamps'],tone:'active',wide:true});
    node('data',[600,268],[190,406],['文件内容','File contents'],{sub:['此次查询不读取','Outside this query'],tone:'off',wide:true});
    link('call','attrs');
  },
  ({node, link, panel}) => {
    panel([485,29,350,194],[20,136,340,165],['主机 A · 计算服务','Host A · Compute']);
    panel([485,239,350,104],[20,328,340,135],['主机 B · 计算服务','Host B · Compute']);
    node('fs',[160,168],[190,70],['文件系统对象','File system objects'],{wide:true});
    node('a',[658,104],[102,231],['分片 A','Shard A'],{tone:'active'});
    node('b',[658,174],[278,231],['分片 B','Shard B'],{tone:'active'});
    node('c',[658,307],[190,405],['分片 C','Shard C'],{tone:'active'});
    link('fs','a',{port:-15,delay:0,via:[390,126],mobilePath:[ [175,115],[188,115],[188,216]],mobileSides:['bottom','right']});
    link('fs','b',{port:0,delay:360,via:[450,126],mobilePath:[ [190,125],[196,125],[196,231]],mobileSides:['bottom','left']});
    link('fs','c',{port:15,delay:720,via:[427,320],mobilePath:[ [205,112],[369,112],[369,420]],mobileSides:['bottom','right']});
  },
  ({node, link}) => {
    node('file',[115,182],[190,72],['文件范围 B','File range B']);
    node('front',[390,182],[190,213],['前端','Frontend'],{sub:['计算逻辑所有者','Resolves owner']});
    node('a',[728,104],[100,389],['分片 A','Shard A'],{tone:'off'});
    node('b',[728,260],[280,389],['分片 B','Shard B'],{tone:'active'});
    link('file','front',{duration:950});
    link('front','b',{delay:950,duration:1100});
  },
  ({node, link}) => {
    node('a',[125,108],[100,94],['客户端 A','Client A']);
    node('b',[125,271],[280,94],['客户端 B','Client B']);
    node('pa',[441,108],[100,263],['文件 A','File A']);
    node('pb',[441,271],[280,263],['文件 B','File B']);
    node('sa',[750,108],[100,414],['分片 A','Shard A'],{tone:'active'});
    node('sb',[750,271],[280,414],['分片 B','Shard B'],{tone:'active'});
    link('a','pa',{duration:820});
    link('b','pb',{duration:820});
    link('pa','sa',{delay:820,duration:820});
    link('pb','sb',{delay:820,duration:820});
  },
  ({node, link}) => {
    node('req',[139,191],[190,75],['原文件请求','Same file request'],{wide:true});
    node('old',[658,100],[190,231],['分片 A','Shard A'],{sub:['原主机故障','Original host down'],tone:'off',wide:true});
    node('new',[658,276],[190,407],['分片 A','Shard A'],{sub:['另一主机接管','New host takes over'],tone:'active',wide:true});
    link('req','old',{quiet:true});
    link('req','new',{mobilePath:[ [310,102],[310,407]],mobileSides:['bottom','right']});
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
