const registerValidators = {
  phone(value) {
    return /^1[3-9]\d{9}$/.test(value);
  },
  code(value) {
    return /^\d{4,6}$/.test(value);
  },
  password(value) {
    return value && value.length >= 6;
  }
};

Page({
  data: {
    registerForm: {
      phone: '',
      code: '',
      password: '',
      confirmPassword: ''
    },
    registerErrors: {},
    codeCountdown: 0,
    loginRecords: ['se******86@126.com']
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '注册' });
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`registerForm.${field}`]: e.detail.value.trim()
    });
  },

  sendCode() {
    if (this.data.codeCountdown > 0) return;
    const { phone } = this.data.registerForm;
    if (!registerValidators.phone(phone)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }
    wx.showToast({ title: '验证码已发送 (mock)', icon: 'none' });
    this.startCountdown();
  },

  startCountdown() {
    this.setData({ codeCountdown: 60 });
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      const next = this.data.codeCountdown - 1;
      if (next <= 0) {
        clearInterval(this.timer);
        this.setData({ codeCountdown: 0 });
      } else {
        this.setData({ codeCountdown: next });
      }
    }, 1000);
  },

  submitRegister() {
    const { phone, code, password, confirmPassword } = this.data.registerForm;
    const errors = {};
    if (!registerValidators.phone(phone)) {
      errors.phone = '请输入 11 位手机号';
    }
    if (!registerValidators.code(code)) {
      errors.code = '请输入 4-6 位验证码';
    }
    if (!registerValidators.password(password)) {
      errors.password = '密码至少 6 位';
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = '两次输入的密码不一致';
    }
    this.setData({ registerErrors: errors });
    if (Object.keys(errors).length) {
      return;
    }
    wx.showToast({ title: '注册成功（mock）', icon: 'success' });
  },

  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  onUnload() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
});
