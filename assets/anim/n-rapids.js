(function () {
  const id = 'n-rapids';
  const ns = 'http://www.w3.org/2000/svg';
  const tr = label => label.split('|')[window.SS_LANG === 'en' && label.includes('|') ? 1 : 0];

  function svgElement(parent, tag, attrs, text = '') {
    const item = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) item.setAttribute(key, value);
    if (text) item.textContent = text;
    parent.append(item);
    return item;
  }

  function mount(host, { paused = false, onLayout } = {}) {
    const narrow = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = svgElement(host, 'svg', { class: id + '-scene', role: 'img' });
    let step = 0, raf = 0, elapsed = 0, last = 0, width, height, motion;

    function paint(time) {
      for (const { path, token, length, target, start, duration } of motion) {
        const progress = (time - start) / duration;
        const position = path.getPointAtLength(length * Math.min(1, Math.max(0, progress)));
        token.setAttribute('transform', 'translate(' + position.x + ' ' + position.y + ')');
        token.style.opacity = Math.max(0, Math.min(1, progress * 12, (1.14 - progress) * 12));
        if (target && progress >= 1) target.classList.add(id + '-ready');
      }
    }

    function tick(now) {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      elapsed += dt;
      const cycle = 4.9;
      if (elapsed >= cycle) {
        elapsed %= cycle;
        svg.querySelectorAll('.' + id + '-ready').forEach(el => el.classList.remove(id + '-ready'));
      }
      paint(elapsed);
      raf = requestAnimationFrame(tick);
    }

    function run() {
      if (paused || reduced.matches || raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }

    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    }

    function rebuild() {
      stop();
      const mobile = narrow.matches;
      width = mobile ? 360 : 900;
      height = mobile ? 440 : 328;
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      svg.setAttribute('aria-label', tr(scenes[step].caption));
      svg.dataset.step = step + 1;
      svg.replaceChildren();
      motion = [];
      const wiring = svgElement(svg, 'g', {});
      const cards = svgElement(svg, 'g', {});
      const pulses = svgElement(svg, 'g', { 'aria-hidden': 'true' });
      const boxes = Object.create(null);
      const add = (group, tag, attrs, text) => svgElement(group, tag, attrs, text);
      const label = (group, x, y, text, kind = 'label', anchor = 'middle') =>
        add(group, 'text', { x, y, class: id + '-' + kind, 'text-anchor': anchor, 'dominant-baseline': 'central' }, tr(text));

      function box(key, points, title, options = {}) {
        const [x, y] = mobile ? points.slice(2) : points;
        const w = (mobile ? options.mobileWidth : options.width) || (mobile ? 154 : 176);
        const h = options.height || 62;
        const left = x - w / 2, top = y - h / 2;
        const group = add(cards, 'g', { class: id + '-node', 'data-node': key });
        if (options.tone) group.classList.add(id + '-' + options.tone);
        add(group, 'rect', { x: left, y: top, width: w, height: h, rx: 7, class: id + '-card' });
        let titleY = options.note ? y - 11 : y;
        if (options.art) titleY = top + 20;
        label(group, x, titleY, title);
        if (options.note) label(group, x, y + 12, options.note, 'detail');
        if (options.art) options.art({ group, x, y, top, left, w, h, add, label });
        boxes[key] = { x, y, w, h, group };
      }

      function connect(from, to, options = {}) {
        const a = boxes[from], b = boxes[to];
        const style = options.style || 'data';
        const direction = mobile ? options.mobile : options.desktop;
        const horizontal = direction ? direction === 'h' : a.y === b.y;
        const sign = Math.sign(horizontal ? b.x - a.x : b.y - a.y);
        const offset = options.offset || 0;
        const [x1, y1, x2, y2] = horizontal
          ? [a.x + sign * a.w / 2, a.y + offset, b.x - sign * b.w / 2, b.y + offset]
          : [a.x + offset, a.y + sign * a.h / 2, b.x + offset, b.y - sign * b.h / 2];
        const mid = horizontal ? (x1 + x2) / 2 : (y1 + y2) / 2;
        const d = horizontal ? 'M' + x1 + ',' + y1 + 'H' + mid + 'V' + y2 + 'H' + x2
          : 'M' + x1 + ',' + y1 + 'V' + mid + 'H' + x2 + 'V' + y2;
        const path = add(wiring, 'path', { d, class: id + '-line ' + id + '-' + style });
        const dx = horizontal ? sign : 0, dy = horizontal ? 0 : sign;
        const tip = (back, side) => (x2 - back * dx - side * dy) + ',' + (y2 - back * dy + side * dx);
        add(wiring, 'polyline', {
          points: [tip(7, -4), tip(0, 0), tip(7, 4)].join(' '),
          class: id + '-arrow ' + id + '-' + style
        });
        if (options.start !== undefined) {
          travel(path, style, options.start, options.duration, b.group);
        }
      }

      function travel(path, style, start, duration = 0.74, target) {
        const signal = style === 'control';
        const token = add(pulses, signal ? 'circle' : 'rect', {
          ...(signal ? { r: 4.5 } : { x: -7, y: -4.5, width: 14, height: 9, rx: 2 }),
          class: id + '-token ' + id + '-' + style
        });
        motion.push({ path, token, length: path.getTotalLength(), target, start, duration });
      }

      scenes[step].draw({ box, connect, mobile, cards, add, label, travel });
      label(svg, width / 2, height - 19, '示意，不代表实测数字|Schematic, not measured', 'detail');
      if (onLayout) onLayout(width / height, mobile);
      elapsed = 0;
      paint(reduced.matches ? 4.5 : 0);
      run();
    }

    const media = [narrow, reduced];
    for (const query of media) query.addEventListener('change', rebuild);
    document.addEventListener('ss-lang', rebuild);
    const control = {
      show(i) {
        step = Math.max(0, Math.min(scenes.length - 1, i));
        rebuild();
      },
      pause() { paused = true; stop(); },
      resume() { paused = false; run(); },
      destroy() {
        stop();
        for (const query of media) query.removeEventListener('change', rebuild);
        document.removeEventListener('ss-lang', rebuild);
        svg.remove();
        delete host.__anim;
      },
      ratio() { return width / height; },
      step() { return step; }
    };
    host.__anim = control;
    rebuild();
    return control;
  }

  function table({ group, x, top, add, label }, rows) {
    rows.forEach(([category, quantity], row) => {
      const y = top + 41 + row * 23;
      [category, quantity].forEach((value, col) => {
        const cx = x - 26 + col * 52;
        add(group, 'rect', {
          x: cx - 24, y, width: 48, height: 21, rx: 2,
          class: col === 0 ? 'n-rapids-key' : 'n-rapids-value'
        });
        label(group, cx, y + 10, value, 'detail');
      });
    });
  }

  function dataTile({ group, x, top, add }, copy = false) {
    add(group, 'rect', {
      x: x - 25, y: top + 41, width: 50, height: 18, rx: 3,
      class: 'n-rapids-tile' + (copy ? ' n-rapids-copy' : '')
    });
  }

  const rows = [['A', '2'], ['B', '4'], ['A', '3']];
  const scenes = [
    {
      caption: '表格的字段列进入 cuDF，GPU 上仍按列组织|Table columns move to cuDF and remain column-oriented on the GPU',
      draw({ box, connect }) {
        box('frame', [258, 151, 180, 96], '输入表|Input Table', { height: 123, width: 200, art: art => table(art, rows) });
        box('device', [642, 151, 180, 292], 'cuDF', { height: 123, width: 200, art: art => table(art, rows) });
        connect('frame', 'device', { style: 'column', start: 0.35, duration: 0.78, offset: -9 });
        connect('frame', 'device', { start: 0.67, duration: 0.78, offset: 9 });
      }
    },
    {
      caption: '按类别对数量求和，生成每组一行的输出|Quantities sum by category to produce one row per group',
      draw({ box, connect }) {
        box('input', [160, 151, 180, 83], '类别 ／ 数量|Category / Qty', { height: 123, art: art => table(art, rows) });
        box('aggregate', [450, 151, 180, 205], 'cuDF', { note: '分组求和|Group and Sum' });
        box('output', [740, 151, 180, 326], '类别 ／ 合计|Category / Total', { height: 99, art: art => table(art, [['A', '5'], ['B', '4']]) });
        connect('input', 'aggregate', { start: 0.3 });
        connect('aggregate', 'output', { start: 1.15 });
      }
    },
    {
      caption: 'pandas 代理按操作分派到 GPU 或 CPU|The pandas proxy dispatches each operation to GPU or CPU',
      draw({ box, connect }) {
        box('api', [120, 154, 180, 66], 'pandas API');
        box('proxy', [340, 154, 180, 168], 'cudf.pandas', { note: '代理分派|Proxy Dispatch', tone: 'active' });
        box('gpu', [650, 87, 92, 293], 'cuDF', { note: 'GPU · 可加速|GPU · Eligible' });
        box('cpu', [650, 221, 268, 293], 'pandas', { note: 'CPU · 回退|CPU · Fallback', tone: 'miss' });
        connect('api', 'proxy', { style: 'control', start: 0.3 });
        connect('proxy', 'gpu', { desktop: 'h', start: 1.15, offset: -9 });
        connect('proxy', 'cpu', { desktop: 'h', style: 'miss', start: 1.15, offset: 9 });
      }
    },
    {
      caption: 'cuDF for Apache Spark 将物理计划中符合条件的算子交给 GPU|cuDF for Apache Spark runs eligible physical operators on the GPU',
      draw({ box, connect }) {
        box('plan', [120, 153, 180, 58], 'Spark 计划|Spark Plan');
        box('plugin', [340, 153, 180, 151], 'cuDF', { note: 'Spark 插件|Spark Plug-in' });
        box('gpu', [560, 153, 180, 244], 'GPU 扫描|GPU Scan', { note: '替换算子|Replaced', tone: 'active' });
        box('cpu', [780, 153, 180, 337], 'CPU 算子|CPU Operator', { note: '保留实现|Retained' });
        connect('plan', 'plugin', { style: 'control', start: 0.35 });
        connect('plugin', 'gpu', { style: 'control', start: 1.15 });
        connect('gpu', 'cpu', { style: 'control', start: 1.95 });
      }
    },
    {
      caption: 'GPU 运算之间留在设备端，CPU 路径可能触发转换与复制|Consecutive GPU operations keep data on device and the CPU path may require conversion and copying',
      draw({ box, connect }) {
        box('device', [142, 153, 180, 64], 'cuDF', { note: 'GPU 运算 A|GPU Operation A', tone: 'active' });
        box('next', [450, 153, 180, 187], 'GPU 运算 B|GPU Operation B', { height: 77, art: dataTile });
        box('host', [758, 153, 180, 310], 'CPU 算子|CPU Operator', { height: 77, art: art => dataTile(art, true) });
        connect('device', 'next', { start: 0.35 });
        connect('next', 'host', { style: 'miss', start: 1.25 });
      }
    }
  ];

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = { steps: scenes.length, mount };
})();
