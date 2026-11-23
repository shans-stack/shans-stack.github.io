(function () {
  const id = 'b-mlperf';
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
        [['训练读取', 'Training Reads'], ['检查点', 'Checkpointing']],
        [['读取带宽', 'Read Bandwidth'], ['保存与恢复耗时', 'Save and\nRestore']],
        [['KV Cache', 'KV Cache'], ['向量数据库', 'Vector Database']],
        [['缓存操作延迟', 'Cache Latency'], ['查询速率与召回', 'QPS and Recall']]
      ], [[0, 2], [1, 3], [4, 6], [5, 7]]),
      () => flow([
        ['存储中的样本', 'Stored Samples'], ['读取到客户端', 'Client Read'], ['模拟计算等待', 'Timed Compute\nWait'], ['利用率门槛', 'Utilization\nThreshold']
      ], ['加载真实数据，按批次等待', 'Real I/O with Timed Batch Waits']),
      () => flow([
        ['训练状态', 'Training State'], ['存储检查点', 'Stored Checkpoint'], ['恢复状态', 'Restored State']
      ], ['保存与恢复分别计时', 'Save and Restore Timed Separately']),
      () => flow([
        ['会话缓存', 'Session Cache'], ['缓存卸载', 'Cache Offload'], ['后续重新载入', 'Reload on Reuse']
      ], ['计量缓存读写路径', 'Measured Cache Read and Write Path']),
      () => graph([
        [['向量数据', 'Vector Data']],
        [['构建索引', 'Build Index']],
        [['相似度查询', 'Similarity Search']],
        [['速率与 p99', 'QPS and p99'], ['召回率', 'Recall']]
      ], [[0, 1], [1, 2], [2, 3], [2, 4]]),
      () => graph([
        [['文件访问', 'File Access'], ['S3 对象访问', 'S3 Object Access']],
        [['负载与接口', 'Workload and\nInterface']],
        [['配置与约束', 'Configuration\nand Constraints']]
      ], [[0, 2], [1, 2], [2, 3]], ['每个对照匹配同一项测试', 'Compare the Same Workload'])
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
