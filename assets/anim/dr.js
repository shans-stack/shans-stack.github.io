/* 数据缩减：压缩与去重。接口同 assets/anim/rdma.js。 */
(() => {
'use strict';
const STATION = 'dr';
const PREFIX = 'an-dr';
const EN = {
  "示意，不代表实测数字": "Schematic, not measured",
  "压缩缩短表示，去重共享相同数据": "Compression shortens representations and deduplication shares identical data",
  "编码保存值与次数，解码还原每个字节": "Encoding stores a value and count, and decoding restores the bytes",
  "两个文件的引用指向同一个 A 块": "References from two files point to one copy of chunk A",
  "索引命中复用旧块，未命中新块压缩后落盘": "Hits reuse existing chunks and new chunks are compressed before storage",
  "数据重复性改变实际写入量": "Repetition changes the amount of data written",
  "逻辑输入": "Logical input",
  "压缩：较短的表示": "Compression",
  "去重：同一块供引用": "Deduplication: shared chunk",
  "编码重复模式": "Encode patterns",
  "合并相同数据": "Share identical data",
  "原始字节": "Original bytes",
  "值与重复次数": "Value + count",
  "解码结果": "Decoded bytes",
  "编码": "Encode",
  "解码": "Decode",
  "文件 1": "File 1",
  "文件 2": "File 2",
  "两份引用，共用 A": "One A, two references",
  "B 与 C 各自存储": "B and C stored separately",
  "输入块": "Input chunks",
  "指纹索引": "Fingerprint index",
  "压缩新块": "Compress chunk",
  "存储空间": "Stored chunks",
  "复用 A": "Reuse A",
  "命中": "Hit",
  "未命中": "Miss",
  "高度重复": "High repetition",
  "占用较低": "Lower usage",
  "各块不同": "No repeated chunks",
  "占用升高": "Higher usage",
  "唯一块": "Unique chunks",
};
function T(label) { return window.SS_LANG === 'en' ? EN[label] ?? label : label; }

const titles = [
  "压缩缩短表示，去重共享相同数据",
  "编码保存值与次数，解码还原每个字节",
  "两个文件的引用指向同一个 A 块",
  "索引命中复用旧块，未命中新块压缩后落盘",
  "数据重复性改变实际写入量"
];
const scenes = [
  ({box, link, send, at}) => {
    const logic = box([[168,191,231],[180,61,234]], "逻辑输入", {slots:[['A','blue'],['A','blue'],['A','blue'],['A','blue']]});
    const compressed = box([[724,98,258],[180,230,236]], "压缩：较短的表示", {slots:[['A','green',1820],['4','gold',1820]],tone:'green'});
    const dedup = box([[724,289,258],[180,385,236]], "去重：同一块供引用", {slots:[['A','violet',2100]],tone:'violet'});
    const a = link(logic,compressed,{axis:['x','y'],color:'green',bend:-20,offset:17});
    const b = link(logic,dedup,{axis:['x','y'],color:'violet',via:[[[283.5,211],[480,211],[480,289],[595,289]],[[63,61],[32,61],[32,385],[62,385]]]});
    send(a,350,1780,'green');send(b,510,2060,'violet');
    at([[464,66],[265,148]],"编码重复模式",'secondary');
    at([[464,326],[250,313]],"合并相同数据",'secondary');
    return 4400;
  },
  ({box, link, send, at}) => {
    const src = box([[150,191,200],[180,72,226]],"原始字节",{slots:[['A','blue'],['A','blue'],['A','blue'],['A','blue']]});
    const coded = box([[450,191,195],[180,225,226]],"值与重复次数",{slots:[['A','green',1470],['4','gold',1470]],tone:'green'});
    const result = box([[750,191,200],[180,377,226]],"解码结果",{slots:Array.from({length:4},(_,i)=>['A','blue',2560+i*100])});
    send(link(src,coded,{color:'green'}),430,1440,'green');
    send(link(coded,result),1590,2540);
    at([[300,157],[218,147]],"编码",'secondary');
    at([[600,157],[218,301]],"解码",'secondary');
    return 4300;
  },
  ({box, link, send}) => {
    const first = box([[153,103,200],[93,73,149]], "文件 1",{slots:[['A','blue'],['B','green']]});
    const second = box([[153,273,200],[267,73,149]], "文件 2",{slots:[['A','blue'],['C','violet']]});
    const shared = box([[708,147,243],[180,259,230]], "两份引用，共用 A",{slots:[['A','blue']],tone:'blue'});
    box([[708,295,243],[180,383,230]], "B 与 C 各自存储",{slots:[['B','green'],['C','violet']]});
    send(link(first,shared,{axis:['x','y'],offset:-17,bend:-17}),410,1980);
    send(link(second,shared,{axis:['x','y'],offset:17,bend:17}),680,2240);
    return 4360;
  },
  ({box, link, send, at}) => {
    const input = box([[118,171,185],[180,47,195]],"输入块",{slots:[['A','blue'],['B','violet']]});
    const index = box([[356,171,192],[180,160,225]],"指纹索引",{tone:'blue'});
    const encoder = box([[624,272,179],[251,278,174]],"压缩新块",{tone:'violet'});
    const stored = box([[782,138,182],[223,408,210]],"存储空间",{slots:[['A','blue'],['B','violet',2670]],tone:'green'});
    const ref = box([[612,59,175],[78,267,138]],"复用 A",{tone:'green'});
    const inPath = link(input,index);
    send(inPath,320,990);send(inPath,570,1220,'violet');
    send(link(index,ref,{axis:['x','y'],offset:-12,bend:-13,color:'green'}),1070,1910,'green');
    send(link(index,encoder,{axis:['x','y'],offset:14,bend:13,color:'violet'}),1310,2020,'violet');
    send(link(encoder,stored,{axis:'y',offset:5,color:'violet'}),2050,2640,'violet');
    at([[491,33],[34,205]],"命中",'secondary');
    at([[495,303],[287,213]],"未命中",'secondary');
    return 4600;
  },
  ({box, link, send, at, overlay, glyph, elements, mobile}) => {
    const examples = [
      {title:"高度重复", input:['A','A','A','A'], stored:['A'], color:'green', d:110, m:124, level:"占用较低"},
      {title:"各块不同", input:['A','B','C','D'], stored:['A','B','C','D'], color:'rose', d:273, m:339, level:"占用升高"}
    ];
    examples.forEach(({title,input,stored,color,d,m,level}) => {
      at([[215,d-62],[91,m-63]],title,'title');
      const src = box([[215,d,228],[91,m,154]],"输入块",{slots:input.map(k=>[k,'blue'])});
      const disk = box([[676,d,240],[269,m,154]],"唯一块",{slots:input.map((_,i)=>stored[i] ? [stored[i],color,1320+i*330] : ['', 'neutral']),tone:color});
      const route = link(src,disk,{color});
      stored.forEach((_,i)=>send(route,330+i*330,1300+i*330,color));
      const w = mobile ? 140 : 204;
      const x = (mobile ? 269 : 676) - w/2;
      const y = (mobile ? m : d) + 50;
      glyph(overlay,'rect',{x,y,width:w,height:8,rx:2},'cell');
      const fill = glyph(overlay,'rect',{x,y,width:0,height:8,rx:2},'packet '+color);
      elements.push(t => fill.setAttribute('width', w*stored.filter((_,i)=>t>=1300+i*330).length/input.length));
      at([[676,d+75],[269,m+74]],level,'secondary');
    });
    return 4350;
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
