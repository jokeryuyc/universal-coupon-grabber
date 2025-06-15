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
    this.isAvailable = typeof window.jdSign !== 'undefined' ||
                      typeof window._JdJrTdRiskFpInfo !== 'undefined';
    
    console.log(`JD signature available: ${this.isAvailable}`);
    return this.isAvailable;
  }

  async sign(requestData) {
    if (!this.isAvailable) {
      return requestData;
    }

    try {
      // 京东签名逻辑（需要根据实际情况实现）
      const signedHeaders = {
        ...requestData.headers
      };

      return {
        ...requestData,
        headers: signedHeaders,
        signatureInfo: {
          adapter: this.name,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      console.error('JD signature failed:', error);
      return requestData;
    }
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
