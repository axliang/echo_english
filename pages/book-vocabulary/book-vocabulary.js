const PAGE_SIZE = 20;

Page({
  data: {
    bookId: '',
    title: '字幕词汇',
    totalWords: 0,
    displayWords: [],
    allWords: [],
    pageSize: PAGE_SIZE,
    isLoading: true,
    loadingText: '正在加载词汇...请稍候',
    hasMore: true,
    courseProgress: { finished: 0, total: 0 },
    definitionCache: {},
    meaningLoading: false
  },

  onLoad(options) {
    const bookId = options.bookId || '';
    const title = options.title ? decodeURIComponent(options.title) : '字幕词汇';
    this.wordMap = new Map();
    this.wordOccurrences = {};

    this.setData({ bookId, title });
    wx.setNavigationBarTitle({ title });

    const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel();
    if (eventChannel && eventChannel.on) {
      eventChannel.on('prefetchWords', ({ words }) => {
        if (Array.isArray(words) && words.length) {
          this.usePrefetchedWords(words);
        }
      });
    }

    if (bookId) {
      this.loadCourses(bookId);
    } else {
      this.setData({
        isLoading: false,
        loadingText: '缺少bookId，无法加载词汇',
        hasMore: false
      });
      wx.showToast({ title: '缺少bookId', icon: 'none' });
    }
  },

  usePrefetchedWords(words) {
    this.wordMap = new Map(words.map((item) => [item.word, item.frequency || 1]));
    const initial = words.slice(0, this.data.pageSize);
    this.setData({
      allWords: words,
      displayWords: initial,
      totalWords: words.length,
      hasMore: words.length > initial.length,
      isLoading: false,
      loadingText: ''
    });
    this.prefetchDefinitions(initial);
  },

  loadCourses(bookId) {
    if (this.wordMap && this.wordMap.size > 0) {
      this.setData({ isLoading: false, loadingText: '' });
      return;
    }

    this.setData({ loadingText: '正在加载课程列表...' });
    wx.request({
      url: `https://danci.hub123.cn/admin/openApi/get_courses_by_book.php?book_id=${bookId}`,
      method: 'GET',
      success: (res) => {
        if (res.data && res.data.status === 'success' && Array.isArray(res.data.data)) {
          const courses = res.data.data.sort((a, b) => a.title.localeCompare(b.title));
          this.setData({ courseProgress: { finished: 0, total: courses.length } });
          this.loadSubtitlesSequentially(courses);
        } else {
          this.handleLoadError('课程数据获取失败');
        }
      },
      fail: () => {
        this.handleLoadError('课程数据请求失败');
      }
    });
  },

  handleLoadError(msg) {
    this.setData({
      isLoading: false,
      loadingText: msg,
      hasMore: false
    });
    wx.showToast({ title: msg, icon: 'none' });
  },

  loadSubtitlesSequentially(courses) {
    const next = (index) => {
      if (index >= courses.length) {
        this.finalizeWordList();
        return;
      }

      const course = courses[index];
      if (!course.srt_file_path) {
        this.updateProgress(index + 1, courses.length);
        next(index + 1);
        return;
      }

      wx.request({
        url: course.srt_file_path,
        method: 'GET',
        responseType: 'text',
        success: (res) => {
          const { words, occurrences } = this.extractWordsFromSRT(res.data || '', course.title || '');
          this.mergeWords(words);
          this.mergeOccurrences(occurrences);
          this.updateDisplayWords();
        },
        complete: () => {
          this.updateProgress(index + 1, courses.length);
          next(index + 1);
        }
      });
    };

    next(0);
  },

  updateProgress(finished, total) {
    this.setData({ courseProgress: { finished, total } });
  },

  extractWordsFromSRT(content, courseTitle) {
    const words = [];
    const occurrences = [];
    if (!content) return { words, occurrences };

    const normalized = content.replace(/\r\n/g, '\n');
    const blocks = normalized.split('\n\n').filter((block) => block.trim() !== '');
    const chineseRegex = /[\u4e00-\u9fff]/;

    blocks.forEach((block, idx) => {
      const lines = block.split('\n').filter((line) => line.trim() !== '');
      if (lines.length < 2) return;

      let timeLineIndex = 1;
      let textIndex = 2;
      if (!/^\d+$/.test(lines[0].trim())) {
        timeLineIndex = 0;
        textIndex = 1;
      }

      const timeLine = lines[timeLineIndex] || '';
      if (!timeLine.includes(' --> ')) return;
      const timeParts = timeLine.split(' --> ');
      const startSeconds = this.parseSRTTime(timeParts[0]);

      const textLines = lines
        .slice(textIndex)
        .map((line) => line.replace(/\ufeff/g, '').trim())
        .filter((line) => line !== '');

      const enText = textLines.find((line) => !chineseRegex.test(line)) || textLines[0] || '';
      const zhText = textLines.find((line) => chineseRegex.test(line)) || '';
      if (!enText) return;

      const wordList = enText
        .split(/\s+/)
        .map((w) => w.replace(/[^a-zA-Z]/g, '').toLowerCase())
        .filter((w) => w);

      if (wordList.length === 0) return;

      words.push(...wordList);

      const timeLabel = this.formatTime(startSeconds || 0);
      wordList.forEach((w) => {
        occurrences.push({
          word: w,
          en: enText,
          zh: zhText,
          time: timeLabel,
          start: startSeconds || 0,
          courseTitle: courseTitle || '',
          index: idx
        });
      });
    });

    return { words, occurrences };
  },

  mergeWords(words) {
    if (!Array.isArray(words)) return;
    words.forEach((word) => {
      const count = this.wordMap.get(word) || 0;
      this.wordMap.set(word, count + 1);
    });
  },

  mergeOccurrences(occurrences) {
    if (!Array.isArray(occurrences)) return;
    occurrences.forEach((item) => {
      const key = (item.word || '').toLowerCase();
      if (!key) return;
      if (!this.wordOccurrences[key]) {
        this.wordOccurrences[key] = [];
      }
      this.wordOccurrences[key].push({ ...item, word: key });
    });
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
    } catch (e) {
      return 0;
    }
  },

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  sortWordsByFrequency(wordMap) {
    const arr = [];
    wordMap.forEach((frequency, word) => {
      const cachedMeaning = this.data.definitionCache[word];
      arr.push({ word, frequency, meaning: cachedMeaning || '' });
    });
    arr.sort((a, b) => b.frequency - a.frequency);
    return arr;
  },

  updateDisplayWords() {
    const allWords = this.sortWordsByFrequency(this.wordMap);
    const currentLen = this.data.displayWords.length || this.data.pageSize;
    const nextLen = Math.max(currentLen, this.data.pageSize);
    const displayWords = allWords.slice(0, nextLen);

    this.setData({
      allWords,
      displayWords,
      totalWords: allWords.length,
      hasMore: allWords.length > displayWords.length,
      isLoading: false,
      loadingText: allWords.length ? '' : this.data.loadingText
    });

    this.prefetchDefinitions(displayWords);
  },

  finalizeWordList() {
    this.updateDisplayWords();
    this.setData({ isLoading: false, loadingText: '' });
  },

  loadMoreWords() {
    if (!this.data.hasMore) {
      wx.showToast({ title: '已加载全部单词', icon: 'none' });
      return;
    }
    const nextCount = Math.min(
      this.data.displayWords.length + this.data.pageSize,
      this.data.allWords.length
    );
    const displayWords = this.data.allWords.slice(0, nextCount);
    this.setData({
      displayWords,
      hasMore: nextCount < this.data.allWords.length
    });
    this.prefetchDefinitions(displayWords);
  },

  onReachBottom() {
    this.loadMoreWords();
  },

  prefetchDefinitions(words) {
    if (!Array.isArray(words) || !words.length) return;
    words.forEach((item) => {
      if (!item || !item.word) return;
      if (this.data.definitionCache[item.word]) {
        this.updateWordMeaning(item.word, this.data.definitionCache[item.word]);
        return;
      }
      this.fetchWordDefinition(item.word);
    });
  },

  fetchWordDefinition(rawWord) {
    const word = (rawWord || '').replace(/[^a-zA-Z\-']/g, '').toLowerCase();
    if (!word) return;

    wx.request({
      url: 'https://dict.youdao.com/jsonapi',
      method: 'GET',
      data: {
        q: word,
        dicts: JSON.stringify({ count: 1, dicts: [['ec']] }),
        client: 'wechat-miniprogram',
        keyfrom: 'echoenglish'
      },
      success: (res) => {
        const wordEntry = res.data && res.data.ec && res.data.ec.word && res.data.ec.word[0];
        if (!wordEntry) return;

        const extractTexts = (node) => {
          if (!node) return [];
          if (typeof node === 'string') return [node];
          if (Array.isArray(node)) return node.reduce((acc, item) => acc.concat(extractTexts(item)), []);
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

        const definitions = (wordEntry.trs || [])
          .map((item) => {
            const meaningTexts = extractTexts(item.tr);
            const meaning = meaningTexts.join('').replace(/\s+/g, ' ').trim();
            if (!meaning) return null;
            return `${item.pos || ''} ${meaning}`.trim();
          })
          .filter((m) => m);

        const meaning = definitions.length
          ? definitions.join('\n')
          : '暂无释义';

        this.data.definitionCache[word] = meaning;
        this.updateWordMeaning(word, meaning);
      },
      fail: () => {
        this.updateWordMeaning(word, '释义加载失败');
      }
    });
  },

  updateWordMeaning(word, meaning) {
    const updateList = (list) =>
      list.map((item) => (item.word === word ? { ...item, meaning } : item));

    this.setData({
      allWords: updateList(this.data.allWords),
      displayWords: updateList(this.data.displayWords)
    });
  },

  playWord(e) {
    const word = e.currentTarget.dataset.word;
    if (!word) return;

    if (wx.speechSynthesis && wx.speechSynthesis.speak) {
      wx.speechSynthesis.speak({
        text: word,
        lang: 'en-US',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0
      });
    } else {
      const ctx = wx.createInnerAudioContext();
      ctx.src = `https://dict.youdao.com/dictvoice?type=2&audio=${encodeURIComponent(word)}`;
      ctx.obeyMuteSwitch = false;
      ctx.autoplay = true;
      ctx.onEnded(() => ctx.destroy());
      ctx.onError(() => ctx.destroy());
    }
  },

  viewWordDetail(e) {
    const word = e.currentTarget.dataset.word;
    console.log('[BookVocabulary] tap word row:', word);
    if (!word) {
      wx.showToast({ title: '缺少单词', icon: 'none' });
      return;
    }
    const lower = (word || '').toLowerCase();
    const occurrences = (this.wordOccurrences && this.wordOccurrences[lower]) || [];
    console.log('[BookVocabulary] occurrences found:', occurrences.length);

    if (!occurrences.length) {
      wx.showToast({ title: '未找到该单词的字幕', icon: 'none' });
      return;
    }

    const target = (this.data.allWords || []).find((w) => w.word === lower) || {};

    wx.navigateTo({
      url: `/pages/word-usage/word-usage?word=${encodeURIComponent(lower)}&bookId=${this.data.bookId}&title=${encodeURIComponent('字幕单词-句子')}`,
      success: (res) => {
        console.log('[BookVocabulary] navigate success, emit wordData');
        res.eventChannel.emit('wordData', {
          word: lower,
          meaning: target.meaning || '',
          frequency: target.frequency || occurrences.length,
          occurrences
        });
      },
      fail: (err) => {
        console.error('[BookVocabulary] navigate fail:', err);
        wx.showToast({ title: '打开详情失败', icon: 'none' });
      }
    });
  }
});
