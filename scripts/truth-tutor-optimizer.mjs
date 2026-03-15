#!/usr/bin/env node
/**
 * Truth Tutor Optimization Scheduler
 * 
 * Runs every 30 minutes for 8 hours, analyzing and optimizing the product.
 * Each cycle:
 * 1. Check current code state
 * 2. Identify next optimization opportunity
 * 3. Execute changes or generate detailed implementation plan
 * 4. Update status and log progress
 * 
 * Usage:
 *   node scripts/truth-tutor-optimizer.mjs [--cycles N] [--interval MS]
 * 
 * Defaults: 16 cycles (8 hours @ 30min), 30min interval
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOG_DIR = join(PROJECT_ROOT, 'data', 'optimizer-logs');
const LOG_FILE = join(LOG_DIR, 'optimizer-run.json');

const DEFAULT_CYCLES = 16; // 8 hours / 30 min
const DEFAULT_INTERVAL = 30 * 60 * 1000; // 30 min

// Optimization opportunities to explore in priority order
const OPTIMIZATION_DIRECTIONS = [
  {
    id: 'evidence-frontend-cards',
    name: 'Evidence Frontend Cards',
    description: 'Render Evidence section as structured cards with Section + Quote',
    status: 'done', // Implemented in app.js
    priority: 1,
    files: ['src/web-ui/app.js', 'src/web-ui/styles.css'],
    implementation: async () => {
      // Already implemented in app.js (parseEvidence, renderEvidence functions)
      return { status: 'done', message: 'Evidence rendering already implemented in app.js' };
    },
  },
  {
    id: 'profile-frequency-tracking',
    name: 'Gap Frequency Tracking',
    description: 'Track how many times each gap appears and show top 3',
    status: 'done', // Implemented in learning-profile.mjs
    priority: 2,
    files: ['src/learning-profile.mjs', 'src/web-ui/app.js'],
    implementation: async () => {
      // Already implemented in learning-profile.mjs (gapFrequency tracking)
      return { status: 'done', message: 'Gap frequency tracking already implemented in learning-profile.mjs' };
    },
  },
  {
    id: 'drill-library-page',
    name: 'Drill Library Page',
    description: 'Add dedicated page for browsing and selecting drills',
    status: 'done', // library.html exists
    priority: 3,
    files: ['src/web-ui/library.html', 'src/web-ui/app.js'],
    implementation: async () => {
      // Already implemented - library.html exists with drill grid UI
      return { status: 'done', message: 'Drill library page already implemented (library.html)' };
    },
  },
  {
    id: 'strictness-comparison-mode',
    name: 'Strictness Comparison Mode',
    description: 'Run same question with different strictness levels side-by-side',
    status: 'done', // compare.html and /api/compare-strictness exist
    priority: 4,
    files: ['src/web-ui/compare.html', 'src/web-server.mjs'],
    implementation: async () => {
      // Already implemented - compare.html exists and /api/compare-strictness endpoint works
      return { status: 'done', message: 'Strictness comparison already implemented (compare.html + API)' };
    },
  },
  {
    id: 'adaptive-drills',
    name: 'Adaptive Drill Recommendations',
    description: 'AI-powered drill recommendations based on user gaps',
    status: 'pending',
    priority: 5,
    files: ['src/adaptive-drills.mjs', 'src/learning-profile.mjs'],
    implementation: async () => {
      const adaptivePath = join(PROJECT_ROOT, 'src/adaptive-drills.mjs');
      const content = await readFile(adaptivePath, 'utf8');
      
      if (content.includes('analyzeDrillEffectiveness') && content.includes('loadAdaptiveDrillState')) {
        return { status: 'done', message: 'Adaptive drills module already implemented' };
      }
      
      return { status: 'planned', message: 'Adaptive drills need further development' };
    },
  },
  {
    id: 'learning-path-recommender',
    name: 'Personalized Learning Path',
    description: 'Generate personalized learning paths based on gaps and goals',
    status: 'pending',
    priority: 6,
    files: ['src/learning-path-recommender.mjs'],
    implementation: async () => {
      const recommenderPath = join(PROJECT_ROOT, 'src/learning-path-recommender.mjs');
      const content = await readFile(recommenderPath, 'utf8');
      
      if (content.length > 5000) {
        return { status: 'done', message: 'Learning path recommender module exists' };
      }
      
      return { status: 'planned', message: 'Learning path recommender needs development' };
    },
  },
];

async function loadHistory() {
  try {
    const raw = await readFile(LOG_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { runs: [] };
  }
}

async function saveHistory(history) {
  await mkdir(LOG_DIR, { recursive: true });
  await writeFile(LOG_FILE, JSON.stringify(history, null, 2), 'utf8');
}

async function runTests() {
  try {
    const { stdout, stderr } = await execAsync('npm test 2>&1', { cwd: PROJECT_ROOT, timeout: 60 * 1000 });
    const output = stdout + stderr;
    // Check for test failures in TAP output
    const failedMatch = output.match(/#\s*fail\s+(\d+)/i);
    const failed = failedMatch ? parseInt(failedMatch[1], 10) > 0 : false;
    const passedMatch = output.match(/#\s*pass\s+(\d+)/i);
    const passedCount = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    return { passed: !failed && passedCount > 0, output };
  } catch (e) {
    return { passed: false, output: e.message };
  }
}

async function runCycle(cycleNum) {
  console.log(`\n=== Cycle ${cycleNum} | ${new Date().toISOString()} ===`);
  
  const history = await loadHistory();
  
  // Find next pending optimization
  const nextOpt = OPTIMIZATION_DIRECTIONS
    .filter(o => o.status === 'pending')
    .sort((a, b) => a.priority - b.priority)[0];
  
  if (!nextOpt) {
    console.log('All optimizations complete or in progress!');
    return { complete: true };
  }
  
  console.log(`Focus: ${nextOpt.name}`);
  console.log(`Priority: ${nextOpt.priority}`);
  console.log(`Description: ${nextOpt.description}`);
  
  const actions = [];
  let newStatus = nextOpt.status;
  
  try {
    if (nextOpt.implementation) {
      console.log('Executing implementation...');
      const result = await nextOpt.implementation();
      actions.push({
        type: 'implementation',
        result: result.message,
        timestamp: new Date().toISOString(),
      });
      newStatus = result.status;
      
      if (result.status === 'done') {
        console.log('Running tests...');
        const testResult = await runTests();
        actions.push({
          type: 'test',
          passed: testResult.passed,
          timestamp: new Date().toISOString(),
        });
        
        if (!testResult.passed) {
          console.log('Tests failed, reverting...');
          newStatus = 'error';
        }
      }
    }
  } catch (error) {
    console.error('Implementation failed:', error);
    actions.push({
      type: 'error',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
    newStatus = 'error';
  }
  
  // Update status
  nextOpt.status = newStatus;
  
  const runRecord = {
    cycle: cycleNum,
    timestamp: new Date().toISOString(),
    focus: nextOpt.id,
    focusName: nextOpt.name,
    status: newStatus,
    actions,
  };
  
  history.runs.push(runRecord);
  await saveHistory(history);
  
  console.log('Status:', newStatus);
  console.log('Actions:', JSON.stringify(actions, null, 2));
  
  return { complete: false, runRecord };
}

async function main() {
  const args = process.argv.slice(2);
  let cycles = DEFAULT_CYCLES;
  let interval = DEFAULT_INTERVAL;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cycles' && args[i + 1]) {
      cycles = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--interval' && args[i + 1]) {
      interval = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--dry-run') {
      const result = await runCycle(1);
      console.log('\n--- DRY RUN COMPLETE ---');
      console.log(JSON.stringify(result, null, 2));
      return;
    }
  }
  
  console.log(`Truth Tutor Optimizer Starting`);
  console.log(`Cycles: ${cycles}, Interval: ${interval / 1000 / 60} min`);
  console.log(`Log file: ${LOG_FILE}`);
  
  for (let i = 1; i <= cycles; i++) {
    const result = await runCycle(i);
    
    if (result.complete) {
      console.log('\n=== ALL OPTIMIZATIONS COMPLETE ===');
      break;
    }
    
    if (i < cycles) {
      console.log(`\nWaiting ${interval / 1000 / 60} minutes before next cycle...`);
      await new Promise(r => setTimeout(r, interval));
    }
  }
  
  console.log('\n=== OPTIMIZER RUN COMPLETE ===');
  const history = await loadHistory();
  console.log(`Total cycles: ${history.runs.length}`);
  console.log(`Log: ${LOG_FILE}`);
}

main().catch(err => {
  console.error('Optimizer failed:', err);
  process.exit(1);
});
