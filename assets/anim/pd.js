/* Topic animation. The page controls the step; the module owns layout, language and playback. */
(function () {
  'use strict';

  const id = 'pd';
  const prefix = 'an-' + id;
  const namespace = 'http://www.w3.org/2000/svg';
  const EN = {
    "新提示词": "New prompt",
    "预填充工作": "Prefill work",
    "活跃序列": "Active sequence",
    "解码工作": "Decode work",
    "共享调度器": "Shared scheduler",
    "分配同一执行组": "Assign one pool",
    "共享执行组": "Shared pool",
    "两个阶段共用资源": "Share resources",
    "两类工作由同一调度器排程": "One scheduler places both kinds of work",
    "输入 token": "Input tokens",
    "多个位置可并行": "Parallel input positions",
    "预填充": "Prefill",
    "处理一段输入": "Process a prompt",
    "解码": "Decode",
    "每轮读取已有 KV": "Read KV each step",
    "输出 token": "Output tokens",
    "每轮依次送出": "One token per step",
    "预填充处理多个位置，解码逐步生成": "Parallel input and sequential output",
    "预填充执行组": "Prefill pool",
    "保留源 KV": "Retain source KV",
    "KV 传输通道": "KV data path",
    "搬运缓存副本": "Transfer a KV copy",
    "解码执行组": "Decode pool",
    "用收到的 KV 续算": "Resume with KV",
    "交接跨越预填充与解码实例": "Transfer KV between worker pools",
    "独立解码组": "Separate decode pool",
    "长预填充占用": "Long prefill blocks decode",
    "解码继续": "Decode keeps running",
    "已送达": "Delivered",
    "共享与分离的解码节奏": "Shared and split decode cadence",
    "请求发出": "Request sent",
    "首个 token": "First token",
    "后续 token": "Later tokens",
    "请求到首个 token": "Request to first token",
    "相邻 token 间隔": "Token-to-token gap",
    "分别观察首 token 与后续间隔": "First-token wait and later gaps",
    "排队与输入计算": "Queue and compute",
    "KV 交接": "KV handoff",
    "等待与数据传输": "Wait and transfer",
    "排队与输出间隔": "Queue and cadence",
    "请求路径有三个独立的观测点": "Measure the three request stages",
    "示意，不代表实测数字": "Schematic, not measured"
  };
  const scenes = [
    ["两类工作由同一调度器排程", "merge",
      [
        ["新提示词", "预填充工作", "data", 4],
        ["活跃序列", "解码工作", "good", 0],
        ["共享调度器", "分配同一执行组", "control", 0],
        ["共享执行组", "两个阶段共用资源", "data", 0],
      ],
      [
        [0, 2, 0.38, "data", 0.67, 3, null],
        [1, 2, 1.48, "good", 0.7, 1, null],
        [2, 3, 2.45, "control", 0.7, 1, null],
      ]
    ],
    ["预填充处理多个位置，解码逐步生成", "parallel",
      [
        ["输入 token", "多个位置可并行", "data", 4],
        ["预填充", "处理一段输入", "data", 0],
        ["解码", "每轮读取已有 KV", "control", 0],
        ["输出 token", "每轮依次送出", "good", 0],
      ],
      [
        [0, 1, 0.68, "data", 0.82, 4, null],
        [2, 3, 0.65, "good", 0.57, 1, null],
        [2, 3, 1.65, "good", 0.57, 1, null],
        [2, 3, 2.65, "good", 0.57, 1, null],
      ]
    ],
    ["交接跨越预填充与解码实例", "chain",
      [
        ["预填充执行组", "保留源 KV", "data", 4],
        ["KV 传输通道", "搬运缓存副本", "control", 0],
        ["解码执行组", "用收到的 KV 续算", "good", 4],
      ],
      [
        [0, 1, 0.45, "data", 0.66, 4, null],
        [1, 2, 1.68, "good", 0.71, 4, null],
      ]
    ],
    ["共享与分离的解码节奏", "comparison",
      ["共享执行组", "独立解码组", "长预填充占用", "解码继续", "已送达"]
    ],
    ["分别观察首 token 与后续间隔", "latency",
      ["请求发出", "首个 token", "后续 token", "请求到首个 token", "相邻 token 间隔"]
    ],
    ["请求路径有三个独立的观测点", "chain",
      [
        ["预填充", "排队与输入计算", "data", 0],
        ["KV 交接", "等待与数据传输", "wait", 0],
        ["解码", "排队与输出间隔", "good", 0],
      ],
      [
        [0, 1, 0.53, "wait", 0.73, 3, null],
        [1, 2, 1.83, "good", 0.72, 3, null],
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
      chain: () => mobile ? [[180, 92], [180, 224], [180, 356]] : [[150, 183], [460, 183], [770, 183]],
      merge: () => mobile ? [[94, 92], [266, 92], [180, 224], [180, 356]] :
        [[150, 112], [150, 254], [460, 183], [770, 183]],
      parallel: () => mobile ? [[86, 132], [274, 132], [86, 322], [274, 322]] :
        [[150, 112], [770, 112], [150, 254], [770, 254]],
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

    function comparison(heading, words) {
      label(width/2, 26, heading, 'heading');
      const x = size(56, 23);
      const end = width-x;
      const rows = size([122, 264], [148, 326]);
      const subtitle = [words[2],words[3]];
      const deliveries = [[.91, 2.53, 3.42], [.91, 1.53, 2.15, 2.77, 3.39]];
      rows.forEach((y, i) => {
        const tone = i ? 'good' : 'wait';
        label(x,y-51,words[i],'label','start');
        const count = label(end,y-51,words[4],'detail','end');
        const path = track([[x,y],[end,y]],tone);
        label(x,y+39,subtitle[i],'detail','start');
        if (!i) {
          const pause = styled('rect','packet wait',{x:width*.44,y:y-12,width:width*.23,height:24,rx:3});
          effects.push(time => {
            pause.style.opacity = .17 + .31 * clamp((time-.95)*8) * clamp((2.15-time)*8);
          });
        }
        for (const arrival of deliveries[i]) packet(path, arrival-.55, arrival, tone);
        effects.push(time => {
          const arrived = deliveries[i].filter(arrival => time >= arrival).length;
          count.textContent = T(words[4]) + ' ' + arrived;
        });
      });
    }

    function latency(heading, words) {
      label(width/2, 26, heading, 'heading');
      const y = size(190, 120);
      const p = mobile ? [125, 208, 245, 287].map(y => [96,y]) : [112, 377, 570, 800].map(x => [x,y]);
      track(mobile ? [[96,84], [96,315]] : [[87,y], [834,y]], 'data');
      p.forEach(([x,y], i) => {
        const marker = styled('circle', 'packet ' + (i === 0 ? 'data' : 'good'), {cx:x, cy:y, r:7});
        effects.push(time => { marker.style.opacity = .22 + .78 * clamp((time - i*.65)*4); });
      });
      const first = words[3], next = words[4];
      if (mobile) {
        label(119,p[0][1],words[0],'detail','start');
        label(119,p[1][1],words[1],'detail','start');
        label(119,p[3][1],words[2],'detail','start');
        line([[86,p[0][1]],[68,p[0][1]],[68,p[1][1]],[86,p[1][1]]], 'wire wait');
        line([[86,p[2][1]],[68,p[2][1]],[68,p[3][1]],[86,p[3][1]]], 'wire good');
        label(180,363,first,'detail');
        label(180,403,next,'detail');
        line([[32,363],[64,363]],'wire wait');
        line([[32,403],[64,403]],'wire good');
      } else {
        label(p[0][0],y-36,words[0],'detail');
        label(p[1][0],y-36,words[1],'detail');
        label((p[2][0]+p[3][0])/2,y-36,words[2],'detail');
        const bracket = (a,b,word,tone) => {
          line([[a,y+20],[a,y+43],[b,y+43],[b,y+20]], 'wire '+tone);
          label((a+b)/2,y+73,word,'detail');
        };
        bracket(p[0][0],p[1][0],first,'wait');
        bracket(p[2][0],p[3][0],next,'good');
      }
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
      const special = {comparison, latency}[layout];
      if (special) special(heading, ...data);
      else diagram(heading, layout, ...data);
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
