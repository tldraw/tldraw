import {
	Box,
	Editor,
	LicenseManager,
	TLAnyBindingUtilConstructor,
	TLAnyShapeUtilConstructor,
	TLBookmarkAsset,
	TLEditorSnapshot,
	TLStateNodeConstructor,
	TLStoreSnapshot,
	TLTextMeasurer,
	TLTextOptions,
	TldrawOptions,
	createTLStore,
	loadSnapshot,
	mergeArraysAndReplaceDefaults,
} from '@tldraw/editor'
import { atom, react } from '@tldraw/state'
import { AssetRecordType } from '@tldraw/tlschema'
import { getHashForString } from '@tldraw/utils'
import { DOMParser as LinkedomDOMParser } from 'linkedom'
import {
	DEFAULT_TRANSLATION,
	TLDefaultExternalContentHandlerOpts,
	TLUiToastsContextType,
	defaultAddFontsFromNode,
	defaultAssetUtils,
	defaultBindingUtils,
	defaultShapeTools,
	defaultShapeUtils,
	defaultTools,
	registerDefaultExternalContentHandlers,
	registerDefaultSideEffects,
	tipTapDefaultExtensions,
	// The subpath entry skips the tldraw barrel, whose component exports drag the React UI
	// module graph (scroll-lock, focus machinery) into every headless process.
} from 'tldraw/headless-defaults'
import { ensureHeadlessDocument } from './documentShim'

/** @public */
export interface TLHeadlessEditorOptions {
	/** Custom shape utils. A custom util with the same type replaces the default, like the `<Tldraw>` component. */
	shapeUtils?: readonly TLAnyShapeUtilConstructor[]
	/** Custom binding utils. A custom util with the same type replaces the default. */
	bindingUtils?: readonly TLAnyBindingUtilConstructor[]
	/** Custom tools. A custom tool with the same id replaces the default. */
	tools?: readonly TLStateNodeConstructor[]
	/** A snapshot to load after the editor is created. */
	snapshot?: TLEditorSnapshot | TLStoreSnapshot
	/**
	 * Text options for the editor. Defaults to tldraw's standard rich text setup. Pass `null`
	 * to disable text support; rich text APIs will then throw.
	 */
	textOptions?: TLTextOptions | null
	/**
	 * Replaces the default character-count measurement ({@link @tldraw/editor#approximateTextMeasurer}).
	 * Inject an accurate implementation when browser clients will see this editor's shapes.
	 */
	textMeasurer?: TLTextMeasurer
	/**
	 * How the editor's frame loop runs. `'auto'` (the default) runs the normal animation-frame
	 * tick loop. `'manual'` starts no loop; advance time yourself with
	 * `editor.emit('tick', elapsedMs)`.
	 */
	frameLoop?: 'auto' | 'manual'
	/** The viewport size in screen pixels. Defaults to 1920×1080. */
	viewport?: { width: number; height: number }
	/**
	 * Your tldraw license key. Required when `NODE_ENV` is `'production'`; without one,
	 * `createHeadlessEditor` throws. A provided key that fails validation is reported as a
	 * console error in any environment. Headless deployments are never watermark-tracked.
	 */
	licenseKey?: string
	/** Additional editor options, merged under the dedicated options above. */
	editorOptions?: Partial<TldrawOptions>
}

/**
 * Creates a tldraw {@link @tldraw/editor#Editor} that runs without a DOM. This is the same
 * `Editor` class the browser runs, with the default shapes, tools, bindings, and side effects
 * registered. The full document API works. Rendering-dependent features (image and SVG export,
 * focus, clipboard) remain browser-only.
 *
 * Note: the editor's timers are unref'd in Node, so an undisposed editor won't prevent the
 * process from exiting.
 *
 * @example
 * ```ts
 * const editor = createHeadlessEditor()
 * editor.createShape({ type: 'geo', x: 0, y: 0 })
 * editor.dispose()
 * ```
 *
 * @param opts - Options for the editor.
 *
 * @public
 */
