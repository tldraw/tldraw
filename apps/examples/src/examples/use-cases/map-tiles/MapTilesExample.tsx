import { useMemo, useState } from 'react'
import { TLCameraOptions, TLComponents, Tldraw, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import { WORLD_SIZE, ZOOM_STEPS, getMapZoom, lngLatToPage, pageToLngLat } from './mercator'
import './map-tiles.css'
import { TileLayer } from './TileLayer'

// There's a guide at the bottom of this file!

const LONDON = { lng: -0.1276, lat: 51.5072 }

// [1]
const cameraOptions: TLCameraOptions = {
	isLocked: false,
	wheelBehavior: 'pan',
	panSpeed: 1,
	zoomSpeed: 1,
	zoomSteps: ZOOM_STEPS,
	constraints: {
		bounds: { x: 0, y: 0, w: WORLD_SIZE, h: WORLD_SIZE },
		behavior: 'inside',
		padding: { x: 0, y: 0 },
		origin: { x: 0.5, y: 0.5 },
		initialZoom: 'default',
		baseZoom: 'default',
	},
}

function TopPanel() {
	const editor = useEditor()
	// [2]
	const readout = useValue(
		'readout',
		() => {
			const { x, y } = editor.inputs.getCurrentPagePoint()
			const { lng, lat } = pageToLngLat(x, y)
			const dpr = editor.getInstanceState().devicePixelRatio
			return `${lat.toFixed(4)}, ${lng.toFixed(4)} · z${getMapZoom(editor.getZoomLevel(), dpr)}`
		},
		[editor]
	)
	return (
		// [3]
		<div className="tlui-menu map-top-panel">
			<span className="map-readout">{readout}</span>
			{/* [4] */}
			<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
				© OpenStreetMap contributors
			</a>
		</div>
	)
}

export default function MapTilesExample() {
	// [5]
	const [isCameraReady, setIsCameraReady] = useState(false)

	const components = useMemo<TLComponents>(
		() => ({
			OnTheCanvas: isCameraReady ? TileLayer : null,
			TopPanel,
			Grid: null,
		}),
		[isCameraReady]
	)

	return (
		<div className="tldraw__editor">
			<Tldraw
				components={components}
				options={{ camera: cameraOptions }}
				// [6]
				onMount={(editor) => {
					editor.setCamera({ x: 0, y: 0, z: 1 }, { immediate: true })
					editor.centerOnPoint(lngLatToPage(LONDON.lng, LONDON.lat), { immediate: true })
					setIsCameraReady(true)
				}}
			/>
		</div>
	)
}

/*
[1]
One zoom step per map zoom level keeps the camera's zoom in and zoom out landing on whole tile
zooms. The constraints stop the camera from panning off the edge of the world into empty space,
which is otherwise easy to do once you are zoomed in.

[2]
Because page space is a real coordinate system here, any page point converts back to a longitude
and latitude. Annotations drawn on the map are geographic data, not just marks on a canvas.

[3]
`tlui-layout` sets `pointer-events: none`, so a panel that contains anything clickable has to opt
back in. Borrowing `tlui-menu` does that and gives the panel the usual tldraw surface styles.

[4]
OpenStreetMap requires visible attribution wherever its tiles are shown. It lives in the top panel
because the bottom corners of the canvas are already taken by the toolbar, the zoom control, and
the tldraw watermark.

[5]
Rendering the layer before the camera has been placed fetches a screenful of tiles for the corner
of the world that the camera is about to leave — half the tile requests of a page load, spent on a
view nobody sees. Worth the flag here because the tiles come from donated infrastructure.

[6]
Camera zoom 1 is the base map zoom, so setting zoom before centering puts the map at its native
tile resolution over London.
*/
