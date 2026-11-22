/* KV Cache 卸载与回读。接口同 assets/anim/rdma.js。 */
(() => {
'use strict';
const STATION = 'kvoff';
const PREFIX = 'an-kvoff';
const EN = {
  "示意，不代表实测数字": "Schematic, not measured",
  "预填充生成 K 和 V，保存在显存": "Prefill creates keys and values and stores them in GPU memory",
  "低层保存可复用块后回收原显存槽位": "Reusable blocks are copied to a lower tier before GPU slots are reclaimed",
  "匹配前缀后，命中的 KV 块读回显存": "A prefix match loads cached KV blocks into GPU memory",
  "命中的前缀回读，未命中的后续 token 由 GPU 计算": "Cached prefix blocks are retrieved and the uncached suffix is computed",
  "同一示意中回读与重算并行，分别统计到达的块": "The illustration compares retrieval and recomputation with separate delivery counts",
  "输入 token": "Input tokens",
  "GPU 预填充": "GPU prefill",
  "显存中的 KV Cache": "KV in GPU memory",
  "保存 K、V": "Stores K and V",
  "GPU 显存": "GPU memory",
  "主机内存": "Host memory",
  "本地盘或共享存储": "Local or shared store",
  "A 留在显存，B/C 槽位回收": "A stays; B/C slots freed",
  "保存副本": "Store a copy",
  "新请求的前缀": "New request prefix",
  "前缀查找": "Prefix lookup",
  "键匹配": "Key matches",
  "低层缓存": "Lower-tier cache",
  "命中后回读": "Reload on hit",
  "请求 token": "Request tokens",
  "前缀 A、B": "Prefix A, B",
  "后续 C": "Suffix C",
  "显存中的 KV": "KV in GPU memory",
  "重新预填充": "Run prefill again",
  "GPU 计算": "GPU compute",
  "已送达 0 / 3": "Delivered 0 / 3",
};
function T(label) { return window.SS_LANG === 'en' ? EN[label] ?? label : label; }

const titles = [
  "预填充生成 K 和 V，保存在显存",
  "低层保存可复用块后回收原显存槽位",
  "匹配前缀后，命中的 KV 块读回显存",
  "命中的前缀回读，未命中的后续 token 由 GPU 计算",
  "同一示意中回读与重算并行，分别统计到达的块"
];
const scenes = [
  ({box, link, send, at}) => {
    const prompt = box([[150,190,208],[180,77,220]],"输入 token",{slots:[['A','blue'],['B','blue'],['C','blue']]});
    const gpu = box([[450,190,208],[180,227,220]],"GPU 预填充",{tone:'blue'});
    const ram = box([[745,190,218],[180,379,226]],"显存中的 KV Cache",{slots:[['KV','violet'],['K','green',2200],['V','green',2500]],tone:'green'});
    send(link(prompt,gpu),350,1390);
    const out = link(gpu,ram,{color:'green'});
    send(out,1430,2170,'green');send(out,1730,2470,'green');
    at([[450,285],[250,301]],"保存 K、V",'secondary');
    return 4480;
  },
  ({box, link, send, at, timed}) => {
    const gpu = box([[160,191,212],[180,70,235]],"GPU 显存",{slots:[['A','blue'],['B','green',0,2550],['C','green',0,2550]],tone:'blue'});
    const ram = box([[450,191,202],[180,218,222]],"主机内存",{slots:[['B','green',1130],['C','green',1380]],tone:'green'});
    const disk = box([[744,191,220],[180,366,230]],"本地盘或共享存储",{slots:[['B','green',1900],['C','green',2170]],tone:'green'});
    const a = link(gpu,ram,{color:'green'}), b = link(ram,disk,{color:'green'});
    send(a,300,1100,'green');send(a,550,1350,'green');
    send(b,1270,1870,'green');send(b,1540,2140,'green');
    timed(at([[160,260],[180,432]],"A 留在显存，B/C 槽位回收",'secondary'),2560);
    at([[610,124],[241,292]],"保存副本",'secondary');
    return 4600;
  },
  ({box, link, send, at}) => {
    const req = box([[149,87,208],[180,60,220]],"新请求的前缀",{slots:[['A','blue'],['B','green']]});
    const lookup = box([[450,87,228],[180,177,224]],"前缀查找",{detail:"键匹配",tone:'blue'});
    const storage = box([[450,291,228],[180,291,224]],"低层缓存",{slots:[['A','blue'],['B','green']],tone:'green'});
    const gpu = box([[750,291,216],[180,414,220]],"GPU 显存",{slots:[['A','blue',2750],['B','green',3070]],tone:'green'});
    send(link(req,lookup),290,1070);
    send(link(lookup,storage,{axis:'y',dashed:true}),1170,1750);
    const read = link(storage,gpu,{color:'green'});
    send(read,1770,2720);send(read,2090,3040,'green');
    at([[604,214],[247,354]],"命中后回读",'secondary');
    return 4600;
  },
  ({box, link, send}) => {
    const req = box([[135,191,187],[180,53,219]],"请求 token",{slots:[['A','blue'],['B','blue'],['C','violet']]});
    const cache = box([[449,93,202],[94,233,158]],"低层缓存",{detail:"前缀 A、B",tone:'green'});
    const compute = box([[449,284,202],[266,233,158]],"GPU 预填充",{detail:"后续 C",tone:'violet'});
    const gpu = box([[761,191,197],[180,398,226]],"显存中的 KV",{slots:[['A','blue',2220],['B','blue',2500],['C','violet',3060]],tone:'green'});
    send(link(req,cache,{axis:['x','y'],offset:-13,bend:-12,color:'green'}),320,1220,'green');
    send(link(req,compute,{axis:['x','y'],offset:13,bend:12,color:'violet'}),320,1320,'violet');
    const read = link(cache,gpu,{axis:['x','y'],offset:-14,bend:-13,color:'green'});
    send(read,1260,2190,'green');send(read,1540,2470,'green');
    send(link(compute,gpu,{axis:['x','y'],offset:14,bend:13,color:'violet'}),1820,3030,'violet');
    return 4600;
  },
  ({box, link, send, at, elements}) => {
    const paths = [
      {title:"命中后回读", sub:"低层缓存", tone:'green', d:102,m:113, start:[330,600,870], end:[1260,1530,1800]},
      {title:"重新预填充",sub:"GPU 计算",tone:'rose',d:268,m:324,start:[330,840,1350],end:[2530,3040,3550]}
    ];
    paths.forEach(({title,sub,tone,d,m,start,end}) => {
      at([[157,d-62],[91,m-62]],title,'title');
      const src = box([[157,d,218],[91,m,154]],sub,{tone});
      const dst = box([[735,d,210],[269,m,154]],"显存中的 KV",{slots:end.map((t,i)=>[String(i+1),tone,t,5200]),tone});
      const path = link(src,dst,{color:tone});
      end.forEach((arrival,i)=>send(path,start[i],arrival,tone));
      const counter = at([[735,d+64],[269,m+63]],"已送达 0 / 3",'counter');
      elements.push(t => {counter.textContent = T("已送达 0 / 3").replace('0',end.filter(x=>t>=x).length);});
    });
    return 5200;
  }
];

const SIZE = [[900, 388], [360, 482]];
let serial = 0;

function mount(host, opts = {}) {
  const NS = 'http://www.w3.org/2000/svg';
  const screen = matchMedia('(max-width: 640px)');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const svg = document.createElementNS(NS, 'svg');
  const markerPrefix = PREFIX + '-' + ++serial;
  svg.setAttribute('class', PREFIX);
  svg.setAttribute('role', 'img');
  host.replaceChildren(svg);
  let current = 0, frame = 0, last = 0, elapsed = 0;
  let paused = !!opts.paused, paint, duration;

  function langChanged() {
    build();
  }

  function play(now) {
    frame = 0;
    elapsed += last ? Math.max(0, now - last) : 0;
    last = now;
    const t = elapsed % duration;
    paint(t, Math.min(1, t / 320, (duration - t) / 320));
    frame = requestAnimationFrame(play);
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  }

  function run() {
    if (!paused && !motion.matches && !frame) frame = requestAnimationFrame(play);
  }

  function build() {
    stop();
    elapsed = 0;
    const mobile = screen.matches;
    const [width, height] = SIZE[+mobile];
    const use = pair => pair[+mobile];
    const elements = [];
    const fades = [];
    const glyph = (parent, name, attrs = {}, cls) => {
      const el = document.createElementNS(NS, name);
      for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
      if (cls) el.setAttribute('class', PREFIX + '-' + cls.split(' ').join(' ' + PREFIX + '-'));
      parent.append(el);
      return el;
    };
    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('aria-label', T(titles[current]));
    const defs = glyph(svg, 'defs');
    const lines = glyph(svg, 'g');
    const nodes = glyph(svg, 'g');
    const traffic = glyph(svg, 'g');
    const overlay = glyph(svg, 'g');
    for (const tone of ['neutral', 'ink', 'blue', 'green', 'rose', 'gold', 'violet']) {
      const marker = glyph(defs, 'marker', {id: markerPrefix + '-' + tone, markerWidth: 9, markerHeight: 10,
        refX: 8, refY: 5, orient: 'auto', markerUnits: 'userSpaceOnUse'});
      glyph(marker, 'path', {d: 'M 1 1 L 8 5 L 1 9'}, 'arrow ' + tone);
    }
    function text(parent, x, y, value, cls = 'label', anchor = 'middle') {
      const el = glyph(parent, 'text', {x, y, 'text-anchor': anchor}, cls);
      el.textContent = T(value);
      return el;
    }
    function at(pair, value, cls, anchor) {
      return text(overlay, ...use(pair), value, cls, anchor);
    }
    function timed(el, start, end = Infinity) {
      fades.push(t => { el.style.opacity = Math.min(1, Math.max(0, (t - start) / 170), Math.max(0, (end - t) / 170)); });
    }
    function box(pair, title, {detail, tone = 'neutral', slots = [], h, w} = {}) {
      const [x, y, bw] = use(pair);
      const size = w ?? bw ?? (mobile ? 212 : 208);
      const tall = h ?? (detail || slots.length ? 76 : 54);
      const left = x - size / 2, top = y - tall / 2;
      const group = glyph(nodes, 'g', {}, 'node');
      glyph(group, 'rect', {x: left, y: top, width: size, height: tall, rx: 5}, 'box ' + tone);
      text(group, x, detail || slots.length ? top + 21 : y, title, 'title');
      if (detail) text(group, x, top + 51, detail, 'secondary');
      const gap = 5;
      const cellW = Math.min(35, (size - 14 - gap * (slots.length - 1)) / slots.length);
      const cells = slots.map((slot, i) => {
        const [key, color = 'blue', start, end] = typeof slot === 'string' ? [slot] : slot;
        const cx = x + (i - (slots.length - 1) / 2) * (cellW + gap);
        const cy = top + 51;
        glyph(group, 'rect', {x: cx-cellW/2, y: cy-13, width: cellW, height: 26, rx: 3}, 'cell');
        const g = glyph(group, 'g');
        glyph(g, 'rect', {x: cx-cellW/2, y: cy-13, width: cellW, height: 26, rx: 3}, 'tile ' + color);
        if (key) text(g, cx, cy, key, 'chip');
        if (start !== undefined || end !== undefined) timed(g, start ?? -170, end);
        return g;
      });
      return {x, y, left, right: left + size, top, bottom: top + tall, cells};
    }
    function link(a, b, {axis, color = 'blue', arrow = true, offset = 0, bend = 0, dashed = false, via} = {}) {
      const horizontal = (Array.isArray(axis) ? use(axis) : axis) === 'x' ||
        (!axis && Math.abs(b.x-a.x) > Math.abs(b.y-a.y));
      const [ax, ay, bx, by] = horizontal
        ? [b.x>a.x ? a.right : a.left, a.y+offset, b.x>a.x ? b.left : b.right, b.y+offset]
        : [a.x+offset, b.y>a.y ? a.bottom : a.top, b.x+offset, b.y>a.y ? b.top : b.bottom];
      const mid = horizontal ? (ax+bx)/2+bend : (ay+by)/2+bend;
      const points = via ? use(via) : horizontal ? [[ax, ay], [mid, ay], [mid, by], [bx, by]]
        : [[ax, ay], [ax, mid], [bx, mid], [bx, by]];
      const d = points.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ');
      const path = glyph(lines, 'path', {d}, 'line ' + color + (dashed ? ' dashed' : ''));
      if (arrow) path.setAttribute('marker-end', `url(#${markerPrefix}-${color})`);
      return path;
    }
    function send(line, start, end, color = 'blue') {
      const packet = glyph(traffic, 'rect', {x: -8, y: -5, width: 16, height: 10, rx: 2}, 'packet ' + color);
      const length = line.getTotalLength();
      elements.push(t => {
        const u = Math.max(0, Math.min(1, (t - start) / (end - start)));
        const p = line.getPointAtLength(Math.max(0, length - 6) * u);
        packet.setAttribute('transform', `translate(${p.x} ${p.y})`);
        packet.style.opacity = Math.min(1, Math.max(0, (t - start) / 130), Math.max(0, (end + 220 - t) / 130));
      });
    }

    duration = scenes[current]({mobile, box, link, send, at, timed, glyph, overlay, elements});
    text(overlay, width / 2, height - 17, '示意，不代表实测数字', 'note');
    paint = (t, opacity) => {
      traffic.style.opacity = opacity;
      overlay.querySelectorAll('.' + PREFIX + '-counter').forEach(el => { el.style.opacity = opacity; });
      elements.forEach(draw => draw(t));
      fades.forEach(draw => draw(t));
    };
    paint(motion.matches ? duration - 420 : 0, motion.matches ? 1 : 0);
    opts.onLayout?.(width / height, mobile);
    run();
  }

  const ctl = {
    show(i) { current = Math.max(0, Math.min(scenes.length - 1, i)); build(); },
    pause() { paused = true; stop(); },
    resume() { paused = false; run(); },
    destroy() {
      ctl.pause();
      screen.removeEventListener('change', build);
      motion.removeEventListener('change', build);
      document.removeEventListener('ss-lang', langChanged);
      svg.remove();
      if (host.__anim === ctl) delete host.__anim;
    },
    ratio() { const [w, h] = SIZE[+screen.matches]; return w / h; },
    step() { return current; }
  };
  host.__anim = ctl;
  screen.addEventListener('change', build);
  motion.addEventListener('change', build);
  document.addEventListener('ss-lang', langChanged);
  build();
  return ctl;
}

window.SSAnim = window.SSAnim || {};
window.SSAnim[STATION] = {steps: scenes.length, mount};
})();
