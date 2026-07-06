import { SafeId, SvgExportContext, TLDefaultBorderStyle } from '@tldraw/editor'
import { CSSProperties, ReactElement } from 'react'
import { getRotatedBoxShadow, ROTATING_BOX_SHADOWS } from './rotated-box-shadow'

// An outset ring rather than an inset shadow/border, which the media would
// otherwise cover or get shaved by.
const LINED_BORDER = '0 0 0 1px var(--tl-color-muted-2)'

// `--tl-color-muted-2` per color mode, for exports where CSS vars don't resolve.
const LINED_BORDER_COLOR = {
	light: 'hsl(0, 0%, 0%, 4.3%)',
	dark: 'hsl(0, 0%, 100%, 5%)',
}

/** @internal */
export interface MediaBorderShape {
	rotation: number
}

/** @internal */
export function getMediaBorderStyle(
	border: TLDefaultBorderStyle,
	shape: MediaBorderShape
): CSSProperties | undefined {
	switch (border) {
		case 'lined':
			return { boxShadow: LINED_BORDER }
		case 'shadow':
			return { boxShadow: getRotatedBoxShadow(shape.rotation) }
		case 'none':
		default:
			return undefined
	}
}

function parseHexColor(hex: string) {
	const h = hex.replace('#', '')
	const r = parseInt(h.slice(0, 2), 16)
	const g = parseInt(h.slice(2, 4), 16)
	const b = parseInt(h.slice(4, 6), 16)
	const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
	return { color: `rgb(${r}, ${g}, ${b})`, opacity: a }
}

/** @internal */
export interface MediaBorderSvgOptions {
	border: TLDefaultBorderStyle
	w: number
	h: number
	isCircle: boolean
	/** Unique per shape; keys the registered shadow filter. */
	idBase: string
	ctx: SvgExportContext
}

/**
 * SVG elements for a media shape's `border` in exports, mirroring
 * {@link getMediaBorderStyle}. Returns a `behind` element (shadow) and a `front`
 * element (ring), either of which may be `null`. Rotation is applied by the
 * export's shape group, so raw offsets are used here.
 *
 * @internal
 */
export function getMediaBorderSvg(opts: MediaBorderSvgOptions): {
	behind: ReactElement | null
	front: ReactElement | null
} {
	const { border, w, h, isCircle, idBase, ctx } = opts

	if (border === 'shadow') {
		const filterId = `media-shadow-${idBase.replace(/[^a-zA-Z0-9]/g, '_')}` as SafeId
		ctx.addExportDef({
			key: filterId,
			getElement: () => (
				<filter
					id={filterId}
					x="-50%"
					y="-50%"
					width="200%"
					height="200%"
					colorInterpolationFilters="sRGB"
				>
					{ROTATING_BOX_SHADOWS.map((s, i) => {
						const { color, opacity } = parseHexColor(s.color)
						return (
							<g key={i}>
								<feGaussianBlur in="SourceAlpha" stdDeviation={s.blur / 2} result={`blur${i}`} />
								<feOffset in={`blur${i}`} dx={s.offsetX} dy={s.offsetY} result={`off${i}`} />
								<feFlood floodColor={color} floodOpacity={opacity} result={`color${i}`} />
								<feComposite in={`color${i}`} in2={`off${i}`} operator="in" result={`shadow${i}`} />
							</g>
						)
					})}
					<feMerge>
						{ROTATING_BOX_SHADOWS.map((_, i) => (
							<feMergeNode key={i} in={`shadow${i}`} />
						))}
					</feMerge>
				</filter>
			),
		})

		const behind = isCircle ? (
			<ellipse
				cx={w / 2}
				cy={h / 2}
				rx={w / 2}
				ry={h / 2}
				fill="black"
				filter={`url(#${filterId})`}
			/>
		) : (
			<rect width={w} height={h} fill="black" filter={`url(#${filterId})`} />
		)
		return { behind, front: null }
	}

	if (border === 'lined') {
		const color = LINED_BORDER_COLOR[ctx.colorMode]
		// Round to whole pixels so the 1px ring anti-aliases evenly on all sides in
		// raster exports; the <0.5px difference from the media edge is imperceptible.
		const bw = Math.round(w)
		const bh = Math.round(h)
		const front = isCircle ? (
			<path
				d={
					`M${bw / 2} -1A${bw / 2 + 1} ${bh / 2 + 1} 0 1 0 ${bw / 2} ${bh + 1}A${bw / 2 + 1} ${bh / 2 + 1} 0 1 0 ${bw / 2} -1Z` +
					`M${bw / 2} 0A${bw / 2} ${bh / 2} 0 1 1 ${bw / 2} ${bh}A${bw / 2} ${bh / 2} 0 1 1 ${bw / 2} 0Z`
				}
				fillRule="evenodd"
				fill={color}
			/>
		) : (
			<path
				d={`M-1 -1H${bw + 1}V${bh + 1}H-1Z M0 0H${bw}V${bh}H0Z`}
				fillRule="evenodd"
				fill={color}
				shapeRendering="crispEdges"
			/>
		)
		return { behind: null, front }
	}

	return { behind: null, front: null }
}
