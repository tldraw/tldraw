import { toDomPrecision } from '@tldraw/primitives'
import { AssetRecordType, TLAssetId, TLBookmarkAsset, TLBookmarkShape } from '@tldraw/tlschema'
import { debounce, getHashForString } from '@tldraw/utils'
import { HTMLContainer } from '../../../components/HTMLContainer'

import { isValidUrl } from '../../../utils/data'
import {
	getRotatedBoxShadow,
	stopEventPropagation,
	truncateStringWithEllipsis,
} from '../../../utils/dom'
import { Editor } from '../../Editor'
import { BaseBoxShapeUtil } from '../BaseBoxShapeUtil'
import { TLOnBeforeCreateHandler, TLOnBeforeUpdateHandler } from '../ShapeUtil'
import { HyperlinkButton } from '../shared/HyperlinkButton'

/** @public */
export class BookmarkShapeUtil extends BaseBoxShapeUtil<TLBookmarkShape> {
	static override type = 'bookmark' as const

	override canResize = () => false

	override hideSelectionBoundsBg = () => true
	override hideSelectionBoundsFg = () => true

	override getDefaultProps(): TLBookmarkShape['props'] {
		return {
			url: '',
			w: 300,
			h: 320,
			assetId: null,
		}
	}

	override component(shape: TLBookmarkShape) {
		const asset = (
			shape.props.assetId ? this.editor.getAssetById(shape.props.assetId) : null
		) as TLBookmarkAsset

		const pageRotation = this.editor.getPageRotation(shape)

		const address = getHumanReadableAddress(shape)

		return (
			<HTMLContainer>
				<div
					className="tl-bookmark__container tl-hitarea-stroke"
					style={{
						boxShadow: getRotatedBoxShadow(pageRotation),
					}}
				>
					<div className="tl-bookmark__image_container">
						{asset?.props.image ? (
							<img
								className="tl-bookmark__image"
								draggable={false}
								src={asset?.props.image}
								alt={asset?.props.title || ''}
							/>
						) : (
							<div className="tl-bookmark__placeholder" />
						)}
						<HyperlinkButton url={shape.props.url} zoomLevel={this.editor.zoomLevel} />
					</div>
					<div className="tl-bookmark__copy_container">
						{asset?.props.title && (
							<h2 className="tl-bookmark__heading">
								{truncateStringWithEllipsis(asset?.props.title || '', 54)}
							</h2>
						)}
						{asset?.props.description && (
							<p className="tl-bookmark__description">
								{truncateStringWithEllipsis(asset?.props.description || '', 128)}
							</p>
						)}
						<a
							className="tl-bookmark__link"
							href={shape.props.url || ''}
							target="_blank"
							rel="noopener noreferrer"
							onPointerDown={stopEventPropagation}
							onPointerUp={stopEventPropagation}
							onClick={stopEventPropagation}
						>
							{truncateStringWithEllipsis(address, 45)}
						</a>
					</div>
				</div>
			</HTMLContainer>
		)
	}

	override indicator(shape: TLBookmarkShape) {
		return (
			<rect
				width={toDomPrecision(shape.props.w)}
				height={toDomPrecision(shape.props.h)}
				rx="8"
				ry="8"
			/>
		)
	}

	override onBeforeCreate?: TLOnBeforeCreateHandler<TLBookmarkShape> = (shape) => {
		updateBookmarkAssetOnUrlChange(this.editor, shape)
	}

	override onBeforeUpdate?: TLOnBeforeUpdateHandler<TLBookmarkShape> = (prev, shape) => {
		if (prev.props.url !== shape.props.url) {
			if (!isValidUrl(shape.props.url)) {
				return { ...shape, props: { ...shape.props, url: prev.props.url } }
			} else {
				updateBookmarkAssetOnUrlChange(this.editor, shape)
			}
		}
	}
}

/** @internal */
export const getHumanReadableAddress = (shape: TLBookmarkShape) => {
	try {
		const url = new URL(shape.props.url)
		const path = url.pathname.replace(/\/*$/, '')
		return `${url.hostname}${path}`
	} catch (e) {
		return shape.props.url
	}
}

function updateBookmarkAssetOnUrlChange(editor: Editor, shape: TLBookmarkShape) {
	const { url } = shape.props

	// Derive the asset id from the URL
	const assetId: TLAssetId = AssetRecordType.createId(getHashForString(url))

	if (editor.getAssetById(assetId)) {
		// Existing asset for this URL?
		if (shape.props.assetId !== assetId) {
			editor.updateShapes<TLBookmarkShape>([
				{
					id: shape.id,
					type: shape.type,
					props: { assetId },
				},
			])
		}
	} else {
		// No asset for this URL?

		// First, clear out the existing asset reference
		editor.updateShapes<TLBookmarkShape>([
			{
				id: shape.id,
				type: shape.type,
				props: { assetId: null },
			},
		])

		// Then try to asyncronously create a new one
		createBookmarkAssetOnUrlChange(editor, shape)
	}
}

const createBookmarkAssetOnUrlChange = debounce(async (editor: Editor, shape: TLBookmarkShape) => {
	const { url } = shape.props

	// Create the asset using the external content manager's createAssetFromUrl method.
	// This may be overwritten by the user (for example, we overwrite it on tldraw.com)
	const asset = await editor.externalContentManager.createAssetFromUrl(editor, url)

	if (!asset) {
		// No asset? Just leave the bookmark as a null assetId.
		return
	}

	editor.batch(() => {
		// Create the new asset
		editor.createAssets([asset])

		// And update the shape
		editor.updateShapes<TLBookmarkShape>([
			{
				id: shape.id,
				type: shape.type,
				props: { assetId: asset.id },
			},
		])
	})
}, 500)
