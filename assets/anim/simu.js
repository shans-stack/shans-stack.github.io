/* Topic animation. The page controls the step; the module owns layout, language and playback. */
(function () {
  'use strict';

  const id = 'simu';
  const prefix = 'an-' + id;
  const namespace = 'http://www.w3.org/2000/svg';
  const EN = {
    "虚拟机械臂": "Virtual robot arm",
    "发出夹取动作": "Apply a grasp action",
    "计算接触": "Compute contact",
    "更新工件姿态": "Update part pose",
    "动作改变下一时间步的状态": "Actions alter the next simulation state",
    "虚拟相机帧": "Virtual camera frame",
    "工件位置标签": "Part position label",
    "不同光照": "Different lighting",
    "合成训练样本": "Synthetic training sample",
    "传感器画面与标签来自同一状态": "Images and labels share a scene",
    "场景 A": "Scene A",
    "场景 B": "Scene B",
    "覆盖不同条件": "Cover different conditions",
    "改变场景条件，保留同一任务": "Same task, varied conditions",
    "图像与标签": "Images and labels",
    "用于识别与定位": "Detect and locate",
    "状态与动作": "States and actions",
    "按时间组成轨迹": "Build trajectories",
    "训练数据": "Training data",
    "按场景组织样本": "Group by scene",
    "模型训练": "Model training",
    "从标注或轨迹学习": "Learn from labels",
    "仿真产出可支持不同训练任务": "Simulation outputs for training",
    "仿真结果": "Simulation result",
    "预测抓取行为": "Predict grasp behavior",
    "现场观测": "Field observations",
    "记录实际抓取": "Record actual grasps",
    "差异分析": "Gap analysis",
    "识别未覆盖条件": "Find missing cases",
    "更新虚拟场景": "Update the scene",
    "校准后重跑": "Calibrate and rerun",
    "用真实测试结果校准虚拟场景": "Real tests calibrate the scene",
    "示意，不代表实测数字": "Schematic, not measured"
  };
  const scenes = [
    ["动作改变下一时间步的状态", "grasp",
      ["虚拟机械臂", "发出夹取动作", "计算接触", "更新工件姿态"]
    ],
    ["传感器画面与标签来自同一状态", "samples",
      ["虚拟相机帧", "工件位置标签", "不同光照", "合成训练样本"], false
    ],
    ["改变场景条件，保留同一任务", "samples",
      ["场景 A", "场景 B", "不同光照", "覆盖不同条件"], true
    ],
    ["仿真产出可支持不同训练任务", "merge",
      [
        ["图像与标签", "用于识别与定位", "data", 3],
        ["状态与动作", "按时间组成轨迹", "data", 3],
        ["训练数据", "按场景组织样本", "control", 0],
        ["模型训练", "从标注或轨迹学习", "good", 0],
      ],
      [
        [0, 2, 0.36, "data", 0.69, 3, null],
        [1, 2, 0.88, "data", 0.69, 3, null],
        [2, 3, 2.32, "good", 0.7, 1, null],
      ]
    ],
    ["用真实测试结果校准虚拟场景", "square",
      [
        ["仿真结果", "预测抓取行为", "data", 0],
        ["现场观测", "记录实际抓取", "control", 0],
        ["差异分析", "识别未覆盖条件", "wait", 0],
        ["更新虚拟场景", "校准后重跑", "good", 0],
      ],
      [
        [0, 2, 0.4, "data", 0.7, 1, null],
        [1, 2, 0.43, "control", 0.7, 1, null],
        [2, 3, 1.64, "wait", 0.7, 1, null],
        [3, 0, 2.68, "good", 0.7, 1, null],
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

    function grasp(heading, words) {
      label(width/2, 26, heading, 'heading');
      const plate = bounds(size([300,182],[180,143]),size(434,296),size(246,181));
      box(plate,'data');
      label(plate.x,plate.top+23,words[0],'label');
      const {x,y} = plate;
      const floor = y + size(73,54);
      line([[plate.left+35,floor],[plate.right-35,floor]],'wire data');
      line([[x-79,floor],[x-79,y-26],[x+14,y-26]],'wire control');
      const guideX = x+30;
      line([[guideX,y-23],[guideX,floor-10]],'wire idle');
      const gripper = element('g', {});
      line([[guideX,y-20],[guideX,y+12],[guideX-16,y+12],[guideX-16,y+27]],'wire data',gripper);
      line([[guideX,y+12],[guideX+16,y+12],[guideX+16,y+27]],'wire data',gripper);
      const part = styled('rect','packet good',{x:guideX-11,y:floor-19,width:22,height:18,rx:2});
      effects.push(time => {
        const depth = size(32,15);
        const move = depth * (clamp((time-.45)/.8) - clamp((time-1.55)/.8));
        const lift = -depth * clamp((time-1.55)/.8);
        gripper.setAttribute('transform','translate(0 '+move+')');
        part.setAttribute('transform','translate(0 '+lift+')');
      });

      const cx = size(688,180);
      const rows = size([101,181,261],[274,334,394]);
      const boxes = rows.map(y => bounds([cx,y],size(252,238),42));
      const stages = words.slice(1);
      const tones = ['control','wait','good'];
      const paths = boxes.slice(1).map((next,i) => track(route(boxes[i],next),'data'));
      paths.forEach((path,i) => packet(path, .75+i*.82,1.35+i*.82,tones[i]));
      boxes.forEach((b,i) => {
        box(b,tones[i]);
        label(b.x,b.y,stages[i],'detail');
      });
    }

    function samples(heading, words, randomized) {
      label(width/2, 26, heading, 'heading');
      const centers = size([[228,142],[692,142]],[ [180,107],[180,229] ]);
      const rects = centers.map(p => bounds(p,size(292,224),size(136,98)));
      const result = bounds(size([460,295],[180,375]), size(325,256), 55);
      const paths = rects.map((rect,i) => {
        const port = size(result.x+(i ? 72 : -72),result.x+(i ? 40 : -40));
        const x = mobile && !i ? rect.right+22 : rect.x;
        const exit = mobile && !i ? [[rect.right,rect.y],[x,rect.y]] : [[x,rect.bottom]];
        const bend = size(result.top-31, result.top - (i ? 16 : 33));
        return track([...exit,[x,bend],[port,bend],[port,result.top]],i?'good':'data');
      });
      rects.forEach((rect,i) => {
        const tone = i ? 'good' : 'data';
        box(rect, i && randomized ? 'control' : tone);
        label(rect.x,rect.top+20,words[i],'label');
        const cx = rect.x + (randomized && i ? 30 : 0);
        const floor = rect.bottom-13;
        line([[rect.left+27,floor],[rect.right-27,floor]], 'wire '+tone);
        styled('rect','packet '+tone,{x:cx-14,y:floor-23,width:28,height:22,rx:2});
        if (!randomized && i) {
          const outline = bounds([cx,floor-15],48,36);
          const shape = box(outline,'good');
          shape.style.fill = 'none';
          shape.style.strokeDasharray = '4 3';
        }
        if (randomized && i) {
          line([[rect.x-55,floor-33],[rect.x-34,floor-19]], 'wire control');
          line([[rect.x-62,floor-23],[rect.x-41,floor-9]], 'wire control');
        }
      });
      box(result,'good');
      label(result.x,result.y,words[3]);
      paths.forEach((path,i) => packet(path, .55+i*.46,1.55+i*.46,i?'good':'data'));
      if (randomized) label(width/2,size(337,425),words[2],'detail');
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
      const special = {grasp, samples}[layout];
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
