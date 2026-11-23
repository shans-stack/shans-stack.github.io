(() => {
  const id = 'v-datastore';
  const NS = 'http://www.w3.org/2000/svg';
  const steps = [
    ({mobile, label, box, track, tile, move}) => {
      const top = mobile ? 75 : 76, bottom = mobile ? 240 : 194;
      const rows = [
        [['文件', 'File'], ['NFS / SMB', 'NFS / SMB']],
        [['对象', 'Object'], ['S3', 'S3']],
        [['块', 'Block'], ['NVMe/TCP', 'NVMe/TCP']]
      ];
      const xs = mobile ? [61, 175, 289] : [150, 420, 690];
      const shared = (xs[0] + xs[1]) / 2;
      const motions = rows.map(([title, protocol], i) => {
        const x = xs[i];
        box(x, top, mobile ? 104 : 176, title, protocol);
        const path = i === 2
          ? [[x, top + 30], [x, bottom]]
          : [[x, top + 30], [x, bottom - 84], [shared, bottom - 30], [shared, bottom]];
        return move(track(path), 0.5 + i * 0.6, 2 + i * 0.6, false, true);
      });
      tile(shared, bottom);
      tile(xs[2], bottom);
      label(shared, bottom + 28, ['共享文件与对象元素', 'Shared File/Object Element']);
      label(xs[2], bottom + 28, ['卷', 'Volume']);
      const y = bottom + 50;
      track([[xs[0], y - 7], [xs[0], y], [xs[2], y], [xs[2], y - 7]]);
      label(xs[1], y + 28, ['共享集群存储', 'Shared Cluster Storage'], 'title');
      return t => motions.forEach(animate => animate(t));
    },
    ({mobile, label, box, track, move}) => {
      const cx = mobile ? 175 : 420, xs = mobile ? [61, 175, 289] : [145, 420, 695];
      const top = 48, middle = mobile ? 186 : 157, bottom = mobile ? 319 : 256;
      const bus = top + 69;
      const names = [['NFS 导出', 'NFS Export'], ['SMB 共享', 'SMB Share'], ['S3 存储桶', 'S3 Bucket']];
      const ports = xs.map((x, i) => {
        box(x, top, mobile ? 104 : 174, names[i]);
        const points = i === 1 ? [[x, top + 30], [cx, middle - 30]]
          : [[x, top + 30], [x, bus], [cx, bus], [cx, middle - 30]];
        return move(track(points), 0.5 + i * 0.75, 1.7 + i * 0.75, false, true);
      });
      box(cx, middle, mobile ? 136 : 170, ['视图', 'View']);
      box(cx, bottom, mobile ? 205 : 246, ['Element Store', 'Element Store'], ['/reports', '/reports']);
      const toPath = move(track([[cx, middle + 30], [cx, bottom - 30]]), 3.3, 4.4, false, true);
      const policyX = mobile ? 278 : 666;
      track([[cx + (mobile ? 68 : 85), middle], [policyX, middle], [policyX, middle + 36]], 'config');
      label(policyX, middle + 57, ['访问规则', 'Access Rules']);
      return t => [...ports, toPath].forEach(animate => animate(t));
    },
    ({mobile, label, box, track, tile, move, visible}) => {
      const xs = mobile ? [83, 175, 267] : [150, 420, 690];
      const y = mobile ? 72 : 139, cy = mobile ? 257 : 139;
      const boxWidth = mobile ? 136 : 188;
      box(xs[0], y, boxWidth, ['NFS 写入', 'NFS Write'], ['文件路径', 'File Path']);
      box(xs[2], y, boxWidth, ['S3 读取', 'S3 Read'], ['对象键', 'Object Key']);
      box(xs[1], cy, mobile ? 190 : 220, ['共享元素', 'Shared Element'], ['reports/run.csv', 'reports/run.csv']);
      const ix = xs[1], iy = cy + 52;
      const input = mobile ? [[xs[0], y + 30], [xs[0], iy], [ix, iy]]
        : [[xs[0] + 94, y], [286, y], [286, iy], [ix, iy]];
      const output = mobile ? [[ix, iy], [xs[2], iy], [xs[2], y + 30]]
        : [[ix, iy], [554, iy], [554, y], [xs[2] - 94, y]];
      track([[ix, cy + 30], [ix, iy]], 'config');
      const write = move(track(input), 0.5, 2.6);
      const s3 = track(output);
      const request = move(s3, 3.0, 4.3, true, true);
      const read = move(s3, 4.3, 6.0);
      const saved = tile(ix, iy);
      const received = tile(...output.at(-1));
      return t => {
        write(t);
        request(t);
        read(t);
        visible(saved, t >= 2.6);
        visible(received, t >= 6.0);
      };
    },
    ({mobile, box, track, tile, move, visible}) => {
      const host = mobile ? [175, 53] : [135, 151];
      const subsystem = mobile ? [175, 180] : [423, 151];
      const volume = mobile ? [86, 321] : [708, 77];
      const unmapped = mobile ? [264, 321] : [708, 224];
      const w = mobile ? 142 : 180;
      box(...host, w, ['块主机', 'Block Host'], ['NVMe/TCP', 'NVMe/TCP']);
      box(...subsystem, w + 18, ['块子系统', 'Block Subsystem'], ['/volumes', '/volumes']);
      box(...volume, w, ['卷 A', 'Volume A'], ['已映射', 'Mapped']);
      box(...unmapped, w, ['卷 B', 'Volume B'], ['未映射', 'Unmapped']);
      const entry = mobile ? [[175, 83], [175, 150]]
        : [[225, 151], [324, 151]];
      const branch = ([x, y]) => mobile ? [[175, 210], [175, 259], [x, 259], [x, y - 30]]
        : [[522, 151], [573, 151], [573, y], [x - 90, y]];
      const input = move(track(entry), 0.6, 1.8);
      const mapped = branch(volume);
      const output = move(track(mapped), 2.0, 3.6);
      track(branch(unmapped), 'idle');
      const received = tile(...mapped.at(-1));
      return t => {
        input(t);
        output(t);
        visible(received, t >= 3.6);
      };
    },
    ({mobile, box, track, tile, move, visible}) => {
      const labels = [
        [['文件写入', 'File Write']],
        [['持久写缓冲', 'Persistent Buffer'], ['存储级内存', 'SCM']],
        [['后台缩减', 'Data Reduction'], ['后台处理', 'Background']],
        [['闪存', 'Flash']]
      ];
      const points = labels.map((fields, i) => {
        const x = mobile ? 140 : 105 + i * 210;
        const y = mobile ? 57 + i * 86 : 126;
        box(x, y, mobile ? 202 : 163, ...fields);
        const anchor = mobile ? [281, y] : [x, 197];
        track(mobile ? [[241, y], anchor] : [[x, 156], anchor], 'config');
        return anchor;
      });
      const flows = points.slice(1).map((point, i) =>
        move(track([points[i], point]), 0.5 + i * 1.7, 1.6 + i * 1.7)
      );
      const marks = points.map(point => tile(...point));
      return t => {
        flows.forEach(animate => animate(t));
        visible(marks[0], t < 0.5);
        visible(marks[1], t >= 1.6 && t < 2.2);
        visible(marks[2], t >= 3.3 && t < 3.9);
        visible(marks[3], t >= 5.0);
      };
    },
    ({mobile, label, box, track, tile, move, visible}) => {
      const xs = mobile ? [88, 262] : [239, 601];
      const y = mobile ? 72 : 62, v = mobile ? 262 : 224;
      const [a, b] = xs;
      box(a, y, mobile ? 139 : 221, ['活动路径', 'Live Path']);
      box(b, y, mobile ? 139 : 221, ['只读快照', 'Snapshot'], ['只读', 'Read Only']);
      const current = track([[a, y + 30], [a, v]], 'config');
      const snapshot = track([[b, y + 30], [b, v]], 'config');
      const original = track([[a, y + 30], [a, 138], [b, 138], [b, v]], 'config');
      const pointer = move(current, 2.7, 4.3, false, true);
      const newer = tile(a, v);
      const newerLabel = label(a, v + 28, ['新版本', 'New Version']);
      label(b, v + 28, ['原版本', 'Original Version']);
      tile(b, v);
      return t => {
        visible(original, t < 2.7);
        visible(snapshot, t >= 0.5);
        visible(current, t >= 2.7);
        visible(newer, t >= 4.3);
        visible(newerLabel, t >= 4.3);
        pointer(t);
      };
    }
  ];

  function mount(host, opts = {}) {
    const layout = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(NS, 'svg');
    svg.classList.add(id + '-scene');
    svg.setAttribute('role', 'img');
    host.replaceChildren(svg);

    const T = ([zh, en]) => window.SS_LANG === 'en' ? en : zh;
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
      height = mobile ? 401 : 328;
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      svg.setAttribute('aria-label', T(["统一存储层的访问路径与数据服务", "Access Paths and Data Services in Unified Storage"]));
      svg.replaceChildren();
      lines = draw('g', {}, '', svg);
      nodes = draw('g', {}, '', svg);
      tokens = draw('g', {}, '', svg);
      frame = steps[step]({mobile, label, box, track, tile, move, visible});
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
