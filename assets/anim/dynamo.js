/* Topic animation. The page controls the step; the module owns layout, language and playback. */
(function () {
  'use strict';

  const id = 'dynamo';
  const prefix = 'an-' + id;
  const namespace = 'http://www.w3.org/2000/svg';
  const EN = {
    "应用": "Application",
    "提交生成请求": "Submit request",
    "Dynamo 前端": "Dynamo frontend",
    "接收并派发": "Accept and dispatch",
    "工作进程": "Inference worker",
    "运行模型引擎": "Run model engine",
    "流式输出": "Token stream",
    "经前端送出": "Returned via frontend",
    "服务层连接应用和推理引擎": "Connect apps to inference workers",
    "工作进程 A": "Worker A",
    "建立缓存块": "Creates KV blocks",
    "工作进程 B": "Worker B",
    "释放缓存块": "Releases KV blocks",
    "前缀索引": "Prefix index",
    "更新缓存位置": "Update locations",
    "路由器": "Router",
    "查位置并跟踪负载": "Track cache and load",
    "缓存索引记录位置，KV 留在原处": "The index stores locations, KV stays put",
    "新请求": "New request",
    "含共享前缀": "Has a shared prefix",
    "KV 路由器": "KV router",
    "对照前缀索引": "Check prefix index",
    "前缀已缓存": "Prefix cached",
    "需重新计算": "Must compute prefix",
    "同等负载下评估可复用前缀": "Evaluate prefix reuse at similar load",
    "估算整体成本": "Estimate total cost",
    "A · 前缀命中": "A · Prefix hit",
    "负载很高": "Very high load",
    "B · 前缀未命中": "B · Prefix miss",
    "负载较低": "Lower load",
    "缓存命中与活跃负载一起计入": "Cache hits and active load both matter",
    "协调阶段交接": "Coordinate handoff",
    "预填充实例": "Prefill worker",
    "保留源 KV": "Retain source KV",
    "解码实例": "Decode worker",
    "获得 KV 副本": "Receive a KV copy",
    "输出流": "Output stream",
    "继续生成 token": "Continue generation",
    "前端协调请求，实例之间直传 KV": "Coordinate requests and transfer KV",
    "运行指标": "Runtime metrics",
    "前端与工作进程": "Frontend and workers",
    "规划器": "Planner",
    "计算实例目标数": "Set worker targets",
    "部署控制器": "Deploy controller",
    "按目标调整部署": "Reconcile deployment",
    "可用实例": "Ready workers",
    "加入路由候选集合": "Eligible for routing",
    "控制器按目标补足可用实例": "The controller reconciles worker capacity",
    "示意，不代表实测数字": "Schematic, not measured"
  };
  const scenes = [
    ["服务层连接应用和推理引擎", "square",
      [
        ["应用", "提交生成请求", "data", 0],
        ["Dynamo 前端", "接收并派发", "control", 0],
        ["工作进程", "运行模型引擎", "data", 0],
        ["流式输出", "经前端送出", "good", 0],
      ],
      [
        [0, 1, 0.35, "data", 0.7, 1, null],
        [1, 2, 1.39, "data", 0.7, 1, null],
        [2, 1, 2.44, "good", 0.7, 1, null],
        [1, 3, 3.26, "good", 0.57, 1, "y"],
      ]
    ],
    ["缓存索引记录位置，KV 留在原处", "merge",
      [
        ["工作进程 A", "建立缓存块", "good", 4],
        ["工作进程 B", "释放缓存块", "data", 2],
        ["前缀索引", "更新缓存位置", "control", 0],
        ["路由器", "查位置并跟踪负载", "good", 0],
      ],
      [
        [0, 2, 0.51, "control", 0.7, 1, null],
        [1, 2, 1.3, "control", 0.7, 1, null],
        [2, 3, 2.48, "control", 0.7, 1, null],
      ]
    ],
    ["同等负载下评估可复用前缀", "fork",
      [
        ["新请求", "含共享前缀", "data", 0],
        ["KV 路由器", "对照前缀索引", "control", 0],
        ["工作进程 A", "前缀已缓存", "good", 4],
        ["工作进程 B", "需重新计算", "idle", 0],
      ],
      [
        [0, 1, 0.42, "data", 0.7, 1, null],
        [1, 2, 1.65, "good", 0.7, 1, null],
        [1, 3, null, "idle", 0.7, 1, null],
      ]
    ],
    ["缓存命中与活跃负载一起计入", "fork",
      [
        ["新请求", "含共享前缀", "data", 0],
        ["KV 路由器", "估算整体成本", "control", 0],
        ["A · 前缀命中", "负载很高", "wait", 5],
        ["B · 前缀未命中", "负载较低", "good", 1],
      ],
      [
        [0, 1, 0.36, "data", 0.7, 1, null],
        [1, 2, null, "idle", 0.7, 1, null],
        [1, 3, 1.75, "good", 0.7, 1, null],
      ]
    ],
    ["前端协调请求，实例之间直传 KV", "diamond",
      [
        ["Dynamo 前端", "协调阶段交接", "control", 0],
        ["预填充实例", "保留源 KV", "data", 4],
        ["解码实例", "获得 KV 副本", "good", 4],
        ["输出流", "继续生成 token", "good", 0],
      ],
      [
        [0, 1, 0.32, "control", 0.69, 1, "y"],
        [0, 2, 0.7, "control", 0.69, 1, "y"],
        [1, 2, 1.92, "data", 0.69, 4, null],
        [2, 3, 3.25, "good", 0.62, 1, "y"],
      ]
    ],
    ["控制器按目标补足可用实例", "square",
      [
        ["运行指标", "前端与工作进程", "data", 0],
        ["规划器", "计算实例目标数", "control", 0],
        ["部署控制器", "按目标调整部署", "control", 0],
        ["可用实例", "加入路由候选集合", "good", 3],
      ],
      [
        [0, 1, 0.34, "control", 0.7, 1, null],
        [1, 2, 1.44, "control", 0.7, 1, null],
        [2, 3, 2.5, "good", 0.7, 1, null],
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
    const T = label => window.SS_LANG === 'en' ? EN[label] : label;
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

    function packet(path, start, end, tone = 'data') {
      const item = styled('rect', 'packet ' + tone, {width: 15, height: 10, x: -7.5, y: -5, rx: 2});
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
      diamond: () => mobile ? [[180, 82], [94, 224], [266, 224], [180, 366]] :
        [[460, 84], [150, 183], [770, 183], [460, 282]]
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
      links.forEach(([, b, start, tone, duration, quantity], i) => {
        if (start === null) return;
        for (let block = 0; block < quantity; block++) {
          const departure = start + block*.19;
          packet(paths[i], departure, departure + duration, tone);
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
