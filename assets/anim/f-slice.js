(function () {
  'use strict';

  const id = 'f-slice';
  const captions = [
    ['整块设备分给工作负载 A', 'Job A receives the whole GPU'],
    ['各 GPU 实例可并行执行', 'MIG instances can run in parallel'],
    ['A 与 B 交替执行，共用显存容量', 'Alternating jobs, shared memory'],
    ['示例故障发生于 A 的执行路径', 'Fault while job A runs'],
    ['时间片副本共享其所在实例的边界', 'Replicas share one instance']
  ];

  function mount(host, options = {}) {
    const mobile = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const size = () => mobile.matches ? [350, 444] : [880, 338];
    const ratio = () => size()[0] / size()[1];
    const local = pair => pair[window.SS.lang() === 'en' ? 1 : 0];
    let svg, current = 0, elapsed = 0, last, frame, packets, slots, faults;
    let paused = Boolean(options.paused);

    function el(tag, attrs, cls, value, parent = svg) {
      const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const [key, val] of Object.entries(attrs)) node.setAttribute(key, val);
      if (cls) node.setAttribute('class', id + '-' + cls);
      if (value) node.textContent = value;
      parent.append(node);
      return node;
    }

    function text(x, y, pair, cls = 'label', parent = svg) {
      return el('text', {x, y, 'text-anchor': 'middle'}, cls, local(pair), parent);
    }

    function box(x, y, width, height, cls, parent = svg) {
      return el('rect', {x, y, width, height, rx: 4}, cls, null, parent);
    }

    function device(x, y, w, h, title) {
      box(x, y, w, h, 'device');
      text(x + w / 2, y + 24, title, 'title');
    }

    function task(x, y, w, name, inactive = false) {
      box(x, y, w, 41, inactive ? 'inactive' : 'box');
      text(x + w / 2, y + 26, [`任务 ${name}`, `Job ${name}`], inactive ? 'muted' : 'label');
    }

    function wire(d, end, direction, offset, tone) {
      const path = el('path', {d}, 'wire');
      el('path', {d: 'M-7 -4 L0 0 L-7 4', transform: `translate(${end.join(' ')}) rotate(${direction})`}, 'wire');
      const packet = el('rect', {width: 9, height: 9, rx: 2, 'data-tone': tone}, 'packet');
      packets.push({path, length: path.getTotalLength(), packet, offset});
    }

    function timeline(x, y, width, labels) {
      const gap = 5;
      const span = (width - (labels.length - 1) * gap) / labels.length;
      labels.forEach((letter, i) => {
        const left = x + i * (span + gap);
        const slot = box(left, y, span, 29, 'slot');
        slot.dataset.tone = letter;
        text(left + span / 2, y + 20, [letter, letter]);
        slots.push(slot);
      });
    }

    function whole(narrow) {
      if (narrow) {
        task(34, 42, 129, 'A');
        task(187, 42, 129, 'B', true);
        device(34, 167, 282, 156, ['物理 GPU', 'Physical GPU']);
        box(53, 218, 244, 79, 'box');
        text(175, 264, ['整卡计算与显存', 'Full Compute and Memory']);
        wire('M98.5 83 V124 H175 V167', [175, 167], 90, .2, 'A');
      } else {
        task(91, 102, 158, 'A');
        task(91, 174, 158, 'B', true);
        device(420, 48, 369, 196, ['物理 GPU', 'Physical GPU']);
        box(451, 102, 307, 112, 'box');
        text(604.5, 164, ['整卡计算与显存', 'Full Compute and Memory']);
        wire('M249 122.5 H333 V158 H420', [420, 158], 0, .2, 'A');
      }
    }

    function sharing(narrow, timeSliced) {
      const [tx, ty, gap, tw] = narrow ? [34, 35, 153, 129] : [91, 79, 92, 158];
      const [x, y, w, h] = narrow ? [22, 151, 306, 197] : [396, 38, 394, 220];
      task(tx, ty, tw, 'A');
      task(narrow ? tx + gap : tx, narrow ? ty : ty + gap, tw, 'B');
      device(x, y, w, h, timeSliced ? ['共享 GPU', 'Shared GPU'] : ['物理 GPU · NVIDIA MIG', 'Physical GPU · NVIDIA MIG']);

      if (timeSliced) {
        box(x + 20, y + 43, w - 40, 63, 'box');
        text(x + w / 2, y + 79, ['共用显存容量', 'Shared Memory Capacity']);
        text(x + w / 2, y + 134, ['执行时间 →', 'Execution Time →'], 'muted');
        timeline(x + 20, y + 148, w - 40, ['A', 'B', 'A', 'B']);
      } else {
        const instances = narrow
          ? [[35, 201, 133, 121], [182, 201, 133, 121]]
          : [[420, 75, 346, 70], [420, 159, 346, 70]];
        instances.forEach(([ix, iy, iw, ih], i) => {
          box(ix, iy, iw, ih, 'box').dataset.tone = i ? 'B' : 'A';
          text(ix + iw / 2, iy + (narrow ? 48 : 28), [`实例 ${i ? 'B' : 'A'}`, `Instance ${i ? 'B' : 'A'}`]);
          text(ix + iw / 2, iy + (narrow ? 75 : 52), ['独立显存', 'Own Memory'], 'muted');
        });
      }

      const ends = narrow
        ? (timeSliced ? [175, 175] : [101.5, 248.5])
        : (timeSliced ? [126, 126] : [110, 194]);
      ends.forEach((end, i) => {
        const tone = i ? 'B' : 'A';
        const offset = timeSliced ? i * .8 + .12 : .2;
        if (narrow) {
          wire(`M${tx + i * gap + tw / 2} ${ty + 41} V${106 + i * 16} H${end} V${y}`, [end, y], 90, offset, tone);
        } else {
          wire(`M${tx + tw} ${ty + i * gap + 20.5} H${310 + i * 24} V${end} H${x}`, [x, end], 0, offset, tone);
        }
      });
    }

    function faultPanel(x, y, w, shared) {
      const title = shared ? ['时间片共享', 'Time-Slicing'] : ['NVIDIA MIG', 'NVIDIA MIG'];
      const height = mobile.matches ? 141 : 205;
      const top = y + (mobile.matches ? 40 : 62);
      const cellHeight = mobile.matches ? 57 : 82;
      device(x, y, w, height, title);
      const nodes = shared ? [
        [x + 15, w - 30, ['任务 A 与 B', 'Jobs A and B'], ['同一显存与故障域', 'Shared memory and fault domain']]
      ] : [
        [x + 15, w / 2 - 21, ['实例 A', 'Instance A'], ['独立显存', 'Own memory']],
        [x + w / 2 + 6, w / 2 - 21, ['实例 B', 'Instance B'], ['独立显存', 'Own memory']]
      ];
      nodes.forEach(([left, width, title, detail], i) => {
        const node = el('g', {}, 'fault');
        box(left, top, width, cellHeight, 'box', node);
        text(left + width / 2, top + (mobile.matches ? 24 : 34), title, 'label', node);
        text(left + width / 2, top + (mobile.matches ? 45 : 59), detail, 'muted', node);
        if (i === 0) faults.push({
          node,
          label: text(x + w / 2, y + height - 16, ['', ''], 'status'),
          pair: shared ? ['共享设备受影响', 'Shared device affected'] : ['实例 A 受影响', 'Instance A affected']
        });
      });
    }

    function nested(narrow) {
      const [x, y, w, h] = narrow ? [18, 127, 302, 236] : [368, 27, 469, 249];
      device(x, y, w, h, ['物理 GPU · NVIDIA MIG', 'Physical GPU · NVIDIA MIG']);
      box(x + 14, y + 40, w - 28, 99, 'box');
      text(x + w / 2, y + 68, ['实例 A · 内部轮转', 'Instance A · Time-Sliced']);
      timeline(x + 29, y + 85, w - 58, ['A', 'B', 'A', 'B']);
      box(x + 14, y + 153, w - 28, 60, 'box').dataset.tone = 'C';
      text(x + w / 2, y + 190, ['实例 B · 任务 C', 'Instance B · Job C']);

      const names = ['A', 'B', 'C'];
      names.forEach((name, i) => {
        const taskX = narrow ? 20 + i * 106 : 65;
        const taskY = narrow ? 16 : 43 + i * 76;
        const width = narrow ? 98 : 159;
        task(taskX, taskY, width, name);
        const offset = i === 1 ? .95 : .13;
        if (narrow) {
          const start = taskX + width / 2;
          if (i === 2) {
            const end = x + w - 14;
            wire(`M${start} 57 V78 H337 V310 H${end}`, [end, 310], 180, offset, name);
          } else {
            wire(`M${start} 57 V${78 + i * 12} H111 V${y}`, [111, y], 90, offset, name);
          }
        } else {
          const end = i === 2 ? 213 : 124;
          const left = x + 14;
          wire(`M224 ${taskY + 20.5} H${270 + i * 22} V${end} H${left}`, [left, end], 0, offset, name);
        }
      });
    }

    function draw() {
      host.replaceChildren();
      const narrow = mobile.matches;
      const [w, h] = size();
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.setAttribute('class', id + '-diagram');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', local(window.SS_TOPIC_CFG.steps[current].t) + '. ' + local(captions[current]));
      host.append(svg);
      packets = [];
      slots = [];
      faults = [];
      if (current === 0) whole(narrow);
      if (current === 1 || current === 2) sharing(narrow, current === 2);
      if (current === 3) {
        faultPanel(narrow ? 18 : 24, narrow ? 30 : 42, narrow ? 314 : 400, false);
        faultPanel(narrow ? 18 : 456, narrow ? 194 : 42, narrow ? 314 : 400, true);
      }
      if (current === 4) nested(narrow);
      text(w / 2, h - 48, captions[current], 'title');
      text(w / 2, h - 20, ['示意，不代表实测数字', 'Illustrative, not measured'], 'muted');
      options.onLayout?.(ratio(), narrow);
    }

    function render(time) {
      const still = reduced.matches;
      for (const {path, length, packet, offset} of packets) {
        const phase = current === 2 || current === 4 ? time % 1.6 : time;
        const p = Math.max(0, Math.min(1, (phase - offset) / .7));
        const point = path.getPointAtLength(p * length);
        packet.setAttribute('x', point.x - 4.5);
        packet.setAttribute('y', point.y - 4.5);
        packet.setAttribute('opacity', still ? 0 : Math.max(0, Math.min(1, p * 8, (1 - p) * 8)));
      }
      slots.forEach((slot, index) => {
        slot.dataset.active = String(still || index === Math.floor(time / .8) % slots.length);
      });
      for (const {node, label, pair} of faults) {
        const active = still || time >= .8;
        node.dataset.fault = String(active);
        label.textContent = active ? local(pair) : '';
      }
    }

    function tick(now) {
      elapsed = (elapsed + Math.max(0, now - last) / 1000) % 3.2;
      last = now;
      render(elapsed);
      frame = requestAnimationFrame(tick);
    }

    function play() {
      cancelAnimationFrame(frame);
      if (paused || reduced.matches) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }

    function rebuild() {
      draw();
      render(elapsed);
      play();
    }

    const api = {
      show(i) {
        current = Math.max(0, Math.min(captions.length - 1, i));
        elapsed = 0;
        rebuild();
      },
      pause() {
        paused = true;
        cancelAnimationFrame(frame);
      },
      resume() {
        paused = false;
        play();
      },
      destroy() {
        api.pause();
        mobile.removeEventListener('change', rebuild);
        reduced.removeEventListener('change', rebuild);
        document.removeEventListener('ss-lang', rebuild);
        host.replaceChildren();
        delete host.__anim;
      },
      ratio,
      step: () => current
    };

    mobile.addEventListener('change', rebuild);
    reduced.addEventListener('change', rebuild);
    document.addEventListener('ss-lang', rebuild);
    host.__anim = api;
    rebuild();
    return api;
  }

  (window.SSAnim ||= {})[id] = {steps: 5, mount};
}());
