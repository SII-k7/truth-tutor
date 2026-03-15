#!/usr/bin/env node
/**
 * Truth Tutor 15-Minute Iteration Runner
 * 
 * Runs optimization cycles every 15 minutes for 40 rounds (10 hours total).
 * Tracks state in data/iteration-state.json to ensure exactly 40 cycles complete.
 * 
 * Usage:
 *   node scripts/iterate-15m.mjs [--reset]
 * 
 * Options:
 *   --reset    Reset iteration counter and start fresh
 * 
 * Note: Uses absolute path to node to avoid PATH issues in LaunchAgent
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
const STATE_FILE = join(DATA_DIR, 'iteration-state.json');
const LOG_DIR = join(DATA_DIR, 'iteration-logs');

const MAX_CYCLES = 40;
const CYCLE_INTERVAL = 15 * 60 * 1000; // 15 minutes

// Ensure directories exist
await mkdir(DATA_DIR, { recursive: true });
await mkdir(LOG_DIR, { recursive: true });

/**
 * Load or initialize iteration state
 */
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
  };
}

/**
 * Save iteration state
 */
async function saveState(state) {
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

/**
 * Run a single optimization cycle
 */
async function runCycle(cycleNum) {
  const timestamp = new Date().toISOString();
  const logFile = join(LOG_DIR, `cycle-${cycleNum}.log`);
  
  console.log(`\n[${timestamp}] Starting cycle ${cycleNum}/${MAX_CYCLES}...`);
  
  try {
    // Use process.execPath to avoid PATH issues in LaunchAgent
    const nodePath = process.execPath;
    const optimizerScript = join(PROJECT_ROOT, 'scripts/truth-tutor-optimizer.mjs');
    
    const { stdout, stderr } = await execAsync(
      `${nodePath} ${optimizerScript} --cycles 1 --interval 0`,
      { cwd: PROJECT_ROOT, timeout: 10 * 60 * 1000, env: { ...process.env, PATH: process.env.PATH || '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin' } }
    );
    
    const result = {
      cycleNum,
      timestamp,
      status: 'success',
      output: stdout,
      errors: stderr || null,
    };
    
    // Log cycle result
    await writeFile(logFile, JSON.stringify(result, null, 2), 'utf8');
    
    console.log(`✅ Cycle ${cycleNum} completed successfully`);
    return result;
  } catch (err) {
    const result = {
      cycleNum,
      timestamp,
      status: 'error',
      error: err.message,
      stderr: err.stderr || null,
    };
    
    await writeFile(logFile, JSON.stringify(result, null, 2), 'utf8');
    
    console.error(`❌ Cycle ${cycleNum} failed:`, err.message);
    return result;
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const shouldReset = args.includes('--reset');
  
  let state = await loadState();
  
  if (shouldReset) {
    console.log('🔄 Resetting iteration state...');
    state = {
      count: 0,
      max: MAX_CYCLES,
      startedAt: new Date().toISOString(),
      lastRunAt: null,
      status: 'running',
      cycles: [],
    };
    await saveState(state);
  }
  
  // Check if already completed
  if (state.status === 'completed') {
    console.log('✅ All 40 cycles already completed!');
    console.log(`Started: ${state.startedAt}`);
    console.log(`Completed: ${state.completedAt}`);
    process.exit(0);
  }
  
  // Check if we've hit the max
  if (state.count >= MAX_CYCLES) {
    console.log('🎉 All 40 cycles completed!');
    state.status = 'completed';
    state.completedAt = new Date().toISOString();
    await saveState(state);
    process.exit(0);
  }
  
  // Run next cycle
  const cycleNum = state.count + 1;
  const result = await runCycle(cycleNum);
  
  // Update state
  state.count = cycleNum;
  state.lastRunAt = new Date().toISOString();
  state.cycles.push(result);
  
  if (state.count >= MAX_CYCLES) {
    state.status = 'completed';
    state.completedAt = new Date().toISOString();
    console.log('\n🎉 All 40 cycles completed!');
  } else {
    console.log(`\n⏳ Next cycle in 15 minutes (${MAX_CYCLES - state.count} remaining)`);
  }
  
  await saveState(state);
  
  // Print summary
  console.log('\n📊 Iteration Summary:');
  console.log(`   Cycles completed: ${state.count}/${MAX_CYCLES}`);
  console.log(`   Status: ${state.status}`);
  console.log(`   Started: ${state.startedAt}`);
  if (state.completedAt) {
    console.log(`   Completed: ${state.completedAt}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
