(function () {
  const id = 'w-wsnap';
  const namespace = 'http://www.w3.org/2000/svg';
  const live = '活动文件系统|Live Filesystem';
  const source = '只读源快照|Read-Only Source';
  const clone = '可写克隆|Writable Clone';
  const capture = '捕获|Capture';
  const scenes = [
    {
      summary: '活动文件系统的 A 版被捕获到只读快照|The read-only snapshot captures version A from the live filesystem',
      cards: [[live], [source]],
      shared: 'A',
      links: [{from: 0, to: 1, label: capture, start: 0.5}]
    },
    {
      summary: '源快照保留 A 版，新的可写克隆也从 A 版开始|The source keeps version A and the new writable clone starts with version A',
      cards: [[source], [clone]],
      shared: 'A',
      links: [{from: 0, to: 1, label: '派生分支|Fork Clone', start: 0.5}]
    },
    {
      summary: '测试写入使克隆变为 B 版，只读源仍是 A 版|A test write changes the clone to version B while the source keeps version A',
      cards: [[source, 'A'], [clone, 'A'], ['测试写入|Test Write', 'B']],
      links: [{from: 2, to: 1, version: 'B', start: 0.5}]
    },
    {
      summary: '可写克隆保持 B 版，无法改回只读|The writable clone holds version B and cannot revert to read-only',
      cards: [[source, 'A'], [clone, 'B']],
      denied: '×  切换为只读|×  Switch to Read-Only',
      links: []
    },
    {
      summary: '可写克隆派生新的只读快照，后者可上传到对象存储|The writable clone yields a new read-only snapshot that can be uploaded to object storage',
      cards: [[clone], ['新只读快照|Read-Only Snapshot'], ['对象存储|Object Store', 'B']],
      shared: 'B',
      links: [
        {from: 0, to: 1, label: capture, start: 0.45},
        {from: 1, to: 2, label: '上传|Upload', version: 'B', start: 1.95}
      ]
    }
  ];

  function mount(host, {onLayout, paused = false} = {}) {
    const narrow = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(namespace, 'svg');
    svg.classList.add(id + '-scene');
    svg.setAttribute('role', 'img');
    host.replaceChildren(svg);

    let step = 0, ratio, elapsed = 0, last, frame, cards, transfers;
    const duration = 1.08;

    function add(tag, attrs, parent = svg) {
      const node = document.createElementNS(namespace, tag);
      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
      parent.append(node);
      return node;
    }

    function text(x, y, value, kind, parent, anchor = 'middle') {
      const node = add('text', {x, y, 'text-anchor': anchor, class: id + '-' + kind}, parent);
      node.textContent = value;
      return node;
    }

    function file(parent, x, y, kind) {
      const group = add('g', {class: id + '-' + kind, transform: `translate(${x} ${y})`}, parent);
      add('rect', {x: -14, y: -13, width: 28, height: 26, rx: 4, class: id + '-file'}, group);
      return {group, label: text(0, 0, '', 'version', group)};
    }

    function render() {
      const mobile = narrow.matches;
      const [width, height] = mobile ? [360, 394] : [820, 276];
      const {summary, cards: entries, links, shared, denied} = scenes[step];
      const language = window.SS_LANG === 'en' ? 1 : 0;
      const t = pair => pair.split('|')[language];
      const three = entries.length === 3;
      const positions = mobile
        ? (shared ? [65, 179, 315] : denied ? [83, 248] : [56, 177, 304])
        : (three ? [128, 410, 692] : [201, 619]);
      const w = mobile ? (shared ? 214 : 260) : three ? 232 : 250;
      const h = shared ? 62 : mobile ? 76 : 96;
      const axis = mobile ? (shared ? 123 : width / 2) : (shared ? 97 : 133);
      const centers = entries.map((_, i) => mobile ? [axis, positions[i]] : [positions[i], axis]);

      ratio = width / height;
      svg.replaceChildren();
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.setAttribute('aria-label', t(summary));
      transfers = [];

      for (const {from, to, label, version, start} of links) {
        const sign = Math.sign(to - from);
        const offset = (mobile ? h : w) / 2;
        const first = positions[from] + sign * offset;
        const lastPoint = positions[to] - sign * (offset + 2);
        const mid = (first + lastPoint) / 2;
        const [startX, startY] = mobile ? [axis, first] : [first, axis];
        const [endX, endY] = mobile ? [axis, lastPoint] : [lastPoint, axis];
        const path = add('path', {d: `M${startX} ${startY} L${endX} ${endY}`,
          class: id + '-path' + (version ? '' : ' ' + id + '-control')});
        const tip = 'M-6 -5 L0 0 L-6 5';
        const angle = (mobile ? 90 : 0) + (sign < 0 ? 180 : 0);
        add('path', {d: tip, transform: `translate(${endX} ${endY}) rotate(${angle})`,
          class: path.getAttribute('class')});
        if (label) {
          const x = mobile ? axis + 16 : mid;
          const y = mobile ? mid : axis - 29;
          text(x, y, t(label), 'note', svg, mobile ? 'start' : 'middle');
        }
        transfers.push({to, version, start, path, length: path.getTotalLength()});
      }

      const blockX = mobile ? 300 : (positions[0] + positions[1]) / 2;
      const blockY = mobile ? 211 : 221;
      const references = shared ? centers.slice(0, 2).map(([x, y], i) => {
        const lane = i ? 7 : -7;
        const rail = blockX - (i ? 47 : 29);
        const d = mobile
          ? `M${x+w/2} ${y} H${rail} V${blockY+lane} H${blockX-14}`
          : `M${x} ${y+h/2} V${blockY} H${blockX+(i ? 14 : -14)}`;
        return add('path', {d, class: id + '-path'});
      }) : [];
      if (shared) {
        const block = file(svg, blockX, blockY, 'slot');
        block.label.textContent = shared;
        text(blockX, mobile ? blockY+25 : blockY-27, t('共享数据|Shared Data'), 'note');
      }

      cards = centers.map(([x, y], i) => {
        const group = add('g', {transform: `translate(${x} ${y})`});
        add('rect', {x: -w / 2, y: -h / 2, width: w, height: denied && i === 1 ? h+42 : h, rx: 6, class: id + '-card'}, group);
        const initial = entries[i][1];
        text(0, initial ? (shared ? -13 : mobile ? -15 : -20) : 0, t(entries[i][0]), 'title', group);
        if (denied && i === 1) text(0, h/2+21, t(denied), 'denied', group);
        if (!initial) return {reference: references[i]};
        return {...file(group, 0, shared ? 13 : mobile ? 16 : 18, 'slot'), initial};
      });
      for (const transfer of transfers) {
        if (transfer.version) {
          transfer.packet = file(svg, 0, 0, 'packet').group;
          transfer.packet.querySelector('text').textContent = transfer.version;
        } else {
          transfer.packet = add('circle', {r: 4, class: id + '-signal'});
        }
      }
      text(width / 2, height - 17, t('示意，不代表实测数字|Schematic, not measured'), 'note');
      onLayout?.(ratio, mobile);
    }

    function paint() {
      const end = (transfers.at(-1)?.start ?? 0) + duration;
      const time = reduced.matches ? end : elapsed;
      for (const [i, card] of cards.entries()) {
        const incoming = transfers.find(transfer => transfer.to === i);
        const arrived = incoming && time >= incoming.start + duration;
        if (card.reference) {
          card.reference.setAttribute('visibility', !incoming || arrived ? 'visible' : 'hidden');
          continue;
        }
        const waiting = incoming && !arrived && step !== 2;
        const version = waiting ? '' : arrived ? incoming.version : card.initial;
        if (card.label.textContent !== version) card.label.textContent = version;
        card.group.classList.toggle(id + '-empty', !!waiting);
      }
      for (const {path, length, start, packet} of transfers) {
        const progress = (time - start) / duration;
        const visible = !reduced.matches && progress >= 0 && progress < 1;
        packet.setAttribute('visibility', visible ? 'visible' : 'hidden');
        if (!visible) continue;
        const {x, y} = path.getPointAtLength(progress * length);
        packet.setAttribute('transform', `translate(${x} ${y})`);
        packet.setAttribute('opacity', Math.min(1, progress * 9, (1 - progress) * 9));
      }
    }

    function tick(now) {
      elapsed += Math.max(0, (now - last) / 1000);
      last = now;
      paint();
      if (elapsed < transfers.at(-1).start + duration) frame = requestAnimationFrame(tick);
    }

    function run() {
      if (paused || reduced.matches || !transfers.length ||
          elapsed >= transfers.at(-1).start + duration) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }

    function refresh() {
      cancelAnimationFrame(frame);
      render();
      paint();
      run();
    }

    narrow.addEventListener('change', refresh);
    reduced.addEventListener('change', refresh);
    document.addEventListener('ss-lang', refresh);
    const control = {
      show(i) {
        step = Math.max(0, Math.min(scenes.length - 1, i));
        elapsed = 0;
        refresh();
      },
      pause() {
        paused = true;
        cancelAnimationFrame(frame);
      },
      resume() {
        if (!paused) return;
        paused = false;
        run();
      },
      destroy() {
        control.pause();
        narrow.removeEventListener('change', refresh);
        reduced.removeEventListener('change', refresh);
        document.removeEventListener('ss-lang', refresh);
        svg.remove();
        delete host.__anim;
      },
      ratio() { return ratio; },
      step() { return step; }
    };
    host.__anim = control;
    control.show(0);
    return control;
  }

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[id] = {steps: scenes.length, mount};
})();
