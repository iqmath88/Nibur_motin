'use strict';
window.NM=window.NM||{};
(function(NM){
 const $=id=>document.getElementById(id);
 const num=(v,lo,hi,def)=>Number.isFinite(Number(v))?Math.min(hi,Math.max(lo,Number(v))):def;
 const MAX_KEYS=40;
 const round=n=>Math.round(n*1000)/1000;
 function clean(item){
  const keyframes=Array.isArray(item?.keyframes)?item.keyframes.slice(0,MAX_KEYS):[];
  return {
   start:num(item?.start,0,120,0),
   end:item?.end===null||item?.end===undefined?null:num(item.end,0,120,120),
   keyframes:keyframes.map(k=>({t:num(k?.t,0,120,0),x:num(k?.x,.05,.95,.5),y:num(k?.y,.05,.95,.5),scale:num(k?.scale,.2,3,1),rotation:num(k?.rotation,-360,360,0),opacity:num(k?.opacity,0,1,1)})).sort((a,b)=>a.t-b.t)
  };
 }
 function evaluate(item,elapsed,duration){
  const start=num(item.start,0,duration,0),end=item.end==null?duration:num(item.end,0,duration,duration);
  if(elapsed+0.0001<start||elapsed-0.0001>end||end<start)return null;
  const keys=Array.isArray(item.keyframes)?item.keyframes:[];
  if(!keys.length)return {...item,scale:1,rotation:0};
  const original={t:0,x:item.x,y:item.y,scale:1,rotation:0,opacity:item.opacity};
  const ordered=[original,...keys].sort((a,b)=>a.t-b.t);
  const t=Math.max(0,elapsed);
  let left=ordered[0],right=ordered[ordered.length-1];
  for(let i=0;i<ordered.length-1;i++)if(t>=ordered[i].t&&t<=ordered[i+1].t){left=ordered[i];right=ordered[i+1];break}
  if(t<ordered[0].t)right=left;
  if(t>ordered.at(-1).t)left=right;
  const f=right.t===left.t?0:Math.max(0,Math.min(1,(t-left.t)/(right.t-left.t)));
  const lerp=k=>left[k]+(right[k]-left[k])*f;
  return {...item,x:lerp('x'),y:lerp('y'),scale:lerp('scale'),rotation:lerp('rotation'),opacity:lerp('opacity')};
 }
 let api=null,selected=null,selectedLegacy=null,drag=null;
 const panel=()=>$('nmTimelineEditor');
 const scene=()=>api?.scene();
 const chosen=()=>scene()?.elements.find(e=>e.id===selected);
 const elapsed=()=>api?Math.max(0,Math.min(scene().duration,api.elapsed())):0;
 const fmt=v=>`${Number(v).toFixed(1)}ث`;
 function focus(id){selected=id;selectedLegacy=null;refresh()}
 // Legacy tracks use their original percentage fields. No migration of old projects.
 function legacySpan(scene,kind,id){
  const d=scene.duration;
  if(kind==='sticker'){
   const st=(scene.stickers||[]).find(x=>x.id===id);if(!st)return null;
   return {start:st.start/100*d,end:st.end/100*d};
  }
  const prop={question:'qAt',equation:'eAt',answer:'aAt'}[kind];
  return prop?{start:(scene[prop]||0)/100*d,end:d}:null;
 }
 function legacySet(scene,kind,id,start,end){
  const d=scene.duration,step=Math.min(.1,d/100),span=legacySpan(scene,kind,id);if(!span)return false;
  if(kind==='sticker'){
   const st=scene.stickers.find(x=>x.id===id);
   let a=num(start,0,d,span.start),b=num(end,a+step,d,span.end);
   a=Math.min(a,b-step);
   st.start=Math.round(Math.min(95,a/d*100));
   st.end=Math.round(Math.max(st.start+1,Math.min(100,b/d*100)));
   return true;
  }
  const prop={question:'qAt',equation:'eAt',answer:'aAt'}[kind];
  scene[prop]=Math.round(num(start,0,d*.95,span.start)/d*100);
  return true;
 }
 function selectLegacy(kind,id){selected=null;selectedLegacy={kind,id};api.select(null);refresh()}
 function setLegacySpan(start,end){
  if(!selectedLegacy||api.playing())return;
  const s=scene();if(legacySet(s,selectedLegacy.kind,selectedLegacy.id,start,end)){
   api.commitLegacy();refresh();
  }
 }
 function addLegacyTrack(label,kind,id,color){
  const s=scene(),d=s.duration,span=legacySpan(s,kind,id);if(!span)return;
  const active=selectedLegacy?.kind===kind&&selectedLegacy?.id===id;
  const row=document.createElement('div');row.className='nm-track-row';
  const name=document.createElement('button');name.type='button';name.className='nm-track-label nm-legacy-label'+(active?' active':'');name.textContent=label;name.onclick=()=>selectLegacy(kind,id);
  const strip=document.createElement('div');strip.className='nm-track-strip nm-legacy-strip';strip.setAttribute('role','button');strip.tabIndex=0;strip.setAttribute('aria-label',label+'، اضغط للانتقال إلى الوقت');
  const bar=document.createElement('div');bar.className='nm-track-bar nm-legacy-bar'+(active?' selected':'');bar.style.background=color;bar.style.left=span.start/d*100+'%';bar.style.width=Math.max(0,(span.end-span.start)/d*100)+'%';
  const startHandle=document.createElement('button');startHandle.type='button';startHandle.className='nm-track-handle nm-track-handle-start';startHandle.setAttribute('aria-label','اسحب لتغيير بداية '+label);startHandle.title='اسحب لتغيير البداية';
  const endHandle=document.createElement('button');endHandle.type='button';endHandle.className='nm-track-handle nm-track-handle-end';endHandle.setAttribute('aria-label','اسحب لتغيير نهاية '+label);endHandle.title='اسحب لتغيير النهاية';
  strip.append(bar,startHandle);if(kind==='sticker')strip.append(endHandle);
  function placeHandles(){startHandle.style.left=span.start/d*100+'%';endHandle.style.left=span.end/d*100+'%'}placeHandles();
  const toTime=e=>{const r=strip.getBoundingClientRect();return num((e.clientX-r.left)/Math.max(1,r.width)*d,0,d,0)};
  strip.addEventListener('click',e=>{if(drag||e.target.closest('.nm-track-handle'))return;selectLegacy(kind,id);api.seek(toTime(e))});
  strip.addEventListener('keydown',e=>{if(e.target!==strip)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();selectLegacy(kind,id);api.seek(span.start)}});
  for(const [handle,edge] of [[startHandle,'start'],[endHandle,'end']]){
   if(kind!=='sticker'&&edge==='end')continue;
   handle.addEventListener('pointerdown',e=>{if(api.playing())return;e.preventDefault();e.stopPropagation();selectedLegacy={kind,id};selected=null;drag={pointerId:e.pointerId,kind,id,edge,strip,handle,begin:span.start,finish:span.end};handle.setPointerCapture(e.pointerId);refreshLegacyFields();});
   handle.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.pointerId||drag.handle!==handle)return;e.preventDefault();const t=toTime(e);const gap=Math.min(.1,d/100);const begin=edge==='start'?Math.min(t,drag.finish-gap):drag.begin;const finish=edge==='end'?Math.max(t,drag.begin+gap):drag.finish;legacySet(s,kind,id,begin,finish);const updated=legacySpan(s,kind,id);span.start=updated.start;span.end=updated.end;bar.style.left=span.start/d*100+'%';bar.style.width=(span.end-span.start)/d*100+'%';placeHandles();refreshLegacyFields();api.draw();});
   const finishDrag=e=>{if(!drag||e.pointerId!==drag.pointerId||drag.handle!==handle)return;drag=null;api.commitLegacy();refresh()};
   handle.addEventListener('pointerup',finishDrag);handle.addEventListener('pointercancel',finishDrag);
  }
  row.append(name,strip);$('nmTracks').append(row);
 }
 function refreshLegacyFields(){
  const box=$('nmLegacyProperties');if(!box)return;
  const s=scene(),chosen=selectedLegacy,span=chosen&&legacySpan(s,chosen.kind,chosen.id);
  box.hidden=!span;if(!span)return;
  $('nmLegacyName').textContent={question:'السؤال',equation:'المعادلة',answer:'النتيجة',sticker:'الملصق'}[chosen.kind];
  $('nmLegacyStart').value=round(span.start);$('nmLegacyEnd').value=round(span.end);
  $('nmLegacyStart').max=s.duration;$('nmLegacyEnd').max=s.duration;
  $('nmLegacyEndWrap').hidden=chosen.kind!=='sticker';
  $('nmLegacyHint').textContent=chosen.kind==='sticker'?'اسحب مقبضي المسار لتحديد البداية والنهاية، أو أدخل الوقت بالثواني.':'اسحب مقبض البداية؛ يبقى العنصر ظاهراً حتى نهاية المشهد.';
 }

 function refresh(){
  if(!api||!panel())return;
  const s=scene();if(!s)return;
  const tracks=$('nmTracks');tracks.replaceChildren();
  const d=s.duration;
  s.elements.forEach((item,i)=>{
   const row=document.createElement('div');row.className='nm-track-row';
   const label=document.createElement('button');label.type='button';label.className='nm-track-label'+(item.id===selected?' active':'');label.textContent=(item.type==='math'?'∑ ':'نص ')+(i+1);label.title=item.content.slice(0,70);label.onclick=()=>{selected=item.id;api.select(item.id);refresh()};
   const strip=document.createElement('div');strip.className='nm-track-strip';strip.setAttribute('role','button');strip.tabIndex=0;strip.setAttribute('aria-label','الانتقال إلى زمن العنصر '+(i+1));
   const begin=num(item.start,0,d,0),finish=item.end==null?d:num(item.end,0,d,d);
   const bar=document.createElement('div');bar.className='nm-track-bar'+(item.id===selected?' selected':'');bar.style.left=(begin/d*100)+'%';bar.style.width=(Math.max(0,finish-begin)/d*100)+'%';
   item.keyframes?.forEach(k=>{const mark=document.createElement('i');mark.className='nm-key-dot';mark.style.left=((k.t-begin)/Math.max(.001,finish-begin)*100)+'%';bar.append(mark)});
   strip.append(bar);
   const jump=e=>{const r=strip.getBoundingClientRect();const at=Math.max(0,Math.min(d,(e.clientX-r.left)/r.width*d));selected=item.id;api.select(item.id);api.seek(at);refresh()};
   strip.addEventListener('click',jump);strip.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selected=item.id;api.select(item.id);api.seek(begin);refresh()}});
   row.append(label,strip);tracks.append(row);
  });
  if(s.question)addLegacyTrack('السؤال','question',null,'#bea153');
  if(s.equation)addLegacyTrack('المعادلة','equation',null,'#5c8dbe');
  if(s.answer)addLegacyTrack('النتيجة','answer',null,'#55a588');
  for(const sticker of s.stickers||[])addLegacyTrack('ملصق '+sticker.icon,'sticker',sticker.id,'#9b7fc1');
  if(s.voiceDuration>0){const row=document.createElement('div');row.className='nm-track-row';const name=document.createElement('span');name.className='nm-track-label nm-readonly';name.textContent='التعليق';const strip=document.createElement('div');strip.className='nm-track-strip nm-readonly';const bar=document.createElement('div');bar.className='nm-track-bar';bar.style.background='#478c87';bar.style.left='0%';bar.style.width=Math.min(100,s.voiceDuration/d*100)+'%';strip.append(bar);row.append(name,strip);tracks.append(row)}
  refreshLegacyFields();
  const item=chosen();$('nmKeyProperties').hidden=!item;
  $('nmElapsed').textContent=fmt(elapsed());
  if(item){
   $('nmTrackStart').value=num(item.start,0,d,0);
   $('nmTrackEnd').value=item.end==null?d:num(item.end,0,d,d);
   const k=nearestKey(item,elapsed());$('nmKeyList').replaceChildren();
   for(const key of item.keyframes||[]){const b=document.createElement('button');b.type='button';b.textContent='◆ '+fmt(key.t);b.className=k===key?'active':'';b.onclick=()=>{api.seek(key.t);refresh()};$('nmKeyList').append(b)}
   $('nmKeyIndicator').textContent=k?'الإطار المفتاحي عند '+fmt(k.t):'حرّك مؤشر الوقت، ثم أضف إطاراً مفتاحياً';
   const values=k||evaluate(item,elapsed(),d)||item;
   for(const [id,key] of [['nmKeyX','x'],['nmKeyY','y'],['nmKeyScale','scale'],['nmKeyRotation','rotation'],['nmKeyOpacity','opacity']])$(id).value=key==='opacity'?Math.round(values[key]*100):key==='x'||key==='y'?Math.round(values[key]*100):values[key]??(key==='scale'?1:0);
  }
  position();
 }
 function position(){if(!api||!$('nmTimelineCursor'))return;const s=scene();if(!s)return;$('nmTimelineCursor').style.left=(elapsed()/s.duration*100)+'%';$('nmElapsed').textContent=fmt(elapsed())}
 function nearestKey(item,t){return (item.keyframes||[]).find(k=>Math.abs(k.t-t)<.06)||null}
 function changeSpan(){if(!chosen()||api.playing())return;const item=chosen(),d=scene().duration;item.start=num($('nmTrackStart').value,0,d,0);item.end=num($('nmTrackEnd').value,item.start,d,d);api.commit();refresh()}
 function addKey(){if(!chosen()||api.playing())return;const item=chosen(),t=round(elapsed());if(t<=0){api.status('انتقل إلى زمن أكبر من الصفر لإضافة إطار مفتاحي');return}if((item.keyframes||[]).length>=MAX_KEYS)return api.status('وصل العنصر إلى الحد الأقصى للإطارات المفتاحية');if(nearestKey(item,t))return api.status('يوجد إطار مفتاحي عند هذا التوقيت');const v=evaluate(item,t,scene().duration)||item;item.keyframes.push({t,x:v.x,y:v.y,scale:v.scale||1,rotation:v.rotation||0,opacity:v.opacity});item.keyframes.sort((a,b)=>a.t-b.t);api.commit();refresh()}
 function removeKey(){const item=chosen();if(!item||api.playing())return;const t=elapsed(),key=nearestKey(item,t);if(!key)return;item.keyframes=item.keyframes.filter(k=>k!==key);api.commit();refresh()}
 function editKey(field,value){const item=chosen();if(!item||api.playing())return;const key=nearestKey(item,elapsed());if(!key){api.status('أضف إطاراً مفتاحياً عند الوقت الحالي قبل تعديل الحركة');refresh();return}
  if(field==='x'||field==='y')key[field]=num(value/100,.05,.95,key[field]);
  if(field==='opacity')key.opacity=num(value/100,0,1,key.opacity);
  if(field==='scale')key.scale=num(value,.2,3,key.scale);
  if(field==='rotation')key.rotation=num(value,-360,360,key.rotation);
  api.commit();api.draw();
 }
 function init(bridge){api=bridge;
  for(const id of ['nmLegacyStart','nmLegacyEnd'])$(id)?.addEventListener('change',()=>{
   if(!selectedLegacy||api.playing())return;
   const span=legacySpan(scene(),selectedLegacy.kind,selectedLegacy.id);if(!span)return;
   setLegacySpan(id==='nmLegacyStart'?Number($('nmLegacyStart').value):span.start,id==='nmLegacyEnd'?Number($('nmLegacyEnd').value):span.end);
  });for(const [id,fn] of [['nmAddKey',addKey],['nmRemoveKey',removeKey],['nmTrackStart',changeSpan],['nmTrackEnd',changeSpan]])$(id)?.addEventListener(id.startsWith('nmTrack')?'change':'click',fn);for(const [id,k] of [['nmKeyX','x'],['nmKeyY','y'],['nmKeyScale','scale'],['nmKeyRotation','rotation'],['nmKeyOpacity','opacity']])$(id)?.addEventListener('change',e=>editKey(k,Number(e.target.value)));refresh()}
 NM.timelineEditor={clean,evaluate,init,refresh,position,focus,legacySpan,legacySet,selected:()=>selected};
})(window.NM);
