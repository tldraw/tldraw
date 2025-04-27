const memo = {} as Record<string, Float32Array>

export function getRgba(colorString: string) {
	if (memo[colorString]) {
		return memo[colorString]
	}
	const canvas = document.createElement('canvas')
	const context = canvas.getContext('2d')
	context!.fillStyle = colorString
	context!.fillRect(0, 0, 1, 1)
	const [r, g, b, a] = context!.getImageData(0, 0, 1, 1).data
	const result = new Float32Array([r / 255, g / 255, b / 255, a / 255])

	memo[colorString] = result
	return result
}
