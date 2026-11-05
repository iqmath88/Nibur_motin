# Nibor Motion v0.8.1 — تحرير مباشر على الهاتف

- تحديد العنوان والسؤال والمعادلة والنتيجة والملصقات مباشرة من لوحة المعاينة.
- سحب العناصر باللمس أو S Pen وتعديل الحجم بواسطة مقبض دائري أو شريط الحجم السياقي.
- حفظ مراكز العناصر الأفقية لكل مشهد في JSON مع رجوع 50% للمشاريع القديمة.
- إطار التحديد والمقبض يظهران في المعاينة فقط، لا في PNG أو الفيديو المصدّر.
- احتفظت نسخة 0.8.1 بمحرر المعادلات والصوت والملصقات والتصدير كما كان.

## الاختبار على Galaxy S25 Ultra
اختبر المس، السحب، التكبير، حالة لوحة المفاتيح، المعاينة وPNG والفيديو.

---

# Nibor Motion v0.7.0 — استوديو فيديوهات الرياضيات

تطبيق ويب ثابت يعمل دون خادم أو خطوة بناء. ارفع جميع ملفات جذر الحزمة مع مجلد `fonts/` إلى جذر مستودع GitHub Pages.

## الجديد
- ملفات مستقلة `fonts.js` و`captions.js` و`mathanim.js` و`audiomix.js` و`overlays.js`، تتشارك `window.NM`، وتُحمَّل قبل `app.js`.
- خط العناوين والنصوص قابل للاختيار، مع الرجوع التلقائي إلى خط النظام إن لم تتوفر ملفات WOFF2.
- ترجمة مكتوبة تعتمد على `speechText`، وتوقيت الصوت المسجل عند توفره، وتصدير SRT بتوقيت الفيديو الكامل.
- حركات fade / write / highlight / fromPrevious باستخدام صور MathJax SVG المخزنة في الكاش.
- مشهد خطاف، شريط تقدم على مستوى المشروع، وأدلة مناطق آمنة تظهر في المعاينة فقط.
- موسيقى مخزنة محلياً عبر IndexedDB ومؤثرات مولدة بـ Web Audio، مع خفض الموسيقى أثناء التعليق.

## إضافة الخطوط (الملفات لا تتضمنها الحزمة)

أنشئ/استخدم مجلد `fonts/`، ثم ضع الملفات التالية بأسمائها **بالضبط**:

| الملف | الخط | الوزن |
|---|---|---|
| `fonts/Cairo-Bold.woff2` | Cairo | 700 |
| `fonts/NotoSansArabic-Regular.woff2` | Noto Sans Arabic | 400 |
| `fonts/NotoSansArabic-Bold.woff2` | Noto Sans Arabic | 700 |

مصادر موثوقة للخطوط:
- Cairo: https://github.com/google/fonts/tree/main/ofl/cairo أو https://github.com/Gue3bara/Cairo
- Noto Sans Arabic: https://github.com/google/fonts/tree/main/ofl/notosansarabic أو https://notofonts.github.io/arabic/

إن حمّلت ملف TTF متغيراً، فلا يكفي تغيير امتداده إلى `.woff2`: حوِّله فعلياً إلى WOFF2 بإحدى أدوات تحويل الخطوط الموثوقة خارج التطبيق مع تثبيت الوزن 700 أو 400. احتفظ برخصة OFL الأصلية وسجلات حقوق المؤلف مع الملفات الفعلية. يتضمن `fonts/LICENSE.txt` إيضاحاً فقط؛ لا يحل محل إشعارات الترخيص الأصلية. لن تتوقف المعاينة إذا لم تضف الملفات؛ سيظهر تنبيه ويستخدم التطبيق خط النظام.

## البيانات والتوافق

يُحدِّث `cleanProject` و`cleanScene` البيانات القديمة بقيم افتراضية، ولا يحذف خصائصها القديمة. الإصدار الجديد يحفظ حقول `fonts`, `captions`, `overlays`, وإعدادات `audio` الجديدة على مستوى المشروع؛ ويحفظ `voiceDuration`, `equationAnim`, `equationAnimDuration`, `highlightAt`, `sceneType`, `resultEffect` لكل مشهد؛ و`effect` لكل ملصق. لا يُضمَّن الصوت/الموسيقى في JSON؛ يظلان في IndexedDB بهذا الجهاز.

## اختبار ضروري على iPad

1. افتح الموقع من Safari؛ راقب تحميل MathJax/MathLive والخطوط عند توفرها.
2. جرّب تغيير الخط ومعاينة PNG؛ تحقق من مطابقتهما.
3. أضف نص `speechText` وشغّل الترجمة، وصدّر SRT وتحقق من التوقيتات.
4. جرّب الحركات الأربع ومعادلة `x=\\mark{2^3}` ثم صدّر MP4 أو WebM وفق دعم Safari.
5. أضف خطافاً وشريط تقدم ودليل TikTok؛ يجب ألا يظهر دليل المنطقة الآمنة في PNG والفيديو.
6. أضف موسيقى وتعليقاً صوتياً وملصق pop، اختبر خفض الصوت ثم افحص ملف الفيديو النهائي (مسار الصوت ومدته والدقة).
7. جرّب الإيقاف أثناء التصدير للتأكد من عدم إنشاء ملف ناقص.

**قيود:** Safari قد يقلل دقة 1080×1920 أو يرفض ترميز MP4/خلط الصوت، حتى إن كانت أبعاد Canvas الأصلية 1080×1920. لا يمكن إثبات نتيجة التصدير النهائية دون تشغيل على جهازك. الترجمة تعتمد على توقيت محسوب تقديرياً لا على تحليل صوت/تمييز كلام فعلي. مناطق المنصات تقديرية وقابلة للتغير.


## v0.8.0: Mobile-first workspace
- A five-item bottom navigation is displayed on phones up to 760px CSS width: scenes, edit, audio, design, export.
- The 9:16 Canvas preview stays in the primary page; editing opens a dismissible bottom-area overlay panel.
- Existing editor controls and event handlers are preserved; `mobile-ui.js` only groups existing DOM nodes.
- On tablets/desktops over 760px, the original 3-column editor remains.
- No engine, JSON, audio, math or video export changes.
- Test on Galaxy S25 Ultra (Chrome and Samsung Internet), particularly on-screen keyboard, S Pen dragging, modal scrolling and browser safe areas.
