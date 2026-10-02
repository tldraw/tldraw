import { computed } from '@tldraw/state'
import { TLAsset, TLAssetId, TLAssetPartial } from '@tldraw/tlschema'
import { JsonObject } from '@tldraw/utils'
import type { Editor } from '../../Editor'
import { EditorManager } from '../EditorManager'

/**
 * Asset records: lookup, create, update, delete, resolve and upload.
 *
 * @internal
 */
export class AssetsManager extends EditorManager {
	/* --------------------- Assets --------------------- */

	/** @internal */
	@computed _getAllAssetsQuery() {
		return this.editor.store.query.records('asset')
	}

	getAssets() {
		return this._getAllAssetsQuery().get()
	}

	createAssets(assets: TLAsset[]): Editor {
		if (this.editor.getIsReadonly()) return this.editor
		if (assets.length <= 0) return this.editor
		this.editor.run(() => this.editor.store.put(assets), { history: 'ignore' })
		return this.editor
	}

	updateAssets(assets: TLAssetPartial[]): Editor {
		if (this.editor.getIsReadonly()) return this.editor
		if (assets.length <= 0) return this.editor
		this.editor.run(
			() => {
				this.editor.store.put(
					assets.map((partial) => ({
						...this.editor.store.get(partial.id)!,
						...partial,
					}))
				)
			},
			{ history: 'ignore' }
		)
		return this.editor
	}

	deleteAssets(assets: TLAssetId[] | TLAsset[]): Editor {
		if (this.editor.getIsReadonly()) return this.editor

		const ids =
			typeof assets[0] === 'string'
				? (assets as TLAssetId[])
				: (assets as TLAsset[]).map((a) => a.id)
		if (ids.length <= 0) return this.editor

		this.editor.run(
			() => {
				// the asset store's remove is async; surface failures instead of leaving an unhandled rejection
				Promise.resolve(this.editor.store.props.assets.remove?.(ids)).catch((err) =>
					console.error('Error while removing assets from the asset store:', err)
				)
				this.editor.store.remove(ids)
			},
			{ history: 'ignore' }
		)
		return this.editor
	}

	getAsset<T extends TLAsset>(asset: T | T['id']): T | undefined {
		return this.editor.store.get(typeof asset === 'string' ? asset : asset.id) as T | undefined
	}

	async resolveAssetUrl(
		assetId: TLAssetId | null,
		context: {
			screenScale?: number
			shouldResolveToOriginal?: boolean
			dpr?: number
		}
	): Promise<string | null> {
		if (!assetId) return null
		const asset = this.editor.getAsset(assetId)
		if (!asset) return null

		const {
			screenScale = 1,
			shouldResolveToOriginal = false,
			dpr = this.editor.getInstanceState().devicePixelRatio,
		} = context

		// We only look at the zoom level at powers of 2.
		const zoomStepFunction = (zoom: number) => Math.pow(2, Math.ceil(Math.log2(zoom)))
		const steppedScreenScale = zoomStepFunction(screenScale)
		const networkEffectiveType: string | null =
			'connection' in navigator ? ((navigator as any).connection?.effectiveType ?? null) : null

		return await this.editor.store.props.assets.resolve(asset, {
			screenScale: screenScale || 1,
			steppedScreenScale,
			dpr,
			networkEffectiveType,
			shouldResolveToOriginal,
		})
	}

	async uploadAsset(
		asset: TLAsset,
		file: File,
		abortSignal?: AbortSignal
	): Promise<{ src: string; meta?: JsonObject }> {
		return await this.editor.store.props.assets.upload(asset, file, abortSignal)
	}
}
