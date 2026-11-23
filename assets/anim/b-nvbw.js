(() => {
'use strict';
const id = 'b-nvbw';
const scenes = [
  {"kind": "chain", "cards": [[["主机内存", "Host Memory"], ["CPU 端点", "Host Endpoint"], ""], [["GPU A 显存", "GPU A Memory"], ["设备端点", "Device Endpoint"], ""], [["GPU B 显存", "GPU B Memory"], ["设备端点", "Device Endpoint"], ""]], "mode": "separate"},
  {"kind": "route", "ends": [["源显存", "Source GPU"], ["目标显存", "Destination GPU"]], "lanes": [["CE · 拷贝引擎", "CE · Copy Engine"], ["SM · GPU 内核", "SM · GPU Kernel"]], "mode": "methods", "limit": null},
  {"kind": "chain", "cards": [[["测试用例", "Test Case"], ["设备对与方向", "Pair and Direction"], ""], [["拷贝缓冲区", "Copy Buffer"], ["容量与采样次数", "Size and Sample Count"], ""], [["CUDA 事件", "CUDA Events"], ["开始 → 拷贝 → 结束", "Start → Copy → Stop"], "good"]], "mode": "sequence"},
  {"kind": "grid", "mode": "bandwidth"},
  {"kind": "route", "ends": [["源显存", "Source GPU"], ["目标显存", "Destination GPU"]], "lanes": [["测量流", "Measured Stream"], ["反向流", "Reverse Stream"]], "mode": "parallel", "limit": ["记录测量方向", "Report the Measured Direction"]},
  {"kind": "rows", "head": [["对照项", "Match"], ["记录 A", "Run A"], ["记录 B", "Run B"]], "rows": [[["路径", "Path"], ["同一端点对", "Same Pair"], ["同一方向", "Same Direction"], "good"], [["拷贝", "Copy"], ["同一用例", "Same Case"], ["同一容量", "Same Size"], "good"], [["统计", "Statistic"], ["中位数", "Median"], ["均值", "Mean"], "warn"], [["拓扑", "Topology"], ["节点内", "Local"], ["跨节点", "Multi-Node"], "warn"]]}
];
const titles = [
  ["nvbandwidth 将主机内存和 GPU 显存之间的拷贝路径拆开测量。", "nvbandwidth measures individual copy paths between host and GPU memory endpoints."],
  ["CE 使用专用拷贝引擎，SM 使用 GPU 内核进行读写。", "CE uses a copy engine, while SM runs a GPU kernel to perform the copy."],
  ["用例决定路径，缓冲区大小和重复采样参数决定测量方式。", "The test case defines the path, and buffer size and repeated samples define the measurement."],
  ["按输出标题定位行、列和方向，每个有效单元格对应一对端点。", "The output heading identifies rows, columns, and direction, and each valid cell corresponds to one pair."],
  ["两个方向并发传输，双向用例报告并发条件下的单方向带宽。", "Traffic moves concurrently in both directions, and the result describes one direction under that load."],
  ["同名用例还需对齐设备标识、方向、缓冲区大小和统计方式。", "Matched test names still require the same endpoint identities, direction, buffer size, and statistic."]
];

function mount(host, {onLayout, paused = false} = {}) {
  const mobileQuery = matchMedia('(max-width: 640px)');
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let step = 0, frame, last, elapsed, effects, svg, w, h, mobile;

  function element(tag, attrs, parent = svg) {
    const item = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) item.setAttribute(key, value);
    parent.append(item);
    return item;
  }

  const local = pair => pair[window.SS_LANG === 'en' ? 1 : 0];
  function label(x, y, pair, className = '', anchor = 'middle') {
    const item = element('text', {x, y, class: className, 'text-anchor': anchor});
    item.textContent = local(pair);
    return item;
  }

  function rect(x, y, width, height, className, rx = 7) {
    return element('rect', {x, y, width, height, rx, class: className});
  }

  function path(points, className = 'connection') {
    return element('path', {d: points.map(([x, y], i) => (i ? 'L' : 'M') + x + ' ' + y).join(' '), class: className});
  }

  function arrow(points, tone = '') {
    const line = path(points, 'connection ' + tone);
    const length = line.getTotalLength();
    const end = line.getPointAtLength(length);
    const back = line.getPointAtLength(length - 1);
    const angle = Math.atan2(end.y - back.y, end.x - back.x) * 180 / Math.PI;
    element('path', {d: 'M -7 -4 L 0 0 L -7 4', class: 'connection ' + tone,
      transform: 'translate(' + end.x + ' ' + end.y + ') rotate(' + angle + ')'});
    return line;
  }

  function packet(line, offset = 0, tone = '', span = 2.1) {
    const block = rect(-6, -4, 12, 8, 'packet ' + tone, 2);
    const length = line.getTotalLength();
    effects.push(time => {
      const age = (time + 6 - offset) % 6;
      const progress = Math.min(1, age / span);
      const point = line.getPointAtLength(length * progress);
      const fade = Math.max(0, Math.min(1, age / 0.23, (span + 0.46 - age) / 0.23));
      block.setAttribute('transform', 'translate(' + point.x + ' ' + point.y + ')');
      block.setAttribute('opacity', motionQuery.matches ? 1 : fade);
    });
  }

  function highlight(item, index, count) {
    effects.push(time => {
      if (motionQuery.matches) {
        item.setAttribute('opacity', index === count - 1 ? 0.75 : 0);
        return;
      }
      const pos = (time % 6) * count / 6;
      const strength = Math.max(0, 1 - Math.abs(pos - index - 0.5) * 2);
      item.setAttribute('opacity', 0.12 + strength * 0.88);
    });
  }

  function rebuild() {
    cancelAnimationFrame(frame);
    mobile = mobileQuery.matches;
    [w, h] = mobile ? [360, 420] : [760, 322];
    effects = [];
    host.replaceChildren();
    svg = element('svg', {viewBox: '0 0 ' + w + ' ' + h, role: 'img', 'data-step': step + 1,
      'aria-label': local(titles[step]) + ' · ' + local(['示意，不代表实测数字', 'Schematic, no measured values'])}, host);
    draw[scenes[step].kind](scenes[step]);
    label(w / 2, h - 18, ['示意，不代表实测数字', 'Schematic, no measured values'], 'caption');
    elapsed = motionQuery.matches ? 2.05 : 0;
    paint();
    onLayout?.(w / h, mobile);
    run();
  }

  function paint() {
    for (const update of effects) update(elapsed % 6);
  }

  function tick(now) {
    elapsed += Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    paint();
    frame = requestAnimationFrame(tick);
  }

  function run() {
    if (paused || motionQuery.matches || effects.length === 0) return;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }

  function chain(scene) {
    const width = mobile ? 250 : 218, height = 76;
    const centers = mobile ? [[180, 62], [180, 187], [180, 312]] : [[133, 151], [380, 151], [627, 151]];
    const connectors = [];
    for (let i = 0; i < centers.length - 1; i++) {
      if (scene.mode === 'scope' || (scene.mode === 'partial' && i > 0)) continue;
      const [x, y] = centers[i], [nx, ny] = centers[i + 1];
      const points = mobile ? [[x, y + height / 2], [nx, ny - height / 2]] :
        [[x + width / 2, y], [nx - width / 2, ny]];
      connectors.push(arrow(points));
      if (scene.mode === 'separate') {
        connectors.push(arrow(points.map(([px, py]) => mobile ? [px + 24, py] : [px, py + 24]).reverse(), 'secondary'));
      }
    }
    scene.cards.forEach(([title, detail, tone], i) => {
      const [x, y] = centers[i];
      const left = x - width / 2;
      rect(left, y - height / 2, width, height, 'card ' + tone);
      if (tone !== 'muted') {
        const active = rect(left + 1, y - height / 2 + 1, 4, height - 2, 'emphasis', 2);
        highlight(active, i, centers.length);
      }
      label(x, y - 9, title, 'strong card-label');
      label(x, y + 16, detail, 'secondary-text card-label');
      if (scene.mode === 'separate') rect(left + 14, y + 23, 12, 8, 'packet', 2);
      if (tone === 'matrix') {
        for (let k = 0; k < 9; k++) {
          rect(left + 10 + (k % 3) * 6, y + 22 + Math.floor(k / 3) * 5, 4, 3, 'tile tile-' + (k % 4), 0);
        }
      }
    });
    if (['copy', 'separate', 'partial'].includes(scene.mode)) {
      connectors.forEach((line, i) => {
        const offset = scene.mode === 'separate' ? 0.3 + 1.4 * i : scene.mode === 'copy' ? 0.9 + 2.3 * i : 0.9;
        packet(line, offset, line.classList.contains('secondary') ? 'secondary' : '', 1.15);
      });
      if (scene.mode === 'copy') {
        const [x, y] = centers[1];
        rect(x - 6, y + 26, 12, 7, 'packet', 2);
      }
    }
  }
  function route(scene) {
    const [a, b] = scene.ends;
    const x1 = mobile ? 60 : 104, x2 = w - x1;
    const y1 = mobile ? 52 : 139, y2 = mobile ? 322 : y1;
    const width = mobile ? w - 80 : 160;
    rect(mobile ? 40 : x1 - width / 2, y1 - 25, width, 50, 'card');
    rect(mobile ? 40 : x2 - width / 2, y2 - 25, width, 50, 'card');
    label(mobile ? w / 2 : x1, y1, a, 'strong card-label');
    label(mobile ? w / 2 : x2, y2, b, 'strong card-label');
    scene.lanes.forEach((title, i) => {
      const reverse = i === 1 && scene.mode !== 'methods';
      const offset = scene.lanes.length === 1 ? 0 : (i === 0 ? -21 : 21);
      const x = mobile ? (i === 0 ? 64 : 91) : w / 2;
      const points = mobile ? [[x, y1 + 26], [x, y2 - 26]] : [[x1 + 82, y1 + offset], [x2 - 82, y2 + offset]];
      const load = i === 0 ? '' : 'secondary';
      const line = arrow(reverse ? points.reverse() : points, load);
      const t = scene.mode === 'return' && i === 1 ? 2.65 : 0.55;
      packet(line, t, load);
      if (scene.mode === 'stream') {
        packet(line, 1.1);
        packet(line, 1.65);
      }
      label(mobile ? 210 : x, mobile ? (scene.lanes.length === 1 ? 179 : 147 + i * 82) :
        (i === 0 ? y1 + offset - 22 : y1 + offset + 22), title, 'strong');
    });
    if (scene.mode === 'write') {
      rect(mobile ? 58 : x1 + 58, mobile ? y1 + 10 : y1 - 4, 12, 8, 'packet', 2);
    }
    if (scene.limit) label(w / 2, mobile ? 367 : 240, scene.limit, 'secondary-text');
  }
  function grid(scene) {
    if (scene.mode === 'blocks') {
      const layouts = mobile ? [[180, 90], [180, 282]] : [[224, 148], [536, 148]];
      const names = [['矩阵 A · 循环归属','Matrix A · Cyclic Ownership'], ['进程网格 P × Q','Process Grid P × Q']];
      const connection = mobile ? [[180, 194], [180, 224]] : [[321, 148], [457, 148]];
      arrow(connection);
      layouts.forEach(([x, y], i) => {
        const count = i === 0 ? 4 : 2;
        const size = i === 0 ? 30 : 43, gap = 5;
        const span = (size + gap) * count - gap, left = x - span / 2, top = y - span / 2 + 23;
        label(x, top - 19, names[i], 'strong');
        for (let row = 0; row < count; row++) {
          for (let col = 0; col < count; col++) {
            const rank = (row % 2) * 2 + col % 2;
            const tx = left + col * (size + gap), ty = top + row * (size + gap);
            rect(tx, ty, size, size, 'tile tile-' + rank, 3);
            label(tx + size / 2, ty + size / 2, ['P' + rank, 'P' + rank], 'tile-text');
            highlight(rect(tx, ty + size - 3, size, 3, 'emphasis', 1), rank, 4);
          }
        }
      });
      return;
    }
    const origin = mobile ? [55, 130] : [188, 113];
    const dx = mobile ? 83 : 158, dy = 57;
    label(w / 2, mobile ? 47 : 43, ['行 → 列 · 按设备对单测','Row → Column · One Pair at a Time'], 'strong');
    ['GPU A', 'GPU B', 'GPU C'].forEach((gpu, i) => label(origin[0] + dx * (i + 1), origin[1] - 23, [gpu, gpu], 'column'));
    ['GPU A', 'GPU B', 'GPU C'].forEach((gpu, row) => {
      const y = origin[1] + row * dy;
      label(origin[0] - 13, y + 16, [gpu, gpu], 'column');
      ['GPU A', 'GPU B', 'GPU C'].forEach((_, col) => {
        const inactive = row === col;
        const skipped = row === 0 && col === 2;
        const x = origin[0] + dx * (col + 1) - 38;
        rect(x, y - 5, 76, 42, inactive || skipped ? 'row muted' : 'row');
        const value = inactive ? ['—', '—'] : (skipped ? ['未测','Skipped'] : ['已测','Tested']);
        label(x + 38, y + 16, value, 'secondary-text');
        if (!inactive && !skipped) highlight(rect(x, y - 5, 4, 42, 'emphasis', 2), (row * 3 + col) % 6, 6);
      });
    });
  }
  function rows(scene) {
    const margin = mobile ? 12 : 40;
    const column = (w - margin * 2) / 3;
    const height = mobile ? 65 : 49;
    const top = (h - 36 - (scene.rows.length * height + 42)) / 2;
    scene.head.forEach((value, i) => label(margin + column * (i + 0.5), top + 16, value, 'column'));
    path([[margin, top + 36], [w - margin, top + 36]], 'rule');
    const activeCount = scene.rows.filter(row => row[3] !== 'muted').length;
    let activeIndex = 0;
    scene.rows.forEach(([a, b, c, tone = ''], index) => {
      const y = top + 43 + index * height;
      rect(margin, y, w - margin * 2, height - 7, 'row ' + tone);
      if (tone === 'muted-cell') rect(margin + 2 * column + 6, y + 5, column - 12, height - 17, 'muted', 5);
      if (tone !== 'muted') highlight(rect(margin, y, 4, height - 7, 'emphasis', 2), activeIndex++, activeCount);
      [a, b, c].forEach((value, i) => {
        const style = i === 0 ? 'strong' : (i === 2 && tone === 'warn' ? 'warn-text' : 'secondary-text');
        label(margin + column * (i + 0.5), y + (height - 7) / 2, value, style);
      });
    });
  }

  const draw = {chain, route, grid, rows};
  const queries = [mobileQuery, motionQuery];
  for (const query of queries) query.addEventListener('change', rebuild);
  document.addEventListener('ss-lang', rebuild);
  host.classList.add(id);
  const controller = {
    show(i) {
      step = Math.min(scenes.length - 1, Math.max(0, i));
      rebuild();
    },
    pause() { paused = true; cancelAnimationFrame(frame); },
    resume() {
      if (!paused) return;
      paused = false;
      run();
    },
    destroy() {
      controller.pause();
      for (const query of queries) query.removeEventListener('change', rebuild);
      document.removeEventListener('ss-lang', rebuild);
      host.replaceChildren();
      host.classList.remove(id);
      delete host.__anim;
    },
    ratio() { return w / h; },
    step() { return step; }
  };
  host.__anim = controller;
  rebuild();
  return controller;
}

window.SSAnim = window.SSAnim || {};
window.SSAnim[id] = {steps: 6, mount};
})();
