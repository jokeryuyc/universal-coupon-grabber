/**
 * Universal Coupon Grabber - Options Page JavaScript
 * 设置页面的交互逻辑
 */

class OptionsManager {
  constructor() {
    this.settings = {};
    this.init();
  }

  async init() {
    console.log('Options Manager initialized');
    
    // 设置事件监听
    this.setupEventListeners();
    
    // 加载设置
    await this.loadSettings();
    
    // 初始化界面
    this.initializeUI();
    
    // 加载网站信息
    this.loadWebsiteInfo();
    
    // 加载存储信息
    this.loadStorageInfo();
  }

  setupEventListeners() {
    // 标签切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // 设置保存
    document.getElementById('saveBtn').addEventListener('click', () => {
      this.saveSettings();
    });

    // 重置设置
    document.getElementById('resetSettings').addEventListener('click', () => {
      this.resetSettings();
    });

    // 取消按钮
    document.getElementById('cancelBtn').addEventListener('click', () => {
      window.close();
    });

    // 时间同步
    document.getElementById('syncTimeNow').addEventListener('click', () => {
      this.syncTimeNow();
    });

    // 自定义规则
    document.getElementById('saveCustomRules').addEventListener('click', () => {
      this.saveCustomRules();
    });

    document.getElementById('validateRules').addEventListener('click', () => {
      this.validateRules();
    });

    // 数据管理
    document.getElementById('exportData').addEventListener('click', () => {
      this.exportData();
    });

    document.getElementById('importData').addEventListener('click', () => {
      document.getElementById('importFile').click();
    });

    document.getElementById('importFile').addEventListener('change', (e) => {
      this.importData(e.target.files[0]);
    });

    document.getElementById('clearAllData').addEventListener('click', () => {
      this.clearAllData();
    });
  }

