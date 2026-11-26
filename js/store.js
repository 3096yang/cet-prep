/* ==========================================================================
   store.js — localStorage 统一封装
   所有 key 自动加 'cet:' 前缀，值统一 JSON 序列化。
   用法：
     Store.get('words:progress', {})              // 读取，失败返回默认值
     Store.set('words:progress', data)            // 写入
     Store.update('words:progress', {}, fn)       // 读→改→写，返回新值
   ========================================================================== */
(function (global) {
  'use strict';

  var PREFIX = 'cet:';

  function fullKey(key) {
    return PREFIX + key;
  }

  var Store = {
    /** 读取；解析失败或无值时返回 fallback */
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(fullKey(key));
        if (raw === null) return fallback;
        return JSON.parse(raw);
      } catch (e) {
        console.warn('[store] 读取失败:', key, e);
        return fallback;
      }
    },

    /** 写入；返回是否成功（隐私模式 / 超配额时返回 false） */
    set: function (key, value) {
      try {
        localStorage.setItem(fullKey(key), JSON.stringify(value));
        return true;
      } catch (e) {
        console.warn('[store] 写入失败:', key, e);
        return false;
      }
    },

    /** 读 → 改 → 写；fn 需返回新的数据对象 */
    update: function (key, fallback, fn) {
      var current = Store.get(key, fallback);
      var next = fn(current);
      Store.set(key, next);
      return next;
    },

    remove: function (key) {
      try { localStorage.removeItem(fullKey(key)); } catch (e) { /* 忽略 */ }
    }
  };

  global.Store = Store;
})(window);
