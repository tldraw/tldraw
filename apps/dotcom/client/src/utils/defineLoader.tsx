import { LoaderFunctionArgs, useLoaderData, useRouteError } from 'react-router-dom'

export function defineLoader<T>(_loader: (args: LoaderFunctionArgs) => Promise<T>): {
	loader(args: LoaderFunctionArgs): Promise<{ [specialSymbol]: T }>
	useData(): Exclude<T, Response>
	/**
	 * Like `useData`, but returns undefined when the route's loader rejected. For components the
	 * route's ErrorBoundary renders too: there is no loader data in that render, so `useData`
	 * would throw a second error out of the boundary and the intended error UI never shows.
	 */
	useMaybeData(): Exclude<T, Response> | undefined
} {
	const specialSymbol = Symbol('loader')
	const loader = async (params: any) => {
		const result = await _loader(params)
		if (result instanceof Response) {
			return result
		}
		return {
			[specialSymbol]: result,
		} as any
	}

	function unwrap(raw: unknown) {
		if (typeof raw === 'object' && raw && specialSymbol in raw) return (raw as any)[specialSymbol]
		throw new Error('Loader data not found')
	}

	return {
		loader,
		useData() {
			return unwrap(useLoaderData())
		},
		useMaybeData() {
			const routeError = useRouteError()
			const raw = useLoaderData()
			if (routeError != null) return undefined
			return unwrap(raw)
		},
	}
}
