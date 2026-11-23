/* 地铁图排版与绘制。
   SS.Metro.route(mapId, stops)          讲稿路线：沿线走，只在换乘站换线，整场一起求最短
   SS.Metro.layout(mapId, {show, lines})  给定要显示的站和线，算出每个站的列、行、站名是否折行、整张图的宽高
   SS.Metro.render(svg, model, opt)       把排版结果画成 SVG

   排版规则（详见 README）：
   1. 每条线一行横轨，上下顺序由地图数据定。
   2. 站按 pos 从左往右排；同一 pos 的站在同一列。换乘站在它停靠的每条线上都在同一列。
   3. 一个站停靠的线不相邻时，画成一个长胶囊跨过中间的线；胶囊里在它停靠的每条线上画点，跨过的线不画点。
   4. 相邻两列如果占用的线互不重叠，就并成一列（站少时更紧凑）；但不把换乘站的站名
      放到上一条线某个站名的正下方（两行字上下贴着，容易看成一个站）。
   5. 间距：先算出「所有站名互不重叠、也不压到胶囊」需要的最小列距，再在 954px 宽的轨道里
      拉开铺满（各张图一样宽，站少的图列距就大）。站名放不下一行时按数据里的 \n 或英文空格折成两行。
   7. 线上写了 branch 的是虚线支线：从分出它的那一站正下方竖直下去，圆弧转右，横着画到本线最后一站；那一站的站名改写在线上方；不占左侧线名、不进图例，行距贴近主线。
   6. 最小列距也放不进标准宽度时，图照样画（整体缩小），并给出「这张图太满，建议拆图」。 */
