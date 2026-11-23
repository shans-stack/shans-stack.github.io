(() => {
'use strict';

const id = 'f-portal';
const scenes = [
  {
    columns: [
      [[['服务目录', 'Service Catalog'], ['选择获准规格', 'Approved offering']]],
      [[['租户规则', 'Tenant Rules'], ['权限与配额', 'Access and quota']]],
      [[['开通流程', 'Provisioning'], ['创建并报告状态', 'Create and report']]],
      [[['交付结果', 'Delivery'], ['使用入口', 'Access details'], 'allowed']]
    ],
    links: [[0, 1, 0.1, 'normal'], [1, 2, 0.88, 'allowed'], [2, 3, 1.66, 'allowed']]
  },
  {
    columns: [
      [[['集群模板', 'Cluster Template'], ['节点规格', 'Node configuration']]],
      [
        [['控制平面', 'Control Plane'], ['kube-apiserver', 'kube-apiserver']],
        [['工作节点', 'Workers'], ['运行容器', 'Run containers']]
      ],
      [[['租户入口', 'Tenant Access'], ['Kubernetes API', 'Kubernetes API'], 'allowed']]
    ],
    links: [[0, 1, 0.1, 'normal'], [0, 2, 0.1, 'normal'], [1, 3, 0.95, 'allowed']]
  },
  {
    columns: [
      [[['虚拟机规格', 'VM Configuration'], ['CPU、磁盘、GPU', 'CPU, Disk, GPU']]],
      [[['虚拟机', 'Virtual Machine'], ['操作系统与网络', 'OS and network']]],
      [[['登录入口', 'Login Access'], ['例如 Linux SSH', 'Example: Linux SSH'], 'allowed']]
    ],
    links: [[0, 1, 0.1, 'normal'], [1, 2, 0.92, 'allowed']]
  },
  {
    columns: [
      [[['工作区模板', 'Workspace Template'], ['工具与依赖', 'Tools and dependencies']]],
      [[['AI 工作区', 'AI Workspace'], ['计算与持久存储', 'Compute and storage']]],
      [[['笔记本入口', 'Notebook Access'], ['交互式开发', 'Interactive development'], 'allowed']]
    ],
    links: [[0, 1, 0.1, 'normal'], [1, 2, 0.92, 'allowed']]
  },
  {
    columns: [
      [[['模型文件', 'Model Files'], ['权重与配置', 'Weights and configuration']]],
      [[['推理运行时', 'Inference Runtime'], ['加载模型', 'Loads the model']]],
      [[['模型端点', 'Model Endpoint'], ['推理 API', 'Inference API'], 'allowed']]
    ],
    links: [[0, 1, 0.1, 'normal'], [1, 2, 0.92, 'allowed']]
  },
  {
    columns: [
      [[['应用入口', 'Application'], ['提交问题', 'Submit a question']]],
      [[['资料检索', 'Retrieval'], ['匹配相关资料', 'Find relevant text']]],
      [[['模型推理', 'Model Inference'], ['使用检索结果', 'Uses retrieved text']]],
      [[['应用结果', 'Application Output'], ['向调用方返回答案', 'Returns an answer'], 'allowed']]
    ],
    links: [[0, 1, 0.1, 'normal'], [1, 2, 0.88, 'normal'], [2, 3, 1.66, 'allowed']]
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

    if (step === 1) {
      const [template, control, workers, access] = positions;
      template.y = mobile ? 54 : 137;
      access.y = mobile ? 313 : control.y;
      const x = mobile ? 2 : 331;
      const y = mobile ? 131 : 16;
      const width = mobile ? 352 : 258;
      const height = mobile ? 122 : 221;
      draw(svg, 'rect', {x, y, width, height, rx: 6}, 'boundary');
      draw(svg, 'text', {x: x + width / 2, y: y + 24}, 'title', ['Kubernetes 集群', 'Kubernetes Cluster']);
      if (mobile) control.y = workers.y = 209;
    }
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
