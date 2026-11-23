(function () {
  'use strict';

  const id = 'f-gpaas';
  const scenes = [
    {
      nodes: [
        [["GPU 目录", "GPU Catalog"], ["类型、份额与环境", "Type, share, environment"]],
        [["准入检查", "Admission"], ["权限、配额与容量", "Access, quota, capacity"]],
        [["资源池", "Resource Pool"], ["按规格分配", "Allocate by profile"]]
      ],
      caption: ["通过检查的申请进入资源分配", "Approved requests enter allocation"]
    },
    {
      nodes: [
        [["物理节点", "Physical Node"], ["进入可用库存", "Available inventory"]],
        [["分配记录", "Assignment"], ["节点标识绑定到租户", "Node ID assigned to tenant"]],
        [["租户主机", "Tenant Host"], ["直接运行任务", "Runs jobs on the host"]]
      ],
      caption: ["交付单位是一整台物理服务器", "One allocation, one physical server"]
    },
    {
      nodes: [
        [["物理 GPU", "Physical GPU"], ["安装于主机", "Installed in the host"]],
        [["虚拟化层", "Hypervisor"], ["直通或 vGPU", "Passthrough or vGPU"]],
        [["虚拟机", "Virtual Machine"], ["来宾系统使用 GPU", "Guest OS has GPU access"]]
      ],
      caption: ["虚拟机规格定义可用的 GPU 访问方式", "The VM profile sets GPU access"]
    },
    {
      nodes: [
        [["Pod", "Pod"], ["申请 GPU 资源", "Requests a GPU resource"]],
        [["集群调度器", "Cluster Scheduler"], ["匹配节点资源", "Matches node resources"]],
        [["GPU 节点", "GPU Node"], ["设备插件公布资源", "Plugin advertises GPUs"]]
      ],
      caption: ["容器任务随 Pod 调度到符合要求的节点", "Pod lands on an eligible node"]
    },
    {
      kind: "parallel",
      nodes: [
        [["GPU 实例", "GPU Instance"], ["分配给租户", "Assigned to a tenant"]],
        [["模型端点", "Model Endpoint"], ["处理 API 请求", "Serves API calls"]],
        [["计算用量", "Compute Usage"], ["资源占用时长", "Allocation time"]],
        [["模型用量", "Model Usage"], ["输入与输出 Token", "Input/output tokens"]]
      ],
      signals: [[0, 0.2, "ok"], [1, 0.2, "alt"]],
      caption: ["两种交付方式各有用量口径", "Each service has its own unit"]
    }
  ];
  const routes = {
    parallel: [[0, 2], [1, 3]]
  };

  function layout(kind, mobile) {
    const xs = mobile ? [175, 175, 175] : [144, 440, 736];
    if (kind === 'parallel') return mobile
      ? [[89, 94, 164], [261, 94, 164], [89, 273, 164], [261, 273, 164]]
      : [[157, 79, 244], [157, 201, 244], [723, 79, 244], [723, 201, 244]];
    return xs.map((x, i) => [x, mobile ? 77 + 108 * i : 140, mobile ? 254 : 242]);
  }

  function mount(host, options = {}) {
    const mobile = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const size = () => mobile.matches ? [350, 410] : [880, 300];
    const ratio = () => size()[0] / size()[1];
    const local = pair => pair[window.SS.lang() === 'en' ? 1 : 0];
    const loop = 3.9;
    let current = 0, elapsed = 0, last, frame, balls, wires, cards;
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

    function connect(svg, a, b) {
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
      return {path, arrow, length: path.getTotalLength()};
    }

    function draw() {
      const scene = scenes[current];
      const [w, h] = size();
      const points = layout(scene.kind, mobile.matches);
      const edges = routes[scene.kind] || [[0, 1], [1, 2]];
      host.replaceChildren();
      const svg = el(host, 'svg', {
        viewBox: `0 0 ${w} ${h}`, role: 'img',
        'aria-label': local(window.SS_TOPIC_CFG.steps[current].t) + '. ' + local(scene.caption)
      }, 'diagram');

      wires = edges.map(([from, to]) => ({...connect(svg, points[from], points[to]), to}));
      cards = scene.nodes.map(([label, detail], i) => {
        const [x, y, width] = points[i];
        const group = el(svg, 'g', {'data-node': i}, 'node');
        el(group, 'rect', {x: x - width / 2, y: y - 36, width, height: 72, rx: 4}, 'card');
        text(group, x, y - 5, 'title', label);
        text(group, x, y + 20, 'detail', detail);
        return group;
      });

      const signals = scene.signals || [[0, .2, 'ok'], [1, 1.16, 'ok']];
      balls = signals.map(([index, start, tone]) => ({
        ...wires[index], start, tone,
        dot: el(svg, 'rect', {width: 10, height: 10, rx: 2, 'data-tone': tone}, 'packet')
      }));
      text(svg, w / 2, h - 51, 'caption', scene.caption);
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
      for (const {path, arrow, length, from, to, start, tone, dot} of balls) {
        const progress = Math.max(0, Math.min(1, (time - start) / .84));
        const position = path.getPointAtLength(length * progress);
        dot.setAttribute('x', position.x - 5);
        dot.setAttribute('y', position.y - 5);
        dot.setAttribute('opacity', still ? 0 : Math.max(0, Math.min(1, progress * 8, (1 - progress) * 8)));
        if (progress > 0) {
          path.dataset.tone = tone;
          arrow.dataset.tone = tone;
        }
        if (progress === 1) {
          cards[to].dataset.tone = tone;
        }
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

  (window.SSAnim ||= {})[id] = {steps: 5, mount};
}());
