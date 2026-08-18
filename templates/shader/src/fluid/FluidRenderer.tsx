import { memo, useLayoutEffect, useRef } from 'react'
import { useColorMode, useEditor, useValue } from 'tldraw'
import { fluidConfig } from './config'
import { FluidManager } from './FluidManager'

export const FluidRenderer = memo(() => {
	const editor = useEditor()
	const rCanvas = useRef<HTMLCanvasElement>(null)
	const darkMode = useColorMode() === 'dark'

	const config = useValue('config', () => fluidConfig.get(), [])

	useLayoutEffect(() => {
		const manager = new FluidManager(rCanvas.current!, editor, config)
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
		}
	}, [darkMode, editor, config])

	const canvasClassName = `shader-app__canvas${config.pixelate ? ' shader-app__canvas--pixelated' : ''}`

	return <canvas ref={rCanvas} className={canvasClassName} />
})
