(function () {
  const id = 'w-op';
  const scenes = [
    ["Operator 对照声明与实际状态|Operator reconciles desired and running state", "chain", [
      ["自定义资源|Custom resource",["声明的配置|Desired configuration"],"plain",0,""],
      ["Operator",["对照状态并调谐|Check and reconcile"],"key",0,""],
      ["后端状态|Backend state",[["待创建|Pending",0,2.4],["组件已创建|Components created",2.4]],"plain",0,""]
    ], [
      [0,1,"signal",0.35,"",0],
      [1,2,"signal",1.5,"",0]
    ], "Kubernetes 控制路径|Kubernetes control path"],
    ["WekaCluster 形成后端组件|WekaCluster produces backend components", "fork", [
      ["WekaCluster",["声明资源及节点|Resources and nodes"],"key",0,""],
      ["计算组件|Compute",["存储处理|Storage logic","计算 Pod|Compute Pod"],"plain",1.3,""],
      ["驱动器组件|Drives",["管理本地盘|Drive management","驱动器 Pod|Drive Pod"],"plain",1.65,""]
    ], [
      [0,1,"signal",0.4,"",-19],
      [0,2,"signal",0.75,"",19]
    ], "Operator 创建 WekaContainer，再创建 Pod|The Operator creates a WekaContainer, then a Pod"],
    ["应用经节点上的客户端连接外部后端|An application uses a node-local client to reach an external backend", "chain", [
      ["应用 Pod|Application Pod",["Kubernetes 工作节点|Kubernetes worker"],"plain",0,""],
      ["WEKA 客户端|WEKA Client",["节点上运行的 Pod|Node-local Pod"],"key",0,""],
      ["存储后端|Storage backend",["位于 Kubernetes 之外|Outside Kubernetes"],"plain",0,"a"]
    ], [
      [0,1,"data",0.4,"",0],
      [1,2,"data",1.35,"",0]
    ], "示例：仅客户端部署|Client-only deployment example"],
    ["CSI 处理配卷，WEKA 客户端传输文件数据|CSI provisions volumes and the WEKA client carries file I/O", "lanes", [
      ["持久卷声明|Volume claim",["配卷请求|Provisioning request"],"plain",0,""],
      ["CSI 插件|CSI plugin",["按 StorageClass 配卷|Uses StorageClass"],"b",0,""],
      ["已挂载的卷|Mounted volume",["应用文件 I/O|Application file I/O"],"plain",0,""],
      ["存储数据路径|Storage data path",["WEKA 客户端|WEKA client","连接存储后端|To storage backend"],"key",0,""]
    ], [
      [0,1,"signal",0.4,"",0],
      [2,3,"data",1.85,"",0]
    ], ""],
    ["保留 WekaContainer 资源，替换结束的 Pod|Retain the WekaContainer resource and replace the terminated Pod", "fork", [
      ["WekaContainer",["保留资源身份|Resource identity retained"],"key",0,""],
      ["原 Pod|Original Pod",["已结束|Terminated"],"off",0,""],
      ["替换 Pod|Replacement Pod",["运行中|Running"],"key",1.7,""]
    ], [
      [0,1,"idle",0,"",-17],
      [0,2,"signal",0.8,"",17]
    ], "所需组件运行后，集群进入 Ready|Required components must run for Ready"],
  ];
  const NS = 'http://www.w3.org/2000/svg';
  let serial = 0;
  const layouts = {
    chain: [
      [[126, 151, 222], [450, 151, 222], [774, 151, 222]],
      [[180, 63, 258], [180, 202, 258], [180, 340, 258]]
    ],
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
