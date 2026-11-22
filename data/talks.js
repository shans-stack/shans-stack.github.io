/* 讲稿（talk）：一张地图上按顺序排好的几个站。
   字段：id、map（所属地图）、zh / en（讲稿名）、min（分钟）、stops（站 id，按讲解顺序）。
   路线是算出来的：沿线走，只在换乘站换线，整场一起求最短。 */
window.SS = window.SS || {};
SS.talks = [
  {id:'ai-basics', map:'home', zh:'AI 集群入门', en:'AI Clusters, the Basics', min:15,
   stops:['gpu','nvl','rdma','roce','dist','ckpt']},
  {id:'data-to-gpu', map:'home', zh:'数据怎么喂给 GPU', en:'How Data Gets to the GPU', min:12,
   stops:['obj','pfs','nvmeof','rdma','gpu']},
  {id:'vast-core', map:'vast', zh:'VAST 核心架构', en:'VAST Core Architecture', min:20,
   stops:['v-dase','v-cnode','v-dbox','v-wec','v-ldc','v-scm','v-sim','v-mpath']},
  {id:'ddn-core', map:'ddn', zh:'DDN 怎么喂饱 GPU', en:'How DDN Keeps GPUs Fed', min:18,
   stops:['d-exa','d-stripe','d-dom','d-hotpools','d-dcr','gds','d-kv']},
  {id:'weka-core', map:'weka', zh:'WEKA 怎么工作', en:'How WEKA Works', min:18,
   stops:['w-nm','w-meta','w-dpdk','w-vfs','w-snap','w-s2o','w-pod','w-amg']},
  {id:'rafay-core', map:'rafay', zh:'Rafay 怎么把 GPU 变成 AI 云', en:'How Rafay Turns GPUs into an AI Cloud', min:16,
   stops:['r-plat','r-agent','r-kmgr','r-slice','r-mt','r-em','r-ws','r-infer']}
];
