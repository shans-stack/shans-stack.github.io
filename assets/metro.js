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
      尽量拉开（最多 140px 一列）。站名放不下一行时按数据里的 \n 或英文空格折成两行。
   6. 最小列距也放不进标准宽度时，图照样画（整体缩小），并给出「这张图太满，建议拆图」。 */
(function(){
var SS=window.SS, NS='http://www.w3.org/2000/svg';
var X0=170, TRACK=954, PMAX=140, GAP=14, BODY=16, R1=90;
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
    var mark=topic&&!!SS.homeOf(sid);
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
  /* 列：同一 pos 一列，再把互不重叠的相邻列并起来 */
  var keys=[];els.forEach(function(e){if(keys.indexOf(e.pos)<0)keys.push(e.pos)});keys.sort(function(a,b){return a-b});
  var cols=keys.map(function(){return {els:[],occ:{}}});
  els.forEach(function(e){var c=cols[keys.indexOf(e.pos)];c.els.push(e);for(var l=e.top;l<=e.bot;l++){
    if(c.occ[l]&&c.occ[l]!==e.sid)warn.push('同一条线同一位置有两个站（或胶囊跨过了别的站）：'+c.occ[l]+' / '+e.sid);c.occ[l]=e.sid}});
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
    put(e.cap?(e.labBot?'U'+e.bot:'L'+e.top):'U'+e.top,{e:e,col:e.col,body:false});
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
  var pFit=K>1?TRACK/(K-1):PMAX,p=K>1?Math.max(pNeed,Math.min(pFit,PMAX)):PMAX,tooFull=K>1&&pNeed>pFit+0.5;
  settle(p);
  if(tooFull)warn.push('TOOFULL');
  /* 记下最「挤」的几对站名，方便查是哪几个站把间距撑大了 */
  var tight=[];Object.keys(bands).forEach(function(k){var b=bands[k];for(var i=0;i<b.length;i++)for(var j=i+1;j<b.length;j++){if(b[i].body&&b[j].body)continue;
    var dc=Math.abs(b[i].col-b[j].col);if(dc)tight.push({need:Math.round((hw(b[i])+hw(b[j])+GAP)/dc),a:b[i].e.sid,b:b[j].e.sid,band:k})}});
  tight.sort(function(x,y){return y.need-x.need});tight=tight.slice(0,4);
  /* 行距：上下两行站名都折行时拉开 */
  var R=R1,nL=vis.length,anyTopCap=false,topTwo=false,lastTwo=false;
  for(var g=0;g<nL-1;g++){
    var u=(bands['U'+g]||[]).some(function(it){return !it.body&&it.two}),l=(bands['L'+(g+1)]||[]).some(function(it){return !it.body&&it.two});
    R=Math.max(R,u&&l?112:(u||l?96:R1));
  }
  (bands['L0']||[]).forEach(function(it){if(!it.body){anyTopCap=true;if(it.two)topTwo=true}});
  (bands['U'+(nL-1)]||[]).forEach(function(it){if(!it.body&&it.two)lastTwo=true});
  var y0=anyTopCap?(topTwo?80:62):40,ys=vis.map(function(_,i){return y0+i*R});
  els.forEach(function(e){e.x=X0+e.col*p;e.y1=ys[e.top];e.y2=ys[e.bot]});
  var xe=Math.max(X0+(K-1)*p+32,X0+200),W=xe+40;
  els.forEach(function(e){W=Math.max(W,e.x+(e.two?e.w2:e.w1)/2+8)});
  var H=ys[nL-1]+(lastTwo?64:46);
  return {mapId:mapId,lines:vis,LI:LI,ys:ys,els:els,byId:byId,K:K,p:p,pNeed:pNeed,W:Math.ceil(W),H:Math.ceil(H),xe:xe,tooFull:tooFull,warn:warn,tight:tight};
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
      t=el('text',{x:x,y:y+33,'text-anchor':'middle',class:e.bold?'lbx':'lb'},a);
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
