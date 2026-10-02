import { computed, react } from '@tldraw/state'
import { StoreSnapshot } from '@tldraw/store'
import {
	TLAsset,
	TLAssetId,
	TLBinding,
	TLBindingId,
	TLImageAsset,
	TLPageId,
	TLRecord,
	TLShape,
	TLShapeId,
	TLUser,
	TLUserId,
	TLVideoAsset,
	createBindingId,
	createShapeId,
	createUserId,
	isPageId,
} from '@tldraw/tlschema'
import {
	FileHelpers,
	assertExists,
	compact,
	debounce,
	exhaustiveSwitchError,
	fetch,
	getIndexAbove,
	groupBy,
	structuredClone,
} from '@tldraw/utils'
import { exportToSvg } from '../../../exports/exportToSvg'
import { getSvgAsImageWithOptions, trimSvgToContent } from '../../../exports/getSvgAsImage'
import { Box } from '../../../primitives/Box'
import { Mat } from '../../../primitives/Mat'
import { Vec, VecLike } from '../../../primitives/Vec'
import { dataUrlToFile } from '../../../utils/assets'
import {
	TLDeepLink,
	TLDeepLinkOptions,
	createDeepLinkString,
	parseDeepLinkString,
} from '../../../utils/deepLinks'
import { getDroppedShapesToNewParents, kickoutOccludedShapes } from '../../../utils/reparenting'
import type { Editor } from '../../Editor'
import { alertMaxShapes, toShapeIds, withIsolatedShapes } from '../../editorHelpers'
import { getPasteParentId } from '../../queries/pasteParent'
import { TLContent } from '../../types/clipboard-types'
import { TLExternalAsset, TLExternalContent } from '../../types/external-content'
import { TLImageExportOptions, TLSvgExportOptions } from '../../types/misc-types'
import { EditorManager } from '../EditorManager'

/**
 * Content going in and out of the editor: external content and asset handlers, copy and paste of page content, export to SVG and images, and deep links.
 *
 * @internal
 */
export class ContentManager extends EditorManager {
	/** @internal */
	readonly temporaryAssetPreview = new Map<TLAssetId, string>()

	registerExternalAssetHandler<T extends TLExternalAsset['type']>(
		type: T,
		handler: null | ((info: TLExternalAsset & { type: T }) => Promise<TLAsset>)
	): Editor {
		this.editor.externalAssetContentHandlers[type] = handler as any
		return this.editor
	}

	createTemporaryAssetPreview(assetId: TLAssetId, file: File) {
		if (this.temporaryAssetPreview.has(assetId)) {
			return this.temporaryAssetPreview.get(assetId)
		}

		const objectUrl = URL.createObjectURL(file)
		this.temporaryAssetPreview.set(assetId, objectUrl)

		// eslint-disable-next-line no-restricted-globals -- we always want to revoke the asset and object URL
		setTimeout(() => {
			this.temporaryAssetPreview.delete(assetId)
			URL.revokeObjectURL(objectUrl)
		}, this.editor.options.temporaryAssetPreviewLifetimeMs)

		return objectUrl
	}

	getTemporaryAssetPreview(assetId: TLAssetId) {
		return this.temporaryAssetPreview.get(assetId)
	}

	async getAssetForExternalContent(info: TLExternalAsset): Promise<TLAsset | undefined> {
		return await this.editor.externalAssetContentHandlers[info.type]?.(info as any)
	}

	hasExternalAssetHandler(type: TLExternalAsset['type']): boolean {
		return !!this.editor.externalAssetContentHandlers[type]
	}

	registerExternalContentHandler<T extends TLExternalContent<E>['type'], E>(
		type: T,
		handler:
			| null
			| ((
					info: T extends TLExternalContent<E>['type']
						? Extract<TLExternalContent<E>, { type: T }>
						: TLExternalContent<E>
			  ) => void)
	): Editor {
		this.editor.externalContentHandlers[type] = handler as any
		return this.editor
	}

