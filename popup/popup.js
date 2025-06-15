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
    
    // 初始化UI事件监听
    this.setupEventListeners();
    
    // 加载任务列表
    await this.loadTasks();
    
    // 设置消息监听
    this.setupMessageListeners();
    
    // 更新状态显示
    this.updateStatusDisplay();
    
    // 添加初始日志
    this.addLog('info', '插件已启动，等待操作...');
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
        await chrome.tabs.sendMessage(this.currentTab.id, { type: 'START_CAPTURE' });
        this.isCapturing = true;
        btn.innerHTML = '<span class="icon">⏹️</span>停止捕获';
        btn.classList.remove('primary');
        btn.classList.add('secondary');
        this.addLog('info', '开始监听网络请求...');
        this.updateStatusDisplay('监听中');
      } catch (error) {
        this.addLog('error', `启动捕获失败: ${error.message}`);
      }
    } else {
      // 停止捕获
      try {
        await chrome.tabs.sendMessage(this.currentTab.id, { type: 'STOP_CAPTURE' });
        this.isCapturing = false;
        btn.innerHTML = '<span class="icon">🎯</span>开始捕获';
        btn.classList.remove('secondary');
        btn.classList.add('primary');
        this.addLog('info', '停止监听网络请求');
        this.updateStatusDisplay('就绪');
      } catch (error) {
        this.addLog('error', `停止捕获失败: ${error.message}`);
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
    
    taskList.innerHTML = this.tasks.map(task => `
      <div class="task-item" data-task-id="${task.id}">
        <div class="task-info">
          <div class="task-name">${task.name}</div>
          <div class="task-meta">
            <span class="task-status ${task.status}">${this.getStatusText(task.status)}</span>
            <span>执行时间: ${new Date(task.schedule.executeAt).toLocaleTimeString()}</span>
            <span>尝试: ${task.stats.attempts}/${task.execution.maxAttempts}</span>
          </div>
        </div>
        <div class="task-actions">
          ${this.getTaskActionButtons(task)}
        </div>
      </div>
    `).join('');
    
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

  getTaskActionButtons(task) {
    switch (task.status) {
      case 'pending':
        return `
          <button class="task-btn start" data-action="start">启动</button>
          <button class="task-btn edit" data-action="edit">编辑</button>
        `;
      case 'running':
        return `
          <button class="task-btn stop" data-action="stop">停止</button>
        `;
      case 'completed':
      case 'failed':
      case 'cancelled':
        return `
          <button class="task-btn start" data-action="restart">重启</button>
          <button class="task-btn edit" data-action="edit">编辑</button>
        `;
      default:
        return '';
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
          this.editTask(taskId);
          break;
      }
      await this.loadTasks(); // 刷新任务列表
    } catch (error) {
      this.addLog('error', `任务操作失败: ${error.message}`);
    }
  }

  updateTaskStats() {
    const total = this.tasks.length;
    const running = this.tasks.filter(t => t.status === 'running').length;
    
    document.getElementById('totalTasks').textContent = total;
    document.getElementById('runningTasks').textContent = running;
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
    document.getElementById('taskName').value = taskData.name;
    document.getElementById('taskUrl').value = taskData.request.url;
    document.getElementById('taskMethod').value = taskData.request.method;
    document.getElementById('executeTime').value = this.formatDateTimeLocal(taskData.schedule.executeAt);
    document.getElementById('maxAttempts').value = taskData.execution.maxAttempts;
    document.getElementById('intervalMs').value = taskData.execution.intervalMs;
    document.getElementById('requestHeaders').value = JSON.stringify(taskData.request.headers, null, 2);
    document.getElementById('requestBody').value = JSON.stringify(taskData.request.body, null, 2);
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
      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_TASK',
        data: formData
      });
      
      if (response.success) {
        this.addLog('success', `任务 "${formData.name}" 创建成功`);
        this.hideTaskModal();
        await this.loadTasks();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      this.addLog('error', `保存任务失败: ${error.message}`);
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
    
    // 限制日志数量
    const logs = logContainer.children;
    if (logs.length > 50) {
      logContainer.removeChild(logs[0]);
    }
  }

  clearLogs() {
    document.getElementById('logContainer').innerHTML = '';
    this.addLog('info', '日志已清空');
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
    alert('Universal Coupon Grabber v1.0.0\n\n通用抢券助手，支持各大网站的优惠券抢购和活动报名自动化。');
  }
}

// 初始化弹窗管理器
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
