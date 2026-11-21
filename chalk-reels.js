/* Nibor Motion — ريلز السبورة الطباشيرية (Chalkboard reels).
 * المحرك والمثالان منقولة من Math-books (v2/reels: chalk.js, cone.js, ladder.js) داخل دالة مغلقة حتى لا تتعارض أسماؤها مع التطبيق.
 * مشهد فيه الحقل chalk = {reel, seg} يُرسم من مقطع seg من الريلز؛ الرسم دالة في الزمن وحده (حتمي للتصدير). */
(function(){
'use strict';

/* =====================================================================================
   محرك «ريلز السبورة» المشترك: السبورة، الطباشير، الكتابة التدريجية، الرياضيات المكتوبة باليد، الخطوط والدوائر.
   كل ريلز في ملف خاص (cone.js, ladder.js) يسجّل نفسه في window.REELS ويرسم بهذه الأدوات.
   كل رقم ومستوى في الرسوم محسوب من معادلات الكتاب؛ الرسم حتمي: الإطار عند الزمن t لا يعتمد إلا على t.
   ===================================================================================== */
const W=1080,H=1920, PI=Math.PI;
const cv=Object.assign(document.createElement('canvas'),{width:1080,height:1920}), g=cv.getContext('2d');
const layer=document.createElement('canvas'); layer.width=W; layer.height=H; const L=layer.getContext('2d');
const WHITE='#f3f1ea', ORANGE='#f6a259', BLUE='#8fd3ff', DIM='rgba(243,241,234,.55)';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)), ease=x=>{x=clamp(x);return x*x*(3-2*x)}, easeOut=x=>1-Math.pow(1-clamp(x),3);
const prog=(t,a,b)=>clamp((t-a)/(b-a));
/* fade in at a, out at b */
const vis=(t,a,b,fi=.45,fo=.45)=>Math.min(ease((t-a)/fi),1-ease((t-(b-fo))/fo));
function rng(seed){ let s=seed>>>0||1; return ()=>{ s^=s<<13; s^=s>>>17; s^=s<<5; return ((s>>>0)%100000)/100000; }; }

/* ---------- the board: slate gradient, smudges, dust, vignette (baked once) ---------- */
const board=document.createElement('canvas'); board.width=W; board.height=H;
(()=>{ const b=board.getContext('2d'), r=rng(7);
  const gr=b.createLinearGradient(0,0,W,H); gr.addColorStop(0,'#24302f'); gr.addColorStop(.5,'#1c2726'); gr.addColorStop(1,'#151d1d'); b.fillStyle=gr; b.fillRect(0,0,W,H);
  for(let i=0;i<70;i++){ const x=r()*W,y=r()*H,rad=80+r()*260; const s=b.createRadialGradient(x,y,0,x,y,rad); s.addColorStop(0,`rgba(220,230,225,${.018+r()*.03})`); s.addColorStop(1,'rgba(220,230,225,0)'); b.fillStyle=s; b.fillRect(x-rad,y-rad,2*rad,2*rad); }
  b.strokeStyle='rgba(230,235,230,.035)'; b.lineCap='round';
  for(let i=0;i<26;i++){ b.lineWidth=30+r()*60; b.beginPath(); const x=r()*W,y=r()*H,a=(r()-.5)*.6; b.moveTo(x,y); b.bezierCurveTo(x+200,y+a*200,x+400,y-a*120,x+520+r()*300,y+a*90); b.stroke(); }
  const id=b.getImageData(0,0,W,H), d=id.data; for(let i=0;i<d.length;i+=4){ const n=(r()-.5)*14; d[i]+=n; d[i+1]+=n; d[i+2]+=n; } b.putImageData(id,0,0);
  for(let i=0;i<2600;i++){ b.fillStyle=`rgba(235,235,225,${r()*.12})`; b.fillRect(r()*W,r()*H,1+r()*2,1+r()*2); }
  const v=b.createRadialGradient(W/2,H*.45,H*.25,W/2,H*.5,H*.75); v.addColorStop(0,'rgba(0,0,0,0)'); v.addColorStop(1,'rgba(0,0,0,.55)'); b.fillStyle=v; b.fillRect(0,0,W,H); })();
/* chalk grain: alpha 0.55–1 with tiny holes, applied to everything drawn in chalk */
const grain=document.createElement('canvas'); grain.width=W; grain.height=H;
(()=>{ const c=grain.getContext('2d'), id=c.createImageData(W,H), d=id.data, r=rng(99);
  for(let i=0;i<d.length;i+=4){ const v=r(); d[i]=d[i+1]=d[i+2]=255; d[i+3]=v<.06?40:150+Math.floor(r()*105); } c.putImageData(id,0,0); })();

/* ---------- chalk text ---------- */
const AR='Ruqaa', LT='Chalk';
function textW(s,font){ L.font=font; return L.measureText(s).width; }
/* write-on: the text appears from its start (right for Arabic, left for Latin) */
function write(s,x,y,size,o={}){ const p=o.p??1; if(p<=0) return; const ar=/[؀-ۿ]/.test(s), font=`${o.w||700} ${size}px ${ar?(o.f==='b'?'Body':AR)+", "+LT:LT}`;
  L.save(); L.font=font; L.textAlign='center'; L.textBaseline='alphabetic'; L.direction=ar?'rtl':'ltr'; const w=L.measureText(s).width; if(o.align==='end') x-=w/2; if(o.align==='start') x+=w/2;
  const x0=x-w/2-20, x1=x+w/2+20, cut=(x1-x0)*easeOut(p);
  L.beginPath(); if(ar) L.rect(x1-cut,y-size*1.4,cut,size*2.2); else L.rect(x0,y-size*1.4,cut,size*2.2); L.clip();
  L.globalAlpha=o.a??1; L.fillStyle=o.col||WHITE; if(o.glow){ L.shadowColor=o.col||WHITE; L.shadowBlur=o.glow; }
  L.fillText(s,x,y); L.restore();
  if(p<1&&p>0) tip(ar?x1-cut:x0+cut,y-size*.35,o.col||WHITE); return w; }
let TIPS=[]; function tip(x,y,col){ TIPS.push([x,y,col]); }

/* ---------- hand-written math: strings, fractions {f:[a,b]}, powers {s:[a,b]}, colour {c,e}; π ≈ ⇒ drawn by hand ---------- */
function mW(e,sz){ if(typeof e==='string'){ let w=0; for(const ch of e) w+= ch==='π'?sz*.62: ch==='≈'?sz*.7: ch==='⇒'?sz*.95: ch==='θ'?sz*.5: textW(ch,`700 ${sz}px ${LT}`); return w; }
  if(Array.isArray(e)) return e.reduce((a,x)=>a+mW(x,sz),0);
  if(e.f) return Math.max(mW(e.f[0],sz*.82),mW(e.f[1],sz*.82))+sz*.36;
  if(e.s) return mW(e.s[0],sz)+mW(e.s[1],sz*.6)+sz*.04;
  if(e.c) return mW(e.e,sz); if(e.sp) return sz*e.sp; return 0; }
function mDraw(e,x,y,sz,col){ if(typeof e==='string'){ for(const ch of e){ if(ch==='π'){ glyphPi(x,y,sz,col); x+=sz*.62; } else if(ch==='≈'){ glyphApprox(x,y,sz,col); x+=sz*.7; } else if(ch==='⇒'){ glyphImp(x,y,sz,col); x+=sz*.95; } else if(ch==='θ'){ glyphTheta(x,y,sz,col); x+=sz*.5; }
      else { L.font=`700 ${sz}px ${LT}`; L.fillStyle=col; L.textAlign='left'; L.direction='ltr'; L.fillText(ch,x,y); x+=textW(ch,L.font); } } return x; }
  if(Array.isArray(e)){ for(const it of e) x=mDraw(it,x,y,sz,col); return x; }
  if(e.f){ const s2=sz*.82, w=mW(e,sz), a=mW(e.f[0],s2), b=mW(e.f[1],s2), bar=y-sz*.3;
    mDraw(e.f[0],x+(w-a)/2,bar-sz*.14,s2,col); mDraw(e.f[1],x+(w-b)/2,bar+sz*.66,s2,col);
    L.strokeStyle=col; L.lineWidth=Math.max(3,sz*.055); L.lineCap='round'; L.beginPath(); L.moveTo(x+sz*.08,bar+1); L.quadraticCurveTo(x+w/2,bar-2,x+w-sz*.08,bar+1.5); L.stroke(); return x+w; }
  if(e.s){ x=mDraw(e.s[0],x,y,sz,col); return mDraw(e.s[1],x+sz*.02,y-sz*.42,sz*.6,col); }
  if(e.c) return mDraw(e.e,x,y,sz,e.c); if(e.sp) return x+sz*e.sp; return x; }
