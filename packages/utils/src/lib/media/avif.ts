export const isAvifAnimated = (buffer: ArrayBuffer) => {
	const view = new Uint8Array(buffer)
	return view[3] === 44
}
