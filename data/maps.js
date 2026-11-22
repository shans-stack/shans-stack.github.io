/* 地图（map）。
   字段：
     id / zh / en   地图名
     kind           main（总图）或 topic（专题图）
     href           页面地址（相对站点根目录）
     lines          这张图上的线，从上到下的顺序
     talk           默认讲稿 id（data/talks.js）
     st             live 已上线 / wip 整理中（整理中的图只在首页专题入口显示，不出图）
     d              一句地图说明
     brand          这张图属于哪家厂商（SS.brands 里的 id）。首页专题入口、专题图页头显示它的 logo
   一张地图默认显示哪些站：停靠在它任一条线上、且没有标 hidden 的站。 */
window.SS = window.SS || {};
SS.maps = [
  {id:'home', kind:'main', href:'index.html', zh:'总图', en:'Main Map', st:'live',
   lines:['a','m','d','c','n','s'], talk:'ai-basics',
   d:{zh:'六条主干线，只放通用概念。', en:'Six trunk lines, general concepts only.'}},
  {id:'vast', kind:'topic', href:'maps/vast/index.html', zh:'VAST', en:'VAST', st:'live', brand:'vast',
   lines:['v-aios','v-proto','v-red','v-prot','v-arch','v-deploy','v-hw'], talk:'vast-core',
   d:{zh:'软件（AI OS）、硬件两条产品线，加五条技术线：访问协议、数据缩减、数据保护、架构和部署。', en:'Two product lines, software (the AI OS) and hardware, plus five technical lines: access protocols, data reduction, data protection, architecture and deployment.'}},
  {id:'ddn', kind:'topic', href:'maps/ddn/index.html', zh:'DDN', en:'DDN', st:'live', brand:'ddn',
   lines:['d-sw','d-lus','d-lay','d-dp','d-ai','d-inf','d-hw'], talk:'ddn-core',
   d:{zh:'软件、硬件两条产品线，加 EXAScaler 和 Infinia 等技术线：并行文件系统和数据平台各怎么工作。', en:'Two product lines for software and hardware, plus technical lines on EXAScaler and Infinia: how the parallel file system and the data platform each work.'}},
  {id:'weka', kind:'topic', href:'maps/weka/index.html', zh:'WEKA', en:'WEKA', st:'live', brand:'weka',
   lines:['w-ai','w-proto','w-sw','w-arch','w-k8s','w-data','w-deploy','w-hw'], talk:'weka-core',
   d:{zh:'软件、硬件两条产品线，加六条技术线：用户态的并行文件系统、访问协议、Kubernetes、快照和 KV Cache 卸载。', en:'Two product lines for software and hardware, plus six technical lines: a user-space parallel file system, access protocols, Kubernetes, snapshots and KV cache offload.'}},
  {id:'rafay', kind:'topic', href:'maps/rafay/index.html', zh:'Rafay', en:'Rafay', st:'live', brand:'rafay',
   lines:['r-ai','r-self','r-gov','r-cp','r-infra'], talk:'rafay-core',
   d:{zh:'五条线：GPU 云的控制平面怎么做自助交付、多租户治理，怎么管 Kubernetes 集群和 GPU。', en:'Five lines: how a GPU cloud control plane does self-service and multi-tenant governance, and runs Kubernetes clusters and GPUs.'}},
  {id:'nvnet', kind:'topic', href:'', zh:'NVIDIA 网络', en:'NVIDIA Networking', st:'wip', brand:'nvidia',
   lines:[], talk:null,
   d:{zh:'InfiniBand、Spectrum-X、轨道拓扑。整理中。', en:'InfiniBand, Spectrum-X, rail topologies. In preparation.'}}
];

/* 厂商 logo。文件与出处、使用规定见 assets/brand/SOURCES.md。
   字段：
     name    读屏读的名字
     src     浅色底用的 logo（相对站点根目录）
     dark    深色底用的 logo；厂商没有白色版时省略，改由 backing 垫一块浅色底
     backing true：深色模式下垫浅灰底（#DADCDF），因为 logo 只有深色字、厂商没给白色版
   专题图写 brand 字段指向这里；知识点页按站的 tag（vast / ddn / weka / rafay）找同名的 brand。 */
SS.brands = {
  vast:   {name:'VAST Data', src:'assets/brand/vast-wordmark-black.svg', dark:'assets/brand/vast-wordmark-white.svg'},
  ddn:    {name:'DDN', src:'assets/brand/ddn-logo-primary-color.svg', backing:true},
  nvidia: {name:'NVIDIA', src:'assets/brand/nvidia-logo-horz-trim.svg', backing:true},
  weka:   {name:'WEKA', src:'assets/brand/weka-logo-ink.svg', dark:'assets/brand/weka-logo-white.svg'},
  rafay:  {name:'Rafay', src:'assets/brand/rafay-logo-positive-trim.svg', dark:'assets/brand/rafay-logo-negative.svg'}
};
