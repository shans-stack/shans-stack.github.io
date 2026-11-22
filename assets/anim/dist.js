(function () {
  const EN = {
    "样本 B": "Samples B",
    "样本 A": "Samples A",
    "同一模型": "Same model",
    "梯度 B": "Gradient B",
    "梯度 A": "Gradient A",
    "逻辑操作": "Logical operation",
    "反向计算": "Backpropagation",
    "梯度通信": "Gradient communication",
    "参数更新": "Update",
    "重叠": "Overlap",
    "时间 →": "Time →",
    "权重分片 B": "Weight shard B",
    "权重分片 A": "Weight shard A",
    "部分输出": "Partial output",
    "逐元素求和": "Elementwise sum",
    "完整输出": "Full output",
    "阶段 2": "Stage 2",
    "阶段 1": "Stage 1",
    "层组 B": "Layer group B",
    "层组 A": "Layer group A",
    "前向激活值": "Forward activations",
    "反向梯度": "Backward gradients",
    "节点 B": "Node B",
    "节点 A": "Node A",
    "张量组": "Tensor group",
    "数据并行组": "Data-parallel groups",
    "示意，不代表实测数字": "Schematic, not measured"
  };
  const T = text => window.SS_LANG === 'en' ? EN[text] ?? text : text;

  function mount(host, {onLayout, paused = false} = {}) {
    const ns = 'http://www.w3.org/2000/svg';
    const mobileQuery = matchMedia('(max-width: 640px)');
    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = [840, 390], mobileSize = [360, 520];
    const prefix = 'dist';
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

    function replicas() {
      const steps = mobile ? [86,244,399] : [136,421,706];
      const lanes = mobile ? [88,272] : [110,278];
      lanes.forEach((lane,i) => {
        const [a,b,c] = steps.map(s => mobile?[lane,s]:[s,lane]);
        const first = wire([a,b],'blue'), second = wire([b,c],'good');
        send(first,.08+i*.055,.37+i*.04,'data');
        send(second,.42+i*.05,.78+i*.045);
        const titles = [i?"样本 B":"样本 A","同一模型",
          i?"梯度 B":"梯度 A"];
        [a,b,c].forEach((p,j) => node(p,titles[j],{w:mobile?145:181,h:64,
          kind:['storage','device','active'][j],sub:j===1?(i?'GPU B':'GPU A'):undefined}));
        box([a[0],a[1]+46],23,12,'data');
        showAfter(box([c[0],c[1]+46],23,12,'moving'),.76+i*.045);
      });
    }

    function allReduce() {
      const peers = mobile ? [[85,103],[275,103]] : [[120,185],[720,185]];
      const reduce = mobile ? [180,245] : [420,185];
      const out = mobile ? [[85,395],[275,395]] : [[120,301],[720,301]];
      peers.forEach((p,i) => {
        const into = mobile ? [p,[p[0],175],[180,175],reduce] : [p,reduce];
        const back = mobile ? [reduce,[180,319],[out[i][0],319],out[i]] :
          [reduce,[420,301],out[i]];
        send(wire(into,'blue'),.06+i*.035,.39+i*.035,'data');
        send(wire(back,'good'),.51,.84+i*.02);
        node(p,i?"梯度 B":"梯度 A",{w:mobile?138:163,kind:'storage'});
        const [x,y] = out[i];
        box(out[i],mobile?146:163,68,'active');
        label([x,y-4],i?'GPU B':'GPU A');
        showAfter(label([x,y+21],'A + B',{kind:'note'}),.82+i*.02);
      });
      node(reduce,'All-reduce',{w:184,h:74,kind:'device',sub:"逻辑操作"});
    }

    function overlap() {
      const x0 = mobile?33:286, x1 = mobile?327:775, span = x1-x0;
      const x = f => x0 + span*f;
      const y0 = mobile ? 132 : 111, y1 = mobile ? 249 : 205, y2 = mobile ? 392 : 299;
      const edge = mobile ? 29 : 31;
      const rows = [[y0,.0,.70,"反向计算",'storage'],
        [y1,.28,.87,"梯度通信",'active'],
        [y2,.87,1,"参数更新",'device']];
      box([(x(.28)+x(.70))/2,(y0+y1)/2],x(.70)-x(.28),y1-y0+69,'active',0);
      label([ (x(.28)+x(.70))/2,(y0+y1)/2+(mobile?-12:5) ],"重叠",{kind:'note'});
      rows.forEach(([y,start,end,name,tone]) => {
        wire([[x0,y],[x1,y]]);
        label([edge,mobile?y-40:y+6],name,{anchor:'start'});
        const width = x(end)-x(start);
        box([x(start)+width/2,y],width,21,'idle');
        const active = box([x(start)+width/2,y],width,21,tone);
        tracks.push(p => {
          const w = Math.max(0,Math.min(width,(p*1.14-start)*span));
          active.setAttribute('width', w);
          active.setAttribute('opacity',w>0?'1':'0');
        });
      });
      wire([[x(.87),y1+12],[x(.87),y2-12]],'neutral',true);
      const axis = mobile ? 455 : 346;
      wire([[x0,axis],[x1,axis]]);
      label([x1,axis+23],"时间 →",{anchor:'end',kind:'note'});
    }

    function tensors() {
      const parts = mobile ? [[88,89],[272,89]] : [[122,111],[122,272]];
      const sum = mobile ? [180,240] : [421,189];
      const out = mobile ? [180,403] : [709,189];
      parts.forEach((p,i) => {
        const bend = mobile ? [p[0],164] : [267,p[1]];
        const path = wire([p,bend,mobile?[180,bend[1]]:[bend[0],189],sum],'blue');
        send(path,.13+i*.06,.46+i*.055,'data');
        node(p,i?"权重分片 B":"权重分片 A",{
          w:mobile?153:177,h:75,sub:i?'GPU B':'GPU A',kind:'storage'});
        const center = mobile ? [p[0],p[1]+56] : [p[0]+165,p[1]-28];
        label(center,"部分输出",{kind:'note'});
      });
      send(wire([sum,out],'good'),.57,.83);
      node(sum,"逐元素求和",{w:193,kind:'active'});
      node(out,"完整输出",{w:163});
      showAfter(box([out[0],out[1]+45],29,13,'moving'),.81);
    }

    function pipeline() {
      const stages = mobile ? [[180,121],[180,360]] : [[287,185],[553,185]];
      const [a,b] = stages;
      const lead = mobile ? [a[0],35] : [71,a[1]], tail = mobile ? [b[0],444] : [769,b[1]];
      const links = [[lead,a],[a,b],[b,tail]].map(points => wire(points,'good'));
      const corner = mobile ? [[283,b[1]],[283,a[1]]] : [[b[0],298],[a[0],298]];
      const back = wire([b,...corner,a],'blue',true);
      const batches = [
        {tone:'moving', intervals:[[.03,.18],[.32,.52],[.65,.76]]},
        {tone:'data', intervals:[[.23,.38],[.58,.77],[.87,.96]]}
      ];
      send(back,.74,.94,'data');
      stages.forEach((p,i) => {
        node(p,i?"阶段 2":"阶段 1",
          {w:mobile?162:175,h:88,kind:'active',sub:i?"层组 B":"层组 A"});
      });
      batches.forEach(({tone, intervals},i) => {
        links.forEach((link,j) => send(link,...intervals[j],tone));
        stages.forEach(([x,y],stage) => {
          const active = box([x,y+34],22,9,tone);
          tracks.push(t => active.setAttribute('opacity',Number(t>=intervals[stage][1] && t<intervals[stage+1][0])));
        });
        const end = mobile ? [tail[0]+(i-.5)*26,tail[1]+15] : [tail[0]+16,tail[1]+(i-.5)*23];
        showAfter(box(end,19,10,tone),intervals[2][1]-.055);
      });
      label(mobile?[86,241]:[420,126],"前向激活值",{kind:'note'});
      label(mobile?[270,474]:[420,324],"反向梯度",{kind:'note'});
    }

    function groups() {
      const centers = mobile ? [[180,129],[180,376]] : [[193,192],[647,192]];
      const gpus = centers.map(([x,y]) => mobile?[[x-72,y],[x+72,y]]:[[x,y-62],[x,y+62]]);
      centers.forEach(([x,y],i) => {
        box([x,y],mobile?327:268,mobile?151:253,'frame',0);
        const local = wire(gpus[i],'good');
        send(local,.12,.43);
        label([x,y-(mobile?87:139)],i?"节点 B":"节点 A");
        label([x,y+(mobile?58:117)],"张量组",{kind:'note'});
      });
      gpus[0].forEach((p,i) => {
        const other = gpus[1][i];
        const across = wire([p,other],'blue',true);
        send(across,.47+i*.03,.86+i*.03,'data',i===1);
      });
      label(mobile?[180,255]:[420,194],"数据并行组",{kind:'note'});
      gpus.flat().forEach((p,i) => node(p,['GPU A₁','GPU A₂','GPU B₁','GPU B₂'][i],
        {w:mobile?110:163,h:52,kind:i<2?'storage':'active'}));
    }

    const scenes = [replicas,allReduce,overlap,tensors,pipeline,groups];

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
  window.SSAnim.dist = {steps: 6, mount};
})();
