# Re-render is a two-stage interpret → render pipeline; arrows never reach the image model

When the user re-renders an annotated asset, we first send the annotated composite (the
asset with arrows and text marks visible) to a vision LLM (default Claude) that emits a
numbered list of discrete edit instructions, then apply those edits to the *clean* asset
with the image model (Gemini) — one render pass per instruction, each feeding into the
next (see ADR 0003). A future reader will reasonably ask why a whole second LLM sits in
front of the image model instead of sending the annotations straight to it.

Two reasons drove this. First, image models bake visible arrows into their output and
follow loosely-placed marks unreliably; routing annotations through a text-only
interpreter means arrows are read for intent but can never leak into the pixels.
Second, arrows in this app *point* at a spot while paired text *describes* a change —
a reasoning model resolves that pairing into crisp language far better than an image
model does. The accepted trade-off is added latency, a second API key, and pipeline
complexity.

## Considered options

- **Single stage** — annotations straight to the image model: simplest, but arrow
  leakage and weak steering. Rejected.
- **Bake annotations into the source raster** sent to the image model: caused arrows to
  appear in results and gave the model no clean base to edit. Rejected.
