(() => {
"use strict";
const ID = "n-mc";
const SCENES = [
  {
    caption: ["管理服务协调计算资源", "Management services coordinate compute"],
    bands: [
      [["ops", ["Mission Control", "Mission Control"], ["管理平面", "Management plane"], "component", ["", ""]]],
      [["bcm", ["BCM", "BCM"], ["节点配置", "Provisioning"], "component", ["", ""]], ["sched", ["调度器", "Scheduler"], ["分配作业", "Places jobs"], "component", ["", ""]], ["health", ["健康服务", "Health"], ["监控与恢复", "Health checks"], "component", ["", ""]]],
      [["nodes", ["GPU 节点", "GPU nodes"], ["执行作业", "Runs workloads"], "component", ["", ""]]]
    ],
    edges: [
      ["ops", "bcm", 0, "control", -11],
      ["ops", "sched", 0.18, "control", 0],
      ["ops", "health", 0.36, "control", 11],
      ["bcm", "nodes", 0.93, "control", -11],
      ["sched", "nodes", 1.12, "control", 0],
      ["nodes", "health", 1.3, "ok", 11]
    ]
  },
  {
    caption: ["同一镜像可部署到多个节点", "One image provisions multiple nodes"],
    bands: [
      [["bcm", ["BCM", "BCM"], ["原始软件镜像", "Source image"], "source", ["", ""]]],
      [["one", ["计算节点甲", "Compute node A"], ["镜像副本", "Image copy"], "copy", ["", ""]], ["two", ["计算节点乙", "Compute node B"], ["镜像副本", "Image copy"], "copy", ["", ""]]]
    ],
    edges: [
      ["bcm", "one", 0, "control", -12],
      ["bcm", "two", 0.32, "control", 12]
    ]
  },
  {
    caption: ["按工作负载环境选择调度器", "Each environment uses its workload manager"],
    bands: [
      [["job", ["提交作业", "Job submission"], ["", ""], "artifact", ["", ""]], ["ops", ["Mission Control", "Mission Control"], ["工作负载环境", "Job environment"], "component", ["", ""]]],
      [["sched", ["Slurm", "Slurm"], ["集群作业", "Cluster batch jobs"], "component", ["", ""]]],
      [["node", ["就绪节点", "Ready nodes"], ["执行作业", "Runs jobs"], "good", ["", ""]]]
    ],
    edges: [
      ["job", "sched", 0, "data", -12],
      ["ops", "sched", 0, "control", 12],
      ["sched", "node", 0.84, "control", 0]
    ]
  },
  {
    caption: ["节点健康决定是否恢复调度", "Node health gates return to scheduling"],
    bands: [
      [["issue", ["异常节点", "Suspect node"], ["暂停调度", "No new jobs"], "blocked", ["", ""]]],
      [["ahr", ["硬件恢复", "Hardware recovery"], ["验证通过？", "Verification passed?"], "component", ["", ""]]],
      [["ready", ["恢复调度", "Return to pool"], ["通过 · 本次示例", "Passed in this example"], "good", ["", ""]], ["hold", ["保留待查", "Hold for review"], ["未通过时", "If verification fails"], "idle", ["", ""]]]
    ],
    edges: [
      ["issue", "ahr", 0, "stop", 0],
      ["ahr", "ready", 0.84, "ok", -12],
      ["ahr", "hold", null, "idle", 12]
    ]
  },
  {
    caption: ["重新排队后由应用读取检查点", "After requeue, the app loads its checkpoint"],
    bands: [
      [["job", ["作业中断", "Job interrupted"], ["", ""], "blocked", ["", ""]]],
      [["ajr", ["作业恢复", "Job recovery"], ["请求重新排队", "Requests requeue"], "component", ["", ""]]],
      [["queue", ["Slurm 队列", "Slurm queue"], ["", ""], "component", ["", ""]], ["checkpoint", ["检查点", "Checkpoint"], ["已保存训练状态", "Saved state"], "artifact", ["", ""]]],
      [["restart", ["训练进程", "Training process"], ["加载检查点", "Loads checkpoint"], "good", ["", ""]]]
    ],
    edges: [
      ["job", "ajr", 0, "stop", 0],
      ["ajr", "queue", 0.84, "control", 0],
      ["queue", "restart", 1.68, "control", -12],
      ["checkpoint", "restart", 2.45, "ok", 12]
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
  let runai = false;
  const button = document.createElement("button");
  button.type = "button";
  button.className = ID + "-switch";
  host.classList.add(ID + "-host");
  host.append(button);
  button.addEventListener("click", () => { runai = !runai; show(index); });

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
    let renderBands = bands;
    button.hidden = index !== 2;
    button.textContent = runai ? T(["切换到 Slurm", "Show Slurm"]) : T(["切换到 Run:ai", "Show Run:ai"]);
    if (index === 2 && runai) {
      const scheduler = bands[1][0].slice();
      scheduler[1] = ["Run:ai", "Run:ai"];
      scheduler[2] = ["Kubernetes 作业", "Kubernetes jobs"];
      renderBands = [bands[0], [scheduler], bands[2]];
    }
    svg.replaceChildren();
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("aria-label", [T(caption), ...renderBands.flat().map(([, name, sub, , end]) =>
      [T(name), [T(sub), T(end)].filter(Boolean).join(" → ")].filter(Boolean).join(" · ")
    )].join(". "));

    function text(x, y, value, fontSize, className, parent) {
      const label = add("text", {x, y, "font-size": fontSize, class: className}, parent);
      label.textContent = value;
      return label;
    }

    const layout = new Map();
    renderBands.forEach((band, lane) => {
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

    const cards = renderBands.flat().map(([key, name, sub, kind, end]) => {
      const {x, y, w} = layout.get(key);
      const left = x - w / 2;
      const group = add("g", {class: "node " + kind, "data-node": key});
      add("rect", {x: left, y: y - halfHeight, width: w, height: 2 * halfHeight, rx: 4, class: "panel"}, group);
      const titleY = T(sub) ? -6 : 6;
      text(left + 12, y + titleY, T(name), size, "name", group);
      const label = T(sub) ? text(left + 12, y + titleY + 22, T(sub), small, "sub", group) : null;
      const detail = drawDetail(kind, left + w - 26, y + 9, group);
      const incoming = routes.filter(route => route.target === key && route.start !== null).map(route => route.start + .74);
      const outgoing = routes.filter(route => route.source === key && route.start !== null).map(route => route.start + .74);
      return {group, detail, label, sub, end, kind, incoming, outgoing};
    });

    for (const route of routes) {
      if (route.start === null) continue;
      route.packet = add("rect", {width: 9, height: 9, rx: 1.5, class: "packet " + route.kind});
    }
    text(16, height - 12, T(["示意，不代表实测数字", "Schematic. No measured data."]), small, "note");

    finish = Math.max(...routes.map(route => route.start)) + 1.5;
    paint = time => {
      for (const edge of routes) {
        if (!edge.packet) continue;
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

  function drawDetail(kind, x, y, group) {
    if (kind === "source" || kind === "copy") {
      return add("rect", {x: x - 4, y: y - 3, width: 10, height: 10, rx: 1.5,
        class: "packet " + (kind === "copy" ? "image-copy" : "")}, group);
    }
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
      host.classList.remove(ID + "-host");
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
