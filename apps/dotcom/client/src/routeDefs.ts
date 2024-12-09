import { assert } from 'tldraw'

export const ROUTES = {
	legacyRoot: '/',
	legacyNewPage: '/new',
	legacyNewPage2: '/r',
	legacyRoom: '/r/:roomId',
	touchscreenSidePanel: '/ts-side',
	legacyRoomHistory: '/r/:boardId/history',
	legacyRoomHistorySnapshot: '/r/:boardId/history/:timestamp',
	legacySnapshot: '/s/:roomId',
	legacyReadonly: '/ro/:roomId',
	legacyReadonlyOld: '/v/:roomId',

	tlaRoot: `/q`,
	tlaFile: `/q/f/:fileSlug`,
	tlaLocalFile: `/q/lf/:fileSlug`,
	tlaPlayground: `/q/playground`,
	tlaPublish: `/q/p/:fileSlug`,
} as const

export const routes: {
	[key in keyof typeof ROUTES]: PathFn<(typeof ROUTES)[key]>
} = Object.fromEntries(
	Object.entries(ROUTES).map(([key, path]) => [
		key,
		((routeParamsOrOptions: any, options: any) => {
			if (path.includes('/:')) {
				return compilePath(path, routeParamsOrOptions, options)
			} else {
				return compilePath(path, null, routeParamsOrOptions)
			}
		}) satisfies PathFn<any>,
	])
) as any

type ExtractParamNamesFromPath<route extends string> = route extends `/${infer path}`
	? ExtractParamNamesFromPathSegments<SplitPath<path>>
	: never

type SplitPath<path extends string> = path extends `${infer segment}/${infer rest}`
	? segment | SplitPath<rest>
	: path

type ExtractParamNamesFromPathSegments<segments extends string> = segments extends `:${infer param}`
	? param
	: never

interface PathOptions {
	searchParams?: ConstructorParameters<typeof URLSearchParams>[0]
	asUrl?: boolean
}

type PathFn<path extends `/${string}`> = path extends `${string}:${string}:${string}`
	? // has at least two params
		(
			routeParams: Record<ExtractParamNamesFromPath<path>, string>,
			searchParams?: PathOptions
		) => string
	: path extends `${string}:${string}`
		? // only has one param, so we can have a single string
			(param: string, searchParams?: PathOptions) => string
		: (searchParams?: PathOptions) => string

function compilePath(
	path: string,
	routeParams: string | Record<string, string> | null,
	options?: PathOptions
) {
	const search = new URLSearchParams(options?.searchParams).toString()
	if (!path.includes(':')) {
		assert(
			routeParams === null || Object.keys(routeParams).length === 0,
			`Route params are not allowed for path ${path}`
		)
		return path + (search ? `?${search}` : '')
	}
	assert(routeParams !== null, `Route params are required for path ${path}`)

	path =
		path.replace(/:\w+/g, (match) =>
			// if there's only one param, routeParams will be a string
			typeof routeParams === 'string' ? routeParams : routeParams[match.slice(1)]
		) + (search ? `?${search}` : '')

	if (options?.asUrl) {
		return `${window.location.origin}${path}`
	}

	return path
}
