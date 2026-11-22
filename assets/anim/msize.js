// Topic animation interface. The page owns navigation and pauses off-screen figures.
(() => {
const ID = 'msize';
const EN = {
  "示意，不代表实测数字": "Schematic, not measured",
  "同格式权重按每项字节数计": "Weight storage follows bytes per value",
  "可学习参数": "Learned parameters",
  "存储格式": "Storage format",
  "每个值两字节": "Two bytes per value",
  "权重存储量": "Weight storage",
  "参数数 × 每项字节数": "Count × bytes per value",
  "混合格式按组计算后相加": "Mixed formats are counted by group, then added",
  "训练和推理需要不同的显存组成": "Training and inference allocate different memory",
  "训练": "Training",
  "权重": "Weights",
  "梯度": "Gradients",
  "激活": "Activations",
  "另含优化器状态": "Plus optimizer state",
  "生成推理": "Generation",
  "随保留的序列增长": "Cache grows with sequence length",
  "两侧均需临时缓冲": "Both need temporary buffers",
  "数据并行保留完整副本并同步梯度": "Data parallelism keeps full replicas and synchronizes gradients",
  "张量并行让多张卡合算一层": "Tensor parallelism splits work within a layer",
  "微批次沿不同 GPU 阶段重叠执行": "Microbatches overlap across pipeline stages",
  "首组层": "First layers",
  "中间层": "Middle layers",
  "末组层": "Final layers",
  "计算 A": "Process A",
  "计算 B": "Process B",
  "空闲": "Idle",
  "已完成": "Complete",
  "A、B 是先后进入的微批次": "A and B mark consecutive microbatches",
  "最大单卡峰值决定是否放得下": "The highest per-GPU peak determines whether the model fits",
  "占用很高": "High usage",
  "占用较低": "Lower usage",
  "左至右：权重、运行状态、临时缓冲": "Left to right: weights, runtime state, buffers",
  "拆分训练批次": "Split the batch",
  "切分同层矩阵": "Split one weight matrix",
  "完整权重 W": "Full weights W",
  "局部梯度": "Local gradients",
  "局部结果": "Local result",
  "梯度归约": "Gradient reduction",
  "拼接结果": "Concatenate results",
  "同步更新两个副本": "Same update on both replicas",
  "归约后的梯度回到两张卡": "Reduced gradients return to both GPUs",
  "此例沿输出列切分": "This example partitions output columns",
};
const T = text => window.SS_LANG === 'en' ? (EN[text] ?? text) : text;
const SCENES = [
  ["同格式权重按每项字节数计", ({ flow, note }) => {
    flow([
      ["可学习参数", ["w₁", "w₂", "w₃"]],
      ["存储格式", "BF16", "每个值两字节"],
      ["权重存储量", "参数数 × 每项字节数"]
    ]);
    note("混合格式按组计算后相加");
  }],
  ["训练和推理需要不同的显存组成", ({ flow, note }) => {
    flow([
      ["训练", [["权重", 66], ["梯度", 83], ["激活", 90]], "另含优化器状态"],
      ["生成推理", [["权重", 66], ["KV Cache", 90, "cool"]], "随保留的序列增长"]
    ], { link: false });
    note("两侧均需临时缓冲");
  }],
  ["数据并行保留完整副本并同步梯度", parallel],
  ["张量并行让多张卡合算一层", parallel],
  ["微批次沿不同 GPU 阶段重叠执行", ({ mobile, card, wire, travel, note, label, update }) => {
    const positions = mobile ? [[200, 79], [200, 253], [200, 427]] : [[154, 166], [480, 166], [806, 166]];
    const links = mobile
      ? [[[200, 137], [200, 195]], [[200, 311], [200, 369]]]
      : [[[290, 166], [344, 166]], [[616, 166], [670, 166]]];
    links.forEach((points, i) => {
      const track = wire(points);
      travel(track, 0.32 + i * 1.02, 0.83 + i * 1.02);
      travel(track, 1.62 + i * 1.02, 2.13 + i * 1.02, 'cool');
    });
    positions.forEach(([x, y], i) => {
      const group = card([x, y], ['GPU A', 'GPU B', 'GPU C'][i], '', [
        "首组层", "中间层", "末组层"
      ][i]);
      const status = label(x, y + 1, '', 'value', group);
      const starts = [i * 1.02, 1.3 + i * 1.02];
      update(t => {
        const at = starts.findIndex(start => t >= start && t < start + 1.02);
        const message = at === 0 ? "计算 A" : at === 1 ? "计算 B" : "空闲";
        status.textContent = T(t > 3.85 ? "已完成" : message);
      });
    });
    note("A、B 是先后进入的微批次");
  }],
  ["最大单卡峰值决定是否放得下", ({ mobile, card, box, reveal, note }) => {
    const centers = mobile ? [[200, 79], [200, 253], [200, 427]] : [[154, 166], [480, 166], [806, 166]];
    const amounts = [[75, 57, 24], [68, 70, 87], [62, 73, 35]];
    centers.forEach(([x, y], i) => {
      const group = card([x, y], ['GPU A', 'GPU B', 'GPU C'][i], '', i === 1 ? "占用很高" : "占用较低");
      box(x - 113, y - 7, 226, 16, '', group);
      let left = x - 113;
      amounts[i].forEach((w, j) => {
        const bar = box(left, y - 7, w, 16, j === 2 && i === 1 ? 'busy' : ['active', 'cool', 'ready'][j], group);
        left += w;
        if (j === 2) reveal(bar, 1.2 + i * 0.24);
      });
    });
    note("左至右：权重、运行状态、临时缓冲");
  }]
];

function parallel({ mobile, card, box, label, wire, travel, reveal, step, note }) {
  const dp = step === 2;
  const source = mobile ? [200, 79] : [154, 166];
  const target = mobile ? [200, 427] : [806, 166];
  const gpus = mobile ? [[111, 253], [289, 253]] : [[480, 92], [480, 240]];
  gpus.forEach(([x, y], i) => {
    const enter = mobile
      ? [[200, 137], [200, 165], [x, 165], [x, 207]]
      : [[290, 166], [312, 166], [312, y], [365, y]];
    const exit = mobile
      ? [[x, 299], [x, 340], [200, 340], [200, 369]]
      : [[595, y], [648, y], [648, 166], [670, 166]];
    const tone = i ? 'cool' : 'active';
    travel(wire(enter, tone), 0.4 + i * 0.18, 1.65 + i * 0.18, tone);
    travel(wire(exit, tone), 1.8 + i * 0.17, 2.9 + i * 0.17, tone);
    if (dp) travel(wire(exit.toReversed(), 'ready', false), 3.1, 4.0, 'ready');
  });
  card(source, dp ? "拆分训练批次" : "切分同层矩阵",
    dp ? [["A", 48], ["B", 48, "cool"]] : [["W₁", 54], ["W₂", 54, "cool"]]);
  gpus.forEach(([x, y], i) => {
    const w = mobile ? 155 : 230;
    box(x - w / 2, y - 46, w, 92, i ? 'cool' : 'active');
    label(x, y - 21, i ? 'GPU B' : 'GPU A', 'heading');
    label(x, y + 4, dp ? "完整权重 W" : i ? "W₂" : "W₁");
    label(x, y + 27, dp ? "局部梯度" : "局部结果", 'muted');
  });
  reveal(card(target, dp ? "梯度归约" : "拼接结果",
    dp ? "同步更新两个副本" : "Y = [Y₁  Y₂]", undefined, 'ready'), 2.25);
  note(dp ? "归约后的梯度回到两张卡" : "此例沿输出列切分");
}
const duration = 5.4;
const clamp = n => Math.min(1, Math.max(0, n));

function mount(host, { onLayout, paused = false } = {}) {
  const narrow = matchMedia('(max-width: 640px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  host.classList.add(ID + '-figure');
  host.replaceChildren(svg);
  svg.setAttribute('role', 'img');

  let step = 0, raf, last, time, draws, mobile, width, height;

  function el(tag, attrs, parent = svg) {
    const node = document.createElementNS(svg.namespaceURI, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key,
      key === 'class' ? value.split(' ').filter(Boolean).map(name => ID + '-' + name).join(' ') : value);
    parent.append(node);
    return node;
  }
  function label(x, y, content, tone = '', parent = svg) {
    const node = el('text', { x, y, class: tone }, parent);
    node.textContent = T(content);
    return node;
  }
  function box(x, y, w, h, tone = '', parent = svg) {
    return el('rect', { x, y, width: w, height: h, rx: 5, class: 'box ' + tone }, parent);
  }
  function chips(x, y, items, parent = svg) {
    const widths = items.map(item => Array.isArray(item) ? item[1] : 48);
    let left = x - (widths.reduce((a, b) => a + b, 0) + (items.length - 1) * 6) / 2;
    items.forEach((item, i) => {
      const [content, w, tone = 'active'] = Array.isArray(item) ? item : [item, widths[i]];
      box(left, y - 15, w, 30, tone, parent);
      label(left + w / 2, y, content, tone === 'idle' ? 'muted' : '', parent);
      left += w + 6;
    });
  }
  function card([x, y], title, items, detail, tone = '', w = mobile ? 322 : 272) {
    const group = el('g', {});
    box(x - w / 2, y - 58, w, 116, tone, group);
    label(x, y - 33, title, 'heading', group);
    if (Array.isArray(items)) chips(x, y + 1, items, group);
    else if (items) label(x, y + 1, items, 'value', group);
    if (detail) label(x, y + 35, detail, 'muted', group);
    return group;
  }
  function reveal(node, at) {
    draws.push(t => { node.style.opacity = 0.24 + 0.76 * clamp((t - at) / 0.35); });
  }
  function wire(points, tone = '', arrow = true) {
    const path = el('path', {
      d: points.map(([x, y], i) => (i ? 'L' : 'M') + x + ' ' + y).join(' '),
      class: 'wire ' + tone
    });
    if (arrow) {
      const [x, y] = points.at(-1);
      const [sx, sy] = points.at(-2);
      const angle = Math.atan2(y - sy, x - sx) * 180 / Math.PI;
      el('path', { d: 'M-8,-4 0,0 -8,4', class: 'wire ' + tone,
        transform: `translate(${x} ${y}) rotate(${angle})` });
    }
    return path;
  }
  function travel(path, start, end, tone = '') {
    const dot = box(-7, -5, 14, 10, 'packet ' + tone);
    const length = path.getTotalLength();
    draws.push(t => {
      const progress = clamp((t - start) / (end - start));
      const { x, y } = path.getPointAtLength(length * progress);
      dot.setAttribute('transform', `translate(${x} ${y})`);
      dot.style.opacity = Math.min(clamp((t - start) / 0.12), clamp((end - t) / 0.16));
    });
  }
  function route(from, to, w = mobile ? 322 : 272) {
    const [x, y] = from, [tx, ty] = to;
    return mobile ? [[x, y + 58], [tx, ty - 58]] : [[x + w / 2, y], [tx - w / 2, ty]];
  }
  function flow(nodes, { link = true, result = true } = {}) {
    const points = mobile
      ? (nodes.length === 3 ? [[200, 79], [200, 253], [200, 427]] : [[200, 143], [200, 368]])
      : (nodes.length === 3 ? [[154, 166], [480, 166], [806, 166]] : [[294, 166], [666, 166]]);
    if (link) {
      points.slice(1).forEach((point, i) => {
        const path = wire(route(points[i], point));
        travel(path, 0.45 + 1.15 * i, 1.4 + 1.15 * i);
      });
    }
    return nodes.map((node, i) => {
      const group = card(points[i], ...node);
      if (link && result && i) reveal(group, 0.9 + i * 0.75);
      return group;
    });
  }
  function note(text) {
    label(width / 2, mobile ? 507 : 292, text, 'muted');
  }

  function draw() {
    cancelAnimationFrame(raf);
    mobile = narrow.matches;
    width = mobile ? 400 : 960;
    height = mobile ? 544 : 334;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.dataset.step = step + 1;
    svg.setAttribute('aria-label', T(SCENES[step][0]));
    svg.replaceChildren();
    draws = [];
    SCENES[step][1]({ card, box, label, wire, travel, reveal, flow, note, update: callback => draws.push(callback), mobile, step });
    label(width / 2, height - 13, '示意，不代表实测数字', 'muted');
    time = reduced.matches ? 4.6 : 0;
    draws.forEach(update => update(time));
    run();
  }
  function loop(now) {
    time = (time + Math.max(0, Math.min(0.05, (now - last) / 1000))) % duration;
    last = now;
    draws.forEach(update => update(time));
    raf = requestAnimationFrame(loop);
  }
  function run() {
    cancelAnimationFrame(raf);
    if (paused || reduced.matches || !draws.length) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function resize() {
    draw();
    onLayout?.(width / height, mobile);
  }
  narrow.addEventListener('change', resize);
  reduced.addEventListener('change', draw);
  document.addEventListener('ss-lang', draw);
  const controller = {
    show(i) { step = Math.max(0, Math.min(SCENES.length - 1, i)); draw(); },
    pause() { paused = true; cancelAnimationFrame(raf); },
    resume() { paused = false; run(); },
    destroy() {
      cancelAnimationFrame(raf);
      narrow.removeEventListener('change', resize);
      reduced.removeEventListener('change', draw);
      document.removeEventListener('ss-lang', draw);
      host.replaceChildren();
      host.classList.remove(ID + '-figure');
      delete host.__anim;
    },
    ratio() { return width / height; },
    step() { return step; }
  };
  host.__anim = controller;
  resize();
  return controller;
}

window.SSAnim = window.SSAnim || {};
window.SSAnim[ID] = { steps: SCENES.length, mount };
})();
