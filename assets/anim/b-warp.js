(function () {
  const id = 'b-warp';
  const ns = 'http://www.w3.org/2000/svg';

  function mount(host, { onLayout } = {}) {
    const narrow = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(ns, 'svg');
    svg.classList.add(id + '-scene');
    svg.setAttribute('role', 'img');
    host.appendChild(svg);

    let mobile, width, height, labels, updates;
    let current = 0, frame = 0, last = 0, elapsed = 0, paused = false;
    const duration = 3.8;
    const text = pair => pair[window.SS_LANG === 'en' ? 1 : 0];

    function draw(tag, attributes, style) {
      const el = document.createElementNS(ns, tag);
      for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, value);
      if (style) el.setAttribute('class', id + '-' + style);
      svg.appendChild(el);
      return el;
    }

    function label(x, y, pair, style = 'label') {
      const el = draw('text', { x, y }, style);
      el.textContent = text(pair);
      labels.push(el.textContent);
      return el;
    }

    function box(x, y, w, pair, style = 'box', h = 42) {
      draw('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 4 }, style);
      return label(x, y, pair, 'box-label');
    }

    function path(points, style = 'line', directed = false) {
      const line = draw('path', { d: 'M' + points.map(point => point.join(' ')).join('L') }, style);
      if (directed) {
        const length = line.getTotalLength();
        const end = line.getPointAtLength(length);
        const back = line.getPointAtLength(Math.max(0, length - 7));
        const angle = Math.atan2(end.y - back.y, end.x - back.x) * 180 / Math.PI;
        draw('path', { d: 'M-7 -3.5L0 0L-7 3.5', transform: `translate(${end.x} ${end.y}) rotate(${angle})` }, style);
      }
      return line;
    }

    function signal(line, delay = 0, seconds = 0.8, style = 'signal') {
      const length = line.getTotalLength();
      const token = draw('rect', { width: 14, height: 8, rx: 2 }, style);
      updates.push(t => {
        const progress = Math.max(0, Math.min(1, (t - delay) / seconds));
        const { x, y } = line.getPointAtLength(length * progress);
        token.setAttribute('x', x - 7);
        token.setAttribute('y', y - 4);
        token.setAttribute('opacity', Math.max(0, Math.min(1, progress * 8, (1 - progress) * 8)));
      });
    }

    function trace(points, delay, seconds, style) {
      signal(path(points, style, true), delay, seconds);
    }

    function chain(nodes, y = mobile ? 65 : 142, gap = mobile ? 66 : 235) {
      const w = mobile ? 220 : 213;
      const points = nodes.map((_, i) => mobile
        ? [width / 2, y + i * gap]
        : [width / 2 + (i - (nodes.length - 1) / 2) * gap, y]);
      points.slice(1).forEach(([x, nextY], i) => {
        const [prevX, prevY] = points[i];
        const link = mobile ? [[prevX, prevY + 21], [x, nextY - 21]]
          : [[prevX + w / 2, prevY], [x - w / 2, nextY]];
        trace(link, i * 0.63, 0.68);
      });
      points.forEach(([x, nodeY], i) => box(x, nodeY, w, nodes[i], i === nodes.length - 1 ? 'accent' : 'box'));
    }

    const scenes = [
      () => {
        chain([['Warp 客户端', 'Warp Client'], ['S3 端点', 'S3 Endpoint'], ['专用测试桶', 'Test Bucket']], mobile ? 50 : 115);
        box(width / 2, mobile ? 270 : 227, 248, ['业务桶 · 测试范围外', 'Production · Out of Scope'], 'quiet');
      },
      () => {
        const cx = width / 2;
        const [source, target] = mobile ? [75, 282] : [205, 567];
        const w = mobile ? 84 : 120;
        const y = mobile ? 165 : 148;
        const operations = ['GET', 'PUT', 'STAT', 'DELETE'];
        const rows = operations.map((_, i) => y + (i - 1.5) * 58);
        rows.forEach((row, i) => {
          const entry = y + (i - 1.5) * 13;
          const turn = mobile ? 137 + i * 12 : 312 + i * 28;
          const link = path([[source + w / 2, row], [turn, row], [turn, entry], [target - (mobile ? 65 : 91), entry]], 'line', true);
          signal(link, i * 0.11, 1.2, i < 2 ? 'signal' : 'metadata-signal');
        });
        rows.forEach((row, i) => box(source, row, w, [operations[i], operations[i]], 'box', 36));
        box(target, y, mobile ? 130 : 182, ['对象池', 'Object Pool'], 'accent', 64);
        label(cx, mobile ? 285 : 266, ['权重决定操作比例', 'Weights Set the Operation Mix'], 'note');
      },
      () => {
        const cx = width / 2;
        if (mobile) {
          trace([[cx, 73], [cx, 127]], 0.1, 0.8);
          [95, 265].forEach((x, i) => trace([[cx, 169], [cx, 201], [x, 201], [x, 223]], 1 + i, 0.8));
          box(cx, 52, 198, ['LIST · 前缀 A', 'LIST · Prefix A']);
          box(cx, 148, 198, ['匹配的对象键', 'Matching Keys'], 'accent');
          box(95, 244, 130, ['第 1 页', 'Page 1']);
          box(265, 244, 130, ['第 2 页', 'Page 2']);
          label(cx, 288, ['对象数与请求数分别统计', 'Separate Object and Request Counts'], 'note');
          return;
        }
        trace([[230, 130], [291, 130]], 0.1, 0.8);
        trace([[469, 129], [506, 129], [506, 94], [550, 94]], 1, 0.8);
        trace([[469, 150], [506, 150], [506, 190], [550, 190]], 2, 0.8);
        box(132, 130, 196, ['LIST · 前缀 A', 'LIST · Prefix A']);
        box(cx, 140, 178, ['匹配的对象键', 'Matching Keys'], 'accent', 62);
        box(628, 94, 156, ['第 1 页', 'Page 1']);
        box(628, 190, 156, ['第 2 页', 'Page 2']);
        label(cx, 247, ['对象数与请求数分别统计', 'Object and Request Counts Are Separate'], 'note');
      },
      () => {
        const cx = width / 2;
        const [gap, y0, y1, y2] = mobile ? [115, 57, 163, 256] : [219, 50, 146, 232];
        [['并发', 'Concurrency'], ['对象大小', 'Object Size'], ['时长', 'Duration']].forEach((name, i) => {
          const x = cx + (i - 1) * gap;
          trace([[x, y0 + 21], [x, y0 + 53], [cx, y0 + 53], [cx, y1 - 21]], i * 0.25, 0.8);
          box(x, y0, mobile ? (i === 0 ? 115 : 108) : 158, name);
        });
        trace([[cx, y1 + 21], [cx, y2 - 21]], 1.2, 1);
        box(cx, y1, 190, ['Warp 负载', 'Warp Load'], 'accent');
        box(cx, y2, 190, ['S3 端点配置', 'S3 Endpoint Set']);
      },
      () => {
        const cx = width / 2;
        const x = mobile ? [56, 148, 249, 321] : [168, 305, 450, 596];
        const ys = mobile ? [92, 146, 216] : [77, 129, 192];
        [['操作', 'Operation'], ['速率', 'Rate'], ['时延', 'Latency'], ['错误', 'Errors']].forEach((name, i) => label(x[i], ys[0], name, 'note'));
        [['GET', 'MiB/s'], ['STAT', 'obj/s']].forEach(([op, unit], i) => {
          const y = ys[i + 1];
          path([[mobile ? 20 : 107, y + 27], [mobile ? 340 : 653, y + 27]], 'guide');
          [op, unit, '—', '—'].forEach((value, j) => {
            const el = label(x[j], y, [value, value]);
            updates.push(t => el.setAttribute('opacity', t >= 0.4 + i * 0.65 ? 1 : 0));
          });
        });
        label(cx, mobile ? 278 : 249, ['按操作拆分的记录', 'Records by Operation'], 'note');
      }
    ];

    function ratio() { return width / height; }
    function paint(time) { updates.forEach(update => update(time)); }
    function stop() { cancelAnimationFrame(frame); frame = 0; }
    function tick(now) {
      elapsed = Math.min(duration, elapsed + Math.max(0, now - last) / 1000);
      last = now;
      paint(elapsed);
      frame = elapsed < duration ? requestAnimationFrame(tick) : 0;
    }
    function start() {
      if (paused || frame || reduced.matches || elapsed >= duration) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
    function show(index) {
      stop();
      current = Math.max(0, Math.min(scenes.length - 1, index));
      elapsed = 0;
      labels = [];
      updates = [];
      svg.replaceChildren();
      scenes[current]();
      label(width / 2, height - 19, ['示意，不代表实测数字', 'Schematic · No Measured Values'], 'note');
      svg.setAttribute('aria-label', labels.join(' · '));
      paint(reduced.matches ? duration : 0);
      start();
    }
    function redraw() { show(current); }
    function layout() {
      mobile = narrow.matches;
      width = mobile ? 360 : 760;
      height = mobile ? 350 : 310;
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
