(function () {
  const id = 'n-cuvs';
  const ns = 'http://www.w3.org/2000/svg';
  const tr = label => label.split('|')[window.SS_LANG === 'en' && label.includes('|') ? 1 : 0];

  function svgElement(parent, tag, attrs, text = '') {
    const item = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) item.setAttribute(key, value);
    if (text) item.textContent = text;
    parent.append(item);
    return item;
  }

  function mount(host, { paused = false, onLayout } = {}) {
    const narrow = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = svgElement(host, 'svg', { class: id + '-scene', role: 'img' });
    let step = 0, raf = 0, elapsed = 0, last = 0, width, height, motion;

    function paint(time) {
      for (const { path, token, length, target, start, duration } of motion) {
        const progress = (time - start) / duration;
        const position = path.getPointAtLength(length * Math.min(1, Math.max(0, progress)));
        token.setAttribute('transform', 'translate(' + position.x + ' ' + position.y + ')');
        token.style.opacity = Math.max(0, Math.min(1, progress * 12, (1.14 - progress) * 12));
        if (target && progress >= 1) target.classList.add(id + '-ready');
      }
    }

    function tick(now) {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      elapsed += dt;
      const cycle = 4.9;
      if (elapsed >= cycle) {
        elapsed %= cycle;
        svg.querySelectorAll('.' + id + '-ready').forEach(el => el.classList.remove(id + '-ready'));
      }
      paint(elapsed);
      raf = requestAnimationFrame(tick);
    }

    function run() {
      if (paused || reduced.matches || raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }

    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    }

    function rebuild() {
      stop();
      const mobile = narrow.matches;
      width = mobile ? 360 : 900;
      height = mobile ? 440 : 328;
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      svg.setAttribute('aria-label', tr(scenes[step].caption));
      svg.dataset.step = step + 1;
      svg.replaceChildren();
      motion = [];
      const wiring = svgElement(svg, 'g', {});
      const cards = svgElement(svg, 'g', {});
      const pulses = svgElement(svg, 'g', { 'aria-hidden': 'true' });
      const boxes = Object.create(null);
      const add = (group, tag, attrs, text) => svgElement(group, tag, attrs, text);
      const label = (group, x, y, text, kind = 'label', anchor = 'middle') =>
        add(group, 'text', { x, y, class: id + '-' + kind, 'text-anchor': anchor, 'dominant-baseline': 'central' }, tr(text));

      function box(key, points, title, options = {}) {
        const [x, y] = mobile ? points.slice(2) : points;
        const w = (mobile ? options.mobileWidth : options.width) || (mobile ? 154 : 176);
        const h = options.height || 62;
        const left = x - w / 2, top = y - h / 2;
        const group = add(cards, 'g', { class: id + '-node', 'data-node': key });
        if (options.tone) group.classList.add(id + '-' + options.tone);
        add(group, 'rect', { x: left, y: top, width: w, height: h, rx: 7, class: id + '-card' });
        let titleY = options.note ? y - 11 : y;
        if (options.art) titleY = top + 20;
        label(group, x, titleY, title);
        if (options.note) label(group, x, y + 12, options.note, 'detail');
        if (options.art) options.art({ group, x, y, top, left, w, h, add, label });
        boxes[key] = { x, y, w, h, group };
      }

      function connect(from, to, options = {}) {
        const a = boxes[from], b = boxes[to];
        const style = options.style || 'data';
        const direction = mobile ? options.mobile : options.desktop;
        const horizontal = direction ? direction === 'h' : a.y === b.y;
        const sign = Math.sign(horizontal ? b.x - a.x : b.y - a.y);
        const offset = options.offset || 0;
        const [x1, y1, x2, y2] = horizontal
          ? [a.x + sign * a.w / 2, a.y + offset, b.x - sign * b.w / 2, b.y + offset]
          : [a.x + offset, a.y + sign * a.h / 2, b.x + offset, b.y - sign * b.h / 2];
        const mid = horizontal ? (x1 + x2) / 2 : (y1 + y2) / 2;
        const d = horizontal ? 'M' + x1 + ',' + y1 + 'H' + mid + 'V' + y2 + 'H' + x2
          : 'M' + x1 + ',' + y1 + 'V' + mid + 'H' + x2 + 'V' + y2;
        const path = add(wiring, 'path', { d, class: id + '-line ' + id + '-' + style });
        const dx = horizontal ? sign : 0, dy = horizontal ? 0 : sign;
        const tip = (back, side) => (x2 - back * dx - side * dy) + ',' + (y2 - back * dy + side * dx);
        add(wiring, 'polyline', {
          points: [tip(7, -4), tip(0, 0), tip(7, 4)].join(' '),
          class: id + '-arrow ' + id + '-' + style
        });
        if (options.start !== undefined) {
          travel(path, style, options.start, options.duration, b.group);
        }
      }

      function travel(path, style, start, duration = 0.74, target) {
        const signal = style === 'control';
        const token = add(pulses, signal ? 'circle' : 'rect', {
          ...(signal ? { r: 4.5 } : { x: -7, y: -4.5, width: 14, height: 9, rx: 2 }),
          class: id + '-token ' + id + '-' + style
        });
        motion.push({ path, token, length: path.getTotalLength(), target, start, duration });
      }

      scenes[step].draw({ box, connect, mobile, cards, add, label, travel });
      label(svg, width / 2, height - 19, '示意，不代表实测数字|Schematic, not measured', 'detail');
      if (onLayout) onLayout(width / height, mobile);
      elapsed = 0;
      paint(reduced.matches ? 4.5 : 0);
      run();
    }

    const media = [narrow, reduced];
    for (const query of media) query.addEventListener('change', rebuild);
    document.addEventListener('ss-lang', rebuild);
    const control = {
      show(i) {
        step = Math.max(0, Math.min(scenes.length - 1, i));
        rebuild();
      },
      pause() { paused = true; stop(); },
      resume() { paused = false; run(); },
      destroy() {
        stop();
        for (const query of media) query.removeEventListener('change', rebuild);
        document.removeEventListener('ss-lang', rebuild);
        svg.remove();
        delete host.__anim;
      },
      ratio() { return width / height; },
      step() { return step; }
    };
    host.__anim = control;
    rebuild();
    return control;
  }

  function vectorTiles({ group, x, top, add }) {
    for (let i = 0; i < 5; i++) {
      add(group, 'rect', {
        x: x - 54 + i * 23, y: top + 41, width: 16, height: 24, rx: 3,
        class: 'n-cuvs-vector'
      });
    }
  }

  function neighborGraph({ group, x, top, add }, initial, travel) {
    const points = [[-49, 66], [-21, 95], [6, 55], [23, 101], [51, 69]]
      .map(([dx, dy]) => [x + dx, top + dy]);
    const links = [[0, 1], [1, 2], [2, 4], [4, 3], [3, 0]];
    const extraLinks = [[0, 2], [1, 4], [2, 3]];
    if (initial) links.push(...extraLinks);
    links.forEach(([a, b]) => {
      const [ax, ay] = points[a], [bx, by] = points[b];
      const length = Math.hypot(bx - ax, by - ay);
      const ux = (bx - ax) / length, uy = (by - ay) / length;
      const tx = bx - ux * 7, ty = by - uy * 7;
      const backX = tx - ux * 6, backY = ty - uy * 6;
      add(group, 'path', {
        d: `M${ax},${ay} L${tx},${ty} M${backX - uy * 3},${backY + ux * 3} L${tx},${ty} L${backX + uy * 3},${backY - ux * 3}`,
        class: extraLinks.some(link => link[0] === a && link[1] === b) ? 'n-cuvs-pruned' : 'n-cuvs-graph-edge'
      });
    });
    if (travel) {
      const trace = add(group, 'path', {
        d: [0, 1, 2, 4].map((vertex, i) => (i ? 'L' : 'M') + points[vertex].join(',')).join(''),
        class: 'n-cuvs-trace'
      });
      travel(trace, 'data', 1.2, 1.25);
    }
    points.forEach(([cx, cy], i) => {
      add(group, 'circle', { cx, cy, r: 6, class: travel && i !== 3 ? 'n-cuvs-visited' : 'n-cuvs-vertex' });
    });
  }

  function resultTiles({ group, x, top, add }, hits) {
    for (let i = 0; i < 3; i++) {
      add(group, 'rect', {
        x: x - 41 + i * 30, y: top + 37, width: 22, height: 20, rx: 3,
        class: hits[i] ? 'n-cuvs-visited' : 'n-cuvs-pruned'
      });
    }
  }

  const scenes = [
    {
      caption: '查询向量和数据集按同一度量评分，返回前 k 个最近邻|The query and dataset use one metric to return the top k neighbors',
      draw({ box, connect }) {
        box('query', [160, 85, 92, 78], '查询向量|Query Vector');
        box('dataset', [160, 227, 268, 78], '数据向量|Dataset Vectors', { height: 86, art: vectorTiles });
        box('score', [450, 152, 180, 205], 'cuVS', { note: '计算距离|Score Distance', tone: 'active' });
        box('result', [740, 152, 180, 323], '前 k 个近邻|Top-k Neighbors', { note: '向量 ID|Vector IDs' });
        connect('query', 'score', { desktop: 'h', start: 0.35, offset: -9 });
        connect('dataset', 'score', { desktop: 'h', start: 0.35, offset: 9 });
        connect('score', 'result', { start: 1.25 });
      }
    },
    {
      caption: '暴力搜索检查所有向量，保留精确近邻|Brute-force search checks every vector and retains the exact neighbors',
      draw({ box, connect, travel }) {
        box('query', [143, 148, 180, 60], '查询向量|Query Vector');
        box('scan', [450, 148, 180, 187], 'cuVS', {
          width: 238, mobileWidth: 212, height: 107, tone: 'active',
          art(art) {
            vectorTiles(art);
            const { group, x, top, add } = art;
            const path = add(group, 'path', {
              d: 'M' + (x - 54) + ',' + (top + 76) + 'h108',
              class: 'n-cuvs-graph-edge'
            });
            travel(path, 'data', 1.18, 1.1);
          }
        });
        box('result', [757, 148, 180, 326], '精确近邻|Exact Neighbors', { note: '全量扫描|Full Scan' });
        connect('query', 'scan', { start: 0.35 });
        connect('scan', 'result', { start: 2.36 });
      }
    },
    {
      caption: 'CAGRA 保留节点，筛减初始近邻图的冗余边|CAGRA keeps the vertices and prunes redundant links from the initial graph',
      draw({ box, connect, cards, label, mobile }) {
        box('initial', [215, 154, 180, 103], '候选近邻图|Candidate Graph', { height: 123, width: 206, mobileWidth: 199, art: art => neighborGraph(art, true) });
        box('final', [685, 154, 180, 286], 'CAGRA', { height: 123, width: 206, mobileWidth: 199, art: neighborGraph, tone: 'active' });
        connect('initial', 'final', { style: 'control', start: 0.5, duration: 1.25 });
        label(cards, mobile ? 180 : 685, mobile ? 370 : 245, '各节点出度相同|Same Out-Degree at Each Node', 'detail');
      }
    },
    {
      caption: '查询沿 CAGRA 连边访问候选，部分节点未访问|The query follows CAGRA links to candidates, leaving some vertices unvisited',
      draw({ box, connect, travel }) {
        box('query', [143, 149, 180, 58], '查询向量|Query Vector');
        box('graph', [450, 149, 180, 200], 'CAGRA', { height: 123, width: 206, mobileWidth: 199, art: art => neighborGraph(art, false, travel) });
        box('result', [757, 149, 180, 342], '前 k 个候选|Top-k Candidates', { note: '从已访问节点选出|From Visited Nodes' });
        connect('query', 'graph', { start: 0.35 });
        connect('graph', 'result', { start: 2.55 });
      }
    },
    {
      caption: '将两种候选池的近邻结果与精确结果对照|Two candidate pools are evaluated against the exact neighbors',
      draw({ box, connect, cards, label, mobile }) {
        box('query', [450, 58, 180, 64], '同一查询与索引|Same Query and Index', { width: 232, mobileWidth: 231 });
        box('small', [215, 153, 88, 189], '较小候选池|Smaller Pool', { height: 81, art: art => resultTiles(art, [true, false, true]) });
        box('large', [685, 153, 272, 189], '较大候选池|Larger Pool', { height: 81, art: art => resultTiles(art, [true, true, true]) });
        connect('query', 'small', { start: 0.35, offset: -26 });
        connect('query', 'large', { start: 0.35, offset: 26 });
        box('exact', [450, 242, 180, 319], '精确近邻参照|Exact Reference', { height: 81, art: art => resultTiles(art, [true, true, true]) });
        label(cards, mobile ? 180 : 450, mobile ? 385 : 289, '填实：命中　虚框：遗漏|Filled: Hit · Dashed: Missed', 'detail');
      }
    }
  ];

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = { steps: scenes.length, mount };
})();
