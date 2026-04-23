import {
	Editor,
	FileHelpers,
	TLClipboardWriteInfo,
	TLExternalContentSource,
	VecLike,
	activeElementShouldCaptureKeys,
	assert,
	compact,
	getGlobalDocument,
	isDefined,
	preventDefault,
	uniq,
	useEditor,
	useMaybeEditor,
	useValue,
} from '@tldraw/editor'
import lz from 'lz-string'
import { useCallback, useEffect } from 'react'
import { defaultHandleExternalTextContent } from '../../defaultExternalContentHandlers'
import { TLDRAW_CUSTOM_PNG_MIME_TYPE, getCanonicalClipboardReadType } from '../../utils/clipboard'
import { TLUiEventSource, useUiEvents } from '../context/events'
import { pasteFiles } from './clipboard/pasteFiles'
import { pasteUrl } from './clipboard/pasteUrl'

/**
 * Resolves paste modifier keys into plain-text and position behavior.
 * Alt/Option inverts the paste-at-cursor user preference.
 *
 * @param isShift - Whether the Shift key is pressed (indicates plain text paste)
 * @param isAlt - Whether the Alt/Option key is pressed (inverts paste position preference)
 * @param pasteAtCursorPref - The user's preference for pasting at the cursor (true) or center (false)
 *
 * @internal
 */
export function resolvePasteModifiers(
	isShift: boolean,
	isAlt: boolean,
	pasteAtCursorPref: boolean
) {
	return {
		isPlainText: isShift,
		pasteAtCursor: isAlt ? !pasteAtCursorPref : pasteAtCursorPref,
	}
}

// Expected paste mime types. The earlier in this array they appear, the higher preference we give
// them. For example, we prefer the `web image/png+tldraw` type to plain `image/png` as it does not
// strip some of the extra metadata we write into it.
const expectedPasteFileMimeTypes = [
	TLDRAW_CUSTOM_PNG_MIME_TYPE,
	'image/png',
	'image/jpeg',
	'image/webp',
	'image/svg+xml',
] satisfies string[]

/**
 * Strip HTML tags from a string.
 * @param html - The HTML to strip.
 * @internal
 */
function stripHtml(html: string) {
	// See <https://github.com/developit/preact-markup/blob/4788b8d61b4e24f83688710746ee36e7464f7bbc/src/parse-markup.js#L60-L69>
	const doc = getGlobalDocument().implementation.createHTMLDocument('')
	doc.documentElement.innerHTML = html.trim()
	return doc.body.textContent || doc.body.innerText || ''
}

/**
 * Extract iframe src and dimensions from an HTML string containing an iframe element.
 * Tries width/height HTML attributes first, then falls back to pixel values in the
 * style attribute, then to sensible defaults.
 * Returns null if no valid iframe is found.
 * @internal
 */
export function extractIframeFromHtml(
	html: string
): { src: string; width: number; height: number } | null {
	if (!html.includes('<iframe')) return null
	const doc = new DOMParser().parseFromString(html, 'text/html')
	const iframe = doc.querySelector('iframe')
	if (!iframe) return null
	const src = iframe.getAttribute('src')
	if (!src || !isValidHttpURL(src)) return null

	const attrWidth = parseInt(iframe.getAttribute('width') || '', 10)
	const attrHeight = parseInt(iframe.getAttribute('height') || '', 10)

	let styleWidth = NaN
	let styleHeight = NaN
	const style = iframe.getAttribute('style')
	if (style) {
		const wMatch = style.match(/\bwidth:\s*(\d+)px/)
		const hMatch = style.match(/\bheight:\s*(\d+)px/)
		if (wMatch) styleWidth = parseInt(wMatch[1], 10)
		if (hMatch) styleHeight = parseInt(hMatch[1], 10)
	}

	const width = attrWidth || styleWidth || 425
	const height = attrHeight || styleHeight || 350
	return { src, width, height }
}

