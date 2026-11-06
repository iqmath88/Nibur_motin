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
  const compact=input.replace(/\s+/g,'').replace(/−/g,'-').replace(/²/g,'^2');
  const match=compact.match(/^(.+)=0$/i);
  if(!match)throw Error('اكتب معادلة مثل x^2-5x+6=0');
  const expr=match[1].replace(/-/g,'+-').replace(/^\+/, '');
  const terms=expr.split('+').filter(Boolean);
  let a=0,b=0,c=0,seen=new Set();
  for(const term of terms){
   const m=term.match(/^([+-]?\d*)x(\^2)?$/i);
   let kind,value;
   if(m){kind=m[2]?'a':'b';value=m[1]===''||m[1]==='+'?1:m[1]==='-'?-1:Number(m[1]);}
   else if(/^[+-]?\d+$/.test(term)){kind='c';value=Number(term);}
   else throw Error('استخدم معاملات صحيحة فقط، مثل x^2-4=0');
   if(seen.has(kind))throw Error('اجمع الحدود المتشابهة قبل إدخال المعادلة');
   seen.add(kind);if(kind==='a')a=value;else if(kind==='b')b=value;else c=value;
  }
  if(!a||![a,b,c].every(Number.isSafeInteger)||Math.max(Math.abs(a),Math.abs(b),Math.abs(c))>10000)throw Error('المعاملات غير صالحة أو كبيرة جداً');
  const d=b*b-4*a*c;name='حل معادلة تربيعية';
  const fmt=n=>n<0?`(${n})`:String(n);
  const coefficient=(v,symbol,first=false)=>v===0?'':`${v<0?'-':first?'':'+'}${Math.abs(v)===1?'':Math.abs(v)}${symbol}`;
  const constant=c===0?'':`${c<0?'-':'+'}${Math.abs(c)}`;
  const polynomial=coefficient(a,'x^2',true)+coefficient(b,'x')+constant+'=0';
  const gcd=(x,y)=>{x=Math.abs(x);y=Math.abs(y);while(y){[x,y]=[y,x%y]}return x||1};
  const rational=(n,den)=>{if(den<0){n=-n;den=-den}const g=gcd(n,den);n/=g;den/=g;return den===1?String(n):`\\frac{${n}}{${den}}`};
  const root=Math.sqrt(d),perfect=d>=0&&Number.isInteger(root);
  const roots=d<0?'لا توجد جذور حقيقية':d===0?`x=${rational(-b,2*a)}`:perfect?`x_1=${rational(-b+root,2*a)},\\quad x_2=${rational(-b-root,2*a)}`:`x_{1,2}=\\frac{${-b}\\pm\\sqrt{${d}}}{${2*a}}`;
  items=[['تحدي رياضي','كيف نحل هذه المعادلة؟',polynomial,''],['القانون العام','نحدد المعاملات a و b و c','x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}',''],['نحسب المميز',`a=${a} ، b=${b} ، c=${c}`,`\\Delta=${fmt(b)}^2-4(${a})(${fmt(c)})=${d}`,''],['نتيجة الحل',d<0?'المميز سالب: لا توجد جذور حقيقية':d===0?'المميز صفر: جذر حقيقي مكرر':'المميز موجب: جذران حقيقيان',d<0?'\\Delta<0':`x=\\frac{${-b}\\pm\\sqrt{${d}}}{${2*a}}`,roots],['تذكر','تحقق بالتعويض في المعادلة الأصلية','\\Delta=b^2-4ac','']];
 }else{
  const lines=safe($('autoSteps').value).split(/\n/).map(safe).filter(Boolean);if(lines.length<2||lines.length>20)throw Error('اكتب خطوتين إلى 20 خطوة، كل خطوة في سطر');
  name=input.slice(0,120)||'شرح رياضي مخصص';items=lines.map((line,i)=>[i===0?'السؤال':i===lines.length-1?'الخلاصة':`الخطوة ${i}`,line,'','']);
 }
 const per=Math.max(1,Math.round(duration/items.length*10)/10);
 return {projectId:crypto.randomUUID?.()||String(Date.now()),name,theme:'notebook',scenes:items.map(([title,question,equation,answer],i)=>({title,question,equation,answer,duration:per,qAt:12,eAt:35,aAt:70,speechText:[title,window.NM?.speechFromMath?.(question)||question,window.NM?.speechFromMath?.(equation)||equation,answer?('النتيجة النهائية: '+(window.NM?.speechFromMath?.(answer)||answer)):''].filter(Boolean).join('. '),id:`auto-${Date.now()}-${i}`}))};
}
btn.addEventListener('click',()=>{const status=$('autoStatus');try{const project=scenesFor();const current=window.NM?.project;if(!current)throw Error('تعذر الوصول إلى المشروع الحالي');if(!confirm(`سيستبدل المولّد المشاهد الحالية بـ ${project.scenes.length} مشاهد. احفظ نسخة JSON من مشروعك أولاً. هل تريد المتابعة؟`))return;
 // Use the app's own import pipeline to validate and normalize all scenes.
 window.dispatchEvent(new CustomEvent('nibor:load-generated-project',{detail:{...current,...project}}));status.textContent='تم تجهيز مشروع الريلز وإرساله إلى محرر المشاهد. راجع النتيجة والصوت.';
 }catch(e){status.textContent='تعذر التوليد: '+e.message;}});
})();
