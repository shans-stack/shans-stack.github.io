(function () {
  const id = 'n-rubin';
  const sizes = [[780, 326], [360, 366]];

  function mount(host, {onLayout, paused = false} = {}) {
    const layout = matchMedia('(max-width: 640px)');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    const headingLayer = document.createElementNS(ns, 'g');
    const scene = document.createElementNS(ns, 'g');
    svg.setAttribute('role', 'img');
    svg.append(headingLayer, scene);
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

    function dies(labels, note) {
      const m = mobile();
      const [x, y, w, h] = m ? [25, 64, 310, 235] : [147, 67, 486, 166];
      rect(x, y, w, h, 'boundary');
      const [a, b] = m ? [[180, 114], [180, 237]] : [[264, 151], [516, 151]];
      const width = m ? 183 : 165;
      transfer(m ? [[180, 136], [180, 215]] : [[a[0] + width / 2, 151], [b[0] - width / 2, 151]], .66, {duration: 1.15});
      text(m ? 238 : 390, m ? 173 : 127, 'NV-HBI', 'small');
      emphasize(box(...a, width, 44, [labels[0]]), .35, .86);
      emphasize(box(...b, width, 44, [labels[1]]), 1.59, 1.08);
      caption(note);
    }

    function flow(nodes, {copy = false, note, mobileCenter = 183} = {}) {
      const count = nodes.length;
      const vertical = mobile();
      const width = vertical ? 230 : (count === 4 ? 172 : 186);
      const height = 48;
      const points = nodes.map((_, i) => vertical
        ? [180, mobileCenter + (i - (count - 1) / 2) * (count === 4 ? 68 : 91)]
        : [390 + (i - (count - 1) / 2) * (count === 4 ? 188 : 232), 161]);

      points.slice(1).forEach(([x, y], i) => {
        const [a, b] = points[i];
        const segment = vertical ? [[a, b + height / 2], [x, y - height / 2]]
          : [[a + width / 2, b], [x - width / 2, y]];
        transfer(segment, .55 + i * .84, {copy: copy && i === 0});
      });
      points.forEach(([x, y], i) => emphasize(box(x, y, width, height, nodes[i]), .25 + i * .84));
      caption(note);
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

    const product = 'Rubin GPU';
    const scenes = [
      () => dies([['计算裸片 A','Compute Die A'], ['计算裸片 B','Compute Die B']],
        ['HBM3E → HBM4 · NVLink 5 → 6','HBM3E → HBM4 · NVLink 5 → 6']),
      () => flow([
        ['HBM4', ['模型权重与 KV Cache','Weights + KV Cache']],
        [['显存控制器','Memory Controllers']],
        [['解码运算','Decode Compute']],
        [['新 token','New Token']]
      ], {copy:true}),
      () => flow([
        [['权重索引','Weight Indices']],
        ['Tensor Core', ['在计算中查表','Inline Table Lookup']],
        [['矩阵乘法结果','Matrix Product']]
      ], {note: ['第三代 Transformer Engine','Third-Gen Transformer Engine']}),
      () => switched('NVLink 6 Switch', ['GPU B · 专家','GPU B · Expert'], ['GPU C', ['未被选中','Not Selected']],
        ['同一 NVLink 域','One NVLink Domain']),
      () => rack('Vera Rubin', [
        [['计算托盘','Compute Trays'],['Vera + Rubin','Vera + Rubin']],
        [['NVLink 6 交换托盘','NVLink 6 Switch Trays'],['72 GPU 同域','72 GPUs in One Domain']],
        [['液冷与供电','Cooling and Power'],['整柜部件','Rack Infrastructure']]
      ], ['2026-11-17 确认批量出货','Volume Shipments Confirmed Nov 17, 2026'])
    ];

    text(22, 28, product, 'heading start', headingLayer);

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
