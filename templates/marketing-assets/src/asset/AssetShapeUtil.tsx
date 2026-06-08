import { CSSProperties } from 'react'
import { HTMLContainer, Rectangle2d, ShapeUtil, SvgExportContext, useEditor, useValue } from 'tldraw'
import { TextLayer } from '../api/marketingApi'
import { Brand, getBrand, useBrand } from '../brand/brandState'
import { FOOTER_HEIGHT } from '../constants'
import { getAssetSrc, getRenderProgress, hasAnnotations, reRender, revertTo } from './assetActions'
import { marketingAssetProps, MARKETING_ASSET_TYPE, MarketingAssetShape } from './assetShape'

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
			height: shape.props.h + FOOTER_HEIGHT,
			isFilled: true,
		})
	}

	component(shape: MarketingAssetShape) {
		return <MarketingAssetComponent shape={shape} />
	}

	getIndicatorPath(shape: MarketingAssetShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h + FOOTER_HEIGHT)
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
	const { w, h, status, error, versions, currentVersion } = shape.props
	const current = versions[currentVersion]

	const src = useValue('src', () => (current ? getAssetSrc(editor, current) : undefined), [
		editor,
		current?.assetId,
	])

	const annotated = useValue('annotated', () => hasAnnotations(editor, shape.id), [editor, shape.id])
	const progress = useValue('progress', () => getRenderProgress(shape.id), [editor, shape.id])

	const isGenerating = status === 'generating'
	const layers = current?.textLayers ?? []

	return (
		<HTMLContainer className="MarketingAsset">
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
		</HTMLContainer>
	)
}

function HtmlTextLayer({ layer, w, h, brand }: { layer: TextLayer; w: number; h: number; brand: Brand }) {
	const font = layer.fontRole === 'heading' ? brand.headingFont : brand.bodyFont
	const style: CSSProperties = {
		position: 'absolute',
		left: layer.x * w,
		top: layer.y * h,
		width: layer.width * w,
		fontFamily: `'${font}', sans-serif`,
		fontSize: layer.fontSize * h,
		fontWeight: layer.weight === 'bold' ? 700 : 400,
		color: layer.color,
		textAlign: layer.align,
		lineHeight: 1.15,
		whiteSpace: 'pre-wrap',
		...(layer.scrim
			? { background: scrimColor(layer.color), padding: '0.15em 0.3em', borderRadius: 4 }
			: {}),
	}
	return (
		<div className="MarketingAsset-text" style={style}>
			{layer.text}
		</div>
	)
}

function SvgTextLayer({ layer, w, h, brand }: { layer: TextLayer; w: number; h: number; brand: Brand }) {
	const font = layer.fontRole === 'heading' ? brand.headingFont : brand.bodyFont
	const fontSize = layer.fontSize * h
	const boxW = layer.width * w
	const x0 = layer.x * w
	const y0 = layer.y * h
	const lineHeight = fontSize * 1.15
	const lines = wrapText(layer.text, boxW, fontSize)
	const anchor = layer.align === 'left' ? 'start' : layer.align === 'right' ? 'end' : 'middle'
	const tx = layer.align === 'left' ? x0 : layer.align === 'right' ? x0 + boxW : x0 + boxW / 2

	return (
		<>
			{layer.scrim && (
				<rect
					x={x0}
					y={y0}
					width={boxW}
					height={lines.length * lineHeight + fontSize * 0.3}
					fill={scrimColor(layer.color)}
					rx={4}
				/>
			)}
			{lines.map((line, i) => (
				<text
					key={i}
					x={tx}
					y={y0 + fontSize + i * lineHeight}
					fontFamily={`'${font}', sans-serif`}
					fontSize={fontSize}
					fontWeight={layer.weight === 'bold' ? 700 : 400}
					fill={layer.color}
					textAnchor={anchor}
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
	onClick: () => void
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

// ---------------------------------------------------------------------------
// Text helpers (shared by the live HTML and the SVG export)
// ---------------------------------------------------------------------------

/** A contrast panel colour chosen from the text's brightness. */
function scrimColor(hex: string): string {
	return luminance(hex) > 0.6 ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.65)'
}

function luminance(hex: string): number {
	const c = hex.replace('#', '')
	if (c.length < 6) return 1
	const r = parseInt(c.slice(0, 2), 16) / 255
	const g = parseInt(c.slice(2, 4), 16) / 255
	const b = parseInt(c.slice(4, 6), 16) / 255
	return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Greedy word-wrap for the SVG export (the live HTML wraps natively). */
function wrapText(text: string, boxWidth: number, fontSize: number): string[] {
	const maxChars = Math.max(1, Math.floor(boxWidth / (fontSize * 0.5)))
	const out: string[] = []
	for (const para of text.split('\n')) {
		const words = para.split(/\s+/).filter(Boolean)
		if (!words.length) {
			out.push('')
			continue
		}
		let line = ''
		for (const word of words) {
			const candidate = line ? `${line} ${word}` : word
			if (candidate.length > maxChars && line) {
				out.push(line)
				line = word
			} else {
				line = candidate
			}
		}
		if (line) out.push(line)
	}
	return out
}
