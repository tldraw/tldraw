import { equals, getObjectSubset, iterableEquality, subsetEquality } from '@jest/expect-utils'
import crypto from 'crypto'
import {
	matcherHint,
	printDiffOrStringify,
	printExpected,
	printReceived,
	stringify,
} from 'jest-matcher-utils'
import { TextDecoder, TextEncoder } from 'util'

if (typeof window !== 'undefined') {
	await import('vitest-canvas-mock')
}

// Polyfill for requestAnimationFrame (equivalent to raf/polyfill)
if (typeof globalThis.requestAnimationFrame === 'undefined') {
	globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
		return setTimeout(() => cb(Date.now()), 16) as unknown as number
	}
}

if (typeof globalThis.cancelAnimationFrame === 'undefined') {
	globalThis.cancelAnimationFrame = (id: number) => {
		clearTimeout(id)
	}
}

// Global polyfills
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as any
// @ts-expect-error - cannot delete non-optional property
delete global.crypto
global.crypto = crypto as any

// Crypto polyfill (needed for ai package)
if (typeof globalThis.crypto === 'undefined') {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { Crypto } = require('@peculiar/webcrypto')
	globalThis.crypto = new Crypto()
}

// Image.decode polyfill - this should be handled by individual package setups,
// but including it here as a fallback
if (typeof HTMLImageElement !== 'undefined') {
	if (!HTMLImageElement.prototype.decode) {
		HTMLImageElement.prototype.decode = function () {
			return Promise.resolve()
		}
	}
}

// CSS.supports polyfill for tests that use color spaces (e.g., highlight shapes)
if (typeof CSS === 'undefined') {
	;(global as any).CSS = {}
}
if (typeof CSS.supports === 'undefined') {
	CSS.supports = () => false
}

function convertNumbersInObject(obj: any, roundToNearest: number): any {
	if (!obj) return obj
	if (Array.isArray(obj)) {
		return obj.map((x) => convertNumbersInObject(x, roundToNearest))
	}
	if (typeof obj === 'number') {
		// || 0 to avoid -0
		return Math.round(obj / roundToNearest) * roundToNearest || 0
	}
	if (typeof obj !== 'object') {
		return obj
	}

	const r: any = {
		__converted: true,
	}

	for (const k of Object.keys(obj)) {
		r[k] = convertNumbersInObject(obj[k], roundToNearest)
	}

	return r
}

expect.extend({
	toCloselyMatchObject(actual: any, expected: any, roundToNearest = 0.0001) {
		const matcherName = 'toCloselyMatchObject'
		const options = {
			isNot: this.isNot,
			promise: this.promise,
		}

		const EXPECTED_LABEL = 'Expected'
		const RECEIVED_LABEL = 'Received'
		const isExpand = (expand?: boolean): boolean => expand !== false

		const newActualObj = convertNumbersInObject(actual, roundToNearest)

		const newExpectedObj = convertNumbersInObject(expected, roundToNearest)

		const pass = equals(newActualObj, newExpectedObj, [iterableEquality, subsetEquality])

		const message = pass
			? () =>
					// eslint-disable-next-line prefer-template
					matcherHint(matcherName, undefined, undefined, options) +
					'\n\n' +
					`Expected: not ${printExpected(expected)}` +
					(stringify(expected) !== stringify(actual)
						? `\nReceived:     ${printReceived(actual)}`
						: '')
			: () =>
					// eslint-disable-next-line prefer-template
					matcherHint(matcherName, undefined, undefined, options) +
					'\n\n' +
					printDiffOrStringify(
						expected,
						getObjectSubset(actual, expected),
						EXPECTED_LABEL,
						RECEIVED_LABEL,
						isExpand(this.expand)
					)

		return { message, pass }
	},
})
