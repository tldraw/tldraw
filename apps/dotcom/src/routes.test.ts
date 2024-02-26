import { expect } from '@jest/globals'
import type { MatcherFunction } from 'expect'
import { RouteObject } from 'react-router-dom'
import { SPA_ROUTE_FILTERS } from '../spaRouteFilters'
import { router } from './routes'

const toMatchAny: MatcherFunction<[regexes: unknown]> = function (actual, regexes) {
	if (
		typeof actual !== 'string' ||
		!Array.isArray(regexes) ||
		regexes.some((regex) => typeof regex !== 'string')
	) {
		throw new Error('toMatchAny takes a string and an array of strings')
	}

	const pass = regexes.map((regex) => new RegExp(regex)).some((regex) => actual.match(regex))
	if (pass) {
		return {
			message: () =>
				`expected ${this.utils.printReceived(actual)} not to match any of the regexes ${this.utils.printExpected(regexes)}`,
			pass: true,
		}
	} else {
		return {
			message: () =>
				`expected ${this.utils.printReceived(actual)} to match at least one of the regexes ${this.utils.printExpected(regexes)}`,
			pass: false,
		}
	}
}

expect.extend({ toMatchAny })

function extractContentPaths(routeObject: RouteObject): string[] {
	const paths: string[] = []

	if (routeObject.path && routeObject.path !== '*') {
		paths.push(routeObject.path)
	}

	if (routeObject.children) {
		routeObject.children.forEach((child) => {
			paths.push(...extractContentPaths(child))
		})
	}

	return paths
}

test('SPA_ROUTE_FILTERS match all React routes', () => {
	router.flatMap(extractContentPaths).forEach((path) => {
		expect(path).toMatchAny(SPA_ROUTE_FILTERS)
	})
})

test("SPA_ROUTE_FILTERS don't match assets", () => {
	expect('/assets/test.png').not.toMatchAny(SPA_ROUTE_FILTERS)
})
