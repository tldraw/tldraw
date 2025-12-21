---
title: PNG scale - raw notes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - png
  - scale
---

# PNG scale: raw notes

Internal research notes for the png-scale.md article.

## Core problem

When copying/pasting PNGs in web apps, browsers strip metadata for security (clipboard sanitization). This breaks display size for high-DPI exports where file resolution differs from intended display size.

**Specific issue in tldraw:**
- tldraw exports PNGs at 2x resolution (default pixelRatio = 2)
- A 100×100px shape on screen → 200×200px PNG file
- PNG contains pHYs chunk with display density metadata
- Browser clipboard strips pHYs chunk during paste
- Result: 200×200px image displays at 200×200px instead of 100×100px

## PNG file format structure

**8-byte signature:**
Located at `/packages/utils/src/lib/media/png.ts:110-124`
```typescript
// Signature bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
view.getUint8(offset + 0) === 0x89  // PNG magic number
view.getUint8(offset + 1) === 0x50  // 'P'
view.getUint8(offset + 2) === 0x4e  // 'N'
view.getUint8(offset + 3) === 0x47  // 'G'
view.getUint8(offset + 4) === 0x0d  // DOS line ending \r
view.getUint8(offset + 5) === 0x0a  // \n
view.getUint8(offset + 6) === 0x1a  // DOS EOF character
view.getUint8(offset + 7) === 0x0a  // \n
```

**Chunk structure:**
Each chunk follows this binary layout:
```
4 bytes: chunk data length (big-endian uint32)
4 bytes: chunk type (ASCII characters)
N bytes: chunk data (N = length value)
4 bytes: CRC32 checksum (covers type + data)
```

**Standard chunk types:**
- `IHDR` - Image header (dimensions, bit depth, color type)
- `pHYs` - Physical pixel dimensions (what we need to preserve)
- `IDAT` - Compressed image data
- `IEND` - End marker
- `tEXt` - Text metadata
- `eXIf` - EXIF data

**Chunk ordering requirement:**
PNG spec requires pHYs to come before IDAT (the image data).

## pHYs chunk specification

**9-byte data structure:**
```
Bytes 0-3: pixels per unit, X axis (big-endian int32)
Bytes 4-7: pixels per unit, Y axis (big-endian int32)
Byte 8:    unit specifier (0 = unknown, 1 = meters)
```

**Total chunk size: 21 bytes**
- 4 bytes: length (value = 9)
- 4 bytes: type ("pHYs")
- 9 bytes: data
- 4 bytes: CRC32 checksum

## DPI to pixels-per-meter conversion

**Constant definition:**
Located at `/packages/utils/src/lib/media/png.ts:324`
```typescript
const DPI_72 = 2835.5  // 72 DPI converted to pixels per meter
```

**Calculation:**
```
1 inch = 0.0254 meters
72 DPI = 72 dots per inch
pixels per meter = 72 / 0.0254 = 2834.645669... ≈ 2835.5
```

**For 2x DPI (144 DPI):**
```typescript
pHYsDataView.setInt32(8, DPI_72 * 2)   // X: 5671 pixels per meter
pHYsDataView.setInt32(12, DPI_72 * 2)  // Y: 5671 pixels per meter
pHYsDataView.setInt8(16, 1)             // unit = meters
```

## Writing pHYs chunk implementation

Located at `/packages/utils/src/lib/media/png.ts:299-337`

**Chunk creation:**
```typescript
const pHYsData = new ArrayBuffer(21)  // Total chunk size
const pHYsDataView = new DataView(pHYsData)

// Length field (9 bytes of data)
pHYsDataView.setUint32(0, 9)

// Type field "pHYs" as 4 ASCII bytes
pHYsDataView.setUint8(4, 'p'.charCodeAt(0))  // 0x70
pHYsDataView.setUint8(5, 'H'.charCodeAt(0))  // 0x48
pHYsDataView.setUint8(6, 'Y'.charCodeAt(0))  // 0x59
pHYsDataView.setUint8(7, 's'.charCodeAt(0))  // 0x73

// Data field (9 bytes)
const DPI_72 = 2835.5
pHYsDataView.setInt32(8, DPI_72 * dpr)   // pixels per unit X
pHYsDataView.setInt32(12, DPI_72 * dpr)  // pixels per unit Y
pHYsDataView.setInt8(16, 1)               // unit specifier (meters)

// CRC32 field (calculated over type + data)
const crcBit = new Uint8Array(pHYsData.slice(4, 17))  // bytes 4-16
pHYsDataView.setInt32(17, crc(crcBit))
```

