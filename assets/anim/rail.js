(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const id = 'rail';
  const local = (label) => Array.isArray(label) ? label[window.SS_LANG === 'en' ? 1 : 0] : label;
  const size = (mobile) => mobile ? [360, 530] : [760, 376];
  const clamp = (n) => Math.max(0, Math.min(1, n));

  function mount(host, {onLayout, paused = false} = {}) {
    const narrow = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(NS, 'svg');
    svg.classList.add(id + '-scene');
    svg.setAttribute('role', 'img');
    host.replaceChildren(svg);
    let index = 0, frame = 0, elapsed = 0, last = null, tracks = [];
    let mobile, wires, packets, labels;

    function draw(tag, attrs, parent = labels) {
      const node = document.createElementNS(NS, tag);
      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
      parent.append(node);
      return node;
    }

    function ink(tone) {
      return id + '-' + tone;
    }

    function text([x, y], label, tone = 'label', anchor = 'middle', parent = labels) {
      const node = draw('text', {x, y, 'text-anchor': anchor, class: ink(tone)}, parent);
      node.textContent = local(label);
      return node;
    }

    function box([x, y], label, w = 112, tone = 'normal', h = 36) {
      const rect = draw('rect', {x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 4,
        class: ink('box') + ' ' + ink(tone)});
      if (label) text([x, y], label);
      return rect;
    }

    function link(points, tone = 'normal') {
      return draw('polyline', {points: points.map(p => p.join(',')).join(' '),
        class: ink('link') + ' ' + ink(tone)}, wires);
    }

    function block([x, y], tone = 'neutral', label = '', parent = labels) {
      const group = draw('g', {transform: 'translate(' + x + ' ' + y + ')'}, parent);
      const w = label ? 23 : 16;
      draw('rect', {x: -w / 2, y: label ? -11 : -6, width: w, height: label ? 22 : 12,
        rx: 3, class: ink('block') + ' ' + ink(tone)}, group);
      if (label) text([0, 0], label, 'token', 'middle', group);
      return group;
    }

    function send(path, {at = 0, duration = 1.8, tone = 'neutral', label = '', from = 0, to = 1, hold = .45, still = to, rest = 0, foreground = false} = {}) {
      const group = block([0, 0], tone, label, foreground ? labels : packets);
      const length = path.getTotalLength();
      const update = (time) => {
        const age = time - at;
        const progress = reduced.matches ? still : from + (to - from) * clamp((age - rest) / duration);
        const point = path.getPointAtLength(length * progress);
        group.setAttribute('transform', 'translate(' + point.x + ' ' + point.y + ')');
        group.style.opacity = reduced.matches ? 1 : Math.min(clamp(age / .15), clamp((rest + duration + hold - age) / .18));
      };
      tracks.push(update);
    }

    function signal([x, y], label, at, until, tone = 'note') {
      const node = text([x, y], label, tone);
      tracks.push((time) => {
        node.style.opacity = reduced.matches ? Number(until === Infinity) :
          Math.min(clamp((time - at) / .16), clamp((until - time) / .16));
      });
    }

    function flow(u, v = 0) {
      return mobile ? [180 + v * .77, 50 + (u - 50) * .65] : [u, 171 + v];
    }

    function paint(t) {
      for (const track of tracks) track(t);
    }

    function tick(now) {
      if (reduced.matches) {
        rebuild();
        return;
      }
      if (last !== null) elapsed += Math.max(0, Math.min(.05, (now - last) / 1000));
      last = now;
      paint(elapsed % 5.8);
      frame = requestAnimationFrame(tick);
    }

    function stop() {
      cancelAnimationFrame(frame);
      last = null;
    }

    function play() {
      stop();
      if (!paused && !reduced.matches) frame = requestAnimationFrame(tick);
    }

    function rebuild() {
      mobile = narrow.matches;
      const [w, h] = size(mobile);
      tracks = [];
      svg.replaceChildren();
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      svg.setAttribute('aria-label', local(scenes[index][0]));
      svg.dataset.step = index + 1;
      wires = draw('g', {}, svg);
      packets = draw('g', {}, svg);
      labels = draw('g', {}, svg);
      scenes[index][1]({mobile, reduced: reduced.matches, tracks, flow, text, box, link, block, send, signal});
      text([20, h - 17], ['示意，不代表实测数字', 'Schematic, no measured figures'], 'note', 'start');
      if (onLayout) onLayout(w / h, mobile);
      paint(elapsed % 5.8);
      play();
    }

    narrow.addEventListener('change', rebuild);
    reduced.addEventListener('change', rebuild);
    document.addEventListener('ss-lang', rebuild);
    rebuild();
    const controller = {
      show(i) {
        index = Math.min(scenes.length - 1, Math.max(0, i));
        elapsed = 0;
        rebuild();
      },
      pause() { paused = true; stop(); },
      resume() { if (paused) { paused = false; play(); } },
      destroy() {
        stop();
        narrow.removeEventListener('change', rebuild);
        reduced.removeEventListener('change', rebuild);
        document.removeEventListener('ss-lang', rebuild);
        if (host.__anim === controller) delete host.__anim;
        svg.remove();
      },
      ratio() { const [w, h] = size(mobile); return w / h; },
      step() { return index; }
    };
    host.__anim = controller;
    return controller;
  }

  const portA = ['端口 A', 'Port A'];
  const portB = ['端口 B', 'Port B'];
  const leafA = 'Leaf A';
  const leafB = 'Leaf B';
  const spine = 'Spine';

  function railPair({mobile, flow, text, box, link, send}, collective) {
    const xs = [102, 380, 658];
    const rails = [[-99, portA, leafA], [99, portB, leafB]];
    for (const [lane, port, leaf] of rails) {
      const points = xs.map((x) => flow(x, lane));
      const path = link(points);
      [port, leaf, port].forEach((label, i) => box(points[i], label, 98));
      send(path, {at: .55, duration: 2.35, from: .105, to: .88, still: .76});
      if (collective) send(path, {at: 1.3, duration: 2.35, from: .105, to: .88, still: .25});
    }
    text(mobile ? [180, 53] : [102, 41], ['节点 A', 'Node A'], 'note');
    text(mobile ? [180, 488] : [658, 41], ['节点 B', 'Node B'], 'note');
    if (collective) text(mobile ? [180, 335] : [380, 307], ['环或树选用对应端口', 'Ring or tree uses matching ports'], 'note');
  }

  const scenes = [
    [['节点内两个 GPU 各有对应的本地网卡端口', 'Two GPUs map to their respective local NIC ports'],
      ({mobile, flow, text, box, link, send}) => {
        for (const [lane, gpu, port] of [[-99, 'GPU A', portA], [99, 'GPU B', portB]]) {
          box(flow(133, lane), gpu, 93);
          box(flow(630, lane), port, 93);
          const path = link([flow(133, lane), flow(630, lane)]);
          send(path, {at: .5, duration: 2.3, from: .11, to: .89, still: .65});
        }
        text(flow(380), 'PCIe', 'note');
        text(mobile ? [180, 61] : [380, 42], ['节点内的对应关系', 'Mapping Within One Node'], 'note');
      }],
    [['各节点的对应端口连接到同一台 Leaf', 'Corresponding node ports share the same leaf'],
      (g) => railPair(g, false)],
    [['同 Leaf 内转发与跨 Leaf 经 Spine 转发', 'Forwarding through one leaf or across leaves through a spine'],
      ({mobile, flow, text, box, link, send}) => {
        const a = flow(92, -93), l = flow(248, -93), r = flow(508, 94), b = flow(676, 94);
        const s = flow(378), peer = flow(676, -93);
        const localPath = link([a, l, peer], 'sage');
        const cross = link([a, l, flow(378, -93), s, flow(378, 94), r, b]);
        [[a, portA], [l, leafA], [peer, portA], [r, leafB], [b, portB], [s, spine]]
          .forEach(([p, label]) => box(p, label, 95));
        send(localPath, {at: .45, duration: 2, from: .09, to: .88, hold: 1, tone: 'sage', still: .78});
        send(cross, {at: 1.55, duration: 2.45, from: .06, to: .9, hold: 1.35, still: .65});
        text(mobile ? [180, 46] : [380, 40], ['同轨与跨轨路径', 'Same-Rail and Cross-Rail Paths'], 'note');
      }],
    [['通信库为各节点选择对应轨道端口', 'A collective selects matching rail ports across nodes'],
      (g) => railPair(g, true)],
    [['同一轨道分属不同 Leaf 时路径经 Spine', 'Same-rail traffic uses a spine when ports attach to different leaves'],
      ({mobile, flow, text, box, link, send}) => {
        const positions = [75, 219, 380, 541, 685].map((x) => flow(x));
        [portA, 'Leaf A1', spine, 'Leaf A2', portA].forEach((label, i) => box(positions[i], label, 95));
        const path = link(positions);
        send(path, {at: .6, duration: 2.7, from: .08, to: .92, hold: 1.65, still: .62});
        text(flow(380, mobile ? 125 : 56), ['均属轨道 A', 'Both on rail A'], 'note');
      }]
  ];
  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = {steps: 5, mount};
})();
