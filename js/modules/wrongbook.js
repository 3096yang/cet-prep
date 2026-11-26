/* ==========================================================================
   modules/wrongbook.js — 错题本 + 艾宾浩斯智能复习
   --------------------------------------------------------------------------
   数据：localStorage['cet:wrongbook']（由练习模块写入，本模块补充排程字段）
     record = {
       id, type, section, year, passage, question, options, answer, analysis,
       wrongCount, lastChoice, lastResult, lastAt,
       createdAt,        // 首次答错时间（列表按它倒序）
       correctStreak,    // 重做时连续答对次数，达到 3 即「已掌握」
       stage,            // 已完成复习轮次，决定下次间隔
       nextReviewAt,     // 下次复习时间戳（0 = 已掌握，不再推送）
       mastered          // 是否已掌握
     }
   复习节点：1 / 2 / 4 / 7 / 15 天（间隔数组 INTERVALS）
   ========================================================================== */
(function (global) {
  'use strict';

  var KEY = 'wrongbook';
  var INTERVALS = [1, 2, 4, 7, 15];  // 艾宾浩斯节点（天）
  var MASTER_STREAK = 3;             // 连续答对 3 次 → 已掌握
  var DAY = 24 * 60 * 60 * 1000;
  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  var state = {
    filter: 'all',   // all | due | mastered
    open: {},        // id -> 是否展开
    review: null     // { list, index, correct, locked }
  };

  var el = {};

  /* ---------------- 工具 ---------------- */

  function letterOf(i) {
    return LETTERS[i] || String(i + 1);
  }

  function intervalDays(stage) {
    return INTERVALS[Math.min(stage, INTERVALS.length - 1)];
  }

  function endOfToday() {
    var d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }

  function isDue(rec) {
    return !rec.mastered && rec.nextReviewAt > 0 && rec.nextReviewAt <= endOfToday();
  }

  /** 「我的答案」文本 */
  function mineText(rec) {
    if (rec.lastChoice == null || rec.lastChoice < 0) return '未作答';
    var text = rec.options[rec.lastChoice] || '';
    return rec.type === 'judge' ? text : letterOf(rec.lastChoice) + '）' + text;
  }

  /** 「正确答案」文本 */
  function answerText(rec) {
    var text = rec.options[rec.answer] || '';
    return rec.type === 'judge' ? text : letterOf(rec.answer) + '）' + text;
  }

  /** 下次复习时间的中文描述 */
  function reviewText(rec) {
    if (rec.mastered) return '已掌握';
    var diff = rec.nextReviewAt - Date.now();
    if (diff <= 0) return '今日待复习';
    var days = Math.ceil(diff / DAY);
    if (days <= 1) return '明日复习（1 天节点）';
    return days + ' 天后复习（' + intervalDays(rec.stage) + ' 天节点）';
  }

  /* ---------------- 数据存取 ---------------- */

  /** 补齐排程字段（兼容练习模块早期写入的裸记录） */
  function normalize(rec, id) {
    var now = Date.now();
    var createdAt = rec.createdAt || rec.lastAt || now;
    var stage = typeof rec.stage === 'number' ? rec.stage : 0;
    var streak = typeof rec.correctStreak === 'number' ? rec.correctStreak : 0;
    var mastered = !!rec.mastered || streak >= MASTER_STREAK;

    return {
      id: rec.id || id,
      type: rec.type || 'single',
      section: rec.section || '',
      year: rec.year || '',
      passage: rec.passage || '',
      question: rec.question || '',
      options: rec.options || [],
      answer: typeof rec.answer === 'number' ? rec.answer : 0,
      analysis: rec.analysis || '',
      wrongCount: rec.wrongCount || 1,
      lastChoice: typeof rec.lastChoice === 'number' ? rec.lastChoice : -1,
      lastResult: rec.lastResult || 'wrong',
      lastAt: rec.lastAt || createdAt,
      createdAt: createdAt,
      correctStreak: streak,
      stage: stage,
      mastered: mastered,
      // 下次复习时间：已掌握设为 0（不再推送）
      nextReviewAt: mastered ? 0 : (rec.nextReviewAt || createdAt + intervalDays(0) * DAY)
    };
  }

  /** 读取全部错题，按加入时间倒序 */
  function load() {
    var map = global.Store.get(KEY, {});
    var list = Object.keys(map).map(function (id) {
      return normalize(map[id], id);
    });
    list.sort(function (a, b) { return b.createdAt - a.createdAt; });
    return list;
  }

  function saveList(list) {
    var map = {};
    list.forEach(function (rec) { map[rec.id] = rec; });
    global.Store.set(KEY, map);
    notifyHome();
  }

  /** 单条更新：读 → 归一化 → 改 → 写回 */
  function updateRec(id, mutate) {
    var map = global.Store.get(KEY, {});
    if (!map[id]) return null;
    var rec = normalize(map[id], id);
    mutate(rec);
    map[id] = rec;
    global.Store.set(KEY, map);
    notifyHome();
    return rec;
  }

  function dueList() {
    return load().filter(isDue);
  }

  /* ---------------- 首页提醒 ---------------- */

  function notifyHome() {
    var due = dueList().length;
    var dueEl = document.querySelector('[data-home-due]');
    var hintEl = document.querySelector('[data-home-hint]');
    var btn = document.querySelector('[data-home-review-start]');

    if (dueEl) dueEl.textContent = String(due);
    if (dueEl) dueEl.hidden = due === 0;
    if (hintEl) {
      hintEl.textContent = due
        ? ' 道错题到期（1/2/4/7/15 天节点）'
        : '今天没有到期的错题，保持节奏就好。';
    }
    if (btn) btn.hidden = due === 0;
  }

  /* ---------------- 列表渲染 ---------------- */

  function buildItem(rec) {
    var li = document.createElement('li');
    li.className = 'wb-item' + (rec.mastered ? ' is-mastered' : '') + (state.open[rec.id] ? ' is-open' : '');
    li.setAttribute('data-id', rec.id);

    // 头部
    var head = document.createElement('button');
    head.type = 'button';
    head.className = 'wb-item__head';
    head.setAttribute('aria-expanded', state.open[rec.id] ? 'true' : 'false');

    var tag = document.createElement('span');
    tag.className = 'wb-item__tag';
    tag.textContent = rec.section || (rec.type === 'judge' ? '判断' : '单选');

    var title = document.createElement('span');
    title.className = 'wb-item__title';
    title.textContent = rec.question;

    var count = document.createElement('span');
    count.className = 'wb-item__count';
    count.textContent = '错 ' + rec.wrongCount;

    var arrow = document.createElement('span');
    arrow.className = 'wb-item__arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '▾';

    head.appendChild(tag);
    head.appendChild(title);
    head.appendChild(count);
    head.appendChild(arrow);

    // 折叠时也显示的“我的答案 / 正确答案”
    var summary = document.createElement('div');
    summary.className = 'wb-item__summary';
    var mine = document.createElement('p');
    mine.className = 'wb-item__line wb-item__line--wrong';
    mine.textContent = '我的答案：' + mineText(rec);
    var right = document.createElement('p');
    right.className = 'wb-item__line wb-item__line--right';
    right.textContent = '正确答案：' + answerText(rec);
    summary.appendChild(mine);
    summary.appendChild(right);

    // 展开区
    var body = document.createElement('div');
    body.className = 'wb-item__body';
    body.hidden = !state.open[rec.id];

    if (rec.passage) {
      var passage = document.createElement('div');
      passage.className = 'wb-item__passage';
      passage.textContent = rec.passage;
      body.appendChild(passage);
    }

    var question = document.createElement('p');
    question.className = 'wb-item__question';
    question.textContent = rec.question;
    body.appendChild(question);

    rec.options.forEach(function (text, i) {
      var opt = document.createElement('div');
      opt.className = 'wb-opt';
      if (i === rec.answer) opt.classList.add('is-correct');
      if (i === rec.lastChoice && i !== rec.answer) opt.classList.add('is-wrong');

      var key = document.createElement('span');
      key.className = 'wb-opt__key';
      key.textContent = rec.type === 'judge' ? (i === 0 ? '√' : '×') : letterOf(i);

      var label = document.createElement('span');
      label.textContent = text;

      opt.appendChild(key);
      opt.appendChild(label);
      body.appendChild(opt);
    });

    if (rec.analysis) {
      var analysis = document.createElement('div');
      analysis.className = 'wb-item__analysis';
      analysis.textContent = rec.analysis;
      body.appendChild(analysis);
    }

    // 复习状态
    var meta = document.createElement('div');
    meta.className = 'wb-item__meta';
    var dots = document.createElement('span');
    dots.className = 'dots';
    dots.setAttribute('aria-hidden', 'true');
    for (var d = 0; d < MASTER_STREAK; d++) {
      var dot = document.createElement('i');
      dot.className = 'dots__dot' + (d < rec.correctStreak ? ' is-on' : '');
      dots.appendChild(dot);
    }
    var streakText = document.createElement('span');
    streakText.textContent = '连续答对 ' + Math.min(rec.correctStreak, MASTER_STREAK) + '/' + MASTER_STREAK;
    var schedule = document.createElement('span');
    schedule.textContent = '· ' + reviewText(rec);
    meta.appendChild(dots);
    meta.appendChild(streakText);
    meta.appendChild(schedule);
    body.appendChild(meta);

    // 操作按钮
    var actions = document.createElement('div');
    actions.className = 'wb-item__actions';

    var redo = document.createElement('button');
    redo.type = 'button';
    redo.className = 'btn btn--sm';
    redo.setAttribute('data-wb-act', 'redo');
    redo.textContent = rec.mastered ? '再练一次' : '重做';

    var remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn--sm btn--ghost';
    remove.setAttribute('data-wb-act', 'remove');
    remove.textContent = '移除';

    actions.appendChild(redo);
    actions.appendChild(remove);
    body.appendChild(actions);

    li.appendChild(head);
    li.appendChild(summary);
    li.appendChild(body);
    return li;
  }

  function render() {
    var all = load();
    var due = all.filter(isDue);
    var mastered = all.filter(function (r) { return r.mastered; });

    el.total.textContent = String(all.length);
    el.due.textContent = String(due.length);
    el.mastered.textContent = String(mastered.length);

    var list = all;
    if (state.filter === 'due') list = due;
    else if (state.filter === 'mastered') list = mastered;

    el.start.hidden = due.length === 0;
    el.start.textContent = '开始智能复习（' + due.length + '）';

    el.list.innerHTML = '';
    list.forEach(function (rec) { el.list.appendChild(buildItem(rec)); });

    el.list.hidden = list.length === 0;
    el.empty.hidden = list.length > 0;
    el.emptyText.textContent = state.filter === 'due'
      ? '今天没有到期的错题，休息一下吧。'
      : state.filter === 'mastered'
        ? '还没有已掌握的错题，连对 3 次就会出现在这里。'
        : '错题本还是空的，去练习两组题吧。';
  }

  function toggleItem(li) {
    var id = li.getAttribute('data-id');
    var open = !state.open[id];
    state.open[id] = open;
    li.classList.toggle('is-open', open);
    li.querySelector('.wb-item__head').setAttribute('aria-expanded', open ? 'true' : 'false');
    li.querySelector('.wb-item__body').hidden = !open;
  }

  function removeItem(id) {
    if (!global.confirm('确定从错题本中移除这道题吗？')) return;
    var map = global.Store.get(KEY, {});
    delete map[id];
    global.Store.set(KEY, map);
    delete state.open[id];
    notifyHome();
    render();
  }

  /* ---------------- 重做 / 智能复习 ---------------- */

  function showPanel(name) {
    var isReview = name === 'review';
    el.listWrap.hidden = isReview;
    el.review.hidden = !isReview;
  }

  function startReview(list) {
    if (!list || !list.length) return;
    state.review = {
      list: list.slice(),
      index: 0,
      correct: 0,
      locked: false,
      marks: []
    };
    el.rvDone.hidden = true;
    el.rvCard.hidden = false;
    showPanel('review');
    renderReviewQuestion();
    global.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startDueReview() {
    startReview(dueList());
  }

  function renderReviewQuestion() {
    var rv = state.review;
    var q = rv.list[rv.index];
    if (!q) return finishReview();
    rv.locked = false;

    el.rvCount.textContent = '第 ' + (rv.index + 1) + ' 题 / 共 ' + rv.list.length + ' 题';
    el.rvBar.style.width = Math.round((rv.index / rv.list.length) * 100) + '%';
    el.rvProgressbar.setAttribute('aria-valuenow', String(Math.round((rv.index / rv.list.length) * 100)));

    el.rvSection.textContent = q.section || (q.type === 'judge' ? '判断' : '单选');
    el.rvYear.textContent = q.year || '';

    el.rvPassage.hidden = !q.passage;
    if (q.passage) el.rvPassage.textContent = q.passage;

    el.rvQuestion.textContent = q.question;
    el.rvOptions.innerHTML = '';
    el.rvOptions.classList.remove('is-locked');

    q.options.forEach(function (text, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pq-option';

      var key = document.createElement('span');
      key.className = 'pq-option__key';
      key.textContent = q.type === 'judge' ? (i === 0 ? '√' : '×') : letterOf(i);

      var label = document.createElement('span');
      label.textContent = text;

      btn.appendChild(key);
      btn.appendChild(label);
      btn.addEventListener('click', function () { chooseReview(i); });
      el.rvOptions.appendChild(btn);
    });

    el.rvAnalysis.hidden = true;
    el.rvAnalysis.classList.remove('is-correct', 'is-wrong');
    el.rvNext.hidden = true;
    el.rvNext.textContent = rv.index === rv.list.length - 1 ? '完成本次复习' : '下一题';
  }

  function chooseReview(choice) {
    var rv = state.review;
    if (!rv || rv.locked) return;
    var q = rv.list[rv.index];
    var correct = choice === q.answer;
    rv.locked = true;
    rv.marks[rv.index] = correct;

    el.rvOptions.classList.add('is-locked');
    Array.prototype.forEach.call(el.rvOptions.children, function (btn, i) {
      if (i === q.answer) {
        btn.classList.add('is-correct');
        appendMark(btn, '✓');
      } else if (i === choice) {
        btn.classList.add('is-wrong');
        appendMark(btn, '✗');
      }
      btn.setAttribute('aria-disabled', 'true');
    });

    // 更新排程
    var updated = updateRec(q.id, function (rec) {
      rec.lastAt = Date.now();
      if (correct) {
        rec.correctStreak += 1;
        rec.stage = Math.min(rec.stage + 1, INTERVALS.length - 1);
        rec.lastResult = 'right';
        if (rec.correctStreak >= MASTER_STREAK) {
          rec.mastered = true;          // 连对 3 次 → 已掌握
          rec.nextReviewAt = 0;
        } else {
          rec.nextReviewAt = Date.now() + intervalDays(rec.stage) * DAY;
        }
      } else {
        rec.wrongCount += 1;
        rec.correctStreak = 0;
        rec.stage = 0;                  // 归零，从 1 天节点重新开始
        rec.mastered = false;
        rec.lastChoice = choice;
        rec.lastResult = 'wrong';
        rec.nextReviewAt = Date.now() + intervalDays(0) * DAY;
      }
    });

    if (correct) rv.correct += 1;

    // 重做也算一次练习，计入统计
    if (global.Daily) {
      global.Daily.addQuiz(correct);
      global.Daily.addSection(q.section, correct);
    }

    el.rvAnalysis.hidden = false;
    el.rvAnalysis.classList.toggle('is-correct', correct);
    el.rvAnalysis.classList.toggle('is-wrong', !correct);
    el.rvVerdict.textContent = correct
      ? (updated && updated.mastered ? '回答正确 · 连对 3 次，已标记为掌握 🎉' : '回答正确 +1')
      : '回答错误 · 复习进度已重置';
    el.rvAnswerline.textContent = '正确答案：' + answerText(q) +
      '　你的选择：' + (q.type === 'judge' ? q.options[choice] : letterOf(choice) + '）' + q.options[choice]);
    el.rvAnalysisText.textContent = q.analysis || '暂无解析。';

    el.rvNext.hidden = false;
  }

  function appendMark(btn, symbol) {
    var mark = document.createElement('span');
    mark.className = 'pq-option__mark';
    mark.textContent = symbol;
    mark.setAttribute('aria-hidden', 'true');
    btn.appendChild(mark);
  }

  function nextReview() {
    var rv = state.review;
    if (!rv || !rv.locked) return;
    if (rv.index >= rv.list.length - 1) {
      finishReview();
      return;
    }
    rv.index += 1;
    renderReviewQuestion();
    global.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function finishReview() {
    var rv = state.review;
    if (!rv) return;
    var total = rv.list.length;
    var correct = rv.correct;

    // 统计本次复习中有多少题因此达到“已掌握”
    var map = global.Store.get(KEY, {});
    var newlyMastered = rv.list.filter(function (q) {
      var rec = map[q.id];
      return rec && normalize(rec, q.id).mastered;
    }).length;

    el.rvCard.hidden = true;
    el.rvDone.hidden = false;
    rv.finished = true;
    el.rvDoneDesc.textContent = '共 ' + total + ' 题，答对 ' + correct + ' 题（' +
      Math.round((correct / total) * 100) + '%）。' +
      (newlyMastered ? ' 其中 ' + newlyMastered + ' 道已掌握。' : '');
  }

  function exitReview() {
    state.review = null;
    showPanel('list');
    render();
    global.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------------- 元素与事件 ---------------- */

  function cacheElements() {
    var root = document.getElementById('view-wrong');
    if (!root) return false;

    el.root = root;
    el.listWrap = root.querySelector('[data-wb-listwrap]');
    el.total = root.querySelector('[data-wb-total]');
    el.due = root.querySelector('[data-wb-due]');
    el.mastered = root.querySelector('[data-wb-mastered]');
    el.list = root.querySelector('[data-wb-list]');
    el.empty = root.querySelector('[data-wb-empty]');
    el.emptyText = root.querySelector('[data-wb-empty-text]');
    el.start = root.querySelector('[data-wb-start]');
    el.chips = root.querySelectorAll('[data-wb-filter]');

    el.review = root.querySelector('[data-wb-review]');
    el.rvCount = root.querySelector('[data-wb-rv-count]');
    el.rvBar = root.querySelector('[data-wb-rv-bar]');
    el.rvProgressbar = root.querySelector('[data-wb-rv-progressbar]');
    el.rvCard = root.querySelector('[data-wb-rv-card]');
    el.rvSection = root.querySelector('[data-wb-rv-section]');
    el.rvYear = root.querySelector('[data-wb-rv-year]');
    el.rvPassage = root.querySelector('[data-wb-rv-passage]');
    el.rvQuestion = root.querySelector('[data-wb-rv-question]');
    el.rvOptions = root.querySelector('[data-wb-rv-options]');
    el.rvAnalysis = root.querySelector('[data-wb-rv-analysis]');
    el.rvVerdict = root.querySelector('[data-wb-rv-verdict]');
    el.rvAnswerline = root.querySelector('[data-wb-rv-answerline]');
    el.rvAnalysisText = root.querySelector('[data-wb-rv-analysis-text]');
    el.rvNext = root.querySelector('[data-wb-rv-next]');
    el.rvDone = root.querySelector('[data-wb-rv-done]');
    el.rvDoneDesc = root.querySelector('[data-wb-rv-done-desc]');
    el.quit = root.querySelector('[data-wb-quit]');
    el.backToList = root.querySelector('[data-wb-rv-back]');

    return true;
  }

  function bindEvents() {
    // 列表：展开 / 重做 / 移除（事件委托）
    el.list.addEventListener('click', function (e) {
      var li = e.target.closest('.wb-item');
      if (!li) return;

      var actBtn = e.target.closest('[data-wb-act]');
      if (actBtn) {
        var id = li.getAttribute('data-id');
        var act = actBtn.getAttribute('data-wb-act');
        if (act === 'remove') {
          removeItem(id);
        } else if (act === 'redo') {
          var rec = load().filter(function (r) { return r.id === id; })[0];
          if (rec) startReview([rec]);
        }
        return;
      }

      if (e.target.closest('.wb-item__head')) toggleItem(li);
    });

    // 筛选
    Array.prototype.forEach.call(el.chips, function (chip) {
      chip.addEventListener('click', function () {
        state.filter = chip.getAttribute('data-wb-filter');
        Array.prototype.forEach.call(el.chips, function (c) {
          c.classList.toggle('is-active', c === chip);
        });
        render();
      });
    });

    // 智能复习
    el.start.addEventListener('click', startDueReview);
    el.quit.addEventListener('click', exitReview);
    el.backToList.addEventListener('click', exitReview);
    el.rvNext.addEventListener('click', nextReview);

    // 首页卡片按钮
    var homeBtn = document.querySelector('[data-home-review-start]');
    if (homeBtn) {
      homeBtn.addEventListener('click', function () {
        global.Router.navigate('wrong');
        startDueReview();
      });
    }

    // 键盘：1~4 / A~D 选项，Enter / → 下一题
    document.addEventListener('keydown', function (e) {
      if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (!el.root.classList.contains('is-active') || !state.review) return;

      var key = e.key.toUpperCase();
      var q = state.review.list[state.review.index];
      if (!q) return;

      if (!state.review.locked) {
        var idx = -1;
        if (/^[1-6]$/.test(key)) idx = parseInt(key, 10) - 1;
        else if (/^[A-F]$/.test(key)) idx = LETTERS.indexOf(key);
        if (idx >= 0 && idx < q.options.length) {
          e.preventDefault();
          chooseReview(idx);
        }
      } else if (key === 'ENTER' || key === 'ARROWRIGHT') {
        e.preventDefault();
        nextReview();
      }
    });
  }

  /* ---------------- 模块注册 ---------------- */

  global.WrongbookModule = {
    name: 'wrongbook',

    init: function (Router) {
      if (!cacheElements()) {
        console.warn('[wrongbook] 未找到 #view-wrong 容器');
        return;
      }
      bindEvents();

      // 进入错题本：已结算的复习会话直接归位，进行中的保留现场
      Router.onEnter('wrong', function () {
        if (state.review && state.review.finished) {
          exitReview();
        } else if (!state.review) {
          render();
        }
      });

      // 首页与任意路由变化时刷新“今日待复习”
      Router.onEnter('countdown', notifyHome);
      document.addEventListener('route:change', notifyHome);
      notifyHome();
    },

    /** 供其他模块调用（如首页卡片） */
    startDueReview: startDueReview,
    notifyHome: notifyHome
  };
})(window);
