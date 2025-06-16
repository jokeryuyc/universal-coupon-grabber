# 🧪 手动测试步骤（无需代码）

## 📋 测试清单

### ✅ 第一步：插件基础功能

#### 1.1 插件加载检查
- [ ] 打开 `chrome://extensions/`
- [ ] 找到 "Universal Coupon Grabber"
- [ ] 状态显示为"已启用"
- [ ] 无错误提示

#### 1.2 插件图标测试
- [ ] 浏览器工具栏有插件图标
- [ ] 点击图标能打开弹窗
- [ ] 弹窗不是空白页面
- [ ] 显示插件标题

#### 1.3 弹窗界面检查
- [ ] 状态显示为"就绪"
- [ ] 有"开始捕获"按钮
- [ ] 有"新建任务"按钮
- [ ] 底部有"设置"、"帮助"等按钮

**如果第一步有任何问题，请告诉我具体现象！**

---

### ✅ 第二步：网络捕获功能

#### 2.1 启动捕获测试
```
操作步骤：
1. 在京东页面点击插件图标
2. 点击"开始捕获"按钮
3. 观察界面变化

预期结果：
- [ ] 弹窗不会关闭
- [ ] 按钮文字变为"停止捕获"
- [ ] 状态变为"监听中"
- [ ] 日志区域显示"开始监听网络请求..."
```

#### 2.2 停止捕获测试
```
操作步骤：
1. 点击"停止捕获"按钮

预期结果：
- [ ] 按钮文字变为"开始捕获"
- [ ] 状态变为"就绪"
- [ ] 日志显示停止信息
```

**请告诉我第二步的测试结果！**

---

### ✅ 第三步：设置页面功能

#### 3.1 打开设置页面
```
操作步骤：
1. 点击插件图标
2. 点击底部"设置"按钮

预期结果：
- [ ] 新标签页打开
- [ ] 显示设置页面
- [ ] 有多个标签（常规设置、执行配置等）
```

#### 3.2 设置保存测试
```
操作步骤：
1. 在"常规设置"中修改"最大日志条数"
2. 点击"保存设置"按钮

预期结果：
- [ ] 显示"设置保存成功"提示
- [ ] 设置值保持修改状态
- [ ] 无错误提示
```

---

### ✅ 第四步：Background Service Worker检查

#### 4.1 检查Background状态
```
操作步骤：
1. 打开 chrome://extensions/
2. 找到插件，点击"service worker"链接
3. 查看控制台日志

预期结果：
- [ ] 看到："Universal Coupon Grabber - Background Service Started"
- [ ] 看到设置加载信息
- [ ] 无红色错误信息
```

#### 4.2 测试Background通信
```
在Background控制台中执行：
console.log('Background测试:', typeof chrome.runtime);

预期结果：
- [ ] 输出："Background测试: object"
- [ ] 无错误信息
```

---

### ✅ 第五步：Content Script检查

#### 5.1 检查Content Script加载
```
操作步骤：
1. 在京东页面按F12打开控制台
2. 查看控制台日志

预期结果：
- [ ] 看到："Universal Coupon Grabber - Content Script Initialized"
- [ ] 看到："Current website: xxx.jd.com"
- [ ] 无红色错误信息
```

#### 5.2 检查Content Script对象
```
在京东页面控制台中执行：
console.log('Network Monitor:', typeof window.networkMonitor);
console.log('Signature Manager:', typeof window.signatureAdapterManager);

预期结果：
- [ ] Network Monitor: object 或 undefined
- [ ] Signature Manager: object 或 undefined
- [ ] 至少一个对象存在
```

---

## 📊 测试结果记录

请按照以下格式告诉我测试结果：

```
第一步：插件基础功能
- 插件加载：✅通过 / ❌失败
- 插件图标：✅通过 / ❌失败  
- 弹窗界面：✅通过 / ❌失败

第二步：网络捕获功能
- 启动捕获：✅通过 / ❌失败
- 停止捕获：✅通过 / ❌失败

第三步：设置页面功能
- 打开设置：✅通过 / ❌失败
- 设置保存：✅通过 / ❌失败

第四步：Background检查
- Background状态：✅通过 / ❌失败
- Background通信：✅通过 / ❌失败

第五步：Content Script检查
- Script加载：✅通过 / ❌失败
- Script对象：✅通过 / ❌失败
```

## 🚨 如果遇到问题

### 常见问题处理

1. **插件图标点击无反应**
   - 重新加载插件
   - 重启Chrome浏览器

2. **弹窗显示空白**
   - 右键插件图标 → "检查弹出内容"
   - 查看控制台错误

3. **设置页面打不开**
   - 检查popup.js是否有错误
   - 查看background service worker状态

4. **Content Script未加载**
   - 刷新京东页面
   - 检查manifest.json的host_permissions

### 错误信息收集

如果有错误，请提供：
1. **具体的错误信息**
2. **控制台截图**
3. **操作步骤**
4. **Chrome版本**

---

**现在开始第一步测试，逐步告诉我结果！** 🚀
