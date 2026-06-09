import { equals, getObjectSubset, iterableEquality, subsetEquality } from '@jest/expect-utils'
import {
	matcherHint,
	printDiffOrStringify,
	printExpected,
	printReceived,
	stringify,
} from 'jest-matcher-utils'

if (typeof window !== 'undefined') {
	await import('vitest-canvas-mock')
}

// Crypto fallback for environments without a native WebCrypto implementation (e.g. the ai package).
// jsdom provides window.crypto with subtle crypto, so this only kicks in elsewhere.
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

// Path2D polyfills
if (typeof Path2D !== 'undefined' && typeof Path2D.prototype.roundRect !== 'function') {
	Path2D.prototype.roundRect = function (x, y, w, h, _) {
		this.rect(x, y, w, h)
	}
}

// CSS.supports polyfill for tests that use color spaces (e.g., highlight shapes)
if (typeof CSS === 'undefined') {
	;(global as any).CSS = {}
}
if (typeof CSS.supports === 'undefined') {
	CSS.supports = () => false
}

// Pointer capture polyfill. jsdom implements the PointerEvent constructor but not the pointer
// capture model, so setPointerCapture/releasePointerCapture/hasPointerCapture are missing
// (https://github.com/jsdom/jsdom/pull/2666). Our canvas event handlers capture the pointer on
// pointerdown/up, so stub them out to avoid throwing.
if (typeof Element !== 'undefined') {
	Element.prototype.setPointerCapture ??= function () {
		// noop
	}
	Element.prototype.releasePointerCapture ??= function () {
		// noop
	}
	Element.prototype.hasPointerCapture ??= function () {
		return false
	}
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
					matcherHint(matcherName, undefined, undefined, options) +
					'\n\n' +
					`Expected: not ${printExpected(expected)}` +
					(stringify(expected) !== stringify(actual)
						? `\nReceived:     ${printReceived(actual)}`
						: '')
			: () =>
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
