/**
 * Universal Coupon Grabber - Storage Manager
 * 数据存储管理器，处理本地存储和数据同步
 */

export class StorageManager {
  constructor() {
    this.storageKeys = {
      TASKS: 'ucg_tasks',
      EXECUTION_LOGS: 'ucg_execution_logs',
      SETTINGS: 'ucg_settings',
      WEBSITE_RULES: 'ucg_website_rules',
      USER_DATA: 'ucg_user_data'
    };
    
    this.defaultSettings = {
      autoCapture: true,
      logLevel: 'info',
      maxLogEntries: 1000,
      defaultTimeout: 5000,
      defaultRetryAttempts: 5,
      defaultRetryInterval: 100,
      enableNotifications: true,
      theme: 'light'
    };
  }

  async init() {
    console.log('Storage Manager initialized');
    
    // 初始化默认设置
    await this.initializeDefaultSettings();
    
    // 清理过期数据
    await this.cleanupExpiredData();
  }

  async initializeDefaultSettings() {
    const settings = await this.getSettings();
    if (!settings || Object.keys(settings).length === 0) {
      await this.saveSettings(this.defaultSettings);
    }
  }

  // 任务相关存储
  async saveTasks(tasks) {
    try {
      await chrome.storage.local.set({
        [this.storageKeys.TASKS]: tasks
      });
      console.log('Tasks saved successfully');
    } catch (error) {
      console.error('Failed to save tasks:', error);
      throw error;
    }
  }

  async getTasks() {
    try {
      const result = await chrome.storage.local.get([this.storageKeys.TASKS]);
      return result[this.storageKeys.TASKS] || [];
    } catch (error) {
      console.error('Failed to get tasks:', error);
      return [];
    }
  }

  async saveTask(task) {
    try {
      const tasks = await this.getTasks();
      const existingIndex = tasks.findIndex(t => t.id === task.id);
      
      if (existingIndex >= 0) {
        tasks[existingIndex] = task;
      } else {
        tasks.push(task);
      }
      
      await this.saveTasks(tasks);
      return task;
    } catch (error) {
      console.error('Failed to save task:', error);
      throw error;
    }
  }

