/* 作业调度：从资源申请到节点放置。沿用 RDMA 动画接口与 PFS 的 SVG 路径绘制。 */
(() => {
'use strict';
const STATION = 'jobs';
const PREFIX = 'an-jobs';
const titles = [
  [
    "作业描述要运行的程序及其资源需求，提交后由集群决定何时运行。",
    "A job describes a program and its resource needs, and the cluster decides when it can run."
  ],
  [
    "调度器根据资源需求和放置约束筛选节点，找不到可行位置时继续等待。",
    "The scheduler filters nodes against resource needs and placement constraints, and the workload waits if no placement fits."
  ],
  [
    "多个作业争用同一组资源时，优先级影响先考虑哪个作业。",
    "When jobs compete for the same resources, priority influences which job is considered first."
  ],
  [
    "Slurm 可以让较短的低优先级作业先运行，条件是它不会推迟高优先级作业的预计启动时间。",
    "Slurm can start a short, lower-priority job early if its run fits before the expected start of a higher-priority job."
  ],
  [
    "Job 控制器管理任务完成条件，调度器为待调度的 Pod 选择节点。",
    "The Job controller manages completion, and the scheduler selects nodes for Pods awaiting placement."
  ],
  [
    "批队列可先判断作业能否按配额启动，节点调度再为执行单元选择位置。",
    "A batch queue can admit a job according to quota before node scheduling places its execution units."
  ]
];

const scenes = [
  ({box, link, send, state}) => {
    const app = box([[210,155,220],[180,83,222]], ['作业申请','Job submission'], {detail:['GPU、CPU、内存','GPU, CPU, memory']});
    const queue = box([[690,155,220],[180,275,222]], ['等待队列','Pending queue'], {detail:['等待提交','Awaiting submission']});
    send(link(app, queue), 350, 1750);
    state(queue.sub, [[0,['等待提交','Awaiting submission']],[1750,['已入队','Job queued']]]);
    return 3600;
  },
  ({box, link, send}) => {
    const request = box([[178,154,238],[180,46,222]], ['单节点需要两块 GPU','Two GPUs, one node']);
    const a = box([[715,65,225],[180,135,220]], ['节点 A','Node A'], {detail:['一块空闲 · 不符合','One free · Ineligible'],tone:'idle'});
    const b = box([[715,154,225],[180,229,220]], ['节点 B','Node B'], {detail:['一块空闲 · 不符合','One free · Ineligible'],tone:'idle'});
    const c = box([[715,243,225],[180,325,220]], ['节点 C','Node C'], {detail:['两块空闲 · 可放置','Two free · Eligible'],tone:'good'});
    link(request,a,{tone:'idle',via:[[[297,141],[468,141],[468,65],[602.5,65]],[[155,67],[155,103]]]});
    link(request,b,{tone:'idle',via:[[[297,154],[602.5,154]],[[104,67],[52,67],[52,229],[70,229]]]});
    send(link(request,c,{tone:'good',via:[[[297,167],[468,167],[468,243],[602.5,243]],[[256,67],[308,67],[308,325],[290,325]]]}),400,1950,'good');
    return 3500;
  },
  ({box, link, send, state}) => {
    const first = box([[205,103,220],[180,55,220]], ['较高优先级','Higher priority'], {detail:['等待资源','Waiting for resources'],tone:'good'});
    const later = box([[205,235,220],[180,186,220]], ['较低优先级','Lower priority'], {detail:['继续等待','Stays queued'],tone:'idle'});
    const gpu = box([[685,169,224],[180,322,220]], ['同一组 GPU','Shared GPU group'], {detail:['已占用','In use']});
    const path = link(first,gpu,{tone:'good',via:[[[315,103],[474,103],[474,155],[573,155]],[[290,55],[316,55],[316,322],[290,322]]]});
    link(later,gpu,{tone:'idle',via:[[[315,235],[498,235],[498,183],[573,183]],[[70,186],[44,186],[44,322],[70,322]]]});
    send(path,1000,2450,'good');
    state(first.sub,[[0,['等待资源','Waiting for resources']],[2450,['获分配','Allocated']]]);
    state(gpu.sub,[[0,['已占用','In use']],[900,['资源释放','Resources freed']],[2450,['较高优先级运行','Higher priority runs']]]);
    return 4190;
  },
  ({use, at, glyph, lines, visible, state, overlay}) => {
    const [x, split, end, top, lower, h] = use([[178,529,835,106,194,38],[30,188,330,101,198,42]]);
    const bar = (start, stop, y, tone) => glyph(lines,'rect',{x:start,y,width:stop-start,height:h,rx:3},'bar '+tone);
    bar(x,split,top,'idle');
    bar(x,split,lower,'normal');
    const short = bar(x+5,split-19,top,'good');
    const long = glyph(lines,'rect',{x:split,y:top,width:end-split,height:lower+h-top,rx:3},'bar normal');
    visible(short,760);
    visible(long,2200);
    const stroke = {x1:split,y1:top-19,x2:split,y2:lower+h+23};
    glyph(overlay,'line',stroke,'line idle');
    at([[x,top-29],[x,top-29]],['空闲 GPU','Idle GPUs'],'label','start');
    at([[x,lower-24],[x,lower-24]],['占用中的 GPU','Busy GPUs'],'label','start');
    const gap = at([[(x+split)/2,top+h/2],[(x+split)/2,top+h/2]],['可用空档','Free gap']);
    state(gap,[[0,['可用空档','Free gap']],[950,['短作业','Short job']]]);
    at([[(x+split)/2,lower+h/2],[(x+split)/2,lower+h/2]],['现有作业','Running job']);
    const label = at([[(split+end)/2,(top+lower+h)/2],[(split+end)/2,(top+lower+h)/2]],['大作业','Large job']);
    visible(label,2200);
    at([[split,lower+h+43],[split,lower+h+43]],['大作业预计开始','Planned start'],'secondary');
    at([[end,lower+h+75],[end,lower+h+83]],['时间 →','Time →'],'secondary','end');
    return 4200;
  },
  ({box, link, send}) => {
    const job = box([[130,153,192],[180,40,234]], ['Job 控制器','Job controller'], {detail:['创建 Pod','Creates a Pod']});
    const scheduler = box([[437,153,212],[180,140,234]], ['调度器','Scheduler'], {detail:['筛选并打分','Filters and scores']});
    const pass = box([[750,101,196],[180,242,234]], ['可行节点','Feasible node'], {detail:['Pod 绑定到此','Pod binds here'],tone:'good'});
    const fail = box([[750,216,196],[180,340,234]], ['不符合的节点','Ineligible node'], {detail:['未绑定 Pod','No Pod binding'],tone:'idle'});
    send(link(job,scheduler),330,1130);
    send(link(scheduler,pass,{tone:'good',via:[[[543,145],[600,145],[600,101],[652,101]],[[180,172],[180,210]]]}),1330,2300,'good');
    link(scheduler,fail,{tone:'idle',via:[[[543,162],[613,162],[613,216],[652,216]],[[297,140],[325,140],[325,340],[297,340]]]});
    return 3900;
  },
  ({box, link, send, state}) => {
    const workload = box([[104,151,150],[180,37,238]], ['工作负载','Workload']);
    const queue = box([[321,151,190],[180,130,238]], ['批队列','Batch queue'], {detail:['配额检查','Checks quota']});
    const scheduler = box([[559,151,193],[180,233,238]], ['节点调度器','Node scheduler'], {detail:['放置 Pod','Places Pods']});
    const node = box([[794,151,148],[180,336,238]], ['执行节点','Worker node'], {detail:['等待 Pod','Awaiting Pod'],tone:'good'});
    send(link(workload,queue),300,950);
    send(link(queue,scheduler),1250,2010);
    send(link(scheduler,node,{tone:'good'}),2230,2920,'good');
    state(queue.sub,[[0,['配额检查','Checks quota']],[1250,['已准入','Admitted']]]);
    state(node.sub,[[0,['等待 Pod','Awaiting Pod']],[2920,['Pod 已绑定','Pod bound']]]);
    return 4300;
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

    duration = scenes[current]({box, link, send, state, use, at, visible, glyph, lines, overlay});
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
