/* Nibor Motion 0.13.0 — visual mixed Arabic / mathematical question editor.
   DOM is constructed with textContent/createElement (no HTML injection).
   The persisted scene.question remains the existing \(LaTeX\) text format. */
(()=>{
 'use strict';
 const N=window.NM=window.NM||{};
 const $=id=>document.getElementById(id);
 const editor=$('nmQuestionComposer'),source=$('question'),details=$('nmQuestionMathDetails');
 if(!editor||!source)return;
 const TOKEN='nm-inline-equation';
 let savedRange=null,editing=null,loading=false,pending=0;
 const history=[];let historyIndex=-1;
 function recordHistory(){
  if(loading)return;
  const value=serialize();
  if(history[historyIndex]===value)return;
  history.splice(historyIndex+1);
  history.push(value);
  if(history.length>80)history.shift();
  historyIndex=history.length-1;updateHistoryButtons();
 }
 function updateHistoryButtons(){
  const undo=$('nmQuestionUndo'),redo=$('nmQuestionRedo');
  if(undo)undo.disabled=historyIndex<=0;
  if(redo)redo.disabled=historyIndex>=history.length-1;
 }
 function stepHistory(delta){
  const to=historyIndex+delta;
  if(to<0||to>=history.length)return;
  historyIndex=to;load(history[to],false);persist();updateHistoryButtons();editor.focus();
 }

 function pieces(raw){
  const list=[],text=String(raw||''),r=/\\\(([\s\S]*?)\\\)|\$([^$\n]+)\$/g;
  let m,last=0;
  while((m=r.exec(text))){if(m.index>last)list.push({kind:'text',value:text.slice(last,m.index)});list.push({kind:'math',value:m[1]??m[2]});last=r.lastIndex}
  if(last<text.length)list.push({kind:'text',value:text.slice(last)});
  return list;
 }
 function isMath(node){return node?.nodeType===1&&node.classList?.contains(TOKEN)}
 function token(latex){
  const el=document.createElement('span');el.className=TOKEN;el.contentEditable='false';el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label','تعديل المعادلة');el.dataset.latex=String(latex).slice(0,1000);
  const content=document.createElement('span');content.className='nm-inline-math-render';content.textContent=latex;
  const pen=document.createElement('span');pen.className='nm-inline-math-pen';pen.textContent='✎';pen.setAttribute('aria-hidden','true');
  el.append(content,pen);paintMath(content,latex);return el;
 }
 async function paintMath(target,latex){
  try{
   if(!window.MathJax?.tex2svgPromise && !window.MathJax?.tex2svg)return;
   const result=window.MathJax.tex2svgPromise?await window.MathJax.tex2svgPromise(latex,{display:false}):window.MathJax.tex2svg(latex,{display:false});
   if(!target.isConnected)return;
   const svg=result.querySelector('svg');if(svg){const copy=svg.cloneNode(true);copy.setAttribute('focusable','false');copy.setAttribute('aria-hidden','true');target.replaceChildren(copy)}
  }catch(e){target.title='تعذر عرض المعادلة: '+e.message}
 }
 function load(raw,resetHistory=true){
  loading=true;editor.replaceChildren();
  for(const p of pieces(raw)){
   if(p.kind==='math')editor.append(token(p.value));
   else{const lines=p.value.split('\n');lines.forEach((line,i)=>{if(i)editor.append(document.createElement('br'));if(line)editor.append(document.createTextNode(line))})}
  }
  loading=false;savedRange=null;editing=null;
  if(resetHistory){history.length=0;history.push(serialize());historyIndex=0;updateHistoryButtons()}
 }
 // Convert contenteditable's user-created lines into plain text while retaining math spans.
 function serialize(){
  let out='';
  const visit=(node)=>{
   if(node.nodeType===3){out+=node.nodeValue||'';return}
   if(node.nodeType!==1)return;
   if(isMath(node)){out+='\\('+node.dataset.latex+'\\)';return}
   if(node.tagName==='BR'){out+='\n';return}
   const block=node!==editor&&/^(DIV|P)$/.test(node.tagName);
   if(block&&out&&!out.endsWith('\n'))out+='\n';
   for(const child of node.childNodes)visit(child);
   if(block&&!out.endsWith('\n'))out+='\n';
  };
  for(const child of editor.childNodes)visit(child);
  return out.replace(/\n{3,}/g,'\n\n').replace(/\n$/,'');
 }
 function persist(){
  if(loading)return;
  const value=serialize();if(source.value===value)return;
  source.value=value;source.dispatchEvent(new Event('input',{bubbles:true}));
  recordHistory();
 }
 function rangeWithinEditor(range){return range&&editor.contains(range.commonAncestorContainer)}
 document.addEventListener('selectionchange',()=>{
  const selection=window.getSelection();if(selection?.rangeCount){const range=selection.getRangeAt(0);if(rangeWithinEditor(range))savedRange=range.cloneRange()}
 });
 function focusAfter(el){
  editor.focus();const selection=window.getSelection();const range=document.createRange();range.setStartAfter(el);range.collapse(true);selection.removeAllRanges();selection.addRange(range);savedRange=range.cloneRange();
 }
 function insertEquation(latex){
  if(!String(latex||'').trim())return false;
  const safe=String(latex).trim().slice(0,1000);
  if(editing?.isConnected){editing.classList.remove('nm-math-editing');editing.dataset.latex=safe;const display=editing.querySelector('.nm-inline-math-render');display.textContent=safe;paintMath(display,safe);focusAfter(editing);editing=null}
  else{
   let range=savedRange&&rangeWithinEditor(savedRange)?savedRange.cloneRange():null;
   if(!range){range=document.createRange();range.selectNodeContents(editor);range.collapse(false)}
   range.deleteContents();const el=token(safe);range.insertNode(el);focusAfter(el);
  }
  persist();return true;
 }
 function editToken(el){
  editor.querySelectorAll('.nm-math-editing').forEach(item=>item.classList.remove('nm-math-editing'));
  editing=el;const latex=el.dataset.latex||'';
  $('questionMathCode').value=latex;
  const field=$('questionMathfield');if(field&&window.customElements?.get('math-field'))field.value=latex;
  details.open=true;el.classList.add('nm-math-editing');
  $('questionMathCode').focus();
 }
 editor.addEventListener('click',e=>{const el=e.target.closest?.('.'+TOKEN);if(el)editToken(el)});
 editor.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&isMath(e.target)){e.preventDefault();editToken(e.target)}});
 editor.addEventListener('input',()=>{persist();recordHistory()});
 editor.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='z'){
   e.preventDefault();stepHistory(e.shiftKey?1:-1);
  }else if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='y'){
   e.preventDefault();stepHistory(1);
  }
 });
 $('nmQuestionUndo')?.addEventListener('click',()=>stepHistory(-1));
 $('nmQuestionRedo')?.addEventListener('click',()=>stepHistory(1));
 editor.addEventListener('paste',e=>{
  e.preventDefault();const txt=e.clipboardData?.getData('text/plain')||'';
  // Preserve plain text only; avoid pasted rich HTML in contenteditable.
  const selection=window.getSelection();let range=selection?.rangeCount?selection.getRangeAt(0):null;
  if(!range||!rangeWithinEditor(range)){range=document.createRange();range.selectNodeContents(editor);range.collapse(false)}
  range.deleteContents();const parts=txt.split('\n');let last=null;
  for(let i=0;i<parts.length;i++){if(i){last=document.createElement('br');range.insertNode(last);range.setStartAfter(last);range.collapse(true)}if(parts[i]){last=document.createTextNode(parts[i]);range.insertNode(last);range.setStartAfter(last);range.collapse(true)}}
  if(last){range.setStartAfter(last);range.collapse(true);selection.removeAllRanges();selection.addRange(range)}persist();
 });
 source.addEventListener('input',()=>{
  if(document.activeElement===editor||editor.contains(document.activeElement))return;
  if(source.value!==serialize())load(source.value);
 });
 $('nmQuestionAddMath').addEventListener('click',()=>{editing?.classList.remove('nm-math-editing');editing=null;details.open=true;const field=$('questionMathfield');(field&&!field.hidden?field:$('questionMathCode')).focus()});
 $('nmQuestionComposerHelp').addEventListener('click',()=>{const box=$('nmQuestionComposerHelpText');box.hidden=!box.hidden});
 // Mobile-first mathematical palette. Buttons are created as text nodes, never HTML strings.
 const palettes={
  'أساسيات':[
   ['كسر','\\frac{1}{2}'],['جذر','\\sqrt{x}'],['أس','x^{2}'],['دليل','x_{1}'],['قوس','\\left(x+1\\right)'],['مساواة','x=1'],['لا يساوي','\\ne'],['تقريباً','\\approx'],['π','\\pi'],['∞','\\infty']
  ],
  'الجبر':[
   ['تربيعية','ax^{2}+bx+c=0'],['قانون عام','x=\\frac{-b\\pm\\sqrt{b^{2}-4ac}}{2a}'],['لوغاريتم','\\log_{2}(x)'],['لوغاريتم طبيعي','\\ln(x)'],['قيمة مطلقة','\\left|x\\right|'],['متباينة','x\\leq 3'],['مجموع','\\sum_{i=1}^{n}i'],['مصفوفة','\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}']
  ],
  'هندسة':[
   ['نقطة','A(2,3)'],['مركز دائرة','C(a,b)'],['معادلة دائرة','(x-a)^2+(y-b)^2=r^2'],['درجة','45^{\\circ}'],['زاوية','\\angle ABC'],['مثلث','\\triangle ABC'],['توازي','\\parallel'],['عمودي','\\perp'],['مسافة','AB=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}']
  ],
  'تفاضل وتكامل':[
   ['مشتقة','f\\prime(x)'],['dy/dx','\\frac{dy}{dx}'],['نهاية','\\lim_{x\\to a}f(x)'],['تكامل','\\int f(x)\\,dx'],['تكامل محدد','\\int_{a}^{b}f(x)\\,dx'],['جيب','\\sin(x)'],['جيب تمام','\\cos(x)'],['ظل','\\tan(x)']
  ]
 };
 const palette=$('nmQuestionPalette'),tabs=$('nmQuestionPaletteTabs'),keys=$('nmQuestionPaletteKeys');
 function buildKeys(category){
  keys.replaceChildren();
  for(const [label,latex] of palettes[category]){
   const button=document.createElement('button');button.type='button';button.className='nm-question-key';button.textContent=label;button.title=latex;
   button.setAttribute('aria-label','إدراج '+label);
   button.addEventListener('pointerdown',e=>e.preventDefault());
   button.addEventListener('click',()=>{if(!insertEquation(latex))return;editor.focus()});
   keys.append(button);
  }
  for(const button of tabs.children)button.setAttribute('aria-selected',String(button.dataset.category===category));
 }
 if(palette&&tabs&&keys){
  for(const category of Object.keys(palettes)){
   const button=document.createElement('button');button.type='button';button.textContent=category;button.dataset.category=category;button.setAttribute('role','tab');button.className='nm-question-tab';
   button.addEventListener('pointerdown',e=>e.preventDefault());
   button.addEventListener('click',()=>buildKeys(category));tabs.append(button);
  }
  buildKeys('أساسيات');
 }
 N.questionEditor={load,insertEquation,pieces,serialize,stepHistory,palettes};
 load(source.value);
})();
