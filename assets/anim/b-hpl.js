(() => {
'use strict';
const id = 'b-hpl';
const scenes = [
  {"kind": "chain", "cards": [[["稠密矩阵 A", "Dense Matrix A"], ["右端项 b", "Right-Hand Side b"], "matrix"], [["FP64 求解", "FP64 Solve"], ["Ax = b", "Ax = b"], ""], [["解向量 x", "Solution Vector x"], ["记录求解耗时", "Record Solve Time"], "good"]], "mode": "sequence"},
  {"kind": "grid", "mode": "blocks"},
  {"kind": "chain", "cards": [[["分解面板", "Factor the Panel"], ["主元与行交换", "Pivot and Swap"], "matrix"], [["沿进程行广播", "Broadcast to Row"], ["保留面板数据", "Retain Panel Data"], ""], [["更新子矩阵", "Update Local Tiles"], ["各进程本地计算", "Local Updates"], "good"]], "mode": "copy"},
  {"kind": "launch"},
  {"kind": "rows", "head": [["输出项", "Field"], ["计算口径", "Basis"], ["用途", "Reading"]], "rows": [[["归一化残差", "Residual"], ["范数 ÷ 尺度", "Scaled Norm"], ["校验准确性", "Accuracy"], "good"], [["Rmax", "Rmax"], ["HPL 计时", "HPL Timing"], ["实测吞吐", "Measured"]], [["Rpeak", "Rpeak"], ["规格推算", "Theoretical"], ["理论峰值", "Peak"], "muted"]]},
  {"kind": "chain", "cards": [[["HPL 覆盖", "HPL Coverage"], ["FP64 稠密求解", "FP64 Dense Solve"], "good"], [["AI 训练", "AI Training"], ["独立工作负载", "Separate Workload"], "muted"], [["存储", "Storage"], ["独立 I/O 测试", "Separate I/O Test"], "muted"]], "mode": "scope"}
];
const titles = [
  ["HPL 对稠密方程组 Ax = b 求解，记录耗时与数值准确性。", "HPL solves a dense system Ax = b and records elapsed time and numerical accuracy."],
  ["矩阵块按二维循环规则分给 P × Q 个进程。", "A two-dimensional block-cyclic layout distributes matrix tiles across P × Q processes."],
  ["LU 分解逐个处理面板，广播分解结果，再更新余下矩阵。", "LU factorization processes a panel, broadcasts it, and updates the remaining matrix."],
  ["参考版由 MPI 启动 xhpl，HPL.dat 记录规模、网格与算法选项。", "MPI launches the reference xhpl executable, and HPL.dat supplies the size, grid, and algorithm settings."],
  ["残差确认解的准确性，FLOP/s 表示这次稠密求解的计算吞吐。", "The residual checks solution accuracy, and FLOP/s describes throughput for the dense solve."],
  ["HPL 的成绩适用于被测稠密双精度求解配置，AI 训练和存储性能需要独立工作负载。", "HPL applies to the FP64 dense solve under test. AI training and storage require their own workloads."]
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

  function launch() {
    const source = mobile ? [[92, 82], [268, 82]] : [[168, 87], [168, 212]];
    const target = mobile ? [180, 249] : [568, 150];
    const width = mobile ? 158 : 228;
    const descriptions = [
      [['MPI 启动器', 'MPI Launcher'], ['指定进程总数', 'Sets rank count'], ['启动', 'Launches']],
      [['HPL.dat', 'HPL.dat'], ['N · NB · P × Q', 'N · NB · P × Q'], ['xhpl 读取', 'xhpl reads']]
    ];
    descriptions.forEach(([title, detail, action], i) => {
      const [x, y] = source[i];
      const [tx, ty] = target;
      const end = mobile ? [tx + (i ? 40 : -40), ty - 38] : [tx - width / 2, ty + (i ? 18 : -18)];
      const points = mobile ? [[x, y + 38], [x, 139], [end[0], 139], end]
        : [[x + width / 2, y], [365, y], [365, end[1]], end];
      packet(arrow(points, i ? 'secondary' : ''), i ? 1.7 : .35, i ? 'secondary' : '', 1.15);
      rect(x - width / 2, y - 38, width, 76, 'card');
      label(x, y - 10, title, 'strong card-label');
      label(x, y + 16, detail, 'secondary-text card-label');
      label(mobile ? x : 318, mobile ? 160 : y - 20, action, 'secondary-text');
    });
    rect(target[0] - width / 2, target[1] - 38, width, 76, 'card good');
    label(target[0], target[1] - 9, ['xhpl', 'xhpl'], 'strong card-label');
    label(target[0], target[1] + 16, ['运行与校验', 'Run and Validate'], 'secondary-text card-label');
  }

  const draw = {chain, grid, rows, launch};
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
