(() => {
  'use strict';

  const EN = {
    "示意，不代表实测数字": "Schematic, not measured",
    "表定义": "Table definition",
    "字段与位置": "Schema and location",
    "文件清单": "Manifest",
    "记录有效文件": "List active files",
    "登记文件": "Registered files",
    "属于当前表": "In the table",
    "新写入文件": "New file",
    "尚未登记": "Not registered",
    "读取器": "Reader",
    "打开当前表": "Open current table",
    "快照 A": "Snapshot A",
    "固定读取版本": "Pinned for this read",
    "文件 A": "Files in A",
    "沿用同一集合": "Same file set",
    "快照 B": "Snapshot B",
    "写入器准备中": "Writer preparing",
    "写入器": "Writer",
    "备好 B 的元数据": "Prepare B metadata",
    "当前指针": "Current pointer",
    "指向 B": "Points to B",
    "指向 A": "Points to A",
    "历史版本": "Retained version",
    "当前版本": "Current version",
    "新当前版本": "New current version",
    "待提交": "Awaiting commit",
    "周二事件查询": "Tuesday query",
    "筛选日期": "Filter by date",
    "文件统计": "File statistics",
    "比较日期上下界": "Check date bounds",
    "周二文件": "Tuesday file",
    "读行并筛选": "Read and filter rows",
    "周一文件": "Monday file",
    "跳过": "Skipped",
    "历史查询": "Historical query",
    "指定快照 A": "Select snapshot A",
    "仍保留": "Retained",
    "历史文件": "Historical files",
    "按清单读取": "Read listed files",
    "仍是当前版本": "Still current"
  };
  const scenes = [
    ["context", [
      ["表定义", "字段与位置", "list"],
      ["文件清单", "记录有效文件", "list"],
      ["登记文件", "属于当前表", "files", "good", "pending"],
      ["新写入文件", "尚未登记", "files", "muted"]
    ], [[0, 1, 0], [1, 2, 800]]],
    ["context", [
      ["读取器", "打开当前表", "lines"],
      ["快照 A", "固定读取版本", "pointer", "good"],
      ["文件 A", "沿用同一集合", "files", "good", "pending"],
      ["快照 B", "写入器准备中", "pointer", "muted"]
    ], [[0, 1, 0], [1, 2, 780], [0, 3, 0, "off"]]],
    ["branch", [
      ["写入器", "备好 B 的元数据", "files"],
      ["当前指针", "指向 B", "pointer", "good", "pending", "指向 A"],
      ["快照 A", "历史版本", "list", "data", "", "当前版本"],
      ["快照 B", "新当前版本", "list", "good", "pending", "待提交"]
    ], [[0, 1, 0], [1, 2, 0, "old"], [1, 3, 850, "switch"]]],
    ["branch", [
      ["周二事件查询", "筛选日期", "lines"],
      ["文件统计", "比较日期上下界", "list"],
      ["周二文件", "读行并筛选", "rows", "good", "pending"],
      ["周一文件", "跳过", "rows", "muted"]
    ], [[0, 1, 0], [1, 2, 810, "good"], [1, 3, 0, "off"]]],
    ["context", [
      ["历史查询", "指定快照 A", "lines"],
      ["快照 A", "仍保留", "pointer", "good"],
      ["历史文件", "按清单读取", "files", "good", "pending"],
      ["快照 B", "仍是当前版本", "pointer", "muted"]
    ], [[0, 1, 0], [1, 2, 780], [0, 3, 0, "off"]]]
  ];

  const desktop = {
    chain: [[145, 153], [450, 153], [755, 153]],
    merge: [[242, 84], [242, 222], [658, 153]],
    fork: [[242, 153], [658, 84], [658, 222]],
    join: [[145, 84], [145, 222], [450, 153], [755, 153]],
    branch: [[145, 153], [450, 153], [755, 84], [755, 222]],
    context: [[145, 87], [450, 87], [755, 87], [450, 230]],
    lanes: [[240, 84], [660, 84], [240, 222], [660, 222]]
  };
  const mobile = {
    chain: [[180, 63], [180, 194], [180, 325]],
    merge: [[90, 102], [270, 102], [180, 276]],
    fork: [[180, 102], [90, 276], [270, 276]],
    join: [[90, 63], [270, 63], [180, 194], [180, 325]],
    branch: [[180, 63], [180, 194], [90, 325], [270, 325]],
    context: [[90, 63], [180, 194], [180, 325], [270, 63]],
    lanes: [[90, 102], [90, 276], [270, 102], [270, 276]]
  };
  const name = 'an-otf';
  const clamp = value => Math.max(0, Math.min(1, value));
  const T = text => window.SS_LANG === 'en' ? EN[text] : text;

  function mount(host, {onLayout, paused = false} = {}) {
    const small = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', name);
    svg.setAttribute('role', 'img');
    host.replaceChildren(svg);
    let index = 0, raf = 0, elapsed = 0, last = 0, duration, links, cards;

    function el(tag, attributes, parent = svg) {
      const item = document.createElementNS(svg.namespaceURI, tag);
      for (const [key, value] of Object.entries(attributes)) item.setAttribute(key, value);
      parent.append(item);
      return item;
    }

    function text(x, y, content, kind, parent) {
      const item = el('text', {x, y, class: name + '-' + kind}, parent);
      item.textContent = content;
      return item;
    }

    function rect(x, y, width, height, parent, rx = 2) {
      return el('rect', {x, y, width, height, rx}, parent);
    }

    function marks(kind, x, y, parent) {
      const n = (left, top, width, height) => rect(x + left, y + top, width, height, parent);
      switch (kind) {
        case 'lines':
        case 'list':
          n(-23, -7, 46, 3);
          n(-23, -1, 37, 3);
          n(-23, 5, 30, 3);
          break;
        case 'rows':
        case 'cols':
        case 'select':
        case 'column':
        case 'index':
          for (let col = 0; col < 3; col++) {
            for (let row = 0; row < 3; row++) {
              if (kind === 'column' && col !== 1) continue;
              const cell = n(-23 + 16 * col, -8 + 6 * row, 13, 4);
              if (kind === 'select' && col !== 1) cell.setAttribute('data-tone', 'muted');
            }
          }
          break;
        case 'image':
          el('path', {d: `M${x - 23},${y + 7} l13,-12 8,6 10,-9 15,15 Z`}, parent);
          break;
        case 'pointer':
          n(-22, -2, 34, 4);
          el('path', {d: `M${x + 10},${y - 7} l12,7 -12,7 Z`}, parent);
          break;
        case 'vector':
          [6, 13, 9, 16, 5, 11].forEach((height, i) => n(-24 + 9 * i, 8 - height, 6, height));
          break;
        case 'stream':
          [0, 12, 28, 47].forEach(offset => n(-27 + offset, -4, 8, 8));
          break;
        case 'work':
          for (let i = 0; i < 5; i++) n(-28 + 12 * i, -4, 9, 8);
          break;
        case 'bundleA':
        case 'bundleB':
          n(-28, -7, 56, 14).setAttribute('class', name + '-outline');
          for (let i = 0; i < 3; i++) n(-23 + 16 * i, -3, 13, 6);
          break;
        default:
          for (let i = 0; i < 3; i++) n(-26 + 19 * i, -5, 14, 10);
      }
      if (kind.endsWith('A') || kind.endsWith('B')) parent.dataset.group = kind.slice(-1);
    }

    function route(a, b, vertical) {
      const axis = vertical ? 'y' : 'x', across = vertical ? 'x' : 'y';
      const extent = vertical ? 'h' : 'w';
      const direction = Math.sign(b[axis] - a[axis]);
      const start = a[axis] + direction * a[extent] / 2;
      const end = b[axis] - direction * b[extent] / 2;
      const mid = (start + end) / 2;
      const point = (along, cross) => vertical ? [cross, along] : [along, cross];
      return [
        point(start, a[across]), point(mid, a[across]),
        point(mid, b[across]), point(end, b[across])
      ];
    }

    function draw() {
      const [layout, nodes, edges] = scenes[index];
      const row = (small.matches ? mobile : desktop)[layout];
      const specs = nodes.map((node, i) => {
        const [x, y] = row[i];
        return {x, y, w: small.matches ? (x === 180 ? 204 : 150) : 236, h: 86};
      });
      const step = window.SS_TOPIC_CFG.steps[index];
      svg.setAttribute('aria-label', step.d[window.SS_LANG === 'en' ? 1 : 0]);
      svg.setAttribute('viewBox', small.matches ? '0 0 360 420' : '0 0 900 340');
      svg.replaceChildren();

      const wires = el('g', {'aria-hidden': 'true'});
      const bodies = el('g', {'aria-hidden': 'true'});
      const packets = el('g', {'aria-hidden': 'true'});
      links = edges.map(([from, to, start, type = 'data']) => {
        const a = specs[from], b = specs[to];
        const vertical = (small.matches || (layout === 'context' && (from === 3 || to === 3)))
          ? a.y !== b.y : a.x === b.x;
        const points = route(a, b, vertical);
        const group = el('g', {class: name + '-wire'}, wires);
        const path = el('path', {d: 'M' + points.map(p => p.join(',')).join(' L')}, group);
        const [x, y] = points[3];
        const sign = Math.sign(vertical ? b.y - a.y : b.x - a.x);
        const arrow = vertical
          ? `M${x - 4},${y - 7 * sign} L${x},${y} L${x + 4},${y - 7 * sign}`
          : `M${x - 7 * sign},${y - 4} L${x},${y} L${x - 7 * sign},${y + 4}`;
        el('path', {d: arrow, class: name + '-arrow'}, group);
        const offsets = type === 'batch' ? [0, 90, 180] : type === 'stream' ? [0, 390, 780, 1170] : [0];
        const moves = ['off', 'old', 'switch'].includes(type) ? [] : offsets.map(delay => ({
          item: el('rect', {x: -5, y: -4, width: 10, height: 8, rx: 2, class: name + '-packet', 'data-tone': type}, packets),
          start: start + delay
        }));
        return {to, group, path, type, start, moves, length: path.getTotalLength()};
      });

      const transfer = 620;
      const arrivals = specs.map((_, i) => Math.max(0, ...links.filter(link => link.to === i)
        .flatMap(link => link.moves.map(move => move.start + transfer))));
      const commit = links.find(link => link.type === 'switch')?.start;
      cards = nodes.map(([label, detail, kind, tone = 'data', state = '', before], i) => {
        const {x, y, w, h} = specs[i];
        const card = el('g', {'data-tone': tone}, bodies);
        const outline = rect(x - w / 2, y - h / 2, w, h, card, 6);
        outline.setAttribute('class', name + '-node');
        text(x, y - 17, T(label), 'label', card);
        const sub = text(x, y + 5, '', 'detail', card);
        const glyph = el('g', {class: name + '-marks'}, card);
        marks(kind, x, y + 24, glyph);
        const at = commit ?? arrivals[i];
        return {card, sub, glyph, kind, state, before, detail, at};
      });
      text(small.matches ? 180 : 450, small.matches ? 400 : 313,
        T('示意，不代表实测数字'), 'note');
      duration = Math.max(...arrivals, commit ?? 0) + 1600;
    }

    function paint(time) {
      for (const {group, type, start, moves, path, length} of links) {
        const active = type !== 'off' && (type !== 'old' || time < (links.find(link => link.type === 'switch')?.start ?? 0))
          && (type !== 'switch' || time >= start);
        group.dataset.tone = active ? type : 'off';
        for (const move of moves) {
          const progress = (time - move.start) / 620;
          const position = path.getPointAtLength(length * clamp(progress));
          move.item.setAttribute('transform', `translate(${position.x} ${position.y})`);
          move.item.style.opacity = reduced.matches ? 0 : clamp(Math.min(progress * 7, (1 - progress) * 7));
        }
      }
      for (const {card, sub, glyph, kind, state, before, detail, at} of cards) {
        const ready = time >= at;
        const label = T(!ready && before ? before : detail);
        if (sub.textContent !== label) sub.textContent = label;
        card.dataset.state = state === 'pending' && !ready ? 'pending' : state === 'cleared' && ready ? 'cleared' : '';
        glyph.style.opacity = card.dataset.state === 'pending' || card.dataset.state === 'cleared' ? 0.23 : 1;
        if (kind === 'work') {
          const tick = reduced.matches ? 4 : Math.floor(time / 230) % 5;
          Array.from(glyph.children).forEach((bar, i) => {
            bar.style.opacity = i <= tick ? 1 : 0.25;
          });
        }
      }
    }

    function loop(now) {
      elapsed = (elapsed + Math.max(0, Math.min(56, now - last))) % duration;
      last = now;
      paint(elapsed);
      raf = requestAnimationFrame(loop);
    }

    function start() {
      cancelAnimationFrame(raf);
      if (paused || reduced.matches) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }

    function show(i) {
      index = i;
      elapsed = 0;
      draw();
      paint(reduced.matches ? duration - 1 : 0);
      start();
    }

    function ratio() {
      return small.matches ? 360 / 420 : 900 / 340;
    }

    function layoutChanged() {
      show(index);
      onLayout?.(ratio(), small.matches);
    }

    const redraw = () => show(index);
    small.addEventListener('change', layoutChanged);
    reduced.addEventListener('change', redraw);
    document.addEventListener('ss-lang', redraw);
    show(index);
    return {
      show,
      pause() { paused = true; cancelAnimationFrame(raf); },
      resume() { if (paused) { paused = false; start(); } },
      destroy() {
        cancelAnimationFrame(raf);
        small.removeEventListener('change', layoutChanged);
        reduced.removeEventListener('change', redraw);
        document.removeEventListener('ss-lang', redraw);
        svg.remove();
      },
      ratio,
      step: () => index
    };
  }

  window.SSAnim ||= {};
  window.SSAnim['otf'] = {steps: scenes.length, mount};
})();
