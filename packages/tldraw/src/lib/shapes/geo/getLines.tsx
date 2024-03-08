import { TLDefaultDashStyle, TLGeoShape, Vec } from '@tldraw/editor'

export function getLines(props: TLGeoShape['props'], sw: number) {
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
function getXBoxLines(w: number, h: number, sw: number, dash: TLDefaultDashStyle) {
	const inset = dash === 'draw' ? 0.62 : 0

	if (dash === 'dashed') {
		return [
			[new Vec(0, 0), new Vec(w / 2, h / 2)],
			[new Vec(w, h), new Vec(w / 2, h / 2)],
			[new Vec(0, h), new Vec(w / 2, h / 2)],
			[new Vec(w, 0), new Vec(w / 2, h / 2)],
		]
	}

	const clampX = (x: number) => Math.max(0, Math.min(w, x))
	const clampY = (y: number) => Math.max(0, Math.min(h, y))

	return [
		[
			new Vec(clampX(sw * inset), clampY(sw * inset)),
			new Vec(clampX(w - sw * inset), clampY(h - sw * inset)),
		],
		[
			new Vec(clampX(sw * inset), clampY(h - sw * inset)),
			new Vec(clampX(w - sw * inset), clampY(sw * inset)),
		],
	]
}
function getCheckBoxLines(w: number, h: number) {
	const size = Math.min(w, h) * 0.82
	const ox = (w - size) / 2
	const oy = (h - size) / 2

	const clampX = (x: number) => Math.max(0, Math.min(w, x))
	const clampY = (y: number) => Math.max(0, Math.min(h, y))

	return [
		[
			new Vec(clampX(ox + size * 0.25), clampY(oy + size * 0.52)),
			new Vec(clampX(ox + size * 0.45), clampY(oy + size * 0.82)),
		],
		[
			new Vec(clampX(ox + size * 0.45), clampY(oy + size * 0.82)),
			new Vec(clampX(ox + size * 0.82), clampY(oy + size * 0.22)),
		],
	]
}
