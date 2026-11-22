/* 厂商视角（view）。页头「通用 / VAST」切换；?v=vast 直达，?v=all 回通用。
   字段：
     id / zh / en   视角名
     map            切到这个视角时，首页换成哪张专题图
     notes          通用知识点页末尾「<厂商> 怎么用它」一节：站 id → {zh:[段落], en:[段落], see:[该厂商的站 id]}
   文字只写厂商公开过的功能，不比高低；see 里已上线的站可点，没做完的显示成灰字。 */
window.SS = window.SS || {};
SS.views = [
  {id:'vast', zh:'VAST', en:'VAST', map:'vast', notes:{
    rdma:{zh:['VAST 在两处用到 RDMA。客户端到 CNode 可以走 NFS over RDMA，客户端用 Linux 发行版自带的组件即可。CNode 到 DBox 的后端网络也跑在 RDMA 上，承载 NVMe-oF，每台 CNode 直接读写每一块盘。'],
          en:['VAST uses RDMA in two places. Clients can reach the CNodes over NFS over RDMA, using components that ship with Linux distributions. The back-end network between CNodes and DBoxes also runs on RDMA and carries NVMe-oF, so every CNode reads and writes every drive directly.'],
          see:['v-nfsrdma','v-dase']},
    nvmeof:{zh:['VAST 的 DASE 架构建立在 NVMe-oF 上。CNode 自己不存数据，经 NVMe-oF 直接访问所有 DBox 里的每一块盘，所以任何一台 CNode 都能处理任何请求，CNode 之间不需要互相协调。'],
            en:['The VAST DASE architecture is built on NVMe-oF. CNodes hold no data of their own and reach every drive in every DBox over NVMe-oF, so any CNode can serve any request and the CNodes do not need to coordinate with each other.'],
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
  }}
];
SS.viewById={};SS.views.forEach(function(v){SS.viewById[v.id]=v});
