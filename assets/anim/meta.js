/* 元数据服务：从文件路径到数据位置。沿用 RDMA 动画接口与 PFS 的 SVG 路径绘制。 */
(() => {
'use strict';
const STATION = 'meta';
const PREFIX = 'an-meta';
const titles = [
  [
    "元数据服务根据目录层级解析路径，并识别路径所指的文件。",
    "The metadata service resolves a path through the directory hierarchy and identifies the file it names."
  ],
  [
    "客户端先查询文件布局，再向数据服务读取内容。",
    "The client looks up the file layout, then reads the contents from the data service."
  ],
  [
    "创建、删除和重命名会更新命名空间，这些变更可以写入日志以供恢复。",
    "Creates, deletes, and renames change the namespace, and those changes can be journaled for recovery."
  ],
  [
    "同样的数据量分散到更多文件时，逐文件操作会使元数据请求更加密集。",
    "Splitting the same volume of data across more files can produce more metadata requests when each file is accessed separately."
  ],
  [
    "部分文件系统将不同目录子树交给多个活跃服务处理，以分摊并发请求。",
    "Some file systems assign different directory subtrees to active servers to share concurrent requests."
  ],
  [
    "活跃服务失效后，备用实例接管其职责，并利用持久化状态恢复元数据服务。",
    "When an active server fails, a standby takes over its role and uses persistent state to recover metadata service."
  ]
];

const scenes = [
  ({box, link, send, state}) => {
    const root = box([[152,152,188],[180,50,230]], ['根目录','Root directory'], {detail:['/','/']});
    const dir = box([[449,152,188],[180,166,230]], ['子目录','Subdirectory'], {detail:['/train','/train']});
    const file = box([[745,152,214],[180,302,230]], ['文件条目','File entry'], {detail:['查找 samples.bin','Looking up samples.bin']});
    send(link(root,dir),260,1150);
    send(link(dir,file),1160,2230);
    state(file.sub,[[0,['查找 samples.bin','Looking up samples.bin']],[2230,['读取权限与大小','Permissions and size']]]);
    return 3760;
  },
  ({box, link, send, state}) => {
    const client = box([[187,164,205],[180,60,218]], ['客户端','Client'], {detail:['待查询布局','Needs layout']});
    const mds = box([[710,80,233],[180,216,218]], ['元数据服务','Metadata service'], {detail:['查询与布局响应','Lookup and layout reply']});
    const data = box([[710,250,233],[180,343,218]], ['数据节点','Data node'], {detail:['返回文件内容','Returns file contents']});
    send(link(client,mds,{via:[[[289.5,143],[425,143],[425,69],[593.5,69]],[[155,92],[155,184]]]}),270,1070);
    send(link(mds,client,{via:[[[593.5,93],[465,93],[465,164],[289.5,164]],[[205,184],[205,92]]]}),1130,1930);
    send(link(data,client,{tone:'good',via:[[[593.5,250],[428,250],[428,186],[289.5,186]],[[71,343],[40,343],[40,60],[71,60]]]}),2130,3130,'good');
    state(client.sub,[[0,['待查询布局','Needs layout']],[1930,['已收到布局','Layout received']],[3130,['已收到内容','Contents received']]]);
    return 4480;
  },
  ({box, link, send, state}) => {
    const req = box([[155,155,208],[180,55,234]], ['重命名请求','Rename request'], {detail:['a.bin → b.bin','a.bin → b.bin']});
    const dir = box([[450,155,207],[180,180,234]], ['目录条目','Directory entry'], {detail:['a.bin','a.bin']});
    const log = box([[743,155,208],[180,307,234]], ['持久化日志','Persistent journal'], {detail:['等待变更','Awaiting change']});
    send(link(req,dir),280,1210);
    send(link(dir,log),1380,2260);
    state(dir.sub,[[0,['a.bin','a.bin']],[2260,['b.bin','b.bin']]]);
    state(log.sub,[[0,['等待变更','Awaiting change']],[2260,['记录重命名','Rename recorded']]]);
    return 3650;
  },
  ({box, link, send, at, state}) => {
    const big = box([[192,81,206],[78,83,128]], ['单个大文件','One large file'], {detail:['打开一次','One open'],tone:'good'});
    const many = box([[192,242,206],[266,83,158]], ['多个小文件','Many small files'], {detail:['逐个打开','Open each'],tone:'slow'});
    const a = box([[708,81,211],[78,289,128]], ['元数据服务','Metadata'], {detail:['负载较低','Low load'],tone:'good'});
    const b = box([[708,242,211],[266,289,158]], ['元数据服务','Metadata'], {detail:['负载较低','Low load'],tone:'slow'});
    const first = link(big,a,{tone:'good'});
    const second = link(many,b,{tone:'slow'});
    send(first,330,1700,'good');
    [330,590,850,1110,1370].forEach(start => send(second,start,start+1370,'slow'));
    state(b.sub,[[0,['负载较低','Low load']],[1960,['负载升高','Rising load']],[2540,['负载很高','High load']]]);
    at([[450,286],[174,353]],['两侧数据总量相同','Equal total data'],'secondary');
    return 4320;
  },
  ({box, link, send}) => {
    const team = box([[170,82,215],[81,80,140]], ['目录 /train','Directory /train']);
    const archive = box([[170,231,215],[265,80,160]], ['目录 /eval','Directory /eval']);
    const a = box([[722,82,227],[81,285,140]], ['活跃服务 A','Active server A'], {detail:['负责 /train','Serves /train']});
    const b = box([[722,231,227],[265,285,160]], ['活跃服务 B','Active server B'], {detail:['负责 /eval','Serves /eval']});
    const linkA = link(team,a), linkB = link(archive,b);
    [350,810,1270].forEach(start => {
      send(linkA,start,start+1360);
      send(linkB,start+140,start+1500);
    });
    return 4060;
  },
  ({box, link, send, state}) => {
    const client = box([[149,81,197],[180,56,218]], ['客户端','Client']);
    const old = box([[723,61,213],[180,155,218]], ['原活跃实例','Original active'], {detail:['正在服务','Serving'],tone:'idle'});
    const standby = box([[723,240,213],[180,260,218]], ['备用实例','Standby'], {detail:['等待接管','Awaiting takeover']});
    const journal = box([[149,240,197],[180,352,218]], ['持久化日志','Persistent journal']);
    const original = link(client,old,{tone:'idle',via:[[[247.5,81],[447,81],[447,61],[616.5,61]],[[180,77],[180,123]]]});
    const replay = link(journal,standby,{tone:'normal'});
    const resumed = link(client,standby,{tone:'good',via:[[[149,102],[149,151],[502,151],[502,232],[616.5,232]],[[71,56],[41,56],[41,260],[71,260]]]});
    send(original,170,820);
    send(replay,1210,2140);
    send(resumed,2280,3290,'good');
    state(old.sub,[[0,['正在服务','Serving']],[1000,['不可用','Unavailable']]]);
    state(standby.sub,[[0,['等待接管','Awaiting takeover']],[1210,['恢复元数据','Recovering metadata']],[2140,['已接管','Serving']]]);
    return 4530;
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

    function at(pair, labels, cls, anchor) {
      return text(overlay, use(pair), labels, cls, anchor);
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

    duration = scenes[current]({box, link, send, state, at});
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
