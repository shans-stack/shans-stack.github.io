(function () {
  const id = 'b-tpch';
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
        const title = ['八张关系表', 'Eight Tables'];
        const source = mobile ? [180, 74] : [184, 159];
        const targets = mobile ? [[180, 176], [180, 280]] : [[602, 91], [602, 229]];
        targets.forEach(([x, y], i) => {
          const turns = mobile
            ? [[285, source[1]], [316, source[1]], [316, y], [285, y]]
            : [[289, source[1]], [400, source[1]], [400, y], [497, y]];
          route(turns, i * 0.58);
          box(x, y, 210, 48, i ? ['两项刷新操作', 'Two Refreshes'] : ['22 项分析查询', '22 Queries']);
        });
        box(...source, 210, 48, title, 'accent');
      },
      () => {
        flow([['比例因子 SF', 'Scale Factor SF'], ['DBGEN 数据', 'DBGEN Data'], ['数据库', 'Database']],
          { y: mobile ? 49 : 110, gap: mobile ? 72 : 239 });
        const x1 = mobile ? 82 : 248, x2 = mobile ? 278 : 552, y = mobile ? 277 : 235;
        route([[x1 + 66, y], [x2 - 76, y]], 0.4, 'guide');
        box(x1, y, 132, 48, ['QGEN', 'QGEN']);
        box(x2, y, 152, 48, ['查询流 SQL', 'Query SQL'], 'accent');
      },
      () => {
        flow([['RF1 · 插入', 'RF1 · Insert'], ['单查询流', 'One Query Stream'], ['RF2 · 删除', 'RF2 · Delete']]);
        label(width / 2, mobile ? 297 : 256, ['查询及刷新均计时', 'Query and Refresh Timings'], 'muted');
      },
      () => {
        const source = mobile ? 89 : 180;
        const rows = [86, 154, 222];
        const end = mobile ? 344 : 668, edge = mobile ? 155 : 256, entry = mobile ? 214 : 548;
        const names = [['查询流 A', 'Query Stream A'], ['查询流 B', 'Query Stream B'], ['刷新流', 'Refresh Stream']];
        rows.forEach((y, i) => {
          route([[edge, y], [entry, y]], 0, i === 2 ? 'guide' : 'line');
          label(source, y, names[i]);
        });
        const x = (entry + end) / 2;
        box(x, 154, end - entry, 185, null, 'accent');
        label(x, 155, ['数据库', 'Database'], 'box-label');
        label(width / 2, mobile ? 302 : 280, ['同一测量区间', 'Same Measurement Interval'], 'muted');
      },
      () => {
        const cx = width / 2, y = mobile ? 220 : 189;
        const positions = mobile ? [89, 271] : [250, 550];
        positions.forEach((x, i) => {
          route([[x, 97], [x, y - 63], [cx, y - 63], [cx, y - 25]], i * 0.36);
          box(x, 72, mobile ? 150 : 172, 50, i ? ['吞吐分项', 'Throughput'] : ['单流分项', 'Power']);
        });
        box(cx, y, 216, 50, ['QphH@Size', 'QphH@Size'], 'accent');
        label(cx, y + 45, ['几何平均 · 同一规模', 'Geometric Mean · Same Scale'], 'muted');
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
