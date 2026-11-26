/* ==========================================================================
   data/words.js — 词库数据（20 个四级高频词，测试数据）
   每个单词对象结构：
     { id, word, phonetic, meaning, example, tag }
     - id       唯一标识，用于 localStorage 存熟悉度（建议固定不变）
     - word     单词
     - phonetic 音标（含斜杠）
     - meaning  中文释义（词性 + 释义，可多项用分号分隔）
     - example  英文例句
     - tag      分类：'高频' | '核心' | '基础'
   ========================================================================== */
window.WORDS = [
  {
    id: 'cet4-001',
    word: 'abandon',
    phonetic: '/əˈbændən/',
    meaning: 'v. 放弃；抛弃；遗弃',
    example: 'He abandoned the plan for lack of money.',
    tag: '高频'
  },
  {
    id: 'cet4-002',
    word: 'absolute',
    phonetic: '/ˈæbsəluːt/',
    meaning: 'adj. 绝对的；完全的；无条件的',
    example: 'She has absolute confidence in her team.',
    tag: '核心'
  },
  {
    id: 'cet4-003',
    word: 'academic',
    phonetic: '/ˌækəˈdemɪk/',
    meaning: 'adj. 学术的；学业的；纯理论的',
    example: 'Academic performance is not the only measure of success.',
    tag: '高频'
  },
  {
    id: 'cet4-004',
    word: 'accomplish',
    phonetic: '/əˈkʌmplɪʃ/',
    meaning: 'v. 完成；实现；达到',
    example: 'She accomplished the task ahead of schedule.',
    tag: '高频'
  },
  {
    id: 'cet4-005',
    word: 'accurate',
    phonetic: '/ˈækjərət/',
    meaning: 'adj. 准确的；精确的；正确无误的',
    example: 'The report gives an accurate description of the accident.',
    tag: '核心'
  },
  {
    id: 'cet4-006',
    word: 'adapt',
    phonetic: '/əˈdæpt/',
    meaning: 'v. 适应；改编；调整',
    example: 'It took him a while to adapt to the new environment.',
    tag: '高频'
  },
  {
    id: 'cet4-007',
    word: 'adequate',
    phonetic: '/ˈædɪkwət/',
    meaning: 'adj. 足够的；适当的；胜任的',
    example: 'Make sure you get adequate sleep before the exam.',
    tag: '核心'
  },
  {
    id: 'cet4-008',
    word: 'adjust',
    phonetic: '/əˈdʒʌst/',
    meaning: 'v. 调整；调节；适应',
    example: 'You can adjust the volume with this button.',
    tag: '基础'
  },
  {
    id: 'cet4-009',
    word: 'admire',
    phonetic: '/ədˈmaɪə(r)/',
    meaning: 'v. 钦佩；赞赏；欣赏',
    example: 'I admire her courage in speaking out.',
    tag: '基础'
  },
  {
    id: 'cet4-010',
    word: 'adopt',
    phonetic: '/əˈdɒpt/',
    meaning: 'v. 采取；采纳；收养',
    example: 'The company adopted a new marketing strategy.',
    tag: '高频'
  },
  {
    id: 'cet4-011',
    word: 'advantage',
    phonetic: '/ədˈvɑːntɪdʒ/',
    meaning: 'n. 优势；有利条件；好处',
    example: 'Living in a big city has both advantages and disadvantages.',
    tag: '基础'
  },
  {
    id: 'cet4-012',
    word: 'affect',
    phonetic: '/əˈfekt/',
    meaning: 'v. 影响；感染；感动',
    example: 'Noise can seriously affect your concentration.',
    tag: '高频'
  },
  {
    id: 'cet4-013',
    word: 'afford',
    phonetic: '/əˈfɔːd/',
    meaning: 'v. 买得起；负担得起；提供',
    example: "We can't afford to waste any more time.",
    tag: '高频'
  },
  {
    id: 'cet4-014',
    word: 'aggressive',
    phonetic: '/əˈɡresɪv/',
    meaning: 'adj. 好斗的；有闯劲的；积极进取的',
    example: 'The firm took an aggressive approach to expand its market.',
    tag: '核心'
  },
  {
    id: 'cet4-015',
    word: 'alternative',
    phonetic: '/ɔːlˈtɜːnətɪv/',
    meaning: 'n. 替代方案；选择  adj. 可供替代的',
    example: 'There is no alternative but to wait.',
    tag: '高频'
  },
  {
    id: 'cet4-016',
    word: 'amount',
    phonetic: '/əˈmaʊnt/',
    meaning: 'n. 数量；总额  v. 总计；等同于',
    example: 'A large amount of money was spent on the research.',
    tag: '基础'
  },
  {
    id: 'cet4-017',
    word: 'analyze',
    phonetic: '/ˈænəlaɪz/',
    meaning: 'v. 分析；分解；解析',
    example: 'Scientists analyze the data collected from the experiment.',
    tag: '核心'
  },
  {
    id: 'cet4-018',
    word: 'anxious',
    phonetic: '/ˈæŋkʃəs/',
    meaning: 'adj. 焦虑的；担忧的；渴望的',
    example: 'She was anxious about the coming interview.',
    tag: '高频'
  },
  {
    id: 'cet4-019',
    word: 'apparent',
    phonetic: '/əˈpærənt/',
    meaning: 'adj. 显然的；表面上的；貌似的',
    example: 'It soon became apparent that the plan would fail.',
    tag: '核心'
  },
  {
    id: 'cet4-020',
    word: 'appreciate',
    phonetic: '/əˈpriːʃieɪt/',
    meaning: 'v. 感激；欣赏；理解；增值',
    example: 'I really appreciate your help with the project.',
    tag: '高频'
  }
];
