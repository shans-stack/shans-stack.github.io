(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const desktop = [760, 272];
  const phone = [350, 330];
  const descriptions = [
    ['两台设备的读数依次汇入采集端', 'Readings from two devices merge at the collector'],
    ['以设备 ID 路由，两个分区各自追加事件', 'Device IDs route events to two independently appended partitions'],
    ['两个消费组分别读取同一条保留的日志', 'Two consumer groups read the same retained log independently'],
    ['读取暂停时日志继续写入，未读范围扩大', 'The log continues to grow while reads pause'],
    ['任务从已保存的偏移量重放，目标保留同一行', 'A saved offset enables replay while the destination retains one row'],
    ['事件转换成行，表提交后可查询', 'Events become rows that queries can read after a table commit']
  ];

  function mount(host, {onLayout, paused = false} = {}) {
    const narrow = matchMedia('(max-width: 640px)');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(NS, 'svg');
    svg.classList.add('stream-scene');
    svg.setAttribute('role', 'img');
    host.replaceChildren(svg);
    let current = 0, frame = 0, last = 0, elapsed = 0, ratio, duration, resultAt, moving, actors, wires, scene;

    const tr = (zh, en) => window.SS_LANG === 'en' ? en : zh;
    function draw(parent, tag, attrs = {}) {
      const node = document.createElementNS(NS, tag);
      Object.entries(attrs).forEach(([name, value]) => node.setAttribute(name, value));
      parent.append(node);
      return node;
    }
    function label(x, y, value, style = '', anchor = 'middle', parent = scene) {
      const node = draw(parent, 'text', {x, y, 'text-anchor': anchor, class: style});
      node.textContent = value;
      return node;
    }
    function box(parent, x, y, width, height, style) {
      return draw(parent, 'rect', {x, y, width, height, rx: 6, class: style});
    }
    function node([x, y], name, width = 130) {
      box(scene, x - width / 2, y - 20, width, 40, 'stream-node');
      label(x, y + 1, name, 'stream-title');
    }
    function route(points) {
      return draw(wires, 'path', {d: points.map(([x, y], i) => (i ? 'L' : 'M') + x + ' ' + y).join(' '), class: 'stream-wire'});
    }
    function block(parent, [x, y], value, width = 42) {
      const group = draw(parent, 'g', {class: 'stream-block', transform: 'translate(' + x + ' ' + y + ')'});
      box(group, -width / 2, -15, width, 30, 'stream-fill');
      label(0, 1, value, 'stream-id', 'middle', group);
      return group;
    }
    function show(node, visible) {
      node.style.visibility = visible ? 'visible' : 'hidden';
    }
    function updateLabel(node, value) {
      if (node.dataset.value === value) return;
      node.dataset.value = value;
      node.textContent = value;
    }
    function at(time, node) {
      moving.push(t => show(node, t >= time));
    }
    function travel(points, start, end, value, width, style) {
      const path = route(points);
      const distance = path.getTotalLength();
      const packet = block(actors, points[0], value, width);
      packet.classList.add('stream-packet');
      if (style) packet.classList.add(style);
      moving.push(t => {
        const visible = t >= start && t < end;
        show(packet, visible);
        if (!visible) return;
        const {x, y} = path.getPointAtLength(distance * (t - start) / (end - start));
        packet.setAttribute('transform', 'translate(' + x + ' ' + y + ')');
      });
    }
    function strip([x, y], values, {offsets = false, first = 0, arrivals = [], waiting = false} = {}) {
      return values.map((value, i) => {
        const point = [x + (i - (values.length - 1) / 2) * 49, y];
        box(scene, point[0] - 21, y - 15, 42, 30, 'stream-slot');
        const event = block(actors, point, value);
        if (waiting && i >= first) event.classList.add('stream-wait');
        if (arrivals[i] !== undefined) at(arrivals[i], event);
        if (offsets) label(point[0], y + 28, i, 'stream-detail');
        return point;
      });
    }

    function capture(mobile) {
      const sources = mobile ? [[85, 53], [265, 53]] : [[115, 77], [115, 171]];
      const output = mobile ? [175, 208] : [562, 124];
      const rail = mobile ? 157 : 94;
      const times = [1.05, 1.9, 2.75, 3.6];
      label(output[0], rail - 20, tr('采集端', 'Collector'), 'stream-title');
      const positions = strip(output, ['A1', 'B1', 'A2', 'B2'], {arrivals: times});
      sources.forEach((point, i) => node(point, tr('设备 ', 'Device ') + 'AB'[i]));
      positions.forEach(([x, y], i) => {
        const [sx, sy] = sources[i % 2];
        const points = mobile
          ? [[sx, sy + 20], [sx, rail], [x, rail], [x, y]]
          : [[sx + 65, sy], [286 + (i % 2) * 35, sy], [286 + (i % 2) * 35, rail], [x, rail], [x, y]];
        travel(points, times[i] - 0.8, times[i], ['A1', 'B1', 'A2', 'B2'][i]);
      });
      return 4.3;
    }

    function append(mobile) {
      const sources = mobile ? [[88, 47], [262, 47]] : [[112, 92], [112, 178]];
      const rows = mobile ? [[157, 147], [194, 252]] : [[563, 93], [563, 181]];
      label(mobile ? 175 : 563, mobile ? 92 : 32, tr('主题：设备读数', 'Topic: Device Readings'), 'stream-title');
      rows.forEach(([lx, ly], lane) => {
        const key = 'AB'[lane], [sx, sy] = sources[lane];
        node([sx, sy], tr('设备 ', 'Device ') + key);
        label(lx + 55, ly - 2, tr('分区 ', 'Partition ') + lane, 'stream-detail', 'start');
        const times = [1.25, 2.17, 3.09].map(time => time + lane * 0.4);
        const values = [1, 2, 3].map(i => key + i);
        const positions = strip([lx - 24, ly], values, {offsets: true, arrivals: times});
        const rail = ly - 24;
        positions.forEach(([x, y], i) => {
          const entry = mobile ? (lane ? 317 : 32) : 305;
          const points = mobile
            ? [[lane ? sx + 65 : sx - 65, sy], [entry, sy], [entry, rail], [x, rail], [x, y]]
            : [[sx + 65, sy], [entry, sy], [entry, rail], [x, rail], [x, y]];
          travel(points, times[i] - 0.76, times[i], values[i]);
        });
      });
      return 4.35;
    }

    function consume(mobile) {
      const log = mobile ? [175, 99] : [180, 128];
      const destinations = mobile ? [[85, 225], [265, 225]] : [[588, 69], [588, 176]];
      const groupNames = [tr('告警组', 'Alert Group'), tr('写表组', 'Table Group')];
      label(log[0], log[1] - 42, tr('已保留的分区日志', 'Retained Partition Log'), 'stream-title');
      const positions = strip(log, ['A1', 'A2', 'A3'], {offsets: true});
      destinations.forEach(([x, y], group) => {
        node([x, y], groupNames[group], 154);
        const offset = label(x, y + 43, '', 'stream-detail');
        const times = group ? [2.85] : [1.55, 2.33];
        times.forEach((end, i) => {
          const [slotX, sy] = positions[i + 1];
          const sx = slotX + 16;
          const rail = mobile ? 159 + group * 23 : 192 + group * 24;
          const points = mobile
            ? [[sx, sy + 15], [sx, rail], [x, rail], [x, y - 20]]
            : [[sx, sy + 15], [sx, rail], [355 + group * 52, rail], [355 + group * 52, y], [x - 77, y]];
          travel(points, end - 0.8, end, 'A' + (i + 2));
        });
        moving.push(t => {
          const next = 1 + times.filter(end => t >= end).length;
          updateLabel(offset, tr('下一偏移量 ', 'Next Offset ') + next);
        });
      });
      return 4.1;
    }

    function backlog(mobile) {
      const log = mobile ? [175, 131] : [377, 119];
      const producer = mobile ? [175, 35] : [96, 119];
      const consumer = mobile ? [175, 242] : [658, 119];
      const [x, y] = log;
      label(x, y - (mobile ? 45 : 51), tr('分区日志', 'Partition Log'), 'stream-title');
      node(producer, tr('生产者', 'Producer'), 122);
      node(consumer, tr('读取暂停', 'Reads Paused'), 135);
      const times = [0, 0, 1.28, 2.17, 3.06, 3.95];
      const values = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'];
      const positions = strip(log, values, {offsets: true, first: 1, arrivals: times, waiting: true});
      positions.slice(2).forEach(([sx, sy], i) => {
        const end = times[i + 2];
        const points = mobile
          ? [[175, 55], [175, 59], [326, 59], [326, y - 26], [sx, y - 26], [sx, sy]]
          : [[157, 119], [184, 119], [184, y - 28], [sx, y - 28], [sx, sy]];
        travel(points, end - 0.75, end, values[i + 2]);
      });
      const readX = positions[1][0] + 16;
      const readY = y + 15;
      route(mobile ? [[readX, readY], [readX, 202], [175, 202], [175, 222]]
        : [[readX, readY], [readX, 180], [572, 180], [572, 119], [590.5, 119]]);
      draw(scene, 'circle', {cx: readX, cy: readY, r: 4, class: 'stream-marker'});
      label(mobile ? 175 : 658, mobile ? 274 : 161, tr('下一偏移量 1', 'Next Offset 1'), 'stream-detail');
      const endMarker = draw(scene, 'circle', {cy: y, r: 3, class: 'stream-marker'});
      const end = label(mobile ? 284 : 481, y + 49, '', 'stream-detail');
      const lag = label(mobile ? 175 : 377, mobile ? 298 : 219, '', 'stream-detail');
      moving.push(t => {
        const count = times.filter(time => t >= time).length;
        endMarker.setAttribute('cx', positions[count - 1][0] + 24.5);
        updateLabel(end, tr('日志末尾 ', 'Log End ') + count);
        const level = count <= 2 ? tr('较低', 'Low') : count <= 4 ? tr('升高', 'Rising') : tr('很高', 'High');
        updateLabel(lag, tr('积压：', 'Lag: ') + level);
        lag.classList.toggle('stream-strain', count > 2);
      });
      return 4.7;
    }

    function replay(mobile) {
      const log = mobile ? [175, 78] : [165, 118];
      const output = mobile ? [175, 236] : [596, 118];
      const [lx, ly] = log, [x, y] = output;
      label(lx, ly - 39, tr('分区日志', 'Partition Log'), 'stream-title');
      const [, [sx, sy]] = strip(log, ['A1', 'A2', 'A3'], {offsets: true});
      label(x, y - 37, tr('目标表', 'Destination Table'), 'stream-title');
      strip(output, ['A2']);
      label(lx, ly + 51, tr('已保存的偏移量：1', 'Saved Offset: 1'), 'stream-detail');
      const points = mobile
        ? [[sx, sy + 15], [sx, 94], [293, 94], [293, y], [x + 23, y]]
        : [[sx, sy + 15], [sx, sy + 16], [393, sy + 16], [393, y], [x - 23, y]];
      travel(points, 1.2, 2.8, 'A2', 42, 'stream-wait');
      const state = label(x, y + 46, '', 'stream-detail');
      moving.push(t => {
        const message = t < 1.2 ? tr('等待恢复', 'Waiting to Resume')
          : t < 2.8 ? tr('重放 A2', 'Replaying A2') : tr('A2 重复送达，仍为一行', 'A2 Arrives Again · One Row');
        updateLabel(state, message);
        state.classList.toggle('stream-recovered', t >= 2.8);
      });
      return 4.4;
    }

    function commit(mobile) {
      const log = mobile ? [175, 60] : [112, 121];
      const writer = mobile ? [175, 158] : [375, 121];
      const table = mobile ? [175, 256] : [644, 121];
      label(log[0], log[1] - 32, tr('事件日志', 'Event Log'), 'stream-title');
      label(writer[0], writer[1] - 32, tr('转换与写入', 'Transform and Write'), 'stream-title');
      label(table[0], table[1] - 32, tr('湖仓表', 'Lakehouse Table'), 'stream-title');
      const values = ['A2', 'B2'];
      const inputs = strip(log, values);
      const rows = ['A · 24 °C', 'B · 27 °C'];
      const staged = rows.map((row, i) => {
        const point = [writer[0] + (i ? 47 : -47), writer[1]];
        box(scene, point[0] - 43, point[1] - 15, 86, 30, 'stream-slot');
        at(1.28 + i * 0.4, block(actors, point, row, 86));
        return point;
      });
      const committed = rows.map((row, i) => {
        const point = [table[0] + (i ? 47 : -47), table[1]];
        box(scene, point[0] - 43, point[1] - 15, 86, 30, 'stream-slot');
        const stored = block(actors, point, row, 86);
        stored.classList.add('stream-ready');
        at(3.25, stored);
        return point;
      });
      inputs.forEach(([sx, sy], i) => {
        const [wx, wy] = staged[i], [tx, ty] = committed[i];
        const sign = i ? 1 : -1;
        const toWriter = mobile
          ? [[sx, sy + 15], [sx, 88], [wx + sign * 66, 88], [wx + sign * 66, wy], [wx, wy]]
          : [[sx, sy + 15], [sx, sy + 49 + i * 31], [wx, wy + 49 + i * 31], [wx, wy]];
        const toTable = mobile
          ? [[wx, wy + 15], [wx, 186], [tx + sign * 66, 186], [tx + sign * 66, ty], [tx, ty]]
          : [[wx, wy + 15], [wx, wy + 70 + i * 29], [tx, ty + 70 + i * 29], [tx, ty]];
        travel(toWriter, 0.43 + i * 0.4, 1.28 + i * 0.4, values[i]);
        travel(toTable, 2.4, 3.25, rows[i], 86, 'stream-ready');
      });
      const status = label(table[0], table[1] + (mobile ? 41 : 119), '', 'stream-detail');
      moving.push(t => {
        updateLabel(status, t < 3.25 ? tr('等待表提交', 'Awaiting Commit') : tr('已提交 · 可查询', 'Committed · Queryable'));
        status.classList.toggle('stream-recovered', t >= 3.25);
      });
      return 4.25;
    }

    const steps = [capture, append, consume, backlog, replay, commit];
    function paint(t) {
      moving.forEach(update => update(t));
    }
    function tick(now) {
      elapsed += Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const phase = elapsed % duration;
      actors.style.opacity = Math.min(1, phase / 0.2, (duration - phase) / 0.4);
      paint(phase);
      frame = requestAnimationFrame(tick);
    }
    function run() {
      cancelAnimationFrame(frame);
      if (paused || motion.matches) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
    function rebuild() {
      const mobile = narrow.matches;
      const [width, height] = mobile ? phone : desktop;
      ratio = width / height;
      elapsed = 0;
      moving = [];
      svg.replaceChildren();
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      svg.setAttribute('aria-label', tr(...descriptions[current]));
      wires = draw(svg, 'g');
      scene = draw(svg, 'g');
      actors = draw(svg, 'g');
      resultAt = steps[current](mobile);
      duration = resultAt + 0.8;
      label(width / 2, height - 13, tr('示意，不代表实测数字', 'Schematic, not measured'), 'stream-note');
      if (onLayout) onLayout(ratio, mobile);
      paint(motion.matches ? resultAt : 0);
      run();
    }
    const control = {
      show(i) { current = Math.max(0, Math.min(steps.length - 1, i)); rebuild(); },
      pause() { paused = true; cancelAnimationFrame(frame); },
      resume() { if (paused) { paused = false; run(); } },
      destroy() {
        control.pause();
        narrow.removeEventListener('change', rebuild);
        motion.removeEventListener('change', rebuild);
        document.removeEventListener('ss-lang', rebuild);
        delete host.__anim;
        svg.remove();
      },
      ratio: () => ratio,
      step: () => current
    };
    narrow.addEventListener('change', rebuild);
    motion.addEventListener('change', rebuild);
    document.addEventListener('ss-lang', rebuild);
    rebuild();
    host.__anim = control;
    return control;
  }

  window.SSAnim = window.SSAnim || {};
  window.SSAnim.stream = {steps: 6, mount};
})();
