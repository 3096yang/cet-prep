# 四六级备考 · 项目骨架

纯前端单页应用（HTML + CSS + 原生 JS，无框架、无构建、无后端），数据用 localStorage 保存，移动端优先。

## 一、文件结构

```
cet-prep/
├─ index.html             # 唯一页面：顶栏 + 5 个视图容器 + 底部导航
├─ README.md
├─ css/
│  ├─ variables.css       # 设计令牌（浅色/深色两套变量：颜色、字号、圆角、阴影）
│  ├─ base.css            # 重置 + 骨架（顶栏/主题按钮/内容区/底部导航/淡入/缩放反馈）
│  ├─ components.css      # 通用组件（卡片、按钮、chips、标签、进度条、空状态）
│  ├─ words.css           # 单词模块样式（翻转卡片 / 筛选 chips / 评价按钮）
│  ├─ practice.css        # 练习模块样式（题干 / 选项着色 / 解析区 / 成绩面板）
│  ├─ wrongbook.css       # 错题本样式（列表卡片 / 首页提醒 / 复习模式）
│  ├─ countdown.css       # 倒计时样式（渐变大卡片 / 日期表单）
│  └─ stats.css           # 统计样式（大数字 / 柱状图 / 雷达图）
├─ js/
│  ├─ router.js           # 极简 hash 路由（路由表 / 切换视图 / 高亮 / onEnter 钩子）
│  ├─ store.js            # localStorage 封装（cet: 前缀 + JSON 序列化）
│  ├─ daily.js            # 每日学习台账（今日 / 近 7 天 / 打卡 / 题型累计）
│  ├─ exam-date.js        # 考试日期（第三个周六推算 + 手动覆盖）
│  ├─ theme.js            # 深色模式切换（变量换肤 + 持久化）
│  ├─ app.js              # 应用入口（命名空间 App + 模块注册 + 启动路由）
│  ├─ data/
│  │  ├─ words.js         # 词库数据 window.WORDS（20 个四级高频词）
│  │  └─ questions.js     # 题库数据 window.QUESTIONS（10 题：阅读/完形/判断）
│  └─ modules/
│     ├─ words.js         # ✅ 单词背诵
│     ├─ practice.js      # ✅ 真题练习（含错题入库）
│     ├─ wrongbook.js     # ✅ 错题本 + 艾宾浩斯智能复习
│     ├─ countdown.js     # ✅ 考试倒计时
│     └─ stats.js         # ✅ 学习统计（CSS 柱状图 + Canvas 雷达图）
```

脚本加载顺序（defer，按顺序执行）：`router.js → store.js → data/*.js → modules/*.js → app.js`。
模块文件只把对象挂到 `window.XxxModule`，由 `app.js` 统一 `App.register()`。

## 二、路由约定

| 路径 | 视图容器 id | 说明 |
| --- | --- | --- |
| `#/countdown` | `view-countdown` | 考试倒计时（默认首页） |
| `#/words` | `view-words` | 单词背诵 |
| `#/practice` | `view-practice` | 真题练习 |
| `#/wrong` | `view-wrong` | 错题本 |
| `#/stats` | `view-stats` | 学习统计 |

- 直接打开 `index.html` 即可运行（需通过 `file://` 或本地静态服务器访问）。
- 页面刷新后会记住上次所在页面（`localStorage['cet:last-route']`）。
- 新增页面：在 `ROUTES` 加一行 + 在 `index.html` 加一个 `<section class="view" id="...">` + 底部导航加 `data-route`。

## 三、模块接入方式

```js
// js/modules/words.js
window.App.register({
  name: 'words',
  init(Router) {
    Router.onEnter('words', () => { /* 进入单词页时渲染卡片 */ });
  }
});
```

然后在 `app.js` 的 `registerModules()` 里取消对应注释即可。

## 四、单词模块（已实现）

### 单词数据结构 `js/data/words.js`

```js
{
  id: 'cet4-001',                       // 唯一 ID，做熟悉度记录的 key，勿随意改动
  word: 'abandon',
  phonetic: '/əˈbændən/',
  meaning: 'v. 放弃；抛弃；遗弃',
  example: 'He abandoned the plan for lack of money.',
  tag: '高频'                            // '高频' | '核心' | '基础'
}
```

