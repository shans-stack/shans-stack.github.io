(function () {
  'use strict';

  const id = 'f-plat';
  const scenes = [
    {
      nodes: [
        [["基础设施", "Infrastructure"], ["GPU 服务器与集群", "GPU servers and clusters"]],
        [["控制器", "Controller"], ["PaaS Studio · 服务模板", "PaaS Studio · templates"]],
        [["租户目录", "Tenant Catalog"], ["可申请的计算与服务", "Compute and services"]]
      ],
      caption: ["运营方把可用资源发布为服务规格", "Inventory becomes catalog offerings"]
    },
    {
      kind: "pair",
      boundary: "agent",
      nodes: [
        [["部署代理", "Deployment Agent"], ["受管侧发起连接", "Initiates the connection"]],
        [["控制器", "Controller"], ["托管端接收连接", "Hosted connection endpoint"]]
      ],
      edges: [[0, 1]],
      signals: [[0, 0.15, "ok"], [0, 1.24, "alt", true], [0, 2.32, "ok"]],
      captions: [
        ["出站 TLS · 代理发起连接", "Outbound TLS · agent connects"],
        ["已建立的通道 · 控制器发送任务", "Controller sends work"],
        ["已建立的通道 · 代理回报状态", "Agent reports status"]
      ],
      caption: ["代理建立通道，任务与状态双向传送", "Agent connects · tasks and status"]
    },
    {
      kind: "split",
      nodes: [
        [["控制器", "Controller"], ["目录与策略集中管理", "Shared catalog and policies"]],
        [["数据中心", "Data Center"], ["本地 GPU 运行", "Local GPUs"]],
        [["公有云", "Public Cloud"], ["云资源运行", "Cloud runtime"]]
      ],
      caption: ["集中派发，各环境在本地执行", "Dispatch centrally, run locally"]
    },
    {
      boundary: "airgap",
      nodes: [
        [["本地依赖", "Local Artifacts"], ["事先准备安装包", "Staged packages"]],
        [["控制器", "Controller"], ["气隙内自托管", "Self-hosted inside the gap"]],
        [["受管资源", "Managed Resources"], ["只连接隔离区内服务", "Uses services inside the gap"]]
      ],
      caption: ["部署依赖和管理通道均留在气隙内", "Services stay inside the air gap"]
    },
    {
      kind: "merge",
      nodes: [
        [["租户 A", "Tenant A"], ["符合访问与配额策略", "Within policy limits"]],
        [["租户 B", "Tenant B"], ["申请超过配额", "Over quota"]],
        [["控制器", "Controller"], ["角色 · 配额 · 审计", "Roles · Quotas · Audit"]]
      ],
      signals: [[0, 0.2, "ok"], [1, 0.65, "alert"]],
      caption: ["在控制平面检查通过或拒绝申请", "Policy admits or rejects requests"]
    },
    {
      kind: "merge",
      nodes: [
        [["资源用量", "Resource Usage"], ["组织或项目归属", "Org or project"]],
        [["Token 用量", "Token Usage"], ["租户和模型", "Tenant and model"]],
        [["控制器", "Controller"], ["分开归集两类记录", "Separate usage records"]]
      ],
      signals: [[0, 0.2, "ok"], [1, 0.55, "alt"]],
      caption: ["资源与模型服务采用各自用量记录", "Compute and token usage stay separate"]
    }
  ];
  const routes = {
    split: [[0, 1], [0, 2]],
    merge: [[0, 2], [1, 2]]
  };

  function layout(kind, mobile) {
    const xs = mobile ? [175, 175, 175] : [144, 440, 736];
    if (kind === 'pair') return mobile
      ? [[175, 115, 254], [175, 263, 254]]
      : [[193, 140, 240], [687, 140, 240]];
    if (kind === 'split' || kind === 'merge') {
      const pair = mobile
        ? [[89, kind === 'merge' ? 94 : 273, 164], [261, kind === 'merge' ? 94 : 273, 164]]
        : [[kind === 'merge' ? 157 : 723, 79, 244], [kind === 'merge' ? 157 : 723, 201, 244]];
      const single = mobile
        ? [175, kind === 'merge' ? 273 : 94, 254]
        : [kind === 'merge' ? 723 : 157, 140, 244];
      return kind === 'merge' ? [...pair, single] : [single, ...pair];
    }
    return xs.map((x, i) => [x, mobile ? 77 + 108 * i : 140, mobile ? 254 : 242]);
  }

  function mount(host, options = {}) {
    const mobile = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const size = () => mobile.matches ? [350, 410] : [880, 300];
    const ratio = () => size()[0] / size()[1];
    const local = pair => pair[window.SS.lang() === 'en' ? 1 : 0];
    const loop = 3.9;
    let current = 0, elapsed = 0, last, frame, balls, wires, cards, status;
    let paused = Boolean(options.paused);

    function el(parent, tag, attrs, cls, value) {
      const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const [key, val] of Object.entries(attrs)) node.setAttribute(key, val);
      if (cls) node.setAttribute('class', id + '-' + cls);
      if (value) node.textContent = value;
      parent.append(node);
      return node;
    }

    function text(parent, x, y, cls, pair, anchor = 'middle') {
      return el(parent, 'text', {x, y, 'text-anchor': anchor}, cls, local(pair));
    }

    function connect(svg, a, b, bidirectional) {
      const [ax, ay, aw] = a, [bx, by, bw] = b;
      const down = mobile.matches;
      const x1 = down ? ax : ax + aw / 2, x2 = down ? bx : bx - bw / 2;
      const y1 = down ? ay + 36 : ay, y2 = down ? by - 36 : by;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const d = down ? `M${x1} ${y1} V${my} H${x2} V${y2}`
        : `M${x1} ${y1} H${mx} V${y2} H${x2}`;
      const path = el(svg, 'path', {d}, 'line');
      const arrow = el(svg, 'path', {
        d: 'M-7 -4 L0 0 L-7 4',
        transform: `translate(${x2} ${y2}) rotate(${down ? 90 : 0})`
      }, 'line');
      const reverseArrow = bidirectional ? el(svg, 'path', {
        d: 'M-7 -4 L0 0 L-7 4',
        transform: `translate(${x1} ${y1}) rotate(${down ? -90 : 180})`
      }, 'line') : null;
      return {path, arrow, reverseArrow, length: path.getTotalLength()};
    }

    function boundary(svg, name, narrow) {
      if (!name) return;
      const airgap = name === 'airgap';
      const [x, y, width, height] = airgap
        ? (narrow ? [29, 11, 292, 326] : [12, 52, 856, 162])
        : (narrow ? [29, 39, 292, 124] : [50, 53, 288, 159]);
      el(svg, 'rect', {x, y, width, height, rx: 7}, 'boundary');
      text(svg, x + 12, y + 21, 'note', airgap
        ? ['气隙网络', 'Air-Gapped Network']
        : ['受管环境', 'Managed Environment'], 'start');
    }

    function draw() {
      const scene = scenes[current];
      const [w, h] = size();
      const points = layout(scene.kind, mobile.matches);
      const edges = scene.edges || routes[scene.kind] || [[0, 1], [1, 2]];
      host.replaceChildren();
      const svg = el(host, 'svg', {
        viewBox: `0 0 ${w} ${h}`, role: 'img',
        'aria-label': local(window.SS_TOPIC_CFG.steps[current].t) + '. ' + local(scene.caption)
      }, 'diagram');

      boundary(svg, scene.boundary, mobile.matches);
      wires = edges.map(([from, to]) => ({...connect(svg, points[from], points[to], Boolean(scene.captions)), from, to}));
      cards = scene.nodes.map(([label, detail], i) => {
        const [x, y, width] = points[i];
        const group = el(svg, 'g', {'data-node': i}, 'node');
        el(group, 'rect', {x: x - width / 2, y: y - 36, width, height: 72, rx: 4}, 'card');
        text(group, x, y - 5, 'title', label);
        text(group, x, y + 20, 'detail', detail);
        return group;
      });

      const signals = scene.signals || [[0, .2, 'ok'], [1, 1.16, 'ok']];
      balls = signals.map(([index, start, tone, reverse]) => ({
        ...wires[index], start, tone, reverse,
        dot: el(svg, 'rect', {width: 10, height: 10, rx: 2, 'data-tone': tone}, 'packet')
      }));
      status = text(svg, w / 2, h - 51, 'caption', scene.caption);
      text(svg, w / 2, h - 22, 'note', ['示意，不代表实测数字', 'Illustrative, not measured']);
      options.onLayout?.(ratio(), mobile.matches);
    }

    function render(time) {
      const still = reduced.matches;
      for (const card of cards) delete card.dataset.tone;
      for (const {path, arrow} of wires) {
        delete path.dataset.tone;
        delete arrow.dataset.tone;
      }
      for (const {path, arrow, length, from, to, start, tone, reverse, dot} of balls) {
        const progress = Math.max(0, Math.min(1, (time - start) / .84));
        const position = path.getPointAtLength(length * (reverse ? 1 - progress : progress));
        dot.setAttribute('x', position.x - 5);
        dot.setAttribute('y', position.y - 5);
        dot.setAttribute('opacity', still ? 0 : Math.max(0, Math.min(1, progress * 8, (1 - progress) * 8)));
        if (progress > 0) {
          path.dataset.tone = tone;
          arrow.dataset.tone = tone;
        }
        if (progress === 1 && scenes[current].captions === undefined) {
          cards[reverse ? from : to].dataset.tone = tone;
        }
      }
      const scene = scenes[current];
      if (scene.captions) {
        const {arrow, reverseArrow} = wires[0];
        const returningTask = time >= 1.24 && time < 2.32;
        arrow.style.display = returningTask && !still ? 'none' : '';
        reverseArrow.style.display = returningTask || still ? '' : 'none';
        reverseArrow.dataset.tone = still ? 'alt' : arrow.dataset.tone || 'alt';
        const phase = time < 1.24 ? 0 : time < 2.32 ? 1 : 2;
        status.textContent = local(still ? scene.caption : scene.captions[phase]);
      }
    }

    function tick(now) {
      elapsed = (elapsed + Math.max(0, now - last) / 1000) % loop;
      last = now;
      render(elapsed);
      frame = requestAnimationFrame(tick);
    }

    function play() {
      cancelAnimationFrame(frame);
      if (paused || reduced.matches) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }

    function rebuild() {
      draw();
      render(reduced.matches ? 3.8 : elapsed);
      play();
    }

    const api = {
      show(i) {
        current = Math.max(0, Math.min(scenes.length - 1, i));
        elapsed = 0;
        rebuild();
      },
      pause() {
        paused = true;
        cancelAnimationFrame(frame);
      },
      resume() {
        paused = false;
        play();
      },
      destroy() {
        api.pause();
        mobile.removeEventListener('change', rebuild);
        reduced.removeEventListener('change', rebuild);
        document.removeEventListener('ss-lang', rebuild);
        host.replaceChildren();
        delete host.__anim;
      },
      ratio,
      step: () => current
    };

    mobile.addEventListener('change', rebuild);
    reduced.addEventListener('change', rebuild);
    document.addEventListener('ss-lang', rebuild);
    host.__anim = api;
    rebuild();
    return api;
  }

  (window.SSAnim ||= {})[id] = {steps: 6, mount};
}());
