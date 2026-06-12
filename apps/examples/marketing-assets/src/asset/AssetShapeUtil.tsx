import { CSSProperties, useState } from 'react'
import {
	HTMLContainer,
	Rectangle2d,
	ShapeUtil,
	SvgExportContext,
	useEditor,
	useValue,
} from 'tldraw'
import { TextLayer } from '../api/marketingApi'
import { Brand, getBrand, useBrand } from '../brand/brandState'
import { CAPTION_HEIGHT, FOOTER_HEIGHT, getOutputType } from '../constants'
import { downloadAsset } from '../export'
import {
	getAssetSrc,
	getRenderProgress,
	hasAnnotations,
	reRender,
	revertTo,
	setVerdict,
} from './assetActions'
import { marketingAssetProps, MARKETING_ASSET_TYPE, MarketingAssetShape } from './assetShape'
import { layoutTextLayer } from './textLayerLayout'

export class MarketingAssetShapeUtil extends ShapeUtil<MarketingAssetShape> {
	static override type = MARKETING_ASSET_TYPE
	static override props = marketingAssetProps

	getDefaultProps(): MarketingAssetShape['props'] {
		return {
			w: 360,
			h: 360,
			outputTypeId: 'ig-square',
			prompt: '',
			versions: [],
			currentVersion: 0,
			status: 'idle',
			error: '',
			generatingStartedAt: 0,
			verdict: 'none',
		}
	}

	override canEdit() {
		return false
	}
	override canResize() {
		return false
	}
	// Don't let arrows bind to the asset. Binding would snap an arrowhead to the
	// shape's centre/edge; leaving it unbound keeps the arrow pointing at the exact
	// spot on the image the user aimed at, so annotations can target specifics.
	override canBind() {
		return false
	}
	override hideResizeHandles() {
		return true
	}
	override hideRotateHandle() {
		return true
	}
	override isAspectRatioLocked() {
		return false
	}

	getGeometry(shape: MarketingAssetShape) {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h + FOOTER_HEIGHT + CAPTION_HEIGHT,
			isFilled: true,
		})
	}

	component(shape: MarketingAssetShape) {
		return <MarketingAssetComponent shape={shape} />
	}

	getIndicatorPath(shape: MarketingAssetShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h + FOOTER_HEIGHT + CAPTION_HEIGHT)
		return path
	}

	// Export the background plus the rendered text (no footer controls) so it
	// appears in the annotated composite and in normal exports.
	override toSvg(shape: MarketingAssetShape, _ctx: SvgExportContext) {
		const { w, h } = shape.props
		const version = shape.props.versions[shape.props.currentVersion]
		const src = version ? getAssetSrc(this.editor, version) : undefined
		const layers = version?.textLayers ?? []
		const brand = getBrand(this.editor)
		return (
			<>
				{src ? (
					<image href={src} width={w} height={h} preserveAspectRatio="xMidYMid slice" />
				) : (
					<rect width={w} height={h} fill="#f1f5f9" />
				)}
				{layers.map((layer, i) => (
					<SvgTextLayer key={i} layer={layer} w={w} h={h} brand={brand} />
				))}
			</>
		)
	}
}

function MarketingAssetComponent({ shape }: { shape: MarketingAssetShape }) {
	const editor = useEditor()
	const brand = useBrand(editor)
	const { w, h, status, error, versions, currentVersion, verdict } = shape.props
	const current = versions[currentVersion]

	const src = useValue('src', () => (current ? getAssetSrc(editor, current) : undefined), [
		editor,
		current?.assetId,
	])

	const annotated = useValue('annotated', () => hasAnnotations(editor, shape.id), [
		editor,
		shape.id,
	])
	const progress = useValue('progress', () => getRenderProgress(shape.id), [editor, shape.id])

	const isGenerating = status === 'generating'
	const layers = current?.textLayers ?? []
	const [downloading, setDownloading] = useState(false)

	async function download() {
		setDownloading(true)
		try {
			await downloadAsset(editor, shape)
		} finally {
			setDownloading(false)
		}
	}

	return (
		<HTMLContainer className={`MarketingAsset MarketingAsset_${verdict}`}>
			<div className="MarketingAsset-image" style={{ height: h }}>
				{src ? (
					<img src={src} alt="marketing asset background" draggable={false} />
				) : (
					<div className="MarketingAsset-placeholder">
						{isGenerating ? 'Generating…' : status === 'error' ? 'Failed' : 'Empty'}
					</div>
				)}
				{layers.map((layer, i) => (
					<HtmlTextLayer key={i} layer={layer} w={w} h={h} brand={brand} />
				))}
				{isGenerating && (
					<div className="MarketingAsset-overlay">
						<span className="MarketingAsset-spinner" />
						{progress && progress.total > 1 && (
							<span className="MarketingAsset-progress">
								Editing background {progress.step}/{progress.total}
							</span>
						)}
					</div>
				)}
			</div>

			<div
				className="MarketingAsset-footer"
				style={{ height: FOOTER_HEIGHT }}
				onPointerDown={(e) => e.stopPropagation()}
			>
				{status === 'error' ? (
					<div className="MarketingAsset-errorText" title={error}>
						{error || 'Something went wrong'}
					</div>
				) : (
					<>
						<div className="MarketingAsset-versions">
							{versions.map((v, i) => (
								<VersionThumb
									key={i}
									editor={editor}
									version={v}
									index={i}
									selected={i === currentVersion}
									onClick={() => revertTo(editor, shape.id, i)}
								/>
							))}
						</div>
						{versions.length > 0 && (
							<div className="MarketingAsset-verdict">
								<VerdictButton
									symbol="👍"
									label="Like this idea"
									active={verdict === 'liked'}
									onClick={() =>
										setVerdict(editor, shape.id, verdict === 'liked' ? 'none' : 'liked')
									}
								/>
								<VerdictButton
									symbol="👎"
									label="Dislike this idea"
									active={verdict === 'disliked'}
									onClick={() =>
										setVerdict(editor, shape.id, verdict === 'disliked' ? 'none' : 'disliked')
									}
								/>
							</div>
						)}
						<button
							className="MarketingAsset-download"
							disabled={isGenerating || versions.length === 0 || downloading}
							title="Download this asset as a PNG"
							aria-label="Download PNG"
							onClick={download}
						>
							{downloading ? '…' : '⤓'}
						</button>
						<button
							className="MarketingAsset-rerender"
							disabled={isGenerating || versions.length === 0 || !annotated}
							title={
								!annotated
									? 'Draw arrows and text on the asset, then re-render'
									: 'Re-render from annotations'
							}
							onClick={() => reRender(editor, shape.id)}
						>
							{isGenerating ? 'Working…' : 'Re-render'}
						</button>
					</>
				)}
			</div>

			<CaptionPanel
				caption={current?.caption ?? ''}
				platform={getOutputType(shape.props.outputTypeId).platform}
				isGenerating={isGenerating}
			/>
		</HTMLContainer>
	)
}