### 学习记录 `localStorage['cet:words:progress']`

```js
{
  "cet4-001": {
    level: 2,            // 熟悉度 0~3（3 = 已掌握）
    seen: 5,             // 累计作答次数
    lastAction: 'know',  // 最近一次评价：know | vague | unknown
    updatedAt: 1690000000000
  }
}
```

### 队列规则

| 操作 | 熟悉度变化 | 是否出队 |
| --- | --- | --- |
| 认识 | +1（上限 3） | 是，进度 +1 |
| 模糊 | 限制在 1~2（3 会降为 2，0 升为 1） | 否，插入队尾 |
| 不认识 | 归零 | 否，插入队尾 |

- 队列按熟悉度升序构建（不熟的先背），同级别保持词库原顺序。
- 队列耗尽 → 显示「本轮完成」面板，可「复习未掌握的词」或「重新开始本轮」。
- 快捷键：`1` 认识 / `2` 模糊 / `3` 不认识，空格或回车翻转卡片。

## 五、真题练习模块（已实现）

### 题目数据结构 `js/data/questions.js`

```js
{
  id: 'r2024-01',
  type: 'single',            // 'single' 单选 | 'judge' 判断
  passage: 'In recent years...',  // 可选：阅读原文 / 完形语篇
  question: 'What is the main idea of the passage?',
  options: ['A 选项文本', 'B 选项文本', 'C 选项文本', 'D 选项文本'],
  answer: 1,                 // 正确选项索引（从 0 开始）；判断题 0=正确 1=错误
  analysis: '解析文本',
  year: '2024年6月（仿真）',
  section: '阅读理解'        // 阅读理解 | 完形填空 | 判断推理
}
```

- 同一篇阅读的多道题连写并共用相同 `passage` 文本，渲染时只显示一次原文。
- 判断题 `options` 固定为 `['正确', '错误']`，前端自动用 `√ / ×` 渲染。
- 题库为仿真题（对标四级题型与难度，非逐字真题原文），上线前可直接替换为真实题库，字段不变。

### 错题本数据 `localStorage['cet:wrongbook']`

```js
{
  "r2024-01": {
    id, type, section, year, question, options, answer, analysis,  // 题目快照
    wrongCount: 2,        // 累计答错次数
    lastChoice: 0,        // 最近一次错选
    lastResult: 'wrong',  // 最近一次结果：wrong | right
    lastAt: 1690000000000
  }
}
```

错题重做时若答对，只把 `lastResult` 改为 `right`，不删除记录（删除由错题本模块决定）。

### 练习历史 `localStorage['cet:practice:history']`

```js
[{ at, total: 10, correct: 5, rate: 50, mode: 'all', durationMs: 8419 }]  // 最多保留 100 条
```

### 交互流程

1. 进入页面自动开始一组（默认全部题目），显示题干与选项，不泄露答案。
2. 点选后立即锁定：正确项标绿 `✓`，错选标红 `✗`，其他选项弱化。
3. 解析区自动展开（判定 + 正确答案 + 你的选择 + 解析）。
4. 答错自动写入错题本；点「下一题」推进。
5. 最后一题按钮变「查看成绩」，显示得分 / 正确率 / 用时 / 错题清单，可「重做本组」或「只练错题」。
6. 快捷键：`1~4` 或 `A~D` 选项，`Enter` / `→` 下一题。

## 六、错题本 + 智能复习（已实现）

### 记录字段 `localStorage['cet:wrongbook']`

```js
{
  "r2024-01": {
    // 题目快照（练习模块写入）
    id, type, section, year, passage, question, options, answer, analysis,
    // 错误统计
    wrongCount: 2,        // 累计答错次数
    lastChoice: 0,        // 最近一次错选
    lastResult: 'wrong',
    lastAt: 1690000000000,
    // 复习排程（错题本模块维护）
    createdAt: 1690000000000,  // 首次答错时间，列表按它倒序
    correctStreak: 1,          // 重做时连续答对次数
    stage: 1,                  // 已完成复习轮次，决定下次间隔
    nextReviewAt: 1690172800000, // 下次复习时间戳（0 = 已掌握）
    mastered: false            // 连对 3 次自动置 true
  }
}
```