/** @public */
export const isValidHttpURL = (url: string) => {
	try {
		const u = new URL(url)
		return u.protocol === 'http:' || u.protocol === 'https:'
	} catch {
		return false
	}
}

/** @public */
const getValidHttpURLList = (url: string) => {
	const urls = url.split(/[\n\s]/)
	for (const url of urls) {
		try {
			const u = new URL(url)
			if (!(u.protocol === 'http:' || u.protocol === 'https:')) {
				return
			}
		} catch {
			return
		}
	}
	return uniq(urls)
}

/** @public */
const isSvgText = (text: string) => {
	return /^<svg/.test(text)
}

/**
 * Get whether to disallow clipboard events.
 *
 * @internal
 */
function areShortcutsDisabled(editor: Editor) {
	return (
		editor.menus.hasAnyOpenMenus() ||
		activeElementShouldCaptureKeys(false, editor.getContainerDocument())
	)
}

import { putPastedExternalContent } from './clipboard/putPastedContent'
export { putPastedExternalContent } from './clipboard/putPastedContent'

/**
 * Handle text pasted into the editor.
 * @param editor - The editor instance.
 * @param data - The text to paste.
 * @param point - The point at which to paste the text.
 * @internal
 */
const handleText = (
	editor: Editor,
	data: string,
	point?: VecLike,
	sources?: TLExternalContentSource[],
	clipboardPasteSource: 'native-event' | 'clipboard-read' = 'native-event'
) => {
	const validUrlList = getValidHttpURLList(data)
	if (validUrlList) {
		for (const url of validUrlList) {
			pasteUrl(editor, url, point, sources, clipboardPasteSource)
		}
	} else if (isValidHttpURL(data)) {
		pasteUrl(editor, data, point, sources, clipboardPasteSource)
	} else if (isSvgText(data)) {
		editor.markHistoryStoppingPoint('paste')
		putPastedExternalContent(
			editor,
			{
				type: 'svg-text',
				text: data,
				point,
				sources,
			},
			{ source: clipboardPasteSource, point }
		)
	} else {
		editor.markHistoryStoppingPoint('paste')
		putPastedExternalContent(
			editor,
			{
				type: 'text',
				text: data,
				point,
				sources,
			},
			{ source: clipboardPasteSource, point }
		)
	}
}

/**
 * Something found on the clipboard, either through the event's clipboard data or the browser's clipboard API.
 * @internal
 */
type ClipboardThing =
	| {
			type: 'file'
			source: Promise<File | null>
	  }
	| {
			type: 'blob'
			source: Promise<Blob | null>
	  }
	| {
			type: 'url'
			source: Promise<string>
	  }
	| {
			type: 'html'
			source: Promise<string>
	  }
	| {
			type: 'text'
			source: Promise<string>
	  }
	| {
			type: string
			source: Promise<string>
	  }

/**
 * Handle a paste using event clipboard data. This is the "original"
 * paste method that uses the clipboard data from the paste event.
 * https://developer.mozilla.org/en-US/docs/Web/API/ClipboardEvent/clipboardData
 *
 * @param editor - The editor
 * @param clipboardData - The clipboard data
 * @param point - The point to paste at
 * @internal
 */
const handlePasteFromEventClipboardData = async (
	editor: Editor,
	clipboardData: DataTransfer,
	point?: VecLike
) => {
	// Do not paste while in any editing state
	if (editor.getEditingShapeId() !== null) return

	if (!clipboardData) {
		throw Error('No clipboard data')
	}

	const things: ClipboardThing[] = []

	for (const item of Object.values(clipboardData.items)) {
		switch (item.kind) {
			case 'file': {
				// files are always blobs
				things.push({
					type: 'file',
					source: new Promise((r) => r(item.getAsFile())) as Promise<File | null>,
				})
				break
			}
			case 'string': {
				// strings can be text or html
				if (item.type === 'text/html') {
					things.push({
						type: 'html',
						source: new Promise((r) => item.getAsString(r)) as Promise<string>,
					})
				} else if (item.type === 'text/plain') {
					things.push({
						type: 'text',
						source: new Promise((r) => item.getAsString(r)) as Promise<string>,
					})
				} else {
					things.push({ type: item.type, source: new Promise((r) => item.getAsString(r)) })
				}
				break
			}
		}
	}

	handleClipboardThings(editor, things, point, 'native-event')
}

