/**
 * Universal Coupon Grabber - Signature Adapters
 * 可扩展的签名处理框架，支持不同网站的反爬虫机制
 */

class SignatureAdapterManager {
  constructor() {
    this.adapters = new Map();
    this.currentWebsite = window.location.hostname;
    
    this.registerAdapters();
  }

  registerAdapters() {
    // 美团适配器
    this.adapters.set('meituan.com', new MeituanSignatureAdapter());
    this.adapters.set('i.meituan.com', new MeituanSignatureAdapter());

    // 淘宝适配器
    this.adapters.set('taobao.com', new TaobaoSignatureAdapter());
    this.adapters.set('tmall.com', new TaobaoSignatureAdapter());

    // 京东适配器
    this.adapters.set('jd.com', new JDSignatureAdapter());
    this.adapters.set('m.jd.com', new JDSignatureAdapter());
    this.adapters.set('miaosha.jd.com', new JDSignatureAdapter());

    // 拼多多适配器
    this.adapters.set('pinduoduo.com', new PinduoduoSignatureAdapter());
    this.adapters.set('yangkeduo.com', new PinduoduoSignatureAdapter());
    this.adapters.set('mobile.yangkeduo.com', new PinduoduoSignatureAdapter());

    // 通用适配器（默认）
    this.adapters.set('default', new DefaultSignatureAdapter());
  }

  getAdapter(website = null) {
    const site = website || this.currentWebsite;
    
    // 精确匹配
    if (this.adapters.has(site)) {
      return this.adapters.get(site);
    }
    
    // 模糊匹配
    for (const [key, adapter] of this.adapters) {
      if (site.includes(key) || key.includes(site)) {
        return adapter;
      }
    }
    
    // 返回默认适配器
    return this.adapters.get('default');
  }

  async signRequest(requestData, website = null) {
    const adapter = this.getAdapter(website);
    return await adapter.sign(requestData);
  }
}

// 基础签名适配器接口
class BaseSignatureAdapter {
  constructor() {
    this.name = 'base';
    this.isAvailable = false;
  }

  async checkAvailability() {
    // 子类实现
    return false;
  }

  async sign(requestData) {
    // 子类实现
    return requestData;
  }

  async getFingerprint() {
    // 子类实现
    return null;
  }
}

// 美团签名适配器
class MeituanSignatureAdapter extends BaseSignatureAdapter {
  constructor() {
    super();
    this.name = 'meituan';
    this.checkAvailability();
  }

  async checkAvailability() {
    this.isAvailable = typeof window.H5guard !== 'undefined' && 
                      typeof window.H5guard.sign === 'function' &&
                      typeof window.H5guard.getfp === 'function';
    
    console.log(`Meituan H5guard available: ${this.isAvailable}`);
    return this.isAvailable;
  }