  switchTab(tabName) {
    // 隐藏所有标签内容
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });

    // 移除所有标签按钮的激活状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    // 显示选中的标签内容
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response.success) {
        this.settings = response.data;
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  getDefaultSettings() {
    return {
      theme: 'light',
      language: 'zh-CN',
      autoCapture: true,
      enableNotifications: true,
      enableSounds: false,
      logLevel: 'info',
      maxLogEntries: 1000,
      defaultTimeout: 5000,
      defaultRetryAttempts: 5,
      defaultRetryInterval: 100,
      defaultAdvanceTime: 500,
      enableTimeSync: true,
      timeSyncInterval: 30,
      userAgent: '',
      enableProxy: false,
      enableDebugMode: false,
      enableConsoleLog: false
    };
  }

  initializeUI() {
    // 填充设置值
    Object.keys(this.settings).forEach(key => {
      const element = document.getElementById(key);
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = this.settings[key];
        } else {
          element.value = this.settings[key];
        }
      }
    });

    // 设置默认激活标签
    this.switchTab('general');
  }

  async saveSettings() {
    try {
      // 收集设置值
      const newSettings = {};
      
      // 文本和选择框
      ['theme', 'language', 'logLevel', 'userAgent'].forEach(key => {
        const element = document.getElementById(key);
        if (element) {
          newSettings[key] = element.value;
        }
      });

      // 数字输入框
      ['maxLogEntries', 'defaultTimeout', 'defaultRetryAttempts', 
       'defaultRetryInterval', 'defaultAdvanceTime', 'timeSyncInterval'].forEach(key => {
        const element = document.getElementById(key);
        if (element) {
          newSettings[key] = parseInt(element.value) || 0;
        }
      });

      // 复选框
      ['autoCapture', 'enableNotifications', 'enableSounds', 'enableTimeSync',
       'enableProxy', 'enableDebugMode', 'enableConsoleLog'].forEach(key => {
        const element = document.getElementById(key);
        if (element) {
          newSettings[key] = element.checked;
        }
      });

      // 发送保存请求
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_SETTINGS',
        data: newSettings
      });

      if (response.success) {
        this.settings = newSettings;
        this.showMessage('设置保存成功', 'success');
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showMessage('设置保存失败: ' + error.message, 'error');
    }
  }

  async resetSettings() {
    if (confirm('确定要重置所有设置吗？此操作不可撤销。')) {
      try {
        const defaultSettings = this.getDefaultSettings();
        
        const response = await chrome.runtime.sendMessage({
          type: 'SAVE_SETTINGS',
          data: defaultSettings
        });

        if (response.success) {
          this.settings = defaultSettings;
          this.initializeUI();
          this.showMessage('设置已重置为默认值', 'success');
        }
      } catch (error) {
        this.showMessage('重置设置失败: ' + error.message, 'error');
      }
    }
  }

  async syncTimeNow() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'SYNC_TIME_NOW' });
      
      if (response.success) {
        const status = document.getElementById('timeSyncStatus');
        status.textContent = `同步成功 (偏移: ${response.data.offset}ms)`;
        status.style.color = '#28a745';
        this.showMessage('时间同步成功', 'success');
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      this.showMessage('时间同步失败: ' + error.message, 'error');
    }
  }

  loadWebsiteInfo() {
    const websiteList = document.getElementById('websiteList');
    
    const websites = [
      {
        name: '美团',
        domain: 'meituan.com',
        status: 'supported',
        features: '秒杀券、闪购、团购、H5guard签名'
      },
      {
        name: '淘宝',
        domain: 'taobao.com',
        status: 'supported',
        features: '聚划算、优惠券、mtop签名'
      },
      {
        name: '天猫',
        domain: 'tmall.com',
        status: 'supported',
        features: '优惠券、直播券、mtop签名'
      },
      {
        name: '京东',
        domain: 'jd.com',
        status: 'supported',
        features: '秒杀、优惠券、闪购、预约、JD风险指纹'
      },
      {
        name: '拼多多',
        domain: 'pinduoduo.com',
        status: 'supported',
        features: '限时秒杀、拼团、砍价、抽奖、PDD反作弊'
      }
    ];

    websiteList.innerHTML = websites.map(site => `
      <div class="website-item">
        <div class="website-name">${site.name}</div>
        <span class="website-status ${site.status}">
          ${site.status === 'supported' ? '完全支持' : '部分支持'}
        </span>
        <div class="website-features">${site.features}</div>
      </div>
    `).join('');
  }

  async loadStorageInfo() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STORAGE_USAGE' });
      
      if (response.success) {
        const usage = response.data;
        document.getElementById('storageUsed').textContent = 
          `${(usage.used / 1024).toFixed(2)} KB`;
        document.getElementById('storageQuota').textContent = 
          `${(usage.total / 1024 / 1024).toFixed(2)} MB`;
        document.getElementById('storagePercentage').textContent = 
          `${usage.percentage}%`;
      }
    } catch (error) {
      console.error('Failed to load storage info:', error);
    }
  }

  saveCustomRules() {
    try {
      const rulesText = document.getElementById('customRules').value;
      if (!rulesText.trim()) {
        this.showMessage('请输入自定义规则', 'warning');
        return;
      }

      const rules = JSON.parse(rulesText);
      
      // 验证规则格式
      if (!rules.website || !rules.capturePatterns) {
        throw new Error('规则格式不正确，缺少必要字段');
      }

      // 保存规则
      chrome.runtime.sendMessage({
        type: 'SAVE_CUSTOM_RULES',
        data: rules
      }).then(response => {
        if (response.success) {
          this.showMessage('自定义规则保存成功', 'success');
        } else {
          throw new Error(response.error);
        }
      });

    } catch (error) {
      this.showMessage('保存失败: ' + error.message, 'error');
    }
  }

  validateRules() {
    try {
      const rulesText = document.getElementById('customRules').value;
      if (!rulesText.trim()) {
        this.showMessage('请输入要验证的规则', 'warning');
        return;
      }

      const rules = JSON.parse(rulesText);
      
      // 基本验证
      const requiredFields = ['website', 'capturePatterns'];
      const missingFields = requiredFields.filter(field => !rules[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`缺少必要字段: ${missingFields.join(', ')}`);
      }

      // 验证capturePatterns
      if (!Array.isArray(rules.capturePatterns)) {
        throw new Error('capturePatterns必须是数组');
      }

      rules.capturePatterns.forEach((pattern, index) => {
        if (!pattern.name || !pattern.urlPattern) {
          throw new Error(`第${index + 1}个模式缺少name或urlPattern字段`);
        }
      });

      this.showMessage('规则验证通过', 'success');

    } catch (error) {
      this.showMessage('验证失败: ' + error.message, 'error');
    }
  }

  async exportData() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'EXPORT_DATA' });
      
      if (response.success) {
        const data = JSON.stringify(response.data, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `ucg-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showMessage('数据导出成功', 'success');
      }
    } catch (error) {
      this.showMessage('导出失败: ' + error.message, 'error');
    }
  }

  async importData(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const response = await chrome.runtime.sendMessage({
        type: 'IMPORT_DATA',
        data: data
      });

      if (response.success) {
        this.showMessage('数据导入成功，请重新加载页面', 'success');
        setTimeout(() => location.reload(), 2000);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      this.showMessage('导入失败: ' + error.message, 'error');
    }
  }

  async clearAllData() {
    const confirmed = confirm(
      '警告：此操作将删除所有数据，包括任务、设置、日志等。\n\n' +
      '此操作不可撤销，确定要继续吗？'
    );

    if (confirmed) {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'CLEAR_ALL_DATA' });
        
        if (response.success) {
          this.showMessage('所有数据已清空', 'success');
          setTimeout(() => location.reload(), 2000);
        }
      } catch (error) {
        this.showMessage('清空数据失败: ' + error.message, 'error');
      }
    }
  }

  showMessage(message, type = 'info') {
    // 创建消息提示
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    
    // 添加样式
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      font-weight: 500;
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;

    // 根据类型设置颜色
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8'
    };
    messageDiv.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(messageDiv);

    // 3秒后自动移除
    setTimeout(() => {
      messageDiv.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.parentNode.removeChild(messageDiv);
        }
      }, 300);
    }, 3000);
  }
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// 初始化选项管理器
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});
