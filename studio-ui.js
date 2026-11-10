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
 // Studio 0.16: single-entry quick tools, routed to the existing tested editor actions.
 const insertBar=document.createElement('div');insertBar.className='studio-insert-bar';insertBar.setAttribute('role','toolbar');insertBar.setAttribute('aria-label','إضافة عناصر إلى المشهد');
 const insert=(label,id)=>{const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=label;b.addEventListener('click',()=>{setView('elements');$(''+id)?.click();if(id==='nmAddText'||id==='nmAddMath'){$('nmContent')?.focus();if(media.matches)document.body.classList.add('studio-drawer-open');}});insertBar.append(b)};
 insert('＋ نص','nmAddText');insert('∑ معادلة','nmAddMath');
 const help=document.createElement('button');help.type='button';help.className='secondary';help.textContent='؟ طريقة العمل';help.setAttribute('aria-expanded','false');insertBar.append(help);
 const hint=document.createElement('div');hint.className='studio-quick-help';hint.hidden=true;hint.textContent='أضف نصاً أو معادلة، حرّر المحتوى في لوحة العناصر، ثم اسحب العنصر على معاينة الفيديو. استخدم الحركة لتحديد توقيت ظهوره. الحفظ والتصدير من الأدوات الموجودة.';
 help.addEventListener('click',()=>{hint.hidden=!hint.hidden;help.setAttribute('aria-expanded',String(!hint.hidden))});
 preview.insertBefore(toolbar,preview.firstChild);
 toolbar.after(insertBar);insertBar.after(hint);
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
   editor.scrollTop=0;scenes.scrollTop=0;
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
   if(active&&!media.matches&&mode!=='elements'&&mode!=='motion')setView('elements');
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
