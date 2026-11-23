/* SVG timeline for the topic page. Each scene draws its own paths and static result. */
(function () {
  const id = 'v-catalog';
  const ns = 'http://www.w3.org/2000/svg';
  let instances = 0;

  function mount(host, opts = {}) {
    const narrow = matchMedia('(max-width: 639px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const markerId = id + '-arrow-' + (++instances);
    const svg = document.createElementNS(ns, 'svg');
    svg.classList.add(id + '-figure');
    svg.setAttribute('role', 'img');
    host.replaceChildren(svg);

    let step = 0, elapsed = 0, last = 0, raf = 0, paused = Boolean(opts.paused);
    let period, tracks, boxes, packets, updates;
    const T = (value) => Array.isArray(value) ? window.SS.T(value) : value;

    function el(tag, attrs, parent) {
      const node = document.createElementNS(ns, tag);
      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
      parent.append(node);
      return node;
    }

    function label(parent, x, y, value, type, anchor = 'start') {
      const node = el('text', { x, y, class: type, 'text-anchor': anchor, 'dominant-baseline': 'middle' }, parent);
      node.textContent = T(value);
      return node;
    }

    function box(wide, mobile, title, rows) {
      const [x, y, w] = narrow.matches ? mobile : wide;
      const h = 42 + rows.length * 34;
      const g = el('g', {}, boxes);
      el('rect', { x, y, width: w, height: h, rx: 4, class: 'v-catalog-outline' }, g);
      label(g, x + 14, y + 22, title, 'v-catalog-heading');
      const lines = rows.map((value, i) => {
        const top = y + 42 + i * 34;
        const row = el('g', { class: 'v-catalog-row' }, g);
        el('rect', { x: x + 1, y: top, width: w - 2, height: 32, rx: 2, class: 'v-catalog-selection' }, row);
        el('path', { d: 'M' + (x + 12) + ' ' + top + 'h' + (w - 24), class: 'v-catalog-divider' }, row);
        return { g: row, text: label(row, x + 14, top + 17, value, 'v-catalog-detail') };
      });
      return { x, y, w, h, lines };
    }

    function point(b, [side, offset]) {
      if (side === 'left' || side === 'right') {
        return [side === 'left' ? b.x : b.x + b.w, b.y + (offset ?? b.h / 2)];
      }
      return [b.x + (offset ?? b.w / 2), side === 'top' ? b.y : b.y + b.h];
    }

    function link(a, b, wide = [['right'], ['left']], mobile = [['bottom'], ['top']]) {
      const [from, to] = narrow.matches ? mobile : wide;
      const [x, y] = point(a, from), [u, v] = point(b, to);
      const horizontal = from[0] === 'left' || from[0] === 'right';
      const sameAxis = horizontal === (to[0] === 'left' || to[0] === 'right');
      const bend = horizontal
        ? (sameAxis ? 'H' + (x + u) / 2 + 'V' + v + 'H' + u : 'H' + u + 'V' + v)
        : (sameAxis ? 'V' + (y + v) / 2 + 'H' + u + 'V' + v : 'V' + v + 'H' + u);
      return el('path', { d: 'M' + x + ' ' + y + bend, class: 'v-catalog-link', 'marker-end': 'url(#' + markerId + ')' }, tracks);
    }

    function flow(path, start, end) {
      const length = path.getTotalLength();
      const tile = el('rect', { width: 12, height: 10, rx: 2, class: 'v-catalog-packet' }, packets);
      updates.push((t) => {
        const fraction = Math.max(0, Math.min(1, (t - start) / (end - start)));
        const p = path.getPointAtLength(length * fraction);
        tile.setAttribute('x', p.x - 6);
        tile.setAttribute('y', p.y - 5);
        tile.style.opacity = Math.max(0, Math.min(1, (t - start) * 12, (end + 0.24 - t) * 5));
      });
    }

    function mark(line, type, start, end = Infinity) {
      updates.push(t => line.g.classList.toggle(type, t >= start && t < end));
    }

    function change(line, value, start) {
      const original = line.text.textContent;
      const next = T(value);
      updates.push(t => {
        const text = t >= start ? next : original;
        if (line.text.textContent !== text) line.text.textContent = text;
      });
    }

    function note(x, y, value) {
      label(boxes, x, y, value, 'v-catalog-annotation', 'middle');
    }

    const scenes = [
      function elements() {
        const source = box([86, 86, 248], [54, 20, 252], 'Element Store', [
          ['文件　cover.png', 'File · cover.png'],
          ['对象　frame.jpg', 'Object · frame.jpg'],
          ['目录　/images/', 'Directory · /images/']
        ]);
        const catalog = box([546, 86, 248], [54, 225, 252], 'Catalog', ['—', '—', '—']);
        const entries = ['cover.png · FILE', 'frame.jpg · FILE', 'images · DIR'];

        catalog.lines.forEach((line, i) => {
          const y = 59 + 34 * i;
          const x = 72 + i * 54;
          const path = link(source, catalog, [['right', y], ['left', y]], [['bottom', x], ['top', x]]);
          const start = 0.5 + i * 0.85;
          flow(path, start, start + 0.8);
          mark(source.lines[i], 'v-catalog-scope', start);
          change(line, entries[i], start + 0.8);
          mark(line, 'v-catalog-match', start + 0.8);
        });
        return 6.2;
      },

      function freshness() {
        const namespace = box([31, 97, 221], [52, 20, 256], ['命名空间', 'Namespace'], ['cover.png', '—']);
        const snapshot = box([330, 97, 220], [52, 149, 256], ['定期快照', 'Scheduled snapshot'], ['cover.png', '—']);
        const catalog = box([628, 97, 221], [52, 278, 256], 'Catalog', ['cover.png', '—']);
        const capture = link(namespace, snapshot);
        const index = link(snapshot, catalog);

        flow(capture, 0.4, 1.15);
        flow(index, 1.4, 2.15);
        mark(catalog.lines[0], 'v-catalog-match', 2.15);

        change(namespace.lines[1], 'frame.jpg', 2.6);
        mark(namespace.lines[1], 'v-catalog-scope', 2.6);
        flow(capture, 3.7, 4.45);
        change(snapshot.lines[1], 'frame.jpg', 4.45);
        mark(snapshot.lines[1], 'v-catalog-scope', 4.45);
        flow(index, 4.85, 5.6);
        change(catalog.lines[1], 'frame.jpg', 5.6);
        mark(catalog.lines[1], 'v-catalog-match', 5.6);
        return 8;
      },

      function query() {
        const catalog = box([76, 86, 277], [38, 24, 284], 'Catalog', [
          '/images/cover.png', '/images/frame.jpg', '/logs/trace.txt'
        ]);
        const result = box([552, 86, 250], [55, 229, 250], ['查询结果', 'Query result'], [
          'search_path = /images/', ['扩展名 = PNG', 'Extension = PNG'], '—'
        ]);
        const path = link(catalog, result, [['right', 59], ['left', 127]]);
        mark(catalog.lines[0], 'v-catalog-scope', 0.5, 1.65);
        mark(catalog.lines[1], 'v-catalog-scope', 0.5, 1.65);
        mark(result.lines[0], 'v-catalog-scope', 0.5);
        mark(catalog.lines[0], 'v-catalog-match', 1.65);
        mark(result.lines[1], 'v-catalog-match', 1.65);
        flow(path, 1.9, 3.15);
        change(result.lines[2], 'cover.png', 3.15);
        mark(result.lines[2], 'v-catalog-match', 3.15);
        return 6.5;
      },

      function tags() {
        const object = box([86, 102, 248], [54, 45, 252], ['S3 对象', 'S3 object'], [
          'frame.jpg', 'processed = false'
        ]);
        const catalog = box([546, 102, 248], [54, 224, 252], 'Catalog', [
          'frame.jpg', 'tag_processed = —'
        ]);
        const path = link(object, catalog, [['right', 93], ['left', 93]]);
        mark(object.lines[1], 'v-catalog-scope', 0.65);
        flow(path, 0.65, 2.15);
        change(catalog.lines[1], 'tag_processed = false', 2.15);
        mark(catalog.lines[1], 'v-catalog-match', 2.15);
        return 5.6;
      },

      function compare() {
        const earlier = box([105, 82, 266], [47, 25, 266], ['旧版 Catalog', 'Earlier Catalog'], [
          '/images/cover.png', '/images/old.png', '—'
        ]);
        const later = box([509, 82, 266], [47, 226, 266], ['新版 Catalog', 'Later Catalog'], [
          '/images/cover.png', '—', '/images/frame.jpg'
        ]);
        change(earlier.lines[1], '− /images/old.png', 0.65);
        mark(earlier.lines[1], 'v-catalog-removed', 0.65);
        change(later.lines[2], '+ /images/frame.jpg', 1.7);
        mark(later.lines[2], 'v-catalog-match', 1.7);
        return 6;
      }
    ];

    function paint() {
      const t = reduced.matches ? period - 1 : elapsed % period;
      for (const update of updates) update(t);
    }

    function tick(now) {
      elapsed += Math.max(0, (now - last) / 1000);
      last = now;
      paint();
      raf = requestAnimationFrame(tick);
    }

    function run() {
      cancelAnimationFrame(raf);
      if (paused || reduced.matches) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }

    function show(i) {
      step = Math.max(0, Math.min(scenes.length - 1, i));
      elapsed = 0;
      svg.replaceChildren();
      svg.dataset.step = step + 1;
      const cfg = window.SS_TOPIC_CFG;
      svg.setAttribute('aria-label', T(cfg.steps[step].d));
      const [w, h] = narrow.matches ? [360, 430] : [880, 330];
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      const defs = el('defs', {}, svg);
      const marker = el('marker', { id: markerId, viewBox: '0 0 8 8', refX: 7, refY: 4,
        markerWidth: 7, markerHeight: 7, orient: 'auto', markerUnits: 'userSpaceOnUse' }, defs);
      el('path', { d: 'M0 0l7 4-7 4z', class: 'v-catalog-arrow' }, marker);
      tracks = el('g', {}, svg);
      boxes = el('g', {}, svg);
      packets = el('g', {}, svg);
      updates = [];
      period = scenes[step]();
      note(w / 2, h - 17, ['示意，不代表实测数字', 'Schematic, no measured figures']);
      paint();
      run();
    }

    function ratio() { return narrow.matches ? 360 / 430 : 880 / 330; }
    function layout() {
      if (opts.onLayout) opts.onLayout(ratio(), narrow.matches);
      show(step);
    }
    const refresh = () => show(step);
    narrow.addEventListener('change', layout);
    reduced.addEventListener('change', refresh);
    document.addEventListener('ss-lang', refresh);
    const ctrl = {
      show,
      pause() { paused = true; cancelAnimationFrame(raf); },
      resume() { if (paused) { paused = false; run(); } },
      destroy() {
        this.pause();
        narrow.removeEventListener('change', layout);
        reduced.removeEventListener('change', refresh);
        document.removeEventListener('ss-lang', refresh);
        svg.remove();
        delete host.__anim;
      },
      ratio,
      step() { return step; }
    };
    host.__anim = ctrl;
    layout();
    return ctrl;
  }

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = { steps: 5, mount };
})();
