# Shan's Stack

一步一步看懂 AI 数据基础设施。Step-by-step explainers for AI data infrastructure, drawn as a quiet metro map.

Personal learning notes by Lin Shan. Not affiliated with, or endorsed by, any vendor mentioned.

## 本地预览

纯静态页面，没有构建步骤。直接用浏览器打开 `index.html` 即可（`file://` 也能用：数据是 `data/*.js` 挂到全局变量，不靠 fetch）。

想用本地服务器也行：`python3 -m http.server`，然后打开 http://localhost:8000/ 。

## 目录

| 路径 | 是什么 |
|---|---|
| `index.html` | 总图（首页）：五条主干线，加专题入口、讲稿、按线路找知识点、换乘站、最近新增、关于。除首屏标题外全部由数据生成 |
| `maps/<id>/index.html` | 专题图（目前 `vast`、`ddn`、`weka`、`rafay`）。页面只带地图 id，内容全部来自数据；由 `tools/new_map.py` 生成 |
| `topics/<id>/index.html` | 知识点页（目前只有 `rdma`）：文档模式加演示模式，见下文。面包屑、「出现在讲稿」、「先看 / 接着看」从数据生成 |
| `present.html` | 演示播放器：按讲稿顺序翻站；有知识点页的站进它的演示模式，没有的显示「制作中」过渡页 |
| `data/` | 全部内容：`lines.js` 线、`stations.js` 站、`maps.js` 地图、`talks.js` 讲稿 |
| `assets/` | `palette.css`（生成的配色）、`site.css`（公共样式）、`brand/`（厂商 logo、`brand.css`、出处 `SOURCES.md`）、`symbols.js`（线端符号）、`core.js`（语言、数据索引、链接）、`metro.js`（排版与绘制）、`mapview.js`（地图页：讲稿路线、编辑器、单线图）、`home.js`（首页其余区块）、`anim/`（知识点动画，每个知识点一个 js 加一个 css） |
| `tools/` | `pal.py` 配色唯一来源、`build_palette.py` 生成 `assets/palette.css`、`map.tpl.html` + `new_map.py` 生成专题图页面 |
| `design/` | 设计稿源文件，只作参考，不要改 |

专题图选的是 `maps/<id>/index.html` 一图一页（而不是 `map.html?id=`）：地址好记、可以单独分享，页面本身只有地图 id 不同，模板改了重跑 `new_map.py` 即可。站内链接一律写到 `index.html`，本地 `file://` 打开时才不会变成目录列表。

## 数据怎么改

### 加一个站

在 `data/stations.js` 里加一条，最少要有：

```js
'v-foo':{zh:'中文名',en:'English name',lines:['v-arch'],pos:{vast:3.5},tag:'vast',lv:1,st:'wip',
  d:['一句话说明（给客户听）。','One-sentence summary.']},
```

- `lines` 写几条线就停几条线。同一张图里停两条以上就是换乘站；线不相邻时自动拆成「每段一站 + 虚线圈 + 悬停联动」，不用手画。
- `pos` 是在线上的先后位置，数字小的在左。同一张图里不同线可以共用一个数；同一条线上不能重复（控制台会提示）。用小数（如 `3.5`）插到两站之间，不用改别的站。
- 一个站跨两张图（例如 RDMA 既在总图也在 VAST 图），`lines` 把两张图的线都写上，`pos` 写成 `{home:2, vast:5}`，`dBy:{vast:[…]}` 可以给专题图换一种说法。
- 专题图里的站对应总图上某个通识站时，写 `generic:'总图站 id'`，地图上画成粗圈，点开可以「换乘到总图」。
- 站名里的 `\n` 是地铁图上放不下时的折行位置；别处显示时会去掉。
- 放不下、但想留着的站加 `hidden:true`：默认不显示，单线图里列在「默认不显示的站」，编辑路线时可以加进来。
- 硬件站加 `iso:true`，留给以后画等距线稿。
- 说明查不到出处就写 `（说明待补）`，不要编。

