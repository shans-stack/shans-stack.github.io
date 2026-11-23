(() => {
  const id = 'd-dne';
  const scenes = [
  {
    "shape":"pair","note":["根目录与子目录共用一个 MDT","The Root and Subdirectory Share One MDT"],"title":["单个 MDT 承载元数据","Metadata on a Single MDT"],
    "nodes": [
      {"title":["EXAScaler 客户端","EXAScaler Client"],"detail":["查找 · 列目录","Lookup · List"],"tone":"neutral"},
      {"title":"MDS / MDT0","detail":["/ 与 /runs","/ and /runs"],"tone":"meta"}
    ],
    "edges": [
      {"from":0,"to":1,"tone":"meta"}
    ],
    "moves": [
      {"edge":0,"start":0.35,"end":1.9,"mark":"","reverse":false,"stop":1}
    ]
  },
  {
    "shape":"fan","note":["DNE1 将整个子目录放到另一个 MDT","DNE1 Places a Subdirectory on a Remote MDT"],"title":["将子目录放到远程 MDT","Placing a Subdirectory on a Remote MDT"],
    "nodes": [
      {"title":["客户端","Client"],"detail":["统一目录树","One Directory Tree"],"tone":"neutral"},
      {"title":"MDT0","detail":["根目录 /","Root /"],"tone":"meta"},
      {"title":"MDT1","detail":["远程目录 /runs","Remote /runs"],"tone":"meta"}
    ],
    "edges": [
      {"from":0,"to":1,"tone":"meta"},
      {"from":0,"to":2,"tone":"meta"}
    ],
    "moves": [
      {"edge":0,"start":0.3,"end":1.65,"mark":"","reverse":false,"stop":1},
      {"edge":1,"start":1,"end":2.35,"mark":"","reverse":false,"stop":1}
    ]
  },
  {
    "shape":"fan","note":["DNE2 分布同一目录中的名称条目","DNE2 Distributes Entries Within One Directory"],"title":["把同一目录拆成固定条带","Splitting One Directory into Fixed Stripes"],
    "nodes": [
      {"title":"/runs","detail":["按名称选择分片","Name Selects Shard"],"tone":"neutral"},
      {"title":"MDT0","detail":["分片：a、c","Shard: a, c"],"tone":"meta"},
      {"title":"MDT1","detail":["分片：b、d","Shard: b, d"],"tone":"meta"}
    ],
    "edges": [
      {"from":0,"to":1,"tone":"meta"},
      {"from":0,"to":2,"tone":"meta"}
    ],
    "moves": [
      {"edge":0,"start":0.3,"end":1.65,"mark":"a","reverse":false,"stop":1},
      {"edge":1,"start":0.8,"end":2.15,"mark":"b","reverse":false,"stop":1}
    ]
  },
  {
    "shape":"pair","change":2.8,"activate":1,"note":["目录达到配置阈值","The Directory Reaches Its Configured Threshold"],"afterNote":["自动分片后，部分名称分布到新分片","Auto-Split Moves Some Names to the New Shard"],"title":["目录增长触发自动分片","Directory Growth Triggers Auto-Splitting"],
    "nodes": [
      {"title":"MDT0","detail":["/runs：a、b、c","/runs: a, b, c"],"tone":"meta","after":["/runs：a、c","/runs: a, c"]},
      {"title":"MDT1","detail":["新增分片","New Shard"],"tone":"idle","after":["/runs：b","/runs: b"]}
    ],
    "edges": [
      {"from":0,"to":1,"tone":"meta"}
    ],
    "moves": [
      {"edge":0,"start":1.35,"end":2.8,"mark":"b","reverse":false,"stop":1}
    ]
  },
  {
    "shape":"fan","note":["名称查找与文件数据读取使用不同目标卷","Name Lookup and File Reads Use Different Targets"],"title":["目录布局与文件数据布局各司其职","Directory Layout and File Data Layout"],
    "nodes": [
      {"title":["客户端","Client"],"detail":["/runs/b","/runs/b"],"tone":"neutral"},
      {"title":"MDT","detail":["目录项与布局","Name and Layout"],"tone":"meta"},
      {"title":"OSS / OST","detail":["文件内容","File Contents"],"tone":"data"}
    ],
    "edges": [
      {"from":0,"to":1,"tone":"meta"},
      {"from":0,"to":2,"tone":"data"}
    ],
    "moves": [
      {"edge":0,"start":0.25,"end":1.45,"mark":"","reverse":false,"stop":1},
      {"edge":0,"start":1.5,"end":2.35,"mark":"","reverse":true,"stop":1},
      {"edge":1,"start":2.5,"end":3.65,"mark":"","reverse":true,"stop":1}
    ]
  }
  ];
  const ns = 'http://www.w3.org/2000/svg';
  const cycle = 5.3;

  function mount(host, {onLayout, paused = false} = {}) {
    const narrow = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('role', 'img');
    host.classList.add(id);
    host.replaceChildren(svg);

    let step = 0, width, height, elapsed, last, frame;
    const T = label => Array.isArray(label) ? label[window.SS_LANG === 'en' ? 1 : 0] : label;
    function el(tag, attrs, parent = svg) {
      const item = document.createElementNS(ns, tag);
      for (const [key, value] of Object.entries(attrs)) item.setAttribute(key, value);
      parent.appendChild(item);
      return item;
    }
    function label(x, y, copy, size, role, parent) {
      const item = el('text', {x, y, 'font-size':size, class:`${id}-${role}`}, parent);
      item.textContent = T(copy);
      return item;
    }
    function route(a, b, mobile, lane) {
      const [x, y, w, h] = a, [X, Y, W, H] = b;
      if (lane) {
        if (mobile) {
          const port = lane * 56, rail = 180 + lane * 128;
          const start = y + h/2, end = Y - H/2;
          return `M ${x+port} ${start} V ${start+14} H ${rail} V ${end-14} H ${X+port} V ${end}`;
        }
        const port = lane * 18, rail = y + lane * 56;
        const start = x + w/2, end = X - W/2;
        return `M ${start} ${y+port} H ${start+22} V ${rail} H ${end-22} V ${Y+port} H ${end}`;
      }
      if (mobile) {
        const start = y + h/2, end = Y - H/2;
        const port = x + Math.sign(X-x)*46, bend = (start+end)/2;
        return `M ${port} ${start} V ${bend} H ${X} V ${end}`;
      }
      const start = x + w/2, end = X - W/2;
      const port = y + Math.sign(Y-y)*15, bend = (start+end)/2;
      return `M ${start} ${port} H ${bend} V ${Y} H ${end}`;
    }

    let paint;
    function draw() {
      const mobile = narrow.matches;
      [width, height] = mobile ? [360,304] : [880,250];
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.setAttribute('aria-label', T(scenes[step].title));
      svg.replaceChildren();

      const {shape, nodes, edges, moves, note, afterNote, change, activate, failedEdge} = scenes[step];
      const boxes = mobile ? {
        chain:[[180,40,220,56],[180,132,220,56],[180,224,220,56]],
        fan:[[180,58,220,58],[91,200,152,58],[269,200,152,58]],
        hub:[[180,32,220,52],[180,118,220,52],[91,220,152,52],[269,220,152,52]],
        pair:[[180,56,220,58],[180,204,220,58]],
        rails:[[180,47,220,56],[180,218,220,56]]
      }[shape] : {
        chain:[[147,109,236,70],[440,109,236,70],[733,109,236,70]],
        fan:[[172,109,224,70],[721,56,226,68],[721,160,226,68]],
        hub:[[124,109,188,70],[405,109,192,70],[737,56,220,68],[737,160,220,68]],
        pair:[[180,109,224,70],[700,109,224,70]],
        rails:[[155,109,225,70],[725,109,225,70]]
      }[shape];

      const paths = edges.map(({from, to, tone, lane, label: name}, index) => {
        const group = el('g', {'data-tone':tone});
        const path = el('path', {d:route(boxes[from], boxes[to], mobile, lane), class:`${id}-link`}, group);
        const length = path.getTotalLength();
        const directions = new Set(moves.filter(move => move.edge === index).map(move => move.reverse));
        if (directions.size === 1) {
          const backwards = directions.has(true);
          const offset = length * (backwards ? .22 : .78);
          const tip = path.getPointAtLength(offset);
          const tail = path.getPointAtLength(offset+(backwards ? 2 : -2));
          const angle = Math.atan2(tip.y-tail.y, tip.x-tail.x)*180/Math.PI;
          el('polyline', {points:'-6,-4 0,0 -6,4', transform:`translate(${tip.x} ${tip.y}) rotate(${angle})`, class:`${id}-link`}, group);
        }
        if (name) label(mobile ? 180+lane*79 : 440, mobile ? 132 : 109+lane*78, name, mobile ? 14 : 17, 'route', group);
        return {group, path, length, tone};
      });

      const cards = nodes.map(({title, detail, tone}, index) => {
        const [x,y,w,h] = boxes[index];
        const group = el('g', {'data-tone':tone});
        el('rect', {x:x-w/2,y:y-h/2,width:w,height:h,rx:6,class:`${id}-node`}, group);
        label(x, y-(mobile ? 7 : 9), title, mobile ? 17 : 23, 'title', group);
        const summary = label(x, y+(mobile ? 14 : 16), detail, mobile ? 14 : 17, 'detail', group);
        return {group, summary};
      });

      const tokens = moves.map(({edge, mark}) => {
        const group = el('g', {'data-tone':paths[edge].tone, 'aria-hidden':'true'});
        const w = mobile ? 21 : 26, h = mobile ? 18 : 22;
        el('rect', {x:-w/2,y:-h/2,width:w,height:h,rx:4,class:`${id}-packet`}, group);
        if (mark) label(0, .5, mark, mobile ? 14 : 16, 'mark', group);
        return group;
      });
      const status = label(width/2, mobile ? 270 : 219, note, mobile ? 14 : 19, 'status');
      label(width/2, mobile ? 292 : 240, ['示意，不代表实测数字','Schematic, not measured'], mobile ? 14 : 16, 'note');
      let changed;
      paint = (time, still = false) => {
        const done = still || (change !== undefined && time >= change);
        if (done !== changed) {
          changed = done;
          cards.forEach(({group, summary}, i) => {
            const {detail, after, tone} = nodes[i];
            summary.textContent = T(done && after ? after : detail);
            group.dataset.tone = done && i === activate ? 'meta' : tone;
          });
          if (failedEdge !== undefined) paths[failedEdge].group.dataset.tone = done ? 'failed' : paths[failedEdge].tone;
          status.textContent = T(done && afterNote ? afterNote : note);
        }
        moves.forEach(({edge,start,end,reverse,stop}, i) => {
          const item = tokens[i], {path,length} = paths[edge];
          const u = still ? .85 : Math.max(0, Math.min(1, (time-start)/(end-start)));
          const opacity = still
            ? (moves.findLastIndex(move => move.edge === edge) === i && edge !== failedEdge ? 1 : 0)
            : Math.max(0, Math.min(1,(time-start)/.14,(end+.25-time)/.25));
          item.style.opacity = opacity;
          if (!opacity) return;
          const p = path.getPointAtLength(length*(reverse ? 1-u*stop : u*stop));
          item.setAttribute('transform', `translate(${p.x} ${p.y})`);
        });
      };
      elapsed = 0;
      paint(0, reduced.matches);
      onLayout?.(width/height, mobile);
    }

    function tick(now) {
      const delta = Math.min(.05, Math.max(0, (now-last)/1000));
      last = now;
      elapsed = (elapsed+delta)%cycle;
      paint(elapsed);
      frame = requestAnimationFrame(tick);
    }
    function start() {
      cancelAnimationFrame(frame);
      if (paused || reduced.matches) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
    const rebuild = () => { draw(); start(); };
    narrow.addEventListener('change', rebuild);
    reduced.addEventListener('change', rebuild);
    document.addEventListener('ss-lang', rebuild);
    rebuild();

    const controller = {
      show(i) { step = Math.max(0, Math.min(scenes.length-1, i)); rebuild(); },
      pause() { paused = true; cancelAnimationFrame(frame); },
      resume() { if (!paused) return; paused = false; start(); },
      destroy() {
        controller.pause();
        narrow.removeEventListener('change', rebuild);
        reduced.removeEventListener('change', rebuild);
        document.removeEventListener('ss-lang', rebuild);
        delete host.__anim;
        host.replaceChildren();
        host.classList.remove(id);
      },
      ratio() { return width/height; },
      step() { return step; }
    };
    host.__anim = controller;
    return controller;
  }

  window.SSAnim ||= {};
  window.SSAnim[id] = {steps:5, mount};
})();