(function(){
var SS=window.SS, NS='http://www.w3.org/2000/svg';
var X0=170, TRACK=954, PMAX=140, GAP=14, LGAP=22, BODY=16, R1=90, DOT=52;  /* DOT：同一条线上相邻两站至少隔多远（站名一上一下时也不挤） */  /* LGAP：按标签算列距时，相邻站名之间至少留的空 */
var cv=document.createElement('canvas').getContext('2d'), FONT=null;
function font(){if(!FONT){FONT=getComputedStyle(document.documentElement).getPropertyValue('--f')||'sans-serif'}return FONT}
function tw(t,b){cv.font=(b?'600 ':'400 ')+'15px '+font();return cv.measureText(t).width}

/* ---------- 站名：一行 / 两行 ---------- */
function lab(sid,mark){
  var raw=SS.rawName(sid),one=SS.flat(raw),two=null;
  if(raw.indexOf('\n')>-1)two=raw.split('\n');
  else if(SS.lang()==='en'&&one.indexOf(' ')>-1&&one.length>11){
    var best=-1,mid=one.length/2;
    for(var i=0;i<one.length;i++)if(one[i]===' '&&(best<0||Math.abs(i-mid)<Math.abs(best-mid)))best=i;
    two=[one.slice(0,best),one.slice(best+1)];
  }
  return {one:one,two:two};
}

/* ---------- 路线 ---------- */
function graph(mapId,extra){
  var map=SS.mapById[mapId],G={},ML={};
  map.lines.forEach(function(l,i){ML[l]=i});
  var ids=SS.stationsOf(mapId,{all:true}).filter(function(id){return !SS.stations[id].hidden||(extra&&extra.indexOf(id)>-1)});
  map.lines.forEach(function(l){
    var on=ids.filter(function(id){return SS.stations[id].lines.indexOf(l)>-1}).sort(function(a,b){return SS.posOf(a,mapId)-SS.posOf(b,mapId)});
    on.forEach(function(id){G[l+'|'+id]={line:l,sid:id,adj:[]}});
    for(var i=1;i<on.length;i++){var a=l+'|'+on[i-1],b=l+'|'+on[i],w=1+0.01*(SS.posOf(on[i],mapId)-SS.posOf(on[i-1],mapId));G[a].adj.push([b,w]);G[b].adj.push([a,w])}
  });
  ids.forEach(function(id){
    var ls=SS.stations[id].lines.filter(function(l){return l in ML}).sort(function(a,b){return ML[a]-ML[b]});
    for(var i=1;i<ls.length;i++)if(ML[ls[i]]===ML[ls[i-1]]+1){var a=ls[i-1]+'|'+id,b=ls[i]+'|'+id;G[a].adj.push([b,1.5]);G[b].adj.push([a,1.5])}
  });
  return G;
}
function sp(G,src){
  var dist={},prev={},seen={},k;dist[src]=0;
  for(;;){var u=null,best=Infinity;for(k in dist)if(!seen[k]&&dist[k]<best){best=dist[k];u=k}
    if(u===null)break;seen[u]=1;
    G[u].adj.forEach(function(e){var nd=best+e[1];if(dist[e[0]]===undefined||nd<dist[e[0]]){dist[e[0]]=nd;prev[e[0]]=u}})}
  return {dist:dist,prev:prev};
}
function route(mapId,stops){
  stops=(stops||[]).filter(function(id){return SS.inMap(id,mapId)});
  if(!stops.length)return null;
  var G=graph(mapId,stops),cache={};
  function nodes(id){return Object.keys(G).filter(function(k){return G[k].sid===id})}
  function T(src){return cache[src]||(cache[src]=sp(G,src))}
  /* 逐段动态规划：每一站可以停在它任意一条线上；连不上的两站之间记一次「跳过」 */
  var layer={};nodes(stops[0]).forEach(function(k){layer[k]={c:0,path:[k],at:[k],jumps:[]}});
  for(var i=1;i<stops.length;i++){
    var next={},dst=nodes(stops[i]);
    Object.keys(layer).forEach(function(src){
      var t=T(src);
      dst.forEach(function(d){
        var reach=t.dist[d]!==undefined,c=layer[src].c+(reach?t.dist[d]:1000);
        if(next[d]&&next[d].c<=c)return;
        var p;if(reach){p=[d];while(p[0]!==src)p.unshift(t.prev[p[0]])}else p=[src,'~',d];
        next[d]={c:c,path:layer[src].path.concat(p.slice(1)),at:layer[src].at.concat([d]),jumps:layer[src].jumps.concat(reach?[]:[i-1])};
      });
    });
    layer=next;
  }
  var bestK=Object.keys(layer).sort(function(a,b){return layer[a].c-layer[b].c})[0],r=layer[bestK];
  var via={},transfers=0;
  for(var j=1;j<r.path.length;j++){var A=G[r.path[j-1]],B=G[r.path[j]];if(A&&B&&A.sid===B.sid&&A.line!==B.line){transfers++;via[A.sid]=1}}
  return {stops:stops,path:r.path.map(function(k){return k==='~'?null:{sid:G[k].sid,line:G[k].line}}),
    at:r.at.map(function(k){return {sid:G[k].sid,line:G[k].line}}),via:via,transfers:transfers,jumps:r.jumps};
}

/* ---------- 排版 ---------- */
function layout(mapId,o){
  var map=SS.mapById[mapId],vis=o.lines,LI={},els=[],byId={},warn=[],topic=map.kind!=='main';
  vis.forEach(function(l,i){LI[l]=i});
  o.show.forEach(function(sid){
    var s=SS.stations[sid];if(!s)return;
    var ls=s.lines.filter(function(l){return l in LI}).map(function(l){return LI[l]}).sort(function(a,b){return a-b});
    if(!ls.length)return;
    var runs=[ls];  /* 停靠的线不相邻时也画成一个长胶囊，跨过中间没停靠的线（那几条线上不画点） */
    var mark=topic&&SS.inMap(sid,'home');  /* 粗圈只给总图上的原站；厂商站的总图概念在弹窗里给 */
    runs.forEach(function(r,gi){
      var e={sid:sid,ls:r,top:r[0],bot:r[r.length-1],cap:r.length>1,split:runs.length>1,gi:gi,pos:SS.posOf(sid,mapId),mark:mark,
        pair:s.pair&&o.show.indexOf(s.pair)>-1?s.pair:null};
      e.lab=lab(sid,mark);e.bold=e.cap||mark;
      /* 胶囊最下端停在产品线（软件、硬件）上、最上端不是：站名写在最下面那条线下方，让产品线上看得到站名 */
      e.labBot=e.cap&&!!SS.line[vis[e.bot]].prod&&!SS.line[vis[e.top]].prod;
      e.w1=tw(e.lab.one,e.bold);e.w2=e.lab.two?Math.max(tw(e.lab.two[0],e.bold),tw(e.lab.two[1],e.bold)):e.w1;
      els.push(e);(byId[sid]=byId[sid]||[]).push(e);
    });
  });
  /* 虚线连接（SS.links）：a 在 b 正上方同一列时，a 的站名写在线的上方，给竖直虚线让路 */
  var links=(SS.links||[]).filter(function(k){return k.map===mapId&&byId[k.a]&&byId[k.b]});
  /* 不同列的虚线（一站分叉连到几站）：起点站名也写在线上方，给往下走的虚线让路 */
  links.forEach(function(k){var A=byId[k.a][0],B=byId[k.b][0];if(!A.cap&&A.bot<B.top&&(A.pos===B.pos||links.some(function(j){return j!==k&&j.a===k.a}))){A.labUp=true;if(B.cap&&A.pos===B.pos)B.labBot=true}});
  /* 有支线从它分出的站：支线从站点正下方竖直下去，站名改写在线上方 */
  vis.forEach(function(l){var b=SS.line[l].branch;if(b&&byId[b]&&!byId[b][0].cap)byId[b][0].labUp=true});
  els.forEach(function(e){e.fixUp=!!e.labUp});
  /* 列：同一 pos 一列，再把互不重叠的相邻列并起来 */
  var keys=[];els.forEach(function(e){if(keys.indexOf(e.pos)<0)keys.push(e.pos)});keys.sort(function(a,b){return a-b});
  var cols=keys.map(function(){return {els:[],occ:{}}});
  els.forEach(function(e){var c=cols[keys.indexOf(e.pos)];c.els.push(e);for(var l=e.top;l<=e.bot;l++){
    if(c.occ[l]&&c.occ[l]!==e.sid)warn.push('同一条线同一位置有两个站（或胶囊跨过了别的站）：'+c.occ[l]+' / '+e.sid);c.occ[l]=e.sid}});
  /* 支线上的站不和它分出来的那条线上的站并列：并列会让支线站缩到主线站正下方，斜线画不出来 */
  els.forEach(function(e){var bl=SS.line[vis[e.top]];if(!bl.branch||!byId[bl.branch])return;var c=cols[keys.indexOf(e.pos)],fl=byId[bl.branch][0].top;if(!c.occ[fl])c.occ[fl]='~'+e.sid});
  function singles(g){var s={};g.els.forEach(function(e){if(!e.cap)s[e.top]=1});return s}
  function tops(g){var s={};g.els.forEach(function(e){if(e.cap)s[e.top]=1});return s}
  function stack(a,b){var t=tops(b),si=singles(a);for(var k in t)if(si[k-1])return true;return false}
  function canMerge(g,c){for(var l in c.occ)if(g.occ[l])return false;return !stack(g,c)&&!stack(c,g)}
  var groups=[];
  cols.forEach(function(c){var g=groups[groups.length-1];
    if(g&&canMerge(g,c)){g.els=g.els.concat(c.els);for(var l in c.occ)g.occ[l]=c.occ[l]}else groups.push({els:c.els.slice(),occ:Object.assign({},c.occ)})});
  groups.forEach(function(g,ci){g.els.forEach(function(e){e.col=ci})});
  var K=groups.length;
  /* 站名所在的「带」：单站名在线下方，胶囊站名在顶线上方；胶囊身体穿过的带也算占位 */
  var bands={};
  function put(k,it){(bands[k]=bands[k]||[]).push(it)}
  els.forEach(function(e){
    put(e.cap?(e.labBot?'U'+e.bot:'L'+e.top):(e.labUp?'L'+e.top:'U'+e.top),{e:e,col:e.col,body:false});
    for(var l=e.top;l<e.bot;l++){put('U'+l,{e:e,col:e.col,body:true});put('L'+(l+1),{e:e,col:e.col,body:true})}
  });
  function hwMin(it){return it.body?BODY:it.e.w2/2}
  function choose(p){
    Object.keys(bands).forEach(function(k){var b=bands[k];
      b.forEach(function(it){if(it.body)return;var ok=true;
        b.forEach(function(j){if(j===it)return;var dc=Math.abs(j.col-it.col);
          if(dc===0||it.e.w1/2+hwMin(j)+GAP>p*dc)ok=false});
        it.two=!ok&&!!it.e.lab.two;it.e.two=it.two});
    });
  }
  function hw(it){return it.body?BODY:(it.two?it.e.w2:it.e.w1)/2}
  /* 先按「邻居都折行」的乐观假设选一行或两行，再逐对核查；撞上的一对里，把还是一行、能折的那个折成两行，直到没有冲突或无可再折 */
  function clash(p){
    var ks=Object.keys(bands);
    for(var t=0;t<ks.length;t++){var b=bands[ks[t]];
      for(var i=0;i<b.length;i++)for(var j=i+1;j<b.length;j++){var dc=Math.abs(b[i].col-b[j].col);
        if(b[i].body&&b[j].body)continue;
        if(dc===0||hw(b[i])+hw(b[j])+GAP>p*dc+0.01)return [b[i],b[j]]}}
    return null;
  }
  function settle(p){
    choose(p);
    for(var guard=0;guard<200;guard++){var c=clash(p);if(!c)return true;
      var f=[c[0],c[1]].filter(function(it){return !it.body&&!it.two&&it.e.lab.two}).sort(function(a,b){return b.e.w1-a.e.w1})[0];
      if(!f)return false;f.two=true;f.e.two=true}
    return false;
  }
  function feasible(p){return settle(p)}
  var pNeed=40;while(pNeed<600&&!feasible(pNeed))pNeed+=2;
  var pFit=K>1?TRACK/(K-1):PMAX,p=K>1?Math.max(pNeed,pFit):PMAX,tooFull=K>1&&pNeed>pFit+0.5;
  settle(p);
  if(tooFull)warn.push('TOOFULL');
  /* 按站名实际宽度给每一列单独算横坐标（同一列仍共用一个 x）：长站名多给地方，短的少给，尽量不折行、不报太满 */
  function fitLabels() {
    if(K<2||warn.some(function(w){return w!=='TOOFULL'}))return null;
    var ideal=TRACK/(K-1), minGap=Math.max(42,ideal*.6);
    var items=[];Object.keys(bands).forEach(function(k){bands[k].forEach(function(it){items.push({k:k,it:it})})});
    var folds=new Set(), flips=new Set(), canFold=els.filter(function(e){return e.lab.two&&e.w2<e.w1});
    /* 放不下时可以把单站名挪到线上方（只挪原本在线下方、不是胶囊、不是已朝上的） */
    var canFlip=els.filter(function(e){return !e.cap&&!e.labUp});
    function keyOf(o){return (!o.it.body&&flips.has(o.it.e))?'L'+o.it.e.top:o.k}
    function half(it){return it.body?BODY:(folds.has(it.e)?it.e.w2:it.e.w1)/2}
    function measure() {
      var bs={};items.forEach(function(o){var k=keyOf(o);(bs[k]=bs[k]||[]).push(o.it)});
      var next=groups.map(function(){return new Map()}), prev=groups.map(function(){return new Map()}),bad=false;
      function gap(a,b,d){
        if(d>(next[a].get(b)||0)){next[a].set(b,d);prev[b].set(a,d)}
      }
      for(var i=1;i<K;i++)gap(i-1,i,minGap);
      Object.values(bs).forEach(function(b){b.forEach(function(a,i){b.slice(i+1).forEach(function(z){
        if(a.body&&z.body)return;if(a.col===z.col){bad=true;return}
        var p=a.col<z.col?[a,z]:[z,a];gap(p[0].col,p[1].col,half(p[0])+half(p[1])+LGAP)})})});
      var lo=groups.map(function(){return 0});
      for(var i=0;i<K;i++)next[i].forEach(function(d,j){lo[j]=Math.max(lo[j],lo[i]+d)});
      return {lo:lo,next:next,prev:prev,span:bad?Infinity:lo[K-1]};
    }
    var fit=measure();
    if(fit.span===Infinity)return null;
    /* 放不下时，先把站名挪到线上方（上下错开），每次挪最能省地方的一个；挪不动了再折行 */
    while(fit.span>TRACK+.001){
      var bf=null,bfit=null;
      canFlip.forEach(function(e){if(flips.has(e))return;flips.add(e);var t=measure();flips.delete(e);
        if(!bfit||t.span<bfit.span){bf=e;bfit=t}});
      if(!bf||bfit.span>=fit.span-.5)break;
      flips.add(bf);fit=bfit;
    }
    /* 还放不下，每次折一个最能省地方的站名 */
    while(fit.span>TRACK+.001&&folds.size<canFold.length){
      var best=null,bestFit=null;
      canFold.forEach(function(e){
        if(folds.has(e))return;
        folds.add(e);
        var trial=measure();
        folds.delete(e);
        if(!bestFit||trial.span<bestFit.span||
           (trial.span===bestFit.span&&e.w1-e.w2>best.w1-best.w2)){best=e;bestFit=trial}
      });
      folds.add(best);fit=bestFit;
    }
    if(fit.span>TRACK+.001)return null;
    /* 放下后回头看：能不折的不折，能放回线下方的放回 */
    [folds,flips].forEach(function(set){Array.from(set).forEach(function(e){
      set.delete(e);
      var trial=measure();
      if(trial.span<=TRACK+.001)fit=trial;else set.add(e);
    })});
    if(!tooFull&&!flips.size&&folds.size>=els.filter(function(e){return e.two}).length)return null;
    var lo=fit.lo,hi=groups.map(function(){return TRACK}),x=lo.slice(),next=fit.next,prev=fit.prev;
    x[K-1]=lo[K-1]=TRACK;
    for(var i=K-1;i>=0;i--)next[i].forEach(function(d,j){hi[i]=Math.min(hi[i],hi[j]-d)});
    for(var pass=0;pass<24;pass++)for(var c=1;c<K-1;c++){
      var i=pass%2?K-1-c:c,l=lo[i],h=hi[i];
      prev[i].forEach(function(d,j){l=Math.max(l,x[j]+d)});
      next[i].forEach(function(d,j){h=Math.min(h,x[j]-d)});
      x[i]=Math.max(l,Math.min(h,((x[i-1]+x[i+1])/2+i*ideal)/2));
    }
    /* 把挪到上方的站名真正搬进线上方那一带，后面算行距、画图都按新位置 */
    items.forEach(function(o){var k=keyOf(o);if(k!==o.k){bands[o.k].splice(bands[o.k].indexOf(o.it),1);(bands[k]=bands[k]||[]).push(o.it);o.it.e.labUp=true;o.it.e.flip=true}});
    Object.values(bands).forEach(function(b){b.forEach(function(it){if(!it.body)it.e.two=it.two=folds.has(it.e)})});
    return x;
  }
  var colX=(tooFull||els.some(function(e){return e.two}))?fitLabels():null;
  if(colX){
    tooFull=false;
    warn=warn.filter(function(w){return w!=='TOOFULL'});
  }

  /* 记下最「挤」的几对站名，方便查是哪几个站把间距撑大了 */
  var tight=[];Object.keys(bands).forEach(function(k){var b=bands[k];for(var i=0;i<b.length;i++)for(var j=i+1;j<b.length;j++){if(b[i].body&&b[j].body)continue;
    var dc=Math.abs(b[i].col-b[j].col);if(dc)tight.push({need:Math.round((hw(b[i])+hw(b[j])+GAP)/dc),a:b[i].e.sid,b:b[j].e.sid,band:k})}});
  tight.sort(function(x,y){return y.need-x.need});tight=tight.slice(0,4);
  /* 只有上下相连的站（胶囊、虚线两端、支线起点）按列对齐；其余站在各自线上按站名长短自动排开 */
  var XL=X0,XR=X0+TRACK;
  els.forEach(function(e){e.x=X0+(colX?colX[e.col]:e.col*p)});
  if(K>1&&!o.columns)freeLayout();
  function freeLayout(){
    var anchor=new Set();
    els.forEach(function(e){if(e.cap)anchor.add(e)});
    links.forEach(function(k){anchor.add(byId[k.a][0]);anchor.add(byId[k.b][0])});
    vis.forEach(function(l){var b=SS.line[l].branch;if(b&&byId[b])anchor.add(byId[b][0])});
    var isA=function(it){return it.pseudo||anchor.has(it)};
    var main=[];vis.forEach(function(l,li){if(!SS.line[l].branch)main.push(li)});
    /* 先按「站名都在线下方、都不折行」估算；放不下整张图宽时，退回按列排好的结果（含挪上方、折行），只在段内匀开 */
    var saved=els.map(function(e){return [e.labUp,e.flip,e.two]});
    els.forEach(function(e){if(!anchor.has(e)&&!SS.line[vis[e.top]].branch){e.labUp=e.fixUp;e.flip=false;e.two=false}});
    /* 每条线：站按 pos 排；竖虚线穿过本线的地方插一个占位，归到虚线那一列 */
    function seqOf(li){
      /* 胶囊跨过、但不停靠的线也算：胶囊身体在这条线上占位 */
      var on=els.filter(function(e){return e.ls.indexOf(li)>-1||(e.cap&&li>e.top&&li<e.bot)}).sort(function(a,b){return a.pos-b.pos||a.col-b.col});
      links.forEach(function(k){var A=byId[k.a][0],B=byId[k.b][0];if(A.col!==B.col)return;
        var t=Math.min(A.bot,B.bot),bt=Math.max(A.top,B.top);if(!(li>t&&li<bt))return;
        var ps={pseudo:true,col:A.col,src:A},last=-1;on.forEach(function(it,i){if(isA(it)&&it.col<ps.col)last=i});
        var first=on.findIndex(function(it,i){return i>last&&isA(it)}),at=first<0?on.length:first;
        on.splice(Math.max(last+1,Math.min(at,Math.round((last+1+at)/2))),0,ps)});
      return on;
    }
    /* 该站在本线上方（U）或下方（D）占的半宽：-1 不占 */
    function wb(li,it,band){
      if(it.pseudo)return 6;
      var e=it,h=(e.two?e.w2:e.w1)/2;
      if(e.cap){
        if(li>e.top&&li<e.bot)return BODY;
        if(li===e.top)return band==='U'?(e.labBot?12:h):BODY;
        return band==='D'?(e.labBot?h:12):BODY;
      }
      return (e.labUp?'U':'D')===band?h:-1;   /* 站点本身在线上，不挡另一侧的站名 */
    }
    function req(li,a,b,adj){var r=adj?DOT:0;['U','D'].forEach(function(band){var x=wb(li,a,band),y=wb(li,b,band);if(x>=0&&y>=0)r=Math.max(r,x+y+LGAP)});return r}
    /* 一段站最少要多长（两头固定），放不下时先试着把站名挪到线上方 */
    function span(li,items){var lo=[0];for(var i=1;i<items.length;i++){lo[i]=0;for(var j=0;j<i;j++)lo[i]=Math.max(lo[i],lo[j]+req(li,items[j],items[i],j===i-1))}return lo[items.length-1]}
    function minSpan(li,items){
      var fr=items.filter(function(it){return !isA(it)&&!it.labUp}),cur=span(li,items),done=[];
      for(;;){var best=null,bs=cur;fr.forEach(function(e){if(e.labUp)return;e.labUp=true;var t=span(li,items);e.labUp=false;if(t<bs-.5){bs=t;best=e}});
        if(!best)break;best.labUp=true;done.push(best);cur=bs}
      done.forEach(function(e){e.labUp=false});return cur;
    }
    function segsOf(seq){  /* [左端下标或 -1, 右端下标或 n] */
      var fi=[];seq.forEach(function(it,i){if(isA(it))fi.push(i)});var r=[],p=-1;fi.concat([seq.length]).forEach(function(f){r.push([p,f]);p=f});return r}
    /* 1) 锚点按列对齐；每列横坐标由各线各段需要的长度决定，多出来的地方按比例分 */
    var cols=[];anchor.forEach(function(e){if(cols.indexOf(e.col)<0)cols.push(e.col)});cols.sort(function(a,b){return a-b});
    var N=cols.length+2,ci={};cols.forEach(function(c,i){ci[c]=i+1});  /* 0 = 线左头，N-1 = 线右头 */
    /* 先按站名都在线下方算；放不下再按允许挪到线上方算；还放不下就退回按列的结果 */
    function solveCols(flip){
      var E=[];for(var i=1;i<N;i++)E.push([i-1,i,i===1||i===N-1?0:40]);
      main.forEach(function(li){var seq=seqOf(li);
        segsOf(seq).forEach(function(sg){var a=sg[0],b=sg[1],items=seq.slice(Math.max(a,0),Math.min(b,seq.length-1)+1);
          if(items.length<2)return;
          var u=a<0?0:ci[seq[a].col],v=b>=seq.length?N-1:ci[seq[b].col];
          E.push([u,v,flip?minSpan(li,items):span(li,items)])})});
      var lo=[];for(var i=0;i<N;i++)lo[i]=0;
      for(var it=0;it<N;it++)E.forEach(function(e){if(lo[e[0]]+e[2]>lo[e[1]])lo[e[1]]=lo[e[0]]+e[2]});
      lo.E=E;return lo;
    }
    var lo=solveCols(false);if(lo[N-1]>TRACK+.5)lo=solveCols(true);
    var T=lo[N-1]||1;
    if(T<=TRACK+.5){
      /* 每列尽量留在按列排时的位置（整张图匀开），只在各段需要的长度内挪动 */
      var E=lo.E,hi=[],x=[],tg=[0];for(var i=0;i<N;i++)hi[i]=TRACK;
      for(var it=0;it<N;it++)E.forEach(function(e){if(hi[e[1]]-e[2]<hi[e[0]])hi[e[0]]=hi[e[1]]-e[2]});
      cols.forEach(function(c){var a0=null;anchor.forEach(function(e){if(e.col===c&&a0===null)a0=e.x-XL});tg[ci[c]]=a0});
      x[0]=0;for(var i=1;i<N-1;i++){var l=lo[i];E.forEach(function(e){if(e[1]===i&&e[0]<i)l=Math.max(l,x[e[0]]+e[2])});x[i]=Math.max(l,Math.min(hi[i],tg[i]))}
      cols.forEach(function(c){anchor.forEach(function(e){if(e.col===c)e.x=XL+x[ci[c]]})});
    }
    else els.forEach(function(e,i){e.labUp=saved[i][0];e.flip=saved[i][1];e.two=saved[i][2]});
    /* 2) 每条线每一段：两头固定，中间的站在可行范围内按需要的距离成比例排开 */
    main.forEach(function(li){var seq=seqOf(li);seq.forEach(function(it){if(it.pseudo)it.x=it.src.x});
      segsOf(seq).forEach(function(sg){var a=sg[0],b=sg[1],items=seq.slice(Math.max(a,0),Math.min(b,seq.length-1)+1);
        if(!items.some(function(it){return !isA(it)}))return;
        var fx=items.map(function(it){return isA(it)?it.x:null});
        if(a<0)fx[0]=XL;
        if(b>=seq.length)fx[fx.length-1]=(items.length>1||a>=0)?XR:XL;
        solve(items,fx,function(x,y,adj){return req(li,x,y,adj)});
      })});
    /* 3) 支线：从分出它的那一站往右，按站名长短依次排开 */
    vis.forEach(function(l,li){var b=SS.line[l].branch;if(!b||!byId[b])return;var F=byId[b][0];
      var on=els.filter(function(e){return e.ls.indexOf(li)>-1}).sort(function(a,b){return a.pos-b.pos});
      var x=F.x;on.forEach(function(e,i){x+=i?((on[i-1].w1+e.w1)/2+LGAP):Math.max(70,e.w1/2+30);e.x=x})});
    function solve(items,fx,req){
      var n=items.length,freeIt=items.filter(function(it,i){return fx[i]===null});
      function bounds(){
        var lo=[],hi=[];
        for(var i=0;i<n;i++){lo[i]=fx[i]!==null?fx[i]:-1e9;for(var j=0;j<i;j++)lo[i]=Math.max(lo[i],lo[j]+req(items[j],items[i],j===i-1))}
        for(var i=n-1;i>=0;i--){hi[i]=fx[i]!==null?fx[i]:1e9;for(var j=i+1;j<n;j++)hi[i]=Math.min(hi[i],hi[j]-req(items[i],items[j],j===i+1))}
        var slack=Infinity;for(var i=0;i<n;i++)slack=Math.min(slack,hi[i]-lo[i]);
        return {lo:lo,hi:hi,slack:slack};
      }
      var bd=bounds();
      function greedy(cands,apply,undo){
        while(bd.slack<-.5){var best=null,bb=null;
          cands.forEach(function(e){if(!apply(e))return;var t=bounds();undo(e);if(!bb||t.slack>bb.slack){best=e;bb=t}});
          if(!best||bb.slack<=bd.slack+.5)break;apply(best);bd=bb}
      }
      /* 放不下：先把站名挪到线上方，再折行；放下后回头看，能不折的不折，能放回线下方的放回 */
      var canFlip=freeIt.filter(function(e){return !e.fixUp});
      greedy(canFlip,function(e){if(e.labUp)return false;e.labUp=true;e.flip=true;return true},function(e){e.labUp=false;e.flip=false});
      var canFold=items.filter(function(it){return !it.pseudo&&it.lab.two&&it.w2<it.w1});
      greedy(canFold,function(e){if(e.two)return false;e.two=true;return true},function(e){e.two=false});
      canFold.forEach(function(e){if(!e.two)return;e.two=false;var t=bounds();if(t.slack>=-.5)bd=t;else e.two=true});
      canFlip.forEach(function(e){if(!e.flip)return;e.labUp=false;e.flip=false;var t=bounds();if(t.slack>=-.5)bd=t;else{e.labUp=true;e.flip=true}});
      if(bd.slack<-.5)warn.push('线上放不下：'+items.map(function(it){return it.sid||'|'}).join(' '));
      var x=[],fi=[];for(var i=0;i<n;i++){x[i]=fx[i];if(fx[i]!==null)fi.push(i)}
      for(var k=0;k+1<fi.length;k++){var A=fi[k],B=fi[k+1];
        for(var i=A+1;i<B;i++)x[i]=x[A]+(x[B]-x[A])*(i-A)/(B-A)}
      for(var ps=0;ps<30;ps++)for(var i=0;i<n;i++){if(fx[i]!==null)continue;
        var l=bd.lo[i],h=bd.hi[i];for(var j=0;j<n;j++){if(j<i)l=Math.max(l,x[j]+req(items[j],items[i],j===i-1));if(j>i)h=Math.min(h,x[j]-req(items[i],items[j],j===i+1))}
        if(l>h){x[i]=(l+h)/2;continue}
        var t=(x[i-1]+x[i+1])/2;   /* 站点尽量等距，站名放不下的地方由上下界撑开 */
        x[i]=Math.max(l,Math.min(h,t))}
      items.forEach(function(it,i){if(fx[i]===null)it.x=x[i];else if(!isA(it))it.x=fx[i]});
    }
  }
  /* 行距：上下两行站名都折行时拉开；按每站站名实际在哪条线的上方、下方算 */
  var R=R1,nL=vis.length,anyTopCap=false,topTwo=false,lastTwo=false;
  function labLine(e){return e.cap?(e.labBot?['D',e.bot]:['U',e.top]):(e.labUp?['U',e.top]:['D',e.top])}
  for(var g=0;g<nL-1;g++){
    var u=els.some(function(e){var t=labLine(e);return t[0]==='D'&&t[1]===g&&e.two}),l=els.some(function(e){var t=labLine(e);return t[0]==='U'&&t[1]===g+1&&e.two});
    var f=els.some(function(e){var t=labLine(e);return t[0]==='U'&&t[1]===g+1&&!e.cap});
    R=Math.max(R,u&&l?112:(u||l?96:R1),u&&f?112:R1);
  }
  els.forEach(function(e){var t=labLine(e);if(t[0]==='U'&&t[1]===0){anyTopCap=true;if(e.two)topTwo=true}if(t[0]==='D'&&t[1]===nL-1&&e.two)lastTwo=true});
  var y0=anyTopCap?(topTwo?80:62):40,ys=vis.map(function(_,i){return y0+i*R});
  /* 支线那一行贴近它的主线（60px），后面的行跟着上移 */
  for(var bi=1;bi<nL;bi++)if(SS.line[vis[bi]].branch){var dy=R-60;for(var bj=bi;bj<nL;bj++)ys[bj]-=dy}
  els.forEach(function(e){e.y1=ys[e.top];e.y2=ys[e.bot]});
  var xe=Math.max(X0+((colX||(K>1&&!o.columns))?TRACK:(K-1)*p)+32,X0+200),W=xe+40;
  els.forEach(function(e){W=Math.max(W,e.x+(e.two?e.w2:e.w1)/2+8)});
  var H=ys[nL-1]+(lastTwo?64:46);
  return {spaced:!!colX,mapId:mapId,links:links,lines:vis,LI:LI,ys:ys,els:els,byId:byId,K:K,p:p,pNeed:pNeed,W:Math.ceil(W),H:Math.ceil(H),xe:xe,tooFull:tooFull,warn:warn,tight:tight};
}

/* ---------- 绘制 ---------- */
function el(t,a,p){var e=document.createElementNS(NS,t);for(var k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e}
function find(m,sid,line){var es=m.byId[sid]||[],li=m.LI[line];for(var i=0;i<es.length;i++)if(es[i].ls.indexOf(li)>-1)return es[i];return null}
function render(svg,m,o){
  o=o||{};
  var L=SS.L,rt=o.route,fade=o.fade||{},stops=rt?rt.stops:[];
  svg.innerHTML='';
  svg.setAttribute('viewBox','0 0 '+m.W+' '+m.H);
  svg.style.maxWidth=m.W+'px';
  svg.setAttribute('aria-label',o.label||'');
  var gL=el('g',{},svg),gR=el('g',{},svg),gS=el('g',{},svg);
  m.lines.forEach(function(lid,li){
    var ln=SS.line[lid],y=m.ys[li],col=SS.lc(lid);
    /* 虚线支线（线上写了 branch）：从分出它的那一站往右斜着下来，再横着连到本线最后一站；不画左侧线名和线端符号 */
    if(ln.branch){var on=m.els.filter(function(e){return e.ls.indexOf(li)>-1}),xs=on.map(function(e){return e.x}),F=m.byId[ln.branch]&&m.byId[ln.branch][0];
      if(xs.length&&F){var yf=m.ys[F.bot],r=14;
        /* 从分出它的那一站正下方竖直下去，圆弧转右，横着到本线最后一站 */
        el('path',{d:'M'+F.x+' '+yf+'V'+(y-r)+'A'+r+' '+r+' 0 0 0 '+(F.x+r)+' '+y+'H'+Math.max.apply(null,xs),class:'ln lnb',stroke:col},gL)}
      return}
    el('line',{x1:140,y1:y,x2:m.xe,y2:y,class:'ln',stroke:col},gL);
    var g=el('a',{class:'gut',href:o.lineHref?o.lineHref(lid):'#','data-line':lid},gL);
    el('title',{},g).textContent=L('看这条线的每一站','See every stop on this line');
    el('use',{href:'#'+ln.sym,x:0,y:y-13,width:26,height:26,fill:col},g);
    var t=el('text',{x:34,y:y+5,class:'gname'},g);t.textContent=SS.gutName(lid);
    el('use',{href:'#'+ln.sym,x:m.xe+8,y:y-13,width:26,height:26,fill:col},gL);
  });
  if(rt){
    /* 逐跳走路径：同一条线上只在「图上看得见的站」之间画段（看不见的站直接穿过），胶囊里换线画竖段。
       走回头路时也逐段画，不会被合并成零长度。 */
    var hs=[],vs=[],anchor=null;
    rt.path.forEach(function(n){
      if(!n){anchor=null;return}
      var e=find(m,n.sid,n.line);
      if(anchor&&anchor.n.sid===n.sid&&anchor.n.line!==n.line){if(e)vs.push([anchor,{n:n,e:e}]);anchor=e?{n:n,e:e}:anchor;return}
      if(!e)return;
      if(anchor&&anchor.n.line===n.line&&anchor.e!==e)hs.push([anchor,{n:n,e:e}]);
      anchor={n:n,e:e};
    });
    vs.forEach(function(s){el('line',{x1:s[0].e.x,y1:m.ys[m.LI[s[0].n.line]],x2:s[1].e.x,y2:m.ys[m.LI[s[1].n.line]],class:'rx'},gR)});
    hs.forEach(function(s){var y=m.ys[m.LI[s[0].n.line]];el('line',{x1:s[0].e.x,y1:y,x2:s[1].e.x,y2:y,class:'rs',stroke:SS.lc(s[0].n.line)},gR)});
    rt.jumps.forEach(function(i){
      var A=find(m,rt.at[i].sid,rt.at[i].line),B=find(m,rt.at[i+1].sid,rt.at[i+1].line);if(!A||!B)return;
      el('line',{x1:A.x,y1:m.ys[m.LI[rt.at[i].line]],x2:B.x,y2:m.ys[m.LI[rt.at[i+1].line]],class:'rj'},gR);
    });
  }
  (m.links||[]).forEach(function(k){var A=m.byId[k.a][0],B=m.byId[k.b][0];
    var ya=A.y2+(A.cap?12:8),yb=B.y1-(B.cap?12:8);if(A.y1>B.y1){ya=A.y1-(A.cap?12:8);yb=B.y2+(B.cap?12:8)}
    /* 同列：一条竖虚线；不同列（一站分叉连几站）：先竖着下来，圆弧转向横走，再圆弧转下，横平竖直 */
    if(Math.abs(A.x-B.x)<1)el('line',{x1:A.x,y1:ya,x2:B.x,y2:yb,class:'lk'},gR);
    else{var r=10,dn=yb>ya?1:-1,ym=yb-dn*22,sx=B.x>A.x?1:-1;
      el('path',{d:'M'+A.x+' '+ya+'V'+(ym-dn*r)+'Q'+A.x+' '+ym+' '+(A.x+sx*r)+' '+ym+'H'+(B.x-sx*r)+'Q'+B.x+' '+ym+' '+B.x+' '+(ym+dn*r)+'V'+yb,class:'lk',fill:'none'},gR)}});
  m.els.forEach(function(e){
    var sid=e.sid,n=stops.indexOf(sid),cls='stn'+(n>-1?' stop':'')+(rt&&rt.via[sid]&&n<0?' via':'')+(fade[sid]?' fd':'')+(o.hl===sid?' hl':'')+(o.sel&&o.sel[sid]?' sel':'');
    var a=el('a',{href:o.stationHref?o.stationHref(sid):'#',class:cls,'data-id':sid},gS);
    var tip=SS.flat(SS.rawName(sid))+' · '+SS.linesIn(sid,m.mapId).map(SS.lineName).join(' / ');
    el('title',{},a).textContent=tip+'\n'+SS.desc(sid,m.mapId);
    var x=e.x,t,y=e.y1,lcol=SS.lc(m.lines[e.top]);
    if(o.hl===sid)el(e.cap?'rect':'circle',e.cap?{x:x-21,y:e.y1-21,width:42,height:e.y2-e.y1+42,rx:21,class:'halo'}:{cx:x,cy:y,r:22,class:'halo'},a);
    if(e.cap){
      if(e.split||e.pair)el('rect',{x:x-17,y:e.y1-17,width:34,height:e.y2-e.y1+34,rx:17,class:'pr',stroke:lcol},a);
      el('rect',{x:x-12,y:e.y1-12,width:24,height:e.y2-e.y1+24,rx:12,class:'xc'},a);
      e.ls.forEach(function(li){el('circle',{cx:x,cy:m.ys[li],r:4.5,class:'cd',fill:SS.lc(m.lines[li])},a)});
      t=el('text',{x:x,y:e.labBot?e.y2+33:e.y1-22,'text-anchor':'middle',class:'lbx'},a);
      if(e.two&&!e.labBot){t.setAttribute('y',e.y1-40)}
    }else{
      if(e.split||e.pair)el('circle',{cx:x,cy:y,r:e.mark?18:15,class:'pr',stroke:lcol},a);
      if(e.mark)el('circle',{cx:x,cy:y,r:11,class:'xc'},a);else el('circle',{cx:x,cy:y,r:8,class:'st'},a);
      t=el('text',{x:x,y:e.labUp?(e.two?y-40:y-22):y+33,'text-anchor':'middle',class:e.bold?'lbx':'lb'},a);
    }
    if(e.two){el('tspan',{x:x},t).textContent=e.lab.two[0];el('tspan',{x:x,dy:18},t).textContent=e.lab.two[1]}
    else t.textContent=e.lab.one;
    var mates=[sid];if(e.pair)mates.push(e.pair);
    if(e.split||e.pair){
      var lit=function(on){mates.forEach(function(k){svg.querySelectorAll('[data-id="'+k+'"]').forEach(function(x){x.classList.toggle('pl',on)})})};
      a.addEventListener('mouseenter',function(){lit(true)});a.addEventListener('mouseleave',function(){lit(false)});
      a.addEventListener('focus',function(){lit(true)});a.addEventListener('blur',function(){lit(false)});
    }
  });
  if(rt)rt.at.forEach(function(g,i){
    var e=find(m,g.sid,g.line);if(!e)return;
    var gg=el('g',{class:'stop nbg'},gS);
    el('circle',{cx:e.x,cy:m.ys[m.LI[g.line]],r:12,class:'nb',stroke:SS.lc(g.line)},gg);
    el('text',{x:e.x,y:m.ys[m.LI[g.line]]+4.4,'text-anchor':'middle',class:'num'},gg).textContent=i+1;
  });
  svg.classList.toggle('on',!!rt);
}

/* ---------- 排版自检：站名框互相重叠、或压到胶囊（供截图前在控制台跑） ---------- */
function check(svg){
  var boxes=[],caps=[],bad=[];
  svg.querySelectorAll('a.stn').forEach(function(a){
    var t=a.querySelector('text');if(t){var b=t.getBBox();boxes.push({id:a.dataset.id,x1:b.x,y1:b.y,x2:b.x+b.width,y2:b.y+b.height})}
    a.querySelectorAll('rect.xc').forEach(function(r){var b=r.getBBox();caps.push({id:a.dataset.id,x1:b.x,y1:b.y,x2:b.x+b.width,y2:b.y+b.height})});
  });
  function hit(p,q){return p.x1<q.x2&&q.x1<p.x2&&p.y1<q.y2&&q.y1<p.y2}
  for(var i=0;i<boxes.length;i++){for(var j=i+1;j<boxes.length;j++)if(hit(boxes[i],boxes[j]))bad.push(boxes[i].id+'×'+boxes[j].id);
    caps.forEach(function(c){if(c.id!==boxes[i].id&&hit(boxes[i],c))bad.push(boxes[i].id+'×胶囊 '+c.id)})}
  return bad;
}

SS.Metro={route:route,layout:layout,render:render,check:check,find:find};
})();