/**
 * Handle a paste using items retrieved from the Clipboard API.
 * https://developer.mozilla.org/en-US/docs/Web/API/ClipboardItem
 *
 * @param editor - The editor
 * @param clipboardItems - The clipboard items to handle
 * @param point - The point to paste at
 * @internal
 */
const handlePasteFromClipboardApi = async ({
	editor,
	clipboardItems,
	point,
	fallbackFiles,
	clipboardPasteSource,
}: {
	editor: Editor
	clipboardItems: ClipboardItem[]
	point?: VecLike
	fallbackFiles?: File[]
	clipboardPasteSource: 'native-event' | 'clipboard-read'
}) => {
	// We need to populate the array of clipboard things
	// based on the ClipboardItems from the Clipboard API.
	// This is done in a different way than when using
	// the clipboard data from the paste event.

	const things: ClipboardThing[] = []

	for (const item of clipboardItems) {
		const matchingTypes = expectedPasteFileMimeTypes.filter((t) => item.types.includes(t))
		if (matchingTypes.length > 0) {
			things.push({
				type: 'blob',
				source: (async () => {
					for (const type of matchingTypes) {
						const blob = await item.getType(type)
						// Chrome 147 stable regression: web custom-format blobs come back as
						// 0 bytes when clipboard.read() runs inside a paste event. Fixed in
						// Chrome Canary; expected to ship to stable in a later release. Until
						// then, skip empty payloads and fall back to the next preferred type
						// (usually image/png, which means Cmd+V paste of a tldraw-copied PNG
						// loses the pHYs DPI chunk and pastes at 2x size on affected Chrome
						// stable versions). Right-click Paste continues to work at 1x because
						// that path calls clipboard.read() from a click handler, not a paste
						// event. Remove this workaround when the fix ships to stable.
						// https://issues.chromium.org/issues/505045934
						if (blob.size === 0) continue
						return FileHelpers.rewriteMimeType(blob, getCanonicalClipboardReadType(type))
					}
					return null
				})(),
			})
		}

		if (item.types.includes('text/html')) {
			things.push({
				type: 'html',
				source: (async () => {
					const blob = await item.getType('text/html')
					return await FileHelpers.blobToText(blob)
				})(),
			})
		}

		if (item.types.includes('text/uri-list')) {
			things.push({
				type: 'url',
				source: (async () => {
					const blob = await item.getType('text/uri-list')
					return await FileHelpers.blobToText(blob)
				})(),
			})
		}

		if (item.types.includes('text/plain')) {
			things.push({
				type: 'text',
				source: (async () => {
					const blob = await item.getType('text/plain')
					return await FileHelpers.blobToText(blob)
				})(),
			})
		}
	}

	if (fallbackFiles?.length && things.length === 1 && things[0].type === 'text') {
		things.pop()
		things.push(
			...fallbackFiles.map((f): ClipboardThing => ({ type: 'file', source: Promise.resolve(f) }))
		)
	} else if (fallbackFiles?.length && things.length === 0) {
		// Files pasted in Safari from your computer don't have types, so we need to use the fallback files directly
		// if they're available. This only works if pasted keyboard shortcuts. Pasting from the menu in Safari seems to never
		// let you access files that are copied from your computer.
		things.push(
			...fallbackFiles.map((f): ClipboardThing => ({ type: 'file', source: Promise.resolve(f) }))
		)
	}

	return await handleClipboardThings(editor, things, point, clipboardPasteSource)
}

