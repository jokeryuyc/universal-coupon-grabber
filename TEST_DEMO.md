# Universal Coupon Grabber 测试演示

## 🎯 测试演示指南

这是一个完整的测试演示，展示如何测试Universal Coupon Grabber插件的各项功能。

## 📋 演示步骤

### 第一步：插件安装测试

#### 1.1 下载和安装
```bash
# 1. 克隆项目
git clone https://github.com/jokeryuyc/universal-coupon-grabber.git
cd universal-coupon-grabber

# 2. 打开Chrome浏览器
# 3. 访问 chrome://extensions/
# 4. 开启"开发者模式"
# 5. 点击"加载已解压的扩展程序"
# 6. 选择 universal-coupon-grabber 文件夹
```

#### 1.2 验证安装
- ✅ 插件图标出现在工具栏
- ✅ 点击图标弹出界面
- ✅ 状态显示"就绪"

### 第二步：基础功能测试

#### 2.1 界面测试
```javascript
// 在任意页面打开控制台 (F12)，执行快速测试：
const script = document.createElement('script');
script.src = chrome.runtime.getURL('tests/quick-test.js');
document.head.appendChild(script);
```

**预期结果**：
```
🚀 Universal Coupon Grabber 快速测试开始...

📋 基础环境测试
🧪 测试: Chrome扩展API可用
✅ 通过: Chrome扩展API可用
🧪 测试: 插件Manifest检查
✅ 通过: 插件Manifest检查

🌐 内容脚本测试
🧪 测试: 网络监听器存在
✅ 通过: 网络监听器存在
🧪 测试: 签名适配器管理器存在
✅ 通过: 签名适配器管理器存在

📊 快速测试报告
========================================
总测试数: 8
通过数: 8
失败数: 0
通过率: 100.00%

🎉 所有测试通过！插件基本功能正常。
```

### 第三步：美团网站测试

#### 3.1 访问美团
```
https://i.meituan.com/promotion/seckill
```

#### 3.2 测试流程
1. **登录美团账号**
2. **启动插件监听**
   - 点击插件图标
   - 点击"开始捕获"按钮
   - 状态变为"监听中"

3. **触发API发现**
   - 在页面上点击任意"抢券"按钮
   - 观察插件是否弹出"发现新任务"提示

4. **创建任务**
   - 点击"创建任务"
   - 填写任务信息
   - 设置执行时间
   - 点击"保存"

#### 3.3 验证签名
```javascript
// 在美团页面控制台执行
console.log('H5guard可用性:', typeof window.H5guard !== 'undefined');
if (window.H5guard) {
  console.log('H5guard方法:', {
    sign: typeof window.H5guard.sign,
    getfp: typeof window.H5guard.getfp
  });
}

// 测试签名适配器
const adapter = window.signatureAdapterManager.getAdapter('meituan.com');
console.log('美团适配器:', adapter.name, '可用性:', adapter.isAvailable);
```

**预期结果**：
```
H5guard可用性: true
H5guard方法: {sign: "function", getfp: "function"}
美团适配器: meituan 可用性: true
```

### 第四步：京东网站测试

#### 4.1 访问京东
```
https://miaosha.jd.com/
```

#### 4.2 测试流程
1. **登录京东账号**
2. **启动插件监听**
3. **点击秒杀商品**
4. **验证API识别**

#### 4.3 验证签名
```javascript
// 在京东页面控制台执行
console.log('京东签名对象检查:');
console.log('风险指纹:', typeof window._JdJrTdRiskFpInfo !== 'undefined');
console.log('设备指纹:', typeof window._JD_DEVICE_FINGERPRINT_ !== 'undefined');

// 测试适配器
const adapter = window.signatureAdapterManager.getAdapter('jd.com');
console.log('京东适配器:', adapter.name, '可用性:', adapter.isAvailable);
```

### 第五步：拼多多网站测试

#### 5.1 访问拼多多
```
https://mobile.yangkeduo.com/
```

#### 5.2 测试流程
1. **登录拼多多账号**
2. **启动插件监听**
3. **参与限时秒杀**
4. **验证API识别**

#### 5.3 验证签名
```javascript
// 在拼多多页面控制台执行
console.log('拼多多签名对象检查:');
console.log('PDD对象:', typeof window.PDD !== 'undefined');
console.log('反作弊指纹:', typeof window._nano_fp !== 'undefined');

// 测试适配器
const adapter = window.signatureAdapterManager.getAdapter('pinduoduo.com');
console.log('拼多多适配器:', adapter.name, '可用性:', adapter.isAvailable);
```

