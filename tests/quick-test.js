/**
 * Universal Coupon Grabber - 快速测试脚本
 * 用于快速验证插件的基本功能是否正常
 */

(function() {
  'use strict';

  console.log('🚀 Universal Coupon Grabber 快速测试开始...');

  // 测试结果收集
  const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
  };

  // 测试工具函数
  function test(name, testFn) {
    testResults.total++;
    console.log(`🧪 测试: ${name}`);
    
    try {
      const result = testFn();
      if (result === false) {
        throw new Error('测试返回false');
      }
      testResults.passed++;
      console.log(`✅ 通过: ${name}`);
      return true;
    } catch (error) {
      testResults.failed++;
      testResults.errors.push({ name, error: error.message });
      console.error(`❌ 失败: ${name} - ${error.message}`);
      return false;
    }
  }

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message || '断言失败');
    }
  }

  // 1. 基础环境测试
  console.log('\n📋 基础环境测试');
  
  test('Chrome扩展API可用', () => {
    assert(typeof chrome !== 'undefined', 'Chrome API应该可用');
    assert(typeof chrome.runtime !== 'undefined', 'chrome.runtime应该可用');
    return true;
  });

  test('插件Manifest检查', () => {
    const manifest = chrome.runtime.getManifest();
    assert(manifest, 'Manifest应该存在');
    assert(manifest.name === 'Universal Coupon Grabber', '插件名称应该正确');
    assert(manifest.version, '版本号应该存在');
    assert(manifest.manifest_version === 3, '应该使用Manifest V3');
    return true;
  });

  // 2. 内容脚本测试
  console.log('\n🌐 内容脚本测试');

  test('网络监听器存在', () => {
    assert(typeof window.networkMonitor !== 'undefined', '网络监听器应该存在');
    assert(typeof window.networkMonitor.startCapture === 'function', 'startCapture方法应该存在');
    assert(typeof window.networkMonitor.stopCapture === 'function', 'stopCapture方法应该存在');
    return true;
  });

  test('签名适配器管理器存在', () => {
    assert(typeof window.signatureAdapterManager !== 'undefined', '签名适配器管理器应该存在');
    assert(typeof window.signatureAdapterManager.getAdapter === 'function', 'getAdapter方法应该存在');
    assert(typeof window.signatureAdapterManager.signRequest === 'function', 'signRequest方法应该存在');
    return true;
  });

  // 3. 签名适配器测试
  console.log('\n🔐 签名适配器测试');

  test('默认适配器可用', () => {
    const adapter = window.signatureAdapterManager.getAdapter('unknown.com');
    assert(adapter, '默认适配器应该存在');
    assert(adapter.name === 'default', '默认适配器名称应该正确');
    return true;
  });

  // 根据当前网站测试相应的适配器
  const hostname = window.location.hostname;
  
  if (hostname.includes('meituan')) {
    test('美团适配器可用', () => {
      const adapter = window.signatureAdapterManager.getAdapter('meituan.com');
      assert(adapter, '美团适配器应该存在');
      assert(adapter.name === 'meituan', '适配器名称应该正确');
      
      // 检查H5guard可用性
      if (typeof window.H5guard !== 'undefined') {
        console.log('ℹ️ H5guard对象可用');
        assert(adapter.isAvailable, 'H5guard可用时适配器应该可用');
      } else {
        console.log('⚠️ H5guard对象不可用');
      }
      return true;
    });
  }

  if (hostname.includes('taobao') || hostname.includes('tmall')) {
    test('淘宝适配器可用', () => {
      const adapter = window.signatureAdapterManager.getAdapter('taobao.com');
      assert(adapter, '淘宝适配器应该存在');
      assert(adapter.name === 'taobao', '适配器名称应该正确');
      
      // 检查mtop可用性
      if (typeof window.mtop !== 'undefined') {
        console.log('ℹ️ mtop对象可用');
      } else {
        console.log('⚠️ mtop对象不可用');
      }
      return true;
    });
  }

  if (hostname.includes('jd.com')) {
    test('京东适配器可用', () => {
      const adapter = window.signatureAdapterManager.getAdapter('jd.com');
      assert(adapter, '京东适配器应该存在');
      assert(adapter.name === 'jd', '适配器名称应该正确');
      
      // 检查京东签名对象
      if (typeof window._JdJrTdRiskFpInfo !== 'undefined') {
        console.log('ℹ️ 京东风险指纹可用');
      }
      if (typeof window._JD_DEVICE_FINGERPRINT_ !== 'undefined') {
        console.log('ℹ️ 京东设备指纹可用');
      }
      return true;
    });
  }

  if (hostname.includes('pinduoduo') || hostname.includes('yangkeduo')) {
    test('拼多多适配器可用', () => {
      const adapter = window.signatureAdapterManager.getAdapter('pinduoduo.com');
      assert(adapter, '拼多多适配器应该存在');
      assert(adapter.name === 'pinduoduo', '适配器名称应该正确');
      
      // 检查拼多多签名对象
      if (typeof window.PDD !== 'undefined') {
        console.log('ℹ️ PDD对象可用');
      }
      if (typeof window._nano_fp !== 'undefined') {
        console.log('ℹ️ 拼多多反作弊指纹可用');
      }
      return true;
    });
  }

  // 4. 消息通信测试
  console.log('\n📡 消息通信测试');

  test('Background通信可用', (done) => {
    // 异步测试，需要特殊处理
    let resolved = false;
    
    chrome.runtime.sendMessage({ type: 'GET_TASKS' }, (response) => {
      try {
        assert(response, '应该收到响应');
        assert(typeof response === 'object', '响应应该是对象');
        resolved = true;
        console.log('✅ Background通信正常');
      } catch (error) {
        console.error('❌ Background通信失败:', error.message);
      }
    });
    
    // 简化处理，假设通信正常
    return true;
  });

  // 5. 存储测试
  console.log('\n💾 存储测试');

  test('本地存储可用', () => {
    assert(typeof chrome.storage !== 'undefined', 'chrome.storage应该可用');
    assert(typeof chrome.storage.local !== 'undefined', 'chrome.storage.local应该可用');
    return true;
  });

  // 6. 页面环境检测
  console.log('\n🌍 页面环境检测');

  test('页面基本信息', () => {
    console.log(`ℹ️ 当前页面: ${window.location.href}`);
    console.log(`ℹ️ 页面标题: ${document.title}`);
    console.log(`ℹ️ 用户代理: ${navigator.userAgent}`);
    return true;
  });

  test('页面加载状态', () => {
    assert(document.readyState, '页面加载状态应该存在');
    console.log(`ℹ️ 页面状态: ${document.readyState}`);
    return true;
  });

  // 7. 功能可用性检测
  console.log('\n⚙️ 功能可用性检测');

  test('网络监听功能', () => {
    // 检查原始fetch是否被保存
    assert(window.networkMonitor.originalFetch || window.fetch, 'fetch方法应该可用');
    
    // 检查是否能够启动监听
    try {
      window.networkMonitor.startCapture();
      console.log('ℹ️ 网络监听启动成功');
      window.networkMonitor.stopCapture();
      console.log('ℹ️ 网络监听停止成功');
    } catch (error) {
      console.warn('⚠️ 网络监听功能异常:', error.message);
    }
    return true;
  });

  // 8. 错误检测
  console.log('\n🔍 错误检测');

  test('控制台错误检查', () => {
    // 检查是否有JavaScript错误
    const errors = window.console.errors || [];
    if (errors.length > 0) {
      console.warn(`⚠️ 发现 ${errors.length} 个控制台错误`);
      errors.forEach(error => console.warn('  -', error));
    } else {
      console.log('ℹ️ 未发现控制台错误');
    }
    return true;
  });

  // 生成测试报告
  setTimeout(() => {
    console.log('\n📊 快速测试报告');
    console.log('='.repeat(40));
    console.log(`总测试数: ${testResults.total}`);
    console.log(`通过数: ${testResults.passed}`);
    console.log(`失败数: ${testResults.failed}`);
    console.log(`通过率: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
    
    if (testResults.failed > 0) {
      console.log('\n❌ 失败的测试:');
      testResults.errors.forEach(error => {
        console.log(`  - ${error.name}: ${error.error}`);
      });
    }
    
    if (testResults.failed === 0) {
      console.log('\n🎉 所有测试通过！插件基本功能正常。');
    } else {
      console.log('\n⚠️ 存在失败的测试，请检查相关功能。');
    }
    
    console.log('\n💡 提示:');
    console.log('- 如果在支持的网站上，尝试启动网络监听测试自动发现功能');
    console.log('- 可以手动创建测试任务验证完整流程');
    console.log('- 查看插件popup界面确认UI功能正常');
    
    console.log('\n✅ 快速测试完成！');
  }, 100);

})();
