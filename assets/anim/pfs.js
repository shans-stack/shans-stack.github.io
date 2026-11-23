/* 并行文件系统：共享路径与并行读写。接口同 assets/anim/rdma.js。 */
(() => {
'use strict';
const STATION = 'pfs';
const PREFIX = 'an-pfs';
const EN = {
  "大文件读取缓冲区": "Large File Read Buffer",
  "小文件读取缓冲区": "Small File Read Buffer",
  "本次读 3 个 OST": "Read from 3 OSTs",
  "本次读 1 个 OST": "Read from 1 OST",
  "示意，不代表实测数字": "Schematic, not measured",
  "两个计算节点访问同一个文件路径": "Two compute nodes access the same file path",
  "打开请求返回文件的数据布局": "A file open returns the data layout",
  "文件的四个区间按顺序分配到三个目标": "Four file ranges map to three targets in sequence",
  "客户端在不同的数据路径上并行读取": "The client reads in parallel over separate data paths",
  "客户端按偏移而非到达顺序组装文件": "The client assembles file data by offset",
  "小文件和大文件可覆盖不同数量的目标": "Small and large files can span different numbers of targets",
  "计算节点 A": "Compute node A",
  "计算节点 B": "Compute node B",
  "共享命名空间": "Shared namespace",
  "挂载同一文件系统": "Same file system",
  "客户端": "Client",
  "元数据服务器（MDS）": "Metadata server (MDS)",
  "返回目标和条带布局": "Returns targets and stripes",
  "数据服务器": "Data servers",
  "等待数据请求": "Await data requests",
  "打开请求": "Open request",
  "文件布局": "File layout",
  "文件区间": "File ranges",
  "目标 1": "Target 1",
  "目标 2": "Target 2",
  "目标 3": "Target 3",
  "元数据服务器": "Metadata server",
  "布局已返回": "Layout already returned",
  "按偏移排列的读取缓冲区": "Read buffer in offset order",
  "到达顺序：B、C、A": "Arrival order: B, C, A",
  "大文件": "Large file",
  "小文件": "Small file",
};
function T(label) { return window.SS_LANG === 'en' ? EN[label] ?? label : label; }

const titles = [
  "两个计算节点访问同一个文件路径",
  "打开请求返回文件的数据布局",
  "文件的四个区间按顺序分配到三个目标",
  "客户端在不同的数据路径上并行读取",
  "客户端按偏移而非到达顺序组装文件",
  "小文件和大文件可覆盖不同数量的目标"
];
const scenes = [
  ({box, link, send, at}) => {
    const a = box([[160,105],[91,85,148]], "计算节点 A", {tone:'blue'});
    const b = box([[160,270],[269,85,148]], "计算节点 B", {tone:'violet'});
    const file = box([[685,187,270],[180,337,270]], "共享命名空间", {detail:'/train/data.bin',tone:'green'});
    send(link(a,file,{axis:['x','y'],offset:-13,bend:-15}),310,2430);
    send(link(b,file,{axis:['x','y'],offset:13,bend:15,color:'violet'}),570,2600,'violet');
    at([[685,249],[180,410]], "挂载同一文件系统", 'secondary');
    return 4260;
  },
  ({box, link, send, at}) => {
    const client = box([[158,136,228],[180,62,215]], "客户端", {detail:'/train/data.bin'});
    const mds = box([[740,136,245],[180,260,225]], "元数据服务器（MDS）", {detail:"返回目标和条带布局",tone:'blue'});
    box([[740,295,245],[180,395,225]], "数据服务器", {detail:"等待数据请求"});
    send(link(client,mds,{axis:['x','y'],offset:-19,color:'blue'}),340,1510);
    send(link(mds,client,{axis:['x','y'],offset:19,color:'green'}),1650,2920,'green');
    at([[447,94],[77,160]], "打开请求",'secondary');
    at([[447,178],[276,160]], "文件布局",'secondary');
    return 4550;
  },
  ({box, link, send}) => {
    const file = box([[192,193,220],[180,69,240]], "文件区间", {slots:[['A','blue'],['B','green'],['C','violet'],['D','blue']]});
    const targets = [
      box([[711,79,212],[60,330,104]], "目标 1", {slots:[['A','blue',1670],['D','blue',3220]]}),
      box([[711,193,212],[180,330,104]], "目标 2", {slots:[['B','green',2170]]}),
      box([[711,307,212],[300,330,104]], "目标 3", {slots:[['C','violet',2690]]})
    ];
    const paths = targets.map((b,i) => link(file,b,{axis:['x','y'],color:['blue','green','violet'][i],
      offset:(i-1)*23,bend:(i-1)*24}));
    send(paths[0],420,1630); send(paths[1],940,2130,'green');
    send(paths[2],1400,2650,'violet'); send(paths[0],1970,3180);
    return 4700;
  },
  ({box, link, send}) => {
    box([[186,74,228],[180,55,238]], "元数据服务器", {detail:"布局已返回"});
    const client = box([[179,235,213],[180,386,224]], "客户端", {tone:'green'});
    const targets = [
      box([[715,79,183],[59,194,106]], 'OSS / OST A', {slots:[['A','blue']]}),
      box([[715,193,183],[180,194,106]], 'OSS / OST B', {slots:[['B','green']]}),
      box([[715,307,183],[301,194,106]], 'OSS / OST C', {slots:[['C','violet']]})
    ];
    targets.forEach((target,i) => {
      const color = ['blue','green','violet'][i];
      send(link(target,client,{axis:['x','y'],color,offset:(i-1)*19,bend:(i-1)*25}),460+i*120,2270+i*120,color);
    });
    return 4160;
  },
  ({box, link, send, at, timed}) => {
    const targets = [
      box([[149,84,170],[60,78,104]], "目标 1", {slots:[['A','blue']]}),
      box([[149,193,170],[180,78,104]], "目标 2", {slots:[['B','green']]}),
      box([[149,302,170],[300,78,104]], "目标 3", {slots:[['C','violet']]})
    ];
    const buffer = box([[710,193,254],[180,368,252]], "按偏移排列的读取缓冲区", {slots:[['A','blue',2990],['B','green',1550],['C','violet',2220]],tone:'green'});
    const end = [2940,1500,2170];
    targets.forEach((target,i) => {
      const color = ['blue','green','violet'][i];
      send(link(target,buffer,{axis:['x','y'],color,offset:(i-1)*19,bend:(i-1)*26}),end[i]-1080,end[i],color);
    });
    timed(at([[450,336],[180,425]],"到达顺序：B、C、A",'secondary'),2930);
    return 4550;
  },
  ({box, link, send, at}) => {
    const large = box([[240,82,216],[180,54,195]], "大文件读取缓冲区", {slots:[['A','blue',2580],['B','green',2720],['C','violet',2860]]});
    const small = box([[691,82,216],[180,281,195]], "小文件读取缓冲区", {slots:[['A','blue',2580]]});
    const a = box([[89,267,133],[60,194,104]], "目标 1", {tone:'blue'});
    const b = box([[240,267,133],[180,194,104]], "目标 2", {tone:'green'});
    const c = box([[391,267,133],[300,194,104]], "目标 3", {tone:'violet'});
    const only = box([[691,267,133],[180,406,148]], "目标 1", {tone:'blue'});
    [a,b,c].forEach((target,i) => {
      const color = ['blue','green','violet'][i];
      send(link(large,target,{axis:'y',offset:(i-1)*24-7,bend:(i-1)*12-7,dashed:true}),350+i*90,1100+i*90);
      send(link(target,large,{axis:'y',color,offset:(i-1)*24+7,bend:(i-1)*12+7}),1250+i*140,2580+i*140,color);
    });
    send(link(small,only,{axis:'y',offset:-12,dashed:true}),350,1100);
    send(link(only,small,{axis:'y',color:'green',offset:12}),1250,2580,'green');
    at([[240,322],[180,236]], "本次读 3 个 OST", 'secondary');
    at([[691,322],[180,445]], "本次读 1 个 OST", 'secondary');
    return 4310;
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
