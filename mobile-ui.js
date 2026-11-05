/* Nibor Motion mobile-first interface: only DOM layout; no changes to render(), state or exports. */
'use strict';
(function(){
 const media=window.matchMedia('(max-width:760px)');
 const panel=document.querySelector('.editor-panel');
 const nav=document.querySelector('.mobile-bottom-nav');
 const head=document.getElementById('mobileSheet');
 const title=document.getElementById('mobileSheetTitle');
 const closeButton=document.getElementById('mobileSheetClose');
 if(!panel||!nav||!head)return;
 let mode='';
 // Existing editor input nodes are reused so all app.js event listeners stay attached.
 Array.from(panel.children).forEach(child=>{
   if(child.tagName==='H2')return;
   if(child.classList.contains('audio-panel'))child.classList.add('nm-ui-audio');
   else if(child.classList.contains('nm-settings'))child.classList.add('nm-ui-design');
   else child.classList.add('nm-ui-edit');
 });
 const labels={scenes:'المشاهد والمشروع',edit:'تحرير المشهد',audio:'صوت المشهد',design:'الخطوط والحركات والتصميم'};
 function setView(next){
   const isMobile=media.matches;
   mode=isMobile&&next!=='export'&&next!==mode?next:'';
   document.body.classList.toggle('mobile-sheet-open',!!mode);
   if(mode)document.body.dataset.mobileView=mode;
   else delete document.body.dataset.mobileView;
   head.hidden=!mode;
   title.textContent=labels[mode]||'أدوات التحرير';
   Array.from(nav.querySelectorAll('[data-mobile-tab]')).forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.mobileTab===mode)));
   const active=mode==='scenes'?document.querySelector('.scenes-panel'):document.querySelector('.editor-panel');
   if(mode&&active)active.scrollTop=0;
   if(next==='export')document.getElementById('export')?.scrollIntoView({block:'center',behavior:'smooth'});
 }
 nav.addEventListener('click',e=>{
   const b=e.target.closest('[data-mobile-tab]');if(b)setView(b.dataset.mobileTab);
 });
 closeButton.addEventListener('click',()=>setView(''));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mode)setView('')});
 media.addEventListener('change',()=>{if(!media.matches)setView('')});
 // When a sticker is selected on the canvas, keep preview visible; editing is one tap away.
})();
