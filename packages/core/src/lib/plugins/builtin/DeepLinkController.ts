// This module is part of the headless core. It must not import React or touch the DOM.
import { computed, react } from '@tldraw/state'
import { TLPageId, TLShape } from '@tldraw/tlschema'
import { compact, debounce, exhaustiveSwitchError } from '@tldraw/utils'
import type { Editor } from '../../editor/Editor'
import { Box } from '../../primitives/Box'
import {
	TLDeepLink,
	TLDeepLinkOptions,
	createDeepLinkString,
	parseDeepLinkString,
} from '../../utils/deepLinks'

/**
 * Creates deep links to a page, shapes or a viewport, follows them, and keeps a URL up to date
 * with the current viewport. The editor's deep link methods use it.
 *
 * @public
 */
export class DeepLinkController {
	constructor(private readonly editor: Editor) {}

	private _zoomToFitPageContentAt100Percent() {
		const bounds = this.editor.getCurrentPageBounds()
		if (bounds) {
			this.editor.zoomToBounds(bounds, { immediate: true, targetZoom: this.editor.getBaseZoom() })
		}
	}

	private _navigateToDeepLink(deepLink: TLDeepLink) {
		this.editor.run(() => {
			switch (deepLink.type) {
				case 'page': {
					const page = this.editor.getPage(deepLink.pageId)
					if (page) {
						this.editor.setCurrentPage(page)
					}
					this._zoomToFitPageContentAt100Percent()
					return
				}
				case 'shapes': {
					const allShapes = compact(deepLink.shapeIds.map((id) => this.editor.getShape(id)))
					const byPage: { [pageId: string]: TLShape[] } = {}
					for (const shape of allShapes) {
						const pageId = this.editor.getAncestorPageId(shape)
						if (!pageId) continue
						byPage[pageId] ??= []
						byPage[pageId].push(shape)
					}
					const [pageId, shapes] = Object.entries(byPage).sort(
						([_, a], [__, b]) => b.length - a.length
					)[0] ?? ['', []]

					if (!pageId || !shapes.length) {
						this._zoomToFitPageContentAt100Percent()
					} else {
						this.editor.setCurrentPage(pageId as TLPageId)
						const bounds = Box.Common(shapes.map((s) => this.editor.getShapePageBounds(s)!))
						this.editor.zoomToBounds(bounds, {
							immediate: true,
							targetZoom: this.editor.getBaseZoom(),
						})
					}
					return
				}
				case 'viewport': {
					if (deepLink.pageId) {
						if (!this.editor.getPage(deepLink.pageId)) {
							this._zoomToFitPageContentAt100Percent()
							return
						}
						this.editor.setCurrentPage(deepLink.pageId)
					}
					this.editor.zoomToBounds(deepLink.bounds, { immediate: true, inset: 0 })
					return
				}
				default:
					exhaustiveSwitchError(deepLink)
			}
		})
	}

	navigateToDeepLink(opts?: TLDeepLink | { url?: string | URL; param?: string }): void {
		if (opts && 'type' in opts) {
			this._navigateToDeepLink(opts)
			return
		}

		const url = new URL(opts?.url ?? window.location.href)
		const deepLinkString = url.searchParams.get(opts?.param ?? 'd')

		if (!deepLinkString) {
			this._zoomToFitPageContentAt100Percent()
			return
		}

		try {
			this._navigateToDeepLink(parseDeepLinkString(deepLinkString))
		} catch (e) {
			console.warn(e)
			this._zoomToFitPageContentAt100Percent()
		}
	}

	createDeepLink(opts?: { url?: string | URL; param?: string; to?: TLDeepLink }): URL {
		const url = new URL(opts?.url ?? window.location.href)

		url.searchParams.set(
			opts?.param ?? 'd',
			createDeepLinkString(
				opts?.to ?? {
					type: 'viewport',
					pageId: this.editor.options.maxPages === 1 ? undefined : this.editor.getCurrentPageId(),
					bounds: this.editor.getViewportPageBounds(),
				}
			)
		)

		return url
	}

	registerDeepLinkListener(opts?: TLDeepLinkOptions): () => void {
		if (opts?.getUrl && !opts?.onChange) {
			throw Error(
				'[tldraw:urlStateSync] If you specify getUrl, you must also specify the onChange callback.'
			)
		}

		const url$ = computed('url with state', () => {
			const url = opts?.getUrl?.(this.editor) ?? window.location.href
			const urlWithState = this.editor.createDeepLink({
				param: opts?.param,
				url,
				to: opts?.getTarget?.(this.editor),
			})
			return urlWithState.toString()
		})

		const announceChange =
			opts?.onChange ??
			(() => {
				const url = this.editor.createDeepLink({
					param: opts?.param,
					to: opts?.getTarget?.(this.editor),
				})

				window.history.replaceState({}, this.editor.getContainerDocument().title, url.toString())
			})

		const scheduleEffect = debounce((execute: () => void) => execute(), opts?.debounceMs ?? 500)

		const unlisten = react(
			'update url on state change',
			() => announceChange(new URL(url$.get()), this.editor),
			{ scheduleEffect }
		)

		return () => {
			unlisten()
			scheduleEffect.cancel()
		}
	}
}
