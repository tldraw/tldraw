import { CSSProperties, useEffect, useState } from 'react'
import {
	BaseBoxShapeUtil,
	HTMLContainer,
	PreviewCard,
	RecordProps,
	SvgExportContext,
	T,
	TLComponents,
	TLShape,
	Tldraw,
	getPreviewColorVariables,
	sanitizeSvg,
	toRichText,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './shape-previews.css'

// There's a guide at the bottom of this file!

const CLOCK_TYPE = 'clock'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[CLOCK_TYPE]: { w: number; h: number; timeZone: string }
	}
}

type ClockShape = TLShape<typeof CLOCK_TYPE>

// [1]
class ClockShapeUtil extends BaseBoxShapeUtil<ClockShape> {
	static override type = CLOCK_TYPE
	static override props: RecordProps<ClockShape> = {
		w: T.number,
		h: T.number,
		timeZone: T.string,
	}

	getDefaultProps(): ClockShape['props'] {
		return { w: 240, h: 120, timeZone: 'Europe/Paris' }
	}

	component(shape: ClockShape) {
		return (
			<HTMLContainer className="shape-previews__clock">
				<LiveTime timeZone={shape.props.timeZone} />
			</HTMLContainer>
		)
	}

	getIndicatorPath(shape: ClockShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}

	// [2]
	override toPreviewSvg(shape: ClockShape, ctx: SvgExportContext) {
		return (
			<PreviewCard
				w={shape.props.w}
				h={shape.props.h}
				title={shape.props.timeZone.split('/').pop()!.replace(/_/g, ' ')}
				caption="Live clock"
				ctx={ctx}
			/>
		)
	}
}

function LiveTime({ timeZone }: { timeZone: string }) {
	const [now, setNow] = useState(() => new Date())
	useEffect(() => {
		const interval = setInterval(() => setNow(new Date()), 1000)
		return () => clearInterval(interval)
	}, [])
	return <span>{now.toLocaleTimeString([], { timeZone })}</span>
}

// [3]
function PreviewPanel() {
	const editor = useEditor()
	const [svg, setSvg] = useState('')
	const shapes = useValue('shapes', () => editor.getCurrentPageShapes(), [editor])
	const colorVariables = useValue(
		'preview colors',
		() => getPreviewColorVariables(editor.getCurrentTheme(), editor.getColorMode()),
		[editor]
	)

	useEffect(() => {
		let cancelled = false
		const timeout = setTimeout(async () => {
			const result = await editor.getSvgString(
				shapes.map((shape) => shape.id),
				{ preview: true, background: false }
			)
			if (!cancelled) setSvg(result ? sanitizeSvg(result.svg) : '')
		}, 300)
		return () => {
			cancelled = true
			clearTimeout(timeout)
		}
	}, [editor, shapes])

	return (
		<div className="shape-previews__panel" style={colorVariables as CSSProperties}>
			{/* [4] */}
			<div className="shape-previews__svg" dangerouslySetInnerHTML={{ __html: svg }} />
		</div>
	)
}

const shapeUtils = [ClockShapeUtil]
const components: TLComponents = { SharePanel: PreviewPanel }

export default function ShapePreviewsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapeUtils}
				components={components}
				onMount={(editor) => {
					if (editor.getCurrentPageShapeIds().size > 0) return
					editor.createShapes([
						{ type: CLOCK_TYPE, x: 100, y: 100 },
						{
							type: 'geo',
							x: 400,
							y: 100,
							props: {
								w: 200,
								h: 120,
								color: 'blue',
								fill: 'semi',
								richText: toRichText('Agenda'),
							},
						},
					])
				}}
			/>
		</div>
	)
}

/*
A preview export is a small SVG of some shapes that is stored and shown later, for example as a
thumbnail in a list. Unlike a normal export, it follows the theme of whoever views it: colours
become CSS variables, and fonts aren't embedded because the preview is shown inside a page that
already has them.

[1]
The clock draws live HTML: the time it shows changes every second. A shape without `toSvg` is
exported by placing that HTML in the SVG, which is fine for a one-off export, but a stored preview
would show the time it was saved at forever.

[2]
`toPreviewSvg` is how a shape draws itself in a preview. Shapes that leave it out are drawn the
way a normal export draws them, so the rectangle needs nothing. The clock returns a
`PreviewCard`, the same card tldraw's bookmarks and embeds use, saying what it is rather than
showing a time that would be wrong. A shape that draws a picture would use `PreviewImage`, which
points at the asset instead of embedding it. Read colours from `ctx.theme`, never hard-coded,
and the preview follows the viewer's theme.

[3]
This panel stands in for wherever previews are shown. It exports the page with
`getSvgString(ids, { preview: true })` and sets the colour variables the preview reads with
`getPreviewColorVariables`. Switch between light and dark mode: the rectangle and the card
follow, without exporting again.

[4]
A preview is meant to be shown inline, so its colour variables reach it. When it comes from
someone else, sanitise it first, as here with `sanitizeSvg`.
*/
