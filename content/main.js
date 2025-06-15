/**
 * Universal Coupon Grabber - Content Script Main
 * 内容脚本主入口，协调各个模块的工作
 */

class ContentScriptMain {
  constructor() {
    this.isInitialized = false;
    this.currentWebsite = window.location.hostname;
    this.websiteRules = null;
    
    this.init();
  }

  async init() {
    if (this.isInitialized) return;
    
    console.log('Universal Coupon Grabber - Content Script Initialized');
    console.log('Current website:', this.currentWebsite);
    
    // 加载网站规则
    await this.loadWebsiteRules();
    
    // 设置消息监听
    this.setupMessageListeners();
    
    // 等待页面加载完成后初始化其他模块
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.initializeModules();
      });
    } else {
      this.initializeModules();
    }
    
    this.isInitialized = true;
  }

  async loadWebsiteRules() {
    try {
      const rulesUrl = chrome.runtime.getURL(`rules/${this.currentWebsite}.json`);
      const response = await fetch(rulesUrl);
      
      if (response.ok) {
        this.websiteRules = await response.json();
        console.log('Loaded website rules:', this.websiteRules);
      } else {
        console.log('No specific rules found for this website, using defaults');
      }
    } catch (error) {
      console.log('Failed to load website rules:', error);
    }
  }

  initializeModules() {
    // 网络监听器已经在network-monitor.js中初始化
    // 签名适配器已经在signature-adapters.js中初始化
    
    // 检查签名适配器可用性
    if (window.signatureAdapterManager) {
      const adapter = window.signatureAdapterManager.getAdapter();
      console.log(`Using signature adapter: ${adapter.name}`);
    }
    
    // 如果有网站规则，自动启动网络捕获
    if (this.websiteRules && this.websiteRules.capturePatterns) {
      this.startAutoCapture();
    }
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 保持消息通道开放
    });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'EXECUTE_REQUEST':
          const result = await this.executeRequest(message.data);
          sendResponse(result);
          break;

        case 'START_CAPTURE':
          this.startNetworkCapture();
          sendResponse({ success: true });
          break;

        case 'STOP_CAPTURE':
          this.stopNetworkCapture();
          sendResponse({ success: true });
          break;

        case 'GET_PAGE_INFO':
          const pageInfo = this.getPageInfo();
          sendResponse({ success: true, data: pageInfo });
          break;

        case 'INJECT_TASK_UI':
          this.injectTaskUI(message.data);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Content script message handling error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async executeRequest(requestData) {
    try {
      console.log('Executing request:', requestData);
      
      // 使用签名适配器处理请求
      let signedRequest = requestData;
      if (window.signatureAdapterManager) {
        signedRequest = await window.signatureAdapterManager.signRequest(requestData);
      }
      
      // 发送HTTP请求
      const response = await this.sendHttpRequest(signedRequest);
      
      return {
        success: true,
        statusCode: response.status,
        responseText: response.responseText,
        headers: response.headers,
        signatureInfo: signedRequest.signatureInfo
      };
      
    } catch (error) {
      console.error('Request execution failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendHttpRequest(requestData) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.open(requestData.method || 'POST', requestData.url);
      
      // 设置请求头
      if (requestData.headers) {
        for (const [key, value] of Object.entries(requestData.headers)) {
          xhr.setRequestHeader(key, value);
        }
      }
      
      // 设置超时
      xhr.timeout = requestData.timeout || 5000;
      
      xhr.onload = function() {
        resolve({
          status: xhr.status,
          statusText: xhr.statusText,
          responseText: xhr.responseText,
          headers: xhr.getAllResponseHeaders()
        });
      };
      
      xhr.onerror = function() {
        reject(new Error(`Network error: ${xhr.statusText}`));
      };
      
      xhr.ontimeout = function() {
        reject(new Error('Request timeout'));
      };
      
      // 发送请求
      const body = requestData.body ? 
        (typeof requestData.body === 'string' ? requestData.body : JSON.stringify(requestData.body)) : 
        null;
        
      xhr.send(body);
    });
  }

  startNetworkCapture() {
    if (window.networkMonitor) {
      window.networkMonitor.startCapture();
      console.log('Network capture started');
    }
  }

  stopNetworkCapture() {
    if (window.networkMonitor) {
      window.networkMonitor.stopCapture();
      console.log('Network capture stopped');
    }
  }

  startAutoCapture() {
    // 自动启动网络捕获（如果网站有配置规则）
    setTimeout(() => {
      this.startNetworkCapture();
    }, 1000); // 延迟1秒启动，确保页面完全加载
  }

  getPageInfo() {
    return {
      url: window.location.href,
      hostname: window.location.hostname,
      title: document.title,
      hasH5guard: typeof window.H5guard !== 'undefined',
      hasMtop: typeof window.mtop !== 'undefined',
      hasJdSign: typeof window.jdSign !== 'undefined',
      websiteRules: this.websiteRules ? this.websiteRules.name : 'None',
      timestamp: Date.now()
    };
  }

  injectTaskUI(taskData) {
    // 在页面中注入任务相关的UI元素（如倒计时、状态显示等）
    const existingUI = document.getElementById('ucg-task-ui');
    if (existingUI) {
      existingUI.remove();
    }

    const taskUI = document.createElement('div');
    taskUI.id = 'ucg-task-ui';
    taskUI.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: Arial, sans-serif;
      font-size: 12px;
      z-index: 10000;
      min-width: 200px;
    `;

    taskUI.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">
        🎯 ${taskData.name}
      </div>
      <div>状态: <span id="ucg-status">${taskData.status}</span></div>
      <div>执行时间: ${new Date(taskData.executeAt).toLocaleTimeString()}</div>
      <div>剩余: <span id="ucg-countdown">--:--:--</span></div>
    `;

    document.body.appendChild(taskUI);

    // 启动倒计时
    this.startCountdown(taskData.executeAt);
  }

  startCountdown(executeAt) {
    const countdownElement = document.getElementById('ucg-countdown');
    if (!countdownElement) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(executeAt).getTime();
      const diff = target - now;

      if (diff <= 0) {
        countdownElement.textContent = '执行中...';
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      countdownElement.textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    // 5分钟后自动清除倒计时
    setTimeout(() => {
      clearInterval(interval);
    }, 5 * 60 * 1000);
  }
}

// 初始化内容脚本
const contentScriptMain = new ContentScriptMain();
