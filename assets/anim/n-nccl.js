(function () {
  const id = 'n-nccl';
  const ns = 'http://www.w3.org/2000/svg';
  const tr = pair => {
    const [zh, en = zh] = pair.split('|');
    return window.SS_LANG === 'en' ? en : zh;
  };
  const cls = name => id + '-' + name;
  const cycle = 6;

  function element(parent, tag, attrs, content) {
    const el = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    if (content) el.textContent = content;
    parent.append(el);
    return el;
  }

  function mount(host, { paused = false, onLayout } = {}) {
    const narrow = matchMedia('(max-width: 640px)');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = element(host, 'svg', { class: cls('scene'), role: 'img' });
    let step = 0, width, height, elapsed, last, frame = 0, layers;
    host.classList.add(cls('host'));

    function paint(time) {
      for (const show of layers) show(time);
    }
    function tick(now) {
      elapsed = (elapsed + Math.min(0.05, Math.max(0, (now - last) / 1000))) % cycle;
      last = now;
      paint(elapsed);
      frame = requestAnimationFrame(tick);
    }
    function run() {
      if (paused || reduce.matches || frame) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
    }

    function rebuild() {
      stop();
      const mobile = narrow.matches;
      width = mobile ? 360 : 900;
      height = mobile ? 440 : 340;
      layers = [];
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.dataset.step = step + 1;
      svg.setAttribute('aria-label', tr(scenes[step].caption));
      svg.replaceChildren();
      const background = element(svg, 'g', {});
      const wiring = element(svg, 'g', {});
      const nodes = element(svg, 'g', {});
      const tokens = element(svg, 'g', { 'aria-hidden': 'true' });
      const labelAt = (parent, x, y, value, type = 'label', anchor = 'middle') =>
        element(parent, 'text', { x, y, class: cls(type), 'text-anchor': anchor, 'dominant-baseline': 'central' }, tr(value));
      const label = (p, value, type, anchor) => labelAt(nodes, ...p, value, type, anchor);
      const rect = (parent, x, y, w, h, style) =>
        element(parent, 'rect', { x, y, width: w, height: h, rx: 6, class: cls(style) });

      function box(p, value, { note, w = mobile ? 142 : 174, h = note ? 60 : 48, tone, at } = {}) {
        const [x, y] = p;
        const group = element(nodes, 'g', { class: cls('box') + (tone ? ' ' + cls(tone) : '') });
        rect(group, x - w / 2, y - h / 2, w, h, 'card');
        const titleY = note ? y - 11 : y;
        if (value) labelAt(group, x, titleY, value);
        if (note) labelAt(group, x, y + 12, note, 'detail');
        if (at !== undefined) layers.push(time => group.classList.toggle(cls('ready'), time >= at));
        return { x, y, w, h, group };
      }

      function outline(p, w, h, title) {
        const [x, y] = p;
        rect(background, x - w / 2, y - h / 2, w, h, 'outline');
        if (title) labelAt(nodes, x, y - h / 2 + 17, title, 'detail');
      }

      function reveal(p, value, at, type = 'label') {
        const item = label(p, value, type);
        layers.push(time => { item.style.opacity = time >= at ? 1 : 0; });
      }

      function path(a, b, { axis = a.y === b.y ? 'h' : 'v', bend, offset = 0, fromOffset = offset, toOffset = offset, tone = 'data' } = {}) {
        const horizontal = axis === 'h';
        const direction = Math.sign(horizontal ? b.x - a.x : b.y - a.y);
        const [x1, y1, x2, y2] = horizontal
          ? [a.x + direction * a.w / 2, a.y + fromOffset, b.x - direction * b.w / 2, b.y + toOffset]
          : [a.x + fromOffset, a.y + direction * a.h / 2, b.x + toOffset, b.y - direction * b.h / 2];
        const mid = bend ?? (horizontal ? (x1 + x2) / 2 : (y1 + y2) / 2);
        const d = horizontal ? `M${x1} ${y1}H${mid}V${y2}H${x2}` : `M${x1} ${y1}V${mid}H${x2}V${y2}`;
        const line = element(wiring, 'path', { d, class: cls('line') + ' ' + cls(tone) });
        const dx = horizontal ? direction : 0, dy = horizontal ? 0 : direction;
        const tip = side => `${x2 - 7 * dx - side * dy} ${y2 - 7 * dy + side * dx}`;
        element(wiring, 'polyline', { points: `${tip(-4)} ${x2} ${y2} ${tip(4)}`, class: cls('arrow') + ' ' + cls(tone) });
        return line;
      }

      function travel(line, start, duration = 0.65, tone = 'data', letter) {
        const length = line.getTotalLength();
        const marker = element(tokens, 'g', { class: cls('token') + ' ' + cls(tone) });
        if (tone === 'control') element(marker, 'circle', { r: 4.5 });
        else rect(marker, letter ? -16 : -6, letter ? -11 : -4, letter ? 32 : 12, letter ? 22 : 8, 'packet');
        if (letter) labelAt(marker, 0, 0, letter, 'letter');
        layers.push(time => {
          const progress = (time - start) / duration;
          marker.style.opacity = Math.max(0, Math.min(1, progress * 12, (1 - progress) * 12));
          const point = line.getPointAtLength(length * Math.max(0, Math.min(1, progress)));
          marker.setAttribute('transform', `translate(${point.x} ${point.y})`);
        });
      }

      function link(a, b, { at, duration, tone, letter, ...routing } = {}) {
        const line = path(a, b, { tone, ...routing });
        if (at !== undefined) travel(line, at, duration, tone, letter);
        return line;
      }

      function chain(items, options = {}) {
        const { at = 0.45, interval = 0.72, tone } = options;
        for (let i = 1; i < items.length; i++) {
          link(items[i - 1], items[i], { at: at + (i - 1) * interval, tone });
        }
      }

      const p = (x, y, mx, my) => mobile ? [mx, my] : [x, y];
      scenes[step].draw({ p, mobile, box, outline, label, reveal, link, travel, chain });
      labelAt(svg, width / 2, height - 15, '示意，不代表实测数字|Schematic, not measured', 'detail');
      elapsed = 0;
      paint(reduce.matches ? 5.7 : elapsed);
      if (onLayout) onLayout(width / height, mobile);
      run();
    }

    for (const query of [narrow, reduce]) query.addEventListener('change', rebuild);
    document.addEventListener('ss-lang', rebuild);
    const control = {
      show(i) { step = Math.max(0, Math.min(scenes.length - 1, i)); rebuild(); },
      pause() { paused = true; stop(); },
      resume() { paused = false; run(); },
      destroy() {
        stop();
        for (const query of [narrow, reduce]) query.removeEventListener('change', rebuild);
        document.removeEventListener('ss-lang', rebuild);
        svg.remove();
        host.classList.remove(cls('host'));
        delete host.__anim;
      },
      ratio() { return width / height; },
      step() { return step; }
    };
    host.__anim = control;
    rebuild();
    return control;
  }

  const scenes = [
    {
      caption: '通信器把 rank 分配给参与设备，组外 GPU 不参与|The communicator assigns ranks to participating devices, leaving the outside GPU separate',
      draw({ p, mobile, box, outline, link, label }) {
        const comm = box(p(394, 62, 180, 59), 'NCCL', { note: '通信器|Communicator', w: 174 });
        outline(p(394, 218, 180, 223), mobile ? 334 : 688, mobile ? 175 : 157);
        for (let i = 0; i < 3; i++) {
          const rank = box(p(177 + i * 217, 224, 70 + 110 * i, 226), 'Rank ' + i, { note: 'GPU ' + i, w: mobile ? 94 : 165, at: 1.3 });
          link(comm, rank, { at: 0.65, offset: (i - 1) * 25, tone: 'control' });
        }
        label(p(394, 278, 180, 284), '集合操作参与者|Collective Participants', 'detail');
        box(p(818, 224, 180, 354), '组外 GPU|Outside GPU', { note: '不参与|Not a Participant', tone: 'idle', w: 149 });
      }
    },
    {
      caption: 'All-Reduce 按位置求和，两个 rank 得到相同结果|All-Reduce adds corresponding elements and gives each rank the same result',
      draw({ p, box, label, reveal }) {
        label(p(450, 61, 180, 66), 'All-Reduce · 按位置求和|All-Reduce · Elementwise Sum');
        label(p(450, 103, 180, 118), '[1, 2] + [3, 4] = [4, 6]');
        box(p(228, 183, 89, 213), 'Rank 0', { note: '输入 [1, 2]|Input [1, 2]' });
        box(p(672, 183, 271, 213), 'Rank 1', { note: '输入 [3, 4]|Input [3, 4]' });
        reveal(p(228, 241, 89, 279), '结果 [4, 6]|Output [4, 6]', 1.1);
        reveal(p(672, 241, 271, 279), '结果 [4, 6]|Output [4, 6]', 1.1);
      }
    },
    {
      caption: 'Reduce-Scatter 合并各 rank 的贡献，All-Gather 复制归约分片|Reduce-Scatter combines contributions from each rank, then All-Gather copies the reduced shards',
      draw({ p, box, link, reveal, label }) {
        label(p(450, 33, 180, 39), 'Reduce-Scatter');
        label(p(210, 70, 89, 84), 'Rank 0 · A₀, B₀');
        label(p(690, 70, 271, 84), 'Rank 1 · A₁, B₁');
        const a = box(p(210, 122, 89, 147), 'Rank 0', { note: 'AΣ = A₀ + A₁', at: 1.1 });
        const b = box(p(690, 122, 271, 147), 'Rank 1', { note: 'BΣ = B₀ + B₁', at: 1.1 });
        label(p(450, 183, 180, 228), 'All-Gather');
        const aa = box(p(210, 267, 89, 337), 'Rank 0', { note: '保留 AΣ|Keeps AΣ' });
        const bb = box(p(690, 267, 271, 337), 'Rank 1', { note: '保留 BΣ|Keeps BΣ' });
        link(a, aa, { tone: 'idle', offset: -40 });
        link(b, bb, { tone: 'idle', offset: 40 });
        link(a, bb, { at: 1.45, duration: 1.3, offset: 18, bend: p(0, 166, 0, 197)[1], letter: 'AΣ' });
        link(b, aa, { at: 1.45, duration: 1.3, offset: -18, bend: p(0, 216, 0, 259)[1], letter: 'BΣ' });
        reveal(p(210, 312, 89, 389), '[AΣ, BΣ]', 2.75);
        reveal(p(690, 312, 271, 389), '[AΣ, BΣ]', 2.75);
      }
    },
    {
      caption: '服务器内通过 NVLink 或 PCIe，跨服务器通过网卡和网络|Within a host, traffic uses NVLink or PCIe. Between hosts, it uses adapters and a fabric',
      draw({ p, mobile, box, outline, link, chain, label }) {
        outline(p(229, 145, 180, 100), mobile ? 338 : 346, mobile ? 172 : 222);
        outline(p(671, 145, 180, 324), mobile ? 338 : 346, mobile ? 172 : 222);
        label(p(229, 66, 28, 32), '节点 A · NVLink / PCIe|Node A · NVLink / PCIe', 'detail', mobile ? 'start' : 'middle');
        label(p(671, 66, 28, 253), mobile ? '节点 B|Node B' : '节点 B · NVLink / PCIe|Node B · NVLink / PCIe', 'detail', mobile ? 'start' : 'middle');
        const a0 = box(p(137, 119, 94, 75), 'GPU A0', { w: 116, h: 40 });
        const a1 = box(p(320, 119, 268, 75), 'GPU A1', { w: 116, h: 40 });
        const b0 = box(p(583, 119, 94, 344), 'GPU B0', { w: 116, h: 40 });
        const b1 = box(p(756, 119, 268, 344), 'GPU B1', { w: 116, h: 40 });
        const tx = box(p(320, 212, 180, 150), '网卡 A|NIC A', { w: 113, h: 40 });
        const rx = box(p(583, 212, 180, 289), '网卡 B|NIC B', { w: 113, h: 40 });
        const net = box(p(451, 212, 180, 209), '网络|Fabric', { w: 108, h: 39 });
        link(a0, a1, { at: 0.38, tone: 'control' });
        link(b0, b1, { at: 0.38, tone: 'control' });
        chain([a1, tx, net, rx, b0], { at: 1.35 });
      }
    },
    {
      caption: 'GPU 依次产生数据、完成 NCCL 集合操作并使用结果|The GPU produces data, completes the NCCL collective, and consumes the result in order',
      draw({ p, box, chain, link }) {
        const cpu = box(p(448, 63, 180, 48), '主机提交|Host Enqueue', { note: 'CPU' });
        const compute = box(p(155, 207, 180, 150), '计算梯度|Compute Gradients', { w: 190, at: 1.0 });
        const reduce = box(p(448, 207, 180, 251), 'NCCL', { note: '集合操作|Collective', w: 174, at: 1.95 });
        const update = box(p(741, 207, 180, 357), '使用结果|Consume Result', { w: 190, at: 2.67 });
        link(cpu, compute, { at: 0.35, tone: 'control' });
        chain([compute, reduce, update], { at: 1.3 });
      }
    }
  ];

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = { steps: 5, mount };
})();
