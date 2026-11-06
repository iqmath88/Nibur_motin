'use strict';
const $=id=>document.getElementById(id);
const NM=window.NM;

const MAX_SCENE_DURATION=120;
const TYPE_STYLES=['none','rounded','rectangle','outline','underline','highlight'];
const ALLOWED_COLORS=['#f4d96c','#cfe7fa','#e3efda','#f7d5e5','#ffffff','#193c5d','#f8e7c8'];
const cleanColor=(v,fallback)=>ALLOWED_COLORS.includes(v)?v:fallback;
const MATH_CACHE_LIMIT=80;
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
const cleanScene=s=>({ ...NM.mathanim.settings(s), ...NM.overlays.scene(s), resultEffect:NM.audiomix.effect(s?.resultEffect),voiceDuration:bounded(s?.voiceDuration,0,120,0), id:String(s?.id||makeSceneId()),speechText:String(s?.speechText??'').slice(0,4000),speechRate:bounded(s?.speechRate,.7,1.3,1),ttsVoice:String(s?.ttsVoice||'marin'),autoDuration:s?.autoDuration!==false,voiceVolume:bounded(s?.voiceVolume,0,1,1),stickers:Array.isArray(s?.stickers)?s.stickers.slice(0,40).map(cleanSticker):[],elements:NM.freeEditor.clean(s?.elements),mathStudio:NM.mathStudio.clean(s?.mathStudio),title:String(s?.title??''),question:String(s?.question??''),equation:String(s?.equation??''),answer:String(s?.answer??''),duration:bounded(s?.duration,1,MAX_SCENE_DURATION,4),titleSize:bounded(s?.titleSize,30,100,57),questionSize:bounded(s?.questionSize,30,90,46),equationScale:bounded(s?.equationScale,60,150,100),answerScale:bounded(s?.answerScale,60,150,100),titleBg:TYPE_STYLES.includes(s?.titleBg)?s.titleBg:'rounded',questionBg:TYPE_STYLES.includes(s?.questionBg)?s.questionBg:'none',answerBg:TYPE_STYLES.includes(s?.answerBg)?s.answerBg:'rounded',titleBgColor:cleanColor(s?.titleBgColor,'#f4d96c'),questionBgColor:cleanColor(s?.questionBgColor,'#cfe7fa'),answerBgColor:cleanColor(s?.answerBgColor,'#e3efda'),titleX:bounded(s?.titleX,12,88,50),questionX:bounded(s?.questionX,12,88,50),equationX:bounded(s?.equationX,12,88,50),answerX:bounded(s?.answerX,12,88,50),titleY:bounded(s?.titleY,17,47,32.5),questionY:bounded(s?.questionY,28,68,44.3),equationY:bounded(s?.equationY,40,79,57.6),answerY:bounded(s?.answerY,55,90,72.1),qAt:bounded(s?.qAt,0,95,20),eAt:bounded(s?.eAt,0,95,45),aAt:bounded(s?.aAt,0,95,70)});
function cleanSticker(s){return {id:String(s?.id||Date.now()+'-'+Math.random()),icon:['❓','❗','💡','✅','✏️','🎯','➡️','⭐','⭕','⚠️'].includes(s?.icon)?s.icon:'❓',x:bounded(s?.x,0,1,.5),y:bounded(s?.y,0,1,.38),size:bounded(s?.size,45,380,140),start:bounded(s?.start,0,95,10),end:bounded(s?.end,5,100,95),animation:['pop','fade','spin','static'].includes(s?.animation)?s.animation:'pop',effect:NM.audiomix.effect(s?.effect)}}
function cleanAudio(a){return {...NM.audiomix.settings(a),offset:bounded(a?.offset,0,30,0),volume:bounded(a?.volume,0,1,1)}}
function cleanProject(x){if(!Array.isArray(x?.scenes)||!x.scenes.length||x.scenes.length>100)throw Error('ملف المشروع غير صالح');return {projectId:String(x.projectId||makeSceneId()),name:String(x.name||'مشروع').slice(0,120),theme:themes.includes(x.theme)?x.theme:'notebook',branding:cleanBranding(x.branding),fonts:NM.fonts.clean(x.fonts),captions:NM.captions.settings(x.captions),overlays:NM.overlays.project(x.overlays),audio:cleanAudio(x.audio),scenes:x.scenes.map(cleanScene)}}
let state={projectId:makeSceneId(),name:'حل معادلة لوغاريتمية',theme:'notebook',branding:cleanBranding(brandingDefaults),fonts:NM.fonts.clean(),captions:NM.captions.settings(),overlays:NM.overlays.project(),audio:cleanAudio(null),scenes:defaults.map(cleanScene)};
try{const saved=JSON.parse(localStorage.getItem('nibor-motion-v1'));if(saved)state=cleanProject(saved)}catch(e){console.warn('تعذر استعادة المشروع',e)}
NM.project=state;let subtitleTimeline=[],audioTimeline=null;const rebuildTimeline=()=>{NM.project=state;subtitleTimeline=NM.captions.schedule(state,id=>voiceBlobs?.has(id));audioTimeline=NM.audiomix.timeline(state,voiceBlobs||new Map());};
let selectedStickerId=null,selectedElement=null,elementGesture=null;let index=0,playing=false,exporting=false,playToken=0,clock=0,mathfieldReady=false,fieldSync=false,renderTicket=0;
const ctx=$('stage').getContext('2d',{alpha:false});const CW=1080,CH=1920;
const mathCache=new Map();let mathReady=false;
const mathKey=(raw,color)=>color+'|'+String(raw||'').trim();
const sceneFormulaKeys=()=>new Set(state.scenes.flatMap(s=>[
 mathKey(s.equation,formulaColor()),mathKey(s.answer,answerFormulaColor(s))
]).filter(k=>k.split('|')[1]));
function trimMathCache(){
 const used=new Set(usedMathPairs().map(([raw,color])=>mathKey(raw,color)));
 for(const [key,entry] of mathCache){
  if(mathCache.size<=MATH_CACHE_LIMIT)break;
  if(!used.has(key)&&!entry.pending)mathCache.delete(key);
 }
}
const formulaColor=()=>['blackboard','dark'].includes(state.theme)?'#f4f7ff':'#173a5c';
const answerFormulaColor=s=>['rounded','rectangle'].includes(s.answerBg)?backdropTextColor(s.answerBg,s.answerBgColor,formulaColor()):formulaColor();
let mathDebounce=null;
function scheduleMathWarm(){clearTimeout(mathDebounce);mathDebounce=setTimeout(()=>{prewarm();trimMathCache()},250)}
const status=msg=>{$('status').textContent=msg};
function save(){NM.project=state;rebuildTimeline();NM.freeEditor.track(state,index);try{localStorage.setItem('nibor-motion-v1',JSON.stringify(state))}catch(e){status('تعذر الحفظ على الجهاز. صدّر المشروع JSON للاحتفاظ بنسخة احتياطية.')}}
function seconds(){return state.scenes.reduce((a,s)=>a+s.duration,0)}
function sceneStart(i){return state.scenes.slice(0,i).reduce((a,s)=>a+s.duration,0)}
function atTime(t){let passed=0;for(let i=0;i<state.scenes.length;i++){let d=state.scenes[i].duration;if(t<passed+d || i===state.scenes.length-1)return {index:i,progress:Math.max(0,Math.min(1,(t-passed)/d))};passed+=d}return {index:0,progress:0}}
function fmt(t){t=Math.max(0,Math.floor(t));return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')}
function setBusy(v){playing=v;$('play').disabled=v;$('export').disabled=v;$('png').disabled=v;$('stop').disabled=!v}
function drawControls(){const s=state.scenes[index];NM.freeEditor.refresh?.();NM.timelineEditor.refresh?.();NM.mathStudio.refresh?.();syncExtraControls();$('scenes').replaceChildren();state.scenes.forEach((scene,i)=>{const el=document.createElement('button');el.type='button';el.className='scene'+(i===index?' active':'');const t=document.createElement('span');t.textContent=`${i+1}. ${scene.title||'مشهد جديد'}`;const d=document.createElement('small');d.textContent=`${scene.duration} ث`;el.append(t,d);el.onclick=()=>{if(playing)return;index=i;selectedElement=null;clock=sceneStart(i)+state.scenes[i].duration;stopSceneAudio();drawControls();render(1)};$('scenes').append(el)});$('timeline').replaceChildren();state.scenes.forEach((s,i)=>{const b=document.createElement('button');b.type='button';b.className=i===index?'active':'';b.textContent=`${i+1} · ${s.duration}ث`;b.style.flexGrow=String(s.duration);b.onclick=()=>{if(playing)return;index=i;selectedElement=null;clock=sceneStart(i)+s.duration;stopSceneAudio();drawControls();render(1)};$('timeline').append(b)});for(const key of ['title','question','equation','answer','duration','qAt','eAt','aAt'])$(key).value=s[key];syncTypographyControls();for(const pair of [['qAt','qOut'],['eAt','eOut'],['aAt','aOut']])$(pair[1]).textContent=s[pair[0]]+'%';$('theme').value=state.theme;$('project').value=state.name;$('counter').textContent=`${index+1} / ${state.scenes.length}`;updateSeek();syncMathField(s.equation);refreshStickers();syncVisualPanel();syncSceneVoiceUI()}
const TYPO_FIELDS=['titleSize','questionSize','equationScale','answerScale','titleY','questionY','equationY','answerY','titleX','questionX','equationX','answerX','titleBg','questionBg','answerBg','titleBgColor','questionBgColor','answerBgColor'];
function syncTypographyControls(){
 const scene=state.scenes[index];
 for(const key of TYPO_FIELDS){const el=$(key);if(!el)continue;el.value=scene[key];const out=$(key+'Out');if(out)out.textContent=scene[key]+(key.endsWith('Y')||key.endsWith('X')||key.endsWith('Scale')?'%':key.endsWith('Size')?'px':'')}
}
function updateTypography(key,value){
 if(playing)return;
 const scene=state.scenes[index];
 if(key.endsWith('Bg'))scene[key]=TYPE_STYLES.includes(value)?value:'none';
 else if(key.endsWith('BgColor'))scene[key]=cleanColor(value,scene[key]);
 else {const ranges={titleSize:[30,100],questionSize:[30,90],equationScale:[60,150],answerScale:[60,150],titleY:[17,47],questionY:[28,68],equationY:[40,79],answerY:[55,90],titleX:[12,88],questionX:[12,88],equationX:[12,88],answerX:[12,88]};const [min,max]=ranges[key];scene[key]=bounded(value,min,max,scene[key]);}
 save();syncTypographyControls();scheduleMathWarm();renderCurrent();
}
for(const key of TYPO_FIELDS){const el=$(key);if(el)el.addEventListener(el.tagName==='SELECT'?'change':'input',e=>updateTypography(key,e.target.value))}
$('resetTypography').onclick=()=>{if(playing)return;const scene=state.scenes[index];const d=cleanScene({});for(const key of TYPO_FIELDS)scene[key]=d[key];save();syncTypographyControls();scheduleMathWarm();renderCurrent();status('تمت استعادة تنسيق النصوص الافتراضي لهذا المشهد')};
function updateSeek(){const total=seconds();$('seek').value=Math.round(1000*clock/Math.max(.01,total));$('time').textContent=`${fmt(clock)} / ${fmt(total)}`}
function syncMathField(value){const field=$('mathfield');if(!mathfieldReady||!field)return;fieldSync=true;try{field.value=value||''}catch(e){console.warn(e)}fieldSync=false}
function redrawAfterEdit(key,val){const s=state.scenes[index];s[key]=(['duration'].includes(key)?bounded(val,1,MAX_SCENE_DURATION,4):['qAt','eAt','aAt'].includes(key)?bounded(val,0,95,20):String(val));save();if(key==='duration'){clock=sceneStart(index)+s.duration;drawControls()}else{if(key==='title'){const label=$('scenes').children[index]?.firstChild;if(label)label.textContent=`${index+1}. ${s.title||'مشهد جديد'}`;}if(key==='equation'&&$('mathfield')?.value!==s.equation)syncMathField(s.equation);if(['qAt','eAt','aAt'].includes(key))$({qAt:'qOut',eAt:'eOut',aAt:'aOut'}[key]).textContent=s[key]+'%';render(1)}if(key==='equation'||key==='answer'||key==='question')scheduleMathWarm();if(key==='speechText')rebuildTimeline();}
for(const key of ['title','question','equation','answer','duration','qAt','eAt','aAt'])$(key).addEventListener('input',e=>{if(playing)return;redrawAfterEdit(key,e.target.value)});
function syncBrandingControls(){const b=state.branding;$('videoHeader').value=b.header;$('videoFooter').value=b.footer;$('showHeader').checked=b.showHeader;$('showFooter').checked=b.showFooter;$('headerSize').value=b.headerSize;$('footerSize').value=b.footerSize;$('headerSizeOut').textContent=b.headerSize+'px';$('footerSizeOut').textContent=b.footerSize+'px'}
for(const [id,key] of [['videoHeader','header'],['videoFooter','footer']])$(id).addEventListener('input',e=>{if(playing)return;state.branding[key]=brandingText(e.target.value,'');save();renderCurrent()});
for(const [id,key] of [['showHeader','showHeader'],['showFooter','showFooter']])$(id).addEventListener('change',e=>{if(playing)return;state.branding[key]=e.target.checked;save();renderCurrent()});
for(const [id,key,out] of [['headerSize','headerSize','headerSizeOut'],['footerSize','footerSize','footerSizeOut']])$(id).addEventListener('input',e=>{if(playing)return;state.branding[key]=bounded(e.target.value,22,80,key==='headerSize'?35:30);$(out).textContent=state.branding[key]+'px';save();renderCurrent()});
$('resetBranding').onclick=()=>{if(playing)return;state.branding=cleanBranding(brandingDefaults);syncBrandingControls();save();renderCurrent();status('تمت استعادة النصوص الافتراضية للرأس والذيل')};
$('project').oninput=e=>{state.name=e.target.value;save()};$('theme').onchange=e=>{state.theme=e.target.value;save();prewarm();render(1)};
$('add').onclick=()=>{if(playing)return;state.scenes.push(cleanScene({title:'مشهد جديد',duration:4}));index=state.scenes.length-1;clock=seconds();save();drawControls();render(1)};
$('remove').onclick=()=>{if(playing)return;if(state.scenes.length===1){status('يجب إبقاء مشهد واحد على الأقل');return}if(!confirm('هل تريد حذف هذا المشهد؟ سيُحذف صوته نهائياً إن وُجد.'))return;const removedId=state.scenes[index].id;voiceBlobs.delete(removedId);deleteSceneAudio(removedId).catch(()=>{});state.scenes.splice(index,1);index=Math.min(index,state.scenes.length-1);clock=sceneStart(index)+state.scenes[index].duration;save();drawControls();render(1)};
$('prev').onclick=()=>{if(playing)return;index=(index-1+state.scenes.length)%state.scenes.length;clock=sceneStart(index)+state.scenes[index].duration;drawControls();render(1)};
$('next').onclick=()=>{if(playing)return;index=(index+1)%state.scenes.length;clock=sceneStart(index)+state.scenes[index].duration;drawControls();render(1)};
$('seek').oninput=e=>{if(playing)return;clock=seconds()*Number(e.target.value)/1000;const at=atTime(clock);if(index!==at.index){index=at.index;drawControls()}render(at.progress)};
$('save').onclick=()=>{save();status('تم حفظ المشروع في هذا المتصفح (الصوت محفوظ محلياً منفصلاً عن JSON)')};
function safeFileName(){return (state.name||'nibor-motion').replace(/[\\/:*?"<>|\x00-\x1f]/g,'-').replace(/[. ]+$/g,'').trim().slice(0,90)||'nibor-motion'}
function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
$('json').onclick=()=>download(new Blob([JSON.stringify({...state,version:APP_VERSION},null,2)],{type:'application/json'}),`${safeFileName()}-v${APP_VERSION}.json`);
$('import').onclick=()=>$('file').click();$('file').onchange=async e=>{try{if(!e.target.files[0])return;if(!confirm('استيراد ملف JSON سيستبدل المشروع الحالي. هل تريد المتابعة؟'))return;const x=JSON.parse(await e.target.files[0].text());stopSceneAudio();state=cleanProject(x);voiceBlobs.clear();voiceLoadPromise=loadSceneVoices().catch(e=>{status('تعذر تحميل الأصوات: '+e.message)});musicLoadPromise=loadMusic().catch(e=>status('تعذّر تحميل موسيقى المشروع: '+e.message));index=0;clock=state.scenes[0].duration;selectedStickerId=null;save();drawControls();syncBrandingControls();render(1);prewarm();status('تم استيراد المشروع. ملفات الصوت لا تتضمنها نسخة JSON؛ يلزم إعادة ربطها عند نقل المشروع.')}catch(err){status('فشل الاستيراد: '+err.message)}finally{e.target.value=''}};
function initMathEditor(){const field=$('mathfield');if(!customElements.get('math-field')){$('mathHost').hidden=true;status('المحرر المرئي غير متاح حالياً؛ يمكنك استخدام إدخال LaTeX النصي.');return}mathfieldReady=true;try{field.mathVirtualKeyboardPolicy='auto';field.smartMode=true;field.value=state.scenes[index].equation;field.addEventListener('input',()=>{if(fieldSync||playing)return;fieldSync=true;const v=field.value;$('equation').value=v;fieldSync=false;redrawAfterEdit('equation',v)})}catch(e){console.warn(e)}}
if(customElements.get('math-field'))initMathEditor();else Promise.race([customElements.whenDefined('math-field'),waitForMathEditorTimeout()]).then(()=>{if(customElements.get('math-field'))initMathEditor();else {$('mathHost').hidden=true;status('المحرر المرئي غير متاح؛ استخدم حقل LaTeX النصي.')}}).catch(()=>{});
function waitForMathEditorTimeout(){return new Promise(resolve=>setTimeout(resolve,7000))}
document.querySelectorAll('[data-math]').forEach(btn=>btn.addEventListener('click',()=>{if(playing)return;const field=$('mathfield');if(mathfieldReady){field.executeCommand(['insert',btn.dataset.math,{selectionMode:'placeholder'}]);field.focus()}else{const el=$('equation');el.setRangeText(btn.dataset.math.replaceAll('#0','x').replaceAll('#?','y'),el.selectionStart,el.selectionEnd,'end');el.dispatchEvent(new Event('input'));el.focus()}}));
// Inline math insertion: MathLive virtual keyboard when present; LaTeX fallback otherwise.
(function initQuestionMath(){
 const field=$('questionMathfield'),source=$('questionMathCode'),question=$('question');
 const activateMathField=()=>{field.hidden=false;field.mathVirtualKeyboardPolicy='auto';field.smartMode=true;field.addEventListener('input',()=>source.value=field.value);source.addEventListener('input',()=>{if(field.value!==source.value)field.value=source.value})};
 if(customElements.get('math-field'))activateMathField();
 else{field.hidden=true;customElements.whenDefined('math-field').then(activateMathField).catch(()=>{});}
 $('questionInsertMath').addEventListener('click',()=>{
  if(playing)return;
  const latex=(customElements.get('math-field')?field.value:source.value).trim();
  if(!latex){status('اكتب المعادلة أولاً ثم اضغط إدراج في السؤال.');return}
  const from=question.selectionStart??question.value.length,to=question.selectionEnd??from;
  const value='\\('+latex+'\\)';
  question.setRangeText(value,from,to,'end');question.dispatchEvent(new Event('input',{bubbles:true}));
  question.focus();status('أُدرجت المعادلة داخل السؤال. ستظهر منسقة في المعاينة والتصدير.');
 });
 document.querySelectorAll('[data-question-math]').forEach(button=>button.addEventListener('click',()=>{
  const value=button.dataset.questionMath;
  if(customElements.get('math-field')){field.executeCommand(['insert',value]);source.value=field.value;field.focus()}
  else{source.setRangeText(value,source.selectionStart,source.selectionEnd,'end');source.focus()}
 }));
})();
// Mathematical formulas are converted to standalone SVG bitmaps and used by the exact same Canvas compositor for preview and video.
function likelyMath(s){return /\\[a-zA-Z]+|\^|_|[{}]/.test(s)||/[=+×÷]/.test(s)}
function mathSVG(latex,color){
 latex=NM.mathanim.marked(latex,'#f4d96c');
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
 copy.setAttribute('style',`color:${color};fill:${color}`);
 copy.setAttribute('color',color);copy.setAttribute('fill',color);
 const source=new XMLSerializer().serializeToString(copy);
 if(!source.includes('<path')&&!source.includes('<use')&&!source.includes('<g'))throw Error('المعادلة لا تحتوي رسماً صالحاً');
 return source;
}
async function warmMath(raw,color=formulaColor()){
 raw=String(raw||'').trim();if(!raw)return;
 const key=mathKey(raw,color),old=mathCache.get(key);
 if(old){mathCache.delete(key);mathCache.set(key,old);if(old.ready||old.pending)return old.pending;}
 const entry={ready:false,img:null,error:null,pending:null};mathCache.set(key,entry);
 trimMathCache();
 entry.pending=(async()=>{try{
  if(!window.MathJax?.startup?.promise)throw Error('مكتبة MathJax لم تُحمّل؛ تحقق من الإنترنت');
  await window.MathJax.startup.promise;
  if(!window.MathJax.tex2svg)throw Error('محرك MathJax SVG غير متاح');
  const svg=mathSVG(raw,color),uri='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('تعذر فتح صورة المعادلة على المتصفح'));img.src=uri});
  if(img.naturalWidth<1||img.naturalHeight<1)throw Error('صورة المعادلة فارغة');
  entry.img=img;entry.ready=true;entry.error=null;
 }catch(e){entry.error=e.message||String(e);entry.ready=false;}
 finally{entry.pending=null;trimMathCache();renderCurrent();updateMathStatus();}})();
 return entry.pending;
}
// Mixed Arabic + inline LaTeX in the question. Delimiters: \( ... \) or $ ... $.
function questionParts(value){
 const raw=String(value||'');const result=[];
 const rex=/\\\(([\s\S]*?)\\\)|\$([^$\n]+)\$/g;let pos=0,m;
 while((m=rex.exec(raw))!==null){
  if(m.index>pos)result.push({type:'text',value:raw.slice(pos,m.index)});
  result.push({type:'math',value:(m[1]??m[2]).trim()});pos=rex.lastIndex;
 }
 if(pos<raw.length)result.push({type:'text',value:raw.slice(pos)});
 return result;
}
function inlineQuestionPairs(scene){
 const color=backdropTextColor(scene.questionBg,scene.questionBgColor,formulaColor());
 return questionParts(scene.question).filter(p=>p.type==='math'&&p.value).map(p=>[p.value,color]);
}
function usedMathPairs(){return state.scenes.flatMap((s,i)=>[...inlineQuestionPairs(s),...NM.mathStudio.mathPairs(s,formulaColor()),...NM.freeEditor.mathPairs(s),...NM.mathanim.variants(s,formulaColor(),state.captions.highlight),...(s.equationAnim==='fromPrevious'&&i>0?[[NM.mathanim.plain(state.scenes[i-1].equation),formulaColor()]]:[]),[s.answer,answerFormulaColor(s)]]).filter(([v])=>String(v||'').trim())}
function updateMathStatus(){
 const failed=usedMathPairs().find(([raw,color])=>mathCache.get(mathKey(raw,color))?.error);
 if(failed){const entry=mathCache.get(mathKey(...failed));$('mathWarning').hidden=false;$('mathWarning').textContent='تنبيه: توجد معادلة لم تُرسم بشكل صحيح: '+failed[0]+' — '+entry.error+'؛ صحح LaTeX قبل التصدير.';}
 else $('mathWarning').hidden=true;
}
function prewarm(){const pending=usedMathPairs().map(([raw,color])=>warmMath(raw,color));trimMathCache();return Promise.all(pending)}
function renderCurrent(){if(!playing){const at=atTime(clock);render(at.index===index?at.progress:1,{guides:true})}}
// Word wrapping respects manual newlines, RTL direction, and line count limits.
function measureTextBlock(ctx,str,maxWidth,size,weight=650,maxLines=2,minFont=24,maxHeight=Infinity){
 ctx.save();
 const paragraphs=String(str||'').split('\n');
 function wrap(fontSize){
  ctx.font=NM.font(weight>=700?'heading':'body',weight,fontSize);
  const result=[];
  for(const paragraph of paragraphs){
   if(!paragraph.trim()){result.push('');continue}
   let line='';
   for(const word of paragraph.trim().split(/\s+/)){
    const next=line?line+' '+word:word;
    if(line&&ctx.measureText(next).width>maxWidth){result.push(line);line=''}
    if(ctx.measureText(word).width>maxWidth){
     for(const letter of word){if(line&&ctx.measureText(line+letter).width>maxWidth){result.push(line);line=''}line+=letter}
    }else line=line?line+' '+word:word;
   }
   result.push(line);
  }
  return result;
 }
 let actual=size,rows=wrap(actual);
 while((rows.length>maxLines||rows.length*actual*1.18>maxHeight)&&actual>minFont){actual=Math.max(minFont,actual-1);rows=wrap(actual)}
 if(rows.length>maxLines){rows=rows.slice(0,maxLines);let last=rows[maxLines-1];while(last&&ctx.measureText(last+'…').width>maxWidth)last=last.slice(0,-1);rows[maxLines-1]=last+'…'}
 ctx.restore();return {rows,size:actual,lineHeight:actual*1.18,height:rows.length*actual*1.18};
}
function text(ctx,str,x,y,maxWidth,size,color,weight=650,dir='rtl',maxLines=2,minFont=24,maxHeight=Infinity){
 const layout=measureTextBlock(ctx,str,maxWidth,size,weight,maxLines,minFont,maxHeight);
 ctx.save();ctx.fillStyle=color;ctx.direction=dir;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=NM.font(weight>=700?'heading':'body',weight,layout.size);
 let yy=y-(layout.rows.length-1)*layout.lineHeight/2;
 for(const line of layout.rows){ctx.fillText(line,x,yy);yy+=layout.lineHeight}
 ctx.restore();return layout;
}

// Shared Canvas renderer for the question: inline SVG equations and natural Arabic text.
// It is used for preview, PNG and video; no DOM overlay can be lost during export.
function mixedQuestionLayout(c,raw,maxW,size,color,draw=false,cx=0,cy=0){
 const tokens=[];
 for(const piece of questionParts(raw)){
  if(piece.type==='math'){
   const entry=mathCache.get(mathKey(piece.value,color));
   const ratio=entry?.ready&&entry.img?entry.img.naturalWidth/entry.img.naturalHeight:2.1;
   const mh=size*1.2,mw=Math.min(maxW*.78,mh*ratio);
   tokens.push({type:'math',entry,value:piece.value,w:mw,h:mh});
  }else{
   const chunks=piece.value.split(/(\n|\s+)/);
   c.save();c.font=NM.font('body',600,size);
   for(const chunk of chunks){
    if(!chunk)continue;
    if(chunk==='\n')tokens.push({type:'break'});
    else if(/^\s+$/.test(chunk))tokens.push({type:'space',w:c.measureText(' ').width,h:size});
    else tokens.push({type:'text',value:chunk,w:c.measureText(chunk).width,h:size});
   }
   c.restore();
  }
 }
 const rows=[{parts:[],w:0,h:size*1.3}];
 for(const token of tokens){
  let line=rows[rows.length-1];
  if(token.type==='break'){rows.push({parts:[],w:0,h:size*1.3});continue}
  if(token.type==='space'&&!line.parts.length)continue;
  if(line.parts.length && line.w+token.w>maxW && token.type!=='space'){
   rows.push({parts:[],w:0,h:size*1.3});line=rows[rows.length-1];
  }
  if(token.type==='space'&&!line.parts.length)continue;
  line.parts.push(token);line.w+=token.w;line.h=Math.max(line.h,token.h*1.35);
 }
 const visible=rows.slice(0,4);const height=visible.reduce((n,line)=>n+line.h,0);
 if(draw){
  c.save();c.fillStyle=color;c.font=NM.font('body',600,size);c.textBaseline='middle';c.direction='rtl';c.textAlign='right';
  let top=cy-height/2;
  for(const line of visible){
   let cursor=cx+line.w/2;const center=top+line.h/2;
   for(const token of line.parts){
    if(token.type==='math'){
     if(token.entry?.ready&&token.entry.img)c.drawImage(token.entry.img,cursor-token.w,center-token.h/2,token.w,token.h);
     else {c.save();c.strokeStyle='#af4430';c.strokeRect(cursor-token.w,center-token.h/2,token.w,token.h);c.fillText('⚠',cursor-3,center);c.restore()}
    }else if(token.type==='text')c.fillText(token.value,cursor,center);
    cursor-=token.w;
   }
   top+=line.h;
  }
  c.restore();
 }
 return {height,rows:visible.length};
}
function drawMixedQuestion(c,scene,x,y,maxWidth,color){
 const content=String(scene.question||'');
 const containsMath=questionParts(content).some(p=>p.type==='math');
 if(!containsMath){
  const layout=measureTextBlock(c,content,maxWidth,scene.questionSize,600,4,30,420);
  drawTextBackdrop(c,scene.questionBg,x,y,900,Math.max(110,layout.height+42),scene.questionBgColor);
  text(c,content,x,y,maxWidth,scene.questionSize,color,600,'rtl',4,30,420);return;
 }
 let size=scene.questionSize,layout=mixedQuestionLayout(c,content,maxWidth,size,color);
 while((layout.height>420||layout.rows>4)&&size>30){size-=2;layout=mixedQuestionLayout(c,content,maxWidth,size,color)}
 drawTextBackdrop(c,scene.questionBg,x,y,900,Math.max(110,layout.height+42),scene.questionBgColor);
 mixedQuestionLayout(c,content,maxWidth,size,color,true,x,y);
}
function math(ctx,raw,cx,cy,maxW,maxH,color){
 raw=String(raw||'').trim();if(!raw)return;
 const entry=mathCache.get(mathKey(raw,color));
 if(entry?.ready&&entry.img){
  const img=entry.img,scale=Math.min(maxW/img.naturalWidth,maxH/img.naturalHeight);
  const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
  if(w>0&&h>0&&Number.isFinite(w)&&Number.isFinite(h)){
   ctx.save();ctx.drawImage(img,cx-w/2,cy-h/2,w,h);ctx.restore();return;
  }
 }
 ctx.save();ctx.fillStyle='rgba(191,67,48,0.1)';ctx.fillRect(cx-maxW*.48,cy-45,maxW*.96,90);
 text(ctx,entry?.error?'⚠ صياغة المعادلة تحتاج تصحيحاً':'جارٍ تجهيز المعادلة…',cx,cy,maxW*.9,27,'#af4430',550);ctx.restore();
}
function drawTextBackdrop(c,shape,x,y,w,h,color){
 if(shape==='none')return;
 c.save();c.lineWidth=5;c.strokeStyle=color;c.fillStyle=color;
 if(shape==='underline'){c.beginPath();c.roundRect(x-w/2,y+h/2-12,w,12,6);c.fill();}
 else if(shape==='highlight'){c.globalAlpha*=.55;c.fillRect(x-w/2,y-h*.12,w,h*.54);}
 else {c.beginPath();c.roundRect(x-w/2,y-h/2,w,h,shape==='rounded'?Math.min(40,h/3):shape==='rectangle'?2:18);if(shape==='outline')c.stroke();else c.fill()}
 c.restore();
}
function backdropTextColor(shape,bg,defaultColor){
 if(shape==='none'||shape==='underline'||shape==='outline'||shape==='highlight')return defaultColor;
 return ['#193c5d'].includes(bg)?'#ffffff':'#173a5c';
}
function fade(ctx,p,start,fn){const fadeTime=.09;const alpha=Math.max(0,Math.min(1,(p-start)/fadeTime));if(alpha<=0)return;ctx.save();ctx.globalAlpha*=alpha;fn();ctx.restore()}
// Contextual visual editor uses the same coordinates as the export canvas.
const ELEMENT_KEYS={title:['titleX','titleY','titleSize'],question:['questionX','questionY','questionSize'],equation:['equationX','equationY','equationScale'],answer:['answerX','answerY','answerScale']};
const ELEMENT_LABELS={title:'العنوان',question:'السؤال',equation:'المعادلة',answer:'النتيجة',sticker:'الملصق'};
function elementBounds(kind,scene){
 if(kind==='sticker'){
  const st=currentSticker();return st?{cx:st.x*CW,cy:st.y*CH,w:st.size*1.5,h:st.size*1.5}:null;
 }
 if(!scene[kind])return null;
 const x=CW*scene[kind+'X']/100,y=CH*scene[kind+'Y']/100;
 const width=kind==='title'?890:kind==='question'?900:kind==='equation'?865*scene.equationScale/100:830*scene.answerScale/100;
 const height=kind==='title'?Math.max(145,scene.titleSize*2.6):kind==='question'?Math.max(125,scene.questionSize*5):kind==='equation'?175*scene.equationScale/100:190*scene.answerScale/100;
 return {cx:x,cy:y,w:Math.min(960,width),h:height};
}
function selectionBox(c,scene){
 if(!selectedElement||playing||exporting)return;
 const b=elementBounds(selectedElement,scene);if(!b)return;
 c.save();c.strokeStyle='#3189f5';c.lineWidth=5;c.setLineDash([16,9]);
 c.strokeRect(b.cx-b.w/2,b.cy-b.h/2,b.w,b.h);c.setLineDash([]);
 const hx=b.cx+b.w/2,hy=b.cy+b.h/2;
 c.fillStyle='#fff';c.strokeStyle='#246bb8';c.lineWidth=6;c.beginPath();c.arc(hx,hy,22,0,Math.PI*2);c.fill();c.stroke();c.restore();
}
function selectVisualElement(type){selectedElement=type;selectedStickerId=type==='sticker'?selectedStickerId:null;syncVisualPanel();renderCurrent()}
function syncVisualPanel(){
 const panel=$('visualEditor');if(!panel)return;
 const scene=state.scenes[index];const b=selectedElement&&elementBounds(selectedElement,scene);
 panel.hidden=!b;if(!b)return;
 $('visualName').textContent='العنصر المحدد: '+ELEMENT_LABELS[selectedElement];
 const st=selectedElement==='sticker'?currentSticker():null;
 const value=st?st.size:scene[ELEMENT_KEYS[selectedElement][2]];
 const limits=selectedElement==='sticker'?[45,380]:selectedElement==='title'?[30,100]:selectedElement==='question'?[30,90]:[60,150];
 $('visualSize').min=limits[0];$('visualSize').max=limits[1];$('visualSize').value=value;
 $('visualSizeOut').textContent=value+(selectedElement==='sticker'||['title','question'].includes(selectedElement)?'px':'%');
 $('visualDelete').hidden=selectedElement!=='sticker';
}
function visualResize(value){if(!selectedElement||playing)return;const scene=state.scenes[index];
 if(selectedElement==='sticker'){const st=currentSticker();if(!st)return;st.size=bounded(value,45,380,st.size);refreshStickers();}
 else {const key=ELEMENT_KEYS[selectedElement][2];const limits=selectedElement==='title'?[30,100]:selectedElement==='question'?[30,90]:[60,150];scene[key]=bounded(value,...limits,scene[key]);syncTypographyControls();}
 save();syncVisualPanel();renderCurrent();}
function render(p=1,options={guides:!exporting}){
 const scene=state.scenes[index],w=CW,h=CH,theme=state.theme;
 const fg=theme==='dark'||theme==='blackboard'?'#f4f7ff':'#173a5c';
 ctx.save();ctx.setTransform(1,0,0,1,0,0);
 ctx.fillStyle=theme==='blackboard'?'#143d34':theme==='dark'?'#17253a':theme==='clean'?'#ffffff':'#faf6ea';ctx.fillRect(0,0,w,h);
 if(theme==='notebook'){ctx.strokeStyle='#dadfdd';ctx.lineWidth=2;for(let y=62;y<h;y+=74){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}}
 const absoluteTime=sceneStart(index)+state.scenes[index].duration*Math.max(0,Math.min(1,p));
 const isHook=NM.overlays.hook(ctx,scene,p,theme,text);
 if(!isHook&&state.branding.showHeader&&state.branding.header)text(ctx,state.branding.header,540,145,860,state.branding.headerSize,fg,500,/[\u0600-\u06ff]/.test(state.branding.header)?'rtl':'ltr');
 const titleY=h*scene.titleY/100,questionY=h*scene.questionY/100,equationY=h*scene.equationY/100,answerY=h*scene.answerY/100;
 if(!isHook)fade(ctx,p,0,()=>{
  const titleLayout=measureTextBlock(ctx,scene.title,820,scene.titleSize,800,2,30,150);
  drawTextBackdrop(ctx,scene.titleBg,CW*scene.titleX/100,titleY,890,Math.max(145,titleLayout.height+20),scene.titleBgColor);
  text(ctx,scene.title,CW*scene.titleX/100,titleY,820,scene.titleSize,backdropTextColor(scene.titleBg,scene.titleBgColor,fg),800,'rtl',2,30,150);
 });
 if(!isHook)fade(ctx,p,scene.qAt/100,()=>{
  drawMixedQuestion(ctx,scene,CW*scene.questionX/100,questionY,830,backdropTextColor(scene.questionBg,scene.questionBgColor,fg));
 });
 if(!isHook)NM.mathanim.draw(ctx,scene,p,index>0?state.scenes[index-1]:null,(tex,color)=>math(ctx,tex,CW*scene.equationX/100,equationY,865*scene.equationScale/100,175*scene.equationScale/100,color),fg,state.captions.highlight);
 if(!isHook&&scene.answer)fade(ctx,p,scene.aAt/100,()=>{
  drawTextBackdrop(ctx,scene.answerBg,CW*scene.answerX/100,answerY,830,Math.max(190,190*scene.answerScale/100),scene.answerBgColor);
  math(ctx,scene.answer,CW*scene.answerX/100,answerY,775*scene.answerScale/100,150*scene.answerScale/100,answerFormulaColor(scene));
 });
 if(!isHook&&state.branding.showFooter&&state.branding.footer)text(ctx,state.branding.footer,540,1795,860,state.branding.footerSize,fg,400,/[\u0600-\u06ff]/.test(state.branding.footer)?'rtl':'ltr');
 NM.overlays.progress(ctx,state.overlays,absoluteTime,seconds());
 NM.captions.draw(ctx,state,subtitleTimeline,absoluteTime);
 NM.mathStudio.draw(ctx,scene,p,fg,(raw,x,y,w,h,color)=>math(ctx,raw,x,y,w,h,color));drawStickers(ctx,scene,p);NM.freeEditor.draw(ctx,scene,p,{math:(raw,x,y,w,h,color)=>math(ctx,raw,x,y,w,h,color),font:(role,weight,size)=>NM.font(role,weight,size),text});
 if(options.guides){selectionBox(ctx,scene);NM.freeEditor.guides(ctx,scene);NM.mathStudio.guides(ctx,scene);NM.overlays.guide(ctx,state.overlays.safeGuide);const cap=NM.captions.select(subtitleTimeline,absoluteTime);if(cap&&NM.overlays.intersects({x:60,y:1920*state.captions.y/100-75,w:960,h:150},state.overlays.safeGuide))status('تنبيه: الترجمة تدخل المنطقة المغطاة في المنصة؛ غيّر موضعها');if(NM.overlays.intersects({x:100,y:equationY-100,w:880,h:200},state.overlays.safeGuide))status('تنبيه: المعادلة قد تدخل المنطقة المغطاة في المنصة')}
 ctx.restore();updateSeek();NM.timelineEditor.position?.();
}

const wait=ms=>new Promise(res=>setTimeout(res,ms));
async function runPlayback(){if(playing)return;setBusy(true);const token=++playToken;clock=0;let previous=-1;try{await startPreviewMix();}catch(e){status('تعذّر تشغيل المؤثرات: '+e.message)}if(token!==playToken){stopPreviewMix();setBusy(false);return}const start=performance.now();try{while(token===playToken&&clock<seconds()){clock=Math.min(seconds(),(performance.now()-start)/1000);const at=atTime(Math.min(clock,seconds()-.001));if(at.index!==previous){stopSceneAudio();previous=at.index;index=at.index;drawControls();/* voice scheduled by audiomix */}render(at.progress,{guides:true});await wait(33)}if(token===playToken){clock=seconds();index=state.scenes.length-1;drawControls();render(1)}}finally{stopSceneAudio();stopPreviewMix();setBusy(false)}}
$('play').onclick=runPlayback;$('stop').onclick=()=>{playToken++;stopSceneAudio();stopPreviewMix();if(exporting){status('جارٍ إلغاء التصدير…');return}setBusy(false);status('تم إيقاف التشغيل')};
$('png').onclick=async()=>{await NM.fonts.ready(status);const at=atTime(clock);render(at.index===index?at.progress:1,{guides:false});$('stage').toBlob(blob=>{if(blob)download(blob,`${safeFileName()}-v${APP_VERSION}-scene.png`);else status('فشل إنشاء صورة PNG');renderCurrent()},'image/png')};
async function exportVideo(){
 if(playing)return;
 setBusy(true);exporting=true;
 const token=++playToken;
 const canvas=$('stage'),chunks=[],sources=[];
 let rec=null,ac=null,stream=null,videoStream=null,complete=null,cancelled=false,failed=false,recordingStarted=false,preparedAudio=null,audioDestination=null;
 try{
  if(window.AudioContext||window.webkitAudioContext){ac=new (window.AudioContext||window.webkitAudioContext)();ac.resume().catch(()=>{});}
  await voiceLoadPromise;await NM.fonts.ready(status);await musicLoadPromise;
  if(token!==playToken){cancelled=true;return}
  const missingVoices=state.scenes.map((scene,i)=>({scene,i})).filter(x=>x.scene.speechText.trim()&&!voiceBlobs.has(x.scene.id));
  if(missingVoices.length){const ids=missingVoices.map(x=>x.i+1).join('، ');throw Error('لا يوجد صوت محفوظ للمشاهد: '+ids+'. الاستماع التجريبي لا يُضاف إلى الفيديو.')}
  if(!canvas.captureStream||!window.MediaRecorder)throw Error('تسجيل Canvas غير مدعوم في هذا المتصفح');
  const formats=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm'];
  const mime=formats.find(v=>MediaRecorder.isTypeSupported(v));if(!mime)throw Error('لا توجد صيغة فيديو مدعومة');
  const pending=usedMathPairs().map(([raw,color])=>warmMath(raw,color));
  await Promise.race([Promise.all(pending),wait(12000)]);
  if(token!==playToken){cancelled=true;return}
  const missing=usedMathPairs().filter(([raw,color])=>!mathCache.get(mathKey(raw,color))?.ready);
  if(missing.length)throw Error('تعذر تجهيز بعض المعادلات، عالجها قبل التصدير');
  videoStream=canvas.captureStream(30);stream=videoStream;
  const voiceEntries=state.scenes.map((s,i)=>({s,i,blob:voiceBlobs.get(s.id)})).filter(x=>x.blob);
  const hasGeneratedAudio=voiceEntries.length||musicBlob||NM.audiomix.timeline(state,voiceBlobs).events.length;
  let mixed=null;
  if(hasGeneratedAudio){
   if(!ac)throw Error('Web Audio غير مدعوم على هذا الجهاز');const dest=ac.createMediaStreamDestination();
   preparedAudio=await NM.audiomix.prepare(ac,state,voiceBlobs,musicBlob);audioDestination=dest;
   if(token!==playToken){cancelled=true;return}
   await ac.resume();stream=new MediaStream([...videoStream.getVideoTracks(),...dest.stream.getAudioTracks()]);
   // The sources are started only after MediaRecorder begins, avoiding early audio.
  }
  rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8000000});
  rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
  complete=new Promise((resolve,reject)=>{rec.onstop=resolve;rec.onerror=e=>reject(e.error||Error('خطأ في تسجيل الفيديو'))});
  index=0;clock=0;rec.start(1000);recordingStarted=true;render(0);
  const startTime=performance.now();
  if(preparedAudio){const m=NM.audiomix.startPrepared(ac,audioDestination,state,preparedAudio,ac.currentTime+.07);for(const src of m.sources)sources.push({src});}
  const total=seconds();status('جارٍ تصدير الفيديو مع صوت كل مشهد حسب توقيته…');
  while(token===playToken&&(performance.now()-startTime)/1000<total){clock=Math.min(total,(performance.now()-startTime)/1000);const at=atTime(Math.min(clock,total-.001));if(index!==at.index){index=at.index;drawControls()}render(at.progress);await wait(30)}
  if(token!==playToken){cancelled=true;return}
  clock=total;index=state.scenes.length-1;drawControls();render(1);await wait(170);
  if(token!==playToken){cancelled=true;return}
  rec.stop();await complete;
  if(token!==playToken){cancelled=true;return}
  if(!chunks.length)throw Error('لم ينتج المتصفح ملف فيديو صالحاً');
  const ext=mime.startsWith('video/mp4')?'mp4':'webm';
  download(new Blob(chunks,{type:mime}),`${safeFileName()}-v${APP_VERSION}.${ext}`);
  status(`تم إنشاء ${ext.toUpperCase()} مع ${voiceEntries.length} تعليق صوتي. تحقق من الدقة الفعلية وتزامن الصوت على iPad.`);
 }catch(err){failed=true;if(token!==playToken){cancelled=true}else status('تعذر التصدير: '+err.message)}
 finally{
  cancelled=cancelled||token!==playToken;
  if(rec&&rec.state!=='inactive'){try{rec.stop()}catch(e){}}
  if(complete&&recordingStarted){try{await complete}catch(e){if(!cancelled&&!failed)status('تعذر إنهاء التسجيل: '+e.message)}}
  sources.forEach(a=>{try{a.src.stop()}catch(e){}});
  stream?.getTracks().forEach(t=>t.stop());videoStream?.getTracks().forEach(t=>t.stop());
  if(ac)await ac.close().catch(()=>{});
  exporting=false;setBusy(false);
  if(cancelled)status('تم إلغاء التصدير');
 }
}
$('export').onclick=exportVideo;
async function initialize(){await NM.fonts.ready(status);save();index=0;clock=state.scenes[0].duration;drawControls();syncBrandingControls();render(1);prewarm();updateMathStatus();if(!window.MathJax)status('الرياضيات حالياً بنص احتياطي. يتطلب إخراج المعادلات الاتصال بالإنترنت.');}
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

// Stickers and drag interactions, coordinates normalized to the 1080x1920 master canvas.
function currentSticker(){return state.scenes[index].stickers?.find(s=>s.id===selectedStickerId)}
function refreshStickers(){const el=$('stickerSelect');if(!el)return;el.replaceChildren();const none=document.createElement('option');none.value='';none.textContent='اختر ملصقاً';el.append(none);for(const s of state.scenes[index].stickers||[]){let opt=document.createElement('option');opt.value=s.id;opt.textContent=s.icon+' '+Math.round(s.x*100)+'% / '+Math.round(s.y*100)+'%';el.append(opt)}if(!currentSticker())selectedStickerId=null;el.value=selectedStickerId||'';const s=currentSticker();for(const k of ['Size','Start','End']){const id='sticker'+k;$(id).disabled=!s;$(id).value=s?s[k.toLowerCase()]:({Size:140,Start:10,End:95}[k]);$(id+'Out').textContent=$(id).value+(k==='Size'?'px':'%')}$('stickerEffect').disabled=!s;$('stickerEffect').value=s?.effect||'none';$('stickerAnimation').disabled=!s;$('stickerAnimation').value=s?.animation||'pop';$('removeSticker').disabled=!s;const quick=$('deleteSelectedSticker');if(quick){quick.disabled=!s;quick.textContent=s?'حذف الملصق المحدد '+s.icon:'حذف الملصق المحدد'}}
function mutateSticker(key,v){const s=currentSticker();if(!s||playing)return;s[key]=['size','start','end'].includes(key)?Number(v):v;if(s.start>=s.end){if(key==='start')s.end=Math.min(100,s.start+5);else s.start=Math.max(0,s.end-5)}save();refreshStickers();renderCurrent()}
for(const b of document.querySelectorAll('[data-sticker]'))b.onclick=()=>{if(playing)return;const s=cleanSticker({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),icon:b.dataset.sticker,x:.5,y:.37,start:0,end:100,size:145});state.scenes[index].stickers.push(s);selectedStickerId=s.id;selectedElement='sticker';save();refreshStickers();syncVisualPanel();renderCurrent();status('أضف الملصق واسحبه داخل المعاينة')};
$('deleteSelectedSticker').onclick=()=>$('removeSticker').click();
$('stickerSelect').onchange=e=>{selectedStickerId=e.target.value||null;selectedElement=selectedStickerId?'sticker':null;refreshStickers();syncVisualPanel();renderCurrent()};$('removeSticker').onclick=()=>{if(!currentSticker())return;if(!confirm('هل تريد حذف هذا الملصق؟'))return;state.scenes[index].stickers=state.scenes[index].stickers.filter(s=>s.id!==selectedStickerId);selectedStickerId=null;selectedElement=null;save();refreshStickers();syncVisualPanel();renderCurrent()};
for(const [id,key] of [['stickerSize','size'],['stickerStart','start'],['stickerEnd','end'],['stickerAnimation','animation'],['stickerEffect','effect']])$(id).addEventListener(['stickerAnimation','stickerEffect'].includes(id)?'change':'input',e=>mutateSticker(key,e.target.value));
function drawStickers(c,scene,p){for(const s of scene.stickers||[]){const start=s.start/100,end=s.end/100;if(p<start||p>end)continue;const fade=Math.min(1,Math.max(0,(p-start)/.1),end>=1?1:Math.max(0,(end-p)/.08));const x=s.x*CW,y=s.y*CH;c.save();c.globalAlpha*=s.animation==='static'?1:Math.max(0,fade);c.translate(x,y);const t=Math.min(1,Math.max(0,(p-start)/.15));if(s.animation==='pop')c.scale(.45+.55*(1-Math.pow(1-t,3)),.45+.55*(1-Math.pow(1-t,3)));if(s.animation==='spin')c.rotate((1-t)*-.55);c.textAlign='center';c.textBaseline='middle';c.font=`${s.size}px 'Apple Color Emoji','Segoe UI Emoji',system-ui`;c.fillText(s.icon,0,0);c.restore()}}
let dragSticker=null;
function stageCoords(e){const r=$('stage').getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))}}
function visualHit(p){
 const s=state.scenes[index],x=p.x*CW,y=p.y*CH;
 const stickers=[...(s.stickers||[])].reverse();
 const st=stickers.find(item=>Math.abs(item.x*CW-x)<item.size*.75&&Math.abs(item.y*CH-y)<item.size*.75);
 if(st)return {kind:'sticker',st};
 for(const kind of ['answer','equation','question','title']){
  const b=elementBounds(kind,s);if(b&&Math.abs(x-b.cx)<=b.w/2&&Math.abs(y-b.cy)<=b.h/2)return {kind};
 }
 return null;
}
$('stage').addEventListener('pointerdown',e=>{
 if(playing)return;
 if(NM.mathStudio.pointerDown(e))return;
 if(NM.freeEditor.pointerDown(e,{state,index,stage:$('stage'),playing,save,renderCurrent}))return;
 const p=stageCoords(e),px=p.x*CW,py=p.y*CH;
 const old=selectedElement&&elementBounds(selectedElement,state.scenes[index]);
 const resize=!!old&&Math.hypot(px-(old.cx+old.w/2),py-(old.cy+old.h/2))<65;
 const hit=resize?{kind:selectedElement,st:currentSticker()}:visualHit(p);
 if(!hit){selectedElement=null;selectedStickerId=null;syncVisualPanel();renderCurrent();return}
 selectedElement=hit.kind;
 if(hit.kind==='sticker')selectedStickerId=hit.st?.id||selectedStickerId;
 const bounds=elementBounds(hit.kind,state.scenes[index]);
 elementGesture={pointerId:e.pointerId,kind:hit.kind,mode:resize?'resize':'move',startX:px,startY:py,originalX:bounds.cx,originalY:bounds.cy,originalSize:hit.kind==='sticker'?currentSticker()?.size:state.scenes[index][ELEMENT_KEYS[hit.kind][2]],sizeLimit:Math.max(70,bounds.w/2)};
 $('stage').setPointerCapture(e.pointerId);refreshStickers();syncVisualPanel();renderCurrent();
});
$('stage').addEventListener('pointermove',e=>{
 if(NM.mathStudio.pointerMove(e))return;
 if(NM.freeEditor.pointerMove(e))return;
 if(!elementGesture||e.pointerId!==elementGesture.pointerId||playing)return;
 const p=stageCoords(e),g=elementGesture,scene=state.scenes[index];
 if(g.mode==='resize'){
  const ratio=1+((p.x*CW-g.startX)+(p.y*CH-g.startY))/g.sizeLimit;
  visualResize(Math.round(g.originalSize*Math.max(.2,ratio)));
 }else if(g.kind==='sticker'){
  const st=currentSticker();if(!st)return;
  st.x=bounded((g.originalX+(p.x*CW-g.startX))/CW,.04,.96,st.x);
  st.y=bounded((g.originalY+(p.y*CH-g.startY))/CH,.04,.96,st.y);
 }else{
  const [kx,ky]=ELEMENT_KEYS[g.kind];const limitY={title:[17,47],question:[28,68],equation:[40,79],answer:[55,90]}[g.kind];
  scene[kx]=bounded((g.originalX+(p.x*CW-g.startX))/CW*100,12,88,scene[kx]);
  scene[ky]=bounded((g.originalY+(p.y*CH-g.startY))/CH*100,...limitY,scene[ky]);
 }
 renderCurrent();
});
function dragEnd(e){if(NM.mathStudio.pointerEnd(e))return;if(NM.freeEditor.pointerEnd(e))return;if(!elementGesture||e.pointerId!==elementGesture.pointerId)return;elementGesture=null;save();syncTypographyControls();refreshStickers();syncVisualPanel();renderCurrent()}
$('stage').addEventListener('pointerup',dragEnd);$('stage').addEventListener('pointercancel',dragEnd);
$('visualSize').addEventListener('input',e=>visualResize(Number(e.target.value)));
$('visualDelete').addEventListener('click',()=>$('removeSticker').click());
$('visualDone').addEventListener('click',()=>{selectedElement=null;selectedStickerId=null;syncVisualPanel();renderCurrent()});
// Voice clips are kept by stable scene ID and project ID, never embedded in JSON.
let voiceLoadPromise=Promise.resolve();const voiceBlobs=new Map();const voiceUrls=new Map();let activeRecorder=null,micStream=null,previewVoice=null,previewVoiceUrl=null;
const projectKey=()=>state.projectId;
function voiceKey(sceneId){return 'project:'+projectKey()+':'+sceneId}
function soundDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('nibor-motion-scene-voices',1);r.onupgradeneeded=()=>r.result.createObjectStore('clips');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function dbAudio(op,key,blob){const db=await soundDB();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('clips',op==='get'?'readonly':'readwrite'),s=tx.objectStore('clips');let req;if(op==='get')req=s.get(key);else if(op==='put')req=s.put(blob,key);else req=s.delete(key);if(op==='get')req.onsuccess=()=>resolve(req.result);tx.oncomplete=()=>op!=='get'&&resolve();tx.onerror=()=>reject(tx.error);req.onerror=()=>reject(req.error)})}finally{db.close()}}
async function deleteSceneAudio(id){await dbAudio('delete',voiceKey(id))}
async function loadSceneVoices(){const pid=state.projectId,scenes=[...state.scenes];voiceBlobs.clear();for(const s of scenes){const b=await dbAudio('get','project:'+pid+':'+s.id);if(state.projectId!==pid)return;if(b)voiceBlobs.set(s.id,b)}if(state.projectId===pid){syncSceneVoiceUI();rebuildTimeline()}}
function stopSceneAudio(){previewVoice?.pause();previewVoice=null;if(previewVoiceUrl){URL.revokeObjectURL(previewVoiceUrl);previewVoiceUrl=null;}if(window.speechSynthesis)window.speechSynthesis.cancel()}
function setSceneAudio(blob,sid=index,persist=true){const id=typeof sid==='number'?state.scenes[sid].id:sid;if(!blob||!blob.size)return;voiceBlobs.set(id,blob);if(persist)dbAudio('put',voiceKey(id),blob).catch(e=>status('تعذر حفظ الصوت محلياً: '+e.message));if(state.scenes[index].id===id)syncSceneVoiceUI();rebuildTimeline();}
function syncSceneVoiceUI(){const s=state.scenes[index],blob=voiceBlobs.get(s.id);$('speechText').value=s.speechText;$('speechRate').value=s.speechRate;$('speechRateOut').textContent=s.speechRate.toFixed(1)+'×';$('ttsVoice').value=s.ttsVoice;$('audioVolume').value=Math.round(s.voiceVolume*100);$('audioVolumeOut').textContent=Math.round(s.voiceVolume*100)+'%';$('autoDuration').checked=s.autoDuration;const player=$('audioPreview');player.pause();if(player.dataset.url)URL.revokeObjectURL(player.dataset.url);if(blob){player.dataset.url=URL.createObjectURL(blob);player.src=player.dataset.url;$('audioStatus').textContent='✅ ملف صوتي محفوظ لهذا المشهد: '+(blob.size/1024).toFixed(0)+'KB — سيدخل في الفيديو عند التصدير.';}else{delete player.dataset.url;player.removeAttribute('src');player.load();$('audioStatus').textContent=s.speechText.trim()?'⚠ النص مكتوب لكن لم يتم توليد ملف صوتي. الاستماع التجريبي لا يُضاف إلى الفيديو.':'لا يوجد ملف صوتي لهذا المشهد بعد.'}}
function updateSceneVoice(key,val){if(playing)return;state.scenes[index][key]=val;save()}
// Free on-device production path: Apple Shortcuts generates an actual audio file.
// The browser cannot record speechSynthesis output directly on Safari.
function speechFromMath(tex){
  let x=String(tex||'').trim();if(!x)return '';
  // Common school formulas only; teacher must review complex TeX before generating audio.
  for(let i=0;i<3;i++)x=x.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g,'البسط $1 على المقام $2');
  x=x.replace(/\\sqrt\{([^{}]+)\}/g,'الجذر التربيعي لـ $1')
   .replace(/\\log_\{([^{}]+)\}/g,'لوغاريتم للأساس $1 ')
   .replace(/\\log/g,'لوغاريتم ')
   .replace(/\\pi/g,'باي').replace(/\\sum/g,'مجموع')
   .replace(/\\times|\\cdot/g,' في ').replace(/\\div/g,' مقسوماً على ')
   .replace(/\\leq/g,' أصغر من أو يساوي ').replace(/\\geq/g,' أكبر من أو يساوي ')
   .replace(/\\neq/g,' لا يساوي ').replace(/\\infty/g,'ما لا نهاية')
   .replace(/\\left|\\right|\\boxed/g,'').replace(/\\[a-zA-Z]+/g,' ')
   .replace(/\^\{2\}|\^2/g,' تربيع ').replace(/\^\{3\}|\^3/g,' تكعيب ')
   .replace(/\^\{([^{}]+)\}/g,' أس $1 ').replace(/\^([\dxy])/g,' أس $1 ')
   .replace(/_/g,' دليل ').replace(/=/g,' يساوي ').replace(/\+/g,' زائد ')
   .replace(/−|-/g,' ناقص ').replace(/\*/g,' في ')
   .replace(/[{}$]/g,' ').replace(/\s+/g,' ').trim();
  return x;
}
function preparedNarration(scene){
 const bits=[scene.title,scene.question,speechFromMath(scene.equation),scene.answer?'النتيجة النهائية: '+speechFromMath(scene.answer):''];
 return bits.filter(Boolean).join('. ').replace(/\.{2,}/g,'.');
}
$('prepareSpeech').onclick=()=>{if(playing)return;const s=state.scenes[index];if(s.speechText.trim()&&!confirm('سيستبدل نص التعليق الحالي بنص مقترح من محتوى المشهد. متابعة؟'))return;
 s.speechText=preparedNarration(s).slice(0,4000);save();$('speechText').value=s.speechText;syncSceneVoiceUI();$('freeTtsStatus').textContent='تم إعداد النص. راجع قراءة الكسور والأسس والأعداد قبل توليد الصوت.';};
