# Universal Coupon Grabber - 使用指南

## 🚀 快速开始

### 1. 安装插件

1. **下载项目**
   ```bash
   git clone https://github.com/jokeryuyc/universal-coupon-grabber.git
   ```

2. **加载到Chrome**
   - 打开 `chrome://extensions/`
   - 开启"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择 `universal-coupon-grabber` 文件夹

3. **验证安装**
   - 浏览器工具栏出现插件图标
   - 点击图标打开弹窗界面

### 2. 基本使用流程

#### 方式一：自动发现模式（推荐）

**适用场景**: 美团、淘宝等已适配网站的抢券活动

1. **访问目标网站**
   ```
   例如：https://i.meituan.com/promotion/seckill
   ```

2. **启动监听**
   - 点击插件图标
   - 点击"开始捕获"按钮
   - 状态显示为"监听中"

3. **触发发现**
   - 正常浏览抢券页面
   - 点击"立即抢购"等按钮
   - 插件自动识别API请求

4. **确认任务**
   - 插件弹出"发现新任务"提示
   - 查看请求详情和置信度
   - 点击"创建任务"

5. **配置执行**
   - 设置任务名称
   - 选择执行时间
   - 调整重试参数
   - 点击"保存"

6. **等待执行**
   - 任务自动在指定时间执行
   - 实时查看执行日志

#### 方式二：手动创建模式

**适用场景**: 未适配网站或需要精确控制的场景

1. **抓取请求**
   - 按F12打开开发者工具
   - 切换到Network标签
   - 执行一次抢券操作
   - 找到关键的POST请求
   - 右键选择"Copy as cURL"

2. **创建任务**
   - 点击插件的"新建任务"
   - 或点击"导入任务"粘贴cURL

3. **配置参数**
   ```json
   {
     "name": "淘宝聚划算秒杀",
     "url": "https://mtop.taobao.com/h5/mtop.ju.seckill.order.submit/",
     "method": "POST",
     "executeAt": "2024-01-01T12:00:00.000Z",
     "maxAttempts": 10,
     "intervalMs": 100
   }
   ```

4. **测试验证**
   - 点击"测试"按钮
   - 检查响应结果
   - 确认配置正确

5. **启动任务**
   - 点击"保存"
   - 任务进入调度队列

## 🎯 网站适配说明

### 已支持网站

| 网站 | 域名 | 支持功能 | 签名机制 |
|------|------|----------|----------|
| 美团 | meituan.com | 秒杀券、闪购、团购 | H5guard |
| 淘宝 | taobao.com | 聚划算、优惠券 | mtop |
| 天猫 | tmall.com | 优惠券、直播券 | mtop |
| 京东 | jd.com | 秒杀、优惠券、闪购、预约 | JD风险指纹 |
| 拼多多 | pinduoduo.com | 限时秒杀、拼团、砍价、抽奖 | PDD反作弊 |

### 美团网站使用

**特点**: 需要H5guard签名，插件自动处理

**常见API模式**:
```
/promotion/seckill/couponcomponent/grabcoupon  # 秒杀券
/promotion/seckill/ordercomponent/submit       # 闪购下单
/group/v4/deal/commit                          # 团购下单
```

**使用步骤**:
1. 访问美团抢券页面
2. 开启插件监听
3. 点击抢券按钮触发发现
4. 配置执行时间并保存

### 淘宝/天猫使用

**特点**: 使用mtop签名机制

**常见API模式**:
```
/mtop.ju.seckill.order.submit      # 聚划算秒杀
/mtop.marketing.coupon.get         # 优惠券领取
/mtop.taobao.live.coupon.get       # 直播间优惠券
```

**注意事项**:
- 需要登录状态
- 某些活动需要特定的token

### 京东网站使用

**特点**: 使用JD风险指纹和设备指纹机制

**常见API模式**:
```
/seckill/seckill.action                    # 秒杀下单
/miaosha/order/submitOrderWithSkuNum       # 秒杀提交订单
/coupon/receiveCoupon                      # 优惠券领取
/order/submitOrder                         # 闪购下单
/yuyue/yuyueSubmit                         # 预约提交
```

**使用步骤**:
1. 访问京东秒杀页面（如：https://miaosha.jd.com/）
2. 开启插件监听
3. 点击抢购按钮触发发现
4. 配置执行时间并保存

**注意事项**:
- 需要登录京东账号
- 某些商品需要预约
- 建议使用手机版页面（m.jd.com）

### 拼多多网站使用

**特点**: 使用PDD反作弊机制和访问token

**常见API模式**:
```
/api/carts/checkout                        # 限时秒杀下单
/api/oak/integration/render                # 闪购下单
/api/promotion/coupon/receive              # 优惠券领取
/api/carts/add                            # 拼团购买
/api/lottery/draw                         # 抽奖活动
/api/checkin                              # 签到活动
/api/bargain/help                         # 砍价助力
```

