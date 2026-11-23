/* f-dev · bilingual SVG scenes for the shared topic player. */
(() => {
  const id = 'f-dev';
  const scenes = [
    {name: ["交互式验证","Interactive Validation"], layout: 'merge',
      nodes: [
        {"title":["训练代码","Training Code"],"detail":["脚本与依赖","Script + libraries"],"tone":"signal","parcel":true},
        {"title":["数据样本","Data Sample"],"detail":["小规模验证","Sample input"],"tone":"signal","parcel":true},
        {"title":["交互工作区","Workspace"],"detail":["运行实验","Run experiment"],"result":["流程已验证","Workflow verified"]}
      ],
      links: [
        {"from":0,"to":2,"times":[0.35]},
        {"from":1,"to":2,"times":[1.65]}
      ]},
    {name: ["提交训练作业","Submitting a Training Job"], layout: 'chain',
      nodes: [
        {"title":["训练作业","Training Job"],"detail":["镜像、数据、GPU","Image, data, GPUs"],"tone":"signal","parcel":true},
        {"title":["调度器","Scheduler"],"detail":["检查资源和规则","Check capacity"],"tone":"policy"},
        {"title":["GPU 工作节点","GPU Workers"],"detail":["等待分配","Await allocation"],"result":["运行训练","Run training"]}
      ],
      links: [
        {"from":0,"to":1,"times":[0.35]},
        {"from":1,"to":2,"times":[1.55]}
      ]},
    {name: ["分布式训练","Distributed Training"], layout: 'chain',
      nodes: [
        {"title":["训练进程 A","Worker A"],"detail":["模型副本 · 分片 A","Replica · shard A"],"tone":"signal","parcel":true},
        {"title":["梯度同步","Gradient Sync"],"detail":["进程间集合通信","Worker collective"],"tone":"policy"},
        {"title":["训练进程 B","Worker B"],"detail":["模型副本 · 分片 B","Replica · shard B"],"tone":"signal","parcel":true}
      ],
      links: [
        {"from":0,"to":1,"times":[0.4,3.55],"offset":-16},
        {"from":1,"to":2,"times":[0.4,3.55],"offset":-16,"reverse":true},
        {"from":0,"to":1,"times":[1.55,4.7],"offset":16,"reverse":true,"tone":"ready"},
        {"from":1,"to":2,"times":[1.55,4.7],"offset":16,"tone":"ready"}
      ]},
    {name: ["保存与恢复检查点","Saving and Restoring Checkpoints"], layout: 'chain',
      nodes: [
        {"title":["训练作业","Training Job"],"detail":["权重与进度","Weights + progress"]},
        {"title":["持久存储","Persistent Storage"],"detail":["写入检查点","Write checkpoint"],"tone":"signal","parcel":true,"result":["保留检查点","Keep checkpoint"]},
        {"title":["恢复作业","Restarted Job"],"detail":["读取检查点","Read checkpoint"],"result":["继续训练","Resume training"]}
      ],
      links: [
        {"from":0,"to":1,"times":[0.4]},
        {"from":1,"to":2,"times":[2.1],"tone":"ready"}
      ]},
    {name: ["评估与版本登记","Evaluation and Model Registration"], layout: 'chain',
      nodes: [
        {"title":["模型产物","Model Artifact"],"detail":["训练输出","Training output"],"tone":"signal","parcel":true},
        {"title":["评估","Evaluation"],"detail":["验证任务要求","Check requirements"],"result":["通过评估","Checks passed"]},
        {"title":["模型注册表","Model Registry"],"detail":["登记模型版本","Register version"],"result":["可供部署选用","Ready for selection"]}
      ],
      links: [
        {"from":0,"to":1,"times":[0.45]},
        {"from":1,"to":2,"times":[1.85],"tone":"ready"}
      ]}
  ];

  const desktop = {
    chain: [[160, 167], [480, 167], [800, 167]],
    merge: [[265, 96], [265, 238], [704, 167]],
    fork: [[256, 167], [695, 96], [695, 238]],
    hub: [[142, 167], [450, 167], [792, 96], [792, 238]]
  };
  const compact = {
    chain: [[240, 59], [240, 181], [240, 303]],
    merge: [[124, 76, 208], [356, 76, 208], [240, 268]],
    fork: [[240, 76], [124, 268, 208], [356, 268, 208]],
    hub: [[240, 53], [240, 168], [124, 304, 208], [356, 304, 208]]
  };
  const clamp = n => Math.max(0, Math.min(1, n));
  const duration = 0.82;
  const cycle = 7;

  function mount(host, opts = {}) {
    const small = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', id + '-diagram');
    svg.setAttribute('role', 'img');
    host.replaceChildren(svg);

    let step = 0, frame = 0, elapsed = 0, previous = 0, ratio;
    let paused = !!opts.paused, tracks = [], cards = [];
    const tr = pair => pair[window.SS_LANG === 'en' ? 1 : 0];

    function add(tag, attrs, parent = svg) {
      const element = document.createElementNS(svg.namespaceURI, tag);
      for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
      parent.append(element);
      return element;
    }

    function label(x, y, pair, kind, parent) {
      const text = add('text', {x, y, class: id + '-' + kind}, parent);
      text.textContent = tr(pair);
      return text;
    }

    function draw() {
      const {name, layout, nodes, links} = scenes[step];
      const mobile = small.matches;
      const width = mobile ? 480 : 960, height = mobile ? 400 : 352;
      const half = mobile ? 39 : 45;
      const positions = (mobile ? compact : desktop)[layout];
      const boxes = positions.map(([x, y, w = mobile ? 340 : 248]) => ({x, y, w}));
      ratio = width / height;
      svg.replaceChildren();
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.setAttribute('aria-label', tr(name));
      svg.dataset.step = step + 1;

      tracks = links.map(({from, to, times = [], tone = 'signal', offset = 0, reverse = false, inactive = false}) => {
        const a = boxes[from], b = boxes[to];
        const direction = Math.sign(mobile ? b.y - a.y : b.x - a.x);
        const start = mobile ? [a.x + offset, a.y + half * direction] : [a.x + a.w / 2 * direction, a.y + offset];
        const end = mobile ? [b.x + offset, b.y - half * direction] : [b.x - b.w / 2 * direction, b.y + offset];
        const mid = mobile ? (start[1] + end[1]) / 2 : (start[0] + end[0]) / 2;
        const points = mobile ? [start, [start[0], mid], [end[0], mid], end] : [start, [mid, start[1]], [mid, end[1]], end];
        const path = add('path', {d: 'M' + points.map(p => p.join(' ')).join(' L'),
          class: id + '-line', 'data-tone': tone, 'data-inactive': inactive});
        const length = path.getTotalLength();
        if (!inactive) {
          const [x, y] = reverse ? start : end;
          const tail = -direction * (reverse ? -1 : 1) * 10;
          const arrow = mobile ? [[x - 5, y + tail], [x, y], [x + 5, y + tail]]
            : [[x + tail, y - 5], [x, y], [x + tail, y + 5]];
          add('polyline', {points: arrow.map(p => p.join(',')).join(' '), class: id + '-line', 'data-tone': tone});
        }
        return {to, from, times, tone, reverse, path, length};
      });

      cards = nodes.map(({title, detail, tone = 'neutral', result, parcel}, i) => {
        const {x, y, w} = boxes[i];
        const group = add('g', {class: id + '-node', 'data-tone': tone});
        add('rect', {x: x - w / 2, y: y - half, width: w, height: half * 2, rx: 6, class: id + '-card'}, group);
        label(x, y - 17, title, 'title', group);
        const status = label(x, y + 17, detail, 'detail', group);
        if (parcel) add('rect', {x: x + w / 2 - 23, y: y - half + 4,
          width: 12, height: 6, rx: 2, class: id + '-parcel'}, group);
        const incoming = tracks.filter(track => track.times.length && (track.reverse ? track.from : track.to) === i);
        const readyAt = Math.max(...incoming.map(track => track.times[0] + duration));
        return {group, status, detail, result, tone, readyAt};
      });

      tracks.forEach(track => {
        track.packets = track.times.map(() => add('rect', {x: -6, y: -5, width: 12, height: 10,
          rx: 2, class: id + '-packet', 'data-tone': track.tone, opacity: 0}));
      });
      label(width / 2, height - 20, ['示意，不代表实测数字', 'Schematic, not measured'], 'note');
      opts.onLayout?.(ratio, mobile);
    }

    function paint(time) {
      tracks.forEach(({times, reverse, path, length, packets}) => {
        times.forEach((start, i) => {
          const progress = (time - start) / duration;
          const packet = packets[i];
          const p = clamp(progress);
          const point = path.getPointAtLength(length * (reverse ? 1 - p : p));
          packet.setAttribute('transform', `translate(${point.x} ${point.y})`);
          packet.setAttribute('opacity', Math.min(clamp(progress * 9), clamp((1.14 - progress) * 8)));
        });
      });
      cards.forEach(({group, status, detail, result, tone, readyAt}) => {
        if (!result) return;
        const active = time >= readyAt;
        const text = tr(active ? result : detail);
        if (status.textContent !== text) {
          status.textContent = text;
          group.dataset.tone = active ? 'ready' : tone;
        }
      });
    }

    function tick(now) {
      elapsed += Math.max(0, now - previous) / 1000;
      previous = now;
      paint(elapsed % cycle);
      frame = requestAnimationFrame(tick);
    }

    function play() {
      cancelAnimationFrame(frame);
      if (paused || reduced.matches) return;
      previous = performance.now();
      frame = requestAnimationFrame(tick);
    }

    function redraw() {
      draw();
      paint(reduced.matches ? cycle : elapsed % cycle);
      play();
    }

    const events = [[small, 'change'], [reduced, 'change'], [document, 'ss-lang']];
    const controls = {
      show(i) {
        step = Math.max(0, Math.min(scenes.length - 1, i));
        elapsed = 0;
        redraw();
      },
      pause() { paused = true; cancelAnimationFrame(frame); },
      resume() { if (paused) { paused = false; play(); } },
      destroy() {
        controls.pause();
        events.forEach(([target, event]) => target.removeEventListener(event, redraw));
        svg.remove();
        delete host.__anim;
      },
      ratio: () => ratio,
      step: () => step
    };
    events.forEach(([target, event]) => target.addEventListener(event, redraw));
    redraw();
    host.__anim = controls;
    return controls;
  }

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = {steps: 5, mount};
})();
