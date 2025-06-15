/**
 * Universal Coupon Grabber - Network Monitor
 * 通用网络请求监听和拦截模块
 * 基于美团抢券工具的Monkey Patching原理
 */

class NetworkMonitor {
  constructor() {
    this.isCapturing = false;
    this.originalFetch = null;
    this.originalXHR = null;
    this.captureRules = [];
    this.discoveredRequests = new Map();
    
    this.init();
  }

  async init() {
    // 加载网站适配规则
    await this.loadCaptureRules();
    
    // 监听来自background的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'START_CAPTURE') {
        this.startCapture();
        sendResponse({ success: true });
      } else if (message.type === 'STOP_CAPTURE') {
        this.stopCapture();
        sendResponse({ success: true });
      }
    });
  }

  async loadCaptureRules() {
    try {
      const hostname = window.location.hostname;
      const rulesUrl = chrome.runtime.getURL(`rules/${hostname}.json`);
      
      const response = await fetch(rulesUrl);
      if (response.ok) {
        const rules = await response.json();
        this.captureRules = rules.capturePatterns || [];
        console.log(`Loaded capture rules for ${hostname}:`, this.captureRules);
      }
    } catch (error) {
      console.log('No specific rules found for this site, using generic patterns');
      this.captureRules = this.getGenericPatterns();
    }
  }

  getGenericPatterns() {
    return [
      {
        name: 'seckill',
        urlPattern: /seckill|秒杀|rush|snap/i,
        method: 'POST',
        priority: 0.9
      },
      {
        name: 'coupon',
        urlPattern: /coupon|优惠券|券|ticket/i,
        method: 'POST',
        priority: 0.8
      },
      {
        name: 'register',
        urlPattern: /register|报名|signup|enroll/i,
        method: 'POST',
        priority: 0.7
      },
      {
        name: 'order',
        urlPattern: /order|下单|purchase|buy/i,
        method: 'POST',
        priority: 0.6
      }
    ];
  }

  startCapture() {
    if (this.isCapturing) return;
    
    console.log('Starting network capture...');
    this.isCapturing = true;
    
    // 保存原始方法
    this.originalFetch = window.fetch;
    this.originalXHR = window.XMLHttpRequest;
    
    // 替换fetch
    window.fetch = this.createFetchProxy();
    
    // 替换XMLHttpRequest
    window.XMLHttpRequest = this.createXHRProxy();
    
    // 注入页面脚本以访问页面上下文
    this.injectPageScript();
  }

  stopCapture() {
    if (!this.isCapturing) return;
    
    console.log('Stopping network capture...');
    this.isCapturing = false;
    
    // 恢复原始方法
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
    }
    if (this.originalXHR) {
      window.XMLHttpRequest = this.originalXHR;
    }
  }

  createFetchProxy() {
    const originalFetch = this.originalFetch;
    const self = this;
    
    return async function(input, init = {}) {
      const url = typeof input === 'string' ? input : input.url;
      const method = init.method || 'GET';
      
      // 执行原始请求
      const response = await originalFetch.call(this, input, init);
      
      // 检查是否匹配捕获规则
      if (self.shouldCapture(url, method)) {
        await self.captureRequest({
          url,
          method,
          headers: init.headers || {},
          body: init.body,
          response: response.clone()
        });
      }
      
      return response;
    };
  }

  createXHRProxy() {
    const originalXHR = this.originalXHR;
    const self = this;
    
    return function() {
      const xhr = new originalXHR();
      const originalOpen = xhr.open;
      const originalSend = xhr.send;
      
      let requestData = {};
      
      xhr.open = function(method, url, ...args) {
        requestData.method = method;
        requestData.url = url;
        return originalOpen.apply(this, [method, url, ...args]);
      };
      
      xhr.send = function(body) {
        requestData.body = body;
        requestData.headers = this.getAllResponseHeaders();
        
        // 监听响应
        xhr.addEventListener('load', function() {
          if (self.shouldCapture(requestData.url, requestData.method)) {
            self.captureRequest({
              ...requestData,
              response: {
                status: xhr.status,
                statusText: xhr.statusText,
                responseText: xhr.responseText
              }
            });
          }
        });
        
        return originalSend.apply(this, [body]);
      };
      
      return xhr;
    };
  }

  shouldCapture(url, method) {
    if (!this.isCapturing) return false;
    
    return this.captureRules.some(rule => {
      const urlMatch = rule.urlPattern.test(url);
      const methodMatch = !rule.method || rule.method.toLowerCase() === method.toLowerCase();
      return urlMatch && methodMatch;
    });
  }

  async captureRequest(requestData) {
    const requestId = this.generateRequestId(requestData);
    
    // 避免重复捕获
    if (this.discoveredRequests.has(requestId)) {
      return;
    }
    
    this.discoveredRequests.set(requestId, requestData);
    
    console.log('Captured request:', requestData);
    
    // 发送到background处理
    chrome.runtime.sendMessage({
      type: 'AUTO_DISCOVERED_REQUEST',
      data: {
        ...requestData,
        timestamp: Date.now(),
        website: window.location.hostname
      }
    });
  }

  generateRequestId(requestData) {
    const key = `${requestData.method}_${requestData.url}_${JSON.stringify(requestData.body)}`;
    return btoa(key).substring(0, 16);
  }

  injectPageScript() {
    // 注入脚本到页面上下文，以访问页面的全局变量（如H5guard）
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected/page-script.js');
    script.onload = function() {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  }
}

// 初始化网络监听器
const networkMonitor = new NetworkMonitor();

// 导出给其他模块使用
window.networkMonitor = networkMonitor;
