(function () {
  const id = 'n-dgxc';
  const sizes = [[780, 306], [360, 385]];
  const title = ["DGX Cloud", "DGX Cloud"];

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

    const cloud = ['DGX Cloud', 'DGX Cloud'];
    const dsx = ['DSX OS', 'DSX OS'];
    const training = ['训练作业', 'Training Run'];

    const scenes = [
      m => {
        const left = m ? [91, 282] : [155, 174];
        const right = m ? [269, 282] : [625, 174];
        const center = m ? [180, 122] : [390, 174];
        route(m ? [[180, 152], [180, 204], [91, 204], [91, 252]] : [[308, 174], [237, 174]], .5);
        route(m ? [[180, 152], [180, 204], [269, 204], [269, 252]] : [[472, 174], [543, 174]], 2.15);
        highlight(box([...center, 164, 60], [cloud, ['云端 AI 工厂', 'Cloud AI Factory']], 'accent'), 0, 3.6);
        highlight(box([...left, 164, 60], [['云服务商', 'Cloud Providers']]), 1.2);
        highlight(box([...right, 164, 60], [['云合作伙伴', 'Cloud Partners']]), 2.85);
      },
      m => {
        const [a, b, c] = m ? [[180, 100], [180, 204], [180, 307]]
          : [[142, 157], [390, 157], [638, 157]];
        const ab = m ? [[180, 129], [180, 175]] : [[229, 157], [303, 157]];
        const bc = m ? [[180, 233], [180, 278]] : [[477, 157], [551, 157]];
        route(ab, .35);
        route(bc, 1.25);
        route(bc.toReversed(), 2.4);
        route(ab.toReversed(), 3.3);
        highlight(box([...a, 174, 58], [['GPU 节点 A', 'GPU Node A'], ['样本分片 A', 'Data Shard A']]), 0, 1.25);
        highlight(box([...b, 174, 58], [['训练网络', 'Training Network'], ['梯度交换', 'Gradient Exchange']]), .8, 3.5);
        highlight(box([...c, 174, 58], [['GPU 节点 B', 'GPU Node B'], ['样本分片 B', 'Data Shard B']]), 1.9, 1.1);
      },
      m => {
        const [a, b, c, d] = m ? [[180, 83], [90, 194], [270, 194], [180, 311]]
          : [[133, 157], [390, 95], [390, 220], [647, 157]];
        [b, c].forEach(([x, y], i) => {
          route(m ? [[180, 108], [180, 132], [x, 132], [x, y - 25]]
            : [[211, 157], [260, 157], [260, y], [312, y]], .3 + i * .25);
          route(m ? [[x, y + 25], [x, 255], [180, 255], [180, 286]]
            : [[468, y], [522, y], [522, 157], [569, 157]], 1.85 + i * .35);
        });
        box([...a, 156, 50], [training]);
        highlight(box([...b, 156, 50], [['集群检查', 'Cluster Checks']]), 1);
        highlight(box([...c, 156, 50], [['软件与恢复', 'Ops & Recovery']]), 1.3);
        highlight(box([...d, 156, 50], [['验证结果', 'Validated Design']]), 2.65);
      },
      m => {
        const [a, b, c] = m ? [[180, 100], [180, 201], [180, 305]]
          : [[139, 156], [390, 156], [641, 156]];
        route(m ? [[180, 130], [180, 171]] : [[231, 156], [298, 156]], .4);
        route(m ? [[180, 231], [180, 275]] : [[482, 156], [549, 156]], 2);
        highlight(box([...a, 184, 60], [['验证过的流程', 'Validated Practices']]), .1);
        highlight(box([...b, 184, 60], [dsx, ['开放模块', 'Open Modules']], 'accent'), 1.2);
        highlight(box([...c, 184, 60], [['合作伙伴', 'Partner AI Factory']]), 2.8);
      },
      m => {
        const lanes = [
          [cloud, ['训练与验证', 'Train & Validate']],
          [['DGX Cloud Lepton', 'DGX Cloud Lepton'], ['GPU 算力发现', 'GPU Discovery']]
        ];
        lanes.forEach(([a, b], i) => {
          const [x1, x2, w, y] = m ? [91, 266, 150, 114 + i * 149] : [228, 553, 220, 103 + i * 107];
          route([[x1 + w / 2, y], [x2 - w / 2, y]], .35 + i * 2.1);
          box([x1, y, w, 56], [a]);
          highlight(box([x2, y, w, 56], [b]), 1.05 + i * 2.1);
        });
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
