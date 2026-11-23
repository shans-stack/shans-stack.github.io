(function () {
  const id = 'n-nvsw';
  const sizes = [[780, 326], [360, 366]];

  function mount(host, {onLayout, paused = false} = {}) {
    const layout = matchMedia('(max-width: 640px)');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    const scene = document.createElementNS(ns, 'g');
    svg.setAttribute('role', 'img');
    host.classList.add(id + '-figure');
    host.replaceChildren(svg);

    let current = 0, raf = 0, last = 0, time = 0, effects = [];
    const mobile = () => layout.matches;
    const ratio = () => sizes[Number(mobile())][0] / sizes[Number(mobile())][1];
    const lang = words => Array.isArray(words) ? SS.L(...words) : words;

    function el(tag, attrs, style, parent = scene) {
      const item = document.createElementNS(ns, tag);
      for (const [key, value] of Object.entries(attrs)) item.setAttribute(key, value);
      item.setAttribute('class', style.split(' ').map(name => id + '-' + name).join(' '));
      parent.append(item);
      return item;
    }

    function text(x, y, words, style = 'label', parent) {
      const item = el('text', {x, y}, style, parent);
      item.textContent = lang(words);
      return item;
    }

    function rect(x, y, width, height, style = 'panel', parent) {
      return el('rect', {x, y, width, height, rx: 4}, style, parent);
    }

    function box(x, y, w, h, [label, sub], tone = '') {
      const group = el('g', {}, 'node');
      const panel = rect(x - w / 2, y - h / 2, w, h, tone ? 'panel ' + tone : 'panel', group);
      text(x, y - (sub ? 10 : 0), label, 'label', group);
      if (sub) text(x, y + 12, sub, 'small', group);
      return panel;
    }

    function emphasize(panel, start, duration = .9) {
      effects.push((phase, still) => {
        panel.classList.toggle(id + '-active', still || (phase >= start && phase < start + duration));
      });
    }

    function path(points, style = 'wire') {
      return el('path', {d: 'M' + points.map(pair => pair.join(' ')).join(' L')}, style);
    }

    function transfer(points, start, {duration = .8, copy = false} = {}) {
      const wire = path(points, 'wire directed');
      const [x, y] = points[0];
      if (copy) rect(x - 4, y - 4, 8, 8, 'origin');
      const block = rect(-5, -4, 10, 8, 'packet');
      const length = wire.getTotalLength();
      effects.push((phase, still) => {
        const p = still ? 1 : (phase - start) / duration;
        const distance = length * Math.max(0, Math.min(1, p));
        const point = wire.getPointAtLength(distance);
        block.setAttribute('transform', 'translate(' + point.x + ' ' + point.y + ')');
        block.setAttribute('opacity', still ? 1 : Math.max(0, Math.min(1, p * 8, (1.3 - p) * 4)));
      });
    }

    function caption(words) {
      if (words) text(mobile() ? 180 : 390, mobile() ? 326 : 276, words, 'small');
    }

    function switched(link, target, idle, endNote, linked = true) {
      const m = mobile();
      const nodes = m ? [[86, 98], [180, 193], [180, 277], [270, 98]]
        : [[123, 142], [390, 142], [657, 142], [390, 233]];
      const w = m ? 147 : 184, h = 52;
      const sides = m ? [
        [[86, 124], [86, 148], [180, 148], [180, 167]],
        [[180, 219], [180, 251]],
        [[270, 124], [270, 148], [225, 148], [225, 167]]
      ] : [
        [[215, 142], [298, 142]], [[482, 142], [565, 142]], [[390, 168], [390, 207]]
      ];
      if (linked) path(sides[2], 'wire secondary-wire');
      transfer(sides[0], .55, {duration: .86, copy: true});
      transfer(sides[1], 1.45);
      const names = [['GPU A'], [link], [target], idle];
      nodes.forEach(([x, y], i) => {
        const panel = box(x, y, w, h, names[i], i === 3 ? 'quiet' : '');
        if (i < 3) emphasize(panel, .35 + .84 * i);
      });
      caption(endNote);
    }

    function rack(name, groups, note, {secondCompute = false, baseboard} = {}) {
      const m = mobile();
      const [x, y, w, h] = m ? [20, 68, 99, 234] : [102, 65, 167, 210];
      const [callX, callY, pitch] = m ? [151, 89, 64] : [361, 87, 57];
      rect(x, y, w, h, 'panel rack');
      const rear = x + w - 12;
      const left = x + 10;
      const inner = rear - left - 7;
      const yOf = i => y + 12 + i * (h - 24) / 12;
      const trayHeight = (h - 24) / 12 - 4;
      for (let i = 0; i < 12; i++) {
        const isSwitch = i >= 5 && i <= 7;
        if (i === 11 && !secondCompute) {
          rect(left, yOf(i), inner, trayHeight, 'tray utility');
          continue;
        }
        const tray = rect(left, yOf(i), inner, trayHeight, isSwitch ? 'tray switch-tray' : 'tray');
        if (i === 2 || i === 6 || i === 9) emphasize(tray, i === 2 ? .35 : i === 6 ? 1.1 : 1.9);
      }

      const top = yOf(2) + trayHeight / 2, mid = yOf(6) + trayHeight / 2;
      const bottom = yOf(9) + trayHeight / 2;
      const edge = left + inner;
      if (!secondCompute) path([[left - 4, top], [left - 4, yOf(11) + trayHeight / 2]], 'coolant');
      const route = [[edge, top], [rear, top], [rear, mid], [edge, mid]];
      const onward = [[edge, mid], [rear, mid], [rear, bottom], [edge, bottom]];
      transfer(route, .45, {duration: .95});
      transfer(onward, 1.45, {duration: .95});
      groups.forEach(([label, sub], i) => {
        const lineY = callY + i * pitch;
        const anchorY = [top, mid, secondCompute ? bottom : yOf(11) + trayHeight / 2][i];
        const elbow = x + w + 8 + i * 5;
        path([[x + w, anchorY], [elbow, anchorY], [elbow, lineY], [callX - 8, lineY]], 'callout');
        text(callX, lineY, label, 'label start');
        text(callX, lineY + 22, sub, 'small start');
      });
      text(x + w / 2, m ? y - 14 : y + h + 15, name, 'small');
      if (baseboard) {
        const bx = m ? 34 : callX, by = m ? 326 : 262;
        rect(bx, by - 7, 29, 14, 'panel');
        for (let i = 0; i < 3; i++) rect(bx + 4 + i * 8, by - 2.5, 5, 5, 'tray');
        text(bx + 38, by, baseboard, 'small start');
      }
      if (note) {
        if (m) text(180, 326, note, 'small');
        else text(callX, 262, note, 'small start');
      }
    }

    function duo(groups, note, connected = false) {
      const vertical = mobile();
      groups.forEach(([model, parts], group) => {
        const x = vertical ? 180 : 209 + group * 362;
        const y = vertical ? 76 + group * 129 : 101;
        text(x - 146, y, model, 'heading start');
        if (connected) path([[x - 6, y + 50], [x + 6, y + 50]], 'wire directed');
        parts.forEach(([label, sub], i) => {
          const w = parts.length === 1 ? 292 : 140;
          const dx = parts.length === 1 ? 0 : (i * 2 - 1) * 76;
          emphasize(box(x + dx, y + 50, w, 55, [label, sub]), .45 + group * 1.45 + i * .22, 1.05);
        });
      });
      caption(note);
    }

    function draw() {
      const [width, height] = sizes[Number(mobile())];
      scene.replaceChildren();
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      svg.setAttribute('aria-label', lang(window.SS_TOPIC_CFG.steps[current].t));
      svg.dataset.step = current + 1;
      effects = [];
      scenes[current]();
      text(width / 2, height - 16, ['示意，不代表实测数字', 'Schematic, No Measured Values'], 'note');
      paint();
    }

    function paint() {
      for (const effect of effects) effect(time % 5.2, motion.matches);
    }

    function tick(now) {
      time += Math.max(0, Math.min(.05, (now - last) / 1000));
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
      onLayout?.(ratio(), mobile());
    }

    function changeMotion() {
      paint();
      start();
    }

    const product = 'NVLink Switch';
    const scenes = [
      () => switched('NVLink Switch', 'GPU B', ['GPU C', ['未参与此传输','Outside Transfer']],
        ['一笔 GPU 到 GPU 传输','One GPU-to-GPU Transfer']),
      () => {
        const m = mobile();
        const xs = m ? [62, 180, 298] : [142, 390, 638];
        const ws = m ? [94, 110, 94] : [168, 220, 168];
        const lanes = [
          [['同柜 NVLink 域','NVLink Within a Rack'], ['GPU A', 'NVSwitch', 'GPU B']],
          [['跨柜集群互联','Cluster Fabric Between Racks'], [['网卡 A','NIC A'], ['集群网络','Cluster Fabric'], ['网卡 B','NIC B']]]
        ];
        lanes.forEach(([label, items], i) => {
          const y = 131 + i * 119, start = .4 + i * 2.15;
          text(m ? 14 : 58, y - 47, label, 'heading start');
          for (let j = 0; j < 2; j++) {
            transfer([[xs[j] + ws[j] / 2, y],[xs[j + 1] - ws[j + 1] / 2, y]], start + j * .8, {duration:.72});
          }
          items.forEach((item, j) => emphasize(box(xs[j], y, ws[j], 51, [item]), start + j * .71));
        });
      },
      () => duo([
        ['HGX H100', [['H100 GPU', 'NVLink 4'], ['NVSwitch', ['第三代芯片','3rd-Gen Chip']]]],
        ['HGX B200', [['B200 GPU', 'NVLink 5'], ['NVSwitch', ['第四代芯片','4th-Gen Chip']]]]
      ], ['同一底板上的 GPU 与交换芯片','GPUs and Switch Chips Share a Baseboard'], true),
      () => rack('NVL72', [
        [['计算托盘 A','Compute Tray A'],['Rubin GPU','Rubin GPU']],
        [['交换托盘','Switch Tray'],['装有 NVSwitch 芯片','Contains NVSwitch Chips']],
        [['计算托盘 B','Compute Tray B'],['经背部铜缆连接','Rear Copper Interconnect']]
      ], ['72 GPU 同域','72 GPUs in One Domain'], {secondCompute:true}),
      () => {
        const m = mobile();
        const rows = [
          ['Hopper', 'NVLink 4'],
          ['Blackwell / Ultra', 'NVLink 5'],
          ['Rubin', 'NVLink 6']
        ];
        rows.forEach((row, i) => {
          const y = 95 + i * (m ? 87 : 70);
          const x = m ? 89 : 272, end = m ? 273 : 533;
          const w = m ? 145 : 203;
          transfer([[x + w / 2, y],[end - w / 2, y]], .48 + i * 1.4);
          box(x, y, w, 45, [row[0]]);
          emphasize(box(end, y, w, 45, [row[1]]), 1.05 + i * 1.4);
        });
        caption(['NVL72 指 72 GPU 域规模','NVL72 Identifies a 72-GPU Domain']);
      }
    ];

    text(22, 28, product, 'heading start', svg);
    svg.append(scene);

    const control = {
      show(i) {
        current = Math.max(0, Math.min(scenes.length - 1, i));
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
        this.pause();
        layout.removeEventListener('change', resize);
        motion.removeEventListener('change', changeMotion);
        document.removeEventListener('ss-lang', draw);
        host.replaceChildren();
        host.classList.remove(id + '-figure');
        delete host.__anim;
      },
      ratio,
      step: () => current
    };

    layout.addEventListener('change', resize);
    motion.addEventListener('change', changeMotion);
    document.addEventListener('ss-lang', draw);
    host.__anim = control;
    control.show(0);
    return control;
  }

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = {steps: 5, mount};
})();
