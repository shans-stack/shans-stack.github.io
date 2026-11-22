(function () {
  const EN = {
    "输入 B": "Input B",
    "输入 A": "Input A",
    "归约交换机": "Reducing switch",
    "交换机": "Switch",
    "求部分和": "Adds inputs",
    "仅转发": "Forwards only",
    "端点": "Endpoint",
    "接收部分和": "Receives sum",
    "求和": "Adds inputs",
    "上联块数": "Uplink blocks",
    "叶交换机 B": "Leaf switch B",
    "叶交换机 A": "Leaf switch A",
    "复制结果": "Replicates",
    "根交换机": "Root switch",
    "向下分发": "Distributes",
    "合并部分和": "Merges sums",
    "交换机归约": "Switch reduction",
    "示意，不代表实测数字": "Schematic, not measured"
  };
  const T = text => window.SS_LANG === 'en' ? EN[text] ?? text : text;

  function mount(host, {onLayout, paused = false} = {}) {
    const ns = 'http://www.w3.org/2000/svg';
    const mobileQuery = matchMedia('(max-width: 640px)');
    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = [840, 390], mobileSize = [360, 520];
    const prefix = 'sharp';
    host.classList.add(prefix + '-anim');
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('role', 'img');
    host.replaceChildren(svg);

    let layers, tracks, mobile, width, height;
    let current = 0, frame = 0, elapsed = 0, last = null, stopped = paused;
    let offload = true;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'sharp-toggle';
    toggle.addEventListener('click', () => { offload = !offload; restart(); });
    host.append(toggle);

    function element(tag, attrs, layer, value) {
      const el = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([key, val]) => el.setAttribute(key, val));
      if (value !== undefined) el.textContent = value;
      layers[layer].append(el);
      return el;
    }

    function label([x, y], key, {anchor = 'middle', kind = 'label'} = {}) {
      return element('text', {x, y, 'text-anchor': anchor, class: prefix + '-' + kind}, 4, T(key));
    }

    function box([x, y], w, h, kind = 'device', layer = 3) {
      return element('rect', {x: x-w/2, y: y-h/2, width: w, height: h, rx: 3, class: prefix + '-' + kind}, layer);
    }

    function node(p, name, {w = mobile ? 140 : 178, h = 60, kind = 'device', sub} = {}) {
      box(p, w, h, kind);
      label([p[0], p[1] + (sub ? -4 : 6)], name);
      if (sub) label([p[0], p[1]+19], sub, {kind: 'note'});
    }

    function wire(points, tone = 'neutral', dashed = false) {
      const d = points.map(([x,y], i) => (i ? 'L' : 'M') + x + ' ' + y).join(' ');
      return element('path', {d, class: prefix + '-wire ' + prefix + '-' + tone,
        'stroke-dasharray': dashed ? '5 6' : 'none'}, 1);
    }

    function send(path, start, end, tone = 'moving', reverse = false) {
      const length = path.getTotalLength();
      const chip = box([0, 0], 16, 11, tone, 2);
      tracks.push(p => {
        const fraction = (p-start)/(end-start);
        if (fraction <= 0 || fraction >= 1) {
          chip.setAttribute('opacity', 0);
          return;
        }
        const point = path.getPointAtLength(length * (reverse ? 1-fraction : fraction));
        chip.setAttribute('transform', 'translate(' + point.x + ' ' + point.y + ')');
        chip.setAttribute('opacity', Math.min(1, fraction*14, (1-fraction)*14));
      });
    }

    function showAfter(el, time) {
      tracks.push(p => el.setAttribute('opacity', Math.max(0, Math.min(1, (p-time)*18))));
      return el;
    }

    function fork(a,b) {
      return mobile ? [a,[a[0],(a[1]+b[1])/2],[b[0],(a[1]+b[1])/2],b]
        : [a,[(a[0]+b[0])/2,a[1]],[(a[0]+b[0])/2,b[1]],b];
    }

    function twoInputs(offload, compare = false) {
      const inputs = mobile ? [[84,80],[276,80]] : [[122,111],[122,265]];
      const leaf = mobile ? [180,231] : [407,187];
      const endpoint = mobile ? [180,378] : [709,187];
      const routes = inputs.map(p => wire(fork(p,leaf),offload?'good':'burden'));
      const uplink = wire([leaf,endpoint],offload?'good':'burden');
      const arrivals = offload ? [.58] : [.56,.67];
      routes.forEach((path,i) => send(path,.05+i*.065,.30+i*.04,'data'));
      arrivals.forEach((end,i) => send(uplink,.35+i*.115,end,offload?'moving':'load'));
      if(compare) {
        send(uplink,.69,.81,'moving',true);
        routes.forEach(path => send(path,.81,.96,'moving',true));
      }
      inputs.forEach((p,i) => {
        node(p,i?'GPU B':'GPU A',{w:mobile?122:148,h:60,kind:'storage',sub:i?"输入 B":"输入 A"});
        if (compare) showAfter(label([p[0],p[1]+50],'A + B',{kind:'note'}),.9);
      });
      node(leaf,offload?"归约交换机":"交换机",
        {w:mobile?192:200,h:72,kind:offload?'active':'device',sub:offload?"求部分和":"仅转发"});
      node(endpoint,"端点",{w:mobile?179:177,h:72,kind:offload?'device':'rose',
        sub:offload?"接收部分和":"求和"});
      const result = offload && !compare ? leaf : endpoint;
      showAfter(label([result[0],result[1]+59],'A + B'),offload && !compare ? .38 : arrivals.at(-1));
      if (offload && !compare) showAfter(box([endpoint[0],endpoint[1]+48],25,11,'moving'),arrivals[0]);
      if(compare) {
        const counter = label(mobile?[205,316]:[551,133],"上联块数",{anchor:mobile?'start':'middle',kind:'note'});
        tracks.push(t => {
          const sent = arrivals.filter(end => t >= end).length;
          counter.textContent = T("上联块数") + ' · ' + sent;
        });
      }
    }

    function tree(down) {
      const root = mobile ? [180,75] : [420,62];
      const leaves = mobile ? [[86,226],[274,226]] : [[230,196],[610,196]];
      const endpoints = mobile ? [[51,387],[126,387],[234,387],[309,387]]
        : [[114,288],[305,288],[535,288],[726,288]];
      const branch = (low,high) => [low,[low[0],(low[1]+high[1])/2],[high[0],(low[1]+high[1])/2],high];
      const sums = ['A + B','C + D'];
      leaves.forEach((leaf,i) => {
        const middle = wire(branch(leaf,root),'good');
        send(middle,down?.09:.43,down?.40:.74,'moving',down);
        node(leaf,i?"叶交换机 B":"叶交换机 A",
          {w:mobile?158:176,h:62,kind:'active',sub:down?"复制结果":"求部分和"});
        if (!down) showAfter(label([leaf[0]+12,leaf[1]-45],sums[i],{anchor:'start',kind:'note'}),.34);
      });
      endpoints.forEach((p,i) => {
        const path = wire(branch(p,leaves[Math.floor(i/2)]),down?'good':'blue');
        send(path,down?.44:.06+(i%2)*.055,down?.85:.34+(i%2)*.035,down?'moving':'data',down);
        node(p,['GPU A','GPU B','GPU C','GPU D'][i],{w:mobile?70:120,h:52,kind:down?'active':'storage'});
        if(down){
          showAfter(box([p[0],p[1]+43],22,11,'moving'),.82);
        } else label([p[0],p[1]+48],['A','B','C','D'][i],{kind:'note'});
      });
      node(root,"根交换机",{w:189,h:72,kind:'active',sub:down?"向下分发":"合并部分和"});
      const total = label([root[0]+12,root[1]+57],'A + B + C + D',{anchor:'start',kind:'note'});
      if(!down) showAfter(total,.73);
    }

    const scenes = [() => twoInputs(false),() => twoInputs(true),() => tree(false),() => tree(true),
      () => twoInputs(offload,true)];

    function restart() {
      cancelAnimationFrame(frame);
      frame = 0;
      last = null;
      elapsed = 0;
      mobile = mobileQuery.matches;
      [width, height] = mobile ? mobileSize : desktop;
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      const title = window.SS_TOPIC_CFG.steps[current].t;
      svg.setAttribute('aria-label', title[window.SS_LANG === 'en' ? 1 : 0]);
      layers = Array.from({length: 5}, () => document.createElementNS(ns, 'g'));
      svg.replaceChildren(...layers);
      tracks = [];
      toggle.hidden = current !== scenes.length - 1;
      toggle.textContent = T("交换机归约");
      toggle.setAttribute('aria-pressed', String(offload));
      scenes[current]();
      label([width/2, height-14], "示意，不代表实测数字", {kind: 'note'});
      render(motionQuery.matches ? .97 : 0);
      if (!stopped && !motionQuery.matches) frame = requestAnimationFrame(tick);
    }

    function render(p) {
      tracks.forEach(update => update(p));
    }

    function tick(now) {
      if (last !== null) elapsed += Math.max(0, now-last);
      last = now;
      render((elapsed % 6300)/6300);
      frame = requestAnimationFrame(tick);
    }

    function layout() {
      restart();
      if (onLayout) onLayout(width/height, mobile);
    }

    mobileQuery.addEventListener('change', layout);
    motionQuery.addEventListener('change', restart);
    document.addEventListener('ss-lang', restart);
    restart();

    host.__anim = {
      show(i) { current = Math.max(0, Math.min(scenes.length-1, i)); restart(); },
      pause() { stopped = true; cancelAnimationFrame(frame); frame = 0; last = null; },
      resume() {
        stopped = false;
        if (!frame && !motionQuery.matches) frame = requestAnimationFrame(tick);
      },
      destroy() {
        this.pause();
        mobileQuery.removeEventListener('change', layout);
        motionQuery.removeEventListener('change', restart);
        document.removeEventListener('ss-lang', restart);
        host.classList.remove(prefix + '-anim');
        host.replaceChildren();
        delete host.__anim;
      },
      ratio() { return width/height; },
      step() { return current; }
    };
    return host.__anim;
  }

  window.SSAnim = window.SSAnim || {};
  window.SSAnim.sharp = {steps: 5, mount};
})();
