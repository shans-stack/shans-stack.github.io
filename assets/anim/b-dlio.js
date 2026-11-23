(function () {
  const id = 'b-dlio';
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
        chain([['样本文件', 'Sample Files'], ['加载器', 'Data Loader'], ['训练模拟', 'Training Emulation']],
          mobile ? 57 : 115);
        box(width / 2, mobile ? 273 : 224, 318,
          ['模型算子、通信 · 范围外', 'Kernels, Collectives · Excluded'], 'quiet');
      },
      () => {
        chain([['生成数据', 'Generate Data'], ['合成文件集', 'Synthetic Dataset'], ['训练进程', 'Training Processes']]);
        label(width / 2, mobile ? 261 : 228, ['数据准备与定时运行分开', 'Separate Preparation and Timing'], 'note');
      },
      () => {
        const cx = width / 2;
        const [left, right] = mobile ? [90, 270] : [240, 520];
        const [originY, junction, batchY, waitY] = mobile ? [62, 115, 172, 264] : [56, 104, 157, 231];
        [left, right].forEach((x, i) => trace([[cx, originY + 21], [cx, junction], [x, junction], [x, batchY - 21]], i * 0.85, 1.1));
        path([[left, batchY + 21], [left, waitY - 21]], 'guide');
        box(cx, originY, 155, ['读取线程', 'Reader Threads']);
        box(left, batchY, mobile ? 144 : 178, ['当前批次', 'Current Batch'], 'accent');
        box(right, batchY, mobile ? 144 : 178, ['预取队列', 'Prefetch Queue']);
        box(left, waitY, mobile ? 144 : 178, ['模拟计算', 'Compute Delay'], 'quiet');
      },
      () => {
        const [x, y] = [width / 2, mobile ? 64 : 142];
        const w = mobile ? 192 : 199;
        const points = mobile ? [[x, y], [x, 160], [x, 256]] : [[145, y], [380, y], [615, y]];
        for (let i = 0; i < 2; i++) {
          const [sx, sy] = points[i], [tx, ty] = points[i + 1];
          trace(mobile ? [[sx, sy + 21], [tx, ty - 21]] : [[sx + w / 2, sy], [tx - w / 2, ty]], i * 1.45, 1);
          label(mobile ? x + 47 : (sx + tx) / 2, mobile ? (sy + ty) / 2 : y - 36,
            i === 0 ? ['写入', 'Write'] : ['读取', 'Read'], 'note');
        }
        [['训练状态', 'Training State'], ['检查点', 'Checkpoint'], ['恢复进程', 'Recovery']].forEach((name, i) => {
          const [px, py] = points[i];
          box(px, py, w, name, i === 1 ? 'accent' : 'box');
          if (i < 2) {
            const token = draw('rect', { x: px - w / 2 + 9, y: py - 4, width: 10, height: 8, rx: 2 }, 'signal');
            if (i === 1) updates.push(t => token.setAttribute('opacity', t >= 1 ? 1 : 0));
          }
        });
      },
      () => {
        chain([['样本完成事件', 'Completed Samples'], ['每秒样本数', 'Samples/s']], mobile ? 74 : 108, mobile ? 78 : 272);
        const [x1, x2] = mobile ? [88, 272] : [242, 518];
        const y = mobile ? 248 : 226;
        box(x1, y, 145, ['I/O 轨迹', 'I/O Trace'], 'quiet');
        box(x2, y, mobile ? 147 : 165, ['有效配置', 'Effective Config'], 'quiet');
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
