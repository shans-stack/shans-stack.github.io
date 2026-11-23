(() => {
"use strict";

const ID = "n-nemo";
const SCENES = [
  {
    caption: ["训练数据、权重和评估结果逐段交接", "Data, weights, and evaluation results pass between stages"],
    bands: [
      [{"key": "data", "name": ["整理数据", "Curate Data"], "tiles": ["file", "file", "file"]}],
      [{"key": "train", "name": ["NeMo 训练", "NeMo Training"], "tiles": ["chip", "layers"]}],
      [{"key": "eval", "name": ["评估模型", "Evaluate Model"], "tiles": ["checks"]}]
    ],
    edges: [
      ["data", "train", 0.18, "data", 0],
      ["train", "eval", 1.04, "ok", 0]
    ]
  },
  {
    caption: ["重复样本在整理阶段合并", "Duplicate samples are consolidated during curation"],
    bands: [
      [{"key": "input", "name": ["原始样本", "Raw Examples"], "tiles": ["A", "A", "B"]}],
      [{"key": "curator", "name": ["NeMo Curator", "NeMo Curator"], "sub": ["去重与过滤", "Deduplicate and filter"], "tiles": ["filter"]}],
      [{"key": "output", "name": ["训练集", "Training Set"], "tiles": ["A", "B"]}]
    ],
    edges: [
      ["input", "curator", 0.18, "data", 0],
      ["curator", "output", 1.1, "ok", 0]
    ]
  },
  {
    caption: ["基础权重固定，适配器更新", "Base weights stay fixed while the adapter is updated"],
    bands: [
      [{"key": "base", "name": ["基础权重", "Base Weights"], "tiles": ["fixed", "fixed"]}, {"key": "data", "name": ["任务样本", "Task Examples"], "tiles": ["file", "file"]}],
      [{"key": "bridge", "name": ["Megatron Bridge", "Megatron Bridge"], "sub": ["训练适配器", "Trains adapter"]}],
      [{"key": "candidate", "name": ["定制模型", "Adapted Model"], "sub": ["基础权重与适配器", "Base weights and adapter"], "tiles": ["fixed", "fixed", "adapter"]}]
    ],
    edges: [
      ["base", "bridge", 0.18, "control", -15],
      ["data", "bridge", 0.18, "data", 15],
      ["bridge", "candidate", 1.15, "ok", 0]
    ]
  },
  {
    caption: ["同一套任务和评分规则用于两个模型", "Both models use the same tasks and scoring rules"],
    bands: [
      [{"key": "tasks", "name": ["同一任务集", "Same Task Set"], "tiles": ["A", "B"]}],
      [{"key": "baseline", "name": ["基础模型", "Baseline Model"]}, {"key": "tuned", "name": ["定制模型", "Adapted Model"]}],
      [{"key": "eval", "name": ["NeMo Evaluator", "NeMo Evaluator"], "sub": ["同一评分规则", "Same scoring rules"]}]
    ],
    edges: [
      ["tasks", "baseline", 0.18, "data", -15],
      ["tasks", "tuned", 0.18, "data", 15],
      ["baseline", "eval", 1.04, "ok", -15],
      ["tuned", "eval", 1.04, "ok", 15]
    ]
  },
  {
    caption: ["评估决定部署与下一轮数据整理", "Evaluation informs deployment and the next round of curation"],
    bands: [
      [{"key": "curate", "name": ["数据整理", "Data Curation"], "sub": ["接收失败样本", "Receives failed cases"]}],
      [{"key": "eval", "name": ["NeMo Evaluator", "NeMo Evaluator"], "sub": ["失败样本与放行信号", "Cases and approval"]},
       {"key": "model", "name": ["候选模型库", "Model Registry"], "sub": ["通过的权重或适配器", "Weights or adapter"], "tiles": ["file"]}],
      [{"key": "serve", "name": ["推理服务", "Inference Service"], "sub": ["部署通过的候选模型", "Deploys approved model"]}]
    ],
    edges: [
      ["eval", "curate", 0.18, "review", 0],
      ["eval", "serve", 0.18, "control", -15],
      ["model", "serve", 1.15, "ok", 15]
    ]
  }
];
const ICONS = {
  "file": "M2 0H12l4 4v13H2Z M12 0v4h4 M5 8h8 M5 12h8",
  "chip": "M4 3H15V14H4Z M7 6h5v5H7Z M0 6h4m-4 5h4m11-5h4m-4 5h4",
  "layers": "M1 5L9 0l8 5-8 5Z M1 9l8 5 8-5 M1 13l8 5 8-5",
  "checks": "M2 4l3 3 4-5 M2 13l3 3 4-5 M12 5h6m-6 9h6",
  "filter": "M1 1h17l-7 8v6l-4 2V9Z",
  "fixed": "M1 4h16v13H1Z M4 12l4-4m1 5 4-4",
  "adapter": "M1 4h16v13H1Z M6 10h6m-3-3v6"
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
    
    const icon = ICONS[tile];
    if (icon) add("path", {d: icon}, group);
    else {
      add("path", {d: "M0 0H18V16H0Z"}, group);
      label(9, 12.5, tile, "tile-text", group).setAttribute("text-anchor", "middle");
    }
    if (tile === "adapter") return age => group.setAttribute("opacity", .22 + .78 * clamp(age * 7));
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
window.SSAnim[ID] = {steps: 5, mount};
})();
