/* Topic animation. The page owns navigation and calls show() with a zero-based step. */
(function () {
  const EN = {
    "示意，不代表实测数字": "Schematic, not measured",
    "源网卡": "Source NIC",
    "接收网卡": "Receiver NIC",
    "以太网在网卡之间承载 RDMA": "Ethernet carries RDMA between adapters",
    "以太网交换机": "Ethernet switch",
    "RDMA 写入": "RDMA write",
    "写入内存": "Memory write",
    "RoCEv1 帧在二层域内交换": "RoCEv1 frames are switched within one Layer 2 domain",
    "二层交换机": "Layer 2 switch",
    "以太网": "Ethernet",
    "同一二层域": "Same Layer 2 domain",
    "RoCEv2 经 IP 路由跨子网": "RoCEv2 crosses IP subnets through a router",
    "IP 路由器": "IP router",
    "子网 A": "Subnet A",
    "子网 B": "Subnet B",
    "可靠连接补发缺失报文并返回确认": "Reliable Connection retries a missing packet and returns an acknowledgment",
    "重传报文 2": "Retry packet 2",
    "确认": "ACK",
    "已接收报文 1": "Packet 1 received",
    "已接收报文 2": "Packet 2 received",
    "PFC 暂停相邻端口，ECN 触发端到端反馈": "PFC pauses an adjacent port and ECN triggers end-to-end feedback",
    "交换机": "Switch",
    "PFC 暂停": "PFC pause",
    "ECN 标记": "ECN mark"
  };
  const T = label => window.SS_LANG === 'en' ? (EN[label] ?? label) : label;
  const NS = 'http://www.w3.org/2000/svg';

  function mount(host, {paused = false, onLayout} = {}) {
    const narrow = matchMedia('(max-width: 640px)');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('role', 'img');
    svg.classList.add('an-roce');
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
      const element = draw('text', {x, y, 'text-anchor': anchor, class: 'an-roce-' + style});
      element.textContent = T(label);
      return element;
    }

    function box([x, y], label, w = 132, style = '', h = 44) {
      draw('rect', {x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 3,
        class: style ? 'an-roce-node an-roce-' + style : 'an-roce-node'});
      text([x, y], label);
    }

    function link(points, tone = 'wire') {
      return draw('polyline', {points: points.map(p => p.join(',')).join(' '),
        class: 'an-roce-link an-roce-' + tone}, wires);
    }

    function block([x, y], tone = 'green', foreground = false) {
      return draw('rect', {x: x - 7, y: y - 6, width: 14, height: 12, rx: 2,
        class: 'an-roce-block an-roce-' + tone}, foreground ? labels : packets);
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
        loop(seconds) { cycle = seconds; }});
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

  function ethernet({p, box, link}, center, centerWidth = 170) {
    const a = p(130, 190, 180, 160), mid = p(450, 190, 180, 283), b = p(770, 190, 180, 406);
    const path = link([a, mid, b], 'green');
    box(a, '源网卡'); box(mid, center, centerWidth); box(b, '接收网卡');
    return {a, mid, b, path};
  }

  function headers({p, mobile, box}, labels) {
    const width = mobile ? 76 : 108;
    labels.forEach((label, i) => {
      const offset = (i - (labels.length - 1) / 2) * width;
      box(p(450 + offset, 87, 180 + offset, 72), label, width, label === 'RDMA' ? 'green' : '');
    });
  }

  const SCENES = [
    ['以太网在网卡之间承载 RDMA', scene => {
      const {p, text, send, still, reduced} = scene;
      const {path} = ethernet(scene, '以太网交换机', 198);
      text(p(130, 252, 180, 200), 'RDMA 写入');
      text(p(770, 252, 180, 451), '写入内存');
      if (reduced) { still(path, .27); still(path, .75); }
      else send(path, {duration: 3.4});
    }],
    ['RoCEv1 帧在二层域内交换', scene => {
      const {caption, send, still, reduced} = scene;
      const {path} = ethernet(scene, '二层交换机');
      headers(scene, ['以太网', 'RDMA']);
      caption('同一二层域');
      if (reduced) still(path, .28);
      else send(path, {duration: 3.3});
    }],
    ['RoCEv2 经 IP 路由跨子网', scene => {
      const {p, text, send, still, reduced} = scene;
      const {path} = ethernet(scene, 'IP 路由器');
      headers(scene, ['以太网', 'IP', 'UDP', 'RDMA']);
      text(p(130, 255, 180, 117), '子网 A');
      text(p(770, 255, 180, 450), '子网 B');
      if (reduced) { still(path, .25); still(path, .75); }
      else send(path, {duration: 3.3});
    }],
    ['可靠连接补发缺失报文并返回确认', scene => {
      const {p, text, link, send, still, reveal, reduced} = scene;
      const {a, mid, b, path} = ethernet(scene, '以太网交换机', 198);
      const ack = link([b, p(770, 259, 308, 406), p(490, 259, 308, 312),
        p(490, 190, 180, 312), mid, p(410, 190, 180, 254),
        p(410, 259, 308, 254), p(130, 259, 308, 160), a], 'control');
      text(p(450, 101, 180, 75), '重传报文 2');
      text(p(450, 289, 308, 283), '确认');
      text(p(770, 130, 180, 450), '已接收报文 1');
      reveal(text(p(770, 306, 180, 474), '已接收报文 2'), 2.65);
      if (reduced) { still(path, .29, 'rose'); still(ack, .45, 'control'); }
      else {
        send(path, {at: .35, duration: 2.3, tone: 'rose'});
        send(ack, {at: 2.7, duration: 2.2, tone: 'control'});
      }
    }],
    ['PFC 暂停相邻端口，ECN 触发端到端反馈', ({p, box, link, text, send, still, reduced, loop}) => {
      const a = p(135, 193, 180, 110), sw = p(450, 193, 180, 265), b = p(765, 193, 180, 420);
      const data = link([sw, b], 'green');
      link([a, sw]);
      const pause = link([sw, p(450, 107, 79, 265), p(135, 107, 79, 110), a], 'rose');
      const feedback = link([b, p(765, 267, 292, 420), p(490, 267, 292, 294),
        p(490, 193, 180, 294), sw, p(410, 193, 180, 236),
        p(410, 267, 292, 236), p(135, 267, 292, 110), a], 'control');
      box(a, '源网卡', 110); box(sw, '交换机', 110); box(b, '接收网卡', 132);
      text(p(282, 84, 78, 190), 'PFC 暂停');
      text(p(630, 156, 110, 340), 'ECN 标记');
      text(p(450, 300, 292, 265), 'CNP');
      if (reduced) { still(pause, .55, 'rose'); still(data, .57); still(feedback, .37, 'control'); }
      else {
        loop(7);
        send(pause, {at: .35, duration: 1.6, tone: 'rose'});
        send(data, {at: 1, duration: 2.2, tone: 'rose'});
        send(feedback, {at: 3.15, duration: 2.8, tone: 'control'});
      }
    }]
  ];

  window.SSAnim = window.SSAnim || {};
  window.SSAnim.roce = {steps: SCENES.length, mount};
})();
