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
          available: typeof window._JdJrTdRiskFpInfo !== 'undefined' ||
                    typeof window._JD_DEVICE_FINGERPRINT_ !== 'undefined' ||
                    typeof window.jdSign !== 'undefined',
          methods: {
            riskFp: typeof window._JdJrTdRiskFpInfo !== 'undefined',
            deviceFp: typeof window._JD_DEVICE_FINGERPRINT_ !== 'undefined',
            sign: typeof window.jdSign === 'function'
          }
        },
        pdd: {
          available: typeof window.PDD !== 'undefined' ||
                    typeof window._nano_fp !== 'undefined' ||
                    typeof window.PDDAccessToken !== 'undefined',
          methods: {
            sign: typeof window.PDD?.sign === 'function',
            getFingerprint: typeof window.PDD?.getFingerprint === 'function',
            nanoFp: typeof window._nano_fp !== 'undefined'
          }
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
      try {
        const result = {
          timestamp: Date.now()
        };

        // 获取设备指纹
        if (typeof window._JD_DEVICE_FINGERPRINT_ !== 'undefined') {
          result.deviceFingerprint = window._JD_DEVICE_FINGERPRINT_;
        }

        // 获取风险指纹
        if (typeof window._JdJrTdRiskFpInfo !== 'undefined') {
          result.riskFingerprint = window._JdJrTdRiskFpInfo;
        }

        // 尝试调用签名函数
        if (typeof window.jdSign === 'function') {
          const signResult = await window.jdSign(requestData);
          result.signature = signResult;
        }

        // 获取必要的Cookie
        const cookies = ['__jdu', '__jdv', '__jda', 'shshshfpa', 'shshshfpb'];
        result.cookies = {};
        cookies.forEach(name => {
          const value = this.getCookie(name);
          if (value) {
            result.cookies[name] = value;
          }
        });

        return result;
      } catch (error) {
        console.error('JD signature failed:', error);
        throw error;
      }
    },

    // 拼多多签名
    async pddSign(requestData) {
      try {
        const result = {
          timestamp: Date.now()
        };

        // 获取反作弊token
        if (typeof window._nano_fp !== 'undefined') {
          result.nanoFp = window._nano_fp;
        }

        // 获取访问token
        const accessToken = this.getCookie('PDDAccessToken') || window.PDDAccessToken;
        if (accessToken) {
          result.accessToken = accessToken;
        }

        // 获取用户ID
        const userId = this.getCookie('pdd_user_id');
        if (userId) {
          result.userId = userId;
        }

        // 尝试调用PDD签名函数
        if (typeof window.PDD !== 'undefined') {
          if (typeof window.PDD.sign === 'function') {
            const signResult = await window.PDD.sign(requestData);
            result.antiContent = signResult;
          }

          if (typeof window.PDD.getFingerprint === 'function') {
            const fingerprint = await window.PDD.getFingerprint();
            result.fingerprint = fingerprint;
          }
        }

        return result;
      } catch (error) {
        console.error('PDD signature failed:', error);
        throw error;
      }
    },

    // 获取Cookie值
    getCookie(name) {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        return parts.pop().split(';').shift();
      }
      return null;
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

        case 'UCG_PDD_SIGN':
          response.data = await bridge.pddSign(data);
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
  } else if (window.location.hostname.includes('jd.com')) {
    // 京东特定的监听逻辑
    monitorJDRequests();
  } else if (window.location.hostname.includes('pinduoduo.com') ||
             window.location.hostname.includes('yangkeduo.com')) {
    // 拼多多特定的监听逻辑
    monitorPDDRequests();
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

  function monitorJDRequests() {
    // 监听京东特定的请求模式
    const patterns = [
      /\/seckill\/seckill\.action/,
      /\/miaosha\/order\/submitOrderWithSkuNum/,
      /\/coupon\/receiveCoupon/,
      /\/order\/submitOrder/,
      /\/yuyue\/yuyueSubmit/
    ];

    // 这里可以添加更精细的监听逻辑
    console.log('JD request monitoring started');
  }

  function monitorPDDRequests() {
    // 监听拼多多特定的请求模式
    const patterns = [
      /\/api\/carts\/checkout/,
      /\/api\/oak\/integration\/render/,
      /\/api\/promotion\/coupon\/receive/,
      /\/api\/carts\/add/,
      /\/api\/lottery\/draw/,
      /\/api\/checkin/,
      /\/api\/bargain\/help/
    ];

    // 这里可以添加更精细的监听逻辑
    console.log('PDD request monitoring started');
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
