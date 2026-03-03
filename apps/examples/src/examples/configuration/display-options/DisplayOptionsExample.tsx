import { GeoShapeUtil, Tldraw, toRichText, type GeoShapeUtilDisplayValues } from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
const CustomGeoShapeUtil = GeoShapeUtil.configure({
	getDisplayValueOverrides(editor, shape): Partial<GeoShapeUtilDisplayValues> {
		const values: Partial<GeoShapeUtilDisplayValues> = {}

		if (shape.isLocked) {
			const theme = editor.getCurrentTheme()
			values.fillColor = theme.red.solid
		}

		if (shape.props.geo === 'ellipse') {
			values.labelFontFamily = 'monospace'
			values.labelFontStyle = 'italic'
		}

		values.strokeWidth = 10
		return values
	},
})

// [2]
const shapeUtils = [CustomGeoShapeUtil]

export default function DisplayOptionsExample() {
	return (
		<div className="tldraw__editor">
			{/* [3] */}
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
Use GeoShapeUtil.configure() to provide a getDisplayValueOverrides function.
This function receives the editor, shape, and dark mode flag, and returns
a partial set of display values to override. Here we change the font for
ellipses to monospace italic.

[2]
Pass the configured shape util in an array. When passed to the Tldraw
component, it replaces the default GeoShapeUtil.

[3]
The shapeUtils prop merges your custom utils with the defaults, so only
the geo shape behavior changes.
*/