  async deleteTask(taskId) {
    try {
      const tasks = await this.getTasks();
      const filteredTasks = tasks.filter(t => t.id !== taskId);
      await this.saveTasks(filteredTasks);
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  }

  // 执行日志存储
  async saveExecutionLog(log) {
    try {
      const logs = await this.getExecutionLogs();
      logs.unshift(log); // 添加到开头
      
      // 限制日志数量
      const maxLogs = (await this.getSettings()).maxLogEntries || 1000;
      if (logs.length > maxLogs) {
        logs.splice(maxLogs);
      }
      
      await chrome.storage.local.set({
        [this.storageKeys.EXECUTION_LOGS]: logs
      });
    } catch (error) {
      console.error('Failed to save execution log:', error);
    }
  }

  async getExecutionLogs(taskId = null, limit = null) {
    try {
      const result = await chrome.storage.local.get([this.storageKeys.EXECUTION_LOGS]);
      let logs = result[this.storageKeys.EXECUTION_LOGS] || [];
      
      if (taskId) {
        logs = logs.filter(log => log.taskId === taskId);
      }
      
      if (limit) {
        logs = logs.slice(0, limit);
      }
      
      return logs;
    } catch (error) {
      console.error('Failed to get execution logs:', error);
      return [];
    }
  }

  async clearExecutionLogs(taskId = null) {
    try {
      if (taskId) {
        const logs = await this.getExecutionLogs();
        const filteredLogs = logs.filter(log => log.taskId !== taskId);
        await chrome.storage.local.set({
          [this.storageKeys.EXECUTION_LOGS]: filteredLogs
        });
      } else {
        await chrome.storage.local.set({
          [this.storageKeys.EXECUTION_LOGS]: []
        });
      }
    } catch (error) {
      console.error('Failed to clear execution logs:', error);
    }
  }

  // 设置管理
  async saveSettings(settings) {
    try {
      const currentSettings = await this.getSettings();
      const mergedSettings = { ...currentSettings, ...settings };
      
      await chrome.storage.local.set({
        [this.storageKeys.SETTINGS]: mergedSettings
      });
      
      console.log('Settings saved:', mergedSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  async getSettings() {
    try {
      const result = await chrome.storage.local.get([this.storageKeys.SETTINGS]);
      return result[this.storageKeys.SETTINGS] || {};
    } catch (error) {
      console.error('Failed to get settings:', error);
      return this.defaultSettings;
    }
  }

  async getSetting(key, defaultValue = null) {
    try {
      const settings = await this.getSettings();
      return settings[key] !== undefined ? settings[key] : defaultValue;
    } catch (error) {
      console.error(`Failed to get setting ${key}:`, error);
      return defaultValue;
    }
  }

  async setSetting(key, value) {
    try {
      const settings = await this.getSettings();
      settings[key] = value;
      await this.saveSettings(settings);
    } catch (error) {
      console.error(`Failed to set setting ${key}:`, error);
      throw error;
    }
  }

  // 网站规则缓存
  async cacheWebsiteRules(hostname, rules) {
    try {
      const cachedRules = await this.getCachedWebsiteRules();
      cachedRules[hostname] = {
        rules: rules,
        cachedAt: Date.now(),
        version: rules.version || '1.0.0'
      };
      
      await chrome.storage.local.set({
        [this.storageKeys.WEBSITE_RULES]: cachedRules
      });
    } catch (error) {
      console.error('Failed to cache website rules:', error);
    }
  }

  async getCachedWebsiteRules(hostname = null) {
    try {
      const result = await chrome.storage.local.get([this.storageKeys.WEBSITE_RULES]);
      const cachedRules = result[this.storageKeys.WEBSITE_RULES] || {};
      
      if (hostname) {
        return cachedRules[hostname] || null;
      }
      
      return cachedRules;
    } catch (error) {
      console.error('Failed to get cached website rules:', error);
      return hostname ? null : {};
    }
  }

  // 用户数据管理
  async saveUserData(data) {
    try {
      const currentData = await this.getUserData();
      const mergedData = { ...currentData, ...data };
      
      await chrome.storage.local.set({
        [this.storageKeys.USER_DATA]: mergedData
      });
    } catch (error) {
      console.error('Failed to save user data:', error);
      throw error;
    }
  }

  async getUserData() {
    try {
      const result = await chrome.storage.local.get([this.storageKeys.USER_DATA]);
      return result[this.storageKeys.USER_DATA] || {};
    } catch (error) {
      console.error('Failed to get user data:', error);
      return {};
    }
  }

  // 数据导出和导入
  async exportData() {
    try {
      const data = {
        tasks: await this.getTasks(),
        settings: await this.getSettings(),
        executionLogs: await this.getExecutionLogs(null, 100), // 只导出最近100条日志
        userData: await this.getUserData(),
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      };
      
      return data;
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }

  async importData(data) {
    try {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid import data');
      }
      
      // 验证数据格式
      if (data.tasks && Array.isArray(data.tasks)) {
        await this.saveTasks(data.tasks);
      }
      
      if (data.settings && typeof data.settings === 'object') {
        await this.saveSettings(data.settings);
      }
      
      if (data.userData && typeof data.userData === 'object') {
        await this.saveUserData(data.userData);
      }
      
      console.log('Data imported successfully');
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  }

  // 数据清理
  async cleanupExpiredData() {
    try {
      const settings = await this.getSettings();
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30天
      const cutoffTime = Date.now() - maxAge;
      
      // 清理过期的执行日志
      const logs = await this.getExecutionLogs();
      const validLogs = logs.filter(log => 
        log.timestamp && log.timestamp > cutoffTime
      );
      
      if (validLogs.length !== logs.length) {
        await chrome.storage.local.set({
          [this.storageKeys.EXECUTION_LOGS]: validLogs
        });
        console.log(`Cleaned up ${logs.length - validLogs.length} expired log entries`);
      }
      
      // 清理过期的网站规则缓存
      const cachedRules = await this.getCachedWebsiteRules();
      const validRules = {};
      
      for (const [hostname, ruleData] of Object.entries(cachedRules)) {
        if (ruleData.cachedAt && ruleData.cachedAt > cutoffTime) {
          validRules[hostname] = ruleData;
        }
      }
      
      if (Object.keys(validRules).length !== Object.keys(cachedRules).length) {
        await chrome.storage.local.set({
          [this.storageKeys.WEBSITE_RULES]: validRules
        });
        console.log('Cleaned up expired website rules cache');
      }
      
    } catch (error) {
      console.error('Failed to cleanup expired data:', error);
    }
  }

  // 获取存储使用情况
  async getStorageUsage() {
    try {
      const usage = await chrome.storage.local.getBytesInUse();
      const quota = chrome.storage.local.QUOTA_BYTES;
      
      return {
        used: usage,
        total: quota,
        percentage: (usage / quota * 100).toFixed(2)
      };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  // 清空所有数据
  async clearAllData() {
    try {
      await chrome.storage.local.clear();
      console.log('All data cleared');
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw error;
    }
  }
}
