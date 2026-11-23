(() => {
  'use strict';

  const EN = {
  "首次未提交": "Not committed",
  "用同一标识重试": "Retry with same ID",
  "重试提交": "Commit on retry",
  "结果一份": "One result",
  "已提交未确认": "Commit · No ACK",
  "跳过重复写": "Skip duplicate",
  "保留原结果": "Keep original result",
    "示意，不代表实测数字": "Schematic, not measured",
    "源文件": "Source file",
    "记录文件名": "File name",
    "事件日志": "Event log",
    "记录输入位置": "Input offset",
    "原始层": "Raw layer",
    "记录与来源": "Records and origin",
    "原始记录": "Raw records",
    "读取同一批": "One input batch",
    "字段校验": "Validation",
    "类型与必填值": "Types and required fields",
    "合规记录": "Valid records",
    "进入转换": "Ready to transform",
    "隔离区": "Quarantine",
    "记录异常原因": "Keep error reasons",
    "设备事件": "Device events",
    "按设备标识组织": "Grouped by device",
    "故障标签": "Fault labels",
    "已核实的类别": "Verified categories",
    "关联作业": "Join",
    "按设备标识关联": "Match device IDs",
    "训练样本": "Training samples",
    "事件和目标标签": "Events with labels",
    "暂存区": "Staging",
    "写入待发布样本": "Samples staged",
    "提交批次": "Commit batch",
    "确认完整输出": "Confirm output",
    "消费端": "Consumer",
    "读取已发布批次": "Read committed batch",
    "批量输入": "Batch input",
    "固定文件清单": "Fixed file list",
    "批次输出": "Batch result",
    "按批次发布": "Publish the batch",
    "流式输入": "Stream input",
    "事件持续到达": "Incoming events",
    "增量输出": "Incremental result",
    "随事件更新": "Update as events arrive",
    "输入批次 A": "Input batch A",
    "范围固定": "Same input range",
    "写入作业": "Write job",
    "按批次 A 重跑": "Retry batch A",
    "结果 A": "Result A",
    "按标识覆盖": "Replace by batch ID",
    "首次尝试": "First attempt",
    "写入中断": "Write interrupted"
  };
  const scenes = [
    ["merge", [
      ["源文件", "记录文件名", "lines"],
      ["事件日志", "记录输入位置", "rows"],
      ["原始层", "记录与来源", "files", "good", "pending"]
    ], [[0, 2, 0], [1, 2, 240]]],
    ["branch", [
      ["原始记录", "读取同一批", "rows"],
      ["字段校验", "类型与必填值", "list"],
      ["合规记录", "进入转换", "rows", "good", "pending"],
      ["隔离区", "记录异常原因", "files", "warn", "pending"]
    ], [[0, 1, 0], [1, 2, 800, "good"], [1, 3, 1080, "warn"]]],
    ["join", [
      ["设备事件", "按设备标识组织", "rows"],
      ["故障标签", "已核实的类别", "list"],
      ["关联作业", "按设备标识关联", "list"],
      ["训练样本", "事件和目标标签", "files", "good", "pending"]
    ], [[0, 2, 0], [1, 2, 170], [2, 3, 940]]],
    ["chain", [
      ["暂存区", "写入待发布样本", "files"],
      ["提交批次", "确认完整输出", "pointer", "good", "pending"],
      ["消费端", "读取已发布批次", "rows", "good", "pending"]
    ], [[0, 1, 0], [1, 2, 880]]],
    ["lanes", [
      ["批量输入", "固定文件清单", "files"],
      ["批次输出", "按批次发布", "rows", "good", "pending"],
      ["流式输入", "事件持续到达", "stream"],
      ["增量输出", "随事件更新", "rows", "good", "pending"]
    ], [[0, 1, 100, "batch"], [2, 3, 100, "stream"]]],
    ["lanes", [
      ["首次未提交", "用同一标识重试", "list"],
      ["重试提交", "结果一份", "rows", "good", "pending"],
      ["已提交未确认", "用同一标识重试", "list"],
      ["跳过重复写", "保留原结果", "rows", "good"]
    ], [[0, 1, 0], [2, 3, 980, "good"]]]
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
  const name = 'an-pipe';
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
  window.SSAnim['pipe'] = {steps: scenes.length, mount};
})();
