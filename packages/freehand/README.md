# @tldraw/freehand

The freehand ink algorithm used by tldraw's draw and highlighter shapes, extracted into its own package for benchmarking and optimization. This package is private and not published.

## Current results

The candidate implementation (`src/lib`) versus the baseline that ships in tldraw today, over the full corpus:

- 1.33x faster overall (geomean of the full input-points-to-svg pipeline): short strokes 1.16x, medium 1.25x, long 1.78x, no case slower
- 38% fewer outline points
- 59% smaller svg path data
- max deviation from the baseline shape: 0.26px (5% of the stroke size, the simplifier's bound); mean deviation 0.018px

How it gets there:

- svg path data is written into a shared byte buffer with integer math and decoded once per path; doubles rounded to 2 decimals stringify slowly in V8, so coordinates are tracked as integer hundredths of a pixel
- paths use relative commands (`t`/`q`/`a`/`l`); deltas between consecutive points are small numbers that write fast and keep the data compact, and integer deltas sum exactly so rounding never drifts
- outline tracks are simplified with a tolerance of 5% of the stroke size, and cap arcs are tessellated adaptively by chord error instead of fixed step counts
- the elbow partitioner and outline-track loop use scalar math instead of allocating temporary vectors per point

The candidate has not been ported back into `packages/tldraw` yet; that is the intended follow-up once the visual results have been reviewed (open `out/report.html` after a compare run to eyeball the overlays).

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
