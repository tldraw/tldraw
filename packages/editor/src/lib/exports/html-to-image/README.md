# html-to-image

The code in this folder has been very roughly adapted from html-to-image:
https://github.com/bubkoo/html-to-image

html-to-images works over several passes to produce a clone of a given DOM node with any external
resources embedded. It then takes that clone, and embeds it (in with `<foreignObject>`) and the
external resources in an SVG.

We start with our existing SVG export generation, which includes `<foreignObject>`s for all shapes
without a `toSvg` method. Then, in a single pass, we embed any relevant CSS and external resources.
We also skip certain things that html-to-image does that aren't as relevant to us, like supporting
same-origin iframes.

Whilst the code here takes inspiration from html-to-image and in some cases is pretty closely
adapted (as in `clonePseudos.ts`), most is written from scratch.
