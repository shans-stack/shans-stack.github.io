(() => {
'use strict';

const id = 'f-mt';
const scenes = [
  {
    columns: [
      [
        [['租户 A', 'Tenant A'], ['提交任务', 'Submits workloads']],
        [['租户 B', 'Tenant B'], ['提交任务', 'Submits workloads']]
      ],
      [[['共享 GPU 池', 'Shared GPU Pool'], ['共同使用底层容量', 'Shared capacity']]]
    ],
    links: [[0, 2, 0.1, 'normal'], [1, 2, 0.34, 'normal']]
  },
  {
    columns: [
      [[['租户 A', 'Tenant A'], ['请求访问对象', 'Requests object access']]],
      [[['角色绑定', 'Role Binding'], ['限定在租户 A', 'Scoped to tenant A']]],
      [
        [['租户 A 对象', 'Tenant A Objects'], ['允许', 'Allowed'], 'allowed'],
        [['拒绝访问', 'Access Denied'], ['跨租户请求', 'Other tenant'], 'denied']
      ]
    ],
    links: [[0, 1, 0.1, 'normal'], [1, 2, 0.95, 'allowed'], [1, 3, 0.95, 'denied']]
  },
  {
    columns: [
      [[['A 的工作负载', 'Tenant A Workload'], ['请求连接服务', 'Requests a connection']]],
      [[['网络策略', 'Network Policy'], ['检查允许的连接', 'Checks allowed traffic']]],
      [
        [['获准服务', 'Allowed Service'], ['连接建立', 'Connected'], 'allowed'],
        [['跨租户连接', 'Cross-Tenant Link'], ['连接被阻断', 'Blocked'], 'denied']
      ]
    ],
    links: [[0, 1, 0.1, 'normal'], [1, 2, 0.95, 'allowed'], [1, 3, 0.95, 'denied']]
  },
  {
    columns: [
      [
        [['A 的工作负载', 'Tenant A Workload'], ['A 的卷声明', 'A’s volume claim']],
        [['B 的工作负载', 'Tenant B Workload'], ['B 的卷声明', 'B’s volume claim']]
      ],
      [
        [['A 的持久卷', 'Tenant A Volume'], ['仅挂载 A 的卷', 'Mounts A’s volume'], 'allowed'],
        [['B 的持久卷', 'Tenant B Volume'], ['仅挂载 B 的卷', 'Mounts B’s volume'], 'allowed']
      ]
    ],
    links: [[0, 2, 0.1, 'allowed'], [1, 3, 0.1, 'allowed']]
  },
  {
    columns: [
      [
        [['配额内任务', 'Within Quota'], ['申请 GPU', 'Requests GPUs']],
        [['超额任务', 'Over Quota'], ['申请 GPU', 'Requests GPUs']]
      ],
      [[['租户配额', 'Tenant Quota'], ['核对资源用量', 'Checks resource usage']]],
      [
        [['GPU 资源池', 'GPU Pool'], ['可参与调度', 'Eligible to schedule'], 'allowed'],
        [['超额结果', 'Quota Exceeded'], ['止于配额检查', 'Stopped by quota'], 'denied']
      ]
    ],
    links: [[0, 2, 0.1, 'normal'], [1, 2, 0.25, 'normal'], [2, 3, 0.91, 'allowed'], [2, 4, 1.08, 'denied']]
  },
  {
    columns: [
      [
        [['A 的控制面', 'Control Plane A'], ['租户 A 管理', 'Tenant A scope']],
        [['B 的控制面', 'Control Plane B'], ['租户 B 管理', 'Tenant B scope']]
      ],
      [
        [['A 的专用节点', 'Dedicated Nodes'], ['分配给 A', 'Reserved for A'], 'allowed'],
        [['共享工作节点', 'Shared Workers'], ['A 与 B 均可使用', 'Used by A and B']]
      ]
    ],
    links: [[0, 2, 0.1, 'allowed'], [0, 3, 0.32, 'normal'], [1, 3, 0.55, 'normal']]
  }
];

const note = ['示意，不代表实测数字', 'Illustration without measured data'];
const ns = 'http://www.w3.org/2000/svg';

function mount(host, {onLayout} = {}) {
  const narrow = matchMedia('(max-width: 640px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const local = ([zh, en]) => window.SS.L(zh, en);
  const ratio = () => narrow.matches ? 356 / 430 : 920 / 310;
  let step = 0, paused = false, frame, elapsed = 0, previous, nodes, routes;

  function draw(parent, tag, attributes, type, content) {
    const element = document.createElementNS(ns, tag);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    if (type) element.setAttribute('class', id + '-' + type);
    if (content) element.textContent = local(content);
    return parent.appendChild(element);
  }

  function rebuild() {
    const {columns, links} = scenes[step];
    const mobile = narrow.matches;
    const [width, height] = mobile ? [356, 430] : [920, 310];
    const svg = draw(host, 'svg', {
      viewBox: '0 0 ' + width + ' ' + height,
      role: 'img',
      'aria-label': local(window.SS_TOPIC_CFG.steps[step].d) + ' ' + local(note)
    }, 'figure');
    host.replaceChildren(svg);

    const positions = columns.flatMap((column, i) => column.map((label, lane) => {
      const rank = i - (columns.length - 1) / 2;
      const laneOffset = lane - (column.length - 1) / 2;
      return {
        x: mobile ? 178 + laneOffset * 176 : 460 + rank * (760 / columns.length),
        y: mobile ? 181 + rank * (364 / columns.length) : 137 + laneOffset * 103,
        width: mobile ? (column.length === 2 ? 162 : 286) : Math.min(234, 680 / columns.length),
        label,
        laneOffset
      };
    }));

    const edges = links.map(([from, to, start, tone]) => {
      const a = positions[from], b = positions[to];
      const sideA = links.filter(link => link[0] === from).length > 1 ? Math.sign(b.laneOffset) * 18 : 0;
      const sideB = links.filter(link => link[1] === to).length > 1 ? Math.sign(a.laneOffset) * 18 : 0;
      const x1 = mobile ? a.x + sideA : a.x + a.width / 2;
      const x2 = mobile ? b.x + sideB : b.x - b.width / 2;
      const y1 = mobile ? a.y + 33 : a.y + sideA;
      const y2 = mobile ? b.y - 33 : b.y + sideB;
      const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
      const d = mobile
        ? 'M' + x1 + ' ' + y1 + ' V' + midY + ' H' + x2 + ' V' + y2
        : 'M' + x1 + ' ' + y1 + ' H' + midX + ' V' + y2 + ' H' + x2;
      const group = draw(svg, 'g', {'data-tone': tone});
      const path = draw(group, 'path', {d}, 'wire');
      draw(group, 'path', {
        d: 'M-7 -4 L0 0 L-7 4',
        transform: 'translate(' + x2 + ' ' + y2 + ')' + (mobile ? ' rotate(90)' : '')
      }, 'wire');
      return {group, path, to, start};
    });

    nodes = positions.map(({x, y, width, label: [title, detail, tone = 'normal']}) => {
      const group = draw(svg, 'g', {'data-node': '', 'data-tone': tone});
      draw(group, 'rect', {x: x - width / 2, y: y - 33, width, height: 66, rx: 4}, 'box');
      draw(group, 'text', {x, y: y - 5}, 'title', title);
      draw(group, 'text', {x, y: y + 18}, 'detail', detail);
      return group;
    });

    routes = edges.map(edge => ({
      ...edge,
      length: edge.path.getTotalLength(),
      packet: draw(svg, 'rect', {width: 10, height: 10, rx: 2, 'data-tone': edge.group.dataset.tone}, 'packet')
    }));
    draw(svg, 'text', {x: width / 2, y: height - 23}, 'note', note);
    onLayout?.(ratio(), mobile);
    paint(reduced.matches ? 3.6 : elapsed);
  }

  function paint(time) {
    const arrived = new Set();
    for (const {group, path, packet, length, to, start} of routes) {
      const progress = (time - start) / 0.72;
      const moving = progress >= 0 && progress < 1 && !reduced.matches;
      group.dataset.active = progress >= 0;
      if (progress >= 1) arrived.add(to);
      packet.setAttribute('opacity', moving ? Math.min(1, progress * 12, (1 - progress) * 12) : 0);
      if (moving) {
        const point = path.getPointAtLength(length * progress);
        packet.setAttribute('x', point.x - 5);
        packet.setAttribute('y', point.y - 5);
      }
    }
    nodes.forEach((node, index) => { node.dataset.active = arrived.has(index); });
  }

  function tick(now) {
    elapsed = (elapsed + Math.max(0, now - previous) / 1000) % 4.4;
    previous = now;
    paint(elapsed);
    frame = requestAnimationFrame(tick);
  }

  function run() {
    cancelAnimationFrame(frame);
    if (paused || reduced.matches) return;
    previous = performance.now();
    frame = requestAnimationFrame(tick);
  }

  function motionChanged() {
    paint(reduced.matches ? 3.6 : elapsed);
    run();
  }

  narrow.addEventListener('change', rebuild);
  reduced.addEventListener('change', motionChanged);
  document.addEventListener('ss-lang', rebuild);
  rebuild();
  run();

  const animation = {
    show(index) { step = index; elapsed = 0; rebuild(); run(); },
    pause() { paused = true; cancelAnimationFrame(frame); },
    resume() { paused = false; run(); },
    destroy() {
      cancelAnimationFrame(frame);
      narrow.removeEventListener('change', rebuild);
      reduced.removeEventListener('change', motionChanged);
      document.removeEventListener('ss-lang', rebuild);
      host.replaceChildren();
      delete host.__anim;
    },
    ratio,
    step: () => step
  };
  host.__anim = animation;
  return animation;
}

(window.SSAnim ||= {})[id] = {steps: 6, mount};
})();
