// Topic animation interface. The page owns navigation and pauses off-screen figures.
(() => {
const ID = 'tok';
const EN = {
  "仅追踪位置 3": "Trace position 3 only",
  "解码生成的后缀": "Decode the generated suffix",
  "示意，不代表实测数字": "Schematic, not measured",
  "文本切分为 Token": "Text split into tokens",
  "输入文字": "Input text",
  "分词规则": "Segmentation",
  "匹配词表片段": "Match vocabulary pieces",
  "Token 序列": "Token sequence",
  "▁ 表示空格": "▁ marks a space",
  "词表将 Token 映射为编号": "The vocabulary maps tokens to IDs",
  "词表映射": "Vocabulary lookup",
  "输入编号": "Input IDs",
  "顺序保留在编号序列中": "IDs retain the input order",
  "编号查出嵌入向量": "IDs index embedding vectors",
  "Token 编号": "Token ID",
  "嵌入表": "Embedding table",
  "取第 18 行": "Read row 18",
  "输入向量": "Input vector",
  "位置机制另行提供顺序信息": "A positional mechanism supplies sequence order",
  "注意力与前馈网络处理向量": "Attention and feed-forward layers process vectors",
  "位置向量": "Position vectors",
  "因果注意力": "Causal attention",
  "汇总当前及先前位置": "Mix visible positions",
  "前馈网络": "Feed-forward network",
  "分别变换各位置": "Transform each position",
  "这组计算在多层中重复": "The same block structure repeats across layers",
  "最高分解码示例": "Greedy decoding example",
  "末位置向量": "Final-position vector",
  "词表候选分数": "Vocabulary scores",
  "选中 Token": "Selected token",
  "示例采用最高分解码": "Greedy decoding selects the highest score",
  "生成的 Token 追加到输入": "The generated token is appended",
  "更新后的输入": "Updated input",
  "继续预测": "Next prediction",
  "保留生成结果": "Keep generated token",
  "反分词": "Detokenization",
  "还原可读文字": "Reconstruct text",
};
const T = text => window.SS_LANG === 'en' ? (EN[text] ?? text) : text;
const SCENES = [
  ["文本切分为 Token", ({ flow, note }) => {
    flow([
      ["输入文字", "AI lab"],
      ["分词规则", "匹配词表片段"],
      ["Token 序列", ["AI", "▁", "lab"]]
    ]);
    note("▁ 表示空格");
  }],
  ["词表将 Token 映射为编号", ({ flow, note }) => {
    flow([
      ["Token 序列", ["AI", "▁", "lab"]],
      ["词表映射", [["AI → 18", 72], ["▁ → 3", 63], ["lab → 42", 82]]],
      ["输入编号", ["18", "3", "42"]]
    ]);
    note("顺序保留在编号序列中");
  }],
  ["编号查出嵌入向量", ({ flow, note }) => {
    flow([
      ["Token 编号", ["18"]],
      ["嵌入表", "取第 18 行"],
      ["输入向量", "⟨0.2, −0.4, 0.6, …⟩"]
    ]);
    note("位置机制另行提供顺序信息");
  }],
  ["注意力与前馈网络处理向量", ({ flow, note }) => {
    flow([
      ["位置向量", ["x₁", "x₂", "x₃"]],
      ["因果注意力", "x₁, x₂, x₃ → h₃", "汇总当前及先前位置"],
      ["前馈网络", ["y₃"], "仅追踪位置 3"]
    ]);
    note("这组计算在多层中重复");
  }],
  ["最高分解码示例", ({ flow, note }) => {
    flow([
      ["末位置向量", ["y₃"]],
      ["词表候选分数", [["s  2.4", 66, "ready"], [".  0.9", 61, "idle"], ["!  0.1", 61, "idle"]]],
      ["选中 Token", [["s", 48, "ready"]]]
    ]);
    note("示例采用最高分解码");
  }],
  ["生成的 Token 追加到输入", ({ mobile, card, wire, travel, reveal }) => {
    const a = mobile ? [200, 79] : [154, 150];
    const b = mobile ? [200, 253] : [480, 150];
    const c = mobile ? [200, 427] : [806, 150];
    const feedback = wire(mobile
      ? [[39, 253], [21, 253], [21, 79], [39, 79]]
      : [[480, 208], [480, 255], [154, 255], [154, 208]], 'ready');
    const output = wire(mobile ? [[200, 311], [200, 369]] : [[616, 150], [670, 150]]);
    travel(feedback, 0.45, 2.25, 'ready');
    travel(output, 1.1, 2.25);
    card(a, "更新后的输入", ["AI", "▁", "lab", ["s", 48, "ready"]], "继续预测");
    card(b, "保留生成结果", [["s", 48, "ready"]]);
    reveal(card(c, "反分词", "s", "解码生成的后缀"), 2);
  }]
];


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
    SCENES[step][1]({ card, wire, travel, reveal, flow, note, mobile });
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
