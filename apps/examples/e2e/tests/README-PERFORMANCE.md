# FPS Performance Testing Suite

This directory contains a comprehensive FPS performance testing suite for tldraw, designed to detect performance regressions and track performance improvements over time.

## ✨ **Key Features**

- **🔄 Auto-Baseline Creation**: Baselines are automatically created on first test run
- **📈 Regression Detection**: 10% threshold with configurable warnings
- **📊 Multiple Test Types**: Rotation, dragging, panning, zooming + stress tests
- **🔗 Analytics Integration**: PostHog reporting with performance alerts
- **📱 Cross-Platform**: Desktop & mobile viewport testing

## 🚀 Quick Start

```bash
# Run all performance tests (baselines auto-created on first run!)
yarn e2e --grep "Performance Tests"

# Run specific performance test
yarn e2e --grep "Shape Rotation Performance"

# View current baselines
node scripts/manage-perf-baselines.mjs view

# Establish all baselines manually
node scripts/manage-perf-baselines.mjs establish
```

## 📊 What It Tests

The suite measures FPS performance for key tldraw interactions:

- **Shape Rotation**: Multi-select rotation of 10+ shapes
- **Shape Dragging**: Dragging 5+ shapes around the canvas
- **Canvas Panning**: Space+drag panning across heavy boards
- **Canvas Zooming**: Wheel zoom in/out cycles

Each test runs on boards with **100-500+ shapes** to stress-test performance.

## 🏗️ Architecture

### Core Components

- **`fps-tracker.ts`**: Browser-injected FPS measurement
- **`heavy-board-generator.ts`**: Creates test boards with many shapes
- **`baseline-manager.ts`**: Stores and compares performance baselines
- **`perf-utils.ts`**: High-level test orchestration
- **`analytics-reporter.ts`**: PostHog integration for metrics
- **`test-perf.ts`**: Playwright test suite

### Test Boards

- **Medium** (200 shapes): Default for regular testing
- **Stress** (500 shapes): Maximum complexity testing
- **Mobile** (100 shapes): Optimized for mobile viewports

## 📈 Baseline System

Performance baselines are stored in `baselines/fps-baselines.json`:

```json
{
	"baselines": {
		"darwin-1920x1080": {
			"rotate_shapes": {
				"avgFps": 45,
				"minFps": 38,
				"timestamp": "2024-01-15T10:30:00Z",
				"environment": {
					/* ... */
				}
			}
		}
	}
}
```

### Regression Detection

- **🔴 Fail**: >10% performance drop (configurable)
- **🟡 Warning**: 5-10% change or significant improvement
- **🟢 Pass**: Performance stable

## 🔧 Configuration

### Environment Variables

```bash
# Enable analytics reporting
PERFORMANCE_ANALYTICS_ENABLED=true
POSTHOG_PROJECT_KEY=your-project-key
POSTHOG_API_HOST=https://analytics.tldraw.com/ingest

# Git context for CI
GIT_COMMIT=abc123
GIT_BRANCH=main
GITHUB_ACTIONS=true
```

### Thresholds

```typescript
// In test code
perfSuite.setThresholds(
	15, // regression threshold (%)
	8 // warning threshold (%)
)
```

## 📊 Analytics Integration

When enabled, the suite sends detailed metrics to PostHog:

### Events Sent

**`performance_test_result`**:

- FPS metrics (avg, min, max)
- Test environment (platform, browser, viewport)
- Baseline comparison results
- Git context (commit, branch)

**`performance_regression_alert`**:

- Automatic alerts for >10% regressions
- Severity levels (high/medium)
- Detailed regression information

## 🎯 Usage Examples

### Running Individual Tests

```bash
# Test specific interaction
yarn e2e --grep "Shape Rotation Performance"

# Test with custom viewport
yarn e2e --grep "Mobile Performance" --viewport 390x844
```

### 📊 Baseline Management

#### **Automatic Baseline Creation**

Baselines are **automatically created** on first test run! No manual setup required.

#### **Manual Baseline Management**

# Or run the specific test

yarn e2e --grep "Establish All Performance Baselines"

````

#### **Programmatic Baseline Control**

```typescript
// Auto-create baselines (default behavior)
const result = await perfSuite.testShapeRotation()
// ✅ Baseline automatically created if none exists

// Disable auto-creation
const comparison = baselineManager.compareWithBaseline(
  'rotate_shapes',
  metrics,
  environment,
  false // Don't auto-create
)

// Manual baseline updates
perfSuite.updateBaseline('rotate_shapes', metrics, true) // Force update
perfSuite.establishBaselines() // Run all tests and set baselines
````

### Custom Board Generation

```typescript
await boardGenerator.generateHeavyBoard({
	shapeCount: 300,
	includeGroups: true,
	includeText: true,
	includeArrows: true,
	seed: 42, // for reproducible tests
})
```

## 📋 Best Practices

### For CI/CD

1. **Run regularly**: Daily scheduled runs to catch regressions early
2. **Baseline management**: Update baselines only for verified improvements
3. **Flaky test handling**: Set reasonable minimum FPS thresholds
4. **Environment consistency**: Use consistent browser/OS combinations

### For Development

1. **Pre-commit testing**: Run performance tests before major changes
2. **Gradual degradation**: Watch for small but consistent FPS drops
3. **Device testing**: Test on both desktop and mobile viewports
4. **Stress testing**: Use stress tests for major architectural changes

## 🔍 Troubleshooting

### Common Issues

**Low FPS measurements**:

- Check system load during testing
- Ensure headless mode is enabled
- Verify no other heavy processes running

**Inconsistent results**:

- Tests include warmup periods to stabilize measurements
- Multiple samples averaged for accuracy
- Consider increasing measurement duration

**Baseline missing**:

- First test run establishes baselines automatically
- Use `updateBaseline()` to set initial values

### Debugging FPS Issues

```typescript
// Enable detailed logging
console.log('FPS Samples:', result.metrics.samples)
console.log(
	'Frame distribution:',
	result.metrics.samples.map((fps, i) => `${i}:${fps}`)
)

// Check board complexity
const shapeCount = await boardGenerator.getShapeCount()
console.log(`Testing with ${shapeCount} shapes`)
```

## 📈 Interpreting Results

### Good Performance Indicators

- **Desktop**: >30 FPS average, >20 FPS minimum
- **Mobile**: >20 FPS average, >15 FPS minimum
- **Consistent**: Low variance between min/max FPS

### Warning Signs

- **Gradual decline**: Baseline slowly degrading over time
- **High variance**: Large gaps between min/max FPS
- **Platform differences**: Significant desktop vs mobile gaps

## 🚀 Future Enhancements

- **Memory usage tracking**: Add memory consumption metrics
- **Network performance**: Measure sync/collaboration performance
- **Visual regression**: Screenshot-based performance correlation
- **Automated tuning**: AI-powered performance optimization suggestions

---

For questions or improvements, please see the main tldraw contributing guidelines.
