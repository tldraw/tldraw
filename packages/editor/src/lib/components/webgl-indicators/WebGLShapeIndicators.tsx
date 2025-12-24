/**
 * WebGL-based shape indicators component.
 * Renders selection, hover, and hint indicators using WebGL for improved performance.
 */

import { useValue } from '@tldraw/state-react'
import { memo, useLayoutEffect, useRef } from 'react'
import { useContainer } from '../../hooks/useContainer'
import { useEditor } from '../../hooks/useEditor'
import { WebGLIndicatorManager } from './WebGLIndicatorManager'

/** @public */
export interface TLWebGLShapeIndicatorsProps {
	/** Whether to hide all of the indicators */
	hideAll?: boolean
	/** Whether to show all of the indicators */
	showAll?: boolean
}

/** @public @react */
export const WebGLShapeIndicators = memo(function WebGLShapeIndicators({
	hideAll,
	showAll,
}: TLWebGLShapeIndicatorsProps) {
	const editor = useEditor()
	const container = useContainer()
	const rCanvas = useRef<HTMLCanvasElement>(null)
	const rManager = useRef<WebGLIndicatorManager | null>(null)

	if (hideAll && showAll) {
		throw Error('You cannot set both hideAll and showAll props to true')
	}

	// Track dark mode changes to update colors
	const isDarkMode = useValue('isDarkMode', () => editor.user.getIsDarkMode(), [editor])

	// Initialize and manage the WebGL manager
	useLayoutEffect(() => {
		const canvas = rCanvas.current
		if (!canvas) return

		const manager = new WebGLIndicatorManager(editor, canvas, container)
		rManager.current = manager

		return () => {
			manager.dispose()
			rManager.current = null
		}
	}, [editor, container])

	// Update colors when dark mode changes
	useLayoutEffect(() => {
		if (rManager.current) {
			rManager.current.updateColors()
		}
	}, [isDarkMode])

	// Handle hideAll/showAll props
	// When hideAll is true, we simply hide the canvas
	// When showAll is true, we let the manager handle it (it already shows all selected/hovered)
	const shouldHide = hideAll && !showAll

	// Get viewport dimensions for proper canvas sizing
	const viewportScreenBounds = useValue(
		'viewportScreenBounds',
		() => editor.getViewportScreenBounds(),
		[editor]
	)

	return (
		<canvas
			ref={rCanvas}
			className="tl-webgl-indicators"
			aria-hidden="true"
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				width: viewportScreenBounds.w,
				height: viewportScreenBounds.h,
				pointerEvents: 'none',
				display: shouldHide ? 'none' : 'block',
				transformOrigin: 'top left',
			}}
		/>
	)
})
