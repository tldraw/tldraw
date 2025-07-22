import { expect } from 'vitest'
import crypto from 'crypto'
import { TextDecoder, TextEncoder } from 'util'

// Global polyfills
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
delete global.crypto
global.crypto = crypto

// Image polyfill
Image.prototype.decode = async function () {
	return true
}

// Custom matcher for closely matching objects (equivalent to Jest's toCloselyMatchObject)
function convertNumbersInObject(obj: any, roundToNearest: number) {
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
		const newActualObj = convertNumbersInObject(actual, roundToNearest)
		const newExpectedObj = convertNumbersInObject(expected, roundToNearest)

		const pass = JSON.stringify(newActualObj) === JSON.stringify(newExpectedObj)

		return {
			message: () =>
				pass
					? `Expected not to closely match object`
					: `Expected ${JSON.stringify(actual)} to closely match ${JSON.stringify(expected)}`,
			pass,
		}
	},
})

// Extend expect types
declare module 'vitest' {
	interface Assertion<T = any> {
		toCloselyMatchObject(expected: any, roundToNearest?: number): T
	}
}