// ══════════════════════════════════════════════
//  المنهج الدراسي
// ══════════════════════════════════════════════
var CUR = {
  1:{name:'الفصل الأول',color:'#1a5276',units:[
    {id:1,name:'الدورة المحاسبية',lessons:['الدورة المحاسبية المفهوم والمراحل','نظرية القيد المزدوج والعمليات المالية','تسجيل القيود المحاسبية','دفتر اليومية','دفتر الأستاذ','ميزان المراجعة']},
    {id:2,name:'القوائم المالية',lessons:['القوائم المالية الأنواع والأهمية','إقفال الحسابات']},
    {id:3,name:'التحليل المالي',lessons:['مفهوم التحليل المالي وأهميته','تقنيات التحليل المالي','التحليل المالي والنسب','استخدامات التحليل المالي']},
    {id:4,name:'الأسواق المالية',lessons:['مفهوم الأسواق المالية وأنواعها وأهميتها','مفهوم الأصول المالية وأنواعها','مفهوم التداول وأنواعه وآلياته','دور التكنولوجيا في الأسواق المالية','بورصة عمان']},
    {id:5,name:'البنك المركزي الأردني',lessons:['البنك المركزي والسياسة النقدية','دور البنك المركزي الأردني في حماية المستهلك المالي','دور البنك المركزي الأردني في نشر الثقافة المالية المجتمعية','دور البنك المركزي الأردني في المحافظة على الاستقرار المصرفي والمالي']}
  ]},
  2:{name:'الفصل الثاني',color:'#1e6b4a',units:[
    {id:6,name:'المؤسسات المالية الدولية',lessons:['المؤسسات المالية الدولية: نشأتها، وأنواعها','صندوق النقد الدولي','البنك الدولي']},
    {id:7,name:'الاستدامة المالية',lessons:['مقدمة في الاستدامة المالية','أهداف الاستدامة المالية','الاستدامة المالية: التحديات والحلول','الاقتصاد الأخضر والاستدامة']},
    {id:8,name:'الذكاء الاصطناعي التوليدي',lessons:['الذكاء الاصطناعي التوليدي','الذكاء الاصطناعي التوليدي وعالم المال','المستشار المالي','الذكاء الاصطناعي التوليدي وخصوصية البيانات','الذكاء الاصطناعي التوليدي وأخلاقيات الأعمال']},
    {id:9,name:'السياسات الاقتصادية',lessons:['مقدمة في السياسات الاقتصادية والسياسة المالية','تأثير السياسة المالية في النشاط الاقتصادي','السياسة النقدية: أدواتها، وتأثيرها في النشاط الاقتصادي','السياسة التجارية: أدواتها وتأثيرها في النشاط الاقتصادي','السياسة الصناعية: أدواتها، وتأثيرها في النشاط الاقتصادي']}
  ]}
};

var LBL = ['أ','ب','ج','د'];
var currentMode = 'train';
var currentQuiz = [];
var currentQuizTitle = '';
var userAnswers = {};
var timerInterval = null;
var timeLeft = 0;
var pageHistory = [];
var currentPageId = 'start';

// ══════════════════════════════════════════════
//  وضع المحرر (Editor Mode) — تفعيل بكلمة مرور
// ══════════════════════════════════════════════
// كلمة المرور — يمكنك تغييرها هنا فقط (لا تظهر للزائر العادي)
var EDITOR_PASSWORD = 'hussein2024';

// حالة وضع المحرر
var editorMode = false;

// فهرس سريع لكل سؤال في البنك برقمه id
function buildBankIndex(){
  var idx = {};
  for (var i = 0; i < bank.length; i++) idx[bank[i].id] = i;
  return idx;
}
var bankIndexById = buildBankIndex();

// تطبيق أي تعديلات محفوظة محلياً على البنك
function applyLocalOverrides(){
  try {
    var raw = localStorage.getItem('qbank_overrides');
    if (!raw) return;
    var overrides = JSON.parse(raw);
    if (!overrides || typeof overrides !== 'object') return;
    var applied = 0;
    Object.keys(overrides).forEach(function(idStr){
      var idx = bankIndexById[parseInt(idStr, 10)];
      if (idx === undefined) return;
      var ov = overrides[idStr];
      if (ov.text !== undefined) bank[idx].text = ov.text;
      if (Array.isArray(ov.options)) bank[idx].options = ov.options.slice();
      if (typeof ov.answer === 'number') bank[idx].answer = ov.answer;
      if (ov.lesson !== undefined) bank[idx].lesson = ov.lesson;
      applied++;
    });
    if (applied > 0) console.log('[Editor] تم تطبيق ' + applied + ' تعديل محفوظ محلياً');
  } catch(e){ console.warn('[Editor] فشل تطبيق التعديلات المحلية:', e); }
}

// حفظ تعديل سؤال في localStorage
function saveOverride(questionId, patch){
  var raw = localStorage.getItem('qbank_overrides');
  var overrides = raw ? JSON.parse(raw) : {};
  if (!overrides[questionId]) overrides[questionId] = {};
  if (patch.text !== undefined) overrides[questionId].text = patch.text;
  if (patch.options !== undefined) overrides[questionId].options = patch.options.slice();
  if (patch.answer !== undefined) overrides[questionId].answer = patch.answer;
  if (patch.lesson !== undefined) overrides[questionId].lesson = patch.lesson;
  localStorage.setItem('qbank_overrides', JSON.stringify(overrides));
}

// حذف كل التعديلات المحفوظة (reset)
function clearAllOverrides(){
  localStorage.removeItem('qbank_overrides');
  localStorage.removeItem('qbank_additions');
}

// ══════════════════════════════════════════════
//  إضافة أسئلة جديدة (Add Questions)
// ══════════════════════════════════════════════
// سياق الإضافة الحالي (يُملأ عند فتح نافذة "إضافة سؤال")
var editorAddContext = null;

// البحث عن سياق الدرس في المنهج (sem + unit + unitName)
function findLessonContext(lessonName){
  for (var s = 1; s <= 2; s++){
    var sem = CUR[s];
    if (!sem || !sem.units) continue;
    for (var ui = 0; ui < sem.units.length; ui++){
      var u = sem.units[ui];
      for (var li = 0; li < u.lessons.length; li++){
        if (u.lessons[li] === lessonName){
          return { sem: s, unitId: u.id, unitName: u.name, lesson: u.lessons[li] };
        }
      }
    }
  }
  return null;
}

// تطبيق الأسئلة المُضافة محفوظة محلياً على البنك
function applyLocalAdditions(){
  try {
    var raw = localStorage.getItem('qbank_additions');
    if (!raw) return;
    var additions = JSON.parse(raw);
    if (!Array.isArray(additions)) return;
    var applied = 0;
    additions.forEach(function(q){
      // تخطي إذا كان موجوداً بالفعل (مثلاً بعد تصدير البنك وإعادة رفعه)
      if (bankIndexById[q.id] !== undefined) return;
      bank.push(q);
      bankIndexById[q.id] = bank.length - 1;
      applied++;
    });
    if (applied > 0) console.log('[Editor] تم تطبيق ' + applied + ' سؤال مُضاف محفوظ محلياً');
  } catch(e){ console.warn('[Editor] فشل تطبيق الإضافات المحلية:', e); }
}

