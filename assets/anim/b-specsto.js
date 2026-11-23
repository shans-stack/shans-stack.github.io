(function () {
  const id = 'b-specsto';
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
        flow([['负载生成器', 'Load Generators'], ['被测存储', 'Storage Under Test']],
          { y: mobile ? 75 : 129, w: mobile ? 242 : 222, gap: mobile ? 90 : 316 });
        box(width / 2, mobile ? 276 : 236, 314, 44,
          ['模型计算 · 测试范围外', 'Model Compute · Out of Scope'], 'quiet');
      },
      () => {
        const names = [['小文件摄取', 'Image Reads'], ['记录生成', 'Record Creation'],
          ['训练读取', 'Training Reads'], ['检查点 I/O', 'Checkpoint I/O']];
        const cx = width / 2, end = mobile ? 275 : 246;
        const points = names.map((_, i) => mobile
          ? [i % 2 ? 270 : 90, 75 + Math.floor(i / 2) * 81]
          : [112 + i * 192, 104]);
        points.forEach(([x, y], i) => {
          const outside = x < cx ? 9 : 351;
          const start = mobile && i < 2
            ? [[x, y + 22], [x, 110], [outside, 110], [outside, 214]]
            : [[x, y + 22], [x, mobile ? 214 : 177]];
          route([...start, [cx, mobile ? 214 : 177], [cx, end - 24]], i * 0.25, i === 3 ? 'guide' : 'line');
          reveal(box(x, y, mobile ? 158 : 167, 44, names[i], i === 3 ? 'quiet' : 'box'), i * 0.25);
        });
        box(cx, end, 150, 48, ['一个 JOB', 'One JOB'], 'accent');
      },
      () => {
        const loads = [['较低', 'Lower'], ['升高', 'Rising'], ['很高', 'Very High']];
        const source = mobile ? 73 : 178, target = mobile ? 278 : 605;
        label(source, 50, ['JOBS 负载', 'JOBS Load']);
        label(target, 50, ['测量点', 'Measurement']);
        loads.forEach((name, i) => {
          const y = 102 + i * 79;
          label(source, y, name, 'muted');
          for (let j = 0; j <= i; j++) route([[source + 58, y + (j - i / 2) * 12],
            [target - 34, y + (j - i / 2) * 12]], i * 0.83 + j * 0.13);
          reveal(box(target, y, 54, 35, [String.fromCharCode(65 + i), String.fromCharCode(65 + i)], 'accent'), i * 0.83 + 0.84);
        });
      },
      () => {
        const left = mobile ? 37 : 147, right = mobile ? 310 : 629;
        const bottom = mobile ? 235 : 247;
        const a = [left + 53, bottom - 52], b = [(left + right) / 2, bottom - 80], c = [right - 24, bottom - 151];
        label(left, 44, ['响应时间', 'Response Time'], 'muted', 'start');
        route([[left, 72], [left, bottom], [right + 12, bottom]], 0, 'line', false);
        const area = draw('path', { d: `M${a[0]} ${bottom}L${a.join(' ')}L${b.join(' ')}L${c.join(' ')}V${bottom}Z`,
          fill: 'var(--lc)', 'fill-opacity': 0.18 });
        reveal(area, 1.18);
        route([a, b, c]);
        [a, b, c].forEach(([cx, cy], i) => reveal(draw('circle', { cx, cy, r: 5, fill: 'var(--lc)' }), i * 0.33));
        label(b[0] + 48, bottom - 67, ['曲线面积', 'Curve Area'], 'muted');
        label(mobile ? 22 : left, bottom + (mobile ? 64 : 42), ['ORT = 面积 ÷ 峰值吞吐', 'ORT = Area ÷ Peak Throughput'], 'muted', 'start');
        label(c[0], 53, ['峰值 JOBS', 'Peak JOBS'], 'label', 'end');
        label(right + 12, bottom + 27, ['负载', 'Load'], 'muted', 'end');
      },
      () => {
        const x = mobile ? width / 2 : 240;
        label(x, mobile ? 38 : 59, ['同一工作负载', 'Same Workload']);
        reveal(box(x, mobile ? 95 : 119, 233, 46, ['AI_IMAGE · 记录 A', 'AI_IMAGE · Run A']), 0.2);
        reveal(box(x, mobile ? 154 : 181, 233, 46, ['AI_IMAGE · 记录 B', 'AI_IMAGE · Run B']), 0.85);
        box(mobile ? x : 575, mobile ? 241 : 148, 242, 46,
          ['其他工作负载', 'Different Workload'], 'quiet');
        label(width / 2, mobile ? 312 : 270, ['配置随结果披露', 'Configuration Disclosed'], 'muted');
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
