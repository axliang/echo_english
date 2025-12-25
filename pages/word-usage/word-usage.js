const fallbackDefinitions = [{ pos: '', meaning: '词汇释义暂缺，请查看「更多」' }];

Page({
  data: {
    baseWord: '',
    dictionaryWord: '',
    title: '字幕单词-句子',
    meaning: '',
    frequency: 0,
    occurrences: [],
    showDictionary: false,
    selectedOccurrence: null,
    dictionaryPhonetics: {
      us: '[spoʊkən]',
      uk: '[ˈspəʊkən]'
    },
    dictionaryDefinitions: fallbackDefinitions,
    modalTop: 200,
    modalLeft: 40,
    modalWidth: 340,
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
    const word = this.data.dictionaryWord;
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
    const word = options.word ? decodeURIComponent(options.word) : '';
    const title = options.title ? decodeURIComponent(options.title) : '字幕单词-句子';
    wx.setNavigationBarTitle({ title });

    this.setData({ baseWord: word, dictionaryWord: word, title });

    const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel();
    if (eventChannel && eventChannel.on) {
      eventChannel.on('wordData', (payload) => {
        const { word: w, meaning, frequency = 0, occurrences = [] } = payload || {};
        const prepared = this.prepareOccurrences(w || word, occurrences || []);
        this.setData({
          baseWord: w || word,
          dictionaryWord: w || word,
          meaning: meaning || '',
          frequency,
          occurrences: prepared
        });
        if (!meaning) {
          this.fetchWordDefinition(w || word);
        }
      });
    }

    if (word && (!this.data.occurrences || this.data.occurrences.length === 0)) {
      this.fetchWordDefinition(word);
    }
  },

  prepareOccurrences(word, list) {
    if (!Array.isArray(list)) return [];

    const enriched = list
      .map((item, idx) => {
        const targetWord = (item.word || word || '').toLowerCase();
        const en = item.en || '';
        const tokens = this.buildWordTokens(en, targetWord, idx);
        return {
          ...item,
          occKey: item.occKey || `occ-${idx}`,
          word: targetWord,
          time: item.time || this.formatTime(item.start || 0),
          zh: item.zh || '',
          courseTitle: item.courseTitle || '',
          tokens
        };
      })
      .sort((a, b) => (a.start || 0) - (b.start || 0))
      .map((item, idx) => ({
        ...item,
        occKey: `occ-${idx}`
      }));

    return enriched;
  },

  onWordCardTap() {
    console.log('[WordUsage] card tap');
    this.setData({
      showDictionary: true,
      selectedOccurrence: null,
      dictionaryDefinitions: this.data.dictionaryDefinitions || fallbackDefinitions,
      dictionaryWord: this.data.baseWord
    });
    this.fetchWordDefinition(this.data.baseWord);
    this.speakWord(this.data.baseWord);
  },

  onSentenceTap(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.occurrences[index];
    console.log('[WordUsage] sentence tap index:', index, 'item:', item);
    if (!item) return;

    const tappedWord = (item.word || this.data.baseWord || '').toLowerCase();
    console.log('[WordUsage] tappedWord:', tappedWord);

    const occKey = e.currentTarget.dataset.occKey || `occ-${index}`;

    const query = wx.createSelectorQuery().in(this);
    query.select(`#${occKey}`).boundingClientRect();
    query.selectViewport().scrollOffset();
    query.exec((res) => {
      const rect = res && res[0];
      const scroll = res && res[1];
      const windowWidth = wx.getSystemInfoSync().windowWidth;
      const cardWidth = Math.min(windowWidth - 40, 340);
      let top = rect ? rect.top + (scroll ? scroll.scrollTop : 0) - 220 : 120;
      top = Math.max(60, top);
      const left = rect
        ? Math.max(20, Math.min(rect.left + rect.width / 2 - cardWidth / 2, windowWidth - cardWidth - 20))
        : 20;

      this.setData({
        showDictionary: true,
        selectedOccurrence: item,
        dictionaryDefinitions: this.data.dictionaryDefinitions || fallbackDefinitions,
        dictionaryWord: tappedWord,
        modalTop: top,
        modalLeft: left,
        modalWidth: cardWidth
      });

      this.fetchWordDefinition(tappedWord);
      this.speakWord(tappedWord);
    });
  },

  onTokenTap(e) {
    const word = (e.currentTarget.dataset.word || '').toLowerCase();
    if (!word) {
      return;
    }
    if (word === this.data.dictionaryWord) {
      this.setData({ showDictionary: true });
      return;
    }
    if (!word) return;
    const tokenId = e.currentTarget.dataset.tokenId;
    console.log('[WordUsage] token tap:', word, tokenId);

    const query = wx.createSelectorQuery().in(this);
    query.select(`#${tokenId}`).boundingClientRect();
    query.selectViewport().scrollOffset();
    query.exec((res) => {
      const rect = res && res[0];
      const scroll = res && res[1];
      const windowWidth = wx.getSystemInfoSync().windowWidth;
      const cardWidth = Math.min(windowWidth - 40, 340);
      let top = rect ? rect.top + (scroll ? scroll.scrollTop : 0) - 220 : 120;
      top = Math.max(60, top);
      const left = rect
        ? Math.max(20, Math.min(rect.left + rect.width / 2 - cardWidth / 2, windowWidth - cardWidth - 20))
        : 20;

      this.setData({
        showDictionary: true,
        selectedOccurrence: null,
        dictionaryDefinitions: this.data.dictionaryDefinitions || fallbackDefinitions,
        dictionaryWord: word,
        modalTop: top,
        modalLeft: left,
        modalWidth: cardWidth
      });

      this.fetchWordDefinition(word);
      this.speakWord(word);
    });
  },

  closeDictionary() {
    this.setData({ showDictionary: false, dictionaryWord: this.data.baseWord });
  },

  speakWord(word) {
    const text = (word || '').trim();
    if (!text) return;
    if (wx.speechSynthesis && wx.speechSynthesis.speak) {
      wx.speechSynthesis.speak({ text, lang: 'en-US', rate: 1.0, pitch: 1.0, volume: 1.0 });
    } else {
      const ctx = wx.createInnerAudioContext();
      ctx.src = `https://dict.youdao.com/dictvoice?type=2&audio=${encodeURIComponent(text)}`;
      ctx.obeyMuteSwitch = false;
      ctx.autoplay = true;
      ctx.onEnded(() => ctx.destroy());
      ctx.onError(() => ctx.destroy());
    }
  },

  fetchWordDefinition(rawWord) {
    const word = (rawWord || '').replace(/[^a-zA-Z\-']/g, '').toLowerCase();
    if (!word) return;

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

        const phonetics = {
          us: wordEntry.usphone ? `[${wordEntry.usphone}]` : this.data.dictionaryPhonetics.us,
          uk: wordEntry.ukphone ? `[${wordEntry.ukphone}]` : this.data.dictionaryPhonetics.uk
        };

        const definitions = (wordEntry.trs || [])
          .map((item) => {
            const meaningTexts = extractTexts(item.tr);
            const meaning = meaningTexts.join('').replace(/\s+/g, ' ').trim();
            if (!meaning) return null;
            return {
              pos: item.pos || '',
              meaning
            };
          })
          .filter((d) => d);

        const finalDefs = definitions.length ? definitions : fallbackDefinitions;

        const isBaseWord = word === (this.data.baseWord || '').toLowerCase();
        const dataUpdate = {
          dictionaryPhonetics: phonetics,
          dictionaryDefinitions: finalDefs,
          dictionaryWord: word
        };
        if (!this.data.meaning && isBaseWord) {
          dataUpdate.meaning = finalDefs.map((d) => `${d.pos} ${d.meaning}`.trim()).join('\n');
        }

      this.setData(dataUpdate);
      this.checkFavoriteStatus(word);
    },
    fail: () => {
        this.setData({ dictionaryDefinitions: fallbackDefinitions });
      }
    });
  },

  buildWordTokens(text, activeWord, occIndex) {
    const tokens = [];
    const source = text || '';
    const wordRegex = /[A-Za-z][A-Za-z'\-]*/g;
    let lastIndex = 0;
    let match;
    let tokenIndex = 0;

    while ((match = wordRegex.exec(source)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({
          id: `token-${occIndex}-${tokenIndex++}`,
          text: source.slice(lastIndex, match.index),
          isWord: false,
          word: '',
          isTarget: false
        });
      }

      const raw = match[0];
      const normalized = raw.toLowerCase();
      tokens.push({
        id: `token-${occIndex}-${tokenIndex++}`,
        text: raw,
        isWord: true,
        word: normalized,
        isTarget: normalized === activeWord
      });
      lastIndex = match.index + raw.length;
    }

    if (lastIndex < source.length) {
      tokens.push({
        id: `token-${occIndex}-${tokenIndex++}`,
        text: source.slice(lastIndex),
        isWord: false,
        word: '',
        isTarget: false
      });
    }

    if (!tokens.length) {
      tokens.push({
        id: `token-${occIndex}-0`,
        text: source,
        isWord: false,
        word: '',
        isTarget: false
      });
    }

    return tokens;
  },

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
});
