(function () {
  const id = "n-eaif";
  const sizes = [[800, 350], [360, 440]];
  const steps = [["从工作负载定义服务", "Defining the Service from the Workload"], ["五层核心与横向控制", "Five Core Layers and Cross-Stack Controls"], ["按需叠加行业与能力要求", "Applying Industry and Capability Requirements"], ["选择硬件与软件实施路径", "Choosing Hardware and an Implementation Path"], ["核对支持与运维责任", "Confirming Support and Operational Ownership"]];

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

    const workload = ["工作负载", "Workload Demand"];
    const core = ["核心设计", "Core Design"];
    const record = ["决策记录", "Decision Record"];

    const scenes = [
      mobile => {
        const points = mobile ? [[180, 75], [180, 215], [180, 345]] : [[158, 179], [400, 179], [642, 179]];
        const labels = [
          [workload, ["推理 · 智能体 · 开发", "Inference · Agents · Models"]],
          [["服务目标", "Service Objectives"], ["质量 · 数据 · 可用性", "Quality · Data · Availability"]],
          [["实施需求", "Design Requirements"], ["约束与信任边界", "Constraints & Trust Scope"]]
        ];
        points.slice(0, 2).forEach(([x, y], i) => {
          const [nx, ny] = points[i + 1];
          const a = mobile ? [[x, y + 36], [nx, ny - 36]] : [[x + 115, y], [nx - 115, ny]];
          const path = line(a, "network");
          packet(path, i * 1.55 + 0.1, 1.55);
        });
        points.forEach(([x, y], i) => {
          const panel = box(x, y, mobile ? 292 : 230, 72, labels[i], i === 2 ? "accent" : "");
          emphasize(panel, i * 1.55);
        });
      },
      mobile => {
        const layers = [workload, ["AI 平台", "AI Platform"], ["平台服务", "Platform Services"],
          ["云原生平台", "Cloud-Native Platform"], ["硬件基础", "Hardware Foundation"]];
        if (mobile) {
          line([[255, 47], [272, 47], [272, 316], [255, 316]], "network");
          text(316, 133, ["横向", "Cross-Stack"], "secondary");
          text(316, 154, ["控制", "Controls"], "secondary");
          layers.forEach((layer, i) => emphasize(box(136, 65 + i * 58, 228, 40, [layer]), i * 0.9));
          text(180, 369, ["治理 · 数据保护 · 运维", "Governance · Data Protection · Operations"], "secondary");
          return;
        }
        line([[477, 46], [501, 46], [501, 301], [477, 301]], "network");
        layers.forEach((layer, i) => emphasize(box(291, 67 + i * 53, 354, 40, [layer]), i * 0.9));
        text(630, 134, ["横向控制", "Cross-Stack Controls"], "heading");
        text(630, 177, ["治理与数据保护", "Governance & Data Protection"], "secondary");
        text(630, 207, ["运维与恢复", "Operations & Resilience"], "secondary");
      },
      mobile => {
        const x = mobile ? 180 : 400;
        const top = mobile ? 99 : 112;
        const bottom = mobile ? 291 : 245;
        const spread = mobile ? 82 : 195;
        const w = mobile ? 151 : 266;
        const tags = [
          [["行业配置档", "Industry Profile"], ["行业约束", "Sector Constraints"]],
          [["能力参考设计", "Capability Design"], ["推理服务等", "E.g., Inference Hub"]]
        ];
        tags.forEach(([title, note], i) => {
          const bx = x + (i ? spread : -spread);
          const cx = x + (i ? 36 : -36);
          const y = (top + bottom) / 2;
          const path = line([[bx, bottom - 35], [bx, y], [cx, y], [cx, top + 34]], "network dashed");
          const panel = box(bx, bottom, w, 70, [title, note]);
          packet(path, i * 1.75 + 0.1, 1.7);
          emphasize(panel, i * 1.75);
        });
        box(x, top, mobile ? 250 : 320, 68, [core, ["共用层与接口", "Shared Layers & Interfaces"]], "accent");
      },
      mobile => {
        const x = mobile ? 180 : 400;
        const top = mobile ? 89 : 73;
        const mid = mobile ? 216 : 179;
        const end = mobile ? 342 : 276;
        const dx = mobile ? 85 : 186;
        const widths = mobile ? [306, 164, 204] : [361, 263, 207];
        const picks = [["已发布实例", "Published Example"], ["目录候选方案", "Catalog Candidates"]];
        picks.forEach((pick, i) => {
          const sx = i ? dx : -dx;
          const offset = i ? 34 : -34;
          const a = line([[x + offset, top + 29], [x + offset, top + 55], [x + sx, top + 55], [x + sx, mid - 25]], "network");
          const b = line([[x + sx, mid + 25], [x + sx, end - 48], [x + offset, end - 48], [x + offset, end - 23]], "network");
          box(x + sx, mid, widths[1], 50, [pick]);
          packet(a, 0.25 + i * 2.15, 1.1);
          packet(b, 1.35 + i * 2.15, 0.95);
        });
        frame(x - widths[0] / 2, top - 29, widths[0], 58, "accent");
        text(x - widths[0] / 2 + 16, top, ["硬件参考架构", "Hardware Architecture"], "label start");
        emphasize(box(x, end, widths[2], 46, [["实施配置", "Implementation"]]), 3.0);
      },
      mobile => {
        const x = mobile ? 180 : 400;
        const points = mobile ? [[94, 68], [266, 68], [180, 209]] : [[156, 94], [400, 94], [644, 94]];
        const end = mobile ? 338 : 250;
        const names = [
          ["版本与支持", "Versions & Support"],
          ["信任与权限", "Trust & Access"],
          ["运维责任", "Operations Owners"]
        ];
        points.forEach(([sx, sy], i) => {
          const dx = x + (i - 1) * 47;
          const bend = mobile ? 263 + i * 13 : sy + 79;
          const path = line([[sx, sy + 25], [sx, bend], [dx, bend], [dx, end - 34]], "network");
          box(sx, sy, mobile ? 147 : 196, 50, [names[i]]);
          packet(path, i * 0.73 + 0.1, 1.6);
        });
        emphasize(box(x, end, mobile ? 251 : 306, 68, [record, ["确认后投入运行", "Approved for Operations"]], "accent"), 2.9);
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
