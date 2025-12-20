Page({
  data: {
    downloadSummary: {
      totalPlayback: '0小时 1分 33秒',
      downloadedCount: 12,
      activeTasks: 1,
      pendingNotifications: 2
    },
    localEntries: [
      {
        id: 'transfer',
        name: '传输的文件',
        subtitle: '支持 AirDrop / iCloud / 微信导入',
        icon: '/images/download.png'
      }
    ],
    downloadTasks: [
      {
        id: 'task-taylor',
        title: 'Taylor Swift 纽约演讲精读',
        progressText: '1 / 3 分段 · 320MB / 1.2GB',
        speed: '1.6 MB/s',
        status: '下载中'
      }
    ],
    downloadedSessions: [
      {
        id: 'session-taylor',
        title: 'Taylor Swift 2022年纽约大学毕业演讲',
        cover: '/images/movie1.jpg',
        progress: '3 / 3 分段 · 已下载',
        updatedAt: '2小时前同步',
        badge: 2,
        status: '精听中'
      },
      {
        id: 'session-pinocchio',
        title: 'Pinocchio 2022',
        cover: '/images/movie2.jpg',
        progress: '2 / 10 分段 · 已解析字幕',
        updatedAt: '昨天',
        badge: 0,
        status: '待精读'
      }
    ]
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '下载列表' });
  },

  openTaskCenter() {
    wx.showToast({
      title: '下载任务列表（mock）',
      icon: 'none'
    });
  },

  resumeTask() {
    wx.showToast({
      title: '已继续任务',
      icon: 'success'
    });
  },

  openLocalEntry(e) {
    const { id } = e.currentTarget.dataset;
    console.log('[Downloads] 打开本地入口:', id);
  },

  openSessionDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/player/player?id=${id}`
    });
  }
});
