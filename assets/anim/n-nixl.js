(function () {
  const id = 'n-nixl';
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

  function kvTiles({ group, x, top, add }, copies = false) {
    for (let col = 0; col < 3; col++) {
      add(group, 'rect', {
        x: x - 29 + col * 21, y: top + 35, width: 16, height: 14, rx: 2,
        class: 'n-nixl-cache' + (copies ? ' n-nixl-copy' : '')
      });
    }
  }

  const scenes = [
    {
      caption: 'Prefill 保留源 KV Cache，NIXL 将其复制到 Decode|Prefill keeps its KV cache while NIXL copies it to decode',
      draw({ box, connect }) {
        box('prefill', [170, 148, 180, 67], 'Prefill GPU', { art: kvTiles });
        box('transfer', [450, 148, 180, 196], 'NIXL', { note: '点对点传输|Peer Transfer', tone: 'active' });
        box('decode', [730, 148, 180, 325], 'Decode GPU', { art: art => kvTiles(art, true) });
        connect('prefill', 'transfer', { start: 0.35 });
        connect('transfer', 'decode', { start: 1.1 });
      }
    },
    {
      caption: '两个代理各自在本地登记 GPU 缓冲区|Each agent registers its local GPU buffer',
      draw({ box, connect }) {
        box('prefill', [230, 86, 92, 85], 'Prefill GPU', { art: kvTiles });
        box('decode', [670, 86, 268, 85], 'Decode GPU', { art: kvTiles });
        box('left', [230, 225, 92, 272], 'NIXL', { note: '源代理|Source Agent' });
        box('right', [670, 225, 268, 272], '目标代理|Target Agent', { note: '本地注册|Local Registration' });
        connect('prefill', 'left', { style: 'control', start: 0.35 });
        connect('decode', 'right', { style: 'control', start: 0.35 });
      }
    },
    {
      caption: '代理交换控制元数据，GPU 缓冲区不在交换路径上|Agents exchange control metadata while GPU buffers stay off that path',
      draw({ box, connect }) {
        box('left', [195, 100, 92, 117], 'NIXL', { note: '源代理|Source Agent' });
        box('right', [705, 100, 268, 117], '目标代理|Target Agent', { note: '缓存元数据|Cache Metadata' });
        box('prefill', [195, 221, 92, 293], 'Prefill GPU', { art: kvTiles, tone: 'idle' });
        box('decode', [705, 221, 268, 293], 'Decode GPU', { tone: 'idle' });
        connect('left', 'right', { style: 'control', start: 0.38, offset: -10 });
        connect('right', 'left', { style: 'control', start: 1.12, offset: 10 });
      }
    },
    {
      caption: 'Decode 发出读请求，KV Cache 从 Prefill GPU 复制到 Decode GPU|Decode issues a read and the KV cache is copied from the prefill GPU to the decode GPU',
      draw({ box, connect }) {
        box('left', [195, 82, 92, 91], 'NIXL', { note: '源代理|Source Agent' });
        box('right', [705, 82, 268, 91], 'Decode 代理|Decode Agent', { note: '发起读请求|Post Read' });
        box('prefill', [195, 223, 92, 282], 'Prefill GPU', { art: kvTiles });
        box('decode', [705, 223, 268, 282], 'Decode GPU', { art: art => kvTiles(art, true) });
        connect('right', 'left', { style: 'control', start: 0.45, duration: 1.05 });
        connect('prefill', 'decode', { start: 1.67, duration: 1.15 });
      }
    },
    {
      caption: '传输完成后，Decode 才用目标缓存继续生成|Decode uses the destination cache for generation after completion',
      draw({ box, connect }) {
        box('request', [120, 150, 180, 56], '已提交|Posted', { note: '传输请求|Transfer Request' });
        box('agent', [340, 150, 180, 150], 'NIXL', { note: '传输完成|Completed' });
        box('cache', [560, 150, 180, 244], '目标 KV Cache|Destination Cache', { art: kvTiles });
        box('decode', [780, 150, 180, 338], 'Decode', { note: '生成 Token|Generate Tokens' });
        connect('request', 'agent', { style: 'control', start: 0.3 });
        connect('agent', 'cache', { style: 'control', start: 1.12 });
        connect('cache', 'decode', { start: 1.96 });
      }
    }
  ];

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = { steps: scenes.length, mount };
})();
