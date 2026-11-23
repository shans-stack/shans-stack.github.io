(function () {
  'use strict';

  const id = 'f-catalog';
  const scenes = [
    {
      nodes: [
        [["应用", "Application"], ["任务与输入", "Task and input"]],
        [["模型目录", "Model Catalog"], ["按能力查找", "Match capabilities"]],
        [["服务条目", "Service Entry"], ["支持文本生成", "Text generation"]]
      ],
      flow: [
        [0, 0.2], [1, 1.15]
      ],
      caption: ["发现阶段 · 服务能力匹配", "Discovery · Match service capabilities"]
    },
    {
      nodes: [
        [["服务条目", "Service Entry"], ["模型 ID", "Model ID"]],
        [["调用约定", "API Contract"], ["请求格式 · 流式输出", "Format · Streaming"]],
        [["客户端配置", "Client Configuration"], ["目标模型与 API", "Target model and API"]]
      ],
      flow: [
        [0, 0.2], [1, 1.15]
      ],
      caption: ["模型标识与接口参数进入调用配置", "Model ID and API details"]
    },
    {
      nodes: [
        [["模型制品", "Model Artifact"], ["权重与配置", "Weights and config"]],
        [["推理部署", "Inference Deployment"], ["推理引擎与运行资源", "Engine and resources"]],
        [["推理端点", "Inference Endpoint"], ["接收应用请求", "Receives API requests"]]
      ],
      edges: [[0, 1], [2, 1]],
      flow: [
        [0, 0.2, "accent"], [1, 1.2]
      ],
      caption: ["部署加载模型 · 请求经端点进入部署", "Model loads · Calls enter via endpoint"]
    },
    {
      nodes: [
        [["应用请求", "Application Call"], ["调用凭据", "Caller credentials"]],
        [["访问策略", "Access Policy"], ["租户与角色", "Tenant and role"]],
        [["推理端点", "Inference Endpoint"], ["仅接收获准请求", "Authorized calls only"]]
      ],
      flow: [
        [0, 0.2], [1, 1.1], [0, 1.9, "blocked"]
      ],
      caption: ["未授权请求止于访问策略", "Unapproved calls stop at the check"]
    },
    {
      kind: "split",
      nodes: [
        [["应用调用", "Application Call"], ["显式选择模型 ID", "Selects model ID"]],
        [["现有版本", "Current Version"], ["现有模型 ID", "Existing ID"]],
        [["新版本", "New Version"], ["验证后切换", "After validation"]]
      ],
      flow: [
        [0, 0.2], [1, 1.5, "accent"]
      ],
      caption: ["每个版本保留独立的调用标识", "Each version has its own model ID"]
    }
  ];

  function mount(host, options = {}) {
    const mobileQuery = matchMedia('(max-width: 640px)');
    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    let step = 0, elapsed = 0, last, frame, svg, cards, paths, packets;
    let paused = Boolean(options.paused);
    const local = pair => pair[window.SS.lang() === 'en' ? 1 : 0];
    const ratio = () => mobileQuery.matches ? 350 / 462 : 880 / 302;

    function element(parent, tag, attrs, cls, content) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      if (cls) el.setAttribute('class', id + '-' + cls);
      for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
      if (content) el.textContent = content;
      parent.append(el);
      return el;
    }

    function label(parent, x, y, cls, pair) {
      return element(parent, 'text', {x, y, 'text-anchor': 'middle'}, cls, local(pair));
    }

    function layout(kind, mobile) {
      if (kind === 'compare') {
        return mobile
          ? [[87, 110, 158], [263, 110, 158], [87, 305, 158], [263, 305, 158]]
          : [[162, 79, 242], [162, 203, 242], [718, 79, 242], [718, 203, 242]];
      }
      if (kind === 'merge') {
        return mobile
          ? [[87, 113, 158], [263, 113, 158], [175, 318, 275]]
          : [[168, 79, 240], [168, 203, 240], [708, 141, 262]];
      }
      if (kind === 'split') {
        return mobile
          ? [[175, 113, 275], [87, 318, 158], [263, 318, 158]]
          : [[172, 141, 258], [710, 79, 254], [710, 203, 254]];
      }
      return mobile
        ? [[175, 85, 286], [175, 208, 286], [175, 331, 286]]
        : [[139, 141, 250], [440, 141, 240], [741, 141, 250]];
    }

    function connect(from, to, mobile) {
      const [ax, ay, aw] = from;
      const [bx, by, bw] = to;
      const direction = Math.sign(mobile ? by - ay : bx - ax);
      const x1 = mobile ? ax : ax + direction * aw / 2;
      const x2 = mobile ? bx : bx - direction * bw / 2;
      const y1 = mobile ? ay + direction * 37 : ay;
      const y2 = mobile ? by - direction * 37 : by;
      const mid = mobile ? (y1 + y2) / 2 : (x1 + x2) / 2;
      const d = mobile
        ? `M${x1} ${y1} V${mid} H${x2} V${y2}`
        : `M${x1} ${y1} H${mid} V${y2} H${x2}`;
      const path = element(svg, 'path', {d}, 'path');
      const angle = mobile ? direction * 90 : direction === 1 ? 0 : 180;
      const arrow = element(svg, 'path', {
        d: 'M-7 -4 L0 0 L-7 4',
        transform: `translate(${x2} ${y2}) rotate(${angle})`
      }, 'arrow');
      return {path, arrow, length: path.getTotalLength()};
    }

    function draw() {
      const scene = scenes[step];
      const mobile = mobileQuery.matches;
      const size = mobile ? [350, 462] : [880, 302];
      const points = layout(scene.kind, mobile);
      const edges = scene.edges || ({
        compare: [[0, 2], [1, 3]],
        merge: [[0, 2], [1, 2]],
        split: [[0, 1], [0, 2]]
      }[scene.kind] || [[0, 1], [1, 2]]);
      const title = window.SS_TOPIC_CFG.steps[step].t;
      host.replaceChildren();
      svg = element(host, 'svg', {
        viewBox: `0 0 ${size[0]} ${size[1]}`,
        role: 'img',
        'aria-label': local(title) + '. ' + local(scene.caption)
      }, 'diagram');

      paths = edges.map(([a, b]) => ({...connect(points[a], points[b], mobile), target: b}));
      cards = scene.nodes.map(([title, subtitle], i) => {
        const [x, y, w] = points[i];
        const group = element(svg, 'g', {'data-node': i}, 'node');
        element(group, 'rect', {x: x - w / 2, y: y - 37, width: w, height: 74, rx: 4}, 'card');
        label(group, x, y - 4, 'title', title);
        return {
          group, subtitle, detail: label(group, x, y + 20, 'detail', subtitle)
        };
      });

      packets = scene.flow.map(([edge, start, tone = 'signal']) => ({
        ...paths[edge], start, tone,
        dot: element(svg, 'rect', {width: 10, height: 10, rx: 2}, 'packet')
      }));

      label(svg, size[0] / 2, mobile ? 408 : 258, 'caption', scene.caption);
      label(svg, size[0] / 2, mobile ? 437 : 283, 'note', [
        '示意，不代表实测数字', 'Illustrative, not measured'
      ]);
      options.onLayout?.(ratio(), mobile);
    }

    function render(time) {
      const scene = scenes[step];
      const counts = cards.map(() => 0);
      const still = motionQuery.matches;
      const fade = still ? 1 : Math.max(0, Math.min(1, time / 0.14, (3.8 - time) / 0.32));
      for (const {path, arrow} of paths) {
        path.removeAttribute('data-tone');
        arrow.removeAttribute('data-tone');
      }
      for (const {path, arrow, length, start, tone, dot, target} of packets) {
        const p = (time - start) / 0.78;
        const moving = p >= 0 && p < 1;
        if (p >= 1 && tone !== 'blocked') counts[target]++;
        if (moving || still) {
          path.dataset.tone = tone;
          arrow.dataset.tone = tone;
        }
        dot.dataset.tone = tone;
        const point = path.getPointAtLength(length * Math.max(0, Math.min(p, 1)));
        dot.setAttribute('x', point.x - 5);
        dot.setAttribute('y', point.y - 5);
        dot.setAttribute('opacity', moving ? fade : 0);
      }
      for (const [i, card] of cards.entries()) card.group.dataset.arrived = counts[i] > 0;
      if (scene.kind === 'compare') {
        for (const i of [2, 3]) {
          cards[i].detail.textContent = local(['送达 ' + counts[i], 'Delivered ' + counts[i]]);
          cards[i].detail.setAttribute('opacity', fade);
        }
      }
      if (scene.countRecord) cards[2].detail.textContent = local(counts[2] ? ['累计 1 笔', '1 record'] : cards[2].subtitle);
    }

    function tick(now) {
      if (motionQuery.matches) {
        render(3.2);
        return;
      }
      elapsed = (elapsed + Math.max(0, now - last) / 1000) % 3.8;
      last = now;
      render(elapsed);
      frame = requestAnimationFrame(tick);
    }

    function play() {
      cancelAnimationFrame(frame);
      if (!paused && !motionQuery.matches) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    }

    function rebuild() {
      draw();
      render(motionQuery.matches ? 3.2 : elapsed);
      play();
    }

    const api = {
      show(i) {
        step = Math.max(0, Math.min(scenes.length - 1, i));
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
        mobileQuery.removeEventListener('change', rebuild);
        motionQuery.removeEventListener('change', rebuild);
        document.removeEventListener('ss-lang', rebuild);
        host.replaceChildren();
        delete host.__anim;
      },
      ratio,
      step: () => step
    };

    mobileQuery.addEventListener('change', rebuild);
    motionQuery.addEventListener('change', rebuild);
    document.addEventListener('ss-lang', rebuild);
    host.__anim = api;
    rebuild();
    return api;
  }

  (window.SSAnim ||= {})[id] = {steps: scenes.length, mount};
}());
