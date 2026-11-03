/* Pure rules shared by the browser and regression tests. Coordinates: row,column. */
(function (root) {
  const cell = (r, c) => `${r},${c}`;
  const coords = k => k.split(',').map(Number);
  const around = k => { const [r,c] = coords(k); return [cell(r-1,c),cell(r,c+1),cell(r+1,c),cell(r,c-1)]; };
  const fire = (id,r,c,water,hiddenBy) => ({id,k:cell(r,c),water,hiddenBy});
  const source = (id,r,c,water,hiddenBy) => ({id,k:cell(r,c),water,hiddenBy});
  const LEVELS = [
    {name:'绕过车道',scene:'公路汽车',focus:'有限水管 · 路线选择',pipes:12,
      map:['############','............','............','.....#......','.....#......','.....#......','.....#......','............'],
      sources:[source('truck',6,1,30)],fires:[fire('car',2,8,30)],exts:[],
      hints:['隔离带的上方和下方都能绕行，比较两条路线。','往上绕到第 3 行，再向右接近汽车，更省水管。','从消防车向上 4 格，向右 7 格，再开启水源。']},
    {name:'近水与远水',scene:'公路汽车',focus:'有限水量 · 水源取舍',pipes:10,
      map:['############','............','............','............','............','............','............','############'],
      sources:[source('hydrant',5,1,Infinity),source('truck',5,9,30)],fires:[fire('near',5,7,10),fire('far',2,7,30)],exts:[],
      hints:['消防车离得近，但水量不够处理两处火。','可以用消防车处理近处小火，再回收水管改接消防栓；也可以全部用消防栓。','消防栓向右铺 6 格、再向上铺 3 格，一次开闸可处理两处火。']},
    {name:'留一罐给小火',scene:'居民楼',focus:'灭火器 · 灭火顺序',pipes:15,
      map:['############','############','##..........','##..........','##..........','####.#####.#','............','############'],
      sources:[source('truck',6,1,40)],fires:[fire('gate',6,5,10),fire('upSmall',3,4,10,'gate'),fire('upMedium',3,8,30,'gate')],exts:[{id:'ext',k:cell(6,3)}],
      hints:['水量不足以处理所有火，但楼下有一罐灭火器。','灭火器可以用于楼下小火，也可以保留给楼上的小火。','拾取灭火器处理楼下小火；水管沿左侧楼梯向上，连接两处楼上火点。']},
    {name:'烟后的出水口',scene:'居民楼',focus:'关键火点 · 发现水源',pipes:12,
      map:['############','############','##..........','##..........','##..........','####.#####.#','............','############'],
      sources:[source('truck',6,1,30),source('hydrant',4,4,Infinity,'gate')],fires:[fire('gate',6,5,30),fire('upper',3,9,60),fire('lower',6,10,30)],exts:[],
      hints:['消防车只能处理一处火。烟雾里还能看到消防设施标记。','先处理楼下靠左的中火，显露楼内出水口。','消防车向右 4 格开闸；停水回收。用楼内水源向上、向右再经右侧楼梯向下连接剩余火点。']},
    {name:'让商场恢复安静',scene:'商场',focus:'分支管网 · 连续清场',pipes:22,
      map:['############','##..........','##..........','##..........','##..........','####.#####.#','............','############'],
      sources:[source('hydrant',6,1,Infinity)],fires:[fire('a',6,4,10),fire('b',3,4,30),fire('c',3,8,30),fire('d',6,10,60),fire('e',2,10,10)],exts:[],
      hints:['这一关可以先连好所有分支，再一次开闸。','利用左右两个楼梯口，把二楼横向管线作为公共干线。','从水源到左侧楼梯，上楼后向右铺到最右侧火点所在列，再向上、向下分支。']}
  ];
  function initial(level) { return {pipes:[],out:[],picked:[],ext:0,water:Object.fromEntries(level.sources.map(s=>[s.id,s.water])),open:{},tick:0,wet:[],outAt:{},message:'从水源或已有水管划向空格开始铺管。'}; }
  const visible = (entity,state) => !entity.hiddenBy || state.out.includes(entity.hiddenBy);
  const visibleSources = (level,state) => level.sources.filter(s=>visible(s,state));
  function passable(level,state,k) {
    const [r,c]=coords(k);
    return level.map[r]?.[c]==='.' && ![...level.fires,...level.sources,...level.exts].some(e=>e.k===k && !visible(e,state));
  }
  function network(level,state,src) {
    const distances=new Map([[src.k,0]]), queue=[src.k], pipes=new Set(state.pipes);
    for(let i=0;i<queue.length;i++) for(const k of around(queue[i])) {
      if(pipes.has(k) && !distances.has(k) && passable(level,state,k)) {distances.set(k,distances.get(queue[i])+1);queue.push(k);}
    }
    return distances;
  }
  const flowing = state => Object.keys(state.open).length>0;
  function beginStroke(level,state,k) {
    if(flowing(state)) return {state:{...state,message:'先关闭水源开关，再调整水管。'},stroke:null};
    const isSource=visibleSources(level,state).some(s=>s.k===k);
    let next=state;
    if(!state.pipes.includes(k) && !isSource) {
      const anchors=new Set([...state.pipes,...visibleSources(level,state).map(s=>s.k)]);
      if(!passable(level,state,k) || !around(k).some(n=>anchors.has(n))) return {state:{...state,message:'从水源或已有水管旁边开始划。'},stroke:null};
      if(state.pipes.length>=level.pipes) return {state:{...state,message:'水管用完了，沿已有水管划动可回收。'},stroke:null};
      next={...state,pipes:[...state.pipes,k],message:'铺设水管'};
    }
    return {state:next,stroke:{last:k,anchor:true,seen:[k]}};
  }
  function stepStroke(level,state,stroke,k) {
    if(!stroke || k===stroke.last || !around(stroke.last).includes(k)) return {state,stroke};
    if(!passable(level,state,k)) return {state,stroke};
    const isSource=visibleSources(level,state).some(s=>s.k===k);
    const existed=state.pipes.includes(k);
    // Keep the previous cell's sampled occupancy: deleting it must not break the next removal.
    if(stroke.seen.includes(k)) return {state,stroke:{...stroke,last:k,anchor:true}};
    let next=state;
    if(stroke.anchor && !isSource) {
      if(existed) next={...state,pipes:state.pipes.filter(p=>p!==k),message:'回收水管'};
      else if(state.pipes.length<level.pipes) next={...state,pipes:[...state.pipes,k],message:'铺设水管'};
      else return {state:{...state,message:'水管已用完，沿已有管线划动回收。'},stroke};
    }
    return {state:next,stroke:{last:k,anchor:true,seen:[...stroke.seen,k]}};
  }
  // Fill skipped pointer cells along a grid line. Never jump through walls or fog.
  function dragTo(level,state,stroke,target) {
    if(!stroke) return {state,stroke};
    const [tr,tc]=coords(target); let next=state, current=stroke;
    for(let i=0;i<40 && current.last!==target;i++) {
      const [r,c]=coords(current.last), dr=tr-r,dc=tc-c;
      const k=Math.abs(dc)>=Math.abs(dr)?cell(r,c+Math.sign(dc)):cell(r+Math.sign(dr),c);
      const moved=stepStroke(level,next,current,k);
      if(moved.stroke.last===current.last) break;
      next=moved.state;current=moved.stroke;
    }
    return {state:next,stroke:current};
  }
  function toggle(level,state,id) {
    const src=visibleSources(level,state).find(s=>s.id===id); if(!src)return state;
    const open={...state.open};
    if(id in open){delete open[id];return {...state,open,wet:[],message:'已停水，可以调整管线。'};}
    if(state.water[id]<=0)return {...state,message:'消防车水已用完，可以撤回供水或寻找其他水源。'};
    open[id]=state.tick;return {...state,open,message:'已开闸，水沿管网前进。'};
  }
  function advance(level,state) {
    if(!flowing(state))return state;
    const next={...state,tick:state.tick+1,water:{...state.water},out:[...state.out],outAt:{...state.outAt}},wet=new Set();
    // Open order is an explicit player decision; a fire is charged to one source only.
    for(const id of Object.keys(state.open)) {
      const src=visibleSources(level,next).find(s=>s.id===id);if(!src || next.water[id]<=0)continue;
      const distances=network(level,next,src),elapsed=next.tick-state.open[id];
      for(const [k,d] of distances)if(d<=elapsed)wet.add(k);
      const targets=level.fires.filter(f=>!next.out.includes(f.id)&&visible(f,next)&&distances.has(f.k))
        .sort((a,b)=>distances.get(a.k)-distances.get(b.k)||a.id.localeCompare(b.id));
      for(const f of targets) {
        if(elapsed<distances.get(f.k)+3)continue;
        if(next.water[id]<f.water){next.message='消防车余水不足；可以停水改接消防栓，或撤回后用灭火器节水。';continue;}
        next.water[id]-=f.water;next.out.push(f.id);next.outAt[f.id]=next.tick;
        next.message=f.hiddenBy?'隐藏区域的火已扑灭。':'火已扑灭，继续观察现场。';
        if([...level.sources,...level.fires,...level.exts].some(e=>e.hiddenBy===f.id))next.message='烟雾散开了，发现新的消防资源或火点！';
      }
    }
    next.wet=[...wet];return next;
  }
  function useExt(level,state,k) {
    const f=level.fires.find(f=>f.k===k&&!state.out.includes(f.id)&&visible(f,state));
    if(!f)return state;
    if(f.water>10)return {...state,message:'灭火器适合小火，这处火需要水管供水。'};
    if(!state.ext)return {...state,message:'没有灭火器，先拾取场景中的绿色灭火器。'};
    return {...state,ext:state.ext-1,out:[...state.out,f.id],outAt:{...state.outAt,[f.id]:state.tick},message:'小火已扑灭，节省了水量。'};
  }
  const api={LEVELS,cell,coords,around,initial,visible,visibleSources,passable,network,flowing,beginStroke,stepStroke,dragTo,toggle,advance,useExt};
  if(typeof module!=='undefined')module.exports=api;else root.FireGameCore=api;
})(globalThis);
