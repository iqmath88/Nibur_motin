 'use strict';
window.NM=window.NM||{};
(function(NM){
 const $=id=>document.getElementById(id);
 const clamp=(v,a,b,d)=>{const n=Number(v);return Number.isFinite(n)?Math.min(b,Math.max(a,n)):d};
 // Recursive-descent arithmetic parser; never execute arbitrary source / eval.
 function compile(source){
  const s=String(source||'').trim().toLowerCase().replace(/π/g,'pi').replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-');
  if(s.length>120)throw Error('صيغة الدالة طويلة جداً');
  const toks=[];const rx=/\s*([a-z]+|(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[()+\-*/^])\s*/gy;
  let i=0;while(i<s.length){rx.lastIndex=i;const m=rx.exec(s);if(!m)throw Error('رمز غير معروف قرب '+s.slice(i,i+8));toks.push(m[1]);i=rx.lastIndex;if(toks.length>100)throw Error('صيغة معقدة جداً')}
  let pos=0;const peek=()=>toks[pos],take=()=>toks[pos++];
  const funcs={sin:Math.sin,cos:Math.cos,tan:Math.tan,asin:Math.asin,acos:Math.acos,atan:Math.atan,sqrt:Math.sqrt,abs:Math.abs,ln:Math.log,log:Math.log10,exp:Math.exp};
  function primary(){const t=take();if(t===undefined)throw Error('تعبير غير مكتمل');if(t==='('){const v=expr();if(take()!==')')throw Error('القوس غير مغلق');return v}
   if(t==='x')return x=>x;if(t==='pi')return ()=>Math.PI;if(t==='e')return ()=>Math.E;
   if(/^\d|^\./.test(t)){const n=Number(t);if(!Number.isFinite(n))throw Error('عدد غير صالح');return ()=>n}
   if(Object.hasOwn(funcs,t)){if(take()!=='(')throw Error('استعمل '+t+'(x)');const arg=expr();if(take()!==')')throw Error('القوس غير مغلق');return x=>funcs[t](arg(x))}
   throw Error('عامل غير معروف: '+t);
  }
  function power(){const a=primary();if(peek()==='^'){take();const b=unary();return x=>Math.pow(a(x),b(x))}return a}
  function unary(){if(peek()==='+'||peek()==='-'){const t=take(),a=unary();return t==='-'?x=>-a(x):a}return power()}
  function term(){let a=unary();while(peek()==='*'||peek()==='/'){const t=take(),b=unary(),before=a;a=t==='*'?x=>before(x)*b(x):x=>before(x)/b(x)}return a}
  function expr(){let a=term();while(peek()==='+'||peek()==='-'){const t=take(),b=term(),before=a;a=t==='+'?x=>before(x)+b(x):x=>before(x)-b(x)}return a}
  const fn=expr();if(pos!==toks.length)throw Error('تحقق من الأقواس أو علامات العمليات');return x=>{const y=fn(x);return Number.isFinite(y)?y:NaN};
 }
 const DEFAULT={enabled:false,formula:'x^2',xMin:-5,xMax:5,yMin:-5,yMax:5,showGrid:true,showPoint:true,showTangent:false,pointStart:-3,pointEnd:3,graphY:58,graphScale:100};
 const PEN_COLORS=['#e5484d','#226bb2','#1c9463','#173a5c','#ffffff','#f4d96c'];
 function clean(x){const v=x||{};let xMin=clamp(v.xMin,-100,99,-5),xMax=clamp(v.xMax,xMin+.5,100,5);let yMin=clamp(v.yMin,-100,99,-5),yMax=clamp(v.yMax,yMin+.5,100,5);
  const steps=Array.isArray(v.steps)?v.steps.slice(0,6):[];
  const strokes=Array.isArray(v.strokes)?v.strokes.slice(0,80).map(st=>({color:PEN_COLORS.includes(st?.color)?st.color:PEN_COLORS[0],size:clamp(st?.size,2,24,7),pts:Array.isArray(st?.pts)?st.pts.slice(0,700).map(p=>[clamp(p?.[0],0,1,.5),clamp(p?.[1],0,1,.5)]):[]})).filter(st=>st.pts.length):[];
  return {enabled:v.enabled===true,formula:String(v.formula??'x^2').slice(0,120),xMin,xMax,yMin,yMax,showGrid:v.showGrid!==false,showPoint:v.showPoint!==false,showTangent:v.showTangent===true,pointStart:clamp(v.pointStart,-100,100,-3),pointEnd:clamp(v.pointEnd,-100,100,3),graphY:clamp(v.graphY,32,76,58),graphScale:clamp(v.graphScale,60,115,100),steps:steps.map(s=>String(s??'').slice(0,250)),stepStart:clamp(v.stepStart,0,95,20),stepGap:clamp(v.stepGap,2,50,15),strokes};
 }
 let bridge=null, pen=false,gesture=null,penColor=PEN_COLORS[0],penSize=7;
 const projectScene=()=>bridge?.scene();
 let lastError='';
 function drawGraph(c,g,p,fg){if(!g.enabled)return;
  const W=780*g.graphScale/100,H=680*g.graphScale/100,cx=540,cy=1920*g.graphY/100;
  const l=cx-W/2,t=cy-H/2,sx=x=>l+(x-g.xMin)/(g.xMax-g.xMin)*W,sy=y=>t+H-(y-g.yMin)/(g.yMax-g.yMin)*H;
  c.save();c.beginPath();c.rect(l,t,W,H);c.clip();c.fillStyle='rgba(138,168,188,.07)';c.fillRect(l,t,W,H);
  let f;try{f=compile(g.formula);lastError=''}catch(e){lastError=e.message;c.restore();return}
  const gridStep=span=>{const target=span/8,pow=Math.pow(10,Math.floor(Math.log10(target)));return [1,2,5,10].find(n=>n*pow>=target)*pow};
  if(g.showGrid){const gx=gridStep(g.xMax-g.xMin),gy=gridStep(g.yMax-g.yMin);c.strokeStyle='rgba(105,129,152,.28)';c.lineWidth=1.8;
   for(let x=Math.ceil(g.xMin/gx)*gx,n=0;x<=g.xMax+gx*.001&&n++<40;x+=gx){const px=sx(x);c.beginPath();c.moveTo(px,t);c.lineTo(px,t+H);c.stroke()}
   for(let y=Math.ceil(g.yMin/gy)*gy,n=0;y<=g.yMax+gy*.001&&n++<40;y+=gy){const py=sy(y);c.beginPath();c.moveTo(l,py);c.lineTo(l+W,py);c.stroke()}}
  c.strokeStyle=fg;c.lineWidth=3.5;
  if(g.yMin<=0&&g.yMax>=0){c.beginPath();c.moveTo(l,sy(0));c.lineTo(l+W,sy(0));c.stroke()}
  if(g.xMin<=0&&g.xMax>=0){c.beginPath();c.moveTo(sx(0),t);c.lineTo(sx(0),t+H);c.stroke()}
  c.strokeStyle='#228bd1';c.lineWidth=6;c.lineJoin='round';c.lineCap='round';c.beginPath();let wasValid=false,oldY=0;
  for(let i=0;i<=350;i++){const x=g.xMin+(g.xMax-g.xMin)*i/350,y=f(x),screenY=sy(y);const valid=Number.isFinite(screenY)&&screenY>=t-2*H&&screenY<=t+3*H;const jump=wasValid&&Math.abs(screenY-oldY)>H*.65;
   if(valid){if(!wasValid||jump)c.moveTo(sx(x),screenY);else c.lineTo(sx(x),screenY)}wasValid=valid;oldY=screenY}
  c.stroke();
  if(g.showPoint){const x=g.pointStart+(g.pointEnd-g.pointStart)*Math.max(0,Math.min(1,p)),y=f(x),px=sx(x),py=sy(y);
   if(Number.isFinite(py)&&px>=l&&px<=l+W&&py>=t&&py<=t+H){
    if(g.showTangent){const h=Math.max(1e-4,(g.xMax-g.xMin)*.00005),d=(f(x+h)-f(x-h))/(2*h);if(Number.isFinite(d)){const half=(g.xMax-g.xMin)*.25;c.strokeStyle='#e08a32';c.lineWidth=4;c.beginPath();c.moveTo(sx(x-half),sy(y-d*half));c.lineTo(sx(x+half),sy(y+d*half));c.stroke()}}
    c.fillStyle='#e54746';c.strokeStyle='#ffffff';c.lineWidth=4;c.beginPath();c.arc(px,py,13,0,Math.PI*2);c.fill();c.stroke();
   }
  }
  c.restore();c.save();c.strokeStyle='rgba(85,111,140,.65)';c.lineWidth=2;c.strokeRect(l,t,W,H);c.font='bold 26px system-ui';c.fillStyle=fg;c.textAlign='center';c.fillText('y = '+g.formula,cx,t-17,850);c.restore();
 }
 function drawStrokes(c,g){for(const st of g.strokes){if(!st.pts.length)continue;c.save();c.lineWidth=st.size;c.strokeStyle=st.color;c.lineCap='round';c.lineJoin='round';c.beginPath();st.pts.forEach((pt,i)=>{const x=pt[0]*1080,y=pt[1]*1920;if(!i)c.moveTo(x,y);else c.lineTo(x,y)});if(st.pts.length===1){c.arc(st.pts[0][0]*1080,st.pts[0][1]*1920,st.size/2,0,Math.PI*2);c.fillStyle=st.color;c.fill()}else c.stroke();c.restore()}}
 function draw(c,scene,p,fg,math){const g=scene.mathStudio||clean();drawGraph(c,g,p,fg);
  if(g.steps.length){const count=g.steps.length;for(let i=0;i<count;i++){if(p*100<g.stepStart+i*g.stepGap)continue;const latex=g.steps[i];if(!latex.trim())continue;const y=1460+i*Math.min(90,Math.floor(320/Math.max(1,count)));math(latex,540,y,900,80,fg)}}
  drawStrokes(c,g);
 }
 function mathPairs(s,fg){return (s.mathStudio?.steps||[]).filter(x=>x.trim()).map(x=>[x,fg])}
 const ids=['nmGraphEnable','nmGraphFormula','nmGraphXmin','nmGraphXmax','nmGraphYmin','nmGraphYmax','nmGraphGrid','nmGraphPoint','nmGraphTangent','nmGraphFrom','nmGraphTo','nmGraphPosition','nmGraphScale','nmMathSteps','nmStepStart','nmStepGap'];
 function refresh(){const g=projectScene()?.mathStudio;if(!g)return;const map={nmGraphEnable:g.enabled,nmGraphFormula:g.formula,nmGraphXmin:g.xMin,nmGraphXmax:g.xMax,nmGraphYmin:g.yMin,nmGraphYmax:g.yMax,nmGraphGrid:g.showGrid,nmGraphPoint:g.showPoint,nmGraphTangent:g.showTangent,nmGraphFrom:g.pointStart,nmGraphTo:g.pointEnd,nmGraphPosition:g.graphY,nmGraphScale:g.graphScale,nmMathSteps:g.steps.join('\n'),nmStepStart:g.stepStart,nmStepGap:g.stepGap};
  for(const id of ids){const el=$(id);if(!el||document.activeElement===el)continue;if(el.type==='checkbox')el.checked=!!map[id];else el.value=map[id]}
  const active=$('nmPenToggle');if(active){active.textContent=pen?'إيقاف القلم':'تفعيل القلم';active.setAttribute('aria-pressed',String(pen))}
  if($('nmGraphError'))$('nmGraphError').textContent=lastError?'خطأ في الدالة: '+lastError:'';
 }
 function apply(){if(bridge.playing())return;const s=projectScene(),g=s.mathStudio;
  const checked=id=>!!$(id).checked, val=id=>$(id).value;
  let next=clean({...g,enabled:checked('nmGraphEnable'),formula:val('nmGraphFormula'),xMin:val('nmGraphXmin'),xMax:val('nmGraphXmax'),yMin:val('nmGraphYmin'),yMax:val('nmGraphYmax'),showGrid:checked('nmGraphGrid'),showPoint:checked('nmGraphPoint'),showTangent:checked('nmGraphTangent'),pointStart:val('nmGraphFrom'),pointEnd:val('nmGraphTo'),graphY:val('nmGraphPosition'),graphScale:val('nmGraphScale'),steps:val('nmMathSteps').split('\n').map(x=>x.trim()).filter(Boolean),stepStart:val('nmStepStart'),stepGap:val('nmStepGap')});
  if(next.enabled){try{compile(next.formula);lastError=''}catch(e){lastError=e.message}}
  s.mathStudio=next;bridge.commit();bridge.prewarm();refresh();
 }
 function coords(e){const r=$('stage').getBoundingClientRect();return [clamp((e.clientX-r.left)/r.width,0,1,.5),clamp((e.clientY-r.top)/r.height,0,1,.5)]}
 function pointerDown(e){if(!pen||bridge.playing())return false;const g=projectScene().mathStudio;if(g.strokes.length>=80){bridge.status('الحد الأقصى 80 تأشيراً في المشهد');return true}
  const stroke={color:penColor,size:penSize,pts:[coords(e)]};g.strokes.push(stroke);gesture={id:e.pointerId,stroke};$('stage').setPointerCapture(e.pointerId);bridge.draw();return true;
 }
 function pointerMove(e){if(!gesture||e.pointerId!==gesture.id)return false;const pts=gesture.stroke.pts,p=coords(e),prev=pts.at(-1);if(pts.length<700&&Math.hypot(p[0]-prev[0],p[1]-prev[1])>.001){pts.push(p);bridge.draw()}return true}
 function pointerEnd(e){if(!gesture||e.pointerId!==gesture.id)return false;gesture=null;bridge.commit();return true}
 function init(api){bridge=api;
  ids.forEach(id=>{const el=$(id);if(el)el.addEventListener(el.type==='checkbox'?'change':id==='nmMathSteps'||id==='nmGraphFormula'?'change':'change',apply)});
  $('nmPenToggle').addEventListener('click',()=>{pen=!pen;refresh();bridge.status(pen?'القلم مفعل: ارسم داخل معاينة الفيديو، ثم أوقفه للعودة للتحرير.':'تم إيقاف القلم')});
  $('nmPenUndo').addEventListener('click',()=>{const g=projectScene().mathStudio;if(!g.strokes.length)return;g.strokes.pop();bridge.commit()});
  $('nmPenClear').addEventListener('click',()=>{const g=projectScene().mathStudio;if(!g.strokes.length||!confirm('حذف جميع خطوط القلم من هذا المشهد؟'))return;g.strokes=[];bridge.commit()});
  $('nmPenColor').addEventListener('change',e=>{penColor=PEN_COLORS.includes(e.target.value)?e.target.value:PEN_COLORS[0]});
  $('nmPenSize').addEventListener('input',e=>penSize=clamp(e.target.value,2,24,7));
  refresh();
 }
 NM.mathStudio={clean,compile,draw,mathPairs,refresh,init,pointerDown,pointerMove,pointerEnd};
})(window.NM);
