(function () {
  const id = 'w-ncp';
  const prefix = 'ssa-' + id;
  const scenes = [
    {
      layout: "chain",
      nodes: [[["NVIDIA GPU 系统", "NVIDIA GPU Systems"], ["HGX 或 NVL72", "HGX or NVL72"], "bb"], [["存储网络", "Storage Fabric"], ["连接 GPU 与存储", "Connects GPU and Storage"], ""], [["WEKA HPS", "WEKA HPS"], ["NeuralMesh 存储层", "NeuralMesh Storage"], "ggg"]],
      paths: [[2, 1, 0.12, 1], [1, 0, 1.12, 1]],
      states: [[2, 0.1, "on"], [0, 2.12, "on"]]
    },
    {
      layout: "compute",
      nodes: [[["GPU 节点 A", "GPU Node A"], ["计算网 ⇄", "Compute Fabric ⇄"], "b"], [["GPU 节点 B", "GPU Node B"], ["计算网 ⇄", "Compute Fabric ⇄"], "b"], [["存储网络", "Storage Fabric"], ["训练数据 / 检查点", "Datasets / Checkpoints"], ""], [["WEKA 存储", "WEKA Storage"], ["NeuralMesh", "NeuralMesh"], ""]],
      paths: [[0, 1, 0.12, 1.1, "signal"], [3, 2, 1.28, 0.75], [2, 0, 2.03, 0.95], [1, 2, 3.12, 0.9], [2, 3, 4.02, 0.72]],
      states: [[3, 4.74, "on", "g"]]
    },
    {
      layout: "fork",
      nodes: [[["WEKA 存储节点", "WEKA Storage Node"], ["两张独立网卡", "Two Network Adapters"], "bb"], [["叶交换机 A", "Leaf Switch A"], ["Ethernet · 路径 A", "Ethernet · Path A"], "g"], [["叶交换机 B", "Leaf Switch B"], ["Ethernet · 路径 B", "Ethernet · Path B"], "g"]],
      paths: [[0, 1, 0.18, 1.45], [0, 2, 0.18, 1.45]],
      states: [[1, 1.63, "on"], [2, 1.63, "on"]]
    },
    {
      layout: "fork",
      nodes: [[["WEKA 存储节点", "WEKA Storage Node"], ["数据与管理接口", "Data and Management Ports"], ""], [["GPU 客户端", "GPU Client"], ["存储网络", "Storage Fabric"], "gg"], [["WMS", "WMS"], ["带外管理", "Out-of-Band Control"], "b"]],
      paths: [[1, 0, 0.22, 1.4], [2, 0, 0.22, 1.4, "control"]],
      states: [[0, 1.62, "on"]]
    },
    {
      layout: "chain",
      nodes: [[["GPU 平台与规模", "GPU Platform and Scale"], ["HGX / NVL72", "HGX / NVL72"], "bb"], [["HPS 读写目标", "HPS I/O Targets"], ["模型与数据集", "Model and Dataset"], ""], [["WEKA 存储配置", "WEKA Storage Design"], ["服务器与接线", "Servers and Cabling"], "gg"]],
      paths: [[0, 1, 0.15, 1, "control"], [1, 2, 1.15, 1, "control"]],
      states: [[2, 2.15, "on"]]
    }
  ];

  function layout(kind, mobile) {
    const presets = {
      chain: mobile ? [[175,61,258],[175,187,258],[175,313,258]]
        : [[141,151,240],[420,151,240],[699,151,240]],
      lanes: mobile ? [[87,82,158],[87,258,158],[263,82,158],[263,258,158]]
        : [[177,82,248],[663,82,248],[177,228,248],[663,228,248]],
      fork: mobile ? [[175,63,258],[87,252,158],[263,252,158]]
        : [[159,153,242],[643,82,253],[643,227,253]],
      options: mobile ? [[175,51,232],[200,142,242],[200,238,242],[200,334,242]]
        : [[160,153,248],[649,48,260],[649,153,260],[649,258,260]],
      compute: mobile ? [[87,62,146],[263,62,146],[175,200,245],[175,317,245]]
        : [[190,64,232],[650,64,232],[420,155,252],[420,252,252]],
    };
    return presets[kind].map(([x,y,w]) => ({x,y,w,h:70}));
  }

  function path(kind, boxes, from, to, mobile) {
    const reversed = (kind === 'fork' || kind === 'options') && to === 0;
    const a = boxes[reversed ? to : from];
    const b = boxes[reversed ? from : to];
    let points;
    if (kind === 'fork' || kind === 'options') {
      const branch = reversed ? from : to;
      const offset = (branch-1)*25;
      if (mobile && kind === 'options') {
        const rail = 50-branch*11;
        points = [[a.x-a.w/2,a.y+offset-20],[rail,a.y+offset-20],[rail,b.y],[b.x-b.w/2,b.y]];
      } else if (mobile) {
        const x = a.x+(branch === 1 ? -23 : 23);
        points = [[x,a.y+a.h/2],[x,154],[b.x,154],[b.x,b.y-b.h/2]];
      } else {
        const y = a.y+offset-(kind === 'options' ? 25 : 12);
        const rail = 389+branch*24;
        points = [[a.x+a.w/2,y],[rail,y],[rail,b.y],[b.x-b.w/2,b.y]];
      }
    } else if (a.y === b.y) {
      const dir = Math.sign(b.x-a.x);
      points = [[a.x+dir*a.w/2,a.y],[b.x-dir*b.w/2,b.y]];
    } else {
      const dir = Math.sign(b.y-a.y);
      const start = a.y+dir*a.h/2, end = b.y-dir*b.h/2;
      const offset = kind === 'compute' && a.x === b.x ? dir*10 : 0;
      const x = a.x === b.x ? a.x+offset : (a.x < b.x ? -38 : 38)+b.x;
      points = [[a.x+offset,start],[a.x+offset,(start+end)/2],[x,(start+end)/2],[x,end]];
    }
    return reversed ? points.reverse() : points;
  }

  function mount(host, options = {}) {
    const compact = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const ns = 'http://www.w3.org/2000/svg';
    const cls = name => prefix + '-' + name;
    const svg = document.createElementNS(ns,'svg');
    const height = () => compact.matches ? 400 : 330;
    const width = () => compact.matches ? 350 : 840;
    let step = 0, frame = 0, time = 0, last = 0, period = 0;
    let paused = Boolean(options.paused), routes = [], cards = [];
    host.classList.add(prefix);
    host.replaceChildren(svg);
    svg.setAttribute('role','img');

    function make(tag, attrs, parent = svg) {
      const el = document.createElementNS(ns, tag);
      for (const [key, value] of Object.entries(attrs)) el.setAttribute(key,value);
      parent.append(el);
      return el;
    }

    function render(t) {
      for (const {line, arrow, packet, length, start, end, kind} of routes) {
        const active = kind !== 'blocked' && t >= start && t < end;
        const started = kind !== 'blocked' && t >= start;
        line.classList.toggle(cls('visited'), started);
        arrow.classList.toggle(cls('visited'), started);
        packet.style.opacity = active ? Math.min(1,(period-t)*6) : 0;
        if (active) {
          const p = line.getPointAtLength(length*(t-start)/(end-start));
          packet.setAttribute('transform','translate('+p.x+' '+p.y+')');
        }
      }
      for (const {group, state, initial, chips} of cards) {
        const active = state && t >= state[1];
        group.setAttribute('data-state',active ? state[2] : '');
        const blocks = active ? (state[3] ?? initial) : initial;
        chips.forEach((chip,i) => chip.setAttribute('data-block',blocks[i] || ''));
      }
    }

    function tick(now) {
      time += Math.min(.08,Math.max(0,(now-last)/1000));
      last = now;
      render(time % period);
      frame = requestAnimationFrame(tick);
    }

    function play() {
      cancelAnimationFrame(frame);
      if (paused || reduced.matches) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }

    function build() {
      const scene = scenes[step], mobile = compact.matches;
      const lang = window.SS_LANG === 'en' ? 1 : 0;
      const note = ['示意，不代表实测数字','Schematic · No Measured Figures'][lang];
      const w = width(), h = height();
      const boxes = layout(scene.layout,mobile);
      svg.replaceChildren();
      svg.setAttribute('viewBox','0 0 '+w+' '+h);
      svg.setAttribute('aria-label',scene.nodes.map(([title,detail]) => title[lang]+' · '+detail[lang]).join(' / ')+'. '+note);
      const wires = make('g',{});
      const components = make('g',{});
      const traffic = make('g',{});
      routes = scene.paths.map(([from,to,start,duration,kind='data']) => {
        const points = path(scene.layout,boxes,from,to,mobile);
        const line = make('path',{d:'M'+points.map(p=>p.join(',')).join('L'),class:cls('wire'),'data-kind':kind},wires);
        const length = line.getTotalLength();
        const a = line.getPointAtLength(length-2), b = line.getPointAtLength(length-8);
        const angle = Math.atan2(a.y-b.y,a.x-b.x)*180/Math.PI;
        const arrow = make('path',{d:'M-7 -4L0 0L-7 4Z',transform:'translate('+a.x+' '+a.y+') rotate('+angle+')',class:cls('arrow'),'data-kind':kind},wires);
        const packet = make(kind === 'control' ? 'circle' : 'rect',{
          ...(kind === 'control' ? {r:4} : {x:-6,y:-4,width:12,height:8,rx:1.5}),
          class:cls('packet'),'data-kind':kind,
        },traffic);
        return {line,arrow,packet,length,start,end:start+duration,kind};
      });
      cards = scene.nodes.map(([title,detail,initial],i) => {
        const {x,y,w,h} = boxes[i];
        const group = make('g',{class:cls('card')},components);
        make('rect',{x:x-w/2,y:y-h/2,width:w,height:h,rx:5,class:cls('body')},group);
        const state = scene.states.find(item => item[0] === i);
        const count = Math.max(initial.length,state?.[3]?.length || 0);
        make('text',{x,y:y-(count ? 21 : 13),class:cls('label')},group).textContent = title[lang];
        make('text',{x,y:y+(count ? 4 : 13),class:cls('detail')},group).textContent = detail[lang];
        const chips = Array.from({length:count},(_,j) =>
          make('rect',{x:x+(j-(count-1)/2)*13-5,y:y+19,width:10,height:7,rx:1.2,class:cls('block')},group));
        return {group,state,initial,chips};
      });
      make('text',{x:w/2,y:h-15,class:cls('note')}).textContent = note;
      period = Math.max(1.8,...routes.map(r=>r.end),...scene.states.map(s=>s[1]))+1.25;
      time = 0;
      render(reduced.matches ? period-.1 : 0);
      options.onLayout?.(w/h,mobile);
      play();
    }

    compact.addEventListener('change',build);
    reduced.addEventListener('change',build);
    document.addEventListener('ss-lang',build);
    const control = {
      show(i) { step = Math.min(scenes.length-1,Math.max(0,i)); build(); },
      pause() { paused = true; cancelAnimationFrame(frame); },
      resume() { if (paused) { paused = false; play(); } },
      destroy() {
        cancelAnimationFrame(frame);
        compact.removeEventListener('change',build);
        reduced.removeEventListener('change',build);
        document.removeEventListener('ss-lang',build);
        host.replaceChildren();
        host.classList.remove(prefix);
        delete host.__anim;
      },
      ratio() { return width()/height(); },
      step() { return step; },
    };
    host.__anim = control;
    build();
    return control;
  }

  window.SSAnim = window.SSAnim || {};
  window.SSAnim['w-ncp'] = {steps: 5, mount};
})();
