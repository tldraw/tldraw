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
	if (!parsed) return
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
export function matchUrl(definitions: readonly TLEmbedDefinition[], url: string) {
	const parsed = safeParseUrl(url)
	if (!parsed) return
	const host = parsed.host.replace('www.', '')
	for (const localEmbedDef of definitions) {
		if (checkHostnames(localEmbedDef.hostnames, host)) {
			const embedUrl = localEmbedDef.toEmbedUrl(url)

			if (embedUrl) {
				return {
					definition: localEmbedDef,
					embedUrl,
					url,
				}
			}
		}
	}
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
 * @public
 */
export function getEmbedInfo(
	definitions: readonly TLEmbedDefinition[],
	inputUrl: string
): TLEmbedResult {
	try {
		return matchUrl(definitions, inputUrl) ?? matchEmbedUrl(definitions, inputUrl)
	} catch {
		return undefined
	}
}
