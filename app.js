'use strict';
const $=id=>document.getElementById(id);
const themes=['notebook','blackboard','clean','dark'];
const defaults=[
 {title:'حل معادلة لوغاريتمية',question:'أوجد قيمة x',equation:'\\log_{2}(x)=3',answer:'',duration:4,qAt:20,eAt:45,aAt:70},
 {title:'التحويل إلى الصورة الأسية',question:'نحوّل إلى الصورة الأسية',equation:'x=2^{3}',answer:'',duration:4,qAt:20,eAt:45,aAt:70},
 {title:'النتيجة النهائية',question:'نحسب القوة',equation:'2\\times2\\times2',answer:'x=8',duration:4,qAt:20,eAt:45,aAt:70}
];
const clone=x=>JSON.parse(JSON.stringify(x));
const brandingDefaults={header:'الرياضيات | شرح مبسط',footer:'Nibor Motion',showHeader:true,showFooter:true,headerSize:35,footerSize:30};
const brandingText=(v,fallback)=>String(v===undefined||v===null?fallback:v).slice(0,160);
function cleanBranding(b){return {header:brandingText(b?.header,brandingDefaults.header),footer:brandingText(b?.footer,brandingDefaults.footer),showHeader:b?.showHeader!==false,showFooter:b?.showFooter!==false,headerSize:bounded(b?.headerSize,22,80,35),footerSize:bounded(b?.footerSize,22,80,30)}};

