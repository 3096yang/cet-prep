/* ==========================================================================
   theme.js — 深色模式切换
   --------------------------------------------------------------------------
   · 主题写在 <html data-theme="light|dark">，全部配色由 variables.css 的变量决定
   · 选择存 localStorage['cet:theme']；首次访问跟随系统 prefers-color-scheme
   · 页面内联脚本会先应用主题，避免白屏闪烁；这里只负责按钮交互
   ========================================================================== */
(function (global) {
  'use strict';

  var KEY = 'theme';
  var root = document.documentElement;
  var META_COLOR = { light: '#f7f8fa', dark: '#12161c' };

  function current() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function apply(theme) {
    root.setAttribute('data-theme', theme);

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', META_COLOR[theme] || META_COLOR.light);

    var btn = document.querySelector('[data-theme-toggle]');
    if (btn) {
      var isDark = theme === 'dark';
      btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      btn.setAttribute('aria-label', isDark ? '切换到浅色模式' : '切换到深色模式');
    }

    // 通知需要重绘的模块（如 Canvas 雷达图要按新颜色重画）
    document.dispatchEvent(new CustomEvent('theme:change', { detail: { theme: theme } }));
  }

  function set(theme) {
    if (global.Store) global.Store.set(KEY, theme);
    apply(theme);
  }

  function toggle() {
    set(current() === 'dark' ? 'light' : 'dark');
  }

  function init() {
    var saved = global.Store ? global.Store.get(KEY, null) : null;
    if (saved !== 'dark' && saved !== 'light') {
      saved = global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    apply(saved);

    var btn = document.querySelector('[data-theme-toggle]');
    if (btn) btn.addEventListener('click', toggle);

    // 系统主题变化时，仅当用户没手动选过才跟随
    if (global.matchMedia) {
      var mq = global.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function (e) {
        var chosen = global.Store ? global.Store.get(KEY, null) : null;
        if (!chosen) apply(e.matches ? 'dark' : 'light');
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
    }
  }

  global.Theme = { apply: apply, set: set, toggle: toggle, current: current };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
