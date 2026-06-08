# Marketing assets are generated rasters, not native shapes or HTML

> Status: superseded in part by ADR 0004. The *background* is still a generated raster as
> described here; *text* is no longer part of that raster — it is composed deterministically
> by the app. The reasoning below applies to the background.

A marketing asset is a raster PNG produced by an image-generation model (default
Gemini 2.5 Flash Image), placed on the canvas inside a frame. We deliberately did
*not* compose assets from native tldraw shapes (text/rect/image) or render them from
LLM-emitted HTML/CSS, even though a tldraw demo using native shapes would be the
obvious choice.

We chose the raster path for richer, photographic visual output and the simplest
mental model ("the asset is pixels"). The accepted trade-off: the model cannot honor
exact brand specs — colours, fonts, and spacing are applied as prompt text plus
reference images, not as a deterministic render — and the asset is not editable on the
canvas beyond regeneration. This is why brand guidelines are phrased as soft
constraints and why edits flow through [[Re-render]] rather than direct shape mutation.

## Considered options

- **HTML/CSS → rendered image** (make-real lineage): exact brand precision, diffable
  source, but needs a render step and yields flatter designs. Rejected for visual range.
- **Native tldraw shapes**: fully editable on canvas, but weaker layout quality and a
  fuzzy boundary between "the asset" and "annotations on it." Rejected for design
  quality and conceptual clarity.
