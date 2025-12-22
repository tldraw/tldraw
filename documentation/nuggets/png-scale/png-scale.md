---
title: Browsers destroy your PNG metadata
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - png
  - scale
  - browser
status: published
date: 12/21/2025
order: 4
---

# Browsers destroy your PNG metadata

Copy an image to your clipboard, then paste it back into your web app. It's larger than it should be, or the color profile is wrong, or your carefully embedded metadata has vanished. Welcome to clipboard sanitization.

Browsers strip metadata from images on the clipboard for security reasons. This breaks any app that needs to preserve display size, color information, or custom data. The PNG format includes chunks for all this information, but the browser throws them away during paste. We needed a workaround.

## The specific problem

tldraw exports PNGs at 2x resolution for sharp rendering on high-DPI displays. A shape that appears 100×100 pixels on screen becomes a 200×200 pixel image file. To display correctly when pasted back, the PNG needs to tell the browser "render me at half size."

PNG files store this in a metadata chunk called `pHYs` (physical pixel dimensions). It specifies pixels per meter, which viewers use to calculate the intended display dimensions:

```typescript
// A shape is 100×100 on screen but rendered to 200×200 pixels
// Write pHYs chunk: 5670 pixels per meter (2x the baseline 72 DPI)
// When pasted: browser should divide 200×200 by 2 = 100×100 display size
```

But clipboard sanitization strips the `pHYs` chunk. Your 100×100 shape comes back as 200×200.

## PNG chunks are simple containers

Most developers know PNGs have a header and compressed image data. Fewer know that PNGs are actually a container format composed of typed chunks. After the 8-byte signature, you get a series of chunks like:

- `IHDR` - Image dimensions, bit depth, color type
- `pHYs` - Physical pixel dimensions (what we need)
- `IDAT` - The actual compressed image data
- `IEND` - End marker

Each chunk has a simple structure: a 4-byte length, 4-byte type identifier, the data itself, and a 4-byte CRC32 checksum. The PNG spec requires chunks in a specific order, so `pHYs` must come before `IDAT` (the image data).

The `pHYs` chunk is just 9 bytes of data:

```
4 bytes: pixels per unit, X axis
4 bytes: pixels per unit, Y axis
1 byte:  unit specifier (0 = unknown, 1 = meters)
```

For a 2x resolution image, we write 5670 pixels per meter (72 DPI × 2 = 144 DPI, converted to metric):

```typescript
// packages/utils/src/lib/media/png.ts
const DPI_72 = 2835.5 // 72 DPI in pixels per meter
pHYsDataView.setInt32(8, DPI_72 * 2) // X resolution
pHYsDataView.setInt32(12, DPI_72 * 2) // Y resolution
pHYsDataView.setInt8(16, 1) // unit = meters
```

When loading a PNG, we check for this chunk and adjust the display size:

```typescript
// packages/utils/src/lib/media/media.ts
const pixelsPerMeter = 72 / 0.0254 // baseline
const pixelRatio = Math.max(physData.ppux / pixelsPerMeter, 1)
return {
	w: Math.round(w / pixelRatio), // 200px / 2 = 100px display
	h: Math.round(h / pixelRatio),
}
```

This works everywhere except the clipboard.

## Writing PNG chunks is binary surgery

You can't just append metadata to a PNG. The implementation builds a complete chunk with all the required fields:

```typescript
// packages/utils/src/lib/media/png.ts
const pHYsData = new ArrayBuffer(21) // Total chunk size
const pHYsDataView = new DataView(pHYsData)

pHYsDataView.setUint32(0, 9) // data length (9 bytes)

// Write "pHYs" as 4 bytes
pHYsDataView.setUint8(4, 'p'.charCodeAt(0))
pHYsDataView.setUint8(5, 'H'.charCodeAt(0))
pHYsDataView.setUint8(6, 'Y'.charCodeAt(0))
pHYsDataView.setUint8(7, 's'.charCodeAt(0))

const DPI_72 = 2835.5
pHYsDataView.setInt32(8, DPI_72 * dpr) // X resolution
pHYsDataView.setInt32(12, DPI_72 * dpr) // Y resolution
pHYsDataView.setInt8(16, 1) // unit = meters

// Calculate CRC32 over type + data
const crcBit = new Uint8Array(pHYsData.slice(4, 17))
pHYsDataView.setInt32(17, crc(crcBit))
```

