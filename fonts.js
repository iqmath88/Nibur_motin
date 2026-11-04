'use strict';
window.NM=window.NM||{};
(function(NM){
 const families={system:'system-ui',cairo:'"NM Cairo", system-ui',noto:'"NM Noto Arabic", system-ui'};
 const resources=[['NM Cairo',700,'fonts/Cairo-Bold.woff2'],['NM Noto Arabic',400,'fonts/NotoSansArabic-Regular.woff2'],['NM Noto Arabic',700,'fonts/NotoSansArabic-Bold.woff2']];
 let loaded=new Set(),promise=null;
 NM.fonts={
  clean(x){return {heading:['system','cairo','noto'].includes(x?.heading)?x.heading:'system',body:['system','cairo','noto'].includes(x?.body)?x.body:'system'}},
  font(role,weight,size){const choice=(NM.project?.fonts?.[role==='heading'?'heading':'body'])||'system';const family=choice!=='system'&&loaded.has(choice)?families[choice]:'system-ui';return `${weight} ${size}px ${family}, sans-serif`},
  async ready(report){if(promise)return promise;promise=(async()=>{if(!window.FontFace||!document.fonts){report?.('خطوط الجهاز متاحة؛ تعذّر تفعيل الخطوط المضمّنة');return}for(const [family,weight,path] of resources){try{const face=await new FontFace(family,`url("${path}")`,{style:'normal',weight:String(weight)}).load();document.fonts.add(face);loaded.add(family==='NM Cairo'?'cairo':'noto')}catch(e){report?.('الخطوط المضمّنة غير متوفرة؛ سيُستخدم خط النظام')}}await document.fonts.ready})();return promise},
  isReady(choice){return choice==='system'||loaded.has(choice)},
  reset(){promise=null}
 };
 NM.font=(role,weight,size)=>NM.fonts.font(role,weight,size);
})(window.NM);
