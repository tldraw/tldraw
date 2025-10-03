import { safeParseUrl } from '@tldraw/editor'

// Only allow multiplayer embeds. If we add additional routes later for example '/help' this won't match
const TLDRAW_APP_RE = /(^\/[f|p|r|ro|s|v]\/[^/]+\/?$)/

/** @public */
export const DEFAULT_EMBED_DEFINITIONS = [
	{
		type: 'tldraw',
		title: 'tldraw',
		hostnames: ['beta.tldraw.com', 'tldraw.com', 'localhost:3000'],
		minWidth: 300,
		minHeight: 300,
		width: 720,
		height: 500,
		doesResize: true,
		overridePermissions: {
			'allow-top-navigation': true,
		},
		toEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (urlObj && urlObj.pathname.match(TLDRAW_APP_RE)) {
				// Add the "clean=true" search param to the URL to hide the sidebar
				urlObj.searchParams.append('embed', 'true')
				return url
			}
			return
		},
		fromEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (urlObj && urlObj.pathname.match(TLDRAW_APP_RE)) {
				// Add the "clean=true" search param to the URL to hide the sidebar
				urlObj.searchParams.delete('embed')
				return url
			}
			return
		},
		embedOnPaste: false,
	},
	{
		type: 'figma',
		title: 'Figma',
		hostnames: ['figma.com'],
		width: 720,
		height: 500,
		doesResize: true,
		toEmbedUrl: (url) => {
			if (
				!!url.match(
					// eslint-disable-next-line no-useless-escape
					/https:\/\/([\w\.-]+\.)?figma.com\/(file|proto|design)\/([0-9a-zA-Z]{22,128})(?:\/.*)?$/
				) &&
				!url.includes('figma.com/embed')
			) {
				return `https://www.figma.com/embed?embed_host=share&url=${url}`
			}
			return
		},
		fromEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (urlObj && urlObj.pathname.match(/^\/embed\/?$/)) {
				const outUrl = urlObj.searchParams.get('url')
				if (outUrl) {
					return outUrl
				}
			}
			return
		},
		embedOnPaste: true,
	},
	{
		type: 'google_maps',
		title: 'Google Maps',
		hostnames: ['google.*'],
		width: 720,
		height: 500,
		doesResize: true,
		overridePermissions: {
			'allow-presentation': true,
		},
		toEmbedUrl: (url) => {
			if (url.includes('/maps/embed?')) {
				return url
			} else if (url.includes('/maps/')) {
				const match = url.match(/@(.*?),(.*?),(.*?)(z|m)/)
				let result: string
				if (match) {
					const [, lat, lng, zoomOrMeters, mapTypeSymbol] = match
					const mapType = mapTypeSymbol === 'z' ? 'roadmap' : 'satellite'
					// Note: This meters to zoom equation is a rough approximation and not canonical.
					const z =
						mapType === 'roadmap'
							? zoomOrMeters
							: -Math.log2(parseInt(zoomOrMeters) / 14772321) / 0.8
					const host = new URL(url).host.replace('www.', '')
					result = `https://${host}/maps/embed/v1/view?key=${process.env.NEXT_PUBLIC_GC_API_KEY}&center=${lat},${lng}&zoom=${z}&maptype=${mapType}`
				} else {
					result = ''
				}

				return result
			}
			return
		},
		fromEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (!urlObj) return

			const matches = urlObj.pathname.match(/^\/maps\/embed\/v1\/view\/?$/)
			if (matches && urlObj.searchParams.has('center') && urlObj.searchParams.get('zoom')) {
				const zoom = urlObj.searchParams.get('zoom') ?? '12'
				const mapType = urlObj.searchParams.get('maptype') ?? 'roadmap'
				// Note: This zoom to meters equation is a rough approximation and not canonical.
				const zoomOrMeters =
					mapType === 'roadmap' ? zoom : 14772321 * Math.pow(2, parseInt(zoom) * -0.8)
				const [lat, lon] = urlObj.searchParams.get('center')!.split(',')
				return `https://www.google.com/maps/@${lat},${lon},${zoomOrMeters}${mapType === 'roadmap' ? 'z' : 'm'}`
			}
			return
		},
		embedOnPaste: true,
	},
	{
		type: 'val_town',
		title: 'Val Town',
		hostnames: ['val.town'],
		minWidth: 260,
		minHeight: 100,
		width: 720,
		height: 500,
		doesResize: true,
		toEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			// e.g. extract "steveruizok/mathFact" from https://www.val.town/v/steveruizok/mathFact
			const matches = urlObj && urlObj.pathname.match(/\/v\/(.+)\/?/)
			if (matches) {
				return `https://www.val.town/embed/${matches[1]}`
			}
			return
		},
		fromEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			// e.g. extract "steveruizok/mathFact" from https://www.val.town/v/steveruizok/mathFact
			const matches = urlObj && urlObj.pathname.match(/\/embed\/(.+)\/?/)
			if (matches) {
				return `https://www.val.town/v/${matches[1]}`
			}
			return
		},
		embedOnPaste: true,
	},
	{
		type: 'codesandbox',
		title: 'CodeSandbox',
		hostnames: ['codesandbox.io'],
		minWidth: 300,
		minHeight: 300,
		width: 720,
		height: 500,
		doesResize: true,
		toEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			const matches = urlObj && urlObj.pathname.match(/\/s\/([^/]+)\/?/)
			if (matches) {
				return `https://codesandbox.io/embed/${matches[1]}`
			}
			return
		},
		fromEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			const matches = urlObj && urlObj.pathname.match(/\/embed\/([^/]+)\/?/)
			if (matches) {
				return `https://codesandbox.io/s/${matches[1]}`
			}
			return
		},
		embedOnPaste: true,
	},
	{
		type: 'codepen',
		title: 'Codepen',
		hostnames: ['codepen.io'],
		minWidth: 300,
		minHeight: 300,
		width: 520,
		height: 400,
		doesResize: true,
		toEmbedUrl: (url) => {
			const CODEPEN_URL_REGEXP = /https:\/\/codepen.io\/([^/]+)\/pen\/([^/]+)/
			const matches = url.match(CODEPEN_URL_REGEXP)
			if (matches) {
				const [_, user, id] = matches
				return `https://codepen.io/${user}/embed/${id}`
			}
			return
		},
		fromEmbedUrl: (url) => {
			const CODEPEN_EMBED_REGEXP = /https:\/\/codepen.io\/([^/]+)\/embed\/([^/]+)/
			const matches = url.match(CODEPEN_EMBED_REGEXP)
			if (matches) {
				const [_, user, id] = matches
				return `https://codepen.io/${user}/pen/${id}`
			}
			return
		},
		embedOnPaste: true,
	},
	{
		type: 'scratch',
		title: 'Scratch',
		hostnames: ['scratch.mit.edu'],
		width: 520,
		height: 400,
		doesResize: false,
		embedOnPaste: true,
		toEmbedUrl: (url) => {
			const SCRATCH_URL_REGEXP = /https?:\/\/scratch.mit.edu\/projects\/([^/]+)/
			const matches = url.match(SCRATCH_URL_REGEXP)
			if (matches) {
				const [_, id] = matches
				return `https://scratch.mit.edu/projects/embed/${id}`
			}
			return
		},
		fromEmbedUrl: (url) => {
			const SCRATCH_EMBED_REGEXP = /https:\/\/scratch.mit.edu\/projects\/embed\/([^/]+)/
			const matches = url.match(SCRATCH_EMBED_REGEXP)
			if (matches) {
				const [_, id] = matches
				return `https://scratch.mit.edu/projects/${id}`
			}
			return
		},
	},
	{
		type: 'youtube',
		title: 'YouTube',
		hostnames: ['*.youtube.com', 'youtube.com', 'youtu.be'],
		width: 800,
		height: 450,
		doesResize: true,
		overridePermissions: {
			'allow-presentation': true,
			'allow-popups-to-escape-sandbox': true,
		},
		isAspectRatioLocked: true,
		embedOnPaste: true,
		toEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (!urlObj) return

			const hostname = urlObj.hostname.replace(/^www./, '')
			if (hostname === 'youtu.be') {
				const videoId = urlObj.pathname.split('/').filter(Boolean)[0]
				const searchParams = new URLSearchParams(urlObj.search)
				const timeStart = searchParams.get('t')
				if (timeStart) {
					searchParams.set('start', timeStart)
					searchParams.delete('t')
				}
				const search = searchParams.toString() ? '?' + searchParams.toString() : ''
				return `https://www.youtube.com/embed/${videoId}${search}`
			} else if (
				(hostname === 'youtube.com' || hostname === 'm.youtube.com') &&
				urlObj.pathname.match(/^\/watch/)
			) {
				const videoId = urlObj.searchParams.get('v')
				const searchParams = new URLSearchParams(urlObj.search)
				searchParams.delete('v')
				const timeStart = searchParams.get('t')
				if (timeStart) {
					searchParams.set('start', timeStart)
					searchParams.delete('t')
				}
				const search = searchParams.toString() ? '?' + searchParams.toString() : ''
				return `https://www.youtube.com/embed/${videoId}${search}`
			}
			return
		},
		fromEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (!urlObj) return

			const hostname = urlObj.hostname.replace(/^www./, '')
			if (hostname === 'youtube.com') {
				const matches = urlObj.pathname.match(/^\/embed\/([^/]+)\/?/)
				if (matches) {
					const params = new URLSearchParams(urlObj.search)
					params.set('v', matches?.[1] ?? '')
					const timeStart = params.get('start')
					if (timeStart) {
						params.set('t', timeStart)
						params.delete('start')
					}
					return `https://www.youtube.com/watch?${params.toString()}`
				}
			}
			return
		},
	},
	{
		type: 'google_calendar',
		title: 'Google Calendar',
		hostnames: ['calendar.google.*'],
		width: 720,
		height: 500,
		minWidth: 460,
		minHeight: 360,
		doesResize: true,
		instructionLink: 'https://support.google.com/calendar/answer/41207?hl=en',
		overridePermissions: {
			'allow-popups-to-escape-sandbox': true,
		},
		embedOnPaste: true,
		toEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			const cidQs = urlObj?.searchParams.get('cid')

			if (urlObj?.pathname.match(/\/calendar\/u\/0/) && cidQs) {
				urlObj.pathname = '/calendar/embed'

				const keys = Array.from(urlObj.searchParams.keys())
				for (const key of keys) {
					urlObj.searchParams.delete(key)
				}
				urlObj.searchParams.set('src', cidQs)
				return urlObj.href
			}
			return
		},
		fromEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			const srcQs = urlObj?.searchParams.get('src')

			if (urlObj?.pathname.match(/\/calendar\/embed/) && srcQs) {
				urlObj.pathname = '/calendar/u/0'
				const keys = Array.from(urlObj.searchParams.keys())
				for (const key of keys) {
					urlObj.searchParams.delete(key)
				}
				urlObj.searchParams.set('cid', srcQs)
				return urlObj.href
			}
			return
		},
	},
	{
		type: 'google_slides',
		title: 'Google Slides',
		hostnames: ['docs.google.*'],
		width: 720,
		height: 500,
		minWidth: 460,
		minHeight: 360,
		doesResize: true,
		overridePermissions: {
			'allow-popups-to-escape-sandbox': true,
		},
		embedOnPaste: true,
		toEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)

			if (urlObj?.pathname.match(/^\/presentation/) && urlObj?.pathname.match(/\/pub\/?$/)) {
				urlObj.pathname = urlObj.pathname.replace(/\/pub$/, '/embed')
				const keys = Array.from(urlObj.searchParams.keys())
				for (const key of keys) {
					urlObj.searchParams.delete(key)
				}
				return urlObj.href
			}
			return
		},
		fromEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)

			if (urlObj?.pathname.match(/^\/presentation/) && urlObj?.pathname.match(/\/embed\/?$/)) {
				urlObj.pathname = urlObj.pathname.replace(/\/embed$/, '/pub')
				const keys = Array.from(urlObj.searchParams.keys())
				for (const key of keys) {
					urlObj.searchParams.delete(key)
				}
				return urlObj.href
			}
			return
		},
	},
	{
		type: 'github_gist',
		title: 'GitHub Gist',
		hostnames: ['gist.github.com'],
		width: 720,
		height: 500,
		doesResize: true,
		embedOnPaste: true,
		// Security warning:
		// Gists allow adding .json extensions to the URL which return JSONP.
		// Furthermore, the JSONP can include callbacks that execute arbitrary JavaScript.
		// It _is_ sandboxed by the iframe but we still want to disable it nonetheless.
		// We restrict the id to only allow hexdecimal characters to prevent this.
		// Read more:
		//   https://github.com/bhaveshk90/Content-Security-Policy-CSP-Bypass-Techniques
		//   https://github.com/renniepak/CSPBypass
		toEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (urlObj && urlObj.pathname.match(/\/([^/]+)\/([0-9a-f]+)$/)) {
				if (!url.split('/').pop()) return
				return url
			}
			return
		},
		fromEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (urlObj && urlObj.pathname.match(/\/([^/]+)\/([0-9a-f]+)$/)) {
				if (!url.split('/').pop()) return
				return url
			}
			return
		},
	},
	{
		type: 'replit',
		title: 'Replit',
		hostnames: ['replit.com'],
		width: 720,
		height: 500,
		doesResize: true,
		embedOnPaste: true,
		toEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (urlObj && urlObj.pathname.match(/\/@([^/]+)\/([^/]+)/)) {
				return `${url}?embed=true`
			}
			return
		},
		fromEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (
				urlObj &&
				urlObj.pathname.match(/\/@([^/]+)\/([^/]+)/) &&
				urlObj.searchParams.has('embed')
			) {
				urlObj.searchParams.delete('embed')
				return urlObj.href
			}
			return
		},
	},
	{
		type: 'felt',
		title: 'Felt',
		hostnames: ['felt.com'],
		width: 720,
		height: 500,
		doesResize: true,
		embedOnPaste: true,
		toEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (urlObj && urlObj.pathname.match(/^\/map\//)) {
				return urlObj.origin + '/embed' + urlObj.pathname
			}
			return
		},
		fromEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (urlObj && urlObj.pathname.match(/^\/embed\/map\//)) {
				urlObj.pathname = urlObj.pathname.replace(/^\/embed/, '')
				return urlObj.href
			}
			return
		},
	},
	{
		type: 'spotify',
		title: 'Spotify',
		hostnames: ['open.spotify.com'],
		width: 720,
		height: 500,
		minHeight: 500,
		overrideOutlineRadius: 12,
		doesResize: true,
		embedOnPaste: true,
		toEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (urlObj && urlObj.pathname.match(/^\/(artist|album)\//)) {
				return urlObj.origin + '/embed' + urlObj.pathname
			}
			return
		},
		fromEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (urlObj && urlObj.pathname.match(/^\/embed\/(artist|album)\//)) {
				return urlObj.origin + urlObj.pathname.replace(/^\/embed/, '')
			}
			return
		},
	},
	{
		type: 'vimeo',
		title: 'Vimeo',
		hostnames: ['vimeo.com', 'player.vimeo.com'],
		width: 640,
		height: 360,
		doesResize: true,
		isAspectRatioLocked: true,
		embedOnPaste: true,
		toEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (urlObj && urlObj.hostname === 'vimeo.com') {
				if (urlObj.pathname.match(/^\/[0-9]+/)) {
					return (
						'https://player.vimeo.com/video/' + urlObj.pathname.split('/')[1] + '?title=0&byline=0'
					)
				}
			}
			return
		},
		fromEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (urlObj && urlObj.hostname === 'player.vimeo.com') {
				const matches = urlObj.pathname.match(/^\/video\/([^/]+)\/?$/)
				if (matches) {
					return 'https://vimeo.com/' + matches[1]
				}
			}
			return
		},
	},
	{
		type: 'excalidraw',
		title: 'Excalidraw',
		hostnames: ['excalidraw.com'],
		width: 720,
		height: 500,
		doesResize: true,
		isAspectRatioLocked: true,
		embedOnPaste: true,
		toEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (urlObj && urlObj.hash.match(/#room=/)) {
				return url
			}
			return
		},
		fromEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (urlObj && urlObj.hash.match(/#room=/)) {
				return url
			}
			return
		},
	},
	{
		type: 'observable',
		title: 'Observable',
		hostnames: ['observablehq.com'],
		width: 720,
		height: 500,
		doesResize: true,
		isAspectRatioLocked: false,
		backgroundColor: '#fff',
		embedOnPaste: true,
		toEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (urlObj && urlObj.pathname.match(/^\/@([^/]+)\/([^/]+)\/?$/)) {
				return `${urlObj.origin}/embed${urlObj.pathname}?cell=*`
			}
			if (urlObj && urlObj.pathname.match(/^\/d\/([^/]+)\/?$/)) {
				const pathName = urlObj.pathname.replace(/^\/d/, '')
				return `${urlObj.origin}/embed${pathName}?cell=*`
			}

			return
		},
		fromEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (urlObj && urlObj.pathname.match(/^\/embed\/@([^/]+)\/([^/]+)\/?$/)) {
				return `${urlObj.origin}${urlObj.pathname.replace('/embed', '')}#cell-*`
			}
			if (urlObj && urlObj.pathname.match(/^\/embed\/([^/]+)\/?$/)) {
				return `${urlObj.origin}${urlObj.pathname.replace('/embed', '/d')}#cell-*`
			}

			return
		},
	},
	{
		type: 'desmos',
		title: 'Desmos',
		hostnames: ['desmos.com'],
		width: 700,
		height: 450,
		doesResize: true,
		embedOnPaste: true,
		toEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (
				urlObj &&
				urlObj.hostname === 'www.desmos.com' &&
				urlObj.pathname.match(/^\/calculator\/([^/]+)\/?$/) &&
				urlObj.search === '' &&
				urlObj.hash === ''
			) {
				return `${url}?embed`
			}
			return
		},
		fromEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (
				urlObj &&
				urlObj.hostname === 'www.desmos.com' &&
				urlObj.pathname.match(/^\/calculator\/([^/]+)\/?$/) &&
				urlObj.search === '?embed' &&
				urlObj.hash === ''
			) {
				return url.replace('?embed', '')
			}
			return
		},
	},
] as const satisfies readonly EmbedDefinition[]

