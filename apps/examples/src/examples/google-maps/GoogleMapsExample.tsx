// import google
import { APIProvider, Map } from '@vis.gl/react-google-maps'
import { TLComponents, Tldraw, Vec } from 'tldraw'
import 'tldraw/tldraw.css'
import { BASE_MAPS_ZOOM, MapControls, pageSpaceToLatLng } from './MapControls'
import snapshot from './snapshot.json'
import './style.css'

// [1]
const components: TLComponents = {
	Background() {
		return (
			<div
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
				}}
			>
				<Map
					// [2]
					defaultZoom={BASE_MAPS_ZOOM}
					defaultCenter={pageSpaceToLatLng(new Vec(0, 0))}
					gestureHandling={'none'}
					zoomControl={false}
					scaleControl={false}
					mapTypeControl={false}
					rotateControl={false}
					fullscreenControl={false}
					streetViewControl={false}
				>
					{/* [3] */}
					<MapControls />
				</Map>
			</div>
		)
	},
}

// [4]
export default function GoogleMapsExample() {
	return (
		<APIProvider apiKey={process.env.NEXT_PUBLIC_GC_API_KEY!}>
			<div className="tldraw__editor">
				<Tldraw
					persistenceKey="google-maps-example"
					snapshot={snapshot as any}
					components={components}
				/>
			</div>
		</APIProvider>
	)
}

/**
 * 1. We create a custom `Background` component that renders a map using the `@vis.gl/react-google-maps` library.
 *
 * 2. We set an initial zoom level and center point for the map. We disable all the default controls that come with the map to avoid clashing with the Tldraw editor UI.
 *
 * 3. We render the `MapControls` component inside the `Map` component. This component syncs the Tldraw viewport with the Google Maps viewport.
 *
 * 4. We wrap the `Tldraw` component in an `APIProvider` component from `@vis.gl/react-google-maps` and pass in the Google Maps API key as a prop. We also pass in the custom components to the `Tldraw` component.
 */
