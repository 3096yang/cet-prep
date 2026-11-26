/* ==========================================================================
   modules/stats.js — 学习统计
   --------------------------------------------------------------------------
   数据来源：
     cet:exam:date        → 距考天数（ExamDate）
     cet:daily            → 今日背词 / 做题 / 正确率、近 7 天、连续打卡
     cet:practice:bySection → 各题型正确率（雷达图）
     cet:words:progress   → 词汇掌握率（雷达图第 4 个维度）
   图表：柱状图纯 CSS，雷达图 Canvas 手绘（不引入图表库）
   ========================================================================== */
(function (global) {
  'use strict';

  var DAY = 24 * 60 * 60 * 1000;
  var FONT = '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
  var SECTIONS = ['阅读理解', '完形填空', '判断推理'];
  var LEVEL_MAX = 3;

  var el = {};

  /* ---------------- 顶部大数字 ---------------- */

  function renderHero() {
    var days = ExamDate.daysLeft();
    el.days.textContent = String(Math.max(0, days));
    el.examLabel.textContent = ExamDate.label() + ' 四六级考试';

    if (days > 30) {
      el.heroSub.textContent = '还有 ' + days + ' 天，按节奏走就好';
    } else if (days > 7) {
      el.heroSub.textContent = '只剩 ' + days + ' 天，进入冲刺期';
    } else if (days > 0) {
      el.heroSub.textContent = '最后 ' + days + ' 天，抓高频和错题';
    } else if (days === 0) {
      el.heroSub.textContent = '就是今天，稳住心态！';
    } else {
      el.heroSub.textContent = '本场已结束，去倒计时页设置下一场日期';
    }
  }

  /* ---------------- 今日数据 + 打卡 ---------------- */

  function renderToday() {
    var today = Daily.today();
    el.todayWords.textContent = String(today.words);
    el.todayQuiz.textContent = String(today.quiz);
    el.todayRate.textContent = today.quiz
      ? Math.round((today.correct / today.quiz) * 100) + '%'
      : '—';

    var streak = Daily.streak();
    el.streak.textContent = String(streak);
    if (Daily.todayActive()) {
      el.streakHint.textContent = streak > 1
        ? '今天已打卡，连续 ' + streak + ' 天'
        : '今天已打卡，好的开始';
    } else if (streak > 0) {
      el.streakHint.textContent = '今天还没学习，别断在第 ' + (streak + 1) + ' 天';
    } else {
      el.streakHint.textContent = '今天开始第一天，背 5 个词也算';
    }
  }

  /* ---------------- 近 7 天柱状图（纯 CSS） ---------------- */

  function renderChart(days) {
    el.chart.innerHTML = '';

    var max = 0;
    days.forEach(function (d) {
      max = Math.max(max, d.words + d.quiz);
    });
    if (max === 0) max = 1;

    days.forEach(function (d) {
      var total = d.words + d.quiz;

      var bar = document.createElement('div');
      bar.className = 'st-bar' + (d.isToday ? ' is-today' : '');

      var value = document.createElement('span');
      value.className = 'st-bar__value';
      value.textContent = total ? String(total) : '';

      var track = document.createElement('div');
      track.className = 'st-bar__track';

      var stack = document.createElement('div');
      stack.className = 'st-bar__stack';
      stack.style.height = total ? Math.max(4, Math.round((total / max) * 100)) + '%' : '0';

      if (d.quiz > 0) {
        var quizSeg = document.createElement('div');
        quizSeg.className = 'st-bar__seg st-bar__seg--quiz';
        quizSeg.style.flex = String(d.quiz);
        stack.appendChild(quizSeg);
      }
      if (d.words > 0) {
        var wordSeg = document.createElement('div');
        wordSeg.className = 'st-bar__seg st-bar__seg--word';
        wordSeg.style.flex = String(d.words);
        stack.appendChild(wordSeg);
      }

      track.appendChild(stack);

      var label = document.createElement('span');
      label.className = 'st-bar__label';
      label.textContent = d.label;

      bar.appendChild(value);
      bar.appendChild(track);
      bar.appendChild(label);
      el.chart.appendChild(bar);
    });

    el.chart.setAttribute('aria-label',
      '近 7 天学习量：' + days.map(function (d) {
        return d.label + ' 背词 ' + d.words + ' 做题 ' + d.quiz;
      }).join('；'));
  }

  /* ---------------- 雷达图 ---------------- */

  /** 收集各维度 0~100 的数值 */
  function collectAxes() {
    var sections = Daily.sections();
    var axes = [];

    // 1) 题库里出现的题型（保证顺序稳定）
    SECTIONS.forEach(function (name) {
      if (sections[name]) axes.push(makeSectionAxis(name, sections[name]));
    });
    // 2) 其他可能新增的题型
    Object.keys(sections).forEach(function (name) {
      if (SECTIONS.indexOf(name) < 0) axes.push(makeSectionAxis(name, sections[name]));
    });
    // 3) 词汇掌握率
    axes.push(makeWordAxis());

    return axes;
  }

  function makeSectionAxis(name, rec) {
    return {
      name: name,
      value: rec && rec.total ? Math.round((rec.correct / rec.total) * 100) : 0,
      total: (rec && rec.total) || 0
    };
  }

  function makeWordAxis() {
    var words = Array.isArray(global.WORDS) ? global.WORDS : [];
    var progress = global.Store.get('words:progress', {});
    var sum = 0;
    words.forEach(function (w) {
      var rec = progress[w.id];
      sum += Math.min(LEVEL_MAX, (rec && rec.level) || 0);
    });
    return {
      name: '词汇',
      value: words.length ? Math.round((sum / (words.length * LEVEL_MAX)) * 100) : 0,
      total: words.length
    };
  }

  function drawRadar() {
    var canvas = el.radar;
    if (!canvas) return;

    var axes = collectAxes();
    if (axes.length < 3) return;

    var dpr = global.devicePixelRatio || 1;
    var wrapWidth = canvas.parentNode.clientWidth || 320;
    var cssW = Math.round(Math.min(wrapWidth, 400));
    var cssH = Math.round(cssW * 0.9);

    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';

    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    var styles = global.getComputedStyle(document.documentElement);
    function cssVar(name, fallback) {
      var v = styles.getPropertyValue(name).trim();
      return v || fallback;
    }
    var cLine = cssVar('--color-border', '#dbe4d3');
    var cFill = cssVar('--color-primary', '#5c9a6f');
    var cText = cssVar('--color-text-soft', '#6b7a6e');
    var cStrong = cssVar('--color-text', '#2f3a32');

    var cx = cssW / 2;
    var cy = cssH / 2;
    var R = Math.min(cssW, cssH) / 2 - 44;
    var n = axes.length;
    var step = (Math.PI * 2) / n;

    // 网格（4 层）
    for (var ring = 1; ring <= 4; ring++) {
      var rr = (R * ring) / 4;
      ctx.beginPath();
      for (var i = 0; i < n; i++) {
        var a = -Math.PI / 2 + i * step;
        var x = cx + Math.cos(a) * rr;
        var y = cy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = cLine;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 轴线
    for (var j = 0; j < n; j++) {
      var aj = -Math.PI / 2 + j * step;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(aj) * R, cy + Math.sin(aj) * R);
      ctx.strokeStyle = cLine;
      ctx.stroke();
    }

    // 数据区域
    var points = axes.map(function (ax, k) {
      var angle = -Math.PI / 2 + k * step;
      var radius = (R * Math.max(0, Math.min(100, ax.value))) / 100;
      return {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        angle: Math.cos(angle)
      };
    });

    ctx.beginPath();
    points.forEach(function (p, idx) {
      if (idx === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = cFill;
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = cFill;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 顶点与文字
    var angleOf = function (k) { return -Math.PI / 2 + k * step; };
    points.forEach(function (p, k) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = cFill;
      ctx.fill();

      var a = angleOf(k);
      var lx = cx + Math.cos(a) * (R + 24);
      var ly = cy + Math.sin(a) * (R + 24);
      var cos = Math.cos(a);

      ctx.textAlign = Math.abs(cos) < 0.2 ? 'center' : (cos > 0 ? 'left' : 'right');
      ctx.textBaseline = 'middle';

      ctx.font = '600 11px ' + FONT;
      ctx.fillStyle = cStrong;
      ctx.fillText(axes[k].name, lx, ly - 8);

      ctx.font = '11px ' + FONT;
      ctx.fillStyle = cText;
      ctx.fillText(axes[k].total ? axes[k].value + '%' : '未作答', lx, ly + 7);
    });

    // 底部说明
    var practised = axes.filter(function (a) { return a.total > 0; }).length;
    el.radarNote.textContent = practised
      ? '已统计 ' + practised + ' 个维度；「词汇」按单词熟悉度（0~3 级）折算'
      : '还没有练习记录，做题后这里会画出你的能力曲线';
  }

  /* ---------------- 汇总 ---------------- */

  function render() {
    if (!el.root || !global.Daily || !global.ExamDate) return;
    renderHero();
    renderToday();
    renderChart(Daily.lastDays(7));
    drawRadar();
  }

  /* ---------------- 初始化 ---------------- */

  function cacheElements() {
    var root = document.getElementById('view-stats');
    if (!root) return false;

    el.root = root;
    el.days = root.querySelector('[data-st-days]');
    el.examLabel = root.querySelector('[data-st-exam-label]');
    el.heroSub = root.querySelector('[data-st-hero-sub]');
    el.todayWords = root.querySelector('[data-st-today-words]');
    el.todayQuiz = root.querySelector('[data-st-today-quiz]');
    el.todayRate = root.querySelector('[data-st-today-rate]');
    el.streak = root.querySelector('[data-st-streak]');
    el.streakHint = root.querySelector('[data-st-streak-hint]');
    el.chart = root.querySelector('[data-st-chart]');
    el.radar = root.querySelector('[data-st-radar]');
    el.radarNote = root.querySelector('[data-st-radar-note]');

    return true;
  }

  function bindEvents() {
    // 考试日期变化 → 大数字同步
    if (global.ExamDate) ExamDate.subscribe(function () {
      if (el.root.classList.contains('is-active')) renderHero();
    });

    // 旋转屏幕 / 改变窗口宽度 → 重绘雷达图（Canvas 不吃 CSS 缩放）
    var resizeTimer = null;
    global.addEventListener('resize', function () {
      if (!el.root.classList.contains('is-active')) return;
      if (resizeTimer) global.clearTimeout(resizeTimer);
      resizeTimer = global.setTimeout(drawRadar, 200);
    });

    // 切换深色模式 → 按新变量重绘（Canvas 颜色不会自动跟随 CSS）
    document.addEventListener('theme:change', function () {
      if (el.root.classList.contains('is-active')) drawRadar();
    });
  }

  global.StatsModule = {
    name: 'stats',

    init: function (Router) {
      if (!cacheElements()) {
        console.warn('[stats] 未找到 #view-stats 容器');
        return;
      }
      bindEvents();
      Router.onEnter('stats', render);
    },

    refresh: render
  };
})(window);
