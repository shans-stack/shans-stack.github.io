(() => {
  const id = 'd-compress';
  const scenes = [
  {
    "shape": "pair",
    "nodes": [
      {
        "title": [
          "应用",
          "Application"
        ],
        "detail": [
          "原始字节",
          "Original Bytes"
        ],
        "blocks": "A A A",
        "tone": "data"
      },
      {
        "title": [
          "EXAScaler 客户端",
          "EXAScaler Client"
        ],
        "detail": [
          "压缩表示",
          "Encoded Data"
        ],
        "blocks": "",
        "tone": "data"
      }
    ],
    "edges": [
      {
        "from": 0,
        "to": 1,
        "blocks": "A A A",
        "tone": "data",
        "start": 0.4,
        "duration": 1.25
      }
    ],
    "updates": [
      {
        "node": 1,
        "at": 1.65,
        "detail": [
          "压缩表示",
          "Encoded Data"
        ],
        "blocks": "A×3",
        "tone": "data"
      }
    ]
  },
  {
    "shape": "pair",
    "nodes": [
      {
        "title": [
          "EXAScaler 客户端",
          "EXAScaler Client"
        ],
        "detail": [
          "压缩后发送",
          "Encode Before Sending"
        ],
        "blocks": "A×3",
        "tone": "data"
      },
      {
        "title": [
          "存储目标",
          "Storage Target"
        ],
        "detail": [
          "写入目标",
          "Write to Target"
        ],
        "blocks": "",
        "tone": "data"
      }
    ],
    "edges": [
      {
        "from": 0,
        "to": 1,
        "blocks": "A×3",
        "tone": "data",
        "start": 0.4,
        "duration": 1.25
      }
    ],
    "updates": [
      {
        "node": 1,
        "at": 1.65,
        "detail": [
          "压缩表示",
          "Encoded Data"
        ],
        "blocks": "A×3",
        "tone": "data"
      }
    ]
  },
  {
    "shape": "chain",
    "nodes": [
      {
        "title": [
          "应用",
          "Application"
        ],
        "detail": [
          "等待读取",
          "Waiting for Data"
        ],
        "blocks": "",
        "tone": "idle"
      },
      {
        "title": [
          "EXAScaler 客户端",
          "EXAScaler Client"
        ],
        "detail": [
          "解压",
          "Decode"
        ],
        "blocks": "",
        "tone": "data"
      },
      {
        "title": [
          "存储目标",
          "Storage Target"
        ],
        "detail": [
          "压缩表示",
          "Encoded Data"
        ],
        "blocks": "A×3",
        "tone": "data"
      }
    ],
    "edges": [
      {
        "from": 2,
        "to": 1,
        "blocks": "A×3",
        "tone": "data",
        "start": 0.4,
        "duration": 1.25
      },
      {
        "from": 1,
        "to": 0,
        "blocks": "A A A",
        "tone": "data",
        "start": 1.65,
        "duration": 1.25
      }
    ],
    "updates": [
      {
        "node": 1,
        "at": 1.65,
        "detail": [
          "解压完成",
          "Decoded"
        ],
        "blocks": "A A A",
        "tone": "data"
      },
      {
        "node": 0,
        "at": 2.9,
        "detail": [
          "原始字节",
          "Original Bytes"
        ],
        "blocks": "A A A",
        "tone": "data"
      }
    ]
  },
  {
    "shape": "dual",
    "nodes": [
      {
        "title": [
          "重复数据",
          "Repeated Data"
        ],
        "detail": [
          "原始字节",
          "Original Bytes"
        ],
        "blocks": "A A A",
        "tone": "data"
      },
      {
        "title": [
          "已压缩数据",
          "Compressed Input"
        ],
        "detail": [
          "原始字节",
          "Original Bytes"
        ],
        "blocks": "B C D",
        "tone": "meta"
      },
      {
        "title": [
          "编码结果",
          "Encoded Output"
        ],
        "detail": [
          "占用缩小",
          "Smaller Footprint"
        ],
        "blocks": "",
        "tone": "data"
      },
      {
        "title": [
          "编码结果",
          "Encoded Output"
        ],
        "detail": [
          "占用近似",
          "Similar Footprint"
        ],
        "blocks": "",
        "tone": "meta"
      }
    ],
    "edges": [
      {
        "from": 0,
        "to": 2,
        "blocks": "A×3",
        "tone": "data",
        "start": 0.4,
        "duration": 1.25
      },
      {
        "from": 1,
        "to": 3,
        "blocks": "B C D",
        "tone": "meta",
        "start": 0.4,
        "duration": 1.25
      }
    ],
    "updates": [
      {
        "node": 2,
        "at": 1.65,
        "detail": [
          "占用缩小",
          "Smaller Footprint"
        ],
        "blocks": "A×3",
        "tone": "data"
      },
      {
        "node": 3,
        "at": 1.65,
        "detail": [
          "占用近似",
          "Similar Footprint"
        ],
        "blocks": "B C D",
        "tone": "meta"
      }
    ]
  },
  {
    "shape": "chain",
    "nodes": [
      {
        "title": [
          "存储类",
          "StorageClass"
        ],
        "detail": [
          "压缩算法",
          "Compression"
        ],
        "blocks": "lz4",
        "tone": "meta"
      },
      {
        "title": [
          "EXAScaler CSI",
          "EXAScaler CSI"
        ],
        "detail": [
          "读取参数",
          "Reads Parameter"
        ],
        "blocks": "",
        "tone": "data"
      },
      {
        "title": [
          "供应卷",
          "Provisioned Volume"
        ],
        "detail": [
          "配置压缩",
          "Compression Config"
        ],
        "blocks": "",
        "tone": "data"
      }
    ],
    "edges": [
      {
        "from": 0,
        "to": 1,
        "blocks": "lz4",
        "tone": "meta",
        "start": 0.4,
        "duration": 1.25
      },
      {
        "from": 1,
        "to": 2,
        "blocks": "lz4",
        "tone": "data",
        "start": 1.65,
        "duration": 1.25
      }
    ],
    "updates": [
      {
        "node": 2,
        "at": 2.9,
        "detail": [
          "配置压缩",
          "Compression Config"
        ],
        "blocks": "lz4",
        "tone": "data"
      }
    ]
  }
];
  const ns = 'http://www.w3.org/2000/svg';
  const mobile = '(max-width: 640px)';
  const schematic = ['示意，不代表实测数字', 'Schematic, not measured data'];

  // Single cards have more room than the two cards in a split row or column.
  const layouts = {
    pair: [[[247, 157, 236], [653, 157, 236]], [[180, 78, 230], [180, 219, 230]]],
    chain: [[[143, 157, 230], [450, 157, 230], [757, 157, 230]], [[180, 47, 230], [180, 147, 230], [180, 247, 230]]],
    fork: [[[238, 157, 252], [673, 79, 246], [673, 235, 246]], [[180, 63, 230], [91, 217, 160], [269, 217, 160]]],
    dual: [[[236, 79, 236], [236, 235, 236], [664, 79, 236], [664, 235, 236]], [[91, 63, 160], [269, 63, 160], [91, 217, 160], [269, 217, 160]]]
  };

  function mount(host, {onLayout} = {}) {
    const narrow = matchMedia(mobile);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('role', 'img');
    host.classList.add(id);
    host.replaceChildren(svg);

    let current = 0, frame = 0, last = null, elapsed = 0, playing = true;
    let packets, cards, duration;
    const local = value => Array.isArray(value) ? value[window.SS_LANG === 'en' ? 1 : 0] : value;
    const ratio = () => narrow.matches ? 360 / 320 : 900 / 342;

    function draw(tag, attributes, parent = svg) {
      const el = document.createElementNS(ns, tag);
      for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, value);
      parent.appendChild(el);
      return el;
    }
    function label(x, y, value, role, parent) {
      const el = draw('text', {x, y, class: id + '-' + role}, parent);
      el.textContent = local(value);
      return el;
    }
    function blocks(value, parent) {
      const tokens = value ? value.split(' ') : [];
      const sizes = tokens.map(token => token === '|' ? 10 : Math.max(22, 11 + token.length * 9));
      let left = -(sizes.reduce((sum, width) => sum + width, 0) + (sizes.length - 1) * 4) / 2;
      tokens.forEach((token, index) => {
        const width = sizes[index];
        if (token === '|') {
          draw('path', {d: `M ${left + 5} -11 v 22`, class: id + '-boundary'}, parent);
        } else {
          draw('rect', {x: left, y: -11, width, height: 22, rx: 3, class: id + '-block'}, parent);
          label(left + width / 2, 0, token, 'token', parent);
        }
        left += width + 4;
      });
    }
    function route(a, b, height, separatePorts) {
      const [x, y, w] = a, [X, Y, W] = b;
      if (narrow.matches) {
        const direction = Math.sign(Y - y);
        const lane = separatePorts ? Math.sign(X - x) * 15 : 0;
        const entry = y + direction * height / 2, exit = Y - direction * height / 2;
        return `M ${x + lane} ${entry} V ${(entry + exit) / 2 + lane} H ${X + lane} V ${exit}`;
      }
      const direction = Math.sign(X - x);
      const lane = separatePorts ? Math.sign(Y - y) * 15 : 0;
      const entry = x + direction * w / 2, exit = X - direction * W / 2;
      return `M ${entry} ${y + lane} H ${(entry + exit) / 2 + lane} V ${Y + lane} H ${exit}`;
    }
    function makeCard([x, y, width], data, height) {
      const g = draw('g', {transform: `translate(${x} ${y})`});
      draw('rect', {x: -width / 2, y: -height / 2, width, height, rx: 5, class: id + '-card'}, g);
      label(0, -24, data.title, 'title', g);
      const detail = label(0, 0, data.detail, 'detail', g);
      const glyphs = draw('g', {transform: 'translate(0 23)'}, g);
      return {g, detail, glyphs, data, state: null};
    }
    function updateCard(card, state) {
      if (card.state === state) return;
      card.state = state;
      card.g.setAttribute('data-tone', state.tone);
      card.detail.textContent = local(state.detail);
      card.glyphs.replaceChildren();
      blocks(state.blocks, card.glyphs);
    }
    function render() {
      const scene = scenes[current], targets = layouts[scene.shape][Number(narrow.matches)];
      const height = narrow.matches ? 82 : 104;
      svg.replaceChildren();
      svg.setAttribute('viewBox', narrow.matches ? '0 0 360 320' : '0 0 900 342');
      const alt = window.SS_TOPIC_CFG.steps[current];
      const lang = Number(window.SS_LANG === 'en');
      svg.setAttribute('aria-label', alt.t[lang] + '. ' + alt.d[lang]);
      packets = scene.edges.map(edge => {
        const g = draw('g', {'data-tone': edge.tone});
        const path = draw('path', {d: route(targets[edge.from], targets[edge.to], height, scene.shape === 'dual'), class: id + '-link'}, g);
        const length = path.getTotalLength();
        if (edge.tone !== 'idle' && edge.tone !== 'failed') {
          const p = path.getPointAtLength(length - 8);
          const end = path.getPointAtLength(length);
          const angle = Math.atan2(end.y - p.y, end.x - p.x) * 180 / Math.PI;
          draw('path', {d: 'M -4 -4 L 2 0 L -4 4', transform: `translate(${p.x} ${p.y}) rotate(${angle})`, class: id + '-arrow'}, g);
        }
        return {edge, path, length, packet: null};
      });
      cards = scene.nodes.map((node, i) => makeCard(targets[i], node, height));
      packets.forEach(packet => {
        if (!packet.edge.blocks) return;
        const el = draw('g', {'data-tone': packet.edge.tone});
        blocks(packet.edge.blocks, el);
        packet.packet = el;
      });
      label(narrow.matches ? 180 : 450, narrow.matches ? 300 : 318, schematic, 'note');
      duration = Math.max(3.4, ...scene.edges.map(edge => edge.start + edge.duration + 1.15));
      paint(reduced.matches ? duration : elapsed);
    }
    function paint(time) {
      const scene = scenes[current];
      cards.forEach((card, index) => {
        const change = scene.updates.find(update => update.node === index && time >= update.at);
        updateCard(card, change || card.data);
      });
      for (const {edge, path, length, packet} of packets) {
        if (!packet) continue;
        const progress = (time - edge.start) / edge.duration;
        const visible = progress > 0 && progress < 1;
        packet.style.visibility = visible ? 'visible' : 'hidden';
        if (!visible) continue;
        const point = path.getPointAtLength(progress * length);
        packet.setAttribute('transform', `translate(${point.x} ${point.y})`);
        packet.style.opacity = Math.min(1, 12 * progress, 12 * (1 - progress));
      }
    }
    function tick(now) {
      frame = 0;
      elapsed = (elapsed + Math.max(0, (now - (last ?? now)) / 1000)) % duration;
      last = now;
      const fade = Math.min(1, 0.5 + elapsed / 0.25, 0.5 + (duration - elapsed) / 0.25);
      svg.style.opacity = fade;
      paint(elapsed);
      start();
    }
    function start() {
      if (playing && !frame && !reduced.matches) frame = requestAnimationFrame(tick);
    }
    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      last = null;
    }
    function show(i) {
      current = Math.max(0, Math.min(scenes.length - 1, i));
      elapsed = 0;
      last = null;
      svg.style.opacity = 1;
      render();
      start();
    }
    function layout() {
      render();
      onLayout?.(ratio());
    }
    function motion() {
      stop();
      show(current);
    }
    narrow.addEventListener('change', layout);
    reduced.addEventListener('change', motion);
    document.addEventListener('ss-lang', render);
    const api = {
      show,
      pause() { playing = false; stop(); },
      resume() { playing = true; start(); },
      destroy() {
        this.pause();
        narrow.removeEventListener('change', layout);
        reduced.removeEventListener('change', motion);
        document.removeEventListener('ss-lang', render);
        svg.remove();
        host.classList.remove(id);
        delete host.__anim;
      },
      ratio,
      step: () => current
    };
    host.__anim = api;
    show(0);
    return api;
  }

  (window.SSAnim ||= {})[id] = {steps: 5, mount};
})();
