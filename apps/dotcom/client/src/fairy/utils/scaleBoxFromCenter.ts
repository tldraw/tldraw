import { BoxLike } from 'tldraw'

export function scaleBoxFromCenter(box: BoxLike, n: number): BoxLike {
	const centerX = box.x + box.w / 2
	const centerY = box.y + box.h / 2
	
	const newW = box.w * n
	const newH = box.h * n
	
	return {
		x: centerX - newW / 2,
		y: centerY - newH / 2,
		w: newW,
		h: newH,
	}
}

