// 播放器页面
Page({
  data: {
    lyrics: [],
    currentIndex: 0,
    currentLyricId: '',
    scrollTop: 0,
    isPlaying: false,
    currentTime: '00:00',
    totalTime: '00:00',
    currentPosition: 0,
    duration: 0,
    showSubtitle: true,
    playSpeed: 1.0,
    errorMessage: '',
    showDictionary: false,
    selectedWord: '',
    modalTop: 0,
    modalLeft: 0,
    dictionaryPhonetics: {
      us: '[spoʊkən]',
      uk: '[ˈspəʊkən]'
    },
    dictionaryDefinitions: [
      { pos: '', meaning: '词汇释义暂缺，请查看「更多」' }
    ],
    showDebug: false,
    subtitleMode: 'dual',
    subtitleModeLabel: '双语',
    isFavorited: false
  },

  getUserId() {
    const userInfo = wx.getStorageSync('userInfo');
    return userInfo ? (userInfo.user_id || userInfo.id || 1) : 1;
  },

  checkFavoriteStatus(word) {
    if (!word) return;
    const user_id = this.getUserId();
    wx.request({
      url: `https://danci.hub123.cn/admin/openApi/word_favorite_api.php?user_id=${user_id}&word=${word}`,
      method: 'GET',
      success: (res) => {
        if (res.data && res.data.status === 'success') {
          this.setData({ isFavorited: !!res.data.favorited });
        }
      }
    });
  },

  toggleFavorite() {
    const word = this.data.selectedWord;
    if (!word) return;
    const user_id = this.getUserId();
    const isFavorited = this.data.isFavorited;
    const method = isFavorited ? 'DELETE' : 'POST';

    wx.request({
      url: 'https://danci.hub123.cn/admin/openApi/word_favorite_api.php',
      method: method,
      data: { user_id, word },
      header: { 'content-type': 'application/json' },
      success: (res) => {
        if (res.data && res.data.status === 'success') {
          this.setData({ isFavorited: !!res.data.favorited });
          wx.showToast({
            title: res.data.favorited ? '已收藏' : '已取消收藏',
            icon: 'success'
          });
        }
      }
    });
  },

  onLoad(options) {
    console.log('[Player] 页面加载，参数:', options);
    this.lyrics = [];
    this.scrollIntoView = '';
    
    // 保存传递的参数，并进行URL解码
    this.audioUrl = options.audioUrl ? decodeURIComponent(options.audioUrl) : null;
    this.srtUrl = options.srtUrl ? decodeURIComponent(options.srtUrl) : null;
    this.bookId = options.bookId || '';
    this.pageTitle = options.title ? decodeURIComponent(options.title) : '字幕词汇';
    
    console.log('[Player] 解码后的音频URL:', this.audioUrl);
    console.log('[Player] 解码后的字幕URL:', this.srtUrl);
    console.log('[Player] 关联的bookId:', this.bookId);
    
    // 延迟加载字幕确保界面初始化完成
    setTimeout(() => {
      // 修复：调用从网络加载字幕的函数
      this.loadSubtitles();
      
      // 加载音频文件
      this.loadAudio();
    }, 500);
  },

  // 视频播放事件处理
  onPlay() {
    console.log('[Video] 视频开始播放');
    this.setData({ isPlaying: true });
    this.startProgressUpdate();
  },
  
  // 视频暂停事件处理
  onPause() {
    console.log('[Video] 视频暂停');
    this.setData({ isPlaying: false });
    this.stopProgressUpdate();
  },
  
  // 视频播放结束事件处理
  onEnded() {
    console.log('[Video] 视频播放结束');
    this.setData({ isPlaying: false, currentPosition: 0 });
    this.stopProgressUpdate();
  },
  
  // 视频播放错误事件处理
  onError(e) {
    console.error('[Video] 视频播放错误:', e);
    this.setData({
      errorMessage: '视频播放错误: ' + e.detail.errMsg
    });
  },
  
  // 视频播放时间更新事件处理
  onTimeUpdate(e) {
    // console.log('[Video] 时间更新:', e.detail.currentTime, '/', e.detail.duration);
    this.updateProgress(e.detail.currentTime, e.detail.duration);
  },

  // 单词点击事件处理 - 跳转整本字幕词汇页
  onWordTap(e) {
    console.log('[Player] 单词被点击:', e.currentTarget.dataset.word);
    console.log('[Player] 事件数据:', e.currentTarget.dataset);

    if (this.bookId) {
      wx.navigateTo({
        url: `/pages/book-vocabulary/book-vocabulary?bookId=${this.bookId}&title=${encodeURIComponent(this.pageTitle || '字幕词汇')}`
      });
      return;
    }

    // 无bookId时回退到当前字幕词频列表
    try {
      let wordFrequencyMap = this.extractWordFrequency();
      if (wordFrequencyMap.size === 0) {
        wordFrequencyMap = this.getMockWordFrequency();
      }
      const sortedWords = this.sortWordsByFrequency(wordFrequencyMap);
      this.navigateToVocabularyList(sortedWords);
    } catch (error) {
      console.error('[Player] 处理单词点击事件失败:', error);
      wx.showToast({
        title: '处理失败，请稍后重试',
        icon: 'none'
      });
    }
  },

  loadSubtitles() {
    // 从网络地址加载SRT字幕文件
    console.log('[Player] 从网络加载SRT字幕文件');
    
    const srtUrl = this.srtUrl;
    
    // 如果没有字幕URL，跳过字幕加载
    if (!srtUrl) {
      console.log('[Player] 没有提供字幕URL，跳过字幕加载');
      return;
    }
    
    try {
      // 使用wx.request请求网络SRT文件
      wx.request({
        url: srtUrl,
        method: 'GET',
        responseType: 'text',
        success: (res) => {
          console.log('[Player] SRT文件下载成功，HTTP状态码:', res.statusCode);
          
          // 解析SRT内容并转换为歌词格式
          const lyrics = this.parseSRT(res.data);
          console.log('[Player] 解析完成的歌词数量:', lyrics.length);
          if (lyrics.length > 0) {
            const sample = lyrics.slice(0, 3).map(item => ({
              en: item.en,
              zh: item.zh,
              startTime: item.startTime,
              endTime: item.endTime
            }));
            console.log('[Player] 字幕示例数据:', sample);
          }
          
          // 计算总时长
          const totalDuration = lyrics.length > 0 ? lyrics[lyrics.length - 1].endTime : 0;
          
          // 保存歌词到data
          this.lyrics = lyrics;
          
          // 确保showSubtitle为true
          if (!this.data.showSubtitle) {
            this.setData({ showSubtitle: true });
          }
          
          this.setData({
            lyrics: lyrics,
            duration: totalDuration
          }, () => {
            console.log('[Player] 字幕数据已设置完成');
            // 手动触发一次歌词更新
            this.updateCurrentLyric(0);
          });
        },
        fail: (err) => {
          console.error('[Player] SRT文件下载失败:', err);
          this.setData({
            errorMessage: '字幕文件加载失败: ' + err.errMsg
          });
        },
        complete: () => {
          console.log('[Player] 字幕加载请求完成');
        }
      });
    } catch (error) {
      console.error('[Player] 字幕加载异常:', error);
      this.setData({
        errorMessage: '字幕加载异常: ' + error.message
      });
    }
  },

  // 强制刷新界面
  forceUpdate() {
    console.log('[Player] 强制刷新界面');
    this.setData({
      showSubtitle: this.data.showSubtitle
    });
  },

  // 解析SRT格式内容，转换为歌词格式
  parseSRT(srtContent) {
    // console.log('[Player] 开始解析SRT内容');
    const lyrics = [];
    const chineseCharRegex = /[\u4e00-\u9fff]/;
    
    // 处理不同的换行符格式
    const normalizedContent = srtContent.replace(/\r\n/g, '\n');
    
    // 将SRT内容按空行分割为字幕块
    const blocks = normalizedContent.split('\n\n').filter(block => block.trim() !== '');
    
    blocks.forEach((block, index) => {
      try {
        const lines = block.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length < 2) {
          return;
        }
        
        // 解析时间格式: HH:MM:SS,mmm --> HH:MM:SS,mmm
        let timeLineIndex = 1;
        let textIndex = 2;
        
        // 如果第一行是数字序号，使用标准格式
        if (/^\d+$/.test(lines[0].trim())) {
          timeLineIndex = 1;
          textIndex = 2;
        } else {
          // 否则，可能是没有序号的格式
          timeLineIndex = 0;
          textIndex = 1;
        }
        
        const timeLine = lines[timeLineIndex]; // 时间轴行
        const timeParts = timeLine.split(' --> ');
        
        if (timeParts.length !== 2) {
          return;
        }
        
        const startTime = this.parseSRTTime(timeParts[0]);
        const endTime = this.parseSRTTime(timeParts[1]);
        
        const textLines = lines
          .slice(textIndex)
          .map(line => line.replace(/\ufeff/g, '').trim())
          .filter(line => line !== '');
        
        let enText = textLines[0] || '';
        let zhText = textLines[1] || '';
        
        if (!zhText && textLines.length > 1) {
          const zhCandidate = textLines.slice(1).find(line => chineseCharRegex.test(line));
          if (zhCandidate) {
            zhText = zhCandidate;
          }
        }
        
        if (!enText) {
          const enCandidate = textLines.find(line => !chineseCharRegex.test(line));
          if (enCandidate) {
            enText = enCandidate;
          }
        }
        
        if (!zhText && chineseCharRegex.test(enText)) {
          zhText = enText;
          enText = '';
        }
        
        if (enText && startTime !== null && endTime !== null) {
          const words = enText.split(/\s+/).filter(word => word.trim() !== '');
          // 将SRT字幕转换为歌词格式
          const lyricItem = {
            startTime,
            endTime,
            en: enText,
            zh: zhText,
            words
          };
          lyrics.push(lyricItem);
        }
      } catch (error) {
        console.error('[Player] 解析字幕块', index + 1, '失败:', error);
      }
    });
    
    return lyrics;
  },
  
  // 将SRT时间格式转换为秒数
  parseSRTTime(timeStr) {
    try {
      // 格式: HH:MM:SS,mmm 或 MM:SS,mmm
      const parts = timeStr.trim().replace(',', '.').split(':');
      if (parts.length < 2) return null;
      
      let hours = 0;
      let minutes = 0;
      let seconds = 0;
      
      if (parts.length === 3) {
        // HH:MM:SS,mmm 格式
        hours = parseInt(parts[0]) || 0;
        minutes = parseInt(parts[1]) || 0;
        seconds = parseFloat(parts[2]) || 0;
      } else if (parts.length === 2) {
        // MM:SS,mmm 格式
        minutes = parseInt(parts[0]) || 0;
        seconds = parseFloat(parts[1]) || 0;
      }
      
      return hours * 3600 + minutes * 60 + seconds;
    } catch (error) {
      console.error('[Player] 时间格式解析失败:', timeStr, error);
      return null;
    }
  },

  // 从字幕中提取所有单词并统计频率
  extractWordFrequency() {
    const wordMap = new Map();
    
    // 遍历所有歌词
    this.lyrics.forEach(lyric => {
      if (lyric.en) {
        // 提取英文歌词中的单词
        let words = [];
        
        if (lyric.words && lyric.words.length > 0) {
          // 如果已经有单词数组，直接使用
          words = lyric.words;
        } else {
          // 否则，从英文文本中提取单词
          words = lyric.en.split(/\s+/).filter(word => word.trim() !== '');
        }
        
        // 统计单词频率
        words.forEach(word => {
          // 清除标点符号
          const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
          if (cleanWord === '') return;
          
          const count = wordMap.get(cleanWord) || 0;
          wordMap.set(cleanWord, count + 1);
        });
      }
    });
    
    return wordMap;
  },

  // 生成模拟单词频率数据
  getMockWordFrequency() {
    const wordMap = new Map();
    
    // 常用英语单词及其模拟频率
    const mockWords = [
      { word: 'the', frequency: 35 },
      { word: 'and', frequency: 28 },
      { word: 'is', frequency: 22 },
      { word: 'to', frequency: 20 },
      { word: 'of', frequency: 18 },
      { word: 'in', frequency: 15 },
      { word: 'that', frequency: 12 },
      { word: 'it', frequency: 10 },
      { word: 'for', frequency: 9 },
      { word: 'with', frequency: 8 },
      { word: 'as', frequency: 7 },
      { word: 'on', frequency: 6 },
      { word: 'at', frequency: 5 },
      { word: 'by', frequency: 4 },
      { word: 'this', frequency: 4 },
      { word: 'but', frequency: 3 },
      { word: 'not', frequency: 3 },
      { word: 'what', frequency: 3 },
      { word: 'all', frequency: 3 },
      { word: 'be', frequency: 2 },
      { word: 'he', frequency: 2 },
      { word: 'she', frequency: 2 },
      { word: 'they', frequency: 2 },
      { word: 'we', frequency: 2 }
    ];
    
    // 将模拟数据添加到Map中
    mockWords.forEach(item => {
      wordMap.set(item.word, item.frequency);
    });
    
    return wordMap;
  },

  // 按频率从高到低排序单词
  sortWordsByFrequency(wordMap) {
    const words = [];
    
    // 转换Map为数组
    wordMap.forEach((frequency, word) => {
      words.push({
        word: word,
        frequency: frequency,
        meaning: '' // 单词释义，这里可以根据需要添加实际释义
      });
    });
    
    // 按频率从高到低排序
    words.sort((a, b) => b.frequency - a.frequency);
    
    return words;
  },

  // 跳转到词汇列表页面
  navigateToVocabularyList(words) {
    if (words.length === 0) {
      wx.showToast({
        title: '没有可显示的词汇',
        icon: 'none'
      });
      return;
    }
    
    // 导航到词汇列表页面
    wx.navigateTo({
      url: `/pages/vocabulary-detail/vocabulary-detail?words=${encodeURIComponent(JSON.stringify(words))}&title=字幕词汇`
    });
  },

  updateProgress(currentTime, duration) {
    const currentPosition = currentTime || 0;
    const totalDuration = duration || this.data.duration;
    
    // 降低setData频率，仅当秒数变化显示时更新UI
    // 注意：这里保留currentPosition的精确值用于逻辑判断，但currentTime仅用于显示
    this.setData({
      currentPosition: currentPosition,
      currentTime: this.formatTime(currentPosition),
      duration: totalDuration,
      totalTime: this.formatTime(totalDuration)
    });
    
    // 更新当前播放的歌词
    this.updateCurrentLyric(currentPosition);
  },
  
  startProgressUpdate() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
    }
    // 视频元素会自动触发onTimeUpdate事件，不需要定时器
    console.log('[Player] 开始进度更新');
  },

  stopProgressUpdate() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    console.log('[Player] 停止进度更新');
  },

  // 切换播放状态
  togglePlay() {
    console.log('[Player] 切换播放状态');
    
    const videoContext = wx.createVideoContext('audioPlayer');
    if (this.data.isPlaying) {
      videoContext.pause();
    } else {
      videoContext.play();
    }
  },

  // 快退15秒
  seekBackward() {
    console.log('[Player] 快退15秒');
    
    const newPosition = Math.max(0, this.data.currentPosition - 15);
    const videoContext = wx.createVideoContext('audioPlayer');
    videoContext.seek(newPosition);
    this.setData({
      currentPosition: newPosition
    });
  },

  // 快进15秒
  seekForward() {
    console.log('[Player] 快进15秒');
    
    const newPosition = Math.min(this.data.duration, this.data.currentPosition + 15);
    const videoContext = wx.createVideoContext('audioPlayer');
    videoContext.seek(newPosition);
    this.setData({
      currentPosition: newPosition
    });
  },

  // 进度条拖拽中
  onSliderChanging(e) {
    this.setData({
      currentPosition: e.detail.value,
      currentTime: this.formatTime(e.detail.value)
    });
  },

  // 进度条拖拽完成
  onSliderChange(e) {
    console.log('[Player] 进度条拖拽完成:', e.detail.value);
    
    const position = e.detail.value;
    const videoContext = wx.createVideoContext('audioPlayer');
    videoContext.seek(position);
    this.setData({
      currentPosition: position,
      currentTime: this.formatTime(position)
    });
  },

  toggleSubtitle() {
    console.log('[Player] 切换字幕显示状态');
    this.setData({
      showSubtitle: !this.data.showSubtitle
    });
  },

  getSubtitleModeLabel(mode) {
    switch (mode) {
      case 'en':
        return '英文';
      case 'zh':
        return '中文';
      default:
        return '双语';
    }
  },

  cycleSubtitleMode() {
    const modes = ['dual', 'en', 'zh'];
    const currentIndex = modes.indexOf(this.data.subtitleMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    this.setData({
      subtitleMode: nextMode,
      subtitleModeLabel: this.getSubtitleModeLabel(nextMode)
    });
  },

  changeSpeed() {
    console.log('[Player] 切换播放速度');
    
    let speed = this.data.playSpeed;
    if (speed === 1.0) {
      speed = 1.25;
    } else if (speed === 1.25) {
      speed = 1.5;
    } else if (speed === 1.5) {
      speed = 2.0;
    } else {
      speed = 1.0;
    }
    
    if (this.audioContext) {
      this.audioContext.playbackRate = speed;
    }
    
    this.setData({
      playSpeed: speed
    });
  },

  loadAudio() {
    console.log('[Player] 加载音频');
    
    // 从网络地址加载音频文件，使用传递的URL
    const audioUrl = this.audioUrl;
    // const videoContext = wx.createVideoContext('audioPlayer'); // 不需要在此处创建上下文，只要WXML绑定了src即可
    
    console.log('[Player] 音频文件已设置为:', audioUrl);
    
    // 设置音频URL到data中
    this.setData({
      audioUrl: audioUrl
    });
  },
  
  // 测试直接加载本地SRT文件
  testLoadLocalSRT() {
    // 此函数暂时保留，但不在onLoad中调用
    console.log('[Player] 仅供调试：测试加载本地SRT文件');
  },

  loadLyrics() {
    // 模拟数据加载，暂不使用
  },

  loadTestLyrics() {
    // 测试数据加载，暂不使用
  },

  updateCurrentLyric(currentTime) {
    const lyrics = this.data.lyrics;
    let currentIndex = 0;
    
    if (!lyrics || lyrics.length === 0) {
      return;
    }
    
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].startTime && currentTime <= lyrics[i].endTime) {
        currentIndex = i;
        break;
      }
      if (currentTime > lyrics[i].endTime) {
        currentIndex = i;
      }
    }
    
    // 性能优化关键：只有当歌词索引发生变化时才更新界面和滚动
    // 避免在onTimeUpdate的高频回调中频繁调用setData和createSelectorQuery
    if (currentIndex === this.data.currentIndex) {
      return;
    }
    
    console.log('[Lyric] 切换歌词索引:', currentIndex, '英文:', lyrics[currentIndex]?.en, '中文:', lyrics[currentIndex]?.zh);

    this.setData({
      currentIndex: currentIndex,
      // 使用 currentLyricId 配合 scroll-into-view 是小程序最推荐的滚动方式
      currentLyricId: `lyric-${currentIndex}`
    });
    
    // 计算滚动位置作为 scroll-into-view 的备选方案
    this.scrollToCurrentLyric(currentIndex);
  },

  scrollToCurrentLyric(index) {
    const query = wx.createSelectorQuery().in(this);
    query.select(`#lyric-${index}`).boundingClientRect();
    query.select('.lyrics-container').boundingClientRect();
    query.select('.lyrics-container').scrollOffset();
    query.select('.player-controls').boundingClientRect();
    
    query.exec((res) => {
      if (res && res[0] && res[1] && res[2]) {
        const currentLyricRect = res[0];
        const lyricsContainerRect = res[1];
        const scrollOffset = res[2];
        const controlsRect = res[3];
        const controlsHeight = controlsRect ? controlsRect.height : 0;
        const currentScrollTop = scrollOffset.scrollTop || 0;
        const offsetTop = currentLyricRect.top - lyricsContainerRect.top;
        const visibleHeight = (lyricsContainerRect.height || 0) - controlsHeight;
        const usableHeight = visibleHeight > 0 ? visibleHeight : lyricsContainerRect.height;
        const targetScrollTop = currentScrollTop + offsetTop - (usableHeight / 2) + (currentLyricRect.height / 2);
        
        this.setData({
          scrollTop: targetScrollTop > 0 ? targetScrollTop : 0
        });
      }
    });
  },

  // 显示单词词典卡片
  showWordDictionary(e) {
    this.togglePlay();

    const selectedWord = e.currentTarget.dataset.word || '';

    this.setData({
      showDictionary: true,
      selectedWord,
      modalTop: 200,
      modalLeft: 50,
      dictionaryDefinitions: [{ pos: '', meaning: '词汇释义加载中…' }]
    });

    this.speakWord(selectedWord);
    this.fetchWordDefinition(selectedWord);
  },

  // 关闭词典卡片
  closeDictionary() {
    this.setData({
      showDictionary: false
    });
  },

  // 单词语音合成功能
  speakWord(word) {
    console.log('[Player] 开始发音:', word);
    
    if (wx.speechSynthesis && wx.speechSynthesis.speak) {
      wx.speechSynthesis.speak({
        text: word,
        lang: 'en-US',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        success: () => {
          console.log('[Player] 发音成功');
        },
        fail: (err) => {
          console.error('[Player] 发音失败:', err);
          this.playWordAudio(word);
        }
      });
    } else {
      this.playWordAudio(word);
    }
  },

  // 备选方案：播放单词音频文件
  playWordAudio(word) {
    try {
      const normalizedWord = (word || '').trim();
      if (!normalizedWord) {
        return;
      }

      const wordAudioContext = wx.createInnerAudioContext();
      if (!wordAudioContext) return;
      
      const audioUrl = `https://dict.youdao.com/dictvoice?type=2&audio=${encodeURIComponent(normalizedWord)}`;
      wordAudioContext.src = audioUrl;
      wordAudioContext.obeyMuteSwitch = false;
      wordAudioContext.autoplay = true;
      
      wordAudioContext.onEnded(() => {
        wordAudioContext.destroy();
      });
      
      wordAudioContext.onError((err) => {
        console.error('[Player] 播放单词音频失败:', err);
        wordAudioContext.destroy();
      });
    } catch (err) {
      console.error('[Player] 播放单词音频异常:', err);
    }
  },

  goToYoudao() {
    wx.navigateTo({
      url: '/pages/youdao-dictionary/youdao-dictionary'
    });
  },

  fetchWordDefinition(word) {
    const normalizedWord = (word || '').replace(/[^a-zA-Z\-']/g, '').toLowerCase();
    if (!normalizedWord) {
      return;
    }

    const extractTexts = (node) => {
      if (!node) {
        return [];
      }
      if (typeof node === 'string') {
        return [node];
      }
      if (Array.isArray(node)) {
        return node.reduce((acc, item) => acc.concat(extractTexts(item)), []);
      }
      if (typeof node === 'object') {
        let collected = [];
        ['tran', 'l', 'i', '_', '#text', 'text'].forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(node, key)) {
            collected = collected.concat(extractTexts(node[key]));
          }
        });
        return collected;
      }
      return [];
    };

    wx.request({
      url: 'https://dict.youdao.com/jsonapi',
      method: 'GET',
      data: {
        q: normalizedWord,
        dicts: JSON.stringify({ count: 1, dicts: [['ec']] }),
        client: 'wechat-miniprogram',
        keyfrom: 'echoenglish'
      },
      success: (res) => {
        const wordEntry = res.data && res.data.ec && res.data.ec.word && res.data.ec.word[0];
        if (!wordEntry) {
          console.warn('[Player] 未获取到词条:', normalizedWord);
          return;
        }

        const phonetics = {
          us: wordEntry.usphone ? `[${wordEntry.usphone}]` : this.data.dictionaryPhonetics.us,
          uk: wordEntry.ukphone ? `[${wordEntry.ukphone}]` : this.data.dictionaryPhonetics.uk
        };

        const definitions = (wordEntry.trs || [])
          .map((item) => {
            const meaningTexts = extractTexts(item.tr);
            const meaning = meaningTexts.join('').replace(/\s+/g, ' ').trim();
            if (!meaning) {
              return null;
            }
            return {
              pos: item.pos || '',
              meaning
            };
          })
          .filter((definition) => definition);

        const normalizedDefinitions = definitions.length
          ? definitions
          : [{ pos: '', meaning: '词汇释义暂缺，请查看「更多」' }];

        this.setData({
          dictionaryPhonetics: phonetics,
          dictionaryDefinitions: normalizedDefinitions
        });
        this.checkFavoriteStatus(normalizedWord);
      },
      fail: (err) => {
        console.error('[Player] 在线词典请求失败:', err);
        this.setData({
          dictionaryDefinitions: [{ pos: '', meaning: '词汇释义加载失败，请稍后重试' }]
        });
      }
    });
  },

  // 手动测试按钮：切换到下一行歌词
  nextLyric() {
    const nextIndex = (this.data.currentIndex + 1) % this.data.lyrics.length;
    this.setData({
      currentIndex: nextIndex
    });
    this.scrollToCurrentLyric(nextIndex);
  },

  // 手动测试按钮：显示/隐藏字幕
  toggleSubtitleVisibility() {
    this.setData({
      showSubtitle: !this.data.showSubtitle
    });
  },

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  closeBanner() {
    this.setData({
      showBanner: false
    });
  },

  goBack() {
    wx.navigateBack();
  },

  toggleDebug() {
    this.setData({
      showDebug: !this.data.showDebug
    });
  },

  onUnload() {
    console.log('[Player] 页面卸载');
    // 清理资源
    const videoContext = wx.createVideoContext('audioPlayer');
    videoContext.stop();
    this.stopProgressUpdate();
  }
});