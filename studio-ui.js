/* Nibor Motion v0.14.1 Studio workspace.
 * Presentation only: existing element IDs, listeners, project data and renderer remain intact.
 */
'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const editor=document.querySelector('.editor-panel');
 const scenes=document.querySelector('.scenes-panel');
 const preview=document.querySelector('.preview-panel');
 const nav=document.querySelector('.mobile-bottom-nav');
 const head=$('mobileSheet');
 if(!editor||!scenes||!preview||!nav||!head)return;
 const labels={content:'المحتوى والسؤال',elements:'العناصر والرسوم',motion:'الحركة والخط الزمني',audio:'الصوت والتعليق',scenes:'المشاهد والمشروع',advanced:'إعدادات متقدمة'};
 // Move only UI nodes; app.js and specialist modules resolve elements by their stable IDs.
 const free=$('freeEditor'); const timeline=$('nmTimelineEditor');
 if(free)editor.append(free);
 if(timeline)editor.append(timeline);
 // Per-scene text styling is frequent work: keep it in Content, folded so it does not crowd the form.
 const typo=editor.querySelector(':scope > .typography-panel');
 if(typo){const fold=document.createElement('details');fold.className='nm-settings studio-typography';const sum=document.createElement('summary');sum.textContent='🅰 تنسيق النصوص ومواضعها — هذا المشهد';typo.replaceWith(fold);fold.append(sum,typo);}
 const children=Array.from(editor.children);
 children.forEach(el=>{
   let section;
   if(el===free)section='elements';
   else if(el===timeline)section='motion';
   else if(el.tagName==='H2')section='hidden';
   else {
     // classify by recognizable controls rather than positional dependence
     const id=el.id;
     const input=el.matches('label')?el.getAttribute('for'):null;
     if(el.matches('.audio-panel'))section='audio';
     else if(el.matches('.stickers,.nm-math-studio'))section='elements';
     else if(el.matches('.studio-typography'))section='content';
     else if(el.matches('.nm-question-advanced'))section='advanced';
     else if(el.matches('.question-math-tools,.nm-question-composer-wrap,.math-tools'))section='content';
     else if(el.matches('.nm-settings')){
       const first=el.querySelector('summary')?.textContent||'';
       section=/حركة المعادلة|الخطاف|المناطق الآمنة/.test(first)?'motion':/الموسيقى/.test(first)?'audio':'advanced';
     }
     else if(el.matches('fieldset'))section='motion';
     else if(['duration','qAt','eAt','aAt'].includes(id)||input==='duration')section='motion';
     else if(['title','equation','answer','mathHost'].includes(id)||['title','question','equation','answer','nmQuestionComposer'].includes(input))section='content';
     else if(el.matches('p.muted')&&editor.children.length>0)section='content';
     else section='advanced';
   }
   el.dataset.studioSection=section;
 });
 // Give the studio its own high-level controls; legacy elements remain untouched.
 const toolbar=document.createElement('div');toolbar.className='studio-actions';
 const quick=(id,label,action,cls)=>{
   const b=document.createElement('button');b.type='button';b.id=id;b.textContent=label;if(cls)b.className=cls;b.addEventListener('click',action);toolbar.append(b);return b;
 };
 quick('studioScenes','▦ المشاهد',()=>setView('scenes'),'secondary');
 quick('studioAdd','＋ مشهد',()=>{$('add')?.click();setView('content')},'secondary');
 quick('studioExport','⇩ تصدير الفيديو',()=>{$('export')?.click()},'studio-export');
 preview.insertBefore(toolbar,preview.firstChild);
 const strip=document.createElement('div');strip.className='studio-scene-label';strip.textContent='المشاهد · المس المشهد للتبديل';
 const sceneTrack=$('timeline');if(sceneTrack)sceneTrack.parentNode.insertBefore(strip,sceneTrack);
 const actions=document.createElement('div');actions.className='studio-section-header';
 const strong=document.createElement('strong');strong.id='studioSectionTitle';actions.append(strong);
 const more=document.createElement('button');more.type='button';more.id='studioAdvanced';more.textContent='⚙ إعدادات متقدمة';more.className='secondary';more.addEventListener('click',()=>setView('advanced'));actions.append(more);
 editor.insertBefore(actions,editor.firstChild);
 // Desktop: tabs belong under the app header (on phones the bar is fixed at the bottom anyway).
 document.querySelector('.header')?.after(nav);
 // Phone sheet: a peek toggle hands the screen back to the canvas for direct manipulation.
 const peek=document.createElement('button');peek.type='button';peek.className='secondary sheet-peek-toggle';
 const closeBtn=$('mobileSheetClose');head.insertBefore(peek,closeBtn||null);
 let autoPeek=false;
 function setPeek(on){document.body.classList.toggle('studio-drawer-peek',on);peek.textContent=on?'⌃ توسيع':'⌄ تصغير';peek.setAttribute('aria-pressed',String(on));peek.setAttribute('aria-label',on?'توسيع لوحة التحرير':'تصغير لوحة التحرير لتكبير المعاينة');if(!on)autoPeek=false;}
 peek.addEventListener('click',()=>setPeek(!document.body.classList.contains('studio-drawer-peek')));
 setPeek(false);
 // Multi-content controls reuse existing free-editor layers rather than introducing a new renderer.
 // Keep the generator and mobile peek controls from the user's newer v0.14.1 build.
 const addPanel=document.createElement('section');
 addPanel.className='studio-add-content';addPanel.dataset.studioSection='content';
 const addHeading=document.createElement('strong');addHeading.textContent='محتويات إضافية للمشهد';
 const addHelp=document.createElement('p');addHelp.className='muted';
 addHelp.textContent='أضف نصوصاً وتعليقات ومعادلات بعدد ما تحتاجه. كل عنصر مستقل وقابل للتحريك والتعديل.';
 const addRow=document.createElement('div');addRow.className='studio-content-add-buttons';
 [['text','＋ نص إضافي'],['note','＋ تعليق توضيحي'],['math','＋ معادلة إضافية']].forEach(([kind,label])=>{
   const button=document.createElement('button');button.type='button';button.dataset.studioAdd=kind;button.textContent=label;addRow.append(button);
 });
 const extraList=document.createElement('div');extraList.className='studio-content-items';
 extraList.id='studioContentItems';extraList.setAttribute('aria-live','polite');
 addPanel.append(addHeading,addHelp,addRow,extraList);
 actions.insertAdjacentElement('afterend',addPanel);
 function refreshAdditional(){
   const list=window.NM?.freeEditor?.getItems?.();
   if(!list)return;
   extraList.replaceChildren();
   if(!list.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='لا توجد نصوص أو تعليقات أو معادلات إضافية بعد.';extraList.append(empty);return;}
   const heading=document.createElement('strong');heading.textContent='العناصر الإضافية ('+list.length+')';extraList.append(heading);
   list.forEach(item=>{
     const button=document.createElement('button');button.type='button';button.className='secondary';
     button.textContent=(item.type==='math'?'∑ ':'✎ ')+(item.content?.slice(0,65)||'عنصر فارغ');
     button.addEventListener('click',()=>openExtra(item.id));extraList.append(button);
   });
 }
 function openExtra(id){
   setView('elements');window.NM.freeEditor.select(id);
   const field=$('nmContent');if(field){field.scrollIntoView({block:'nearest'});field.focus({preventScroll:true});}
 }
 addRow.addEventListener('click',event=>{
   const b=event.target.closest('[data-studio-add]');if(!b)return;
   const kind=b.dataset.studioAdd;const id=window.NM?.freeEditor?.add?.(kind==='math'?'math':'text',kind==='note'?'note':undefined);
   if(id){refreshAdditional();openExtra(id);}
 });
 const layers=$('nmLayers');
 if(layers)new MutationObserver(()=>{if(mode==='content')refreshAdditional()}).observe(layers,{childList:true});
 const counter=$('counter');
 if(counter)new MutationObserver(()=>{if(mode==='content')refreshAdditional()}).observe(counter,{childList:true,characterData:true,subtree:true});

 const buttons=[['content','✎','المحتوى'],['elements','◇','العناصر'],['motion','◷','الحركة'],['audio','♫','الصوت'],['scenes','▦','المشاهد']];
 nav.replaceChildren();
 buttons.forEach(([mode,symbol,label])=>{
   const b=document.createElement('button');b.type='button';b.dataset.mobileTab=mode;b.setAttribute('aria-controls','mobileSheet');b.setAttribute('aria-expanded','false');
   const glyph=document.createElement('span');glyph.textContent=symbol;glyph.setAttribute('aria-hidden','true');const small=document.createElement('small');small.textContent=label;b.append(glyph,small);nav.append(b);
 });
 const media=matchMedia('(max-width: 760px)');
 let mode='content';
 function setView(next){
   if(!labels[next])return;
   mode=next;
   setPeek(false);
   document.body.dataset.studioView=mode;
   document.body.classList.toggle('studio-drawer-open',media.matches);
   $('mobileSheetTitle').textContent=labels[mode];
   head.hidden=!media.matches;
   strong.textContent=labels[mode];
   more.hidden=mode==='advanced';
   nav.querySelectorAll('[data-mobile-tab]').forEach(b=>{
     const on=b.dataset.mobileTab===mode;
     b.setAttribute('aria-expanded',String(on));b.setAttribute('aria-current',on?'page':'false');
   });
   document.querySelectorAll('.editor-panel > [data-studio-section]').forEach(el=>{
     // Preserve the intrinsic hidden state of controls managed by their own modules.
     el.classList.toggle('studio-section-inactive',el.dataset.studioSection!==mode);
   });
   editor.scrollTop=0;scenes.scrollTop=0;if(mode==='content')refreshAdditional();
   if(media.matches){document.activeElement?.blur?.();}
 }
 nav.addEventListener('click',event=>{const b=event.target.closest('[data-mobile-tab]');if(b)setView(b.dataset.mobileTab)});
 $('mobileSheetClose')?.addEventListener('click',()=>{document.body.classList.remove('studio-drawer-open');setPeek(false);});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&media.matches)document.body.classList.remove('studio-drawer-open')});
 media.addEventListener('change',()=>{document.body.classList.remove('studio-drawer-open');head.hidden=!media.matches});
 // Quick access to element-specific properties when selection changes, without disturbing Canvas touch handling.
 const observer=new MutationObserver(()=>{
   const active=($('nmProperties')&&!$('nmProperties').hidden)||($('visualEditor')&&!$('visualEditor').hidden);
   document.body.classList.toggle('studio-selection-active',!!active);
   // Selecting an object on the canvas (visual editor) while the half sheet is open: shrink the sheet so the object can be dragged comfortably.
   const onCanvas=$('visualEditor')&&!$('visualEditor').hidden;
   document.body.classList.toggle('studio-canvas-selection',!!onCanvas);
   if(media.matches&&document.body.classList.contains('studio-drawer-open')){
     if(onCanvas&&!document.body.classList.contains('studio-drawer-peek')){setPeek(true);autoPeek=true;}
     else if(!onCanvas&&autoPeek){setPeek(false);}
   }
 });
 if($('nmProperties'))observer.observe($('nmProperties'),{attributes:true,attributeFilter:['hidden']});
 if($('visualEditor'))observer.observe($('visualEditor'),{attributes:true,attributeFilter:['hidden']});
 // Start with preview unobstructed on phones, content visible on tablets and desktop.
 setView('content');
 if(media.matches){document.body.classList.remove('studio-drawer-open');head.hidden=true;}
 document.body.classList.add('studio-ready');
})();
