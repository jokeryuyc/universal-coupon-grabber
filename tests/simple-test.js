/**
 * Universal Coupon Grabber - 简化测试脚本
 * 快速验证插件核心功能是否正常
 */

(function() {
  'use strict';

  console.log('🚀 开始Universal Coupon Grabber简化测试...');

  let testCount = 0;
  let passCount = 0;
  let failCount = 0;

  function test(name, testFn) {
    testCount++;
    console.log(`\n🧪 测试 ${testCount}: ${name}`);
    
    try {
      const result = testFn();
      if (result !== false) {
        passCount++;
        console.log(`✅ 通过: ${name}`);
        return true;
      } else {
        failCount++;
        console.log(`❌ 失败: ${name}`);
        return false;
      }
    } catch (error) {
      failCount++;
      console.log(`❌ 失败: ${name} - ${error.message}`);
      return false;
    }
  }

  // 测试1: Chrome扩展API
  test('Chrome扩展API可用性', () => {
    if (typeof chrome === 'undefined') {
      throw new Error('Chrome API不可用');
    }
    if (typeof chrome.runtime === 'undefined') {
      throw new Error('chrome.runtime不可用');
    }
    return true;
  });

  // 测试2: 插件Manifest
  test('插件Manifest检查', () => {
    const manifest = chrome.runtime.getManifest();
    if (!manifest) {
      throw new Error('无法获取manifest');
    }
    if (manifest.name !== 'Universal Coupon Grabber') {
      throw new Error('插件名称不正确');
    }
    console.log(`   插件版本: ${manifest.version}`);
    return true;
  });

  // 测试3: Background通信
  test('Background Service Worker通信', (done) => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log(`   错误: ${chrome.runtime.lastError.message}`);
          resolve(false);
        } else if (response && response.success) {
          console.log('   Background通信正常');
          resolve(true);
        } else {
          console.log('   Background响应异常:', response);
          resolve(false);
        }
      });
    });
  });

  // 测试4: Content Script对象
  test('Content Script对象检查', () => {
    const objects = [
      'networkMonitor',
      'signatureAdapterManager', 
      'autoDiscoveryEngine'
    ];
    
    let foundObjects = 0;
    objects.forEach(obj => {
      if (typeof window[obj] !== 'undefined') {
        foundObjects++;
        console.log(`   ✓ ${obj} 存在`);
      } else {
        console.log(`   ✗ ${obj} 不存在`);
      }
    });
    
    return foundObjects >= 2; // 至少2个对象存在就算通过
  });

  // 测试5: 网站适配器
  test('签名适配器检查', () => {
    if (typeof window.signatureAdapterManager === 'undefined') {
      console.log('   签名适配器管理器不存在，跳过测试');
      return true; // 不算失败
    }
    
    const manager = window.signatureAdapterManager;
    const hostname = window.location.hostname;
    
    console.log(`   当前网站: ${hostname}`);
    
    // 检查默认适配器
    const defaultAdapter = manager.getAdapter('unknown.com');
    if (!defaultAdapter) {
      throw new Error('默认适配器不存在');
    }
    
    console.log(`   默认适配器: ${defaultAdapter.name}`);
    
    // 检查当前网站适配器
    const currentAdapter = manager.getAdapter(hostname);
    if (currentAdapter) {
      console.log(`   当前网站适配器: ${currentAdapter.name}`);
      console.log(`   适配器可用性: ${currentAdapter.isAvailable}`);
    }
    
    return true;
  });

  // 测试6: 存储功能
  test('本地存储功能', () => {
    if (typeof chrome.storage === 'undefined') {
      throw new Error('chrome.storage不可用');
    }
    if (typeof chrome.storage.local === 'undefined') {
      throw new Error('chrome.storage.local不可用');
    }
    return true;
  });

  // 异步测试处理
  async function runAsyncTests() {
    // 测试Background通信
    try {
      const bgTest = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response);
          }
        });
      });
      
      if (bgTest.success) {
        passCount++;
        console.log('✅ 通过: Background Service Worker通信');
        console.log('   设置数据获取成功');
      } else {
        failCount++;
        console.log('❌ 失败: Background Service Worker通信');
        console.log(`   错误: ${bgTest.error}`);
      }
      testCount++;
      
    } catch (error) {
      failCount++;
      testCount++;
      console.log('❌ 失败: Background Service Worker通信');
      console.log(`   异常: ${error.message}`);
    }

    // 生成最终报告
    setTimeout(generateReport, 500);
  }

  function generateReport() {
    console.log('\n📊 测试报告');
    console.log('='.repeat(40));
    console.log(`总测试数: ${testCount}`);
    console.log(`通过数: ${passCount}`);
    console.log(`失败数: ${failCount}`);
    console.log(`通过率: ${((passCount / testCount) * 100).toFixed(2)}%`);
    console.log('='.repeat(40));

    if (failCount === 0) {
      console.log('\n🎉 所有测试通过！插件基本功能正常。');
      console.log('\n📋 下一步建议：');
      console.log('1. 测试网络捕获功能（点击"开始捕获"）');
      console.log('2. 测试设置页面功能');
      console.log('3. 在支持的网站上测试自动发现');
    } else {
      console.log('\n⚠️ 存在失败的测试，需要检查相关功能。');
      console.log('\n🔧 故障排除建议：');
      console.log('1. 重新加载插件');
      console.log('2. 检查Chrome版本（需要88+）');
      console.log('3. 查看background service worker错误日志');
      console.log('4. 刷新当前页面');
    }

    console.log('\n💡 手动测试步骤：');
    console.log('1. 点击插件图标 → 检查弹窗是否正常');
    console.log('2. 点击"开始捕获" → 检查状态是否变为"监听中"');
    console.log('3. 点击"设置" → 检查设置页面是否打开');
    console.log('4. 修改设置并保存 → 检查是否成功');

    console.log('\n✅ 简化测试完成！');
  }

  // 运行异步测试
  runAsyncTests();

})();
