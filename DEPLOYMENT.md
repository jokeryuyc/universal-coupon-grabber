# Universal Coupon Grabber - 部署指南

## 🚀 快速部署

### 1. 克隆项目

```bash
git clone https://github.com/jokeryuyc/universal-coupon-grabber.git
cd universal-coupon-grabber
```

### 2. 安装到Chrome浏览器

#### 方法一：开发者模式安装（推荐）

1. **打开Chrome扩展管理页面**
   - 在地址栏输入：`chrome://extensions/`
   - 或者：菜单 → 更多工具 → 扩展程序

2. **启用开发者模式**
   - 点击右上角的"开发者模式"开关

3. **加载插件**
   - 点击"加载已解压的扩展程序"
   - 选择 `universal-coupon-grabber` 文件夹
   - 点击"选择文件夹"

4. **验证安装**
   - 扩展列表中出现"Universal Coupon Grabber"
   - 浏览器工具栏出现插件图标
   - 状态显示为"已启用"

#### 方法二：打包安装

1. **打包扩展程序**
   ```bash
   # 在Chrome扩展管理页面
   # 点击"打包扩展程序"
   # 选择项目根目录
   # 生成 .crx 文件
   ```

2. **安装.crx文件**
   - 将.crx文件拖拽到Chrome扩展页面
   - 确认安装

### 3. 配置和测试

1. **基础配置**
   - 点击插件图标打开弹窗
   - 检查状态显示为"就绪"
   - 进入设置页面配置基本参数

2. **功能测试**
   - 访问美团或淘宝网站
   - 启动"开始捕获"功能
   - 验证网络监听是否正常工作

## 🔧 开发环境搭建

### 1. 环境要求

- **Chrome浏览器**: 版本 88+
- **Node.js**: 版本 16+ (可选，用于开发工具)
- **Git**: 版本控制
- **代码编辑器**: VS Code 推荐

### 2. 开发工具安装

```bash
# 安装开发依赖（可选）
npm install -g web-ext  # Firefox扩展开发工具
npm install -g chrome-webstore-upload-cli  # Chrome商店上传工具
```

### 3. 调试配置

1. **启用调试模式**
   ```javascript
   // 在background/service-worker.js中
   const DEBUG_MODE = true;
   ```

2. **查看调试信息**
   - 右键插件图标 → "检查弹出内容"
   - 访问 `chrome://extensions/` → 点击"背景页"
   - 在网页中按F12查看content script日志

## 📦 生产环境部署

### 1. 代码优化

1. **压缩代码**
   ```bash
   # 使用UglifyJS压缩JavaScript
   npm install -g uglify-js
   uglifyjs background/service-worker.js -o background/service-worker.min.js
   ```

2. **优化图标**
   ```bash
   # 压缩PNG图标
   npm install -g imagemin-cli
   imagemin icons/*.png --out-dir=icons/optimized
   ```

3. **清理调试代码**
   ```javascript
   // 移除或注释调试语句
   // console.log('Debug info');
   ```

### 2. 版本管理

1. **更新版本号**
   ```json
   // manifest.json
   {
     "version": "1.0.1",
     "version_name": "1.0.1 Beta"
   }
   ```

2. **生成更新日志**
   ```markdown
   ## v1.0.1 (2024-01-01)
   - 修复网络监听bug
   - 优化UI界面
   - 添加新网站支持
   ```

### 3. 发布到Chrome Web Store

1. **准备发布材料**
   - 应用图标 (128x128)
   - 截图 (1280x800 或 640x400)
   - 应用描述
   - 隐私政策

2. **打包上传**
   ```bash
   # 创建发布包
   zip -r universal-coupon-grabber-v1.0.0.zip . -x "*.git*" "node_modules/*" "*.md"
   ```

3. **提交审核**
   - 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - 上传zip包
   - 填写应用信息
   - 提交审核

## 🔒 安全配置

### 1. 权限最小化

```json
// manifest.json - 只申请必要权限
{
  "permissions": [
    "storage",        // 本地存储
    "activeTab",      // 当前标签页
    "scripting"       // 脚本注入
  ],
  "host_permissions": [
    "https://i.meituan.com/*",
    "https://*.taobao.com/*"
  ]
}
```

### 2. 内容安全策略

```json
// manifest.json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### 3. 数据保护

```javascript
// 敏感数据加密存储
const encryptData = (data) => {
  // 使用Web Crypto API加密
  return crypto.subtle.encrypt(algorithm, key, data);
};
```

## 🚨 故障排除

### 常见问题

1. **插件无法加载**
   ```
   错误：Manifest file is missing or unreadable
   解决：检查manifest.json语法是否正确
   ```

2. **权限被拒绝**
   ```
   错误：Cannot access chrome-extension://
   解决：检查host_permissions配置
   ```

3. **脚本注入失败**
   ```
   错误：Cannot access contents of the page
   解决：确认网站在host_permissions中
   ```

### 调试步骤

1. **检查控制台错误**
   ```javascript
   // 在background页面控制台
   chrome.runtime.lastError
   ```

2. **验证权限**
   ```javascript
   // 检查权限状态
   chrome.permissions.contains({
     permissions: ['storage', 'activeTab']
   }, (result) => console.log(result));
   ```

3. **测试API调用**
   ```javascript
   // 测试存储API
   chrome.storage.local.set({test: 'value'}, () => {
     console.log('Storage test:', chrome.runtime.lastError);
   });
   ```

## 📊 性能监控

### 1. 性能指标

```javascript
// 监控执行时间
const startTime = performance.now();
// ... 执行代码 ...
const endTime = performance.now();
console.log(`执行时间: ${endTime - startTime}ms`);
```

### 2. 内存使用

```javascript
// 监控内存使用
chrome.system.memory.getInfo((info) => {
  console.log('可用内存:', info.availableCapacity);
});
```

### 3. 错误收集

```javascript
// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // 发送错误报告
});
```

## 🔄 自动化部署

### 1. GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy Extension
on:
  push:
    tags:
      - 'v*'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Package Extension
        run: zip -r extension.zip . -x "*.git*"
      - name: Upload to Chrome Store
        uses: mnao305/chrome-extension-upload@v1
        with:
          file-path: extension.zip
          extension-id: ${{ secrets.EXTENSION_ID }}
          client-id: ${{ secrets.CLIENT_ID }}
          client-secret: ${{ secrets.CLIENT_SECRET }}
          refresh-token: ${{ secrets.REFRESH_TOKEN }}
```

### 2. 版本自动更新

```javascript
// background/update-checker.js
class UpdateChecker {
  async checkForUpdates() {
    const response = await fetch('https://api.github.com/repos/jokeryuyc/universal-coupon-grabber/releases/latest');
    const release = await response.json();
    const latestVersion = release.tag_name;
    const currentVersion = chrome.runtime.getManifest().version;
    
    if (this.isNewerVersion(latestVersion, currentVersion)) {
      this.notifyUpdate(latestVersion);
    }
  }
}
```

## 📝 维护指南

### 1. 定期更新

- **每月检查**: 依赖库安全更新
- **每季度**: 功能优化和性能提升
- **按需更新**: 网站API变更适配

### 2. 用户反馈处理

- **GitHub Issues**: 及时响应用户问题
- **功能请求**: 评估和规划新功能
- **Bug修复**: 优先处理影响使用的问题

### 3. 兼容性维护

- **浏览器更新**: 跟进Chrome API变化
- **网站变更**: 及时更新适配规则
- **安全补丁**: 快速响应安全问题

---

**部署完成后，记得在GitHub仓库中添加相应的标签和发布说明！**
