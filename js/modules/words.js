/* ==========================================================================
   modules/words.js — 单词背诵模块
   --------------------------------------------------------------------------
   队列规则：
     · 「认识」  → 熟悉度 +1（上限 3），单词出队，进度 +1
     · 「模糊」  → 熟悉度保持在 1~2 之间，单词重新插入队尾
     · 「不认识」→ 熟悉度归零，单词重新插入队尾
   熟悉度 0~3 存在 localStorage['cet:words:progress']：
     { "cet4-001": { level: 2, seen: 5, lastAction: 'know', updatedAt: 1690000000000 } }
   ========================================================================== */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'words:progress';
  var SESSION_KEY = 'words:session';   // 本轮队列快照（刷新后续做）
  var SESSION_TTL = 3 * 24 * 60 * 60 * 1000; // 超过 3 天的旧进度直接丢弃
  var LEVEL_MAX = 3;

  /** 运行期状态（刷新后重建，队列不落盘） */
  var state = {
    filter: 'all',   // 'all' | '高频' | '核心' | '基础'
    queue: [],       // 待背单词 id 队列，队首即当前卡片
    total: 0,        // 本轮词库总数
    passed: 0,       // 本轮已「认识」出队的数量
    started: false   // 是否已开始本轮
  };

  var el = {};

  /* ---------------- 数据 ---------------- */

  function allWords() {
    return Array.isArray(global.WORDS) ? global.WORDS : [];
  }

  function findWord(id) {
    var list = allWords();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function filteredWords() {
    return allWords().filter(function (w) {
      return state.filter === 'all' || w.tag === state.filter;
    });
  }

  /* ---------------- 熟悉度读写 ---------------- */

  function progressMap() {
    return global.Store.get(STORAGE_KEY, {});
  }

  function levelOf(id) {
    var rec = progressMap()[id];
    return rec && typeof rec.level === 'number' ? rec.level : 0;
  }

  /** 根据评价更新熟悉度，返回写入后的 level */
  function saveAnswer(id, action) {
    var newLevel = 0;
    global.Store.update(STORAGE_KEY, {}, function (map) {
      var rec = map[id] || { level: 0, seen: 0 };
      var level = typeof rec.level === 'number' ? rec.level : 0;

      if (action === 'know') {
        level = Math.min(LEVEL_MAX, level + 1);          // 熟悉度升级
      } else if (action === 'vague') {
        level = Math.max(1, Math.min(level, LEVEL_MAX - 1)); // 最高停在 2
      } else {
        level = 0;                                        // 不认识：归零
      }

      map[id] = {
        level: level,
        seen: (rec.seen || 0) + 1,
        lastAction: action,
        updatedAt: Date.now()
      };
      newLevel = level;
      return map;
    });

    // 记一笔到每日台账（统计页的「今日背词」）
    if (global.Daily) global.Daily.addWord(id);

    return newLevel;
  }

  /* ---------------- 本轮会话（刷新续做） ---------------- */

  function saveSession() {
    if (!state.started) return;
    global.Store.set(SESSION_KEY, {
      filter: state.filter,
      queue: state.queue,
      total: state.total,
      passed: state.passed,
      savedAt: Date.now()
    });
  }

  function clearSession() {
    global.Store.remove(SESSION_KEY);
  }

  /** 读取并校验上次的本轮进度；无效 / 过期返回 null */
  function loadSession() {
    var saved = global.Store.get(SESSION_KEY, null);
    if (!saved || !Array.isArray(saved.queue) || !saved.savedAt) return null;

    if (Date.now() - saved.savedAt > SESSION_TTL) {
      clearSession();
      return null;
    }

    // 词库可能已变动：剔除不存在的单词，并同步修正总数
    var queue = saved.queue.filter(function (id) { return !!findWord(id); });
    var dropped = saved.queue.length - queue.length;
    if (!queue.length) {
      clearSession();
      return null;
    }

    return {
      filter: saved.filter || 'all',
      queue: queue,
      total: Math.max(queue.length, (saved.total || 0) - dropped),
      passed: saved.passed || 0
    };
  }

  /* ---------------- 队列 ---------------- */

  /**
   * 构建本轮队列
   * @param {boolean} onlyUnmastered true = 只复习熟悉度 < 3 的词
   */
  function buildQueue(onlyUnmastered) {
    var list = filteredWords().filter(function (w) {
      return !onlyUnmastered || levelOf(w.id) < LEVEL_MAX;
    });

    // 熟悉度低的先背（稳定排序，同级别保持词库原顺序）
    list.sort(function (a, b) {
      return levelOf(a.id) - levelOf(b.id);
    });

    state.queue = list.map(function (w) { return w.id; });
    state.total = list.length;
    state.passed = 0;
    state.started = true;

    saveSession();
  }

  function startRound(onlyUnmastered) {
    buildQueue(onlyUnmastered);
    render();
  }

  /* ---------------- 渲染 ---------------- */

  function currentWord() {
    return state.queue.length ? findWord(state.queue[0]) : null;
  }

  function updateProgressBar() {
    var mastered = filteredWords().filter(function (w) {
      return levelOf(w.id) >= LEVEL_MAX;
    }).length;
    var total = filteredWords().length;
    var percent = state.total ? Math.round((state.passed / state.total) * 100) : 0;
    var index = state.total ? Math.min(state.passed + 1, state.total) : 0;

    el.count.textContent = '第 ' + index + ' 个 / 共 ' + state.total + ' 个';
    el.mastery.textContent = '已掌握 ' + mastered + ' / ' + total;
    el.bar.style.width = percent + '%';
    el.progressbar.setAttribute('aria-valuenow', String(percent));
  }

  function renderCard(word) {
    var level = levelOf(word.id);
    var dots = el.dots.querySelectorAll('.dots__dot');

    // 正反面共用字段（querySelectorAll 一次写入）
    Array.prototype.forEach.call(el.wordTexts, function (node) {
      node.textContent = word.word;
    });
    Array.prototype.forEach.call(el.tags, function (node) {
      node.textContent = word.tag;
    });

    el.phonetic.textContent = word.phonetic || '';
    el.meaning.textContent = word.meaning || '';
    el.example.textContent = word.example || '';

    Array.prototype.forEach.call(dots, function (dot, i) {
      dot.classList.toggle('is-on', i < level);
    });

    el.card.setAttribute('aria-label',
      '单词卡片：' + word.word + '，点击翻转查看释义');
    el.card.classList.remove('is-flipped');
  }

  function render() {
    var word = currentWord();

    if (!word) {
      // 队列耗尽：本轮完成（清掉会话，下次进来重新开一轮）
      clearSession();
      el.card.hidden = true;
      el.actions.hidden = true;
      el.done.hidden = false;
      updateProgressBar();
      renderDonePanel();
      return;
    }

    el.card.hidden = false;
    el.actions.hidden = false;
    el.done.hidden = true;
    renderCard(word);
    updateProgressBar();
  }

  function renderDonePanel() {
    var unmastered = filteredWords().filter(function (w) {
      return levelOf(w.id) < LEVEL_MAX;
    }).length;
    var mastered = filteredWords().length - unmastered;

    el.doneDesc.textContent = '共 ' + filteredWords().length + ' 个词，已掌握 ' +
      mastered + ' 个' + (unmastered ? '，还有 ' + unmastered + ' 个待巩固。' : '，全部掌握！');

    if (unmastered) {
      el.reviewBtn.hidden = false;
      el.reviewBtn.textContent = '复习未掌握的词（' + unmastered + '）';
    } else {
      el.reviewBtn.hidden = true;
    }
  }

  /* ---------------- 交互 ---------------- */

  function flipCard() {
    if (!currentWord()) return;
    el.card.classList.toggle('is-flipped');
  }

  function answer(action) {
    var id = state.queue[0];
    if (!id) return;

    saveAnswer(id, action);

    if (action === 'know') {
      state.queue.shift();   // 认识：出队
      state.passed += 1;
    } else {
      state.queue.push(state.queue.shift()); // 模糊 / 不认识：移到队尾
    }

    saveSession();
    render();
  }

  function syncFilterChips() {
    Array.prototype.forEach.call(el.chips, function (chip) {
      chip.classList.toggle('is-active', chip.getAttribute('data-filter') === state.filter);
    });
  }

  function setFilter(filter) {
    if (state.filter === filter) return;
    state.filter = filter;

    Array.prototype.forEach.call(el.chips, function (chip) {
      chip.classList.toggle('is-active', chip.getAttribute('data-filter') === filter);
    });

    startRound(false);
  }

  function resetProgress() {
    var ok = global.confirm('确定清空单词熟悉度记录吗？此操作不可撤销。');
    if (!ok) return;
    global.Store.remove(STORAGE_KEY);
    clearSession();
    startRound(false);
  }

  /* ---------------- 事件绑定 ---------------- */

  function cacheElements() {
    var root = document.getElementById('view-words');
    if (!root) return false;

    el.root = root;
    el.count = root.querySelector('[data-words-count]');
    el.mastery = root.querySelector('[data-words-mastery]');
    el.bar = root.querySelector('[data-words-bar]');
    el.progressbar = root.querySelector('[data-words-progressbar]');
    el.card = root.querySelector('[data-flashcard]');
    el.actions = root.querySelector('[data-words-actions]');
    el.done = root.querySelector('[data-words-done]');
    el.doneDesc = root.querySelector('[data-words-done-desc]');
    el.reviewBtn = root.querySelector('[data-words-review]');
    el.restartBtn = root.querySelector('[data-words-restart]');
    el.resetBtn = root.querySelector('[data-words-reset]');
    el.chips = root.querySelectorAll('[data-filter]');
    el.wordTexts = root.querySelectorAll('[data-word-text]');
    el.tags = root.querySelectorAll('[data-word-tag]');
    el.phonetic = root.querySelector('[data-word-phonetic]');
    el.meaning = root.querySelector('[data-word-meaning]');
    el.example = root.querySelector('[data-word-example]');
    el.dots = root.querySelector('[data-word-dots]');
    el.answerBtns = root.querySelectorAll('[data-answer]');

    return true;
  }

  function bindEvents() {
    // 翻转卡片
    el.card.addEventListener('click', flipCard);
    el.card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        flipCard();
      }
    });

    // 三个评价按钮
    Array.prototype.forEach.call(el.answerBtns, function (btn) {
      btn.addEventListener('click', function () {
        answer(btn.getAttribute('data-answer'));
      });
    });

    // 标签筛选
    Array.prototype.forEach.call(el.chips, function (chip) {
      chip.addEventListener('click', function () {
        setFilter(chip.getAttribute('data-filter'));
      });
    });

    // 重置 / 复习 / 重开
    el.resetBtn.addEventListener('click', resetProgress);
    el.reviewBtn.addEventListener('click', function () { startRound(true); });
    el.restartBtn.addEventListener('click', function () { startRound(false); });

    // 键盘快捷键：1 认识 / 2 模糊 / 3 不认识（仅在单词页生效）
    document.addEventListener('keydown', function (e) {
      if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (!el.root.classList.contains('is-active')) return;
      if (e.key === '1') answer('know');
      else if (e.key === '2') answer('vague');
      else if (e.key === '3') answer('unknown');
    });
  }

  /* ---------------- 模块注册 ---------------- */

  global.WordsModule = {
    name: 'words',

    init: function (Router) {
      if (!cacheElements()) {
        console.warn('[words] 未找到 #view-words 容器');
        return;
      }
      bindEvents();

      // 首次进入页面：优先恢复上次的本轮进度，否则开新一轮
      Router.onEnter('words', function () {
        if (state.started) {
          render();
          return;
        }

        var saved = loadSession();
        if (saved) {
          state.filter = saved.filter;
          state.queue = saved.queue;
          state.total = saved.total;
          state.passed = saved.passed;
          state.started = true;
          syncFilterChips();
          render();
        } else {
          startRound(false);
        }
      });
    }
  };
})(window);
