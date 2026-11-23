(function () {
  const scenes = [
    {
      label: ['物理基础设施、运营软件与 GPU 云服务', 'Physical infrastructure, operations software, and GPU cloud services'],
      nodes: [
        ['物理基础设施', 'Physical Infrastructure', '服务器 · 网络 · 存储', 'Servers · network · storage'],
        ['运营软件', 'Operations Software', '可按需集成的组件', 'Composable components'],
        ['GPU 云服务', 'GPU Cloud Services', '服务目录 · 租户交付', 'Catalog · tenant delivery']
      ],
      desktop: [[147, 178, 228], [460, 178, 228], [773, 178, 228]],
      mobile: [[180, 79, 244], [180, 203, 244], [180, 327, 244]],
      links: [[0, 1, 0], [1, 2, 880]]
    },
    {
      label: ['裸金属控制器上线物理节点，运行时配方定义集群的软件组合', 'The bare-metal controller provisions hosts, while runtime recipes define cluster software'],
      nodes: [
        ['裸金属控制器', 'Bare-Metal Controller'],
        ['物理节点', 'Physical Nodes', '发现与上线', 'Discovery & provisioning'],
        ['GPU 集群', 'GPU Cluster', '驱动与网络软件', 'Drivers & network software'],
        ['运行时配方', 'Runtime Recipe', '锁定软件版本', 'Pinned versions']
      ],
      desktop: [[136, 189, 232], [445, 189, 220], [762, 189, 238], [762, 59, 238]],
      mobile: [[180, 48, 250], [180, 145, 250], [180, 338, 250], [180, 241, 250]],
      links: [[0, 1, 0], [1, 2, 880, '', 'outer'], [3, 2, 1580]]
    },
    {
      label: ['故障检测触发隔离和修复，节点通过复测后恢复调度', 'Detection triggers quarantine and repair, then successful retesting restores scheduling'],
      nodes: [
        ['健康监测', 'Health Monitoring', '检测故障信号', 'Detects faults'],
        ['隔离与修复', 'Quarantine & Repair', '阻止接收新任务', 'Blocks new jobs', 'fault'],
        ['就绪复测', 'Readiness Retest', '记录测试结果', 'Records test results'],
        ['恢复调度', 'Scheduling Restored', '通过后重新接收任务', 'After tests pass', 'ready']
      ],
      desktop: [[116, 170, 192], [346, 170, 192], [575, 170, 192], [805, 170, 192]],
      mobile: [[180, 49, 248], [180, 141, 248], [180, 233, 248], [180, 325, 248]],
      links: [[0, 1, 0, 'fault'], [1, 2, 880], [2, 3, 1760, 'ready']],
      note: ['需启用故障处理与生命周期验证', 'Remediation and retesting enabled']
    },
    {
      label: ['任务由 GPU 调度器安排到节点，在线请求由推理路由分派给实例', 'GPU scheduling places jobs on nodes, and inference routing sends live requests to replicas'],
      nodes: [
        ['GPU 任务', 'GPU Job'], ['GPU 调度器', 'GPU Scheduler'], ['运行节点', 'Compute Node'],
        ['推理请求', 'Inference Request'], ['推理路由', 'Inference Routing'], ['推理实例', 'Serving Replica']
      ],
      desktop: [[149, 106, 218], [460, 106, 218], [771, 106, 218], [149, 250, 218], [460, 250, 218], [771, 250, 218]],
      mobile: [[88, 66, 158], [88, 199, 158], [88, 332, 158], [272, 66, 158], [272, 199, 158], [272, 332, 158]],
      links: [[0, 1, 0], [1, 2, 880], [3, 4, 240], [4, 5, 1120]]
    },
    {
      label: ['租户目录通过云控制平面接入裸金属、GPU 调度和推理服务', 'The tenant catalog uses the cloud control plane to offer bare metal, GPU scheduling, and inference'],
      nodes: [
        ['租户服务目录', 'Tenant Service Catalog'],
        ['云控制平面', 'Cloud Control Plane', '交付 · 治理 · 用量', 'Delivery · policy · usage'],
        ['裸金属', 'Bare Metal'],
        ['GPU 调度', 'GPU Scheduling'],
        ['推理服务', 'Model Serving']
      ],
      desktop: [[136, 178, 225], [445, 178, 232], [774, 70, 214], [774, 178, 214], [774, 286, 214]],
      mobile: [[180, 67, 264], [180, 182, 264], [60, 324, 106], [180, 324, 106], [300, 324, 106]],
      links: [[0, 1, 0], [1, 2, 880, '', 'branch'], [1, 3, 880], [1, 4, 880, '', 'branch']],
      oneService: true
    },
    {
      label: ['声明式目录模板由多集群控制平面部署到受管集群，GPU 任务在集群内调度', 'The control plane deploys a declarative catalog template across managed clusters, where GPU jobs are scheduled'],
      nodes: [
        ['目录模板', 'Catalog Template', '控制平面与依赖', 'Control plane & add-ons'],
        ['多集群控制平面', 'Multicluster Control Plane'],
        ['受管集群 A', 'Cluster A', '集群内 GPU 调度', 'GPU scheduling'],
        ['受管集群 B', 'Cluster B', '集群内 GPU 调度', 'GPU scheduling']
      ],
      desktop: [[138, 178, 235], [449, 178, 246], [776, 105, 222], [776, 251, 222]],
      mobile: [[180, 67, 266], [180, 181, 266], [90, 324, 162], [270, 324, 162]],
      links: [[0, 1, 0], [1, 2, 880, '', 'branch'], [1, 3, 1130, '', 'branch']]
    },
    {
      label: ['2026 年的组合公告、开源发布、开发者预览和公开预览记录', '2026 records of the portfolio announcement, open-source release, developer previews, and public previews'],
      releases: [
        ['2026-05-31', '运营软件组合', 'Operations Portfolio', '组合公告', 'Portfolio Announcement'],
        ['2026-10-13', 'GPU 编排平台', 'GPU Orchestration Platform', '开源发布', 'Open-Source Release'],
        ['2026-10-21', '运维组件', 'Operations Components', '开发者预览', 'Developer Preview'],
        ['2026-11-10', '托管集群组件', 'Managed Cluster Components', '公开预览', 'Public Preview']
      ]
    }
  ];

  function mount(host, { onLayout, paused = false } = {}) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'f-dsx-scene');
    svg.setAttribute('role', 'img');
    host.replaceChildren(svg);

    const narrow = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const ratio = () => narrow.matches ? 360 / 426 : 920 / 360;
    const tr = (zh, en) => window.SS_LANG === 'en' ? en : zh;
    const nodeHeight = 62;
    let step = 0;
    let frame = 0;
    let last = 0;
    let elapsed = 0;
    let tracks = [];
    let rows = [];

    function label(x, y, value, kind, anchor = 'middle') {
      return `<text x="${x}" y="${y}" class="f-dsx-${kind}" text-anchor="${anchor}">${value}</text>`;
    }

    function drawNode([x, y, width], [zh, en, detailZh, detailEn, tone = 'neutral']) {
      const detail = tr(detailZh, detailEn);
      const title = tr(zh, en);
      const split = narrow.matches && ['GPU Scheduling', 'Model Serving', 'Inference Request', 'Inference Routing'].includes(title);
      const [first, second] = split ? title.split(' ') : [title, ''];
      return `<g class="f-dsx-${tone}" data-node>
        <rect x="${x - width / 2}" y="${y - nodeHeight / 2}" width="${width}" height="${nodeHeight}" rx="5" class="f-dsx-node"/>
        ${label(x, y - (detail || second ? 9 : 0), first, 'title')}
        ${second ? label(x, y + 12, second, 'title') : ''}
        ${detail ? label(x, y + 13, detail, 'detail') : ''}
      </g>`;
    }

    function route(source, target, kind) {
      const [x, y, width] = source;
      const [tx, ty, tw] = target;
      const half = nodeHeight / 2;
      if (kind === 'outer' && narrow.matches) {
        const sx = x - width / 2;
        const ex = tx - tw / 2;
        return [`M${sx} ${y} H37 Q28 ${y} 28 ${y + 9} V${ty - 9} Q28 ${ty} 37 ${ty} H${ex}`, ex, ty, 0];
      }
      if (kind === 'branch') {
        if (narrow.matches) {
          const mid = (y + ty) / 2;
          const dir = Math.sign(tx - x);
          return [`M${x} ${y + half} V${mid - 8} Q${x} ${mid} ${x + dir * 8} ${mid} H${tx - dir * 8} Q${tx} ${mid} ${tx} ${mid + 8} V${ty - half}`, tx, ty - half, 90];
        }
        const mid = (x + width / 2 + tx - tw / 2) / 2;
        const dir = Math.sign(ty - y);
        return [`M${x + width / 2} ${y} H${mid - 8} Q${mid} ${y} ${mid} ${y + dir * 8} V${ty - dir * 8} Q${mid} ${ty} ${mid + 8} ${ty} H${tx - tw / 2}`, tx - tw / 2, ty, 0];
      }
      if (x === tx) {
        const dir = Math.sign(ty - y);
        return [`M${x} ${y + dir * half} V${ty - dir * half}`, tx, ty - dir * half, dir * 90];
      }
      return [`M${x + width / 2} ${y} H${tx - tw / 2}`, tx - tw / 2, ty, 0];
    }

    function drawRelease([date, zh, en, statusZh, statusEn], i) {
      const mobile = narrow.matches;
      const x = mobile ? 16 : 92;
      const y = (mobile ? 24 : 52) + i * (mobile ? 88 : 66);
      return `<g class="f-dsx-release">
        <rect x="${x}" y="${y}" width="${mobile ? 328 : 736}" height="${mobile ? 80 : 54}" rx="5" class="f-dsx-release-bg"/>
        ${label(x + 14, y + (mobile ? 16 : 27), date, 'detail', 'start')}
        ${label(x + (mobile ? 14 : 164), y + (mobile ? 40 : 27), tr(zh, en), 'title', 'start')}
        ${label(x + (mobile ? 14 : 526), y + (mobile ? 64 : 27), tr(statusZh, statusEn), 'detail', 'start')}
      </g>`;
    }

    function rebuild() {
      cancelAnimationFrame(frame);
      const mobile = narrow.matches;
      const [width, height] = mobile ? [360, 426] : [920, 360];
      const scene = scenes[step];
      const positions = mobile ? scene.mobile : scene.desktop;
      svg.dataset.step = step + 1;
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.setAttribute('aria-label', tr(...scene.label));
      const connectors = (scene.links || []).map(([from, to, , tone, kind]) => {
        const [d, x, y, angle] = route(positions[from], positions[to], kind);
        return `<g class="f-dsx-${tone || 'neutral'}">
          <path d="${d}" class="f-dsx-track"/>
          <path d="m-7 -4 7 4 -7 4" class="f-dsx-arrow" transform="translate(${x} ${y}) rotate(${angle})"/>
        </g>`;
      });
      svg.innerHTML = connectors.join('') + (scene.releases
        ? scene.releases.map(drawRelease).join('')
        : scene.nodes.map((node, i) => drawNode(positions[i], node)).join('')) +
        (scene.links || []).map(([, , , tone]) => `<rect width="9" height="9" x="-4.5" y="-4.5" rx="2" class="f-dsx-marker f-dsx-${tone || 'neutral'}" visibility="hidden"/>`).join('') +
        (scene.note ? label(width / 2, height - 44, tr(...scene.note), 'detail') : '') +
        label(width / 2, height - 19, tr('示意，不代表实测数字', 'Schematic, no measured figures'), 'note');
      const paths = svg.querySelectorAll('.f-dsx-track');
      tracks = Array.from(svg.querySelectorAll('.f-dsx-marker'), (marker, i) => ({
        marker, path: paths[i], length: paths[i].getTotalLength(), start: scene.links[i][2]
      }));
      rows = Array.from(svg.querySelectorAll('.f-dsx-release-bg'));
      if (onLayout) onLayout(ratio(), mobile);
      play();
    }

    function tick(now) {
      elapsed += Math.min(80, Math.max(0, now - last));
      last = now;
      const time = elapsed % 3400;
      const service = Math.floor(elapsed / 3400) % 3 + 1;
      for (const [i, { marker, path, length, start }] of tracks.entries()) {
        const progress = (time - start) / 790;
        const selected = !scenes[step].oneService || i === 0 || i === service;
        const visible = selected && progress > 0 && progress < 1;
        marker.setAttribute('visibility', visible ? 'visible' : 'hidden');
        if (visible) {
          const { x, y } = path.getPointAtLength(progress * length);
          marker.setAttribute('transform', `translate(${x} ${y})`);
          marker.style.opacity = Math.min(1, progress * 9, (1 - progress) * 9);
        }
      }
      rows.forEach((row, i) => row.classList.toggle('f-dsx-current', i === Math.floor(time / 850)));
      frame = requestAnimationFrame(tick);
    }

    function play() {
      cancelAnimationFrame(frame);
      if (paused || reduced.matches) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }

    narrow.addEventListener('change', rebuild);
    reduced.addEventListener('change', rebuild);
    document.addEventListener('ss-lang', rebuild);
    const controller = {
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
        if (!paused) return;
        paused = false;
        play();
      },
      destroy() {
        controller.pause();
        narrow.removeEventListener('change', rebuild);
        reduced.removeEventListener('change', rebuild);
        document.removeEventListener('ss-lang', rebuild);
        svg.remove();
        delete host.__anim;
      },
      ratio,
      step: () => step
    };
    host.__anim = controller;
    rebuild();
    return controller;
  }

  (window.SSAnim ||= {})['f-dsx'] = { steps: scenes.length, mount };
})();
