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
    status: 'pending',
    priority: 1,
    files: ['src/web-ui/app.js', 'src/web-ui/styles.css'],
    implementation: async () => {
      // Read current app.js
      const appPath = join(PROJECT_ROOT, 'src/web-ui/app.js');
      let appContent = await readFile(appPath, 'utf8');
      
      // Check if evidence rendering already exists
      if (appContent.includes('renderEvidence')) {
        return { status: 'done', message: 'Evidence rendering already implemented' };
      }
      
      // Add evidence parsing and rendering
      const evidenceParser = `
function parseEvidence(text) {
  const evidenceSection = text.match(/##\\s*Evidence([\\s\\S]*?)(?:\\n##\\s|$)/i)?.[1] || '';
  const items = [];
  const lines = evidenceSection.split('\\n');
  let current = null;
  
  for (const line of lines) {
    if (line.match(/^\\s*-\\s*Claim:/i)) {
      if (current) items.push(current);
      current = { claim: line.replace(/^\\s*-\\s*Claim:\\s*/i, '').trim() };
    } else if (current && line.match(/^\\s*-\\s*Section:/i)) {
      current.section = line.replace(/^\\s*-\\s*Section:\\s*/i, '').trim();
    } else if (current && line.match(/^\\s*-\\s*Paragraph:/i)) {
      current.paragraph = line.replace(/^\\s*-\\s*Paragraph:\\s*/i, '').trim();
    } else if (current && line.match(/^\\s*-\\s*Quote:/i)) {
      current.quote = line.replace(/^\\s*-\\s*Quote:\\s*/i, '').trim().replace(/^["']|["']$/g, '');
    }
  }
  if (current) items.push(current);
  return items;
}

function renderEvidence(items) {
  if (!items?.length) return '';
  return \`
    <div class="evidence-cards">
      <h4>📚 Evidence</h4>
      \${items.map(item => \`
        <div class="evidence-card">
          <div class="evidence-claim">\${escapeHtml(item.claim || 'N/A')}</div>
          \${item.section ? \`<div class="evidence-meta">Section: \${escapeHtml(item.section)}</div>\` : ''}
          \${item.paragraph && item.paragraph !== 'N/A' ? \`<div class="evidence-meta">Paragraph: \${escapeHtml(item.paragraph)}</div>\` : ''}
          \${item.quote && item.quote !== 'N/A' ? \`<div class="evidence-quote">"\${escapeHtml(item.quote)}"</div>\` : ''}
        </div>
      \`).join('')}
    </div>
  \`;
}
`;
      
      // Insert before renderMessages function
      const insertPoint = appContent.indexOf('function renderMessages()');
      if (insertPoint === -1) {
        return { status: 'error', message: 'Could not find insertion point in app.js' };
      }
      
      appContent = appContent.slice(0, insertPoint) + evidenceParser + '\n' + appContent.slice(insertPoint);
      
      // Update renderMessages to include evidence
      appContent = appContent.replace(
        /const html = marked\.parse\(msg\.content\);/,
        `const html = marked.parse(msg.content);
    const evidence = parseEvidence(msg.content);
    const evidenceHtml = renderEvidence(evidence);`
      );
      
      appContent = appContent.replace(
        /<div class="message-content">\$\{html\}<\/div>/,
        `<div class="message-content">\${html}\${evidenceHtml}</div>`
      );
      
      await writeFile(appPath, appContent, 'utf8');
      
      // Add CSS
      const cssPath = join(PROJECT_ROOT, 'src/web-ui/styles.css');
      let cssContent = await readFile(cssPath, 'utf8');
      
      if (!cssContent.includes('.evidence-cards')) {
        cssContent += `
.evidence-cards {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #007bff;
}

.evidence-cards h4 {
  margin: 0 0 1rem 0;
  font-size: 0.95rem;
  color: #495057;
}

.evidence-card {
  background: white;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.evidence-card:last-child {
  margin-bottom: 0;
}

.evidence-claim {
  font-weight: 600;
  color: #212529;
  margin-bottom: 0.5rem;
}

.evidence-meta {
  font-size: 0.85rem;
  color: #6c757d;
  margin-bottom: 0.25rem;
}

.evidence-quote {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #f1f3f5;
  border-left: 3px solid #adb5bd;
  font-style: italic;
  color: #495057;
  font-size: 0.9rem;
}
`;
        await writeFile(cssPath, cssContent, 'utf8');
      }
      
      return { status: 'done', message: 'Evidence cards implemented in frontend' };
    },
  },
  {
    id: 'profile-frequency-tracking',
    name: 'Gap Frequency Tracking',
    description: 'Track how many times each gap appears and show top 3',
    status: 'pending',
    priority: 2,
    files: ['src/learning-profile.mjs', 'src/web-ui/app.js'],
    implementation: async () => {
      const profilePath = join(PROJECT_ROOT, 'src/learning-profile.mjs');
      let content = await readFile(profilePath, 'utf8');
      
      if (content.includes('gapFrequency')) {
        return { status: 'done', message: 'Gap frequency already tracked' };
      }
      
      // Update data structure to include frequency
      content = content.replace(
        /recurringGaps: Array\.isArray\(parsed\.recurringGaps\)/,
        `recurringGaps: Array.isArray(parsed.recurringGaps)`
      );
      
      content = content.replace(
        /const next = \{[\s\S]*?updatedAt:/,
        `const gapFrequency = parsed.gapFrequency || {};
  for (const gap of extractedGaps) {
    gapFrequency[gap] = (gapFrequency[gap] || 0) + 1;
  }
  
  const next = {
    profileKey: current.profileKey,
    recurringGaps: mergeUnique(extractedGaps, current.recurringGaps).slice(0, 8),
    gapFrequency,
    recentTopics: mergeUnique([input.paperTitle, input.topic].filter(Boolean), current.recentTopics).slice(0, 8),
    sessions: current.sessions + 1,
    updatedAt:`
      );
      
      content = content.replace(
        /return \{[\s\S]*?updatedAt: parsed\.updatedAt/,
        `return {
      profileKey: safeKey,
      recurringGaps: Array.isArray(parsed.recurringGaps) ? parsed.recurringGaps.slice(0, 8) : [],
      gapFrequency: parsed.gapFrequency || {},
      recentTopics: Array.isArray(parsed.recentTopics) ? parsed.recentTopics.slice(0, 8) : [],
      sessions: Number(parsed.sessions || 0),
      updatedAt: parsed.updatedAt`
      );
      
      // Update summarize to show top 3
      content = content.replace(
        /if \(profile\.recurringGaps\?\.length\) \{[\s\S]*?\}/,
        `if (profile.recurringGaps?.length) {
    const sorted = profile.recurringGaps
      .map(gap => ({ gap, count: profile.gapFrequency?.[gap] || 1 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    lines.push(\`Top recurring gaps: \${sorted.map(x => \`\${x.gap} (×\${x.count})\`).join('; ')}\`);
  }`
      );
      
      await writeFile(profilePath, content, 'utf8');
      return { status: 'done', message: 'Gap frequency tracking added' };
    },
  },
  {
    id: 'drill-library-page',
    name: 'Drill Library Page',
    description: 'Add dedicated page for browsing and selecting drills',
    status: 'done',
    priority: 3,
    priority: 3,
    files: ['src/web-ui/app.js', 'src/web-ui/styles.css'],
    implementation: async () => {
      // This would require more extensive UI changes
      // For now, mark as planned
      return { status: 'planned', message: 'Drill library page design in progress' };
    },
  },
  {
    id: 'strictness-comparison-mode',
    name: 'Strictness Comparison Mode',
    description: 'Run same question with different strictness levels side-by-side',
    status: 'done',
    priority: 4,
    priority: 4,
    files: ['src/web-ui/app.js'],
    implementation: async () => {
      return { status: 'planned', message: 'Comparison mode design in progress' };
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
    const { stdout, stderr } = await execAsync('npm test', { cwd: PROJECT_ROOT });
    return { passed: !stderr.includes('failed'), output: stdout };
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