// فتح نافذة "إضافة سؤال جديد"
function openAddQuestion(lessonName){
  if (!editorMode) return;
  var ctx = findLessonContext(lessonName);
  if (!ctx){ toast('لم يتم العثور على الدرس في المنهج', 'err'); return; }
  editorAddContext = ctx;

  var body =
    '<div class="ed-field">' +
      '<div class="ed-ctx-info">' +
        '<span class="ed-ctx-tag"><i class="fas fa-layer-group"></i> الفصل ' + ctx.sem + '</span>' +
        '<span class="ed-ctx-tag"><i class="fas fa-cube"></i> وحدة ' + ctx.unitId + ': ' + ctx.unitName + '</span>' +
        '<span class="ed-ctx-tag"><i class="fas fa-book"></i> ' + ctx.lesson + '</span>' +
      '</div>' +
      '<p class="editor-hint"><i class="fas fa-magic"></i> سيُضاف السؤال تلقائياً إلى نماذج الوحدة ' + ctx.unitId + ' والنماذج الوزارية.</p>' +
    '</div>' +
    '<div class="ed-field">' +
      '<label class="ed-label">نص السؤال</label>' +
      '<textarea id="ed-text" class="ed-textarea" rows="3" placeholder="اكتب نص السؤال هنا..."></textarea>' +
    '</div>' +
    '<div class="ed-field">' +
      '<label class="ed-label">الخيارات (حدد الإجابة الصحيحة)</label>' +
      '<div class="ed-opts">';
  for (var j = 0; j < 4; j++){
    body += '<div class="ed-opt-row">' +
      '<label class="ed-opt-radio"><input type="radio" name="ed-answer" value="' + j + '" ' + (j === 0 ? 'checked' : '') + '> <span class="ed-opt-lbl">' + LBL[j] + '</span></label>' +
      '<input type="text" class="ed-opt-input" id="ed-opt-' + j + '" placeholder="الخيار ' + LBL[j] + '">' +
      '</div>';
  }
  body += '</div></div>' +
    '<div class="ed-actions">' +
      '<button class="ed-btn ed-btn-save" onclick="saveAddQuestion()">➕ إضافة السؤال</button>' +
      '<button class="ed-btn ed-btn-cancel" onclick="closeEditorEdit()">إلغاء</button>' +
    '</div>' +
    '<p class="ed-note"><i class="fas fa-info-circle"></i> السؤال الجديد يُحفظ على هذا الجهاز أولاً. لتطبيقه نهائياً على الموقع، استخدم زر "تصدير البنك" من الشريط العلوي وارفع الملف الناتج لمستودع GitHub.</p>';

  var bodyEl = document.getElementById('editor-edit-body');
  if (bodyEl) bodyEl.innerHTML = body;

  // تحديث عنوان النافذة
  var titleEl = document.querySelector('#editor-edit-overlay .editor-modal-title');
  if (titleEl) titleEl.innerHTML = '<i class="fas fa-plus-circle"></i> إضافة سؤال جديد';

  var ov = document.getElementById('editor-edit-overlay');
  if (ov) ov.classList.add('open');

  // التركيز على حقل النص
  setTimeout(function(){
    var t = document.getElementById('ed-text');
    if (t) t.focus();
  }, 150);
}

function saveAddQuestion(){
  if (!editorAddContext){ toast('خطأ: لا يوجد سياق للإضافة', 'err'); return; }
  var ctx = editorAddContext;

  var textEl = document.getElementById('ed-text');
  var newText = textEl ? textEl.value.trim() : '';
  if (!newText){ toast('نص السؤال لا يمكن أن يكون فارغاً', 'err'); textEl.focus(); return; }

  var newOpts = [];
  for (var j = 0; j < 4; j++){
    var el = document.getElementById('ed-opt-' + j);
    newOpts.push(el ? el.value.trim() : '');
  }
  // جميع الخيارات الأربعة يجب أن تكون مملوءة
  for (var k = 0; k < newOpts.length; k++){
    if (!newOpts[k]){
      toast('الخيار ' + LBL[k] + ' لا يمكن أن يكون فارغاً', 'err');
      var emptyEl = document.getElementById('ed-opt-' + k);
      if (emptyEl) emptyEl.focus();
      return;
    }
  }

  var radio = document.querySelector('input[name="ed-answer"]:checked');
  var newAnswer = radio ? parseInt(radio.value, 10) : 0;
  if (isNaN(newAnswer) || newAnswer < 0 || newAnswer >= newOpts.length) newAnswer = 0;

  // توليد ID جديد (أعلى id موجود + 1)
  var maxId = 0;
  for (var i = 0; i < bank.length; i++){ if (bank[i].id > maxId) maxId = bank[i].id; }
  var newId = maxId + 1;

  // إنشاء كائن السؤال
  var newQ = {
    id: newId,
    sem: ctx.sem,
    unit: ctx.unitId,
    unitName: ctx.unitName,
    lesson: ctx.lesson,
    text: newText,
    options: newOpts,
    answer: newAnswer,
    _examKey: ''
  };

  // إضافة إلى البنك في الذاكرة
  bank.push(newQ);
  bankIndexById[newId] = bank.length - 1;

  // حفظ في localStorage
  var raw = localStorage.getItem('qbank_additions');
  var additions = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(additions)) additions = [];
  additions.push(newQ);
  localStorage.setItem('qbank_additions', JSON.stringify(additions));

  closeEditorEdit();
  editorAddContext = null;
  toast('✅ تمت إضافة السؤال (رقم ' + newId + ') — سيظهر في نماذج الوحدة ' + ctx.unitId + ' والوزارية', 'ok');

  // إعادة عرض الصفحة الحالية لرؤية السؤال الجديد
  refreshCurrentPage();
}

// تفعيل/إيقاف وضع المحرر
function toggleEditorMode(){
  if (editorMode){
    // إيقاف
    editorMode = false;
    localStorage.removeItem('qbank_editor_active');
    document.body.classList.remove('editor-on');
    updateEditorBtnUI();
    toast('تم إيقاف وضع المحرر', 'ok');
    // إعادة عرض الصفحة الحالية بدون أزرار التحرير
    refreshCurrentPage();
  } else {
    // التحقق إن كان مفعّلاً سابقاً على هذا الجهاز
    if (localStorage.getItem('qbank_editor_active') === '1'){
      editorMode = true;
      document.body.classList.add('editor-on');
      updateEditorBtnUI();
      toast('وضع المحرر مُفعّل', 'ok');
      refreshCurrentPage();
    } else {
      // طلب كلمة المرور
      openEditorPwd();
    }
  }
}