### 加一条线

在 `data/lines.js` 加一条（`map`、`slot` 颜色槽位 `l1` 到 `l6`、`sym` 线端符号），再把 id 放进 `data/maps.js` 对应地图的 `lines` 数组；数组顺序就是从上到下的顺序。新符号加在 `assets/symbols.js`。

### 加一张专题图

1. `data/lines.js` 加线，`data/stations.js` 加站。
2. `data/maps.js` 加一条：`{id:'foo', kind:'topic', href:'maps/foo/index.html', lines:[…], talk:'foo-core', st:'live', …}`。还没准备好就写 `st:'wip'`、`lines:[]`，首页专题入口会显示「整理中」（NVIDIA 网络现在就是这样）。
3. `data/talks.js` 加默认讲稿。
4. `python3 tools/new_map.py foo 名字` 生成页面。

### 加一场讲稿

`data/talks.js` 里写 `{id, map, zh, en, min, stops:[站 id…]}`。路线是算出来的：沿线走，只在换乘站换线，整场一起求最短；连不上的两站之间画虚线并在说明里注明。

### 改配色

改 `tools/pal.py`，再跑 `python3 tools/build_palette.py`。页面只用低饱和（muted）一套，浅色深色跟随系统；马卡龙和老钱风留在 `pal.py` 里备用。第六色（雾青）给专题图第六条线用。

## 厂商 logo

文件在 `assets/brand/`，每个文件的出处、厂商规定和下载记录在 `assets/brand/SOURCES.md`。

**放在哪**（全部由数据生成，不在页面里手写）：
- 首页「专题」入口：每张专题图卡片右上角一个小 logo（VAST、DDN、WEKA、Rafay、NVIDIA 网络）。
- 专题图页头：标题右侧一个 logo。改了 `tools/map.tpl.html` 后重跑 `new_map.py`。
- 知识点页面包屑最右侧：站的 `tag` 是 `vast`、`ddn`、`weka`、`rafay`（或以后加的其他厂商）时自动出现，`generic` 不显示。新知识点页照 `topics/rdma/` 的面包屑脚本写（末尾那句 `SS.brandMark(SS.brandOf(id),'cr-lg')`），并引 `assets/brand/brand.css`（知识点页不引 `site.css`）。

**怎么加一家**：logo 文件放进 `assets/brand/`，在 `data/maps.js` 末尾的 `SS.brands` 加一条（`src` 浅色底版、有白色版写 `dark`、只有深色字的写 `backing:true`），专题图写 `brand:'id'`，在 `brand.css` 按这家 logo 的版式加一行 `.lg-<id> img{height:…}`，再把出处和规定写进 `SOURCES.md`。

**使用规则**：
- 只用厂商自己网站上的原版文件，不重画、不拉伸、不改色；能改的只有画布空白（`viewBox`），改了要在 `SOURCES.md` 写明。
- 深色模式：厂商有白色或反白版就用它；没有就垫一块浅灰底（`#DADCDF`），不把 logo 反色。
- 厂商只公开白色字版本的（目前是 WEKA）：深色模式用原件；浅色模式另存一份，只把白色字改成站内墨色 `#1C1E22`，标志图形不动，并在 `SOURCES.md` 写明。
- 小而安静：logo 只说明「这是谁的图」，不当横幅。三处尺寸由 `brand.css` 的 `--L`（字母目测高度）统一，加新位置先截加前加后两张图对比，抢了地图、站名或标题的视线就缩小，没帮助就不放。
- 品牌色只出现在 logo 里；地铁图线路颜色仍只用 `tools/pal.py`。
- 产品线稿（DBox、AI400X 机箱正面）试过，放进页头后显乱、两张图看起来几乎一样，没有采用。
- 页脚统一写一句「文中商标归各自所有者。」，不加其他法律文字。

