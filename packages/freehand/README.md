# @tldraw/freehand

The freehand ink algorithm used by tldraw's draw and highlighter shapes. The `tldraw` package consumes this package directly; it also works standalone and has no dependencies.

The package keeps its benchmark and comparison harness alongside the shipping implementation so future optimization work can be measured against the frozen pre-optimization baseline.

## Current results

The shipping implementation (`src/lib`) versus the frozen pre-optimization baseline, over the full corpus:

- 1.33x faster overall (geomean of the full input-points-to-svg pipeline): short strokes 1.16x, medium 1.25x, long 1.78x, no case slower
- 38% fewer outline points
- 59% smaller svg path data
- max deviation from the baseline shape: 0.26px (5% of the stroke size, the simplifier's bound); mean deviation 0.018px

How it gets there:

- svg path data is written into a shared byte buffer with integer math and decoded once per path; doubles rounded to 2 decimals stringify slowly in V8, so coordinates are tracked as integer hundredths of a pixel
- paths use relative commands (`t`/`q`/`a`/`l`); deltas between consecutive points are small numbers that write fast and keep the data compact, and integer deltas sum exactly so rounding never drifts
- outline tracks are simplified with a tolerance of 5% of the stroke size, and cap arcs are tessellated adaptively by chord error instead of fixed step counts
- the elbow partitioner and outline-track loop use scalar math instead of allocating temporary vectors per point

## Layout

- `src/lib` - the shipping implementation, consumed by the `tldraw` package.
- `src/baseline` - a frozen, verbatim copy of the algorithm as it shipped in `packages/tldraw` before the optimization work. Never edit these files; they are the reference the parity gate and benchmarks compare against.
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

Run the tests, including the vendor drift guard and the parity gate (the shipping implementation must stay visually near-identical to the baseline and never produce more output):

```bash
yarn workspace @tldraw/freehand test-ci
```