**Insertion point logic:**
```typescript
// Priority: prefer IDAT position, fallback to existing pHYs or default offset
let offset = 46  // default: after IHDR chunk
let size = 0

const res1 = PngHelpers.findChunk(view, 'pHYs')
if (res1) {
    offset = res1.start
    size = res1.size  // will replace existing pHYs
}

const res2 = PngHelpers.findChunk(view, 'IDAT')
if (res2) {
    offset = res2.start  // insert before IDAT (preferred)
    size = 0  // insert, don't replace
}
```

**Binary splicing:**
```typescript
const startBuf = view.buffer.slice(0, offset)
const endBuf = view.buffer.slice(offset + size)
return new Blob([startBuf, pHYsData, endBuf], options)
```

## Reading pHYs chunk and calculating display size

Located at `/packages/utils/src/lib/media/media.ts:312-342`

**Detection and parsing:**
```typescript
if (blob.type === 'image/png') {
    const view = new DataView(await blob.arrayBuffer())
    if (PngHelpers.isPng(view, 0)) {
        const physChunk = PngHelpers.findChunk(view, 'pHYs')
        if (physChunk) {
            const physData = PngHelpers.parsePhys(view, physChunk.dataOffset)
            // physData = { ppux: number, ppuy: number, unit: number }
```

**Display size calculation:**
```typescript
if (physData.unit === 1 && physData.ppux === physData.ppuy) {
    // Calculate baseline pixels per meter
    // 72 DPI is standard display resolution
    const pixelsPerMeter = 72 / 0.0254  // = 2834.645669...

    // Calculate ratio of actual vs standard density
    const pixelRatio = Math.max(physData.ppux / pixelsPerMeter, 1)

    return {
        w: Math.round(w / pixelRatio),  // 200 / 2 = 100
        h: Math.round(h / pixelRatio),
    }
}
```

**Validation checks:**
- `unit === 1` ensures meters (not unknown units)
- `ppux === ppuy` ensures square pixels
- `Math.max(..., 1)` prevents division by smaller ratio (upscaling)

## CRC32 checksum implementation

Located at `/packages/utils/src/lib/media/png.ts:1-60`

**Algorithm:**
MIT licensed implementation from alexgorbatchev/crc
Uses standard CRC-32 lookup table (256 entries)

```typescript
const crc: CRCCalculator<Uint8Array> = (current, previous) => {
    let crc = previous === 0 ? 0 : ~~previous! ^ -1

    for (let index = 0; index < current.length; index++) {
        crc = TABLE[(crc ^ current[index]) & 0xff] ^ (crc >>> 8)
    }

    return crc ^ -1
}
```

**Usage for pHYs chunk:**
Checksum covers bytes 4-16 (type field + data field, excluding length and CRC itself)

## Custom MIME type workaround

Located at `/packages/tldraw/src/lib/utils/clipboard.ts:4-12`

**Custom MIME type definition:**
```typescript
export const TLDRAW_CUSTOM_PNG_MIME_TYPE = 'web image/vnd.tldraw+png' as const
```

**Why `web ` prefix works:**
- Chromium browsers (Chrome, Edge, Opera) support custom clipboard formats
- MIME types prefixed with `web ` bypass clipboard sanitization
- Unsanitized = metadata preserved
- Only works in Chromium (as of Nov 2024)
- Firefox and Safari don't support this

**Clipboard write logic:**
Located at `/packages/tldraw/src/lib/utils/export/copyAs.ts:34-53`

```typescript
const { blobPromise, mimeType } = exportToImagePromiseForClipboard(editor, ids, opts)

// Create types object with standard MIME type
const types: Record<string, Promise<Blob>> = { [mimeType]: blobPromise }

// Add custom MIME type if supported
const additionalMimeType = getAdditionalClipboardWriteType(opts.format)
if (additionalMimeType && doesClipboardSupportType(additionalMimeType)) {
    types[additionalMimeType] = blobPromise.then((blob) =>
        FileHelpers.rewriteMimeType(blob, additionalMimeType)
    )
}

return clipboardWrite(types)
```

**Result:** Same blob written twice with different MIME types:
1. `image/png` - standard, sanitized, works everywhere
2. `web image/vnd.tldraw+png` - custom, unsanitized, Chromium-only

