(function () {
  const id = 'w-pod';
  const prefix = 'ssa-w-pod';

  function mount(host, options = {}) {
    const compact = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const ns = 'http://www.w3.org/2000/svg';
    const cls = name => prefix + '-' + name;
    const svg = document.createElementNS(ns, 'svg');
    const width = () => compact.matches ? 350 : 900;
    const height = () => compact.matches ? 350 : 340;
    const T = (...pair) => window.SS.T(pair);
    const period = 3.6;
    let routes = [], labels = [], step = 0, frame = 0, elapsed = 0, last = 0;
    let paused = Boolean(options.paused);
    let layer;
    host.classList.add(prefix);
    host.replaceChildren(svg);
    svg.setAttribute('role', 'img');

    function make(tag, attrs, parent = svg) {
      const el = document.createElementNS(ns, tag);
      for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
      parent.append(el);
      return el;
    }

    function text(x, y, value, {anchor = 'middle', style = 'label'} = {}) {
      make('text', {x, y, 'text-anchor': anchor, class: cls(style)}).textContent = value;
      labels.push(value);
    }

    function box(x, y, w, h, style = 'part') {
      make('rect', {x, y, width: w, height: h, rx: 4, class: cls(style)});
    }

    function wire(d) {
      return make('path', {d, class: cls('wire')});
    }

    function transfer(d, {start = .2, duration = 1.65, bulk = false} = {}) {
      const path = wire(d);
      const length = path.getTotalLength();
      const shape = bulk ? {x: -5, y: -4, width: 10, height: 8, rx: 1} : {r: 4};
      const packet = make(bulk ? 'rect' : 'circle', {...shape, class: cls('packet')}, layer);
      routes.push({path, length, packet, start, duration});
    }

    function serverNodes(center, y, count, spacing) {
      const centers = Array.from({length: count}, (_, i) => center + (i - (count - 1)/2)*spacing);
      for (const x of centers) {
        box(x - 19, y, 38, 22);
        make('path', {d: `M${x-11} ${y+8}h14 m-14 6h20`, class: cls('wire')});
      }
      return centers;
    }

    function driveBays(center, top, rows) {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < 14; col++) {
          make('rect', {
            x: center - 118 + col*17, y: top + row*9, width: 15, height: 7,
            rx: 1, class: cls('slot'),
          });
        }
      }
    }

    function overview(mobile) {
      if (mobile) {
        box(72, 13, 206, 40);
        box(12, 113, 326, 210, 'frame');
        text(175, 33, T('GPU 客户端', 'GPU Clients'));
        text(230, 83, T('存储网络', 'Storage Network'), {anchor: 'end'});
        text(27, 133, T('2U 存储机箱', '2U Storage Chassis'), {anchor: 'start', style: 'heading'});
        box(70, 156, 210, 51);
        text(175, 173, 'NeuralMesh');
        text(175, 192, T('存储节点', 'Storage Nodes'), {style: 'detail'});
        text(192, 229, 'PCIe Gen 6', {anchor: 'start', style: 'detail'});
        box(70, 254, 210, 48);
        text(175, 278, 'NVMe SSD');
        transfer('M175 254 V207', {duration: .65});
        transfer('M245 156 V53', {start: .95, duration: 1});
      } else {
        box(37, 143, 143, 76);
        box(322, 76, 544, 215, 'frame');
        text(108, 181, T('GPU 客户端', 'GPU Clients'));
        text(251, 158, T('存储网络', 'Storage Network'), {style: 'detail'});
        text(342, 102, T('2U 存储机箱', '2U Storage Chassis'), {anchor: 'start', style: 'heading'});
        box(352, 143, 185, 76);
        text(444, 168, 'NeuralMesh');
        text(444, 194, T('存储节点', 'Storage Nodes'), {style: 'detail'});
        text(618, 158, 'PCIe Gen 6', {style: 'detail'});
        box(698, 143, 138, 76);
        text(767, 181, 'NVMe SSD');
        transfer('M698 181 H537', {duration: .85});
        transfer('M352 181 H180', {start: 1.15, duration: .85});
      }
    }

    function hardware(mobile, max) {
      const center = width()/2;
      const x = mobile ? 12 : 115;
      const top = mobile ? 24 : 31;
      const bottom = mobile ? 316 : 301;
      const nodeTop = mobile ? 97 : 96;
      const bus = mobile ? 164 : 154;
      const bayTop = mobile ? 219 : 204;
      box(x, top, width() - 2*x, bottom - top, 'frame');
      text(x + 17, top + 22, max ? 'Prime Max' : 'Nitro', {anchor: 'start', style: 'heading'});
      text(width() - x - 17, top + 22, '2U', {anchor: 'end', style: 'detail'});
      text(center, nodeTop - 15, max ? T('两个存储节点', 'Two Storage Nodes') : T('四个存储节点', 'Four Storage Nodes'));
      const nodes = serverNodes(center, nodeTop, max ? 2 : 4, mobile ? 56 : 76);
      for (const node of nodes) transfer(`M${center} ${bayTop} V${bus} H${node} V${nodeTop+22}`);
      text(center + 15, bus + 18, 'PCIe Gen 6', {anchor: 'start', style: 'detail'});
      driveBays(center, bayTop, max ? 5 : 4);
      text(center, bayTop + (max ? 68 : 60),
        max ? T('70 个盘位 · QLC／TLC 选项', '70 Slots · QLC / TLC Options')
          : T('56 个盘位 · 全 TLC', '56 Slots · All TLC'));
    }

    function placement(mobile) {
      const center = width()/2;
      const left = mobile ? 94 : 240;
      const right = width() - left;
      const w = mobile ? 144 : 246;
      const destY = mobile ? 238 : 228;
      const x = mobile ? 12 : 102;
      box(x, 22, width() - 2*x, mobile ? 300 : 291, 'frame');
      text(width() - x - 15, 41, '2U', {anchor: 'end', style: 'detail'});
      text(center, 47, T('Prime · 四个存储节点', 'Prime · Four Storage Nodes'), {style: 'heading'});
      const nodes = serverNodes(center, 67, 4, mobile ? 56 : 76);
      const nsWidth = mobile ? 226 : 280;
      box(center - nsWidth/2, 112, nsWidth, 63);
      text(center, 131, T('统一命名空间', 'Shared Namespace'));
      text(center, 155, 'AlloyFlash', {style: 'detail'});
      for (const node of nodes) wire(`M${node} 89 V100`);
      wire(`M${nodes[0]} 100 H${nodes.at(-1)} M${center} 100 V112`);
      box(left - w/2, destY, w, 66);
      box(right - w/2, destY, w, 66);
      text(left, destY + 20, 'TLC');
      text(left, destY + 44, T('时延敏感 I/O', 'Latency-Critical I/O'), {style: 'detail'});
      text(right, destY + 20, 'QLC');
      text(right, destY + 44, T('大容量数据', 'Bulk Data'), {style: 'detail'});
      transfer(`M${center-16} 175 V199 H${left} V${destY}`);
      transfer(`M${center+16} 175 V199 H${right} V${destY}`, {start: .55, bulk: true});
    }

    function comparison(mobile) {
      const rows = [
        ['Nitro', T('吞吐优先', 'Throughput First'), T('4 节点 · 56 盘位', '4 Nodes · 56 Slots')],
        ['Prime', T('兼顾吞吐与容量', 'Throughput and Capacity'), T('4 节点 · 56 盘位', '4 Nodes · 56 Slots')],
        ['Prime Max', T('容量密度优先', 'Capacity per Rack Unit'), T('2 节点 · 70 盘位', '2 Nodes · 70 Slots')],
      ];
      const x = mobile ? 20 : 112;
      const start = mobile ? 47 : 110;
      if (!mobile) {
        text(x, 65, T('配置', 'Configuration'), {anchor: 'start', style: 'detail'});
        text(309, 65, T('主要约束', 'Primary Constraint'), {anchor: 'start', style: 'detail'});
        text(590, 65, T('2U 机箱布局', '2U Chassis Layout'), {anchor: 'start', style: 'detail'});
        wire('M112 86 H788');
      }
      for (const [i, [model, constraint, layout]] of rows.entries()) {
        const y = start + i*(mobile ? 90 : 66);
        text(x, y, model, {anchor: 'start', style: 'heading'});
        text(mobile ? x : 309, mobile ? y + 26 : y, constraint, {anchor: 'start'});
        text(mobile ? 330 : 590, mobile ? y + 26 : y, layout,
          {anchor: mobile ? 'end' : 'start', style: 'detail'});
        if (i < rows.length - 1) wire(`M${x} ${y + (mobile ? 58 : 33)} H${width()-x}`);
      }
    }

    const scenes = [overview, mobile => hardware(mobile, false), placement, mobile => hardware(mobile, true), comparison];

    function render(t, still = false) {
      for (const {path, length, packet, start, duration} of routes) {
        const u = (t - start)/duration;
        const visible = still || (u >= 0 && u <= 1.1);
        packet.style.opacity = visible ? (still ? 1 : Math.min(1, u*12, (1.1-u)*10)) : 0;
        if (visible) {
          const p = path.getPointAtLength(length*(still ? 1 : Math.min(1, u)));
          packet.setAttribute('transform', `translate(${p.x} ${p.y})`);
        }
      }
    }

    function tick(now) {
      elapsed += Math.min(.08, Math.max(0, (now - last)/1000));
      last = now;
      render(elapsed % period);
      frame = requestAnimationFrame(tick);
    }

    function play() {
      cancelAnimationFrame(frame);
      if (paused || reduced.matches || !routes.length) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }

    function build() {
      const w = width(), h = height();
      svg.replaceChildren();
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      routes = [];
      labels = [];
      layer = make('g', {'aria-hidden': 'true'});
      scenes[step](compact.matches);
      svg.append(layer);
      text(w/2, h - 14, T('示意，不代表实测数字', 'Schematic · No Measured Figures'), {style: 'note'});
      svg.setAttribute('aria-label', labels.join(' · '));
      elapsed = 0;
      render(0, reduced.matches || paused);
      options.onLayout?.(w/h, compact.matches);
      play();
    }

    compact.addEventListener('change', build);
    reduced.addEventListener('change', build);
    document.addEventListener('ss-lang', build);
    const control = {
      show(i) { step = Math.min(scenes.length - 1, Math.max(0, i)); build(); },
      pause() { paused = true; cancelAnimationFrame(frame); },
      resume() { if (paused) { paused = false; play(); } },
      destroy() {
        cancelAnimationFrame(frame);
        compact.removeEventListener('change', build);
        reduced.removeEventListener('change', build);
        document.removeEventListener('ss-lang', build);
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
  window.SSAnim[id] = {steps: 6, mount, figures: {
 "gen3": [
  [
   [
    "Nitro",
    "Nitro"
   ],
   [
    "2U，4 节点 · 56 盘位 · TLC",
    "2U, 4 nodes · 56 bays · TLC"
   ]
  ],
  [
   [
    "Prime",
    "Prime"
   ],
   [
    "2U，4 节点 · 56 盘位 · TLC + QLC",
    "2U, 4 nodes · 56 bays · TLC + QLC"
   ]
  ],
  [
   [
    "Prime Max",
    "Prime Max"
   ],
   [
    "2U，2 节点 · 70 盘位 · TLC / QLC",
    "2U, 2 nodes · 70 bays · TLC / QLC"
   ]
  ]
 ],
 "gen2": [
  [
   [
    "Nitro",
    "Nitro"
   ],
   [
    "1U · 20 块 TLC SSD",
    "1U · 20 TLC SSDs"
   ]
  ],
  [
   [
    "Prime 1U",
    "Prime 1U"
   ],
   [
    "最多 20 块 SSD",
    "Up to 20 SSDs"
   ]
  ],
  [
   [
    "Prime 2U",
    "Prime 2U"
   ],
   [
    "最多 40 块 SSD",
    "Up to 40 SSDs"
   ]
  ]
 ],
 "gen1": [
  [
   [
    "Prime 160",
    "Prime 160"
   ],
   [
    "1U · 10 × 2.5-inch NVMe",
    "1U · 10 × 2.5-inch NVMe"
   ]
  ],
  [
   [
    "Nitro 155E / 155 / 175",
    "Nitro 155E / 155 / 175"
   ],
   [
    "1U · 14 × E3.S NVMe",
    "1U · 14 × E3.S NVMe"
   ]
  ]
 ]
}};
})();
