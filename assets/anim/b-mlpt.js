(function () {
  'use strict';

  const id = 'b-mlpt';
  const scenes = [
    ({ graph }) => graph({
      axes: [['墙钟时间', 'Elapsed time'], ['评估质量', 'Evaluation quality']],
      points: [[0.05, 0.1], [0.18, 0.22], [0.32, 0.4], [0.52, 0.52], [0.71, 0.61], [0.79, 0.71, 'pass']],
      guides: [{ axis: 'y', value: 0.71, label: ['目标质量', 'Quality target'], align: 'start' },
        { axis: 'x', value: 0.79, label: ['停止计时', 'Stop timer'] }],
      curve: true
    }),
    ({ flow }) => flow(
      [['训练数据', 'Training data'], ['更新模型', 'Model updates'], ['评估质量', 'Quality evaluation']],
      { end: ['按规则计入墙钟时间', 'Timed under workload rules'] }
    ),
    ({ rows }) => rows([
      [['数据与预处理', 'Data and preparation'], ['沿用参考', 'Reference']],
      [['模型', 'Model'], ['沿用参考', 'Reference']],
      [['训练方法', 'Training method'], ['规则约束', 'Rule-bound']],
      [['质量目标', 'Quality target'], ['统一判定', 'Same target']]
    ]),
    ({ timelines }) => timelines([
      [['最快一次', 'Fastest run'], [[0, 0.33, 'warn']]],
      [['运行', 'Run'], [[0, 0.42, 'pass']]],
      [['运行', 'Run'], [[0, 0.51, 'pass']]],
      [['运行', 'Run'], [[0, 0.57, 'pass']]],
      [['最慢一次', 'Slowest run'], [[0, 0.73, 'warn']]]
    ], ['绿色点纳入平均', 'Average the green results']),
    ({ rows }) => rows([
      [['基准轮次', 'Benchmark round'], ['相同', 'Matched'], 'pass'],
      [['工作负载与组别', 'Workload and division'], ['相同', 'Matched'], 'pass'],
      [['训练用时', 'Training time'], ['分轮记录', 'Reported']],
      [['节点与加速器数', 'Nodes and accelerators'], ['报告规模', 'Scale']]
    ]),
    ({ width, mobile, text, line, dot, shape, effects, clamp }) => {
      const left = mobile ? 33 : 112;
      const gap = mobile ? 50 : 95;
      const end = left + gap * 5;
      [3, 5].forEach((steps, i) => {
        const y = (mobile ? 112 : 84) + i * 105;
        text(left, y - 35, i === 0 ? ['运行甲', 'Run A'] : ['运行乙', 'Run B']);
        line(left, y, end, y);
        const flags = Array.from({ length: steps }, (_, j) => dot(left + gap * (j + 1), y, j === steps - 1 ? 'pass' : 'active'));
        const counter = dot(left, y, 'active', 7);
        const total = shape('text', {
          x: width - (mobile ? 28 : 124), y: y + 30, 'text-anchor': 'end', class: 'muted'
        });
        effects((t, still) => {
          const progress = still ? steps : Math.min(steps, Math.max(0, (t - 0.4) / 0.66));
          const fade = still ? 1 : clamp(t * 4) * clamp((6 - t) * 4);
          flags.forEach((flag, j) => { flag.style.opacity = (progress >= j + 1 ? 1 : 0.22) * fade; });
          counter.setAttribute('cx', left + gap * progress);
          counter.style.opacity = progress === steps ? 0 : fade;
          total.style.opacity = fade;
          total.textContent = window.SS.lang() === 'en'
            ? `${Math.floor(progress)} steps`
            : `已完成 ${Math.floor(progress)} 步`;
        });
      });
      text(width / 2, mobile ? 305 : 281, ['绿点表示达到相同质量目标', 'Green marks the same quality target'], 'muted', 'middle');
    }
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
    const diagram = { text, line, dot, shape, clamp, get width() { return width; }, get mobile() { return mobile; }, effects: fn => effects.push(fn), flow, rows, timelines, graph };

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
