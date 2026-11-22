/* 各厂商怎么做（通用知识点页末尾那几节）。
   字段：id / zh / en 厂商名（同 SS.brands 的 id，用来放 logo）；
         notes：通用站 id → {zh:[段落], en:[段落], see:[该厂商的站 id]}。
   规则：只写厂商公开过的功能，几家依次排列、不比高低；see 里已上线的站可点，没做完的显示成灰字。
   文字取自各厂商站的说明（data/stations.js），那些说明已按公开站规则审过。 */
window.SS = window.SS || {};
SS.vendors = [
  {id:'vast', zh:'VAST', en:'VAST', notes:{
    rdma:{zh:['VAST 在两处用到 RDMA。客户端到 CNode 可以走 NFS over RDMA，客户端用 Linux 发行版自带的组件即可。CNode 到 DBox 的后端网络也跑在 RDMA 上，承载 NVMe-oF，每台 CNode 直接读写每一块盘。'],
          en:['VAST uses RDMA in two places. Clients can reach the CNodes over NFS over RDMA, using components that ship with Linux distributions. The back-end network between CNodes and DBoxes also runs on RDMA and carries NVMe-oF, so every CNode reads and writes every drive directly.'],
          see:['v-nfsrdma','v-dase']},
    nvmeof:{zh:['VAST 的 DASE 架构建立在 NVMe-oF 上。CNode 自己不存数据，经 NVMe-oF 直接访问所有 DBox 里的每一块盘，所以任何一台 CNode 都能处理任何请求，常规读写时 CNode 之间不需要为缓存一致性互相协调。'],
            en:['The VAST DASE architecture is built on NVMe-oF. CNodes hold no data of their own and reach every drive in every DBox over NVMe-oF, so any CNode can serve any request and routine reads and writes need no cache-coherence coordination between CNodes.'],
            see:['v-dase','v-cnode','v-dbox']},
    ec:{zh:['VAST 把故障域缩到单块盘，条带可以铺满整套系统的盘，校验占的空间很少。再加上本地可解码纠删码，坏一块盘时只要读剩余数据的一小部分就能补回来。'],
        en:['VAST shrinks the failure domain to a single drive, so a stripe can span the drives of the whole system and parity takes very little space. With locally decodable codes, a failed drive is rebuilt by reading only a small part of the remaining data.'],
        see:['v-wec','v-ldc']},
    gds:{zh:['VAST 支持经 NFS over RDMA 的 GPUDirect Storage，数据从 DBox 经网卡直接进 GPU 显存。配合多路径，一个挂载点可以同时用上多块网卡和多台 CNode。'],
         en:['VAST supports GPUDirect Storage over NFS over RDMA, so data moves from the DBoxes through the network card straight into GPU memory. With multipath, one mount can use several network cards and several CNodes at once.'],
         see:['v-nfsrdma','v-mpath']},
    kv:{zh:['VAST 接入 NVIDIA Dynamo 的 KV 缓存分层，把推理的 KV Cache 放到共享存储上复用。显存放不下的前缀，用读取代替重算。'],
        en:['VAST plugs into the KV cache tiering in NVIDIA Dynamo and keeps inference KV cache on shared storage for reuse. Prefixes that no longer fit in GPU memory are read back instead of recomputed.'],
        see:['v-kv']},
    kvoff:{zh:['VAST 接入 NVIDIA Dynamo 的 KV 缓存分层，KV Cache 下放到共享存储后，多台推理服务器可以读到同一份。'],
           en:['VAST plugs into the KV cache tiering in NVIDIA Dynamo; once KV cache is offloaded to shared storage, several inference servers can read the same copy.'],
           see:['v-kv']},
    vec:{zh:['VAST 把向量和原始数据存在同一张表里，一次写入同时生效，检索不用两头查。'],
         en:['VAST keeps vectors and the source data in the same table, so one write updates both and a search does not have to look in two places.'],
         see:['v-vec']}
  }},
  {id:'ddn', zh:'DDN', en:'DDN', notes:{
    rdma:{zh:['EXAScaler 基于 Lustre，客户端和存储服务器之间经 Lustre 自己的网络层 LNet 通信，LNet 可以跑在 InfiniBand 和以太网上，多网卡客户端能同时用几张卡。'],
          en:['EXAScaler is based on Lustre. Clients and storage servers talk through LNet, Lustre\'s own network layer, which runs over InfiniBand and Ethernet and lets a multi-NIC client use several cards at once.'],
          see:['d-lnet','d-exa']},
    nvmeof:{zh:['DDN 的 SE2420 QLC 扩展柜经 NVMe-oF 接到主节点，加了容量仍是全闪。'],
            en:['The DDN SE2420 QLC expansion shelf attaches to the main node over NVMe-oF, so added capacity stays all-flash.'],
            see:['d-se2420']},
    ec:{zh:['DDN 的 SFA 平台用分簇 RAID（DCR，Declustered RAID）。条带仍是 RAID 6，数据表列出 8+2 和 4+2 两种（8+2 即 8 份数据、2 份校验），但这些条带打散铺在一个 DCR 池的全部盘上，池可以从 2 块盘到 900 块盘；备用空间也分散在池里的每块盘上，不再单留几块热备盘。坏一块盘时，池里很多盘一起读出存活的数据、一起写进备用空间，重建不再压在一块热备盘上。',
            'Infinia 的做法不同：客户端先切分编码再发给服务器，小写入用多副本，大写入用纠删码。'],
        en:['The DDN SFA platform uses declustered RAID (DCR). Stripes are still RAID 6; the data sheet lists 8+2 and 4+2 (8+2 means eight data pieces and two parity pieces), but the stripes are spread over every drive in a DCR pool, which can hold from 2 to 900 drives; spare space is spread over every drive too, instead of a few dedicated hot spares. When a drive fails, many drives in the pool read the surviving data and write into spare space together, so the rebuild does not land on one hot spare.',
            'Infinia works differently: the client splits and encodes data before sending it, using replicas for small writes and erasure coding for large ones.'],
        see:['d-dcr','d-sfa','d-iec']},
    gds:{zh:['EXAScaler 支持 GPUDirect Storage，数据在 GPU 显存和 EXAScaler 之间经 RDMA 直传，不走 CPU 中转。'],
         en:['EXAScaler supports GPUDirect Storage: data moves between GPU memory and EXAScaler over RDMA without staging through the CPU.'],
         see:['d-gds']},
    kv:{zh:['DDN 把推理的 KV Cache 放进共享存储，跨节点复用，不用重算。'],
        en:['DDN keeps inference KV cache in shared storage so other nodes can reuse it instead of recomputing.'],
        see:['d-kv']},
    kvoff:{zh:['DDN 把推理的 KV Cache 放进共享存储，跨节点复用，不用重算。'],
           en:['DDN keeps inference KV cache in shared storage so other nodes can reuse it instead of recomputing.'],
           see:['d-kv']},
    pfs:{zh:['EXAScaler 是基于开源 Lustre 的并行文件系统，元数据和数据由不同的服务器管理，客户端拿到文件布局后直接并行读写多台数据服务器。'],
         en:['EXAScaler is a parallel file system based on open-source Lustre. Metadata and data are served by different servers, and clients read and write many data servers in parallel once they have the file layout.'],
         see:['d-exa','d-stripe','d-client']}
  }},
  {id:'weka', zh:'WEKA', en:'WEKA', notes:{
    ec:{zh:['WEKA 用分布式数据保护：条带由 3 到 16 份数据加 2 到 4 份校验组成，常见 16+2 或 16+4。故障域通常是一台服务器，所以保护级别 2 表示能承受两台服务器同时故障。条带宽度和保护级别在建集群时定下，之后不能改；条带宽度不能超过故障域的数量。'],
        en:['WEKA uses distributed data protection: a stripe has 3 to 16 data pieces plus 2 to 4 parity pieces, commonly 16+2 or 16+4. The failure domain is usually one server, so protection level 2 means the cluster survives two servers failing at once. Stripe width and protection level are fixed when the cluster is formed and cannot be changed later, and the stripe width cannot exceed the number of failure domains.'],
        see:[]},
    gds:{zh:['在 WEKA 的 KV Cache 方案里，vLLM 用 LMCache 管理 KV Cache，再经 GPUDirect Storage 写到 NeuralMesh 上。'],
         en:['In the WEKA KV cache setup, vLLM manages KV cache with LMCache and writes it to NeuralMesh through GPUDirect Storage.'],
         see:[]},
    kv:{zh:['WEKA 的 Augmented Memory Grid 建在 NeuralMesh 上，把推理的 KV Cache 持久地存下来，显存放不下时再读回来复用，对接 NVIDIA Dynamo、TensorRT-LLM 等推理软件。'],
        en:['WEKA Augmented Memory Grid runs on NeuralMesh and keeps inference KV cache persistently, reading it back for reuse when it no longer fits in GPU memory. It works with inference software such as NVIDIA Dynamo and TensorRT-LLM.'],
        see:['w-amg','dynamo']},
    kvoff:{zh:['WEKA 的 Augmented Memory Grid 建在 NeuralMesh 上，把推理的 KV Cache 持久地存下来，显存放不下时再读回来复用。'],
           en:['WEKA Augmented Memory Grid runs on NeuralMesh and keeps inference KV cache persistently, reading it back for reuse when it no longer fits in GPU memory.'],
           see:['w-amg','w-tw']},
    pfs:{zh:['WEKA 的纯软件并行文件系统现以 NeuralMesh 为名发布，没有单独的元数据服务器，元数据和数据都分散在整个集群里并行处理。'],
         en:['The WEKA software-only parallel file system now ships as NeuralMesh. There is no separate metadata server; metadata and data are both spread across the whole cluster and processed in parallel.'],
         see:['w-nm','w-meta']}
  }}
];
/* 通用知识点页的厂商对照表（放在各厂商说明前面）：只列事实，几家并排，不打分。 */
SS.vendorCompare={
  ec:{note:['条带越宽，校验占的比例越低，坏盘后重建要读的数据也越多；几家用不同的办法在这两头之间取舍。','The wider the stripe, the smaller the share taken by parity and the more data a rebuild has to read; each design balances the two in its own way.'],
    cols:['vast','ddn','weka'],
    rows:[
      {h:['条带','Stripe'],v:[['最宽 146+4','Up to 146+4'],['RAID 6 8+2 或 4+2','RAID 6 8+2 or 4+2'],['3 到 16 份数据加 2 到 4 份校验，常见 16+2','3–16 data + 2 to 4 parity, commonly 16+2']]},
      {h:['校验占比','Parity share'],v:[['146+4 时约 2.7%','About 2.7% at 146+4'],['8+2 时 20%','20% at 8+2'],['16+2 时约 11%','About 11% at 16+2']]},
      {h:['故障域','Failure domain'],v:[['单块盘（DBox 内部没有单点）','A single drive (no single point inside a DBox)'],['盘；条带打散在整个 DCR 池里','A drive; stripes spread across the whole DCR pool'],['通常是一台服务器','Usually one server']]},
      {h:['坏盘后重建','Rebuild after a failure'],v:[['所有 CNode 一起读存活数据；本地可解码纠删码只需读其中一部分','All CNodes read the surviving data; locally decodable codes read only part of it'],['池里很多盘一起读、一起写进分散的备用空间','Many drives in the pool read together and write into spread-out spare space'],['集群里的服务器一起参与','Servers across the cluster take part']]},
      {h:['出处','Source'],v:[['VAST AI OS 白皮书，2026-04','VAST AI OS white paper, 2026-04'],['DDN SFA18KX 数据表','DDN SFA18KX data sheet'],['WEKA 文档：Cluster capacity and redundancy management','WEKA docs: Cluster capacity and redundancy management']]}
    ]}
};
SS.vendorById={};SS.vendors.forEach(function(v){SS.vendorById[v.id]=v});
