/* Nibor Motion automatic reels generator v0.14.0: deterministic verified templates */
(()=>{'use strict';
const $=id=>document.getElementById(id), btn=$('autoGenerate');if(!btn)return;
const safe=(x)=>String(x||'').trim();
function scenesFor(){
 const mode=$('autoTopic').value, input=safe($('autoInput').value), duration=Number($('autoLength').value);
 let items=[],name='ريلز رياضيات';
 if(mode==='imaginary'){
  const match=input.match(/^\s*i\s*(?:\^\s*\{?\s*(-?\d+)\s*\}?|[⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s*$/i);
  if(!match||match[1]===undefined)throw Error('اكتب القوة بهذه الصيغة: i^58 أو i^-13');
  const exponent=Number(match[1]);if(!Number.isSafeInteger(exponent)||Math.abs(exponent)>1000000)throw Error('الأس يجب أن يكون عدداً صحيحاً ضمن مليون');
  const remainder=((exponent%4)+4)%4, answers=['1','i','-1','-i'];
  name=`قوى العدد التخيلي i^${exponent}`;
  items=[['تحدي رياضي',`هل تستطيع حساب i^${exponent}؟`,`i^{${exponent}}`,''],['القاعدة الذهبية','قوى العدد التخيلي تتكرر كل أربع قوى','i^0=1,\\quad i^1=i,\\quad i^2=-1,\\quad i^3=-i',''],['نقسم الأس على 4',`نحسب باقي قسمة ${exponent} على 4`,` ${exponent}=4\\times(${Math.floor(exponent/4)})+${remainder}`,''],['الإجابة النهائية','نستخدم الباقي لتحديد قيمة القوة',`i^{${exponent}}=i^{${remainder}}`,answers[remainder]],['دورك الآن','جرّب حساب القوة التالية بنفسك',`i^{${exponent+5}}`,'']];
 }else if(mode==='quadratic'){
  const m=input.replace(/\s+/g,'').match(/^([+-]?\d*)x\^2([+-]\d*)x([+-]\d+)=0$/i);
  if(!m)throw Error('أدخل معادلة بالشكل x^2-5x+6=0 (مع معاملات صحيحة)');
  const parseA=v=>v===''||v==='+'?1:v==='-'?-1:Number(v),a=parseA(m[1]),b=parseA(m[2]),c=Number(m[3]);
  if(!a||![a,b,c].every(Number.isSafeInteger)||Math.max(Math.abs(a),Math.abs(b),Math.abs(c))>10000)throw Error('المعاملات غير صالحة أو كبيرة جداً');
  const d=b*b-4*a*c;name='حل معادلة تربيعية';
  const fmt=n=>n<0?`(${n})`:String(n);
  items=[['تحدي رياضي','كيف نحل هذه المعادلة؟',`${a}x^2${b<0?'':'+'}${b}x${c<0?'':'+'}${c}=0`,''],['القانون العام','نحدد المعاملات a و b و c','x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}',''],['نحسب المميز',`a=${a} ، b=${b} ، c=${c}`,`\\Delta=${fmt(b)}^2-4(${a})(${fmt(c)})=${d}`,''],['نتيجة الحل',d<0?'المميز سالب: لا توجد جذور حقيقية':d===0?'المميز صفر: جذر حقيقي مكرر':'المميز موجب: جذران حقيقيان',d<0?'\\Delta<0':`x=\\frac{${-b}\\pm\\sqrt{${d}}}{${2*a}`,d<0?'لا توجد حلول حقيقية':d===0?`x=${-b/(2*a)}`:''],['تذكر','تحقق بالتعويض في المعادلة الأصلية','\\Delta=b^2-4ac','']];
 }else{
  const lines=safe($('autoSteps').value).split(/\n/).map(safe).filter(Boolean);if(lines.length<2||lines.length>20)throw Error('اكتب خطوتين إلى 20 خطوة، كل خطوة في سطر');
  name=input.slice(0,120)||'شرح رياضي مخصص';items=lines.map((line,i)=>[i===0?'السؤال':i===lines.length-1?'الخلاصة':`الخطوة ${i}`,line,'','']);
 }
 const per=Math.max(1,Math.round(duration/items.length*10)/10);
 return {projectId:crypto.randomUUID?.()||String(Date.now()),name,theme:'notebook',scenes:items.map(([title,question,equation,answer],i)=>({title,question,equation,answer,duration:per,qAt:12,eAt:35,aAt:70,speechText:[title,question,answer].filter(Boolean).join('. '),id:`auto-${Date.now()}-${i}`}))};
}
btn.addEventListener('click',()=>{const status=$('autoStatus');try{const project=scenesFor();const current=window.NM?.project;if(!current)throw Error('تعذر الوصول إلى المشروع الحالي');if(!confirm(`سيستبدل المولّد المشاهد الحالية بـ ${project.scenes.length} مشاهد. احفظ نسخة JSON من مشروعك أولاً. هل تريد المتابعة؟`))return;
 // Use the app's own import pipeline to validate and normalize all scenes.
 window.dispatchEvent(new CustomEvent('nibor:load-generated-project',{detail:{...current,...project}}));status.textContent='تم تجهيز مشروع الريلز وإرساله إلى محرر المشاهد. راجع النتيجة والصوت.';
 }catch(e){status.textContent='تعذر التوليد: '+e.message;}});
})();
