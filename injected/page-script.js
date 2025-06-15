/**
 * Universal Coupon Grabber - Page Script
 * 注入到页面上下文的脚本，用于访问页面的全局变量和函数
 */

(function() {
  'use strict';
  
  console.log('Universal Coupon Grabber - Page Script Injected');
  
  // 创建与content script的通信桥梁
  const bridge = {
    // 检查各种签名对象的可用性
    checkSignatureAvailability() {
      return {
        h5guard: {
          available: typeof window.H5guard !== 'undefined',
          methods: {
            sign: typeof window.H5guard?.sign === 'function',
            getfp: typeof window.H5guard?.getfp === 'function'
          }
        },
        mtop: {
          available: typeof window.mtop !== 'undefined',
          token: typeof window._tb_token_ !== 'undefined'
        },
        jd: {
          available: typeof window.jdSign !== 'undefined' || 
                    typeof window._JdJrTdRiskFpInfo !== 'undefined'
        }
      };
    },
    
    // 美团H5guard签名
    async meituanSign(requestData) {
      if (typeof window.H5guard === 'undefined') {
        throw new Error('H5guard not available');
      }
      
      try {
        // 获取指纹
        const fingerprint = window.H5guard.getfp();
        
        // 构造签名请求
        const signRequest = {
          url: requestData.url,
          method: requestData.method || 'POST',
          headers: requestData.headers || {},
          data: requestData.body || {}
        };
        
        // 执行签名
        const signedData = window.H5guard.sign(signRequest);
        
        return {
          fingerprint: fingerprint,
          signature: signedData,
          timestamp: Date.now()
        };
      } catch (error) {
        console.error('Meituan signature failed:', error);
        throw error;
      }
    },
    
    // 淘宝mtop签名
    async taobaoSign(requestData) {
      if (typeof window.mtop === 'undefined') {
        throw new Error('mtop not available');
      }
      
      try {
        // 获取token
        const token = window._tb_token_ || '';
        
        // 这里需要根据实际的mtop签名逻辑实现
        // 简化版本，实际需要更复杂的处理
        return {
          token: token,
          timestamp: Date.now()
        };
      } catch (error) {
        console.error('Taobao signature failed:', error);
        throw error;
      }
    },
    
    // 京东签名
    async jdSign(requestData) {
      // 京东签名逻辑（待实现）
      return {
        timestamp: Date.now()
      };
    },
    
    // 获取页面信息
    getPageInfo() {
      return {
        url: window.location.href,
        hostname: window.location.hostname,
        title: document.title,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        signatures: this.checkSignatureAvailability()
      };
    },
    
    // 执行页面上下文中的代码
    executeInPageContext(code) {
      try {
        return eval(code);
      } catch (error) {
        console.error('Execute in page context failed:', error);
        throw error;
      }
    }
  };
  
  // 监听来自content script的消息
  window.addEventListener('message', async function(event) {
    // 只处理来自同一个页面的消息
    if (event.source !== window) return;
    
    const { type, data, requestId } = event.data;
    
    if (!type || !type.startsWith('UCG_')) return;
    
    let response = {
      requestId: requestId,
      success: false,
      data: null,
      error: null
    };
    
    try {
      switch (type) {
        case 'UCG_CHECK_SIGNATURE_AVAILABILITY':
          response.data = bridge.checkSignatureAvailability();
          response.success = true;
          break;
          
        case 'UCG_MEITUAN_SIGN':
          response.data = await bridge.meituanSign(data);
          response.success = true;
          break;
          
        case 'UCG_TAOBAO_SIGN':
          response.data = await bridge.taobaoSign(data);
          response.success = true;
          break;
          
        case 'UCG_JD_SIGN':
          response.data = await bridge.jdSign(data);
          response.success = true;
          break;
          
        case 'UCG_GET_PAGE_INFO':
          response.data = bridge.getPageInfo();
          response.success = true;
          break;
          
        case 'UCG_EXECUTE_CODE':
          response.data = bridge.executeInPageContext(data.code);
          response.success = true;
          break;
          
        default:
          response.error = 'Unknown message type';
      }
    } catch (error) {
      response.error = error.message;
      console.error('Page script error:', error);
    }
    
    // 发送响应回content script
    window.postMessage({
      type: 'UCG_RESPONSE',
      ...response
    }, '*');
  });
  
  // 通知content script页面脚本已加载
  window.postMessage({
    type: 'UCG_PAGE_SCRIPT_READY',
    timestamp: Date.now()
  }, '*');
  
  // 监听页面的网络请求（作为备用方案）
  const originalFetch = window.fetch;
  const originalXHR = window.XMLHttpRequest;
  
  // 可选：监听页面级别的网络请求
  if (window.location.hostname.includes('meituan')) {
    // 美团特定的监听逻辑
    monitorMeituanRequests();
  } else if (window.location.hostname.includes('taobao')) {
    // 淘宝特定的监听逻辑
    monitorTaobaoRequests();
  }
  
  function monitorMeituanRequests() {
    // 监听美团特定的请求模式
    const patterns = [
      /\/promotion\/seckill\/couponcomponent\/grabcoupon/,
      /\/promotion\/seckill\/ordercomponent\/submit/
    ];
    
    // 这里可以添加更精细的监听逻辑
  }
  
  function monitorTaobaoRequests() {
    // 监听淘宝特定的请求模式
    const patterns = [
      /\/mtop\.ju\.seckill\.order\.submit/,
      /\/mtop\.marketing\.coupon\.get/
    ];
    
    // 这里可以添加更精细的监听逻辑
  }
  
  // 定期检查页面状态变化
  setInterval(() => {
    // 检查是否有新的签名对象可用
    const availability = bridge.checkSignatureAvailability();
    
    // 通知content script状态变化
    window.postMessage({
      type: 'UCG_SIGNATURE_STATUS_UPDATE',
      data: availability,
      timestamp: Date.now()
    }, '*');
  }, 5000);
  
})();
