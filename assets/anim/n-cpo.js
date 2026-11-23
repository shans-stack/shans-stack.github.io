(function () {
  const id = "n-cpo";
  const sizes = [[800, 350], [360, 440]];
  const steps = [["可插拔模块中的光电转换", "Conversion in a Pluggable Transceiver"], ["光引擎移入交换芯片封装", "The Optical Engine Moves into the Switch Package"], ["电信号在封装内传输", "The Electrical Path Stays Inside the Package"], ["外置激光源提供载波", "An External Laser Supplies the Carrier"], ["Ethernet 与 InfiniBand 中的实现", "Implementations in Ethernet and InfiniBand"]];

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

    const asic = ["交换 ASIC", "Switch ASIC"];
    const engine = ["光引擎", "Optical Engine"];
    const fiber = ["光纤", "Fiber"];
    const electrical = ["电信号", "Electrical"];
    const optical = ["光信号", "Optical"];
    const pluggable = ["可插拔光模块", "Pluggable Optics"];
    const packaged = ["共封装", "Co-Packaged"];
    const photonics = ["Photonics 交换机", "Photonics Switch"];

    const scenes = [
      mobile => {
        if (mobile) {
          frame(40, 65, 280, 190, "boundary");
          text(60, 87, ["交换机电路板", "Switch Board"], "secondary start");
          const copper = line([[180, 146], [180, 235]], "electrical");
          const light = line([[180, 283], [180, 357]], "optical");
          box(180, 124, 156, 44, [asic]);
          box(180, 259, 176, 48, [pluggable]);
          text(244, 184, electrical, "secondary");
          text(239, 313, optical, "secondary");
          box(180, 375, 110, 36, [fiber]);
          packet(copper, 0.2, 1.5, "electrical");
          packet(light, 1.7, 1.3, "optical");
          return;
        }
        frame(46, 70, 510, 206, "boundary");
        text(66, 106, ["交换机电路板", "Switch Board"], "secondary start");
        const copper = line([[244, 190], [455, 190]], "electrical");
        const light = line([[655, 190], [685, 190]], "optical");
        box(164, 190, 160, 64, [asic]);
        box(555, 190, 200, 64, [pluggable]);
        text(350, 161, electrical, "secondary");
        text(704, 146, optical, "secondary");
        box(730, 190, 90, 48, [fiber]);
        packet(copper, 0.2, 1.5, "electrical");
        packet(light, 1.7, 1.1, "optical");
      },
      mobile => {
        if (mobile) {
          text(34, 52, photonics, "heading start");
          frame(44, 89, 272, 184, "boundary");
          text(63, 112, packaged, "secondary start");
          const copper = line([[180, 165], [180, 211]], "electrical");
          const output = line([[180, 251], [180, 288]], "optical");
          const tail = line([[180, 326], [180, 348]], "optical");
          box(180, 145, 140, 40, [asic]);
          box(180, 231, 140, 40, [engine], "accent");
          box(180, 307, 152, 38, [["面板连接器", "Panel Connector"]]);
          box(180, 366, 100, 36, [fiber]);
          packet(copper, 0.2, 1.2, "electrical");
          packet(output, 1.4, 0.8, "optical");
          packet(tail, 2.2, 0.65, "optical");
          return;
        }
        text(60, 63, photonics, "heading start");
        frame(58, 106, 385, 168, "boundary");
        text(78, 132, packaged, "secondary start");
        const copper = line([[232, 195], [284, 195]], "electrical");
        const light = line([[424, 195], [522, 195]], "optical");
        const tail = line([[678, 195], [695, 195]], "optical");
        box(154, 195, 156, 56, [asic]);
        box(354, 195, 140, 56, [engine], "accent");
        box(600, 195, 156, 48, [["面板连接器", "Panel Connector"]]);
        box(739, 195, 88, 48, [fiber]);
        packet(copper, 0.2, 1.2, "electrical");
        packet(light, 1.4, 0.9, "optical");
        packet(tail, 2.3, 0.55, "optical");
      },
      mobile => {
        const x1 = mobile ? 74 : 120;
        const x2 = mobile ? 262 : 572;
        const xc = mobile ? 221 : 357;
        const w = mobile ? 116 : 156;
        const first = mobile ? 118 : 101;
        const second = mobile ? 294 : 248;
        const dest = mobile ? 342 : 765;
        text(mobile ? 20 : 44, first - 52, ["可插拔方案", "Pluggable Design"], "heading start");
        const moduleWidth = mobile ? 132 : 180;
        const c1 = line([[x1 + w / 2, first], [x2 - moduleWidth / 2, first]], "electrical");
        line([[x2 + moduleWidth / 2, first], [dest, first]], "optical");
        box(x1, first, w, 48, [asic]);
        box(x2, first, moduleWidth, 65, [pluggable, ["含 DSP", "With DSP"]]);
        text((x1 + x2) / 2, first + 52, ["跨电路板的电路径", "Electrical Path Across Board"], "secondary");
        text(mobile ? 20 : 44, second - 53, ["共封装方案", "Co-Packaged Design"], "heading start");
        const c2 = line([[x1 + w / 2, second], [xc - w / 2, second]], "electrical");
        line([[xc + w / 2, second], [dest, second]], "optical");
        box(x1, second, w, 48, [asic]);
        box(xc, second, w, 48, [engine], "accent");
        text((x1 + xc) / 2, second + 50, ["封装内的电路径", "In-Package Electrical Path"], "secondary");
        emphasize(c1, 0.4);
        emphasize(c2, 2.2);
      },
      mobile => {
        if (mobile) {
          text(31, 43, photonics, "heading start");
          line([[265, 116], [265, 188], [249, 188]], "optical dashed");
          const input = line([[73, 137], [73, 188], [110, 188]], "electrical");
          const output = line([[180, 216], [180, 331]], "optical");
          box(73, 115, 124, 44, [asic]);
          box(265, 94, 158, 44, [["外置激光源", "External Laser"]]);
          box(180, 188, 138, 56, [engine], "accent");
          text(253, 262, ["已调制的光", "Modulated Light"], "secondary");
          box(180, 355, 110, 48, [fiber]);
          packet(input, 0.2, 1.4, "electrical");
          packet(output, 1.6, 1.5, "optical");
          return;
        }
        text(60, 53, photonics, "heading start");
        line([[399, 138], [399, 208]], "optical dashed");
        const input = line([[240, 237], [315, 237]], "electrical");
        const output = line([[483, 237], [630, 237]], "optical");
        box(159, 237, 162, 58, [asic]);
        box(399, 113, 190, 50, [["外置激光源", "External Laser"]]);
        box(399, 237, 168, 58, [engine], "accent");
        box(694, 237, 128, 58, [fiber]);
        text(500, 174, ["载波供光", "Carrier Light"], "secondary");
        text(566, 273, ["已调制的光", "Modulated Light"], "secondary");
        packet(input, 0.2, 1.4, "electrical");
        packet(output, 1.6, 1.5, "optical");
      },
      mobile => {
        const products = ["Spectrum-X Ethernet Photonics", "Quantum-X InfiniBand Photonics"];
        products.forEach((product, i) => {
          const x = mobile ? 180 : 203 + 394 * i;
          const y = mobile ? 122 + 173 * i : 151;
          const left = x - (mobile ? 156 : 182);
          frame(left, y - 62, mobile ? 312 : 364, 139, "boundary");
          text(left + 16, y - 37, [product, product], "heading start");
          if (i === 0) {
            text(left + 16, y + 53, ["交换机", "Switch"], "secondary start");
          }
          const a = x - 85;
          const b = x + 55;
          const path = line([[a + 48, y + 9], [b - 70, y + 9]], "electrical");
          line([[b + 70, y + 9], [x + 145, y + 9]], "optical");
          box(a, y + 9, 96, 40, [["ASIC", "ASIC"]]);
          box(b, y + 9, 140, 40, [engine], "accent");
          packet(path, 0.45, 1.5, "electrical");
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
