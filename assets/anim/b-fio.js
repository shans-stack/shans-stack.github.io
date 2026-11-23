(function () {
  const id = 'b-fio';
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

    function fork(from, destinations, note) {
      const sourceY = mobile ? 76 : 65;
      const targetY = mobile ? 203 : 192;
      const span = mobile ? 87 : 185;
      const width = mobile ? 156 : 200;
      const mid = (sourceY + targetY) / 2;
      destinations.forEach((target, i) => {
        const x = cx + (i * 2 - 1) * span;
        const route = path([[cx, sourceY + 20], [cx, mid], [x, mid], [x, targetY - 20]]);
        travel(route, 0.24 + i * 0.21, 1.5);
        box(x, targetY, width, target, 'accent');
      });
      box(cx, sourceY, width, from);
      label(cx, targetY + 57, note, 'middle', 'note');
    }

    const scenes = [
      () => fork(['fio 作业', 'fio Job'], [['文件系统路径', 'File System Path'], ['裸块设备', 'Raw Block Device']],
        ['测量边界随目标而定', 'Target Defines the Measured Path']),
      () => fork('[global] · bs, size', ['[a] · rw=read', '[b] · rw=randread'],
        ['段内设置可覆盖默认值', 'Job Settings Can Override Defaults']),
      () => {
        const start = mobile ? 24 : 138, end = w - start;
        const y = 119;
        const step = (end - start - 60) / 4;
        const suggested = label(start, 53, 'iodepth', 'start');
        suggested.classList.add(id + '-note');
        box(end - 40, y, 80, ['目标', 'Target'], 'accent');
        const route = path([[start, y], [end - 80, y]], 'guide');
        [0, 1, 2, 3].forEach(i => {
          const x = start + 17 + i * step;
          const cell = block(x, y, mobile ? 31 : 54, 31, 'quiet');
          if (i === 3) cell.setAttribute('opacity', '0.55');
          if (i < 3) {
            const pending = block(x, y, 20, 10, 'token');
            const issued = 1 + i * 0.37;
            updates.push(t => pending.setAttribute('opacity',
              clamp((t - 0.2 - i * 0.16) * 5) * (1 - clamp((t - issued) * 6))));
            travel(route, issued, 1.15);
          }
        });
        reveal(box(cx, 211, mobile ? 275 : 335, ['报告 · 实际深度分布', 'Report · Observed Depth'], 'accent'), 2.6);
      },
      () => {
        const a = mobile ? 54 : 140, b = w - a;
        const width = mobile ? 88 : 143;
        const y1 = 86, y2 = 202;
        const from = ['作业', 'Job'], to = ['存储', 'Storage'];
        const l = a + width / 2, r = b - width / 2;
        const cacheWidth = mobile ? 113 : 164;
        const inCache = path([[l, y1], [cx - cacheWidth / 2, y1]]);
        const flush = path([[cx + cacheWidth / 2, y1], [r, y1]], 'guide');
        const direct = path([[l, y2], [r, y2]]);
        label(cx, 39, ['缓冲写', 'Buffered Write']);
        label(cx, 151, ['非缓冲 I/O', 'Non-Buffered I/O']);
        for (const y of [y1, y2]) {
          box(a, y, width, from);
          box(b, y, width, to);
        }
        box(cx, y1, cacheWidth, ['主机缓存', 'Host Cache']);
        travel(inCache, 0.16, 0.7);
        travel(flush, 1.6, 1.2);
        travel(direct, 0.16, 1.35);
        label(cx, 254, ['虚线 · 缓存写回', 'Dashed · Cache Writeback'], 'middle', 'note');
      },
      () => {
        const a = mobile ? 24 : 139, b = w - a;
        const c = a + (b - a) * 0.32;
        box((a + cx) / 2 - 6, 55, cx - a - 13, ['读 · BW / IOPS', 'Read · BW / IOPS']);
        box((b + cx) / 2 + 6, 55, b - cx - 13, ['写 · BW / IOPS', 'Write · BW / IOPS']);
        const submit = path([[a, 145], [c, 145]], 'line');
        const complete = path([[c, 145], [b, 145]], 'active');
        [a, c, b].forEach(x => path([[x, 134], [x, 156]]));
        label((a + c) / 2, 115, 'slat');
        label((c + b) / 2, 115, 'clat');
        travel(submit, 0.24, 0.65);
        travel(complete, 0.89, 1.65);
        reveal(path([[a, 176], [a, 188], [b, 188], [b, 176]]), 2.1);
        reveal(label(cx, 218, ['lat · 总时延', 'lat · Total Latency']), 2.1);
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
