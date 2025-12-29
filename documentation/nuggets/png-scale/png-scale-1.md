---
title: PNG scale preservation
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - PNG
  - clipboard
  - pHYs
status: published
date: 12/21/2025
order: 0
---

# PNG scale preservation

When we added copy-paste for images in tldraw, we ran into an unexpected problem. We export PNGs at 2x resolution for sharp display on high-DPI screens—a 100×100px shape becomes a 200×200px PNG file. The file includes metadata indicating it should display at 100×100px, but when you paste the image back into tldraw, it shows up at 200×200px instead.

The culprit is clipboard sanitization. Browsers strip metadata from images for security reasons, and that metadata is exactly what tells them the intended display size.

## The pHYs chunk

PNG files store display density information in a chunk called `pHYs` (physical pixel dimensions). This 9-byte structure specifies how many pixels per meter the image contains:

```
Bytes 0-3: pixels per unit, X axis (big-endian int32)
Bytes 4-7: pixels per unit, Y axis (big-endian int32)
Byte 8:    unit specifier (0 = unknown, 1 = meters)
```

When we export at 2x resolution, we write a pHYs chunk indicating 144 DPI (double the standard 72 DPI):

```typescript
const DPI_72 = 2835.5 // 72 DPI in pixels per meter (72 / 0.0254)
const pixelRatio = 2

pHYsDataView.setInt32(8, DPI_72 * pixelRatio) // X: 5671 pixels per meter
pHYsDataView.setInt32(12, DPI_72 * pixelRatio) // Y: 5671 pixels per meter
pHYsDataView.setInt8(16, 1) // unit = meters
```

A PNG reader that respects this metadata sees a 200×200px image that should display at 100×100px. The problem is that most PNG readers—including browsers—never see this metadata after it goes through the clipboard.

## Clipboard sanitization

When you copy an image to the clipboard in a web browser, the browser sanitizes it before storing. This strips potentially dangerous metadata like EXIF data (which can contain GPS coordinates, camera info, and executable code). The pHYs chunk gets stripped too, even though it's harmless.

The result: a 200×200px image with no indication it should display smaller. When you paste it, the browser treats it as 200×200px.

## Custom MIME types

Chromium browsers have a workaround. MIME types prefixed with `web ` bypass clipboard sanitization. We can write the same PNG blob twice with different MIME types:

```typescript
const types: Record<string, Promise<Blob>> = {
	'image/png': blobPromise, // Standard, sanitized
	'web image/vnd.tldraw+png': blobPromise, // Custom, unsanitized
}

await clipboardWrite(types)
```

The standard type works everywhere but loses metadata. The custom type preserves metadata but only works in Chromium. When pasting, we check for the custom type first:

```typescript
const expectedPasteFileMimeTypes = [
	'web image/vnd.tldraw+png', // Check custom type first
	'image/png', // Fall back to standard
	'image/jpeg',
	'image/webp',
	'image/svg+xml',
]
```

If the custom type is available (Chromium), we get the unsanitized blob with pHYs intact. Otherwise, we get the standard blob without it.

## Reading pHYs and calculating display size

When we receive a PNG blob, we check for a pHYs chunk and use it to calculate the intended display size:

```typescript
if (blob.type === 'image/png') {
	const view = new DataView(await blob.arrayBuffer())
	if (PngHelpers.isPng(view, 0)) {
		const physChunk = PngHelpers.findChunk(view, 'pHYs')
		if (physChunk) {
			const physData = PngHelpers.parsePhys(view, physChunk.dataOffset)

			if (physData.unit === 1 && physData.ppux === physData.ppuy) {
				const pixelsPerMeter = 72 / 0.0254 // Standard display density
				const pixelRatio = Math.max(physData.ppux / pixelsPerMeter, 1)

				return {
					w: Math.round(naturalWidth / pixelRatio),
					h: Math.round(naturalHeight / pixelRatio),
				}
			}
		}
	}
}
```

For a 200×200px image with pHYs indicating 144 DPI, we calculate `pixelRatio = 2` and return `100×100px` as the display size.

## Writing pHYs chunks

PNG files are organized as a series of chunks, each with a length, type, data, and CRC32 checksum. The pHYs chunk must appear before the IDAT chunk (the actual image data).

When we export a PNG, we insert or replace the pHYs chunk:

```typescript
// Create the 21-byte pHYs chunk
const pHYsData = new ArrayBuffer(21)
const pHYsDataView = new DataView(pHYsData)

// Length field: 9 bytes of data
pHYsDataView.setUint32(0, 9)

// Type field: "pHYs"
pHYsDataView.setUint8(4, 'p'.charCodeAt(0))
pHYsDataView.setUint8(5, 'H'.charCodeAt(0))
pHYsDataView.setUint8(6, 'Y'.charCodeAt(0))
pHYsDataView.setUint8(7, 's'.charCodeAt(0))

// Data field: pixels per meter for X and Y, unit specifier
pHYsDataView.setInt32(8, DPI_72 * effectiveScale)
pHYsDataView.setInt32(12, DPI_72 * effectiveScale)
pHYsDataView.setInt8(16, 1)

// CRC32 checksum (covers type + data)
const crcBit = new Uint8Array(pHYsData.slice(4, 17))
pHYsDataView.setInt32(17, crc(crcBit))
```

We find the IDAT chunk position (or the existing pHYs chunk if present) and splice the new chunk into the binary data:

```typescript
let offset = 46 // Default: after IHDR chunk
let size = 0

const existingPHYs = PngHelpers.findChunk(view, 'pHYs')
if (existingPHYs) {
	offset = existingPHYs.start
	size = existingPHYs.size // Replace existing
}

const idatChunk = PngHelpers.findChunk(view, 'IDAT')
if (idatChunk) {
	offset = idatChunk.start // Insert before IDAT (preferred)
	size = 0
}

const startBuf = view.buffer.slice(0, offset)
const endBuf = view.buffer.slice(offset + size)
return new Blob([startBuf, pHYsData, endBuf], { type: 'image/png' })
```

This creates a new PNG blob with the pHYs chunk in the correct position.

## Browser compatibility

This approach works fully in Chromium browsers (Chrome, Edge, Opera) as of November 2024. Firefox and Safari don't support custom clipboard formats, so copy-paste between tldraw instances loses pHYs metadata in those browsers. The image still pastes correctly—it just displays at its file resolution rather than its intended display size.

External paste (into other applications) always uses the standard `image/png` type, which has been sanitized. This is the right behavior—other apps don't know about our custom MIME type and wouldn't respect it anyway.

## Why this matters

Without pHYs preservation, high-DPI exports create a scaling problem. You copy a 100×100px shape, paste it, and get a 200×200px shape. Repeated copy-paste operations double the size each time, which breaks workflows that involve moving content between canvases.

The custom MIME type approach gives us correct behavior in Chromium while gracefully degrading in other browsers. It's not perfect, but it's better than having copy-paste silently corrupt your document.

## Related files

- `/packages/utils/src/lib/media/png.ts` - PNG chunk parsing and writing
- `/packages/utils/src/lib/media/media.ts` - Image size calculation with pHYs support
- `/packages/tldraw/src/lib/utils/clipboard.ts` - Custom MIME type definitions
- `/packages/tldraw/src/lib/utils/export/copyAs.ts` - Copy operation with dual MIME types
- `/packages/tldraw/src/lib/ui/hooks/useClipboardEvents.ts` - Paste handling with priority order
- `/packages/editor/src/lib/exports/getSvgAsImage.ts` - PNG export with pHYs injection
