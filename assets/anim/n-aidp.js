(function () {
  const id = 'n-aidp';
  const sizes = [[780, 306], [360, 385]];
  const title = ["AI Data Platform", "AI Data Platform"];

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

    function route(points, start, duration = 0.9, tone = '', directed = false) {
      const d = 'M' + points.map(p => p.join(' ')).join(' L');
      const style = tone ? 'wire ' + tone : 'wire';
      const path = el('path', {d}, style);
      if (directed) {
        const [x, y] = points.at(-1);
        const [prevX, prevY] = points.at(-2);
        const angle = Math.atan2(y - prevY, x - prevX) * 180 / Math.PI;
        el('path', {d: 'M-7 -4L0 0L-7 4', transform: `translate(${x} ${y}) rotate(${angle})`}, style);
      }
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

    const storage = ['企业存储', 'Enterprise Storage'];
    const index = ['检索索引', 'Search Index'];
    const model = ['模型推理', 'Model Inference'];

    function pipeline(m, rows) {
      const gap = m ? 69 : 190;
      const w = m ? 228 : 165;
      const h = 53;
      const centers = rows.map((_, i) => m
        ? [180, 199 + (i - (rows.length - 1) / 2) * gap]
        : [390 + (i - (rows.length - 1) / 2) * gap, 153]);
      centers.slice(1).forEach(([x, y], i) => {
        const [px, py] = centers[i];
        route(m ? [[px, py + h / 2], [x, y - h / 2]] : [[px + w / 2, py], [x - w / 2, y]], .5 + i * 1.1, .65);
      });
      rows.forEach((words, i) => highlight(box([...centers[i], w, h], words), i * 1.1, 1.25));
    }

    const scenes = [
      m => pipeline(m, [[storage, ['源文件', 'Source Files']],
        [['数据平台', 'AI Data Platform'], ['准备与检索', 'Prepare & Retrieve']],
        [['AI 应用', 'AI Application'], ['检索上下文', 'Retrieved Context']]]),
      m => {
        const roles = [
          [storage, ['保存源数据', 'Stores Source Data']],
          [['Spectrum-X', 'Spectrum-X'], ['传输数据', 'Carries Traffic']],
          [['BlueField DPU', 'BlueField DPU'], ['加速存储访问', 'Accelerates Access']],
          [['GPU', 'GPU'], ['数据准备与检索', 'Prepares & Retrieves']],
        ];
        const centers = m ? [[90,127],[270,127],[90,243],[270,243]]
          : [[230,105],[550,105],[230,211],[550,211]];
        roles.forEach((role, i) => box([...centers[i], m ? 156 : 250, m ? 76 : 74], role));
      },
      m => pipeline(m, [[['原始文件', 'Source Files']], [['内容提取', 'Extraction']],
        [['向量嵌入', 'Embeddings']], [index]]),
      m => {
        const [q, i, r, g] = m ? [[90, 108], [270, 108], [180, 216], [180, 310]]
          : [[139, 104], [139, 210], [389, 157], [639, 157]];
        const join = ([x, y], start) => route(m
          ? [[x, y + 27], [x, 167], [180, 167], [180, 189]]
          : [[x + 78, y], [275, y], [275, 157], [302, 157]], start);
        join(q, .25);
        join(i, 1.15);
        route(m ? [[180, 243], [180, 283]] : [[476, 157], [561, 157]], 2.35);
        box([...q, 156, 54], [['问题', 'Question']]);
        box([...i, 156, 54], [index]);
        highlight(box([...r, m ? 156 : 174, 54], [['检索与重排', 'Retrieve & Rerank']]), 1.35, 1.9);
        highlight(box([...g, 156, 54], [model]), 3.15);
      },
      m => {
        const [a, b, c, d] = m ? [[180, 87], [180, 184], [90, 313], [270, 313]]
          : [[122, 149], [363, 149], [648, 96], [648, 207]];
        route(m ? [[180, 113], [180, 157]] : [[199, 149], [279, 149]], .25, .65, '', true);
        [c, d].forEach(([x, y], i) => {
          const side = i ? 1 : -1;
          const start = 1.34 + i * 1.85;
          const query = m
            ? [[x + side * 18, y - 26], [x + side * 18, 237], [180 + side * 67, 237], [180 + side * 67, 211]]
            : [[570, y - 11], [522 + side * 33, y - 11], [522 + side * 33, 149 + side * 17 - 8], [447, 149 + side * 17 - 8]];
          const result = m
            ? [[180 + side * 37, 211], [180 + side * 37, 259], [x - side * 18, 259], [x - side * 18, y - 26]]
            : [[447, 149 + side * 17 + 8], [522 + side * 13, 149 + side * 17 + 8], [522 + side * 13, y + 11], [570, y + 11]];
          route(query, start, .72, '', true);
          route(result, start + .81, .72, 'external', true);
        });
        box([...a, 154, 52], [['新增内容', 'New Content'], ['数据摄取', 'Ingestion']]);
        highlight(box([...b, 168, 54], [index]), .91, 3.8);
        highlight(box([...c, 156, 52], [['问答应用', 'Q&A App']]), 2.9);
        highlight(box([...d, 156, 52], [['研究智能体', 'Research Agent']]), 4.72);
        text(m ? 180 : 498, m ? 350 : 264, ['查询 → 索引 · 结果 → 应用', 'Query → Index · Results → App'], 'secondary');
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
