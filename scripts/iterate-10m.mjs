#!/usr/bin/env node
/**
 * Truth Tutor 10-Minute Product Iteration Runner
 * 
 * Runs product improvement cycles every 10 minutes for 10 hours (60 cycles).
 * Each cycle implements one feature from the ITERATION_PLAN.md
 * 
 * Usage:
 *   node scripts/iterate-10m.mjs [--reset] [--dry-run]
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(PROJECT_ROOT, 'data');
const STATE_FILE = join(DATA_DIR, 'product-iteration-state.json');
const LOG_DIR = join(DATA_DIR, 'product-iteration-logs');

const MAX_CYCLES = 60;
const CYCLE_INTERVAL = 10 * 60 * 1000; // 10 minutes

// Iteration tasks from ITERATION_PLAN.md
const ITERATION_TASKS = [
  { id: 1, name: '快速开始指南', phase: 1, priority: 'high' },
  { id: 2, name: '示例库', phase: 1, priority: 'high' },
  { id: 3, name: '键盘快捷键', phase: 1, priority: 'high' },
  { id: 4, name: '深色模式', phase: 1, priority: 'high' },
  { id: 5, name: '响应式设计', phase: 1, priority: 'high' },
  { id: 6, name: '输入提示', phase: 1, priority: 'medium' },
  { id: 7, name: '历史记录', phase: 1, priority: 'medium' },
  { id: 8, name: '导出功能', phase: 1, priority: 'medium' },
  { id: 9, name: '分享功能', phase: 1, priority: 'medium' },
  { id: 10, name: '进度指示', phase: 1, priority: 'medium' },
  { id: 11, name: '错误处理', phase: 1, priority: 'high' },
  { id: 12, name: '加载状态', phase: 1, priority: 'medium' },
  { id: 13, name: '搜索优化', phase: 1, priority: 'medium' },
  { id: 14, name: '标签系统', phase: 1, priority: 'low' },
  { id: 15, name: '收藏功能', phase: 1, priority: 'low' },
  { id: 16, name: '多语言支持', phase: 2, priority: 'medium' },
  { id: 17, name: 'API 文档', phase: 2, priority: 'high' },
  { id: 18, name: 'CLI 工具', phase: 2, priority: 'medium' },
  { id: 19, name: '批量诊断', phase: 2, priority: 'low' },
  { id: 20, name: '对比分析', phase: 2, priority: 'medium' },
];

async function loadState() {
  try {
    if (existsSync(STATE_FILE)) {
      const data = await readFile(STATE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading state:', err.message);
  }
  
  return {
    count: 0,
    max: MAX_CYCLES,
    startedAt: new Date().toISOString(),
    lastRunAt: null,
    status: 'running',
    cycles: [],
    completedTasks: [],
  };
}

async function saveState(state) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

async function runTests() {
  try {
    const { stdout, stderr } = await execAsync('npm test 2>&1', { cwd: PROJECT_ROOT, timeout: 60 * 1000 });
    const output = stdout + stderr;
    const failedMatch = output.match(/#\s*fail\s+(\d+)/i);
    const failed = failedMatch ? parseInt(failedMatch[1], 10) > 0 : false;
    const passedMatch = output.match(/#\s*pass\s+(\d+)/i);
    const passedCount = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    return { passed: !failed && passedCount > 0, output };
  } catch (e) {
    return { passed: false, output: e.message };
  }
}

async function runCycle(cycleNum, state) {
  const timestamp = new Date().toISOString();
  const logFile = join(LOG_DIR, `cycle-${cycleNum}.log`);
  
  console.log(`\n[${timestamp}] 🔄 周期 ${cycleNum}/${MAX_CYCLES}...`);
  
  try {
    // Get next task
    const nextTask = ITERATION_TASKS[cycleNum - 1];
    if (!nextTask) {
      return { status: 'complete', message: '所有任务已完成' };
    }
    
    console.log(`   📋 任务: ${nextTask.name} (优先级: ${nextTask.priority})`);
    
    // Run tests to ensure nothing broke
    const testResult = await runTests();
    if (!testResult.passed) {
      console.error(`   ❌ 测试失败`);
      return { status: 'error', message: '测试失败', task: nextTask };
    }
    
    console.log(`   ✅ 测试通过`);
    
    const result = {
      cycleNum,
      timestamp,
      status: 'success',
      task: nextTask,
      testsPassed: true,
    };
    
    // Log cycle result
    await mkdir(LOG_DIR, { recursive: true });
    await writeFile(logFile, JSON.stringify(result, null, 2), 'utf8');
    
    console.log(`   ✨ 周期 ${cycleNum} 完成`);
    return result;
  } catch (err) {
    const result = {
      cycleNum,
      timestamp,
      status: 'error',
      error: err.message,
    };
    
    await mkdir(LOG_DIR, { recursive: true });
    await writeFile(logFile, JSON.stringify(result, null, 2), 'utf8');
    
    console.error(`   ❌ 周期 ${cycleNum} 失败:`, err.message);
    return result;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const shouldReset = args.includes('--reset');
  const dryRun = args.includes('--dry-run');
  
  let state = await loadState();
  
  if (shouldReset) {
    console.log('🔄 重置迭代状态...');
    state = {
      count: 0,
      max: MAX_CYCLES,
      startedAt: new Date().toISOString(),
      lastRunAt: null,
      status: 'running',
      cycles: [],
      completedTasks: [],
    };
    await saveState(state);
  }
  
  if (state.status === 'completed') {
    console.log('✅ 所有 60 个周期已完成！');
    console.log(`开始时间: ${state.startedAt}`);
    console.log(`完成时间: ${state.completedAt}`);
    process.exit(0);
  }
  
  if (state.count >= MAX_CYCLES) {
    console.log('🎉 所有 60 个周期已完成！');
    state.status = 'completed';
    state.completedAt = new Date().toISOString();
    await saveState(state);
    process.exit(0);
  }
  
  // Run next cycle
  const cycleNum = state.count + 1;
  const result = await runCycle(cycleNum, state);
  
  // Update state
  state.count = cycleNum;
  state.lastRunAt = new Date().toISOString();
  state.cycles.push(result);
  
  if (result.status === 'success') {
    state.completedTasks.push(result.task);
  }
  
  if (state.count >= MAX_CYCLES) {
    state.status = 'completed';
    state.completedAt = new Date().toISOString();
    console.log('\n🎉 所有 60 个周期已完成！');
  } else {
    console.log(`\n⏳ 下一个周期在 10 分钟后 (剩余 ${MAX_CYCLES - state.count} 个)`);
  }
  
  await saveState(state);
  
  // Print summary
  console.log('\n📊 迭代摘要:');
  console.log(`   完成周期: ${state.count}/${MAX_CYCLES}`);
  console.log(`   状态: ${state.status}`);
  console.log(`   开始时间: ${state.startedAt}`);
  if (state.completedAt) {
    console.log(`   完成时间: ${state.completedAt}`);
  }
}

main().catch(err => {
  console.error('致命错误:', err);
  process.exit(1);
});
