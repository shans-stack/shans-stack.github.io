(function () {
  const id = 'b-metrics';
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

    const scenes = [
      () => {
        const [left, right] = mobile ? [76, 284] : [152, 628];
        const y = mobile ? 132 : 108;
        const width = mobile ? 123 : 168;
        const edge = width / 2;
        const request = path([[left + edge, y - 12], [right - edge, y - 12]]);
        const complete = path([[left + edge, y + 12], [right - edge, y + 12]]);
        box(left, y, width, ['客户端', 'Client'], 'box', 58);
        box(right, y, width, ['存储目标', 'Storage Target'], 'box', 58);
        label(cx, y - 40, ['请求 →', 'Request →']);
        label(cx, y + 41, ['← 完成', '← Completion']);
        travel(request, 0.2, 1);
        travel(complete, 1.25, 1, 12, 'token', true);
        const log = ['完成记录 · 字节、次数、时间', 'Completion Log · Bytes, Count, Time'];
        reveal(box(cx, y + 107, mobile ? 316 : 420, log, 'accent'), 2.05);
      },
      () => {
        const a = mobile ? 29 : 120, b = w - a;
        const y = mobile ? 132 : 117;
        const route = path([[a, y], [b, y]], 'guide');
        const starts = [0.2, 0.8, 1.4, 2];
        label(cx, y - 54, ['统计窗口', 'Measurement Window']);
        for (const edge of [a, b]) path([[edge, y - 18], [edge, y + 18]]);
        starts.forEach(t => travel(route, t, 1.1, 23));
        label(cx, y + 50, ['已传输的示意块', 'Illustrative Blocks Transferred'], 'middle', 'note');
        starts.forEach((t, i) => reveal(block(cx - 51 + i * 34, y + 87, 24, 13, 'token'), t + 1.1));
      },
      () => {
        const start = mobile ? 28 : 120, end = w - start;
        const times = [0.15, 0.75, 1.35];
        [
          [mobile ? 94 : 77, ['大块 I/O', 'Large I/O'], 32],
          [mobile ? 218 : 194, ['小块 I/O', 'Small I/O'], 13]
        ].forEach(([y, heading, size]) => {
          label(start, y - 36, heading, 'start');
          const count = label(end, y - 36, ['完成 0', 'Completed 0'], 'end');
          const route = path([[start, y], [end, y]]);
          times.forEach((t, i) => {
            travel(route, t, 1.35, size);
            reveal(block(end - 15 - (2 - i) * 38, y + 30, size, 10, 'token'), t + 1.35);
          });
          updates.push(t => { count.textContent = tr(['完成 ', 'Completed ']) + times.filter(s => t >= s + 1.35).length; });
        });
      },
      () => {
        const start = mobile ? 35 : 145, end = w - start;
        const span = end - start;
        [[0.03, 0.63, 86, ['请求 A', 'Request A']], [0.24, 0.92, 163, ['请求 B', 'Request B']]].forEach(([a, b, y, name], i) => {
          const left = start + span * a, right = start + span * b;
          label(left, y - 26, name, 'start');
          const route = path([[left, y], [right, y]], 'guide');
          const bar = path([[left, y], [right, y]], 'active');
          const length = route.getTotalLength();
          bar.setAttribute('stroke-dasharray', length);
          updates.push(t => bar.setAttribute('stroke-dashoffset', length * (1 - clamp((t - i * 0.55) / 2.1))));
          block(left, y, 9, 9, 'alt');
          reveal(block(right, y, 9, 9, 'token'), i * 0.55 + 2);
        });
        path([[start, 224], [end, 224]]);
        label(start, 249, ['提交', 'Submission'], 'start');
        label(end, 249, ['时间 →', 'Time →'], 'end');
      },
      () => {
        const a = mobile ? 29 : 115, b = w - a, y = 150;
        const pos = r => a + (b - a) * r;
        const penultimate = 0.82, maximum = 0.97;
        path([[a, y], [b, y]]);
        for (let i = 0; i < 100; i++) {
          const fraction = i < 98 ? 0.02 + 0.59 * Math.floor(i / 7) / 13 : i === 98 ? penultimate : maximum;
          reveal(draw('circle', { cx: pos(fraction), cy: y + (i < 98 ? (i % 7 - 3) * 6 : 0), r: i >= 98 ? 4.5 : 2.3 },
            i >= 98 ? 'token' : 'alt'), Math.floor(i / 10) * 0.15);
        }
        reveal(path([[pos(penultimate), y - 8], [pos(penultimate), 102]], 'active'), 1.55);
        reveal(label(pos(penultimate), 82, 'p99'), 1.55);
        reveal(path([[pos(maximum), y + 8], [pos(maximum), 187]], 'guide'), 1.75);
        reveal(label(b, 208, ['最大值', 'Maximum'], 'end'), 1.75);
        label(a, 208, ['较短时延', 'Lower Latency'], 'start');
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
