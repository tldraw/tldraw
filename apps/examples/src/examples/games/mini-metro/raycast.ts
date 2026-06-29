// A tiny Doom-style raycaster, adapted from the "3D engine made of shapes"
// example. The twist that example introduced — the world is an arbitrary set of
// line segments read from real tldraw shapes, not a grid — is exactly what we
// want here: the metro stations on the canvas become the walls of a first-person
// view you ride through. This file is pure (no tldraw imports).

export interface Segment {
	ax: number
	ay: number
	bx: number
	by: number
	// A tldraw colour name, carried through so the projected wall slice can match
	// the shape it came from.
	color: string
}

// A camera: a position plus a facing direction and a perpendicular camera plane
// whose length sets the field of view.
export interface Camera {
	x: number
	y: number
	dirX: number
	dirY: number
	planeX: number
	planeY: number
}

// The result of casting one screen column: distance to the nearest wall, its
// colour, and how grazing the hit was (0 = head-on, 1 = edge-on). dist is
// Infinity if the ray hit nothing.
export interface Column {
	dist: number
	color: string
	faceShade: number
}

// Build a camera at (x, y) facing the heading (hx, hy). The plane is
// perpendicular to the heading; `fov` scales it (≈66° by default).
export function cameraFromHeading(
	x: number,
	y: number,
	hx: number,
	hy: number,
	fov = 0.66
): Camera {
	const len = Math.hypot(hx, hy) || 1
	const dirX = hx / len
	const dirY = hy / len
	return { x, y, dirX, dirY, planeX: -dirY * fov, planeY: dirX * fov }
}

// Cast `n` rays across the field of view and return the nearest wall hit for each
// column. Same segment-intersection math as the 3D engine example.
export function castColumns(cam: Camera, segments: Segment[], n: number): Column[] {
	const columns: Column[] = []
	for (let i = 0; i < n; i++) {
		const cameraX = (2 * (i + 0.5)) / n - 1 // -1 at left edge, +1 at right edge
		const rx = cam.dirX + cam.planeX * cameraX
		const ry = cam.dirY + cam.planeY * cameraX

		let best = Infinity
		let bestColor = 'grey'
		let bestSx = 0
		let bestSy = 0
		for (const s of segments) {
			const sx = s.bx - s.ax
			const sy = s.by - s.ay
			const denom = rx * sy - ry * sx
			if (Math.abs(denom) < 1e-9) continue // ray parallel to segment
			const qx = s.ax - cam.x
			const qy = s.ay - cam.y
			const t = (qx * sy - qy * sx) / denom // distance along the ray
			const u = (qx * ry - qy * rx) / denom // position along the segment
			if (t > 0.0001 && u >= 0 && u <= 1 && t < best) {
				best = t
				bestColor = s.color
				bestSx = sx
				bestSy = sy
			}
		}
		// How square-on the ray met the wall (1 = head-on, 0 = edge-on), for
		// shading that gives corners definition. Because dir is unit-length and the
		// plane is perpendicular to it, `t` is already fisheye-corrected distance.
		const rayLen = Math.hypot(rx, ry) || 1
		const segLen = Math.hypot(bestSx, bestSy) || 1
		const facing = Math.abs((rx * -bestSy + ry * bestSx) / (rayLen * segLen))
		columns.push({ dist: best, color: bestColor, faceShade: 1 - facing })
	}
	return columns
}
