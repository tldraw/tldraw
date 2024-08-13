// import google
import { useMap } from '@vis.gl/react-google-maps'
import { useLayoutEffect } from 'react'
import { Vec, VecLike, useEditor, useQuickReactor } from 'tldraw'
import 'tldraw/tldraw.css'
import './style.css'

// This is a headless react component that syncs the tldraw viewport with the google maps viewport
export function MapControls() {
	const editor = useEditor()

	// on initial launch we set the camera to the center of the page
	useLayoutEffect(() => {
		const { w, h } = editor.getViewportPageBounds()
		editor.setCamera({
			z: editor.getBaseZoom(),
			x: w / 2,
			y: h / 2,
		})
		editor.user.updateUserPreferences({ isDynamicSizeMode: true })
		editor.updateInstanceState({ isDebugMode: false })
	}, [editor])

	const map = useMap()

	// when the tldraw viewport changes, update the map viewport
	useQuickReactor('viewportChanged', () => {
		const { z } = editor.getCamera()
		map?.moveCamera({
			// google maps zoom is logarithmic in base 2
			zoom: BASE_MAPS_ZOOM + Math.log2(z),
			center: pageSpaceToLatLng(editor.getViewportPageBounds().center),
		})
	})
	return null
}

// The rest of this file is maths stuff to convert between tldraw page space and lat lng

// google maps uses the mercator projection in a 256x256 grid
const TILE_SIZE = 256

// Set our 100% zoom level to be 14 in google maps zoom terms
export const BASE_MAPS_ZOOM = 14

// how many tldraw page space pixels fit into a google maps tile
const PIXEL_DENSITY = 1 << BASE_MAPS_ZOOM

// we center the map on trafalgar square roundabout
const LONDON_CENTER = { lat: 51.50731793592619, lng: -0.1276358691382279 } as const

// code taken from https://developers.google.com/maps/documentation/javascript/coordinates
// this converts a lat lng to a world space point in the range {x: 0-256, y: 0-256}
function latLngToWorldSpace(latLng: google.maps.LatLngLiteral) {
	let siny = Math.sin((latLng.lat * Math.PI) / 180)

	// Truncating to 0.9999 effectively limits latitude to 89.189. This is
	// about a third of a tile past the edge of the world tile.
	siny = Math.min(Math.max(siny, -0.9999), 0.9999)

	return new Vec(
		TILE_SIZE * (0.5 + latLng.lng / 360),
		TILE_SIZE * (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI))
	)
}

const londonCenterInWorldSpace = latLngToWorldSpace(LONDON_CENTER)

function worldSpaceToLatLng(point: VecLike) {
	const lng = (point.x / TILE_SIZE - 0.5) * 360

	const y = 0.5 - point.y / TILE_SIZE
	const latRadians = 2 * Math.atan(Math.exp(y * 2 * Math.PI)) - Math.PI / 2
	const lat = (latRadians * 180) / Math.PI

	return { lat, lng }
}

function pageSpaceToWorldSpace(point: Vec) {
	const x = point.x / PIXEL_DENSITY
	const y = point.y / PIXEL_DENSITY

	return new Vec(x + londonCenterInWorldSpace.x, y + londonCenterInWorldSpace.y)
}

export function pageSpaceToLatLng(point: Vec) {
	return worldSpaceToLatLng(pageSpaceToWorldSpace(point))
}
