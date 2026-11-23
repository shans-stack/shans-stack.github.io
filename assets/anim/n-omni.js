(() => {
"use strict";
const ID = "n-omni";
const SCENES = [
  {
    caption: ["同一场景包含多个对象", "Multiple objects make up a scene"],
    bands: [
      [["equipment", ["设备", "Equipment"], ["几何", "Geometry"], "artifact", ["", ""]], ["floor", ["地面", "Floor"], ["位置", "Placement"], "artifact", ["", ""]], ["camera", ["相机", "Camera"], ["视角", "Viewpoint"], "artifact", ["", ""]]],
      [["stage", ["Kit 场景", "Stage in Kit"], ["OpenUSD 场景树", "USD hierarchy"], "crate", ["", ""]]]
    ],
    edges: [
      ["equipment", "stage", 0, "data", -12],
      ["floor", "stage", 0.25, "data", 0],
      ["camera", "stage", 0.5, "data", 12]
    ]
  },
  {
    caption: ["几何与摆放来自不同层", "Geometry and placement come from separate layers"],
    bands: [
      [["geo", ["资产层", "Asset layer"], ["设备几何", "Equipment geometry"], "artifact", ["", ""]], ["place", ["场景层", "Scene layer"], ["引用与位置", "Reference and pose"], "artifact", ["", ""]]],
      [["stage", ["Kit 场景", "Stage in Kit"], ["组合后的 Stage", "Composed stage"], "crate", ["", ""]]]
    ],
    edges: [
      ["geo", "stage", 0, "control", -12],
      ["place", "stage", 0.32, "control", 12]
    ]
  },
  {
    caption: ["渲染与物理使用同一场景", "Rendering and physics use the same scene"],
    bands: [
      [["stage", ["OpenUSD Stage", "OpenUSD stage"], ["场景定义", "Scene definition"], "component", ["", ""]]],
      [["kit", ["Omniverse Kit", "Omniverse Kit"], ["应用与扩展", "App and extensions"], "component", ["", ""]]],
      [["render", ["渲染", "Rendering"], ["生成画面", "Produces images"], "component", ["", ""]], ["physics", ["物理", "Physics"], ["更新状态", "Advances state"], "component", ["", ""]]]
    ],
    edges: [
      ["stage", "kit", 0, "data", 0],
      ["kit", "render", 0.84, "data", -12],
      ["kit", "physics", 0.84, "control", 12]
    ]
  },
  {
    caption: ["物理计算更新箱体的位置", "Physics updates the position of the crate"],
    bands: [
      [["definition", ["场景属性", "Scene properties"], ["质量与碰撞", "Mass and collision"], "artifact", ["", ""]]],
      [["physx", ["PhysX", "PhysX"], ["推进刚体状态", "Advances rigid body"], "component", ["", ""]]],
      [["position", ["箱体下落", "Crate falls"], ["接触地面", "Contacts floor"], "fall", ["", ""]]]
    ],
    edges: [
      ["definition", "physx", 0, "data", 0],
      ["physx", "position", 0.84, "control", 0]
    ]
  },
  {
    caption: ["图像与标注来自同一次采样", "An image and its labels come from one sample"],
    bands: [
      [["sample", ["场景采样", "Scene sample"], ["光照与相机", "Light and camera"], "crate", ["", ""]]],
      [["rep", ["Replicator", "Replicator"], ["同步生成输出", "Matching outputs"], "component", ["", ""]]],
      [["rgb", ["图像", "Image"], ["同一箱体", "Same crate"], "crate", ["", ""]], ["labels", ["标注", "Annotations"], ["目标边界框", "Bounding box"], "bbox", ["", ""]]]
    ],
    edges: [
      ["sample", "rep", 0, "data", 0],
      ["rep", "rgb", 0.84, "ok", -12],
      ["rep", "labels", 0.84, "ok", 12]
    ]
  }
];

function mount(host, options = {}) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const compact = matchMedia("(max-width: 640px)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const T = pair => pair[window.SS_LANG === "en" ? 1 : 0];
  let index = 0, elapsed = 0, last = 0, frame, paint, finish;
  let paused = Boolean(options.paused);

  svg.setAttribute("class", ID + "-diagram");
  svg.setAttribute("role", "img");
  host.replaceChildren(svg);


  function add(tag, attrs, parent = svg) {
    const el = document.createElementNS(svg.namespaceURI, tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    parent.append(el);
    return el;
  }

  function draw() {
    const mobile = compact.matches;
    const [width, height] = mobile ? [420, 416] : [920, 320];
    const small = mobile ? 16 : 17;
    const size = mobile ? 17 : 20;
    const halfHeight = 34;
    const {caption, bands, edges} = SCENES[index];

    svg.replaceChildren();
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("aria-label", [T(caption), ...bands.flat().map(([, name, sub, , end]) =>
      [T(name), [T(sub), T(end)].filter(Boolean).join(" → ")].filter(Boolean).join(" · ")
    )].join(". "));

    function text(x, y, value, fontSize, className, parent) {
      const label = add("text", {x, y, "font-size": fontSize, class: className}, parent);
      label.textContent = value;
      return label;
    }

    const layout = new Map();
    bands.forEach((band, lane) => {
      const axis = mobile ? 29 + (lane + .5) * 330 / bands.length : 16 + (lane + .5) * 888 / bands.length;
      band.forEach(([key], row) => {
        const delta = row - (band.length - 1) / 2;
        layout.set(key, {
          x: mobile ? width / 2 + delta * (band.length === 3 ? 130 : 197) : axis,
          y: mobile ? axis : 158 + delta * 88,
          w: mobile ? (band.length === 3 ? 122 : 184) : (bands.length === 4 ? 196 : 230)
        });
      });
    });

    const routes = edges.map(([source, target, start, kind, offset]) => {
      const a = layout.get(source);
      const b = layout.get(target);
      const dir = Math.sign(mobile ? b.y - a.y : b.x - a.x);
      const x = mobile ? a.x + offset : a.x + dir * a.w / 2;
      const y = mobile ? a.y + dir * halfHeight : a.y + offset;
      const tx = mobile ? b.x + offset : b.x - dir * b.w / 2;
      const ty = mobile ? b.y - dir * halfHeight : b.y + offset;
      const bend = mobile ? (y + ty) / 2 + offset / 2 : (x + tx) / 2 + offset / 2;
      const d = mobile ? `M${x},${y} V${bend} H${tx} V${ty}` : `M${x},${y} H${bend} V${ty} H${tx}`;
      const route = add("path", {d, class: "route " + kind, "data-edge": source + "-" + target});
      const arrow = add("path", {
        d: mobile ? `M${tx-4},${ty-dir*8} L${tx},${ty-dir} L${tx+4},${ty-dir*8}`
          : `M${tx-dir*8},${ty-4} L${tx-dir},${ty} L${tx-dir*8},${ty+4}`,
        class: "arrow route " + kind
      });
      const length = route.getTotalLength();
      return {source, target, start, route, arrow, length, kind};
    });

    const cards = bands.flat().map(([key, name, sub, kind, end]) => {
      const {x, y, w} = layout.get(key);
      const left = x - w / 2;
      const group = add("g", {class: "node " + kind, "data-node": key});
      add("rect", {x: left, y: y - halfHeight, width: w, height: 2 * halfHeight, rx: 4, class: "panel"}, group);
      const titleY = T(sub) ? -6 : 6;
      text(left + 12, y + titleY, T(name), size, "name", group);
      const label = T(sub) ? text(left + 12, y + titleY + 22, T(sub), small, "sub", group) : null;
      const detail = drawDetail(kind, left + w - 26, y + 9, group);
      const incoming = routes.filter(route => route.target === key).map(route => route.start + .74);
      const outgoing = routes.filter(route => route.source === key).map(route => route.start + .74);
      return {group, detail, label, sub, end, kind, incoming, outgoing};
    });

    for (const route of routes) {
      route.packet = add("rect", {width: 9, height: 9, rx: 1.5, class: "packet " + route.kind});
    }
    text(16, height - 12, T(["示意，不代表实测数字", "Schematic. No measured data."]), small, "note");

    finish = Math.max(...routes.map(route => route.start)) + 1.5;
    paint = time => {
      for (const edge of routes) {
        const delay = time - edge.start;
        const active = delay >= 0 && delay < .96;
        const progress = Math.min(1, Math.max(0, delay / .74));
        const point = edge.route.getPointAtLength(4 + progress * (edge.length - 8));
        edge.route.classList.toggle("active", active);
        edge.arrow.classList.toggle("active", active);
        edge.packet.setAttribute("transform", `translate(${point.x - 4.5},${point.y - 4.5})`);
        edge.packet.setAttribute("opacity", Math.max(0, Math.min(1, delay * 14, (.96 - delay) * 10)));
      }
      for (const card of cards) {
        const arrived = card.incoming.some(timeAt => time >= timeAt);
        const changed = arrived || card.outgoing.some(timeAt => time >= timeAt);
        card.group.classList.toggle("arrived", arrived);
        if (T(card.end)) {
          const value = T(changed ? card.end : card.sub);
          if (card.label.textContent !== value) card.label.textContent = value;
        }
        if (card.kind === "fall") {
          const progress = Math.max(0, Math.min(1, (time - .92) / .65));
          card.detail.setAttribute("transform", `translate(0,${-20 * (1 - progress * progress)})`);
        }
      }
    };
    paint(reduced.matches ? finish : elapsed);
  }

  function drawDetail(kind, x, y, group) {
    if (!["crate", "fall", "bbox"].includes(kind)) return;
    const picture = add("g", {transform: `translate(${x},${y})`, class: "picture"}, group);
    add("path", {d: "M-15 6 L0 -1 L15 6 L0 13 Z", class: "floor"}, picture);
    const crate = add("g", {class: "crate-shape"}, picture);
    add("path", {d: "M-8 -7 L0 -11 L8 -7 L0 -3 Z M-8 -7 V2 L0 6 L8 2 V-7 M0 -3 V6"}, crate);
    if (kind === "bbox") {
      add("rect", {x: -11, y: -13, width: 22, height: 21, class: "boundary"}, picture);
    }
    return crate;
  }

  function tick(now) {
    elapsed += Math.max(0, now - last) / 1000;
    last = now;
    paint(elapsed);
    if (elapsed < finish) frame = requestAnimationFrame(tick);
  }

  function run() {
    cancelAnimationFrame(frame);
    paint(reduced.matches ? finish : elapsed);
    if (paused || reduced.matches || elapsed >= finish) return;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }

  function layoutChanged() {
    draw();
    options.onLayout?.(ratio(), compact.matches);
    run();
  }

  function ratio() {
    return compact.matches ? 420 / 416 : 920 / 320;
  }

  function show(step) {
    index = Math.max(0, Math.min(SCENES.length - 1, step));
    elapsed = 0;
    draw();
    run();
  }

  document.addEventListener("ss-lang", draw);
  compact.addEventListener("change", layoutChanged);
  reduced.addEventListener("change", run);
  layoutChanged();
  const controller = {
    show, ratio, step: () => index,
    pause() { paused = true; cancelAnimationFrame(frame); },
    resume() { if (paused) { paused = false; run(); } },
    destroy() {
      cancelAnimationFrame(frame);
      document.removeEventListener("ss-lang", draw);
      compact.removeEventListener("change", layoutChanged);
      reduced.removeEventListener("change", run);
      host.replaceChildren();
      delete host.__anim;
    }
  };
  host.__anim = controller;
  return controller;
}

window.SSAnim = window.SSAnim || {};
window.SSAnim[ID] = {steps: 5, mount};
})();
