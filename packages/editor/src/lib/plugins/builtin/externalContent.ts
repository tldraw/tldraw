// This module is part of the headless editor kernel. It must not import React or touch the DOM.
import type { TLAsset } from '@tldraw/tlschema'
import type { TLExternalAsset, TLExternalContent } from '../../editor/types/external-content'
import { TLChainHandler, defineCapability, definePlugin, defineSlot } from '../plugin'

/**
 * One handler per external content type. A handler set here handles all content of its type.
 * `Editor.registerExternalContentHandler` writes to this map.
 *
 * @public
 */
export type TLExternalContentHandlers = {
	[K in TLExternalContent<any>['type']]: {
		[Key in K]: null | ((info: Extract<TLExternalContent<any>, { type: Key }>) => void)
	}[K]
}

/**
 * One handler per external asset type. `Editor.registerExternalAssetHandler` writes to this map.
 *
 * @public
 */
export type TLExternalAssetHandlers = {
	[K in TLExternalAsset['type']]: {
		[Key in K]: null | ((info: TLExternalAsset & { type: Key }) => Promise<TLAsset | undefined>)
	}[K]
}

/** @public */
export interface TLExternalContentService {
	readonly contentHandlers: TLExternalContentHandlers
	readonly assetHandlers: TLExternalAssetHandlers
	putContent(info: TLExternalContent<any>): Promise<void>
	getAsset(info: TLExternalAsset): Promise<TLAsset | undefined>
}

/** @public */
export const externalContentCapability =
	defineCapability<TLExternalContentService>('externalContent')

/**
 * Handlers for pasted or dropped content. They run in order before the handler in
 * {@link TLExternalContentHandlers} for the content's type. A handler that does not handle the
 * content passes it on with `next`, so several plugins can each handle part of one type, for
 * example one plugin for YouTube URLs and the default handler for all other URLs.
 *
 * @example
 * ```ts
 * ctx.contribute(externalContentSlot, (info, next) => {
 *   if (info.type !== 'url' || !isYouTube(info.url)) return next(info)
 *   createVideoShape(ctx.editor, info.url)
 * })
 * ```
 *
 * @public
 */
export const externalContentSlot = defineSlot<
	TLChainHandler<TLExternalContent<any>, Promise<void> | void>
>('externalContent.handlers')

/**
 * Routes external content (pastes, drops, files) and external assets to their handlers.
 *
 * @public
 */
export const externalContentPlugin = definePlugin({
	id: 'externalContent',
	provides: [externalContentCapability],
	setup(ctx) {
		const contentHandlers: TLExternalContentHandlers = {
			text: null,
			files: null,
			'file-replace': null,
			embed: null,
			'svg-text': null,
			url: null,
			tldraw: null,
			excalidraw: null,
		}
		const assetHandlers: TLExternalAssetHandlers = { file: null, url: null }

		ctx.provide(externalContentCapability, {
			contentHandlers,
			assetHandlers,
			async putContent(info) {
				await ctx.editor.plugins.chain(externalContentSlot, info, (i) =>
					contentHandlers[i.type]?.(i as any)
				)
			},
			async getAsset(info) {
				return await assetHandlers[info.type]?.(info as any)
			},
		})
	},
})
