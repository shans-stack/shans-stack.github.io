(function () {
  'use strict';

  const id = 'b-aiperf';
  const scenes = [
    ({ flow }) => flow(
      [['AIPerf 客户端', 'AIPerf client'], ['推理端点', 'Inference endpoint']],
      { reverse: true, end: ['记录请求与流式响应', 'Record requests and streamed responses'] }
    ),
    ({ rows }) => rows([
      [['模型与端点', 'Model and endpoint'], ['请求目标', 'Target']],
      [['输入和输出长度', 'Input and output lengths'], ['负载形状', 'Load shape']],
      [['分词器', 'Tokenizer'], ['Token 口径', 'Token counts']]
    ]),
    ({ timelines }) => timelines([
      [['计划发送', 'Scheduled'], [[0.08, 0.08], [0.23, 0.23], [0.36, 0.36], [0.52, 0.52]]],
      [['实际发出', 'Dispatched'], [[0.08, 0.08], [0.23, 0.23], [0.36, 0.52, 'warn'], [0.52, 0.75, 'warn']]],
      [['请求完成', 'Completed'], [[0.52, 0.52, 'pass'], [0.75, 0.75, 'pass'], [0.87, 0.87, 'pass'], [0.96, 0.96, 'pass']]]
    ], ['在途上限推迟部分发送', 'The in-flight cap delays some sends']),
    ({ timelines }) => timelines([
      [['首 Token 时延', 'TTFT'], [[0.08, 0.36]]],
      [['Token 间时延', 'ITL'], [[0.36, 0.48, 'pass'], [0.48, 0.65, 'pass'], [0.65, 0.81, 'pass']]],
      [['端到端时延', 'End-to-end'], [[0.08, 0.88]]]
    ], ['从发出请求起计时', 'Timing starts at dispatch'],
    [[0.08, ['发出', 'Send'], 'start'], [0.36, ['首 Token', 'First token']], [0.88, ['完成', 'Complete'], 'end']]),
    ({ rows }) => rows([
      [['请求 A', 'Request A'], ['全部达标', 'All targets met'], 'pass'],
      [['请求 B', 'Request B'], ['首 Token 超时', 'TTFT limit breach'], 'warn'],
      [['请求 C', 'Request C'], ['全部达标', 'All targets met'], 'pass'],
      [['达标计数', 'Good requests'], ['A、C', 'A and C'], 'pass']
    ]),
    ({ timelines }) => timelines([
      [['客户端等待', 'Client wait'], [[0.07, 0.37, 'warn']]],
      [['请求到响应', 'Request to reply'], [[0.37, 0.78]]]
    ], ['客户端等待与响应时间分开', 'Separate dispatch wait from response time'],
    [[0.37, ['发出请求', 'Dispatched'], 'end'], [0.78, ['响应完成', 'Complete'], 'end']])
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
    function draw(points, style, phase = 0, duration = 2.7) {
      const stroke = path(points, style);
      const length = stroke.getTotalLength();
      stroke.style.strokeDasharray = length;
      effects.push((t, still) => {
        stroke.style.strokeDashoffset = still ? 0 : length * (1 - clamp((t - phase) / duration));
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
    function timelines(entries, caption, markers = []) {
      const left = mobile ? 26 : 191;
      const right = width - (mobile ? 26 : 59);
      const x = value => left + value * (right - left);
      const dense = entries.length > 3;
      const start = dense ? 58 : (mobile ? 80 : 90);
      const stride = dense ? 52 : (mobile ? 69 : 58);
      entries.forEach(([label, spans], i) => {
        const y = start + i * stride;
        text(mobile ? left : 46, y - (mobile ? 23 : 0), label);
        line(left, y, right, y);
        spans.forEach(([a, b, tone = 'active', at = a]) => {
          const phase = 0.4 + at * 3.6;
          if (a !== b) draw([[x(a), y], [x(b), y]], tone + '-line', phase, (b - a) * 3.6);
          reveal(dot(x(b), y, tone, 5.5), phase + (b - a) * 3.6);
        });
      });
      const bottom = start + (entries.length - 1) * stride;
      markers.forEach(([at, label, anchor = 'middle']) => {
        line(x(at), start - 9, x(at), bottom + 14, 'guide');
        text(x(at), bottom + 36, label, 'muted', anchor);
      });
      text(right, mobile ? 327 : 305, caption, 'muted', 'end');
    }
    const diagram = { flow, rows, timelines };

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
