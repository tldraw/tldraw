# Improve storytelling in a nugget

Read the nugget and improve its storytelling by fixing abrupt transitions. Go through each section and look for these patterns:

## 1. Bridge from problem to solution

Don't jump from "this is broken" to "here's our code." Show the reader the reasoning path between them. What options exist? Why do they fall short? What insight makes the chosen approach work?

**Before:**
> Instead of using CSS cursor keywords, we construct SVG graphics on the fly and embed them as data URIs in the cursor property.

**After:**
> The CSS `cursor` property does accept one escape hatch: the `url()` function. You can point it at a custom image. The obvious approach would be to pre-render cursor images at every angle—but that's hundreds of images, and you'd still be snapping to the nearest pre-rendered angle.
>
> SVG changes the equation. Because SVG is a text format, you can build it as a string, set the rotation to whatever angle you need, and generate a new cursor on the fly. And because browsers accept data URIs in `cursor: url(...)`, you can inline the whole thing—no files, no network requests, just a string in a style property.

## 2. Explain the "why" before the "how"

Before showing code or a technique, state the goal. What are we trying to achieve? What constraint are we working around? One sentence of motivation before the implementation makes the code feel inevitable rather than arbitrary.

**Before:**
> Bounding boxes are also used in viewport culling, where we skip rendering any shape whose bounds don't intersect the viewport:

**After:**
> An infinite canvas can hold thousands of shapes, but at any given zoom level only a handful are visible. Rendering all of them every frame would be wasteful. Bounding boxes give us a cheap way to skip the invisible ones—if a shape's bounding box doesn't overlap the viewport's bounding box, we don't render it:

## 3. Let the reader derive the insight

When there's a clever trick (XOR logic, counter-rotating shadows, matrix composition), walk the reader through the reasoning so they could almost figure it out themselves. The "aha" moment is more satisfying when earned.

**Before:**
> The flip logic uses XOR on the scale signs:

**After:**
> Think about which diagonal cursor to show: `nwse-resize` (↘↖) or `nesw-resize` (↗↙). Flipping on the X axis swaps left and right, turning one diagonal into the other. Flipping on the Y axis does the same. But flipping on *both* axes? That's a 180° rotation—the diagonal direction is unchanged. So the cursor should only switch when exactly one axis is flipped. That's an XOR:

## 4. Open sections with motivation, not description

Each section's first sentence should tell the reader *why they should care*, not just *what we do*. "We do X" is weaker than "We need X because Y."

**Before:**
> The cursor color adapts to the editor's theme:

**After:**
> A black cursor disappears on a dark canvas. The cursor SVGs already have both a white outline and a black fill for contrast, but the overall color needs to match the theme:

## 5. Name the goal when presenting a tradeoff

When the article describes a tradeoff or design choice, state what both sides of the tradeoff are. Don't just say "we accept the approximation" — say what the approximation costs and what it buys.

**Before:**
> Axis-aligned boxes are approximations. A rotated rectangle's AABB is always larger than the shape itself, which means we sometimes check shapes that weren't actually clicked or render shapes that aren't quite visible. But the speed we gain from simple min/max comparisons far outweighs the cost of those extra checks.

**After:**
> Every bounding box in this article is an approximation. A rotated rectangle's AABB is always larger than the shape itself—it has to be, since it's stretched to fit all four corners into an axis-aligned rectangle. That means we sometimes check shapes that weren't actually clicked, or render shapes that aren't quite visible at the edge of the viewport.
>
> That's a deliberate trade. The alternative—testing against exact shape geometry—requires the expensive math we avoided by using bounding boxes in the first place. The extra false positives are cheap to filter out in a second pass, and for the vast majority of spatial queries, the four-comparison AABB check is all we need.

## How to apply

1. Read the full nugget once to understand the narrative arc.
2. Go section by section. For each one, ask: "If I read just the first sentence after the heading, do I know *why* this section exists?"
3. If a section opens with code or "we do X," add 1-2 sentences of motivation before it.
4. If a section jumps from a problem to a solution, check whether the reader can follow the reasoning. Add the missing logical steps.
5. Don't over-explain. One or two bridging sentences is usually enough. The goal is to remove *gaps* in the reasoning, not to pad the text.
6. Preserve the author's voice and existing good storytelling. Only touch the transitions that feel abrupt.
