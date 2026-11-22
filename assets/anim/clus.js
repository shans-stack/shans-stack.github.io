(function () {
  const EN = {
    "部署单元 B": "Deployment unit B",
    "部署单元 A": "Deployment unit A",
    "GPU 节点": "GPU node",
    "网络接入": "Network uplink",
    "GPU 节点 A": "GPU node A",
    "梯度块": "Gradient block",
    "GPU 节点 B": "GPU node B",
    "计算网交换机": "Compute switch",
    "共享存储": "Shared storage",
    "训练节点": "Training node",
    "存储网": "Storage fabric",
    "样本读取": "Sample read",
    "检查点写入": "Checkpoint write",
    "管理服务": "Management service",
    "管理平面": "Management plane",
    "操作系统": "Host OS",
    "带内管理": "In-band",
    "硬件控制器": "Controller",
    "带外管理": "Out-of-band",
    "GPU 数据路径空闲": "GPU data path idle",
    "训练作业": "Training job",
    "调度器": "Scheduler",
    "分配 GPU": "Allocates GPUs",
    "节点 B": "Node B",
    "节点 A": "Node A",
    "等待分配": "Awaiting allocation",
    "运行中": "Running",
    "示意，不代表实测数字": "Schematic, not measured"
  };
  const T = text => window.SS_LANG === 'en' ? EN[text] ?? text : text;

  function mount(host, {onLayout, paused = false} = {}) {
    const ns = 'http://www.w3.org/2000/svg';
    const mobileQuery = matchMedia('(max-width: 640px)');
    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = [840, 390], mobileSize = [360, 520];
    const prefix = 'clus';
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

    function units() {
      const centers = mobile ? [[180,130],[180,367]] : [[222,185],[618,185]];
      centers.forEach(([x,y],i) => {
        const w = mobile ? 328 : 366;
        box([x,y],w,193,'frame',0);
        label([x,y-110],i?"部署单元 B":"部署单元 A");
        const pair = [[x-77,y-35],[x+77,y-35]];
        const port = [x,y+55];
        pair.forEach((p,j) => {
          const route = wire([p,[p[0],y+16],[x,y+16],port],'good');
          send(route,.12+i*.35+j*.045,.44+i*.35+j*.045);
          node(p,"GPU 节点",{w:132,h:54});
        });
        node(port,"网络接入",{w:165,h:46,kind:'active'});
      });
    }

    function compute() {
      const a = mobile ? [180,100] : [115,250], b = mobile ? [180,402] : [725,250];
      const sw = mobile ? [180,251] : [420,110];
      const path = wire(mobile ? [a,[96,100],[96,251],sw,[264,251],[264,402],b] :
        [a,[251,250],[251,110],sw,[589,110],[589,250],b],'good');
      send(path,.12,.81);
      node(a,"GPU 节点 A",{w:mobile?156:174,sub:"梯度块",kind:'storage'});
      node(b,"GPU 节点 B",{w:mobile?156:174,sub:"梯度块",kind:'active'});
      node(sw,"计算网交换机",{w:mobile?163:192});
      box([a[0],a[1]+44],24,13,'data');
      showAfter(box([b[0],b[1]+44],24,13,'moving'),.78);
    }

    function storage() {
      const a = mobile ? [180,83] : [141,192], mid = mobile ? [180,245] : [420,192];
      const b = mobile ? [180,404] : [699,192];
      const off = (p,d) => mobile ? [p[0]+d,p[1]] : [p[0],p[1]+d];
      const read = wire([a,off(a,-57),off(mid,-57),off(b,-57),b],'good');
      const write = wire([a,off(a,57),off(mid,57),off(b,57),b],'blue');
      send(read,.07,.43);
      send(write,.48,.86,'data',true);
      node(a,"共享存储",{w:170,h:65,kind:'storage'});
      node(b,"训练节点",{w:170,h:65,kind:'active'});
      node(mid,"存储网",{w:mobile?146:183,h:mobile?58:132});
      label(mobile?[99,167]:[420,112],"样本读取",{kind:'note'});
      label(mobile?[266,333]:[420,283],"检查点写入",{kind:'note'});
      showAfter(box([b[0],b[1]+46],24,13,'moving'),.42);
      showAfter(box([a[0],a[1]+46],24,13,'data'),.83);
    }

    function management() {
      const service = mobile ? [180,83] : [123,183];
      const net = mobile ? [180,225] : [389,183];
      const os = mobile ? [87,403] : [682,105], ctrl = mobile ? [273,403] : [682,255];
      const main = wire([service,net],'blue');
      send(main,.05,.28,'data');
      [os,ctrl].forEach((p,i) => {
        const bend = mobile ? [180,306] : [523,183];
        const link = wire([net,bend,mobile?[p[0],bend[1]]:[bend[0],p[1]],p],'blue',i===1);
        send(link,.30+i*.04,.60+i*.04,'data');
        send(link,.62+i*.015,.83+i*.015,'data',true);
      });
      send(main,.83,.96,'data',true);
      node(service,"管理服务",{w:208,kind:'storage'});
      node(net,"管理平面",{w:213});
      node(os,"操作系统",{w:mobile?148:187,h:70,sub:"带内管理"});
      node(ctrl,"硬件控制器",{w:mobile?148:187,h:70,sub:"带外管理"});
      const unused = mobile ? [180,466] : [681,324];
      label(unused,"GPU 数据路径空闲",{kind:'note'});
    }

    function schedule() {
      const job = mobile ? [180,73] : [108,180], scheduler = mobile ? [180,213] : [378,180];
      const nodes = mobile ? [[87,379],[273,379]] : [[699,110],[699,261]];
      send(wire([job,scheduler],'blue'),.03,.28,'data');
      node(job,"训练作业",{w:169,kind:'storage'});
      node(scheduler,"调度器",{w:178,kind:'device',sub:"分配 GPU"});
      nodes.forEach((p,i) => {
        const bend = mobile ? [180,297] : [538,180];
        const path = wire([scheduler,bend,mobile?[p[0],bend[1]]:[bend[0],p[1]],p],'good');
        send(path,.32,.73+i*.04);
        box(p,mobile?145:181,82);
        showAfter(box(p,mobile?145:181,82,'active'),.75+i*.04);
        label([p[0],p[1]-3],i ? "节点 B" : "节点 A");
        const status = label([p[0],p[1]+22],"等待分配",{kind:'note'});
        tracks.push(t => status.textContent = T(t>.76+i*.04?"运行中":"等待分配"));
      });
    }

    const scenes = [units,compute,storage,management,schedule];

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
  window.SSAnim.clus = {steps: 5, mount};
})();
