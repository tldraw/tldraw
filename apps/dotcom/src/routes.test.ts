import { RouteObject } from 'react-router-dom'
import { SPA_ROUTE_FILTER } from '../spaRouteFilter'
import { router } from './routes'

test('SPA_ROUTE_FILTER matches all React routes', () => {
	const paths: string[] = []

	function walk(routeObject: RouteObject) {
		if (routeObject.path && routeObject.path !== '*') {
			paths.push(routeObject.path)
		}
		if (routeObject.children) {
			routeObject.children.forEach(walk)
		}
	}

	router.forEach(walk)

	console.log(paths)

	const regex = new RegExp(SPA_ROUTE_FILTER)
	console.log(regex)
	paths.forEach((path) => {
		expect(path).toMatch(regex)
	})
})
