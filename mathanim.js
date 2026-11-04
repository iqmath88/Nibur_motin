'use strict';
window.NM=window.NM||{};
(function(NM){
 const bound=(v,a,b,d)=>Number.isFinite(Number(v))?Math.max(a,Math.min(b,Number(v))):d;
 const settings=s=>({equationAnim:['fade','write','highlight','fromPrevious'].includes(s?.equationAnim)?s.equationAnim:'fade',equationAnimDuration:bound(s?.equationAnimDuration,10,60,25),highlightAt:bound(s?.highlightAt,0,100,65)});
 function replaceMarks(raw,apply){const str=String(raw||'');let out='',i=0;while(i<str.length){if(str.startsWith('\\mark{',i)){let start=i+6,depth=1,j=start;for(;j<str.length;j++){if(str[j]==='{')depth++;else if(str[j]==='}'&&--depth===0)break}if(depth===0){out+=apply(str.slice(start,j));i=j+1;continue}}out+=str[i++]}return out}
 function plain(raw){return replaceMarks(raw,inner=>inner)}
 function marked(raw,color){return replaceMarks(raw,inner=>`{\\color{${color}}{${inner}}}`)}
 function variants(scene,fg,highlight){let base=plain(scene.equation),colored=marked(scene.equation,highlight);return scene.equationAnim==='highlight'&&/\\mark\{/.test(scene.equation)?[[base,fg],[colored,fg]]:[[base,fg]]}
 function draw(c,scene,p,previous,drawFormula,baseColor,accent){const e=scene.eAt/100,mode=scene.equationAnim||'fade',duration=(scene.equationAnimDuration||25)/100,rel=Math.max(0,Math.min(1,(p-e)/duration));if(p<e&&mode!=='fromPrevious')return;
 if(mode==='write'){c.save();const x=540,y=1920*scene.equationY/100,w=865*scene.equationScale/100,h=175*scene.equationScale/100;c.beginPath();c.rect(x-w/2,y-h/2,w*rel,h);c.clip();drawFormula(plain(scene.equation),baseColor);c.restore();if(rel<1){c.save();c.fillStyle=accent;c.beginPath();c.arc(x-w/2+w*rel,y,11,0,Math.PI*2);c.fill();c.restore()}return}
 if(mode==='highlight'&&/\\mark\{/.test(scene.equation)){const cross=Math.max(0,Math.min(1,(p-scene.highlightAt/100)/.12));c.save();c.globalAlpha=1-cross;drawFormula(plain(scene.equation),baseColor);c.restore();if(cross>0){c.save();c.globalAlpha=cross;const pulse=1+.04*Math.sin(Math.PI*cross);c.translate(540,1920*scene.equationY/100);c.scale(pulse,pulse);c.translate(-540,-1920*scene.equationY/100);drawFormula(marked(scene.equation,accent),baseColor);c.restore()}return}
 if(mode==='fromPrevious'&&previous&&p<.2){const k=Math.min(1,p/.2),cx=540,cy=1920*scene.equationY/100;c.save();c.globalAlpha=1-k;c.translate(0,-48*k);drawFormula(plain(previous.equation),baseColor);c.restore();c.save();c.globalAlpha=k;drawFormula(plain(scene.equation),baseColor);c.restore();return}
 c.save();c.globalAlpha=(mode==='fade'||(mode==='fromPrevious'&&!previous))?Math.max(0,Math.min(1,(p-e)/.09)):1;drawFormula(plain(scene.equation),baseColor);c.restore();}
 NM.mathanim={settings,plain,marked,variants,draw};
})(window.NM);
