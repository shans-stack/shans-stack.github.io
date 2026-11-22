(function () {
  const EN = {
    "中间结果": "Intermediate result",
    "后续运算": "Next operation",
    "显存间交换": "VRAM transfer",
    "PCIe 交换": "PCIe switch",
    "发起操作": "Initiates",
    "主机内存": "Host memory",
    "不搬数据": "No payload",
    "任务控制": "Control",
    "同一 NVLink 域": "One NVLink domain",
    "节点 B": "Node B",
    "节点 A": "Node A",
    "本地显存": "Local VRAM",
    "转发": "Forwards",
    "NVLink 域 A": "NVLink domain A",
    "NVLink 域 B": "NVLink domain B",
    "网卡": "NIC",
    "集群网络": "Cluster fabric",
    "域内 NVLink": "Local NVLink",
    "示意，不代表实测数字": "Schematic, not measured"
  };
  const T = text => window.SS_LANG === 'en' ? EN[text] ?? text : text;

  function mount(host, {onLayout, paused = false} = {}) {
    const ns = 'http://www.w3.org/2000/svg';
    const mobileQuery = matchMedia('(max-width: 640px)');
    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = [840, 390], mobileSize = [360, 520];
    const prefix = 'nvl';
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

    function exchange() {
      const a = mobile ? [180,111] : [185,185], b = mobile ? [180,380] : [655,185];
      send(wire([a,b],'good'),.16,.74);
      node(a,'GPU A',{w:mobile?210:218,h:99,kind:'storage',sub:"中间结果"});
      node(b,'GPU B',{w:mobile?210:218,h:99,kind:'active',sub:"后续运算"});
      box([a[0],a[1]+33],24,12,'data');
      showAfter(box([b[0],b[1]+33],24,12,'moving'),.72);
      label(mobile?[202,250]:[420,164],"显存间交换",{anchor:mobile?'start':'middle',kind:'note'});
    }

    function pcie() {
      const a = mobile ? [82,373] : [104,272], b = mobile ? [278,373] : [736,272];
      const sw = mobile ? [180,245] : [420,215];
      const cpu = mobile ? [82,95] : [420,91], ram = mobile ? [278,95] : [690,91];
      const via = mobile ? [[a[0],sw[1]],sw,[b[0],sw[1]]] : [[259,a[1]],[259,sw[1]],sw,[581,sw[1]],[581,b[1]]];
      const path = wire([a,...via,b],'good');
      const control = wire([cpu,mobile?[cpu[0],170]:cpu,mobile?[sw[0],170]:sw,sw],'blue',true);
      wire([cpu,ram],'neutral',true);
      send(control,.04,.26,'data');
      send(path,.31,.83);
      node(a,'GPU A',{w:mobile?114:152,kind:'storage'});
      node(b,'GPU B',{w:mobile?114:152,kind:'active'});
      node(sw,"PCIe 交换",{w:mobile?157:184});
      node(cpu,'CPU',{w:mobile?132:163,sub:"发起操作"});
      node(ram,"主机内存",{w:mobile?139:179,kind:'idle',sub:"不搬数据"});
      box([a[0],a[1]+44],24,12,'data');
      showAfter(box([b[0],b[1]+44],24,12,'moving'),.79);
    }

    function direct() {
      const a = mobile ? [84,363] : [182,257], b = mobile ? [276,363] : [658,257];
      const cpu = mobile ? [180,105] : [420,95];
      const bend = mobile ? [a[0],200] : [a[0],95];
      const control = wire([cpu,[cpu[0],bend[1]],bend,a],'blue',true);
      const data = wire([a,b],'good');
      send(control,.05,.30,'data');
      send(data,.36,.79);
      node(cpu,'CPU',{w:180,sub:"发起操作"});
      node(a,'GPU A',{w:mobile?126:180,h:70,kind:'storage'});
      node(b,'GPU B',{w:mobile?126:180,h:70,kind:'active'});
      label([mobile?180:420,a[1]-17],'NVLink',{kind:'note'});
      box([a[0],a[1]+50],24,12,'data');
      showAfter(box([b[0],b[1]+50],24,12,'moving'),.77);
      if(!mobile) label([268,78],"任务控制",{kind:'note'});
    }

    function switched(multiNode) {
      const sw = mobile ? [180,235] : [420,194];
      const peers = mobile ? [[87,102],[273,102],[87,370],[273,370]]
        : [[161,98],[679,98],[161,285],[679,285]];
      if(multiNode) {
        const center = mobile ? [180,244] : [420,191];
        box(center,mobile?332:750,mobile?408:306,'frame',0);
        label([mobile?180:420,mobile?29:29],"同一 NVLink 域",{kind:'note'});
        const y = mobile ? [68,335] : [65,250];
        y.forEach((pos,i) => label([mobile?180:161,pos],i ? "节点 B" : "节点 A",{kind:'note'}));
      }
      [1,2,0,3].forEach(i => {
        const p = peers[i], active = i===0 || i===3;
        const route = wire([p,mobile?[p[0],sw[1]]:[sw[0],p[1]],sw],active?'good':'neutral');
        if (i===0) send(route,.09,.47);
        if (i===3) send(route,.49,.88,'moving',true);
      });
      peers.forEach((p,i) => {
        node(p,['GPU A','GPU B','GPU C','GPU D'][i],{
          w:mobile?121:150,h:multiNode?58:60,kind:i===0?'storage':i===3?'active':'idle',
          sub:multiNode?"本地显存":undefined
        });
        if (i===0) box([p[0],p[1]+43],23,12,'data');
        if (i===3) showAfter(box([p[0],p[1]+43],23,12,'moving'),.84);
      });
      node(sw,'NVSwitch',{w:145,kind:'active',sub:"转发"});
    }

    function crossDomain() {
      const points = mobile ? [[95,80],[265,80],[180,242],[265,395],[95,395]] :
        [[101,173],[258,173],[420,173],[582,173],[739,173]];
      const [a,na,network,nb,b] = points;
      if(mobile) {
        [a[1],b[1]].forEach(y => box([180,y+12],333,126,'frame',0));
      } else {
        [180,660].forEach(x => box([x,173],312,183,'frame',0));
      }
      label(mobile?[180,22]:[180,67],"NVLink 域 A",{kind:'note'});
      label(mobile?[180,334]:[660,67],"NVLink 域 B",{kind:'note'});
      const uplink = mobile ? [[na[0],170],[180,170]] : [];
      const downlink = mobile ? [[180,311],[nb[0],311]] : [];
      const path = wire([a,na,...uplink,network,...downlink,nb,b],'good');
      send(path,.1,.84);
      node(a,'GPU A',{w:mobile?123:108,kind:'storage',sub:"本地显存"});
      node(b,'GPU B',{w:mobile?123:108,kind:'active',sub:"本地显存"});
      [na,nb].forEach(p => node(p,"网卡",{w:mobile?107:91,h:56}));
      node(network,"集群网络",{w:mobile?169:151,h:60});
      [a,b].forEach(([x,y],i) => {
        const p = mobile ? [x,y+37] : [x,y+47];
        if(i) showAfter(box(p,24,12,'moving'),.81); else box(p,24,12,'data');
      });
      [a,b].forEach(([x,y]) => {
        wire([[x,y+31],[x,y+57]],'neutral',true);
        label([mobile?x+13:x,mobile?y+62:y+84],"域内 NVLink",
          {anchor:mobile?'start':'middle',kind:'note'});
      });
    }

    const scenes = [exchange,pcie,direct,() => switched(false),() => switched(true),crossDomain];

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
  window.SSAnim.nvl = {steps: 6, mount};
})();
