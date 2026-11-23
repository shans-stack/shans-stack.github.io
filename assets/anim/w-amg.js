(function () {
  const prefix = 'ssa-w-amg';
  const scenes = [
    {"nodes":[[["输入 token","Input Tokens"],["提示词","Prompt"],"","BBB"],[["GPU 预填充","GPU Prefill"],["计算键和值","Computes Keys and Values"],"",""],[["GPU HBM","GPU HBM"],["KV Cache","KV Cache"],"store",""]],"routes":[[0,1,0,1],[1,2,1.16,1]],"states":[[2,2.16,"KV 块已生成|KV Blocks Ready","on","GG"]]},
    {"nodes":[[["GPU HBM","GPU HBM"],["活跃 KV 块","Active KV Blocks"],"store","GG"],[["异步卸载","Async Offload"],["缓存副本","Cache Copy"],"",""],[["Token Warehouse","Token Warehouse"],["NeuralMesh · NVMe","NeuralMesh · NVMe"],"",""]],"routes":[[0,1,0,1],[1,2,1,1]],"states":[[2,2,"持久化副本|Persistent Copy","on","GG"]]},
    {"layout":"side","nodes":[[["后续请求","Later Request"],["输入 token","Input Tokens"],"","BBR"],[["前缀匹配","Prefix Match"],["从首个 token 开始","From the First Token"],"",""],[["可复用前缀","Reusable Prefix"],["对应的 KV 块","Corresponding KV Blocks"],"store",""],[["Token Warehouse","Token Warehouse"],["已保存前缀","Stored Prefix"],"","BBG"]],"routes":[[0,1,0,0.8,"control"],[1,3,0.85,0.72,"control"],[3,1,1.57,0.72,"signal"],[1,2,2.4,1,"signal"]],"states":[[1,2.29,"部分命中|Partial Match","on"],[2,3.4,"复用匹配部分|Matched Portion","on","GG"]]},
    {"layout":"side","nodes":[[["Token Warehouse","Token Warehouse"],["NeuralMesh · NVMe","NeuralMesh · NVMe"],"","GG"],[["GDS / RDMA","GDS / RDMA"],["缓存数据通道","Cache Data Path"],"",""],[["GPU HBM","GPU HBM"],["目标显存","Destination Memory"],"store",""],[["主机 CPU / 内存","Host CPU / RAM"],["不搬运缓存数据","No Payload Staging"],"",""]],"routes":[[0,1,0,1],[1,2,1,1]],"states":[[3,0,"不搬运缓存数据|No Payload Staging","idle"],[2,2,"缓存已回读|Cache Loaded","on","GG"]]},
    {"layout":"side","nodes":[[["Token Warehouse","Token Warehouse"],["NeuralMesh · NVMe","NeuralMesh · NVMe"],"","GG"],[["GPU","GPU"],["复用前缀 KV","Reuses Prefix KV"],"",""],[["输出 token","Output Token"],["解码结果","Decode Output"],"store",""],[["剩余输入","Remaining Input"],["继续预填充","Prefill Continues"],"","R"]],"routes":[[0,1,0,1],[3,1,0.35,1.05],[1,2,1.8,1]],"states":[[1,1.4,"前缀 KV + 新输入|KV + New Input","on","GGR"],[2,2.8,"继续解码|Decode Continues","on","G"]]}
  ];

  function layout(scene, mobile) {
    const width = mobile ? 360 : 880;
    const height = mobile ? 410 : 310;
    const h = mobile ? 61 : 82;
    let positions;
    let widths;
    if (scene.layout === 'split') {
      positions = mobile
        ? [[90,57],[270,57],[90,175],[270,175],[180,319]]
        : [[116,93],[116,217],[407,93],[407,217],[727,155]];
      widths = mobile ? [156,156,156,156,232] : [196,196,208,208,246];
    } else if (scene.layout === 'options') {
      positions = mobile
        ? [[180,47],[211,134],[211,228],[211,322]]
        : [[183,155],[650,54],[650,154],[650,254]];
      widths = mobile ? [252,222,222,222] : [254,278,278,278];
    } else if (scene.layout === 'side') {
      if (scene.nodes.length === 3) {
        positions = mobile ? [[180,57],[90,185],[270,185]] : [[183,108],[440,108],[440,233]];
      } else {
        positions = mobile ? [[180,55],[90,181],[180,316],[270,181]] : [[169,104],[440,104],[711,104],[440,233]];
      }
      widths = mobile ? [236,154,scene.nodes.length === 3 ? 154 : 236,154] : [226,226,226,226];
    } else {
      const n = scene.nodes.length;
      positions = scene.nodes.map((_, i) => mobile
        ? [180, n === 4 ? 47 + i * 98 : 53 + i * 133]
        : [width * (i + .5) / n, 135]);
      widths = scene.nodes.map(() => mobile ? 252 : n === 4 ? 174 : 224);
    }
    return {width, height, boxes: positions.map(([x,y], i) => ({x,y,w:widths[i],h}))};
  }

  function mount(host, opts = {}) {
    const ns = 'http://www.w3.org/2000/svg';
    const mq = matchMedia('(max-width: 640px)');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('role', 'img');
    host.classList.add(prefix);
    host.replaceChildren(svg);
    let step = 0, width, height, routes, cards, states, period;
    let paused = !!opts.paused, alternatives = false, raf = 0, elapsed = 0, last = 0;

    function el(tag, attrs, parent = svg) {
      const node = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
      parent.append(node);
      return node;
    }

    function cls(name) {
      return prefix + '-' + name;
    }

    function pathPoints(a, b, outer, paired, mobile, options) {
      if (options) {
        const side = mobile ? -1 : 1;
        const rail = mobile ? 47 : 415;
        return [[a.x + side * a.w/2,a.y],[rail,a.y],[rail,b.y],[b.x - b.w/2,b.y]];
      }
      if (outer) {
        return mobile
          ? [[a.x-a.w/2,a.y],[28,a.y],[28,b.y],[b.x-b.w/2,b.y]]
          : [[a.x,a.y+a.h/2],[a.x,231],[b.x,231],[b.x,b.y+b.h/2]];
      }
      const dx = b.x-a.x, dy = b.y-a.y;
      const shift = paired ? 8 : 0;
      if (dx && (!mobile || !dy)) {
        const sx = a.x+Math.sign(dx)*a.w/2, ex = b.x-Math.sign(dx)*b.w/2;
        const sy = a.y+Math.sign(dx)*shift, ey = b.y+Math.sign(dx)*shift;
        return [[sx,sy],[(sx+ex)/2,sy],[(sx+ex)/2,ey],[ex,ey]];
      }
      const sy = a.y+Math.sign(dy)*a.h/2, ey = b.y-Math.sign(dy)*b.h/2;
      const sx = a.x+Math.sign(dy)*shift, ex = b.x+Math.sign(dy)*shift;
      return [[sx,sy],[sx,(sy+ey)/2],[ex,(sy+ey)/2],[ex,ey]];
    }

    function render(time) {
      routes.forEach(({trace, arrow, packet, length, start, end}) => {
        const active = start <= time && time < end;
        const done = time >= end && (!alternatives || motion.matches || time < end+.35);
        trace.classList.toggle(cls('done'), done || active);
        arrow.classList.toggle(cls('done'), done || active);
        packet.style.opacity = active ? 1 : 0;
        if (active) {
          const p = trace.getPointAtLength(length * (time-start)/(end-start));
          packet.setAttribute('transform', 'translate(' + p.x + ' ' + p.y + ')');
        }
      });
      cards.forEach((card, i) => {
        if (!card) return;
        const state = states[i].findLast(item => item[0] <= time);
        if (state === card.state) return;
        card.state = state;
        const detail = state ? state[1] : card.detail;
        const tone = state ? state[2] : '';
        const blocks = state && state[3] !== undefined ? state[3] : card.blocks;
        if (card.text.textContent !== detail) card.text.textContent = detail;
        card.group.setAttribute('data-state', tone);
        for (let j = 0; j < card.chips.length; j++) {
          card.chips[j].setAttribute('data-color', blocks[j] || '');
        }
      });
    }

    function loop(now) {
      elapsed += Math.min(.08, Math.max(0, (now-last)/1000));
      last = now;
      render(elapsed % period);
      raf = requestAnimationFrame(loop);
    }

    function start() {
      cancelAnimationFrame(raf);
      if (paused || motion.matches) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }

    function build() {
      cancelAnimationFrame(raf);
      const scene = scenes[step], mobile = mq.matches;
      const lang = window.SS_LANG === 'en' ? 1 : 0;
      const {width: w, height: h, boxes} = layout(scene, mobile);
      width = w;
      height = h;
      alternatives = scene.layout === 'options';
      const note = ['示意，不代表实测数字','Schematic · No Measured Figures'][lang];
      svg.replaceChildren();
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      svg.setAttribute('data-step', step+1);
      svg.setAttribute('aria-label', scene.nodes.filter(Boolean).map(n => n[0][lang] + ' · ' + n[1][lang]).join(' / ') + (lang ? '. ' : '。') + note);
      const wires = el('g', {});
      const components = el('g', {});
      const traffic = el('g', {});
      routes = scene.routes.map(([from,to,delay,duration,kind = 'data',outer]) => {
        const reverse = scene.routes.some(([a,b]) => a === to && b === from);
        const points = pathPoints(boxes[from],boxes[to],outer,reverse,mobile,scene.layout === 'options');
        const trace = el('path', {d: 'M' + points.map(p => p.join(' ')).join(' L'), class:cls('wire'), 'data-kind':kind}, wires);
        const length = trace.getTotalLength();
        const tip = trace.getPointAtLength(length - 2);
        const behind = trace.getPointAtLength(length - 9);
        const angle = Math.atan2(tip.y-behind.y,tip.x-behind.x)*180/Math.PI;
        const arrow = el('path', {d:'M-5 -3 L0 0 L-5 3 Z',transform:'translate(' + tip.x + ' ' + tip.y + ') rotate(' + angle + ')',class:cls('arrow'),'data-kind':kind}, traffic);
        const packet = el('rect', {x:-6,y:-4,width:12,height:8,rx:2,class:cls('packet'),'data-kind':kind}, traffic);
        return {trace,arrow,packet,length,start:delay,end:delay+duration};
      });

      cards = scene.nodes.map((node, i) => {
        if (!node) return null;
        const [label, detail, tone, blocks] = node;
        const {x,y,w,h} = boxes[i];
        const group = el('g', {class:cls('card'),'data-tone':tone}, components);
        el('rect', {x:x-w/2,y:y-h/2,width:w,height:h,rx:5,class:cls('body')}, group);
        el('text', {x,y:y-(mobile?12:16),class:cls('label')}, group).textContent = label[lang];
        const text = el('text', {x,y:y+(mobile?9:10),class:cls('detail')}, group);
        const chips = [-15,0,15].map(dx => el('rect',{x:x+dx-5,y:y+(mobile?19:24),width:10,height:7,rx:1.6,class:cls('chip')},group));
        return {group,text,chips,detail:detail[lang],blocks,state:null};
      });
      states = scene.nodes.map((_, i) => (scene.states || []).filter(item => item[0] === i).map(([,at,label,tone,blocks]) => [
        at, label.split('|')[lang], tone, blocks,
      ]));
      el('text', {x:w/2,y:h-19,class:cls('note')}).textContent = note;
      period = scene.period || Math.max(...routes.map(route => route.end)) + 1.15;
      elapsed = 0;
      render(motion.matches ? period-.1 : 0);
      if (opts.onLayout) opts.onLayout(width/height, mobile);
      start();
    }

    mq.addEventListener('change', build);
    motion.addEventListener('change', build);
    document.addEventListener('ss-lang', build);
    const ctrl = {
      show(i) { step = Math.max(0, Math.min(scenes.length-1, i)); build(); },
      pause() { paused = true; cancelAnimationFrame(raf); },
      resume() { if (paused) { paused = false; start(); } },
      destroy() {
        cancelAnimationFrame(raf);
        mq.removeEventListener('change', build);
        motion.removeEventListener('change', build);
        document.removeEventListener('ss-lang', build);
        host.replaceChildren();
        host.classList.remove(prefix);
        delete host.__anim;
      },
      ratio() { return width/height; },
      step() { return step; },
    };
    host.__anim = ctrl;
    build();
    return ctrl;
  }

  window.SSAnim = window.SSAnim || {};
  window.SSAnim['w-amg'] = {steps:5,mount};
})();
