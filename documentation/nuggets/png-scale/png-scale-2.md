---
title: PNG scale preservation
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - PNG
  - clipboard
  - pHYs
---

# PNG scale preservation

When we added high-DPI PNG export to tldraw, we hit a problem. A 100×100px shape exported at 2× resolution becomes a 200×200px image file. That's correct—more pixels means sharper output. But when you paste that image back into the canvas, browsers display it at 200×200px instead of 100×100px. The scale metadata gets stripped during clipboard sanitization.

The solution involves writing and reading a specific PNG chunk called pHYs that stores physical pixel dimensions. Here's how that works.

## The pHYs chunk structure

PNG files are organized as a sequence of chunks. Each chunk has a fixed structure:

```
4 bytes: length (big-endian uint32)
4 bytes: type (ASCII characters)
N bytes: data (where N = length)
4 bytes: CRC32 checksum
```

The pHYs chunk ("physical pixel dimensions") has exactly 9 bytes of data:

```
Bytes 0-3: pixels per unit, X axis (big-endian int32)
Bytes 4-7: pixels per unit, Y axis (big-endian int32)
Byte 8:    unit specifier (0 = unknown, 1 = meters)
```

Total chunk size: 21 bytes (4 + 4 + 9 + 4).

## DPI conversion

We use 72 DPI as the baseline display resolution. To convert dots per inch to pixels per meter:

```typescript
1 inch = 0.0254 meters
72 DPI = 72 dots per inch
pixels per meter = 72 / 0.0254 = 2834.645... ≈ 2835.5
```

For a 2× export (144 DPI), we store `2835.5 * 2 = 5671` pixels per meter.

## Writing the chunk

Creating a pHYs chunk means building those 21 bytes:

```typescript
const pHYsData = new ArrayBuffer(21)
const pHYsDataView = new DataView(pHYsData)

// Length field: 9 bytes of data
pHYsDataView.setUint32(0, 9)

// Type field: "pHYs" as ASCII
pHYsDataView.setUint8(4, 'p'.charCodeAt(0))  // 0x70
pHYsDataView.setUint8(5, 'H'.charCodeAt(0))  // 0x48
pHYsDataView.setUint8(6, 'Y'.charCodeAt(0))  // 0x59
pHYsDataView.setUint8(7, 's'.charCodeAt(0))  // 0x73

// Data field: pixels per meter
const DPI_72 = 2835.5
pHYsDataView.setInt32(8, DPI_72 * pixelRatio)   // X
pHYsDataView.setInt32(12, DPI_72 * pixelRatio)  // Y
pHYsDataView.setInt8(16, 1)                     // unit = meters

// CRC32 checksum over bytes 4-16 (type + data)
const crcBit = new Uint8Array(pHYsData.slice(4, 17))
pHYsDataView.setInt32(17, crc(crcBit))
```

The CRC32 checksum covers the type field and data field, but not the length or the checksum itself. This ensures the chunk hasn't been corrupted.

## Insertion point

The PNG specification requires pHYs to come before IDAT (the chunk containing actual image data). When we inject a pHYs chunk into an existing PNG, we find the IDAT chunk and insert right before it:

```typescript
let offset = 46  // default: after IHDR
let size = 0

const existingPhys = findChunk(view, 'pHYs')
if (existingPhys) {
    offset = existingPhys.start
    size = existingPhys.size  // replace existing pHYs
}

const idatChunk = findChunk(view, 'IDAT')
if (idatChunk) {
    offset = idatChunk.start  // insert before IDAT (preferred)
    size = 0
}

// Splice the PNG: before | pHYs chunk | after
const startBuf = view.buffer.slice(0, offset)
const endBuf = view.buffer.slice(offset + size)
return new Blob([startBuf, pHYsData, endBuf])
```

If a pHYs chunk already exists, we replace it. If not, we insert a new one. Either way, the chunk must land before IDAT.

## Reading and scaling

When we paste a PNG, we parse the pHYs chunk to determine display size:

```typescript
const physChunk = findChunk(view, 'pHYs')
if (physChunk) {
    const physData = parsePhys(view, physChunk.dataOffset)

    // Only scale if using meters and pixels are square
    if (physData.unit === 1 && physData.ppux === physData.ppuy) {
        const pixelsPerMeter = 72 / 0.0254  // baseline
        const pixelRatio = Math.max(physData.ppux / pixelsPerMeter, 1)

        return {
            w: Math.round(width / pixelRatio),   // 200 / 2 = 100
            h: Math.round(height / pixelRatio),
        }
    }
}
```

The `Math.max(..., 1)` prevents upscaling if the pHYs indicates lower than 72 DPI. We only downscale, never upscale.

## Clipboard sanitization workaround

Browsers strip pHYs chunks from clipboard data for security reasons. We work around this in Chromium browsers using a custom MIME type:

```typescript
const TLDRAW_CUSTOM_PNG_MIME_TYPE = 'web image/vnd.tldraw+png'
```

MIME types prefixed with `web ` bypass clipboard sanitization in Chrome, Edge, and Opera. When copying, we write the same PNG blob twice—once as `image/png` (standard, sanitized) and once as `web image/vnd.tldraw+png` (custom, unsanitized). When pasting, we check for the custom type first:

```typescript
const expectedTypes = [
    TLDRAW_CUSTOM_PNG_MIME_TYPE,  // check custom type first
    'image/png',                   // fall back to standard
    // ...
]

for (const type of expectedTypes) {
    if (item.types.includes(type)) {
        const blob = await item.getType(type)
        // normalize back to image/png
        break
    }
}
```

In Chromium, we get the unsanitized version with pHYs intact. In Firefox and Safari, we fall back to the sanitized version and rely on natural image dimensions.

## Binary layout

The complete pHYs chunk looks like this in memory:

```
[0-3]   0x00 0x00 0x00 0x09          Length: 9
[4-7]   0x70 0x48 0x59 0x73          Type: "pHYs"
[8-11]  0x00 0x00 0x16 0x27          ppuX: 5671 (for 2x)
[12-15] 0x00 0x00 0x16 0x27          ppuY: 5671
[16]    0x01                         Unit: meters
[17-20] (CRC32 checksum)
```

Everything is big-endian. The checksum is calculated over bytes 4-16 using the standard CRC-32 algorithm.

## Where this lives

The implementation is split across three files:

- `/packages/utils/src/lib/media/png.ts` — PNG chunk parsing, writing, and CRC32 calculation
- `/packages/utils/src/lib/media/media.ts` — Image size calculation with pHYs support
- `/packages/tldraw/src/lib/utils/clipboard.ts` — Custom MIME type definitions and clipboard handling

The approach works well. The binary manipulation is fast (native DataView operations), and the Chromium workaround means most users get correct scaling. For Firefox and Safari users, images paste at natural dimensions—not perfect, but acceptable until browsers support custom clipboard formats.
