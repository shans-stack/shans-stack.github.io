(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const id = 'ar';
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

  const low = ['较低', 'Light'];
  const rising = ['升高', 'Rising'];
  const egressA = ['出口 A', 'Egress A'];
  const egressB = ['出口 B', 'Egress B'];

  function candidates({mobile, flow, text, box, link, block, send, signal}, mode) {
    const source = flow(81), fork = flow(184), merge = flow(579), target = flow(680);
    const lanes = [-104, 104].map((side) => [
      fork, flow(184, side), flow(579, side), merge
    ]);
    const paths = lanes.map((points, i) => link(points, i === 0 && mode < 3 ? 'rose' : mode === 1 ? 'sage' : 'normal'));
    const inLink = link([source, fork]);
    const out = link([merge, target], mode === 3 ? 'rose' : 'normal');
    box(source, ['发送端', 'Sender'], 100);
    box(target, ['目的端', 'Receiver'], 116);
    box(fork, '', 12, 'normal', 12);
    box(merge, '', 12, 'normal', 12);
    for (const [i, side] of [-104, 104].entries()) {
      text(flow(351, mobile ? side + (i === 0 ? -53 : 53) : side + (mode >= 2 ? 30 : -35)), i === 0 ? egressA : egressB, 'note');
    }
    if (mode < 2) {
      block(flow(300, -104), 'rose');
      block(flow(332, -104), 'rose');
      text(flow(403, mobile ? -57 : -66), rising, 'note');
      text(flow(403, mobile ? 61 : 147), low, 'note');
      send(inLink, {at: .4, duration: .55, from: .5, hold: .2, still: .77});
      send(paths[0], {at: 1.2, duration: 2.85, rest: .72, to: .94, tone: 'rose', still: .69});
      const choice = mode === 0 ? paths[0] : paths[1];
      send(choice, {at: 1.85, duration: 2.15, rest: mode === 0 ? 1.1 : 0,
        to: .9, tone: mode === 0 ? 'rose' : 'sage', still: mode === 0 ? .46 : .65});
      return;
    }
    if (mode === 2) {
      text(mobile ? [180, 44] : [380, 31], ['包先发 1，再发 2', 'Packet 1 leaves before Packet 2'], 'note');
      const first = link([source, ...lanes[0], target], 'rose');
      const second = link([source, ...lanes[1], target], 'sage');
      send(first, {at: .3, rest: .3, duration: 3.6, from: .07, to: .91, tone: 'rose', label: '1', still: .77});
      send(second, {at: 1.0, duration: 1.85, from: .07, to: .91, tone: 'sage', label: '2', still: .77});
      const caption = mobile ? [180, 487] : [590, 324];
      signal(caption, ['到达：2', 'Arrival: 2'], 2.85, 4.2);
      signal(caption, ['到达：2 → 1', 'Arrival: 2, then 1'], 4.2, Infinity);
      return;
    }
    const feedback = link([merge, flow(579, mobile ? -182 : -156), flow(81, mobile ? -182 : -156), source], 'control');
    const queue = mobile ? flow(623) : flow(609);
    block(queue, 'rose');
    text(mobile ? [272, 427] : [641, 216], ['共享瓶颈', 'Shared bottleneck'], 'note');
    text(mobile ? [180, 40] : [360, 39], ['拥塞反馈', 'Congestion feedback'], 'note');
    send(paths[0], {at: .35, duration: 1.25, to: .94, still: .65});
    send(paths[1], {at: .55, duration: 1.30, to: .94, still: .65});
    send(out, {at: 1.7, duration: .78, to: .37, tone: 'rose', still: .1});
    send(feedback, {at: 2.15, duration: 1.25, to: .92, still: .58});
    send(inLink, {at: 3.55, duration: .55, from: .5, hold: .25, still: .72});
    send(inLink, {at: 4.7, duration: .55, from: .5, hold: .25, still: .73});
  }

  const scenes = [
    [['两个流由哈希选到同一上联，另一上联负载较低', 'Hashing sends two flows to one uplink while the other has spare capacity'],
      (g) => candidates(g, 0)],
    [['后续传输从较低负载的出口发送', 'Later traffic uses the less loaded egress port'],
      (g) => candidates(g, 1)],
    [['第二个包走另一条路，先于第一个包到达', 'The second packet takes the other path and arrives before the first'],
      (g) => candidates(g, 2)],
    [['以太网 ECMP 与 InfiniBand 自适应路由组', 'Ethernet ECMP and InfiniBand adaptive routing groups'],
      ({mobile, text, box, link, send}) => {
        const groups = [
          ['以太网 · ECMP 成员', 'Ethernet · ECMP members'],
          ['InfiniBand · 自适应路由组', 'InfiniBand · AR group']
        ];
        groups.forEach((title, i) => {
          const x = mobile ? 180 : 193 + i * 376;
          const y = mobile ? 44 + i * 228 : 56;
          text([x, y], title);
          box([x, y + 53], ['交换机', 'Switch'], 105);
          for (const [j, offset] of [-74, 74].entries()) {
            const path = link([[x, y + 71], [x, y + 103], [x + offset, y + 103], [x + offset, y + 151]]);
            box([x + offset, y + 164], j === 0 ? egressA : egressB, 114);
            send(path, {at: .5 + j * .7, duration: 1.5, to: .93, still: .75, hold: 1.3});
          }
        });
      }],
    [['多条路径汇入共享瓶颈，反馈调节发送速率', 'Paths converge at a bottleneck and feedback adjusts the send rate'],
      (g) => candidates(g, 3)]
  ];
  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = {steps: 5, mount};
})();
