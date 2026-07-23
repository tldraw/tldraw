import { safeParseUrl } from '@tldraw/editor'
import { TLEmbedDefinition } from '../../defaultEmbedDefinitions'

// https://github.com/sindresorhus/escape-string-regexp/blob/main/index.js
function escapeStringRegexp(string: string) {
	if (typeof string !== 'string') {
		throw new TypeError('Expected a string')
	}

	// Escape characters with special meaning either inside or outside character sets.
	// Use a simple backslash escape when it’s always valid, and a `\xnn` escape when the simpler form would be disallowed by Unicode patterns’ stricter grammar.
	return string.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/-/g, '\\x2d')
}

/** @public */
export function matchEmbedUrl(definitions: readonly TLEmbedDefinition[], url: string) {
	const parsed = safeParseUrl(url)
	if (!parsed) return undefined
	const host = parsed.host.replace('www.', '')
	for (const localEmbedDef of definitions) {
		if (checkHostnames(localEmbedDef.hostnames, host)) {
			const originalUrl = localEmbedDef.fromEmbedUrl(url)
			if (originalUrl) {
				return {
					definition: localEmbedDef,
					url: originalUrl,
					embedUrl: url,
				}
			}
		}
	}
	return undefined
}

const globlikeRegExp = (input: string) => {
	return input
		.split('*')
		.map((str) => escapeStringRegexp(str))
		.join('.+')
}

const checkHostnames = (hostnames: readonly string[], targetHostname: string) => {
	return !!hostnames.find((hostname) => {
		const re = new RegExp(globlikeRegExp(hostname))
		return targetHostname.match(re)
	})
}

/** @public */
export function matchUrl(
	definitions: readonly TLEmbedDefinition[],
	url: string,
	embedConfig?: Record<string, unknown>
) {
	const parsed = safeParseUrl(url)
	if (!parsed) return undefined
	const host = parsed.host.replace('www.', '')
	for (const localEmbedDef of definitions) {
		if (checkHostnames(localEmbedDef.hostnames, host)) {
			const embedUrl = localEmbedDef.toEmbedUrl(url, embedConfig?.[localEmbedDef.type])

			if (embedUrl) {
				return {
					definition: localEmbedDef,
					embedUrl,
					url,
				}
			}
		}
	}
	return undefined
}

/** @public */
export type TLEmbedResult =
	| {
			definition: TLEmbedDefinition
			url: string
			embedUrl: string
	  }
	| undefined

/**
 * Tests whether an URL supports embedding and returns the result. If we encounter an error, we
 * return undefined.
 *
 * @param inputUrl - The URL to match
 * @param embedConfig - Optional per-embed config, keyed by embed type, passed to `toEmbedUrl`
 * @public
 */
export function getEmbedInfo(
	definitions: readonly TLEmbedDefinition[],
	inputUrl: string,
	embedConfig?: Record<string, unknown>
): TLEmbedResult {
	try {
		return matchUrl(definitions, inputUrl, embedConfig) ?? matchEmbedUrl(definitions, inputUrl)
	} catch {
		return undefined
	}
}

const ASPECT_RATIO_EPSILON = 0.001

/**
 * Given an embed shape's current size and a newly-resolved aspect ratio, return the size it should
 * be corrected to (width preserved, height derived), or `null` when no change is needed — either
 * because there's no resolved ratio or the shape is already at it.
 *
 * @param opts - The current `w`/`h` and the `resolvedRatio` (`width / height`) discovered at runtime.
 * @internal
 */
export function getCorrectedEmbedSize({
	w,
	h,
	resolvedRatio,
}: {
	w: number
	h: number
	resolvedRatio: number | undefined
}): { w: number; h: number } | null {
	if (!resolvedRatio || resolvedRatio <= 0) return null

	// Already at the resolved ratio: nothing to do.
	if (Math.abs(w / h - resolvedRatio) <= ASPECT_RATIO_EPSILON) return null

	return { w, h: w / resolvedRatio }
}
