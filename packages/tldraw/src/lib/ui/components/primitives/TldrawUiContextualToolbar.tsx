import {
	TLCamera,
	Vec,
	stopEventPropagation,
	useEditor,
	usePassThroughMouseOverEvents,
	usePassThroughWheelEvents,
	useValue,
} from '@tldraw/editor'
import classNames from 'classnames'
import { RefObject, forwardRef, useEffect, useState } from 'react'

/** @public */
export interface TLUiContextualToolbarProps {
	children?: React.ReactNode
	className?: string
	position: { top: number; left: number }
	hideIndicator?: boolean
	indicatorOffset?: number
}

/**
 * A generic floating toolbar that can be used for things
 * like rich text editing, image toolbars, etc.
 *
 * @public @react
 */
export const TldrawUiContextualToolbar = forwardRef<HTMLDivElement, TLUiContextualToolbarProps>(
	function TldrawUiContextualToolbar(
		{
			children,
			className,
			position,
			hideIndicator = false,
			indicatorOffset = 0,
		}: TLUiContextualToolbarProps,
		toolbarRef
	) {
		const editor = useEditor()
		const isMobile = useValue('isCoarsePointer', () => editor.getInstanceState().isCoarsePointer, [
			editor,
		])
		usePassThroughWheelEvents((toolbarRef as RefObject<HTMLDivElement>).current)
		usePassThroughMouseOverEvents((toolbarRef as RefObject<HTMLDivElement>).current)

		return (
			<div
				ref={toolbarRef}
				className={classNames('tl-contextual-toolbar', className)}
				data-is-mobile={isMobile}
				style={{
					top: `${position.top}px`,
					left: `${position.left}px`,
				}}
				onPointerDown={stopEventPropagation}
			>
				{!hideIndicator && (
					<div
						className="tl-contextual-toolbar__indicator"
						style={{ left: `calc(50% - var(--arrow-size) - ${indicatorOffset}px)` }}
					/>
				)}
				<div className="tlui-toolbar__tools" role="radiogroup">
					{children}
				</div>
			</div>
		)
	}
)

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
