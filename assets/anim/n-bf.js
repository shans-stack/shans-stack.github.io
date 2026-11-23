(function () {
  const id = 'n-bf';
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
      caption: 'BlueField-3 连接主机与外部网络，设备包含 Arm、板上内存和 ConnectX 网络引擎|BlueField-3 connects the host to the network and contains Arm cores, onboard memory, and the ConnectX engine',
      draw({ p, mobile, box, outline, link, label }) {
        outline(p(450, 162, 180, 219), mobile ? 332 : 460, mobile ? 244 : 238);
        label(p(450, 68, 33, 118), '设备边界|Device Boundary', 'detail', mobile ? 'start' : 'middle');
        const host = box(p(110, 224, 180, 49), '主机|Host', { note: 'PCIe', w: 153 });
        const arm = box(p(450, 124, 98, 176), 'Arm', { note: '板上内存|Onboard RAM', w: mobile ? 140 : 180 });
        const nic = box(p(450, 224, 180, 285), 'BlueField-3', { note: 'ConnectX 网络引擎|ConnectX Engine', w: 216 });
        const fabric = box(p(790, 224, 180, 380), '外部网络|External Fabric', { w: 155 });
        link(arm, nic, { tone: 'control', at: 0.35, toOffset: mobile ? -68 : 0 });
        link(host, nic, { at: 1.26, offset: mobile ? 53 : 0 });
        link(nic, fabric, { at: 1.98 });
      }
    },
    {
      caption: 'Arm 下发转发规则，命中流量沿嵌入式交换机的硬件路径转发|Arm installs a forwarding rule, and matching traffic takes the hardware path through the embedded switch',
      draw({ p, box, link, chain, label }) {
        const arm = box(p(450, 63, 272, 93), '板上 Arm|Onboard Arm', { note: '下发规则|Install Rule', w: 151 });
        const host = box(p(139, 205, 86, 93), '主机接口|Host Interface', { w: 149 });
        const nic = box(p(450, 205, 180, 235), 'BlueField-3', { note: '嵌入式交换机|Embedded Switch', w: 213, at: 1.15 });
        const fabric = box(p(760, 205, 180, 352), '网络端口|Network Port', { w: 158, at: 2.61 });
        link(arm, nic, { tone: 'control', at: 0.5, offset: arm.x === nic.x ? 0 : 29 });
        link(host, nic, { at: 1.24, offset: host.x === nic.x ? 0 : host.y === nic.y ? 0 : -29 });
        chain([nic, fabric], { at: 1.96 });
        label(p(450, 274, 180, 393), '命中规则的流量|Matching Traffic', 'detail');
      }
    },
    {
      caption: '主机发块请求，BlueField SNAP 将其交给后端并返回读数据|The host issues block I/O, and BlueField SNAP passes it to storage and returns read data',
      draw({ p, mobile, box, link, label }) {
        const host = box(p(142, 161, 180, 61), '主机块驱动|Host Block Driver', { note: 'NVMe / virtio-blk', w: 179, at: 4.23 });
        const dpu = box(p(450, 161, 180, 210), 'BlueField-3', { note: 'DOCA SNAP', w: 217, at: 1.14 });
        const store = box(p(758, 161, 180, 360), '后端存储|Storage Backend', { note: '持久化|Persistence', w: 172, at: 2.07 });
        link(host, dpu, { at: 0.42, offset: -17, tone: 'control' });
        link(dpu, store, { at: 1.35, offset: -17, tone: 'control' });
        link(store, dpu, { at: 2.32, offset: 17 });
        link(dpu, host, { at: 3.2, offset: 17, duration: 1.03 });
        label(p(300, 125, 99, 134), '块请求|Block I/O', 'detail');
        label(p(602, 215, 266, 286), '读数据|Read Data', 'detail');
      }
    },
    {
      caption: '管理员可配置端口，主机只通过获授权的接口收发业务流量|The administrator can configure ports, while the host sends workload traffic through authorized interfaces',
      draw({ p, mobile, box, link }) {
        const admin = box(p(140, 106, 267, 67), 'DPU 管理员|DPU Admin', { note: '配置端口|Port Configuration', w: 165 });
        const host = box(p(140, 237, 87, 67), '主机接口|Host Interface', { note: '端口配置受限|Port Setup Limited', w: 165 });
        const dpu = box(p(450, 170, 180, 210), 'BlueField-3', { note: '受限模式|Restricted Mode', w: 217, at: 1.29 });
        const net = box(p(759, 170, 180, 335), '业务网络|Workload Network', { w: 196, at: 2.84 });
        const axis = mobile ? 'v' : 'h';
        link(admin, dpu, { axis, offset: mobile ? 30 : -19, at: 0.55, tone: 'control' });
        link(host, dpu, { axis, offset: mobile ? -30 : 19, at: 1.43 });
        link(dpu, net, { at: 2.18 });
      }
    },
    {
      caption: 'BlueField-3 可运行 SNAP，Vera Rubin 托盘由 BlueField-4 与 ConnectX-9 分别连接不同网络|BlueField-3 can host SNAP, and the Vera Rubin tray uses BlueField-4 and ConnectX-9 on separate networks',
      draw({ p, mobile, box, outline, link }) {
        const b3 = box(p(171, 126, 92, 64), 'BlueField-3', { w: 153 });
        const snap = box(p(171, 223, 271, 64), 'DOCA SNAP', { w: 150, at: 1.12 });
        link(b3, snap, { at: 0.45 });
        outline(p(520, 166, 180, 240), mobile ? 336 : 395, mobile ? 194 : 263, 'Vera Rubin 计算托盘|Vera Rubin Compute Tray');
        const host = box(p(416, 172, 180, 204), 'Vera / Rubin', { note: '计算|Compute', w: 145 });
        const b4 = box(p(608, 129, 92, 295), 'BlueField-4', { w: mobile ? 148 : 166, at: 1.98 });
        const cx = box(p(608, 227, 269, 295), 'ConnectX-9', { w: mobile ? 148 : 166, at: 1.98 });
        link(host, b4, { axis: mobile ? 'v' : 'h', offset: mobile ? -38 : -10, at: 1.33 });
        link(host, cx, { axis: mobile ? 'v' : 'h', offset: mobile ? 37 : 11, at: 1.33 });
        const storage = box(p(814, 129, 92, 369), '存储 / 管理|Storage / Mgmt', { w: 168, at: 2.7 });
        const compute = box(p(814, 227, 269, 369), '计算网络|Compute Fabric', { w: 168, at: 2.7 });
        link(b4, storage, { at: 2.05, offset: mobile ? -16 : 0 });
        link(cx, compute, { at: 2.05 });
      }
    }
  ];

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = { steps: 5, mount };
})();
