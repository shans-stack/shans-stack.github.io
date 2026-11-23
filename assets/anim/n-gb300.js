(function () {
  const id = 'n-gb300';
  const sizes = [[780, 306], [360, 385]];
  const title = ["GB300 NVL72", "GB300 NVL72"];

  function mount(host, {onLayout} = {}) {
    const layout = matchMedia('(max-width: 640px)');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('role', 'img');
    host.classList.add(id + '-figure');
    host.replaceChildren(svg);

    let current = 0;
    let raf = 0;
    let last = 0;
    let time = 0;
    let paused = false;
    let effects = [];
    const size = () => sizes[Number(layout.matches)];
    const ratio = () => size()[0] / size()[1];
    const tr = ([zh, en]) => SS.L(zh, en);

    function el(tag, attrs, style, parent = svg) {
      const element = document.createElementNS(svg.namespaceURI, tag);
      for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
      if (style) element.setAttribute('class', style.split(' ').map(name => id + '-' + name).join(' '));
      parent.append(element);
      return element;
    }

    function text(x, y, words, style = 'label', parent = svg) {
      const item = el('text', {x, y}, style, parent);
      item.textContent = tr(words);
      return item;
    }

    function rect(x, y, width, height, style = 'panel', parent = svg) {
      return el('rect', {x, y, width, height, rx: 4}, style, parent);
    }

    function box([x, y, w, h], rows, style = '') {
      const group = el('g', {}, 'node');
      const panel = rect(x - w / 2, y - h / 2, w, h, style ? 'panel ' + style : 'panel', group);
      rows.forEach((words, i) => text(x, y + (i - (rows.length - 1) / 2) * 23,
        words, i === 0 ? 'label' : 'secondary', group));
      return panel;
    }

    function highlight(item, start, duration = 1.25) {
      effects.push((phase, still) => {
        item.classList.toggle(id + '-active', still || (phase >= start && phase < start + duration));
      });
    }

    function route(points, start, duration = 0.9, tone = '') {
      const d = 'M' + points.map(p => p.join(' ')).join(' L');
      const path = el('path', {d}, tone ? 'wire ' + tone : 'wire');
      if (start === undefined) return;
      const block = el('rect', {x: -5, y: -4, width: 10, height: 8, rx: 1}, 'block');
      const length = path.getTotalLength();
      effects.push((phase, still) => {
        const p = (phase - start) / duration;
        const point = path.getPointAtLength(length * Math.max(0, Math.min(1, p)));
        block.setAttribute('transform', 'translate(' + point.x + ' ' + point.y + ')');
        block.setAttribute('opacity', still ? 0 : Math.max(0, Math.min(1, p * 8, (1 - p) * 8)));
      });
    }

    function draw() {
      const [width, height] = size();
      svg.replaceChildren();
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      svg.setAttribute('aria-label', tr(window.SS_TOPIC_CFG?.steps[current]?.t || title));
      svg.dataset.step = current + 1;
      effects = [];
      text(layout.matches ? 14 : 42, 30, title, 'heading start');
      scenes[current](layout.matches);
      text(width / 2, height - 16, ['示意，不代表实测数字', 'Schematic, not measured'], 'note');
      paint();
    }

    function paint() {
      for (const effect of effects) effect(time % 5.4, motion.matches);
    }

    function tick(now) {
      time += Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      paint();
      raf = requestAnimationFrame(tick);
    }

    function start() {
      cancelAnimationFrame(raf);
      if (paused || motion.matches) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }

    function resize() {
      draw();
      onLayout?.(ratio(), layout.matches);
    }

    function changeMotion() {
      paint();
      start();
    }

    const cpu = 'Grace CPU';
    const gpu = 'Blackwell Ultra';
    const generation = 'NVLink 5';
    const nic = 'ConnectX-8';
    const dpu = 'BlueField-3';

    function rack(m) {
      const [x, y, w, h] = m ? [22, 78, 101, 249] : [111, 67, 169, 200];
      const pitch = (h - 28) / 27;
      const end = x + w;
      rect(x, y, w, h, 'panel');
      for (let i = 0; i < 27; i++) {
        const isSwitch = i >= 9 && i < 18;
        const tray = rect(x + 9, y + 14 + i * pitch, w - 18, pitch - 2.2, 'panel');
        highlight(tray, isSwitch ? 2 : .4, 1.5);
      }
      const [cx, a, b, cardW] = m ? [247, 129, 267, 201] : [540, 111, 220, 276];
      const startX = cx - cardW / 2;
      route([[end, y + 14 + 4 * pitch], [end + 12, y + 14 + 4 * pitch], [end + 12, a], [startX, a]]);
      route([[end, y + 14 + 13 * pitch], [end + 12, y + 14 + 13 * pitch], [end + 12, b], [startX, b]]);
      highlight(box([cx, a, cardW, 75], [
        ['18 个计算托盘', '18 Compute Trays'],
        ['72 × ' + gpu, '72 × ' + gpu],
        ['36 × ' + cpu, '36 × ' + cpu]
      ]), .4, 1.5);
      highlight(box([cx, b, cardW, 61], [
        ['9 个交换托盘', '9 Switch Trays'], [generation, generation]
      ]), 2, 1.5);
    }

    function compare(m, groups, footer) {
      const [x1, x2, w] = m ? [91, 269, 154] : [265, 516, 216];
      const top = m ? 79 : 72;
      const pitch = m ? 61 : 49;
      groups.forEach(([name, ...items], c) => {
        const x = c ? x2 : x1;
        text(x, top, [name, name], 'heading');
        items.forEach((word, i) => highlight(box([x, top + (i + 1) * pitch, w, 39], [[word, word]]),
          .25 + i * 1.18 + c * .3, .92));
      });
      text(m ? 180 : 390, m ? 310 : 248, footer, 'secondary');
    }

    function fabric(m, title, adapter, other) {
      const names = [
        [['柜内 GPU 通信', 'Within One Rack'], [['托盘 A', 'Tray A'], title, ['托盘 B', 'Tray B']]],
        [['跨柜计算网络', 'Between Racks'], [['机柜 A', 'Rack A'], ['计算网络', 'Cluster Fabric'], ['机柜 B', 'Rack B']]]
      ];
      const widths = m ? [81, 120, 81] : [148, 178, 148];
      const xs = m ? [58, 180, 302] : [152, 390, 628];
      names.forEach(([label, items], i) => {
        const top = m ? 81 + i * 145 : 83 + i * 111;
        const y = top + 36;
        text(m ? 16 : 64, top, label, 'secondary start');
        const start = .35 + i * 2.15;
        for (let j = 0; j < 2; j++) {
          route([[xs[j] + widths[j] / 2, y], [xs[j + 1] - widths[j + 1] / 2, y]],
            start + j * .69, .68, i ? 'external' : '');
        }
        items.forEach((item, j) => highlight(box([xs[j], y, widths[j], 44], [item]), start + j * .62, .95));
        if (i === 1) {
          text(xs[0], y + 39, [adapter, adapter], 'secondary');
          text(xs[2], y + 39, [adapter, adapter], 'secondary');
        }
      });
      if (other) text(m ? 180 : 390, m ? 337 : 251, other, 'secondary');
    }

    const scenes = [
      rack,
      m => {
        const pivots = m ? [[93, 128], [267, 128]] : [[224, 130], [556, 130]];
        const width = m ? 151 : 194;
        pivots.forEach(([x, y], i) => {
          route([[x, y - 7], [x, y + 19]], .55 + i * 1.5, .79);
          highlight(box([x, y - 31, width, 48], [[cpu, cpu]]), .25 + i * 1.5);
          highlight(box([x, y + 43, width, 48], [['2 × ' + gpu, '2 × ' + gpu]]), 1.13 + i * 1.5);
        });
        text(m ? 180 : 390, m ? 212 : 140, ['NVLink-C2C', 'NVLink-C2C'], 'secondary');
        const y = m ? 278 : 232;
        highlight(box([m ? 93 : 224, y, width, 49], [[nic, nic], ['计算网络', 'Compute Network']]), 3.3);
        highlight(box([m ? 267 : 556, y, width, 49], [[dpu, dpu], ['存储网络', 'Storage Network']]), 3.95);
      },
      m => {
        const [a, b, c] = m ? [[180, 100], [180, 199], [180, 297]]
          : [[136, 158], [390, 158], [644, 158]];
        rect(m ? 44 : 35, m ? 65 : 110, m ? 272 : 710, m ? 269 : 104, 'boundary');
        route(m ? [[180, 124], [180, 170]] : [[211, 158], [298, 158]], .45);
        route(m ? [[180, 228], [180, 273]] : [[482, 158], [569, 158]], 1.35);
        highlight(box([...a, 150, 48], [['计算托盘 A', 'Compute Tray A']]), .2);
        highlight(box([...b, 184, 58], [['NVLink 交换', 'NVLink Switching'], ['9 个交换托盘', '9 Switch Trays']], 'accent'), 1);
        highlight(box([...c, 150, 48], [['计算托盘 B', 'Compute Tray B']]), 2.04);
        text(m ? 180 : 390, m ? 348 : 243, ['单一 NVLink 域', 'Single NVLink Domain'], 'secondary');
      },
      m => fabric(m, ['NVLink 5', 'NVLink 5'], nic),
      m => compare(m, [
        ['GB200 NVL72', 'Blackwell'], ['GB300 NVL72', gpu]
      ], ['两代共有：Grace CPU · NVLink 5 · 72 GPU 域', 'Shared: Grace CPU · NVLink 5 · 72-GPU Domain'])
    ];

    layout.addEventListener('change', resize);
    motion.addEventListener('change', changeMotion);
    document.addEventListener('ss-lang', draw);
    resize();
    start();
    const controls = {
      show(i) {
        current = Math.max(0, Math.min(i, scenes.length - 1));
        time = 0;
        draw();
        start();
      },
      pause() {
        paused = true;
        cancelAnimationFrame(raf);
      },
      resume() {
        if (!paused) return;
        paused = false;
        start();
      },
      destroy() {
        controls.pause();
        layout.removeEventListener('change', resize);
        motion.removeEventListener('change', changeMotion);
        document.removeEventListener('ss-lang', draw);
        svg.remove();
        host.classList.remove(id + '-figure');
        delete host.__anim;
      },
      ratio,
      step: () => current
    };
    host.__anim = controls;
    return controls;
  }

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = {steps: 5, mount};
})();
