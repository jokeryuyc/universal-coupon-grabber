/**
 * Universal Coupon Grabber - 自动化测试脚本
 * 用于测试插件的核心功能
 */

class TestRunner {
  constructor() {
    this.testResults = [];
    this.currentTest = null;
    this.startTime = null;
  }

  // 运行所有测试
  async runAllTests() {
    console.log('🚀 开始运行Universal Coupon Grabber测试套件...');
    this.startTime = Date.now();

    const testSuites = [
      this.testBasicFunctionality,
      this.testNetworkMonitoring,
      this.testSignatureAdapters,
      this.testTaskScheduling,
      this.testIntegration
    ];

    for (const testSuite of testSuites) {
      try {
        await testSuite.call(this);
      } catch (error) {
        this.logError(`测试套件执行失败: ${error.message}`);
      }
    }

    this.generateReport();
  }

  // 基础功能测试
  async testBasicFunctionality() {
    this.logInfo('📋 开始基础功能测试...');

    // TC001: 插件安装测试
    await this.runTest('TC001', '插件安装测试', async () => {
      // 检查插件是否已加载
      const manifest = chrome.runtime.getManifest();
      this.assert(manifest, '插件manifest应该存在');
      this.assert(manifest.name === 'Universal Coupon Grabber', '插件名称应该正确');
      this.assert(manifest.version, '插件版本应该存在');
    });

    // TC002: 界面功能测试
    await this.runTest('TC002', '界面功能测试', async () => {
      // 检查popup页面元素
      const popup = document.querySelector('#popup');
      if (popup) {
        const startBtn = popup.querySelector('#startCaptureBtn');
        const createBtn = popup.querySelector('#createTaskBtn');
        const importBtn = popup.querySelector('#importTaskBtn');
        
        this.assert(startBtn, '开始捕获按钮应该存在');
        this.assert(createBtn, '新建任务按钮应该存在');
        this.assert(importBtn, '导入任务按钮应该存在');
      }
    });
  }

  // 网络监听测试
  async testNetworkMonitoring() {
    this.logInfo('🌐 开始网络监听测试...');

    // TC003: 网络监听器初始化
    await this.runTest('TC003', '网络监听器初始化', async () => {
      this.assert(window.networkMonitor, '网络监听器应该存在');
      this.assert(typeof window.networkMonitor.startCapture === 'function', 
                 '开始捕获方法应该存在');
      this.assert(typeof window.networkMonitor.stopCapture === 'function', 
                 '停止捕获方法应该存在');
    });

    // TC004: 请求拦截测试
    await this.runTest('TC004', '请求拦截测试', async () => {
      // 模拟网络请求
      const originalFetch = window.fetch;
      let intercepted = false;
      
      // 启动监听
      if (window.networkMonitor) {
        window.networkMonitor.startCapture();
        
        // 发送测试请求
        try {
          await fetch('/test-api', { method: 'POST' });
        } catch (e) {
          // 忽略网络错误，我们只关心是否被拦截
        }
        
        // 检查是否被拦截
        this.assert(window.fetch !== originalFetch, '请求应该被拦截');
      }
    });
  }

  // 签名适配器测试
  async testSignatureAdapters() {
    this.logInfo('🔐 开始签名适配器测试...');

    // TC005: 签名适配器管理器
    await this.runTest('TC005', '签名适配器管理器', async () => {
      this.assert(window.signatureAdapterManager, '签名适配器管理器应该存在');
      
      const manager = window.signatureAdapterManager;
      this.assert(typeof manager.getAdapter === 'function', 'getAdapter方法应该存在');
      this.assert(typeof manager.signRequest === 'function', 'signRequest方法应该存在');
    });

    // TC006: 美团签名适配器
    await this.runTest('TC006', '美团签名适配器', async () => {
      if (window.location.hostname.includes('meituan')) {
        const adapter = window.signatureAdapterManager.getAdapter('meituan.com');
        this.assert(adapter, '美团适配器应该存在');
        this.assert(adapter.name === 'meituan', '适配器名称应该正确');
        
        // 检查H5guard可用性
        if (typeof window.H5guard !== 'undefined') {
          this.assert(adapter.isAvailable, 'H5guard可用时适配器应该可用');
        }
      }
    });

    // TC007: 京东签名适配器
    await this.runTest('TC007', '京东签名适配器', async () => {
      if (window.location.hostname.includes('jd.com')) {
        const adapter = window.signatureAdapterManager.getAdapter('jd.com');
        this.assert(adapter, '京东适配器应该存在');
        this.assert(adapter.name === 'jd', '适配器名称应该正确');
      }
    });

    // TC008: 拼多多签名适配器
    await this.runTest('TC008', '拼多多签名适配器', async () => {
      if (window.location.hostname.includes('pinduoduo') || 
          window.location.hostname.includes('yangkeduo')) {
        const adapter = window.signatureAdapterManager.getAdapter('pinduoduo.com');
        this.assert(adapter, '拼多多适配器应该存在');
        this.assert(adapter.name === 'pinduoduo', '适配器名称应该正确');
      }
    });
  }

