import { useEffect, useState } from 'react'
import {
	Atom,
	EASINGS,
	Editor,
	TLEditorComponents,
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonIcon,
	Vec,
	atom,
	stopEventPropagation,
	track,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'

const cameraMoveKeys = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F10', 'F11', 'F12']
type CameraLocation = {
	key: string
	position: Vec
}

const getLocationIndex = (locations: CameraLocation[], position: Vec) => {
	return locations.findIndex((location) => position.equals(location.position))
}

const getLocationByKey = (locations: CameraLocation[], key: string) => {
	return locations.find((location) => location.key === key)
}
const getCurrentPosition = (editor: Editor) => {
	const camera = editor.getCamera()
	return new Vec(camera.x, camera.y, camera.z)
}

const SlideList = track(() => {
	const editor = useEditor()
	const locations = cameraLocations.get()
	if (locations.length === 0) return null
	const index = getLocationIndex(locations, getCurrentPosition(editor))
	return (
		<div
			style={{
				position: 'absolute',
				display: 'flex',
				flexDirection: 'column',
				gap: 4,
				top: 100,
				left: 8,
				padding: 4,
				backgroundColor: 'var(--color-low)',
				pointerEvents: 'all',
				borderRadius: 8,
			}}
			onPointerDown={(e) => stopEventPropagation(e)}
		>
			{locations.map((location, i) => {
				return (
					<div
						key={location.key + location.position.x + location.position.y}
						style={{
							display: 'flex',
							gap: '4px',
							alignItems: 'center',
							borderRadius: 6,
						}}
					>
						<TldrawUiButton
							type="normal"
							style={{
								background: index === i ? '#f9fafb' : 'transparent',
								borderRadius: 6,
							}}
							key={location.key}
							onClick={() => {
								moveCamera(editor, location.position)
							}}
						>
							{`Slide ${i + 1}`}
						</TldrawUiButton>
						<TldrawUiButton
							type="normal"
							onClick={() => cameraLocations.set(locations.filter((l) => l !== location))}
						>
							<TldrawUiButtonIcon icon="trash" />
						</TldrawUiButton>
					</div>
				)
			})}
		</div>
	)
})

const components: TLEditorComponents = {
	InFrontOfTheCanvas: SlideList,
}

const cameraLocations: Atom<CameraLocation[]> = atom('cameraLocations', [] as CameraLocation[])

const moveCamera = (editor: Editor, location: Vec) => {
	editor.setCamera(location, { duration: 200, easing: EASINGS.easeInOutQuad })
}

const CameraLocationsExample = track(() => {
	const [editor, setEditor] = useState<Editor | null>(null)

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (!editor) return

			const locations = cameraLocations.get()
			const position = getCurrentPosition(editor)
			const locationIndex = getLocationIndex(locations, position)

			if (cameraMoveKeys.includes(e.key)) {
				const location = getLocationByKey(locations, e.key)
				if (e.shiftKey) {
					if (location) {
						const newLocations = locations.map((l) => {
							if (l.key === e.key) {
								return { ...l, position }
							}
							return l
						})
						cameraLocations.set(newLocations)
					} else {
						cameraLocations.set([...locations, { key: e.key, position: position }])
					}
				} else {
					if (!location) return
					moveCamera(editor, location.position)
				}
			}
			if (e.key === 'ArrowRight' && e.shiftKey && locationIndex !== -1) {
				const nextIndex = (locationIndex + 1) % locations.length
				moveCamera(editor, locations[nextIndex].position)
			}

			if (e.key === 'ArrowLeft' && e.shiftKey && locationIndex !== -1) {
				const nextIndex = (locationIndex - 1 + locations.length) % locations.length
				moveCamera(editor, locations[nextIndex].position)
			}
		}

		document.addEventListener('keydown', handleKeyDown)

		return () => {
			document.removeEventListener('keydown', handleKeyDown)
		}
	}, [editor])

	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="slideshow_example" onMount={setEditor} components={components} />
		</div>
	)
})

export default CameraLocationsExample
