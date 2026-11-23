/* Topic animation. The page controls the step; the module owns layout, language and playback. */
(function () {
  'use strict';

  const id = 'infer';
  const prefix = 'an-' + id;
  const namespace = 'http://www.w3.org/2000/svg';
  const EN = {
    "应用请求": "App request",
    "文本与生成参数": "Text and settings",
    "推理 API": "Inference API",
    "验证并转成 token": "Validate and tokenize",
    "请求队列": "Request queue",
    "等待引擎接收": "Await engine capacity",
    "从文本到调度队列": "From text to the scheduling queue",
    "提示词": "Prompt",
    "输入 token": "Input tokens",
    "预填充": "Prefill",
    "并行处理输入": "Parallel input",
    "首个 token": "First token",
    "从分布中选出": "From distribution",
    "提示词 KV": "Prompt KV",
    "保留在显存": "Retained in memory",
    "一次预填充，两类输出": "Two outputs from one prefill",
    "已有 KV": "Existing KV",
    "读取上下文": "Read context",
    "解码迭代": "Decode step",
    "处理上一 token": "Process prior token",
    "新增 KV": "New KV",
    "追加当前位置": "Append position KV",
    "流式输出": "Token stream",
    "返回新 token": "Send next token",
    "每一轮生成后更新状态": "Update state after each step",
    "本轮": "This iteration",
    "下一轮": "Next iteration",
    "A · 完成": "A · Finishes",
    "B · 继续": "B · Continues",
    "C · 等待": "C · Queued",
    "C · 加入": "C · Admitted",
    "只在迭代边界换入请求": "Requests change at iteration boundaries",
    "前缀缓存": "Prefix cache",
    "已保存的 KV": "Reusable KV",
    "新请求": "New request",
    "前缀匹配后的新增输入": "Uncached suffix",
    "推理引擎": "Inference engine",
    "复用前缀并续算": "Reuse and extend",
    "请求状态": "Request state",
    "前缀引用及新增 KV": "Prefix ref and new KV",
    "已有前缀保留，新增输入继续计算": "Reuse the prefix and compute the suffix",
    "请求发出": "Request sent",
    "后续 token": "Later tokens",
    "请求到首个 token": "Request to first token",
    "相邻 token 间隔": "Token-to-token gap",
    "流式响应的时间轴": "Timeline of a streamed response",
    "示意，不代表实测数字": "Schematic, not measured"
  };
  const scenes = [
    ["从文本到调度队列", "chain",
      [
        ["应用请求", "文本与生成参数", "data", 0],
        ["推理 API", "验证并转成 token", "control", 0],
        ["请求队列", "等待引擎接收", "good", 0],
      ],
      [
        [0, 1, 0.36, "data", 0.7, 1, null],
        [1, 2, 1.45, "good", 0.74, 3, null],
      ]
    ],
    ["一次预填充，两类输出", "fork",
      [
        ["提示词", "输入 token", "data", 4],
        ["预填充", "并行处理输入", "control", 0],
        ["首个 token", "从分布中选出", "good", 0],
        ["提示词 KV", "保留在显存", "data", 4],
      ],
      [
        [0, 1, 0.34, "data", 0.63, 4, null],
        [1, 2, 1.82, "good", 0.7, 1, null],
        [1, 3, 1.82, "data", 0.7, 4, null],
      ]
    ],
    ["每一轮生成后更新状态", "square",
      [
        ["已有 KV", "读取上下文", "data", 3],
        ["解码迭代", "处理上一 token", "control", 0],
        ["新增 KV", "追加当前位置", "data", 1],
        ["流式输出", "返回新 token", "good", 0],
      ],
      [
        [0, 1, 0.42, "data", 0.7, 1, null],
        [1, 2, 1.43, "data", 0.7, 1, null],
        [2, 0, 2.72, "data", 0.67, 1, "y"],
        [1, 3, 2.15, "good", 0.66, 1, "x", 24],
      ]
    ],
    ["只在迭代边界换入请求", "batchGrid",
      ["本轮", "下一轮", "A · 完成", "B · 继续", "C · 等待", "C · 加入"]
    ],
    ["已有前缀保留，新增输入继续计算", "merge",
      [
        ["前缀缓存", "已保存的 KV", "good", 3],
        ["新请求", "前缀匹配后的新增输入", "data", 2],
        ["推理引擎", "复用前缀并续算", "control", 0],
        ["请求状态", "前缀引用及新增 KV", "good", 0],
      ],
      [
        [0, 2, 0.5, "good", 0.65, 3, null],
        [1, 2, 0.95, "data", 0.68, 2, null],
        [2, 3, 2.05, "good", 0.7, 1, null],
      ]
    ],
    ["流式响应的时间轴", "latency",
      ["请求发出", "首个 token", "后续 token", "请求到首个 token", "相邻 token 间隔"]
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

    function route(from, to, side, offset = 0) {
      const horizontal = side === 'x' || (side !== 'y' && (from.y === to.y || (!mobile && from.x !== to.x)));
      if (horizontal) {
        const a = from.x < to.x ? from.right : from.left;
        const b = from.x < to.x ? to.left : to.right;
        const mid = (a+b)/2;
        return from.y === to.y ? [[a, from.y], [b, to.y]] :
          [[a, from.y + offset], [mid, from.y + offset], [mid, to.y], [b, to.y]];
      }
      const a = from.y < to.y ? from.bottom : from.top;
      const b = from.y < to.y ? to.top : to.bottom;
      const mid = (a+b)/2;
      return from.x === to.x ? [[from.x, a], [to.x, b]] :
        [[from.x, a], [from.x, mid], [to.x, mid], [to.x, b]];
    }

    const positions = {
      chain: () => mobile ? [[180, 92], [180, 224], [180, 356]] : [[150, 183], [460, 183], [770, 183]],
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
      const paths = links.map(([a, b, , tone, , , side, offset]) => {
        const key = [a, b, tone, side].join('/');
        if (!tracks.has(key)) tracks.set(key, track(route(boxes[a], boxes[b], side, offset), tone));
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

    function batchGrid(heading, words) {
      label(width/2, 26, heading, 'heading');
      const x = size([260, 660], [88, 272]);
      const rows = size([133, 201, 269], [150, 242, 334]);
      const tileWidth = size(222, 145);
      label(x[0], rows[0]-56, words[0]);
      label(x[1], rows[0]-56, words[1]);
      const paths = rows.slice(1).map(y => track([[x[0]+tileWidth/2, y], [x[1]-tileWidth/2, y]], 'good'));
      function slot(column, row, value, tone) {
        const frame = bounds([x[column], rows[row]], tileWidth, 46);
        box(frame, tone);
        if (value) label(frame.x, frame.y, value, 'detail');
      }
      slot(0, 0, words[2], 'wait');
      slot(0, 1, words[3], 'good');
      slot(0, 2, words[4], 'idle');
      slot(1, 0, null, 'idle');
      slot(1, 1, words[3], 'good');
      slot(1, 2, words[5], 'good');
      packet(paths[0], .5, 1.5, 'good');
      packet(paths[1], 1.65, 2.65, 'good');
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
      const special = {batchGrid, latency}[layout];
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
