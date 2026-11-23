(function () {
  'use strict';

  const id = 'b-imax';
  const scenes = [
    ({ flow }) => flow(
      [['配置变更', 'Config update'], ['公开运行', 'Public run'], ['结果图点', 'Dashboard point']],
      { end: ['运行与配置版本关联', 'Each run retains its configuration'] }
    ),
    ({ flow }) => flow(
      [['固定输入长度', 'Fixed input length'], ['加载运行配方', 'Load run recipe'], ['固定输出长度', 'Fixed output length']],
      { end: ['同一配方分档改变并发', 'One recipe across concurrency levels'] }
    ),
    ({ width, mobile, route, text, dot, reveal }) => {
      const x = width / 2;
      if (mobile) {
        route([[x, 60], [x, 100], [84, 100], [84, 183], [x, 183], [x, 237]], { duration: 2.15 });
        route([[x, 100], [276, 100], [276, 183], [x, 183]], { phase: 0.7, duration: 1.15, tone: 'pass' });
        text(x, 35, ['会话前缀', 'Session prefix'], 'label', 'middle');
        text(72, 143, ['主会话', 'Main'], 'muted', 'end');
        text(284, 143, ['子会话', 'Branch'], 'muted');
        text(x, 265, ['主会话继续', 'Main session resumes'], 'label', 'middle');
      } else {
        route([[180, 158], [278, 158], [278, 103], [536, 103], [536, 158], [623, 158]], { duration: 2.15 });
        route([[278, 158], [278, 218], [536, 218], [536, 158]], { phase: 0.6, duration: 1.15, tone: 'pass' });
        text(180, 130, ['会话前缀', 'Session prefix'], 'label', 'middle');
        text(405, 73, ['主会话', 'Main session'], 'muted', 'middle');
        text(405, 245, ['子会话', 'Subagent branch'], 'muted', 'middle');
        text(623, 130, ['主会话继续', 'Main session resumes'], 'label', 'middle');
      }
      const prefix = dot(mobile ? x : 180, mobile ? 60 : 158, 'active');
      reveal(prefix, 0);
      text(x, mobile ? 316 : 290, ['示例：子会话沿用部分前缀', mobile
        ? 'Example: the sub-session|reuses part of the prefix'
        : 'Example: the sub-session reuses part of the prefix'], 'muted', 'middle');
    },
    ({ graph }) => graph({
      axes: [['交互速度（Token/s/用户）', 'Interactivity (tok/s/user)'], ['输出吞吐（Token/s/芯片）', 'Output throughput (tok/s/chip)']],
      points: [[0.83, 0.19], [0.66, 0.45], [0.42, 0.66], [0.26, 0.8]],
      marks: [{ point: 1, label: ['一次并发设置', 'One concurrency setting'], dx: -10, dy: 21, anchor: 'end' }]
    }),
    ({ graph }) => graph({
      axes: [['交互速度（Token/s/用户）', 'Interactivity (tok/s/user)'], ['输出吞吐（Token/s/芯片）', 'Output throughput (tok/s/chip)']],
      curve: 'frontier',
      points: [[0.24, 0.79], [0.46, 0.65], [0.67, 0.44, 'pass'], [0.87, 0.19], [0.32, 0.34, 'warn']],
      guides: [{ axis: 'x', value: 0.6, label: ['交互速度门槛', 'Interactivity target'], align: 'end' }],
      marks: [{ point: 4, label: ['被支配点', 'Dominated'], dx: 10, dy: 14 }]
    }),
    ({ flow }) => flow(
      [['观测点', 'Observed point'], ['工作流记录', 'Workflow run'], ['配方与日志', 'Recipe and logs']],
      { count: 1, end: ['核对模型、精度、流量和版本', 'Match model, precision, traffic, version'] }
    )
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
    function graph({ axes, points, curve = false, guides = [], marks = [] }) {
      const left = mobile ? 35 : 122;
      const right = width - (mobile ? 26 : 71);
      const top = mobile ? 68 : 61;
      const bottom = mobile ? 298 : 272;
      const at = ([a, b]) => [left + a * (right - left), bottom - b * (bottom - top)];
      path([[left, top], [left, bottom], [right, bottom]], 'rule');
      text(left, top - 22, axes[1]);
      text(right, bottom + 29, axes[0], 'muted', 'end');
      guides.forEach(({ axis, value, label, align = 'end' }) => {
        if (axis === 'x') {
          const [x] = at([value, 0]);
          line(x, top, x, bottom, 'guide');
          text(x + (align === 'start' ? 6 : -6), top + 12, label, 'muted', align);
        } else {
          const [, y] = at([0, value]);
          line(left, y, right, y, 'guide');
          text(align === 'start' ? left + 4 : right - 2, y - 13, label, 'muted', align);
        }
      });
      if (curve) {
        const series = curve === 'frontier' ? points.filter(point => point[2] !== 'warn') : points;
        draw(series.map(at), 'active-line', 0.22);
      }
      points.forEach(([a, b, tone = 'active'], i) => {
        const [x, y] = at([a, b]);
        reveal(dot(x, y, tone, 6), 0.45 + i * 0.45);
      });
      marks.forEach(({ point, label, dx = 0, dy = 0, anchor = 'start' }) => {
        const [x, y] = at(points[point]);
        text(x + dx, y + dy, label, 'muted', anchor);
      });
    }
    const diagram = { text, dot, reveal, get width() { return width; }, get mobile() { return mobile; }, route, flow, graph };

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
