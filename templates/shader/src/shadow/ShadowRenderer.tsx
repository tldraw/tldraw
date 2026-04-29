import { memo, useLayoutEffect, useRef } from 'react'
import { useEditor } from 'tldraw'
import { WebGLCanvas } from '../WebGLCanvas'
import { shaderConfig } from './config'
import { ShadowShaderManager } from './ShadowShaderManager'

export const ShadowRenderer = memo(() => {
	const editor = useEditor()
	const rCanvas = useRef<HTMLCanvasElement>(null)
	const rShaderManager = useRef<ShadowShaderManager | null>(null)

	useLayoutEffect(() => {
		const canvas = rCanvas.current!
		const manager = new ShadowShaderManager(editor, canvas, shaderConfig)
		rShaderManager.current = manager

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
