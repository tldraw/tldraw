# @tldraw/freehand

The freehand ink algorithm used by tldraw's draw and highlighter shapes, extracted into its own package for benchmarking and optimization. This package is private and not published.

## Layout

- `src/lib` - the candidate implementation. This is the code being optimized.
- `src/baseline` - a frozen, verbatim copy of the algorithm as it ships in `packages/tldraw/src/lib/shapes/shared/freehand`. Never edit these files; refresh them by re-copying when the tldraw sources change. `src/guard.test.ts` fails if they drift.
- `src/vendor` - copies of the `Vec` and easing primitives from `@tldraw/editor`, so the package has no dependencies and benchmarks measure only the algorithm.
- `src/corpus` - a deterministic corpus of simulated strokes (short and long; mouse, stylus, solid, highlighter) using the same stroke options tldraw passes in production.
- `src/harness` - the comparison harness: geometric deviation, output size, and timing metrics, plus SVG overlay rendering and the HTML report.

## Usage

Compare the candidate against the baseline over the whole corpus. Writes `out/report.html` (overlay images, per-case metrics) and `out/data.json`:

```bash
yarn workspace @tldraw/freehand compare          # report only
yarn workspace @tldraw/freehand compare --check  # exit non-zero on visible deviation
```

Benchmark the full input-points-to-SVG pipeline for both implementations:

```bash
yarn workspace @tldraw/freehand bench [--json]
```

Run the tests, including the baseline drift guard and the parity gate (candidate must stay visually near-identical to the baseline and never produce more output):

```bash
yarn workspace @tldraw/freehand test-ci
```
