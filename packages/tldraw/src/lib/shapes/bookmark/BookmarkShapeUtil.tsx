import {
	AssetRecordType,
	BaseBoxShapeUtil,
	Editor,
	HTMLContainer,
	T,
	TLAssetId,
	TLBookmarkAsset,
	TLBookmarkShape,
	TLBookmarkShapeProps,
	bookmarkShapeMigrations,
	bookmarkShapeProps,
	debounce,
	getHashForString,
	lerp,
	tlenv,
	toDomPrecision,
	useEditor,
	useSvgExportContext,
} from '@tldraw/editor'
import classNames from 'classnames'
import { PointerEventHandler, useCallback, useState } from 'react'
import { convertCommonTitleHTMLEntities } from '../../utils/text/text'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { LINK_ICON } from '../shared/icons-editor'
import { getRotatedBoxShadow } from '../shared/rotated-box-shadow'

export const BOOKMARK_WIDTH = 300
const BOOKMARK_HEIGHT = 320
export const BOOKMARK_JUST_URL_HEIGHT = 46
const SHORT_BOOKMARK_HEIGHT = 101

/** @public */
export class BookmarkShapeUtil extends BaseBoxShapeUtil<TLBookmarkShape> {
	static override type = 'bookmark' as const
	static override props = bookmarkShapeProps
	static override migrations = bookmarkShapeMigrations

	override canResize() {
		return false
	}

	override hideSelectionBoundsFg() {
		return true
	}

	override getText(shape: TLBookmarkShape) {
		return shape.props.url
	}

	override getAriaDescriptor(shape: TLBookmarkShape) {
		const asset = (
			shape.props.assetId ? this.editor.getAsset(shape.props.assetId) : null
		) as TLBookmarkAsset | null

		if (!asset?.props.title) return undefined

		return (
			convertCommonTitleHTMLEntities(asset.props.title) +
			(asset.props.description ? ', ' + asset.props.description : '')
		)
	}

	override getDefaultProps(): TLBookmarkShape['props'] {
		return {
			url: '',
			w: BOOKMARK_WIDTH,
			h: BOOKMARK_HEIGHT,
			assetId: null,
		}
	}

	override component(shape: TLBookmarkShape) {
		const { assetId, url, h } = shape.props
		const rotation = this.editor.getShapePageTransform(shape)!.rotation()

		return <BookmarkShapeComponent assetId={assetId} url={url} h={h} rotation={rotation} />
	}

	override indicator(shape: TLBookmarkShape) {
		return <BookmarkIndicatorComponent w={shape.props.w} h={shape.props.h} />
	}

	override onBeforeCreate(next: TLBookmarkShape) {
		return getBookmarkSize(this.editor, next)
	}

	override onBeforeUpdate(prev: TLBookmarkShape, shape: TLBookmarkShape) {
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
	override getInterpolatedProps(
		startShape: TLBookmarkShape,
		endShape: TLBookmarkShape,
		t: number
	): TLBookmarkShapeProps {
		return {
			...(t > 0.5 ? endShape.props : startShape.props),
			w: lerp(startShape.props.w, endShape.props.w, t),
			h: lerp(startShape.props.h, endShape.props.h, t),
		}
	}
}

export function BookmarkShapeComponent({
	assetId,
	rotation,
	url,
	h,
	showImageContainer = true,
}: {
	assetId: TLAssetId | null
	rotation: number
	h: number
	url: string
	showImageContainer?: boolean
}) {
	const editor = useEditor()

	const asset = assetId ? (editor.getAsset(assetId) as TLBookmarkAsset) : null

	const isSafariExport = !!useSvgExportContext() && tlenv.isSafari

	const address = getHumanReadableAddress(url)

	const [isFaviconValid, setIsFaviconValid] = useState(true)
	const onFaviconError = () => setIsFaviconValid(false)

	const markAsHandledOnShiftKey = useCallback<PointerEventHandler>(
		(e) => {
			if (!editor.inputs.shiftKey) editor.markEventAsHandled(e)
		},
		[editor]
	)

	return (
		<HTMLContainer>
			<div
				className={classNames(
					'tl-bookmark__container',
					isSafariExport && 'tl-bookmark__container--safariExport'
				)}
				style={{
					boxShadow: isSafariExport ? undefined : getRotatedBoxShadow(rotation),
					maxHeight: h,
				}}
			>
				{showImageContainer && (!asset || asset.props.image) && (
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
						{asset?.props.image && <HyperlinkButton url={url} />}
					</div>
				)}
				<div className="tl-bookmark__copy_container">
					{asset?.props.title ? (
						<a
							className="tl-bookmark__link"
							href={url || ''}
							target="_blank"
							rel="noopener noreferrer"
							draggable={false}
							onPointerDown={markAsHandledOnShiftKey}
							onPointerUp={markAsHandledOnShiftKey}
						>
							<h2 className="tl-bookmark__heading">
								{convertCommonTitleHTMLEntities(asset.props.title)}
							</h2>
						</a>
					) : null}
					{asset?.props.description && asset?.props.image ? (
						<p className="tl-bookmark__description">{asset.props.description}</p>
					) : null}
					<a
						className="tl-bookmark__link"
						href={url || ''}
						target="_blank"
						rel="noopener noreferrer"
						draggable={false}
						onPointerDown={markAsHandledOnShiftKey}
						onPointerUp={markAsHandledOnShiftKey}
					>
						{isFaviconValid && asset?.props.favicon ? (
							<img
								className="tl-bookmark__favicon"
								src={asset?.props.favicon}
								referrerPolicy="strict-origin-when-cross-origin"
								onError={onFaviconError}
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

export function BookmarkIndicatorComponent({ w, h }: { w: number; h: number }) {
	return <rect width={toDomPrecision(w)} height={toDomPrecision(h)} rx="6" ry="6" />
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
export const getHumanReadableAddress = (url: string) => {
	try {
		const urlObj = new URL(url)
		// we want the hostname without any www
		return urlObj.hostname.replace(/^www\./, '')
	} catch {
		return url
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
