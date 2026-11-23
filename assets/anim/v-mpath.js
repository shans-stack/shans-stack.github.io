(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const titles = [
    ['多个 RPC 共用一条 TCP 连接', 'Multiple RPCs on One TCP Connection'],
    ['nconnect=4 · 同一服务端 IP', 'nconnect=4 · One Server IP'],
    ['一个 VIP 进入一台 CNode', 'One VIP Reaches One CNode'],
    ['单连接与跨 VIP 多路径', 'Single Path and Multiple VIPs'],
    ['同一挂载点使用两块网卡', 'Two Client NICs for One Mount'],
    ['同一文件的读写路径', 'I/O Paths for the Same File'],
    ['原生挂载与增强客户端', 'Native Mounts and the Enhanced Client']
  ];

  function mount(host, opts = {}) {
    const mq = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(NS, 'svg');
    svg.classList.add('v-mpath-scene');
    svg.setAttribute('role', 'img');
    host.replaceChildren(svg);

    let current = 0, frame = 0, last = 0, elapsed = 0, mobile, width, height;
    let flows = [], counters = [], paused = !!opts.paused;
    const T = (zh, en) => window.SS_LANG === 'en' ? en : zh;

    function add(tag, attrs, value) {
      const el = document.createElementNS(NS, tag);
      for (const [key, val] of Object.entries(attrs)) el.setAttribute(key, val);
      if (value !== undefined) el.textContent = value;
      svg.appendChild(el);
      return el;
    }

    function label(x, y, value, kind = 'label') {
      return add('text', { x, y, class: 'v-mpath-' + kind }, value);
    }

    function node(x, y, w, h, title, detail = '', idle = false) {
      add('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 8, class: idle ? 'v-mpath-idle-node' : 'v-mpath-node' });
      label(x, y - (detail ? 10 : 0), title);
      if (detail) label(x, y + 13, detail, 'detail');
    }

    function wire(points, kind = '') {
      return add('path', { d: 'M' + points.map(p => p.join(' ')).join(' L'), class: 'v-mpath-wire ' + kind });
    }

    function request(path, delay, still, duration = 2.05, counter = null) {
      const packet = add('rect', { x: -5, y: -5, width: 10, height: 10, rx: 2, class: 'v-mpath-request ' + (counter?.kind || '') });
      flows.push({ path, length: path.getTotalLength(), packet, delay, still, duration, counter });
    }

    function topology() {
      const mountLabel = T('NFS 挂载点', 'NFS mount');
      const named = current === 2;
      const offsets = current === 0 ? [0] : [-21, -7, 7, 21];
      offsets.forEach((offset, i) => {
        const points = mobile
          ? [[180 + offset, 112], [180 + offset, 186 + offset], [named ? 98 + offset : 180 + offset, 186 + offset], [named ? 98 + offset : 180 + offset, 277]]
          : [[195, 179 + offset], [414 + offset, 179 + offset], [414 + offset, (named ? 124 : 179) + offset], [520, (named ? 124 : 179) + offset]];
        const path = wire(points);
        if (current === 0) [0, 0.6, 1.2].forEach((delay, j) => request(path, delay, 0.24 + j * 0.25));
        else request(path, i * 0.18, 0.28 + i * 0.14);
      });
      if (mobile) {
        node(180, 82, 176, 60, mountLabel);
        if (named) {
          node(98, 312, 132, 70, 'CNode A', 'VIP A');
          node(262, 312, 132, 70, 'CNode B', T('空闲', 'Idle'), true);
        } else node(180, 312, 176, 70, T('服务端 IP', 'Server IP'));
      } else {
        node(110, 179, 170, 75, mountLabel);
        if (named) {
          node(599, 124, 158, 70, 'CNode A', 'VIP A');
          node(599, 234, 158, 70, 'CNode B', T('空闲', 'Idle'), true);
        } else node(599, 179, 158, 75, T('服务端 IP', 'Server IP'));
      }
    }

    function compareDelivery() {
      [false, true].forEach((multi, lane) => {
        const y = (mobile ? 101 : 85) + lane * (mobile ? 170 : 146);
        const title = multi ? 'remoteports · 2 VIP' + (window.SS_LANG === 'en' ? 's' : '') : T('单连接', 'One connection');
        const kind = multi ? 'parallel' : 'single';
        label(width / 2, y - (multi ? 65 : 34), title);
        const counter = { kind, label: label(width / 2, y + (multi ? 91 : 52), '', 'detail'), count: 0 };
        counters.push(counter);
        const source = mobile ? 75 : 133;
        const target = mobile ? 289 : 577;
        const w = mobile ? 98 : 126;
        const start = source + w / 2;
        const end = target - w / 2;
        const offsets = multi ? [-19, -7, 7, 19] : [0];
        offsets.forEach((offset, index) => {
          const dest = multi ? (index < 2 ? -33 : 33) + (index % 2 ? 5 : -5) : 0;
          const bend = (start + end) / 2 + (index < 2 ? -6 : 6);
          const path = wire([[start, y + offset], [bend, y + offset], [bend, y + dest], [end, y + dest]], kind);
          const delays = multi ? [index * 0.16, 2 + index * 0.16] : [0, 1.15, 2.3];
          delays.forEach((delay, i) => request(path, delay, i ? 0.53 : null, 1.65, counter));
        });
        node(source, y, w, 49, T('挂载点', 'Mount'));
        if (multi) {
          node(target, y - 33, w, 40, 'VIP A');
          node(target, y + 33, w, 40, 'VIP B');
        } else node(target, y, w, 49, 'VIP A');
      });
    }

    function clientNics() {
      const mountLabel = T('NFSv3 挂载点', 'NFSv3 mount');
      for (const [i, name] of ['A', 'B'].entries()) {
        if (mobile) {
          const x = i ? 263 : 97;
          wire([[180, 105], [180, 138], [x, 138], [x, 174]]);
          const path = wire([[x, 228], [x, 312]], 'parallel');
          request(path, i * 0.2, 0.55);
          node(x, 201, 132, 54, T('网卡 ', 'NIC ') + name, T('源 IP ', 'Source IP ') + name);
          node(x, 343, 132, 62, 'CNode ' + name, 'VIP ' + name);
        } else {
          const y = i ? 232 : 126;
          wire([[178, 179], [236, 179], [236, y], [286, y]]);
          const path = wire([[430, y], [532, y]], 'parallel');
          request(path, i * 0.2, 0.55);
          node(358, y, 144, 58, T('网卡 ', 'NIC ') + name, T('源 IP ', 'Source IP ') + name);
          node(600, y, 136, 58, 'CNode ' + name, 'VIP ' + name);
        }
      }
      if (mobile) node(180, 78, 174, 54, mountLabel);
      else node(99, 179, 158, 62, mountLabel);
    }

    function fileRouting() {
      [0, 1].forEach(version => {
        const y = (mobile ? 130 : 100) + version * (mobile ? 172 : 142);
        const start = mobile ? 121 : 242;
        const end = mobile ? 250 : 522;
        const mid = (start + end) / 2;
        label(mobile ? width / 2 : 173, y - (mobile ? 55 : 41), version ? 'NFSv4' : 'NFSv3');
        [0, 1].forEach(i => {
          const dy = i ? 27 : -27;
          const idle = version === 1 && i === 1;
          const path = wire([[start, y + dy / 2], [mid, y + dy / 2], [mid, y + dy], [end, y + dy]], idle ? 'idle' : 'parallel');
          if (!idle) request(path, i * 0.26, 0.67);
          const w = mobile ? 91 : 124;
          node(end + w / 2, y + dy, w, 40, 'VIP ' + 'AB'[i], '', idle);
        });
        const w = mobile ? 101 : 138;
        node(start - w / 2, y, w, 58, T('文件 A', 'File A'));
      });
    }

    function sharedMounts() {
      const first = T('首次挂载', 'First mount');
      const later = T('后续挂载', 'Later mount');
      const reuse = T('复用连接', 'Reuses connections');
      const server = T('服务端 IP', 'Server IP');
      const enhanced = T('增强 NFS 客户端', 'Enhanced NFS client');
      if (mobile) {
        wire([[83, 127], [83, 157], [180, 157], [180, 190]]);
        wire([[266, 127], [266, 157], [180, 157]]);
        node(83, 94, 140, 66, first, 'nconnect=4');
        node(266, 94, 158, 66, later, reuse);
        node(180, 218, 150, 56, server);
        wire([[227, 320], [260, 320]], 'parallel');
        node(120, 320, 214, 58, enhanced);
        node(303, 320, 86, 58, T('多 VIP', 'VIPs'));
      } else {
        wire([[230, 105], [364, 105], [364, 150], [520, 150]]);
        wire([[230, 195], [364, 195], [364, 150]]);
        node(130, 105, 200, 66, first, 'nconnect=4');
        node(130, 195, 200, 66, later, reuse);
        node(597, 150, 154, 56, server);
        wire([[230, 283], [520, 283]], 'parallel');
        node(130, 283, 200, 58, enhanced);
        node(597, 283, 154, 58, T('多个 VIP', 'Multiple VIPs'));
      }
    }

    function paint() {
      const t = elapsed % 5.6;
      for (const counter of counters) counter.count = 0;
      for (const { path, length, packet, delay, still, duration, counter } of flows) {
        const p = (t - delay) / duration;
        const u = reduced.matches ? (still ?? 1) : Math.max(0, Math.min(1, p));
        const pos = path.getPointAtLength(length * u);
        packet.setAttribute('transform', 'translate(' + pos.x + ' ' + pos.y + ')');
        packet.style.opacity = reduced.matches ? Number(still != null) : Math.max(0, Math.min(1, p * 12, (1 - p) * 12));
        if (counter && (reduced.matches ? still == null : p >= 1)) counter.count++;
      }
      for (const counter of counters) counter.label.textContent = T('已送达 ', 'Delivered ') + counter.count;
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
      [width, height] = mobile ? [360, 420] : [720, 360];
      elapsed = 0;
      flows = [];
      counters = [];
      svg.replaceChildren();
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      const title = T(...titles[current]);
      svg.setAttribute('aria-label', title);
      label(width / 2, 24, title);
      if (current < 3) topology();
      else [compareDelivery, clientNics, fileRouting, sharedMounts][current - 3]();
      label(width / 2, height - 16, T('示意，不代表实测数字', 'Schematic, not measured'), 'detail');
      paint();
      run();
      if (resized && opts.onLayout) opts.onLayout(width / height, mobile);
    }

    mq.addEventListener('change', redraw);
    reduced.addEventListener('change', redraw);
    document.addEventListener('ss-lang', redraw);
    redraw();
    const control = {
      show(i) { current = Math.max(0, Math.min(titles.length - 1, i)); redraw(); },
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
  window.SSAnim['v-mpath'] = { steps: 7, mount };
})();
