// Topic animation interface. The page owns navigation and pauses off-screen figures.
(() => {
const ID = 'attn';
const EN = {
  "注意力头 A": "Attention head A",
  "注意力头 B": "Attention head B",
  "示意，不代表实测数字": "Schematic, not measured",
  "同一向量分别投影为 Q、K、V": "The same vector projects to Q, K, and V",
  "缩放点积为每个键打分": "Scaled dot products score individual keys",
  "当前位置查询": "Current query",
  "逐个比较键": "Compare each key",
  "缩放分数": "Scaled scores",
  "点积除以键维度的平方根": "Divide by the square root of the key dimension",
  "因果掩码屏蔽分数表的右上角": "A causal mask blocks the upper-right of the score matrix",
  "掩码前": "Before masking",
  "应用因果掩码": "Apply causal mask",
  "Softmax 权重乘值向量后求和": "Softmax weights the value vectors before summation",
  "可见分数": "Visible scores",
  "Softmax 权重": "Softmax weights",
  "上下文向量": "Context vector",
  "V₃ 权重为零 · 权重为四舍五入值": "V₃ gets zero weight · weights rounded",
  "两个查询头共享一组键值": "Two query heads share one key-value set",
  "独立查询": "Separate queries",
  "共享键值": "Shared keys and values",
  "各头输出拼接": "Concatenated heads",
  "各头用各自的 Q 计算注意力权重": "Each head computes weights using its own query",
  "键值缓存保留历史并追加新位置": "The KV cache retains history and appends a new position",
  "输入位置向量": "Input position vector",
  "三套投影使用同一个输入": "All three projections use the same input",
  "新位置投影": "New position",
  "追加到 KV Cache": "Append to the KV cache",
  "新查询读取键值": "Query reads the cache",
  "当前权重重新计算": "New weights are computed",
};
const T = text => window.SS_LANG === 'en' ? (EN[text] ?? text) : text;
const SCENES = [
  ["同一向量分别投影为 Q、K、V", project],
  ["缩放点积为每个键打分", ({ mobile, flow, box, label, reveal, note }) => {
    const [, , result] = flow([
      ["当前位置查询", ["Q₂"]],
      ["逐个比较键", [["Q₂ · K₁", 74], ["Q₂ · K₂", 74, "cool"], ["Q₂ · K₃", 74]]],
      ["缩放分数"]
    ]);
    const [x, y] = mobile ? [200, 427] : [806, 166];
    [2.0, 0.6, 1.2].forEach((value, i) => {
      const lineY = y - 9 + 23 * i;
      const tone = i ? 'cool' : 'active';
      label(x - 80, lineY, ['K₁', 'K₂', 'K₃'][i], '', result);
      box(x - 56, lineY - 5, 117, 10, '', result);
      reveal(box(x - 56, lineY - 5, 58 * value, 10, tone, result), 1.9 + i * 0.21);
      label(x + 88, lineY, value.toFixed(1), '', result);
    });
    note("点积除以键维度的平方根");
  }],
  ["因果掩码屏蔽分数表的右上角", ({ mobile, box, label, flow, reveal }) => {
    const [original, masked] = flow([
      ["掩码前"], ["应用因果掩码"]
    ], { result: false });
    const positions = mobile ? [[200, 143], [200, 368]] : [[294, 166], [666, 166]];
    [original, masked].forEach((group, index) => {
      const [x, y] = positions[index];
      ['1', '2', '3'].forEach((n, i) => {
        label(x + 11 + (i - 1) * 43, y - 9, 'K' + n, 'muted', group);
        label(x - 73, y + 10 + 18 * i, 'Q' + n, 'muted', group);
      });
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const blocked = index === 1 && col > row;
          const tone = blocked ? 'idle' : row === 1 ? 'active' : 'cool';
          const cx = x + 11 + (col - 1) * 43, cy = y + 10 + row * 18;
          const fill = box(cx - 20, cy - 9, 40, 18, tone, group);
          if (blocked) reveal(fill, 1.25);
          label(cx, cy, blocked ? '×' : '·', blocked ? 'muted' : '', group);
        }
      }
    });
  }],
  ["Softmax 权重乘值向量后求和", ({ flow, note }) => {
    flow([
      ["可见分数", ["2.0", "0.6", ["×", 48, "idle"]]],
      ["Softmax 权重", ["0.8", "0.2", ["0", 48, "idle"]]],
      ["上下文向量", "0.8 V₁ + 0.2 V₂"]
    ]);
    note("V₃ 权重为零 · 权重为四舍五入值");
  }],
  ["两个查询头共享一组键值", ({ mobile, card, wire, travel, reveal }) => {
    const shared = mobile ? [200, 76] : [154, 166];
    const result = mobile ? [200, 431] : [806, 166];
    const heads = mobile ? [[107, 254], [293, 254]] : [[480, 84], [480, 248]];
    heads.forEach(([x, y], i) => {
      const tone = i ? 'cool' : 'active';
      const input = mobile
        ? [[x, 134], [x, 196]]
        : [[290, 166 + (i ? 24 : -24)], [318, 166 + (i ? 24 : -24)], [318, y], [344, y]];
      const output = mobile
        ? [[x, 312], [x, 373]]
        : [[616, y], [645, y], [645, 166 + (i ? 24 : -24)], [670, 166 + (i ? 24 : -24)]];
      travel(wire(input, 'ready'), 0.45, 1.4, 'ready');
      travel(wire(output, tone), 1.65, 2.65, tone);
      reveal(card([x, y], i ? "注意力头 B" : "注意力头 A",
        i ? "Qᴮ + K, V → hᴮ" : "Qᴬ + K, V → hᴬ", '', tone, mobile ? 166 : 272), 1.1);
    });
    card(shared, "共享键值", [["K", 48, "ready"], ["V", 48, "ready"]], "GQA");
    reveal(card(result, "各头输出拼接", [["hᴬ", 54], ["hᴮ", 54, "cool"]]), 2.4);
  }],
  ["键值缓存保留历史并追加新位置", cacheFlow]
];

