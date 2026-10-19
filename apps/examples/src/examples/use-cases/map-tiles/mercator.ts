import { clamp } from 'tldraw'

/**
 * Page space is Web Mercator world pixels at `BASE_MAP_ZOOM`, so at camera zoom 1 a page unit is a
 * screen pixel and tiles draw at their native size. Every other camera zoom is a power of two away
 * from that, which is what lets the tile zoom be read straight off the camera.
 */
export const BASE_MAP_ZOOM = 13
const TILE_SIZE = 256
export const WORLD_SIZE = TILE_SIZE * 2 ** BASE_MAP_ZOOM

/**
 * A real map viewer spans z0-z19, which is a camera zoom range of about 500,000x. tldraw's camera
 * is not built for that, so the map is capped to a band around the base zoom instead.
 */
const MIN_MAP_ZOOM = BASE_MAP_ZOOM - 3
const MAX_MAP_ZOOM = BASE_MAP_ZOOM + 4

/** The deepest zoom OpenStreetMap renders. Asking for z20 returns nothing. */
const MAX_TILE_ZOOM = 19

/** One camera zoom step per map zoom level, so every step lands on a whole tile zoom. */
export const ZOOM_STEPS = Array.from(
	{ length: MAX_MAP_ZOOM - MIN_MAP_ZOOM + 1 },
	(_, i) => 2 ** (MIN_MAP_ZOOM + i - BASE_MAP_ZOOM)
)

/**
 * Web Mercator is undefined past this latitude, and the projection degrades quietly rather than
 * loudly: 90 returns a point five world-heights above the map and -90 returns Infinity, so a caller
 * can't even guard both with isFinite. Clamping here is what every map library does.
 */
const MAX_LATITUDE = 85.0511287798066

export function lngLatToPage(lng: number, lat: number) {
	const latRad = (clamp(lat, -MAX_LATITUDE, MAX_LATITUDE) * Math.PI) / 180
	return {
		x: ((lng + 180) / 360) * WORLD_SIZE,
		y: ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * WORLD_SIZE,
	}
}

export function pageToLngLat(x: number, y: number) {
	return {
		lng: (x / WORLD_SIZE) * 360 - 180,
		lat: (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / WORLD_SIZE))) * 180) / Math.PI,
	}
}

/**
 * Device pixel ratio belongs in the zoom choice, not below it: OSM serves only 256px tiles, so the
 * one way to put a device pixel under every tile pixel on a retina screen is to fetch a zoom level
 * deeper and draw it at half size. The cost is four times the tiles.
 *
 * The upper bound is the tile server's, not the camera's - a retina screen at the top of the camera
 * band needs a zoom past `MAX_MAP_ZOOM`, which is what makes that last step sharp instead of soft.
 */
export function getMapZoom(cameraZoom: number, devicePixelRatio = 1) {
	// Round up rather than to nearest on the ratio: a 1.5x screen rounds to no extra level and
	// stretches 256 tile pixels over 384, which is the blur this is here to avoid.
	return clamp(
		Math.round(BASE_MAP_ZOOM + Math.log2(cameraZoom)) + Math.ceil(Math.log2(devicePixelRatio)),
		MIN_MAP_ZOOM,
		MAX_TILE_ZOOM
	)
}

/** The size of a tile at the given map zoom, in page units. */
export function getTilePageSize(mapZoom: number) {
	return WORLD_SIZE / 2 ** mapZoom
}
