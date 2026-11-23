(function () {
  const prefix = 'ssa-w-csi';
  const scenes = [
    {"nodes":[[["Kubernetes","Kubernetes"],["卷管理","Volume Management"],"",""],[["CSI 插件","CSI Plugin"],["存储接口","Storage Interface"],"",""],[["文件系统","Filesystem"],["集群存储","Cluster Storage"],"store",""]],"routes":[[0,1,0,1,"control"],[1,2,1.08,1,"control"]]},
    {"nodes":[[["PVC","PVC"],["容量与访问模式","Size and Access Mode"],"",""],[["StorageClass","StorageClass"],["存储类型与参数","Type and Parameters"],"",""],[["CSI 控制器","CSI Controller"],["csi.weka.io","csi.weka.io"],"",""]],"routes":[[0,1,0,1,"control"],[1,2,1.08,1,"control"]],"states":[[2,2.08,"配置参数已送达|Parameters Received","on"]]},
    {"nodes":[[["PVC","PVC"],["容量与访问模式","Size and Access Mode"],"",""],[["CSI 控制器","CSI Controller"],["csi.weka.io","csi.weka.io"],"",""],[["后端目录","Backing Directory"],["指定文件系统","Selected Filesystem"],"store",""],[["PV","PV"],["底层卷的引用","Backing Volume Reference"],"",""]],"routes":[[0,1,0,0.7,"control"],[1,2,0.7,0.9,"control"],[2,3,1.82,0.7,"signal"],[3,0,2.7,1.35,"signal","outer"]],"states":[[2,1.6,"目录已创建|Directory Created","on","G"],[3,2.52,"PV 已登记|PV Registered","on"],[0,4.05,"已绑定|Bound","on"]],"period":5.2},
    {"layout":"side","nodes":[[["Pod","Pod"],["应用文件读写","Application I/O"],"",""],[["工作节点客户端","Worker Client"],["已挂载路径","Mounted Path"],"",""],[["后端卷","Backing Volume"],["文件数据","File Data"],"store","G"],[["CSI 控制器","CSI Controller"],["配置卷","Provisions Volumes"],"",""]],"routes":[[0,1,0,1],[1,2,1,1]],"states":[[3,0,"卷配置 · 无文件流量|Provisioning Only","idle"]]},
    {"layout":"options","nodes":[[["StorageClass","StorageClass"],["从三种后端选其一","Selects One Backing Type"],"",""],[["目录","Directory"],["已有文件系统内","Within a Filesystem"],"store","G"],[["可写快照","Writable Snapshot"],["可写时间点副本","Writable Point in Time"],"store","G"],[["文件系统","Filesystem"],["整个文件系统","Whole Filesystem"],"","G"]],"routes":[[0,1,0,1.1,"control"],[0,2,1.55,1.1,"control"],[0,3,3.1,1.1,"control"]],"period":5.25}
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
  window.SSAnim['w-csi'] = {steps:5,mount};
})();
