(() => {
  const scenes = [
    [
      [
        [["键 K", "Key K", "object", "", ""]],
        [["记录 K", "Record K", "engine", "", ""]],
        [["值", "Value", "cache", "记录内容", "Record contents"]]
      ],
      [["a0", "b0", "object"], ["b0", "c0", "cache", 580]],
    ],
    [
      [
        [["存储节点", "Storage node", "engine", "", ""], ["独立元数据服务", "Metadata server", "idle", "未参与", "Idle"]],
        [["数据与元数据", "Data and metadata", "object", "", ""]],
        [["客户端", "Client", "engine", "", ""]]
      ],
      [["a0", "b0", "object"], ["b0", "c0", "object", 580]],
    ],
    [
      [
        [["新记录 C", "New record C", "object", "", ""]],
        [["追加写入", "Append", "engine", "", ""]],
        [["日志", "Log", "cache", "A   ·   B   ·   C", "A   ·   B   ·   C"]]
      ],
      [["a0", "b0", "object"], ["b0", "c0", "cache", 580]],
      ["c0", "A   ·   B", "A   ·   B", 1100],
    ],
    [
      [
        [["记录 K", "Record K", "object", "", ""]],
        [["布局映射", "Layout mapping", "engine", "", ""]],
        [["节点 A", "Node A", "object", "", ""], ["节点 C", "Node C", "idle", "未参与", "Idle"]]
      ],
      [["a0", "b0", "object"], ["b0", "c0", "object", 580], ["b0", "c1", "idle"]],
    ],
    [
      [
        [["节点 A", "Node A", "object", "片段 A", "Fragment A"], ["节点 B", "Node B", "file", "片段 B", "Fragment B"]],
        [["客户端", "Client", "engine", "已汇集片段", "Fragments assembled"]]
      ],
      [["a0", "b0", "object", 190], ["a1", "b0", "file", 190]],
      ["b0", "并行取回片段", "Fetching fragments", 710],
    ],
  ];
  const title = [["键标识记录，值保存内容", "Keys Identify Records and Values Hold Content"], ["数据与元数据同处一个引擎", "Data and Metadata in One Engine"], ["日志结构组织写入", "Log-Structured Writes"], ["逻辑布局与物理位置", "Logical Layout and Physical Placement"], ["按片段发起并行读取", "Parallel Reads Across Fragments"]];
  const note = ['示意，不代表实测数字', 'Illustrative, no measured figures'];
  const duration = 2900;
  const travel = 520;

  function mount(host, {onLayout, paused = false} = {}) {
    const narrow = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let index = 0, frame = 0, previous = null, elapsed = 0, packets = [], outcome;
    const svg = element('svg', {class: 'd-kvcore-scene', role: 'img'}, host);
    const ratio = () => narrow.matches ? 400 / 400 : 960 / 416;

    function element(name, attrs, parent = svg) {
      const child = document.createElementNS('http://www.w3.org/2000/svg', name);
      for (const [key, value] of Object.entries(attrs)) child.setAttribute(key, value);
      parent.append(child);
      return child;
    }

    function text(x, y, value, role, parent = svg) {
      const label = element('text', {x, y, 'data-role': role}, parent);
      label.textContent = value;
      return label;
    }

    function build() {
      const mobile = narrow.matches;
      const lang = window.SS_LANG === 'en' ? 1 : 0;
      const [width, height] = mobile ? [400, 400] : [960, 416];
      const [layers, links, arrival] = scenes[index];
      const nodes = new Map();
      const cardHeight = mobile ? 72 : 84;
      outcome = null;
      svg.replaceChildren();
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.setAttribute('aria-label', title[index][lang] + '. ' + note[lang]);
      packets = [];

      text(20, 28, 'Infinia', 'figure-title');
      text(20, height - 19, note[lang], 'note');
      element('line', {x1: 20, y1: 51, x2: width - 20, y2: 51, 'data-role': 'rule'});
      element('line', {x1: 20, y1: height - 40, x2: width - 20, y2: height - 40, 'data-role': 'rule'});

      layers.forEach((layer, column) => {
        layer.forEach((data, row) => {
          const lane = row - (layer.length - 1) / 2;
          const cell = column - (layers.length - 1) / 2;
          const w = mobile ? [0, 208, 168, 116][layer.length] : 232;
          const x = width / 2 + (mobile ? lane * (layer.length === 3 ? 131 : 190) : cell * (layers.length === 3 ? 340 : 450));
          const y = (mobile ? 211 : 215) + (mobile ? cell * (layers.length === 3 ? 100 : 140) : lane * (layer.length === 3 ? 101 : 136));
          nodes.set('abc'[column] + row, {data, x, y, w});
        });
      });

      const routes = element('g', {'data-role': 'routes'});
      const markers = element('g', {'data-role': 'markers'});
      for (const [from, to, tone, delay = 0] of links) {
        const a = nodes.get(from), b = nodes.get(to);
        const idle = tone === 'idle';
        const start = mobile ? [a.x, a.y + cardHeight / 2] : [a.x + a.w / 2, a.y];
        const parallel = index === 4 ? (from === 'a0' ? -1 : 1) : 0;
        const end = mobile ? [b.x + parallel * 28, b.y - cardHeight / 2] : [b.x - b.w / 2, b.y + parallel * 22];
        const mid = mobile ? (start[1] + end[1]) / 2 : (start[0] + end[0]) / 2;
        const bend = mobile ? `V${mid} H${end[0]}` : `H${mid} V${end[1]}`;
        const tip = idle ? (mobile ? [end[0], end[1] - 13] : [end[0] - 13, end[1]]) : end;
        const path = element('path', {d: `M${start.join(' ')} ${bend} L${tip.join(' ')}`, 'data-tone': tone}, routes);
        const [x, y] = tip;
        if (idle) {
          const stop = mobile ? `M${x - 5} ${y} h10` : `M${x} ${y - 5} v10`;
          element('path', {d: stop, 'data-role': 'stop'}, routes);
          continue;
        }
        const arrow = mobile ? `M${x - 4} ${y - 6} l4 6 4 -6` : `M${x - 6} ${y - 4} l6 4 -6 4`;
        element('path', {d: arrow, 'data-role': 'arrow'}, routes);
        const marker = element('rect', {width: 11, height: 11, rx: 2, opacity: 0, 'data-tone': tone}, markers);
        packets.push({path, length: path.getTotalLength(), marker, delay});
      }

      for (const [id, {data, x, y, w}] of nodes) {
        const sub = data[3 + lang];
        const box = element('g', {'data-role': 'node', 'data-tone': data[2] || 'engine'});
        element('rect', {x: x - w / 2, y: y - cardHeight / 2, width: w, height: cardHeight, rx: 7}, box);
        text(x, y - (sub ? (mobile ? 14 : 17) : 0), data[lang], 'label', box);
        if (sub) {
          const detail = text(x, y + (mobile ? 16 : 18), sub, 'detail', box);
          if (arrival?.[0] === id) outcome = {detail, final: sub, initial: arrival[1 + lang], time: arrival[3]};
        }
      }
      paint();
    }

    function paint() {
      const time = elapsed % duration;
      if (outcome) {
        const value = reduced.matches || time >= outcome.time ? outcome.final : outcome.initial;
        if (outcome.detail.textContent !== value) outcome.detail.textContent = value;
      }
      if (reduced.matches) {
        for (const {marker} of packets) marker.setAttribute('opacity', 0);
        return;
      }
      for (const {path, length, marker, delay} of packets) {
        const progress = (time - delay) / travel;
        const opacity = Math.max(0, Math.min(1, progress * 8, (1 - progress) * 8));
        marker.setAttribute('opacity', opacity);
        if (!opacity) continue;
        const {x, y} = path.getPointAtLength(length * progress);
        marker.setAttribute('x', x - 5.5);
        marker.setAttribute('y', y - 5.5);
      }
    }

    function tick(now) {
      if (previous !== null) elapsed += Math.max(0, now - previous);
      previous = now;
      paint();
      frame = requestAnimationFrame(tick);
    }

    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = null;
    }

    function start() {
      if (!paused && !reduced.matches && !frame) frame = requestAnimationFrame(tick);
    }

    function motionChanged() {
      stop();
      paint();
      start();
    }

    function layoutChanged() {
      build();
      onLayout?.(ratio(), narrow.matches);
    }

    narrow.addEventListener('change', layoutChanged);
    reduced.addEventListener('change', motionChanged);
    document.addEventListener('ss-lang', build);
    build();
    start();
    const controller = {
      show(i) {
        index = Math.max(0, Math.min(scenes.length - 1, i));
        elapsed = 0;
        previous = null;
        build();
      },
      pause() { paused = true; stop(); },
      resume() { paused = false; start(); },
      destroy() {
        stop();
        narrow.removeEventListener('change', layoutChanged);
        reduced.removeEventListener('change', motionChanged);
        document.removeEventListener('ss-lang', build);
        delete host.__anim;
        svg.remove();
      },
      ratio,
      step: () => index,
    };
    host.__anim = controller;
    return controller;
  }

  (window.SSAnim ||= {})['d-kvcore'] = {steps: 5, mount};
})();