### 艾宾浩斯排程

| 事件 | correctStreak | stage | nextReviewAt |
| --- | --- | --- | --- |
| 答错（练习 / 重做） | 归 0 | 归 0 | 明天（1 天节点） |
| 重做答对第 1 次 | +1 | +1 | +2 天 |
| 重做答对第 2 次 | +1 | +1 | +4 天 |
| 重做答对第 3 次 | +1 → 3 | +1 | 0，`mastered = true` |

节点数组 `INTERVALS = [1, 2, 4, 7, 15]`（天），`stage` 超出后取最后一档。已掌握的记录不再进入待复习队列，在「已掌握」筛选里可见。

### 列表与交互

- 按 `createdAt` 倒序；每条折叠态即显示**我的答案 / 正确答案 / 错误次数**。
- 点击卡片头部展开：原文、全部选项（正确项绿、错选项红）、解析、连对进度点、下次复习时间。
- 操作：「重做」单题进入复习模式；「移除」带 confirm 二次确认。
- 顶部三个统计：总错题 / 今日待复习 / 已掌握，配合「全部 / 待复习 / 已掌握」筛选。
- 「今日待复习」在首页（倒计时页）卡片显示，点击直达智能复习；判定依据是 `nextReviewAt <= 今天 23:59:59`。

### 跨模块约定

练习模块写入错题时用 `Object.assign` 合并旧记录并重置排程（`correctStreak=0 / stage=0 / nextReviewAt=明天`），不会抹掉题目快照以外的字段；错题本重做答对只加自己的排程字段。

> 注意：`.btn`、`.words-actions` 等组件自带 `display:flex/grid`，会覆盖 `[hidden]`。`base.css` 已加 `[hidden] { display: none !important; }`，新组件只管正常写 `hidden` 即可。

## 七、倒计时（已实现）

### 日期规则

- 默认自动推算：每年 **6 月 / 12 月的第三个星期六**（`ExamDate`，取当前时间之后最近的一场）。
- 手动覆盖：`localStorage['cet:exam:date'] = 'YYYY-MM-DD'`，优先生效；「恢复自动」会删掉该键。
- 距考天数按**自然日**算（今天考 = 0），与统计页大数字同源。

```js
ExamDate.date() / daysLeft() / label() / iso()
ExamDate.set('2027-06-19') / reset() / subscribe(fn)
```

> 四六级实际考试日由官方公布（常见第二或第三个周六），所以界面明确写了「与实际考试日可能相差一周」，并给了手动输入框。

### 展示

渐变大卡片：考试日期 → 剩余天数（大数字）→ 当日内 `时:分:秒` 跳动 → 四级 9:00 / 六级 15:00 提示；下方「考试日期」卡片可改日期并实时重算。

## 八、学习统计（已实现）

### 数据来源

| 指标 | 存储键 |
| --- | --- |
| 距考天数 | `cet:exam:date`（无则自动推算） |
| 今日背词 / 做题 / 正确率、近 7 天、连续打卡 | `cet:daily` |
| 各题型正确率（雷达图） | `cet:practice:bySection` |
| 词汇掌握率（雷达图第 4 维） | `cet:words:progress` |

`cet:daily` 结构（`js/daily.js` 维护，只保留最近 90 天）：

```js
{
  "2026-11-26": { words: 6, wordIds: ["cet4-001", ...], quiz: 10, correct: 7 }
}
// 题型累计
{ "阅读理解": { correct: 9, total: 11 }, "完形填空": {...}, "判断推理": {...} }
```

各模块在作答时只需一行：`Daily.addWord(id)` / `Daily.addQuiz(isCorrect)` / `Daily.addSection(section, isCorrect)`。

### 图表实现（无图表库）

- **近 7 天柱状图**：纯 CSS。`grid-template-columns: repeat(7, 1fr)` 七列，每列 `track` 固定高度、内部 `stack` 用百分比高度，背词 / 做题两段用 `flex: 数量` 分配比例（绿 = 背词，蓝 = 做题）。
- **雷达图**：Canvas 手绘。`devicePixelRatio` 缩放保证清晰，四层网格 + 轴线 + 多边形面积（`globalAlpha 0.22`）+ 顶点与标签；尺寸随容器宽度重算，窗口 resize 防抖重绘。

