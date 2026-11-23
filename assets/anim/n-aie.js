(function () {
  const id = "n-aie";
  const headings = [
    ["企业 AI 软件套件", "An Enterprise AI Software Suite"],
    ["从开发工具到模型端点", "From Development Tools to Model Endpoints"],
    ["为应用交付 GPU 资源", "Making GPUs Available to Applications"],
    ["两层有各自的发布节奏", "The Two Layers Have Separate Release Cycles"],
    ["支持范围落到组件和版本", "Support Depends on the Component and Version"]
  ];
  const scenes = [
    {
      nodes: [
        ["应用层|Application Layer", [380, 108, 422], [176, 116, 264], "accent", ""],
        ["基础设施层|Infrastructure Layer", [380, 190, 422], [176, 210, 264], "accent", ""],
        ["GPU 资源|GPU Resources", [380, 265, 190], [176, 334, 214], "", ""]
      ],
      edges: [
        [0, 1, "bt", "bt", "ref", null],
        [1, 2, "bt", "bt", "ref", null]
      ],
      frames: [
        ["AI Enterprise|AI Enterprise", [142, 12, 476, 215], [24, 12, 304, 248]]
      ],
      pulse: [[0, 0.2], [1, 1.55]],
      legend: []
    },
    {
      nodes: [
        ["NeMo~开发与定制|NeMo~Model Customization", [205, 115, 192], [176, 114, 235], "accent", ""],
        ["NIM~模型端点|NIM~Model Endpoint", [528, 115, 192], [176, 214, 235], "accent", ""],
        ["应用请求|Application Request", [528, 242, 192], [176, 330, 235], "", ""]
      ],
      edges: [
        [2, 1, "tb", "tb", "data", 0.35]
      ],
      frames: [
        ["应用层|Application Layer", [82, 22, 568, 146], [42, 28, 268, 226]]
      ],
      pulse: [],
      legend: []
    },
    {
      nodes: [
        ["Run:ai~调度工作负载|Run:ai~Schedules Workloads", [215, 119, 205], [86, 115, 142], "accent", ""],
        ["GPU Operator~管理 GPU 驱动|GPU Operator~Manages Drivers", [545, 119, 205], [266, 115, 142], "accent", ""],
        ["GPU 集群|GPU Cluster", [380, 244, 218], [176, 297, 242], "", ""]
      ],
      edges: [
        [0, 2, "bt", "bt", "ref", null],
        [1, 2, "bt", "bt", "ref", null]
      ],
      frames: [],
      pulse: [[1, 0.2], [0, 1.45], [2, 2.6]],
      legend: []
    },
    {
      nodes: [
        ["应用旧版|App Release", [410, 104, 148], [84, 119, 134], "", ""],
        ["应用新版|App Update", [592, 104, 148], [268, 119, 134], "accent", ""],
        ["基础设施旧版|Infra Release", [410, 232, 148], [84, 266, 134], "", ""],
        ["基础设施新版|Infra Update", [592, 232, 148], [268, 266, 134], "accent", ""]
      ],
      edges: [
        [0, 1, "rl", "rl", "arrow", null],
        [2, 3, "rl", "rl", "arrow", null]
      ],
      frames: [
        ["应用分支|Application Branch", [70, 30, 622, 118], [7, 30, 338, 142]],
        ["基础设施分支|Infrastructure Branch", [70, 158, 622, 118], [7, 177, 338, 144]]
      ],
      pulse: [[1, 0.2], [3, 1.65]],
      legend: []
    },
    {
      nodes: [
        ["NGC 镜像~组件和版本|NGC Image~Component Version", [186, 105, 218], [86, 113, 145], "", ""],
        ["部署配置~驱动与运行环境|Deployment~Drivers and Runtime", [574, 105, 218], [266, 113, 145], "", ""],
        ["支持范围|Support Coverage", [380, 245, 230], [176, 292, 220], "accent", ""]
      ],
      edges: [
        [0, 2, "bt", "bt", "arrow", null],
        [1, 2, "bt", "bt", "arrow", null]
      ],
      frames: [],
      pulse: [[2, 1.1]],
      legend: []
    }
  ];
  const views = [[760, 320], [352, 400]];

  function mount(host, {onLayout, paused = false} = {}) {
    const layout = matchMedia("(max-width: 640px)");
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("role", "img");
    host.classList.add(id + "-figure");
    host.replaceChildren(svg);
    let step = 0, raf = 0, last = null, elapsed = 0;
    let effects = [];
    const view = () => views[Number(layout.matches)];
    const ratio = () => view()[0] / view()[1];
    const en = () => window.SS_LANG === "en";
    const label = words => words.split("|")[Number(en())] ?? words.split("|")[0];

    function el(type, attrs, style, parent = svg) {
      const node = document.createElementNS(ns, type);
      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
      if (style) node.setAttribute("class", style.split(" ").map(name => id + "-" + name).join(" "));
      parent.append(node);
      return node;
    }

    function text(x, y, words, style, parent) {
      const item = el("text", {x, y}, style, parent);
      item.textContent = words;
      return item;
    }

    function chip(x, y, tone, parent) {
      if (tone === "durable") return el("rect", {x: x - 5, y: y - 6, width: 10, height: 12, rx: 1}, "chip durable", parent);
      return el("rect", {x: x - 6, y: y - 4, width: 12, height: 8, rx: 2}, "chip " + tone, parent);
    }

    function port(node, side) {
      const [x, y, w, h] = node;
      return {
        l: [x - w / 2, y], r: [x + w / 2, y],
        t: [x, y - h / 2], b: [x, y + h / 2],
      }[side];
    }

    function orthogonal(a, b, sides) {
      const horizontal = side => side === "l" || side === "r";
      const fromX = horizontal(sides[0]), toX = horizontal(sides[1]);
      if (fromX !== toX) return [a, fromX ? [b[0], a[1]] : [a[0], b[1]], b];
      if (fromX) {
        const x = sides[0] === sides[1] ? Math.min(a[0], b[0]) - 22 : (a[0] + b[0]) / 2;
        return [a, [x, a[1]], [x, b[1]], b];
      }
      const y = (a[1] + b[1]) / 2;
      return [a, [a[0], y], [b[0], y], b];
    }

    function drawLink(parent, a, b, sides, kind, start) {
      const points = orthogonal(a, b, sides);
      const path = el("path", {d: "M" + points.map(point => point.join(" ")).join("L")},
        "link " + kind, parent);
      if (kind !== "busy" && (kind !== "ref" || start != null)) {
        const tail = path.getPointAtLength(Math.max(0, path.getTotalLength() - 6));
        const angle = Math.atan2(b[1] - tail.y, b[0] - tail.x) * 180 / Math.PI;
        el("path", {d: "M-7 -4L0 0L-7 4",
          transform: "translate(" + b.join(" ") + ") rotate(" + angle + ")"}, "link " + kind, parent);
      }
      if (start == null) return;
      const block = chip(0, 0, kind, svg);
      const distance = path.getTotalLength();
      effects.push((time, still) => {
        const phase = (time - start) / 0.78;
        block.style.opacity = still ? 0 : Math.max(0, Math.min(1, phase * 9, (1 - phase) * 9));
        if (!still && phase > 0 && phase < 1) {
          const p = path.getPointAtLength(distance * phase);
          block.setAttribute("transform", "translate(" + p.x + " " + p.y + ")");
        }
      });
    }

    function draw() {
      const [w, h] = view();
      const mobile = layout.matches;
      const {nodes, edges, frames, pulse, legend} = scenes[step];
      svg.replaceChildren();
      effects = [];
      svg.setAttribute("viewBox", "0 0 " + w + " " + h);
      svg.setAttribute("aria-label", headings[step][Number(en())]);
      frames.forEach(([name, desktop, phone]) => {
        const [x, y, width, height] = mobile ? phone : desktop;
        el("rect", {x, y, width, height, rx: 5}, "frame");
        text(x + 12, y + 20, label(name), "frame-label");
      });

      const links = el("g", {}, "");
      const positions = nodes.map(([words, desktop, phone, tone, mark]) => {
        const lines = label(words).split("~");
        return [...(mobile ? phone : desktop), lines.length > 1 ? (mark ? 66 : 55) : (mark ? 52 : 42)];
      });
      const panels = nodes.map(([words, desktop, phone, tone, mark], i) => {
        const [x, y, width, height] = positions[i];
        const lines = label(words).split("~");
        const group = el("g", {}, "");
        const rect = el("rect", {x: x - width / 2, y: y - height / 2, width, height, rx: 5},
          tone ? "panel " + tone : "panel", group);
        lines.forEach((line, j) => text(x, y + (j - (lines.length - 1) / 2) * 20 - (mark ? 7 : 0),
          line, j ? "sub" : "label", group));
        if (mark) {
          const markY = y + height / 2 - 10;
          if (mark === "both") chip(x - 10, markY, "data", group);
          const token = chip(mark === "both" ? x + 10 : x, markY, mark === "both" ? "result" : mark, group);
          const arrival = mark === "both" ? 3.08 : 1.15;
          if (mark === "both" || mark === "result") {
            effects.push((time, still) => { token.style.opacity = still || time >= arrival ? 1 : 0; });
          }
        }
        return rect;
      });
      edges.forEach(([from, to, desktop, phone, kind, start]) => {
        const sides = mobile ? phone : desktop;
        drawLink(links, port(positions[from], sides[0]), port(positions[to], sides[1]), sides, kind, start);
      });
      pulse.forEach(([i, start]) => effects.push((time, still) => {
        panels[i].classList.toggle(id + "-active", still || (time >= start && time < start + 0.85));
      }));
      legend.forEach(([words, desktop, phone]) => text(...(mobile ? phone : desktop), label(words), "note"));
      text(w / 2, h - 15, en() ? "Schematic · No Measured Figures" : "示意，不代表实测数字", "note");
    }

    function render(still) {
      for (const effect of effects) effect(elapsed % 5.1, still);
    }

    function tick(now) {
      elapsed += last === null ? 0 : Math.max(0, Math.min(50, now - last)) / 1000;
      last = now;
      render(false);
      raf = requestAnimationFrame(tick);
    }

    function start() {
      if (!paused && !motion.matches && !raf && effects.length) raf = requestAnimationFrame(tick);
    }

    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
      last = null;
    }

    function rebuild() {
      stop();
      elapsed = 0;
      draw();
      render(motion.matches);
      if (onLayout) onLayout(ratio(), layout.matches);
      start();
    }

    layout.addEventListener("change", rebuild);
    motion.addEventListener("change", rebuild);
    document.addEventListener("ss-lang", rebuild);
    rebuild();

    return {
      show(i) {
        step = Math.max(0, Math.min(scenes.length - 1, i));
        rebuild();
      },
      pause() { paused = true; stop(); },
      resume() { paused = false; start(); },
      destroy() {
        stop();
        layout.removeEventListener("change", rebuild);
        motion.removeEventListener("change", rebuild);
        document.removeEventListener("ss-lang", rebuild);
        host.replaceChildren();
        host.classList.remove(id + "-figure");
      },
      ratio,
      step() { return step; },
    };
  }

  (window.SSAnim ||= {})[id] = {steps: 5, mount};
})();