async function handleClipboardThings(
	editor: Editor,
	things: ClipboardThing[],
	point: VecLike | undefined,
	clipboardPasteSource: 'native-event' | 'clipboard-read'
) {
	// 1. Handle files
	//
	// We need to handle files separately because if we want them to
	// be placed next to each other, we need to create them all at once.

	const files = things.filter(
		(t) => (t.type === 'file' || t.type === 'blob') && t.source !== null
	) as Extract<ClipboardThing, { type: 'file' } | { type: 'blob' }>[]

	// Just paste the files, nothing else
	if (files.length) {
		if (files.length > editor.options.maxFilesAtOnce) {
			throw Error('Too many files')
		}
		const fileBlobs = compact(await Promise.all(files.map((t) => t.source)))
		return await pasteFiles(editor, fileBlobs, point, undefined, clipboardPasteSource)
	}

	// 2. Generate clipboard results for non-file things
	//
	// Getting the source from the items is async, however they must be accessed syncronously;
	// we can't await them in a loop. So we'll map them to promises and await them all at once,
	// then make decisions based on what we find.

	const results = await Promise.all<TLExternalContentSource>(
		things
			.filter((t) => t.type !== 'file')
			.map(
				(t) =>
					new Promise((r) => {
						const thing = t as Exclude<ClipboardThing, { type: 'file' } | { type: 'blob' }>

						if (thing.type === 'file') {
							r({ type: 'error', data: null, reason: 'unexpected file' })
							return
						}

						thing.source.then((text) => {
							// first, see if we can find tldraw content, which is JSON inside of an html comment
							const tldrawHtmlComment = text.match(/<div data-tldraw[^>]*>(.*)<\/div>/)?.[1]

							if (tldrawHtmlComment) {
								try {
									// First try parsing as plain JSON (version 2/3 formats)
									let json
									try {
										json = JSON.parse(tldrawHtmlComment)
									} catch {
										// Fall back to LZ decompression (legacy format)
										const jsonComment = lz.decompressFromBase64(tldrawHtmlComment)
										if (jsonComment === null) {
											r({
												type: 'error',
												data: null,
												reason: `found tldraw data comment but could not parse`,
											})
											return
										}
										json = JSON.parse(jsonComment)
									}

									if (json.type !== 'application/tldraw') {
										r({
											type: 'error',
											data: json,
											reason: `found tldraw data comment but JSON was of a different type: ${json.type}`,
										})
										return
									}

									// Handle versioned clipboard format
									if (json.version === 3) {
										// Version 3: Assets are plain, decompress only other data
										try {
											const otherData = JSON.parse(
												lz.decompressFromBase64(json.data.otherCompressed) || '{}'
											)
											const reconstructedData = {
												assets: json.data.assets || [],
												...otherData,
											}

											r({ type: 'tldraw', data: reconstructedData })
											return
										} catch (error) {
											r({
												type: 'error',
												data: json,
												reason: `failed to decompress version 2 clipboard data: ${error}`,
											})
											return
										}
									}
									if (json.version === 2) {
										// Version 2: Everything is plain, this had issues with encoding... :-/
										// TODO: nix this support after some time.
										r({ type: 'tldraw', data: json.data })
									} else {
										// Version 1 or no version: Legacy format
										if (typeof json.data === 'string') {
											r({
												type: 'error',
												data: json,
												reason:
													'found tldraw json but data was a string instead of a TLClipboardModel object',
											})
											return
										}

										r({ type: 'tldraw', data: json.data })
										return
									}
								} catch {
									r({
										type: 'error',
										data: tldrawHtmlComment,
										reason:
											'found tldraw json but data was a string instead of a TLClipboardModel object',
									})
									return
								}
							} else {
								if (thing.type === 'html') {
									r({ type: 'text', data: text, subtype: 'html' })
									return
								}

								if (thing.type === 'url') {
									r({ type: 'text', data: text, subtype: 'url' })
									return
								}

								// if we have not found a tldraw comment, Otherwise, try to parse the text as JSON directly.
								try {
									const json = JSON.parse(text)
									if (json.type === 'excalidraw/clipboard') {
										// If the clipboard contains content copied from excalidraw, then paste that
										r({ type: 'excalidraw', data: json })
										return
									} else {
										r({ type: 'text', data: text, subtype: 'json' })
										return
									}
								} catch {
									// If we could not parse the text as JSON, then it's just text
									r({ type: 'text', data: text, subtype: 'text' })
									return
								}
							}

							r({ type: 'error', data: text, reason: 'unhandled case' })
						})
					})
			)
	)

	// 3.
	//
	// Now that we know what kind of stuff we're dealing with, we can actual create some content.
	// There are priorities here, so order matters: we've already handled images and files, which
	// take first priority; then we want to handle tldraw content, then excalidraw content, then
	// html content, then links, and finally text content.

	// Try to paste tldraw content
	for (const result of results) {
		if (result.type === 'tldraw') {
			editor.markHistoryStoppingPoint('paste')
			putPastedExternalContent(
				editor,
				{ type: 'tldraw', content: result.data, point },
				{ source: clipboardPasteSource, point }
			)
			return
		}
	}

	// Try to paste excalidraw content
	for (const result of results) {
		if (result.type === 'excalidraw') {
			editor.markHistoryStoppingPoint('paste')
			putPastedExternalContent(
				editor,
				{ type: 'excalidraw', content: result.data, point },
				{ source: clipboardPasteSource, point }
			)
			return
		}
	}

	// Try to paste html content
	for (const result of results) {
		if (result.type === 'text' && result.subtype === 'html') {
			const rootNode = new DOMParser().parseFromString(result.data, 'text/html')
			const bodyNode = rootNode.querySelector('body')

			// Check for iframe embeds in HTML before stripping content
			const iframeInfo = extractIframeFromHtml(result.data)
			if (iframeInfo) {
				editor.markHistoryStoppingPoint('paste')
				editor.putExternalContent({
					type: 'embed',
					url: iframeInfo.src,
					point,
					embed: {
						width: iframeInfo.width,
						height: iframeInfo.height,
						doesResize: true,
					},
				})
				return
			}

			// try to find a link

			// Edge on Windows 11 home appears to paste a link as a single <a/> in
			// the HTML document. If we're pasting a single like tag we'll just
			// assume the user meant to paste the URL.
			const isHtmlSingleLink =
				bodyNode &&
				Array.from(bodyNode.children).filter((el) => el.nodeType === 1).length === 1 &&
				bodyNode.firstElementChild &&
				bodyNode.firstElementChild.tagName === 'A' &&
				bodyNode.firstElementChild.hasAttribute('href') &&
				bodyNode.firstElementChild.getAttribute('href') !== ''

			if (isHtmlSingleLink) {
				const href = bodyNode.firstElementChild.getAttribute('href')!
				handleText(editor, href, point, results, clipboardPasteSource)
				return
			}

			// If the html is NOT a link, and we have NO OTHER texty content, then paste the html as text
			if (!results.some((r) => r.type === 'text' && r.subtype !== 'html') && result.data.trim()) {
				const html = stripHtml(result.data) ?? ''
				if (html) {
					handleText(editor, stripHtml(result.data), point, results, clipboardPasteSource)
					return
				}
			}

			// If the html is NOT a link, and we have other texty content, then paste the html as a text shape
			if (results.some((r) => r.type === 'text' && r.subtype !== 'html')) {
				const html = stripHtml(result.data) ?? ''
				if (html) {
					editor.markHistoryStoppingPoint('paste')
					putPastedExternalContent(
						editor,
						{
							type: 'text',
							text: html,
							html: result.data,
							point,
							sources: results,
						},
						{ source: clipboardPasteSource, point }
					)
					return
				}
			}
		}

		// Allow pasting any <iframe> embed code onto the canvas.
		// Extracts the iframe src and dimensions, then creates an embed shape.
		if (result.type === 'text' && result.subtype === 'text') {
			const iframeInfo = extractIframeFromHtml(result.data)
			if (iframeInfo) {
				editor.markHistoryStoppingPoint('paste')
				editor.putExternalContent({
					type: 'embed',
					url: iframeInfo.src,
					point,
					embed: {
						width: iframeInfo.width,
						height: iframeInfo.height,
						doesResize: true,
					},
				})
				return
			}
		}
	}

	// Try to paste a link
	for (const result of results) {
		if (result.type === 'text' && result.subtype === 'url') {
			pasteUrl(editor, result.data, point, results, clipboardPasteSource)
			return
		}
	}

	// Finally, if we haven't bailed on anything yet, we can paste text content
	for (const result of results) {
		if (result.type === 'text' && result.subtype === 'text' && result.data.trim()) {
			// The clipboard may include multiple text items, but we only want to paste the first one
			handleText(editor, result.data, point, results, clipboardPasteSource)
			return
		}
	}
}

