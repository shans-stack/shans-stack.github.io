(() => {
"use strict";
const ID = "n-bp";
const SCENES = [
  {
    caption: ["蓝图连接代码与部署描述", "A blueprint connects code to deployment"],
    bands: [
      [["code", ["蓝图参考代码", "Blueprint code"], ["", ""], "component", ["", ""]], ["deploy", ["部署配置", "Deploy config"], ["", ""], "artifact", ["", ""]]],
      [["app", ["RAG 应用", "RAG app"], ["参考实现", "Reference build"], "component", ["", ""]]]
    ],
    edges: [
      ["code", "app", 0, "data", 0],
      ["deploy", "app", 0.3, "data", 0]
    ]
  },
  {
    caption: ["文档进入索引", "Documents become searchable records"],
    bands: [
      [["doc", ["文档", "Documents"], ["", ""], "artifact", ["", ""]]],
      [["ingest", ["NV-Ingest", "NV-Ingest"], ["提取与分块", "Extract and split"], "component", ["", ""]]],
      [["embed", ["嵌入 NIM", "Embedding NIM"], ["片段转向量", "Chunks to vectors"], "component", ["", ""]]],
      [["index", ["向量索引", "Vector index"], ["可检索片段", "Indexed chunks"], "component", ["", ""]]]
    ],
    edges: [
      ["doc", "ingest", 0, "data", 0],
      ["ingest", "embed", 0.84, "data", 0],
      ["embed", "index", 1.68, "data", 0]
    ]
  },
  {
    caption: ["在线查询使用已有索引", "Online queries use the existing index"],
    bands: [
      [["query", ["用户问题", "Question"], ["", ""], "artifact", ["", ""]]],
      [["rag", ["RAG 服务", "RAG server"], ["检索候选片段", "Retrieves chunks"], "component", ["", ""]]],
      [["index", ["向量索引", "Vector index"], ["已建索引", "Already indexed"], "component", ["", ""]], ["ingest", ["摄取服务", "Ingest service"], ["不在查询路径", "Outside query path"], "idle", ["", ""]]]
    ],
    edges: [
      ["query", "rag", 0, "data", 0],
      ["rag", "index", 0.84, "data", -12],
      ["index", "rag", 1.68, "ok", 12]
    ]
  },
  {
    caption: ["问题和证据进入同一个提示", "The question and evidence form a prompt"],
    bands: [
      [["question", ["问题", "Question"], ["", ""], "artifact", ["", ""]], ["chunks", ["选定片段", "Selected chunks"], ["", ""], "artifact", ["", ""]]],
      [["rag", ["RAG 服务", "RAG server"], ["组装提示", "Builds prompt"], "component", ["", ""]]],
      [["model", ["生成 NIM", "Generation NIM"], ["生成文本", "Generates text"], "component", ["", ""]]],
      [["answer", ["回答", "Answer"], ["", ""], "artifact", ["", ""]]]
    ],
    edges: [
      ["question", "rag", 0, "data", 0],
      ["chunks", "rag", 0, "data", 0],
      ["rag", "model", 0.84, "data", 0],
      ["model", "answer", 1.68, "ok", 0]
    ]
  },
  {
    caption: ["部署配置定义服务接口", "Deployment config wires the services together"],
    bands: [
      [["deploy", ["RAG Blueprint", "RAG Blueprint"], ["Helm 或 Docker", "Helm or Docker"], "component", ["", ""]]],
      [["ingest", ["摄取服务", "Ingest"], ["", ""], "component", ["", ""]], ["rag", ["RAG 服务", "RAG server"], ["", ""], "component", ["", ""]], ["models", ["模型服务", "Models"], ["", ""], "component", ["", ""]]]
    ],
    edges: [
      ["deploy", "ingest", 0, "control", -12],
      ["deploy", "rag", 0.32, "control", 0],
      ["deploy", "models", 0.64, "control", 12]
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
