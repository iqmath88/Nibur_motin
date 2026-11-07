/* Nibor Motion v0.14.0 Studio workspace.
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
     else if(el.matches('.typography-panel,.nm-question-advanced'))section='advanced';
     else if(el.matches('.question-math-tools,.nm-question-composer-wrap,.math-tools'))section='content';
     else if(el.matches('.nm-settings')){
       const first=el.querySelector('summary')?.textContent||'';
       section=/حركة المعادلة|الخطاف|المناطق الآمنة/.test(first)?'motion':/الموسيقى/.test(first)?'audio':'advanced';
     }
     else if(el.matches('fieldset'))section='motion';
     else if(['duration','qAt','eAt','aAt'].includes(id)||input==='duration')section='motion';
     else if(['title','equation','answer','mathHost'].includes(id)||['title','question','equation','answer'].includes(input))section='content';
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
 $('mobileSheetClose')?.addEventListener('click',()=>document.body.classList.remove('studio-drawer-open'));
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&media.matches)document.body.classList.remove('studio-drawer-open')});
 media.addEventListener('change',()=>{document.body.classList.remove('studio-drawer-open');head.hidden=!media.matches});
 // Quick access to element-specific properties when selection changes, without disturbing Canvas touch handling.
 const observer=new MutationObserver(()=>{
   const active=($('nmProperties')&&!$('nmProperties').hidden)||($('visualEditor')&&!$('visualEditor').hidden);
   document.body.classList.toggle('studio-selection-active',!!active);
 });
 if($('nmProperties'))observer.observe($('nmProperties'),{attributes:true,attributeFilter:['hidden']});
 if($('visualEditor'))observer.observe($('visualEditor'),{attributes:true,attributeFilter:['hidden']});
 // Start with preview unobstructed on phones, content visible on tablets and desktop.
 setView('content');
 if(media.matches){document.body.classList.remove('studio-drawer-open');head.hidden=true;}
 document.body.classList.add('studio-ready');
})();
