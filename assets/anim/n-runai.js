(() => {
"use strict";
const ID = "n-runai";
const SCENES = [
  {
    caption: ["从提交到 GPU 放置", "From submission to GPU placement"],
    bands: [
      [["job", ["工作负载", "Workload"], ["", ""], "artifact", ["", ""]]],
      [["cp", ["控制平面", "Control plane"], ["接收提交", "Accepts submissions"], "component", ["", ""]]],
      [["scheduler", ["Run:ai 调度器", "Run:ai scheduler"], ["集群内放置", "Cluster placement"], "component", ["", ""]]],
      [["nodes", ["GPU 节点", "GPU nodes"], ["执行工作负载", "Runs workloads"], "component", ["", ""]]]
    ],
    edges: [
      ["job", "cp", 0, "data", 0],
      ["cp", "scheduler", 0.84, "control", 0],
      ["scheduler", "nodes", 1.68, "control", 0]
    ]
  },
  {
    caption: ["部门队列之下是项目队列", "Projects queue within a department"],
    bands: [
      [["a", ["项目队列甲", "Project A"], ["训练作业", "Training job"], "component", ["", ""]], ["b", ["项目队列乙", "Project B"], ["工作区", "Workspace"], "component", ["", ""]]],
      [["dept", ["部门队列", "Department queue"], ["Run:ai 分层排队", "Run:ai hierarchy"], "component", ["", ""]]],
      [["pool", ["节点池", "Node pool"], ["可用 GPU 节点", "Eligible GPU nodes"], "component", ["", ""]]]
    ],
    edges: [
      ["a", "dept", 0, "control", -12],
      ["b", "dept", 0.34, "control", 12],
      ["dept", "pool", 1.18, "control", 0]
    ]
  },
  {
    caption: ["配额与节点条件均需满足", "Both quota and node fit are checked"],
    bands: [
      [["sched", ["Run:ai 调度器", "Run:ai scheduler"], ["", ""], "component", ["", ""]]],
      [["project", ["项目额度", "Project quota"], ["", ""], "component", ["", ""]]],
      [["dept", ["部门额度", "Dept. quota"], ["", ""], "component", ["", ""]]],
      [["node", ["可用 GPU 节点", "Eligible GPU node"], ["", ""], "good", ["", ""]]]
    ],
    edges: [
      ["sched", "project", 0, "control", 0],
      ["project", "dept", 0.84, "control", 0],
      ["dept", "node", 1.68, "ok", 0]
    ]
  },
  {
    caption: ["闲置 GPU 可分给启用超额的项目", "Idle GPUs can go to an over-quota project"],
    bands: [
      [["pool", ["GPU 节点池", "GPU node pool"], ["有闲置资源", "Idle capacity"], "component", ["", ""]]],
      [["sched", ["Run:ai 调度器", "Run:ai scheduler"], ["核对分配上限", "Checks allocation cap"], "component", ["", ""]]],
      [["extra", ["项目甲", "Project A"], ["允许超额", "Over quota allowed"], "good", ["", ""]], ["quota", ["项目乙", "Project B"], ["限配额内", "Within quota only"], "idle", ["", ""]]]
    ],
    edges: [
      ["pool", "sched", 0, "control", 0],
      ["sched", "extra", 0.84, "ok", 0]
    ]
  },
  {
    caption: ["先收回 GPU，再重新分配", "Reclaim the GPU, then reassign it"],
    bands: [
      [["a", ["项目甲", "Project A"], ["超额占用", "Using spare GPU"], "blocked", ["任务被抢占", "Workload preempted"]]],
      [["sched", ["Run:ai 调度器", "Run:ai scheduler"], ["收回 GPU", "Reclaims GPU"], "component", ["分配 GPU", "Assigns GPU"]]],
      [["b", ["项目乙", "Project B"], ["等待资源", "Waiting for GPU"], "good", ["获得 GPU", "GPU assigned"]]]
    ],
    edges: [
      ["a", "sched", 0, "stop", 0],
      ["sched", "b", 0.99, "ok", 0]
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
        const halfHeight = 34;
        layout.set(key, {
          x: mobile ? width / 2 + delta * (band.length === 3 ? 130 : 197) : axis,
          y: mobile ? axis : 158 + delta * 88,
          w: mobile ? (band.length === 3 ? 122 : 184) : (bands.length === 4 ? 196 : 230),
          top: halfHeight,
          bottom: halfHeight
        });
      });
    });

    const routes = edges.map(([source, target, start, kind, offset]) => {
      const a = layout.get(source);
      const b = layout.get(target);
      const dir = Math.sign(mobile ? b.y - a.y : b.x - a.x);
      const x = mobile ? a.x + offset : a.x + dir * a.w / 2;
      const y = mobile ? a.y + (dir > 0 ? a.bottom : -a.top) : a.y + offset;
      const tx = mobile ? b.x + offset : b.x - dir * b.w / 2;
      const ty = mobile ? b.y + (dir > 0 ? -b.top : b.bottom) : b.y + offset;
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
      const {x, y, w, top, bottom} = layout.get(key);
      const left = x - w / 2;
      const group = add("g", {class: "node " + kind, "data-node": key});
      add("rect", {x: left, y: y - top, width: w, height: top + bottom, rx: 4, class: "panel"}, group);
      const titleY = T(sub) ? -6 : 6;
      text(left + 12, y + titleY, T(name), size, "name", group);
      const label = T(sub) ? text(left + 12, y + titleY + 22, T(sub), small, "sub", group) : null;
      const incoming = routes.filter(route => route.target === key).map(route => route.start + .74);
      const outgoing = routes.filter(route => route.source === key).map(route => route.start + .74);
      return {group, label, sub, end, incoming, outgoing};
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

      }
    };
    paint(reduced.matches ? finish : elapsed);
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
