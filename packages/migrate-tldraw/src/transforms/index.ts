/**
 * Registry of every transform shipped by the migrate CLI. New SDK majors add a
 * new entry; older entries stay for users still doing those upgrades.
 *
 * The registry is keyed by transform id (`'v4-to-v5'`). The CLI's auto-detect
 * flow uses `expectedFromRange` to pick a transform from a detected major.
 */

import type { Transform } from '../lib/types'
import { v4ToV5 } from './v4-to-v5'

export const TRANSFORMS: Transform[] = [v4ToV5]

export function getTransformById(id: string): Transform | undefined {
	return TRANSFORMS.find((t) => t.id === id)
}

/**
 * Pick a transform whose `expectedFromRange` covers the given major version.
 * If multiple match, the one with the highest target wins.
 */
export function getTransformForMajor(major: string): Transform | undefined {
	const matches = TRANSFORMS.filter((t) => t.expectedFromRange.startsWith(`${major}.`))
	if (matches.length === 0) return undefined
	matches.sort((a, b) => (a.producesRange < b.producesRange ? 1 : -1))
	return matches[0]
}
