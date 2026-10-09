(() => {
  "use strict";
  const P = 17, A = 0, B = 7, G = {x:1,y:5};
  const $ = id => document.getElementById(id);
  let sequence = [], current = 1, timer = null;

  function mod(n,m=P){ return ((n % m) + m) % m; }
  function inverse(n,m=P){
    n = mod(n,m);
    for(let i=1;i<m;i++) if(mod(n*i,m)===1) return i;
    throw new Error(`No modular inverse for ${n} modulo ${m}`);
  }
  function isOnCurve(point){
    return point === null || mod(point.y*point.y) === mod(point.x**3 + A*point.x + B);
  }
  function add(Pt,Rt){
    if(Pt===null) return Rt;
    if(Rt===null) return Pt;
    if(Pt.x===Rt.x && mod(Pt.y+Rt.y)===0) return null;
    let lambda;
    if(Pt.x===Rt.x && Pt.y===Rt.y){
      if(mod(2*Pt.y)===0) return null;
      lambda=mod((3*Pt.x*Pt.x+A)*inverse(2*Pt.y));
    } else {
      lambda=mod((Rt.y-Pt.y)*inverse(Rt.x-Pt.x));
    }
    const x=mod(lambda*lambda-Pt.x-Rt.x);
    const y=mod(lambda*(Pt.x-x)-Pt.y);
    const out={x,y};
    if(!isOnCurve(out)) throw new Error("Internal check failed: result is not on the curve.");
    return out;
  }
  function pointText(p){ return p===null ? "O (point at infinity)" : `(${p.x}, ${p.y})`; }
  function makeSequence(k){
    const seq=[{k:1,point:G,operation:"G",explanation:"Start with the base point G = (1, 5)."}];
    let q=G;
    for(let n=2;n<=k;n++){
      const previous=q;
      q=add(q,G);
      seq.push({k:n,point:q,operation:`${n-1}G + G`,explanation:describeAdd(previous,G,q,n)});
    }
    return seq;
  }
  function describeAdd(left,right,out,n){
    if(out===null) return `${n}G = O. Adding inverse points gives the point at infinity, the group's identity.`;
    if(left===right){
      const inv=inverse(2*left.y);
      const lam=mod((3*left.x*left.x+A)*inv);
      return `Double ${pointText(left)}: λ = 3x² · (2y)⁻¹ mod 17 = ${lam}. Result: ${pointText(out)}.`;
    }
    const inv=inverse(right.x-left.x);
    const lam=mod((right.y-left.y)*inv);
    return `Add ${pointText(left)} and ${pointText(right)}: λ = (y₂−y₁) · (x₂−x₁)⁻¹ mod 17 = ${lam}. Result: ${pointText(out)}.`;
  }
  function allCurvePoints(){
    const pts=[];
    for(let x=0;x<P;x++) for(let y=0;y<P;y++) if(mod(y*y)===mod(x*x*x+B)) pts.push({x,y});
    return pts;
  }
  function orderOfG(){
    let q=null;
    for(let i=1;i<100;i++){q=add(q,G); if(q===null) return i;}
    return null;
  }
  function svgPlot(){
    const all=allCurvePoints(), size=390, pad=34, span=size-pad*2, step=span/16;
    const px=x=>pad+x*step, py=y=>size-pad-y*step;
    let s=`<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Discrete points on the elliptic curve over integers modulo 17">`;
    for(let i=0;i<=16;i++){
      s+=`<line x1="${px(i)}" y1="${pad}" x2="${px(i)}" y2="${size-pad}" stroke="#243146" stroke-width=".7"/>`;
      s+=`<line x1="${pad}" y1="${py(i)}" x2="${size-pad}" y2="${py(i)}" stroke="#243146" stroke-width=".7"/>`;
      if(i%2===0) s+=`<text x="${px(i)}" y="${size-12}" fill="#8d9cb2" font-size="9" text-anchor="middle">${i}</text><text x="18" y="${py(i)+3}" fill="#8d9cb2" font-size="9" text-anchor="middle">${i}</text>`;
    }
    s+=`<text x="${size/2}" y="${size-1}" fill="#9ba9bf" font-size="10" text-anchor="middle">x (mod 17)</text>`;
    all.forEach(pt=>{
      const isBase=pt.x===G.x&&pt.y===G.y;
      const isCurrent=sequence[current-1]&&sequence[current-1].point&&sequence[current-1].point.x===pt.x&&sequence[current-1].point.y===pt.y;
      const fill=isCurrent?"#ffbd82":isBase?"#88aaff":"#80f0c0";
      const r=isCurrent||isBase?5:3;
      s+=`<circle cx="${px(pt.x)}" cy="${py(pt.y)}" r="${r}" fill="${fill}" opacity="${isCurrent||isBase?1:.72}"><title>(${pt.x}, ${pt.y})</title></circle>`;
    });
    s+="</svg>"; $("curvePlot").innerHTML=s;
  }
  function renderFrequencies(target,axis){
    const freq={}; sequence.forEach(s=>{if(s.point!==null) freq[s.point[axis]]=(freq[s.point[axis]]||0)+1;});
    const entries=Object.entries(freq).sort((a,b)=>Number(a[0])-Number(b[0]));
    const max=Math.max(1,...entries.map(e=>e[1]));
    $(target).innerHTML=entries.map(([v,n])=>`<div class="bar-row"><span>${axis}=${v}</span><div class="bar-track"><div class="bar-fill" style="width:${n/max*100}%"></div></div><span>${n}</span></div>`).join("");
  }
  function renderRows(k){
    $("sequenceRows").innerHTML=sequence.map(s=>`<tr><td>${s.k}G</td><td>${s.operation}</td><td>${pointText(s.point)}</td><td>${s.k===k?"Selected public point":s.point===null?"Identity element":""}</td></tr>`).join("");
  }
  function render(){
    const k=Number($("scalar").value);
    $("stepMetric").textContent=`${current} / ${sequence.length}`;
    $("publicPoint").textContent=pointText(sequence[sequence.length-1].point);
    $("stepExplanation").textContent=`Step ${current}: ${sequence[current-1].k}G\n${sequence[current-1].explanation}`;
    $("prev").disabled=current<=1; $("next").disabled=current>=sequence.length;
    $("play").textContent=timer?"Ⅱ Pause":"▶ Play slowly";
    svgPlot(); renderRows(k); renderFrequencies("xFrequencies","x"); renderFrequencies("yFrequencies","y");
  }
  function calculate(){
    stop();
    const k=Number($("scalar").value);
    if(!Number.isInteger(k)||k<1||k>20){$("stepExplanation").textContent="Enter an integer k from 1 to 20.";return;}
    sequence=makeSequence(k); current=1;
    $("orderMetric").textContent=orderOfG();
    $("distinctMetric").textContent=sequence.filter(s=>s.point!==null).length;
    render();
  }
  function stop(){if(timer){clearInterval(timer);timer=null;}}
  $("calculate").addEventListener("click",calculate);
  $("reset").addEventListener("click",()=>{$("scalar").value=6;calculate();});
  $("prev").addEventListener("click",()=>{stop();current=Math.max(1,current-1);render();});
  $("next").addEventListener("click",()=>{stop();current=Math.min(sequence.length,current+1);render();});
  $("play").addEventListener("click",()=>{
    if(timer){stop();render();return;}
    if(current>=sequence.length) current=1;
    const delay=1200-Number($("speed").value)*180;
    timer=setInterval(()=>{if(current>=sequence.length){stop();render();return;}current++;render();},delay);
    render();
  });
  $("speed").addEventListener("input",()=>{if(timer){stop();$("play").click();}});
  calculate();
})();