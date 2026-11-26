// This module is part of the headless core. It must not import React or touch the DOM.
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
	isShapeId,
} from '@tldraw/tlschema'
import {
	FileHelpers,
	assertExists,
	compact,
	fetch,
	getIndexAbove,
	structuredClone,
} from '@tldraw/utils'
import type { Editor } from '../../editor/Editor'
import { alertMaxShapes, toShapeIds, withIsolatedShapes } from '../../editor/recordUtils'
import { TLContent } from '../../editor/types/clipboard-types'
import { Box } from '../../primitives/Box'
import { Mat } from '../../primitives/Mat'
import { Vec, VecLike } from '../../primitives/Vec'
import { dataUrlToFile } from '../../utils/assets'
import { getDroppedShapesToNewParents, kickoutOccludedShapes } from '../../utils/reparenting'

/**
 * Copies shapes out of the current page as portable content, and puts content onto the current
 * page: it remaps ids, resolves assets, migrates records from other schema versions and places
 * the shapes. Copy, paste, duplicate page and move to page use it.
 *
 * @public
 */
export class ContentController {
	constructor(private readonly editor: Editor) {}

	/**
	 * Get content that can be exported for the given shape ids.
	 *
	 * @param shapes - The shapes (or shape ids) to get content for.
	 *
	 * @returns The exported content.
	 *
	 * @public
	 */
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

	/**
	 * Place content into the editor.
	 *
	 * @param content - The content.
	 * @param opts - Options for placing the content.
	 *
	 * @public
	 */
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

		// We need to collect the migrated records
		const assets: TLAsset[] = []
		let shapes: TLShape[] = []
		let bindings: TLBinding[] = []
		const users: TLUser[] = []

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
		for (const record of Object.values(result.value)) {
			switch (record.typeName) {
				case 'asset': {
					assets.push(record)
					break
				}
				case 'shape': {
					shapes.push(record)
					break
				}
				case 'binding': {
					bindings.push(record)
					break
				}
				case 'user': {
					users.push(record)
					break
				}
			}
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

		// Content from an editor with more shape or binding types than this one, for example one
		// with a plugin that this editor leaves out, keeps the records that this editor can hold.
		// Creating the others would throw.
		const unknownShapes = shapes.filter((shape) => !this.editor.hasShapeUtil(shape.type))
		const unknownBindings = bindings.filter((binding) => !this.editor.bindingUtils[binding.type])
		if (unknownShapes.length > 0 || unknownBindings.length > 0) {
			const droppedShapeIds = new Set(unknownShapes.map((shape) => shape.id))
			// A child of a dropped shape has lost its parent, so it goes too.
			let grew = droppedShapeIds.size > 0
			while (grew) {
				grew = false
				for (const shape of shapes) {
					if (!droppedShapeIds.has(shape.id) && droppedShapeIds.has(shape.parentId as TLShapeId)) {
						droppedShapeIds.add(shape.id)
						grew = true
					}
				}
			}
			const droppedTypes = new Set([...unknownShapes, ...unknownBindings].map((r) => r.type))
			console.warn(
				`Skipped pasted records of types this editor has no util for: ${[...droppedTypes].join(', ')}`
			)
			shapes = shapes.filter((shape) => !droppedShapeIds.has(shape.id))
			bindings = bindings.filter(
				(binding) =>
					!!this.editor.bindingUtils[binding.type] &&
					!droppedShapeIds.has(binding.fromId) &&
					!droppedShapeIds.has(binding.toId)
			)
			if (shapes.length === 0) return this.editor
		}

		// Ok, we've got our migrated records, now we can continue!
		const shapeIdMap = new Map<string, TLShapeId>(
			preserveIds
				? shapes.map((shape) => [shape.id, shape.id])
				: shapes.map((shape) => [shape.id, createShapeId()])
		)
		const bindingIdMap = new Map<string, TLBindingId>(
			preserveIds
				? bindings.map((binding) => [binding.id, binding.id])
				: bindings.map((binding) => [binding.id, createBindingId()])
		)

		let pasteParentId: TLPageId | TLShapeId = currentPageId

		const shapesById = new Map(shapes.map((s) => [s.id, s]))
		const rootShapesFromContent = compact(rootShapeIds.map((id) => shapesById.get(id)))

		if (point) {
			// PASTE AT CURSOR: find the deepest accepts-children shape under the cursor
			if (rootShapesFromContent.length > 0) {
				const targetParent = this.editor.getShapeAtPoint(point, {
					hitInside: true,
					hitFrameInside: true,
					hitLocked: true,
					filter: (shape) => {
						const util = this.editor.getShapeUtil(shape)
						return rootShapesFromContent.every((rootShape) =>
							util.canReceiveNewChildrenOfType?.(shape, rootShape.type)
						)
					},
				})
				pasteParentId = targetParent?.id ?? currentPageId
			}
		} else if (!preservePosition) {
			// STANDARD PASTE: check if a selected shape (or its ancestor) accepts children
			const selectedShapes = this.editor.getSelectedShapes()
			let selectedParent: TLShape | null = null

			const canAcceptAll = (candidate: TLShape) => {
				const util = this.editor.getShapeUtil(candidate)
				return rootShapesFromContent.every((rs) =>
					util.canReceiveNewChildrenOfType?.(candidate, rs.type)
				)
			}

			for (const shape of selectedShapes) {
				// Find the nearest container: the shape itself if it can accept,
				// an accepting ancestor, or fall back to the shape's parent
				// (handles groups and other non-frame containers)
				const candidate = canAcceptAll(shape)
					? shape
					: (this.editor.findShapeAncestor(shape, canAcceptAll) ??
						(isShapeId(shape.parentId) ? this.editor.getShape(shape.parentId)! : null))

				if (!candidate) {
					selectedParent = null
					break
				}
				if (!selectedParent) {
					selectedParent = candidate
				} else if (selectedParent.id !== candidate.id) {
					// Different candidates — find the deepest common accepting ancestor
					const spAncestors = this.editor.getShapeAncestors(selectedParent)
					if (canAcceptAll(selectedParent)) spAncestors.push(selectedParent)
					const acceptingAncestors = spAncestors.filter(canAcceptAll)

					const candidateAncestorIds = new Set([
						candidate.id,
						...this.editor.getShapeAncestors(candidate).map((a) => a.id),
					])

					let common: TLShape | null = null
					for (let i = acceptingAncestors.length - 1; i >= 0; i--) {
						if (candidateAncestorIds.has(acceptingAncestors[i].id)) {
							common = acceptingAncestors[i]
							break
						}
					}

					selectedParent = common
					if (!selectedParent) break
				}
			}

			// Don't paste a shape into itself (the duplicating-a-frame case)
			if (selectedParent && shapeIdMap.has(selectedParent.id)) {
				selectedParent = null
			}

			if (selectedParent) {
				pasteParentId = selectedParent.id
			}
		}

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
}