```js
function drawRadar() {  // 简化版
  var R = Math.min(cssW, cssH) / 2 - 44;
  var step = (Math.PI * 2) / n;
  // 4 层网格 → 轴线 → 数据多边形 → 顶点与文字
}
```

维度：阅读理解 / 完形填空 / 判断推理（按实际有数据的题型出现，新题型自动加入）+ 词汇（`Σmin(level,3) / (词数×3)`）。

### 其他指标

- **连续打卡**：从今天往前数连续有学习记录的天数；今天还没学时从昨天开始数，不会白天直接归零。
- **今日正确率**：`今日答对 ÷ 今日做题`，没做题显示 `—`。

## 九、UI 规范与深色模式

### 设计令牌（`css/variables.css`）

| 令牌 | 浅色 | 深色 |
| --- | --- | --- |
| `--color-primary` | `#4A90D9` | `#5EA7EC` |
| `--color-bg` | `#F7F8FA` | `#12161C` |
| `--color-surface` | `#FFFFFF` | `#1A2028` |
| `--color-text` | `#1F2733` | `#E8EDF3` |
| `--radius-card` | `12px` | 同左 |
| `--shadow-card` | `0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)` | 黑色半透明加浓 |

- 正文：`--fs-base: 1rem` / `--lh-base: 1.6`，字体栈为系统默认（`-apple-system → Segoe UI → PingFang SC → Microsoft YaHei`）。
- 组件只引用变量，**换肤不需要改任何组件 CSS**；主色上的文字统一用 `--color-on-primary`（深色下是深色字，保证对比度）。

### 深色模式

```html
<html data-theme="dark">   <!-- 唯一开关 -->
```

- `<head>` 内联脚本先读 `localStorage['cet:theme']` 写入 `data-theme`，避免刷新闪烁；没存过则跟随系统 `prefers-color-scheme`。
- 顶栏右侧按钮切换，`js/theme.js` 同时更新 `aria-pressed` / `aria-label` / `<meta name="theme-color">`。
- 切换时广播 `theme:change` 事件，Canvas 雷达图据此重绘（Canvas 不自动跟随 CSS 变量）。

### 交互反馈

- 页面切换：`.view.is-active` 淡入 + 上浮 6px，`0.24s`。
- 卡片点击：`scale(0.99)`（`--tap-scale-card`）；按钮 / 选项 / 导航：`scale(0.97)`（`--tap-scale`）。
- 桌面端 `@media (hover:hover)` 额外给卡片加悬浮阴影，手机不受影响。
- `prefers-reduced-motion` 下所有动画降到 0.01ms。

### 底部导航图标（内联 SVG，无图标库）

五个 24×24 线性图标，统一 `stroke-width: 1.7`、圆端点圆拐角；选中态线条加粗到 `2.15` + 主色 + `--color-primary-soft` 药丸底色。

| 页面 | 图形 | 说明 |
| --- | --- | --- |
| 倒计时 | 秒表 | 圆表盘 + 指针 + 顶部提纽 |
| 单词 | 翻开的书 | 书本轮廓 + 书脊线 |
| 练习 | 铅笔 | 笔身 + 笔头分割线 |
| 错题 | 错题卡片 | 圆角卡片 + 叉号 |
| 统计 | 柱状图 | 轴线 + 三根柱，与统计页图表语义一致 |

```css
.tabbar__icon svg {
  width: 22px; height: 22px;
  fill: none; stroke: currentColor;
  stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round;
}
.tabbar__item.is-active .tabbar__icon svg { stroke-width: 2.15; }
```

图标用 `stroke: currentColor`，颜色完全由 `.tabbar__item` 的文字色控制，深浅色模式都不用写额外规则。

## 十、上线前建议

1. 替换题库：`js/data/questions.js` 换成真实真题（字段不变）；词库 `js/data/words.js` 扩充到 500~1000 词。
2. 若想跨设备同步，只需把 `js/store.js` 的 get/set 换成接口请求，其他模块零改动。
3. 可选的下一步：单词页加「每日新词 + 复习」配额、练习页加听力音频、统计页加导出/重置入口。
