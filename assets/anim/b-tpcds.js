(function () {
  const id = 'b-tpcds';
  const ns = 'http://www.w3.org/2000/svg';

  function mount(host, { onLayout, paused = false } = {}) {
    const narrow = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(ns, 'svg');
    svg.classList.add(id + '-scene');
    svg.setAttribute('role', 'img');
    host.appendChild(svg);

    let mobile, width, height, updates, labels;
    let current = 0;
    let frame = 0;
    let elapsed = 0;
    let last = 0;
    const duration = 3600;

    function draw(tag, attributes) {
      const element = document.createElementNS(ns, tag);
      for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
      svg.appendChild(element);
      return element;
    }

    function label(x, y, pair, style = 'label') {
      const value = pair[window.SS_LANG === 'en' ? 1 : 0];
      labels.push(value.replaceAll('\n', ' '));
      const lines = value.split('\n');
      const elements = lines.map((line, index) => {
        const text = draw('text', { x, y: y + (index - (lines.length - 1) / 2) * 29, class: id + '-' + style });
        text.textContent = line;
        return text;
      });
      return elements[0];
    }

    function route(points, delay) {
      const path = draw('path', {
        d: 'M' + points.map(p => p.join(' ')).join(' L'),
        class: id + '-line'
      });
      const length = path.getTotalLength();
      const token = draw('rect', { width: 12, height: 8, rx: 2, class: id + '-token' });
      updates.push(t => {
        const progress = Math.max(0, Math.min(1, (t - delay) / 0.72));
        const point = path.getPointAtLength(length * progress);
        token.setAttribute('x', point.x - 6);
        token.setAttribute('y', point.y - 4);
        token.setAttribute('opacity', Math.max(0, Math.min(1, (t - delay) * 10, (delay + 0.95 - t) * 8)));
      });
      return path;
    }

    function graph(layers, edges, note) {
      const nodes = [];
      const count = layers.length;
      layers.forEach((layer, i) => layer.forEach((pair, j) => {
        nodes.push({
          pair, layer: i,
          x: mobile ? width / 2 + (j - (layer.length - 1) / 2) * 172 : width / 2 + (i - (count - 1) / 2) * (count === 4 ? 187 : 252),
          y: mobile ? 44 + (count === 1 ? 98 : i * 265 / (count - 1)) : 145 + (j - (layer.length - 1) / 2) * 100,
          w: mobile ? (layer.length === 1 ? 258 : 156) : (count === 4 ? 163 : 208),
          h: 65
        });
      }));
      edges.forEach(([from, to, style]) => {
        const a = nodes[from], b = nodes[to];
        const start = mobile ? [a.x, a.y + a.h / 2] : [a.x + a.w / 2, a.y];
        const end = mobile ? [b.x, b.y - b.h / 2] : [b.x - b.w / 2, b.y];
        const mid = mobile ? (start[1] + end[1]) / 2 : (start[0] + end[0]) / 2;
        const points = mobile
          ? [start, [start[0], mid], [end[0], mid], end]
          : [start, [mid, start[1]], [mid, end[1]], end];
        const path = route(points, 0.18 + a.layer * 0.92);
        if (style) path.classList.add(id + '-' + style);
        draw('path', { d: mobile
          ? `M${end[0] - 5} ${end[1] - 8}L${end[0]} ${end[1]}L${end[0] + 5} ${end[1] - 8}`
          : `M${end[0] - 8} ${end[1] - 5}L${end[0]} ${end[1]}L${end[0] - 8} ${end[1] + 5}`,
          class: id + '-line' });
      });
      nodes.forEach(({ pair, x, y, w, h, layer }) => {
        const rect = draw('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 5, class: id + '-box' });
        if (pair[2]) rect.classList.add(id + '-' + pair[2]);
        label(x, y, pair);
        if (layer && edges.length) {
          const arrival = layer * 0.92 - 0.08;
          updates.push(t => rect.setAttribute('opacity', Math.max(0.5, Math.min(1, 0.5 + (t - arrival) * 3))));
        }
      });
      if (note) label(width / 2, mobile ? 366 : 270, note, 'note');
    }

    function flow(items, note) {
      graph(items.map(item => [item]), items.slice(1).map((_, i) => [i, i + 1]), note);
    }

    const scenes = [
      () => graph([
        [['门店与网页', 'Store and Web'], ['目录销售', 'Catalog Sales']],
        [['零售数据表', 'Retail Tables']],
        [['分析 SQL', 'Analytical SQL']]
      ], [[0, 2], [1, 2], [2, 3]]),
      () => graph([
        [['比例因子', 'Scale Factor'], ['查询模板', 'Query Templates']],
        [['dsdgen', 'dsdgen'], ['dsqgen', 'dsqgen']],
        [['基础与刷新数据', 'Base and\nRefresh Data'], ['各查询流 SQL', 'SQL Streams']]
      ], [[0, 2], [1, 3], [2, 4], [3, 5]]),
      () => graph([
        [['Power', 'Power'], ['Throughput', 'Throughput']],
        [['一个查询流', 'One Stream'], ['多个查询流', 'Multiple Streams']],
        [['数据库', 'Database'], ['数据库', 'Database']]
      ], [[0, 2], [1, 3], [2, 4], [3, 5]], ['同一数据库，两个计时阶段', 'One Database, Separate Timings']),
      () => flow([
        ['并发查询 1', 'Throughput 1'], ['数据维护 1', 'Maintenance 1'],
        ['并发查询 2', 'Throughput 2'], ['数据维护 2', 'Maintenance 2']
      ]),
      () => graph([
        [['加载与单流', 'Load and Power'], ['并发与维护', 'Throughput and\nMaintenance']],
        [['阶段耗时', 'Phase Timings'], ['比例因子', 'Scale Factor']],
        [['QphDS@SF', 'QphDS@SF']]
      ], [[0, 2], [1, 2], [2, 4], [3, 4]]),
      () => graph([
        [['TPC-DS', 'TPC-DS'], ['TPCx-AI', 'TPCx-AI']],
        [['零售数据', 'Retail Data'], ['加载与预处理', 'Load and\nPreprocess']],
        [['SQL 与维护', 'SQL and\nMaintenance'], ['训练与推理', 'Train and Serve']],
        [['查询性能', 'Query\nPerformance'], ['校验预测质量', 'Validate\nPredictions']]
      ], [[0, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 7]])
    ];

    function ratio() { return width / height; }
    function paint(t) { updates.forEach(update => update(t)); }
    function stop() { cancelAnimationFrame(frame); frame = 0; }

    function tick(now) {
      elapsed = Math.min(duration, elapsed + Math.max(0, now - last));
      last = now;
      paint(elapsed / 1000);
      frame = elapsed < duration ? requestAnimationFrame(tick) : 0;
    }

    function start() {
      if (paused || reduced.matches || frame || elapsed >= duration) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }

    function show(index) {
      stop();
      current = Math.max(0, Math.min(scenes.length - 1, index));
      elapsed = 0;
      updates = [];
      labels = [];
      svg.replaceChildren();
      scenes[current]();
      label(width / 2, height - 18, ['示意，不代表实测数字', 'Schematic · No Measured Values'], 'note');
      svg.setAttribute('aria-label', labels.join(' · '));
      paint(reduced.matches ? duration / 1000 : 0);
      start();
    }

    function redraw() { show(current); }
    function layout() {
      mobile = narrow.matches;
      width = mobile ? 360 : 800;
      height = mobile ? 410 : 312;
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      onLayout?.(ratio(), mobile);
      redraw();
    }

    narrow.addEventListener('change', layout);
    reduced.addEventListener('change', redraw);
    document.addEventListener('ss-lang', redraw);
    layout();

    const controller = {
      show,
      pause() { paused = true; stop(); },
      resume() { paused = false; start(); },
      destroy() {
        stop();
        narrow.removeEventListener('change', layout);
        reduced.removeEventListener('change', redraw);
        document.removeEventListener('ss-lang', redraw);
        svg.remove();
        delete host.__anim;
      },
      ratio,
      step: () => current
    };
    host.__anim = controller;
    return controller;
  }

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = { steps: 6, mount };
}());
