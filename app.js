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
function makeSceneId(){return (crypto.randomUUID?.()||'scene-'+Date.now()+'-'+Math.random().toString(36).slice(2))}
const cleanScene=s=>({id:String(s?.id||makeSceneId()),speechText:String(s?.speechText??'').slice(0,4000),speechRate:bounded(s?.speechRate,.7,1.3,1),ttsVoice:String(s?.ttsVoice||'marin'),autoDuration:s?.autoDuration!==false,voiceVolume:bounded(s?.voiceVolume,0,1,1),stickers:Array.isArray(s?.stickers)?s.stickers.slice(0,40).map(cleanSticker):[],title:String(s?.title??''),question:String(s?.question??''),equation:String(s?.equation??''),answer:String(s?.answer??''),duration:bounded(s?.duration,1,120,4),qAt:bounded(s?.qAt,0,95,20),eAt:bounded(s?.eAt,0,95,45),aAt:bounded(s?.aAt,0,95,70)});
function cleanSticker(s){return {id:String(s?.id||Date.now()+'-'+Math.random()),icon:['❓','❗','💡','✅','✏️','🎯','➡️','⭐','⭕','⚠️'].includes(s?.icon)?s.icon:'❓',x:bounded(s?.x,0,1,.5),y:bounded(s?.y,0,1,.38),size:bounded(s?.size,45,380,140),start:bounded(s?.start,0,95,10),end:bounded(s?.end,5,100,95),animation:['pop','fade','spin','static'].includes(s?.animation)?s.animation:'pop'}}
function cleanAudio(a){return {offset:bounded(a?.offset,0,30,0),volume:bounded(a?.volume,0,1,1)}}
function cleanProject(x){if(!Array.isArray(x?.scenes)||!x.scenes.length||x.scenes.length>100)throw Error('ملف المشروع غير صالح');return {projectId:String(x.projectId||makeSceneId()),name:String(x.name||'مشروع').slice(0,120),theme:themes.includes(x.theme)?x.theme:'notebook',branding:cleanBranding(x.branding),audio:cleanAudio(x.audio),scenes:x.scenes.map(cleanScene)}}
let state={projectId:makeSceneId(),name:'حل معادلة لوغاريتمية',theme:'notebook',branding:cleanBranding(brandingDefaults),audio:cleanAudio(null),scenes:defaults.map(cleanScene)};
try{const saved=JSON.parse(localStorage.getItem('nibor-motion-v1'));if(saved)state=cleanProject(saved)}catch(e){console.warn('تعذر استعادة المشروع',e)}
let selectedStickerId=null;let index=0,playing=false,exporting=false,playToken=0,clock=0,mathfieldReady=false,fieldSync=false,renderTicket=0;
const ctx=$('stage').getContext('2d',{alpha:false});const CW=1080,CH=1920;
const mathCache=new Map();let mathReady=false;
const status=msg=>{$('status').textContent=msg};
function save(){try{localStorage.setItem('nibor-motion-v1',JSON.stringify(state))}catch(e){status('تعذر الحفظ على الجهاز. صدّر المشروع JSON للاحتفاظ بنسخة احتياطية.')}}
function seconds(){return state.scenes.reduce((a,s)=>a+s.duration,0)}
function sceneStart(i){return state.scenes.slice(0,i).reduce((a,s)=>a+s.duration,0)}
function atTime(t){let passed=0;for(let i=0;i<state.scenes.length;i++){let d=state.scenes[i].duration;if(t<passed+d || i===state.scenes.length-1)return {index:i,progress:Math.max(0,Math.min(1,(t-passed)/d))};passed+=d}return {index:0,progress:0}}
function fmt(t){t=Math.max(0,Math.floor(t));return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')}
function setBusy(v){playing=v;$('play').disabled=v;$('export').disabled=v;$('png').disabled=v;$('stop').disabled=!v}
function drawControls(){const s=state.scenes[index];$('scenes').replaceChildren();state.scenes.forEach((scene,i)=>{const el=document.createElement('button');el.type='button';el.className='scene'+(i===index?' active':'');const t=document.createElement('span');t.textContent=`${i+1}. ${scene.title||'مشهد جديد'}`;const d=document.createElement('small');d.textContent=`${scene.duration} ث`;el.append(t,d);el.onclick=()=>{if(playing)return;index=i;clock=sceneStart(i)+state.scenes[i].duration;stopSceneAudio();drawControls();render(1)};$('scenes').append(el)});$('timeline').replaceChildren();state.scenes.forEach((s,i)=>{const b=document.createElement('button');b.type='button';b.className=i===index?'active':'';b.textContent=`${i+1} · ${s.duration}ث`;b.style.flexGrow=String(s.duration);b.onclick=()=>{if(playing)return;index=i;clock=sceneStart(i)+s.duration;stopSceneAudio();drawControls();render(1)};$('timeline').append(b)});for(const key of ['title','question','equation','answer','duration','qAt','eAt','aAt'])$(key).value=s[key];for(const pair of [['qAt','qOut'],['eAt','eOut'],['aAt','aOut']])$(pair[1]).textContent=s[pair[0]]+'%';$('theme').value=state.theme;$('project').value=state.name;$('counter').textContent=`${index+1} / ${state.scenes.length}`;updateSeek();syncMathField(s.equation);refreshStickers();syncSceneVoiceUI()}
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
$('remove').onclick=()=>{if(playing)return;if(state.scenes.length===1){status('يجب إبقاء مشهد واحد على الأقل');return}const removedId=state.scenes[index].id;voiceBlobs.delete(removedId);deleteSceneAudio(removedId).catch(()=>{});state.scenes.splice(index,1);index=Math.min(index,state.scenes.length-1);clock=sceneStart(index)+state.scenes[index].duration;save();drawControls();render(1)};
$('prev').onclick=()=>{if(playing)return;index=(index-1+state.scenes.length)%state.scenes.length;clock=sceneStart(index)+state.scenes[index].duration;drawControls();render(1)};
$('next').onclick=()=>{if(playing)return;index=(index+1)%state.scenes.length;clock=sceneStart(index)+state.scenes[index].duration;drawControls();render(1)};
$('seek').oninput=e=>{if(playing)return;clock=seconds()*Number(e.target.value)/1000;const at=atTime(clock);if(index!==at.index){index=at.index;drawControls()}render(at.progress)};
$('save').onclick=()=>{save();status('تم حفظ المشروع في هذا المتصفح (الصوت محفوظ محلياً منفصلاً عن JSON)')};
function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
$('json').onclick=()=>download(new Blob([JSON.stringify({...state,version:'0.5.0'},null,2)],{type:'application/json'}),'nibor-motion-project.json');
$('import').onclick=()=>$('file').click();$('file').onchange=async e=>{try{if(!e.target.files[0])return;const x=JSON.parse(await e.target.files[0].text());stopSceneAudio();state=cleanProject(x);voiceBlobs.clear();loadSceneVoices().catch(()=>{});index=0;clock=state.scenes[0].duration;selectedStickerId=null;save();drawControls();syncBrandingControls();render(1);prewarm();status('تم استيراد المشروع. ملفات الصوت لا تتضمنها نسخة JSON؛ يلزم إعادة ربطها عند نقل المشروع.')}catch(err){status('فشل الاستيراد: '+err.message)}finally{e.target.value=''}};
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
function render(p=1){const s=state.scenes[index];const w=CW,h=CH;const theme=state.theme;const fg=theme==='dark'||theme==='blackboard'?'#f4f7ff':'#173a5c';ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=theme==='blackboard'?'#143d34':theme==='dark'?'#17253a':theme==='clean'?'#ffffff':'#faf6ea';ctx.fillRect(0,0,w,h);if(theme==='notebook'){ctx.strokeStyle='#dadfdd';ctx.lineWidth=2;for(let y=62;y<h;y+=74){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}}if(state.branding.showHeader&&state.branding.header)text(ctx,state.branding.header,540,145,860,state.branding.headerSize,fg,500);ctx.fillStyle='#f4d96c';ctx.beginPath();ctx.roundRect(95,540,890,170,16);ctx.fill();fade(ctx,p,0,()=>text(ctx,s.title,540,625,810,57,'#183b62',800));fade(ctx,p,s.qAt/100,()=>text(ctx,s.question,540,850,850,46,fg,600));fade(ctx,p,s.eAt/100,()=>math(ctx,s.equation,540,1105,865,175,fg));if(s.answer)fade(ctx,p,s.aAt/100,()=>{ctx.fillStyle='#e3efda';ctx.beginPath();ctx.roundRect(125,1290,830,190,20);ctx.fill();math(ctx,s.answer,540,1385,775,150,'#173a4b')});if(state.branding.showFooter&&state.branding.footer)text(ctx,state.branding.footer,540,1795,860,state.branding.footerSize,fg,400,/[\u0600-\u06ff]/.test(state.branding.footer)?'rtl':'ltr');drawStickers(ctx,s,p);ctx.restore();updateSeek()}
const wait=ms=>new Promise(res=>setTimeout(res,ms));
async function runPlayback(){if(playing)return;setBusy(true);const token=++playToken;clock=0;let previous=-1;const start=performance.now();try{while(token===playToken&&clock<seconds()){clock=Math.min(seconds(),(performance.now()-start)/1000);const at=atTime(Math.min(clock,seconds()-.001));if(at.index!==previous){stopSceneAudio();previous=at.index;index=at.index;drawControls();playSceneAudio(state.scenes[index].id).catch(()=>{});}render(at.progress);await wait(33)}clock=seconds();index=state.scenes.length-1;drawControls();render(1)}finally{stopSceneAudio();setBusy(false)}}
$('play').onclick=runPlayback;$('stop').onclick=()=>{playToken++;stopSceneAudio();setBusy(false);status('تم إيقاف التشغيل')};
$('png').onclick=()=>{$('stage').toBlob(blob=>{if(blob)download(blob,'nibor-motion-scene.png');else status('فشل إنشاء صورة PNG')},'image/png')};
async function exportVideo(){if(playing)return;
const missingVoices=state.scenes.map((scene,i)=>({scene,i})).filter(x=>x.scene.speechText.trim()&&!voiceBlobs.has(x.scene.id));
if(missingVoices.length){const ids=missingVoices.map(x=>x.i+1).join('، ');status('لا يوجد صوت محفوظ للمشاهد: '+ids+'. اختر توليد ملف صوتي أو تسجيل/استيراد صوت لكل مشهد قبل التصدير.');alert('توقف التصدير لمنع فيديو صامت.\nيوجد نص تعليق دون ملف صوتي في المشاهد: '+ids+'\n\nاستماع تجريبي لا يُحفظ داخل الفيديو. لتصدير فيديو صامت احذف نص التعليق من تلك المشاهد.');return;}
const canvas=$('stage');if(!canvas.captureStream||!window.MediaRecorder){status('تسجيل Canvas غير مدعوم في هذا المتصفح');return}
const formats=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm'];const mime=formats.find(v=>MediaRecorder.isTypeSupported(v));if(!mime){status('لا توجد صيغة فيديو مدعومة');return}
setBusy(true);exporting=true;const token=++playToken;const chunks=[];let rec,ac=null,stream=null,videoStream=null;const sources=[];
try{const formulae=[...new Set(state.scenes.flatMap(s=>[s.equation,s.answer]).filter(v=>String(v||'').trim()))];await Promise.race([Promise.all(formulae.map(warmMath)),wait(12000)]);const missing=formulae.filter(v=>!mathCache.get(String(v).trim())?.ready);if(missing.length)throw Error('تعذر تجهيز بعض المعادلات، عالجها قبل التصدير');
videoStream=canvas.captureStream(30);stream=videoStream;const voiceEntries=state.scenes.map((s,i)=>({s,i,blob:voiceBlobs.get(s.id)})).filter(x=>x.blob);
if(!voiceEntries.length){status('تنبيه: لا توجد أي ملفات صوت للمشروع. سيُصدر الفيديو دون صوت.');}

if(voiceEntries.length){ac=new (window.AudioContext||window.webkitAudioContext)();const dest=ac.createMediaStreamDestination();
for(const {s,i,blob} of voiceEntries){const buffer=await ac.decodeAudioData(await blob.arrayBuffer());const src=ac.createBufferSource();src.buffer=buffer;const gain=ac.createGain();gain.gain.value=s.voiceVolume;src.connect(gain);gain.connect(dest);sources.push({src,start:sceneStart(i),length:Math.min(s.duration,buffer.duration)})}
await ac.resume();stream=new MediaStream([...videoStream.getVideoTracks(),...dest.stream.getAudioTracks()]);}
rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8000000});rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};const complete=new Promise(resolve=>rec.onstop=resolve);rec.start(1000);render(0);const startTime=performance.now();const audioStart=ac?.currentTime+.08;
for(const a of sources)a.src.start(audioStart+a.start,0,a.length);
const total=seconds();status('جارٍ تصدير الفيديو مع صوت كل مشهد حسب توقيته…');
while(token===playToken&&(performance.now()-startTime)/1000<total){clock=Math.min(total,(performance.now()-startTime)/1000);const at=atTime(Math.min(clock,total-.001));if(index!==at.index){index=at.index;drawControls()}render(at.progress);await wait(30)}
clock=total;index=state.scenes.length-1;drawControls();render(1);await wait(170);rec.stop();await complete;
if(chunks.length){const ext=mime.startsWith('video/mp4')?'mp4':'webm';download(new Blob(chunks,{type:mime}),`nibor-motion-v0.5.3.${ext}`);status(`تم إنشاء ${ext.toUpperCase()} مع ${voiceEntries.length} تعليق صوتي. تحقق من الدقة الفعلية وتزامن الصوت على iPad.`)}else status('لم ينتج المتصفح ملف فيديو صالحاً');
}catch(err){status('تعذر التصدير: '+err.message);if(rec?.state==='recording'){try{rec.stop()}catch(e){}}}finally{sources.forEach(a=>{try{a.src.stop()}catch(e){}});stream?.getTracks().forEach(t=>t.stop());videoStream?.getTracks().forEach(t=>t.stop());if(ac)await ac.close().catch(()=>{});exporting=false;setBusy(false)}}
$('export').onclick=exportVideo;
function initialize(){save();index=0;clock=state.scenes[0].duration;drawControls();syncBrandingControls();render(1);prewarm();updateMathStatus();if(!window.MathJax)status('الرياضيات حالياً بنص احتياطي. يتطلب إخراج المعادلات الاتصال بالإنترنت.');}
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

