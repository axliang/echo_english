Page({
  data: {
    currentWord: 'forest',
    translations: [
      { pos: 'n.', meaning: '森林' },
      { pos: 'vt.', meaning: '种植森林' }
    ],
    sentences: [
      {
        time: '00:12',
        text: 'Life was like a box of chocolates, Forrest. You never know what you\'re gonna get.',
        translation: '人生就像一盒巧克力，阿甘，你永远不知道你会得到什么。'
      },
      {
        time: '02:45',
        text: 'Forrest Gump ran across the forest for years.',
        translation: '阿甘在森林里跑了好几年。'
      }
    ],
    showDictionary: false,
    modalTop: 0,
    modalLeft: 0,
    selectedWord: '',
    wordMeanings: [
      { pos: 'n.', meaning: '森林' },
      { pos: 'vt.', meaning: '种植森林' }
    ]
  },

  onSentenceTap(e) {
    // 显示词典模态框
    const index = e.currentTarget.dataset.index;
    this.setData({
      showDictionary: true,
      selectedWord: 'forest',
      modalTop: 200,
      modalLeft: 50
    });
  },

  // 关闭词典卡片
  closeDictionary() {
    this.setData({
      showDictionary: false
    });
  },

  goToYoudao() {
    wx.navigateTo({
      url: '/pages/youdao-dictionary/youdao-dictionary'
    });
  },

  onLoad(options) {
    // 可以根据options.word加载对应单词的信息
    console.log('Word usage page loaded with word:', options.word);
  }
});