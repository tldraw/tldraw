# Analyze Chrome DevTools trace

Analyze the Chrome DevTools performance trace file: $ARGUMENTS

## Instructions

1. First, find and read the trace file. If no path is given, look for `.json` files in the repo root that look like traces (large files with "trace" in the name or Chrome's default naming pattern).

2. The trace file is likely too large to read directly. Write a temporary Node.js script to analyze it:

```javascript
// analyze-trace-temp.mjs
import { readFile } from 'fs/promises';

const trace = JSON.parse(await readFile('TRACE_FILE_PATH', 'utf8'));
const events = trace.traceEvents;

// Find renderer main thread
const threadNames = events.filter(e => e.name === 'thread_name' && e.args?.name === 'CrRendererMain');
const rendererPid = threadNames[0]?.pid;
const mainThreadTid = threadNames[0]?.tid;

const mainThreadEvents = events.filter(e => e.pid === rendererPid && e.tid === mainThreadTid);

// Extract CPU profile data
const allNodes = new Map();
const profileEvents = events.filter(e => e.args?.data?.cpuProfile);

for (const e of profileEvents) {
  const nodes = e.args.data.cpuProfile?.nodes || [];
  for (const node of nodes) {
    if (!allNodes.has(node.id)) {
      allNodes.set(node.id, { ...node, hitCount: 0 });
    }
  }
  const samples = e.args.data.cpuProfile?.samples || [];
  for (const sampleId of samples) {
    const node = allNodes.get(sampleId);
    if (node) node.hitCount++;
  }
}

// Group by function
const byFunction = new Map();
for (const [id, node] of allNodes) {
  const cf = node.callFrame;
  if (!cf) continue;
  const name = cf.functionName || '(anonymous)';
  const url = cf.url || '';
  const line = cf.lineNumber || 0;
  const key = `${name}|${url}|${line}`;
  if (!byFunction.has(key)) {
    byFunction.set(key, { name, url: url.split('/').pop() || url, line, hitCount: 0 });
  }
  byFunction.get(key).hitCount += node.hitCount || 0;
}

const sorted = [...byFunction.values()].filter(f => f.hitCount > 0).sort((a, b) => b.hitCount - a.hitCount);
const totalSamples = sorted.reduce((sum, f) => sum + f.hitCount, 0);

console.log(`Total samples: ${totalSamples}`);
console.log(`Main thread events: ${mainThreadEvents.length}\n`);

// Skip idle/program, show JS functions
const jsFuncs = sorted.filter(f => !['(idle)', '(program)', '(garbage collector)'].includes(f.name));
console.log('=== TOP FUNCTIONS BY CPU TIME ===\n');
for (const f of jsFuncs.slice(0, 30)) {
  const pct = ((f.hitCount / totalSamples) * 100).toFixed(2);
  console.log(`${f.hitCount.toString().padStart(5)} (${pct.padStart(5)}%)  ${f.name}  [${f.url}:${f.line}]`);
}

// Animation frame analysis
const rafEvents = mainThreadEvents.filter(e => e.name === 'FireAnimationFrame' && e.dur);
const frameDurations = rafEvents.map(e => e.dur / 1000);
console.log('\n=== ANIMATION FRAMES ===\n');
console.log(`Total frames: ${rafEvents.length}`);
if (frameDurations.length > 0) {
  console.log(`Avg: ${(frameDurations.reduce((a,b) => a+b, 0) / frameDurations.length).toFixed(2)}ms`);
  console.log(`Max: ${Math.max(...frameDurations).toFixed(2)}ms`);
  console.log(`Frames > 16ms: ${frameDurations.filter(d => d > 16).length}`);
  console.log(`Frames > 33ms: ${frameDurations.filter(d => d > 33).length}`);
}

// Category breakdown
const categories = {
  'Reactive (@tldraw/state)': ['traverse', 'haveParentsChanged', 'propagateParentContextChanges', '__unsafe__getWithoutCapture'],
  'Text/Measurement': ['measureHtml', 'measureText', 'getTextLines'],
  'Geometry': ['nearestPoint', 'Edge2d', 'Geometry2d', 'getShapeAtPoint'],
  'React': ['render', 'beginWork', 'reconcileChildrenArray', 'renderWithHooks', 'commitMutationEffectsOnFiber'],
  'DOM': ['setAttribute', 'getBoundingClientRect', 'setProperty', 'removeChild', 'appendChild', 'innerHTML']
};

console.log('\n=== CATEGORY BREAKDOWN ===\n');
for (const [category, keywords] of Object.entries(categories)) {
  const matches = jsFuncs.filter(f => keywords.some(k => f.name.includes(k)));
  const total = matches.reduce((sum, f) => sum + f.hitCount, 0);
  const pct = ((total / totalSamples) * 100).toFixed(2);
  console.log(`${category}: ${total} samples (${pct}%)`);
}
```

3. Run the script with `node analyze-trace-temp.mjs` and capture the output.

4. Delete the temporary script after running.

5. Based on the results, provide:
   - **Summary**: Frame performance (are frames under 16ms?)
   - **Top hotspots**: Which functions are taking the most time?
   - **Categories**: Where is time being spent (reactive system, DOM, React, etc.)?
   - **Recommendations**: Specific areas to investigate or optimize

6. If you find issues, suggest specific files and line numbers to investigate in the tldraw codebase.

## Known patterns to look for

- `measureHtml` without caching → check if shape utils use `WeakCache`
- `haveParentsChanged` / `traverse` → reactive system overhead, normal but watch for excessive calls
- `getBoundingClientRect` / `offsetWidth` → forced layout, look for `useLayoutEffect` without deps
- `setAttribute` / `setProperty` → DOM mutations, check if values actually changed before setting