/**
 * The accompanying body copy shown under the asset — the social caption, voiced
 * for the brand tone and tailored to the platform. Rendered beside the image, not
 * baked into it, and copyable for pasting into the platform's composer.
 */
function CaptionPanel({
	caption,
	platform,
	isGenerating,
}: {
	caption: string
	platform?: string
	isGenerating: boolean
}) {
	const [copied, setCopied] = useState(false)

	async function copy() {
		await navigator.clipboard.writeText(caption)
		setCopied(true)
		setTimeout(() => setCopied(false), 1500)
	}

	return (
		<div
			className="MarketingAsset-caption"
			style={{ height: CAPTION_HEIGHT }}
			onPointerDown={(e) => e.stopPropagation()}
		>
			<div className="MarketingAsset-captionHead">
				<span className="MarketingAsset-captionLabel">
					{platform ? `${platform} copy` : 'Accompanying copy'}
				</span>
				{caption && (
					<button
						className="MarketingAsset-captionCopy"
						onClick={copy}
						aria-label="Copy caption to clipboard"
					>
						{copied ? 'Copied' : 'Copy'}
					</button>
				)}
			</div>
			{caption ? (
				<p className="MarketingAsset-captionText">{caption}</p>
			) : (
				<p className="MarketingAsset-captionEmpty">
					{isGenerating ? 'Writing copy…' : 'Copy will appear here'}
				</p>
			)}
		</div>
	)
}

// The HTML and SVG text layers are two adapters over one layout (./textLayerLayout):
// they draw the same resolved pixels, so the live view and the export cannot drift.

function HtmlTextLayer({
	layer,
	w,
	h,
	brand,
}: {
	layer: TextLayer
	w: number
	h: number
	brand: Brand
}) {
	const t = layoutTextLayer(layer, { w, h }, brand)
	const style: CSSProperties = {
		position: 'absolute',
		left: t.x,
		top: t.y,
		width: t.width,
		fontFamily: t.fontFamily,
		fontSize: t.fontSize,
		fontWeight: t.fontWeight,
		color: t.color,
		textAlign: t.align,
		lineHeight: t.lineHeight / t.fontSize,
		whiteSpace: 'pre-wrap',
		...(t.scrim ? { background: t.scrim.color, padding: '0.15em 0.3em', borderRadius: 4 } : {}),
	}
	return (
		<div className="MarketingAsset-text" style={style}>
			{layer.text}
		</div>
	)
}

function SvgTextLayer({
	layer,
	w,
	h,
	brand,
}: {
	layer: TextLayer
	w: number
	h: number
	brand: Brand
}) {
	const t = layoutTextLayer(layer, { w, h }, brand)
	return (
		<>
			{t.scrim && (
				<rect x={t.x} y={t.y} width={t.width} height={t.scrim.height} fill={t.scrim.color} rx={4} />
			)}
			{t.lines.map((line, i) => (
				<text
					key={i}
					x={t.anchorX}
					y={t.y + t.fontSize + i * t.lineHeight}
					fontFamily={t.fontFamily}
					fontSize={t.fontSize}
					fontWeight={t.fontWeight}
					fill={t.color}
					textAnchor={t.anchor}
				>
					{line}
				</text>
			))}
		</>
	)
}

function VersionThumb({
	editor,
	version,
	index,
	selected,
	onClick,
}: {
	editor: ReturnType<typeof useEditor>
	version: MarketingAssetShape['props']['versions'][number]
	index: number
	selected: boolean
	onClick(): void
}) {
	const src = useValue('thumb', () => getAssetSrc(editor, version), [editor, version.assetId])
	return (
		<button
			className={`MarketingAsset-version${selected ? ' MarketingAsset-version_selected' : ''}`}
			title={version.instruction || 'First generation'}
			onClick={onClick}
		>
			{src ? <img src={src} alt={`version ${index + 1}`} draggable={false} /> : null}
			<span className="MarketingAsset-version-num">{index + 1}</span>
		</button>
	)
}

function VerdictButton({
	symbol,
	label,
	active,
	onClick,
}: {
	symbol: string
	label: string
	active: boolean
	onClick(): void
}) {
	return (
		<button
			className={`MarketingAsset-verdictButton${active ? ' MarketingAsset-verdictButton_active' : ''}`}
			title={label}
			aria-label={label}
			aria-pressed={active}
			onClick={onClick}
		>
			{symbol}
		</button>
	)
}
