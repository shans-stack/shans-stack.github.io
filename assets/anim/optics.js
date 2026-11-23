(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const id = 'optics';
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

  const copper = ['铜介质', 'Copper'];
  const fiber = ['光纤', 'Fiber'];
  const compatible = ['信号通过', 'Signal passes'];
  const mismatch = ['模式不匹配', 'Mode mismatch'];

  function cables({mobile, text, box, link, send}, kind) {
    const data = [
      [['铜链路', 'Copper Link'], ['光链路', 'Optical Link']],
      [['无源直连铜缆', 'Passive DAC'], ['有源铜缆', 'Active Copper']],
      [['一体式有源光缆', 'Integrated AOC'], ['光模块与独立光纤', 'Modules and Separate Fiber']],
      [['相容的信号模式', 'Compatible Signaling'], ['外形相容，模式不匹配', 'Plug Fits, Mode Differs']]
    ][kind];
    const xa = mobile ? 70 : 155, xb = mobile ? 290 : 605;
    data.forEach((title, i) => {
      const y = (mobile ? 153 : 108) + i * (mobile ? 238 : 156);
      const optical = kind === 2 || (kind === 0 && i === 1);
      const active = optical || (kind === 1 && i === 1);
      const tone = kind === 3 ? (i === 0 ? 'sage' : 'rose') : 'normal';
      const start = [xa, y], end = [xb, y];
      const a = [xa + 58, y], b = [xb - 58, y];
      text([mobile ? 20 : 44, y - (mobile ? 80 : 52)], title, 'heading', 'start');
      const left = link([start, a], tone);
      const core = link([a, b], optical ? 'optical' : tone);
      const right = link([b, end], i === 1 && kind === 3 ? 'fault' : tone);
      box(start, ['电端口', 'Electrical'], mobile ? 78 : 112);
      box(end, ['电端口', 'Electrical'], mobile ? 78 : 112, i === 1 && kind === 3 ? 'fault' : 'normal');
      if (active) {
        for (const point of [a, b]) box(point, '', 16, 'normal', 26);
      }
      if (kind === 2 && i === 1) {
        for (const x of [a[0] + 14, b[0] - 14]) box([x, y], '', 7, 'normal', 15);
      }
      const label = kind === 3 ? (i ? mismatch : compatible) :
        (optical ? fiber : copper);
      text([(xa + xb) / 2, y + 41], label, 'note');
      if (i === 1 && kind < 2) {
        text([(xa + xb) / 2, y + 69], kind === 0 ? ['两端进行光电转换', 'Signal conversion at both ends'] :
          ['端部有信号处理电路', 'Signal conditioning in the plugs'], 'note');
      }
      const packetTone = kind === 3 ? tone : 'neutral';
      send(left, {at: .5, duration: .55, from: .72, still: .78, hold: .15, tone: packetTone});
      send(core, {at: 1.05, duration: 1.55, hold: i === 1 && kind === 3 ? 1.7 : .12, to: i === 1 && kind === 3 ? .92 : 1,
        still: .69, tone: packetTone});
      if (i === 0 || kind !== 3) {
        send(right, {at: 2.6, duration: .6, to: mobile ? .26 : .10, still: mobile ? .26 : .10, hold: 1.25, tone: packetTone});
      }
    });
  }

  const scenes = [
    [['铜缆传电信号，光链路在两端转换信号', 'Copper carries electrical signals and optical links convert at each end'],
      (g) => cables(g, 0)],
    [['对照无源直连铜缆和带电路的有源铜缆', 'Passive direct-attach copper and active copper with signal conditioning'],
      (g) => cables(g, 1)],
    [['一体式 AOC 与两端模块之间的可换光纤', 'An integrated AOC and replaceable fiber between optical modules'],
      (g) => cables(g, 2)],
    [['相同的机械外形可以配成不同链路模式', 'One form factor can be used with different signaling modes'],
      (g) => cables(g, 3)],
    [['单个物理端口的两组通道分支到两个子端口', 'Lane groups from one physical port branch into two subports'],
      ({mobile, flow, text, box, link, send}) => {
        const a = flow(121);
        box(a, ['物理端口', 'Physical port'], 134);
        for (const [i, lane] of [-96, 96].entries()) {
          const first = flow(121, mobile ? lane * .28 : lane * .09);
          const side = flow(665, lane);
          const path = link([first, flow(335, mobile ? lane * .28 : lane * .09), flow(335, lane), side]);
          box(side, ['子端口 ' + 'AB'[i], 'Subport ' + 'AB'[i]], 105);
          text(flow(495, mobile ? lane + (i ? 45 : -45) : lane - 34), ['通道组 ' + 'AB'[i], 'Lane group ' + 'AB'[i]], 'note');
          send(path, {at: .55 + i * .42, duration: 2.4, from: .15, to: .90, still: .81});
        }
      }]
  ];
  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = {steps: 5, mount};
})();
