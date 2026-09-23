import { GeoShapeUtil, Tldraw, toRichText, type GeoShapeUtilDisplayValues } from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
const shapeUtils = [
	GeoShapeUtil.configure({
		getCustomDisplayValues(editor, shape): Partial<GeoShapeUtilDisplayValues> {
			const values: Partial<GeoShapeUtilDisplayValues> = {}

			// [2]
			if (shape.isLocked) {
				const colors = editor.getCurrentTheme().colors[editor.getColorMode()]
				values.fillColor = colors.red.solid
			}

			if (shape.props.geo === 'ellipse') {
				values.labelFontFamily = 'monospace'
			}

			values.strokeWidth = 10
			return values
		},
	}),
]

export default function DisplayOptionsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapeUtils}
				onMount={(editor) => {
					editor.createShapes([
						{
							type: 'geo',
							x: 100,
							y: 100,
							props: {
								w: 200,
								h: 100,
								geo: 'rectangle',
								fill: 'solid',
								richText: toRichText('Rectangle'),
							},
						},
						{
							type: 'geo',
							x: 400,
							y: 100,
							props: {
								w: 200,
								h: 200,
								geo: 'ellipse',
								richText: toRichText('Ellipse'),
							},
						},
					])
					editor.zoomToFit({ animation: { duration: 0 } })
					editor.zoomOut()
				}}
			/>
		</div>
	)
}

/*
[1]
`getCustomDisplayValues` runs every time a geo shape renders, after the default display values
have been computed from the shape's style props. Whatever it returns is merged on top, so you
only need to return the values you want to change. Passing the configured util in `shapeUtils`
replaces the default GeoShapeUtil.

[2]
Display values can depend on anything about the shape, not just its props. Locked shapes get a
red fill; ellipses get a monospace label; every geo shape gets a 10px stroke regardless
of its size style.
*/
