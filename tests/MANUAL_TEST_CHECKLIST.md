# Universal Coupon Grabber 手动测试检查清单

## 🚀 测试前准备

### 环境准备
- [ ] Chrome浏览器版本 88+ 
- [ ] 网络连接稳定
- [ ] 已下载插件源码到本地
- [ ] 准备测试账号（美团、淘宝、京东、拼多多）

### 插件安装
- [ ] 打开Chrome扩展管理页面 (`chrome://extensions/`)
- [ ] 开启"开发者模式"
- [ ] 点击"加载已解压的扩展程序"
- [ ] 选择`universal-coupon-grabber`文件夹
- [ ] 确认插件图标出现在工具栏

## 📋 基础功能测试

### 插件界面测试
- [ ] 点击插件图标，弹窗正常显示
- [ ] 状态显示为"就绪"
- [ ] "开始捕获"按钮可点击
- [ ] "新建任务"按钮可点击
- [ ] "导入任务"按钮可点击
- [ ] 底部设置、帮助、关于按钮正常

### 设置页面测试
- [ ] 点击"设置"按钮打开设置页面
- [ ] 各个标签页可以正常切换
- [ ] 设置项可以正常修改
- [ ] "保存设置"按钮正常工作
- [ ] 设置能够持久保存

## 🌐 网络监听测试

### 美团网站测试
**测试地址**: `https://i.meituan.com/promotion/seckill`

- [ ] 访问美团抢券页面
- [ ] 登录美团账号
- [ ] 启动插件"开始捕获"
- [ ] 状态变为"监听中"
- [ ] 点击页面上的"抢券"按钮
- [ ] 插件自动弹出"发现新任务"提示
- [ ] 任务信息显示正确（URL、方法、置信度）
- [ ] 点击"创建任务"能够正常创建

**检查点**:
- 网络请求被正确拦截
- H5guard签名对象可用
- API模式识别准确

### 淘宝网站测试
**测试地址**: `https://ju.taobao.com/`

- [ ] 访问淘宝聚划算页面
- [ ] 登录淘宝账号
- [ ] 启动插件监听
- [ ] 点击聚划算商品或优惠券
- [ ] 验证API自动发现
- [ ] 检查mtop请求识别
- [ ] 创建任务测试

**检查点**:
- mtop请求正确识别
- token信息获取正常
- 请求参数解析正确

### 京东网站测试
**测试地址**: `https://miaosha.jd.com/`

- [ ] 访问京东秒杀页面
- [ ] 登录京东账号
- [ ] 启动插件监听
- [ ] 点击"立即抢购"按钮
- [ ] 验证秒杀API识别
- [ ] 检查签名信息
- [ ] 创建秒杀任务

**检查点**:
- 京东API模式识别
- 风险指纹获取正常
- 设备指纹可用
- Cookie信息完整

### 拼多多网站测试
**测试地址**: `https://mobile.yangkeduo.com/`

- [ ] 访问拼多多移动版
- [ ] 登录拼多多账号
- [ ] 启动插件监听
- [ ] 参与限时秒杀活动
- [ ] 验证API自动发现
- [ ] 检查反作弊处理
- [ ] 创建抢购任务

**检查点**:
- 拼多多API识别
- 反作弊token获取
- 访问token正常
- 请求格式正确

## 🔐 签名适配器测试

### 美团H5guard测试
- [ ] 在美团页面打开控制台
- [ ] 执行: `console.log(window.H5guard)`
- [ ] 确认H5guard对象存在
- [ ] 执行: `window.H5guard.getfp()`
- [ ] 确认指纹生成成功
- [ ] 测试签名生成功能

### 淘宝mtop测试
- [ ] 在淘宝页面打开控制台
- [ ] 执行: `console.log(window.mtop)`
- [ ] 确认mtop对象存在
- [ ] 执行: `console.log(window._tb_token_)`
- [ ] 确认token存在
- [ ] 测试签名适配器

### 京东签名测试
- [ ] 在京东页面打开控制台
- [ ] 执行: `console.log(window._JdJrTdRiskFpInfo)`
- [ ] 执行: `console.log(window._JD_DEVICE_FINGERPRINT_)`
- [ ] 确认指纹对象存在
- [ ] 测试签名适配器工作

### 拼多多签名测试
- [ ] 在拼多多页面打开控制台
- [ ] 执行: `console.log(window.PDD)`
- [ ] 执行: `console.log(window._nano_fp)`
- [ ] 确认反作弊对象存在
- [ ] 测试签名适配器功能

## ⏰ 任务管理测试

