/* ==========================================================================
   modules/countdown.js — 考试倒计时
   --------------------------------------------------------------------------
   · 默认按「6 月 / 12 月第三个周六」自动推算最近一场考试
   · 可手动改为官方公布日期（存 localStorage['cet:exam:date']，可一键恢复自动）
   · 每秒刷新「天 时:分:秒」
   ========================================================================== */
(function (global) {
  'use strict';

  var el = {};
  var timer = null;

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  /* ---------------- 渲染 ---------------- */

  function render() {
    if (!el.root) return;

    el.examLabel.textContent = ExamDate.label();
    el.days.textContent = String(Math.max(0, ExamDate.daysLeft()));
    el.input.value = ExamDate.iso();
    el.source.textContent = ExamDate.isManual()
      ? '已手动设置日期（以官方公布为准）'
      : '按「6 月 / 12 月第三个周六」自动推算，与实际考试日可能相差一周';

    tick();
  }

  /** 精确到秒的剩余时间 */
  function tick() {
    if (!el.clock) return;
    var ms = ExamDate.remaining();

    if (ms <= 0) {
      el.clock.textContent = '已开考 / 本场已过，请更新考试日期';
      el.note.textContent = '';
      return;
    }

    var hours = Math.floor((ms % 86400000) / 3600000);
    var minutes = Math.floor((ms % 3600000) / 60000);
    var seconds = Math.floor((ms % 60000) / 1000);

    // 只显示不足一天的部分，天数交给上面的大数字，避免「23 天」和「22 天」并列引起歧义
    el.clock.textContent = pad2(hours) + ':' + pad2(minutes) + ':' + pad2(seconds);
  }

  function startTimer() {
    if (timer) return;
    timer = global.setInterval(function () {
      tick();
      el.days.textContent = String(Math.max(0, ExamDate.daysLeft()));
    }, 1000);
  }

  /* ---------------- 事件 ---------------- */

  function saveDate() {
    var value = el.input.value; // 'YYYY-MM-DD'
    if (!value) {
      showStatus('请先选择一个日期', 'err');
      return;
    }
    var picked = new Date(value + 'T09:00:00');
    if (isNaN(picked.getTime())) {
      showStatus('日期格式不正确', 'err');
      return;
    }
    if (!ExamDate.set(value)) {
      showStatus('保存失败，请重试', 'err');
      return;
    }
    showStatus('已保存：' + ExamDate.label(), 'ok');
    render();
  }

  function resetDate() {
    ExamDate.reset();
    showStatus('已恢复自动推算', 'ok');
    render();
  }

  function showStatus(text, type) {
    el.status.textContent = text;
    el.status.classList.remove('is-ok', 'is-err');
    if (type) el.status.classList.add('is-' + type);
  }

  function cacheElements() {
    var root = document.getElementById('view-countdown');
    if (!root) return false;

    el.root = root;
    el.examLabel = root.querySelector('[data-cd-exam-label]');
    el.days = root.querySelector('[data-cd-days]');
    el.clock = root.querySelector('[data-cd-clock]');
    el.note = root.querySelector('[data-cd-note]');
    el.input = root.querySelector('[data-cd-input]');
    el.source = root.querySelector('[data-cd-source]');
    el.status = root.querySelector('[data-cd-status]');
    el.save = root.querySelector('[data-cd-save]');
    el.reset = root.querySelector('[data-cd-reset]');

    return true;
  }

  function bindEvents() {
    el.save.addEventListener('click', saveDate);
    el.reset.addEventListener('click', resetDate);
    // 考试日期变化时同步刷新（统计页的大数字也走这条通道）
    ExamDate.subscribe(render);

    // 窗口重新可见时校正一次（手机后台会被节流）
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) tick();
    });
  }

  global.CountdownModule = {
    name: 'countdown',

    init: function (Router) {
      if (!cacheElements()) {
        console.warn('[countdown] 未找到 #view-countdown 容器');
        return;
      }
      if (!global.ExamDate) {
        console.warn('[countdown] ExamDate 未加载');
        return;
      }
      bindEvents();
      render();
      startTimer();

      Router.onEnter('countdown', render);
    }
  };
})(window);