	async putExternalContent<E>(
		info: TLExternalContent<E>,
		opts = {} as { force?: boolean }
	): Promise<void> {
		if (!opts.force && this.editor.getIsReadonly()) return

		return this.editor.externalContentHandlers[info.type]?.(info as any)
	}

	async replaceExternalContent<E>(
		info: TLExternalContent<E>,
		opts = {} as { force?: boolean }
	): Promise<void> {
		if (!opts.force && this.editor.getIsReadonly()) return
		return this.editor.externalContentHandlers[info.type]?.(info as any)
	}

	getContentFromCurrentPage(shapes: TLShapeId[] | TLShape[]): TLContent | undefined {
		// todo: make this work with any page, not just the current page
		const ids = toShapeIds(shapes)

		if (!ids) return
		if (ids.length === 0) return

		const shapeIds = this.editor.getShapeAndDescendantIds(ids)

		return withIsolatedShapes(this.editor, shapeIds, (bindingIdsToKeep) => {
			const bindings: TLBinding[] = []
			for (const id of bindingIdsToKeep) {
				const binding = this.editor.getBinding(id)
				if (!binding) continue
				bindings.push(binding)
			}

			const rootShapeIds: TLShapeId[] = []
			const shapes: TLShape[] = []
			for (const shapeId of shapeIds) {
				const shape = this.editor.getShape(shapeId)
				if (!shape) continue

				const isRootShape = !shapeIds.has(shape.parentId as TLShapeId)
				if (isRootShape) {
					// Need to get page point and rotation of the shape because shapes in
					// groups use local position/rotation
					const pageTransform = this.editor.getShapePageTransform(shape.id)!
					const pagePoint = pageTransform.point()
					shapes.push({
						...shape,
						x: pagePoint.x,
						y: pagePoint.y,
						rotation: pageTransform.rotation(),
						parentId: this.editor.getCurrentPageId(),
					})
					rootShapeIds.push(shape.id)
				} else {
					shapes.push(shape)
				}
			}

			const assets: TLAsset[] = []
			const seenAssetIds = new Set<TLAssetId>()
			for (const shape of shapes) {
				if (!('assetId' in shape.props)) continue

				const assetId = shape.props.assetId
				if (!assetId || seenAssetIds.has(assetId)) continue

				seenAssetIds.add(assetId)
				const asset = this.editor.getAsset(assetId)
				if (!asset) continue
				assets.push(asset)
			}

			const users: TLUser[] = []
			const seenUserIds = new Set<TLUserId>()
			for (const userId of this.editor._getReferencedUserIds(shapes)) {
				const recordId = createUserId(userId)
				if (seenUserIds.has(recordId)) continue
				seenUserIds.add(recordId)
				const user = this.editor.store.get(recordId)
				if (user) users.push(user)
			}

			return {
				schema: this.editor.store.schema.serialize(),
				shapes,
				rootShapeIds,
				bindings,
				assets,
				users,
			}
		})
	}

	async resolveAssetsInContent(content: TLContent | undefined): Promise<TLContent | undefined> {
		if (!content) return undefined

		const assets: TLAsset[] = []
		await Promise.allSettled(
			content.assets.map(async (asset) => {
				if (
					(asset.type === 'image' || asset.type === 'video') &&
					!asset.props.src?.startsWith('data:image') &&
					!asset.props.src?.startsWith('data:video') &&
					!asset.props.src?.startsWith('http')
				) {
					// If the asset can't be inlined (unresolvable src, fetch failure), fall through and
					// keep the original record; dropping it leaves the pasted shapes pointing at an
					// asset that doesn't exist
					try {
						const objectUrl = await this.editor.store.props.assets.resolve(asset, {
							screenScale: 1,
							steppedScreenScale: 1,
							dpr: 1,
							networkEffectiveType: null,
							shouldResolveToOriginal: true,
						})
						if (objectUrl) {
							// fetch resolves on 4xx/5xx, so without this check a 404 error page would be
							// inlined as a data:text/html src
							const response = await fetch(objectUrl)
							if (response.ok) {
								const assetWithDataUrl = structuredClone(asset as TLImageAsset | TLVideoAsset)
								assetWithDataUrl.props.src = await FileHelpers.blobToDataUrl(await response.blob())
								assets.push(assetWithDataUrl)
								return
							}
							console.warn(`Could not inline asset ${asset.id}: fetch returned ${response.status}`)
						}
					} catch (err) {
						console.warn(`Could not inline asset ${asset.id}`, err)
					}
				}
				assets.push(asset)
			})
		)
		content.assets = assets

		return content
	}

