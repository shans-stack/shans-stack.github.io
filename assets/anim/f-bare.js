(function () {
  'use strict';

  const id = 'f-bare';
  const scenes = [
    {
      nodes: [
        [["物理服务器", "Physical Server"], ["机位与主机身份", "Rack position and identity"]],
        [["带外管理", "Out-of-Band Management"], ["BMC · 独立于主机系统", "BMC · independent of host OS"]],
        [["资产记录", "Inventory Record"], ["登记服务器与管理接口", "Server and management port"]]
      ],
      caption: ["先识别节点，再进入装机流程", "Identify the node before provisioning"]
    },
    {
      nodes: [
        [["部署网络", "Provisioning Network"], ["引导程序与镜像源", "Bootloader and image source"]],
        [["安装环境", "Installer"], ["PXE 网络启动", "PXE network boot"]],
        [["物理节点", "Physical Node"], ["安装操作系统与软件", "Install the OS and software"]]
      ],
      caption: ["先引导安装环境，再交付系统镜像", "Boot the installer, then deliver the OS image"]
    },
    {
      kind: "split",
      nodes: [
        [["节点角色", "Node Role"], ["接口、地址与组件", "Interfaces, IPs, components"]],
        [["管理网络", "Management"], ["运维与监控", "Operations"]],
        [["运行网络", "Workload Network"], ["业务与 GPU 互联", "Traffic and fabric"]]
      ],
      caption: ["按角色下发各网络的配置", "Apply network settings by role"]
    },
    {
      kind: "split",
      nodes: [
        [["健康检查", "Health Check"], ["GPU 与链路", "GPUs and links"]],
        [["可用池", "Available Pool"], ["通过 · 可分配", "Pass · allocatable"]],
        [["待处理", "Needs Attention"], ["未通过 · 停用", "Fail · out of service"]]
      ],
      signals: [[0, 0.2, "ok"], [1, 0.65, "alert"]],
      caption: ["验收结果决定节点是否可分配", "Validation determines node eligibility"]
    },
    {
      nodes: [
        [["退出服务", "Out of Service"], ["诊断或重装", "Diagnostics or reimage"]],
        [["复验", "Revalidation"], ["重查 GPU 与链路", "Recheck GPUs and links"]],
        [["可用池", "Available Pool"], ["通过后恢复分配", "Return after passing"]]
      ],
      caption: ["节点通过复验后才能重新分配", "Revalidate before reallocating"]
    }
  ];
  const routes = {
    split: [[0, 1], [0, 2]]
  };

  function layout(kind, mobile) {
    const xs = mobile ? [175, 175, 175] : [144, 440, 736];
    if (kind === 'split') return mobile
      ? [[175, 94, 254], [89, 273, 164], [261, 273, 164]]
      : [[157, 140, 244], [723, 79, 244], [723, 201, 244]];
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
