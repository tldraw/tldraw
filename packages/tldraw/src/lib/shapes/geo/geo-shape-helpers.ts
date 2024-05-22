import {
	Arc2d,
	CubicBezier2d,
	EASINGS,
	Edge2d,
	HALF_PI,
	PI,
	PI2,
	Vec,
	perimeterOfEllipse,
	rng,
} from '@tldraw/editor'
import { getStrokePoints } from '../shared/freehand/getStrokePoints'
import { getSvgPathFromStrokePoints } from '../shared/freehand/svg'

/* ---------------------- Oval ---------------------- */

export function getOvalPath(w: number, h: number) {
	const parts = getOvalParts(w, h)
	return parts.map((p, i) => p.toSvg(i === 0)).join(' ') + ' Z'
}

export function getOvalPerimeter(h: number, w: number) {
	if (h > w) return (PI * (w / 2) + (h - w)) * 2
	else return (PI * (h / 2) + (w - h)) * 2
}

export function getOvalParts(w: number, h: number) {
	if (h > w) {
		const o = w / 2

		return [
			new Arc2d({
				start: new Vec(0, o),
				end: new Vec(w, o),
				center: new Vec(w / 2, o),
				sweepFlag: 1,
				largeArcFlag: 1,
			}),
			new Edge2d({ start: new Vec(w, o), end: new Vec(w, h - o) }),
			new Arc2d({
				start: new Vec(w, h - o),
				end: new Vec(0, h - o),
				center: new Vec(w / 2, h - o),
				sweepFlag: 1,
				largeArcFlag: 1,
			}),
			new Edge2d({ start: new Vec(0, h - o), end: new Vec(0, o) }),
		]
	}

	const r = h / 2
	return [
		new Edge2d({ start: new Vec(r, 0), end: new Vec(w - r, 0) }),
		new Arc2d({
			start: new Vec(w - r, 0),
			end: new Vec(w - r, h),
			center: new Vec(w - r, r),
			sweepFlag: 1,
			largeArcFlag: 1,
		}),
		new Edge2d({ start: new Vec(w - r, h), end: new Vec(r, h) }),
		new Arc2d({
			start: new Vec(r, h),
			end: new Vec(r, 0),
			center: new Vec(r, r),
			sweepFlag: 1,
			largeArcFlag: 1,
		}),
	]
}

/* ---------------------- Heart --------------------- */

export function getHeartPath(w: number, h: number) {
	return (
		getHeartParts(w, h)
			.map((c, i) => c.toSvg(i === 0))
			.join(' ') + ' Z'
	)
}

export function getHeartPoints(w: number, h: number) {
	const points = [] as Vec[]
	const curves = getHeartParts(w, h)
	for (let i = 0; i < curves.length; i++) {
		for (let j = 0; j < 20; j++) {
			points.push(CubicBezier2d.GetAtT(curves[i], j / 20))
		}
		if (i === curves.length - 1) {
			points.push(CubicBezier2d.GetAtT(curves[i], 1))
		}
	}
}

export function getHeartParts(w: number, h: number) {
	const o = w / 4
	const k = h / 4
	return [
		new CubicBezier2d({
			start: new Vec(w / 2, h),
			cp1: new Vec(o * 1.5, k * 3),
			cp2: new Vec(0, k * 2.5),
			end: new Vec(0, k * 1.2),
		}),
		new CubicBezier2d({
			start: new Vec(0, k * 1.2),
			cp1: new Vec(0, -k * 0.32),
			cp2: new Vec(o * 1.85, -k * 0.32),
			end: new Vec(w / 2, k * 0.9),
		}),
		new CubicBezier2d({
			start: new Vec(w / 2, k * 0.9),
			cp1: new Vec(o * 2.15, -k * 0.32),
			cp2: new Vec(w, -k * 0.32),
			end: new Vec(w, k * 1.2),
		}),
		new CubicBezier2d({
			start: new Vec(w, k * 1.2),
			cp1: new Vec(w, k * 2.5),
			cp2: new Vec(o * 2.5, k * 3),
			end: new Vec(w / 2, h),
		}),
	]
}

/* --------------------- Ellipse -------------------- */

function getEllipseStrokeOptions(strokeWidth: number) {
	return {
		size: 1 + strokeWidth,
		thinning: 0.25,
		end: { taper: strokeWidth },
		start: { taper: strokeWidth },
		streamline: 0,
		smoothing: 1,
		simulatePressure: false,
	}
}

function getEllipseStrokePoints(id: string, width: number, height: number, strokeWidth: number) {
	const getRandom = rng(id)

	const rx = width / 2
	const ry = height / 2
	const perimeter = perimeterOfEllipse(rx, ry)

	const points: Vec[] = []

	const start = PI2 * getRandom()
	const length = PI2 + HALF_PI / 2 + Math.abs(getRandom()) * HALF_PI
	const count = Math.max(16, perimeter / 10)

	for (let i = 0; i < count; i++) {
		const t = i / (count - 1)
		const r = start + t * length
		const c = Math.cos(r)
		const s = Math.sin(r)
		points.push(
			new Vec(
				rx * c + width * 0.5 + 0.05 * getRandom(),
				ry * s + height / 2 + 0.05 * getRandom(),
				Math.min(
					1,
					0.5 +
						Math.abs(0.5 - (getRandom() > 0 ? EASINGS.easeInOutSine(t) : EASINGS.easeInExpo(t))) / 2
				)
			)
		)
	}

	return getStrokePoints(points, getEllipseStrokeOptions(strokeWidth))
}

export function getEllipseDrawIndicatorPath(
	id: string,
	width: number,
	height: number,
	strokeWidth: number
) {
	return getSvgPathFromStrokePoints(getEllipseStrokePoints(id, width, height, strokeWidth))
}

export function getEllipsePath(w: number, h: number) {
	const cx = w / 2
	const cy = h / 2
	const rx = Math.max(0, cx)
	const ry = Math.max(0, cy)
	return `M${cx - rx},${cy}a${rx},${ry},0,1,1,${rx * 2},0a${rx},${ry},0,1,1,-${rx * 2},0`
}