/**
 * Permissions with note inline from
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-sandbox
 *
 * @public
 */
export const embedShapePermissionDefaults = {
	// ========================================================================================
	// Disabled permissions
	// ========================================================================================
	// [MDN] Experimental: Allows for downloads to occur without a gesture from the user.
	// [REASON] Disabled because otherwise the <iframe/> can trick the user on behalf of us to perform an action.
	'allow-downloads-without-user-activation': false,
	// [MDN] Allows for downloads to occur with a gesture from the user.
	// [REASON] Disabled because otherwise the <iframe/> can trick the user on behalf of us to perform an action.
	'allow-downloads': false,
	// [MDN] Lets the resource open modal windows.
	// [REASON] The <iframe/> could 'window.prompt("Enter your tldraw password")'.
	'allow-modals': false,
	// [MDN] Lets the resource lock the screen orientation.
	// [REASON] Would interfere with the tldraw interface.
	'allow-orientation-lock': false,
	// [MDN] Lets the resource use the Pointer Lock API.
	// [REASON] Maybe we should allow this for games embeds (scratch/codepen/codesandbox).
	'allow-pointer-lock': false,
	// [MDN] Allows popups (such as window.open(), target="_blank", or showModalDialog()). If this keyword is not used, the popup will silently fail to open.
	// [REASON] We want to allow embeds to link back to their original sites (e.g. YouTube).
	'allow-popups': true,
	// [MDN] Lets the sandboxed document open new windows without those windows inheriting the sandboxing. For example, this can safely sandbox an advertisement without forcing the same restrictions upon the page the ad links to.
	// [REASON] We shouldn't allow popups as a embed could pretend to be us by opening a mocked version of tldraw. This is very unobvious when it is performed as an action within our app.
	'allow-popups-to-escape-sandbox': false,
	// [MDN] Lets the resource start a presentation session.
	// [REASON] Prevents embed from navigating away from tldraw and pretending to be us.
	'allow-presentation': false,
	// [MDN] Experimental: Lets the resource request access to the parent's storage capabilities with the Storage Access API.
	// [REASON] We don't want anyone else to access our storage.
	'allow-storage-access-by-user-activation': false,
	// [MDN] Lets the resource navigate the top-level browsing context (the one named _top).
	// [REASON] Prevents embed from navigating away from tldraw and pretending to be us.
	'allow-top-navigation': false,
	// [MDN] Lets the resource navigate the top-level browsing context, but only if initiated by a user gesture.
	// [REASON] Prevents embed from navigating away from tldraw and pretending to be us.
	'allow-top-navigation-by-user-activation': false,
	// ========================================================================================
	// Enabled permissions
	// ========================================================================================
	// [MDN] Lets the resource run scripts (but not create popup windows).
	'allow-scripts': true,
	// [MDN] If this token is not used, the resource is treated as being from a special origin that always fails the same-origin policy (potentially preventing access to data storage/cookies and some JavaScript APIs).
	'allow-same-origin': true,
	// [MDN] Allows the resource to submit forms. If this keyword is not used, form submission is blocked.
	'allow-forms': true,
} as const

