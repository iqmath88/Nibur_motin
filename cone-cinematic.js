/* Nibor Motion v0.16.1 — Cone Cinematic. All visuals use the app's shared Canvas. */
'use strict';
window.NM=window.NM||{};
(function(NM){
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function stageOf(scene){return Number.isInteger(scene?.coneStage)&&scene.coneStage>=1&&scene.coneStage<=6?scene.coneStage:0}
  function draw(c,scene,progress){
    const step=stageOf(scene);if(!step)return;
    const t=((step-1)+clamp(progress,0,1))*10;
    const pi=Math.PI, volume0=pi*Math.pow(9.5,3)/27, volume=volume0+4*t;
    const height=Math.cbrt(volume*27/pi), radius=height/3;
    c.save();
    // Mathematically constrained water height and radius: r/h = 1/3.
    const cx=540,tip=1370,rimY=620,fullH=24,fullR=8,rx=308,ry=54;
    const waterY=tip-(height/fullH)*(tip-rimY),waterRX=rx*(radius/fullR),waterRY=ry*(radius/fullR);
    function line(x1,y1,x2,y2,color,width=3){
      c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.lineWidth=width;c.strokeStyle=color;c.stroke();
    }
    function ellipse(x,y,a,b,fill,stroke){
      c.beginPath();c.ellipse(x,y,a,b,0,0,Math.PI*2);
      if(fill){c.fillStyle=fill;c.fill()}
      if(stroke){c.strokeStyle=stroke;c.lineWidth=3;c.stroke()}
    }
    const halo=c.createRadialGradient(cx,940,40,cx,940,520);
    halo.addColorStop(0,'rgba(31,175,200,.17)');halo.addColorStop(1,'rgba(31,175,200,0)');
    c.fillStyle=halo;c.fillRect(0,360,1080,1090);
    // Back outline and water.
    line(cx-rx,rimY,cx,tip,'#72b9ca',5);
    line(cx+rx,rimY,cx,tip,'#72b9ca',5);
    const grad=c.createLinearGradient(0,waterY,0,tip);
    grad.addColorStop(0,'rgba(93,224,246,.80)');
    grad.addColorStop(.5,'rgba(20,151,203,.68)');
    grad.addColorStop(1,'rgba(12,74,159,.78)');
    c.beginPath();c.moveTo(cx-waterRX,waterY);c.lineTo(cx,tip);c.lineTo(cx+waterRX,waterY);c.closePath();
    c.fillStyle=grad;c.fill();
    ellipse(cx,waterY,waterRX,waterRY,'rgba(107,238,250,.65)','#b4fbff');
    ellipse(cx,rimY,rx,ry,'rgba(4,42,62,.22)','#8bc5d8');
    c.setLineDash([10,12]);line(cx,rimY,cx,tip,'rgba(229,248,255,.4)',2);c.setLineDash([]);
    line(905,rimY,905,tip,'#92b5c4',2);
    line(891,rimY,919,rimY,'#92b5c4',2);
    line(891,tip,919,tip,'#92b5c4',2);
    c.fillStyle='#cfe8f3';c.font='bold 30px Arial';c.textAlign='left';c.direction='ltr';c.fillText('24 cm',920,995);
    line(cx,rimY-76,cx+rx,rimY-76,'#86d4df',3);
    c.textAlign='center';c.fillText('8 cm',690,rimY-100);
    line(cx-waterRX-48,waterY,cx-waterRX-48,tip,'#ffd683',3);
    c.fillStyle='#ffe1a0';c.font='italic bold 40px Georgia';c.fillText('h',cx-waterRX-75,(tip+waterY)/2);
    // Values from same state used by the simulation.
    c.fillStyle='rgba(8,37,55,.93)';c.beginPath();c.roundRect(164,1400,752,74,22);c.fill();
    c.fillStyle='#e8fbff';c.textAlign='center';c.font='bold 36px Georgia';
    c.fillText(`h(t) = ${height.toFixed(2)} cm`,540,1447);
    c.restore();
  }
  const specs=[
    ['مسألة المخروط','مخروط ارتفاعه 24 سم ونصف قطره 8 سم','\\frac{dV}{dt}=4\\ \\mathrm{cm^3/s}','نبحث عن معدل ارتفاع الماء عند بلوغ ارتفاعه 12 سم'],
    ['تشابه المثلثات','نسبة نصف قطر الماء إلى ارتفاعه ثابتة','\\frac{r}{h}=\\frac{8}{24}=\\frac{1}{3}','إذن نصف قطر سطح الماء r = h/3'],
    ['قانون الحجم','حجم المخروط المملوء بالماء','V=\\frac{\\pi}{3}r^2h=\\frac{\\pi}{27}h^3','نعوّض علاقة التشابه قبل الاشتقاق'],
    ['الاشتقاق بالنسبة للزمن','نشتق طرفَي علاقة الحجم بالنسبة للزمن','\\frac{dV}{dt}=\\frac{\\pi}{9}h^2\\frac{dh}{dt}','لاحظ أن كلاً من الحجم والارتفاع يتغير مع الزمن'],
    ['التعويض','عند اللحظة التي يكون فيها ارتفاع الماء 12 سم','4=\\frac{\\pi}{9}(12)^2\\frac{dh}{dt}','قيمة h هنا تخص لحظة التعويض فقط'],
    ['النتيجة النهائية','معدل ارتفاع الماء عند h = 12 سم','\\frac{dh}{dt}=\\frac{1}{4\\pi}\\approx 0.0796\\ \\mathrm{cm/s}','المعدل موجب، فسطح الماء يرتفع']
  ];
  function build(base){
    const existing=JSON.parse(JSON.stringify(base));
    return {
      ...existing,
      projectId:'cone-'+Date.now().toString(36),format:'portrait',chapters:[],
      name:'المعدلات المرتبطة بالزمن — المخروط (نموذج)',
      theme:'dark',
      branding:{...existing.branding,header:'رياضيات السادس العلمي | المعدلات المرتبطة بالزمن',footer:'Nibor Motion · محاكاة المخروط'},
      scenes:specs.map(([title,question,equation,speechText],i)=>({
        id:'cone-'+Date.now().toString(36)+'-'+(i+1),
        coneStage:i+1,
        title,question,equation,answer:'',speechText,
        duration:10,qAt:8,eAt:40,aAt:80,
        titleY:19,questionY:29,equationY:84,
        titleSize:55,questionSize:38,equationScale:112,
        titleBg:'none',questionBg:'none',equationAnim:'fade'
      }))
    };
  }
  function init(){
    const panel=document.getElementById('autoReelsPanel');
    if(!panel||document.getElementById('nmConeGenerate'))return;
    const b=document.createElement('button');
    b.type='button';b.id='nmConeGenerate';b.textContent='💧 إنشاء فيديو المخروط السينمائي (6 مشاهد)';
    b.style.cssText='width:100%;margin-top:12px;padding:12px;min-height:46px';
    b.addEventListener('click',()=>{
      if(!NM.core||!NM.loadProject){alert('المحرر غير جاهز');return}
      if(NM.core.busy()){alert('أوقف التشغيل أو التصدير أولاً');return}
      if(!confirm('سيُستبدل المشروع الحالي بمثال المخروط. احفظ نسخة احتياطية أولاً. متابعة؟'))return;
      try{NM.loadProject(build(NM.core.getState()),'تم إنشاء مشاهد المخروط الستة. راجع المعادلات قبل التصدير.')}
      catch(e){alert('تعذر الإنشاء: '+e.message)}
    });
    panel.appendChild(b);
  }
  NM.coneCinematic={draw,stageOf,build};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})(window.NM);
