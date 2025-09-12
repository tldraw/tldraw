/*!
 * MIT License: https://github.com/sindresorhus/is-webp/blob/main/license
 * Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
 */

/**
 * Checks if buffer contains WebP image by examining the file signature.
 * WebP files have the signature "WEBP" starting at byte 8.
 *
 * @param buffer - The ArrayBuffer containing the image data to check
 * @returns True if the buffer contains a WebP image, false otherwise
 * @example
 * ```ts
 * // Check if uploaded file is WebP format
 * const file = event.target.files[0]
 * const buffer = await file.arrayBuffer()
 * if (isWebP(buffer)) {
 *   console.log('File is WebP format')
 * }
 * ```
 * @public
 */
export function isWebP(buffer: ArrayBuffer): boolean {
	const view = new Uint8Array(buffer)
	if (!view || view.length < 12) {
		return false
	}

	return view[8] === 87 && view[9] === 69 && view[10] === 66 && view[11] === 80
}

/**
 * Determines whether a WebP image file contains animation data by checking the animation flag in the WebP VP8X chunk.
 *
 * @param buffer - The ArrayBuffer containing the WebP image data
 * @returns True if the WebP image is animated, false otherwise
 * @example
 * ```ts
 * // Check if a WebP file from user input is animated
 * const file = new File([...], 'image.webp', { type: 'image/webp' })
 * const buffer = await file.arrayBuffer()
 * const animated = isWebpAnimated(buffer)
 * console.log(animated ? 'Animated WebP' : 'Static WebP')
 * ```
 * @public
 */
export function isWebpAnimated(buffer: ArrayBuffer) {
	if (!isWebP(buffer)) {
		return false
	}

	const view = new Uint8Array(buffer)

	if (!view || view.length < 21) {
		return false
	}

	return ((view[20] >> 1) & 1) === 1
}
