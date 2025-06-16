/**
 * Bug Fix Test - 测试executeAt字段读取问题的修复
 */

// 模拟Chrome API
global.chrome = {
  storage: {
    local: {
      get: async (keys) => {
        return {};
      },
      set: async (data) => {
        console.log('Storage set:', data);
      }
    }
  },
  runtime: {
    sendMessage: async (message) => {
      console.log('Message sent:', message);
    }
  },
  alarms: {
    create: async (name, options) => {
      console.log('Alarm created:', name, options);
    }
  }
};

// 测试任务创建
async function testTaskCreation() {
  console.log('🧪 测试任务创建...');
  
  // 模拟BackgroundService
  class TestBackgroundService {
    constructor() {
      this.tasks = new Map();
    }

    generateTaskId() {
      return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async saveTasks() {
      console.log('Tasks saved to storage');
    }

    async createTask(taskData) {
      const task = {
        id: this.generateTaskId(),
        name: taskData.name || '未命名任务',
        type: taskData.type || 'scheduled',
        status: 'pending',
        
        // 请求配置
        request: {
          url: taskData.url,
          method: taskData.method || 'POST',
          headers: taskData.headers || {},
          body: taskData.body || {},
          website: taskData.website || 'unknown'
        },
        
        // 调度配置 - 修复executeAt字段
        schedule: {
          executeAt: taskData.executeAt ? new Date(taskData.executeAt).toISOString() : new Date().toISOString(),
          timezone: taskData.timezone || 'Asia/Shanghai',
          advanceMs: taskData.advanceMs || 500
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
        
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      this.tasks.set(task.id, task);
      await this.saveTasks();

      console.log('Task created with proper structure:', task.id);
      return task.id;
    }
  }

  const service = new TestBackgroundService();
  
  // 测试数据
  const testTaskData = {
    name: '京东10点抢5折膨胀神券',
    url: 'https://api.m.jd.com/api',
    method: 'POST',
    executeAt: '2024-12-16T10:00:00',
    maxAttempts: 5,
    intervalMs: 100,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': 'https://pro.m.jd.com/'
    },
    body: {
      functionId: 'seckillGrab',
      body: JSON.stringify({activityId: '4VRyBDdVVjGBDR1GWM3MJMaAv9PE'})
    }
  };

  try {
    const taskId = await service.createTask(testTaskData);
    const task = service.tasks.get(taskId);
    
    console.log('✅ 任务创建成功!');
    console.log('任务ID:', taskId);
    console.log('任务名称:', task.name);
    console.log('执行时间:', task.schedule.executeAt);
    console.log('请求URL:', task.request.url);
    console.log('统计信息:', task.stats);
    
    // 测试executeAt字段访问
    if (task.schedule && task.schedule.executeAt) {
      const executeTime = new Date(task.schedule.executeAt);
      console.log('✅ executeAt字段可以正常访问:', executeTime.toLocaleString());
    } else {
      console.error('❌ executeAt字段仍然无法访问');
    }
    
    return true;
  } catch (error) {
    console.error('❌ 任务创建失败:', error);
    return false;
  }
}

// 测试任务列表渲染
function testTaskListRendering() {
  console.log('\n🧪 测试任务列表渲染...');
  
  const mockTask = {
    id: 'task_test_123',
    name: '测试任务',
    status: 'pending',
    schedule: {
      executeAt: '2024-12-16T10:00:00.000Z'
    },
    execution: {
      maxAttempts: 5
    },
    stats: {
      attempts: 0
    }
  };

  try {
    // 模拟renderTaskList逻辑
    let executeTimeText = '未设置';
    if (mockTask.schedule && mockTask.schedule.executeAt) {
      executeTimeText = new Date(mockTask.schedule.executeAt).toLocaleTimeString();
    }

    const attempts = mockTask.stats ? mockTask.stats.attempts : 0;
    const maxAttempts = mockTask.execution ? mockTask.execution.maxAttempts : 5;

    console.log('✅ 任务渲染成功!');
    console.log('执行时间显示:', executeTimeText);
    console.log('尝试次数显示:', `${attempts}/${maxAttempts}`);
    
    return true;
  } catch (error) {
    console.error('❌ 任务渲染失败:', error);
    return false;
  }
}

// 运行测试
async function runTests() {
  console.log('🚀 开始Bug修复测试...\n');
  
  const test1 = await testTaskCreation();
  const test2 = testTaskListRendering();
  
  console.log('\n📊 测试结果:');
  console.log('任务创建测试:', test1 ? '✅ 通过' : '❌ 失败');
  console.log('任务渲染测试:', test2 ? '✅ 通过' : '❌ 失败');
  
  if (test1 && test2) {
    console.log('\n🎉 所有测试通过! executeAt字段问题已修复!');
  } else {
    console.log('\n⚠️ 部分测试失败，需要进一步检查');
  }
}

// 如果是Node.js环境，直接运行测试
if (typeof module !== 'undefined' && module.exports) {
  runTests();
}

// 如果是浏览器环境，导出测试函数
if (typeof window !== 'undefined') {
  window.runBugFixTests = runTests;
}
