import { memo, useLayoutEffect, useRef } from 'react'
import { useEditor } from 'tldraw'
import { WebGLCanvas } from '../WebGLCanvas'
import { shaderConfig } from './config'
import { MinimalShaderManager } from './MinimalShaderManager'

export const MinimalRenderer = memo(() => {
	const editor = useEditor()
	const rCanvas = useRef<HTMLCanvasElement>(null)

	useLayoutEffect(() => {
		const manager = new MinimalShaderManager(editor, rCanvas.current!, shaderConfig)

		const handlePointerMove = (e: PointerEvent) => manager.pointerMove(e.clientX, e.clientY)

		window.addEventListener('pointermove', handlePointerMove)

		return () => {
			window.removeEventListener('pointermove', handlePointerMove)
			manager.dispose()
		}
	}, [editor])

	return <WebGLCanvas ref={rCanvas} config={shaderConfig} />
})
