/* 线（line）。每条线属于一张地图；地图里线的上下顺序由 data/maps.js 的 lines 数组决定。
   字段：
     id     全站唯一的短 id
     map    所属地图 id
     zh/en  线名；gut 是地铁图左侧放得下的短名（可省）
     slot   颜色槽位 l1 到 l6（颜色在 assets/palette.css，由 tools/pal.py 生成）
     sym    线端符号（assets/symbols.js 里的 symbol id）
     d      一句线说明（zh / en） */
window.SS = window.SS || {};
SS.lines = [
  /* ---------- 总图：六条主干线 ---------- */
  {id:'m', map:'home', zh:'模型', en:'Model', slot:'l6', sym:'i-layers',
   d:{zh:'模型本身怎么搭、占多少显存、怎么训出来。', en:'How the model itself is built, how much memory it takes, and how it gets trained.'}},
  {id:'a', map:'home', zh:'AI 应用', en:'AI Application', gut:{en:'AI apps'}, slot:'l1', sym:'i-ai',
   d:{zh:'模型上线以后，推理服务和应用在做什么。', en:'What inference and applications do once a model ships.'}},
  {id:'d', map:'home', zh:'数据', en:'Data', slot:'l2', sym:'i-dat',
   d:{zh:'训练和推理用的数据从哪来、怎么流动。', en:'Where training and inference data comes from, and how it flows.'}},
  {id:'c', map:'home', zh:'计算', en:'Compute', slot:'l3', sym:'i-cmp',
   d:{zh:'GPU 服务器和训练集群里面在发生什么。', en:'What happens inside GPU servers and training clusters.'}},
  {id:'n', map:'home', zh:'网络', en:'Network', slot:'l4', sym:'i-net',
   d:{zh:'数据怎么在机器之间走。', en:'How data moves between machines.'}},
  {id:'s', map:'home', zh:'存储', en:'Storage', slot:'l5', sym:'i-sto',
   d:{zh:'数据放在哪，又怎么快速读回来。', en:'Where data lives and how it comes back fast.'}},

  /* ---------- VAST 专题图 ---------- */
  {id:'v-aios', map:'vast', prod:true, zh:'VAST AI OS', en:'VAST AI OS', slot:'l8', sym:'i-ai',
   d:{zh:'VAST 的软件层，官方统称 VAST AI OS。', en:'VAST\'s software layer, officially the VAST AI OS.'}},
  {id:'v-ai', map:'vast', zh:'AI 数据服务', en:'AI Data Services', gut:{en:'AI data'}, slot:'l1', sym:'i-dat',
   d:{zh:'VAST 面向 AI 的数据能力：向量检索和 KV Cache 卸载。', en:'VAST\'s data capabilities for AI: vector search and KV cache offload.'}},
  {id:'v-proto', map:'vast', zh:'访问协议', en:'Access Protocols', gut:{en:'Protocols'}, slot:'l4', sym:'i-net',
   d:{zh:'客户端用什么方式读写同一份数据。', en:'The ways clients read and write the same data.'}},
  {id:'v-arch', map:'vast', zh:'架构', en:'Architecture', slot:'l3', sym:'i-arch',
   d:{zh:'计算节点和存储箱各做什么，怎么连在一起。', en:'What the compute nodes and storage boxes each do, and how they connect.'}},
  {id:'v-deploy', map:'vast', zh:'部署', en:'Deployment', slot:'l6', sym:'i-rack',
   d:{zh:'买回来以后有哪几种搭法。', en:'The ways a system can be put together on site.'}},
  {id:'v-prot', map:'vast', zh:'数据保护', en:'Data Protection', gut:{en:'Protection'}, slot:'l5', sym:'i-shield',
   d:{zh:'纠删码、SCM 写缓冲、快照和复制。', en:'Erasure coding, the SCM write buffer, snapshots and replication.'}},
  {id:'v-media', map:'vast', zh:'介质与写入', en:'Media and Writes', gut:{en:'Media'}, slot:'l9', sym:'i-sto',
   d:{zh:'用什么闪存、写入怎么先落到 SCM 再整理到 QLC。', en:'Which flash is used, and how writes land in SCM before being laid out on QLC.'}},
  {id:'v-red', map:'vast', zh:'数据服务', en:'Data Services', gut:{en:'Data svc'}, slot:'l2', sym:'i-layers',
   d:{zh:'去重与压缩、多租户、SCM 写缓冲和全局命名空间。', en:'Deduplication and compression, multitenancy, the SCM write buffer and the global namespace.'}},
  {id:'v-hw', map:'vast', prod:true, zh:'VAST 硬件', en:'VAST Hardware', gut:{en:'VAST HW'}, slot:'l7', sym:'i-cmp',
   d:{zh:'VAST 自己的硬件产品。', en:'VAST\'s own hardware products.'}},

  /* ---------- DDN 专题图 ---------- */
  {id:'d-hw', map:'ddn', prod:true, zh:'DDN 硬件', en:'DDN Hardware', gut:{en:'DDN HW'}, slot:'l7', sym:'i-cmp',
   d:{zh:'DDN 自己的硬件产品。', en:'DDN\'s own hardware products.'}},
  {id:'d-lus', map:'ddn', zh:'EXAScaler 架构', en:'EXAScaler Architecture', gut:{en:'EXAScaler'}, slot:'l3', sym:'i-arch',
   d:{zh:'EXAScaler 由哪些服务组成，客户端怎么找到数据。', en:'The services EXAScaler is built from, and how clients find data.'}},
  {id:'d-lay', map:'ddn', zh:'数据服务', en:'Data Services', gut:{en:'Data svc'}, slot:'l2', sym:'i-layers',
   d:{zh:'文件怎么分布到存储上：条带、目录拆分、小文件、热数据池和渐进布局。', en:'How files are laid out on storage: striping, directory splitting, small files, hot pools and progressive layouts.'}},
  {id:'d-dp', map:'ddn', zh:'数据保护', en:'Data Protection', gut:{en:'Protection'}, slot:'l5', sym:'i-shield',
   d:{zh:'盘坏了、控制器坏了，数据怎么不丢，以及加密。', en:'How data survives failed drives and controllers, plus encryption.'}},
  {id:'d-ai', map:'ddn', zh:'AI 数据服务', en:'AI Data Services', gut:{en:'AI data'}, slot:'l1', sym:'i-dat',
   d:{zh:'DDN 面向 AI 的数据能力：共享的 KV Cache 层和 GPU 节点上的热数据缓存。', en:'DDN\'s data capabilities for AI: a shared KV cache layer and hot-data caching on the GPU nodes.'}},
  {id:'d-proto', map:'ddn', zh:'访问协议', en:'Access Protocols', gut:{en:'Protocols'}, slot:'l4', sym:'i-net',
   d:{zh:'客户端用什么方式读写数据：原生客户端、NFS / SMB 网关、S3、Kubernetes CSI 和 GPUDirect Storage。', en:'How clients read and write data: the native client, NFS / SMB gateways, S3, Kubernetes CSI and GPUDirect Storage.'}},
  {id:'d-inf', map:'ddn', zh:'Infinia 架构', en:'Infinia Architecture', gut:{en:'Infinia'}, slot:'l3', sym:'i-key',
   d:{zh:'Infinia 怎样以键值存储为底座，在上面提供各种协议。', en:'How Infinia builds on a key-value store and serves protocols on top.'}},
  {id:'d-deploy', map:'ddn', zh:'部署', en:'Deployment', slot:'l6', sym:'i-rack',
   d:{zh:'预装软件的一体机形态。', en:'Appliance forms that ship with the software preinstalled.'}},
  {id:'d-sw', map:'ddn', prod:true, zh:'DDN 软件', en:'DDN Software', gut:{en:'DDN SW'}, slot:'l8', sym:'i-ai',
   d:{zh:'DDN 自己的软件产品。', en:'DDN\'s own software products.'}},

  /* ---------- WEKA 专题图 ---------- */
  {id:'w-ai', map:'weka', zh:'AI 数据服务', en:'AI Data Services', gut:{en:'AI data'}, slot:'l1', sym:'i-dat',
   d:{zh:'WEKA 面向 AI 推理的数据能力：把 KV Cache 放到存储上。', en:'WEKA\'s data capabilities for AI inference: KV cache kept on storage.'}},
  {id:'w-proto', map:'weka', zh:'访问协议', en:'Access Protocols', gut:{en:'Protocols'}, slot:'l4', sym:'i-net',
   d:{zh:'客户端用什么方式读写数据：VFS 驱动、NFS / SMB、S3、CSI 和 GPUDirect Storage。', en:'How clients read and write data: the VFS driver, NFS / SMB, S3, CSI and GPUDirect Storage.'}},
  {id:'w-arch', map:'weka', zh:'架构', en:'Architecture', slot:'l3', sym:'i-arch',
   d:{zh:'纯软件的并行文件系统怎么绕开内核，把元数据也分散开。', en:'How a software-only parallel file system bypasses the kernel and spreads its metadata out too.'}},
  {id:'w-data', map:'weka', zh:'数据服务', en:'Data Services', gut:{en:'Data svc'}, slot:'l2', sym:'i-layers',
   d:{zh:'卷快照与克隆，以及查询快照之间差异的接口。', en:'Volume snapshots and clones, and the interface for listing differences between snapshots.'}},
  {id:'w-prot', map:'weka', zh:'数据保护', en:'Data Protection', gut:{en:'Protection'}, slot:'l5', sym:'i-shield',
   d:{zh:'快照、快照策略，以及把快照送到对象存储。', en:'Snapshots, snapshot policies, and sending snapshots to object storage.'}},
  {id:'w-deploy', map:'weka', zh:'部署', en:'Deployment', slot:'l6', sym:'i-rack',
   d:{zh:'一体机、参考设计、公有云、Kubernetes，和跑在 GPU 服务器上的几种搭法。', en:'Appliances, reference designs, public cloud, Kubernetes, and running on the GPU servers themselves.'}},
  {id:'w-sw', map:'weka', prod:true, zh:'WEKA 软件', en:'WEKA Software', gut:{en:'WEKA SW'}, slot:'l8', sym:'i-ai',
   d:{zh:'WEKA 自己的软件产品。', en:'WEKA\'s own software products.'}},
  {id:'w-hw', map:'weka', prod:true, zh:'WEKA 硬件', en:'WEKA Hardware', gut:{en:'WEKA HW'}, slot:'l7', sym:'i-cmp',
   d:{zh:'WEKA 自己的硬件产品。', en:'WEKA\'s own hardware products.'}},

  /* ---------- Rafay 专题图 ---------- */
  {id:'r-ai', map:'rafay', zh:'AI 服务', en:'AI Services', slot:'l1', sym:'i-ai',
   d:{zh:'平台上交付给用户的开发、推理和 AI 应用环境。', en:'The development, inference and AI application environments the platform hands to users.'}},
  {id:'r-self', map:'rafay', zh:'自助交付', en:'Self-service', slot:'l2', sym:'i-dat',
   d:{zh:'用户自己申请集群、虚拟机和工作区。', en:'Users request clusters, VMs and workspaces themselves.'}},
  {id:'r-gov', map:'rafay', zh:'多租户与治理', en:'Tenancy & Governance', gut:{en:'Governance'}, slot:'l5', sym:'i-shield',
   d:{zh:'很多租户共用一套基础设施，还能统一管住。', en:'Many tenants share one infrastructure and are still governed from one place.'}},
  {id:'r-cp', map:'rafay', zh:'控制平面', en:'Control Plane', gut:{en:'Control'}, slot:'l3', sym:'i-arch',
   d:{zh:'平台本身怎么接进机房，可以装在哪些环境。', en:'How the platform itself connects to a data centre, and where it can run.'}},
  {id:'r-infra', map:'rafay', zh:'基础设施与 GPU', en:'Infrastructure & GPUs', gut:{en:'Infra'}, slot:'l6', sym:'i-rack',
   d:{zh:'从裸金属到 Kubernetes 集群，再到按需取用的 GPU。', en:'From bare metal to Kubernetes clusters to GPUs on demand.'}}
];
