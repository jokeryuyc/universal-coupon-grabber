/**
 * Universal Coupon Grabber - Background Service Worker
 * 核心任务调度和执行引擎
 */

import { TaskScheduler } from './task-scheduler.js';
import { ExecutionEngine } from './execution-engine.js';
import { StorageManager } from './storage-manager.js';
import { TimeSync } from './time-sync.js';

class BackgroundService {
  constructor() {
    this.taskScheduler = new TaskScheduler();
    this.executionEngine = new ExecutionEngine();
    this.storageManager = new StorageManager();
    this.timeSync = new TimeSync();
    
    this.init();
  }

  async init() {
    console.log('Universal Coupon Grabber - Background Service Started');
    
    // 初始化存储
    await this.storageManager.init();
    
    // 初始化时间同步
    await this.timeSync.init();
    
    // 恢复未完成的任务
    await this.taskScheduler.restoreTasks();
    
    // 设置消息监听
    this.setupMessageListeners();
    
    // 设置定时器监听
    this.setupAlarmListeners();
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 保持消息通道开放
    });
  }

  setupAlarmListeners() {
    chrome.alarms.onAlarm.addListener((alarm) => {
      this.handleAlarm(alarm);
    });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'CREATE_TASK':
          const taskId = await this.taskScheduler.createTask(message.data);
          sendResponse({ success: true, taskId });
          break;

        case 'START_TASK':
          await this.taskScheduler.startTask(message.taskId);
          sendResponse({ success: true });
          break;

        case 'STOP_TASK':
          await this.taskScheduler.stopTask(message.taskId);
          sendResponse({ success: true });
          break;

        case 'GET_TASKS':
          const tasks = await this.taskScheduler.getAllTasks();
          sendResponse({ success: true, data: tasks });
          break;

        case 'AUTO_DISCOVERED_REQUEST':
          await this.handleAutoDiscoveredRequest(message.data, sender.tab);
          sendResponse({ success: true });
          break;

        case 'EXECUTE_IMMEDIATE':
          const result = await this.executionEngine.executeImmediate(message.data);
          sendResponse({ success: true, result });
          break;

        case 'GET_EXECUTION_LOGS':
          const logs = await this.storageManager.getExecutionLogs(message.taskId);
          sendResponse({ success: true, data: logs });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Background service error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleAlarm(alarm) {
    if (alarm.name.startsWith('task_')) {
      const taskId = alarm.name.replace('task_', '');
      await this.executionEngine.executeTask(taskId);
    }
  }

  async handleAutoDiscoveredRequest(requestData, tab) {
    // 处理自动发现的请求
    const suggestedTask = await this.analyzeDiscoveredRequest(requestData, tab);
    
    // 通知popup显示建议的任务
    chrome.runtime.sendMessage({
      type: 'TASK_SUGGESTION',
      data: suggestedTask,
      tabId: tab.id
    });
  }

  async analyzeDiscoveredRequest(requestData, tab) {
    // 分析发现的请求，生成任务建议
    return {
      name: `自动发现 - ${tab.title}`,
      url: requestData.url,
      method: requestData.method,
      headers: requestData.headers,
      body: requestData.body,
      website: this.extractWebsite(tab.url),
      suggestedTime: new Date(Date.now() + 60000), // 默认1分钟后执行
      confidence: this.calculateConfidence(requestData)
    };
  }

  extractWebsite(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  calculateConfidence(requestData) {
    // 根据请求特征计算置信度
    let confidence = 0.5;
    
    // 检查URL模式
    if (requestData.url.includes('seckill') || 
        requestData.url.includes('coupon') ||
        requestData.url.includes('grab')) {
      confidence += 0.3;
    }
    
    // 检查请求方法
    if (requestData.method === 'POST') {
      confidence += 0.2;
    }
    
    return Math.min(confidence, 1.0);
  }
}

// 启动背景服务
new BackgroundService();
