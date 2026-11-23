(function () {
  const id = 'b-gdsio';
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
        chain([['存储文件', 'Storage File'], ['GPU 缓冲区', 'GPU Buffer']], mobile ? 76 : 126, mobile ? 85 : 260);
        box(width / 2, mobile ? 259 : 227, 250, ['模型算子 · 范围外', 'Model Kernels · Excluded'], 'quiet');
      },
      () => {
        const [sx, gx] = mobile ? [62, 296] : [126, 627];
        const hx = (sx + gx) / 2;
        const w = mobile ? 104 : 154;
        const [a, b, offset] = mobile ? [83, 231, 46] : [73, 207, 37];
        const direct = path([[sx + w / 2, a], [gx - w / 2, a]], 'line', true);
        path([[hx, a + 31], [hx, a]], 'guide');
        const first = path([[sx + w / 2, b], [sx + w / 2 + 8, b], [sx + w / 2 + 8, b + offset], [hx - w / 2, b + offset]], 'line', true);
        const second = path([[hx + w / 2, b + offset], [gx - w / 2 - 8, b + offset], [gx - w / 2 - 8, b], [gx - w / 2, b]], 'line', true);
        const starts = [0.08, 0.9, 1.72];
        starts.forEach(t => {
          signal(direct, t, 0.75);
          signal(first, t, 0.36);
          signal(second, t + 0.39, 0.36);
        });
        box(sx, a, w, ['存储', 'Storage']);
        box(gx, a, w, ['GPU 内存', 'GPU RAM'], 'accent');
        box(sx, b, w, ['存储', 'Storage']);
        box(gx, b, w, ['GPU 内存', 'GPU RAM'], 'accent');
        box(hx, b + offset, w, ['主机内存', 'Host RAM']);
        label(hx, a + 43, ['主机提交请求', 'Host Submits I/O'], 'note');
        const directCount = label(hx, a - 42, ['直连 · 完成', 'Direct · Done']);
        const stagedCount = label(hx, b - 42, ['主机中转 · 完成', 'Staged · Done']);
        updates.push(t => {
          const done = starts.filter(start => t >= start + 0.75).length;
          directCount.textContent = text(['直连 · 完成 ', 'Direct · Done ']) + done;
          stagedCount.textContent = text(['主机中转 · 完成 ', 'Staged · Done ']) + done;
        });
      },
      () => {
        const cx = width / 2;
        const [a, b, y0, y1] = mobile ? [87, 273, 84, 210] : [234, 526, 73, 197];
        [a, b].forEach(x => trace([[cx, y0 + 21], [cx, (y0 + y1) / 2], [x, (y0 + y1) / 2], [x, y1 - 21]], 0.15, 1.2));
        box(cx, y0, mobile ? 216 : 248, ['同一负载配置', 'Same Workload'], 'accent');
        box(a, y1, mobile ? 154 : 195, ['运行 A · -x 0', 'Run A · -x 0']);
        box(b, y1, mobile ? 154 : 195, ['运行 B · -x 2', 'Run B · -x 2']);
        label(cx, mobile ? 277 : 258, ['方向、块大小、线程、文件、时长', 'Direction, Size, Threads, Files, Time'], 'note');
      },
      () => {
        const cx = width / 2;
        const [a, b, y0, y1] = mobile ? [90, 270, 83, 210] : [224, 536, 75, 194];
        [a, b].forEach((x, i) => trace([[x, y0 + 21], [x, y0 + 65], [cx, y0 + 65], [cx, y1 - 21]], i * 0.45, 1));
        box(a, y0, mobile ? 145 : 178, ['平台检查', 'Platform Check']);
        box(b, y0, mobile ? 145 : 178, ['运行统计', 'Runtime Stats']);
        box(cx, y1, 198, ['核对实际路径', 'Verify Actual Path'], 'accent');
        label(cx, mobile ? 274 : 252, ['兼容路径 · 主机内存中转', 'Compatibility · Host Staging'], 'note');
      },
      () => {
        const cx = width / 2;
        const [a, b, y0, y1] = mobile ? [61, 299, 67, 212] : [195, 565, 64, 186];
        const names = [['吞吐', 'GiB/s'], ['平均时延', 'Avg. Latency'], ['操作数', 'Operations']];
        [a, cx, b].forEach((x, i) => trace([[cx, y0 + 21], [cx, (y0 + y1) / 2], [x, (y0 + y1) / 2], [x, y1 - 21]], i * 0.25, 1));
        box(cx, y0, 176, ['已完成 I/O', 'Completed I/O'], 'accent');
        [a, cx, b].forEach((x, i) => box(x, y1, mobile ? 116 : 165, names[i]));
        label(cx, mobile ? 270 : 245, ['测试窗口 → 总时间', 'Test Window → Total Time'], 'note');
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
