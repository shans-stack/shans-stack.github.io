/* SVG timeline for the topic page. Each scene draws its own paths and static result. */
(function () {
  const id = 'v-broker';
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

    function box(wide, mobile, title, rows, brand) {
      const [x, y, w] = narrow.matches ? mobile : wide;
      const h = 42 + rows.length * 34;
      const g = el('g', {}, boxes);
      el('rect', { x, y, width: w, height: h, rx: 4, class: 'v-broker-outline' }, g);
      const heading = label(g, x + 14, y + 22, title, 'v-broker-heading');
      if (brand) {
        for (const [theme, file] of [['light', 'black'], ['dark', 'white']]) {
          el('image', { x: x + 24 + heading.getComputedTextLength(), y: y + 16.5, width: 52, height: 11.03, class: 'v-broker-logo-' + theme,
            href: window.SS.url('assets/brand/vast-wordmark-' + file + '.svg') }, g);
        }
      }
      const lines = rows.map((value, i) => {
        const top = y + 42 + i * 34;
        const row = el('g', { class: 'v-broker-row' }, g);
        el('rect', { x: x + 1, y: top, width: w - 2, height: 32, rx: 2, class: 'v-broker-selection' }, row);
        el('path', { d: 'M' + (x + 12) + ' ' + top + 'h' + (w - 24), class: 'v-broker-divider' }, row);
        return { g: row, text: label(row, x + 14, top + 17, value, 'v-broker-detail') };
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
      return el('path', { d: 'M' + x + ' ' + y + bend, class: 'v-broker-link', 'marker-end': 'url(#' + markerId + ')' }, tracks);
    }

    function flow(path, start, end) {
      const length = path.getTotalLength();
      const tile = el('rect', { width: 12, height: 10, rx: 2, class: 'v-broker-packet' }, packets);
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
      label(boxes, x, y, value, 'v-broker-annotation', 'middle');
    }

    const scenes = [
      function ingress() {
        const producer = box([44, 111, 194], [71, 27, 218], ['Kafka 生产者', 'Kafka producer'], [
          ['发布事件', 'Publish event']
        ]);
        const vip = box([343, 111, 194], [71, 153, 218], ['虚拟 IP', 'Virtual IP'], [
          ['Kafka 视图', 'Kafka view']
        ]);
        const node = box([642, 111, 194], [71, 279, 218], 'CNode', [
          ['处理 Kafka 请求', 'Serve Kafka requests']
        ], true);

        flow(link(producer, vip), 0.55, 1.65);
        flow(link(vip, node), 1.75, 2.85);
        mark(producer.lines[0], 'v-broker-scope', 0.55);
        mark(vip.lines[0], 'v-broker-scope', 1.65);
        mark(node.lines[0], 'v-broker-match', 2.85);
        return 5.8;
      },

      function partitions() {
        const batch = box([58, 70, 237], [49, 22, 262], ['写入批次', 'Produce batches'], [
          ['事件 A', 'Event A'], ['事件 B', 'Event B'], ['事件 C', 'Event C']
        ]);
        const topic = box([523, 70, 299], [32, 230, 296], ['主题表', 'Topic table'], ['—', '—', '—'], true);
        const offsets = [
          ['分区 A · 偏移量 12', 'Partition A · offset 12'],
          ['分区 A · 偏移量 14', 'Partition A · offset 14'],
          ['分区 B · 偏移量 27', 'Partition B · offset 27']
        ];

        topic.lines.forEach((line, i) => {
          const y = 59 + i * 34;
          const path = link(batch, topic, [['right', y], ['left', y]], [
            ['bottom', 78 + i * 52], ['top', 95 + i * 52]
          ]);
          const start = 0.5 + i * 0.8;
          flow(path, start, start + 0.9);
          mark(batch.lines[i], 'v-broker-scope', start);
          change(line, offsets[i], start + 0.9);
          mark(line, 'v-broker-match', start + 0.9);
        });
        const [x, y] = narrow.matches ? [180, 392] : [440, 254];
        note(x, y, ['分区内有序', 'Order is per partition']);
        return 6.2;
      },

      function transaction() {
        const producer = box([32, 96, 210], [57, 14, 246], ['Kafka 生产者', 'Kafka producer'], [
          ['写入请求', 'Produce request'], ['等待确认', 'Awaiting reply']
        ]);
        const tx = box([329, 96, 222], [57, 147, 246], ['写入事务', 'Write transaction'], [
          ['批次 A + B', 'Batches A + B'], ['待提交', 'Pending']
        ]);
        const topic = box([638, 96, 210], [57, 280, 246], ['主题表', 'Topic table'], [
          ['分区 A', 'Partition A'], ['分区 B', 'Partition B']
        ], true);

        const submit = link(producer, tx, [['right', 59], ['left', 59]], [['bottom', 80], ['top', 80]]);
        const reply = link(tx, producer, [['left', 93], ['right', 93]], [['top', 166], ['bottom', 166]]);
        const a = link(tx, topic, [['right', 59], ['left', 59]], [['bottom', 80], ['top', 80]]);
        const b = link(tx, topic, [['right', 93], ['left', 93]], [['bottom', 166], ['top', 166]]);
        flow(submit, 0.55, 1.45);
        mark(tx.lines[0], 'v-broker-scope', 1.45);
        flow(a, 1.6, 2.55);
        flow(b, 1.85, 2.8);
        mark(topic.lines[0], 'v-broker-scope', 2.55, 3.1);
        mark(topic.lines[1], 'v-broker-scope', 2.8, 3.1);
        mark(topic.lines[0], 'v-broker-match', 3.1);
        mark(topic.lines[1], 'v-broker-match', 3.1);
        change(tx.lines[1], ['已提交', 'Committed'], 3.1);
        mark(tx.lines[1], 'v-broker-match', 3.1);
        flow(reply, 3.4, 4.4);
        change(producer.lines[1], ['写入已确认', 'Acknowledged'], 4.4);
        mark(producer.lines[1], 'v-broker-match', 4.4);
        return 7;
      },

      function consume() {
        const topic = box([66, 78, 257], [38, 40, 284], ['主题表', 'Topic table'], [
          ['分区 A · 已提交事件', 'Partition A · committed'],
          ['分区 B · 已提交事件', 'Partition B · committed']
        ], true);
        const group = box([510, 78, 304], [38, 224, 284], ['消费组', 'Consumer group'], [
          ['消费者 A · 读取分区 A', 'Consumer A · partition A'],
          ['消费者 B · 读取分区 B', 'Consumer B · partition B']
        ]);

        group.lines.forEach((line, i) => {
          const y = 59 + i * 34;
          const x = 87 + i * 110;
          const path = link(topic, group, [['right', y], ['left', y]], [['bottom', x], ['top', x]]);
          const start = 0.55 + i * 0.85;
          const end = start + 1.05;
          mark(topic.lines[i], 'v-broker-scope', start);
          flow(path, start, end);
          change(line, i === 0 ? ['A · 已提交偏移量 15', 'A · committed offset 15'] :
            ['B · 已提交偏移量 28', 'B · committed offset 28'], end + 0.35);
          mark(line, 'v-broker-match', end + 0.35);
        });
        return 6;
      },

      function query() {
        const topic = box([93, 85, 260], [52, 32, 256], ['主题表 · 分区 A', 'Topic · partition A'], [
          ['事件 A · 10:00', 'Event A · 10:00'],
          ['事件 B · 10:05', 'Event B · 10:05']
        ], true);
        const kafka = box([548, 20, 238], [10, 243, 161], ['Kafka 消费者', 'Kafka consumer'], [
          ['按分区顺序', 'Partition order'], '—', '—'
        ]);
        const sql = box([548, 179, 238], [189, 243, 161], ['SQL 查询', 'SQL query'], [
          ['接收时间 ≥ 10:05', 'Received ≥ 10:05'], '—'
        ]);

        const read = link(topic, kafka, [['right', 33], ['left', 55]], [['bottom', 81], ['top', 80]]);
        const filter = link(topic, sql, [['right', 78], ['left', 55]], [['bottom', 176], ['top', 80]]);
        flow(read, 0.55, 1.8);
        flow(read, 0.9, 2.15);
        flow(filter, 1.25, 2.55);
        mark(topic.lines[0], 'v-broker-scope', 0.55);
        mark(topic.lines[1], 'v-broker-scope', 0.9);
        change(kafka.lines[1], ['事件 A', 'Event A'], 1.8);
        change(kafka.lines[2], ['事件 B', 'Event B'], 2.15);
        change(sql.lines[1], ['事件 B', 'Event B'], 2.55);
        mark(kafka.lines[1], 'v-broker-match', 1.8);
        mark(kafka.lines[2], 'v-broker-match', 2.15);
        mark(sql.lines[1], 'v-broker-match', 2.55);
        return 6.2;
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
      el('path', { d: 'M0 0l7 4-7 4z', class: 'v-broker-arrow' }, marker);
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
