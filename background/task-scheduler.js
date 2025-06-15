/**
 * Universal Coupon Grabber - Task Scheduler
 * 高精度任务调度器，支持毫秒级定时和智能重试
 */

export class TaskScheduler {
  constructor() {
    this.tasks = new Map();
    this.activeTimers = new Map();
    this.executionQueue = [];
    
    this.init();
  }

  async init() {
    // 从存储中恢复任务
    await this.loadTasksFromStorage();
    
    // 启动调度循环
    this.startScheduleLoop();
  }

  async loadTasksFromStorage() {
    try {
      const result = await chrome.storage.local.get(['tasks']);
      if (result.tasks) {
        for (const taskData of result.tasks) {
          this.tasks.set(taskData.id, taskData);
        }
        console.log(`Loaded ${this.tasks.size} tasks from storage`);
      }
    } catch (error) {
      console.error('Failed to load tasks from storage:', error);
    }
  }

  async saveTasksToStorage() {
    try {
      const tasksArray = Array.from(this.tasks.values());
      await chrome.storage.local.set({ tasks: tasksArray });
    } catch (error) {
      console.error('Failed to save tasks to storage:', error);
    }
  }

  async createTask(taskData) {
    const task = {
      id: this.generateTaskId(),
      name: taskData.name || '未命名任务',
      type: taskData.type || 'immediate', // immediate, scheduled, recurring
      status: 'pending', // pending, running, completed, failed, cancelled
      
      // 请求配置
      request: {
        url: taskData.url,
        method: taskData.method || 'POST',
        headers: taskData.headers || {},
        body: taskData.body || {},
        website: taskData.website
      },
      
      // 调度配置
      schedule: {
        executeAt: taskData.executeAt ? new Date(taskData.executeAt) : new Date(),
        timezone: taskData.timezone || 'Asia/Shanghai',
        advanceMs: taskData.advanceMs || 500 // 提前量（毫秒）
      },
      
      // 执行配置
      execution: {
        maxAttempts: taskData.maxAttempts || 5,
        intervalMs: taskData.intervalMs || 100,
        timeoutMs: taskData.timeoutMs || 5000,
        concurrency: taskData.concurrency || 1
      },
      
      // 成功条件
      successCondition: taskData.successCondition || {
        type: 'status_code',
        value: 200
      },
      
      // 统计信息
      stats: {
        attempts: 0,
        successes: 0,
        failures: 0,
        lastExecuted: null,
        lastResult: null
      },
      
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tasks.set(task.id, task);
    await this.saveTasksToStorage();
    
    console.log('Created task:', task);
    return task.id;
  }

  async startTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status === 'running') {
      console.log(`Task ${taskId} is already running`);
      return;
    }

    task.status = 'running';
    task.updatedAt = new Date();
    
    await this.saveTasksToStorage();
    
    // 根据任务类型调度
    switch (task.type) {
      case 'immediate':
        await this.scheduleImmediateTask(task);
        break;
      case 'scheduled':
        await this.scheduleTimedTask(task);
        break;
      case 'recurring':
        await this.scheduleRecurringTask(task);
        break;
    }
    
    console.log(`Started task ${taskId}`);
  }

  async stopTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // 清除定时器
    if (this.activeTimers.has(taskId)) {
      clearTimeout(this.activeTimers.get(taskId));
      this.activeTimers.delete(taskId);
    }

    task.status = 'cancelled';
    task.updatedAt = new Date();
    
    await this.saveTasksToStorage();
    
    console.log(`Stopped task ${taskId}`);
  }

  async scheduleImmediateTask(task) {
    // 立即执行
    this.executeTask(task.id);
  }

  async scheduleTimedTask(task) {
    const now = new Date();
    const executeAt = new Date(task.schedule.executeAt);
    const delay = executeAt.getTime() - now.getTime() - task.schedule.advanceMs;

    if (delay <= 0) {
      // 时间已过，立即执行
      this.executeTask(task.id);
    } else {
      // 设置定时器
      const timerId = setTimeout(() => {
        this.executeTask(task.id);
      }, delay);
      
      this.activeTimers.set(task.id, timerId);
      
      console.log(`Scheduled task ${task.id} to execute in ${delay}ms`);
    }
  }

  async scheduleRecurringTask(task) {
    // 循环任务逻辑
    await this.scheduleTimedTask(task);
  }

  async executeTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'running') {
      return;
    }

    console.log(`Executing task ${taskId}`);
    
    // 发送执行消息给execution engine
    chrome.runtime.sendMessage({
      type: 'EXECUTE_TASK_INTERNAL',
      taskId: taskId
    });
  }

  async updateTaskResult(taskId, result) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.stats.attempts++;
    task.stats.lastExecuted = new Date();
    task.stats.lastResult = result;

    if (result.success) {
      task.stats.successes++;
      task.status = 'completed';
    } else {
      task.stats.failures++;
      
      // 检查是否需要重试
      if (task.stats.attempts < task.execution.maxAttempts) {
        // 安排重试
        setTimeout(() => {
          if (task.status === 'running') {
            this.executeTask(taskId);
          }
        }, task.execution.intervalMs);
      } else {
        task.status = 'failed';
      }
    }

    task.updatedAt = new Date();
    await this.saveTasksToStorage();
  }

  async getAllTasks() {
    return Array.from(this.tasks.values());
  }

  async getTask(taskId) {
    return this.tasks.get(taskId);
  }

  async deleteTask(taskId) {
    await this.stopTask(taskId);
    this.tasks.delete(taskId);
    await this.saveTasksToStorage();
  }

  async restoreTasks() {
    // 恢复运行中的任务
    for (const task of this.tasks.values()) {
      if (task.status === 'running') {
        console.log(`Restoring task ${task.id}`);
        await this.startTask(task.id);
      }
    }
  }

  startScheduleLoop() {
    // 每秒检查一次是否有需要执行的任务
    setInterval(() => {
      this.checkPendingTasks();
    }, 1000);
  }

  checkPendingTasks() {
    const now = new Date();
    
    for (const task of this.tasks.values()) {
      if (task.status === 'pending' && task.type === 'scheduled') {
        const executeAt = new Date(task.schedule.executeAt);
        const timeToExecute = executeAt.getTime() - now.getTime();
        
        // 如果距离执行时间不到10秒，自动启动任务
        if (timeToExecute <= 10000 && timeToExecute > 0) {
          this.startTask(task.id);
        }
      }
    }
  }

  generateTaskId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}
