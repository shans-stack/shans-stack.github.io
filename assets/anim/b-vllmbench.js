(function () {
  'use strict';

  const id = 'b-vllmbench';
  const scenes = [
    ({ rows }) => rows([
      [['throughput', 'throughput'], ['离线请求组', 'Offline workload']],
      [['latency', 'latency'], ['单个批次', 'One batch']],
      [['serve', 'serve'], ['在线端点', 'Online endpoint']]
    ]),
    ({ flow }) => flow(
      [['一组离线输入', 'Offline inputs'], ['本地推理引擎', 'Local engine'], ['计数并汇总', 'Count and summarize']],
      { end: ['在引擎侧测量处理速率', 'Measure processing rate at the engine'] }
    ),
    ({ phases }) => phases(
      [['预热', 'Warmup'], ['重复测量同样的批次', 'Time the|same batch'], ['汇总', 'Summary']],
      ['记录各次批完成用时', 'Record each batch completion time']
    ),
    ({ flow }) => flow(
      [['压测客户端', 'Benchmark client'], ['在线 API', 'Serving API'], ['推理引擎', 'Inference engine']],
      { reverse: true, end: ['观测客户端收到的结果', 'Observe responses at the client'] }
    ),
    ({ rows }) => rows([
      [['首 Token 时延', 'TTFT'], ['达标', 'Pass'], 'pass'],
      [['每输出 Token 时延', 'TPOT'], ['达标', 'Pass'], 'pass'],
      [['端到端时延', 'End-to-end latency'], ['超出门槛', 'Limit breach'], 'warn'],
      [['达标吞吐', 'Goodput'], ['该请求未计入', 'Request excluded'], 'warn']
    ]),
    ({ rows }) => rows([
      [['离线吞吐', 'Offline throughput'], ['本地引擎', 'Local engine']],
      [['在线吞吐', 'Online throughput'], ['端到端路径', 'End-to-end path']],
      [['HTTP 传输', 'HTTP transport'], ['仅在线经过', 'Online path only'], 'warn'],
      [['请求到达与排队', 'Arrivals and queueing'], ['在线负载', 'Online load']]
    ])
  ];

  function mount(host, { onLayout, paused = false } = {}) {
    const narrow = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add(id + '-diagram');
    svg.setAttribute('role', 'img');
    host.append(svg);

    let mobile, width, height, step = 0, elapsed, last, raf, effects;
    const clamp = value => Math.max(0, Math.min(1, value));
    const tr = pair => pair[window.SS.lang() === 'en' ? 1 : 0];
    function shape(tag, attrs) {
      const node = document.createElementNS(svg.namespaceURI, tag);
      Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, key === 'class' ? id + '-' + value : value));
      svg.append(node);
      return node;
    }
    function text(x, y, pair, style = 'label', anchor = 'start') {
      const lines = tr(pair).split('|');
      lines.forEach((line, i) => {
        const offset = (i - (lines.length - 1) / 2) * (mobile ? 19 : 25);
        shape('text', { x, y: y + offset, class: style, 'text-anchor': anchor }).textContent = line;
      });
    }
    function line(x1, y1, x2, y2, style = 'rule') {
      return shape('line', { x1, y1, x2, y2, class: style });
    }
    function path(points, style) {
      const d = points.map(([x, y], i) => (i === 0 ? 'M' : 'L') + x + ',' + y).join(' ');
      return shape('path', { d, class: style });
    }
    function dot(x, y, style = 'active', r = 5) {
      return shape('circle', { cx: x, cy: y, r, class: style });
    }
    function reveal(node, phase) {
      effects.push((t, still) => {
        node.style.opacity = still ? 1 : 0.22 + 0.78 * clamp((t - phase) / 0.25);
      });
    }
    function route(points, { count = 1, phase = 0, duration = 1.7, tone = 'active' } = {}) {
      const track = path(points, 'rule');
      const length = track.getTotalLength();
      for (let i = 0; i < count; i++) {
        const packet = shape('rect', { width: 9, height: 9, rx: 2, class: tone });
        effects.push((t, still) => {
          const progress = (t - phase - i * 0.36) / duration;
          const p = track.getPointAtLength(length * clamp(progress));
          packet.setAttribute('x', p.x - 4.5);
          packet.setAttribute('y', p.y - 4.5);
          packet.style.opacity = still ? 0 : clamp(progress * 10) * clamp((1 - progress) * 10);
        });
      }
    }
    function flow(labels, { count = 2, reverse = false, end = ['测量路径', 'Measurement path'] } = {}) {
      const countNodes = labels.length;
      const boxW = mobile ? 242 : 216;
      const boxH = mobile ? 47 : 68;
      const gap = mobile ? 70 : 242;
      const boxes = labels.map((label, i) => ({
        label, x: mobile ? width / 2 : width / 2 + (i - (countNodes - 1) / 2) * gap,
        y: mobile ? 171 + (i - (countNodes - 1) / 2) * gap : 147
      }));
      const points = [];
      boxes.slice(1).forEach((box, i) => {
        const prev = boxes[i];
        points.push(mobile
          ? [[prev.x, prev.y + boxH / 2], [box.x, box.y - boxH / 2]]
          : [[prev.x + boxW / 2, prev.y], [box.x - boxW / 2, box.y]]);
      });
      points.forEach((segment, i) => {
        route(segment, { count, phase: 0.35 + i * 0.65, duration: 0.46 });
        if (reverse) route(segment.slice().reverse(), { count, phase: 3.2 - i * 0.65, duration: 0.46, tone: 'pass' });
      });
      boxes.forEach(({ x, y, label }) => {
        shape('rect', { x: x - boxW / 2, y: y - boxH / 2, width: boxW, height: boxH, rx: 4, class: 'node' });
        text(x, y, label, 'label', 'middle');
      });
      text(width / 2, mobile ? 325 : 248, end, 'muted', 'middle');
    }
    function rows(entries) {
      const left = mobile ? 22 : 127;
      const right = width - left;
      const top = entries.length === 4 ? 66 : 94;
      entries.forEach(([label, value, tone = 'active'], i) => {
        const y = top + i * 62;
        line(left, y + 25, right, y + 25);
        reveal(dot(left + 5, y, tone, 4.5), 0.55 + i * 0.62);
        text(left + 21, y, label);
        text(right, y, value, 'muted', 'end');
      });
    }
    function phases(labels, detail) {
      const left = mobile ? 22 : 80;
      const total = width - 2 * left;
      const ends = [0, 0.25, 0.75, 1];
      const y = mobile ? 169 : 157;
      labels.forEach((label, i) => {
        const x = left + total * ends[i];
        const span = total * (ends[i + 1] - ends[i]);
        const part = shape('rect', { x, y: y - 13, width: span - 4, height: 26, rx: 3, class: i === 1 ? 'active' : 'quiet' });
        reveal(part, 0.45 + i * 0.9);
        text(x + span / 2 - 2, y - 42, label, 'label', 'middle');
      });
      text(width / 2, y + 67, detail, 'muted', 'middle');
    }
    const diagram = { flow, rows, phases };

    function frame(now) {
      elapsed += Math.max(0, (now - last) / 1000);
      last = now;
      const t = elapsed % 6;
      effects.forEach(effect => effect(t, false));
      raf = requestAnimationFrame(frame);
    }
    function start() {
      cancelAnimationFrame(raf);
      if (paused || reduced.matches) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function show(index) {
      step = Math.max(0, Math.min(scenes.length - 1, index));
      elapsed = 0;
      effects = [];
      svg.replaceChildren();
      svg.dataset.step = step + 1;
      svg.setAttribute('aria-label', tr(window.SS_TOPIC_CFG.steps[step].d));
      scenes[step](diagram);
      text(width / 2, height - 22, ['示意，不代表实测数字', 'Schematic · No measured data'], 'note', 'middle');
      effects.forEach(effect => effect(0, reduced.matches));
      start();
    }
    function ratio() { return width / height; }
    function layout() {
      mobile = narrow.matches;
      width = mobile ? 360 : 800;
      height = mobile ? 390 : 360;
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      onLayout?.(ratio(), mobile);
      show(step);
    }
    function refresh() { show(step); }
    narrow.addEventListener('change', layout);
    reduced.addEventListener('change', refresh);
    document.addEventListener('ss-lang', refresh);
    layout();

    const controller = {
      show,
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
        cancelAnimationFrame(raf);
        narrow.removeEventListener('change', layout);
        reduced.removeEventListener('change', refresh);
        document.removeEventListener('ss-lang', refresh);
        svg.remove();
        delete host.__anim;
      },
      ratio,
      step: () => step
    };
    host.__anim = controller;
    return controller;
  }

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = { steps: 6, mount };
}());