const bounded=(x,min,max,fallback)=>{let n=Number(x);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback};
const cleanScene=s=>({title:String(s?.title??''),question:String(s?.question??''),equation:String(s?.equation??''),answer:String(s?.answer??''),duration:bounded(s?.duration,1,30,4),qAt:bounded(s?.qAt,0,95,20),eAt:bounded(s?.eAt,0,95,45),aAt:bounded(s?.aAt,0,95,70)});
function cleanProject(x){if(!Array.isArray(x?.scenes)||!x.scenes.length||x.scenes.length>100)throw Error('ملف المشروع غير صالح');return {name:String(x.name||'مشروع').slice(0,120),theme:themes.includes(x.theme)?x.theme:'notebook',branding:cleanBranding(x.branding),scenes:x.scenes.map(cleanScene)}}
let state={name:'حل معادلة لوغاريتمية',theme:'notebook',branding:cleanBranding(brandingDefaults),scenes:clone(defaults)};
try{const saved=JSON.parse(localStorage.getItem('nibor-motion-v1'));if(saved)state=cleanProject(saved)}catch(e){console.warn('تعذر استعادة المشروع',e)}
let index=0,playing=false,exporting=false,playToken=0,clock=0,mathfieldReady=false,fieldSync=false,renderTicket=0;
const ctx=$('stage').getContext('2d',{alpha:false});const CW=1080,CH=1920;
const mathCache=new Map();let mathReady=false;
const status=msg=>{$('status').textContent=msg};
function save(){try{localStorage.setItem('nibor-motion-v1',JSON.stringify(state))}catch(e){status('تعذر الحفظ على الجهاز. صدّر المشروع JSON للاحتفاظ بنسخة احتياطية.')}}
function seconds(){return state.scenes.reduce((a,s)=>a+s.duration,0)}
function sceneStart(i){return state.scenes.slice(0,i).reduce((a,s)=>a+s.duration,0)}
function atTime(t){let passed=0;for(let i=0;i<state.scenes.length;i++){let d=state.scenes[i].duration;if(t<passed+d || i===state.scenes.length-1)return {index:i,progress:Math.max(0,Math.min(1,(t-passed)/d))};passed+=d}return {index:0,progress:0}}
function fmt(t){t=Math.max(0,Math.floor(t));return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')}
function setBusy(v){playing=v;$('play').disabled=v;$('export').disabled=v;$('png').disabled=v;$('stop').disabled=!v}
function drawControls(){const s=state.scenes[index];$('scenes').replaceChildren();state.scenes.forEach((scene,i)=>{const el=document.createElement('button');el.type='button';el.className='scene'+(i===index?' active':'');const t=document.createElement('span');t.textContent=`${i+1}. ${scene.title||'مشهد جديد'}`;const d=document.createElement('small');d.textContent=`${scene.duration} ث`;el.append(t,d);el.onclick=()=>{if(playing)return;index=i;clock=sceneStart(i)+state.scenes[i].duration;drawControls();render(1)};$('scenes').append(el)});$('timeline').replaceChildren();state.scenes.forEach((s,i)=>{const b=document.createElement('button');b.type='button';b.className=i===index?'active':'';b.textContent=`${i+1} · ${s.duration}ث`;b.style.flexGrow=String(s.duration);b.onclick=()=>{if(playing)return;index=i;clock=sceneStart(i)+s.duration;drawControls();render(1)};$('timeline').append(b)});for(const key of ['title','question','equation','answer','duration','qAt','eAt','aAt'])$(key).value=s[key];for(const pair of [['qAt','qOut'],['eAt','eOut'],['aAt','aOut']])$(pair[1]).textContent=s[pair[0]]+'%';$('theme').value=state.theme;$('project').value=state.name;$('counter').textContent=`${index+1} / ${state.scenes.length}`;updateSeek();syncMathField(s.equation)}
function updateSeek(){const total=seconds();$('seek').value=Math.round(1000*clock/Math.max(.01,total));$('time').textContent=`${fmt(clock)} / ${fmt(total)}`}
function syncMathField(value){const field=$('mathfield');if(!mathfieldReady||!field)return;fieldSync=true;try{field.value=value||''}catch(e){console.warn(e)}fieldSync=false}
function redrawAfterEdit(key,val){const s=state.scenes[index];s[key]=(['duration'].includes(key)?bounded(val,1,30,4):['qAt','eAt','aAt'].includes(key)?bounded(val,0,95,20):String(val));save();if(key==='duration'){clock=sceneStart(index)+s.duration;drawControls()}else{if(key==='title'){const label=$('scenes').children[index]?.firstChild;if(label)label.textContent=`${index+1}. ${s.title||'مشهد جديد'}`;}if(key==='equation'&&$('mathfield')?.value!==s.equation)syncMathField(s.equation);if(['qAt','eAt','aAt'].includes(key))$({qAt:'qOut',eAt:'eOut',aAt:'aOut'}[key]).textContent=s[key]+'%';render(1)}if(key==='equation'||key==='answer')warmMath(s[key]);}
for(const key of ['title','question','equation','answer','duration','qAt','eAt','aAt'])$(key).addEventListener('input',e=>{if(playing)return;redrawAfterEdit(key,e.target.value)});
function syncBrandingControls(){const b=state.branding;$('videoHeader').value=b.header;$('videoFooter').value=b.footer;$('showHeader').checked=b.showHeader;$('showFooter').checked=b.showFooter;$('headerSize').value=b.headerSize;$('footerSize').value=b.footerSize;$('headerSizeOut').textContent=b.headerSize+'px';$('footerSizeOut').textContent=b.footerSize+'px'}
for(const [id,key] of [['videoHeader','header'],['videoFooter','footer']])$(id).addEventListener('input',e=>{if(playing)return;state.branding[key]=brandingText(e.target.value,'');save();renderCurrent()});
for(const [id,key] of [['showHeader','showHeader'],['showFooter','showFooter']])$(id).addEventListener('change',e=>{if(playing)return;state.branding[key]=e.target.checked;save();renderCurrent()});
for(const [id,key,out] of [['headerSize','headerSize','headerSizeOut'],['footerSize','footerSize','footerSizeOut']])$(id).addEventListener('input',e=>{if(playing)return;state.branding[key]=bounded(e.target.value,22,80,key==='headerSize'?35:30);$(out).textContent=state.branding[key]+'px';save();renderCurrent()});
$('resetBranding').onclick=()=>{if(playing)return;state.branding=cleanBranding(brandingDefaults);syncBrandingControls();save();renderCurrent();status('تمت استعادة النصوص الافتراضية للرأس والذيل')};
$('project').oninput=e=>{state.name=e.target.value;save()};$('theme').onchange=e=>{state.theme=e.target.value;save();render(1)};
$('add').onclick=()=>{if(playing)return;state.scenes.push(cleanScene({title:'مشهد جديد',duration:4}));index=state.scenes.length-1;clock=seconds();save();drawControls();render(1)};
$('remove').onclick=()=>{if(playing)return;if(state.scenes.length===1){status('يجب إبقاء مشهد واحد على الأقل');return}state.scenes.splice(index,1);index=Math.min(index,state.scenes.length-1);clock=sceneStart(index)+state.scenes[index].duration;save();drawControls();render(1)};
$('prev').onclick=()=>{if(playing)return;index=(index-1+state.scenes.length)%state.scenes.length;clock=sceneStart(index)+state.scenes[index].duration;drawControls();render(1)};
$('next').onclick=()=>{if(playing)return;index=(index+1)%state.scenes.length;clock=sceneStart(index)+state.scenes[index].duration;drawControls();render(1)};
$('seek').oninput=e=>{if(playing)return;clock=seconds()*Number(e.target.value)/1000;const at=atTime(clock);if(index!==at.index){index=at.index;drawControls()}render(at.progress)};
$('save').onclick=()=>{save();status('تم حفظ المشروع في هذا المتصفح')};
function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
$('json').onclick=()=>download(new Blob([JSON.stringify({...state,version:'0.4.1'},null,2)],{type:'application/json'}),'nibor-motion-project.json');
$('import').onclick=()=>$('file').click();$('file').onchange=async e=>{try{if(!e.target.files[0])return;const x=JSON.parse(await e.target.files[0].text());state=cleanProject(x);index=0;clock=state.scenes[0].duration;save();drawControls();syncBrandingControls();render(1);prewarm();status('تم استيراد المشروع بنجاح')}catch(err){status('فشل الاستيراد: '+err.message)}finally{e.target.value=''}};
function initMathEditor(){const field=$('mathfield');if(!customElements.get('math-field')){$('mathHost').hidden=true;status('المحرر المرئي غير متاح حالياً؛ يمكنك استخدام إدخال LaTeX النصي.');return}mathfieldReady=true;try{field.mathVirtualKeyboardPolicy='auto';field.smartMode=true;field.value=state.scenes[index].equation;field.addEventListener('input',()=>{if(fieldSync||playing)return;fieldSync=true;const v=field.value;$('equation').value=v;fieldSync=false;redrawAfterEdit('equation',v)})}catch(e){console.warn(e)}}
if(customElements.get('math-field'))initMathEditor();else Promise.race([customElements.whenDefined('math-field'),waitForMathEditorTimeout()]).then(()=>{if(customElements.get('math-field'))initMathEditor();else {$('mathHost').hidden=true;status('المحرر المرئي غير متاح؛ استخدم حقل LaTeX النصي.')}}).catch(()=>{});
function waitForMathEditorTimeout(){return new Promise(resolve=>setTimeout(resolve,7000))}
document.querySelectorAll('[data-math]').forEach(btn=>btn.addEventListener('click',()=>{if(playing)return;const field=$('mathfield');if(mathfieldReady){field.executeCommand(['insert',btn.dataset.math,{selectionMode:'placeholder'}]);field.focus()}else{const el=$('equation');el.setRangeText(btn.dataset.math.replaceAll('#0','x').replaceAll('#?','y'),el.selectionStart,el.selectionEnd,'end');el.dispatchEvent(new Event('input'));el.focus()}}));
// Mathematical formulas are converted to standalone SVG bitmaps and used by the exact same Canvas compositor for preview and video.
function likelyMath(s){return /\\[a-zA-Z]+|\^|_|[{}]/.test(s)||/[=+×÷]/.test(s)}
function mathSVG(latex){
 const wrapper=window.MathJax.tex2svg(latex,{display:true});
 // MathJax outputs a MathML error node for malformed TeX: never treat that as a valid formula.
 if(wrapper.querySelector('merror,[data-mjx-error],[data-mml-node="merror"],mjx-merror')||/\\(s|left\\\{|right\\\})\\b/.test(latex))throw Error('صياغة LaTeX غير صحيحة');
 const svg=wrapper.querySelector('svg');if(!svg)throw Error('لم يتم إنشاء رسم للمعادلة');
 const copy=svg.cloneNode(true);copy.setAttribute('xmlns','http://www.w3.org/2000/svg');
 copy.setAttribute('xmlns:xlink','http://www.w3.org/1999/xlink');
 const view=copy.getAttribute('viewBox');if(!view)throw Error('رسم SVG غير مكتمل');
 const dims=view.trim().split(/[ ,]+/).map(Number);
 if(dims.length!==4||!dims.every(Number.isFinite)||dims[2]<=0||dims[3]<=0)throw Error('أبعاد المعادلة غير صالحة');
 // Preserve the original MathJax viewBox. Use explicit pixel dimensions and color,
 // avoiding Safari image decoding problems with ex units and inherited currentColor.
 const ratio=dims[2]/dims[3];const width=1200,height=Math.max(8,Math.round(width/ratio));
 if(height>6000)throw Error('رسم المعادلة طويل على نحو غير طبيعي');
 copy.setAttribute('width',String(width));copy.setAttribute('height',String(height));
 copy.setAttribute('style','color:#142f4d;fill:#142f4d');
 const source=new XMLSerializer().serializeToString(copy);
 if(!source.includes('<path')&&!source.includes('<use')&&!source.includes('<g'))throw Error('المعادلة لا تحتوي رسماً صالحاً');
 return source;
}
async function warmMath(raw){
 raw=String(raw||'').trim();if(!raw)return;
 const old=mathCache.get(raw);if(old?.ready||old?.pending)return old?.pending;
 const entry={ready:false,img:null,error:null,pending:null};mathCache.set(raw,entry);
 entry.pending=(async()=>{try{
 if(!window.MathJax?.startup?.promise)throw Error('مكتبة MathJax لم تُحمّل؛ تحقق من الإنترنت');
 await window.MathJax.startup.promise;
 if(!window.MathJax.tex2svg)throw Error('محرك MathJax SVG غير متاح');
 const svg=mathSVG(raw),uri='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
 const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('تعذر فتح صورة المعادلة على المتصفح'));img.src=uri});
 if(img.naturalWidth<1||img.naturalHeight<1)throw Error('صورة المعادلة فارغة');
 entry.img=img;entry.ready=true;entry.error=null;
 }catch(e){entry.error=e.message||String(e);entry.ready=false;}
 finally{entry.pending=null;renderCurrent();updateMathStatus();}})();
 return entry.pending;
}
function updateMathStatus(){
 const formulas=[...new Set(state.scenes.flatMap(v=>[v.equation,v.answer]).map(x=>String(x||'').trim()).filter(Boolean))];
 const failed=formulas.filter(f=>mathCache.get(f)?.error);
 if(failed.length){$('mathWarning').hidden=false;$('mathWarning').textContent='تنبيه: توجد معادلة لم تُرسم بشكل صحيح: '+failed[0]+' — '+mathCache.get(failed[0]).error+'؛ صحح LaTeX قبل التصدير.';}
 else {$('mathWarning').hidden=true;}
}
function prewarm(){for(const s of state.scenes){warmMath(s.equation);warmMath(s.answer)}}
function renderCurrent(){if(!playing){const at=atTime(clock);render(at.progress)}}
function text(ctx,str,x,y,maxWidth,size,color,weight=650,dir='rtl'){ctx.save();ctx.fillStyle=color;ctx.direction=dir;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${weight} ${size}px system-ui, sans-serif`;const lines=String(str||'').split('\n');let yy=y-(lines.length-1)*size*.65;for(const line of lines){let fs=size;while(ctx.measureText(line).width>maxWidth&&fs>19){fs-=2;ctx.font=`${weight} ${fs}px system-ui,sans-serif`}ctx.fillText(line,x,yy,maxWidth);yy+=size*1.3}ctx.restore()}
function math(ctx,raw,cx,cy,maxW,maxH,color){
 raw=String(raw||'').trim();if(!raw)return;
 const entry=mathCache.get(raw);
 if(entry?.ready&&entry.img){
  const img=entry.img,scale=Math.min(maxW/img.naturalWidth,maxH/img.naturalHeight);
  const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
  if(w>0&&h>0&&Number.isFinite(w)&&Number.isFinite(h)){
   ctx.save();if(state.theme==='dark'||state.theme==='blackboard')ctx.filter='invert(1)';
   ctx.drawImage(img,cx-w/2,cy-h/2,w,h);ctx.restore();return;
  }
 }
 // Explicit placeholder, never the opaque black rectangle previously seen on iPad.
 ctx.save();ctx.fillStyle='rgba(191,67,48,0.1)';ctx.fillRect(cx-maxW*.48,cy-45,maxW*.96,90);
 text(ctx,entry?.error?'⚠ صياغة المعادلة تحتاج تصحيحاً':'جارٍ تجهيز المعادلة…',cx,cy,maxW*.9,27,'#af4430',550);ctx.restore();
}
function fade(ctx,p,start,fn){const fadeTime=.09;const alpha=Math.max(0,Math.min(1,(p-start)/fadeTime));if(alpha<=0)return;ctx.save();ctx.globalAlpha*=alpha;fn();ctx.restore()}
function render(p=1){const s=state.scenes[index];const w=CW,h=CH;const theme=state.theme;const fg=theme==='dark'||theme==='blackboard'?'#f4f7ff':'#173a5c';ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=theme==='blackboard'?'#143d34':theme==='dark'?'#17253a':theme==='clean'?'#ffffff':'#faf6ea';ctx.fillRect(0,0,w,h);if(theme==='notebook'){ctx.strokeStyle='#dadfdd';ctx.lineWidth=2;for(let y=62;y<h;y+=74){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}}if(state.branding.showHeader&&state.branding.header)text(ctx,state.branding.header,540,145,860,state.branding.headerSize,fg,500);ctx.fillStyle='#f4d96c';ctx.beginPath();ctx.roundRect(95,540,890,170,16);ctx.fill();fade(ctx,p,0,()=>text(ctx,s.title,540,625,810,57,'#183b62',800));fade(ctx,p,s.qAt/100,()=>text(ctx,s.question,540,850,850,46,fg,600));fade(ctx,p,s.eAt/100,()=>math(ctx,s.equation,540,1105,865,175,fg));if(s.answer)fade(ctx,p,s.aAt/100,()=>{ctx.fillStyle='#e3efda';ctx.beginPath();ctx.roundRect(125,1290,830,190,20);ctx.fill();math(ctx,s.answer,540,1385,775,150,'#173a4b')});if(state.branding.showFooter&&state.branding.footer)text(ctx,state.branding.footer,540,1795,860,state.branding.footerSize,fg,400,/[\u0600-\u06ff]/.test(state.branding.footer)?'rtl':'ltr');ctx.restore();updateSeek()}
const wait=ms=>new Promise(res=>setTimeout(res,ms));
async function runPlayback(){if(playing)return;setBusy(true);const token=++playToken;clock=0;const start=performance.now();try{while(token===playToken&&clock<seconds()){clock=Math.min(seconds(),(performance.now()-start)/1000);const at=atTime(Math.min(clock,seconds()-.001));if(index!==at.index){index=at.index;drawControls()}render(at.progress);await wait(33)}clock=seconds();index=state.scenes.length-1;drawControls();render(1)}finally{setBusy(false)}}
$('play').onclick=runPlayback;$('stop').onclick=()=>{playToken++;setBusy(false);status('تم إيقاف التشغيل')};
$('png').onclick=()=>{$('stage').toBlob(blob=>{if(blob)download(blob,'nibor-motion-scene.png');else status('فشل إنشاء صورة PNG')},'image/png')};
async function exportVideo(){if(playing)return;const canvas=$('stage');if(!canvas.captureStream||!window.MediaRecorder){status('هذا المتصفح لا يدعم تسجيل Canvas. جرّب متصفحاً حديثاً على Windows أو iPad.');return}const formats=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm'];const mime=formats.find(v=>MediaRecorder.isTypeSupported(v));if(!mime){status('لا يتوفر برنامج ترميز فيديو مدعوم على هذا المتصفح');return}setBusy(true);exporting=true;const token=++playToken;const chunks=[];let rec;try{const formulae=[...new Set(state.scenes.flatMap(s=>[s.equation,s.answer]).filter(v=>String(v||'').trim()))];
await Promise.race([Promise.all(formulae.map(warmMath)),wait(12000)]);
const missing=formulae.filter(v=>!mathCache.get(String(v).trim())?.ready);
if(missing.length)throw Error('تصدير محظور حتى تصحيح أو تحميل المعادلات: '+missing.map(f=>f+' ('+(mathCache.get(String(f).trim())?.error||'لم يكتمل الرسم')+')').join('، '));
const stream=canvas.captureStream(30);rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:6500000});rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};rec.onerror=e=>status('فشل التسجيل: '+(e.error?.message||'خطأ من المتصفح'));const complete=new Promise((resolve,reject)=>{rec.onstop=resolve;});rec.start(1000);const beginning=performance.now();const total=seconds();status(`جاري تسجيل ${fmt(total)}، أبقِ الصفحة مفتوحة حتى الاكتمال...`);while(token===playToken && (performance.now()-beginning)/1000<total){clock=Math.min(total,(performance.now()-beginning)/1000);const at=atTime(Math.min(clock,total-.001));if(index!==at.index){index=at.index;drawControls()}render(at.progress);await wait(30)}clock=total;index=state.scenes.length-1;drawControls();render(1);await wait(120);rec.stop();await complete;stream.getTracks().forEach(t=>t.stop());if(chunks.length){const ext=mime.startsWith('video/mp4')?'mp4':'webm';download(new Blob(chunks,{type:mime}),`nibor-motion-v0.4.1.${ext}`);status(`تم تصدير ${ext.toUpperCase()} بدقة 1080×1920 دون صوت. افحص الفيديو على جهازك.`)}else status('لم ينتج المتصفح فيديو صالحاً؛ جرّب متصفحاً مختلفاً.')}catch(err){if(rec?.state==='recording')rec.stop();status('تعذر التصدير: '+err.message)}finally{exporting=false;setBusy(false)}}
$('export').onclick=exportVideo;
function initialize(){index=0;clock=state.scenes[0].duration;drawControls();syncBrandingControls();render(1);prewarm();updateMathStatus();if(!window.MathJax)status('الرياضيات حالياً بنص احتياطي. يتطلب إخراج المعادلات الاتصال بالإنترنت.');}
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
initialize();
