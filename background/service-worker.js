/**
 * Universal Coupon Grabber - Background Service Worker
 * 核心任务调度和执行引擎
 */

class BackgroundService {
  constructor() {
    this.tasks = new Map();
    this.settings = {};
    this.executionLogs = [];

    this.init();
  }

  async init() {
    console.log('Universal Coupon Grabber - Background Service Started');

    // 加载设置
    await this.loadSettings();

    // 加载任务
    await this.loadTasks();

    // 设置消息监听
    this.setupMessageListeners();

    // 设置定时器监听
    this.setupAlarmListeners();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['ucg_settings']);
      this.settings = result.ucg_settings || this.getDefaultSettings();
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

      // 高精度时间控制（学习美团工具）
      defaultTimeout: 15000,           // 15秒超时
      defaultRetryAttempts: 10,        // 增加到10次重试
      defaultRetryInterval: 50,        // 50毫秒间隔，更激进
      defaultAdvanceTime: 500,         // 提前500毫秒
      enableMillisecondPrecision: true, // 毫秒级精度

      // 智能重试策略（学习美团工具）
      enableSmartRetry: true,          // 智能重试
      retryOnTimeValidationFail: true, // 时间验证失败时重试
      maxConcurrentRequests: 3,        // 并发请求数

      // 请求优化（学习美团工具）
      enableRequestOptimization: true, // 请求优化
      useRealUserAgent: true,          // 使用真实User-Agent
      enableCookieSync: true,          // Cookie同步

      // 高级功能
      enableTimeSync: true,
      timeSyncInterval: 30,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      enableProxy: false,
      enableDebugMode: false,
      enableConsoleLog: true,

