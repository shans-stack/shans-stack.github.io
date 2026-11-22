// Topic animation interface. The page owns navigation and pauses off-screen figures.
(() => {
const ID = 'march';
const EN = {
  "示意，不代表实测数字": "Schematic, not measured",
  "Transformer 块里的共同路径": "The shared path through a Transformer block",
  "输入": "Input",
  "注意力": "Attention",
  "混合上下文": "Mix context",
  "前馈部分": "Feed-forward part",
  "各位置独立处理": "Process positions separately",
  "稠密模型和 MoE 均可使用这一路径": "Dense and MoE models can use this structure",
  "不同 Token 使用同一组前馈权重": "Different tokens use the same feed-forward weights",
  "一批输入": "Batched input",
  "同一稠密层": "Same dense layer",
  "各自输出": "Separate outputs",
  "A 和 B 分别计算并保留原位置": "A and B retain their positions",
  "路由器为 Token 选择专家": "The router selects experts for a token",
  "专家输出回到原位置": "Expert outputs return to the original token position",
  "总参数与活跃参数分开看": "Total and active parameters are counted separately",
  "模型总参数": "Total parameters",
  "共享": "Shared",
  "本次活跃参数": "Active for this token",
  "虚线专家计入总量，本次未使用": "E3 counts toward the total and is idle here",
  "专家负载随收到的 Token 增长": "Expert load rises with the number of assigned tokens",
  "很高": "High",
  "较低": "Low",
  "升高": "Elevated",
  "专家 E1": "Expert E1",
  "专家 E2": "Expert E2",
  "专家 E3": "Expert E3",
  "保留原 Token": "Original input stays",
  "路由器": "Router",
  "A₁ 输出": "A₁ output",
  "A₂ 输出": "A₂ output",
  "选中": "Selected",
  "未参与": "Idle",
  "加权汇总": "Weighted combination",
  "回到 Token A 的位置": "Returns to token A’s position",
  "本次路径": "Selected routes",
  "E3 留给其他 Token": "E3 stays available",
};
const T = text => window.SS_LANG === 'en' ? (EN[text] ?? text) : text;
const SCENES = [
  ["Transformer 块里的共同路径", ({ flow, note }) => {
    flow([
      ["输入", ["x₁", "x₂", "x₃"]],
      ["注意力", "混合上下文"],
      ["前馈部分", "各位置独立处理"]
    ]);
    note("稠密模型和 MoE 均可使用这一路径");
  }],
  ["不同 Token 使用同一组前馈权重", ({ flow, note }) => {
    flow([
      ["一批输入", [["A", 48], ["B", 48, "cool"]]],
      ["同一稠密层", "W"],
      ["各自输出", [["A′", 48], ["B′", 48, "cool"]]]
    ]);
    note("A 和 B 分别计算并保留原位置");
  }],
  ["路由器为 Token 选择专家", moEPaths],
  ["专家输出回到原位置", moEPaths],
  ["总参数与活跃参数分开看", ({ flow, note }) => {
    flow([
      ["模型总参数", [["共享", 70, "cool"], "E1", "E2", "E3"]],
      ["本次活跃参数", [["共享", 70, "cool"], "E1", "E2", ["E3", 48, "idle"]]]
    ], { link: false });
    note("虚线专家计入总量，本次未使用");
  }],
  ["专家负载随收到的 Token 增长", ({ mobile, card, box, reveal, label, update }) => {
    const centers = mobile ? [[200, 79], [200, 253], [200, 427]] : [[154, 166], [480, 166], [806, 166]];
    const counts = [3, 1, 2];
    const states = ["很高", "较低", "升高"];
    centers.forEach(([x, y], i) => {
      const tone = ['busy', 'ready', 'active'][i];
      const tokens = Array.from({ length: counts[i] }, (_, n) => [['A', 'B', 'C', 'D', 'E', 'F'][[0, 3, 4][i] + n], 48, tone]);
      const group = card([x, y], ["专家 E1", "专家 E2", "专家 E3"][i], tokens);
      box(x - 87, y + 29, 105, 12, '', group);
      const bar = box(x - 86, y + 30, 0, 10, tone, group);
      const tokenLabels = Array.from(group.querySelectorAll('text')).slice(1, counts[i] + 1);
      update(t => {
        const arrived = Math.min(counts[i], Math.max(0, Math.floor((t - 0.55) / 0.44) + 1));
        bar.setAttribute('width', 34 * arrived);
        tokenLabels.forEach((text, j) => { text.style.opacity = j < arrived ? 1 : 0.24; });
      });
      reveal(label(x + 58, y + 35, states[i], 'muted', group), 0.9 + counts[i] * 0.38);
    });
  }]
];

function moEPaths({ mobile, card, box, label, wire, travel, reveal, step }) {
  const combine = step === 3;
  const a = mobile ? [200, 78] : [158, 159];
  const b = mobile ? [200, 423] : [802, 159];
  const experts = mobile
    ? [[70, 250], [200, 250], [330, 250]]
    : [[480, 65], [480, 159], [480, 253]];

  experts.forEach(([x, y], i) => {
    const selected = i < 2;
    const enter = mobile
      ? [[200, 136], [200, 173], [x, 173], [x, 211]]
      : [[294, 159], [330, 159], [330, y], [364, y]];
    const path = wire(enter, selected ? 'active' : 'idle');
    if (selected) travel(path, 0.45 + i * 0.19, 1.8 + i * 0.19);
    if (selected && combine) {
      const exit = mobile
        ? [[x, 289], [x, 327], [200, 327], [200, 365]]
        : [[596, y], [630, y], [630, 159], [666, 159]];
      travel(wire(exit, 'ready'), 2.1 + i * 0.16, 3.35 + i * 0.16, 'ready');
    }
  });

  card(a, combine ? "保留原 Token" : "路由器", ['A']);
  experts.forEach(([x, y], i) => {
    const w = mobile ? 111 : 232;
    const selected = i < 2;
    box(x - w / 2, y - 39, w, 78, selected ? 'active' : 'idle');
    label(x, y - 13, ['E1', 'E2', 'E3'][i], selected ? 'heading' : 'muted');
    const states = combine
      ? ["A₁ 输出", "A₂ 输出"]
      : ["选中", "选中"];
    label(x, y + 14, selected ? states[i] : "未参与", 'muted');
  });
  if (combine) reveal(card(b, "加权汇总", 'g₁A₁ + g₂A₂',
    "回到 Token A 的位置", 'ready'), 3.2);
  else card(b, "本次路径", ['E1', 'E2'], "E3 留给其他 Token");
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