function glyphPi(x,y,sz,col){ L.strokeStyle=col; L.lineWidth=sz*.075; L.lineCap='round'; L.beginPath();
  L.moveTo(x+sz*.04,y-sz*.48); L.quadraticCurveTo(x+sz*.3,y-sz*.56,x+sz*.58,y-sz*.5);
  L.moveTo(x+sz*.2,y-sz*.5); L.quadraticCurveTo(x+sz*.2,y-sz*.18,x+sz*.1,y); L.moveTo(x+sz*.42,y-sz*.5); L.quadraticCurveTo(x+sz*.38,y-sz*.1,x+sz*.52,y-sz*.02); L.stroke(); }
function glyphTheta(x,y,sz,col){ L.strokeStyle=col; L.lineWidth=sz*.065; L.lineCap='round'; L.beginPath();
  L.ellipse(x+sz*.25,y-sz*.34,sz*.15,sz*.33,.08,0,2*PI); L.moveTo(x+sz*.12,y-sz*.36); L.lineTo(x+sz*.38,y-sz*.32); L.stroke(); }
function glyphApprox(x,y,sz,col){ L.strokeStyle=col; L.lineWidth=sz*.06; L.lineCap='round'; L.beginPath();
  for(const dy of [-.42,-.22]){ L.moveTo(x+sz*.08,y+sz*dy); L.bezierCurveTo(x+sz*.25,y+sz*(dy-.12),x+sz*.42,y+sz*(dy+.12),x+sz*.6,y+sz*dy); } L.stroke(); }
function glyphImp(x,y,sz,col){ L.strokeStyle=col; L.lineWidth=sz*.06; L.lineCap='round'; L.lineJoin='round'; L.beginPath();
  L.moveTo(x+sz*.1,y-sz*.42); L.lineTo(x+sz*.72,y-sz*.42); L.moveTo(x+sz*.1,y-sz*.22); L.lineTo(x+sz*.72,y-sz*.22); L.moveTo(x+sz*.55,y-sz*.58); L.lineTo(x+sz*.86,y-sz*.32); L.lineTo(x+sz*.55,y-sz*.06); L.stroke(); }
/* write-on for math: left to right */
function math(e,cx,y,sz,o={}){ const p=o.p??1; if(p<=0) return; { const w0=mW(e,sz); if(w0>o.max||w0>980) sz*=Math.min(o.max||980,980)/w0; } const w=mW(e,sz), x0=cx-w/2; L.save(); L.globalAlpha=o.a??1;
  const cut=(w+40)*easeOut(p); L.beginPath(); L.rect(x0-20,y-sz*1.6,cut,sz*2.8); L.clip(); if(o.glow){ L.shadowColor=o.col||WHITE; L.shadowBlur=o.glow; }
  mDraw(e,x0,y,sz,o.col||WHITE); L.restore(); if(p<1) tip(x0-20+cut,y-sz*.3,o.col||WHITE); return {x0,w}; }

/* ---------- chalk strokes ---------- */
function polyLen(P){ let s=0; for(let i=1;i<P.length;i++) s+=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]); return s; }
function stroke(P,p,col=WHITE,w=5,o={}){ if(p<=0||P.length<2) return; const tot=polyLen(P), want=tot*clamp(p); let acc=0;
  L.save(); L.strokeStyle=col; L.lineWidth=w; L.lineCap='round'; L.lineJoin='round'; L.globalAlpha=o.a??1; if(o.dash) L.setLineDash(o.dash); if(o.glow){ L.shadowColor=col; L.shadowBlur=o.glow; }
  L.beginPath(); L.moveTo(P[0][0],P[0][1]); let end=P[0];
  for(let i=1;i<P.length;i++){ const s=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]); if(acc+s>=want){ const k=(want-acc)/s; end=[P[i-1][0]+(P[i][0]-P[i-1][0])*k,P[i-1][1]+(P[i][1]-P[i-1][1])*k]; L.lineTo(end[0],end[1]); break; } L.lineTo(P[i][0],P[i][1]); acc+=s; end=P[i]; }
  L.stroke(); L.restore(); if(p<1) tip(end[0],end[1],col); }
const ellipseP=(cx,cy,rx,ry,a0=0,a1=2*PI,n=72)=>Array.from({length:n+1},(_,i)=>{ const a=a0+(a1-a0)*i/n; return [cx+rx*Math.cos(a),cy+ry*Math.sin(a)]; });
function arrow(x1,y1,x2,y2,p,col,w=5){ if(p<=0) return; const e=easeOut(p), xe=x1+(x2-x1)*e, ye=y1+(y2-y1)*e; stroke([[x1,y1],[xe,ye]],1,col,w);
  if(p>.85){ const a=Math.atan2(y2-y1,x2-x1), h=22; stroke([[xe-h*Math.cos(a-.5),ye-h*Math.sin(a-.5)],[xe,ye],[xe-h*Math.cos(a+.5),ye-h*Math.sin(a+.5)]],1,col,w); } }
/* hand-drawn circle around an answer */
function ring(cx,cy,rx,ry,p,col=ORANGE,al=1){ const P=ellipseP(cx,cy,rx,ry,-2.2,-2.2+2*PI*1.08,90).map(([x,y],i)=>[x+Math.sin(i*.7)*2.5,y+Math.cos(i*.5)*2]); stroke(P,p,col,5,{glow:12,a:al}); }
const REELS={};

