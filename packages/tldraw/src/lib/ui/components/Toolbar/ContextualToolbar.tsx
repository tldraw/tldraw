import {
	TLCamera,
	Vec,
	stopEventPropagation,
	useEditor,
	usePassThroughMouseOverEvents,
	usePassThroughWheelEvents,
} from '@tldraw/editor'
import { useEffect, useRef, useState } from 'react'

interface ContextualToolbarProps {
	children?: React.ReactNode
	position: { top: number; left: number; isMobile: boolean }
}

/**
 * A generic floating toolbar that can be used for things
 * like rich text editing, image toolbars, etc.
 *
 * @public @react
 */
export const ContextualToolbar = function ContextualToolbar({
	children,
	position,
}: ContextualToolbarProps) {
	const toolbarRef = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(toolbarRef.current)
	usePassThroughMouseOverEvents(toolbarRef.current)

	return (
		<div
			ref={toolbarRef}
			className="tl-contextual-toolbar"
			data-is-mobile={position.isMobile}
			style={{
				top: `${position.top}px`,
				left: `${position.left}px`,
			}}
			onPointerDown={stopEventPropagation}
		>
			{children}
		</div>
	)
}

/**
 * A hook that makes the toolbar follow the selection on the canvas.
 *
 * @public
 */
export function useFollowCanvas() {
	const editor = useEditor()
	const [currentCoordinates, setCurrentCoordinates] = useState<Vec>()
	const [currentCamera, setCurrentCamera] = useState<TLCamera>(editor.getCamera())
	const selectionRotatedPageBounds = editor.getSelectionRotatedPageBounds()
	const camera = editor.getCamera()
	const pageCoordinates = selectionRotatedPageBounds
		? editor.pageToViewport(selectionRotatedPageBounds.point)
		: null

	// This is to ensure the toolbar follows the selection when the camera moves.
	useEffect(() => {
		if (
			pageCoordinates &&
			(currentCamera.x !== camera.x || currentCamera.y !== camera.y || currentCamera.z !== camera.z)
		) {
			if (!currentCoordinates || !currentCoordinates.equals(pageCoordinates)) {
				setCurrentCoordinates(pageCoordinates)
			}
		}
		setCurrentCamera(camera)
	}, [currentCoordinates, pageCoordinates, camera, currentCamera])
}
