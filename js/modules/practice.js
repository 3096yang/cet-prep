/* ==========================================================================
   modules/practice.js — 真题练习模块
   --------------------------------------------------------------------------
   流程：展示题干/选项（无答案）→ 点选立即判定着色 → 展开解析 → 下一题
        → 一组做完显示得分统计
   数据：
     · 题库      js/data/questions.js → window.QUESTIONS
     · 错题本    localStorage['cet:wrongbook']   答错自动写入
     · 练习历史  localStorage['cet:practice:history']
   ========================================================================== */
(function (global) {
  'use strict';

  var WRONG_KEY = 'wrongbook';
  var HISTORY_KEY = 'practice:history';
  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  /** 运行期状态 */
  var state = {
    list: [],        // 本轮题目数组
    index: 0,        // 当前题号
    marks: [],       // 与 list 平行：[{ choice, correct }] 或 null
    startedAt: 0,
    started: false,
    locked: false    // 当前题是否已作答
  };

  var el = {};

  /* ---------------- 数据 ---------------- */

  function bank() {
    return Array.isArray(global.QUESTIONS) ? global.QUESTIONS : [];
  }

  function byId(id) {
    var list = bank();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function letterOf(index) {
    return LETTERS[index] || String(index + 1);
  }

  /** 正确答案文本：判断题直接给“正确/错误”，单选题给 “B）xxx” */
  function answerText(q) {
    var text = q.options[q.answer] || '';
    return q.type === 'judge' ? text : letterOf(q.answer) + '）' + text;
  }

  /* ---------------- 错题本 ---------------- */

  /** 答错：写入 / 累加错题本（保留既有复习排程字段，并重置进度） */
  function addToWrongbook(q, choice) {
    global.Store.update(WRONG_KEY, {}, function (map) {
      var now = Date.now();
      var base = map[q.id] || {};

      map[q.id] = Object.assign({}, base, {
        id: q.id,
        type: q.type,
        section: q.section,
        year: q.year,
        passage: q.passage || '',
        question: q.question,
        options: q.options,
        answer: q.answer,
        analysis: q.analysis,
        wrongCount: (base.wrongCount || 0) + 1,
        lastChoice: choice,
        lastResult: 'wrong',
        lastAt: now,
        createdAt: base.createdAt || now,   // 首次答错时间，错题本按它倒序
        correctStreak: 0,                  // 又错一次：连对清零
        stage: 0,                          // 复习进度回到第一个节点
        mastered: false,
        nextReviewAt: now + 24 * 60 * 60 * 1000  // 明天推送到复习队列
      });
      return map;
    });
  }

  /** 答对：如果该题在错题本里，只更新最近结果，不删除 */
  function markReviewed(q) {
    var map = global.Store.get(WRONG_KEY, {});
    if (!map[q.id]) return;
    map[q.id].lastResult = 'right';
    map[q.id].lastAt = Date.now();
    global.Store.set(WRONG_KEY, map);
  }

  /* ---------------- 会话控制 ---------------- */

  function startSession(list, mode) {
    state.list = list.slice();
    state.index = 0;
    state.marks = list.map(function () { return null; });
    state.startedAt = Date.now();
    state.started = true;
    state.locked = false;
    state.mode = mode || 'all';

    el.summary.hidden = true;
    el.card.hidden = false;
    el.head.hidden = false;
    renderQuestion();
  }

  function startAll() {
    startSession(bank(), 'all');
  }

  function startWrongOnly() {
    var wrongIds = state.marks.reduce(function (acc, mark, i) {
      if (mark && !mark.correct) acc.push(state.list[i].id);
      return acc;
    }, []);
    var list = wrongIds.map(byId).filter(Boolean);
    if (!list.length) return;
    startSession(list, 'wrong');
  }

  function restartSame() {
    startSession(state.list.slice(), state.mode);
  }

  /* ---------------- 渲染 ---------------- */

  function renderQuestion() {
    var q = state.list[state.index];
    if (!q) return finish();
    var prev = state.index > 0 ? state.list[state.index - 1] : null;
    state.locked = false;

    // 1) 题型 / 年份
    el.section.textContent = q.section || (q.type === 'judge' ? '判断推理' : '单项选择');
    el.year.textContent = q.year || '';

    // 2) 阅读原文：同一篇只显示一次
    var needPassage = !!q.passage && (!prev || prev.passage !== q.passage);
    el.passage.hidden = !needPassage;
    if (needPassage) el.passage.textContent = q.passage;

    // 3) 题干与选项
    el.question.textContent = q.question;
    renderOptions(q);

    // 4) 解析与下一题按钮收起
    el.analysis.hidden = true;
    el.analysis.classList.remove('is-correct', 'is-wrong');
    el.next.hidden = true;
    el.next.textContent = state.index === state.list.length - 1 ? '查看成绩' : '下一题';

    updateHead();
  }

  function renderOptions(q) {
    el.options.innerHTML = '';
    el.options.classList.remove('is-locked');

    q.options.forEach(function (text, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pq-option';
      btn.setAttribute('data-index', String(i));

      var key = document.createElement('span');
      key.className = 'pq-option__key';
      key.textContent = q.type === 'judge' ? (i === 0 ? '√' : '×') : letterOf(i);

      var label = document.createElement('span');
      label.textContent = text;

      btn.appendChild(key);
      btn.appendChild(label);

      btn.addEventListener('click', function () { choose(i); });
      el.options.appendChild(btn);
    });
  }

  function updateHead() {
    var total = state.list.length;
    var answered = state.marks.filter(Boolean).length;
    var correct = state.marks.filter(function (m) { return m && m.correct; }).length;
    var percent = total ? Math.round((answered / total) * 100) : 0;

    el.count.textContent = '第 ' + Math.min(state.index + 1, total) + ' 题 / 共 ' + total + ' 题';
    el.hit.textContent = '答对 ' + correct + ' 题';
    el.bar.style.width = percent + '%';
    el.progressbar.setAttribute('aria-valuenow', String(percent));
  }

  /* ---------------- 作答 ---------------- */

  function choose(choice) {
    if (state.locked) return;
    var q = state.list[state.index];
    if (!q) return;

    var correct = choice === q.answer;
    state.locked = true;
    state.marks[state.index] = { choice: choice, correct: correct };

    // 1) 选项着色：正确项永远标绿；选错时选中的标红
    el.options.classList.add('is-locked');
    Array.prototype.forEach.call(el.options.children, function (btn, i) {
      var isCorrect = i === q.answer;
      var isChosen = i === choice;

      if (isCorrect) {
        btn.classList.add('is-correct');
        btn.appendChild(makeMark('✓'));
      } else if (isChosen) {
        btn.classList.add('is-wrong');
        btn.appendChild(makeMark('✗'));
      }
      btn.setAttribute('aria-disabled', 'true');
    });

    // 2) 展开解析
    el.analysis.hidden = false;
    el.analysis.classList.toggle('is-correct', correct);
    el.analysis.classList.toggle('is-wrong', !correct);
    el.verdict.textContent = correct ? '回答正确 +1' : '回答错误';
    el.answerline.textContent = '正确答案：' + answerText(q) + '　你的选择：' +
      (q.type === 'judge' ? q.options[choice] : letterOf(choice) + '）' + q.options[choice]);
    el.analysisText.textContent = q.analysis || '暂无解析。';

    // 3) 错题入本 / 记录最近结果
    if (correct) {
      markReviewed(q);
    } else {
      addToWrongbook(q, choice);
    }

    // 4) 写入每日台账（统计页：今日做题 / 正确率 / 题型雷达）
    if (global.Daily) {
      global.Daily.addQuiz(correct);
      global.Daily.addSection(q.section, correct);
    }

    // 5) 显示下一题
    el.next.hidden = false;
    updateHead();
  }

  function makeMark(symbol) {
    var mark = document.createElement('span');
    mark.className = 'pq-option__mark';
    mark.textContent = symbol;
    mark.setAttribute('aria-hidden', 'true');
    return mark;
  }

  function next() {
    if (!state.locked) return;
    if (state.index >= state.list.length - 1) {
      finish();
      return;
    }
    state.index += 1;
    renderQuestion();
    global.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------------- 结算 ---------------- */

  function finish() {
    var total = state.list.length;
    var correct = state.marks.filter(function (m) { return m && m.correct; }).length;
    var wrong = total - correct;
    var rate = total ? Math.round((correct / total) * 100) : 0;
    var durationMs = Date.now() - state.startedAt;

    // 卡片收起，成绩面板展开
    el.card.hidden = true;
    el.summary.hidden = false;
    el.sumScore.textContent = String(correct);
    el.sumTotal.textContent = String(total);
    el.sumRate.textContent = '正确率 ' + rate + '%';
    el.sumBar.style.width = rate + '%';
    el.sumProgressbar.setAttribute('aria-valuenow', String(rate));
    el.sumMeta.textContent = '用时 ' + formatDuration(durationMs) +
      (wrong ? ' · ' + wrong + ' 道错题已加入错题本' : ' · 全对，太强了');

    // 错题清单
    el.wronglist.innerHTML = '';
    state.marks.forEach(function (mark, i) {
      if (!mark || mark.correct) return;
      var q = state.list[i];
      var li = document.createElement('li');
      li.className = 'pq-wronglist__item';
      var no = document.createElement('span');
      no.className = 'pq-wronglist__no';
      no.textContent = '第 ' + (i + 1) + ' 题';
      var ans = document.createElement('span');
      ans.className = 'pq-wronglist__ans';
      ans.textContent = '✓ ' + answerText(q);
      li.appendChild(no);
      li.appendChild(document.createTextNode(q.question));
      li.appendChild(ans);
      el.wronglist.appendChild(li);
    });

    el.redoWrong.hidden = wrong === 0;

    // 落盘：练习历史（供统计模块使用）
    global.Store.update(HISTORY_KEY, [], function (list) {
      list.push({
        at: Date.now(),
        total: total,
        correct: correct,
        rate: rate,
        mode: state.mode || 'all',
        durationMs: durationMs
      });
      return list.slice(-100); // 只保留最近 100 次
    });

    global.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function formatDuration(ms) {
    var sec = Math.max(1, Math.round(ms / 1000));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m ? m + ' 分 ' + s + ' 秒' : s + ' 秒';
  }

  /* ---------------- 事件绑定 ---------------- */

  function cacheElements() {
    var root = document.getElementById('view-practice');
    if (!root) return false;

    el.root = root;
    el.head = root.querySelector('.pq-head');
    el.count = root.querySelector('[data-pq-count]');
    el.hit = root.querySelector('[data-pq-hit]');
    el.bar = root.querySelector('[data-pq-bar]');
    el.progressbar = root.querySelector('[data-pq-progressbar]');
    el.card = root.querySelector('[data-pq-card]');
    el.section = root.querySelector('[data-pq-section]');
    el.year = root.querySelector('[data-pq-year]');
    el.passage = root.querySelector('[data-pq-passage]');
    el.question = root.querySelector('[data-pq-question]');
    el.options = root.querySelector('[data-pq-options]');
    el.analysis = root.querySelector('[data-pq-analysis]');
    el.verdict = root.querySelector('[data-pq-verdict]');
    el.answerline = root.querySelector('[data-pq-answerline]');
    el.analysisText = root.querySelector('[data-pq-analysis-text]');
    el.next = root.querySelector('[data-pq-next]');
    el.summary = root.querySelector('[data-pq-summary]');
    el.sumScore = root.querySelector('[data-pq-sum-score]');
    el.sumTotal = root.querySelector('[data-pq-sum-total]');
    el.sumRate = root.querySelector('[data-pq-sum-rate]');
    el.sumBar = root.querySelector('[data-pq-sum-bar]');
    el.sumProgressbar = root.querySelector('[data-pq-sum-progressbar]');
    el.sumMeta = root.querySelector('[data-pq-sum-meta]');
    el.wronglist = root.querySelector('[data-pq-wronglist]');
    el.retry = root.querySelector('[data-pq-retry]');
    el.redoWrong = root.querySelector('[data-pq-redo-wrong]');

    return true;
  }

  function bindEvents() {
    el.next.addEventListener('click', next);
    el.retry.addEventListener('click', function () { startSession(bank(), 'all'); });
    el.redoWrong.addEventListener('click', startWrongOnly);

    // 键盘：1~4 / A~D 选项，Enter / → 下一题
    document.addEventListener('keydown', function (e) {
      if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (!el.root.classList.contains('is-active')) return;
      if (el.summary.hidden === false) return;

      var key = e.key.toUpperCase();
      var q = state.list[state.index];
      if (!q) return;

      if (!state.locked) {
        var idx = -1;
        if (/^[1-6]$/.test(key)) idx = parseInt(key, 10) - 1;
        else if (/^[A-F]$/.test(key)) idx = LETTERS.indexOf(key);
        if (idx >= 0 && idx < q.options.length) {
          e.preventDefault();
          choose(idx);
        }
      } else if (key === 'ENTER' || key === 'ARROWRIGHT') {
        e.preventDefault();
        next();
      }
    });
  }

  /* ---------------- 模块注册 ---------------- */

  global.PracticeModule = {
    name: 'practice',

    init: function (Router) {
      if (!cacheElements()) {
        console.warn('[practice] 未找到 #view-practice 容器');
        return;
      }
      bindEvents();

      // 首次进入自动开一组；中途离开再回来保留当前题目
      Router.onEnter('practice', function () {
        if (!state.started) {
          startAll();
        } else if (!state.locked && !el.summary.hidden) {
          // 已完成状态，保持成绩面板
          return;
        } else {
          updateHead();
        }
      });
    }
  };
})(window);
