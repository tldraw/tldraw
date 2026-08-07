import { SafeId, SvgExportContext, TLDefaultBorderStyle, Vec } from '@tldraw/editor'
import { CSSProperties, Fragment, ReactElement } from 'react'
import { getRotatedBoxShadow, ROTATING_BOX_SHADOWS } from './rotated-box-shadow'

// An outset ring rather than an inset shadow/border, which the media would
// otherwise cover or get shaved by.
const LINED_BORDER = '0 0 0 1px var(--tl-color-muted-1)'

// `--tl-color-muted-1` per color mode, for exports where CSS vars don't resolve.
const LINED_BORDER_COLOR = {
	light: 'hsl(0, 0%, 0%, 10%)',
	dark: 'hsl(0, 0%, 100%, 10%)',
}

// Offset diagonally rather than straight down like the soft shadow: with no blur
// to soften it, a purely vertical offset reads as a bar under the media.
const HARD_BOX_SHADOW = {
	offsetX: 6,
	offsetY: 6,
	color: '#00000040',
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
		case 'shadow-hard': {
			const { x, y } = getHardShadowOffset(shape.rotation)
			return { boxShadow: `${x}px ${y}px 0px 0px ${HARD_BOX_SHADOW.color}` }
		}
		case 'none':
		default:
			return undefined
	}
}

/**
 * The hard shadow's offset, counter-rotated so it falls the same way in page
 * space at any rotation, matching {@link getRotatedBoxShadow}.
 */
function getHardShadowOffset(rotation: number) {
	return new Vec(HARD_BOX_SHADOW.offsetX, HARD_BOX_SHADOW.offsetY).rot(-rotation)
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
	/** The shape's page rotation, in radians. */
	rotation: number
	/** Unique per shape; keys the registered shadow filter and mask. */
	idBase: string
	ctx: SvgExportContext
}

function safeIdFrom(prefix: string, idBase: string) {
	return `${prefix}-${idBase.replace(/[^a-zA-Z0-9]/g, '_')}` as SafeId
}

/**
 * Masks the media's own footprint out of its shadow. CSS `box-shadow` only
 * paints outside the element's border box, so without this the export would
 * show shadow beneath the media wherever it isn't fully opaque — through a
 * transparent PNG, say — which never happens on canvas.
 */
function maskShadow(shadow: ReactElement, opts: MediaBorderSvgOptions) {
	const { w, h, isCircle, idBase, ctx } = opts
	const maskId = safeIdFrom('media-shadow-mask', idBase)
	// The soft shadow is confined to its filter region, half the media's size on
	// each side; the hard shadow reaches at most its own diagonal offset.
	const reach = Math.max(w, h) / 2 + Math.hypot(HARD_BOX_SHADOW.offsetX, HARD_BOX_SHADOW.offsetY)
	const bounds = { x: -reach, y: -reach, width: w + reach * 2, height: h + reach * 2 }
	ctx.addExportDef({
		key: maskId,
		getElement: () => (
			<mask id={maskId} maskUnits="userSpaceOnUse" {...bounds}>
				<rect {...bounds} fill="white" />
				{isCircle ? (
					<ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="black" />
				) : (
					<rect width={w} height={h} fill="black" />
				)}
			</mask>
		),
	})
	return <g mask={`url(#${maskId})`}>{shadow}</g>
}

/**
 * SVG elements for a media shape's `border` in exports, mirroring
 * {@link getMediaBorderStyle}. Returns a `behind` element (shadow) and a `front`
 * element (ring), either of which may be `null`.
 *
 * @internal
 */
export function getMediaBorderSvg(opts: MediaBorderSvgOptions): {
	behind: ReactElement | null
	front: ReactElement | null
} {
	const { border, w, h, isCircle, rotation, idBase, ctx } = opts

	if (border === 'shadow') {
		const filterId = safeIdFrom('media-shadow', idBase)
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
						// The export's shape group rotates this filter along with the shape, so
						// counter-rotate the offsets to keep the light source overhead in page
						// space, the same way getRotatedBoxShadow does on canvas.
						const offset = new Vec(s.offsetX, s.offsetY).rot(-rotation)
						// Fragment, not `g`: `filter` only accepts filter primitives as
						// direct children, so a `g` wrapper would drop the shadow.
						return (
							<Fragment key={i}>
								<feGaussianBlur in="SourceAlpha" stdDeviation={s.blur / 2} result={`blur${i}`} />
								<feOffset in={`blur${i}`} dx={offset.x} dy={offset.y} result={`off${i}`} />
								<feFlood floodColor={color} floodOpacity={opacity} result={`color${i}`} />
								<feComposite in={`color${i}`} in2={`off${i}`} operator="in" result={`shadow${i}`} />
							</Fragment>
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

		const shadow = isCircle ? (
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
		return { behind: maskShadow(shadow, opts), front: null }
	}

	if (border === 'shadow-hard') {
		// No blur means no filter is needed: the shadow is the shape's own silhouette,
		// offset and flat-filled.
		const { color, opacity } = parseHexColor(HARD_BOX_SHADOW.color)
		const { x, y } = getHardShadowOffset(rotation)
		const shadow = isCircle ? (
			<ellipse
				cx={w / 2 + x}
				cy={h / 2 + y}
				rx={w / 2}
				ry={h / 2}
				fill={color}
				fillOpacity={opacity}
			/>
		) : (
			<rect x={x} y={y} width={w} height={h} fill={color} fillOpacity={opacity} />
		)
		return { behind: maskShadow(shadow, opts), front: null }
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
