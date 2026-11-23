(function () {
  const prefix = 'ssa-w-nfssmb';
  const scenes = [
    {"layout":"split","nodes":[[["NFS 客户端","NFS Client"],["标准文件访问","File Access"],"",""],[["SMB 客户端","SMB Client"],["标准文件访问","File Access"],"",""],[["NFS 容器","NFS Container"],["NFS 协议","NFS Protocol"],"",""],[["SMB 容器","SMB Container"],["SMB 协议","SMB Protocol"],"",""],[["文件系统","Filesystem"],["集群存储","Cluster Storage"],"",""]],"routes":[[0,2,0,1],[1,3,0,1],[2,4,1.1,1],[3,4,1.44,1]]},
    {"nodes":[[["NFS 客户端","NFS Client"],["标准文件访问","File Access"],"",""],[["NFS 容器","NFS Container"],["IP · DNS · 网络组","IP · DNS · Netgroup"],"",""],[["NFS 导出","NFS Export"],["/datasets","/datasets"],"store","G"]],"routes":[[0,1,0,1,"control"],[1,2,1.4,1]],"states":[[1,1,"访问获准|Client Allowed","on"]]},
    {"layout":"side","nodes":[[["SMB 客户端","SMB Client"],["标准文件访问","File Access"],"",""],[["SMB-W","SMB-W"],["身份映射","Identity Mapping"],"",""],[["SMB 共享","SMB Share"],["/datasets","/datasets"],"store","G"],[["Active Directory","Active Directory"],["用户与组","Users and Groups"],"",""]],"routes":[[0,1,0,0.8,"control"],[1,3,0.8,0.6,"control"],[3,1,1.4,0.6,"signal"],[1,2,2.1,1.05]],"states":[[1,2,"身份已映射|Identity Mapped","on"]]},
    {"layout":"split","nodes":[[["现有后端服务器","Backend Server"],["部署位置","Placement"],"",""],[["专用服务器","Dedicated Server"],["部署位置","Placement"],"",""],[["协议容器","Protocol Container"],["在后端运行","On Backend"],"",""],[["协议容器","Protocol Container"],["在专用机运行","On Dedicated Host"],"",""],[["文件系统","Filesystem"],["集群存储","Cluster Storage"],"",""]],"routes":[[0,2,0,0.85,"control"],[1,3,0,0.85,"control"],[2,4,0.95,1.2],[3,4,1.2,1.2]]},
    {"layout":"split","nodes":[[["NFS 客户端","NFS Client"],["标准文件访问","File Access"],"",""],[["SMB 客户端","SMB Client"],["标准文件访问","File Access"],"",""],[["NFS 容器","NFS Container"],["NFS 协议","NFS Protocol"],"",""],[["SMB 容器","SMB Container"],["SMB 协议","SMB Protocol"],"",""],[["同一文件","One File"],["/datasets/run.json","/datasets/run.json"],"","G"]],"routes":[[4,2,0,1],[4,3,0.12,1],[2,0,1,1],[3,1,1.12,1]],"states":[[0,2,"NFS 文件访问|NFS File Access","on","G"],[1,2.12,"SMB 文件访问|SMB File Access","on","G"]]}
  ];

  function layout(scene, mobile) {
    const width = mobile ? 360 : 880;
    const height = mobile ? 410 : 310;
    const h = mobile ? 61 : 82;
    let positions;
    let widths;
    if (scene.layout === 'split') {
      positions = mobile
        ? [[90,57],[270,57],[90,175],[270,175],[180,319]]
        : [[116,93],[116,217],[407,93],[407,217],[727,155]];
      widths = mobile ? [156,156,156,156,232] : [196,196,208,208,246];
    } else if (scene.layout === 'options') {
      positions = mobile
        ? [[180,47],[211,134],[211,228],[211,322]]
        : [[183,155],[650,54],[650,154],[650,254]];
      widths = mobile ? [252,222,222,222] : [254,278,278,278];
    } else if (scene.layout === 'side') {
      if (scene.nodes.length === 3) {
        positions = mobile ? [[180,57],[90,185],[270,185]] : [[183,108],[440,108],[440,233]];
      } else {
        positions = mobile ? [[180,55],[90,181],[180,316],[270,181]] : [[169,104],[440,104],[711,104],[440,233]];
      }
      widths = mobile ? [236,154,scene.nodes.length === 3 ? 154 : 236,154] : [226,226,226,226];
    } else {
      const n = scene.nodes.length;
      positions = scene.nodes.map((_, i) => mobile
        ? [180, n === 4 ? 47 + i * 98 : 53 + i * 133]
        : [width * (i + .5) / n, 135]);
      widths = scene.nodes.map(() => mobile ? 252 : n === 4 ? 174 : 224);
    }
    return {width, height, boxes: positions.map(([x,y], i) => ({x,y,w:widths[i],h}))};
  }

  function mount(host, opts = {}) {
    const ns = 'http://www.w3.org/2000/svg';
    const mq = matchMedia('(max-width: 640px)');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('role', 'img');
    host.classList.add(prefix);
    host.replaceChildren(svg);
    let step = 0, width, height, routes, cards, states, period;
    let paused = !!opts.paused, alternatives = false, raf = 0, elapsed = 0, last = 0;

    function el(tag, attrs, parent = svg) {
      const node = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
      parent.append(node);
      return node;
    }

    function cls(name) {
      return prefix + '-' + name;
    }

    function pathPoints(a, b, outer, paired, mobile, options) {
      if (options) {
        const side = mobile ? -1 : 1;
        const rail = mobile ? 47 : 415;
        return [[a.x + side * a.w/2,a.y],[rail,a.y],[rail,b.y],[b.x - b.w/2,b.y]];
      }
      if (outer) {
        return mobile
          ? [[a.x-a.w/2,a.y],[28,a.y],[28,b.y],[b.x-b.w/2,b.y]]
          : [[a.x,a.y+a.h/2],[a.x,231],[b.x,231],[b.x,b.y+b.h/2]];
      }
      const dx = b.x-a.x, dy = b.y-a.y;
      const shift = paired ? 8 : 0;
      if (dx && (!mobile || !dy)) {
        const sx = a.x+Math.sign(dx)*a.w/2, ex = b.x-Math.sign(dx)*b.w/2;
        const sy = a.y+Math.sign(dx)*shift, ey = b.y+Math.sign(dx)*shift;
        return [[sx,sy],[(sx+ex)/2,sy],[(sx+ex)/2,ey],[ex,ey]];
      }
      const sy = a.y+Math.sign(dy)*a.h/2, ey = b.y-Math.sign(dy)*b.h/2;
      const sx = a.x+Math.sign(dy)*shift, ex = b.x+Math.sign(dy)*shift;
      return [[sx,sy],[sx,(sy+ey)/2],[ex,(sy+ey)/2],[ex,ey]];
    }

    function render(time) {
      routes.forEach(({trace, arrow, packet, length, start, end}) => {
        const active = start <= time && time < end;
        const done = time >= end && (!alternatives || motion.matches || time < end+.35);
        trace.classList.toggle(cls('done'), done || active);
        arrow.classList.toggle(cls('done'), done || active);
        packet.style.opacity = active ? 1 : 0;
        if (active) {
          const p = trace.getPointAtLength(length * (time-start)/(end-start));
          packet.setAttribute('transform', 'translate(' + p.x + ' ' + p.y + ')');
        }
      });
      cards.forEach((card, i) => {
        if (!card) return;
        const state = states[i].findLast(item => item[0] <= time);
        if (state === card.state) return;
        card.state = state;
        const detail = state ? state[1] : card.detail;
        const tone = state ? state[2] : '';
        const blocks = state && state[3] !== undefined ? state[3] : card.blocks;
        if (card.text.textContent !== detail) card.text.textContent = detail;
        card.group.setAttribute('data-state', tone);
        for (let j = 0; j < card.chips.length; j++) {
          card.chips[j].setAttribute('data-color', blocks[j] || '');
        }
      });
    }

    function loop(now) {
      elapsed += Math.min(.08, Math.max(0, (now-last)/1000));
      last = now;
      render(elapsed % period);
      raf = requestAnimationFrame(loop);
    }

    function start() {
      cancelAnimationFrame(raf);
      if (paused || motion.matches) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }

    function build() {
      cancelAnimationFrame(raf);
      const scene = scenes[step], mobile = mq.matches;
      const lang = window.SS_LANG === 'en' ? 1 : 0;
      const {width: w, height: h, boxes} = layout(scene, mobile);
      width = w;
      height = h;
      alternatives = scene.layout === 'options';
      const note = ['示意，不代表实测数字','Schematic · No Measured Figures'][lang];
      svg.replaceChildren();
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      svg.setAttribute('data-step', step+1);
      svg.setAttribute('aria-label', scene.nodes.filter(Boolean).map(n => n[0][lang] + ' · ' + n[1][lang]).join(' / ') + (lang ? '. ' : '。') + note);
      const wires = el('g', {});
      const components = el('g', {});
      const traffic = el('g', {});
      routes = scene.routes.map(([from,to,delay,duration,kind = 'data',outer]) => {
        const reverse = scene.routes.some(([a,b]) => a === to && b === from);
        const points = pathPoints(boxes[from],boxes[to],outer,reverse,mobile,scene.layout === 'options');
        const trace = el('path', {d: 'M' + points.map(p => p.join(' ')).join(' L'), class:cls('wire'), 'data-kind':kind}, wires);
        const length = trace.getTotalLength();
        const tip = trace.getPointAtLength(length - 2);
        const behind = trace.getPointAtLength(length - 9);
        const angle = Math.atan2(tip.y-behind.y,tip.x-behind.x)*180/Math.PI;
        const arrow = el('path', {d:'M-5 -3 L0 0 L-5 3 Z',transform:'translate(' + tip.x + ' ' + tip.y + ') rotate(' + angle + ')',class:cls('arrow'),'data-kind':kind}, traffic);
        const packet = el('rect', {x:-6,y:-4,width:12,height:8,rx:2,class:cls('packet'),'data-kind':kind}, traffic);
        return {trace,arrow,packet,length,start:delay,end:delay+duration};
      });

      cards = scene.nodes.map((node, i) => {
        if (!node) return null;
        const [label, detail, tone, blocks] = node;
        const {x,y,w,h} = boxes[i];
        const group = el('g', {class:cls('card'),'data-tone':tone}, components);
        el('rect', {x:x-w/2,y:y-h/2,width:w,height:h,rx:5,class:cls('body')}, group);
        el('text', {x,y:y-(mobile?12:16),class:cls('label')}, group).textContent = label[lang];
        const text = el('text', {x,y:y+(mobile?9:10),class:cls('detail')}, group);
        const chips = [-15,0,15].map(dx => el('rect',{x:x+dx-5,y:y+(mobile?19:24),width:10,height:7,rx:1.6,class:cls('chip')},group));
        return {group,text,chips,detail:detail[lang],blocks,state:null};
      });
      states = scene.nodes.map((_, i) => (scene.states || []).filter(item => item[0] === i).map(([,at,label,tone,blocks]) => [
        at, label.split('|')[lang], tone, blocks,
      ]));
      el('text', {x:w/2,y:h-19,class:cls('note')}).textContent = note;
      period = scene.period || Math.max(...routes.map(route => route.end)) + 1.15;
      elapsed = 0;
      render(motion.matches ? period-.1 : 0);
      if (opts.onLayout) opts.onLayout(width/height, mobile);
      start();
    }

    mq.addEventListener('change', build);
    motion.addEventListener('change', build);
    document.addEventListener('ss-lang', build);
    const ctrl = {
      show(i) { step = Math.max(0, Math.min(scenes.length-1, i)); build(); },
      pause() { paused = true; cancelAnimationFrame(raf); },
      resume() { if (paused) { paused = false; start(); } },
      destroy() {
        cancelAnimationFrame(raf);
        mq.removeEventListener('change', build);
        motion.removeEventListener('change', build);
        document.removeEventListener('ss-lang', build);
        host.replaceChildren();
        host.classList.remove(prefix);
        delete host.__anim;
      },
      ratio() { return width/height; },
      step() { return step; },
    };
    host.__anim = ctrl;
    build();
    return ctrl;
  }

  window.SSAnim = window.SSAnim || {};
  window.SSAnim['w-nfssmb'] = {steps:5,mount};
})();
