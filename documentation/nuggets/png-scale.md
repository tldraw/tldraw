# PNG scale metadata and clipboard limitations

When you copy a shape as PNG in tldraw and paste it back, it should appear at the same size. This sounds simple, but browsers actively work against us. Here's how we solved it.

## The problem

tldraw exports PNGs at 2x resolution for crisp rendering on retina displays. A 100×100 shape becomes a 200×200 pixel image, but should still display at 100×100. PNG files store this information in a metadata chunk called `pHYs` (physical pixel dimensions), which tells image viewers the intended display size.

The problem: browsers sanitize clipboard data for security reasons. When you paste an image, the browser strips metadata—including our carefully written `pHYs` chunk. The result? Your 100×100 shape comes back as a 200×200 image.

## How PNG resolution metadata works

PNG files are structured as a series of chunks. The `pHYs` chunk contains:

- **ppux**: pixels per unit on the X axis
- **ppuy**: pixels per unit on the Y axis
- **unit**: the unit type (1 = meters)

For a 2x retina image at 72 DPI baseline:

```
pixels per meter = 72 DPI / 0.0254 meters per inch ≈ 2835
2x resolution = 2835 × 2 = 5670 pixels per meter
```

When reading a PNG, we parse this chunk and divide the pixel dimensions by the ratio to get the display size:

```typescript
// packages/utils/src/lib/media/media.ts
const pixelsPerMeter = 72 / 0.0254
const pixelRatio = Math.max(physData.ppux / pixelsPerMeter, 1)
return {
	w: Math.round(w / pixelRatio),
	h: Math.round(h / pixelRatio),
}
```

## Writing the pHYs chunk

We can't just append metadata—PNG chunks have a specific binary format with CRC checksums. The `PngHelpers.setPhysChunk` method in `packages/utils/src/lib/media/png.ts` handles this:

1. Find the position to insert (before the `IDAT` chunk, or replace existing `pHYs`)
2. Build a 21-byte chunk: 4 bytes length + 4 bytes type + 9 bytes data + 4 bytes CRC
3. Calculate the CRC32 checksum
4. Splice the chunk into the binary data

```typescript
const DPI_72 = 2835.5 // pixels per meter at 72 DPI

pHYsDataView.setInt32(8, DPI_72 * dpr) // X resolution
pHYsDataView.setInt32(12, DPI_72 * dpr) // Y resolution
pHYsDataView.setInt8(16, 1) // unit = meters
```

## The clipboard workaround

Browsers won't preserve our metadata in standard clipboard formats. But Chromium-based browsers support custom clipboard formats prefixed with `web ` that bypass sanitization.

Our solution writes two versions of the PNG:

```typescript
// packages/tldraw/src/lib/utils/clipboard.ts
export const TLDRAW_CUSTOM_PNG_MIME_TYPE = 'web image/vnd.tldraw+png'
```

**On copy:**

- Write the PNG as `image/png` (for compatibility with other apps)
- Also write it as `web image/vnd.tldraw+png` (unsanitized, preserves metadata)

**On paste:**

- Try `web image/vnd.tldraw+png` first (has correct scale metadata)
- Fall back to `image/png` if unavailable

```typescript
// packages/tldraw/src/lib/ui/hooks/useClipboardEvents.ts
const expectedPasteFileMimeTypes = [
	TLDRAW_CUSTOM_PNG_MIME_TYPE, // Prefer unsanitized version
	'image/png', // Fallback
	'image/jpeg',
	'image/webp',
	'image/svg+xml',
]
```

## The result

When copying and pasting within tldraw on Chromium browsers, images maintain their intended display size despite being rendered at 2x resolution. On other browsers or when pasting from external sources, the standard `image/png` format works but may lose scale information.

## Key files

- `packages/utils/src/lib/media/png.ts` - PNG chunk parsing and writing
- `packages/utils/src/lib/media/media.ts` - Image size calculation with pHYs support
- `packages/tldraw/src/lib/utils/clipboard.ts` - Custom MIME type definitions
- `packages/tldraw/src/lib/ui/hooks/useClipboardEvents.ts` - Clipboard paste handling
- `packages/editor/src/lib/exports/getSvgAsImage.ts` - PNG export with pHYs injection
