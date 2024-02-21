import { RouteObject } from 'react-router-dom'
import { SPA_ROUTE_FILTER } from '../spaRouteFilter'
import { router } from './routes'

test('SPA_ROUTE_FILTER matches all React routes', () => {
	const paths: string[] = []

	function walk(routeObject: RouteObject) {
		// '*' is the catch-all route that just shows soft 404, we don't need
		// to include it in the Vercel config
		if (routeObject.path && routeObject.path !== '*') {
			paths.push(routeObject.path)
		}
		if (routeObject.children) {
			routeObject.children.forEach(walk)
		}
	}

	router.forEach(walk)

	const regex = new RegExp(SPA_ROUTE_FILTER)
	paths.forEach((path) => {
		expect(path).toMatch(regex)
	})
})
