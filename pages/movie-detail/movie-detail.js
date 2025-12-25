Page({
  data: {
    movie: {
      id: 1,
      poster: '/images/movie1.jpg',
      title: '阿甘正传',
      description: '影片改编自同名小说，讲述了一个智商只有75的男人福瑞斯特·甘普凭借着诚实、守信、认真、勇敢和感情专一等美德，感动了身边的每一个人，也感动了观众。他在越战中英勇负伤，获得荣誉勋章；退役后做捕虾生意，成为百万富翁；他守着对死去战友的一句承诺，照料其遗孀和儿子；他深爱着青梅竹马的珍妮，即使她已为人妻为人母，他也从不改变自己的初衷……',
      tracks: [
        { title: 'Part 01', duration: '12:30' },
        { title: 'Part 02', duration: '15:45' },
        { title: 'Part 03', duration: '10:20' },
        { title: 'Part 04', duration: '18:15' },
        { title: 'Part 05', duration: '14:30' },
        { title: 'Part 06', duration: '11:40' }
      ]
    },
    studyDuration: '2小时35分钟',
    isIntroExpanded: false
  },

  toggleIntro() {
    this.setData({
      isIntroExpanded: !this.data.isIntroExpanded
    });
  },

  playTrack(e) {
    const index = e.currentTarget.dataset.index;
    
    // 添加边界检查
    if (index >= 0 && index < this.data.movie.tracks.length) {
      const track = this.data.movie.tracks[index];
      wx.navigateTo({
        url: `/pages/player/player?movieId=${this.data.movie.id}&bookId=${this.data.movie.id}&trackIndex=${index}&title=${encodeURIComponent(this.data.movie.title || '')}&audioUrl=${encodeURIComponent(track.audioUrl)}&srtUrl=${track.srtUrl ? encodeURIComponent(track.srtUrl) : ''}`
      });
    } else {
      wx.showToast({
        title: '无效的音轨',
        icon: 'error'
      });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  goToLyricsPreview() {
    wx.navigateTo({
      url: `/pages/lyrics-preview/lyrics-preview?bookId=${this.data.movie.id}`
    });
  },

  onLoad(options) {
    // 这里可以根据options.id加载不同的电影详情
    console.log('Movie detail page loaded with id:', options.id);
    
    if (options.id) {
      // 如果是高考类型，从API获取数据
      this.fetchCourseData(options.id);
    }
  },

  fetchCourseData(bookId) {
    wx.showLoading({
      title: '加载中...'
    });

    wx.request({
      url: `https://danci.hub123.cn/admin/openApi/get_courses_by_book.php?book_id=${bookId}`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        if (res.data.status === 'success' && res.data.data) {
          // 按名称从小到大排序
          const sortedCourses = res.data.data.sort((a, b) => a.title.localeCompare(b.title));
          
          const courses = sortedCourses.map(item => ({
            id: item.id,
            title: item.title,
            duration: '未知', // API没有返回时长信息
            audioUrl: item.file_path,
            srtUrl: item.srt_file_path,
            description: item.description
          }));
          
          this.setData({
            'movie.id': parseInt(bookId),
            'movie.title': sortedCourses[0]?.title || '高考听力',
            'movie.tracks': courses,
            'movie.description': sortedCourses[0]?.description || '高考英语听力练习材料'
          });
        } else {
          wx.showToast({
            title: '获取数据失败',
            icon: 'error'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        });
        console.error('获取课程数据失败:', err);
      }
    });
  }
});