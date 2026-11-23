(function () {
  const id = 'n-cx';
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
    let step = 0, option = false, width, height, elapsed, last, frame = 0, layers;
    let button = null;
    if (scenes.some(scene => scene.toggle)) {
      button = document.createElement('button');
      button.className = cls('toggle');
      button.type = 'button';
      button.addEventListener('click', () => { option = !option; rebuild(); });
      host.append(button);
    }
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
      scenes[step].draw({ p, mobile, box, outline, label, reveal, link, travel, chain, option });
      labelAt(svg, width / 2, height - 15, '示意，不代表实测数字|Schematic, not measured', 'detail');
      if (button) {
        button.hidden = !scenes[step].toggle;
        if (!button.hidden) {
          button.textContent = tr(scenes[step].toggle[Number(option)]);
        }
      }
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
        button?.remove();
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
      caption: 'ConnectX-8 板卡在 PCIe 主机接口与外部网络端口之间处理流量|The ConnectX-8 card handles traffic between its PCIe interface and the external port',
      draw({ p, mobile, box, outline, chain, label }) {
        outline(p(451, 167, 180, 221), mobile ? 330 : 485, mobile ? 230 : 187);
        label(p(451, 107, 31, 129), 'SuperNIC 板卡|SuperNIC Card', 'detail', mobile ? 'start' : 'middle');
        const host = box(p(97, 167, 180, 54), '服务器|Server', { w: 146 });
        const pcie = box(p(278, 167, 180, 157), 'PCIe', { w: 96, h: 37 });
        const chip = box(p(450, 167, 180, 220), 'ConnectX-8', { note: '适配器芯片|Adapter Chip', w: 197, at: 1.7 });
        const port = box(p(627, 167, 180, 288), '网络端口|Network Port', { w: 137, h: 38 });
        const sw = box(p(792, 167, 180, 374), '交换机|Switch', { w: 147, at: 3.28 });
        chain([host, pcie, chip, port, sw]);
      }
    },
    {
      caption: '主机负责注册和提交，载荷在 GPU 显存与 ConnectX 间直接传输|The host registers and submits work while the payload travels directly between GPU memory and ConnectX',
      draw({ p, mobile, box, link, travel, label }) {
        const gpu = box(p(147, 211, 93, 64), 'GPU 显存|GPU Memory', { note: '数据载荷|Payload', w: 154 });
        const cpu = box(p(147, 77, 265, 64), '主机 CPU|Host CPU', { note: '注册与提交|Register and Submit', w: mobile ? 184 : 194 });
        const ram = box(p(765, 77, 180, 137), '主机内存|Host Memory', { note: '载荷旁路|Bypassed by Payload', tone: 'idle', w: 204 });
        const nic = box(p(450, 211, 180, 250), 'ConnectX', { note: 'GPUDirect RDMA', w: 209, at: 1.85 });
        const fabric = box(p(765, 211, 180, 362), '网络|Fabric', { w: 146, at: 2.66 });
        const axis = mobile ? 'v' : 'h';
        link(cpu, nic, { axis, offset: mobile ? 52 : -22, bend: mobile ? 198 : 301, at: 0.43, tone: 'control' });
        const data = link(gpu, nic, { axis, offset: mobile ? -51 : 0, bend: mobile ? 201 : undefined });
        const out = link(nic, fabric, {});
        travel(data, 1.2, 0.65);
        travel(out, 1.88, 0.78);
        label(p(298, 248, 69, 175), 'PCIe', 'detail');
      }
    },
    {
      caption: 'CPU 提交传输描述，ConnectX 读取载荷并控制发包节奏|The CPU submits a descriptor, and ConnectX reads the payload and paces transmission',
      draw({ p, mobile, box, link, travel }) {
        const cpu = box(p(145, 82, 91, 62), '主机 CPU|Host CPU', { note: '传输描述|Descriptor', w: 150 });
        const gpu = box(p(145, 225, 268, 62), 'GPU', { note: '计算与载荷|Compute / Data', w: 167 });
        const nic = box(p(441, 168, 180, 191), 'ConnectX-8', { note: '硬件包处理|Hardware Packet Processing', w: 278, at: 1.52 });
        const output = box(p(765, 168, 180, 330), '网络端口|Network Port', { note: '按间隔发送|Paced Transmission', w: 177 });
        const axis = mobile ? 'v' : 'h';
        link(cpu, nic, { axis, offset: -24, at: 0.36, tone: 'control' });
        link(gpu, nic, { axis, offset: 24, at: 0.87 });
        const out = link(nic, output);
        for (const start of [1.7, 2.35, 3.0]) travel(out, start, 0.62);
      }
    },
    {
      caption: 'ConnectX 端口配置决定链路使用 RoCE 还是 InfiniBand RDMA|ConnectX port configuration determines whether the link uses RoCE or InfiniBand RDMA',
      toggle: ['切换到 InfiniBand|Switch to InfiniBand', '切换到以太网|Switch to Ethernet'],
      draw({ p, box, chain, option }) {
        const gpu = box(p(147, 156, 180, 78), 'GPU 显存|GPU Memory', { w: 170 });
        const nic = box(p(450, 156, 180, 179), 'ConnectX', { note: option ? '原生 RDMA|Native RDMA' : 'RoCE', w: 199 });
        const sw = box(p(753, 156, 180, 281), option ? 'InfiniBand 交换机|InfiniBand Switch' : '以太网交换机|Ethernet Switch', { w: 194, at: 1.82 });
        chain([gpu, nic, sw]);
      }
    },
    {
      caption: '两个已公开系统展示 ConnectX-8 和 ConnectX-9 的网络端点角色|Two documented platforms illustrate the network endpoint roles of ConnectX-8 and ConnectX-9',
      draw({ p, box, chain, label }) {
        const gb = box(p(154, 113, 92, 66), 'DGX', { note: 'GB300', w: 170 });
        const cx8 = box(p(449, 113, 92, 176), 'ConnectX-8', { w: 170, at: 1.1 });
        const n8 = box(p(745, 113, 92, 323), '扩展网络|Scale-Out Fabric', { w: 174, at: 1.82 });
        const vr = box(p(154, 235, 271, 66), 'Vera Rubin', { note: 'NVL72', w: 170 });
        const cx9 = box(p(449, 235, 271, 176), 'ConnectX-9', { w: 170, at: 1.1 });
        const n9 = box(p(745, 235, 271, 323), 'InfiniBand', { w: 174, at: 1.82 });
        label(p(450, 48, 180, 21), '部署示例|Deployment Examples', 'detail');
        chain([gb, cx8, n8]);
        chain([vr, cx9, n9]);
      }
    }
  ];

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = { steps: 5, mount };
})();