/**
 * When the user copies or cuts, write the contents to the clipboard.
 *
 * @public
 */
export const handleNativeOrMenuCopy = async (
	editor: Editor,
	context: TLClipboardWriteInfo = { operation: 'copy', source: 'menu' }
): Promise<boolean> => {
	const nav = editor.getContainerWindow().navigator
	let content = await editor.resolveAssetsInContent(
		editor.getContentFromCurrentPage(editor.getSelectedShapeIds())
	)
	if (!content) {
		nav?.clipboard?.writeText?.('')
		return true
	}

	if (editor.options.onBeforeCopyToClipboard) {
		const result = await editor.options.onBeforeCopyToClipboard({ editor, content, ...context })
		if (result === false) return false
		if (result != null) content = result
	}

	// Use versioned clipboard format for better compression
	// Version 3: Don't compress assets, only compress other data
	const { assets, ...otherData } = content
	const clipboardData = {
		type: 'application/tldraw',
		kind: 'content',
		version: 3,
		data: {
			assets: assets || [], // Plain JSON, no compression
			otherCompressed: lz.compressToBase64(JSON.stringify(otherData)), // Only compress non-asset data
		},
	}

	// Don't compress the final structure - just use plain JSON
	const stringifiedClipboard = JSON.stringify(clipboardData)

	if (typeof nav === 'undefined') {
		return true
	}

	// Extract the text from the clipboard
	const textItems = content.shapes
		.map((shape) => {
			const util = editor.getShapeUtil(shape)
			return util.getText(shape)
		})
		.filter(isDefined)

	if (nav.clipboard?.write) {
		const htmlBlob = new Blob([`<div data-tldraw>${stringifiedClipboard}</div>`], {
			type: 'text/html',
		})

		let textContent = textItems.join(' ')

		// This is a bug in chrome android where it won't paste content if
		// the text/plain content is "" so we need to always add an empty
		// space 🤬
		if (textContent === '') {
			textContent = ' '
		}

		const CBI = editor.getContainerWindow().ClipboardItem
		nav.clipboard.write([
			new CBI({
				'text/html': htmlBlob,
				// What is this second blob used for?
				'text/plain': new Blob([textContent], { type: 'text/plain' }),
			}),
		])
	} else if (nav.clipboard?.writeText) {
		nav.clipboard.writeText(`<div data-tldraw>${stringifiedClipboard}</div>`)
	}
	return true
}

