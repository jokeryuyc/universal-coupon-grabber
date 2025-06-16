/**
 * Universal Coupon Grabber - Auto Discovery Engine
 * 自动发现引擎，智能识别和分析网站的抢券API
 */

class AutoDiscoveryEngine {
  constructor() {
    this.discoveredAPIs = new Map();
    this.analysisRules = new Map();
    this.confidenceThreshold = 0.7;
    this.isActive = false;
    
    this.init();
  }

  async init() {
    console.log('Auto Discovery Engine initialized');
    
    // 加载网站分析规则
    await this.loadAnalysisRules();
    
    // 设置消息监听
    this.setupMessageListeners();
  }

  async loadAnalysisRules() {
    const hostname = window.location.hostname;

    try {
      // 尝试加载当前网站的规则
      const rulesUrl = chrome.runtime.getURL(`rules/${hostname}.json`);
      const response = await fetch(rulesUrl);

      if (response.ok) {
        const rules = await response.json();
        this.analysisRules.set(hostname, rules);
        console.log(`✅ 成功加载 ${hostname} 分析规则`);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`📋 ${hostname} 使用通用分析模式`);
    }

    // 加载通用规则
    this.loadGenericRules();
  }

  loadGenericRules() {
    // 通用的API模式识别规则
    const genericRules = {
      patterns: [
        {
          name: 'coupon_receive',
          urlPatterns: [
            /coupon.*receive/i,
            /receive.*coupon/i,
            /get.*coupon/i,
            /grab.*coupon/i,
            /领取.*优惠券/i,
            /抢.*券/i
          ],
          methods: ['POST'],
          confidence: 0.8
        },
        {
          name: 'seckill_order',
          urlPatterns: [
            /seckill/i,
            /miaosha/i,
            /flash.*sale/i,
            /秒杀/i,
            /抢购/i
          ],
          methods: ['POST'],
          confidence: 0.9
        },
        {
          name: 'order_submit',
          urlPatterns: [
            /order.*submit/i,
            /submit.*order/i,
            /checkout/i,
            /下单/i,
            /提交订单/i
          ],
          methods: ['POST'],
          confidence: 0.7
        },
        {
          name: 'lottery_draw',
          urlPatterns: [
            /lottery/i,
            /draw/i,
            /抽奖/i,
            /抽取/i
          ],
          methods: ['POST'],
          confidence: 0.6
        }
      ]
    };
    
    this.analysisRules.set('generic', genericRules);
  }

  setupMessageListeners() {
    // 监听来自network monitor的请求
    window.addEventListener('network-request-captured', (event) => {
      if (this.isActive) {
        this.analyzeRequest(event.detail);
      }
    });
  }

  startDiscovery() {
    this.isActive = true;
    console.log('Auto discovery started');
  }

  stopDiscovery() {
    this.isActive = false;
    console.log('Auto discovery stopped');
  }

  analyzeRequest(requestData) {
    try {
      const analysis = this.performAnalysis(requestData);
      
      if (analysis.confidence >= this.confidenceThreshold) {
        this.handleDiscoveredAPI(requestData, analysis);
      }
    } catch (error) {
      console.error('Request analysis failed:', error);
    }
  }

  performAnalysis(requestData) {
    const hostname = window.location.hostname;
    const url = requestData.url;
    const method = requestData.method || 'GET';
    
    let maxConfidence = 0;
    let bestMatch = null;
    
    // 使用网站特定规则
    const siteRules = this.analysisRules.get(hostname);
    if (siteRules && siteRules.capturePatterns) {
      for (const pattern of siteRules.capturePatterns) {
        const confidence = this.calculatePatternConfidence(requestData, pattern);
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = pattern;
        }
      }
    }
    
