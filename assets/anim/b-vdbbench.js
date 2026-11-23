(function () {
  const id = 'b-vdbbench';
  const ns = 'http://www.w3.org/2000/svg';

  function mount(host, { onLayout } = {}) {
    const narrow = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(ns, 'svg');
    svg.classList.add(id + '-scene');
    svg.setAttribute('role', 'img');
    host.appendChild(svg);

    let mobile, width, height, updates, labels;
    let current = 0, paused = false, frame = 0, last = 0, elapsed = 0;

    function draw(tag, attributes) {
      const element = document.createElementNS(ns, tag);
      for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
      svg.appendChild(element);
      return element;
    }

    function label(x, y, pair, style = 'label', anchor = 'middle') {
      const value = pair[window.SS_LANG === 'en' ? 1 : 0];
      labels.push(value);
      const element = draw('text', { x, y, class: id + '-' + style, 'text-anchor': anchor });
      element.textContent = value;
      return element;
    }

    function box(x, y, w, h, pair, style = 'box') {
      const rect = draw('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 4, class: id + '-' + style });
      if (pair) label(x, y, pair, 'box-label');
      return rect;
    }

    function route(points, delay = 0, style = 'line', move = true) {
      const path = draw('path', { d: 'M' + points.map(p => p.join(' ')).join('L'), class: id + '-' + style });
      if (!move) return path;
      const length = path.getTotalLength();
      const token = draw('rect', { width: 13, height: 9, rx: 2, class: id + '-token' });
      updates.push(t => {
        const u = Math.min(1, Math.max(0, (t - delay) / 0.95));
        const point = path.getPointAtLength(length * u);
        token.setAttribute('x', point.x - 6.5);
        token.setAttribute('y', point.y - 4.5);
        token.setAttribute('opacity', t < delay ? 0 : Math.min(1, 0.3 + u * 4));
      });
      return path;
    }

    function reveal(element, time) {
      const initial = element.localName === 'text' ? 0.8 : 0.42;
      updates.push(t => element.setAttribute('opacity', t < time ? initial : 1));
    }

    function flow(items, options = {}) {
      const { y = mobile ? 70 : 148, gap = mobile ? 83 : 239, w = mobile ? 242 : 184 } = options;
      const h = 50;
      const points = items.map((_, i) => mobile
        ? [width / 2, y + i * gap]
        : [width / 2 + (i - (items.length - 1) / 2) * gap, y]);
      points.slice(1).forEach(([x, row], i) => {
        const [px, py] = points[i];
        route(mobile ? [[px, py + h / 2], [x, row - h / 2]] : [[px + w / 2, py], [x - w / 2, row]], i * 0.93);
      });
      points.forEach(([x, row], i) => reveal(box(x, row, w, h, items[i]), i === 0 ? 0 : (i - 1) * 0.93 + 0.75));
    }

    const scenes = [
      () => {
        flow([['查询向量', 'Query Vector'], ['向量索引', 'Vector Index'], ['Top-K 结果', 'Top-K Results']],
          { y: mobile ? 51 : 135, gap: mobile ? 72 : 237 });
        box(width / 2, mobile ? 285 : 252, 239, 46, ['参考近邻 · 校验用', 'Reference Neighbors'], 'quiet');
      },
      () => {
        flow([['装载数据', 'Load Data'], ['构建索引', 'Build Index'], ['开始查询', 'Run Searches']]);
        label(width / 2, mobile ? 297 : 257, ['数据集 · Top-K · 过滤条件', 'Dataset · Top-K · Filter'], 'muted');
      },
      () => {
        const cx = width / 2;
        const first = mobile ? 91 : 104, second = mobile ? 195 : 210;
        const letters = ['A', 'B', 'C', 'D'];
        const col = i => cx + (i - 1) * (mobile ? 75 : 112);
        label(cx, first - 49, ['参考近邻', 'Reference Neighbors']);
        label(cx, second + 53, ['返回结果', 'Returned Results']);
        [0, 1, 2].forEach(i => {
          const x = col(i);
          if (i < 2) route([[x, first + 20], [x, second - 20]], i * 0.58);
          box(x, first, 53, 40, [letters[i], letters[i]], i < 2 ? 'accent' : 'quiet');
          const returned = i < 2 ? letters[i] : letters[3];
          box(x, second, 53, 40, [returned, returned], i < 2 ? 'accent' : 'quiet');
        });
        label(cx, mobile ? 313 : 289, ['匹配数 ÷ K', 'Matches ÷ K'], 'muted');
      },
      () => {
        const x = mobile ? [85, 220, 300] : [239, 470, 638];
        [['并发档位', 'Concurrency'], ['QPS', 'QPS'], ['p99', 'p99']].forEach((p, i) => label(x[i], 49, p));
        [0, 1, 2].forEach(i => {
          const y = 103 + i * 70, n = ['A', 'B', 'C'][i];
          label(x[0], y, [n, n]);
          route([[x[0] + 27, y], [x[1] - 23, y]], i * 0.83);
          route([[x[1] + 23, y], [x[2] - 23, y]], i * 0.83, 'line', false);
          [x[1], x[2]].forEach(cx => reveal(box(cx, y, 46, 29, ['●', '●'], 'accent'), i * 0.83 + 0.78));
        });
        label(width / 2, mobile ? 313 : 292, ['取已测档位中的最高 QPS', 'Peak QPS Among Tested Levels'], 'muted');
      },
      () => {
        flow([['对齐召回要求', 'Match Recall'], ['核对查询条件', 'Match Search Setup'], ['比较吞吐与延迟', 'Read QPS and Latency']],
          { w: mobile ? 280 : 221, gap: mobile ? 83 : 252 });
        label(width / 2, mobile ? 297 : 256, ['Top-K · 过滤 · 返回内容 · 资源', 'Top-K · Filter · Payload · Resources'], 'muted');
      }
    ];

    function ratio() { return width / height; }
    function paint(t) { updates.forEach(update => update(t)); }
    function stop() { cancelAnimationFrame(frame); frame = 0; }
    function tick(now) {
      const delta = Math.max(0, now - last);
      last = now;
      elapsed = Math.min(5100, elapsed + delta);
      paint(elapsed / 1000);
      frame = elapsed < 5100 ? requestAnimationFrame(tick) : 0;
    }
    function start() {
      if (paused || reduced.matches || frame || elapsed >= 5100) return;
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
      label(width / 2, height - 21, ['示意，不代表实测数字', 'Schematic · No Measured Values'], 'note');
      svg.setAttribute('aria-label', labels.join(' · '));
      paint(reduced.matches ? 5.1 : 0);
      start();
    }
    function redraw() { show(current); }
    function layout() {
      mobile = narrow.matches;
      width = mobile ? 360 : 800;
      height = mobile ? 390 : 345;
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
  window.SSAnim[id] = { steps: 5, mount };
}());
