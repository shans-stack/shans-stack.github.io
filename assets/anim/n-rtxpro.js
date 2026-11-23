(function () {
  const id = 'n-rtxpro';
  const sizes = [[780, 306], [360, 385]];
  const title = ["RTX PRO Server", "RTX PRO Server"];

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

    const cpu = ['主机 CPU', 'Host CPU'];
    const gpu = ['RTX PRO 6000', 'RTX PRO 6000'];
    const pcie = ['PCIe', 'PCIe'];
    const nic = ['网卡', 'NIC'];

    const scenes = [
      m => {
        const [a, b, c, d] = m ? [[180, 111], [180, 193], [95, 285], [265, 285]]
          : [[240, 132], [540, 132], [240, 224], [540, 224]];
        rect(m ? 9 : 86, 65, m ? 342 : 608, m ? 262 : 198, 'boundary');
        highlight(box([...a, 176, 56], [cpu, ['系统内存', 'System Memory']]), .25);
        highlight(box([...b, 176, 56], [gpu, ['服务器版 GPU', 'Server Edition GPU']], 'accent'), 1.45);
        highlight(box([...c, 156, 56], [['本地 NVMe', 'Local NVMe']]), 2.65);
        highlight(box([...d, 156, 56], [nic]), 3.15);
      },
      m => {
        for (let i = 0; i < 2; i++) {
          const y = (m ? 110 : 106) + i * (m ? 157 : 108);
          const [a, b, w] = m ? [78, 279, 134] : [196, 584, 176];
          route([[a + w / 2, y], [b - w / 2, y]], .65 + i * 2);
          text((a + b) / 2, y - 14, pcie, 'secondary');
          highlight(box([a, y, w, 52], [['CPU 插槽 ' + (i + 1), 'CPU Socket ' + (i + 1)]]), .25 + i * 2);
          highlight(box([b, y, w, 52], [['GPU 组 ' + (i + 1), 'GPU Group ' + (i + 1)]]), 1.35 + i * 2);
        }
      },
      m => {
        const pairs = [
          [['模型推理', 'Model Inference'], ['Tensor Core', 'Tensor Core']],
          [['光线追踪', 'Ray Tracing'], ['RT Core', 'RT Core']],
          [['视频编解码', 'Video Processing'], ['NVENC / NVDEC', 'NVENC / NVDEC']]
        ];
        const [a, b, w] = m ? [85, 271, 146] : [212, 568, 216];
        pairs.forEach(([task, engine], i) => {
          const y = (m ? 92 : 88) + i * (m ? 104 : 75);
          route([[a + w / 2, y], [b - w / 2, y]], .15 + i * 1.58, .65);
          box([a, y, w, 48], [task]);
          highlight(box([b, y, w, 48], [engine]), .7 + i * 1.58);
        });
      },
      m => {
        const [a, b, c, d, e] = m ? [[180, 111], [89, 199], [270, 199], [89, 312], [270, 312]]
          : [[152, 119], [381, 119], [381, 223], [638, 119], [638, 223]];
        rect(m ? 4 : 29, m ? 49 : 49, m ? 352 : 467, m ? 188 : 211, 'boundary');
        text(m ? 180 : 153, 68, ['RTX PRO 服务器', 'RTX PRO Server'], 'secondary');
        route(m ? [[151, 135], [151, 151], [89, 151], [89, 171]] : [[241, 119], [280, 119]], .4, .7);
        route(m ? [[89, 227], [89, 282]] : [[482, 119], [544, 119]], 1.1, .85);
        route(m ? [[270, 227], [270, 282]] : [[482, 223], [544, 223]], 2.65, 1, 'external');
        box([...a, 178, 48], [gpu, ['服务器 GPU', 'Server GPU']]);
        highlight(box([...b, m ? 162 : 202, 56], [['B3140H SuperNIC', 'B3140H SuperNIC'], ['东西向接口', 'East–West Adapter']]), .95);
        highlight(box([...c, m ? 162 : 202, 56], [['BlueField-3 DPU', 'BlueField-3 DPU'], ['南北向接口', 'North–South Adapter']]), 2.4);
        highlight(box([...d, m ? 165 : 188, 60], [['计算节点', 'Compute Nodes']]), 1.9);
        highlight(box([...e, m ? 165 : 188, 60], [['存储与服务', 'Storage & Services']]), 3.55);
      },
      m => {
        const groups = [
          [['RTX PRO Server', 'RTX PRO Server'], cpu, ['RTX PRO GPU', 'RTX PRO GPU'], pcie],
          [['GB300 NVL72', 'GB300 NVL72'], ['计算托盘', 'Compute Tray'], ['计算托盘', 'Compute Tray'], ['NVLink', 'NVLink']]
        ];
        groups.forEach(([name, a, b, link], i) => {
          const [x, y, w] = m ? [180, 118 + i * 145, 330] : [207 + i * 366, 159, 330];
          rect(x - w / 2, y - 54, w, 105, 'boundary');
          text(x, y - 35, name, 'secondary');
          route([[x - 23, y + 12], [x + 23, y + 12]], .55 + i * 2, .82);
          text(x, y - 3, link, 'secondary');
          highlight(box([x - 88, y + 12, 130, 47], [a]), .15 + i * 2);
          highlight(box([x + 88, y + 12, 130, 47], [b]), 1.2 + i * 2);
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