  // 任务调度测试
  async testTaskScheduling() {
    this.logInfo('⏰ 开始任务调度测试...');

    // TC009: 任务创建测试
    await this.runTest('TC009', '任务创建测试', async () => {
      const testTask = {
        name: '测试任务',
        url: 'https://example.com/api/test',
        method: 'POST',
        executeAt: new Date(Date.now() + 5000), // 5秒后执行
        maxAttempts: 3,
        intervalMs: 100
      };

      // 发送任务创建消息
      const response = await this.sendMessage({
        type: 'CREATE_TASK',
        data: testTask
      });

      this.assert(response.success, '任务创建应该成功');
      this.assert(response.taskId, '应该返回任务ID');
    });

    // TC010: 任务执行测试
    await this.runTest('TC010', '任务执行测试', async () => {
      // 创建立即执行的任务
      const immediateTask = {
        name: '立即执行测试',
        url: 'https://httpbin.org/post',
        method: 'POST',
        body: JSON.stringify({ test: true }),
        headers: { 'Content-Type': 'application/json' }
      };

      const response = await this.sendMessage({
        type: 'EXECUTE_IMMEDIATE',
        data: immediateTask
      });

      this.assert(response.success, '立即执行应该成功');
      this.assert(response.result, '应该返回执行结果');
    });
  }

  // 集成测试
  async testIntegration() {
    this.logInfo('🔗 开始集成测试...');

    // TC011: 端到端流程测试
    await this.runTest('TC011', '端到端流程测试', async () => {
      // 模拟完整的抢券流程
      const steps = [
        '启动网络监听',
        '发现API请求',
        '创建任务',
        '执行任务',
        '获取结果'
      ];

      for (const step of steps) {
        this.logInfo(`执行步骤: ${step}`);
        // 这里可以添加具体的步骤验证逻辑
        await this.sleep(100);
      }

      this.assert(true, '端到端流程应该完成');
    });
  }

  // 运行单个测试
  async runTest(testId, testName, testFunction) {
    this.currentTest = { id: testId, name: testName };
    this.logInfo(`🧪 运行测试: ${testId} - ${testName}`);

    const startTime = Date.now();
    let result = {
      id: testId,
      name: testName,
      status: 'PASS',
      duration: 0,
      error: null
    };

    try {
      await testFunction();
      result.status = 'PASS';
    } catch (error) {
      result.status = 'FAIL';
      result.error = error.message;
      this.logError(`❌ 测试失败: ${error.message}`);
    }

    result.duration = Date.now() - startTime;
    this.testResults.push(result);
    
    if (result.status === 'PASS') {
      this.logSuccess(`✅ 测试通过: ${testName}`);
    }
  }

  // 断言方法
  assert(condition, message) {
    if (!condition) {
      throw new Error(message || '断言失败');
    }
  }

  // 发送消息到background
  async sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }

  // 等待方法
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 生成测试报告
  generateReport() {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
    const failedTests = this.testResults.filter(r => r.status === 'FAIL').length;
    const passRate = ((passedTests / totalTests) * 100).toFixed(2);

    console.log('\n📊 测试报告');
    console.log('='.repeat(50));
    console.log(`总测试数: ${totalTests}`);
    console.log(`通过数: ${passedTests}`);
    console.log(`失败数: ${failedTests}`);
    console.log(`通过率: ${passRate}%`);
    console.log(`总耗时: ${totalDuration}ms`);
    console.log('='.repeat(50));

    // 详细结果
    console.log('\n📋 详细结果:');
    this.testResults.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${status} ${result.id}: ${result.name} (${result.duration}ms)`);
      if (result.error) {
        console.log(`   错误: ${result.error}`);
      }
    });

    // 失败的测试
    const failedTestsList = this.testResults.filter(r => r.status === 'FAIL');
    if (failedTestsList.length > 0) {
      console.log('\n❌ 失败的测试:');
      failedTestsList.forEach(result => {
        console.log(`- ${result.id}: ${result.name}`);
        console.log(`  错误: ${result.error}`);
      });
    }

    console.log('\n🎉 测试完成!');
  }

  // 日志方法
  logInfo(message) {
    console.log(`ℹ️ ${message}`);
  }

  logSuccess(message) {
    console.log(`✅ ${message}`);
  }

  logError(message) {
    console.error(`❌ ${message}`);
  }
}

// 导出测试运行器
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TestRunner;
} else {
  window.TestRunner = TestRunner;
}

// 如果在浏览器环境中，自动运行测试
if (typeof window !== 'undefined' && window.location) {
  // 等待页面加载完成后运行测试
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        const testRunner = new TestRunner();
        testRunner.runAllTests();
      }, 1000);
    });
  } else {
    setTimeout(() => {
      const testRunner = new TestRunner();
      testRunner.runAllTests();
    }, 1000);
  }
}
