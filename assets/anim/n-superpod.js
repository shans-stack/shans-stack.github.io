(() => {
  const id = "n-superpod";
  const sizes = [[800, 365], [360, 424]];
  const scenes = [
    {
      title: ["从 DGX 系统到集群","From DGX Systems to a Cluster"],
      panels: [
        [["DGX GB200","DGX GB200"],["计算机柜","Compute Racks"],[135,179,211],[180,70,237],"primary"],
        [["网络","Networking"],["数据与管理路径","Data & Management"],[398,179,211],[180,174,237],"primary"],
        [["共享存储","Shared Storage"],["经认证的伙伴方案","Certified Partner"],[665,102,217],[88,313,159],"primary"],
        [["运维软件","Operations"],["集群管理","Cluster Ops"],[665,252,217],[272,313,159],"primary"]
      ],
      links: [[0,1,"data",0.2],[1,2,"signal",1.6],[3,1,"control",2.95]]
    },
    {
      title: ["可扩展单元","Scalable Units"],
      panels: [
        [["SU 1","SU 1"],["计算柜与网络","Racks & Fabric"],[140,178,202],[180,78,236],"primary"],
        [["上层交换","Upper-Tier Switches"],["InfiniBand","InfiniBand"],[400,178,202],[180,194,236],"primary"],
        [["SU 2","SU 2"],["复用网络拓扑","Repeat Fabric Design"],[660,178,202],[180,310,236],"primary"]
      ],
      links: [[0,1,"data",0.2],[1,2,"data",1.7]],
      focus: [2]
    },
    {
      title: ["柜内与跨柜的 GPU 通信","GPU Communication Within and Across Racks"],
      panels: [
        [["GPU A","GPU A"],["DGX GB200","DGX GB200"],[163,85,236],[88,75,160],"primary"],
        [["GPU B","GPU B"],["同柜 · NVLink","Same Rack · NVLink"],[637,85,236],[272,75,160],"plain"],
        [["DGX GB200","DGX GB200"],["计算网适配器","Compute Adapter"],[163,178,236],[88,186,160],"primary"],
        [["DGX GB200","DGX GB200"],["跨柜 · InfiniBand","Inter-Rack · IB"],[637,178,236],[272,186,160],"plain"]
      ],
      links: [[0,1,"data",0.2],[2,3,"signal",1.15]]
    },
    {
      title: ["共享存储与管理路径","Shared Storage and Management Paths"],
      panels: [
        [["存储网段","Storage Segment"],["逻辑分段","Logical Segment"],[163,85,236],[88,75,160],"primary"],
        [["共享存储","Shared Storage"],["数据读写","Data Access"],[637,85,236],[272,75,160],"plain"],
        [["带内管理网段","In-Band Mgmt."],["逻辑分段","Logical Segment"],[163,178,236],[88,186,160],"primary"],
        [["DGX 节点","DGX Nodes"],["节点部署","Provisioning"],[637,178,236],[272,186,160],"plain"],
        [["带外管理","Out-of-Band"],["专用 VXLAN","Dedicated VXLAN"],[163,271,236],[88,297,160],"primary"],
        [["BMC","BMC"],["设备管理","Device Management"],[637,271,236],[272,297,160],"plain"]
      ],
      links: [[0,1,"data",0.2],[2,3,"control",1.15],[4,5,"control",2.1]],
      boundary: ["共享物理以太网","Shared Physical Ethernet"]
    },
    {
      title: ["集群运维与作业调度","Cluster Operations and Workload Scheduling"],
      panels: [
        [["Mission Control","Mission Control"],["集群运维","Operations"],[163,85,236],[88,75,160],"primary"],
        [["DGX 集群","DGX Cluster"],["节点运维","Node Operations"],[637,85,236],[272,75,160],"plain"],
        [["作业调度器","Job Scheduler"],["例如 Slurm","For Example, Slurm"],[163,178,236],[88,186,160],"primary"],
        [["计算节点","Compute Nodes"],["分配作业","Place Jobs"],[637,178,236],[272,186,160],"plain"],
        [["UFM","UFM"],["网络管理","Fabric Management"],[163,271,236],[88,297,160],"primary"],
        [["InfiniBand","InfiniBand"],["网络状态","Fabric State"],[637,271,236],[272,297,160],"plain"]
      ],
      links: [[0,1,"control",0.2],[2,3,"control",1.15],[4,5,"signal",2.1]]
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
      const {title, panels, links, focus = [], caption, boundary} = scenes[index];
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
      if (boundary) {
        const [x, y, w, h] = narrow.matches ? [3, 16, 354, 212] : [28, 15, 744, 207];
        element("rect", {x, y, width: w, height: h, rx: 6, fill: "none", stroke: "var(--rule2)", "stroke-dasharray": "5 4"});
        label(width / 2, 34, boundary, "caption");
      }
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
