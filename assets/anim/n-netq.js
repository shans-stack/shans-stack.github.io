(() => {
  const id = "n-netq";
  const sizes = [[800, 365], [360, 424]];
  const scenes = [
    {
      title: ["网络监控的两种范围","Two Network Monitoring Scopes"],
      panels: [
        [["NetQ","NetQ"],["联合部署 · 5.3 Beta","Joint Deployment · 5.3 Beta"],[184,178,246],[180,95,252],"primary"],
        [["以太网","Ethernet"],["主机与交换机","Hosts & Switches"],[605,106,224],[88,265,158],"primary",false],
        [["NVLink","NVLink"],["GPU 互联","GPU Interconnect"],[605,250,224],[272,265,158],"primary",false]
      ],
      links: [[1,0,"signal",0.2],[2,0,"signal",1.7]],
      focus: [1,2]
    },
    {
      title: ["从设备采集遥测","Collecting Telemetry from Devices"],
      panels: [
        [["NetQ","NetQ"],["接收设备记录","Collect Device Records"],[184,178,246],[180,95,252],"primary"],
        [["交换机","Switch"],["接口与路由","Ports & Routes"],[605,106,224],[88,265,158],"primary",false],
        [["Linux 主机","Linux Host"],["主机与容器地址","Host / Container IP"],[605,250,224],[272,265,158],"primary",false]
      ],
      links: [[1,0,"signal",0.2],[2,0,"signal",1.7]],
      caption: ["NetQ Agent 上报","NetQ Agent Reports"]
    },
    {
      title: ["汇聚状态与拓扑","Correlating State and Topology"],
      panels: [
        [["设备记录","Device Records"],["指标和事件","Metrics & Events"],[140,178,202],[180,78,236],"primary",false],
        [["NetQ","NetQ"],["聚合与存储","Aggregate & Store"],[400,178,202],[180,194,236],"primary"],
        [["拓扑视图","Topology View"],["端口与邻居","Ports & Neighbors"],[660,178,202],[180,310,236],"primary",false]
      ],
      links: [[0,1,"data",0.2],[1,2,"data",1.6]]
    },
    {
      title: ["校验与运维事件","Validation and Operations Events"],
      panels: [
        [["链路记录","Link Record"],["端口状态异常","Unexpected State"],[140,178,202],[180,78,236],"primary",false],
        [["NetQ","NetQ"],["状态校验","State Validation"],[400,178,202],[180,194,236],"primary"],
        [["运维事件","Operations Event"],["时间 · 设备 · 端口","Time · Device · Port"],[660,178,202],[180,310,236],"primary",false]
      ],
      links: [[0,1,"data",0.2],[1,2,"data",1.6]]
    },
    {
      title: ["NVLink 域内的可观测性","Observability Within an NVLink Domain"],
      panels: [
        [["GPU A","GPU A"],null,[130,126,170],[88,70,154],"primary",false],
        [["NVLink Switch","NVLink Switch"],["柜内转发","In-Rack Forwarding"],[400,126,207],[88,198,156],"primary",false],
        [["GPU B","GPU B"],null,[670,126,170],[88,326,154],"primary",false],
        [["NetQ","NetQ"],["NVLink 遥测","NVLink Telemetry"],[400,252,219],[272,198,154],"primary"]
      ],
      links: [[0,1,"data",0.2],[1,2,"data",1.55],[1,3,"signal",2.95]]
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
