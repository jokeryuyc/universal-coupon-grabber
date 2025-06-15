# Universal Coupon Grabber

> 🎯 通用抢券浏览器插件 - 支持各大网站的优惠券抢购和活动报名自动化

## 🌟 项目特色

基于两个优秀项目的精华设计：
- **RequestManager**: 提供强大的HTTP请求管理和任务调度能力
- **美团抢券工具**: 提供网络监听、请求签名和反反作弊技术

### ✨ 核心功能

- 🎯 **智能发现**: 自动监听和识别网站的抢券/报名API
- 🔐 **签名适配**: 支持多网站的反爬虫机制（美团H5guard、淘宝、京东等）
- ⏰ **精确调度**: 毫秒级定时执行，网络延迟自动补偿
- 🔄 **智能重试**: 可配置的重试策略和成功/失败条件判断
- 📊 **实时监控**: 任务状态实时显示，详细的执行日志
- 🛠️ **易于配置**: 可视化任务创建，支持导入cURL命令

### 🏗️ 技术架构

```
浏览器插件架构
├── Content Scripts (注入到网页)
│   ├── 网络监听器 - 拦截和分析HTTP请求
│   ├── 签名适配器 - 处理各网站的反爬虫机制
│   └── 自动发现引擎 - 智能识别抢券API
├── Background Service Worker
│   ├── 任务调度器 - 高精度定时和重试管理
│   └── 执行引擎 - 并发请求处理和结果分析
├── Popup UI
│   ├── 任务管理界面 - 创建、编辑、监控任务
│   └── 实时日志面板 - 执行状态和错误信息
└── 存储层
    ├── 本地存储 - 任务配置和执行历史
    └── 网站适配规则库 - 支持新网站快速接入
```

## 🚀 快速开始

### 安装插件

1. 下载项目代码
```bash
git clone https://github.com/jokeryuyc/universal-coupon-grabber.git
cd universal-coupon-grabber
```

2. 在Chrome中加载插件
   - 打开 `chrome://extensions/`
   - 开启"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目文件夹

### 基本使用

#### 方式一：自动发现（推荐）

1. **访问目标网站**（如美团、淘宝等）
2. **点击插件图标**，在弹窗中点击"开始捕获"
3. **正常浏览**抢券页面，插件会自动识别相关API
4. **确认任务**：插件发现API后会弹出建议，点击"创建任务"
5. **配置执行时间**，点击"保存"
6. **等待执行**：任务会在指定时间自动执行

#### 方式二：手动创建

1. **抓取请求**：使用F12开发者工具复制cURL命令
2. **创建任务**：点击"新建任务"或"导入任务"
3. **配置参数**：设置执行时间、重试次数等
4. **启动任务**：保存后任务自动开始调度

## 🎯 支持的网站

### 已适配网站

| 网站 | 支持功能 | 签名机制 | 状态 |
|------|----------|----------|------|
| 美团 | 秒杀券、闪购、团购 | H5guard | ✅ 完整支持 |
| 淘宝/天猫 | 聚划算、优惠券、直播券 | mtop | ✅ 完整支持 |
| 京东 | 秒杀、优惠券、闪购、预约 | JD风险指纹 | ✅ 完整支持 |
| 拼多多 | 限时秒杀、拼团、砍价、抽奖 | PDD反作弊 | ✅ 完整支持 |

### 通用支持

对于未特别适配的网站，插件提供通用的HTTP请求管理功能，支持：
- 基础的POST/GET请求
- 自定义请求头和请求体
- 定时执行和重试机制

## ⚙️ 配置说明

### 网站适配规则

每个网站的适配规则存储在 `rules/` 目录下，例如 `rules/meituan.com.json`：

```json
{
  "website": "meituan.com",
  "capturePatterns": [
    {
      "name": "seckill_coupon",
      "urlPattern": "/promotion/seckill/couponcomponent/grabcoupon",
      "method": "POST",
      "priority": 0.95
    }
  ],
  "signatureConfig": {
    "type": "h5guard",
    "required": true,
    "fingerprintMethod": "window.H5guard.getfp",
    "signMethod": "window.H5guard.sign"
  }
}
```

### 任务配置

```json
{
  "name": "美团秒杀券",
  "schedule": {
    "executeAt": "2024-01-01T12:00:00.000Z",
    "advanceMs": 500
  },
  "execution": {
    "maxAttempts": 10,
    "intervalMs": 100,
    "concurrency": 1
  },
  "successCondition": {
    "type": "response_contains",
    "value": "success"
  }
}
```

## 🔧 开发指南

### 项目结构

```
universal-coupon-grabber/
├── manifest.json              # 插件配置文件
├── background/                # 后台脚本
│   ├── service-worker.js      # 主服务工作器
│   ├── task-scheduler.js      # 任务调度器
│   └── execution-engine.js    # 执行引擎
├── content/                   # 内容脚本
│   ├── network-monitor.js     # 网络监听器
│   ├── signature-adapters.js  # 签名适配器
│   └── main.js               # 主入口
├── popup/                     # 弹窗界面
│   ├── popup.html            # 界面结构
│   ├── popup.css             # 样式文件
│   └── popup.js              # 交互逻辑
├── rules/                     # 网站适配规则
│   ├── meituan.com.json      # 美团规则
│   └── taobao.com.json       # 淘宝规则
└── icons/                     # 图标资源
```

### 添加新网站支持

1. **创建规则文件** `rules/example.com.json`
2. **定义捕获模式** 和签名配置
3. **扩展签名适配器**（如需要）
4. **测试验证** 功能正常

### 扩展签名适配器

```javascript
class ExampleSignatureAdapter extends BaseSignatureAdapter {
  constructor() {
    super();
    this.name = 'example';
  }

  async sign(requestData) {
    // 实现特定网站的签名逻辑
    return signedRequestData;
  }
}
```

## 🛡️ 安全说明

- 插件仅在用户主动操作时工作，不会自动执行任何操作
- 所有数据存储在本地，不会上传到任何服务器
- 签名机制依赖网站自身的JavaScript对象，不破解或逆向任何加密算法
- 请遵守各网站的使用条款，合理使用自动化功能

## 📝 更新日志

### v1.1.0 (2024-01-01)
- ✨ 新增京东和拼多多支持
- ✅ 实现京东风险指纹签名机制
- ✅ 实现拼多多反作弊签名机制
- ✅ 优化网络监听和自动发现
- ✅ 扩展支持更多抢券场景

### v1.0.0 (2024-01-01)
- ✨ 初始版本发布
- ✅ 支持美团和淘宝网站
- ✅ 实现网络监听和自动发现
- ✅ 完成任务调度和执行引擎
- ✅ 提供可视化管理界面

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

项目地址：https://github.com/jokeryuyc/universal-coupon-grabber

## 📄 许可证

本项目基于 MIT 许可证开源 - 查看 [LICENSE](LICENSE) 文件了解详情。

## ⚠️ 免责声明

本工具仅供学习和研究使用。使用者应当遵守相关网站的服务条款和法律法规，作者不承担因使用本工具而产生的任何责任。
