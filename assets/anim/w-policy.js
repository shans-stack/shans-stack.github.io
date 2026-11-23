(function () {
  const id = 'w-policy';
  const scenes = [
    ["一条策略关联两个文件系统|One policy attaches to two filesystems", "fork", [
      ["快照策略|Snapshot policy", ["调度与保留规则|Schedule and retention"], "plain", 0],
      ["文件系统 A|Filesystem A", ["独立恢复点|Recovery points"], "key", 1.45],
      ["文件系统 B|Filesystem B", ["独立恢复点|Recovery points"], "key", 1.9]
    ], [[0, 1, "", "signal", 0.4, 0], [0, 2, "", "signal", 0.85, 0]]],
    ["示例中的日计划触发一个恢复点|The daily schedule creates a recovery point in this example", "pair", [
      ["调度类型|Schedule types", ["小时、周、月|Hourly, weekly, monthly", "自定义时间间隔|Custom periodic interval", ["日计划|Daily schedule", "good", 0, 9, 2]], "plain", 0],
      ["恢复点|Recovery point", ["日快照|Daily snapshot"], "key", 1.45]
    ], [[0, 1, "到达触发时间|Scheduled time", "signal", 0.4, 0]]],
    ["周计划优先于同一时刻的日计划|A weekly schedule takes priority over an overlapping daily schedule", "join", [
      ["周计划|Weekly", ["优先执行|Takes priority"], "plain", 0],
      ["日计划|Daily", ["跳过|Skipped"], "muted", 0],
      ["同一时间点|Same point in time", ["周快照|Weekly snapshot"], "key", 1.45]
    ], [[0, 2, "", "signal", 0.4, 0], [1, 2, "", "idle", 0.4, 0]]],
    ["保留两个日快照时轮转最早一份|The oldest daily snapshot rotates out when retaining two", "pair", [
      ["原保留点|Before rotation", ["较早快照|Oldest snapshot", "近期快照|Recent snapshot"], "plain", 0],
      ["保留两个|Keep two", [["较早快照|Oldest snapshot", "out", 1.45, 9, 0], ["较早快照|Oldest snapshot", "plain", 0, 1.45, 0], ["近期快照|Recent snapshot", "plain", 0, 9, 1], ["新快照|New snapshot", "good", 1.45, 9, 2]], "key", 0]
    ], [[0, 1, "新快照加入|New snapshot", "signal", 0.4, 0]]],
    ["计划创建的快照经后台任务上传|A scheduled snapshot uploads in a background task", "pair", [
      ["策略快照|Policy snapshot", ["文件系统内的恢复点|Filesystem recovery point"], "plain", 0],
      ["已关联的对象桶|Attached bucket", ["上传副本|Uploaded copy"], "key", 1.45]
    ], [[0, 1, "后台上传|Background upload", "file", 0.4, 0]]]
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
  window.SSAnim[id] = {steps: 5, mount};
})();