/** @public */
export function useMenuClipboardEvents() {
	const editor = useMaybeEditor()
	const trackEvent = useUiEvents()

	const copy = useCallback(
		async function onCopy(source: TLUiEventSource) {
			assert(editor, 'editor is required for copy')
			if (editor.getSelectedShapeIds().length === 0) return

			const didCopy = await handleNativeOrMenuCopy(editor, { operation: 'copy', source: 'menu' })
			if (didCopy) {
				trackEvent('copy', { source })
			}
		},
		[editor, trackEvent]
	)

	const cut = useCallback(
		async function onCut(source: TLUiEventSource) {
			if (!editor) return
			if (editor.getSelectedShapeIds().length === 0) return

			const didCopy = await handleNativeOrMenuCopy(editor, { operation: 'cut', source: 'menu' })
			if (didCopy) {
				editor.deleteShapes(editor.getSelectedShapeIds())
				trackEvent('cut', { source })
			}
		},
		[editor, trackEvent]
	)

	const paste = useCallback(
		async function onPaste(
			data: DataTransfer | ClipboardItem[],
			source: TLUiEventSource,
			point?: VecLike
		) {
			if (!editor) return
			// If we're editing a shape, or we are focusing an editable input, then
			// we would want the user's paste interaction to go to that element or
			// input instead; e.g. when pasting text into a text shape's content
			if (editor.getEditingShapeId() !== null) return

			const win = editor.getContainerWindow()
			if (Array.isArray(data) && data[0] instanceof win.ClipboardItem) {
				if (
					editor.options.onClipboardPasteRaw?.({
						editor,
						source: 'clipboard-read',
						clipboardItems: data,
						point,
					}) === false
				) {
					trackEvent('paste', { source: 'menu' })
					return
				}
				handlePasteFromClipboardApi({
					editor,
					clipboardItems: data,
					point,
					clipboardPasteSource: 'clipboard-read',
				})
				trackEvent('paste', { source: 'menu' })
			} else {
				const nav = win.navigator
				nav.clipboard.read().then((clipboardItems) => {
					paste(clipboardItems, source, point)
				})
			}
		},
		[editor, trackEvent]
	)

	return {
		copy,
		cut,
		paste,
	}
}

