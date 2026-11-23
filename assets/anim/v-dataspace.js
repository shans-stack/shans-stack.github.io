(() => {
  const id = 'v-dataspace';
  const NS = 'http://www.w3.org/2000/svg';
  const steps = [
    ({mobile, width, box, track, visible}) => {
      const cx = width / 2;
      const y = mobile ? 75 : 80, hub = mobile ? 283 : 240, bus = (y + hub) / 2;
      const xs = mobile ? [61, 175, 289] : [153, 420, 687];
      const sites = [
        [['站点 A', 'Site A'], ['本地集群', 'On-Prem']],
        [['站点 B', 'Site B'], ['远端集群', 'Remote']],
        [['云站点', 'Cloud Site'], ['云集群', 'Cloud Cluster']]
      ];
      box(cx, hub, mobile ? 238 : 273, ['全局命名空间', 'Global Namespace'], ['已共享的目录', 'Shared Directories']);
      const links = sites.map(([title, detail], i) => {
        const x = xs[i];
        box(x, y, mobile ? 104 : 171, title, detail);
        return track([[x, y + 30], [x, bus], [cx, bus], [cx, hub - 30]], 'config');
      });
      return t => links.forEach((line, i) => visible(line, t >= 0.6 + i * 0.65));
    },
    ({mobile, box, track, tile, visible}) => {
      const origin = mobile ? [175, 63] : [420, 56];
      const siteX = mobile ? [86, 264] : [215, 625];
      const siteY = mobile ? 244 : 185;
      const cY = mobile ? 350 : 265;
      const paths = [['/shared', '/shared'], ['/datasets', '/datasets']];
      box(...origin, mobile ? 168 : 208, ['源路径 · A', 'Origin Path · A'], ['/research', '/research']);
      tile(origin[0], origin[1] + 31);
      const links = siteX.map((x, i) => {
        const site = i ? 'C' : 'B';
        box(x, siteY, mobile ? 151 : 208, ['卫星路径 · ' + site, 'Satellite Path · ' + site], paths[i]);
        box(x, cY, mobile ? 123 : 157, ['本地客户端', 'Local Client']);
        track([[x, siteY + 30], [x, cY - 30]]);
        const y = mobile ? 152 : 120;
        return track([[origin[0], origin[1] + 30], [origin[0], y], [x, y], [x, siteY - 30]], 'config');
      });
      return t => links.forEach((line, i) => visible(line, t >= 0.6 + i * 1.15));
    },
    diagramRead,
    diagramLease,
    ({mobile, label, box, track, tile, move}) => {
      const o = mobile ? [165, 55] : [146, 145];
      const b = mobile ? [87, 229] : [417, 65];
      const c = mobile ? [263, 229] : [417, 206];
      const app = mobile ? [87, 355] : [702, 65];
      const w = mobile ? 144 : 168;
      box(...o, w, ['源站点 A', 'Origin A']);
      box(...b, w, ['卫星 B', 'Satellite B']);
      box(...c, w, ['卫星 C', 'Satellite C']);
      box(...app, w, ['客户端写入', 'Client Write']);
      const first = mobile ? [[app[0], 325], [b[0], 259]]
        : [[618, app[1]], [501, b[1]]];
      const middle = mobile ? [[b[0], 199], [b[0], 135], [o[0], 135], [o[0], 85]]
        : [[333, b[1]], [282, b[1]], [282, o[1]], [230, o[1]]];
      const idle = mobile ? [[o[0], 85], [o[0], 135], [c[0], 135], [c[0], 199]]
        : [[230, o[1]], [282, o[1]], [282, c[1]], [333, c[1]]];
      const accept = move(track(first), 0.6, 1.65);
      const forward = move(track(middle), 1.65, 3.65);
      track(idle, 'idle');
      const status = label(mobile ? 250 : o[0], o[1] + 55, ['原版本', 'Original Version']);
      const cached = tile(c[0], c[1] + 49);
      const stale = label(c[0], c[1] + 74, ['已缓存', 'Cached']);
      return t => {
        accept(t);
        forward(t);
        const updated = t >= 3.65;
        status.textContent = updated ? T(['源端已更新', 'Origin Updated']) : T(['原版本', 'Original Version']);
        stale.textContent = updated ? T(['缓存失效', 'Cache Invalidated']) : T(['已缓存', 'Cached']);
        cached.classList.toggle(id + '-stale', updated);
      };
    },
    ({mobile, width, label, box, track, tile, move, visible}) => {
      const x0 = mobile ? 84 : 200, x1 = width - x0;
      const w = mobile ? 139 : 223;
      const options = [
        [mobile ? 103 : 88, ['全局访问', 'Global Access'], ['活动目录', 'Live Directory'], ['卫星缓存', 'Satellite Cache']],
        [mobile ? 290 : 226, ['异步复制', 'Async Replication'], ['源端快照', 'Snapshot'], ['远端恢复点', 'Recovery Point']]
      ];
      const motions = options.map(([y, title, src, dst], i) => {
        label(width / 2, y - 53, title, 'title');
        box(x0, y, w, src);
        box(x1, y, w, dst);
        const line = track([[x0 + w / 2, y], [x1 - w / 2, y]]);
        const start = i ? 3.7 : 1.6, end = i ? 5.8 : 3.5;
        const data = move(line, start, end);
        const req = i === 0 ? move(line, 0.4, 1.6, true, true) : null;
        for (const x of [x0, x1]) track([[x, y + 30], [x, y + 50]], 'config');
        tile(x0, y + 50);
        const copy = tile(x1, y + 50);
        return t => {
          data(t);
          req?.(t);
          visible(copy, t >= end);
        };
      });
      return t => motions.forEach(animate => animate(t));
    }
  ];

  const T = ([zh, en]) => window.SS_LANG === 'en' ? en : zh;

  function readRoute(mobile, box, track, lab, tile, lease) {
    const points = mobile ? [[175, 55], [175, 224], [175, 358]] : [[145, 142], [420, 142], [695, 142]];
    const [origin, satellite, client] = points;
    const w = mobile ? 192 : 178;
    box(...origin, w, ['源集群', 'Origin Cluster']);
    box(...satellite, w, ['卫星集群', 'Satellite Cluster']);
    box(...client, w, ['本地客户端', 'Local Client']);
    const status = lab(mobile ? 86 : satellite[0], satellite[1] + (mobile ? 61 : 62),
      lease ? ['读租约有效', 'Read Lease Valid'] : ['缓存未命中', 'Cache Miss']);
    const farPoints = mobile ? [[175, 85], [175, 194]] : [[234, 142], [331, 142]];
    const localPoints = mobile ? [[175, 254], [175, 328]] : [[509, 142], [606, 142]];
    const far = track(farPoints);
    const local = track(localPoints);
    lab(mobile ? 222 : 282, mobile ? 140 : 114, ['跨站点', 'Intersite']);
    tile(...farPoints[0]);
    const cachePoint = localPoints[0];
    const cached = tile(...cachePoint);
    return {far, local, status, cached, cachePoint};
  }

  function diagramRead({mobile, box, track, label, tile, move, visible}) {
    const {far, local, status, cached, cachePoint} = readRoute(mobile, box, track, label, tile, false);
    const prefetched = tile(cachePoint[0] + (mobile ? 22 : 0), cachePoint[1] + (mobile ? 0 : 23));
    const motions = [
      move(local, 0.4, 1.35, true, true),
      move(far, 1.35, 2.7, true, true),
      move(far, 2.7, 4.25),
      move(local, 4.25, 5.35),
      move(far, 4.65, 6.1)
    ];
    return t => {
      motions.forEach(animate => animate(t));
      visible(cached, t >= 4.25);
      visible(prefetched, t >= 6.1);
      status.textContent = T(t < 4.25 ? ['缓存未命中', 'Cache Miss']
        : t < 6.1 ? ['已缓存', 'Cached'] : ['已缓存及预取', 'Cached + Prefetched']);
    };
  }

  function diagramLease({mobile, box, track, label, tile, move}) {
    const {far, local, status, cached} = readRoute(mobile, box, track, label, tile, true);
    const stages = [
      ['读租约有效', 'Read Lease Valid'],
      ['缓存失效', 'Cache Invalidated'],
      ['缓存已刷新', 'Cache Refreshed']
    ];
    const motions = [
      move(local, 0.35, 1.25, true, true),
      move(local, 1.25, 2.25),
      move(local, 3.65, 4.6, true, true),
      move(far, 4.6, 5.65, true, true),
      move(far, 5.65, 6.8),
      move(local, 6.8, 7.75)
    ];
    return t => {
      motions.forEach(animate => animate(t));
      const stage = t < 3.05 ? 0 : t < 6.8 ? 1 : 2;
      status.textContent = T(stages[stage]);
      cached.classList.toggle(id + '-stale', stage === 1);
      if (stage !== 1) cached.style.fill = 'var(--l5)';
      else cached.style.removeProperty('fill');
    };
  }

  function mount(host, opts = {}) {
    const layout = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(NS, 'svg');
    svg.classList.add(id + '-scene');
    svg.setAttribute('role', 'img');
    host.replaceChildren(svg);

    let lines, nodes, tokens, frame;
    let step = 0, time = 0, last = 0, raf = 0, paused = !!opts.paused;
    let width, height;

    function draw(tag, attrs, style, parent) {
      const el = document.createElementNS(NS, tag);
      for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
      if (style) el.classList.add(id + '-' + style);
      parent.append(el);
      return el;
    }

    function label(x, y, value, style = 'detail') {
      const el = draw('text', {x, y}, style, nodes);
      el.textContent = T(value);
      return el;
    }

    function box(x, y, w, title, detail) {
      draw('rect', {x: x - w / 2, y: y - 30, width: w, height: 60, rx: 6}, 'box', nodes);
      label(x, y + (detail ? -6 : 4), title, 'title');
      if (detail) label(x, y + 16, detail);
    }

    function track(points, style = 'line') {
      return draw('path', {d: 'M' + points.map(point => point.join(' ')).join(' L')}, style, lines);
    }

    function tile(x, y, style = 'tile') {
      const block = draw('rect', {x: -8, y: -6, width: 16, height: 12, rx: 2}, style, tokens);
      block.setAttribute('transform', 'translate(' + x + ' ' + y + ')');
      return block;
    }

    function visible(el, on) {
      el.style.opacity = Number(on);
    }

    function move(path, start, end, reverse = false, request = false) {
      const distance = path.getTotalLength();
      const block = request
        ? draw('circle', {r: 4}, 'request', tokens)
        : tile(0, 0);
      return t => {
        const p = (t - start) / (end - start);
        if (p < 0 || p >= 1) {
          visible(block, 0);
          return;
        }
        const pt = path.getPointAtLength(distance * (reverse ? 1 - p : p));
        block.setAttribute('transform', 'translate(' + pt.x + ' ' + pt.y + ')');
        visible(block, Math.min(1, p * 10, (1 - p) * 10));
      };
    }

    function play(now) {
      time += Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      frame(time % 9);
      raf = requestAnimationFrame(play);
    }

    function run() {
      if (paused || reduced.matches) return;
      last = performance.now();
      raf = requestAnimationFrame(play);
    }

    function rebuild() {
      cancelAnimationFrame(raf);
      const mobile = layout.matches;
      width = mobile ? 350 : 840;
      height = mobile ? 420 : 328;
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      svg.setAttribute('aria-label', T(["跨站点全局访问的数据路径、缓存与恢复", "Cross-Site Global Access, Caching, and Recovery"]));
      svg.replaceChildren();
      lines = draw('g', {}, '', svg);
      nodes = draw('g', {}, '', svg);
      tokens = draw('g', {}, '', svg);
      frame = steps[step]({mobile, width, label, box, track, tile, move, visible});
      label(width / 2, height - 15, ['示意，不代表实测数字', 'Schematic, no measured figures'], 'note');
      frame(reduced.matches ? 8.5 : time % 9);
      opts.onLayout?.(width / height, mobile);
      run();
    }

    for (const query of [layout, reduced]) query.addEventListener('change', rebuild);
    document.addEventListener('ss-lang', rebuild);
    host.__anim = {
      show(i) {
        step = Math.max(0, Math.min(steps.length - 1, i));
        time = 0;
        rebuild();
      },
      pause() {
        paused = true;
        cancelAnimationFrame(raf);
      },
      resume() {
        if (!paused) return;
        paused = false;
        run();
      },
      destroy() {
        cancelAnimationFrame(raf);
        for (const query of [layout, reduced]) query.removeEventListener('change', rebuild);
        document.removeEventListener('ss-lang', rebuild);
        delete host.__anim;
        svg.remove();
      },
      ratio() { return width / height; },
      step() { return step; }
    };
    rebuild();
    return host.__anim;
  }

  (window.SSAnim ||= {})[id] = {steps: 6, mount};
})();