  async sign(requestData) {
    if (!this.isAvailable) {
      console.warn('H5guard not available, using unsigned request');
      return requestData;
    }

    try {
      // 获取指纹
      const fingerprint = await this.getFingerprint();
      
      // 构造签名请求对象
      const signRequest = {
        url: requestData.url,
        method: requestData.method || 'POST',
        headers: requestData.headers || {},
        data: requestData.body || {}
      };

      // 调用H5guard签名
      const signedData = window.H5guard.sign(signRequest);
      
      // 合并签名头
      const signedHeaders = {
        ...requestData.headers,
        ...signedData.headers,
        'mtFingerprint': fingerprint
      };

      return {
        ...requestData,
        headers: signedHeaders,
        signatureInfo: {
          adapter: this.name,
          fingerprint: fingerprint,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      console.error('Meituan signature failed:', error);
      return requestData;
    }
  }

  async getFingerprint() {
    if (!this.isAvailable) return null;
    
    try {
      return window.H5guard.getfp();
    } catch (error) {
      console.error('Failed to get fingerprint:', error);
      return null;
    }
  }
}

// 淘宝签名适配器
class TaobaoSignatureAdapter extends BaseSignatureAdapter {
  constructor() {
    super();
    this.name = 'taobao';
    this.checkAvailability();
  }

  async checkAvailability() {
    // 检查淘宝的签名相关对象
    this.isAvailable = typeof window.mtop !== 'undefined' ||
                      typeof window._tb_token_ !== 'undefined';
    
    console.log(`Taobao signature available: ${this.isAvailable}`);
    return this.isAvailable;
  }

  async sign(requestData) {
    if (!this.isAvailable) {
      return requestData;
    }

    try {
      // 淘宝签名逻辑（需要根据实际情况实现）
      const signedHeaders = {
        ...requestData.headers
      };

      // 添加淘宝特有的头部
      if (window._tb_token_) {
        signedHeaders['_tb_token_'] = window._tb_token_;
      }

      return {
        ...requestData,
        headers: signedHeaders,
        signatureInfo: {
          adapter: this.name,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      console.error('Taobao signature failed:', error);
      return requestData;
    }
  }
}

// 京东签名适配器
class JDSignatureAdapter extends BaseSignatureAdapter {
  constructor() {
    super();
    this.name = 'jd';
    this.checkAvailability();
  }

  async checkAvailability() {
    // 检查京东的签名相关对象
    this.isAvailable = typeof window._JdJrTdRiskFpInfo !== 'undefined' ||
                      typeof window._JD_DEVICE_FINGERPRINT_ !== 'undefined' ||
                      typeof window.jdSign !== 'undefined';

    console.log(`JD signature available: ${this.isAvailable}`);
    return this.isAvailable;
  }

  async sign(requestData) {
    if (!this.isAvailable) {
      console.warn('JD signature objects not available, using unsigned request');
      return requestData;
    }

    try {
      // 获取京东设备指纹
      const deviceFingerprint = await this.getDeviceFingerprint();

      // 获取风险指纹
      const riskFingerprint = await this.getRiskFingerprint();

      // 构造签名头
      const signedHeaders = {
        ...requestData.headers,
        'x-rp-client': 'h5_1.0.0',
        'x-referer-page': window.location.href,
        'x-requested-with': 'XMLHttpRequest'
      };

      // 添加设备指纹
      if (deviceFingerprint) {
        signedHeaders['x-jd-device-fingerprint'] = deviceFingerprint;
      }

      // 添加风险指纹
      if (riskFingerprint) {
        signedHeaders['x-jd-risk-fingerprint'] = riskFingerprint;
      }

      // 添加必要的Cookie信息
      const cookies = this.extractRequiredCookies();
      if (cookies.length > 0) {
        signedHeaders['Cookie'] = cookies.join('; ');
      }

      return {
        ...requestData,
        headers: signedHeaders,
        signatureInfo: {
          adapter: this.name,
          deviceFingerprint: deviceFingerprint,
          riskFingerprint: riskFingerprint,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      console.error('JD signature failed:', error);
      return requestData;
    }
  }

  async getDeviceFingerprint() {
    try {
      if (typeof window._JD_DEVICE_FINGERPRINT_ !== 'undefined') {
        return window._JD_DEVICE_FINGERPRINT_;
      }

      // 尝试生成设备指纹
      if (typeof window.generateFingerprint === 'function') {
        return await window.generateFingerprint();
      }

      return null;
    } catch (error) {
      console.error('Failed to get JD device fingerprint:', error);
      return null;
    }
  }

  async getRiskFingerprint() {
    try {
      if (typeof window._JdJrTdRiskFpInfo !== 'undefined') {
        return window._JdJrTdRiskFpInfo;
      }

      return null;
    } catch (error) {
      console.error('Failed to get JD risk fingerprint:', error);
      return null;
    }
  }

  extractRequiredCookies() {
    const requiredCookies = ['__jdu', '__jdv', '__jda', 'shshshfpa', 'shshshfpb'];
    const cookies = [];

    requiredCookies.forEach(name => {
      const value = this.getCookie(name);
      if (value) {
        cookies.push(`${name}=${value}`);
      }
    });

    return cookies;
  }

  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(';').shift();
    }
    return null;
  }
}

// 拼多多签名适配器
class PinduoduoSignatureAdapter extends BaseSignatureAdapter {
  constructor() {
    super();
    this.name = 'pinduoduo';
    this.checkAvailability();
  }

  async checkAvailability() {
    // 检查拼多多的签名相关对象
    this.isAvailable = typeof window.PDD !== 'undefined' ||
                      typeof window._nano_fp !== 'undefined' ||
                      typeof window.PDDAccessToken !== 'undefined';

    console.log(`Pinduoduo signature available: ${this.isAvailable}`);
    return this.isAvailable;
  }

  async sign(requestData) {
    if (!this.isAvailable) {
      console.warn('Pinduoduo signature objects not available, using unsigned request');
      return requestData;
    }

    try {
      // 获取拼多多反作弊token
      const antiContent = await this.getAntiContent(requestData);

      // 获取访问token
      const accessToken = await this.getAccessToken();

      // 获取验证token
      const verifyToken = await this.getVerifyToken();

      // 构造签名头
      const signedHeaders = {
        ...requestData.headers,
        'Content-Type': 'application/json;charset=UTF-8',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://mobile.yangkeduo.com',
        'Referer': 'https://mobile.yangkeduo.com/',
        'X-Requested-With': 'XMLHttpRequest'
      };

      // 添加反作弊签名
      if (antiContent) {
        signedHeaders['anti-content'] = antiContent;
      }

      // 添加访问token
      if (accessToken) {
        signedHeaders['accesstoken'] = accessToken;
      }

      // 添加验证token
      if (verifyToken) {
        signedHeaders['verifyauthtoken'] = verifyToken;
      }

      // 添加设备指纹
      const fingerprint = await this.getFingerprint();
      if (fingerprint) {
        signedHeaders['x-pdd-fingerprint'] = fingerprint;
      }

      return {
        ...requestData,
        headers: signedHeaders,
        signatureInfo: {
          adapter: this.name,
          antiContent: antiContent ? 'present' : 'missing',
          accessToken: accessToken ? 'present' : 'missing',
          fingerprint: fingerprint ? 'present' : 'missing',
          timestamp: Date.now()
        }
      };
    } catch (error) {
      console.error('Pinduoduo signature failed:', error);
      return requestData;
    }
  }

  async getAntiContent(requestData) {
    try {
      if (typeof window.PDD !== 'undefined' && typeof window.PDD.sign === 'function') {
        const signData = {
          url: requestData.url,
          method: requestData.method || 'POST',
          data: requestData.body || {}
        };
        return await window.PDD.sign(signData);
      }

      // 备用方案：使用_nano_fp
      if (typeof window._nano_fp !== 'undefined') {
        return window._nano_fp;
      }

      return null;
    } catch (error) {
      console.error('Failed to get PDD anti-content:', error);
      return null;
    }
  }

  async getAccessToken() {
    try {
      // 从Cookie中获取
      const tokenFromCookie = this.getCookie('PDDAccessToken');
      if (tokenFromCookie) {
        return tokenFromCookie;
      }

      // 从全局变量获取
      if (typeof window.PDDAccessToken !== 'undefined') {
        return window.PDDAccessToken;
      }

      // 从localStorage获取
      const tokenFromStorage = localStorage.getItem('pdd_access_token');
      if (tokenFromStorage) {
        return tokenFromStorage;
      }

      return null;
    } catch (error) {
      console.error('Failed to get PDD access token:', error);
      return null;
    }
  }

  async getVerifyToken() {
    try {
      // 从Cookie中获取
      const verifyToken = this.getCookie('pdd_verify_token');
      if (verifyToken) {
        return verifyToken;
      }

      return null;
    } catch (error) {
      console.error('Failed to get PDD verify token:', error);
      return null;
    }
  }

  async getFingerprint() {
    try {
      if (typeof window.PDD !== 'undefined' && typeof window.PDD.getFingerprint === 'function') {
        return await window.PDD.getFingerprint();
      }

      return null;
    } catch (error) {
      console.error('Failed to get PDD fingerprint:', error);
      return null;
    }
  }

  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(';').shift();
    }
    return null;
  }
}

// 默认适配器（无签名）
class DefaultSignatureAdapter extends BaseSignatureAdapter {
  constructor() {
    super();
    this.name = 'default';
    this.isAvailable = true;
  }

  async checkAvailability() {
    return true;
  }

  async sign(requestData) {
    // 默认不做任何签名处理
    return {
      ...requestData,
      signatureInfo: {
        adapter: this.name,
        timestamp: Date.now(),
        note: 'No signature applied'
      }
    };
  }
}

// 初始化签名适配器管理器
const signatureAdapterManager = new SignatureAdapterManager();

// 导出给其他模块使用
window.signatureAdapterManager = signatureAdapterManager;
