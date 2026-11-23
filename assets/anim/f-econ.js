(function () {
  'use strict';

  const id = 'f-econ';
  const scenes = [
    {
      nodes: [
        [["已完成请求", "Completed Calls"], ["同一观测窗口", "Same time window"]],
        [["输出 Token", "Output Tokens"], ["汇总请求输出", "Sum call outputs"]],
        [["输出吞吐", "Output Throughput"], ["按测量时长归一", "Divide by elapsed time"]]
      ],
      flow: [
        [0, 0.18], [0, 0.44], [1, 1.19, "accent"]
      ],
      caption: ["输出 Token 总量 ÷ 测量时长", "Output tokens ÷ measurement duration"]
    },
    {
      kind: "compare",
      nodes: [
        [["较低负载", "Lower Load"], ["较早首达", "Earlier first token"]],
        [["升高负载", "Higher Load"], ["首达前排队", "Queues first"]],
        [["低负载输出", "Low-Load Output"], ["送达 0", "Delivered 0"]],
        [["高负载输出", "High-Load Output"], ["送达 0", "Delivered 0"]]
      ],
      flow: [
        [0, 0.15, "good"], [0, 1.35, "good"], [1, 0.88, "busy"],
        [1, 1.2, "busy"], [1, 1.52, "busy"], [1, 1.84, "busy"]
      ],
      caption: ["相同时间窗口 · 各路分别计数", "Same window · Separate output counts"]
    },
    {
      nodes: [
        [["成功请求", "Successful Calls"], ["输出与延迟记录", "Output and latency"]],
        [["服务目标", "Service Targets"], ["首 Token 与间隔", "TTFT and ITL"]],
        [["合格输出", "Qualifying Output"], ["汇总输出 Token", "Sum output tokens"]]
      ],
      flow: [
        [0, 0.2, "good"], [1, 1.1, "good"], [0, 1.9, "blocked"]
      ],
      caption: ["超出任一阈值的请求止于筛选", "Calls that miss a target stop at the filter"]
    },
    {
      kind: "merge",
      nodes: [
        [["算力容量", "Compute"], ["含待机资源", "Includes idle time"]],
        [["配套费用", "Operating Costs"], ["例如托管与软件", "Hosting, software"]],
        [["窗口总成本", "Window Cost"], ["按同一时段归集", "Same cost window"]]
      ],
      flow: [
        [0, 0.25], [1, 0.53, "accent"]
      ],
      caption: ["算力容量成本与配套费用相加", "Capacity and operating costs are added"]
    },
    {
      kind: "merge",
      nodes: [
        [["运行成本", "Operating Cost"], ["同一测量窗口", "Same time window"]],
        [["合格输出", "Qualified Tokens"], ["输出 Token 数", "Token count"]],
        [["单位成本", "Unit Cost"], ["每百万合格输出 Token", "Per 1M qualifying tokens"]]
      ],
      flow: [
        [0, 0.25], [1, 0.53, "good"]
      ],
      caption: ["运行成本 ÷ 合格输出 Token 数 × 100 万", "Cost ÷ qualifying tokens × 1 million"]
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
