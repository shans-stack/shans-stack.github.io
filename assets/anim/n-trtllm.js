(() => {
"use strict";

const ID = "n-trtllm";
const SCENES = [
  {
    caption: ["引擎组织 GPU 上的生成计算", "The engine schedules generation work on GPUs"],
    bands: [
      [{"key": "prompt", "name": ["提示词", "Prompt"], "tiles": ["file"]}, {"key": "weights", "name": ["模型权重", "Model Weights"], "tiles": ["layers"]}],
      [{"key": "engine", "name": ["TensorRT-LLM", "TensorRT-LLM"], "sub": ["调度与 GPU 算子", "Scheduling and GPU kernels"]}],
      [{"key": "out", "name": ["生成输出", "Generated Output"], "tiles": ["tokens"]}]
    ],
    edges: [
      ["prompt", "engine", 0.18, "data", -15],
      ["weights", "engine", 0.18, "control", 15],
      ["engine", "out", 1.06, "ok", 0]
    ]
  },
  {
    caption: ["预填充先建立缓存，解码再追加", "Prefill builds the cache and decode extends it"],
    bands: [
      [{"key": "prompt", "name": ["提示词", "Prompt"], "tiles": ["tokens"]}],
      [{"key": "prefill", "name": ["预填充", "Prefill"], "sub": ["TensorRT-LLM", "TensorRT-LLM"], "tiles": ["cache", "cache"]}],
      [{"key": "decode", "name": ["解码", "Decode"], "sub": ["读取缓存", "Reads the cache"], "state": [1.85, "追加缓存", "Extends cache"], "tiles": ["tokens"]}]
    ],
    edges: [
      ["prompt", "prefill", 0.18, "data", 0],
      ["prefill", "decode", 1.06, "ok", 0]
    ]
  },
  {
    caption: ["相邻迭代的请求组成可以变化", "Batch membership can change between iterations"],
    bands: [
      [{"key": "first", "name": ["本轮批次", "Current Batch"], "sub": ["A、B 解码", "A and B decode"], "tiles": ["A", "B"]}, {"key": "queued", "name": ["C 新请求", "C Arrives"], "tiles": ["C"]}],
      [{"key": "complete", "name": ["A 已完成", "A Completed"], "sub": ["退出批次", "Leaves the batch"], "tiles": ["A"]}, {"key": "second", "name": ["下一轮批次", "Next Batch"], "sub": ["B 解码，C 预填充", "B decodes, C prefills"], "tiles": ["B", "C"]}]
    ],
    edges: [
      ["first", "complete", 0.22, "control", -24],
      ["first", "second", 0.62, "data", -11],
      ["queued", "second", 0.62, "ok", 15]
    ]
  },
  {
    caption: ["两条序列引用同一组前缀块", "Both sequences reference the same cached prefix"],
    bands: [
      [{"key": "a", "name": ["请求 A", "Request A"], "sub": ["独立后缀 A", "Separate suffix A"], "tiles": ["A"]}, {"key": "b", "name": ["请求 B", "Request B"], "sub": ["独立后缀 B", "Separate suffix B"], "tiles": ["B"]}],
      [{"key": "cache", "name": ["共享前缀块", "Shared Prefix Blocks"], "sub": ["按块 ID 引用", "Referenced by block ID"], "tiles": ["cache", "cache"]}]
    ],
    edges: [
      ["a", "cache", null, "control", -15],
      ["b", "cache", null, "control", 15]
    ]
  },
  {
    caption: ["相同输入，不同权重分片，局部结果合并", "GPUs share the input, use distinct shards, and combine results"],
    bands: [
      [{"key": "input", "name": ["同一输入", "Shared Input"], "tiles": ["tokens"]}],
      [{"key": "gpuA", "name": ["GPU A", "GPU A"], "sub": ["权重分片 A", "Weight shard A"], "tiles": ["shardA"]}, {"key": "gpuB", "name": ["GPU B", "GPU B"], "sub": ["权重分片 B", "Weight shard B"], "tiles": ["shardB"]}],
      [{"key": "sum", "name": ["合并结果", "Combined Result"], "sub": ["汇合局部结果", "Combines partial results"], "tiles": ["shardA", "shardB"]}]
    ],
    edges: [
      ["input", "gpuA", 0.18, "data", -15],
      ["input", "gpuB", 0.18, "data", 15],
      ["gpuA", "sum", 1.08, "ok", -15],
      ["gpuB", "sum", 1.08, "ok", 15]
    ]
  },
  {
    caption: ["路由层选择实例，实例内执行推理", "The router selects an instance, and the instance runs inference"],
    bands: [
      [{"key": "request", "name": ["应用请求", "Application Request"], "tiles": ["file"]}],
      [{"key": "router", "name": ["Dynamo 路由", "Dynamo Router"], "sub": ["选择服务实例", "Selects an instance"]}],
      [{"key": "a", "name": ["TensorRT-LLM A", "TensorRT-LLM A"], "sub": ["执行推理", "Runs inference"]}, {"key": "b", "name": ["TensorRT-LLM B", "TensorRT-LLM B"], "sub": ["本次未选中", "Not selected"], "kind": "idle"}]
    ],
    edges: [
      ["request", "router", 0.18, "data", 0],
      ["router", "a", 1.03, "ok", -15],
      ["router", "b", null, "idle", 15]
    ]
  }
];
const ICONS = {
  "file": "M2 0H12l4 4v13H2Z M12 0v4h4 M5 8h8 M5 12h8",
  "layers": "M1 5L9 0l8 5-8 5Z M1 9l8 5 8-5 M1 13l8 5 8-5",
  "cache": "M1 3h16v13H1Z M5 3v13m4-13v13m4-13v13",
  "shardA": "M1 1h15v15H1Z M1 6h15 M1 11h15 M6 1v15",
  "shardB": "M1 1h15v15H1Z M1 6h15 M1 11h15 M11 1v15"
};

function mount(host, options = {}) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const compact = matchMedia("(max-width: 640px)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const T = pair => pair[window.SS_LANG === "en" ? 1 : 0];
  const clamp = value => Math.min(1, Math.max(0, value));
  let index = 0;
  let elapsed = 0;
  let last = 0;
  let request = 0;
  let paused = Boolean(options.paused);
  let paint;
  let end;
  let view;

  host.replaceChildren(svg);
  svg.setAttribute("class", ID + "-scene");
  svg.setAttribute("role", "img");

  function add(tag, attrs, parent = svg) {
    const element = document.createElementNS(svg.namespaceURI, tag);
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
    parent.append(element);
    return element;
  }

  function label(x, y, content, className, parent) {
    const element = add("text", {x, y, class: className}, parent);
    element.textContent = content;
    return element;
  }

  function drawTile(tile, x, y, parent) {
    const group = add("g", {class: "tile " + tile, transform: `translate(${x},${y})`}, parent);
    if (tile === "tokens") {
      const tokens = [1, 11, 21].map(x => add("rect", {x, y: 3, width: 7, height: 10, rx: 1}, group));
      return age => tokens.forEach((token, i) => token.setAttribute("opacity", .22 + .78 * clamp((age - i * .14) * 7)));
    }
    const icon = ICONS[tile];
    if (icon) add("path", {d: icon}, group);
    else {
      add("path", {d: "M0 0H18V16H0Z"}, group);
      label(9, 12.5, tile, "tile-text", group).setAttribute("text-anchor", "middle");
    }
  }

  function build() {
    const mobile = compact.matches;
    const [width, height] = mobile ? [360, 410] : [860, 260];
    const {caption, bands, edges} = SCENES[index];
    view = width / height;
    svg.replaceChildren();
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.dataset.step = index + 1;

    const boxes = new Map();
    bands.forEach((band, column) => {
      band.forEach(({key}, row) => {
        const rank = row - (band.length - 1) / 2;
        const x = mobile
          ? width / 2 + rank * (band.length === 3 ? 112 : 176)
          : width / 2 + (column - (bands.length - 1) / 2) * 280;
        const y = mobile
          ? 211 + (column - (bands.length - 1) / 2) * 109
          : 132 + rank * (band.length === 3 ? 82 : 96);
        const w = mobile ? (band.length === 3 ? 106 : band.length === 2 ? 165 : 246) : 232;
        const h = band.length === 3 ? 66 : 82;
        boxes.set(key, {x, y, w, h});
      });
    });

    const routes = edges.map(([source, target, start, kind, offset]) => {
      const a = boxes.get(source), b = boxes.get(target);
      const direction = Math.sign(mobile ? b.y - a.y : b.x - a.x);
      const x = mobile ? a.x + offset : a.x + direction * a.w / 2;
      const y = mobile ? a.y + direction * a.h / 2 : a.y + offset;
      const tx = mobile ? b.x + offset : b.x - direction * b.w / 2;
      const ty = mobile ? b.y - direction * b.h / 2 : b.y + offset;
      const bend = mobile ? (y + ty) / 2 + offset / 3 : (x + tx) / 2 + offset / 3;
      const d = mobile ? `M${x},${y} V${bend} H${tx} V${ty}` : `M${x},${y} H${bend} V${ty} H${tx}`;
      const tip = mobile
        ? `M${tx - 4},${ty - direction * 8} L${tx},${ty - direction} L${tx + 4},${ty - direction * 8}`
        : `M${tx - direction * 8},${ty - 4} L${tx - direction},${ty} L${tx - direction * 8},${ty + 4}`;
      const group = add("g", {class: "route " + kind, "data-route": source + "-" + target});
      const path = add("path", {d}, group);
      add("path", {d: tip}, group);
      return {target, start, kind, group, path, length: path.getTotalLength()};
    });

    const cards = bands.flat().map(node => {
      const {key, name, sub, state, kind = "", tiles = []} = node;
      const {x, y, w, h} = boxes.get(key);
      const left = x - w / 2;
      const top = y - h / 2;
      const group = add("g", {class: "node " + kind, "data-node": key});
      add("rect", {x: left, y: top, width: w, height: h, rx: 4, class: "panel"}, group);
      const textX = left + 12;
      const nameY = top + (!sub && tiles.length === 0 ? 44 : 25);
      label(textX, nameY, T(name), "name", group);
      const subtitle = sub || state ? label(textX, nameY + 20, sub ? T(sub) : "", "sub", group) : null;
      const offsets = tiles.map((tile, i) => drawTile(tile, textX + i * 22, nameY + (sub ? 26 : 8), group));
      return {
        group, subtitle, sub, state, offsets,
        incoming: routes.filter(route => route.start !== null && route.target === key)
      };
    });

    for (const route of routes) {
      if (route.start === null) continue;
      route.packet = add("rect", {x: -4, y: -4, width: 8, height: 8, rx: 1.5, class: "packet " + route.kind});
    }

    const heading = add("foreignObject", {x: mobile ? 16 : 24, y: 9, width: width - (mobile ? 32 : 48), height: 48});
    const captionText = document.createElement("div");
    captionText.className = "caption";
    captionText.textContent = T(caption);
    heading.append(captionText);
    const note = ["示意，不代表实测数字", "Schematic. No measured data."];
    label(mobile ? 16 : 24, height - 12, T(note), "note");
    const summary = bands.flat().map(({name, sub, state}) => [T(name), sub && T(sub), state && T(state.slice(1))].filter(Boolean).join(", "));
    svg.setAttribute("aria-label", [T(caption), ...summary, T(note)].join(". "));

    end = Math.max(...routes.map(route => route.start || 0)) + 1.86;
    paint = (time, still = false) => {
      for (const route of routes) {
        if (!route.packet) continue;
        const age = time - route.start;
        const progress = clamp(age / .72);
        const point = route.path.getPointAtLength(4 + progress * (route.length - 8));
        route.group.classList.toggle("active", age >= 0);
        route.packet.setAttribute("transform", `translate(${point.x},${point.y})`);
        route.packet.setAttribute("opacity", still ? 0 : clamp(Math.min(age * 12, (.85 - age) * 10)));
      }
      for (const {group, subtitle, sub, state, offsets, incoming} of cards) {
        const arrival = incoming.length ? Math.min(...incoming.map(route => route.start + .72)) : 0;
        const arrived = time >= arrival;
        const outcome = incoming.find(route => route.kind === "ok" || route.kind === "review");
        group.classList.toggle("arrived", arrived && incoming.length > 0);
        group.classList.toggle("accepted", arrived && outcome?.kind === "ok");
        group.classList.toggle("review", arrived && outcome?.kind === "review");
        if (state) {
          const value = time >= state[0] ? T(state.slice(1)) : sub ? T(sub) : "";
          if (subtitle.textContent !== value) subtitle.textContent = value;
        }
        for (const update of offsets) update?.(time - arrival);
      }
    };
    options.onLayout?.(view, mobile);
  }

  function tick(now) {
    elapsed += Math.min(.05, Math.max(0, (now - last) / 1000));
    last = now;
    const time = elapsed % end;
    paint(time);
    request = requestAnimationFrame(tick);
  }

  function run() {
    cancelAnimationFrame(request);
    if (paused || reduced.matches) return;
    last = performance.now();
    request = requestAnimationFrame(tick);
  }

  function draw() {
    build();
    elapsed = 0;
    paint(reduced.matches ? end : 0, reduced.matches);
    run();
  }

  const events = [[compact, "change"], [reduced, "change"], [document, "ss-lang"]];
  for (const [target, name] of events) target.addEventListener(name, draw);
  draw();

  const control = {
    show(i) {
      index = Math.max(0, Math.min(SCENES.length - 1, i));
      draw();
    },
    pause() { paused = true; cancelAnimationFrame(request); },
    resume() {
      if (!paused) return;
      paused = false;
      run();
    },
    destroy() {
      control.pause();
      for (const [target, name] of events) target.removeEventListener(name, draw);
      svg.remove();
      delete host.__anim;
    },
    ratio: () => view,
    step: () => index
  };
  host.__anim = control;
  return control;
}

window.SSAnim = window.SSAnim || {};
window.SSAnim[ID] = {steps: 6, mount};
})();
