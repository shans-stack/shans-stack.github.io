/* Bilingual SVG scenes using the original X2 and X3 node-and-route diagrams. */
(function () {
  "use strict";

  const ID = "d-exahw";
  const scenes = [
    {
      title: ["共享文件读写", "Shared File I/O"],
      bands: [
        [["gpu", "GPU 训练节点", "GPU training"]],
        [["net", "存储网络", "Storage network"]],
        [["file", "EXAScaler 设备", "EXAScaler", "数据集与检查点", "Dataset / checkpoint"]]
      ],
      routes: [["file", "net", -8], ["net", "gpu", -8], ["gpu", "net", 8], ["net", "file", 8]]
    },
    {
      title: ["从文件路径到数据", "From File Path to Data"],
      bands: [
        [["client", "文件客户端", "File client"]],
        [["meta", "元数据服务", "Metadata service", "目录与布局", "Directory and layout"],
          ["data", "对象存储服务", "Object storage", "文件内容", "File contents"]],
        [["ctrl", "存储控制器", "Storage controller"]],
        [["media", "存储介质", "Storage media"]]
      ],
      routes: [["client", "meta", -15], ["client", "data", 15], ["data", "ctrl"], ["ctrl", "media"]],
      sequence: [1, -1, 2, 3, 4, -4, -3, -2]
    },
    {
      title: ["AI400X3 全闪设备", "AI400X3 All-Flash Appliance"],
      bands: [
        [["file", "EXAScaler", "EXAScaler", "文件服务", "File services"]],
        [["a", "控制器 A", "Controller A", "双活", "Active"],
          ["b", "控制器 B", "Controller B", "双活", "Active"]],
        [["nvme", "双端口 NVMe", "Dual-port NVMe", "PCIe Gen5", "PCIe Gen5"]]
      ],
      routes: [["file", "a", -8], ["a", "nvme", -8], ["file", "b", 8], ["b", "nvme", 8]]
    },
    {
      title: ["AI400X2 配置", "AI400X2 Configurations"],
      pairs: [
        [["standard", "标准配置", "Standard", "TLC 固态盘", "TLC SSDs"],
          ["internal", "机内闪存", "Internal flash"]],
        [["qlc", "QLC 配置", "QLC option", "闪存容量", "Flash capacity"],
          ["shelf", "SE2420 扩展柜", "SE2420 shelf", "NVMe-oF", "NVMe-oF"]],
        [["turbo", "Turbo", "Turbo", "TLC 固态盘", "TLC SSDs"],
          ["ports", "更多主机端口", "More host ports"]]
      ]
    },
    {
      title: ["AI200X2 与后端扩展柜", "AI200X2 and Its Back-End Shelf"],
      bands: [
        [["client", "计算节点", "Compute nodes"]],
        [["net", "存储网络", "Storage network"]],
        [["appliance", "AI200X2", "AI200X2", "文件服务", "File services"]],
        [["shelf", "硬盘扩展柜", "HDD shelf", "容量介质", "Capacity media"]]
      ],
      routes: [["shelf", "appliance"], ["appliance", "net"], ["net", "client"]]
    },
    {
      title: ["工作负载与设备", "Workloads and Appliances"],
      pairs: [
        [["training", "训练与推理", "Training / Inference"],
          ["x3", "AI400X3M / X3", "AI400X3M / X3", "PCIe Gen5 全闪", "PCIe Gen5 flash"]],
        [["flash", "X2 全闪需求", "X2 all-flash storage"],
          ["x2", "AI400X2", "AI400X2", "标准、QLC、Turbo", "Standard, QLC, Turbo"]],
        [["capacity", "大数据集存放", "Large datasets"],
          ["x200", "AI200X2", "AI200X2", "硬盘扩展", "HDD expansion"]]
      ]
    }
  ];

  function mount(host, {onLayout, paused = false} = {}) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const mobile = matchMedia("(max-width: 640px)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let step = 0, frame, elapsed = 0, last, paint, ratio;

    svg.classList.add(ID + "-diagram");
    svg.setAttribute("role", "img");
    host.replaceChildren(svg);

    function element(tag, attributes, parent = svg) {
      const item = document.createElementNS(svg.namespaceURI, tag);
      for (const [name, value] of Object.entries(attributes)) item.setAttribute(name, value);
      parent.appendChild(item);
      return item;
    }

    function label(x, y, value, size, type, parent) {
      const text = element("text", {x, y, "font-size": size, class: type}, parent);
      text.textContent = value;
    }

    function draw() {
      const narrow = mobile.matches;
      const lang = Number(window.SS_LANG === "en");
      const {title, bands, routes, pairs, sequence} = scenes[step];
      const width = narrow ? 356 : 920;
      const height = narrow ? 370 : 316;
      const size = narrow ? 15 : 21;
      const small = narrow ? 14 : 18;
      const nodes = bands || pairs;
      const vertical = pairs ? !narrow : narrow;
      const coordinates = new Map();
      const edges = [];
      const focus = [];

      ratio = width / height;
      svg.replaceChildren();
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("aria-label", [title[lang], ...nodes.flat().map(node =>
        [node[1 + lang], node[3 + lang]].filter(Boolean).join(", ")
      )].join(". "));

      nodes.forEach((group, index) => {
        group.forEach(([id], lane) => {
          if (pairs) {
            coordinates.set(id, narrow
              ? {x: 88 + lane * 180, y: 89 + index * 96, w: 158, h: 56}
              : {x: 160 + index * 300, y: 94 + lane * 128, w: 258, h: 62});
          } else {
            const x = 20 + (index + .5) * 880 / bands.length;
            const y = 49 + (index + .5) * 272 / bands.length;
            const offset = lane - (group.length - 1) / 2;
            coordinates.set(id, narrow
              ? {x: 178 + offset * 172, y, w: 160, h: 52}
              : {x, y: 156 + offset * 96, w: 192, h: 62});
          }
        });
      });

      const links = routes || pairs.map(([from, to]) => [from[0], to[0]]);
      links.forEach(([from, to, offset = 0]) => {
        const a = coordinates.get(from), b = coordinates.get(to);
        const direction = vertical ? Math.sign(b.y - a.y) : Math.sign(b.x - a.x);
        const x1 = vertical ? a.x + offset : a.x + direction * a.w / 2;
        const x2 = vertical ? b.x + offset : b.x - direction * b.w / 2;
        const y1 = vertical ? a.y + direction * a.h / 2 : a.y + offset;
        const y2 = vertical ? b.y - direction * b.h / 2 : b.y + offset;
        const bend = vertical ? (y1 + y2) / 2 + offset / 2 : (x1 + x2) / 2 + offset / 2;
        const d = vertical ? `M${x1} ${y1} V${bend} H${x2} V${y2}`
          : `M${x1} ${y1} H${bend} V${y2} H${x2}`;
        const line = element("path", {d, class: "route"});
        const length = line.getTotalLength();
        if (pairs) return;
        function arrow(reverse) {
          const tip = line.getPointAtLength(reverse ? 2 : length - 2);
          const facing = reverse ? -direction : direction;
          const tailX = tip.x - (vertical ? 0 : 6 * facing);
          const tailY = tip.y - (vertical ? 6 * facing : 0);
          const dx = vertical ? 4 : 0, dy = vertical ? 0 : 4;
          element("path", {d: `M${tailX - dx} ${tailY - dy} L${tip.x} ${tip.y} L${tailX + dx} ${tailY + dy}`, class: "route"});
        }
        arrow(false);
        if (sequence) arrow(true);
        edges.push({line, length});
      });

      label(19, narrow ? 26 : 31, title[lang], size, "heading");
      nodes.forEach((group, index) => {
        focus[index] = [];
        group.forEach(node => {
          const {x, y, w, h} = coordinates.get(node[0]);
          const card = element("g", {class: "node"});
          focus[index].push(card);
          element("rect", {x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 5, class: "housing"}, card);
          const subtitle = node[3 + lang];
          if (subtitle) {
            label(x, y - 5, node[1 + lang], size, "name", card);
            label(x, y + (narrow ? 15 : 19), subtitle, small, "subtitle", card);
          } else {
            label(x, y + (narrow ? 5 : 7), node[1 + lang], size, "name", card);
          }
        });
      });
      label(19, height - 13, lang ? "Schematic (no measured values)" : "示意，不代表实测数字", small, "note");

      // One moving block follows successive route segments without implying a copy.
      const packet = routes && element("rect", {width: 9, height: 9, rx: 2, class: "packet", visibility: "hidden"});
      const segment = .66;
      const traversal = sequence || edges.map((_, i) => i + 1);
      paint = time => {
        if (pairs) {
          focus.forEach((group, index) => group.forEach(node =>
            node.classList.toggle("selected", !reduced.matches && index === Math.floor(time / 1.6) % focus.length)));
          return;
        }
        const position = time % (traversal.length * segment + 1.1);
        const key = traversal[Math.floor(position / segment)];
        const edge = edges[Math.abs(key) - 1];
        const progress = (position % segment) / segment;
        packet.setAttribute("visibility", !reduced.matches && edge && progress > .06 && progress < .94 ? "visible" : "hidden");
        if (edge && !reduced.matches) {
          const point = edge.line.getPointAtLength(edge.length * (key < 0 ? 1 - progress : progress));
          packet.setAttribute("x", point.x - 4.5);
          packet.setAttribute("y", point.y - 4.5);
        }
      };

      paint(elapsed);
      if (onLayout) onLayout(ratio, narrow);
    }

    function tick(now) {
      elapsed += Math.max(0, now - last) / 1000;
      last = now;
      paint(elapsed);
      frame = requestAnimationFrame(tick);
    }

    function syncMotion() {
      cancelAnimationFrame(frame);
      paint(elapsed);
      if (!reduced.matches && !paused) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    }

    document.addEventListener("ss-lang", draw);
    mobile.addEventListener("change", draw);
    reduced.addEventListener("change", syncMotion);
    draw();
    syncMotion();

    return {
      show(index) {
        step = index;
        elapsed = 0;
        draw();
        syncMotion();
      },
      pause() {
        paused = true;
        syncMotion();
      },
      resume() {
        paused = false;
        syncMotion();
      },
      destroy() {
        cancelAnimationFrame(frame);
        document.removeEventListener("ss-lang", draw);
        mobile.removeEventListener("change", draw);
        reduced.removeEventListener("change", syncMotion);
        svg.remove();
      },
      ratio: () => ratio,
      step: () => step
    };
  }

  window.SSAnim = window.SSAnim || {};
  window.SSAnim[ID] = {steps: 5, mount, figures: {
 "x3m": [
  [["机箱", "Chassis"], ["2U", "2U"]],
  [["控制器", "Controllers"], ["双活", "Active-active"]],
  [["盘位", "Drive Bays"], ["24 × PCIe Gen5 NVMe", "24 × PCIe Gen5 NVMe"]],
  [["前端", "Host Network"], ["XDR / 400GbE", "XDR / 400GbE"]]
 ],
 "x3": [
  [
   [
    "处理器",
    "Processor"
   ],
   [
    "AMD Genoa",
    "AMD Genoa"
   ]
  ],
  [
   [
    "控制器",
    "Controllers"
   ],
   [
    "双活",
    "Active-active"
   ]
  ],
  [
   [
    "盘位",
    "Drive Bays"
   ],
   [
    "24 × PCIe Gen5 NVMe",
    "24 × PCIe Gen5 NVMe"
   ]
  ],
  [
   [
    "前端",
    "Host Network"
   ],
   [
    "400GbE / NDR",
    "400GbE / NDR"
   ]
  ]
 ],
 "x2": [
  [
   [
    "AI400X2",
    "AI400X2"
   ],
   [
    "标准 TLC、QLC、Turbo",
    "Standard TLC, QLC, Turbo"
   ]
  ],
  [
   [
    "AI200X2",
    "AI200X2"
   ],
   [
    "可接 HDD 扩展柜",
    "Optional HDD shelves"
   ]
  ]
 ],
 "x3m-perf": [
  [["顺序读", "Sequential Read"], ["≤190 GB/s", "≤190 GB/s"]],
  [["顺序写", "Sequential Write"], ["≤110 GB/s", "≤110 GB/s"]],
  [["峰值随机读", "Peak Random Read"], ["8M IOPS", "8M IOPS"]]
 ],
 "x3-perf": [
  [
   [
    "顺序读",
    "Sequential Read"
   ],
   [
    "≤140 GB/s",
    "≤140 GB/s"
   ]
  ],
  [
   [
    "顺序写",
    "Sequential Write"
   ],
   [
    "≤110 GB/s",
    "≤110 GB/s"
   ]
  ],
  [
   [
    "AI400X3 · 4K 随机读",
    "AI400X3 · 4K Random Read"
   ],
   [
    "1.5M IOPS",
    "1.5M IOPS"
   ]
  ],
  [
   [
    "AI400X3i · 4K 随机读",
    "AI400X3i · 4K Random Read"
   ],
   [
    "4M IOPS",
    "4M IOPS"
   ]
  ]
 ],
 "x2-perf": [
  [
   [
    "顺序读",
    "Sequential Read"
   ],
   [
    "≤90 GB/s",
    "≤90 GB/s"
   ]
  ],
  [
   [
    "顺序写",
    "Sequential Write"
   ],
   [
    "≤65 GB/s",
    "≤65 GB/s"
   ]
  ]
 ]
}};
})();