function updateEditorBtnUI(){
  var btn = document.getElementById('btn-editor');
  if (!btn) return;
  if (editorMode){
    btn.classList.add('active');
    btn.innerHTML = '<i class="fas fa-unlock"></i> <span id="btn-editor-text">وضع المحرر</span>';
    // إضافة زر التصدير في الشريط
    var nb = document.getElementById('navbar');
    if (nb && !document.getElementById('btn-export')){
      var ex = document.createElement('button');
      ex.id = 'btn-export';
      ex.className = 'nb-export';
      ex.innerHTML = '<i class="fas fa-download"></i> تصدير';
      ex.onclick = exportBank;
      nb.appendChild(ex);
    }
  } else {
    btn.classList.remove('active');
    btn.innerHTML = '<i class="fas fa-lock"></i> <span id="btn-editor-text">وضع المحرر</span>';
    // إزالة زر التصدير من الشريط
    var ex = document.getElementById('btn-export');
    if (ex) ex.remove();
  }
}

// نافذة كلمة المرور
function openEditorPwd(){
  var ov = document.getElementById('editor-pwd-overlay');
  if (!ov) return;
  ov.classList.add('open');
  var inp = document.getElementById('editor-pwd-input');
  if (inp){ inp.value = ''; setTimeout(function(){ inp.focus(); }, 100); }
  var err = document.getElementById('editor-pwd-err');
  if (err) err.style.display = 'none';
}
function closeEditorPwd(){
  var ov = document.getElementById('editor-pwd-overlay');
  if (ov) ov.classList.remove('open');
}
function submitEditorPwd(){
  var inp = document.getElementById('editor-pwd-input');
  var err = document.getElementById('editor-pwd-err');
  if (!inp) return;
  var val = inp.value;
  if (val === EDITOR_PASSWORD){
    editorMode = true;
    localStorage.setItem('qbank_editor_active', '1');
    document.body.classList.add('editor-on');
    closeEditorPwd();
    updateEditorBtnUI();
    toast('✅ تم تفعيل وضع المحرر', 'ok');
    refreshCurrentPage();
  } else {
    if (err){ err.style.display = 'block'; }
    inp.value = '';
    inp.focus();
  }
}

// نافذة تحرير السؤال
function openEditorEdit(questionId){
  if (!editorMode) return;
  var idx = bankIndexById[questionId];
  if (idx === undefined){ toast('السؤال غير موجود', 'err'); return; }
  var q = bank[idx];

  var body =
    '<div class="ed-field">' +
      '<label class="ed-label">نص السؤال</label>' +
      '<textarea id="ed-text" class="ed-textarea" rows="3">' + escHtml(q.text) + '</textarea>' +
    '</div>' +
    '<div class="ed-field">' +
      '<label class="ed-label">الخيارات (الإجابة الصحيحة محددة)</label>' +
      '<div class="ed-opts">';
  for (var j = 0; j < (q.options || []).length; j++){
    var isAns = (j === q.answer);
    body += '<div class="ed-opt-row">' +
      '<label class="ed-opt-radio"><input type="radio" name="ed-answer" value="' + j + '" ' + (isAns ? 'checked' : '') + '> <span class="ed-opt-lbl">' + LBL[j] + '</span></label>' +
      '<input type="text" class="ed-opt-input" id="ed-opt-' + j + '" value="' + escHtml(q.options[j] || '') + '">' +
      '</div>';
  }
  body += '</div></div>' +
    '<div class="ed-field">' +
      '<label class="ed-label">الدرس (اختياري)</label>' +
      '<input type="text" id="ed-lesson" class="ed-input" value="' + escHtml(q.lesson || '') + '">' +
    '</div>' +
    '<div class="ed-actions">' +
      '<button class="ed-btn ed-btn-save" onclick="saveEditorEdit(' + questionId + ')">💾 حفظ التعديل</button>' +
      '<button class="ed-btn ed-btn-cancel" onclick="closeEditorEdit()">إلغاء</button>' +
    '</div>' +
    '<p class="ed-note"><i class="fas fa-info-circle"></i> التعديل يُحفظ على هذا الجهاز. لتطبيقه نهائياً للموقع، استخدم زر "تصدير البنك" من الشريط العلوي.</p>';

  var bodyEl = document.getElementById('editor-edit-body');
  if (bodyEl) bodyEl.innerHTML = body;

  // تحديث عنوان النافذة (لإعادة ضبطه إذا كانت مفتوحة سابقاً في وضع "إضافة")
  var titleEl = document.querySelector('#editor-edit-overlay .editor-modal-title');
  if (titleEl) titleEl.innerHTML = '<i class="fas fa-edit"></i> تحرير السؤال';

  // إعادة ضبط سياق الإضافة (لأننا الآن في وضع تحرير)
  editorAddContext = null;

  var ov = document.getElementById('editor-edit-overlay');
  if (ov) ov.classList.add('open');
}

function closeEditorEdit(){
  var ov = document.getElementById('editor-edit-overlay');
  if (ov) ov.classList.remove('open');
  editorAddContext = null;
}

function saveEditorEdit(questionId){
  var idx = bankIndexById[questionId];
  if (idx === undefined){ toast('السؤال غير موجود', 'err'); return; }
  var q = bank[idx];

  var textEl = document.getElementById('ed-text');
  var lessonEl = document.getElementById('ed-lesson');
  var newText = textEl ? textEl.value.trim() : q.text;
  var newLesson = lessonEl ? lessonEl.value.trim() : (q.lesson || '');

  // قراءة الخيارات
  var newOpts = [];
  for (var j = 0; j < (q.options || []).length; j++){
    var el = document.getElementById('ed-opt-' + j);
    newOpts.push(el ? el.value : '');
  }
  // قراءة الإجابة الصحيحة
  var radio = document.querySelector('input[name="ed-answer"]:checked');
  var newAnswer = radio ? parseInt(radio.value, 10) : q.answer;
  if (isNaN(newAnswer) || newAnswer < 0 || newAnswer >= newOpts.length) newAnswer = q.answer;

  // التحقق: لا يمكن أن يكون هناك خيار فارغ في موقع الإجابة
  if (!newOpts[newAnswer] || !newOpts[newAnswer].trim()){
    toast('الإجابة الصحيحة لا يمكن أن تكون فارغة', 'err');
    return;
  }

  // تطبيق التعديل على البنك في الذاكرة
  q.text = newText;
  q.options = newOpts;
  q.answer = newAnswer;
  q.lesson = newLesson;

  // حفظ في localStorage
  saveOverride(questionId, { text: newText, options: newOpts, answer: newAnswer, lesson: newLesson });

  closeEditorEdit();
  toast('✅ تم حفظ التعديل', 'ok');

  // إعادة عرض الصفحة الحالية لرؤية التغيير
  refreshCurrentPage();
}

