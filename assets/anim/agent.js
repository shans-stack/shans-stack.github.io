/* Topic animation. The page controls the step; the module owns layout, language and playback. */
(function () {
  'use strict';

  const id = 'agent';
  const prefix = 'an-' + id;
  const namespace = 'http://www.w3.org/2000/svg';
  const EN = {
  "调用提议 A / B": "Proposals A / B",
  "两次独立请求": "Separate requests",
  "A · 获准": "A · Allowed",
  "B · 未获准": "B · Denied",
  "提出读取调用": "Propose a read",
  "校验并调用": "Check and dispatch",
  "工具返回正文": "Tool returns text",
    "任务": "Task",
    "当前目标": "Current goal",
    "工具说明": "Tool definitions",
    "名称与参数格式": "Names and schemas",
    "Agent 运行程序": "Agent runtime",
    "组装当前上下文": "Assemble context",
    "模型推理": "Model inference",
    "选择回答或调用": "Answer or call",
    "任务与工具说明进入模型上下文": "Task and tools enter model context",
    "调用提议": "Proposed call",
    "工具名称与参数": "Name and arguments",
    "执行前校验": "Validation gate",
    "格式与权限": "Format and access",
    "运行工具": "Run the tool",
    "查询获准": "Search allowed",
    "阻止执行": "Block execution",
    "调用未获批准": "Approval missing",
    "执行权限由运行程序检查": "The runtime checks execution permission",
    "运行程序": "Agent runtime",
    "发出已批准的查询": "Send approved search",
    "目录查询": "Catalog search",
    "读取目录记录": "Read catalog records",
    "工具结果": "Tool response",
    "记录或错误": "Records or errors",
    "任务状态": "Task state",
    "保存观察结果": "Record observation",
    "工具返回结果供下一轮使用": "The tool returns an observation",
    "任务上下文": "Task context",
    "目标和已有观察": "Goal and observation",
    "下一轮推理": "Next inference",
    "选择读取原文": "Request source text",
    "读取工具": "Read tool",
    "按标识定位正文": "Fetch text by ID",
    "新观察": "New observation",
    "返回正文": "Return source text",
    "一次工具结果进入下一轮推理": "One tool result starts the next inference",
    "最新状态": "Latest state",
    "目标、观察、预算": "Goal, results, budget",
    "停止条件": "Stopping condition",
    "判定终止原因": "Evaluate end state",
    "任务完成": "Completed",
    "返回最终结果": "Return final result",
    "预算用尽": "Budget exhausted",
    "返回当前状态": "Return current state",
    "在状态检查点结束循环": "The loop ends at a status check",
    "示意，不代表实测数字": "Schematic, not measured"
  };
  const scenes = [
    ["任务与工具说明进入模型上下文", "merge",
      [
        ["任务", "当前目标", "data", 0],
        ["工具说明", "名称与参数格式", "control", 0],
        ["Agent 运行程序", "组装当前上下文", "data", 0],
        ["模型推理", "选择回答或调用", "good", 0],
      ],
      [
        [0, 2, 0.35, "data", 0.7, 1, null],
        [1, 2, 0.67, "control", 0.7, 1, null],
        [2, 3, 1.8, "good", 0.7, 1, null],
      ]
    ],
    ["执行权限由运行程序检查", "fork",
      [
        ["调用提议 A / B", "两次独立请求", "data", 0],
        ["执行前校验", "格式与权限", "control", 0],
        ["运行工具", "A · 获准", "good", 0],
        ["阻止执行", "B · 未获准", "wait", 0],
      ],
      [
        [0, 1, 0.44, "data", 0.7, 1, null, "A"],
        [1, 2, 1.29, "good", 0.7, 1, null, "A"],
        [0, 1, 2.12, "data", 0.7, 1, null, "B"],
        [1, 3, 2.97, "wait", 0.7, 1, null, "B"],
      ]
    ],
    ["工具返回结果供下一轮使用", "square",
      [
        ["运行程序", "发出已批准的查询", "data", 0],
        ["目录查询", "读取目录记录", "control", 0],
        ["工具结果", "记录或错误", "good", 0],
        ["任务状态", "保存观察结果", "good", 0],
      ],
      [
        [0, 1, 0.37, "data", 0.7, 1, null],
        [1, 2, 1.38, "good", 0.7, 1, null],
        [2, 3, 2.45, "good", 0.7, 1, null],
      ]
    ],
    ["一次工具结果进入下一轮推理", "square",
      [
        ["任务上下文", "目标和已有观察", "data", 0],
        ["下一轮推理", "提出读取调用", "control", 0],
        ["运行程序", "校验并调用", "data", 0],
        ["新观察", "工具返回正文", "good", 0],
      ],
      [
        [0, 1, 0.38, "data", 0.7, 1, null],
        [1, 2, 1.25, "control", 0.7, 1, null],
        [2, 3, 2.1, "good", 0.7, 1, null],
        [3, 0, 2.95, "good", 0.7, 1, null],
      ]
    ],
    ["在状态检查点结束循环", "fork",
      [
        ["最新状态", "目标、观察、预算", "data", 0],
        ["停止条件", "判定终止原因", "control", 0],
        ["任务完成", "返回最终结果", "good", 0],
        ["预算用尽", "返回当前状态", "wait", 0],
      ],
      [
        [0, 1, 0.44, "data", 0.7, 1, null],
        [1, 2, 1.65, "good", 0.7, 1, null],
        [1, 3, 2.76, "wait", 0.7, 1, null],
      ]
    ],
  ];

  function mount(host, {paused = false, onLayout} = {}) {
    const media = matchMedia('(max-width: 640px)');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(namespace, 'svg');
    svg.setAttribute('class', prefix);
    svg.setAttribute('role', 'img');
    host.replaceChildren(svg);

    let current = 0;
    let mobile, width, height, elapsed, last, content, effects;
    let frame = null;
    const T = label => window.SS_LANG === 'en' ? (EN[label] ?? label) : label;
    const clamp = x => Math.max(0, Math.min(1, x));
    const size = (large, small) => mobile ? small : large;

    function element(tag, attrs, group = content) {
      const item = document.createElementNS(namespace, tag);
      for (const [key, value] of Object.entries(attrs)) item.setAttribute(key, value);
      group.append(item);
      return item;
    }

    function styled(tag, style, attrs, group) {
      return element(tag, {...attrs, class: prefix + '-' + style.replaceAll(' ', ' ' + prefix + '-')}, group);
    }

    function label(x, y, value, kind = 'label', anchor = 'middle', group) {
      const item = styled('text', kind, {x, y, 'text-anchor': anchor}, group);
      item.textContent = T(value);
      return item;
    }

    function line(points, kind = 'wire', group) {
      return styled('path', kind, {d: 'M' + points.map(point => point.join(' ')).join(' L')}, group);
    }

    function track(points, tone = 'data', arrow = true, group) {
      const path = line(points, 'wire ' + tone, group);
      if (arrow) {
        const end = points.at(-1);
        const before = points.at(-2);
        const angle = Math.atan2(end[1] - before[1], end[0] - before[0]) * 180 / Math.PI;
        styled('path', 'arrow ' + tone, {d: 'M-8 -4 L0 0 L-8 4 Z',
          transform: 'translate(' + end.join(' ') + ') rotate(' + angle + ')'}, group);
      }
      return path;
    }

    function packet(path, start, end, tone = 'data', name) {
      const item = element('g', {});
      const w = name ? 24 : 15, h = name ? 22 : 10;
      styled('rect', 'packet ' + tone, {width: w, height: h, x: -w/2, y: -h/2, rx: 2}, item);
      if (name) label(0, 0, name, 'label', 'middle', item);
      const length = path.getTotalLength();
      effects.push(time => {
        const progress = clamp((time - start) / (end - start));
        const pt = path.getPointAtLength(length * progress);
        item.setAttribute('transform', 'translate(' + pt.x + ' ' + pt.y + ')');
        item.style.opacity = clamp((time - start) * 10) * clamp((end - time) * 10);
      });
    }

    function bounds([x, y], w = size(256, 154), h = 82) {
      return {x, y, w, h, left: x-w/2, right: x+w/2, top: y-h/2, bottom: y+h/2};
    }

    function box(rect, tone = 'data', group) {
      const {left: x, top: y, w: width, h: height} = rect;
      return styled('rect', 'node ' + tone, {x, y, width, height, rx: 6}, group);
    }

    function tile(rect, [title, detail, tone = 'data', marks = 0]) {
      const {x, y} = rect;
      label(x, y - (marks ? 23 : 13), title);
      label(x, y + (marks ? 4 : 14), detail, 'detail');
      for (let i = 0; i < marks; i++) {
        styled('rect', 'packet ' + tone, {x: x - (marks*17-4)/2 + i*17, y: y+23, width: 13, height: 8, rx: 1});
      }
    }

    function route(from, to, side) {
      const horizontal = side === 'x' || (side !== 'y' && (from.y === to.y || (!mobile && from.x !== to.x)));
      if (horizontal) {
        const a = from.x < to.x ? from.right : from.left;
        const b = from.x < to.x ? to.left : to.right;
        const mid = (a+b)/2;
        return from.y === to.y ? [[a, from.y], [b, to.y]] :
          [[a, from.y], [mid, from.y], [mid, to.y], [b, to.y]];
      }
      const a = from.y < to.y ? from.bottom : from.top;
      const b = from.y < to.y ? to.top : to.bottom;
      const mid = (a+b)/2;
      return from.x === to.x ? [[from.x, a], [to.x, b]] :
        [[from.x, a], [from.x, mid], [to.x, mid], [to.x, b]];
    }

    const positions = {
      fork: () => mobile ? [[180, 92], [180, 224], [94, 356], [266, 356]] :
        [[150, 183], [460, 183], [770, 112], [770, 254]],
      merge: () => mobile ? [[94, 92], [266, 92], [180, 224], [180, 356]] :
        [[150, 112], [150, 254], [460, 183], [770, 183]],
      square: () => mobile ? [[86, 120], [274, 120], [274, 342], [86, 342]] :
        [[250, 104], [670, 104], [670, 270], [250, 270]],
    };

    function diagram(heading, layout, labels, links) {
      label(width/2, 26, heading, 'heading');
      const boxes = positions[layout]().map(position => bounds(position));
      const tracks = new Map();
      const paths = links.map(([a, b, , tone, , , side]) => {
        const key = [a, b, tone, side].join('/');
        if (!tracks.has(key)) tracks.set(key, track(route(boxes[a], boxes[b], side), tone));
        return tracks.get(key);
      });
      const outlines = boxes.map((rect, i) => box(rect, labels[i][2]));
      const arrivals = boxes.map(() => []);
      links.forEach(([, b, start, tone, duration, quantity, , name], i) => {
        if (start === null) return;
        for (let block = 0; block < quantity; block++) {
          const departure = start + block*.19;
          packet(paths[i], departure, departure + duration, tone, name);
          arrivals[b].push(departure + duration);
        }
      });
      labels.forEach((data, i) => {
        tile(boxes[i], data);
        if (!arrivals[i].length) return;
        effects.push(time => {
          const active = arrivals[i].reduce((highlight, arrived) => {
            const pulse = time < arrived ? 0 : 1-clamp((time-arrived)/.65);
            return Math.max(highlight, pulse);
          }, 0);
          outlines[i].style.strokeWidth = 1.25 + 2*active;
        });
      });
    }

function ratio() {
      return media.matches ? 360/482 : 920/376;
    }

    function paint(time) {
      for (const effect of effects) effect(time);
    }

    function redraw() {
      mobile = media.matches;
      width = size(920, 360);
      height = size(376, 482);
      elapsed = 0;
      last = undefined;
      effects = [];
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      svg.setAttribute('aria-label', T(scenes[current][0]));
      svg.replaceChildren();
      content = element('g', {}, svg);
      const [heading, layout, ...data] = scenes[current];
      diagram(heading, layout, ...data);
      label(width/2, height-17, '示意，不代表实测数字', 'note', 'middle', svg);
      paint(motion.matches ? 4.1 : 0);
    }

    function tick(now) {
      elapsed += Math.min(.06, Math.max(0, (now - (last ?? now))/1000));
      last = now;
      const time = elapsed % 4.8;
      content.style.opacity = clamp(time/.22) * clamp((4.8-time)/.26);
      paint(time);
      frame = requestAnimationFrame(tick);
    }

    function pause() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      last = undefined;
    }

    function resume() {
      if (frame === null && !paused && !motion.matches) frame = requestAnimationFrame(tick);
    }

    function sync() {
      pause();
      redraw();
      resume();
    }

    function resize() {
      redraw();
      onLayout?.(ratio(), mobile);
    }

    document.addEventListener('ss-lang', redraw);
    media.addEventListener('change', resize);
    motion.addEventListener('change', sync);
    resize();
    resume();

    const animation = {
      show(i) {
        current = Math.min(Math.max(0, i), scenes.length-1);
        redraw();
      },
      pause() {
        paused = true;
        pause();
      },
      resume() {
        paused = false;
        resume();
      },
      destroy() {
        pause();
        document.removeEventListener('ss-lang', redraw);
        media.removeEventListener('change', resize);
        motion.removeEventListener('change', sync);
        svg.remove();
        delete host.__anim;
      },
      ratio,
      step: () => current
    };
    host.__anim = animation;
    return animation;
  }

  (window.SSAnim ||= {})[id] = {steps: scenes.length, mount};
})();