$('copySpeech').onclick=async()=>{const t=state.scenes[index].speechText.trim();if(!t){status('اكتب نص التعليق أولاً');return}
 try{await navigator.clipboard.writeText(t);$('freeTtsStatus').textContent='تم نسخ نص المشهد. الصقه في الاختصار إذا لم ينتقل تلقائياً.'}catch(e){$('speechText').focus();$('speechText').select();$('freeTtsStatus').textContent='تعذر النسخ الآلي؛ حدد النص وانسخه يدوياً.'}};
$('openShortcuts').onclick=()=>{location.href='shortcuts://'};
$('shortcutSpeech').onclick=()=>{const t=state.scenes[index].speechText.trim();if(!t){status('اكتب نص التعليق أولاً');return}
 if(t.length>1200){$('freeTtsStatus').textContent='النص طويل لتمريره في رابط الاختصار. استخدم «نسخ نص التعليق» والصقه داخل الاختصار.';return}
 $('freeTtsStatus').textContent='سيُفتح اختصار Nibor Voice إذا كنت أنشأته. احفظ الصوت ثم استورده في نفس المشهد.';
 location.href='shortcuts://run-shortcut?name='+encodeURIComponent('Nibor Voice')+'&input=text&text='+encodeURIComponent(t);
};
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
async function fitSceneAudio(blob,id){const s=state.scenes.find(s=>s.id===id);if(!s)return;try{const dur=await audioSeconds(blob);s.voiceDuration=bounded(dur,0,120,0);save();if(!s.autoDuration){save();return;}if(dur>s.duration){s.duration=Math.min(MAX_SCENE_DURATION,Math.ceil((dur+.4)*2)/2);save();if(state.scenes[index].id===id){clock=sceneStart(index)+s.duration;drawControls();render(1)}status('عُدلت مدة المشهد لتناسب التعليق الصوتي: '+s.duration+' ثانية')}}catch(e){status('أضيف الصوت ولكن تعذر حساب مدته آلياً')}}
$('audioFile').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;const id=state.scenes[index].id;if(file.size>30*1024*1024){status('الملف الصوتي أكبر من 30MB');return}setSceneAudio(file,id);await fitSceneAudio(file,id);e.target.value=''};
$('recordAudio').onclick=async()=>{if(playing||activeRecorder)return;const id=state.scenes[index].id;try{micStream=await navigator.mediaDevices.getUserMedia({audio:true});const types=['audio/mp4','audio/webm;codecs=opus','audio/webm'];const mime=types.find(t=>MediaRecorder.isTypeSupported(t));const rec=new MediaRecorder(micStream,mime?{mimeType:mime}:{});const chunks=[];activeRecorder=rec;rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};rec.onstop=async()=>{micStream?.getTracks().forEach(t=>t.stop());micStream=null;activeRecorder=null;$('recordAudio').disabled=false;$('stopAudio').disabled=true;if(chunks.length){const blob=new Blob(chunks,{type:rec.mimeType||'audio/webm'});setSceneAudio(blob,id);await fitSceneAudio(blob,id)}};rec.start(350);$('recordAudio').disabled=true;$('stopAudio').disabled=false;$('audioStatus').textContent='● يجري تسجيل صوت هذا المشهد…'}catch(err){status('تعذر التسجيل: '+err.message);micStream?.getTracks().forEach(t=>t.stop());activeRecorder=null}};
$('stopAudio').onclick=()=>{if(activeRecorder?.state==='recording')activeRecorder.stop()};
$('removeAudio').onclick=()=>{if(playing)return;const id=state.scenes[index].id;voiceBlobs.delete(id);state.scenes[index].voiceDuration=0;save();deleteSceneAudio(id).catch(()=>{});syncSceneVoiceUI()};
async function playSceneAudio(id){const blob=voiceBlobs.get(id);if(!blob)return;previewVoiceUrl=URL.createObjectURL(blob);const a=new Audio(previewVoiceUrl);previewVoice=a;a.volume=state.scenes.find(s=>s.id===id)?.voiceVolume??1;try{await a.play()}catch(e){status('لم يسمح المتصفح بتشغيل صوت المشهد تلقائياً')}finally{a.onended=()=>{if(previewVoice===a)stopSceneAudio()}}}
$('generateSpeech').onclick=async()=>{const s=state.scenes[index],id=s.id,endpoint=$('ttsEndpoint').value.trim();if(!s.speechText.trim()){status('اكتب النص الصوتي أولاً');return}if(!endpoint||!endpoint.startsWith('https://')){status('أضف رابط خدمة الصوت الآمنة أولاً. معاينة صوت الجهاز متاحة دون خادم.');return}const b=$('generateSpeech');b.disabled=true;status('جارٍ طلب الملف الصوتي…');try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:s.speechText,voice:s.ttsVoice,speed:s.speechRate})});if(!r.ok)throw Error('HTTP '+r.status+' '+(await r.text()).slice(0,180));const type=r.headers.get('content-type')||'';if(!type.startsWith('audio/'))throw Error('الخدمة لم تُرجع ملفاً صوتياً');const blob=await r.blob();if(blob.size>30*1024*1024||!blob.size)throw Error('ملف الصوت غير صالح أو كبير جداً');setSceneAudio(blob,id);await fitSceneAudio(blob,id);status('تم توليد الصوت وحفظه للمشهد. الصوت مولّد بالذكاء الاصطناعي.')}catch(e){status('لم يتم توليد الصوت: '+e.message)}finally{b.disabled=false}};