// Stickers and drag interactions, coordinates normalized to the 1080x1920 master canvas.
function currentSticker(){return state.scenes[index].stickers?.find(s=>s.id===selectedStickerId)}
function refreshStickers(){const el=$('stickerSelect');if(!el)return;el.replaceChildren();const none=document.createElement('option');none.value='';none.textContent='اختر ملصقاً';el.append(none);for(const s of state.scenes[index].stickers||[]){let opt=document.createElement('option');opt.value=s.id;opt.textContent=s.icon+' '+Math.round(s.x*100)+'% / '+Math.round(s.y*100)+'%';el.append(opt)}if(!currentSticker())selectedStickerId=null;el.value=selectedStickerId||'';const s=currentSticker();for(const k of ['Size','Start','End']){const id='sticker'+k;$(id).disabled=!s;$(id).value=s?s[k.toLowerCase()]:({Size:140,Start:10,End:95}[k]);$(id+'Out').textContent=$(id).value+(k==='Size'?'px':'%')}$('stickerAnimation').disabled=!s;$('stickerAnimation').value=s?.animation||'pop';$('removeSticker').disabled=!s}
function mutateSticker(key,v){const s=currentSticker();if(!s||playing)return;s[key]=['size','start','end'].includes(key)?Number(v):v;if(s.start>=s.end){if(key==='start')s.end=Math.min(100,s.start+5);else s.start=Math.max(0,s.end-5)}save();refreshStickers();renderCurrent()}
for(const b of document.querySelectorAll('[data-sticker]'))b.onclick=()=>{if(playing)return;const s=cleanSticker({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),icon:b.dataset.sticker,x:.5,y:.37,start:0,end:100,size:145});state.scenes[index].stickers.push(s);selectedStickerId=s.id;save();refreshStickers();renderCurrent();status('أضف الملصق واسحبه داخل المعاينة')};
$('stickerSelect').onchange=e=>{selectedStickerId=e.target.value||null;refreshStickers();renderCurrent()};$('removeSticker').onclick=()=>{if(!currentSticker())return;state.scenes[index].stickers=state.scenes[index].stickers.filter(s=>s.id!==selectedStickerId);selectedStickerId=null;save();refreshStickers();renderCurrent()};
for(const [id,key] of [['stickerSize','size'],['stickerStart','start'],['stickerEnd','end'],['stickerAnimation','animation']])$(id).addEventListener(id==='stickerAnimation'?'change':'input',e=>mutateSticker(key,e.target.value));
function drawStickers(c,scene,p){for(const s of scene.stickers||[]){const start=s.start/100,end=s.end/100;if(p<start||p>end)continue;const fade=Math.min(1,Math.max(0,(p-start)/.1),(end-p)/.08);const x=s.x*CW,y=s.y*CH;c.save();c.globalAlpha*=s.animation==='static'?1:Math.max(0,fade);c.translate(x,y);const t=Math.min(1,Math.max(0,(p-start)/.15));if(s.animation==='pop')c.scale(.45+.55*(1-Math.pow(1-t,3)),.45+.55*(1-Math.pow(1-t,3)));if(s.animation==='spin')c.rotate((1-t)*-.55);c.textAlign='center';c.textBaseline='middle';c.font=`${s.size}px 'Apple Color Emoji','Segoe UI Emoji',system-ui`;c.fillText(s.icon,0,0);c.restore()}}
let dragSticker=null;
function stageCoords(e){const r=$('stage').getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))}}
$('stage').addEventListener('pointerdown',e=>{if(playing)return;const p=stageCoords(e);const items=[...(state.scenes[index].stickers||[])].reverse();const hit=items.find(s=>Math.abs(s.x-p.x)*CW<s.size*.75&&Math.abs(s.y-p.y)*CH<s.size*.75);if(hit){selectedStickerId=hit.id;dragSticker=hit.id;$('stage').setPointerCapture(e.pointerId);refreshStickers();renderCurrent()}});
$('stage').addEventListener('pointermove',e=>{if(!dragSticker||playing)return;const s=currentSticker();if(!s)return;const p=stageCoords(e);s.x=p.x;s.y=p.y;renderCurrent()});
function dragEnd(){if(dragSticker){dragSticker=null;save();refreshStickers()}}
$('stage').addEventListener('pointerup',dragEnd);$('stage').addEventListener('pointercancel',dragEnd);
// Voice clips are kept by stable scene ID and project ID, never embedded in JSON.
const voiceBlobs=new Map();const voiceUrls=new Map();let activeRecorder=null,micStream=null,previewVoice=null,previewVoiceUrl=null;
const projectKey=()=>state.projectId;
function voiceKey(sceneId){return 'project:'+projectKey()+':'+sceneId}
function soundDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('nibor-motion-scene-voices',1);r.onupgradeneeded=()=>r.result.createObjectStore('clips');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function dbAudio(op,key,blob){const db=await soundDB();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('clips',op==='get'?'readonly':'readwrite'),s=tx.objectStore('clips');let req;if(op==='get')req=s.get(key);else if(op==='put')req=s.put(blob,key);else req=s.delete(key);if(op==='get')req.onsuccess=()=>resolve(req.result);tx.oncomplete=()=>op!=='get'&&resolve();tx.onerror=()=>reject(tx.error);req.onerror=()=>reject(req.error)})}finally{db.close()}}
async function deleteSceneAudio(id){await dbAudio('delete',voiceKey(id))}
async function loadSceneVoices(){voiceBlobs.clear();for(const s of state.scenes){const b=await dbAudio('get',voiceKey(s.id));if(b)voiceBlobs.set(s.id,b)}syncSceneVoiceUI()}
function stopSceneAudio(){previewVoice?.pause();previewVoice=null;if(previewVoiceUrl){URL.revokeObjectURL(previewVoiceUrl);previewVoiceUrl=null;}if(window.speechSynthesis)window.speechSynthesis.cancel()}
function setSceneAudio(blob,sid=index,persist=true){const id=typeof sid==='number'?state.scenes[sid].id:sid;if(!blob||!blob.size)return;voiceBlobs.set(id,blob);if(persist)dbAudio('put',voiceKey(id),blob).catch(e=>status('تعذر حفظ الصوت محلياً: '+e.message));if(state.scenes[index].id===id)syncSceneVoiceUI();}
function syncSceneVoiceUI(){const s=state.scenes[index],blob=voiceBlobs.get(s.id);$('speechText').value=s.speechText;$('speechRate').value=s.speechRate;$('speechRateOut').textContent=s.speechRate.toFixed(1)+'×';$('ttsVoice').value=s.ttsVoice;$('audioVolume').value=Math.round(s.voiceVolume*100);$('audioVolumeOut').textContent=Math.round(s.voiceVolume*100)+'%';$('autoDuration').checked=s.autoDuration;const player=$('audioPreview');player.pause();if(player.dataset.url)URL.revokeObjectURL(player.dataset.url);if(blob){player.dataset.url=URL.createObjectURL(blob);player.src=player.dataset.url;$('audioStatus').textContent='✅ ملف صوتي محفوظ لهذا المشهد: '+(blob.size/1024).toFixed(0)+'KB — سيدخل في الفيديو عند التصدير.';}else{delete player.dataset.url;player.removeAttribute('src');player.load();$('audioStatus').textContent=s.speechText.trim()?'⚠ النص مكتوب لكن لم يتم توليد ملف صوتي. الاستماع التجريبي لا يُضاف إلى الفيديو.':'لا يوجد ملف صوتي لهذا المشهد بعد.'}}
function updateSceneVoice(key,val){if(playing)return;state.scenes[index][key]=val;save()}
$('speechText').oninput=e=>updateSceneVoice('speechText',e.target.value.slice(0,4000));
$('speechRate').oninput=e=>{const v=Number(e.target.value);updateSceneVoice('speechRate',v);$('speechRateOut').textContent=v.toFixed(1)+'×'};
$('ttsVoice').onchange=e=>updateSceneVoice('ttsVoice',e.target.value);
$('audioVolume').oninput=e=>{let v=Number(e.target.value)/100;updateSceneVoice('voiceVolume',v);$('audioVolumeOut').textContent=Math.round(v*100)+'%'};
$('autoDuration').onchange=e=>updateSceneVoice('autoDuration',e.target.checked);
const endpointKey='nibor-motion-tts-endpoint';$('ttsEndpoint').value=localStorage.getItem(endpointKey)||'';$('ttsEndpoint').onchange=e=>{const u=e.target.value.trim();if(u&&!/^https:\/\//i.test(u)){status('يجب استخدام رابط HTTPS لخدمة الصوت');return}localStorage.setItem(endpointKey,u)};
function populateBrowserVoices(){const sel=$('speechVoice');const old=sel.value;const voices=speechSynthesis.getVoices();sel.replaceChildren();const initial=document.createElement('option');initial.value='';initial.textContent='صوت الجهاز الافتراضي';sel.append(initial);for(const v of voices.filter(x=>x.lang.toLowerCase().startsWith('ar')).concat(voices.filter(x=>!x.lang.toLowerCase().startsWith('ar')).slice(0,12))){const o=document.createElement('option');o.value=v.voiceURI;o.textContent=v.name+' — '+v.lang;sel.append(o)}sel.value=old}
if('speechSynthesis'in window){populateBrowserVoices();speechSynthesis.onvoiceschanged=populateBrowserVoices}
$('speakPreview').onclick=()=>{if(!('speechSynthesis'in window)){status('الأصوات المحلية غير مدعومة هنا');return}stopSceneAudio();const s=state.scenes[index];if(!s.speechText.trim()){status('اكتب نص الشرح أولاً');return}const utterance=new SpeechSynthesisUtterance(s.speechText);utterance.lang='ar';utterance.rate=s.speechRate;utterance.voice=speechSynthesis.getVoices().find(v=>v.voiceURI===$('speechVoice').value)||null;speechSynthesis.speak(utterance)};
$('stopSpeaking').onclick=stopSceneAudio;
function audioSeconds(blob){return new Promise((resolve,reject)=>{const a=document.createElement('audio');const u=URL.createObjectURL(blob);a.preload='metadata';a.onloadedmetadata=()=>{const dur=a.duration;URL.revokeObjectURL(u);Number.isFinite(dur)?resolve(dur):reject(Error('مدة الصوت غير معروفة'))};a.onerror=()=>{URL.revokeObjectURL(u);reject(Error('تعذر قراءة مدة الصوت'))};a.src=u})}
async function fitSceneAudio(blob,id){const s=state.scenes.find(s=>s.id===id);if(!s||!s.autoDuration)return;try{const dur=await audioSeconds(blob);if(dur>s.duration){s.duration=Math.min(120,Math.ceil((dur+.4)*2)/2);save();if(state.scenes[index].id===id){clock=sceneStart(index)+s.duration;drawControls();render(1)}status('عُدلت مدة المشهد لتناسب التعليق الصوتي: '+s.duration+' ثانية')}}catch(e){status('أضيف الصوت ولكن تعذر حساب مدته آلياً')}}
$('audioFile').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;const id=state.scenes[index].id;if(file.size>30*1024*1024){status('الملف الصوتي أكبر من 30MB');return}setSceneAudio(file,id);await fitSceneAudio(file,id);e.target.value=''};
$('recordAudio').onclick=async()=>{if(playing||activeRecorder)return;const id=state.scenes[index].id;try{micStream=await navigator.mediaDevices.getUserMedia({audio:true});const types=['audio/mp4','audio/webm;codecs=opus','audio/webm'];const mime=types.find(t=>MediaRecorder.isTypeSupported(t));const rec=new MediaRecorder(micStream,mime?{mimeType:mime}:{});const chunks=[];activeRecorder=rec;rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};rec.onstop=async()=>{micStream?.getTracks().forEach(t=>t.stop());micStream=null;activeRecorder=null;$('recordAudio').disabled=false;$('stopAudio').disabled=true;if(chunks.length){const blob=new Blob(chunks,{type:rec.mimeType||'audio/webm'});setSceneAudio(blob,id);await fitSceneAudio(blob,id)}};rec.start(350);$('recordAudio').disabled=true;$('stopAudio').disabled=false;$('audioStatus').textContent='● يجري تسجيل صوت هذا المشهد…'}catch(err){status('تعذر التسجيل: '+err.message);micStream?.getTracks().forEach(t=>t.stop());activeRecorder=null}};
$('stopAudio').onclick=()=>{if(activeRecorder?.state==='recording')activeRecorder.stop()};
$('removeAudio').onclick=()=>{if(playing)return;const id=state.scenes[index].id;voiceBlobs.delete(id);deleteSceneAudio(id).catch(()=>{});syncSceneVoiceUI()};
async function playSceneAudio(id){const blob=voiceBlobs.get(id);if(!blob)return;previewVoiceUrl=URL.createObjectURL(blob);const a=new Audio(previewVoiceUrl);previewVoice=a;a.volume=state.scenes.find(s=>s.id===id)?.voiceVolume??1;try{await a.play()}catch(e){status('لم يسمح المتصفح بتشغيل صوت المشهد تلقائياً')}finally{a.onended=()=>{if(previewVoice===a)stopSceneAudio()}}}
$('generateSpeech').onclick=async()=>{const s=state.scenes[index],id=s.id,endpoint=$('ttsEndpoint').value.trim();if(!s.speechText.trim()){status('اكتب النص الصوتي أولاً');return}if(!endpoint||!endpoint.startsWith('https://')){status('أضف رابط خدمة الصوت الآمنة أولاً. معاينة صوت الجهاز متاحة دون خادم.');return}const b=$('generateSpeech');b.disabled=true;status('جارٍ طلب الملف الصوتي…');try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:s.speechText,voice:s.ttsVoice,speed:s.speechRate})});if(!r.ok)throw Error('HTTP '+r.status+' '+(await r.text()).slice(0,180));const type=r.headers.get('content-type')||'';if(!type.startsWith('audio/'))throw Error('الخدمة لم تُرجع ملفاً صوتياً');const blob=await r.blob();if(blob.size>30*1024*1024||!blob.size)throw Error('ملف الصوت غير صالح أو كبير جداً');setSceneAudio(blob,id);await fitSceneAudio(blob,id);status('تم توليد الصوت وحفظه للمشهد. الصوت مولّد بالذكاء الاصطناعي.')}catch(e){status('لم يتم توليد الصوت: '+e.message)}finally{b.disabled=false}};
initialize();loadSceneVoices().catch(e=>status('تعذر قراءة ملفات الصوت المحفوظة: '+e.message));
