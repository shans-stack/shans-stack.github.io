(function () {
  const id = 'n-bwu';
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

    const product = 'Blackwell Ultra';
    const scenes = [
      () => superchip('Grace CPU', 'B300 GPU', ['双计算裸片','Dual Compute Dies'], {name:'GB300 Superchip'}),
      () => {
        const m = mobile();
        [['B200', 251], ['B300', 304]].forEach(([model, width], i) => {
          const x = m ? 28 : 59 + i * 365;
          const y = m ? 82 + i * 123 : 103;
          text(x, y, model + ' · HBM3E', 'heading start');
          rect(x, y + 22, width, 62, 'boundary');
          emphasize(box(x + 58, y + 53, 108, 47, [['模型权重', 'Weights']]), .3 + i * 1.3);
          emphasize(box(x + 178 + i * 25, y + 53, 116 + i * 46, 47, ['KV Cache']), .58 + i * 1.3);
        });
        caption(['更高容量可容纳更多运行状态','More Capacity for Runtime State']);
      },
      () => flow([
        [['相关分数','Attention Scores']],
        ['Softmax', ['SFU 执行指数运算','Exponentials on SFUs']],
        [['加权输出','Weighted Output']]
      ], {note: ['B300 加强 Softmax 所用指令','B300 Improves Softmax Instructions']}),
      () => duo([
        ['GB200', [['Blackwell'],['NVLink 5',['GPU 互联','GPU Fabric']]]],
        ['GB300', [['Blackwell Ultra'],['NVLink 5',['GPU 互联','GPU Fabric']]]]
      ], ['两代整柜均搭配 Grace CPU','Both Racks Use Grace CPUs'], true),
      () => duo([
        ['HGX B300', [[['服务器平台', 'Server Platform']]]],
        ['GB300 NVL72', [[['整柜系统', 'Rack-Scale System']]]]
      ])
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
