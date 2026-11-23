(function () {
  const id = 'n-vr';
  const sizes = [[780, 306], [360, 385]];
  const title = ["Vera Rubin NVL72", "Vera Rubin NVL72"];

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

    const cpu = 'Vera CPU';
    const gpu = 'Rubin GPU';
    const generation = 'NVLink 6';
    const nic = 'ConnectX-9';
    const dpu = 'BlueField-4';
    const switchTray = ['NVLink 交换托盘', 'NVLink Switch Trays'];
    const computeTray = ['计算托盘', 'Compute Trays'];

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
        const [a, b] = m ? [[180, 120], [180, 280]] : [[212, 162], [569, 162]];
        const widths = [211, 210];
        route(m ? [[180, 165], [180, 235]]
          : [[a[0] + widths[0] / 2, 162], [b[0] - widths[1] / 2, 162]], .6, 1.35);
        text(m ? 246 : 390, m ? 200 : 146, ['背部互联', 'Rear Links'], 'secondary');
        highlight(box([...a, widths[0], 90], [computeTray, ['2 × ' + cpu, '2 × ' + cpu],
          ['4 × ' + gpu, '4 × ' + gpu]], 'accent'), .25, 1.55);
        highlight(box([...b, widths[1], 90], [switchTray, ['第六代 NVLink', 'Sixth-Gen NVLink']]), 1.85, 1.55);
      },
      m => fabric(m, ['NVLink 6', 'NVLink 6'], nic,
        [dpu + '：独立的 DPU 路径', dpu + ': Separate DPU Path']),
      m => compare(m, [
        ['GB300 NVL72', 'Grace CPU', 'Blackwell Ultra', 'NVLink 5'],
        ['Vera Rubin NVL72', cpu, gpu, 'NVLink 6']
      ], ['两代均为单柜 72 GPU 域', 'Both: One 72-GPU Domain per Rack']),
      m => {
        const dates = [['2026-10-25', '2026-10-25'], ['2026-11-17', '2026-11-17']];
        const notes = [['财季结束', 'Fiscal Quarter End'], ['NVIDIA 确认批量出货', 'NVIDIA Confirms Shipments']];
        const w = m ? 278 : 286;
        const centers = m ? [[180, 110], [180, 244]] : [[204, 145], [576, 145]];
        route(m ? [[180, 145], [180, 209]] : [[347, 145], [433, 145]], .85, 1.05);
        centers.forEach(([x, y], i) => highlight(box([x, y, w, 70], [dates[i], notes[i]]), .2 + i * 1.55, 1.55));
        text(m ? 180 : 390, m ? 321 : 243, ['截至 2026-11-23', 'As of November 23, 2026'], 'secondary');
      }
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
