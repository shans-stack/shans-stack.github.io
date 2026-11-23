(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const scenes = [
    ['单条 TCP 连接', 'One TCP Connection'],
    ['nconnect=4 · 同一服务端 IP', 'nconnect=4 · One Server IP'],
    ['四条连接均进入 VIP A', 'Four Connections to VIP A'],
    ['四条连接 · 每个 VIP 两条', 'Four Connections · Two per VIP'],
    ['同一个文件的读写请求', 'I/O Requests for the Same File'],
    ['同一服务端 IP 的挂载复用', 'Mounts Share a Server IP']
  ];

  function mount(host, opts = {}) {
    const mq = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(NS, 'svg');
    svg.classList.add('v-nconnect-scene');
    svg.setAttribute('role', 'img');
    host.replaceChildren(svg);

    let current = 0, frame = 0, last = 0, elapsed = 0, mobile, width, height;
    let flows = [], paused = !!opts.paused;
    const T = (zh, en) => window.SS_LANG === 'en' ? en : zh;

    function add(tag, attrs, value) {
      const el = document.createElementNS(NS, tag);
      for (const [key, val] of Object.entries(attrs)) el.setAttribute(key, val);
      if (value !== undefined) el.textContent = value;
      svg.appendChild(el);
      return el;
    }

    function label(x, y, value, kind = 'label') {
      add('text', { x, y, class: 'v-nconnect-' + kind }, value);
    }

    function node(x, y, w, h, title, detail = '') {
      add('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 8, class: 'v-nconnect-node' });
      label(x, y - (detail ? 10 : 0), title);
      if (detail) label(x, y + 14, detail, 'detail');
    }

    function wire(points, inactive = false) {
      return add('path', { d: 'M' + points.map(p => p.join(' ')).join(' L'), class: inactive ? 'v-nconnect-idle' : 'v-nconnect-wire' });
    }

    function request(path, delay, still, duration = 2.05) {
      const packet = add('rect', { x: -5, y: -5, width: 10, height: 10, rx: 2, class: 'v-nconnect-request' });
      flows.push({ path, length: path.getTotalLength(), packet, delay, still, duration });
    }

    function topology() {
      const client = T('NFS 挂载点', 'NFS mount');
      const server = T('服务端 IP', 'Server IP');
      const multi = current >= 2;
      const spread = current === 3;
      const offsets = current === 0 ? [0] : [-21, -7, 7, 21];

      offsets.forEach((offset, index) => {
        const second = spread && index >= 2;
        const vipY = second ? 223 : 111;
        const vipX = second ? 260 : 100;
        const lane = index % 2 === 0 ? -8 : 8;
        let points;
        if (!multi) {
          points = mobile ? [[180 + offset, 106], [180 + offset, 316]] : [[210, 167 + offset], [651, 167 + offset]];
        } else if (mobile) {
          const endX = vipX + (spread ? lane : offset);
          const bendY = second ? 162 - lane : 188 + (spread ? lane : offset);
          points = [[180 + offset, 106], [180 + offset, bendY], [endX, bendY], [endX, 266]];
        } else {
          const endY = vipY + (spread ? lane : offset);
          const bendX = 417 + (second ? -lane : offset);
          points = [[210, 167 + offset], [bendX, 167 + offset], [bendX, endY], [667, endY]];
        }
        const path = wire(points);
        if (current === 0) [0, 0.62, 1.24].forEach((delay, i) => request(path, delay, 0.24 + i * 0.25));
        else request(path, index * 0.19, 0.25 + index * 0.14);
      });

      if (multi) {
        [0, 1].forEach(index => {
          const x = index ? 260 : 100;
          const y = index ? 223 : 111;
          const name = 'AB'[index];
          if (mobile) node(x, 301, 138, 70, 'CNode ' + name, 'VIP ' + name);
          else node(747, y, 160, 74, 'CNode ' + name, 'VIP ' + name);
        });
      } else if (mobile) {
        node(180, 346, 184, 60, server);
      } else {
        node(732, 167, 162, 78, server);
      }

      if (mobile) node(180, 76, 184, 60, client);
      else node(117, 167, 186, 78, client);
    }

    function fileRouting() {
      [0, 1].forEach(version => {
        const y = mobile ? 116 + version * 184 : 104 + version * 125;
        const start = mobile ? 104 : 263;
        const end = mobile ? 264 : 694;
        const mid = (start + end) / 2;
        label(mobile ? 56 : 79, y - (mobile ? 45 : 37), version ? 'NFSv4' : 'NFSv3');
        [0, 1].forEach(i => {
          const dy = i ? 29 : -29;
          const idle = version === 1 && i === 1;
          const path = wire([[start, y + dy / 2], [mid, y + dy / 2], [mid, y + dy], [end, y + dy]], idle);
          if (!idle) request(path, i * 0.26, 0.65);
          node(end + (mobile ? 40 : 58), y + dy, mobile ? 80 : 116, 42, 'VIP ' + 'AB'[i]);
        });
        node(start - (mobile ? 44 : 55), y, mobile ? 88 : 110, 56, T('文件 A', 'File A'));
      });
    }

    function sharedMounts() {
      const first = [T('首次挂载', 'First mount'), 'nconnect=4'];
      const later = [T('后续挂载', 'Later mount'), T('沿用四条连接', 'Reuses four')];
      if (mobile) {
        wire([[92, 174], [92, 243], [180, 243], [180, 294]]);
        wire([[268, 174], [268, 243], [180, 243]]);
        node(92, 136, 156, 76, ...first);
        node(268, 136, 156, 76, ...later);
        node(180, 325, 150, 62, T('服务端 IP', 'Server IP'));
      } else {
        wire([[250, 109], [458, 109], [458, 167], [615, 167]]);
        wire([[250, 225], [458, 225], [458, 167]]);
        node(145, 109, 210, 76, ...first);
        node(145, 225, 210, 76, ...later);
        node(710, 167, 190, 74, T('服务端 IP', 'Server IP'));
      }
    }

    function paint() {
      const t = elapsed % 5.6;
      for (const { path, length, packet, delay, still, duration } of flows) {
        const p = (t - delay) / duration;
        const u = reduced.matches ? still : Math.max(0, Math.min(1, p));
        const pos = path.getPointAtLength(length * u);
        packet.setAttribute('transform', 'translate(' + pos.x + ' ' + pos.y + ')');
        packet.style.opacity = reduced.matches ? 1 : Math.max(0, Math.min(1, p * 12, (1 - p) * 12));
      }
    }

    function tick(now) {
      elapsed += Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      paint();
      frame = requestAnimationFrame(tick);
    }

    function run() {
      cancelAnimationFrame(frame);
      if (paused || reduced.matches || !flows.length) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }

    function redraw() {
      const resized = mobile !== mq.matches;
      mobile = mq.matches;
      [width, height] = mobile ? [360, 420] : [864, 336];
      elapsed = 0;
      flows = [];
      svg.replaceChildren();
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      const title = T(...scenes[current]);
      svg.setAttribute('aria-label', title);
      label(width / 2, 25, title);
      if (current < 4) topology();
      else if (current === 4) fileRouting();
      else sharedMounts();
      label(width / 2, height - 16, T('示意，不代表实测数字', 'Schematic, no measured figures'), 'detail');
      paint();
      run();
      if (resized && opts.onLayout) opts.onLayout(width / height, mobile);
    }

    mq.addEventListener('change', redraw);
    reduced.addEventListener('change', redraw);
    document.addEventListener('ss-lang', redraw);
    redraw();
    const control = {
      show(i) { current = Math.max(0, Math.min(scenes.length - 1, i)); redraw(); },
      pause() { paused = true; cancelAnimationFrame(frame); },
      resume() { if (paused) { paused = false; run(); } },
      destroy() {
        this.pause();
        mq.removeEventListener('change', redraw);
        reduced.removeEventListener('change', redraw);
        document.removeEventListener('ss-lang', redraw);
        svg.remove();
        delete host.__anim;
      },
      ratio() { return width / height; },
      step() { return current; }
    };
    host.__anim = control;
    return control;
  }

  window.SSAnim = window.SSAnim || {};
  window.SSAnim['v-nconnect'] = { steps: 6, mount };
})();