### 任务创建测试
- [ ] 点击"新建任务"按钮
- [ ] 填写任务信息
  - [ ] 任务名称
  - [ ] 请求URL
  - [ ] 请求方法
  - [ ] 执行时间
  - [ ] 重试参数
- [ ] 点击"测试"按钮验证请求
- [ ] 点击"保存"创建任务
- [ ] 确认任务出现在列表中

### 任务执行测试
- [ ] 创建立即执行的测试任务
- [ ] 点击"启动"按钮
- [ ] 观察任务状态变化
- [ ] 查看实时日志
- [ ] 确认执行结果

### 定时任务测试
- [ ] 创建30秒后执行的任务
- [ ] 启动任务
- [ ] 等待自动执行
- [ ] 验证执行时间精度
- [ ] 检查执行结果

### 重试机制测试
- [ ] 创建会失败的测试任务
- [ ] 设置重试次数为3次
- [ ] 设置重试间隔为500ms
- [ ] 启动任务
- [ ] 观察重试过程
- [ ] 确认重试次数正确

## 🔗 集成测试

### 美团完整流程测试
- [ ] 访问美团抢券页面
- [ ] 启动监听发现任务
- [ ] 配置任务参数
- [ ] 设置执行时间
- [ ] 执行抢券任务
- [ ] 检查最终结果
- [ ] 验证日志记录

### 京东完整流程测试
- [ ] 访问京东秒杀页面
- [ ] 自动发现秒杀API
- [ ] 创建秒杀任务
- [ ] 配置提前量(300ms)
- [ ] 执行秒杀任务
- [ ] 验证签名正确性
- [ ] 检查执行结果

### 拼多多完整流程测试
- [ ] 访问拼多多活动页面
- [ ] 发现抢购API
- [ ] 创建抢购任务
- [ ] 配置参数
- [ ] 执行任务
- [ ] 验证反作弊处理
- [ ] 检查结果

## 📊 性能测试

### 内存使用测试
- [ ] 安装插件后检查内存使用
- [ ] 运行多个任务
- [ ] 长时间运行(30分钟)
- [ ] 监控内存变化
- [ ] 确认无内存泄漏

### 响应时间测试
- [ ] 测试界面响应时间
- [ ] 测试任务创建速度
- [ ] 测试任务执行延迟
- [ ] 测试网络监听响应
- [ ] 记录性能数据

## 🔧 错误处理测试

### 网络错误测试
- [ ] 断开网络连接
- [ ] 执行任务
- [ ] 验证错误处理
- [ ] 恢复网络
- [ ] 测试重试机制

### 签名失败测试
- [ ] 在未登录状态测试
- [ ] 验证签名失败处理
- [ ] 检查错误提示
- [ ] 确认任务状态正确

### 权限错误测试
- [ ] 访问无权限的页面
- [ ] 测试插件行为
- [ ] 验证错误处理
- [ ] 检查用户提示

## 📱 兼容性测试

### 浏览器兼容性
- [ ] Chrome 88 测试
- [ ] Chrome 100+ 测试
- [ ] Edge 88+ 测试
- [ ] 记录兼容性问题

### 操作系统兼容性
- [ ] Windows 10/11 测试
- [ ] macOS 测试
- [ ] Linux 测试
- [ ] 对比功能差异

## ✅ 测试完成检查

### 功能完整性
- [ ] 所有核心功能正常
- [ ] 支持的网站都能工作
- [ ] 签名机制正常
- [ ] 任务调度准确

### 用户体验
- [ ] 界面美观易用
- [ ] 操作流程顺畅
- [ ] 错误提示清晰
- [ ] 帮助文档完整

### 性能表现
- [ ] 响应时间合理
- [ ] 内存使用正常
- [ ] 长时间运行稳定
- [ ] 无明显性能问题

### 安全性
- [ ] 数据本地存储
- [ ] 无敏感信息泄露
- [ ] 权限使用合理
- [ ] 符合安全规范

## 📋 测试报告

### 测试环境
- 操作系统: 
- 浏览器版本: 
- 插件版本: 
- 测试日期: 

### 测试结果
- 总测试项: 
- 通过项: 
- 失败项: 
- 通过率: 

### 发现的问题
| 问题描述 | 严重程度 | 复现步骤 | 状态 |
|----------|----------|----------|------|
|          |          |          |      |

### 测试结论
- [ ] 功能测试通过
- [ ] 性能测试通过
- [ ] 兼容性测试通过
- [ ] 建议发布
- [ ] 需要修复后再测试

---

**完成所有测试项后，请填写测试报告并提交！** 📊
