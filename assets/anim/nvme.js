/* NVMe：主机如何并行访问固态盘。接口同 assets/anim/rdma.js。 */
(() => {
'use strict';
const STATION = 'nvme';
const PREFIX = 'an-nvme';
const EN = {
  "示意，不代表实测数字": "Schematic, not measured",
  "NVMe 命令经 PCIe 送到固态盘": "NVMe commands reach the SSD over PCIe",
  "块命令指定一个命名空间和逻辑块范围": "A block command addresses one namespace and a logical block range",
  "提交队列写入条目后，门铃通知控制器": "A doorbell tells the controller when submission entries are ready",
  "读取数据与命令完成记录分别进入主机缓冲区": "Read data and the completion entry go to separate host buffers",
  "两个主机核心使用各自的提交队列": "Two host cores use separate submission queues",
  "主机驱动": "Host driver",
  "发出 NVMe 命令": "Issues commands",
  "设备控制器": "Device controller",
  "处理读写命令": "Handles I/O",
  "NAND 闪存": "NAND flash",
  "盘内访问": "Flash access",
  "读取命令": "Read command",
  "命名空间 A": "Namespace A",
  "命名空间 B": "Namespace B",
  "LBA：逻辑块地址": "LBA: logical block address",
  "提交队列（主机内存）": "Submission queue",
  "队尾门铃": "Tail doorbell",
  "取条目": "Fetch entries",
  "读取缓冲区": "Read buffer",
  "完成队列": "Completion queue",
  "A · 成功": "A · success",
  "匹配命令 A": "Matches command A",
  "核心 A": "Core A",
  "核心 B": "Core B",
  "提交队列 A": "Submission A",
  "提交队列 B": "Submission B",
  "同一设备控制器": "One device controller",
  "两个请求同时在途": "Two requests in flight",
};
function T(label) { return window.SS_LANG === 'en' ? EN[label] ?? label : label; }

const titles = [
  "NVMe 命令经 PCIe 送到固态盘",
  "块命令指定一个命名空间和逻辑块范围",
  "提交队列写入条目后，门铃通知控制器",
  "读取数据与命令完成记录分别进入主机缓冲区",
  "两个主机核心使用各自的提交队列"
];
const scenes = [
  ({box, link, send, at}) => {
    const host = box([[142,190],[180,78]], "主机驱动", {detail: "发出 NVMe 命令"});
    const ctrl = box([[465,190],[180,224]], "设备控制器", {detail: "处理读写命令", tone: 'blue'});
    const nand = box([[770,190],[180,375]], "NAND 闪存", {slots: [['','violet'],['','violet'],['','violet'],['','violet']]});
    const bus = link(host, ctrl), media = link(ctrl, nand, {color:'violet'});
    at([[304,165],[224,150]], 'PCIe', 'secondary');
    at([[619,129],[234,298]], "盘内访问", 'secondary');
    send(bus, 260, 1250);
    send(media, 1420, 2420, 'violet');
    return 4450;
  },
  ({box, link, send, at}) => {
    const cmd = box([[153,192,246],[180,77,278]], "读取命令", {detail: 'A · LBA 1–2', tone:'blue'});
    const ctrl = box([[465,192],[180,224]], "设备控制器");
    const first = box([[750,108,208],[96,379,156]], "命名空间 A", {slots: [['0','neutral'],['1','green',2000],['2','green',2200],['3','neutral']]});
    const other = box([[750,276,208],[264,379,156]], "命名空间 B", {slots: ['0','1','2','3'].map(v => [v,'neutral'])});
    const bus = link(cmd, ctrl);
    const selected = link(ctrl, first, {axis:['x','y'], color:'green', bend:-10});
    link(ctrl, other, {axis:['x','y'], color:'neutral', arrow:false, dashed:true, bend:10});
    at([[450,330],[180,440]], "LBA：逻辑块地址", 'secondary');
    send(bus, 300, 1100);
    send(selected, 1180, 1950, 'green');
    return 4400;
  },
  ({box, link, send, at}) => {
    const driver = box([[160,174,184],[180,70,196]], "主机驱动");
    const sq = box([[450,174,220],[180,213,208]], "提交队列（主机内存）", {slots:[['A','blue',850],['B','blue',1200],['','neutral'],['','neutral']]});
    const ctrl = box([[744,174,194],[180,385,210]], "设备控制器");
    const bell = box([[450,304,175],[78,302,136]], "队尾门铃", {tone:'gold'});
    const post = link(driver,sq);
    const ringIn = link(driver,bell,{axis:['y','y'],color:'gold',dashed:true,via:[[[160,201],[160,304],[362.5,304]],[[82,70],[38,70],[38,275]]]});
    const ringOut = link(bell,ctrl,{axis:['x','y'],color:'gold',dashed:true,via:[[[537.5,304],[695,304],[695,201]],[[78,329],[78,358]]]});
    const fetch = link(sq,ctrl,{axis:['x','y'],color:'green',offset:26});
    at([[610,109],[254,287]], "取条目", 'secondary');
    send(post,280,850); send(post,550,1200);
    send(ringIn,1270,1750,'gold'); send(ringOut,1770,2270,'gold');
    send(fetch,2280,3270,'green'); send(fetch,2640,3580,'green');
    return 5000;
  },
  ({box, link, send}) => {
    const ctrl = box([[140,185],[180,63]], "设备控制器");
    const buf = box([[450,95],[95,228,154]], "读取缓冲区", {slots:[['','green',1760],['','green',1920]],tone:'green'});
    const cq = box([[450,275],[262,228,158]], "完成队列", {detail: "A · 成功",tone:'blue'});
    const driver = box([[743,275],[262,373,158]], "主机驱动", {detail:"匹配命令 A"});
    send(link(ctrl,buf,{axis:['x','y'],color:'green',bend:-9}),380,1760,'green');
    send(link(ctrl,cq,{axis:['x','y'],bend:9}),1870,2600);
    send(link(cq,driver,{color:'violet'}),2670,3530,'violet');
    return 4800;
  },
  ({box, link, send, at}) => {
    const coreA = box([[125,104,166],[95,66,150]], "核心 A", {tone:'blue'});
    const coreB = box([[125,246,166],[265,66,150]], "核心 B", {tone:'violet'});
    const qa = box([[416,104,188],[95,220,154]], "提交队列 A", {slots:[['A','blue',1100],['','neutral'],['','neutral']]});
    const qb = box([[416,246,188],[265,220,154]], "提交队列 B", {slots:[['B','violet',1100],['','neutral'],['','neutral']]});
    const ctrl = box([[744,175,204],[180,385,228]], "同一设备控制器", {tone:'green'});
    send(link(coreA,qa),310,1100);
    send(link(coreB,qb,{color:'violet'}),310,1100,'violet');
    send(link(qa,ctrl,{axis:['x','y'],offset:-13,bend:-13}),1350,2720);
    send(link(qb,ctrl,{axis:['x','y'],color:'violet',offset:13,bend:13}),1350,2720,'violet');
    at([[450,326],[180,438]], "两个请求同时在途", 'secondary');
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
