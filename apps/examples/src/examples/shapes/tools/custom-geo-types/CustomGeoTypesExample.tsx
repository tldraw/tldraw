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
				// [a]
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
								// [6]
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
`GeoShapeUtil.configure()` takes a `customGeoTypes` map. Each entry becomes a new value for the
geo style and gets the same treatment as the built-in types: labels, fill/dash/color styles,
resizing, SVG export, snapping, and a slot in the style panel's geo picker.
- getPath: returns a PathBuilder describing the outline, given the current width and height
- snapType: 'polygon' (other handles snap to vertices + center) or 'blobby' (center only)
- icon: icon name for the style panel's geo picker (the toolbar uses 'geo-' + the type name)
- defaultSize: optional creation size when clicking (not dragging); defaults to 200x200

	[a] `isFilled` on the first path segment tells the geometry whether the interior counts as
	part of the shape for hit-testing. Without it, a solid-filled shape could only be clicked
	on its outline.

[2]
Pass the configured util in place of the default. It's still `type: 'geo'`, so existing geo
shapes keep working, and it must be defined outside the component so the array is stable.

[3]
Icons need URLs. Register them under `assetUrls.icons`; the key must be 'geo-' followed by
the geo type name so the toolbar finds it, and using the same name for `icon` in [1] keeps
the style panel picker in sync.

[4]
Each custom geo type is registered as a tool automatically. Give it a label by translating
'tool.' followed by the geo type name.

[5]
Add the new tools to the toolbar with `ToolbarItem`, referencing them by geo type name.

[6]
The `geo` prop is typed as the built-in enum, so setting a custom value programmatically needs
a cast. Shapes created through the toolbar or the style panel don't have this problem.
*/