/* ريلز: مثال 5 ص 95 — المرشح المخروطي — مسجّل في REELS.cone */
REELS.cone=function(){
const D=65.4;
/* ---------- the cone (book figure): apex at the bottom, height 24, diameter 16 ---------- */
const CX=540, APY=1060, S=20.5;                  // 1 cm = 20.5 px
const yAt=h=>APY-h*S, rAt=h=>h/3*S;               // r = h/3 (book)
const TOPY=yAt(24), TOPR=rAt(24);
function cone(p,o={}){ const a=o.a??1;
  stroke([[CX-TOPR,TOPY],[CX,APY],[CX+TOPR,TOPY]],p,WHITE,6,{a});
  stroke(ellipseP(CX,TOPY,TOPR,TOPR*.17),clamp((p-.35)/.65),WHITE,5,{a}); }
function liquid(h,a=1){ if(h<=0) return; const y=yAt(h), r=rAt(h);
  L.save(); L.globalAlpha=a; L.beginPath(); L.moveTo(CX,APY); L.lineTo(CX-r,y); L.ellipse(CX,y,r,r*.17,0,PI,0,true); L.lineTo(CX,APY); L.closePath();
  L.fillStyle='rgba(143,211,255,.22)'; L.fill(); L.clip();
  L.strokeStyle='rgba(143,211,255,.35)'; L.lineWidth=3; for(let k=-30;k<30;k++){ L.beginPath(); L.moveTo(CX-260+k*18,APY+40); L.lineTo(CX-260+k*18+300,APY-260); L.stroke(); }
  L.restore(); stroke(ellipseP(CX,y,r,r*.17),1,BLUE,4,{a,dash:[14,10]}); }
function drops(t,a=1){ for(let k=0;k<3;k++){ const ph=((t*1.1+k/3)%1), y=APY+18+ph*120; L.save(); L.globalAlpha=a*(1-ph*.8); L.fillStyle=BLUE; L.beginPath(); L.ellipse(CX,y,7,10,0,0,2*PI); L.fill(); L.restore(); } }
function pour(t,a=1){ L.save(); L.globalAlpha=a*.7; L.strokeStyle=BLUE; L.lineWidth=7; L.setLineDash([22,16]); L.lineDashOffset=-t*160; L.beginPath(); L.moveTo(CX+70,TOPY-170); L.quadraticCurveTo(CX+60,TOPY-60,CX+40,TOPY+40); L.stroke(); L.restore(); }

/* ---------- scenes ---------- */
const SC=[[0,4.6],[4.6,11.2],[11.2,17.4],[17.4,34.0],[34.0,48.5],[48.5,65.4]];
const IN=(t,i)=>t>=SC[i][0]-.5&&t<SC[i][1]+.5;
function title(s,t,i,col=WHITE){ const [a,b]=SC[i]; write(s,540,282,74,{p:prog(t,a+.1,a+1.1),a:vis(t,a,b),col}); }
function warn(s,t,a,b,y){ const v=vis(t,a,b,.3,.4); if(v<=0) return; const w=textW(s,`700 50px ${AR}`)+70;
  L.save(); L.globalAlpha=v; L.strokeStyle=ORANGE; L.lineWidth=4; L.setLineDash([]); L.shadowColor=ORANGE; L.shadowBlur=14;
  const P=[[540-w/2,y-52],[540+w/2,y-55],[540+w/2+4,y+20],[540-w/2-3,y+22],[540-w/2,y-52]]; L.restore(); stroke(P,prog(t,a,a+.6),ORANGE,4,{a:v,glow:10});
  write(s,540,y,50,{p:prog(t,a+.15,a+.9),a:v,col:ORANGE}); }

/* derivation steps: each step is written, then moves up (dimmed) when the next one comes */
function steps(t,list,y1,y2,sz,a=1){ let k=-1; list.forEach((st,i)=>{ if(t>=st.at) k=i; }); if(k<0) return;
  const pk=ease((t-list[k].at)/.45);
  for(let i=Math.max(0,k-2);i<=k;i++){ const age=k-i, st=list[i]; let y,al,p=1;
    if(age===0){ y=y2; al=1; p=prog(t,st.at,st.at+(st.d||1)); }
    else if(age===1){ y=y2+(y1-y2)*pk; al=1-.45*pk; }
    else { y=y1-110*pk; al=.55*(1-pk); }
    if(al>0) math(st.e,540,y,sz*(age?1-.12*Math.min(1,age===1?pk:1):1),{p,a:a*al,col:st.col,glow:st.col?8:0}); }
  return {k,y2}; }
/* paradox scene: h(τ) from the real law dh/dt = 36/(πh²), time sped up by K */
const S6=48.5, H0=12, H1=20, PT0=S6+1.6, PT1=S6+8.6, TPHYS=PI*(H1**3-H0**3)/108, K=TPHYS/(PT1-PT0);
const hParadox=t=>Math.cbrt(H0**3+108/PI*K*clamp(t-PT0,0,PT1-PT0));

function frame(t,extra){
  g.clearRect(0,0,W,H); g.drawImage(board,0,0); L.clearRect(0,0,W,H); TIPS=[];
  /* small tag */
  write('الأستاذ فائز الحمداني',540,128,48,{p:1,a:.95*vis(t,-1,D,.4,.6),col:'#f3e6c8'});
  write('مثال 5 · ص 95 · السادس العلمي',540,190,38,{p:1,a:.8*vis(t,-1,D,.4,.6),col:DIM,w:400});

  /* ---- 1: the question ---- */
  if(IN(t,0)){ const v=vis(t,-1,4.6,.3,.5);
    write('يُصبّ 5 ويتسرّب 1…',540,300,72,{a:v});
    write('بأي سرعة يرتفع السائل؟',540,402,80,{a:v,col:ORANGE,glow:10+8*Math.sin(t*3)**2});
  }

  /* cone stays from scene 2 on */
  cone(1);
  { /* hook: fills fast (sped up); then eases to the book's level h = 12; the paradox runs the real law */
    const hook=Math.cbrt(4**3+(12**3-4**3)*clamp(t/4.2));      /* fills from 4 cm to the book's 12 cm (sped up) */
    const hNow=t<PT0? hook : hParadox(t);
    const SNAP0=SC[1][0]+.8, snap=t>=SNAP0&&t<PT0, ta=snap?SNAP0:t;   /* the moment h = 12: the clock stops while we solve */
    liquid(hNow,1); pour(ta,1); drops(ta,1);
    const sv=vis(t,SNAP0,PT0,.4,.4); if(sv>0){ write('لحظة \u2066h = 12 cm\u2069',CX+rAt(12)+30,yAt(12)+14,44,{a:.9*sv,col:BLUE,f:'b',align:'start'}); } }

  /* ---- 2: givens ---- */
  if(IN(t,1)){ const [s,e]=SC[1], v=vis(t,s,e);
    title('المعطيات',t,1);
    stroke([[CX-TOPR,TOPY-58],[CX+TOPR,TOPY-58]],prog(t,s+.8,s+1.5),WHITE,4,{a:v}); stroke([[CX-TOPR,TOPY-72],[CX-TOPR,TOPY-44]],prog(t,s+.8,s+1),WHITE,4,{a:v}); stroke([[CX+TOPR,TOPY-72],[CX+TOPR,TOPY-44]],prog(t,s+1.3,s+1.5),WHITE,4,{a:v});
    math('16',CX,TOPY-78,54,{p:prog(t,s+1.2,s+1.8),a:v});
    stroke([[CX-TOPR-70,TOPY],[CX-TOPR-90,TOPY],[CX-TOPR-90,APY],[CX-TOPR-70,APY]],prog(t,s+1.4,s+2.3),WHITE,4,{a:v});
    math('24',CX-TOPR-128,(TOPY+APY)/2+16,54,{p:prog(t,s+2,s+2.6),a:v});
    math(['5 cm',{s:['','3']},'/s'],CX+235,TOPY-175,46,{p:prog(t,s+2.4,s+3.2),a:v,col:BLUE});
    math(['1 cm',{s:['','3']},'/s'],CX+130,APY+120,46,{p:prog(t,s+2.9,s+3.6),a:v,col:BLUE});
    math('h = 12 cm',540,1330,72,{p:prog(t,s+3.2,s+3.8),a:v,col:ORANGE,glow:6});
    write('المطلوب: معدل تغيّر العمق',540,1440,56,{p:prog(t,s+3.6,s+4.3),a:v,f:'b'});
  }

  /* ---- 3: net rate ---- */
  if(IN(t,2)){ const [s,e]=SC[2], v=vis(t,s,e);
    title('المعدل الصافي',t,2);
    math([{f:['dV','dt']},' = 5 − 1'],540,1270,96,{p:prog(t,s+.6,s+1.6),a:v});
    math(['= ',{c:ORANGE,e:['4 cm',{s:['','3']},'/s']}],540,1405,96,{p:prog(t,s+1.7,s+2.4),a:v,glow:6});
    warn('انتبه! السائل يتسرّب أيضاً',t,s+2.6,e,1555);
  }

  /* ---- 4: similar triangles, one pair of sides at a time ---- */
  if(IN(t,3)){ const [s,e]=SC[3], v=vis(t,s,e), h=12, yh=yAt(h), rh=rAt(h);
    title('تشابه المثلثين',t,3);
    stroke([[CX,APY],[CX,TOPY],[CX+TOPR,TOPY],[CX,APY]],prog(t,s+.6,s+1.8),ORANGE,6,{a:v,glow:12});
    stroke([[CX,APY],[CX,yh],[CX+rh,yh],[CX,APY]],prog(t,s+1.8,s+2.8),BLUE,6,{a:v,glow:10});
    /* pair 1: radii 8 ↔ r ; pair 2: heights 24 ↔ h (thick glowing chalk, then a link) */
    const p1=vis(t,s+3,s+5.9,.3,.4), p2=vis(t,s+4.4,s+5.9,.3,.4), pulse=.6+.4*Math.sin(t*6)**2;
    if(p1>0){ stroke([[CX,TOPY],[CX+TOPR,TOPY]],1,ORANGE,14,{a:v*p1*pulse,glow:24}); stroke([[CX,yh],[CX+rh,yh]],1,BLUE,14,{a:v*p1*pulse,glow:24});
      arrow(CX+TOPR+26,TOPY+14,CX+rh+30,yh-10,prog(t,s+3.3,s+3.9),WHITE,4); }
    if(p2>0){ stroke([[CX-12,TOPY],[CX-12,APY]],1,ORANGE,12,{a:v*p2*pulse,glow:22}); stroke([[CX+12,yh],[CX+12,APY]],1,BLUE,12,{a:v*p2*pulse,glow:22}); }
    math('8',CX+TOPR/2,TOPY-40,58,{p:prog(t,s+3,s+3.4),a:v,col:ORANGE,glow:6});
    math('24',CX-64,(TOPY+yh)/2+14,58,{p:prog(t,s+4.4,s+4.8),a:v,col:ORANGE,glow:6});
    math('r',CX+rh/2,yh-14,58,{p:prog(t,s+3.2,s+3.6),a:v,col:BLUE,glow:6}); math('h',CX-44,(yh+APY)/2+18,58,{p:prog(t,s+4.6,s+5),a:v,col:BLUE,glow:6});
    steps(t,[{e:[{f:['r','h']},' = ',{f:['8','24']}],at:s+6.1},
             {e:['r = ',{f:['h','3']}],at:s+7.6,col:ORANGE},
             {e:['V = ',{f:['1','3']},'π',{s:['r','2']},'h'],at:s+9.1},
             {e:['V = ',{f:['1','3']},'π',{s:[['(',{f:['h','3']},')'],'2']},'h'],at:s+10.6,d:1.3},
             {e:['V = ',{f:['π','27']},{s:['h','3']}],at:s+12.2,col:ORANGE}],1225,1385,86,v);
    { const a0=s+13.4, vv=vis(t,a0,e,.3,.4); if(vv>0){ const x0=110,x1=970,y0=1478,y1=1638;
      stroke([[x0,y0],[x1,y0-3],[x1+4,y1],[x0-3,y1+2],[x0,y0]],prog(t,a0,a0+.6),ORANGE,4,{a:vv,glow:10});
      write('عوّض العلاقة ⁦r = h/3⁩ قبل الاشتقاق',540,y0+64,50,{p:prog(t,a0+.15,a0+.9),a:vv,col:ORANGE,f:'b'});
      write('أما الأرقام فبعد الاشتقاق',540,y0+132,46,{p:prog(t,a0+1.1,a0+1.8),a:vv,f:'b'}); } }
  }

  /* ---- 5: differentiate, then substitute — one operation per step ---- */
  if(IN(t,4)){ const [s,e]=SC[4], v=vis(t,s,e);
    title('الاشتقاق والتعويض',t,4);
    const d=[{f:['dh','dt']}];
    const r=steps(t,[{e:['V = ',{f:['π','27']},{s:['h','3']}],at:s+.5},
             {e:[{f:['dV','dt']},' = ',{f:['π','27']},'·3',{s:['h','2']},'·',...d],at:s+2,d:1.2},
             {e:[{f:['dV','dt']},' = ',{f:['π','9']},{s:['h','2']},'·',...d],at:s+3.7},
             {e:[{c:ORANGE,e:['4']},' = ',{f:['π','9']},{s:[['(',{c:ORANGE,e:['12']},')'],'2']},'·',...d],at:s+5.3,d:1.2},
             {e:['4 = 16π·',...d],at:s+7},
             {e:[...d,' = ',{f:['4','16π']},' = ',{f:['1','4π']}],at:s+8.6,d:1.2},
             {e:[...d,' ≈ 0.08 cm/s'],at:s+10.3,col:ORANGE}],1235,1405,88,v);
    if(r&&r.k===6){ const w=mW([{f:['dh','dt']},' ≈ 0.08 cm/s'],88); ring(540,1385,Math.min(500,w/2+46),92,prog(t,s+11.2,s+12.1),ORANGE,v); }
    write('موجب: العمق يزداد',540,1560,52,{p:prog(t,s+12.2,s+12.9),a:v*.95,col:DIM,f:'b'});
    const lab=[[s+3.7,'تبسيط: ⁦π/27 · 3 = π/9⁩'],[s+5.3,'نعوّض: ⁦dV/dt = 4 , h = 12⁩'],[s+7,'⁦(π/9)·144 = 16π⁩']];
    for(const [a0,txt] of lab){ const lv=vis(t,a0,a0+1.6,.25,.3); if(lv>0) write(txt,540,1550,52,{a:v*lv,col:'#cfd8d2',f:'b'}); }
  }

  /* ---- 6: the paradox: volume grows steadily, height slows ---- */
  if(IN(t,5)){ const [s,e]=SC[5], v=vis(t,s,e,.45,.01), h=hParadox(t), dh=36/(PI*h*h), Vv=PI*h**3/27;
    title('المفارقة',t,5,ORANGE);
    const vf=v*(1-ease((t-(s+13.4))/.4));
    math([{f:['dV','dt']},' = 4'],460,1225,80,{p:prog(t,s+.4,s+1.2),a:vf});
    write('ثابت',700,1225,56,{p:prog(t,s+1,s+1.5),a:vf,col:DIM,f:'b'});
    math([{f:['dh','dt']},' = ',{f:['36',['π',{s:['h','2']}]]}],540,1375,80,{p:prog(t,s+1.2,s+2.2),a:vf});
    if(t>=PT0-.4){ const a=v*clamp((t-PT0+.4)/.4)*(1-ease((t-(s+9))/.5));
      math(['h = '+h.toFixed(1)],215,1520,54,{a,col:BLUE}); math(['V = '+Vv.toFixed(0)],540,1520,54,{a,col:WHITE}); math([{f:['dh','dt']},' = '+dh.toFixed(3)],860,1520,54,{a,col:ORANGE,glow:6});
      write('الزمن مُسرَّع ×'+Math.round(K),540,1610,46,{a:a*.9,col:DIM,f:'b'}); }
    if(t>=s+9.3){ const vc=v*(1-ease((t-(s+13.4))/.4));
      write('الحجم يزداد بمعدل ثابت…',540,1500,62,{p:prog(t,s+9.3,s+10.3),a:vc,f:'b'});
      write('أما الارتفاع فيتباطأ لأن المخروط يتّسع',540,1588,54,{p:prog(t,s+10.1,s+11.3),a:vc,col:ORANGE,glow:8,f:'b'}); }
    if(t>=s+13.7){
      write('جرّب بنفسك',540,1240,70,{p:prog(t,s+13.7,s+14.3),a:v,col:ORANGE,glow:10});
      write('ماذا لو كان التسرّب ⁦3 cm³/s⁩ ؟',540,1345,58,{p:prog(t,s+14.2,s+15.1),a:v,f:'b'});
      write('اكتب جوابك في التعليقات',540,1440,54,{p:prog(t,s+14.9,s+15.7),a:v,col:DIM,f:'b'}); }
  }
  if(extra) extra();
  /* brand */
  write('NIBOR  /  MOTION',540,1760,40,{a:.85*vis(t,.8,D,.6,.01),col:'#9fd8e0'});

  /* chalk tip dust */
  const r=rng(Math.floor(t*30)+3);
  for(const [x,y,col] of TIPS){ L.save(); L.fillStyle=col; for(let i=0;i<9;i++){ L.globalAlpha=.25+r()*.5; L.beginPath(); L.arc(x+(r()-.5)*26,y+(r()-.5)*26,1+r()*2.6,0,2*PI); L.fill(); } L.globalAlpha=.9; L.shadowColor=col; L.shadowBlur=16; L.beginPath(); L.arc(x,y,4,0,2*PI); L.fill(); L.restore(); }
  /* chalk texture, soft dust glow, then onto the board */
  L.save(); L.globalCompositeOperation='destination-in'; L.drawImage(grain,0,0); L.restore();
  g.save(); g.filter='blur(7px)'; g.globalAlpha=.35; g.drawImage(layer,0,0); g.restore();
  g.drawImage(layer,0,0);
  /* fade from / to black at the ends */
  const fb=(t-(D-.5))/.5; if(fb>0){ g.fillStyle=`rgba(0,0,0,${clamp(fb)})`; g.fillRect(0,0,W,H); }
}
/* ---- the example as written in the book (p. 95), after the brainstorm question ---- */
const Q0=4.55, SH=10;
/* the book's sentence, verbatim (p. 95); wrapped to the panel width */
const BOOKTXT='مرشح مخروطي قاعدته أُفقية ورأسه للأسفل، ارتفاعه يساوي \u206624cm\u2069 وطول قطر قاعدته \u206616cm\u2069 يصب فيه سائل بمعدل \u20665cm³/s\u2069 بينما يتسرب منه السائل بمعدل \u20661cm³/s\u2069، جد معدل تغير عمق السائل في اللحظة التي يكون فيها عمق السائل \u206612cm\u2069 .';
let LINES=null;
function wrapBook(){ const sz=50, font=`500 ${sz}px Body, ${LT}`, max=880, out=[['مثال 5',ORANGE,60,'r']]; let cur='';
  for(const w of BOOKTXT.split(' ')){ const nx=cur?cur+' '+w:w; if(textW(nx,font)>max&&cur){ out.push([cur,WHITE,sz,'b']); cur=w; } else cur=nx; }
  if(cur) out.push([cur,WHITE,sz,'b']); return out; }
function statement(u){ const v=Math.min(ease(u/.5),1-ease((u-(SH-.6))/.6)); if(v<=0) return;
  const x0=70,x1=1010,y0=470,y1=1150;
  L.save(); L.globalAlpha=.93*v; L.fillStyle='#1d2827'; L.beginPath(); L.roundRect(x0,y0,x1-x0,y1-y0,26); L.fill(); L.restore();
  const P=[[x0+14,y0+4],[x1-8,y0],[x1+2,y1-12],[x0+6,y1+2],[x0-2,y0+16],[x0+14,y0+4]]; stroke(P,prog(u,.1,1.1),WHITE,4,{a:.8*v});
  if(!LINES) LINES=wrapBook(); const n=LINES.length-1, gap=Math.min(84,(y1-y0-150)/n), dt=Math.min(.7,5/n);
  let y=y0+92; LINES.forEach(([txt,col,sz,f],i)=>{ const a=.5+i*dt; write(txt,540,y,sz,{p:prog(u,a,a+.8),a:v,col,glow:i?0:8,f,w:i?500:700}); y+=i?gap:(gap+18); });
  stroke([[430,y0+112],[650,y0+110]],prog(u,.9,1.4),ORANGE,3,{a:.6*v}); }
const CUT0=8.6, CUT=65/30;   /* givens: skip the idle 2.17 s once the numbers are on the drawing */
const render=t=>{ if(t<Q0) frame(t); else if(t<Q0+SH) frame(Q0,()=>statement(t-Q0)); else { let u=t-SH; if(u>=CUT0) u+=CUT; frame(u); } };
 

const real=u=>u<CUT0?u+SH:u+SH-CUT, NAMES=['المعدل الصافي', 'التشابه', 'الاشتقاق', 'المفارقة'];
  const cues=[{t:0,l:'السؤال'},{t:Q0,l:'نص المثال'},{t:Q0+SH,l:'المعطيات'}].concat(SC.slice(2).map((s,i)=>({t:real(s[0]),l:NAMES[i]})));
  return {render,D:D+SH-CUT,cues};
};