**使用步骤**:
1. 访问拼多多活动页面（如：https://mobile.yangkeduo.com/）
2. 开启插件监听
3. 参与相关活动触发发现
4. 配置执行时间并保存

**注意事项**:
- 需要登录拼多多账号
- 某些活动有参与次数限制
- 建议使用移动版页面

## ⚙️ 高级配置

### 任务配置详解

```json
{
  "name": "任务名称",
  "type": "scheduled",           // immediate, scheduled, recurring
  "request": {
    "url": "https://api.example.com/grab",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0..."
    },
    "body": {
      "activityId": "12345",
      "couponId": "67890"
    }
  },
  "schedule": {
    "executeAt": "2024-01-01T12:00:00.000Z",
    "timezone": "Asia/Shanghai",
    "advanceMs": 500              // 提前量
  },
  "execution": {
    "maxAttempts": 10,            // 最大尝试次数
    "intervalMs": 100,            // 重试间隔
    "timeoutMs": 5000,            // 请求超时
    "concurrency": 1              // 并发数
  },
  "successCondition": {
    "type": "response_contains",   // 成功条件类型
    "value": "success"            // 期望值
  }
}
```

### 成功条件类型

1. **status_code**: HTTP状态码
   ```json
   {"type": "status_code", "value": 200}
   ```

2. **response_contains**: 响应包含文本
   ```json
   {"type": "response_contains", "value": "抢购成功"}
   ```

3. **response_json_path**: JSON路径匹配
   ```json
   {"type": "response_json_path", "path": "data.success", "value": true}
   ```

4. **custom**: 自定义JavaScript表达式
   ```json
   {"type": "custom", "expression": "statusCode === 200 && responseText.includes('success')"}
   ```

### 网站规则配置

创建 `rules/example.com.json`:

```json
{
  "website": "example.com",
  "name": "示例网站",
  "capturePatterns": [
    {
      "name": "coupon_grab",
      "urlPattern": "/api/coupon/grab",
      "method": "POST",
      "priority": 0.9
    }
  ],
  "signatureConfig": {
    "type": "custom",
    "required": false
  },
  "successConditions": [
    {
      "type": "response_contains",
      "value": "success",
      "weight": 1.0
    }
  ],
  "failureConditions": [
    {
      "type": "response_contains",
      "value": "已抢完",
      "action": "stop"
    }
  ]
}
```

## 🔧 故障排除

### 常见问题

1. **插件无法加载**
   - 检查Chrome版本（需要88+）
   - 确认开启开发者模式
   - 查看控制台错误信息

2. **网络监听不工作**
   - 刷新页面重试
   - 检查网站是否支持
   - 查看content script是否注入成功

3. **签名失败**
   - 确认网站已加载完成
   - 检查H5guard等对象是否存在
   - 尝试手动刷新页面

4. **任务不执行**
   - 检查执行时间设置
   - 确认任务状态为"运行中"
   - 查看background页面的错误日志

5. **请求被拒绝**
   - 检查请求头和参数
   - 确认登录状态
   - 验证签名是否正确

### 调试方法

1. **开启调试模式**
   - 进入插件设置
   - 启用"调试模式"
   - 查看详细日志

2. **查看控制台**
   ```javascript
   // 在页面控制台执行
   console.log(window.H5guard);  // 检查签名对象
   console.log(window.networkMonitor);  // 检查监听器
   ```

3. **检查存储数据**
   ```javascript
   // 在background页面控制台执行
   chrome.storage.local.get(null, console.log);
   ```

## 📊 性能优化

### 提高成功率

1. **时间同步**
   - 启用自动时间同步
   - 手动校准时间偏差
   - 调整提前量参数

2. **网络优化**
   - 使用稳定的网络连接
   - 关闭其他占用带宽的应用
   - 考虑使用代理服务器

3. **参数调优**
   - 增加重试次数
   - 减少重试间隔
   - 启用并发执行

### 减少资源占用

1. **限制日志数量**
   - 设置合理的日志上限
   - 定期清理历史记录

2. **优化监听范围**
   - 只在需要时启用监听
   - 使用精确的URL模式

## 🛡️ 安全建议

1. **合规使用**
   - 遵守网站服务条款
   - 不要过度频繁请求
   - 尊重网站的反爬虫机制

2. **数据安全**
   - 定期备份任务配置
   - 不要分享包含敏感信息的配置
   - 及时更新插件版本

3. **隐私保护**
   - 插件不会上传任何数据
   - 所有信息存储在本地
   - 可随时清空数据

## 📞 获取帮助

- **GitHub Issues**: https://github.com/jokeryuyc/universal-coupon-grabber/issues
- **项目主页**: https://github.com/jokeryuyc/universal-coupon-grabber
- **Wiki文档**: https://github.com/jokeryuyc/universal-coupon-grabber/wiki
- **社区讨论**: 使用经验分享

记住：本工具仅供学习研究使用，请合理合法使用！