	putContentOntoCurrentPage(
		content: TLContent,
		opts: {
			point?: VecLike
			select?: boolean
			preservePosition?: boolean
			preserveIds?: boolean
		} = {}
	): Editor {
		if (this.editor.getIsReadonly()) return this.editor

		// todo: make this able to support putting content onto any page, not just the current page

		if (!content.schema) {
			throw Error('Could not put content:\ncontent is missing a schema.')
		}

		const { select = false, preserveIds = false, preservePosition = false } = opts
		let { point = undefined } = opts

		// decide on a parent for the put shapes; if the parent is among the put shapes(?) then use its parent

		const currentPageId = this.editor.getCurrentPageId()
		const { rootShapeIds } = content

		// Let's treat the content as a store, and then migrate that store.
		const store: StoreSnapshot<TLRecord> = {
			store: {
				...Object.fromEntries(content.assets.map((asset) => [asset.id, asset] as const)),
				...Object.fromEntries(content.shapes.map((shape) => [shape.id, shape] as const)),
				...Object.fromEntries(
					content.bindings?.map((bindings) => [bindings.id, bindings] as const) ?? []
				),
				...Object.fromEntries(content.users?.map((user) => [user.id, user] as const) ?? []),
			},
			schema: content.schema,
		}
		const result = this.editor.store.schema.migrateStoreSnapshot(store)
		if (result.type === 'error') {
			throw Error('Could not put content: could not migrate content')
		}
		const {
			asset: assets = [],
			shape: shapes = [],
			binding: bindings = [],
			user: users = [],
		} = groupBy(Object.values(result.value), (record) => record.typeName) as {
			asset?: TLAsset[]
			shape?: TLShape[]
			binding?: TLBinding[]
			user?: TLUser[]
		}

		if (users.length > 0) {
			const existingUserIds = new Set(
				this.editor.store
					.allRecords()
					.filter((r): r is TLUser => r.typeName === 'user')
					.map((r) => r.id)
			)
			const usersToCreate = users.filter((u) => !existingUserIds.has(u.id))
			if (usersToCreate.length > 0) {
				this.editor.store.put(usersToCreate)
			}
		}

		// Ok, we've got our migrated records, now we can continue! When ids are preserved a shape
		// keeps its identity, so the maps are the identity too.
		const shapeIdMap = new Map<string, TLShapeId>(
			shapes.map((shape) => [shape.id, preserveIds ? shape.id : createShapeId()])
		)
		const bindingIdMap = new Map<string, TLBindingId>(
			bindings.map((binding) => [binding.id, preserveIds ? binding.id : createBindingId()])
		)

		const shapesById = new Map(shapes.map((s) => [s.id, s]))
		const rootShapesFromContent = compact(rootShapeIds.map((id) => shapesById.get(id)))

		const pasteParentId = getPasteParentId(this.editor, {
			currentPageId,
			rootShapesFromContent,
			shapeIdMap,
			point,
			preservePosition,
		})

		let index = this.editor.getHighestIndexForParent(pasteParentId) // todo: requires that the putting page is the current page

		const rootShapes: TLShape[] = []

		const newShapes: TLShape[] = shapes.map((oldShape): TLShape => {
			const newId = shapeIdMap.get(oldShape.id)!

			// Create the new shape (new except for the id)
			let newShape = { ...oldShape, id: newId }

			// Give the shape util a chance to modify the copy, e.g. to re-stamp note
			// attribution to the current user so we don't forge the original author's identity.
			// When ids are preserved the shape keeps its identity (e.g. moveShapesToPage
			// relocating it), so it's not a duplicate and the hook must not run.
			if (!preserveIds) {
				newShape =
					this.editor.getShapeUtil(newShape).onBeforeDuplicate?.(oldShape, newShape) ?? newShape
			}

			if (rootShapeIds.includes(oldShape.id)) {
				newShape.parentId = currentPageId
				rootShapes.push(newShape)
			}

			// Assign the child to its new parent.

			// If the child's parent is among the putting shapes, then assign
			// it to the new parent's id.
			if (shapeIdMap.has(newShape.parentId)) {
				newShape.parentId = shapeIdMap.get(oldShape.parentId)!
			} else {
				// newShape.parentId = pasteParentId
				newShape.index = index
				index = getIndexAbove(index)
			}

			return newShape
		})

		if (
			newShapes.length + this.editor.getCurrentPageShapeIds().size >
			this.editor.options.maxShapesPerPage
		) {
			// There's some complexity here involving children
			// that might be created without their parents, so
			// if we're going over the limit then just don't paste.
			alertMaxShapes(this.editor)
			return this.editor
		}

		const newBindings = bindings.map(
			(oldBinding): TLBinding => ({
				...oldBinding,
				id: assertExists(bindingIdMap.get(oldBinding.id)),
				fromId: assertExists(shapeIdMap.get(oldBinding.fromId)),
				toId: assertExists(shapeIdMap.get(oldBinding.toId)),
			})
		)

		// These are all the assets we need to create
		const assetsToCreate: TLAsset[] = []

		// These assets have base64 data that may need to be hosted
		const assetsToUpdate: (TLImageAsset | TLVideoAsset)[] = []

		for (const asset of assets) {
			if (this.editor.store.has(asset.id)) {
				// We already have this asset
				continue
			}

			if (
				(asset.type === 'image' && asset.props.src?.startsWith('data:image')) ||
				(asset.type === 'video' && asset.props.src?.startsWith('data:video'))
			) {
				// it's src is a base64 image or video; we need to create a new asset without the src,
				// then create a new asset from the original src. So we keep the original asset for the
				// upload and create a copy with its src removed. Copy rather than mutate: when no
				// migration applies, migrateStoreSnapshot hands back the caller's own record objects.
				assetsToUpdate.push(asset as TLImageAsset | TLVideoAsset)
				const assetWithoutSrc = structuredClone(asset as TLImageAsset | TLVideoAsset)
				assetWithoutSrc.props.src = null
				assetsToCreate.push(assetWithoutSrc)
				continue
			}

			// Add the asset to the list of assets to create
			assetsToCreate.push(asset)
		}

		// Start loading the new assets, order does not matter
		Promise.allSettled(
			(assetsToUpdate as (TLImageAsset | TLVideoAsset)[]).map(async (asset) => {
				// Turn the data url into a file
				const file = await dataUrlToFile(
					asset.props.src!,
					asset.props.name,
					asset.props.mimeType ?? 'image/png'
				)

				// Get a new asset for the file
				const newAsset = await this.editor.getAssetForExternalContent({
					type: 'file',
					file,
					assetId: asset.id,
				})

				if (!newAsset) {
					// If we don't have a new asset, delete the old asset.
					// The shapes that reference this asset should break.
					this.editor.deleteAssets([asset.id])
					return
				}

				// Save the new asset under the old asset's id
				this.editor.updateAssets([{ ...newAsset, id: asset.id }])
			})
		)

		this.editor.run(() => {
			if (assetsToCreate.length > 0) this.editor.createAssets(assetsToCreate)
			this.editor.createShapes(newShapes)
			this.editor.createBindings(newBindings)
			if (select) this.editor.select(...rootShapes.map((s) => s.id))

			// Reparent root shapes to paste parent if not page
			if (pasteParentId !== currentPageId) {
				this.editor.reparentShapes(
					rootShapes.map((s) => s.id),
					pasteParentId
				)
			}

			// --- POSITIONING ---
			const rootBounds = Box.Common(
				compact(rootShapes.map((s) => this.editor.getShapePageBounds(s.id)))
			)

			if (point === undefined) {
				if (!isPageId(pasteParentId)) {
					// Paste into selected parent → center in that shape
					const shape = this.editor.getShape(pasteParentId)!
					point = Mat.applyToPoint(
						this.editor.getShapePageTransform(shape),
						this.editor.getShapeGeometry(shape).bounds.center
					)
				} else if (preservePosition) {
					// preservePosition (page duplication) → keep original coords
					point = rootBounds.center
				} else {
					// Standard paste to page: check viewport overlap
					const viewportPageBounds = this.editor.getViewportPageBounds()
					const anyOverlap = rootShapes.some((s) => {
						const b = this.editor.getShapePageBounds(s.id)
						return b && viewportPageBounds.collides(b)
					})
					point = anyOverlap ? rootBounds.center : viewportPageBounds.center
				}
			}

			// Apply offset to move shapes to target point
			const pageCenter = Box.Common(
				compact(rootShapes.map(({ id }) => this.editor.getShapePageBounds(id)))
			).center
			const offset = Vec.Sub(point, pageCenter)

			if (offset.x !== 0 || offset.y !== 0) {
				this.editor.updateShapes(
					rootShapes.map(({ id }) => {
						const s = this.editor.getShape(id)!
						const localRotation = this.editor.getShapeParentTransform(id).decompose().rotation
						const localDelta = Vec.Rot(offset, -localRotation)
						return { id: s.id, type: s.type, x: s.x + localDelta.x, y: s.y + localDelta.y }
					})
				)
			}

			// Auto-reparent into frames when pasted to page level
			if (isPageId(pasteParentId)) {
				const currentRootShapes = compact(rootShapes.map((s) => this.editor.getShape(s.id)))
				// Don't reparent into source shapes (prevents a duplicate frame
				// from being swallowed by its original), and require the shape's
				// center to be inside the parent (filters out edge-only overlaps)
				const { reparenting } = getDroppedShapesToNewParents(
					this.editor,
					currentRootShapes,
					(shape, parent) => {
						if (shapeIdMap.has(parent.id)) return false
						const shapeBounds = this.editor.getShapePageBounds(shape)
						const parentBounds = this.editor.getShapePageBounds(parent)
						if (!shapeBounds || !parentBounds) return false
						return parentBounds.containsPoint(shapeBounds.center)
					}
				)
				reparenting.forEach((childrenToReparent, newParentId) => {
					if (childrenToReparent.length === 0) return
					this.editor.reparentShapes(
						childrenToReparent.map((s) => s.id),
						newParentId
					)
				})
			}

			// Kick out any pasted root shapes that ended up outside their parent container
			const newShapeIdSet = new Set(newShapes.map((s) => s.id))
			const shapesToKickout = rootShapes
				.map((s) => s.id)
				.filter((id) => {
					const shape = this.editor.getShape(id)
					if (!shape) return false
					// Only check shapes that are children of a shape (not page)
					if (isPageId(shape.parentId)) return false
					// Don't check containers with pasted children (preserves intentional
					// parent-child relationships from the copied content)
					const children = this.editor.getSortedChildIdsForParent(id)
					return !children.some((childId) => newShapeIdSet.has(childId))
				})

			if (shapesToKickout.length > 0) {
				kickoutOccludedShapes(this.editor, shapesToKickout)
			}
		})

		return this.editor
	}

