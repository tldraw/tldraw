import {
	ArrowShapeUtil,
	ArrowShapeUtilDisplayValues,
	Box,
	Group2d,
	SVGContainer,
	SvgExportContext,
	TLArrowShape,
	TLShapeUtilCanBindOpts,
	getDisplayValues,
	toDomPrecision,
	track,
	useEditor,
	useSharedSafeId,
	useValue,
} from 'tldraw'
import {
	ZIP_TIE,
	ZipArrowRoute,
	getArrowStrokeWidth,
	getZipArrowPath,
	getZipArrowRoute,
	getZipArrowheadPath,
} from './zip-tie-shared'

// [1]
export class ZipArrowShapeUtil extends ArrowShapeUtil {
	// [2]
	override canBind(opts: TLShapeUtilCanBindOpts<TLArrowShape>) {
		if (opts.bindingType === ZIP_TIE) return opts.toShape.type === ZIP_TIE
		return opts.toShape.type !== ZIP_TIE && super.canBind(opts)
	}

	// Labels follow tldraw's own arrow path, so we don't offer them on tied arrows.
	override canEdit(shape: TLArrowShape) {
		return !getZipArrowRoute(this.editor, shape)
	}

	override getGeometry(shape: TLArrowShape) {
		const route = getZipArrowRoute(this.editor, shape)
		if (!route) return super.getGeometry(shape)
		return new Group2d({ children: [getZipArrowPath(route).toGeometry()] })
	}

	// The bend handle doesn't mean anything once the arrow's shape comes from its ties.
	override getHandles(shape: TLArrowShape) {
		const handles = super.getHandles(shape)
		if (!getZipArrowRoute(this.editor, shape)) return handles
		return handles.filter((handle) => handle.id !== 'middle')
	}

	override getIndicatorPath(shape: TLArrowShape) {
		const route = getZipArrowRoute(this.editor, shape)
		if (!route) return super.getIndicatorPath(shape)

		const strokeWidth = getArrowStrokeWidth(this.editor, shape)
		const path = getZipArrowPath(route).toPath2D({ style: 'solid', strokeWidth: 1 })
		for (const side of ['start', 'end'] as const) {
			const type = side === 'start' ? shape.props.arrowheadStart : shape.props.arrowheadEnd
			const arrowhead = getZipArrowheadPath(route, side, type, strokeWidth)
			if (arrowhead) path.addPath(new Path2D(arrowhead))
		}
		return path
	}

	// [3]
	override component(shape: TLArrowShape) {
		return <ArrowComponent util={this} shape={shape} />
	}

	renderUntiedComponent(shape: TLArrowShape) {
		return super.component(shape)
	}

	override toSvg(shape: TLArrowShape, ctx: SvgExportContext) {
		const route = getZipArrowRoute(this.editor, shape)
		if (!route) return super.toSvg(shape, ctx)

		return (
			<g transform={`scale(${1 / shape.props.scale})`}>
				<ZipArrowSvg
					shape={shape}
					route={route}
					dv={getDisplayValues(this, shape, ctx.colorMode)}
				/>
			</g>
		)
	}
}

const ArrowComponent = track(function ArrowComponent({
	util,
	shape,
}: {
	util: ZipArrowShapeUtil
	shape: TLArrowShape
}) {
	const route = getZipArrowRoute(util.editor, shape)
	if (!route) return <UntiedArrow util={util} shape={shape} />

	return (
		<SVGContainer style={{ minWidth: 50, minHeight: 50 }}>
			<ZipArrowSvg shape={shape} route={route} dv={getDisplayValues(util, shape)} />
		</SVGContainer>
	)
})

const UntiedArrow = track(function UntiedArrow({
	util,
	shape,
}: {
	util: ZipArrowShapeUtil
	shape: TLArrowShape
}) {
	return util.renderUntiedComponent(shape)
})

// [4]
function ZipArrowSvg({
	shape,
	route,
	dv,
}: {
	shape: TLArrowShape
	route: ZipArrowRoute
	dv: ArrowShapeUtilDisplayValues
}) {
	const editor = useEditor()
	const clipPathId = useSharedSafeId(shape.id + '_zip_clip')
	const isForceSolid = useValue(
		'force solid',
		() => editor.getEfficientZoomLevel() < 0.25 / shape.props.scale,
		[editor, shape.props.scale]
	)

	const strokeWidth = dv.strokeWidth * shape.props.scale
	const strokeColor = dv.strokeColor
	const fillColor = shape.props.fill === 'pattern' ? dv.patternFillFallbackColor : dv.fillColor
	const { arrowheadStart, arrowheadEnd } = shape.props
	const as = getZipArrowheadPath(route, 'start', arrowheadStart, strokeWidth)
	const ae = getZipArrowheadPath(route, 'end', arrowheadEnd, strokeWidth)
	const isOpen = (type: string) => type === 'none' || type === 'arrow' || type === 'bar'
	const clipStart = !!as && !isOpen(arrowheadStart)
	const clipEnd = !!ae && !isOpen(arrowheadEnd)

	const path = getZipArrowPath(route)
	const bounds = Box.ZeroFix(path.toGeometry().bounds).expandBy(100)
	const clipD = `M ${toDomPrecision(bounds.minX)} ${toDomPrecision(bounds.minY)} h ${toDomPrecision(bounds.w)} v ${toDomPrecision(bounds.h)} h ${toDomPrecision(-bounds.w)} Z ${clipStart ? as : ''} ${clipEnd ? ae : ''}`

	return (
		<>
			{(clipStart || clipEnd) && (
				<defs>
					<clipPath id={clipPathId}>
						<path d={clipD} clipRule="evenodd" />
					</clipPath>
				</defs>
			)}
			<g
				fill="none"
				stroke={strokeColor}
				strokeWidth={strokeWidth}
				strokeLinejoin="round"
				strokeLinecap="round"
				pointerEvents="none"
			>
				<g style={clipStart || clipEnd ? { clipPath: `url(#${clipPathId})` } : undefined}>
					{path.toSvg({
						style: shape.props.dash,
						strokeWidth,
						forceSolid: isForceSolid,
						randomSeed: shape.id,
					})}
				</g>
				{shape.props.fill !== 'none' && clipStart && <path fill={fillColor} d={as} />}
				{shape.props.fill !== 'none' && clipEnd && <path fill={fillColor} d={ae} />}
				{as && <path d={as} />}
				{ae && <path d={ae} />}
			</g>
		</>
	)
}

/*
[1]
Rather than a brand new shape, a zip-tieable arrow is tldraw's own arrow with a few overrides.
Registering it with type `arrow` replaces the default arrow util, so the arrow tool, start and
end bindings, handles, styles, and arrowheads all keep working. Until an arrow is zip tied, every
override hands straight back to `ArrowShapeUtil`.

[2]
Arrows can bind to zip ties with a `zip-tie` binding, but their start and end terminals shouldn't
snap onto a tie the way they snap onto a box.

[3]
Whether an arrow is tied can change at any time, and the default arrow component uses React hooks.
Rendering tied and untied arrows as two different components (rather than branching inside one)
means React remounts when an arrow is tied or untied, instead of seeing its hooks change.

[4]
This mirrors the default arrow's SVG: filled arrowheads clip the body out of their interior, and
the body is drawn with `PathBuilder` so every dash style (draw, solid, dashed, dotted) works along
the whole route. The dashes run continuously through the ties because every segment is merged with
the previous one.
*/
