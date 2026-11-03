import { SvgExportContext, TLAssetId, clamp, useUniqueSafeId } from '@tldraw/editor'
import { SVGProps } from 'react'
import { getFontFamily } from './default-shape-constants'

const PADDING = 16

/**
 * An image in a preview export, by reference: the stored SVG never holds its URL or data, and
 * whoever shows the preview resolves it.
 *
 * - `assetId`: an asset in the exported content, resolved through the asset store, or read from
 *   `field` (e.g. a bookmark's `image` or `favicon`) when given.
 * - `embedIcon`: an embed definition's type, resolved to the host's icon for it.
 *
 * @public
 */
export interface PreviewImageRef {
	assetId?: TLAssetId
	field?: string
	embedIcon?: string
}

/** @public */
export type PreviewImageProps = PreviewImageRef & Omit<SVGProps<SVGImageElement>, 'href'>

/**
 * An `<image>` for `ShapeUtil.toPreviewSvg` that points at an asset instead of carrying it.
 * Use it wherever `toSvg` would embed a picture.
 *
 * @example
 * ```tsx
 * override toPreviewSvg(shape: MyShape) {
 * 	return <PreviewImage assetId={shape.props.assetId} width={shape.props.w} height={shape.props.h} />
 * }
 * ```
 *
 * @public @react
 */
export function PreviewImage({ assetId, field, embedIcon, ...props }: PreviewImageProps) {
	return (
		<image
			{...props}
			data-tl-asset-id={assetId}
			data-tl-asset-field={field}
			data-tl-embed-icon={embedIcon}
		/>
	)
}

// SVG text doesn't wrap or clip, so text is cut to roughly what fits on one line.
function truncate(text: string, width: number, fontSize: number) {
	const maxChars = Math.max(1, Math.floor(width / (fontSize * 0.55)))
	return text.length > maxChars ? text.slice(0, maxChars - 1) + '…' : text
}

/** @public */
export interface PreviewCardProps {
	w: number
	h: number
	title: string
	caption?: string
	/** Shown on top, filling the card's width. */
	image?: PreviewImageRef
	/** Shown beside the title, or above it when the card has no image. */
	icon?: PreviewImageRef
	ctx: SvgExportContext
}

/**
 * A card for `ShapeUtil.toPreviewSvg`, for shapes that show live content a stored preview
 * can't hold, such as a page or an iframe: an optional picture, then an icon, a title and a
 * caption. Bookmarks and embeds use it.
 *
 * @example
 * ```tsx
 * override toPreviewSvg(shape: MapShape, ctx: SvgExportContext) {
 * 	return <PreviewCard w={shape.props.w} h={shape.props.h} title={shape.props.place} ctx={ctx} />
 * }
 * ```
 *
 * @public @react
 */
export function PreviewCard({ w, h, title, caption, image, icon, ctx }: PreviewCardProps) {
	const clipId = useUniqueSafeId()
	const colors = ctx.theme.colors[ctx.colorMode]
	const fontFamily = getFontFamily(ctx.theme, 'sans')
	// Previews are usually shown far smaller than the shape, so text and icons scale with the card
	// rather than matching the canvas.
	const titleSize = clamp(w / 10, 12, 64)
	const captionSize = titleSize * 0.75
	const textHeight = titleSize * 1.25 + (caption ? captionSize * 1.5 : 0)
	const footerHeight = PADDING * 2 + textHeight
	const centredIconSize = clamp(Math.min(w, h) / 3, 16, 160)

	const text = (x: number, y: number, width: number, anchor: 'start' | 'middle') => (
		<>
			<text
				x={x}
				y={y}
				textAnchor={anchor}
				dominantBaseline="hanging"
				fill={colors.text}
				fontSize={titleSize}
				fontWeight="bold"
				fontFamily={fontFamily}
			>
				{truncate(title, width, titleSize)}
			</text>
			{caption && (
				<text
					x={x}
					y={y + titleSize * 1.4}
					textAnchor={anchor}
					dominantBaseline="hanging"
					fill={colors.text}
					fillOpacity={0.6}
					fontSize={captionSize}
					fontFamily={fontFamily}
				>
					{truncate(caption, width, captionSize)}
				</text>
			)}
		</>
	)

	let content
	if (image && h >= footerHeight * 2) {
		// Picture on top, like the bookmark on the canvas.
		const imageHeight = h - footerHeight
		const iconSize = icon ? titleSize * 1.25 : 0
		const textX = PADDING + (icon ? iconSize + PADDING / 2 : 0)
		content = (
			<>
				<PreviewImage
					{...image}
					width={w}
					height={imageHeight}
					preserveAspectRatio="xMidYMid slice"
					clipPath={`url(#${clipId})`}
				/>
				{icon && (
					<PreviewImage
						{...icon}
						x={PADDING}
						y={imageHeight + PADDING}
						width={iconSize}
						height={iconSize}
					/>
				)}
				{text(textX, imageHeight + PADDING, w - textX - PADDING, 'start')}
			</>
		)
	} else if (icon && centredIconSize + PADDING * 2.5 + textHeight <= h) {
		// Centred, for an embed: the service's icon over its name.
		const iconSize = centredIconSize
		const top = (h - iconSize - PADDING / 2 - textHeight) / 2
		content = (
			<>
				<PreviewImage {...icon} x={(w - iconSize) / 2} y={top} width={iconSize} height={iconSize} />
				{text(w / 2, top + iconSize + PADDING / 2, w - PADDING * 2, 'middle')}
			</>
		)
	} else {
		const iconSize = icon ? Math.min(titleSize * 1.5, h - PADDING) : 0
		const textX = PADDING + (icon ? iconSize + PADDING / 2 : 0)
		content = (
			<>
				{icon && (
					<PreviewImage
						{...icon}
						x={PADDING}
						y={(h - iconSize) / 2}
						width={iconSize}
						height={iconSize}
					/>
				)}
				{text(textX, Math.max(4, (h - textHeight) / 2), w - textX - PADDING, 'start')}
			</>
		)
	}

	return (
		<>
			<defs>
				<clipPath id={clipId}>
					<rect width={w} height={h} rx={8} />
				</clipPath>
			</defs>
			<rect width={w} height={h} rx={8} fill={colors.background} />
			{content}
			<rect width={w} height={h} rx={8} fill="none" stroke={colors.text} strokeOpacity={0.2} />
		</>
	)
}
