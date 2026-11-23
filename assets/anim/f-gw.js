(function () {
  'use strict';

  const id = 'f-gw';
  const note = ['示意，不代表实测数字', 'Illustrative, not measured'];
  const scenes = [
    {
      gateway: ['固定 API 地址', 'Stable API address'],
      backends: [[['模型端点', 'Model Endpoint'], ['运行模型', 'Runs the model']]],
      caption: ['响应经网关返回应用', 'The response returns through the gateway'],
      transfers: [['entry', 0.16], ['a', 0.85], ['a', 1.84, 'return'], ['entry', 2.53, 'return']]
    },
    {
      gateway: ['身份 · 访问 · 限流', 'Identity · Access · Rate'],
      backends: [[['模型端点', 'Model Endpoint'], ['仅接收获准请求', 'Accepted calls only']]],
      caption: ['获准请求进入后端', 'An accepted call reaches the backend'],
      result: ['未获准请求止于网关', 'A denied call stops at the gateway'],
      transfers: [['entry', 0.16], ['a', 0.85], ['entry', 1.84, 'denied']]
    },
    {
      gateway: ['匹配模型 B', 'Matches model B'],
      backends: [
        [['模型 A 后端', 'Model A Backend'], ['未选中', 'Not selected']],
        [['模型 B 后端', 'Model B Backend'], ['已选中', 'Selected']]
      ],
      target: 'b',
      caption: ['入口地址相同，目标模型不同', 'One API address, multiple models'],
      transfers: [['entry', 0.16], ['b', 0.85]]
    },
    {
      gateway: ['已选实例池', 'Pool selected'],
      backends: [
        [['端点 A', 'Endpoint A'], ['同一实例池', 'Same pool']],
        [['端点 B', 'Endpoint B'], ['同一实例池', 'Same pool']]
      ],
      target: 'a',
      picker: true,
      caption: ['虚线传选择信息，实线传请求', 'Dashed lines carry selection data'],
      result: ['网关向选定端点转发请求', 'The gateway forwards to the chosen endpoint'],
      transfers: [['entry', 0.16], ['ask', 0.85, 'control'], ['pick', 1.54, 'control'], ['a', 2.23]]
    },
    {
      gateway: ['按健康和优先级', 'Health and priority'],
      backends: [
        [['首选后端', 'Primary Backend'], ['不可用', 'Unavailable']],
        [['备用后端', 'Fallback Backend'], ['健康', 'Healthy']]
      ],
      target: 'b',
      caption: ['新请求发往健康的备用后端', 'New traffic goes to the healthy backend'],
      transfers: [['entry', 0.16], ['b', 0.85]]
    }
  ];

  function mount(host, options = {}) {
    const mobile = matchMedia('(max-width: 640px)');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const size = () => mobile.matches ? [344, 354] : [880, 347];
    const ratio = () => size()[0] / size()[1];
    const local = pair => pair[window.SS.lang() === 'en' ? 1 : 0];
    let step = 0, elapsed = 0, last, frame, packets, status, gate, selected, selectedPath, showingResult;
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
      const split = scene.backends.length > 1;
      const client = compact ? [scene.picker ? 88 : 172, 39, 144] : [120, 147, 166];
      const gateway = compact ? [scene.picker ? 88 : 172, 137, scene.picker ? 146 : 192] : [381, 147, 211];
      const backends = compact
        ? [[split ? 88 : 172, 253, 154], [256, 253, 154]]
        : [[744, split ? 77 : 147, 220], [744, 219, 220]];
      const picker = compact ? [256, 137, 154] : [381, 254, 211];

      host.replaceChildren();
      const svg = add(host, 'svg', {
        viewBox: `0 0 ${w} ${h}`, role: 'img',
        'aria-label': `${local(window.SS_TOPIC_CFG.steps[step].t)}. ${local(scene.result || scene.caption)}`
      }, 'diagram');
      const paths = {};
      function connect(key, points, tone = '') {
        const d = points.map(([x, y]) => `${x} ${y}`).join(' L');
        const path = add(svg, 'path', {d: 'M' + d, 'data-tone': tone}, 'link');
        function arrow([x, y], [fromX, fromY], color) {
          const angle = Math.atan2(y - fromY, x - fromX) * 180 / Math.PI;
          return add(svg, 'path', {
            d: 'M-7 -4 L0 0 L-7 4', 'data-tone': color,
            transform: `translate(${x} ${y}) rotate(${angle})`
          }, 'arrow');
        }
        const end = arrow(points.at(-1), points.at(-2), tone);
        if (step === 0) arrow(points[0], points[1], 'return');
        paths[key] = path;
        return [path, end];
      }
      const [gx, gy, gw] = gateway;
      connect('entry', compact
        ? [[client[0], client[1] + 29], [gx, gy - 29]]
        : [[client[0] + client[2] / 2, gy], [gx - gw / 2, gy]]);
      scene.backends.forEach((_, i) => {
        const key = i === 0 ? 'a' : 'b';
        const [x, y, width] = backends[i];
        const points = compact
          ? [[gx, gy + 29], [gx, 196], [x, 196], [x, y - 29]]
          : [[gx + gw / 2, gy], [558, gy], [558, y], [x - width / 2, y]];
        const marks = connect(key, points, split && key !== scene.target ? 'idle' : 'active');
        if (step === 1 || (scene.picker && key === scene.target)) selectedPath = marks;
      });
      if (scene.picker) {
        if (compact) {
          connect('ask', [[161, 126], [179, 126]], 'control');
          connect('pick', [[179, 148], [161, 148]], 'control');
        } else {
          connect('ask', [[350, 176], [350, 225]], 'control');
          connect('pick', [[413, 225], [413, 176]], 'control');
        }
      }

      function label(parent, x, y, pair, cls) {
        return add(parent, 'text', {x, y, 'text-anchor': 'middle'}, cls, local(pair));
      }
      function card([x, y, width], title, detail, state = '') {
        const group = add(svg, 'g', {'data-state': state}, 'node');
        add(group, 'rect', {x: x - width / 2, y: y - 29, width, height: 58, rx: 4}, 'card');
        label(group, x, y - 3, title, 'title');
        label(group, x, y + 17, detail, 'detail');
        return group;
      }
      card(client, ['应用', 'Application'], step === 2 ? ['请求模型 B', 'Calls model B'] : ['推理调用', 'Inference call']);
      gate = card(gateway, ['推理网关', 'Gateway'], scene.gateway);
      scene.backends.forEach(([title, detail], i) => {
        const state = step === 4 && i === 0 ? 'unavailable'
          : split && (i === 0 ? 'a' : 'b') !== scene.target ? 'idle' : 'selected';
        const group = card(backends[i], title, detail, state);
        if ((step === 1 || scene.picker) && i === 0) selected = group;
      });
      if (scene.picker) card(picker, ['端点选择器', 'Endpoint Picker'], ['返回所选端点', 'Returns endpoint'], 'control');
      status = label(svg, w / 2, h - 34, scene.caption, 'status');
      label(svg, w / 2, h - 12, note, 'note');

      packets = scene.transfers.map(([key, start, tone = 'request']) => {
        const path = paths[key];
        const marker = add(svg, 'rect', {width: 10, height: 10, rx: 2, 'data-tone': tone}, 'packet');
        return {path, start, tone, marker, length: path.getTotalLength()};
      });
      options.onLayout?.(ratio(), compact);
    }

    function paint(time) {
      const scene = scenes[step];
      const still = motion.matches;
      const denied = step === 1 && (still || time >= 2.51);
      const picked = scene.picker && (still || time >= 2.23);
      if (showingResult !== (denied || picked)) {
        showingResult = denied || picked;
        if (scene.result) status.textContent = local(showingResult ? scene.result : scene.caption);
        gate.dataset.state = denied ? 'unavailable' : '';
        if (step === 1 || scene.picker) {
          const forwarding = scene.picker ? picked : !denied;
          selected.dataset.state = forwarding ? 'selected' : '';
          selectedPath.forEach(mark => { mark.dataset.tone = forwarding ? 'active' : 'idle'; });
        }
      }
      for (const {path, start, tone, marker, length} of packets) {
        const p = (time - start) / 0.68;
        const atEnd = tone === 'denied' && (still || (p >= 1 && time < 3.6));
        const visible = atEnd || (!still && p >= 0 && p <= 1);
        marker.style.visibility = visible ? 'visible' : 'hidden';
        if (!visible) continue;
        const progress = atEnd ? 1 : tone === 'return' ? 1 - p : p;
        const point = path.getPointAtLength(length * progress);
        marker.setAttribute('x', point.x - 5);
        marker.setAttribute('y', point.y - 5);
        marker.style.opacity = atEnd ? '1' : Math.min(1, (1 - p) * 10);
      }
    }

    function tick(now) {
      elapsed += Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      paint(elapsed % 4.3);
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
  window.SSAnim[id] = {steps: 5, mount};
})();