// إعادة عرض الصفحة الحالية
function refreshCurrentPage(){
  if (currentPageId === 'quiz'){
    // إعادة عرض الاختبار مع الحفاظ على إجابات المستخدم
    var savedAnswers = userAnswers;
    renderQuiz();
    userAnswers = savedAnswers;
    // إعادة تطبيق الاختيارات السابقة بصرياً
    Object.keys(userAnswers).forEach(function(qi){
      var q = currentQuiz[parseInt(qi, 10)];
      if (!q) return;
      var vi = validInfo(q);
      var oi = userAnswers[qi];
      if (currentMode === 'train'){
        // إعادة عرض حالة التدريب
        for (var j = 0; j < vi.opts.length; j++){
          var el = document.getElementById('qopt-' + qi + '-' + j);
          if (!el) continue;
          el.classList.add('locked');
          if (j === vi.answerIdx) el.classList.add('correct');
          else if (j === oi && oi !== vi.answerIdx) el.classList.add('wrong');
        }
        var card = document.getElementById('qcard-' + qi);
        if (card) card.classList.add(oi === vi.answerIdx ? 'q-correct' : 'q-wrong');
        var fb = document.getElementById('qfb-' + qi);
        if (fb){
          fb.style.display = 'block';
          var ok = oi === vi.answerIdx;
          fb.className = 'qfb ' + (ok ? 'fb-ok' : 'fb-err');
          fb.innerHTML = ok ? '✅ إجابة صحيحة! أحسنت.' : '❌ خطأ — الصحيح: <strong>' + LBL[vi.answerIdx] + ' — ' + vi.opts[vi.answerIdx] + '</strong>';
        }
      } else {
        var sel = document.getElementById('qopt-' + qi + '-' + oi);
        if (sel) sel.className = 'qopt exam-sel';
      }
    });
    updProgress(Object.keys(userAnswers).length);
    updQNav();
  } else if (currentPageId === 'result' && currentMode === 'exam'){
    showResults();
  } else {
    // للصفحات الأخرى، إعادة عرضها
    switch (currentPageId){
      case 'home': renderHome(); break;
      case 'lessons': renderLessonPage(); break;
      case 'units': renderUnitPage(); break;
      case 'ministerial': renderMinisterialPage(); break;
      case 'exams': renderExamPage(); break;
    }
  }
}

