import { memo, useLayoutEffect, useRef } from 'react'
import { useEditor, useIsDarkMode, useValue } from 'tldraw'
import { FluidManager } from './FluidManager'
import { fluidConfig } from './config'

/**
 * React component that renders the fluid simulation canvas.
 * Initializes and manages the FluidManager lifecycle, including:
 * - WebGL context setup
 * - Pointer event handling
 * - Cleanup on unmount
 */
export const FluidRenderer = memo(() => {
	const editor = useEditor()
	const rCanvas = useRef<HTMLCanvasElement>(null)
	const rFluidManager = useRef<FluidManager | null>(null)
	const darkMode = useIsDarkMode()

	const config = useValue('config', () => fluidConfig.get(), [])

	// Initialize FluidManager
	useLayoutEffect(() => {
		const canvas = rCanvas.current!
		const manager = new FluidManager(canvas, editor, config)
		rFluidManager.current = manager

		// Initialize the WebGL context and start the animation loop
		manager.initialize(darkMode)

		function handlePointerDown(e: PointerEvent) {
			const elm = e.target! as HTMLElement
			elm.setPointerCapture(e.pointerId)
			manager.handlePointerDown()
		}

		function handlePointerUp(e: PointerEvent) {
			const elm = e.target! as HTMLElement
			elm.releasePointerCapture(e.pointerId)
			manager.handlePointerUp()
		}

		function handlePointerMove() {
			manager.handlePointerMove()
		}

		document.addEventListener('pointermove', handlePointerMove)
		document.addEventListener('pointerdown', handlePointerDown)
		document.addEventListener('pointerup', handlePointerUp)

		return () => {
			document.removeEventListener('pointermove', handlePointerMove)
			document.removeEventListener('pointerdown', handlePointerDown)
			document.removeEventListener('pointerup', handlePointerUp)

			manager.handlePointerUp()
			manager.dispose()
			rFluidManager.current = null
		}
	}, [darkMode, editor, config])

	const pixelate = config.pixelate ?? false
	const canvasClassName = `shader-canvas${pixelate ? ' shader-canvas-pixelated' : ''}`

	return <canvas ref={rCanvas} className={canvasClassName} />
})