function project({ mobile, card, box, label, wire, travel, reveal, note }) {
  const input = mobile ? [200, 112] : [267, 166];
  const outputs = mobile ? [[67, 350], [200, 350], [333, 350]] : [[678, 65], [678, 166], [678, 267]];
  outputs.forEach(([x, y], i) => {
    const tone = ['active', 'cool', 'ready'][i];
    const path = wire(mobile
      ? [[200, 170], [200, 229], [x, 229], [x, 307]]
      : [[403, 166], [464, 166], [464, y], [548, y]], tone);
    travel(path, 0.45 + 0.19 * i, 1.8 + 0.19 * i, tone);
    const group = box(mobile ? x - 57 : 548, y - 43, mobile ? 114 : 260, 86, tone);
    const vector = label(x, y - 14, ['Q₂', 'K₂', 'V₂'][i], 'heading');
    const matrix = label(x, y + 17, ['WQ', 'WK', 'WV'][i], 'muted');
    [group, vector, matrix].forEach(node => reveal(node, 1.45 + 0.19 * i));
  });
  card(input, "输入位置向量", ["x₂"]);
  if (mobile) note("三套投影使用同一个输入");
}

function cacheFlow({ mobile, card, wire, travel, label, reveal }) {
  const a = mobile ? [200, 79] : [154, 166];
  const b = mobile ? [200, 253] : [480, 166];
  const c = mobile ? [200, 427] : [806, 166];
  const append = mobile ? [[200, 137], [200, 195]] : [[290, 166], [344, 166]];
  const read = mobile ? [[200, 311], [200, 369]] : [[616, 166], [670, 166]];
  const query = mobile
    ? [[39, 79], [20, 79], [20, 427], [39, 427]]
    : [[154, 108], [154, 65], [806, 65], [806, 108]];
  travel(wire(append, 'ready'), 0.42, 1.33, 'ready');
  travel(wire(read, 'cool'), 1.55, 2.60, 'cool');
  travel(wire(query, 'active'), 0.77, 2.60);
  card(a, "新位置投影",
    [["Q₃", 52], ["K₃", 52, "ready"], ["V₃", 52, "ready"]]);
  const cache = card(b, "追加到 KV Cache",
    [["K₁ V₁", 61, "cool"], ["K₂ V₂", 61, "cool"], ["K₃ V₃", 61, "ready"]]);
  Array.from(cache.children).slice(-2).forEach(node => reveal(node, 1.29));
  reveal(card(c, "新查询读取键值", ["w₁", "w₂", "w₃"],
    "当前权重重新计算"), 2.45);
  label(mobile ? 45 : 480, mobile ? 166 : 45, 'Q₃', 'value');
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
    SCENES[step][1]({ card, box, label, wire, travel, reveal, flow, note, mobile });
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
