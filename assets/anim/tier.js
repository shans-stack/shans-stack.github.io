/* 冷热分层：按访问需求放置数据。沿用 RDMA 动画接口与 PFS 的 SVG 路径绘制。 */
(() => {
'use strict';
const STATION = 'tier';
const PREFIX = 'an-tier';
const titles = [
  [
    "访问频率和可接受的取回等待时间共同决定数据适合放在哪一层。",
    "Access frequency and acceptable retrieval delay together determine which tier suits the data."
  ],
  [
    "文件系统可按介质放置数据，对象存储也可用存储类别定义访问条件。",
    "File systems can place data by media type, and object stores can define access conditions through storage classes."
  ],
  [
    "分层策略可按对象年龄或实际访问情况判断迁移时机。",
    "A tiering policy can trigger a transition based on object age or observed access."
  ],
  [
    "分层可以改变数据所在介质或访问类别，同时保留原有的文件路径或对象键。",
    "A transition can change the data’s medium or access class while retaining its file path or object key."
  ],
  [
    "在线冷层可以直接读，离线归档层要先恢复到可读状态。",
    "An online cold tier serves reads directly, while an offline archive tier requires restoration first."
  ],
  [
    "分层决策要同时核对保留时长、取回时限和重新访问的可能性。",
    "A tiering decision accounts for retention time, retrieval deadlines, and the likelihood of renewed access."
  ]
];

const scenes = [
  ({box, link, send}) => {
    const samples = box([[174,85,232],[180,47,230]], ['训练样本','Training samples'], {detail:['频繁读取','Frequent reads']});
    const hot = box([[725,85,215],[180,133,230]], ['热层','Hot tier'], {detail:['活跃工作集','Active working set']});
    const point = box([[174,233,232],[180,245,230]], ['近期检查点','Recent checkpoint'], {detail:['低频 · 须即时读取','Rare · Instant access']});
    const cold = box([[725,233,215],[180,337,230]], ['在线冷层','Online cold tier'], {detail:['按需直接读','Direct reads on demand']});
    send(link(samples,hot),350,1740);
    send(link(point,cold),570,1960);
    return 3380;
  },
  ({box, link, send}) => {
    const file = box([[174,85,232],[180,47,230]], ['文件块副本','File block replica'], {detail:['介质策略','Media policy']});
    const ssd = box([[725,85,215],[180,133,230]], ['SSD','SSD'], {detail:['物理介质','Physical medium']});
    const object = box([[174,233,232],[180,245,230]], ['存储对象','Stored object'], {detail:['类别策略','Storage class policy']});
    const cls = box([[725,233,215],[180,337,230]], ['归档类别','Archive class'], {detail:['定义取回条件','Defines retrieval terms']});
    send(link(file,ssd),370,1770);
    send(link(object,cls),650,2050);
    return 3500;
  },
  ({box, link, send, state}) => {
    const created = box([[181,81,233],[180,48,234]], ['对象年龄','Object age'], {detail:['从创建时起算','Time since creation']});
    const age = box([[719,81,248],[180,137,234]], ['年龄条件','Age rule'], {detail:['尚未达到条件','Condition pending']});
    const idle = box([[181,231,233],[180,246,234]], ['未访问时间','Inactivity'], {detail:['从上次访问起算','Time since last access']});
    const access = box([[719,231,248],[180,338,234]], ['访问条件','Access rule'], {detail:['尚未达到条件','Condition pending']});
    send(link(created,age),370,1790);
    send(link(idle,access),510,2280);
    const pending = [0,['尚未达到条件','Condition pending']];
    const eligible = ['符合降层条件','Eligible to transition'];
    state(age.sub,[pending,[1790,eligible]]);
    state(access.sub,[pending,[2280,eligible]]);
    return 3720;
  },
  ({box, link, send, tile, visible}) => {
    box([[450,61,310],[180,42,265]], ['同一文件路径','Same file path'], {detail:['/datasets/train.bin','/datasets/train.bin']});
    const src = box([[193,211,218],[180,155,235]], ['源介质','Source medium'], {detail:['现有副本','Existing replica']});
    const dst = box([[705,211,218],[180,311,235]], ['目标介质','Target medium'], {detail:['按策略放置','Policy placement']});
    send(link(src,dst),540,2260);
    visible(tile([[193,265],[180,209]]),-160,2470);
    visible(tile([[705,265],[180,365]]),2260);
    return 3660;
  },
  ({box, link, send, state, tile, visible}) => {
    const online = box([[178,80,200],[77,50,132]], ['在线冷层','Online cold'], {detail:['可直接读','Ready to read'],tone:'good'});
    const archive = box([[178,245,200],[264,50,160]], ['离线归档','Offline archive'], {detail:['保留归档源','Source retained'],tone:'slow'});
    const copy = box([[455,245,192],[264,191,160]], ['恢复副本','Restored copy'], {detail:['正在恢复','Restoring'],tone:'slow'});
    const a = box([[746,80,206],[77,322,132]], ['客户端','Client'], {detail:['已送达 0','Delivered 0'],tone:'good'});
    const b = box([[746,245,206],[264,322,160]], ['客户端','Client'], {detail:['已送达 0','Delivered 0'],tone:'slow'});
    const fast = link(online,a,{tone:'good'});
    const restore = link(archive,copy,{tone:'slow'});
    const read = link(copy,b,{tone:'slow'});
    send(fast,320,1500,'good');
    send(restore,320,2600,'slow');
    send(read,2740,3880,'slow');
    visible(tile([[178,298],[264,92]],'slow'),-160);
    visible(tile([[455,298],[264,233]],'slow'),2600);
    const zero = ['已送达 0','Delivered 0'], one = ['已送达 1','Delivered 1'];
    state(a.sub,[[0,zero],[1500,one]]);
    state(b.sub,[[0,zero],[3880,one]]);
    state(copy.sub,[[0,['正在恢复','Restoring']],[2600,['临时可读','Temporarily readable']]]);
    return 5210;
  },
  ({box, link, send, state}) => {
    const cold = box([[173,98,233],[180,49,248]], ['在线冷层','Online cold tier'], {detail:['符合条件的对象','Eligible object']});
    const hot = box([[719,98,238],[180,177,248]], ['频繁访问层','Frequent access tier'], {detail:['等待再次访问','Awaiting renewed access']});
    box([[173,240,233],[180,318,248]], ['归档数据','Archived data'], {detail:['仍长期保留','Remains in archive'],tone:'idle'});
    send(link(cold,hot),650,2200);
    state(cold.sub,[[0,['符合条件的对象','Eligible object']],[2200,['对象已升层','Object promoted']]]);
    state(hot.sub,[[0,['等待再次访问','Awaiting renewed access']],[2200,['重新进入工作集','Back in the working set']]]);
    return 3750;
  }
];

const SIZE = [[900, 350], [360, 410]];
let serial = 0;

function mount(host, opts = {}) {
  const screen = matchMedia('(max-width: 640px)');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const markerPrefix = PREFIX + '-' + ++serial;
  svg.setAttribute('class', PREFIX);
  svg.setAttribute('role', 'img');
  host.replaceChildren(svg);

  const T = labels => labels[+(window.SS_LANG === 'en')];
  let current = 0, frame = 0, last = null, elapsed = 0;
  let paused = !!opts.paused, paint, duration;

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = null;
  }

  function play(now) {
    elapsed += last === null ? 0 : Math.max(0, now - last);
    last = now;
    paint(elapsed % duration, true);
    frame = requestAnimationFrame(play);
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
    const updates = [];
    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('aria-label', T(titles[current]));

    function glyph(parent, tag, attrs = {}, classes = '') {
      const el = document.createElementNS(svg.namespaceURI, tag);
      for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
      if (classes) el.setAttribute('class', classes.split(' ').map(cls => PREFIX + '-' + cls).join(' '));
      parent.append(el);
      return el;
    }

    const defs = glyph(svg, 'defs');
    for (const tone of ['normal', 'good', 'slow', 'idle']) {
      const marker = glyph(defs, 'marker', {id: markerPrefix + '-' + tone, markerWidth: 10, markerHeight: 10,
        refX: 9, refY: 5, orient: 'auto', markerUnits: 'userSpaceOnUse'});
      glyph(marker, 'path', {d: 'M 1 1 L 9 5 L 1 9'}, 'line ' + tone);
    }
    const lines = glyph(svg, 'g');
    const nodes = glyph(svg, 'g');
    const traffic = glyph(svg, 'g');
    const overlay = glyph(svg, 'g');

    function text(parent, [x, y], labels, cls = 'label', anchor = 'middle') {
      const el = glyph(parent, 'text', {x, y, 'text-anchor': anchor}, cls);
      el.textContent = T(labels);
      return el;
    }

    function state(el, changes) {
      updates.push(t => {
        const labels = changes.reduce((value, [start, next]) => t >= start ? next : value, changes[0][1]);
        const value = T(labels);
        if (el.textContent !== value) el.textContent = value;
      });
    }

    function visible(el, start = 0, end = Infinity) {
      updates.push(t => {
        el.style.opacity = Math.min(1, Math.max(0, (t - start) / 160), Math.max(0, (end - t) / 160));
      });
    }

    function box(pair, title, {detail, tone = 'normal'} = {}) {
      const [x, y, w] = use(pair);
      const h = detail ? 64 : 42;
      const left = x - w / 2, top = y - h / 2;
      const group = glyph(nodes, 'g');
      glyph(group, 'rect', {x: left, y: top, width: w, height: h, rx: 4}, 'box ' + tone);
      text(group, [x, detail ? y - 11 : y], title, 'title');
      const sub = detail && text(group, [x, y + 13], detail, 'secondary');
      return {x, y, left, top, right: left + w, bottom: top + h, sub};
    }

    function link(a, b, {tone = 'normal', via} = {}) {
      const start = mobile ? [a.x, b.y > a.y ? a.bottom : a.top] : [b.x > a.x ? a.right : a.left, a.y];
      const end = mobile ? [b.x, b.y > a.y ? b.top : b.bottom] : [b.x > a.x ? b.left : b.right, b.y];
      const points = via ? use(via) : [start, end];
      const d = points.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ');
      return glyph(lines, 'path', {d, 'marker-end': `url(#${markerPrefix}-${tone})`}, 'line ' + tone);
    }

    function send(path, start, end, tone = 'normal') {
      const packet = glyph(traffic, 'rect', {x: -8, y: -5, width: 16, height: 10, rx: 2}, 'packet ' + tone);
      const length = path.getTotalLength();
      visible(packet, start, end + 140);
      updates.push(t => {
        const progress = Math.max(0, Math.min(1, (t - start) / (end - start)));
        const p = path.getPointAtLength(Math.max(0, length - 6) * progress);
        packet.setAttribute('transform', `translate(${p.x} ${p.y})`);
      });
    }

    function tile(pair, tone = 'normal') {
      const [x, y] = use(pair);
      return glyph(overlay, 'rect', {x: x - 8, y: y - 5, width: 16, height: 10, rx: 2}, 'packet ' + tone);
    }

    duration = scenes[current]({box, link, send, state, tile, visible});
    text(overlay, [width / 2, height - 16], ['示意，不代表实测数字', 'Schematic, no measured figures'], 'note');
    paint = (t, animate) => {
      traffic.style.opacity = animate ? Math.min(1, t / 240, (duration - t) / 240) : 0;
      updates.forEach(update => update(t));
    };
    paint(motion.matches ? duration - 160 : 0, !motion.matches);
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
      document.removeEventListener('ss-lang', build);
      svg.remove();
      if (host.__anim === ctl) delete host.__anim;
    },
    ratio() { const [w, h] = SIZE[+screen.matches]; return w / h; },
    step() { return current; }
  };
  host.__anim = ctl;
  screen.addEventListener('change', build);
  motion.addEventListener('change', build);
  document.addEventListener('ss-lang', build);
  build();
  return ctl;
}

window.SSAnim = window.SSAnim || {};
window.SSAnim[STATION] = {steps: 6, mount};
})();