/* ريلز: مثال 4 ص 94 — السلم — مسجّل في REELS.ladder */
REELS.ladder=function(){
const D=63.3;
/* ---------- the book figure: wall on the left, ground, ladder 10 m; x = foot to wall, y = top to ground, θ at the foot ---------- */
const WX=205, GY=1075, S=60, LEN=10;                  // 1 m = 60 px
const foot=x=>[WX+x*S,GY], topP=x=>[WX,GY-Math.sqrt(LEN*LEN-x*x)*S];
const yOf=x=>Math.sqrt(LEN*LEN-x*x);
function scene(a=1){
  stroke([[WX,GY+4],[WX,GY-10.5*S]],1,WHITE,6,{a});                       // wall
  stroke([[WX-40,GY],[WX+10.6*S,GY]],1,WHITE,6,{a});                      // ground
  for(let k=0;k<13;k++){ const yy=GY-30-k*48; stroke([[WX,yy],[WX-22,yy+22]],1,WHITE,2.5,{a:a*.55}); }
  for(let k=0;k<15;k++){ const xx=WX+12+k*44; stroke([[xx,GY],[xx-22,GY+22]],1,WHITE,2.5,{a:a*.55}); }
  write('حائط',WX-62,GY-9.6*S,40,{a:a*.8,col:DIM,f:'b'}); write('أرض',WX+10.2*S,GY+62,40,{a:a*.8,col:DIM,f:'b'}); }
function ladder(x,a=1,col=WHITE){ const [fx,fy]=foot(x), [tx,ty]=topP(x), L0=Math.hypot(fx-tx,fy-ty), ux=(fx-tx)/L0, uy=(fy-ty)/L0, nx=-uy*9, ny=ux*9;
  stroke([[tx+nx,ty+ny],[fx+nx,fy+ny]],1,col,5,{a}); stroke([[tx-nx,ty-ny],[fx-nx,fy-ny]],1,col,5,{a});
  for(let k=1;k<10;k++){ const px=tx+(fx-tx)*k/10, py=ty+(fy-ty)*k/10; stroke([[px+nx*1.6,py+ny*1.6],[px-nx*1.6,py-ny*1.6]],1,col,3.5,{a:a*.85}); }
  L.save(); L.globalAlpha=a; L.fillStyle=WHITE; for(const [px,py] of [[fx,fy],[tx,ty]]){ L.beginPath(); L.arc(px,py,7,0,2*PI); L.fill(); } L.restore(); }
function thetaArc(x,p,a=1,col=ORANGE){ const [fx,fy]=foot(x), ang=Math.atan2(yOf(x),x); const P=ellipseP(fx,fy,62,62,PI,PI+ang*1,30).map(([u,v])=>[u,v]);
  stroke(P,p,col,5,{a,glow:8}); if(p>.6) math('θ',fx-96,fy-18,50,{a,col}); }

/* ---------- scenes ---------- */
const SC=[[0,4.6],[4.6,11.2],[11.2,19.4],[19.4,33.6],[33.6,46.4],[46.4,63.3]];
const IN=(t,i)=>t>=SC[i][0]-.5&&t<SC[i][1]+.5;
function title(s,t,i,col=WHITE,sz=74){ const [a,b]=SC[i]; write(s,540,282,sz,{p:prog(t,a+.1,a+1.1),a:vis(t,a,b),col}); }
function warn(s,t,a,b,y){ const v=vis(t,a,b,.3,.4); if(v<=0) return; const w=textW(s,`500 52px Body`)+80;
  const P=[[540-w/2,y-56],[540+w/2,y-59],[540+w/2+4,y+22],[540-w/2-3,y+24],[540-w/2,y-56]]; stroke(P,prog(t,a,a+.6),ORANGE,4,{a:v,glow:10});
  write(s,540,y,52,{p:prog(t,a+.15,a+.9),a:v,col:ORANGE,f:'b'}); }
/* derivation steps: each step is written, then moves up (dimmed) when the next one comes */
function steps(t,list,y1,y2,sz,a=1){ let k=-1; list.forEach((st,i)=>{ if(t>=st.at) k=i; }); if(k<0) return;
  const pk=ease((t-list[k].at)/.45);
  for(let i=Math.max(0,k-2);i<=k;i++){ const age=k-i, st=list[i]; let y,al,p=1;
    if(age===0){ y=y2; al=1; p=prog(t,st.at+(k?.4:0),st.at+(k?.4:0)+(st.d||1)); }
    else if(age===1){ y=y2+(y1-y2)*pk; al=1-.45*pk; }
    else { y=y1-70*pk; al=.55*(1-pk); }
    if(al>0) math(st.e,540,y,sz*(age?1-.12*Math.min(1,age===1?pk:1):1),{p,a:a*al,col:st.col,glow:st.col?8:0}); }
  return {k}; }
function notes(t,list,y,a=1){ for(const [a0,a1,txt] of list){ const lv=vis(t,a0,a1,.25,.3); if(lv>0) write(txt,540,y,52,{a:a*lv,col:'#cfd8d2',f:'b'}); } }
const dd=v=>({f:['d'+v,'dt']});

/* paradox: the foot keeps moving at the real dx/dt = 2 m/s, shown slowed down */
const S6=46.4, X0=8, X1=9.8, PT0=S6+1.6, PT1=S6+8.6, SLOW=(PT1-PT0)/((X1-X0)/2);
const xParadox=t=>X0+2*clamp(t-PT0,0,PT1-PT0)/SLOW;

function frame(t,extra){
  g.clearRect(0,0,W,H); g.drawImage(board,0,0); L.clearRect(0,0,W,H); TIPS=[];
  write('الأستاذ فائز الحمداني',540,128,48,{p:1,a:.95*vis(t,-1,D,.4,.6),col:'#f3e6c8'});
  write('مثال 4 · ص 94 · السادس العلمي',540,190,38,{p:1,a:.8*vis(t,-1,D,.4,.6),col:DIM,w:400});

  /* ---- 1: the question (full from the first frame) ---- */
  if(IN(t,0)){ const v=vis(t,-1,4.6,.3,.5);
    write('يبتعد أسفل السلم بمعدل ثابت…',540,300,68,{a:v});
    write('بأي سرعة ينزل رأسه؟',540,402,80,{a:v,col:ORANGE,glow:10+8*Math.sin(t*3)**2}); }

  /* the figure stays all the time; x moves in the hook, stops at x = 8 (the book's moment), moves again in the paradox */
  scene(1);
  const xHook=5+3*ease(clamp((t-.2)/4)), SNAP0=SC[1][0]+.8, snap=t>=SNAP0&&t<PT0;
  const xNow=t<PT0? xHook : xParadox(t);
  ladder(xNow,1);
  { const [fx]=foot(xNow); arrow(fx+18,GY-26,fx+18+2*58,GY-26,t<SC[1][0]+2.4?clamp((t-.3)*3):1,ORANGE,5);
    if(t>=SC[1][0]+2.2) math([{f:['dx','dt']},' = 2'],fx+150,GY-70,46,{p:prog(t,SC[1][0]+2.2,SC[1][0]+2.9),col:ORANGE}); }
  { const sv=vis(t,SNAP0,PT0,.4,.4); if(sv>0){ const [fx]=foot(8); write('لحظة ⁦x = 8 m⁩',WX+20,GY+140,44,{a:.9*sv,col:BLUE,f:'b',align:'start'}); } }

  /* ---- 2: givens on the drawing ---- */
  if(IN(t,1)){ const [s,e]=SC[1], v=vis(t,s,e), [fx]=foot(8), [tx,ty]=topP(8);
    title('المعطيات',t,1);
    math('10 m',(fx+tx)/2+58,(ty+GY)/2-20,56,{p:prog(t,s+.8,s+1.4),a:v});
    stroke([[WX,GY+30],[fx,GY+30]],prog(t,s+1.2,s+1.9),BLUE,4,{a:v}); math('x',(WX+fx)/2,GY+30+56,56,{p:prog(t,s+1.8,s+2.2),a:v,col:BLUE});
    stroke([[WX+26,GY],[WX+26,ty]],prog(t,s+1.5,s+2.2),BLUE,4,{a:v,dash:[12,10]}); math('y',WX+60,(ty+GY)/2+20,56,{p:prog(t,s+2,s+2.4),a:v,col:BLUE});
    thetaArc(8,prog(t,s+2.3,s+3),v);
    math('x = 8 m',540,1350,76,{p:prog(t,s+3.2,s+3.8),a:v,col:ORANGE,glow:6});
    write('المطلوب: معدل نزول الرأس وتغيّر الزاوية',540,1460,52,{p:prog(t,s+3.6,s+4.4),a:v,f:'b'});
  }

  /* ---- 3: Pythagoras — the sides glow one by one ---- */
  if(IN(t,2)){ const [s,e]=SC[2], v=vis(t,s,e), [fx]=foot(8), [tx,ty]=topP(8);
    title('مبرهنة فيثاغورس',t,2);
    const pul=.6+.4*Math.sin(t*6)**2;
    const gx=vis(t,s+.6,e,.3,.4), gy=vis(t,s+.9,e,.3,.4), gl=vis(t,s+1.2,e,.3,.4);
    if(gx>0) stroke([[WX,GY-4],[fx,GY-4]],1,BLUE,12,{a:v*gx*pul,glow:22});
    if(gy>0) stroke([[WX+5,GY],[WX+5,ty]],1,BLUE,12,{a:v*gy*pul,glow:22});
    if(gl>0) stroke([[tx,ty],[fx,GY]],1,ORANGE,12,{a:v*gl*pul,glow:22});
    steps(t,[{e:[{s:['x','2']},' + ',{s:['y','2']},' = 100'],at:s+1.4},
             {e:[{s:['8','2']},' + ',{s:['y','2']},' = 100'],at:s+3},
             {e:[{s:['y','2']},' = 36  ⇒  ',{c:ORANGE,e:['y = 6 m']}],at:s+4.4,d:1.2}],1285,1465,90,v);
    warn('انتبه! طول السلم ثابت = 10',t,s+5.8,e,1600);
  }

  /* ---- 4: part 1 — rate of the top ---- */
  if(IN(t,3)){ const [s,e]=SC[3], v=vis(t,s,e), [tx,ty]=topP(8);
    title('أولاً: معدل انزلاق الطرف العلوي',t,3,WHITE,64);
    const r=steps(t,[{e:[{s:['x','2']},' + ',{s:['y','2']},' = 100'],at:s+.6},
             {e:['2x·',dd('x'),' + 2y·',dd('y'),' = 0'],at:s+2.2,d:1.3},
             {e:['(2)(',{c:ORANGE,e:['8']},')(',{c:ORANGE,e:['2']},') + (2)(',{c:ORANGE,e:['6']},')·',dd('y'),' = 0'],at:s+4.4,d:1.3},
             {e:['32 + 12·',dd('y'),' = 0'],at:s+6.3},
             {e:[dd('y'),' = ',{f:['−32','12']},' = ',{f:['−8','3']}],at:s+7.9,d:1.2},
             {e:[dd('y'),' ≈ −2.67 m/s'],at:s+9.6,col:ORANGE}],1285,1465,88,v);
    if(r&&r.k===5){ const w=mW([dd('y'),' ≈ −2.67 m/s'],90); ring(540,1440,Math.min(500,w/2+46),92,prog(t,s+10.4,s+11.3),ORANGE,v); }
    notes(t,[[s+2.2,s+4.1,'نشتق الطرفين بالنسبة إلى الزمن ⁦t⁩'],[s+4.4,s+6.2,'نعوّض: ⁦x = 8 , y = 6 , dx/dt = 2⁩']],1600,v);
    write('السالب: الطرف العلوي ينزل',540,1610,52,{p:prog(t,s+11.4,s+12.1),a:v*.95,col:DIM,f:'b'});
    if(t>=s+9.6){ const a=v*clamp((t-s-9.6)/.5); arrow(tx-34,ty-6,tx-34,ty+8/3*40,prog(t,s+9.6,s+10.3),BLUE,6); math([dd('y')],tx-104,ty+64,44,{a,col:BLUE}); }
  }

  /* ---- 5: part 2 — rate of the angle ---- */
  if(IN(t,4)){ const [s,e]=SC[4], v=vis(t,s,e), [fx]=foot(8), [tx,ty]=topP(8);
    title('ثانياً: سرعة تغيّر الزاوية',t,4,WHITE,68);
    thetaArc(8,prog(t,s+.3,s+1),v);
    const pul=.6+.4*Math.sin(t*6)**2, g1=vis(t,s+.6,s+3.8,.3,.4), g2=vis(t,s+4,s+6,.3,.4);
    if(g1>0){ stroke([[WX+5,GY],[WX+5,ty]],1,BLUE,12,{a:v*g1*pul,glow:22}); stroke([[tx,ty],[fx,GY]],1,ORANGE,12,{a:v*g1*pul,glow:22}); }
    if(g2>0){ stroke([[WX,GY-4],[fx,GY-4]],1,BLUE,12,{a:v*g2*pul,glow:22}); stroke([[tx,ty],[fx,GY]],1,ORANGE,12,{a:v*g2*pul,glow:22}); }
    const r=steps(t,[{e:['sin θ = ',{f:['y','10']}],at:s+.8},
             {e:['cos θ·',dd('θ'),' = ',{f:['1','10']},'·',dd('y')],at:s+2.4,d:1.3},
             {e:['cos θ = ',{f:['x','10']},' = ',{c:ORANGE,e:[{f:['8','10']}]}],at:s+4.2},
             {e:[{f:['8','10']},'·',dd('θ'),' = ',{f:['1','10']},'(',{c:ORANGE,e:[{f:['−8','3']}]},')'],at:s+6,d:1.3},
             {e:[dd('θ'),' = ',{f:['−1','3']},' rad/s'],at:s+7.8,col:ORANGE}],1285,1465,88,v);
    if(r&&r.k===4){ const w=mW([dd('θ'),' = ',{f:['−1','3']},' rad/s'],90); ring(540,1440,Math.min(500,w/2+46),100,prog(t,s+8.7,s+9.6),ORANGE,v); }
    notes(t,[[s+.8,s+2.3,'المقابل ÷ الوتر'],[s+2.4,s+4.1,'نشتق الطرفين بالنسبة إلى الزمن ⁦t⁩'],[s+4.2,s+5.9,'المجاور ÷ الوتر'],[s+6,s+7.7,'نعوّض ⁦dy/dt = −8/3⁩ من أولاً']],1600,v);
    write('السالب: الزاوية تصغر',540,1615,52,{p:prog(t,s+9.8,s+10.5),a:v*.95,col:DIM,f:'b'});
  }

  /* ---- 6: the paradox — the foot moves steadily, the top falls faster and faster ---- */
  if(IN(t,5)){ const [s,e]=SC[5], v=vis(t,s,e,.45,.01), x=xParadox(t), y=yOf(x), vy=-2*x/y;
    title('المفارقة',t,5,ORANGE);
    const vf=v*(1-ease((t-(s+9))/.5));
    math([dd('x'),' = 2'],460,1290,80,{p:prog(t,s+.4,s+1.2),a:vf});
    write('ثابت',690,1290,56,{p:prog(t,s+1,s+1.5),a:vf,col:DIM,f:'b'});
    math([dd('y'),' = −',{f:['x','y']},'·2'],540,1435,80,{p:prog(t,s+1.2,s+2.2),a:vf});
    if(t>=PT0-.4){ const a=v*clamp((t-PT0+.4)/.4)*(1-ease((t-(s+9))/.5));
      math(['x = '+x.toFixed(2)],215,1565,54,{a,col:BLUE}); math(['y = '+y.toFixed(2)],540,1565,54,{a,col:BLUE}); math([dd('y'),' = '+vy.toFixed(2)],860,1565,54,{a,col:ORANGE,glow:6});
      write('حركة مبطّأة ×'+Math.round(SLOW),540,1650,46,{a:a*.9,col:DIM,f:'b'});
      const [tx,ty]=topP(x); arrow(tx-34,ty-6,tx-34,ty-6+Math.min(260,-vy*22),1,BLUE,6); }
    if(t>=s+9.5){ const vc=v*(1-ease((t-(s+13.4))/.4));
      write('القاعدة تبتعد بسرعة ثابتة…',540,1330,62,{p:prog(t,s+9.5,s+10.4),a:vc,f:'b'});
      write('أما الرأس فينزل أسرع فأسرع كلما اقترب من الأرض',540,1425,50,{p:prog(t,s+10.1,s+11.3),a:vc,col:ORANGE,glow:8,f:'b'}); }
    if(t>=s+13.7){
      write('جرّب بنفسك',540,1300,70,{p:prog(t,s+13.7,s+14.3),a:v,col:ORANGE,glow:10});
      write('ما معدل نزول الرأس عندما ⁦x = 6 m⁩ ؟',540,1400,58,{p:prog(t,s+14.2,s+15.1),a:v,f:'b'});
      write('اكتب جوابك في التعليقات',540,1495,54,{p:prog(t,s+14.9,s+15.7),a:v,col:DIM,f:'b'}); }
  }

  if(extra) extra();
  write('NIBOR  /  MOTION',540,1760,40,{a:.85*vis(t,.8,D,.6,.01),col:'#9fd8e0'});
  const r=rng(Math.floor(t*30)+3);
  for(const [x,y,col] of TIPS){ L.save(); L.fillStyle=col; for(let i=0;i<9;i++){ L.globalAlpha=.25+r()*.5; L.beginPath(); L.arc(x+(r()-.5)*26,y+(r()-.5)*26,1+r()*2.6,0,2*PI); L.fill(); } L.globalAlpha=.9; L.shadowColor=col; L.shadowBlur=16; L.beginPath(); L.arc(x,y,4,0,2*PI); L.fill(); L.restore(); }
  L.save(); L.globalCompositeOperation='destination-in'; L.drawImage(grain,0,0); L.restore();
  g.save(); g.filter='blur(7px)'; g.globalAlpha=.35; g.drawImage(layer,0,0); g.restore();
  g.drawImage(layer,0,0);
  const fb=(t-(D-.5))/.5; if(fb>0){ g.fillStyle=`rgba(0,0,0,${clamp(fb)})`; g.fillRect(0,0,W,H); }
}

/* ---- the example as written in the book (p. 94), after the brainstorm question ---- */
const Q0=4.55, SH=12;
const BOOK=['سلم طوله ⁦10m⁩ يستند طرفه الأسفل على أرض أفقية وطرفه العلوي على حائط رأسي، فإذا انزلق الطرف الأسفل مبتعداً عن الحائط بمعدل ⁦2m/s⁩ عندما يكون الطرف الأسفل على بعد ⁦8m⁩ عن الحائط جد :',
            ['1','معدل انزلاق الطرف العلوي.'],['2','سرعة تغير الزاوية بين السلم والأرض.']];
let LINES=null;
function wrapBook(){ const sz=48, font=`500 ${sz}px Body, ${LT}`, max=880, out=[['مثال 4',ORANGE,60,'r']];
  for(const part of BOOK){ if(Array.isArray(part)){ out.push([part[1],WHITE,sz,'b',part[0]]); continue; }
    let cur=''; for(const w of part.split(' ')){ const nx=cur?cur+' '+w:w; if(textW(nx,font)>max&&cur){ out.push([cur,WHITE,sz,'b']); cur=w; } else cur=nx; } if(cur) out.push([cur,WHITE,sz,'b']); }
  return out; }
function statement(u){ const v=Math.min(ease(u/.5),1-ease((u-(SH-.6))/.6)); if(v<=0) return;
  const x0=60,x1=1020,y0=440,y1=1200;
  L.save(); L.globalAlpha=.93*v; L.fillStyle='#1d2827'; L.beginPath(); L.roundRect(x0,y0,x1-x0,y1-y0,26); L.fill(); L.restore();
  const P=[[x0+14,y0+4],[x1-8,y0],[x1+2,y1-12],[x0+6,y1+2],[x0-2,y0+16],[x0+14,y0+4]]; stroke(P,prog(u,.1,1.1),WHITE,4,{a:.8*v});
  if(!LINES) LINES=wrapBook(); const n=LINES.length-1, gap=Math.min(80,(y1-y0-150)/n), dt=Math.min(.7,5.5/n);
  let y=y0+92; LINES.forEach(([txt,col,sz,f,badge],i)=>{ const a=.5+i*dt, p=prog(u,a,a+.8);
    if(badge){ const w=textW(txt,`500 ${sz}px Body, ${LT}`), bx=540+w/2+12; write(txt,540-28,y,sz,{p,a:v,col,f,w:500});
      if(p>0){ stroke(ellipseP(bx,y-16,26,26),p,ORANGE,4,{a:v}); math(badge,bx,y,42,{a:v*clamp(p*2),col:ORANGE}); } }
    else write(txt,540,y,sz,{p,a:v,col,glow:i?0:8,f,w:i?500:700});
    y+=i?gap:(gap+18); });
  stroke([[430,y0+112],[650,y0+110]],prog(u,.9,1.4),ORANGE,3,{a:.6*v}); }
const CUT0=8.6, CUT=65/30;   /* givens: skip the idle 2.17 s once the numbers are on the drawing */
const render=t=>{ if(t<Q0) frame(t); else if(t<Q0+SH) frame(Q0,()=>statement(t-Q0)); else { let u=t-SH; if(u>=CUT0) u+=CUT; frame(u); } };
 

const real=u=>u<CUT0?u+SH:u+SH-CUT, NAMES=['فيثاغورس', 'أولاً', 'ثانياً', 'المفارقة'];
  const cues=[{t:0,l:'السؤال'},{t:Q0,l:'نص المثال'},{t:Q0+SH,l:'المعطيات'}].concat(SC.slice(2).map((s,i)=>({t:real(s[0]),l:NAMES[i]})));
  return {render,D:D+SH-CUT,cues};
};

