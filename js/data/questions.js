/* ==========================================================================
   data/questions.js — 真题练习题库（10 题，四级题型：阅读 / 完形 / 判断）
   --------------------------------------------------------------------------
   每题结构：
     {
       id,                 // 唯一 ID
       type,               // 'single' 单项选择 | 'judge' 判断正误
       passage,            // 可选：阅读原文 / 完形语篇（同篇题目连写，渲染时只显示一次）
       question,           // 题干
       options: [],        // 选项文本；判断题固定 ['正确', '错误']
       answer,             // 正确选项的索引（从 0 开始）
       analysis,           // 解析
       year,               // 年份标注
       section             // 题型分区：阅读理解 / 完形填空 / 判断推理
     }
   说明：以下为按四级真题题型与难度编写的仿真题（非逐字真题原文），
        用于开发自测；上线前可直接替换本文件为真实题库，字段结构不变。
   ========================================================================== */
window.QUESTIONS = [

  /* ---------- 阅读理解（Passage A，3 题） ---------- */
  {
    id: 'r2024-01',
    type: 'single',
    section: '阅读理解',
    year: '2024年6月（仿真）',
    passage: 'In recent years, an increasing number of college students have taken part-time jobs during their studies. Supporters argue that such jobs teach students how to manage money, communicate with colleagues and deal with pressure — skills that classrooms rarely cover. Critics, however, warn that working long hours may take time away from study and lead to lower grades. A survey of 2,000 students at five universities found that those who worked fewer than ten hours a week performed slightly better academically than those who did not work at all, while students working more than twenty hours a week were far more likely to fall behind. Researchers therefore suggest that the key is not whether to work but how much: a moderate amount of part-time work, combined with careful time planning, can benefit students both financially and personally.',
    question: 'What is the main idea of the passage?',
    options: [
      'Part-time jobs should be banned on campus.',
      'Part-time work benefits students when the hours are moderate.',
      'Students who work always get lower grades.',
      'Universities should create part-time jobs for students.'
    ],
    answer: 1,
    analysis: '全文先摆出支持与反对两种观点，再用调查数据说明“工作时间过长才有害”，最后给出研究结论：关键在“工时是否适度”。B 项是对全文主旨的准确概括；A、C 过于绝对，D 文中未提。'
  },
  {
    id: 'r2024-02',
    type: 'single',
    section: '阅读理解',
    year: '2024年6月（仿真）',
    passage: 'In recent years, an increasing number of college students have taken part-time jobs during their studies. Supporters argue that such jobs teach students how to manage money, communicate with colleagues and deal with pressure — skills that classrooms rarely cover. Critics, however, warn that working long hours may take time away from study and lead to lower grades. A survey of 2,000 students at five universities found that those who worked fewer than ten hours a week performed slightly better academically than those who did not work at all, while students working more than twenty hours a week were far more likely to fall behind. Researchers therefore suggest that the key is not whether to work but how much: a moderate amount of part-time work, combined with careful time planning, can benefit students both financially and personally.',
    question: 'What did the survey of 2,000 students find?',
    options: [
      'Working students always performed better than others.',
      'Students working under ten hours a week did slightly better academically.',
      'Most students worked more than twenty hours a week.',
      'Part-time jobs had no effect on academic performance.'
    ],
    answer: 1,
    analysis: '定位到 “those who worked fewer than ten hours a week performed slightly better academically”，即每周工作不足 10 小时的学生成绩略好，B 正确。A 的 “always”、D 的 “no effect” 都与原文相反或绝对化；C 属于无中生有。'
  },
  {
    id: 'r2024-03',
    type: 'single',
    section: '阅读理解',
    year: '2024年6月（仿真）',
    passage: 'In recent years, an increasing number of college students have taken part-time jobs during their studies. Supporters argue that such jobs teach students how to manage money, communicate with colleagues and deal with pressure — skills that classrooms rarely cover. Critics, however, warn that working long hours may take time away from study and lead to lower grades. A survey of 2,000 students at five universities found that those who worked fewer than ten hours a week performed slightly better academically than those who did not work at all, while students working more than twenty hours a week were far more likely to fall behind. Researchers therefore suggest that the key is not whether to work but how much: a moderate amount of part-time work, combined with careful time planning, can benefit students both financially and personally.',
    question: 'What do the researchers suggest?',
    options: [
      'Students should avoid any kind of part-time work.',
      'The real question is how much students work, not whether they work.',
      'Universities should limit working hours by law.',
      'Students should care only about earning money.'
    ],
    answer: 1,
    analysis: '末句 “the key is not whether to work but how much” 直接对应 B。注意 not...but... 结构：重心在 but 之后。'
  },

  /* ---------- 完形填空（Passage B，3 题） ---------- */
  {
    id: 'c2023-01',
    type: 'single',
    section: '完形填空',
    year: '2023年12月（仿真）',
    passage: 'Many people believe that success comes from talent. Yet research on experts suggests that （4）______ practice matters far more. In one famous study, violinists at a top music school were asked to keep a diary of how they spent their time. The best players had （5）______ about 10,000 hours of deliberate practice by the age of twenty, while average players had practised much less. What separates them is not simply the number of hours but the （6）______ of practice: they set clear goals, focus on their weaknesses, and get feedback from teachers.',
    question: 'Choose the best word for blank (4).',
    options: ['accidental', 'deliberate', 'reluctant', 'temporary'],
    answer: 1,
    analysis: '后文两处出现 “deliberate practice”（刻意练习），且与 talent（天赋）形成对比，故选 deliberate“刻意的”。accidental 偶然的、reluctant 不情愿的、temporary 临时的，均不合语境。'
  },
  {
    id: 'c2023-02',
    type: 'single',
    section: '完形填空',
    year: '2023年12月（仿真）',
    passage: 'Many people believe that success comes from talent. Yet research on experts suggests that （4）______ practice matters far more. In one famous study, violinists at a top music school were asked to keep a diary of how they spent their time. The best players had （5）______ about 10,000 hours of deliberate practice by the age of twenty, while average players had practised much less. What separates them is not simply the number of hours but the （6）______ of practice: they set clear goals, focus on their weaknesses, and get feedback from teachers.',
    question: 'Choose the best word for blank (5).',
    options: ['abandoned', 'assessed', 'accumulated', 'accused'],
    answer: 2,
    analysis: '积累到约一万小时 → accumulated“积累”。abandon 放弃、assess 评估、accuse 指控，都无法与 “hours of practice” 搭配。'
  },
  {
    id: 'c2023-03',
    type: 'single',
    section: '完形填空',
    year: '2023年12月（仿真）',
    passage: 'Many people believe that success comes from talent. Yet research on experts suggests that （4）______ practice matters far more. In one famous study, violinists at a top music school were asked to keep a diary of how they spent their time. The best players had （5）______ about 10,000 hours of deliberate practice by the age of twenty, while average players had practised much less. What separates them is not simply the number of hours but the （6）______ of practice: they set clear goals, focus on their weaknesses, and get feedback from teachers.',
    question: 'Choose the best word for blank (6).',
    options: ['quality', 'quantity', 'colour', 'location'],
    answer: 0,
    analysis: '“not simply the number of hours but the ___ of practice” 与数量形成对照，冒号后 “set clear goals, focus on weaknesses, get feedback” 讲的都是如何练，即练习的“质量” quality。quantity 与前半句的 number 重复，是干扰项。'
  },

  /* ---------- 阅读理解（Passage C，2 题） ---------- */
  {
    id: 'r2022-01',
    type: 'single',
    section: '阅读理解',
    year: '2022年12月（仿真）',
    passage: 'Sleep is not simply a period of rest. During deep sleep, the brain replays what we learned during the day and moves new information into long-term memory. Students who sleep well after studying tend to remember more than those who stay up late, even when both groups spend the same total time on the material. Researchers also found that a short nap in the afternoon can improve performance on tasks that require attention, though naps longer than an hour may leave people feeling groggy. The practical advice is simple: protect your sleep before an exam instead of sacrificing it.',
    question: 'According to the passage, what happens during deep sleep?',
    options: [
      'The brain rests completely and stops working.',
      'The brain replays new information and stores it in long-term memory.',
      'People dream mainly about their exams.',
      'Memories formed during the day are erased.'
    ],
    answer: 1,
    analysis: '第二句 “the brain replays what we learned during the day and moves new information into long-term memory” 与 B 完全对应。A、D 与原文相反，C 属无中生有。'
  },
  {
    id: 'r2022-02',
    type: 'single',
    section: '阅读理解',
    year: '2022年12月（仿真）',
    passage: 'Sleep is not simply a period of rest. During deep sleep, the brain replays what we learned during the day and moves new information into long-term memory. Students who sleep well after studying tend to remember more than those who stay up late, even when both groups spend the same total time on the material. Researchers also found that a short nap in the afternoon can improve performance on tasks that require attention, though naps longer than an hour may leave people feeling groggy. The practical advice is simple: protect your sleep before an exam instead of sacrificing it.',
    question: 'What does the passage suggest about afternoon naps?',
    options: [
      'They should last more than an hour.',
      'They can improve attention if they are kept short.',
      'They can replace sleep at night.',
      'They have no effect on performance.'
    ],
    answer: 1,
    analysis: '原文 “a short nap ... can improve performance on tasks that require attention, though naps longer than an hour may leave people feeling groggy”，说明短时午睡有益、过长反而昏沉，B 正确。A 与原文相反，C、D 无依据。'
  },

  /* ---------- 判断正误（Passage D，2 题） ---------- */
  {
    id: 'j2021-01',
    type: 'judge',
    section: '判断推理',
    year: '2021年6月（仿真）',
    passage: 'The word "deadline" comes from prison camps in the American Civil War. A line was drawn a certain distance from the prison wall; prisoners who crossed it were shot. Today the word simply means the latest time by which something must be finished.',
    question: '判断：单词 deadline 最初与监狱中划定的界线有关。',
    options: ['正确', '错误'],
    answer: 0,
    analysis: '原文首句说明 deadline 来自美国内战时期的战俘营，第二条说明越线者会被射杀，即确实源自“界线”，故判断为正确。'
  },
  {
    id: 'j2021-02',
    type: 'judge',
    section: '判断推理',
    year: '2021年6月（仿真）',
    passage: 'The word "deadline" comes from prison camps in the American Civil War. A line was drawn a certain distance from the prison wall; prisoners who crossed it were shot. Today the word simply means the latest time by which something must be finished.',
    question: '判断：按文中所述，越过界线的战俘会被释放。',
    options: ['正确', '错误'],
    answer: 1,
    analysis: '原文为 “prisoners who crossed it were shot”（被射杀），而非被释放，故判断为错误。这类题要盯住关键动词，不要被常识带跑。'
  }
];
