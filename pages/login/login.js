const loginValidators = {
  phone(value) {
    return /^1[3-9]\d{9}$/.test(value);
  },
  password(value) {
    return value && value.length >= 6;
  }
};

Page({
  data: {
    loginForm: {
      phone: '',
      password: ''
    },
    loginErrors: {},
    submitting: false
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '登录' });
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`loginForm.${field}`]: e.detail.value.trim()
    });
  },

  submitLogin() {
    const { phone, password } = this.data.loginForm;
    const errors = {};
    if (!loginValidators.phone(phone)) {
      errors.phone = '请输入 11 位手机号';
    }
    if (!loginValidators.password(password)) {
      errors.password = '请输入至少 6 位密码';
    }
    this.setData({ loginErrors: errors });
    if (Object.keys(errors).length) return;

    this.setData({ submitting: true });
    wx.showLoading({ title: '正在登录', mask: true });

    wx.request({
      url: 'https://danci.hub123.cn/admin/openApi/user_login_api.php',
      method: 'POST',
      data: {
        phone,
        password
      },
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        const payload = res.data || {};
        const ok = res.statusCode === 200 && (payload.success === true || payload.code === 0 || payload.code === 200 || payload.status === 'success');
        if (ok) {
          const user = payload.data && payload.data.user ? payload.data.user : null;
          if (user) {
            wx.setStorageSync('userInfo', user);
          }
          wx.showToast({ title: '登录成功', icon: 'success' });
          setTimeout(() => {
            wx.switchTab({ url: '/pages/more/more' });
          }, 500);
        } else {
          const msg = payload.msg || payload.message || '登录失败';
          wx.showToast({ title: msg, icon: 'none' });
        }
      },
      fail: (err) => {
        wx.showToast({ title: err.errMsg || '网络异常', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
        this.setData({ submitting: false });
      }
    });
  },

  goToRegister() {
    wx.navigateTo({ url: '/pages/register/register' });
  },

  onUnload() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }
});