### 第六步：任务执行测试

#### 6.1 创建测试任务
```javascript
// 在插件popup中或通过消息API创建测试任务
const testTask = {
  name: '测试任务',
  url: 'https://httpbin.org/post',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    test: true,
    timestamp: Date.now()
  }),
  executeAt: new Date(Date.now() + 10000), // 10秒后执行
  maxAttempts: 3,
  intervalMs: 1000
};

// 发送创建任务消息
chrome.runtime.sendMessage({
  type: 'CREATE_TASK',
  data: testTask
}, (response) => {
  console.log('任务创建结果:', response);
});
```

#### 6.2 监控任务执行
```javascript
// 获取任务列表
chrome.runtime.sendMessage({
  type: 'GET_TASKS'
}, (response) => {
  console.log('当前任务列表:', response.data);
});

// 获取执行日志
chrome.runtime.sendMessage({
  type: 'GET_EXECUTION_LOGS'
}, (response) => {
  console.log('执行日志:', response.data);
});
```

### 第七步：性能测试

#### 7.1 内存使用测试
```javascript
// 监控内存使用
function monitorMemory() {
  if (performance.memory) {
    const memory = performance.memory;
    console.log('内存使用情况:');
    console.log('已使用:', (memory.usedJSHeapSize / 1024 / 1024).toFixed(2), 'MB');
    console.log('总分配:', (memory.totalJSHeapSize / 1024 / 1024).toFixed(2), 'MB');
    console.log('限制:', (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2), 'MB');
  }
}

// 每10秒监控一次
setInterval(monitorMemory, 10000);
```

#### 7.2 响应时间测试
```javascript
// 测试界面响应时间
function testResponseTime() {
  const start = performance.now();
  
  // 模拟点击操作
  const event = new MouseEvent('click', { bubbles: true });
  document.querySelector('#startCaptureBtn')?.dispatchEvent(event);
  
  const end = performance.now();
  console.log('界面响应时间:', (end - start).toFixed(2), 'ms');
}

testResponseTime();
```

## 📊 测试结果示例

### 成功的测试结果
```
✅ 插件安装成功
✅ 基础功能正常
✅ 美团网站兼容
✅ 京东网站兼容  
✅ 拼多多网站兼容
✅ 任务创建成功
✅ 任务执行正常
✅ 性能表现良好

总体评估: 🎉 插件功能完整，可以正常使用
```

### 可能的问题和解决方案

#### 问题1：H5guard不可用
```
❌ 美团H5guard对象不存在
解决方案：
1. 刷新页面等待完全加载
2. 确认在美团域名下
3. 检查是否被广告拦截器阻止
```

#### 问题2：网络监听失败
```
❌ 网络请求未被拦截
解决方案：
1. 确认已点击"开始捕获"
2. 检查控制台错误信息
3. 重新加载插件
```

#### 问题3：任务执行失败
```
❌ 任务状态显示失败
解决方案：
1. 检查网络连接
2. 验证请求参数
3. 查看详细错误日志
```

## 🎯 测试完成检查清单

- [ ] 插件成功安装并显示图标
- [ ] 基础功能测试全部通过
- [ ] 至少在一个支持网站测试成功
- [ ] 网络监听功能正常工作
- [ ] 签名适配器正确识别
- [ ] 任务创建和执行成功
- [ ] 性能表现在可接受范围内
- [ ] 无严重错误或异常

## 📝 测试报告模板

```markdown
# Universal Coupon Grabber 测试报告

## 测试信息
- 测试日期: 2024-01-01
- 测试人员: [姓名]
- 插件版本: v1.1.0
- 浏览器版本: Chrome 120.0.0.0
- 操作系统: Windows 11

## 测试结果
- 总测试项: 20
- 通过项: 18
- 失败项: 2
- 通过率: 90%

## 测试详情
### ✅ 通过的功能
- 插件安装和基础功能
- 美团网站兼容性
- 京东网站兼容性
- 任务调度功能

### ❌ 失败的功能
- 拼多多签名适配器偶尔失效
- 长时间运行后内存使用偏高

## 建议
1. 优化拼多多签名处理逻辑
2. 改进内存管理机制
3. 增加更多错误处理

## 结论
插件基本功能完整，可以发布使用，建议修复已知问题后发布正式版本。
```

---

**按照以上步骤完成测试后，您就可以确信插件功能正常！** 🎉
