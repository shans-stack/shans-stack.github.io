(() => {
  const id = "n-ncp";
  const sizes = [[800, 365], [360, 424]];
  const scenes = [
    {
      title: ["从 GPU 集群到 AI 云","From GPU Clusters to AI Clouds"],
      panels: [
        [["GB200","GB200"],["GPU 计算机柜","GPU Compute Racks"],[140,178,202],[180,78,236],"primary"],
        [["网络与存储","Network & Storage"],["连接与数据访问","Connectivity & Data"],[400,178,202],[180,194,236],"primary",false],
        [["运维软件","Operations Software"],["基础设施管理","Infrastructure Mgmt."],[660,178,202],[180,310,236],"primary",false]
      ],
      links: [],
      focus: [0,1,2]
    },
    {
      title: ["GPU POD 与 Core POD","GPU PODs and the Core POD"],
      panels: [
        [["Core POD","Core POD"],["控制、通用计算与存储","Control, Compute & Storage"],[184,178,246],[180,95,252],"primary",false],
        [["GPU POD A","GPU POD A"],["GB200 计算柜","GB200 Racks"],[605,106,224],[88,265,158],"primary",false],
        [["GPU POD B","GPU POD B"],["新增计算资源","Additional Compute"],[605,250,224],[272,265,158],"primary",false]
      ],
      links: [[1,0,"data",0.2],[2,0,"data",1.65]],
      focus: [2]
    },
    {
      title: ["四种网络的职责","The Roles of Four Networks"],
      panels: [
        [["NVLink","NVLink"],["柜内互联","Scale-Up"],[163,51,236],[88,53,160],"primary",false],
        [["GPU","GPU"],["同柜设备","Same Rack"],[637,51,236],[272,53,160],"plain",false],
        [["CIN","CIN"],["跨柜计算网","Scale-Out"],[163,127,236],[88,145,160],"primary",false],
        [["GPU 机柜","GPU Racks"],["跨柜计算","Rack-to-Rack"],[637,127,236],[272,145,160],"plain",false],
        [["TAN","TAN"],["租户访问网","Tenant Access"],[163,203,236],[88,237,160],"primary",false],
        [["共享存储","Shared Storage"],["数据访问","Data Access"],[637,203,236],[272,237,160],"plain",false],
        [["SMN","SMN"],["安全管理网","Secure Mgmt."],[163,279,236],[88,329,160],"primary",false],
        [["设备控制器","Controllers"],["带外管理","Out-of-Band"],[637,279,236],[272,329,160],"plain",false]
      ],
      links: [[0,1,"data",0.2],[2,3,"data",1.15],[4,5,"signal",2.1],[6,7,"control",3.05]]
    },
    {
      title: ["按工作负载接入共享存储","Connecting Shared Storage by Workload"],
      panels: [
        [["GB200","GB200"],["经 TAN 接入","Access over TAN"],[184,178,246],[180,95,252],"primary"],
        [["文件存储","File Storage"],["共享文件系统","Shared Filesystem"],[605,106,224],[88,265,158],"primary",false],
        [["对象存储","Object Storage"],["可选接入","Optional"],[605,250,224],[272,265,158],"optional",false]
      ],
      links: [[0,1,"data",0.2],[0,2,"signal",1.7]]
    },
    {
      title: ["用软件运营 AI 基础设施","Operating AI Infrastructure with Software"],
      panels: [
        [["Mission Control","Mission Control"],["计算管理","Compute Mgmt."],[163,85,236],[88,75,160],"primary",false],
        [["计算节点","Compute Nodes"],["节点运维","Node Operations"],[637,85,236],[272,75,160],"plain",false],
        [["UFM","UFM"],["网络管理示例","Fabric Mgmt."],[163,178,236],[88,186,160],"primary"],
        [["网络设备","Network Devices"],["拓扑与遥测","Topology & Metrics"],[637,178,236],[272,186,160],"plain",false],
        [["存储管理","Storage Mgmt."],["数据接入","Data Services"],[163,271,236],[88,297,160],"primary",false],
        [["存储资源","Storage"],["用户与作业","Users & Jobs"],[637,271,236],[272,297,160],"plain",false]
      ],
      links: [[0,1,"control",0.2],[2,3,"control",1.15],[4,5,"control",2.1]]
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
