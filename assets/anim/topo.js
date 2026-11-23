/* Topic animation. The page owns navigation and calls show() with a zero-based step. */
(function () {
  const EN = {
    "示意，不代表实测数字": "Schematic, not measured",
    "服务器 A": "Server A",
    "服务器 B": "Server B",
    "同一台 Leaf 转发两台服务器间的流量": "One leaf forwards traffic between both servers",
    "同一台 Leaf 转发": "Forwarded by one leaf",
    "跨 Leaf 路径可经任意一台相连的 Spine": "Cross-leaf traffic can use either connected spine",
    "跨 Leaf · 经一台 Spine": "Cross-leaf via one spine",
    "流 A 与流 B 分配到不同的 Spine": "Flows A and B use different spines",
    "流 A": "Flow A",
    "流 B": "Flow B",
    "下联并发使上联前的队列增长": "Concurrent downlink arrivals build a queue at the uplink",
    "共享上联": "Shared uplink",
    "上联队列": "Uplink queue",
    "同轨道经过一台 Leaf，跨轨道经过 Spine": "Same-rail traffic uses one leaf and cross-rail traffic uses a spine",
    "GPU A 网卡": "GPU A NIC",
    "GPU B 网卡": "GPU B NIC",
    "同轨道": "Same rail",
    "跨轨道": "Cross-rail"
  };
  const T = label => window.SS_LANG === 'en' ? (EN[label] ?? label) : label;
  const NS = 'http://www.w3.org/2000/svg';

  function mount(host, {paused = false, onLayout} = {}) {
    const narrow = matchMedia('(max-width: 640px)');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('role', 'img');
    svg.classList.add('an-topo');
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
      const element = draw('text', {x, y, 'text-anchor': anchor, class: 'an-topo-' + style});
      element.textContent = T(label);
      return element;
    }

    function box([x, y], label, w = 132, style = '', h = 44) {
      draw('rect', {x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 3,
        class: style ? 'an-topo-node an-topo-' + style : 'an-topo-node'});
      text([x, y], label);
    }

    function link(points, tone = 'wire') {
      return draw('polyline', {points: points.map(p => p.join(',')).join(' '),
        class: 'an-topo-link an-topo-' + tone}, wires);
    }

    function block([x, y], tone = 'green', foreground = false) {
      return draw('rect', {x: x - 7, y: y - 6, width: 14, height: 12, rx: 2,
        class: 'an-topo-block an-topo-' + tone}, foreground ? labels : packets);
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
      const caption = (label, y = 304, smallY = 452) => text(p(450, y, 180, smallY), label);
      cycle = 6;
      SCENES[index][1]({p, mobile, reduced, box, link, block, text, send, stream, still, caption,
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

  function queue(center, {depths}, tracks, block) {
    const cells = Array.from({length: Math.max(...depths.map(([, n]) => n))}, (_, i) => {
      const [x, y] = center;
      return block([x - i * 17, y], 'rose', true);
    });
    tracks.push(time => {
      const [, depth] = depths.findLast(([at]) => time >= at);
      cells.forEach((cell, i) => { cell.style.opacity = i < depth ? 1 : 0; });
    });
  }

  function clos({p, box, link}) {
    const a = p(80, 177, 180, 66), b = p(820, 177, 180, 437);
    const l = p(264, 177, 180, 161), r = p(636, 177, 180, 342);
    const top = p(450, 76, 69, 250), bottom = p(450, 278, 291, 250);
    box(a, '服务器 A', 112); box(b, '服务器 B', 112);
    box(l, 'Leaf A', 105); box(r, 'Leaf B', 105);
    box(top, 'Spine A', 105); box(bottom, 'Spine B', 105);
    link([a, l]); link([r, b]);
    return {a, b, l, r, top, bottom};
  }

  const SCENES = [
    ['同一台 Leaf 转发两台服务器间的流量', ({p, box, link, send, still, caption, reduced}) => {
      const a = p(123, 187, 180, 93), leaf = p(450, 187, 180, 249), b = p(777, 187, 180, 405);
      const route = link([a, leaf, b], 'green');
      box(a, '服务器 A', 136); box(leaf, 'Leaf', 118); box(b, '服务器 B', 136);
      caption('同一台 Leaf 转发');
      if (reduced) still(route, .72);
      else send(route, {duration: 3.2});
    }],
    ['跨 Leaf 路径可经任意一台相连的 Spine', scene => {
      const {p, link, text, send, still, reduced} = scene;
      const {a, b, l, r, top, bottom} = clos(scene);
      link([l, bottom, r]);
      const route = link([a, l, top, r, b], 'green');
      text(p(689, 85, 180, 479), '跨 Leaf · 经一台 Spine');
      if (reduced) { still(route, .36); still(route, .63); }
      else send(route, {duration: 3.8});
    }],
    ['流 A 与流 B 分配到不同的 Spine', scene => {
      const {p, link, text, stream, still, reduced} = scene;
      const {a, b, l, r, top, bottom} = clos(scene);
      const paths = [link([a, l, top, r, b], 'green'), link([a, l, bottom, r, b], 'rail')];
      text(p(450, 38, 69, 21), '流 A'); text(p(576, 278, 291, 21), '流 B');
      paths.forEach((path, i) => {
        const tone = i ? 'rail' : 'green';
        if (reduced) { still(path, .36, tone); still(path, .63, tone); }
        else stream(path, {at: .15 + i * .43, duration: 3.2, tone}, 3, .6);
      });
    }],
    ['下联并发使上联前的队列增长', ({p, mobile, box, link, text, stream, still, reduced, queue}) => {
      const a = p(105, 120, 85, 105), b = p(105, 243, 275, 105);
      const leaf = p(450, 181, 180, 286), spine = p(774, 181, 180, 412);
      const aPath = link([a, p(285, 120, 85, 181), p(285, 161, 141, 181), p(370, 161, 141, 246)], 'green');
      const bPath = link([b, p(285, 243, 275, 181), p(285, 201, 219, 181), p(370, 201, 219, 246)], 'rail');
      const uplink = link([p(530, 181, 180, 326), spine], 'rose');
      box(a, '服务器 A', 126); box(b, '服务器 B', 126);
      box(leaf, '', 160, '', 80); text(p(450, 157, 180, 264), 'Leaf');
      box(spine, 'Spine', 105);
      text(p(646, 209, 252, 355), '共享上联');
      text(p(448, 202, 180, 285), '上联队列');
      queue(p(510, 219, 218, 307), {depths: reduced ? [[0, 4]] : [[0, 0], [1.5, 1], [1.85, 2], [2.3, 3], [3, 4], [4.2, 3], [5.2, 2]]});
      if (reduced) still(uplink, .51);
      else {
        stream(aPath, {duration: 1.45}, 4, .48);
        stream(bPath, {at: .22, duration: 1.45, tone: 'rail'}, 4, .48);
        stream(uplink, {at: 1.6, duration: 1.2}, 4, .94);
      }
    }],
    ['同轨道经过一台 Leaf，跨轨道经过 Spine', ({p, box, link, text, send, still, reduced, loop}) => {
      const a1 = p(105, 100, 82, 84), a2 = p(105, 259, 278, 84);
      const b1 = p(795, 100, 82, 419), b2 = p(795, 259, 278, 419);
      const l1 = p(450, 100, 82, 251), l2 = p(450, 259, 278, 251);
      const spine = p(450, 179, 180, 251);
      const same = link([a1, l1, b1], 'green');
      link([a2, l2, b2]);
      link([l1, spine, l2], 'rail'); link([l2, b2], 'rail');
      const cross = link([a1, l1, spine, l2, b2], 'track');
      box(a1, 'GPU A 网卡', 134); box(a2, 'GPU B 网卡', 134); box(b1, 'GPU A 网卡', 134); box(b2, 'GPU B 网卡', 134);
      box(l1, 'Leaf A', 80, 'green'); box(l2, 'Leaf B', 80); box(spine, 'Spine', 76);
      text(p(105, 44, 180, 35), '服务器 A'); text(p(795, 44, 180, 469), '服务器 B');
      text(p(260, 67, 82, 166), '同轨道'); text(p(555, 209, 180, 295), '跨轨道');
      if (reduced) { still(same, .29); still(cross, .74, 'rail'); }
      else {
        loop(7);
        send(same, {duration: 3.2});
        send(cross, {at: 2.1, duration: 3.8, tone: 'rail'});
      }
    }]
  ];

  window.SSAnim = window.SSAnim || {};
  window.SSAnim.topo = {steps: SCENES.length, mount};
})();
