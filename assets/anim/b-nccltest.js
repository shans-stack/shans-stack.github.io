(() => {
'use strict';
const id = 'b-nccltest';
const scenes = [
  {"kind": "collective"},
  {"kind": "rows", "head": [["试验范围", "Scope"], ["节点 A", "Node A"], ["节点 B", "Node B"]], "rows": [[["节点内", "Local"], ["Rank A + B", "Rank A + B"], ["未参与", "Idle"], "muted-cell"], [["跨节点", "Multi-Node"], ["Rank A", "Rank A"], ["Rank B", "Rank B"], "good"]]},
  {"kind": "rows", "head": [["消息大小", "Message Size"], ["运行阶段", "Run Stages"], ["结果", "Result"]], "rows": [[["较小消息", "Small"], ["预热 → 计时", "Warmup → Time"], ["校验", "Validate"]], [["中等消息", "Medium"], ["预热 → 计时", "Warmup → Time"], ["校验", "Validate"]], [["较大消息", "Large"], ["预热 → 计时", "Warmup → Time"], ["校验", "Validate"], "good"]]},
  {"kind": "rows", "head": [["列名", "Column"], ["计算", "Calculation"], ["类型", "Kind"]], "rows": [[["time", "time"], ["计时", "Elapsed"], ["实测", "Measured"]], [["algbw", "algbw"], ["S / t", "S / t"], ["派生", "Derived"]], [["busbw", "busbw"], ["× 2(n−1)/n", "× 2(n−1)/n"], ["派生", "Derived"], "good"], [["#wrong", "#wrong"], ["比较结果", "Check Output"], ["计数", "Count"]]]},
  {"kind": "rows", "head": [["测量范围", "Scope"], ["操作", "Operation"], ["结果归属", "Reporting"]], "rows": [[["组 A", "Group A"], ["All-reduce", "All-reduce"], ["按组", "Per Group"], "good"], [["组 B", "Group B"], ["All-reduce", "All-reduce"], ["按组", "Per Group"], "good"], [["端点路径", "Endpoint Path"], ["点到点", "Point-to-Point"], ["按路径", "Per Path"], "muted"]]},
  {"kind": "rows", "head": [["记录项", "Record"], ["保留信息", "Setting"], ["作用", "Purpose"]], "rows": [[["测试程序", "Test Tool"], ["工具标签", "Tool Tag"], ["复现", "Reproduce"]], [["NCCL 库", "NCCL Library"], ["库版本", "Library Version"], ["比较", "Compare"]], [["运行范围", "Run Scope"], ["放置和校验", "Placement, Check"], ["界定覆盖", "Coverage"], "good"]]}
];
const titles = [
  ["All-reduce 对多块 GPU 的同位置元素做归约，并在每块参与 GPU 上生成同一份结果。", "All-reduce combines corresponding elements across participating GPUs and produces the same result on each."],
  ["同节点与跨节点测试由 rank 的放置区分，跨节点运行使用 MPI 版本。", "Rank placement defines node scope, and cross-node runs use an MPI-enabled build."],
  ["all_reduce_perf 按大小逐组运行预热、计时和正确性检查。", "all_reduce_perf warms up, times, and checks the operation across a range of message sizes."],
  ["algbw 根据消息大小和耗时计算，busbw 还乘以集合操作的归一化系数。", "algbw divides message size by time, and busbw applies a collective-specific normalization."],
  ["同一操作、消息大小、rank 范围和缓冲模式构成一组可比记录。", "Comparable rows share the operation, size, rank scope, and buffer mode."],
  ["测试程序版本、链接的 NCCL 版本和运行配置共同构成结果记录。", "The test revision, linked NCCL version, and run settings define the result record."]
];

function mount(host, {onLayout, paused = false} = {}) {
  const mobileQuery = matchMedia('(max-width: 640px)');
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let step = 0, frame, last, elapsed, effects, svg, w, h, mobile;

  function element(tag, attrs, parent = svg) {
    const item = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) item.setAttribute(key, value);
    parent.append(item);
    return item;
  }

  const local = pair => pair[window.SS_LANG === 'en' ? 1 : 0];
  function label(x, y, pair, className = '', anchor = 'middle') {
    const item = element('text', {x, y, class: className, 'text-anchor': anchor});
    item.textContent = local(pair);
    return item;
  }

  function rect(x, y, width, height, className, rx = 7) {
    return element('rect', {x, y, width, height, rx, class: className});
  }

  function path(points, className = 'connection') {
    return element('path', {d: points.map(([x, y], i) => (i ? 'L' : 'M') + x + ' ' + y).join(' '), class: className});
  }

  function arrow(points, tone = '') {
    const line = path(points, 'connection ' + tone);
    const length = line.getTotalLength();
    const end = line.getPointAtLength(length);
    const back = line.getPointAtLength(length - 1);
    const angle = Math.atan2(end.y - back.y, end.x - back.x) * 180 / Math.PI;
    element('path', {d: 'M -7 -4 L 0 0 L -7 4', class: 'connection ' + tone,
      transform: 'translate(' + end.x + ' ' + end.y + ') rotate(' + angle + ')'});
    return line;
  }

  function packet(line, offset = 0, tone = '', span = 2.1) {
    const block = rect(-6, -4, 12, 8, 'packet ' + tone, 2);
    const length = line.getTotalLength();
    effects.push(time => {
      const age = (time + 6 - offset) % 6;
      const progress = Math.min(1, age / span);
      const point = line.getPointAtLength(length * progress);
      const fade = Math.max(0, Math.min(1, age / 0.23, (span + 0.46 - age) / 0.23));
      block.setAttribute('transform', 'translate(' + point.x + ' ' + point.y + ')');
      block.setAttribute('opacity', motionQuery.matches ? 1 : fade);
    });
  }

  function highlight(item, index, count) {
    effects.push(time => {
      if (motionQuery.matches) {
        item.setAttribute('opacity', index === count - 1 ? 0.75 : 0);
        return;
      }
      const pos = (time % 6) * count / 6;
      const strength = Math.max(0, 1 - Math.abs(pos - index - 0.5) * 2);
      item.setAttribute('opacity', 0.12 + strength * 0.88);
    });
  }

  function rebuild() {
    cancelAnimationFrame(frame);
    mobile = mobileQuery.matches;
    [w, h] = mobile ? [360, 420] : [760, 322];
    effects = [];
    host.replaceChildren();
    svg = element('svg', {viewBox: '0 0 ' + w + ' ' + h, role: 'img', 'data-step': step + 1,
      'aria-label': local(titles[step]) + ' · ' + local(['示意，不代表实测数字', 'Schematic, no measured values'])}, host);
    draw[scenes[step].kind](scenes[step]);
    label(w / 2, h - 18, ['示意，不代表实测数字', 'Schematic, no measured values'], 'caption');
    elapsed = motionQuery.matches ? 2.05 : 0;
    paint();
    onLayout?.(w / h, mobile);
    run();
  }

  function paint() {
    for (const update of effects) update(elapsed % 6);
  }

  function tick(now) {
    elapsed += Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    paint();
    frame = requestAnimationFrame(tick);
  }

  function run() {
    if (paused || motionQuery.matches || effects.length === 0) return;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }

  function collective() {
    const ends = mobile ? [[180, 62], [180, 287]] : [[158, 151], [602, 151]];
    const [a, b] = ends;
    const forward = mobile ? [[158, a[1] + 36], [158, b[1] - 36]] : [[a[0] + 70, 130], [b[0] - 70, 130]];
    const reverse = mobile ? [[202, b[1] - 36], [202, a[1] + 36]] : [[b[0] - 70, 172], [a[0] + 70, 172]];
    packet(arrow(forward), 0.35, '', 1.55);
    packet(arrow(reverse, 'secondary'), 0.35, 'secondary', 1.55);
    label(mobile ? 91 : w / 2, mobile ? 179 : 100, ['贡献 a', 'Input a'], 'secondary-text');
    label(mobile ? 264 : w / 2, mobile ? 179 : 203, ['贡献 b', 'Input b'], 'secondary-text');
    ends.forEach(([x, y], i) => {
      rect(x - 70, y - 36, 140, 72, 'card');
      label(x, y - 11, i ? ['GPU B', 'GPU B'] : ['GPU A', 'GPU A'], 'strong card-label');
      const value = i ? ['b', 'b'] : ['a', 'a'];
      const result = label(x, y + 14, value, 'secondary-text card-label');
      effects.push(time => {
        const complete = motionQuery.matches || time >= 1.9;
        result.textContent = complete ? 'a + b' : local(value);
        result.setAttribute('class', complete ? 'result-text card-label' : 'secondary-text card-label');
      });
    });
    label(w / 2, mobile ? 351 : 245, ['求和：各 GPU 得到相同结果', 'Sum: same result on each GPU'], 'secondary-text');
  }
  function rows(scene) {
    const margin = mobile ? 12 : 40;
    const column = (w - margin * 2) / 3;
    const height = mobile ? 65 : 49;
    const top = (h - 36 - (scene.rows.length * height + 42)) / 2;
    scene.head.forEach((value, i) => label(margin + column * (i + 0.5), top + 16, value, 'column'));
    path([[margin, top + 36], [w - margin, top + 36]], 'rule');
    const activeCount = scene.rows.filter(row => row[3] !== 'muted').length;
    let activeIndex = 0;
    scene.rows.forEach(([a, b, c, tone = ''], index) => {
      const y = top + 43 + index * height;
      rect(margin, y, w - margin * 2, height - 7, 'row ' + tone);
      if (tone === 'muted-cell') rect(margin + 2 * column + 6, y + 5, column - 12, height - 17, 'muted', 5);
      if (tone !== 'muted') highlight(rect(margin, y, 4, height - 7, 'emphasis', 2), activeIndex++, activeCount);
      [a, b, c].forEach((value, i) => {
        const style = i === 0 ? 'strong' : (i === 2 && tone === 'warn' ? 'warn-text' : 'secondary-text');
        label(margin + column * (i + 0.5), y + (height - 7) / 2, value, style);
      });
    });
  }

  const draw = {collective, rows};
  const queries = [mobileQuery, motionQuery];
  for (const query of queries) query.addEventListener('change', rebuild);
  document.addEventListener('ss-lang', rebuild);
  host.classList.add(id);
  const controller = {
    show(i) {
      step = Math.min(scenes.length - 1, Math.max(0, i));
      rebuild();
    },
    pause() { paused = true; cancelAnimationFrame(frame); },
    resume() {
      if (!paused) return;
      paused = false;
      run();
    },
    destroy() {
      controller.pause();
      for (const query of queries) query.removeEventListener('change', rebuild);
      document.removeEventListener('ss-lang', rebuild);
      host.replaceChildren();
      host.classList.remove(id);
      delete host.__anim;
    },
    ratio() { return w / h; },
    step() { return step; }
  };
  host.__anim = controller;
  rebuild();
  return controller;
}

window.SSAnim = window.SSAnim || {};
window.SSAnim[id] = {steps: 6, mount};
})();
