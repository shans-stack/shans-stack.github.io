(function () {
  'use strict';

  const id = 'f-sched';
  const scenes = [
    {
      columns: [
        [["待放置 Pod","Pending Pod","训练或推理","Training or inference"]],
        [["GPU 调度器","GPU Scheduler","匹配可用节点","Match eligible nodes"]],
        [["GPU 节点甲","GPU Node A","已绑定 Pod","Pod bound","good"], ["GPU 节点乙","GPU Node B","未参与本次绑定","No binding","off"]]
      ],
      edges: [[0,1,0.15],[1,2,1.25,"good"],[1,3,null,"off"]],
      note: ["绑定记录工作负载的运行位置","The binding records where the workload runs"]
    },
    {
      columns: [
        [["待放置 Pod","Pending Pod","需要两块 GPU","Requests two GPUs","",2]],
        [["节点容量检查","Capacity Fit","每台节点单独检查","Evaluate each node"]],
        [["节点甲","Node A","一块可用","One free","warn",1], ["节点乙","Node B","两块可用","Two free","good",2]]
      ],
      edges: [[0,1,0.15],[1,2,null,"off"],[1,3,1.3,"good"]],
      note: ["同一节点须满足 Pod 的完整请求","One node must fit the entire Pod"]
    },
    {
      columns: [
        [["租户甲请求","Tenant A","剩余配额足够","Within quota"], ["租户乙请求","Tenant B","超出硬配额","Above hard quota","warn"]],
        [["准入检查","Admission","核对请求总量","Check aggregate requests"]],
        [["待放置","Pending","进入节点匹配","Await node placement","good"], ["拒绝","Rejected","未创建 Pod","No Pod created","warn"]]
      ],
      edges: [[0,2,0.1],[1,2,0.35,"warn"],[2,3,1.25,"good"],[2,4,1.5,"warn"]],
      note: ["示意采用 Kubernetes 硬配额","This example uses Kubernetes hard quotas"]
    },
    {
      columns: [
        [["工作负载要求","Placement Needs","指定型号和容量","GPU model and capacity"]],
        [["候选筛选","Node Filter","检查硬性条件","Check hard constraints"]],
        [["节点甲","Node A","型号不符","Wrong GPU","warn"], ["节点乙","Node B","容量不足","No room","warn"], ["节点丙","Node C","满足要求","Eligible","good"]]
      ],
      edges: [[0,1,0.1],[1,2,null,"off"],[1,3,null,"off"],[1,4,1.25,"good"]],
      note: ["仅满足硬性约束的节点进入评分","Only eligible nodes proceed to scoring"]
    },
    {
      columns: [
        [["Pod 甲","Pod A","存在候选节点","Eligible node exists"], ["Pod 乙","Pod B","没有合格节点","No eligible node","warn"]],
        [["选择节点","Select Node","按候选评分","Rank candidates"], ["保留请求","Keep Pending","等待复查","Retry later","warn"]],
        [["节点已绑定","Node Bound","节点启动容器","Node starts containers","good"], ["待调度","Pending","节点约束未满足","Constraint unmet","warn"]]
      ],
      edges: [[0,2,0.1],[1,3,0.45,"warn"],[2,4,1.2,"good"],[3,5,1.55,"warn"]],
      note: ["未绑定的 Pod 等待后续调度","Unbound Pods await another scheduling attempt"]
    },
    {
      columns: [
        [["项目甲","Project A","提交该池的需求","Requests this pool"], ["项目乙","Project B","提交该池的需求","Requests this pool"]],
        [["节点池","Node Pool","按池计算可得份额","Calculate shares per pool"]],
        [["配额份额","Quota Shares","按各项目配置","Configured by project","good"], ["空闲份额","Unused Share","按共享规则使用","Shared by policy","good"]]
      ],
      edges: [[0,2,0.1],[1,2,0.45],[2,3,1.45,"good"],[2,4,1.75,"good"]],
      note: ["容量与配额以节点池为范围","Capacity and quotas are scoped to the node pool"]
    }
  ];

  function mount(host, {onLayout, paused = false} = {}) {
    const compact = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let current = 0, frame, last, elapsed, svg, movers, marks;
    const local = (zh, en) => window.SS.lang() === 'en' ? en : zh;
    const ratio = () => compact.matches ? 1 : 880 / 330;

    function draw(tag, attrs, cls, parent = svg) {
      const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
      if (cls) element.setAttribute('class', id + '-' + cls);
      parent.append(element);
      return element;
    }

    function text(x, y, zh, en, cls = 'label', parent = svg, anchor = 'middle') {
      const label = draw('text', {x, y, 'text-anchor': anchor}, cls, parent);
      label.textContent = local(zh, en);
    }

    function route(points, start, tone = 'base', receiver) {
      const d = points.map(([x, y], i) => (i ? 'L' : 'M') + x + ' ' + y).join(' ');
      const path = draw('path', {d, fill: 'none', 'data-tone': tone}, 'route');
      const length = path.getTotalLength();
      const end = path.getPointAtLength(length);
      const back = path.getPointAtLength(Math.max(0, length - 7));
      const dx = end.x - back.x, dy = end.y - back.y;
      if (tone !== 'off') {
        draw('path', {
          d: `M${end.x} ${end.y} L${back.x + dy / 2} ${back.y - dx / 2} L${back.x - dy / 2} ${back.y + dx / 2} Z`,
          'data-tone': tone
        }, 'arrow');
      }
      if (start === null) return;
      const packet = draw('rect', {x: -5, y: -5, width: 10, height: 10, rx: 2, opacity: 0, 'data-tone': tone}, 'packet');
      movers.push({path, length, start, packet, receiver});
    }

    function card(x, y, width, [zh, en, detailZh, detailEn, tone = 'base', chips = 0]) {
      const height = chips ? 88 : 64;
      const group = draw('g', {'data-card': '', 'data-tone': tone}, 'card');
      draw('rect', {x: x - width / 2, y: y - height / 2, width, height, rx: 5}, 'box', group);
      text(x, y - (chips ? 16 : 6), zh, en, 'label', group);
      text(x, y + (chips ? 10 : 20), detailZh, detailEn, 'detail', group);
      for (let i = 0; i < chips; i++) {
        draw('rect', {x: x + (i - (chips - 1) / 2) * 20 - 6, y: y + 24, width: 12, height: 9, rx: 2}, 'chip', group);
      }
      return group;
    }

    function graph({columns, edges}, mobile) {
      const nodes = columns.flatMap((column, tier) => column.map((label, i) => {
        const offset = i - (column.length - 1) / 2;
        const gap = column.length === 3 ? 116 : 177;
        return mobile
          ? {tier, x: 180 + offset * gap, y: 51 + tier * 104, w: column.length === 3 ? 108 : (column.length === 2 ? 163 : 234), label}
          : {tier, x: 141 + tier * 299, y: 147 + offset * (column.length === 3 ? 88 : 104), w: 228, label};
      }));

      for (const [i, [from, to, start, tone]] of edges.entries()) {
        const a = nodes[from], b = nodes[to];
        const aHalf = a.label[5] ? 44 : 32, bHalf = b.label[5] ? 44 : 32;
        const lane = ((i % 3) - 1) * 7;
        let points;
        if (a.tier === b.tier) {
          points = mobile
            ? [[a.x + a.w / 2, a.y], [b.x - b.w / 2, b.y]]
            : [[a.x, a.y + aHalf], [b.x, b.y - bHalf]];
        } else if (mobile) {
          const y = (a.y + b.y) / 2 + lane;
          points = [[a.x, a.y + aHalf], [a.x, y], [b.x, y], [b.x, b.y - bHalf]];
        } else {
          const x = (a.x + b.x) / 2 + lane;
          points = [[a.x + a.w / 2, a.y], [x, a.y], [x, b.y], [b.x - b.w / 2, b.y]];
        }
        route(points, start, tone, b);
      }
      for (const node of nodes) {
        node.group = card(node.x, node.y, node.w, node.label);
        if (movers.some(mover => mover.receiver === node)) marks.add(node);
      }
    }

    function paint(t, still = false) {
      for (const mark of marks) mark.group.removeAttribute('data-arrived');
      for (const {path, length, start, packet, receiver} of movers) {
        const progress = (t - start) / .88;
        const point = path.getPointAtLength(length * Math.max(0, Math.min(1, progress)));
        packet.setAttribute('transform', `translate(${point.x} ${point.y})`);
        packet.setAttribute('opacity', still ? 0 : Math.max(0, Math.min(1, progress * 10, (1.23 - progress) * 5)));
        if (receiver?.group && (still || progress >= 1)) receiver.group.setAttribute('data-arrived', '');
      }
    }

    function tick(now) {
      elapsed += Math.max(0, Math.min((now - last) / 1000, .05));
      last = now;
      paint(elapsed % 4.6);
      frame = requestAnimationFrame(tick);
    }

    function resumeFrames() {
      cancelAnimationFrame(frame);
      if (!paused && !reduced.matches) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    }

    function show(index) {
      current = Math.max(0, Math.min(scenes.length - 1, index));
      elapsed = 0;
      movers = [];
      marks = new Set();
      const mobile = compact.matches, width = mobile ? 360 : 880, height = mobile ? 360 : 330;
      const scene = scenes[current];
      host.replaceChildren();
      svg = draw('svg', {viewBox: `0 0 ${width} ${height}`, role: 'img',
        'aria-label': window.SS_TOPIC_CFG.steps[current].d[local(0, 1)],
        'data-step': current + 1}, 'diagram', host);
      graph(scene, mobile);
      text(width / 2, height - 38, ...scene.note, 'detail');
      text(width / 2, height - 13, '示意，不代表实测数字', 'Schematic, no measured data', 'note');
      paint(0, reduced.matches);
      resumeFrames();
    }

    function rebuild() {
      onLayout?.(ratio(), compact.matches);
      show(current);
    }

    compact.addEventListener('change', rebuild);
    reduced.addEventListener('change', rebuild);
    document.addEventListener('ss-lang', rebuild);
    onLayout?.(ratio(), compact.matches);
    const controller = {
      show,
      pause() { paused = true; cancelAnimationFrame(frame); },
      resume() { if (paused) { paused = false; resumeFrames(); } },
      destroy() {
        controller.pause();
        compact.removeEventListener('change', rebuild);
        reduced.removeEventListener('change', rebuild);
        document.removeEventListener('ss-lang', rebuild);
        delete host.__anim;
        host.replaceChildren();
      },
      ratio,
      step() { return current; }
    };
    host.__anim = controller;
    return controller;
  }

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = {steps: 6, mount};
})();
