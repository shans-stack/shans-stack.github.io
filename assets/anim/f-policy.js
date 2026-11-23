(() => {
'use strict';

const id = 'f-policy';
const scenes = [
  {
    columns: [
      [[['策略定义', 'Policy Definition'], ['授权、配额与部署', 'Access, quota, deployment']]],
      [[['适用规则', 'Effective Policy'], ['按范围分发', 'Distributes by scope']]],
      [
        [['环境 A', 'Environment A'], ['本地执行', 'Local enforcement']],
        [['环境 B', 'Environment B'], ['本地执行', 'Local enforcement']]
      ]
    ],
    links: [[0, 1, 0.1, 'normal'], [1, 2, 0.95, 'normal'], [1, 3, 0.95, 'normal']]
  },
  {
    columns: [
      [[['已认证身份', 'Verified Identity'], ['请求创建工作负载', 'Requests workload creation']]],
      [[['授权检查', 'Authorization'], ['动作与目标范围', 'Action and target']]],
      [
        [['本租户对象', 'Own Tenant'], ['允许创建', 'Creation allowed'], 'allowed'],
        [['拒绝操作', 'Access Denied'], ['跨租户请求', 'Other tenant'], 'denied']
      ]
    ],
    links: [[0, 1, 0.1, 'normal'], [1, 2, 0.95, 'allowed'], [1, 3, 0.95, 'denied']]
  },
  {
    columns: [
      [
        [['配额内申请', 'Within Quota'], ['新增 GPU 请求', 'Requests GPUs']],
        [['超额申请', 'Over Quota'], ['新增 GPU 请求', 'Requests GPUs']]
      ],
      [[['配额检查', 'Quota Check'], ['累计用量与上限', 'Usage and limit']]],
      [
        [['待调度', 'In Queue'], ['配额检查通过', 'Quota check passed'], 'allowed'],
        [['拒绝申请', 'Request Denied'], ['超出配额', 'Quota exceeded'], 'denied']
      ]
    ],
    links: [[0, 2, 0.1, 'normal'], [1, 2, 0.25, 'normal'], [2, 3, 0.91, 'allowed'], [2, 4, 1.08, 'denied']]
  },
  {
    columns: [
      [[['已授权请求', 'Authorized Request'], ['提交容器配置', 'Container configuration']]],
      [[['准入验证', 'Admission Check'], ['检查安全规则', 'Checks security policy']]],
      [
        [['合规配置', 'Valid Spec'], ['允许写入', 'Accepted'], 'allowed'],
        [['违规配置', 'Invalid Spec'], ['拒绝写入', 'Rejected'], 'denied']
      ]
    ],
    links: [[0, 1, 0.1, 'normal'], [1, 2, 0.95, 'allowed'], [1, 3, 0.95, 'denied']]
  },
  {
    columns: [
      [
        [['门户', 'Portal'], ['创建资源', 'Create a resource']],
        [['API', 'API'], ['更新配置', 'Update settings']]
      ],
      [[['资源控制面', 'Resource Control Plane'], ['执行适用检查', 'Applies current policy']]],
      [
        [['开通资源', 'Provisioning'], ['创建获准', 'Creation accepted'], 'allowed'],
        [['应用变更', 'Apply Update'], ['变更获准', 'Update accepted'], 'allowed']
      ]
    ],
    links: [[0, 2, 0.1, 'normal'], [1, 2, 0.34, 'normal'], [2, 3, 0.94, 'allowed'], [2, 4, 1.18, 'allowed']]
  },
  {
    columns: [
      [[['拒绝决定', 'Rejection Decision'], ['请求触发规则', 'Rule triggered'], 'denied']],
      [
        [['请求方', 'Requester'], ['收到拒绝原因', 'Receives reason'], 'denied'],
        [['审计记录', 'Audit Log'], ['身份、动作与结果', 'Caller, action, result']]
      ]
    ],
    links: [[0, 1, 0.1, 'denied'], [0, 2, 0.1, 'normal']]
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
