import { getStrategy, registerStrategy } from './strategies'
import { parseSvg } from './svg-parser'
import {
	DEFAULT_FILL_OPTIONS,
	FillOptions,
	FillResult,
	FillStrategyType,
	Point,
	Polygon,
} from './types'

export { DEFAULT_FILL_OPTIONS, parseSvg, registerStrategy }
export type { FillOptions, FillResult, FillStrategyType, Point, Polygon }

/**
 * Generate fill paths for all closed shapes in an SVG string.
 *
 * @param svgString - Raw SVG markup
 * @param options - Fill generation options (merged with defaults)
 * @returns Array of fill results, one per closed shape found
 */
export function generateFillPaths(svgString: string, options?: Partial<FillOptions>): FillResult[] {
	const opts = { ...DEFAULT_FILL_OPTIONS, ...options }
	const polygons = parseSvg(svgString)
	return generateFillPathsFromPolygons(polygons, opts)
}

/**
 * Generate fill paths for an array of polygons.
 * Use this if you've already parsed your SVG or have polygons from another source.
 *
 * @param polygons - Array of closed polygons
 * @param options - Fill generation options (merged with defaults)
 * @returns Array of fill results, one per polygon
 */
export function generateFillPathsFromPolygons(
	polygons: Polygon[],
	options?: Partial<FillOptions>
): FillResult[] {
	const opts = { ...DEFAULT_FILL_OPTIONS, ...options }
	const strategy = getStrategy(opts.strategy)

	const results: FillResult[] = []
	for (const polygon of polygons) {
		for (const path of strategy.generate(polygon, opts)) {
			if (path.length > 0) {
				results.push({ polygon, path })
			}
		}
	}
	return results
}

/**
 * Generate fill sub-paths for a single polygon.
 * Returns multiple independent paths when holes split the fill into regions.
 *
 * @param polygon - A closed polygon
 * @param options - Fill generation options (merged with defaults)
 * @returns Array of fill sub-paths (one per connected fill region)
 */
export function generateFillSubPaths(polygon: Polygon, options?: Partial<FillOptions>): Point[][] {
	const opts = { ...DEFAULT_FILL_OPTIONS, ...options }
	const strategy = getStrategy(opts.strategy)
	return strategy.generate(polygon, opts).filter((p) => p.length > 0)
}

/**
 * Generate a fill path for a single polygon (flattened into one path).
 * For hole-aware fills, prefer generateFillSubPaths which returns separate paths per region.
 *
 * @param polygon - A closed polygon
 * @param options - Fill generation options (merged with defaults)
 * @returns The fill path as an array of points, or empty array if generation fails
 */
export function generateFillPath(polygon: Polygon, options?: Partial<FillOptions>): Point[] {
	const subPaths = generateFillSubPaths(polygon, options)
	return subPaths.flat()
}
