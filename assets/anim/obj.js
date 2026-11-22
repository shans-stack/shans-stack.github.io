/* 对象存储和文件存储。接口同 assets/anim/rdma.js。 */
(() => {
'use strict';
const STATION = 'obj';
const PREFIX = 'an-obj';
const EN = {
  "示意，不代表实测数字": "Schematic, not measured",
  "用桶名和对象键找到一个对象": "A bucket and full key select one object",
  "平铺的对象键前缀与文件系统目录树": "Flat object key prefixes and a file system directory tree",
  "PUT 提交对象，Range GET 返回指定区间": "PUT submits an object and range GET returns a byte range",
  "分段上传后按段号组装一个对象": "Uploaded parts are assembled into one object in part order",
  "按文件偏移更新与提交完整对象": "Updating a file offset and submitting a complete object",
  "应用请求": "Application request",
  "选中的对象": "Selected object",
  "桶内另一对象": "Other object",
  "存储桶：media": "Bucket: media",
  "前缀：train/": "Prefix: train/",
  "目录：train": "Directory: train",
  "对象键筛选": "Object key filter",
  "文件路径解析": "File path lookup",
  "应用": "Application",
  "对象存储": "Object storage",
  "PUT：完整对象": "PUT: whole object",
  "GET 返回：区间 B": "Range B returned",
  "段 1": "Part 1",
  "段 2": "Part 2",
  "段 3": "Part 3",
  "上传会话": "Upload session",
  "已组装的对象": "Assembled object",
  "完成请求": "Complete",
  "写入一个区间": "Write one range",
  "原文件": "Existing file",
  "提交完整对象": "Submit whole object",
  "同一个键": "Same key",
};
function T(label) { return window.SS_LANG === 'en' ? EN[label] ?? label : label; }

const titles = [
  "用桶名和对象键找到一个对象",
  "平铺的对象键前缀与文件系统目录树",
  "PUT 提交对象，Range GET 返回指定区间",
  "分段上传后按段号组装一个对象",
  "按文件偏移更新与提交完整对象"
];
const scenes = [
  ({box, link, send, at}) => {
    const req = box([[156,193,222],[180,76,234]], "应用请求", {detail:'media / train/a.jpg'});
    const first = box([[721,130,207],[180,272,220]], 'train/a.jpg', {detail:"选中的对象",tone:'green'});
    box([[721,249,207],[180,371,220]], 'train/b.jpg', {detail:"桶内另一对象"});
    at([[721,58],[266,161]], "存储桶：media",'title');
    send(link(req,first,{axis:['x','y'],color:'green',bend:-17}),450,2200,'green');
    return 4170;
  },
  ({box, link, send, at}) => {
    const p = box([[219,115,210],[180,78,210]], "前缀：train/",{tone:'blue'});
    const a = box([[117,277,170],[94,197,150]],'train/a.jpg',{tone:'green'});
    const b = box([[311,277,170],[266,197,150]],'train/b.jpg',{tone:'green'});
    const dir = box([[679,115,200],[180,309,210]], "目录：train",{tone:'violet'});
    const f1 = box([[583,277,160],[94,425,150]],'a.jpg');
    const f2 = box([[775,277,160],[266,425,150]],'b.jpg');
    send(link(p,a,{axis:'y',color:'green',offset:-16}),360,2050,'green');
    send(link(p,b,{axis:'y',color:'green',offset:16}),380,2100,'green');
    link(dir,f1,{axis:'y',color:'violet',arrow:false,offset:-16});
    link(dir,f2,{axis:'y',color:'violet',arrow:false,offset:16});
    at([[219,45],[180,27]], "对象键筛选",'secondary');
    at([[679,45],[180,257]], "文件路径解析",'secondary');
    return 4350;
  },
  ({box, link, send, at}) => {
    const app = box([[167,196,215],[180,72,224]], "应用",{slots:[['A','blue'],['B','green'],['C','blue']]});
    const store = box([[735,196,215],[180,396,224]], "对象存储",{slots:[['A','blue',1680],['B','green',1680],['C','blue',1680]],tone:'blue'});
    const put = link(app,store,{axis:['x','y'],offset:-26});
    const get = link(store,app,{axis:['x','y'],offset:26,color:'green'});
    [0,1,2].forEach(i=>send(put,360+i*240,1090+i*240,i===1?'green':'blue'));
    send(get,2170,3240,'green');
    at([[450,128],[91,208]], "PUT：完整对象",'secondary');
    at([[450,265],[279,266]], "GET 返回：区间 B",'secondary');
    return 4600;
  },
  ({box, link, send, at, timed}) => {
    const parts = [
      box([[144,81,170],[61,80,106]], "段 1",{slots:[['1','blue']]}),
      box([[144,193,170],[180,80,106]], "段 2",{slots:[['2','green']]}),
      box([[144,305,170],[299,80,106]], "段 3",{slots:[['3','violet']]})
    ];
    const session = box([[450,193,206],[180,246,222]], "上传会话",{tone:'blue'});
    const final = box([[758,193,205],[180,391,224]], "已组装的对象",{slots:[['1','blue',3100],['2','green',3100],['3','violet',3100]],tone:'green'});
    parts.forEach((p,i) => {
      const color = ['blue','green','violet'][i];
      send(link(p,session,{axis:['x','y'],color,offset:(i-1)*19,bend:(i-1)*17}),380+i*150,[1720,1270,1520][i],color);
    });
    send(link(session,final,{color:'green'}),2150,3080,'green');
    timed(at([[603,160],[251,319]], "完成请求",'secondary'),2060);
    return 4650;
  },
  ({box, link, send, at}) => {
    const patch = box([[174,104,216],[97,93,162]], "写入一个区间", {slots:[['B','green']]});
    const file = box([[716,104,236],[263,207,162]], "原文件", {slots:[['A','neutral'],['B','green',1570],['C','neutral']],tone:'green'});
    const body = box([[174,277,216],[97,315,162]], "提交完整对象", {slots:[['A','blue'],['B','green'],['C','blue']]});
    const obj = box([[716,277,236],[263,405,162]], "同一个键", {slots:[['A','blue',1970],['B','green',1970],['C','blue',1970]],tone:'blue'});
    const p = link(patch,file,{axis:['x','y'],color:'green'});
    const q = link(body,obj,{axis:['x','y']});
    send(p,500,1540,'green');
    [0,1,2].forEach(i => send(q,370+i*400,1120+i*400,i===1?'green':'blue'));
    at([[446,76],[252,112]], 'pwrite()', 'secondary');
    at([[445,250],[253,322]], 'PutObject', 'secondary');
    return 4290;
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
