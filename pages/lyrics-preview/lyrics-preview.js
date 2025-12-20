Page({
  data: {
    lyrics: [],
    displayedLyrics: [], // 当前显示的歌词（分页）
    currentPage: 0,
    pageSize: 50, // 每页显示50行
    totalPages: 0,
    isLoading: true,
    errorMessage: '',
    showDictionary: false,
    selectedWord: '',
    dictionaryTabs: [
      { key: 'junior', label: '初中' },
      { key: 'senior', label: '高中' },
      { key: 'cet4', label: 'CET4' },
      { key: 'cet6', label: 'CET6' },
      { key: 'kaoyan', label: '考研' }
    ],
    activeDictionaryTab: 'cet4',
    dictionaryPhonetics: {
      us: '[spoʊkən]',
      uk: '[ˈspəʊkən]'
    },
    dictionaryDefinitions: [],
    dictionaryPosition: {
      top: 240,
      left: 40,
      width: 320
    },
    wordLibrary: {
      spoken: {
        phonetics: { us: '[spoʊkən]', uk: '[ˈspəʊkən]' },
        definitions: [
          { pos: 'v.', meaning: '说话；谈论；会说（某种语言）' },
          { pos: 'adj.', meaning: '以某种方式说话的；口头的' }
        ]
      },
      support: {
        phonetics: { us: '[səˈpɔrt]', uk: '[səˈpɔːt]' },
        definitions: [
          { pos: 'vt.', meaning: '支持；鼓励；支撑' },
          { pos: 'n.', meaning: '支持；支撑；后援' }
        ]
      },
      initiatives: {
        phonetics: { us: '[ɪˈnɪʃətɪvz]', uk: '[ɪˈnɪʃətɪvz]' },
        definitions: [
          { pos: 'n.', meaning: '倡议；新方案；主动权' }
        ]
      },
      default: {
        phonetics: { us: '[wɜːrd]', uk: '[wɜːd]' },
        definitions: [
          { pos: 'n.', meaning: '词汇释义暂缺，请查看「更多」' }
        ]
      }
    }
  },

  onLoad(options) {
    console.log('[LyricsPreview] 页面加载，参数:', options);
    this.bookId = options.bookId;
    console.log('[LyricsPreview] 获取到的bookId:', this.bookId);
    this.loadAllSubtitles();
  },

  loadAllSubtitles() {
    console.log('[LyricsPreview] 开始加载所有字幕，bookId:', this.bookId);
    
    if (!this.bookId) {
      console.error('[LyricsPreview] 缺少书籍ID参数');
      this.setData({
        isLoading: false,
        errorMessage: '缺少书籍ID参数'
      });
      return;
    }

    // 获取所有课程数据
    wx.request({
      url: `https://danci.hub123.cn/admin/openApi/get_courses_by_book.php?book_id=${this.bookId}`,
      method: 'GET',
      success: (res) => {
        console.log('[LyricsPreview] 课程API响应:', res);
        console.log('[LyricsPreview] 课程数据状态:', res.data.status);
        console.log('[LyricsPreview] 课程数据数量:', res.data.data ? res.data.data.length : 0);
        
        if (res.data.status === 'success' && res.data.data) {
          // 按名称排序
          const sortedCourses = res.data.data.sort((a, b) => a.title.localeCompare(b.title));
          console.log('[LyricsPreview] 排序后的课程列表:', sortedCourses.map(c => ({title: c.title, srt: c.srt_file_path})));
          this.loadSubtitlesSequentially(sortedCourses);
        } else {
          console.error('[LyricsPreview] 获取课程数据失败:', res.data.message);
          this.setData({
            isLoading: false,
            errorMessage: '获取课程数据失败'
          });
        }
      },
      fail: (err) => {
        console.error('[LyricsPreview] 网络请求失败:', err);
        this.setData({
          isLoading: false,
          errorMessage: '网络请求失败: ' + err.errMsg
        });
      }
    });
  },

  loadSubtitlesSequentially(courses) {
    console.log('[LyricsPreview] 开始顺序加载字幕，课程数量:', courses.length);
    
    let allLyrics = [];
    let currentIndex = 0;

    const loadNextSubtitle = () => {
      console.log(`[LyricsPreview] 加载第${currentIndex + 1}个字幕，总共${courses.length}个`);
      
      if (currentIndex >= courses.length) {
        // 所有字幕加载完成
        console.log('[LyricsPreview] 所有字幕加载完成，总歌词数:', allLyrics.length);
        console.log('[LyricsPreview] 前10行歌词详细信息:');
        allLyrics.slice(0, 10).forEach((lyric, index) => {
          console.log(`[LyricsPreview] 第${index + 1}行:`, {
            index: lyric.index,
            time: lyric.time,
            en: lyric.en,
            zh: lyric.zh,
            words: lyric.words,
            isTitle: lyric.isTitle
          });
        });
        
        // 计算总页数
        const totalPages = Math.ceil(allLyrics.length / this.data.pageSize);
        
        this.setData({
          lyrics: allLyrics,
          displayedLyrics: allLyrics.slice(0, this.data.pageSize), // 只显示第一页
          totalPages: totalPages,
          isLoading: false,
          errorMessage: allLyrics.length ? '' : '暂未获取到字幕内容'
        }, () => {
          console.log('[LyricsPreview] setData完成，当前显示歌词数:', this.data.displayedLyrics.length);
          console.log('[LyricsPreview] 页面数据状态:', {
            isLoading: this.data.isLoading,
            errorMessage: this.data.errorMessage,
            totalLyrics: this.data.lyrics.length,
            displayedLyrics: this.data.displayedLyrics.length,
            totalPages: this.data.totalPages
          });
        });
        return;
      }

      const course = courses[currentIndex];
      console.log(`[LyricsPreview] 当前课程: ${course.title}, 字幕URL: ${course.srt_file_path}`);
      
      if (!course.srt_file_path) {
        // 没有字幕文件，跳过
        console.log(`[LyricsPreview] 跳过课程 ${course.title}，无字幕文件`);
        currentIndex++;
        loadNextSubtitle();
        return;
      }

      wx.request({
        url: course.srt_file_path,
        method: 'GET',
        responseType: 'text',
        success: (res) => {
          console.log(`[LyricsPreview] 字幕加载成功: ${course.title}, 响应长度:`, res.data ? res.data.length : 0);
          const lyrics = this.parseSRT(res.data);
          console.log(`[LyricsPreview] 解析出歌词数: ${lyrics.length}`);
          
          // 添加课程标题作为分隔
          if (lyrics.length > 0) {
            allLyrics.push({
              index: allLyrics.length + 1,
              time: '00:00',
              en: `--- ${course.title} ---`,
              zh: '',
              words: [],
              isTitle: true
            });
          }
          
          // 添加字幕内容
          allLyrics = allLyrics.concat(lyrics);
          currentIndex++;
          loadNextSubtitle();
        },
        fail: (err) => {
          console.error(`[LyricsPreview] 加载字幕失败: ${course.title}`, err);
          currentIndex++;
          loadNextSubtitle();
        }
      });
    };

    loadNextSubtitle();
  },

  parseSRT(srtContent) {
    const lyrics = [];
    const chineseRegex = /[\u4e00-\u9fff]/;
    const normalizedContent = srtContent.replace(/\r\n/g, '\n');
    const blocks = normalizedContent.split('\n\n').filter((block) => block.trim() !== '');

    blocks.forEach((block) => {
      try {
        const lines = block.split('\n').filter((line) => line.trim() !== '');
        if (lines.length < 2) {
          return;
        }

        let timeLineIndex = 1;
        let textIndex = 2;
        if (!/^\d+$/.test(lines[0].trim())) {
          timeLineIndex = 0;
          textIndex = 1;
        }

        const timeLine = lines[timeLineIndex];
        const timeParts = timeLine.split(' --> ');
        if (timeParts.length !== 2) {
          return;
        }

        const startTime = this.parseSRTTime(timeParts[0]);
        const textLines = lines
          .slice(textIndex)
          .map((line) => line.replace(/\ufeff/g, '').trim())
          .filter((line) => line !== '');

        let enText = textLines.find((line) => !chineseRegex.test(line)) || '';
        let zhText = textLines.find((line) => chineseRegex.test(line)) || '';

        if (!enText && textLines.length) {
          enText = textLines[0];
        }

        if (enText) {
          const words = enText
            .split(/\s+/)
            .map((word) => word.trim())
            .filter((word) => word !== '');

          lyrics.push({
            index: lyrics.length + 1,
            time: this.formatTime(startTime),
            en: enText,
            zh: zhText || '',
            words: words.length > 0 ? words : [] // 确保words是数组
          });
        }
      } catch (error) {
        console.error('[LyricsPreview] 解析字幕块失败:', error);
      }
    });

    return lyrics;
  },

  parseSRTTime(timeStr) {
    try {
      const parts = timeStr.trim().replace(',', '.').split(':');
      if (parts.length < 2) return 0;
      let hours = 0;
      let minutes = 0;
      let seconds = 0;
      if (parts.length === 3) {
        hours = parseInt(parts[0], 10) || 0;
        minutes = parseInt(parts[1], 10) || 0;
        seconds = parseFloat(parts[2]) || 0;
      } else {
        minutes = parseInt(parts[0], 10) || 0;
        seconds = parseFloat(parts[1]) || 0;
      }
      return hours * 3600 + minutes * 60 + seconds;
    } catch (error) {
      console.error('[LyricsPreview] 时间解析失败:', timeStr, error);
      return 0;
    }
  },

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  onWordTap(e) {
    const { word, lineIndex, wordIndex } = e.currentTarget.dataset;
    const targetWord = word || '';

    // 显示时去除尾部标点符号，查询时去除首尾标点符号
    const displayWord = targetWord.replace(/[^a-zA-Z]+$/g, '');
    const queryWord = targetWord.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '').toLowerCase();

    this.speakWord(queryWord);
    this.fetchWordDefinition(queryWord);

    const detail = this.data.wordLibrary[queryWord] || this.data.wordLibrary.default;

    const query = wx.createSelectorQuery().in(this);
    query
      .select(`#word-${lineIndex}-${wordIndex}`)
      .boundingClientRect((rect) => {
        const systemInfo = wx.getSystemInfoSync();
        const cardWidth = Math.min(systemInfo.windowWidth - 40, 320);
        const left = rect ? rect.left + rect.width / 2 - cardWidth / 2 : (systemInfo.windowWidth - cardWidth) / 2;
        const top = rect ? rect.top + rect.height + 12 : systemInfo.windowHeight * 0.3;
        const safeLeft = Math.max(20, Math.min(left, systemInfo.windowWidth - cardWidth - 20));
        const safeTop = Math.max(100, Math.min(top, systemInfo.windowHeight - 260));

        this.setData({
          showDictionary: true,
          selectedWord: displayWord,
          dictionaryPhonetics: detail.phonetics,
          dictionaryDefinitions: detail.definitions,
          dictionaryPosition: {
            top: safeTop,
            left: safeLeft,
            width: cardWidth
          }
        });
      })
      .exec();
  },

  closeDictionary() {
    this.setData({
      showDictionary: false
    });
  },

  switchDictionaryTab(e) {
    const { key } = e.currentTarget.dataset;
    if (!key) return;
    this.setData({
      activeDictionaryTab: key
    });
  },

  goToVocabulary() {
    wx.navigateTo({
      url: '/pages/vocabulary-list/vocabulary-list'
    });
  },

  goToYoudao() {
    wx.navigateTo({
      url: '/pages/youdao-dictionary/youdao-dictionary'
    });
  },

  // 加载更多歌词（分页）
  loadMoreLyrics() {
    const { currentPage, pageSize, lyrics, totalPages } = this.data;
    
    if (currentPage >= totalPages - 1) {
      wx.showToast({
        title: '已加载全部内容',
        icon: 'none'
      });
      return;
    }

    const nextPage = currentPage + 1;
    const startIndex = nextPage * pageSize;
    const endIndex = Math.min(startIndex + pageSize, lyrics.length);
    const newLyrics = lyrics.slice(startIndex, endIndex);

    this.setData({
      displayedLyrics: this.data.displayedLyrics.concat(newLyrics),
      currentPage: nextPage
    });
  },

  fetchWordDefinition(word) {
    // 只去除单词首尾的标点符号，保留单词内部的标点符号
    const normalizedWord = (word || '').replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '').toLowerCase();
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
          console.warn('[LyricsPreview] 未获取到词条:', normalizedWord);
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

        if (!definitions.length) {
          console.warn('[LyricsPreview] 未解析到释义:', normalizedWord);
          return;
        }

        this.setData({
          dictionaryPhonetics: phonetics,
          dictionaryDefinitions: definitions
        });
      },
      fail: (err) => {
        console.error('[LyricsPreview] 在线词典请求失败:', err);
      }
    });
  },

  speakWord(word) {
    console.log('[LyricsPreview] 开始发音:', word);
    if (wx.speechSynthesis && wx.speechSynthesis.speak) {
      wx.speechSynthesis.speak({
        text: word,
        lang: 'en-US',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        success: () => {
          console.log('[LyricsPreview] 发音成功');
        },
        fail: (err) => {
          console.error('[LyricsPreview] 发音失败:', err);
          this.playWordAudio(word);
        }
      });
    } else {
      this.playWordAudio(word);
    }
  },

  playWordAudio(word) {
    try {
      // 只去除单词首尾的标点符号，保留单词内部的标点符号
      const normalizedWord = (word || '').trim().replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
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
        console.error('[LyricsPreview] 播放单词音频失败:', err);
        wordAudioContext.destroy();
      });
    } catch (err) {
      console.error('[LyricsPreview] 播放单词音频异常:', err);
    }
  }
});