/* ===================== Nibor Motion integration ===================== */
window.NM = window.NM || {};
const NMx = window.NM;
const FONT_FILES = [['Ruqaa', '700', 'chalk-ruqaa-700.woff2'], ['Ruqaa', '400', 'chalk-ruqaa-400.woff2'], ['Chalk', '700', 'chalk-caveat-700.woff2'],
  ['Chalk', '600', 'chalk-caveat-600.woff2'], ['Body', '500 700', 'chalk-marhey-500.woff2']];
let fontsPromise = null;
function fontsReady() {
  if (fontsPromise) return fontsPromise;
  fontsPromise = (async () => { if (!window.FontFace || !document.fonts) return;
    for (const [family, weight, url] of FONT_FILES) { try { const f = await new FontFace(family, `url("${url}")`, { weight, display: 'block' }).load(); document.fonts.add(f); } catch (e) { /* the system font is used */ } } })();
  return fontsPromise;
}
/* the export waits for NM.fonts.ready(): make it wait for the chalk fonts too */
if (NMx.fonts && NMx.fonts.ready) { const orig = NMx.fonts.ready.bind(NMx.fonts); NMx.fonts.ready = async r => { await fontsReady(); return orig(r); }; }
fontsReady().then(() => { try { NMx.core && NMx.core.renderCurrent && NMx.core.renderCurrent(); } catch (e) {} });

