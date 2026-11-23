(function () {
  const id = "n-cmx";
  const headings = [
    ["上下文缓存来自模型计算", "Inference Produces the Context Cache"],
    ["CMX 增加共享的闪存层", "CMX Adds a Shared Flash Tier"],
    ["BlueField-4 处理缓存 I/O", "BlueField-4 Handles Cache I/O"],
    ["在解码前把缓存调回内存", "Loading Cache Back Into Memory Before Decode"],
    ["STX 定义架构，CMX 承担缓存层", "STX Defines the Architecture and CMX Provides the Cache Tier"]
  ];
  const scenes = [
    {
      nodes: [
        ["输入 Token|Input Tokens", [96, 149, 141], [176, 65, 220], "", ""],
        ["预填充|Prefill", [279, 149, 152], [176, 152, 220], "", ""],
        ["GPU HBM~KV Cache", [480, 149, 171], [176, 239, 220], "accent", "data"],
        ["解码|Decode", [664, 149, 147], [176, 326, 220], "", ""]
      ],
      edges: [
        [0, 1, "rl", "bt", "data", 0.15],
        [1, 2, "rl", "bt", "data", 1.1],
        [2, 3, "rl", "bt", "data", 2.05]
      ],
      frames: [],
      pulse: [],
      legend: []
    },
    {
      nodes: [
        ["节点本地层~HBM、内存、本地 SSD|Node-Local Tiers~HBM, RAM, Local SSD", [129, 156, 215], [176, 82, 270], "", ""],
        ["CMX (G3.5)~共享缓存闪存|CMX (G3.5)~Shared Cache Flash", [380, 156, 214], [176, 201, 270], "accent", "data"],
        ["持久共享层~文件或对象|Durable Shared Tier~Files or Objects", [631, 156, 214], [176, 322, 270], "muted", "durable"]
      ],
      edges: [
        [0, 1, "rl", "bt", "ref", null],
        [1, 2, "rl", "bt", "ref", null]
      ],
      frames: [],
      pulse: [[1, 0.3]],
      legend: []
    },
    {
      nodes: [
        ["计算节点|Compute Node", [101, 157, 149], [176, 68, 227], "", ""],
        ["Spectrum-X~RDMA", [285, 157, 153], [176, 156, 227], "", ""],
        ["BlueField-4~DOCA Memos", [477, 157, 166], [176, 244, 227], "accent", ""],
        ["CMX 闪存|CMX Flash", [664, 157, 153], [176, 332, 227], "accent", "data"]
      ],
      edges: [
        [0, 1, "rl", "bt", "data", 0.15],
        [1, 2, "rl", "bt", "data", 1.1],
        [2, 3, "rl", "bt", "data", 2.05]
      ],
      frames: [],
      pulse: [],
      legend: []
    },
    {
      nodes: [
        ["CMX~匹配的 KV 块|CMX~Matching KV Block", [130, 156, 195], [176, 81, 238], "accent", "data"],
        ["目标内存~HBM 或主机内存|Target Memory~GPU HBM or Host RAM", [380, 156, 215], [176, 201, 238], "accent", "result"],
        ["解码~读取就位块|Decode~Reads Staged Block", [630, 156, 195], [176, 323, 238], "", ""]
      ],
      edges: [
        [0, 1, "rl", "bt", "data", 0.2],
        [1, 2, "rl", "bt", "result", 2.15]
      ],
      frames: [],
      pulse: [[1, 1.15], [2, 3.05]],
      legend: [["Dynamo / NIXL", [255, 102], [265, 139]]]
    },
    {
      nodes: [
        ["推理任务|Inference", [377, 153, 148], [176, 187, 186], "", ""],
        ["CMX~可重建的 KV Cache|CMX~Rebuildable KV Cache", [102, 153, 179], [176, 74, 214], "accent", "data"],
        ["持久共享存储~原始数据和结果|Durable Storage~Source Data & Results", [648, 153, 198], [176, 322, 218], "", "durable"]
      ],
      edges: [
        [1, 0, "rl", "bt", "data", 0.2],
        [2, 0, "lr", "tb", "durable", 1.65, [[-12, -12], [-50, -50]]],
        [0, 2, "rl", "bt", "durable", 3.1, [[12, 12], [50, 50]]]
      ],
      frames: [],
      pulse: [],
      legend: [
        ["取回 KV 块|Fetch KV Block", [248, 123], [115, 134]],
        ["读原始数据|Read Source", [502, 113], [66, 247]],
        ["写长期结果|Write Results", [502, 196], [287, 247]]
      ]
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

    function port(node, side, offset = 0) {
      const [x, y, w, h] = node;
      return {
        l: [x - w / 2, y + offset], r: [x + w / 2, y + offset],
        t: [x + offset, y - h / 2], b: [x + offset, y + h / 2],
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
      edges.forEach(([from, to, desktop, phone, kind, start, offsets]) => {
        const sides = mobile ? phone : desktop;
        const [fromOffset, toOffset] = (mobile ? offsets?.[1] : offsets?.[0]) ?? [];
        drawLink(links, port(positions[from], sides[0], fromOffset),
          port(positions[to], sides[1], toOffset), sides, kind, start);
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
