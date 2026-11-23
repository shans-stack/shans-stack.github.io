// Topic animation interface. The page owns navigation and pauses off-screen figures.
(() => {
const ID = 'quant';
const EN = {
  "经 STE 回传": "Backprop via STE",
  "INT8 激活": "INT8 input",
  "BF16 激活": "BF16 input",
  "还原权重": "Dequantize",
  "示例：W8A8": "Example: W8A8",
  "示例：仅权重量化": "Example: weight-only",
  "整数算子": "Integer op",
  "浮点算子": "Float op",
  "权重 INT8": "INT8 weights",
  "示意，不代表实测数字": "Schematic, not measured",
  "相同数量权重使用更少位存储": "The same weight count uses fewer storage bits",
  "每项 8 位": "8 bits per weight",
  "每项 16 位": "16 bits per weight",
  "尺度等元数据另计": "Scale metadata is counted separately",
  "相邻原值映射到同一整数编码": "Nearby values round to one integer code",
  "切换权重量化与权重激活量化": "Compare weight-only and weight-plus-activation quantization",
  "权重": "Weights",
  "低位宽存储": "Low-bit storage",
  "激活": "Activations",
  "同步量化": "Also quantized",
  "保持较高精度": "Higher precision",
  "单独选择格式": "Independent format",
  "同时量化激活": "Quantize activations too",
  "校准样本决定静态激活量化的网格": "Calibration samples define a static activation grid",
  "样本激活": "Sample activations",
  "选定范围": "Selected range",
  "拟合尺度与零点": "Fit scale and zero point",
  "固定激活网格": "Fixed activation grid",
  "超出范围的值截到两个端点": "Out-of-range values clip to the endpoints",
  "前向模拟量化，反馈调整权重": "The forward pass simulates quantization and feedback updates weights",
  "两种低位宽权重计算路径": "Two execution paths for low-bit weights",
  "原始数值": "Original values",
  "舍入后编码": "Rounded code",
  "尺度 0.25 · 零点 0": "Scale 0.25 · zero point 0",
  "解量化近似值": "Dequantized value",
  "两个输入落在同一个网格点": "Both inputs land on the same grid point",
  "可训练权重": "Trainable weights",
  "接收梯度更新": "Receive gradient updates",
  "模拟量化": "Simulated quantization",
  "截断、舍入、还原": "Clip, round, reconstruct",
  "计算训练损失": "Compute training loss",
  "反向传播梯度": "Backpropagate gradients",
  "INT8 权重": "INT8 weights",
  "整数乘法": "INT8 matmul",
  "计算结果": "Output",
  "解量化": "Dequantize",
  "浮点乘法": "FP matmul",
  "解量化后计算": "Dequantize then compute",
  "直接低精度计算": "Compute at low precision",
};
const T = text => window.SS_LANG === 'en' ? (EN[text] ?? text) : text;
const SCENES = [
  ["相同数量权重使用更少位存储", ({ mobile, card, box, label, note, reveal }) => {
    const points = mobile ? [[200, 143], [200, 368]] : [[294, 166], [666, 166]];
    points.forEach(([x, y], i) => {
      const group = card([x, y], i ? 'INT8' : 'BF16', '',
        i ? "每项 8 位" : "每项 16 位");
      const w = i ? 35 : 70;
      for (let n = 0; n < 3; n++) {
        const left = x + (n - 1.5) * (w + 6) + 3;
        const item = box(left, y - 13, w, 28, i ? 'ready' : 'cool', group);
        const name = label(left + w / 2, y + 1, ['w₁', 'w₂', 'w₃'][n], '', group);
        if (i) reveal(item, 0.65 + n * 0.42);
        if (i) reveal(name, 0.65 + n * 0.42);
      }
    });
    note("尺度等元数据另计");
  }],
  ["相邻原值映射到同一整数编码", roundValues],
  ["切换权重量化与权重激活量化", ({ flow, toggle, option }) => {
    flow([
      ["权重", [["INT8", 96, "ready"]], "低位宽存储"],
      ["激活", [[option ? "INT8" : "BF16", 96, option ? "ready" : "cool"]], option ? "同步量化" : "保持较高精度"],
      ["KV Cache", "单独选择格式"]
    ], { link: false });
    toggle.hidden = false;
    toggle.textContent = T("同时量化激活");
    toggle.setAttribute('aria-pressed', String(option));
  }],
  ["校准样本决定静态激活量化的网格", ({ flow, note }) => {
    flow([
      ["样本激活", ["−3.0", "−0.5", "0.5", "2.7"]],
      ["选定范围", "[−2.0, 2.0]", "拟合尺度与零点"],
      ["固定激活网格", [["−2", 48, "busy"], "···", ["2", 48, "busy"]]]
    ]);
    note("超出范围的值截到两个端点");
  }],
  ["前向模拟量化，反馈调整权重", qat],
  ["两种低位宽权重计算路径", deployment]
];

function roundValues({ mobile, card, wire, travel, reveal, note }) {
  const a = mobile ? [200, 79] : [154, 166];
  const b = mobile ? [200, 253] : [480, 166];
  const c = mobile ? [200, 427] : [806, 166];
  const routes = mobile
    ? [[[170, 137], [170, 161], [200, 161], [200, 195]], [[230, 137], [230, 161], [200, 161], [200, 195]], [[200, 311], [200, 369]]]
    : [[[290, 141], [318, 141], [318, 166], [344, 166]], [[290, 191], [318, 191], [318, 166], [344, 166]], [[616, 166], [670, 166]]];
  routes.forEach((points, i) => travel(wire(points, i === 2 ? 'ready' : 'active'),
    [0.45, 0.79, 1.9][i], [1.49, 1.83, 2.65][i], i === 2 ? 'ready' : 'active'));
  card(a, "原始数值", [["0.49", 76], ["0.51", 76]]);
  reveal(card(b, "舍入后编码", ["2"], "尺度 0.25 · 零点 0"), 1.4);
  reveal(card(c, "解量化近似值", [["0.50", 82, "ready"]]), 2.4);
  note("两个输入落在同一个网格点");
}

function qat({ mobile, card, wire, travel, reveal }) {
  const a = mobile ? [200, 79] : [154, 150];
  const b = mobile ? [200, 253] : [480, 150];
  const c = mobile ? [200, 427] : [806, 150];
  [a, b].forEach(([x, y], i) => {
    const [nx, ny] = [b, c][i];
    const forward = mobile ? [[x - 46, y + 58], [nx - 46, ny - 58]] : [[x + 136, y - 23], [nx - 136, ny - 23]];
    const backward = mobile ? [[nx + 46, ny - 58], [x + 46, y + 58]] : [[nx - 136, ny + 23], [x + 136, y + 23]];
    travel(wire(forward, 'active'), 0.45 + i, 1.2 + i, 'active');
    travel(wire(backward, 'ready'), 3.55 - i, 4.35 - i, 'ready');
  });
  card(a, "可训练权重", ["W"], "接收梯度更新");
  reveal(card(b, "模拟量化", "截断、舍入、还原", "经 STE 回传"), 1.0);
  reveal(card(c, "计算训练损失", "反向传播梯度"), 1.9);
}

function deployment({ mobile, label, box, wire, travel }) {
  const xs = mobile ? [75, 200, 325] : [180, 480, 780];
  const ys = mobile ? [155, 390] : [99, 241];
  const w = mobile ? 114 : 220;
  ys.forEach((y, row) => {
    const tone = row ? 'cool' : 'active';
    label(xs[1], y - (mobile ? 91 : 67), row ? "示例：仅权重量化" : "示例：W8A8", 'heading');
    const activationY = y + (mobile ? 62 : 44);
    const items = row ? [
      [xs[0], y, "权重 INT8"], [xs[1], y, "还原权重"], [xs[1], activationY, "BF16 激活"], [xs[2], y, "浮点算子"]
    ] : [
      [xs[0], y - 25, "权重 INT8"], [xs[0], y + 25, "INT8 激活"], [xs[1], y, "整数算子"], [xs[2], y, "计算结果"]
    ];
    const right = (x, yy) => [x + w / 2, yy];
    const left = (x, yy) => [x - w / 2, yy];
    const paths = row ? [
      [right(xs[0], y), left(xs[1], y)],
      [right(xs[1], y), left(xs[2], y)],
      [right(xs[1], activationY), [xs[2], activationY], [xs[2], y + 18]]
    ] : [
      [right(xs[0], y - 25), [xs[1], y - 25], [xs[1], y - 18]],
      [right(xs[0], y + 25), [xs[1], y + 25], [xs[1], y + 18]],
      [right(xs[1], y), left(xs[2], y)]
    ];
    paths.forEach((path, i) => {
      const start = (row ? i > 0 : i === 2) ? 1.55 : 0.55;
      travel(wire(path, tone), start, start + 0.8, tone);
    });
    items.forEach(([x, yy, value]) => {
      box(x - w / 2, yy - 18, w, 36, value.endsWith("算子") ? tone : '');
      label(x, yy, value);
    });
  });
}
const duration = 5.4;
const clamp = n => Math.min(1, Math.max(0, n));

function mount(host, { onLayout, paused = false } = {}) {
  const narrow = matchMedia('(max-width: 640px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = ID + '-toggle';
  host.classList.add(ID + '-figure');
  host.replaceChildren(svg, toggle);
  svg.setAttribute('role', 'img');

  let step = 0, option = false, raf, last, time, draws, mobile, width, height;

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
    toggle.hidden = true;
    draws = [];
    SCENES[step][1]({ card, box, label, wire, travel, reveal, flow, note, mobile, toggle, option });
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
  toggle.addEventListener('click', () => {
    option = !option;
    draw();
  });
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
