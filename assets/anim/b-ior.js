(function () {
  const id = 'b-ior';
  const ns = 'http://www.w3.org/2000/svg';

  function mount(host, { onLayout } = {}) {
    const narrow = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(ns, 'svg');
    svg.classList.add(id + '-scene');
    svg.setAttribute('role', 'img');
    host.appendChild(svg);
    let mobile, w, h, cx, labels, updates;
    let current = 0, frame = 0, last = 0, elapsed = 0, paused = false;
    const duration = 4.2;
    const tr = value => Array.isArray(value) ? value[window.SS_LANG === 'en' ? 1 : 0] : value;
    const clamp = value => Math.max(0, Math.min(1, value));

    function draw(tag, attrs, style) {
      const element = document.createElementNS(ns, tag);
      for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
      if (style) element.setAttribute('class', id + '-' + style);
      svg.appendChild(element);
      return element;
    }

    function label(x, y, value, anchor = 'middle', style) {
      const element = draw('text', { x, y, 'text-anchor': anchor }, style);
      element.textContent = tr(value);
      labels.push(element.textContent);
      return element;
    }

    function block(x, y, width, height, style = 'box') {
      return draw('rect', { x: x - width / 2, y: y - height / 2, width, height, rx: 4 }, style);
    }

    function box(x, y, width, value, style = 'box', height = 40) {
      block(x, y, width, height, style);
      return label(x, y, value);
    }

    function path(points, style = 'line') {
      return draw('path', { d: 'M' + points.map(point => point.join(' ')).join(' L') }, style);
    }

    function reveal(element, delay = 0) {
      updates.push(t => element.setAttribute('opacity', clamp((t - delay) * 5)));
      return element;
    }

    function travel(route, start, seconds, size = 12, style = 'token', reverse = false) {
      const length = route.getTotalLength();
      const token = block(0, 0, size, 10, style);
      updates.push(t => {
        const p = clamp((t - start) / seconds);
        const point = route.getPointAtLength(length * (reverse ? 1 - p : p));
        token.setAttribute('transform', 'translate(' + point.x + ' ' + point.y + ')');
        token.setAttribute('opacity', Math.min(1, p * 12, (1 - p) * 12));
      });
    }

    function ratio() { return w / h; }
    function paint(time) { updates.forEach(update => update(time)); }
    function stop() { cancelAnimationFrame(frame); frame = 0; }
    function tick(now) {
      elapsed = Math.min(duration, elapsed + Math.max(0, now - last) / 1000);
      last = now;
      paint(elapsed);
      frame = elapsed < duration ? requestAnimationFrame(tick) : 0;
    }

    function start() {
      if (paused || frame || reduced.matches || elapsed >= duration) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }

    function show(index) {
      stop();
      current = Math.max(0, Math.min(scenes.length - 1, index));
      elapsed = 0;
      labels = [];
      updates = [];
      svg.replaceChildren();
      toggle.hidden = current !== 1;
      scenes[current]();
      label(cx, h - 17, ['示意，不代表实测数字', 'Schematic · No Measured Values'], 'middle', 'note');
      svg.setAttribute('aria-label', labels.join(' · '));
      paint(reduced.matches ? duration : 0);
      start();
    }

    function redraw() { show(current); }

    function layout() {
      mobile = narrow.matches;
      w = mobile ? 360 : 780;
      h = mobile ? 340 : 300;
      cx = w / 2;
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      onLayout?.(ratio(), mobile);
      redraw();
    }

    const toggle = document.createElement('button');
    toggle.className = 'btn ' + id + '-toggle';
    toggle.type = 'button';
    toggle.hidden = true;
    host.classList.add(id + '-host');
    host.appendChild(toggle);
    let perProcess = false;
    toggle.addEventListener('keydown', event => {
      if (event.key === ' ') event.stopPropagation();
    });
    toggle.addEventListener('click', () => {
      perProcess = !perProcess;
      show(current);
    });

    function ranks(targets, widths, heading) {
      const span = mobile ? 70 : 165;
      const origin = mobile ? 62 : 58;
      const destination = mobile ? 178 : 172;
      [cx - span, cx + span].forEach((x, i) => {
        const tx = targets[i];
        const route = path([[x, origin + 20], [x, 111], [tx, 111], [tx, destination - 20]]);
        [0.2, 0.96, 1.72].forEach(t => travel(route, t, 0.85, 12, i ? 'alt' : 'token'));
        box(x, origin, mobile ? 111 : 172, tr(['进程 ', 'Rank ']) + i);
      });
      if (targets[0] === targets[1]) {
        box(cx, destination, widths, heading, 'accent');
      } else {
        targets.forEach((x, i) => box(x, destination, widths, heading[i], 'accent'));
      }
    }

    const scenes = [
      () => {
        ranks([cx, cx], mobile ? 235 : 291, ['并行存储', 'Parallel Storage']);
        label(cx, 232, ['MPI 协调 · 聚合吞吐', 'MPI Coordination · Aggregate I/O'], 'middle', 'note');
      },
      () => {
        const span = mobile ? 70 : 165;
        if (perProcess) {
          ranks([cx - span, cx + span], mobile ? 108 : 150, [['文件 A', 'File A'], ['文件 B', 'File B']]);
        } else {
          const origin = mobile ? 62 : 58, destination = mobile ? 178 : 172;
          const outer = mobile ? 250 : 510;
          const target = mobile ? 58 : 115;
          block(cx, destination, outer, 46, 'accent');
          path([[cx, destination - 23], [cx, destination + 23]], 'guide');
          [cx - span, cx + span].forEach((x, i) => {
            const tx = cx + (i * 2 - 1) * target;
            const route = path([[x, origin + 20], [x, 111], [tx, 111], [tx, destination - 23]]);
            travel(route, 0.22 + i * 0.16, 1.3, 12, i ? 'alt' : 'token');
            box(x, origin, mobile ? 111 : 172, tr(['进程 ', 'Rank ']) + i);
            label(tx, destination, i === 0 ? ['区间 A', 'Region A'] : ['区间 B', 'Region B']);
          });
          label(cx, destination + 39, ['同一个文件', 'One Shared File']);
        }
        toggle.textContent = tr(perProcess ? ['切换到共享文件', 'Switch to Shared File'] : ['切换到每进程一文件', 'Switch to File per Process']);
      },
      () => {
        const left = mobile ? 27 : 145;
        const width = w - 2 * left;
        const split = width / 2;
        [0, 1].forEach(segment => {
          const x = left + split * (segment + 0.5);
          label(x, 49, tr(['段 ', 'Segment ']) + (segment + 1) + ' · -s');
          [0, 1].forEach(rank => {
            const y = 111 + rank * 77;
            block(x, y, split - 12, 36, rank ? 'quiet' : 'box');
            for (let part = 0; part < 3; part++) {
              const tx = x + (part - 1) * (split - 28) / 3;
              reveal(block(tx, y, (split - 29) / 3 - 4, 17, rank ? 'alt' : 'token'),
                0.15 + segment * 1.26 + part * 0.34 + rank * 0.17);
            }
          });
        });
        label(cx, 236, ['块 -b  ·  传输 -t', 'Block -b  ·  Transfer -t'], 'middle', 'note');
      },
      () => {
        const a = mobile ? 66 : 141, b = w - a;
        const boxWidth = mobile ? 128 : 174;
        const half = boxWidth / 2;
        const top = 81, bottom = 190;
        label(a, 35, ['同节点读回', 'Local Readback'], 'start');
        label(a, 143, ['跨节点读回', 'Cross-Node Readback'], 'start');
        const local = path([[b - half, top], [a + half, top]]);
        const remote = path([[b - half, bottom], [a + half, bottom]]);
        box(a, top, boxWidth, ['进程 A', 'Rank A']);
        box(b, top, boxWidth, ['A 的缓存', 'Cache A']);
        box(a, bottom, boxWidth, ['进程 B', 'Rank B']);
        box(b, bottom, boxWidth, ['共享存储', 'Shared Storage'], 'accent');
        travel(local, 0.23, 1.22);
        travel(remote, 0.23, 1.22);
        label(cx, 238, ['跨节点路径跳过 A 的本地缓存', 'Cross-Node Path Skips Cache A'], 'middle', 'note');
      },
      () => {
        const a = mobile ? 25 : 133, b = w - a;
        const span = b - a;
        const stops = [a, a + span * 0.23, a + span * 0.77, b];
        const y = 117;
        const phases = [['打开', 'Open'], ['传输', 'Transfer'], ['关闭', 'Close']];
        phases.forEach((phase, i) => {
          const begin = stops[i], end = stops[i + 1];
          path([[begin, y], [end, y]], i === 1 ? 'active' : 'line');
          label((begin + end) / 2, y - 29, phase);
        });
        stops.forEach(x => path([[x, y - 10], [x, y + 10]]));
        const timeline = path([[a, y], [b, y]]);
        travel(timeline, 0.3, 2.6);
        reveal(box(cx, 204, mobile ? 267 : 342, ['每次迭代 · 读、写 MiB/s', 'Each Run · Read and Write MiB/s'], 'accent'), 2.72);
      }
    ];

    narrow.addEventListener('change', layout);
    reduced.addEventListener('change', redraw);
    document.addEventListener('ss-lang', redraw);
    layout();

    return host.__anim = {
      show,
      pause() { paused = true; stop(); },
      resume() { paused = false; start(); },
      destroy() {
        stop();
        narrow.removeEventListener('change', layout);
        reduced.removeEventListener('change', redraw);
        document.removeEventListener('ss-lang', redraw);
        svg.remove();
        toggle.remove();
        host.classList.remove(id + '-host');
        delete host.__anim;
      },
      ratio,
      step: () => current
    };
  }

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = { steps: 5, mount };
}());
