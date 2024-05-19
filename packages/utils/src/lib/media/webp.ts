/*!
 * MIT License: https://github.com/sindresorhus/is-webp/blob/main/license
 * Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
 */
function isWebp(view: Uint8Array) {
	if (!view || view.length < 12) {
		return false
	}

	return view[8] === 87 && view[9] === 69 && view[10] === 66 && view[11] === 80
}

export function isWebpAnimated(buffer: ArrayBuffer) {
	const view = new Uint8Array(buffer)

	if (!isWebp(view)) {
		return false
	}

	if (!view || view.length < 21) {
		return false
	}

	return ((view[20] >> 1) & 1) === 1
}
