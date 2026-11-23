(() => {
  const id = 'd-kvp';
  const scenes = [
    {nodes: [
      [["GPU 显存", "GPU Memory"], ["KV 块", "KV Blocks"]],
      [["EXAScaler", "EXAScaler"], ["缓存文件", "Cache Files"]],
      [["Infinia", "Infinia"], ["键值数据集", "Key-Value Dataset"]]
    ], flow: "write", split: true},
    {tabs: {
      "vllm": {nodes: [
        [["vLLM", "vLLM"], ["GPU 显存", "GPU Memory"]],
        [["GPUDirect Storage", "GPUDirect Storage"], ["文件传输", "File Transfers"]],
        [["EXAScaler", "EXAScaler"], ["缓存文件", "Cache Files"]]
      ], flow: "both"},
      "dynamo": {nodes: [
        [["Dynamo worker", "Dynamo Worker"], ["推理引擎 · GPU", "Serving Engine · GPU"]],
        [["缓存组件", "Cache Component"], ["LMCache", "LMCache"]],
        [["传输组件", "Transfer Library"], ["NIXL", "NIXL"]],
        [["EXAScaler", "EXAScaler"], ["缓存文件", "Cache Files"]]
      ], flow: "both"}
    }},
    {nodes: [
      [["GPU 显存", "GPU Memory"], ["KV 块", "KV Blocks"]],
      [["NIXL 存储插件", "NIXL Storage Plugin"], ["客户端库 · RDMA", "Client SDK · RDMA"]],
      [["Infinia", "Infinia"], ["键值数据集", "Key-Value Dataset"]]
    ], flow: "both"},
    {tabs: {
      "dynamo-infinia": {nodes: [
        [["Dynamo worker", "Dynamo Worker"], ["GPU 显存", "GPU Memory"]],
        [["NIXL 存储插件", "NIXL Storage Plugin"], ["客户端库 · RDMA", "Client SDK · RDMA"]],
        [["Infinia", "Infinia"], ["键值数据集", "Key-Value Dataset"]]
      ], flow: "both"},
      "vllm-infinia": {nodes: [
        [["vLLM", "vLLM"], ["GPU 显存", "GPU Memory"]],
        [["LMCache", "LMCache"], ["主机 DRAM", "Host DRAM"]],
        [["NIXL 存储插件", "NIXL Storage Plugin"], ["客户端库", "Client SDK"]],
        [["Infinia", "Infinia"], ["键值数据集", "Key-Value Dataset"]]
      ], flow: "both"}
    }},
    {nodes: [
      [["Infinia", "Infinia"], ["键值数据集", "Key-Value Dataset"]],
      [["NIXL 存储插件", "NIXL Storage Plugin"], ["客户端库 · RDMA", "Client SDK · RDMA"]],
      [["目标 GPU", "Destination GPU"], ["命中前缀 · 新 KV", "Prefix Hit · New KV"]]
    ], flow: "read", fresh: true},
  ];
  const NS = 'http://www.w3.org/2000/svg';
  const layout = matchMedia('(max-width: 720px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function mount(host, {onLayout, paused = false} = {}) {
    const svg = document.createElementNS(NS, 'svg');
    svg.classList.add(id + '-scene');
    svg.setAttribute('role', 'img');
    host.replaceChildren(svg);

    let index = 0, key, frame, last, elapsed, draw, cycle;
    const ratio = () => layout.matches ? 420 / 466 : 960 / 337;
    const t = pair => pair[window.SS_LANG === 'en' ? 1 : 0];
    function add(tag, cls, attributes, parent = svg) {
      const el = document.createElementNS(NS, tag);
      el.setAttribute('class', cls);
      for (const [k, v] of Object.entries(attributes)) el.setAttribute(k, v);
      parent.append(el);
      return el;
    }
    function text(x, y, phrase, cls = 'label') {
      add('text', cls, {x, y}).textContent = t(phrase);
    }
    function block(cls) {
      return add('rect', 'block ' + cls, {x: -11, y: -8, width: 22, height: 16, rx: 3});
    }
    function place(el, {x, y}, opacity) {
      el.setAttribute('transform', `translate(${x} ${y})`);
      el.style.opacity = opacity;
    }

    function build() {
      svg.replaceChildren();
      const scene = scenes[index];
      const {nodes, flow, fresh, split} = scene.tabs ? (scene.tabs[key] || Object.values(scene.tabs)[0]) : scene;
      const mobile = layout.matches;
      const W = mobile ? 420 : 960, H = mobile ? 466 : 337;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      cycle = flow === 'both' || split ? 7.1 : 4.25;
      const direction = flow === 'both' ? ['写入与读回', 'Write and Reload']
        : flow === 'read' ? ['读回', 'Reload'] : ['写入', 'Write'];
      svg.setAttribute('aria-label', t(direction) + ' · ' + nodes.map(([name, detail]) => t(name) + ' (' + t(detail) + ')').join(' / '));
      const upright = mobile && !split;
      const xGap = W / nodes.length;
      const points = nodes.map((_, i) => {
        if (split) {
          if (mobile) return i === 0 ? {x: 210, y: 149} : {x: i === 1 ? 108 : 312, y: 359};
          return i === 0 ? {x: 162, y: 180} : {x: 772, y: i === 1 ? 116 : 254};
        }
        return upright ? {x: 338, y: 246 + (i - (nodes.length - 1) / 2) * 87}
          : {x: xGap * (i + 0.5), y: 199};
      });
      const source = points[0], endpoints = split ? points.slice(1) : [points.at(-1)];
      const routes = endpoints.map(end => {
        let d = `M ${source.x} ${source.y} L ${end.x} ${end.y}`;
        if (split) {
          const center = mobile ? (source.y + end.y) / 2 : (source.x + end.x) / 2;
          d = mobile ? `M ${source.x} ${source.y} V ${center} H ${end.x} V ${end.y}`
            : `M ${source.x} ${source.y} H ${center} V ${end.y} H ${end.x}`;
        }
        const path = add('path', 'track', {d});
        return {path, length: path.getTotalLength()};
      });
      points.forEach(({x, y}, i) => {
        const w = upright ? 360 : mobile ? 182 : split ? 240 : Math.min(xGap - 36, 246);
        const cx = upright ? W / 2 : x;
        add('rect', 'node', {x: cx - w / 2, y: y - (upright ? 36 : 77), width: w, height: upright ? 72 : 102, rx: 8});
        const tx = upright ? 178 : cx;
        text(tx, y - (upright ? 8 : 47), nodes[i][0]);
        text(tx, y + (upright ? 18 : -21), nodes[i][1], 'detail');
        add('rect', 'slot', {x: x - 16, y: y - 12, width: 32, height: 24, rx: 4});
        if (fresh && i === points.length - 1) add('rect', 'slot', {x: x + 21, y: y - 12, width: 30, height: 24, rx: 4});
      });

      const phase = add('text', 'phase', {x: W / 2, y: mobile ? 40 : 42});
      text(W / 2, H - 18, ['示意，不代表实测数字', 'Schematic, no measured figures'], 'note');
      const arrowShape = reducedMotion.matches && flow === 'both'
        ? 'M-3 -4 L-8 0 L-3 4 M3 -4 L8 0 L3 4' : 'M-5 -5 L1 0 L-5 5';
      const arrowPaths = split ? [] : points.slice(1).map(() => add('path', 'arrow', {d: arrowShape}));
      const original = block('original');
      place(original, source, 1);
      const saved = endpoints.map(() => block('saved'));
      const packets = routes.map(() => block('packet'));
      const next = fresh ? block('fresh') : null;
      const back = flow === 'both' ? block('saved') : null;
      return (time, still) => {
        const isReturn = flow === 'both' && time >= 3.3;
        const action = split ? ['存储后端', 'Storage Options'] : still ? direction : (isReturn || flow === 'read') ? ['读回', 'Reload'] : ['写入', 'Write'];
        phase.textContent = t(action);
        const progressAt = offset => Math.max(0, Math.min(1, (time - offset - 0.45) / 2.15));
        const progress = progressAt(isReturn ? 3.3 : 0);
        const fade = still ? 1 : Math.min(1, (cycle - time) / 0.45);
        place(original, source, isReturn ? 0 : 1);
        routes.forEach(({path, length}, i) => {
          const p = split ? progressAt(i * 3.3) : progress;
          const eased = p * p * (3 - 2 * p);
          const distance = isReturn ? 1 - eased : eased;
          place(packets[i], path.getPointAtLength(length * distance), !still && p > 0 && p < 1 ? 1 : 0);
          place(saved[i], endpoints[i], still || isReturn || p === 1 ? fade : 0);
        });
        arrowPaths.forEach((arrow, i) => {
          const a = points[i], b = points[i + 1];
          const angle = (upright ? 90 : 0) + (isReturn ? 180 : 0);
          arrow.setAttribute('transform', `translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2}) rotate(${angle})`);
        });
        if (back) place(back, source, !still && isReturn && progress === 1 ? fade : 0);
        if (next) {
          const {x, y} = endpoints[0];
          place(next, {x: x + 36, y}, still || time >= 2.9 ? fade : 0);
        }
      };
    }

    function tick(now) {
      elapsed += Math.min(50, Math.max(0, now - last)) / 1000;
      last = now;
      draw(elapsed % cycle, false);
      frame = requestAnimationFrame(tick);
    }
    function run() {
      cancelAnimationFrame(frame);
      if (paused || reducedMotion.matches) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
    function rebuild() {
      elapsed = 0;
      draw = build();
      draw(0, reducedMotion.matches);
      onLayout?.(ratio(), layout.matches);
      run();
    }
    function pause() {
      paused = true;
      cancelAnimationFrame(frame);
    }
    const ctrl = {
      show(i, tab) { index = i; key = tab; rebuild(); },
      pause,
      resume() { if (paused) { paused = false; run(); } },
      destroy() {
        pause();
        layout.removeEventListener('change', rebuild);
        reducedMotion.removeEventListener('change', rebuild);
        document.removeEventListener('ss-lang', rebuild);
        delete host.__anim;
        svg.remove();
      },
      ratio,
      step: () => index,
    };
    host.__anim = ctrl;
    layout.addEventListener('change', rebuild);
    reducedMotion.addEventListener('change', rebuild);
    document.addEventListener('ss-lang', rebuild);
    rebuild();
    return ctrl;
  }

  (window.SSAnim ||= {})[id] = {steps: 5, mount};
})();