/** @public */
export function useNativeClipboardEvents() {
	const editor = useEditor()
	const ownerDocument = editor.getContainerDocument()
	const trackEvent = useUiEvents()

	const appIsFocused = useValue('editor.isFocused', () => editor.getInstanceState().isFocused, [
		editor,
	])

	useEffect(() => {
		if (!appIsFocused) return
		const copy = async (e: ClipboardEvent) => {
			if (
				editor.getSelectedShapeIds().length === 0 ||
				editor.getEditingShapeId() !== null ||
				areShortcutsDisabled(editor)
			) {
				return
			}

			preventDefault(e)

			const didCopy = await handleNativeOrMenuCopy(editor, { operation: 'copy', source: 'native' })
			if (didCopy) {
				trackEvent('copy', { source: 'kbd' })
			}
		}

		async function cut(e: ClipboardEvent) {
			if (
				editor.getSelectedShapeIds().length === 0 ||
				editor.getEditingShapeId() !== null ||
				areShortcutsDisabled(editor)
			) {
				return
			}
			preventDefault(e)

			const didCopy = await handleNativeOrMenuCopy(editor, { operation: 'cut', source: 'native' })
			if (didCopy) {
				editor.deleteShapes(editor.getSelectedShapeIds())
				trackEvent('cut', { source: 'kbd' })
			}
		}

		let disablingMiddleClickPaste = false
		const pointerUpHandler = (e: PointerEvent) => {
			if (e.button === 1) {
				// middle mouse button
				disablingMiddleClickPaste = true
				editor.timers.requestAnimationFrame(() => {
					disablingMiddleClickPaste = false
				})
			}
		}

		// Track native modifier state from the most recent keydown. We use this
		// instead of editor.inputs.getShiftKey() because the editor applies a
		// 150ms delay on modifier release (to prevent physical race conditions
		// with pointer events), which can cause false positives here.
		let nativeShiftKey = false
		const trackModifiers = (e: KeyboardEvent) => {
			nativeShiftKey = e.shiftKey
		}

		const paste = (e: ClipboardEvent) => {
			if (disablingMiddleClickPaste) {
				editor.markEventAsHandled(e)
				return
			}

			// If we're editing a shape, or we are focusing an editable input, then
			// we would want the user's paste interaction to go to that element or
			// input instead; e.g. when pasting text into a text shape's content
			if (editor.getEditingShapeId() !== null || areShortcutsDisabled(editor)) return

			// Cmd+Shift+V / Ctrl+Shift+V = paste as plain text (no formatting).
			// If there's no plain text on the clipboard (e.g., a copied PNG), fall
			// through to the normal paste handler so the file still gets pasted.
			if (nativeShiftKey) {
				const text = e.clipboardData?.getData('text/plain')
				if (text?.trim()) {
					const point = editor.user.getIsPasteAtCursorMode()
						? editor.inputs.getCurrentPagePoint()
						: editor.getViewportPageBounds().center
					editor.markHistoryStoppingPoint('paste')
					defaultHandleExternalTextContent(editor, { text, point })
					preventDefault(e)
					trackEvent('paste', { source: 'kbd' })
					return
				}
			}

			// Cmd+V: paste at center by default, or at cursor when the preference is on.
			// (Cmd+Option+V and Cmd+Shift+Option+V are handled as actions in actions.tsx
			// because the browser only fires paste events for Cmd+V and Cmd+Shift+V.)
			const point = editor.user.getIsPasteAtCursorMode()
				? editor.inputs.getCurrentPagePoint()
				: undefined

			if (
				editor.options.onClipboardPasteRaw?.({
					editor,
					source: 'native-event',
					event: e,
					clipboardData: e.clipboardData,
					point,
				}) === false
			) {
				preventDefault(e)
				trackEvent('paste', { source: 'kbd' })
				return
			}

			const pasteFromEvent = () => {
				if (e.clipboardData) {
					handlePasteFromEventClipboardData(editor, e.clipboardData, point)
				}
			}

			// if we can read from the clipboard API, we want to try using that first. that allows
			// us to access most things, and doesn't strip out metadata added to tldraw's own
			// copy-as-png features - so copied shapes come back in at the correct size.
			const win = editor.getContainerWindow()
			const nav = win.navigator
			if (nav.clipboard?.read) {
				// We can't read files from the filesystem using the clipboard API though - they'll
				// just come in as the file names instead. So we'll use the clipboard event's files
				// as a fallback - if we only got text, but do have files, we use those instead.
				const fallbackFiles = Array.from(e.clipboardData?.files || [])
				nav.clipboard.read().then(
					(clipboardItems) => {
						if (Array.isArray(clipboardItems) && clipboardItems[0] instanceof win.ClipboardItem) {
							handlePasteFromClipboardApi({
								editor,
								clipboardItems,
								point,
								fallbackFiles,
								clipboardPasteSource: 'native-event',
							})
						}
					},
					() => {
						// if reading from the clipboard fails, try to use the event clipboard data
						pasteFromEvent()
					}
				)
			} else {
				pasteFromEvent()
			}

			preventDefault(e)
			trackEvent('paste', { source: 'kbd' })
		}

		ownerDocument?.addEventListener('copy', copy)
		ownerDocument?.addEventListener('cut', cut)
		ownerDocument?.addEventListener('paste', paste)
		ownerDocument?.addEventListener('pointerup', pointerUpHandler)
		ownerDocument?.addEventListener('keydown', trackModifiers, true)
		ownerDocument?.addEventListener('keyup', trackModifiers, true)

		return () => {
			ownerDocument?.removeEventListener('copy', copy)
			ownerDocument?.removeEventListener('cut', cut)
			ownerDocument?.removeEventListener('paste', paste)
			ownerDocument?.removeEventListener('pointerup', pointerUpHandler)
			ownerDocument?.removeEventListener('keydown', trackModifiers, true)
			ownerDocument?.removeEventListener('keyup', trackModifiers, true)
		}
	}, [editor, trackEvent, appIsFocused, ownerDocument])
}
