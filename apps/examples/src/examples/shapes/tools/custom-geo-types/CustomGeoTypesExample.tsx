import {
	DefaultToolbar,
	DefaultToolbarContent,
	GeoShapeUtil,
	PathBuilder,
	TLComponents,
	TLUiAssetUrlOverrides,
	TLUiOverrides,
	Tldraw,
	ToolbarItem,
	toRichText,
} from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
const CustomGeoShapeUtil = GeoShapeUtil.configure({
	customGeoTypes: {
		'rounded-rect': {
			getPath(w, h, shape) {
				// `isFilled` is used by the path builder to determine whether the
				// geometry should be treated as a filled region (so clicks inside
				// the shape hit it) or only along its outline.
				const isFilled = shape.props.fill !== 'none'
				const r = Math.min(w, h) * 0.2
				return new PathBuilder()
					.moveTo(r, 0, { geometry: { isFilled } })
					.lineTo(w - r, 0)
					.circularArcTo(r, false, true, w, r)
					.lineTo(w, h - r)
					.circularArcTo(r, false, true, w - r, h)
					.lineTo(r, h)
					.circularArcTo(r, false, true, 0, h - r)
					.lineTo(0, r)
					.circularArcTo(r, false, true, r, 0)
					.close()
			},
			snapType: 'polygon',
			icon: 'geo-rounded-rect',
		},
		cross: {
			getPath(w, h, shape) {
				const isFilled = shape.props.fill !== 'none'
				const armW = w / 3
				const armH = h / 3
				return new PathBuilder()
					.moveTo(armW, 0, { geometry: { isFilled } })
					.lineTo(w - armW, 0)
					.lineTo(w - armW, armH)
					.lineTo(w, armH)
					.lineTo(w, h - armH)
					.lineTo(w - armW, h - armH)
					.lineTo(w - armW, h)
					.lineTo(armW, h)
					.lineTo(armW, h - armH)
					.lineTo(0, h - armH)
					.lineTo(0, armH)
					.lineTo(armW, armH)
					.close()
			},
			snapType: 'polygon',
			icon: 'geo-cross',
			defaultSize: { w: 200, h: 200 },
		},
	},
})

// [2]
const shapeUtils = [CustomGeoShapeUtil]

// [3]
const customAssetUrls: TLUiAssetUrlOverrides = {
	icons: {
		'geo-rounded-rect': '/geo-rounded-rect.svg',
		'geo-cross': '/geo-cross.svg',
	},
}

// [4]
const uiOverrides: TLUiOverrides = {
	translations: {
		en: {
			'tool.rounded-rect': 'Rounded rectangle',
			'tool.cross': 'Cross',
		},
	},
}

// [5]
const components: TLComponents = {
	Toolbar: (props) => {
		return (
			<DefaultToolbar {...props}>
				<ToolbarItem tool="rounded-rect" />
				<ToolbarItem tool="cross" />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
}

export default function CustomGeoTypesExample() {
	return (
		<div className="tldraw__editor">
			{/* [6] */}
			<Tldraw
				shapeUtils={shapeUtils}
				components={components}
				overrides={uiOverrides}
				assetUrls={customAssetUrls}
				onMount={(editor) => {
					editor.createShapes([
						{
							type: 'geo',
							x: 100,
							y: 100,
							props: {
								w: 250,
								h: 150,
								geo: 'rounded-rect' as any,
								fill: 'solid',
								color: 'blue',
								richText: toRichText('Rounded rect'),
							},
						},
						{
							type: 'geo',
							x: 450,
							y: 100,
							props: {
								w: 200,
								h: 200,
								geo: 'cross' as any,
								fill: 'semi',
								color: 'red',
								richText: toRichText('Cross'),
							},
						},
						{
							type: 'geo',
							x: 100,
							y: 350,
							props: {
								w: 200,
								h: 200,
								geo: 'rectangle',
								fill: 'none',
								richText: toRichText('Built-in'),
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
Use GeoShapeUtil.configure() with a customGeoTypes map. Each entry
defines a new geo type with:
- getPath: returns a PathBuilder describing the shape outline
- snapType: 'polygon' (snap to vertices + center) or 'blobby' (center only)
- icon: icon name for the style panel picker
- defaultSize: optional creation size when clicking (not dragging)

[2]
Pass the configured shape util in an array. It replaces the default
GeoShapeUtil but keeps all built-in geo types alongside your custom ones.

[3]
Provide custom icon SVGs for your geo types via assetUrls. The icon key
must be 'geo-' followed by the geo type name (e.g., 'geo-rounded-rect').

[4]
Provide translations for the tool labels so that the tooltips in the
toolbar show the right name. The translation keys are 'tool.' followed
by the geo type name (e.g., 'tool.rounded-rect').

[5]
Override the Toolbar component to add ToolbarItems for your custom geo
types. The tool ID matches the key in your customGeoTypes map. Custom
geo types are automatically registered as tools, so you just need to
reference them by name.

[6]
Custom geo types appear in the geo style panel picker. They support all
standard geo features: labels, fill/dash/color styles, resizing, SVG
export, and snap points.
*/
