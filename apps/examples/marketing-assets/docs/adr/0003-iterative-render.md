# A re-render applies edits iteratively, one render pass per instruction

The [[Interpret]] stage returns a numbered list of discrete edits. Rather than bundling
them into a single image-model call, a re-render loops: it applies the first edit to the
clean asset, feeds that result back in as the source for the second edit, and so on, up
to a cap (currently 8; overflow is bundled into the last pass). The final image becomes
the new version. A reader will reasonably ask why a single re-render fires several
sequential image-generation calls instead of one.

Image-editing models reliably apply roughly one change per call. When several edits are
bundled into one instruction, they tend to honour the most salient and silently drop the
rest — exactly the "some instructions get ignored" failure this avoids. Editing one
change per pass trades latency and cost (N calls instead of one, run sequentially
because each depends on the last) for near-complete adherence. The asset surfaces a live
"Editing k/N" counter so the longer wait reads as progress, not a hang.

## Considered options

- **Single bundled pass** — all edits in one instruction: one call, lowest latency, but
  drops edits when several are requested. Rejected as the primary path; it remains the
  effective behaviour when only one edit is requested.
- **Parallel passes from the same source, then merge** — can't merge raster edits without
  another model step, and parallel edits don't compose. Rejected.
