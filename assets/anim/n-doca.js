(function () {
  const id = 'n-doca';
  const ns = 'http://www.w3.org/2000/svg';
  const tr = label => label.split('|')[window.SS_LANG === 'en' && label.includes('|') ? 1 : 0];

  function svgElement(parent, tag, attrs, text = '') {
    const item = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) item.setAttribute(key, value);
    if (text) item.textContent = text;
    parent.append(item);
    return item;
  }

  function mount(host, { paused = false, onLayout } = {}) {
    const narrow = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = svgElement(host, 'svg', { class: id + '-scene', role: 'img' });
    let step = 0, raf = 0, elapsed = 0, last = 0, width, height, motion;

    function paint(time) {
      for (const { path, token, length, target, start, duration } of motion) {
        const progress = (time - start) / duration;
        const position = path.getPointAtLength(length * Math.min(1, Math.max(0, progress)));
        token.setAttribute('transform', 'translate(' + position.x + ' ' + position.y + ')');
        token.style.opacity = Math.max(0, Math.min(1, progress * 12, (1.14 - progress) * 12));
        if (target && progress >= 1) target.classList.add(id + '-ready');
      }
    }

    function tick(now) {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      elapsed += dt;
      const cycle = 4.9;
      if (elapsed >= cycle) {
        elapsed %= cycle;
        svg.querySelectorAll('.' + id + '-ready').forEach(el => el.classList.remove(id + '-ready'));
      }
      paint(elapsed);
      raf = requestAnimationFrame(tick);
    }

    function run() {
      if (paused || reduced.matches || raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }

    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    }

    function rebuild() {
      stop();
      const mobile = narrow.matches;
      width = mobile ? 360 : 900;
      height = mobile ? 440 : 328;
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      svg.setAttribute('aria-label', tr(scenes[step].caption));
      svg.dataset.step = step + 1;
      svg.replaceChildren();
      motion = [];
      const wiring = svgElement(svg, 'g', {});
      const cards = svgElement(svg, 'g', {});
      const pulses = svgElement(svg, 'g', { 'aria-hidden': 'true' });
      const boxes = Object.create(null);
      const add = (group, tag, attrs, text) => svgElement(group, tag, attrs, text);
      const label = (group, x, y, text, kind = 'label', anchor = 'middle') =>
        add(group, 'text', { x, y, class: id + '-' + kind, 'text-anchor': anchor, 'dominant-baseline': 'central' }, tr(text));

      function box(key, points, title, options = {}) {
        const [x, y] = mobile ? points.slice(2) : points;
        const w = (mobile ? options.mobileWidth : options.width) || (mobile ? 154 : 176);
        const h = options.height || 62;
        const left = x - w / 2, top = y - h / 2;
        const group = add(cards, 'g', { class: id + '-node', 'data-node': key });
        if (options.tone) group.classList.add(id + '-' + options.tone);
        add(group, 'rect', { x: left, y: top, width: w, height: h, rx: 7, class: id + '-card' });
        let titleY = options.note ? y - 11 : y;
        if (options.art) titleY = top + 20;
        label(group, x, titleY, title);
        if (options.note) label(group, x, y + 12, options.note, 'detail');
        if (options.art) options.art({ group, x, y, top, left, w, h, add, label });
        boxes[key] = { x, y, w, h, group };
      }

      function connect(from, to, options = {}) {
        const a = boxes[from], b = boxes[to];
        const style = options.style || 'data';
        const direction = mobile ? options.mobile : options.desktop;
        const horizontal = direction ? direction === 'h' : a.y === b.y;
        const sign = Math.sign(horizontal ? b.x - a.x : b.y - a.y);
        const offset = options.offset || 0;
        const [x1, y1, x2, y2] = horizontal
          ? [a.x + sign * a.w / 2, a.y + offset, b.x - sign * b.w / 2, b.y + offset]
          : [a.x + offset, a.y + sign * a.h / 2, b.x + offset, b.y - sign * b.h / 2];
        const mid = horizontal ? (x1 + x2) / 2 : (y1 + y2) / 2;
        const d = horizontal ? 'M' + x1 + ',' + y1 + 'H' + mid + 'V' + y2 + 'H' + x2
          : 'M' + x1 + ',' + y1 + 'V' + mid + 'H' + x2 + 'V' + y2;
        const path = add(wiring, 'path', { d, class: id + '-line ' + id + '-' + style });
        const dx = horizontal ? sign : 0, dy = horizontal ? 0 : sign;
        const tip = (back, side) => (x2 - back * dx - side * dy) + ',' + (y2 - back * dy + side * dx);
        add(wiring, 'polyline', {
          points: [tip(7, -4), tip(0, 0), tip(7, 4)].join(' '),
          class: id + '-arrow ' + id + '-' + style
        });
        if (options.start !== undefined) {
          travel(path, style, options.start, options.duration, b.group);
        }
      }

      function travel(path, style, start, duration = 0.74, target) {
        const signal = style === 'control';
        const token = add(pulses, signal ? 'circle' : 'rect', {
          ...(signal ? { r: 4.5 } : { x: -7, y: -4.5, width: 14, height: 9, rx: 2 }),
          class: id + '-token ' + id + '-' + style
        });
        motion.push({ path, token, length: path.getTotalLength(), target, start, duration });
      }

      scenes[step].draw({ box, connect, mobile, cards, add, label, travel });
      label(svg, width / 2, height - 19, '示意，不代表实测数字|Schematic, not measured', 'detail');
      if (onLayout) onLayout(width / height, mobile);
      elapsed = 0;
      paint(reduced.matches ? 4.5 : 0);
      run();
    }

    const media = [narrow, reduced];
    for (const query of media) query.addEventListener('change', rebuild);
    document.addEventListener('ss-lang', rebuild);
    const control = {
      show(i) {
        step = Math.max(0, Math.min(scenes.length - 1, i));
        rebuild();
      },
      pause() { paused = true; stop(); },
      resume() { paused = false; run(); },
      destroy() {
        stop();
        for (const query of media) query.removeEventListener('change', rebuild);
        document.removeEventListener('ss-lang', rebuild);
        svg.remove();
        delete host.__anim;
      },
      ratio() { return width / height; },
      step() { return step; }
    };
    host.__anim = control;
    rebuild();
    return control;
  }

  const scenes = [
    {
      caption: '应用经 DOCA 配置 BlueField，数据包走独立的硬件路径|The application programs BlueField through DOCA, while packets take a separate hardware path',
      draw({ box, connect }) {
        box('app', [307, 66, 92, 64], '控制应用|Control App');
        box('sdk', [593, 66, 268, 64], 'DOCA', { note: '配置设备|Configure Device' });
        box('input', [143, 214, 92, 172], '入站数据包|Ingress Packet');
        box('dpu', [450, 214, 180, 267], 'BlueField', { note: '硬件处理|Hardware Path', tone: 'active' });
        box('output', [757, 214, 180, 362], '出站数据包|Egress Packet');
        connect('app', 'sdk', { style: 'control', start: 0.35 });
        connect('sdk', 'dpu', { style: 'control', start: 1.13, offset: 18 });
        connect('input', 'dpu', { start: 2, offset: -12 });
        connect('dpu', 'output', { start: 2.78 });
      }
    },
    {
      caption: 'DOCA Flow 的 pipe 模板与 entry 具体值共同定义硬件规则|The DOCA Flow pipe template and entry values define the hardware rule',
      draw({ box, connect }) {
        box('pipe', [155, 86, 91, 91], 'Pipe', { note: '匹配与动作|Match and Action' });
        box('entry', [155, 213, 269, 91], 'Entry', { note: '目标端口值|Destination Port' });
        box('flow', [450, 149, 180, 201], 'DOCA Flow', { note: '创建规则|Install Rule' });
        box('rule', [745, 149, 180, 317], '硬件规则|Hardware Rule', { note: 'BlueField', tone: 'active' });
        connect('pipe', 'flow', { desktop: 'h', style: 'control', start: 0.35, offset: -10 });
        connect('entry', 'flow', { desktop: 'h', style: 'control', start: 0.35, offset: 10 });
        connect('flow', 'rule', { style: 'control', start: 1.2 });
      }
    },
    {
      caption: '命中规则的包由 BlueField 改写并转发，应用不逐包参与|BlueField rewrites and forwards matching packets without per-packet application work',
      draw({ box, connect }) {
        box('app', [450, 65, 180, 51], '控制应用|Control App', { note: '不逐包处理|Off the Packet Path', tone: 'idle' });
        box('input', [143, 194, 180, 140], '入站数据包|Ingress Packet');
        box('rule', [450, 194, 180, 235], 'BlueField', { note: '命中并改写|Match and Rewrite', tone: 'active' });
        box('output', [757, 194, 180, 330], '转发已改写包|Forwarded Packet', { note: '业务端口|Service Port' });
        connect('input', 'rule', { start: 0.35 });
        connect('rule', 'output', { style: 'rewritten', start: 1.22 });
      }
    },
    {
      caption: '命中包走业务端口，未命中包走下一条管线|Matching packets take the service port and misses take the next pipe',
      draw({ box, connect }) {
        box('input', [135, 150, 180, 67], '入站数据包|Ingress Packet');
        box('pipe', [430, 150, 180, 172], 'DOCA Flow', { note: '第一条管线|First Pipe' });
        box('hit', [735, 85, 92, 305], '命中|Hit', { note: '业务端口|Service Port' });
        box('miss', [735, 216, 268, 305], '未命中|Miss', { note: '后续管线|Next Pipe', tone: 'miss' });
        connect('input', 'pipe', { start: 0.28, offset: -8 });
        connect('input', 'pipe', { style: 'miss', start: 1.57, offset: 8 });
        connect('pipe', 'hit', { desktop: 'h', start: 1.07, offset: -12 });
        connect('pipe', 'miss', { desktop: 'h', style: 'miss', start: 2.39, offset: 12 });
      }
    },
    {
      caption: '已卸载规则转发数据包，同时更新可被应用读取的命中计数|The offloaded rule forwards packets and updates a hit counter the application can read',
      draw({ box, connect }) {
        box('app', [670, 63, 268, 114], '应用读取统计|App Reads Stats');
        box('counter', [414, 63, 268, 225], '命中计数器|Hit Counter', { note: '包数或字节数|Packets or Bytes' });
        box('input', [147, 215, 92, 66], '入站数据包|Ingress Packet');
        box('rule', [414, 215, 92, 225], 'DOCA Flow', { note: '已卸载规则|Offloaded Rule', tone: 'active' });
        box('output', [735, 215, 92, 357], '转发|Forward', { note: '业务端口|Service Port' });
        connect('input', 'rule', { start: 0.3 });
        connect('rule', 'output', { start: 1.13, offset: 10 });
        connect('rule', 'counter', { style: 'control', start: 1.13 });
        connect('counter', 'app', { style: 'control', start: 2.15 });
      }
    }
  ];

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = { steps: scenes.length, mount };
})();
