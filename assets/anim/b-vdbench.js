(function () {
  const id = 'b-vdbench';
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
        const cx = width / 2;
        const [a, b, y0, y1, y2] = mobile ? [91, 269, 48, 127, 238] : [219, 541, 49, 122, 228];
        trace([[cx, y0 + 21], [cx, y1 - 21]], 0.05, 0.7);
        [a, b].forEach((x, i) => trace([[cx, y1 + 21], [cx, (y1 + y2) / 2], [x, (y1 + y2) / 2], [x, y2 - 21]], 0.8 + i * 0.18, 1));
        box(cx, y0, 196, ['参数文件', 'Parameter File']);
        box(cx, y1, 152, ['Vdbench', 'Vdbench'], 'accent');
        box(a, y2, mobile ? 146 : 179, ['块设备', 'Block Device']);
        box(b, y2, mobile ? 146 : 179, ['文件系统', 'File System']);
      },
      () => {
        chain([['RD · 运行条件', 'RD · Run Conditions'], ['WD · 访问方式', 'WD · Access Pattern'],
          ['SD · 块设备', 'SD · Block Device']], mobile ? 61 : 132);
        label(width / 2, mobile ? 260 : 227, ['目标速率 · iorate', 'Target Rate · iorate'], 'note');
      },
      () => {
        chain([['RD · 运行条件', 'RD · Run Conditions'], ['FWD · 文件操作', 'FWD · File Operations'],
          ['FSD · 目录树', 'FSD · Directory Tree']], mobile ? 54 : 126);
        label(width / 2, mobile ? 255 : 225, ['读写与元数据操作 · fwdrate', 'Data and Metadata Ops · fwdrate'], 'note');
      },
      () => {
        const [left, right] = mobile ? [66, 284] : [183, 576];
        const [y0, gap] = mobile ? [103, 74] : [87, 65];
        const loads = [['较低', 'Lower'], ['升高', 'Rising'], ['很高', 'Very High']];
        label(left, mobile ? 40 : 34, ['目标负载', 'Target Load'], 'note');
        label(right, mobile ? 40 : 34, ['采样点', 'Sample Point'], 'note');
        loads.forEach((name, i) => {
          const y = y0 + i * gap;
          label(left, y, name);
          for (let j = 0; j <= i; j++) {
            trace([[left + 50, y + (j - i / 2) * 13], [right - 30, y + (j - i / 2) * 13]], i * 0.72 + j * 0.14, 1);
          }
          const index = String.fromCharCode(65 + i);
          const sample = box(right, y, 54, [index, index], 'accent', 45);
          updates.push(t => sample.setAttribute('opacity', t >= i * 0.72 + i * 0.14 + 0.88 ? 1 : 0));
        });
        label(width / 2, mobile ? 290 : 258, ['实测速率与响应时间', 'Achieved Rate and Response Time'], 'note');
      },
      () => {
        const x = mobile ? 180 : 520;
        box(mobile ? 95 : 196, mobile ? 63 : 113, 120, ['IOPS', 'IOPS']);
        box(mobile ? 265 : 196, mobile ? 63 : 179, 120, ['吞吐', 'Throughput']);
        label(x, mobile ? 118 : 79, ['响应时间分布', 'Response Time Distribution']);
        const base = mobile ? 235 : 205;
        path([[x - 107, base], [x + 107, base]]);
        [25, 58, 77, 43, 23, 12].forEach((h, i) => {
          const bar = draw('rect', { x: x - 99 + i * 34, y: base, width: 27, height: 0, rx: 1 }, 'signal');
          updates.push(t => {
            const rise = h * Math.max(0, Math.min(1, t * 1.4 - i * 0.1));
            bar.setAttribute('y', base - rise);
            bar.setAttribute('height', rise);
          });
        });
        label(width / 2, mobile ? 279 : 249, ['结果附工作集与缓存条件', 'Record Working Set and Cache State'], 'note');
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
