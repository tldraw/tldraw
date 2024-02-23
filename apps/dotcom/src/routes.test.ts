import { expect } from '@jest/globals'
import type { MatcherFunction } from 'expect'
import { RouteObject } from 'react-router-dom'
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

function convertReactToVercel(path: string): string {
	// react-router supports wildcard routes https://reactrouter.com/en/main/route/route#splats
	// but we don't use them yet so just fail for now until we need them (if ever)
	if (path.endsWith('*')) {
		throw new Error('Wildcard routes are not supported yet (you can add this)')
	}
	// react-router supports optional route segments https://reactrouter.com/en/main/route/route#optional-segments
	// but we don't use them yet so just fail for now until we need them (if ever)
	if (path.match(/\?\//)) {
		throw new Error('Optional route segments are not supported yet (you can add this)')
	}
	// Wrap in explicit start and end of string anchors (^ and $)
	// and replace :param with [^/]* to match any string of non-slash characters, including the empty string
	return '^' + path.replace(/:[^/]+/g, '[^/]*') + '/?$'
}

const spaRoutes = router
	.flatMap(extractContentPaths)
	.sort()
	.map((path) => ({
		reactRouterPattern: path,
		vercelRoutingPattern: convertReactToVercel(path),
	}))

const allVercelRoutingPatterns = spaRoutes.map((route) => route.vercelRoutingPattern)

test('the_routes', () => {
	expect(spaRoutes).toMatchSnapshot()
})

test('all React routes match', () => {
	for (const route of spaRoutes) {
		expect(route.reactRouterPattern).toMatch(new RegExp(route.vercelRoutingPattern))
		for (const otherRoute of spaRoutes) {
			if (route === otherRoute) continue
			expect(route.reactRouterPattern).not.toMatch(new RegExp(otherRoute.vercelRoutingPattern))
		}
	}
})

test("non-react routes don't match", () => {
	// lil smoke test for basic patterns
	expect('/').toMatchAny(allVercelRoutingPatterns)
	expect('/new').toMatchAny(allVercelRoutingPatterns)
	expect('/r/whatever').toMatchAny(allVercelRoutingPatterns)
	expect('/r/whatever/').toMatchAny(allVercelRoutingPatterns)

	expect('/assets/test.png').not.toMatchAny(allVercelRoutingPatterns)
	expect('/twitter-social.png').not.toMatchAny(allVercelRoutingPatterns)
	expect('/robots.txt').not.toMatchAny(allVercelRoutingPatterns)
	expect('/static/css/index.css').not.toMatchAny(allVercelRoutingPatterns)
})
