import { BoxModel, PageRecordType, TLPageId, TLShapeId, createShapeId } from '@tldraw/tlschema'
import { exhaustiveSwitchError } from '@tldraw/utils'
import { Editor } from '../editor/Editor'
import { Box } from '../primitives/Box'

/** @public */
export type TLDeepLink =
	| {
			type: 'shapes'
			shapeIds: TLShapeId[]
	  }
	| { type: 'viewport'; bounds: BoxModel; pageId?: TLPageId }
	| { type: 'page'; pageId: TLPageId }

/**
 * Converts a deep link descriptor to a url-safe string
 *
 * @example
 * ```ts
 * const url = `https://example.com?d=${createDeepLinkString({ type: 'shapes', shapeIds: ['shape:1', 'shape:2'] })}`
 * navigator.clipboard.writeText(url)
 * ```
 *
 * @param deepLink - the deep link descriptor
 * @returns a url-safe string
 *
 * @public
 */
export function createDeepLinkString(deepLink: TLDeepLink): string {
	switch (deepLink.type) {
		case 'shapes': {
			const ids = deepLink.shapeIds.map((id) => encodeId(id.slice('shape:'.length)))
			return `s${ids.join('.')}`
		}
		case 'page': {
			return 'p' + encodeId(PageRecordType.parseId(deepLink.pageId))
		}
		case 'viewport': {
			const { bounds, pageId } = deepLink
			let res = `v${Math.round(bounds.x)}.${Math.round(bounds.y)}.${Math.round(bounds.w)}.${Math.round(bounds.h)}`
			if (pageId) {
				res += '.' + encodeId(PageRecordType.parseId(pageId))
			}
			return res
		}
		default:
			exhaustiveSwitchError(deepLink)
	}
}

/**
 * Parses a string created by {@link createDeepLinkString} back into a deep link descriptor.
 *
 * @param deepLinkString - the deep link string
 * @returns a deep link descriptor
 *
 * @public
 */
export function parseDeepLinkString(deepLinkString: string): TLDeepLink {
	const type = deepLinkString[0]
	switch (type) {
		case 's': {
			const shapeIds = deepLinkString
				.slice(1)
				.split('.')
				.filter(Boolean)
				.map((id) => createShapeId(decodeURIComponent(id)))
			return { type: 'shapes', shapeIds }
		}
		case 'p': {
			const pageId = PageRecordType.createId(decodeURIComponent(deepLinkString.slice(1)))
			return { type: 'page', pageId }
		}
		case 'v': {
			const [x, y, w, h, pageId] = deepLinkString.slice(1).split('.')
			return {
				type: 'viewport',
				bounds: new Box(Number(x), Number(y), Number(w), Number(h)),
				pageId: pageId ? PageRecordType.createId(decodeURIComponent(pageId)) : undefined,
			}
		}
		default:
			throw Error('Invalid deep link string')
	}
}

function encodeId(str: string): string {
	// need to encode dots because they are used as separators
	return encodeURIComponent(str).replace(/\./g, '%2E')
}

/** @public */
export interface TLDeepLinkOptions {
	/**
	 * The name of the url search param to use for the deep link.
	 *
	 * Defaults to `'d'`
	 */
	param?: string
	/**
	 * The debounce time in ms for updating the url.
	 */
	debounceMs?: number
	/**
	 * Should return the current url to augment with a deep link query parameter.
	 * If you supply this function, you must also supply an `onChange` function.
	 */
	getUrl?(editor: Editor): string | URL
	/**
	 * Should return the current deep link target.
	 * Defaults to returning the current page and viewport position.
	 */
	getTarget?(editor: Editor): TLDeepLink
	/**
	 * This is fired when the URL is updated.
	 *
	 * If not supplied, the default behavior is to update `window.location`.
	 *
	 * @param url - the updated URL
	 */
	onChange?(url: URL, editor: Editor): void
}