export function createHeadlessEditor(opts: TLHeadlessEditorOptions = {}): Editor {
	// License enforcement stands in for the browser's watermark: headless renders nothing, so
	// an unlicensed production deployment would otherwise carry no signal at all.
	if (process.env.NODE_ENV === 'production' && !opts.licenseKey) {
		throw new Error(
			'@tldraw/headless requires a license in production. Pass your license key via createHeadlessEditor({ licenseKey }). See https://tldraw.dev'
		)
	}

	const shapeUtils = mergeArraysAndReplaceDefaults('type', opts.shapeUtils ?? [], defaultShapeUtils)
	const bindingUtils = mergeArraysAndReplaceDefaults(
		'type',
		opts.bindingUtils ?? [],
		defaultBindingUtils
	)
	const tools = mergeArraysAndReplaceDefaults('id', opts.tools ?? [], [
		...defaultTools,
		...defaultShapeTools,
	])

	let textOptions: TLTextOptions | undefined
	if (opts.textOptions !== null) {
		ensureHeadlessDocument()
		textOptions = opts.textOptions ?? {
			addFontsFromNode: defaultAddFontsFromNode,
			tipTapConfig: { extensions: tipTapDefaultExtensions },
		}
	}

	const store = createTLStore({ shapeUtils, bindingUtils })

	const editor = new Editor({
		store,
		shapeUtils,
		bindingUtils,
		assetUtils: defaultAssetUtils,
		tools,
		headless: true,
		initialState: 'select',
		licenseKey: opts.licenseKey,
		textMeasurer: opts.textMeasurer,
		options: {
			...opts.editorOptions,
			frameLoop: opts.frameLoop ?? opts.editorOptions?.frameLoop ?? 'auto',
			...(textOptions ? { text: textOptions } : {}),
		},
	})

	editor.disposables.add(registerDefaultSideEffects(editor))

	// The default paste/import handlers, so `editor.putExternalContent` works headlessly for
	// text, html, urls, embeds, and tldraw/excalidraw content. Toast notifications (the
	// browser's error surface for rejected files) are routed to console warnings, since nobody
	// is watching a toast in Node.
	const toasts: TLUiToastsContextType = {
		addToast(toast) {
			console.warn(`tldraw: ${[toast.title, toast.description].filter(Boolean).join(' — ')}`)
			return toast.id ?? ''
		},
		removeToast: () => '',
		clearToasts: () => void 0,
		toasts: atom('headless toasts', []),
	}
	const msg = ((id: string) =>
		(DEFAULT_TRANSLATION as Record<string, string>)[id] ??
		id) as TLDefaultExternalContentHandlerOpts['msg']
	registerDefaultExternalContentHandlers(editor, { toasts, msg })
	// The default url asset handler parses fetched pages with the global DOMParser, which Node
	// lacks; without this override every bookmark would come back with empty metadata.
	editor.registerExternalAssetHandler('url', ({ url }) => unfurlBookmarkUrl(url, toasts, msg))
	// The default svg-text handler needs browser image APIs and would die deep inside svg
	// sanitization with a bare `DOMParser is not defined`.
	editor.registerExternalContentHandler('svg-text', () => {
		throw new Error('svg-text content is not supported headlessly (it needs browser image APIs).')
	})

	if (opts.snapshot) {
		loadSnapshot(editor.store, opts.snapshot)
	}

	const viewport = opts.viewport ?? { width: 1920, height: 1080 }
	editor.updateViewportScreenBounds(new Box(0, 0, viewport.width, viewport.height))

	if (opts.licenseKey) {
		// Validation is async (signature verification); the LicenseManager itself skips the
		// watermark tracking beacon when there is no window. An invalid or expired key can't
		// fail the already-returned constructor, so it reports as a console error.
		const licenseManager = new LicenseManager(opts.licenseKey)
		editor.licenseManager = licenseManager
		// `react` runs the effect synchronously before returning, so `stop` must be a `let` —
		// a license state that resolves synchronously would otherwise hit the const's TDZ.
		let done = false
		// eslint-disable-next-line prefer-const
		let stop: (() => void) | undefined
		stop = react('headless license state', () => {
			const state = licenseManager.state.get()
			if (state === 'pending') return
			if (state === 'unlicensed' || state === 'unlicensed-production' || state === 'expired') {
				console.error(
					`tldraw: this headless deployment is not licensed (license state: ${state}). See https://tldraw.dev`
				)
			}
			done = true
			stop?.()
		})
		if (done) stop()
		else editor.disposables.add(stop)
	}

	return editor
}

// Mirrors defaultHandleExternalUrlAsset, parsing with linkedom instead of the global DOMParser
// that Node lacks. Same degradation contract: an unreachable or unparseable page logs the
// error, reports `assets.url.failed`, and still yields a plain bookmark of the url.
async function unfurlBookmarkUrl(
	url: string,
	toasts: TLUiToastsContextType,
	msg: TLDefaultExternalContentHandlerOpts['msg']
): Promise<TLBookmarkAsset> {
	let meta = { image: '', favicon: '', title: url, description: '' }
	try {
		const resp = await fetch(url, { method: 'GET' })
		const html = await resp.text()
		const doc = new LinkedomDOMParser().parseFromString(html, 'text/html')
		const head = doc.head
		meta = {
			image: head.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '',
			favicon:
				head.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href') ??
				head.querySelector('link[rel="icon"]')?.getAttribute('href') ??
				'',
			title: head.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? url,
			description:
				head.querySelector('meta[property="og:description"]')?.getAttribute('content') ?? '',
		}
		if (meta.image && !meta.image.startsWith('http')) {
			meta.image = new URL(meta.image, url).href
		}
		if (meta.favicon && !meta.favicon.startsWith('http')) {
			meta.favicon = new URL(meta.favicon, url).href
		}
	} catch (error) {
		console.error(error)
		toasts.addToast({ title: msg('assets.url.failed'), severity: 'error' })
		meta = { image: '', favicon: '', title: '', description: '' }
	}

	return {
		id: AssetRecordType.createId(getHashForString(url)),
		typeName: 'asset',
		type: 'bookmark',
		props: {
			src: url,
			description: meta.description,
			image: meta.image,
			favicon: meta.favicon,
			title: meta.title,
		},
		meta: {},
	} as TLBookmarkAsset
}
