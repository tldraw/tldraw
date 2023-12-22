import { EASINGS, Editor, Tldraw, Vec2d } from '@tldraw/tldraw'
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

export default function CameraLoctionsExample() {
	const [editor, setEditor] = useState<Editor | null>(null)
	const [cameraLocations, setCameraLocations] = useState<CameraLocation[]>([])

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (!editor) return

			if (cameraMoveKeys.includes(e.key)) {
				if (e.shiftKey) {
					const position = getCurrentPosition(editor)
					const index = getLocationIndex(cameraLocations, position)
					if (index === -1) {
						setCameraLocations([...cameraLocations, { key: e.key, position: position }])
					} else {
						setCameraLocations(
							cameraLocations.map((location, i) => {
								if (i === index) return { ...location, position: position }

								return location
							})
						)
					}
				} else {
					const location = getLocationByKey(cameraLocations, e.key)
					if (!location) return

					editor.setCamera(location.position, { duration: 200, easing: EASINGS.easeInOutQuad })
				}
			}
			if (e.key === 'ArrowRight' && e.shiftKey) {
				const position = getCurrentPosition(editor)
				const locationIndex = getLocationIndex(cameraLocations, position)
				if (locationIndex === -1) return

				if (locationIndex < cameraLocations.length - 1) {
					editor.setCamera(cameraLocations[locationIndex + 1].position, {
						duration: 200,
						easing: EASINGS.easeInOutQuad,
					})
				}
			}

			if (e.key === 'ArrowLeft' && e.shiftKey) {
				const position = getCurrentPosition(editor)
				const locationIndex = getLocationIndex(cameraLocations, position)
				if (locationIndex < 1) return

				editor.setCamera(cameraLocations[locationIndex - 1].position, {
					duration: 200,
					easing: EASINGS.easeInOutQuad,
				})
			}
			console.log(cameraLocations)
		}

		document.addEventListener('keydown', handleKeyDown)

		return () => {
			document.removeEventListener('keydown', handleKeyDown)
		}
	}, [cameraLocations, editor])

	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="tldraw_example" onMount={setEditor} />
		</div>
	)
}
