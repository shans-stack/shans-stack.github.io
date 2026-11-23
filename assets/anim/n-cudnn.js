(function () {
  const id = 'n-cudnn';
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
      caption: '框架调用 cuDNN，在 GPU 上执行深度学习算子|A framework calls cuDNN to execute deep learning operations on a GPU',
      draw({ box, connect }) {
        box('framework', [195, 152, 180, 79], '模型框架|DL Framework', { note: '训练或推理|Train or Infer' });
        box('library', [450, 152, 180, 207], 'cuDNN', { note: 'GPU 算子库|Operation Library', tone: 'active' });
        box('gpu', [705, 152, 180, 335], 'GPU', { note: '执行算子|Run Operations' });
        connect('framework', 'library', { style: 'control', start: 0.35 });
        connect('library', 'gpu', { style: 'control', start: 1.12 });
      }
    },
    {
      caption: '卷积结果依次通过偏置和 ReLU|Convolution feeds bias addition and then ReLU',
      draw({ box, connect }) {
        box('input', [120, 149, 180, 60], '输入张量|Input Tensor');
        box('conv', [340, 149, 180, 153], 'cuDNN', { note: '卷积计算特征|Convolution', tone: 'active' });
        box('bias', [560, 149, 180, 246], '偏置加法|Bias Addition', { note: '加上偏移|Offset' });
        box('relu', [780, 149, 180, 339], 'ReLU', { note: '负值截为零|Clip Below Zero' });
        connect('input', 'conv', { start: 0.3 });
        connect('conv', 'bias', { start: 1.08 });
        connect('bias', 'relu', { start: 1.86 });
      }
    },
    {
      caption: '配置通过支持检查后可生成执行计划|A compatible engine configuration becomes an execution plan',
      draw({ box, connect }) {
        box('graph', [120, 150, 180, 52], '算子图|Operation Graph');
        box('query', [340, 150, 180, 140], 'cuDNN', { note: '查询引擎配置|Query Engines' });
        box('pass', [560, 94, 92, 240], '配置 A|Config A', { note: '受支持|Supported' });
        box('reject', [560, 215, 268, 240], '配置 B|Config B', { note: '不支持|Unsupported', tone: 'miss' });
        box('plan', [780, 94, 92, 340], '执行计划|Execution Plan', { note: '构建完成|Built' });
        connect('graph', 'query', { style: 'control', start: 0.3 });
        connect('query', 'pass', { desktop: 'h', style: 'control', start: 1.1, offset: -9 });
        connect('query', 'reject', { desktop: 'h', style: 'miss', offset: 9 });
        connect('pass', 'plan', { style: 'control', start: 1.9 });
      }
    },
    {
      caption: '卷积、偏置和 ReLU 在同一个 GPU 内核中消费中间结果|Convolution, bias addition, and ReLU consume intermediates inside one GPU kernel',
      draw({ box, connect, travel }) {
        box('input', [143, 152, 180, 56], '输入张量|Input Tensor');
        box('kernel', [450, 152, 180, 154], 'cuDNN', {
          width: 254, mobileWidth: 230, height: 92, tone: 'active',
          art({ group, x, top, add, label }) {
            label(group, x, top + 49, '卷积 → 偏置 → ReLU|Conv → Bias → ReLU');
            const path = add(group, 'path', {
              d: 'M' + (x - 77) + ',' + (top + 72) + 'h154',
              class: 'n-cudnn-line'
            });
            travel(path, 'data', 1.13, 0.85);
          }
        });
        box('output', [757, 152, 180, 253], '输出张量|Output Tensor');
        box('hbm', [450, 246, 180, 348], '显存中的中间张量|Intermediates in HBM', { width: 254, mobileWidth: 230, note: '无需写回|No Writeback', tone: 'idle' });
        connect('input', 'kernel', { start: 0.35 });
        connect('kernel', 'output', { start: 2.08 });
      }
    },
    {
      caption: '将张量地址和所需工作区绑定到执行计划，再由 GPU 写结果|Tensor pointers and any required workspace are bound to the plan before GPU execution',
      draw({ box, connect }) {
        box('input', [120, 145, 92, 68], '输入地址|Input Address');
        box('workspace', [340, 58, 268, 68], '工作区|Workspace', { note: '按计划需要|If Required' });
        box('pointer', [340, 234, 268, 180], '输出地址|Output Address');
        box('plan', [560, 145, 92, 202], 'NVIDIA GPU', { note: '按计划运行|Run Built Plan', tone: 'active' });
        box('output', [780, 145, 92, 330], '输出张量|Output Tensor');
        connect('input', 'plan', { style: 'control', start: 0.25, offset: -14 });
        connect('workspace', 'plan', { desktop: 'h', style: 'control', start: 0.48, offset: 0 });
        connect('pointer', 'plan', { desktop: 'h', mobile: 'h', style: 'control', start: 0.72, offset: 14 });
        connect('plan', 'output', { start: 1.58 });
      }
    }
  ];

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = { steps: scenes.length, mount };
})();
