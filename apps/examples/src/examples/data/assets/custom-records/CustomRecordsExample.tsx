import { useCallback, useMemo } from 'react'
import {
	BaseRecord,
	CustomRecordInfo,
	RecordId,
	T,
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonLabel,
	Vec,
	createCustomRecordId,
	createCustomRecordMigrationIds,
	createCustomRecordMigrationSequence,
	createTLStore,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './custom-records.css'

// There's a guide at the bottom of this file!

// [1]
const MARKER_TYPE = 'marker'
interface Marker extends BaseRecord<typeof MARKER_TYPE, RecordId<Marker>> {
	x: number
	y: number
	label: string
	icon: string
}

declare module 'tldraw' {
	interface TLGlobalRecordPropsMap {
		[MARKER_TYPE]: Marker
	}
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
	return createCustomRecordId(MARKER_TYPE, id) as Marker['id']
}

const ICONS = ['📍', '⭐', '🏠', '🏢', '🎯', '⚠️']

// [5]
function MarkerOverlay() {
	const editor = useEditor()
	const markersQuery = useMemo(() => editor.store.query.records(MARKER_TYPE), [editor])
	const markers = useValue(
		'markers on screen',
		() =>
			markersQuery.get().map((marker) => ({
				marker,
				screenPoint: editor.pageToViewport(new Vec(marker.x, marker.y)),
			})),
		[editor, markersQuery]
	)

	return (
		<>
			{markers.map(({ marker, screenPoint }) => {
				return (
					<div
						key={marker.id}
						className="custom-records-marker"
						style={{ left: screenPoint.x, top: screenPoint.y }}
						title={marker.label}
						onPointerDown={(e) => {
							e.stopPropagation()
							if (e.button === 2 || e.ctrlKey) {
								editor.store.remove([marker.id])
							}
						}}
					>
						<span className="custom-records-marker__icon">{marker.icon}</span>
						<span className="custom-records-marker__label">{marker.label}</span>
					</div>
				)
			})}
		</>
	)
}

function AddMarkerButton() {
	const editor = useEditor()

	const addMarker = useCallback(() => {
		const label = prompt('Marker label:')
		if (!label) return
		const point = editor.getViewportPageBounds().center
		editor.store.put([
			{
				id: createMarkerId(),
				typeName: MARKER_TYPE,
				x: point.x,
				y: point.y,
				label,
				icon: ICONS[Math.floor(Math.random() * ICONS.length)],
			},
		])
	}, [editor])

	return (
		<div className="tlui-menu" style={{ pointerEvents: 'all' }}>
			<TldrawUiButton type="normal" onClick={addMarker}>
				<TldrawUiButtonLabel>Add marker</TldrawUiButtonLabel>
			</TldrawUiButton>
		</div>
	)
}

const components = {
	InFrontOfTheCanvas: MarkerOverlay,
	TopPanel: AddMarkerButton,
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
			<Tldraw store={store} components={components} />
		</div>
	)
}

/*
Custom record types let you keep domain data in the tldraw store that isn't a shape,
binding, or asset, so it's persisted, synced, and migrated alongside everything else.
This example adds a "marker" record: a pin at a page position with a label and icon.

[1]
The record type extends `BaseRecord`, which supplies `id` and `typeName`. Augmenting
`TLGlobalRecordPropsMap` adds it to `TLRecord`, so `store.query.records('marker')`,
`store.put`, and `store.remove` are all typed without casts.

[2]
`createCustomRecordMigrationIds` builds ids in the form `com.tldraw.marker/1`, which is
the sequence id the store expects for custom records.

[3]
The `CustomRecordInfo` passed to the store:
- `scope: 'document'` means persisted and synced; `'session'` would keep records local.
- `validator` checks the whole record, including `id` and `typeName`.
- `migrations` is optional. Each entry mutates the record in place (or returns a new
  one). Here version 1 adds the `icon` field to markers saved before it existed.
- `createDefaultProperties` fills in anything `store.put` doesn't supply.

[4]
Ids for custom records are `typeName:uniqueId`. `createCustomRecordId` returns a
generic record id, so we cast to `Marker['id']` once here.

[5]
`store.query.records(MARKER_TYPE)` returns a computed signal of all marker records.
Reading it and `pageToViewport` inside `useValue` means the overlay re-renders when a
marker is added or removed and when the camera moves, so pins stay glued to their page
position. Right-click (or ctrl-click) a marker to remove it.

[6]
Register the record type when creating the store via the `records` option, then pass
the store to `Tldraw`. The store must be created once, so it's wrapped in `useMemo`.
*/
