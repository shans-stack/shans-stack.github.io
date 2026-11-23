(function () {
  const id = 'n-spx';
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
        else rect(marker, letter ? -11 : -6, letter ? -11 : -4, letter ? 22 : 12, letter ? 22 : 8, 'packet');
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
      caption: '网络软件配置 Spectrum 交换机，SuperNIC 连接两端服务器|Network software configures the Spectrum switch, and SuperNICs connect the servers',
      draw({ p, mobile, box, link }) {
        const os = box(p(450, 63, 180, 60), '网络软件|Network Software', { note: 'Cumulus Linux / SONiC', w: 230 });
        const tx = box(p(147, 210, 88, 315), 'SuperNIC A', { note: '服务器 A|Server A', w: 143 });
        const sw = box(p(450, 210, 180, 174), 'Spectrum', { note: '以太网交换机|Ethernet Switch', w: 205, at: 1.1 });
        const rx = box(p(753, 210, 272, 315), 'SuperNIC B', { note: '服务器 B|Server B', w: 143, at: 2.47 });
        link(os, sw, { at: 0.45, tone: 'control' });
        link(tx, sw, { at: 1.17, offset: mobile ? -28 : 0 });
        link(sw, rx, { at: 1.82, offset: mobile ? 28 : 0, bend: mobile ? 269 : undefined });
      }
    },
    {
      caption: 'RoCE 载荷沿 GPU 显存、两端 SuperNIC 和交换网络传输|RoCE payloads travel through GPU memory, both SuperNICs, and the switched fabric',
      draw({ p, mobile, box, chain, label }) {
        const a = box(p(92, 172, 180, 42), 'GPU A', { note: '显存|GPU Memory', w: 125 });
        const tx = box(p(259, 172, 180, 121), 'SuperNIC A', { w: 138 });
        const sw = box(p(450, 172, 180, 209), 'Spectrum', { note: '以太网|Ethernet', w: 188 });
        const rx = box(p(641, 172, 180, 298), 'SuperNIC B', { w: 138 });
        const b = box(p(808, 172, 180, 378), 'GPU B', { note: '显存|GPU Memory', w: 125, at: 3.26 });
        if (!mobile) label(p(450, 100, 180, 100), 'RoCE 数据路径|RoCE Data Path', 'detail');
        chain([a, tx, sw, rx, b]);
      }
    },
    {
      caption: 'Spectrum 交换机按出口拥塞状态把同一流的包分到不同路径|The Spectrum switch distributes one flow’s packets across paths in response to egress congestion',
      draw({ p, mobile, box, link, travel }) {
        const sw = box(p(151, 165, 180, 63), 'Spectrum', { note: '自适应路由|Adaptive Routing', w: 198 });
        const a = box(p(453, 87, 88, 220), '路径 A|Path A', { note: '拥塞升高|Rising Load', tone: 'warn', w: 145 });
        const b = box(p(453, 243, 272, 220), '路径 B|Path B', { note: '拥塞较低|Light Load', tone: 'active', w: 145 });
        const rx = box(p(752, 165, 180, 359), 'SuperNIC', { note: '同一数据流|Same Flow', w: 162, at: 2.6 });
        const axis = mobile ? 'v' : 'h';
        const outA = link(sw, a, { axis, offset: -25, tone: 'warn' });
        const outB = link(sw, b, { axis, offset: 25 });
        const inA = link(a, rx, { axis, offset: -25, tone: 'warn' });
        const inB = link(b, rx, { axis, offset: 25 });
        travel(outA, 0.55, 0.95, 'warn');
        travel(inA, 1.5, 1.03, 'warn');
        for (const start of [0.85, 1.4, 1.95]) {
          travel(outB, start, 0.8);
          travel(inB, start + 0.8, 0.8);
        }
      }
    },
    {
      caption: 'A 先发后到，接收 SuperNIC 将 A 和 B 写入原来的槽位|A is sent first but arrives later. The receiving SuperNIC places A and B in their original slots',
      draw({ p, mobile, box, outline, link, reveal, label }) {
        const a = box(p(132, 100, 87, 62), 'A', { note: '先发送|Sent First', w: 135 });
        const b = box(p(132, 236, 273, 62), 'B', { note: '后发送|Sent Second', w: 135 });
        const nic = box(p(436, 168, 180, 177), 'SuperNIC', { note: '接收端重排|Receiver Reordering', w: 208 });
        const axis = mobile ? 'v' : 'h';
        link(a, nic, { axis, offset: -25, at: 0.35, duration: 2.05, letter: 'A' });
        link(b, nic, { axis, offset: 25, at: 1.08, duration: 0.65, letter: 'B' });
        outline(p(745, 173, 180, 338), mobile ? 333 : 230, mobile ? 117 : 177, '接收缓冲区|Receive Buffer');
        const aSlot = box(p(746, 147, 89, 346), '', { w: 135, h: 39, at: 3.08 });
        const bSlot = box(p(746, 211, 271, 346), '', { w: 135, h: 39, at: 2.41 });
        link(nic, bSlot, { axis, fromOffset: 22, toOffset: 0, at: 1.76, letter: 'B', bend: mobile ? 248 : 580 });
        link(nic, aSlot, { axis, fromOffset: -22, toOffset: 0, at: 2.43, letter: 'A', bend: mobile ? 265 : 582 });
        label(p(692, 147, 36, 346), '槽位 A|Slot A', 'detail', 'start');
        label(p(692, 211, 218, 346), '槽位 B|Slot B', 'detail', 'start');
        reveal(p(786, 211, 312, 346), 'B', 2.41);
        reveal(p(786, 147, 130, 346), 'A', 3.08);
        label(p(744, 284, 180, 404), '按原位置交付|Original Positions', 'detail');
      }
    },
    {
      caption: '多个发送端汇聚到同一出口，收到反馈后拉大发包间隔|Many senders share one egress, then increase packet spacing after feedback',
      draw({ p, mobile, box, link, travel, reveal, label }) {
        const a = box(p(153, 101, 87, 59), '发送端 A|Sender A', { w: 137 });
        const b = box(p(153, 230, 273, 59), '发送端 B|Sender B', { w: 137 });
        const sw = box(p(453, 165, 180, 214), 'Spectrum', { note: '共同出口|Shared Egress', w: 198, tone: 'warn' });
        const rx = box(p(757, 165, 180, 345), '接收端|Receiver', { w: 157 });
        const axis = mobile ? 'v' : 'h';
        const lineA = link(a, sw, { axis, offset: -16 });
        const lineB = link(b, sw, { axis, offset: 16 });
        const egress = link(sw, rx, { tone: 'warn' });
        const feedA = link(sw, a, { axis, fromOffset: mobile ? -44 : -22, toOffset: -14, bend: mobile ? 153 : 265, tone: 'control' });
        const feedB = link(sw, b, { axis, fromOffset: mobile ? 44 : 22, toOffset: 14, bend: mobile ? 153 : 265, tone: 'control' });
        label(p(305, 272, 180, 112), '拥塞反馈|Congestion Feedback', 'detail');
        for (const start of [0.25, 0.53, 0.81, 1.09, 3.32, 4.39]) {
          travel(lineA, start, 0.77);
          travel(lineB, start + 0.08, 0.77);
          travel(egress, start + 0.76, 0.77, 'warn');
        }
        travel(feedA, 2.26, 0.9, 'control');
        travel(feedB, 2.26, 0.9, 'control');
        reveal(p(755, 222, 180, 393), '发包间隔增大|Wider Packet Spacing', 3.16, 'detail');
      }
    }
  ];

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = { steps: 5, mount };
})();