// تصدير البنك المُعدَّل كملف JavaScript جديد
function exportBank(){
  var content = 'var bank = ' + JSON.stringify(bank, null, 2) + ';\n';
  var blob = new Blob([content], { type: 'application/javascript' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'questions.js';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  toast('📦 تم تنزيل questions.js المُعدَّل', 'ok');
}

function escHtml(s){
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ══════════════════════════════════════════════
//  توليد النماذج الثابتة
// ══════════════════════════════════════════════

// نماذج الوحدات: كل نموذج 20 سؤال بالترتيب
// الأسئلة الزائدة (أقل من 10) تُلحق بالنموذج الأخير بدلاً من إهمالها
function getUnitModels(unitId) {
  var qs = bank.filter(function(q){ return q.unit === unitId && !q._examKey; });
  var models = [];
  var i = 0;
  // إنشاء نماذج كاملة بحجم 20
  for (i = 0; i + 20 <= qs.length; i += 20) {
    models.push(qs.slice(i, i + 20));
  }
  // معالجة الأسئلة المتبقية
  var leftover = qs.slice(i);
  if (leftover.length > 0) {
    if (models.length === 0) {
      // لا توجد نماذج كاملة، أضف الجزء المتبقي كنموذج (حتى لو صغير)
      models.push(leftover);
    } else if (leftover.length >= 10) {
      // كافٍ لنموذج جديد
      models.push(leftover);
    } else {
      // إلحاق بالنموذج الأخير (حتى يظهر السؤال الجديد فوراً)
      models[models.length - 1] = models[models.length - 1].concat(leftover);
    }
  }
  return models;
}

// نماذج وزارية: 40 سؤال موزعة على الوحدات بالتساوي
// الأسئلة الزائدة عن الحصص تُوزَّع على المجموعات الموجودة (round-robin)
function getMinisterialModels() {
  var unitIds = [1,2,3,4,5,6,7,8,9];
  var total = 40;
  var base = Math.floor(total / unitIds.length); // 4
  var extra = total % unitIds.length;             // 4

  // حصة كل وحدة (أول 4 وحدات تأخذ سؤال زيادة)
  var quotas = unitIds.map(function(uid, i){
    return base + (i < extra ? 1 : 0);
  });

  // تقسيم أسئلة كل وحدة إلى مجموعات بحجم الحصة + توزيع البواقي
  var unitGroups = {};
  var minModels = Infinity;

  unitIds.forEach(function(uid, i) {
    var qs = bank.filter(function(q){ return q.unit === uid && !q._examKey; });
    var quota = quotas[i];
    var groups = [];
    var j = 0;
    // مجموعات كاملة
    for (j = 0; j + quota <= qs.length; j += quota) {
      groups.push(qs.slice(j, j + quota));
    }
    // الأسئلة المتبقية — توزيع round-robin على المجموعات الموجودة
    var leftover = qs.slice(j);
    if (leftover.length > 0 && groups.length > 0) {
      for (var k = 0; k < leftover.length; k++) {
        var targetGroup = k % groups.length;
        groups[targetGroup] = groups[targetGroup].concat([leftover[k]]);
      }
    } else if (leftover.length > 0 && groups.length === 0) {
      // الوحدة كلها أقل من الحصة — مجموعة واحدة صغيرة
      groups.push(leftover);
    }
    unitGroups[uid] = groups;
    if (groups.length === 0) { minModels = 0; }
    else if (groups.length < minModels) { minModels = groups.length; }
  });

  if (minModels === 0) return [];

  // بناء النماذج: كل نموذج يجمع مجموعة من كل وحدة
  var models = [];
  for (var m = 0; m < minModels; m++) {
    var mqs = [];
    unitIds.forEach(function(uid) {
      if (unitGroups[uid][m]) mqs = mqs.concat(unitGroups[uid][m]);
    });
    // نقبل النماذج التي تحتوي على 36 سؤالاً فأكثر (بدل اشتراط 40 بالضبط)
    if (mqs.length >= 36) models.push(mqs);
  }
  return models;
}

// ══════════════════════════════════════════════
//  التنقل بين الصفحات
// ══════════════════════════════════════════════
function showPage(id) {
  document.querySelectorAll('.pg').forEach(function(p){ p.classList.remove('active'); p.style.display='none'; });
  var el = document.getElementById('pg-'+id);
  if (!el) return;
  el.style.display = 'block';
  // تأخير بسيط لتفعيل الأنيميشن
  requestAnimationFrame(function(){ el.classList.add('active'); });
  currentPageId = id;
  window.scrollTo(0,0);

  var nb = document.getElementById('navbar');
  if (nb) nb.style.display = (id==='start') ? 'none' : 'flex';
  var btnBack = document.getElementById('btn-back');
  var btnHome = document.getElementById('btn-home');
  if (btnBack) btnBack.style.display = (id==='start'||id==='home') ? 'none' : 'inline-flex';
  if (btnHome) btnHome.style.display = (id==='start'||id==='home') ? 'none' : 'inline-flex';

  // زر خريطة الأسئلة
  var qnb = document.getElementById('qnav-btn');
  if (qnb) qnb.style.display = (id==='quiz' && currentQuiz.length > 5) ? 'flex' : 'none';

  // زر وضع المحرر — يظهر دائماً بعد صفحة البداية (لمن يملك كلمة المرور فقط)
  var eb = document.getElementById('btn-editor');
  if (eb) eb.style.display = (id==='start') ? 'none' : 'inline-flex';

  // تحديث عنوان الشريط
  var titles = {
    home:'الرئيسية', lessons:'اختبار حسب الدرس', units:'اختبار حسب الوحدة',
    ministerial:'النماذج الوزارية', exams:'أسئلة التقويم',
    quiz: currentQuizTitle || 'الاختبار', result:'النتيجة'
  };
  var nt = document.getElementById('nav-title');
  if (nt) nt.textContent = titles[id] || '';
}

function goTo(id) { pageHistory.push(currentPageId); showPage(id); }
function goBack() { if (pageHistory.length > 0) showPage(pageHistory.pop()); else showPage('home'); }
function goHome() { pageHistory = []; renderHome(); showPage('home'); }

// ══════════════════════════════════════════════
//  صفحة البداية
// ══════════════════════════════════════════════
function setMode(m) {
  currentMode = m;
  document.getElementById('btn-train').classList.toggle('active', m==='train');
  document.getElementById('btn-exam').classList.toggle('active', m==='exam');
}

function startApp() { pageHistory = []; renderHome(); showPage('home'); }

// ══════════════════════════════════════════════
//  الصفحة الرئيسية
// ══════════════════════════════════════════════
function renderHome() {
  var modeLabel = currentMode==='exam' ? '<i class="fas fa-pen-fancy"></i> نمط امتحاني' : '<i class="fas fa-book-open"></i> نمط تدريبي';
  var html =
    '<div class="mode-indicator">' + modeLabel +
      ' <button class="btn-change" onclick="showPage(\'start\')">تغيير</button>' +
    '</div>' +
    '<div class="menu-grid">' +
      mCard('fa-book-open','card-blue','اختبار حسب الدرس','اختر فصلاً ثم درساً',"renderLessonPage(); goTo('lessons')") +
      mCard('fa-cubes','card-green','اختبار حسب الوحدة','نماذج ثابتة ×20 سؤال',"renderUnitPage(); goTo('units')") +
      mCard('fa-star','card-gold','النماذج الوزارية','نماذج ثابتة ×40 سؤال',"renderMinisterialPage(); goTo('ministerial')") +
      mCard('fa-clipboard-list','card-purple','أسئلة التقويم','امتحانات الفصلين',"renderExamPage(); goTo('exams')") +
    '</div>';
  document.getElementById('home-inner').innerHTML = html;
}

function mCard(icon, cls, title, sub, onclick) {
  return '<div class="menu-card '+cls+'" onclick="'+onclick+'">' +
    '<div class="mc-icon"><i class="fas '+icon+'"></i></div>' +
    '<div class="mc-title">'+title+'</div>' +
    '<div class="mc-sub">'+sub+'</div></div>';
}

// ══════════════════════════════════════════════
//  صفحة الدروس
// ══════════════════════════════════════════════
function renderLessonPage() {
  var html = '<div class="page-title"><i class="fas fa-book-open"></i> اختبار حسب الدرس</div><div class="sem-cards">';
  [1,2].forEach(function(s){
    var cnt = bank.filter(function(q){return q.sem===s&&!q._examKey;}).length;
    html += '<div class="sem-card sem'+s+'" onclick="renderSemLessons('+s+')">' +
      '<div class="sc-icon">'+(s===1?'<i class="fas fa-book"></i>':'<i class="fas fa-book"></i>')+'</div>' +
      '<div class="sc-name">'+CUR[s].name+'</div><div class="sc-cnt">'+cnt+' سؤال</div></div>';
  });
  html += '</div><div id="sem-lessons-area"></div>';
  document.getElementById('lessons-inner').innerHTML = html;
}

function renderSemLessons(sem) {
  var html = '';
  CUR[sem].units.forEach(function(u){
    var hasQs = u.lessons.some(function(l){
      return bank.filter(function(q){return q.lesson===l&&!q._examKey;}).length > 0;
    });
    if (!hasQs) return;
    html += '<div class="unit-sec"><div class="unit-sec-hdr">الوحدة '+u.id+': '+u.name+'</div>';
    u.lessons.forEach(function(l){
      var cnt = bank.filter(function(q){return q.lesson===l&&!q._examKey;}).length;
      if (!cnt) return;
      html += '<div class="lesson-row" onclick="showLessonAction(\''+esc(l)+'\',\''+esc(u.name)+'\')">' +
        '<span class="lr-icon"><i class="fas fa-file-alt"></i></span>' +
        '<span class="lr-name">'+l+'</span>' +
        '<span class="lr-cnt">'+cnt+' سؤال</span>' +
        '<span class="lr-arrow"><i class="fas fa-chevron-left"></i></span></div>';
    });
    html += '</div>';
  });
  document.getElementById('sem-lessons-area').innerHTML = html;
  document.getElementById('sem-lessons-area').scrollIntoView({behavior:'smooth',block:'start'});
}

function showLessonAction(lesson, unitName) {
  var cnt = bank.filter(function(q){return q.lesson===lesson&&!q._examKey;}).length;
  var old = document.getElementById('lesson-action-box');
  if (old) old.remove();
  var box = document.createElement('div');
  box.id = 'lesson-action-box';
  box.className = 'action-box';
  // زر إضافة سؤال يظهر فقط في وضع المحرر
  var addBtn = editorMode
    ? '<button class="btn-add-q" onclick="openAddQuestion(\''+esc(lesson)+'\')"><i class="fas fa-plus-circle"></i> إضافة سؤال للدرس</button>'
    : '';
  box.innerHTML =
    '<div class="ab-lesson"><i class="fas fa-file-alt"></i> '+lesson+'</div>' +
    '<div class="ab-unit">'+unitName+'</div>' +
    '<div class="ab-cnt">'+cnt+' سؤال متاح</div>' +
    '<div class="ab-actions">' +
      '<button class="btn-launch" onclick="launchLessonQuiz(\''+esc(lesson)+'\')">🚀 ابدأ الاختبار</button>' +
      addBtn +
    '</div>';
  document.getElementById('sem-lessons-area').appendChild(box);
  box.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function launchLessonQuiz(lessonName) {
  var qs = bank.filter(function(q){return q.lesson===lessonName&&!q._examKey;});
  if (!qs.length) { toast('لا توجد أسئلة في هذا الدرس','err'); return; }
  currentQuiz = qs;
  currentQuizTitle = lessonName;
  userAnswers = {};
  renderQuiz();
  clearInterval(timerInterval);
  if (currentMode==='exam') startTimer(qs.length*60);
  goTo('quiz');
}

// ══════════════════════════════════════════════
//  صفحة الوحدات (نماذج ثابتة)
// ══════════════════════════════════════════════
function renderUnitPage() {
  var html = '<div class="page-title"><i class="fas fa-cubes"></i> اختبار حسب الوحدة</div><div class="units-grid">';
  [1,2].forEach(function(s){
    CUR[s].units.forEach(function(u){
      var models = getUnitModels(u.id);
      var cnt = bank.filter(function(q){return q.unit===u.id&&!q._examKey;}).length;
      html += '<div class="unit-card-m usem'+s+'">' +
        '<div class="ucm-num">و'+u.id+'</div>' +
        '<div class="ucm-name">'+u.name+'</div>' +
        '<div class="ucm-sem">'+CUR[s].name+'</div>' +
        '<div class="ucm-cnt">'+cnt+' سؤال</div>' +
        '<div class="ucm-models">';
      if (models.length > 0) {
        models.forEach(function(m, idx){
          html += '<span class="model-badge" onclick="event.stopPropagation();launchUnitModel('+u.id+','+idx+')">نموذج '+(idx+1)+' ('+m.length+')</span>';
        });
      } else {
        html += '<span class="model-badge empty">لا توجد نماذج كاملة</span>';
      }
      html += '</div></div>';
    });
  });
  html += '</div>';
  document.getElementById('units-inner').innerHTML = html;
}

function launchUnitModel(unitId, modelIndex) {
  var models = getUnitModels(unitId);
  if (!models[modelIndex]) { toast('النموذج غير متاح','err'); return; }
  var uName = '';
  [1,2].forEach(function(s){ CUR[s].units.forEach(function(u){ if(u.id===unitId) uName=u.name; }); });
  currentQuiz = models[modelIndex];
  currentQuizTitle = uName + ' — نموذج ' + (modelIndex+1);
  userAnswers = {};
  renderQuiz();
  clearInterval(timerInterval);
  if (currentMode==='exam') startTimer(currentQuiz.length*60);
  goTo('quiz');
}

// ══════════════════════════════════════════════
//  صفحة النماذج الوزارية
// ══════════════════════════════════════════════
function renderMinisterialPage() {
  var models = getMinisterialModels();
  var html = '<div class="page-title"><i class="fas fa-star"></i> النماذج الوزارية</div>';

  if (models.length === 0) {
    // التحقق من أي وحدات فارغة
    var missing = [];
    [1,2,3,4,5,6,7,8,9].forEach(function(uid){
      var c = bank.filter(function(q){return q.unit===uid&&!q._examKey;}).length;
      if (c === 0) {
        var n = '';
        [1,2].forEach(function(s){ CUR[s].units.forEach(function(u){ if(u.id===uid) n=u.name; }); });
        missing.push(n || 'وحدة '+uid);
      }
    });
    html += '<div class="no-data-box">' +
      '<i class="fas fa-exclamation-triangle"></i>' +
      '<p>لا يمكن إنشاء نماذج وزارية حالياً</p>' +
      '<p style="margin-top:8px;color:var(--muted);font-size:13px">الوحدات التالية لا تحتوي على أسئلة كافية:<br><strong>' + missing.join(' — ') + '</strong></p>' +
      '<p style="margin-top:8px;color:var(--text2);font-size:13px">كل نموذج وزاري يحتاج 40 سؤالاً موزعة بالتساوي على الوحدات التسع (4 أو 5 أسئلة لكل وحدة)</p></div>';
  } else {
    html += '<div class="min-cards">';
    models.forEach(function(m, idx){
      // حساب توزيع الأسئلة على الوحدات في هذا النموذج
      var unitCounts = {};
      m.forEach(function(q){ unitCounts[q.unit] = (unitCounts[q.unit]||0)+1; });
      var info = Object.keys(unitCounts).map(function(uid){
        return 'و'+uid+': '+unitCounts[uid];
      }).join(' | ');
      html += '<div class="min-card" onclick="launchMinModel('+idx+')">' +
        '<div class="min-ic"><i class="fas fa-scroll"></i></div>' +
        '<div class="min-name">النموذج الوزاري '+(idx+1)+'</div>' +
        '<div class="min-info">40 سؤال — '+info+'</div></div>';
    });
    html += '</div>';
  }
  document.getElementById('ministerial-inner').innerHTML = html;
}

function launchMinModel(modelIndex) {
  var models = getMinisterialModels();
  if (!models[modelIndex]) { toast('النموذج غير متاح','err'); return; }
  currentQuiz = models[modelIndex];
  currentQuizTitle = 'النموذج الوزاري ' + (modelIndex+1);
  userAnswers = {};
  renderQuiz();
  clearInterval(timerInterval);
  if (currentMode==='exam') startTimer(currentQuiz.length*60);
  goTo('quiz');
}

// ══════════════════════════════════════════════
//  صفحة التقويمات
// ══════════════════════════════════════════════
function renderExamPage() {
  var html = '<div class="page-title"><i class="fas fa-clipboard-list"></i> أسئلة التقويم</div><div class="sem-cards">' +
    '<div class="sem-card sem1" onclick="renderSemExams(1)"><div class="sc-icon"><i class="fas fa-book"></i></div><div class="sc-name">الفصل الأول</div><div class="sc-cnt">تقويمي ١ و٢ و٣ + النهائي</div></div>' +
    '<div class="sem-card sem2" onclick="renderSemExams(2)"><div class="sc-icon"><i class="fas fa-book"></i></div><div class="sc-name">الفصل الثاني</div><div class="sc-cnt">تقويمي ١ و٢ + النهائي</div></div>' +
    '</div><div id="sem-exam-area"></div>';
  document.getElementById('exams-inner').innerHTML = html;
}

function renderSemExams(sem) {
  var list = sem===1
    ? [{k:'tq1_f1',label:'التقويم الأول'},{k:'tq2_f1',label:'التقويم الثاني'},{k:'tq3_f1',label:'التقويم الثالث'},{k:'final_f1',label:'الاختبار النهائي'}]
    : [{k:'tq1_f2',label:'التقويم الأول'},{k:'tq2_f2',label:'التقويم الثاني'},{k:'final_f2',label:'الاختبار النهائي'}];
  var html = '<div class="exam-list">';
  var found = false;
  list.forEach(function(e){
    var qs = bank.filter(function(q){return q._examKey===e.k;});
    if (!qs.length) return;
    found = true;
    html += '<div class="exam-item" onclick="launchExamQuiz(\''+e.k+'\',\''+e.label+' — '+CUR[sem].name+'\')">' +
      '<span class="ei-icon"><i class="fas fa-file-alt"></i></span>' +
      '<span class="ei-name">'+e.label+'</span>' +
      '<span class="ei-cnt">'+qs.length+' سؤال</span>' +
      '<span class="ei-go">ابدأ <i class="fas fa-chevron-left"></i></span></div>';
  });
  html += '</div>';
  if (!found) {
    html = '<div class="no-data-box" style="margin-top:20px"><i class="fas fa-inbox"></i><p>لا توجد أسئلة تقويمية مضافة لهذا الفصل بعد</p></div>' + html;
  }
  document.getElementById('sem-exam-area').innerHTML = html;
  document.getElementById('sem-exam-area').scrollIntoView({behavior:'smooth',block:'start'});
}

function launchExamQuiz(examKey, title) {
  var qs = bank.filter(function(q){return q._examKey===examKey;});
  if (!qs.length) { toast('لا توجد أسئلة','err'); return; }
  currentQuiz = qs;
  currentQuizTitle = title;
  userAnswers = {};
  renderQuiz();
  clearInterval(timerInterval);
  if (currentMode==='exam') startTimer(qs.length*60);
  goTo('quiz');
}

// ══════════════════════════════════════════════
//  محرك الاختبار
// ══════════════════════════════════════════════
// يُعيد الخيارات الصالحة + مؤشر الإجابة الصحيحة مُعاد ضبطه ليطابق الخيارات بعد التصفية
function validInfo(q){
  var opts=q.options||[];
  var v=[],idxMap=[];
  for(var k=0;k<opts.length;k++){ if(opts[k]&&String(opts[k]).trim()){ v.push(opts[k]); idxMap.push(k); } }
  var a=idxMap.indexOf(q.answer); if(a===-1) a=0;
  return {opts:v, answerIdx:a};
}

function renderQuiz() {
  var modeTxt = currentMode==='exam' ? '<i class="fas fa-pen-fancy"></i> امتحاني' : '<i class="fas fa-book-open"></i> تدريبي';
  var html =
    '<div class="quiz-hdr"><div class="qhdr-row">' +
      '<span class="qhdr-title">'+(currentQuizTitle||'الاختبار')+'</span>' +
      '<span class="qhdr-mode">'+modeTxt+'</span>' +
      (currentMode==='exam'?'<span id="qtimer" class="qtimer"></span>':'') +
    '</div><div class="qprog-bar"><div class="qprog-fill" id="qpfill" style="width:0%"></div></div>' +
    '<div class="qprog-txt" id="qptxt">0 / '+currentQuiz.length+'</div></div><div id="qarea">';

  currentQuiz.forEach(function(q,i){
    var vi = validInfo(q);
    // زر التحرير — يظهر فقط في وضع المحرر
    var editBtn = editorMode ? '<button class="qedit-btn" onclick="event.stopPropagation();openEditorEdit('+q.id+')" title="تحرير هذا السؤال"><i class="fas fa-edit"></i></button>' : '';
    html += '<div class="qcard" id="qcard-'+i+'">' +
      '<div class="qcard-top"><span class="qbadge">س'+(i+1)+'</span><span class="qmeta">'+(q.lesson||'')+'</span>' + editBtn + '</div>' +
      '<div class="qtext">'+q.text+'</div><div class="qopts">';
    vi.opts.forEach(function(opt,j){
      html += '<div class="qopt" id="qopt-'+i+'-'+j+'" onclick="pick('+i+','+j+')">' +
        '<span class="qoc">'+LBL[j]+'</span><span class="qot">'+opt+'</span></div>';
    });
    html += '</div>';
    if (currentMode==='train') html += '<div class="qfb" id="qfb-'+i+'" style="display:none"></div>';
    html += '</div>';
  });
  html += '</div>';
  document.getElementById('quiz-inner').innerHTML = html +
    '<button class="btn-finish" onclick="finishQuiz()">✅ إنهاء وعرض النتيجة</button>';
  updProgress(0);
}

function pick(qi, oi) {
  var q = currentQuiz[qi];
  var vi = validInfo(q);
  var correctIdx = vi.answerIdx;
  if (currentMode==='train' && userAnswers[qi]!==undefined) return;
  userAnswers[qi] = oi;

  for (var j=0; j<vi.opts.length; j++) {
    var el = document.getElementById('qopt-'+qi+'-'+j);
    if (el) el.className = 'qopt';
  }

  if (currentMode==='train') {
    for (var j=0; j<vi.opts.length; j++) {
      var el = document.getElementById('qopt-'+qi+'-'+j);
      if (!el) continue;
      el.classList.add('locked');
      if (j===correctIdx) el.classList.add('correct');
      else if (j===oi && oi!==correctIdx) el.classList.add('wrong');
    }
    var card = document.getElementById('qcard-'+qi);
    if (card) card.classList.add(oi===correctIdx ? 'q-correct' : 'q-wrong');
    var fb = document.getElementById('qfb-'+qi);
    if (fb) {
      fb.style.display='block';
      var ok = oi===correctIdx;
      fb.className = 'qfb '+(ok?'fb-ok':'fb-err');
      fb.innerHTML = ok ? '✅ إجابة صحيحة! أحسنت.' : '❌ خطأ — الصحيح: <strong>'+LBL[correctIdx]+' — '+vi.opts[correctIdx]+'</strong>';
    }
  } else {
    var sel = document.getElementById('qopt-'+qi+'-'+oi);
    if (sel) sel.className = 'qopt exam-sel';
  }
  updProgress(Object.keys(userAnswers).length);
  updQNav();
}

function updProgress(n) {
  var total = currentQuiz.length;
  var pct = Math.round(n/total*100);
  var f = document.getElementById('qpfill');
  var t = document.getElementById('qptxt');
  if (f) f.style.width = pct+'%';
  if (t) t.textContent = n+' / '+total;
}

function finishQuiz() { clearInterval(timerInterval); showResults(); }

// ══════════════════════════════════════════════
//  خريطة الأسئلة
// ══════════════════════════════════════════════
function toggleQNav() {
  var ov = document.getElementById('qnav-overlay');
  ov.classList.toggle('open');
  if (ov.classList.contains('open')) updQNav();
}

function updQNav() {
  var grid = document.getElementById('qnav-grid');
  if (!grid) return;
  var html = '';
  currentQuiz.forEach(function(q,i){
    var cls = '';
    if (userAnswers[i]===undefined) cls = '';
    else if (userAnswers[i]===validInfo(q).answerIdx) cls = 'nd-correct';
    else cls = 'nd-wrong';
    html += '<div class="qnav-dot '+cls+'" onclick="jumpToQ('+i+')">'+(i+1)+'</div>';
  });
  grid.innerHTML = html;
}

function jumpToQ(i) {
  var el = document.getElementById('qcard-'+i);
  if (el) el.scrollIntoView({behavior:'smooth',block:'center'});
  document.getElementById('qnav-overlay').classList.remove('open');
}

// ══════════════════════════════════════════════
//  النتائج والتحليل
// ══════════════════════════════════════════════
function showResults() {
  var total=currentQuiz.length, correct=0, wrong=0, skipped=0;
  currentQuiz.forEach(function(q,i){
    if (userAnswers[i]===undefined) skipped++;
    else if (userAnswers[i]===validInfo(q).answerIdx) correct++;
    else wrong++;
  });
  var pct = Math.round(correct/total*100);
  var g = pct>=90?{t:'ممتاز 🏆',c:'#27ae60',bg:'#d4edda'}
    :pct>=80?{t:'جيد جداً ⭐',c:'#2980b9',bg:'#d4e8f5'}
    :pct>=70?{t:'جيد 👍',c:'#8e44ad',bg:'#ead7f5'}
    :pct>=60?{t:'مقبول 📖',c:'#f39c12',bg:'#fef9e7'}
    :{t:'يحتاج مراجعة 💪',c:'#e74c3c',bg:'#f8d7da'};

  // دائرة النتيجة
  var circ = 2 * Math.PI * 65; // نصف قطر 65
  var offset = circ - (pct / 100) * circ;

  var html =
    '<div class="score-card">' +
      '<div class="score-svg"><svg viewBox="0 0 150 150">' +
        '<circle class="score-bg-c" cx="75" cy="75" r="65"/>' +
        '<circle class="score-fill-c" id="score-arc" cx="75" cy="75" r="65" stroke-dasharray="'+circ+'" stroke-dashoffset="'+circ+'"/>' +
      '</svg><div class="score-pct-text"><span class="score-pct-num" id="score-num">0</span><span class="score-pct-sign">%</span></div></div>' +
      '<div class="sc-frac">'+correct+' / '+total+'</div>' +
      '<div class="sc-grade" style="background:'+g.bg+';color:'+g.c+'">'+g.t+'</div>' +
    '</div>' +
    '<div class="stats3">' +
      '<div class="s3box c"><div class="s3v">'+correct+'</div><div class="s3l">✅ صحيحة</div></div>' +
      '<div class="s3box w"><div class="s3v">'+wrong+'</div><div class="s3l">❌ خاطئة</div></div>' +
      '<div class="s3box s"><div class="s3v">'+skipped+'</div><div class="s3l">⏭ متروكة</div></div>' +
    '</div>' +
    buildAnalytics() +
    (currentMode==='exam' ? buildReview() : '') +
    '<div class="res-actions"><button class="btn-retry" onclick="retryQuiz()">🔄 إعادة الاختبار</button></div>';

  document.getElementById('result-inner').innerHTML = html;
  goTo('result');

  // تحريك الدائرة والرقم
  requestAnimationFrame(function(){
    setTimeout(function(){
      var arc = document.getElementById('score-arc');
      if (arc) arc.style.strokeDashoffset = offset;
      animateNum('score-num', 0, pct, 1200);
    }, 100);
  });
}

function animateNum(elId, from, to, dur) {
  var el = document.getElementById(elId);
  if (!el) return;
  var start = performance.now();
  function step(now) {
    var t = Math.min((now - start) / dur, 1);
    var ease = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + (to - from) * ease);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function buildAnalytics() {
  var unitMap = {};
  currentQuiz.forEach(function(q,i){
    var uid=q.unit||0; if(!uid) return;
    if(!unitMap[uid]){
      var uname='';
      [1,2].forEach(function(s){CUR[s].units.forEach(function(u){if(u.id===uid)uname=u.name;});});
      unitMap[uid]={name:uname,total:0,correct:0};
    }
    unitMap[uid].total++;
    if(userAnswers[i]===validInfo(q).answerIdx) unitMap[uid].correct++;
  });
  var keys=Object.keys(unitMap);
  if(keys.length<=1) return '';
  var weak=[];
  var rows=keys.map(function(uid){
    var u=unitMap[uid]; if(!u.total) return '';
    var pct=Math.round(u.correct/u.total*100);
    var c=pct>=80?'var(--success)':pct>=60?'var(--warning)':'var(--error)';
    if(pct<60) weak.push(u.name);
    return '<div class="arow"><div class="arow-name">'+u.name+'</div>' +
      '<div class="arow-bar"><div style="width:'+pct+'%;background:'+c+';height:100%;border-radius:4px"></div></div>' +
      '<div class="arow-pct" style="color:'+c+'">'+pct+'%</div></div>';
  }).join('');
  var advice = weak.length
    ? '<div class="advice-box">💡 <strong>تحتاج مراجعة:</strong> '+weak.join(' — ')+'</div>'
    : '<div class="advice-box ok">🌟 أداء ممتاز في جميع الوحدات!</div>';
  return '<div class="analytics-box"><div class="sec-title">📊 تحليل الأداء حسب الوحدة</div>'+rows+advice+'</div>';
}

function buildReview() {
  var html='<div class="review-box"><div class="sec-title">📋 مراجعة الإجابات</div>';
  currentQuiz.forEach(function(q,i){
    var vi = validInfo(q);
    var correctIdx = vi.answerIdx;
    var ans=userAnswers[i], skip=ans===undefined, ok=!skip&&ans===correctIdx;
    var sc=skip?'rs':ok?'rok':'rerr';
    var st=skip?'⏭ لم تُجب':ok?'✅ صحيحة':'❌ خاطئة';
    var editBtn = editorMode ? '<button class="qedit-btn redit-btn" onclick="event.stopPropagation();openEditorEdit('+q.id+')" title="تحرير هذا السؤال"><i class="fas fa-edit"></i></button>' : '';
    html+='<div class="rcard '+sc+'"><div class="rcard-hdr"><span class="rbadge">س'+(i+1)+'</span><span class="rstatus">'+st+'</span>'+editBtn+'</div>' +
      '<div class="rqtext">'+q.text+'</div><div class="ropts">';
    vi.opts.forEach(function(o,j){
      var lc=j===correctIdx?'rlbl-ok':j===ans&&!ok&&!skip?'rlbl-err':'';
      var tc=j===correctIdx?'color:var(--success);font-weight:700':j===ans&&!ok?'color:var(--error)':'';
      html+='<div class="ropt"><span class="rlbl '+lc+'">'+LBL[j]+'</span><span style="'+tc+'">'+o+'</span></div>';
    });
    html+='</div><div class="rmeta">📌 '+(q.lesson||'')+'</div></div>';
  });
  return html+'</div>';
}

function retryQuiz() {
  userAnswers={};
  currentQuiz=shuf(currentQuiz);
  renderQuiz();
  clearInterval(timerInterval);
  if(currentMode==='exam') startTimer(currentQuiz.length*60);
  pageHistory.pop();
  showPage('quiz');
}

// ══════════════════════════════════════════════
//  المؤقت
// ══════════════════════════════════════════════
function startTimer(sec) {
  timeLeft=sec;
  var el=document.getElementById('qtimer');
  if(el) el.style.display='inline-block';
  updTimer();
  timerInterval=setInterval(function(){ timeLeft--;updTimer(); if(timeLeft<=0){clearInterval(timerInterval);finishQuiz();} },1000);
}
function updTimer() {
  var el=document.getElementById('qtimer'); if(!el) return;
  var m=Math.floor(timeLeft/60),s=timeLeft%60;
  el.textContent='⏱ '+pad(m)+':'+pad(s);
  el.style.color=timeLeft<=60?'var(--error)':'var(--text2)';
}
function pad(n){return n<10?'0'+n:''+n;}

// ══════════════════════════════════════════════
//  أدوات مساعدة
// ══════════════════════════════════════════════
function shuf(a){
  var b=a.slice();
  for(var i=b.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=b[i];b[i]=b[j];b[j]=t;}
  return b;
}
function esc(s){return (s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");}

function toast(msg, type) {
  var box = document.getElementById('toast-box');
  var t = document.createElement('div');
  t.className = 'toast toast-' + (type||'warn');
  t.textContent = msg;
  box.appendChild(t);
  requestAnimationFrame(function(){ t.classList.add('show'); });
  setTimeout(function(){ t.classList.remove('show'); setTimeout(function(){ t.remove(); }, 300); }, 2500);
}