// Topic animation interface. The page owns navigation and pauses off-screen figures.
(() => {
const ID = 'ft';
const EN = {
  "示意，不代表实测数字": "Schematic, not measured",
  "语料中的下一个 Token 提供训练目标": "The next token in the corpus supplies the training target",
  "已有前文": "Prefix from corpus",
  "训练目标": "Target token",
  "语料中实际出现": "Taken from the corpus",
  "预测位置向右移一个 Token": "The prediction target moves one token to the right",
  "已有模型继续在领域语料上训练": "The existing model continues training on domain text",
  "已有权重": "Existing weights",
  "基础模型": "Base model",
  "领域文本": "Domain text",
  "预测下一个 Token": "Predict the next token",
  "更新后权重": "Updated weights",
  "领域模型": "Domain model",
  "监督微调使用指令和参考回答": "Supervised fine-tuning uses instructions and reference responses",
  "指令": "Instruction",
  "按日期排序": "Sort by date",
  "参考回答": "Reference response",
  "训练损失": "Training loss",
  "预测回答 Token": "Predict response tokens",
  "指令给上下文，回答提供目标": "Instruction gives context; response supplies targets",
  "偏好对齐根据成对回答调整倾向": "Preference alignment learns from paired responses",
  "同一指令": "One instruction",
  "两条候选回答": "Two candidate responses",
  "优选 A": "A preferred",
  "次选 B": "B ranked lower",
  "偏好目标": "Preference objective",
  "相对提高 A 的倾向": "Favor A relative to B",
  "偏好对来自同一个输入": "Both responses correspond to the same prompt",
  "全量微调允许更新所有层": "Full fine-tuning can update every layer",
  "任务损失": "Task loss",
  "反向传播": "Backpropagation",
  "各层权重梯度": "Weight gradients",
  "可训练基础权重": "Trainable base weights",
  "优化器可更新全部基础权重": "The optimizer can update all base weights",
  "LoRA 前向经过两路，只更新适配器": "LoRA uses both forward paths and updates only the adapter",
  "适配器": "Adapter",
  "基础权重": "Base weights",
  "BA · 可更新": "BA · trainable",
  "W · 冻结": "W · frozen",
  "保留输入向量": "Retain input vector",
  "合并前向输出": "Add forward outputs",
  "更新信号只进入适配器": "The update signal reaches the adapter only",
};
const T = text => window.SS_LANG === 'en' ? (EN[text] ?? text) : text;
const SCENES = [
  ["语料中的下一个 Token 提供训练目标", ({ mobile, card, label, wire, travel, update, note }) => {
    const a = mobile ? [200, 143] : [294, 166];
    const b = mobile ? [200, 368] : [666, 166];
    const path = wire(mobile ? [[200, 201], [200, 310]] : [[430, 166], [530, 166]]);
    travel(path, 0.45, 1.25);
    travel(path, 2.0, 2.8);
    card(a, "已有前文");
    card(b, "训练目标", '', "语料中实际出现");
    const context = label(a[0], a[1] + 1, 'The', 'value');
    const target = label(b[0], b[1] + 1, 'sky', 'value');
    update(t => {
      context.textContent = t >= 2 ? 'The sky' : 'The';
      target.textContent = t >= 2 ? 'is' : 'sky';
    });
    note("预测位置向右移一个 Token");
  }],
  ["已有模型继续在领域语料上训练", ({ flow }) => {
    flow([
      ["已有权重", "基础模型"],
      ["领域文本", "预测下一个 Token"],
      ["更新后权重", "领域模型"]
    ]);
  }],
  ["监督微调使用指令和参考回答", ({ flow, note }) => {
    flow([
      ["指令", "按日期排序"],
      ["参考回答", [["3 May, 7 May", 145, "ready"]]],
      ["训练损失", "预测回答 Token"]
    ]);
    note("指令给上下文，回答提供目标");
  }],
  ["偏好对齐根据成对回答调整倾向", ({ flow, note }) => {
    flow([
      ["同一指令", "按日期排序"],
      ["两条候选回答", [["优选 A", 113, "ready"], ["次选 B", 119, "idle"]]],
      ["偏好目标", "相对提高 A 的倾向"]
    ]);
    note("偏好对来自同一个输入");
  }],
  ["全量微调允许更新所有层", ({ flow, note }) => {
    flow([
      ["任务损失", "反向传播"],
      ["各层权重梯度", ["∇W₁", "∇W₂", "∇W₃"]],
      ["可训练基础权重", [["W₁", 48, "ready"], ["W₂", 48, "ready"], ["W₃", 48, "ready"]]]
    ]);
    note("优化器可更新全部基础权重");
  }],
  ["LoRA 前向经过两路，只更新适配器", lora]
];

function lora({ mobile, card, label, box, wire, travel, note, reveal }) {
  const source = mobile ? [200, 72] : [154, 166];
  const output = mobile ? [200, 415] : [806, 166];
  const branches = mobile ? [[106, 242], [294, 242]] : [[480, 93], [480, 239]];
  branches.forEach(([x, y], i) => {
    const tone = i ? 'ready' : 'cool';
    const enter = mobile
      ? [[200, 130], [200, 160], [x, 160], [x, 199]]
      : [[290, 166], [314, 166], [314, y], [360, y]];
    const exit = mobile
      ? [[x, 285], [x, 323], [200, 323], [200, 357]]
      : [[600, y], [645, y], [645, 166], [670, 166]];
    travel(wire(enter, tone), 0.45 + i * 0.2, 1.6 + i * 0.2, tone);
    travel(wire(exit, tone), 1.65 + i * 0.2, 2.82 + i * 0.2, tone);
    const w = mobile ? 163 : 240;
    box(x - w / 2, y - 43, w, 86, tone);
    label(x, y - 16, i ? "适配器" : "基础权重", 'heading');
    label(x, y + 16, i ? "BA · 可更新" : "W · 冻结", 'muted');
    if (i) {
      const gradient = mobile
        ? [[361, 415], [384, 415], [384, 242], [376, 242]]
        : [[806, 224], [806, 267], [622, 267], [622, 255], [600, 255]];
      const gradWire = wire(gradient, 'ready');
      travel(gradWire, 3.15, 4.05, 'ready');
    }
  });
  card(source, "保留输入向量", ["x"]);
  reveal(card(output, "合并前向输出", "Wx + BAx"), 2.55);
  note("更新信号只进入适配器");
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
    SCENES[step][1]({ card, box, label, wire, travel, reveal, flow, note, update: callback => draws.push(callback), mobile });
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
