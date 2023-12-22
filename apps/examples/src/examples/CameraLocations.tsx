import {
	Atom,
	Button,
	EASINGS,
	Editor,
	Icon,
	TLEditorComponents,
	Tldraw,
	Vec2d,
	atom,
	stopEventPropagation,
	track,
	useEditor,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useEffect, useState } from 'react'

const cameraMoveKeys = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F10', 'F11', 'F12']
type CameraLocation = {
	key: string
	position: Vec2d
}

const getLocationIndex = (locations: CameraLocation[], position: Vec2d) => {
	return locations.findIndex((location) => position.equals(location.position))
}

const getLocationByKey = (locations: CameraLocation[], key: string) => {
	return locations.find((location) => location.key === key)
}
const getCurrentPosition = (editor: Editor) => {
	const camera = editor.getCamera()
	return new Vec2d(camera.x, camera.y, camera.z)
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
						<Button
							type="normal"
							style={{
								background: index === i ? '#f9fafb' : 'transparent',
								borderRadius: 6,
							}}
							key={location.key}
							onClick={() => {
								editor.setCamera(location.position, {
									duration: 200,
									easing: EASINGS.easeInOutQuad,
								})
							}}
						>
							{`Slide ${i + 1}`}
						</Button>
						<Button type="normal">
							<Icon
								icon="trash"
								onClick={() => cameraLocations.set(locations.filter((_l, index) => i !== index))}
							/>
						</Button>
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

const CameraLoctionsExample = track(() => {
	const [editor, setEditor] = useState<Editor | null>(null)

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (!editor) return

			const locations = cameraLocations.get()

			if (cameraMoveKeys.includes(e.key)) {
				if (e.shiftKey) {
					const position = getCurrentPosition(editor)
					const index = getLocationIndex(locations, position)
					if (index === -1) {
						cameraLocations.set([...locations, { key: e.key, position: position }])
					} else {
						cameraLocations.set(
							locations.map((location, i) => {
								if (i === index) return { ...location, position: position }

								return location
							})
						)
					}
				} else {
					const location = getLocationByKey(locations, e.key)
					if (!location) return

					editor.setCamera(location.position, { duration: 200, easing: EASINGS.easeInOutQuad })
				}
			}
			if (e.key === 'ArrowRight' && e.shiftKey) {
				const position = getCurrentPosition(editor)
				const locationIndex = getLocationIndex(locations, position)
				if (locationIndex === -1) return

				editor.setCamera(locations[(locationIndex + 1) % locations.length].position, {
					duration: 200,
					easing: EASINGS.easeInOutQuad,
				})
			}

			if (e.key === 'ArrowLeft' && e.shiftKey) {
				const position = getCurrentPosition(editor)
				const locationIndex = getLocationIndex(locations, position)
				if (locationIndex < 1) return

				editor.setCamera(
					locations[(locationIndex - 1 + locations.length) % locations.length].position,
					{
						duration: 200,
						easing: EASINGS.easeInOutQuad,
					}
				)
			}
		}

		document.addEventListener('keydown', handleKeyDown)

		return () => {
			document.removeEventListener('keydown', handleKeyDown)
		}
	}, [editor])

	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="tldraw_example" onMount={setEditor} components={components} />
		</div>
	)
})

export default CameraLoctionsExample