**Clipboard read priority:**
Located at `/packages/tldraw/src/lib/ui/hooks/useClipboardEvents.ts:23-32`

```typescript
const expectedPasteFileMimeTypes = [
    TLDRAW_CUSTOM_PNG_MIME_TYPE,  // Check custom type first
    'image/png',                   // Fall back to standard
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
]
```

**Paste handling:**
Located at `/packages/tldraw/src/lib/ui/hooks/useClipboardEvents.ts:249-260`

```typescript
for (const type of expectedPasteFileMimeTypes) {
    if (item.types.includes(type)) {
        const blobPromise = item
            .getType(type)
            .then((blob) =>
                FileHelpers.rewriteMimeType(
                    blob,
                    getCanonicalClipboardReadType(type)
                )
            )
        // ...
        break  // Use first match (custom type preferred)
    }
}
```

**Canonical type mapping:**
Located at `/packages/tldraw/src/lib/utils/clipboard.ts:17-19`
```typescript
const canonicalClipboardReadTypes = {
    [TLDRAW_CUSTOM_PNG_MIME_TYPE]: 'image/png',  // Normalize back to standard
}
```

## PNG export with pHYs injection

Located at `/packages/editor/src/lib/exports/getSvgAsImage.ts:7-92`

**Default pixel ratio:**
```typescript
const { type, width, height, quality = 1, pixelRatio = 2 } = options
```

**Canvas rendering:**
```typescript
let [clampedWidth, clampedHeight] = clampToBrowserMaxCanvasSize(
    width * pixelRatio,   // 100 * 2 = 200
    height * pixelRatio   // 100 * 2 = 200
)
clampedWidth = Math.floor(clampedWidth)
clampedHeight = Math.floor(clampedHeight)
const effectiveScale = clampedWidth / width  // 200 / 100 = 2
```

**pHYs injection for PNG:**
```typescript
if (type === 'png') {
    const view = new DataView(await blob.arrayBuffer())
    return PngHelpers.setPhysChunk(view, effectiveScale, {
        type: 'image/' + type,
    })
} else {
    return blob  // JPEG and WebP don't support pHYs
}
```

## Chunk parsing implementation

Located at `/packages/utils/src/lib/media/png.ts:180-211`

**readChunks method:**
```typescript
static readChunks(view: DataView, offset = 0) {
    const chunks: Record<string, { dataOffset: number; size: number; start: number }> = {}

    if (!PngHelpers.isPng(view, offset)) {
        throw new Error('Not a PNG')
    }
    offset += 8  // Skip PNG signature

    while (offset <= view.buffer.byteLength) {
        const start = offset
        const len = view.getInt32(offset)
        offset += 4
        const chunkType = PngHelpers.getChunkType(view, offset)

        // Skip duplicate IDAT chunks (common for progressive loading)
        if (chunkType === 'IDAT' && chunks[chunkType]) {
            offset += len + LEN_SIZE + CRC_SIZE
            continue
        }

        // Stop at end marker
        if (chunkType === 'IEND') {
            break
        }

        chunks[chunkType] = {
            start,              // chunk start position
            dataOffset: offset + 4,  // data starts after type
            size: len,          // data size
        }
        offset += len + LEN_SIZE + CRC_SIZE  // Skip data and CRC
    }

    return chunks
}
```

**Constants:**
```typescript
const LEN_SIZE = 4   // Length field size
const CRC_SIZE = 4   // CRC field size
```

## Browser compatibility notes

**Custom MIME type support:**
- Chrome/Edge/Opera: ✅ Supports `web ` prefix (Nov 2024)
- Firefox: ❌ Does not support custom clipboard formats
- Safari: ❌ Does not support custom clipboard formats

**Fallback behavior:**
- Chromium browsers: pHYs preserved via custom MIME type
- Firefox/Safari: pHYs stripped, size calculation falls back to natural dimensions
- External paste (to other apps): Always uses standard format (sanitized)

**Safari-specific timing issue:**
Located at `/packages/editor/src/lib/exports/getSvgAsImage.ts:36-43`
```typescript
image.onload = async () => {
    // Safari fires onLoad before fonts load
    // No better solution than waiting
    // See https://bugs.webkit.org/show_bug.cgi?id=219770
    if (tlenv.isSafari) {
        await sleep(250)
    }
    // ... render to canvas
}
```

## Edge cases and validation

