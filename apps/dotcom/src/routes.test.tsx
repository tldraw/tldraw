import { expect } from '@jest/globals'
import type { MatcherFunction } from 'expect'
import { join } from 'path'
import { ReactElement } from 'react'
import { Route, RouteObject, createRoutesFromElements } from 'react-router-dom'
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
	const path = routeObject.path || ''

	const paths: string[] = []
	if (
		path &&
		(routeObject.element || routeObject.Component || routeObject.lazy || routeObject.loader)
	) {
		// This is a contentful route so it gets included on its own.
		// Technically not every route with a .lazy or a .loader has content, but we don't have a way to check that
		// and it's not a huge deal if they don't 404 correctly.
		paths.push(path)
	}
	if (routeObject.children && routeObject.children.length > 0) {
		// this route has children, so we need to recurse
		paths.push(
			...routeObject.children.flatMap((child) =>
				extractContentPaths(child).map((childPath) => join(path, childPath))
			)
		)
	}

	return paths
}

function convertReactToVercel(path: string): string {
	// react-router supports wildcard routes https://reactrouter.com/en/main/route/route#splats
	// but we don't use them yet so just fail for now until we need them (if ever)
	if (path.endsWith('*')) {
		throw new Error(`Wildcard routes like '${path}' are not supported yet (you can add support!)`)
	}
	// react-router supports optional route segments https://reactrouter.com/en/main/route/route#optional-segments
	// but we don't use them yet so just fail for now until we need them (if ever)
	if (path.match(/\?\//)) {
		throw new Error(
			`Optional route segments like in '${path}' are not supported yet (you can add this)`
		)
	}
	// make sure colons are immediately preceded by a slash
	if (path.match(/[^/]:/)) {
		throw new Error(`Colons in route segments must be immediately preceded by a slash in '${path}'`)
	}
	if (!path.startsWith('/')) {
		throw new Error(`Route paths must start with a slash, but '${path}' does not`)
	}
	// Wrap in explicit start and end of string anchors (^ and $)
	// and replace :param with [^/]* to match any string of non-slash characters, including the empty string
	return '^' + path.replace(/:[^/]+/g, '[^/]*') + '/?$'
}

const spaRoutes = router
	.flatMap(extractContentPaths)
	.sort()
	// ignore the root catch-all route
	.filter((path) => path !== '/*' && path !== '*')
	.map((path) => ({
		reactRouterPattern: path,
		vercelRouterPattern: convertReactToVercel(path),
	}))

const allvercelRouterPatterns = spaRoutes.map((route) => route.vercelRouterPattern)

test('the_routes', () => {
	expect(spaRoutes).toMatchSnapshot()
})

test('all React routes match', () => {
	for (const route of spaRoutes) {
		expect(route.reactRouterPattern).toMatch(new RegExp(route.vercelRouterPattern))
		for (const otherRoute of spaRoutes) {
			if (route === otherRoute) continue
			expect(route.reactRouterPattern).not.toMatch(new RegExp(otherRoute.vercelRouterPattern))
		}
	}
})

test("non-react routes don't match", () => {
	// lil smoke test for basic patterns
	expect('/').toMatchAny(allvercelRouterPatterns)
	expect('/new').toMatchAny(allvercelRouterPatterns)
	expect('/r/whatever').toMatchAny(allvercelRouterPatterns)
	expect('/r/whatever/').toMatchAny(allvercelRouterPatterns)

	expect('/assets/test.png').not.toMatchAny(allvercelRouterPatterns)
	expect('/twitter-social.png').not.toMatchAny(allvercelRouterPatterns)
	expect('/robots.txt').not.toMatchAny(allvercelRouterPatterns)
	expect('/static/css/index.css').not.toMatchAny(allvercelRouterPatterns)
})

test('convertReactToVercel', () => {
	expect(() =>
		convertReactToVercel('/r/:roomId/history?/:timestamp')
	).toThrowErrorMatchingInlineSnapshot(
		`"Optional route segments like in '/r/:roomId/history?/:timestamp' are not supported yet (you can add this)"`
	)
	expect(() => convertReactToVercel('/r/:roomId/history/*')).toThrowErrorMatchingInlineSnapshot(
		`"Wildcard routes like '/r/:roomId/history/*' are not supported yet (you can add support!)"`
	)
	expect(() => convertReactToVercel('/r/foo:roomId/history')).toThrowErrorMatchingInlineSnapshot(
		`"Colons in route segments must be immediately preceded by a slash in '/r/foo:roomId/history'"`
	)
	expect(() => convertReactToVercel('r/:roomId/history')).toThrowErrorMatchingInlineSnapshot(
		`"Route paths must start with a slash, but 'r/:roomId/history' does not"`
	)
})

function extract(...routes: ReactElement[]) {
	return createRoutesFromElements(
		<Route>{routes.map((r, i) => ({ ...r, key: i.toString() }))}</Route>
	)
		.flatMap(extractContentPaths)
		.sort()
}

describe('extractContentPaths', () => {
	it('only includes routes with content', () => {
		expect(extract(<Route path="/foo" element={<div></div>} />)).toEqual(['/foo'])
		expect(extract(<Route path="/foo" Component={() => 'hi'} />)).toEqual(['/foo'])
		expect(
			extract(<Route path="/foo" lazy={() => Promise.resolve({ Component: () => 'foo' })} />)
		).toEqual(['/foo'])
		expect(extract(<Route path="/foo" loader={async () => null} />)).toEqual(['/foo'])
		expect(extract(<Route path="/foo"></Route>)).toEqual([])
		expect(extract(<Route path="/foo"></Route>)).toEqual([])
		expect(
			extract(
				<Route path="/foo">
					<Route path="bar" />
				</Route>
			)
		).toEqual([])
	})
	it('does not include parent routes without content', () => {
		expect(
			extract(
				<Route path="/foo">
					<Route path="bar" element={<div></div>} />
				</Route>
			)
		).toEqual(['/foo/bar'])
	})
	it('does include parent routes with content', () => {
		expect(
			extract(
				<Route path="/foo" element={<div></div>}>
					<Route path="bar" element={<div></div>} />
				</Route>
			)
		).toEqual(['/foo', '/foo/bar'])
	})
})
