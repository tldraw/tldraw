import { memo, useLayoutEffect, useRef } from 'react'
import { useEditor } from 'tldraw'
import { WebGLCanvas } from '../WebGLCanvas'
import { shaderConfig } from './config'
import { RainbowShaderManager } from './RainbowShaderManager'

export const RainbowRenderer = memo(() => {
	const editor = useEditor()
	const rCanvas = useRef<HTMLCanvasElement>(null)
	const rShaderManager = useRef<RainbowShaderManager | null>(null)

	useLayoutEffect(() => {
		const canvas = rCanvas.current!
		const manager = new RainbowShaderManager(editor, canvas, shaderConfig)
		rShaderManager.current = manager

		manager.refresh()

		const handlePointerMove = (e: PointerEvent) => manager.pointerMove(e.clientX, e.clientY)

		window.addEventListener('pointermove', handlePointerMove)

		return () => {
			window.removeEventListener('pointermove', handlePointerMove)
			manager.dispose()
			rShaderManager.current = null
		}
	}, [editor])

	return <WebGLCanvas ref={rCanvas} config={shaderConfig} />
})
