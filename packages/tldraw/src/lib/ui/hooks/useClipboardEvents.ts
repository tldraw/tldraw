import {
	Editor,
	TLArrowShape,
	TLBookmarkShape,
	TLEmbedShape,
	TLExternalContentSource,
	TLGeoShape,
	TLTextShape,
	VecLike,
	isNonNull,
	uniq,
	useEditor,
	useValue,
} from '@tldraw/editor'
import { compressToBase64, decompressFromBase64 } from 'lz-string'
import { useCallback, useEffect } from 'react'
import { pasteExcalidrawContent } from './clipboard/pasteExcalidrawContent'
import { pasteFiles } from './clipboard/pasteFiles'
import { pasteTldrawContent } from './clipboard/pasteTldrawContent'
import { pasteUrl } from './clipboard/pasteUrl'
import { TLUiEventSource, useUiEvents } from './useEventsProvider'

/**
 * Strip HTML tags from a string.
 * @param html - The HTML to strip.
 * @internal
 */
function stripHtml(html: string) {
	// See <https://github.com/developit/preact-markup/blob/4788b8d61b4e24f83688710746ee36e7464f7bbc/src/parse-markup.js#L60-L69>
	const doc = document.implementation.createHTMLDocument('')
	doc.documentElement.innerHTML = html.trim()
	return doc.body.textContent || doc.body.innerText || ''
}

/** @public */
export const isValidHttpURL = (url: string) => {
	try {
		const u = new URL(url)
		return u.protocol === 'http:' || u.protocol === 'https:'
	} catch (e) {
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
		} catch (e) {
			return
		}
	}
	return uniq(urls)
}

/** @public */
const isSvgText = (text: string) => {
	return /^<svg/.test(text)
}

const INPUTS = ['input', 'select', 'textarea']

/**
 * Get whether to disallow clipboard events.
 *
 * @param editor - The editor instance.
 * @internal
 */
function disallowClipboardEvents(editor: Editor) {
	const { activeElement } = document
	return (
		editor.getIsMenuOpen() ||
		(activeElement &&
			(activeElement.getAttribute('contenteditable') ||
				INPUTS.indexOf(activeElement.tagName.toLowerCase()) > -1))
	)
}

/**
 * Get a blob as a string.
 *
 * @param blob - The blob to get as a string.
 * @internal
 */
async function blobAsString(blob: Blob) {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader()
		reader.addEventListener('loadend', () => {
			const text = reader.result
			resolve(text as string)
		})
		reader.addEventListener('error', () => {
			reject(reader.error)
		})
		reader.readAsText(blob)
	})
}

/**
 * Whether a ClipboardItem is a file.
 * @param item - The ClipboardItem to check.
 * @internal
 */
