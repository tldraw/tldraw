import { T } from '@tldraw/validate'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RETIRED_DOWN_MIGRATION, RecordPropsType } from '../recordsWithProps'
import { TLBaseShape } from './TLBaseShape'

// Only allow multiplayer embeds. If we add additional routes later for example '/help' this won't match
const TLDRAW_APP_RE = /(^\/r\/[^/]+\/?$)/

const safeParseUrl = (url: string) => {
	try {
		return new URL(url)
	} catch (err) {
		return
	}
}

/** @public */
export const EMBED_DEFINITIONS = [
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
				return url
			}
			return
		},
		fromEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (urlObj && urlObj.pathname.match(TLDRAW_APP_RE)) {
				return url
			}
			return
		},
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
					/https:\/\/([\w\.-]+\.)?figma.com\/(file|proto)\/([0-9a-zA-Z]{22,128})(?:\/.*)?$/
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
			if (url.includes('/maps/')) {
				const match = url.match(/@(.*),(.*),(.*)z/)
				let result: string
				if (match) {
					const [, lat, lng, z] = match
					const host = new URL(url).host.replace('www.', '')
					result = `https://${host}/maps/embed/v1/view?key=${process.env.NEXT_PUBLIC_GC_API_KEY}&center=${lat},${lng}&zoom=${z}`
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
				const zoom = urlObj.searchParams.get('zoom')
				const [lat, lon] = urlObj.searchParams.get('center')!.split(',')
				return `https://www.google.com/maps/@${lat},${lon},${zoom}z`
			}
			return
		},
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
	},
	{
		type: 'scratch',
		title: 'Scratch',
		hostnames: ['scratch.mit.edu'],
		width: 520,
		height: 400,
		doesResize: false,
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
		toEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (!urlObj) return

			const hostname = urlObj.hostname.replace(/^www./, '')
			if (hostname === 'youtu.be') {
				const videoId = urlObj.pathname.split('/').filter(Boolean)[0]
				return `https://www.youtube.com/embed/${videoId}`
			} else if (
				(hostname === 'youtube.com' || hostname === 'm.youtube.com') &&
				urlObj.pathname.match(/^\/watch/)
			) {
				const videoId = urlObj.searchParams.get('v')
				return `https://www.youtube.com/embed/${videoId}`
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
					return `https://www.youtube.com/watch?v=${matches[1]}`
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
		toEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (urlObj && urlObj.pathname.match(/\/([^/]+)\/([^/]+)/)) {
				if (!url.split('/').pop()) return
				return url
			}
			return
		},
		fromEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			if (urlObj && urlObj.pathname.match(/\/([^/]+)\/([^/]+)/)) {
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
export const embedShapeProps = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	url: T.string,
}

/** @public */
export type TLEmbedShapeProps = RecordPropsType<typeof embedShapeProps>

/** @public */
export type TLEmbedShape = TLBaseShape<'embed', TLEmbedShapeProps>

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
	// TODO: FIXME this is ugly be required because some embeds have their own border radius for example spotify embeds
	readonly overrideOutlineRadius?: number
	readonly toEmbedUrl: (url: string) => string | undefined
	readonly fromEmbedUrl: (url: string) => string | undefined
}

const Versions = createShapePropsMigrationIds('embed', {
	GenOriginalUrlInEmbed: 1,
	RemoveDoesResize: 2,
	RemoveTmpOldUrl: 3,
	RemovePermissionOverrides: 4,
})

export { Versions as embedShapeVersions }

/** @public */
export const embedShapeMigrations = createShapePropsMigrationSequence({
	sequence: [
		{
			id: Versions.GenOriginalUrlInEmbed,
			// add tmpOldUrl property
			up: (props) => {
				try {
					const url = props.url
					const host = new URL(url).host.replace('www.', '')
					let originalUrl
					for (const localEmbedDef of EMBED_DEFINITIONS) {
						if ((localEmbedDef as EmbedDefinition).hostnames.includes(host)) {
							try {
								originalUrl = localEmbedDef.fromEmbedUrl(url)
							} catch (err) {
								console.warn(err)
							}
						}
					}

					props.tmpOldUrl = props.url
					props.url = originalUrl ?? ''
				} catch (e) {
					props.url = ''
					props.tmpOldUrl = props.url
				}
			},
			down: RETIRED_DOWN_MIGRATION,
		},
		{
			id: Versions.RemoveDoesResize,
			up: (props) => {
				delete props.doesResize
			},
			down: RETIRED_DOWN_MIGRATION,
		},
		{
			id: Versions.RemoveTmpOldUrl,
			up: (props) => {
				delete props.tmpOldUrl
			},
			down: RETIRED_DOWN_MIGRATION,
		},
		{
			id: Versions.RemovePermissionOverrides,
			up: (props) => {
				delete props.overridePermissions
			},
			down: RETIRED_DOWN_MIGRATION,
		},
	],
})
