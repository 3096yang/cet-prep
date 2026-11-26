/* ==========================================================================
   daily.js — 每日学习台账（统计模块的数据源）
   --------------------------------------------------------------------------
   localStorage['cet:daily']            → { '2026-11-26': { words, wordIds, quiz, correct } }
   localStorage['cet:practice:bySection'] → { '阅读理解': { correct, total } }
   由各模块在作答时调用：
     Daily.addWord(wordId)                  // 背了一个词（同一天同一词只算一次）
     Daily.addQuiz(isCorrect)               // 做了一道题
     Daily.addSection('阅读理解', isCorrect) // 按题型累计
   ========================================================================== */
(function (global) {
  'use strict';

  var KEY = 'daily';
  var SECTIONS_KEY = 'practice:bySection';
  var KEEP_DAYS = 90;
  var DAY = 24 * 60 * 60 * 1000;

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function keyOf(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function shiftDay(date, delta) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
  }

  function emptyRec() {
    return { words: 0, wordIds: [], quiz: 0, correct: 0 };
  }

  /** 只保留最近 KEEP_DAYS 天，避免 storage 无限膨胀 */
  function prune(map) {
    var keys = Object.keys(map).sort();
    while (keys.length > KEEP_DAYS) {
      delete map[keys.shift()];
    }
    return map;
  }

  var Daily = {
    todayKey: function () {
      return keyOf(new Date());
    },

    addWord: function (wordId) {
      var today = keyOf(new Date());
      global.Store.update(KEY, {}, function (map) {
        var rec = map[today] || emptyRec();
        if (!rec.wordIds) rec.wordIds = [];
        if (rec.wordIds.indexOf(wordId) < 0) rec.wordIds.push(wordId);
        rec.words = rec.wordIds.length;
        map[today] = rec;
        return prune(map);
      });
    },

    addQuiz: function (isCorrect) {
      var today = keyOf(new Date());
      global.Store.update(KEY, {}, function (map) {
        var rec = map[today] || emptyRec();
        rec.quiz = (rec.quiz || 0) + 1;
        if (isCorrect) rec.correct = (rec.correct || 0) + 1;
        map[today] = rec;
        return prune(map);
      });
    },

    /** 按题型累计正确率（雷达图数据源） */
    addSection: function (section, isCorrect) {
      if (!section) return;
      global.Store.update(SECTIONS_KEY, {}, function (map) {
        var rec = map[section] || { correct: 0, total: 0 };
        rec.total += 1;
        if (isCorrect) rec.correct += 1;
        map[section] = rec;
        return map;
      });
    },

    day: function (key) {
      var rec = global.Store.get(KEY, {})[key];
      return {
        words: (rec && rec.words) || 0,
        quiz: (rec && rec.quiz) || 0,
        correct: (rec && rec.correct) || 0
      };
    },

    today: function () {
      return Daily.day(keyOf(new Date()));
    },

    /** 最近 n 天（含今天），按时间正序 */
    lastDays: function (n) {
      var out = [];
      var now = new Date();
      for (var i = n - 1; i >= 0; i--) {
        var d = shiftDay(now, -i);
        var key = keyOf(d);
        var rec = Daily.day(key);
        out.push({
          key: key,
          label: (d.getMonth() + 1) + '/' + d.getDate(),
          weekday: '日一二三四五六'.charAt(d.getDay()),
          isToday: i === 0,
          words: rec.words,
          quiz: rec.quiz,
          correct: rec.correct
        });
      }
      return out;
    },

    /** 连续打卡天数：今天没学则从昨天往前数，避免白天直接归零 */
    streak: function () {
      var map = global.Store.get(KEY, {});
      var cursor = new Date();
      if (!map[keyOf(cursor)]) cursor = shiftDay(cursor, -1);

      var count = 0;
      var guard = 0;
      while (guard < KEEP_DAYS) {
        var rec = map[keyOf(cursor)];
        if (!rec) break;
        if (((rec.words || 0) + (rec.quiz || 0)) <= 0) break;
        count += 1;
        cursor = shiftDay(cursor, -1);
        guard += 1;
      }
      return count;
    },

    todayActive: function () {
      var t = Daily.today();
      return t.words + t.quiz > 0;
    },

    /** 各题型累计 { section: {correct, total} } */
    sections: function () {
      return global.Store.get(SECTIONS_KEY, {});
    },

    /** 近 n 天累计（做总览用） */
    rangeTotals: function (n) {
      var days = Daily.lastDays(n);
      var total = { words: 0, quiz: 0, correct: 0 };
      days.forEach(function (d) {
        total.words += d.words;
        total.quiz += d.quiz;
        total.correct += d.correct;
      });
      return total;
    }
  };

  global.Daily = Daily;
})(window);
