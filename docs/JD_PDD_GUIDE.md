# 京东和拼多多抢券详细指南

## 🛒 京东抢券指南

### 支持的功能

| 功能类型 | API路径 | 说明 |
|----------|---------|------|
| 秒杀下单 | `/seckill/seckill.action` | 京东秒杀商品下单 |
| 秒杀提交 | `/miaosha/order/submitOrderWithSkuNum` | 秒杀订单提交 |
| 优惠券领取 | `/coupon/receiveCoupon` | 领取优惠券 |
| 闪购下单 | `/order/submitOrder` | 闪购商品下单 |
| 预约提交 | `/yuyue/yuyueSubmit` | 商品预约提交 |
| 抽奖活动 | `/active/draw` | 参与抽奖活动 |

### 技术特点

1. **签名机制**: 京东使用多重指纹验证
   - 设备指纹 (`_JD_DEVICE_FINGERPRINT_`)
   - 风险指纹 (`_JdJrTdRiskFpInfo`)
   - Cookie验证 (`__jdu`, `__jdv`, `__jda`)

2. **请求特征**:
   - User-Agent: 移动端标识
   - Referer: 必须来自京东域名
   - Content-Type: `application/x-www-form-urlencoded`

### 使用步骤

#### 1. 京东秒杀抢购

```bash
# 访问京东秒杀页面
https://miaosha.jd.com/

# 或者手机版
https://m.jd.com/
```

**操作流程**:
1. 登录京东账号
2. 访问秒杀页面
3. 启动插件监听
4. 点击"立即抢购"
5. 插件自动识别并创建任务
6. 设置执行时间（建议提前300ms）
7. 启动任务等待执行

#### 2. 京东优惠券领取

```bash
# 访问优惠券页面
https://coupon.jd.com/
```

**操作流程**:
1. 找到目标优惠券
2. 启动插件监听
3. 点击"立即领取"
4. 配置任务参数
5. 设置执行时间

#### 3. 京东预约抢购

```bash
# 访问商品详情页
https://item.jd.com/商品ID.html
```

**操作流程**:
1. 先进行商品预约
2. 等待开售时间临近
3. 启动插件监听
4. 在开售时间点执行抢购

### 配置建议

```json
{
  "name": "京东iPhone秒杀",
  "execution": {
    "maxAttempts": 8,
    "intervalMs": 120,
    "timeoutMs": 8000,
    "advanceMs": 300
  },
  "successCondition": {
    "type": "response_contains",
    "value": "success"
  }
}
```

## 🛍️ 拼多多抢券指南

### 支持的功能

| 功能类型 | API路径 | 说明 |
|----------|---------|------|
| 限时秒杀 | `/api/carts/checkout` | 限时秒杀商品下单 |
| 闪购下单 | `/api/oak/integration/render` | 闪购商品下单 |
| 优惠券领取 | `/api/promotion/coupon/receive` | 领取优惠券 |
| 拼团购买 | `/api/carts/add` | 拼团商品购买 |
| 抽奖活动 | `/api/lottery/draw` | 参与抽奖 |
| 签到活动 | `/api/checkin` | 每日签到 |
| 砍价助力 | `/api/bargain/help` | 砍价助力 |

### 技术特点

1. **签名机制**: 拼多多使用反作弊token
   - 反作弊签名 (`anti-content`)
   - 访问token (`accesstoken`)
   - 设备指纹 (`_nano_fp`)

2. **请求特征**:
   - Content-Type: `application/json;charset=UTF-8`
   - Origin: `https://mobile.yangkeduo.com`
   - 需要登录状态的Cookie

### 使用步骤

#### 1. 拼多多限时秒杀

```bash
# 访问拼多多移动版
https://mobile.yangkeduo.com/

# 或者主站
https://www.pinduoduo.com/
```

**操作流程**:
1. 登录拼多多账号
2. 找到限时秒杀商品
3. 启动插件监听
4. 点击"立即抢购"
5. 插件自动识别API
6. 配置任务参数
7. 设置执行时间（建议提前200ms）

#### 2. 拼多多优惠券

```bash
# 访问优惠券中心
https://mobile.yangkeduo.com/coupon_center.html
```

**操作流程**:
1. 浏览优惠券页面
2. 启动插件监听
3. 点击"立即领取"
4. 创建抢券任务

#### 3. 拼多多抽奖活动

```bash
# 访问活动页面
https://mobile.yangkeduo.com/lottery.html
```

**操作流程**:
1. 进入抽奖页面
2. 启动插件监听
3. 点击"立即抽奖"
4. 配置重复执行

### 配置建议

```json
{
  "name": "拼多多限时秒杀",
  "execution": {
    "maxAttempts": 6,
    "intervalMs": 150,
    "timeoutMs": 6000,
    "advanceMs": 200
  },
  "successCondition": {
    "type": "response_json_path",
    "path": "success",
    "value": true
  }
}
```

## 🔧 高级技巧

### 1. 时间同步优化

**京东时间同步**:
```javascript
// 京东服务器时间API
https://api.m.jd.com/client.action?functionId=queryServerTime
```

**拼多多时间同步**:
```javascript
// 拼多多服务器时间API
https://api.yangkeduo.com/api/server/time
```

### 2. 网络优化

1. **使用移动网络**: 某些活动移动端优先
2. **关闭其他应用**: 减少网络占用
3. **选择合适的DNS**: 使用114.114.114.114或8.8.8.8

### 3. 成功率提升

1. **提前登录**: 确保账号状态正常
2. **清理缓存**: 避免旧数据干扰
3. **多重验证**: 检查Cookie和token状态
4. **合理重试**: 设置适当的重试间隔

## ⚠️ 注意事项

### 京东注意事项

1. **账号安全**: 避免频繁操作触发风控
2. **商品库存**: 确认商品有库存再执行
3. **支付准备**: 提前设置好支付方式
4. **地址信息**: 确保收货地址正确

### 拼多多注意事项

1. **活动规则**: 仔细阅读活动规则
2. **参与限制**: 注意每日参与次数限制
3. **拼团时间**: 拼团商品注意成团时间
4. **砍价助力**: 砍价活动需要好友助力

## 🚨 故障排除

### 常见问题

1. **签名失败**
   ```
   解决方案：
   - 刷新页面重新加载签名对象
   - 检查登录状态
   - 清除浏览器缓存
   ```

2. **请求被拒绝**
   ```
   解决方案：
   - 检查User-Agent设置
   - 验证Referer头部
   - 确认Cookie完整性
   ```

3. **时间不准确**
   ```
   解决方案：
   - 启用时间同步功能
   - 手动校准系统时间
   - 调整提前量参数
   ```

### 调试方法

1. **查看网络请求**
   ```javascript
   // 在控制台查看请求详情
   console.log(window._JdJrTdRiskFpInfo);  // 京东
   console.log(window._nano_fp);           // 拼多多
   ```

2. **验证签名状态**
   ```javascript
   // 检查签名适配器状态
   console.log(window.signatureAdapterManager.getAdapter('jd.com'));
   console.log(window.signatureAdapterManager.getAdapter('pinduoduo.com'));
   ```

## 📈 性能优化

### 1. 并发控制

- 京东建议并发数：2-3
- 拼多多建议并发数：1-2

### 2. 重试策略

- 网络错误：快速重试
- 服务器繁忙：延迟重试
- 验证失败：停止重试

### 3. 资源管理

- 及时清理执行日志
- 定期更新签名对象
- 监控内存使用情况

---

**记住：合理使用，遵守平台规则，享受便捷的抢券体验！** 🎉
