(function () {
  'use strict';

  const id = 'f-route';
  const router = ['实例路由器', 'Replica Router'];
  const ready = ['就绪', 'Ready'];
  const low = ['负载较低', 'Lower load'];
  const high = ['负载很高', 'High load'];
  const hit = ['前缀命中', 'Prefix hit'];
  const miss = ['无匹配前缀', 'No prefix match'];
  const scenes = [
    {
      input: ['同一模型', 'One model'],
      states: [ready, ['未就绪', 'Not ready']],
      target: 0,
      caption: ['从可接收请求的副本中选择', 'Choose among replicas ready for traffic']
    },
    {
      input: ['比较当前负载', 'Check current load'],
      states: [high, low],
      queues: [5, 2],
      target: 1,
      caption: ['队列和容量影响本次分配', 'Queue and capacity inform the choice']
    },
    {
      input: ['请求前缀与未缓存尾部', 'Prefix and uncached tail'],
      states: [hit, miss],
      cache: [2, 0],
      target: 0,
      caption: ['连续匹配的前缀块可复用', 'Matching prefix blocks can be reused']
    },
    {
      input: ['权衡命中与排队', 'Weigh reuse and queueing'],
      states: [high, low],
      queues: [5, 2],
      cache: [2, 0],
      target: 1,
      caption: ['本次选择较空闲的副本', 'This request goes to the less loaded replica']
    },
    {
      input: ['缓存索引', 'Cache index'],
      states: [['写入前缀块', 'Blocks added'], ['移除前缀块', 'Blocks removed']],
      cache: [2, 0],
      events: true,
      caption: ['缓存事件更新路由索引', 'Cache events update the routing index']
    },
    {
      input: ['更新候选集合', 'Update candidate pool'],
      states: [ready, ready],
      target: 1,
      growing: true,
      caption: ['新增副本就绪后接收请求', 'New replicas take traffic when ready']
    }
  ];

  function mount(host, options = {}) {
    const mobile = matchMedia('(max-width: 640px)');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const size = () => mobile.matches ? [344, 334] : [880, 365];
    const ratio = () => size()[0] / size()[1];
    const local = pair => pair[window.SS.lang() === 'en' ? 1 : 0];
    let step = 0, elapsed = 0, last, frame, links, cards, packets, inputDetail, showingResult;
    let paused = Boolean(options.paused);

    function add(parent, tag, attrs, cls, text) {
      const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
      node.setAttribute('class', id + '-' + cls);
      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
      if (text) node.textContent = text;
      parent.append(node);
      return node;
    }

    function draw() {
      const scene = scenes[step];
      const [w, h] = size();
      const compact = mobile.matches;
      const origin = compact ? [172, 64, 226, 96] : [213, 166, 245, 114];
      const replicas = compact
        ? [[87, 224, 154, 108], [257, 224, 154, 108]]
        : [[680, 88, 293, 112], [680, 244, 293, 112]];
      const [ox, oy, ow, oh] = origin;

      host.replaceChildren();
      const svg = add(host, 'svg', {
        viewBox: `0 0 ${w} ${h}`, role: 'img',
        'aria-label': `${local(window.SS_TOPIC_CFG.steps[step].t)}. ${local(scene.caption)}`
      }, 'diagram');
      links = replicas.map(([x, y, width, height], i) => {
        const lane = compact ? ox + (i === 0 ? -18 : 18) : oy + (i === 0 ? -16 : 16);
        const route = compact
          ? [[lane, oy + oh / 2], [lane, 141], [x, 141], [x, y - height / 2]]
          : [[ox + ow / 2, lane], [434, lane], [434, y], [x - width / 2, y]];
        if (scene.events) route.reverse();
        const [endX, endY] = route.at(-1);
        const [prevX, prevY] = route.at(-2);
        const d = 'M' + route.map(([px, py]) => `${px} ${py}`).join(' L');
        const angle = Math.atan2(endY - prevY, endX - prevX) * 180 / Math.PI;
        const group = add(svg, 'g', {}, 'edge');
        const path = add(group, 'path', {d}, 'link');
        add(group, 'path', {
          d: 'M-7 -4 L0 0 L-7 4',
          transform: `translate(${endX} ${endY}) rotate(${angle})`
        }, 'arrow');
        return {group, path, length: path.getTotalLength()};
      });

      function label(parent, x, y, pair, cls) {
        return add(parent, 'text', {x, y, 'text-anchor': 'middle'}, cls, local(pair));
      }
      function card([x, y, width, height], title, detail) {
        const group = add(svg, 'g', {}, 'node');
        add(group, 'rect', {x: x - width / 2, y: y - height / 2, width, height, rx: 4}, 'card');
        label(group, x, y - 19, title, 'title');
        return {group, detail: label(group, x, y + 4, detail, 'detail')};
      }
      function blocks(parent, x, y, count, total, kind) {
        const left = x - (total * 17 - 4) / 2;
        for (let i = 0; i < total; i++) {
          add(parent, 'rect', {
            x: left + i * 17, y, width: 13, height: 8, rx: 1.5,
            'data-fill': i < count ? kind : 'empty'
          }, 'block');
        }
      }
      const routerCard = card(origin, router, scene.input);
      inputDetail = routerCard.detail;
      if (step === 2) blocks(routerCard.group, ox, oy + 18, 2, 3, 'prefix');
      cards = replicas.map(([x, y, width, height], i) => {
        const result = card([x, y, width, height], i === 0 ? ['副本 A', 'Replica A'] : ['副本 B', 'Replica B'], scene.states[i]);
        if (scene.queues) blocks(result.group, x, y + (scene.cache ? 29 : 19), scene.queues[i], 5, 'queue');
        if (scene.cache && !scene.queues) blocks(result.group, x, y + 19, scene.cache[i], 2, 'prefix');
        if (scene.cache && scene.queues) {
          label(result.group, x, y + 22, scene.cache[i] ? hit : miss, 'detail');
        }
        return result;
      });
      label(svg, w / 2, h - 32, scene.caption, 'status');
      label(svg, w / 2, h - 10, ['示意，不代表实测数字', 'Illustrative, not measured'], 'note');

      const trips = scene.events ? [[0, 0.28], [1, 1.32]] : [[scene.target, scene.growing ? 1.38 : 0.48]];
      packets = trips.map(([index, start]) => ({
        ...links[index], start,
        marker: add(svg, 'rect', {width: 10, height: 10, rx: 2, 'data-event': scene.events || false}, 'packet')
      }));
      options.onLayout?.(ratio(), compact);
    }

    function paint(time) {
      const scene = scenes[step];
      const still = motion.matches;
      const waiting = scene.growing && !still && time < 1.22;
      const result = (!scene.events || still || time >= 2.28) && !waiting;
      if (showingResult !== result) {
        showingResult = result;
        if (scene.events) {
          inputDetail.textContent = local(result ? ['索引已更新', 'Index updated'] : scene.input);
        }
        if (scene.growing) cards[1].detail.textContent = local(waiting ? ['加载模型', 'Loading model'] : ready);
        cards.forEach(({group}, i) => {
          const selected = i === scene.target && !waiting;
          const pending = (step === 0 || waiting) && i === 1;
          group.dataset.state = selected ? 'selected' : pending ? 'pending' : '';
          links[i].group.dataset.state = scene.events ? 'event' : selected ? 'active' : 'idle';
        });
      }
      for (const {path, length, marker, start} of packets) {
        const p = (time - start) / 0.96;
        const visible = !still && p >= 0 && p < 1;
        marker.style.visibility = visible ? 'visible' : 'hidden';
        if (!visible) continue;
        const point = path.getPointAtLength(length * p);
        marker.setAttribute('x', point.x - 5);
        marker.setAttribute('y', point.y - 5);
        marker.style.opacity = Math.min(1, p * 12, (1 - p) * 12);
      }
    }

    function tick(now) {
      elapsed += Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      paint(elapsed % 3.8);
      frame = requestAnimationFrame(tick);
    }
    function run() {
      cancelAnimationFrame(frame);
      if (paused || motion.matches) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
    function reset() {
      elapsed = 0;
      showingResult = null;
      draw();
      paint(0);
      run();
    }

    const controller = {
      show(i) { step = Math.max(0, Math.min(scenes.length - 1, i)); reset(); },
      pause() { paused = true; cancelAnimationFrame(frame); },
      resume() { if (paused) { paused = false; run(); } },
      destroy() {
        this.pause();
        mobile.removeEventListener('change', reset);
        motion.removeEventListener('change', reset);
        document.removeEventListener('ss-lang', reset);
        host.replaceChildren();
        delete host.__anim;
      },
      ratio,
      step: () => step
    };
    mobile.addEventListener('change', reset);
    motion.addEventListener('change', reset);
    document.addEventListener('ss-lang', reset);
    host.__anim = controller;
    reset();
    return controller;
  }

  window.SSAnim ||= {};
  window.SSAnim[id] = {steps: 6, mount};
})();
