(function () {
  const id = 'w-cloud';
  const scenes = [
    ["客户端经云网络访问由云主机和本地盘组成的集群|A client reaches a cluster of cloud hosts and local drives over the cloud network", "chain", [
      ["应用客户端|Application client",["文件 I/O|File I/O"],"plain",0,""],
      ["云上 WEKA 集群|Cloud WEKA cluster",["后端运行在云主机|Backends on cloud hosts"],"key",0,""],
      ["本地 SSD|Local SSDs",["文件系统闪存层|Filesystem flash tier"],"plain",0,"aa"]
    ], [
      [0,1,"signal",0.45,"",0],
      [1,2,"data",1.4,"",0]
    ], "后端经云网络互联|Backends use the cloud network"],
    ["写入先到 SSD，后台复制到对象桶后可释放 SSD 副本|Writes land on SSD, and the SSD copy can be released after upload", "chain", [
      ["应用|Application",["写文件|File write"],"plain",0,""],
      ["SSD 层|SSD tier",[["写入完成|Write complete",1.3,3.45],["缓存可释放|Cache can be released",3.45]],"key",0,""],
      ["对象桶|Object bucket",[["对象副本已保存|Object copy saved",3.1]],"a",0,""]
    ], [
      [0,1,"data",0.4,"",0],
      [1,2,"data",2.2,"",0]
    ], "应用仍使用同一个文件路径|Applications keep the same file path"],
    ["Terraform 配置在 Google Cloud 创建资源和 WEKA 集群|Terraform config provisions resources and forms a WEKA cluster on Google Cloud", "chain", [
      ["Terraform 配置|Terraform config",["网络和实例需求|Network and VM settings"],"plain",0,""],
      ["Google Cloud",["网络、子网、实例|Network, subnets, VMs"],"plain",1.35,""],
      ["WEKA 集群|WEKA cluster",["安装软件并组建集群|Install and configure"],"key",2.3,""]
    ], [
      [0,1,"signal",0.45,"",0],
      [1,2,"signal",1.4,"",0]
    ], "Google Cloud 部署示例|Google Cloud deployment example"],
    ["OCI 裸金属部署先准备网络与主机，再完成集群和客户端接入|OCI prepares networking and hosts before forming a cluster and attaching clients", "chain", [
      ["OCI 基础设施|OCI infrastructure",["虚拟云网络|Virtual cloud network","裸金属实例|Bare-metal instances"],"plain",0,""],
      ["WEKA 后端|WEKA backend",["安装软件、配置集群|Install and configure"],"key",1.35,""],
      ["客户端|Clients",["连接文件系统|Filesystem access"],"plain",2.3,""]
    ], [
      [0,1,"signal",0.45,"",0],
      [1,2,"signal",1.4,"",0]
    ], ""],
    ["对象桶保留快照，兼容目标集群可恢复|The object bucket retains a snapshot for recovery on a compatible cluster", "chain", [
      ["源 WEKA 集群|Source cluster",["文件系统快照|Filesystem snapshot"],"key",0,"ab"],
      ["对象桶|Object bucket",[["保留恢复点|Recovery point retained",1.4]],"plain",0,["ab",1.4]],
      ["目标集群|Destination cluster",[["从快照重建|Recreated from snapshot",2.8]],"plain",0,""]
    ], [
      [0,1,"data",0.5,"",0],
      [1,2,"data",1.9,"",0]
    ], "Snap-to-Object"],
  ];
  const NS = 'http://www.w3.org/2000/svg';
  let serial = 0;
  const layouts = {
    chain: [
      [[126, 151, 222], [450, 151, 222], [774, 151, 222]],
      [[180, 63, 258], [180, 202, 258], [180, 340, 258]]
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
