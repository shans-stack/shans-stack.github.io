(function () {
  const id = 'd-horizon';
  const scenes = [
    [[[["AI 云服务", "AI Cloud Services"], ["开通请求", "Provisioning request"]]], [["Horizon", "Horizon"], ["编排控制平面", "Orchestration control plane"]], [[["基础设施", "Infrastructure"], ["GPU、CPU、网络", "GPU, CPU, network"]], [["数据服务", "Data Services"], ["Infinia、EXAScaler", "Infinia, EXAScaler"]]]],
    [[[["租户", "Tenant"], ["提交目录申请", "Catalog request"]]], [["Horizon", "Horizon"], ["自助服务目录", "Self-service catalog"]], [[["GPU 与存储", "GPU and Storage"], ["基础资源", "Infrastructure resources"]], [["GPU Notebook", "GPU Notebook"], ["交互开发环境", "Interactive workspace"]]]],
    [[[["租户 A", "Tenant A"], ["申请资源", "Resource request"]], [["租户 B", "Tenant B"], ["申请资源", "Resource request"]]], [["Horizon", "Horizon"], ["租户模板与策略", "Tenant templates and policy"]], [[["资源范围 A", "Resource Scope A"], ["授权给租户 A", "Assigned to tenant A"]], [["资源范围 B", "Resource Scope B"], ["授权给租户 B", "Assigned to tenant B"]]], true],
    [[[["管理操作", "Service Operations"], ["训练或部署", "Training or deployment"]]], [["Horizon", "Horizon"], ["生命周期管理", "Lifecycle management"]], [[["训练任务", "Training Jobs"], ["保存检查点", "Save checkpoints"]], [["NIM 推理端点", "NIM Endpoints"], ["部署模型服务", "Deploy model services"]]]],
    [[[["计算用量", "Compute Usage"], ["按租户归集", "Attributed to tenants"]]], [["Horizon", "Horizon"], ["用量跟踪", "Usage tracking"]], [[["成本分摊", "Chargeback"], ["归属资源成本", "Assign resource costs"]], [["计费", "Billing"], ["服务用量", "Service usage"]]]]
  ];

  function mount(host, opts = {}) {
    const compact = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add(id + '-scene');
    svg.setAttribute('role', 'img');
    host.replaceChildren(svg);

    let step = 0, ratio, timer, last, elapsed, paused = false, tracks;
    const say = labels => labels[window.SS.lang() === 'en' ? 1 : 0];
    const pair = (title, detail) => [say(title), say(detail)];

    function board() {
      cancelAnimationFrame(timer);
      elapsed = 0;
      const mobile = compact.matches;
      const [width, height] = mobile ? [360, 366] : [770, 280];
      const [inputs, control, outputs, separate, feedback] = scenes[step];
      ratio = width / height;
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

      const middle = mobile ? [56, 132, 248, 66] : [272, 97, 226, 66];
      const boxes = (nodes, end) => nodes.map((node, i) => {
        if (mobile) return nodes.length === 1 ? [80, end ? 256 : 18, 200, 66]
          : [12 + i * 172, end ? 256 : 18, 164, 66];
        return [end ? 548 : 14, nodes.length === 1 ? 97 : 41 + i * 112, 208, 66];
      });
      const before = boxes(inputs, false);
      const after = boxes(outputs, true);

      function card(node, box, featured = false) {
        const [x, y, w, h] = box;
        const [title, detail] = pair(...node);
        return `<foreignObject x="${x}" y="${y}" width="${w}" height="${h}">
          <div class="${id}-card${featured ? ' ' + id + '-focus' : ''}">
            <span class="${id}-title">${title}</span>
            <span class="${id}-detail">${detail}</span>
          </div>
        </foreignObject>`;
      }
      function edge(box, incoming, slot = 0) {
        const [x, y, w, h] = box;
        return mobile ? [x + w / 2 + slot, incoming ? y : y + h]
          : [incoming ? x : x + w, y + h / 2 + slot];
      }
      function connect(start, end, split = false) {
        const [x, y] = start, [a, b] = end;
        if (mobile) {
          const lane = y + (b - y) * (split ? 0.64 : 0.5);
          return [start, [x, lane], [a, lane], end];
        }
        const lane = x + (a - x) * (split ? 0.64 : 0.5);
        return [start, [lane, y], [lane, b], end];
      }
      const routes = [];
      function route(points, start, tone, back = false) {
        const [x, y] = points.at(-1), [px, py] = points.at(-2);
        const angle = Math.atan2(y - py, x - px) * 180 / Math.PI;
        routes.push({ points, x, y, angle, start, tone, back });
      }
      const branch = (count, i) => count === 2 ? (i === 0 ? -1 : 1) * (mobile ? 54 : 16) : 0;
      before.forEach((box, i) => {
        route(connect(edge(box, false), edge(middle, true, branch(before.length, i))),
          0.18 + i * 0.88, separate && i ? 'alternate' : 'signal');
      });
      const rolloutStart = before.length === 2 && !separate ? 2.02 : 1.18;
      after.forEach((box, i) => {
        route(connect(edge(middle, false, branch(after.length, i)), edge(box, true), true),
          rolloutStart + i * 0.88, separate && i ? 'alternate' : 'signal');
      });
      if (feedback) {
        const points = mobile ? [[280, 289], [333, 289], [333, 165], [304, 165]]
          : [[652, 163], [652, 223], [385, 223], [385, 163]];
        route(points, 3.02, 'alternate', true);
      }

      const note = say(['示意，不代表实测数字', 'Schematic · No measured values']);
      const summary = [inputs.map(node => say(node[0])).join(' / '), say(control[0]),
        outputs.map(node => say(node[0])).join(' / ')].join(' → ');
      svg.setAttribute('aria-label', [summary, feedback ? say(feedback) : '', note].filter(Boolean).join('. '));
      svg.innerHTML = routes.map(({points, x, y, angle, tone, back}) => `
        <path class="${id}-route${back ? ' ' + id + '-return' : ''}${tone === 'alternate' ? ' ' + id + '-secondary' : ''}" d="M${points.map(point => point.join(' ')).join(' L')}"/>
        <path class="${id}-arrow${tone === 'alternate' ? ' ' + id + '-alternate' : ''}" d="M-7 -4L0 0L-7 4Z" transform="translate(${x} ${y}) rotate(${angle})"/>
      `).join('') + inputs.map((node, i) => card(node, before[i])).join('')
        + card(control, middle, true) + outputs.map((node, i) => card(node, after[i])).join('')
        + (feedback ? `<text class="${id}-label" x="${mobile ? 324 : 518}" y="${mobile ? 231 : 245}"
             text-anchor="${mobile ? 'end' : 'middle'}">${say(feedback)}</text>` : '')
        + `<text class="${id}-note" x="${width / 2}" y="${height - 12}" text-anchor="middle">${note}</text>`
        + routes.map(({tone}) => `<rect class="${id}-${tone}" width="10" height="8" rx="2" opacity="0"/>`).join('');

      const packets = svg.querySelectorAll(`rect.${id}-signal, rect.${id}-alternate`);
      tracks = Array.from(svg.querySelectorAll(`.${id}-route`), (line, i) => ({
        line, length: line.getTotalLength(), packet: packets[i], start: routes[i].start
      }));
      opts.onLayout?.(ratio, mobile);
      play();
    }

    function animate(now) {
      elapsed = (elapsed + Math.max(0, now - last) / 1000) % 4;
      last = now;
      for (const {line, length, packet, start} of tracks) {
        const progress = Math.max(0, Math.min(1, (elapsed - start) / 0.76));
        const point = line.getPointAtLength(progress * length);
        packet.setAttribute('x', point.x - 5);
        packet.setAttribute('y', point.y - 4);
        packet.setAttribute('opacity', Math.min(1, progress * 8, (1 - progress) * 8));
      }
      timer = requestAnimationFrame(animate);
    }
    function play() {
      if (paused || reduced.matches) return;
      last = performance.now();
      timer = requestAnimationFrame(animate);
    }

    for (const query of [compact, reduced]) query.addEventListener('change', board);
    document.addEventListener('ss-lang', board);
    board();
    const control = {
      show(i) { step = Math.max(0, Math.min(scenes.length - 1, i)); board(); },
      pause() { paused = true; cancelAnimationFrame(timer); },
      resume() { if (paused) { paused = false; play(); } },
      destroy() {
        control.pause();
        for (const query of [compact, reduced]) query.removeEventListener('change', board);
        document.removeEventListener('ss-lang', board);
        svg.remove();
        delete host.__anim;
      },
      ratio() { return ratio; },
      step() { return step; }
    };
    host.__anim = control;
    return control;
  }

  (window.SSAnim ||= {})[id] = { steps: 5, mount };
})();
