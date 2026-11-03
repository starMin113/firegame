const {useState,useEffect,useRef}=React;
const C=FireGameCore;
function Game(){
  const [levelIndex,setLevelIndex]=useState(0),level=C.LEVELS[levelIndex];
  const [state,setState]=useState(()=>C.initial(level));
  const stateRef=useRef(state),gesture=useRef(null),history=useRef([]),boardRef=useRef(null);
  const [tool,setTool]=useState('pipe'),[hint,setHint]=useState(-1),[completed,setCompleted]=useState([]);
  const [historyCount,setHistoryCount]=useState(0),[winDismissed,setWinDismissed]=useState(false);
  const publish=next=>{stateRef.current=next;setState(next);};
  const remember=previous=>{history.current.push(previous);setHistoryCount(history.current.length);};
  const meaningful=(a,b)=>a.pipes.join('|')!==b.pipes.join('|')||a.out.join('|')!==b.out.join('|')||a.picked.join('|')!==b.picked.join('|')||JSON.stringify(a.open)!==JSON.stringify(b.open);
  const act=fn=>{const before=stateRef.current,next=fn(before);if(meaningful(before,next))remember(before);publish(next);};
  const won=state.out.length===level.fires.length;
  useEffect(()=>{const timer=setInterval(()=>{const prev=stateRef.current,next=C.advance(level,prev);if(next!==prev)publish(next);},110);return ()=>clearInterval(timer);},[levelIndex]);
  useEffect(()=>{if(won)setCompleted(list=>list.includes(levelIndex)?list:[...list,levelIndex]);},[won,levelIndex]);
  const cancelGesture=()=>{if(gesture.current){publish(gesture.current.before);gesture.current=null;}};
  useEffect(()=>{const cancel=()=>cancelGesture(),visibility=()=>{if(document.hidden)cancel();};window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',visibility);return ()=>{window.removeEventListener('blur',cancel);document.removeEventListener('visibilitychange',visibility);};},[]);
  function load(index){gesture.current=null;history.current=[];setHistoryCount(0);setHint(-1);setTool('pipe');setWinDismissed(false);setLevelIndex(index);publish(C.initial(C.LEVELS[index]));}
  function undo(){cancelGesture();const prev=history.current.pop();if(prev){publish({...prev,message:'已撤回整次操作，水量、管线和遮挡同步恢复。'});setHistoryCount(history.current.length);setWinDismissed(false);}}
  function toggle(id){cancelGesture();act(s=>C.toggle(level,s,id));}
  function pickup(k){const ext=level.exts.find(e=>e.k===k&&C.visible(e,stateRef.current)&&!stateRef.current.picked.includes(e.id));if(!ext)return false;act(s=>({...s,picked:[...s.picked,ext.id],ext:s.ext+1,message:'拾取一罐灭火器，可用于任意小火。'}));return true;}
  function tap(k){
    const s=stateRef.current,src=C.visibleSources(level,s).find(v=>v.k===k);
    if(src){toggle(src.id);return;}if(pickup(k))return;
    if(tool==='extinguisher'){act(s=>C.useExt(level,s,k));return;}
    if(C.flowing(s)){publish({...s,message:'先关闭水源开关，再调整管线。'});return;}
    if(s.pipes.includes(k)){act(s=>({...s,pipes:s.pipes.filter(p=>p!==k),message:'回收一段水管。'}));return;}
    const result=C.beginStroke(level,s,k);if(meaningful(s,result.state))remember(s);publish(result.state);
  }
  function pointerCell(e){const rect=boardRef.current.getBoundingClientRect(),col=Math.floor((e.clientX-rect.left)/rect.width*12),row=Math.floor((e.clientY-rect.top)/rect.height*8);return row>=0&&row<8&&col>=0&&col<12?C.cell(row,col):null;}
  function down(e){
    if(e.button!==0||gesture.current)return;const k=pointerCell(e);if(!k)return;
    e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);
    const before=stateRef.current,source=C.visibleSources(level,before).some(s=>s.k===k),ext=level.exts.some(x=>x.k===k&&C.visible(x,before)&&!before.picked.includes(x.id));
    let result={state:before,stroke:null};
    if(tool==='pipe'&&!ext&&(!source||!C.flowing(before)))result=C.beginStroke(level,before,k);
    gesture.current={id:e.pointerId,start:k,before,stroke:result.stroke,moved:false,x:e.clientX,y:e.clientY};publish(result.state);
  }
  function move(e){const g=gesture.current;if(!g||g.id!==e.pointerId)return;const k=pointerCell(e);if(Math.hypot(e.clientX-g.x,e.clientY-g.y)>7)g.moved=true;if(!k||!g.stroke||k===g.stroke.last)return;const result=C.dragTo(level,stateRef.current,g.stroke,k);g.stroke=result.stroke;publish(result.state);}
  function up(e){const g=gesture.current;if(!g||g.id!==e.pointerId)return;move(e);gesture.current=null;if(!g.moved){publish(g.before);tap(g.start);}else if(meaningful(g.before,stateRef.current)){remember(g.before);}if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}
  const connected=new Set();C.visibleSources(level,state).forEach(src=>C.network(level,state,src).forEach((d,k)=>connected.add(k)));
  const pipes=new Set(state.pipes),wet=new Set(state.wet),sources=C.visibleSources(level,state),anyOpen=C.flowing(state);
  const junctions=new Set([...state.pipes,...sources.map(s=>s.k)]);
  return <div className="prototype">
    <header className="proto-header"><div><div className="eyebrow">消防调度救援</div><h1>{level.name}</h1></div><span className="scene-badge">{level.scene} · {levelIndex+1} / 5</span></header>
    <nav className="level-tabs" aria-label="选择关卡">{C.LEVELS.map((l,i)=><button key={l.name} className={i===levelIndex?'selected':''} aria-current={i===levelIndex?'step':undefined} onClick={()=>load(i)}>{completed.includes(i)?'✓':i+1} {l.name}</button>)}</nav>
    <div className="resource-strip"><span>水管 <strong>{level.pipes-state.pipes.length}/{level.pipes}</strong></span><span>消防车 <strong>{state.water.truck===undefined?'—':state.water.truck} 水</strong></span><span>灭火器 <strong>{state.ext}</strong></span><span>火点 <strong>{level.fires.length-state.out.length}/{level.fires.length}</strong></span></div>
    <div className="play-toolbar"><button className={tool==='pipe'?'selected':''} onClick={()=>{cancelGesture();setTool('pipe');}}>水管 · 划动铺拆</button><button className={tool==='extinguisher'?'selected':''} onClick={()=>{cancelGesture();setTool('extinguisher');}}>🧯 灭火器</button><button disabled={!historyCount} onClick={undo}>↶ 撤回一步</button><button onClick={()=>setHint(i=>Math.min(i+1,2))}>提示</button><button onClick={()=>load(levelIndex)}>重来</button></div>
    <p className="gesture-help">已有管 → 已有管：回收　 ·　 已有管 → 空格：铺设<br/>点击单格也可铺拆，开关控制通水。</p>
    <div className={`board-shell scene-${levelIndex} ${won?'scene-cleared':''}`}>
      <div className="prototype-board" ref={boardRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancelGesture} onLostPointerCapture={()=>{if(gesture.current)cancelGesture();}} aria-label={`${level.scene}火场网格`}>
        {level.map.flatMap((line,r)=>[...line].map((tile,c)=>{
          const k=C.cell(r,c),hasPipe=pipes.has(k),hasWater=wet.has(k),f=level.fires.find(f=>f.k===k),src=sources.find(s=>s.k===k),ext=level.exts.find(x=>x.k===k);
          const hidden=[...level.sources,...level.fires,...level.exts].filter(e=>e.k===k&&!C.visible(e,state));
          const out=f&&state.out.includes(f.id),recent=out&&state.tick-(state.outAt[f.id]||0)<7;
          const desc=hidden.length?'烟雾遮挡':src?(src.id==='truck'?'消防车':'消防栓'):f?(out?'已扑灭':`火点，需要 ${f.water} 水`):ext&&!state.picked.includes(ext.id)?'拾取灭火器':hasPipe?'已有水管':'空格';
          return <div key={k} data-cell={k} role={tile==='.'?'button':undefined} tabIndex={tile==='.'?0:undefined} aria-label={`${r+1}行${c+1}列，${desc}`} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tap(k);}}} className={`proto-cell ${tile==='#'?'solid':'walkable'} ${hasPipe?'has-pipe':''} ${hasWater?'wet':''} ${out?'extinguished':''} ${recent?'splash':''}`}>
            {(hasPipe||src)&&<div className="proto-pipe">{C.around(k).map((n,i)=>junctions.has(n)&&<i key={i} className={`pipe-arm dir-${i}`}/>)}{hasPipe&&<i className="pipe-node"/>}</div>}
            {f&&!hidden.length&&<div className="proto-entity">{levelIndex<2&&<span className="car-marker">🚗</span>}{out?<span className="out-mark">✓</span>:<><div className={`fire ${f.water===60?'big-fire':''}`}><div className="fire-flame"/><div className="fire-flame-inner"/></div><span className="water-cost">{f.water}水</span></>}</div>}
            {ext&&!hidden.length&&!state.picked.includes(ext.id)&&<div className="proto-entity"><div className="extinguisher"/><span className="pickup-label">拾取</span></div>}
            {src&&<div className="proto-source"><span className="source-symbol">{src.id==='truck'?'🚒':'🚰'}</span><span className={`source-state ${src.id in state.open?'is-on':''}`}>{src.id in state.open?'开':'关'}</span><span className="source-amount">{state.water[src.id]===Infinity?'∞':state.water[src.id]}</span></div>}
            {hidden.length>0&&<div className="proto-fog">{hidden.some(e=>level.sources.includes(e))?'▧ 消防':'烟雾'}</div>}
            {hasPipe&&!connected.has(k)&&<span className="disconnected" title="未连接水源">·</span>}
          </div>;
        }))}
      </div>
      <div className="source-controls">{sources.map(s=>{const distances=C.network(level,state,s),demand=level.fires.filter(f=>!state.out.includes(f.id)&&C.visible(f,state)&&distances.has(f.k)).reduce((sum,f)=>sum+f.water,0);return <button key={s.id} className={`source-valve ${s.id in state.open?'on':''}`} aria-pressed={s.id in state.open} onClick={()=>toggle(s.id)}><span>{s.id==='truck'?'🚒 消防车':'🚰 消防栓'} · {s.id in state.open?'关闭水源':'开闸通水'}</span><small>{s.id in state.open?'水源已开启':`已接火点需要 ${demand} 水`} · 可用 {state.water[s.id]===Infinity?'∞':state.water[s.id]}</small></button>;})}</div>
    </div>
    <div className="feedback" role="status" aria-live="polite">{state.message}</div>
    {hint>=0&&<div className="hint-box">💡 {level.hints[hint]}</div>}
    <div className="legend"><span>灰紫：干管</span><span>蓝色流动：已通水</span><span>灰雾：待发现</span><span>{anyOpen?'先停水再改管':'水管可无损回收'}</span></div>
    {won&&!winDismissed&&<div className="completion" role="dialog" aria-modal="true" aria-label="火情已解除"><div><span className="completion-icon">✓</span><h2>火情已解除</h2><p>{level.scene}恢复了平静。</p><div className="completion-actions">{levelIndex<4?<button onClick={()=>load(levelIndex+1)}>下一处事故 →</button>:<button onClick={()=>load(0)}>重新体验五关</button>}<button onClick={()=>setWinDismissed(true)}>看看现场</button><button onClick={()=>{setWinDismissed(true);undo();}}>撤回最后一步</button></div></div></div>}
  </div>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<Game/>);
