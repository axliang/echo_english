const MOCK_DATABASE = {
  test: {
    word: 'test',
    phonetics: {
      us: '[tɛst]',
      uk: '[test]'
    },
    definitions: [
      { pos: 'n.', meaning: '测验；考试；试验；检验' },
      { pos: 'v.', meaning: '测试；检验；试验' }
    ],
    examples: [
      {
        id: 'ex-137',
        sequence: 137,
        time: '00:08:42',
        show: '盗梦空间 02',
        en: 'I have a test for you.',
        zh: '我要你做个测验'
      },
      {
        id: 'ex-56',
        sequence: 56,
        time: '00:03:11',
        show: '消失的爱人 12',
        en: 'I want a paternity test.',
        zh: '我要做亲子监定'
      },
      {
        id: 'ex-80',
        sequence: 80,
        time: '00:03:41',
        show: '消失的爱人 05',
        en: 'Because our guys did a luminol test.',
        zh: '因为我们的队员做了鲁米诺测试'
      }
    ]
  },
  elephant: {
    word: 'elephant',
    phonetics: {
      us: '[ˈɛləfənt]',
      uk: '[ˈelɪfənt]'
    },
    definitions: [
      { pos: 'n.', meaning: '大象；重要人物' }
    ],
    examples: [
      {
        id: 'ex-200',
        sequence: 200,
        time: '00:00:03',
        show: 'Elephant Stories 01',
        en: 'This is an elephant.',
        zh: '这是一只大象'
      },
      {
        id: 'ex-207',
        sequence: 207,
        time: '00:00:06',
        show: 'Elephant Stories 01',
        en: 'The elephant is very large.',
        zh: '这头大象非常大'
      }
    ]
  }
};

function createHighlightSegments(text, keyword) {
  if (!keyword) {
    return [{ text, highlight: false }];
  }
  const lowerKeyword = keyword.toLowerCase();
  const parts = text.split(new RegExp(`(${keyword})`, 'ig'));
  return parts
    .filter((segment) => segment && segment.length)
    .map((segment) => ({
      text: segment,
      highlight: segment.toLowerCase() === lowerKeyword
    }));
}

Page({
  data: {
    query: '',
    searchHistory: ['test', 'elephant', 'support'],
    wordResult: null,
    exampleResults: [],
    isSearching: false
  },

  onLoad() {
    this.performMockSearch('test');
  },

  onInput(e) {
    this.setData({ query: e.detail.value });
  },

  clearInput() {
    this.setData({ query: '' });
  },

  onSearchTap() {
    const keyword = this.data.query.trim();
    if (!keyword) {
      wx.showToast({ title: '请输入要搜索的单词', icon: 'none' });
      return;
    }
    this.performMockSearch(keyword);
  },

  onHistoryTap(e) {
    const { word } = e.currentTarget.dataset;
    this.setData({ query: word });
    this.performMockSearch(word);
  },

  performMockSearch(keyword) {
    const normalized = keyword.toLowerCase();
    const dataset = MOCK_DATABASE[normalized] || this.generateFallback(normalized);
    const examples = dataset.examples.map((example) => ({
      ...example,
      segmentsEn: createHighlightSegments(example.en, dataset.word),
      segmentsZh: createHighlightSegments(example.zh, dataset.word)
    }));

    const history = this.buildHistory(dataset.word);

    this.setData({
      wordResult: {
        word: dataset.word,
        phonetics: dataset.phonetics,
        definitions: dataset.definitions
      },
      exampleResults: examples,
      searchHistory: history,
      query: dataset.word,
      isSearching: false
    });
  },

  generateFallback(keyword) {
    return {
      word: keyword || 'echoenglish',
      phonetics: {
        us: '',
        uk: ''
      },
      definitions: [
        { pos: '', meaning: '暂无该词的权威释义，敬请期待数据接入' }
      ],
      examples: []
    };
  },

  buildHistory(newWord) {
    const history = this.data.searchHistory.filter((item) => item !== newWord);
    history.unshift(newWord);
    return history.slice(0, 6);
  },

  playWordAudio() {
    const word = this.data.wordResult?.word;
    if (!word) {
      return;
    }
    try {
      const audioCtx = wx.createInnerAudioContext();
      audioCtx.src = `https://dict.youdao.com/dictvoice?type=2&audio=${encodeURIComponent(word)}`;
      audioCtx.autoplay = true;
      audioCtx.obeyMuteSwitch = false;
      audioCtx.onEnded(() => audioCtx.destroy());
      audioCtx.onError(() => audioCtx.destroy());
    } catch (err) {
      console.error('[Search] 播放发音失败', err);
    }
  }
});
