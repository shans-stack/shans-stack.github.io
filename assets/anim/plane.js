(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const id = 'plane';
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

  const nodeA = ['节点 A', 'Node A'];
  const nodeB = ['节点 B', 'Node B'];

  function dual({mobile, reduced, tracks, flow, text, box, link, send, signal}, phase) {
    const shared = phase === 3;
    const a = flow(102), b = flow(658);
    const ports = [-96, 96].map((lane) => [flow(102, lane), flow(658, lane)]);
    const fabrics = [-96, 96].map((lane) => flow(379, lane));
    const leftOffsets = [-96, 96].map((lane) => flow(102, lane * .53));
    const rightOffsets = [-96, 96].map((lane) => flow(658, lane * .53));
    const pathA = link([ports[0][0], fabrics[0], ports[0][1]], phase === 2 ? 'sage' : 'normal');
    const pathB = link([ports[1][0], fabrics[1], ports[1][1]], phase === 2 ? 'fault' : 'normal');
    const sharedParts = [];
    ports.forEach(([p, q], i) => {
      sharedParts.push(link([leftOffsets[i], p]));
      link([rightOffsets[i], q]);
      sharedParts.push(box(p, ['端口 ' + 'AB'[i], 'Port ' + 'AB'[i]], 67, 'normal', 32));
      box(q, ['端口 ' + 'AB'[i], 'Port ' + 'AB'[i]], 67, 'normal', 32);
      const [x, y] = fabrics[i];
      box(fabrics[i], (i === 1 && phase === 2) ? ['平面 B 中断', 'Plane B down'] :
        ['平面 ' + 'AB'[i], 'Plane ' + 'AB'[i]], 112, i === 1 && phase === 2 ? 'fault' : 'normal');
      if (i === 1 && phase === 2) text([x, y + (mobile ? 32 : 54)], ['链路中断', 'Link failure'], 'note');
    });
    const head = mobile ? [180, 45] : [380, 40];
    if (shared) {
      text(head, ['同一张双端口网卡', 'One Dual-Port NIC'], 'note');
      sharedParts.push(box(a, ['网卡', 'NIC'], 75));
      box(b, nodeB, 78);
      const failure = 2.65;
      tracks.push((t) => {
        for (const part of sharedParts) part.classList.toggle('plane-fault', reduced || t >= failure);
      });
      signal(mobile ? [180, 385] : [380, 321], ['网卡故障，两个端口失效', 'NIC fault takes down both ports'], failure, Infinity);
      if (!reduced) {
        for (const path of [pathA, pathB]) send(path, {at: .45, duration: 1.8, from: .14, to: .86, hold: .26});
      }
      return;
    }
    box(a, nodeA, 63);
    box(b, nodeB, 63);
    if (phase === 1) text(head, ['同一连接经两组端口发送', 'One Connection Uses Both Port Groups'], 'note');
    if (phase === 2) text(head, ['平面 A 继续转发', 'Plane A Continues Forwarding'], 'note');
    send(pathA, {at: .45, duration: 2.45, from: .09, to: .91, still: .74, tone: phase === 2 ? 'sage' : 'neutral'});
    if (phase === 1 || phase === 2) send(pathA, {at: 1.8, duration: 2.45, from: .09, to: .91, still: .23, tone: phase === 2 ? 'sage' : 'neutral'});
    if (phase < 2) send(pathB, {at: phase === 1 ? 1.12 : .45, duration: 2.45, from: .09, to: .91, still: .74});
    if (phase === 1) send(pathB, {at: 2.45, duration: 2.45, from: .09, to: .91, still: .23});
  }

  const scenes = [
    [['两条上联路径仍共享两端的 Leaf', 'Two uplink paths share the endpoint leaves'],
      ({mobile, flow, text, box, link, send}) => {
        const a = flow(96), b = flow(663), l = flow(237), r = flow(523);
        link([a, l]);
        link([r, b]);
        for (const [i, lane] of [-105, 105].entries()) {
          const points = [a, l, flow(237, lane), flow(523, lane), r, b];
          const path = link(points);
          box(flow(380, lane), 'Spine ' + 'AB'[i], 103);
          send(path, {at: .48 + i * .53, duration: 2.2, from: .07, to: .93, still: .72});
        }
        [[a, nodeA], [l, 'Leaf A'], [r, 'Leaf B'], [b, nodeB]].forEach(([p, label]) => box(p, label, 95));
        text(mobile ? [180, 42] : [380, 40], ['单一交换平面', 'One Switching Plane'], 'note');
      }],
    [['不同端口分别接入独立平面 A 和 B', 'Separate ports attach to independent planes A and B'],
      (g) => dual(g, 0)],
    [['同一连接的包经过两个平面的端口', 'Packets from one connection use ports on both planes'],
      (g) => dual(g, 1)],
    [['B 平面中断，后续传输使用 A 平面', 'Plane B is down and later traffic uses plane A'],
      (g) => dual(g, 2)],
    [['两平面共用的网卡故障，两个端口同时失效', 'A failure in the shared NIC takes down both ports'],
      (g) => dual(g, 3)]
  ];
  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = {steps: 5, mount};
})();
