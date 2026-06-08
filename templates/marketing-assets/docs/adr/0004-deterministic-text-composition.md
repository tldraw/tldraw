# Text is composed deterministically by the app, not rendered by the image model

An asset is now a text-free [[Background]] from the image model plus [[Text layer]]s the
app renders over it. The image model is told to produce no lettering at all; a vision LLM
([[Plan]]) decides the copy and returns it as structured data (text, normalized position,
font role, size, colour, alignment, scrim), which the app draws with real fonts and exact
colours. This **supersedes the text half of ADR 0001** — backgrounds are still generated
raster, but text is no longer pixels.

We moved text out of the image model after repeatedly fighting it through prompting:
image models invent unrequested copy, typeset hex codes and font names literally, place
text over low-contrast areas, and — worst with the iterative re-render of ADR 0003 —
drift text position and alignment on every edit pass. None of those are fully fixable with
prompt instructions because the model is guessing at layout. Making text data instead of
pixels makes it exactly legible, on-brand (any web font, exact hex), editable, and
stable: a re-render that only touches text makes no image-model call at all, so it can't
drift. The accepted trade-off is more moving parts — a text-planning stage, a structured
schema, and an app-side text renderer (including an approximate renderer for SVG export) —
and a harder line between "background" edits and "text" edits on re-render.

## Considered options

- **Keep text in the image model, prompt harder** (the prior approach): simplest data
  model, but the invented-text / legibility / drift problems are inherent to letting the
  model typeset. Rejected after they kept recurring.
- **Render text as native tldraw text shapes** instead of in the asset shape: directly
  user-editable, but tldraw's text styling can't honour arbitrary brand fonts or exact hex,
  and it blurs the boundary between the asset and the annotations drawn on it. Rejected for
  brand fidelity and conceptual clarity.
