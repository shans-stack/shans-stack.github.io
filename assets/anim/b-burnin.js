(() => {
'use strict';
const id = 'b-burnin';
const scenes = [
  {"kind": "branch", "mode": "gather", "cards": [[["证据记录", "Evidence"], ["覆盖与结果", "Coverage and Results"], "good"], [["验收条件", "Acceptance"], ["范围与门槛", "Scope and Limits"], ""], [["老化测试", "Burn-In"], ["持续负载", "Sustained Load"], ""]]},
  {"kind": "rows", "head": [["子系统", "Subsystem"], ["基线对象", "Inventory"], ["检查", "Check"]], "rows": [[["算力", "Compute"], ["节点与 GPU", "Nodes, GPUs"], ["GPU 诊断", "Diagnostics"]], [["网络", "Network"], ["设备端口", "Device Ports"], ["点到点路径", "Selected Path"]], [["存储", "Storage"], ["读写路径", "Data Paths"], ["工作负载", "Workload"]], [["清单外", "Out of Scope"], ["未选部件", "Other Parts"], ["未覆盖", "Uncovered"], "muted"]]},
  {"kind": "timeline"},
  {"kind": "branch", "mode": "job", "cards": [[["共享存储", "Shared Storage"], ["训练数据读取", "Training Data Reads"], "good"], [["计算节点 A", "Compute Node A"], ["GPU 参与", "Active GPU"], ""], [["计算节点 B", "Compute Node B"], ["GPU 参与", "Active GPU"], ""]]},
  {"kind": "rows", "head": [["状态", "Status"], ["证据", "Evidence"], ["下一步", "Follow-Up"]], "rows": [[["通过", "Pass"], ["指标达标", "Meets Criteria"], ["记录", "Record"], "good"], [["异常", "Fault"], ["设备与日志", "Device and Log"], ["同口径复测", "Matched Retest"], "warn"], [["未覆盖", "Uncovered"], ["缺少记录", "Missing Run"], ["补测", "Run Check"], "muted"]]},
  {"kind": "chain", "cards": [[["工具修订", "Tool Revision"], ["可复现", "Reproducible"], ""], [["设备覆盖", "Device Coverage"], ["测试窗口", "Run Window"], ""], [["验收条件", "Criteria"], ["逐项结论", "Per-Check Decision"], "good"]], "mode": "sequence"}
];
const titles = [
  ["验收按约定条件判断是否交付，老化测试观察持续施压期间的稳定性。", "Acceptance assesses handover criteria, and burn-in observes stability under sustained stress."],
  ["清点节点、GPU、网络端口和存储路径后，按子系统建立基线。", "The baseline inventories nodes, GPUs, network ports, and storage paths before subsystem checks."],
  ["持续负载期间记录温度、时钟、功耗和错误事件，以时间对齐变化。", "Temperature, clock, power, and fault events are recorded against the same stress interval."],
  ["跨节点集合通信和代表性 I/O 作业补齐局部压力测试的覆盖。", "Cross-node collectives and representative I/O extend coverage beyond local stress tests."],
  ["逐项核对门槛、覆盖和错误事件，修复后的复测使用同一口径。", "Criteria, coverage, and fault events are checked individually, and retests use the same basis after remediation."],
  ["验收流程由交付要求定义，工具版本和公开修订用于固定证据。", "Handover requirements define acceptance, and tool versions pin the evidence."]
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

  function branch(scene) {
    const check = scene.mode === 'diagnostic';
    const flow = scene.mode === 'job';
    const origin = check ? (mobile ? [173, 48] : [380, 69]) : (mobile ? [180, 276] : [380, 230]);
    const targets = check ? (mobile ? [[232, 143], [232, 225], [232, 307]] : [[142, 221], [380, 221], [618, 221]]) :
      (mobile ? [[90, 79], [270, 79]] : [[207, 76], [553, 76]]);
    const cardHeight = 58;
    const targetWidth = mobile ? (check ? 203 : 154) : 202;
    const lines = [];
    targets.forEach(([x, y], i) => {
      if (scene.cards[i + 1][2] === 'muted') return;
      const [sx, sy] = origin;
      const middle = (sy + y) / 2;
      const sign = i === 0 ? -1 : 1;
      const start = check ? sx + (i - 1) * 16 : sx + sign * 47;
      const points = check && mobile ?
        [[82, sy + cardHeight / 2], [82, y], [x - targetWidth / 2, y]] :
        [[start, sy + (check ? 1 : -1) * cardHeight / 2], [start, middle], [x, middle],
          [x, y + (check ? -1 : 1) * cardHeight / 2]];
      lines.push(arrow(scene.mode === 'gather' ? points.reverse() : points));
    });
    if (flow) {
      const left = targets[0][0] + targetWidth / 2;
      const right = targets[1][0] - targetWidth / 2;
      const y = targets[0][1];
      lines.push(arrow([[left, y - 9], [right, y - 9]], 'secondary'));
      lines.push(arrow([[right, y + 9], [left, y + 9]], 'secondary'));
    }
    [origin, ...targets].forEach(([x, y], i) => {
      const [title, detail, tone] = scene.cards[i];
      const width = i === 0 ? 220 : targetWidth;
      rect(x - width / 2, y - cardHeight / 2, width, cardHeight, 'card ' + tone);
      label(x, y - 10, title, 'strong card-label');
      label(x, y + 12, detail, 'secondary-text card-label');
    });
    lines.forEach((line, i) => packet(line, 0.65,
      line.classList.contains('secondary') ? 'secondary' : '', flow && i > 1 ? 1.5 : 1.9));
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
  function timeline() {
    const x0 = mobile ? 109 : 172, x1 = w - (mobile ? 18 : 48);
    const top = mobile ? 93 : 65, bottom = mobile ? 320 : 243;
    const x = fraction => x0 + (x1 - x0) * fraction;
    rect(x(0.18), top - 18, x(0.81) - x(0.18), bottom - top + 32, 'row good', 4);
    label(x(0.5), top - 35, ['持续负载窗口','Sustained Load Window'], 'strong');
    const tracks = [
      [['负载','Workload'], [0, 0.05, 0.7, 0.7, 0.7, 0.04, 0]],
      [['温度','Temperature'], [0.03, 0.1, 0.29, 0.63, 0.64, 0.53, 0.26]],
      [['时钟','Clock'], [0.31, 0.31, 0.68, 0.68, 0.45, 0.66, 0.31]],
      [['功耗','Power'], [0.06, 0.18, 0.72, 0.67, 0.69, 0.35, 0.1]],
      [['错误','Events'], [0, 0, 0, 0, 0, 0, 0]],
    ];
    tracks.forEach(([name, values], i) => {
      const y = top + i * (bottom - top) / (tracks.length - 1);
      label(x0 - 9, y - 8, name, 'secondary-text', 'end');
      path([[x0, y], [x1, y]], 'rule');
      if (i === tracks.length - 1) element('circle', {cx: x(0.66), cy: y - 6, r: 5, class: 'warn-mark'});
      else path(values.map((value, index) => [x(index / (values.length - 1)), y - value * 24]), 'trace');
    });
    const cursor = path([[x0, top - 18], [x0, bottom + 14]], 'cursor');
    effects.push(time => {
      const fraction = motionQuery.matches ? 0.66 : Math.min(1, time / 5.4);
      cursor.setAttribute('transform', 'translate(' + (x(fraction) - x0) + ' 0)');
      cursor.setAttribute('opacity', motionQuery.matches ? 1 : Math.min(1, time * 4, (6 - time) * 4));
    });
    label(x0, bottom + 38, ['开始','Start'], 'column');
    label(x1, bottom + 38, ['结束','End'], 'column');
  }
  function chain(scene) {
    const width = mobile ? 250 : 218, height = 76;
    const centers = mobile ? [[180, 62], [180, 187], [180, 312]] : [[133, 151], [380, 151], [627, 151]];
    const connectors = [];
    for (let i = 0; i < centers.length - 1; i++) {
      if (scene.mode === 'scope' || (scene.mode === 'partial' && i > 0)) continue;
      const [x, y] = centers[i], [nx, ny] = centers[i + 1];
      const points = mobile ? [[x, y + height / 2], [nx, ny - height / 2]] :
        [[x + width / 2, y], [nx - width / 2, ny]];
      connectors.push(arrow(points));
      if (scene.mode === 'separate') {
        connectors.push(arrow(points.map(([px, py]) => mobile ? [px + 24, py] : [px, py + 24]).reverse(), 'secondary'));
      }
    }
    scene.cards.forEach(([title, detail, tone], i) => {
      const [x, y] = centers[i];
      const left = x - width / 2;
      rect(left, y - height / 2, width, height, 'card ' + tone);
      if (tone !== 'muted') {
        const active = rect(left + 1, y - height / 2 + 1, 4, height - 2, 'emphasis', 2);
        highlight(active, i, centers.length);
      }
      label(x, y - 9, title, 'strong card-label');
      label(x, y + 16, detail, 'secondary-text card-label');
      if (scene.mode === 'separate') rect(left + 14, y + 23, 12, 8, 'packet', 2);
      if (tone === 'matrix') {
        for (let k = 0; k < 9; k++) {
          rect(left + 10 + (k % 3) * 6, y + 22 + Math.floor(k / 3) * 5, 4, 3, 'tile tile-' + (k % 4), 0);
        }
      }
    });
    if (['copy', 'separate', 'partial'].includes(scene.mode)) {
      connectors.forEach((line, i) => {
        const offset = scene.mode === 'separate' ? 0.3 + 1.4 * i : scene.mode === 'copy' ? 0.9 + 2.3 * i : 0.9;
        packet(line, offset, line.classList.contains('secondary') ? 'secondary' : '', 1.15);
      });
      if (scene.mode === 'copy') {
        const [x, y] = centers[1];
        rect(x - 6, y + 26, 12, 7, 'packet', 2);
      }
    }
  }

  const draw = {branch, rows, timeline, chain};
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
