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
 * Properties for the embed shape, which displays embedded content from external services.
 *
 * @public
 */
export interface TLEmbedShapeProps {
	/** Width of the embed shape in pixels */
	w: number
	/** Height of the embed shape in pixels */
	h: number
	/** URL of the content to embed (supports YouTube, Figma, CodePen, etc.) */
	url: string
}

/**
 * An embed shape displays external content like YouTube videos, Figma designs, CodePen demos,
 * and other embeddable content within the tldraw canvas.
 *
 * @public
 * @example
 * ```ts
 * const embedShape: TLEmbedShape = {
 *   id: createShapeId(),
 *   typeName: 'shape',
 *   type: 'embed',
 *   x: 200,
 *   y: 200,
 *   rotation: 0,
 *   index: 'a1',
 *   parentId: 'page:page1',
 *   isLocked: false,
 *   opacity: 1,
 *   props: {
 *     w: 560,
 *     h: 315,
 *     url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
 *   },
 *   meta: {}
 * }
 * ```
 */
export type TLEmbedShape = TLBaseShape<'embed', TLEmbedShapeProps>

/**
 * Validation schema for embed shape properties.
 *
 * @public
 * @example
 * ```ts
 * // Validate embed shape properties
 * const isValidUrl = embedShapeProps.url.isValid('https://youtube.com/watch?v=abc123')
 * const isValidSize = embedShapeProps.w.isValid(560)
 * ```
 */
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

/**
 * Version identifiers for embed shape migrations.
 *
 * @public
 */
export { Versions as embedShapeVersions }

/**
 * Migration sequence for embed shape properties across different schema versions.
 * Handles URL transformations and removal of deprecated properties.
 *
 * @public
 */
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
				} catch {
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
