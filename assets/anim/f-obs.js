(function () {
  'use strict';

  const id = 'f-obs';
  const scenes = [
    {
      columns: [
        [["GPU 节点","GPU Nodes","设备活动","Device activity"], ["推理网关","Gateway","请求结果","Outcomes"], ["推理引擎","Engine","生成与缓存","Tokens, cache"]],
        [["遥测采集","Collector","随样本保留标签","Retains sample labels"]],
        [["观测视图","Observability","指标、日志、追踪","Metrics, logs, traces","good"]]
      ],
      edges: [[0,3,0.15],[1,3,0.4],[2,3,0.65],[3,4,1.75,"good"]],
      note: ["各层提供各自的运行信号","Each layer emits its own signals"]
    },
    {"kind":"allocation","note":["同一块 GPU 的两类信号","Two signals from the same GPU"]},
    {
      columns: [
        [["推理请求","Inference Call","进入服务","Enters service"]],
        [["网关","Gateway","延迟、错误率","Latency and errors"], ["引擎","Engine","吞吐、缓存命中","Tokens and cache hits"]],
        [["服务指标","Service Metrics","按观测点统计","By measurement point","good"]]
      ],
      edges: [[0,1,0.1],[1,2,1],[1,3,1.45],[2,3,1.9,"good"]],
      note: ["网关和引擎分别记录所见结果","Gateway and engine record separate signals"]
    },
    {
      columns: [
        [["租户甲","Tenant A","服务甲请求","Service A call"], ["租户乙","Tenant B","服务甲请求","Service A call"], ["设备样本","GPU Sample","归属未知","Unmapped","off"]],
        [["标签聚合","Label Grouping","同一时间窗口","Same time window"], ["设备范围","Device Scope","保留设备维度","Keep device scope"]],
        [["服务甲","Service A","按租户分组","Break down by tenant","good"], ["集群视图","Cluster View","归属待关联","Ownership unmapped","off"]]
      ],
      edges: [[0,3,0.1],[1,3,0.55],[2,4,0.35],[3,5,1.6,"good"],[4,6,1.35]],
      note: ["按标签和归属关系汇总","Aggregate by labels and ownership"]
    },
    {"kind":"correlation","note":["同一服务 · 同一时间窗口","Same service · Same time window"]},
    {"kind":"alert","note":["服务症状触发告警，GPU 指标辅助诊断","Service symptoms alert. GPU metrics add context"]}
  ];

  function mount(host, {onLayout, paused = false} = {}) {
    const compact = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let current = 0, frame, last, elapsed, svg, movers, marks;
    const local = (zh, en) => window.SS.lang() === 'en' ? en : zh;
    const ratio = () => compact.matches ? 1 : 880 / 330;

    function draw(tag, attrs, cls, parent = svg) {
      const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
      if (cls) element.setAttribute('class', id + '-' + cls);
      parent.append(element);
      return element;
    }

    function text(x, y, zh, en, cls = 'label', parent = svg, anchor = 'middle') {
      const label = draw('text', {x, y, 'text-anchor': anchor}, cls, parent);
      label.textContent = local(zh, en);
    }

    function route(points, start, tone = 'base', receiver) {
      const d = points.map(([x, y], i) => (i ? 'L' : 'M') + x + ' ' + y).join(' ');
      const path = draw('path', {d, fill: 'none', 'data-tone': tone}, 'route');
      const length = path.getTotalLength();
      const end = path.getPointAtLength(length);
      const back = path.getPointAtLength(Math.max(0, length - 7));
      const dx = end.x - back.x, dy = end.y - back.y;
      if (tone !== 'off') {
        draw('path', {
          d: `M${end.x} ${end.y} L${back.x + dy / 2} ${back.y - dx / 2} L${back.x - dy / 2} ${back.y + dx / 2} Z`,
          'data-tone': tone
        }, 'arrow');
      }
      if (start === null) return;
      const packet = draw('rect', {x: -5, y: -5, width: 10, height: 10, rx: 2, opacity: 0, 'data-tone': tone}, 'packet');
      movers.push({path, length, start, packet, receiver});
    }

    function card(x, y, width, [zh, en, detailZh, detailEn, tone = 'base', chips = 0]) {
      const height = chips ? 88 : 64;
      const group = draw('g', {'data-card': '', 'data-tone': tone}, 'card');
      draw('rect', {x: x - width / 2, y: y - height / 2, width, height, rx: 5}, 'box', group);
      text(x, y - (chips ? 16 : 6), zh, en, 'label', group);
      text(x, y + (chips ? 10 : 20), detailZh, detailEn, 'detail', group);
      for (let i = 0; i < chips; i++) {
        draw('rect', {x: x + (i - (chips - 1) / 2) * 20 - 6, y: y + 24, width: 12, height: 9, rx: 2}, 'chip', group);
      }
      return group;
    }

    function graph({columns, edges}, mobile) {
      const nodes = columns.flatMap((column, tier) => column.map((label, i) => {
        const offset = i - (column.length - 1) / 2;
        const gap = column.length === 3 ? 116 : 177;
        return mobile
          ? {tier, x: 180 + offset * gap, y: 51 + tier * 104, w: column.length === 3 ? 108 : (column.length === 2 ? 163 : 234), label}
          : {tier, x: 141 + tier * 299, y: 147 + offset * (column.length === 3 ? 88 : 104), w: 228, label};
      }));

      for (const [i, [from, to, start, tone]] of edges.entries()) {
        const a = nodes[from], b = nodes[to];
        const aHalf = a.label[5] ? 44 : 32, bHalf = b.label[5] ? 44 : 32;
        const lane = ((i % 3) - 1) * 7;
        let points;
        if (a.tier === b.tier) {
          points = mobile
            ? [[a.x + a.w / 2, a.y], [b.x - b.w / 2, b.y]]
            : [[a.x, a.y + aHalf], [b.x, b.y - bHalf]];
        } else if (mobile) {
          const y = (a.y + b.y) / 2 + lane;
          points = [[a.x, a.y + aHalf], [a.x, y], [b.x, y], [b.x, b.y - bHalf]];
        } else {
          const x = (a.x + b.x) / 2 + lane;
          points = [[a.x + a.w / 2, a.y], [x, a.y], [x, b.y], [b.x - b.w / 2, b.y]];
        }
        route(points, start, tone, b);
      }
      for (const node of nodes) {
        node.group = card(node.x, node.y, node.w, node.label);
        if (movers.some(mover => mover.receiver === node)) marks.add(node);
      }
    }

    let cursor;

    function line(points, tone = 'base', cls = 'trace') {
      return draw('polyline', {points: points.map(point => point.join(',')).join(' '), fill: 'none', 'data-tone': tone}, cls);
    }

    function trace(x, w, y, values, tone) {
      line(values.map((value, i) => [x + i * w / (values.length - 1), y - value]), tone);
    }

    function timeCursor(x, width, ranges) {
      const d = ranges.map(([top, bottom]) => `M${x} ${top}V${bottom}`).join(' ');
      cursor = {width, element: draw('path', {d, fill: 'none'}, 'cursor')};
    }

    function charts(kind, mobile) {
      const x = mobile ? 22 : 230, width = mobile ? 316 : 620;
      if (kind === 'allocation') {
        const first = mobile ? 103 : 105, second = mobile ? 218 : 216;
        text(mobile ? 180 : 110, first - (mobile ? 44 : 19), '调度记录', 'Scheduling Record');
        text(mobile ? 180 : 110, first - (mobile ? 21 : -5), '状态：已分配', 'Status: Allocated', 'detail');
        text(mobile ? 180 : 110, second - (mobile ? 58 : 19), '设备遥测', 'Device Telemetry');
        text(mobile ? 180 : 110, second - (mobile ? 36 : -5), 'GPU 活动', 'GPU activity', 'detail');
        line([[x, first + 8], [x + width, first + 8]], 'off', 'axis');
        line([[x, second + 8], [x + width, second + 8]], 'off', 'axis');
        trace(x, width, first, [2, 2], 'good');
        trace(x, width, second, [3, 3, 5, 27, 23, 33, 24, 6, 4, 4], 'accent');
        text(x + width, second + 38, '时间 →', 'Time →', 'detail', svg, 'end');
        timeCursor(x, width, mobile ? [[first - 6, first + 10], [second - 34, second + 10]] : [[first - 15, second + 11]]);
        return;
      }
      if (kind === 'correlation') {
        const rows = mobile ? [78, 164, 248] : [77, 156, 235];
        const ranges = mobile ? rows.map(y => [y - 36, y + 7]) : [[28, 241]];
        for (const [top, bottom] of ranges) {
          draw('rect', {x: x + width * .46, y: top, width: width * .38, height: bottom - top, rx: 4}, 'window');
        }
        const series = [
          [['首 Token 延迟升高', 'First-Token Delay Rises'], [3, 4, 3, 7, 23, 27, 26, 22, 6, 4], 'warn'],
          [['排队时间升高', 'Queue Time Rises'], [3, 3, 5, 7, 22, 25, 23, 20, 5, 3], 'warn'],
          [['执行耗时平稳', 'Execution Holds Steady'], [8, 7, 9, 8, 8, 9, 7, 8, 7, 8], 'good']
        ];
        series.forEach(([label, values, tone], i) => {
          const y = rows[i];
          text(mobile ? 24 : 30, y - (mobile ? 46 : 12), ...label, 'label', svg, 'start');
          line([[x, y + 3], [x + width, y + 3]], 'off', 'axis');
          trace(x, width, y, values, tone);
        });
        text(x + width, rows[2] + 36, '时间 →', 'Time →', 'detail', svg, 'end');
        timeCursor(x, width, ranges);
        return;
      }

      const start = mobile ? 20 : 45, plotW = mobile ? 320 : 356;
      const y = mobile ? 119 : 117;
      text(start, y - 84, '服务延迟', 'Service Latency', 'label', svg, 'start');
      text(start, y - 49, '告警阈值', 'Alert threshold', 'detail', svg, 'start');
      line([[start, y - 40], [start + plotW, y - 40]], 'warn', 'threshold');
      trace(start, plotW, y, [8, 11, 12, 19, 34, 57, 62, 56, 61, 61], 'warn');
      const detail = mobile ? [89, 158, 148] : [224, 224, 230];
      const alert = mobile ? [270, 158, 148] : [522, 86, 178];
      const target = mobile ? [180, 259, 233] : [742, 178, 220];
      const metric = {group: null}, trigger = {group: null}, result = {group: null};
      if (mobile) {
        route([[294, 58], [294, 111], [270, 111], [270, 126]], 1, 'warn', trigger);
        route([[89, 190], [89, 213], [153, 213], [153, 227]], .7, 'base', result);
        route([[270, 190], [270, 213], [207, 213], [207, 227]], 2.15, 'warn', result);
      } else {
        route([[401, 56], [420, 56], [420, 86], [433, 86]], 1, 'warn', trigger);
        route([[339, 224], [591, 224], [591, 194], [632, 194]], .7, 'base', result);
        route([[611, 86], [626, 86], [626, 161], [632, 161]], 2.15, 'warn', result);
      }
      metric.group = card(...detail, ['GPU 指标', 'GPU Metrics', '诊断线索', 'Diagnostic context']);
      trigger.group = card(...alert, ['持续超阈值', 'Breach Holds', '触发告警', 'Alert fires', 'warn']);
      result.group = card(...target, ['服务告警视图', 'Service Alert', '服务、时段及线索', 'Service, time, context', 'warn']);
      marks.add(trigger);
      marks.add(result);
    }

    function paint(t, still = false) {
      for (const mark of marks) mark.group.removeAttribute('data-arrived');
      for (const {path, length, start, packet, receiver} of movers) {
        const progress = (t - start) / .88;
        const point = path.getPointAtLength(length * Math.max(0, Math.min(1, progress)));
        packet.setAttribute('transform', `translate(${point.x} ${point.y})`);
        packet.setAttribute('opacity', still ? 0 : Math.max(0, Math.min(1, progress * 10, (1.23 - progress) * 5)));
        if (receiver?.group && (still || progress >= 1)) receiver.group.setAttribute('data-arrived', '');
      }
      if (cursor) {
        cursor.element.setAttribute('transform', 'translate(' + (cursor.width * Math.min(t / 3.4, 1)) + ' 0)');
        cursor.element.setAttribute('opacity', still ? 0 : Math.max(0, Math.min(1, t * 5, (4.5 - t) * 4)));
      }
    }

    function tick(now) {
      elapsed += Math.max(0, Math.min((now - last) / 1000, .05));
      last = now;
      paint(elapsed % 4.6);
      frame = requestAnimationFrame(tick);
    }

    function resumeFrames() {
      cancelAnimationFrame(frame);
      if (!paused && !reduced.matches) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    }

    function show(index) {
      current = Math.max(0, Math.min(scenes.length - 1, index));
      elapsed = 0;
      movers = [];
      marks = new Set();
      cursor = null;
      const mobile = compact.matches, width = mobile ? 360 : 880, height = mobile ? 360 : 330;
      const scene = scenes[current];
      host.replaceChildren();
      svg = draw('svg', {viewBox: `0 0 ${width} ${height}`, role: 'img',
        'aria-label': window.SS_TOPIC_CFG.steps[current].d[local(0, 1)],
        'data-step': current + 1}, 'diagram', host);
      if (scene.kind) charts(scene.kind, mobile);
      else graph(scene, mobile);
      text(width / 2, height - 38, ...scene.note, 'detail');
      text(width / 2, height - 13, '示意，不代表实测数字', 'Schematic, no measured data', 'note');
      paint(0, reduced.matches);
      resumeFrames();
    }

    function rebuild() {
      onLayout?.(ratio(), compact.matches);
      show(current);
    }

    compact.addEventListener('change', rebuild);
    reduced.addEventListener('change', rebuild);
    document.addEventListener('ss-lang', rebuild);
    onLayout?.(ratio(), compact.matches);
    const controller = {
      show,
      pause() { paused = true; cancelAnimationFrame(frame); },
      resume() { if (paused) { paused = false; resumeFrames(); } },
      destroy() {
        controller.pause();
        compact.removeEventListener('change', rebuild);
        reduced.removeEventListener('change', rebuild);
        document.removeEventListener('ss-lang', rebuild);
        delete host.__anim;
        host.replaceChildren();
      },
      ratio,
      step() { return current; }
    };
    host.__anim = controller;
    return controller;
  }

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = {steps: 6, mount};
})();
