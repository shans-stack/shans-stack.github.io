(function () {
  const station = "d-kmip";
  const scenes = [{"layout":"rail","nodes":[{"title":"SFA 控制器|SFA Controller","detail":"写入数据|Write Data"},{"title":"盘内加密引擎|On-Drive Engine","detail":"介质加密密钥|Media Key"},{"title":"盘内介质|Drive Media","detail":"等待写入|Awaiting Write","done":"密文数据|Ciphertext","at":2.45,"copy":"sealed"}],"routes":[{"source":0,"target":1,"kind":"data","start":0.35},{"source":1,"target":2,"kind":"sealed","start":1.45}]},{"layout":"rail","nodes":[{"title":"SFA 控制器|SFA Controller","detail":"读请求|Read Request"},{"title":"自加密盘|Self-Encrypting Drive","detail":"已锁定|Locked","state":"blocked"},{"title":"盘内介质|Drive Media","detail":"密文数据|Ciphertext","mark":"sealed"}],"routes":[{"source":0,"target":1,"kind":"request","start":0.35},{"source":1,"target":2,"kind":"sealed","start":0.35,"inactive":true}]},{"layout":"rail","nodes":[{"title":"KMIP 服务|KMIP Service","detail":"认证密钥|Auth Key","mark":"key"},{"title":"SFA 控制器|SFA Controller","detail":"KMIP 客户端|KMIP Client"},{"title":"自加密盘|Self-Encrypting Drive","detail":"等待认证|Awaiting Key","done":"已解锁|Unlocked","at":2.4}],"routes":[{"source":0,"target":1,"kind":"key","start":0.35},{"source":1,"target":2,"kind":"key","start":1.45}]},{"layout":"branch","nodes":[{"title":"盘内解密|Drive Decryption","detail":"介质加密密钥|Media Key"},{"title":"KMIP 服务|KMIP Service","detail":"不参与|Bypassed","state":"idle"},{"title":"SFA 控制器|SFA Controller","detail":"返回读数据|Read Response"},{"title":"盘内介质|Drive Media","detail":"密文数据|Ciphertext","mark":"sealed"}],"routes":[{"source":3,"target":0,"kind":"sealed","start":0.35,"bend":true},{"source":0,"target":2,"kind":"data","start":1.45}]},{"layout":"branch","nodes":[{"title":"KMIP 服务|KMIP Service","detail":"认证密钥|Auth Key","mark":"key"},{"title":"外部备份|External Backup","detail":"认证密钥|Auth Key","mark":"key"},{"title":"SFA 控制器|SFA Controller","detail":"控制器已更换|Controllers Replaced","done":"取得可用密钥|Key Recovered","at":1.45},{"title":"自加密盘|Self-Encrypting Drive","detail":"已锁定|Locked","done":"恢复访问|Access Restored","at":2.55}],"routes":[{"source":1,"target":2,"kind":"key","start":0.35},{"source":0,"target":2,"kind":"key","start":0.35,"alternative":true},{"source":2,"target":3,"kind":"key","start":1.5}]}];

  const layouts = {
    rail: {
      desktop: [[145, 145], [450, 145], [755, 145]],
      mobile: [[180, 50], [180, 151], [180, 252]]
    },
    branch: {
      desktop: [[145, 80], [145, 211], [450, 145], [755, 145]],
      mobile: [[88, 50, 152], [272, 50, 152], [180, 151], [180, 252]]
    }
  };
  const ns = "http://www.w3.org/2000/svg";
  const note = "示意，不代表实测数字|Schematic, not measured";

  function label(text) {
    const [zh, en = zh] = text.split("|");
    return window.SS_LANG === "en" ? en : zh;
  }

  function svgElement(parent, tag, attrs) {
    const element = document.createElementNS(ns, tag);
    for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
    parent.appendChild(element);
    return element;
  }

  function svgText(parent, x, y, kind, value) {
    const text = svgElement(parent, "text", {x, y, class: station + "-" + kind});
    text.textContent = label(value);
    return text;
  }

  function pathPoints(boxes, route, mobile) {
    const a = boxes[route.source], b = boxes[route.target];
    if (route.bend) {
      const branch = Math.min(route.source, route.target);
      const side = branch === 0 ? -1 : 1;
      const from = boxes[branch], to = boxes[3];
      const points = mobile
        ? [[from.x, from.y + 34], [from.x, 100], [180 + side * 151, 100],
          [180 + side * 151, to.y], [to.x + side * to.w / 2, to.y]]
        : [[from.x + from.w / 2, from.y], [to.x, from.y], [to.x, to.y + side * 34]];
      return route.source === branch ? points : points.reverse();
    }
    const s = route.offset || 0;
    const fork = a.branch || b.branch;
    const lane = (a.branch ? route.source : route.target) === 0 ? -1 : 1;
    if (mobile) {
      const dir = Math.sign(b.y - a.y);
      const sx = a.x + s + (fork && !a.branch ? lane * 32 : 0);
      const tx = b.x + s + (fork && !b.branch ? lane * 32 : 0);
      const sy = a.y + dir * 34, ty = b.y - dir * 34, mid = (sy + ty) / 2;
      return [[sx, sy], [sx, mid], [tx, mid], [tx, ty]];
    }
    const dir = Math.sign(b.x - a.x);
    const sy = a.y + s + (fork && !a.branch ? lane * 13 : 0);
    const ty = b.y + s + (fork && !b.branch ? lane * 13 : 0);
    const sx = a.x + dir * a.w / 2, tx = b.x - dir * b.w / 2, mid = (sx + tx) / 2;
    return [[sx, sy], [mid, sy], [mid, ty], [tx, ty]];
  }

  function mount(host, options = {}) {
    const narrow = matchMedia("(max-width: 640px)");
    const quiet = matchMedia("(prefers-reduced-motion: reduce)");
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", station + "-diagram");
    svg.setAttribute("role", "img");
    host.replaceChildren(svg);

    let step = 0, ratio, raf, elapsed = 0, last = 0;
    let paused = !!options.paused, drawFrame;

    function run() {
      cancelAnimationFrame(raf);
      if (paused || quiet.matches) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }

    function tick(now) {
      const delta = Math.max(0, (now - last) / 1000);
      last = now;
      elapsed = (elapsed + delta) % 5.6;
      drawFrame(elapsed);
      raf = requestAnimationFrame(tick);
    }

    function render() {
      const mobile = narrow.matches;
      const W = mobile ? 360 : 900, H = mobile ? 326 : 300;
      const scene = scenes[step];
      const labels = scene.nodes.map(node => [label(node.title), label(node.done || node.detail)].join(" · "));
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.setAttribute("aria-label", labels.join(" / "));
      svg.setAttribute("data-step", String(step + 1));
      const boxes = layouts[scene.layout][mobile ? "mobile" : "desktop"].map(([x, y, width]) => ({
        x, y, w: width || (mobile ? 226 : 220), branch: mobile ? !!width : x === 145 && scene.layout === "branch"
      }));
      svg.replaceChildren();
      const wiring = svgElement(svg, "g", {});
      const cards = svgElement(svg, "g", {});
      const traffic = svgElement(svg, "g", {});

      const packets = scene.routes.map(route => {
        const points = pathPoints(boxes, route, mobile);
        const d = "M" + points.map(point => point.join(" ")).join(" L");
        const style = station + "-route " + station + "-" + route.kind;
        const group = svgElement(wiring, "g", {class: style, "data-state": route.inactive ? "idle" : route.alternative ? "active" : "ready"});
        const line = svgElement(group, "path", {d, class: station + "-wire"});
        const [x, y] = points.at(-1), [px, py] = points.at(-2);
        const len = Math.hypot(x - px, y - py), dx = (x - px) / len, dy = (y - py) / len;
        svgElement(group, "path", {
          d: `M${x - 8 * dx - 4 * dy} ${y - 8 * dy + 4 * dx} L${x} ${y} L${x - 8 * dx + 4 * dy} ${y - 8 * dy - 4 * dx}`,
          class: station + "-arrow"
        });
        if (route.inactive || route.alternative) return null;
        const packet = svgElement(traffic, "rect", {
          class: station + "-packet " + station + "-" + route.kind,
          width: 14, height: 9, rx: route.kind === "request" ? 5 : 2, opacity: 0
        });
        return {route, packet, group, line, length: line.getTotalLength()};
      }).filter(Boolean);

      const statuses = scene.nodes.map((node, index) => {
        const {x, y, w} = boxes[index];
        const left = x - w / 2;
        const group = svgElement(cards, "g", {class: station + "-node", "data-state": node.state || "ready"});
        svgElement(group, "rect", {class: station + "-box", x: left, y: y - 34, width: w, height: 68, rx: 5});
        svgText(group, left + 12, y - 13, "title", node.title);
        const detail = svgText(group, left + 12, y + 15, "detail", node.detail);
        const kind = node.mark || node.copy;
        const copy = kind && svgElement(group, "rect", {
          class: station + "-stored " + station + "-" + kind,
          x: left + w - 23, y: y + 21, width: 14, height: 9, rx: 2
        });
        return {node, group, detail, copy};
      });
      svgText(svg, mobile ? 12 : 35, H - 15, "note", note);

      drawFrame = time => {
        for (const {route, packet, group, line, length} of packets) {
          const progress = (time - route.start) / (route.length || 1);
          const moving = progress >= 0 && progress < 1;
          group.dataset.state = time >= route.start ? "active" : "ready";
          packet.setAttribute("opacity", moving ? Math.min(1, progress * 12, (1 - progress) * 12) : 0);
          if (moving) {
            const point = line.getPointAtLength(progress * length);
            packet.setAttribute("x", point.x - 7);
            packet.setAttribute("y", point.y - 4.5);
          }
        }
        for (const {node, group, detail, copy} of statuses) {
          if (!node.done) continue;
          const done = time >= node.at;
          const value = label(done ? node.done : node.detail);
          if (detail.textContent !== value) detail.textContent = value;
          group.dataset.state = done ? "done" : (node.state || "ready");
          if (copy) copy.setAttribute("opacity", Number(done));
        }
      };
      ratio = W / H;
      options.onLayout?.(ratio, mobile);
      drawFrame(quiet.matches ? 5.2 : elapsed);
    }

    function motionChanged() {
      drawFrame(quiet.matches ? 5.2 : elapsed);
      run();
    }

    const control = {
      show(index) {
        step = Math.max(0, Math.min(scenes.length - 1, index));
        elapsed = 0;
        render();
        run();
      },
      pause() {
        paused = true;
        cancelAnimationFrame(raf);
      },
      resume() {
        if (!paused) return;
        paused = false;
        run();
      },
      destroy() {
        control.pause();
        narrow.removeEventListener("change", render);
        quiet.removeEventListener("change", motionChanged);
        document.removeEventListener("ss-lang", render);
        host.replaceChildren();
        delete host.__anim;
      },
      ratio: () => ratio,
      step: () => step
    };
    narrow.addEventListener("change", render);
    quiet.addEventListener("change", motionChanged);
    document.addEventListener("ss-lang", render);
    host.__anim = control;
    control.show(0);
    return control;
  }

  window.SSAnim ||= {};
  window.SSAnim[station] = {steps: 5, mount};
})();
