(function () {
  const id = "n-stx";
  const headings = [
    ["存储参考架构连接计算与数据", "A Storage Reference Architecture Connects Compute and Data"],
    ["存储处理器位于网络与介质之间", "The Storage Processor Sits Between Network and Media"],
    ["Spectrum-X 与 DOCA 分工", "How Spectrum-X and DOCA Divide the Work"],
    ["CMX 将架构用于上下文缓存", "CMX Applies the Architecture to Context Caching"],
    ["企业数据路径服务检索与准备", "The Enterprise Data Path Serves Preparation and Retrieval"]
  ];
  const scenes = [
    {
      nodes: [
        ["存储介质|Storage Media", [97, 149, 153], [176, 82, 220], "", ""],
        ["BlueField-4 STX~存储处理|BlueField-4 STX~Storage Processing", [292, 149, 176], [176, 163, 220], "accent", ""],
        ["Spectrum-X~以太网|Spectrum-X~Ethernet", [485, 149, 156], [176, 244, 220], "accent", ""],
        ["AI 计算任务|AI Workload", [662, 149, 153], [176, 325, 220], "", ""]
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
        ["外部网络|External Network", [91, 118, 150], [176, 54, 222], "", ""],
        ["存储处理|Storage Processing", [380, 118, 192], [176, 147, 210], "accent", ""],
        ["ConnectX-9~网络接入|ConnectX-9~Network Interface", [285, 201, 160], [90, 224, 146], "", ""],
        ["Vera CPU~可编程计算|Vera CPU~Programmable Compute", [475, 201, 185], [261, 224, 152], "", ""],
        ["存储介质|Storage Media", [669, 118, 150], [176, 328, 222], "", ""]
      ],
      edges: [
        [0, 1, "rl", "bt", "data", 0.3],
        [1, 4, "rl", "bt", "data", 1.1]
      ],
      frames: [
        ["BlueField-4 STX", [191, 52, 378, 191], [10, 97, 332, 181]]
      ],
      pulse: [[1, 0.85]],
      legend: []
    },
    {
      nodes: [
        ["计算节点|Compute Node", [105, 128, 150], [102, 69, 166], "", ""],
        ["Spectrum-X", [290, 128, 153], [102, 144, 166], "accent", ""],
        ["BlueField-4", [475, 128, 153], [102, 226, 166], "accent", ""],
        ["存储介质|Storage Media", [660, 128, 153], [102, 305, 166], "", ""],
        ["DOCA~加速服务接口|DOCA~Acceleration APIs", [475, 249, 178], [265, 226, 140], "", ""]
      ],
      edges: [
        [0, 1, "rl", "bt", "data", 0.15],
        [1, 2, "rl", "bt", "data", 1.1],
        [2, 3, "rl", "bt", "data", 2.05],
        [4, 2, "tb", "lr", "ref", null]
      ],
      frames: [],
      pulse: [],
      legend: []
    },
    {
      nodes: [
        ["计算节点 A|Compute A", [133, 130, 168], [86, 73, 146], "", ""],
        ["计算节点 B~本次未读取|Compute B~No Read Here", [133, 243, 214], [266, 73, 157], "muted", ""],
        ["Spectrum-X", [380, 130, 154], [176, 178, 234], "accent", ""],
        ["CMX 闪存~共享 KV Cache|CMX Flash~Shared KV Cache", [629, 130, 208], [176, 312, 226], "accent", "data"]
      ],
      edges: [
        [0, 2, "rl", "bt", "ref", 0.2, [[-10, -10], [-14, -104]]],
        [2, 3, "rl", "bt", "ref", 1.1, [[-10, -10], [-50, -50]]],
        [3, 2, "lr", "tb", "data", 2.05, [[10, 10], [50, 50]]],
        [2, 0, "lr", "tb", "data", 2.95, [[10, 10], [-76, 14]]]
      ],
      frames: [],
      pulse: [[0, 3.72]],
      legend: [
        ["读请求 → CMX|Read Request → CMX", [360, 64], [123, 360]],
        ["KV 块 → 节点 A|KV Block → A", [360, 202], [266, 360]]
      ]
    },
    {
      nodes: [
        ["企业文档|Documents", [97, 156, 152], [176, 78, 222], "", "durable"],
        ["AI Data Platform~准备与索引|AI Data Platform~Preparation & Indexing", [292, 156, 192], [176, 159, 222], "accent", ""],
        ["检索索引|Search Index", [492, 156, 151], [176, 241, 222], "accent", "durable"],
        ["RAG 应用|RAG Application", [666, 156, 145], [176, 333, 222], "", ""]
      ],
      edges: [
        [0, 1, "rl", "bt", "durable", 0.15],
        [1, 2, "rl", "bt", "durable", 1.1],
        [3, 2, "lr", "tb", "ref", 2.05, [[-10, -10], [-25, -25]]],
        [2, 3, "rl", "bt", "data", 3.0, [[10, 10], [25, 25]]]
      ],
      frames: [],
      pulse: [[3, 3.78]],
      legend: [
        ["查询 → 索引|Query → Index", [593, 99], [70, 274]],
        ["相关内容 → RAG|Results → RAG", [606, 225], [282, 274]]
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
          const arrival = mark === "both" ? 3.08 : 2.03;
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
