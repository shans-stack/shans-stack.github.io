(function () {
  const id = 'b-mlpe';
  const ns = 'http://www.w3.org/2000/svg';

  function mount(host, opts = {}) {
    const compact = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(ns, 'svg');
    svg.classList.add(id + '-scene');
    svg.setAttribute('role', 'img');
    host.replaceChildren(svg);

    let mobile, W, H, updates, raf, last, elapsed, step = 0, paused = !!opts.paused;
    const T = (zh, en) => window.SS_LANG === 'en' ? en : zh;
    const clamp = value => Math.max(0, Math.min(1, value));
    function el(tag, attrs, tone, parent = svg) {
      const node = document.createElementNS(ns, tag);
      if (tone) node.classList.add(id + '-' + tone);
      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
      parent.append(node);
      return node;
    }
    function label(x, y, text, tone = 'label', anchor = 'middle', parent) {
      const node = el('text', { x, y, 'text-anchor': anchor }, tone, parent);
      node.textContent = text;
      return node;
    }
    function box(x, y, width, text, tone = 'box') {
      el('rect', { x: x - width / 2, y: y - 24, width, height: 48, rx: 5 }, tone);
      return label(x, y, text, 'box-label');
    }
    function path(points, arrow = false, tone = 'line') {
      const node = el('path', { d: 'M' + points.map(p => p.join(' ')).join(' L') }, tone);
      if (arrow) {
        const [x, y] = points.at(-1);
        const [px, py] = points.at(-2);
        const angle = Math.atan2(y - py, x - px) * 180 / Math.PI;
        el('path', { d: 'M-9 -5 L0 0 L-9 5 Z', transform: 'translate(' + x + ' ' + y + ') rotate(' + angle + ')' }, 'arrow');
      }
      return node;
    }
    function pulse(route, start, end, tone = 'signal') {
      const dot = el('rect', { width: 12, height: 9, rx: 2 }, tone);
      const length = route.getTotalLength();
      updates.push(time => {
        const progress = clamp((time - start) / (end - start));
        const point = route.getPointAtLength(length * (0.04 + progress * 0.87));
        dot.setAttribute('x', point.x - 6);
        dot.setAttribute('y', point.y - 4.5);
        dot.style.opacity = Math.min(1, progress * 8, (1 - progress) * 8);
      });
    }
    function reveal(node, start) {
      updates.push(time => { node.style.opacity = 0.28 + 0.72 * clamp((time - start) / 0.35); });
    }

    function endpoint() {
      const client = mobile ? [200, 88] : [160, 190];
      const service = mobile ? [200, 352] : [700, 190];
      const up = mobile ? [[166, 112], [166, 328]] : [[258, 170], [602, 170]];
      const down = mobile ? [[234, 328], [234, 112]] : [[602, 210], [258, 210]];
      box(...client, 196, T('参考客户端', 'Reference Client'));
      box(...service, 196, T('推理端点', 'Inference Endpoint'), 'focus');
      label(mobile ? 151 : 430, mobile ? 216 : 140, T('HTTP 请求', 'HTTP Request'), 'label', mobile ? 'end' : 'middle');
      label(mobile ? 249 : 430, mobile ? 216 : 244, T('返回 Token', 'Response Tokens'), 'label', mobile ? 'start' : 'middle');
      const outbound = path(up, true);
      const inbound = path(down, true);
      pulse(outbound, 0.14, 1.2);
      [1.45, 1.78, 2.1].forEach(start => pulse(inbound, start, start + 1.15, 'reply'));
    }

    function workloads() {
      const x = mobile ? 30 : 122;
      const span = mobile ? 340 : 620;
      const first = mobile ? 110 : 112;
      const multi = mobile ? 280 : 258;
      label(x, first - 52, T('单轮', 'Single Turn'), 'heading', 'start');
      label(x, multi - 52, T('多轮轨迹', 'Multi-Turn Trace'), 'heading', 'start');
      const row = (names, y, context) => {
        const positions = names.map((name, i) => x + span * i / (names.length - 1));
        const lines = positions.slice(1).map((right, i) => path([[positions[i] + 9, y], [right - 9, y]], true));
        positions.forEach((cx, i) => {
          el('circle', { cx, cy: y, r: 6 }, 'signal');
          const anchor = i === 0 ? 'start' : i === positions.length - 1 ? 'end' : 'middle';
          label(cx, y + 29, names[i], 'label', anchor);
          if (context && i > 1 && i < positions.length - 1) {
            const history = el('g', {});
            for (let j = 0; j < i - 1; j++) {
              el('rect', { x: cx - 19 - j * 17, y: y + 58, width: 13, height: 9, rx: 2 }, 'reply', history);
            }
            reveal(history, 0.7 + (i - 1) * 0.8);
          }
        });
        lines.forEach((route, i) => pulse(route, 0.2 + i * 0.82, 0.9 + i * 0.82));
      };
      row([T('请求', 'Request'), T('响应', 'Response')], first, false);
      row([T('开始', 'Start'), T('工具上下文', mobile ? 'Tool' : 'Tool Context'), T('第 2 轮', 'Turn 2'), T('第 3 轮', 'Turn 3'), T('完成', 'Done')], multi, true);
      label(x, multi + (mobile ? 104 : 62), T('累积上下文', 'Accumulated Context'), 'note', 'start');
    }

    function concurrency() {
      const start = mobile ? 28 : 180;
      const end = mobile ? 372 : 680;
      label(start, 47, T('客户端', 'Client'), 'heading', 'start');
      label(end, 47, T('同一端点', 'Same Endpoint'), 'heading', 'end');
      const levels = [T('较低并发', 'Lower Concurrency'), T('升高的并发', 'Increased Concurrency'), T('更高的并发', 'Higher Concurrency')];
      levels.forEach((name, i) => {
        const y = 87 + i * (mobile ? 113 : 86);
        label(start, y, name, 'label', 'start');
        for (let j = 0; j <= i; j++) {
          const trackY = y + 28 + j * 13;
          const route = path([[start, trackY], [end, trackY]], true);
          el('rect', { x: start + (end - start) * (0.24 + j * 0.19), y: trackY - 4.5, width: 12, height: 9, rx: 2 }, 'signal');
          pulse(route, 0.15 + i * 0.92 + j * 0.05, 1.04 + i * 0.92 + j * 0.05);
        }
      });
    }

    function verification() {
      const measure = mobile ? [105, 90] : [150, 108];
      const quality = mobile ? [295, 90] : [150, 252];
      const review = mobile ? [200, 214] : [446, 180];
      const formal = mobile ? [200, 340] : [711, 180];
      const first = mobile ? [[105, 114], [105, 151], [175, 151], [175, 190]] : [[230, 108], [285, 108], [285, 160], [350, 160]];
      const second = mobile ? [[295, 114], [295, 151], [225, 151], [225, 190]] : [[230, 252], [285, 252], [285, 200], [350, 200]];
      const last = mobile ? [[200, 238], [200, 316]] : [[542, 180], [615, 180]];
      const metrics = path(first, true);
      const accuracy = path(second, true);
      const published = path(last, true);
      box(...measure, 160, T('性能记录', 'Performance Log'));
      box(...quality, 160, T('质量验证', 'Quality Check'));
      box(...review, 192, T('配置披露与审阅', 'Disclosure & Review'));
      const verified = box(...formal, 192, T('核验后的结果', 'Verified Result'), 'focus');
      reveal(verified.previousElementSibling, 3.15);
      pulse(metrics, 0.2, 1.45);
      pulse(accuracy, 0.65, 1.9, 'reply');
      pulse(published, 2.4, 3.14);
    }

    function readingResults() {
      const left = mobile ? 38 : 128;
      const right = mobile ? 360 : 582;
      const baseline = mobile ? 302 : 296;
      label(left, 55, T('系统吞吐 · Token/s', 'System Throughput · tokens/s'), 'heading', 'start');
      path([[left, baseline], [left, 82]], true);
      path([[left, baseline], [right, baseline]], true);
      const marks = [[0.18, 0.82], [0.34, 0.74], [0.52, 0.62], [0.68, 0.44], [0.87, 0.22]];
      marks.forEach(([x, y], index) => {
        const cx = left + (right - left) * x;
        const cy = baseline - (baseline - 86) * y;
        reveal(el('circle', { cx, cy, r: 7 }, 'signal'), 0.22 + index * 0.47);
      });
      label(right, baseline + 28, T('单用户交互速度', 'Per-User Interactivity'), 'label', 'end');
      const x = mobile ? left : 630;
      const y = mobile ? 382 : 163;
      label(x, y, 'TTFT P90', 'heading', 'start');
      label(x, y + 29, T('首 Token 时延', 'First-Token Latency'), 'note', 'start');
    }

    function comparison() {
      const left = mobile ? 36 : 133;
      const right = mobile ? 36 : 472;
      const base = mobile ? 220 : 86;
      label(left, mobile ? 56 : 86, T('公开结果档案', 'Public Results Archive'), 'heading', 'start');
      label(left, mobile ? 96 : 145, 'MLPerf Endpoints v1.0', 'label', 'start');
      label(left, mobile ? 128 : 177, '2026-11-19', 'note', 'start');
      label(right, base, T('比较条件', 'Comparison Criteria'), 'heading', 'start');
      const criteria = [
        T('相同版本与模型', 'Same Version and Model'),
        T('相同负载与组别', 'Same Workload and Division'),
        T('审阅状态与配置', 'Review Status and Setup'),
        T('相近交互目标', 'Comparable Interactivity Target')
      ];
      criteria.forEach((name, i) => {
        const y = base + 47 + i * 34;
        const dot = el('rect', { x: right, y: y - 4, width: 8, height: 8, rx: 1 }, 'signal');
        label(right + 22, y, name, 'label', 'start');
        reveal(dot, 0.3 + i * 0.68);
      });
    }

    const scenes = [endpoint, workloads, concurrency, verification, readingResults, comparison];

    function paint(time) {
      updates.forEach(update => update(time));
    }
    function frame(now) {
      elapsed = Math.min(4, elapsed + Math.min(0.05, Math.max(0, (now - last) / 1000)));
      last = now;
      paint(elapsed);
      if (elapsed < 4) raf = requestAnimationFrame(frame);
    }
    function run() {
      if (paused || reduced.matches || elapsed >= 4) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function show(index) {
      cancelAnimationFrame(raf);
      step = Math.max(0, Math.min(scenes.length - 1, index));
      elapsed = reduced.matches ? 4 : 0;
      updates = [];
      svg.replaceChildren();
      svg.dataset.step = step + 1;
      svg.setAttribute('aria-label', window.SS_TOPIC_CFG.steps[step].d[window.SS_LANG === 'en' ? 1 : 0]);
      scenes[step]();
      label(24, H - 25, T('示意，不代表实测数字', 'Schematic · No measured values'), 'note', 'start');
      paint(elapsed);
      run();
    }
    function layout() {
      mobile = compact.matches;
      W = mobile ? 400 : 860;
      H = mobile ? 472 : 392;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      opts.onLayout?.(W / H, mobile);
      show(step);
    }
    const redraw = () => show(step);
    const control = {
      show,
      pause() { paused = true; cancelAnimationFrame(raf); },
      resume() {
        if (!paused) return;
        paused = false;
        run();
      },
      destroy() {
        control.pause();
        compact.removeEventListener('change', layout);
        reduced.removeEventListener('change', redraw);
        document.removeEventListener('ss-lang', redraw);
        svg.remove();
        delete host.__anim;
      },
      ratio: () => W / H,
      step: () => step
    };
    compact.addEventListener('change', layout);
    reduced.addEventListener('change', redraw);
    document.addEventListener('ss-lang', redraw);
    host.__anim = control;
    layout();
    return control;
  }

  (window.SSAnim ||= {})[id] = { steps: 6, mount };
})();
