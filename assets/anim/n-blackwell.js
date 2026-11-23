(function () {
  const id = 'n-blackwell';
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

    function superchip(cpu, gpu, details, {fromMemory = false, name} = {}) {
      const m = mobile();
      const c = m ? [180, 102] : [144, 157];
      const gpus = m ? [[91, 237], [269, 237]] : [[613, 102], [613, 212]];
      const gw = m ? 144 : 215, cw = m ? 154 : 166, h = 55;
      const branches = gpus.map(([x, y]) => m
        ? [[180, c[1] + h / 2], [180, 176], [x, 176], [x, y - h / 2]]
        : [[c[0] + cw / 2, c[1]], [408, c[1]], [408, y], [x - gw / 2, y]]);
      path(branches[1]);
      transfer(branches[0], .65, {duration: 1.2, copy: fromMemory});
      text(m ? 239 : 313, m ? 155 : 136, 'NVLink-C2C', 'small');
      emphasize(box(...c, cw, h, fromMemory ? [cpu, 'LPDDR5X'] : [cpu]), .25, 1.2);
      gpus.forEach((point, i) => {
        const panel = box(...point, gw, h, [gpu, details]);
        if (i === 0) emphasize(panel, 1.65, 1.15);
      });
      caption(name);
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

    const product = 'Blackwell';
    const scenes = [
      () => superchip('Grace CPU', 'B200 GPU', ['Blackwell 架构', 'Blackwell'], {name:'GB200 Superchip'}),
      () => dies([['计算裸片 A','Compute Die A'], ['计算裸片 B','Compute Die B']],
        ['CUDA 看到一个 GPU','CUDA Sees One GPU']),
      () => duo([
        ['Hopper', [['FP8', ['8 位浮点数','8-Bit Float']]]],
        ['Blackwell', [['NVFP4', ['4 位浮点数','4-Bit Float']], [['缩放因子','Scale Factor'], ['按小块共享','Per Block']]]]
      ], ['适用的矩阵运算采用更低精度','Lower Precision for Suitable Operations']),
      () => switched('NVLink 5 Switch', 'GPU B', ['Grace CPU', ['未参与此传输','Outside Transfer']],
        ['GPU 间交换模型数据','GPUs Exchange Model Data'], false),
      () => rack('GB200 NVL72', [
        [['计算托盘','Compute Trays'],['Grace + Blackwell','Grace + Blackwell']],
        [['NVLink 5 交换托盘','NVLink 5 Switch Trays'],['经背部铜缆连接','Rear Copper Interconnect']],
        [['液冷与供电','Cooling and Power'],['整柜部件','Rack Infrastructure']]
      ], ['72 个 GPU 组成一个域','72 GPUs in One Domain'])
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
