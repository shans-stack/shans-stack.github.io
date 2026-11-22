/* Topic animation. The page owns navigation and calls show() with a zero-based step. */
(function () {
  const EN = {
    "示意，不代表实测数字": "Schematic, not measured",
    "源 A": "Source A",
    "源 B": "Source B",
    "交换机出口": "Switch egress",
    "接收端": "Receiver",
    "源网卡": "Source NIC",
    "交换机": "Switch",
    "接收网卡": "Receiver NIC",
    "多个源汇入同一个交换机出口": "Multiple sources converge on one switch egress",
    "共享队列": "Shared queue",
    "到达快于排出，队列逐步增长": "Arrivals outpace departures and the queue grows",
    "队列很高": "High queue",
    "交换机添加 CE 标记后继续转发报文": "The switch marks the packet CE and forwards it",
    "CE 标记": "CE mark",
    "接收端发送 CNP，源端接收反馈": "The receiver sends a CNP back to the source",
    "发送间隔拉长后队列排空": "The queue drains as the source sends less frequently",
    "发送降速": "Slower sending",
    "队列较低": "Low queue",
    "PFC 只暂停指定优先级与相邻端口": "PFC pauses a selected priority at the adjacent port",
    "上游端口": "Upstream port",
    "接收端口": "Receiving port",
    "PFC 暂停": "PFC pause",
    "暂停指定优先级": "Selected priority held",
    "其他优先级": "Other priorities",
    "PFC 保护相邻链路，CNP 把拥塞反馈送回源端": "PFC protects the adjacent link and CNP feeds congestion back to the source",
    "队列升高": "Queue rising"
  };
  const T = label => window.SS_LANG === 'en' ? (EN[label] ?? label) : label;
  const NS = 'http://www.w3.org/2000/svg';

  function mount(host, {paused = false, onLayout} = {}) {
    const narrow = matchMedia('(max-width: 640px)');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('role', 'img');
    svg.classList.add('an-cong');
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
      const element = draw('text', {x, y, 'text-anchor': anchor, class: 'an-cong-' + style});
      element.textContent = T(label);
      return element;
    }

    function box([x, y], label, w = 132, style = '', h = 44) {
      draw('rect', {x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 3,
        class: style ? 'an-cong-node an-cong-' + style : 'an-cong-node'});
      text([x, y], label);
    }

    function link(points, tone = 'wire') {
      return draw('polyline', {points: points.map(p => p.join(',')).join(' '),
        class: 'an-cong-link an-cong-' + tone}, wires);
    }

    function block([x, y], tone = 'green', foreground = false) {
      return draw('rect', {x: x - 7, y: y - 6, width: 14, height: 12, rx: 2,
        class: 'an-cong-block an-cong-' + tone}, foreground ? labels : packets);
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

    function stream(path, options, count, gap) {
      for (let i = 0; i < count; i++) send(path, {...options, at: (options.at ?? 0) + i * gap});
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
      cycle = 6;
      SCENES[index][1]({p, mobile, reduced, box, link, block, text, send, stream, still,
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

  function queue(center, {depths, mobile, label}, tracks, block) {
    const cells = Array.from({length: Math.max(...depths.map(([, n]) => n))}, (_, i) => {
      const [x, y] = center;
      return block(mobile ? [x, y - i * 17] : [x - i * 17, y], 'rose');
    });
    tracks.push(time => {
      const [, depth] = depths.findLast(([at]) => time >= at);
      if (label) label.textContent = T(depth >= 5 ? '队列很高' : depth >= 2 ? '队列升高' : '队列较低');
      cells.forEach((cell, i) => { cell.style.opacity = i < depth ? 1 : 0; });
    });
  }

  function bottleneck({p, box, link}) {
    const a = p(116, 113, 88, 81), b = p(116, 241, 272, 81);
    const junction = p(287, 178, 180, 170), sw = p(484, 178, 180, 301);
    const dst = p(792, 178, 180, 426);
    const inputA = link([a, p(235, 113, 88, 170), junction, sw], 'green');
    const inputB = link([b, p(235, 241, 272, 170), junction, sw], 'rail');
    const output = link([sw, dst], 'rose');
    box(a, '源 A', 108); box(b, '源 B', 108);
    box(sw, '交换机出口', 158, 'rose'); box(dst, '接收端', 132);
    return {inputA, inputB, output};
  }

  function endpoints({p, box, link}, color = 'green') {
    const a = p(138, 179, 180, 99), sw = p(450, 179, 180, 254), b = p(762, 179, 180, 409);
    const incoming = link([a, sw], color), outgoing = link([sw, b], color);
    box(a, '源网卡', 110); box(sw, '交换机', 130); box(b, '接收网卡', 136);
    return {a, sw, b, incoming, outgoing};
  }

  function feedback({p, link}, {a, sw, b}) {
    return link([b, p(762, 259, 292, 409), p(493, 259, 292, 284),
      p(493, 179, 180, 284), sw, p(407, 179, 180, 224),
      p(407, 259, 292, 224), p(138, 259, 292, 99), a], 'control');
  }

  const SCENES = [
    ['多个源汇入同一个交换机出口', scene => {
      const {p, mobile, reduced, queue, stream, still, text} = scene;
      const {inputA, inputB, output} = bottleneck(scene);
      text(p(381, 229, 99, 224), '共享队列');
      queue(p(373, 178, 180, 264), {mobile, depths: reduced ? [[0, 3]] : [[0, 0], [1.6, 1], [2.05, 2], [2.8, 3], [4, 2], [5, 1]]});
      if (reduced) { still(inputA, .16); still(inputB, .16, 'rail'); still(output, .57); }
      else {
        stream(inputA, {duration: 1.4}, 3, .48);
        stream(inputB, {at: .25, duration: 1.4, tone: 'rail'}, 3, .48);
        stream(output, {at: 1.85, duration: 1.35}, 3, .92);
      }
    }],
    ['到达快于排出，队列逐步增长', scene => {
      const {p, mobile, reduced, queue, text, stream, still, loop} = scene;
      const {inputA, inputB, output} = bottleneck(scene);
      const label = text(p(396, 246, 180, 473), '队列很高');
      queue(p(389, 178, 180, 262), {mobile, depths: reduced ? [[0, 5]] : [[0, 1], [1.45, 2], [2, 3], [2.55, 4], [3.1, 5]], label});
      if (reduced) { still(inputA, .25); still(inputB, .25, 'rail'); still(output, .57); }
      else {
        loop(7);
        stream(inputA, {duration: 1.45}, 6, .61);
        stream(inputB, {at: .28, duration: 1.45, tone: 'rail'}, 6, .61);
        stream(output, {at: .2, duration: 1.3}, 4, 1.12);
      }
    }],
    ['交换机添加 CE 标记后继续转发报文', scene => {
      const {p, text, send, still, reduced} = scene;
      const {incoming, outgoing} = endpoints(scene);
      text(p(644, 131, 104, 332), 'CE 标记');
      if (reduced) still(outgoing, .52, 'rose');
      else {
        send(incoming, {at: .25, duration: 1.5, rest: 0});
        send(outgoing, {at: 1.75, duration: 1.75, tone: 'rose'});
      }
    }],
    ['接收端发送 CNP，源端接收反馈', scene => {
      const {p, text, send, still, reduced, loop} = scene;
      const nodes = endpoints(scene);
      const reverse = feedback(scene, nodes);
      text(p(637, 130, 105, 331), 'CE 标记');
      text(p(450, 289, 291, 252), 'CNP');
      if (reduced) { still(nodes.outgoing, .53, 'rose'); still(reverse, .29, 'control'); }
      else {
        loop(6.5);
        send(nodes.outgoing, {at: .15, duration: 1.65, tone: 'rose'});
        send(reverse, {at: 1.85, duration: 2.9, tone: 'control'});
      }
    }],
    ['发送间隔拉长后队列排空', scene => {
      const {p, mobile, text, queue, stream, still, reduced, loop} = scene;
      const {incoming, outgoing} = endpoints(scene);
      text(p(138, 242, 180, 47), '发送降速');
      const label = text(p(450, 242, 180, 466), '队列较低');
      queue(p(366, 179, 180, 218), {mobile, depths: reduced ? [[0, 1]] : [[0, 5], [.85, 4], [1.65, 3], [2.45, 2], [3.25, 1], [4.05, 0]], label});
      if (reduced) still(outgoing, .52);
      else {
        loop(7);
        stream(incoming, {at: .65, duration: 1.25}, 3, 1.7);
        stream(outgoing, {at: .05, duration: 1.05}, 6, .8);
      }
    }],
    ['PFC 只暂停指定优先级与相邻端口', ({p, box, text, link, send, stream, still, reduced, loop}) => {
      const a = p(172, 173, 180, 156), b = p(727, 173, 180, 399);
      const path = link([a, b], 'green');
      const pause = link([b, p(727, 93, 284, 399), p(172, 93, 284, 156), a], 'rose');
      const waiting = link([p(126, 233, 115, 95), p(172, 233, 180, 95), a], 'rose');
      box(a, '上游端口', 127); box(b, '接收端口', 128);
      text(p(450, 66, 284, 281), 'PFC 暂停');
      text(p(172, 283, 174, 56), '暂停指定优先级');
      text(p(496, 225, 93, 285), '其他优先级');
      still(waiting, .19, 'rose'); still(waiting, .38, 'rose');
      if (reduced) { still(pause, .53, 'rose'); still(path, .58); }
      else {
        loop(6.5);
        send(pause, {at: .1, duration: 1.6, tone: 'rose'});
        stream(path, {at: 1.8, duration: 1.75}, 3, .7);
      }
    }],
    ['PFC 保护相邻链路，CNP 把拥塞反馈送回源端', scene => {
      const {p, link, text, send, still, reduced, loop} = scene;
      const nodes = endpoints(scene);
      const {a, sw, outgoing} = nodes;
      const pause = link([sw, p(450, 95, 77, 254), p(138, 95, 77, 99), a], 'rose');
      const reverse = feedback(scene, nodes);
      text(p(294, 66, 76, 174), 'PFC 暂停');
      text(p(450, 290, 291, 250), 'CNP');
      text(p(626, 132, 105, 330), 'CE 标记');
      if (reduced) { still(pause, .54, 'rose'); still(outgoing, .56, 'rose'); still(reverse, .29, 'control'); }
      else {
        loop(7);
        send(outgoing, {at: .2, duration: 1.75, tone: 'rose'});
        send(pause, {at: .75, duration: 1.75, tone: 'rose'});
        send(reverse, {at: 2, duration: 2.9, tone: 'control'});
      }
    }]
  ];

  window.SSAnim = window.SSAnim || {};
  window.SSAnim.cong = {steps: SCENES.length, mount};
})();
