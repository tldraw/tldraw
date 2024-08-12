// import google
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps'
import { useLayoutEffect, useMemo } from 'react'
import { TLComponents, Tldraw, Vec, VecLike, useEditor, useQuickReactor } from 'tldraw'
import 'tldraw/tldraw.css'
import snapshot from './snapshot.json'
import './style.css'

// our 100% zoom level is 14 in google maps zoom terms
const defaultZoom = 14

// google maps uses the mercator projection in a 256x256 grid
const tileSize = 256

// how many tldraw page space pixels fit into a google maps tile
const pxRatio = 1 << defaultZoom

function init() {
	// we center the map on trafalgar square roundabout
	const londonCenter = { lat: 51.50731793592619, lng: -0.1276358691382279 }

	// code taken from https://developers.google.com/maps/documentation/javascript/coordinates

	// The mapping between latitude, longitude and pixels is defined by the web
	// mercator projection.
	function toWorldSpace(latLng: google.maps.LatLngLiteral) {
		let siny = Math.sin((latLng.lat * Math.PI) / 180)

		// Truncating to 0.9999 effectively limits latitude to 89.189. This is
		// about a third of a tile past the edge of the world tile.
		siny = Math.min(Math.max(siny, -0.9999), 0.9999)

		return new Vec(
			tileSize * (0.5 + latLng.lng / 360),
			tileSize * (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI))
		)
	}

	const londonCenterInWorldSpace = toWorldSpace(londonCenter)
	function worldSpaceToPageSpace(point: VecLike) {
		// offset the point so that 0, 0 is the center of london
		const x = point.x - londonCenterInWorldSpace.x
		const y = point.y - londonCenterInWorldSpace.y

		// convert to page space
		return new Vec(x * pxRatio, y * pxRatio)
	}

	function latLngToPageSpace(latLng: google.maps.LatLngLiteral) {
		return worldSpaceToPageSpace(toWorldSpace(latLng))
	}

	function worldSpaceToLatLng(point: VecLike) {
		const lng = (point.x / tileSize - 0.5) * 360

		const y = 0.5 - point.y / tileSize
		const latRadians = 2 * Math.atan(Math.exp(y * 2 * Math.PI)) - Math.PI / 2
		const lat = (latRadians * 180) / Math.PI

		return { lat, lng }
	}

	function pageSpaceToWorldSpace(point: Vec) {
		const x = point.x / pxRatio
		const y = point.y / pxRatio

		return new Vec(x + londonCenterInWorldSpace.x, y + londonCenterInWorldSpace.y)
	}

	function pageSpaceToLatLng(point: Vec) {
		return worldSpaceToLatLng(pageSpaceToWorldSpace(point))
	}

	return {
		pageSpaceToLatLng,
		latLngToPageSpace,
	}
}

function MapControls() {
	const editor = useEditor()
	useLayoutEffect(() => {
		const { w, h } = editor.getViewportPageBounds()
		editor.setCamera({
			z: editor.getBaseZoom(),
			x: w / 2,
			y: h / 2,
		})
		editor.user.updateUserPreferences({
			isDynamicSizeMode: true,
		})
		editor.updateInstanceState({ isDebugMode: false })
	}, [editor])
	const map = useMap()
	const { pageSpaceToLatLng } = useMemo(() => init(), [])

	useQuickReactor('viewportChanged', () => {
		const { z } = editor.getCamera()
		map?.moveCamera({
			zoom: defaultZoom + Math.log2(z),
			center: pageSpaceToLatLng(editor.getViewportPageBounds().center),
		})
	})
	return null
}

const components: TLComponents = {
	Background() {
		const { pageSpaceToLatLng } = useMemo(() => init(), [])
		return (
			<div
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
				}}
			>
				<Map
					defaultZoom={14}
					defaultCenter={pageSpaceToLatLng(new Vec(0, 0))}
					gestureHandling={'none'}
					zoomControl={false}
					scaleControl={false}
					mapTypeControl={false}
					rotateControl={false}
					fullscreenControl={false}
					streetViewControl={false}
				>
					<MapControls />
				</Map>
			</div>
		)
	},
}

export default function GoogleMapsExample() {
	return (
		<APIProvider apiKey={process.env.NEXT_PUBLIC_GC_API_KEY!}>
			<div className="tldraw__editor">
				<Tldraw snapshot={snapshot as any} components={components} />
			</div>
		</APIProvider>
	)
}
