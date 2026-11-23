(function () {
  const id = 'b-compare';
  const ns = 'http://www.w3.org/2000/svg';

  function mount(host, { onLayout } = {}) {
    const narrow = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(ns, 'svg');
    svg.classList.add(id + '-scene');
    svg.setAttribute('role', 'img');
    host.appendChild(svg);
    let mobile, w, h, cx, labels, updates;
    let current = 0, frame = 0, last = 0, elapsed = 0, paused = false;
    const duration = 4.2;
    const tr = value => Array.isArray(value) ? value[window.SS_LANG === 'en' ? 1 : 0] : value;
    const clamp = value => Math.max(0, Math.min(1, value));

    function draw(tag, attrs, style) {
      const element = document.createElementNS(ns, tag);
      for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
      if (style) element.setAttribute('class', id + '-' + style);
      svg.appendChild(element);
      return element;
    }

    function label(x, y, value, anchor = 'middle', style) {
      const element = draw('text', { x, y, 'text-anchor': anchor }, style);
      element.textContent = tr(value);
      labels.push(element.textContent);
      return element;
    }

    function block(x, y, width, height, style = 'box') {
      return draw('rect', { x: x - width / 2, y: y - height / 2, width, height, rx: 4 }, style);
    }

    function box(x, y, width, value, style = 'box', height = 40) {
      block(x, y, width, height, style);
      return label(x, y, value);
    }

    function path(points, style = 'line') {
      return draw('path', { d: 'M' + points.map(point => point.join(' ')).join(' L') }, style);
    }

    function reveal(element, delay = 0) {
      updates.push(t => element.setAttribute('opacity', clamp((t - delay) * 5)));
      return element;
    }

    function travel(route, start, seconds, size = 12, style = 'token', reverse = false) {
      const length = route.getTotalLength();
      const token = block(0, 0, size, 10, style);
      updates.push(t => {
        const p = clamp((t - start) / seconds);
        const point = route.getPointAtLength(length * (reverse ? 1 - p : p));
        token.setAttribute('transform', 'translate(' + point.x + ' ' + point.y + ')');
        token.setAttribute('opacity', Math.min(1, p * 12, (1 - p) * 12));
      });
    }

    function ratio() { return w / h; }
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
      label(cx, h - 17, ['示意，不代表实测数字', 'Schematic · No Measured Values'], 'middle', 'note');
      svg.setAttribute('aria-label', labels.join(' · '));
      paint(reduced.matches ? duration : 0);
      start();
    }

    function redraw() { show(current); }

    function layout() {
      mobile = narrow.matches;
      w = mobile ? 360 : 780;
      h = mobile ? 340 : 300;
      cx = w / 2;
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      onLayout?.(ratio(), mobile);
      redraw();
    }

    function timedLane(y, title, names, span, delays) {
      const gap = mobile ? 106 : 190;
      const width = mobile ? 94 : 152;
      const xs = [cx - gap, cx, cx + gap];
      label(xs[0] - width / 2, y - 40, title, 'start');
      xs.slice(1).forEach((x, i) => {
        const link = path([[xs[i] + width / 2, y], [x - width / 2, y]]);
        travel(link, delays[i], 0.5);
      });
      xs.forEach((x, i) => box(x, y, width, names[i], i < span ? 'accent' : 'quiet'));
      const a = xs[0] - width / 2, b = xs[span - 1] + width / 2;
      reveal(path([[a, y + 28], [a, y + 36], [b, y + 36], [b, y + 28]], 'active'), 1.5);
      reveal(label((a + b) / 2, y + 55, ['计时范围', 'Timed Scope']), 1.5);
    }

    const scenes = [
      () => {
        timedLane(mobile ? 79 : 67, ['存储微基准', 'Storage Microbenchmark'], [['发起 I/O', 'Issue I/O'], ['完成 I/O', 'Finish I/O'], ['应用处理', 'App Work']], 2, [0.3, 6]);
        timedLane(mobile ? 210 : 192, ['端到端基准', 'End-to-End Benchmark'], [['发起 I/O', 'Issue I/O'], ['完成 I/O', 'Finish I/O'], ['应用完成', 'App Done']], 3, [0.3, 0.95]);
      },
      () => {
        const xs = mobile ? [123, 212, 304] : [295, 456, 624];
        const x = mobile ? 16 : 100;
        const width = mobile ? 82 : 144;
        ['A', 'B'].forEach((name, i) => label(x, 110 + i * 63, name, 'start'));
        const cols = [
          [['版本', 'Version'], ['v1', 'v1']],
          [['单位', 'Units'], ['MiB/s', 'MB/s']],
          [['口径', 'Scope'], [['单客户端', 'One Client'], ['全系统', 'System']]]
        ];
        cols.forEach(([header, values], i) => {
          const [a, b] = values;
          label(xs[i], 53, header);
          reveal(box(xs[i], 110, width, a), i * 0.43);
          reveal(box(xs[i], 173, width, b, i === 2 ? 'accent' : 'box'), i * 0.43 + 0.25);
        });
        reveal(label(cx, 241, ['单位可换算，口径需匹配', 'Units Convert · Scope Must Match'], 'middle', 'note'), 1.45);
      },
      () => {
        const left = mobile ? 19 : 150, right = w - left;
        [
          [['I/O 大小与模式', 'I/O Size and Pattern'], ['一致', 'Match']],
          [['数据范围与缓存', 'Data Range and Cache'], ['一致', 'Match']],
          [['统计窗口', 'Measurement Window'], ['一致', 'Match']],
          [['客户端数', 'Client Count'], ['测试变量', 'Test Variable']]
        ].forEach(([name, status], i) => {
          const y = 64 + i * 55;
          label(left, y, name, 'start');
          reveal(label(right, y, status, 'end', i < 3 ? 'note' : undefined), 0.3 + i * 0.47);
          path([[left, y + 20], [right, y + 20]], i === 3 ? 'active' : 'line');
        });
      },
      () => {
        const a = mobile ? 24 : 139, b = w - a;
        const offsets = [0, 0.19, 0.54, 0.85];
        label(a, 42, 'Server', 'start');
        label(b, 42, ['应用时延约束', 'Latency Constraints'], 'end');
        const server = path([[a, 93], [b, 93]]);
        offsets.forEach((offset, i) => {
          const x = a + (b - a) * offset;
          travel(server, 0.1 + offset * 2, 1.3, 10);
          reveal(block(x, 93, 11, 12, 'token'), i * 0.55 + 0.4);
        });
        label(a, 174, 'Offline', 'start');
        label(b, 174, ['集中提交', 'Batch Arrival'], 'end');
        const offline = path([[a, 224], [b, 224]]);
        for (let i = 0; i < 4; i++) reveal(block(a + i * 17, 224, 12, 14, 'token'), 0.2);
        travel(offline, 0.35, 1.5, 41);
      },
      () => {
        const a = mobile ? 35 : 135, b = w - a;
        const x = fraction => a + fraction * (b - a);
        [
          [95, ['重复运行 A', 'Repeated Runs A'], [0.14, 0.33, 0.55, 0.69]],
          [187, ['重复运行 B', 'Repeated Runs B'], [0.39, 0.51, 0.66, 0.88]]
        ].forEach(([y, name, observations], row) => {
          label(a, y - 32, name, 'start');
          path([[a, y], [b, y]], 'guide');
          reveal(path([[x(observations[0]), y], [x(observations[3]), y]], 'active'), 1.5 + row * 0.13);
          observations.forEach((value, i) =>
            reveal(draw('circle', { cx: x(value), cy: y, r: 5 }, 'alt'), 0.25 + row * 0.12 + i * 0.3));
        });
        label(b, 240, ['同一指标 →', 'Same Metric →'], 'end', 'note');
      }
    ];

    narrow.addEventListener('change', layout);
    reduced.addEventListener('change', redraw);
    document.addEventListener('ss-lang', redraw);
    layout();

    return host.__anim = {
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
  }

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = { steps: 5, mount };
}());