/* the two reels and their Math-books keys; one narration suggestion per scene (shown in the prompter, read in your own words) */
const META = {
  cone: { key: 'g12c3/rates:rCone:5', title: 'المرشح المخروطي', num: 5, page: 95, narration: [
    'مرشح مخروطي يُصبّ فيه السائل بمعدل خمسة ويتسرّب منه بمعدل واحد… فبأي سرعة يرتفع السائل؟',
    'مثال خمسة، صفحة خمسة وتسعين: مرشح مخروطي قاعدته أفقية ورأسه للأسفل، ارتفاعه أربعة وعشرون سنتيمتراً وطول قطر قاعدته ستة عشر سنتيمتراً، يُصبّ فيه سائل بمعدل خمسة سنتيمترات مكعبة في الثانية، بينما يتسرّب منه بمعدل سنتيمتر مكعب واحد في الثانية. جد معدل تغيّر عمق السائل في اللحظة التي يكون فيها عمقه اثني عشر سنتيمتراً.',
    'نضع المعطيات على الرسم: الارتفاع أربعة وعشرون، والقطر ستة عشر، والمطلوب معدل تغيّر العمق عندما يكون العمق اثني عشر.',
    'السائل يدخل بخمسة ويخرج بواحد، فمعدل تغيّر الحجم الصافي أربعة سنتيمترات مكعبة في الثانية. انتبه: لا تنسَ التسرّب.',
    'من تشابه المثلثين: نصف القطر على الارتفاع يساوي ثمانية على أربعة وعشرين، إذن r يساوي h على ثلاثة. نعوّض في حجم المخروط فيصبح الحجم π على سبعة وعشرين في h تكعيب. نعوّض العلاقة قبل الاشتقاق، أما الأرقام فبعده.',
    'نشتق بالنسبة إلى الزمن، ثم نعوّض أربعة واثني عشر: أربعة تساوي ستة عشر π في معدل تغيّر العمق، إذن المعدل يساوي واحداً على أربعة π، أي نحو ثمانية من مئة من السنتيمتر في الثانية. والإشارة موجبة: العمق يزداد.',
    'لاحظ: الحجم يزداد بمعدل ثابت، لكن الارتفاع يتباطأ، لأن المخروط يتّسع كلما ارتفع السائل. جرّب بنفسك: ماذا لو كان التسرّب ثلاثة؟ اكتب جوابك في التعليقات.'] },
  ladder: { key: 'g12c3/rates:rLadder:4', title: 'السلم المنزلق', num: 4, page: 94, narration: [
    'يبتعد أسفل السلم عن الحائط بمعدل ثابت… فبأي سرعة ينزل رأسه؟',
    'مثال أربعة، صفحة أربعة وتسعين: سلم طوله عشرة أمتار يستند طرفه الأسفل على أرض أفقية وطرفه العلوي على حائط رأسي، فإذا انزلق الطرف الأسفل مبتعداً عن الحائط بمعدل مترين في الثانية، عندما يكون الطرف الأسفل على بعد ثمانية أمتار عن الحائط، جد: أولاً معدل انزلاق الطرف العلوي، وثانياً سرعة تغيّر الزاوية بين السلم والأرض.',
    'نضع المعطيات على الرسم: طول السلم عشرة، وبعد القاعدة عن الحائط x، وارتفاع الرأس y، والزاوية θ عند القاعدة. ونحن عند اللحظة x تساوي ثمانية.',
    'من مبرهنة فيثاغورس: x تربيع زائد y تربيع يساوي مئة. عند x تساوي ثمانية يكون y ستة. انتبه: طول السلم ثابت.',
    'نشتق الطرفين بالنسبة إلى الزمن، ثم نعوّض: اثنان وثلاثون زائد اثني عشر في dy على dt يساوي صفراً، إذن dy على dt يساوي سالب ثمانية على ثلاثة، أي نحو سالب اثنين وسبعة وستين من مئة متر في الثانية. والسالب يعني أن الطرف العلوي ينزل.',
    'جيب الزاوية يساوي y على عشرة. نشتق، ثم نعوّض جيب التمام ثمانية على عشرة، ومعدل الرأس من الفقرة الأولى، فيكون معدل تغيّر الزاوية سالب ثلث راديان في الثانية. والسالب يعني أن الزاوية تصغر.',
    'لاحظ: القاعدة تبتعد بسرعة ثابتة، لكن الرأس ينزل أسرع فأسرع كلما اقترب من الأرض. جرّب بنفسك: ما معدل نزول الرأس عندما تكون x ستة أمتار؟ اكتب جوابك في التعليقات.'] }
};
const inst = {};
const reel = id => inst[id] || (inst[id] = REELS[id]());
const segment = (R, k) => [R.cues[k].t, k + 1 < R.cues.length ? R.cues[k + 1].t : R.D];