	async getSvgElement(shapes: TLShapeId[] | TLShape[], opts: TLSvgExportOptions = {}) {
		const ids =
			shapes.length === 0 ? this.editor.getCurrentPageShapeIdsSorted() : toShapeIds(shapes)

		if (ids.length === 0) return undefined

		// Text geometry is measured from the loaded font, so the export's bounds - and the
		// layout of any text within it - depend on the right fonts having loaded. Wait for them
		// before we measure; otherwise an export taken before fonts finish loading (e.g. right
		// after the editor mounts) is sized and laid out with fallback-font metrics.
		await this.editor.fonts.loadRequiredFontsForCurrentPage(
			this.editor.options.maxFontsToLoadBeforeRender
		)

		return exportToSvg(this.editor, ids, opts)
	}

	async getSvgString(shapes: TLShapeId[] | TLShape[], opts: TLSvgExportOptions = {}) {
		const result = await this.editor.getSvgElement(shapes, opts)
		if (!result) return undefined

		const serializer = new XMLSerializer()
		return {
			svg: serializer.serializeToString(result.svg),
			width: result.width,
			height: result.height,
			trimPadding: result.trimPadding,
		}
	}

	async toImage(shapes: TLShapeId[] | TLShape[], opts: TLImageExportOptions = {}) {
		const withDefaults = {
			format: 'png',
			scale: 1,
			pixelRatio: opts.format === 'svg' ? undefined : 2,
			...opts,
		} satisfies TLImageExportOptions
		const result = await this.editor.getSvgString(shapes, withDefaults)
		if (!result) throw new Error('Could not create SVG')

		switch (withDefaults.format) {
			case 'svg': {
				let svg = result.svg
				let w = result.width
				let h = result.height
				if (result.trimPadding > 0) {
					const trimmed = await trimSvgToContent(svg, {
						width: w,
						height: h,
						trimPadding: result.trimPadding,
						scale: withDefaults.scale,
					})
					if (trimmed) {
						svg = trimmed.svg
						w = trimmed.width
						h = trimmed.height
					}
				}
				return {
					blob: new Blob([svg], { type: 'image/svg+xml' }),
					width: w,
					height: h,
				}
			}
			case 'jpeg':
			case 'png':
			case 'webp': {
				const imageResult = await getSvgAsImageWithOptions(result.svg, {
					type: withDefaults.format,
					quality: withDefaults.quality,
					pixelRatio: withDefaults.pixelRatio,
					width: result.width,
					height: result.height,
					trimPadding: result.trimPadding,
					scale: withDefaults.scale,
				})
				if (!imageResult) {
					throw new Error('Could not construct image.')
				}
				return imageResult
			}
			default: {
				exhaustiveSwitchError(withDefaults.format)
			}
		}
	}

