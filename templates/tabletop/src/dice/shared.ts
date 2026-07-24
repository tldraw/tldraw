import type { Editor, TLDefaultColorStyle, TLShapeId } from 'tldraw'
import { getColorValue, getDefaultColorTheme, Mat, Vec } from 'tldraw'

// --- Constants ---

export const DEG_TO_RAD = Math.PI / 180

/** Light direction (toward source): from above and slightly toward the viewer. */
export const LIGHT_DIR: [number, number, number] = [0, -0.6, 0.8]
export const MAX_SHADOW = 0.4

// --- Color helpers ---

export function getFaceColor(color: TLDefaultColorStyle, isDarkMode: boolean) {
	const theme = getDefaultColorTheme({ isDarkMode })
	if (color === 'black') {
		return theme.white.solid
	}
	return getColorValue(theme, color, 'solid')
}

export function getTextColor(color: TLDefaultColorStyle, isDarkMode: boolean) {
	const theme = getDefaultColorTheme({ isDarkMode })
	if (color === 'black') {
		if (isDarkMode) {
			return theme.black.frameFill
		}
		return theme.black.solid
	}
	return theme.white.solid
}

export function getStrokeColor(_color: TLDefaultColorStyle, _isDarkMode: boolean) {
	return `rgba(255, 255, 255, .25)`
}

export function getBorderColor(_color: TLDefaultColorStyle, isDarkMode: boolean) {
	const theme = getDefaultColorTheme({ isDarkMode })
	if (isDarkMode) {
		return theme.black.frameFill
	}
	return theme.black.solid
}

// --- Shake detection ---

export interface ShakeState {
	directionChanges: number
	lastVelocityX: number
	lastVelocityY: number
	lastChangeTime: number
	hasRolled: boolean
}

export function createShakeState(): ShakeState {
	return {
		directionChanges: 0,
		lastVelocityX: 0,
		lastVelocityY: 0,
		lastChangeTime: Date.now(),
		hasRolled: false,
	}
}

export function updateShakeState(state: ShakeState, velocity: { x: number; y: number }): boolean {
	const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
	const now = Date.now()

	if (speed > 0.3) {
		if (
			state.lastVelocityX !== 0 &&
			velocity.x !== 0 &&
			Math.sign(velocity.x) !== Math.sign(state.lastVelocityX) &&
			Math.abs(velocity.x) > 0.15
		) {
			state.directionChanges++
			state.lastChangeTime = now
		}

		if (
			state.lastVelocityY !== 0 &&
			velocity.y !== 0 &&
			Math.sign(velocity.y) !== Math.sign(state.lastVelocityY) &&
			Math.abs(velocity.y) > 0.15
		) {
			state.directionChanges++
			state.lastChangeTime = now
		}

		if (velocity.x !== 0) state.lastVelocityX = velocity.x
		if (velocity.y !== 0) state.lastVelocityY = velocity.y
	}

	if (now - state.lastChangeTime > 500) {
		state.directionChanges = Math.max(0, state.directionChanges - 1)
		state.lastChangeTime = now
	}

	return state.directionChanges >= 4
}

// --- Convex hull ---

/** Convex hull of 2D points (Andrew's monotone chain). Returns CW polygon. */
export function convexHull(points: [number, number][]): [number, number][] {
	const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
	if (pts.length <= 1) return pts
	const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
		(a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
	const lower: [number, number][] = []
	for (const p of pts) {
		while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
			lower.pop()
		lower.push(p)
	}
	const upper: [number, number][] = []
	for (let i = pts.length - 1; i >= 0; i--) {
		while (
			upper.length >= 2 &&
			cross(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0
		)
			upper.pop()
		upper.push(pts[i])
	}
	lower.pop()
	upper.pop()
	return lower.concat(upper)
}

// --- 3-axis rotation ---

/**
 * Rotate a point matching CSS `rotateZ(rz) rotateX(rx) rotateY(ry)`.
 * CSS applies transforms right-to-left, so the order is: RY → RX → RZ.
 */
export function rotateVert3(
	x: number,
	y: number,
	z: number,
	cosRx: number,
	sinRx: number,
	cosRy: number,
	sinRy: number,
	cosRz: number,
	sinRz: number
): [number, number, number] {
	// RY first
	const x1 = x * cosRy + z * sinRy
	const z1 = -x * sinRy + z * cosRy
	// RX
	const y2 = y * cosRx - z1 * sinRx
	const z2 = y * sinRx + z1 * cosRx
	// RZ last
	const x3 = x1 * cosRz - y2 * sinRz
	const y3 = x1 * sinRz + y2 * cosRz
	return [x3, y3, z2]
}

/** Rotate a point by RY then RX (for D6 cube CSS transform order). */
export function rotateVert2(
	x: number,
	y: number,
	z: number,
	cosRx: number,
	sinRx: number,
	cosRy: number,
	sinRy: number
): [number, number, number] {
	// RY
	const x1 = x * cosRy + z * sinRy
	const z1 = -x * sinRy + z * cosRy
	// RX
	const y2 = y * cosRx - z1 * sinRx
	const z2 = y * sinRx + z1 * cosRx
	return [x1, y2, z2]
}

// --- Outline projection ---

/**
 * Get the perspective-projected 2D convex hull outline of arbitrary vertices at a given 3-axis rotation.
 * @param vertScale - maps model-space coords (±1) to pixel distance from center
 * @param centerX - pixel X center of the die within the SVG
 * @param centerY - pixel Y center of the die within the SVG
 */
export function getOutlineFromRotation(
	vertices: [number, number, number][],
	rotX: number,
	rotY: number,
	rotZ: number,
	vertScale: number,
	centerX: number,
	centerY: number,
	pox: number,
	poy: number,
	pd: number
): string {
	const rxR = rotX * DEG_TO_RAD
	const ryR = rotY * DEG_TO_RAD
	const rzR = rotZ * DEG_TO_RAD
	const cosRx = Math.cos(rxR),
		sinRx = Math.sin(rxR)
	const cosRy = Math.cos(ryR),
		sinRy = Math.sin(ryR)
	const cosRz = Math.cos(rzR),
		sinRz = Math.sin(rzR)

	const projected: [number, number][] = vertices.map(([vx, vy, vz]) => {
		const [rx, ry, rz] = rotateVert3(vx, vy, vz, cosRx, sinRx, cosRy, sinRy, cosRz, sinRz)
		const cx = rx * vertScale + centerX
		const cy = ry * vertScale + centerY
		const cz = rz * vertScale
		const s = pd / (pd - cz)
		return [pox + (cx - pox) * s, poy + (cy - poy) * s] as [number, number]
	})

	const hull = convexHull(projected)
	return hull.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join('') + 'Z'
}

// --- Perspective computation ---

export function computePerspective(
	editor: Editor,
	shapeId: TLShapeId,
	half: number
): { ox: number; oy: number; d: number } {
	const viewport = editor.getViewportPageBounds()
	const transform = editor.getShapePageTransform(shapeId)
	const { x, y, rotation } = Mat.Decompose(transform)

	const vpCenter = viewport.center
	const originX = half + (vpCenter.x - x - half)
	const originY = half + (vpCenter.y - y - half)

	const origin = new Vec(originX, originY).rot(-rotation)
	const distance = Math.hypot(viewport.w, viewport.h)

	return { ox: origin.x, oy: origin.y, d: distance }
}
