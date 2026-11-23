(() => {
'use strict';
const id = 'b-dcgm';
const scenes = [
  {"kind": "rows", "head": [["路径", "Mode"], ["动作", "Action"], ["对象", "Target"]], "rows": [[["监控", "Monitoring"], ["读取状态", "Read State"], ["已有遥测", "Telemetry"], "muted"], [["主动诊断", "Diagnostics"], ["运行插件", "Run Plugins"], ["选定 GPU", "Selected GPUs"], "good"]]},
  {"kind": "rows", "head": [["级别", "Level"], ["新增检查", "Adds"], ["累计范围", "Coverage"]], "rows": [[["r1", "r1"], ["软件环境", "Software"], ["基础", "Basic"]], [["r2", "r2"], ["互联与显存", "Links, Memory"], ["扩大", "Extended"]], [["r3 / r4", "r3 / r4"], ["进一步施压", "Stress Tests"], ["更深", "Deeper"], "good"]]},
  {"kind": "branch", "mode": "diagnostic", "cards": [[["诊断运行", "Diagnostic Run"], ["选择目标设备", "Target Selection"], ""], [["GPU A", "GPU A"], ["已选 · 执行检查", "Selected · Runs"], "good"], [["GPU B", "GPU B"], ["已选 · 执行检查", "Selected · Runs"], "good"], [["GPU C", "GPU C"], ["未选 · 未覆盖", "Outside This Run"], "muted"]]},
  {"kind": "rows", "head": [["插件", "Plugin"], ["目标", "Target"], ["证据", "Evidence"]], "rows": [[["显存", "Memory"], ["GPU 显存", "GPU Memory"], ["显存错误", "Memory Errors"]], [["互联", "Interconnect"], ["PCIe / NVLink", "PCIe / NVLink"], ["链路行为", "Link Behavior"]], [["压力", "Stress"], ["运行条件", "Operation"], ["运行阈值", "Test Criteria"], "good"]]},
  {"kind": "rows", "head": [["设备", "Device"], ["检查", "Check"], ["结果", "Status"]], "rows": [[["GPU A", "GPU A"], ["显存", "Memory"], ["通过", "Pass"], "good"], [["GPU B", "GPU B"], ["互联", "Interconnect"], ["失败", "Fail"], "warn"], [["GPU C", "GPU C"], ["压力", "Stress"], ["跳过", "Skip"], "muted"]]},
  {"kind": "chain", "cards": [[["DCGM 版本", "DCGM Release"], ["运行级别", "Run Level"], ""], [["运行环境", "Environment"], ["驱动与 GPU", "Driver and GPU"], ""], [["覆盖清单", "Coverage"], ["插件与参数", "Plugins and Options"], "good"]], "mode": "sequence"}
];
const titles = [
  ["DCGM 诊断在指定 NVIDIA GPU 上执行检查，有些插件会主动施加负载。", "DCGM Diagnostics runs checks on selected NVIDIA GPUs, and some plugins apply load."],
  ["短级别主要检查软件环境，更深级别会加入链路、显存和压力测试。", "The short level focuses on software checks. Deeper levels add link, memory, and stress tests."],
  ["诊断运行记录标明目标 GPU、运行级别、插件参数和当时的负载状态。", "The run record names the target GPUs, diagnostic level, plugin settings, and workload state."],
  ["显存、互联和压力插件各观察自己的错误、吞吐或运行状态。", "Memory, interconnect, and stress plugins collect distinct evidence."],
  ["通过、失败、跳过和告警需要与 GPU 实体、检查项目和日志对应。", "Pass, fail, skip, and warning outcomes belong with the GPU entity, check, and log."],
  ["保留 DCGM、驱动、GPU 与插件配置，才能解释测试覆盖的变化。", "DCGM, driver, GPU, and plugin settings explain differences in test coverage."]
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

  const draw = {rows, branch, chain};
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
