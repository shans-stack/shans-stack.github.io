(() => {
'use strict';
const id = 'b-perftest';
const scenes = [
  {"kind": "route", "ends": [["客户端内存", "Client Memory"], ["服务端内存", "Server Memory"]], "lanes": [["RDMA Write", "RDMA Write"]], "mode": "write", "limit": ["副本写入远端", "Copy Written to Remote Memory"]},
  {"kind": "rows", "head": [["配置", "Setup"], ["服务端", "Server"], ["客户端", "Client"]], "rows": [[["程序", "Binary"], ["ib_write_bw", "ib_write_bw"], ["ib_write_bw", "ib_write_bw"], "good"], [["设备与端口", "Device, Port"], ["本地接口", "Local Interface"], ["本地接口", "Local Interface"]], [["连接", "Connection"], ["等待连接", "Waits"], ["指定服务端", "Server Address"], "good"]]},
  {"kind": "route", "ends": [["本地注册缓冲区", "Local Registered Buffer"], ["远端注册缓冲区", "Remote Registered Buffer"]], "lanes": [["RDMA Write · 多次写入在途", "RDMA Write · In Flight"]], "mode": "stream", "limit": null},
  {"kind": "route", "ends": [["客户端计量", "Client Measure"], ["服务端计量", "Server Measure"]], "lanes": [["客户端发起", "Client Traffic"], ["服务端发起", "Server Traffic"]], "mode": "parallel", "limit": ["双向结果合并两端计量", "Bidirectional Result Combines Both"]},
  {"kind": "route", "ends": [["计时端", "Timing Endpoint"], ["应答端", "Peer Endpoint"]], "lanes": [["去程", "Outbound"], ["回程", "Return"]], "mode": "return", "limit": ["报告时延 = RTT ÷ 2", "Reported Latency = RTT ÷ 2"]},
  {"kind": "chain", "cards": [[["端点 A", "Endpoint A"], ["合成负载", "Synthetic Traffic"], "good"], [["端点 B", "Endpoint B"], ["所选路径", "Selected Path"], "good"], [["生产作业", "Application Job"], ["独立验证多流竞争", "Separate Contention Test"], "muted"]], "mode": "partial"}
];
const titles = [
  ["perftest 用 RDMA verbs 生成指定操作的微基准负载。", "perftest generates a microbenchmark load for a selected RDMA verb."],
  ["两端运行同一版本及相同测试配置，客户端指定服务端地址。", "Both endpoints use the same version and test settings, and the client specifies the server address."],
  ["消息大小、队列深度、连接数和测量时长影响施加到链路的负载。", "Message size, queue depth, connection count, and duration shape the offered load."],
  ["单向由客户端测量，双向带宽由两端分别测量各自发起的流量后合并。", "The client measures unidirectional bandwidth. Bidirectional runs combine traffic initiated and measured at both ends."],
  ["时延微基准测往返时间，以往返的一半近似单向时延。", "The latency test measures round-trip time and reports half as an approximation of one-way latency."],
  ["一对端点的合成流量刻画所选路径，实际作业的多流竞争需要另外验证。", "Synthetic traffic between two endpoints characterizes the selected path. Application contention needs separate validation."]
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

  function route(scene) {
    const [a, b] = scene.ends;
    const x1 = mobile ? 60 : 104, x2 = w - x1;
    const stream = scene.mode === 'stream';
    const y1 = mobile ? (stream ? 169 : 52) : (stream ? 199 : 139), y2 = mobile ? 322 : y1;
    const width = mobile ? w - 80 : (stream ? 221 : 160);
    const left = stream && !mobile ? 126 : x1, right = stream && !mobile ? w - 126 : x2;
    if (stream) {
      const sy = mobile ? 61 : 55;
      const requestX = mobile ? 70 : 261;
      const queueX = mobile ? 290 : 500;
      const card = mobile ? 126 : 179;
      const points = [[requestX + card / 2, sy], [queueX - card / 2, sy]];
      packet(arrow(points, 'secondary'), .2, 'secondary', .7);
      [[requestX, ['提交工作请求', 'Post Request']], [queueX, ['发送队列', 'Send Queue']]].forEach(([x, text]) => {
        rect(x - card / 2, sy - 25, card, 50, 'card');
        label(x, sy, text, 'secondary-text card-label');
      });
      label(w / 2, mobile ? 110 : 105, ['队列保存请求描述', 'Queue holds work requests'], 'secondary-text');
    }
    rect(mobile ? 40 : left - width / 2, y1 - 25, width, 50, 'card');
    rect(mobile ? 40 : right - width / 2, y2 - 25, width, 50, 'card');
    label(mobile ? w / 2 : left, y1, a, 'strong card-label');
    label(mobile ? w / 2 : right, y2, b, 'strong card-label');
    scene.lanes.forEach((title, i) => {
      const reverse = i === 1 && scene.mode !== 'methods';
      const offset = scene.lanes.length === 1 ? 0 : (i === 0 ? -21 : 21);
      const x = mobile ? (i === 0 ? 64 : 91) : w / 2;
      const points = mobile ? [[x, y1 + 26], [x, y2 - 26]] : [[left + width / 2 + 2, y1 + offset], [right - width / 2 - 2, y2 + offset]];
      const load = i === 0 ? '' : 'secondary';
      const line = arrow(reverse ? points.reverse() : points, load);
      const t = scene.mode === 'return' && i === 1 ? 2.65 : stream ? 1.15 : 0.55;
      if (scene.mode !== 'write' || !motionQuery.matches) packet(line, t, load);
      if (scene.mode === 'stream') {
        packet(line, 1.7);
        packet(line, 2.25);
      }
      label(mobile ? 210 : x, mobile ? (scene.lanes.length === 1 ? (stream ? 247 : 179) : 147 + i * 82) :
        (i === 0 ? y1 + offset - 22 : y1 + offset + 22), title, 'strong');
    });
    if (scene.mode === 'write') {
      rect(mobile ? 58 : x1 + 58, mobile ? y1 + 10 : y1 - 4, 12, 8, 'packet', 2);
      const copy = rect(mobile ? 58 : x2 - 69, mobile ? y2 - 14 : y2 - 4, 12, 8, 'packet', 2);
      effects.push(time => copy.setAttribute('opacity', Number(motionQuery.matches || time >= 2.65)));
    }
    if (scene.limit) label(w / 2, mobile ? 367 : 240, scene.limit, 'secondary-text');
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

  const draw = {route, rows, chain};
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
