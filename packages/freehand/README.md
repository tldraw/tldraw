# @tldraw/freehand

The freehand ink algorithm used by tldraw's draw and highlighter shapes. The `tldraw` package consumes this package directly; it also works standalone, with no dependency on the rest of the SDK beyond `@tldraw/utils` for library version registration.

## Implementation notes

The implementation was optimized against the algorithm that previously shipped inside `packages/tldraw` (1.33x faster overall, 38% fewer outline points, 59% smaller svg path data, max visual deviation 0.26px at 5% of the stroke size; see the original PR for the comparison harness and full results):

- svg path data is written into a shared byte buffer with integer math and decoded once per path; doubles rounded to 2 decimals stringify slowly in V8, so coordinates are tracked as integer hundredths of a pixel
- paths use relative commands (`t`/`q`/`a`/`l`); deltas between consecutive points are small numbers that write fast and keep the data compact, and integer deltas sum exactly so rounding never drifts
- outline tracks are simplified with a tolerance of 5% of the stroke size, and cap arcs are tessellated adaptively by chord error instead of fixed step counts
- the elbow partitioner and outline-track loop use scalar math instead of allocating temporary vectors per point

## Layout

- `src/lib` - the algorithm, consumed by the `tldraw` package.
- `src/vendor` - copies of the `Vec` and easing primitives from `@tldraw/editor`, so the package does not depend on the editor. `Vec` is trimmed to just the members the package uses; the drift guard checks each kept member is a verbatim copy of the editor's.
- `src/test` - the tests, including a deterministic corpus of simulated strokes (short and long; mouse, stylus, solid, highlighter) using the same stroke options tldraw passes in production, plus real hand-drawn strokes recorded in tldraw (`corpus/real.ts`).

## Tests

Run the tests, including the vendor drift guard and the corpus-driven svg well-formedness checks:

```bash
yarn workspace @tldraw/freehand test-ci
```
