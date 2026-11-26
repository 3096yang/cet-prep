/* ==========================================================================
   exam-date.js — 考试日期（倒计时与统计共用）
   --------------------------------------------------------------------------
   默认规则：每年 6 月 / 12 月的第三个星期六（四六级常规安排，具体以官方为准）
   手动覆盖：localStorage['cet:exam:date'] = 'YYYY-MM-DD'，优先于自动推算
   API：
     ExamDate.date()      当前生效的考试日期（Date）
     ExamDate.daysLeft()  距考天数（今天考 = 0）
     ExamDate.label()     '2026年12月19日'
     ExamDate.isManual()  是否手动设置
     ExamDate.set(iso) / reset() / subscribe(fn)
   ========================================================================== */
(function (global) {
  'use strict';

  var KEY = 'exam:date';
  var DAY = 24 * 60 * 60 * 1000;
  var listeners = [];

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  /** 某年某月的第三个星期六（monthIndex: 5=6月, 11=12月） */
  function thirdSaturday(year, monthIndex) {
    var first = new Date(year, monthIndex, 1);
    var offset = (6 - first.getDay() + 7) % 7; // 距离第一个周六还有几天
    return new Date(year, monthIndex, 1 + offset + 14, 9, 0, 0, 0);
  }

  /** 从 from 之后最近的一场考试 */
  function autoNext(from) {
    var now = from || new Date();
    var y = now.getFullYear();
    var list = [
      thirdSaturday(y, 5),
      thirdSaturday(y, 11),
      thirdSaturday(y + 1, 5),
      thirdSaturday(y + 1, 11)
    ];
    for (var i = 0; i < list.length; i++) {
      if (list[i].getTime() > now.getTime()) return list[i];
    }
    return list[list.length - 1];
  }

  function fromISO(iso) {
    if (!iso) return null;
    var p = String(iso).split('-');
    if (p.length !== 3) return null;
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 9, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }

  function toISO(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function manualDate() {
    var iso = global.Store.get(KEY, null);
    return iso ? fromISO(iso) : null;
  }

  function notify() {
    var d = { date: ExamDate.date(), daysLeft: ExamDate.daysLeft(), manual: ExamDate.isManual() };
    listeners.forEach(function (fn) {
      try { fn(d); } catch (e) { console.error('[exam-date]', e); }
    });
  }

  var ExamDate = {
    date: function () {
      return manualDate() || autoNext();
    },

    /** 手动设置的日期（未设置返回 null） */
    manual: manualDate,

    isManual: function () {
      return !!manualDate();
    },

    daysLeft: function () {
      var now = new Date();
      var today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      var exam = ExamDate.date();
      var exam0 = new Date(exam.getFullYear(), exam.getMonth(), exam.getDate());
      return Math.round((exam0 - today0) / DAY);
    },

    /** 精确剩余毫秒（用于时钟） */
    remaining: function () {
      return ExamDate.date().getTime() - Date.now();
    },

    label: function () {
      var d = ExamDate.date();
      return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
    },

    iso: function () {
      return toISO(ExamDate.date());
    },

    set: function (iso) {
      var d = fromISO(iso);
      if (!d) return false;
      global.Store.set(KEY, iso);
      notify();
      return true;
    },

    reset: function () {
      global.Store.remove(KEY);
      notify();
    },

    subscribe: function (fn) {
      if (typeof fn === 'function') listeners.push(fn);
    },

    /** 默认日期（未覆盖时）供设置面板展示 */
    autoDate: function () {
      return autoNext();
    }
  };

  global.ExamDate = ExamDate;
})(window);
