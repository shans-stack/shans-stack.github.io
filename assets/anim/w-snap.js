(function () {
  const id = 'w-snap';
  const scenes = [
    ["应用持续写入时捕获文件系统|Capture while the application continues writing", "chain", [
      ["应用|Application", ["持续写入|Writes continue"], "plain", 0],
      ["活动文件系统|Live filesystem", ["文件和元数据|Files and metadata"], "plain", 0],
      ["只读快照|Read-only snapshot", ["捕获时的视图|View at capture time"], "key", 1.45]
    ], [[0, 1, "", "file", [0.1, 2.4, 4.4], 0], [1, 2, "", "signal", 0.4, 0]]],
    ["活动状态和快照共用 A，保留不同版本的 B|The live state and snapshot share A and reference different versions of B", "versions", [
      ["活动文件系统|Live filesystem", ["A、B′|A, B′"], "plain", 0],
      ["只读快照|Snapshot", ["A、B|A, B"], "plain", 0],
      ["B′", ["新版本|New"], "plain", 0],
      ["A", ["共享|Shared"], "key", 0],
      ["B", ["旧版本|Old"], "plain", 0]
    ], [[0, 2, "", "signal", 1.5, 0], [0, 3, "", "signal", 0.4, 0], [1, 3, "", "signal", 0.65, 0], [1, 4, "", "signal", 1.5, 0]]],
    ["快照中的文件被复制到活动状态|Copy a file from the snapshot to the live filesystem", "pair", [
      [".snapshots", ["旧版 a.txt|Older a.txt"], "plain", 0],
      ["活动文件系统|Live filesystem", [["a.txt 缺失|a.txt missing", "plain", 0, 1.45, 0], ["a.txt 已取回|a.txt recovered", "good", 1.45, 9, 0], ["b.txt 保留|b.txt unchanged", "plain", 0, 9, 1]], "key", 0]
    ], [[0, 1, "复制单个文件|Copy one file", "file", 0.4, 0]]],
    ["只读历史视图和可写工作分支|Read-only history and writable working branch", "pair", [
      ["只读快照|Read-only snapshot", ["历史状态 · A、B|Saved state · A, B"], "plain", 0],
      ["可写克隆|Writable clone", [["初始 · A、B|Initial · A, B", "plain", 0, 2.55, 0], ["写入后 · A、B′|After write · A, B′", "good", 2.55, 9, 0], ["独立访问点|Own access point", "plain", 0, 9, 1]], "key", 1.45]
    ], [[0, 1, "派生|Duplicate", "signal", 0.4, 0]]],
    ["克隆保持可写，另建快照保存 B′|The clone stays writable and a new snapshot preserves B′", "pair", [
      ["可写克隆|Writable clone", ["当前状态 · A、B′|Current state · A, B′", "仍可写入|Still writable"], "plain", 0],
      ["新只读快照|New read-only snapshot", ["保留 · A、B′|Preserved · A, B′"], "key", 1.45]
    ], [[0, 1, "捕获|Capture", "signal", 0.4, 0]]],
    ["另建的只读快照可以上传，可写克隆保留在文件系统|Upload the new read-only snapshot while the writable clone stays in the filesystem", "join", [
      ["只读快照|Snapshot", ["时间点 · A、B′|Saved · A, B′"], "plain", 0],
      ["可写克隆|Writable clone", ["不参与上传|Excluded"], "muted", 0],
      ["对象存储|Object store", [["等待上传|Awaiting upload", "plain", 0, 1.45, 0], ["已保存 · A、B′|Stored · A, B′", "good", 1.45, 9, 0]], "key", 0]
    ], [[0, 2, "上传|Upload", "file", 0.4, 0], [1, 2, "", "idle", 0.4, 0]]],
    ["在 I/O 暂停时恢复目标文件系统|Restore the target while its I/O is paused", "join", [
      ["只读快照|Snapshot", ["数据和元数据|Data + metadata"], "plain", 0],
      ["应用 I/O|Application I/O", ["暂停|Paused"], "muted", 0],
      ["目标文件系统|Target filesystem", [["等待恢复|Awaiting restore", "plain", 0, 1.45, 0], ["快照状态已恢复|Snapshot state restored", "good", 1.45, 9, 0]], "key", 0]
    ], [[0, 2, "恢复|Restore", "file", 0.4, 0], [1, 2, "", "idle", 0.4, 0]]]
  ];
  const NS = 'http://www.w3.org/2000/svg';
  let mounts = 0;

  function mount(host, {onLayout, paused = false} = {}) {
    const narrow = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const marker = id + '-arrow-' + ++mounts;
    let index = 0, ratio, frame, last, elapsed, layers, signals;
    const svg = document.createElementNS(NS, 'svg');
    svg.classList.add(id + '-scene');
    svg.setAttribute('role', 'img');
    host.replaceChildren(svg);

    function add(tag, attrs, parent = svg) {
      const node = document.createElementNS(NS, tag);
      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
      parent.append(node);
      return node;
    }

    function render() {
      const mobile = narrow.matches;
      const language = window.SS_LANG === 'en' ? 1 : 0;
      const t = value => value.split('|')[language] ?? value;
      const [caption, layout, cards, links] = scenes[index];
      const [width, height] = mobile ? [370, 430] : [848, 324];
      ratio = width / height;
      svg.replaceChildren();
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      svg.setAttribute('aria-label', t(caption));
      layers = [];
      signals = [];
      const defs = add('defs', {});
      const arrow = add('marker', {id: marker, viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 6, markerHeight: 6, orient: 'auto'}, defs);
      add('path', {d: 'M1 1 L7 4 L1 7', fill: 'none', stroke: 'context-stroke', 'stroke-width': 1.5}, arrow);

      const pair = (a, b) => mobile ? [[185, a, 234], [185, b, 234]] : [[199, 148, 240], [649, 148, 240]];
      const plan = {
        pair: pair(100, 305),
        chain: mobile ? [[185, 63, 234], [185, 202, 234], [185, 333, 234]] : [[140, 148, 218], [424, 148, 218], [708, 148, 218]],
        join: mobile ? [[96, 87, 164], [274, 87, 164], [185, 303, 244]] : [[159, 84, 230], [159, 225, 230], [683, 154, 250]],
        fork: mobile ? [[185, 88, 244], [96, 304, 164], [274, 304, 164]] : [[159, 154, 250], [683, 84, 230], [683, 225, 230]],
        versions: mobile ? [[96, 86, 164], [274, 86, 164], [65, 304, 100], [185, 304, 100], [305, 304, 100]] : [[159, 86, 230], [159, 224, 230], [690, 58, 218], [690, 155, 218], [690, 252, 218]]
      }[layout];
      const boxes = cards.map(([title, entries], i) => {
        const [x, y, w] = plan[i];
        const rows = entries.reduce((count, entry, j) => Math.max(count, (Array.isArray(entry) ? entry[4] : j) + 1), 0);
        return {x, y, w, h: 25 + (title ? 30 : 0) + rows * 23};
      });

      links.forEach(([a, b, label, kind = 'signal', delay = 0.4, shift = 0]) => {
        const from = boxes[a], to = boxes[b], vertical = mobile;
        const axis = vertical ? 'y' : 'x', cross = vertical ? 'x' : 'y', extent = vertical ? 'h' : 'w';
        const sign = Math.sign(to[axis] - from[axis]);
        const start = from[axis] + sign * (from[extent] / 2 + 5);
        const end = to[axis] - sign * (to[extent] / 2 + 5);
        const mid = (start + end) / 2;
        const lane = mobile ? shift : shift * 0.48;
        const u = from[cross] + lane;
        const fanIn = layout === 'join' && links.length === 2;
        const sharedBlock = layout === 'versions' && b === 3;
        const offset = (a === 0 ? -1 : 1) * (fanIn ? (mobile ? 45 : 17) : sharedBlock ? 19 : 0);
        const v = to[cross] + lane + offset;
        const pt = (along, across) => vertical ? across + ' ' + along : along + ' ' + across;
        const d = 'M' + pt(start, u) + ' L' + pt(mid, u) + ' L' + pt(mid, v) + ' L' + pt(end, v);
        const path = add('path', {d, class: id + '-path ' + id + '-' + kind, 'marker-end': 'url(#' + marker + ')'});
        if (label) {
          const x = mobile && shift ? (shift < 0 ? -10 : 10) : 0;
          const pos = vertical
            ? {x: fanIn ? u : (u + v) / 2 + x, y: mid - (fanIn ? 20 : 3)}
            : {x: fanIn ? (start + mid) / 2 : mid, y: (fanIn ? u : (u + v) / 2) - 13};
          const text = add('text', {...pos, 'text-anchor': mobile && shift ? (shift < 0 ? 'end' : 'start') : 'middle', class: id + '-link'});
          text.textContent = t(label);
        }
        if (kind === 'idle') return;
        for (const when of [].concat(delay)) {
          const block = kind === 'file' || kind === 'meta';
          const packet = block
            ? add('rect', {x: -6, y: -6, width: 12, height: 12, rx: 2, class: id + '-packet ' + id + '-' + kind})
            : add('circle', {r: 4.5, class: id + '-packet ' + id + '-signal'});
          signals.push({path, packet, length: path.getTotalLength(), delay: when});
        }
      });

      cards.forEach(([title, entries, tone = 'plain', appearance = 0], i) => {
        const {x, y, w, h} = boxes[i];
        const left = x - w / 2, top = y - h / 2;
        const group = add('g', {class: id + '-' + tone});
        layers.push([group, appearance, 9]);
        add('rect', {x: left, y: top, width: w, height: h, rx: 5, class: id + '-card'}, group);
        if (title) add('text', {x: left + 16, y: top + 24, class: id + '-title'}, group).textContent = t(title);
        entries.forEach((entry, j) => {
          const [value, style = 'plain', show = 0, hide = 9, row = j] = typeof entry === 'string' ? [entry] : entry;
          const line = add('text', {x: left + 16, y: top + (title ? 52 : 24) + 23 * row, class: id + '-row ' + id + '-' + style}, group);
          line.textContent = t(value);
          layers.push([line, show, hide]);
        });
      });
      add('text', {x: width / 2, y: height - 16, 'text-anchor': 'middle', class: id + '-note'}).textContent =
        t('示意，不代表实测数字|Illustrative. No measured values.');
      onLayout?.(ratio, mobile);
      paint(reduced.matches ? 5 : elapsed % 7);
    }

    function paint(time) {
      for (const [node, show, hide] of layers) {
        const visible = time >= show && time < hide;
        const opacity = visible && show > 0 ? Math.min(1, (time - show) / 0.18) : Number(visible);
        node.setAttribute('opacity', opacity);
      }
      for (const {path, packet, length, delay} of signals) {
        const progress = (time - delay) / 1.05;
        packet.setAttribute('opacity', !reduced.matches && progress >= 0 && progress < 1 ? 1 : 0);
        if (progress < 0 || progress >= 1) continue;
        const point = path.getPointAtLength(length * progress);
        packet.setAttribute('transform', 'translate(' + point.x + ' ' + point.y + ')');
      }
    }

    function tick(now) {
      elapsed += Math.max(0, (now - last) / 1000);
      last = now;
      paint(elapsed % 7);
      frame = requestAnimationFrame(tick);
    }

    function refresh() {
      cancelAnimationFrame(frame);
      render();
      if (paused || reduced.matches) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }

    const changes = [narrow, reduced];
    changes.forEach(query => query.addEventListener('change', refresh));
    document.addEventListener('ss-lang', refresh);
    const control = {
      show(i) { index = Math.max(0, Math.min(scenes.length - 1, i)); elapsed = 0; refresh(); },
      pause() { paused = true; cancelAnimationFrame(frame); },
      resume() { if (paused) { paused = false; refresh(); } },
      destroy() {
        cancelAnimationFrame(frame);
        changes.forEach(query => query.removeEventListener('change', refresh));
        document.removeEventListener('ss-lang', refresh);
        svg.remove();
        delete host.__anim;
      },
      ratio() { return ratio; },
      step() { return index; }
    };
    host.__anim = control;
    control.show(0);
    return control;
  }

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = {steps: 7, mount};
})();
