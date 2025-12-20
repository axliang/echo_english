Page({
  data: {
    basicTranslations: [
      { pos: 'n.', meaning: '森林；林木' },
      { pos: 'vt.', meaning: '在...上植树造林' }
    ],
    collinsEntries: [
      {
        word: 'forest',
        stars: [true, true, true, false, false],
        definitions: [
          {
            number: 1,
            pos: 'N-COUNT',
            definition: 'A forest is a large area of land that is covered with trees.',
            examples: [
              {
                sentence: 'The forest was cool and dark.',
                translation: '森林凉爽而幽暗。'
              }
            ]
          },
          {
            number: 2,
            pos: 'VERB',
            definition: 'To forest an area means to plant trees in it.',
            examples: [
              {
                sentence: 'The government plans to forest 10,000 acres of land.',
                translation: '政府计划在一万英亩的土地上植树造林。'
              }
            ]
          }
        ]
      }
    ],
    webTranslations: [
      { key: 'Forest Service:', value: '林务局' },
      { key: 'National Forest:', value: '国家森林' },
      { key: 'Tropical Forest:', value: '热带森林' },
      { key: 'Forest Management:', value: '森林管理' }
    ]
  },

  goBack() {
    wx.navigateBack();
  }
});