(function () {
  const id = 'b-params';
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
        const from = ['负载生成器', 'Load Generator'];
        const target = ['文件或块设备', 'File or Block Device'];
        if (mobile) {
          const route = path([[cx, 93], [cx, 175]]);
          box(cx, 73, 214, from);
          box(cx, 195, 214, target, 'accent');
          [0.1, 0.8, 1.5].forEach(t => travel(route, t, 0.8));
          label(cx, 257, ['路径、范围、时段', 'Path, Range, Interval']);
        } else {
          const route = path([[272, 131], [504, 131]]);
          box(164, 131, 216, from);
          box(612, 131, 216, target, 'accent');
          [0.1, 0.8, 1.5].forEach(t => travel(route, t, 0.9));
          label(cx, 199, ['路径、范围、时段', 'Path, Range, Interval']);
        }
      },
      () => {
        const left = mobile ? 38 : 148;
        const pitch = mobile ? 40 : 69;
        const cell = mobile ? 35 : 61;
        [
          [97, ['顺序偏移', 'Sequential Offsets'], [0, 1, 2, 3]],
          [203, ['随机偏移', 'Random Offsets'], [5, 1, 6, 3]]
        ].forEach(([y, heading, order], row) => {
          label(left - cell / 2, y - 35, heading, 'start');
          for (let i = 0; i < 8; i++) block(left + i * pitch, y, cell, 29);
          order.forEach((i, j) =>
            reveal(block(left + i * pitch, y, row ? cell - 16 : cell - 6, 16, 'token'), j * 0.40));
        });
        label(cx, 252, ['地址 →', 'Address →'], 'middle', 'note');
      },
      () => {
        const a = mobile ? 64 : 153, b = w - a;
        const boxWidth = mobile ? 94 : 160;
        const left = a + boxWidth / 2, right = b - boxWidth / 2;
        const y = 140;
        const read = path([[left, y - 17], [right, y - 17]]);
        const write = path([[left, y + 17], [right, y + 17]]);
        box(a, y, boxWidth, ['发起端', 'Issuer'], 'box', 66);
        box(b, y, boxWidth, ['目标', 'Target'], 'box', 66);
        label(cx, y - 50, ['← 读数据', '← Read Data']);
        label(cx, y + 51, ['写数据 →', 'Write Data →']);
        [0.1, 0.85, 1.60].forEach((t, i) => {
          travel(read, t, 1, 12, 'alt', true);
          reveal(block(a + (i - 1) * 20, y + (mobile ? 93 : 80), 12, 10, 'alt'), t + 1);
        });
        travel(write, 0.7, 1, 36);
        reveal(block(b, y + (mobile ? 93 : 80), 36, 10, 'token'), 1.7);
        label(cx, mobile ? 270 : 251, ['请求数与字节数分别统计', 'Counts and Bytes Tracked Separately'], 'middle', 'note');
      },
      () => {
        const a = mobile ? 26 : 125, b = w - a;
        label(a, 34, ['发起者', 'Issuers'], 'start');
        label(b, 34, ['在途请求', 'Outstanding I/O'], 'end');
        [0, 1].forEach(i => {
          const y = 104 + i * 87;
          box(a + 36, y, 72, 'Job ' + (i + 1));
          const first = mobile ? 150 : 285;
          path([[a + 72, y], [b - 7, y]], 'guide');
          [0, 1, 2, 3].forEach(j => {
            const x = first + j * (mobile ? 51 : 95);
            block(x, y, mobile ? 39 : 72, 31);
            const request = block(x, y, mobile ? 22 : 38, 13, 'token');
            const enter = 0.10 + j * 0.40 + i * 0.33;
            updates.push(t => request.setAttribute('opacity', clamp((t - enter) * 6) * (j < 2 ? 1 - clamp((t - 2 - enter) * 6) : 1)));
          });
        });
        label(cx, 258, ['深度按每个发起者计算', 'Depth Is Per Issuer'], 'middle', 'note');
      },
      () => {
        const start = mobile ? 20 : 102, end = w - start, split = start + (end - start) * 0.38;
        const y = 138;
        path([[start, y], [split, y]], 'guide');
        path([[split, y], [end, y]], 'active');
        label((start + split) / 2, y - 36, ['预热', 'Warm-Up']);
        label((split + end) / 2, y - 36, ['统计', 'Measurement']);
        [start, split, end].forEach(x => path([[x, y - 10], [x, y + 10]]));
        const marker = block(start, y, 10, 26, 'alt');
        const count = label(cx, y + 66, ['计入统计', 'Completions Counted']);
        updates.push(t => {
          const p = clamp(t / 3.6);
          marker.setAttribute('transform', 'translate(' + (end - start) * p + ' 0)');
          count.textContent = tr(['计入统计 ', 'Completions Counted ']) + Math.max(0, Math.floor((p - 0.38) * 8));
        });
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
