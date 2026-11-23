(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const titles = [
    ['本地 EBox 与云实例', 'On-Premises EBoxes and Cloud VMs'],
    ['云集群的持久化模式', 'Cloud Cluster Persistence Mode'],
    ['全局访问的按需读取', 'On-Demand Reads with Global Access'],
    ['市场条目与集群部署', 'Marketplace Listings and Provisioning'],
    ['原生服务与虚拟机集群', 'Native Service and VM Cluster'],
    ['两种集群部署形态', 'Two Cluster Deployment Models'],
    ['官网描述的租户内部署', 'Deployment Described by the Vendor']
  ];

  function mount(host, opts = {}) {
    const mq = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(NS, 'svg');
    svg.classList.add('v-cloud-scene');
    svg.setAttribute('role', 'img');
    host.replaceChildren(svg);

    let current = 0, frame = 0, last = 0, elapsed = 0, mobile, width, height;
    let flows = [], cached, paused = !!opts.paused;
    const T = (zh, en) => window.SS_LANG === 'en' ? en : zh;
    const local = () => T('本地集群', 'On-premises cluster');
    const cloud = () => T('云集群', 'Cloud cluster');

    function add(tag, attrs, value) {
      const el = document.createElementNS(NS, tag);
      for (const [key, val] of Object.entries(attrs)) el.setAttribute(key, val);
      if (value !== undefined) el.textContent = value;
      svg.appendChild(el);
      return el;
    }

    function label(x, y, value, kind = 'label') {
      add('text', { x, y, class: 'v-cloud-' + kind }, value);
    }

    function box(x, y, w, h, title, detail = '') {
      add('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 8, class: 'v-cloud-node' });
      label(x, y - (detail ? 10 : 0), title);
      if (detail) label(x, y + 14, detail, 'detail');
    }

    function wire(points, kind = 'wire') {
      return add('path', { d: 'M' + points.map(p => p.join(' ')).join(' L'), class: 'v-cloud-' + kind });
    }

    function block(x, y, kind = 'data') {
      return add('rect', { x: x - 5, y: y - 5, width: 10, height: 10, rx: 2, class: 'v-cloud-' + kind });
    }

    function travel(path, start = 0, duration = 1.65, kind = 'data') {
      flows.push({ path, length: path.getTotalLength(), packet: block(0, 0, kind), start, duration });
    }

    function compare() {
      [0, 1].forEach((index) => {
        const x = mobile ? 180 : 219 + index * 426;
        const dy = mobile ? index * 167 : 0;
        const appY = (mobile ? 74 : 91) + dy;
        const clusterY = (mobile ? 150 : 238) + dy;
        const path = wire([[x, appY + 19], [x, clusterY - 36]]);
        travel(path, index * 0.12);
        box(x, appY, 150, 38, T('客户端', 'Client'));
        box(x, clusterY, mobile ? 270 : 322, 72,
          index ? T('云实例集群', 'Cloud instance cluster') : T('本地 EBox 集群', 'On-premises EBox cluster'),
          index ? T('CNode、DNode · 实例本地 SSD', 'CNode, DNode · Local SSD') :
            T('CNode、DNode · 物理闪存盘', 'CNode, DNode · Physical flash'));
      });
    }

    function persistence() {
      const [sx, sy, dx, dy] = mobile ? [125, 112, 235, 316] : [192, 145, 672, 209];
      const path = wire(mobile ?
        [[sx, sy + 38], [sx, 211], [dx, 211], [dx, dy - 38]] :
        [[sx + 124, sy], [435, sy], [435, dy], [dx - 124, dy]]);
      travel(path, 0.5, 1.55);
      box(sx, sy, mobile ? 214 : 248, 76, T('实例本地 NVMe SSD', 'Local NVMe SSD'), T('本地盘随宿主机', 'Disks tied to the host'));
      box(dx, dy, mobile ? 214 : 248, 76, T('云对象存储', 'Cloud object storage'), T('持久化检查点', 'Persistent checkpoint'));
      block(sx, sy + 27);
      cached = block(dx, dy + 27);
      label(mobile ? 180 : 490, mobile ? 235 : 181, T('写入副本', 'Write a copy'), 'detail');
    }

    function read() {
      const [sx, vx, ax] = mobile ? [180, 180, 180] : [135, 432, 729];
      const [sy, vy, ay] = mobile ? [315, 201, 87] : [170, 170, 170];
      const [sw, vw, aw] = mobile ? [234, 234, 234] : [228, 242, 200];
      const entry = mobile ? [[sx, sy - 36], [vx, vy + 36]] : [[sx + sw / 2, sy], [vx - vw / 2, vy]];
      const exit = mobile ? [[vx, vy - 36], [ax, ay + 36]] : [[vx + vw / 2, vy], [ax - aw / 2, ay]];
      travel(wire(entry), 0.12, 1.93);
      travel(wire(exit), 2.17, 1.25);
      box(sx, sy, sw, 72, local(), T('源目录', 'Source directory'));
      box(vx, vy, vw, 72, T('云上卫星集群', 'Cloud satellite cluster'), T('读取缓存', 'Read cache'));
      box(ax, ay, aw, 72, T('云端应用', 'Cloud application'));
      block(sx, sy + 26);
      cached = block(vx, vy + 26);
    }

    function provision() {
      const aws = current === 3;
      const market = aws ? T('云市场 · 产品条目', 'Marketplace · Product listings') : T('云市场 · 产品入口', 'Marketplace · Product listing');
      const first = aws ? T('Polaris 控制平面', 'Polaris control plane') : T('原生 ISV 服务', 'Native ISV service');
      const second = aws ? T('VPC 内的集群', 'Cluster in VPC') : T('云虚拟机集群', 'Cloud VM cluster');
      const note = T('部署控制请求', 'Provisioning request');
      const path = wire(mobile ? [[180, 172], [180, 276]] : [[307, 200], [557, 200]], 'control');
      travel(path, 0.45, 1.65, 'operation');
      label(width / 2, mobile ? 70 : 78, market, 'detail');
      box(mobile ? 180 : 185, mobile ? 140 : 200, 244, 64, first);
      box(mobile ? 180 : 679, mobile ? 308 : 200, 244, 64, second);
      label(mobile ? 269 : 432, mobile ? 226 : 176, note, 'detail');
    }

    function deployment() {
      const oci = current === 6;
      const [x1, x2, y1, y2] = mobile ? [180, 180, oci ? 108 : 221, 331] : [oci ? 207 : 480, oci ? 655 : 739, 186, 186];
      const w = mobile ? 232 : oci ? 252 : 220;
      const path = wire(mobile ? [[x2, y2 - 32], [x1, y1 + 32]] :
        [[x2 - w / 2, y2], [x1 + w / 2, y1]], oci ? 'control' : 'wire');
      if (!oci) travel(path, 0.6, 1.55);
      if (!oci) {
        const solo = mobile ? [180, 94] : [153, 186];
        box(...solo, mobile ? 232 : 244, 64, cloud(), T('独立部署', 'Standalone'));
      }
      box(x1, y1, w, 64, cloud(), oci ? T('公有云租户内', 'Inside cloud tenancy') : T('混合部署', 'Hybrid'));
      box(x2, y2, w, 64, local());
      label(mobile ? 252 : (x1 + x2) / 2, mobile ? (y1 + y2) / 2 : 130,
        T('全局访问', 'Global Access'), 'detail');
    }

    function paint() {
      const t = elapsed % 5.4;
      for (const { path, length, packet, start, duration } of flows) {
        const p = (t - start) / duration;
        const u = reduced.matches ? 0.7 : Math.max(0, Math.min(1, p));
        const pos = path.getPointAtLength(length * u);
        packet.setAttribute('transform', 'translate(' + pos.x + ' ' + pos.y + ')');
        packet.style.opacity = reduced.matches ? 1 : Math.max(0, Math.min(1, p * 12, (1 - p) * 12));
      }
      if (cached) cached.style.opacity = reduced.matches ? 1 : Math.max(0, Math.min(1, (t - 2.05) * 5, (5.4 - t) * 4));
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
      [width, height] = mobile ? [360, 400] : [864, 320];
      elapsed = 0;
      flows = [];
      cached = null;
      svg.replaceChildren();
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      const title = T(...titles[current]);
      svg.setAttribute('aria-label', title);
      label(width / 2, 25, title);
      [compare, persistence, read, provision, provision, deployment, deployment][current]();
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
  window.SSAnim['v-cloud'] = { steps: 7, mount };
})();
