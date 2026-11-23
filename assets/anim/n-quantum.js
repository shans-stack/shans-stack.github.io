(function () {
  const id = "n-quantum";
  const headings = [
    ["Quantum 位于节点之间", "Quantum Connects Compute Nodes"],
    ["交换网络可选路径", "The Fabric Can Select Paths"],
    ["交换机参与归约", "Switches Participate in Reduction"],
    ["UFM 负责网络管理", "UFM Manages the Fabric"],
    ["平台代际与光学选项", "Platform Generations and Optical Options"]
  ];
  const scenes = [
    {
      nodes: [
        ["节点 A~ConnectX|Node A~ConnectX", [124, 153, 170], [176, 82, 224], "", ""],
        ["Quantum-X800~InfiniBand 交换机|Quantum-X800~InfiniBand Switch", [380, 153, 220], [176, 204, 224], "accent", ""],
        ["节点 B~ConnectX|Node B~ConnectX", [636, 153, 170], [176, 326, 224], "", ""]
      ],
      edges: [
        [0, 1, "rl", "bt", "data", 0.15],
        [1, 2, "rl", "bt", "data", 1.15]
      ],
      frames: [],
      pulse: [],
      legend: [["LinkX", [246, 122], [72, 139]], ["LinkX", [515, 122], [72, 266]]]
    },
    {
      nodes: [
        ["入口交换机|Ingress Switch", [91, 156, 150], [176, 68, 225], "accent", ""],
        ["路径 A~负载升高|Path A~Elevated Load", [380, 83, 202], [89, 198, 146], "busy", ""],
        ["路径 B~负载较低|Path B~Lower Load", [380, 226, 202], [263, 198, 146], "accent", ""],
        ["出口交换机|Egress Switch", [669, 156, 150], [176, 322, 225], "accent", ""]
      ],
      edges: [
        [0, 1, "rb", "bt", "busy", null],
        [1, 3, "rt", "bt", "busy", null],
        [0, 2, "rl", "bt", "data", 0.25],
        [2, 3, "rl", "bt", "data", 1.3]
      ],
      frames: [],
      pulse: [],
      legend: []
    },
    {
      nodes: [
        ["节点 A~部分值|Node A~Partial Value", [133, 148, 174], [84, 116, 145], "", "both"],
        ["Quantum-X800~SHARP 归约|Quantum-X800~SHARP Reduction", [380, 148, 226], [176, 281, 236], "accent", "result"],
        ["节点 B~部分值|Node B~Partial Value", [627, 148, 174], [268, 116, 145], "", "both"]
      ],
      edges: [
        [0, 1, "rl", "bt", "data", 0.1],
        [2, 1, "lr", "bt", "data", 0.1],
        [1, 0, "lr", "tb", "result", 2.3],
        [1, 2, "rl", "tb", "result", 2.3]
      ],
      frames: [],
      pulse: [[1, 1.35]],
      legend: [["部分值 → 归约结果|Partial Values → Reduced Result", [380, 253], [176, 337]]]
    },
    {
      nodes: [
        ["节点 A|Node A", [119, 106, 162], [86, 90, 144], "", ""],
        ["Quantum-X800", [380, 106, 218], [176, 191, 218], "accent", ""],
        ["节点 B|Node B", [641, 106, 162], [266, 90, 144], "", ""],
        ["UFM~采集与管理|UFM~Telemetry and Management", [380, 250, 231], [176, 328, 250], "", ""]
      ],
      edges: [
        [0, 1, "rl", "bt", "data", 0.15],
        [1, 2, "rl", "tb", "data", 1.15],
        [1, 3, "bt", "bt", "telemetry", 2.4]
      ],
      frames: [],
      pulse: [],
      legend: []
    },
    {
      nodes: [
        ["Quantum-2~ConnectX-7", [215, 125, 247], [176, 105, 260], "accent", ""],
        ["Quantum-X800~ConnectX-8 / ConnectX-9", [545, 125, 247], [176, 223, 260], "accent", ""],
        ["Quantum-X Photonics~CPO 交换机选项|Quantum-X Photonics~CPO Switch Option", [545, 246, 247], [176, 330, 260], "", ""]
      ],
      edges: [
        [1, 2, "bt", "bt", "ref", null]
      ],
      frames: [],
      pulse: [[0, 0.3], [1, 1.55], [2, 2.8]],
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
