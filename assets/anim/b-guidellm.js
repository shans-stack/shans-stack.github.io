(function () {
  'use strict';

  const id = 'b-guidellm';
  const scenes = [
    ({ flow }) => flow(
      [['请求与负载配置', 'Requests and profile'], ['推理端点', 'Inference endpoint'], ['结果记录', 'Recorded metrics']],
      { end: ['一份配置可包含多次子测试', 'One profile can run several strategies'] }
    ),
    ({ phases }) => phases(
      [['预热', 'Warmup'], ['有效测量', 'Active|measurement'], ['收尾', 'Cooldown']],
      ['窗口决定指标纳入的事件', 'The window determines which events count']
    ),
    ({ timelines }) => timelines([
      [['固定并发 A', 'Concurrent A'], [[0.05, 0.28], [0.28, 0.48], [0.48, 0.83]]],
      [['固定并发 B', 'Concurrent B'], [[0.05, 0.38], [0.38, 0.67], [0.67, 0.91]]],
      [['等间隔到达', 'Constant'], [[0.06, 0.06], [0.26, 0.26], [0.46, 0.46], [0.66, 0.66], [0.86, 0.86]]],
      [['随机间隔到达', 'Poisson'], [[0.06, 0.06], [0.18, 0.18], [0.29, 0.29], [0.65, 0.65], [0.86, 0.86]]]
    ], ['同一负载采用不同发起节奏', 'The same workload can use different pacing']),
    ({ timelines }) => timelines([
      [['Sweep', 'Sweep'], [[0.06, 0.06, 'pass', 0.04], [0.92, 0.92, 'pass', 0.2], [0.29, 0.29, 'active', 0.43], [0.5, 0.5, 'active', 0.57], [0.71, 0.71, 'active', 0.71]]]
    ], ['先测边界，再选中间速率', 'Test bounds, then intermediate rates'],
    [[0.06, ['串行边界', 'Serial bound'], 'start'], [0.92, ['吞吐边界', 'Throughput bound'], 'end']]),
    ({ graph }) => graph({
      axes: [['实际请求速率', 'Achieved request rate'], ['首 Token 尾时延', 'Tail time to first token']],
      points: [[0.1, 0.12], [0.33, 0.18], [0.54, 0.31, 'pass'], [0.73, 0.61, 'warn'], [0.87, 0.83, 'warn']],
      guides: [{ axis: 'y', value: 0.49, label: ['时延目标', 'Latency target'], align: 'start' }],
      marks: [{ point: 2, label: ['最后一个达标点', 'Last passing point'], dx: -11, dy: -19, anchor: 'end' }],
      curve: true
    }),
    ({ flow }) => flow(
      [['负载点', 'Load point'], ['配置与窗口', 'Settings and window'], ['JSON / CSV', 'JSON / CSV']],
      { count: 1, end: ['复核每档的实际负载和指标', 'Check achieved load and metrics per run'] }
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
    const diagram = { flow, timelines, phases, graph };

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