Then we find the right insertion point (preferring the `IDAT` chunk position) and splice the new chunk into the PNG:

```typescript
// Find where to insert (before IDAT if possible)
const idatChunk = PngHelpers.findChunk(view, 'IDAT')
const offset = idatChunk ? idatChunk.start : fallbackOffset

// Splice into the PNG
const startBuf = view.buffer.slice(0, offset)
const endBuf = view.buffer.slice(offset + existingChunkSize)
return new Blob([startBuf, pHYsData, endBuf], options)
```

This level of binary manipulation is unusual in web development, but it's the only way to modify PNG metadata without re-encoding the entire image.

## Custom MIME types bypass sanitization

Standard clipboard formats get sanitized. But Chromium browsers (Chrome, Edge, Opera) support custom MIME types prefixed with `web ` that bypass the sanitizer. This is an obscure feature, but exactly what we need.

```typescript
// packages/tldraw/src/lib/utils/clipboard.ts
export const TLDRAW_CUSTOM_PNG_MIME_TYPE = 'web image/vnd.tldraw+png'
```

The workaround writes two versions to the clipboard:

**On copy:**

1. Write the PNG as `image/png` - sanitized, but works everywhere
2. Also write the same PNG as `web image/vnd.tldraw+png` - unsanitized, preserves metadata

**On paste:**

1. Check for `web image/vnd.tldraw+png` first - has intact `pHYs` chunk
2. Fall back to standard `image/png` if unavailable

```typescript
// On copy - write both formats
await navigator.clipboard.write([
	new ClipboardItem({
		'image/png': pngBlob,
		'web image/vnd.tldraw+png': pngBlob, // Same blob, different MIME type
	}),
])

// On paste - prefer unsanitized version
const items = await navigator.clipboard.read()
for (const item of items) {
	if (item.types.includes('web image/vnd.tldraw+png')) {
		// Use unsanitized version with metadata intact
	} else if (item.types.includes('image/png')) {
		// Fall back to standard version
	}
}
```

When you copy and paste within tldraw on Chrome, the custom MIME type preserves the scale. On Firefox or Safari, or when pasting into other apps, the standard format works but loses the metadata.

## Why this matters beyond tldraw

Clipboard sanitization affects any web app working with images:

- Design tools exporting high-DPI screenshots
- Image editors preserving color profiles
- Screenshot tools embedding custom metadata
- Canvas apps maintaining exact dimensions

The `web ` prefix trick is broadly applicable. You can use it for any custom data you need to preserve across copy/paste:

```typescript
// Write custom format alongside standard one
await navigator.clipboard.write([
	new ClipboardItem({
		'image/png': standardBlob,
		'web image/yourapp+png': unsanitizedBlob,
	}),
])

// Check for custom format on paste
const items = await navigator.clipboard.read()
for (const item of items) {
	if (item.types.includes('web image/yourapp+png')) {
		// Use unsanitized version with metadata intact
	} else if (item.types.includes('image/png')) {
		// Fall back to standard version
	}
}
```

The tradeoff is that it only works in Chromium browsers. For Firefox and Safari, you need fallback handling. But for apps where precision matters and the majority of users are on Chrome, it's worth implementing.

PNG chunk manipulation is also useful outside the clipboard. You can read and write `pHYs`, `tEXt` (text metadata), `eXIf` (EXIF data), or custom chunks without re-encoding the image. The binary format is well-documented and stable.

## Key files

- `packages/utils/src/lib/media/png.ts` - PNG chunk parsing and writing
- `packages/utils/src/lib/media/media.ts` - Image size calculation with pHYs support
- `packages/tldraw/src/lib/utils/clipboard.ts` - Custom MIME type definitions
- `packages/editor/src/lib/exports/getSvgAsImage.ts` - PNG export with pHYs injection
