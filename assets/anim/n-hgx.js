(function () {
  const id = "n-hgx";
  const sizes = [[800, 350], [360, 440]];
  const steps = [["服务器里的 GPU 底板", "The GPU Baseboard Inside a Server"], ["GPU 在底板上交换数据", "GPUs Exchange Data Across the Baseboard"], ["节点内互联与节点间网络", "Intra-Node Fabric and Inter-Node Networking"], ["从 Hopper 到 Rubin 的底板", "Baseboards from Hopper to Rubin"], ["HGX、DGX 与整柜系统", "HGX, DGX, and Rack-Scale Systems"]];

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

    const gpu = ["GPU", "GPU"];
    const board = ["HGX 底板", "HGX Baseboard"];
    const link = ["NVLink", "NVLink"];

    const scenes = [
      mobile => {
        const x = mobile ? 180 : 400;
        frame(mobile ? 26 : 87, 52, mobile ? 308 : 626, mobile ? 317 : 243, "boundary");
        text(mobile ? 44 : 108, 79, ["服务器机箱", "Server Chassis"], "heading start");
        const y = mobile ? 152 : 149;
        const title = text(mobile ? 57 : 152, y - 13, board, "heading start");
        const b = frame(mobile ? 45 : 132, y - 34, mobile ? 270 : 536, 92, "accent");
        svg.append(title);
        const xs = mobile ? [89, 180, 271] : [222, 400, 578];
        xs.forEach((gx, i) => box(gx, y + 30, mobile ? 72 : 136, 34, [i === 1 ? link : gpu]));
        const rows = mobile ? [[x, 243], [x, 292], [x, 341]] : [[209, 249], [400, 249], [591, 249]];
        [["主机 CPU", "Host CPU"], ["网卡", "Network Adapter"], ["电源与散热", "Power & Cooling"]].forEach((label, i) => {
          const [px, py] = rows[i];
          emphasize(box(px, py, mobile ? 174 : 162, 40, [label]), 1.3 + i * 0.8);
        });
        emphasize(b, 0);
      },
      mobile => {
        const left = mobile ? 27 : 76;
        const width = mobile ? 306 : 648;
        const x1 = mobile ? 94 : 176;
        const x2 = mobile ? 266 : 624;
        const center = mobile ? 180 : 400;
        const top = mobile ? 135 : 140;
        const bottom = mobile ? 306 : 233;
        frame(left, 54, width, mobile ? 318 : 244, "boundary");
        text(left + 20, 81, board, "heading start");
        const a = line([[x1, top + 23], [x1, bottom], [center - 72, bottom]], "network");
        const b = line([[center + 72, bottom], [x2, bottom], [x2, top + 23]], "network");
        box(x1, top, mobile ? 112 : 144, 46, [gpu]);
        const dest = box(x2, top, mobile ? 112 : 144, 46, [gpu]);
        const sw = box(center, bottom, 144, 48, [["NVLink Switch", "NVLink Switch"]], "accent");
        text(center, mobile ? 203 : 181, link, "secondary");
        packet(a, 0.1, 1.4);
        packet(b, 1.5, 1.4);
        emphasize(sw, 1.5);
        emphasize(dest, 2.85);
      },
      mobile => {
        if (mobile) {
          text(26, 40, ["HGX 服务器", "HGX Server"], "heading start");
          const inPath = line([[254, 140], [254, 170], [180, 170], [180, 193]], "network");
          const outPath = line([[180, 245], [180, 270], [254, 270], [254, 311]], "network");
          box(180, 219, 151, 52, [["外部交换机", "Network Switch"]], "accent");
          [113, 322].forEach((y, i) => {
            frame(25, y - 42, 302, 85, "boundary");
            text(41, y - 22, ["节点 " + (i + 1), "Node " + (i + 1)], "secondary start");
            box(107, y + 8, 125, 38, [link]);
            box(254, y + 8, 100, 38, [["网卡", "NIC"]]);
          });
          packet(inPath, 0.2, 1.5);
          packet(outPath, 1.7, 1.5);
          return;
        }
        text(52, 69, ["HGX 服务器", "HGX Server"], "heading start");
        const y = 195;
        const a = line([[297, y], [333, y], [333, 235], [350, 235]], "network");
        const b = line([[450, 235], [467, 235], [467, y], [503, y]], "network");
        [190, 610].forEach((x, i) => {
          const dx = i ? -55 : 55;
          frame(x - 130, 120, 260, 149, "boundary");
          text(x, 148, ["节点 " + (i + 1), "Node " + (i + 1)], "heading");
          box(x - dx, y, 108, 46, [link]);
          box(x + dx, y, 104, 46, [["网卡", "NIC"]]);
        });
        box(400, 235, 100, 63, [["外部", "Network"], ["交换机", "Switch"]], "accent");
        packet(a, 0.2, 1.5);
        packet(b, 1.7, 1.5);
      },
      mobile => {
        const columns = mobile ? [87, 220, 330] : [196, 435, 653];
        const top = mobile ? 101 : 87;
        const gap = mobile ? 65 : 53;
        text(mobile ? 21 : 81, mobile ? 49 : 41, board, "heading start");
        const models = [["H100 / H200", "Hopper", ["第 4 代", "Gen 4"]],
          ["B200", "Blackwell", ["第 5 代", "Gen 5"]],
          ["B300", "Blackwell Ultra", ["第 5 代", "Gen 5"]],
          ["Rubin NVL8", "Rubin", ["第 6 代", "Gen 6"]]];
        text(columns[0], top, ["底板型号", "Baseboard"], "secondary");
        text(columns[1], top, ["GPU 架构", "GPU Architecture"], "secondary");
        text(columns[2], top, link, "secondary");
        models.forEach(([model, chip, generation], i) => {
          const y = top + 44 + i * gap;
          emphasize(frame(mobile ? 12 : 79, y - 19, mobile ? 336 : 642, 38), i * 1.22);
          text(columns[0], y, [model, model]);
          text(columns[1], y, [chip, chip]);
          text(columns[2] - (mobile ? 8 : 0), y, generation);
        });
      },
      mobile => {
        const forms = [
          [board, ["供厂商集成", "OEM Integration"]],
          [["DGX 整机", "DGX System"], ["单台服务器", "Complete Server"]],
          [["NVL72 整柜", "NVL72 Rack"], ["整柜 NVLink 域", "Rack-Scale NVLink"]]
        ];
        forms.forEach(([title, detail], i) => {
          const x = mobile ? 180 : 154 + i * 246;
          const y = mobile ? 95 + i * 111 : 174;
          const w = mobile ? 298 : 232;
          const panel = frame(x - w / 2, y - 43, w, 86, i === 2 ? "accent" : "");
          text(x - w / 2 + 19, y - 16, title, "heading start");
          text(x - w / 2 + 19, y + 18, detail, "secondary start");
          emphasize(panel, i * 1.5);
        });
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
