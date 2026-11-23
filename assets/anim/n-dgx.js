(function () {
  const id = "n-dgx";
  const headings = [
    ["DGX 交付完整计算系统", "DGX Delivers a Complete Compute System"],
    ["节点内和节点间用不同互联", "Different Fabrics Inside and Between Nodes"],
    ["DGX B200 与 B300", "DGX B200 and B300"],
    ["将互联扩展到整柜", "Extending the Fabric Across a Rack"],
    ["从 DGX 到 BasePOD 与 SuperPOD", "From DGX to BasePOD and SuperPOD"]
  ];
  const scenes = [
    {
      nodes: [
        ["Blackwell Ultra~GPU", [230, 110, 214], [176, 89, 236], "accent", ""],
        ["主机~CPU 与内存|Host~CPU and RAM", [530, 110, 214], [176, 158, 236], "", ""],
        ["本地固态盘~启动与缓存|Local SSDs~Boot and Cache", [230, 226, 214], [176, 227, 236], "", ""],
        ["网卡与 DPU~节点间通信和存储|Adapters and DPUs~Cluster and Storage", [530, 226, 214], [176, 296, 236], "", ""]
      ],
      edges: [],
      frames: [
        ["DGX B300", [78, 18, 604, 253], [24, 10, 304, 328]]
      ],
      pulse: [[0, 0.2], [1, 1.35], [2, 2.5], [3, 3.65]],
      legend: []
    },
    {
      nodes: [
        ["GPU", [145, 96, 170], [83, 98, 124], "accent", ""],
        ["NVLink Switch", [380, 96, 170], [260, 98, 148], "accent", ""],
        ["GPU", [615, 96, 170], [260, 176, 148], "", ""],
        ["ConnectX-8", [145, 203, 170], [83, 208, 124], "accent", ""],
        ["集群网络|Cluster Fabric", [380, 203, 170], [83, 305, 124], "", ""],
        ["BlueField-3", [145, 268, 170], [260, 253, 148], "", ""],
        ["存储／管理网|Storage / Mgmt", [380, 268, 170], [260, 331, 148], "", ""]
      ],
      edges: [
        [0, 1, "rl", "rl", "data", 0.15],
        [1, 2, "rl", "bt", "data", 0.95],
        [0, 3, "bt", "bt", "data", 2.0],
        [3, 4, "rl", "bt", "data", 2.8],
        [5, 6, "rl", "bt", "data", 3.65]
      ],
      frames: [],
      pulse: [],
      legend: []
    },
    {
      nodes: [
        ["B200 GPU", [186, 88, 195], [87, 103, 140], "accent", ""],
        ["NVLink 5", [186, 154, 195], [87, 168, 140], "", ""],
        ["ConnectX-7", [186, 220, 195], [87, 233, 140], "", ""],
        ["B300 GPU", [574, 88, 195], [265, 103, 140], "accent", ""],
        ["NVLink 5", [574, 154, 195], [265, 168, 140], "", ""],
        ["ConnectX-8", [574, 220, 195], [265, 233, 140], "", ""]
      ],
      edges: [
        [0, 1, "bt", "bt", "ref", null],
        [3, 4, "bt", "bt", "ref", null]
      ],
      frames: [
        ["DGX B200", [66, 20, 240, 237], [8, 23, 158, 242]],
        ["DGX B300", [454, 20, 240, 237], [186, 23, 158, 242]]
      ],
      pulse: [[0, 0.15], [3, 0.15], [1, 1.15], [4, 1.15]],
      legend: []
    },
    {
      nodes: [
        ["Vera 与 Rubin~计算托盘|Vera and Rubin~Compute Tray", [200, 106, 170], [176, 85, 226], "accent", ""],
        ["NVLink~交换托盘|NVLink~Switch Tray", [380, 209, 158], [176, 167, 226], "accent", ""],
        ["Vera 与 Rubin~计算托盘|Vera and Rubin~Compute Tray", [560, 106, 170], [176, 249, 226], "", ""],
        ["电源与液冷|Power and Cooling", [380, 94, 176], [176, 318, 226], "muted", ""]
      ],
      edges: [
        [0, 1, "bl", "bt", "data", 0.2],
        [1, 2, "rb", "bt", "data", 1.2]
      ],
      frames: [
        ["DGX Vera Rubin NVL72", [70, 14, 620, 257], [15, 9, 322, 344]]
      ],
      pulse: [],
      legend: []
    },
    {
      nodes: [
        ["DGX 计算单元|DGX Compute", [110, 102, 161], [86, 93, 146], "accent", ""],
        ["集群网络|Cluster Fabric", [290, 102, 161], [266, 93, 146], "", ""],
        ["共享存储|Shared Storage", [470, 102, 161], [86, 191, 146], "", ""],
        ["管理软件|Management", [650, 102, 161], [266, 191, 146], "", ""],
        ["BasePOD / SuperPOD", [380, 253, 248], [176, 322, 242], "accent", ""]
      ],
      edges: [
        [0, 4, "bt", "rt", "arrow", null],
        [1, 4, "bt", "lt", "arrow", null],
        [2, 4, "bt", "bt", "arrow", null],
        [3, 4, "bt", "bt", "arrow", null]
      ],
      frames: [],
      pulse: [[0, 0.15], [1, 0.85], [2, 1.55], [3, 2.25], [4, 3.05]],
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
