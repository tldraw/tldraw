import { safeParseUrl } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { TLBaseShape } from './TLBaseShape'

// Only allow multiplayer embeds. If we add additional routes later for example '/help' this won't match
const TLDRAW_APP_RE = /(^\/r\/[^/]+\/?$)/

const EMBED_DEFINITIONS = [
	{
		hostnames: ['beta.tldraw.com', 'tldraw.com', 'localhost:3000'],
		fromEmbedUrl: (url: string) => {
			const urlObj = safeParseUrl(url)
			if (urlObj && urlObj.pathname.match(TLDRAW_APP_RE)) {
				return url
			}
			return
		},
	},
	{
		hostnames: ['figma.com'],
		fromEmbedUrl: (url: string) => {
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
		hostnames: ['google.*'],
		fromEmbedUrl: (url: string) => {
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
		hostnames: ['val.town'],
		fromEmbedUrl: (url: string) => {
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
		hostnames: ['codesandbox.io'],
		fromEmbedUrl: (url: string) => {
			const urlObj = safeParseUrl(url)
			const matches = urlObj && urlObj.pathname.match(/\/embed\/([^/]+)\/?/)
			if (matches) {
				return `https://codesandbox.io/s/${matches[1]}`
			}
			return
		},
	},
	{
		hostnames: ['codepen.io'],
		fromEmbedUrl: (url: string) => {
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
		hostnames: ['scratch.mit.edu'],
		fromEmbedUrl: (url: string) => {
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
		hostnames: ['*.youtube.com', 'youtube.com', 'youtu.be'],
		fromEmbedUrl: (url: string) => {
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
		hostnames: ['calendar.google.*'],
		fromEmbedUrl: (url: string) => {
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
		hostnames: ['docs.google.*'],
		fromEmbedUrl: (url: string) => {
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
		hostnames: ['gist.github.com'],
		fromEmbedUrl: (url: string) => {
			const urlObj = safeParseUrl(url)
			if (urlObj && urlObj.pathname.match(/\/([^/]+)\/([^/]+)/)) {
				if (!url.split('/').pop()) return
				return url
			}
			return
		},
	},
	{
		hostnames: ['replit.com'],
		fromEmbedUrl: (url: string) => {
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
		hostnames: ['felt.com'],
		fromEmbedUrl: (url: string) => {
			const urlObj = safeParseUrl(url)
			if (urlObj && urlObj.pathname.match(/^\/embed\/map\//)) {
				urlObj.pathname = urlObj.pathname.replace(/^\/embed/, '')
				return urlObj.href
			}
			return
		},
	},
	{
		hostnames: ['open.spotify.com'],
		fromEmbedUrl: (url: string) => {
			const urlObj = safeParseUrl(url)
			if (urlObj && urlObj.pathname.match(/^\/embed\/(artist|album)\//)) {
				return urlObj.origin + urlObj.pathname.replace(/^\/embed/, '')
			}
			return
		},
	},
	{
		hostnames: ['vimeo.com', 'player.vimeo.com'],
		fromEmbedUrl: (url: string) => {
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
		hostnames: ['excalidraw.com'],
		fromEmbedUrl: (url: string) => {
			const urlObj = safeParseUrl(url)
			if (urlObj && urlObj.hash.match(/#room=/)) {
				return url
			}
			return
		},
	},
	{
		hostnames: ['observablehq.com'],
		fromEmbedUrl: (url: string) => {
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
		hostnames: ['desmos.com'],
		fromEmbedUrl: (url: string) => {
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
]

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
export interface TLEmbedShapeProps {
	w: number
	h: number
	url: string
}

/** @public */
export type TLEmbedShape = TLBaseShape<'embed', TLEmbedShapeProps>

/** @public */
export const embedShapeProps: RecordProps<TLEmbedShape> = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	url: T.string,
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
						if (localEmbedDef.hostnames.includes(host)) {
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
			down: 'retired',
		},
		{
			id: Versions.RemoveDoesResize,
			up: (props) => {
				delete props.doesResize
			},
			down: 'retired',
		},
		{
			id: Versions.RemoveTmpOldUrl,
			up: (props) => {
				delete props.tmpOldUrl
			},
			down: 'retired',
		},
		{
			id: Versions.RemovePermissionOverrides,
			up: (props) => {
				delete props.overridePermissions
			},
			down: 'retired',
		},
	],
})
