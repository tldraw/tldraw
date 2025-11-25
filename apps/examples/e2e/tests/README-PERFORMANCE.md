# Performance Testing

FPS performance tests for tldraw to detect regressions and track improvements.

```bash
# Run all performance tests
yarn e2e-perf

# With UI
yarn e2e-perf-ui
```

Baselines are automatically created on first run.

## Regression Detection

- **Fail**: >10% performance drop
- **Warning**: 5-10% change
- **Pass**: Performance stable

Results compared against baselines in `baselines/fps-baselines.json`.

## Configuration

### Environment Variables

When `PERFORMANCE_ANALYTICS_ENABLED` enabled, sends performance metrics and regression alerts to PostHog.

```bash
# Analytics (optional)
PERFORMANCE_ANALYTICS_ENABLED=true
POSTHOG_PROJECT_KEY=your-key

# CI context
GIT_COMMIT=abc123
GIT_BRANCH=main
```