/** @public */
export type TLEmbedShapePermissions = { [K in keyof typeof embedShapePermissionDefaults]?: boolean }

/** @public */
export interface EmbedDefinition {
	readonly type: string
	readonly title: string
	readonly hostnames: readonly string[]
	readonly minWidth?: number
	readonly minHeight?: number
	readonly width: number
	readonly height: number
	readonly doesResize: boolean
	readonly isAspectRatioLocked?: boolean
	readonly overridePermissions?: TLEmbedShapePermissions
	readonly instructionLink?: string
	readonly backgroundColor?: string
	readonly embedOnPaste?: boolean
	// TODO: FIXME this is ugly be required because some embeds have their own border radius for example spotify embeds
	readonly overrideOutlineRadius?: number
	// eslint-disable-next-line @typescript-eslint/method-signature-style
	readonly toEmbedUrl: (url: string) => string | undefined
	// eslint-disable-next-line @typescript-eslint/method-signature-style
	readonly fromEmbedUrl: (url: string) => string | undefined
}

/** @public */
export interface CustomEmbedDefinition extends EmbedDefinition {
	readonly icon: string
}

/** @public */
export type TLEmbedDefinition = EmbedDefinition | CustomEmbedDefinition

/** @public */
export type DefaultEmbedDefinitionType = (typeof DEFAULT_EMBED_DEFINITIONS)[number]['type']

const DEFAULT_EMBED_DEFINITION_TYPES = DEFAULT_EMBED_DEFINITIONS.map(
	(def) => def.type
) as DefaultEmbedDefinitionType[]

/** @public */
export function isDefaultEmbedDefinitionType(type: string): type is DefaultEmbedDefinitionType {
	return DEFAULT_EMBED_DEFINITION_TYPES.includes(type as DefaultEmbedDefinitionType)
}

/** @public */
export function isCustomEmbedDefinition(
	def: EmbedDefinition | CustomEmbedDefinition
): def is CustomEmbedDefinition {
	return 'icon' in def
}
