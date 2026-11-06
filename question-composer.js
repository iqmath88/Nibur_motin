/* Nibor Motion 0.12.2 — visual mixed Arabic / mathematical question editor.
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
 function load(raw){
  loading=true;editor.replaceChildren();
  for(const p of pieces(raw)){
   if(p.kind==='math')editor.append(token(p.value));
   else{const lines=p.value.split('\n');lines.forEach((line,i)=>{if(i)editor.append(document.createElement('br'));if(line)editor.append(document.createTextNode(line))})}
  }
  loading=false;savedRange=null;editing=null;
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
 editor.addEventListener('input',persist);
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
 $('nmQuestionAddMath').addEventListener('click',()=>{editing=null;details.open=true;const field=$('questionMathfield');(field&&!field.hidden?field:$('questionMathCode')).focus()});
 $('nmQuestionComposerHelp').addEventListener('click',()=>{const box=$('nmQuestionComposerHelpText');box.hidden=!box.hidden});
 N.questionEditor={load,insertEquation,pieces,serialize};
 load(source.value);
})();