function clean(c) {
  if (!c || typeof c !== 'object' || !REELS[c.reel]) return undefined;
  const k = Math.max(0, Math.min(6, Math.round(+c.seg || 0)));
  return { reel: String(c.reel), seg: k };
}
/* draw scene `scene` at progress p. A scene longer than its segment (a long recorded voice) holds the fully drawn
   picture and plays the segment's fade-out at the very end; a shorter one plays the segment faster. */
function draw(ctx, scene, p) {
  const c = scene && scene.chalk; if (!c || !REELS[c.reel]) return false;
  const R = reel(c.reel), [a, b] = segment(R, c.seg), nat = b - a, dur = Math.max(.5, +scene.duration || nat), q = Math.max(0, Math.min(1, p)), tau = q * dur, TAIL = .6;
  let t;
  if (dur <= nat + 1e-6) t = a + q * nat;
  else if (tau < nat - TAIL) t = a + tau;
  else if (tau > dur - TAIL) t = b - (dur - tau);
  else t = b - TAIL;
  /* editing (not playing or exporting): the end of a scene shows its finished picture, not its fade-out */
  const idle = typeof playing !== 'undefined' && typeof exporting !== 'undefined' && !playing && !exporting;
  if (idle && q >= 1) t = b - TAIL;
  R.render(Math.max(0, Math.min(R.D - 1e-3, t)));
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (W / H > .7) { ctx.fillStyle = '#151d1d'; ctx.fillRect(0, 0, W, H); const w = H * 9 / 16; ctx.drawImage(cv, (W - w) / 2, 0, w, H); }
  else ctx.drawImage(cv, 0, 0, W, H);
  ctx.restore();
  return true;
}
const forKey = key => Object.keys(META).find(id => META[id].key === key) || null;
function build(base, id) {
  const R = reel(id), M = META[id], stamp = Date.now().toString(36), existing = JSON.parse(JSON.stringify(base));
  return {
    ...existing,
    projectId: 'chalk-' + stamp, format: 'portrait', chapters: [], theme: 'blackboard',
    name: `ريلز السبورة · مثال ${M.num} ص ${M.page} — ${M.title}`,
    branding: { ...existing.branding, showHeader: false, showFooter: false },
    scenes: R.cues.map((cue, k) => { const [a, b] = segment(R, k);
      return { id: `chalk-${stamp}-${k + 1}`, title: cue.l, question: '', equation: '', answer: '', speechText: M.narration[k] || '',
        duration: Math.ceil((b - a) * 2) / 2, autoDuration: true, transition: 'fade', chalk: { reel: id, seg: k } }; })
  };
}
const describe = id => { const R = reel(id); return `${R.cues.length} مشاهد · ${Math.round(R.D)} ث قبل التسجيل · عمودي 1080×1920 بأسلوب السبورة الطباشيرية؛ يطول المشهد مع صوتك ويثبت رسمه حتى ينتهي كلامك.`; };
NMx.chalk = { META, clean, draw, build, forKey, describe, fontsReady, ids: () => Object.keys(META) };
})();
