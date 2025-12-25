Page({
  data: {
    title: '',
    totalWords: 0,
    tabs: [
      { id: 'all', name: '全部' },
      { id: 'new', name: '生词' },
      { id: 'high', name: '1000高频词' },
      { id: 'ket', name: 'KET' },
      { id: 'pet', name: 'PET' },
      { id: 'middle', name: '初中' },
      { id: 'highschool', name: '高中' },
      { id: 'cet4', name: '四级' },
      { id: 'cet6', name: '六级' },
      { id: 'kaoyan', name: '考研' },
      { id: 'tef8', name: '专八' },
      { id: 'ielts', name: '雅思' },
      { id: 'toefl', name: '托福' },
      { id: 'gre', name: 'GRE' }
    ],
    currentTab: 'all',
    words: [],
    isLoading: true,
    page: 1,
    limit: 10,
    hasMore: true,
    isFavoritePage: false
  },

  onLoad(options) {
    console.log('[VocabularyList] 页面加载，参数:', options);
    
    if (options.type === 'favorite') {
      this.setData({ 
        isFavoritePage: true,
        title: options.title || '生词'
      });
      wx.setNavigationBarTitle({ title: this.data.title });
      return;
    }

    const app = getApp();
    const vocabularyData = app.globalData.vocabularyData;
    
    if (vocabularyData && vocabularyData.words && vocabularyData.words.length > 0) {
      const title = vocabularyData.title || '字幕词汇';
      wx.setNavigationBarTitle({ title: title });
      this.setData({
        title: title,
        words: vocabularyData.words,
        allWords: vocabularyData.words,
        totalWords: vocabularyData.words.length,
        isLoading: false,
        isFavoritePage: false
      });
      app.globalData.vocabularyData = null;
      return;
    }
    
    const title = options.title || '字幕词汇';
    wx.setNavigationBarTitle({ title: title });
    
    if (options.words) {
      try {
        const words = JSON.parse(decodeURIComponent(options.words));
        this.setData({
          title: title,
          words: words,
          allWords: words,
          totalWords: words.length,
          isLoading: false,
          isFavoritePage: false
        });
      } catch (error) {
        console.error('[VocabularyList] 解析词汇数据失败:', error);
        this.setData({ isLoading: false });
      }
    } else {
      this.loadMockData();
    }
  },

  onShow() {
    if (this.data.isFavoritePage) {
      this.fetchFavoriteWords(true);
    }
  },

  getUserId() {
    const userInfo = wx.getStorageSync('userInfo');
    return userInfo ? (userInfo.user_id || userInfo.id || 1) : 1;
  },

  fetchFavoriteWords(isFirstPage = false) {
    if (this.data.isLoading && !isFirstPage) return;
    if (!this.data.hasMore && !isFirstPage) return;

    const page = isFirstPage ? 1 : this.data.page;
    const user_id = this.getUserId();

    this.setData({ isLoading: true });

    wx.request({
      url: `https://danci.hub123.cn/admin/openApi/word_favorite_api.php`,
      data: {
        user_id,
        page,
        limit: this.data.limit
      },
      method: 'GET',
      success: (res) => {
        if (res.data && res.data.status === 'success') {
          const newWords = res.data.data || [];
          const words = isFirstPage ? newWords : this.data.words.concat(newWords);
          this.setData({
            words,
            totalWords: res.data.total || words.length,
            page: page + 1,
            hasMore: newWords.length === this.data.limit,
            isLoading: false
          });
        } else {
          this.setData({ isLoading: false });
          wx.showToast({ title: '加载失败', icon: 'none' });
        }
      },
      fail: () => {
        this.setData({ isLoading: false });
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  onReachBottom() {
    if (this.data.isFavoritePage) {
      this.fetchFavoriteWords();
    }
  },

  onTabChange(e) {
    const tabId = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tabId });
    this.filterWordsByTab(tabId);
  },

  filterWordsByTab(tabId) {
    const allWords = this.data.allWords || this.data.words;
    let filteredWords = [];
    switch (tabId) {
      case 'all':
        filteredWords = allWords;
        break;
      case 'new':
        filteredWords = allWords.filter(word => word.frequency < 5);
        break;
      case 'high':
        filteredWords = allWords.filter(word => word.frequency > 10);
        break;
      default:
        filteredWords = allWords.filter(word => 
          word.tags && word.tags.includes(tabId)
        );
    }
    this.setData({
      words: filteredWords,
      totalWords: filteredWords.length
    });
  },

  playWord(e) {
    const word = e.currentTarget.dataset.word;
    if (wx.speechSynthesis && wx.speechSynthesis.speak) {
      wx.speechSynthesis.speak({
        text: word,
        lang: 'en-US',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0
      });
    } else {
      const innerAudioContext = wx.createInnerAudioContext();
      innerAudioContext.autoplay = true;
      innerAudioContext.src = `https://dict.youdao.com/dictvoice?type=2&audio=${encodeURIComponent(word)}`;
      innerAudioContext.onEnded(() => innerAudioContext.destroy());
      innerAudioContext.onError(() => innerAudioContext.destroy());
    }
  },

  viewWordDetail(e) {
    const word = e.currentTarget.dataset.word;
    wx.navigateTo({
      url: `/pages/word-usage/word-usage?word=${encodeURIComponent(word)}&title=单词详情`
    });
  },

  loadMockData() {
    const mockWords = [
      { word: 'cross', frequency: 10, meaning: 'n. 交叉，十字；十字架，十字形物\nvi. 交叉；杂交；横过...', create_time: '2025-12-24' },
      { word: 'group', frequency: 8, meaning: 'n. 组；团体\nadj. 群的；团体的...', create_time: '2025-12-24' },
      { word: 'professor', frequency: 5, meaning: 'n. 教授；教师；公开表示信仰的人', create_time: '2025-12-23' }
    ];
    this.setData({
      title: '生词',
      words: mockWords,
      allWords: mockWords,
      totalWords: mockWords.length,
      isLoading: false
    });
  }
});