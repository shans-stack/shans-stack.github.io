(() => {
  const id = "n-grace";
  const sizes = [[800, 365], [360, 424]];
  const scenes = [
    {
      title: ["Grace 在系统中的位置","Grace’s Role in the System"],
      panels: [
        [["应用与系统","Apps and OS"],["主机工作","Host Workload"],[140,178,202],[180,78,236],"primary",false],
        [["Grace CPU","Grace CPU"],["主机处理器","Host Processor"],[400,178,202],[180,194,236],"primary"],
        [["GPU","GPU"],["并行加速","Parallel Acceleration"],[660,178,202],[180,310,236],"primary",false]
      ],
      links: [[0,1,"data",0.2],[1,2,"control",1.65]]
    },
    {
      title: ["核心、片上互联与主机内存","Cores, On-Chip Fabric, and Host Memory"],
      panels: [
        [["Grace CPU","Grace CPU"],["Neoverse V2 核心","Neoverse V2 Cores"],[135,179,210],[180,70,248],"primary"],
        [["SCF","SCF"],["片上一致性互联","On-Chip Coherency"],[394,179,211],[180,174,239],"primary",false],
        [["片上缓存","On-Chip Cache"],["分布式","Distributed"],[660,102,217],[88,313,159],"primary",false],
        [["LPDDR5X","LPDDR5X"],["主机内存","Host Memory"],[660,252,217],[272,313,159],"primary",false]
      ],
      links: [[0,1,"data",0.2],[1,2,"data",1.6],[1,3,"signal",2.95]]
    },
    {
      title: ["两颗 Grace 组成 CPU Superchip","Two Grace CPUs in a CPU Superchip"],
      panels: [
        [["Grace A","Grace A"],null,[206,92,212],[88,116,158],"primary"],
        [["Grace B","Grace B"],null,[594,92,212],[272,116,158],"primary",false],
        [["本地内存 A","Local Memory A"],null,[206,251,212],[88,273,158],"plain",false],
        [["本地内存 B","Local Memory B"],null,[594,251,212],[272,273,158],"plain",false]
      ],
      links: [[0,1,"data",0.2],[0,2,"signal"],[1,3,"signal",1.65]],
      caption: ["双路 · NVLink-C2C","Dual-Socket · NVLink-C2C"]
    },
    {
      title: ["Grace 与 GPU 组成加速模块","Pairing Grace with GPUs"],
      panels: [
        [["Grace CPU","Grace CPU"],["LPDDR5X 主机内存","LPDDR5X Host Memory"],[140,178,202],[180,78,236],"primary"],
        [["NVLink-C2C","NVLink-C2C"],["一致性访问","Coherent Access"],[400,178,202],[180,194,236],"primary",false],
        [["Blackwell GPU","Blackwell GPU"],["HBM 显存","HBM GPU Memory"],[660,178,202],[180,310,236],"primary",false]
      ],
      links: [[0,1,"data",0.2],[1,2,"data",1.6]],
      caption: ["芯片间共享地址空间","Shared Address Space"]
    },
    {
      title: ["Grace 与 Vera 的代际位置","Grace and Vera Across Generations"],
      panels: [
        [["GB200","GB200"],["Blackwell","Blackwell"],[163,85,236],[88,75,160],"primary"],
        [["Grace CPU","Grace CPU"],["Neoverse V2","Neoverse V2"],[637,85,236],[272,75,160],"plain",false],
        [["GB300","GB300"],["Blackwell Ultra","Blackwell Ultra"],[163,178,236],[88,186,160],"primary",false],
        [["Grace CPU","Grace CPU"],["Neoverse V2","Neoverse V2"],[637,178,236],[272,186,160],"plain",false],
        [["Vera Rubin","Vera Rubin"],["Rubin GPU","Rubin GPU"],[163,271,236],[88,297,160],"primary",false],
        [["Vera CPU","Vera CPU"],["Olympus","Olympus"],[637,271,236],[272,297,160],"plain",false]
      ],
      links: [[0,1,"data",0.2],[2,3,"data",1.15],[4,5,"data",2.1]]
    }
  ];

  function mount(host, {onLayout, paused = false} = {}) {
    const narrow = matchMedia("(max-width: 640px)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("role", "img");
    host.classList.add(id + "-figure");
    host.replaceChildren(svg);

    let index = 0, raf = 0, last = 0, elapsed = 0, effects = [];
    const size = () => sizes[Number(narrow.matches)];
    const ratio = () => size()[0] / size()[1];
    const translate = words => words[window.SS_LANG === "en" ? 1 : 0];

    function element(name, attrs, parent = svg) {
      const item = document.createElementNS(svg.namespaceURI, name);
      for (const [key, value] of Object.entries(attrs)) item.setAttribute(key, value);
      parent.append(item);
      return item;
    }

    function label(x, y, words, kind, parent) {
      const item = element("text", {x, y, class: id + "-" + kind}, parent);
      item.textContent = translate(words);
      return item;
    }

    function panel(node) {
      const {x, y, w, name, detail, tone} = node;
      const group = element("g", {}, svg);
      const box = element("rect", {
        x: x - w / 2, y: y - 32, width: w, height: 64, rx: 4,
        class: id + "-panel " + id + "-" + (tone || "plain")
      }, group);
      const lineY = detail ? y - 10 : y;
      label(x, lineY, name, "label", group);
      if (detail) label(x, y + 13, detail, "detail", group);
      return box;
    }

    function link(a, b, tone, parent) {
      const vertical = a.x === b.x || (narrow.matches && Math.abs(b.y - a.y) > 86);
      const sign = Math.sign(vertical ? b.y - a.y : b.x - a.x);
      const start = vertical ? [a.x, a.y + 32 * sign] : [a.x + a.w / 2 * sign, a.y];
      const end = vertical ? [b.x, b.y - 32 * sign] : [b.x - b.w / 2 * sign, b.y];
      const middle = vertical ? (start[1] + end[1]) / 2 : (start[0] + end[0]) / 2;
      const bends = vertical ? [[start[0], middle], [end[0], middle]] : [[middle, start[1]], [middle, end[1]]];
      const path = element("path", {d: "M" + [start, ...bends, end].map(p => p.join(" ")).join(" L"),
        class: id + "-link " + id + "-" + tone,
        "marker-end": tone === "fault" ? "" : "url(#" + id + "-arrow-" + markerIndex + ")"}, parent);
      return path;
    }

    function packet(path, start, duration, tone, destination) {
      const block = element("rect", {x: -5, y: -4, width: 10, height: 8, rx: 1,
        class: id + "-packet " + id + "-" + tone});
      const length = path.getTotalLength();
      effects.push((time, still) => {
        const progress = (time - start) / duration;
        const at = path.getPointAtLength(length * Math.min(1, Math.max(0, progress)));
        block.setAttribute("transform", "translate(" + at.x + " " + at.y + ")");
        block.style.opacity = still ? 0 : Math.max(0, Math.min(1, progress * 10, (1 - progress) * 10));
        if (still || (progress >= 1 && progress < 2)) destination.classList.add(id + "-active");
      });
    }

    let boxes;
    const markerIndex = ++mountCount;
    function draw() {
      const [width, height] = size();
      const {title, panels, links, focus = [], caption} = scenes[index];
      const nodes = panels.map(([name, detail, desktop, mobile, tone]) => {
        const [x, y, w] = narrow.matches ? mobile : desktop;
        return {name, detail, x, y, w, tone};
      });
      svg.replaceChildren();
      svg.setAttribute("viewBox", "0 0 " + width + " " + height);
      svg.setAttribute("aria-label", translate(title));
      svg.dataset.step = index + 1;
      const defs = element("defs", {});
      const marker = element("marker", {id: id + "-arrow-" + markerIndex, viewBox: "0 0 8 8", refX: 7,
        refY: 4, markerWidth: 7, markerHeight: 7, markerUnits: "userSpaceOnUse", orient: "auto"}, defs);
      element("path", {d: "M1 1 7 4 1 7", fill: "none", stroke: "context-stroke", "stroke-width": 1.4}, marker);
      const lines = element("g", {});
      const paths = links.map(([from, to, tone = "data"]) => link(nodes[from], nodes[to], tone, lines));
      boxes = nodes.map(panel);
      effects = [];
      links.forEach(([, to, tone = "data", start], i) => {
        if (start !== undefined) packet(paths[i], start, 1.12, tone, boxes[to]);
      });
      focus.forEach((target, i) => {
        effects.push((time, still) => {
          if (still || (time >= 0.25 + i * 0.85 && time < 1.55 + i * 0.85)) {
            boxes[target].classList.add(id + "-active");
          }
        });
      });
      if (caption) label(width / 2, height - 58, caption, "caption");
      label(width / 2, height - 19, ["示意，不代表实测数字", "Schematic, not measured"], "note");
      paint();
    }

    function paint() {
      boxes.forEach(box => box.classList.remove(id + "-active"));
      for (const effect of effects) effect(elapsed % 5.6, reduced.matches);
    }

    function tick(now) {
      elapsed += Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      paint();
      raf = requestAnimationFrame(tick);
    }

    function start() {
      cancelAnimationFrame(raf);
      if (paused || reduced.matches) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }

    function layout() {
      draw();
      onLayout?.(ratio(), narrow.matches);
      start();
    }

    function motionChange() {
      paint();
      start();
    }

    narrow.addEventListener("change", layout);
    reduced.addEventListener("change", motionChange);
    document.addEventListener("ss-lang", draw);
    if (document.fonts.status === "loading") document.fonts.ready.then(() => { if (svg.isConnected) draw(); });
    layout();

    const controls = {
      show(step) {
        index = Math.max(0, Math.min(scenes.length - 1, step));
        elapsed = 0;
        draw();
        start();
      },
      pause() {
        paused = true;
        cancelAnimationFrame(raf);
      },
      resume() {
        if (!paused) return;
        paused = false;
        start();
      },
      destroy() {
        controls.pause();
        narrow.removeEventListener("change", layout);
        reduced.removeEventListener("change", motionChange);
        document.removeEventListener("ss-lang", draw);
        host.classList.remove(id + "-figure");
        svg.remove();
        delete host.__anim;
      },
      ratio,
      step: () => index
    };
    host.__anim = controls;
    return controls;
  }

  let mountCount = 0;
  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = {steps: 5, mount};
})();
