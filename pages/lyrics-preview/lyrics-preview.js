Page({
  data: {
    lyrics: [],
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

  onLoad() {
    this.loadSubtitles();
  },

  loadSubtitles() {
    const srtUrl = 'https://danci.hub123.cn/uploads/echoenglish/elephant_en.srt';
    wx.request({
      url: srtUrl,
      method: 'GET',
      responseType: 'text',
      success: (res) => {
        const lyrics = this.parseSRT(res.data);
        this.setData({
          lyrics,
          isLoading: false,
          errorMessage: lyrics.length ? '' : '暂未获取到字幕内容'
        });
      },
      fail: (err) => {
        this.setData({
          isLoading: false,
          errorMessage: '字幕加载失败: ' + err.errMsg
        });
      }
    });
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
            words
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

    this.speakWord(targetWord);
    this.fetchWordDefinition(targetWord);

    const lowerWord = targetWord.toLowerCase();
    const detail = this.data.wordLibrary[lowerWord] || this.data.wordLibrary.default;

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
          selectedWord: targetWord,
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
        console.error('[LyricsPreview] 播放单词音频失败:', err);
        wordAudioContext.destroy();
      });
    } catch (err) {
      console.error('[LyricsPreview] 播放单词音频异常:', err);
    }
  }
});
