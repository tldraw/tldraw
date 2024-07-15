import {
	AssetRecordType,
	BaseBoxShapeUtil,
	Editor,
	HTMLContainer,
	T,
	TLAssetId,
	TLBookmarkAsset,
	TLBookmarkShape,
	TLOnBeforeUpdateHandler,
	bookmarkShapeMigrations,
	bookmarkShapeProps,
	debounce,
	getHashForString,
	stopEventPropagation,
	toDomPrecision,
} from '@tldraw/editor'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { LINK_ICON } from '../shared/icons-editor'
import { getRotatedBoxShadow } from '../shared/rotated-box-shadow'

const BOOKMARK_WIDTH = 300
const BOOKMARK_HEIGHT = 320
const BOOKMARK_JUST_URL_HEIGHT = 46
const SHORT_BOOKMARK_HEIGHT = 101

/** @public */
export class BookmarkShapeUtil extends BaseBoxShapeUtil<TLBookmarkShape> {
	static override type = 'bookmark' as const
	static override props = bookmarkShapeProps
	static override migrations = bookmarkShapeMigrations

	override canResize = () => false

	override hideSelectionBoundsFg = () => true

	override getDefaultProps(): TLBookmarkShape['props'] {
		return {
			url: '',
			w: BOOKMARK_WIDTH,
			h: BOOKMARK_HEIGHT,
			assetId: null,
		}
	}

	override component(shape: TLBookmarkShape) {
		const asset = (
			shape.props.assetId ? this.editor.getAsset(shape.props.assetId) : null
		) as TLBookmarkAsset

		const pageRotation = this.editor.getShapePageTransform(shape)!.rotation()

		const address = getHumanReadableAddress(shape)

		return (
			<HTMLContainer>
				<div
					className="tl-bookmark__container"
					style={{
						boxShadow: getRotatedBoxShadow(pageRotation),
						maxHeight: shape.props.h,
					}}
				>
					{(!asset || asset.props.image) && (
						<div className="tl-bookmark__image_container">
							{asset ? (
								<img
									className="tl-bookmark__image"
									draggable={false}
									referrerPolicy="strict-origin-when-cross-origin"
									src={asset?.props.image}
									alt={asset?.props.title || ''}
								/>
							) : (
								<div className="tl-bookmark__placeholder" />
							)}
							{asset?.props.image && (
								<HyperlinkButton url={shape.props.url} zoomLevel={this.editor.getZoomLevel()} />
							)}
						</div>
					)}
					<div className="tl-bookmark__copy_container">
						{asset?.props.title ? (
							<h2 className="tl-bookmark__heading">{asset.props.title}</h2>
						) : null}
						{asset?.props.description && asset?.props.image ? (
							<p className="tl-bookmark__description">{asset.props.description}</p>
						) : null}
						<a
							className="tl-bookmark__link"
							href={shape.props.url || ''}
							target="_blank"
							rel="noopener noreferrer"
							onPointerDown={stopEventPropagation}
							onPointerUp={stopEventPropagation}
							onClick={stopEventPropagation}
						>
							{asset?.props.favicon ? (
								<img
									className="tl-bookmark__favicon"
									src={asset?.props.favicon}
									referrerPolicy="strict-origin-when-cross-origin"
									alt={`favicon of ${address}`}
								/>
							) : (
								<div
									className="tl-hyperlink__icon"
									style={{
										mask: `url("${LINK_ICON}") center 100% / 100% no-repeat`,
										WebkitMask: `url("${LINK_ICON}") center 100% / 100% no-repeat`,
									}}
								/>
							)}
							<span>{address}</span>
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
				rx="6"
				ry="6"
			/>
		)
	}

	override onBeforeCreate = (next: TLBookmarkShape) => {
		return getBookmarkSize(this.editor, next)
	}

	override onBeforeUpdate?: TLOnBeforeUpdateHandler<TLBookmarkShape> = (prev, shape) => {
		if (prev.props.url !== shape.props.url) {
			if (!T.linkUrl.isValid(shape.props.url)) {
				return { ...shape, props: { ...shape.props, url: prev.props.url } }
			} else {
				updateBookmarkAssetOnUrlChange(this.editor, shape)
			}
		}

		if (prev.props.assetId !== shape.props.assetId) {
			return getBookmarkSize(this.editor, shape)
		}
	}
}

function getBookmarkSize(editor: Editor, shape: TLBookmarkShape) {
	const asset = (
		shape.props.assetId ? editor.getAsset(shape.props.assetId) : null
	) as TLBookmarkAsset

	let h = BOOKMARK_HEIGHT

	if (asset) {
		if (!asset.props.image) {
			if (!asset.props.title) {
				h = BOOKMARK_JUST_URL_HEIGHT
			} else {
				h = SHORT_BOOKMARK_HEIGHT
			}
		}
	}

	return {
		...shape,
		props: {
			...shape.props,
			h,
		},
	}
}

/** @internal */
export const getHumanReadableAddress = (shape: TLBookmarkShape) => {
	try {
		const url = new URL(shape.props.url)
		// we want the hostname without any www
		return url.hostname.replace(/^www\./, '')
	} catch (e) {
		return shape.props.url
	}
}

function updateBookmarkAssetOnUrlChange(editor: Editor, shape: TLBookmarkShape) {
	const { url } = shape.props

	// Derive the asset id from the URL
	const assetId: TLAssetId = AssetRecordType.createId(getHashForString(url))

	if (editor.getAsset(assetId)) {
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
	if (editor.isDisposed) return

	const { url } = shape.props

	// Create the asset using the external content manager's createAssetFromUrl method.
	// This may be overwritten by the user (for example, we overwrite it on tldraw.com)
	const asset = await editor.getAssetForExternalContent({ type: 'url', url })

	if (!asset) {
		// No asset? Just leave the bookmark as a null assetId.
		return
	}

	editor.run(() => {
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