**Preventing upscaling:**
```typescript
const pixelRatio = Math.max(physData.ppux / pixelsPerMeter, 1)
```
If pHYs indicates lower density than 72 DPI, clamp to 1:1 (don't upscale).

**Handling missing pHYs:**
If no pHYs chunk found or parsing fails, use natural image dimensions (no scaling).

**Non-square pixels:**
```typescript
if (physData.unit === 1 && physData.ppux === physData.ppuy) {
```
Only apply scaling if X and Y densities match (square pixels). Skip if aspect ratio would be distorted.

**Invalid PNG:**
```typescript
if (!PngHelpers.isPng(view, offset)) {
    throw new Error('Not a PNG')
}
```
Validate signature before attempting to parse chunks.

**Chunk insertion safety:**
The implementation doesn't validate chunk ordering beyond preferring IDAT position. PNG viewers are generally tolerant of chunk order violations, but strictly speaking, pHYs should come before IDAT per spec.

## Alternative approaches considered

**DataView vs typed arrays:**
Code uses DataView for byte-level manipulation with explicit endianness control. Alternative would be Uint8Array with manual byte ordering.

**Canvas toBlob quality:**
```typescript
canvas.toBlob(callback, 'image/png', quality)
```
PNG ignores quality parameter (lossless format). Only relevant for JPEG/WebP.

**Safari timing workaround:**
Current approach uses fixed 250ms delay. More robust approach would poll for font loading, but no API exists for SVG-embedded fonts.

## Related file locations

**Core implementation:**
- `/packages/utils/src/lib/media/png.ts` - PNG chunk parsing and writing
- `/packages/utils/src/lib/media/media.ts` - Image size calculation with pHYs support

**Clipboard integration:**
- `/packages/tldraw/src/lib/utils/clipboard.ts` - Custom MIME type definitions
- `/packages/tldraw/src/lib/utils/export/copyAs.ts` - Copy operation with dual MIME types
- `/packages/tldraw/src/lib/ui/hooks/useClipboardEvents.ts` - Paste handling with priority order

**Export integration:**
- `/packages/editor/src/lib/exports/getSvgAsImage.ts` - PNG export with pHYs injection

## Test implications

No dedicated tests found for pHYs chunk manipulation. Potential test cases:
- Verify pHYs chunk creation with correct CRC32
- Validate insertion at correct position (before IDAT)
- Test display size calculation with various DPI values
- Confirm round-trip copy/paste preserves size in Chromium
- Verify fallback behavior in non-Chromium browsers

## Performance considerations

**Binary operations are fast:**
- DataView manipulation is native browser code
- No image re-encoding required
- Blob construction is cheap (references existing buffers)

**Clipboard API is synchronous-ish:**
Must create ClipboardItem synchronously in user gesture handler. Promise-based blob generation is OK, but ClipboardItem constructor call must be sync. See Safari bug: https://bugs.webkit.org/show_bug.cgi?id=222262

**Memory usage:**
- Creates new ArrayBuffer for pHYs chunk (21 bytes)
- Creates new Blob with three parts (startBuf, pHYsData, endBuf)
- Browser optimizes Blob storage (doesn't duplicate buffers)

## Security implications

**Why browsers sanitize:**
Clipboard sanitization prevents malicious metadata injection. Historical issues:
- Executable code embedded in image metadata
- Buffer overflow exploits in image parsers
- Privacy leaks via EXIF data (GPS coordinates, camera info)

**Why `web ` prefix is safe:**
- Only works for same-origin or explicitly allowed cross-origin contexts
- Browser maintains isolation between apps
- Custom formats don't pass through external applications
- Malicious app can't inject custom MIME type into victim's clipboard

**pHYs chunk safety:**
- Fixed 9-byte structure
- No variable-length strings or complex data
- CRC validation ensures integrity
- Standard PNG viewers already parse pHYs chunks safely

## PNG specification references

**PNG Specification (ISO/IEC 15948:2003):**
- Chunk structure: Section 5.3
- pHYs chunk: Section 11.3.5.3
- Chunk ordering: Section 5.6
- CRC calculation: Section 5.4

**pHYs chunk exact specification:**
- Chunk name: "pHYs" (0x70, 0x48, 0x59, 0x73)
- Must precede first IDAT chunk
- If unit = 1 (meters), gives actual physical size
- If unit = 0 (unknown), gives pixel aspect ratio only
- Many image viewers ignore pHYs if unit = 0
