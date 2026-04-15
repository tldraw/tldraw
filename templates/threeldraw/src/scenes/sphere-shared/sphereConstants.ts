export const SPHERE_RADIUS = 400

// Equirectangular: 2:1 aspect, wraps 360° around sphere
export const EQUIRECT_PAGE_WIDTH = 1600
export const EQUIRECT_PAGE_HEIGHT = 800

// Dome: square canvas mapped to hemisphere
export const DOME_PAGE_SIZE = 800

// Texture resolution (higher = sharper but slower rasterization)
export const TEXTURE_SCALE = 2

export interface SphereSceneState {
	azimuth: number // horizontal rotation in radians
	elevation: number // vertical rotation in radians
}

export const DEFAULT_SPHERE_STATE: SphereSceneState = {
	azimuth: 0,
	elevation: 0.3,
}

/** Equirectangular UV → page coordinates.
 *  Three.js SphereGeometry has v=0 at top (north pole), v=1 at bottom. */
export function equirectUvToPage(u: number, v: number) {
	return {
		x: u * EQUIRECT_PAGE_WIDTH,
		y: (1 - v) * EQUIRECT_PAGE_HEIGHT,
	}
}

/** Dome UV → page coordinates (hemisphere maps to a circular disc) */
export function domeUvToPage(u: number, v: number) {
	// Three.js hemisphere UVs: u maps longitude [0,1], v maps latitude [0,1]
	// Convert to polar: angle = u * 2π, radius = v (0=pole, 1=equator)
	const angle = u * Math.PI * 2
	const radius = v
	const cx = DOME_PAGE_SIZE / 2
	const cy = DOME_PAGE_SIZE / 2
	return {
		x: cx + radius * Math.cos(angle) * cx,
		y: cy + radius * Math.sin(angle) * cy,
	}
}
