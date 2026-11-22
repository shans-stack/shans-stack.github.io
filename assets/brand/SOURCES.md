# 厂商 logo：出处与使用规定

记录日期：2026-10-21。站内只用下表「站内文件」一列的文件；页面怎么放 logo 见 `README.md`「厂商 logo」一节。

## 站内文件

| 站内文件 | 是什么 | 从哪来 | 改了什么 |
|---|---|---|---|
| `vast-wordmark.svg` | VAST 字标原件（单色，`fill="currentColor"`） | vastdata.com 首页导航栏内嵌的 SVG（`<svg class="vastWordmark" viewBox="0 0 66 14">`），2026-10-21 取 | 只删掉了 Vue 生成的 `data-v-…` 属性，路径逐字未动 |
| `vast-wordmark-black.svg` | 浅色底用 | 同上 | `currentColor` 换成 `#000000` |
| `vast-wordmark-white.svg` | 深色底用 | 同上 | `currentColor` 换成 `#FFFFFF` |
| `ddn-logo-primary-color.svg` | DDN 主 logo，全彩 | https://www.ddn.com/wp-content/uploads/2026/06/ddn-logo-primary-color.svg | 无 |
| `nvidia-logo-horz.svg` | NVIDIA 横版 logo 原件，两色 | https://www.nvidia.com/content/nvidiaGDC/us/en_US/about-nvidia/legal-info/logo-brand-usage/_jcr_content/root/responsivegrid/nv_container_392921705/nv_container_412055486/nv_image.coreimg.svg/1776076920317/nvidia-logo-horz.svg | 无 |
| `nvidia-logo-horz-trim.svg` | 站内实际用的版本 | 同上 | 只把 `viewBox` 从 `0 0 2560 1440` 收到 `205 513 2090 414`（去掉画布四周空白，图形本身未动） |
| `weka-logo-white.svg` | WEKA logo 原件（紫色标 `#7C03EC` + 白色字），深色底用 | weka.io 首页导航栏内嵌的 SVG（`<svg role="img" viewBox="0 0 739 153" aria-label="WEKA">`），2026-10-21 取 | 只删掉了 `class` 属性（Tailwind 尺寸类），路径和颜色逐字未动 |
| `weka-logo-ink.svg` | 浅色底用 | 同上 | 两段白色字的 `fill="#fff"` 换成 `#1C1E22`（站内 `--ink`）；紫色标 `#7c03ec` 与全部路径未动 |
| `rafay-logo-positive.svg` | Rafay 正色版原件（绿色标 `#08B09C` + 深色字 `#233941`），浅色底用 | rafay.co/brand-assets 页上「Positive」的 svg 下载链接：https://cdn.prod.website-files.com/68d15699b1e46604cd1fe6a6/690a1c9ba3ae4303786112db_Rafay_Positive_Ver.svg | 无 |
| `rafay-logo-positive-trim.svg` | 站内实际用的浅色底版本 | 同上 | 只把 `viewBox`（和同值的 `enable-background`）从 `0 0 611.26 224.22` 收到 `48.46 54.56 507.71 114.52`（去掉画布四周空白，图形本身未动） |
| `rafay-logo-negative.svg` | Rafay 反白版原件（绿色标 + 白色字），深色底用 | rafay.co/brand-assets 页上「Negative」的 svg 下载链接：https://cdn.prod.website-files.com/68d15699b1e46604cd1fe6a6/690a1861f8b302132b0576f7_Rafay_Negative_Ver.svg | 无（原件画布已经贴边） |
| `brand.css` | logo 的尺寸、深色模式规则 | 本站自己写的 | 不是厂商文件 |

## 各家的规定与本站的做法

### VAST Data

- **出处状态：没有公开的媒体包或品牌规范页。** vastdata.com 的新闻稿页、首页页脚都没有 logo 下载或品牌规范链接（2026-10-21 查）；新闻稿署名的媒体联系人是 press@vastdata.com。所以用的是 VAST 官网自己导航栏里的字标原件。
- 官网上这个字标是单色、跟随文字颜色（`currentColor`），本站按同样方式用：浅色底纯黑、深色底纯白，不加其他颜色。
- **品牌色：没找到官方公布的色值，本站不用 VAST 品牌色。**

