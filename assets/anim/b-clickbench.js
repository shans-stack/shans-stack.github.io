(function () {
  const id = 'b-clickbench';
  const ns = 'http://www.w3.org/2000/svg';

  function mount(host, { onLayout } = {}) {
    const narrow = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(ns, 'svg');
    svg.classList.add(id + '-scene');
    svg.setAttribute('role', 'img');
    host.appendChild(svg);

    let mobile, width, height, updates, labels;
    let current = 0, paused = false, frame = 0, last = 0, elapsed = 0;

    function draw(tag, attributes) {
      const element = document.createElementNS(ns, tag);
      for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
      svg.appendChild(element);
      return element;
    }

    function label(x, y, pair, style = 'label', anchor = 'middle') {
      const value = pair[window.SS_LANG === 'en' ? 1 : 0];
      labels.push(value);
      const element = draw('text', { x, y, class: id + '-' + style, 'text-anchor': anchor });
      element.textContent = value;
      return element;
    }

    function box(x, y, w, h, pair, style = 'box') {
      const rect = draw('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 4, class: id + '-' + style });
      if (pair) label(x, y, pair, 'box-label');
      return rect;
    }

    function route(points, delay = 0, style = 'line', move = true) {
      const path = draw('path', { d: 'M' + points.map(p => p.join(' ')).join('L'), class: id + '-' + style });
      if (!move) return path;
      const length = path.getTotalLength();
      const token = draw('rect', { width: 13, height: 9, rx: 2, class: id + '-token' });
      updates.push(t => {
        const u = Math.min(1, Math.max(0, (t - delay) / 0.95));
        const point = path.getPointAtLength(length * u);
        token.setAttribute('x', point.x - 6.5);
        token.setAttribute('y', point.y - 4.5);
        token.setAttribute('opacity', t < delay ? 0 : Math.min(1, 0.3 + u * 4));
      });
      return path;
    }

    function reveal(element, time) {
      const initial = element.localName === 'text' ? 0.8 : 0.42;
      updates.push(t => element.setAttribute('opacity', t < time ? initial : 1));
    }

    function flow(items, options = {}) {
      const { y = mobile ? 70 : 148, gap = mobile ? 83 : 239, w = mobile ? 242 : 184 } = options;
      const h = 50;
      const points = items.map((_, i) => mobile
        ? [width / 2, y + i * gap]
        : [width / 2 + (i - (items.length - 1) / 2) * gap, y]);
      points.slice(1).forEach(([x, row], i) => {
        const [px, py] = points[i];
        route(mobile ? [[px, py + h / 2], [x, row - h / 2]] : [[px + w / 2, py], [x - w / 2, row]], i * 0.93);
      });
      points.forEach(([x, row], i) => reveal(box(x, row, w, h, items[i]), i === 0 ? 0 : (i - 1) * 0.93 + 0.75));
    }

    const scenes = [
      () => {
        const center = width / 2;
        const y = mobile ? 73 : 82;
        box(center, y, 231, 50, ['一张访问日志宽表', 'One Wide Log Table'], 'accent');
        [['扫描', 'Scan'], ['筛选', 'Filter'], ['聚合', 'Aggregate']].forEach((pair, i) => {
          const x = mobile ? 180 : 163 + i * 237;
          const row = mobile ? 158 + i * 67 : 226;
          const edge = mobile ? 100 : x;
          route(mobile ? [[138, y + 25], [138, y + 40], [edge, y + 40], [edge, row], [113, row]]
            : [[center, y + 25], [center, 146], [edge, 146], [edge, row - 23]], i * 0.55);
          reveal(box(x, row, mobile ? 134 : 168, 46, pair), i * 0.55 + 0.6);
        });
      },
      () => {
        flow([['准备数据', 'Prepare Data'], ['装载数据', 'Load Data'], ['执行查询', 'Run Queries']],
          { y: mobile ? 48 : 126, gap: mobile ? 74 : 230 });
        reveal(label(width / 2, mobile ? 259 : 242, ['装载时间 · 存储大小', 'Load Time · Stored Size'], 'muted'), 0.76);
        reveal(label(width / 2, mobile ? 292 : 269, ['查询执行与结果取回', 'Execution and Result Fetch'], 'muted'), 1.72);
      },
      () => {
        flow([['首轮 · 冷跑', 'First · Cold'], ['第二轮 · 热跑', 'Second · Hot'], ['第三轮 · 热跑', 'Third · Hot']]);
        const x = width / 2, y = mobile ? 301 : 249;
        const cache = box(x, y, 307, 42, null, 'quiet');
        const empty = label(x, y, ['源数据缓存 · 清空', 'Data Cache · Empty'], 'muted');
        const warm = label(x, y, ['源数据缓存 · 已填充', 'Data Cache · Populated'], 'muted');
        updates.push(t => {
          const filled = t >= 0.68;
          cache.setAttribute('class', id + (filled ? '-accent' : '-quiet'));
          empty.style.display = filled ? 'none' : '';
          warm.style.display = filled ? '' : 'none';
        });
      },
      () => {
        flow([['逐查询用时', 'Per-Query Time'], ['除以各自基准', 'Divide by Baseline'], ['几何平均', 'Geometric Mean']]);
        label(width / 2, mobile ? 297 : 256, ['冷跑与热跑分别汇总', 'Cold and Hot Scored Separately'], 'muted');
      },
      () => {
        const items = [['冷跑用时', 'Cold Time'], ['热跑用时', 'Hot Time'], ['装载时间', 'Load Time'], ['存储大小', 'Stored Size']];
        const cx = width / 2, end = mobile ? 235 : 233;
        items.forEach((name, i) => {
          const x = mobile ? (i % 2 ? 266 : 94) : 112 + i * 192;
          const y = mobile ? 58 + Math.floor(i / 2) * 62 : 82;
          const side = mobile ? (i % 2 ? 266 : 94) : x;
          const via = mobile ? (i < 2 ? 92 : 158) : 143;
          const out = mobile ? (i < 2 ? (i % 2 ? 341 : 19) : side) : x;
          route([[x, y + 20], [side, via], [out, via], [out, end - 42], [cx, end - 42], [cx, end - 23]], i * 0.27);
          box(x, y, mobile ? 144 : 167, 40, name);
        });
        box(cx, end, 202, 46, ['加权综合分', 'Weighted Combined'], 'accent');
        label(cx, end + 50, ['机器 · 数据条件', 'Machine · Data Conditions'], 'muted');
      }
    ];

    function ratio() { return width / height; }
    function paint(t) { updates.forEach(update => update(t)); }
    function stop() { cancelAnimationFrame(frame); frame = 0; }
    function tick(now) {
      const delta = Math.max(0, now - last);
      last = now;
      elapsed = Math.min(5100, elapsed + delta);
      paint(elapsed / 1000);
      frame = elapsed < 5100 ? requestAnimationFrame(tick) : 0;
    }
    function start() {
      if (paused || reduced.matches || frame || elapsed >= 5100) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
    function show(index) {
      stop();
      current = Math.max(0, Math.min(scenes.length - 1, index));
      elapsed = 0;
      updates = [];
      labels = [];
      svg.replaceChildren();
      scenes[current]();
      label(width / 2, height - 21, ['示意，不代表实测数字', 'Schematic · No Measured Values'], 'note');
      svg.setAttribute('aria-label', labels.join(' · '));
      paint(reduced.matches ? 5.1 : 0);
      start();
    }
    function redraw() { show(current); }
    function layout() {
      mobile = narrow.matches;
      width = mobile ? 360 : 800;
      height = mobile ? 390 : 345;
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      onLayout?.(ratio(), mobile);
      redraw();
    }

    narrow.addEventListener('change', layout);
    reduced.addEventListener('change', redraw);
    document.addEventListener('ss-lang', redraw);
    layout();

    const controller = {
      show,
      pause() { paused = true; stop(); },
      resume() { paused = false; start(); },
      destroy() {
        stop();
        narrow.removeEventListener('change', layout);
        reduced.removeEventListener('change', redraw);
        document.removeEventListener('ss-lang', redraw);
        svg.remove();
        delete host.__anim;
      },
      ratio,
      step: () => current
    };
    host.__anim = controller;
    return controller;
  }

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = { steps: 5, mount };
}());
