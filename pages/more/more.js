Page({
  data: {
    upgradeCard: {
      title: '升级为 Pro 版',
      desc: '享用更多高级精听功能',
      cta: '查看详情'
    },
    menuItems: [
      { id: 'account', icon: '/images/heart.png', title: '账户', extra: '未登录' },
      { id: 'history', icon: '/images/clock.png', title: '播放历史', extra: '' },
      { id: 'vocabulary', icon: '/images/list.png', title: '生词', extra: '' },
      { id: 'language', icon: '/images/menu.png', title: '母语设置', extra: '中文' },
      { id: 'apps', icon: '/images/download.png', title: '优秀应用', extra: '' },
      { id: 'feedback', icon: '/images/heart.png', title: '致用户', extra: '' },
      { id: 'rating', icon: '/images/star-filled.png', title: '给我评分', extra: '' }
    ],
    footerBanner: {
      title: '免费升 Pro',
      desc: '最高可获永久 Pro 会员'
    },
    currentUser: null,
    accountStatus: '未登录',
    accountName: ''
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '更多' });
  },

  onShow() {
    const user = wx.getStorageSync('userInfo') || null;
    this.updateMenuWithUser(user);
  },

  updateMenuWithUser(user) {
    const name = user ? (user.nickname || user.phone || '') : '';
    const status = user ? '已登录' : '未登录';
    const updated = this.data.menuItems.map((item) => {
      if (item.id === 'account') {
        const extra = status;
        return Object.assign({}, item, { extra });
      }
      return item;
    });
    this.setData({ menuItems: updated, currentUser: user, accountStatus: status, accountName: name });
  },

  handleCardTap() {
    wx.showToast({ title: 'Pro 功能即将上线', icon: 'none' });
  },

  handleMenuTap(e) {
    const { id } = e.currentTarget.dataset;
    if (id === 'account') {
      if (this.data.currentUser) {
        wx.showToast({ title: '已登录', icon: 'none' });
      } else {
        wx.navigateTo({ url: '/pages/login/login' });
      }
      return;
    }
    wx.showToast({ title: '功能开发中', icon: 'none' });
  }
});
