(function () {
  const id = 'w-pause';
  const scenes = [
    ["活动文件系统与只读快照引用相同的数据块|The live filesystem and snapshot reference the same blocks", "references", [
      ["活动文件系统|Live filesystem",["当前视图|Live view"],"key",0,""],
      ["只读快照|Read-only snapshot",["固定的恢复点|Fixed recovery point"],"plain",1.35,""],
      ["共享数据块|Shared blocks",["两种视图的底层数据|Backing data for both views"],"plain",0,"ab"]
    ], [
      [0,1,"signal",0.4,"固定时间点|Capture point",0]
    ], "按文件系统生成恢复点|A recovery point is scoped to a filesystem"],
    ["数据和元数据写入对象存储，形成可恢复快照|File data and metadata establish a recoverable object snapshot", "pair", [
      ["只读快照|Read-only snapshot",["文件数据|File data","快照元数据|Snapshot metadata"],"key",0,"ab"],
      ["对象桶|Object bucket",[["正在保存|Saving snapshot",0,2.45],["快照已保存|Snapshot saved",2.45]],"plain",0,["ab",2.45]]
    ], [
      [0,1,"data",0.5,"数据|File data",-19],
      [0,1,"meta",1.55,"元数据|Metadata",25]
    ], "快照定位符引用桶中版本|The locator identifies the version in the bucket"],
    ["云主机停机后，对象桶保留快照|The object bucket retains the snapshot after shutdown", "chain", [
      ["应用|Application",[["文件 I/O|File I/O",0,1.4],["访问暂停|Access paused",1.4]],"plain",0,""],
      ["云上 WEKA 实例|WEKA instances",[["运行中|Running",0,1.4],["已停止|Stopped",1.4]],"off",0,""],
      ["对象桶|Object bucket",["保留已上传快照|Snapshot retained"],"key",0,"ab"]
    ], [
      [0,1,"idle",0,"",0],
      [0,1,"data",0.3,"",0,1.4]
    ], "桶中的恢复点独立于实例|The recovery point stays in the bucket"],
    ["目标 WEKA 集群从桶中的快照重建文件系统|A destination cluster recreates the filesystem from the object snapshot", "pair", [
      ["对象桶|Object bucket",["按定位符选择快照|Snapshot selected by locator"],"plain",0,"ab"],
      ["目标 WEKA 集群|Destination cluster",[["准备恢复|Preparing recovery",0,1.65],["文件系统已重建|Filesystem recreated",1.65]],"key",0,""]
    ], [
      [0,1,"data",0.75,"恢复|Restore",0]
    ], "目标集群提供运行环境|The destination supplies the runtime"],
    ["应用连接目标集群并访问所选恢复点|Applications reach the selected recovery point on the destination", "pair", [
      ["应用客户端|Application client",["连接目标集群|Connects to destination"],"plain",0,""],
      ["恢复后的文件系统|Filesystem",["选定时间点的文件|Files from selected point"],"key",0,"ab"]
    ], [
      [0,1,"signal",0.4,"读取请求|Read request",-21],
      [1,0,"data",1.45,"文件数据|File data",23]
    ], ""],
  ];
  const NS = 'http://www.w3.org/2000/svg';
  let serial = 0;
  const layouts = {
    references: [
      [[205, 95, 254], [695, 95, 254], [450, 223, 278]],
      [[180, 57, 248], [180, 175, 248], [180, 318, 248]]
    ],
    pair: [
      [[205, 151, 254], [695, 151, 254]],
      [[180, 96, 264], [180, 330, 264]]
    ],
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

      if (layout === 'references') {
        const [live, snap, blocks] = boxes;
        const paths = mobile
          ? [`M${live.x+live.w/2} ${live.y} H334 V${blocks.y} H${blocks.x+blocks.w/2}`,
             `M${snap.x} ${snap.y+snap.h/2} V${blocks.y-blocks.h/2}`]
          : [`M${live.x} ${live.y+live.h/2} V${blocks.y} H${blocks.x-blocks.w/2}`,
             `M${snap.x} ${snap.y+snap.h/2} V${blocks.y} H${blocks.x+blocks.w/2}`];
        for (const [i, d] of paths.entries()) {
          const path = add('path', {d, class: id + '-route ' + id + '-idle'});
          layers.push([path, cards[i][3], Infinity]);
        }
      }

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