    // 使用通用规则
    const genericRules = this.analysisRules.get('generic');
    if (genericRules && genericRules.patterns) {
      for (const pattern of genericRules.patterns) {
        const confidence = this.calculateGenericConfidence(requestData, pattern);
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = pattern;
        }
      }
    }
    
    return {
      confidence: maxConfidence,
      pattern: bestMatch,
      category: bestMatch ? bestMatch.category || bestMatch.name : 'unknown',
      analysis: {
        url: url,
        method: method,
        hasBody: !!requestData.body,
        hasHeaders: !!requestData.headers,
        timestamp: Date.now()
      }
    };
  }

  calculatePatternConfidence(requestData, pattern) {
    let confidence = 0;
    
    // URL模式匹配
    if (pattern.urlPattern) {
      const regex = new RegExp(pattern.urlPattern, 'i');
      if (regex.test(requestData.url)) {
        confidence += pattern.priority || 0.5;
      }
    }
    
    // 方法匹配
    if (pattern.method && requestData.method === pattern.method) {
      confidence += 0.2;
    }
    
    // 请求体检查
    if (requestData.body && pattern.bodyPatterns) {
      for (const bodyPattern of pattern.bodyPatterns) {
        if (requestData.body.includes(bodyPattern)) {
          confidence += 0.1;
        }
      }
    }
    
    return Math.min(confidence, 1.0);
  }

  calculateGenericConfidence(requestData, pattern) {
    let confidence = 0;
    
    // URL模式匹配
    for (const urlPattern of pattern.urlPatterns) {
      if (urlPattern.test(requestData.url)) {
        confidence = pattern.confidence;
        break;
      }
    }
    
    // 方法匹配
    if (confidence > 0 && pattern.methods.includes(requestData.method)) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  handleDiscoveredAPI(requestData, analysis) {
    const apiKey = `${requestData.method}_${requestData.url}`;
    
    // 避免重复发现
    if (this.discoveredAPIs.has(apiKey)) {
      return;
    }
    
    this.discoveredAPIs.set(apiKey, {
      requestData: requestData,
      analysis: analysis,
      discoveredAt: Date.now()
    });
    
    console.log('Discovered API:', {
      url: requestData.url,
      method: requestData.method,
      confidence: analysis.confidence,
      category: analysis.category
    });
    
    // 发送发现通知
    this.notifyDiscovery(requestData, analysis);
  }

  notifyDiscovery(requestData, analysis) {
    // 发送消息给background script
    chrome.runtime.sendMessage({
      type: 'API_DISCOVERED',
      data: {
        request: requestData,
        analysis: analysis,
        website: window.location.hostname,
        pageTitle: document.title,
        timestamp: Date.now()
      }
    });
    
    // 发送自定义事件
    window.dispatchEvent(new CustomEvent('api-discovered', {
      detail: {
        request: requestData,
        analysis: analysis
      }
    }));
  }

  getDiscoveredAPIs() {
    return Array.from(this.discoveredAPIs.values());
  }

  clearDiscoveredAPIs() {
    this.discoveredAPIs.clear();
  }

  // 手动分析当前页面
  analyzeCurrentPage() {
    const pageInfo = {
      url: window.location.href,
      hostname: window.location.hostname,
      title: document.title,
      forms: document.forms.length,
      buttons: document.querySelectorAll('button').length,
      links: document.links.length
    };
    
    // 查找可能的抢券按钮
    const suspiciousButtons = this.findSuspiciousButtons();
    
    return {
      pageInfo: pageInfo,
      suspiciousElements: suspiciousButtons,
      recommendations: this.generateRecommendations(pageInfo, suspiciousButtons)
    };
  }

  findSuspiciousButtons() {
    const buttons = document.querySelectorAll('button, a, [onclick]');
    const suspicious = [];
    
    const keywords = [
      '抢购', '秒杀', '立即购买', '马上抢', '限时抢购',
      '领取', '获取', '免费领取', '立即领取',
      '抽奖', '参与', '立即参与',
      'buy now', 'grab', 'get coupon', 'receive'
    ];
    
    buttons.forEach(button => {
      const text = button.textContent || button.innerText || '';
      const hasKeyword = keywords.some(keyword => 
        text.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (hasKeyword) {
        suspicious.push({
          element: button.tagName,
          text: text.trim(),
          id: button.id,
          className: button.className,
          onclick: button.onclick ? 'present' : 'none'
        });
      }
    });
    
    return suspicious;
  }

  generateRecommendations(pageInfo, suspiciousElements) {
    const recommendations = [];
    
    if (suspiciousElements.length > 0) {
      recommendations.push({
        type: 'action',
        message: `发现 ${suspiciousElements.length} 个可能的抢券按钮，建议启动网络监听后点击测试`,
        priority: 'high'
      });
    }
    
    const hostname = pageInfo.hostname;
    if (this.analysisRules.has(hostname)) {
      recommendations.push({
        type: 'info',
        message: `当前网站 ${hostname} 已有适配规则，自动发现功能已优化`,
        priority: 'medium'
      });
    } else {
      recommendations.push({
        type: 'warning',
        message: `当前网站 ${hostname} 暂无特定规则，将使用通用模式识别`,
        priority: 'medium'
      });
    }
    
    return recommendations;
  }
}

// 创建全局实例
window.autoDiscoveryEngine = new AutoDiscoveryEngine();

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AutoDiscoveryEngine;
}
