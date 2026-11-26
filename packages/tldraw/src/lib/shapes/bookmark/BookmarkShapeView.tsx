import {
	HTMLContainer,
	TLAssetId,
	TLBookmarkAsset,
	TLBookmarkShape,
	TLShapeView,
	definePlugin,
	shapeViewSlot,
	tlenv,
	useEditor,
	useSvgExportContext,
} from '@tldraw/editor'
import classNames from 'classnames'
import { PointerEventHandler, useCallback, useState } from 'react'
import { convertCommonTitleHTMLEntities } from '../../utils/text/text'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { LINK_ICON } from '../shared/icons-editor'
import { getRotatedBoxShadow } from '../shared/rotated-box-shadow'
import { useOpenLinkHandler } from '../shared/useOpenLinkHandler'
import {
	getBookmarkShapeHeight,
	getHumanReadableAddress,
	getResolvedBookmarkAssetId,
	isUrlOnlyBookmarkUrl,
} from './bookmarks'
import type { BookmarkShapeUtil } from './BookmarkShapeUtil'

/** @public */
export const bookmarkShapeView: TLShapeView<TLBookmarkShape, BookmarkShapeUtil> = {
	type: 'bookmark',
	component(shape, util) {
		const { assetId, url } = shape.props
		const h = getBookmarkShapeHeight(util.editor, shape)
		const rotation = util.editor.getShapePageTransform(shape)!.rotation()

		return <BookmarkShapeComponent assetId={assetId} url={url} h={h} rotation={rotation} />
	},
}

/**
 * Draws bookmark shapes with {@link bookmarkShapeView}. Importing `tldraw` adds it to
 * `createDefaultPlugins()`, see {@link defaultShapeViewPlugins}.
 *
 * @public
 */
export const bookmarkShapeViewPlugin = definePlugin({
	id: 'bookmarkShapeView',
	setup: (ctx) => void ctx.contribute(shapeViewSlot, bookmarkShapeView),
})

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

	const resolvedAssetId = getResolvedBookmarkAssetId(editor, assetId, url)
	const asset = resolvedAssetId ? (editor.getAsset(resolvedAssetId) as TLBookmarkAsset) : null

	const isSafariExport = !!useSvgExportContext() && tlenv.isSafari

	const address = getHumanReadableAddress(url)
	const title = asset ? asset.props.title : isUrlOnlyBookmarkUrl(url) ? url : ''

	const [isFaviconValid, setIsFaviconValid] = useState(true)
	const onFaviconError = () => setIsFaviconValid(false)

	const handleOpenLink = useOpenLinkHandler(url)
	const markAsHandledOnShiftKey = useCallback<PointerEventHandler>(
		(e) => {
			if (!editor.inputs.getShiftKey()) editor.markEventAsHandled(e)
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
				{showImageContainer && (asset ? asset.props.image : !isUrlOnlyBookmarkUrl(url)) && (
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
					{title ? (
						<a
							className="tl-bookmark__link"
							href={url || ''}
							target="_blank"
							rel="noopener noreferrer"
							draggable={false}
							onPointerDown={markAsHandledOnShiftKey}
							onPointerUp={markAsHandledOnShiftKey}
							onClick={handleOpenLink}
							onAuxClick={handleOpenLink}
						>
							<h2 className="tl-bookmark__heading">{convertCommonTitleHTMLEntities(title)}</h2>
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
						onClick={handleOpenLink}
						onAuxClick={handleOpenLink}
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
