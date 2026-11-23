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
     place          换乘站在图下清单里归哪一节：{站 id: 线 id}。没写的按「停在产品线就放产品线，否则放第一条线」
   一张地图默认显示哪些站：停靠在它任一条线上、且没有标 hidden 的站。 */
window.SS = window.SS || {};
SS.maps = [
  {id:'home', kind:'main', href:'index.html', zh:'总图', en:'Main Map', st:'live',
   place:{rdma:'n',nvmeof:'s',gds:'s',dist:'c',ckpt:'d',vec:'d'}, lines:['a','m','d','c','n','s'], talk:'ai-basics',
   d:{zh:'六条主干线，只放通用概念。', en:'Six trunk lines, general concepts only.'}},
  {id:'vast', kind:'topic', href:'maps/vast/index.html', zh:'VAST', en:'VAST', st:'live', brand:'vast',
   place:{'v-scm':'v-media'}, lines:['v-ai','v-aios','v-proto','v-red','v-prot','v-media','v-arch','v-deploy','v-hw'], talk:'vast-core',
   d:{zh:'软件（AI OS）、硬件两条产品线，加五条技术线：访问协议、数据缩减、数据保护、架构和部署。', en:'Two product lines, software (the AI OS) and hardware, plus five technical lines: access protocols, data reduction, data protection, architecture and deployment.'}},
  {id:'ddn', kind:'topic', href:'maps/ddn/index.html', zh:'DDN', en:'DDN', st:'live', brand:'ddn',
   place:{'d-flr':'d-dp'}, lines:['d-ai','d-sw','d-proto','d-lay','d-dp','d-lus','d-inf','d-hw','d-ext'], talk:'ddn-core',
   d:{zh:'软件、硬件两条产品线，加 EXAScaler 和 Infinia 等技术线：并行文件系统和数据平台各怎么工作。', en:'Two product lines for software and hardware, plus technical lines on EXAScaler and Infinia: how the parallel file system and the data platform each work.'}},
  {id:'weka', kind:'topic', href:'maps/weka/index.html', zh:'WEKA', en:'WEKA', st:'live', brand:'weka',
   lines:['w-ai','w-sw','w-proto','w-data','w-prot','w-arch','w-deploy','w-hw'], talk:'weka-core',
   d:{zh:'软件、硬件两条产品线，加六条技术线：用户态的并行文件系统、访问协议、Kubernetes、快照和 KV Cache 卸载。', en:'Two product lines for software and hardware, plus six technical lines: a user-space parallel file system, access protocols, Kubernetes, snapshots and KV cache offload.'}},
  {id:'tokenfactory', kind:'topic', href:'maps/tokenfactory/index.html', zh:'AI Token Factory', en:'AI Token Factory', st:'live',
   lines:['f-tok','f-orch','f-eng','f-kv','f-ai','f-prod','f-gov','f-cp','f-infra'], talk:'factory-core',
   d:{zh:'AI 工厂怎么生产 Token：请求从网关进来，路由到推理引擎，借助 KV Cache 生成；背后是自助交付、多租户治理和 GPU 调度。', en:'How an AI factory produces tokens: requests enter through a gateway, are routed to inference engines and generated with help from KV cache, backed by self-service delivery, multi-tenant governance and GPU scheduling.'}},
  {id:'nvidia', kind:'topic', href:'maps/nvidia/index.html', zh:'NVIDIA', en:'NVIDIA', st:'live', brand:'nvidia',
   lines:['n-sw','n-dev','n-acc','n-ra','n-sys','n-netsw','n-net','n-nic','n-rack','n-gen','n-hw'], talk:null,
   d:{zh:'NVIDIA 的 AI 软件、加速计算软件、网络、整机系统与硬件。', en:'NVIDIA AI software, accelerated computing software, networking, systems and hardware.'}},
  {id:'bench', kind:'topic', href:'maps/bench/index.html', zh:'性能基准', en:'Performance Benchmarks', st:'live',
   lines:['b-read','b-ai','b-inf','b-data','b-gpu','b-e2e','b-micro'], talk:null,
   d:{zh:'GPU、集群、推理、数据系统和存储的性能基准怎么读：测了什么负载、用什么指标、两个结果能不能比。', en:'How to read GPU, cluster, inference, data system and storage benchmarks: what load was applied, which metrics, and whether two results compare.'}}
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

/* 站与站之间的虚线连接：两个不同的站，一个建在另一个之上（同一个东西停几条线用换乘胶囊，不用这里）。
   字段：map 图 id；a、b 两站；d 弹窗里的一句说明。a 在 b 正上方同一列时，a 的站名写在线的上方，虚线竖直连到 b。 */
SS.links = [
  {map:'vast', a:'kvoff', b:'v-kvp', d:{zh:'VAST KV Cache 方案是 KV Cache 卸载在 VAST 上的做法，KV Cache 存在 DataStore 上。', en:'The VAST KV cache solution is how KV cache offload is done on VAST, with KV cache kept on DataStore.'}},
  {map:'weka', a:'kvoff', b:'w-amg', d:{zh:'WEKA 用 Augmented Memory Grid 存放卸载出来的 KV Cache。', en:'WEKA keeps offloaded KV cache in Augmented Memory Grid.'}},
  {map:'ddn', a:'kvoff', b:'d-kvp', d:{zh:'DDN KV Cache 方案是 KV Cache 卸载在 DDN 产品上的做法。', en:'The DDN KV cache solution is how KV cache offload is done on DDN products.'}},
  {map:'nvidia', a:'n-nvl72', b:'n-blackwell', d:{zh:'GB200 NVL72 用的是 Blackwell GPU。', en:'GB200 NVL72 is built on Blackwell GPUs.'}},
  {map:'nvidia', a:'n-gb300', b:'n-bwu', d:{zh:'GB300 NVL72 用的是 Blackwell Ultra GPU。', en:'GB300 NVL72 is built on Blackwell Ultra GPUs.'}},
  {map:'nvidia', a:'n-vr', b:'n-rubin', d:{zh:'Vera Rubin NVL72 用的是 Rubin GPU，搭配 Vera CPU。', en:'Vera Rubin NVL72 is built on Rubin GPUs and Vera CPUs.'}},
  {map:'vast', a:'ds', b:'v-datastore', d:{zh:'DataStore 保存训练数据集，并通过 NFS、S3 等接口向训练任务提供样本。', en:'DataStore stores training datasets and serves samples to training jobs over interfaces such as NFS and S3.'}},
  {map:'vast', a:'vec', b:'v-db', d:{zh:'DataBase 在表的向量列上建立索引，由 VAST Query Engine 执行相似度检索。', en:'DataBase indexes vector columns in its tables, and the VAST Query Engine runs similarity searches.'}},
  {map:'vast', a:'stream', b:'v-broker', d:{zh:'Event Broker 通过兼容 Kafka 的接口接收事件流，主题存为可查询的 DataBase 表。', en:'Event Broker ingests event streams through its Kafka-compatible interface and stores topics as queryable DataBase tables.'}},
  {map:'ddn', a:'ds', b:'d-exa', d:{zh:'EXAScaler 为训练任务提供共享训练数据。', en:'EXAScaler serves shared training data to training jobs.'}},
  {map:'ddn', a:'rag', b:'d-inf', d:{zh:'Infinia 为 RAG 管道提供 S3 存储，DDN 的参考方案使用 Milvus 执行向量检索。', en:'Infinia provides S3 storage for RAG pipelines. DDN’s reference solution uses Milvus for vector search.'}},
  {map:'weka', a:'ds', b:'w-nm', d:{zh:'NeuralMesh 为训练任务提供并行文件访问，支持训练数据加载。', en:'NeuralMesh provides parallel file access for loading training data.'}},
  {map:'vast', a:'pipe', b:'v-de', d:{zh:'DataEngine 通过触发器和函数编排数据摄取、转换和下游处理。', en:'DataEngine uses triggers and functions to orchestrate data ingestion, transformation and downstream processing.'}},
  {map:'vast', a:'rag', b:'v-ie', d:{zh:'InsightEngine 提供 RAG 的文档摄取管道和查询接口。', en:'InsightEngine provides document ingestion pipelines and a query API for RAG.'}},
  {map:'tokenfactory', a:'f-vllm', b:'f-lmcache', d:{zh:'LMCache 通过连接器接在 vLLM 上，替它把 KV Cache 存到更多层并复用。', en:'LMCache plugs into vLLM through a connector, storing its KV cache across more tiers and reusing it.'}},
  {map:'tokenfactory', a:'f-sglang', b:'f-hicache', d:{zh:'HiCache 是 SGLang 自带的分层 KV Cache。', en:'HiCache is the hierarchical KV cache built into SGLang.'}}
];
