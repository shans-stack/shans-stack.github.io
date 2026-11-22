/* Topic animation. The page owns navigation and calls show() with a zero-based step. */
(function () {
  const EN = {
    "示意，不代表实测数字": "Schematic, not measured",
    "主机通道适配器经交换机连接": "Host channel adapters connect through a switch",
    "IB 交换机": "IB switch",
    "子网管理器下发本地标识符和转发表": "The subnet manager assigns LIDs and programs forwarding",
    "子网管理器": "Subnet manager",
    "LID B → 出口": "LID B → egress",
    "RDMA 写入的适配器数据路径": "Adapter data path for an RDMA write",
    "本地内存": "Local memory",
    "远端内存": "Remote memory",
    "CPU 准备请求": "CPU prepares the request",
    "接收端逐跳通告可用信用": "The receiver advertises credits hop by hop",
    "发送端口": "Sending port",
    "接收缓冲区": "Receive buffer",
    "信用更新": "Credit update",
    "有信用时发送": "Credits permit sends",
    "虚拟通道共享链路且分别排队": "Virtual lanes share a link and queue separately",
    "接收端口": "Receiving port",
    "VL A 可发送": "VL A ready",
    "VL B 等信用": "VL B waits",
    "物理链路": "Physical link",
    "各通道分别管理信用": "Credits tracked per lane",
    "繁忙出口使上游也开始排队": "A busy egress causes upstream queueing",
    "上游交换机": "Upstream switch",
    "出口交换机": "Egress switch",
    "接收端": "Receiver",
    "出口繁忙": "Busy egress"
  };
  const T = label => window.SS_LANG === 'en' ? (EN[label] ?? label) : label;
  const NS = 'http://www.w3.org/2000/svg';

  function mount(host, {paused = false, onLayout} = {}) {
    const narrow = matchMedia('(max-width: 640px)');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('role', 'img');
    svg.classList.add('an-ib');
    host.replaceChildren(svg);
    let index = 0, frame = 0, elapsed = 0, last = null;
    let tracks, wires, packets, labels, width, height;
    let cycle;

    function draw(tag, attrs, parent = labels) {
      const element = document.createElementNS(NS, tag);
      for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
      parent.append(element);
      return element;
    }

    function text([x, y], label, style = 'label', anchor = 'middle') {
      const element = draw('text', {x, y, 'text-anchor': anchor, class: 'an-ib-' + style});
      element.textContent = T(label);
      return element;
    }

    function box([x, y], label, w = 132, style = '', h = 44) {
      draw('rect', {x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 3,
        class: style ? 'an-ib-node an-ib-' + style : 'an-ib-node'});
      text([x, y], label);
    }

    function link(points, tone = 'wire') {
      return draw('polyline', {points: points.map(p => p.join(',')).join(' '),
        class: 'an-ib-link an-ib-' + tone}, wires);
    }

    function block([x, y], tone = 'green', foreground = false) {
      return draw('rect', {x: x - 7, y: y - 6, width: 14, height: 12, rx: 2,
        class: 'an-ib-block an-ib-' + tone}, foreground ? labels : packets);
    }

    function send(path, {from = 0, to = 1, at = 0, duration = 1.8, rest = 0.55, tone = 'green'} = {}) {
      const packet = block([0, 0], tone);
      const length = path.getTotalLength();
      tracks.push(time => {
        const age = time - at;
        const progress = Math.max(0, Math.min(1, age / duration));
        const point = path.getPointAtLength(length * (from + (to - from) * progress));
        packet.setAttribute('transform', 'translate(' + point.x + ' ' + point.y + ')');
        packet.style.opacity = Math.max(0, Math.min(1, age / .16, (duration + rest - age) / .18));
      });
    }

    function still(path, fraction, tone) {
      const {x, y} = path.getPointAtLength(fraction * path.getTotalLength());
      block([x, y], tone);
    }

    function paint(time) {
      for (const track of tracks) track(time);
    }

    function animate(now) {
      if (last !== null) elapsed += Math.max(0, Math.min(.05, (now - last) / 1000));
      last = now;
      paint(elapsed % cycle);
      frame = requestAnimationFrame(animate);
    }

    function stop() {
      cancelAnimationFrame(frame);
      last = null;
    }

    function play() {
      stop();
      if (!paused && !motion.matches) frame = requestAnimationFrame(animate);
    }

    function build() {
      const mobile = narrow.matches;
      const reduced = motion.matches;
      width = mobile ? 360 : 900;
      height = mobile ? 520 : 360;
      svg.replaceChildren();
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.setAttribute('aria-label', T(SCENES[index][0]));
      svg.dataset.step = index + 1;
      tracks = [];
      wires = draw('g', {}, svg);
      packets = draw('g', {}, svg);
      labels = draw('g', {}, svg);
      const p = (x, y, smallX, smallY) => mobile ? [smallX, smallY] : [x, y];
      const caption = (label, y = 304, smallY = 452) => text(p(450, y, 180, smallY), label);
      function reveal(result, at) {
        if (!reduced) tracks.push(time => { result.style.opacity = Math.max(0, Math.min(1, (time - at) / .18)); });
      }
      cycle = 6;
      SCENES[index][1]({p, mobile, reduced, box, link, block, text, reveal, send, still, caption,
        loop(seconds) { cycle = seconds; },
        queue(center, options) { return queue(center, options, tracks, block); }});
      text([width / 2, height - 22], '示意，不代表实测数字', 'note');
      elapsed = 0;
      paint(0);
      play();
      onLayout?.(width / height, mobile);
    }

    const controller = {
      show(i) { index = Math.max(0, Math.min(SCENES.length - 1, i)); build(); },
      pause() { paused = true; stop(); },
      resume() { if (paused) { paused = false; play(); } },
      destroy() {
        stop();
        narrow.removeEventListener('change', build);
        motion.removeEventListener('change', build);
        document.removeEventListener('ss-lang', build);
        svg.remove();
        delete host.__anim;
      },
      ratio() { return width / height; },
      step() { return index; }
    };
    narrow.addEventListener('change', build);
    motion.addEventListener('change', build);
    document.addEventListener('ss-lang', build);
    build();
    host.__anim = controller;
    return controller;
  }

  function queue(center, {depths, mobile}, tracks, block) {
    const cells = Array.from({length: Math.max(...depths.map(([, n]) => n))}, (_, i) => {
      const [x, y] = center;
      return block(mobile ? [x, y - i * 17] : [x - i * 17, y], 'rose');
    });
    tracks.push(time => {
      const [, depth] = depths.findLast(([at]) => time >= at);
      cells.forEach((cell, i) => { cell.style.opacity = i < depth ? 1 : 0; });
    });
  }

  const SCENES = [
    ['主机通道适配器经交换机连接', ({p, box, link, send, still, reduced}) => {
      const a = p(130, 178, 180, 78), sw = p(450, 178, 180, 245), b = p(770, 178, 180, 412);
      const path = link([a, sw, b], 'green');
      box(a, 'HCA A'); box(sw, 'IB 交换机', 152); box(b, 'HCA B');
      if (reduced) { still(path, .25); still(path, .75); }
      else send(path, {duration: 3.4});
    }],
    ['子网管理器下发本地标识符和转发表', ({p, box, link, send, still, text, reduced}) => {
      const a = p(130, 213, 93, 216), sw = p(450, 213, 93, 332), b = p(770, 213, 93, 430);
      const sm = p(450, 70, 205, 68);
      link([a, sw, b]);
      const paths = [a, sw, b].map(target => link([sm,
        p(target[0], 112, 279, 120), p(target[0], 150, 279, target[1]), target], 'control'));
      box(a, 'HCA A', 122); box(sw, 'IB 交换机', 132); box(b, 'HCA B', 122);
      box(sm, '子网管理器', 220, 'control');
      text(p(130, 264, 93, 253), 'LID A');
      text(p(450, 264, 93, 369), 'LID B → 出口');
      text(p(770, 264, 93, 469), 'LID B');
      paths.forEach((path, i) => reduced ? still(path, .82, 'control') : send(path, {at: i * .65, tone: 'control'}));
    }],
    ['RDMA 写入的适配器数据路径', ({p, box, link, send, block, reveal, text, reduced}) => {
      const a = p(94, 184, 180, 68), ha = p(271, 184, 180, 163), sw = p(450, 184, 180, 258);
      const hb = p(629, 184, 180, 353), b = p(806, 184, 180, 448);
      const path = link([a, ha, sw, hb, b], 'green');
      box(a, '本地内存', 144, '', 60); box(ha, 'HCA A', 96); box(sw, 'IB 交换机', 146);
      box(hb, 'HCA B', 96); box(b, '远端内存', 144, '', 60);
      block(p(94, 202, 180, 86), 'green', true);
      reveal(block(p(806, 202, 180, 466), 'green', true), 3.1);
      text(p(450, 96, 180, 19), 'CPU 准备请求');
      if (!reduced) send(path, {duration: 3.1});
    }],
    ['接收端逐跳通告可用信用', ({p, box, link, send, still, text, caption, reduced}) => {
      const a = p(180, 180, 180, 88), b = p(720, 180, 180, 403);
      const path = link([a, b], 'green');
      const credit = link([b, p(720, 102, 272, 403), p(180, 102, 272, 88), a], 'control');
      box(a, '发送端口', 150); box(b, '接收缓冲区', 172);
      text(p(450, 75, 274, 245), '信用更新');
      caption('有信用时发送', 260, 455);
      if (reduced) { still(path, .56); still(credit, .55, 'control'); }
      else {
        send(path, {at: .1, duration: 1.3});
        send(credit, {at: 1.55, duration: 1.5, tone: 'control'});
        send(path, {at: 3.2, duration: 1.65});
      }
    }],
    ['虚拟通道共享链路且分别排队', ({p, box, link, send, still, text, caption, reduced}) => {
      const a = p(150, 185, 180, 154), b = p(750, 185, 180, 390);
      const path = link([a, b], 'green');
      const input = link([p(68, 90, 78, 49), p(150, 90, 78, 154), a, b]);
      const waiting = link([p(68, 277, 282, 49), p(150, 277, 282, 154), a], 'rose');
      box(a, '发送端口', 110); box(b, '接收端口', 125);
      text(p(82, 63, 78, 27), 'VL A 可发送');
      text(p(99, 306, 282, 27), 'VL B 等信用');
      text(p(450, 227, 88, 273), '物理链路');
      still(waiting, .27, 'rose'); still(waiting, .48, 'rose');
      if (reduced) still(path, .67);
      else { send(input, {duration: 2.8}); send(input, {at: 1.3, duration: 2.8}); }
      caption('各通道分别管理信用', 300, 458);
    }],
    ['繁忙出口使上游也开始排队', ({p, box, link, block, text, queue, mobile, reduced}) => {
      const a = p(106, 176, 180, 64), u = p(352, 176, 180, 189);
      const sw = p(614, 176, 180, 325), b = p(790, 176, 180, 456);
      link([a, u, sw, b]); link([sw, b], 'rose');
      box(a, 'HCA', 96); box(u, '上游交换机', 150); box(sw, '出口交换机', 154, 'rose'); box(b, '接收端', 92);
      const queues = [p(253, 176, 180, 152), p(517, 176, 180, 287), p(726, 176, 180, 420)];
      queues.forEach((spot, i) => queue(spot, {depths: reduced ? [[0, i + 1]] : [[0, 0], [2.4 - i * 1.05, 1], [3.2 - i * 1.05, i + 1]],
        mobile}));
      text(p(701, 260, 93, 400), '出口繁忙');
    }]
  ];

  window.SSAnim = window.SSAnim || {};
  window.SSAnim.ib = {steps: SCENES.length, mount};
})();
