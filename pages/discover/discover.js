Page({
  data: {
    currentTab: 0,
    indicatorLeft: 60,
    indicatorWidth: 80,
    movieList: [
      {
        id: 1,
        poster: '/images/movie1.jpg',
        title: '阿甘正传',
        tags: ['英语', '剧情', '励志'],
        year: '1994',
        country: '美国',
        genre: '剧情',
        duration: '2h22m',
        segments: 12
      },
      {
        id: 2,
        poster: '/images/movie2.jpg',
        title: '乔布斯演讲',
        tags: ['英语', '演讲', '科技'],
        year: '2005',
        country: '美国',
        genre: '演讲',
        duration: '1h30m',
        segments: 8
      },
      {
        id: 3,
        poster: '/images/movie3.jpg',
        title: '泰坦尼克号',
        tags: ['英语', '爱情', '灾难'],
        year: '1997',
        country: '美国',
        genre: '爱情',
        duration: '3h14m',
        segments: 15
      }
    ],
    examList: []
  },

  switchTab(e) {
    const tab = parseInt(e.currentTarget.dataset.tab);
    this.setData({
      currentTab: tab
    });
    
    // 计算指示器位置
    const query = wx.createSelectorQuery();
    query.select('.nav-tab').boundingClientRect((rect) => {
      if (rect) {
        const width = rect.width;
        const left = 40 + tab * (width + 40); // 40是padding-left
        this.setData({
          indicatorLeft: left,
          indicatorWidth: width
        });
      }
    }).exec();
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/movie-detail/movie-detail?id=${id}`
    });
  },
  
  goToPlay(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/player/player?id=${id}`
    });
  },

  goToSearch() {
    wx.navigateTo({
      url: '/pages/search/search'
    });
  },

  onLoad() {
    // 初始化指示器位置
    const query = wx.createSelectorQuery();
    query.select('.nav-tab').boundingClientRect((rect) => {
      if (rect) {
        this.setData({
          indicatorWidth: rect.width,
          indicatorLeft: 40
        });
      }
    }).exec();
    
    // 获取高考数据
    this.fetchExamData();
    // 获取电影数据
    this.fetchMovieData();
  },

  fetchExamData() {
    wx.request({
      url: 'https://danci.hub123.cn/admin/openApi/get_books_by_type.php?book_type=英语-高考',
      method: 'GET',
      success: (res) => {
        if (res.data.status === 'success' && res.data.data) {
          const examList = res.data.data.map(item => ({
            id: item.id,
            name: item.name,
            image: item.image,
            description: item.description
          }));
          this.setData({ examList });
        } else {
          console.error('获取高考数据失败:', res.data.message);
        }
      },
      fail: (err) => {
        console.error('请求高考数据失败:', err);
      }
    });
  },

  fetchMovieData() {
    wx.request({
      url: 'https://danci.hub123.cn/admin/openApi/get_books_by_type.php?book_type=英语-电影',
      method: 'GET',
      success: (res) => {
        if (res.data.status === 'success' && res.data.data) {
          const movieList = res.data.data.map(item => ({
            id: item.id,
            poster: item.image,
            title: item.name,
            tags: ['英语', '电影'],
            year: '2023', // 默认年份
            country: '美国', // 默认国家
            genre: '电影',
            duration: '2h', // 默认时长
            segments: 10 // 默认分段数
          }));
          this.setData({ movieList });
        } else {
          console.error('获取电影数据失败:', res.data.message);
        }
      },
      fail: (err) => {
        console.error('请求电影数据失败:', err);
      }
    });
  }
});