## 地铁图排版规则（`assets/metro.js`）

**大小目标**：一张图 6 到 8 条线，每条线 4 到 8 个站；放不下（出现「这张图太满」）就拆图或删站。素材少的厂商 5 条线也可以（目前 Rafay 是 5 条）。

1. 每条线一行横轨，上下顺序由地图数据定。
2. 站按 `pos` 从左往右；同一 `pos` 在同一列，所以换乘站在它停靠的每条线上都在同一列。
3. 换乘胶囊只连上下相邻、且确实停靠的线；不相邻就拆站加虚线圈。
4. 相邻两列如果占用的线互不重叠就并成一列（只显示选中站时更紧凑），但不把胶囊站名放到上一条线站名的正下方。
5. 站名不能互相重叠，也不能压到胶囊：先算出满足这一点的最小列距，再在标准宽度里拉开（最多 140px 一列）。一行放不下时按名字里的 `\n` 或英文空格折成两行，上下两行都折时自动加大行距。
6. 最小列距也放不进标准宽度时，图照样画（整体缩小），页面和控制台各给一行「这张图太满，建议拆图」。
7. 900px 以下改成按线竖排的单线列表。

## 地图页能做什么

- 选讲稿：看路线（每段用所在线的颜色加粗、标序号，其余淡化），「开始讲」进演示。
- 点站：弹出一句话说明，可以打开知识点、看单线图、换乘到总图。
- 点左侧线名：单线图（`?line=`），每站一句话。
- 「编辑路线」：点站加入或移出；右侧清单可拖动或用上下按钮排序；整条线加入或移出；「显示全图」把未选的站淡成底图；「保存为讲稿」存到本机浏览器并生成链接（站序在 `?stops=` 里，打开链接即还原）。

## 知识点页（以 `topics/rdma/` 为样板）

- **文档模式（默认）**：六步排成六节，从头往下读；每节有步骤标题、一句话说明和一到几段正文，先看 / 接着看 / 出处在文末。电脑宽度下动画固定在右侧（sticky），读到哪节就切到哪一步。手机宽度下每节自带一个动画区，放在这一节的标题和一句话说明下面、正文上面；滚到哪节播哪节，看不见的停住。没选「固定在顶部」：手机版动画是竖排的，固定在顶部会占掉大半屏，正文没地方读。
- **演示模式**：一步一屏，只放标题、一句话和动画；按 P 或点顶部「演示」进入，← → 翻步，Esc 回到文档模式。`present.html` 连播时直接进演示模式，翻过最后一步进下一站，往回翻停在上一站的最后一步。
- 状态写在地址里：`?mode=present`，`?step=N`（文档模式滚到第 N 节，演示模式停在第 N 步）。
- **动画**放在 `assets/anim/<知识点>.js` 和 `.css`，接口是 `SSAnim.<知识点>.mount(容器, opts)`，返回 `show(i) / pause() / resume() / destroy() / ratio()`。动画不带自己的翻页控件，页面切到哪一步就调 `show(i)`，步骤状态只在页面里有一份。颜色只用 `palette.css` 的变量。宽度 640px 以下动画换成上下排布；系统开了「减少动态效果」时每步只画一帧静态结果。
- 正文只取自作者学习笔记里讲这个主题的页面，不写具体性能数字。

地址参数：`?talk=` 讲稿，`?stops=a,b,c&name=` 自定义站序，`?edit=1` 打开编辑器，`?line=&st=` 单线图，`?hl=` 高亮某站，`?lang=en`，`?theme=dark`。

## Rules

- Content comes only from public material; no customer names, prices, internal or roadmap content.
- Vendor logos only as described in 「厂商 logo」 above: official files, unaltered, small. Brand colours appear only inside the logos; the metro palette stays our own.
- Static HTML, SVG and JS. No framework, no build step for the pages themselves.
- Hosted on GitHub Pages: https://shans-stack.github.io (noindex until reviewed).
