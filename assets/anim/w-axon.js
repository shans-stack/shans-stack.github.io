(function () {
  const id = 'w-axon';
  const scenes = [
    ["GPU 作业和 Axon 存储服务共用物理服务器|GPU jobs and Axon storage services share a physical server", "chain", [
      ["GPU 作业|GPU jobs",["GPU 执行计算|Application compute"],"plain",0,""],
      ["Axon 服务|Axon services",["主机 CPU、内存、网络|Host CPU, RAM, network"],"key",0,""],
      ["本地 NVMe|Local NVMe",["服务器自带 SSD|Server-attached SSDs"],"plain",0,"aa"]
    ], [
      [0,1,"signal",0.35,"",0],
      [1,2,"data",1.3,"",0]
    ], "节点视图：GPU 服务器|Node view: one GPU server"],
    ["前端、计算、驱动器分别参与存储处理|Frontend, compute, and drive containers participate in storage processing", "four", [
      ["应用|Application",["文件操作|File operation"],"plain",0,""],
      ["前端|Frontend",["接入客户端|Client access"],"key",0,""],
      ["计算|Compute",["存储处理|Storage operations"],"plain",0,""],
      ["驱动器|Drives",["本地盘管理|Manages local SSDs"],"plain",0,"a"]
    ], [
      [0,1,"signal",0.4,"",0],
      [1,2,"signal",1.35,"",0],
      [2,3,"data",2.3,"",0]
    ], ""],
    ["节点 A 的客户端跨网络读取节点 B 后端的数据|The client on node A reads from the backend on node B across the network", "pair", [
      ["GPU 节点 A|GPU node A",["本机客户端|Node-local client"],"plain",0,""],
      ["GPU 节点 B|GPU node B",["后端服务 · 本地盘|Backend · local SSD"],"plain",0,"a"]
    ], [
      [0,1,"signal",0.4,"跨节点请求|Remote Request",-24],
      [1,0,"data",1.65,"数据返回|Data Return",24]
    ], "共享路径 /datasets/input|Shared path /datasets/input"],
    ["同一条带的块分布在不同故障域|Fragments of one stripe go to different failure domains", "fork", [
      ["纠删码条带|EC stripe",["数据块和校验块|Data and parity fragments"],"key",0,"ap"],
      ["故障域 A|Failure domain A",[["一块数据|Data fragment",1.3]],"a",0,""],
      ["故障域 B|Failure domain B",[["一块校验|Parity fragment",1.4]],"b",0,""]
    ], [
      [0,1,"data",0.4,"",-18],
      [0,2,"parity",0.5,"",18]
    ], "只画出该条带的部分故障域|Only part of the stripe is shown"],
    ["两条管理路径均在 GPU 服务器上部署 Axon|Both management paths deploy Axon on GPU servers", "join", [
      ["Kubernetes",["Operator 管理|Operator-managed"],"plain",0,""],
      ["Slurm",["直接安装|Direct installation"],"plain",0,""],
      ["GPU 服务器|GPU servers",["GPU 作业和 Axon 服务|GPU jobs and Axon services"],"key",1.6,""]
    ], [
      [0,2,"signal",0.4,"",-18],
      [1,2,"signal",0.7,"",18]
    ], "两种部署路径|Two deployment workflows"],
  ];
  const NS = 'http://www.w3.org/2000/svg';
  let serial = 0;
  const layouts = {
    pair: [
      [[205, 151, 254], [695, 151, 254]],
      [[180, 96, 264], [180, 330, 264]]
    ],
    chain: [
      [[126, 151, 222], [450, 151, 222], [774, 151, 222]],
      [[180, 63, 258], [180, 202, 258], [180, 340, 258]]
    ],
    four: [
      [[103, 151, 190], [334, 151, 190], [565, 151, 190], [796, 151, 190]],
      [[180, 59, 258], [180, 163, 258], [180, 267, 258], [180, 371, 258]]
    ],
    fork: [
      [[207, 151, 244], [688, 75, 248], [688, 219, 248]],
      [[180, 96, 248], [92, 326, 164], [268, 326, 164]]
    ],
    join: [
      [[207, 75, 248], [207, 219, 248], [688, 151, 244]],
      [[92, 103, 164], [268, 103, 164], [180, 326, 248]]
    ],
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