### DDN

- 品牌页：https://www.ddn.com/company/brand-assets/ 。页面给了主 logo（Primary）和简化版（Simplified，只用于印刷色受限的场合），说「主 logo 应尽量在所有场合使用」；完整品牌手册要发邮件到 brand@ddn.com 索取，页面本身没写留白、改色等细则。
- 本站用主 logo，原样不改。**DDN 没提供白色或反白版**，深色模式下在 logo 后面垫一块浅灰底（`#DADCDF`），logo 本身不改色。
- **品牌色**（同一品牌页公布的 12 个值）：Brand Red `#ED2738`、Deep Red `#CB343B`、Wine `#7D2D3F`、Terra `#D98878`、DDN Black `#201E1E`、Warm Black `#402022`、Brown `#77494D`、Warm Gray `#D8D2CB`、Deep Blue `#374967`、Steel Blue `#7594B2`、Light Blue `#BDD6E7`、Cool Gray `#F0F0F0`。主 logo 里用到的是 `#ED2738`、`#CB343B`、`#201E1E`。

### NVIDIA

- 品牌规范：https://www.nvidia.com/en-us/about-nvidia/legal-info/logo-brand-usage/ 。logo 文件取自这一页上展示的「NVIDIA horizontal format」图。
- 规范要点：尽量用两色版；周围留白至少一个「n」的高度；不改比例、不拆开眼标和字标、不加效果、不改色、不放在花哨背景上、不低于最小尺寸；不得暗示没有的合作或背书。
- 本站做法：用横版两色原件，只收紧了画布（见上表），留白由周围空白保证；深色模式垫浅灰底（`#DADCDF`），logo 不改色。
- **品牌色：** NVIDIA 绿 `#76B900`（取自上面 logo 文件里的填充色）。

### WEKA

- **出处状态：没有找到公开的媒体包或品牌规范页。** weka.io 的 `/press` 跳到 `/news`，新闻稿页和页脚只给媒体联系人 pr@weka.io，没有 logo 下载；试过 `/media-kit`、`/press-kit`、`/brand`、`/brand-guidelines`、`/company/newsroom` 均为 404（2026-10-21 查）。所以和 VAST 一样，用官网自己导航栏里的 logo 原件。新闻稿脚注写明「WEKA and the WEKA logo are registered trademarks」。
- **官网只用白色字的版本**（整站是深色底；首页、产品页、招聘页、隐私页里这段 SVG 都是 `fill="#fff"` 写死的），没找到深色字版。深色模式原样用这份原件。**浅色模式用改过色的一份**（`weka-logo-ink.svg`）：只把两段白色字（WEKA 字样和 ® 圆圈）的 `fill="#fff"` 改成站内墨色 `#1C1E22`，紫色标志图形和路径逐字未动。这是站内唯一一处改了厂商 logo 颜色的地方，2026-10-21 站主同意（美观和可读性优先，比垫深灰底安静）。
- **品牌色：** WEKA 紫 `#7C03EC`（取自 logo 文件里的填充色）。站内不另用。

### Rafay

- 品牌页：https://rafay.co/brand-assets 。页面提供正色（Positive）和反白（Negative）两套 logo 的 PNG、SVG、EPS 下载，以及一份品牌手册 PDF 和整包 zip；页面写「Download and use the Rafay logo in a variety of formats」。
- ⚠️ **文件不在 rafay.co 域名上**：品牌页的下载链接全部指向 `cdn.prod.website-files.com`（Rafay 官网所用的 Webflow 托管 CDN，rafay.co 自己导航栏的 logo 也从这里加载）。本站照品牌页上的链接下载；这是品牌页给出的官方文件，2026-10-21 站主确认保留。
- 本站做法：浅色模式用正色版（只收紧画布），深色模式换官方反白版，都不改色、不拉伸。
- 品牌手册 PDF 只看过一遍（每页页脚标着「Confidential Information. Do Not Distribute」，所以没放进站内、也不在这里转述细则）；手册里没写留白尺寸。
- **品牌色**（品牌页公布）：Rafay Green `#08B09C`、Rafay Dark `#233941`，另有 `#EBEBEB`、`#FFEAC0`、`#F6F2FF`、`#999999`、`#E45252`、`#081826`。站内只出现在 logo 里。