// v0.7.0 extension module bindings — all settings are sanitized on import.
let musicBlob=null,musicLoadPromise=Promise.resolve(),previewMix=null;
const musicKey=()=> 'project:'+state.projectId+':music';
async function loadMusic(){musicBlob=await dbAudio('get',musicKey())||null;showMusicState()}
function showMusicState(){$('musicStatus').textContent=musicBlob?'تم حفظ الموسيقى للمشروع':'لا توجد موسيقى مضافة'}
function updateExtra(k,v){if(playing)return;const path=k.split('.');let target=state;for(let i=0;i<path.length-1;i++)target=target[path[i]];target[path.at(-1)]=v;state=cleanProject(state);NM.project=state;save();renderCurrent();syncExtraControls()}
function syncExtraControls(){if(!$('captionEnable'))return;const s=state.scenes[index];for(const [id,v] of Object.entries({headingFont:state.fonts.heading,bodyFont:state.fonts.body,captionEnable:state.captions.enabled,captionSize:state.captions.size,captionY:state.captions.y,captionStyle:state.captions.style,captionHighlight:state.captions.highlight,equationAnim:s.equationAnim,equationAnimDuration:s.equationAnimDuration,highlightAt:s.highlightAt,sceneType:s.sceneType,resultEffect:s.resultEffect,progressEnable:state.overlays.progress,progressColor:state.overlays.progressColor,safeGuide:state.overlays.safeGuide,musicVolume:state.audio.musicVolume,sceneEffect:state.audio.sceneEffect})){const e=$(id);if(e){if(e.type==='checkbox')e.checked=!!v;else e.value=v}}}
const extras={headingFont:'fonts.heading',bodyFont:'fonts.body',captionEnable:'captions.enabled',captionSize:'captions.size',captionY:'captions.y',captionStyle:'captions.style',captionHighlight:'captions.highlight',equationAnim:'scenes.equationAnim',equationAnimDuration:'scenes.equationAnimDuration',highlightAt:'scenes.highlightAt',sceneType:'scenes.sceneType',resultEffect:'scenes.resultEffect',progressEnable:'overlays.progress',progressColor:'overlays.progressColor',safeGuide:'overlays.safeGuide',musicVolume:'audio.musicVolume',sceneEffect:'audio.sceneEffect'};
for(const [id,path] of Object.entries(extras))$(id).addEventListener(['SELECT','INPUT'].includes($(id).tagName)&&!['range','checkbox','color'].includes($(id).type)?'change':'input',async e=>{const value=$(id).type==='checkbox'?e.target.checked:['range','number'].includes($(id).type)?Number(e.target.value):e.target.value;if(path.startsWith('scenes.')){state.scenes[index][path.split('.')[1]]=value;state.scenes[index]=cleanScene(state.scenes[index]);save();scheduleMathWarm();renderCurrent();syncExtraControls()}else{updateExtra(path,value);if(path.startsWith('fonts.')){await NM.fonts.ready(status);renderCurrent()}if(path==='overlays.safeGuide')renderCurrent()}});
$('exportSRT').onclick=()=>{rebuildTimeline();download(new Blob([NM.captions.srt(subtitleTimeline)],{type:'text/plain;charset=utf-8'}),`${safeFileName()}-v${APP_VERSION}.srt`)};
$('addHook').onclick=()=>{if(playing)return;const choice=prompt('اختر نص الخطاف أو اكتب عنواناً جديداً:\n1. '+NM.overlays.ideas[0]+'\n2. '+NM.overlays.ideas[1]+'\n3. '+NM.overlays.ideas[2], '3');if(choice===null)return;const n=Number(choice),label=[1,2,3].includes(n)?NM.overlays.ideas[n-1]:choice.slice(0,160);state.scenes.unshift(cleanScene({title:label,sceneType:'hook',duration:2}));index=0;clock=2;save();drawControls();render(1)};
$('musicFile').onchange=async e=>{const blob=e.target.files?.[0];if(!blob)return;if(blob.size>30*1024*1024){status('حجم الموسيقى يتجاوز 30 ميغابايت');return}musicBlob=blob;try{await dbAudio('put',musicKey(),blob);showMusicState();status('تم حفظ موسيقى المشروع')}catch(err){status('تعذّر حفظ الموسيقى: '+err.message)}e.target.value=''};
$('removeMusic').onclick=async()=>{if(!confirm('هل تريد حذف الموسيقى من هذا المشروع؟'))return;musicBlob=null;await dbAudio('delete',musicKey());showMusicState()};
// A preview mix uses the same precomputed event scheduler as export.
async function startPreviewMix(){const ac=new (window.AudioContext||window.webkitAudioContext)();const resume=ac.resume().catch(()=>{});await voiceLoadPromise;await musicLoadPromise;if(!musicBlob&&!voiceBlobs.size&&!NM.audiomix.timeline(state,voiceBlobs).events.length){await ac.close();return}const dest=ac.createGain();dest.connect(ac.destination);try{const prepared=await NM.audiomix.prepare(ac,state,voiceBlobs,musicBlob);await resume;const mix=NM.audiomix.startPrepared(ac,dest,state,prepared,ac.currentTime+.09);previewMix={ac,sources:mix.sources}}catch(err){await ac.close();status('تعذّر تشغيل المؤثرات: '+err.message)}}
function stopPreviewMix(){if(!previewMix)return;for(const source of previewMix.sources)try{source.stop()}catch(e){}previewMix.ac.close().catch(()=>{});previewMix=null}
musicLoadPromise=loadMusic().catch(e=>status('تعذّر تحميل الموسيقى: '+e.message));

