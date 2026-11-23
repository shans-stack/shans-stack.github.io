(function () {
  const id = 'b-hpcg';
  const ns = 'http://www.w3.org/2000/svg';

  function mount(host, opts = {}) {
    const compact = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(ns, 'svg');
    svg.classList.add(id + '-scene');
    svg.setAttribute('role', 'img');
    host.replaceChildren(svg);

    let mobile, W, H, updates, raf, last, elapsed, step = 0, paused = !!opts.paused;
    const T = (zh, en) => window.SS_LANG === 'en' ? en : zh;
    const clamp = value => Math.max(0, Math.min(1, value));
    function el(tag, attrs, tone, parent = svg) {
      const node = document.createElementNS(ns, tag);
      if (tone) node.classList.add(id + '-' + tone);
      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
      parent.append(node);
      return node;
    }
    function label(x, y, text, tone = 'label', anchor = 'middle', parent) {
      const node = el('text', { x, y, 'text-anchor': anchor }, tone, parent);
      node.textContent = text;
      return node;
    }
    function box(x, y, width, text, tone = 'box') {
      el('rect', { x: x - width / 2, y: y - 24, width, height: 48, rx: 5 }, tone);
      return label(x, y, text, 'box-label');
    }
    function path(points, arrow = false, tone = 'line') {
      const node = el('path', { d: 'M' + points.map(p => p.join(' ')).join(' L') }, tone);
      if (arrow) {
        const [x, y] = points.at(-1);
        const [px, py] = points.at(-2);
        const angle = Math.atan2(y - py, x - px) * 180 / Math.PI;
        el('path', { d: 'M-9 -5 L0 0 L-9 5 Z', transform: 'translate(' + x + ' ' + y + ') rotate(' + angle + ')' }, 'arrow');
      }
      return node;
    }
    function pulse(route, start, end, tone = 'signal') {
      const dot = el('rect', { width: 12, height: 9, rx: 2 }, tone);
      const length = route.getTotalLength();
      updates.push(time => {
        const progress = clamp((time - start) / (end - start));
        const point = route.getPointAtLength(length * (0.04 + progress * 0.87));
        dot.setAttribute('x', point.x - 6);
        dot.setAttribute('y', point.y - 4.5);
        dot.style.opacity = Math.min(1, progress * 8, (1 - progress) * 8);
      });
    }
    function reveal(node, start) {
      updates.push(time => { node.style.opacity = 0.28 + 0.72 * clamp((time - start) / 0.35); });
    }

    function lattice(cx, cy, size, rows, columns, active, start = 0) {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
          const on = active(x, y);
          const cell = el('rect', {
            x: cx + (x - columns / 2) * size + 2,
            y: cy + (y - rows / 2) * size + 2,
            width: size - 4, height: size - 4, rx: 2
          }, on ? 'signal' : 'cell');
          if (on && start) reveal(cell, start + x * 0.11);
        }
      }
    }

    function sparseProblem() {
      const source = mobile ? [200, 126] : [215, 193];
      const matrix = mobile ? [200, 329] : [645, 193];
      label(source[0], source[1] - 85, T('网格切片', 'Grid Slice'), 'heading');
      label(matrix[0], matrix[1] - 85, T('稀疏矩阵', 'Sparse Matrix'), 'heading');
      lattice(...source, 27, 4, 5, (x, y) => Math.abs(x - 2) <= 1 && Math.abs(y - 1) <= 1, 0.2);
      lattice(...matrix, 19, 5, 13, (x, y) => y === 2 && x % 5 < 3, 1.55);
      const route = mobile ? [[200, 190], [200, 219]] : [[298, 193], [514, 193]];
      pulse(path(route, true), 0.7, 1.5);
      label(matrix[0], matrix[1] + 68, T('仅显示当前切片的 9 个非零项', 'Only the 9 nonzeros from this slice'), 'note');
    }

    function halo() {
      const [a, b, c] = mobile ? [[200, 72], [200, 267], [200, 382]] : [[148, 189], [431, 189], [712, 189]];
      const forward = mobile ? [[175, 96], [175, 243]] : [[220, 174], [359, 174]];
      const backward = mobile ? [[225, 243], [225, 96]] : [[359, 204], [220, 204]];
      const first = path(forward, true);
      const second = path(backward, true);
      box(...a, 144, T('秩 A', 'Rank A'), 'focus');
      box(...b, 144, T('秩 B', 'Rank B'), 'focus');
      box(...c, 144, T('秩 C', 'Rank C'), 'idle');
      label(c[0], c[1] + 44, T('此处不参与', 'Outside This Exchange'), 'note');
      if (mobile) label(158, 170, T('边界值', 'Halo'), 'label', 'end');
      else label(289, 132, T('边界值', 'Halo Values'));
      [forward, backward].forEach(([[x, y]]) => el('rect', {
        x: x + (mobile ? -6 : x < 300 ? -20 : 8),
        y: y + (mobile ? y < 200 ? -15 : 6 : -4.5), width: 12, height: 9, rx: 2
      }, 'signal'));
      pulse(first, 0.25, 1.6);
      pulse(second, 0.37, 1.72, 'reply');
    }

    function reduction() {
      const rankXs = mobile ? [62, 200, 338] : [220, 430, 640];
      const top = mobile ? 86 : 74;
      const bottom = mobile ? 369 : 318;
      const middle = mobile ? 226 : 195;
      const cx = W / 2;
      const inputs = rankXs.map((x, i) => path([[x, top + 24], [x, middle - 70], [cx + (i - 1) * 46, middle - 24]], true));
      const outputs = rankXs.map((x, i) => path([[cx + (i - 1) * 46, middle + 24], [x, middle + 70], [x, bottom - 24]], true));
      rankXs.forEach((x, i) => {
        box(x, top, 104, T('秩 ', 'Rank ') + 'ABC'[i]);
        box(x, bottom, 104, T('总和值', 'Same Sum'), 'focus');
      });
      label(cx, top - 44, T('各进程的局部点积', 'Local Dot Products'), 'heading');
      box(cx, middle, 170, T('全归约', 'All-Reduce'), 'focus');
      inputs.forEach(route => pulse(route, 0.18, 1.54));
      outputs.forEach(route => pulse(route, 1.85, 3.16, 'reply'));
    }

    function setup() {
      const centers = mobile ? [[200, 88], [200, 225], [200, 362]] : [[165, 185], [430, 185], [695, 185]];
      const headings = [T('本地网格', 'Local Grid'), T('进程数', 'Process Count'), T('计时', 'Timed Run')];
      const params = ['--nx / --ny / --nz', 'mpirun -np', '--rt'];
      if (mobile) {
        path([[200, 128], [200, 178]], true);
        path([[200, 265], [200, 315]], true);
      } else {
        path([[251, 185], [344, 185]], true);
        path([[516, 185], [609, 185]], true);
      }
      centers.forEach(([x, y], i) => {
        label(x, y - 20, headings[i], 'heading');
        label(x, y + 10, params[i]);
        if (i === 2) label(x, y + 40, T('正式运行通常 ≥ 1,800 秒', 'Standard Official Run ≥ 1,800 s'), 'note');
        const tick = el('rect', { x: x - 12, y: y - 43, width: 24, height: 3, rx: 1 }, 'signal');
        reveal(tick, 0.25 + i * 0.77);
      });
    }

    function rating() {
      const x = mobile ? 200 : 232;
      const y = mobile ? [70, 124, 178] : [108, 180, 252];
      const result = mobile ? [200, 345] : [667, 180];
      const factors = [
        T('内核计时', 'Kernel Timing'),
        T('收敛折算', 'Convergence Adjustment'),
        T('构建及优化开销', 'Setup and Optimization')
      ];
      if (mobile) {
        y.forEach((top, i) => pulse(path([[312, top], [341, top]]), i * 0.24, 0.8 + i * 0.24));
        const scored = path([[341, y[0]], [341, 249], [200, 249], [200, 321]], true);
        pulse(scored, 1.5, 2.7);
      } else {
        y.forEach((top, i) => pulse(path([[335, top], [440, top], [440, 155 + i * 25], [557, 155 + i * 25]], true), i * 0.25, 1.6 + i * 0.25));
      }
      y.forEach((top, i) => label(x, top, factors[i]));
      const score = box(...result, 220, T('最终评分 · GFLOP/s', 'Final Rating · GFLOP/s'), 'focus');
      reveal(score.previousElementSibling, 2.7);
      label(result[0], result[1] + 43, T('校验通过后报告', 'Reported after Validation'), 'note');
    }

    function complement() {
      const sparse = mobile ? [200, 108] : [245, 183];
      const dense = mobile ? [200, 270] : [615, 183];
      label(sparse[0], sparse[1] - 62, T('HPCG · 稀疏迭代', 'HPCG · Sparse Iteration'), 'heading');
      label(dense[0], dense[1] - 62, T('HPL · 稠密求解', 'HPL · Dense Solve'), 'heading');
      lattice(...sparse, 19, 5, 5, (x, y) => Math.abs(x - y) <= 1, 0.25);
      lattice(...dense, 19, 5, 5, () => true, 0.25);
      const footer = mobile ? 368 : 295;
      label(W / 2, footer, T('TOP500 · 第 19 期 HPCG 榜', 'TOP500 · 19th HPCG List'), 'heading');
      label(W / 2, footer + 31, '2026-11-17', 'note');
    }

    const scenes = [sparseProblem, halo, reduction, setup, rating, complement];

    function paint(time) {
      updates.forEach(update => update(time));
    }
    function frame(now) {
      elapsed = Math.min(4, elapsed + Math.min(0.05, Math.max(0, (now - last) / 1000)));
      last = now;
      paint(elapsed);
      if (elapsed < 4) raf = requestAnimationFrame(frame);
    }
    function run() {
      if (paused || reduced.matches || elapsed >= 4) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function show(index) {
      cancelAnimationFrame(raf);
      step = Math.max(0, Math.min(scenes.length - 1, index));
      elapsed = reduced.matches ? 4 : 0;
      updates = [];
      svg.replaceChildren();
      svg.dataset.step = step + 1;
      svg.setAttribute('aria-label', window.SS_TOPIC_CFG.steps[step].d[window.SS_LANG === 'en' ? 1 : 0]);
      scenes[step]();
      label(24, H - 25, T('示意，不代表实测数字', 'Schematic · No measured values'), 'note', 'start');
      paint(elapsed);
      run();
    }
    function layout() {
      mobile = compact.matches;
      W = mobile ? 400 : 860;
      H = mobile ? 472 : 392;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      opts.onLayout?.(W / H, mobile);
      show(step);
    }
    const redraw = () => show(step);
    const control = {
      show,
      pause() { paused = true; cancelAnimationFrame(raf); },
      resume() {
        if (!paused) return;
        paused = false;
        run();
      },
      destroy() {
        control.pause();
        compact.removeEventListener('change', layout);
        reduced.removeEventListener('change', redraw);
        document.removeEventListener('ss-lang', redraw);
        svg.remove();
        delete host.__anim;
      },
      ratio: () => W / H,
      step: () => step
    };
    compact.addEventListener('change', layout);
    reduced.addEventListener('change', redraw);
    document.addEventListener('ss-lang', redraw);
    host.__anim = control;
    layout();
    return control;
  }

  (window.SSAnim ||= {})[id] = { steps: 6, mount };
})();
