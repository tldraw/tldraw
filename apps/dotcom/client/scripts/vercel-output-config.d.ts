// copied from https://github.com/vercel/vercel/blob/f8c893bb156d12284866c801dcd3e5fe3ef08e20/packages/gatsby-plugin-vercel-builder/src/types.d.ts#L4
// seems like vercel don't export a good version of this type anywhere at the time of writing

import type { Images } from '@vercel/build-utils'

export type Config = {
	version: 3
	routes?: Route[]
	images?: Images
	wildcard?: WildcardConfig
	overrides?: OverrideConfig
	cache?: string[]
}

type Route = Source | Handler

type Source = {
	src: string
	dest?: string
	headers?: Record<string, string>
	methods?: string[]
	continue?: boolean
	caseSensitive?: boolean
	check?: boolean
	status?: number
	has?: Array<HostHasField | HeaderHasField | CookieHasField | QueryHasField>
	missing?: Array<HostHasField | HeaderHasField | CookieHasField | QueryHasField>
	locale?: Locale
	middlewarePath?: string
}

type Locale = {
	redirect?: Record<string, string>
	cookie?: string
}

type HostHasField = {
	type: 'host'
	value: string
}

type HeaderHasField = {
	type: 'header'
	key: string
	value?: string
}

type CookieHasField = {
	type: 'cookie'
	key: string
	value?: string
}

type QueryHasField = {
	type: 'query'
	key: string
	value?: string
}

type HandleValue =
	| 'rewrite'
	| 'filesystem' // check matches after the filesystem misses
	| 'resource'
	| 'miss' // check matches after every filesystem miss
	| 'hit'
	| 'error' //  check matches after error (500, 404, etc.)

type Handler = {
	handle: HandleValue
	src?: string
	dest?: string
	status?: number
}

type WildCard = {
	domain: string
	value: string
}

type WildcardConfig = Array<WildCard>

type Override = {
	path?: string
	contentType?: string
}

type OverrideConfig = Record<string, Override>

type ServerlessFunctionConfig = {
	handler: string
	runtime: string
	memory?: number
	maxDuration?: number
	environment?: Record<string, string>[]
	allowQuery?: string[]
	regions?: string[]
}

export type NodejsServerlessFunctionConfig = ServerlessFunctionConfig & {
	launcherType: 'Nodejs'
	shouldAddHelpers?: boolean // default: false
	shouldAddSourceMapSupport?: boolean // default: false
}

export type PrerenderFunctionConfig = {
	expiration: number | false
	group?: number
	bypassToken?: string
	fallback?: string
	allowQuery?: string[]
}
