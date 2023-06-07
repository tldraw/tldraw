import { toDomPrecision } from '@tldraw/primitives'
import { AssetRecordType, TLAssetId, TLBookmarkAsset, TLBookmarkShape } from '@tldraw/tlschema'
import { debounce, getHashForString } from '@tldraw/utils'
import { HTMLContainer } from '../../../components/HTMLContainer'
import {
	DEFAULT_BOOKMARK_HEIGHT,
	DEFAULT_BOOKMARK_WIDTH,
	ROTATING_SHADOWS,
} from '../../../constants'
import {
	rotateBoxShadow,
	stopEventPropagation,
	truncateStringWithEllipsis,
} from '../../../utils/dom'
import { BaseBoxShapeUtil } from '../BaseBoxShapeUtil'
import { TLOnBeforeCreateHandler, TLOnBeforeUpdateHandler } from '../ShapeUtil'
import { HyperlinkButton } from '../shared/HyperlinkButton'

/** @public */
export class BookmarkShapeUtil extends BaseBoxShapeUtil<TLBookmarkShape> {
	static override type = 'bookmark' as const

	override canResize = () => false

	override hideSelectionBoundsBg = () => true
	override hideSelectionBoundsFg = () => true

	override defaultProps(): TLBookmarkShape['props'] {
		return {
			url: '',
			w: DEFAULT_BOOKMARK_WIDTH,
			h: DEFAULT_BOOKMARK_HEIGHT,
			assetId: null,
		}
	}

	override render(shape: TLBookmarkShape) {
		const asset = (
			shape.props.assetId ? this.editor.getAssetById(shape.props.assetId) : null
		) as TLBookmarkAsset

		const pageRotation = this.editor.getPageRotation(shape)

		const address = this.getHumanReadableAddress(shape)

		return (
			<HTMLContainer>
				<div
					className="tl-bookmark__container tl-hitarea-stroke"
					style={{
						boxShadow: rotateBoxShadow(pageRotation, ROTATING_SHADOWS),
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
		this.updateBookmarkAsset(shape)
	}

	override onBeforeUpdate?: TLOnBeforeUpdateHandler<TLBookmarkShape> = (prev, shape) => {
		if (prev.props.url !== shape.props.url) {
			this.updateBookmarkAsset(shape)
		}
	}

	getHumanReadableAddress(shape: TLBookmarkShape) {
		try {
			const url = new URL(shape.props.url)
			const path = url.pathname.replace(/\/*$/, '')
			return `${url.hostname}${path}`
		} catch (e) {
			return shape.props.url
		}
	}

	protected updateBookmarkAsset = debounce((shape: TLBookmarkShape) => {
		const { url } = shape.props
		const assetId: TLAssetId = AssetRecordType.createId(getHashForString(url))
		const existing = this.editor.getAssetById(assetId)

		if (existing) {
			// If there's an existing asset with the same URL, use
			// its asset id instead.
			if (shape.props.assetId !== existing.id) {
				this.editor.updateShapes([
					{
						id: shape.id,
						type: shape.type,
						props: { assetId },
					},
				])
			}
		} else if (this.editor.onCreateBookmarkFromUrl) {
			// Create a bookmark asset for the URL. First get its meta
			// data, then create the asset and update the shape.
			this.editor.onCreateBookmarkFromUrl(url).then((meta) => {
				if (!meta) {
					this.editor.updateShapes([
						{
							id: shape.id,
							type: shape.type,
							props: { assetId: undefined },
						},
					])
					return
				}

				this.editor.batch(() => {
					this.editor
						.createAssets([
							{
								id: assetId,
								typeName: 'asset',
								type: 'bookmark',
								props: {
									src: url,
									description: meta.description,
									image: meta.image,
									title: meta.title,
								},
							},
						])
						.updateShapes([
							{
								id: shape.id,
								type: shape.type,
								props: { assetId },
							},
						])
				})
			})
		}
	}, 500)
}
