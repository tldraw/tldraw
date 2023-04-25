import { equals, getObjectSubset, iterableEquality, subsetEquality } from '@jest/expect-utils'

import {
	matcherHint,
	printDiffOrStringify,
	printExpected,
	printReceived,
	stringify,
} from 'jest-matcher-utils'

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
