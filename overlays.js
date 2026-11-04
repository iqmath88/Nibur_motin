'use strict';
window.NM=window.NM||{};
(function(NM){
 const allowed=['none','tiktok','reels','shorts'];
 const guides={tiktok:{top:170,bottom:380,right:205},reels:{top:160,bottom:350,right:185},shorts:{top:155,bottom:310,right:190}}; // Approximate only; subject to platform changes.
 const project=x=>({progress:x?.progress===true,progressColor:/^#[0-9a-fA-F]{6}$/.test(x?.progressColor||'')?x.progressColor:'#f4d96c',safeGuide:allowed.includes(x?.safeGuide)?x.safeGuide:'none'});
 const scene=x=>({sceneType:x?.sceneType==='hook'?'hook':'normal'});
 function hook(c,s,p,theme,drawText){if(s.sceneType!=='hook')return false;const fg=['dark','blackboard'].includes(theme)?'#ffffff':'#173a5c';c.save();c.fillStyle=theme==='dark'?'#2b4166':theme==='blackboard'?'#20584c':'#e1ebf4';c.fillRect(0,0,1080,1920);const q=Math.min(1,p/.38),scale=.85+.15*(1-Math.pow(1-q,3))+.025*Math.sin(Math.PI*Math.min(1,p/.65));c.translate(540,900);c.scale(scale,scale);c.translate(-540,-900);drawText(c,s.title,540,900,920,Math.min(96,s.titleSize||96),fg,800,'rtl',4,48,480);c.restore();return true}
 function progress(c,opt,time,total){if(!opt.progress)return;c.save();c.fillStyle='rgba(0,0,0,.2)';c.fillRect(0,0,1080,8);c.fillStyle=opt.progressColor;c.fillRect(0,0,1080*Math.max(0,Math.min(1,time/Math.max(.0001,total))),8);c.restore()}
 function guide(c,name){if(name==='none'||!guides[name])return;c.save();const g=guides[name];c.fillStyle='rgba(237,70,90,.13)';c.fillRect(0,0,1080,g.top);c.fillRect(0,1920-g.bottom,1080,g.bottom);c.fillRect(1080-g.right,0,g.right,1920);c.setLineDash([18,14]);c.lineWidth=4;c.strokeStyle='rgba(218,50,75,.8)';c.strokeRect(1,g.top,1080-g.right-1,1920-g.top-g.bottom);c.restore()}
 function intersects(rect,name){if(!rect||!guides[name])return false;const g=guides[name];return rect.y<g.top||rect.y+rect.h>1920-g.bottom||rect.x+rect.w>1080-g.right}
 NM.overlays={project,scene,hook,progress,guide,intersects,guides,ideas:['٩٠٪ يخطئون في هذه المسألة','حلها في ١٠ ثوانٍ','هل تعرف الجواب؟']};
})(window.NM);
