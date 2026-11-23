(function () {
  const id = "n-basepod";
  const sizes = [[800, 350], [360, 440]];
  const steps = [["集群参考架构", "A Cluster Reference Architecture"], ["计算、存储与管理路径", "Compute, Storage, and Management Paths"], ["伙伴存储接入集群", "How Partner Storage Connects"], ["集群管理与作业调度", "Cluster Management and Job Scheduling"], ["从节点扩展到集群", "Scaling from Nodes to a Cluster"]];

  function mount(host, {onLayout, paused = false} = {}) {
    const media = matchMedia("(max-width: 640px)");
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    host.classList.add(id + "-figure");
    svg.setAttribute("role", "img");
    host.replaceChildren(svg);
    let index = 0;
    let raf = 0;
    let last = 0;
    let elapsed = 0;
    let effects = [];
    const size = () => sizes[Number(media.matches)];
    const ratio = () => size()[0] / size()[1];
    const label = ([zh, en]) => window.SS_LANG === "en" ? en : zh;

    function el(tag, attrs, classes = "", parent = svg) {
      const item = document.createElementNS(svg.namespaceURI, tag);
      for (const [key, value] of Object.entries(attrs)) item.setAttribute(key, value);
      if (classes) item.setAttribute("class", classes.split(" ").map(name => id + "-" + name).join(" "));
      parent.append(item);
      return item;
    }

    function text(x, y, words, classes = "", parent = svg) {
      const item = el("text", {x, y}, classes || "label", parent);
      item.textContent = label(words);
      return item;
    }

    function frame(x, y, width, height, tone = "", parent = svg) {
      return el("rect", {x, y, width, height, rx: 4}, "panel" + (tone ? " " + tone : ""), parent);
    }

    function box(x, y, width, height, words, tone = "") {
      const group = el("g", {}, "node");
      const panel = frame(x - width / 2, y - height / 2, width, height, tone, group);
      words.forEach((line, i) => text(x, y + (i - (words.length - 1) / 2) * (media.matches ? 22 : 25),
        line, i ? "secondary" : "label", group));
      return panel;
    }

    function line(points, tone = "") {
      return el("path", {d: "M" + points.map(point => point.join(" ")).join(" L")},
        "link" + (tone ? " " + tone : ""));
    }

    function packet(path, start, duration, tone = "", reverse = false) {
      const mark = el("rect", {x: -5, y: -4, width: 10, height: 8, rx: 2}, "packet" + (tone ? " " + tone : ""));
      const length = path.getTotalLength();
      effects.push((time, still) => {
        if (still) {
          mark.style.opacity = 0;
          return;
        }
        const phase = (time % 5.4 - start) / duration;
        const progress = Math.max(0, Math.min(1, phase));
        const point = path.getPointAtLength(length * (reverse ? 1 - progress : progress));
        mark.setAttribute("transform", "translate(" + point.x + " " + point.y + ")");
        mark.style.opacity = Math.max(0, Math.min(1, phase * 10, (1 - phase) * 10));
      });
    }

    function emphasize(panel, start) {
      effects.push((time, still) => {
        const phase = time % 5.4;
        panel.classList.toggle(id + "-active", still || (phase >= start && phase < start + 1.35));
      });
    }

    const dgx = ["DGX 节点", "DGX Node"];
    const storage = ["伙伴存储", "Partner Storage"];
    const compute = ["计算网", "Compute Fabric"];
    const management = ["管理软件", "Management Software"];
    const ethernet = ["存储与带内网", "Storage & In-Band"];
    const bmc = ["BMC", "BMC"];

    const scenes = [
      mobile => {
        const x = mobile ? 180 : 400;
        const y = mobile ? 187 : 170;
        const spread = mobile ? 85 : 114;
        const top = mobile ? 74 : 60;
        const bottom = mobile ? 321 : 290;
        const h = 46;
        const upper = line([[x, top + h / 2], [x, y - 54], [x - spread, y - 54], [x - spread, y - h / 2]], "dashed");
        line([[x, y - 54], [x + spread, y - 54], [x + spread, y - h / 2]], "dashed");
        line([[x - spread + 14, y + h / 2], [x - spread + 14, y + 53], [x + spread, y + 53], [x + spread, y + h / 2]], "network");
        line([[x - spread - 23, y + h / 2], [x - spread - 23, y + 90], [x + spread + 23, y + 90], [x + spread + 23, y + h / 2]], "optical");
        line([[x, y + 90], [x, bottom - h / 2]], "optical");
        text(x, y + 72, ["存储以太网", "Storage Ethernet"], "secondary");
        const partner = box(x, bottom, 162, h, [storage]);
        const managed = box(x, top, mobile ? 198 : 218, h, [management]);
        const first = box(x - spread, y, 146, h, [["DGX", "DGX"]], "accent");
        const second = box(x + spread, y, 146, h, [dgx], "accent");
        text(mobile ? x : x + 207, y + (mobile ? 38 : 54), compute, "secondary");
        emphasize(managed, 0);
        emphasize(first, 1.1);
        emphasize(second, 1.1);
        emphasize(partner, 2.5);
        packet(upper, 0.2, 1.5);
      },
      mobile => {
        const x = mobile ? 180 : 400;
        const rows = mobile ? [107, 212, 317] : [94, 176, 258];
        const left = mobile ? 42 : 91;
        const right = mobile ? 318 : 709;
        const sourceWidth = mobile ? 66 : 110;
        const endWidth = mobile ? 76 : 155;
        const roles = [
          [compute, ["InfiniBand", "InfiniBand"], dgx, "network"],
          [ethernet, ["Ethernet", "Ethernet"], storage, "optical"],
          [["带外管理网", "Out-of-Band"], ["独立管理通路", "Management Access"], bmc, "dashed"]
        ];
        text(mobile ? 20 : 37, 38, ["DGX", "DGX"], "heading start");
        roles.forEach(([name, protocol, end, tone], i) => {
          const y = rows[i];
          text(x, y - (mobile ? 40 : 24), name, "heading");
          const route = line([[left + sourceWidth / 2, y], [right - endWidth / 2, y]], tone);
          box(left, y, sourceWidth, 40, [i === 2 ? ["管理端", "Console"] : ["DGX", "DGX"]]);
          const endpoint = mobile ? [["DGX", "DGX"], ["存储", "Storage"], bmc][i] : end;
          const target = box(right, y, endWidth, 40, [endpoint]);
          text(x, y + (mobile ? 27 : 21), protocol, "secondary");
          packet(route, i * 1.55 + 0.1, 1.45, i === 1 ? "optical" : "");
          emphasize(target, i * 1.55 + 1.42);
        });
      },
      mobile => {
        const y = mobile ? 151 : 157;
        const lx = mobile ? 91 : 180;
        const rx = mobile ? 270 : 620;
        const bend = mobile ? 266 : 242;
        const middle = (lx + rx) / 2;
        const route = line([[rx, y + 29], [rx, bend], [lx, bend], [lx, y + 29]], "optical");
        box(lx, y, 150, 58, [["DGX", "DGX"]], "accent");
        box(rx, y, 156, 58, [storage]);
        text(middle, bend + (mobile ? 16 : -20), ["存储网 · Ethernet", "Storage Network · Ethernet"], "secondary");
        text(middle, bend + (mobile ? 42 : 30), ["读取训练数据 · 写回检查点", "Read Training Data · Write Checkpoints"], "secondary");
        text(middle, mobile ? 352 : 62, ["计算网不参与此传输", "Compute Fabric Outside This Path"], "secondary");
        packet(route, 0.2, 1.9, "optical");
        packet(route, 2.65, 1.9, "", true);
      },
      mobile => {
        const x = mobile ? 180 : 400;
        const sep = mobile ? 80 : 198;
        const top = mobile ? 97 : 100;
        const bottom = mobile ? 331 : 258;
        const bend = mobile ? 211 : 183;
        const x1 = x - sep;
        const x2 = x + sep;
        const p1 = line([[x1 - 57, top + 38], [x1 - 57, bend], [x - 30, bend], [x - 30, bottom - 27]], "dashed");
        const p2 = line([[x2 + 57, top + 38], [x2 + 57, bend], [x + 30, bend], [x + 30, bottom - 27]], "network");
        box(x1, top, mobile ? 147 : 228, 76, [["Base Command", "Base Command"], ["Manager", "Manager"]]);
        box(x2, top, mobile ? 147 : 228, 76, [["作业调度", "Job Scheduling"], ["Slurm / Kubernetes", "Slurm / Kubernetes"]]);
        text(x1 + 22, bend - 21, ["部署与监控", "Provision & Monitor"], "secondary");
        text(x2 - 12, bend - 21, ["分配作业", "Assign Jobs"], "secondary");
        const result = box(x, bottom, 178, 54, [dgx], "accent");
        packet(p1, 0.3, 1.65);
        packet(p2, 2.15, 1.65);
        emphasize(result, 3.7);
      },
      mobile => {
        [0, 1].forEach(i => {
          const x = mobile ? 180 : 213 + i * 374;
          const y = mobile ? 91 + i * 179 : 144;
          text(x, y - 69, i ? ["增加节点", "Additional Nodes"] : ["初始集群", "Initial Cluster"], "heading");
          const count = i ? 4 : 2;
          const span = i ? 66 : 132;
          const xs = Array.from({length: count}, (_, j) => x + (j - (count - 1) / 2) * span);
          line([[xs[0], y - 40], [xs[count - 1], y - 40]], "network");
          line([[xs[0], y + 40], [xs[count - 1], y + 40]], "optical");
          xs.forEach((node, j) => {
            line([[node, y - 18], [node, y - 40]], "network");
            line([[node, y + 18], [node, y + 40]], "optical");
            const panel = box(node, y, 58, 36, [["DGX", "DGX"]], "accent");
            if (i) emphasize(panel, j * 0.72);
          });
          line([[x, y + 40], [x, y + 61]], "optical");
          box(x, y + 78, 150, 34, [storage]);
        });
        const y = mobile ? 377 : 278;
        line([[mobile ? 23 : 194, y], [mobile ? 49 : 231, y]], "network");
        text(mobile ? 56 : 242, y, compute, "secondary start");
        line([[mobile ? 169 : 433, y], [mobile ? 195 : 470, y]], "optical");
        text(mobile ? 202 : 481, y, ["存储以太网", "Storage Ethernet"], "secondary start");
      }
    ];

    function draw() {
      const [width, height] = size();
      const scene = scenes[index];
      svg.replaceChildren();
      svg.setAttribute("viewBox", "0 0 " + width + " " + height);
      svg.setAttribute("aria-label", label(steps[index]));
      svg.dataset.step = index + 1;
      effects = [];
      scene(media.matches);
      text(width / 2, height - 19, ["示意，不代表实测数字", "Schematic, not measured"], "note");
      paint();
    }

    function paint() {
      for (const effect of effects) effect(elapsed, motion.matches);
    }

    function frameTick(now) {
      elapsed += Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      paint();
      raf = requestAnimationFrame(frameTick);
    }

    function start() {
      cancelAnimationFrame(raf);
      if (paused || motion.matches) return;
      last = performance.now();
      raf = requestAnimationFrame(frameTick);
    }

    function layout() {
      draw();
      onLayout?.(ratio(), media.matches);
      start();
    }

    function changeMotion() {
      paint();
      start();
    }

    media.addEventListener("change", layout);
    motion.addEventListener("change", changeMotion);
    document.addEventListener("ss-lang", draw);
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
        media.removeEventListener("change", layout);
        motion.removeEventListener("change", changeMotion);
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

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = {steps: steps.length, mount};
})();
