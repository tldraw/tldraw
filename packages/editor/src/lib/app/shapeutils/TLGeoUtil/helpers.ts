import { Vec2d, perimeterOfEllipse } from '@tldraw/primitives'
import { TLDashType, TLGeoShapeProps } from '@tldraw/tlschema'

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

export function getLines(props: TLGeoShapeProps, sw: number) {
	switch (props.geo) {
		case 'x-box': {
			return getXBoxLines(props.w, props.h, sw, props.dash)
		}
		case 'check-box': {
			return getCheckBoxLines(props.w, props.h)
		}
		default: {
			return undefined
		}
	}
}

function getXBoxLines(w: number, h: number, sw: number, dash: TLDashType) {
	const inset = dash === 'draw' ? 0.62 : 0

	if (dash === 'dashed') {
		return [
			[new Vec2d(0, 0), new Vec2d(w / 2, h / 2)],
			[new Vec2d(w, h), new Vec2d(w / 2, h / 2)],
			[new Vec2d(0, h), new Vec2d(w / 2, h / 2)],
			[new Vec2d(w, 0), new Vec2d(w / 2, h / 2)],
		]
	}

	return [
		[new Vec2d(sw * inset, sw * inset), new Vec2d(w - sw * inset, h - sw * inset)],
		[new Vec2d(sw * inset, h - sw * inset), new Vec2d(w - sw * inset, sw * inset)],
	]
}

function getCheckBoxLines(w: number, h: number) {
	const size = Math.min(w, h) * 0.82
	const ox = (w - size) / 2
	const oy = (h - size) / 2
	return [
		[new Vec2d(ox + size * 0.25, oy + size * 0.52), new Vec2d(ox + size * 0.45, oy + size * 0.82)],
		[new Vec2d(ox + size * 0.45, oy + size * 0.82), new Vec2d(ox + size * 0.82, oy + size * 0.22)],
	]
}
