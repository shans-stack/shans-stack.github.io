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
  {id:'v-aios', map:'vast', zh:'AI OS', en:'AI OS', slot:'l1', sym:'i-ai',
   d:{zh:'存储之上长出来的数据库、向量检索和事件处理。', en:'The database, vector search and event processing that grow out of the storage.'}},
  {id:'v-proto', map:'vast', zh:'访问协议', en:'Access protocols', gut:{en:'Protocols'}, slot:'l4', sym:'i-net',
   d:{zh:'客户端用什么方式读写同一份数据。', en:'The ways clients read and write the same data.'}},
  {id:'v-arch', map:'vast', zh:'架构', en:'Architecture', slot:'l3', sym:'i-arch',
   d:{zh:'计算节点和存储箱各做什么，怎么连在一起。', en:'What the compute nodes and storage boxes each do, and how they connect.'}},
  {id:'v-deploy', map:'vast', zh:'部署', en:'Deployment', slot:'l6', sym:'i-rack',
   d:{zh:'买回来以后有哪几种搭法。', en:'The ways a system can be put together on site.'}},
  {id:'v-prot', map:'vast', zh:'数据保护', en:'Data protection', gut:{en:'Protection'}, slot:'l5', sym:'i-shield',
   d:{zh:'盘坏了、站点出事了，数据怎么不丢。', en:'How data survives failed drives and lost sites.'}},
  {id:'v-red', map:'vast', zh:'数据缩减', en:'Data reduction', gut:{en:'Reduction'}, slot:'l2', sym:'i-squeeze',
   d:{zh:'同样的闪存怎么放下更多数据，还用得久。', en:'How the same flash holds more data and lasts longer.'}},

  /* ---------- DDN 专题图 ---------- */
  {id:'d-hw', map:'ddn', zh:'硬件系列', en:'Hardware', slot:'l3', sym:'i-rack',
   d:{zh:'装在机柜里的那几款机器和扩展柜。', en:'The appliances and expansion shelves that go into the rack.'}},
  {id:'d-lus', map:'ddn', zh:'EXAScaler', en:'EXAScaler', slot:'l4', sym:'i-sto',
   d:{zh:'建在开源 Lustre 上的并行文件系统，元数据和数据各走一条路。', en:'A parallel file system built on open-source Lustre, with separate paths for metadata and data.'}},
  {id:'d-lay', map:'ddn', zh:'布局与分层', en:'Layout & tiering', gut:{en:'Layout'}, slot:'l2', sym:'i-layers',
   d:{zh:'大小文件、冷热数据各放在合适的地方。', en:'Putting small and large files, hot and cold data, in the right place.'}},
  {id:'d-dp', map:'ddn', zh:'数据保护', en:'Data protection', gut:{en:'Protection'}, slot:'l5', sym:'i-shield',
   d:{zh:'从盘、控制器到文件，一层层防丢、防坏。', en:'Layer by layer, from drives and controllers to files, against loss and damage.'}},
  {id:'d-ai', map:'ddn', zh:'AI 数据路径', en:'AI data path', gut:{en:'AI path'}, slot:'l1', sym:'i-cmp',
   d:{zh:'GPU、容器和普通应用分别怎样拿到数据。', en:'How GPUs, containers and ordinary applications each get to the data.'}},
  {id:'d-inf', map:'ddn', zh:'Infinia', en:'Infinia', slot:'l6', sym:'i-key',
   d:{zh:'以键值引擎为底座的数据平台，S3、文件、KV Cache 都是上面的视图。', en:'A data platform on a key-value core, with S3, files and KV cache as views on top.'}},

  /* ---------- WEKA 专题图 ---------- */
  {id:'w-ai', map:'weka', zh:'AI 推理', en:'AI inference', gut:{en:'Inference'}, slot:'l1', sym:'i-ai',
   d:{zh:'推理的 KV Cache 怎么放到共享存储上，又怎么和推理框架接起来。', en:'How inference KV cache moves onto shared storage, and how it connects to inference frameworks.'}},
  {id:'w-proto', map:'weka', zh:'访问协议', en:'Access protocols', gut:{en:'Protocols'}, slot:'l4', sym:'i-net',
   d:{zh:'应用用哪几种方式读写同一个文件系统。', en:'The ways applications read and write the same file system.'}},
  {id:'w-arch', map:'weka', zh:'架构', en:'Architecture', slot:'l3', sym:'i-arch',
   d:{zh:'纯软件的并行文件系统怎么绕开内核，把元数据也分散开。', en:'How a software-only parallel file system bypasses the kernel and spreads its metadata out too.'}},
  {id:'w-k8s', map:'weka', zh:'Kubernetes', en:'Kubernetes', slot:'l2', sym:'i-layers',
   d:{zh:'在 Kubernetes 里部署、划分和使用 WEKA。', en:'Deploying, dividing up and using WEKA inside Kubernetes.'}},
  {id:'w-data', map:'weka', zh:'数据服务', en:'Data services', gut:{en:'Data svc'}, slot:'l5', sym:'i-shield',
   d:{zh:'快照、快照策略，和把快照整包送到对象存储。', en:'Snapshots, snapshot policies, and shipping whole snapshots to object storage.'}},
  {id:'w-deploy', map:'weka', zh:'部署形态', en:'Deployment', slot:'l6', sym:'i-rack',
   d:{zh:'一体机、参考设计、公有云，和跑在 GPU 服务器上的几种搭法。', en:'Appliances, reference designs, public cloud, and running on the GPU servers themselves.'}},

  /* ---------- Rafay 专题图 ---------- */
  {id:'r-ai', map:'rafay', zh:'AI 服务', en:'AI services', slot:'l1', sym:'i-ai',
   d:{zh:'平台上交付给用户的开发、推理和 AI 应用环境。', en:'The development, inference and AI application environments the platform hands to users.'}},
  {id:'r-self', map:'rafay', zh:'自助交付', en:'Self-service', slot:'l2', sym:'i-dat',
   d:{zh:'用户自己申请集群、虚拟机和工作区。', en:'Users request clusters, VMs and workspaces themselves.'}},
  {id:'r-gov', map:'rafay', zh:'多租户与治理', en:'Tenancy & governance', gut:{en:'Governance'}, slot:'l5', sym:'i-shield',
   d:{zh:'很多租户共用一套基础设施，还能统一管住。', en:'Many tenants share one infrastructure and are still governed from one place.'}},
  {id:'r-cp', map:'rafay', zh:'控制平面', en:'Control plane', gut:{en:'Control'}, slot:'l3', sym:'i-arch',
   d:{zh:'平台本身怎么接进机房，可以装在哪些环境。', en:'How the platform itself connects to a data centre, and where it can run.'}},
  {id:'r-infra', map:'rafay', zh:'基础设施与 GPU', en:'Infrastructure & GPUs', gut:{en:'Infra'}, slot:'l6', sym:'i-rack',
   d:{zh:'从裸金属到 Kubernetes 集群，再到按需取用的 GPU。', en:'From bare metal to Kubernetes clusters to GPUs on demand.'}}
];
