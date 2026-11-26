/* ==========================================================================
   app.js — 应用入口
   目前只负责：启动路由、暴露全局命名空间、给后续模块预留挂载点。
   各功能模块（单词/练习/错题/统计/倒计时）开发时在下方 registerModules() 中接入。
   ========================================================================== */
(function (global) {
  'use strict';

  /** 全局命名空间，后续模块统一挂到 App.modules 上 */
  var App = {
    version: '0.1.0',
    modules: {},

    /** 模块注册：module = { name, init(router) } */
    register: function (module) {
      if (!module || !module.name) return;
      App.modules[module.name] = module;
      if (typeof module.init === 'function') {
        try { module.init(global.Router); } catch (err) {
          console.error('[app] 模块初始化失败:', module.name, err);
        }
      }
    }
  };

  /** 功能模块接入点：模块文件各自挂到 window 上，这里统一注册 */
  var MODULE_GLOBALS = [
    'CountdownModule',   // js/modules/countdown.js
    'WordsModule',       // js/modules/words.js
    'PracticeModule',    // js/modules/practice.js
    'WrongbookModule',   // js/modules/wrongbook.js
    'StatsModule'        // js/modules/stats.js
  ];

  function registerModules() {
    MODULE_GLOBALS.forEach(function (name) {
      var module = global[name];
      if (module && !App.modules[module.name]) App.register(module);
    });
  }

  function boot() {
    registerModules();
    global.Router.init();

    // 全局路由变化埋点，方便调试
    document.addEventListener('route:change', function (e) {
      console.log('[route] →', e.detail.path);
    });
  }

  global.App = App;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
