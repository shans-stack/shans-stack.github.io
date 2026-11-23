(function () {
  'use strict';

  const id = 'f-lmcache';
  const scenes = [
    {
      note: ["连接器由推理引擎调用", "The inference engine calls the connector"],
      nodes: [
        [0, 0, ["vLLM", "vLLM"], ["管理活动 KV", "Manages active KV"], ""],
        [1, 0, ["KV 连接器", "KV Connector"], ["对接存取", "Links store and load"], ""],
        [2, 0, ["LMCache", "LMCache"], ["管理缓存层", "Manages cache tiers"], "active"]
      ],
      routes: [[0, 1, "ref"], [1, 2, "ref"]]
    },
    {
      note: ["查找返回条目位置", "Lookup returns the entry location"],
      nodes: [
        [0, 0, ["输入 token", "Prompt Tokens"], ["分块 A · B", "Chunks A · B"], ""],
        [1, 0, ["缓存索引", "Cache Index"], ["匹配前缀", "Matches the prefix"], ""],
        [2, 0, ["缓存块 A", "Cached Chunk A"], ["位置已知", "Location found"], "active"]
      ],
      routes: [[0, 1, "ref"], [1, 2, "ref"]]
    },
    {
      note: ["示例路径经主机内存写入后端", "Example write stages data in host memory"],
      nodes: [
        [0, 0, ["GPU", "GPU"], ["保留活动键值", "Keeps active KV"], ""],
        [1, 0, ["主机内存", "Host Memory"], ["接收副本", "Receives a copy"], "active"],
        [2, 0, ["存储后端", "Storage Backend"], ["按配置保留", "Retains as configured"], "active"]
      ],
      routes: [[0, 1, "copy"], [1, 2, "copy"]]
    },
    {
      note: ["GPU 使用已回读的前缀", "GPU uses the retrieved prefix"],
      nodes: [
        [0, 0, ["存储后端", "Storage Backend"], ["保留原条目", "Keeps source entry"], ""],
        [1, 0, ["主机内存", "Host Memory"], ["中转缓存块", "Stages the chunk"], ""],
        [2, 0, ["GPU", "GPU"], ["装入命中块", "Loads the matching chunk"], "active"]
      ],
      routes: [[0, 1, "copy"], [1, 2, "copy"]]
    },
    {
      note: ["新写入的键值可供后续复用", "New KV data can be reused later"],
      nodes: [
        [0, 0, ["缓存查找", "Cache Lookup"], ["未命中", "Miss"], "waiting"],
        [1, 0, ["预填充", "Prefill"], ["计算新 KV", "Computes new KV"], ""],
        [2, 0, ["LMCache", "LMCache"], ["写入新块", "Stores the new chunk"], "active"]
      ],
      routes: [[0, 1, "ref"], [1, 2, "copy"]]
    }
  ];
  const NS = 'http://www.w3.org/2000/svg';
  const size = { desktop: [900, 350], mobile: [380, 420] };
  const schematic = ['示意，不代表实测数字', 'Schematic, not measured'];

  function element(parent, tag, attrs) {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, value));
    parent.appendChild(el);
    return el;
  }

  function mount(host, opts = {}) {
    host.classList.add(id + '-anim');
    const svg = element(host, 'svg', { role: 'img' });
    const media = matchMedia('(max-width: 640px)');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let step = 0;
    let paused = Boolean(opts.paused);
    let frame = 0;
    let last = 0;
    let elapsed = 0;
    let duration = 0;
    let paint = () => {};

    function ratio() {
      const [w, h] = media.matches ? size.mobile : size.desktop;
      return w / h;
    }

    function draw() {
      const mobile = media.matches;
      const language = window.SS_LANG === 'en' ? 1 : 0;
      const { note, nodes, routes } = scenes[step];
      const [w, h] = mobile ? size.mobile : size.desktop;
      const paired = nodes.some(([, row]) => row === 1);
      const boxW = mobile ? (paired ? 174 : 252) : 232;
      const boxH = 90;
      const centers = nodes.map(([col, row]) => ({
        x: mobile ? (paired ? 97 + row * 186 : w / 2) : 151 + col * 299,
        y: mobile ? 54 + col * 135 : (paired ? 91 + row * 136 : 154)
      }));

      function label(x, y, value, className, anchor = 'middle') {
        const el = element(svg, 'text', { x, y, class: className, 'text-anchor': anchor });
        el.textContent = value[language];
        return el;
      }

      function chip(parent, kind, dx = 0) {
        return element(parent, 'rect', { x: dx - 5, y: -4, width: 10, height: 8, rx: 2, class: 'chip ' + kind });
      }

      svg.replaceChildren();
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.setAttribute('aria-label', note[language] + '. ' + nodes.map(([, , name, status]) =>
        [name[language], status[language]].filter(Boolean).join(' · ')).join('; '));
      svg.setAttribute('data-step', String(step + 1));
      duration = 0;

      const rail = element(svg, 'g', { 'aria-hidden': 'true' });
      const railPaths = routes.map(([from, to, kind]) => {
        const a = centers[from];
        const b = centers[to];
        const alongX = mobile ? a.y === b.y : a.x !== b.x;
        const direction = Math.sign(alongX ? b.x - a.x : b.y - a.y);
        const points = alongX
          ? [[a.x + direction * boxW / 2, a.y], [b.x - direction * boxW / 2, b.y]]
          : [[a.x, a.y + direction * boxH / 2], [b.x, b.y - direction * boxH / 2]];
        const [start, end] = points;
        let pathDirection = alongX ? [direction, 0] : [0, direction];
        if (kind === 'ref-map') {
          // Crossing mappings use separate diagonals so they never share a segment.
          pathDirection = [end[0] - start[0], end[1] - start[1]];
        } else if (start[0] !== end[0] && start[1] !== end[1]) {
          const axis = alongX ? 0 : 1;
          const middle = (start[axis] + end[axis]) / 2;
          points.splice(1, 0, alongX ? [middle, start[1]] : [start[0], middle],
            alongX ? [middle, end[1]] : [end[0], middle]);
        }
        const path = element(rail, 'path', {
          d: points.map((point, i) => (i === 0 ? 'M' : 'L') + point.join(' ')).join(' '), class: 'route ' + kind
        });
        if (kind !== 'link') {
          const [x, y] = end;
          const magnitude = Math.hypot(...pathDirection);
          const [dx, dy] = pathDirection.map(value => value / magnitude);
          const arrow = [[x - 6 * dx + 4 * dy, y - 6 * dy - 4 * dx], end,
            [x - 6 * dx - 4 * dy, y - 6 * dy + 4 * dx]];
          element(rail, 'polyline', { points: arrow.map(point => point.join(',')).join(' '), class: 'route arrow ' + kind });
        }
        return path;
      });

      nodes.forEach(([, , title, detail, state], i) => {
        const { x, y } = centers[i];
        element(svg, 'rect', { x: x - boxW / 2, y: y - boxH / 2, width: boxW, height: boxH, rx: 5, class: 'node ' + state });
        label(x, y - 22, title, 'name');
        label(x, y + 10, detail, 'detail');
      });
      label(mobile ? 12 : 35, mobile ? 381 : 302, note, 'note', 'start');
      label(mobile ? 12 : 35, mobile ? 405 : 326, schematic, 'detail', 'start');

      const arrivals = new Map();
      const flows = routes.flatMap(([from, to, kind], i) => {
        if (kind === 'link') return [];
        const path = railPaths[i];
        const length = path.getTotalLength();
        const start = Math.max(0.42 + i * 0.42, arrivals.get(from) || 0);
        const travel = Math.max(0.64, length / (mobile ? 155 : 310));
        const offsets = kind === 'batch' ? [0, 0.19, 0.38] : [0];
        const arrive = start + travel + offsets.at(-1);
        arrivals.set(to, arrive);
        const copying = kind === 'copy' || kind === 'batch';
        const copies = [];
        if (copying) {
          const previous = arrivals.get(from) || 0;
          const origin = centers[from];
          const target = centers[to];
          const pins = (point) => {
            const group = element(svg, 'g', { transform: `translate(${point.x} ${point.y + 35})` });
            offsets.forEach((_, j) => chip(group, kind, (j - (offsets.length - 1) / 2) * 14));
            return group;
          };
          copies.push([pins(origin), previous], [pins(target), arrive]);
        }
        const packets = kind === 'evict' ? [] : offsets.map(() => chip(svg, kind));
        duration = Math.max(duration, arrive + 1.45);
        return [{ path, length, start, travel, offsets, arrive, packets, copies, kind }];
      });

      paint = (seconds) => {
        const fade = Math.max(0, Math.min(1, (duration - seconds) / 0.43));
        flows.forEach(({ path, length, start, travel, offsets, arrive, packets, copies, kind }) => {
          path.style.opacity = kind === 'evict' && seconds >= start ? '0.32' : '1';
          copies.forEach(([group, at]) => group.setAttribute('opacity', seconds >= at ? fade : 0));
          packets.forEach((packet, i) => {
            const progress = (seconds - start - offsets[i]) / travel;
            const arrived = progress > 1;
            const point = path.getPointAtLength(length * Math.max(0, Math.min(1, progress)));
            packet.setAttribute('transform', `translate(${point.x} ${point.y})`);
            const opacity = arrived ? Math.max(0, 1 - (seconds - arrive) / 0.38) : Math.min(1, progress * 9);
            packet.setAttribute('opacity', progress < 0 || (arrived && copies.length) ? 0 : Math.min(fade, opacity));
          });
        });
      };
      paint(motion.matches ? Math.max(0, duration - 1) : elapsed);
    }

    function tick(now) {
      elapsed += Math.max(0, (now - last) / 1000);
      last = now;
      if (duration && elapsed >= duration) elapsed %= duration;
      paint(elapsed);
      frame = requestAnimationFrame(tick);
    }

    function play() {
      cancelAnimationFrame(frame);
      if (!paused && !motion.matches && duration) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    }

    function rebuild() {
      elapsed = 0;
      draw();
      if (opts.onLayout) opts.onLayout(ratio(), media.matches);
      play();
    }

    const control = {
      show(i) {
        step = Math.max(0, Math.min(scenes.length - 1, i));
        rebuild();
      },
      pause() {
        paused = true;
        cancelAnimationFrame(frame);
      },
      resume() {
        paused = false;
        play();
      },
      destroy() {
        control.pause();
        media.removeEventListener('change', rebuild);
        motion.removeEventListener('change', rebuild);
        document.removeEventListener('ss-lang', rebuild);
        svg.remove();
        host.classList.remove(id + '-anim');
        delete host.__anim;
      },
      ratio,
      step: () => step
    };
    media.addEventListener('change', rebuild);
    motion.addEventListener('change', rebuild);
    document.addEventListener('ss-lang', rebuild);
    host.__anim = control;
    rebuild();
    return control;
  }

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = { steps: scenes.length, mount };
})();
