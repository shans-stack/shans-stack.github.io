(function () {
  'use strict';

  const id = 'f-kmgr';
  const scenes = [
    {
      columns: [
        [["期望状态","Desired State","版本、节点池、组件","Version, pools, add-ons"], ["实际状态","Observed State","当前配置和健康","Config and health"]],
        [["管理控制器","Controller","对照两种状态","Compare both states"]],
        [["集群控制平面","Control Plane","配置变更","Apply configuration","good"], ["GPU 节点池","GPU Node Pool","维护节点容量","Maintain node capacity","good"]]
      ],
      edges: [[0,2,0.1],[1,2,0.4],[2,3,1.4,"good"],[2,4,1.65,"good"]],
      note: ["配置变化后继续核对实际状态","Check observed state after applying changes"]
    },
    {
      columns: [
        [["待部署节点","New Nodes","尚未组成集群","Cluster absent"], ["已有集群","Existing Cluster","控制平面已运行","Already running"]],
        [["创建","Provision","部署控制平面与节点","Deploy cluster"], ["纳管","Import","建立授权连接","Authorized link"]],
        [["新受管集群","New Cluster","由平台创建","Platform provisioned","good"], ["原集群","Original Cluster","接入管理","Managed in place","good"]]
      ],
      edges: [[0,2,0.1],[1,3,0.35],[2,4,1.15,"good"],[3,5,1.4,"good"]],
      note: ["纳管权限决定可执行的操作","Granted access defines allowed operations"]
    },
    {
      columns: [
        [["配置基线","Baseline","期望组件与设置","Expected components"]],
        [["控制器","Controller","应用并核对","Apply and check"]],
        [["网络","Network","Pod 连通性","Pod network","good"], ["存储","Storage","卷接入","Volumes","good"], ["GPU","GPU","驱动与设备插件","Driver, plug-in","good"]]
      ],
      edges: [[0,1,0.1],[1,2,1.15,"good"],[1,3,1.4,"good"],[1,4,1.65,"good"]],
      note: ["集群各组件依同一基线对齐","Cluster components follow a common baseline"]
    },
    {
      columns: [
        [["新节点","New Node","待加入","Ready to join"], ["待移除节点","Leaving Node","停止新放置","Stop new placement","warn"]],
        [["注册与就绪","Register","检测节点状态","Check readiness"], ["排空节点","Drain","迁出可驱逐 Pod","Evict movable Pods","warn"]],
        [["容量加入","Capacity Added","可调度","Schedulable","good"], ["容量回收","Capacity Removed","节点退出","Node removed","off"]]
      ],
      edges: [[0,2,0.1],[1,3,0.35,"warn"],[2,4,1.2,"good"],[3,5,1.4,"warn"]],
      note: ["扩缩改变的是集群节点容量","Scaling changes cluster node capacity"]
    },
    {
      columns: [
        [["控制平面","Control Plane","先升级并检查","Upgrade and verify"]],
        [["节点批次","Worker Batch","排空后升级","Drain, then upgrade","warn"], ["其他节点","Other Workers","继续运行负载","Keep serving","off"]],
        [["通过验证","Verified","恢复该批调度","Resume placements","good"], ["其余批次","Later Batches","等待维护","Await maintenance","off"]]
      ],
      edges: [[0,1,0.12],[0,2,null,"off"],[1,3,1.3,"good"],[2,4,null,"off"]],
      note: ["健康确认后再推进下一批","Verify health before the next batch"]
    },
    {
      columns: [
        [["退出服务","Service Exit","迁出任务与数据","Migrate jobs and data"]],
        [["解除纳管","Disconnect","移除管理关系","Remove management"], ["资源退役","Deprovision","按归属回收","Reclaim resources"]],
        [["原集群保留","Cluster Remains","可另行管理","Managed elsewhere","good"], ["节点回收","Nodes Released","退出原集群","Leave this cluster","off"]]
      ],
      edges: [[0,1,0.15],[0,2,0.55],[1,3,1.4,"good"],[2,4,1.7]],
      note: ["管理关系和底层资源分别处理","Handle management and resources separately"]
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
