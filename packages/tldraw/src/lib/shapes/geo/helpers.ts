import { perimeterOfEllipse } from '@tldraw/editor'

export function getOvalSolidPath(w: number, h: number) {
	if (h > w) {
		const offset = w / 2

		return `
    M0,${offset}
    a${offset},${offset},0,1,1,${offset * 2},0
    L${w},${h - offset}
    a${offset},${offset},0,1,1,-${offset * 2},0
    Z`
	}

	const offset = h / 2

	return `
    M${offset},0
    L${w - offset},0
    a${offset},${offset},0,1,1,0,${offset * 2}
    L${offset},${h}
    a${offset},${offset},0,1,1,0,${-offset * 2}
    Z`
}

export function getOvalPerimeter(h: number, w: number) {
	if (h > w) {
		const offset = w / 2
		return perimeterOfEllipse(offset, offset) + (h - offset * 2) * 2
	}

	const offset = h / 2
	return perimeterOfEllipse(offset, offset) + (w - offset * 2) * 2
}
