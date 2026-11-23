(function () {
  const tenantA = ['租户 A', 'Tenant A'];
  const tenantB = ['租户 B', 'Tenant B'];
  const clients = ['客户端', 'Clients'];
  const fileSystem = ['文件系统', 'File System'];
  const nodemap = ['服务端 Nodemap', 'Server Nodemap'];
  const tree = ['租户目录树', 'Tenant Tree'];
  const pathA = ['/tenant-a', '/tenant-a'];
  const pathB = ['/tenant-b', '/tenant-b'];
  const schematic = ['示意，不代表实测数字', 'Schematic, not measured'];

  const scenes = [
    {
      headings: [clients, fileSystem, tree],
      columns: [
        [[tenantA, ['客户端组 A', 'Client group A']], [tenantB, ['客户端组 B', 'Client group B']]],
        [[['共享文件系统', 'Shared file system'], ['共用存储服务', 'Shared storage']]],
        [[pathA, tenantA], [pathB, tenantB]]
      ],
      finish: ['structure', 'structure']
    },
    {
      headings: [clients, ['匹配', 'Matching'], nodemap],
      columns: [
        [[tenantA, ['NID 范围 A', 'NID range A']], [tenantB, ['NID 范围 B', 'NID range B']]],
        [[['匹配客户端 NID', 'Match client NID']]],
        [[['Nodemap A', 'Nodemap A'], ['策略组 A', 'Policy group A']],
         [['Nodemap B', 'Nodemap B'], ['策略组 B', 'Policy group B']]]
      ],
      note: ['归组依赖可信的客户端 NID', 'Grouping requires trustworthy client NIDs']
    },
    {
      headings: [clients, ['挂载边界', 'Mount Boundary'], ['请求结果', 'Result']],
      columns: [
        [[tenantA, ['挂载文件系统', 'Mount file system']], [tenantA, ['访问 B 的目录', 'Access B’s tree']]],
        [[['服务端挂载策略', 'Mount policy'], ['Fileset /tenant-a', 'Fileset /tenant-a']]],
        [[pathA, ['对应客户端根目录 /', 'Client mount root /']], [pathB, ['不在挂载范围', 'Outside scope']]]
      ],
      finish: ['allow', 'stop'],
      note: ['单一主 Fileset 示例', 'Example with one primary fileset']
    },
    {
      headings: [clients, nodemap, ['映射结果', 'Mapped Identity']],
      columns: [
        [[tenantA, ['UID 1000', 'UID 1000']], [tenantB, ['UID 1000', 'UID 1000']]],
        [[['Nodemap A', 'Nodemap A']], [['Nodemap B', 'Nodemap B']]],
        [[['UID 11000', 'UID 11000'], fileSystem], [['UID 21000', 'UID 21000'], fileSystem]]
      ],
      note: ['Root squash 可限制客户端 root 的权限', 'Root squash can restrict client root privileges']
    },
    {
      headings: [['写入请求', 'Writes'], ['配额检查', 'Quota Check'], ['分配结果', 'Allocation']],
      columns: [
        [[tenantA, ['新增分配', 'New allocation']], [tenantB, ['新增分配', 'New allocation']]],
        [[['项目 A', 'Project A'], ['已达硬配额', 'Hard limit reached']],
         [['项目 B', 'Project B'], ['配额仍有余量', 'Below quota']]],
        [[['拒绝新增分配', 'Allocation denied']], [['允许新增分配', 'Allocation allowed']]]
      ],
      finish: ['stop', 'allow'],
      note: ['配额分别计量数据块和 inode', 'Quotas account for blocks and inodes']
    },
    {
      headings: [['Kubernetes 节点', 'Kubernetes Nodes'], nodemap, tree],
      columns: [
        [[['CSI 控制器', 'CSI controller'], ['卷管理挂载', 'Admin mount']],
         [['工作节点', 'Worker node'], ['应用卷挂载', 'App volume mount']]],
        [[['Nodemap A', 'Nodemap A'], ['同一租户策略', 'Same tenant policy']]],
        [[pathA, tenantA]]
      ]
    }
  ];

  function mount(host, {onLayout, paused = false} = {}) {
    const compact = matchMedia('(max-width: 640px)');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'd-mt-scene');
    svg.setAttribute('role', 'img');
    host.replaceChildren(svg);

    let index = 0;
    let ratio, frame, last, elapsed, flows;

    function draw() {
      cancelAnimationFrame(frame);
      const mobile = compact.matches;
      const width = mobile ? 400 : 840;
      const height = mobile ? 295 : 294;
      const boxWidth = mobile ? 172 : 214;
      const boxHeight = mobile ? 60 : 66;
      const x = mobile ? [102, 298] : [152, 420, 688];
      const y = mobile ? [38, 120, 202] : [95, 199];
      const scene = scenes[index];
      const lang = window.SS_LANG === 'en' ? 1 : 0;
      const label = pair => pair[lang];
      const positions = scene.columns.map((column, tier) => column.map((_, lane) => {
        const single = column.length === 1;
        return mobile
          ? {x: single ? 200 : x[lane], y: y[tier], single}
          : {x: x[tier], y: single ? 147 : y[lane], single};
      }));

      ratio = width / height;
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.setAttribute('aria-label', scene.columns.map((column, tier) =>
        `${label(scene.headings[tier])}. ${column.map(lines => lines.map(label).join(', ')).join('. ')}`
      ).concat(scene.note ? [label(scene.note)] : [], label(schematic)).join('. '));
      svg.replaceChildren();

      function element(tag, attrs, value) {
        const node = document.createElementNS(svg.namespaceURI, tag);
        Object.entries(attrs).forEach(([key, val]) => node.setAttribute(key, val));
        if (value) node.textContent = value;
        svg.appendChild(node);
        return node;
      }

      function wire(from, to, lane, type) {
        const offset = lane === 0 ? -15 : 15;
        const shift = box => box.single ? offset : 0;
        let d;
        if (mobile) {
          const a = from.x + shift(from), b = to.x + shift(to);
          const start = from.y + boxHeight / 2, end = to.y - boxHeight / 2;
          const mid = (start + end) / 2;
          d = `M${a} ${start} V${mid} H${b} V${end}`;
        } else {
          const a = from.y + shift(from), b = to.y + shift(to);
          const start = from.x + boxWidth / 2, end = to.x - boxWidth / 2;
          const mid = (start + end) / 2;
          d = `M${start} ${a} H${mid} V${b} H${end}`;
        }
        return element('path', {d, class: 'd-mt-wire', 'data-type': type});
      }

      flows = [0, 1].map(lane => {
        const [client, policy, result] = positions.map(column => column[lane] || column[0]);
        const finish = scene.finish?.[lane] || '';
        const incoming = wire(client, policy, lane, '');
        const outgoing = wire(policy, result, lane, finish);
        return {
          finish,
          routes: (finish === 'stop' || finish === 'structure' ? [incoming] : [incoming, outgoing])
            .map(path => ({path, length: path.getTotalLength()}))
        };
      });

      scene.columns.forEach((column, tier) => {
        if (!mobile) {
          element('text', {x: x[tier], y: 30, class: 'd-mt-heading'}, label(scene.headings[tier]));
        }
        column.forEach((lines, lane) => {
          const center = positions[tier][lane];
          const type = tier === 2 ? scene.finish?.[lane] || '' : '';
          element('rect', {
            x: center.x - boxWidth / 2, y: center.y - boxHeight / 2, width: boxWidth, height: boxHeight,
            rx: 4, class: 'd-mt-node', 'data-type': type
          });
          lines.forEach((line, i) => {
            const offset = lines.length === 1 ? 6 : i === 0 ? -3 : 20;
            element('text', {
              x: center.x, y: center.y + offset, class: i === 0 ? 'd-mt-label' : 'd-mt-detail'
            }, label(line));
          });
        });
      });

      if (scene.note) {
        element('text', {x: width / 2, y: mobile ? 256 : 255, class: 'd-mt-detail d-mt-note'}, label(scene.note));
      }
      element('text', {x: width / 2, y: mobile ? 281 : 280, class: 'd-mt-caption'}, label(schematic));
      if (!motion.matches) {
        flows.forEach(flow => {
          flow.packet = element('rect', {
            width: 14, height: 10, rx: 2, class: 'd-mt-packet', 'data-type': flow.finish, opacity: 0
          });
        });
      }
      elapsed = 0;
      onLayout?.(ratio, mobile);
      run();
    }

    function tick(now) {
      elapsed += Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      flows.forEach(({packet, routes}, lane) => {
        const time = elapsed % 4.8 - 0.25 - lane * 0.16;
        const duration = 1.1;
        const offset = time % 1.3;
        const leg = routes[Math.floor(time / 1.3)];
        if (!leg || offset > duration) {
          packet.setAttribute('opacity', 0);
          return;
        }
        const point = leg.path.getPointAtLength(leg.length * offset / duration);
        packet.setAttribute('x', point.x - 7);
        packet.setAttribute('y', point.y - 5);
        packet.setAttribute('opacity', Math.min(1, offset * 8, (duration - offset) * 8));
      });
      frame = requestAnimationFrame(tick);
    }

    function run() {
      if (paused || motion.matches) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }

    const ctrl = {
      show(i) {
        index = Math.max(0, Math.min(scenes.length - 1, i));
        draw();
      },
      pause() { paused = true; cancelAnimationFrame(frame); },
      resume() { if (paused) { paused = false; run(); } },
      destroy() {
        ctrl.pause();
        compact.removeEventListener('change', draw);
        motion.removeEventListener('change', draw);
        document.removeEventListener('ss-lang', draw);
        svg.remove();
        delete host.__anim;
      },
      ratio() { return ratio; },
      step() { return index; }
    };
    host.__anim = ctrl;
    compact.addEventListener('change', draw);
    motion.addEventListener('change', draw);
    document.addEventListener('ss-lang', draw);
    draw();
    return ctrl;
  }

  window.SSAnim ||= {};
  window.SSAnim['d-mt'] = {steps: 6, mount};
})();
