/* Topic animation. The page controls the step; the module owns layout, language and playback. */
(function () {
  'use strict';

  const id = 'vec';
  const prefix = 'an-' + id;
  const namespace = 'http://www.w3.org/2000/svg';
  const EN = {
    "文档片段": "Source passage",
    "离线编码": "Encode in advance",
    "查询问题": "Query text",
    "请求时编码": "Encoded at query time",
    "嵌入空间": "Embedding space",
    "同一表示空间": "Shared representation",
    "向量对比": "Compare vectors",
    "可以计算相似度": "Compute similarity",
    "问题与片段使用可比较的嵌入": "Use comparable embeddings",
    "查询向量": "Query vector",
    "方向接近": "Closer direction",
    "方向较远": "Farther direction",
    "余弦相似度比较方向": "Cosine similarity compares directions",
    "查询": "Query",
    "候选 A": "Candidate A",
    "候选 B": "Candidate B",
    "候选 C": "Candidate C",
    "最高分": "Top score",
    "精确扫描为每个候选计算分数": "An exact scan scores every candidate",
    "稀疏层 · 粗定位": "Sparse layer · Coarse search",
    "底层 · 局部细查": "Base layer · Local search",
    "入口": "Entry",
    "候选区域": "Candidate region",
    "分层图访问局部候选": "A layered graph visits local candidates",
    "近邻结果": "Nearest matches",
    "片段 ID 与相似度": "IDs and scores",
    "内容读取": "Content lookup",
    "按片段 ID 查找": "Look up by passage ID",
    "原文及出处": "Text and sources",
    "交给后续应用": "Pass to the application",
    "近邻结果通过 ID 关联原文": "Result IDs link to source text",
    "示意，不代表实测数字": "Schematic, not measured"
  };
  const scenes = [
    ["问题与片段使用可比较的嵌入", "merge",
      [
        ["文档片段", "离线编码", "data", 0],
        ["查询问题", "请求时编码", "data", 0],
        ["嵌入空间", "同一表示空间", "control", 0],
        ["向量对比", "可以计算相似度", "good", 0],
      ],
      [
        [0, 2, 0.4, "data", 0.7, 1, null],
        [1, 2, 0.87, "data", 0.7, 1, null],
        [2, 3, 2.06, "good", 0.7, 1, null],
      ]
    ],
    ["余弦相似度比较方向", "angles",
      ["查询向量", "方向接近", "方向较远"]
    ],
    ["精确扫描为每个候选计算分数", "exactScan",
      ["查询", "候选 A", "候选 B", "候选 C", "最高分"]
    ],
    ["分层图访问局部候选", "graph",
      ["稀疏层 · 粗定位", "底层 · 局部细查", "入口", "候选区域"]
    ],
    ["近邻结果通过 ID 关联原文", "chain",
      [
        ["近邻结果", "片段 ID 与相似度", "good", 0],
        ["内容读取", "按片段 ID 查找", "control", 0],
        ["原文及出处", "交给后续应用", "good", 0],
      ],
      [
        [0, 1, 0.44, "good", 0.72, 3, null],
        [1, 2, 1.74, "good", 0.68, 2, null],
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

    function angles(heading, words) {
      label(width/2, 26, heading, 'heading');
      const origin = size([280, 284], [45, 342]);
      const endpoints = size([[676,168], [665,104], [389,97]], [[260,219], [222,155], [87,115]]);
      const tones = ['data','good','wait'];
      endpoints.forEach((point,i) => {
        const path = track([origin,point],tones[i]);
        packet(path,.46+i*.38,1.35+i*.38,tones[i]);
        const [x,y] = point;
        const [, preferred, far] = words;
        const labels = [words[0], preferred, far];
        label(x + size(i === 2 ? 0 : 11,i === 2 ? 0 : 22),y-size(19,24),labels[i],'detail',
              i === 2 ? 'middle' : 'end');
      });
      styled('circle','packet data',{cx:origin[0],cy:origin[1],r:5});
      const angle = ([x,y]) => Math.atan2(y-origin[1],x-origin[0]);
      const a = angle(endpoints[0]);
      for (const i of [1,2]) {
        const radius = i === 1 ? size(130,101) : size(89,68);
        const at = theta => [origin[0]+radius*Math.cos(theta),origin[1]+radius*Math.sin(theta)].join(' ');
        styled('path','wire '+tones[i],{d:'M'+at(a)+' A'+radius+' '+radius+' 0 0 0 '+at(angle(endpoints[i]))});
      }
    }

    function exactScan(heading, words) {
      label(width/2, 26, heading, 'heading');
      const centers = mobile ? [[87,235],[269,111],[269,235],[269,359]] :
        [[235,183],[665,83],[665,183],[665,283]];
      const rects = centers.map(point => bounds(point, size(194, 143), 62));
      const paths = rects.slice(1).map((target,i) => track(route(rects[0],target,'x'),i===1?'good':'data'));
      rects.forEach((r,i) => {
        const square = box(r,i===2?'good':'data');
        if (i !== 0) effects.push(time => { square.style.opacity = .35 + .65*clamp((time-.94-(i-1)*.78)*5); });
        label(r.x,r.y,words[i],'label');
      });
      paths.forEach((path,i) => packet(path,.28+i*.78,1+i*.78,i===1?'good':'data'));
      const result = label(rects[2].x,rects[2].bottom+24,words[4],'detail');
      effects.push(time => {result.style.opacity = clamp((time-2.74)*4);});
    }

    function graph(heading, words) {
      label(width/2, 26, heading, 'heading');
      const low = size(24,12);
      const left = size(53,19), right = width-left;
      const y = size([115, 238], [141, 312]);
      const point = (fraction, row, offset) => [left+(right-left)*fraction, y[row]+offset];
      const p = [
        point(.2,0,-3), point(.47,0,9), point(.73,0,-6),
        point(.08,1,20), point(.24,1,-15), point(.42,1,34), point(.58,1,2),
        point(.73,1,-18), point(.92,1,21), point(.75,1,43)
      ];
      label(left,y[0]-49,words[0],'detail','start');
      label(left,y[1]-52,words[1],'detail','start');
      const edges = [[0,1],[1,2],[2,7],[3,4],[3,5],[4,5],[4,6],[5,6],[5,9],[6,7],[6,9],[7,8],[7,9],[8,9]];
      const traversal = new Map([['0,1',.32],['1,2',.97],['2,7',1.62],['7,9',2.28]]);
      edges.forEach(([a,b]) => {
        const key = [a,b].join(',');
        const visited = traversal.has(key);
        const path = track([p[a],p[b]],visited?'good':'idle',false);
        if (visited) {
          const start = traversal.get(key);
          packet(path,start,start+.58,'good');
        }
      });
      const visited = new Map([[0,0],[1,.9],[2,1.55],[7,2.2],[9,2.86]]);
      p.forEach(([x,y],i) => {
        const shape = styled('circle','node '+(visited.has(i)?'good':'idle'),{cx:x,cy:y,r:size(9,7)});
        if (visited.has(i)) effects.push(time => { shape.style.strokeWidth = 1.25 + 2*clamp((time-visited.get(i))*8); });
      });
      label(p[0][0],p[0][1]+low+10,words[2],'detail');
      label(p[9][0],p[9][1]+low+13,words[3],'detail');
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
      const special = {angles, exactScan, graph}[layout];
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
