import { PI } from '@tldraw/editor'

export function getOvalPath(w: number, h: number) {
	if (h > w) {
		const o = w / 2

		return `
    M0,${o}
    a${o},${o},0,1,1,${o * 2},0
    L${w},${h - o}
    a${o},${o},0,1,1,-${o * 2},0
    Z`
	}

	const o = h / 2

	return `
    M${o},0
    L${w - o},0
    a${o},${o},0,1,1,0,${o * 2}
    L${o},${h}
    a${o},${o},0,1,1,0,${-o * 2}
    Z`
}

export function getOvalPerimeter(h: number, w: number) {
	if (h > w) return (PI * (w / 2) + (h - w)) * 2
	else return (PI * (h / 2) + (w - h)) * 2
}

export function getEllipsePath(w: number, h: number) {
	const cx = w / 2
	const cy = h / 2
	const rx = Math.max(0, cx)
	const ry = Math.max(0, cy)
	return `M${cx - rx},${cy}a${rx},${ry},0,1,1,${rx * 2},0a${rx},${ry},0,1,1,-${rx * 2},0`
}
