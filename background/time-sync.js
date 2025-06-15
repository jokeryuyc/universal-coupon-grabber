/**
 * Universal Coupon Grabber - Time Sync
 * 时间同步服务，确保精确的时间控制
 */

export class TimeSync {
  constructor() {
    this.timeOffset = 0; // 本地时间与服务器时间的偏移量（毫秒）
    this.lastSyncTime = 0;
    this.syncInterval = 30000; // 30秒同步一次
    this.syncUrls = {
      'meituan.com': 'https://cube.meituan.com/ipromotion/cube/toc/component/base/getServerCurrentTime',
      'taobao.com': 'http://api.m.taobao.com/rest/api3.do?api=mtop.common.getTimestamp',
      'jd.com': 'https://api.m.jd.com/client.action?functionId=queryServerTime',
      'default': 'https://worldtimeapi.org/api/timezone/Asia/Shanghai'
    };
    
    this.networkDelay = 0; // 网络延迟（毫秒）
    this.delayHistory = []; // 延迟历史记录
    this.maxDelayHistory = 10;
  }

  async init() {
    console.log('Time Sync service initialized');
    
    // 立即进行一次时间同步
    await this.syncTime();
    
    // 启动定期同步
    this.startPeriodicSync();
  }

  async syncTime(website = 'default') {
    try {
      const syncUrl = this.syncUrls[website] || this.syncUrls.default;
      const startTime = performance.now();
      
      const response = await fetch(syncUrl, {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      const endTime = performance.now();
      const networkDelay = (endTime - startTime) / 2; // 估算单程延迟
      
      if (response.ok) {
        const data = await response.json();
        const serverTime = this.extractServerTime(data, website);
        
        if (serverTime) {
          const localTime = Date.now();
          const adjustedServerTime = serverTime + networkDelay; // 补偿网络延迟
          
          this.timeOffset = adjustedServerTime - localTime;
          this.lastSyncTime = localTime;
          this.updateNetworkDelay(networkDelay);
          
          console.log(`Time synced with ${website}:`, {
            offset: this.timeOffset,
            networkDelay: networkDelay,
            serverTime: new Date(serverTime).toISOString(),
            localTime: new Date(localTime).toISOString()
          });
          
          return true;
        }
      }
    } catch (error) {
      console.error(`Time sync failed for ${website}:`, error);
    }
    
    return false;
  }

  extractServerTime(data, website) {
    try {
      switch (website) {
        case 'meituan.com':
          return data.data; // 美团返回毫秒时间戳
          
        case 'taobao.com':
          return parseInt(data.data.t); // 淘宝返回毫秒时间戳字符串
          
        case 'jd.com':
          return data.currentTime2; // 京东返回毫秒时间戳
          
        case 'default':
          return new Date(data.datetime).getTime(); // WorldTimeAPI返回ISO字符串
          
        default:
          // 尝试通用解析
          if (data.timestamp) return data.timestamp;
          if (data.time) return data.time;
          if (data.currentTime) return data.currentTime;
          if (data.data && typeof data.data === 'number') return data.data;
          return null;
      }
    } catch (error) {
      console.error('Failed to extract server time:', error);
      return null;
    }
  }

  updateNetworkDelay(delay) {
    this.delayHistory.push(delay);
    
    if (this.delayHistory.length > this.maxDelayHistory) {
      this.delayHistory.shift();
    }
    
    // 计算平均延迟
    this.networkDelay = this.delayHistory.reduce((sum, d) => sum + d, 0) / this.delayHistory.length;
  }

  startPeriodicSync() {
    setInterval(async () => {
      await this.syncTime();
    }, this.syncInterval);
  }

  // 获取同步后的当前时间
  getSyncedTime() {
    return Date.now() + this.timeOffset;
  }

  // 获取指定网站的同步时间
  async getSyncedTimeForWebsite(website) {
    // 如果最近没有同步过，先同步一次
    if (Date.now() - this.lastSyncTime > this.syncInterval) {
      await this.syncTime(website);
    }
    
    return this.getSyncedTime();
  }

  // 计算到目标时间的精确延迟
  calculateDelay(targetTime, advanceMs = 0) {
    const currentTime = this.getSyncedTime();
    const delay = targetTime - currentTime - advanceMs - this.networkDelay;
    
    return Math.max(0, delay);
  }

  // 高精度等待
  async precisionWait(targetTime, advanceMs = 500) {
    const totalDelay = this.calculateDelay(targetTime, advanceMs);
    
    if (totalDelay <= 0) {
      return; // 时间已过
    }
    
    // 如果延迟超过1秒，先粗略等待
    if (totalDelay > 1000) {
      const roughDelay = totalDelay - 1000;
      await this.sleep(roughDelay);
    }
    
    // 精确等待最后1秒
    const finalDelay = this.calculateDelay(targetTime, advanceMs);
    if (finalDelay > 0) {
      await this.precisionSleep(finalDelay);
    }
  }

  // 普通睡眠
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 高精度睡眠（使用requestAnimationFrame）
  precisionSleep(ms) {
    return new Promise(resolve => {
      const startTime = performance.now();
      const targetTime = startTime + ms;
      
      const frame = () => {
        const currentTime = performance.now();
        if (currentTime >= targetTime) {
          resolve();
        } else {
          requestAnimationFrame(frame);
        }
      };
      
      requestAnimationFrame(frame);
    });
  }

  // 获取时间同步状态
  getSyncStatus() {
    const timeSinceLastSync = Date.now() - this.lastSyncTime;
    const isRecent = timeSinceLastSync < this.syncInterval * 2;
    
    return {
      offset: this.timeOffset,
      lastSyncTime: this.lastSyncTime,
      timeSinceLastSync: timeSinceLastSync,
      networkDelay: this.networkDelay,
      isRecent: isRecent,
      status: isRecent ? 'synced' : 'outdated'
    };
  }

  // 手动触发时间同步
  async forceSyncTime(website = 'default') {
    console.log(`Force syncing time with ${website}...`);
    return await this.syncTime(website);
  }

  // 获取网络延迟统计
  getNetworkStats() {
    if (this.delayHistory.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 };
    }
    
    const delays = this.delayHistory;
    return {
      avg: delays.reduce((sum, d) => sum + d, 0) / delays.length,
      min: Math.min(...delays),
      max: Math.max(...delays),
      count: delays.length
    };
  }

  // 预测最佳执行时间
  predictOptimalExecutionTime(targetTime, processingTimeMs = 50) {
    const syncedTime = this.getSyncedTime();
    const networkStats = this.getNetworkStats();
    
    // 考虑网络延迟、处理时间和一些缓冲
    const totalAdvance = networkStats.avg + processingTimeMs + 100; // 100ms缓冲
    
    return {
      targetTime: targetTime,
      optimalStartTime: targetTime - totalAdvance,
      currentTime: syncedTime,
      timeToWait: Math.max(0, targetTime - totalAdvance - syncedTime),
      networkDelay: networkStats.avg,
      processingTime: processingTimeMs
    };
  }
}
