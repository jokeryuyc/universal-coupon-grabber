/**
 * Universal Coupon Grabber - Execution Engine
 * 任务执行引擎，负责实际的HTTP请求发送和结果处理
 */

export class ExecutionEngine {
  constructor() {
    this.activeExecutions = new Map();
    this.executionHistory = [];
    this.maxHistorySize = 1000;
    
    this.init();
  }

  async init() {
    // 监听来自scheduler的执行请求
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'EXECUTE_TASK_INTERNAL') {
        this.executeTask(message.taskId);
      }
    });
  }

  async executeTask(taskId) {
    try {
      // 获取任务信息
      const response = await chrome.runtime.sendMessage({
        type: 'GET_TASK',
        taskId: taskId
      });

      if (!response.success) {
        throw new Error(`Failed to get task ${taskId}: ${response.error}`);
      }

      const task = response.data;
      console.log(`Executing task ${taskId}:`, task);

      // 创建执行上下文
      const executionContext = {
        taskId: taskId,
        task: task,
        startTime: Date.now(),
        attempts: 0,
        results: []
      };

      this.activeExecutions.set(taskId, executionContext);

      // 根据并发数执行
      const promises = [];
      for (let i = 0; i < task.execution.concurrency; i++) {
        promises.push(this.executeTaskAttempts(executionContext));
      }

      // 等待所有并发执行完成
      const results = await Promise.allSettled(promises);
      
      // 处理执行结果
      await this.processExecutionResults(executionContext, results);

    } catch (error) {
      console.error(`Task execution failed for ${taskId}:`, error);
      await this.reportTaskResult(taskId, {
        success: false,
        error: error.message,
        timestamp: Date.now()
      });
    } finally {
      this.activeExecutions.delete(taskId);
    }
  }

  async executeTaskAttempts(executionContext) {
    const { task, taskId } = executionContext;
    let lastResult = null;

    for (let attempt = 1; attempt <= task.execution.maxAttempts; attempt++) {
      try {
        executionContext.attempts++;
        
        console.log(`Task ${taskId} - Attempt ${attempt}/${task.execution.maxAttempts}`);

        // 执行单次请求
        const result = await this.executeSingleRequest(task, attempt);
        
        executionContext.results.push(result);
        lastResult = result;

        // 检查成功条件
        if (await this.checkSuccessCondition(result, task)) {
          console.log(`Task ${taskId} succeeded on attempt ${attempt}`);
          return { success: true, result, attempt };
        }

        // 检查失败条件（是否应该停止重试）
        const failureAction = await this.checkFailureCondition(result, task);
        if (failureAction === 'stop') {
          console.log(`Task ${taskId} stopped due to failure condition`);
          break;
        }

        // 等待重试间隔
        if (attempt < task.execution.maxAttempts) {
          await this.sleep(task.execution.intervalMs);
        }

      } catch (error) {
        console.error(`Task ${taskId} attempt ${attempt} failed:`, error);
        lastResult = {
          success: false,
          error: error.message,
          timestamp: Date.now()
        };
        executionContext.results.push(lastResult);
      }
    }

    return { success: false, result: lastResult, attempts: task.execution.maxAttempts };
  }

  async executeSingleRequest(task, attempt) {
    const startTime = Date.now();
    
    try {
      // 获取当前活动标签页
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];

      if (!activeTab) {
        throw new Error('No active tab found');
      }

      // 向content script发送执行请求
      const result = await chrome.tabs.sendMessage(activeTab.id, {
        type: 'EXECUTE_REQUEST',
        data: {
          url: task.request.url,
          method: task.request.method,
          headers: task.request.headers,
          body: task.request.body,
          website: task.request.website,
          timeout: task.execution.timeoutMs,
          attempt: attempt
        }
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        success: result.success,
        statusCode: result.statusCode,
        responseText: result.responseText,
        headers: result.headers,
        duration: duration,
        timestamp: startTime,
        attempt: attempt,
        error: result.error
      };

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        success: false,
        error: error.message,
        duration: duration,
        timestamp: startTime,
        attempt: attempt
      };
    }
  }

  async checkSuccessCondition(result, task) {
    if (!result.success) return false;

    const condition = task.successCondition;
    
    switch (condition.type) {
      case 'status_code':
        return result.statusCode === condition.value;
        
      case 'response_contains':
        return result.responseText && 
               result.responseText.toLowerCase().includes(condition.value.toLowerCase());
        
      case 'response_json_path':
        try {
          const jsonResponse = JSON.parse(result.responseText);
          const value = this.getJsonPath(jsonResponse, condition.path);
          return value === condition.value;
        } catch {
          return false;
        }
        
      case 'custom':
        // 自定义成功条件（可以是JavaScript表达式）
        try {
          return this.evaluateCondition(condition.expression, result);
        } catch {
          return false;
        }
        
      default:
        return result.statusCode === 200;
    }
  }

  async checkFailureCondition(result, task) {
    // 检查是否有配置的失败条件
    const website = task.request.website;
    const rules = await this.loadWebsiteRules(website);
    
    if (!rules || !rules.failureConditions) {
      return 'continue';
    }

    for (const condition of rules.failureConditions) {
      let matches = false;
      
      switch (condition.type) {
        case 'response_body_contains':
          matches = result.responseText && 
                   result.responseText.includes(condition.value);
          break;
          
        case 'response_code':
          matches = result.statusCode === condition.value;
          break;
      }
      
      if (matches) {
        return condition.action || 'stop';
      }
    }
    
    return 'continue';
  }

  async loadWebsiteRules(website) {
    try {
      const rulesUrl = chrome.runtime.getURL(`rules/${website}.json`);
      const response = await fetch(rulesUrl);
      return response.ok ? await response.json() : null;
    } catch {
      return null;
    }
  }

  async processExecutionResults(executionContext, results) {
    const { taskId, task, startTime } = executionContext;
    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // 统计结果
    const successfulResults = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const hasSuccess = successfulResults.length > 0;

    const executionSummary = {
      taskId: taskId,
      success: hasSuccess,
      totalAttempts: executionContext.attempts,
      successfulAttempts: successfulResults.length,
      duration: totalDuration,
      results: executionContext.results,
      timestamp: startTime
    };

    // 保存执行历史
    this.addToHistory(executionSummary);

    // 报告结果给scheduler
    await this.reportTaskResult(taskId, executionSummary);
  }

  async reportTaskResult(taskId, result) {
    chrome.runtime.sendMessage({
      type: 'TASK_RESULT',
      taskId: taskId,
      result: result
    });
  }

  addToHistory(executionSummary) {
    this.executionHistory.unshift(executionSummary);
    
    // 限制历史记录大小
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory = this.executionHistory.slice(0, this.maxHistorySize);
    }
  }

  async executeImmediate(requestData) {
    // 立即执行单个请求（用于测试）
    const task = {
      request: requestData,
      execution: {
        maxAttempts: 1,
        timeoutMs: 5000,
        concurrency: 1
      },
      successCondition: {
        type: 'status_code',
        value: 200
      }
    };

    return await this.executeSingleRequest(task, 1);
  }

  getJsonPath(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  evaluateCondition(expression, result) {
    // 安全的表达式求值（简化版）
    const context = {
      statusCode: result.statusCode,
      responseText: result.responseText,
      success: result.success
    };
    
    // 这里应该使用更安全的表达式求值方法
    // 简化实现，实际应该使用沙箱环境
    return new Function('context', `with(context) { return ${expression}; }`)(context);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getExecutionHistory(taskId = null) {
    if (taskId) {
      return this.executionHistory.filter(h => h.taskId === taskId);
    }
    return this.executionHistory;
  }
}
