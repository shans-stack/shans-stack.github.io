(function () {
  const id = 'n-cuda';
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
      caption: '主机经 CUDA 运行时启动核函数，由 GPU 线程执行|The host launches a kernel through CUDA, and GPU threads execute it',
      draw({ p, box, label, reveal, chain }) {
        const host = box(p(130, 145, 180, 54), '主机程序|Host Program', { note: 'CPU' });
        const cuda = box(p(430, 145, 180, 154), 'CUDA', { w: 184, note: '运行时提交|Runtime Launch', at: 1.1 });
        const gpu = box(p(748, 145, 180, 254), 'GPU 核函数|GPU Kernel', { note: '设备执行|Device Work', at: 1.8 });
        chain([host, cuda, gpu], { tone: 'control' });
        label(p(748, 216, 180, 324), '执行线程|Executing Threads', 'detail');
        ['0', '1', '2', '3'].forEach((n, i) => {
          reveal(p(679 + i * 46, 256, 111 + i * 46, 363), n, 1.9 + i * 0.18);
        });
      }
    },
    {
      caption: '网格划分为线程块，块和线程的索引对应向量元素|The grid divides into thread blocks whose indices identify vector elements',
      draw({ p, box, mobile, link }) {
        const grid = box(p(450, 50, 180, 56), 'CUDA 网格|CUDA Grid', { w: 218 });
        for (let i = 0; i < 2; i++) {
          const x = 260 + 380 * i;
          const mx = 90 + 180 * i;
          const block = box(p(x, 140, mx, 157), '线程块|Thread Block', { note: i ? '块索引 1|Block Index 1' : '块索引 0|Block Index 0', at: 1.1 });
          link(grid, block, { at: 0.45, offset: i ? 24 : -24, tone: 'control' });
          for (let j = 0; j < 2; j++) {
            const dx = (j ? 1 : -1) * (mobile ? 36 : 46);
            const thread = box(p(x + dx, 219, mx + dx, 252), 'T' + j, { w: 62, h: 39, at: 1.85 });
            const element = box(p(x + dx, 277, mx + dx, 348), 'x[' + (2 * i + j) + ']', { w: 65, h: 39, at: 2.62 });
            link(block, thread, { fromOffset: dx, at: 1.2, tone: 'control' });
            link(thread, element, { at: 1.97 });
          }
        }
      }
    },
    {
      caption: '三个线程块分配到两个 SM，线程块内的 warp 在所属 SM 上运行|Three blocks go to two SMs, with each block’s warps running on its assigned SM',
      draw({ p, mobile, box, outline, link, label }) {
        const x = mobile ? [59, 180, 301] : [248, 450, 652];
        const blocks = x.map((at, i) => box([at, mobile ? 74 : 82], ['块 A|Block A', '块 B|Block B', '块 C|Block C'][i], { w: mobile ? 94 : 132 }));
        outline(p(450, 214, 180, 252), mobile ? 338 : 610, mobile ? 232 : 168);
        const a = box(p(335, 223, 94, 267), 'SM A', { note: 'A、B 的 warp|Warps from A, B', w: 146, at: 1.35 });
        const b = box(p(565, 223, 267, 267), 'SM B', { note: 'C 的 warp|Warps from C', w: 146, at: 1.67 });
        link(blocks[0], a, { at: 0.55, offset: -28, bend: mobile ? 114 : 119 });
        link(blocks[1], a, { at: 0.86, offset: 28, bend: mobile ? 123 : 126 });
        link(blocks[2], b, { at: 1.05 });
        label(p(450, 284, 180, 344), 'GPU · 流式多处理器|GPU · Streaming Multiprocessors', 'detail');
      }
    },
    {
      caption: '全局内存保留原数据，共享内存副本可供块内多个线程读取|Global memory keeps the source, and multiple threads read the shared-memory copy',
      draw({ p, box, link, reveal }) {
        const global = box(p(155, 165, 180, 58), '全局内存|Global Memory', { note: '数据块 A|Tile A', w: 169 });
        const shared = box(p(438, 165, 180, 169), '共享内存|Shared Memory', { note: '块内可见|Visible Within Block', w: 195, at: 1.42 });
        link(global, shared, { at: 0.55, duration: 0.87, letter: 'A' });
        reveal(p(438, 218, 180, 225), 'A 的副本|Copy of A', 1.42, 'detail');
        const t0 = box(p(734, 108, 89, 325), '线程 T0|Thread T0', { at: 2.82 });
        const t1 = box(p(734, 232, 271, 325), '线程 T1|Thread T1', { at: 2.82 });
        link(shared, t0, { axis: t0.y === t1.y ? 'v' : 'h', fromOffset: t0.y === t1.y ? -62 : -16, at: 2.17 });
        link(shared, t1, { axis: t0.y === t1.y ? 'v' : 'h', fromOffset: t0.y === t1.y ? 62 : 16, at: 2.17 });
      }
    },
    {
      caption: '同一流内操作按序执行，另一条独立流可以重叠|Work in one stream runs in order while an independent stream can overlap',
      draw({ p, mobile, box, label, link }) {
        label(p(86, 112, 92, 44), '流 A|Stream A');
        label(p(86, 236, 269, 44), '流 B|Stream B');
        const input = box(p(265, 112, 92, 100), '输入复制|Copy In', { at: 0.3 });
        const kernel = box(p(500, 112, 92, 194), '核函数 A|Kernel A', { at: 1.7 });
        const output = box(p(735, 112, 92, 287), '输出复制|Copy Out', { at: 3.03 });
        link(input, kernel, { at: 1.04 });
        link(kernel, output, { at: 2.37 });
        box(p(500, 236, 269, 194), '核函数 B|Kernel B', { at: 1.7 });
        label(p(500, 278, 269, 250), mobile ? '可重叠|Can Overlap' : '资源允许时可重叠|Can Overlap When Resources Permit', 'detail');
      }
    }
  ];

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = { steps: 5, mount };
})();