NM.mathStudio.init({scene:()=>state.scenes[index],playing:()=>playing,commit:()=>{save();renderCurrent()},draw:()=>renderCurrent(),prewarm:()=>scheduleMathWarm(),status});
NM.freeEditor.init({getState:()=>state,getIndex:()=>index,getProgress:()=>Math.max(0,Math.min(1,(clock-sceneStart(index))/state.scenes[index].duration)),playing:()=>playing,commit:()=>{save();renderCurrent()},render:()=>renderCurrent(),apply:(next,i)=>{state=cleanProject(next);NM.project=state;index=Math.max(0,Math.min(state.scenes.length-1,i));clock=sceneStart(index)+state.scenes[index].duration;save();drawControls();render(1);prewarm()},prewarm:()=>{prewarm()},status});
NM.timelineEditor.init({scene:()=>state.scenes[index],getIndex:()=>index,elapsed:()=>Math.max(0,Math.min(state.scenes[index].duration,clock-sceneStart(index))),playing:()=>playing,select:id=>NM.freeEditor.select(id),seek:t=>{if(playing)return;clock=sceneStart(index)+t;render(t/state.scenes[index].duration,{guides:true})},commit:()=>{save();renderCurrent()},commitLegacy:()=>{save();
  const s=state.scenes[index];for(const [key,out] of [['qAt','qOut'],['eAt','eOut'],['aAt','aOut']]){$(key).value=s[key];$(out).textContent=s[key]+'%'}
  refreshStickers();renderCurrent();},draw:()=>renderCurrent(),status});
initialize();voiceLoadPromise=loadSceneVoices().catch(e=>{status('تعذر قراءة ملفات الصوت المحفوظة: '+e.message)});
