(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const id = 'gdr';
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

  const source = ['源显存', 'Source GPU'];
  const target = ['目标显存', 'Target GPU'];
  const ram = ['主机内存', 'Host RAM'];
  const nic = ['RDMA 网卡', 'RDMA NIC'];
  const cpu = ['CPU 软件', 'CPU software'];
  const pci = 'PCIe';
  const net = ['节点间网络', 'Network'];

  function transfer({mobile, flow, text, box, link, block, send}, staged) {
    if (staged) {
      const a = flow(60), ra = flow(190), na = flow(303), nb = flow(454), rb = flow(564), b = flow(700);
      const qa = flow(247), qb = flow(620), dest = flow(674);
      link([a, ra, na, nb, rb, b], 'rose');
      [[a, source], [ra, ram], [na, ['网卡', 'NIC']], [nb, ['网卡', 'NIC']], [rb, ram], [b, target]]
        .forEach(([p, label]) => box(p, label, 100));
      text(flow(379, mobile ? -120 : -35), net, 'note');
      block(flow(114));
      send(link([flow(114), ra, qa], 'rose'), {at: .28, duration: 1.0, hold: 4.0, tone: 'rose'});
      send(link([qa, na, nb, rb, qb], 'rose'),
        {at: 1.36, duration: 1.8, hold: 2.2, tone: 'rose', still: .96});
      send(link([qb, dest], 'rose'),
        {at: 3.26, duration: .85, hold: 1.4, tone: 'rose', foreground: true});
      text(flow(138, mobile ? 122 : 52), ['发送侧复制', 'Send-side copy'], 'note');
      text(flow(630, mobile ? 122 : 52), ['接收侧复制', 'Receive-side copy'], 'note');
      return;
    }
    const [a, na, nb, b] = [60, 245, 515, 700].map((x) => flow(x));
    const path = link([a, na, nb, b], 'sage');
    [[a, source], [na, nic], [nb, nic], [b, target]].forEach(([p, label]) => box(p, label, 104));
    for (const x of [155, 605]) text(flow(x, mobile ? -114 : -33), pci, 'note');
    text(flow(380, mobile ? -120 : -33), net, 'note');
    box(flow(245, 146), ram, 96, 'idle');
    box(flow(515, 146), ram, 96, 'idle');
    block(flow(114));
    send(path, {at: .4, duration: 2.65, from: .085, to: .90, hold: 2.4, tone: 'sage', still: .90});
  }

  const scenes = [
    [['跨节点传输，两端都经过主机内存', 'Cross-node transfer staged in host memory at both ends'],
      (g) => transfer(g, true)],
    [['网卡直接访问本地显存，中间为节点间网络', 'NICs access local GPU memory and exchange data over the network'],
      (g) => transfer(g, false)],
    [['CPU 注册和提交，网卡搬运数据', 'CPU software registers and submits, while the NIC moves data'],
      ({mobile, flow, text, box, link, send, block}) => {
        const a = flow(176), n = flow(572), c = flow(374, -135);
        const control = link([c, flow(572, -135), n], 'control');
        const data = link([a, n]);
        box(a, ['显存缓冲区', 'GPU buffer'], 132);
        box(n, nic, 122);
        box(c, cpu, 138);
        text(mobile ? [79, 301] : [510, 73], ['注册 / 提交', 'Register / submit'], 'note');
        text(flow(376, mobile ? 83 : 46), ['DMA 数据', 'DMA payload'], 'note');
        block(flow(243));
        send(control, {at: .48, duration: 1.3, to: .86, still: .7});
        send(data, {at: 2.0, duration: 1.75, from: .169, to: .82, hold: 1.8, still: .78});
      }],
    [['先写完目标显存，再提交依赖运算', 'The target buffer is written before dependent work starts'],
      ({mobile, flow, text, box, link, send, signal}) => {
        const a = flow(132), b = flow(382), c = flow(632);
        const data = link([a, b]);
        const sync = link([b, c], 'control');
        box(a, nic, 128);
        box(b, ['目标显存', 'GPU buffer'], 132);
        box(c, ['依赖运算', 'GPU work'], 146);
        text(flow(256, mobile ? -100 : -39), ['写入显存', 'NIC write'], 'note');
        text(flow(500, mobile ? -120 : -39), ['CUDA 同步', 'CUDA sync'], 'note');
        signal(mobile ? [272, 305] : flow(382, 52), ['写入完成', 'Write complete'], 1.85, Infinity);
        send(data, {at: .35, duration: 1.35, from: .27, to: .72, hold: 3.9, still: .72});
        send(sync, {at: 2.1, duration: 1.15, from: .30, to: .69, hold: 2.2, still: .65});
      }],
    [['PCIe 直达与主机缓冲两种候选路径', 'Direct PCIe and host-staged paths are candidates'],
      ({mobile, flow, text, box, link, send}) => {
        const side = 151;
        const a = flow(124), b = flow(634), p = flow(376), r = flow(376, side);
        link([a, flow(124, side), r, flow(634, side), b], 'control');
        const direct = link([a, p, b], 'sage');
        box(a, source, 112);
        box(b, nic, 116);
        box(p, ['PCIe 交换机', 'PCIe switch'], 125);
        box(r, ram, 104, 'idle');
        text(mobile ? [90, 225] : flow(365, -42), ['直达路径', 'Direct path'], 'note');
        text(mobile ? [277, 304] : flow(375, 171), ['中转分支', 'Staging path'], 'note');
        send(direct, {at: .48, duration: 2.4, from: .12, to: .87, hold: 2, tone: 'sage', still: .87});
      }]
  ];
  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = {steps: 5, mount};
})();
