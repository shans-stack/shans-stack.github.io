(() => {
  const scenes = [
    [
      [
        [["租户 A", "Tenant A", "object", "", ""], ["租户 B", "Tenant B", "file", "", ""]],
        [["键空间 A", "Keyspace A", "object", "记录 K", "Record K"], ["键空间 B", "Keyspace B", "file", "记录 K", "Record K"]],
        [["共享集群", "Shared cluster", "engine", "", ""]]
      ],
      [["a0", "b0", "object"], ["a1", "b1", "file"], ["b0", "c0", "object", 580], ["b1", "c0", "file", 760]],
    ],
    [
      [
        [["租户 A 的键", "Tenant A key", "object", "局部键 K", "Local key K"], ["租户 B 的键", "Tenant B key", "file", "局部键 K", "Local key K"]],
        [["键空间 A", "Keyspace A", "object", "记录 K", "Record K"], ["键空间 B", "Keyspace B", "file", "记录 K", "Record K"]]
      ],
      [["a0", "b0", "object"], ["a1", "b1", "file"]],
    ],
    [
      [
        [["租户 A 请求", "Request from A", "object", "", ""], ["租户 A 请求", "Request from A", "file", "", ""]],
        [["获准", "Authorized", "cache", "", ""], ["拒绝", "Denied", "fault", "", ""]],
        [["键空间 A", "Keyspace A", "object", "记录 K", "Record K"], ["键空间 B", "Keyspace B", "idle", "未访问", "No access"]]
      ],
      [["a0", "b0", "object"], ["b0", "c0", "cache", 580], ["a1", "b1", "fault"], ["b1", "c1", "idle"]],
    ],
    [
      [
        [["租户", "Tenant", "engine", "", ""]],
        [["子租户 A", "Subtenant A", "object", "", ""], ["子租户 B", "Subtenant B", "file", "", ""]],
        [["数据集 A", "Dataset A", "object", "", ""], ["数据集 B", "Dataset B", "file", "管理委派", "Delegated admin"]]
      ],
      [["a0", "b0", "object"], ["a0", "b1", "file", 170], ["b0", "c0", "object", 580], ["b1", "c1", "file", 750]],
    ],
    [
      [
        [["S3", "S3", "object", "对象", "Objects"], ["POSIX", "POSIX", "file", "文件", "Files"], ["KV Cache", "KV cache", "cache", "推理缓存", "Inference"]],
        [["租户键空间", "Tenant keyspace", "engine", "", ""]],
        [["租户数据", "Tenant data", "cache", "", ""]]
      ],
      [["a0", "b0", "object"], ["a1", "b0", "file", 200], ["a2", "b0", "cache", 400], ["b0", "c0", "cache", 1050]],
    ],
  ];
  const title = [["共享资源上的逻辑租户", "Logical Tenants on Shared Resources"], ["数据键包含租户标识", "Data Keys Include a Tenant Identifier"], ["授权约束请求范围", "Authorization Governs Request Scope"], ["子租户与数据集范围", "Subtenant and Dataset Scopes"], ["隔离延伸至各数据接口", "Isolation Across Data Interfaces"]];
  const note = ['示意，不代表实测数字', 'Illustrative, no measured figures'];
  const duration = 2900;
  const travel = 520;

  function mount(host, {onLayout, paused = false} = {}) {
    const narrow = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let index = 0, frame = 0, previous = null, elapsed = 0, packets = [], outcome;
    const svg = element('svg', {class: 'd-addr-scene', role: 'img'}, host);
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

      text(20, 28, 'Infinia', 'heading');
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
        const end = mobile ? [b.x, b.y - cardHeight / 2] : [b.x - b.w / 2, b.y];
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
    return {
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
        svg.remove();
      },
      ratio,
      step: () => index,
    };
  }

  (window.SSAnim ||= {})['d-addr'] = {steps: 5, mount};
})();
