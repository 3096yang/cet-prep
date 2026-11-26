/* ==========================================================================
   router.js — 极简 hash 路由（无依赖）
   职责：
     1. 维护「路由表」：hash 路径 ↔ 页面容器 id / 标题
     2. 监听 hashchange，切换 .view 的 is-active 类
     3. 同步底部导航高亮、顶栏标题、document.title
     4. 提供 onEnter 钩子，供各功能模块在进入页面时渲染数据
   用法：
     Router.navigate('words');                 // 编程式跳转
     Router.onEnter('words', renderWords);     // 注册进入页面的回调
     Router.onEnter('*', fn);                  // 任意页面进入后都执行
   ========================================================================== */
(function (global) {
  'use strict';

  /** 路由表：新增页面时在这里加一行即可 */
  var ROUTES = [
    { path: 'countdown', view: 'view-countdown', title: '考试倒计时' },
    { path: 'words',     view: 'view-words',     title: '单词背诵' },
    { path: 'practice',  view: 'view-practice',  title: '真题练习' },
    { path: 'wrong',     view: 'view-wrong',     title: '错题本' },
    { path: 'stats',     view: 'view-stats',     title: '学习统计' }
  ];

  var DEFAULT_PATH = 'countdown';
  var STORAGE_KEY = 'cet:last-route';
  var hooks = Object.create(null); // path -> [fn, ...]；'*' 为全局钩子
  var current = null;

  /* ---------------- 工具函数 ---------------- */

  /** 从 location.hash 解析出合法路径，非法则回落默认页 */
  function parseHash() {
    var raw = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
    var known = ROUTES.some(function (r) { return r.path === raw; });
    return known ? raw : null;
  }

  function findRoute(path) {
    for (var i = 0; i < ROUTES.length; i++) {
      if (ROUTES[i].path === path) return ROUTES[i];
    }
    return null;
  }

  function readSavedPath() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      return findRoute(saved) ? saved : DEFAULT_PATH;
    } catch (e) {
      return DEFAULT_PATH;
    }
  }

  function savePath(path) {
    try { localStorage.setItem(STORAGE_KEY, path); } catch (e) { /* 隐私模式忽略 */ }
  }

  /** 安全执行钩子，单个模块报错不影响其他模块 */
  function runHooks(path) {
    var list = (hooks[path] || []).concat(hooks['*'] || []);
    list.forEach(function (fn) {
      try { fn(findRoute(path)); } catch (err) {
        console.error('[router] 页面钩子执行失败:', path, err);
      }
    });
  }

  /* ---------------- 渲染 ---------------- */

  function render(path) {
    var route = findRoute(path) || findRoute(DEFAULT_PATH);
    if (!route) return;

    // 1) 视图切换
    var views = document.querySelectorAll('.view');
    Array.prototype.forEach.call(views, function (view) {
      view.classList.toggle('is-active', view.id === route.view);
    });

    // 2) 导航高亮
    var tabs = document.querySelectorAll('[data-route]');
    Array.prototype.forEach.call(tabs, function (tab) {
      var active = tab.getAttribute('data-route') === route.path;
      tab.classList.toggle('is-active', active);
      if (active) {
        tab.setAttribute('aria-current', 'page');
      } else {
        tab.removeAttribute('aria-current');
      }
    });

    // 3) 标题同步
    var titleEl = document.querySelector('[data-page-title]');
    if (titleEl) titleEl.textContent = route.title;
    var subEl = document.querySelector('[data-page-subtitle]');
    if (subEl) subEl.textContent = 'CET 4/6';
    document.title = route.title + ' · 四六级备考';

    // 4) 状态记录 + 回到顶部
    current = route.path;
    savePath(route.path);
    global.scrollTo({ top: 0, behavior: 'auto' });

    // 5) 通知各模块
    runHooks(route.path);
    document.dispatchEvent(new CustomEvent('route:change', {
      detail: { path: route.path, route: route }
    }));
  }

  /* ---------------- 对外 API ---------------- */

  var Router = {
    routes: ROUTES,
    defaultPath: DEFAULT_PATH,

    /** 当前激活路径 */
    get current() { return current; },

    /** 跳转到指定页面（写 hash，自动触发渲染） */
    navigate: function (path) {
      if (!findRoute(path)) {
        console.warn('[router] 未知路由:', path);
        path = DEFAULT_PATH;
      }
      var next = '#/' + path;
      if (location.hash === next) {
        render(path); // hash 未变化时手动重绘
      } else {
        location.hash = next;
      }
    },

    /** 注册「进入某页面」的回调；path 传 '*' 表示所有页面 */
    onEnter: function (path, fn) {
      if (typeof fn !== 'function') return;
      (hooks[path] || (hooks[path] = [])).push(fn);
    },

    /** 手动触发一次当前页面渲染 */
    refresh: function () {
      if (current) render(current);
    },

    /** 初始化：补全首个 hash 并绑定监听 */
    init: function () {
      var path = parseHash();

      // 首次进入（无 hash）时，恢复上次访问页或默认页
      if (!path) {
        path = readSavedPath();
        history.replaceState(null, '', '#/' + path);
      }

      render(path);
      global.addEventListener('hashchange', function () {
        render(parseHash() || readSavedPath());
      });
    }
  };

  global.Router = Router;
})(window);