### 品牌色用在哪

只出现在 logo 自身里。试过给 DDN 专题图的「线路图」标题上沿换成 DDN 红（`#CB343B` / 深色 `#ED2738`），一条红线读起来像报错提示，又和低饱和的线路颜色抢视线，所以没用。地铁图线路颜色全部维持 `tools/pal.py` 原值。

## 本次下载记录

用 curl 下载、留在站内的：

| URL | 大小 | 去向 |
|---|---|---|
| https://www.ddn.com/wp-content/uploads/2026/06/ddn-logo-primary-color.svg | 26,346 字节 | `ddn-logo-primary-color.svg` |
| https://www.nvidia.com/content/nvidiaGDC/us/en_US/about-nvidia/legal-info/logo-brand-usage/_jcr_content/root/responsivegrid/nv_container_392921705/nv_container_412055486/nv_image.coreimg.svg/1776076920317/nvidia-logo-horz.svg | 2,783 字节 | `nvidia-logo-horz.svg` |
| https://cdn.prod.website-files.com/68d15699b1e46604cd1fe6a6/690a1c9ba3ae4303786112db_Rafay_Positive_Ver.svg（rafay.co/brand-assets 上的链接，Webflow CDN） | 2,530 字节 | `rafay-logo-positive.svg` |
| https://cdn.prod.website-files.com/68d15699b1e46604cd1fe6a6/690a1861f8b302132b0576f7_Rafay_Negative_Ver.svg（同上） | 2,792 字节 | `rafay-logo-negative.svg` |

用 curl 下载、没有用、未放进站内的：

| URL | 大小 | 说明 |
|---|---|---|
| https://www.ddn.com/wp-content/uploads/2026/06/ddn-logo-simplified-blk.svg | 3,219 字节 | DDN 简化版 logo（黑色单色）。品牌页说它只用于印刷色受限的场合，所以没用 |
| https://cdn.prod.website-files.com/68d15699b1e46604cd1fe67a/68db7d11994389f83a05c816_Rafay-Brand-Guide-2025.pdf（rafay.co/brand-assets 上的链接） | 2,050,365 字节 | Rafay 品牌手册，只为查使用规定；标有「Confidential Information. Do Not Distribute」，看完即删，不进站内 |

为了找 logo 文件地址而用 curl 取过、找完即删、没进站内的网页（都在厂商自己的域名上）：

| URL | 大小 | 用途 |
|---|---|---|
| https://www.ddn.com/company/brand-assets/ | 5,491 字节 | 被 Cloudflare 拦截，返回的是拦截页；文件地址改由读网页工具取得 |
| https://www.vastdata.com/ | 169,890 字节 | 从导航栏取出内嵌的 VAST 字标 SVG |
| https://www.nvidia.com/en-us/about-nvidia/legal-info/logo-brand-usage/ | 461,882 字节 | 找到横版 logo 的图片地址 |
| https://www.weka.io/ | 259,434 字节 | 从导航栏取出内嵌的 WEKA logo SVG |
| https://www.weka.io/press（跳到 /news）、/news/wekapod-3-densest-ai-storage-memory-system、/product/neuralmesh、/careers、/resources/legal/privacy-policy | 每页约 0.1 到 0.45 MB | 找媒体包（没有），确认各页的 logo 都是同一段白色字 SVG |
| https://www.weka.io/company/media-kit、/company/newsroom、/brand（均 404） | 每页约 0.14 MB | 找媒体包，不存在 |
| https://docs.weka.io/ | 777,843 字节 | 看文档站有没有深色字版 logo（只有一个小头像图标，没有） |
| https://rafay.co/ 、https://rafay.co/brand-assets | 159,501 / 242,220 字节 | 找到品牌页和 logo 下载链接 |
| https://rafay.co/press、/media-kit、/brand（均 404） | 每页 55,726 字节 | 找媒体包，不存在 |
