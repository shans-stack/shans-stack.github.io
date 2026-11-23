(() => {
"use strict";

const ID = "n-cosmos";
const SCENES = [
  {
    caption: ["世界模型生成候选观测", "The world model generates candidate observations"],
    bands: [
      [{"key": "input", "name": ["工作区视频", "Work Cell Video"], "tiles": ["scene"]}],
      [{"key": "cosmos", "name": ["Cosmos", "Cosmos"], "sub": ["世界基础模型", "World foundation model"]}],
      [{"key": "output", "name": ["候选片段", "Candidate Clip"], "tiles": ["frames"]}]
    ],
    edges: [
      ["input", "cosmos", 0.18, "data", 0],
      ["cosmos", "output", 1.05, "ok", 0]
    ]
  },
  {
    caption: ["动作条件影响后续画面", "Action inputs guide future frames"],
    bands: [
      [{"key": "frame", "name": ["起始帧", "Initial Frame"], "tiles": ["scene"]}, {"key": "actions", "name": ["动作序列", "Action Sequence"], "tiles": ["motion"]}],
      [{"key": "cosmos", "name": ["Cosmos 3 Super", "Cosmos 3 Super"], "sub": ["正向动力学预测", "Forward dynamics"]}],
      [{"key": "output", "name": ["后续观测", "Future Observations"], "tiles": ["frames"]}]
    ],
    edges: [
      ["frame", "cosmos", 0.17, "data", -15],
      ["actions", "cosmos", 0.17, "control", 15],
      ["cosmos", "output", 1.07, "ok", 0]
    ]
  },
  {
    caption: ["光照变化，工作区轮廓保持一致", "The lighting changes while the work-cell layout is retained"],
    bands: [
      [{"key": "depth", "name": ["深度", "Depth"], "tiles": ["depth"]}, {"key": "edge", "name": ["边缘", "Edges"], "tiles": ["scene"]}],
      [{"key": "cosmos", "name": ["Cosmos Transfer", "Cosmos Transfer"], "sub": ["受控视频生成", "Controlled generation"]}],
      [{"key": "output", "name": ["合成画面", "Synthetic Frame"], "tiles": ["lighting"]}]
    ],
    edges: [
      ["depth", "cosmos", 0.18, "control", -15],
      ["edge", "cosmos", 0.18, "control", 15],
      ["cosmos", "output", 1.06, "ok", 0]
    ]
  },
  {
    caption: ["生成候选经过检查后分流", "Generated candidates are screened before use"],
    bands: [
      [{"key": "input", "name": ["候选片段", "Candidate Clips"], "tiles": ["frames"]}],
      [{"key": "review", "name": ["片段评估", "Clip Evaluation"], "sub": ["连续性与结构", "Continuity and structure"]}],
      [{"key": "pass", "name": ["保留", "Accepted"], "tiles": ["checks"]}, {"key": "fail", "name": ["退回", "Rejected"], "tiles": ["cross"]}]
    ],
    edges: [
      ["input", "review", 0.18, "data", 0],
      ["review", "pass", 1.02, "ok", -15],
      ["review", "fail", 1.28, "review", 15]
    ]
  },
  {
    caption: ["筛选后的合成数据补充真实样本", "Curated synthetic clips augment real examples"],
    bands: [
      [{"key": "real", "name": ["真实样本", "Real Examples"], "tiles": ["scene"]}, {"key": "synth", "name": ["合成片段", "Synthetic Clips"], "tiles": ["lighting"]}],
      [{"key": "train", "name": ["策略训练", "Policy Training"], "sub": ["由观测映射到动作", "Maps observations to actions"]}],
      [{"key": "eval", "name": ["目标任务评估", "Target Task Evaluation"], "sub": ["检验机器人策略", "Checks the robot policy"]}]
    ],
    edges: [
      ["real", "train", 0.18, "data", -15],
      ["synth", "train", 0.18, "control", 15],
      ["train", "eval", 1.05, "ok", 0]
    ]
  }
];
const ICONS = {
  "checks": "M2 4l3 3 4-5 M2 13l3 3 4-5 M12 5h6m-6 9h6",
  "motion": "M0 14H5l5-9h10 M16 1l4 4-4 4",
  "cross": "M4 2l11 11m0-11L4 13"
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
    if (["scene", "frames", "depth", "lighting"].includes(tile)) {
      const poses = tile === "frames" ? [0, 2, 4] : tile === "lighting" ? [0, 0] : [0];
      const frames = poses.map((pose, i) => {
        const frame = add("g", {transform: `translate(${i * 58} -2) scale(1.2)`}, group);
        if (tile === "depth") {
          add("path", {d: "M0 18H43V0H0Z", class: "shade", opacity: .15}, frame);
          add("path", {d: "M0 18H43V10H0Z", class: "shade", opacity: .33}, frame);
        }
        if (tile === "lighting" && i === 1) {
          add("path", {d: "M0 18H43V0H0Z", class: "shade", opacity: .23}, frame);
        }
        add("path", {d: "M0 19H43", class: "ground"}, frame);
        add("path", {d: `M3 19v-5h9v5 M7 14l8 -10 ${11 + pose} ${1 + pose} v3 M${23 + pose} 14h6v5h-6Z`}, frame);
        return frame;
      });
      return age => frames.forEach((frame, i) => {
        const progress = tile === "frames" ? clamp((age - i * .18) * 8) : clamp(age * 8);
        frame.setAttribute("opacity", .22 + .78 * progress);
      });
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
window.SSAnim[ID] = {steps: 5, mount};
})();