const isFile = (item: ClipboardItem) => {
	return item.types.find((i) => i.match(/^image\//))
}

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
	sources?: TLExternalContentSource[]
) => {
	const validUrlList = getValidHttpURLList(data)
	if (validUrlList) {
		for (const url of validUrlList) {
			pasteUrl(editor, url, point)
		}
	} else if (isValidHttpURL(data)) {
		pasteUrl(editor, data, point)
	} else if (isSvgText(data)) {
		editor.mark('paste')
		editor.putExternalContent({
			type: 'svg-text',
			text: data,
			point,
			sources,
		})
	} else {
		editor.mark('paste')
		editor.putExternalContent({
			type: 'text',
			text: data,
			point,
			sources,
		})
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

	handleClipboardThings(editor, things, point)
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
const handlePasteFromClipboardApi = async (
	editor: Editor,
	clipboardItems: ClipboardItem[],
	point?: VecLike
) => {
	// We need to populate the array of clipboard things
	// based on the ClipboardItems from the Clipboard API.
	// This is done in a different way than when using
	// the clipboard data from the paste event.

	const things: ClipboardThing[] = []

	for (const item of clipboardItems) {
		if (isFile(item)) {
			for (const type of item.types) {
				if (type.match(/^image\//)) {
					things.push({ type: 'blob', source: item.getType(type) })
				}
			}
		}

		if (item.types.includes('text/html')) {
			things.push({
				type: 'html',
				source: new Promise<string>((r) =>
					item.getType('text/html').then((blob) => blobAsString(blob).then(r))
				),
			})
		}

		if (item.types.includes('text/uri-list')) {
			things.push({
				type: 'url',
				source: new Promise<string>((r) =>
					item.getType('text/uri-list').then((blob) => blobAsString(blob).then(r))
				),
			})
		}

		if (item.types.includes('text/plain')) {
			things.push({
				type: 'text',
				source: new Promise<string>((r) =>
					item.getType('text/plain').then((blob) => blobAsString(blob).then(r))
				),
			})
		}
	}

	return await handleClipboardThings(editor, things, point)
}

async function handleClipboardThings(editor: Editor, things: ClipboardThing[], point?: VecLike) {
	// 1. Handle files
	//
	// We need to handle files separately because if we want them to
	// be placed next to each other, we need to create them all at once.

	const files = things.filter(
		(t) => (t.type === 'file' || t.type === 'blob') && t.source !== null
	) as Extract<ClipboardThing, { type: 'file' } | { type: 'blob' }>[]

	// Just paste the files, nothing else
	if (files.length) {
		const fileBlobs = await Promise.all(files.map((t) => t.source!))
		const urls = (fileBlobs.filter(Boolean) as (File | Blob)[]).map((blob) =>
			URL.createObjectURL(blob)
		)
		return await pasteFiles(editor, urls, point)
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
							const tldrawHtmlComment = text.match(/<tldraw[^>]*>(.*)<\/tldraw>/)?.[1]

							if (tldrawHtmlComment) {
								try {
									// If we've found tldraw content in the html string, use that as JSON
									const jsonComment = decompressFromBase64(tldrawHtmlComment)
									if (jsonComment === null) {
										r({
											type: 'error',
											data: jsonComment,
											reason: `found tldraw data comment but could not parse base64`,
										})
										return
									} else {
										const json = JSON.parse(jsonComment)
										if (json.type !== 'application/tldraw') {
											r({
												type: 'error',
												data: json,
												reason: `found tldraw data comment but JSON was of a different type: ${json.type}`,
											})
										}

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
								} catch (e: any) {
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
								} catch (e) {
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
			pasteTldrawContent(editor, result.data, point)
			return
		}
	}

	// Try to paste excalidraw content
	for (const result of results) {
		if (result.type === 'excalidraw') {
			pasteExcalidrawContent(editor, result.data, point)
			return
		}
	}

	// Try to paste html content
	for (const result of results) {
		if (result.type === 'text' && result.subtype === 'html') {
			// try to find a link
			const rootNode = new DOMParser().parseFromString(result.data, 'text/html')
			const bodyNode = rootNode.querySelector('body')

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
				handleText(editor, href, point, results)
				return
			}

			// If the html is NOT a link, and we have NO OTHER texty content, then paste the html as text
			if (!results.some((r) => r.type === 'text' && r.subtype !== 'html') && result.data.trim()) {
				handleText(editor, stripHtml(result.data), point, results)
				return
			}
		}
	}

	// Try to paste a link
	for (const result of results) {
		if (result.type === 'text' && result.subtype === 'url') {
			pasteUrl(editor, result.data, point, results)
			return
		}
	}

	// Finally, if we haven't bailed on anything yet, we can paste text content
	for (const result of results) {
		if (result.type === 'text' && result.subtype === 'text' && result.data.trim()) {
			// The clipboard may include multiple text items, but we only want to paste the first one
			handleText(editor, result.data, point, results)
			return
		}
	}
}

/**
 * When the user copies, write the contents to local storage and to the clipboard
 *
 * @param editor - The editor instance.
 * @public
 */
const handleNativeOrMenuCopy = (editor: Editor) => {
	const content = editor.getContentFromCurrentPage(editor.getSelectedShapeIds())
	if (!content) {
		if (navigator && navigator.clipboard) {
			navigator.clipboard.writeText('')
		}
		return
	}

	const stringifiedClipboard = compressToBase64(
		JSON.stringify({
			type: 'application/tldraw',
			kind: 'content',
			data: content,
		})
	)

	if (typeof navigator === 'undefined') {
		return
	} else {
		// Extract the text from the clipboard
		const textItems = content.shapes
			.map((shape) => {
				if (
					editor.isShapeOfType<TLTextShape>(shape, 'text') ||
					editor.isShapeOfType<TLGeoShape>(shape, 'geo') ||
					editor.isShapeOfType<TLArrowShape>(shape, 'arrow')
				) {
					return shape.props.text
				}
				if (
					editor.isShapeOfType<TLBookmarkShape>(shape, 'bookmark') ||
					editor.isShapeOfType<TLEmbedShape>(shape, 'embed')
				) {
					return shape.props.url
				}
				return null
			})
			.filter(isNonNull)

		if (navigator.clipboard?.write) {
			const htmlBlob = new Blob([`<tldraw>${stringifiedClipboard}</tldraw>`], {
				type: 'text/html',
			})

			let textContent = textItems.join(' ')

			// This is a bug in chrome android where it won't paste content if
			// the text/plain content is "" so we need to always add an empty
			// space 🤬
			if (textContent === '') {
				textContent = ' '
			}

			navigator.clipboard.write([
				new ClipboardItem({
					'text/html': htmlBlob,
					// What is this second blob used for?
					'text/plain': new Blob([textContent], { type: 'text/plain' }),
				}),
			])
		} else if (navigator.clipboard.writeText) {
			navigator.clipboard.writeText(`<tldraw>${stringifiedClipboard}</tldraw>`)
		}
	}
}

/** @public */
export function useMenuClipboardEvents() {
	const editor = useEditor()
	const trackEvent = useUiEvents()

	const copy = useCallback(
		function onCopy(source: TLUiEventSource) {
			if (editor.getSelectedShapeIds().length === 0) return

			handleNativeOrMenuCopy(editor)
			trackEvent('copy', { source })
		},
		[editor, trackEvent]
	)

	const cut = useCallback(
		function onCut(source: TLUiEventSource) {
			if (editor.getSelectedShapeIds().length === 0) return

			handleNativeOrMenuCopy(editor)
			editor.deleteShapes(editor.getSelectedShapeIds())
			trackEvent('cut', { source })
		},
		[editor, trackEvent]
	)

	const paste = useCallback(
		async function onPaste(
			data: DataTransfer | ClipboardItem[],
			source: TLUiEventSource,
			point?: VecLike
		) {
			// If we're editing a shape, or we are focusing an editable input, then
			// we would want the user's paste interaction to go to that element or
			// input instead; e.g. when pasting text into a text shape's content
			if (editor.getEditingShapeId() !== null || disallowClipboardEvents(editor)) return

			if (Array.isArray(data) && data[0] instanceof ClipboardItem) {
				handlePasteFromClipboardApi(editor, data, point)
				trackEvent('paste', { source: 'menu' })
			} else {
				// Read it first and then recurse, kind of weird
				navigator.clipboard.read().then((clipboardItems) => {
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
	const trackEvent = useUiEvents()

	const appIsFocused = useValue('editor.isFocused', () => editor.getInstanceState().isFocused, [
		editor,
	])

	useEffect(() => {
		if (!appIsFocused) return
		const copy = () => {
			if (
				editor.getSelectedShapeIds().length === 0 ||
				editor.getEditingShapeId() !== null ||
				disallowClipboardEvents(editor)
			)
				return
			handleNativeOrMenuCopy(editor)
			trackEvent('copy', { source: 'kbd' })
		}

		function cut() {
			if (
				editor.getSelectedShapeIds().length === 0 ||
				editor.getEditingShapeId() !== null ||
				disallowClipboardEvents(editor)
			)
				return
			handleNativeOrMenuCopy(editor)
			editor.deleteShapes(editor.getSelectedShapeIds())
			trackEvent('cut', { source: 'kbd' })
		}

		let disablingMiddleClickPaste = false
		const pointerUpHandler = (e: PointerEvent) => {
			if (e.button === 1) {
				disablingMiddleClickPaste = true
				requestAnimationFrame(() => {
					disablingMiddleClickPaste = false
				})
			}
		}

		const paste = (event: ClipboardEvent) => {
			if (disablingMiddleClickPaste) {
				event.stopPropagation()
				return
			}

			// If we're editing a shape, or we are focusing an editable input, then
			// we would want the user's paste interaction to go to that element or
			// input instead; e.g. when pasting text into a text shape's content
			if (editor.getEditingShapeId() !== null || disallowClipboardEvents(editor)) return

			// First try to use the clipboard data on the event
			if (event.clipboardData && !editor.inputs.shiftKey) {
				handlePasteFromEventClipboardData(editor, event.clipboardData)
			} else {
				// Or else use the clipboard API
				navigator.clipboard.read().then((clipboardItems) => {
					if (Array.isArray(clipboardItems) && clipboardItems[0] instanceof ClipboardItem) {
						handlePasteFromClipboardApi(editor, clipboardItems, editor.inputs.currentPagePoint)
					}
				})
			}

			trackEvent('paste', { source: 'kbd' })
		}

		document.addEventListener('copy', copy)
		document.addEventListener('cut', cut)
		document.addEventListener('paste', paste)
		document.addEventListener('pointerup', pointerUpHandler)

		return () => {
			document.removeEventListener('copy', copy)
			document.removeEventListener('cut', cut)
			document.removeEventListener('paste', paste)
			document.removeEventListener('pointerup', pointerUpHandler)
		}
	}, [editor, trackEvent, appIsFocused])
}
