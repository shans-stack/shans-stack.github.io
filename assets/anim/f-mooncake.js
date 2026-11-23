(function () {
  'use strict';

  const id = 'f-mooncake';
  const scenes = [
    {
      note: ["同一请求跨两个节点处理", "Two nodes serve the same request"],
      nodes: [
        [0, 0, ["输入", "Input"], ["请求 token", "Prompt tokens"], ""],
        [1, 0, ["预填充节点", "Prefill Node"], ["建立请求 KV", "Builds request KV"], ""],
        [2, 0, ["解码节点", "Decode Node"], ["用 KV 生成", "Generates using KV"], "active"]
      ],
      routes: [[0, 1, "data"], [1, 2, "copy"]]
    },
    {
      note: ["选择命中且负载较低的节点", "The cache hit with lighter load is chosen"],
      nodes: [
        [0, 0, ["Conductor", "Conductor"], ["评估首 token 时延", "Estimates first-token delay"], ""],
        [2, 0, ["预填充 A", "Prefill A"], ["命中 · 负载较低", "Hit · light load"], "active"],
        [2, 1, ["预填充 B", "Prefill B"], ["命中 · 负载升高", "Hit · rising load"], "waiting"]
      ],
      routes: [[0, 2, "link"], [0, 1, "ref"]]
    },
    {
      note: ["前缀复用后补算未命中的输入", "Prefill computes the uncached suffix"],
      nodes: [
        [0, 0, ["缓存池", "Cache Pool"], ["已存前缀 KV", "Cached prefix KV"], ""],
        [1, 0, ["预填充节点", "Prefill Node"], ["补算后缀", "Computes the suffix"], "active"],
        [2, 0, ["解码节点", "Decode Node"], ["接收键值", "Receives KV data"], "active"]
      ],
      routes: [[0, 1, "copy"], [1, 2, "copy"]]
    },
    {
      note: ["位置查询与键值传输各走一路", "Lookup and KV data take separate paths"],
      nodes: [
        [0, 0, ["存储客户端", "Storage Client"], ["持有对象", "Holds the object"], ""],
        [2, 0, ["读取客户端", "Reading Client"], ["接收键值", "Receives KV data"], "active"],
        [2, 1, ["Master Service", "Master Service"], ["返回对象位置", "Returns object location"], ""]
      ],
      routes: [[2, 1, "ref"], [0, 1, "copy"]]
    },
    {
      note: ["一批数据写入已注册的目标内存", "A batch lands in registered destination memory"],
      nodes: [
        [0, 0, ["源缓冲区", "Source Buffer"], ["已注册内存", "Registered memory"], ""],
        [1, 1, ["Transfer Engine", "Transfer Engine"], ["批量传输", "Batched transfer"], ""],
        [2, 0, ["目标缓冲区", "Destination Buffer"], ["接收数据副本", "Receives data copies"], "active"]
      ],
      routes: [[1, 0, "ref"], [0, 2, "batch"]]
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
