const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const PIXELS_PER_METER = 2834.5

/**
 * Returns a data view for a PNG image.
 * @param arrayBuffer - The ArrayBuffer containing the PNG image.
 * @returns A DataView for the PNG image, or null if the image is not a PNG.
 */

export function getPngDataView(arrayBuffer: ArrayBuffer): DataView | null {
	const dataView = new DataView(arrayBuffer)

	for (let i = 0; i < PNG_SIGNATURE.length; i++) {
		if (dataView.getUint8(i) !== PNG_SIGNATURE[i]) {
			return null
		}
	}

	return dataView
}

/**
 * Get the pixel ratio of a PNG data from its pHYs data.
 *
 * @param dataView - A dataview created from the image's array buffer.
 * @returns The pixel ratio.
 */
export function getPngPixelRatio(dataView: DataView): number {
	let offset = 8 // Start after PNG signature

	while (offset < dataView.byteLength) {
		if (
			dataView.getUint8(offset + 4) === 0x70 &&
			dataView.getUint8(offset + 5) === 0x48 &&
			dataView.getUint8(offset + 6) === 0x59 &&
			dataView.getUint8(offset + 7) === 0x73
		) {
			return Math.ceil(dataView.getUint32(offset + 8) / PIXELS_PER_METER)
		}

		offset = offset + 8 + dataView.getUint32(offset) + 4 // Move to next chunk (4 bytes for CRC)
	}

	return 1 // Didn't find a pixel ratio, so return default (1)
}