      // 日志配置（学习美团工具）
      logDirection: 'bottom',          // 日志显示方向
      enableLogAnimation: true,        // 日志动画效果
      autoScrollLog: true              // 自动滚动日志
    };
  }

  async loadTasks() {
    try {
      const result = await chrome.storage.local.get(['ucg_tasks']);
      const tasks = result.ucg_tasks || [];
      this.tasks.clear();
      tasks.forEach(task => {
        this.tasks.set(task.id, task);
      });
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('🔥 Service Worker收到消息:', message);
      try {
        this.handleMessage(message, sender, sendResponse);
        return true; // 保持消息通道开放
      } catch (error) {
        console.error('🚨 消息处理错误:', error);
        sendResponse({ success: false, error: error.message });
        return true;
      }
    });
    console.log('✅ 消息监听器已设置');
  }

  setupAlarmListeners() {
    chrome.alarms.onAlarm.addListener((alarm) => {
      this.handleAlarm(alarm);
    });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      console.log('Received message:', message.type);

      switch (message.type) {
        case 'GET_SETTINGS':
          sendResponse({ success: true, data: this.settings });
          break;

        case 'SAVE_SETTINGS':
          await this.saveSettings(message.data);
          sendResponse({ success: true });
          break;

        case 'START_CAPTURE':
          const tabId = message.tabId || (sender.tab ? sender.tab.id : null);
          if (tabId) {
            await this.startCapture({ id: tabId });
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'No tab ID provided' });
          }
          break;

        case 'STOP_CAPTURE':
          const stopTabId = message.tabId || (sender.tab ? sender.tab.id : null);
          if (stopTabId) {
            await this.stopCapture({ id: stopTabId });
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'No tab ID provided' });
          }
          break;

        case 'CREATE_TASK':
          try {
            const taskId = await this.createTask(message.data);
            await this.logExecution('info', `任务 "${message.data.name}" 创建成功`, taskId);
            sendResponse({ success: true, taskId });
          } catch (error) {
            await this.logExecution('error', `创建任务失败: ${error.message}`);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'START_TASK':
          await this.startTask(message.taskId);
          sendResponse({ success: true });
          break;

        case 'STOP_TASK':
          await this.stopTask(message.taskId);
          sendResponse({ success: true });
          break;

        case 'GET_TASKS':
          const tasks = Array.from(this.tasks.values());
          sendResponse({ success: true, data: tasks });
          break;

        case 'DELETE_TASK':
          await this.deleteTask(message.taskId);
          sendResponse({ success: true });
          break;

        case 'API_DISCOVERED':
          await this.handleApiDiscovered(message.data, sender.tab);
          sendResponse({ success: true });
          break;

        case 'EXECUTE_IMMEDIATE':
          const result = await this.executeImmediate(message.data);
          sendResponse({ success: true, result });
          break;

        case 'GET_EXECUTION_LOGS':
          const logs = await this.getExecutionLogs(message.taskId);
          sendResponse({ success: true, data: logs });
          break;

        case 'SYNC_TIME_NOW':
          const syncResult = await this.syncTimeNow();
          sendResponse({ success: true, data: syncResult });
          break;

        case 'EXPORT_DATA':
          const exportData = await this.exportData();
          sendResponse({ success: true, data: exportData });
          break;

        case 'IMPORT_DATA':
          await this.importData(message.data);
          sendResponse({ success: true });
          break;

        case 'CLEAR_ALL_DATA':
          await this.clearAllData();
          sendResponse({ success: true });
          break;

        case 'GET_STORAGE_USAGE':
          const usage = await this.getStorageUsage();
          sendResponse({ success: true, data: usage });
          break;

        default:
          console.warn('Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type: ' + message.type });
      }
    } catch (error) {
      console.error('Background service error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    await chrome.storage.local.set({ ucg_settings: this.settings });
    console.log('Settings saved:', this.settings);
  }

  async startCapture(tab) {
    console.log('Starting capture for tab:', tab.id);

    // 向content script发送开始捕获消息
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'START_NETWORK_CAPTURE'
      });
      console.log('Capture started successfully');
    } catch (error) {
      console.error('Failed to start capture:', error);
      throw new Error('无法启动网络捕获，请刷新页面后重试');
    }
  }

  async stopCapture(tab) {
    console.log('Stopping capture for tab:', tab.id);

    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'STOP_NETWORK_CAPTURE'
      });
      console.log('Capture stopped successfully');
    } catch (error) {
      console.error('Failed to stop capture:', error);
    }
  }

  async createTask(taskData) {
    const task = {
      id: this.generateTaskId(),
      name: taskData.name || this.generateSmartTaskName(taskData),
      type: this.detectTaskType(taskData),
      status: 'pending',
      priority: taskData.priority || 5,

      // 请求配置
      request: {
        url: taskData.url,
        method: taskData.method || 'POST',
        headers: this.enhanceRequestHeaders(taskData.headers || {}),
        body: taskData.body || {},
        website: this.extractWebsite(taskData.url)
      },

      // 调度配置 - 高精度时间解析（学习美团工具）
      schedule: {
        executeAt: this.parseHighPrecisionTime(taskData.executeAt),
        timezone: taskData.timezone || 'Asia/Shanghai',
        advanceMs: taskData.advanceMs || 500,
        originalTimeString: taskData.executeAt,
        timeMode: taskData.timeMode || 'advance' // original, advance, custom
      },

      // 执行配置 - 基于美团工具优化
      execution: {
        maxAttempts: taskData.maxAttempts || 10,
        intervalMs: taskData.intervalMs || 50,
        timeoutMs: taskData.timeoutMs || 15000,
        concurrency: taskData.concurrency || 1,
        enableSmartRetry: true,
        retryOnTimeValidationFail: true
      },

      // 成功条件 - 智能检测
      successCondition: this.generateSuccessCondition(taskData),

      // 统计信息 - 增强版
      stats: {
        attempts: 0,
        successes: 0,
        failures: 0,
        timeValidationFailures: 0,
        lastExecuted: null,
        lastResult: null,
        averageResponseTime: 0,
        fastestResponse: null,
        slowestResponse: null
      },

      // 元数据
      metadata: {
        discoveredAt: Date.now(),
        source: taskData.source || 'manual',
        confidence: taskData.confidence || 1.0,
        category: this.categorizeTask(taskData)
      },

      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.tasks.set(task.id, task);
    await this.saveTasks();

    await this.logExecution('success', `✅ 智能任务创建: ${task.name} (${task.type}模式)`, task.id);
    console.log('Smart task created:', task.id, task);
    return task.id;
  }

  // 智能任务名称生成（学习美团工具）
  generateSmartTaskName(taskData) {
    const url = taskData.url || '';
    const time = taskData.executeAt || '';

    if (url.includes('jd.com') || url.includes('京东')) {
      const timeStr = time.split(':').slice(0, 2).join(':');
      return `京东${timeStr}抢券`;
    } else if (url.includes('meituan.com') || url.includes('美团')) {
      return `美团外卖抢券`;
    } else if (url.includes('pinduoduo.com') || url.includes('拼多多')) {
      return `拼多多抢券`;
    } else if (url.includes('taobao.com') || url.includes('淘宝')) {
      return `淘宝抢券`;
    }

    return `智能抢券任务`;
  }

  // 任务类型检测（学习美团工具）
  detectTaskType(taskData) {
    const url = taskData.url || '';

    if (url.includes('seckill') || url.includes('secKill') || url.includes('秒杀')) {
      return 'seckill';
    } else if (url.includes('lottery') || url.includes('抽奖')) {
      return 'lottery';
    } else if (url.includes('coupon') || url.includes('券')) {
      return 'coupon';
    }

    return 'scheduled';
  }

  // 增强请求头（学习美团工具）
  enhanceRequestHeaders(headers) {
    const enhanced = {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site',
      ...headers
    };

    return enhanced;
  }

  // 网站提取
  extractWebsite(url) {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '');
    } catch (e) {
      return 'unknown';
    }
  }

  // 智能成功条件生成
  generateSuccessCondition(taskData) {
    const url = taskData.url || '';

    if (url.includes('jd.com')) {
      return {
        type: 'response_content',
        conditions: [
          { field: 'code', operator: 'equals', value: '0' },
          { field: 'msg', operator: 'equals', value: '成功' }
        ]
      };
    } else if (url.includes('meituan.com')) {
      return {
        type: 'response_content',
        conditions: [
          { field: 'code', operator: 'equals', value: 0 },
          { field: 'msg', operator: 'not_contains', value: '失败' }
        ]
      };
    }

    return {
      type: 'status_code',
      value: 200
    };
  }

  // 任务分类
  categorizeTask(taskData) {
    const url = taskData.url || '';

    if (url.includes('jd.com')) return 'jd_coupon';
    if (url.includes('meituan.com')) return 'meituan_coupon';
    if (url.includes('pinduoduo.com')) return 'pdd_coupon';
    if (url.includes('taobao.com')) return 'taobao_coupon';

    return 'general';
  }

  async startTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    task.status = 'running';
    task.updatedAt = Date.now();

    this.tasks.set(taskId, task);
    await this.saveTasks();

    // 设置定时执行
    await this.scheduleTask(task);

    console.log('Task started:', taskId);
  }

  async scheduleTask(task) {
    try {
      // 获取执行时间
      let executeAt = null;
      if (task.schedule && task.schedule.executeAt) {
        executeAt = new Date(task.schedule.executeAt);
      } else if (task.executeAt) {
        executeAt = new Date(task.executeAt);
      }

      if (!executeAt || isNaN(executeAt.getTime())) {
        console.warn('Invalid execute time, executing immediately');
        await this.executeTask(task.id);
        return;
      }

      const now = new Date();
      // 应用提前量（默认500毫秒）
      const advanceMs = task.schedule?.advanceMs || 500;
      const delay = executeAt.getTime() - now.getTime() - advanceMs;

      await this.logExecution('info', `任务 ${task.name} 计划在 ${executeAt.toLocaleTimeString()} 执行（提前${advanceMs}ms）`, task.id);

      if (delay <= 0) {
        // 时间已过或即将到达，立即执行
        console.log('Execute time has passed or is imminent, executing immediately');
        await this.executeTaskWithRetry(task.id);
      } else if (delay > 2147483647) {
        // 超过setTimeout最大值，使用alarm
        const alarmName = `task_${task.id}`;
        await chrome.alarms.create(alarmName, { when: executeAt.getTime() - advanceMs });
        console.log(`Scheduled task ${task.id} with alarm in ${delay}ms`);
      } else {
        // 使用setTimeout，支持毫秒级精度
        setTimeout(() => {
          this.executeTaskWithRetry(task.id);
        }, delay);
        console.log(`Scheduled task ${task.id} with timeout in ${delay}ms (${(delay/1000).toFixed(3)}s)`);
      }
    } catch (error) {
      console.error('Failed to schedule task:', error);
      await this.logExecution('error', `任务调度失败: ${error.message}`, task.id);
      // 如果调度失败，立即执行
      await this.executeTaskWithRetry(task.id);
    }
  }

  async stopTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    task.status = 'stopped';
    task.updatedAt = Date.now();

    this.tasks.set(taskId, task);
    await this.saveTasks();

    console.log('Task stopped:', taskId);
  }

  async deleteTask(taskId) {
    this.tasks.delete(taskId);
    await this.saveTasks();
    console.log('Task deleted:', taskId);
  }

  async saveTasks() {
    const tasks = Array.from(this.tasks.values());
    await chrome.storage.local.set({ ucg_tasks: tasks });
  }

  generateTaskId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // 高精度时间解析（学习美团工具）
  parseHighPrecisionTime(timeStr) {
    if (!timeStr) {
      return new Date().toISOString();
    }

    // 如果已经是ISO字符串，直接返回
    if (timeStr.includes('T') || timeStr.includes('Z')) {
      return new Date(timeStr).toISOString();
    }

    // 支持多种时间格式：HH:MM:SS:mmm, HH:MM:SS, HH:MM
    let [hours, minutes, seconds, ms] = [0, 0, 0, 0];
    const parts = timeStr.split(':');

    if (parts.length >= 2) {
      hours = parseInt(parts[0], 10) || 0;
      minutes = parseInt(parts[1], 10) || 0;
    }
    if (parts.length >= 3) {
      seconds = parseInt(parts[2], 10) || 0;
    }
    if (parts.length >= 4) {
      ms = parseInt(parts[3], 10) || 0;
    }

    // 创建今天的目标时间
    const targetTime = new Date();
    targetTime.setHours(hours);
    targetTime.setMinutes(minutes);
    targetTime.setSeconds(seconds);
    targetTime.setMilliseconds(ms);

    // 如果目标时间已过，设置为明天
    const now = new Date();
    if (targetTime.getTime() <= now.getTime()) {
      targetTime.setDate(targetTime.getDate() + 1);
    }

    return targetTime.toISOString();
  }

  // 获取当前时间（学习美团工具的时间格式）
  getCurrentTimeString() {
    const date = new Date();
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const second = date.getSeconds().toString().padStart(2, '0');
    const milliSeconds = date.getMilliseconds().toString().padStart(3, '0');
    return `${hour}:${minute}:${second}:${milliSeconds}`;
  }

  // 🔥 革命性辅助方法集合

  // 随机User-Agent生成器
  getRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
      'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  // 会话ID生成器
  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
  }

  // 请求序列号
  getRequestSequence() {
    if (!this.requestSequence) this.requestSequence = 0;
    return ++this.requestSequence;
  }

  // 请求ID生成器
  generateRequestId() {
    return 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
  }

  // URL工具方法
  getOriginFromUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.origin;
    } catch (e) {
      return 'https://m.jd.com';
    }
  }

  getRefererFromUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.origin + '/';
    } catch (e) {
      return 'https://pro.m.jd.com/';
    }
  }

  // 哈希生成器
  async generateHash(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // WebGL指纹生成（Service Worker兼容）
  async generateWebGLFingerprint() {
    try {
      // Service Worker环境下生成模拟WebGL指纹
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      return `webgl_sw_${timestamp}_${random}`;
    } catch (e) {
      return 'webgl_sw_fallback';
    }
  }

  // Canvas指纹生成（Service Worker兼容）
  async generateCanvasFingerprint() {
    try {
      // Service Worker环境下生成模拟Canvas指纹
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      return `canvas_sw_${timestamp}_${random}`;
    } catch (e) {
      return 'canvas_sw_fallback';
    }
  }

  // 音频指纹生成（Service Worker兼容）
  async generateAudioFingerprint() {
    try {
      // Service Worker环境下生成模拟音频指纹
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      return `audio_sw_${timestamp}_${random}`;
    } catch (e) {
      return 'audio_sw_fallback';
    }
  }

  // 快速指纹生成
  async generateQuickFingerprint() {
    return 'quick_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
  }

  // 🔥 革命性特性4: 智能结果选择
  selectBestResult(results) {
    if (results.length === 0) {
      throw new Error('所有攻击路径都失败了');
    }

    // 优先选择成功的结果
    const successResults = results.filter(r => r.success && r.status === 200);
    if (successResults.length > 0) {
      // 选择最快的成功结果
      return successResults.reduce((fastest, current) =>
        current.timestamp < fastest.timestamp ? current : fastest
      );
    }

    // 如果没有成功结果，选择状态码最好的
    return results.reduce((best, current) =>
      current.status < best.status ? current : best
    );
  }

  async handleApiDiscovered(data, tab) {
    console.log('API discovered:', data);

    // 创建任务建议
    const suggestion = {
      name: `自动发现 - ${tab.title}`,
      url: data.request.url,
      method: data.request.method,
      headers: data.request.headers,
      body: data.request.body,
      website: data.website,
      confidence: data.analysis.confidence,
      category: data.analysis.category,
      discoveredAt: Date.now()
    };

    // 通知popup显示建议
    try {
      await chrome.runtime.sendMessage({
        type: 'TASK_SUGGESTION',
        data: suggestion,
        tabId: tab.id
      });
    } catch (error) {
      console.log('No popup to notify, storing suggestion');
    }
  }

  async executeImmediate(taskData) {
    console.log('🚀 执行革命性请求:', taskData.url);

    try {
      // 🔥 革命性特性1: 动态指纹生成系统
      const dynamicFingerprint = await this.generateAdvancedFingerprint();

      // 🔥 革命性特性2: 智能请求伪装
      const disguisedRequest = await this.createDisguisedRequest(taskData, dynamicFingerprint);

      // 🔥 革命性特性3: 多路径并发攻击
      const results = await this.executeMultiPathAttack(disguisedRequest);

      // 🔥 革命性特性4: 智能结果选择
      const bestResult = this.selectBestResult(results);

      await this.logExecution('success', `🎯 革命性执行完成: ${bestResult.status} (${results.length}路径)`, taskData.taskId);
      return bestResult;

    } catch (error) {
      console.error('Revolutionary execution failed:', error);
      throw error;
    }
  }

  // 🔥 融合美团H5guard + RequestManager的终极指纹系统
  async generateAdvancedFingerprint() {
    let fingerprint = {
      // 基础指纹
      timestamp: Date.now(),
      random: Math.random().toString(36).substring(2, 15),

      // 浏览器指纹（Service Worker兼容）
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Chrome/120.0.0.0',
      language: typeof navigator !== 'undefined' ? navigator.language : 'zh-CN',
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'Win32',
      cookieEnabled: typeof navigator !== 'undefined' ? navigator.cookieEnabled : true,

      // 屏幕指纹（Service Worker兼容）
      screenWidth: typeof screen !== 'undefined' ? screen.width : 1920,
      screenHeight: typeof screen !== 'undefined' ? screen.height : 1080,
      colorDepth: typeof screen !== 'undefined' ? screen.colorDepth : 24,
      pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,

      // 时区指纹（Service Worker兼容）
      timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Shanghai',
      timezoneOffset: new Date().getTimezoneOffset(),

      // 动态变化指纹 (每次不同)
      sessionId: this.generateSessionId(),
      requestSequence: this.getRequestSequence(),

      // 高级反检测指纹
      webglFingerprint: await this.generateWebGLFingerprint(),
      canvasFingerprint: await this.generateCanvasFingerprint(),
      audioFingerprint: await this.generateAudioFingerprint()
    };

    // 🔥 融合美团H5guard系统
    try {
      // 尝试使用页面的H5guard系统
      const h5guardFingerprint = await this.getH5guardFingerprint();
      if (h5guardFingerprint) {
        fingerprint.h5guard = h5guardFingerprint;
        fingerprint.h5guardAvailable = true;
      }
    } catch (e) {
      fingerprint.h5guardAvailable = false;
    }

    // 生成最终指纹哈希
    const fingerprintString = JSON.stringify(fingerprint);
    const hash = await this.generateHash(fingerprintString);

    return {
      fingerprint: hash,
      components: fingerprint,
      generated: Date.now(),
      h5guardEnabled: fingerprint.h5guardAvailable
    };
  }

  // 🔥 美团H5guard指纹获取（核心精华）
  async getH5guardFingerprint() {
    return new Promise((resolve) => {
      // 注入脚本到页面获取H5guard指纹
      const script = document.createElement('script');
      script.textContent = `
        (function() {
          try {
            if (typeof window.H5guard !== 'undefined' && window.H5guard.getfp) {
              const fp = window.H5guard.getfp();
              window.postMessage({
                type: 'H5GUARD_FINGERPRINT',
                fingerprint: fp
              }, '*');
            } else {
              window.postMessage({
                type: 'H5GUARD_FINGERPRINT',
                error: 'H5guard not available'
              }, '*');
            }
          } catch (e) {
            window.postMessage({
              type: 'H5GUARD_FINGERPRINT',
              error: e.message
            }, '*');
          }
        })();
      `;

      // 监听消息
      const messageHandler = (event) => {
        if (event.data.type === 'H5GUARD_FINGERPRINT') {
          window.removeEventListener('message', messageHandler);
          document.head.removeChild(script);

          if (event.data.fingerprint) {
            resolve(event.data.fingerprint);
          } else {
            resolve(null);
          }
        }
      };

      window.addEventListener('message', messageHandler);
      document.head.appendChild(script);

      // 超时处理
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        if (script.parentNode) {
          document.head.removeChild(script);
        }
        resolve(null);
      }, 1000);
    });
  }

  // 🔥 融合美团H5guard签名的终极请求伪装系统
  async createDisguisedRequest(taskData, fingerprint) {
    // 准备请求体
    let requestBody = null;
    if (taskData.method !== 'GET' && taskData.body) {
      if (typeof taskData.body === 'string') {
        requestBody = taskData.body;
      } else {
        requestBody = JSON.stringify(taskData.body);
      }
    }

    // 🔥 美团风格的请求数据准备
    let requestData = null;
    if (taskData.method === 'POST' && requestBody) {
      try {
        // 尝试解析为JSON
        requestData = JSON.parse(requestBody);
      } catch (e) {
        // 如果不是JSON，按表单数据处理
        requestData = this.parseFormData(requestBody);
      }

      // 🔥 添加美团风格的指纹数据
      if (fingerprint.h5guardEnabled && fingerprint.components.h5guard) {
        requestData.mtFingerprint = fingerprint.components.h5guard;
        requestData.fpPlatform = 13;
        requestData.cType = 'wx_wallet';
      }
    }

    // 🎯 超级伪装请求头 (融合美团+RequestManager)
    const headers = {
      // 基础头部
      'User-Agent': this.getRandomUserAgent(),
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',

      // 安全头部
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site',

      // 动态指纹头部
      'X-Fingerprint': fingerprint.fingerprint,
      'X-Request-ID': this.generateRequestId(),
      'X-Timestamp': Date.now().toString(),
      'X-H5guard-Available': fingerprint.h5guardEnabled.toString(),

      // 反检测头部
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': this.getOriginFromUrl(taskData.url),
      'Referer': this.getRefererFromUrl(taskData.url),

      // 自定义头部
      ...taskData.headers
    };

    // 🔥 美团风格的签名处理
    if (fingerprint.h5guardEnabled && requestData) {
      try {
        const signature = await this.generateH5guardSignature(taskData.url, requestData);
        if (signature) {
          headers['mtgsig'] = signature;
        }
      } catch (e) {
        console.warn('H5guard签名生成失败:', e);
      }
    }

    // 智能Content-Type设置
    if (taskData.method === 'POST' && !headers['Content-Type'] && !headers['content-type']) {
      if (typeof taskData.body === 'object' || (requestData && typeof requestData === 'object')) {
        headers['Content-Type'] = 'application/json;charset=UTF-8';
      } else {
        headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
      }
    }

    return {
      url: taskData.url,
      method: taskData.method || 'POST',
      headers: headers,
      body: requestData ? JSON.stringify(requestData) : requestBody,
      credentials: 'include',
      mode: 'cors',
      fingerprint: fingerprint,
      h5guardSigned: fingerprint.h5guardEnabled
    };
  }

  // 🔥 美团H5guard签名生成（核心精华）
  async generateH5guardSignature(url, data) {
    return new Promise((resolve) => {
      // 注入脚本到页面生成签名
      const script = document.createElement('script');
      script.textContent = `
        (function() {
          try {
            if (typeof window.H5guard !== 'undefined' && window.H5guard.sign) {
              const req = {
                url: '${url}',
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'content-type': 'application/json'
                },
                data: ${JSON.stringify(data)}
              };

              window.H5guard.sign(req).then(signRes => {
                window.postMessage({
                  type: 'H5GUARD_SIGNATURE',
                  signature: signRes.headers.mtgsig
                }, '*');
              }).catch(e => {
                window.postMessage({
                  type: 'H5GUARD_SIGNATURE',
                  error: e.message
                }, '*');
              });
            } else {
              window.postMessage({
                type: 'H5GUARD_SIGNATURE',
                error: 'H5guard.sign not available'
              }, '*');
            }
          } catch (e) {
            window.postMessage({
              type: 'H5GUARD_SIGNATURE',
              error: e.message
            }, '*');
          }
        })();
      `;

      // 监听消息
      const messageHandler = (event) => {
        if (event.data.type === 'H5GUARD_SIGNATURE') {
          window.removeEventListener('message', messageHandler);
          document.head.removeChild(script);

          if (event.data.signature) {
            resolve(event.data.signature);
          } else {
            resolve(null);
          }
        }
      };

      window.addEventListener('message', messageHandler);
      document.head.appendChild(script);

      // 超时处理
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        if (script.parentNode) {
          document.head.removeChild(script);
        }
        resolve(null);
      }, 2000);
    });
  }

  // 表单数据解析器
  parseFormData(formString) {
    const data = {};
    const pairs = formString.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key && value) {
        data[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    }
    return data;
  }

  // 🔥 革命性特性3: 多路径并发攻击
  async executeMultiPathAttack(request) {
    const attacks = [];

    // 攻击路径1: 标准请求
    attacks.push(this.executeStandardRequest(request));

    // 攻击路径2: 延迟请求 (避开高峰)
    attacks.push(this.executeDelayedRequest(request, 50));

    // 攻击路径3: 快速连击
    attacks.push(this.executeRapidFire(request, 3));

    // 攻击路径4: 伪装请求
    attacks.push(this.executeMaskedRequest(request));

    // 并发执行所有攻击路径
    const results = await Promise.allSettled(attacks);

    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value)
      .filter(result => result !== null);
  }

  // 标准请求执行
  async executeStandardRequest(request) {
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        credentials: request.credentials,
        mode: request.mode
      });

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text(),
        timestamp: Date.now(),
        success: response.ok,
        path: 'standard'
      };
    } catch (error) {
      return null;
    }
  }

  // 延迟请求执行
  async executeDelayedRequest(request, delayMs) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    return this.executeStandardRequest(request);
  }

  // 快速连击执行
  async executeRapidFire(request, count) {
    const promises = [];
    for (let i = 0; i < count; i++) {
      promises.push(this.executeStandardRequest(request));
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 10)); // 10ms间隔
      }
    }

    const results = await Promise.allSettled(promises);
    const successful = results
      .filter(r => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value);

    return successful.length > 0 ? successful[0] : null;
  }

  // 伪装请求执行
  async executeMaskedRequest(request) {
    const maskedRequest = { ...request };
    maskedRequest.headers = {
      ...request.headers,
      'User-Agent': this.getRandomUserAgent(),
      'X-Fingerprint': await this.generateQuickFingerprint()
    };

    return this.executeStandardRequest(maskedRequest);
  }

  async getExecutionLogs(taskId) {
    try {
      const result = await chrome.storage.local.get(['ucg_execution_logs']);
      let logs = result.ucg_execution_logs || [];

      if (taskId) {
        logs = logs.filter(log => log.taskId === taskId);
      }

      return logs;
    } catch (error) {
      console.error('Failed to get execution logs:', error);
      return [];
    }
  }

  async syncTimeNow() {
    // 简化的时间同步实现
    const serverTime = Date.now(); // 实际应该从服务器获取
    const offset = 0; // 计算时间偏移

    return {
      serverTime: serverTime,
      localTime: Date.now(),
      offset: offset
    };
  }

  async exportData() {
    const data = {
      tasks: Array.from(this.tasks.values()),
      settings: this.settings,
      executionLogs: await this.getExecutionLogs(),
      exportedAt: new Date().toISOString(),
      version: '1.1.0'
    };

    return data;
  }

  async importData(data) {
    if (data.tasks && Array.isArray(data.tasks)) {
      this.tasks.clear();
      data.tasks.forEach(task => {
        this.tasks.set(task.id, task);
      });
      await this.saveTasks();
    }

    if (data.settings) {
      await this.saveSettings(data.settings);
    }
  }

  async clearAllData() {
    await chrome.storage.local.clear();
    this.tasks.clear();
    this.settings = this.getDefaultSettings();
    console.log('All data cleared');
  }

  async getStorageUsage() {
    try {
      const usage = await chrome.storage.local.getBytesInUse();
      return {
        used: usage,
        total: chrome.storage.local.QUOTA_BYTES || 5242880, // 5MB default
        percentage: ((usage / (chrome.storage.local.QUOTA_BYTES || 5242880)) * 100).toFixed(2)
      };
    } catch (error) {
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  async handleAlarm(alarm) {
    if (alarm.name.startsWith('task_')) {
      const taskId = alarm.name.replace('task_', '');
      await this.logExecution('info', `定时器触发，执行任务: ${taskId}`, taskId);
      await this.executeTask(taskId);
    }
  }

  async logExecution(level, message, taskId = null) {
    try {
      const logEntry = {
        level: level,
        message: message,
        taskId: taskId,
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString()
      };

      // 保存到存储
      const result = await chrome.storage.local.get(['ucg_execution_logs']);
      let logs = result.ucg_execution_logs || [];

      logs.unshift(logEntry);

      // 限制日志数量
      if (logs.length > 1000) {
        logs = logs.slice(0, 1000);
      }

      await chrome.storage.local.set({ ucg_execution_logs: logs });

      // 通知popup更新日志
      try {
        chrome.runtime.sendMessage({
          type: 'EXECUTION_LOG',
          level: level,
          message: message,
          taskId: taskId
        });
      } catch (error) {
        // Popup可能未打开，忽略错误
      }

      console.log(`[${level.toUpperCase()}] ${message}`);
    } catch (error) {
      console.error('Failed to log execution:', error);
    }
  }

  async executeTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.error('Task not found for execution:', taskId);
      return;
    }

    console.log('Executing task:', taskId);

    try {
      // 构建执行数据，兼容新旧格式
      const executeData = {
        url: task.request ? task.request.url : task.url,
        method: task.request ? task.request.method : task.method,
        headers: task.request ? task.request.headers : task.headers,
        body: task.request ? task.request.body : task.body
      };

      const result = await this.executeImmediate(executeData);

      // 更新统计信息
      if (task.stats) {
        task.stats.attempts = (task.stats.attempts || 0) + 1;
        task.stats.successes = (task.stats.successes || 0) + 1;
        task.stats.lastExecuted = Date.now();
        task.stats.lastResult = result;
      }

      task.status = 'completed';
      task.lastResult = result;
      task.updatedAt = Date.now();

      this.tasks.set(taskId, task);
      await this.saveTasks();

      await this.logExecution('success', `任务执行成功: ${result.status}`, taskId);
      console.log('Task executed successfully:', taskId);

    } catch (error) {
      console.error('Task execution failed:', error);

      // 更新统计信息
      if (task.stats) {
        task.stats.attempts = (task.stats.attempts || 0) + 1;
        task.stats.failures = (task.stats.failures || 0) + 1;
        task.stats.lastExecuted = Date.now();
      }

      task.status = 'failed';
      task.lastError = error.message;
      task.updatedAt = Date.now();

      this.tasks.set(taskId, task);
      await this.saveTasks();

      await this.logExecution('error', `任务执行失败: ${error.message}`, taskId);
    }
  }

  // 🔥 融合美团+RequestManager的终极重试系统
  async executeTaskWithRetry(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.error('Task not found for execution:', taskId);
      return;
    }

    // 🔥 RequestManager风格的重试配置
    const retryConfig = {
      maxAttempts: task.execution?.maxAttempts || 10,
      intervalMs: task.execution?.intervalMs || 50,
      successCondition: task.execution?.successCondition || 'response.status_code == 200',
      stopCondition: task.execution?.stopCondition || 'response.status_code == 404',
      exponentialBackoff: task.execution?.exponentialBackoff || false,
      maxInterval: task.execution?.maxInterval || 5000
    };

    let attempts = 0;
    let success = false;
    let timeValidationFailures = 0;
    let currentInterval = retryConfig.intervalMs;

    await this.logExecution('info', `🚀 启动终极重试系统: ${task.name} (最多${retryConfig.maxAttempts}次)`, taskId);

    while (attempts < retryConfig.maxAttempts && !success && task.status === 'running') {
      attempts++;
      const startTime = performance.now();

      try {
        // 🔥 融合美团的指纹系统
        const fingerprint = await this.generateAdvancedFingerprint();

        // 构建执行数据
        const executeData = {
          url: task.request ? task.request.url : task.url,
          method: task.request ? task.request.method : task.method,
          headers: {
            ...task.request ? task.request.headers : task.headers,
            'X-Fingerprint': fingerprint.fingerprint,
            'X-H5guard-Available': fingerprint.h5guardEnabled.toString()
          },
          body: task.request ? task.request.body : task.body,
          taskId: taskId
        };

        const result = await this.executeImmediate(executeData);
        const responseTime = performance.now() - startTime;

        // 更新统计信息
        if (task.stats) {
          task.stats.attempts = (task.stats.attempts || 0) + 1;
          task.stats.lastExecuted = Date.now();
          task.stats.lastResult = result;
          task.stats.averageResponseTime = this.updateAverageResponseTime(
            task.stats.averageResponseTime,
            responseTime,
            task.stats.attempts
          );
        }

        // 🔥 RequestManager风格的条件验证
        const validation = await this.validateResponse(result, retryConfig);

        if (validation.isSuccess) {
          success = true;
          if (task.stats) {
            task.stats.successes = (task.stats.successes || 0) + 1;
          }
          task.status = 'completed';
          task.lastResult = result;
          await this.logExecution('success', `🎉 终极成功! 第${attempts}次尝试 (${responseTime.toFixed(2)}ms)`, taskId);
        } else if (validation.shouldStop) {
          await this.logExecution('info', `🛑 检测到停止条件，终止重试`, taskId);
          break;
        } else {
          // 🔥 美团风格的特殊错误处理
          const shouldContinue = await this.handleAdvancedErrors(result, taskId, timeValidationFailures);

          if (!shouldContinue.continue) {
            break;
          }

          timeValidationFailures = shouldContinue.timeValidationFailures;

          // 🔥 RequestManager风格的指数退避
          if (retryConfig.exponentialBackoff) {
            currentInterval = Math.min(
              currentInterval * 1.5,
              retryConfig.maxInterval
            );
          } else if (timeValidationFailures > 3) {
            // 美团风格：时间验证失败时加快频率
            currentInterval = Math.max(30, retryConfig.intervalMs - 10);
          }

          await this.logExecution('info', `第${attempts}次尝试: ${result.statusText} (下次间隔${currentInterval}ms)`, taskId);

          // 等待后重试
          if (attempts < retryConfig.maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, currentInterval));
          }
        }

      } catch (error) {
        if (task.stats) {
          task.stats.attempts = (task.stats.attempts || 0) + 1;
          task.stats.failures = (task.stats.failures || 0) + 1;
          task.stats.lastExecuted = Date.now();
        }

        await this.logExecution('error', `第${attempts}次尝试失败: ${error.message}`, taskId);

        // 网络错误时使用指数退避
        if (retryConfig.exponentialBackoff) {
          currentInterval = Math.min(currentInterval * 2, retryConfig.maxInterval);
        }

        if (attempts < retryConfig.maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, currentInterval));
        }
      }
    }

    // 最终状态更新
    if (!success) {
      task.status = 'failed';
      task.lastError = `${attempts}次终极重试后仍然失败 (时间验证失败${timeValidationFailures}次)`;
      await this.logExecution('error', `❌ 终极重试失败，已尝试${attempts}次`, taskId);
    }

    task.updatedAt = Date.now();
    this.tasks.set(taskId, task);
    await this.saveTasks();
  }

  // 🔥 RequestManager风格的响应验证
  async validateResponse(result, retryConfig) {
    const validation = { isSuccess: false, shouldStop: false };

    try {
      // 解析响应数据
      let responseData = null;
      try {
        responseData = JSON.parse(result.body || '{}');
      } catch (e) {
        // 非JSON响应
      }

      // 成功条件检查
      if (this.evaluateCondition(result, responseData, retryConfig.successCondition)) {
        validation.isSuccess = true;
      }

      // 停止条件检查
      if (this.evaluateCondition(result, responseData, retryConfig.stopCondition)) {
        validation.shouldStop = true;
      }

    } catch (e) {
      // 验证失败，继续重试
    }

    return validation;
  }

  // 条件评估器
  evaluateCondition(result, responseData, condition) {
    try {
      // 状态码检查
      if (condition.includes('status_code')) {
        const match = condition.match(/status_code\s*==\s*(\d+)/);
        if (match) {
          return result.status === parseInt(match[1]);
        }
      }

      // 响应内容检查
      if (condition.includes('contains')) {
        const match = condition.match(/contains\(['"]([^'"]+)['"]\)/);
        if (match) {
          return (result.body || '').includes(match[1]);
        }
      }

      // JSON字段检查
      if (responseData && condition.includes('code')) {
        const match = condition.match(/code\s*==\s*(\d+)/);
        if (match) {
          return responseData.code === parseInt(match[1]);
        }
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  // 🔥 美团风格的高级错误处理
  async handleAdvancedErrors(result, taskId, timeValidationFailures) {
    let responseData = null;
    try {
      responseData = JSON.parse(result.body || '{}');
    } catch (e) {
      // 非JSON响应
    }

    const msg = responseData?.msg || result.statusText || '';

    // 美团风格：时间验证失败特殊处理
    if (msg.includes('时间验证失败') || msg.includes('time validation failed')) {
      timeValidationFailures++;
      await this.logExecution('info', `⏰ 时间验证失败，继续高频重试... (${timeValidationFailures}次)`, taskId);
      return { continue: true, timeValidationFailures };
    }

    // 检查是否应该停止重试的错误
    const stopErrors = [
      '已经领取过', '已经抢过', '活动已结束', '库存不足',
      '不在活动时间', '用户不符合条件', '已达上限'
    ];

    for (const errorMsg of stopErrors) {
      if (msg.includes(errorMsg)) {
        await this.logExecution('info', `🛑 检测到停止条件: ${msg}`, taskId);
        return { continue: false, timeValidationFailures };
      }
    }

    return { continue: true, timeValidationFailures };
  }

  // 平均响应时间更新
  updateAverageResponseTime(currentAvg, newTime, totalAttempts) {
    if (!currentAvg || totalAttempts === 1) {
      return newTime;
    }
    return ((currentAvg * (totalAttempts - 1)) + newTime) / totalAttempts;
  }

  // 智能成功检测（学习美团工具）
  isRequestSuccessful(result, responseData) {
    // HTTP状态码检查
    if (result.status === 200) {
      // 如果有响应数据，检查业务状态码
      if (responseData) {
        return responseData.code === 0 ||
               responseData.msg === '成功' ||
               responseData.success === true ||
               responseData.status === 'success';
      }
      // 没有响应数据但HTTP状态正常，认为成功
      return true;
    }
    return false;
  }

  // 智能错误处理（学习美团工具）
  handleSpecificErrors(responseData, result, taskId) {
    if (!responseData) return true; // 继续重试

    const msg = responseData.msg || '';

    // 检查是否应该停止重试的错误
    const stopRetryErrors = [
      '已经领取过',
      '已经抢过',
      '活动已结束',
      '库存不足',
      '不在活动时间',
      '用户不符合条件'
    ];

    for (const errorMsg of stopRetryErrors) {
      if (msg.includes(errorMsg)) {
        this.logExecution('info', `🛑 检测到停止条件: ${msg}`, taskId);
        return false; // 停止重试
      }
    }

    // 继续重试的错误
    const continueRetryErrors = [
      '时间验证失败',
      '请求过于频繁',
      '系统繁忙',
      '网络异常',
      '服务器错误'
    ];

    for (const errorMsg of continueRetryErrors) {
      if (msg.includes(errorMsg)) {
        return true; // 继续重试
      }
    }

    return true; // 默认继续重试
  }
}

// 启动背景服务
console.log('🚀 Universal Coupon Grabber Service Worker 启动!');
console.log('📅 启动时间:', new Date().toLocaleString());
const backgroundService = new BackgroundService();
console.log('🔧 背景服务已创建:', !!backgroundService);
