/* Topic animation. The page controls the step; the module owns layout, language and playback. */
(function () {
  'use strict';

  const id = 'rag';
  const prefix = 'an-' + id;
  const namespace = 'http://www.w3.org/2000/svg';
  const EN = {
    "原始文档": "Source document",
    "保留完整资料": "Full text stays here",
    "解析与切片": "Parse and split",
    "生成段落及出处": "Passages and sources",
    "检索索引": "Search index",
    "片段 ID 与表示": "IDs and features",
    "索引记录保留原文位置": "Index records preserve source locations",
    "问题": "Question",
    "形成检索查询": "Build search query",
    "检索器": "Retriever",
    "从索引取候选": "Search the index",
    "候选集": "Candidate set",
    "返回匹配片段": "Return matching text",
    "索引返回一组候选": "The index returns a candidate set",
    "候选片段": "Candidates",
    "初次检索结果": "Initial search matches",
    "重排与筛选": "Rerank and select",
    "按相关性再评分": "Score relevance again",
    "入选片段": "Selected passages",
    "加入上下文": "Use as context",
    "未入选片段": "Omitted passages",
    "保留在知识库": "Remain in corpus",
    "重排器筛选本次上下文": "Reranking selects the context",
    "用户问题": "Question",
    "待回答事项": "Task to answer",
    "所选片段": "Selected passages",
    "正文及来源 ID": "Text and source IDs",
    "生成上下文": "Model context",
    "组装问题与证据": "Join inputs",
    "生成模型": "Generation model",
    "依据上下文作答": "Answer with context",
    "问题和片段进入同一份输入": "Question and passages share one input",
    "草稿与片段": "Draft and sources",
    "结论与来源 ID": "Claims and source IDs",
    "证据核对": "Evidence check",
    "检查来源能否支持": "Check source support",
    "有证据的结论": "Supported claim",
    "附上相关出处": "Cite the source",
    "待补资料": "Evidence gap",
    "标出缺失信息": "Flag the gap",
    "逐项检查结论与来源的对应关系": "Check each claim against its source",
    "示意，不代表实测数字": "Schematic, not measured"
  };
  const scenes = [
    ["索引记录保留原文位置", "chain",
      [
        ["原始文档", "保留完整资料", "data", 0],
        ["解析与切片", "生成段落及出处", "control", 0],
        ["检索索引", "片段 ID 与表示", "good", 3],
      ],
      [
        [0, 1, 0.45, "data", 0.7, 1, null],
        [1, 2, 1.53, "good", 0.71, 3, null],
      ]
    ],
    ["索引返回一组候选", "chain",
      [
        ["问题", "形成检索查询", "data", 0],
        ["检索器", "从索引取候选", "control", 0],
        ["候选集", "返回匹配片段", "good", 4],
      ],
      [
        [0, 1, 0.43, "data", 0.7, 1, null],
        [1, 2, 1.53, "good", 0.75, 4, null],
      ]
    ],
    ["重排器筛选本次上下文", "fork",
      [
        ["候选片段", "初次检索结果", "data", 4],
        ["重排与筛选", "按相关性再评分", "control", 0],
        ["入选片段", "加入上下文", "good", 2],
        ["未入选片段", "保留在知识库", "idle", 0],
      ],
      [
        [0, 1, 0.36, "data", 0.66, 4, null],
        [1, 2, 1.95, "good", 0.67, 2, null],
        [1, 3, 2.78, "idle", 0.7, 1, null],
      ]
    ],
    ["问题和片段进入同一份输入", "merge",
      [
        ["用户问题", "待回答事项", "data", 0],
        ["所选片段", "正文及来源 ID", "good", 2],
        ["生成上下文", "组装问题与证据", "control", 0],
        ["生成模型", "依据上下文作答", "good", 0],
      ],
      [
        [0, 2, 0.38, "data", 0.7, 1, null],
        [1, 2, 0.65, "good", 0.68, 2, null],
        [2, 3, 1.92, "good", 0.7, 1, null],
      ]
    ],
    ["逐项检查结论与来源的对应关系", "fork",
      [
        ["草稿与片段", "结论与来源 ID", "data", 0],
        ["证据核对", "检查来源能否支持", "control", 0],
        ["有证据的结论", "附上相关出处", "good", 0],
        ["待补资料", "标出缺失信息", "wait", 0],
      ],
      [
        [0, 1, 0.42, "data", 0.7, 1, null],
        [1, 2, 1.54, "good", 0.7, 1, null],
        [1, 3, 2.62, "wait", 0.7, 1, null],
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
      fork: () => mobile ? [[180, 92], [180, 224], [94, 356], [266, 356]] :
        [[150, 183], [460, 183], [770, 112], [770, 254]],
      merge: () => mobile ? [[94, 92], [266, 92], [180, 224], [180, 356]] :
        [[150, 112], [150, 254], [460, 183], [770, 183]],
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
