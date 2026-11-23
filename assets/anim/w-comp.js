(function () {
  const id = 'w-comp';
  const scenes = [
    ["一个 Operator 管理两个独立 WekaCluster|One Operator manages two separate WekaCluster resources", "fork", [
      ["Operator",["部署与生命周期|Deployment and lifecycle"],"key",0,""],
      ["租户 A|Tenant A",["WekaCluster A"],"a",1.3,""],
      ["租户 B|Tenant B",["WekaCluster B"],"b",1.7,""]
    ], [
      [0,1,"signal",0.4,"",-17],
      [0,2,"signal",0.8,"",17]
    ], "每个租户单独配置|Each tenant has its own configuration"],
    ["两个集群各用专用资源|Each cluster gets a dedicated resource set", "lanes", [
      ["WekaCluster A",["租户 A|Tenant A"],"a",0,""],
      ["专用资源 A|Resources A",["主机、NVMe|Hosts, NVMe","CPU 核、内存|CPU cores, RAM"],"a",0,""],
      ["WekaCluster B",["租户 B|Tenant B"],"b",0,""],
      ["专用资源 B|Resources B",["主机、NVMe|Hosts, NVMe","CPU 核、内存|CPU cores, RAM"],"b",0,""]
    ], [
      [0,1,"data",0.5,"",0],
      [2,3,"b",0.5,"",0]
    ], "专用资源布局|Dedicated resource layout"],
    ["不同容量单元来自同一块物理 NVMe 盘|Separate allocations come from the same physical NVMe drive", "fork", [
      ["SSD Proxy",["同一物理 NVMe 盘|One physical NVMe drive","划分容量单元|Capacity is partitioned"],"key",0,"ab"],
      ["WekaCluster A",[["分配单元 A|Allocation A",1.3]],"a",0,""],
      ["WekaCluster B",[["分配单元 B|Allocation B",1.3]],"b",0,""]
    ], [
      [0,1,"data",0.4,"",-18],
      [0,2,"b",0.4,"",18]
    ], "共享盘布局|Shared-drive layout"],
    ["租户配置分别作用于对应集群|Each tenant configuration applies to its own cluster", "lanes", [
      ["租户配置 A|Tenant A Settings",["容量、协议|Capacity, protocols","网络接口|Network interfaces"],"a",0,""],
      ["WekaCluster A",["租户 A 的服务|Tenant A services"],"a",0,""],
      ["租户配置 B|Tenant B Settings",["容量、协议|Capacity, protocols","网络接口|Network interfaces"],"b",0,""],
      ["WekaCluster B",["租户 B 的服务|Tenant B services"],"b",0,""]
    ], [
      [0,1,"signal",0.4,"",0],
      [2,3,"signal",0.4,"",0]
    ], "物理盘登记策略可共用|Drive registration policy can be shared"],
    ["扩展只指向租户 A 的集群资源|Expansion targets the Tenant A cluster resource", "lanes", [
      ["配置 A|Settings A",["容量变更|Capacity change"],"a",0,""],
      ["WekaCluster A",[["当前分配|Current allocation",0,1.5],["更新分配|Updated allocation",1.5]],"a",0,""],
      ["配置 B|Settings B",["保持原配置|Settings retained"],"b",0,""],
      ["WekaCluster B",["保持原分配|Allocation retained"],"b",0,""]
    ], [
      [0,1,"data",0.6,"",0],
      [2,3,"idle",0,"",0]
    ], "运维操作以 WekaCluster 为边界|Lifecycle operations target a WekaCluster"],
  ];
  const NS = 'http://www.w3.org/2000/svg';
  let serial = 0;
  const layouts = {
    fork: [
      [[207, 151, 244], [688, 75, 248], [688, 219, 248]],
      [[180, 96, 248], [92, 326, 164], [268, 326, 164]]
    ],
    lanes: [
      [[209, 79, 250], [691, 79, 250], [209, 217, 250], [691, 217, 250]],
      [[92, 105, 164], [92, 320, 164], [268, 105, 164], [268, 320, 164]]
    ]
  };

  function mount(host, {onLayout, paused = false} = {}) {
    const narrow = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const arrow = id + '-arrow-' + ++serial;
    const svg = document.createElementNS(NS, 'svg');
    svg.classList.add(id + '-scene');
    svg.setAttribute('role', 'img');
    host.replaceChildren(svg);
    let index = 0, ratio, frame, last, elapsed, packets, layers;

    function add(tag, attrs, parent = svg) {
      const node = document.createElementNS(NS, tag);
      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
      return parent.appendChild(node);
    }

    function build() {
      const mobile = Number(narrow.matches);
      const language = window.SS_LANG === 'en' ? 1 : 0;
      const t = text => typeof text === 'string' ? text.split('|')[language] ?? text : '';
      const [caption, layout, cards, routes, annotation] = scenes[index];
      const [width, height] = mobile ? [360, 435] : [900, 319];
      ratio = width / height;
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      svg.setAttribute('aria-label', t(caption));
      svg.replaceChildren();
      packets = [];
      layers = [];

      function label(parent, x, y, value, style, anchor = 'start') {
        const text = add('text', {x, y, class: style, 'text-anchor': anchor}, parent);
        text.textContent = t(value);
      }

      const defs = add('defs', {});
      const marker = add('marker', {id: arrow, viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 6, markerHeight: 6, orient: 'auto'}, defs);
      add('path', {d: 'M1 1 L7 4 L1 7', fill: 'none', stroke: 'context-stroke', 'stroke-width': 1.3}, marker);
      const boxes = cards.map(([title, rows], i) => {
        const [x, y, w] = layouts[layout][mobile][i];
        return {x, y, w, h: rows.length < 2 ? 67 : 91};
      });

      routes.forEach(([from, to, type, start, name, offset = 0, until = Infinity]) => {
        const a = boxes[from], b = boxes[to];
        const sign = Math.sign(mobile ? b.y - a.y : b.x - a.x);
        const a1 = (mobile ? a.y + sign * a.h / 2 : a.x + sign * a.w / 2) + sign * 4;
        const b1 = (mobile ? b.y - sign * b.h / 2 : b.x - sign * b.w / 2) - sign * 5;
        const a2 = (mobile ? a.x : a.y) + offset;
        const b2 = (mobile ? b.x : b.y) + offset;
        const mid = (a1 + b1) / 2;
        const point = (along, across) => mobile ? across + ' ' + along : along + ' ' + across;
        const d = 'M' + [point(a1, a2), point(mid, a2), point(mid, b2), point(b1, b2)].join(' L');
        const path = add('path', {d, class: id + '-route ' + id + '-' + type, 'marker-end': 'url(#' + arrow + ')'});
        layers.push([path, 0, until]);
        if (name) {
          const offsetLabel = mobile && offset < 0;
          const x = mobile ? a2 + (offsetLabel ? -11 : 11) : mid;
          const y = mobile ? mid : a2 - 14;
          label(svg, x, y, name, id + '-route-label', mobile ? (offsetLabel ? 'end' : 'start') : 'middle');
        }
        if (type === 'idle') return;
        const packet = type === 'signal'
          ? add('circle', {r: 4.5, class: id + '-packet ' + id + '-signal'})
          : add('rect', {x: -6, y: -5, width: 12, height: 10, rx: 2, class: id + '-packet ' + id + '-' + type});
        packets.push({path, packet, length: path.getTotalLength(), start});
      });

      cards.forEach(([title, rows, tone = 'plain', visible = 0, marks = ''], i) => {
        const {x, y, w, h} = boxes[i], left = x - w / 2, top = y - h / 2;
        const group = add('g', {class: id + '-' + tone});
        if (visible) layers.push([group, visible, Infinity]);
        add('rect', {x: left, y: top, width: w, height: h, rx: 4, class: id + '-card'}, group);
        label(group, left + 13, top + 20, title, id + '-title');
        rows.forEach((entry, n) => {
          const [value, after, until = Infinity] = typeof entry === 'string' ? [entry, 0] : entry;
          const row = add('g', {}, group);
          label(row, left + 13, top + 45 + 22 * n, value, id + '-row');
          if (after || until !== Infinity) layers.push([row, after, until]);
        });
        const [blocks, arrival] = typeof marks === 'string' ? [marks, 0] : marks;
        Array.from(blocks).forEach((mark, n) => {
          const block = add('rect', {x: left + w - 14 - 15 * (blocks.length - n), y: top + 15, width: 11, height: 9, rx: 1.5,
            class: id + '-mark ' + id + '-' + mark}, group);
          if (arrival) layers.push([block, arrival, Infinity]);
        });
      });
      if (annotation) label(svg, width / 2, height - 35, annotation, id + '-annotation', 'middle');
      label(svg, width / 2, height - 15, '示意，不代表实测数字|Illustrative. No measured values.', id + '-note', 'middle');
      onLayout?.(ratio, Boolean(mobile));
    }

    function draw(time) {
      const end = reduced.matches;
      for (const [layer, begin, finish] of layers) {
        layer.style.opacity = end ? Number(finish === Infinity) : (begin ? Math.min(1, Math.max(0, (time - begin) / .26)) : 1) *
          Math.min(1, Math.max(0, (finish - time) / .26));
      }
      for (const {path, packet, length, start} of packets) {
        const progress = (time - start) / .9;
        const show = !end && progress >= 0 && progress <= 1;
        packet.style.opacity = show ? 1 : 0;
        if (show) {
          const {x, y} = path.getPointAtLength(length * progress);
          packet.setAttribute('transform', 'translate(' + x + ' ' + y + ')');
        }
      }
    }

    function tick(now) {
      elapsed += Math.max(0, (now - last) / 1000);
      last = now;
      const time = elapsed % 6;
      svg.style.opacity = Math.min(1, (6 - time) / .3, .55 + time / .3);
      draw(time);
      frame = requestAnimationFrame(tick);
    }

    function stop() { cancelAnimationFrame(frame); }
    function restart() {
      stop();
      build();
      elapsed = 0;
      svg.style.opacity = 1;
      draw(0);
      if (!paused && !reduced.matches) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    }

    narrow.addEventListener('change', restart);
    reduced.addEventListener('change', restart);
    document.addEventListener('ss-lang', restart);
    restart();
    const controller = {
      show(i) { index = Math.max(0, Math.min(scenes.length - 1, i)); restart(); },
      pause() { paused = true; stop(); },
      resume() {
        if (!paused) return;
        paused = false;
        if (!reduced.matches) {
          last = performance.now();
          frame = requestAnimationFrame(tick);
        }
      },
      destroy() {
        stop();
        narrow.removeEventListener('change', restart);
        reduced.removeEventListener('change', restart);
        document.removeEventListener('ss-lang', restart);
        svg.remove();
        if (host.__anim === controller) delete host.__anim;
      },
      ratio() { return ratio; },
      step() { return index; }
    };
    host.__anim = controller;
    return controller;
  }

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = {steps: 5, mount};
})();
