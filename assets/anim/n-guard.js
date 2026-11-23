(() => {
"use strict";
const ID = "n-guard";
const SCENES = [
  {
    caption: ["放行或拒绝进入应用", "Accept or reject incoming input"],
    bands: [
      [["input", ["用户消息", "User message"], ["示例 A · 检查通过", "A · Passes check"], "artifact", ["", ""]]],
      [["gate", ["输入护栏", "Input rail"], ["NeMo Guardrails", "NeMo Guardrails"], "component", ["", ""]]],
      [["ready", ["继续处理", "Continue"], ["检查通过时", "If accepted"], "good", ["", ""]], ["stop", ["拒绝消息", "Reject"], ["终止处理", "Processing ends"], "blocked", ["", ""]]]
    ],
    edges: [
      ["input", "gate", 0, "data", 0],
      ["gate", "ready", 0.84, "ok", -12],
      ["gate", "stop", 1.53, "stop", 12]
    ]
  },
  {
    caption: ["会话状态决定下一步", "Conversation state selects the next action"],
    bands: [
      [["state", ["会话状态", "Dialog state"], ["示例 A · 命中预设", "A · Preset applies"], "artifact", ["", ""]]],
      [["rule", ["对话护栏", "Dialog rail"], ["Colang 规则", "Colang rules"], "component", ["", ""]]],
      [["preset", ["预设回复", "Preset response"], ["命中预设时", "If preset applies"], "component", ["", ""]], ["model", ["模型调用", "Model call"], ["需要生成时", "If generation needed"], "component", ["", ""]]]
    ],
    edges: [
      ["state", "rule", 0, "data", 0],
      ["rule", "preset", 0.84, "control", -12],
      ["rule", "model", 1.53, "control", 12]
    ]
  },
  {
    caption: ["筛查片段后再组装提示", "Check retrieved chunks before prompting"],
    bands: [
      [["chunks", ["检索结果", "Retrieved chunks"], ["", ""], "artifact", ["", ""]]],
      [["rail", ["检索护栏", "Retrieval rail"], ["片段级检查", "Chunk checks"], "component", ["", ""]]],
      [["keep", ["加入提示", "Include in prompt"], ["", ""], "good", ["", ""]], ["remove", ["移除片段", "Remove chunk"], ["", ""], "blocked", ["", ""]]]
    ],
    edges: [
      ["chunks", "rail", 0, "data", 0],
      ["rail", "keep", 0.84, "ok", -12],
      ["rail", "remove", 1.53, "stop", 12]
    ]
  },
  {
    caption: ["动作前后分别检查", "Checks surround the custom action"],
    bands: [
      [["before", ["执行护栏", "Execution rail"], ["检查参数", "Check arguments"], "component", ["", ""]]],
      [["action", ["自定义动作", "Custom action"], ["运行查询", "Run lookup"], "component", ["", ""]]],
      [["after", ["执行护栏", "Execution rail"], ["检查结果", "Check result"], "component", ["", ""]]],
      [["return", ["应用流程", "App flow"], ["使用结果", "Use result"], "component", ["", ""]]]
    ],
    edges: [
      ["before", "action", 0, "data", 0],
      ["action", "after", 0.84, "data", 0],
      ["after", "return", 1.68, "ok", 0]
    ]
  },
  {
    caption: ["候选回复经过交付检查", "Check a candidate before returning it"],
    bands: [
      [["draft", ["候选回复", "Candidate reply"], ["示例 A · 检查通过", "A · Passes check"], "artifact", ["", ""]]],
      [["rail", ["输出护栏", "Output rail"], ["回复策略", "Response policy"], "component", ["", ""]]],
      [["deliver", ["返回回复", "Return reply"], ["交付原回复", "Original reply"], "good", ["", ""]], ["replace", ["拦截并替换", "Block and replace"], ["只交付替代回复", "Replacement only"], "blocked", ["", ""]]]
    ],
    edges: [
      ["draft", "rail", 0, "data", 0],
      ["rail", "deliver", 0.84, "ok", -12],
      ["rail", "replace", 1.53, "stop", 12]
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

  const alternativeInputs = {
    0: ["示例 B · 检查未通过", "B · Fails check"],
    1: ["示例 B · 需要生成", "B · Needs generation"],
    4: ["示例 B · 触发拦截", "B · Triggers block"]
  };
  const exampleTime = 2.7;

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
      return {key, group, label, sub, end, incoming, outgoing};
    });

    for (const route of routes) {
      route.packet = add("rect", {width: 9, height: 9, rx: 1.5, class: "packet " + route.kind});
    }
    text(16, height - 12, T(["示意，不代表实测数字", "Schematic. No measured data."]), small, "note");

    const alternative = alternativeInputs[index];
    const input = cards[0];
    finish = alternative ? exampleTime * 2 : Math.max(...routes.map(route => route.start)) + 1.5;
    paint = time => {
      const second = Boolean(alternative) && time >= exampleTime;
      const chosen = alternative ? routes[second ? 2 : 1] : null;
      if (alternative) {
        const value = T(second ? alternative : input.sub);
        if (input.label.textContent !== value) input.label.textContent = value;
      }
      for (const edge of routes) {
        const branch = alternative && edge !== routes[0];
        const idle = branch && edge !== chosen;
        const delay = idle ? -1 : (second ? time - exampleTime : time) - (branch ? .84 : edge.start);
        edge.route.classList.toggle("idle", Boolean(idle));
        edge.arrow.classList.toggle("idle", Boolean(idle));
        const active = delay >= 0 && delay < .96;
        const progress = Math.min(1, Math.max(0, delay / .74));
        const point = edge.route.getPointAtLength(4 + progress * (edge.length - 8));
        edge.route.classList.toggle("active", active);
        edge.arrow.classList.toggle("active", active);
        edge.packet.setAttribute("transform", `translate(${point.x - 4.5},${point.y - 4.5})`);
        edge.packet.setAttribute("opacity", Math.max(0, Math.min(1, delay * 14, (.96 - delay) * 10)));
      }
      for (const card of cards) {
        const arrived = alternative
          ? card.key === chosen.target && (time % exampleTime >= 1.58 || time >= finish)
          : card.incoming.some(timeAt => time >= timeAt);
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
