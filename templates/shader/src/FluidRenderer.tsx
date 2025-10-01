import { memo, useLayoutEffect, useRef } from 'react'
import { useEditor, useIsDarkMode, useValue } from 'tldraw'
import { FluidManager } from './FluidManager'
import { fluidConfig } from './fluid-config'
import './shader.css'

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

	return <canvas ref={rCanvas} className="shader-canvas" />
})
