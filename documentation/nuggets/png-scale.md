# PNG scale metadata and clipboard limitations

Here's a fun one. When you copy a shape as PNG in tldraw and paste it back, it should appear at the same size. Sounds simple, right? Browsers have other ideas.

## The setup

We export PNGs at 2x resolution so they look crisp on retina displays. A 100×100 shape becomes a 200×200 pixel image. But we don't want it to *display* at 200×200—we want it at 100×100, just with more pixels packed in.

PNG has a solution for this: the `pHYs` chunk. It's a little piece of metadata that tells image viewers "hey, this image has X pixels per meter, so display it at this size." We write this chunk into our exported PNGs, and everything works great.

Until you try to copy and paste.

## The browser problem

Browsers sanitize clipboard data. This makes sense from a security perspective—you don't want malicious metadata sneaking through when someone pastes an image. But the browser doesn't distinguish between "malicious metadata" and "useful metadata." It strips everything, including our `pHYs` chunk.

The result: you copy a 100×100 shape, paste it back, and now it's 200×200. Not great.

## A quick detour into PNG internals

PNG files are built from chunks. Each chunk has a type (like `IHDR` for header, `IDAT` for image data, `pHYs` for physical dimensions), a length, some data, and a CRC checksum.

The `pHYs` chunk is tiny—just 9 bytes of actual data:

- 4 bytes: pixels per unit, X axis
- 4 bytes: pixels per unit, Y axis
- 1 byte: unit type (1 means meters)

For a 2x image at the standard 72 DPI baseline, the math works out to about 5670 pixels per meter (that's `72 / 0.0254 * 2`). When we read an image, we check for this chunk and divide the pixel dimensions accordingly:

```typescript
const pixelsPerMeter = 72 / 0.0254
const pixelRatio = Math.max(physData.ppux / pixelsPerMeter, 1)
return {
	w: Math.round(w / pixelRatio),
	h: Math.round(h / pixelRatio),
}
```

Writing the chunk is trickier because we have to calculate the CRC ourselves, find the right spot in the binary (before `IDAT`), and splice it in. `PngHelpers.setPhysChunk` handles all of this.

## The workaround

Here's where it gets interesting. Chromium browsers have this feature where clipboard formats starting with `web ` bypass sanitization. It's meant for web apps that need to pass custom data through the clipboard without the browser messing with it.

So we write the PNG twice:

1. As `image/png` (the normal way, for pasting into other apps)
2. As `web image/vnd.tldraw+png` (our custom format, unsanitized)

```typescript
export const TLDRAW_CUSTOM_PNG_MIME_TYPE = 'web image/vnd.tldraw+png'
```

When pasting, we check for our custom format first. If it's there, we get the image with the `pHYs` chunk intact. If not (older browser, pasting from another app), we fall back to the standard `image/png`.

```typescript
const expectedPasteFileMimeTypes = [
	TLDRAW_CUSTOM_PNG_MIME_TYPE, // Prefer unsanitized version
	'image/png', // Fallback
	'image/jpeg',
	'image/webp',
	'image/svg+xml',
]
```

It's a bit of a hack, but it works. Copy a shape, paste it back, same size. The way it should be.

## Sources

- `packages/utils/src/lib/media/png.ts` — PNG chunk parsing and writing
- `packages/utils/src/lib/media/media.ts` — Image size calculation with pHYs support
- `packages/tldraw/src/lib/utils/clipboard.ts` — Custom MIME type definitions
- `packages/tldraw/src/lib/ui/hooks/useClipboardEvents.ts` — Clipboard paste handling
- `packages/editor/src/lib/exports/getSvgAsImage.ts` — PNG export with pHYs injection
