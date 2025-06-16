/**
 * Universal Coupon Grabber - Popup JavaScript
 * 插件弹窗界面的交互逻辑
 */

class PopupManager {
  constructor() {
    this.tasks = [];
    this.isCapturing = false;
    this.currentTab = null;
    
    this.init();
  }

  async init() {
    // 获取当前标签页信息
    await this.getCurrentTab();

    // 恢复popup状态
    await this.restorePopupState();

    // 初始化UI事件监听
    this.setupEventListeners();

    // 加载任务列表
    await this.loadTasks();

    // 设置消息监听
    this.setupMessageListeners();

    // 更新状态显示
    this.updateStatusDisplay();

    // 恢复日志
    this.restoreLogs();

    // 启动实时倒计时更新（学习美团工具）
    this.startCountdownUpdates();
  }

  async getCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tabs[0];
  }

  setupEventListeners() {
    // 快速操作按钮
    document.getElementById('startCaptureBtn').addEventListener('click', () => {
      this.toggleCapture();
    });
    
    document.getElementById('createTaskBtn').addEventListener('click', () => {
      this.showTaskModal();
    });
    
    document.getElementById('importTaskBtn').addEventListener('click', () => {
      this.importTask();
    });

    // 模态框事件
    document.getElementById('closeModalBtn').addEventListener('click', () => {
      this.hideTaskModal();
    });
    
    document.getElementById('cancelBtn').addEventListener('click', () => {
      this.hideTaskModal();
    });
    
    document.getElementById('saveBtn').addEventListener('click', () => {
      this.saveTask();
    });
    
    document.getElementById('testBtn').addEventListener('click', () => {
      this.testTask();
    });

    // 建议任务模态框
    document.getElementById('closeSuggestionBtn').addEventListener('click', () => {
      this.hideSuggestionModal();
    });
    
    document.getElementById('ignoreSuggestionBtn').addEventListener('click', () => {
      this.hideSuggestionModal();
    });
    
    document.getElementById('acceptSuggestionBtn').addEventListener('click', () => {
      this.acceptSuggestion();
    });

    // 日志清空
    document.getElementById('clearLogBtn').addEventListener('click', () => {
      this.clearLogs();
    });

    // 清空任务
    document.getElementById('clearTasksBtn').addEventListener('click', () => {
      this.clearAllTasks();
    });

    // 底部按钮
    document.getElementById('settingsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    document.getElementById('helpBtn').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://github.com/jokeryuyc/universal-coupon-grabber/wiki' });
    });

    document.getElementById('aboutBtn').addEventListener('click', () => {
      this.showAbout();
    });

    // 独立窗口按钮
    document.getElementById('openWindowBtn')?.addEventListener('click', () => {
      this.openIndependentWindow();
    });

    // 点击模态框背景关闭
    document.getElementById('taskModal').addEventListener('click', (e) => {
      if (e.target.id === 'taskModal') {
        this.hideTaskModal();
      }
    });
    
    document.getElementById('suggestionModal').addEventListener('click', (e) => {
      if (e.target.id === 'suggestionModal') {
        this.hideSuggestionModal();
      }
    });
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'TASK_SUGGESTION':
          this.showTaskSuggestion(message.data);
          break;
        case 'TASK_STATUS_UPDATE':
          this.updateTaskStatus(message.taskId, message.status);
          break;
        case 'EXECUTION_LOG':
          this.addLog(message.level, message.message);
          break;
      }
    });
  }

  async toggleCapture() {
    const btn = document.getElementById('startCaptureBtn');

    if (!this.isCapturing) {
      // 开始捕获
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'START_CAPTURE',
          tabId: this.currentTab.id
        });

        if (response.success) {
          this.isCapturing = true;
          btn.innerHTML = '<span class="icon">⏹️</span>停止捕获';
          btn.classList.remove('primary');
          btn.classList.add('secondary');
          this.addLog('info', '开始监听网络请求...');
          this.updateStatusDisplay('监听中');
          await this.savePopupState();
        } else {
          throw new Error(response.error);
        }
      } catch (error) {
        this.addLog('error', `启动捕获失败: ${error.message}`);
        console.error('Start capture error:', error);
      }
    } else {
      // 停止捕获
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'STOP_CAPTURE',
          tabId: this.currentTab.id
        });

        if (response.success) {
          this.isCapturing = false;
          btn.innerHTML = '<span class="icon">🎯</span>开始捕获';
          btn.classList.remove('secondary');
          btn.classList.add('primary');
          this.addLog('info', '停止监听网络请求');
          this.updateStatusDisplay('就绪');
          await this.savePopupState();
        } else {
          throw new Error(response.error);
        }
      } catch (error) {
        this.addLog('error', `停止捕获失败: ${error.message}`);
        console.error('Stop capture error:', error);
      }
    }
  }

  async loadTasks() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_TASKS' });
      if (response.success) {
        this.tasks = response.data;
        this.renderTaskList();
        this.updateTaskStats();
      }
    } catch (error) {
      this.addLog('error', `加载任务失败: ${error.message}`);
    }
  }

  renderTaskList() {
    const taskList = document.getElementById('taskList');
    const emptyState = document.getElementById('emptyState');

    if (this.tasks.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    taskList.innerHTML = this.tasks.map(task => {
      // 安全地获取执行时间
      let executeTimeText = '未设置';
      try {
        if (task.schedule && task.schedule.executeAt) {
          executeTimeText = new Date(task.schedule.executeAt).toLocaleTimeString();
        } else if (task.executeAt) {
          executeTimeText = new Date(task.executeAt).toLocaleTimeString();
        }
      } catch (error) {
        console.warn('Failed to parse execute time for task:', task.id, error);
        executeTimeText = '时间格式错误';
      }

      // 安全地获取统计信息
      const attempts = task.stats ? task.stats.attempts : 0;
      const maxAttempts = task.execution ? task.execution.maxAttempts : 5;

      // 计算倒计时
      let countdownText = '';
      let countdownClass = 'task-countdown normal';
      if (task.schedule && task.schedule.executeAt) {
        const executeTime = new Date(task.schedule.executeAt).getTime();
        const now = Date.now();
        const timeLeft = executeTime - now;
        countdownText = this.formatTimeLeft(timeLeft);

        if (timeLeft < 0) {
          countdownClass = 'task-countdown started';
        } else if (timeLeft < 60000) {
          countdownClass = 'task-countdown urgent';
        } else if (timeLeft < 300000) {
          countdownClass = 'task-countdown soon';
        }
      }

      // 获取任务类型图标
      const typeIcon = this.getTaskTypeIcon(task.type || 'scheduled');
      const priorityBadge = task.priority ? `<span class="priority-badge priority-${task.priority}">P${task.priority}</span>` : '';

      return `
        <div class="task-item" data-task-id="${task.id}">
          <div class="task-info">
            <div class="task-header">
              <span class="task-type-icon">${typeIcon}</span>
              <div class="task-name">${task.name || '未命名任务'}</div>
              ${priorityBadge}
            </div>
            <div class="task-meta">
              <span class="task-status ${task.status}">${this.getStatusText(task.status)}</span>
              <span class="task-time">执行时间: ${executeTimeText}</span>
              <span class="task-attempts">尝试: ${attempts}/${maxAttempts}</span>
              ${countdownText ? `<span class="${countdownClass}">倒计时: ${countdownText}</span>` : ''}
            </div>
            ${task.stats && task.stats.averageResponseTime ?
              `<div class="task-performance">
                <span>平均响应: ${task.stats.averageResponseTime}ms</span>
                <span>成功率: ${((task.stats.successes / Math.max(task.stats.attempts, 1)) * 100).toFixed(1)}%</span>
              </div>` : ''
            }
          </div>
          <div class="task-actions">
            ${this.getTaskActionButtons(task)}
          </div>
        </div>
      `;
    }).join('');

    // 绑定任务操作事件
    this.bindTaskActions();
  }

  getStatusText(status) {
    const statusMap = {
      'pending': '待执行',
      'running': '运行中',
      'completed': '已完成',
      'failed': '失败',
      'cancelled': '已取消'
    };
    return statusMap[status] || status;
  }

  // 任务类型图标（学习美团工具）
  getTaskTypeIcon(type) {
    const iconMap = {
      'seckill': '⚡',      // 秒杀
      'coupon': '🎫',       // 优惠券
      'lottery': '🎰',      // 抽奖
      'scheduled': '⏰',    // 定时任务
      'immediate': '🚀',    // 立即执行
      'recurring': '🔄'     // 循环任务
    };
    return iconMap[type] || '📋';
  }

  getTaskActionButtons(task) {
    switch (task.status) {
      case 'pending':
        return `
          <button class="task-btn start" data-action="start">启动</button>
          <button class="task-btn edit" data-action="edit">编辑</button>
          <button class="task-btn delete" data-action="delete">删除</button>
        `;
      case 'running':
        return `
          <button class="task-btn stop" data-action="stop">停止</button>
          <button class="task-btn delete" data-action="delete">删除</button>
        `;
      case 'completed':
      case 'failed':
      case 'cancelled':
      case 'created':
        return `
          <button class="task-btn start" data-action="restart">重启</button>
          <button class="task-btn edit" data-action="edit">编辑</button>
          <button class="task-btn delete" data-action="delete">删除</button>
        `;
      default:
        return `
          <button class="task-btn delete" data-action="delete">删除</button>
        `;
    }
  }

  bindTaskActions() {
    document.querySelectorAll('.task-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const action = e.target.dataset.action;
        const taskId = e.target.closest('.task-item').dataset.taskId;
        await this.handleTaskAction(taskId, action);
      });
    });
  }

  async handleTaskAction(taskId, action) {
    try {
      switch (action) {
        case 'start':
        case 'restart':
          await chrome.runtime.sendMessage({ type: 'START_TASK', taskId });
          this.addLog('info', `任务 ${taskId} 已启动`);
          break;
        case 'stop':
          await chrome.runtime.sendMessage({ type: 'STOP_TASK', taskId });
          this.addLog('info', `任务 ${taskId} 已停止`);
          break;
        case 'edit':
          await this.editTask(taskId);
          break;
        case 'delete':
          await this.deleteTask(taskId);
          break;
      }
      await this.loadTasks(); // 刷新任务列表
    } catch (error) {
      this.addLog('error', `任务操作失败: ${error.message}`);
    }
  }

  async editTask(taskId) {
    try {
      const task = this.tasks.find(t => t.id === taskId);
      if (task) {
        this.showTaskModal(task);
      } else {
        this.addLog('error', `任务 ${taskId} 不存在`);
      }
    } catch (error) {
      this.addLog('error', `编辑任务失败: ${error.message}`);
    }
  }

  async deleteTask(taskId) {
    try {
      if (confirm('确定要删除这个任务吗？')) {
        const response = await chrome.runtime.sendMessage({
          type: 'DELETE_TASK',
          taskId: taskId
        });

        if (response.success) {
          this.addLog('info', `任务 ${taskId} 已删除`);
          await this.loadTasks();
        } else {
          throw new Error(response.error || '删除失败');
        }
      }
    } catch (error) {
      this.addLog('error', `删除任务失败: ${error.message}`);
    }
  }

  updateTaskStats() {
    const total = this.tasks.length;
    const running = this.tasks.filter(t => t.status === 'running').length;
    const pending = this.tasks.filter(t => t.status === 'pending').length;
    const completed = this.tasks.filter(t => t.status === 'completed').length;

    document.getElementById('totalTasks').textContent = total;
    document.getElementById('runningTasks').textContent = running;

    // 更新详细统计（如果元素存在）
    const pendingElement = document.getElementById('pendingTasks');
    const completedElement = document.getElementById('completedTasks');
    if (pendingElement) pendingElement.textContent = pending;
    if (completedElement) completedElement.textContent = completed;
  }

  // 动态倒计时显示（学习美团工具）
  formatTimeLeft(milliseconds) {
    if (milliseconds < 0) return '已开始';

    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分${seconds}秒`;
    } else {
      return `${seconds}秒`;
    }
  }

  // 启动实时倒计时更新（学习美团工具）
  startCountdownUpdates() {
    // 每秒更新倒计时
    setInterval(() => {
      this.updateTaskCountdowns();
    }, 1000);
  }

  updateTaskCountdowns() {
    const taskItems = document.querySelectorAll('.task-item');
    taskItems.forEach((item, index) => {
      const task = this.tasks[index];
      if (!task) return;

      const countdownElement = item.querySelector('.task-countdown');
      if (countdownElement && task.schedule && task.schedule.executeAt) {
        const executeTime = new Date(task.schedule.executeAt).getTime();
        const now = Date.now();
        const timeLeft = executeTime - now;

        countdownElement.textContent = this.formatTimeLeft(timeLeft);

        // 安全的样式更新
        try {
          // 根据剩余时间改变样式
          if (timeLeft < 0) {
            countdownElement.className = 'task-countdown started';
          } else if (timeLeft < 60000) { // 小于1分钟
            countdownElement.className = 'task-countdown urgent';
          } else if (timeLeft < 300000) { // 小于5分钟
            countdownElement.className = 'task-countdown soon';
          } else {
            countdownElement.className = 'task-countdown normal';
          }
        } catch (e) {
          // 忽略样式更新错误
          console.warn('样式更新失败:', e);
        }
      }
    });
  }

  showTaskModal(taskData = null) {
    const modal = document.getElementById('taskModal');
    const title = document.getElementById('modalTitle');
    
    if (taskData) {
      title.textContent = '编辑任务';
      this.fillTaskForm(taskData);
    } else {
      title.textContent = '创建新任务';
      this.clearTaskForm();
    }
    
    modal.classList.add('show');
  }

  hideTaskModal() {
    document.getElementById('taskModal').classList.remove('show');
  }

  fillTaskForm(taskData) {
    document.getElementById('taskName').value = taskData.name || '';

    // 安全地获取请求信息
    const request = taskData.request || {};
    document.getElementById('taskUrl').value = request.url || taskData.url || '';
    document.getElementById('taskMethod').value = request.method || taskData.method || 'POST';

    // 安全地获取执行时间
    let executeTime = null;
    if (taskData.schedule && taskData.schedule.executeAt) {
      executeTime = taskData.schedule.executeAt;
    } else if (taskData.executeAt) {
      executeTime = taskData.executeAt;
    }

    if (executeTime) {
      document.getElementById('executeTime').value = this.formatDateTimeLocal(executeTime);
    } else {
      // 设置默认时间为1分钟后
      const defaultTime = new Date(Date.now() + 60000);
      document.getElementById('executeTime').value = this.formatDateTimeLocal(defaultTime);
    }

    // 安全地获取执行配置
    const execution = taskData.execution || {};
    document.getElementById('maxAttempts').value = execution.maxAttempts || 5;
    document.getElementById('intervalMs').value = execution.intervalMs || 100;

    // 安全地获取请求头和请求体
    const headers = request.headers || taskData.headers || {};
    const body = request.body || taskData.body || {};

    document.getElementById('requestHeaders').value = JSON.stringify(headers, null, 2);
    document.getElementById('requestBody').value = JSON.stringify(body, null, 2);
  }

  clearTaskForm() {
    document.getElementById('taskForm').reset();
    // 设置默认执行时间为1分钟后
    const defaultTime = new Date(Date.now() + 60000);
    document.getElementById('executeTime').value = this.formatDateTimeLocal(defaultTime);
  }

  formatDateTimeLocal(date) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  async saveTask() {
    try {
      const formData = this.getTaskFormData();
      console.log('🔥 发送创建任务消息:', formData);

      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_TASK',
        data: formData
      });

      console.log('📨 收到响应:', response);

      if (response && response.success) {
        this.addLog('success', `任务 "${formData.name}" 创建成功`);
        this.hideTaskModal();
        await this.loadTasks();
      } else {
        const errorMsg = response ? response.error : '未收到响应';
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('🚨 Save task error:', error);
      this.addLog('error', `保存任务失败: ${error.message}`);

      // 检查是否是连接问题
      if (error.message.includes('Receiving end does not exist')) {
        this.addLog('error', '🚨 插件连接断开，请重新加载插件！');
      }
    }
  }

  getTaskFormData() {
    return {
      name: document.getElementById('taskName').value,
      url: document.getElementById('taskUrl').value,
      method: document.getElementById('taskMethod').value,
      executeAt: document.getElementById('executeTime').value,
      maxAttempts: parseInt(document.getElementById('maxAttempts').value),
      intervalMs: parseInt(document.getElementById('intervalMs').value),
      headers: this.parseJSON(document.getElementById('requestHeaders').value),
      body: this.parseJSON(document.getElementById('requestBody').value),
      website: this.currentTab ? new URL(this.currentTab.url).hostname : 'unknown'
    };
  }

  parseJSON(str) {
    try {
      return str ? JSON.parse(str) : {};
    } catch {
      return {};
    }
  }

  async testTask() {
    try {
      const formData = this.getTaskFormData();
      const response = await chrome.runtime.sendMessage({
        type: 'EXECUTE_IMMEDIATE',
        data: formData
      });
      
      if (response.success) {
        this.addLog('success', `测试成功: ${response.result.statusCode}`);
      } else {
        this.addLog('error', `测试失败: ${response.result.error}`);
      }
    } catch (error) {
      this.addLog('error', `测试请求失败: ${error.message}`);
    }
  }

  showTaskSuggestion(suggestionData) {
    const modal = document.getElementById('suggestionModal');
    const details = document.getElementById('suggestionDetails');
    
    details.innerHTML = `
      <div><strong>网站:</strong> ${suggestionData.website}</div>
      <div><strong>URL:</strong> ${suggestionData.url}</div>
      <div><strong>方法:</strong> ${suggestionData.method}</div>
      <div><strong>置信度:</strong> ${(suggestionData.confidence * 100).toFixed(0)}%</div>
      <div><strong>建议时间:</strong> ${new Date(suggestionData.suggestedTime).toLocaleString()}</div>
    `;
    
    this.currentSuggestion = suggestionData;
    modal.classList.add('show');
  }

  hideSuggestionModal() {
    document.getElementById('suggestionModal').classList.remove('show');
    this.currentSuggestion = null;
  }

  acceptSuggestion() {
    if (this.currentSuggestion) {
      this.showTaskModal(this.currentSuggestion);
      this.hideSuggestionModal();
    }
  }

  updateStatusDisplay(status = '就绪') {
    document.querySelector('.status-text').textContent = status;
  }

  addLog(level, message) {
    const logContainer = document.getElementById('logContainer');
    const time = new Date().toLocaleTimeString();

    const logItem = document.createElement('div');
    logItem.className = `log-item ${level}`;
    logItem.innerHTML = `
      <span class="log-time">${time}</span>
      <span class="log-message">${message}</span>
    `;

    logContainer.appendChild(logItem);
    logContainer.scrollTop = logContainer.scrollHeight;

    // 保存日志到存储
    this.saveLogToStorage(level, message, time);

    // 限制日志数量
    const logs = logContainer.children;
    if (logs.length > 50) {
      logContainer.removeChild(logs[0]);
    }
  }

  async saveLogToStorage(level, message, time) {
    try {
      const result = await chrome.storage.local.get(['popup_logs']);
      let logs = result.popup_logs || [];

      logs.push({ level, message, time, timestamp: Date.now() });

      // 限制存储的日志数量
      if (logs.length > 100) {
        logs = logs.slice(-100);
      }

      await chrome.storage.local.set({ popup_logs: logs });
    } catch (error) {
      console.error('Failed to save log:', error);
    }
  }

  async restoreLogs() {
    try {
      const result = await chrome.storage.local.get(['popup_logs']);
      const logs = result.popup_logs || [];

      const logContainer = document.getElementById('logContainer');
      logContainer.innerHTML = '';

      // 只显示最近的20条日志
      const recentLogs = logs.slice(-20);

      recentLogs.forEach(log => {
        const logItem = document.createElement('div');
        logItem.className = `log-item ${log.level}`;
        logItem.innerHTML = `
          <span class="log-time">${log.time}</span>
          <span class="log-message">${log.message}</span>
        `;
        logContainer.appendChild(logItem);
      });

      logContainer.scrollTop = logContainer.scrollHeight;

      if (recentLogs.length === 0) {
        this.addLog('info', '插件已启动，等待操作...');
      }
    } catch (error) {
      console.error('Failed to restore logs:', error);
      this.addLog('info', '插件已启动，等待操作...');
    }
  }

  async restorePopupState() {
    try {
      const result = await chrome.storage.local.get(['popup_state']);
      const state = result.popup_state || {};

      // 恢复捕获状态
      if (state.isCapturing) {
        this.isCapturing = true;
        const btn = document.getElementById('startCaptureBtn');
        if (btn) {
          btn.innerHTML = '<span class="icon">⏹️</span>停止捕获';
          btn.classList.remove('primary');
          btn.classList.add('secondary');
        }
        this.updateStatusDisplay('监听中');
      }
    } catch (error) {
      console.error('Failed to restore popup state:', error);
    }
  }

  async savePopupState() {
    try {
      const state = {
        isCapturing: this.isCapturing,
        timestamp: Date.now()
      };
      await chrome.storage.local.set({ popup_state: state });
    } catch (error) {
      console.error('Failed to save popup state:', error);
    }
  }

  clearLogs() {
    document.getElementById('logContainer').innerHTML = '';
    this.addLog('info', '日志已清空');
  }

  async clearAllTasks() {
    try {
      if (confirm('确定要清空所有任务吗？此操作不可恢复！')) {
        // 删除所有任务
        for (const task of this.tasks) {
          await chrome.runtime.sendMessage({
            type: 'DELETE_TASK',
            taskId: task.id
          });
        }

        this.addLog('info', '所有任务已清空');
        await this.loadTasks();
      }
    } catch (error) {
      this.addLog('error', `清空任务失败: ${error.message}`);
    }
  }

  async importTask() {
    // 简单的导入功能，从剪贴板读取cURL命令
    try {
      const text = await navigator.clipboard.readText();
      if (text.startsWith('curl ')) {
        const taskData = this.parseCurlCommand(text);
        this.showTaskModal(taskData);
      } else {
        this.addLog('warning', '剪贴板中没有找到有效的cURL命令');
      }
    } catch (error) {
      this.addLog('error', `导入失败: ${error.message}`);
    }
  }

  parseCurlCommand(curlCommand) {
    // 简化的cURL解析（实际应该更完善）
    const urlMatch = curlCommand.match(/curl\s+['"]?([^'">\s]+)/);
    const methodMatch = curlCommand.match(/-X\s+(\w+)/);
    
    return {
      name: '导入的任务',
      url: urlMatch ? urlMatch[1] : '',
      method: methodMatch ? methodMatch[1] : 'GET',
      headers: {},
      body: {}
    };
  }

  showAbout() {
    alert('Universal Coupon Grabber v1.1.0\n\n通用抢券助手，支持各大网站的优惠券抢购和活动报名自动化。');
  }

  openIndependentWindow() {
    // 创建独立窗口
    chrome.windows.create({
      url: chrome.runtime.getURL('popup/popup.html'),
      type: 'popup',
      width: 400,
      height: 600,
      focused: true
    }, (window) => {
      console.log('Independent window created:', window.id);
    });
  }
}

// 初始化弹窗管理器
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
