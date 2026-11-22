(function () {
  const EN = {
    "输入": "Input",
    "线程": "Thread",
    "输出": "Output",
    "矩阵块 B": "Tile B",
    "矩阵块 A": "Tile A",
    "乘加单元": "Multiply-accumulate",
    "计算部分积": "Partial products",
    "输出块": "Output tile",
    "堆叠 DRAM": "Stacked DRAM",
    "执行单元": "Execution units",
    "并行": "Parallel",
    "通道": "channels",
    "并行通道": "Parallel channels",
    "源数据块": "Source tile",
    "片上暂存": "On-chip storage",
    "同一份数据": "One shared tile",
    "运算 B": "Operation B",
    "运算 A": "Operation A",
    "显存容量": "Memory capacity",
    "显存带宽": "Memory bandwidth",
    "执行算力": "Compute throughput",
    "工作集驻留": "Working set fits",
    "持续传送数据": "Data transfer",
    "并行执行运算": "Parallel operations",
    "示意，不代表实测数字": "Schematic, not measured"
  };
  const T = text => window.SS_LANG === 'en' ? EN[text] ?? text : text;

  function mount(host, {onLayout, paused = false} = {}) {
    const ns = 'http://www.w3.org/2000/svg';
    const mobileQuery = matchMedia('(max-width: 640px)');
    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = [840, 390], mobileSize = [360, 520];
    const prefix = 'gpu';
    host.classList.add(prefix + '-anim');
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('role', 'img');
    host.replaceChildren(svg);

    let layers, tracks, mobile, width, height;
    let current = 0, frame = 0, elapsed = 0, last = null, stopped = paused;

    function element(tag, attrs, layer, value) {
      const el = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([key, val]) => el.setAttribute(key, val));
      if (value !== undefined) el.textContent = value;
      layers[layer].append(el);
      return el;
    }

    function label([x, y], key, {anchor = 'middle', kind = 'label'} = {}) {
      return element('text', {x, y, 'text-anchor': anchor, class: prefix + '-' + kind}, 4, T(key));
    }

    function box([x, y], w, h, kind = 'device', layer = 3) {
      return element('rect', {x: x-w/2, y: y-h/2, width: w, height: h, rx: 3, class: prefix + '-' + kind}, layer);
    }

    function node(p, name, {w = mobile ? 140 : 178, h = 60, kind = 'device', sub} = {}) {
      box(p, w, h, kind);
      label([p[0], p[1] + (sub ? -4 : 6)], name);
      if (sub) label([p[0], p[1]+19], sub, {kind: 'note'});
    }

    function wire(points, tone = 'neutral', dashed = false) {
      const d = points.map(([x,y], i) => (i ? 'L' : 'M') + x + ' ' + y).join(' ');
      return element('path', {d, class: prefix + '-wire ' + prefix + '-' + tone,
        'stroke-dasharray': dashed ? '5 6' : 'none'}, 1);
    }

    function send(path, start, end, tone = 'moving', reverse = false) {
      const length = path.getTotalLength();
      const chip = box([0, 0], 16, 11, tone, 2);
      tracks.push(p => {
        const fraction = (p-start)/(end-start);
        if (fraction <= 0 || fraction >= 1) {
          chip.setAttribute('opacity', 0);
          return;
        }
        const point = path.getPointAtLength(length * (reverse ? 1-fraction : fraction));
        chip.setAttribute('transform', 'translate(' + point.x + ' ' + point.y + ')');
        chip.setAttribute('opacity', Math.min(1, fraction*14, (1-fraction)*14));
      });
    }

    function showAfter(el, time) {
      tracks.push(p => el.setAttribute('opacity', Math.max(0, Math.min(1, (p-time)*18))));
      return el;
    }

    function parallel() {
      const stages = mobile ? [90, 236, 382] : [136, 420, 704];
      const lanes = mobile ? [61, 180, 299] : [90, 191, 292];
      const names = ["输入", "线程", "输出"];
      const point = (stage, lane) => mobile ? [lane, stage] : [stage, lane];
      lanes.forEach((lane, i) => {
        const [a, b, c] = stages.map(stage => point(stage, lane));
        const first = wire([a,b], 'blue'), second = wire([b,c], 'good');
        [a,b,c].forEach((p, j) => node(p, names[j], {
          w: mobile ? 100 : 156, h: 58, kind: ['storage','device','active'][j]
        }));
        const blocks = [a,b,c].map(([x,y], j) =>
          box([x,y+44], 32, 12, ['data','active','moving'][j]));
        showAfter(blocks[1], .33+i*.025);
        showAfter(blocks[2], .69+i*.025);
        send(first, .08+i*.025, .37+i*.025, 'data');
        send(second, .40+i*.025, .73+i*.025);
      });
    }

    function multiply() {
      const a = mobile ? [87,91] : [128,105], b = mobile ? [273,91] : [128,271];
      const unit = mobile ? [180,240] : [421,188], out = mobile ? [180,395] : [710,188];
      [a,b].forEach((p,i) => {
        const bend = mobile ? [p[0],167] : [274,p[1]];
        const path = wire([p,bend,mobile ? [unit[0],bend[1]] : [bend[0],unit[1]],unit], 'blue');
        send(path, .08+i*.06,.36+i*.04, 'data');
        node(p,i ? "矩阵块 B" : "矩阵块 A",{kind:'storage'});
        [0,1,2,3].forEach(j => box([p[0]+(j-1.5)*17,p[1]+44],13,12,'data'));
      });
      send(wire([unit,out],'good'),.5,.79);
      node(unit,"乘加单元",{w:mobile?234:226,h:74,kind:'active',sub:"计算部分积"});
      node(out,"输出块",{kind:'device'});
      [0,1,2,3].forEach(i => showAfter(box([out[0]+(i-1.5)*17,out[1]+45],13,12,'moving'),.77+i*.027));
    }

    function bandwidth() {
      const mem = mobile ? [180,116] : [182,186], gpu = mobile ? [180,361] : [657,186];
      const w = mobile ? 215 : 217, h = 112;
      [-42,0,42].forEach((offset,i) => {
        const shift = p => mobile ? [p[0]+offset,p[1]] : [p[0],p[1]+offset];
        const path = wire([shift(mem),shift(gpu)],'good');
        send(path,.12+i*.05,.68+i*.05);
      });
      [12,6,0].forEach(d => box([mem[0],mem[1]-d],w,h,'storage'));
      node(mem,'HBM',{w,h,kind:'storage',sub:"堆叠 DRAM"});
      node(gpu,'GPU',{w,h,kind:'active',sub:"执行单元"});
      [-22,0,22].forEach((dx,i) => {
        box([mem[0]+dx,mem[1]+38],16,10,'data');
        showAfter(box([gpu[0]+dx,gpu[1]+38],16,10,'moving'),.65+i*.05);
      });
      if(mobile) {
        label([240,238],"并行",{anchor:'start',kind:'note'});
        label([240,261],"通道",{anchor:'start',kind:'note'});
      } else label([420,173],"并行通道",{kind:'note'});
    }

    function reuse() {
      const mem = mobile ? [180,82] : [113,190], tile = mobile ? [180,234] : [387,190];
      const outputs = mobile ? [[87,395],[273,395]] : [[694,106],[694,274]];
      const load = wire([mem,tile],'blue');
      send(load,.07,.33,'data');
      node(mem,'HBM',{kind:'storage',sub:"源数据块"});
      node(tile,"片上暂存",{kind:'active',w:mobile?195:192,sub:"同一份数据"});
      box([mem[0],mem[1]+44],23,13,'data');
      outputs.forEach((p,i) => {
        const bend = mobile ? [tile[0],320] : [537,tile[1]];
        const path = wire([tile,bend,mobile?[p[0],bend[1]]:[bend[0],p[1]],p],'good');
        send(path,.43,.77+i*.08);
        node(p,i ? "运算 B" : "运算 A",{w:mobile?151:172});
        showAfter(box([p[0],p[1]+44],23,13,'moving'),.74+i*.07);
      });
      showAfter(box([tile[0],tile[1]+44],25,13,'moving'),.33);
    }

    function limits() {
      const headers = ["显存容量","显存带宽","执行算力"];
      const captions = ["工作集驻留","持续传送数据","并行执行运算"];
      const points = mobile ? [[180,95],[180,249],[180,403]] : [[151,185],[420,185],[689,185]];
      points.forEach(([x,y],i) => {
        label([x,y-57],headers[i]);
        if (i===0) {
          box([x,y],178,41,'storage');
          for(let j=0;j<5;j++) box([x+(j-2)*31,y],25,24,j<4?'data':'idle');
        } else if(i===1) {
          const path = wire([[x-87,y],[x+87,y]],'blue');
          box([x-89,y],22,26,'storage');
          box([x+89,y],22,26,'storage');
          for(let j=0;j<3;j++) send(path,.08+j*.17,.46+j*.17,'data');
          showAfter(box([x+89,y],15,12,'data'),.72);
        } else {
          [-58,0,58].forEach((dx,j) => {
            box([x+dx,y],43,41,'active');
            showAfter(box([x+dx,y],29,25,'moving'),.34+j*.12);
          });
        }
        label([x,y+52],captions[i],{kind:'note'});
      });
    }

    const scenes = [parallel,multiply,bandwidth,reuse,limits];

    function restart() {
      cancelAnimationFrame(frame);
      frame = 0;
      last = null;
      elapsed = 0;
      mobile = mobileQuery.matches;
      [width, height] = mobile ? mobileSize : desktop;
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      const title = window.SS_TOPIC_CFG.steps[current].t;
      svg.setAttribute('aria-label', title[window.SS_LANG === 'en' ? 1 : 0]);
      layers = Array.from({length: 5}, () => document.createElementNS(ns, 'g'));
      svg.replaceChildren(...layers);
      tracks = [];
      scenes[current]();
      label([width/2, height-14], "示意，不代表实测数字", {kind: 'note'});
      render(motionQuery.matches ? .97 : 0);
      if (!stopped && !motionQuery.matches) frame = requestAnimationFrame(tick);
    }

    function render(p) {
      tracks.forEach(update => update(p));
    }

    function tick(now) {
      if (last !== null) elapsed += Math.max(0, now-last);
      last = now;
      render((elapsed % 6300)/6300);
      frame = requestAnimationFrame(tick);
    }

    function layout() {
      restart();
      if (onLayout) onLayout(width/height, mobile);
    }

    mobileQuery.addEventListener('change', layout);
    motionQuery.addEventListener('change', restart);
    document.addEventListener('ss-lang', restart);
    restart();

    host.__anim = {
      show(i) { current = Math.max(0, Math.min(scenes.length-1, i)); restart(); },
      pause() { stopped = true; cancelAnimationFrame(frame); frame = 0; last = null; },
      resume() {
        stopped = false;
        if (!frame && !motionQuery.matches) frame = requestAnimationFrame(tick);
      },
      destroy() {
        this.pause();
        mobileQuery.removeEventListener('change', layout);
        motionQuery.removeEventListener('change', restart);
        document.removeEventListener('ss-lang', restart);
        host.classList.remove(prefix + '-anim');
        host.replaceChildren();
        delete host.__anim;
      },
      ratio() { return width/height; },
      step() { return current; }
    };
    return host.__anim;
  }

  window.SSAnim = window.SSAnim || {};
  window.SSAnim.gpu = {steps: 5, mount};
})();