	async toImageDataUrl(shapes: TLShapeId[] | TLShape[], opts: TLImageExportOptions = {}) {
		const { blob, width, height } = await this.editor.toImage(shapes, opts)
		return {
			url: await FileHelpers.blobToDataUrl(blob),
			width,
			height,
		}
	}

	_zoomToFitPageContentAt100Percent() {
		const bounds = this.editor.getCurrentPageBounds()
		if (bounds) {
			this.editor.zoomToBounds(bounds, { immediate: true, targetZoom: this.editor.getBaseZoom() })
		}
	}
	_navigateToDeepLink(deepLink: TLDeepLink) {
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

	navigateToDeepLink(opts?: TLDeepLink | { url?: string | URL; param?: string }): Editor {
		if (opts && 'type' in opts) {
			this._navigateToDeepLink(opts)
			return this.editor
		}

		const url = new URL(opts?.url ?? window.location.href)
		const deepLinkString = url.searchParams.get(opts?.param ?? 'd')

		if (!deepLinkString) {
			this._zoomToFitPageContentAt100Percent()
			return this.editor
		}

		try {
			this._navigateToDeepLink(parseDeepLinkString(deepLinkString))
		} catch (e) {
			console.warn(e)
			this._zoomToFitPageContentAt100Percent()
		}
		return this.editor
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
