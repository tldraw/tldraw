import { useCallback, useMemo } from 'react'
import {
	CustomRecordInfo,
	T,
	Tldraw,
	Vec,
	createCustomRecordId,
	createCustomRecordMigrationIds,
	createCustomRecordMigrationSequence,
	createTLStore,
	isCustomRecord,
	track,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
const MARKER_TYPE = 'marker'
interface Marker {
	id: string
	typeName: typeof MARKER_TYPE
	x: number
	y: number
	label: string
	icon: string
}

// [2]
const markerVersions = createCustomRecordMigrationIds(MARKER_TYPE, {
	AddIcon: 1,
})

// [3]
const markerRecord: CustomRecordInfo = {
	scope: 'document',
	validator: T.object({
		id: T.string,
		typeName: T.literal(MARKER_TYPE),
		x: T.number,
		y: T.number,
		label: T.string,
		icon: T.string,
	}),
	migrations: createCustomRecordMigrationSequence({
		sequence: [
			{
				id: markerVersions.AddIcon,
				up: (record) => {
					record.icon = '📍'
				},
				down: (record) => {
					delete record.icon
				},
			},
		],
	}),
	createDefaultProperties: () => ({
		x: 0,
		y: 0,
		label: '',
		icon: '📍',
	}),
}

// [4]
function createMarkerId(id?: string) {
	return createCustomRecordId(MARKER_TYPE, id)
}

const ICONS = ['📍', '⭐', '🏠', '🏢', '🎯', '⚠️']

// [5]
const MarkerOverlay = track(function MarkerOverlay() {
	const editor = useEditor()

	const markers = editor.store
		.allRecords()
		.filter((r) => isCustomRecord(MARKER_TYPE, r)) as any as Marker[]

	return (
		<>
			{markers.map((marker) => {
				const screenPoint = editor.pageToViewport(new Vec(marker.x, marker.y))
				return (
					<div
						key={marker.id}
						style={{
							position: 'absolute',
							left: screenPoint.x,
							top: screenPoint.y,
							transform: 'translate(-50%, -100%)',
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							pointerEvents: 'all',
							cursor: 'pointer',
						}}
						title={marker.label}
						onPointerDown={(e) => {
							e.stopPropagation()
							if (e.button === 2 || e.ctrlKey) {
								editor.store.remove([marker.id as any])
							}
						}}
					>
						<span style={{ fontSize: 28 }}>{marker.icon}</span>
						<span
							style={{
								fontSize: 11,
								background: 'white',
								border: '1px solid #ccc',
								borderRadius: 4,
								padding: '1px 4px',
								whiteSpace: 'nowrap',
								maxWidth: 120,
								overflow: 'hidden',
								textOverflow: 'ellipsis',
							}}
						>
							{marker.label}
						</span>
					</div>
				)
			})}
		</>
	)
})

function AddMarkerButton() {
	const editor = useEditor()

	const addMarker = useCallback(() => {
		const label = prompt('Marker label:')
		if (!label) return
		const center = editor.getViewportScreenCenter()
		const point = editor.screenToPage(center)
		editor.store.put([
			{
				id: createMarkerId(),
				typeName: MARKER_TYPE,
				x: point.x,
				y: point.y,
				label,
				icon: ICONS[Math.floor(Math.random() * ICONS.length)],
			} as any,
		])
	}, [editor])

	return (
		<button
			onClick={addMarker}
			style={{
				padding: '6px 12px',
				borderRadius: 6,
				border: '1px solid #ccc',
				background: 'white',
				cursor: 'pointer',
				fontSize: 14,
				pointerEvents: 'all',
			}}
		>
			+ Add marker
		</button>
	)
}

// [6]
export default function CustomRecordsExample() {
	const store = useMemo(
		() =>
			createTLStore({
				records: { [MARKER_TYPE]: markerRecord },
			}),
		[]
	)

	return (
		<div className="tldraw__editor">
			<Tldraw
				store={store}
				components={{
					InFrontOfTheCanvas: MarkerOverlay,
					TopPanel: AddMarkerButton,
				}}
			/>
		</div>
	)
}

/*
Introduction:

You can add custom record types to the tldraw store to persist and synchronize
domain-specific data that doesn't fit into shapes, bindings, or assets. This example
adds a "marker" record type — like a map pin that marks a location on the canvas.

[1]
Define your record's type name and TypeScript type. The record must have `id` and
`typeName` fields — these are required by the store system.

[2]
Use `createCustomRecordMigrationIds` to define versioned migration IDs for your record
type. These follow the convention `com.tldraw.{typeName}/{version}`.

[3]
Create a CustomRecordInfo configuration object. This tells the store how to handle
your record type:
- `scope`: 'document' records are persisted and synced. 'session' records are local only.
- `validator`: Validates the record structure using tldraw's validation library.
- `migrations`: Optional. Define how the record evolves over time using
  `createCustomRecordMigrationSequence`. Each migration has an `id` (from the version ids),
  an `up` function to add/transform fields, and an optional `down` function for backwards
  compatibility. If omitted, an empty migration sequence is created automatically.
- `createDefaultProperties`: Factory for default property values.

[4]
A helper to create properly formatted record IDs. Record IDs follow the pattern
`typeName:uniqueId`.

[5]
A React component that renders markers on the canvas and provides a button to add new
ones. We use the `track` wrapper so the component re-renders when the store changes.
We use `isCustomRecord` to filter records by type, and `pageToViewport` to position
the markers correctly as the camera moves. Right-click (or ctrl-click) a marker to
remove it.

[6]
We create a store with our custom record type using `createTLStore` and pass it to
Tldraw via the `store` prop. The `records` option registers our marker type alongside
the built-in record types (shapes, assets, etc.).

*/
